import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)

const MAX_BYTES = 5 * 1024 * 1024

/**
 * 本地开发：用 Python + open_clip 对灵感图编码，与 cluster-data centroid 同空间。
 * 部署环境无 Python 时返回 ok:false，前端降级为仅结构对齐。
 */
export async function POST(req: Request) {
  let tmp: string | null = null
  try {
    const body = (await req.json()) as { imageUrl?: string }
    const imageUrl = body.imageUrl?.trim()
    if (!imageUrl) {
      return Response.json({ ok: false, error: 'missing imageUrl' }, { status: 400 })
    }
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return Response.json({ ok: false, error: 'invalid url' }, { status: 400 })
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Response.json({ ok: false, error: 'only http(s)' }, { status: 400 })
    }

    const res = await fetch(imageUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'taobao-skills-app/embed-query/1.0' },
    })
    if (!res.ok) {
      return Response.json({ ok: false, error: `fetch ${res.status}` }, { status: 502 })
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return Response.json({ ok: false, error: 'image too large' }, { status: 400 })
    }

    tmp = join(tmpdir(), `finder-embed-${Date.now()}.bin`)
    await writeFile(tmp, buf)

    const script = join(process.cwd(), 'scripts', 'embed_image_openclip.py')
    const { stdout } = await execFileAsync('python3', [script, tmp], {
      timeout: 180_000,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env },
    })

    const line = stdout.trim().split('\n').filter(Boolean).pop() ?? ''
    const data = JSON.parse(line) as { ok?: boolean; embedding?: number[]; error?: string }
    return Response.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg })
  } finally {
    if (tmp) await unlink(tmp).catch(() => {})
  }
}
