/**
 * 免费方案：仅从商品页 URL 解析 query 参数，不请求淘宝、不使用 Cookie。
 * 类目、标题、到手价等必须以人工填写或官方开放平台为准。
 */

export type TaobaoParseHost = 'taobao' | 'tmall' | 'other'

export type TaobaoItemParseResult =
  | { ok: true; itemId: string; skuId?: string; host: TaobaoParseHost }
  | { ok: false; error: string }

function classifyHost(hostname: string): TaobaoParseHost {
  const h = hostname.toLowerCase()
  if (h === 'tmall.com' || h.endsWith('.tmall.com')) return 'tmall'
  if (h === 'taobao.com' || h.endsWith('.taobao.com')) return 'taobao'
  return 'other'
}

export function parseTaobaoItemUrl(raw: string): TaobaoItemParseResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: '链接为空' }

  let urlStr = trimmed
  if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`

  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return { ok: false, error: '不是合法的 URL' }
  }

  const hostKind = classifyHost(url.hostname)
  if (hostKind === 'other') {
    return { ok: false, error: '请使用淘宝（taobao.com）或天猫（tmall.com）商品页链接' }
  }

  const id = url.searchParams.get('id')
  if (!id || !/^\d+$/.test(id)) {
    return { ok: false, error: '链接里没有有效的商品 id（缺少或非法的 id= 参数）' }
  }

  const skuRaw = url.searchParams.get('skuId') ?? url.searchParams.get('sku_id')
  const skuId = skuRaw && /^\d+$/.test(skuRaw) ? skuRaw : undefined

  return { ok: true, itemId: id, skuId, host: hostKind }
}
