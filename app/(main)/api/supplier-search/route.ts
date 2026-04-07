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
    return Response.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const imageUrl = body?.imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json(
        { ok: false, error: 'imageUrl is required' },
        { status: 400 },
      )
    }

    const results = await searchSuppliersByImage(imageUrl)
    return Response.json({ ok: true, results })
  } catch (err) {
    console.error('[supplier-search] route error:', err)
    return Response.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
