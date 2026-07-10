const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CATEGORIES = '经典爆款、特色小炒、炖菜红烧、火锅水煮、汤羹、凉拌冷盘、精品大菜、时令水果、饮料'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { name } = await req.json()
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `你是中国家庭菜品分类助手。根据菜名，只返回以下 JSON，不要任何说明：
{"category":"分类","type":"类型","ingredients":["食材1","食材2"],"cook_time":分钟数,"note":null}
分类必须是：${CATEGORIES} 其中之一
type：meat（荤菜）、vegetable（素菜）、half（半荤半素）
ingredients：4-8 种主要食材
菜名：${name}`,
      }],
    }),
  })

  const ai = await resp.json()
  const text: string = ai.content?.[0]?.text ?? ''

  let result
  try {
    // strip optional markdown code fences
    result = JSON.parse(text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim())
  } catch {
    result = { category: '特色小炒', type: 'meat', ingredients: [], cook_time: 20, note: null }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
