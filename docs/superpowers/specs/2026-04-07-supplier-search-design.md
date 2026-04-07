# Supplier Search Integration — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Embed 1688 image-based supplier search into Skill 1 Step 3, with cost price auto-propagation to downstream skills.

---

## Problem

The current flow from "select a bestseller" to "find a supplier" is broken:
- `supplyHint` is a static text hint with no real search capability
- Users must manually leave the app, search 1688, then return to enter cost price
- Downstream skills (pricing, testing, campaigns) operate on assumed cost prices

## Solution Overview

Upgrade Skill 1 Step 3 ("货源与确认") with an embedded 1688 image-search flow. When the user selects a supplier, the cost price auto-propagates to all downstream skills.

```
选中款 → 一键找源 → 1688 以图搜 API → 供应商卡片列表
→ 用户选定 → 成本价写入 store → 下游 Skill 1.5/3/6 自动感知
```

---

## 1. API Layer

### 1.1 Server Module: `lib/server/ali1688-search.ts`

Encapsulates 1688 Open Platform communication:

- **Input:** Product reference image URL (from selected style's `imageUrl`)
- **Auth:** AppKey + AppSecret signature per 1688 Open Platform spec
- **API:** `com.alibaba.search.product.imageUploadSearch` (or equivalent image search endpoint). The exact API name must be verified against the 1688 Open Platform docs at implementation time. If the API is unavailable or quota-exhausted, the route falls back to returning mock data (consistent with the project's existing mock-first approach in `lib/mock-data.ts`).
- **Output:** Standardized `Supplier1688Result[]`

### 1.2 Data Type: `Supplier1688Result`

```typescript
interface Supplier1688Result {
  offerId: string           // 1688 product ID
  title: string             // Product title
  imageUrl: string          // Product main image
  price: number             // Unit price at MOQ tier (ex-factory, excluding shipping)
  moq: number               // Minimum order quantity
  deliveryDays: number      // Shipping days
  supplierName: string      // Supplier name
  supplierScore: number     // Supplier rating
  tradeLevel: string        // Trade level (e.g. A1, A2)
  similarityScore: number   // Visual similarity 0-1
  detailUrl: string         // 1688 detail page URL
}
```

> **Price clarification:** `price` is the unit price at the MOQ tier, ex-factory (not including shipping). The confirmation bar shows "到手价 ¥X.XX（不含运费）" so the user is aware. Shipping cost varies by logistics and is not included — users can adjust the final cost price manually after selection if needed.

### 1.3 API Route: `app/(main)/api/supplier-search/route.ts`

- **Method:** POST
- **Body:** `{ imageUrl: string }`
- **Response:** `{ results: Supplier1688Result[] }`
- **Rate limiting:** Global rate limit (e.g. 10 req/min) via simple in-memory counter, returns HTTP 429 when exceeded. Client-side: debounce search button by 2s to prevent rapid re-clicks. 1688 API quota managed by monitoring response headers.
- Returns structured error on failure (downstream UI handles fallback)
- **Mock mode:** When `ALI1688_APP_KEY` is not set or API returns errors, return mock supplier data for development

---

## 2. SupplierSearch Component

### 2.1 File: `components/finder/SupplierSearch.tsx`

Replaces the static `supplyHint` display in Finder Step 3.

### 2.2 Interaction Flow

| State | Display |
|-------|---------|
| **Initial** | `supplyHint` text + "一键找源" button |
| **Loading** | Skeleton card placeholders |
| **Results** | Horizontal-scroll supplier card list |
| **Selected** | Selected card (green border + check) + cost price confirmation bar |
| **Empty** | "未找到近似货源" message + manual cost price input fallback |
| **Error** | Toast notification + manual cost price input fallback |

### 2.3 Supplier Card Contents

Each card displays:
- Product image (left)
- **Unit price** (large, prominent) + MOQ
- Delivery days + supplier rating / trade level
- Visual similarity score (progress bar)
- "查看详情" external link to 1688 + "选定此源" button

### 2.4 Selection Behavior

1. Card transitions to selected state (green border + checkmark)
2. Bottom confirmation bar appears: "到手价 ¥X.XX 已选为成本价"
3. Calls `usePipelineStore.selectSupplier(supplier)` to write cost price to store
4. "确认选款" button activates

### 2.5 Additional Interactions

- **Auto-fill search image:** Uses selected style's `imageUrl` automatically
- **Re-search with different image:** User can upload their own image to search again
- **Style switch guard:** When `handleSelectCluster` fires in finder page (user selects a different cluster), call `store.selectSupplier(null)` to clear supplier state. No confirmation dialog — the cluster change is the user's intent. The SupplierSearch component resets to initial state showing "一键找源" for the new style.
- **Search result caching:** SupplierSearch keeps results in local component state. Navigating between steps within the same session preserves results. Only re-fetches when the search image changes.

---

## 3. Cost Price Full-Chain Propagation

### 3.1 Store Changes: `lib/store.ts`

New top-level fields on `PipelineStore`:
```typescript
selectedSupplier: Supplier1688Result | null    // init: null
costPrice: number | null                       // init: null — canonical cost price source
costPriceSource: 'supplier-search' | 'manual' | null  // init: null
```

> **Why a top-level `costPrice`?** Currently, downstream skills read cost from `s.skillTesting?.input?.costPrice`, but `skillTesting` may not exist when a supplier is selected (Step 3 happens before testing). A top-level `costPrice` is the canonical source of truth. Both `selectSupplier()` and the testing form write to it.

New actions:
```typescript
selectSupplier(supplier: Supplier1688Result): void
// - Sets selectedSupplier = supplier
// - Sets costPrice = supplier.price
// - Sets costPriceSource = 'supplier-search'

setCostPriceManual(price: number): void
// - Sets costPrice = price
// - Sets costPriceSource = 'manual'
// - Clears selectedSupplier = null
```

**Downstream read resolution (update `runSkill3/5/6`):**
```typescript
const cost = s.costPrice ?? s.skillTesting?.input?.costPrice ?? null
```
This ensures backward compatibility: supplier-search cost takes priority, falls back to testing input, then null.

**Initial state:** Add to `initialSession`:
```typescript
selectedSupplier: null,
costPrice: null,
costPriceSource: null,
```

**Reset cleanup:** Add these three fields to both `setProductInput()` and `reset()` so stale supplier data is cleared when starting a new product.

**Session serialization:** Update `saveCurrentProduct()` to include `selectedSupplier`, `costPrice`, and `costPriceSource` in the serialized session object. Update `loadSession()` to restore them.

### 3.2 Downstream Consumption

| Downstream Skill | Read Point | Effect |
|-----------------|------------|--------|
| Skill 1.5 Testing | `store.costPrice` (pre-filled in testing form) | Stop-loss threshold based on real cost |
| Skill 3 Pricing | `runSkill3()` reads `store.costPrice ?? skillTesting.input.costPrice` | Pricing anchor uses real cost instead of assumed |
| Skill 5 Ads | `runSkill5()` reads `store.costPrice ?? skillTesting.input.costPrice` | ROI calculation based on real cost |
| Skill 6 Campaign | `runSkill6()` reads `store.costPrice ?? skillTesting.input.costPrice` | Profit simulation based on real cost |

### 3.3 DataFlowHint Updates

Add a new flow line in downstream skill pages:
```
找源 → 成本价 ¥X.XX（来自 1688 供应商 XXX）→ 定价/测款/活动
```

Display a `来自找源` tag to distinguish from manually entered cost prices.

### 3.4 DataFlowHint Target Pages

Update `DataFlowHint` in these specific pages:
- `app/(main)/skills/testing/page.tsx` — show "成本价 ¥X.XX（来自找源）→ 止损线计算"
- `app/(main)/skills/pricing/page.tsx` — show "成本价 ¥X.XX（来自找源）→ 定价锚点"
- `app/(main)/skills/ads/page.tsx` — show "成本价 ¥X.XX（来自找源）→ ROI 计算"
- `app/(main)/skills/promo/page.tsx` — show "成本价 ¥X.XX（来自找源）→ 利润测算"

### 3.5 Type Changes: `lib/types.ts`

- Add `Supplier1688Result` interface
- Add `selectedSupplier`, `costPrice`, and `costPriceSource` to `PipelineSession`

---

## 4. Finder Page Refactor

### 4.1 Extract Component: `components/finder/SourceAndConfirm.tsx`

Extract the entire Step 3 section from `finder/page.tsx` (currently ~1637 lines) into a dedicated component containing:
- Existing `supplyHint` status display (retained as initial hint before search)
- New `SupplierSearch` component (search + results + selection)
- Existing "upload supplier / actual photo" section
- "确认选款" button

### 4.2 Confirm Button Logic

| Supplier State | Button Behavior |
|---------------|-----------------|
| Supplier selected | Active, proceed with real cost price |
| No supplier, manual cost entered | Active, with hint "未找源，下游将使用预估成本" |
| No supplier, no cost | Disabled, prompt to find source or enter cost manually |

---

## Files Changed Summary

| Action | File | Details |
|--------|------|---------|
| **New** | `lib/server/ali1688-search.ts` | 1688 API client with signature + mock fallback |
| **New** | `app/(main)/api/supplier-search/route.ts` | POST route with rate limiting |
| **New** | `components/finder/SupplierSearch.tsx` | Search + results + selection UI |
| **New** | `components/finder/SourceAndConfirm.tsx` | Step 3 container (extracted from finder page) |
| **Edit** | `lib/types.ts` | Add `Supplier1688Result`; add `selectedSupplier`, `costPrice`, `costPriceSource` to `PipelineSession` |
| **Edit** | `lib/store.ts` | Add top-level `costPrice`, `costPriceSource`, `selectedSupplier`; add `selectSupplier()`, `setCostPriceManual()`; update `setProductInput()`/`reset()` to clear new fields; update `saveCurrentProduct()`/`loadSession()` to serialize new fields; update `runSkill3/5/6` cost resolution to `store.costPrice ?? skillTesting.input.costPrice` |
| **Edit** | `app/(main)/skills/finder/page.tsx` | Replace Step 3 inline code with `<SourceAndConfirm />`; clear supplier on cluster switch |
| **Edit** | `app/(main)/skills/testing/page.tsx` | Update DataFlowHint with cost source |
| **Edit** | `app/(main)/skills/pricing/page.tsx` | Update DataFlowHint with cost source |
| **Edit** | `app/(main)/skills/ads/page.tsx` | Update DataFlowHint with cost source |
| **Edit** | `app/(main)/skills/promo/page.tsx` | Update DataFlowHint with cost source |
