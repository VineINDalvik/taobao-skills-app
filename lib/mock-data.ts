import type {
  Skill1Output, Skill2Output, PricingOutput,
  Skill4Output, Skill5Output, Skill6Output, TestingOutput,
  StyleCluster, ProductInput, TestingInput,
  BuyerPersona,
} from './types'

// ============================================================
// 高仿真 Mock 数据 — 女装连衣裙类目示例
// 静态常量保留为 fallback；参数化生成器在文件底部
// ============================================================

export const MOCK_SKILL1: Skill1Output = {
  recommendations: [
    {
      id: 'style-001',
      name: '法式碎花 V 领连衣裙',
      tier: 'S',
      trendScore: 92,
      trendReal: true,
      attributes: {
        neckline: 'V领',
        fabric: '雪纺',
        length: '中长款',
        pattern: '碎花',
        season: '春夏',
      },
      trendSignals: [
        '小红书近30天搜索量 +180%',
        '2026春夏时装周高频元素',
        '竞品近7天加购率环比 +42%',
      ],
      designGenes: [
        'V领强化显瘦感知',
        '雪纺轻薄传递"轻盈 Mood"',
        '碎花锁住浪漫属性，强化约会场景',
      ],
      priceRange: '159–269',
      riskNote: '竞争密度较高，建议在腰部细节或面料克重上做差异化',
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop',
      extensions: [
        {
          direction: 'A',
          risk: 'low',
          description: '换色系',
          change: '改藏蓝/奶咖碎花，保留全部爆款基因，风险最低',
          styleLine: '法式连衣裙 · V领 · 中长款 A 字摆',
          fabric: '轻薄雪纺，透气垂坠，克重与原款同档',
          fitSilhouette: 'V 领深位与腰线位置不变，摆围曲线保留',
        },
        {
          direction: 'B',
          risk: 'mid',
          description: '换图案',
          change: '改条纹 V 领雪纺，放弃碎花保留轻薄 Mood，需小批量测试',
          styleLine: '仍为连衣裙+V领主线，图案由碎花改为条纹方向',
          fabric: '雪纺底布，条纹间距与色对比需与工厂对色卡',
          fitSilhouette: '版型骨架不变，条纹方向影响视觉显瘦需 A/B 主图',
        },
        {
          direction: 'C',
          risk: 'high',
          description: '换版型',
          change: '改同款 A 字长裙，消费者行为需另行验证',
          styleLine: '同花色 Mood 下延伸至长款 A 字裙',
          fabric: '长裙摆用量增加，雪纺米数与内衬需重算',
          fitSilhouette: '裙长档上移、腰线可略提高以平衡比例',
        },
      ],
      clusterSampleSize: 156,
      confidence: 'high',
      salesBand: { p25: 8, p50: 18, p75: 35 },
      bandCaption: '在同价带连衣裙簇中处于偏上区间（约 P60–P70 分位）',
      testPlan: {
        skuRoles: [
          { role: '引流色', spec: '主卖色 1 个（建议黑白杏其一）' },
          { role: '利润色', spec: '碎花主色 1–2 个' },
          { role: '形象款', spec: '可选加一条短款同花色测点击' },
        ],
        observePhase1Days: 5,
        observePhase2Days: 14,
        budgetHint: '冷启动建议直通车 ¥80–150/日 × 5 天看加购率，再决定是否加码',
        stopRules: [
          '第 5 天加购率 < 同簇 P25 且 CTR 低于类目均值 → 优先改主图/标题，暂不加预算',
          '第 14 天真实转化仍低于同簇 P25 → 建议停测或换延伸方向 A（换色低风险）',
          '加购率进入同簇 P50 以上且退货信号正常 → 可加倍预算并扩色',
        ],
      },
      supplyHint: {
        status: 'matched',
        note: '1688 视觉近似款较多；外站（Shein 等）同 Mood 已跑量，供应链可参考',
      },
    },
    {
      id: 'style-002',
      name: '新中式盘扣提花连衣裙',
      tier: 'S',
      trendScore: 88,
      trendReal: true,
      attributes: {
        neckline: '中式立领',
        fabric: '提花',
        length: '中长款',
        pattern: '织纹',
        season: '春夏',
      },
      trendSignals: [
        '淘宝"新中式"关键词 +340%（近90天）',
        '抖音新中式穿搭话题 23 亿播放',
        '天猫2026春夏发布会重点方向',
      ],
      designGenes: [
        '盘扣细节传递文化认同感',
        '提花面料提升价格感知',
        '立领自带显脸小特效',
      ],
      priceRange: '199–399',
      riskNote: '新中式已进入主流，同质化风险上升，建议在配色或图案上做原创设计',
      imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop',
      extensions: [
        {
          direction: 'A',
          risk: 'low',
          description: '换配色',
          change: '改松石绿/烟粉色，保留版型和面料',
          styleLine: '新中式立领连衣裙 · 中长款',
          fabric: '提花底布不变，仅织纹配色与明暗对比调整',
          fitSilhouette: '立领高度、肩缝与腰节位置锁定',
        },
        {
          direction: 'B',
          risk: 'mid',
          description: '做套装',
          change: '同款面料加阔腿裤，扩展客单价',
          styleLine: '上装保持盘扣连衣裙识别点，下装同料阔腿',
          fabric: '上下装提花对条/对格，面料批次需同一缸',
          fitSilhouette: '裙装腰线与裤装腰头比例需成套试穿校准',
        },
        {
          direction: 'C',
          risk: 'high',
          description: '融合西式',
          change: '中式领+西式肩线，小众但有话题性',
          styleLine: '新中式元素 + 西式肩袖结构混搭',
          fabric: '肩袖活动量增大时提花弹性与归拔工艺要评估',
          fitSilhouette: '肩宽、袖笼深为变化重点，需板房试胚',
        },
      ],
      clusterSampleSize: 94,
      confidence: 'mid',
      salesBand: { p25: 5, p50: 12, p75: 28 },
      bandCaption: '热度高、竞品多，簇内方差大；预期区间偏宽',
      testPlan: {
        skuRoles: [
          { role: '引流', spec: '经典黑/米白盘扣款 1 个 SKU' },
          { role: '溢价', spec: '提花或暗纹款 1 个 SKU 测客单' },
        ],
        observePhase1Days: 7,
        observePhase2Days: 14,
        budgetHint: '建议 ¥100–200/日，新中式词竞争激烈，需精准长尾词测 3 天再放量',
        stopRules: [
          '点击率连续 3 天低于计划同类目均值 30% → 换主图构图（突出盘扣/提花特写）',
          '两周 ROI < 1.2 且加购平平 → 收缩为单一 SKU 或转延伸方向 A',
        ],
      },
      supplyHint: {
        status: 'weak',
        note: '1688 同款盘扣细节差异大，建议以图搜 + 小样；淘宝可卖性与货源需分开判断',
      },
    },
    {
      id: 'style-003',
      name: '薄荷曼波色系背心裙',
      tier: 'A',
      trendScore: 74,
      trendReal: true,
      attributes: {
        neckline: '方领',
        fabric: '棉麻',
        length: '短款',
        pattern: '纯色',
        season: '夏季',
      },
      trendSignals: [
        '薄荷绿 Pantone 年度趋势色候补',
        '小红书#薄荷曼波 3.2亿浏览',
      ],
      designGenes: [
        '色彩本身成为卖点，降低版型依赖',
        '棉麻面料主打夏日穿搭实用性',
      ],
      priceRange: '89–159',
      riskNote: '色彩趋势窗口期约 6 个月，注意备货周期控制',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop',
      extensions: [
        {
          direction: 'A',
          risk: 'low',
          description: '出同色系',
          change: '补充芥末黄/珊瑚橘，多色系引流',
          styleLine: '方领短款背心裙 · 纯色极简线',
          fabric: '棉麻混纺透气肌理，同色不同色相分支',
          fitSilhouette: '方领开口与肩带位置固定，裙长档不变',
        },
        {
          direction: 'B',
          risk: 'mid',
          description: '加印花',
          change: '薄荷绿底色+小白花印花，叠加两个趋势',
          styleLine: '基底版型不变，图案由纯色改为小花散点',
          fabric: '印花浆与棉麻渗透性需打样确认手感',
          fitSilhouette: '版型不变，印花布局避开胸腰活动褶量区',
        },
        {
          direction: 'C',
          risk: 'high',
          description: '改面料',
          change: '换纱质，提升价格带但生产门槛更高',
          styleLine: '仍短款方领线，材质从棉麻转向轻薄纱感',
          fabric: '纱质需配里布或加密防透，成本与工艺上浮',
          fitSilhouette: '纱垂坠更强，腰节与摆量需重新调比例',
        },
      ],
      clusterSampleSize: 41,
      confidence: 'low',
      salesBand: { p25: 2, p50: 6, p75: 15 },
      bandCaption: '趋势簇样本偏少，以下为宽区间估计，务必小单测',
      testPlan: {
        skuRoles: [{ role: '单色测款', spec: '先上薄荷绿单色 + 1 个安全色对照' }],
        observePhase1Days: 5,
        observePhase2Days: 10,
        budgetHint: '建议 ¥50–80/日试投；样本不足时不做激进加码',
        stopRules: [
          '样本量低：任何结论仅作参考，以你店真实加购/转化为准',
          '第 10 天无加购起色 → 放弃该色系或并入延伸方向 B（加印花）',
        ],
      },
      supplyHint: {
        status: 'unknown',
        note: '外站热度≠淘宝库存；1688 需自行以图检索，系统仅提示淘宝侧簇表现',
      },
    },
  ],
  marketOverview: {
    categoryGrowth: '+12% YoY',
    avgPrice: 189,
    topKeywords: ['法式', '碎花', '显瘦', '通勤', '新中式'],
    competitionLevel: 'mid',
  },
}

