'use client'

interface PhonePreviewProps {
  price: number
  originalPrice: number
  discount: string
  productName: string
  doneAssetCount: number
}

export default function PhonePreview({
  price,
  originalPrice,
  discount,
  productName,
  doneAssetCount,
}: PhonePreviewProps) {
  return (
    <div className="w-[260px] rounded-[28px] border-2 border-[#333] bg-black overflow-hidden">
      {/* Inner frame padding */}
      <div className="p-2">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1 text-[10px] text-gray-500">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span>≡</span>
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header bar */}
        <div className="flex items-center gap-2 bg-[#ff4000] text-white text-xs h-8 px-3 rounded-t-lg">
          <span>←</span>
          <span>🔍</span>
          <span className="font-medium">淘宝</span>
        </div>

        {/* Main image area */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-pink-200/20 to-purple-200/20">
          {/* Center emoji */}
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            👗
          </div>

          {/* Video play button overlay (doneAssetCount >= 5) */}
          {doneAssetCount >= 5 && (
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-xs ml-0.5">▶</span>
            </div>
          )}

          {/* Corner badge (doneAssetCount >= 4) */}
          {doneAssetCount >= 4 && (
            <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg">
              {discount}
            </div>
          )}

          {/* Price bar at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-red-500 font-bold text-sm">¥{price}</span>
              <span className="text-gray-500 text-[10px] line-through">
                ¥{originalPrice}
              </span>
            </div>
            <div className="text-gray-400 text-[10px]">月销28</div>
          </div>
        </div>

        {/* Coupon bar (doneAssetCount >= 2) */}
        {doneAssetCount >= 2 && (
          <div className="flex gap-2 px-2 py-1.5 bg-[#1a1a24]">
            <span className="text-[10px] bg-red-500/20 text-red-400 rounded px-1.5 py-0.5">
              领30元券
            </span>
            <span className="text-[10px] bg-red-500/20 text-red-400 rounded px-1.5 py-0.5">
              领60元券
            </span>
          </div>
        )}

        {/* Product title */}
        <div className="px-2 py-2 bg-[#1a1a24]">
          <p className="text-[11px] text-gray-200 leading-tight">
            <span className="inline-block bg-red-500 text-white rounded text-[10px] px-1 mr-1 align-middle">
              🏷618
            </span>
            {productName}
          </p>
        </div>

        {/* Activity atmosphere (doneAssetCount >= 3) */}
        {doneAssetCount >= 3 && (
          <div className="mx-2 mb-2 border border-red-500/30 rounded-lg p-2 bg-red-500/5">
            <div className="text-[10px] text-red-400 font-medium mb-1">
              618限时特惠
            </div>
            <div className="flex gap-1 mb-1">
              {['03', '28', '15'].map((n) => (
                <span
                  key={n}
                  className="bg-red-600 text-white text-[10px] font-mono px-1 rounded"
                >
                  {n}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-gray-400">
              到手¥{price}·限量320
            </div>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="flex gap-2 px-2 py-2 bg-[#1a1a24] rounded-b-lg">
          <button className="flex-1 h-7 rounded-full border border-[#ff4000] text-[#ff4000] text-[10px]">
            加入购物车
          </button>
          <button className="flex-1 h-7 rounded-full bg-gradient-to-r from-[#ff4000] to-[#ff6a00] text-white text-[10px]">
            立即购买
          </button>
        </div>
      </div>
    </div>
  )
}
