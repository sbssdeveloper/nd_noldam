'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Box, Typography, IconButton } from '@mui/material'
import PageLoader from '@/components/PageLoader'
import Image from 'next/image'
import { useNavigation } from '@/contexts/NavigationContext'
import { apiService } from '@/services/apiService'
import { useParams } from 'next/navigation'

interface MeetingData {
    id: number
    image: string
    title: string
    category: string
    location: string
    members: number
    date: string
    likesCount?: number
    user: { id: number; name: string; profileImage?: string }
}

interface TypeASection {
    id: number
    title: string
    description: string
    image?: string
    meetings: MeetingData[]
}

const TypeAMorePage = () => {
    const { navigate } = useNavigation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [section, setSection] = useState<TypeASection | null>(null)

    const routeParams = useParams<{ id: string }>()
    const typeAId = useMemo(() => parseInt(String(routeParams?.id || '0'), 10), [routeParams])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await apiService.get('/home-page-data')
                if (!res.success) throw new Error(res.error || 'Failed to load home data')
                const data = res.data as any
                const found = (data?.typeAData || []).find((s: any) => s.id === typeAId)
                setSection(found || null)
            } catch (e: any) {
                setError(e?.message || 'Failed to load')
            } finally {
                setLoading(false)
            }
        }
        if (!Number.isNaN(typeAId)) load()
    }, [typeAId])

    if (loading) {
        return <PageLoader />
    }

    if (error || !section) {
        return (
            <Box className='min-h-screen flex flex-col items-center justify-center p-6'>
                <Typography className='text-gray-600 mb-2'>No data available</Typography>
                <Typography className='text-gray-500 text-sm'>Please check your database and try again.</Typography>
                <Box className='flex items-center justify-center gap-2 bg-gray-400 rounded-full py-[10px] px-4 mt-4' onClick={() => navigate('/web/home')}>
                    <i className='ri-arrow-left-s-line text-[20px] text-white' />
                    <Typography className='text-white text-[14px]'>뒤로 돌아가기</Typography>
                </Box>
            </Box>
        )
    }

    return (
        <Box>
            {/* Header visual */}
            <Box className='flex item-center justify-center mt-4'>
                {section.image ? (
                    <Image src={section.image} alt='cover' width={360} height={232} style={{ borderRadius: '8px' }} />
                ) : (
                    <Box className='w-[360px] h-[232px] bg-gray-200 rounded-[8px]' />
                )}
            </Box>
            <Box className='flex flex-col items-start p-4'>
                <Typography variant='h2' className='text-gray-900 text-[22px] font-bold'>{section.title}</Typography>
                <Typography variant='body1' className='text-[14px] text-black'>{section.description}</Typography>
            </Box>

            <Box className='pb-20'>
                {section.meetings?.map((m) => (
                    <Box key={m.id} className='border-t border-b border-gray-300 mx-3 py-[9px] pr-[16px] cursor-pointer'
                        onClick={() => navigate(`/meeting/item-detail/${m.id}`)}
                    >
                        <Box className='flex items-center justify-between'>
                            <Box className='flex items-center'>
                                {m.image ? (
                                    <Image src={m.image} alt='image' width={60} height={60} style={{ borderRadius: '8px' }} />
                                ) : (
                                    <Box className='w-[60px] h-[60px] bg-gray-300 rounded-[8px]'></Box>
                                )}

                                <Box className='pl-2'>
                                    <Box className='flex items-center flex-wrap gap-2'>
                                        <Typography className='text-black text-[11px] font-bold'>
                                            {m.location} · {m.category}
                                        </Typography>
                                        <Box className='pl-1 flex items-center text-black text-[11px] font-semibold'>
                                            {m.user?.name}
                                            <Box className='w-4 h-4 rounded-full bg-green-100 ml-2 flex items-center justify-center'>
                                                <i className='ri-check-line text-[10px]' style={{ color: '#85B737' }} />
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Typography className='text-black text-[13px] font-semibold w-[216px] truncate'>{m.title}</Typography>
                                    <Typography className='text-black text-[11px] font-semibold'>{m.date}</Typography>
                                </Box>
                            </Box>
                            <Box className='flex flex-col items-center justify-center'>
                                <IconButton size='small'>
                                    <i className='ri-heart-line text-[20px] text-gray-500' />
                                </IconButton>
                                <Typography className='text-black text-[11px] font-semibold'>{m.likesCount || ''}</Typography>
                            </Box>
                        </Box>
                    </Box>
                ))}

                <Box className='flex items-center justify-center gap-2 bg-gray-400 rounded-full py-[10px] mx-28 mt-4' onClick={() => navigate('/web/home')}>
                    <i className='ri-arrow-left-s-line text-[24px] text-white' />
                    <Typography className='text-white font-semibold text-[17px]'>뒤로 돌아가기</Typography>
                </Box>
            </Box>
        </Box>
    )
}

export default TypeAMorePage


