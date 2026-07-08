import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, CalendarDays, ChevronRight, Users, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily, saveFamily, saveMember, clearFamily, getDeviceId } from '../lib/storage'

type SheetMode = 'create' | 'join'

export default function HomePage() {
  const navigate = useNavigate()
  const family = getFamily()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>('create')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sheetOpen) setTimeout(() => inputRef.current?.focus(), 120)
    else { setCode(''); setError('') }
  }, [sheetOpen])

  function openSheet(mode: SheetMode) {
    setSheetMode(mode)
    setSheetOpen(true)
  }

  async function confirm() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) { setError('请输入 6 位房间码'); return }
    setLoading(true)
    setError('')

    if (sheetMode === 'create') {
      // 检查是否已存在
      const { data: existing } = await supabase.from('families').select('id').eq('invite_code', trimmed).single()
      if (existing) { setError('该房间码已被使用，换一个试试'); setLoading(false); return }
      const { data: fam, error: e } = await supabase
        .from('families').insert({ name: `房间 ${trimmed}`, invite_code: trimmed }).select().single()
      if (e || !fam) { setError('创建失败，请重试'); setLoading(false); return }
      const { data: mem } = await supabase
        .from('family_members').insert({ family_id: fam.id, nickname: '房主', device_id: getDeviceId() }).select().single()
      saveFamily(fam)
      if (mem) saveMember(mem)
    } else {
      const { data: fam, error: e } = await supabase
        .from('families').select().eq('invite_code', trimmed).single()
      if (e || !fam) { setError('找不到该房间码，确认一下？'); setLoading(false); return }
      const { data: mem } = await supabase
        .from('family_members').insert({ family_id: fam.id, nickname: '成员', device_id: getDeviceId() }).select().single()
      saveFamily(fam)
      if (mem) saveMember(mem)
    }

    setLoading(false)
    setSheetOpen(false)
    // 刷新组件
    window.location.reload()
  }

  return (
    <div className="px-5 pt-14 pb-nav">
      {/* 顶部标题 */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>今天吃什么</p>
        <h1 className="text-3xl mt-0.5" style={{ color: 'var(--color-text)', fontFamily: 'Calistoga, sans-serif' }}>
          开始点菜
        </h1>
      </div>

      {/* 主入口 */}
      <button
        onClick={() => navigate('/order')}
        className="w-full text-left mb-4 active:scale-95 transition-transform duration-150 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EA580C 0%, #F97316 60%, #FB923C 100%)',
          borderRadius: 28,
          padding: '28px 24px',
          boxShadow: '0 8px 32px rgba(234,88,12,0.35)',
          display: 'block',
        }}
      >
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h2 className="text-3xl text-white mb-1">今天吃什么？</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>随机搭配 · 按人数推荐</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <ChevronRight size={24} color="white" />
          </div>
        </div>
        <div style={{
          position: 'absolute', right: -10, bottom: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
      </button>

      {/* 和家人一起 */}
      <div
        className="mb-4"
        style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: 'var(--shadow-card)' }}
      >
        {family ? (
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                已在房间&nbsp;
                <span style={{ color: 'var(--color-primary)', fontFamily: 'Calistoga, monospace', letterSpacing: 2 }}>
                  {family.invite_code}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>历史记录和统计已同步</div>
            </div>
            <button
              onClick={() => { if (window.confirm('退出当前房间？')) { clearFamily(); window.location.reload() } }}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: '#FEF2F2', color: '#DC2626' }}
            >
              退出
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
                <Users size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>和家人一起选菜</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>创建或加入家庭房间，共享菜单历史</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openSheet('create')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                style={{ background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                创建房间
              </button>
              <button
                onClick={() => openSheet('join')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                style={{ background: '#FFF7ED', color: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}
              >
                加入房间
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 快捷功能 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/shopping')}
          className="p-5 text-left active:scale-95 transition-transform duration-150"
          style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: 'var(--shadow-card)', border: 'none', cursor: 'pointer' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FFF7ED' }}>
            <ShoppingCart size={20} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
          </div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>购物清单</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>今日食材</div>
        </button>

        <button
          onClick={() => navigate('/history')}
          className="p-5 text-left active:scale-95 transition-transform duration-150"
          style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: 'var(--shadow-card)', border: 'none', cursor: 'pointer' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FFF7ED' }}>
            <CalendarDays size={20} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
          </div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>历史菜单</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>回顾往日</div>
        </button>
      </div>

      {/* 底部抽屉遮罩 */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* 底部抽屉 */}
      <div
        className="fixed left-0 right-0 z-50 px-5 pt-6 pb-10"
        style={{
          bottom: 0,
          background: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {sheetMode === 'create' ? '创建房间' : '加入房间'}
          </h3>
          <button
            onClick={() => setSheetOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#F5F5F4' }}
          >
            <X size={16} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          {sheetMode === 'create'
            ? '自定义一个 6 位房间码，发给家人后一起用'
            : '输入家人分享的 6 位房间码'}
        </p>

        <input
          ref={inputRef}
          className="input text-center text-2xl font-bold tracking-[0.3em] uppercase mb-3"
          style={{ color: 'var(--color-primary)', letterSpacing: '0.3em' }}
          placeholder="ABC123"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && confirm()}
        />

        {error && (
          <p className="text-sm mb-3" style={{ color: '#DC2626' }}>{error}</p>
        )}

        <button
          onClick={confirm}
          disabled={loading || code.trim().length !== 6}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ opacity: loading || code.trim().length !== 6 ? 0.5 : 1 }}
        >
          {loading ? '处理中…' : <><Check size={16} strokeWidth={2.5} />{sheetMode === 'create' ? '创建' : '加入'}</>}
        </button>
      </div>
    </div>
  )
}
