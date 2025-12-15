'use client'

import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import Image from 'next/image'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'

import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import SearchIcon from '@mui/icons-material/Search'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import GroupIcon from '@mui/icons-material/Group'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import DeleteIcon from '@mui/icons-material/Delete'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import NotInterestedIcon from '@mui/icons-material/NotInterested'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CreditScoreOutlinedIcon from '@mui/icons-material/CreditScoreOutlined'

// import yogaImage from '../../../assets/iconify-icons/yogaImage.jpg'

import React, { useEffect, useState } from 'react'
import { meetingsApi, Meeting, MeetingReview } from '@/services/meetingsApi'

// ---------- Types ----------
interface Column {
  id: string
  label: string
  minWidth?: number
  align?: 'center' | 'right' | 'left'
}
interface Data {
  [key: string]: string
}

// ---------- Table Columns ----------
const columns: Column[] = [
  { id: 'col1', label: '모임명', minWidth: 100 },
  { id: 'col2', label: '카테고리', minWidth: 100 },
  { id: 'col3', label: '결제건수', minWidth: 100, align: 'center' },
  { id: 'col4', label: '이용자 수', minWidth: 100, align: 'center' },
  { id: 'col5', label: '호스트명', minWidth: 120 },
  { id: 'col6', label: '최근 모임 일시', minWidth: 150 },
  { id: 'col7', label: '상태', minWidth: 80, align: 'center' },
  { id: 'col8', label: '작업', minWidth: 50, align: 'center' }
]

// ---------- Table Rows will come from API ----------

