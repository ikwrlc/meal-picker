import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily, getLocalRecords } from '../lib/storage'
import type { Dish } from '../types'
import { DISH_CATEGORIES, DISH_TYPE_LABELS } from '../types'

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  meat: { bg: '#FEF2F2', text: '#DC2626' },
  vegetable: { bg: '#F0FDF4', text: '#16A34A' },
  half: { bg: '#FFF7ED', text: '#EA580C' },
}

export default function DishesPage() {
  const navigate = useNavigate()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')
  const family = getFamily()

  useEffect(() => { loadDishes() }, [])

  async function loadDishes() {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .or(`is_public.eq.true${family ? `,family_id.eq.${family.id}` : ''}`)
      .order('created_at', { ascending: true })
    setDishes(data ?? [])
    setLoading(false)
  }

  const countMap = getLocalRecords().reduce<Record<string, number>>((acc, r) => {
    r.dishes.forEach(d => { acc[d.id] = (acc[d.id] ?? 0) + 1 })
    return acc
  }, {})

  const filtered = dishes
    .filter(d => {
      if (category !== '全部' && d.category !== category) return false
      if (search && !d.name.includes(search)) return false
      return true
    })
    .sort((a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0))

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 顶部 */}
      <div
        className="px-5 pt-14 pb-4 sticky top-0 z-10"
        style={{ background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl" style={{ color: 'var(--color-text)' }}>菜品库</h1>
          <button
            onClick={() => navigate('/dishes/add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: 'white', boxShadow: 'var(--shadow-btn)' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            添加
          </button>
        </div>

        <div className="input flex items-center gap-2 mb-3">
          <Search size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <input
            placeholder="搜索菜品"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, padding: 0, fontSize: 'inherit', color: 'inherit' }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['全部', ...DISH_CATEGORIES].map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`pill ${category === c ? 'pill-active' : 'pill-inactive'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-muted)' }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--color-muted)' }}>
          <span className="text-5xl">🍽️</span>
          <p className="text-sm">暂无菜品</p>
          <button onClick={() => navigate('/dishes/add')} className="btn-primary px-6 py-3 text-sm" style={{ borderRadius: 12 }}>
            添加第一道菜
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 pb-nav flex flex-col gap-2.5">
          {filtered.map(dish => {
            const badge = TYPE_BADGE[dish.type]
            return (
              <div
                key={dish.id}
                className="flex items-center gap-4"
                style={{ background: 'var(--color-surface)', borderRadius: 18, padding: '12px 14px', boxShadow: 'var(--shadow-card)' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: '#FFF7ED' }}
                >
                  {dish.image_url
                    ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-3xl">🍽️</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{dish.name}</span>
                    {(countMap[dish.id] ?? 0) > 0 && (
                      <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background: '#FFF7ED', color: 'var(--color-primary)' }}>
                        选过 {countMap[dish.id]} 次
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {dish.category !== '饮料' && dish.category !== '时令水果' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.text }}>
                        {DISH_TYPE_LABELS[dish.type]}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{dish.category}</span>
                    <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                      <Clock size={11} />
                      {dish.cook_time}min
                    </span>
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                    {dish.ingredients.slice(0, 5).join('、')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
