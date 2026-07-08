import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, LogOut, Users, Home, UserPlus } from 'lucide-react'
import { getFamily, getMember, clearFamily } from '../lib/storage'

export default function SettingsPage() {
  const navigate = useNavigate()
  const family = getFamily()
  const member = getMember()
  const [copied, setCopied] = useState(false)

  function copyCode() {
    if (!family) return
    navigator.clipboard.writeText(family.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function leave() {
    if (!confirm('确认退出当前家庭？')) return
    clearFamily()
    navigate('/', { replace: true })
  }

  return (
    <div className="px-5 pt-14 pb-nav">
      <h1 className="text-2xl mb-6" style={{ color: 'var(--color-text)' }}>设置</h1>

      <div className="flex flex-col gap-3">
        {family ? (
          <>
            {/* 个人信息 */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-4 p-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)' }}
                >
                  <span className="text-white text-xl font-bold">
                    {member?.nickname?.[0] ?? '?'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{member?.nickname}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>家庭成员</div>
                </div>
              </div>
            </div>

            {/* 家庭信息 */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#FDE8D8' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
                  <Home size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>家庭名称</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{family.name}</div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
                    <Users size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>邀请码</div>
                </div>
                <div className="flex items-center justify-between pl-12">
                  <span
                    className="text-3xl font-bold tracking-widest"
                    style={{ color: 'var(--color-primary)', fontFamily: 'Calistoga, monospace' }}
                  >
                    {family.invite_code}
                  </span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{
                      background: copied ? '#DCFCE7' : '#FFF7ED',
                      color: copied ? '#16A34A' : 'var(--color-primary)',
                    }}
                  >
                    {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <p className="text-xs mt-2 pl-12" style={{ color: 'var(--color-muted)' }}>
                  分享给家人，共享菜品库和历史记录
                </p>
              </div>
            </div>

            <button
              onClick={leave}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold mt-2"
              style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', cursor: 'pointer' }}
            >
              <LogOut size={16} strokeWidth={2} />
              退出家庭
            </button>
          </>
        ) : (
          /* 未加入家庭 */
          <>
            <div
              style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '20px', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                  <Users size={20} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>暂未加入家庭</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>加入后可共享菜品库、历史记录和统计</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <UserPlus size={16} strokeWidth={2} />
                创建或加入家庭
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
