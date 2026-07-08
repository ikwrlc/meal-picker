import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UtensilsCrossed, Home, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { saveFamily, saveMember, getDeviceId } from '../lib/storage'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [nickname, setNickname] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!nickname.trim() || !familyName.trim()) return
    setLoading(true)
    setError('')
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { data: family, error: e1 } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), invite_code: code })
      .select()
      .single()
    if (e1 || !family) { setError('创建失败，请重试'); setLoading(false); return }
    const { data: member, error: e2 } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, nickname: nickname.trim(), device_id: getDeviceId() })
      .select()
      .single()
    if (e2 || !member) { setError('创建失败，请重试'); setLoading(false); return }
    saveFamily(family)
    saveMember(member)
    navigate('/', { replace: true })
  }

  async function handleJoin() {
    if (!nickname.trim() || !inviteCode.trim()) return
    setLoading(true)
    setError('')
    const { data: family, error: e1 } = await supabase
      .from('families')
      .select()
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()
    if (e1 || !family) { setError('邀请码无效'); setLoading(false); return }
    const { data: member, error: e2 } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, nickname: nickname.trim(), device_id: getDeviceId() })
      .select()
      .single()
    if (e2 || !member) { setError('加入失败，请重试'); setLoading(false); return }
    saveFamily(family)
    saveMember(member)
    navigate('/', { replace: true })
  }

  if (mode === 'choose') {
    return (
      <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
        {/* 顶部装饰区 */}
        <div
          className="flex flex-col items-center justify-end pb-10 pt-20"
          style={{
            background: 'linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 60%, #FED7AA 100%)',
            borderRadius: '0 0 40px 40px',
            minHeight: 280,
          }}
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #EA580C, #F97316)',
              boxShadow: '0 8px 32px rgba(234,88,12,0.35)',
            }}
          >
            <UtensilsCrossed size={44} color="white" strokeWidth={1.8} />
          </div>
          <h1
            className="text-3xl mb-2"
            style={{ color: 'var(--color-text)', fontFamily: 'Calistoga, sans-serif' }}
          >
            今日吃什么
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>家庭智能点菜助手</p>
        </div>

        {/* 选择区 */}
        <div className="px-6 pt-8 flex flex-col gap-3">
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-4 w-full text-left active:scale-95 transition-transform"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 20,
              padding: '18px 20px',
              boxShadow: 'var(--shadow-card)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
            >
              <Home size={22} color="white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>创建家庭</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>新建家庭，邀请家人加入</div>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="flex items-center gap-4 w-full text-left active:scale-95 transition-transform"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 20,
              padding: '18px 20px',
              boxShadow: 'var(--shadow-card)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#FFF7ED' }}
            >
              <Users size={22} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>加入家庭</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>输入邀请码，加入已有家庭</div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-svh" style={{ background: 'var(--color-bg)' }}>
      {/* 顶部 */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <button
          onClick={() => setMode('choose')}
          className="flex items-center gap-2 mb-4"
          style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span className="text-sm">返回</span>
        </button>
        <h2 className="text-2xl" style={{ color: 'var(--color-text)', fontFamily: 'Calistoga, sans-serif' }}>
          {mode === 'create' ? '创建家庭' : '加入家庭'}
        </h2>
      </div>

      <div className="px-5 pt-6 flex flex-col gap-4">
        {/* 昵称 */}
        <div
          style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}
        >
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>我的昵称</label>
          <input
            className="input"
            placeholder="如：爸爸、妈妈、小明"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>

        {mode === 'create' ? (
          <div
            style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}
          >
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>家庭名称</label>
            <input
              className="input"
              placeholder="如：我家的厨房"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
            />
          </div>
        ) : (
          <div
            style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '16px 18px', boxShadow: 'var(--shadow-card)' }}
          >
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-muted)' }}>邀请码</label>
            <input
              className="input uppercase tracking-[0.25em] text-center text-lg font-semibold"
              placeholder="6 位邀请码"
              value={inviteCode}
              maxLength={6}
              onChange={e => setInviteCode(e.target.value)}
              style={{ letterSpacing: '0.25em', color: 'var(--color-primary)' }}
            />
          </div>
        )}

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-2xl"
            style={{ background: '#FEF2F2', color: '#DC2626' }}
          >
            {error}
          </div>
        )}

        <button
          onClick={mode === 'create' ? handleCreate : handleJoin}
          disabled={loading || !nickname.trim() || (mode === 'create' ? !familyName.trim() : !inviteCode.trim())}
          className="btn-primary mt-2"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '处理中…' : mode === 'create' ? '创建家庭' : '加入家庭'}
        </button>
      </div>
    </div>
  )
}
