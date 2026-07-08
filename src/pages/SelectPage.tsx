import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily } from '../lib/storage'
import type { Dish, DishType } from '../types'
import { DISH_CATEGORIES, DISH_TYPE_LABELS, MEAL_PLAN } from '../types'

const TYPE_BADGE: Record<DishType, { bg: string; text: string }> = {
  meat: { bg: '#FEF2F2', text: '#DC2626' },
  vegetable: { bg: '#F0FDF4', text: '#16A34A' },
  half: { bg: '#FFF7ED', text: '#EA580C' },
}

export default function SelectPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const people = Number(params.get('people') ?? 2)
  const isRandom = params.get('mode') === 'random'

  const [dishes, setDishes] = useState<Dish[]>([])
  const [selected, setSelected] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')

  const plan = MEAL_PLAN[people] ?? { meat: Math.ceil(people / 2), veg: Math.floor(people / 2) }
  const family = getFamily()

  useEffect(() => { loadDishes() }, [])

  async function loadDishes() {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .or(`is_public.eq.true${family ? `,family_id.eq.${family.id}` : ''}`)
      .order('name')
    setDishes(data ?? [])
    if (isRandom && data) randomSelect(data)
    setLoading(false)
  }

  function randomSelect(pool: Dish[]) {
    const meatPool = pool.filter(d => d.type === 'meat' || d.type === 'half')
    const vegPool = pool.filter(d => d.type === 'vegetable' || d.type === 'half')
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
    const picks = [
      ...shuffle(meatPool).slice(0, plan.meat),
      ...shuffle(vegPool).slice(0, plan.veg),
    ]
    setSelected(picks.filter((d, i, a) => a.findIndex(x => x.id === d.id) === i))
  }

  function toggle(dish: Dish) {
    setSelected(prev =>
      prev.find(d => d.id === dish.id)
        ? prev.filter(d => d.id !== dish.id)
        : [...prev, dish]
    )
  }

  const filtered = dishes.filter(d => {
    if (category !== '全部' && d.category !== category) return false
    if (search && !d.name.includes(search)) return false
    return true
  })

  const meatCount = selected.filter(d => d.type !== 'vegetable').length
  const vegCount = selected.filter(d => d.type === 'vegetable').length

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 顶部搜索栏 */}
      <div
        className="px-5 pt-6 pb-4 sticky top-0 z-10"
        style={{ background: 'rgba(255,251,235,0.9)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--color-muted)' }}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'inherit' }}>选菜</h1>
          <div
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            {meatCount}荤{vegCount}素
          </div>
        </div>

        {/* 搜索框 */}
        <div className="input flex items-center gap-2 mb-3">
          <Search size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <input
            placeholder="搜索菜品"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, padding: 0, fontSize: 'inherit', color: 'inherit' }}
          />
        </div>

        {/* 分类 pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['全部', ...DISH_CATEGORIES].map(c => (
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

      {/* 菜品列表 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-muted)' }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--color-muted)' }}>
          <span className="text-4xl">🍽️</span>
          <p className="text-sm">没有找到菜品</p>
        </div>
      ) : (
        <div className="px-5 py-4 grid grid-cols-2 gap-3" style={{ paddingBottom: selected.length > 0 ? 160 : 80 }}>
          {filtered.map(dish => {
            const isSelected = selected.some(d => d.id === dish.id)
            const badge = TYPE_BADGE[dish.type]
            return (
              <button
                key={dish.id}
                onClick={() => toggle(dish)}
                className="text-left active:scale-95 transition-all duration-150"
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  border: isSelected ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                  background: 'var(--color-surface)',
                  boxShadow: isSelected
                    ? '0 4px 20px rgba(234,88,12,0.20)'
                    : 'var(--shadow-card)',
                  cursor: 'pointer',
                }}
              >
                {/* 图片区 */}
                <div
                  className="aspect-square relative flex items-center justify-center"
                  style={{ background: '#FFF7ED' }}
                >
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-5xl">🍽️</span>
                  )}
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      <Check size={14} color="white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* 信息区 */}
                <div className="p-3">
                  <div className="font-semibold text-sm mb-1.5 truncate" style={{ color: 'var(--color-text)' }}>
                    {dish.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {DISH_TYPE_LABELS[dish.type]}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{dish.cook_time}min</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* 底部确认 */}
      {selected.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-md px-5 pt-4"
          style={{
            bottom: 'calc(var(--nav-height) + var(--safe-bottom))',
            paddingBottom: 16,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => navigate('/preview', { state: { dishes: selected, people } })}
            className="btn-primary w-full"
          >
            确认 {selected.length} 道菜，去预览 →
          </button>
        </div>
      )}
    </div>
  )
}
