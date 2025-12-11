// Frontend UI Types

export type Layout = 'vertical' | 'collapsed' | 'horizontal'
export type Skin = 'default' | 'bordered'
export type Mode = 'system' | 'light' | 'dark'
export type SystemMode = 'light' | 'dark'
export type Direction = 'ltr' | 'rtl'
export type LayoutComponentWidth = 'compact' | 'wide'
export type LayoutComponentPosition = 'fixed' | 'static'
export type ThemeColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'

export interface ChildrenType {
  children: React.ReactNode
}

export interface Settings {
  mode?: Mode
  skin?: Skin
  semiDark?: boolean
  layout?: Layout
  navbarContentWidth?: LayoutComponentWidth
  contentWidth?: LayoutComponentWidth
  footerContentWidth?: LayoutComponentWidth
  primaryColor?: string
  direction?: Direction
  navCollapsed?: boolean
  navHidden?: boolean
  contentHeightFixed?: boolean
  layoutComponentPosition?: LayoutComponentPosition
  toastPosition?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

export interface UINotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

export interface Modal {
  id: string
  isOpen: boolean
  title?: string
  content?: React.ReactNode
  data?: any
}

export interface UIState {
  notifications: UINotification[]
  modals: Modal[]
  loading: boolean
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  language: 'ko' | 'en'
}

export interface ScrollToTopProps {
  threshold?: number
  smooth?: boolean
  className?: string
}
