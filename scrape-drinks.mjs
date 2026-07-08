// 专门为饮料/水果分类重抓图片（用百度图片搜索）
// 用法：node scrape-drinks.mjs

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_READ_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_WRITE_KEY = process.env.SUPABASE_SECRET_KEY

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function getDishes() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/dishes?is_public=eq.true&select=id,name,category&or=(category.eq.饮料,category.eq.时令水果)&order=name`,
    { headers: { apikey: SUPABASE_READ_KEY, Authorization: `Bearer ${SUPABASE_READ_KEY}` } }
  )
  return res.json()
}

async function searchBaidu(name) {
  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&word=${encodeURIComponent(name)}&rn=5&pn=0&ie=utf-8&oe=utf-8`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://image.baidu.com/',
        'Accept': 'application/json',
      },
    })
    const json = await res.json()
    const items = json?.data?.filter(d => d?.thumbURL || d?.hoverURL || d?.middleURL)
    for (const item of items ?? []) {
      const url = item.middleURL || item.hoverURL || item.thumbURL
      if (url && url.startsWith('http')) return url
    }
  } catch {}
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
console.log(`饮料/水果共 ${dishes.length} 道，开始重抓\n`)

let ok = 0, fail = 0
for (let i = 0; i < dishes.length; i++) {
  const dish = dishes[i]
  const prefix = `[${String(i + 1).padStart(2, '0')}/${dishes.length}]`

  const imageUrl = await searchBaidu(dish.name)
  if (imageUrl) {
    await updateImage(dish.id, imageUrl)
    console.log(`${prefix} ✓ ${dish.name}`)
    ok++
  } else {
    console.log(`${prefix} ✗ ${dish.name} — 未找到`)
    fail++
  }
  await sleep(800 + Math.random() * 400)
}

console.log(`\n完成 — 成功 ${ok} / 失败 ${fail}`)