export const MOCK_SKILL2: Skill2Output = {
  titles: {
    search: '2026春夏新款法式碎花连衣裙女V领雪纺中长款显瘦气质通勤裙',
    seeding: '回头率满分！法式碎花V领连衣裙 雪纺显瘦 通勤约会都能穿',
    promo: '【限时折扣】法式碎花连衣裙 V领雪纺 显瘦中长款 春夏新款',
  },
  mainImagePlan: [
    {
      index: 1,
      role: '首图（白底商品图）',
      compositionGuide: '模特正面站立，三分法构图，服装占画面 70%',
      copyText: '显瘦 / 气质 / 春夏必备',
      bgStyle: '纯白背景，自然光',
    },
    {
      index: 2,
      role: '细节特写',
      compositionGuide: '领口 + 腰部收褶细节特写，强调做工',
      copyText: '精工雪纺 · 透气不透肉',
      bgStyle: '米白色背景，光影打底',
    },
    {
      index: 3,
      role: '尺码版型',
      compositionGuide: '多尺码模特对比站姿，清晰标注 S/M/L/XL',
      copyText: '165/M 正常穿 · 小个子也能穿',
      bgStyle: '浅灰背景，文字标注清晰',
    },
    {
      index: 4,
      role: '场景穿搭',
      compositionGuide: '户外自然光，街拍感，展示实际穿着效果',
      copyText: '通勤 · 约会 · 周末出行',
      bgStyle: '自然街景，背景虚化',
    },
    {
      index: 5,
      role: '促销利益点',
      compositionGuide: '商品+文字组合，突出促销信息和卖点',
      copyText: '新品首发 ¥169 · 仅限72小时',
      bgStyle: '品牌色背景，大字加粗',
    },
  ],
  detailCopy: {
    hook: '这条裙子被买家说"每次穿出去都会被问在哪买的"——碎花V领，雪纺轻盈，腰部自然收褶，上身显瘦效果自己试就知道。',
    features: [
      '▪ V领设计：拉长颈线，显瘦显高效果立竿见影',
      '▪ 优质雪纺面料：轻薄透气，不透肉，夏天穿不热',
      '▪ 碎花元素：法式浪漫感，通勤/约会/出游三场景通吃',
      '▪ 腰部收褶设计：自然勾勒腰线，不挑身材',
      '▪ 中长裙摆：遮住大腿肉，小个子穿也不会显矮',
    ],
    scene: '早上九点穿着通勤，下午三点直接约会，不需要换衣服——这条裙子就是这么省事。阳光下碎花会轻轻透光，走起路来有种"在电影里"的感觉。',
    faq: [
      'Q：身高160cm、体重110斤，穿多大？A：建议S码，腰围2.2尺以内都合适',
      'Q：面料会皱吗？A：雪纺材质微皱属正常，轻轻抖开即可，可机洗',
      'Q：颜色和图片一致吗？A：我们使用自然光实拍，色差 ≤5%',
    ],
  },
  skuSuggestion: {
    colors: ['奶白碎花（预测最热）', '藏蓝碎花', '粉紫碎花', '奶茶碎花'],
    sizes: ['S', 'M', 'L', 'XL'],
    hotCombo: '奶白碎花 × M码（预测占总销量 35%）',
  },
  keywords: ['法式碎花连衣裙', '雪纺连衣裙显瘦', '中长款连衣裙', 'V领连衣裙女', '碎花裙子2026新款'],
}

