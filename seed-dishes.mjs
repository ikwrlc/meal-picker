import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Prefer': 'return=minimal',
}

const raw = JSON.parse(
  readFileSync(join(__dirname, '../今日吃什么-初始菜品数据.json'), 'utf-8')
)

// 删除旧公共菜品
const del = await fetch(`${URL}/rest/v1/dishes?is_public=eq.true`, {
  method: 'DELETE',
  headers,
})
if (!del.ok) {
  const t = await del.text()
  console.error('清除失败:', t)
  process.exit(1)
}
console.log('✓ 已清除旧公共菜品')

// 批量插入
const records = raw.map(d => ({
  name: d.name,
  category: d.category,
  type: d.type,
  ingredients: d.ingredients,
  cook_time: d.cook_time,
  is_public: true,
  image_url: null,
  note: null,
  family_id: null,
  created_by: null,
}))

const ins = await fetch(`${URL}/rest/v1/dishes`, {
  method: 'POST',
  headers,
  body: JSON.stringify(records),
})
if (!ins.ok) {
  const t = await ins.text()
  console.error('插入失败:', t)
  process.exit(1)
}

console.log(`✓ 成功导入 ${records.length} 道菜`)
