// 设备本地存储工具，不依赖账号系统

const DEVICE_ID_KEY = 'meal_device_id'
const FAMILY_KEY = 'meal_family'
const MEMBER_KEY = 'meal_member'
const LOCAL_RECORDS_KEY = 'meal_records_local'

export interface LocalMealRecord {
  id: string
  date: string
  people_count: number
  dishes: { id: string; name: string; type: string; cook_time: number; ingredients: string[]; category: string; image_url: string | null }[]
  created_at: string
}

export function saveLocalRecord(record: Omit<LocalMealRecord, 'id' | 'created_at'>) {
  const records = getLocalRecords()
  const entry: LocalMealRecord = {
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  const updated = [entry, ...records].slice(0, 50)
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(updated))
}

export function getLocalRecords(): LocalMealRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RECORDS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function saveFamily(family: { id: string; name: string; invite_code: string }) {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(family))
}

export function getFamily() {
  const raw = localStorage.getItem(FAMILY_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveMember(member: { id: string; nickname: string }) {
  localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
}

export function getMember() {
  const raw = localStorage.getItem(MEMBER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearFamily() {
  localStorage.removeItem(FAMILY_KEY)
  localStorage.removeItem(MEMBER_KEY)
}

const SHOPPING_ITEMS_KEY = 'meal_shopping_items'

export interface ShoppingItem {
  name: string
  checked: boolean
}

export function saveShoppingItems(items: ShoppingItem[]) {
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items))
}

export function getShoppingItems(): ShoppingItem[] {
  try {
    return JSON.parse(localStorage.getItem(SHOPPING_ITEMS_KEY) ?? '[]')
  } catch {
    return []
  }
}
