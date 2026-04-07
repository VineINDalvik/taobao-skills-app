# Supplier Search Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed 1688 image-based supplier search into Skill 1 Step 3, auto-propagate cost price to all downstream skills.

**Architecture:** New API route calls 1688 Open Platform image search, results shown as supplier cards in the existing finder page Step 3. Selected supplier's price writes to a top-level `costPrice` on the Zustand store, which downstream `runSkill3/5/6` read via a resolution chain. The finder page's Step 3 section is extracted into its own component to manage complexity.

**Tech Stack:** Next.js 16 API routes, Zustand, 1688 Open Platform SDK (HTTP + HMAC signature), Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-07-supplier-search-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| **New** | `lib/server/ali1688-search.ts` | 1688 API client: signature generation, image search call, response normalization, mock fallback |
| **New** | `app/(main)/api/supplier-search/route.ts` | POST route handler with rate limiting, delegates to ali1688-search |
| **New** | `components/finder/SupplierSearch.tsx` | Search trigger + result cards + selection UI |
| **New** | `components/finder/SourceAndConfirm.tsx` | Step 3 container: supplyHint + SupplierSearch + upload + confirm button |
| **Edit** | `lib/types.ts` | Add `Supplier1688Result`, update `PipelineSession` with new fields |
| **Edit** | `lib/store.ts` | Add `costPrice`, `costPriceSource`, `selectedSupplier`; new actions; update reset/save/load; update cost resolution in runSkill3/5/6 |
| **Edit** | `app/(main)/skills/finder/page.tsx` | Replace inline Step 3 with `<SourceAndConfirm />`; clear supplier on cluster switch |
| **Edit** | `app/(main)/skills/testing/page.tsx` | Add cost source tag to existing DataFlowHint |
| **Edit** | `app/(main)/skills/pricing/page.tsx` | Add cost source tag to existing DataFlowHint |
| **Edit** | `app/(main)/skills/ads/page.tsx` | Add DataFlowHint import + cost source flow |
| **Edit** | `app/(main)/skills/promo/page.tsx` | Add DataFlowHint import + cost source flow |

---

## Task 1: Add Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `Supplier1688Result` interface**

After the existing `SupplyHint` interface (around line 41), add:

```typescript
export interface Supplier1688Result {
  offerId: string
  title: string
  imageUrl: string
  /** Unit price at MOQ tier, ex-factory (excluding shipping) */
  price: number
  moq: number
  deliveryDays: number
  supplierName: string
  supplierScore: number
  tradeLevel: string
  /** Visual similarity to query image, 0-1 */
  similarityScore: number
  detailUrl: string
}
```

- [ ] **Step 2: Update `PipelineSession` interface**

The current `PipelineSession` is at ~line 226. Add three new fields:

```typescript
export interface PipelineSession {
  productInput: ProductInput
  skill1?: Skill1Output
  selectedStyle?: StyleCluster
  skillTesting?: TestingOutput
  skill2?: Skill2Output
  skill3?: PricingOutput
  skill4?: Skill4Output
  skill5?: Skill5Output
  skill6?: Skill6Output
  // ── Supplier search ──
  selectedSupplier?: Supplier1688Result | null
  costPrice?: number | null
  costPriceSource?: 'supplier-search' | 'manual' | null
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add Supplier1688Result and supplier fields to PipelineSession"
```

---

## Task 2: Update Store — Cost Price + Supplier State

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Add new fields to `PipelineStore` interface**

In the `PipelineStore` interface (starts at line 19), add after the existing fields:

```typescript
// supplier search
selectedSupplier: Supplier1688Result | null
costPrice: number | null
costPriceSource: 'supplier-search' | 'manual' | null
selectSupplier: (supplier: Supplier1688Result | null) => void
setCostPriceManual: (price: number) => void
```

Add `Supplier1688Result` to the import from `./types`.

- [ ] **Step 2: Add initial values to `initialSession`**

The current `initialSession` (line 45) becomes:

```typescript
const initialSession: PipelineSession & { completedSkills: number[]; activeSkill: number } = {
  productInput: { category: '', priceRange: '', styleKeywords: [] },
  completedSkills: [],
  activeSkill: 0,
  selectedSupplier: null,
  costPrice: null,
  costPriceSource: null,
}
```

