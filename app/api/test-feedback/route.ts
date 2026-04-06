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
