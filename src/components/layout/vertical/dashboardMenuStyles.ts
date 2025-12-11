// Custom styles for dashboard sidebar menu items
import type { MenuItemStyles } from '@menu/types'
import { menuClasses } from '@menu/utils/menuClasses'

export const dashboardMenuStyles: MenuItemStyles = {
  root: ({ level }) => ({
    // Default inactive menu items - black text and icons
    [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}`]: {
      color: '#000000 !important',
      marginBottom: '8px !important', // Add space between menu items
      fontSize: '12px !important', // Set font size to 12px
      [`& .${menuClasses.icon}`]: {
        color: '#000000 !important'
      },
      [`& .${menuClasses.label}`]: {
        color: '#000000 !important',
        fontSize: '12px !important' // Set label font size to 12px
      },
      [`& .${menuClasses.suffix}`]: {
        color: '#000000 !important'
      }
    },
    // Active menu items - white text on black background
    [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
      color: '#ffffff !important',
      marginBottom: '8px !important', // Add bottom margin for spacing
      borderRadius: '10px !important',
      backgroundColor: '#000000 !important',
      fontSize: '12px !important', // Set font size to 12px
      [`& .${menuClasses.icon}`]: {
        color: '#ffffff !important'
      },
      [`& .${menuClasses.label}`]: {
        color: '#ffffff !important',
        fontSize: '12px !important' // Set label font size to 12px
      },
      [`& .${menuClasses.suffix}`]: {
        color: '#ffffff !important'
      }
    },
    // Submenu root - when it has active children, make parent active too
    [`&.${menuClasses.subMenuRoot}`]: {
      [`& > .${menuClasses.button}`]: {
        color: '#000000 !important',
        marginBottom: '8px !important',
        fontSize: '12px !important',
        [`& .${menuClasses.icon}`]: {
          color: '#000000 !important'
        },
        [`& .${menuClasses.label}`]: {
          color: '#000000 !important',
          fontSize: '12px !important'
        },
        [`& .${menuClasses.suffix}`]: {
          color: '#000000 !important'
        }
      },
      // When submenu has active children, make parent active
      [`&:has(.${menuClasses.button}.${menuClasses.active}) > .${menuClasses.button}`]: {
        color: '#ffffff !important',
        backgroundColor: '#000000 !important',
        marginBottom: '8px !important',
        borderRadius: '10px !important',
        fontSize: '12px !important',
        [`& .${menuClasses.icon}`]: {
          color: '#ffffff !important'
        },
        [`& .${menuClasses.label}`]: {
          color: '#ffffff !important',
          fontSize: '12px !important'
        },
        [`& .${menuClasses.suffix}`]: {
          color: '#ffffff !important'
        }
      }
    },
    // Submenu items - black text by default
    [`& .${menuClasses.button}`]: {
      color: '#000000 !important',
      marginBottom: '8px !important', // Add space between submenu items
      fontSize: '12px !important', // Set font size to 12px
      [`& .${menuClasses.icon}`]: {
        color: '#000000 !important'
      },
      [`& .${menuClasses.label}`]: {
        color: '#000000 !important',
        fontSize: '12px !important' // Set label font size to 12px
      }
    },
    // Active submenu items
    [`& .${menuClasses.button}.${menuClasses.active}`]: {
      color: '#ffffff !important',
      backgroundColor: '#000000 !important',
      marginBottom: '8px !important', // Add space between submenu items
      fontSize: '12px !important', // Set font size to 12px
      [`& .${menuClasses.icon}`]: {
        color: '#ffffff !important'
      },
      [`& .${menuClasses.label}`]: {
        color: '#ffffff !important',
        fontSize: '12px !important' // Set label font size to 12px
      }
    }
  }),
  button: {
    // Keep default button styles
  },
  icon: {
    // Keep default icon styles
  },
  prefix: {
    // Keep default prefix styles
  },
  label: {
    // Keep default label styles
  },
  suffix: {
    // Keep default suffix styles
  },
  subMenuExpandIcon: {
    // Keep default submenu expand icon styles
  },
  subMenuContent: {
    // Keep default submenu content styles
  }
}