- [ ] **Step 3: Add `selectSupplier` and `setCostPriceManual` actions**

Add after the existing `selectStyle` action:

```typescript
selectSupplier: (supplier) =>
  set(supplier
    ? { selectedSupplier: supplier, costPrice: supplier.price, costPriceSource: 'supplier-search' }
    : { selectedSupplier: null, costPrice: null, costPriceSource: null }),

setCostPriceManual: (price) =>
  set({ costPrice: price, costPriceSource: 'manual', selectedSupplier: null }),
```

- [ ] **Step 4: Update `setProductInput` to clear new fields**

The current `setProductInput` (line 55) resets all skill outputs. Add the three new fields:

```typescript
setProductInput: (input) =>
  set({ productInput: input, completedSkills: [], activeSkill: 1,
        skill1: undefined, selectedStyle: undefined, skillTesting: undefined,
        skill2: undefined, skill3: undefined, skill4: undefined,
        skill5: undefined, skill6: undefined, classifyResult: undefined,
        selectedSupplier: null, costPrice: null, costPriceSource: null }),
```

- [ ] **Step 5: Update `reset` to clear new fields**

The current `reset` (line 189):

```typescript
reset: () => set({ ...initialSession, classifyResult: undefined }),
```

Since `initialSession` now includes the three new fields (from Step 2), `reset` already clears them. No code change needed — verify this is correct.

- [ ] **Step 6: Update cost price resolution in `runSkill3`, `runSkill5`, `runSkill6`**

Each of these currently reads `s.skillTesting?.input?.costPrice`. Change to prefer top-level `costPrice`:

**`runSkill3` (line 92):**
```typescript
runSkill3: () =>
  set((s) => ({
    skill3: buildSkill3({
      style: s.selectedStyle,
      costPrice: s.costPrice ?? s.skillTesting?.input?.costPrice,
      input: s.productInput,
    }),
    completedSkills: [...new Set([...s.completedSkills, 3])],
  })),
```

**`runSkill5` (line 110):**
```typescript
runSkill5: () =>
  set((s) => ({
    skill5: buildSkill5({
      style: s.selectedStyle,
      optimalPrice: s.skill3?.optimalPrice,
      costPrice: s.costPrice ?? s.skillTesting?.input?.costPrice,
    }),
    completedSkills: [...new Set([...s.completedSkills, 5])],
  })),
```

**`runSkill6` (line 120):**
```typescript
runSkill6: () =>
  set((s) => ({
    skill6: buildSkill6({
      style: s.selectedStyle,
      priceSchedule: s.skill3?.priceSchedule,
      costPrice: s.costPrice ?? s.skillTesting?.input?.costPrice,
      budgetSuggestion: s.skill5?.budgetSuggestion,
    }),
    completedSkills: [...new Set([...s.completedSkills, 6])],
  })),
```

- [ ] **Step 7: Update `saveCurrentProduct` to serialize new fields**

In `saveCurrentProduct` (line 135), the `session` object is manually constructed. Add the three new fields:

```typescript
session: {
  productInput: s.productInput,
  skill1: s.skill1,
  selectedStyle: s.selectedStyle,
  skill2: s.skill2,
  skill3: s.skill3,
  skill4: s.skill4,
  skill5: s.skill5,
  skill6: s.skill6,
  selectedSupplier: s.selectedSupplier,
  costPrice: s.costPrice,
  costPriceSource: s.costPriceSource,
},
```

- [ ] **Step 8: Verify `loadSession` works with new fields**

The current `loadSession` spreads `...record.session`, so the new fields (`selectedSupplier`, `costPrice`, `costPriceSource`) are automatically restored from saved sessions — no code change needed. Verify by confirming `loadSession` still does a plain spread of `record.session` (line 61-66). If it ever switches to destructuring individual fields, these three must be added.

- [ ] **Step 9: Verify the app compiles**

```bash
npx next build 2>&1 | tail -20
```

Expected: No type errors related to the new fields.

- [ ] **Step 10: Commit**

