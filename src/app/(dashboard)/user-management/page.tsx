'use client'

// React Imports
import { useState, useEffect } from 'react'
import AdminProtectedRoute from '@components/AdminProtectedRoute'
import { userApi } from '@/services/userApi'
import { validateAdminCredentials } from '@/apiConfigs/admin'
import { FeedApiService } from '@/services/feedApi'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'

// MUI Imports
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Modal,
  Button,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material'

const UserManagementPage = () => {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('전체 등급')
  const [statusFilter, setStatusFilter] = useState('전체 상태')

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  // Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [blacklistStatus, setBlacklistStatus] = useState('')
  const [selectedTab, setSelectedTab] = useState(0)

  // Third modal state for 박민수
  const [isThirdModalOpen, setIsThirdModalOpen] = useState(false)
  const [selectedUser3, setSelectedUser3] = useState<any>(null)
  const [selectedRole3, setSelectedRole3] = useState('')
  const [selectedGrade3, setSelectedGrade3] = useState('')
  const [selectedTab3, setSelectedTab3] = useState(0)

  const [showAdminSetupModal, setShowAdminSetupModal] = useState(false)
  const [adminEmail, setAdminEmail] = useState('admin@noldam.com')
  const [adminPassword, setAdminPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showBlacklistConfirmModal, setShowBlacklistConfirmModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [deleteItemType, setDeleteItemType] = useState('')
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)
  const [deleteItemPostId, setDeleteItemPostId] = useState<number | null>(null) // For comments
  const [showRestrictModal, setShowRestrictModal] = useState(false)
  const [restrictItemType, setRestrictItemType] = useState<'post' | 'comment' | ''>('')
  const [restrictItemId, setRestrictItemId] = useState<number | null>(null)
  const [restrictDays, setRestrictDays] = useState<number>(1)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Posts and comments state for first modal
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [userComments, setUserComments] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  // Posts and comments state for third modal
  const [userPosts3, setUserPosts3] = useState<any[]>([])
  const [userComments3, setUserComments3] = useState<any[]>([])
  const [loadingPosts3, setLoadingPosts3] = useState(false)
  const [loadingComments3, setLoadingComments3] = useState(false)

  // Helper function to parse JSON content and extract text
  const parsePostContent = (content: any): { title: string; text: string } => {
    if (!content) return { title: '', text: '' }

    // If content is already a string but not JSON, return as is
    if (typeof content === 'string' && !content.trim().startsWith('[') && !content.trim().startsWith('{')) {
      return { title: '', text: content }
    }

    try {
      // Try to parse as JSON
      let parsedContent
      if (Array.isArray(content)) {
        parsedContent = content
      } else if (typeof content === 'string') {
        parsedContent = JSON.parse(content)
      } else {
        parsedContent = content
      }

      // If it's an array of blocks
      if (Array.isArray(parsedContent)) {
        let title = ''
        let text = ''

        parsedContent.forEach((block: any) => {
          if (block.type === 'text') {
            if (block.id?.includes('title')) {
              title = block.content || ''
            } else {
              text += (text ? ' ' : '') + (block.content || '')
            }
          }
        })

        return { title, text }
      }

      // If it's a regular string, return as text
      if (typeof parsedContent === 'string') {
        return { title: '', text: parsedContent }
      }

      return { title: '', text: '' }
    } catch (error) {
      // If parsing fails, check if it's HTML or plain text
      if (typeof content === 'string') {
        // If it looks like HTML, return empty (we don't want to show HTML)
        if (content.includes('<') || content.includes('>')) {
          return { title: '', text: '' }
        }
        // Otherwise return as plain text
        return { title: '', text: content }
      }
      return { title: '', text: '' }
    }
  }

  // Helper function to parse comment content (similar to post content but simpler)
  const parseCommentContent = (content: any): string => {
    if (!content) return ''

    // If content is already a string but not JSON, return as is
    if (typeof content === 'string' && !content.trim().startsWith('[') && !content.trim().startsWith('{')) {
      return content
    }

    try {
      // Try to parse as JSON
      let parsedContent
      if (Array.isArray(content)) {
        parsedContent = content
      } else if (typeof content === 'string') {
        parsedContent = JSON.parse(content)
      } else {
        parsedContent = content
      }

      // If it's an array of blocks, extract text from all text blocks
      if (Array.isArray(parsedContent)) {
        let text = ''
        parsedContent.forEach((block: any) => {
          if (block.type === 'text' && block.content) {
            text += (text ? ' ' : '') + block.content
          }
        })
        return text
      }

      // If it's a regular string, return as is
      if (typeof parsedContent === 'string') {
        return parsedContent
      }

      return ''
    } catch (error) {
      // If parsing fails, check if it's HTML or plain text
      if (typeof content === 'string') {
        // If it looks like HTML, return empty (we don't want to show HTML)
        if (content.includes('<') || content.includes('>')) {
          return ''
        }
        // Otherwise return as plain text
        return content
      }
      return ''
    }
  }

  // Helper function to recursively extract all comments including nested replies
  const extractAllComments = (comments: any[], post: any, depth: number = 0): any[] => {
    const allComments: any[] = []

    comments.forEach((comment: any, index: number) => {
      // Parse post title for this comment
      const parsedPost = parsePostContent(post.content)
      const postTitle = post.title || parsedPost.title || '게시글'

      // Create unique key by combining postId, commentId, depth, and index
      const uniqueKey = `${post.id}-${comment.id}-${depth}-${index}`

      allComments.push({
        ...comment,
        postTitle: postTitle,
        postId: post.id,
        uniqueKey: uniqueKey, // Add unique key for React
        content: parseCommentContent(comment.content)
      })

      // Recursively extract nested replies
      if (comment.replies && comment.replies.length > 0) {
        const nestedReplies = extractAllComments(comment.replies, post, depth + 1)
        allComments.push(...nestedReplies)
      }
    })

    return allComments
  }

  // Fetch users from API
  useEffect(() => {
    fetchUsers()
  }, [searchTerm, gradeFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (searchTerm) params.search = searchTerm
      if (gradeFilter !== '전체 등급') params.grade = gradeFilter
      if (statusFilter !== '전체 상태') params.status = statusFilter

      const result = await userApi.getUsersForManagement(params)
      if (result && result.users) {
        setUsers(result.users || [])
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search and filters (for client-side filtering if needed)
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)
    const matchesGrade = gradeFilter === '전체 등급' || getUserBadgeLabel(user) === gradeFilter
    const matchesStatus = statusFilter === '전체 상태' || user.status === statusFilter

    return matchesSearch && matchesGrade && matchesStatus
  })

  const selectedBadgeDisplay = selectedUser ? getUserBadgeDisplay(selectedUser) : null
  const selectedBadgeDisplay3 = selectedUser3 ? getUserBadgeDisplay(selectedUser3) : null

  // Role mapping: English keys (database) -> Korean display text (frontend)
  const getRoleDisplayText = (role: string): string => {
    const roleMap: Record<string, string> = {
      'user': '유저',
      'manager': '관리자'
    }
    return roleMap[role] || role
  }

  // Get chip styling for role
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'manager':
        return {
          backgroundColor: '#D4183D',
          color: '#ffffff',
          fontWeight: '500'
        }
      case 'user':
        return {
          backgroundColor: '#fff',
          color: '#666666',
          fontWeight: '500',
          border: '1px solid #E0E0E0'

        }
      default:
        return {
          backgroundColor: '#f5f5f5',
          color: '#666666',
          fontWeight: '500'
        }
    }
  }

  // Get chip styling for grade
  function getUserBadgeDisplay(user: any) {
    if (!user) return null

    // If activeCommunityBadgeId is null or undefined, return null (will show "일반")
    if (user.activeCommunityBadgeId === null || user.activeCommunityBadgeId === undefined) {
      return null
    }

    const badgeSource =
      user.activeCommunityBadge && typeof user.activeCommunityBadge === 'object'
        ? user.activeCommunityBadge
        : (user.activeCommunityBadgeId || typeof user.activeCommunityBadge === 'string')
          ? {
            id: user.activeCommunityBadgeId,
            name: typeof user.activeCommunityBadge === 'string'
              ? user.activeCommunityBadge
              : undefined
          }
          : null

    return badgeSource ? getCommunityBadgeDisplay(badgeSource as any) : null
  }

  function getUserBadgeLabel(user: any): string {
    // If activeCommunityBadgeId is null or undefined, show "일반" for new users
    if (user?.activeCommunityBadgeId === null || user?.activeCommunityBadgeId === undefined) {
      return '일반'
    }

    // Map activeCommunityBadgeId directly to the correct label
    const badgeIdToLabel: Record<number, string> = {
      1: '씨앗',
      2: '모꼬지',
      3: '이음이',
      4: '담장이'
    }

    // If we have a direct mapping, use it
    if (user.activeCommunityBadgeId && badgeIdToLabel[user.activeCommunityBadgeId]) {
      return badgeIdToLabel[user.activeCommunityBadgeId]
    }

    // Fallback to badgeDisplay or grade
    const badgeDisplay = getUserBadgeDisplay(user)
    return badgeDisplay?.label || user?.grade || '일반'
  }

  function getGradeStyle(grade: string | null | undefined) {
    switch (grade) {
      case '담장인':
      case '담장이':
        return {
          backgroundColor: '#FFEDD4',
          color: '#9f2d00',
          fontWeight: '500'
        }
      case '이름이':
      case '이음이':
        return {
          backgroundColor: '#f3e8ff',
          color: '#6e11b0',
          fontWeight: '500'
        }
      case '모꼬지':
        return {
          backgroundColor: '#dbeafe',
          color: '#193cb8',
          fontWeight: '500'
        }
      case '씨앗':
        return {
          backgroundColor: '#dcfce7',
          color: '#016630',
          fontWeight: '500'
        }
      case '일반':
        return {
          backgroundColor: '#f5f5f5',
          color: '#666666',
          fontWeight: '500'
        }
      default:
        return {
          backgroundColor: '#f5f5f5',
          color: '#666666',
          fontWeight: '500'
        }
    }
  }

  // Get chip styling for status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '활성':
        return {
          backgroundColor: '#dcfce7',
          color: '#016630',
          fontWeight: '500'
        }
      case '블랙리스트':
        return {
          backgroundColor: '#ffe2e2',
          color: '#9f0712',
          fontWeight: '500'
        }
      case '대기중':
        return {
          backgroundColor: '#fef9c2',
          color: '#894b00',
          fontWeight: '500'
        }
      default:
        return {
          backgroundColor: '#f5f5f5',
          color: '#666666',
          fontWeight: '500'
        }
    }
  }

  // Menu handlers
  const handleMenuClick = (userId: number) => {
    setOpenMenuId(openMenuId === userId ? null : userId)
  }

  const handleMenuClose = () => {
    setOpenMenuId(null)
  }

  // Modal handlers
  const handleOpenDetailModal = async (user: any) => {
    setSelectedUser(user)
    setSelectedRole(user.role || 'user')
    setSelectedGrade(getUserBadgeLabel(user))
    setIsDetailModalOpen(true)
    setOpenMenuId(null) // Close the menu

    // Fetch posts and comments count when modal opens
    const userId = user?.id || user?.userId
    if (userId && typeof userId === 'number' && userId > 0) {
      console.log('Fetching posts and comments for userId:', userId)
      await Promise.all([
        fetchUserPosts(userId),
        fetchUserComments(userId)
      ])
    } else {
      console.error('Invalid user ID in handleOpenDetailModal:', userId, user)
    }
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedUser(null)
    setSelectedRole('')
    setSelectedGrade('')
    setBlacklistStatus('')
    setSelectedTab(0)
    setUserPosts([])
    setUserComments([])
  }

  const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)

    // Fetch data when tab changes
    const userId = selectedUser?.id || selectedUser?.userId
    if (userId && typeof userId === 'number' && userId > 0) {
      if (newValue === 0) {
        // Posts tab
        await fetchUserPosts(userId)
      } else if (newValue === 1) {
        // Comments tab
        await fetchUserComments(userId)
      }
    }
  }

  const fetchUserPosts = async (userId: number) => {
    try {
      setLoadingPosts(true)
      if (!userId || userId <= 0) {
        console.error('Invalid userId:', userId)
        setUserPosts([])
        return
      }
      // Use fetch directly with credentials to include admin cookie
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/feed?tab=posts&userId=${userId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for admin auth
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      if (result.success && result.data?.items) {
        setUserPosts(result.data.items || [])
      } else {
        setUserPosts([])
      }
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setUserPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const fetchUserComments = async (userId: number) => {
    try {
      setLoadingComments(true)
      if (!userId || userId <= 0) {
        console.error('Invalid userId:', userId)
        setUserComments([])
        return
      }
      // Use fetch directly with credentials to include admin cookie
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/feed?tab=replies&userId=${userId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for admin auth
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      if (result.success && result.data?.items) {
        // Extract all comments from posts including nested replies
        const comments: any[] = []
        const items = result.data.items || []
        items.forEach((post: any) => {
          if (post.comments && post.comments.length > 0) {
            // Extract all comments including nested replies
            const extractedComments = extractAllComments(post.comments, post)
            comments.push(...extractedComments)
          }
        })
        setUserComments(comments)
      } else {
        setUserComments([])
      }
    } catch (error) {
      console.error('Error fetching user comments:', error)
      setUserComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleRoleChange = async (event: any) => {
    const newRole = event.target.value
    const currentRole = selectedUser?.role || 'user'

    // If changing from user to manager, ask for admin password
    if (currentRole === 'user' && newRole === 'manager') {
      setSelectedRole(newRole)
      setPasswordError('')
      setAdminPassword('')
      setConfirmPassword('')
      setShowAdminSetupModal(true)
    }
    // If changing from manager to user, change directly without confirmation
    else if (currentRole === 'manager' && newRole === 'user') {
      setSelectedRole(newRole)
      if (selectedUser) {
        await saveUserUpdate({ role: newRole })
        setSelectedUser({ ...selectedUser, role: newRole })
      }
    }
    // If already same role, just update state
    else {
      setSelectedRole(newRole)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, role: newRole })
      }
    }
  }

  const handleAdminSetup = async () => {
    // Validate that both passwords are filled
    if (!adminPassword || !confirmPassword) {
      setPasswordError('비밀번호와 비밀번호 확인을 모두 입력해주세요.')
      return
    }

    // Check if passwords match
    if (adminPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다.')
      return
    }

    // Verify admin password against admin credentials
    const isValidPassword = validateAdminCredentials('admin@noldam.com', adminPassword)

    if (!isValidPassword) {
      setPasswordError('비밀번호가 올바르지 않습니다.')
      return
    }

    setPasswordError('')
    const targetUser = selectedUser || selectedUser3
    const targetRole = selectedRole || selectedRole3
    const targetUserId = selectedUser?.id || selectedUser3?.id

    if (targetUser && targetRole === 'manager' && targetUserId) {
      try {
        setUpdating(true)
        const success = await userApi.updateUserAdmin({
          userId: targetUserId,
          role: targetRole
        })

        if (success) {
          // Refresh the users list to get updated data from database
          const params: any = {}
          if (searchTerm) params.search = searchTerm
          if (gradeFilter !== '전체 등급') params.grade = gradeFilter
          if (statusFilter !== '전체 상태') params.status = statusFilter

          const result = await userApi.getUsersForManagement(params)
          if (result?.users) {
            setUsers(result.users || [])

            // Find and update the selected user with fresh data
            const updatedUserFromList = result.users.find((u: any) => u.id === targetUserId)
            if (updatedUserFromList) {
              if (selectedUser) {
                setSelectedUser(updatedUserFromList)
                setSelectedRole(updatedUserFromList.role)
              }
              if (selectedUser3) {
                setSelectedUser3(updatedUserFromList)
                setSelectedRole3(updatedUserFromList.role)
              }
            }
          }

          setShowAdminSetupModal(false)
          setAdminPassword('')
          setConfirmPassword('')
        } else {
          setPasswordError('업데이트에 실패했습니다.')
        }
      } catch (error) {
        console.error('Error in handleAdminSetup:', error)
        setPasswordError('업데이트 중 오류가 발생했습니다.')
      } finally {
        setUpdating(false)
      }
    }
  }

  const handleCloseAdminSetupModal = () => {
    setShowAdminSetupModal(false)
    // Reset form
    setAdminPassword('')
    setConfirmPassword('')
    setPasswordError('')
    // Reset role selection to original
    if (selectedUser) {
      setSelectedRole(selectedUser.role || 'user')
    }
    if (selectedUser3) {
      setSelectedRole3(selectedUser3.role || 'user')
    }
  }

  const handleBlacklistButtonClick = () => {
    setShowBlacklistConfirmModal(true)
  }

  const handleBlacklistConfirm = async () => {
    // Handle blacklist confirmation logic here
    setShowBlacklistConfirmModal(false)
    // Update user's blacklist status
    if (selectedUser) {
      await saveUserUpdate({ status: '블랙리스트' })
      setSelectedUser({ ...selectedUser, status: '블랙리스트' })
      // Refresh users list
      fetchUsers()
    }
  }

  const handleCloseBlacklistModal = () => {
    setShowBlacklistConfirmModal(false)
  }

  const handleDeleteButtonClick = (itemType: string, itemId?: number, postId?: number) => {
    setDeleteItemType(itemType)
    setDeleteItemId(itemId || null)
    setDeleteItemPostId(postId || null)
    setShowDeleteConfirmModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (deleteItemType === '계정') {
      // Delete user account
      const targetUserId = selectedUser?.id || selectedUser3?.id
      if (!targetUserId) {
        alert('사용자 ID를 찾을 수 없습니다.')
        setShowDeleteConfirmModal(false)
        setDeleteItemType('')
        return
      }

      try {
        setUpdating(true)
        const success = await userApi.deleteUser(targetUserId)

        if (success) {
          // Close modals
          setIsDetailModalOpen(false)
          setIsThirdModalOpen(false)
          setSelectedUser(null)
          setSelectedUser3(null)

          // Refresh users list
          await fetchUsers()

          alert('계정이 성공적으로 삭제되었습니다.')
        } else {
          alert('계정 삭제에 실패했습니다.')
        }
      } catch (error) {
        console.error('Error deleting account:', error)
        alert('계정 삭제 중 오류가 발생했습니다.')
      } finally {
        setUpdating(false)
        setShowDeleteConfirmModal(false)
        setDeleteItemType('')
      }
    } else if (deleteItemType === '피드' || deleteItemType === '댓글') {
      // Delete post or comment
      if (!deleteItemId) {
        alert('삭제할 항목 ID를 찾을 수 없습니다.')
        setShowDeleteConfirmModal(false)
        setDeleteItemType('')
        setDeleteItemId(null)
        setDeleteItemPostId(null)
        return
      }

      try {
        setUpdating(true)
        const endpoint = deleteItemType === '피드' ? `/posts/${deleteItemId}` : `/comments/${deleteItemId}`

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for admin auth
        })

        const result = await response.json()

        if (result.success) {
          alert(`${deleteItemType}가 성공적으로 삭제되었습니다.`)
          // Refresh posts/comments if modal is open
          const userId = selectedUser?.id || selectedUser3?.id
          if (userId) {
            if (deleteItemType === '피드') {
              if (selectedUser) await fetchUserPosts(userId)
              if (selectedUser3) await fetchUserPosts3(userId)
            } else {
              if (selectedUser) await fetchUserComments(userId)
              if (selectedUser3) await fetchUserComments3(userId)
            }
          }
        } else {
          alert(result.reason || `${deleteItemType} 삭제에 실패했습니다.`)
        }
      } catch (error) {
        console.error(`Error deleting ${deleteItemType}:`, error)
        alert(`${deleteItemType} 삭제 중 오류가 발생했습니다.`)
      } finally {
        setUpdating(false)
        setShowDeleteConfirmModal(false)
        setDeleteItemType('')
        setDeleteItemId(null)
        setDeleteItemPostId(null)
      }
    } else {
      // Handle other delete types here if needed
      setShowDeleteConfirmModal(false)
      setDeleteItemType('')
      setDeleteItemId(null)
      setDeleteItemPostId(null)
    }
  }

  const handleCloseDeleteModal = () => {
    setShowDeleteConfirmModal(false)
    setDeleteItemType('')
    setDeleteItemId(null)
    setDeleteItemPostId(null)
  }

  // Helper function to check if an item is restricted
  const isItemRestricted = (item: any): boolean => {
    if (!item?.restrictionUntil) return false
    const restrictionDate = new Date(item.restrictionUntil)
    const now = new Date()
    return restrictionDate > now
  }

  const handleRestrictButtonClick = async (itemType: 'post' | 'comment', itemId: number, item?: any) => {
    // Check if item is already restricted
    const isRestricted = item ? isItemRestricted(item) : false

    if (isRestricted) {
      // Remove restriction
      if (confirm(`${itemType === 'post' ? '피드' : '댓글'}의 제한을 해제하시겠습니까?`)) {
        try {
          setUpdating(true)
          const endpoint = itemType === 'post' ? `/posts/${itemId}` : `/comments/${itemId}`

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for admin auth
            body: JSON.stringify({ restrictionDays: 0 })
          })

          const result = await response.json()

          if (result.success) {
            alert(`${itemType === 'post' ? '피드' : '댓글'}의 제한이 해제되었습니다.`)
            // Refresh posts/comments if modal is open
            const userId = selectedUser?.id || selectedUser3?.id
            if (userId) {
              if (itemType === 'post') {
                if (selectedUser) await fetchUserPosts(userId)
                if (selectedUser3) await fetchUserPosts3(userId)
              } else {
                if (selectedUser) await fetchUserComments(userId)
                if (selectedUser3) await fetchUserComments3(userId)
              }
            }
          } else {
            alert(result.reason || '제한 해제에 실패했습니다.')
          }
        } catch (error) {
          console.error('Error removing restriction:', error)
          alert('제한 해제 중 오류가 발생했습니다.')
        } finally {
          setUpdating(false)
        }
      }
    } else {
      // Add restriction
      setRestrictItemType(itemType)
      setRestrictItemId(itemId)
      setRestrictDays(1)
      setShowRestrictModal(true)
    }
  }

  const handleRestrictConfirm = async () => {
    if (!restrictItemId || !restrictItemType || restrictDays <= 0) {
      alert('잘못된 입력입니다.')
      return
    }

    try {
      setUpdating(true)
      const endpoint = restrictItemType === 'post' ? `/posts/${restrictItemId}` : `/comments/${restrictItemId}`

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for admin auth
        body: JSON.stringify({ restrictionDays: restrictDays })
      })

      const result = await response.json()

      if (result.success) {
        alert(`${restrictItemType === 'post' ? '피드' : '댓글'}가 ${restrictDays}일간 제한되었습니다.`)
        // Refresh posts/comments if modal is open
        const userId = selectedUser?.id || selectedUser3?.id
        if (userId) {
          if (restrictItemType === 'post') {
            if (selectedUser) await fetchUserPosts(userId)
            if (selectedUser3) await fetchUserPosts3(userId)
          } else {
            if (selectedUser) await fetchUserComments(userId)
            if (selectedUser3) await fetchUserComments3(userId)
          }
        }
        setShowRestrictModal(false)
        setRestrictItemType('')
        setRestrictItemId(null)
        setRestrictDays(1)
      } else {
        alert(result.reason || '제한 설정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error restricting item:', error)
      alert('제한 설정 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleCloseRestrictModal = () => {
    setShowRestrictModal(false)
    setRestrictItemType('')
    setRestrictItemId(null)
    setRestrictDays(1)
  }

  // Third modal handlers
  const handleOpenThirdModal = async (user: any) => {
    setSelectedUser3(user)
    setSelectedRole3(user.role || 'user')
    setSelectedGrade3(getUserBadgeLabel(user))
    setIsThirdModalOpen(true)
    setOpenMenuId(null)

    // Fetch posts and comments count when modal opens
    const userId = user?.id || user?.userId
    if (userId && typeof userId === 'number' && userId > 0) {
      console.log('Fetching posts and comments for userId (3):', userId)
      await Promise.all([
        fetchUserPosts3(userId),
        fetchUserComments3(userId)
      ])
    } else {
      console.error('Invalid user ID in handleOpenThirdModal:', userId, user)
    }
  }

  const handleCloseThirdModal = () => {
    setIsThirdModalOpen(false)
    setSelectedUser3(null)
    setSelectedRole3('')
    setSelectedGrade3('')
    setSelectedTab3(0)
    setUserPosts3([])
    setUserComments3([])
  }

  const handleTabChange3 = async (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab3(newValue)

    // Fetch data when tab changes
    const userId = selectedUser3?.id || selectedUser3?.userId
    if (userId && typeof userId === 'number' && userId > 0) {
      if (newValue === 0) {
        // Posts tab
        await fetchUserPosts3(userId)
      } else if (newValue === 1) {
        // Comments tab
        await fetchUserComments3(userId)
      }
    }
  }

  const fetchUserPosts3 = async (userId: number) => {
    try {
      setLoadingPosts3(true)
      if (!userId || userId <= 0) {
        console.error('Invalid userId:', userId)
        setUserPosts3([])
        return
      }
      // Use fetch directly with credentials to include admin cookie
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/feed?tab=posts&userId=${userId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for admin auth
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      if (result.success && result.data?.items) {
        setUserPosts3(result.data.items || [])
      } else {
        setUserPosts3([])
      }
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setUserPosts3([])
    } finally {
      setLoadingPosts3(false)
    }
  }

  const fetchUserComments3 = async (userId: number) => {
    try {
      setLoadingComments3(true)
      if (!userId || userId <= 0) {
        console.error('Invalid userId:', userId)
        setUserComments3([])
        return
      }
      // Use fetch directly with credentials to include admin cookie
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/feed?tab=replies&userId=${userId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for admin auth
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      if (result.success && result.data?.items) {
        // Extract all comments from posts including nested replies
        const comments: any[] = []
        const items = result.data.items || []
        items.forEach((post: any) => {
          if (post.comments && post.comments.length > 0) {
            // Extract all comments including nested replies
            const extractedComments = extractAllComments(post.comments, post)
            comments.push(...extractedComments)
          }
        })
        setUserComments3(comments)
      } else {
        setUserComments3([])
      }
    } catch (error) {
      console.error('Error fetching user comments:', error)
      setUserComments3([])
    } finally {
      setLoadingComments3(false)
    }
  }

  const handleRoleChange3 = async (event: any) => {
    const newRole = event.target.value
    const currentRole = selectedUser3?.role || 'user'

    // If changing from user to manager, ask for admin password
    if (currentRole === 'user' && newRole === 'manager') {
      setSelectedRole3(newRole)
      setPasswordError('')
      setAdminPassword('')
      setConfirmPassword('')
      setShowAdminSetupModal(true)
    }
    // If changing from manager to user, change directly without confirmation
    else if (currentRole === 'manager' && newRole === 'user') {
      setSelectedRole3(newRole)
      if (selectedUser3) {
        await saveUserUpdate({ role: newRole }, selectedUser3.id)
        setSelectedUser3({ ...selectedUser3, role: newRole })
      }
    }
    // If already same role, just update state
    else {
      setSelectedRole3(newRole)
      if (selectedUser3) {
        setSelectedUser3({ ...selectedUser3, role: newRole })
      }
    }
  }

  const handleCancelBlacklist = async () => {
    // Cancel blacklist status
    if (selectedUser3) {
      await saveUserUpdate({ status: '활성' }, selectedUser3.id)
      setSelectedUser3({ ...selectedUser3, status: '활성' })
      // Refresh users list
      fetchUsers()
    }
  }

  // Save user updates to database
  const saveUserUpdate = async (updates: {
    role?: string;
    status?: string;
    grade?: string;
  }, userId?: number) => {
    try {
      setUpdating(true)
      const targetUserId = userId || selectedUser?.id || selectedUser3?.id
      if (!targetUserId) {
        return false
      }

      const updateData: any = {
        userId: targetUserId,
        ...updates
      }

      // If grade is being updated, include it
      if (selectedGrade && !updates.grade) {
        updateData.grade = selectedGrade
      }
      if (selectedGrade3 && !updates.grade) {
        updateData.grade = selectedGrade3
      }

      const success = await userApi.updateUserAdmin(updateData)
      if (success) {
        // Refresh users list
        await fetchUsers()

        // Update selected user with fresh data
        const params: any = {}
        if (searchTerm) params.search = searchTerm
        if (gradeFilter !== '전체 등급') params.grade = gradeFilter
        if (statusFilter !== '전체 상태') params.status = statusFilter

        const result = await userApi.getUsersForManagement(params)
        if (result?.users) {
          const updatedUserFromList = result.users.find((u: any) => u.id === targetUserId)
          if (updatedUserFromList) {
            if (selectedUser) {
              setSelectedUser(updatedUserFromList)
              setSelectedGrade(getUserBadgeLabel(updatedUserFromList))
            }
            if (selectedUser3) {
              setSelectedUser3(updatedUserFromList)
              setSelectedGrade3(getUserBadgeLabel(updatedUserFromList))
            }
          }
        }

        return true
      } else {
        alert('업데이트에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('업데이트 중 오류가 발생했습니다.')
      return false
    } finally {
      setUpdating(false)
    }
  }

  return (
    <AdminProtectedRoute>
      <Box className="min-h-screen ">
        {/* Header */}
        <Box className="mb-6">
          <Typography className="text-black text-lg mb-2">
            <span className="text-gray-500 font-light">님 반갑습니다.</span>
          </Typography>
        </Box>

        <Box className="px-5 py-6 border border-gray-200 rounded-3xl">
          <Box className="mb-4">
            <Typography variant="h6" className="text-gray-900 mb-2">
              유저 관리
            </Typography>
            <Typography variant="body1" className="text-gray-500">
              유저 계정, 역할 및 권한을 관리합니다
            </Typography>
          </Box>

          {/* Search and Filters */}
          <Box className="mb-6 flex gap-4 items-center">
            <TextField
              fullWidth
              placeholder='"유저 이름" 또는 "전화번호"로 검색'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="ri-search-line text-gray-500" />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: '41.67%', // col-5 equivalent (5/12 = 41.67%)
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  height: '35px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover fieldset': {
                    border: 'none',
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#000',
                  '&::placeholder': {
                    color: '#999',
                    opacity: 1,
                  },
                },
              }}
            />

            <FormControl sx={{ minWidth: '33.33%' }}> {/* col-4 equivalent (4/12 = 33.33%) */}
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                displayEmpty
                sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  height: '35px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& .MuiSelect-icon': {
                    color: '#999',
                  },
                }}
                renderValue={(value) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{value || '전체 등급'}</span>
                  </Box>
                )}
              >
                <MenuItem className='text-[12px]' value="전체 등급">전체 등급</MenuItem>
                <MenuItem className='text-[12px]' value="일반">일반</MenuItem>
                <MenuItem className='text-[12px]' value="씨앗">씨앗</MenuItem>
                <MenuItem className='text-[12px]' value="모꼬지">모꼬지</MenuItem>
                <MenuItem className='text-[12px]' value="이음이">이음이</MenuItem>
                <MenuItem className='text-[12px]' value="담장이">담장이</MenuItem>
                <MenuItem className='text-[12px]' value="블랙리스트">블랙리스트</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: '25%' }}> {/* col-3 equivalent (3/12 = 25%) */}
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  height: '35px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& .MuiSelect-icon': {
                    color: '#999',
                  },
                }}
                renderValue={(value) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{value || '전체 상태'}</span>
                  </Box>
                )}
              >
                <MenuItem className='text-[12px]' value="전체 상태">전체 상태</MenuItem>
                <MenuItem className='text-[12px]' value="활성">활성</MenuItem>
                <MenuItem className='text-[12px]' value="비활성">비활성</MenuItem>
                <MenuItem className='text-[12px]' value="대기중">대기중</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* User Table */}
          <Card className="shadow-none border border-gray-200 rounded-lg">
            <CardContent className="p-0">
              <TableContainer sx={{ overflow: 'visible' }}>
                <Table>
                  <TableHead>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-semibold py-2 text-black">유저</TableCell>
                      <TableCell className="font-semibold py-2 text-black">역할</TableCell>
                      <TableCell className="font-semibold py-2 text-black">등급</TableCell>
                      <TableCell className="font-semibold py-2 text-black">상태</TableCell>
                      <TableCell className="font-semibold py-2 text-black">마지막 로그인</TableCell>
                      <TableCell className="font-semibold py-2 text-black"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography>로딩 중...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography>사용자를 찾을 수 없습니다.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const badgeDisplay = getUserBadgeDisplay(user)
                        const gradeLabel = getUserBadgeLabel(user)
                        return (
                          <TableRow
                            key={user.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => user.status === '블랙리스트' ? handleOpenThirdModal(user) : handleOpenDetailModal(user)}
                          >
                            <TableCell>
                              <Box className="flex items-center gap-3">
                                {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/') || user.avatar.startsWith('data:')) ? (
                                  <Avatar
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-10 h-10"
                                  />
                                ) : (
                                  <Avatar className="w-10 h-10 bg-gray-300 text-black">
                                    {user.name?.[0] || user.avatar || ''}
                                  </Avatar>
                                )}
                                <Box>
                                  <Box className="flex items-center gap-1">
                                    <Typography className="font-medium text-black text-[12px] ">
                                      {user.name}
                                    </Typography>
                                    {/* {badgeDisplay && (
                                      <img
                                        src={badgeDisplay.image}
                                        alt={badgeDisplay.label}
                                        className="w-4 h-4 object-contain"
                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                      /> 
                                    )} */}
                                  </Box>
                                  <Typography className="text-gray-500 text-[12px] ">
                                    {user.phone}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={getRoleDisplayText(user.role)}
                                className="rounded-md"
                                sx={{
                                  ...getRoleStyle(user.role),
                                  height: '20px',
                                  fontSize: '11px',
                                  padding: '0 8px',
                                  display: 'flex',
                                  width: 'fit-content',
                                  alignItems: 'center',
                                  justifyContent: 'start',
                                  '& .MuiChip-label': {
                                    padding: '0 4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'start',
                                    lineHeight: 1
                                  }
                                }}
                              />
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={gradeLabel}
                                size="small"
                                className="rounded-md"
                                sx={{
                                  ...getGradeStyle(gradeLabel),
                                  height: '20px',
                                  fontSize: '11px',
                                  padding: '0 8px',
                                  display: 'flex',
                                  width: 'fit-content',
                                  alignItems: 'center',
                                  justifyContent: 'start',
                                  '& .MuiChip-label': {
                                    padding: '0 4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'start',
                                    lineHeight: 1
                                  }
                                }}
                              />
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={user.status}
                                size="small"
                                className="rounded-md"
                                sx={{
                                  ...getStatusStyle(user.status),
                                  height: '20px',
                                  fontSize: '11px',
                                  padding: '0 8px',
                                  display: 'flex',
                                  width: 'fit-content',
                                  alignItems: 'center',
                                  justifyContent: 'start',
                                  '& .MuiChip-label': {
                                    padding: '0 4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'start',
                                    lineHeight: 1
                                  }
                                }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography className="text-gray-600 text-[12px]">
                                {user.lastLogin}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Box sx={{ position: 'relative' }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMenuClick(user.id)
                                  }}
                                >
                                  <i className="ri-more-2-line text-gray-500" />
                                </IconButton>

                                {openMenuId === user.id && (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: '0%',
                                      right: 20,
                                      backgroundColor: 'white',
                                      borderRadius: '12px',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                      border: '1px solid #e0e0e0',
                                      minWidth: '120px',
                                      transform: 'translateX(-50%)',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        padding: '10px',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          backgroundColor: '#f5f5f5',
                                        },
                                        borderRadius: '12px',
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        user.id === 3 ? handleOpenThirdModal(user) : handleOpenDetailModal(user)
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '12px',
                                          color: '#000',
                                          fontWeight: '500',
                                          textAlign: 'center'
                                        }}
                                      >
                                        유저 상세 관리
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

        </Box>

        {/* User Detail Modal */}
        <Modal
          open={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '16px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Scrollable Content */}
            <Box sx={{ padding: '24px' }}>
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  padding: '0 0 15px 0'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '16px' }}>
                  <Box>
                    <Typography className='text-[16px] font-bold text-black'>
                      {selectedUser?.name} 상세 관리
                    </Typography>
                    <Typography className='text-[12px] text-gray-500'>
                      {selectedUser?.phone}
                    </Typography>
                  </Box>
                  <Avatar
                    src={selectedUser?.avatar && (selectedUser.avatar.startsWith('http') || selectedUser.avatar.startsWith('/') || selectedUser.avatar.startsWith('data:')) ? selectedUser.avatar : undefined}
                    sx={{ width: 50, height: 50 }}
                  >
                    {selectedUser?.name?.[0] || ''}
                  </Avatar>
                </Box>
                <IconButton onClick={handleCloseDetailModal} sx={{ color: '#666', padding: '0' }}>
                  <i className="ri-close-line text-xl" />
                </IconButton>
              </Box>
              {/* User Role and Status Management Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                {/* Current Role Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    현재 역할
                  </Typography>
                  <Chip
                    label={getRoleDisplayText(selectedUser?.role || 'user')}
                    size="small"
                    sx={{
                      ...getRoleStyle(selectedUser?.role || 'user'),
                      height: '24px',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  />
                </Box>

                {/* Role Change Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    역할 변경
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: '100%' }}>
                    <Select
                      value={selectedRole}
                      onChange={handleRoleChange}
                      displayEmpty
                      sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        height: '32px',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { fontSize: '12px', padding: '8px 12px' }
                      }}
                    >
                      <MenuItem value="manager" sx={{ fontSize: '12px' }}>관리자</MenuItem>
                      <MenuItem value="user" sx={{ fontSize: '12px' }}>유저</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Blacklist Management Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    블랙리스트 관리
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<i className="ri-shield-line" />}
                    onClick={handleBlacklistButtonClick}
                    sx={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      border: '1px solid #ddd',
                      color: '#000',
                      minWidth: '100%',
                      height: '32px',
                      fontSize: '12px',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: '#f5f5f5', boxShadow: 'none' }
                    }}
                  >
                    블랙리스트로 지정
                  </Button>
                </Box>
              </Box>

              {/* Grade and Status Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '10px' }}>
                {/* Current Grade Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    현재 등급
                  </Typography>
                  <Chip
                    // icon={
                    //   selectedBadgeDisplay ? (
                    //     <img
                    //       src={selectedBadgeDisplay.image}
                    //       alt={selectedBadgeDisplay.label}
                    //       className='w-4 h-4 object-contain'
                    //     />
                    //   ) : undefined
                    // }
                    label={selectedGrade || '등급 없음'}
                    size="small"
                    sx={{
                      ...getGradeStyle(selectedGrade),
                      height: '24px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-icon': {
                        marginLeft: 0,
                        marginRight: 4,
                        width: 16,
                        height: 16
                      },
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  />
                </Box>

                {/* Grade Change Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    등급 변경
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: '100%' }}>
                    <Select
                      value={selectedGrade}
                      onChange={async (e) => {
                        const newGrade = e.target.value
                        setSelectedGrade(newGrade)
                        if (selectedUser && newGrade) {
                          await saveUserUpdate({ grade: newGrade })
                        }
                      }}
                      displayEmpty
                      sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        height: '32px',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { fontSize: '12px', padding: '8px 12px' }
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: '12px' }}>등급 선택</MenuItem>
                      <MenuItem value="일반" sx={{ fontSize: '12px' }}>일반</MenuItem>
                      <MenuItem value="씨앗" sx={{ fontSize: '12px' }}>씨앗</MenuItem>
                      <MenuItem value="모꼬지" sx={{ fontSize: '12px' }}>모꼬지</MenuItem>
                      <MenuItem value="이음이" sx={{ fontSize: '12px' }}>이음이</MenuItem>
                      <MenuItem value="담장이" sx={{ fontSize: '12px' }}>담장이</MenuItem>
                    </Select>
                  </FormControl>
                </Box>


              </Box>

              {/* Status and Login Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginBottom: '20px' }}>
                {/* Join Date Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    가입일
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#000', fontSize: '12px' }}>2023-03-15</Typography>
                </Box>
                {/* Status Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    상태
                  </Typography>
                  <Chip
                    label={selectedUser?.status}
                    size="small"
                    sx={{
                      ...getStatusStyle(selectedUser?.status),
                      height: '24px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  />
                </Box>

                {/* Last Login Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    마지막 로그인
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#000', fontSize: '12px' }}>{selectedUser?.lastLogin}</Typography>
                </Box>
              </Box>

              <Divider sx={{ marginBottom: '24px' }} />

              {/* Administrator Information Section - Only for Admin */}
              {selectedUser?.role === 'manager' && (
                <Box sx={{ marginBottom: '32px' }}>
                  <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '10px', fontSize: '16px' }}>
                    관리자 정보
                  </Typography>
                  <Box sx={{ display: 'flex', gap: '14px' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                        <i className="ri-mail-line text-black text-sm" />
                        <Typography variant="body2" sx={{ color: '#000', fontSize: '12px' }}>이메일</Typography>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        value="admin@noldam.com"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f5f5f5',
                            borderRadius: '8px',
                            height: '32px',
                            '& fieldset': { border: 'none' },
                            '& input': { fontSize: '12px', padding: '8px 12px' }
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <i className="ri-phone-line text-gray-500 text-sm" />
                        <Typography variant="body2" sx={{ color: '#666', fontSize: '12px' }}>전화번호</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <TextField
                          fullWidth
                          size="small"
                          value="010-1234-5678"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#f5f5f5',
                              borderRadius: '8px',
                              height: '32px',
                              '& fieldset': { border: 'none' },
                              '& input': { fontSize: '12px', padding: '8px 12px' }
                            }
                          }}
                        />
                        <Box
                          className='flex items-center justify-center rounded-md bg-green-100 text-green-700'
                          sx={{
                            minWidth: '100px',
                            height: '20px',
                            fontSize: '12px'
                          }}
                        >
                          <i className="ri-check-line mr-1 text-sm " />
                          카카오 인증
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Content Tabs Section */}
              <Box>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: '20px',
                    padding: '4px',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      width: '100%',
                      fontWeight: '500',
                      fontSize: '14px',
                      minHeight: '30px',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      margin: '0 2px',
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        backgroundColor: '#fff',
                        color: '#000',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      display: 'none'
                    }
                  }}
                >
                  <Tab
                    label={`피드 (${userPosts.length})`}
                    icon={<i className="ri-image-line text-sm" />}
                    iconPosition="start"
                    sx={{
                      '& .MuiTab-iconWrapper': { marginRight: '6px' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  />
                  <Tab
                    label={`댓글 (${userComments.length})`}
                    icon={<i className="ri-chat-1-line text-sm" />}
                    iconPosition="start"
                    sx={{
                      '& .MuiTab-iconWrapper': { marginRight: '6px' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ marginTop: '16px' }}>
                  {selectedTab === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                      {loadingPosts ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                          <Typography>로딩 중...</Typography>
                        </Box>
                      ) : userPosts.length === 0 ? (
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '120px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px dashed #ddd'
                        }}>
                          <Typography variant="body1" sx={{ color: '#999', fontSize: '14px' }}>
                            작성한 피드가 없습니다.
                          </Typography>
                        </Box>
                      ) : (
                        userPosts.map((post: any) => {
                          const parsed = parsePostContent(post.content)
                          const displayTitle = post.title || parsed.title || '제목 없음'
                          const displayText = parsed.text || ''
                          const isRestricted = isItemRestricted(post)

                          return (
                            <Card key={post.id} sx={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
                              <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                                  {displayTitle.length > 50 ? displayTitle.substring(0, 50) + '...' : displayTitle}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#666', marginBottom: '12px' }}>
                                  {displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText}
                                </Typography>
                                <Typography sx={{ color: '#999', fontSize: '11px', marginBottom: '12px' }}>
                                  {post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : ''} • 좋아요 {post.likeCount || post.likes?.length || 0} • 댓글 {post._count?.comments || post.comments?.length || 0}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className={isRestricted ? "ri-lock-unlock-line" : "ri-stop-line"} />}
                                    onClick={() => handleRestrictButtonClick('post', post.id, post)}
                                    sx={{
                                      borderColor: isRestricted ? '#ff9800' : '#ddd',
                                      color: isRestricted ? '#ff9800' : '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: isRestricted ? '#f57c00' : '#bbb',
                                        backgroundColor: isRestricted ? '#fff3e0' : '#f9f9f9'
                                      }
                                    }}
                                  >
                                    {isRestricted ? '제한 해제' : '이용금지'}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className="ri-delete-bin-line" />}
                                    onClick={() => handleDeleteButtonClick('피드', post.id)}
                                    sx={{
                                      borderColor: '#ddd',
                                      color: '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: '#bbb',
                                        backgroundColor: '#f9f9f9'
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}

                      {/* Delete Account Button - Bottom Right */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={<i className="ri-delete-bin-line" />}
                          onClick={() => handleDeleteButtonClick('계정')}
                          sx={{
                            backgroundColor: '#D4183D',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'none',
                            padding: '6px 12px',
                            '&:hover': {
                              backgroundColor: '#D82F50'
                            }
                          }}
                        >
                          계정 삭제
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {selectedTab === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                      {loadingComments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                          <Typography>로딩 중...</Typography>
                        </Box>
                      ) : userComments.length === 0 ? (
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '120px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px dashed #ddd'
                        }}>
                          <Typography variant="body1" sx={{ color: '#999', fontSize: '14px' }}>
                            작성한 댓글이 없습니다.
                          </Typography>
                        </Box>
                      ) : (
                        userComments.map((comment: any, index: number) => {
                          const isRestricted = isItemRestricted(comment)
                          return (
                            <Card key={comment.uniqueKey || `${comment.postId}-${comment.id}-${index}`} sx={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
                              <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                                  "{comment.postTitle || '게시글'}"에 대한 댓글
                                </Typography>
                                <Typography variant="body2" sx={{
                                  color: isRestricted ? '#ff9800' : '#666',
                                  marginBottom: '12px',
                                  fontStyle: isRestricted ? 'italic' : 'normal'
                                }}>
                                  {isRestricted ? '이 댓글은 제한되었습니다.' : (comment.content || '')}
                                </Typography>
                                <Typography sx={{ color: '#999', fontSize: '11px', marginBottom: '12px' }}>
                                  {comment.createdAt ? new Date(comment.createdAt).toISOString().split('T')[0] : ''} • 좋아요 {comment.likeCount || comment.likes?.length || 0}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className={isRestricted ? "ri-lock-unlock-line" : "ri-stop-line"} />}
                                    onClick={() => handleRestrictButtonClick('comment', comment.id, comment)}
                                    sx={{
                                      borderColor: isRestricted ? '#ff9800' : '#ddd',
                                      color: isRestricted ? '#ff9800' : '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: isRestricted ? '#f57c00' : '#bbb',
                                        backgroundColor: isRestricted ? '#fff3e0' : '#f9f9f9'
                                      }
                                    }}
                                  >
                                    {isRestricted ? '제한 해제' : '댓글 제한'}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className="ri-delete-bin-line" />}
                                    onClick={() => handleDeleteButtonClick('댓글', comment.id, comment.postId)}
                                    sx={{
                                      borderColor: '#ddd',
                                      color: '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: '#bbb',
                                        backgroundColor: '#f9f9f9'
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}

                      {/* Delete Account Button - Bottom Right */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={<i className="ri-delete-bin-line" />}
                          onClick={() => handleDeleteButtonClick('계정')}
                          sx={{
                            backgroundColor: '#f44336',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'none',
                            padding: '10px 20px',
                            '&:hover': {
                              backgroundColor: '#d32f2f'
                            }
                          }}
                        >
                          계정 삭제
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Third User Detail Modal (for 박민수) */}
        <Modal
          open={isThirdModalOpen}
          onClose={handleCloseThirdModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '16px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Scrollable Content */}
            <Box sx={{ padding: '24px' }}>
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  padding: '0 0 15px 0'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '16px' }}>
                  <Box>
                    <Typography className='text-[16px] font-bold text-black'>
                      {selectedUser3?.name} 상세 관리
                    </Typography>
                    <Typography className='text-[12px] text-gray-500'>
                      {selectedUser3?.phone}
                    </Typography>
                  </Box>
                  <Avatar
                    src={selectedUser3?.avatar && (selectedUser3.avatar.startsWith('http') || selectedUser3.avatar.startsWith('/') || selectedUser3.avatar.startsWith('data:')) ? selectedUser3.avatar : undefined}
                    sx={{ width: 50, height: 50 }}
                  >
                    {selectedUser3?.name?.[0] || ''}
                  </Avatar>
                </Box>
                <IconButton onClick={handleCloseThirdModal} sx={{ color: '#666', padding: '0' }}>
                  <i className="ri-close-line text-xl" />
                </IconButton>
              </Box>

              {/* User Role and Status Management Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                {/* Current Role Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    현재 역할
                  </Typography>
                  <Chip
                    label={getRoleDisplayText(selectedUser3?.role || 'user')}
                    size="small"
                    sx={{
                      ...getRoleStyle(selectedUser3?.role || 'user'),
                      height: '24px',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  />
                </Box>

                {/* Role Change Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    역할 변경
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: '100%' }}>
                    <Select
                      value={selectedRole3}
                      onChange={handleRoleChange3}
                      displayEmpty
                      sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        height: '32px',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { fontSize: '12px', padding: '8px 12px' }
                      }}
                    >
                      <MenuItem value="user" sx={{ fontSize: '12px' }}>유저</MenuItem>
                      <MenuItem value="manager" sx={{ fontSize: '12px' }}>관리자</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Blacklist Management Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    블랙리스트 관리
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<i className="ri-shield-line" />}
                    onClick={handleCancelBlacklist}
                    sx={{
                      backgroundColor: '#D4183D',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      border: '1px solid #D4183D',
                      color: '#fff',
                      minWidth: '100%',
                      height: '32px',
                      fontSize: '12px',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: '#D82F50', boxShadow: 'none' }
                    }}
                  >
                    지정 취소
                  </Button>
                </Box>
              </Box>

              {/* Grade and Status Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '10px' }}>
                {/* Current Grade Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    현재 등급
                  </Typography>
                  {/* <Chip
                    icon={
                      selectedBadgeDisplay3 ? (
                        <img
                          src={selectedBadgeDisplay3.image}
                          alt={selectedBadgeDisplay3.label}
                          className='w-4 h-4 object-contain'
                        />
                      ) : undefined
                    }
                    label={selectedGrade3 || '등급 없음'}
                    size="small"
                    sx={{
                      ...getGradeStyle(selectedGrade3),
                      height: '24px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-icon': {
                        marginLeft: 0,
                        marginRight: 4,
                        width: 16,
                        height: 16
                      },
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  /> */}
                </Box>

                {/* Grade Change Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    등급 변경
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: '100%' }}>
                    <Select
                      value={selectedGrade3}
                      onChange={async (e) => {
                        const newGrade = e.target.value
                        setSelectedGrade3(newGrade)
                        if (selectedUser3 && newGrade) {
                          await saveUserUpdate({ grade: newGrade }, selectedUser3.id)
                        }
                      }}
                      displayEmpty
                      sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        height: '32px',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { fontSize: '12px', padding: '8px 12px' }
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: '12px' }}>등급 선택</MenuItem>
                      <MenuItem value="일반" sx={{ fontSize: '12px' }}>일반</MenuItem>
                      <MenuItem value="씨앗" sx={{ fontSize: '12px' }}>씨앗</MenuItem>
                      <MenuItem value="모꼬지" sx={{ fontSize: '12px' }}>모꼬지</MenuItem>
                      <MenuItem value="이음이" sx={{ fontSize: '12px' }}>이음이</MenuItem>
                      <MenuItem value="담장이" sx={{ fontSize: '12px' }}>담장이</MenuItem>
                    </Select>
                  </FormControl>
                </Box>


              </Box>

              {/* Status and Login Section */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginBottom: '20px' }}>
                {/* Join Date Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    가입일
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#000', fontSize: '12px' }}>2023-08-12</Typography>
                </Box>
                {/* Status Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    상태
                  </Typography>
                  <Chip
                    label={selectedUser3?.status}
                    size="small"
                    sx={{
                      ...getStatusStyle(selectedUser3?.status),
                      height: '24px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'start',
                      '& .MuiChip-label': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'start',
                        lineHeight: 1
                      }
                    }}
                  />
                </Box>

                {/* Last Login Section */}
                <Box>
                  <Typography variant="body2" sx={{ color: '#000', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                    마지막 로그인
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#000', fontSize: '12px' }}>{selectedUser3?.lastLogin}</Typography>
                </Box>
              </Box>


              {/* Content Tabs Section */}
              <Box sx={{ marginTop: '24px' }}>
                <Tabs
                  value={selectedTab3}
                  onChange={handleTabChange3}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: '20px',
                    padding: '4px',
                    marginBottom: '16px',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      width: '100%',
                      fontWeight: '500',
                      fontSize: '14px',
                      minHeight: '30px',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      margin: '0 2px',
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        backgroundColor: '#fff',
                        color: '#000',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      display: 'none'
                    }
                  }}
                >
                  <Tab
                    label={`피드 (${userPosts3.length})`}
                    icon={<i className="ri-image-line text-sm" />}
                    iconPosition="start"
                    sx={{
                      '& .MuiTab-iconWrapper': { marginRight: '6px' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  />
                  <Tab
                    label={`댓글 (${userComments3.length})`}
                    icon={<i className="ri-chat-1-line text-sm" />}
                    iconPosition="start"
                    sx={{
                      '& .MuiTab-iconWrapper': { marginRight: '6px' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ marginTop: '16px' }}>
                  {selectedTab3 === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                      {loadingPosts3 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                          <Typography>로딩 중...</Typography>
                        </Box>
                      ) : userPosts3.length === 0 ? (
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '120px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px dashed #ddd'
                        }}>
                          <Typography variant="body1" sx={{ color: '#999', fontSize: '14px' }}>
                            작성한 피드가 없습니다.
                          </Typography>
                        </Box>
                      ) : (
                        userPosts3.map((post: any) => {
                          const parsed = parsePostContent(post.content)
                          const displayTitle = post.title || parsed.title || '제목 없음'
                          const displayText = parsed.text || ''
                          const isRestricted = isItemRestricted(post)

                          return (
                            <Card key={post.id} sx={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
                              <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                                  {displayTitle.length > 50 ? displayTitle.substring(0, 50) + '...' : displayTitle}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#666', marginBottom: '12px' }}>
                                  {displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText}
                                </Typography>
                                <Typography sx={{ color: '#999', fontSize: '11px', marginBottom: '12px' }}>
                                  {post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : ''} • 좋아요 {post.likeCount || post.likes?.length || 0} • 댓글 {post._count?.comments || post.comments?.length || 0}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className={isRestricted ? "ri-lock-unlock-line" : "ri-stop-line"} />}
                                    onClick={() => handleRestrictButtonClick('post', post.id, post)}
                                    sx={{
                                      borderColor: isRestricted ? '#ff9800' : '#ddd',
                                      color: isRestricted ? '#ff9800' : '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: isRestricted ? '#f57c00' : '#bbb',
                                        backgroundColor: isRestricted ? '#fff3e0' : '#f9f9f9'
                                      }
                                    }}
                                  >
                                    {isRestricted ? '제한 해제' : '이용금지'}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className="ri-delete-bin-line" />}
                                    onClick={() => handleDeleteButtonClick('피드', post.id)}
                                    sx={{
                                      borderColor: '#ddd',
                                      color: '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      '&:hover': {
                                        borderColor: '#bbb',
                                        backgroundColor: '#f9f9f9'
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}

                      {/* Delete Account Button - Bottom Right */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={<i className="ri-delete-bin-line" />}
                          onClick={() => handleDeleteButtonClick('계정')}
                          sx={{
                            backgroundColor: '#D4183D',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'none',
                            padding: '6px 12px',
                            '&:hover': {
                              backgroundColor: '#D82F50'
                            }
                          }}
                        >
                          계정 삭제
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {selectedTab3 === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                      {loadingComments3 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                          <Typography>로딩 중...</Typography>
                        </Box>
                      ) : userComments3.length === 0 ? (
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '120px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px dashed #ddd'
                        }}>
                          <Typography variant="body1" sx={{ color: '#999', fontSize: '14px' }}>
                            작성한 댓글이 없습니다.
                          </Typography>
                        </Box>
                      ) : (
                        userComments3.map((comment: any, index: number) => {
                          const isRestricted = isItemRestricted(comment)
                          return (
                            <Card key={comment.uniqueKey || `${comment.postId}-${comment.id}-${index}`} sx={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
                              <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '8px', color: '#333', fontSize: '14px' }}>
                                  "{comment.postTitle || '게시글'}"에 대한 댓글
                                </Typography>
                                <Typography variant="body2" sx={{
                                  color: isRestricted ? '#ff9800' : '#666',
                                  marginBottom: '12px',
                                  fontSize: '12px',
                                  fontStyle: isRestricted ? 'italic' : 'normal'
                                }}>
                                  {isRestricted ? '이 댓글은 제한되었습니다.' : (comment.content || '')}
                                </Typography>
                                <Typography sx={{ color: '#999', fontSize: '11px', marginBottom: '12px' }}>
                                  {comment.createdAt ? new Date(comment.createdAt).toISOString().split('T')[0] : ''} • 좋아요 {comment.likeCount || comment.likes?.length || 0}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className={isRestricted ? "ri-lock-unlock-line" : "ri-stop-circle-line"} />}
                                    onClick={() => handleRestrictButtonClick('comment', comment.id, comment)}
                                    sx={{
                                      borderColor: isRestricted ? '#ff9800' : '#ddd',
                                      color: isRestricted ? '#ff9800' : '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      height: '28px',
                                      '&:hover': {
                                        borderColor: isRestricted ? '#f57c00' : '#bbb',
                                        backgroundColor: isRestricted ? '#fff3e0' : '#f9f9f9'
                                      }
                                    }}
                                  >
                                    {isRestricted ? '제한 해제' : '댓글 제한sssss'}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<i className="ri-delete-bin-line" />}
                                    onClick={() => handleDeleteButtonClick('댓글', comment.id, comment.postId)}
                                    sx={{
                                      borderColor: '#ddd',
                                      color: '#333',
                                      backgroundColor: '#fff',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      textTransform: 'none',
                                      height: '28px',
                                      '&:hover': {
                                        borderColor: '#bbb',
                                        backgroundColor: '#f9f9f9'
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}

                      {/* Delete Account Button - Bottom Right */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={<i className="ri-delete-bin-line" />}
                          onClick={() => handleDeleteButtonClick('계정')}
                          sx={{
                            backgroundColor: '#D4183D',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'none',
                            padding: '6px 12px',
                            '&:hover': {
                              backgroundColor: '#D82F50'
                            }
                          }}
                        >
                          계정 삭제
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Admin Setup Modal */}
        <Modal
          open={showAdminSetupModal}
          onClose={handleCloseAdminSetupModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '500px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <IconButton
              onClick={handleCloseAdminSetupModal}
              sx={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                color: '#666'
              }}
            >
              <i className="ri-close-line text-xl" />
            </IconButton>

            {/* Modal Title */}
            <Typography className='text-black font-bold mb-2' sx={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>
              관리자 계정 설정
            </Typography>

            {/* Instruction Text */}
            <Typography sx={{ color: '#666', marginBottom: '24px', fontSize: '12px' }}>
              관리자 권한을 부여하기 위해 이메일과 비밀번호를 설정해주세요.
            </Typography>

            {/* Email Field */}
            <Box sx={{ marginBottom: '10px' }}>
              <Typography variant="body2" sx={{ color: '#333', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                이메일
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={adminEmail}
                placeholder="admin@noldam.com"
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' }
                  }
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ marginBottom: '10px' }}>
              <Typography sx={{ color: '#333', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                비밀번호
              </Typography>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value)
                  setPasswordError('')
                }}
                error={!!passwordError}
                helperText={passwordError}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#000' }}
                    >
                      <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f5f5f5',
                    fontSize: '12px',
                    borderRadius: '8px',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' }
                  }
                }}
              />
            </Box>

            {/* Confirm Password Field */}
            <Box sx={{ marginBottom: '10px' }}>
              <Typography sx={{ color: '#333', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                비밀번호 확인
              </Typography>
              <TextField
                fullWidth
                size="small"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError('')
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      sx={{ color: '#000' }}
                    >
                      <i className={`${showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' }
                  }
                }}
              />
            </Box>

            {/* Validation Message */}
            {passwordError && (
              <Typography variant="body2" sx={{ color: '#d32f2f', marginBottom: '10px', fontSize: '12px' }}>
                {passwordError}
              </Typography>
            )}
            {!passwordError && (
              <Typography variant="body2" sx={{ color: '#666', marginBottom: '10px', fontSize: '12px' }}>
                관리자 비밀번호를 입력해주세요.
              </Typography>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseAdminSetupModal}
                sx={{
                  borderColor: '#ddd',
                  color: '#666',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    borderColor: '#bbb',
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAdminSetup}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: '#333'
                  }
                }}
              >
                설정
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Blacklist Confirmation Modal */}
        <Modal
          open={showBlacklistConfirmModal}
          onClose={handleCloseBlacklistModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '400px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Modal Title */}
            <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px', color: '#000' }}>
              블랙리스트 설정 확인
            </Typography>

            {/* Confirmation Message */}
            <Typography variant="body2" sx={{ color: '#333', marginBottom: '24px', fontSize: '12px' }}>
              정말로 이 사용자의 블랙리스트 상태를 변경하시겠습니까?
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseBlacklistModal}
                sx={{
                  borderColor: '#ddd',
                  color: '#666',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    borderColor: '#bbb',
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleBlacklistConfirm}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: '#333'
                  }
                }}
              >
                확인
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Restrict Confirmation Modal */}
        <Modal
          open={showRestrictModal}
          onClose={handleCloseRestrictModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '400px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Modal Title */}
            <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '16px', fontSize: '18px', color: '#000' }}>
              {restrictItemType === 'post' ? '피드 제한' : '댓글 제한'}
            </Typography>

            {/* Confirmation Message */}
            <Typography variant="body2" sx={{ color: '#333', marginBottom: '16px', fontSize: '14px' }}>
              몇 일 동안 제한하시겠습니까?
            </Typography>

            {/* Days Input */}
            <TextField
              type="number"
              value={restrictDays}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                setRestrictDays(Math.max(1, value))
              }}
              inputProps={{ min: 1 }}
              label="일수"
              fullWidth
              sx={{
                marginBottom: '24px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '14px'
                }
              }}
            />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseRestrictModal}
                sx={{
                  borderColor: '#ddd',
                  color: '#666',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    borderColor: '#bbb',
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleRestrictConfirm}
                disabled={updating}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: '#333'
                  }
                }}
              >
                확인
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteConfirmModal}
          onClose={handleCloseDeleteModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box
            sx={{
              width: '90%',
              maxWidth: '400px',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Modal Title */}
            <Typography variant="h6" sx={{ fontWeight: '600', marginBottom: '16px', fontSize: '18px', color: '#000' }}>
              {deleteItemType === '계정' ? '계정 삭제 확인' : '콘텐츠 삭제 확인'}
            </Typography>

            {/* Confirmation Message */}
            <Typography variant="body2" sx={{ color: '#333', marginBottom: '24px', fontSize: '14px' }}>
              {deleteItemType === '계정'
                ? '정말로 이 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
                : '정말로 이 콘텐츠를 삭제하시겠습니까?'}
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseDeleteModal}
                sx={{
                  borderColor: '#ddd',
                  color: '#666',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    borderColor: '#bbb',
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleDeleteConfirm}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '12px',
                  padding: '6px 16px',
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: '#333'
                  }
                }}
              >
                확인
              </Button>
            </Box>
          </Box>
        </Modal>

      </Box>
    </AdminProtectedRoute>
  )
}

export default UserManagementPage
