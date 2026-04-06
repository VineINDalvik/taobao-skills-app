# Campaign Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-step promotional pricing pipeline (`/campaign`) for Taobao SMB sellers — from intent config through OR pricing to promotional asset generation with phone preview.

**Architecture:** New Next.js route group `(campaign)` with its own layout (CampaignSidebar + AgentStream). A Zustand `campaignPipeline` slice manages state independently from the existing PipelineSession. Each pipeline step is a self-contained component rendered by the main page based on `currentStep`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand v5, Recharts, Framer Motion, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-06-campaign-pipeline-design.md`

---

## File Structure

```
lib/
├── campaign-types.ts          # CampaignPipeline interface + AgentLog type
├── campaign-store.ts          # Zustand slice: state + actions
├── mock-campaign.ts           # Complete mock data for all 6 steps

app/
├── (main)/                    # Existing routes (moved into route group)
│   ├── layout.tsx             # Global Sidebar layout (existing, moved)
│   ├── page.tsx               # Home (existing, moved)
│   ├── products/              # (existing, moved)
│   └── skills/                # (existing, moved)
└── (campaign)/                # New route group
    ├── layout.tsx             # CampaignSidebar + AgentStream layout
    └── campaign/
        └── page.tsx           # Main page: PipelineStepper + step router

components/campaign/
├── PipelineStepper.tsx        # 6-step progress bar with icons + connecting line
├── AgentStream.tsx            # Bottom terminal log panel (collapsible)
├── CampaignSidebar.tsx        # Left sidebar: nav + task history
├── Step1Intent.tsx            # Event type + sliders + product context
├── Step2DataProfile.tsx       # Data pull animation + elasticity panel
├── Step3Pricing.tsx           # Lagrangian optimization + convergence chart + 3-tier cards
├── Step4RiskReview.tsx        # Risk checks + manual price adjustment
├── Step5Assets.tsx            # Asset generation list + phone preview
├── Step6Deploy.tsx            # Summary + execution checklist
├── PhonePreview.tsx           # Taobao product page simulator
└── ConvergenceChart.tsx       # Dual-axis Recharts line chart
```

---

## Task 1: Types + Mock Data + Store

**Files:**
- Create: `lib/campaign-types.ts`
- Create: `lib/mock-campaign.ts`
- Create: `lib/campaign-store.ts`

- [ ] **Step 1: Create campaign types**

Create `lib/campaign-types.ts` with the `CampaignPipeline` interface, `AgentLog` type, and all nested sub-types as defined in the spec's State Management section. Keep types self-contained — do not import from `lib/types.ts` (the campaign pipeline has its own shapes).

- [ ] **Step 2: Create mock campaign data**

Create `lib/mock-campaign.ts` exporting `MOCK_CAMPAIGN: CampaignPipeline` — a complete mock dataset for the "618 女装大促" scenario with the 法式碎花连衣裙 product. Include:
- `intent`: eventType '618', targetMargin 0.4, maxDiscount 0.7, salesTarget 200, inventoryLimit 320
- `dataProfile`: 14 days of sales data, 5 competitors, β=-1.8, 2 historical promo records
- `pricing`: 5 iterations converging to ¥139, three-tier (¥169/¥139/¥119), 3 profit scenarios
- `riskReview`: 1 pass, 2 warns, 0 blocks
- `assets`: 5 items (main_image, coupon_overlay, detail_header, promo_badge, video_cover) with mock Unsplash URLs
- `deployment`: 5-item checklist (T-7, T-3, T-1, T+0, T+n)
- `agentLogs`: 15-20 log entries covering all steps

Also export `buildMockAgentLogs(step: number): AgentLog[]` that returns step-specific logs, and `MOCK_TASK_HISTORY` array with 3 past campaign summaries for the sidebar.

- [ ] **Step 3: Create campaign store**

Create `lib/campaign-store.ts` with a standalone Zustand store `useCampaignStore`. Implement all actions from the spec:
- `createCampaign(name)`: initializes a new pipeline with fresh taskId
- `setCampaignIntent(intent)`: sets Step 1 data, advances to step 2
- `runDataProfile()`: loads mock data profile, appends agent logs with `setTimeout` sequencing, advances to step 3
- `runPricing()`: loads mock pricing with iteration simulation, advances when done
- `confirmRiskReview(adjustedPrice?)`: sets confirmed, advances to step 5
- `generateAssets()`: sequentially sets each asset status pending→generating→done
- `deployCampaign()`: marks deployment saved
- `advanceStep()` / `goToStep(n)`: navigation with validation (back only to completed steps, forward resets downstream)
- `appendLog(log)`: pushes to agentLogs array
- `confirmedPrice` getter: `riskReview?.adjustedPrice ?? pricing?.promoPrice`

Use the existing store pattern (create from zustand, no persist middleware).

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors from the new files.

- [ ] **Step 5: Commit**

```bash
git add lib/campaign-types.ts lib/mock-campaign.ts lib/campaign-store.ts
git commit -m "feat(campaign): add types, mock data, and Zustand store"
```

---

## Task 2: Route Group Restructure + Campaign Layout

**Files:**
- Move: `app/layout.tsx` → `app/(main)/layout.tsx`
- Move: `app/page.tsx` → `app/(main)/page.tsx`
- Move: `app/products/` → `app/(main)/products/`
- Move: `app/skills/` → `app/(main)/skills/`
- Move: `app/api/` → `app/(main)/api/`
- Modify: `app/layout.tsx` (new root — only html/body, no Sidebar)
- Create: `app/(campaign)/layout.tsx`
- Create: `app/(campaign)/campaign/page.tsx` (placeholder)

- [ ] **Step 1: Create new root layout**

The current `app/layout.tsx` renders `<Sidebar />` globally. We need a root layout that only handles html/body/fonts, then let route groups add their own sidebars.

Rewrite `app/layout.tsx` to only contain the `<html>` and `<body>` tags with font variables and `className="h-full"`. Remove the Sidebar import and rendering.

- [ ] **Step 2: Create (main) route group layout**

Create `app/(main)/layout.tsx` that renders `<Sidebar />` + `<main>` wrapper — exactly what the current root layout does for content. This preserves the existing UI for all current routes.

- [ ] **Step 3: Move existing routes into (main)**

Move `app/page.tsx`, `app/products/`, `app/skills/`, `app/api/`, and `app/icon.png` into `app/(main)/`. Verify all imports still resolve (they should — route groups don't affect import paths).

- [ ] **Step 4: Create (campaign) layout**

Create `app/(campaign)/layout.tsx` — a shell with three areas:
- Left: `<CampaignSidebar />` (placeholder div for now, 220px width, dark bg)
- Center: `{children}` (flex-1)
- Bottom: `<AgentStream />` (placeholder div for now, 160px height, dark bg, collapsible)

Use dark theme colors: bg-[#0f0f14], border-[#2a2a35], text-[#e0e0e0].

- [ ] **Step 5: Create campaign page placeholder**

Create `app/(campaign)/campaign/page.tsx` — a `'use client'` component that renders:
```tsx
<div className="flex-1 flex items-center justify-center">
  <h1 className="text-xl font-semibold text-white">大促操盘管线</h1>
