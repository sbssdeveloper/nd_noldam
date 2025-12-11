'use client'

// React Imports
import React, { useState, useEffect, useRef } from 'react'
import AdminProtectedRoute from '@components/AdminProtectedRoute'
import { typeSettingsApiService } from '@/services/types/backend/typeSettingsApi'
import { apiService } from '@/services/apiService'

// MUI Imports
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Switch,
  IconButton,
  Chip,
  Grid,
  Divider,
  Modal,
  TextField,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel
} from '@mui/material'
import FeedApiService from '@/services/feedApi'


const HomePage = () => {
  const [slideshowItems, setSlideshowItems] = useState<any[]>([])
  const [isLoadingSlides, setIsLoadingSlides] = useState(false)

  const [typeAItems, setTypeAItems] = useState<any[]>([])
  const [isLoadingTypeA, setIsLoadingTypeA] = useState(false)

  const [typeBItems, setTypeBItems] = useState<any[]>([])
  const [isLoadingTypeB, setIsLoadingTypeB] = useState(false)

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date())

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [slideForm, setSlideForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    redirectUrl: ''
  })
  // Slide scope (공개 범위)
  const [slideScope, setSlideScope] = useState<'전체' | '카테고리'>('전체')
  // Slide redirect selections
  const [slideMeetingSearch, setSlideMeetingSearch] = useState('')
  const [slideSelectedMeetingId, setSlideSelectedMeetingId] = useState<number | null>(null)
  const [slideSelectedCategoryIds, setSlideSelectedCategoryIds] = useState<number[]>([])
  const [slideMeetingResults, setSlideMeetingResults] = useState<any[]>([])
  const [isLoadingSlideMeetingSearch, setIsLoadingSlideMeetingSearch] = useState(false)

  // (Removed) user selection state

  // Type modal state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [typeForm, setTypeForm] = useState({
    type: 'A',
    title: '',
    description: '',
    imageUrl: '',
    deactivationDate: '',
    publicScope: '전체', // Korean value to match radio buttons
    category: '',
    meetings: [] as number[]
  })

  // Meeting selection state
  const [meetingSearch, setMeetingSearch] = useState('')

  // Category selection state for main form
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  // Real meetings data
  const [realMeetings, setRealMeetings] = useState<any[]>([])
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)

  // Type edit modal state
  const [isTypeEditModalOpen, setIsTypeEditModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<typeof typeAItems[0] | typeof typeBItems[0] | null>(null)
  const [editingTypeCategory, setEditingTypeCategory] = useState<'A' | 'B'>('A')
  const [typeEditForm, setTypeEditForm] = useState({
    type: 'A',
    title: '',
    description: '',
    imageUrl: '',
    deactivationDate: '',
    publicScope: 'public',
    category: '',
    meetings: [] as number[]
  })
  const [typeEditSelectedMeetings, setTypeEditSelectedMeetings] = useState<number[]>([])
  const [typeEditMeetingSearch, setTypeEditMeetingSearch] = useState('')
  const [typeEditSelectedCategories, setTypeEditSelectedCategories] = useState<number[]>([])

  // Edit slide modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<typeof slideshowItems[0] | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    redirectUrl: ''
  })
  // (Removed) edit user selection state
  // Edit slide redirect selections
  const [editTargetType, setEditTargetType] = useState<'meeting' | 'category'>('meeting')
  const [editMeetingSearch, setEditMeetingSearch] = useState('')
  const [editSelectedMeetingId, setEditSelectedMeetingId] = useState<number | null>(null)
  const [editSelectedCategoryIds, setEditSelectedCategoryIds] = useState<number[]>([])
  const [editMeetingResults, setEditMeetingResults] = useState<any[]>([])
  const [isLoadingEditMeetingSearch, setIsLoadingEditMeetingSearch] = useState(false)
  const [editSlideScope, setEditSlideScope] = useState<'전체' | '카테고리'>('전체')

  // Image modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const slideImageInputRef = useRef<HTMLInputElement>(null)
  const typeImageInputRef = useRef<HTMLInputElement>(null)
  const editSlideImageInputRef = useRef<HTMLInputElement>(null)
  const editTypeImageInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, onSuccess: (url: string) => void) => {
    const res = await FeedApiService.uploadImage(file)
    if (res?.success && res.data?.imageUrl) {
      onSuccess(res.data.imageUrl)
    } else {
      alert(`이미지 업로드 실패: ${res?.reason || '알 수 없는 오류'}`)
    }
  }

  // (Removed) users from DB state

  // Sample meetings data
  const meetings = [
    { id: 1, name: '주말 등산 모임', category: '운동', participants: 12 },
    { id: 2, name: '독서 토론회', category: '교육', participants: 8 },
    { id: 3, name: '우리 크래스', category: '취미', participants: 15 },
    { id: 4, name: '요리 교실', category: '취미', participants: 6 },
    { id: 5, name: '영어 회화', category: '교육', participants: 10 }
  ]

  // Categories state
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch meetings from API
  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoadingMeetings(true)
      try {
        const response = await fetch('/api/meetings')
        const data = await response.json()
        setRealMeetings(data)
      } catch (error) {
        console.error('Failed to fetch meetings:', error)
      } finally {
        setIsLoadingMeetings(false)
      }
    }

    fetchMeetings()
  }, [])

  // (Removed) fetch users effect

  // Format time as HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const toggleSlideshowItem = async (id: number, nextActive: boolean) => {
    // optimistic update only; do not refetch
    setSlideshowItems(items => items.map(it => it.id === id ? { ...it, active: nextActive, status: nextActive ? '활성' : '비활성' } : it))
    try {
      const res = await apiService.put(`/home-page-settings/${id}`, { status: nextActive ? 'active' : 'inactive' })
      if (!res.success) throw new Error(res.error || 'Failed to update status')
    } catch (err: any) {
      // revert on error
      setSlideshowItems(items => items.map(it => it.id === id ? { ...it, active: !nextActive, status: !nextActive ? '활성' : '비활성' } : it))
      alert(`상태 변경 실패: ${err?.message || '알 수 없는 오류'}`)
    }
  }

  const fetchSlides = async () => {
    setIsLoadingSlides(true)
    try {
      const res = await apiService.get('/home-page-settings?status=all')
      if (!res.success) throw new Error(res.error || 'Failed to load slides')
      const source = Array.isArray(res.data) ? res.data : []
      const mapped = source.map((s: any, idx: number) => ({
        id: s.id,
        title: s.title,
        description: s.subtitle,
        url: s.image,
        status: s.status === 'active' ? '활성' : '비활성',
        order: idx + 1,
        scope: s.scope || 'public',
        meetings: Array.isArray(s.meetings) ? s.meetings : [],
        categories: Array.isArray(s.categories) ? s.categories : [],
        active: s.status === 'active'
      }))
      setSlideshowItems(mapped)
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingSlides(false)
    }
  }

  useEffect(() => {
    fetchSlides()
  }, [])

  const handleDeleteSlide = async (id: number) => {
    const confirmed = window.confirm('이 슬라이드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    if (!confirmed) return
    try {
      const res = await apiService.delete(`/home-page-settings/${id}`)
      if (!res.success) throw new Error(res.error || 'Failed to delete slide')
      await fetchSlides()
    } catch (err: any) {
      alert(`슬라이드 삭제 실패: ${err?.message || '알 수 없는 오류'}`)
    }
  }

  // Delete a Type Setting (Type A or Type B)
  const handleDeleteTypeSetting = async (id: number, type: 'A' | 'B') => {
    const label = type === 'A' ? 'Type A' : 'Type B'
    const confirmed = window.confirm(`${label} 설정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)
    if (!confirmed) return

    try {
      const result = await typeSettingsApiService.deleteTypeSetting(id)
      if (result.success) {
        // Refresh corresponding list
        if (type === 'A') {
          await fetchTypeASettings()
        } else {
          await fetchTypeBSettings()
        }
        alert(`${label} 설정이 삭제되었습니다.`)
      } else {
        alert(`삭제에 실패했습니다: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      alert(`삭제 중 오류가 발생했습니다: ${error?.message || '네트워크 오류'}`)
    }
  }

  // Fetch Type A settings from API
  const fetchTypeASettings = async () => {
    setIsLoadingTypeA(true)
    try {
      const typeASettings = await typeSettingsApiService.getTypeSettings('type_A')
      // Transform API data to match the component's expected format
      const transformedItems = typeASettings.map((setting: any) => ({
        id: setting.id,
        title: setting.title,
        description: setting.description || '',
        image: setting.image || '',
        status: new Date(setting.deactivationDate || '9999-12-31') > new Date() ? '활성' : '만료됨',
        meetings: Array.isArray(setting.meetings) ? setting.meetings.length : 0,
        scope: setting.scope === 'public' ? '전체 공개' : '카테고리',
        categories: setting.categories || [],
        active: new Date(setting.deactivationDate || '9999-12-31') > new Date(),
        deactivationDate: setting.deactivationDate,
        createDate: setting.createDate,
        lastUpdated: setting.lastUpdated,
        meetingIds: setting.meetings || []
      }))
      setTypeAItems(transformedItems)
    } catch (error) {
      console.error('Failed to fetch Type A settings:', error)
      alert('Type A 설정을 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingTypeA(false)
    }
  }

  // Fetch Type B settings from API
  const fetchTypeBSettings = async () => {
    setIsLoadingTypeB(true)
    try {
      const typeBSettings = await typeSettingsApiService.getTypeSettings('type_B')
      // Transform API data to match the component's expected format
      const transformedItems = typeBSettings.map((setting: any) => ({
        id: setting.id,
        title: setting.title,
        description: setting.description || '',
        image: setting.image || '',
        status: new Date(setting.deactivationDate || '9999-12-31') > new Date() ? '활성' : '만료됨',
        meetings: Array.isArray(setting.meetings) ? setting.meetings.length : 0,
        scope: setting.scope === 'public' ? '전체 공개' : '카테고리',
        categories: setting.categories || [],
        active: new Date(setting.deactivationDate || '9999-12-31') > new Date(),
        deactivationDate: setting.deactivationDate,
        createDate: setting.createDate,
        lastUpdated: setting.lastUpdated,
        meetingIds: setting.meetings || []
      }))
      setTypeBItems(transformedItems)
    } catch (error) {
      console.error('Failed to fetch Type B settings:', error)
      alert('Type B 설정을 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingTypeB(false)
    }
  }

  // Fetch Type A settings on component mount
  useEffect(() => {
    fetchTypeASettings()
  }, [])

  // Fetch Type B settings on component mount
  useEffect(() => {
    fetchTypeBSettings()
  }, [])

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        if (data.success && data.data) {
          // Add color mapping to categories
          const categoriesWithColors = data.data.map((category: any, index: number) => ({
            ...category,
            color: [
              'bg-blue-100 text-blue-700',
              'bg-green-100 text-green-700',
              'bg-purple-100 text-purple-700',
              'bg-orange-100 text-orange-700',
              'bg-pink-100 text-pink-700',
              'bg-yellow-100 text-yellow-700',
              'bg-indigo-100 text-indigo-700',
              'bg-teal-100 text-teal-700'
            ][index % 8]
          }))
          setCategories(categoriesWithColors)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const toggleTypeAItem = async (id: number) => {
    const item = typeAItems.find(x => x.id === id)
    if (!item) return
    const nextActive = !item.active
    setTypeAItems(items => items.map(it => it.id === id ? { ...it, active: nextActive, status: nextActive ? '활성' : '비활성' } : it))
    try {
      await typeSettingsApiService.updateTypeSetting(id, { status: nextActive ? 'active' : 'inactive' })
    } catch (_e) {
      // revert on failure
      setTypeAItems(items => items.map(it => it.id === id ? { ...it, active: !nextActive, status: !nextActive ? '활성' : '비활성' } : it))
    }
  }

  const toggleTypeBItem = async (id: number) => {
    const item = typeBItems.find(x => x.id === id)
    if (!item) return
    const nextActive = !item.active
    setTypeBItems(items => items.map(it => it.id === id ? { ...it, active: nextActive, status: nextActive ? '활성' : '비활성' } : it))
    try {
      await typeSettingsApiService.updateTypeSetting(id, { status: nextActive ? 'active' : 'inactive' })
    } catch (_e) {
      setTypeBItems(items => items.map(it => it.id === id ? { ...it, active: !nextActive, status: !nextActive ? '활성' : '비활성' } : it))
    }
  }

  // Modal handlers
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSlideForm({ title: '', content: '', imageUrl: '', redirectUrl: '' })
    // (Removed) reset user selection
    setSlideScope('전체')
    setSlideMeetingSearch('')
    setSlideSelectedMeetingId(null)
    setSlideSelectedCategoryIds([])
  }

  const handleFormChange = (field: string, value: string) => {
    setSlideForm(prev => ({ ...prev, [field]: value }))
  }

  // (Removed) user toggle

  const handleSaveSlide = async () => {
    try {
      // Validate required fields
      if (!slideForm.title.trim()) return alert('제목은 필수입니다.')
      if (!slideForm.content.trim()) return alert('내용은 필수입니다.')
      if (!slideForm.imageUrl.trim()) return alert('이미지는 필수입니다.')
      if (!slideSelectedMeetingId) return alert('모임을 선택해주세요.')
      if (slideScope === '카테고리' && slideSelectedCategoryIds.length === 0) return alert('카테고리를 하나 이상 선택해주세요.')

      // Fetch meeting details to get the creator's userId
      let meetingUserId: number | null = null
      if (slideSelectedMeetingId) {
        try {
          const meetingRes = await apiService.get(`/meetings/${slideSelectedMeetingId}`)
          if (meetingRes.success && meetingRes.data) {
            meetingUserId = meetingRes.data.userId || meetingRes.data.user?.id || null
          }
        } catch (meetingErr) {
          console.error('Failed to fetch meeting details:', meetingErr)
          // Continue without userId if meeting fetch fails
        }
      }

      // Derive redirectUrl from selection if available
      let derivedRedirectUrl = slideForm.redirectUrl
      if (slideSelectedMeetingId) {
        derivedRedirectUrl = `/web/meeting/item-detail/${slideSelectedMeetingId}`
      } else if (slideScope === '카테고리' && slideSelectedCategoryIds.length > 0) {
        derivedRedirectUrl = `/web/category/${slideSelectedCategoryIds[0]}`
      }
      const res = await apiService.post('/home-page-settings', {
        title: slideForm.title,
        content: slideForm.content,
        image: slideForm.imageUrl,
        scope: slideScope === '카테고리' ? 'categories' : 'public',
        meetings: slideSelectedMeetingId ? [slideSelectedMeetingId] : [],
        categories: slideScope === '카테고리' ? slideSelectedCategoryIds : [],
        status: 'active',
        userId: meetingUserId
      })
      if (!res.success) throw new Error(res.error || 'Failed to create slide')
      await fetchSlides()
      handleCloseModal()
    } catch (err: any) {
      alert(`슬라이드 생성 실패: ${err?.message || '알 수 없는 오류'}`)
    }
  }

  // (Removed) filtered users

  // Type modal handlers
  const handleOpenTypeModal = () => {
    setIsTypeModalOpen(true)
  }

  const handleCloseTypeModal = () => {
    setIsTypeModalOpen(false)
    setTypeForm({
      type: 'A',
      title: '',
      description: '',
      imageUrl: '',
      deactivationDate: '',
      publicScope: '전체', // Korean value to match radio buttons
      category: '',
      meetings: []
    })
    setMeetingSearch('')
    setSelectedCategories([])
  }

  const handleTypeFormChange = (field: string, value: string | number[]) => {
    setTypeForm(prev => ({ ...prev, [field]: value }))
  }

  const handleMeetingToggle = (meetingId: number) => {
    setTypeForm(prev => ({
      ...prev,
      meetings: prev.meetings.includes(meetingId)
        ? prev.meetings.filter(id => id !== meetingId)
        : [...prev.meetings, meetingId]
    }))
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveType = async () => {
    try {
      // Validate required in Type create
      if (!typeForm.title.trim()) return alert('제목은 필수입니다.')
      if (!typeForm.imageUrl.trim()) return alert('이미지는 필수입니다.')
      if (typeForm.meetings.length === 0) return alert('모임을 하나 이상 선택해주세요.')
      if (typeForm.publicScope === '카테고리' && selectedCategories.length === 0) return alert('카테고리를 하나 이상 선택해주세요.')

      // Map Korean values to English for API
      const publicScopeMapping: Record<string, 'public' | 'categories'> = {
        '전체': 'public',
        '카테고리': 'categories'
      }

      const typeSettingData = {
        type: typeForm.type as 'A' | 'B',
        title: typeForm.title,
        description: typeForm.description,
        image: typeForm.imageUrl,
        deactivationDate: typeForm.deactivationDate,
        publicScope: publicScopeMapping[typeForm.publicScope] || 'public',
        meetings: typeForm.meetings,
        categories: selectedCategories
      }

      console.log('=== SAVING TYPE SETTING ===')
      console.log('Form publicScope (Korean):', typeForm.publicScope)
      console.log('Mapped publicScope (English):', typeSettingData.publicScope)
      console.log('Selected categories:', selectedCategories)
      console.log('Full data:', typeSettingData)

      const result = await typeSettingsApiService.createTypeSetting(typeSettingData)

      if (result.success) {
        // Success - close modal and show success message
        handleCloseTypeModal()
        alert('Type 설정이 성공적으로 저장되었습니다!')
        console.log('Type setting created successfully:', result.data)
        // Refresh Type A or Type B list after creating
        if (typeForm.type === 'A') {
          fetchTypeASettings()
        } else {
          fetchTypeBSettings()
        }
      } else {
        // Error - show error message
        console.error('Failed to create type setting:', result.error)
        alert(`오류가 발생했습니다: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving type setting:', error)
      alert('오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  // Filter meetings based on search
  const filteredMeetings = meetings.filter(meeting =>
    meeting.name.toLowerCase().includes(meetingSearch.toLowerCase()) ||
    meeting.category.toLowerCase().includes(meetingSearch.toLowerCase())
  )

  // Dynamic meeting search for Add Slide modal
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        if (!slideMeetingSearch.trim()) {
          if (active) setSlideMeetingResults([])
          return
        }
        setIsLoadingSlideMeetingSearch(true)
        const res = await fetch(`/api/search/meetings?admin=1&q=${encodeURIComponent(slideMeetingSearch)}`, { signal: controller.signal })
        const data = await res.json()
        const results = Array.isArray(data) ? data : (data.data?.meetings || [])
        if (active) setSlideMeetingResults(results)
      } catch (e) {
        if (active) setSlideMeetingResults([])
      } finally {
        if (active) setIsLoadingSlideMeetingSearch(false)
      }
    }, 300)
    return () => { active = false; controller.abort(); clearTimeout(timeout) }
  }, [slideMeetingSearch])

  // Dynamic meeting search for Edit Slide modal
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        if (!editMeetingSearch.trim()) {
          if (active) setEditMeetingResults([])
          return
        }
        setIsLoadingEditMeetingSearch(true)
        const res = await fetch(`/api/search/meetings?admin=1&q=${encodeURIComponent(editMeetingSearch)}`, { signal: controller.signal })
        const data = await res.json()
        const results = Array.isArray(data) ? data : (data.data?.meetings || [])
        if (active) setEditMeetingResults(results)
      } catch (e) {
        if (active) setEditMeetingResults([])
      } finally {
        if (active) setIsLoadingEditMeetingSearch(false)
      }
    }, 300)
    return () => { active = false; controller.abort(); clearTimeout(timeout) }
  }, [editMeetingSearch])

  // Helper for immediate search on first keystroke
  const immediateSearch = async (
    query: string,
    setLoading: (v: boolean) => void,
    setResults: (rows: any[]) => void
  ) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/search/meetings?admin=1&q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const results = Array.isArray(data) ? data : (data.data?.meetings || [])
      setResults(results)
    } catch (_e) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Image modal handlers
  const handleOpenImageModal = () => {
    setIsImageModalOpen(true)
  }

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false)
    setImageUrl('')
  }

  const handleSaveImage = () => {
    // Here you would typically save the image URL
    // Update the typeForm with the new image URL
    setTypeForm(prev => ({ ...prev, imageUrl }))
    handleCloseImageModal()
  }

  // Edit slide modal handlers
  const handleOpenEditModal = (slide: typeof slideshowItems[0]) => {
    setEditingSlide(slide)
    setEditForm({
      title: slide.title,
      content: slide.description,
      imageUrl: slide.url,
      redirectUrl: slide.redirect
    })
    // Prefill from slide item dynamic fields
    const itemScope = slide.scope === 'categories' ? '카테고리' : '전체'
    setEditSlideScope(itemScope)
    const firstMeetingId = Array.isArray(slide.meetings) && slide.meetings.length > 0 ? slide.meetings[0] : null
    setEditSelectedMeetingId(firstMeetingId)
    const categoryIds = Array.isArray(slide.categories) ? slide.categories : []
    setEditSelectedCategoryIds(categoryIds)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingSlide(null)
    setEditForm({ title: '', content: '', imageUrl: '', redirectUrl: '' })
    setEditSlideScope('전체')
    setEditMeetingSearch('')
    setEditSelectedMeetingId(null)
    setEditSelectedCategoryIds([])
  }

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  // (Removed) edit user toggle

  const handleSaveEditSlide = () => {
    if (editingSlide) {
      (async () => {
        try {
          // Validate required fields
          if (!editForm.title.trim()) return alert('제목은 필수입니다.')
          if (!editForm.content.trim()) return alert('내용은 필수입니다.')
          if (!editForm.imageUrl.trim()) return alert('이미지는 필수입니다.')
          if (!editSelectedMeetingId) return alert('모임을 선택해주세요.')
          if (editSlideScope === '카테고리' && editSelectedCategoryIds.length === 0) return alert('카테고리를 하나 이상 선택해주세요.')

          // Fetch meeting details to get the creator's userId
          let meetingUserId: number | null = null
          if (editSelectedMeetingId) {
            try {
              const meetingRes = await apiService.get(`/meetings/${editSelectedMeetingId}`)
              if (meetingRes.success && meetingRes.data) {
                meetingUserId = meetingRes.data.userId || meetingRes.data.user?.id || null
              }
            } catch (meetingErr) {
              console.error('Failed to fetch meeting details:', meetingErr)
              // Continue without userId if meeting fetch fails
            }
          }

          // Derive redirect URL: prioritize meeting, else category if chosen
          let derivedRedirectUrl = editForm.redirectUrl
          if (editSelectedMeetingId) {
            derivedRedirectUrl = `/web/meeting/item-detail/${editSelectedMeetingId}`
          } else if (editSlideScope === '카테고리' && editSelectedCategoryIds.length > 0) {
            derivedRedirectUrl = `/web/category/${editSelectedCategoryIds[0]}`
          }
          const res = await apiService.put(`/home-page-settings/${editingSlide.id}`, {
            title: editForm.title,
            content: editForm.content,
            image: editForm.imageUrl,
            scope: editSlideScope === '카테고리' ? 'categories' : 'public',
            meetings: editSelectedMeetingId ? [editSelectedMeetingId] : [],
            categories: editSlideScope === '카테고리' ? editSelectedCategoryIds : [],
            status: 'active',
            userId: meetingUserId
          })
          if (!res.success) throw new Error(res.error || 'Failed to update slide')
          await fetchSlides()
          handleCloseEditModal()
        } catch (err: any) {
          alert(`슬라이드 업데이트 실패: ${err?.message || '알 수 없는 오류'}`)
        }
      })()
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
  }

  const handleDragOver = (e: React.DragEvent, itemId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(itemId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetItemId: number) => {
    e.preventDefault()

    if (draggedItem === null || draggedItem === targetItemId) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    // Reorder the items
    setSlideshowItems(items => {
      const newItems = [...items]
      const draggedIndex = newItems.findIndex(item => item.id === draggedItem)
      const targetIndex = newItems.findIndex(item => item.id === targetItemId)

      // Remove the dragged item
      const [draggedItemData] = newItems.splice(draggedIndex, 1)

      // Insert it at the target position
      newItems.splice(targetIndex, 0, draggedItemData)

      // Update order numbers
      return newItems.map((item, index) => ({
        ...item,
        order: index + 1
      }))
    })

    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Type edit modal handlers
  const handleOpenTypeEditModal = (typeItem: typeof typeAItems[0] | typeof typeBItems[0], category: 'A' | 'B') => {
    setEditingType(typeItem)
    setEditingTypeCategory(category)

    // Set different data based on type
    if (category === 'A') {
      // Map scope back to Korean for the form
      const publicScopeKorean = typeItem.scope === '전체 공개' ? '전체' : '카테고리'

      // Format deactivationDate for date input (YYYY-MM-DD)
      let deactivationDateFormatted = ''
      if (typeItem.deactivationDate) {
        const date = new Date(typeItem.deactivationDate)
        deactivationDateFormatted = date.toISOString().split('T')[0]
      }

      setTypeEditForm({
        type: 'A',
        title: typeItem.title,
        description: typeItem.description || '',
        imageUrl: typeItem.image || '',
        deactivationDate: deactivationDateFormatted,
        publicScope: publicScopeKorean,
        category: '',
        meetings: []
      })

      // Set selected meetings from meetingIds
      setTypeEditSelectedMeetings(Array.isArray(typeItem.meetingIds) ? typeItem.meetingIds : [])

      // Set selected categories from categories array
      setTypeEditSelectedCategories(Array.isArray(typeItem.categories) ? typeItem.categories : [])
    } else {
      // Type B data (keep existing logic for now)
      setTypeEditForm({
        type: 'B',
        title: typeItem.title,
        description: typeItem.description || '',
        imageUrl: typeItem.image || '',
        deactivationDate: typeItem.deactivationDate ? new Date(typeItem.deactivationDate).toISOString().split('T')[0] : '',
        publicScope: typeItem.scope === '전체 공개' ? '전체' : '카테고리',
        category: '',
        meetings: []
      })
      setTypeEditSelectedMeetings(Array.isArray(typeItem.meetingIds) ? typeItem.meetingIds : [])
      setTypeEditSelectedCategories(Array.isArray(typeItem.categories) ? typeItem.categories : [])
    }

    setTypeEditMeetingSearch('')
    setIsTypeEditModalOpen(true)
  }

  const handleCloseTypeEditModal = () => {
    setIsTypeEditModalOpen(false)
    setEditingType(null)
    setEditingTypeCategory('A')
    setTypeEditForm({
      type: 'A',
      title: '',
      description: '',
      imageUrl: '',
      deactivationDate: '',
      publicScope: '전체', // Korean value to match radio buttons
      category: '',
      meetings: []
    })
    setTypeEditSelectedMeetings([])
    setTypeEditMeetingSearch('')
    setTypeEditSelectedCategories([])
  }

  const handleTypeEditFormChange = (field: string, value: string | number[]) => {
    setTypeEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeEditMeetingToggle = (meetingId: number) => {
    setTypeEditSelectedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    )
  }

  const handleTypeEditCategoryToggle = (categoryId: number) => {
    setTypeEditSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveTypeEdit = async () => {
    if (!editingType) return

    try {
      // Validate required in Type edit
      if (!typeEditForm.title.trim()) return alert('제목은 필수입니다.')
      if (!typeEditForm.imageUrl.trim()) return alert('이미지는 필수입니다.')
      if (typeEditSelectedMeetings.length === 0) return alert('모임을 하나 이상 선택해주세요.')
      if (typeEditForm.publicScope === '카테고리' && typeEditSelectedCategories.length === 0) return alert('카테고리를 하나 이상 선택해주세요.')

      // Map Korean values to English for API
      const publicScopeMapping: Record<string, 'public' | 'categories'> = {
        '전체': 'public',
        '카테고리': 'categories'
      }

      const typeSettingData = {
        type: typeEditForm.type as 'A' | 'B',
        title: typeEditForm.title,
        description: typeEditForm.description,
        image: typeEditForm.imageUrl,
        deactivationDate: typeEditForm.deactivationDate,
        publicScope: publicScopeMapping[typeEditForm.publicScope] || 'public',
        meetings: typeEditSelectedMeetings,
        categories: typeEditSelectedCategories
      }

      console.log('=== UPDATING TYPE SETTING ===')
      console.log('Type setting ID:', editingType.id)
      console.log('Form publicScope (Korean):', typeEditForm.publicScope)
      console.log('Mapped publicScope (English):', typeSettingData.publicScope)
      console.log('Selected categories:', typeEditSelectedCategories)
      console.log('Selected meetings:', typeEditSelectedMeetings)
      console.log('Full data:', typeSettingData)

      const result = await typeSettingsApiService.updateTypeSetting(editingType.id, typeSettingData)

      if (result.success) {
        // Success - close modal and show success message
        handleCloseTypeEditModal()
        alert('Type 설정이 성공적으로 업데이트되었습니다!')
        console.log('Type setting updated successfully:', result.data)
        // Refresh Type A or Type B list after updating
        if (editingTypeCategory === 'A') {
          fetchTypeASettings()
        } else {
          fetchTypeBSettings()
        }
      } else {
        // Error - show error message
        console.error('Failed to update type setting:', result.error)
        alert(`오류가 발생했습니다: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating type setting:', error)
      alert('오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <AdminProtectedRoute>
      <Box className="min-h-screen ">
        {/* Header */}
        <Box className="mb-6">
          <Typography variant="h6" className="text-black mb-2">
            <span className="text-gray-500">님 반갑습니다.</span>
          </Typography>
        </Box>
        <Box className="mb-4 flex justify-between items-center">
          <Box className="">

            <Typography variant="h5" className=" text-gray-900 mb-2">
              홈 관리
            </Typography>
            <Typography variant="body1" className="text-gray-500">
              홈 화면에 표시될 콘텐츠를 관리합니다
            </Typography>
            {/* FOR INTERNAL USE ONLY — the noldam - commented out as there's no header to center it in */}
            {/* <Typography variant="caption" className="text-gray-500 text-center block">
              FOR INTERNAL USE ONLY — the noldam
            </Typography> */}
          </Box>
          <Box className="flex gap-3">
            <Button
              variant="contained"
              size="small"
              startIcon={<i className="ri-add-line" />}
              className="bg-black rounded-md hover:bg-gray-800 text-white"
              onClick={handleOpenModal}
            >
              슬라이드 추가
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<i className="ri-add-line" />}
              className="bg-black rounded-md hover:bg-gray-800 text-white"
              onClick={handleOpenTypeModal}
            >
              새로운 Type 추가
            </Button>
          </Box>
        </Box>

        <Box>
          {/* Main Content */}
          {/* 슬라이드쇼 관리 */}
          <Card className="mb-6 shadow-none border border-gray-200 rounded-3xl">
            <CardContent>
              <Box className="flex justify-between items-center mb-4">
                <Box className="flex items-center gap-2">
                  <i className="ri-computer-line text-lg text-black" />
                  <Typography variant="h6" className="text-black">
                    슬라이드쇼 관리
                  </Typography>
                  <Chip label={`${typeAItems.filter(it => it.active).length}개 활성`} color="default" size="small" className="bg-gray-200 text-black" />
                </Box>
              </Box>
              <Box className="space-y-4">
                {isLoadingSlides ? (
                  <Box className="text-center py-4">
                    <Typography className="text-gray-500">로딩 중...</Typography>
                  </Box>
                ) : slideshowItems.map((item) => (

                  <Box
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-100 p-4 border border-gray-200 rounded-lg bg-white transition-all duration-200 
    ${draggedItem === item.id ? 'opacity-50 scale-95' : ''} 
    ${dragOverItem === item.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  >
                    <Box className="flex items-start sm:items-center gap-3 flex-1 w-full sm:w-2/3">
                      <i
                        className="ri-draggable text-gray-700 text-xl cursor-grab hover:text-black transition-colors flex-shrink-0"
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-10 h-12 object-cover rounded-sm flex-shrink-0"
                        />
                      ) : (
                        <Box className="w-10 h-12 rounded bg-gray-100 border border-gray-200 flex-shrink-0" />
                      )}

                      <Box className="flex-1 min-w-0">
                        {/* Title + Tags */}
                        <Box className="flex flex-wrap items-center gap-2 mb-1">
                          <Typography className="font-medium text-black text-[14px] break-words whitespace-normal max-w-full sm:max-w-[70%]">
                            {item.title}
                          </Typography>
                          <Chip
                            label={item.status}
                            size="small"
                            className={
                              item.active
                                ? 'bg-black text-white rounded-lg'
                                : 'bg-gray-200 text-gray-700 rounded-lg'
                            }
                          />
                          <Typography variant="caption" className="text-gray-500 text-[12px]">
                            순서: {item.order}
                          </Typography>
                        </Box>

                        {/* Description */}
                        <Typography className="text-gray-600 text-[12px] mb-1 break-words whitespace-normal max-w-full sm:max-w-[70%]">
                          {item.description}
                        </Typography>

                        {/* Meta info */}
                        <Box className="flex flex-wrap items-center gap-2 text-[10px]">
                          <Box
                            className={`${item.scope === 'public'
                              ? 'bg-black text-white'
                              : 'bg-gray-100 text-black'
                              } border border-gray-300 rounded-lg px-2 py-0.5`}
                          >
                            {item.scope === 'public' ? '전체' : '카테고리'}
                          </Box>
                          <Typography className="text-gray-600 text-[10px]">
                            모임: {Array.isArray(item.meetings) ? item.meetings.length : 0}개
                          </Typography>
                          {item.scope !== 'public' && (
                            <Typography className="text-gray-600 text-[10px]">
                              카테고리: {Array.isArray(item.categories) ? item.categories.length : 0}개
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
                      <Switch
                        checked={item.active}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSlideshowItem(item.id, !item.active)
                        }}
                        color="default"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'white' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'black',
                          },
                        }}
                      />
                      <Box className="border border-gray-300 rounded-lg">
                        <IconButton
                          size="small"
                          className="border px-2 py-1 border-gray-300 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditModal(item)
                          }}
                        >
                          <i className="ri-edit-line text-black text-sm" />
                        </IconButton>
                      </Box>
                      <Box className="border border-gray-300 rounded-lg">
                        <IconButton
                          size="small"
                          color="error"
                          className="border px-2 py-1 border-gray-300 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSlide(item.id)
                          }}
                        >
                          <i className="ri-delete-bin-line text-black text-sm" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>

                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Type A and Type B sections */}
          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 현재 활성화된 Type A */}
            <Card className='shadow-none border border-gray-200 rounded-3xl'  >
              <CardContent>
                <Box className="flex justify-start items-center gap-2 mb-4">
                  <Typography className="text-black text-[14px]">
                    현재 활성화된 Type A
                  </Typography>
                  <Chip label={`${typeAItems.filter(item => item.active).length}개`} color="default" size="small" className="bg-gray-200 text-black text-[12px]" />
                </Box>
                <Box className="p-2  flex justify-between items-center border border-gray-200 rounded-lg ">
                  <Box>
                    <Typography className=" text-black mb-1 text-[14px]">
                      추천 모임
                    </Typography>
                    <Typography className="text-gray-600 mb-1 text-[12px]">
                      이번 주 가장 인기 있는 모임들을 만나보세요
                    </Typography>
                    <Typography className="text-red-500 mb-1 block text-[11px]">
                      만료됨
                    </Typography>
                  </Box>
                  <Box className="bg-black rounded-lg text-white text-[10px] px-2 py-1"
                  >
                    전체 공개
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 현재 활성화된 Type B */}
            <Card className='shadow-none border border-gray-200 rounded-3xl'  >
              <CardContent>
                <Box className="flex justify-start items-center gap-2 mb-4">
                  <Typography className=" text-black text-[14px]">
                    현재 활성화된 Type B
                  </Typography>
                  <Chip label={`${typeBItems.filter(item => item.active).length}개`} color="default" size="small" className="bg-gray-200 text-black" />
                </Box>
                {typeBItems.filter(item => item.active).length > 0 ? (
                  typeBItems.filter(item => item.active).slice(0, 1).map((item) => {
                    const categoryNames = categories
                      .filter(cat => item.categories.includes(cat.id))
                      .map(cat => cat.name)

                    return (
                      <Box key={item.id} className="p-2 flex justify-between items-center border border-gray-200 rounded-lg ">
                        <Box>
                          <Typography className=" text-black mb-1 text-[14px]">
                            {item.title}
                          </Typography>
                          <Typography className="text-gray-600 mb-1 text-[12px]">
                            {item.description || '설명이 없습니다.'}
                          </Typography>
                          {!item.active && (
                            <Typography className="text-red-500 mb-1 block text-[11px]">
                              만료됨
                            </Typography>
                          )}
                        </Box>
                        <Box className={`${item.scope === '전체 공개' ? 'bg-black' : 'bg-gray-100'} border border-gray-300 rounded-lg ${item.scope === '전체 공개' ? 'text-white' : 'text-black'} text-[10px] px-2 py-1`}>
                          {item.scope}
                        </Box>
                      </Box>
                    )
                  })
                ) : (
                  <Box className="p-2 text-center">
                    <Typography className="text-gray-500 text-[12px]">
                      활성화된 Type B가 없습니다.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Type A 리스트 */}

          <Card className="mb-6 shadow-none border border-gray-200 rounded-3xl">
            <CardContent>
              <Box className="flex justify-start gap-2 items-center mb-4">
                <Typography className="text-black text-[14px]">
                  Type A 리스트
                </Typography>
                <Box className="border bg-white border-gray-300 rounded-lg text-black text-[12px]">
                  <Chip label={`${typeAItems.length}개`} size="small" className="bg-white " />
                </Box>
              </Box>

              {isLoadingTypeA ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">로딩 중...</Typography>
                </Box>
              ) : typeAItems.length === 0 ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">Type A 설정이 없습니다.</Typography>
                </Box>
              ) : (
                typeAItems.map((item) => (
                  <Box
                    key={item.id}
                    className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors mb-4 last:mb-0"
                  >
                    <Box className="flex items-center gap-4">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&h=80&fit=crop"}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&h=80&fit=crop"
                        }}
                      />
                      <Box className="flex-1">
                        <Box className="flex items-center gap-2 mb-1 flex-wrap">
                          <Typography variant="subtitle1" className="font-medium text-black break-words whitespace-normal max-w-full">
                            {item.title}
                          </Typography>
                          <Box className={`border px-2 py-0.5 ${item.active ? 'bg-black' : 'bg-gray-400'} border-gray-300 rounded-lg text-white text-[10px]`}>
                            {item.status}
                          </Box>
                          <Box className="border px-2 py-0.5 bg-black border-gray-300 rounded-lg text-white text-[10px]">
                            {item.scope}
                          </Box>
                        </Box>
                        <Typography className="text-gray-600 mb-2 text-[12px] break-words whitespace-normal">
                          {item.description || '설명이 없습니다.'}
                        </Typography>
                        <Box className="flex items-center gap-4 text-xs text-gray-500">
                          <span><i className="ri-circle-line text-sm text-gray-500" /> {item.meetings}개 모임</span>
                        </Box>
                        {item.deactivationDate && new Date(item.deactivationDate) < new Date() && (
                          <Typography className="text-red-500 mt-2 block text-[10px]">
                            만료됨
                          </Typography>
                        )}
                      </Box>
                      <Box className="flex items-center gap-2">
                        <Switch
                          checked={item.active}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleTypeAItem(item.id)
                          }}
                          color="default"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'white',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: 'black',
                            },
                          }}
                        />
                        <Box className='border border-gray-300 rounded-lg'>
                          <IconButton
                            size="small"
                            className='border px-2 py-1 border-gray-300 rounded-lg'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenTypeEditModal(item, 'A')
                            }}
                          >
                            <i className="ri-edit-line text-black text-sm" />
                          </IconButton>
                        </Box>
                        <Box className='border border-gray-300 rounded-lg'>
                          <IconButton
                            size="small"
                            color="error"
                            className='border px-2 py-1 border-gray-300 rounded-lg'
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTypeSetting(item.id, 'A')
                            }}
                          >
                            <i className="ri-delete-bin-line text-black text-sm" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          {/* Type B 리스트 */}
          <Card className="mb-6 shadow-none border border-gray-200 rounded-3xl">
            <CardContent>
              <Box className="flex justify-start items-center gap-2  mb-4">
                <Typography className="  text-black text-[14px]">
                  Type B 리스트
                </Typography>
                <Box className="border bg-white border-gray-300 rounded-lg text-black text-[12px]">
                  <Chip label={`${typeBItems.length}개`} size="small" className="bg-white " />
                </Box>
              </Box>

              {isLoadingTypeB ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">로딩 중...</Typography>
                </Box>
              ) : typeBItems.length === 0 ? (
                <Box className="text-center py-8">
                  <Typography className="text-gray-500">Type B 설정이 없습니다.</Typography>
                </Box>
              ) : (
                typeBItems.map((item) => {
                  // Get category names for display
                  const categoryNames = categories
                    .filter(cat => item.categories.includes(cat.id))
                    .map(cat => cat.name)

                  return (
                    <Box
                      key={item.id}
                      className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors mb-4 last:mb-0"
                    >
                      <Box className="flex items-center gap-4">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=80&fit=crop"}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=80&fit=crop"
                          }}
                        />
                        <Box className="flex-1">
                          <Box className="flex items-center gap-2 mb-1 flex-wrap">
                            <Typography variant="subtitle1" className="font-medium text-black" sx={{ maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </Typography>
                            <Box className={`border px-2 py-0.5 ${item.active ? 'bg-black' : 'bg-gray-400'} border-gray-300 rounded-lg text-white text-[10px]`}>
                              {item.status}
                            </Box>
                            <Box className={`border px-2 py-0.5 ${item.scope === '전체 공개' ? 'bg-black' : 'bg-white'} border-gray-300 rounded-lg ${item.scope === '전체 공개' ? 'text-white' : 'text-black'} text-[10px]`}>
                              {item.scope}
                            </Box>
                            {/* Category chips */}
                            {item.scope === '카테고리' && categoryNames.length > 0 && categoryNames.map((categoryName, idx) => {
                              const category = categories.find(cat => cat.name === categoryName)
                              return (
                                <Box key={idx} className={`px-2 py-0.5 rounded-lg text-[10px] ${category?.color || 'bg-gray-100 text-gray-700'}`}>
                                  {categoryName}
                                </Box>
                              )
                            })}
                          </Box>
                          <Typography className="text-gray-600 mb-2 text-[12px] break-words whitespace-normal">
                            {item.description || '설명이 없습니다.'}
                          </Typography>
                          <Box className="flex items-center gap-4 text-xs text-gray-500">
                            <span><i className="ri-circle-line text-sm text-gray-500" /> {item.meetings}개 모임</span>
                          </Box>
                          {item.deactivationDate && new Date(item.deactivationDate) < new Date() && (
                            <Typography className="text-red-500 mt-2 block text-[10px]">
                              만료됨
                            </Typography>
                          )}
                        </Box>
                        <Box className="flex items-center gap-2">
                          <Switch
                            checked={item.active}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleTypeBItem(item.id)
                            }}
                            color="default"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'white',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'black',
                              },
                            }}
                          />
                          <Box className='border border-gray-300 rounded-lg'>
                            <IconButton
                              size="small"
                              className='border px-2 py-1 border-gray-300 rounded-lg'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenTypeEditModal(item, 'B')
                              }}
                            >
                              <i className="ri-edit-line text-black text-sm" />
                            </IconButton>
                          </Box>
                          <Box className='border border-gray-300 rounded-lg'>
                            <IconButton
                              size="small"
                              color="error"
                              className='border px-2 py-1 border-gray-300 rounded-lg'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTypeSetting(item.id, 'B')
                              }}
                            >
                              <i className="ri-delete-bin-line text-black text-sm" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  )
                })
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Add Slide Modal */}
        <Modal
          open={isModalOpen}
          onClose={handleCloseModal}
          className="flex items-center justify-center"
        >
          <Box className="bg-white rounded-2xl py-3 px-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-1">
              <Typography variant="h6" className="text-black font-semibold">
                새 슬라이드 추가
              </Typography>
              <IconButton onClick={handleCloseModal} size="small">
                <i className="ri-close-line text-gray-500" />
              </IconButton>
            </Box>

            {/* Form Fields */}
            <Box className="space-y-2 mb-2">
              {/* 슬라이드 제목 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  슬라이드 제목
                </Typography>
                <TextField
                  fullWidth
                  placeholder="슬라이드 제목을 입력하세요"
                  value={slideForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  variant="outlined"
                  className="text-[1px]"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 슬라이드 내용 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  슬라이드 내용
                </Typography>
                <TextField
                  fullWidth
                  placeholder="슬라이드 내용을 입력하세요"
                  value={slideForm.content}
                  onChange={(e) => handleFormChange('content', e.target.value)}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 이미지 업로드 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">이미지</Typography>
                <Box className="flex items-center gap-2">
                  {slideForm.imageUrl ? (
                    <img src={slideForm.imageUrl} alt="slide" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <Box className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />
                  )}
                  <input ref={slideImageInputRef} type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleFileUpload(file, (url) => handleFormChange('imageUrl', url))
                  }} />
                  <Button variant="outlined" size="small" onClick={() => slideImageInputRef.current?.click()}>이미지 업로드</Button>
                </Box>
              </Box>

              {/* 공개 범위 */}
              <Box className="mb-2">
                <Typography variant="body2" className="text-black font-medium ">
                  공개 범위
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={slideScope}
                    className="flex flex-col gap-0"
                    onChange={(e) => setSlideScope(e.target.value as '전체' | '카테고리')}
                    row
                  >
                    <FormControlLabel
                      value="전체"
                      control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                      label="전체"
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                      className="text-black"
                    />
                    <FormControlLabel
                      value="카테고리"
                      control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                      label="카테고리"
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                      className="text-black"
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* 리다이렉트 대상 선택 (모임/카테고리 동시 표시) */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">모임 선택</Typography>
                <TextField
                  fullWidth
                  placeholder="모임 검색..."
                  value={slideMeetingSearch}
                  onChange={(e) => {
                    const q = e.target.value
                    setSlideMeetingSearch(q)
                    if (q && q.length === 1) {
                      // immediate fetch on first char so user sees a request
                      immediateSearch(q, setIsLoadingSlideMeetingSearch, setSlideMeetingResults)
                    }
                  }}
                  variant="outlined"
                  size="small"
                  className="mb-2"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      '& fieldset': { borderColor: '#e0e0e0' },
                      '&:hover fieldset': { borderColor: '#bdbdbd' },
                      '&.Mui-focused fieldset': { borderColor: '#1976d2' }
                    }
                  }}
                />
                <Box className="border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                  <List dense>
                    {isLoadingSlideMeetingSearch ? (
                      <ListItem>
                        <Typography variant="body2" className="text-gray-500">모임을 불러오는 중...</Typography>
                      </ListItem>
                    ) : slideMeetingSearch.trim() && slideMeetingResults.length === 0 ? (
                      <ListItem>
                        <Typography variant="body2" className="text-gray-500">검색어와 일치하는 모임이 없습니다.</Typography>
                      </ListItem>
                    ) : (
                      (slideMeetingSearch.trim() ? slideMeetingResults : realMeetings)
                        .map((meeting) => {
                          const title = meeting.title || meeting.meetingName || '모임'
                          const category = meeting.category || ''
                          return (
                            <ListItem key={meeting.id} className="py-0 px-2 gap-0 flex items-center justify-start">
                              <ListItemIcon className="min-w-0">
                                <Radio
                                  checked={slideSelectedMeetingId === meeting.id}
                                  onChange={() => {
                                    setSlideSelectedMeetingId(meeting.id)
                                  }}
                                  size="small"
                                  sx={{ color: 'gray', '&.Mui-checked': { color: 'black' } }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box className="flex items-center">
                                    <Typography variant="body2" className="text-black">
                                      {title}{category ? ` (${category})` : ''}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                          )
                        })
                    )}
                  </List>
                </Box>

                {slideScope === '카테고리' && (
                  <>
                    <Typography variant="body2" className="text-gray-700 font-medium mt-3">카테고리 선택</Typography>
                    <Box className="space-y-0.5 px-2 py-1.5 border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                      {isLoadingCategories ? (
                        <Typography variant="body2" className="text-gray-500 text-center py-2">카테고리를 불러오는 중...</Typography>
                      ) : (
                        categories.map((category) => (
                          <Box key={category.id} className="flex items-center gap-1">
                            <Checkbox
                              checked={slideSelectedCategoryIds.includes(category.id)}
                              onChange={() => {
                                setSlideSelectedCategoryIds(prev => prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id])
                              }}
                              size="small"
                              sx={{ color: 'gray', '&.Mui-checked': { color: 'black' } }}
                            />
                            <Box className={`px-2 py-1 rounded-lg text-[10px] ${category.color}`}>
                              {category.name}
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Box>

            {/* (Removed) Target Users Selection */}

            {/* Action Buttons */}
            <Box className="flex gap-3 justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseModal}
                className="border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveSlide}
                className="bg-black text-white hover:bg-gray-800"
              >
                저장
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Add Type Modal */}
        <Modal
          open={isTypeModalOpen}
          onClose={handleCloseTypeModal}
          className="flex items-center justify-center"
        >
          <Box className="bg-white rounded-2xl py-3 px-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-1">
              <Typography variant="h6" className="text-black font-semibold">
                새 Type 추가
              </Typography>
              <IconButton onClick={handleCloseTypeModal} size="small">
                <i className="ri-close-line text-gray-500" />
              </IconButton>
            </Box>

            {/* Type Selection */}
            <Box className="mb-1">
              <Typography variant="body2" className="text-black font-medium">
                Type
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={typeForm.type}
                  className="flex flex-col justify-between items-center"
                  onChange={(e) => handleTypeFormChange('type', e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="A"
                    control={<Radio size="small" sx={{ color: 'white', '&.Mui-checked': { color: 'black' } }} />}
                    label="Type A"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                  <FormControlLabel
                    value="B"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="Type B"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                </RadioGroup>
              </FormControl>

            </Box>

            {/* Form Fields */}
            <Box className="space-y-2 mb-2">
              {/* 제목 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  제목
                </Typography>
                <TextField
                  fullWidth
                  placeholder="제목을 입력하세요"
                  value={typeForm.title}
                  onChange={(e) => handleTypeFormChange('title', e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 설명 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  설명
                </Typography>
                <TextField
                  fullWidth
                  placeholder="설명을 입력하세요"
                  value={typeForm.description}
                  onChange={(e) => handleTypeFormChange('description', e.target.value)}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 이미지 업로드 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">이미지</Typography>
                <Box className="flex items-center gap-2">
                  {typeForm.imageUrl ? (
                    <img src={typeForm.imageUrl} alt="type" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <Box className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />
                  )}
                  <input ref={typeImageInputRef} type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleFileUpload(file, (url) => handleTypeFormChange('imageUrl', url))
                  }} />
                  <Button variant="outlined" size="small" onClick={() => typeImageInputRef.current?.click()}>이미지 업로드</Button>
                </Box>
              </Box>

              {/* 비활성화 일시 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  비활성화 일시
                </Typography>
                <Box className="flex items-center gap-2">
                  <TextField
                    fullWidth
                    type="date"
                    value={typeForm.deactivationDate}
                    onChange={(e) => handleTypeFormChange('deactivationDate', e.target.value)}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '12px',
                        '& fieldset': {
                          borderColor: '#e0e0e0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#bdbdbd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* 공개 범위 */}
            <Box className="mb-2">
              <Typography variant="body2" className="text-black font-medium ">
                공개 범위
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={typeForm.publicScope}
                  className="flex flex-col gap-0"
                  onChange={(e) => handleTypeFormChange('publicScope', e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="전체"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="전체"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                  <FormControlLabel
                    value="카테고리"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="카테고리"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* 모임 선택 */}
            <Box className="mb-2">
              <Typography variant="body2" className="text-black font-medium">
                모임 선택
              </Typography>

              <TextField
                fullWidth
                placeholder="모임 검색..."
                value={meetingSearch}
                onChange={(e) => setMeetingSearch(e.target.value)}
                variant="outlined"
                size="small"
                className="mb-3"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#bdbdbd',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />

              <Box className="border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                <List dense>
                  {isLoadingMeetings ? (
                    <ListItem>
                      <Typography variant="body2" className="text-gray-500">
                        모임을 불러오는 중...
                      </Typography>
                    </ListItem>
                  ) : (
                    realMeetings
                      .filter(meeting =>
                        meeting.title.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                        meeting.category.toLowerCase().includes(meetingSearch.toLowerCase())
                      )
                      .map((meeting) => (
                        <ListItem key={meeting.id} className="py-0 px-2 gap-0 flex items-center justify-start">
                          <ListItemIcon className="min-w-0">
                            <Checkbox
                              checked={typeForm.meetings.includes(meeting.id)}
                              onChange={() => handleMeetingToggle(meeting.id)}
                              size="small"
                              sx={{
                                color: 'gray',
                                '&.Mui-checked': {
                                  color: 'black',
                                },
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box className="flex items-center">
                                <Typography variant="body2" className="text-black">
                                  {meeting.title} ({meeting.category}) - {meeting.members}명 참여
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))
                  )}
                </List>
              </Box>
            </Box>

            {typeForm.publicScope === '카테고리' && (
              <Box className="mb-2">
                <Typography variant="body2" className="text-black font-medium">
                  카테고리 선택
                </Typography>

                <Box className="space-y-0.5 px-2 py-1.5 border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                  {isLoadingCategories ? (
                    <Typography variant="body2" className="text-gray-500 text-center py-2">
                      카테고리를 불러오는 중...
                    </Typography>
                  ) : (
                    categories.map((category) => (
                      <Box key={category.id} className="flex items-center gap-1">
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          size="small"
                          sx={{
                            color: 'gray',
                            '&.Mui-checked': {
                              color: 'black',
                            },
                          }}
                        />
                        <Box className={`px-2 py-1 rounded-lg text-[10px] ${category.color}`}>
                          {category.name}
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            <Box className="flex gap-3 justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseTypeModal}
                className="border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveType}
                className="bg-black text-white text-sm hover:bg-gray-800"
              >
                저장
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Add Image Modal */}
        <Modal
          open={isImageModalOpen}
          onClose={handleCloseImageModal}
          className="flex items-center justify-center"
        >
          <Box className="bg-white rounded-2xl py-4 px-6 w-full max-w-sm mx-4 shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-2">
              <Typography variant="h6" className="text-black font-semibold">
                이미지 추가
              </Typography>
              <IconButton onClick={handleCloseImageModal} size="small">
                <i className="ri-close-line text-gray-500" />
              </IconButton>
            </Box>

            {/* Image URL Input */}
            <Box className="mb-3">
              <Typography variant="body2" className="text-black font-medium  mb-1">
                이미지 URL
              </Typography>
              <TextField
                fullWidth
                placeholder="이미지 URL을 입력하세요"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    fontSize: '12px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#bdbdbd',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            </Box>


            {/* Action Buttons */}
            <Box className="flex gap-3 justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseImageModal}
                className="border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveImage}
                className="bg-black text-white text-sm hover:bg-gray-800"
              >
                저장
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Edit Slide Modal */}
        <Modal
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          className="flex items-center justify-center"
        >
          <Box className="bg-white rounded-2xl py-3 px-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-1">
              <Typography variant="h6" className="text-black font-semibold">
                슬라이드 수정
              </Typography>
              <IconButton onClick={handleCloseEditModal} size="small">
                <i className="ri-close-line text-gray-500" />
              </IconButton>
            </Box>

            {/* Form Fields */}
            <Box className="space-y-2 mb-2">
              {/* 슬라이드 제목 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  슬라이드 제목
                </Typography>
                <TextField
                  fullWidth
                  placeholder="슬라이드 제목을 입력하세요"
                  value={editForm.title}
                  onChange={(e) => handleEditFormChange('title', e.target.value)}
                  variant="outlined"
                  className="text-[1px]"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 슬라이드 내용 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  슬라이드 내용
                </Typography>
                <TextField
                  fullWidth
                  placeholder="슬라이드 내용을 입력하세요"
                  value={editForm.content}
                  onChange={(e) => handleEditFormChange('content', e.target.value)}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 이미지 업로드 */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">이미지</Typography>
                <Box className="flex items-center gap-2">
                  {editForm.imageUrl ? (
                    <img src={editForm.imageUrl} alt="slide" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <Box className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />
                  )}
                  <input ref={editSlideImageInputRef} type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleFileUpload(file, (url) => handleEditFormChange('imageUrl', url))
                  }} />
                  <Button variant="outlined" size="small" onClick={() => editSlideImageInputRef.current?.click()}>이미지 업로드</Button>
                </Box>
              </Box>

              {/* 공개 범위 (수정) */}
              <Box className="mb-2">
                <Typography variant="body2" className="text-black font-medium ">공개 범위</Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={editSlideScope}
                    className="flex flex-col gap-0"
                    onChange={(e) => setEditSlideScope(e.target.value as '전체' | '카테고리')}
                    row
                  >
                    <FormControlLabel
                      value="전체"
                      control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                      label="전체"
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                      className="text-black"
                    />
                    <FormControlLabel
                      value="카테고리"
                      control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                      label="카테고리"
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                      className="text-black"
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* 모임 선택 (수정) */}
              <Box>
                <Typography variant="body2" className="text-gray-700 font-medium">모임 선택</Typography>
                <TextField
                  fullWidth
                  placeholder="모임 검색..."
                  value={editMeetingSearch}
                  onChange={(e) => {
                    const q = e.target.value
                    setEditMeetingSearch(q)
                    if (q && q.length === 1) {
                      immediateSearch(q, setIsLoadingEditMeetingSearch, setEditMeetingResults)
                    }
                  }}
                  variant="outlined"
                  size="small"
                  className="mb-2"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      '& fieldset': { borderColor: '#e0e0e0' },
                      '&:hover fieldset': { borderColor: '#bdbdbd' },
                      '&.Mui-focused fieldset': { borderColor: '#1976d2' }
                    }
                  }}
                />
                <Box className="border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                  <List dense>
                    {isLoadingMeetings ? (
                      <ListItem>
                        <Typography variant="body2" className="text-gray-500">모임을 불러오는 중...</Typography>
                      </ListItem>
                    ) : (
                      realMeetings
                        .filter(m =>
                          (m.title || '').toLowerCase().includes(editMeetingSearch.toLowerCase()) ||
                          (m.category || '').toLowerCase().includes(editMeetingSearch.toLowerCase())
                        )
                        .map((meeting) => (
                          <ListItem key={meeting.id} className="py-0 px-2 gap-0 flex items-center justify-start">
                            <ListItemIcon className="min-w-0">
                              <Radio
                                checked={editSelectedMeetingId === meeting.id}
                                onChange={() => {
                                  setEditSelectedMeetingId(meeting.id)
                                }}
                                size="small"
                                sx={{ color: 'gray', '&.Mui-checked': { color: 'black' } }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box className="flex items-center">
                                  <Typography variant="body2" className="text-black">
                                    {meeting.title} ({meeting.category})
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))
                    )}
                  </List>
                </Box>
              </Box>

              {/* 카테고리 선택 (수정) */}
              {editSlideScope === '카테고리' && (
                <Box className="mt-3">
                  <Typography variant="body2" className="text-gray-700 font-medium">카테고리 선택</Typography>
                  <Box className="space-y-0.5 px-2 py-1.5 border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                    {isLoadingCategories ? (
                      <Typography variant="body2" className="text-gray-500 text-center py-2">카테고리를 불러오는 중...</Typography>
                    ) : (
                      categories.map((category) => (
                        <Box key={category.id} className="flex items-center gap-1">
                          <Checkbox
                            checked={editSelectedCategoryIds.includes(category.id)}
                            onChange={() => {
                              setEditSelectedCategoryIds(prev => prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id])
                            }}
                            size="small"
                            sx={{ color: 'gray', '&.Mui-checked': { color: 'black' } }}
                          />
                          <Box className={`px-2 py-1 rounded-lg text-[10px] ${category.color}`}>
                            {category.name}
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {/* (Removed) Target Users Selection */}

            {/* 카테고리 선택 - Only show when 카테고리 is selected */}


            {/* Action Buttons */}
            <Box className="flex gap-3 justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseEditModal}
                className="border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveEditSlide}
                className="bg-black text-white hover:bg-gray-800"
              >
                저장
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Type Edit Modal */}
        <Modal
          open={isTypeEditModalOpen}
          onClose={handleCloseTypeEditModal}
          className="flex items-center justify-center"
        >
          <Box className="bg-white rounded-2xl py-3 px-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Modal Header */}
            <Box className="flex justify-between items-center mb-1">
              <Typography variant="h6" className="text-black font-semibold">
                Type 수정
              </Typography>
              <IconButton onClick={handleCloseTypeEditModal} size="small">
                <i className="ri-close-line text-gray-500" />
              </IconButton>
            </Box>

            {/* Type Selection */}
            <Box className="mb-1">
              <Typography variant="body2" className="text-black font-medium">
                Type
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={typeEditForm.type}
                  className="flex flex-col justify-between items-center"
                  onChange={(e) => handleTypeEditFormChange('type', e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="A"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="Type A"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                  <FormControlLabel
                    value="B"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="Type B"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Form Fields */}
            <Box className="space-y-2 mb-2">
              {/* 제목 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  제목
                </Typography>
                <TextField
                  fullWidth
                  placeholder="제목을 입력하세요"
                  value={typeEditForm.title}
                  onChange={(e) => handleTypeEditFormChange('title', e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#000000',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 설명 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  설명
                </Typography>
                <TextField
                  fullWidth
                  placeholder="설명을 입력하세요"
                  value={typeEditForm.description}
                  onChange={(e) => handleTypeEditFormChange('description', e.target.value)}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#000000',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Box>

              {/* 이미지 업로드 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">이미지</Typography>
                <Box className="flex items-center gap-2">
                  {typeEditForm.imageUrl ? (
                    <img src={typeEditForm.imageUrl} alt="type" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <Box className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />
                  )}
                  <input ref={editTypeImageInputRef} type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleFileUpload(file, (url) => handleTypeEditFormChange('imageUrl', url))
                  }} />
                  <Button variant="outlined" size="small" onClick={() => editTypeImageInputRef.current?.click()}>이미지 업로드</Button>
                </Box>
              </Box>

              {/* 비활성화 일시 */}
              <Box>
                <Typography variant="body2" className="text-black font-medium">
                  비활성화 일시
                </Typography>
                <Box className="flex items-center gap-2">
                  <TextField
                    fullWidth
                    type="date"
                    value={typeEditForm.deactivationDate}
                    onChange={(e) => handleTypeEditFormChange('deactivationDate', e.target.value)}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#000000',
                        '& fieldset': {
                          borderColor: '#e0e0e0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#bdbdbd',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

            </Box>

            {/* 공개 범위 */}
            <Box className="mb-2">
              <Typography variant="body2" className="text-black font-medium ">
                공개 범위
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={typeEditForm.publicScope}
                  className="flex flex-col gap-0"
                  onChange={(e) => handleTypeEditFormChange('publicScope', e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="전체"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="전체"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                  <FormControlLabel
                    value="카테고리"
                    control={<Radio size="small" sx={{ color: 'black', '&.Mui-checked': { color: 'black' } }} />}
                    label="카테고리"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '12px', color: 'black' } }}
                    className="text-black"
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* 모임 선택 */}
            <Box className="mb-2">
              <Typography variant="body2" className="text-black font-medium">
                모임 선택
              </Typography>

              <TextField
                fullWidth
                placeholder="모임 검색..."
                value={typeEditMeetingSearch}
                onChange={(e) => setTypeEditMeetingSearch(e.target.value)}
                variant="outlined"
                size="small"
                className="mb-3"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '12px',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#bdbdbd',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />

              <Box className="border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                <List dense>
                  {isLoadingMeetings ? (
                    <ListItem>
                      <Typography variant="body2" className="text-gray-500">
                        모임을 불러오는 중...
                      </Typography>
                    </ListItem>
                  ) : (
                    realMeetings
                      .filter(meeting =>
                        (meeting.title || '').toLowerCase().includes(typeEditMeetingSearch.toLowerCase()) ||
                        (meeting.category || '').toLowerCase().includes(typeEditMeetingSearch.toLowerCase())
                      )
                      .map((meeting) => {
                        const title = meeting.title || meeting.meetingName || '모임'
                        const category = meeting.category || ''
                        return (
                          <ListItem key={meeting.id} className="py-0 px-2 gap-0 flex items-center justify-start">
                            <ListItemIcon className="min-w-0">
                              <Checkbox
                                checked={typeEditSelectedMeetings.includes(meeting.id)}
                                onChange={() => handleTypeEditMeetingToggle(meeting.id)}
                                size="small"
                                sx={{
                                  color: 'gray',
                                  '&.Mui-checked': {
                                    color: 'black',
                                  },
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box className="flex items-center">
                                  <Typography variant="body2" className="text-black">{title}{category ? ` (${category})` : ''}</Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        )
                      })
                  )}
                </List>
              </Box>
            </Box>

            {/* 카테고리 선택 - Only show when 카테고리 is selected */}
            {typeEditForm.publicScope === '카테고리' && (
              <Box className="mb-2">
                <Typography variant="body2" className="text-black font-medium">
                  카테고리 선택
                </Typography>

                <Box className="space-y-0.5 px-2 py-1.5 border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
                  {isLoadingCategories ? (
                    <Typography variant="body2" className="text-gray-500 text-center py-2">
                      카테고리를 불러오는 중...
                    </Typography>
                  ) : (
                    categories.map((category) => (
                      <Box key={category.id} className="flex items-center gap-1">
                        <Checkbox
                          checked={typeEditSelectedCategories.includes(category.id)}
                          onChange={() => handleTypeEditCategoryToggle(category.id)}
                          size="small"
                          sx={{
                            color: 'gray',
                            '&.Mui-checked': {
                              color: 'black',
                            },
                          }}
                        />
                        <Box className={`px-2 py-1 rounded-lg text-[10px] ${category.color}`}>
                          {category.name}
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            <Box className="flex gap-3 justify-end">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseTypeEditModal}
                className="border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveTypeEdit}
                className="bg-black text-white text-sm rounded-lg hover:bg-gray-800"
              >
                저장
              </Button>
            </Box>
          </Box>
        </Modal>

      </Box>
    </AdminProtectedRoute>
  )
}

export default HomePage


