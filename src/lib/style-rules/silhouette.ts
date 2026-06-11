/**
 * 穿搭规则库 - 版型/廓形规则
 * 
 * 核心原则：
 * 1. 上宽下窄 / 上紧下松 — 只松一侧
 * 2. 高腰线原则
 * 3. 露肤区域只有一个视觉焦点
 */

import { StyleRule } from './types';

export const silhouetteRules: StyleRule[] = [
  // ═══════════ 松紧平衡 ═══════════
  {
    id: 'sil_001',
    module: 'silhouette',
    rule: '上宽下窄',
    desc: '宽松上衣 + 修身/紧身/直筒下装。上半身的量感用下半身的利落来收。最通用的版型公式。',
    condition: [
      { field: '上装.版型', op: 'in', value: ['宽松', 'oversized'] },
      { field: '下装.版型', op: 'in', value: ['修身', '紧身', '合身'] },
    ],
    conditionLogic: 'AND',
    type: 'must',
    gender: 'unisex',
    priority: 10,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    sceneOverrides: [
        {
                'scene': '骑行',
                'action': 'suppress',
                'reason': '骑行服上紧下紧为空气动力学需求'
        },
        {
                'scene': '运动',
                'action': 'downgrade',
                'overrideType': 'prefer',
                'reason': '运动场景上下同紧（如瑜伽套装）可接受'
        }
],
    tags: ['版型', '上下平衡', '经典', '通用'],
    examples: [
      'oversized卫衣 + 紧身牛仔裤',
      '宽松衬衫 + 修身西裤',
      '大廓形毛衣 + 直筒半裙',
    ],
  },
  {
    id: 'sil_002',
    module: 'silhouette',
    rule: '上紧下松',
    desc: '紧身/修身上衣 + 宽松下装（阔腿裤/百褶裙/A字裙）。适合上半身线条好、想强调腰线的人。',
    condition: [
      { field: '上装.版型', op: 'in', value: ['紧身', '修身'] },
      { field: '下装.版型', op: 'in', value: ['宽松', 'oversized'] },
    ],
    conditionLogic: 'AND',
    type: 'prefer',
    gender: 'female',
    priority: 8,
    season: ['春', '夏', '秋'],
    scenes: [],
    tags: ['版型', '上下平衡', '女性化', '腰线'],
    examples: [
      '修身针织衫 + 阔腿裤',
      '紧身T恤 + A字半裙',
      '修身打底 + 百褶裙',
    ],
  },
  {
    id: 'sil_003',
    module: 'silhouette',
    rule: '避免上下同宽/同松',
    desc: '上下装都宽松或都紧身，前者显臃肿邋遢，后者显局促。至少一侧有松紧对比。',
    condition: [
      { field: '上装.版型', op: 'eq', value: '宽松' },
      { field: '下装.版型', op: 'in', value: ['宽松', 'oversized'] },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'unisex',
    priority: 9,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['版型', '避雷', '比例'],
    examples: [],
  },
  {
    id: 'sil_004',
    module: 'silhouette',
    rule: '外套松紧适配内搭',
    desc: '外套版型应比内搭大半号到一号。修身外套 + 宽松内搭 = 局促；修身内搭 + 宽松外套 = 从容。',
    condition: { field: '外套.版型', op: 'neq', value: '应比内搭紧' },
    type: 'must',
    gender: 'unisex',
    priority: 9,
    season: ['秋', '冬'],
    scenes: [],
    tags: ['外套', '层次', '版型'],
    examples: [
      '修身打底 + oversized西装外套',
      '合身毛衣 + 宽松风衣',
    ],
    conflicts: ['sil_013'],
  },

  // ═══════════ 腰线 ═══════════
  {
    id: 'sil_005',
    module: 'silhouette',
    rule: '高腰线原则',
    desc: '通过高腰下装、塞衣角、腰带等方式提高视觉腰线位置。腰线 = 上半身:下半身 ≈ 3:5 接近黄金比。',
    condition: { field: '搭配.腰线位置', op: 'eq', value: '高腰' },
    type: 'prefer',
    gender: 'unisex',
    priority: 10,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['腰线', '比例', '显高', '显瘦'],
    examples: [
      '衬衫前塞 + 高腰西裤',
      '短款毛衣 + 高腰牛仔裤',
      'T恤全塞 + 高腰A字裙',
    ],
  },
  {
    id: 'sil_006',
    module: 'silhouette',
    rule: '长上装必须露腰线',
    desc: '盖过臀部的长款上衣/外套，必须用腰带或敞开穿来标记腰线位置，否则压身高。',
    condition: [
      { field: '上装.长度', op: 'in', value: ['中长', '长款'] },
      { field: '搭配.腰线标记', op: 'eq', value: '无' },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'unisex',
    priority: 9,
    season: ['春', '秋', '冬'],
    scenes: [],
    tags: ['腰线', '避雷', '比例'],
    examples: [],
  },

  // ═══════════ 露肤平衡（女生为主） ═══════════
  {
    id: 'sil_007',
    module: 'silhouette',
    rule: '一个露肤焦点',
    desc: '露腿不露胸、露背不露腿、露肩不露背——全身只有一个视觉暴露区。多个露肤区域同时出现容易显廉价。',
    condition: { field: '全身.露肤区域数量', op: 'between', value: ['0', '1'] },
    type: 'must',
    gender: 'female',
    priority: 9,
    season: ['春', '夏'],
    scenes: [],
    sceneOverrides: [
        {
                'scene': '运动',
                'action': 'suppress',
                'reason': '运动背心+短裤同时露肤为功能需求'
        },
        {
                'scene': '骑行',
                'action': 'suppress',
                'reason': '骑行短裤+短袖为功能需求'
        },
        {
                'scene': '健身',
                'action': 'suppress',
                'reason': '健身穿搭露肤为功能需求'
        },
        {
                'scene': '户外',
                'action': 'suppress',
                'reason': '户外运动露肤为散热需求'
        }
],
    tags: ['露肤', '焦点', '得体'],
    examples: [
      '露肩上衣 + 长裤',
      '短裙 + 不露肩的上衣',
      '露背连衣裙 + 其他保守',
    ],
  },
  {
    id: 'sil_008',
    module: 'silhouette',
    rule: '上露下不露 / 下露上不露',
    desc: '上装露肤（吊带/一字肩/背心）时下装选长款；下装短款时上装选常规领口，不低胸。',
    condition: [
      { field: '下装.长度', op: 'in', value: ['短款'] },
      { field: '上装.领口', op: 'in', value: ['低胸', '大领口', '露肩'] },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'female',
    priority: 8,
    season: ['夏'],
    scenes: [],
    tags: ['露肤', '平衡'],
    examples: [],
  },

  // ═══════════ 长度关系 ═══════════
  {
    id: 'sil_009',
    module: 'silhouette',
    rule: '外套不长于裙摆（短裙时）',
    desc: '穿短裙/短裤时，外套长度不超过下装长度。长外套+短下装组合吃腿，显矮。',
    condition: [
      { field: '下装.长度', op: 'in', value: ['短款'] },
      { field: '外套.长度', op: 'in', value: ['中长', '长款'] },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'unisex',
    priority: 8,
    season: ['春', '秋'],
    scenes: [],
    tags: ['长度', '比例', '避雷'],
    examples: [],
  },
  {
    id: 'sil_010',
    module: 'silhouette',
    rule: '长外套+长下装比例协调',
    desc: '长款外套（过膝）搭配长裤/长裙时，下装长度需露出脚踝上方，保留"呼吸感"。全裹住显沉闷。',
    condition: [
      { field: '外套.长度', op: 'eq', value: '长款' },
      { field: '下装.长度', op: 'in', value: ['常规', '中长'] },
    ],
    conditionLogic: 'AND',
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['秋', '冬'],
    scenes: [],
    tags: ['长度', '外套', '比例'],
    examples: [
      '过膝大衣 + 九分西裤 + 短靴',
      '长款风衣 + 直筒牛仔裤露脚踝',
    ],
  },
  {
    id: 'sil_011',
    module: 'silhouette',
    rule: '男生T恤长度不过臀中线',
    desc: '男生T恤下摆过臀显腿短、比例五五。正确长度：自然状态下在裤腰下方2-5cm。',
    condition: { field: '上衣.长度', op: 'in', value: ['中长', '长款'] },
    type: 'avoid',
    gender: 'male',
    priority: 8,
    season: ['春', '夏', '秋'],
    scenes: [],
    tags: ['男生', '长度', '比例'],
    examples: [],
  },

  // ═══════════ 叠穿版型 ═══════════
  {
    id: 'sil_012',
    module: 'silhouette',
    rule: '內紧外松',
    desc: '叠穿时内层修身或紧身，外层逐步放宽。内层太松会在外层下形成褶皱鼓包。',
    condition: [
      { field: '内层.版型', op: 'in', value: ['紧身', '修身'] },
      { field: '外层.版型', op: 'in', value: ['合身', '宽松', 'oversized'] },
    ],
    conditionLogic: 'AND',
    type: 'must',
    gender: 'unisex',
    priority: 9,
    season: ['秋', '冬'],
    scenes: [],
    tags: ['叠穿', '层次', '版型'],
    examples: [
      '修身打底 + 宽松衬衫外套',
      '薄款高领打底 + 合身圆领毛衣 + 宽松大衣',
    ],
  },
  {
    id: 'sil_013',
    module: 'silhouette',
    rule: '衬衫叠穿开扣原则',
    desc: '衬衫作为中间层叠穿时，扣子解开营造V区延伸颈部线条，避免衬衫领+外套领双重压迫感。',
    condition: { field: '衬衫.作为中间层', op: 'eq', value: '是' },
    type: 'prefer',
    gender: 'unisex',
    priority: 6,
    season: ['秋', '冬', '春'],
    scenes: [],
    tags: ['叠穿', '衬衫', '细节'],
    examples: ['白衬衫开扣 + 圆领毛衣 + 大衣'],
  },

  // ═══════════ 鞋裤关系 ═══════════
  {
    id: 'sil_014',
    module: 'silhouette',
    rule: '裤脚宽度匹配鞋型',
    desc: '阔腿裤 → 厚底鞋/高跟鞋/方头鞋；直筒裤 → 乐福鞋/运动鞋/短靴；紧身裤 → 及踝靴/高跟鞋/运动鞋。裤脚宽度和鞋型体量要一致。',
    condition: { field: '下装.裤脚宽度', op: 'eq', value: '与鞋型体量匹配' },
    type: 'prefer',
    gender: 'unisex',
    priority: 8,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['鞋裤', '比例', '细节'],
    examples: [
      '阔腿西裤 + 方头高跟鞋',
      '紧身牛仔 + 及踝短靴',
      '直筒休闲裤 + 厚底运动鞋',
    ],
  },
  {
    id: 'sil_015',
    module: 'silhouette',
    rule: '九分裤露脚踝',
    desc: '九分裤长度露出脚踝最细处2-3cm，搭配合适鞋型显高显瘦。过长堆叠在鞋面上显邋遢。',
    condition: { field: '下装.长度', op: 'eq', value: '九分' },
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['春', '秋'],
    scenes: [],
    tags: ['九分裤', '脚踝', '显瘦'],
    examples: ['九分西裤 + 乐福鞋', '九分牛仔 + 帆布鞋'],
  },

  // ═══════════ 风格版型特征 ═══════════
  {
    id: 'sil_016',
    module: 'silhouette',
    rule: '街头风必须宽松',
    desc: '街头/嘻哈风格至少一件单品 oversized，全身修身=不像街头而像通勤。',
    condition: { field: '风格', op: 'in', value: ['街头', '美式'] },
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['版型', '街头', '风格'],
    examples: ['oversized卫衣 + 宽松束脚裤 + 板鞋'],
  },
  {
    id: 'sil_017',
    module: 'silhouette',
    rule: '通勤风避免oversized',
    desc: '职场通勤场景 oversized 单品显不专业。至少保持合身，建议修身到合身区间。',
    condition: [
      { field: '场景', op: 'eq', value: '通勤' },
      { field: '单品.版型', op: 'in', value: ['oversized'] },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'unisex',
    priority: 8,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['版型', '通勤', '职场'],
    examples: [],
  },
];
