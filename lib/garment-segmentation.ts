/**
 * 延伸设计 · 前景蒙版（仅对服装/主体做换色、图案，避免背景被一起改掉）
 *
 * 使用 @imgly/background-removal：浏览器端 ONNX（ISNet 系，与 U²-Net 同类语义分割思路），
 * 比 Grounding DINO / SegFormer 全量部署轻得多，适合 Demo 与中小图。
 *
 * 电商主图里「前景」多为模特或平铺服装，抠背景得到的 alpha 即用作 CSS mask。
 * 若需像素级「只衣服不含肤」可后续接服务端专用服饰分割（如 SegFormer-B0 fine-tune）。
 */

export type GarmentSegmentProgress = (key: string, current: number, total: number) => void

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

/**
 * 将原图与蒙版 data URL 合成，输出带透明背景的 PNG data URL，便于在界面上预览「抠出的服装/前景」。
 *
 * 使用 canvas `destination-in`：以蒙版的 **alpha** 裁切原图，避免手工拼像素时与浏览器预乘/解码不一致。
 * 若蒙版整图 alpha 均为 255（旧版灰度蒙版：明暗在 RGB），则先把 R 通道拷到 alpha 再合成。
 * 原图若跨域污染画布则 toDataURL 失败，返回 null。
 */
export async function buildForegroundCutoutDataUrl(
  imageSrc: string,
  maskDataUrl: string,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const [base, maskImg] = await Promise.all([
      loadImageElement(imageSrc),
      loadImageElement(maskDataUrl),
    ])
    const w = base.naturalWidth
    const h = base.naturalHeight
    if (!w || !h) return null

    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = w
    maskCanvas.height = h
    const mctx = maskCanvas.getContext('2d')
    if (!mctx) return null
    mctx.drawImage(maskImg, 0, 0, w, h)

    let md: ImageData
    try {
      md = mctx.getImageData(0, 0, w, h)
    } catch {
      return null
    }

    let anyAlphaBelowOpaque = false
    for (let i = 3; i < md.data.length; i += 4) {
      if (md.data[i] < 255) {
        anyAlphaBelowOpaque = true
        break
      }
    }
    if (!anyAlphaBelowOpaque) {
      for (let i = 0; i < md.data.length; i += 4) {
        const lum = md.data[i]
        md.data[i] = 255
        md.data[i + 1] = 255
        md.data[i + 2] = 255
        md.data[i + 3] = lum
      }
      mctx.putImageData(md, 0, 0)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(base, 0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(maskCanvas, 0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'

    try {
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  } catch (e) {
    console.error('[garment-segmentation] cutout', e)
    return null
  }
}

/**
 * 从原图生成用于 CSS mask-image 的 data URL。
 *
 * 使用「白 RGB + α=前景强度」：浏览器对 mask 默认按 **alpha** 通道裁切叠层。
 * 若写成灰度图且 α 全为 255，则整块叠色/图案层都会显示，看起来像「整图生效」。
 */
export async function buildForegroundMaskDataUrl(
  imageSrc: string,
  onProgress?: GarmentSegmentProgress,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const { removeBackground } = await import('@imgly/background-removal')
    const blob = await removeBackground(imageSrc, {
      model: 'isnet_quint8',
      progress: onProgress,
    })

    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(bmp, 0, 0)
    const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = srcData
    const out = ctx.createImageData(width, height)

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      out.data[i] = 255
      out.data[i + 1] = 255
      out.data[i + 2] = 255
      out.data[i + 3] = a
    }
    ctx.putImageData(out, 0, 0)
    return canvas.toDataURL('image/png')
  } catch (e) {
    console.error('[garment-segmentation]', e)
    return null
  }
}
