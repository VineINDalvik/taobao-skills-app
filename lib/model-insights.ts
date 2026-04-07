import type { ModelInsight } from './types'

export const MODEL_INSIGHTS: Record<number, ModelInsight> = {
  1: {
    skillId: 1,
    title: 'AI 找款 — 核心输出：S/A/B 销量潜力 + 簇级日销带 + 测款 SOP',
    steps: [
      {
        label: 'L1 对齐（淘宝侧相似款）',
        detail: '视觉/属性 embedding + FAISS：把「要跟的款」映射到淘宝可观测商品群',
        durationMs: 900,
        result: '命中 3 个主风格簇，每簇样本量 41–156 不等',
      },
      {
        label: 'L2 分簇与语义标签',
        detail: '多目的风格聚类 + 属性组合桶，确定你落在哪一族 Mood/场景',
        durationMs: 650,
        result: '输出簇 ID、竞争密度、簇内热销结构（色/版型）',
      },
      {
        label: 'L3 趋势环境（趋势过滤引擎）',
        detail: '近30天热度 + 近7天加速度 + 竞争变化，过滤一过性假爆款',
        durationMs: 700,
        result: '标注趋势真实性；外站/种草信号仅作弱先验',
      },
      {
        label: 'L4 GATv2+LightGBM：S/A/B 分级 + 簇级日销带',
        detail: '图网络与梯度提升融合 → 离散三档（高/中/弱销量潜力）+ 连续趋势分；并联合同簇 P25–P75 统计校准',
        durationMs: 1100,
        result: '每簇必有 S/A/B + 趋势分 + 日销区间 + 置信度；再生成测款 SKU 与止损规则',
      },
      {
        label: '货源提示（可选）',
        detail: '1688 以图近似匹配；与「淘宝可卖性」解耦，无货仍可先看簇值不值得测',
        durationMs: 400,
        result: '匹配 / 弱匹配 / 未知 三态说明',
      },
    ],
    algorithmCards: [
      {
        name: 'S/A/B 销量潜力头（主输出）',
        desc: '商家第一眼决策档：S=优先测款与备货试探，A=小单+止损，B=强差异或长尾。与簇级 P25–P75 区间同源不同形（离散档 vs 连续带）',
        metric: 'Dress 类目 S_F1=0.59',
        source: 'GATv2 + LightGBM 融合头',
      },
      {
        name: 'GATv2 图神经网络',
        desc: '在簇内/簇间关系图上融合视觉与属性，输出分级与风险；簇级区间由同类样本聚合校准',
        metric: 'S_F1=0.59 · Spearman=0.54',
        source: 'ai-selection 真实电商数据验证',
      },
      {
        name: 'FAISS 向量检索',
        desc: '以图/以链接触发：把跟款目标对齐到淘宝「同 Mood」商品群，解决单 SKU 冷启动',
        metric: '检索延迟 <50ms',
        source: '自研聚类引擎',
      },
      {
        name: '趋势过滤引擎',
        desc: '区分"真实上升"和"短暂噪音"：score = heat × richness × conversion，三维度交叉验证',
        source: '趋势过滤引擎',
      },
      {
        name: '延伸设计引擎',
        desc: '找到爆款后，保留/替换"爆款基因"元素，自动生成低/中/高风险三个延伸方向',
        source: '延伸设计引擎',
      },
    ],
    dataSource: '数据来源：2,847 款女装连衣裙商品库（含 visual_embeddings.npz + 54期商品快照）',
  },

  2: {
    skillId: 2,
    title: '上架优化 — 内容生成引擎',
    steps: [
      {
        label: '读取 Skill 1 属性 + Skill 4 好评词',
        detail: '融合选款属性标签与历史好评高频词作为生成素材',
        durationMs: 400,
        result: '融合 5 个好评词（显瘦/气质/面料好…）+ 8 个属性标签',
      },
      {
        label: '通义千问 qwen-max 标题生成',
        detail: '分别生成搜索导向、种草导向、活动导向三版标题',
        durationMs: 1100,
        result: '3 版标题，关键词覆盖率目标 >85%',
      },
      {
        label: '主图方案规划',
        detail: '基于类目最优主图结构，输出 5 张主图的构图和文案指导',
        durationMs: 700,
        result: '5 张主图方案（首图→细节→尺码→场景→促销）',
      },
      {
        label: '详情页文案 + SKU 建议',
        detail: '生成 Hook+卖点+场景+FAQ，预测最热 SKU 组合',
        durationMs: 900,
        result: '完整上架包 + 直通车初始关键词清单',
      },
    ],
    algorithmCards: [
      {
        name: '通义千问 qwen-max',
        desc: '淘宝生态原生 LLM，对中文电商语境理解更准确，用于标题/文案等自然语言生成任务',
      },
      {
        name: 'SKU 热销预测',
        desc: '基于同类目历史销售数据中 SKU 结构分布（颜色×尺码矩阵），预测当前商品的热销 SKU 组合',
        metric: '预测准确率约 72%',
      },
      {
        name: '评价关键词反哺',
        desc: 'Skill 4 提取的好评高频词（显瘦、气质）自动注入标题生成 prompt，形成用户语言→内容闭环',
        source: '自动对标引擎',
      },
    ],
    dataSource: '数据来源：类目 Top 500 商品标题结构分析 + 同款 300 条用户评价语义库',
  },

  3: {
    skillId: 3,
    title: '智能定价 — DID + Lagrangian 四重算法',
    steps: [
      {
        label: '加载竞品价格数据',
        detail: '同类目 20 个竞品的价格分布、销量、历史调价记录',
        durationMs: 500,
        result: '竞品价格区间 ¥139–¥269，均值 ¥189',
      },
      {
        label: 'LightGBM 价格弹性预测（冷启动）',
        detail: '特征：log价格、类目均价、竞争密度、库存深度、上架天数\n训练集：同类目有调价历史商品的 DID 弹性结果',
        durationMs: 1000,
        result: 'β = -1.8（置信度：中）—— 降价 1%，销量 +1.8%',
      },
      {
        label: '拉格朗日对偶优化',
        detail: 'max P·Q(P) + α·Q(P)，Q(P)=Q₀·(P/P₀)^β\n枚举 20 个价格档位（¥120–¥219），硬约束：毛利率 ≥ 30%',
        durationMs: 800,
        result: 'P*=¥169（月利润 ¥6,500 > 任意其他价格点）',
      },
      {
        label: '三层风控校验',
        detail: 'Hard Block（负毛利拦截）→ Soft Warning（深降价警告）→ Circuit Breaker（熔断判断）',
        durationMs: 400,
        result: '通过风控，输出最终建议价 ¥169',
      },
    ],
    algorithmCards: [
      {
        name: 'DID 双重差分（有调价历史时）',
        desc: '弹性 = [(Q后-Q前)-(Q后\'-Q前\')] / ΔP，剥离季节性和自然增长趋势，得到真实价格弹性',
        source: '运筹学定价引擎',
      },
      {
        name: 'LightGBM 冷启动弹性',
        desc: '新品无调价历史时，用 log价格/竞争密度/库存深度等特征预测 β，置信度分高/中/低三档',
        metric: 'MAPE < 30% → 置信度高；30-50% → 中；> 50% → 低',
      },
      {
        name: '拉格朗日对偶优化',
        desc: '目标：max GMV，约束：毛利率 ≥ target。含库存紧迫因子 α（库存越多 → α 越大 → 倾向降价清仓）',
        metric: '离散枚举 20 个价格档位，暴力搜索，无局部最优问题',
        source: '运筹学定价引擎',
      },
      {
        name: '三层风控护栏',
        desc: 'Hard Block: 负毛利强制拦截；Soft Warning: 降幅>15pt 标黄；Circuit Breaker: 调价后次日销量降>15% 自动回滚',
      },
    ],
    dataSource: '数据来源：同类目 20 个竞品价格快照 + GATv2 模型对同属性组合的历史退货率预测',
  },

  4: {
    skillId: 4,
    title: '评价诊断 — 情感分析 + 优先级规则引擎',
    steps: [
      {
        label: '评价文本预处理',
        detail: '分句、去停用词、提取问题实体（尺码/面料/色差/物流…）',
        durationMs: 500,
        result: '328 条评价 → 解析出 12 类问题实体',
      },
      {
        label: 'LLM 情感分类（通义千问）',
        detail: '将评价文本分类为正面/负面/中性，提取具体问题描述',
        durationMs: 1100,
        result: '好评率 82%，发现 3 类高频问题',
      },
      {
        label: 'P0/P1/P2 优先级规则判定',
        detail: 'P0: ≥15条同类问题 OR 影响退货率；P1: 5-14条；P2: 好评词未被利用',
        durationMs: 300,
        result: '1 个 P0（尺码偏小 17 条）+ 1 个 P1 + 1 个 P2',
      },
      {
        label: '修复模板生成 + 好评词提取',
        detail: '从模板库中匹配修复方案，提取高频好评词回传 Skill 2',
        durationMs: 600,
        result: '生成 3 个可直接复制的修复模板',
      },
    ],
    algorithmCards: [
      {
        name: '通义千问 情感分析',
        desc: '非结构化评价文本适合 LLM 处理，批量分类 + 问题实体抽取，相比规则更能理解隐性抱怨',
      },
      {
        name: 'P0/P1/P2 规则引擎',
        desc: '优先级判定用明确规则，不用模型：条数阈值 + 影响指标（退货率/复购率）决定优先级',
      },
      {
        name: '爆款 vs 当前款对标',
        desc: '自动找同类目近期爆款，对比：差评关键词重叠度、主图风格差异、价格带差异',
        source: '自动对标引擎',
      },
      {
        name: '好评词→内容反哺',
        desc: '高频好评词（显瘦/气质/面料好）自动回传 Skill 2，下次生成标题时优先注入',
      },
    ],
    dataSource: '数据来源：328 条真实买家评价（含 17 条 P0 差评，主要集中于尺码问题）',
  },

  5: {
    skillId: 5,
    title: '推广诊断 — ROI 规则引擎 + 关键词分类',
    steps: [
      {
        label: '加载直通车数据',
        detail: '解析关键词维度报表：花费 / 展现量 / 点击量 / 成交金额',
        durationMs: 400,
        result: '5 个关键词，总花费 ¥505/天，总成交 6 单',
      },
      {
        label: '计算各关键词 ROI',
        detail: 'ROI = 成交金额 / 花费，标记 0 转化和高花费低转化词',
        durationMs: 300,
        result: '发现 2 个"烧钱黑洞"（ROI<1，共浪费 ¥430/天的 35%）',
      },
      {
        label: '关键词分类 + 操作建议',
        detail: '规则：高花费低转化→暂停；低花费高转化→加价；空白趋势词→新增',
        durationMs: 500,
        result: '2 暂停 + 2 加价 + 1 新增',
      },
      {
        label: 'ROI 提升预测 + 预算重分配',
        detail: '基于弹性模型预测调整后的 ROI，计算预算节省额',
        durationMs: 600,
        result: 'ROI 预测提升 1.8 → 2.6，月省广告费 ¥2,000',
      },
    ],
    algorithmCards: [
      {
        name: 'ROI 规则分类器',
        desc: '关键词分类用明确规则，不需要模型：ROI<1 且花费>50 = 暂停；ROI>3 = 加价；0花费趋势词 = 新增',
      },
      {
        name: '利润上限约束',
        desc: '最高可承受 PPC（每次点击成本）= 客单价 × CVR × 目标 ROI 倒数。从 Skill 3 成本模型自动获取',
      },
      {
        name: '峰值时段识别',
        desc: '基于同类目购买时间分布：女装类 9-11 点早间流量 + 20-23 点夜间流量最高，建议集中出价',
      },
    ],
    dataSource: '数据来源：直通车 30 天关键词维度报表（含花费/展现/点击/成交数据）',
  },

  6: {
    skillId: 6,
    title: '活动促销 — OR 驱动的大促方案',
    steps: [
      {
        label: '读取 Skill 3 成本结构',
        detail: '从定价模型获取：成本价、毛利底线、价格弹性 β',
        durationMs: 300,
        result: '成本 ¥68，毛利底线 30%，β = -1.8',
      },
      {
        label: '需求弹性估算（大促场景）',
        detail: '大促折扣每降 10%，转化率提升约 28-35%（类目历史大促数据）',
        durationMs: 600,
        result: '618 折扣弹性：降价 15pt → 销量×4.2 倍',
      },
      {
        label: 'Lagrangian 对偶优化（大促版）',
        detail: 'max Σ(discount × demand(discount))，约束：毛利 ≥ target，价格 ≥ 成本×1.1',
        durationMs: 900,
        result: '最优折扣：85折（¥169），预测销量 420件，GMV ¥71,000',
      },
      {
        label: '活动节奏规划 + 风险场景',
        detail: '预热期/爆发期/返场期三段时间线，三个销量情景（乐观/中性/悲观）',
        durationMs: 500,
        result: '中性场景利润 ¥19,200（超目标 ¥15,000，✓）',
      },
    ],
    algorithmCards: [
      {
        name: 'OR 约束优化（多约束）',
        desc: 'maximize GMV，三个约束：(1) 每件不亏 (2) 总毛利 ≥ 目标 (3) 价格步长 5%。离散暴力枚举，数学全局最优',
        source: '运筹学定价引擎',
      },
      {
        name: 'Lagrangian 对偶分解',
        desc: '将毛利约束松弛为拉格朗日乘子，在库存紧迫性 α 和利润目标 λ 的双重约束下求解最优价格点',
      },
      {
        name: '三情景利润预测',
        desc: '乐观/中性/悲观三档销量假设，基于大促历史数据中同类目 P10/P50/P90 销量分位数',
      },
    ],
    dataSource: '数据来源：Skill 3 定价模型 + Skill 5 推广效率 + 类目 618 历史大促数据（成交转化提升幅度）',
  },
}
