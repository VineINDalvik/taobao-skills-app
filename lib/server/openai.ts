import { readFile } from 'node:fs/promises'

const FALLBACK_KEY_FILES = [
  process.env.OPENAI_API_KEY_FILE,
  '/Users/vinexio/Downloads/call_gpt.py',
].filter(Boolean) as string[]

function extractKeyFromText(text: string): string | null {
  const patterns = [
    /OPENAI_API_KEY\s*=\s*['"]([^'"]+)['"]/,
    /api_key\s*=\s*['"]([^'"]+)['"]/,
    /sk-(?:proj-)?[A-Za-z0-9_\-]+/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    return match[1] || match[0] || null
  }
  return null
}

export async function resolveOpenAiApiKey(): Promise<string> {
  const envKey = process.env.OPENAI_API_KEY?.trim()
  if (envKey) return envKey

  for (const file of FALLBACK_KEY_FILES) {
    try {
      const text = await readFile(file, 'utf-8')
      const key = extractKeyFromText(text)?.trim()
      if (key) return key
    } catch {
      // ignore fallback miss
    }
  }

  throw new Error('OPENAI_API_KEY 未设置，且未能从本机提供的 call_gpt.py 中解析到 key')
}

export async function openAiJson<T>(path: string, body: unknown, clientApiKey?: string): Promise<T> {
  const apiKey = clientApiKey?.trim() || (await resolveOpenAiApiKey())
  let res: Response
  try {
    res = await fetch(`https://api.openai.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`OpenAI 网络请求失败：${message}`)
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // keep raw text in error below
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && 'error' in json
        ? JSON.stringify((json as { error?: unknown }).error)
        : text) || `OpenAI request failed: ${res.status}`
    throw new Error(msg)
  }

  return json as T
}