export const MOCK_SKILL3: PricingOutput = {
  currentStage: 'launch',
  optimalPrice: 169,
  elasticityBeta: -1.8,
  elasticityConfidence: 'mid',
  priceSchedule: {
    launchPrice: 169,
    dailyPrice: 199,
    promoFloor: 149,
  },
  profitSimulation: [
    { price: 149, dailySales: 16, monthlyProfit: 4400 },
    { price: 169, dailySales: 12, monthlyProfit: 6500 },
    { price: 189, dailySales: 9, monthlyProfit: 6800 },
    { price: 199, dailySales: 7, monthlyProfit: 6200 },
    { price: 219, dailySales: 5, monthlyProfit: 5400 },
  ],
  competitorRange: { min: 139, avg: 189, max: 269 },
  riskAlerts: [
    '弹性置信度「中」——数据来自 LightGBM 预测，建议第3天验证真实销量',
    '竞品均价 189 元，建议新品期不超过竞品均价 -10%',
  ],
}

export const MOCK_SKILL4: Skill4Output = {
  totalReviews: 328,
  positiveRate: 0.82,
  sentimentTrend: '近7天好评率下降 3%，主要源于尺码问题集中爆发',
  dimensions: {
    '商品质量': { score: 4.2, issues: ['部分色差', '偶发线头'] },
    '尺码版型': { score: 3.5, issues: ['M码偏小', '腰围偏紧'] },
    '物流体验': { score: 4.6, issues: [] },
    '客服服务': { score: 4.4, issues: ['退换货流程慢'] },
    '性价比':   { score: 4.1, issues: [] },
  },
  actionItems: [
    {
      priority: 'P0',
      problem: 'M码尺码偏小（17条差评明确提及）',
      count: 17,
      fix: '在 SKU 描述和详情页增加尺码提醒',
      fixTemplate: '【尺码提示】本款版型偏小，建议身高160-165cm、体重105-115斤选M码，其余情况建议拍大一码。如有疑问可联系客服咨询。',
      impact: '预计降低退货率 5–8%',
    },
    {
      priority: 'P1',
      problem: '色差问题（6条提及，主要是奶白色系）',
      count: 6,
      fix: '与供应商确认出货色卡，并在详情页增加拍摄说明',
      fixTemplate: '【拍摄说明】本商品为自然光实拍，图片颜色可能因屏幕色差有轻微偏差，以实物为准。',
      impact: '预计减少因色差引发的退货 30%',
    },
    {
      priority: 'P2',
      problem: '好评高频词未利用（"显瘦"、"气质"、"面料好"出现率 >40%）',
      count: 0,
      fix: '将这些关键词补充到标题中，同时在详情页卖点处强化',
      fixTemplate: '直接复制进标题：「显瘦气质V领碎花连衣裙」',
      impact: '预计提升搜索曝光量 10–15%',
    },
  ],
  goodKeywords: ['显瘦', '气质', '面料好', '很仙', '日常必备'],
  personaHitRate: 0.6,
  personas: [
    {
      id: 'persona-1',
      name: '探险学妹',
      avatar: '🎒',
      ageRange: '18-22',
      budget: '80-180',
      coreNeeds: ['穿搭出片', '性价比高', '多场景百搭'],
      purchaseBehavior: '重度小红书用户，看评价买单，退货率偏高',
      fitScore: 8.2,
      verdict: 'strong',
      review: '作为探险学妹，我对「法式碎花 V 领连衣裙」的整体感受是：价格在我的预算范围内，性价比不错；碎花太适合出片了，小红书搜这种风格一搜一大把；V领强化显瘦感知这一点做得不错。综合来看非常适合我，会推荐给朋友。',
    },
    {
      id: 'persona-2',
      name: '品质上班族',
      avatar: '💼',
      ageRange: '25-32',
      budget: '150-350',
      coreNeeds: ['通勤得体', '面料舒适', '不撞款'],
      purchaseBehavior: '看重面料和版型评价，愿为品质溢价，复购率高',
      fitScore: 8.5,
      verdict: 'strong',
      review: '作为品质上班族，我对「法式碎花 V 领连衣裙」的整体感受是：价格在我的预算范围内，性价比不错；雪纺面料上班穿很得体，质感在线；V领显气质，开会见客户都没问题。综合来看非常适合我，会推荐给朋友。',
    },
    {
      id: 'persona-3',
      name: '潮流造型师',
      avatar: '✨',
      ageRange: '22-28',
      budget: '120-400',
      coreNeeds: ['设计感强', '趋势前沿', '社交货币'],
      purchaseBehavior: '追新品首发，重视款式独特性，对价格不敏感',
      fitScore: 7.7,
      verdict: 'strong',
      review: '作为潮流造型师，我对「法式碎花 V 领连衣裙」的整体感受是：价格在我的预算范围内；趋势分 92，这个款绝对是当季热门；碎花 V 领组合虽然经典但略欠独特性，不过整体品质可以接受。综合来看非常适合我，会推荐给朋友。',
    },
    {
      id: 'persona-4',
      name: '气质学生党',
      avatar: '🌸',
      ageRange: '20-25',
      budget: '60-160',
      coreNeeds: ['显瘦显高', '约会穿搭', '学生价位'],
      purchaseBehavior: '价格敏感，看销量和好评数做决策，爱收藏比价',
      fitScore: 6.8,
      verdict: 'neutral',
      review: '作为气质学生党，我对「法式碎花 V 领连衣裙」的整体感受是：V领很显瘦，约会穿回头率很高；不过 ¥169 的价格对我来说偏贵了一点，要等活动才能入手。整体还行，但还没到非买不可的程度。',
    },
    {
      id: 'persona-5',
      name: '精致宝妈',
      avatar: '👩‍👧',
      ageRange: '28-38',
      budget: '100-280',
      coreNeeds: ['好打理', '不显胖', '日常实穿'],
      purchaseBehavior: '关注面料安全性和洗护方便度，看差评决定退不退',
      fitScore: 4.8,
      verdict: 'weak',
      review: '作为精致宝妈，我对「法式碎花 V 领连衣裙」的整体感受是：雪纺要手洗比较麻烦，带娃的时候不太方便；碎花好看但日常实穿性一般；价格合适但我更看重好不好打理。不太适合我的需求，可能会继续看看别的。',
    },
  ],
}

