import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { NavItem } from '@/types/ui'

type BottomNavProps = {
  items: NavItem[]
  variant?: 'user' | 'admin'
}

function NavContent({ item }: { item: NavItem }) {
  return <>
    <span className="mobile-bottom-nav__icon" aria-hidden="true">{item.icon ?? item.label.slice(0, 1)}</span>
    <span className="mobile-bottom-nav__label">{item.label}</span>
  </>
}

export function BottomNav({ items, variant = 'user' }: BottomNavProps) {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const activeIndex = items.findIndex((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  if (!items.length) return null
  const gridStyle = { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
  const start = Math.max(0, activeIndex) * 100 / items.length
  const end = 100 - start - 100 / items.length

  return (
    <nav ref={navRef} className="mobile-bottom-nav" data-variant={variant} aria-label={variant === 'admin' ? '管理导航' : '底部导航'}>
      <div className="mobile-bottom-nav__track" aria-hidden="true">
        <div className="mobile-bottom-nav__indicator" style={{ width: `${100 / items.length}%`, transform: `translateX(${Math.max(0, activeIndex) * 100}%)`, opacity: activeIndex < 0 ? 0 : 1 }}><span /></div>
      </div>
      <ul className="mobile-bottom-nav__items" style={gridStyle}>
        {items.map((item, index) => (
          <li key={item.key}>
            <Link
              className="mobile-bottom-nav__item"
              data-active={index === activeIndex}
              aria-label={item.label}
              aria-current={index === activeIndex ? 'page' : undefined}
              to={item.to}
              onClick={(event) => {
                // Keyboard link activation is immediate; pointer transitions can retarget.
                if (navRef.current) navRef.current.dataset.motion = event.detail === 0 ? 'instant' : 'animated'
              }}
            ><NavContent item={item} /></Link>
          </li>
        ))}
      </ul>
      {/* A clipped visual copy keeps foreground and pill movement in sync.
          Real links remain the only interactive/accessibility tree. */}
      <div className="mobile-bottom-nav__active-copy" aria-hidden="true" style={{ ...gridStyle, clipPath: `inset(0 ${end}% 0 ${start}%)`, opacity: activeIndex < 0 ? 0 : 1 }}>
        {items.map((item, index) => (
          <span key={item.key} className="mobile-bottom-nav__item" data-active={index === activeIndex}><NavContent item={item} /></span>
        ))}
      </div>
    </nav>
  )
}