// ---------- Main Component ----------
export default function Meetings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValue, setSelectedValue] = useState('모든 카테고리')
  const [selectedValue1, setSelectedValue1] = useState('모든 상태')

  // menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuRow, setMenuRow] = useState<number | null>(null)

  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  // const[row, setRow] = useState<number | null>(null)

  const open = Boolean(anchorEl)
  const opentab2 = Boolean(anchor)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<any>(null)

  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5'>('tab1')

  const handleRowClick = (row: any) => {
    setSelectedRow(row)
    setModalOpen(true)
    setActiveTab('tab1')
    setIsEditing(false)
    setImageError(false)
    // Reset details when opening new meeting
    setSelectedMeetingDetails(null)
    setSelectedMeetingParticipants([])
    setSelectedMeetingReviews([])
  }
  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedRow(null)
    setSelectedMeetingDetails(null)
    setSelectedMeetingParticipants([])
    setSelectedMeetingReviews([])
    setIsEditing(false)
  }
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, rowIndex: number) => {
    setAnchorEl(event.currentTarget)
    setMenuRow(rowIndex)
  }

  const [selectedParticipant, setSelectedParticipant] = useState<any>(null)

  const handleTab2Click = (event: React.MouseEvent<HTMLElement>, participant?: any) => {
    setAnchor(event.currentTarget)
    if (participant) {
      setSelectedParticipant(participant)
    }
  }

  const handleClose = () => {
    setAnchor(null)
    setSelectedParticipant(null)
  }

  const handleSuspendParticipant = async () => {
    if (!selectedParticipant || !selectedRow) {
      handleClose()
      return
    }

    const isSuspended = selectedParticipant.paymentStatus === 'suspended'
    const action = isSuspended ? 'unsuspend' : 'suspend'
    const confirmMessage = isSuspended
      ? `정말로 이 참가자의 정지를 해제하시겠습니까? 참가자는 다시 모임에 참여할 수 있습니다.`
      : `정말로 이 참가자를 정지하시겠습니까? 참가자는 모임에서 제거됩니다.`

    if (!confirm(confirmMessage)) {
      handleClose()
      return
    }

    try {
      // Suspend or unsuspend participant
      const response = await fetch(`/api/meetings/${selectedRow.id}/participants/${selectedParticipant.id}?action=${action}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success || response.ok) {
        // Update participant in local state instead of removing
        if (result.participant) {
          setSelectedMeetingParticipants(prev =>
            prev.map(p => p.id === selectedParticipant.id ? result.participant : p)
          )
        } else {
          // Fallback: update status manually
          setSelectedMeetingParticipants(prev =>
            prev.map(p =>
              p.id === selectedParticipant.id
                ? { ...p, paymentStatus: isSuspended ? (p.paymentId ? 'confirmed' : 'pending') : 'suspended' }
                : p
            )
          )
        }
        alert(isSuspended ? '참가자 정지가 해제되었습니다.' : '참가자가 정지되었습니다.')
      } else {
        alert(`참가자 ${isSuspended ? '정지 해제' : '정지'}에 실패했습니다: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('Suspend/unsuspend participant error', err)
      alert(`참가자 ${isSuspended ? '정지 해제' : '정지'} 중 오류가 발생했습니다.`)
    } finally {
      handleClose()
    }
  }

  const handleBanParticipant = async () => {
    if (!selectedParticipant || !selectedRow) {
      handleClose()
      return
    }

    if (!confirm(`정말로 이 참가자를 차단하시겠습니까? 참가자는 모임에서 영구적으로 제거됩니다.`)) {
      handleClose()
      return
    }

    try {
      // Remove participant from meeting (ban)
      const response = await fetch(`/api/meetings/${selectedRow.id}/participants/${selectedParticipant.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success || response.ok) {
        // Remove from local state
        setSelectedMeetingParticipants(prev => prev.filter(p => p.id !== selectedParticipant.id))
        alert('참가자가 차단되었습니다.')
      } else {
        alert(`참가자 차단에 실패했습니다: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('Ban participant error', err)
      alert('참가자 차단 중 오류가 발생했습니다.')
    } finally {
      handleClose()
    }
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setMenuRow(null)
  }

  const [isEditing, setIsEditing] = useState(false)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMeetingDetails, setSelectedMeetingDetails] = useState<any>(null)
  const [selectedMeetingParticipants, setSelectedMeetingParticipants] = useState<any[]>([])
  const [selectedMeetingReviews, setSelectedMeetingReviews] = useState<MeetingReview[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Filter meetings based on search, category, and status
  const filteredMeetings = meetings.filter(meeting => {
    // Search filter - check meeting name or host name
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const meetingName = ((meeting as any).title || meeting.meetingName || '').toLowerCase()
      const hostName = (meeting.user?.name || (meeting.user as any)?.nickname || '').toLowerCase()
      if (!meetingName.includes(searchLower) && !hostName.includes(searchLower)) {
        return false
      }
    }

    // Category filter
    if (selectedValue !== '모든 카테고리') {
      // Map Korean category names to category IDs
      const categoryMap: Record<string, number[]> = {
        '라이프 · 휴식': [1],
        '문화 · 예술': [2],
        '피크닉 · 아웃도어': [3],
        '스포츠 · 액티비티': [4],
        '맛 · 쿠킹': [5],
        '음악 · 퍼포먼스': [6],
        '책 · 인문 · 글': [7],
        '공예 · 메이킹': [8],
        '커리어 · 성장': [9],
        '소셜 · 토크': [10]
      }
      const categoryIds = categoryMap[selectedValue] || []
      if (categoryIds.length > 0) {
        const meetingCategory = meeting.category
        const categoryId = typeof meetingCategory === 'string' ? parseInt(meetingCategory) : meetingCategory
        if (!categoryIds.includes(categoryId as number)) {
          return false
        }
      }
    }

    // Status filter
    if (selectedValue1 !== '모든 상태') {
      const status = (meeting as any).status || 'approved'
      const statusMap: Record<string, string[]> = {
        '활동적인': ['approved', 'active'],
        '검토중': ['pending'],
        '비활성': ['reject', 'completed']
      }
      const allowedStatuses = statusMap[selectedValue1] || []
      if (allowedStatuses.length > 0 && !allowedStatuses.includes(status)) {
        return false
      }
    }

    return true
  })

  // Calculate dashboard stats from meetings
  const totalMeetings = meetings.length
  const activeMeetings = meetings.filter(m => (m as any).status === 'approved' || (m as any).status === 'active').length
  const pendingMeetings = meetings.filter(m => (m as any).status === 'pending').length

  // Fetch meetings from API
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await meetingsApi.getMeetings()
        if (!mounted) return
        if (data) {
          setMeetings(data)
        } else {
          setMeetings([])
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Fetch meeting details when selected
  useEffect(() => {
    if (selectedRow && modalOpen) {
      setLoadingDetails(true)
      async function loadDetails() {
        try {
          const details = await meetingsApi.getMeetingDetails(selectedRow.id)
          if (details) {
            setSelectedMeetingDetails(details)
            // Load participants from details if available
            if ((details as any).participants) {
              setSelectedMeetingParticipants((details as any).participants)
            }
          }

          // Load reviews
          const reviewsData = await meetingsApi.getMeetingReviews(selectedRow.id)
          if (reviewsData && reviewsData.reviews) {
            setSelectedMeetingReviews(reviewsData.reviews)
          }
        } catch (err) {
          console.error('Error loading meeting details:', err)
        } finally {
          setLoadingDetails(false)
        }
      }
      loadDetails()
    }
  }, [selectedRow, modalOpen])

  const handleDeleteMeeting = async (meetingId: number) => {
    if (!confirm('정말로 이 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      // Use fetch directly with credentials to include admin cookie
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for admin auth
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (result.success || response.ok) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId))
        // Close modal if the deleted meeting was open
        if (selectedRow?.id === meetingId) {
          handleModalClose()
        }
        handleMenuClose()
        alert('모임이 성공적으로 삭제되었습니다.')
      } else {
        const errorMsg = result.error || '알 수 없는 오류'
        console.error('Delete meeting failed:', errorMsg)
        alert(`모임 삭제에 실패했습니다: ${errorMsg}`)
      }
    } catch (err) {
      console.error('Delete meeting error', err)
      const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류'
      alert(`모임 삭제 중 오류가 발생했습니다: ${errorMsg}`)
    }
  }

  interface FormData {
    name: string
    description: string
    location: string
    price: string
    status: string
    map: string
  }

  // Helper function to strip HTML tags and decode HTML entities for editing
  const stripHtmlForEditing = (html: string | null | undefined): string => {
    if (!html) return ''

    // If running on client side, use DOM parsing
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        // Create a temporary div element to parse HTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html

        // Get text content (this automatically strips HTML tags)
        let text = tempDiv.textContent || tempDiv.innerText || ''

        // Decode common HTML entities
        text = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")

        // Clean up extra whitespace but preserve line breaks
        text = text.replace(/\s+/g, ' ').trim()

        return text
      } catch (error) {
        // Fall through to regex-based stripping if DOM parsing fails
      }
    }

    // Fallback: Use regex to strip HTML tags (works on both client and server)
    let text = html
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#x60;/g, '`')
      .replace(/&#x3D;/g, '=')

    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim()

    return text
  }

  // Get form data from selected meeting or use defaults
  const getFormData = (): FormData => {
    if (selectedMeetingDetails) {
      const meeting = selectedMeetingDetails
      const status = meeting.status === 'approved' ? '활성' : meeting.status === 'pending' ? '검수중' : meeting.status === 'reject' ? '비활성' : '활성'
      return {
        name: (meeting as any).title || meeting.meetingName || '',
        description: stripHtmlForEditing(meeting.description),
        location: meeting.roadNameAddress || meeting.location || '',
        price: meeting.fee ? `${Number(meeting.fee).toLocaleString()}원` : '0원',
        status: status,
        map: meeting.roadNameAddress || meeting.location || 'Location Map'
      }
    }
    if (selectedRow) {
      const status = (selectedRow as any).status === 'approved' ? '활성' : (selectedRow as any).status === 'pending' ? '검수중' : (selectedRow as any).status === 'reject' ? '비활성' : '활성'
      return {
        name: (selectedRow as any)?.title || selectedRow.meetingName || '',
        description: stripHtmlForEditing(selectedRow.description),
        location: selectedRow.location || '',
        price: '25,000원', // Keep static as payment-related
        status: status,
        map: selectedRow.location || 'Location Map'
      }
    }
    return {
      name: '요가 클래스',
      description: '초보자도 쉽게 따라할 수 있는 요가 클래스입니다. 전문 강사와 함께 몸과 마음의 균형을 찾아보세요.',
      location: '서울시 강남구 테헤란로 123 요가스튜디오',
      price: '25,000원',
      status: '활성',
      map: 'Location Map'
    }
  }

  const [formData, setFormData] = useState<FormData>(getFormData())

  // Update form data when selected meeting changes
  useEffect(() => {
    if (selectedRow || selectedMeetingDetails) {
      const newFormData = getFormData()
      setFormData(newFormData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow, selectedMeetingDetails])

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!selectedRow) return

    try {
      // Convert form data to API format
      const statusMap: Record<string, string> = {
        '활성': 'approved',
        '검수중': 'pending',
        '비활성': 'reject'
      }

      // Parse price (remove "원" and commas, convert to number)
      const priceValue = formData.price.replace(/[원,]/g, '').trim()
      const fee = priceValue ? parseFloat(priceValue) : 0

      // Get existing meeting details to preserve required fields
      const existingMeeting = selectedMeetingDetails || selectedRow
      const meetingTime = existingMeeting?.meetingTime || selectedRow?.meetingTime

      // Format meeting time for API (dateValue and timeValue format)
      let dateValue = ''
      let timeValue = ''
      if (meetingTime) {
        const date = new Date(meetingTime)
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0] // YYYY-MM-DD
          timeValue = date.toTimeString().split(' ')[0].slice(0, 5) // HH:MM
        }
      }

      // Prepare update data - include required fields to avoid API errors
      // Preserve existing categories - get from existingMeeting first, then selectedRow
      let preservedCategories: string[] = []
      if (existingMeeting && (existingMeeting as any).categories && Array.isArray((existingMeeting as any).categories)) {
        preservedCategories = (existingMeeting as any).categories.map((c: any) => String(c))
      } else if ((selectedRow as any)?.category) {
        preservedCategories = [String((selectedRow as any).category)]
      } else if ((selectedRow as any)?.categories && Array.isArray((selectedRow as any).categories)) {
        preservedCategories = (selectedRow as any).categories.map((c: any) => String(c))
      }

      const updateData: any = {
        meetingName: formData.name,
        description: formData.description,
        roadNameAddress: formData.location,
        status: statusMap[formData.status] || formData.status,
        // Include dateValue and timeValue to preserve meeting time
        dateValue: dateValue || undefined,
        timeValue: timeValue || undefined,
        // Preserve existing meeting frequency if not provided
        meetingFrequency: existingMeeting?.meetingFrequency || 'none',
        // Preserve existing categories if not being edited
        categories: preservedCategories
      }

      // Only include fee if it's a valid number
      if (!isNaN(fee) && fee >= 0) {
        updateData.feeAmount = fee
        updateData.feeOption = fee > 0 ? '있음' : '없음'
      }

      // Ensure we have dateValue and timeValue - if not, try to get from existing meeting
      if (!dateValue || !timeValue) {
        // Try to get from the date field if available
        const dateField = (selectedRow as any)?.date || existingMeeting?.date
        if (dateField) {
          const date = new Date(dateField)
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString().split('T')[0]
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            timeValue = `${hours}:${minutes}`
          }
        }
      }

      // If still no date/time, use current date/time as fallback
      if (!dateValue || !timeValue) {
        const now = new Date()
        dateValue = now.toISOString().split('T')[0]
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        timeValue = `${hours}:${minutes}`
      }

      updateData.dateValue = dateValue
      updateData.timeValue = timeValue

      // Call API to update meeting
      const result = await meetingsApi.updateMeeting(selectedRow.id, updateData)

      if (result.success) {
        // Reload meeting details first to get the latest data
        let updatedDetails: any = null
        if (selectedRow.id) {
          updatedDetails = await meetingsApi.getMeetingDetails(selectedRow.id)
          if (updatedDetails) {
            setSelectedMeetingDetails(updatedDetails)
            // Update selectedRow with all the new data
            const updatedRow = { ...selectedRow, ...updatedDetails } as any
            setSelectedRow(updatedRow)

            // Update formData explicitly with the new data
            const details = updatedDetails as any
            const status = details.status === 'approved' ? '활성' :
              details.status === 'pending' ? '검수중' :
                details.status === 'reject' ? '비활성' : '활성'
            setFormData({
              name: details.title || details.meetingName || '',
              description: stripHtmlForEditing(details.description),
              location: details.roadNameAddress || details.location || '',
              price: details.fee ? `${Number(details.fee).toLocaleString()}원` : '0원',
              status: status,
              map: details.roadNameAddress || details.location || 'Location Map'
            })
          }
        }

        // Update local meetings list state with the updated details
        setMeetings(prev => prev.map(m =>
          m.id === selectedRow.id
            ? {
              ...m,
              meetingName: updatedDetails?.meetingName || formData.name,
              title: (updatedDetails as any)?.title || updatedDetails?.meetingName || formData.name,
              description: updatedDetails?.description || formData.description,
              location: updatedDetails?.roadNameAddress || (updatedDetails as any)?.location || formData.location,
              roadNameAddress: updatedDetails?.roadNameAddress || (updatedDetails as any)?.location || formData.location,
              status: updatedDetails ? (updatedDetails as any).status : (updateData.status || (m as any).status)
            } as any
            : m
        ))

        setIsEditing(false)
        alert('모임 정보가 성공적으로 업데이트되었습니다.')
      } else {
        const errorMsg = result.error || '알 수 없는 오류'
        console.error('Update meeting failed:', errorMsg)
        alert(`모임 업데이트에 실패했습니다: ${errorMsg}`)
      }
    } catch (err) {
      console.error('Update meeting error', err)
      alert(`모임 업데이트 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData(getFormData())
    setIsEditing(false)
  }

  const handleTabs = (action: string, row: any) => {
    handleRowClick(row)
    if (action === 'View details') {
      setIsEditing(false)
    }
    if (action === 'Edit meeting') {
      setActiveTab('tab1')
      setIsEditing(prev => !prev)
    } else if (action === 'Manage participants') {
      setActiveTab('tab2')
      setIsEditing(false)
    }

    handleMenuClose()
  }

  const [select, setSelect] = useState('활성')

  type CategoryKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  const categoryMap: Record<CategoryKey, { label: string; className: string }> = {
    1: { label: "라이프 · 휴식 ", className: "text-blue-800 bg-blue-100" },
    2: { label: "문화 · 예술 ", className: "text-green-800 bg-green-100" },
    3: { label: "피크닉 · 아웃도어 ", className: "text-red-800 bg-red-100" },
    4: { label: "스포츠 · 액티비티 ", className: "text-orange-800 bg-orange-100" },
    5: { label: "맛 · 쿠킹 ", className: "text-purple-800 bg-purple-100" },
    6: { label: "음악 · 퍼포먼스 ", className: "text-yellow-800 bg-yellow-100" },
    7: { label: "책 · 인문 · 글 ", className: "text-teal-800 bg-teal-100" },
    8: { label: "공예 · 메이킹 -up", className: "text-indigo-800 bg-indigo-100" },
    9: { label: "커리어 · 성장 ", className: "text-rose-800 bg-rose-100" },
    10: { label: "소셜 · 토크", className: "text-gray-800 bg-gray-100" },
  };

  const getCategoryInfo = (categoryId: string | number | undefined) => {
    const catId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId
    return categoryMap[catId as CategoryKey] || { label: '기타', className: "text-gray-800 bg-gray-100" }
  }

  return (
    <AdminProtectedRoute>
      <Box className='min-h-screen'>
        <Box>
          <Box className='mb-6'>
            <Typography className='text-black mb-2'>
              <span className='text-[15x] font-medium'>@user_name </span>
              <span className='text-gray-500 font-light'>님 반갑습니다.</span>
            </Typography>
          </Box>

          <Box className='flex items-center mb-5'>
            <Box>
              <Typography variant='h5' className='text-[20px] text-black font-medium mb-1'>
                모임 관리
              </Typography>
              <Typography className='text-gray-500 text-[14px]'>모임 및 커뮤니티 활동을 관리합니다</Typography>
            </Box>
          </Box>

          <Box className='mb-5 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4'>
            <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className='flex items-center justify-between mb-5'>
                  <Typography className='text-gray-900 text-[12px]'>전체 모임</Typography>
                  <PeopleAltOutlinedIcon style={{ fontSize: 18, color: 'gray' }} />
                </Box>
                <Typography className='text-xl font-medium text-gray-900'>{totalMeetings}개</Typography>
                <Typography className='text-gray-500 text-[12px]'>등록된 모든 모임 및 활동</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className='flex items-center justify-between mb-5'>
                  <Typography className='text-gray-900 text-[12px]'>활성 모임</Typography>
                  <TaskAltIcon style={{ fontSize: 18, color: 'gray' }} />
                </Box>
                <Typography className='text-xl font-medium text-gray-900'>{activeMeetings}개</Typography>
                <Typography className='text-gray-500 text-[12px]'>+12% 이번 달</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className='flex items-center justify-between mb-5'>
                  <Typography className='text-gray-900 text-[12px]'>검수중 모임</Typography>
                  <AccessTimeIcon style={{ fontSize: 18, color: 'gray' }} />
                </Box>
                <Typography className='text-xl font-medium text-gray-900'>{pendingMeetings}개</Typography>
                <Typography className='text-gray-500 text-[12px]'>검수 대기중</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className='flex items-center justify-between mb-5'>
                  <Typography className='text-gray-900 text-[12px]'>총 결제건수</Typography>
                  <AttachMoneyIcon style={{ fontSize: 18, color: 'gray' }} />
                </Box>
                <Typography className='text-xl font-medium text-gray-900'>234건</Typography>
                <Typography className='text-gray-500 text-[12px]'>+8% 이번 달</Typography>
              </CardContent>
            </Card>
          </Box>

          <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
            <CardContent>
              <Box className='mb-5'>
                <Typography className='text-black'>모임 리스트</Typography>
                <Typography>모든 모임의 상세 정보를 확인하고 관리하세요</Typography>
              </Box>

              <Box className='flex items-center justify-between gap-2'>
                <Box
                  sx={{
                    width: '70%',
                    '& .MuiOutlinedInput-root': {
                      height: '32px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#f3f3f5',
                      border: 'none',
                      '&.Mui-focused': { border: '4px solid #d1d5db' },
                      '&:hover fieldset': { border: 'none' },
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                    }
                  }}
                >
                  <TextField
                    placeholder='모임명 또는 호스트명으로 검색...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    size='small'
                    sx={{ '&:hover': { border: 'none' } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <SearchIcon style={{ fontSize: 18, color: 'gray' }} />
                        </InputAdornment>
                      )
                    }}
                    fullWidth
                  />
                </Box>

                <Box>
                  <FormControl>
                    <Select
                      value={selectedValue}
                      onChange={e => setSelectedValue(e.target.value as any)}
                      className='bg-gray-100 border-none'
                      sx={{
                        borderRadius: '8px',
                        fontSize: '11px',
                        height: '32px',
                        margin: '2px',
                        width: '180px',
                        border: 'none',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' }
                      }}
                      renderValue={value => {
                        switch (value) {
                          case '모든 카테고리':
                            return '모든 카테고리'
                          case '라이프 · 휴식':
                            return '라이프 · 휴식'
                          case '문화 · 예술':
                            return '문화 · 예술'
                          case '피크닉 · 아웃도어':
                            return '피크닉 · 아웃도어'
                          case '스포츠 · 액티비티':
                            return '스포츠 · 액티비티'
                          case '맛 · 쿠킹':
                            return '맛 · 쿠킹'
                          case '음악 · 퍼포먼스':
                            return '음악 · 퍼포먼스'
                          case '책 · 인문 · 글':
                            return '책 · 인문 · 글'
                          case '공예 · 메이킹':
                            return '공예 · 메이킹'
                          case '커리어 · 성장':
                            return '커리어 · 성장'
                          case '소셜 · 토크':
                            return '소셜 · 토크'
                          default:
                            return value
                        }
                      }}
                    >
                      {[
                        { value: '모든 카테고리', label: '모든 카테고리' },
                        { value: '라이프 · 휴식', label: '라이프 · 휴식' },
                        { value: '문화 · 예술', label: '문화 · 예술' },
                        { value: '피크닉 · 아웃도어', label: '피크닉 · 아웃도어' },
                        { value: '스포츠 · 액티비티', label: '스포츠 · 액티비티' },
                        { value: '맛 · 쿠킹', label: '맛 · 쿠킹' },
                        { value: '음악 · 퍼포먼스', label: '음악 · 퍼포먼스' },
                        { value: '책 · 인문 · 글', label: '책 · 인문 · 글' },
                        { value: '공예 · 메이킹', label: '공예 · 메이킹' },
                        { value: '커리어 · 성장', label: '커리어 · 성장' },
                        { value: '소셜 · 토크', label: '소셜 · 토크' }
                      ].map(option => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                          sx={{
                            fontSize: '11px',
                            borderRadius: '5px',
                            '&.Mui-selected': {
                              backgroundColor: '#E2E8F0 !important',
                              borderRadius: '5px',
                              color: '#000000',
                              marginLeft: '2px',
                              marginRight: '2px'
                            },
                            '&.Mui-selected:hover': {
                              backgroundColor: '#E2E8F0 !important',
                              color: '#000000'
                            },
                            '&:hover': { backgroundColor: '#E2E8F0' }
                          }}
                        >
                          {option.label}
                          {selectedValue === option.value && (
                            <span style={{ marginLeft: 'auto', color: 'black' }}>✓</span>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <FormControl>
                    <Select
                      value={selectedValue1}
                      onChange={e => setSelectedValue1(e.target.value as any)}
                      className='bg-gray-100 border-none'
                      sx={{
                        borderRadius: '8px',
                        fontSize: '11px',
                        height: '32px',
                        margin: '2px',
                        width: '140px',
                        border: 'none',
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' }
                      }}
                      renderValue={value => {
                        switch (value) {
                          case '모든 상태':
                            return '모든 상태'
                          case '활동적인':
                            return '활동적인'
                          case '검토중':
                            return '검토중'
                          case '비활성':
                            return '비활성'
                          default:
                            return value
                        }
                      }}
                    >
                      {[
                        { value: '모든 상태', label: '모든 상태' },
                        { value: '활동적인', label: '활동적인' },
                        { value: '검토중', label: '검토중' },
                        { value: '비활성', label: '비활성' }
                      ].map(option => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                          sx={{
                            fontSize: '11px',
                            borderRadius: '5px',
                            marginLeft: '2px',
                            marginRight: '2px',
                            '&.Mui-selected': {
                              backgroundColor: '#E2E8F0 !important',
                              borderRadius: '5px',
                              color: '#000000'
                            },
                            '&.Mui-selected:hover': {
                              backgroundColor: '#E2E8F0 !important',
                              color: '#000000'
                            },
                            '&:hover': { backgroundColor: '#E2E8F0' }
                          }}
                        >
                          {option.label}
                          {selectedValue1 === option.value && (
                            <span style={{ marginLeft: 'auto', color: 'black' }}>✓</span>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </CardContent>

            <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 'none' }}>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader className='p-5'>
                  <TableHead>
                    <TableRow>
                      {columns.map(column => (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          sx={{
                            minWidth: column.minWidth,
                            backgroundColor: '#f9fafb',
                            fontWeight: 'bold',
                            borderBottom: '2px solid #E5E7EB'
                            // '&:first-of-type': { pl: 2 },
                            // '&:last-of-type': { pr: 2 }
                          }}
                        >
                          {column.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={8} align='center'>로딩 중...</TableCell>
                      </TableRow>
                    )}
                    {!loading && meetings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align='center'>데이터가 없습니다.</TableCell>
                      </TableRow>
                    )}
                    {!loading && filteredMeetings.length === 0 && meetings.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align='center'>검색 결과가 없습니다.</TableCell>
                      </TableRow>
                    )}
                    {!loading && filteredMeetings.map((meeting, idx) => {
                      // Find original index in meetings array for menu actions
                      const originalIdx = meetings.findIndex(m => m.id === meeting.id)
                      return (
                        <TableRow hover key={meeting.id} onClick={() => handleRowClick(meeting)}>
                          {columns.map(column => {
                            if (column.id === 'col8') {
                              return (
                                <TableCell key={column.id} align='center' sx={{ borderBottom: 'none' }}>
                                  <IconButton
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleMenuClick(e, originalIdx >= 0 ? originalIdx : idx)
                                    }}
                                    size='small'
                                  >
                                    <MoreHorizIcon />
                                  </IconButton>
                                </TableCell>
                              )
                            }

                            // Map columns to meeting fields
                            if (column.id === 'col1') {
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  {(meeting as any).title || meeting.meetingName || '이름 없음'}
                                </TableCell>
                              )
                            }
                            if (column.id === 'col2') {
                              const categoryInfo = getCategoryInfo(meeting.category)
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  <span
                                    className={`${categoryInfo.className} py-0.5 p-2 rounded text-[11px]`}
                                  >
                                    {categoryInfo.label}
                                  </span>
                                </TableCell>
                              )
                            }
                            if (column.id === 'col3') {
                              // Payment related — keep static placeholder as requested
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  45건
                                </TableCell>
                              )
                            }
                            if (column.id === 'col4') {
                              // Get participant count from currentParticipants (now included in API response)
                              // Fallback to calculating from participants array if available
                              let participantCount = 0
                              if (typeof meeting.currentParticipants === 'number') {
                                participantCount = meeting.currentParticipants
                              } else {
                                const participants = (meeting as any).participants
                                if (participants && Array.isArray(participants)) {
                                  const confirmedCount = participants.filter((p: any) => p.paymentStatus === 'confirmed').length
                                  participantCount = confirmedCount > 0 ? confirmedCount : participants.length
                                } else if ((meeting as any)._count?.participants) {
                                  participantCount = (meeting as any)._count.participants
                                }
                              }
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  {participantCount}명
                                </TableCell>
                              )
                            }
                            if (column.id === 'col5') {
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  {meeting.user?.name ?? (meeting.user as any)?.nickname ?? '익명'}
                                </TableCell>
                              )
                            }
                            if (column.id === 'col6') {
                              // Show meeting time
                              const meetingTime = meeting.meetingTime || (meeting as any).date
                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  {meetingTime ? new Date(meetingTime).toLocaleString('ko-KR') : '정보 없음'}
                                </TableCell>
                              )
                            }
                            if (column.id === 'col7') {
                              const status = (meeting as any).status ?? 'approved'
                              // Map status to Korean display text
                              let statusText = '활성'
                              let statusClass = 'text-green-800 bg-green-100'

                              if (status === 'pending') {
                                statusText = '검수중'
                                statusClass = 'text-yellow-800 bg-yellow-100'
                              } else if (status === 'reject' || status === 'completed') {
                                statusText = '비활성'
                                statusClass = 'text-red-800 bg-red-100'
                              } else if (status === 'approved' || status === 'active') {
                                statusText = '활성'
                                statusClass = 'text-green-800 bg-green-100'
                              }

                              return (
                                <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                  <span className={`${statusClass} py-0.5 px-2 rounded text-[11px]`}>
                                    {statusText}
                                  </span>
                                </TableCell>
                              )
                            }

                            return (
                              <TableCell key={column.id} align={column.align} sx={{ borderBottom: 'none' }}>
                                -
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Action Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  minWidth: 130,
                  zIndex: 50
                }
              }}
            >
              {[
                {
                  icon: <VisibilityIcon fontSize='small' className='text-[14px]' />,
                  label: '세부정보 보기',
                  action: 'View details'
                },
                {
                  icon: <EditIcon fontSize='small' className='text-[14px]' />,
                  label: '회의 편집',
                  action: 'Edit meeting'
                },
                {
                  icon: <GroupIcon fontSize='small' className='text-[14px]' />,
                  label: '참가자 관리',
                  action: 'Manage participants'
                }
                // {
                //   icon: <DeleteIcon fontSize='small' className='text-[14px] ' />,
                //   label: '회의 삭제',
                //   action: 'Delete meeting',
                //   isError: true
                // }
              ].map((item, idx) => (
                <MenuItem
                  key={item.label}
                  onClick={() => {
                    handleTabs(item.action, meetings[menuRow as number])
                  }}
                  sx={{
                    minHeight: 28,
                    borderRadius: 1,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: '11px',
                    // color: item.isError ? 'text-red' : 'inherit',
                    '&:hover': { backgroundColor: '#E2E8F0' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 20 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '12px'
                      // color: item.isError ? 'text-red' : 'inherit'
                    }}
                  />
                </MenuItem>
              ))}
              <MenuItem
                key='회의 삭제'
                onClick={() => {
                  if (menuRow !== null && meetings[menuRow]) {
                    handleDeleteMeeting(meetings[menuRow].id)
                  } else {
                    handleMenuClose()
                  }
                }}
                sx={{
                  minHeight: 28,
                  borderRadius: 1,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '12px',
                  '&:hover': { backgroundColor: '#E2E8F0' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DeleteIcon fontSize='small' className='text-[14px]' />

                  <Typography
                    fontSize='12px'
                    sx={{
                      color: 'red',
                      '&:hover': { color: '#111827' }
                    }}
                  >
                    회의 삭제
                  </Typography>
                </Box>
              </MenuItem>
            </Menu>
          </Card>

          {/* Modal */}

          <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth='xs' fullWidth>
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ position: 'relative', width: '100%', height: '200px' }}>
                {(() => {
                  // Get image from various possible sources
                  const imageUrl = selectedMeetingDetails?.meetingBackground ||
                    (selectedRow as any)?.image ||
                    selectedRow?.meetingBackground ||
                    null

                  // Normalize image URL
                  const normalizeImageUrl = (url: string | null | undefined): string | null => {
                    if (!url) return null
                    const value = url.trim()
                    if (!value) return null

                    // If already absolute URL, return as-is
                    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
                      return value
                    }

                    // If starts with //, add https:
                    if (value.startsWith('//')) {
                      return `https:${value}`
                    }

                    // For relative paths, add base URL if available
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                    const normalized = value.startsWith('/') ? value : `/${value}`
                    return baseUrl ? `${baseUrl}${normalized}` : normalized
                  }

                  const normalizedImageUrl = normalizeImageUrl(imageUrl)

                  if (!normalizedImageUrl || imageError) {
                    return <Box className="w-full h-full bg-gray-200" sx={{ objectFit: 'cover', borderRadius: '4px' }} />
                  }

                  return (
                    <Image
                      src={normalizedImageUrl}
                      alt={(selectedRow as any)?.title || selectedRow?.meetingName || 'Meeting'}
                      fill
                      style={{ objectFit: 'cover', borderRadius: '4px' }}
                      unoptimized
                      onError={() => setImageError(true)}
                    />
                  )
                })()}

                {/* //   src={selectedMeetingDetails?.meetingBackground || selectedRow?.meetingBackground || yogaImage}
                //   alt={(selectedRow as any)?.title || selectedRow?.meetingName || 'Meeting'}
                //   fill
                //   style={{ objectFit: 'cover', borderRadius: '4px' }}
                // /> */}
                <Box
                  className='flex items-center gap-2'
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'white',
                    cursor: 'pointer',
                    padding: '2px',
                    zIndex: 10
                  }}
                >
                  <Button
                    className='flex items-center justify-evenly bg-white px-2 py-1 m-0 text-black'
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='lucide lucide-square-pen w-4 h-4 mr-1'
                      aria-hidden='true'
                    >
                      <path d='M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
                      <path d='M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z'></path>
                    </svg>
                    <span className='text-[13px] font-medium'> {isEditing ? '취소' : '편집'}</span>
                  </Button>
                  <CloseRoundedIcon onClick={() => handleModalClose()} />
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    paddingLeft: 4,
                    paddingBottom: 4,
                    color: 'white',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0))'
                  }}
                >
                  <Typography className='text-[22px] font-light text-white pb-1'>
                    {(selectedRow as any)?.title || selectedRow?.meetingName || '모임'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    <Box sx={{ gap: 1, display: 'flex', flexDirection: 'row', fontSize: '14px' }}>
                      <PersonOutlineIcon className='text-[17px]' />
                      <Typography className='text-white font-light text-[12px]'>
                        {selectedRow?.user?.name ?? selectedRow?.user?.nickname ?? selectedMeetingDetails?.user?.nickname ?? '익명'}
                      </Typography>
                    </Box>

                    <Box sx={{ gap: 1, display: 'flex', flexDirection: 'row', fontSize: '14px' }}>
                      <LocationOnOutlinedIcon className='text-[17px]' />
                      <Typography className='text-white font-light text-[12px]'>
                        {selectedRow?.location?.split(' ').slice(0, 2).join(' ') || selectedMeetingDetails?.roadNameAddress?.split(' ').slice(0, 2).join(' ') || '위치 정보 없음'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* for slider tabs */}
              <Box className='flex items-center justify-center mt-3 '>
                <Box
                  className='flex items-center justify-evenly py-0.5 px-0.5 rounded-3xl bg-gray-200 gap-5 '
                  sx={{ width: 400 }}
                >
                  <Box
                    className={`px-4 py-1 rounded-3xl cursor-pointer transition-colors ${activeTab === 'tab1'
                      ? 'border-gray-400 bg-white text-gray-800'
                      : 'border-transparent bg-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    onClick={() => setActiveTab('tab1')}
                    sx={{
                      fontSize: '12px',
                      fontWeight: activeTab === 'tab1' ? '500' : '400'
                    }}
                  >
                    상세정보
                  </Box>

                  <Box
                    className={`px-4 py-1 rounded-3xl cursor-pointer transition-color ${activeTab === 'tab2'
                      ? 'border-gray-400 bg-white text-gray-800'
                      : 'border-transparent bg-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    onClick={() => setActiveTab('tab2')}
                    sx={{
                      fontSize: '12px',
                      fontWeight: activeTab === 'tab2' ? '500' : '400'
                    }}
                  >
                    참여자
                  </Box>

                  <Box
                    className={`px-4 py-1 rounded-3xl cursor-pointer transition-color ${activeTab === 'tab3'
                      ? 'border-gray-400 bg-white text-gray-800'
                      : 'border-transparent bg-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    onClick={() => setActiveTab('tab3')}
                    sx={{
                      fontSize: '12px',
                      fontWeight: activeTab === 'tab3' ? '500' : '400'
                    }}
                  >
                    분석
                  </Box>

                  <Box
                    className={`px-4 py-1 rounded-3xl cursor-pointer transition-color ${activeTab === 'tab4'
                      ? 'border-gray-400 bg-white text-gray-800'
                      : 'border-transparent bg-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    onClick={() => setActiveTab('tab4')}
                    sx={{
                      fontSize: '12px',
                      fontWeight: activeTab === 'tab4' ? '500' : '400'
                    }}
                  >
                    리뷰
                  </Box>

                  <Box
                    className={`px-4 py-1 rounded-3xl cursor-pointer transition-color ${activeTab === 'tab5'
                      ? 'border-gray-400 bg-white text-gray-800'
                      : 'border-transparent bg-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    onClick={() => setActiveTab('tab5')}
                    sx={{
                      fontSize: '12px',
                      fontWeight: activeTab === 'tab5' ? '500' : '400'
                    }}
                  >
                    결제
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ width: '100%', height: '0px', bgColor: 'gray.700', mt: '0' }} />

              {activeTab === 'tab1' && (
                <Box className='pl-3 grid md:grid-cols-2 overflow-auto pt-2 pb-3'>
                  <Box>
                    <Box className='p-2'>
                      <Typography className='text-gray-900 text-sm'>모임명</Typography>
                      {isEditing ? (
                        <Box
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              backgroundColor: '#f3f3f5',
                              border: 'none',
                              '&.Mui-focused': { border: '4px solid #d1d5db' },
                              '&:hover fieldset': { border: 'none' },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }
                          }}
                        >
                          <TextField
                            size='small'
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value)}
                            className='border border-gray-200 rounded'
                            fullWidth
                          />
                        </Box>
                      ) : (
                        <Typography className='text-[12px]'>{formData.name}</Typography>
                      )}
                    </Box>

                    <Box className='p-2'>
                      <Typography className='text-gray-900 text-sm'>설명</Typography>
                      {isEditing ? (
                        <Box
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '12px',
                              borderRadius: '8px',
                              backgroundColor: '#f3f3f5',
                              border: '1px solid #e5e7eb',
                              '&.Mui-focused': {
                                border: '2px solid #6366f1',
                                backgroundColor: '#ffffff'
                              },
                              '&:hover': {
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff'
                              },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            },
                            '& .MuiInputBase-input': {
                              padding: '8px 12px',
                              minHeight: '100px',
                              lineHeight: '1.5'
                            }
                          }}
                        >
                          <TextField
                            size='small'
                            multiline
                            rows={6}
                            minRows={6}
                            maxRows={12}
                            value={formData.description}
                            onChange={e => handleChange('description', e.target.value)}
                            fullWidth
                            placeholder='모임 설명을 입력하세요...'
                            sx={{
                              '& .MuiInputBase-input': {
                                overflow: 'auto',
                                resize: 'vertical'
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          className='text-[12px]'
                          sx={{
                            '& [data-section]': {
                              marginBottom: '16px',
                              '& > div': {
                                marginBottom: '8px'
                              }
                            },
                            '& [contenteditable="true"], & [contenteditable="false"]': {
                              pointerEvents: 'none',
                              userSelect: 'none'
                            },
                            '& img': {
                              maxWidth: '100%',
                              height: 'auto',
                              borderRadius: '4px'
                            },
                            '& div[style*="position: relative"]': {
                              position: 'relative !important'
                            },
                            '& div[style*="position: absolute"]': {
                              position: 'absolute !important'
                            },
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                          dangerouslySetInnerHTML={{ __html: formData.description || '' }}
                        />
                      )}
                    </Box>

                    <Box className='p-2'>
                      <Typography className='text-gray-900 text-sm'>위치</Typography>
                      {isEditing ? (
                        <Box
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              backgroundColor: '#f3f3f5',
                              border: 'none',
                              '&.Mui-focused': { border: '4px solid #d1d5db' },
                              '&:hover fieldset': { border: 'none' },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }
                          }}
                        >
                          <TextField
                            size='small'
                            value={formData.location}
                            onChange={e => handleChange('location', e.target.value)}
                            fullWidth
                          />
                        </Box>
                      ) : (
                        <Typography className='text-[12px]'>{formData.location}</Typography>
                      )}
                    </Box>

                    <Box className='p-2'>
                      <Typography className='text-gray-900 text-sm'>가격</Typography>
                      {isEditing ? (
                        <Box
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              backgroundColor: '#f3f3f5',
                              border: 'none',
                              '&.Mui-focused': { border: '4px solid #d1d5db' },
                              '&:hover fieldset': { border: 'none' },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }
                          }}
                        >
                          <TextField
                            size='small'
                            value={formData.price}
                            onChange={e => handleChange('price', e.target.value)}
                            fullWidth
                          />
                        </Box>
                      ) : (
                        <Typography className='text-[12px]'>{formData.price}</Typography>
                      )}
                    </Box>

                    <Box className='p-2'>
                      <Typography className='text-gray-900 text-sm'>상태</Typography>
                      {isEditing ? (
                        <Box
                          className=' w-full'
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              backgroundColor: '#f3f3f5',
                              border: 'none',
                              '&.Mui-focused': { border: '4px solid #d1d5db' },
                              '&:hover fieldset': { border: 'none' },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }
                          }}
                        >
                          <FormControl fullWidth>
                            <Select
                              value={formData.status}
                              onChange={e => handleChange('status', e.target.value as string)}
                              size='small'
                              fullWidth
                              renderValue={value => {
                                switch (value) {
                                  case '활성':
                                    return '활성'
                                  case '검수중':
                                    return '검수중'
                                  case '비활성':
                                    return '비활성'

                                  default:
                                    return value
                                }
                              }}
                            >
                              {[
                                { value: '활성', label: '활성' },
                                { value: '검수중', label: '검수중' },
                                { value: '비활성', label: '비활성' }
                              ].map(option => (
                                <MenuItem
                                  key={option.value}
                                  value={option.value}
                                  sx={{
                                    fontSize: '11px',
                                    borderRadius: '5px',
                                    '&.Mui-selected': {
                                      backgroundColor: '#E2E8F0 !important',
                                      borderRadius: '5px',
                                      color: '#000000',
                                      marginLeft: '2px',
                                      marginRight: '2px'
                                    },
                                    '&.Mui-selected:hover': {
                                      backgroundColor: '#E2E8F0 !important',
                                      color: '#000000'
                                    },
                                    '&:hover': { backgroundColor: '#E2E8F0' }
                                  }}
                                >
                                  {option.label}
                                  {formData.status === option.value && (
                                    <span style={{ marginLeft: 'auto', color: 'black' }}>✓</span>
                                  )}
                                </MenuItem>
                              ))}
                              {/* <MenuItem
                                value='활성'
                                sx={{
                                  fontSize: '11px',
                                  borderRadius: '5px',
                                  '&.Mui-selected': {
                                    backgroundColor: 'white',
                                    borderRadius: '5px',
                                    color: '#000000',
                                    marginLeft: '2px',
                                    marginRight: '2px'
                                  },
                                  '&.Mui-selected:hover': {
                                    backgroundColor: '#E2E8F0 !important',
                                    color: '#000000'
                                  },
                                  '&:hover': { backgroundColor: '#E2E8F0' }
                                }}
                              >
                                활성
                                {formData.status === '활성' && (
                                  <span style={{ marginLeft: 'auto', color: 'black' }}>✓</span>
                                )}
                              </MenuItem>

                              <MenuItem
                                value='비활성'
                                sx={{
                                  fontSize: '11px',
                                  borderRadius: '5px',
                                  '&.Mui-selected': {
                                    backgroundColor: '#E2E8F0 !important',
                                    borderRadius: '5px',
                                    color: '#000000',
                                    marginLeft: '2px',
                                    marginRight: '2px'
                                  },
                                  '&.Mui-selected:hover': {
                                    backgroundColor: '#E2E8F0 !important',
                                    color: '#000000'
                                  },
                                  '&:hover': { backgroundColor: '#E2E8F0' }
                                }}
                              >
                                비활성
                                {formData.status === '비활성' && (
                                  <span style={{ marginLeft: 'auto', color: 'black' }}>✓</span>
                                )}
                              </MenuItem> */}
                            </Select>
                          </FormControl>
                        </Box>
                      ) : (
                        (() => {
                          const statusDisplay = formData.status
                          const statusClass = statusDisplay === '활성' ? 'text-green-800 bg-green-100' :
                            statusDisplay === '검수중' ? 'text-yellow-800 bg-yellow-100' :
                              'text-red-800 bg-red-100'
                          return (
                            <Box className={`text-[15px] ${statusClass} py-0.5 px-2 rounded text-center inline-block`}>
                              <Typography className={`${statusClass.split(' ')[0]} text-[10px]`}>{statusDisplay}</Typography>
                            </Box>
                          )
                        })()
                      )}
                    </Box>
                  </Box>

                  {/* {isEditing && (
                    <Box className='flex justify-start gap-2 p-3'>
                      <Button variant='contained' onClick={handleSave} className='bg-black text-white'>
                        Save
                      </Button>
                      <Button
                        variant='outlined'
                        onClick={handleCancel}
                        className='border border-gray-200 text-gray-900'
                      >
                        Cancel
                      </Button>
                    </Box>
                  )} */}

                  <Box className='p-2'>
                    <Typography className='text-gray-900 text-sm'>위치 지도</Typography>
                    <Typography className='text-[12px]'>{formData.map}</Typography>
                  </Box>

                  {isEditing && (
                    <Box className='flex justify-start gap-2 p-3'>
                      <Button variant='contained' onClick={handleSave} className='bg-black text-white'>
                        Save
                      </Button>
                      <Button
                        variant='outlined'
                        onClick={handleCancel}
                        className='border border-gray-200 text-gray-900'
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === 'tab2' && (
                <Box className='p-4 flex flex-col gap-3'>
                  <Typography className='text-gray-900'>
                    참여자 ({selectedMeetingParticipants.length || selectedRow?.currentParticipants || 0}명)
                  </Typography>
                  {loadingDetails ? (
                    <Typography className='text-gray-500 text-center py-4'>로딩 중...</Typography>
                  ) : selectedMeetingParticipants.length === 0 ? (
                    <Typography className='text-gray-500 text-center py-4'>참여자가 없습니다.</Typography>
                  ) : (
                    selectedMeetingParticipants.map((participant: any) => {
                      const user = participant.user || {}
                      const nickname = user.nickname || '익명'
                      const badge = user.activeCommunityBadge || (user as any).activeCommunityBadge
                      const badgeName = badge?.name || '일반'
                      const badgeImage = badge?.imageUrl || badge?.image
                      const badgeClass = badgeName === '씨앗' ? 'text-green-800 bg-green-100' :
                        badgeName === '모꼬지' ? 'text-blue-800 bg-blue-100' :
                          'text-gray-800 bg-gray-100'
                      // Check if participant is suspended
                      const isSuspended = participant.paymentStatus === 'suspended'
                      const status = isSuspended ? '정지됨' : '활성'
                      const statusClass = isSuspended ? 'text-red-800 bg-red-100' : 'text-green-800 bg-green-100'

                      return (
                        <Card key={participant.id || user.id} className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
                          <CardContent className='p-0'>
                            <Box className='flex items-center justify-between' sx={{ padding: '16px' }}>
                              <Box className='flex items-center gap-3'>
                                <Box
                                  className='flex items-center justify-center bg-gray-300'
                                  sx={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden' }}
                                >
                                  {user.profileImage ? (
                                    <Image src={user.profileImage} alt={nickname} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <PersonOutlineIcon />
                                  )}
                                </Box>
                                <Box className='content '>
                                  <Box className='flex items-center justify-start gap-2 flex-wrap'>
                                    <Typography className='text-gray-900 text-[14px] font-medium'>{nickname}</Typography>
                                    <Box className={`${badgeClass} py-1 px-1 rounded-full flex items-center justify-center`} sx={{ width: 24, height: 24 }}>
                                      {badgeImage ? (
                                        <Image
                                          src={badgeImage}
                                          alt={badgeName}
                                          width={20}
                                          height={20}
                                          style={{ borderRadius: '50%' }}
                                        />
                                      ) : (
                                        <>
                                          {badgeName === '씨앗' && <TaskAltOutlinedIcon sx={{ fontSize: '16px', color: 'inherit' }} />}
                                          {badgeName === '모꼬지' && <PeopleAltOutlinedIcon sx={{ fontSize: '16px', color: 'inherit' }} />}
                                          {badgeName === '일반' && <PersonOutlineIcon sx={{ fontSize: '16px', color: 'inherit' }} />}
                                        </>
                                      )}
                                    </Box>
                                    <Box className={`text-[12px] ${statusClass} py-0.5 px-2 rounded-full text-center`}>
                                      <Typography className={`${statusClass.split(' ')[0]} text-[11px]`}>{status}</Typography>
                                    </Box>
                                  </Box>

                                  <Box className='flex items-center justify-evenly gap-3'>
                                    <Typography className='text-[12px]'>
                                      마지막 활동: {participant.joinedOn ? new Date(participant.joinedOn).toLocaleDateString('ko-KR') : '정보 없음'}
                                    </Typography>
                                    <Typography className='text-[12px]'>총 결제: 75,000원</Typography>
                                  </Box>
                                </Box>
                              </Box>
                              <Box className='action-btn' textAlign='right'>
                                <IconButton
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleTab2Click(e, participant)
                                  }}
                                  size='small'
                                >
                                  <MoreHorizIcon />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}

                  <Menu
                    anchorEl={anchor}
                    open={opentab2}
                    onClose={handleClose}
                    PaperProps={{
                      sx: {
                        minWidth: 130,
                        zIndex: 100
                      }
                    }}
                  >
                    <MenuItem
                      key={selectedParticipant?.paymentStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}
                      onClick={handleSuspendParticipant}
                      sx={{
                        minHeight: 28,
                        borderRadius: 1,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        '&:hover': { backgroundColor: '#E2E8F0' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {selectedParticipant?.paymentStatus === 'suspended' ? (
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='lucide lucide-user-check mr-2 h-4 w-4 text-gray-500'
                            aria-hidden='true'
                          >
                            <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'></path>
                            <circle cx='9' cy='7' r='4'></circle>
                            <polyline points='16 11 18 13 22 9'></polyline>
                          </svg>
                        ) : (
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='lucide lucide-user-x mr-2 h-4 w-4 text-gray-500'
                            aria-hidden='true'
                          >
                            <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'></path>
                            <circle cx='9' cy='7' r='4'></circle>
                            <line x1='17' x2='22' y1='8' y2='13'></line>
                            <line x1='22' x2='17' y1='8' y2='13'></line>
                          </svg>
                        )}

                        <Typography
                          fontSize='12px'
                          sx={{
                            color: selectedParticipant?.paymentStatus === 'suspended' ? '#10b981' : '#ea580c',
                            '&:hover': { color: '#111827' }
                          }}
                        >
                          {selectedParticipant?.paymentStatus === 'suspended' ? '정지 해제' : '정지'}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem
                      key='ban'
                      onClick={handleBanParticipant}
                      sx={{
                        minHeight: 28,
                        borderRadius: 1,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        '&:hover': { backgroundColor: '#E2E8F0' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <NotInterestedIcon fontSize='small' className='text-[14px] text-gray-500' />

                        <Typography
                          fontSize='12px'
                          sx={{
                            color: 'red',
                            '&:hover': { color: '#111827' }
                          }}
                        >
                          차단
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Menu>
                </Box>
              )}

              {activeTab === 'tab3' && (
                <Box className='p-3 mt-2'>
                  {loadingDetails ? (
                    <Typography className='text-gray-500 text-center py-4'>로딩 중...</Typography>
                  ) : (
                    <>
                      <Box className='grid md:grid-cols-2 lg:grid-cols-4 mb-6 gap-3'>
                        <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
                          <CardContent>
                            <Typography className='text-[11px] text-black'>총 매출</Typography>
                            <Typography className='mt-6 text-[16px] text-gray-900'>1,125,000원</Typography>
                          </CardContent>
                        </Card>
                        <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
                          <CardContent className='border border-none' sx={{ boxShadow: 'none' }}>
                            <Typography className='text-[11px] text-black'>평균 평점</Typography>
                            <Box className='flex items-center mt-6 gap-1'>
                              <StarRoundedIcon className='text-yellow-500' />
                              <Typography className='text-[16px] text-gray-900'>
                                {selectedMeetingReviews.length > 0
                                  ? (selectedMeetingReviews.reduce((sum, r) => sum + r.rating, 0) / selectedMeetingReviews.length).toFixed(1)
                                  : '0.0'}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                        <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
                          <CardContent className='border border-none' sx={{ boxShadow: 'none' }}>
                            <Typography className='text-[11px] text-black'>참여자 수</Typography>
                            <Typography className='mt-6 text-[16px] text-gray-900'>
                              {selectedMeetingParticipants.length || selectedRow?.currentParticipants || 0}명
                            </Typography>
                          </CardContent>
                        </Card>
                        <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
                          <CardContent className='border border-none' sx={{ boxShadow: 'none' }}>
                            <Typography className='text-[11px] text-black'>리뷰 수</Typography>
                            <Typography className='mt-6 text-[16px] text-gray-900'>{selectedMeetingReviews.length}개</Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <Card className='border border-gray-200 rounded-2xl' sx={{ boxShadow: 'none' }}>
                        <CardContent className='border border-none'>
                          <Typography className='text-gray-900 mb-5'>모임 정보</Typography>
                          <Box className='flex items-center justify-between'>
                            <Typography className='text-gray-900 text-[14px]'>모임명</Typography>
                            <Typography className='text-gray-900 text-[14px]'>{(selectedRow as any)?.title || selectedRow?.meetingName || '정보 없음'}</Typography>
                          </Box>
                          <Box className='flex items-center justify-between'>
                            <Typography className='text-gray-900 text-[14px]'>모임 일시</Typography>
                            <Typography className='text-gray-900 text-[14px]'>
                              {selectedRow?.meetingTime ? new Date(selectedRow.meetingTime).toLocaleDateString('ko-KR') : '정보 없음'}
                            </Typography>
                          </Box>
                          <Box className='flex items-center justify-between'>
                            <Typography className='text-gray-900 text-[14px]'>위치</Typography>
                            <Typography className='text-gray-900 text-[14px]'>
                              {selectedRow?.location || selectedMeetingDetails?.roadNameAddress || '정보 없음'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </Box>
              )}

              {activeTab === 'tab4' && (
                <Box className='p-4 flex flex-col gap-3'>
                  {loadingDetails ? (
                    <Typography className='text-gray-500 text-center py-4'>로딩 중...</Typography>
                  ) : selectedMeetingReviews.length === 0 ? (
                    <Typography className='text-gray-500 text-center py-4'>리뷰가 없습니다.</Typography>
                  ) : (
                    selectedMeetingReviews.map((review: MeetingReview) => {
                      const user = review.user || {}
                      const nickname = user.nickname || '익명'
                      const renderStars = (rating: number) => {
                        return Array.from({ length: 5 }, (_, i) => (
                          <StarRoundedIcon
                            key={i}
                            className={i < rating ? 'text-yellow-400' : 'text-gray-300'}
                            fontSize='small'
                            sx={{ mr: -0.8 }}
                          />
                        ))
                      }

                      return (
                        <Card key={review.id} className='m-2 border border-gray-200' sx={{ boxShadow: 'none' }}>
                          <CardContent className='border border-none'>
                            <Box className='flex items-center gap-1 mb-2'>
                              <Typography className='text-gray-900'>{nickname}</Typography>
                              <Box sx={{ display: 'flex', gap: 0, mt: 1 }}>
                                {renderStars(review.rating)}
                              </Box>
                              <Box className='font-medium border border-gray-200 text-black text-[11px] px-1.5 rounded'>
                                {review.title || '리뷰'}
                              </Box>
                            </Box>
                            <Typography className='text-gray-600'>{review.content}</Typography>
                            <Typography className='mt-2 text-gray-400 text-[13px]'>
                              {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                            </Typography>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </Box>
              )}

              {activeTab === 'tab5' && (
                <Box className='p-4 flex flex-col gap-3'>
                  {loadingDetails ? (
                    <Typography className='text-gray-500 text-center py-4'>로딩 중...</Typography>
                  ) : selectedMeetingParticipants.length === 0 ? (
                    <Typography className='text-gray-500 text-center py-4'>결제 정보가 없습니다.</Typography>
                  ) : (
                    selectedMeetingParticipants
                      .filter((participant: any) => participant.paymentId || participant.paymentStatus === 'confirmed')
                      .map((participant: any) => {
                        const user = participant.user || {}
                        const nickname = user.nickname || '익명'
                        const payment = participant.payment
                        const paymentStatus = payment?.status || participant.paymentStatus || 'pending'
                        const statusText = paymentStatus === 'completed' || paymentStatus === 'confirmed' ? '완료' :
                          paymentStatus === 'pending' ? '대기중' : '취소됨'
                        const statusClass = paymentStatus === 'completed' || paymentStatus === 'confirmed' ?
                          'text-green-800 bg-green-100' :
                          paymentStatus === 'pending' ? 'text-yellow-800 bg-yellow-100' :
                            'text-red-800 bg-red-100'
                        const amount = payment?.amount ? Number(payment.amount).toLocaleString() :
                          (selectedMeetingDetails as any)?.fee ?
                            Number((selectedMeetingDetails as any).fee).toLocaleString() : '0'
                        const paymentDate = payment?.approvedAt || payment?.date || participant.joinedOn
                        const paymentMethod = payment?.paymentMethod || '카드'

                        return (
                          <Card key={participant.id} className='border border-gray-200 m-2' sx={{ boxShadow: 'none' }}>
                            <CardContent className='border border-none flex items-center justify-between'>
                              <Box>
                                <Box className='flex items-center gap-2'>
                                  <Typography className='text-gray-900'>{nickname}</Typography>
                                  <Box className={`font-medium border border-gray-200 text-black text-[11px] px-1.5 rounded ${statusClass}`}>
                                    {statusText}
                                  </Box>
                                </Box>
                                <Typography className='text-gray-400 text-[13px]'>
                                  {paymentDate ? new Date(paymentDate).toLocaleDateString('ko-KR') : '날짜 없음'} • {paymentMethod}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography className='font-medium text-black'>{amount}원</Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        )
                      })
                  )}
                  {selectedMeetingParticipants.filter((p: any) => p.paymentId || p.paymentStatus === 'confirmed').length === 0 &&
                    selectedMeetingParticipants.length > 0 && (
                      <Typography className='text-gray-500 text-center py-4'>결제 완료된 참가자가 없습니다.</Typography>
                    )}
                </Box>
              )}

            </DialogContent>
          </Dialog>
        </Box>
      </Box>
    </AdminProtectedRoute>
  )
}