export const MOCK_SKILL5: Skill5Output = {
  healthScore: 62,
  overallROI: 1.8,
  industryROI: 2.5,
  diagnosis: 'ROI 偏低（1.8，行业均值 2.5），每天约 430 元花费中有 35% 在低效关键词上',
  keywordActions: [
    { keyword: '连衣裙女', spend: 280, orders: 1, roi: 0.7, action: 'pause', suggestion: '广泛词流量杂，建议暂停。改用更精准的「碎花连衣裙女2026」' },
    { keyword: '夏季裙子', spend: 150, orders: 0, roi: 0, action: 'pause', suggestion: '零转化，立即暂停' },
    { keyword: '法式碎花裙', spend: 40, orders: 3, roi: 4.2, action: 'raise', suggestion: 'ROI 优质，建议出价从 1.2→1.8 元，抢前三排名' },
    { keyword: 'V领连衣裙显瘦', spend: 35, orders: 2, roi: 3.1, action: 'raise', suggestion: '高转化词，出价从 0.9→1.3 元' },
    { keyword: '新中式连衣裙', spend: 0, orders: 0, roi: 0, action: 'add', suggestion: '趋势词，建议新增，出价 0.8 元试投' },
  ],
  budgetSuggestion: {
    dailyBudget: 200,
    maxPPC: 1.5,
    peakHours: ['9:00–11:00', '20:00–23:00'],
  },
  projectedImprovement: '执行以上调整后，预计 ROI 从 1.8 提升至 2.6，月省广告费约 2,000 元',
}