</div>
```

- [ ] **Step 6: Verify all routes work**

Run: `npm run dev`
- Visit `http://localhost:3000` — should show existing home page with Sidebar
- Visit `http://localhost:3000/skills/pricing` — should show existing pricing page
- Visit `http://localhost:3000/campaign` — should show dark campaign layout with placeholder text

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(campaign): restructure routes into (main) and (campaign) groups"
```

---

## Task 3: PipelineStepper + CampaignSidebar + AgentStream

**Files:**
- Create: `components/campaign/PipelineStepper.tsx`
- Create: `components/campaign/CampaignSidebar.tsx`
- Create: `components/campaign/AgentStream.tsx`
- Modify: `app/(campaign)/layout.tsx` — wire in real components
- Modify: `app/(campaign)/campaign/page.tsx` — wire in PipelineStepper

- [ ] **Step 1: Build PipelineStepper**

Create `components/campaign/PipelineStepper.tsx`. Props: `currentStep: 1-6`, `completedSteps: number[]`.

6 steps with icons: 🎯 意图解析 / 📊 数据画像 / 🧮 智能定价 / 🛡️ 方案审核 / 🎨 促销素材 / 🚀 确认执行.

Each step: circle (56px, rounded-2xl) with emoji, label below, optional sub-label. States:
- Completed: green border + green bg gradient, label green, sub-label "已完成"
- Active: amber border + amber bg gradient + box-shadow glow, label amber bold, sub-label "进行中"
- Pending: dark bg (#1e1e28) + gray border, label gray

Connecting line between steps: absolute positioned div, 3px height. Completed portion uses green→green gradient, active portion fades to amber, rest is gray (#2a2a35).

Use Framer Motion `motion.div` for the progress line width animation (0.6s ease).

- [ ] **Step 2: Build CampaignSidebar**

Create `components/campaign/CampaignSidebar.tsx`. Width 220px, dark bg (#16161d).

Sections:
1. Logo block: "Tidal" + "智能定价与会场生成" subtitle (reuse brand icon from existing Sidebar if path accessible, otherwise use a gradient square with "AI")
2. Nav section "AI 操盘中枢": two items — "智能定价管线" (active, indigo left border), "折扣洞察分析" (inactive, placeholder)
3. Task history section: read `MOCK_TASK_HISTORY` from mock-campaign.ts. Each card shows: task name, market/brand, target margin %, status tag, created time. Max 5 items, scrollable.
4. Bottom: "Human-in-the-loop · PRICING COMMANDER" badge

- [ ] **Step 3: Build AgentStream**

Create `components/campaign/AgentStream.tsx`. Props: `logs: AgentLog[]`, `collapsed: boolean`, `onToggle: () => void`.

Fixed bottom panel, 160px height (or 32px when collapsed). Dark bg (#0a0a0f), monospace font.

Header: green dot + "SYSTEM.AGENT_STREAM" + "CONNECTION ESTABLISHED // n PACKETS" + collapse chevron button.

Body: scrollable log list. Each log: `timestamp` (gray) + `tag` badge (green bg) + `[type]` (gray) + message. Auto-scroll to bottom on new entries; pause auto-scroll if user manually scrolls up (track with an `isUserScrolled` ref + scroll event listener).

"Awaiting next instruction..." amber blinking text at bottom when idle.

- [ ] **Step 4: Wire components into layout and page**

Update `app/(campaign)/layout.tsx` to render real `<CampaignSidebar />` and `<AgentStream />`.
Update `app/(campaign)/campaign/page.tsx` to render `<PipelineStepper />` with state from `useCampaignStore`.

- [ ] **Step 5: Verify visual**

Run: `npm run dev`, visit `/campaign`. Should see:
- Dark sidebar with task history
- Stepper with step 1 active (amber glow)
- Empty content area
- Agent stream at bottom (empty/idle)

- [ ] **Step 6: Commit**

```bash
git add components/campaign/ app/\(campaign\)/
git commit -m "feat(campaign): add PipelineStepper, CampaignSidebar, AgentStream"
```

---

## Task 4: Step 1 — Intent Configuration

**Files:**
- Create: `components/campaign/Step1Intent.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — render Step1Intent when currentStep=1

