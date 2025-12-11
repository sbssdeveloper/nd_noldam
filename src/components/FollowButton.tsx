'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { useAppSelector } from '@/store/hooks'
import { userApi } from '@/services/userApi'

interface FollowButtonProps {
    userId: number
    userNickname: string
    onFollowChange?: (isFollowing: boolean, counts: { followingCount: number; followersCount: number }) => void
    size?: 'small' | 'medium' | 'large'
    variant?: 'contained' | 'outlined' | 'text'
    isFollowing: boolean // Required prop - must be provided from batch data
}

const FollowButton: React.FC<FollowButtonProps> = ({
    userId,
    userNickname,
    onFollowChange,
    size = 'small',
    variant = 'outlined',
    isFollowing: propIsFollowing
}) => {
    const { user, isAuthenticated } = useAppSelector((state) => state.authReducer)
    const [isFollowing, setIsFollowing] = useState<boolean>(propIsFollowing)
    const [loading, setLoading] = useState(false)

    // Don't show button if not authenticated or if it's the current user's post
    if (!isAuthenticated || !user || Number(user.id) === userId) {
        return null
    }

    // Update local state when prop changes
    useEffect(() => {
        setIsFollowing(propIsFollowing)
    }, [propIsFollowing])

    const handleFollowToggle = useCallback(async () => {
        if (loading) {
            return
        }

        setLoading(true)
        try {
            let counts
            if (isFollowing) {
                counts = await userApi.unfollowUser(userId)
                if (counts) {
                    setIsFollowing(false)
                    onFollowChange?.(false, counts)
                }
            } else {
                counts = await userApi.followUser(userId)
                if (counts) {
                    setIsFollowing(true)
                    onFollowChange?.(true, counts)
                }
            }
        } catch (error) {
            // Error toggling follow
        } finally {
            setLoading(false)
        }
    }, [loading, isFollowing, userId, onFollowChange])

    return (
        <Button
            size={size}
            variant={isFollowing ? 'outlined' : 'contained'}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleFollowToggle()
            }}
            disabled={loading}
            className='px-[11px] py-[6px] w-full text-[15px] border border-none'
            sx={{
                borderRadius: '10px',
                backgroundColor: isFollowing ? '#D5E6FF' : '#3182F6',
                color: isFollowing ? '#3182F6' : 'white',
            }}
        >
            {loading ? (
                <CircularProgress size={16} color={isFollowing ? 'primary' : 'inherit'} />
            ) : (
                isFollowing ? '팔로잉' : '팔로우'
            )}
        </Button>
    )
}

export default FollowButton