export const MOCK_SKILL6: Skill6Output = {
  eventType: '618 年中大促',
  optimalDiscount: 0.85,
  optimalPrice: 169,
  marginAtOptimal: 0.38,
  expectedGMV: 71000,
  timeline: [
    {
      phase: 'warmup',
      dates: '6月1日–6月15日',
      action: '预热期：169元开放预购，加购送购物袋，详情页挂倒计时组件',
    },
    {
      phase: 'peak',
      dates: '6月16日–6月18日',
      action: '爆发期：169元全力冲销量，直通车预算从 200 元/天 → 400 元/天，满2件额外9折',
    },
    {
      phase: 'aftermath',
      dates: '6月19日–6月21日',
      action: '返场期：恢复至 189 元，清尾货，撤回直通车预算',
    },
  ],
  profitScenarios: [
    { label: '乐观（500件）', sales: 500, revenue: 84500, profit: 32100 },
    { label: '中性（300件）', sales: 300, revenue: 50700, profit: 19200 },
    { label: '悲观（150件）', sales: 150, revenue: 25350, profit: 9600 },
  ],
  riskWarning: '若预热期（6.1-6.15）加购量 < 50件，建议提前调整策略，增加站内活动报名',
}

// ============================================================
// 参数化生成器 — 根据上游 Skill 输出动态调整 mock 数据
// 让全链路数据真正流转，而非所有商品看到相同输出
// ============================================================

interface Skill2Context {
  style?: StyleCluster
  input?: ProductInput
  goodKeywords?: string[]  // 来自 Skill 4 的反馈闭环
}

/** 根据选中款式 + 好评关键词生成上架物料 */
export function buildSkill2(ctx: Skill2Context): Skill2Output {
  const s = ctx.style
  const gk = ctx.goodKeywords ?? []
  if (!s) return MOCK_SKILL2 // fallback

  const { neckline, fabric, pattern, length, season } = s.attributes
  const name = s.name
  const priceHint = s.priceRange?.split(/[–-]/)?.[0] ?? '169'
  const gkStr = gk.length ? gk.slice(0, 3).join('') : '显瘦气质'

  return {
    titles: {
      search: `2026${season}新款${name}${neckline}${fabric}${length}${gkStr}${ctx.input?.category?.split('-')[1] ?? ''}`,
      seeding: `回头率满分！${name} ${fabric}${gkStr} 通勤约会都能穿`,
      promo: `【限时折扣】${name} ${neckline}${fabric} ${gkStr}${length} ${season}新款`,
    },
    mainImagePlan: [
      { index: 1, role: '首图（白底商品图）', compositionGuide: '模特正面站立，三分法构图，服装占画面 70%', copyText: `${gk[0] ?? '显瘦'} / ${gk[1] ?? '气质'} / ${season}必备`, bgStyle: '纯白背景，自然光' },
      { index: 2, role: '细节特写', compositionGuide: `${neckline} + 腰部细节特写，强调做工`, copyText: `精工${fabric} · 透气不透肉`, bgStyle: '米白色背景，光影打底' },
      { index: 3, role: '尺码版型', compositionGuide: '多尺码模特对比站姿，清晰标注 S/M/L/XL', copyText: '165/M 正常穿 · 小个子也能穿', bgStyle: '浅灰背景，文字标注清晰' },
      { index: 4, role: '场景穿搭', compositionGuide: '户外自然光，街拍感，展示实际穿着效果', copyText: '通勤 · 约会 · 周末出行', bgStyle: '自然街景，背景虚化' },
      { index: 5, role: '促销利益点', compositionGuide: '商品+文字组合，突出促销信息和卖点', copyText: `新品首发 ¥${priceHint} · 仅限72小时`, bgStyle: '品牌色背景，大字加粗' },
    ],
    detailCopy: {
      hook: `这条${ctx.input?.category?.split('-')[1] ?? '裙子'}被买家说"每次穿出去都会被问在哪买的"——${pattern}${neckline}，${fabric}轻盈，上身${gk[0] ?? '显瘦'}效果自己试就知道。`,
      features: [
        `▪ ${neckline}设计：拉长颈线，${gk[0] ?? '显瘦'}显高效果立竿见影`,
        `▪ 优质${fabric}面料：轻薄透气，不透肉，${season === '春夏' ? '夏天穿不热' : '保暖舒适'}`,
        `▪ ${pattern}元素：浪漫感，通勤/约会/出游三场景通吃`,
        ...s.designGenes.slice(0, 2).map(g => `▪ ${g}`),
      ],
      scene: MOCK_SKILL2.detailCopy.scene,
      faq: MOCK_SKILL2.detailCopy.faq,
    },
    skuSuggestion: MOCK_SKILL2.skuSuggestion,
    keywords: [name, `${fabric}${ctx.input?.category?.split('-')[1] ?? '连衣裙'}${gk[0] ?? '显瘦'}`, `${length}${ctx.input?.category?.split('-')[1] ?? '连衣裙'}`, `${neckline}${ctx.input?.category?.split('-')[1] ?? '连衣裙'}女`, `${pattern}${ctx.input?.category?.split('-')[1] ?? '裙子'}2026新款`],
  }
}

interface Skill3Context {
  style?: StyleCluster
  costPrice?: number        // 从测款传入
  input?: ProductInput
}

