# AI 选款测款 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the app from "browse 12 clusters" to "paste image → classify → get cluster insights → test → feedback loop" with trend cluster spawning from novel items.

**Architecture:** Single-image classification via OpenCLIP embedding + cosine similarity against cluster centroids (already built). Test feedback stored as append-only JSON files. Cluster stats aggregated in-memory and periodically persisted. Pending pool accumulates novel items; periodic HDBSCAN spawns trend clusters.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand 5, Tailwind 4, OpenCLIP (Python), shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-06-selection-testing-workflow-design.md`

**IMPORTANT:** This is Next.js 16 — APIs and conventions may differ from training data. Before writing any route handler or page, read the relevant guide in `node_modules/next/dist/docs/` first. Heed deprecation notices.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/classify-product.ts` | Core classification: cosine sim vs all centroids, top-3 clusters, novelty detection |
| `lib/cluster-stats.ts` | ClusterStats type, load/save JSON, percentile aggregation from feedback files |
| `lib/pending-pool.ts` | Pending pool: save novel embeddings, list, count, clear after spawn |
| `app/api/classify-product/route.ts` | POST endpoint: accept image URL or base64 → return classification result |
| `app/api/test-feedback/route.ts` | POST endpoint: accept test feedback → write to data/ → update stats |
| `app/api/trend-clusters/spawn/route.ts` | POST endpoint: trigger HDBSCAN on pending pool → create trend clusters |
| `lib/trend-clusters.json` | Initially `[]`, populated by trend cluster spawning |
| `lib/cluster-stats.json` | Initial anchor stats for 12 structural clusters |
| `data/test-feedback/.gitkeep` | Directory for feedback JSON files |
| `data/pending-embeddings/.gitkeep` | Directory for novel embedding JSON files |
| `lib/__tests__/classify-product.test.ts` | Tests for classification logic |
| `lib/__tests__/cluster-stats.test.ts` | Tests for stats aggregation |
| `lib/__tests__/pending-pool.test.ts` | Tests for pending pool |
| `vitest.config.ts` | Vitest configuration |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Add vitest dev dependency |
| `lib/types.ts` | Add `ClassifyResult`, `TestFeedback`, `ClusterStats`, `TrendCluster` types |
| `lib/store.ts` | Add classify result state, test tracking list, cluster stats loading |
| `app/page.tsx` | Replace chat UI with "paste image/URL" single input + classify flow |
| `app/skills/finder/page.tsx` | Add trend cluster tab, use cluster stats for display |
| `app/skills/testing/page.tsx` | Add feedback submission form + multi-product tracking |

---

## Task 1: Set Up Test Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    include: ['lib/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test script to package.json**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create test directory**

```bash
mkdir -p lib/__tests__
```

- [ ] **Step 5: Verify vitest runs**

```bash
npm test
```

Expected: "No test files found" (not an error, just empty).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/__tests__
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: Add New Types to `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`
- Test: `lib/__tests__/types-smoke.test.ts`

- [ ] **Step 1: Write smoke test verifying types compile**

Create `lib/__tests__/types-smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { ClassifyResult, TestFeedback, ClusterStats, TrendCluster } from '@/lib/types'

describe('new types exist and compile', () => {
  it('ClassifyResult has expected shape', () => {
    const result: ClassifyResult = {
      topClusters: [
        { clusterId: 0, clusterName: 'Test', clusterType: 'structural', similarity: 0.8, tier: 'A' },
      ],
      isNovelStyle: false,
      queryEmbedding: [0.1, 0.2],
    }
    expect(result.topClusters).toHaveLength(1)
    expect(result.isNovelStyle).toBe(false)
  })

  it('TestFeedback has expected shape', () => {
    const fb: TestFeedback = {
      id: 'fb-1',
      clusterId: 0,
      productImageEmbedding: [0.1],
      testMetrics: {
        daysListed: 7, ctr: 3.0, cvr: 1.0,
        addToCartRate: 6.0, favoriteRate: 3.5,
        unitsSold: 20, dailySpend: 80, avgPrice: 150,
      },
      verdict: 'scale',
      timestamp: '2026-04-06T00:00:00Z',
    }
    expect(fb.verdict).toBe('scale')
  })

  it('ClusterStats has expected shape', () => {
    const stats: ClusterStats = {
      clusterId: 0,
      sampleCount: 5,
      dataConfidence: 'early',
      metrics: {
        ctr: { p25: 2.0, p50: 3.0, p75: 4.5 },
        cvr: { p25: 0.5, p50: 0.8, p75: 1.2 },
        dailySales: { p25: 3, p50: 8, p75: 15 },
        scaleRate: 0.6,
        pivotRate: 0.4,
      },
      trend: 'rising',
      lastUpdated: '2026-04-06T00:00:00Z',
    }
    expect(stats.dataConfidence).toBe('early')
  })

  it('TrendCluster has expected shape', () => {
    const tc: TrendCluster = {
      clusterId: 100,
      type: 'trend',
      name: 'Emerging Y2K',
      centroidEmbedding: [0.1, 0.2],
      mosaicImages: [],
      sampleCount: 6,
      createdAt: '2026-04-06T00:00:00Z',
      status: 'active',
    }
    expect(tc.type).toBe('trend')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — types don't exist yet.

- [ ] **Step 3: Add types to `lib/types.ts`**

Append at the end of `lib/types.ts`:

```typescript
// ============================================================
// 选款归簇 + 数据闭环（MVP）
// ============================================================

