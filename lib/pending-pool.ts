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
