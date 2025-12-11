'use client'

import { Box, Typography, Button, IconButton, Divider } from '@mui/material'

export default function HostMeetingDetail() {
    return (
        <Box className='fixed inset-0 bg-gray-100 flex flex-col' style={{ zIndex: 70 }}>
            {/* Header */}
            <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                <Box className='flex items-center'>
                    <IconButton className='p-0 mr-1'>
                        <i className='ri-arrow-left-s-line text-2xl' />
                    </IconButton>
                    <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
                </Box>
            </Box>

            {/* Content */}
            <Box className='bg-gray-100 flex-1 overflow-y-auto px-4 py-4'>
                {/* Ticket card */}
                <Box className='bg-white rounded-xl p-3 m-6 flex items-center justify-between'>
                    <Box className='flex flex-col gap-5 justify-between'>
                        <Box>
                            <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                            <Typography variant='subtitle2' className='text-gray-900 font-semibold'>불안한 일상, 노선으로 정돈하기</Typography>
                        </Box>
                        <Box>
                            <Typography fontSize={10} className='text-gray-500 block mt-2'>2025 / 06 / 14 (목) 1회</Typography>
                            <Typography fontSize={10} className='text-gray-500 block'>09:00 (오전) - 11:42 (오후)</Typography>
                            <Typography fontSize={10} className='text-gray-500 block'>결제 금액 : 0원</Typography>
                        </Box>
                    </Box>
                    {/* Fake barcode */}
                    <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                        <Box className='w-12 space-y-1'>
                            {Array.from({ length: 16 }).map((_, i) => (
                                <Box key={i} className='h-1 bg-gray-300 rounded' />
                            ))}
                        </Box>
                    </Box>
                </Box>

                <Box className="p-4 my-2 bg-white rounded-lg">
                    {/* Title under card */}
                    <Typography variant='subtitle1' className='text-black font-semibold mt-6'>불안한 일상, 노선으로 정돈하기</Typography>
                    <Divider className='my-3' />

                    {/* Payment meta */}
                    <Box className='space-y-1'>
                        <Typography variant='body2' className='text-gray-700'>2025년 6월 12일 결제 완료</Typography>
                        <Typography variant='body2' className='text-gray-700'>결제 수단 : 신용 카드</Typography>
                    </Box>
                    <Divider className='mt-3' />

                    {/* Amount rows */}
                    <Box className='mt-4'>
                        <Box className='flex items-center justify-between py-2'>
                            <Typography variant='body2' className='text-gray-700'>상품 금액</Typography>
                            <Typography variant='body2' className='text-gray-700'>24,000 원</Typography>
                        </Box>
                        <Box className='flex items-start justify-between py-2'>
                            <Box>
                                <Typography variant='body2' className='text-gray-700'>할인 금액</Typography>
                                {/* <Typography variant='caption' className='text-gray-500'>(2025년 12월 31일까지 무료)</Typography> */}
                            </Box>
                            <Typography variant='body2' className='text-gray-700'>(2025년 12월 31일까지 무료) -24,000원</Typography>
                        </Box>
                        <Box className='flex items-center justify-between py-2'>
                            <Typography variant='subtitle2' className='text-black font-semibold'>총 결제 금액</Typography>
                            <Typography variant='subtitle2' className='text-black font-semibold'>0 원</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Members Section */}
                <Box className='bg-white rounded-lg p-4 mb-4'>
                    <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>멤버 13</Typography>
                    <Divider className='my-2' />
                    <Box className='space-y-3'>
                        {[1, 2, 3].map((_, index) => (
                            <Box key={index} className='flex items-center gap-3'>
                                <Box className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                                    <i className='ri-user-line text-gray-500' />
                                </Box>
                                <Box className='flex-1'>
                                    <Box className='flex items-center gap-1'>
                                        <Typography variant='body2' className='font-semibold text-black'>User Name</Typography>
                                        <img src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />
                                    </Box>
                                    <Typography variant='caption' className='text-gray-500'>Introducing anything</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                    <Button
                        variant='text'
                        size='small'
                        className='mt-3 w-full'
                        sx={{
                            borderColor: '#E5E7EB',
                            color: '#000',
                            '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                        }}
                    >
                        멤버 더보기
                    </Button>
                </Box>

                {/* Schedule Section */}
                <Box className='bg-white rounded-lg p-4 mb-4'>
                    <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>일정 4</Typography>
                    <Divider className='my-2' />
                    <Box className='space-y-4'>
                        <Box className='flex items-center gap-4'>
                            <Box className='flex flex-col items-center'>
                                <Typography variant='h6' className='text-red-500 font-medium'>SEP</Typography>
                                <Typography variant='h3' className='text-gray-900 font-bold'>13</Typography>
                            </Box>
                            <Box className='flex-1'>
                                <Typography variant='body2' className='text-gray-900 font-medium'>모임 1</Typography>
                                <Typography variant='caption' className='text-orange-500'>모집중</Typography>
                            </Box>
                        </Box>
                        <Box className='flex items-center gap-4'>
                            <Box className='flex flex-col items-center'>
                                <Typography variant='h6' className='text-red-500 font-medium'>SEP</Typography>
                                <Typography variant='h3' className='text-gray-900 font-bold'>1</Typography>
                            </Box>
                            <Box className='flex-1'>
                                <Typography variant='body2' className='text-gray-900 font-medium'>모임 1</Typography>
                                <Typography variant='caption' className='text-gray-400'>종료</Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Button
                        variant='text'
                        size='small'
                        className='mt-3 w-full'
                        sx={{
                            borderColor: '#E5E7EB',
                            color: '#000',
                            '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                        }}
                    >
                        모임 더보기
                    </Button>
                </Box>

                {/* Bottom actions */}
                <Box className='flex gap-3 mt-6'>
                    <Button
                        fullWidth
                        variant='contained'
                        sx={{
                            backgroundColor: '#E5E7EB',
                            color: '#111827',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: '#D1D5DB' }
                        }}
                    >
                        문의하기
                    </Button>
                    <Button
                        fullWidth
                        variant='contained'
                        sx={{
                            backgroundColor: '#111827',
                            color: '#fff',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: '#0A0F1A' }
                        }}
                    >
                        취소하기
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
