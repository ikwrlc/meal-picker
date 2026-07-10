import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, ShoppingCart, X, Shuffle, Copy, Check, Pencil, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFamily, getMember, getDeviceId, saveLocalRecord, getLocalRecords, getProfile, saveProfile } from '../lib/storage'
import type { Dish } from '../types'
import { DISH_CATEGORIES, MEAL_PLAN } from '../types'

const BG_THEMES = [
  { label: '橙焰', value: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)' },
  { label: '暖红', value: 'linear-gradient(135deg, #DC2626 0%, #F87171 100%)' },
  { label: '海蓝', value: 'linear-gradient(135deg, #1D4ED8 0%, #60A5FA 100%)' },
  { label: '森绿', value: 'linear-gradient(135deg, #15803D 0%, #4ADE80 100%)' },
  { label: '紫韵', value: 'linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)' },
  { label: '暖金', value: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)' },
]

async function compressImage(file: File, maxW: number, maxH: number, quality = 0.82): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 10) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

interface SuccessData {
  dishes: Dish[]
  ingredients: string[]
  peopleCount: number
  dateLabel: string
}

const CATEGORY_ICONS: Record<string, string> = {
  '全部': '🍽️',
  '经典爆款': '🔥',
  '特色小炒': '🥘',
  '炖菜红烧': '🍲',
  '火锅水煮': '🫕',
  '汤羹': '🍜',
  '凉拌冷盘': '🥗',
  '精品大菜': '⭐',
  '时令水果': '🍎',
  '饮料': '🥤',
}

interface CartItem { dish: Dish; qty: number }

