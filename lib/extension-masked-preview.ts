/**
 * 延伸设计 · 按前景蒙版做换色/图案预览（canvas 像素级，避免 CSS mask + mix-blend 整图漏色）
 */

export type ExtensionPatternId = 'none' | 'stripe' | 'plaid' | 'dots'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function parseRgba(input: string | null): { r: number; g: number; b: number; a: number } | null {
  if (!input) return null
  const m = input.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  )
  if (!m) return null
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  }
}

/** 将蒙版绘制为 w×h 后，得到每像素前景强度 0–255（兼容「白+α」与「灰度+不透明 α」） */
function maskAlphaAtSize(maskImg: HTMLImageElement, w: number, h: number): Uint8ClampedArray | null {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(maskImg, 0, 0, w, h)
  let md: ImageData
  try {
    md = ctx.getImageData(0, 0, w, h)
  } catch {
    return null
  }
  const data = md.data
  let anyAlphaBelowOpaque = false
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      anyAlphaBelowOpaque = true
      break
    }
  }
  if (!anyAlphaBelowOpaque) {
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i]
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = lum
    }
  }
  const out = new Uint8ClampedArray(w * h)
  for (let i = 0, j = 0; j < w * h; i += 4, j++) {
    out[j] = data[i + 3]
  }
  return out
}

function patternFactor(x: number, y: number, id: ExtensionPatternId): number {
  if (id === 'none') return 1
  if (id === 'stripe') {
    return 0.9 + Math.sin((x + y) * 0.14) * 0.1
  }
  if (id === 'plaid') {
    const vx = Math.sin(x * 0.2)
    const vy = Math.sin(y * 0.2)
    return 0.82 + vx * vy * 0.18
  }
  const cx = ((x % 9) - 4.5) / 4.5
  const cy = ((y % 9) - 4.5) / 4.5
  return cx * cx + cy * cy < 0.35 ? 0.88 : 1.03
}

/**
 * 在前景蒙版内叠色 + 图案示意（背景像素保持原图）。
 * maxSide：长边上限，控制耗时与内存。
 */
export async function compositeMaskedStylePreview(
  imageSrc: string,
  maskDataUrl: string,
  colorTint: string | null,
  patternId: ExtensionPatternId,
  maxSide = 520,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const [base, maskImg] = await Promise.all([loadImage(imageSrc), loadImage(maskDataUrl)])
    const nw = base.naturalWidth
    const nh = base.naturalHeight
    if (!nw || !nh) return null

    const scale = Math.min(1, maxSide / Math.max(nw, nh))
    const w = Math.max(1, Math.round(nw * scale))
    const h = Math.max(1, Math.round(nh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(base, 0, 0, w, h)
    let im: ImageData
    try {
      im = ctx.getImageData(0, 0, w, h)
    } catch {
      return null
    }

    const matte = maskAlphaAtSize(maskImg, w, h)
    if (!matte || matte.length !== w * h) return null

    const tint = parseRgba(colorTint)
    const d = im.data

    for (let j = 0; j < w * h; j++) {
      const m = matte[j] / 255
      if (m < 0.004) continue

      const i = j * 4
      let r = d[i]
      let g = d[i + 1]
      let b = d[i + 2]

      if (tint) {
        const strength = tint.a * m
        r = r * (1 - strength) + tint.r * strength
        g = g * (1 - strength) + tint.g * strength
        b = b * (1 - strength) + tint.b * strength
      }

      const x = j % w
      const y = Math.floor(j / w)
      const pf = patternFactor(x, y, patternId)
      r = Math.min(255, Math.max(0, r * pf))
      g = Math.min(255, Math.max(0, g * pf))
      b = Math.min(255, Math.max(0, b * pf))

      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
    }

    ctx.putImageData(im, 0, 0)
    try {
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  } catch (e) {
    console.error('[extension-masked-preview]', e)
    return null
  }
}