export interface ClassifyClusterMatch {
  clusterId: number
  clusterName: string
  clusterType: 'structural' | 'trend'
  similarity: number
  tier: 'S' | 'A' | 'B'
}

export interface ClassifyResult {
  topClusters: ClassifyClusterMatch[]
  isNovelStyle: boolean
  /** 768-dim OpenCLIP embedding, kept for pending pool if novel */
  queryEmbedding: number[]
}

export interface TestFeedbackMetrics {
  daysListed: number
  ctr: number
  cvr: number
  addToCartRate: number
  favoriteRate: number
  unitsSold: number
  dailySpend: number
  avgPrice: number
}

export interface TestFeedback {
  id: string
  clusterId: number
  productImageEmbedding: number[]
  testMetrics: TestFeedbackMetrics
  verdict: 'scale' | 'optimize' | 'pivot'
  timestamp: string
}

export interface Percentiles {
  p25: number
  p50: number
  p75: number
}

export interface ClusterStats {
  clusterId: number
  sampleCount: number
  dataConfidence: 'ai' | 'early' | 'verified'
  metrics: {
    ctr: Percentiles
    cvr: Percentiles
    dailySales: Percentiles
    scaleRate: number
    pivotRate: number
  }
  trend: 'rising' | 'stable' | 'declining'
  lastUpdated: string
}

export interface TrendCluster {
  clusterId: number
  type: 'trend'
  name: string
  centroidEmbedding: number[]
  mosaicImages: string[]
  sampleCount: number
  createdAt: string
  status: 'active' | 'cooling'
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/__tests__/types-smoke.test.ts
git commit -m "feat: add ClassifyResult, TestFeedback, ClusterStats, TrendCluster types"
```

---

## Task 3: Core Classification Logic

**Files:**
- Create: `lib/classify-product.ts`
- Test: `lib/__tests__/classify-product.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/classify-product.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { classifyProduct, cosineSim, NOVELTY_THRESHOLD_DEFAULT } from '@/lib/classify-product'
import type { ClassifyClusterMatch } from '@/lib/types'

describe('cosineSim', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSim([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0.0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSim([1, 0], [-1, 0])).toBeCloseTo(-1.0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSim([], [])).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSim([1, 2], [1, 2, 3])).toBe(0)
  })
})