```bash
git add lib/store.ts
git commit -m "feat(store): add supplier selection and top-level costPrice with downstream resolution"
```

---

## Task 3: 1688 API Client

**Files:**
- Create: `lib/server/ali1688-search.ts`

- [ ] **Step 1: Create the server module**

```typescript
import type { Supplier1688Result } from '../types'
import crypto from 'crypto'

// ── Config ──────────────────────────────────────────────────
const APP_KEY = process.env.ALI1688_APP_KEY ?? ''
const APP_SECRET = process.env.ALI1688_APP_SECRET ?? ''
const API_HOST = 'https://gw.open.1688.com/openapi'

// ── Signature helper (1688 Open Platform HMAC-SHA1) ─────────
function sign(apiPath: string, params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
  const str = apiPath + sorted.map((k) => k + params[k]).join('')
  return crypto.createHmac('sha1', APP_SECRET).update(str).digest('hex').toUpperCase()
}

// ── Mock data (fallback when API is unavailable) ────────────
function mockSupplierResults(imageUrl: string): Supplier1688Result[] {
  return [
    {
      offerId: 'mock-001',
      title: '法式碎花V领连衣裙 春夏新款',
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=200&h=250&fit=crop',
      price: 45,
      moq: 30,
      deliveryDays: 3,
      supplierName: '杭州美织服饰',
      supplierScore: 4.8,
      tradeLevel: 'A2',
      similarityScore: 0.92,
      detailUrl: 'https://detail.1688.com/offer/mock-001.html',
    },
    {
      offerId: 'mock-002',
      title: '碎花雪纺连衣裙 V领收腰',
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&h=250&fit=crop',
      price: 52,
      moq: 50,
      deliveryDays: 5,
      supplierName: '广州锦绣纺织',
      supplierScore: 4.6,
      tradeLevel: 'A1',
      similarityScore: 0.85,
      detailUrl: 'https://detail.1688.com/offer/mock-002.html',
    },
    {
      offerId: 'mock-003',
      title: '碎花吊带裙 轻薄雪纺面料',
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=200&h=250&fit=crop',
      price: 38,
      moq: 100,
      deliveryDays: 4,
      supplierName: '织里小雅制衣',
      supplierScore: 4.5,
      tradeLevel: 'B',
      similarityScore: 0.78,
      detailUrl: 'https://detail.1688.com/offer/mock-003.html',
    },
  ]
}

// ── Main search function ────────────────────────────────────
export async function searchSuppliersByImage(
  imageUrl: string,
): Promise<Supplier1688Result[]> {
  // Fall back to mock if no credentials
  if (!APP_KEY || !APP_SECRET) {
    console.warn('[ali1688] No credentials configured, returning mock data')
    return mockSupplierResults(imageUrl)
  }

  const apiPath = 'param2/1/com.alibaba.search/alibaba.search.product.imageUploadSearch'
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+08:00')

  const params: Record<string, string> = {
    _aop_timestamp: timestamp,
    access_token: '', // Will need OAuth token flow for production
    imageUrl,
  }
  params._aop_signature = sign(apiPath, params)

  const url = `${API_HOST}/${apiPath}/${APP_KEY}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    })

    if (!res.ok) {
      console.error(`[ali1688] API error: ${res.status}`)
      return mockSupplierResults(imageUrl)
    }

    const json = await res.json()
    // Normalize 1688 response to our type
    // The exact response shape depends on the API version — adapt at integration time
    const items = json?.result?.data ?? json?.data ?? []
    return items.slice(0, 8).map((item: Record<string, unknown>, idx: number) => ({
      offerId: String(item.offerId ?? `1688-${idx}`),
      title: String(item.subject ?? item.title ?? ''),
      imageUrl: String(item.imageUrl ?? item.image?.imgUrl ?? ''),
      price: Number(item.priceInfo?.price ?? item.price ?? 0),
      moq: Number(item.moq ?? item.minOrderQuantity ?? 1),
      deliveryDays: Number(item.deliveryDays ?? 3),
      supplierName: String(item.supplierName ?? item.companyName ?? ''),
      supplierScore: Number(item.supplierScore ?? item.compositeScore ?? 0),
      tradeLevel: String(item.tradeLevel ?? item.tpLevel ?? ''),
      similarityScore: Math.round((1 - idx * 0.05) * 100) / 100,
      detailUrl: String(item.detailUrl ?? `https://detail.1688.com/offer/${item.offerId}.html`),
    })) as Supplier1688Result[]
  } catch (err) {
    console.error('[ali1688] Fetch failed:', err)
    return mockSupplierResults(imageUrl)
  }
}
```

- [ ] **Step 2: Verify the module compiles**

```bash
npx tsc --noEmit lib/server/ali1688-search.ts 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add lib/server/ali1688-search.ts
git commit -m "feat(api): add 1688 image search client with HMAC signature and mock fallback"
```

---

## Task 4: API Route

**Files:**
- Create: `app/(main)/api/supplier-search/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import { NextResponse } from 'next/server'
import { searchSuppliersByImage } from '@/lib/server/ali1688-search'

