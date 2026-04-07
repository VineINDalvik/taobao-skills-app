import type { Supplier1688Result } from '../types'
import crypto from 'crypto'

// ── Config ──────────────────────────────────────────────────
const APP_KEY = process.env.ALI1688_APP_KEY ?? ''
const APP_SECRET = process.env.ALI1688_APP_SECRET ?? ''
const API_HOST = 'https://gw.open.1688.com/openapi'

// ── Signature helper (1688 Open Platform HMAC-SHA1) ─────────
function sign(apiPath: string, params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
  const str = apiPath + sorted.map((k) => k + params[k]).join('')
  return crypto.createHmac('sha1', APP_SECRET).update(str).digest('hex').toUpperCase()
}

// ── Mock data (fallback when API is unavailable) ────────────
function mockSupplierResults(imageUrl: string): Supplier1688Result[] {
  return [
    {
      offerId: 'mock-001',
      title: '法式碎花V领连衣裙 春夏新款',
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=200&h=250&fit=crop',
      price: 45,
      moq: 30,
      deliveryDays: 3,
      supplierName: '杭州美织服饰',
      supplierScore: 4.8,
      tradeLevel: 'A2',
      similarityScore: 0.92,
      detailUrl: 'https://detail.1688.com/offer/mock-001.html',
    },
    {
      offerId: 'mock-002',
      title: '碎花雪纺连衣裙 V领收腰',
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&h=250&fit=crop',
      price: 52,
      moq: 50,
      deliveryDays: 5,
      supplierName: '广州锦绣纺织',
      supplierScore: 4.6,
      tradeLevel: 'A1',
      similarityScore: 0.85,
      detailUrl: 'https://detail.1688.com/offer/mock-002.html',
    },
    {
      offerId: 'mock-003',
      title: '碎花吊带裙 轻薄雪纺面料',
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=200&h=250&fit=crop',
      price: 38,
      moq: 100,
      deliveryDays: 4,
      supplierName: '织里小雅制衣',
      supplierScore: 4.5,
      tradeLevel: 'B',
      similarityScore: 0.78,
      detailUrl: 'https://detail.1688.com/offer/mock-003.html',
    },
  ]
}

// ── Main search function ────────────────────────────────────
export async function searchSuppliersByImage(
  imageUrl: string,
): Promise<Supplier1688Result[]> {
  // Fall back to mock if no credentials
  if (!APP_KEY || !APP_SECRET) {
    console.warn('[ali1688] No credentials configured, returning mock data')
    return mockSupplierResults(imageUrl)
  }

  const apiPath = 'param2/1/com.alibaba.search/alibaba.search.product.imageUploadSearch'
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+08:00')

  const params: Record<string, string> = {
    _aop_timestamp: timestamp,
    access_token: '', // Will need OAuth token flow for production
    imageUrl,
  }
  params._aop_signature = sign(apiPath, params)

  const url = `${API_HOST}/${apiPath}/${APP_KEY}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    })

    if (!res.ok) {
      console.error(`[ali1688] API error: ${res.status}`)
      return mockSupplierResults(imageUrl)
    }

    const json = await res.json()
    // Normalize 1688 response to our type
    // The exact response shape depends on the API version — adapt at integration time
    const items = json?.result?.data ?? json?.data ?? []
    return items.slice(0, 8).map((item: Record<string, unknown>, idx: number) => ({
      offerId: String(item.offerId ?? `1688-${idx}`),
      title: String(item.subject ?? item.title ?? ''),
      imageUrl: String(item.imageUrl ?? (item.image as Record<string, unknown>)?.imgUrl ?? ''),
      price: Number((item.priceInfo as Record<string, unknown>)?.price ?? item.price ?? 0),
      moq: Number(item.moq ?? item.minOrderQuantity ?? 1),
      deliveryDays: Number(item.deliveryDays ?? 3),
      supplierName: String(item.supplierName ?? item.companyName ?? ''),
      supplierScore: Number(item.supplierScore ?? item.compositeScore ?? 0),
      tradeLevel: String(item.tradeLevel ?? item.tpLevel ?? ''),
      similarityScore: Math.round((1 - idx * 0.05) * 100) / 100,
      detailUrl: String(item.detailUrl ?? `https://detail.1688.com/offer/${item.offerId}.html`),
    })) as Supplier1688Result[]
  } catch (err) {
    console.error('[ali1688] Fetch failed:', err)
    return mockSupplierResults(imageUrl)
  }
}
