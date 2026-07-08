import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getFamily } from '../lib/storage'
import type { MealRecord } from '../types'

export default function StatsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<MealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const family = getFamily()

  useEffect(() => { load() }, [])

  async function load() {
    if (!family) { setLoading(false); return }
    const { data } = await supabase
      .from('meal_records')
      .select('*')
      .eq('family_id', family.id)
      .order('date', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }

  const allDishes = records.flatMap(r => r.dishes)
  const countMap = allDishes.reduce<Record<string, number>>((acc, d) => {
    acc[d.name] = (acc[d.name] ?? 0) + 1
    return acc
  }, {})
  const ranking = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxCount = ranking[0]?.[1] ?? 1

  const meatCount = allDishes.filter(d => d.type !== 'vegetable').length
  const vegCount = allDishes.filter(d => d.type === 'vegetable').length
  const total = meatCount + vegCount || 1
  const meatPct = Math.round(meatCount / total * 100)

  const thisMonth = records.filter(r => {
    const now = new Date()
    const d = new Date(r.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div className="px-5 pt-14 pb-nav">
      <h1 className="text-2xl mb-6" style={{ color: 'var(--color-text)' }}>统计</h1>

      {!family ? (
        <div className="card py-12 flex flex-col items-center justify-center gap-4" style={{ borderRadius: 20 }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
            <Users size={28} style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>加入家庭后查看统计</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>统计最爱菜品、荤素比例和点菜频率</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5 text-sm">
            创建或加入家庭
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>加载中…</div>
      ) : records.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3" style={{ borderRadius: 20 }}>
          <TrendingUp size={40} style={{ color: 'var(--color-muted)', opacity: 0.5 }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>还没有数据</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 数字概览 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '累计点菜', value: records.length, unit: '次' },
              { label: '本月点菜', value: thisMonth.length, unit: '次' },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
                <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'Calistoga, sans-serif' }}>
                  {value}<span className="text-lg ml-0.5">{unit}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 荤素比例 */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>荤素比例</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>荤 {meatPct}% · 素 {100 - meatPct}%</span>
            </div>
            <div className="flex rounded-full overflow-hidden" style={{ height: 10, background: '#F0FDF4' }}>
              <div
                style={{ background: 'var(--color-primary)', width: `${meatPct}%`, transition: 'width 600ms ease', borderRadius: '999px 0 0 999px' }}
              />
              <div style={{ background: '#22C55E', flex: 1, borderRadius: '0 999px 999px 0' }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
                荤 {meatCount}道
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: '#16A34A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                素 {vegCount}道
              </span>
            </div>
          </div>

          {/* 排行榜 */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} style={{ color: '#F59E0B' }} strokeWidth={2} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>最受欢迎</span>
            </div>
            <div className="flex flex-col gap-3">
              {ranking.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center flex-shrink-0">{MEDAL[i] ?? `${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{name}</span>
                      <span className="text-xs font-semibold ml-2 flex-shrink-0" style={{ color: 'var(--color-primary)' }}>{count}次</span>
                    </div>
                    <div style={{ height: 4, background: '#FDE8D8', borderRadius: 999 }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 999,
                          background: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#D97706' : 'var(--color-primary)',
                          width: `${(count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
