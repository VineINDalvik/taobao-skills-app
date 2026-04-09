import { openAiJson } from '@/lib/server/openai'

type EditReferenceImage = {
  label?: string
  imageUrl?: string
  imageDataUrl?: string
}

type EditPayload = {
  prompt: string
  sourceImageUrl?: string
  sourceImageDataUrl?: string
  maskImageUrl?: string
  maskImageDataUrl?: string
  referenceImages?: EditReferenceImage[]
  model?: string
  apiKey?: string
}

type OpenAiImagesEditResponse = {
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
    url?: string
  }>
  usage?: unknown
}

function pickImageUrl(url?: string, dataUrl?: string): string | undefined {
  return (dataUrl?.trim() || url?.trim() || undefined)
}

export async function runOpenAiImageEdit(payload: EditPayload) {
  const source = pickImageUrl(payload.sourceImageUrl, payload.sourceImageDataUrl)
  if (!source) throw new Error('missing source image')

  const images = [
    { image_url: source },
    ...((payload.referenceImages ?? [])
      .map((item) => pickImageUrl(item.imageUrl, item.imageDataUrl))
      .filter(Boolean)
      .map((imageUrl) => ({ image_url: imageUrl as string }))),
  ]

  const mask = pickImageUrl(payload.maskImageUrl, payload.maskImageDataUrl)
  const model = payload.model?.trim() || 'gpt-image-1'
  const isMini = model.endsWith('-mini')
  const data = await openAiJson<OpenAiImagesEditResponse>('/v1/images/edits', {
    model,
    images,
    mask: mask ? { image_url: mask } : undefined,
    prompt: payload.prompt,
    ...(!isMini && { input_fidelity: 'high' }),
    quality: isMini ? 'low' : 'medium',
    size: '1024x1536',
    output_format: 'png',
    background: 'opaque',
    moderation: 'auto',
    n: 1,
  }, payload.apiKey)

  const first = data.data?.[0]
  const imageDataUrl = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null

  return {
    ok: Boolean(imageDataUrl),
    imageDataUrl,
    text: first?.revised_prompt || '',
    model,
    usage: data.usage ?? null,
  }
}
