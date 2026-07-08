export type DishType = 'meat' | 'vegetable' | 'half'

export interface Dish {
  id: string
  name: string
  image_url: string | null
  category: string
  type: DishType
  ingredients: string[]
  cook_time: number
  note: string | null
  is_public: boolean
  family_id: string | null
  created_by: string | null
  created_at: string
}

export interface Family {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  nickname: string
  device_id: string
  created_at: string
}

export interface MealRecord {
  id: string
  family_id: string
  date: string
  people_count: number
  dishes: Dish[]
  created_at: string
}

export interface DishStat {
  dish_id: string
  family_id: string
  count: number
}

export const DISH_CATEGORIES = [
  '经典爆款', '特色小炒', '炖菜红烧', '火锅水煮',
  '汤羹', '凉拌冷盘', '精品大菜', '时令水果', '饮料',
] as const

export const DISH_TYPE_LABELS: Record<DishType, string> = {
  meat: '荤菜',
  vegetable: '素菜',
  half: '半荤',
}

export const MEAL_PLAN: Record<number, { meat: number; veg: number }> = {
  1: { meat: 1, veg: 0 },
  2: { meat: 1, veg: 1 },
  3: { meat: 2, veg: 1 },
  4: { meat: 2, veg: 2 },
  5: { meat: 3, veg: 2 },
  6: { meat: 3, veg: 3 },
}