describe('classifyProduct', () => {
  // Build 3 fake clusters with known centroids
  const fakeClusters = [
    { clusterId: 0, name: 'Dresses', centroid: [1, 0, 0], tier: 'S' as const },
    { clusterId: 1, name: 'Tops', centroid: [0, 1, 0], tier: 'A' as const },
    { clusterId: 2, name: 'Pants', centroid: [0, 0, 1], tier: 'B' as const },
  ]

  it('returns best matching cluster first', () => {
    const result = classifyProduct({
      queryEmbedding: [0.9, 0.1, 0],
      clusters: fakeClusters,
    })
    expect(result.topClusters[0].clusterId).toBe(0)
    expect(result.topClusters[0].similarity).toBeGreaterThan(0.9)
    expect(result.isNovelStyle).toBe(false)
  })

  it('returns top-3 sorted by similarity descending', () => {
    const result = classifyProduct({
      queryEmbedding: [0.5, 0.5, 0.1],
      clusters: fakeClusters,
    })
    expect(result.topClusters).toHaveLength(3)
    const sims = result.topClusters.map(c => c.similarity)
    expect(sims[0]).toBeGreaterThanOrEqual(sims[1])
    expect(sims[1]).toBeGreaterThanOrEqual(sims[2])
  })

  it('marks novel style when all similarities below threshold', () => {
    // A vector far from all clusters
    const result = classifyProduct({
      queryEmbedding: [0.01, 0.01, 0.01],
      clusters: fakeClusters,
      noveltyThreshold: 0.99, // artificially high threshold
    })
    expect(result.isNovelStyle).toBe(true)
  })

  it('preserves queryEmbedding in result', () => {
    const emb = [0.5, 0.5, 0]
    const result = classifyProduct({
      queryEmbedding: emb,
      clusters: fakeClusters,
    })
    expect(result.queryEmbedding).toEqual(emb)
  })

  it('handles empty clusters array', () => {
    const result = classifyProduct({
      queryEmbedding: [1, 0, 0],
      clusters: [],
    })
    expect(result.topClusters).toHaveLength(0)
    expect(result.isNovelStyle).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `lib/classify-product.ts`**

First, export the existing `cosineSim` from `lib/finder-cluster-rank.ts` by adding `export` to line 47:
```typescript
export function cosineSim(a: number[], b: number[]): number {
```

Then create `lib/classify-product.ts`, importing from `finder-cluster-rank`:

```typescript
import type { ClassifyResult, ClassifyClusterMatch } from '@/lib/types'
import { cosineSim } from '@/lib/finder-cluster-rank'

export { cosineSim } from '@/lib/finder-cluster-rank'

export const NOVELTY_THRESHOLD_DEFAULT = 0.45

export interface ClassifiableCluster {
  clusterId: number
  name: string
  centroid: number[]
  tier: 'S' | 'A' | 'B'
}

export function classifyProduct(params: {
  queryEmbedding: number[]
  clusters: ClassifiableCluster[]
  noveltyThreshold?: number
  topK?: number
}): ClassifyResult {
  const {
    queryEmbedding,
    clusters,
    noveltyThreshold = NOVELTY_THRESHOLD_DEFAULT,
    topK = 3,
  } = params

  if (clusters.length === 0) {
    return { topClusters: [], isNovelStyle: true, queryEmbedding }
  }

  const scored: ClassifyClusterMatch[] = clusters.map((c) => ({
    clusterId: c.clusterId,
    clusterName: c.name,
    clusterType: 'structural' as const,
    similarity: cosineSim(queryEmbedding, c.centroid),
    tier: c.tier,
  }))

  scored.sort((a, b) => b.similarity - a.similarity)

  const topClusters = scored.slice(0, topK)
  const maxSim = topClusters[0]?.similarity ?? 0
  const isNovelStyle = maxSim < noveltyThreshold

  return { topClusters, isNovelStyle, queryEmbedding }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/classify-product.ts lib/__tests__/classify-product.test.ts
git commit -m "feat: add core product classification logic with cosine similarity"
```

---

## Task 4: Cluster Stats Module

**Files:**
- Create: `lib/cluster-stats.ts`
- Create: `lib/cluster-stats.json`
- Test: `lib/__tests__/cluster-stats.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/cluster-stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  computePercentiles,
  aggregateFeedbackToStats,
  resolveConfidence,
} from '@/lib/cluster-stats'
import type { TestFeedback } from '@/lib/types'

describe('computePercentiles', () => {
  it('returns correct p25/p50/p75 for sorted array', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = computePercentiles(values)
    expect(result.p25).toBeCloseTo(3.25)
    expect(result.p50).toBeCloseTo(5.5)
    expect(result.p75).toBeCloseTo(7.75)
  })

  it('handles single value', () => {
    const result = computePercentiles([5])
    expect(result.p25).toBe(5)
    expect(result.p50).toBe(5)
    expect(result.p75).toBe(5)
  })

  it('handles empty array', () => {
    const result = computePercentiles([])
    expect(result.p25).toBe(0)
    expect(result.p50).toBe(0)
    expect(result.p75).toBe(0)
  })
})

describe('resolveConfidence', () => {
  it('returns ai for 0 samples', () => {
    expect(resolveConfidence(0)).toBe('ai')
  })
  it('returns early for 1-9 samples', () => {
    expect(resolveConfidence(5)).toBe('early')
  })
  it('returns verified for 10+ samples', () => {
    expect(resolveConfidence(15)).toBe('verified')
  })
})

describe('aggregateFeedbackToStats', () => {
  const makeFb = (clusterId: number, ctr: number, cvr: number, sales: number, verdict: 'scale' | 'pivot'): TestFeedback => ({
    id: `fb-${Math.random()}`,
    clusterId,
    productImageEmbedding: [],
    testMetrics: {
      daysListed: 7, ctr, cvr,
      addToCartRate: 5, favoriteRate: 3,
      unitsSold: sales * 7, dailySpend: 80, avgPrice: 150,
    },
    verdict,
    timestamp: new Date().toISOString(),
  })

  it('aggregates multiple feedbacks for one cluster', () => {
    const feedbacks = [
      makeFb(0, 3.0, 1.0, 10, 'scale'),
      makeFb(0, 4.0, 1.5, 15, 'scale'),
      makeFb(0, 2.0, 0.5, 5, 'pivot'),
    ]
    const stats = aggregateFeedbackToStats(0, feedbacks)
    expect(stats.sampleCount).toBe(3)
    expect(stats.dataConfidence).toBe('early') // 3 >= 1 → early
    expect(stats.metrics.scaleRate).toBeCloseTo(2 / 3)
    expect(stats.metrics.pivotRate).toBeCloseTo(1 / 3)
  })

  it('returns zero stats for empty feedbacks', () => {
    const stats = aggregateFeedbackToStats(0, [])
    expect(stats.sampleCount).toBe(0)
    expect(stats.dataConfidence).toBe('ai')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `lib/cluster-stats.ts`**

```typescript
import type { ClusterStats, Percentiles, TestFeedback } from '@/lib/types'

export function computePercentiles(values: number[]): Percentiles {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 1) return { p25: sorted[0], p50: sorted[0], p75: sorted[0] }

  const interp = (p: number) => {
    const idx = p * (n - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    const frac = idx - lo
    return sorted[lo] + frac * (sorted[hi] - sorted[lo])
  }

  return { p25: interp(0.25), p50: interp(0.5), p75: interp(0.75) }
}

export function resolveConfidence(sampleCount: number): ClusterStats['dataConfidence'] {
  if (sampleCount >= 10) return 'verified'
  if (sampleCount >= 1) return 'early'
  return 'ai'
}

export function aggregateFeedbackToStats(
  clusterId: number,
  feedbacks: TestFeedback[],
): ClusterStats {
  const relevant = feedbacks.filter((f) => f.clusterId === clusterId)
  const n = relevant.length

  if (n === 0) {
    return {
      clusterId,
      sampleCount: 0,
      dataConfidence: 'ai',
      metrics: {
        ctr: { p25: 0, p50: 0, p75: 0 },
        cvr: { p25: 0, p50: 0, p75: 0 },
        dailySales: { p25: 0, p50: 0, p75: 0 },
        scaleRate: 0,
        pivotRate: 0,
      },
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    }
  }

  const ctrs = relevant.map((f) => f.testMetrics.ctr)
  const cvrs = relevant.map((f) => f.testMetrics.cvr)
  const dailySales = relevant.map((f) => {
    const days = Math.max(1, f.testMetrics.daysListed)
    return f.testMetrics.unitsSold / days
  })

  const scaleCount = relevant.filter((f) => f.verdict === 'scale').length
  const pivotCount = relevant.filter((f) => f.verdict === 'pivot').length
  const optimizeCount = relevant.filter((f) => f.verdict === 'optimize').length
  const verdictTotal = n || 1 // use total sample count, not just scale+pivot

  return {
    clusterId,
    sampleCount: n,
    dataConfidence: resolveConfidence(n),
    metrics: {
      ctr: computePercentiles(ctrs),
      cvr: computePercentiles(cvrs),
      dailySales: computePercentiles(dailySales),
      scaleRate: scaleCount / verdictTotal,
      pivotRate: pivotCount / verdictTotal,
    },
    trend: 'stable', // TODO: compute from timestamp series when enough data
    lastUpdated: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: ALL PASS.

- [ ] **Step 5: Create initial `lib/cluster-stats.json` with anchor data**

Create `lib/cluster-stats.json`. To generate the anchor data, read the existing 12 clusters from `lib/cluster-data.json` and create initial stats with `dataConfidence: 'ai'`. The format is an array of `ClusterStats` objects. For each cluster, use the existing `avgSales` from cluster-data as the baseline for `dailySales` percentiles, and set `ctr`/`cvr` to industry averages.

```json
[]
```

(Start empty — the aggregation logic will compute stats from feedback. Anchor data for cold-start display will be derived from `cluster-data.json` existing fields in the UI layer, not duplicated here.)

- [ ] **Step 6: Commit**

```bash
git add lib/cluster-stats.ts lib/cluster-stats.json lib/__tests__/cluster-stats.test.ts
git commit -m "feat: add cluster stats aggregation with percentile computation"
```

---

## Task 5: Pending Pool Module

**Files:**
- Create: `lib/pending-pool.ts`
- Test: `lib/__tests__/pending-pool.test.ts`
- Create: `data/pending-embeddings/.gitkeep`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/pending-pool.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PendingItem,
  formatPendingFilename,
  parsePendingItem,
} from '@/lib/pending-pool'

describe('formatPendingFilename', () => {
  it('includes timestamp and id', () => {
    const name = formatPendingFilename('abc-123', 1712400000000)
    expect(name).toBe('1712400000000-abc-123.json')
  })
})

describe('parsePendingItem', () => {
  it('round-trips a pending item', () => {
    const item: PendingItem = {
      id: 'p-1',
      embedding: [0.1, 0.2, 0.3],
      source: 'user-upload',
      imageUrl: 'https://example.com/img.jpg',
      timestamp: '2026-04-06T00:00:00Z',
    }
    const json = JSON.stringify(item)
    const parsed = parsePendingItem(json)
    expect(parsed).toEqual(item)
  })

  it('returns null for invalid JSON', () => {
    expect(parsePendingItem('not json')).toBeNull()
  })

  it('returns null if embedding is missing', () => {
    expect(parsePendingItem(JSON.stringify({ id: 'x' }))).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: Implement `lib/pending-pool.ts`**

```typescript
export interface PendingItem {
  id: string
  embedding: number[]
  source: 'user-upload' | 'cross-border-import'
  imageUrl?: string
  timestamp: string
}

export function formatPendingFilename(id: string, timestampMs: number): string {
  return `${timestampMs}-${id}.json`
}

export function parsePendingItem(json: string): PendingItem | null {
  try {
    const obj = JSON.parse(json)
    if (!obj || !Array.isArray(obj.embedding) || obj.embedding.length === 0) {
      return null
    }
    return obj as PendingItem
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: ALL PASS.

- [ ] **Step 5: Create data directories**

```bash
mkdir -p data/test-feedback data/pending-embeddings
touch data/test-feedback/.gitkeep data/pending-embeddings/.gitkeep
```

- [ ] **Step 5b: Add .gitignore entries for runtime data files**

Append to `.gitignore`:

```
# Runtime data files (only .gitkeep is tracked)
data/test-feedback/*.json
data/pending-embeddings/*.json
```

- [ ] **Step 6: Commit**

```bash
git add lib/pending-pool.ts lib/__tests__/pending-pool.test.ts data/
git commit -m "feat: add pending pool module for novel style accumulation"
```

---

## Task 6: Classify Product API Route

**Files:**
- Create: `app/api/classify-product/route.ts`
- Modify: (reads existing `lib/cluster-data.json`, `lib/trend-clusters.json`)

**Important:** Before writing this route, read `node_modules/next/dist/docs/` for the Next.js 16 route handler API. The existing `app/api/embed-query-image/route.ts` shows the current pattern.

- [ ] **Step 1: Create `lib/trend-clusters.json` initial empty file**

```json
[]
```

- [ ] **Step 2: Implement the API route**

Create `app/api/classify-product/route.ts`. This route:
1. Accepts `{ imageUrl: string }` or `{ imageBase64: string }`
2. Calls the existing `/api/embed-query-image` endpoint internally (or reuses its Python script logic) to get the 768-dim embedding
3. Loads structural clusters from `lib/cluster-data.json` (centroidEmbedding field)
4. Loads trend clusters from `lib/trend-clusters.json`
5. Runs `classifyProduct()` against combined cluster list
6. If `isNovelStyle`, writes embedding to `data/pending-embeddings/`
7. Returns `ClassifyResult`

```typescript
import { classifyProduct } from '@/lib/classify-product'
import type { ClassifiableCluster } from '@/lib/classify-product'
import type { ClusterDataRow } from '@/lib/cluster-data-types'
import type { TrendCluster } from '@/lib/types'
import { formatPendingFilename } from '@/lib/pending-pool'
import type { PendingItem } from '@/lib/pending-pool'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { resolveClusterModelOutput } from '@/lib/finder-cluster-model'
import { buildSkill1FromClusterData } from '@/lib/cluster-to-skill1'

export const runtime = 'nodejs'

async function getEmbedding(imageUrl: string): Promise<number[] | null> {
  // Reuse the embed-query-image logic by calling it as internal fetch
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/embed-query-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.ok || !Array.isArray(data.embedding)) return null
  return data.embedding
}

function loadStructuralClusters(): ClassifiableCluster[] {
  // Use dynamic import for ESM compatibility in Next.js 16 App Router
  // At module level, pre-import the JSON:
  // import rawClusters from '@/lib/cluster-data.json'
  // For now, use require() which works in Node.js runtime routes
  const raw: ClusterDataRow[] = require('@/lib/cluster-data.json')
  const skill1 = buildSkill1FromClusterData(raw)

  return raw
    .filter((r) => Array.isArray(r.centroidEmbedding) && r.centroidEmbedding.length > 0)
    .map((r) => {
      const resolved = resolveClusterModelOutput(skill1, {
        styleId: r.styleId,
        name: r.name,
        emoji: r.emoji,
        cnDesc: r.cnDesc,
        demandGrowth: r.demandGrowth,
        demandPct: r.demandPct,
        competition: r.competition,
        insight: r.insight,
        mosaicImgs: r.mosaicImages,
        hotCount: r.hotCount,
        avgSales: r.avgSales,
        centroidEmbedding: r.centroidEmbedding,
        competitors: r.competitors,
      })
      return {
        clusterId: r.clusterId,
        name: r.name,
        centroid: r.centroidEmbedding!,
        tier: resolved.tier,
      }
    })
}

function loadTrendClusters(): ClassifiableCluster[] {
  try {
    const raw: TrendCluster[] = require('@/lib/trend-clusters.json')
    return raw
      .filter((t) => t.status === 'active' && t.centroidEmbedding.length > 0)
      .map((t) => ({
        clusterId: t.clusterId,
        name: t.name,
        centroid: t.centroidEmbedding,
        tier: 'B' as const, // trend clusters start at B until data proves otherwise
      }))
  } catch {
    return []
  }
}

async function saveToPendingPool(embedding: number[], imageUrl?: string) {
  const dir = join(process.cwd(), 'data', 'pending-embeddings')
  await mkdir(dir, { recursive: true })
  const id = randomUUID()
  const item: PendingItem = {
    id,
    embedding,
    source: 'user-upload',
    imageUrl,
    timestamp: new Date().toISOString(),
  }
  const filename = formatPendingFilename(id, Date.now())
  await writeFile(join(dir, filename), JSON.stringify(item))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const imageUrl = body.imageUrl?.trim()

    if (!imageUrl) {
      return Response.json({ ok: false, error: 'missing imageUrl' }, { status: 400 })
    }

    const embedding = await getEmbedding(imageUrl)
    if (!embedding) {
      return Response.json(
        { ok: false, error: 'embedding failed — Python/OpenCLIP may not be available. Try uploading the image directly.' },
        { status: 502 },
      )
    }

    const structural = loadStructuralClusters()
    const trend = loadTrendClusters()
    const allClusters = [...structural, ...trend]

    const result = classifyProduct({ queryEmbedding: embedding, clusters: allClusters })

    // Mark trend clusters in result
    const trendIds = new Set(trend.map((t) => t.clusterId))
    for (const match of result.topClusters) {
      if (trendIds.has(match.clusterId)) {
        match.clusterType = 'trend'
      }
    }

    if (result.isNovelStyle) {
      await saveToPendingPool(embedding, imageUrl)
    }

    return Response.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Fix any type errors. The `require()` calls may need adjustment for Next.js 16 — check if dynamic `import()` is preferred.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/classify-product \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400"}'
```

Expected: JSON with `topClusters` array (or `embedding failed` if Python not available — that's OK).

- [ ] **Step 5: Commit**

```bash
git add app/api/classify-product/route.ts lib/trend-clusters.json
git commit -m "feat: add classify-product API endpoint"
```

---

## Task 7: Test Feedback API Route

**Files:**
- Create: `app/api/test-feedback/route.ts`

- [ ] **Step 1: Implement the API route**

Create `app/api/test-feedback/route.ts`:

```typescript
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { TestFeedback } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const feedback: TestFeedback = {
      id: randomUUID(),
      clusterId: body.clusterId,
      productImageEmbedding: body.productImageEmbedding ?? [],
      testMetrics: {
        daysListed: Number(body.daysListed) || 7,
        ctr: Number(body.ctr) || 0,
        cvr: Number(body.cvr) || 0,
        addToCartRate: Number(body.addToCartRate) || 0,
        favoriteRate: Number(body.favoriteRate) || 0,
        unitsSold: Number(body.unitsSold) || 0,
        dailySpend: Number(body.dailySpend) || 0,
        avgPrice: Number(body.avgPrice) || 0,
      },
      verdict: ['scale', 'optimize', 'pivot'].includes(body.verdict) ? body.verdict : 'pivot',
      timestamp: new Date().toISOString(),
    }

    const dir = join(process.cwd(), 'data', 'test-feedback')
    await mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${feedback.id}.json`
    await writeFile(join(dir, filename), JSON.stringify(feedback, null, 2))

    return Response.json({ ok: true, feedbackId: feedback.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Manual smoke test**

```bash
curl -X POST http://localhost:3000/api/test-feedback \
  -H 'Content-Type: application/json' \
  -d '{"clusterId":0,"ctr":3.5,"cvr":1.2,"daysListed":7,"unitsSold":25,"dailySpend":80,"avgPrice":150,"addToCartRate":7,"favoriteRate":4,"verdict":"scale"}'
```

Expected: `{ "ok": true, "feedbackId": "..." }`
Verify file exists: `ls data/test-feedback/`

- [ ] **Step 3: Commit**

```bash
git add app/api/test-feedback/route.ts
git commit -m "feat: add test feedback API with append-only file storage"
```

---

## Task 8: Trend Cluster Spawn API Route

**Files:**
- Create: `app/api/trend-clusters/spawn/route.ts`

This route reads all pending embeddings, runs a simple distance-based clustering (since HDBSCAN requires Python, we do a JS-side approximation for MVP or shell out to Python), and writes discovered clusters to `lib/trend-clusters.json`.

- [ ] **Step 1: Implement JS-side simple clustering for MVP**

For MVP, implement a greedy centroid-based clustering in JS (no HDBSCAN dependency). The full HDBSCAN pipeline exists in Python (`scripts/build_cluster_data.py`) and can be called as a follow-up enhancement.

Create `app/api/trend-clusters/spawn/route.ts`:

```typescript
import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { cosineSim } from '@/lib/classify-product'
import { parsePendingItem } from '@/lib/pending-pool'
import type { PendingItem } from '@/lib/pending-pool'
import type { TrendCluster } from '@/lib/types'

export const runtime = 'nodejs'

const MIN_CLUSTER_SIZE = 5
const CLUSTER_SIM_THRESHOLD = 0.65

function meanEmbedding(items: PendingItem[]): number[] {
  if (items.length === 0) return []
  const dim = items[0].embedding.length
  const mean = new Array(dim).fill(0)
  for (const item of items) {
    for (let i = 0; i < dim; i++) {
      mean[i] += item.embedding[i]
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= items.length
  }
  return mean
}

/** Greedy single-linkage clustering: assign each item to nearest existing cluster or start new */
function greedyCluster(items: PendingItem[]): PendingItem[][] {
  const clusters: PendingItem[][] = []
  const centroids: number[][] = []

  for (const item of items) {
    let bestIdx = -1
    let bestSim = -1
    for (let i = 0; i < centroids.length; i++) {
      const sim = cosineSim(item.embedding, centroids[i])
      if (sim > bestSim) {
        bestSim = sim
        bestIdx = i
      }
    }
    if (bestSim >= CLUSTER_SIM_THRESHOLD && bestIdx >= 0) {
      clusters[bestIdx].push(item)
      // Update centroid as running mean
      centroids[bestIdx] = meanEmbedding(clusters[bestIdx])
    } else {
      clusters.push([item])
      centroids.push([...item.embedding])
    }
  }
  return clusters
}

export async function POST() {
  try {
    const pendingDir = join(process.cwd(), 'data', 'pending-embeddings')
    await mkdir(pendingDir, { recursive: true })

    const files = await readdir(pendingDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    if (jsonFiles.length < MIN_CLUSTER_SIZE) {
      return Response.json({
        ok: true,
        message: `Only ${jsonFiles.length} pending items, need ${MIN_CLUSTER_SIZE} to attempt clustering`,
        clustersSpawned: 0,
      })
    }

    // Load all pending items
    const items: PendingItem[] = []
    for (const file of jsonFiles) {
      const content = await readFile(join(pendingDir, file), 'utf-8')
      const item = parsePendingItem(content)
      if (item) items.push(item)
    }

    if (items.length < MIN_CLUSTER_SIZE) {
      return Response.json({ ok: true, message: 'Not enough valid items', clustersSpawned: 0 })
    }

    // Run greedy clustering
    const groups = greedyCluster(items)

    // Load existing trend clusters
    const trendPath = join(process.cwd(), 'lib', 'trend-clusters.json')
    let existing: TrendCluster[] = []
    try {
      existing = JSON.parse(await readFile(trendPath, 'utf-8'))
    } catch { /* empty */ }

    const maxId = Math.max(999, ...existing.map((t) => t.clusterId))
    const newClusters: TrendCluster[] = []
    const consumedItemIds = new Set<string>()

    for (const group of groups) {
      if (group.length < MIN_CLUSTER_SIZE) continue

      const centroid = meanEmbedding(group)
      const tc: TrendCluster = {
        clusterId: maxId + newClusters.length + 1,
        type: 'trend',
        name: `新兴趋势 #${maxId + newClusters.length + 1}`,
        centroidEmbedding: centroid,
        mosaicImages: group.slice(0, 6).map((g) => g.imageUrl ?? '').filter(Boolean),
        sampleCount: group.length,
        createdAt: new Date().toISOString(),
        status: 'active',
      }
      newClusters.push(tc)
      for (const item of group) consumedItemIds.add(item.id)
    }

    // Write updated trend clusters
    const updated = [...existing, ...newClusters]
    await writeFile(trendPath, JSON.stringify(updated, null, 2))

    // Remove consumed items from pending pool
    for (const file of jsonFiles) {
      const content = await readFile(join(pendingDir, file), 'utf-8')
      const item = parsePendingItem(content)
      if (item && consumedItemIds.has(item.id)) {
        await unlink(join(pendingDir, file))
      }
    }

    return Response.json({
      ok: true,
      clustersSpawned: newClusters.length,
      newClusterIds: newClusters.map((c) => c.clusterId),
      remainingPending: items.length - consumedItemIds.size,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/trend-clusters/spawn/route.ts
git commit -m "feat: add trend cluster spawning from pending pool"
```

---

## Task 9: Update Home Page — Paste Image Entry

**Files:**
- Modify: `app/page.tsx` (580 lines → significant rewrite)

This is the biggest UI change. The current home page is a chat-based NLP intent parser. Replace the primary flow with a "paste image/URL" input that calls `/api/classify-product` and navigates to the finder page with the classification result.

- [ ] **Step 1: Add classification state to store**

Modify `lib/store.ts` — add:

```typescript
import type { ClassifyResult } from './types'

// In the PipelineStore interface, add:
classifyResult?: ClassifyResult
setClassifyResult: (result: ClassifyResult) => void

// In the create() body, add:
setClassifyResult: (result) => set({ classifyResult: result }),
```

Also add `classifyResult` to the `initialSession` reset and to `reset()`.

- [ ] **Step 2: Modify home page to add "paste image" section above chat**

In `app/page.tsx`, add a new section at the top of the page (above the existing chat interface) with:
- An image upload area (drag & drop or click)
- A URL input field
- A "分析这个款" (Analyze this style) button
- Loading state with progress indicator
- On success: navigate to `/skills/finder` with classify result stored in Zustand

Keep the existing chat interface below as a secondary entry path. The key is not to delete the existing functionality, but to add a prominent new primary flow above it.

The implementation should:
1. Read the existing `app/page.tsx` fully before modifying
2. Add a `ClassifySection` component at the top
3. Use `fetch('/api/classify-product', ...)` on submit
4. Store result via `setClassifyResult()`
5. Navigate to finder page via `router.push('/skills/finder')`

This is a UI task — exact code depends on the current page structure. The implementor should read the full 580-line file and add the new section at the top.

- [ ] **Step 3: Verify the dev server shows the new UI**

```bash
npm run dev
```

Open `http://localhost:3000` and verify the paste-image section appears above the chat.

- [ ] **Step 4: Commit**

```bash
git add lib/store.ts app/page.tsx
git commit -m "feat: add paste-image classification entry on home page"
```

---

## Task 10: Update Finder Page — Show Classification Result + SOP Wiring

**Files:**
- Modify: `app/skills/finder/page.tsx` (1779 lines)

This is the second biggest UI change. When a `classifyResult` exists in the store, the finder page should:
1. Show the classification result prominently at the top (matched cluster, similarity score, tier)
2. Auto-select the best-matching cluster in the workbench
3. Show cluster stats (from `lib/cluster-stats.json` or computed from feedbacks) with confidence labels
4. Add a "趋势簇" tab alongside structural clusters
5. **Verify TestPlan SOP generation still works** in the new flow — when user selects a cluster and clicks "开始测款", the SOP (SKU roles, observation windows, budget hints, stop rules from `finder-cluster-model.ts`) must still display correctly. The existing `testPlan` field on `StyleCluster` is the source.

The implementor should:
1. Read the full 1779-line file before modifying
2. Add a `ClassifyResultBanner` component at the top of the workbench tab
3. Modify the cluster list to include trend clusters from `lib/trend-clusters.json`
4. Add confidence badge (AI 分析 / 早期数据 / 群体验证) based on cluster stats

- [ ] **Step 1: Read the finder page fully and understand the tab structure**

The page has tabs: workbench, market, playbook, extend, model, chat. The workbench tab has a 3-step flow. Modifications go primarily in the workbench tab.

- [ ] **Step 2: Add ClassifyResultBanner component**

At the top of the workbench tab, if `classifyResult` exists in store, show:
- Matched cluster name + similarity percentage
- S/A/B tier badge
- "新趋势" badge if `clusterType === 'trend'`
- Confidence label based on cluster stats
- "这个分析准确吗？" thumbs up/down feedback

- [ ] **Step 3: Load and display trend clusters**

Add trend clusters from `lib/trend-clusters.json` to the cluster list. Tag them with a visual indicator.

- [ ] **Step 4: Verify in dev server**

Navigate to finder page after classifying an image — the banner should appear.

- [ ] **Step 5: Commit**

```bash
git add app/skills/finder/page.tsx
git commit -m "feat: show classification result and trend clusters on finder page"
```

---

## Task 11: Update Testing Page — Feedback Submission

**Files:**
- Modify: `app/skills/testing/page.tsx` (493 lines)

Add feedback submission to the existing testing page. After the user gets their test verdict (scale/pivot), add a "提交测款数据到群体统计" button that:
1. Calls `POST /api/test-feedback` with the test metrics + cluster ID + verdict
2. Shows confirmation
3. Displays "你在这个簇里排第 X 名" based on cluster stats

- [ ] **Step 1: Read the testing page fully**

Understand the `PageState` flow: `form → loading → done`. The feedback submission goes in the `done` state.

- [ ] **Step 2: Add feedback submission section in `done` state**

After the existing verdict display, add:
- "提交到群体统计" button
- On click: `fetch('/api/test-feedback', ...)` with current test data
- Success state: "已提交！你在 [簇名] 簇里排第 X 名"
- The cluster ID comes from `selectedStyle` in the store

- [ ] **Step 3: Verify the feedback flow**

1. Go through the full flow: home → finder → select cluster → testing → fill form → submit
2. After verdict, click "提交到群体统计"
3. Verify file appears in `data/test-feedback/`

- [ ] **Step 4: Commit**

```bash
git add app/skills/testing/page.tsx
git commit -m "feat: add test feedback submission to testing page"
```

---

## Task 12: Integration Smoke Test

**Files:** None new — verify the full flow works end-to-end.

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: ALL PASS

- [ ] **Step 2: Run the full user journey manually**

1. `npm run dev`
2. Open home page → paste an image URL → click "分析这个款"
3. Verify classification result appears → navigate to finder
4. Verify the matched cluster is highlighted with tier badge
5. Select the cluster → go to testing page
6. Fill test metrics → submit → get verdict
7. Click "提交到群体统计" → verify feedback file created

- [ ] **Step 3: Verify trend cluster spawning**

1. Submit 5+ images that don't match any existing cluster (use images of accessories, bags, etc.)
2. Call the spawn endpoint: `curl -X POST http://localhost:3000/api/trend-clusters/spawn`
3. Verify `lib/trend-clusters.json` has a new cluster
4. Verify the new trend cluster appears in the finder page

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit**

Only commit specific files that were changed — do not use `git add -A`. Review `git status` first.

```bash
git status
git add <specific changed files>
git commit -m "test: verify full MVP flow — classify → insights → test → feedback → trend spawn"
```

---

## Summary

| Task | What | Estimated Complexity |
|------|------|---------------------|
| 1 | Vitest setup | Small |
| 2 | New types | Small |
| 3 | Classification logic | Small (pure function) |
| 4 | Cluster stats | Small (pure function) |
| 5 | Pending pool | Small (pure function) |
| 6 | Classify API route | Medium (wires together existing code) |
| 7 | Feedback API route | Small |
| 8 | Trend spawn API route | Medium (JS clustering) |
| 9 | Home page UI | Medium-Large (significant rewrite) |
| 10 | Finder page UI | Large (1779-line file, careful modification) |
| 11 | Testing page UI | Small-Medium |
| 12 | Integration test | Small (manual verification) |

Tasks 1-8 are backend/logic and can proceed rapidly. Tasks 9-11 are UI and require careful reading of large existing files. Task 12 is verification.