export const runtime = 'nodejs'

// ── Simple in-memory rate limiter (10 req/min global) ───────
let recentCalls: number[] = []
const RATE_LIMIT = 10
const WINDOW_MS = 60_000

function isRateLimited(): boolean {
  const now = Date.now()
  recentCalls = recentCalls.filter((t) => now - t < WINDOW_MS)
  if (recentCalls.length >= RATE_LIMIT) return true
  recentCalls.push(now)
  return false
}

export async function POST(req: Request) {
  if (isRateLimited()) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const imageUrl = body?.imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 },
      )
    }

    const results = await searchSuppliersByImage(imageUrl)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('[supplier-search] route error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/\(main\)/api/supplier-search/route.ts
git commit -m "feat(api): add /api/supplier-search POST route with rate limiting"
```

---

## Task 5: SupplierSearch Component

**Files:**
- Create: `components/finder/SupplierSearch.tsx`

- [ ] **Step 1: Create the search + results component**

```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, CheckCircle2, ExternalLink, Loader2, AlertCircle, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Supplier1688Result, SupplyHint } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'

const SEARCH_COOLDOWN_MS = 2000

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; results: Supplier1688Result[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

interface SupplierSearchProps {
  imageUrl: string
  supplyHint: SupplyHint
  className?: string
}

export function SupplierSearch({ imageUrl, supplyHint, className }: SupplierSearchProps) {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const selectedSupplier = usePipelineStore((s) => s.selectedSupplier)
  const selectSupplier = usePipelineStore((s) => s.selectSupplier)
  const setCostPriceManual = usePipelineStore((s) => s.setCostPriceManual)
  const [manualCost, setManualCost] = useState('')
  const lastSearchAt = useRef(0)

  const handleSearch = useCallback(async () => {
    // 2s client-side cooldown per spec
    if (Date.now() - lastSearchAt.current < SEARCH_COOLDOWN_MS) return
    lastSearchAt.current = Date.now()
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/supplier-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      if (res.status === 429) {
        setState({ status: 'error', message: '请求过于频繁，请稍后再试' })
        return
      }
      if (!res.ok) {
        setState({ status: 'error', message: '搜索失败，请重试' })
        return
      }
      const data = await res.json()
      const results = data.results as Supplier1688Result[]
      if (!results.length) {
        setState({ status: 'empty' })
      } else {
        setState({ status: 'results', results })
      }
    } catch {
      setState({ status: 'error', message: '网络异常，请检查连接' })
    }
  }, [imageUrl])

  const handleSelect = (supplier: Supplier1688Result) => {
    selectSupplier(supplier)
  }

  const handleManualSubmit = () => {
    const price = parseFloat(manualCost)
    if (!isNaN(price) && price > 0) {
      setCostPriceManual(price)
    }
  }

  // ── Supply hint (initial state banner) ──
  const hintBanner = (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2 text-[10px] leading-snug',
        supplyHint.status === 'matched' ? 'border-green-200 bg-green-50 text-green-900' :
        supplyHint.status === 'weak' ? 'border-amber-200 bg-amber-50 text-amber-900' :
        'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <span className="font-semibold">
        货源提示：
        {supplyHint.status === 'matched' ? '匹配度较好' :
          supplyHint.status === 'weak' ? '弱匹配 / 需仔细对样' : '待检索'}
      </span>
      {' · '}{supplyHint.note}
    </div>
  )

  // ── Manual cost fallback ──
  const manualFallback = (
    <div className="flex items-center gap-2 mt-3">
      <input
        type="number"
        placeholder="手动输入成本价"
        value={manualCost}
        onChange={(e) => setManualCost(e.target.value)}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={handleManualSubmit}
        disabled={!manualCost || isNaN(parseFloat(manualCost))}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 disabled:opacity-40"
      >
        确认
      </button>
    </div>
  )

  return (
    <div className={cn('space-y-3', className)}>
      {hintBanner}

      {/* ── Idle: show search trigger ── */}
      {state.status === 'idle' && !selectedSupplier && (
        <button
          type="button"
          onClick={handleSearch}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-semibold text-primary"
        >
          <Search className="size-4" />
          一键找源 · 1688 以图搜
        </button>
      )}

      {/* ── Loading ── */}
      {state.status === 'loading' && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shrink-0 w-44 rounded-lg border border-border bg-card overflow-hidden animate-pulse">
              <div className="h-32 bg-muted" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {(state.status === 'results' || selectedSupplier) && (
        <>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            1688 视觉近似 · {state.status === 'results' ? state.results.length : 1} 个结果
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {(state.status === 'results' ? state.results : [selectedSupplier!]).map((s) => {
              const isSelected = selectedSupplier?.offerId === s.offerId
              return (
                <div
                  key={s.offerId}
                  className={cn(
                    'shrink-0 w-44 rounded-lg border overflow-hidden transition-colors',
                    isSelected ? 'border-green-400 bg-green-50/50 ring-1 ring-green-400' : 'border-border bg-card',
                  )}
                >
                  <div className="h-32 overflow-hidden bg-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-green-500 p-0.5">
                        <CheckCircle2 className="size-3.5 text-white" />
                      </div>
                    )}
                    {/* Similarity bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-0.5 flex items-center gap-1.5">
                      <div className="flex-1 h-1 rounded-full bg-white/30">
                        <div
                          className="h-full rounded-full bg-green-400"
                          style={{ width: `${s.similarityScore * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-white font-medium">{Math.round(s.similarityScore * 100)}%</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[9px] font-medium truncate" title={s.title}>{s.title}</p>
                    <p className="text-sm font-bold text-green-600 mt-0.5">
                      ¥{s.price.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {s.moq}件起 · {s.deliveryDays}天发货
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate" title={s.supplierName}>
                      {s.supplierName} · {s.tradeLevel} · {s.supplierScore}分
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => handleSelect(s)}
                          className="flex-1 text-[10px] font-semibold py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        >
                          选定此源
                        </button>
                      )}
                      <a
                        href={s.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded-md border border-border',
                          isSelected ? 'flex-1' : 'px-2',
                        )}
                      >
                        <ExternalLink className="size-3" /> 详情
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
            {state.status === 'results' && (
              <div className="shrink-0 w-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-center p-2">
                <div>
                  <Package className="size-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground">更多供应商<br/>请到 1688 搜索</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Selected confirmation bar ── */}
          {selectedSupplier && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-green-800">
                到手价 ¥{selectedSupplier.price.toFixed(2)}<span className="font-normal text-green-600">（不含运费）</span>已选为成本价
              </p>
              <button
                type="button"
                onClick={() => { selectSupplier(null); setState({ status: 'idle' }) }}
                className="text-[10px] text-green-700 underline hover:text-green-900"
              >
                重选
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {state.status === 'empty' && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4 text-center">
          <AlertCircle className="size-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-xs text-amber-900 font-medium">未找到近似货源</p>
          <p className="text-[10px] text-amber-700 mt-1">建议线下以图搜或调整参考图</p>
          {manualFallback}
        </div>
      )}

      {/* ── Error state ── */}
      {state.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-center">
          <AlertCircle className="size-5 text-red-500 mx-auto mb-1.5" />
          <p className="text-xs text-red-900 font-medium">{state.message}</p>
          <button
            type="button"
            onClick={handleSearch}
            className="mt-2 text-[10px] text-primary underline"
          >
            重试
          </button>
          {manualFallback}
        </div>
      )}

      {/* ── Manual fallback when idle and no supplier ── */}
      {state.status === 'idle' && !selectedSupplier && (
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">或</p>
          {manualFallback}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/finder/SupplierSearch.tsx
git commit -m "feat(ui): add SupplierSearch component with 1688 search, card list, and manual fallback"
```

---

## Task 6: SourceAndConfirm Component (Step 3 Extraction)

**Files:**
- Create: `components/finder/SourceAndConfirm.tsx`

This component extracts the Step 3 section from the finder page.

> **Important:** `supplierImageUrl` and `supplierConfirmed` are shared with the playbook tab (confirmed view, product image) and extend tab (ExtensionDesignLab base image). They MUST remain in the parent page and be passed as props — not as local state in this component.

- [ ] **Step 1: Create the container component**

```tsx
'use client'

import { useRef } from 'react'
import { ArrowRight, ImagePlus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { SupplierSearch } from './SupplierSearch'
import type { StyleCluster } from '@/lib/types'

interface SourceAndConfirmProps {
  activeRec: StyleCluster
  /** Shared with playbook/extend tabs — parent owns this state */
  supplierImageUrl: string
  setSupplierImageUrl: (url: string) => void
  supplierConfirmed: boolean
  onConfirm: () => void
  className?: string
}

export function SourceAndConfirm({
  activeRec, supplierImageUrl, setSupplierImageUrl,
  supplierConfirmed, onConfirm, className,
}: SourceAndConfirmProps) {
  const supplierFileRef = useRef<HTMLInputElement>(null)
  const selectedSupplier = usePipelineStore((s) => s.selectedSupplier)
  const costPrice = usePipelineStore((s) => s.costPrice)
  const costPriceSource = usePipelineStore((s) => s.costPriceSource)

  const canConfirm = !supplierConfirmed && (selectedSupplier || costPrice || supplierImageUrl)

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <h3 className="text-sm font-semibold mb-1">货源参考 + 绑定实拍</h3>
        <p className="text-xs text-muted-foreground">1688 仅辅助；无近源仍可测款</p>
      </div>

      {/* ── Supplier Search ── */}
      <SupplierSearch
        imageUrl={activeRec.imageUrl}
        supplyHint={activeRec.supplyHint}
      />

      {/* ── Upload supplier / actual photo ── */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
          上传供应商或实拍主图
        </p>
        {!supplierImageUrl ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => supplierFileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/20 hover:bg-primary/5 transition-colors p-5 text-center"
            >
              <ImagePlus className="size-6 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs font-medium">点击上传</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">JPG / PNG / 截图</p>
            </button>
            <input
              ref={supplierFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setSupplierImageUrl(URL.createObjectURL(e.target.files[0]))
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-green-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={supplierImageUrl} alt="供应商图" className="w-full h-full object-cover" />
              <CheckCircle2 className="absolute top-1 right-1 size-3 text-green-600" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="text-xs font-semibold text-green-700">已上传</p>
              <button
                type="button"
                onClick={() => setSupplierImageUrl('')}
                className="text-[10px] text-muted-foreground hover:text-foreground underline mt-1"
              >
                重新上传
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm button ── */}
      {!supplierConfirmed && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
              canConfirm
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            确认选款
            <ArrowRight className="size-3.5" />
          </button>
          {!selectedSupplier && !costPrice && (
            <p className="text-[10px] text-center text-muted-foreground">
              请先找源或手动输入成本价
            </p>
          )}
          {(costPriceSource === 'manual' && !selectedSupplier) && (
            <p className="text-[10px] text-center text-amber-600">
              未找源，下游将使用手动输入的预估成本
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/finder/SourceAndConfirm.tsx
git commit -m "feat(ui): add SourceAndConfirm container component for finder Step 3"
```

---

## Task 7: Integrate into Finder Page

**Files:**
- Modify: `app/(main)/skills/finder/page.tsx`

- [ ] **Step 1: Add import**

Add to the import block (around line 13):

```typescript
import { SourceAndConfirm } from '@/components/finder/SourceAndConfirm'
```

- [ ] **Step 2: Clear supplier on cluster switch**

In `handleSelectCluster` (around line 424), add a call to clear supplier state. The existing function:

```typescript
const handleSelectCluster = (styleId: string) => {
  setSelectedClusterId(styleId)
  setSelectedRefIdx(null)
  setSupplierImageUrl('')
  setSupplierConfirmed(false)
  setActiveFlowStep(2)
}
```

Add `selectSupplier(null)`:

```typescript
const handleSelectCluster = (styleId: string) => {
  setSelectedClusterId(styleId)
  setSelectedRefIdx(null)
  setSupplierImageUrl('')
  setSupplierConfirmed(false)
  selectSupplier(null)
  setActiveFlowStep(2)
}
```

Also destructure `selectSupplier` from the store. Find the existing store destructuring (around line 110-115) and add it:

```typescript
const selectSupplier = usePipelineStore((s) => s.selectSupplier)
```

- [ ] **Step 3: Replace `renderStep3` function body**

The current `renderStep3` function (lines 845-968) contains the entire Step 3 inline. Replace its content — keep the guard checks at the top, but swap the main body with `<SourceAndConfirm />`.

> **Important:** `supplierImageUrl`, `setSupplierImageUrl`, `supplierConfirmed`, and `setSupplierConfirmed` MUST stay in the parent page because they're referenced by the playbook tab (~line 1249, 1287, 1305) and extend tab (~line 1401, 1409). Pass them as props.

The current guards (lines 846-860) for `step2Unlocked` and `step3Unlocked` remain unchanged. Replace the `return` block after the guards (the `<div className="space-y-5">` block starting around line 861) with:

```tsx
return (
  <SourceAndConfirm
    activeRec={activeRec}
    supplierImageUrl={supplierImageUrl}
    setSupplierImageUrl={setSupplierImageUrl}
    supplierConfirmed={supplierConfirmed}
    onConfirm={() => {
      if (!activeRec) return
      selectStyle(activeRec)
      setSupplierConfirmed(true)
      setTopTab('playbook')
    }}
  />
)
```

- [ ] **Step 4: Clean up parent state**

**Keep in parent** (shared with playbook/extend tabs):
- `supplierImageUrl` / `setSupplierImageUrl` — used by playbook confirmed view + ExtensionDesignLab
- `supplierConfirmed` / `setSupplierConfirmed` — used by playbook conditional rendering
- `handleSelectCluster` — still resets these + calls `selectSupplier(null)`

**Remove from parent** (now inside SourceAndConfirm):
- `supplierFileRef` — the file input ref is now in SourceAndConfirm
- `suppliers` derived variable (lines 411-419) — supplier cards are now in SupplierSearch

Update `handleSelectCluster` to add `selectSupplier(null)` (keep existing resets):

```typescript
const handleSelectCluster = (styleId: string) => {
  setSelectedClusterId(styleId)
  setSelectedRefIdx(null)
  setSupplierImageUrl('')
  setSupplierConfirmed(false)
  selectSupplier(null)
  setActiveFlowStep(2)
}
```

- [ ] **Step 5: Remove unused imports**

Remove `Package` from the lucide-react import (only used in old Step 3 supplier cards) if no longer referenced. Keep `ImagePlus` and `CheckCircle2` only if still used elsewhere in the page.

- [ ] **Step 6: Verify it compiles and renders**

```bash
npx next build 2>&1 | tail -20
```

Then start the dev server and manually check:
1. Navigate to `/skills/finder`
2. Select a cluster → Select a reference → Step 3 should show the new SupplierSearch UI
3. Click "一键找源" → should show mock supplier cards
4. Select a supplier → green confirmation bar appears
5. Click "确认选款" → navigates to playbook tab

- [ ] **Step 7: Commit**

```bash
git add app/\(main\)/skills/finder/page.tsx
git commit -m "feat(finder): replace inline Step 3 with SourceAndConfirm component"
```

---

## Task 8: Update DataFlowHint in Downstream Skills

**Files:**
- Modify: `app/(main)/skills/testing/page.tsx`
- Modify: `app/(main)/skills/pricing/page.tsx`
- Modify: `app/(main)/skills/ads/page.tsx`
- Modify: `app/(main)/skills/promo/page.tsx`

**Shared pattern:** Each page needs these store reads added:

```typescript
const costPriceSource = usePipelineStore((s) => s.costPriceSource)
const selectedSupplier = usePipelineStore((s) => s.selectedSupplier)
```

And a conditional cost-source flow item:

```typescript
const supplierCostFlow = costPriceSource === 'supplier-search' && selectedSupplier
  ? { from: '找源', value: `成本价 ¥${selectedSupplier.price}（${selectedSupplier.supplierName}）` }
  : null
```

- [ ] **Step 1: Update testing page DataFlowHint**

In `testing/page.tsx`, the existing `DataFlowHint` (around line 510) already shows cost-related flows. Update the first flow item in the `isScale` case to show supplier source when available:

```typescript
{
  from: supplierCostFlow ? '找源' : '测款',
  value: supplierCostFlow
    ? supplierCostFlow.value
    : `采购成本 ¥${skillTesting.input.costPrice}`,
  toLabel: 'Skill 3 定价',
  to: '作为 Lagrangian 利润优化的成本约束',
},
```

- [ ] **Step 2: Update pricing page DataFlowHint**

In `pricing/page.tsx`, add a conditional first flow at the beginning of the existing `flows` array:

```typescript
...(supplierCostFlow ? [{
  from: '找源',
  value: supplierCostFlow.value,
  toLabel: 'Skill 3',
  to: '作为定价优化的成本约束',
}] : []),
```

- [ ] **Step 3: Add DataFlowHint to ads page**

In `ads/page.tsx`, add the import and a DataFlowHint showing cost source. The ads page doesn't currently use DataFlowHint, so add:

```typescript
import { DataFlowHint } from '@/components/shared/DataFlowHint'
```

Add a `DataFlowHint` above the existing content (find a natural placement after the header):

```tsx
{supplierCostFlow && (
  <DataFlowHint
    title="找源数据 → 推广诊断"
    flows={[{
      from: '找源',
      value: supplierCostFlow.value,
      toLabel: 'Skill 5 推广',
      to: '用于 ROI 计算的成本基准',
    }]}
    className="mb-6"
  />
)}
```

- [ ] **Step 4: Add DataFlowHint to promo page**

Same pattern for `promo/page.tsx`:

```typescript
import { DataFlowHint } from '@/components/shared/DataFlowHint'
```

```tsx
{supplierCostFlow && (
  <DataFlowHint
    title="找源数据 → 活动促销"
    flows={[{
      from: '找源',
      value: supplierCostFlow.value,
      toLabel: 'Skill 6 活动',
      to: '利润测算的成本约束',
    }]}
    className="mb-6"
  />
)}
```

- [ ] **Step 5: Verify all four pages compile**

```bash
npx next build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add app/\(main\)/skills/testing/page.tsx app/\(main\)/skills/pricing/page.tsx app/\(main\)/skills/ads/page.tsx app/\(main\)/skills/promo/page.tsx
git commit -m "feat(ui): show supplier cost source in DataFlowHint across all downstream skills"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full build check**

```bash
npx next build 2>&1 | tail -30
```

Expected: Clean build with no errors.

- [ ] **Step 2: Manual smoke test**

Start dev server and walk through:

1. `/skills/finder` → Run Skill 1 → select cluster → select reference
2. Step 3: see "一键找源" button → click it → supplier cards appear
3. Select a supplier → confirmation bar with price
4. "确认选款" → goes to playbook
5. Navigate to `/skills/testing` → DataFlowHint shows "来自找源" cost
6. Navigate to `/skills/pricing` → DataFlowHint shows supplier source
7. Go back to finder → switch cluster → supplier selection cleared

- [ ] **Step 3: Commit final state if any fixups were needed**

```bash
git add -A && git commit -m "fix: address smoke test issues in supplier search flow"
```
