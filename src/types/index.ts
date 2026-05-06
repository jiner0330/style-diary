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

export interface ClothingItem {
  id: string
  owner_id: string | null
  name: string
  category: ClothingCategory
  sub_category: string | null
  color: string
  material: string | null
  pattern: string | null
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
