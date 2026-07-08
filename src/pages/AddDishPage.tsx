import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Clock, ChefHat } from 'lucide-react'
import type { DishType } from '../types'
import { DISH_CATEGORIES } from '../types'
import { supabase } from '../lib/supabase'
import { getFamily, getMember } from '../lib/storage'

const TYPE_OPTIONS: { value: DishType; label: string; bg: string; color: string }[] = [
  { value: 'meat', label: '荤菜', bg: '#FEF2F2', color: '#DC2626' },
  { value: 'half', label: '半荤', bg: '#FFF7ED', color: '#EA580C' },
  { value: 'vegetable', label: '素菜', bg: '#F0FDF4', color: '#16A34A' },
]

export default function AddDishPage() {
  const navigate = useNavigate()
  const family = getFamily()
  const member = getMember()

  const [name, setName] = useState('')
  const [category, setCategory] = useState(DISH_CATEGORIES[0])
  const [type, setType] = useState<DishType>('meat')
  const [ingredients, setIngredients] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [note, setNote] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchAI() {
    if (!name.trim()) return
    setAiLoading(true)
    // TODO: 接入通义千问 API
    setIngredients('（AI 填写功能待接入）')
    setCookTime('20')
    setAiLoading(false)
  }

  async function save() {
    if (!name.trim() || !family) return
    setLoading(true)
    setError('')
    const { error: e } = await supabase.from('dishes').insert({
      name: name.trim(),
      category,
      type,
      ingredients: ingredients.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean),
      cook_time: Number(cookTime) || 20,
      note: note.trim() || null,
      is_public: isPublic,
      family_id: isPublic ? null : family.id,
      created_by: member?.id ?? null,
      image_url: null,
    })
    if (e) { setError('保存失败：' + e.message); setLoading(false); return }
    navigate('/dishes', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 顶部 */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 sticky top-0 z-10"
        style={{ background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#FFF7ED', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>添加菜品</h1>
      </div>

      <div className="px-5 py-4 pb-12 flex flex-col gap-4">
        {/* 菜名 + AI */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
            <ChefHat size={13} strokeWidth={2} />
            菜名
          </label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="如：宫保鸡丁"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button
              onClick={fetchAI}
              disabled={!name.trim() || aiLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{
                background: name.trim() ? 'var(--color-primary)' : '#F5F5F4',
                color: name.trim() ? 'white' : 'var(--color-muted)',
                border: 'none',
                cursor: name.trim() ? 'pointer' : 'default',
                boxShadow: name.trim() ? 'var(--shadow-btn)' : 'none',
                transition: 'all 200ms',
              }}
            >
              <Sparkles size={14} strokeWidth={2} />
              {aiLoading ? '…' : 'AI'}
            </button>
          </div>
        </div>

        {/* 荤素 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-3 block" style={{ color: 'var(--color-muted)' }}>荤素分类</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: type === opt.value ? opt.bg : '#FAFAF9',
                  color: type === opt.value ? opt.color : 'var(--color-muted)',
                  border: type === opt.value ? `1.5px solid ${opt.color}30` : '1.5px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分类 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-3 block" style={{ color: 'var(--color-muted)' }}>食材类别</label>
          <div className="flex flex-wrap gap-2">
            {DISH_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`pill ${category === c ? 'pill-active' : 'pill-inactive'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 食材 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>食材（逗号或换行分隔）</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="猪里脊、木耳、胡萝卜…"
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
          />
        </div>

        {/* 时间 + 备注 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}>
          <label className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
            <Clock size={13} strokeWidth={2} />
            烹饪时间（分钟）
          </label>
          <input
            type="number"
            className="input mb-4"
            placeholder="20"
            value={cookTime}
            onChange={e => setCookTime(e.target.value)}
          />
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>备注</label>
          <input
            className="input"
            placeholder="如：孩子爱吃、节日才做"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {/* 公开选项 */}
        <button
          onClick={() => setIsPublic(v => !v)}
          className="flex items-center gap-3 w-full text-left"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 20,
            padding: '16px 18px',
            boxShadow: 'var(--shadow-card)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 22, height: 22,
              borderRadius: 6,
              background: isPublic ? 'var(--color-primary)' : 'transparent',
              border: isPublic ? 'none' : '2px solid #D6D3D1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 200ms',
            }}
          >
            {isPublic && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>上传到公共菜库</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>所有家庭均可看到此菜品</div>
          </div>
        </button>

        {error && (
          <div className="text-sm px-4 py-3 rounded-2xl" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={!name.trim() || loading}
          className="btn-primary mt-2"
          style={{ opacity: !name.trim() || loading ? 0.5 : 1 }}
        >
          {loading ? '保存中…' : '保存菜品'}
        </button>
      </div>
    </div>
  )
}