/** 根据成本价和选中款价格带生成定价方案 */
export function buildSkill3(ctx: Skill3Context): PricingOutput {
  const cost = ctx.costPrice ?? 68
  const priceStr = ctx.style?.priceRange ?? ctx.input?.priceRange ?? '159-269'
  const [pMin, pMax] = priceStr.split(/[–-]/).map(Number)
  const avgPrice = Math.round(((pMin || 159) + (pMax || 269)) / 2)
  const optimal = Math.round(avgPrice * 0.85)
  const margin = (optimal - cost) / optimal

  // 生成 5 档价格枚举（围绕最优价上下浮动）
  const steps = [-20, 0, 20, 30, 50].map(d => optimal + d)
  const beta = -1.8
  const baseSales = 12
  const sim = steps.map(p => {
    const ratio = p / optimal
    const sales = Math.max(1, Math.round(baseSales * Math.pow(ratio, beta)))
    return { price: p, dailySales: sales, monthlyProfit: Math.round((p - cost) * sales * 30) }
  })

  return {
    currentStage: 'launch',
    optimalPrice: optimal,
    elasticityBeta: beta,
    elasticityConfidence: ctx.costPrice ? 'mid' : 'low',
    priceSchedule: {
      launchPrice: optimal,
      dailyPrice: Math.round(optimal * 1.18),
      promoFloor: Math.max(Math.round(cost * 1.1), optimal - 30),
    },
    profitSimulation: sim,
    competitorRange: { min: pMin || 139, avg: avgPrice, max: pMax || 269 },
    riskAlerts: [
      `弹性置信度「${ctx.costPrice ? '中' : '低'}」——${ctx.costPrice ? '已接入测款成本 ¥' + cost : '未获得成本价，使用默认 ¥68'}，建议第3天验证`,
      `竞品均价 ${avgPrice} 元，建议新品期不超过竞品均价 -10%`,
    ],
  }
}

interface Skill4Context {
  style?: StyleCluster
}

