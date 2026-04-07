/**
 * 爆款延伸 · 设计点库示意图（免版税外链，正式环境可换自有 CDN / 检索结果）
 * Pexels: https://www.pexels.com/license/  ·  Unsplash: https://unsplash.com/license
 */

export type DesignLibraryItem = { id: string; label: string; thumb: string }

function pexelsPhoto(id: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=480&h=480&fit=crop`
}

function unsplashPhoto(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&w=480&h=480&fit=crop&q=85`
}

/** 元素库：尽量用细节/配件/肌理特写，避免整身模特与版型库「撞脸」 */
export const ELEMENT_LIBRARY: DesignLibraryItem[] = [
  { id: 'bow', label: '蝴蝶结系带', thumb: pexelsPhoto(10475794) },
  { id: 'belt', label: '宽腰带装饰', thumb: pexelsPhoto(6764007) },
  { id: 'ruffle', label: '荷叶边下摆', thumb: pexelsPhoto(6311662) },
  { id: 'pleat', label: '压褶细节', thumb: unsplashPhoto('1572804013309-59a88b7e92f1') },
  { id: 'button', label: '排扣门襟', thumb: pexelsPhoto(965981) },
  { id: 'lace', label: '蕾丝拼接', thumb: unsplashPhoto('1586075010923-2dd4570fb338') },
]

/** 面料库：以布面微距/垂坠为主，贴近供应链选料沟通 */
export const FABRIC_LIBRARY: DesignLibraryItem[] = [
  { id: 'corduroy', label: '灯芯绒', thumb: pexelsPhoto(6311394) },
  { id: 'denim', label: '牛仔', thumb: pexelsPhoto(1082529) },
  { id: 'silk', label: '缎面光泽', thumb: unsplashPhoto('1620799140408-edc6dcb6d633') },
  { id: 'knit', label: '针织肌理', thumb: pexelsPhoto(5691649) },
  { id: 'linen', label: '亚麻质感', thumb: pexelsPhoto(3651597) },
  { id: 'leather', label: '皮革哑光', thumb: unsplashPhoto('1614680376573-df3480f0c6ff') },
]

/** 版型库：裙装/连衣裙全身或大半身，廓形可读 */
export const SILHOUETTE_LIBRARY: DesignLibraryItem[] = [
  { id: 'wrap-mini', label: '围裹迷你半裙', thumb: unsplashPhoto('1539008835657-9e8e9680c956') },
  { id: 'a-line', label: 'A 字中长裙', thumb: unsplashPhoto('1496747611176-843222e1e57c') },
  { id: 'pencil', label: '铅笔窄裙', thumb: unsplashPhoto('1515372039744-b8f02a3ae446') },
  { id: 'tiered', label: '蛋糕层叠裙', thumb: unsplashPhoto('1509631179647-0177331693ae') },
  { id: 'straight', label: '直筒半裙', thumb: unsplashPhoto('1595777457583-95e059d581b8') },
  { id: 'asym', label: '不规则下摆', thumb: pexelsPhoto(7682667) },
]
