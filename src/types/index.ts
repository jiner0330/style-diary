export type Gender = 'female' | 'male'
export type BodyTypeFemale = 'pear' | 'hourglass' | 'rectangle_f' | 'apple' | 'inverted_triangle_f'
export type BodyTypeMale = 'rectangle_m' | 'inverted_triangle_m' | 'oval' | 'trapezoid' | 'lean'
export type BodyType = BodyTypeFemale | BodyTypeMale
export type SkinTone = 'warm' | 'cool' | 'neutral'
export type ClothingCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory'
export type ClothingSource = 'system' | 'ai_recommended' | 'user_uploaded'

export interface UserProfile {
  id: string
  user_id: string
  nickname: string
  gender: Gender
  height_range: string
  weight_range: string
  bust_range: string
  waist_range: string
  hip_range: string
  shoulder_width: string
  body_type: BodyType
  skin_tone: SkinTone
  style_tags: string[]
  created_at: string
}

export interface Scene {
  id: string
  name: string
  story_text: string
  mood_tags: string[]
  unlock_condition: number
  illustration_url: string | null
  ambient_sound_url: string | null
  sort_order: number
}

export type Fit = '紧身' | '修身' | '合身' | '宽松' | 'oversized'
export type Length = '短款' | '常规' | '中长' | '长款'
export type Neckline = '圆领' | 'V领' | '方领' | '高领' | '翻领' | '一字肩' | '吊带' | '无领' | '蝴蝶结飘带' | '挂脖' | '一字领' | '小圆领' | '立领'
export type ColorGroup = 'light' | 'dark' | 'warm' | 'cool' | 'neutral'

export interface ClothingItem {
  id: string
  owner_id: string | null
  name: string
  category: ClothingCategory
  sub_category: string | null
  color: string
  color_group?: ColorGroup | null
  material: string | null
  pattern: string | null
  fit?: Fit | null
  length?: Length | null
  neckline?: Neckline | null
  detail?: string | null
  style_tags: string[]
  image_url: string | null
  layer_order: number
  occupies_full_body: boolean
  source: ClothingSource
}

export interface OutfitState {
  dress: string | null
  top: string | null
  bottom: string | null
  outerwear: string | null
  shoes: string | null
  bag: string | null
  accessories: string[]
}

export interface Outfit {
  id: string
  user_id: string
  scene_id: string
  items: string[]
  xiaocai_review_text: string | null
  user_mood_text: string | null
  card_image_url: string | null
  created_at: string
}

export interface XiaocaiRecommendation {
  name: string
  items: Array<{ itemId: string; reason: string }>
  overallReason: string
}

export interface XiaocaiReview {
  review: string
  highlights: string[]
  suggestions: string[]
  expression: 'happy' | 'thinking' | 'clap' | 'wink' | 'frown'
}

// AI 自由搭配方案中的单品
export interface AIOutfitItem {
  slot: string
  name: string
  category: string
  sub_category: string
  color: string
  material?: string
  fit?: string
  length?: string
  neckline?: string
  detail?: string
  style_tags: string[]
}

// AI 搭配方案
export interface AIOutfitPlan {
  plan: number
  name: string
  score: number
  reason: string
  items: AIOutfitItem[]
}

// 收藏的灵感方案
export interface SavedInspiration {
  id: string
  plan: AIOutfitPlan
  createdAt: string
}
