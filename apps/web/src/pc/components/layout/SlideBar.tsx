import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { cn } from '@pc/lib/utils'
import type { MenuItem } from '@pc/types'
import { useUserStore } from '@pc/stores/user'
import { Avatar, AvatarImage, AvatarFallback } from '@pc/components/ui/avatar'
import { useVueTransition } from '@pc/components/ui/utils'
import { ThemeModeSwitch } from '@pc/components/layout/ThemeModeSwitch'

import logo from '@pc/assets/brand/catmap-logo.png'
import iconHome from '@pc/assets/icons/home.svg'
import iconPost from '@pc/assets/icons/post.svg'
import iconFound from '@pc/assets/icons/found.svg'
import iconAdopt from '@pc/assets/icons/adopt.svg'
import iconIndividual from '@pc/assets/icons/individual.svg'

const menuItems: MenuItem[] = [
  { name: '首页', path: '/', icon: iconHome },
  { name: '发布动态', path: '/publish', icon: iconPost },
  { name: '发现新猫', path: '/new-cat', icon: iconFound },
  { name: '领养申请', path: '/adopt', icon: iconAdopt },
  { name: '个人中心', path: '/me', icon: iconIndividual },
]

interface SlideBarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function SlideBar({ mobileOpen, onClose }: SlideBarProps) {
  const location = useLocation()
  const router = useNavigate()
  const userInfo = useUserStore((state) => state.userInfo)

  const [isDesktop, setIsDesktop] = useState(false)
  const navigationPanelRef = useRef<HTMLElement | null>(null)
  const desktopMediaQueryRef = useRef<MediaQueryList | null>(null)

  const isVisible = isDesktop || mobileOpen

  const closeNavigation = () => onClose()

  const { visible, transitionClass, setElement } = useVueTransition(isVisible, {
    enterActiveClass: 'transition duration-200 ease-out',
    enterFromClass: '-translate-x-full opacity-0',
    enterToClass: 'translate-x-0 opacity-100',
    leaveActiveClass: 'transition duration-150 ease-in',
    leaveFromClass: 'translate-x-0 opacity-100',
    leaveToClass: '-translate-x-full opacity-0',
  })

  useEffect(() => {
    const updateDesktopLayout = () => {
      setIsDesktop(desktopMediaQueryRef.current?.matches ?? false)
    }
    desktopMediaQueryRef.current = window.matchMedia('(min-width: 1024px)')
    updateDesktopLayout()
    desktopMediaQueryRef.current.addEventListener('change', updateDesktopLayout)

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileOpen) {
        closeNavigation()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => {
      desktopMediaQueryRef.current?.removeEventListener('change', updateDesktopLayout)
      window.removeEventListener('keydown', onKeydown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen])

  useEffect(() => {
    closeNavigation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (mobileOpen && !isDesktop) {
      navigationPanelRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen])

  return (
    <>
      {mobileOpen && !isDesktop && (
        <button
          type="button"
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="关闭导航菜单"
          onClick={closeNavigation}
        />
      )}

      {visible && (
        <aside
          id="mobile-navigation"
          ref={(node) => {
            setElement(node)
            navigationPanelRef.current = node
          }}
          role={isDesktop ? undefined : 'dialog'}
          aria-modal={isDesktop ? undefined : true}
          aria-label={isDesktop ? undefined : '主导航'}
          tabIndex={-1}
          className={cn(
            'public-sidebar fixed inset-y-0 left-0 z-[120] flex h-dvh w-[min(20rem,calc(100vw-3rem))] flex-col overflow-hidden outline-none lg:static lg:z-20 lg:h-screen lg:w-[220px]',
            transitionClass,
          )}
        >
          {/* LOGO */}
          <div className="public-sidebar-brand h-20 flex items-center px-4 shrink-0">
            <img
              src={logo}
              alt="山大猫猫图鉴 logo"
              className="w-10 h-10 ml-2.5 mt-2.2 rounded-[10px] object-contain"
            />
            <div className="flex flex-col justify-center items-start">
              <h1 className="text-[18px] font-bold tracking-wider ml-3 leading-1">SDU Meow</h1>
              <span className="text-[13px] text-gray-400 ml-3 font-medium leading-1 tracking-wider">
                山大猫猫图鉴
              </span>
            </div>
            {!isDesktop && (
              <button
                type="button"
                className="ml-auto flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="关闭导航菜单"
                onClick={closeNavigation}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 菜单 */}
          <nav className="flex-1 w-full pt-6 space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeNavigation}
                className={cn(
                  'public-nav-item flex items-center w-[200px] h-[46px] rounded-lg ml-[10px] px-3 mb-2 group ',
                  // 默认状态：灰色文字，鼠标悬停变淡白背景
                  'text-gray-600 hover:bg-gray-100 hover:text-black',
                  // 选中状态 (Active)：背景变成 primary (黄色)，文字变黑，加粗
                  location.pathname === item.path &&
                    'public-nav-item-active bg-primary text-black font-bold shadow-md',
                )}
              >
                <img
                  src={item.icon}
                  alt="icon"
                  className={cn(
                    'w-5 h-5 mr-3 shrink-0',
                    location.pathname === item.path
                      ? 'brightness-0'
                      : 'brightness-0 opacity-50 group-hover:opacity-100',
                  )}
                />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <ThemeModeSwitch />

          {/* 底部用户信息 */}
          {userInfo ? (
            <button
              type="button"
              onClick={() => router('/me')}
              className="public-sidebar-account flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary shrink-0"
            >
              <Avatar className="w-10 h-10 border-2 border-primary">
                <AvatarImage src={userInfo.avatar} alt={userInfo.nickname} />
                <AvatarFallback className="bg-primary text-black font-bold">
                  {userInfo.nickname?.slice(0, 1) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-gray-950 truncate">
                  {userInfo.nickname}
                </span>
                <span className="text-xs text-gray-400 truncate">
                  Lv.{userInfo.level} {userInfo.title}
                </span>
              </div>
            </button>
          ) : (
            /* 未登录状态 */
            <button
              type="button"
              onClick={() => router('/login')}
              className="public-sidebar-account flex w-full items-center justify-center gap-2 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary shrink-0"
            >
              <span className="text-sm text-gray-600">点击登录</span>
            </button>
          )}
        </aside>
      )}
    </>
  )
}