- [ ] **Step 1: Build Step1Intent**

Create `components/campaign/Step1Intent.tsx`.

Sections:
1. **Event type chips**: row of buttons for '618'/'double11'/'daily'/'clearance'/'custom'. Selected chip: indigo bg+border. Clicking a preset adjusts slider defaults (618: margin 40%, discount 7折; clearance: margin 15%, discount 5折; etc).

2. **Product context card**: read from `usePipelineStore` — `productInput`, `skill3` (daily price, beta, competitor range), inventory from `skillTesting`. Display as: product emoji + name + price/cost/margin + badge row (弹性 β, 竞品均价, 库存). Non-editable, informational only. Show "已融合 Skill 1~5 数据 ✓" if skill3 exists, otherwise "日常价未设定 — 将使用竞品均价参考".

3. **Two constraint sliders**: 
   - 目标毛利率: range 15-70, step 1, default depends on event type
   - 最大折扣力度: range 50-95 (representing 5折-95折), step 5, display as `{value/10}折`
   Use native `<input type="range">` styled with Tailwind (appearance-none, custom track/thumb with CSS). Show current value as large number to the right of slider label.

4. **Supplementary row**: 库存约束 (auto-calculated days = inventory / estimated daily sales) + 销量目标 (editable number input, default = historical daily × 3 × event days).

5. **CTA button**: "🚀 启动 AI 智能定价". On click: call `setCampaignIntent(...)` from campaign store which saves the form data and advances to step 2.

All of this uses the campaign store. Read existing skill data from `usePipelineStore` (read-only).

