import type { ClothingItem } from '@/types'

// 占位数据——用不同颜色区分品类，后续替换为 Midjourney 生成的实物图
// 每件的 image 字段为纯色 SVG data URI，方便拖拽原型验证

function placeholderImage(color: string, label: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
      <rect width="120" height="160" fill="${color}" rx="8"/>
      <text x="60" y="75" text-anchor="middle" fill="white" font-size="12" font-family="sans-serif">${label}</text>
      <text x="60" y="95" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif">占位</text>
    </svg>`
  )}`
}

export const MOCK_CLOTHING: ClothingItem[] = [
  // ===== 上衣 =====
  { id: 'top-01', owner_id: null, name: '白色毛衣', category: 'top', sub_category: 'sweater', color: '#F5F5F5', material: '针织', pattern: null, style_tags: ['简约'], image_url: '/top-white-sweater-01.png?v=1', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-02', owner_id: null, name: '条纹衬衫', category: 'top', sub_category: 'shirt', color: '#A8C4D4', material: '棉', pattern: '蓝白竖条纹', detail: '小翻领，前襟纽扣，长袖带袖口，宽松版型', style_tags: ['法式', '简约'], image_url: '/top-blue-shirt-02.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-04', owner_id: null, name: '白色泡泡袖', category: 'top', sub_category: 'puff_sleeve', color: '#FAF7F4', material: '棉', pattern: null, detail: '方领设计，蓬松泡泡袖袖口收拢，短款露腰设计', style_tags: ['甜美', '复古'], image_url: '/top-white-puffy-sleeves-04.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-05', owner_id: null, name: '长袖印花斜肩上衣', category: 'top', sub_category: 'off_shoulder_ls', color: '#FAF7F4', material: '棉', pattern: '粉色花朵绿叶晕染', detail: '不对称斜肩设计，一侧露肩一侧有袖，腹部褶皱设计，油画质感印花', style_tags: ['辣妹风'], image_url: '/top-printed off-the-shoulder-08.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-06', owner_id: null, name: '灰色卫衣', category: 'top', sub_category: 'sweatshirt', color: '#9A9A9A', material: '棉', pattern: null, detail: '圆领宽松版型，落肩设计，罗纹下摆和袖口', style_tags: ['街头', '运动'], image_url: '/top-gray-sweatshirt-05.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-07', owner_id: null, name: '工装衬衫', category: 'top', sub_category: 'shirt', color: '#B4C1A8', material: '棉', pattern: null, detail: '翻领设计，胸前两个带盖口袋，长袖', style_tags: ['工装', '街头'], image_url: '/top-workwear-shirt-07.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-08', owner_id: null, name: '米色亨利衫', category: 'top', sub_category: 'henley', color: '#D4C5A0', material: '棉', pattern: null, detail: '无领半开襟两粒扣设计，修身版型，长袖', style_tags: ['简约', '美式复古'], image_url: '/top-beige-herry-shirt-06.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-03', owner_id: null, name: '燕麦色针织', category: 'top', sub_category: 'cardigan', color: '#D4C5A0', material: '针织', pattern: null, detail: 'V领，长袖，门襟敞开呈自然垂落状', style_tags: ['甜美', '复古'], image_url: '/top-oat-knitting-03.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-09', owner_id: null, name: '酒红色露肩鱼骨上衣', category: 'top', sub_category: 'off_shoulder_corset', color: '#8B2252', material: '棉+氨纶', pattern: null, detail: '一字领露肩设计，胸前纵向鱼骨线分割交叉绑带，修身短款版型，长袖', style_tags: ['辣妹风', '法式'], image_url: '/top-off-shoulder-corset-09.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-10', owner_id: null, name: '蓝色V领波点挂脖上衣', category: 'top', sub_category: 'halter', color: '#6B8FA3', material: '雪纺', pattern: '白色波点均匀分布', detail: 'V领挂脖系带设计，较宽松版型，白色波点均匀分布，下摆荷叶边设计，轻盈飘逸', style_tags: ['法式', '复古'], image_url: '/top-polkadot-halter-10.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-11', owner_id: null, name: '无袖挂脖上衣', category: 'top', sub_category: 'halter', color: '#E8B4B8', material: '欧根纱', pattern: null, detail: '挂脖系带设计，领口细微褶皱，轻盈飘逸下摆', style_tags: ['辣妹风', '甜美'], image_url: '/top-pink-halter-11.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-12', owner_id: null, name: '长袖一字肩上衣', category: 'top', sub_category: 'off_shoulder_ls', color: '#2A2A2A', material: '棉+氨纶', pattern: null, detail: '收腰剪裁', style_tags: ['简约', '辣妹风'], image_url: '/top-off-shoulder-longsleeve-12.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-13', owner_id: null, name: '短袖方领泡泡袖上衣', category: 'top', sub_category: 'puff_sleeve', color: '#DDA040', material: '棉', pattern: null, detail: '方领设计，双肩细褶，袖口微收，腰部宽松自然不收腰', style_tags: ['甜美', '复古'], image_url: '/top-puff-sleeve-13.png', layer_order: 2, occupies_full_body: false, source: 'system' },
  { id: 'top-14', owner_id: null, name: '短袖一字肩修身T恤', category: 'top', sub_category: 'off_shoulder_tee', color: '#A8C4D4', material: '棉', pattern: null, style_tags: ['简约', '辣妹风'], image_url: '/top-off-shoulder-tee-14.png', layer_order: 2, occupies_full_body: false, source: 'system' },

  // ===== 下装 =====
  { id: 'bottom-01', owner_id: null, name: '直筒牛仔裤', category: 'bottom', sub_category: 'jeans', color: '#6B8FA3', material: '牛仔', pattern: null, style_tags: ['简约', '复古'], image_url: '/bottom-blue-jieans-01.png', layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-02', owner_id: null, name: '阔腿裤', category: 'bottom', sub_category: 'trousers', color: '#5C5C5C', material: '聚酯', pattern: null, style_tags: ['简约', '通勤'], image_url: placeholderImage('#5C5C5C', '阔腿裤'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-03', owner_id: null, name: 'A字半裙', category: 'bottom', sub_category: 'skirt', color: '#D4C5C2', material: '棉', pattern: null, style_tags: ['法式', '甜美'], image_url: placeholderImage('#D4C5C2', 'A字半裙'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-04', owner_id: null, name: '百褶裙', category: 'bottom', sub_category: 'skirt', color: '#A3B5C4', material: '聚酯', pattern: null, detail: '百褶设计，褶裥均匀分布', style_tags: ['学院', '日系'], image_url: placeholderImage('#A3B5C4', '百褶裙'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-05', owner_id: null, name: '高腰卷边短裤', category: 'bottom', sub_category: 'shorts', color: '#FAF7F4', material: '棉', pattern: null, detail: '高腰版型，裤耳设计，裤脚宽边卷边', style_tags: ['简约', '法式'], image_url: '/bottom-shorts-white-highwaist-cuffed-02.png', layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-06', owner_id: null, name: '工装裤', category: 'bottom', sub_category: 'cargo', color: '#B4C1A8', material: '棉', pattern: null, style_tags: ['工装', '街头'], image_url: placeholderImage('#B4C1A8', '工装裤'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-08', owner_id: null, name: '高腰阔腿牛仔裤', category: 'bottom', sub_category: 'wide_jeans', color: '#7B8FA3', material: '牛仔', pattern: null, style_tags: ['复古', '街头'], image_url: placeholderImage('#7B8FA3', '高腰阔腿牛仔裤'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-09', owner_id: null, name: '鱼尾裙', category: 'bottom', sub_category: 'mermaid_skirt', color: '#C4A8A3', material: '聚酯', pattern: null, style_tags: ['法式', '优雅'], image_url: placeholderImage('#C4A8A3', '鱼尾裙'), layer_order: 3, occupies_full_body: false, source: 'system' },
  { id: 'bottom-10', owner_id: null, name: '包臀裙', category: 'bottom', sub_category: 'pencil_skirt', color: '#2A2A2A', material: '棉', pattern: null, style_tags: ['简约', '辣妹风'], image_url: placeholderImage('#2A2A2A', '包臀裙'), layer_order: 3, occupies_full_body: false, source: 'system' },

  // ===== 连衣裙 =====
  { id: 'dress-01', owner_id: null, name: '无袖小黑裙', category: 'dress', sub_category: 'mini', color: '#2A2A2A', material: '聚酯', pattern: null, detail: '小圆领，修身收腰裁剪，较有廓形感，裙摆自然微扩至膝上，后背隐形拉链', style_tags: ['极简', '法式'], image_url: '/dress-black-classic-03.png', layer_order: 1, occupies_full_body: true, source: 'system' },
  { id: 'dress-02', owner_id: null, name: '短袖碎花茶歇裙', category: 'dress', sub_category: 'midi', color: '#F5F0D0', material: '棉', pattern: '红色碎花均匀分布', detail: 'V领交叉门襟系带收腰，裙摆自然散开', style_tags: ['法式', '复古'], image_url: '/dress-tea-floral-04.png', layer_order: 1, occupies_full_body: true, source: 'system' },
  { id: 'dress-03', owner_id: null, name: '针织长裙', category: 'dress', sub_category: 'maxi', color: '#C4A8A3', material: '针织', pattern: null, style_tags: ['简约', '日系'], image_url: placeholderImage('#C4A8A3', '针织长裙'), layer_order: 1, occupies_full_body: true, source: 'system' },
  { id: 'dress-04', owner_id: null, name: '衬衫裙', category: 'dress', sub_category: 'midi', color: '#B5C1B4', material: '棉', pattern: null, style_tags: ['简约', '学院'], image_url: placeholderImage('#B5C1B4', '衬衫裙'), layer_order: 1, occupies_full_body: true, source: 'system' },
  { id: 'dress-05', owner_id: null, name: '一字肩白色连衣裙', category: 'dress', sub_category: 'off_shoulder_dress', color: '#FAF7F4', material: '棉', pattern: null, detail: '腰间交叉绑带收腰加蝴蝶结设计，袖口小飞袖设计，A字裙摆自然散开，裙子下摆三分之一处有拼接线，裙摆细密蕾丝内衬', style_tags: ['法式', '优雅'], image_url: '/dress-white-offshoulder-waist-tie-00.png', layer_order: 1, occupies_full_body: true, source: 'system' },
  { id: 'dress-06', owner_id: null, name: '蓝色波点连衣裙', category: 'dress', sub_category: 'midi', color: '#1A2A4A', material: '聚酯', pattern: '白色波点', detail: '衬衫翻领设计，短袖，上半身纽扣门襟，腰间细褶设计', style_tags: ['法式', '复古'], image_url: '/dress-navy-polka-dot-02.png', layer_order: 1, occupies_full_body: true, source: 'system' },

  // ===== 外套 =====
  { id: 'outer-01', owner_id: null, name: '西装外套', category: 'outerwear', sub_category: 'blazer', color: '#C5BFB8', material: '羊毛', pattern: null, style_tags: ['简约', '通勤'], image_url: placeholderImage('#C5BFB8', '西装外套'), layer_order: 4, occupies_full_body: false, source: 'system' },
  { id: 'outer-02', owner_id: null, name: '牛仔夹克', category: 'outerwear', sub_category: 'jacket', color: '#7B9CB5', material: '牛仔', pattern: null, style_tags: ['街头', '复古'], image_url: placeholderImage('#7B9CB5', '牛仔夹克'), layer_order: 4, occupies_full_body: false, source: 'system' },
  { id: 'outer-03', owner_id: null, name: '风衣', category: 'outerwear', sub_category: 'trench', color: '#D4C5A0', material: '棉', pattern: null, style_tags: ['法式', '通勤'], image_url: placeholderImage('#D4C5A0', '风衣'), layer_order: 4, occupies_full_body: false, source: 'system' },
  { id: 'outer-04', owner_id: null, name: '棒球服', category: 'outerwear', sub_category: 'bomber', color: '#3A5A3A', material: '尼龙', pattern: null, style_tags: ['街头', '运动'], image_url: placeholderImage('#3A5A3A', '棒球服'), layer_order: 4, occupies_full_body: false, source: 'system' },

  // ===== 鞋 =====
  { id: 'shoes-01', owner_id: null, name: '小白鞋', category: 'shoes', sub_category: 'sneakers', color: '#FAF7F4', material: '皮革', pattern: null, style_tags: ['简约', '运动'], image_url: placeholderImage('#E8E4DF', '小白鞋'), layer_order: 7, occupies_full_body: false, source: 'system' },
  { id: 'shoes-02', owner_id: null, name: '尖头高跟鞋', category: 'shoes', sub_category: 'heels', color: '#C4A8A3', material: '皮革', pattern: null, style_tags: ['法式', '通勤'], image_url: placeholderImage('#C4A8A3', '高跟鞋'), layer_order: 7, occupies_full_body: false, source: 'system' },
  { id: 'shoes-03', owner_id: null, name: '马丁靴', category: 'shoes', sub_category: 'boots', color: '#3A3A3A', material: '皮革', pattern: null, style_tags: ['街头', '暗黑'], image_url: placeholderImage('#3A3A3A', '马丁靴'), layer_order: 7, occupies_full_body: false, source: 'system' },
  { id: 'shoes-04', owner_id: null, name: '乐福鞋', category: 'shoes', sub_category: 'loafers', color: '#5C3A2A', material: '皮革', pattern: null, style_tags: ['学院', '简约'], image_url: placeholderImage('#5C3A2A', '乐福鞋'), layer_order: 7, occupies_full_body: false, source: 'system' },

  // ===== 包 =====
  { id: 'bag-01', owner_id: null, name: '托特包', category: 'bag', sub_category: 'tote', color: '#D4C5C2', material: '皮革', pattern: null, style_tags: ['简约', '通勤'], image_url: placeholderImage('#D4C5C2', '托特包'), layer_order: 6, occupies_full_body: false, source: 'system' },
  { id: 'bag-02', owner_id: null, name: '链条小包', category: 'bag', sub_category: 'shoulder', color: '#2A2A2A', material: '皮革', pattern: null, style_tags: ['法式', '极简'], image_url: placeholderImage('#2A2A2A', '链条包'), layer_order: 6, occupies_full_body: false, source: 'system' },
  { id: 'bag-03', owner_id: null, name: '帆布袋', category: 'bag', sub_category: 'tote', color: '#E8DED1', material: '帆布', pattern: null, style_tags: ['简约', '运动'], image_url: placeholderImage('#E8DED1', '帆布袋'), layer_order: 6, occupies_full_body: false, source: 'system' },

  // ===== 配饰 =====
  { id: 'acc-01', owner_id: null, name: '细项链', category: 'accessory', sub_category: 'necklace', color: '#D4C5A0', material: '金属', pattern: null, style_tags: ['法式', '极简'], image_url: placeholderImage('#D4C5A0', '项链'), layer_order: 5, occupies_full_body: false, source: 'system' },
  { id: 'acc-02', owner_id: null, name: '珍珠耳环', category: 'accessory', sub_category: 'earrings', color: '#FAF7F4', material: '珍珠', pattern: null, style_tags: ['法式', '甜美'], image_url: placeholderImage('#FAF7F4', '珍珠耳环'), layer_order: 5, occupies_full_body: false, source: 'system' },
  { id: 'acc-03', owner_id: null, name: '丝巾', category: 'accessory', sub_category: 'scarf', color: '#D4A5A5', material: '丝绸', pattern: '图案', style_tags: ['法式', '复古'], image_url: placeholderImage('#D4A5A5', '丝巾'), layer_order: 5, occupies_full_body: false, source: 'system' },
  { id: 'acc-04', owner_id: null, name: '墨镜', category: 'accessory', sub_category: 'sunglasses', color: '#2A2A2A', material: '塑料', pattern: null, style_tags: ['街头', '简约'], image_url: placeholderImage('#2A2A2A', '墨镜'), layer_order: 5, occupies_full_body: false, source: 'system' },
  { id: 'acc-05', owner_id: null, name: '腰带', category: 'accessory', sub_category: 'belt', color: '#5C3A2A', material: '皮革', pattern: null, style_tags: ['简约'], image_url: placeholderImage('#5C3A2A', '腰带'), layer_order: 5, occupies_full_body: false, source: 'system' },
  { id: 'acc-06', owner_id: null, name: '腕表', category: 'accessory', sub_category: 'watch', color: '#C5BFB8', material: '金属', pattern: null, style_tags: ['简约', '商务休闲'], image_url: placeholderImage('#C5BFB8', '腕表'), layer_order: 5, occupies_full_body: false, source: 'system' },
]

// 按品类分组
export function getItemsByCategory(): Record<string, ClothingItem[]> {
  const result: Record<string, ClothingItem[]> = {
    top: [],
    bottom: [],
    dress: [],
    outerwear: [],
    shoes: [],
    bag: [],
    accessory: [],
  }
  for (const item of MOCK_CLOTHING) {
    result[item.category]?.push(item)
  }
  return result
}

// 个人单品运行时缓存 — 统一注册表，合并 mock + 用户上传
const personalItemCache = new Map<string, ClothingItem>()

export function registerPersonalItems(items: ClothingItem[]) {
  for (const item of items) {
    personalItemCache.set(item.id, item)
  }
}

export function registerPersonalItem(item: ClothingItem) {
  personalItemCache.set(item.id, item)
}

export function getItemById(id: string): ClothingItem | undefined {
  return personalItemCache.get(id) || MOCK_CLOTHING.find((i) => i.id === id)
}
