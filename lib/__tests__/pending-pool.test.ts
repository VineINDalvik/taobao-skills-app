import { describe, it, expect } from 'vitest'
import {
  formatPendingFilename,
  parsePendingItem,
} from '@/lib/pending-pool'
import type { PendingItem } from '@/lib/pending-pool'

describe('formatPendingFilename', () => {
  it('includes timestamp and id', () => {
    const name = formatPendingFilename('abc-123', 1712400000000)
    expect(name).toBe('1712400000000-abc-123.json')
  })
})

describe('parsePendingItem', () => {
  it('round-trips a pending item', () => {
    const item: PendingItem = {
      id: 'p-1',
      embedding: [0.1, 0.2, 0.3],
      source: 'user-upload',
      imageUrl: 'https://example.com/img.jpg',
      timestamp: '2026-04-06T00:00:00Z',
    }
    const json = JSON.stringify(item)
    const parsed = parsePendingItem(json)
    expect(parsed).toEqual(item)
  })

  it('returns null for invalid JSON', () => {
    expect(parsePendingItem('not json')).toBeNull()
  })

  it('returns null if embedding is missing', () => {
    expect(parsePendingItem(JSON.stringify({ id: 'x' }))).toBeNull()
  })
})
