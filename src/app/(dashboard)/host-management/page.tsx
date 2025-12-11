'use client'

// React Imports
import { useMemo, useState, useEffect, useCallback } from 'react'
import AdminProtectedRoute from '@components/AdminProtectedRoute'

// MUI Imports
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Button,
  IconButton,
  Modal,
  Popover
} from '@mui/material'

type Host = {
  id: number
  name: string
  phone: string
  email: string
  category: string
  joinedAt: string
  lastActivity: string
  status: '활성' | '승인 대기' | '검토중' | '정지'
  grade: '담장이' | '이음이' | '모꼬지' | '씨앗'
  meetingsCount: string
  revenue: string
  rating: string
  ratingCount: string
  manager: string
  lastIp: string
  lastLogin: string
  bankName: string
  accountNumber: string
  accountHolder: string
  totalRevenue: string
  totalParticipants: string
}

const HostManagementPage = () => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'모든 상태' | Host['status']>('모든 상태')
  const [gradeFilter, setGradeFilter] = useState<'모든 등급' | Host['grade']>('모든 등급')

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedHost, setSelectedHost] = useState<Host | null>(null)
  const [adminMemo, setAdminMemo] = useState('')

  // Row info popover
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null)
  const [infoHost, setInfoHost] = useState<Host | null>(null)

  // Meeting stats modal
  const [isMeetingStatsModalOpen, setIsMeetingStatsModalOpen] = useState(false)
  const [selectedStatsHost, setSelectedStatsHost] = useState<Host | null>(null)

  // Ratings modal
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState(false)
  const [selectedRatingsHost, setSelectedRatingsHost] = useState<Host | null>(null)

  // Preview modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'hosts' | 'meetings' | 'analysis'>('hosts')

  // Data state
  const [hosts, setHosts] = useState<Host[]>([])
  const [pendingMeetings, setPendingMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Fetch hosts
  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== '모든 상태') params.append('status', statusFilter)
      if (gradeFilter && gradeFilter !== '모든 등급') params.append('grade', gradeFilter)

      const response = await fetch(`/api/admin/hosts?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setHosts(data)
      } else {
        console.error('Failed to fetch hosts')
      }
    } catch (error) {
      console.error('Error fetching hosts:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, gradeFilter])

  // Fetch pending meetings
  const fetchPendingMeetings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/meetings/pending')
      if (response.ok) {
        const data = await response.json()
        setPendingMeetings(data)
      } else {
        console.error('Failed to fetch pending meetings')
      }
    } catch (error) {
      console.error('Error fetching pending meetings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update meeting status
  const updateMeetingStatus = async (meetingId: number, status: 'approved' | 'reject' | 'pending') => {
    try {
      setActionLoading(meetingId)
      const response = await fetch(`/api/admin/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Refresh pending meetings
        await fetchPendingMeetings()
        // Refresh hosts if on hosts tab
        if (activeTab === 'hosts') {
          await fetchHosts()
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update meeting status')
      }
    } catch (error) {
      console.error('Error updating meeting status:', error)
      alert('Failed to update meeting status')
    } finally {
      setActionLoading(null)
    }
  }

  // Update host status
  const updateHostStatus = async (hostId: number, status: '활성' | '정지') => {
    try {
      setActionLoading(hostId)
      // Map Korean status to database status
      const dbStatus = status === '정지' ? 'blacklisted' : 'active'

      const response = await fetch(`/api/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: hostId,
          status: dbStatus
        })
      })

      if (response.ok) {
        await fetchHosts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update host status')
      }
    } catch (error) {
      console.error('Error updating host status:', error)
      alert('Failed to update host status')
    } finally {
      setActionLoading(null)
    }
  }

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'hosts') {
      fetchHosts()
    } else if (activeTab === 'meetings') {
      fetchPendingMeetings()
    }
  }, [activeTab, fetchHosts, fetchPendingMeetings])


  const getStatusColor = (status: Host['status']) => {
    switch (status) {
      case '활성': return '#00a63e'
      case '승인 대기': return '#f54a00'
      case '검토중': return '#000'
      case '정지': return '#D4183D'
      default: return '#9ca3af'
    }
  }

  const getStatusChip = (status: Host['status']) => {
    switch (status) {
      case '활성':
        return { bg: '#00C951', color: '#ffffff', border: '#00C951' }
      case '승인 대기':
        return { bg: '#FF6900', color: '#ffffff', border: '#FF6900' }
      case '검토중':
        return { bg: '#155dfc', color: '#ffffff', border: '#155dfc' }
      case '정지':
        return { bg: '#D4183D', color: '#ffffff', border: '#D4183D' }
      default:
        return { bg: '#9ca3af', color: '#ffffff', border: '#9ca3af' }
    }
  }

  const getThirdChip = (status: Host['status']) => {
    switch (status) {
      case '검토중':
        return { label: '검토중', color: '#FF6900', border: '#FF6900' }
      case '승인 대기':
        return { label: '검토중', color: '#FF6900', border: '#FF6900' }
      default:
        return { label: '승인완료', color: '#00a63e', border: '#d1d5db' }
    }
  }

  const getGradeChip = (grade: Host['grade']) => {
    switch (grade) {
      case '담장이':
        return { bg: '#ad46ff', color: '#ffffff', border: '#ad46ff' }
      case '이음이':
        return { bg: '#2B7FFF', color: '#ffffff', border: '#2B7FFF' }
      case '모꼬지':
        return { bg: '#00C951', color: '#ffffff', border: '#00C951' }
      case '씨앗':
        return { bg: '#FF6900', color: '#ffffff', border: '#FF6900' }
      default:
        return { bg: '#f5f5f5', color: '#111827', border: '#e5e7eb' }
    }
  }

  const filteredHosts = useMemo(() => {
    return hosts.filter((h: Host) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.phone.replaceAll('-', '').includes(searchTerm.replaceAll('-', ''))
      const matchesStatus = statusFilter === '모든 상태' || h.status === statusFilter
      const matchesGrade = gradeFilter === '모든 등급' || h.grade === gradeFilter
      return matchesSearch && matchesStatus && matchesGrade
    })
  }, [hosts, searchTerm, statusFilter, gradeFilter])

  const openDetail = (host: Host) => {
    setSelectedHost(host)
    setIsDetailModalOpen(true)
  }

  const closeDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedHost(null)
    setAdminMemo('')
  }

  const openInfo = (event: React.MouseEvent<HTMLElement>, host: Host) => {
    setInfoAnchor(event.currentTarget)
    setInfoHost(host)
  }

  const closeInfo = () => {
    setInfoAnchor(null)
    setInfoHost(null)
  }

  const openMeetingStats = (host: Host) => {
    setSelectedStatsHost(host)
    setIsMeetingStatsModalOpen(true)
  }

  const closeMeetingStats = () => {
    setIsMeetingStatsModalOpen(false)
    setSelectedStatsHost(null)
  }

  const openRatings = (host: Host) => {
    setSelectedRatingsHost(host)
    setIsRatingsModalOpen(true)
  }

  const closeRatings = () => {
    setIsRatingsModalOpen(false)
    setSelectedRatingsHost(null)
  }

  const openPreview = (meeting: any) => {
    setSelectedMeeting(meeting)
    setIsPreviewModalOpen(true)
  }

  const closePreview = () => {
    setIsPreviewModalOpen(false)
    setSelectedMeeting(null)
  }

  return (
    <AdminProtectedRoute>
      <Box className="min-h-screen ">
        {/* Main Content */}
        <Box className="">
          {/* Welcome Section */}
          <Box className="mb-6">
            <Typography className="text-black text-lg mb-2">
              <span className="text-gray-500 font-light">님 반갑습니다.</span>
            </Typography>
          </Box>

          {/* Section Title */}
          <Box className="mb-5 flex items-center justify-between">
            <Box>
              <Typography variant="h5" className="text-2xl text-gray-900 font-light mb-2">
                호스트 관리
              </Typography>
              <Typography className="text-gray-500 text-base">
                모임을 주최하는 호스트들을 관리하고 모임 승인을 처리합니다.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              sx={{
                backgroundColor: '#030213',
                color: '#ffffff',
                textTransform: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                height: '36px',
                paddingInline: '14px',
                '&:hover': { backgroundColor: '#030213e6' }
              }}
              startIcon={<i className="ri-user-add-line text-sm" />}
            >
              호스트 초대
            </Button>
          </Box>

          {/* Summary */}
          <Box className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className="flex items-center justify-between mb-5">
                  <Typography className="text-gray-900 text-[14px]">전체 호스트</Typography>
                  <i className="ri-group-line text-blue-400 text-lg" />
                </Box>
                <Typography className="text-xl font-bold text-gray-900">{hosts.length}</Typography>
                <Typography className="text-gray-500 text-[12px]">등록 완료</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className="flex items-center justify-between mb-5">
                  <Typography className="text-gray-900 text-[14px]">승인 대기</Typography>
                  <i className="ri-calendar-line text-orange-500 text-lg" />
                </Box>
                <Typography className="text-xl font-bold text-gray-900">{pendingMeetings.length}</Typography>
                <Typography className="text-gray-500 text-[12px]">대기 중인 모임</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className="flex items-center justify-between mb-5">
                  <Typography className="text-gray-900 text-[14px]">이번 달 정산</Typography>
                  <i className="ri-money-dollar-circle-line text-green-500 text-lg" />
                </Box>
                <Typography className="text-xl font-bold text-gray-900">
                  ₩{hosts.reduce((sum, h) => {
                    const revenue = parseInt(h.totalRevenue.replace(/[₩,]/g, '')) || 0
                    return sum + revenue
                  }, 0).toLocaleString()}
                </Typography>
                <Typography className="text-gray-500 text-[12px]">전체 호스트 수익</Typography>
              </CardContent>
            </Card>

            <Card className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ padding: '20px' }}>
                <Box className="flex items-center justify-between mb-5">
                  <Typography className="text-gray-900 text-[14px]">평균 평점</Typography>
                  <i className="ri-star-line text-yellow-500 text-lg" />
                </Box>
                <Typography className="text-xl font-bold text-gray-900">
                  {hosts.length > 0
                    ? (hosts.reduce((sum, h) => sum + parseFloat(h.rating || '0'), 0) / hosts.length).toFixed(1)
                    : '0.0'}
                </Typography>
                <Typography className="text-gray-500 text-[12px]">전체 호스트 평균</Typography>
              </CardContent>
            </Card>
          </Box>

          <Box className="flex items-center justify-start gap-0 mb-5">
            <Box className="flex items-center p-1 rounded-3xl bg-gray-100 gap-1">
              <Box
                className={`px-2 py-1 rounded-3xl cursor-pointer  transition-colors ${activeTab === 'hosts'
                  ? 'border-gray-400 bg-white text-gray-800'
                  : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                onClick={() => setActiveTab('hosts')}
                sx={{
                  fontSize: '12px',
                  fontWeight: activeTab === 'hosts' ? '500' : '400'
                }}
              >
                호스트 목록
              </Box>
              <Box
                className={`px-2 py-1 rounded-3xl cursor-pointer  transition-colors ${activeTab === 'meetings'
                  ? 'border-gray-400 bg-white text-gray-800'
                  : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                onClick={() => setActiveTab('meetings')}
                sx={{
                  fontSize: '12px',
                  fontWeight: activeTab === 'meetings' ? '500' : '400'
                }}
              >
                모임 승인
              </Box>
              <Box
                className={`px-2 py-1 rounded-3xl cursor-pointer  transition-colors ${activeTab === 'analysis'
                  ? 'border-gray-400 bg-white text-gray-800'
                  : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                onClick={() => setActiveTab('analysis')}
                sx={{
                  fontSize: '12px',
                  fontWeight: activeTab === 'analysis' ? '500' : '400'
                }}
              >
                호스트 분석
              </Box>
            </Box>
          </Box>
          {/* Tab Content */}
          {activeTab === 'hosts' && (
            <Box className='border border-gray-200 rounded-lg box-shadow-none p-5'>
              <Box className="flex items-center justify-between mb-5">
                <Typography className="text-black text-[14px]">호스트 목록</Typography>
              </Box>

              {/* Search + Filters */}
              <Box className="flex flex-col  lg:flex-row gap-3 mb-5">
                <TextField
                  placeholder="이름, 이메일, 연락처 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    width: '32%',
                    '& .MuiOutlinedInput-root': {
                      height: '32px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#f3f3f5',
                      border: '1px solid #fff',
                      '&.Mui-focused fieldset': { border: '1px solid #3b82f6' }
                    }
                  }}
                />

                <FormControl sx={{ minWidth: '140px' }}>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    displayEmpty
                    aria-placeholder='상태'
                    MenuProps={{ disableScrollLock: true }}
                    sx={{
                      borderRadius: '8px',
                      backgroundColor: '#f3f3f5',
                      height: '32px',
                      color: '#000',
                      fontSize: '12px',
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: '1px solid #3b82f6' }
                    }}
                  >
                    <MenuItem value="모든 상태">모든 상태 </MenuItem>
                    <MenuItem value="활성">활성</MenuItem>
                    <MenuItem value="승인 대기">승인 대기</MenuItem>
                    <MenuItem value="정지">정지</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: '140px' }}>
                  <Select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value as any)}
                    displayEmpty
                    aria-placeholder='등급'
                    MenuProps={{ disableScrollLock: true }}
                    sx={{
                      borderRadius: '8px',
                      backgroundColor: '#f3f3f5',
                      height: '32px',
                      color: '#000',
                      fontSize: '12px',
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: '1px solid #3b82f6' }
                    }}
                  >
                    <MenuItem value="모든 등급">모든 등급</MenuItem>
                    <MenuItem value="담장이">담장이</MenuItem>
                    <MenuItem value="이음이">이음이</MenuItem>
                    <MenuItem value="모꼬지">모꼬지</MenuItem>
                    <MenuItem value="씨앗">씨앗</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Rows */}
              {loading ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">로딩 중...</Typography>
                </Box>
              ) : filteredHosts.length === 0 ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">호스트가 없습니다.</Typography>
                </Box>
              ) : (
                <Box className="space-y-4">
                  {filteredHosts.map((host) => (
                    <Card key={host.id} className='border border-gray-200 rounded-2xl box-shadow-none' sx={{ boxShadow: 'none' }}>
                      <CardContent className='p-4'>
                        <Box className="flex items-start gap-4">
                          {/* Avatar */}
                          <Box className="flex-shrink-0">
                            <Box className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Typography className="text-[12px] text-gray-700">
                                {host.name.slice(0, 1)}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Main Content */}
                          <Box className="flex-1">
                            {/* Name and Chips */}
                            <Box className="flex items-start gap-2 mb-2">
                              <Typography className="text-black text-[14px] font-medium">{host.name}</Typography>
                              <Box className="flex items-center gap-2">
                                <Chip
                                  label={host.grade}
                                  size="small"
                                  className="rounded-md"
                                  icon={host.grade === '담장이' ? <i className="ri-vip-crown-line pl-4 bg-white" /> : undefined}
                                  sx={{
                                    backgroundColor: getGradeChip(host.grade).bg,
                                    color: getGradeChip(host.grade).color,
                                    border: `1px solid ${getGradeChip(host.grade).border}`,
                                    fontSize: '11px',
                                    height: '20px',
                                    fontWeight: '400',
                                    '& .MuiChip-icon': {
                                      marginLeft: '2px',
                                      width: '12px',
                                      height: '12px'
                                    }
                                  }}
                                />
                                <Chip
                                  label={host.status}
                                  size="small"
                                  className="rounded-md"
                                  sx={{
                                    backgroundColor: getStatusChip(host.status).bg,
                                    color: getStatusChip(host.status).color,
                                    border: `1px solid ${getStatusChip(host.status).border}`,
                                    fontSize: '11px',
                                    height: '20px',
                                    fontWeight: '400',
                                    '&:hover': { backgroundColor: getStatusChip(host.status).bg }
                                  }}
                                />
                                <Chip
                                  label={getThirdChip(host.status).label}
                                  size="small"
                                  variant="outlined"
                                  className="rounded-md"
                                  sx={{
                                    backgroundColor: 'transparent',
                                    color: getThirdChip(host.status).color,
                                    borderColor: '#0000001a',
                                    fontSize: '11px',
                                    height: '20px',
                                    fontWeight: '400',
                                    '&:hover': { backgroundColor: 'transparent' }
                                  }}
                                />
                              </Box>
                            </Box>

                            {/* Stats Row */}
                            <Box className="grid grid-cols-4 justify-between gap-6">
                              {/* Contact Info */}
                              <Box className="mb-2">
                                <Typography className="text-gray-500 text-[12.25px] mb-1">연락처</Typography>
                                <Typography className="text-black text-[12.25px]">{host.phone}</Typography>
                                <Typography className="text-gray-500 text-[10.5px]">{host.email}</Typography>
                              </Box>
                              {/* Meeting Stats */}
                              <Box>
                                <Typography className="text-gray-500 text-[12.25px] mb-1">모임 통계</Typography>
                                <Typography
                                  className="text-black text-[12.25px] cursor-pointer hover:text-blue-600"
                                  onClick={() => openMeetingStats(host)}
                                  title="탭하여 모임 통계 확인"
                                >
                                  {host.meetingsCount}
                                </Typography>
                                <Typography className="text-gray-500 text-[10.5px]">456명 참가</Typography>
                              </Box>

                              {/* Rating */}
                              <Box>
                                <Typography className="text-gray-500 text-[12.25px] mb-1">평점 및 리뷰</Typography>
                                <Box
                                  className="flex items-center gap-1 cursor-pointer "
                                  onClick={() => openRatings(host)}
                                  title="탭하여 평점 및 리뷰 확인"
                                >
                                  <i className="ri-star-fill text-yellow-500 text-[14px]" />
                                  <Typography className="text-black hover:text-blue-600 text-[12.5px]">{host.rating} <span className="text-gray-500 text-[10.5px]">({host.ratingCount})</span></Typography>
                                </Box>
                              </Box>

                              {/* Settlement */}
                              <Box>
                                <Typography className="text-gray-500 text-[12.25px] mb-1">정산 정보</Typography>
                                <Typography className="text-black text-[12.25px] font-medium">{host.revenue}</Typography>
                                <Typography className="text-gray-500 text-[10.5px]">국민은행 123-456-789</Typography>
                              </Box>
                            </Box>



                            {/* Category and Dates */}
                            <Box className=" flex gap-3 ">
                              <Typography className="text-gray-500 text-[10.5px]">
                                카테고리: {host.category}
                              </Typography>
                              <Typography className="text-gray-500 text-[10.5px]">
                                가입: {host.joinedAt}
                              </Typography>
                              <Typography className="text-gray-500 text-[10.5px]">
                                최근 활동: {host.lastActivity}
                              </Typography>
                            </Box>


                          </Box>

                          {/* Actions */}
                          <Box className="flex items-center gap-2">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openDetail(host)}
                              startIcon={<i className="ri-eye-line text-black text-sm" />}
                              sx={{
                                borderColor: '#d1d5db',
                                color: '#000',
                                textTransform: 'none',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                fontSize: '12px',
                                height: '32px',
                                minWidth: '80px',
                                '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f9fafb' }
                              }}
                            >
                              상세
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{
                                borderColor: '#d1d5db',
                                color: '#000',
                                textTransform: 'none',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                fontSize: '12px',
                                height: '32px',
                                minWidth: '64px',
                                '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f9fafb' }
                              }}
                              startIcon={<i className="ri-edit-line text-black text-sm" />}
                            >
                              수정
                            </Button>
                            {host.status !== '검토중' && host.status !== '정지' && host.status !== '승인 대기' && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => updateHostStatus(host.id, '정지')}
                                disabled={actionLoading === host.id}
                                sx={{
                                  borderColor: '#d1d5db',
                                  color: '#000',
                                  textTransform: 'none',
                                  borderRadius: '8px',
                                  backgroundColor: '#fff',
                                  fontSize: '12px',
                                  height: '32px',
                                  minWidth: '64px',
                                  '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f9fafb' }
                                }}
                                startIcon={<i className="ri-forbid-line text-black text-sm" />}
                              >
                                {actionLoading === host.id ? '처리 중...' : '정지'}
                              </Button>
                            )}
                            {/* <Button
                          variant="contained"
                          size="small"
                          sx={{
                            backgroundColor: '#D4183D',
                            color: '#ffffff',
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            height: '32px',
                            minWidth: '64px',
                            '&:hover': { backgroundColor: '#d4183de6' }
                          }}
                        >
                          정지
                        </Button> */}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {activeTab === 'meetings' && (
            <Box className='border border-gray-200 rounded-lg box-shadow-none p-5'>
              <Box className="flex items-center justify-between mb-5">
                <Typography className="text-black text-[14px]">모임 승인 대기 목록</Typography>
              </Box>

              {loading ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">로딩 중...</Typography>
                </Box>
              ) : pendingMeetings.length === 0 ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">승인 대기 중인 모임이 없습니다.</Typography>
                </Box>
              ) : (
                <Box className="space-y-4">
                  {pendingMeetings.map((meeting) => (
                    <Card key={meeting.id} className="rounded-lg border border-gray-200" sx={{ boxShadow: 'none' }}>
                      <CardContent className="p-4">
                        <Box className="flex justify-between items-start">
                          <Box className="flex-1">
                            <Typography className="text-black text-[14px] mb-1">
                              {meeting.title}
                            </Typography>

                            <Box className="grid grid-cols-4 gap-3 text-sm">
                              <Box>
                                <Typography className="text-gray-500 text-[14px]">호스트</Typography>
                                <Typography className="text-black text-[14px]">{meeting.host}</Typography>
                              </Box>
                              <Box>
                                <Typography className="text-gray-500 text-[14px]">카테고리</Typography>
                                <Typography className="text-black text-[14px]">{meeting.category}</Typography>
                              </Box>
                              <Box>
                                <Typography className="text-gray-500 text-[14px]">일시</Typography>
                                <Typography className="text-black text-[14px]">{meeting.date}</Typography>
                              </Box>
                              <Box>
                                <Typography className="text-gray-500 text-[14px]">가격/정원</Typography>
                                <Typography className="text-black text-[14px]">{meeting.price} / {meeting.capacity}</Typography>
                              </Box>
                            </Box>
                            <Box className="flex items-center gap-2 mt-2">
                              <Typography className="text-gray-500 text-[14px]">장소:</Typography>
                              <Typography className="text-gray-500 text-[14px]">{meeting.location}</Typography>
                            </Box>
                          </Box>

                          <Box className="flex  gap-2 ml-4">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openPreview(meeting)}
                              sx={{
                                borderColor: '#0000001a',
                                color: '#374151',
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0px 12px',
                                minWidth: 'fit-content',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                '&:hover': {
                                  borderColor: '#4b5563',
                                  backgroundColor: '#f9fafb'
                                }
                              }}
                            >
                              <i className="ri-eye-line text-gray-600 text-sm" />
                              상세
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => updateMeetingStatus(meeting.id, 'reject')}
                              disabled={actionLoading === meeting.id}
                              sx={{
                                borderColor: '#0000001a',
                                color: '#374151',
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0px 12px',
                                minWidth: 'fit-content',
                                '&:hover': {
                                  borderColor: '#4b5563',
                                  backgroundColor: '#f9fafb'
                                }
                              }}
                            >
                              {actionLoading === meeting.id ? '처리 중...' : '승인 거절'}
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => updateMeetingStatus(meeting.id, 'approved')}
                              disabled={actionLoading === meeting.id}
                              sx={{
                                backgroundColor: '#030213',
                                color: '#ffffff',
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0px 12px',
                                minWidth: 'fit-content',
                                '&:hover': { backgroundColor: '#030213e6' },
                                '&:disabled': { backgroundColor: '#9ca3af' }
                              }}
                            >
                              {actionLoading === meeting.id ? '처리 중...' : '승인'}
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {activeTab === 'analysis' && (
            <Box className='border border-gray-200 rounded-lg box-shadow-none p-5'>
              <Box className="space-y-4">
                <Box className="flex items-center justify-between mb-5">
                  <Typography className="text-black text-[14px]">호스트 분석</Typography>
                </Box>
                <Typography className="text-gray-500 text-center py-5 text-sm">호스트 분석 기능이 곧 추가될 예정입니다.</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Detail Modal */}
        <Modal open={isDetailModalOpen} onClose={closeDetail} className="flex items-center justify-center">
          <Box className="bg-white rounded-2xl py-6 px-5 w-full overflow-auto max-w-md mx-4 shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-3">
              <Typography variant="h6" className="text-black font-semibold text-lg">호스트 상세 정보</Typography>
              <IconButton className='p-0' onClick={closeDetail} size="small">
                <i className="ri-close-line text-gray-700 p-0  text-lg" />
              </IconButton>
            </Box>

            {/* Host Profile Section */}
            <Box className="flex items-center gap-4 mb-3">
              <Box className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                <Typography className="text-[16px] text-black">
                  {selectedHost?.name.slice(0, 1)}
                </Typography>
              </Box>
              <Box>
                <Typography className="text-black text-lg">{selectedHost?.name}</Typography>
                <Typography className="text-gray-500 text-sm mb-2">{selectedHost?.email}</Typography>
                <Box className="flex gap-2">
                  {selectedHost && (
                    <>
                      <Chip
                        label={selectedHost.grade}
                        size="small"
                        className="rounded-md"
                        icon={selectedHost.grade === '담장이' ? <i className="ri-vip-crown-line pl-4" /> : undefined}
                        sx={{
                          backgroundColor: getGradeChip(selectedHost.grade).bg,
                          color: getGradeChip(selectedHost.grade).color,
                          border: `1px solid ${getGradeChip(selectedHost.grade).border}`,
                          fontSize: '12px',
                          height: '24px',
                          fontWeight: '400',
                          '& .MuiChip-icon': {
                            fontSize: '12px !important',
                            marginLeft: '2px',
                            backgroundColor: 'white',
                            width: '12px',
                            height: '12px'
                          }
                        }}
                      />
                      <Chip
                        label={selectedHost.status}
                        size="small"
                        className="rounded-md"
                        sx={{
                          backgroundColor: getStatusChip(selectedHost.status).bg,
                          color: getStatusChip(selectedHost.status).color,
                          border: `1px solid ${getStatusChip(selectedHost.status).border}`,
                          fontSize: '12px',
                          height: '24px',
                          fontWeight: '400'
                        }}
                      />
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Information Sections */}
            <Box className="grid grid-cols-2 gap-4 mb-3">
              {/* Basic Info */}
              <Box>
                <Typography className="text-black text-[14px] mb-2">기본 정보</Typography>
                <Box className="space-y-1">
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">전화번호:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.phone}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">카테고리:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.category}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">가입:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.joinedAt}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">최근 활동:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.lastActivity}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Settlement Info */}
              <Box>
                <Typography className="text-black text-[14px] mb-2">정산 정보</Typography>
                <Box className="space-y-1">
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">은행:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.bankName}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">계좌번호:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.accountNumber}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">예금주:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.accountHolder}</Typography>
                  </Box>
                  <Box className="flex items-start gap-2">
                    <Typography className="text-gray-500 text-sm mb-1">총 수익:</Typography>
                    <Typography className="text-black text-sm">{selectedHost?.totalRevenue}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Activity Statistics */}
            <Box className="mb-3">
              <Typography className="text-black text-[14px] mb-2">활동 통계</Typography>
              <Box className="grid grid-cols-3 gap-4">
                <Card className='rounded-md' sx={{ boxShadow: 'none', backgroundColor: '#ececf0' }}>
                  <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                    <Typography className="text-[18px] font-bold text-black mb-1">
                      {selectedHost?.meetingsCount.split('개')[0]}
                    </Typography>
                    <Typography className="text-gray-500 text-[11px]">개설 모임</Typography>
                  </CardContent>
                </Card>
                <Card className='rounded-md' sx={{ boxShadow: 'none', backgroundColor: '#ececf0' }}>
                  <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                    <Typography className="text-[18px] font-bold text-black mb-1">
                      {selectedHost?.totalParticipants}
                    </Typography>
                    <Typography className="text-gray-500 text-[11px]">총 참가자</Typography>
                  </CardContent>
                </Card>
                <Card className='rounded-md' sx={{ boxShadow: 'none', backgroundColor: '#ececf0' }}>
                  <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                    <Box className="flex items-center justify-center gap-1 mb-1">
                      <i className="ri-star-fill text-yellow-500 text-xl" />
                      <Typography className="text-[18px] font-bold text-black">
                        {selectedHost?.rating}
                      </Typography>
                    </Box>
                    <Typography className="text-gray-500 text-[11px]">{selectedHost?.ratingCount} 리뷰</Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box className="flex justify-end gap-3">
              {selectedHost?.status === '승인 대기' && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      // This would need to be implemented based on your business logic
                      // For now, we'll just close the modal
                      closeDetail()
                    }}
                    sx={{
                      borderColor: '#d1d5db',
                      color: '#374151',
                      textTransform: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '32px',
                      padding: '0px 16px',
                      minWidth: 'fit-content',
                      '&:hover': { backgroundColor: '#f9fafb' }
                    }}
                  >
                    승인 거절
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={async () => {
                      // This would need to be implemented based on your business logic
                      // For now, we'll just close the modal
                      closeDetail()
                    }}
                    sx={{
                      backgroundColor: '#030213',
                      color: '#ffffff',
                      textTransform: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '32px',
                      padding: '0px 16px',
                      minWidth: 'fit-content',
                      '&:hover': { backgroundColor: '#030213e6' }
                    }}
                  >
                    승인
                  </Button>
                </>
              )}
              {selectedHost?.status === '활성' && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    if (selectedHost) {
                      await updateHostStatus(selectedHost.id, '정지')
                      closeDetail()
                    }
                  }}
                  disabled={actionLoading === selectedHost?.id}
                  sx={{
                    backgroundColor: '#D4183D',
                    color: '#ffffff',
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    height: '32px',
                    padding: '0px 16px',
                    minWidth: 'fit-content',
                    '&:hover': { backgroundColor: '#d4183de6' },
                    '&:disabled': { backgroundColor: '#9ca3af' }
                  }}
                >
                  {actionLoading === selectedHost?.id ? '처리 중...' : '정지'}
                </Button>
              )}
              {selectedHost?.status === '정지' && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    if (selectedHost) {
                      await updateHostStatus(selectedHost.id, '활성')
                      closeDetail()
                    }
                  }}
                  disabled={actionLoading === selectedHost?.id}
                  sx={{
                    backgroundColor: '#030213',
                    color: '#ffffff',
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    height: '32px',
                    padding: '0px 16px',
                    minWidth: 'fit-content',
                    '&:hover': { backgroundColor: '#030213e6' },
                    '&:disabled': { backgroundColor: '#9ca3af' }
                  }}
                >
                  {actionLoading === selectedHost?.id ? '처리 중...' : '정지 해제'}
                </Button>
              )}
            </Box>
          </Box>
        </Modal>

        {/* Info Popover */}
        <Popover
          open={Boolean(infoAnchor)}
          anchorEl={infoAnchor}
          onClose={closeInfo}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { borderRadius: '12px', p: 1.5 } } }}
        >
          <Box className="text-[11px] text-gray-700">
            <Typography className="text-[11px] text-gray-700 mb-1">
              관리자: <span className="font-medium">{infoHost?.manager}</span>
            </Typography>
            <Typography className="text-[11px] text-gray-700">IP: {infoHost?.lastIp}</Typography>
            <Typography className="text-[11px] text-gray-700">최근 접속: {infoHost?.lastLogin}</Typography>
          </Box>
        </Popover>

        {/* Meeting Stats Modal */}
        <Modal open={isMeetingStatsModalOpen} onClose={closeMeetingStats} className="flex items-center justify-center">
          <Box className="bg-white rounded-2xl py-6 px-6 w-full max-w-md mx-4 shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-3">
              <Typography variant="h6" className="text-black font-semibold text-[16px]">
                모임 통계 - {selectedStatsHost?.name}
              </Typography>
              <IconButton className='p-0' onClick={closeMeetingStats} size="small">
                <i className="ri-close-line text-gray-700 text-lg" />
              </IconButton>
            </Box>

            {/* Summary Cards */}
            <Box className="flex justify-between gap-2 mb-2 overflow-x-auto pb-2" sx={{
              '&::-webkit-scrollbar': { height: '2px' },
              '&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1', borderRadius: '3px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: '#c1c1c1', borderRadius: '3px' },
              '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#a8a8a8' }
            }}>
              <Card className='rounded-md flex-shrink-0' sx={{ boxShadow: 'none', backgroundColor: '#ececf0', minWidth: '120px' }}>
                <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                  <Typography className="text-lg font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedStatsHost?.meetingsCount.split('개')[0]}
                  </Typography>
                  <Typography className="text-gray-500 text-xs">개설 모임</Typography>
                </CardContent>
              </Card>
              <Card className='rounded-md flex-shrink-0' sx={{ boxShadow: 'none', backgroundColor: '#ececf0', minWidth: '120px' }}>
                <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                  <Typography className="text-lg font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedStatsHost?.totalParticipants}
                  </Typography>
                  <Typography className="text-gray-500 text-xs">총 참가자</Typography>
                </CardContent>
              </Card>
              <Card className='rounded-md flex-shrink-0' sx={{ boxShadow: 'none', backgroundColor: '#ececf0', minWidth: '120px' }}>
                <CardContent className="p-3" sx={{ textAlign: 'center' }}>
                  <Typography className="text-lg font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis">
                    {selectedStatsHost?.totalRevenue}
                  </Typography>
                  <Typography className="text-gray-500 text-xs">총 수익</Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Recent Meetings */}
            <Box>
              <Typography className="text-black text-md  mb-2">최근 모임</Typography>
              <Box className="space-y-3">
                {selectedStatsHost?.id === 1 && (
                  <>
                    <Box className="flex justify-between rounded-md items-center p-2 border border-gray-200">
                      <Box>
                        <Typography className="text-black text-sm font-medium">이탈리안 요리 클래스</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-20</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">8명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩180,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-center p-2 border border-gray-200">
                      <Box>
                        <Typography className="text-black text-sm font-medium">한식 기초 요리</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-15</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">6명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩135,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-center p-2 border border-gray-200">
                      <Box>
                        <Typography className="text-black text-sm font-medium">디저트 만들기</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-10</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">10명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩200,000</Typography>
                      </Box>
                    </Box>
                  </>
                )}
                {selectedStatsHost?.id === 2 && (
                  <>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">헬스케어 운동</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-18</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">12명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩240,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">요가 클래스</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-12</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">8명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩160,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2">
                      <Box>
                        <Typography className="text-black text-sm font-medium">필라테스</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-08</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">15명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩300,000</Typography>
                      </Box>
                    </Box>
                  </>
                )}
                {selectedStatsHost?.id === 3 && (
                  <>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">수채화 그리기</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-17</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">6명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩120,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">아크릴 페인팅</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-11</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">8명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩160,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2">
                      <Box>
                        <Typography className="text-black text-sm font-medium">드로잉 기초</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-05</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">10명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩200,000</Typography>
                      </Box>
                    </Box>
                  </>
                )}
                {selectedStatsHost?.id === 4 && (
                  <Box className="text-center py-8">
                    <Typography className="text-gray-500 text-sm">아직 개설된 모임이 없습니다.</Typography>
                  </Box>
                )}
                {selectedStatsHost?.id === 5 && (
                  <>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">기타 연주</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-16</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">12명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩240,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2 border-b border-gray-100">
                      <Box>
                        <Typography className="text-black text-sm font-medium">보컬 트레이닝</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-09</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">8명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩160,000</Typography>
                      </Box>
                    </Box>
                    <Box className="flex justify-between items-center py-2">
                      <Box>
                        <Typography className="text-black text-sm font-medium">피아노 레슨</Typography>
                        <Typography className="text-gray-500 text-xs">2024-08-03</Typography>
                      </Box>
                      <Box className="text-right">
                        <Typography className="text-black text-sm">6명 참가</Typography>
                        <Typography className="text-gray-500 text-xs">₩120,000</Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Ratings Modal */}
        <Modal open={isRatingsModalOpen} onClose={closeRatings} className="flex items-center justify-center">
          <Box className="bg-white rounded-2xl py-6 px-6 w-full max-w-md mx-4 shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-2">
              <Typography variant="h6" className="text-black font-semibold text-[16px]">
                평점 및 리뷰 - {selectedRatingsHost?.name}
              </Typography>
              <IconButton className='p-0' onClick={closeRatings} size="small">
                <i className="ri-close-line text-gray-700 text-lg" />
              </IconButton>
            </Box>

            {/* Overall Rating Section */}
            <Box className="flex items-center flex-col justify-center bg-gray-100 rounded-md  gap-1 mb-3 p-3">
              <Box className="flex items-center gap-2">
                <i className="ri-star-fill text-yellow-500 text-2xl" />
                <Typography className="text-2xl font-bold text-black">{selectedRatingsHost?.rating}</Typography>
              </Box>
              <Typography className="text-gray-500 text-sm">전체 평점 ({selectedRatingsHost?.ratingCount})</Typography>
            </Box>

            {/* Reviews List */}
            <Box>
              <Typography className="text-black text-md mb-2">리뷰 목록</Typography>
              <Box className="space-y-3">
                {selectedRatingsHost?.id === 1 && (
                  <>
                    <Box className="flex justify-between rounded-md items-start p-2 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">이참가자</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">정말 유익한 시간이었습니다. 요리 실력이 늘었어요!</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-16</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">박요리</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">친절하게 가르쳐주셔서 감사해요.</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-12</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(4)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                        <i className="ri-star-line text-gray-300 text-sm" />
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">최맛집</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">다음에도 꼭 참가하고 싶어요!</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-08</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
                {selectedRatingsHost?.id === 2 && (
                  <>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">김건강</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">운동이 이렇게 재미있을 줄 몰랐어요!</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-15</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">박체력</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">전문적인 지도 감사합니다.</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-13</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(4)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                        <i className="ri-star-line text-gray-300 text-sm" />
                      </Box>
                    </Box>
                  </>
                )}
                {selectedRatingsHost?.id === 3 && (
                  <>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">이예술</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">선생님 덕분에 그림에 자신감이 생겼어요!</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-14</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">최창작</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">정말 세심하게 가르쳐주세요.</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-10</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
                {selectedRatingsHost?.id === 4 && (
                  <Box className="text-center py-8">
                    <Typography className="text-gray-500 text-sm">아직 리뷰가 없습니다.</Typography>
                  </Box>
                )}
                {selectedRatingsHost?.id === 5 && (
                  <>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">김음악</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">기초부터 차근차근 알려주세요.</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-08-03</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(4)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                        <i className="ri-star-line text-gray-300 text-sm" />
                      </Box>
                    </Box>
                    <Box className="flex justify-between rounded-md items-start p-3 border border-gray-200">
                      <Box className="flex-1">
                        <Typography className="text-black text-[14px] font-medium mb-1">박멜로디</Typography>
                        <Typography className="text-gray-500 text-[12.25px] mb-1">괜찮은 수업이었어요.</Typography>
                        <Typography className="text-gray-500 text-[10.5px]">2024-07-30</Typography>
                      </Box>
                      <Box className="flex gap-1 ml-2">
                        {[...Array(3)].map((_, i) => (
                          <i key={i} className="ri-star-fill text-yellow-500 text-sm" />
                        ))}
                        {[...Array(2)].map((_, i) => (
                          <i key={i} className="ri-star-line text-gray-300 text-sm" />
                        ))}

                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Preview Modal */}
        <Modal open={isPreviewModalOpen} onClose={closePreview} className="flex items-center justify-center">
          <Box className="bg-white rounded-2xl py-6 px-5 w-full overflow-auto max-w-md mx-4 shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-2">
              <Typography variant="h6" className="text-black font-semibold text-lg">모임 상세</Typography>
              <IconButton className='p-0' onClick={closePreview} size="small">
                <i className="ri-close-line text-gray-700 p-0 text-lg" />
              </IconButton>
            </Box>

            {/* Meeting Content */}
            {selectedMeeting && (
              <Box className="">
                {/* Meeting Title */}
                <Typography className="text-black text-lg">
                  {selectedMeeting.title}
                </Typography>

                {/* Meeting Details */}
                <Box className="grid grid-cols-2 gap-3 space-y-3">
                  <Box className="flex flex-col justify-end items-start">
                    <Typography className="text-gray-600 text-[14px]">호스트</Typography>
                    <Typography className="text-black text-[14px]">{selectedMeeting.host}</Typography>
                  </Box>

                  <Box className="flex flex-col items-start">
                    <Typography className="text-gray-600 text-[14px]">카테고리</Typography>
                    <Typography className="text-black text-[14px]">{selectedMeeting.category}</Typography>
                  </Box>

                  <Box className="flex flex-col items-start">
                    <Typography className="text-gray-600 text-[14px]">일시</Typography>
                    <Typography className="text-black text-[14px]">{selectedMeeting.date}</Typography>
                  </Box>

                  <Box className="flex flex-col items-start">
                    <Typography className="text-gray-600 text-[14px]">가격 / 정원</Typography>
                    <Typography className="text-black text-[14px]">{selectedMeeting.price} / {selectedMeeting.capacity}</Typography>
                  </Box>

                  <Box className="flex flex-col items-start">
                    <Typography className="text-gray-600 text-[14px]">장소</Typography>
                    <Typography className="text-black text-[14px]">{selectedMeeting.location}</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Modal>
      </Box>
    </AdminProtectedRoute>
  )
}

export default HostManagementPage


