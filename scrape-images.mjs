// 从下厨房搜索菜品图片，批量更新到 Supabase
// 用法：node scrape-images.mjs

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_READ_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_WRITE_KEY = process.env.SUPABASE_SECRET_KEY

const SUPABASE_HEADERS = {
  apikey: SUPABASE_READ_KEY,
  Authorization: `Bearer ${SUPABASE_READ_KEY}`,
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function getDishes() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/dishes?is_public=eq.true&image_url=is.null&select=id,name&order=name`,
    { headers: SUPABASE_HEADERS }
  )
  return res.json()
}

async function searchImage(name) {
  const url = `https://www.xiachufang.com/search/?keyword=${encodeURIComponent(name)}&cat=1003`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://www.xiachufang.com/',
    },
  })

  if (!res.ok) return null
  const html = await res.text()

  // 优先匹配 data-src（懒加载），其次匹配 src
  const patterns = [
    /class="[^"]*cover[^"]*"[^>]*>\s*<img[^>]+data-src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    /class="[^"]*cover[^"]*"[^>]*>\s*<img[^>]+src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    /data-src="(https:\/\/i\d*\.xiachufang\.com\/[^"]+)"/,
    /src="(https:\/\/i\d*\.xiachufang\.com\/[^"]+)"/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1] && !match[1].includes('placeholder') && !match[1].includes('default')) {
      return match[1]
    }
  }
  return null
}

async function updateImage(id, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dishes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_WRITE_KEY,
      Authorization: `Bearer ${SUPABASE_WRITE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ image_url: imageUrl }),
  })
  return res.ok
}

const dishes = await getDishes()
if (!Array.isArray(dishes) || dishes.length === 0) {
  console.log('没有需要补图的菜品（可能都已有图片，或请求失败）')
  process.exit(0)
}

console.log(`共 ${dishes.length} 道菜待补图\n`)

let ok = 0, fail = 0
for (let i = 0; i < dishes.length; i++) {
  const dish = dishes[i]
  const prefix = `[${String(i + 1).padStart(2, '0')}/${dishes.length}]`

  const imageUrl = await searchImage(dish.name)
  if (imageUrl) {
    const updated = await updateImage(dish.id, imageUrl)
    if (updated) {
      console.log(`${prefix} ✓ ${dish.name}`)
      ok++
    } else {
      console.log(`${prefix} ✗ ${dish.name} — 更新失败`)
      fail++
    }
  } else {
    console.log(`${prefix} ✗ ${dish.name} — 未找到图片`)
    fail++
  }

  // 避免被限速，每次请求间隔 1~1.5s
  await sleep(1000 + Math.random() * 500)
}

console.log(`\n完成 — 成功 ${ok} / 失败 ${fail}`)
