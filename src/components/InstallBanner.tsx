import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'pwa_install_dismissed'

export default function InstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (isIOS && !isStandalone && !dismissed) {
      // 延迟 3 秒再显示，避免刚进来就打扰
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed left-0 right-0 z-50 px-4"
      style={{ bottom: 'calc(var(--nav-height) + 12px)' }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
        style={{
          background: '#1C1917',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          maxWidth: 448,
          margin: '0 auto',
        }}
      >
        {/* App icon */}
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
          style={{ background: '#EA580C' }}
        >
          <img src="/icon.svg" alt="icon" className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">添加到主屏幕</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            点底部
            {/* Share icon inline */}
            <span
              className="inline-flex items-center justify-center mx-1 px-1.5 rounded"
              style={{ background: 'rgba(255,255,255,0.15)', verticalAlign: 'middle' }}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <path d="M6 1v8M3 4l3-3 3 3M1 10v2.5A.5.5 0 001.5 13h9a.5.5 0 00.5-.5V10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            分享 → 「添加到主屏幕」，以后直接从桌面打开
          </p>
        </div>

        <button
          onClick={dismiss}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mt-0.5"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <X size={12} color="white" />
        </button>
      </div>
    </div>
  )
}
