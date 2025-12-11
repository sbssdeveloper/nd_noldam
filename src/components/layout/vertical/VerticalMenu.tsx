// MUI Imports
import { useTheme } from '@mui/material/styles'
import { Box } from '@mui/material'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, SubMenu } from '@menu/vertical-menu'

// Custom Styles
import { dashboardMenuStyles } from './dashboardMenuStyles'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-down-s-line text-lg' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
          className: 'bs-full overflow-y-auto overflow-x-hidden',
          onScroll: container => scrollMenu(container, false)
        }
        : {
          options: { wheelPropagation: false, suppressScrollX: true },
          onScrollY: container => scrollMenu(container, true)
        })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={{
          ...menuItemStyles(verticalNavOptions, theme),
          ...dashboardMenuStyles
        }}
        className='mx-3 mt-4 p-0'
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {/* <MenuItem href='/dashboard-overview' icon={<i className='ri-home-smile-line text-lg' />}>
          대시보드ssss
        </MenuItem> */}
        <MenuItem href='/home' icon={<i className='ri-home-smile-line text-lg' />}>
          홈 관리
        </MenuItem>
        <SubMenu label='사용자 및 콘텐츠 관리' icon={<i className='ri-group-line text-lg' />}>
          <Box className='ms-5'>
            <MenuItem href='/user-management'>사용자 관리</MenuItem>
            <MenuItem href='/content-management'>콘텐츠/신고 관리</MenuItem>
            <MenuItem href='/host-management'>호스트 관리</MenuItem>
          </Box>
        </SubMenu>
        <SubMenu label='소통 및 마케팅' icon={<i className='ri-notification-line text-lg' />}>
          <Box className='ms-5'>
            <MenuItem href='/message-management'>알림 및 메시지 관리</MenuItem>
            <MenuItem href='/coupon-management'>프로모션/쿠폰 관리</MenuItem>
          </Box>
        </SubMenu>
        {/* <MenuItem href='/analytics' icon={<i className='ri-bar-chart-line text-lg' />}>
          분석
        </MenuItem> */}
        <MenuItem href='/meetings' icon={<i className='ri-calendar-line text-lg' />}>
          모임 관리
        </MenuItem>
        <MenuItem href='/payments' icon={<i className='ri-bank-card-line text-lg' />}>
          결제 및 정산 관리
        </MenuItem>
        {/* <SubMenu label='시스템 관리' icon={<i className='ri-server-line text-lg' />}>
          <Box className='ms-5'>
            <MenuItem href='/server-monitoring'>서버 모니터링</MenuItem>
            <MenuItem href='/data-export'>데이터 내보내기</MenuItem>
            <MenuItem href='/logs'>감사 로그</MenuItem>
            <MenuItem href='/security-settings'>보안 설정</MenuItem>
          </Box>
        </SubMenu> */}
        {/* <MenuItem href='/admin-settings' icon={<i className='ri-settings-3-line text-lg' />}>
          관리자 설정
        </MenuItem> */}
        {/* <MenuItem href='/language' icon={<i className='ri-global-line text-lg ' />}>
          언어 설정
        </MenuItem> */}
      </Menu>
      {/* <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <GenerateVerticalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </ScrollWrapper>
  )
}

export default VerticalMenu
