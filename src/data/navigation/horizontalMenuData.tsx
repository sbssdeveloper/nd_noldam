// Type Imports
import type { HorizontalMenuDataType } from '@/services/types/frontend'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: 'ri-dashboard-line'
  },
  {
    label: '홈 관리',
    href: '/home',
    icon: 'ri-home-smile-line'
  },
  {
    label: '사용자 및 콘텐츠 관리',
    icon: 'ri-group-line',
    children: [
      {
        label: '사용자 관리',
        href: '/user-management',
        icon: 'ri-user-settings-line'
      },
      {
        label: '콘텐츠/신고 관리',
        href: '/content-management',
        icon: 'ri-file-list-line'
      },
      {
        label: '호스트 관리',
        href: '/host-management',
        icon: 'ri-user-star-line'
      }
    ]
  },
  {
    label: '소통 및 마케팅',
    href: '/communication',
    icon: 'ri-notification-line'
  },
  {
    label: '분석',
    href: '/analytics',
    icon: 'ri-bar-chart-line'
  },
  {
    label: '모임 관리',
    href: '/meeting-management',
    icon: 'ri-calendar-line'
  },
  {
    label: '결제 및 정산 관리',
    href: '/payment',
    icon: 'ri-bank-card-line'
  },
  {
    label: '시스템 관리',
    href: '/system',
    icon: 'ri-settings-line'
  }
]

export default horizontalMenuData