- [ ] **Step 2: Wire into page**

In `app/(campaign)/campaign/page.tsx`, add step routing: when `currentStep === 1`, render `<Step1Intent />`. Also add a top bar showing task name, status badge, step progress (n/6), and real-time hint.

- [ ] **Step 3: Test interaction**

Visit `/campaign`. Fill sliders, click "启动 AI 智能定价". Verify:
- Campaign store updates with intent data
- currentStep advances to 2
- Stepper updates (step 1 → green completed, step 2 → amber active)
- Agent stream shows intent parsing logs

- [ ] **Step 4: Commit**

```bash
git add components/campaign/Step1Intent.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 1 intent configuration"
```

---

## Task 5: Step 2 — Data Profile

**Files:**
- Create: `components/campaign/Step2DataProfile.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — add step 2 routing

- [ ] **Step 1: Build Step2DataProfile**

Create `components/campaign/Step2DataProfile.tsx`.

This step auto-runs on mount. It simulates data fetching with a timed sequence:

1. **Data source tags** (horizontal row): 近期销售 / 竞品价格 / 库存库龄 / 历史促销 / 价格弹性. Each starts gray, transitions to green ✓ one by one (500ms interval). Use `useState` + `useEffect` with sequential `setTimeout`.

2. **After all sources "loaded"**: show the data profile in a grid:
   - 近7天日均销量: number + trend arrow (from mock)
   - 竞品价格区间: min-max bar visualization
   - 库龄/库存: health indicator (green/yellow/red)
   - 历史促销效果: last event name + sales lift %

3. **Elasticity panel** (right side or below): shows method tag (DID/LGBM), β value, and a small MAE training curve. For the curve, use a simple Recharts LineChart (5-7 epoch points showing MAE decreasing from ~2.0 to ~1.4). Shows "Fitting causal model..." during animation, then "✅ 弹性估计完成 · 中位数: -1.80".

4. **Auto-advance**: after all animations complete (~3s total), automatically call `advanceStep()` to move to step 3. Show a brief "数据画像完成" success message before transitioning.

Throughout, `appendLog()` is called to stream entries to AgentStream.

- [ ] **Step 2: Wire into page and test**

Add step 2 routing. Test: after Step 1, should auto-animate through data loading, show profile, then auto-advance to Step 3.

- [ ] **Step 3: Commit**

```bash
git add components/campaign/Step2DataProfile.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 2 data profile with animation"
```

---

## Task 6: Step 3 — Pricing Optimization + ConvergenceChart

**Files:**
- Create: `components/campaign/ConvergenceChart.tsx`
- Create: `components/campaign/Step3Pricing.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — add step 3 routing

- [ ] **Step 1: Build ConvergenceChart**

Create `components/campaign/ConvergenceChart.tsx`. Props: `iterations: { round, price, margin, dailySales, gmv }[]`, `targetMargin: number`, `animatedCount: number` (how many iterations to show — for animation).

