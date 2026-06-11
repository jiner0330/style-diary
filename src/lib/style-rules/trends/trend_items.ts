/**
 * 流行趋势 - 2026春夏流行单品
 * 
 * ⚠️ 数据来源：训练数据中的时装周趋势知识
 *   高置信度条目来自多季延续的明显趋势
 *   建议用 Vogue Runway / Lyst Index / 小红书热词 校对补充
 */

import { TrendItem } from './types';

export const trendItems2026SS: TrendItem[] = [
  // ═══════════ 上衣 ═══════════
  {
    name: '透视薄纱上衣',
    categoryId: 'top_tank',
    heat: 9,
    why: 'SS26秀场覆盖率最高的单品之一，Saint Laurent / Dior / Prada均有出现。透视层叠T恤/吊带打造轻盈层次。',
    styleWith: ['内搭吊带/抹胸', '高腰阔腿裤', '百慕大短裤'],
    scenes: ['约会', '派对', '周末brunch'],
    confidence: 'model_inference',
    source: '训练数据 — 多季秀场渗透趋势',
  },
  {
    name: '解构白衬衫',
    categoryId: 'top_shirt',
    heat: 8,
    why: '不是普通白衬衫——不对称下摆、超长袖、斜襟设计。白衬衫从"基础款"变成"设计款"。',
    styleWith: ['直筒牛仔裤', '阔腿西裤', '半身长裙'],
    scenes: ['职场通勤', '周末brunch', '书店咖啡馆独处'],
    confidence: 'model_inference',
    source: '训练数据 — 衬衫解构化多季趋势',
  },
  {
    name: 'Polo衫回归',
    categoryId: 'top_tshirt',
    heat: 8,
    why: 'Miu Miu SS26重新定义Polo——修身短款、撞色滚边、针织材质。从老气→时髦的翻身仗。',
    styleWith: ['A字短裙', '百褶裙', '直筒牛仔裤'],
    scenes: ['日常休闲', '周末brunch', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — Miu Miu领衔的Polo复兴',
  },
  {
    name: '泡泡袖/羊腿袖上衣',
    categoryId: 'top_shirt',
    heat: 7,
    why: '体积感袖子持续多季不减。从连衣裙延伸到衬衫、T恤。搭配修身下装形成对比。',
    styleWith: ['直筒裤', '修身半裙', '高腰牛仔裤'],
    scenes: ['约会', '周末brunch', '派对'],
    confidence: 'model_inference',
    source: '训练数据 — 体积感袖子多季延续',
  },

  // ═══════════ 下装 ═══════════
  {
    name: '百慕大短裤',
    categoryId: 'bottom_shorts',
    heat: 9,
    why: '取代热裤成为新宠——长度到膝盖上方2-3寸，西装面料或牛仔，比热裤成熟比长裤凉快。',
    styleWith: ['修身针织衫', 'Polo衫', '宽松衬衫', '乐福鞋', '渔网芭蕾鞋'],
    scenes: ['职场通勤', '逛街', '周末brunch'],
    confidence: 'model_inference',
    source: '训练数据 — 百慕大短裤多季秀场高频',
  },
  {
    name: '拖地阔腿牛仔裤',
    categoryId: 'bottom_jeans',
    heat: 9,
    why: '比普通阔腿裤更长更宽——裤脚完全盖住鞋面甚至拖地。搭配厚底鞋或高跟鞋撑起长度。',
    styleWith: ['修身短上衣', '紧身背心', '厚底运动鞋', '尖头高跟鞋'],
    scenes: ['日常休闲', '逛街', '周末brunch', '书店咖啡馆独处'],
    confidence: 'model_inference',
    source: '训练数据 — 超长阔腿多季主流',
  },
  {
    name: '工装降落伞裤',
    categoryId: 'bottom_joggers',
    heat: 8,
    why: '多口袋、束脚、尼龙面料的工装裤。Gorpcore/山系风格的核心单品，从户外进入日常。',
    styleWith: ['紧身背心', '宽松T恤', '冲锋衣', 'Salomon/登山鞋'],
    scenes: ['日常休闲', '户外', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — 工装/gorpcore风格延续',
  },
  {
    name: '缎面/真丝半裙',
    categoryId: 'bottom_skirt',
    heat: 8,
    why: '光泽质感半裙——从晚宴下沉到日常。搭配宽松毛衣（秋冬）或T恤（春夏），反差感就是时髦。',
    styleWith: ['宽松毛衣', '纯色T恤', '西装外套', '短靴', '尖头鞋'],
    scenes: ['约会', '晚宴', '派对', '职场通勤'],
    confidence: 'model_inference',
    source: '训练数据 — 光泽半裙多季延续',
  },

  // ═══════════ 外套 ═══════════
  {
    name: '宽肩大廓形西装',
    categoryId: 'outer_blazer',
    heat: 9,
    why: '80年代权力套装回潮——肩宽+3-5cm，廓形偏大，长度过臀。搭配一切（连帽卫衣、吊带裙、牛仔裤）。',
    styleWith: ['直筒牛仔裤', '缎面吊带裙', '百慕大短裤', '乐福鞋', '尖头高跟鞋'],
    scenes: ['职场通勤', '约会', '周末brunch'],
    confidence: 'model_inference',
    source: '训练数据 — 宽肩西装多季主导趋势',
  },
  {
    name: '麂皮/皮革衬衫外套',
    categoryId: 'outer_shirt_jacket',
    heat: 7,
    why: '软皮革或麂皮材质的衬衫式外套——比硬皮夹克柔软、比衬衫有存在感。棕色最经典。',
    styleWith: ['白T', '直筒牛仔裤', '缎面裙', '高领打底'],
    scenes: ['约会', '周末brunch', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — 皮革柔软化趋势',
  },

  // ═══════════ 连衣裙 ═══════════
  {
    name: '钩针/蕾丝连衣裙',
    categoryId: 'dress_slip',
    heat: 8,
    why: '波西米亚复兴的核心单品——手工钩针、镂空蕾丝、流苏装饰。Chloé SS26领衔，度假/brunch/约会通吃。',
    styleWith: ['平底凉鞋', '草编包', '草帽', '牛仔靴'],
    scenes: ['度假', '海边', '周末brunch', '约会'],
    confidence: 'model_inference',
    source: '训练数据 — Chloé领衔的波西米亚复兴',
  },
  {
    name: '极简吊带长裙',
    categoryId: 'dress_slip',
    heat: 7,
    why: '90年代简约吊带裙回归——细吊带、直筒或微A廓形、及踝长度。搭配T恤/衬衫叠穿，或单穿配夸张配饰。',
    styleWith: ['内搭白T', '西装外套', '细高跟', '夸张项链'],
    scenes: ['约会', '派对', '晚宴', '度假'],
    confidence: 'model_inference',
    source: '训练数据 — 90年代极简主义回归',
  },

  // ═══════════ 鞋 ═══════════
  {
    name: '渔网/蕾丝芭蕾鞋',
    categoryId: 'shoes_flats',
    heat: 10,
    why: 'Alaïa渔网芭蕾鞋引爆全球。透明网状鞋面+经典芭蕾鞋型。传统芭蕾鞋的升级版，搭配一切。',
    styleWith: ['牛仔裤', '阔腿西裤', '连衣裙', '百慕大短裤'],
    scenes: ['日常休闲', '职场通勤', '约会', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — Alaïa mesh flats现象级单品',
  },
  {
    name: '厚底人字拖/渔夫凉鞋',
    categoryId: 'shoes_sandals',
    heat: 8,
    why: 'The Row / Khaite带火的"丑凉鞋"趋势——厚底、宽绑带、实用主义。越丑越时髦的反逻辑。',
    styleWith: ['阔腿裤', '百慕大短裤', '长裙', '亚麻套装'],
    scenes: ['度假', '逛街', '日常休闲'],
    confidence: 'model_inference',
    source: '训练数据 — 丑凉鞋/渔夫凉鞋持续升温',
  },
  {
    name: '尖头小猫跟',
    categoryId: 'shoes_heels',
    heat: 7,
    why: '3-5cm小跟+尖头——比细高跟舒适、比平底鞋精致。"Office Siren"风格的核心鞋款。',
    styleWith: ['铅笔裙', '阔腿西裤', '直筒牛仔裤', '缎面裙'],
    scenes: ['职场通勤', '约会', '晚宴'],
    confidence: 'model_inference',
    source: '训练数据 — 小猫跟多季稳定趋势',
  },

  // ═══════════ 配饰 ═══════════
  {
    name: '超大托特/帆布包',
    categoryId: 'acc_bag_tote',
    heat: 8,
    why: 'XXL包袋——大到可以装下半个衣橱。软皮或厚帆布。和紧身/修身穿搭形成体量对比。',
    styleWith: ['紧身连衣裙', '修身西装', '牛仔裤+T恤'],
    scenes: ['职场通勤', '逛街', '旅行'],
    confidence: 'model_inference',
    source: '训练数据 — XXL包袋趋势',
  },
  {
    name: '细框眼镜（平光/蓝光）',
    categoryId: 'acc_sunglasses',
    heat: 9,
    why: '金色/银色细框眼镜——知识分子风、Office Siren、Quiet Luxury三大风格的共同配饰。',
    styleWith: ['宽松西装', '高领针织', '白衬衫', '直筒西裤'],
    scenes: ['职场通勤', '书店咖啡馆独处', '日常休闲'],
    confidence: 'model_inference',
    source: '训练数据 — 细框眼镜多风格渗透',
  },
  {
    name: '金属大圈耳环/雕塑耳饰',
    categoryId: '',  // 配饰无对应品类
    heat: 7,
    why: '极简穿搭+夸张耳饰=2026最省力的搭配公式。金属雕塑感耳环撑起全脸的视觉焦点。',
    styleWith: ['纯色基础款', '全黑穿搭', '白衬衫'],
    scenes: ['约会', '派对', '晚宴', '职场通勤'],
    confidence: 'model_inference',
    source: '训练数据 — 夸张耳饰持续趋势',
  },
];