/** 根据选中款属性匹配评价诊断模板 + 买家人群深潜 */
export function buildSkill4(ctx: Skill4Context): Skill4Output {
  const s = ctx.style
  if (!s) return MOCK_SKILL4

  // 根据面料/版型生成对应的评价问题
  const fabricIssues: Record<string, string[]> = {
    '雪纺': ['部分色差', '偶发线头'],
    '提花': ['提花工艺不均匀', '图案与图片略有差异'],
    '棉麻': ['面料微皱', '手感偏硬'],
  }
  const issues = fabricIssues[s.attributes.fabric] ?? fabricIssues['雪纺']

  // ── 买家人群深潜（Customer DeepSight）──
  const personaTemplates: Omit<BuyerPersona, 'fitScore' | 'review' | 'verdict'>[] = [
    {
      id: 'persona-1',
      name: '探险学妹',
      avatar: '🎒',
      ageRange: '18-22',
      budget: '80-180',
      coreNeeds: ['穿搭出片', '性价比高', '多场景百搭'],
      purchaseBehavior: '重度小红书用户，看评价买单，退货率偏高',
    },
    {
      id: 'persona-2',
      name: '品质上班族',
      avatar: '💼',
      ageRange: '25-32',
      budget: '150-350',
      coreNeeds: ['通勤得体', '面料舒适', '不撞款'],
      purchaseBehavior: '看重面料和版型评价，愿为品质溢价，复购率高',
    },
    {
      id: 'persona-3',
      name: '潮流造型师',
      avatar: '✨',
      ageRange: '22-28',
      budget: '120-400',
      coreNeeds: ['设计感强', '趋势前沿', '社交货币'],
      purchaseBehavior: '追新品首发，重视款式独特性，对价格不敏感',
    },
    {
      id: 'persona-4',
      name: '气质学生党',
      avatar: '🌸',
      ageRange: '20-25',
      budget: '60-160',
      coreNeeds: ['显瘦显高', '约会穿搭', '学生价位'],
      purchaseBehavior: '价格敏感，看销量和好评数做决策，爱收藏比价',
    },
    {
      id: 'persona-5',
      name: '精致宝妈',
      avatar: '👩‍👧',
      ageRange: '28-38',
      budget: '100-280',
      coreNeeds: ['好打理', '不显胖', '日常实穿'],
      purchaseBehavior: '关注面料安全性和洗护方便度，看差评决定退不退',
    },
  ]

  // 根据款式属性为每个人群生成匹配度和评价叙述
  const { neckline, fabric, pattern, season } = s.attributes
  const name = s.name
  const priceStr = s.priceRange ?? '159-269'

  const personas: BuyerPersona[] = personaTemplates.map((p) => {
    const [bMin, bMax] = p.budget.split('-').map(Number)
    const [pMin] = priceStr.split(/[–-]/).map(Number)
    const priceInBudget = pMin >= (bMin ?? 0) && pMin <= (bMax ?? 999)

    // 人群-产品匹配逻辑
    let score = 5.0
    let reviewParts: string[] = []

    // 价格匹配
    if (priceInBudget) { score += 1.2; reviewParts.push(`价格在我的预算范围内，性价比不错`) }
    else if (pMin > (bMax ?? 999)) { score -= 1.5; reviewParts.push(`价格偏高，超出我的日常购买预算`) }
    else { score += 0.5; reviewParts.push(`价格很便宜，但担心品质`) }

    // 风格匹配
    if (p.id === 'persona-1') {
      if (pattern === '碎花') { score += 1.5; reviewParts.push(`${pattern}太适合出片了，小红书搜这种风格一搜一大把`) }
      else { score += 0.5; reviewParts.push(`款式可以，但不是最出片的那种风格`) }
    }
    if (p.id === 'persona-2') {
      if (fabric === '雪纺' || fabric === '提花') { score += 1.8; reviewParts.push(`${fabric}面料上班穿很得体，质感在线`) }
      if (neckline === 'V领') { score += 0.5; reviewParts.push(`${neckline}显气质，开会见客户都没问题`) }
    }
    if (p.id === 'persona-3') {
      if (s.trendScore >= 85) { score += 2.0; reviewParts.push(`趋势分 ${s.trendScore}，这个款绝对是当季热门`) }
      else { score += 0.3; reviewParts.push(`设计中规中矩，不够有辨识度`) }
    }
    if (p.id === 'persona-4') {
      if (neckline === 'V领' || neckline === '方领') { score += 1.2; reviewParts.push(`${neckline}很显瘦，约会穿回头率很高`) }
      if (pMin <= 160) { score += 1.0; reviewParts.push(`学生党也买得起，已收藏等降价`) }
    }
    if (p.id === 'persona-5') {
      if (fabric === '棉麻') { score += 1.5; reviewParts.push(`${fabric}好打理，机洗不变形，带娃也能穿`) }
      else if (fabric === '雪纺') { score += 0.3; reviewParts.push(`${fabric}要手洗比较麻烦，但上身效果好`) }
      if (pattern === '纯色') { score += 0.8; reviewParts.push(`纯色日常百搭，不挑场合`) }
    }

    // 通用设计基因加分
    s.designGenes.slice(0, 1).forEach(g => {
      score += 0.3
      reviewParts.push(`${g}这一点做得不错`)
    })

    score = Math.round(Math.min(10, Math.max(1, score)) * 100) / 100
    const verdict: BuyerPersona['verdict'] = score >= 7 ? 'strong' : score >= 5 ? 'neutral' : 'weak'

    const review = `作为${p.name}，我对「${name}」的整体感受是：${reviewParts.join('；')}。${
      verdict === 'strong' ? '综合来看非常适合我，会推荐给朋友。' :
      verdict === 'neutral' ? '整体还行，但还没到非买不可的程度。' :
      '不太适合我的需求，可能会继续看看别的。'
    }`

    return { ...p, fitScore: score, review, verdict }
  })

  // 排序：强匹配在前
  personas.sort((a, b) => b.fitScore - a.fitScore)
  const hitRate = personas.filter(p => p.verdict === 'strong').length / personas.length

  return {
    ...MOCK_SKILL4,
    dimensions: {
      '商品质量': { score: 4.2, issues },
      '尺码版型': { score: 3.5, issues: ['M码偏小', '腰围偏紧'] },
      '物流体验': { score: 4.6, issues: [] },
      '客服服务': { score: 4.4, issues: ['退换货流程慢'] },
      '性价比': { score: 4.1, issues: [] },
    },
    actionItems: [
      {
        priority: 'P0',
        problem: 'M码尺码偏小（17条差评明确提及）',
        count: 17,
        fix: '在 SKU 描述和详情页增加尺码提醒',
        fixTemplate: `【尺码提示】本款${s.name}版型偏小，建议身高160-165cm、体重105-115斤选M码，其余情况建议拍大一码。`,
        impact: '预计降低退货率 5–8%',
      },
      {
        priority: 'P1',
        problem: `${issues[0] ?? '色差'}问题（6条提及）`,
        count: 6,
        fix: '与供应商确认出货色卡，并在详情页增加拍摄说明',
        fixTemplate: '【拍摄说明】本商品为自然光实拍，图片颜色可能因屏幕色差有轻微偏差，以实物为准。',
        impact: '预计减少因色差引发的退货 30%',
      },
      {
        priority: 'P2',
        problem: `好评高频词未利用（${s.designGenes.slice(0, 2).map(g => `"${g.slice(0, 4)}"`).join('、')}出现率 >40%）`,
        count: 0,
        fix: '将这些关键词补充到标题中，同时在详情页卖点处强化',
        fixTemplate: `直接复制进标题：「${s.designGenes.slice(0, 2).map(g => g.slice(0, 4)).join('')}${s.attributes.neckline}${s.attributes.pattern}${s.name.slice(-3)}」`,
        impact: '预计提升搜索曝光量 10–15%',
      },
    ],
    goodKeywords: [...new Set([
      ...s.designGenes.map(g => g.slice(0, 4)),
      '显瘦', '气质',
    ])].slice(0, 5),
    personas,
    personaHitRate: hitRate,
  }
}

interface Skill5Context {
  style?: StyleCluster
  optimalPrice?: number     // 从 Skill 3
  costPrice?: number        // 从测款
}

