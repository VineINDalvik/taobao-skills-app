import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { annotateClustersWithOpenAi } from '@/lib/server/openai-cluster-semantic'

export const runtime = 'nodejs'

/** 自建 / Docker 部署时聚类较慢，可适当调大 */
export const maxDuration = 180

const MAX_CSV_BYTES = 12 * 1024 * 1024

function getPythonBin() {
  return process.env.CLUSTER_PYTHON_BIN?.trim() || 'python3'
}

function scriptPath() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'scripts', 'build_cluster_data.py')
}

/**
 * POST multipart/form-data
 * - file: CSV（UTF-8），需含 title；预计算向量模式需含 embedding 列
 * - embeddingBackend: precomputed | openclip
 * - method: hdbscan | kmeans
 * - preset: fine | medium | coarse（仅 hdbscan）
 * - topClusters: 数字字符串
 * - nClusters: KMeans 簇数
 */
export async function POST(req: NextRequest) {
  if (!fs.existsSync(scriptPath())) {
    return NextResponse.json(
      { ok: false, error: '未找到 scripts/build_cluster_data.py' },
      { status: 500 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: '请上传 file 字段（CSV）' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length === 0) {
    return NextResponse.json({ ok: false, error: '空文件' }, { status: 400 })
  }
  if (buf.length > MAX_CSV_BYTES) {
    return NextResponse.json({ ok: false, error: `CSV 超过 ${MAX_CSV_BYTES} 字节` }, { status: 400 })
  }

  const embeddingBackend = String(form.get('embeddingBackend') || 'precomputed')
  const method = String(form.get('method') || 'hdbscan')
  const preset = String(form.get('preset') || 'fine')
  const topClusters = String(form.get('topClusters') || '12')
  const nClusters = String(form.get('nClusters') || '18')
  const semanticBackend = String(form.get('semanticBackend') || 'gpt4o')
  const semanticMaxClusters = Math.max(1, parseInt(String(form.get('semanticMaxClusters') || topClusters), 10) || 12)

  const tmp = path.join(/* turbopackIgnore: true */ os.tmpdir(), `finder-cluster-${Date.now()}.csv`)
  fs.writeFileSync(tmp, buf)

  const py = getPythonBin()
  const args = [
    scriptPath(),
    '--source',
    'import',
    '--import-csv',
    tmp,
    '--stdout-json',
    '--method',
    method,
    '--top-clusters',
    topClusters,
    '--umap-neighbors',
    '12',
  ]

  if (embeddingBackend === 'openclip') {
    args.push('--embedding-backend', 'openclip')
  } else {
    args.push('--embedding-backend', 'dataset')
  }

  if (method === 'kmeans') {
    args.push('--n-clusters', nClusters)
  } else {
    args.push('--preset', preset)
  }

  const result = spawnSync(py, args, {
    encoding: 'utf-8',
    maxBuffer: 80 * 1024 * 1024,
    timeout: 170_000,
    cwd: process.cwd(),
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })

  try {
    fs.unlinkSync(tmp)
  } catch {
    /* ignore */
  }

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: `无法执行 ${py}：${result.error.message}。请安装 Python3 + scripts/requirements-cluster.txt，或设置 CLUSTER_PYTHON_BIN。`,
      },
      { status: 503 },
    )
  }

  if (result.status !== 0) {
    return NextResponse.json(
      {
        ok: false,
        error: (result.stderr || result.stdout || '聚类进程非零退出').slice(0, 8000),
      },
      { status: 422 },
    )
  }

  let clusters: unknown
  try {
    clusters = JSON.parse(result.stdout.trim())
  } catch {
    return NextResponse.json(
      { ok: false, error: '解析聚类 JSON 失败', raw: result.stdout.slice(0, 2000) },
      { status: 500 },
    )
  }

  let semanticAnnotated = false
  if (semanticBackend === 'gpt4o' && Array.isArray(clusters) && clusters.length > 0) {
    try {
      const semanticJson = await annotateClustersWithOpenAi(
        (clusters as Array<Record<string, unknown>>).slice(0, semanticMaxClusters).map((cluster) => ({
          styleId: String(cluster.styleId || ''),
          name: String(cluster.name || ''),
          cnDesc: String(cluster.cnDesc || ''),
          insight: String(cluster.insight || ''),
          competitorNames: Array.isArray(cluster.competitors)
            ? cluster.competitors
                .map((item) => (item && typeof item === 'object' ? String((item as { name?: string }).name || '') : ''))
                .filter(Boolean)
            : [],
          imageUrls: [
            ...(Array.isArray(cluster.mosaicImages) ? cluster.mosaicImages.filter((item) => typeof item === 'string') : []),
            ...(Array.isArray(cluster.competitors)
              ? cluster.competitors
                  .map((item) => (item && typeof item === 'object' ? String((item as { image?: string }).image || '') : ''))
                  .filter(Boolean)
              : []),
          ].slice(0, 3),
        })),
      )
      const semanticMap = new Map(
        (semanticJson.results ?? [])
          .filter((item) => item.styleId && item.semantic)
          .map((item) => [item.styleId as string, item.semantic]),
      )
      clusters = (clusters as Array<Record<string, unknown>>).map((cluster) => ({
        ...cluster,
        semantic: semanticMap.get(String(cluster.styleId || '')) ?? cluster.semantic,
      }))
      semanticAnnotated = semanticMap.size > 0
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `GPT-4o 语义标注失败：${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 422 },
      )
    }
  }

  return NextResponse.json({
    ok: true,
    clusterCount: Array.isArray(clusters) ? clusters.length : 0,
    clusters,
    semanticAnnotated,
    hint:
      '将返回的 clusters 数组保存为 taobao-skills-app/lib/cluster-data.json（整文件即为 JSON 数组）后重新 build，即可在 Finder 数据页与工作台使用。',
  })
}

/** GET：接口说明（给前端或其它服务对接） */
export async function GET() {
  return NextResponse.json({
    name: 'Finder 聚类 API',
    post: {
      contentType: 'multipart/form-data',
      fields: {
        file: '必填，CSV 文件',
        embeddingBackend: 'precomputed（默认，需 embedding 列）| openclip（需安装 torch+open_clip）',
        method: 'hdbscan | kmeans',
        preset: 'fine | medium | coarse（hdbscan）',
        topClusters: '导出前 K 个簇（按簇内均销量）',
        nClusters: 'KMeans 簇数',
        semanticBackend: 'gpt4o（默认，聚类后做 45 标签多标签语义理解）| heuristic（本地规则兜底）',
        semanticMaxClusters: '最多送去 GPT-4o 标注的簇数，默认等于 topClusters',
      },
      csvColumns:
        'title 必填；price, units_sold, platform, currency, image_url 选填；precomputed 模式需 embedding（768 维 JSON 数组或 | 分隔）',
    },
    env: { CLUSTER_PYTHON_BIN: '可选，默认 python3' },
    note: 'Vercel 默认无 Python/科学计算栈，请在自有服务器或 Docker 中部署 Next + Python 依赖后使用本接口。',
  })
}
