import { runOpenAiImageEdit } from '@/lib/server/openai-image-edit'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string
      prompt?: string
      sourceImageUrl?: string
      sourceImageDataUrl?: string
      maskImageUrl?: string
      maskImageDataUrl?: string
      referenceImages?: Array<{
        label?: string
        imageUrl?: string
        imageDataUrl?: string
      }>
      model?: string
    }

    const prompt = body.prompt?.trim()
    if (!prompt) {
      return Response.json({ ok: false, error: 'missing prompt' }, { status: 400 })
    }
    if (!body.sourceImageUrl && !body.sourceImageDataUrl) {
      return Response.json({ ok: false, error: 'missing source image' }, { status: 400 })
    }

    const data = await runOpenAiImageEdit({ ...body, prompt })
    return Response.json(data, { status: data.ok ? 200 : 500 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