/** 根据定价和成本计算推广诊断 */
export function buildSkill5(ctx: Skill5Context): Skill5Output {
  const price = ctx.optimalPrice ?? 169
  const cost = ctx.costPrice ?? 68
  const marginPerUnit = price - cost
  // maxPPC = 毛利 × 目标转化率(假设1%) × 目标ROI(2.0)
  const maxPPC = Math.round(marginPerUnit * 0.01 * 2 * 100) / 100
  const styleName = ctx.style?.name ?? '法式碎花裙'

  return {
    ...MOCK_SKILL5,
    budgetSuggestion: {
      dailyBudget: Math.min(300, Math.round(marginPerUnit * 3)),
      maxPPC: Math.max(0.5, maxPPC),
      peakHours: ['9:00–11:00', '20:00–23:00'],
    },
    keywordActions: [
      { keyword: `${ctx.style?.attributes.pattern ?? '碎花'}${ctx.style?.attributes.neckline ?? ''}连衣裙女`, spend: 280, orders: 1, roi: 0.7, action: 'pause', suggestion: `广泛词流量杂，建议暂停。改用更精准的「${styleName}2026」` },
      { keyword: '夏季裙子', spend: 150, orders: 0, roi: 0, action: 'pause', suggestion: '零转化，立即暂停' },
      { keyword: styleName, spend: 40, orders: 3, roi: 4.2, action: 'raise', suggestion: 'ROI 优质，建议出价从 1.2→1.8 元，抢前三排名' },
      { keyword: `${ctx.style?.attributes.neckline ?? 'V领'}连衣裙显瘦`, spend: 35, orders: 2, roi: 3.1, action: 'raise', suggestion: '高转化词，出价从 0.9→1.3 元' },
      ...(ctx.style?.trendSignals?.[0]?.includes('新中式') ? [{ keyword: '新中式连衣裙', spend: 0, orders: 0, roi: 0, action: 'add' as const, suggestion: '趋势词，建议新增，出价 0.8 元试投' }] : []),
    ],
    diagnosis: `ROI 偏低（1.8，行业均值 2.5）。按当前定价 ¥${price}、成本 ¥${cost}，单件毛利 ¥${marginPerUnit}，最大可承受 PPC ¥${maxPPC.toFixed(1)}`,
    projectedImprovement: `执行以上调整后，预计 ROI 从 1.8 提升至 2.6，月省广告费约 2,000 元`,
  }
}

interface Skill6Context {
  style?: StyleCluster
  priceSchedule?: { launchPrice: number; dailyPrice: number; promoFloor: number }
  costPrice?: number
  budgetSuggestion?: { dailyBudget: number }
}

/** 根据定价+推广数据生成促销方案 */
export function buildSkill6(ctx: Skill6Context): Skill6Output {
  const daily = ctx.priceSchedule?.dailyPrice ?? 199
  const floor = ctx.priceSchedule?.promoFloor ?? 149
  const cost = ctx.costPrice ?? 68
  const discount = Math.round((floor / daily) * 100) / 100
  const marginAtFloor = (floor - cost) / floor
  const adBudget = ctx.budgetSuggestion?.dailyBudget ?? 200

  const scenarios = [
    { label: '乐观（500件）', sales: 500, revenue: Math.round(floor * 500), profit: Math.round((floor - cost) * 500) },
    { label: '中性（300件）', sales: 300, revenue: Math.round(floor * 300), profit: Math.round((floor - cost) * 300) },
    { label: '悲观（150件）', sales: 150, revenue: Math.round(floor * 150), profit: Math.round((floor - cost) * 150) },
  ]

  return {
    eventType: '618 年中大促',
    optimalDiscount: discount,
    optimalPrice: floor,
    marginAtOptimal: Math.round(marginAtFloor * 100) / 100,
    expectedGMV: scenarios[1].revenue,
    timeline: [
      { phase: 'warmup', dates: '6月1日–6月15日', action: `预热期：¥${floor} 开放预购，加购送购物袋` },
      { phase: 'peak', dates: '6月16日–6月18日', action: `爆发期：¥${floor} 全力冲销量，直通车预算 ${adBudget} → ${adBudget * 2} 元/天` },
      { phase: 'aftermath', dates: '6月19日–6月21日', action: `返场期：恢复至 ¥${daily}，清尾货` },
    ],
    profitScenarios: scenarios,
    riskWarning: `若预热期加购量 < 50件，建议提前调整策略。大促底价 ¥${floor}，单件毛利 ¥${floor - cost}（毛利率 ${Math.round(marginAtFloor * 100)}%）`,
  }
}

export const MOCK_TESTING: TestingOutput = {
  input: {
    daysListed: 9,
    ctr: 4.2,
    cvr: 1.1,
    addToCartRate: 8.6,
    favoriteRate: 5.2,
    unitsSold: 31,
    dailySpend: 80,
    costPrice: 68,
  },
  score: 81,
  verdict: 'scale',
  confidence: 'high',
  dimensionScores: {
    ctrScore: 88,       ctrVsBenchmark: '+68%（行业均值 2.5%）',
    cvrScore: 79,       cvrVsBenchmark: '+38%（行业均值 0.8%）',
    addToCartScore: 85, addToCartVsBenchmark: '+59%（行业均值 5.4%）',
    roiScore: 76,       roiActual: 2.8,
  },
  scaleEstimate: {
    projectedMonthSales: 380,
    monthlyRevenue: 64220,
    monthlyProfit: 22400,
    breakEvenDays: 4,
  },
  recommendation: '各项指标均超行业均值，CTR 和加购率表现尤其突出，说明主图和标题组合已命中目标人群。建议立即放量补货，同时进入全面优化流程。',
  nextActions: [
    '立即向供应商补货 200–300 件（预计 4 天内回本）',
    '进入 Skill 2 上架优化，提升标题和主图质量以进一步拉高 CTR',
    '进入 Skill 3 智能定价，确认成长期日常价（当前测款价 ¥169 可维持）',
  ],
}
