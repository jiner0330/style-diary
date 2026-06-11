/**
 * 穿搭规则库 - 品类字典
 * 
 * 颗粒度原则：只到"穿搭规则确实不同"那一层为止。
 * 例：高领毛衣 vs V领毛衣 → 叠穿规则不同 → 分开
 * 例：牛津纺衬衫 vs 青年布衬衫 → 规则无异 → 不分开
 */

import { Category } from './types';

export const categories: Category[] = [
  // ═══════════════════════════════════════
  // 上衣
  // ═══════════════════════════════════════
  {
    id: 'top_tshirt',
    name: 'T恤',
    parent: '上衣',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['棉', '棉麻', '莫代尔', '针织'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'outer_blazer', 'outer_cardigan', 'outer_jacket', 'outer_denim_jacket', 'outer_windbreaker', 'shoes_sneakers', 'shoes_loafers', 'shoes_sandals', 'shoes_heels', 'shoes_boots', 'shoes_canvas', 'acc_necklace', 'acc_watch', 'acc_belt', 'acc_bag_crossbody', 'acc_bag_tote', 'acc_hat_cap', 'acc_sunglasses'],
  },
  {
    id: 'top_shirt',
    name: '衬衫',
    parent: '上衣',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['棉', '亚麻', '真丝', '雪纺', '牛津纺'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'outer_blazer', 'outer_cardigan', 'outer_trench', 'outer_jacket', 'outer_vest', 'outer_denim_jacket', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_flats', 'shoes_boots', 'shoes_canvas', 'acc_necklace', 'acc_watch', 'acc_belt', 'acc_bag_crossbody', 'acc_bag_tote', 'acc_sunglasses'],
  },
  {
    id: 'top_sweater_crew',
    name: '圆领毛衣',
    parent: '上衣',
    subCategory: '毛衣',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['羊毛', '羊绒', '棉', '混纺'],
    seasons: ['秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'inner_tshirt', 'inner_shirt', 'outer_trench', 'outer_coat', 'outer_puffer', 'outer_vest', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_boots_chelsea', 'acc_necklace', 'acc_watch', 'acc_belt', 'acc_scarf', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'top_sweater_vneck',
    name: 'V领毛衣',
    parent: '上衣',
    subCategory: '毛衣',
    commonFits: ['修身', '合身'],
    commonMaterials: ['羊毛', '羊绒', '棉', '混纺'],
    seasons: ['秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'inner_shirt', 'inner_tshirt', 'outer_trench', 'outer_coat', 'outer_puffer', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_boots_chelsea', 'acc_necklace', 'acc_watch', 'acc_belt', 'acc_scarf', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'top_sweater_turtleneck',
    name: '高领毛衣',
    parent: '上衣',
    subCategory: '毛衣',
    commonFits: ['修身', '合身'],
    commonMaterials: ['羊毛', '羊绒', '棉'],
    seasons: ['秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'outer_blazer', 'outer_trench', 'outer_coat', 'outer_puffer', 'outer_vest', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_boots_chelsea', 'acc_watch', 'acc_belt', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'top_hoodie',
    name: '卫衣',
    parent: '上衣',
    commonFits: ['合身', '宽松', 'oversized'],
    commonMaterials: ['棉', '毛圈布'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_joggers', 'bottom_shorts', 'bottom_skirt', 'outer_jacket', 'outer_denim_jacket', 'outer_windbreaker', 'outer_puffer', 'shoes_sneakers', 'shoes_canvas', 'shoes_boots', 'acc_hat_cap', 'acc_bag_crossbody', 'acc_bag_backpack'],
  },
  {
    id: 'top_tank',
    name: '吊带/背心',
    parent: '上衣',
    commonFits: ['紧身', '修身', '合身'],
    commonMaterials: ['棉', '真丝', '针织', '雪纺', '蕾丝'],
    seasons: ['夏'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'bottom_skirt', 'outer_blazer', 'outer_cardigan', 'outer_shirt_jacket', 'outer_jacket', 'outer_denim_jacket', 'shoes_sneakers', 'shoes_sandals', 'shoes_heels', 'shoes_flats', 'acc_necklace', 'acc_watch', 'acc_belt', 'acc_bag_crossbody', 'acc_bag_tote', 'acc_hat_cap', 'acc_sunglasses'],
  },

  // ═══════════════════════════════════════
  // 下装
  // ═══════════════════════════════════════
  {
    id: 'bottom_jeans',
    name: '牛仔裤',
    parent: '下装',
    commonFits: ['紧身', '修身', '合身', '宽松', 'oversized'],
    commonMaterials: ['牛仔'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_sweater_crew', 'top_sweater_vneck', 'top_sweater_turtleneck', 'top_hoodie', 'top_tank', 'outer_blazer', 'outer_cardigan', 'outer_trench', 'outer_jacket', 'outer_denim_jacket', 'outer_coat', 'outer_puffer', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_canvas', 'acc_belt', 'acc_bag_crossbody', 'acc_bag_tote'],
  },
  {
    id: 'bottom_trousers',
    name: '西裤/直筒裤',
    parent: '下装',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['羊毛', '聚酯纤维', '棉', '混纺'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_sweater_crew', 'top_sweater_vneck', 'top_sweater_turtleneck', 'outer_blazer', 'outer_cardigan', 'outer_trench', 'outer_coat', 'shoes_loafers', 'shoes_heels', 'shoes_flats', 'shoes_boots', 'shoes_boots_chelsea', 'shoes_oxford', 'acc_belt', 'acc_watch', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'bottom_shorts',
    name: '短裤',
    parent: '下装',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['棉', '牛仔', '亚麻', '运动面料'],
    seasons: ['夏'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'outer_shirt_jacket', 'shoes_sneakers', 'shoes_sandals', 'shoes_canvas', 'shoes_flats', 'acc_hat_cap', 'acc_sunglasses', 'acc_bag_crossbody'],
  },
  {
    id: 'bottom_joggers',
    name: '运动裤/束脚裤',
    parent: '下装',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['棉', '运动面料', '尼龙'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'outer_jacket', 'outer_windbreaker', 'outer_puffer', 'shoes_sneakers', 'shoes_canvas', 'acc_hat_cap', 'acc_bag_backpack'],
  },
  {
    id: 'bottom_skirt',
    name: '半身裙（直筒/A字）',
    parent: '下装',
    commonFits: ['修身', '合身'],
    commonMaterials: ['棉', '牛仔', '羊毛', '真丝', '雪纺', '皮革'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'outer_blazer', 'outer_cardigan', 'outer_jacket', 'outer_denim_jacket', 'shoes_sneakers', 'shoes_sandals', 'shoes_heels', 'shoes_flats', 'shoes_boots', 'shoes_canvas', 'acc_necklace', 'acc_belt', 'acc_bag_crossbody', 'acc_bag_shoulder'],
  },
  {
    id: 'bottom_pleated_skirt',
    name: '百褶裙',
    parent: '下装',
    commonFits: ['合身'],
    commonMaterials: ['聚酯纤维', '羊毛', '皮革'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_sweater_crew', 'top_sweater_vneck', 'outer_blazer', 'outer_cardigan', 'outer_jacket', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'acc_necklace', 'acc_bag_crossbody', 'acc_bag_shoulder'],
  },

  // ═══════════════════════════════════════
  // 外套
  // ═══════════════════════════════════════
  {
    id: 'outer_blazer',
    name: '西装外套',
    parent: '外套',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['羊毛', '聚酯纤维', '棉麻', '混纺'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_sweater_turtleneck', 'top_tank', 'bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'shoes_loafers', 'shoes_heels', 'shoes_flats', 'shoes_boots', 'shoes_oxford', 'acc_necklace', 'acc_watch', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'outer_cardigan',
    name: '开衫/针织外套',
    parent: '外套',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['羊毛', '羊绒', '棉', '针织'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'dress_slip', 'shoes_sneakers', 'shoes_loafers', 'shoes_flats', 'shoes_boots', 'acc_necklace', 'acc_bag_crossbody', 'acc_bag_tote'],
  },
  {
    id: 'outer_trench',
    name: '风衣/大衣',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['棉', '聚酯纤维', '羊毛'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_sweater_crew', 'top_sweater_vneck', 'top_sweater_turtleneck', 'bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'dress_slip', 'shoes_sneakers', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_boots_chelsea', 'acc_scarf', 'acc_belt', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'outer_coat',
    name: '毛呢大衣',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['羊毛', '羊绒', '混纺'],
    seasons: ['冬'],
    pairsWith: ['top_sweater_crew', 'top_sweater_vneck', 'top_sweater_turtleneck', 'top_shirt', 'bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'dress_slip', 'shoes_loafers', 'shoes_heels', 'shoes_boots', 'shoes_boots_chelsea', 'shoes_oxford', 'acc_scarf', 'acc_gloves', 'acc_bag_tote', 'acc_bag_shoulder'],
  },
  {
    id: 'outer_puffer',
    name: '羽绒服/棉服',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['尼龙', '聚酯纤维'],
    seasons: ['冬'],
    pairsWith: ['top_hoodie', 'top_sweater_crew', 'top_sweater_turtleneck', 'bottom_jeans', 'bottom_joggers', 'bottom_trousers', 'shoes_sneakers', 'shoes_boots', 'shoes_canvas', 'acc_scarf', 'acc_gloves', 'acc_hat_beanie', 'acc_bag_backpack'],
  },
  {
    id: 'outer_jacket',
    name: '夹克（飞行员/棒球服）',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['尼龙', '皮质', '棉'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'top_shirt', 'bottom_jeans', 'bottom_joggers', 'bottom_trousers', 'shoes_sneakers', 'shoes_boots', 'shoes_canvas', 'acc_hat_cap', 'acc_bag_crossbody', 'acc_bag_backpack'],
  },
  {
    id: 'outer_denim_jacket',
    name: '牛仔外套',
    parent: '外套',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['牛仔'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'top_hoodie', 'bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'bottom_skirt', 'dress_slip', 'shoes_sneakers', 'shoes_boots', 'shoes_canvas', 'shoes_sandals', 'acc_hat_cap', 'acc_bag_crossbody'],
  },
  {
    id: 'outer_shirt_jacket',
    name: '衬衫外套（shacket）',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['棉', '法兰绒', '灯芯绒'],
    seasons: ['春', '秋'],
    pairsWith: ['top_tshirt', 'top_tank', 'bottom_jeans', 'bottom_shorts', 'bottom_trousers', 'shoes_sneakers', 'shoes_boots', 'shoes_canvas', 'acc_hat_cap', 'acc_bag_crossbody', 'acc_bag_backpack'],
  },
  {
    id: 'outer_windbreaker',
    name: '冲锋衣/风衣外套',
    parent: '外套',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['尼龙', 'GORE-TEX'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'bottom_jeans', 'bottom_joggers', 'bottom_trousers', 'shoes_sneakers', 'shoes_boots', 'shoes_canvas', 'acc_hat_cap', 'acc_bag_backpack'],
  },
  {
    id: 'outer_vest',
    name: '马甲/背心',
    parent: '外套',
    commonFits: ['修身', '合身'],
    commonMaterials: ['羽绒', '羊毛', '棉'],
    seasons: ['秋', '冬'],
    pairsWith: ['top_shirt', 'top_sweater_crew', 'top_hoodie', 'bottom_jeans', 'bottom_trousers', 'shoes_sneakers', 'shoes_boots', 'acc_scarf'],
  },

  // ═══════════════════════════════════════
  // 连衣裙
  // ═══════════════════════════════════════
  {
    id: 'dress_slip',
    name: '吊带裙/连衣裙',
    parent: '连衣裙',
    commonFits: ['修身', '合身', '宽松'],
    commonMaterials: ['真丝', '雪纺', '棉', '针织', '蕾丝'],
    seasons: ['春', '夏'],
    pairsWith: ['top_tshirt', 'outer_blazer', 'outer_cardigan', 'outer_denim_jacket', 'outer_jacket', 'outer_shirt_jacket', 'shoes_sneakers', 'shoes_sandals', 'shoes_heels', 'shoes_flats', 'shoes_boots', 'acc_necklace', 'acc_bag_crossbody', 'acc_bag_shoulder', 'acc_sunglasses'],
  },
  {
    id: 'dress_shirt_dress',
    name: '衬衫裙',
    parent: '连衣裙',
    commonFits: ['合身', '宽松'],
    commonMaterials: ['棉', '亚麻', '牛仔'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['outer_vest', 'outer_cardigan', 'shoes_sneakers', 'shoes_sandals', 'shoes_loafers', 'shoes_flats', 'shoes_boots', 'acc_belt', 'acc_bag_tote', 'acc_sunglasses'],
  },

  // ═══════════════════════════════════════
  // 内搭
  // ═══════════════════════════════════════
  {
    id: 'inner_tshirt',
    name: '打底T恤',
    parent: '上衣',
    subCategory: '内搭',
    commonFits: ['紧身', '修身'],
    commonMaterials: ['棉', '莫代尔'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_sweater_crew', 'top_sweater_vneck', 'top_shirt', 'outer_blazer', 'outer_cardigan', 'outer_trench', 'outer_jacket', 'outer_coat', 'outer_puffer', 'bottom_jeans', 'bottom_trousers'],
  },
  {
    id: 'inner_shirt',
    name: '内搭衬衫',
    parent: '上衣',
    subCategory: '内搭',
    commonFits: ['修身', '合身'],
    commonMaterials: ['棉', '牛津纺'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['top_sweater_vneck', 'top_sweater_crew', 'outer_blazer', 'outer_cardigan', 'outer_coat', 'outer_trench', 'outer_vest', 'bottom_jeans', 'bottom_trousers', 'bottom_pleated_skirt'],
  },

  // ═══════════════════════════════════════
  // 鞋履
  // ═══════════════════════════════════════
  {
    id: 'shoes_sneakers',
    name: '运动鞋/板鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '网布', '帆布', '合成材料'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_joggers', 'bottom_shorts', 'bottom_skirt', 'bottom_trousers', 'dress_slip', 'top_tshirt', 'top_hoodie', 'top_shirt'],
  },
  {
    id: 'shoes_canvas',
    name: '帆布鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['帆布'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['bottom_jeans', 'bottom_shorts', 'bottom_joggers', 'bottom_skirt', 'dress_slip', 'top_tshirt', 'top_hoodie'],
  },
  {
    id: 'shoes_loafers',
    name: '乐福鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '麂皮'],
    seasons: ['春', '秋'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'top_shirt', 'top_sweater_crew', 'outer_blazer', 'outer_trench'],
  },
  {
    id: 'shoes_oxford',
    name: '牛津鞋/德比鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革'],
    seasons: ['春', '秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'top_shirt', 'top_sweater_crew', 'outer_blazer', 'outer_coat'],
  },
  {
    id: 'shoes_heels',
    name: '高跟鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '麂皮', '漆皮'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'bottom_jeans', 'top_shirt', 'top_tank', 'outer_blazer', 'outer_cardigan'],
  },
  {
    id: 'shoes_flats',
    name: '平底鞋/芭蕾鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '帆布'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'bottom_skirt', 'dress_slip', 'top_tshirt', 'top_shirt', 'outer_blazer', 'outer_cardigan'],
  },
  {
    id: 'shoes_sandals',
    name: '凉鞋/拖鞋',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '橡胶', '编织'],
    seasons: ['夏'],
    pairsWith: ['bottom_jeans', 'bottom_shorts', 'bottom_skirt', 'dress_slip', 'dress_shirt_dress', 'top_tshirt', 'top_tank', 'top_shirt'],
  },
  {
    id: 'shoes_boots',
    name: '短靴/马丁靴',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '麂皮'],
    seasons: ['秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'bottom_pleated_skirt', 'dress_slip', 'top_sweater_crew', 'top_hoodie', 'outer_jacket', 'outer_coat', 'outer_puffer'],
  },
  {
    id: 'shoes_boots_chelsea',
    name: '切尔西靴',
    parent: '鞋履',
    commonFits: [],
    commonMaterials: ['皮革', '麂皮'],
    seasons: ['秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_skirt', 'top_sweater_crew', 'top_sweater_turtleneck', 'top_shirt', 'outer_blazer', 'outer_trench', 'outer_coat'],
  },

  // ═══════════════════════════════════════
  // 配饰
  // ═══════════════════════════════════════
  {
    id: 'acc_necklace',
    name: '项链',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['金属', '珍珠', '宝石'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'top_sweater_vneck', 'top_sweater_crew', 'dress_slip'],
  },
  {
    id: 'acc_watch',
    name: '手表',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['金属', '皮革', '橡胶'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_shirt', 'top_sweater_crew', 'outer_blazer', 'bottom_trousers', 'shoes_oxford', 'shoes_loafers'],
  },
  {
    id: 'acc_belt',
    name: '腰带',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['皮革'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['bottom_jeans', 'bottom_trousers', 'bottom_shorts', 'dress_shirt_dress', 'top_shirt', 'outer_blazer'],
  },
  {
    id: 'acc_scarf',
    name: '围巾',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['羊毛', '羊绒', '真丝', '棉'],
    seasons: ['秋', '冬'],
    pairsWith: ['outer_trench', 'outer_coat', 'outer_puffer', 'top_sweater_crew', 'top_sweater_turtleneck'],
  },
  {
    id: 'acc_gloves',
    name: '手套',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['皮革', '羊毛'],
    seasons: ['冬'],
    pairsWith: ['outer_coat', 'outer_puffer'],
  },
  {
    id: 'acc_bag_tote',
    name: '托特包/大包',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['皮革', '帆布', '尼龙'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_shirt', 'bottom_trousers', 'outer_blazer', 'outer_trench', 'outer_coat', 'shoes_loafers', 'shoes_heels'],
  },
  {
    id: 'acc_bag_shoulder',
    name: '单肩包/腋下包',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['皮革', '帆布'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'bottom_jeans', 'bottom_skirt', 'dress_slip', 'outer_blazer', 'outer_cardigan', 'shoes_heels', 'shoes_flats'],
  },
  {
    id: 'acc_bag_crossbody',
    name: '斜挎包/胸包',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['皮革', '尼龙', '帆布'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'bottom_jeans', 'bottom_shorts', 'bottom_joggers', 'dress_slip', 'outer_jacket', 'shoes_sneakers', 'shoes_canvas'],
  },
  {
    id: 'acc_bag_backpack',
    name: '双肩包',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['尼龙', '帆布', '皮革'],
    seasons: ['春', '夏', '秋', '冬'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'bottom_jeans', 'bottom_joggers', 'outer_jacket', 'outer_puffer', 'shoes_sneakers', 'shoes_canvas'],
  },
  {
    id: 'acc_hat_cap',
    name: '棒球帽',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['棉', '帆布'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['top_tshirt', 'top_hoodie', 'bottom_jeans', 'bottom_shorts', 'bottom_joggers', 'outer_jacket', 'outer_denim_jacket', 'shoes_sneakers', 'shoes_canvas'],
  },
  {
    id: 'acc_hat_beanie',
    name: '毛线帽',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['羊毛', '针织'],
    seasons: ['冬'],
    pairsWith: ['outer_puffer', 'outer_coat', 'top_hoodie', 'bottom_jeans', 'bottom_joggers', 'shoes_boots', 'shoes_sneakers'],
  },
  {
    id: 'acc_sunglasses',
    name: '墨镜',
    parent: '配饰',
    commonFits: [],
    commonMaterials: ['塑料', '金属'],
    seasons: ['春', '夏', '秋'],
    pairsWith: ['top_tshirt', 'top_shirt', 'top_tank', 'dress_slip', 'outer_blazer', 'outer_jacket', 'bottom_jeans', 'bottom_shorts'],
  },
];

/** 按大类分组 */
export const categoryGroups = {
  '上衣': categories.filter(c => c.parent === '上衣'),
  '下装': categories.filter(c => c.parent === '下装'),
  '外套': categories.filter(c => c.parent === '外套'),
  '连衣裙': categories.filter(c => c.parent === '连衣裙'),
  '鞋履': categories.filter(c => c.parent === '鞋履'),
  '配饰': categories.filter(c => c.parent === '配饰'),
} as const;

/** 品类 ID → name 快速查找 */
export const categoryMap = Object.fromEntries(
  categories.map(c => [c.id, c])
);

/** 父级 → 子类列表 */
export const parentMap = categories.reduce((acc, c) => {
  if (!acc[c.parent]) acc[c.parent] = [];
  acc[c.parent].push(c.id);
  return acc;
}, {} as Record<string, string[]>);
