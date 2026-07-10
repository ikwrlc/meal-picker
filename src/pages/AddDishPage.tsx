import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Sparkles, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/storage'
import type { DishType } from '../types'

async function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(800 / img.width, 600 / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const CATEGORIES = '经典爆款、特色小炒、炖菜红烧、火锅水煮、汤羹、凉拌冷盘、精品大菜、时令水果、饮料'
const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

function qwenFetch(content: string) {
  return fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [{ role: 'user', content }],
    }),
  })
}

interface AIDishInfo {
  category: string
  type: DishType
  ingredients: string[]
  cook_time: number
  note: string | null
}

async function analyzeWithQwen(name: string): Promise<AIDishInfo> {
  const resp = await qwenFetch(
    `你是中国家庭菜品分类助手。根据菜名，只返回以下 JSON，不要任何说明或代码块：
{"category":"分类","type":"类型","ingredients":["食材1","食材2"],"cook_time":分钟数,"note":null}
分类必须是：${CATEGORIES} 其中之一
type：meat（荤菜）、vegetable（素菜）、half（半荤半素）
ingredients：4-8 种主要食材
菜名：${name}`
  )
  const data = await resp.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  return JSON.parse(text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim())
}

async function checkDuplicate(name: string, existing: string[]): Promise<string | null> {
  if (existing.length === 0) return null
  const resp = await qwenFetch(
    `判断「${name}」和以下菜品列表中是否有本质上是同一道菜（同一道菜，叫法不同）。
如果有，只回复那个菜名；如果没有，只回复：无
菜品列表：${existing.join('、')}`
  )
  const data = await resp.json()
  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  return text === '无' || text === '' ? null : text
}

export default function AddDishPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [error, setError] = useState('')
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null)
  const [pendingAI, setPendingAI] = useState<AIDishInfo | null>(null)

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageDataUrl(await compressImage(file))
    e.target.value = ''
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageDataUrl) return null
    const blob = dataUrlToBlob(imageDataUrl)
    const path = `dishes/${getDeviceId()}_${Date.now()}.jpg`
    const { data: up } = await supabase.storage
      .from('user-assets')
      .upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
    if (!up) return null
    return supabase.storage.from('user-assets').getPublicUrl(up.path).data.publicUrl
  }

  async function doInsert(ai: AIDishInfo) {
    setLoadingLabel('上传图片中…')
    const image_url = await uploadImage()

    setLoadingLabel('保存中…')
    const { error: dbErr } = await supabase.from('dishes').insert({
      name: name.trim(),
      category: ai.category,
      type: ai.type,
      ingredients: ai.ingredients,
      cook_time: ai.cook_time,
      note: ai.note,
      is_public: true,
      family_id: null,
      created_by: null,
      image_url,
    })
    if (dbErr) throw new Error(dbErr.message)
    navigate(-1)
  }

  async function save() {
    if (!name.trim() || loading) return
    setLoading(true)
    setError('')
    setDuplicateOf(null)

    try {
      setLoadingLabel('AI 分析中…')
      const [ai, { data: existing }] = await Promise.all([
        analyzeWithQwen(name.trim()),
        supabase.from('dishes').select('name').eq('is_public', true),
      ])

      setLoadingLabel('检查重复…')
      const dup = await checkDuplicate(name.trim(), existing?.map(d => d.name) ?? [])

      if (dup) {
        setPendingAI(ai)
        setDuplicateOf(dup)
        setLoading(false)
        setLoadingLabel('')
        return
      }

      await doInsert(ai)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
      setLoading(false)
      setLoadingLabel('')
    }
  }

  async function confirmAnyway() {
    if (!pendingAI) return
    setLoading(true)
    setDuplicateOf(null)
    try {
      await doInsert(pendingAI)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
      setLoading(false)
      setLoadingLabel('')
    }
  }

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      <div
        className="flex items-center gap-3 px-5 sticky top-0 z-10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)',
          paddingBottom: 16,
          background: 'rgba(255,251,235,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#FFF7ED' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>添加菜品</h1>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 pb-nav">
        {/* 图片上传区 */}
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            style={{
              height: 220,
              borderRadius: 24,
              overflow: 'hidden',
              background: imageDataUrl ? 'transparent' : 'var(--color-surface)',
              border: imageDataUrl ? 'none' : '2px dashed rgba(234,88,12,0.25)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {imageDataUrl ? (
              <>
                <img src={imageDataUrl} className="w-full h-full object-cover" alt="预览" />
                <div
                  className="absolute inset-0 flex items-end justify-center pb-4"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }}
                >
                  <span className="text-white text-xs font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                    点击更换图片
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                  <Camera size={28} style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-center" style={{ color: 'var(--color-muted)' }}>点击上传菜品图片</p>
                  <p className="text-xs text-center mt-1" style={{ color: 'rgba(0,0,0,0.3)' }}>可选，支持拍照或相册</p>
                </div>
              </>
            )}
          </button>
          {imageDataUrl && (
            <button
              onClick={() => setImageDataUrl('')}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            >
              <X size={14} color="white" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* 菜名输入 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>菜品名称</label>
          <input
            className="input w-full"
            style={{ fontSize: 16 }}
            placeholder="如：宫保鸡丁"
            value={name}
            onChange={e => { setName(e.target.value); setDuplicateOf(null) }}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
        </div>

        {/* AI 提示 */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: '#FFF7ED' }}>
          <Sparkles size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} strokeWidth={2} />
          <span className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
            AI 将自动识别分类、食材、烹饪时长，并检查是否重复
          </span>
        </div>

        {/* 重复警告 */}
        {duplicateOf && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 20, padding: '16px 18px' }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400E' }}>可能已存在相同菜品</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#B45309' }}>
                  「{name.trim()}」和菜库中的「{duplicateOf}」可能是同一道菜，确认要继续添加吗？
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDuplicateOf(null); setPendingAI(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#FEF3C7', color: '#92400E', border: 'none', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={confirmAnyway}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#D97706', color: 'white', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? loadingLabel || '保存中…' : '仍然添加'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm px-4 py-3 rounded-2xl" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {!duplicateOf && (
          <button
            onClick={save}
            disabled={!name.trim() || loading}
            className="btn-primary mt-1 w-full"
            style={{ opacity: !name.trim() || loading ? 0.6 : 1 }}
          >
            {loading ? <><Sparkles size={16} strokeWidth={2} />{loadingLabel}</> : '保存菜品'}
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
    </div>
  )
}
