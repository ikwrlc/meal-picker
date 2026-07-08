import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shuffle, Hand } from 'lucide-react'
import { MEAL_PLAN } from '../types'

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6]
const PEOPLE_EMOJI = ['🧑', '👫', '👨‍👩‍👦', '👨‍👩‍👧‍👦', '🏠', '🎉']

export default function OrderPage() {
  const navigate = useNavigate()
  const [people, setPeople] = useState(0)

  function getPlan(n: number) {
    return MEAL_PLAN[n] ?? { meat: Math.ceil(n / 2), veg: Math.floor(n / 2) }
  }

  const plan = getPlan(people)
  const total = plan.meat + plan.veg

  return (
    <div className="px-5 pt-6 min-h-svh">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-8"
        style={{ color: 'var(--color-muted)', fontSize: 15 }}
      >
        <ArrowLeft size={18} strokeWidth={2} />
        返回
      </button>

      <h1 className="text-3xl mb-1" style={{ color: 'var(--color-text)' }}>今日点菜</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>今天几个人吃饭？</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {PEOPLE_OPTIONS.map((n, i) => {
          const isSelected = people === n
          return (
            <button
              key={n}
              onClick={() => setPeople(n)}
              className="flex flex-col items-center gap-2 py-5 active:scale-95 transition-all duration-150"
              style={{
                borderRadius: 20,
                background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                boxShadow: isSelected ? 'var(--shadow-btn)' : 'var(--shadow-card)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span className="text-2xl">{PEOPLE_EMOJI[i]}</span>
              <span
                className="text-xl font-bold"
                style={{ color: isSelected ? 'white' : 'var(--color-text)', fontFamily: 'Calistoga, sans-serif' }}
              >
                {n}人
              </span>
              <span
                className="text-xs"
                style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)' }}
              >
                {getPlan(n).meat}荤{getPlan(n).veg}素
              </span>
            </button>
          )
        })}
      </div>

      {people > 0 && (
        <div className="flex flex-col gap-3">
          {/* 搭配提示 */}
          <div
            className="flex items-center gap-3 p-4"
            style={{ borderRadius: 16, background: '#FFF7ED', border: '1px solid #FDE8D8' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                建议 {plan.meat} 荤 + {plan.veg} 素
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                共 {total} 道菜，营养均衡
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/select?people=${people}&mode=random`)}
            className="btn-primary w-full"
          >
            <Shuffle size={18} />
            随机帮我选
          </button>

          <button
            onClick={() => navigate(`/select?people=${people}&mode=manual`)}
            className="btn-ghost w-full"
          >
            <Hand size={18} />
            我自己选
          </button>
        </div>
      )}
    </div>
  )
}
