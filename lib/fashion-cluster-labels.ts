export type SemanticGroup = '类目' | '风格' | '版型' | '材质' | '图案'

export type FashionClusterLabelDef = {
  id: string
  label: string
  group: SemanticGroup
  keywords: string[]
}

export const FASHION_CLUSTER_LABELS: FashionClusterLabelDef[] = [
  { id: 'dress', label: '连衣裙', group: '类目', keywords: ['dress', 'robe', '连衣裙', '裙装'] },
  { id: 'skirt', label: '半裙', group: '类目', keywords: ['skirt', 'jupe', '半裙', '裙子'] },
  { id: 'tops', label: '上衣', group: '类目', keywords: ['top', 'shirt', 'blouse', '上衣', '衬衫', 't恤'] },
  { id: 'set', label: '套装', group: '类目', keywords: ['set', 'coord', 'co-ord', '套装', '两件套'] },
  { id: 'swimwear', label: '泳装', group: '类目', keywords: ['bikini', 'maillot', 'swim', 'bain', '泳装', '比基尼'] },
  { id: 'resort', label: '度假穿搭', group: '类目', keywords: ['beach', 'plage', 'resort', '度假', '海边'] },
  { id: 'partywear', label: '派对礼服', group: '类目', keywords: ['party', 'evening', 'gala', '礼服', '晚装'] },
  { id: 'workwear', label: '通勤单品', group: '类目', keywords: ['office', 'workwear', 'commute', '通勤', '职场'] },
  { id: 'streetwear', label: '街头单品', group: '类目', keywords: ['street', 'urban', '街头', '潮流'] },
  { id: 'accessories', label: '配饰/杂项', group: '类目', keywords: ['accessory', 'jewelry', 'shoes', '配饰', '饰品', '鞋', '杂项'] },

  { id: 'minimal', label: '极简高级', group: '风格', keywords: ['minimal', 'clean', '极简', '简洁', '高级感'] },
  { id: 'sweet', label: '甜妹少女', group: '风格', keywords: ['sweet', 'girly', '甜美', '少女'] },
  { id: 'french', label: '法式优雅', group: '风格', keywords: ['french', 'paris', '法式', '优雅'] },
  { id: 'sexy', label: '性感魅力', group: '风格', keywords: ['sexy', 'club', 'bodycon', '性感', '夜店', '派对'] },
  { id: 'retro', label: '复古复刻', group: '风格', keywords: ['retro', 'vintage', '复古'] },
  { id: 'y2k', label: '美式辣妹 / Y2K', group: '风格', keywords: ['y2k', '辣妹', '千禧', '美式'] },
  { id: 'vacation', label: '休闲度假', group: '风格', keywords: ['tropical', 'island', 'vacation', '海岛', '度假风', '休闲'] },
  { id: 'basic', label: '基础百搭', group: '风格', keywords: ['basic', 'essential', 'casual', '基础款', '百搭', '日常'] },
  { id: 'athflow', label: '运动休闲', group: '风格', keywords: ['sport', 'athleisure', '运动', '休闲'] },
  { id: 'quietluxury', label: '轻奢质感', group: '风格', keywords: ['luxury', 'premium', '轻奢', '质感'] },

  { id: 'slim', label: '修身包裹', group: '版型', keywords: ['bodycon', 'slim', 'fitted', '修身', '紧身'] },
  { id: 'a-line', label: 'A字廓形', group: '版型', keywords: ['a-line', 'a字', '伞摆'] },
  { id: 'wrap', label: '裹身结构', group: '版型', keywords: ['wrap', '裹身', '围裹'] },
  { id: 'cropped', label: '短款上提', group: '版型', keywords: ['cropped', 'crop', '短款', '短上衣'] },
  { id: 'maxi', label: '长款拖地', group: '版型', keywords: ['maxi', 'full length', '长款', '拖地'] },
  { id: 'midi', label: '中长线条', group: '版型', keywords: ['midi', 'mid length', '中长款'] },
  { id: 'mini', label: '迷你短线', group: '版型', keywords: ['mini', '短裙', '迷你'] },
  { id: 'halter', label: '挂脖吊带', group: '版型', keywords: ['halter', 'cami', 'tank', '挂脖', '吊带', '背心'] },
  { id: 'off-shoulder', label: '露肩挖空', group: '版型', keywords: ['off shoulder', 'cutout', '露肩', '挖空'] },

  { id: 'denim', label: '牛仔', group: '材质', keywords: ['denim', 'jean', '牛仔'] },
  { id: 'knit', label: '针织', group: '材质', keywords: ['knit', 'rib', '针织', '罗纹'] },
  { id: 'lace', label: '蕾丝', group: '材质', keywords: ['lace', '蕾丝'] },
  { id: 'mesh', label: '网纱', group: '材质', keywords: ['mesh', 'tulle', '网纱', '薄纱'] },
  { id: 'satin', label: '缎面', group: '材质', keywords: ['satin', 'silk', '缎面', '真丝'] },
  { id: 'chiffon', label: '雪纺', group: '材质', keywords: ['chiffon', '雪纺'] },
  { id: 'linen', label: '亚麻', group: '材质', keywords: ['linen', 'flax', '亚麻'] },
  { id: 'leather', label: '皮感', group: '材质', keywords: ['leather', 'pu', '皮革', '皮感'] },
  { id: 'sequin', label: '亮片闪面', group: '材质', keywords: ['sequin', 'shimmer', 'glitter', '亮片', '闪片'] },

  { id: 'solid', label: '纯色基础', group: '图案', keywords: ['solid', 'plain', '纯色'] },
  { id: 'floral', label: '碎花印花', group: '图案', keywords: ['floral', 'fleur', 'flower', '碎花', '花卉'] },
  { id: 'stripe', label: '条纹', group: '图案', keywords: ['stripe', 'striped', '条纹'] },
  { id: 'plaid', label: '格纹', group: '图案', keywords: ['plaid', 'check', '格纹', '格子'] },
  { id: 'dots', label: '波点', group: '图案', keywords: ['dot', 'polka', '波点'] },
  { id: 'animal', label: '动物纹', group: '图案', keywords: ['leopard', 'zebra', 'snake', 'animal', '豹纹', '斑马纹'] },
  { id: 'gradient', label: '渐变扎染', group: '图案', keywords: ['gradient', 'tie dye', '扎染', '渐变'] },
  { id: 'contrast', label: '撞色拼接', group: '图案', keywords: ['contrast', 'colorblock', '撞色', '拼接'] },
  { id: 'embellished', label: '装饰细节', group: '图案', keywords: ['ruffle', 'pleat', 'bow', 'frill', '荷叶边', '百褶', '蝴蝶结'] },
]
