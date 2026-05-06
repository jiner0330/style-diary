import type { Gender, BodyType } from "@/types"

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// ========== 性别 ==========
export const GENDER_LABELS: Record<Gender, string> = {
  female: '女生',
  male: '男生',
}

// ========== 体型（分男女） ==========
export const BODY_TYPE_LABELS_FEMALE: Record<string, string> = {
  pear: '梨形',
  hourglass: '沙漏型',
  rectangle_f: 'H型',
  apple: '苹果型',
  inverted_triangle_f: '倒三角',
}

export const BODY_TYPE_LABELS_MALE: Record<string, string> = {
  rectangle_m: '矩型',
  inverted_triangle_m: '倒三角',
  oval: '椭圆型',
  trapezoid: '梯形',
  lean: '瘦长型',
}

export function getBodyTypeLabels(gender: Gender): Record<string, string> {
  return gender === 'female' ? BODY_TYPE_LABELS_FEMALE : BODY_TYPE_LABELS_MALE
}

export function getBodyTypeOptions(gender: Gender): BodyType[] {
  if (gender === 'female') {
    return ['pear', 'hourglass', 'rectangle_f', 'apple', 'inverted_triangle_f']
  }
  return ['rectangle_m', 'inverted_triangle_m', 'oval', 'trapezoid', 'lean']
}

// ========== 肤色 ==========
export const SKIN_TONE_LABELS: Record<string, string> = {
  warm: '暖皮',
  cool: '冷皮',
  neutral: '中性皮',
}

// ========== 风格标签 ==========
export const STYLE_TAG_OPTIONS_COMMON = [
  '简约', '街头', '复古', '日系', '韩系', '学院',
  '运动', '极简', '森系', '老钱',
]

export const STYLE_TAG_OPTIONS_FEMALE = [
  '法式', '甜美', '波西米亚', '新中式', '田园', 'Y2K', '暗黑',
]

export const STYLE_TAG_OPTIONS_MALE = [
  '工装', '机能', '美式复古', '阿美咔叽', '商务休闲', '高街',
]

export function getAllStyleTags(gender?: Gender): string[] {
  const common = [...STYLE_TAG_OPTIONS_COMMON]
  if (!gender) return [...common, ...STYLE_TAG_OPTIONS_FEMALE, ...STYLE_TAG_OPTIONS_MALE]
  const specific = gender === 'female' ? STYLE_TAG_OPTIONS_FEMALE : STYLE_TAG_OPTIONS_MALE
  return [...common, ...specific]
}

// ========== 品类 ==========
export const CATEGORY_LABELS: Record<string, string> = {
  top: '上衣',
  bottom: '下装',
  dress: '连衣裙',
  outerwear: '外套',
  shoes: '鞋',
  bag: '包',
  accessory: '配饰',
}

// ========== 身体数据区间 ==========
export const HEIGHT_RANGES_FEMALE = [
  '150cm 以下', '150-155cm', '155-160cm', '160-165cm',
  '165-170cm', '170-175cm', '175cm 以上',
]

export const HEIGHT_RANGES_MALE = [
  '160cm 以下', '160-165cm', '165-170cm', '170-175cm',
  '175-180cm', '180-185cm', '185-190cm', '190cm 以上',
]

export const WEIGHT_RANGES_FEMALE = [
  '40kg 以下', '40-45kg', '45-50kg', '50-55kg', '55-60kg',
  '60-65kg', '65-70kg', '70-75kg', '75kg 以上',
]

export const WEIGHT_RANGES_MALE = [
  '50kg 以下', '50-55kg', '55-60kg', '60-65kg', '65-70kg',
  '70-75kg', '75-80kg', '80-85kg', '85-90kg', '90kg 以上',
]

export const MEASUREMENT_RANGES = [
  '75cm 以下', '75-80cm', '80-85cm', '85-90cm',
  '90-95cm', '95-100cm', '100-105cm', '105cm 以上',
]

export function getHeightRanges(gender: Gender): string[] {
  return gender === 'female' ? HEIGHT_RANGES_FEMALE : HEIGHT_RANGES_MALE
}

export function getWeightRanges(gender: Gender): string[] {
  return gender === 'female' ? WEIGHT_RANGES_FEMALE : WEIGHT_RANGES_MALE
}

export const SHOULDER_WIDTHS = ['偏窄', '中等', '偏宽']
