'use client'

// Next Imports
import Link from 'next/link'
import Box from '@mui/material/Box'
// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Type Imports
import type { Mode } from '@core/types'

// Component Imports
import Illustrations from '@components/Illustrations'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

const NotFound = ({ mode }: { mode: Mode }) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'

  // Hooks
  const miscBackground = useImageVariant(mode, lightImg, darkImg)

  return (
    // <div className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
    //   <div className='flex items-center flex-col text-center gap-10'>
    //     <div className='flex flex-col gap-2 is-[90vw] sm:is-[unset]'>
    //       <Typography className='font-medium text-8xl' color='text.primary'>
    //         404
    //       </Typography>
    //       <Typography variant='h4'>Page Not Found ⚠️</Typography>
    //       <Typography>We couldn&#39;t find the page you are looking for.</Typography>
    //     </div>
    //     <img
    //       alt='error-illustration'
    //       src='/images/illustrations/characters/5.png'
    //       className='object-cover bs-[400px] md:bs-[450px] lg:bs-[500px]'
    //     />
    //     <Button href='/' component={Link} variant='contained'>
    //       Back to Home
    //     </Button>
    //   </div>
    //   <Illustrations maskImg={{ src: miscBackground }} />
    // </div>
    <Box className='flex flex-col items-center justify-center h-screen space-y-20'>
      <Box >
        <Typography className='text-center text-[28px] font-extrabold text-black font-weight-[800]'
          sx={{ line_height: '80%', letterSpacing: '-0.08px' }}
        >찾으시는 페이지가<br />없는 듯하네요.</Typography>
      </Box>

      <Box className='-mt-15'>
        <Typography className='text-center text-black font-weight-[400] text-[16px] letter-spacing-[-0.48] line-height-100 '
          sx={{ letterSpacing: '-0.08px' }}>죄송합니다. 해당 페이지를 찾을 수 없습니다.<br />
          홈페이지로 이동해 다양한 콘텐츠를 만나보세요.</Typography>
      </Box>
      <Box>
        <Button href='/' component={Link} variant='contained' className='font-weight-[600] font-semibold w-full hover:bg-gray-700 text-white border border-radius-[7px] text-[17px] px-6 py-3 font-semibold'
          sx={{ backgroundColor: '#7f7f7f', letterSpacing: '-0.08px' }}
        >
          Thenoldam 홈
        </Button>
      </Box>
    </Box>
  )
}

export default NotFound
