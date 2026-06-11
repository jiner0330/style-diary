/**
 * 穿搭规则库 - 面料/材质搭配规则
 * 
 * 核心原则：
 * 1. 厚+薄 = 有轻重对比
 * 2. 光泽+哑光 = 有质感层次
 * 3. 自然+自然 / 人工+人工 = 统一调性（跨类混搭需谨慎）
 */

import { StyleRule } from './types';

export const materialRules: StyleRule[] = [
  // ═══════════ 厚薄对比 ═══════════
  {
    id: 'mat_001',
    module: 'material',
    rule: '厚重+轻盈对比',
    desc: '厚重的单品（羊毛大衣、皮夹克、粗针织）搭配轻盈的单品（真丝、雪纺、薄棉），一重一轻有呼吸感。',
    condition: { field: '搭配.材质厚度对比', op: 'eq', value: '一厚一薄' },
    type: 'prefer',
    gender: 'unisex',
    priority: 8,
    season: ['秋', '冬', '春'],
    scenes: [],
    tags: ['材质', '厚薄', '对比'],
    examples: [
      '厚羊毛大衣 + 真丝衬衫 + 直筒裤',
      '皮夹克 + 雪纺连衣裙',
    ],
  },
  {
    id: 'mat_002',
    module: 'material',
    rule: '避免全身同厚度',
    desc: '全身都是厚面料（毛衣+厚呢裤+厚大衣）显笨重；全身都是薄面料（雪纺+薄纱）缺失结构感。',
    condition: { field: '全身.材质厚度', op: 'eq', value: '全部相同' },
    type: 'avoid',
    gender: 'unisex',
    priority: 7,
    season: ['春', '秋', '冬'],
    scenes: [],
    tags: ['材质', '厚度', '避雷'],
    examples: [],
  },

  // ═══════════ 光泽质感 ═══════════
  {
    id: 'mat_003',
    module: 'material',
    rule: '光泽点+哑面底',
    desc: '1-2件光泽面料单品（真丝/缎面/漆皮/丝绒）+ 其余全哑面。光泽是"味精"，多了显廉价，刚好显贵。',
    condition: { field: '全身.光泽单品数量', op: 'between', value: ['1', '2'] },
    type: 'prefer',
    gender: 'unisex',
    priority: 8,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['材质', '光泽', '高级感'],
    examples: ['真丝衬衫 + 哑光羊毛西裤', '漆皮靴 + 全棉/羊毛穿搭'],
  },
  {
    id: 'mat_004',
    module: 'material',
    rule: '避免全身光泽',
    desc: '全身缎面/漆皮/亮片面料是舞台装不是日常穿搭。多件光泽单品同时出现时会互相抢。',
    condition: { field: '全身.光泽单品数量', op: 'between', value: ['3', '99'] },
    type: 'avoid',
    gender: 'unisex',
    priority: 9,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['材质', '光泽', '避雷'],
    examples: [],
  },

  // ═══════════ 纹理协调 ═══════════
  {
    id: 'mat_005',
    module: 'material',
    rule: '纹理有繁有简',
    desc: '纹理/图案单品（粗花呢、格纹、条纹、提花）只选1件，其余为纯色/素面。繁+简 = 有重点，繁+繁 = 眼花。',
    condition: { field: '全身.纹理单品数量', op: 'between', value: ['0', '1'] },
    type: 'must',
    gender: 'unisex',
    priority: 9,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['材质', '纹理', '图案', '繁简'],
    examples: ['格纹西装外套 + 纯色内搭 + 纯色裤', '条纹衬衫 + 纯色外套 + 纯色下装'],
  },

  // ═══════════ 面料调性统一 ═══════════
  {
    id: 'mat_006',
    module: 'material',
    rule: '自然面料配自然面料',
    desc: '棉/麻/羊毛/真丝/皮革等自然面料之间协调性好。尼龙/聚酯/人造革等工业面料之间搭配也OK。自然+工业混搭需有意识。',
    condition: { field: '搭配.面料调性', op: 'eq', value: '统一' },
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    tags: ['材质', '调性', '协调'],
    examples: [
      '全自然：亚麻衬衫 + 棉质裤',
      '全工业：尼龙冲锋衣 + 运动面料裤',
    ],
  },
  {
    id: 'mat_007',
    module: 'material',
    rule: '运动面料/科技面料与其他材质混搭谨慎',
    desc: '纯运动面料（速干/弹力/网眼）与羊毛西装、真丝衬衫等精致面料混搭难度高。混搭成功案例多为机能风/gorpcore，需要风格统一支撑。',
    condition: [
      { field: '单品A.材质', op: 'in', value: ['运动面料', '速干', '网眼'] },
      { field: '单品B.材质', op: 'in', value: ['羊毛', '真丝', '缎面'] },
    ],
    conditionLogic: 'AND',
    type: 'avoid',
    gender: 'unisex',
    priority: 7,
    season: ['春', '夏', '秋', '冬'],
    scenes: [],
    sceneOverrides: [
        {
                'scene': '运动',
                'action': 'suppress',
                'reason': '运动场景下功能性面料混搭是合理需求'
        },
        {
                'scene': '骑行',
                'action': 'suppress',
                'reason': '骑行服功能性面料为必要选择'
        },
        {
                'scene': '健身',
                'action': 'suppress',
                'reason': '健身服科技面料为必要选择'
        },
        {
                'scene': '户外',
                'action': 'suppress',
                'reason': '户外运动科技面料为必要选择'
        }
],
    tags: ['材质', '混搭', '运动', '避雷'],
    examples: [],
  },

  // ═══════════ 季节性材质 ═══════════
  {
    id: 'mat_008',
    module: 'material',
    rule: '夏季天然透气材质',
    desc: '夏装首选棉、麻、真丝、莫代尔、天丝等透气天然/再生纤维。避免聚酯纤维等不透气面料贴身穿。',
    condition: { field: '季节', op: 'eq', value: '夏' },
    type: 'prefer',
    gender: 'unisex',
    priority: 8,
    season: ['夏'],
    scenes: [],
    tags: ['季节', '夏季', '透气'],
    examples: ['亚麻衬衫 + 棉质短裤', '真丝连衣裙'],
  },
  {
    id: 'mat_009',
    module: 'material',
    rule: '冬季保暖材质优先',
    desc: '冬装首选羊毛、羊绒、羽绒、摇粒绒。贴身穿避开冰凉的化纤面料。',
    condition: { field: '季节', op: 'eq', value: '冬' },
    type: 'prefer',
    gender: 'unisex',
    priority: 8,
    season: ['冬'],
    scenes: [],
    tags: ['季节', '冬季', '保暖'],
    examples: ['羊绒毛衣 + 羊毛大衣 + 灯芯绒裤'],
  },
  {
    id: 'mat_010',
    module: 'material',
    rule: '换季叠穿应对温差',
    desc: '春秋温差大，用可穿脱的轻量外套（牛仔外套/开衫/衬衫外套/轻薄风衣）应对。面料选择可跨季节。',
    condition: { field: '季节', op: 'in', value: ['春', '秋'] },
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['春', '秋'],
    scenes: [],
    tags: ['季节', '换季', '叠穿'],
    examples: ['棉T + 牛仔外套（热了脱）', '衬衫 + 轻薄针织开衫'],
  },

  // ═══════════ 特殊材质规则 ═══════════
  {
    id: 'mat_011',
    module: 'material',
    rule: '牛仔×牛仔双牛仔',
    desc: '上下都穿牛仔时，颜色必须错开（深蓝+浅蓝 / 黑+蓝 / 白+蓝），同样颜色=像工装。',
    condition: [
      { field: '上装.材质', op: 'eq', value: '牛仔' },
      { field: '下装.材质', op: 'eq', value: '牛仔' },
    ],
    conditionLogic: 'AND',
    type: 'prefer',
    gender: 'unisex',
    priority: 7,
    season: ['春', '秋'],
    scenes: [],
    tags: ['牛仔', '双牛仔', '颜色错开'],
    examples: ['浅蓝牛仔衬衫 + 深蓝牛仔裤', '白色牛仔外套 + 蓝色牛仔裤'],
  },
  {
    id: 'mat_012',
    module: 'material',
    rule: '皮革单品控制数量',
    desc: '全身皮制品（皮夹克+皮裤+皮鞋+皮包）容易过犹不及。皮夹克/皮裙/皮裤选1件，皮包/皮鞋可各1件。',
    condition: { field: '全身.皮革单品数量', op: 'between', value: ['1', '3'] },
    type: 'must',
    gender: 'unisex',
    priority: 8,
    season: ['秋', '冬', '春'],
    scenes: [],
    tags: ['皮革', '数量', '平衡'],
    examples: ['皮夹克 + 棉T + 牛仔裤 → 3件也OK因为有非皮缓冲'],
  },
  {
    id: 'mat_013',
    module: 'material',
    rule: '蕾丝/透视材质必须搭配保守单品',
    desc: '蕾丝、透视、薄纱等半透明材质，其余单品必须保守（高领口、长袖、长裤/长裙）来平衡。暴露面积+透视面积不可叠加。',
    condition: { field: '单品.材质', op: 'in', value: ['蕾丝', '透视', '薄纱'] },
    type: 'must',
    gender: 'female',
    priority: 9,
    season: ['春', '夏', '秋'],
    scenes: [],
    tags: ['蕾丝', '透视', '平衡', '得体'],
    examples: ['蕾丝上衣 + 高腰直筒牛仔裤 + 不露肤', '透视衬衫 + 内搭吊带 + 阔腿裤'],
  },
];
