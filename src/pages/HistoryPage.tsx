import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, RotateCcw, Trophy, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily, getLocalRecords } from '../lib/storage'
import type { LocalMealRecord } from '../lib/storage'

type Tab = 'history' | 'stats'

function formatDate(d: string) {
  const date = new Date(d)
  const today = new Date()
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('history')
  const [records, setRecords] = useState<LocalMealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const family = getFamily()

  useEffect(() => { load() }, [])

  async function load() {
    if (family) {
      const { data } = await supabase
        .from('meal_records')
        .select('*')
        .eq('family_id', family.id)
        .order('date', { ascending: false })
        .limit(50)
      setRecords(data ?? [])
    } else {
      setRecords(getLocalRecords())
    }
    setLoading(false)
  }

  // 统计计算
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
    const now = new Date(); const d = new Date(r.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const MEDAL = ['🥇', '🥈', '🥉']

  const empty = (
    <div className="card py-16 flex flex-col items-center justify-center gap-3" style={{ borderRadius: 20 }}>
      {tab === 'history'
        ? <CalendarDays size={40} style={{ color: 'var(--color-muted)', opacity: 0.4 }} strokeWidth={1.5} />
        : <TrendingUp size={40} style={{ color: 'var(--color-muted)', opacity: 0.4 }} strokeWidth={1.5} />}
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        {tab === 'history' ? '还没有记录，快去点菜吧' : '还没有数据'}
      </p>
    </div>
  )

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 顶部 */}
      <div
        className="px-5 pt-14 pb-3 sticky top-0 z-10"
        style={{ background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <h1 className="text-2xl mb-4" style={{ color: 'var(--color-text)' }}>历史</h1>

        {/* Tab 切换 */}
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: '#FDE8D8' }}
        >
          {(['history', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: tab === t ? 'var(--color-surface)' : 'transparent',
                color: tab === t ? 'var(--color-primary)' : 'var(--color-muted)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t === 'history' ? '点菜记录' : '统计'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 pb-nav flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>加载中…</div>
        ) : tab === 'history' ? (
          records.length === 0 ? empty : records.map(record => (
            <div
              key={record.id}
              style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                    <CalendarDays size={16} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {formatDate(record.date)}
                    </span>
                    <span className="text-xs ml-1.5" style={{ color: 'var(--color-muted)' }}>
                      {record.people_count}人 · {record.dishes.length}道菜
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/preview', { state: { dishes: record.dishes, people: record.people_count } })}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                  style={{ background: '#FFF7ED', color: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}
                >
                  <RotateCcw size={12} strokeWidth={2.5} />
                  再来一次
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {record.dishes.map((dish, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#FFF7ED', color: '#92400E' }}>
                    {dish.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          records.length === 0 ? empty : (
            <div className="flex flex-col gap-4">
              {/* 概览数字 */}
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
                  <div style={{ background: 'var(--color-primary)', width: `${meatPct}%`, transition: 'width 600ms ease', borderRadius: '999px 0 0 999px' }} />
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
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>最常吃</span>
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
                          <div style={{
                            height: '100%', borderRadius: 999,
                            background: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#D97706' : 'var(--color-primary)',
                            width: `${(count / maxCount) * 100}%`,
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
