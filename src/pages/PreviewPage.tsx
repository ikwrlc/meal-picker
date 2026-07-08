import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily, saveLocalRecord } from '../lib/storage'
import type { Dish } from '../types'
import { DISH_TYPE_LABELS } from '../types'

const TYPE_COLOR: Record<string, string> = {
  meat: '#DC2626',
  vegetable: '#16A34A',
  half: '#EA580C',
}

export default function PreviewPage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { dishes: Dish[]; people: number } }
  const [confirming, setConfirming] = useState(false)
  const family = getFamily()

  if (!state?.dishes) {
    navigate('/order', { replace: true })
    return null
  }

  const { dishes, people } = state
  const meatCount = dishes.filter(d => d.type !== 'vegetable').length
  const vegCount = dishes.filter(d => d.type === 'vegetable').length

  async function confirm() {
    if (confirming) return
    setConfirming(true)
    const today = new Date().toISOString().slice(0, 10)

    // 始终存本地
    saveLocalRecord({ date: today, people_count: people, dishes })

    // 有房间则额外同步云端
    if (family) {
      await supabase.from('meal_records').insert({
        family_id: family.id,
        date: today,
        people_count: people,
        dishes,
      })
    }

    navigate('/shopping', { state: { dishes }, replace: true })
  }

  return (
    <div className="min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 头部 */}
      <div className="px-5 pt-6 pb-4">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--color-muted)' }} className="mb-6 flex items-center gap-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl mb-1" style={{ color: 'var(--color-text)' }}>今日菜单</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {meatCount}荤 {vegCount}素 · 共{dishes.length}道 · {people}人份
        </p>
      </div>

      {/* 菜品列表 */}
      <div className="px-5 flex flex-col gap-3 pb-24">
        {dishes.map((dish, i) => (
          <div
            key={dish.id}
            className="flex items-center gap-4"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* 序号 */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              {i + 1}
            </div>

            {/* 图片 */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: '#FFF7ED' }}
            >
              {dish.image_url
                ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <span className="text-3xl">🍽️</span>
              }
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>{dish.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium" style={{ color: TYPE_COLOR[dish.type] }}>
                  {DISH_TYPE_LABELS[dish.type]}
                </span>
                <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--color-muted)' }}>
                  <Clock size={11} />
                  {dish.cook_time}min
                </span>
              </div>
              <div className="text-xs mt-1 truncate" style={{ color: 'var(--color-muted)' }}>
                {dish.ingredients.slice(0, 4).join('、')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md px-5 pt-4 flex gap-3"
        style={{
          bottom: 'calc(var(--nav-height) + var(--safe-bottom))',
          paddingBottom: 16,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost flex-1"
        >
          重新选
        </button>
        <button
          onClick={confirm}
          disabled={confirming}
          className="btn-primary flex-1"
          style={{ opacity: confirming ? 0.7 : 1 }}
        >
          {confirming ? '保存中…' : <><Check size={18} /> 就这个了</>}
        </button>
      </div>
    </div>
  )
}
