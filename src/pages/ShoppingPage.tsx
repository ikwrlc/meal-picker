import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import type { Dish } from '../types'
import { getLocalRecords, getShoppingItems, saveShoppingItems } from '../lib/storage'
import type { ShoppingItem } from '../lib/storage'

function buildFromDishes(dishes: Dish[]): ShoppingItem[] {
  const map = new Map<string, boolean>()
  for (const dish of dishes) {
    for (const ing of dish.ingredients) {
      if (!map.has(ing)) map.set(ing, false)
    }
  }
  return [...map.keys()].map(name => ({ name, checked: false }))
}

export default function ShoppingPage() {
  const { state } = useLocation() as { state?: { dishes: Dish[] } }
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [extra, setExtra] = useState('')

  useEffect(() => {
    if (state?.dishes) {
      // 从预览页跳转过来：用本次选的菜重建清单
      const newItems = buildFromDishes(state.dishes)
      setItems(newItems)
      saveShoppingItems(newItems)
    } else {
      // 从首页快捷入口进来：先看有没有持久化的清单
      const saved = getShoppingItems()
      if (saved.length > 0) {
        setItems(saved)
      } else {
        // 实在没有就用最近一条记录生成
        const records = getLocalRecords()
        if (records.length > 0) {
          const newItems = buildFromDishes(records[0].dishes as Dish[])
          setItems(newItems)
          saveShoppingItems(newItems)
        }
      }
    }
  }, [])

  function updateItems(next: ShoppingItem[]) {
    setItems(next)
    saveShoppingItems(next)
  }

  function toggle(name: string) {
    updateItems(items.map(item => item.name === name ? { ...item, checked: !item.checked } : item))
  }

  function addExtra() {
    const name = extra.trim()
    if (!name) return
    updateItems([...items, { name, checked: false }])
    setExtra('')
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className="px-5 pt-14 pb-nav">
      {/* 顶部 */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}
        >
          <ShoppingCart size={20} color="white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-xl" style={{ color: 'var(--color-text)' }}>购物清单</h1>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            还需购买 {unchecked.length} 样食材
          </p>
        </div>
      </div>

      {/* 进度条 */}
      {items.length > 0 && (
        <div className="mb-5 mt-4" style={{ height: 6, background: '#FDE8D8', borderRadius: 999 }}>
          <div
            style={{
              height: '100%',
              borderRadius: 999,
              background: 'var(--color-primary)',
              width: `${(checked.length / items.length) * 100}%`,
              transition: 'width 300ms ease',
            }}
          />
        </div>
      )}

      {/* 添加输入框 */}
      <div className="flex gap-2 mb-5">
        <input
          className="input flex-1"
          placeholder="手动添加食材"
          value={extra}
          onChange={e => setExtra(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addExtra()}
        />
        <button
          onClick={addExtra}
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-btn)' }}
        >
          <Plus size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center gap-3" style={{ borderRadius: 20 }}>
          <ShoppingCart size={40} style={{ color: 'var(--color-muted)', opacity: 0.5 }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>去点菜，自动生成购物清单</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {unchecked.map(item => (
            <button
              key={item.name}
              onClick={() => toggle(item.name)}
              className="flex items-center gap-3 active:scale-98 transition-transform"
              style={{
                background: 'var(--color-surface)',
                borderRadius: 14,
                padding: '13px 16px',
                boxShadow: 'var(--shadow-card)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 22, height: 22,
                  borderRadius: '50%',
                  border: '2px solid #FDE8D8',
                  flexShrink: 0,
                }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.name}</span>
            </button>
          ))}

          {checked.length > 0 && (
            <>
              <p className="text-xs mt-2 mb-1 font-medium" style={{ color: 'var(--color-muted)' }}>
                已购买 ({checked.length})
              </p>
              {checked.map(item => (
                <button
                  key={item.name}
                  onClick={() => toggle(item.name)}
                  className="flex items-center gap-3 transition-transform"
                  style={{
                    background: '#FAFAF9',
                    borderRadius: 14,
                    padding: '13px 16px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: 0.65,
                  }}
                >
                  <div
                    style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      background: '#22C55E',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={12} color="white" strokeWidth={3} style={{ transform: 'rotate(45deg)' }} />
                  </div>
                  <span className="text-sm line-through" style={{ color: 'var(--color-muted)' }}>{item.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