Dual-axis Recharts LineChart:
- Left Y-axis: GMV (green line, #4ade80)
- Right Y-axis: 毛利率% (amber line, #f59e0b)
- X-axis: price points from iterations
- ReferenceLine: horizontal dashed line at targetMargin
- Only show data points up to `animatedCount` (slice the data array)

Include formula display top-right: `L(p) = q(p) · p − λ(c/p − m₀)` in monospace.
Legend below chart: green circle "GMV" + amber circle "毛利率".

- [ ] **Step 2: Build Step3Pricing**

Create `components/campaign/Step3Pricing.tsx`. Two phases rendered sequentially:

**Phase A — Solving** (shown while `!pricing.converged`):
Left panel:
- Spinner + "约束优化求解中" + constraint text (target margin, discount floor, inventory)
- Iteration log: rows appended one by one (300ms interval). Each row: `迭代 n → price=¥x, 毛利 y%, 日销 z件, GMV ¥w`. Last row highlighted green with "← 收敛 ✓".
- Code-style execution line at bottom: `▶ 执行 策略方案生成(target_margin=..., max_change=...)`

Right panel:
- `<ConvergenceChart />` with `animatedCount` incrementing in sync with iteration log

Use `useEffect` + `setTimeout` chain to animate iterations. After last iteration, set `converged = true` in local state, call store's `runPricing()`.

**Phase B — Results** (shown after converged):
- Three-tier pricing cards (日常价 / 大促价 / 极限底价) in a 3-column grid. 大促价 card has indigo border + glow. Each shows: price, discount, margin %, daily sales estimate, note.
- Three profit scenarios (P10/P50/P90) in 3-column grid below. Each with colored left border (red/blue/green), label, daily sales, total profit, status note.
- "确认定价方案 → 进入风控审核" button. Calls `advanceStep()`.

Animate Phase B entrance with Framer Motion `AnimatePresence` fade-in.

- [ ] **Step 3: Wire into page and test**

Add step 3 routing. Test: iterations animate, chart builds up, results appear, can advance to step 4.

- [ ] **Step 4: Commit**

```bash
git add components/campaign/ConvergenceChart.tsx components/campaign/Step3Pricing.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 3 pricing with convergence chart"
```

---

## Task 7: Step 4 — Risk Review

**Files:**
- Create: `components/campaign/Step4RiskReview.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — add step 4 routing

- [ ] **Step 1: Build Step4RiskReview**

Create `components/campaign/Step4RiskReview.tsx`.

Sections:
1. **Risk summary bar**: colored badges — "通过 n" (green) / "预警 n" (amber) / "拦截 n" (red). Counts derived from mock riskReview.checks.

2. **Check items list**: each item is a row with:
   - Type badge: 通过 (green), 预警 (amber), 拦截 (red)
   - Check name + detail text
   - Action buttons (for warn/block): "采纳建议" (green) / "忽略" (gray outline). Clicking "采纳建议" marks the check as resolved. Clicking "忽略" also marks as resolved but with different visual.
   - Pass items: collapsed by default, expandable

3. **Price adjustment area** (optional): 
   - Shows current recommended price (from store's `confirmedPrice`)
   - "手动调整价格" input (number, with ¥ prefix)
   - Real-time calc: "调整后毛利率 x% / 预计日销 y件" (simple formula: margin = (price-68)/price, sales = baseSales * (1 + beta * (price-promoPrice)/promoPrice))

4. **Confirm button**: "确认定价方案 → 生成素材". Calls `confirmRiskReview(adjustedPrice)`. Disabled until all block items are resolved.

- [ ] **Step 2: Wire and test**

Add step 4 routing. Test: risk items display, can resolve blocks, can adjust price, confirm advances to step 5.

- [ ] **Step 3: Commit**

```bash
git add components/campaign/Step4RiskReview.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 4 risk review with manual adjustment"
```

---

## Task 8: Step 5 — Asset Generation + PhonePreview

**Files:**
- Create: `components/campaign/PhonePreview.tsx`
- Create: `components/campaign/Step5Assets.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — add step 5 routing

- [ ] **Step 1: Build PhonePreview**

Create `components/campaign/PhonePreview.tsx`. Props: `price: number`, `originalPrice: number`, `discount: string`, `productName: string`, `assets: AssetItem[]` (for conditional rendering of generated elements).

A 260px-wide phone frame (rounded-[28px], dark border, padding) containing:
1. Status bar (time, signal icons)
2. Taobao header (orange #ff4000, search bar, back arrow)
3. Main image area (gradient bg + product emoji placeholder + corner badge overlay for discount + bottom price overlay with ¥ price, strikethrough original, sales count)
4. Coupon bar (red coupon badges: 满199减30, 满299减60, 领券 button)
5. Product title (with 618 tag prefix)
6. Activity atmosphere banner (countdown timer: 3 red squares with colon separators, "到手价 ¥x · 限量 n 件")
7. Bottom action bar (立即购买 orange + 加入购物车 gradient)

Prices and discount labels derive from props. Assets conditionally show/hide elements (e.g., coupon bar only appears when coupon_overlay asset is done).

- [ ] **Step 2: Build Step5Assets**

Create `components/campaign/Step5Assets.tsx`. Left-right split layout.

**Left side (flex-1)**:
1. Sub-stepper: 4 dots with labels (解析方案 → 确认素材 → 生成中 → 预览确认). Steps 1-2 are auto-completed, step 3 active during generation.

2. Progress bar: "正在生成素材... 已完成 n/5 张" with percentage.

3. Asset card list: 5 items. Each card:
   - Thumbnail (52px square, gradient placeholder → mock image when done)
   - Type tag (colored dot + label: 活动主图/优惠券贴片/详情页头图/促销角标/短视频封面)
   - Title
   - 🔄 regenerate button (calls `regenerateAsset(id)`)
   - Quality score badge (number, green bg when done)
   - Generating state: spinner in thumbnail area, "生成中" badge

4. Animation: on mount, call `generateAssets()` which sequences each asset through pending→generating→done (800ms each). Agent stream logs each asset generation.

**Right side (320px)**:
- Title "📱 淘宝商品页预览"
- `<PhonePreview />` with props from store
- Footer: "已填充 n/5 个素材位" + hint text

After all assets done, show "全部生成完成 — n/5 张素材成功" success bar with "预览" and "确认并进入下一步" buttons.

- [ ] **Step 3: Wire and test**

Add step 5 routing. Test: assets generate sequentially, phone preview updates, can advance to step 6.

- [ ] **Step 4: Commit**

```bash
git add components/campaign/PhonePreview.tsx components/campaign/Step5Assets.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 5 asset generation with phone preview"
```

---

## Task 9: Step 6 — Deploy + Final Polish

**Files:**
- Create: `components/campaign/Step6Deploy.tsx`
- Modify: `app/(campaign)/campaign/page.tsx` — add step 6 routing

- [ ] **Step 1: Build Step6Deploy**

Create `components/campaign/Step6Deploy.tsx`.

Sections:
1. **Decision summary card** (green border, success bg):
   - Activity type + product name
   - Price row: 日常价 ¥169 → 大促价 ¥139 (8.2折, 毛利 51.1%)
   - Assets: n张已生成
   - Risk: 全部通过 / n项已处理

2. **Execution checklist** (timeline layout):
   5 items from mock `deployment.checklist`. Each: date badge (T-7, T-3, etc) + action text + checkbox. Checkboxes are interactive — user can check off items.

3. **Action buttons row**:
   - "保存至商品库" (green, primary): calls `deployCampaign()` then `usePipelineStore.saveCurrentProduct()`. Shows ✓ after save.
   - "下载素材包" (outline): placeholder, shows toast "功能开发中"
   - "分析下一个商品" (outline): navigates to `/`

- [ ] **Step 2: Wire, test full flow**

Add step 6 routing. Test the complete flow: Step 1 → 2 → 3 → 4 → 5 → 6. Verify:
- All step transitions work
- Stepper updates correctly at each stage
- Agent Stream accumulates logs throughout
- Step 6 save button works

- [ ] **Step 3: Commit**

```bash
git add components/campaign/Step6Deploy.tsx app/\(campaign\)/campaign/page.tsx
git commit -m "feat(campaign): implement Step 6 deploy and complete pipeline flow"
```

---

## Task 10: Sidebar Link + Entry Point

**Files:**
- Modify: `components/layout/Sidebar.tsx` — add campaign link
- Modify: `app/(main)/page.tsx` — add campaign entry (if appropriate)

- [ ] **Step 1: Add campaign link to existing Sidebar**

In `components/layout/Sidebar.tsx`, add a new section below the skills list:

```tsx
{/* Campaign entry */}
<div className="px-3 mt-2">
  <Link href="/campaign"
    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
      pathname === '/campaign' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
    )}>
    <span>🔥</span>
    <span>大促操盘</span>
  </Link>
</div>
```

- [ ] **Step 2: Test navigation**

Visit home page, click "大促操盘" in sidebar → should navigate to `/campaign` with campaign layout (different sidebar). Click browser back → should return to main layout.

- [ ] **Step 3: Final commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(campaign): add campaign entry link to main sidebar"
```

---

## Summary

| Task | Component | Est. Complexity |
|------|-----------|----------------|
| 1 | Types + Mock + Store | Medium |
| 2 | Route restructure | Medium (careful file moves) |
| 3 | Stepper + Sidebar + AgentStream | Medium |
| 4 | Step 1 Intent | Medium |
| 5 | Step 2 Data Profile | Low-Medium |
| 6 | Step 3 Pricing + Chart | High |
| 7 | Step 4 Risk Review | Medium |
| 8 | Step 5 Assets + PhonePreview | High |
| 9 | Step 6 Deploy | Low |
| 10 | Sidebar link | Low |

**Total: 10 tasks, ~40 steps**

Execute in order — each task depends on prior tasks being complete.