export default function MainPage() {
  const navigate = useNavigate()
  const family = getFamily()
  const member = getMember()

  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('全部')
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map())
  const [cartOpen, setCartOpen] = useState(false)
  const [peopleCount, setPeopleCount] = useState(3)
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [copied, setCopied] = useState(false)
  const [isRandomized, setIsRandomized] = useState(false)
  const [profile, setProfile] = useState(getProfile)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editBg, setEditBg] = useState('')
  const [editBgImage, setEditBgImage] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const countMap = useMemo(() => {
    return getLocalRecords().reduce<Record<string, number>>((acc, r) => {
      r.dishes.forEach(d => { acc[d.id] = (acc[d.id] ?? 0) + 1 })
      return acc
    }, {})
  }, [])

  useEffect(() => {
    loadDishes()
    loadProfileFromDB()
  }, [])

  async function loadProfileFromDB() {
    const deviceId = getDeviceId()
    const { data } = await supabase
      .from('user_profiles')
      .select('nickname, avatar_url, bg_image_url, bg_theme')
      .eq('device_id', deviceId)
      .single()
    if (!data) return
    const local = getProfile()
    const updated = {
      nickname: data.nickname || local.nickname,
      avatar: data.avatar_url || local.avatar,
      bgImage: data.bg_image_url || local.bgImage,
      bgTheme: data.bg_theme || local.bgTheme,
    }
    saveProfile(updated)
    setProfile(updated)
  }

  async function loadDishes() {
    setLoading(true)
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .or(`is_public.eq.true${family ? `,family_id.eq.${family.id}` : ''}`)
      .order('created_at', { ascending: true })
    setDishes(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return dishes.filter(d => category === '全部' || d.category === category)
  }, [dishes, category])

  const totalItems = useMemo(() => {
    let n = 0; cart.forEach(i => { n += i.qty }); return n
  }, [cart])

  const cartList = useMemo(() => [...cart.values()], [cart])

  const allIngredients = useMemo(() => {
    const set = new Set<string>()
    cartList.forEach(({ dish }) => dish.ingredients.forEach(ing => set.add(ing)))
    return [...set]
  }, [cartList])

  const addToCart = useCallback((dish: Dish) => {
    setCart(prev => {
      const next = new Map(prev)
      const cur = next.get(dish.id)
      next.set(dish.id, { dish, qty: (cur?.qty ?? 0) + 1 })
      return next
    })
  }, [])

  const removeFromCart = useCallback((dishId: string) => {
    setCart(prev => {
      const next = new Map(prev)
      const cur = next.get(dishId)
      if (!cur) return prev
      if (cur.qty <= 1) next.delete(dishId)
      else next.set(dishId, { ...cur, qty: cur.qty - 1 })
      return next
    })
  }, [])

  function randomize(count?: number) {
    const n = count ?? peopleCount
    const plan = MEAL_PLAN[Math.min(n, 6)] ?? MEAL_PLAN[3]
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)

    const isWeekend = [0, 6].includes(new Date().getDay())
    const excludeCategories = new Set(['时令水果', '饮料', '汤羹', ...(!isWeekend ? ['精品大菜', '炖菜红烧'] : [])])
    const eligible = dishes.filter(d => !excludeCategories.has(d.category))

    const picks = [
      ...shuffle(eligible.filter(d => d.type === 'meat' || d.type === 'half')).slice(0, plan.meat),
      ...shuffle(eligible.filter(d => d.type === 'vegetable')).slice(0, plan.veg),
    ]

    // 40% 概率带一道汤，不占主菜名额
    if (Math.random() < 0.4) {
      const soups = shuffle(dishes.filter(d => d.category === '汤羹'))
      if (soups.length > 0) picks.push(soups[0])
    }
    const newCart = new Map<string, CartItem>()
    picks.forEach(d => newCart.set(d.id, { dish: d, qty: 1 }))
    setCart(newCart)
    setIsRandomized(true)
    setCartOpen(true)
  }

  async function confirmOrder() {
    if (cart.size === 0) return
    setConfirming(true)
    const dishList = cartList.map(i => i.dish)
    const ings = [...new Set(dishList.flatMap(d => d.ingredients))]
    const today = new Date()
    const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`

    if (family) {
      await supabase.from('meal_records').insert({
        family_id: family.id,
        date: today.toISOString().slice(0, 10),
        people_count: peopleCount,
        dishes: dishList,
        created_by: member?.id ?? null,
      })
    }

    saveLocalRecord({ date: today.toISOString().slice(0, 10), dishes: dishList, people_count: peopleCount })
    setCart(new Map())
    setCartOpen(false)
    setConfirming(false)
    setSuccess({ dishes: dishList, ingredients: ings, peopleCount, dateLabel })
  }

  function buildCopyText(data: SuccessData) {
    const lines = [
      `📋 今日菜单 · ${data.dateLabel}`,
      `👥 ${data.peopleCount}人份 · 共${data.dishes.length}道`,
      '',
      ...data.dishes.map(d => `🍽 ${d.name}`),
      '',
      `🛒 食材清单`,
      data.ingredients.join('、'),
    ]
    return lines.join('\n')
  }

  function openProfileSheet() {
    setEditNickname(profile.nickname)
    setEditBg(profile.bgTheme)
    setEditBgImage(profile.bgImage)
    setEditAvatar(profile.avatar)
    setProfileSheetOpen(true)
  }

  async function uploadToStorage(dataUrl: string, path: string): Promise<string> {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const { data, error } = await supabase.storage
        .from('user-assets')
        .upload(`${path}.${ext}`, blob, { upsert: true, contentType: blob.type })
      if (error || !data) return dataUrl
      const { data: { publicUrl } } = supabase.storage.from('user-assets').getPublicUrl(data.path)
      return publicUrl
    } catch {
      return dataUrl
    }
  }

  async function saveProfileChanges() {
    setSaving(true)
    const deviceId = getDeviceId()
    let avatarUrl = editAvatar
    let bgImageUrl = editBgImage

    if (editAvatar.startsWith('data:')) {
      avatarUrl = await uploadToStorage(editAvatar, `avatars/${deviceId}`)
    }
    if (editBgImage.startsWith('data:')) {
      bgImageUrl = await uploadToStorage(editBgImage, `backgrounds/${deviceId}`)
    }

    await supabase.from('user_profiles').upsert({
      device_id: deviceId,
      nickname: editNickname.trim(),
      avatar_url: avatarUrl || null,
      bg_image_url: bgImageUrl || null,
      bg_theme: editBg,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' })

    const updated = {
      nickname: editNickname.trim(),
      bgTheme: editBg,
      bgImage: bgImageUrl,
      avatar: avatarUrl,
    }
    saveProfile(updated)
    setProfile(updated)
    setSaving(false)
    setProfileSheetOpen(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 200, 200, 0.85)
    setEditAvatar(dataUrl)
    e.target.value = ''
  }

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 900, 400, 0.78)
    setEditBgImage(dataUrl)
    e.target.value = ''
  }

  async function copyMenu() {
    if (!success) return
    try {
      await navigator.clipboard.writeText(buildCopyText(success))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // 兜底：选中文本提示用户手动复制
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100svh', background: 'var(--color-bg)' }}>
      {/* Header banner */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          height: 'calc(190px + env(safe-area-inset-top, 0px))',
          ...(profile.bgImage
            ? { backgroundImage: `url(${profile.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: profile.bgTheme }),
        }}
      >
        {/* Bottom gradient for readability */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.38) 0%, transparent 100%)' }}
        />

        {/* Avatar + name — just below safe area */}
        <button
          onClick={openProfileSheet}
          className="absolute px-4 flex items-center gap-3 active:opacity-80 transition-opacity"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 95px)', left: 0, transform: 'translateY(-50%)' }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}
          >
            {profile.avatar
              ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-lg">
                  {(profile.nickname || '美')[0]}
                </span>
            }
          </div>
          <div className="text-left">
            <div className="text-white font-semibold text-base leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              {getGreeting()}，{profile.nickname || '美食家'}
            </div>
            <div className="flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12 }}>
              <span>今天吃什么？</span>
              <Pencil size={10} strokeWidth={2} />
            </div>
          </div>
        </button>

        {/* 添加菜品 — bottom right */}
        <button
          onClick={() => navigate('/dishes/add')}
          className="absolute right-4 bottom-4 flex items-center gap-2 active:scale-95 transition-transform"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 999,
            padding: '8px 16px',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          添加菜品
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left category sidebar */}
        <div
          className="flex-shrink-0 overflow-y-auto no-scrollbar"
          style={{ width: 68, background: '#F7F5F2', borderRight: '1px solid rgba(0,0,0,0.05)', paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom))' }}
        >
          {(['全部', ...DISH_CATEGORIES] as string[]).map(c => {
            const isActive = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="w-full flex flex-col items-center py-3 px-1 gap-1"
                style={{
                  background: isActive ? 'var(--color-bg)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[c] ?? '🍴'}</span>
                <span
                  style={{
                    fontSize: 10,
                    lineHeight: 1.3,
                    textAlign: 'center',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
                    fontWeight: isActive ? 700 : 400,
                    wordBreak: 'keep-all',
                  }}
                >
                  {c}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right dish list */}
        <div
          className="flex-1 overflow-y-auto py-2 px-3"
          style={{ paddingBottom: totalItems > 0 ? 'calc(var(--nav-height) + var(--safe-bottom) + 80px)' : 'calc(var(--nav-height) + var(--safe-bottom) + 12px)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-muted)' }}>
              加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <span style={{ fontSize: 40 }}>🍽️</span>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>还没有菜品</p>
              <button
                onClick={() => navigate('/dishes/add')}
                className="btn-primary px-5 py-2.5 text-sm"
                style={{ borderRadius: 12 }}
              >
                添加第一道菜
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(dish => {
                const qty = cart.get(dish.id)?.qty ?? 0
                const timesChosen = countMap[dish.id] ?? 0
                return (
                  <div
                    key={dish.id}
                    className="flex items-center gap-3"
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 16,
                      padding: '10px 12px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    {/* Image */}
                    <div
                      className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: '#FFF7ED' }}
                    >
                      {dish.image_url
                        ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <span style={{ fontSize: 26 }}>🍽️</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                          {dish.name}
                        </span>
                        {timesChosen > 0 && (
                          <span
                            className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{ background: '#FFF7ED', color: 'var(--color-primary)', fontSize: 10 }}
                          >
                            选过{timesChosen}次
                          </span>
                        )}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                        {dish.ingredients.slice(0, 4).join('、') || '暂无食材'}
                      </div>
                    </div>

                    {/* Cart control */}
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(dish)}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                        style={{ background: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(234,88,12,0.3)' }}
                      >
                        <Plus size={16} color="white" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => removeFromCart(dish.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: '#FFF7ED', border: '1.5px solid var(--color-primary)' }}
                        >
                          <Minus size={13} style={{ color: 'var(--color-primary)' }} strokeWidth={2.5} />
                        </button>
                        <span className="text-sm font-bold w-5 text-center" style={{ color: 'var(--color-text)' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(dish)}
                          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          <Plus size={13} color="white" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating random button */}
      <button
        onClick={randomize}
        className="fixed z-30 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl active:scale-95 transition-all"
        style={{
          right: 14,
          bottom: `calc(var(--nav-height) + ${totalItems > 0 ? 80 : 14}px)`,
          background: 'linear-gradient(135deg, #EA580C, #F97316)',
          boxShadow: '0 4px 18px rgba(234,88,12,0.4)',
          color: 'white',
          fontSize: 13,
          fontWeight: 600,
          transition: 'bottom 250ms ease, transform 150ms',
        }}
      >
        <Shuffle size={14} strokeWidth={2.5} />
        帮我搭配
      </button>

      {/* Success overlay */}
      {success && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setSuccess(null)}
        />
      )}

      {/* Success sheet */}
      <div
        className="fixed left-0 right-0 z-50 flex flex-col"
        style={{
          bottom: 0,
          background: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          transform: success ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '88vh',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
      >
        {/* 顶部绿色确认区 */}
        <div
          className="flex-shrink-0 flex items-center gap-4 px-5 py-5"
          style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)', borderRadius: '24px 24px 0 0' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          >
            <Check size={24} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-base font-bold text-white">今日菜单已定！</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {success?.dateLabel} · {success?.peopleCount}人份 · {success?.dishes.length}道菜
            </p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        {/* 滚动内容区 */}
        <div className="overflow-y-auto flex-1 px-5 pt-4">
          {/* 菜品列表 */}
          <div className="flex flex-col gap-2 mb-4">
            {success?.dishes.map(dish => (
              <div key={dish.id} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: '#FFF7ED' }}
                >
                  {dish.image_url
                    ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span style={{ fontSize: 20 }}>🍽️</span>
                  }
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{dish.name}</span>
              </div>
            ))}
          </div>

          {/* 食材清单 */}
          {(success?.ingredients.length ?? 0) > 0 && (
            <div
              className="mb-4 px-4 py-3 rounded-2xl"
              style={{ background: '#F7F5F2' }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>🛒 食材清单</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {success?.ingredients.join('、')}
              </p>
            </div>
          )}

          {/* 提醒 */}
          <div
            className="mb-4 px-4 py-3 rounded-2xl flex items-start gap-2"
            style={{ background: '#FFF7ED' }}
          >
            <span className="flex-shrink-0" style={{ fontSize: 16 }}>👨‍🍳</span>
            <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
              记得把菜单发给厨师长，让 TA 提前准备好食材！
            </p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex-shrink-0 px-5 pt-3 flex flex-col gap-2">
          <button
            onClick={copyMenu}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98]"
            style={{
              background: copied ? '#16A34A' : 'var(--color-primary)',
              color: 'white',
              boxShadow: copied ? '0 4px 16px rgba(22,163,74,0.35)' : 'var(--shadow-btn)',
              transition: 'background 250ms, box-shadow 250ms',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copied
              ? <><Check size={16} strokeWidth={2.5} />已复制！去微信粘贴给厨师长</>
              : <><Copy size={16} strokeWidth={2} />复制菜单 · 发给厨师长</>
            }
          </button>
          <button
            onClick={() => setSuccess(null)}
            className="w-full py-3 rounded-2xl text-sm font-medium"
            style={{ background: '#F5F5F4', color: 'var(--color-muted)', border: 'none', cursor: 'pointer' }}
          >
            完成
          </button>
        </div>
      </div>

      {/* Cart bar */}
      {totalItems > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30"
          style={{ bottom: 'calc(var(--nav-height) + 8px)' }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{
              background: '#1C1917',
              borderRadius: 18,
              padding: '11px 14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            }}
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <ShoppingCart size={18} color="white" strokeWidth={2} />
              </div>
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'var(--color-primary)', color: 'white', fontSize: 11 }}
              >
                {totalItems}
              </div>
            </div>

            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-white">{totalItems} 道菜</div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {cartList.slice(0, 3).map(i => i.dish.name).join('、')}{cartList.length > 3 ? '…' : ''}
              </div>
            </div>

            <div
              className="px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              查看菜单
            </div>
          </button>
        </div>
      )}

      {/* Profile sheet overlay */}
      {profileSheetOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setProfileSheetOpen(false)}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

      {/* Profile sheet */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex flex-col"
        style={{
          bottom: 0,
          background: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          transform: profileSheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '90vh',
        }}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between flex-shrink-0 px-5 pt-6 pb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>个人设置</h3>
          <button
            onClick={() => setProfileSheetOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#F5F5F4' }}
          >
            <X size={16} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5">

          {/* Avatar */}
          <div className="mb-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)' }}>头像</p>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: editBgImage ? `url(${editBgImage})` : editBg }}
              >
                {editAvatar
                  ? <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-2xl">
                      {(editNickname || '美')[0]}
                    </span>
                }
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: '#FFF7ED', color: 'var(--color-primary)' }}
                >
                  <Upload size={14} strokeWidth={2} />
                  上传照片
                </button>
                {editAvatar && (
                  <button
                    onClick={() => setEditAvatar('')}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium"
                    style={{ background: '#FEF2F2', color: '#DC2626' }}
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nickname */}
          <div className="mb-5">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>我的昵称</p>
            <input
              className="input w-full"
              placeholder="给自己起个名字吧"
              maxLength={10}
              value={editNickname}
              onChange={e => setEditNickname(e.target.value)}
            />
          </div>

          {/* Background */}
          <div className="mb-6">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)' }}>顶部背景</p>

            {/* Gradient presets */}
            <div className="grid grid-cols-6 gap-2 mb-3">
              {BG_THEMES.map(t => {
                const isSelected = editBgImage === '' && editBg === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => { setEditBg(t.value); setEditBgImage('') }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-full aspect-square rounded-2xl"
                      style={{
                        background: t.value,
                        boxShadow: isSelected ? '0 0 0 2.5px white, 0 0 0 4.5px #EA580C' : 'none',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom image */}
            {editBgImage ? (
              <div>
                <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 120 }}>
                  <img src={editBgImage} alt="bg" className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.25)' }}
                  >
                    <span className="text-white text-sm font-semibold" style={{ letterSpacing: 0.5 }}>
                      自定义图片 ✓
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => bgInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium"
                    style={{ background: '#FFF7ED', color: 'var(--color-primary)' }}
                  >
                    <Upload size={12} strokeWidth={2} />
                    换图
                  </button>
                  <button
                    onClick={() => setEditBgImage('')}
                    className="flex-1 py-2 rounded-xl text-xs font-medium"
                    style={{ background: '#FEF2F2', color: '#DC2626' }}
                  >
                    移除
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl text-sm font-medium"
                style={{ background: '#F7F5F2', color: 'var(--color-muted)', border: '1.5px dashed #E5E2DF', height: 100 }}
              >
                <Upload size={20} strokeWidth={1.8} />
                上传自定义背景图
              </button>
            )}
          </div>
        </div>

        {/* Save button */}
        <div
          className="flex-shrink-0 px-5 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)' }}
        >
          <button onClick={saveProfileChanges} disabled={saving} className="btn-primary w-full" style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      {/* Cart overlay */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto' }}
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Cart sheet */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex flex-col"
        style={{
          bottom: 0,
          background: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          transform: cartOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '82vh',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E5E5' }} />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>今日菜单</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {totalItems} 道菜{isRandomized && !([0,6].includes(new Date().getDay())) ? ' · 平日模式' : isRandomized ? ' · 周末模式' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRandomized && (
              <button
                onClick={() => randomize()}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl"
                style={{ background: '#FFF7ED', color: 'var(--color-primary)' }}
              >
                <Shuffle size={12} strokeWidth={2.5} />
                换一批
              </button>
            )}
            {cart.size > 0 && (
              <button
                onClick={() => { setCart(new Map()); setIsRandomized(false) }}
                className="text-xs px-3 py-1.5 rounded-xl"
                style={{ background: '#FEF2F2', color: '#DC2626' }}
              >
                清空
              </button>
            )}
            <button
              onClick={() => setCartOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#F5F5F4' }}
            >
              <X size={16} style={{ color: 'var(--color-muted)' }} />
            </button>
          </div>
        </div>

        {/* People count */}
        <div className="px-5 pb-3 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>几人用餐</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const n = Math.max(1, peopleCount - 1)
                setPeopleCount(n)
                if (isRandomized) randomize(n)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#FFF7ED', border: '1.5px solid var(--color-primary)' }}
            >
              <Minus size={12} style={{ color: 'var(--color-primary)' }} />
            </button>
            <span className="text-sm font-bold w-6 text-center" style={{ color: 'var(--color-text)' }}>
              {peopleCount}
            </span>
            <button
              onClick={() => {
                const n = Math.min(10, peopleCount + 1)
                setPeopleCount(n)
                if (isRandomized) randomize(n)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={12} color="white" />
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 20px' }} />

        {/* Cart items */}
        <div className="overflow-y-auto flex-1 px-5">
          {cartList.map(({ dish, qty }) => (
            <div
              key={dish.id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: '#FFF7ED' }}
              >
                {dish.image_url
                  ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <span style={{ fontSize: 20 }}>🍽️</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                  {dish.name}
                </div>
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {dish.ingredients.slice(0, 3).join('、')}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => removeFromCart(dish.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: '#FFF7ED', border: '1.5px solid var(--color-primary)' }}
                >
                  <Minus size={12} style={{ color: 'var(--color-primary)' }} />
                </button>
                <span className="w-5 text-center text-sm font-bold" style={{ color: 'var(--color-text)' }}>{qty}</span>
                <button
                  onClick={() => addToCart(dish)}
                  className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Plus size={12} color="white" />
                </button>
              </div>
            </div>
          ))}

          {/* Ingredients */}
          {allIngredients.length > 0 && (
            <div className="mt-3 pb-2">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>🛒 今日食材</p>
              <div className="flex flex-wrap gap-1.5">
                {allIngredients.map(ing => (
                  <span
                    key={ing}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: '#FFF7ED', color: 'var(--color-primary)' }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div className="px-5 pt-4 flex-shrink-0">
          <button
            onClick={() => setCartOpen(false)}
            className="w-full py-3 rounded-2xl text-sm font-medium mb-2"
            style={{ background: '#F5F5F4', color: 'var(--color-muted)', border: 'none', cursor: 'pointer' }}
          >
            继续选菜
          </button>
          <button
            onClick={confirmOrder}
            disabled={confirming || cart.size === 0}
            className="btn-primary w-full"
            style={{ opacity: confirming ? 0.7 : 1 }}
          >
            {confirming ? '记录中…' : '确认今日菜单'}
          </button>
        </div>
      </div>
    </div>
  )
}
