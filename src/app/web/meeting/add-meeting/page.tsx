'use client'

import React from 'react'
import { Box, Typography, IconButton, Button, Divider, Switch, TextField, CircularProgress, Select, MenuItem } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import Image from 'next/image'
import { useState, useRef } from 'react';
import { HexColorPicker } from 'react-colorful'

// import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useEffect } from 'react';
import { apiPostWithStore, apiPutWithStore } from '@/utils/api'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setToken, checkAuthStatus } from '@/store/slices/authSlice'
import { fetchMeetingDetail, clearMeetingDetail } from '@/store/slices/meetingDetailSlice'
import { clearHomeData } from '@/store/slices/homeSlice'
import PageLoader from '@/components/PageLoader'
import { compressImage, dataURLtoFile } from '@/utils/imageCompression'
import type {
  GalleryImage,
  ResizeControlPosition,
  TextAlignment,
  ValidationResult
} from '@/services/types/frontend'
const AddClubPage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()

  // Get token and auth state from Redux store
  const { isAuthenticated, user, token } = useAppSelector((state) => (state as any).authReducer || {})

  const { meetingData: existingMeetingData, loading: loadingMeetingData } = useAppSelector(
    (state) => (state as any).meetingDetailReducer || {}
  )

  const editorRef = useRef<HTMLDivElement>(null)
  // const colorInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [editMeetingId, setEditMeetingId] = React.useState<number | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [insertionTarget, setInsertionTarget] = useState<'caret' | 'start' | 'end'>('end')
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const pickerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null) // Currently selected image for resize
  const [selectedImageSize, setSelectedImageSize] = useState<number>(100) // Percentage width
  const [resizeControlPosition, setResizeControlPosition] = useState<ResizeControlPosition | null>(null)
  const [currentTextStyle, setCurrentTextStyle] = useState<string>('기본') // Current text style name
  const [showStyleMenu, setShowStyleMenu] = useState(false) // Show/hide style dropdown menu

  // Alignment state - cycles through: left -> center -> right -> justify
  const [currentAlign, setCurrentAlign] = useState<TextAlignment>('justifyLeft')

  // YouTube modal state
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [youtubeLink, setYoutubeLink] = useState('')

  // Title + Body modal state
  const [showTitleBodyModal, setShowTitleBodyModal] = useState(false)
  const [titleBodyInput, setTitleBodyInput] = useState({ title: '', body: '' })

  // Drag state for expand functionality (used elsewhere in page)
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isExpandedRef = useRef(false)

  // Editor tools toggle: scoped drag state (does not affect other features)
  const [toolsDragStartY, setToolsDragStartY] = useState<number | null>(null)
  const [toolsDragCurrentY, setToolsDragCurrentY] = useState<number | null>(null)
  const [isToolsDragging, setIsToolsDragging] = useState(false)
  const initialBoxHeightOnDragStart = useRef<number>(50)

  // Editor tools visibility toggle
  const [showEditorTools, setShowEditorTools] = useState(true)

  // Box height state - starts at 50vh (50% viewport height)
  const [boxHeight, setBoxHeight] = useState<number>(50)

  // Tab order state
  const [tabOrder, setTabOrder] = useState([
    { key: 'about', label: '모임 소개', handler: 'handleAboutTabClick' },
    { key: 'participants', label: '수강 대상', handler: 'handleParticipantsTabClick' },
    { key: 'place', label: '함께 할 내용 ', handler: 'handlePlaceTabClick' },
    { key: 'instructor', label: '호스트 소개', handler: 'handleInstructorTabClick' },
    { key: 'HostWelcome', label: '호스트 환영인사', handler: 'handleHostWelcomeTabClick' },
  ])
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null)
  const [touchDragOverIndex, setTouchDragOverIndex] = useState<number | null>(null)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  // Confetti celebration state
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(false)

  // Image processing progress state
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

  // Undo/Redo history state
  const [editorHistory, setEditorHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const isUndoingRef = useRef(false)

  // Text Style Presets
  const textStylePresets = {
    '기본': {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1.6',
      color: '#333',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    },
    '본문': {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      lineHeight: '1.8',
      color: '#111827',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    },
    '제목1': {
      fontSize: '28px',
      fontFamily: 'Helvetica, Arial, sans-serif',
      lineHeight: '1.3',
      color: '#000',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none'
    },
    '제목2': {
      fontSize: '24px',
      fontFamily: 'Verdana, sans-serif',
      lineHeight: '1.4',
      color: '#000',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none'
    },
    '제목': {
      fontSize: '20px',
      fontFamily: 'Times New Roman, serif',
      lineHeight: '1.4',
      color: '#000',
      fontWeight: '600',
      fontStyle: 'normal',
      textDecoration: 'none'
    }
  }

  const saveSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0)
    }
  }
  const restoreSelection = () => {
    const selection = window.getSelection()
    if (savedSelectionRef.current && selection) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }
  }

  // Ensure there is a caret inside editor; if none, place at end
  const ensureSelectionAtEnd = () => {
    if (!editorRef.current) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
      savedSelectionRef.current = range
    }
  }

  // Place caret at the start of the editor
  const ensureSelectionAtStart = () => {
    if (!editorRef.current) return
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editorRef.current)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
    savedSelectionRef.current = range
  }
  const execCommand = (command: string, value?: string) => {
    if (!savedSelectionRef.current) ensureSelectionAtEnd()
    restoreSelection()
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand(command, false, value)
      // Detect style after manual formatting
      setTimeout(() => detectCurrentStyle(), 100)
    }
  }

  // Apply text style preset to selected text
  const applyTextStyle = (styleName: keyof typeof textStylePresets) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No text selected

    const style = textStylePresets[styleName]

    // Create a span with all the preset styles
    const span = document.createElement('span')
    span.style.fontSize = style.fontSize
    span.style.fontFamily = style.fontFamily
    span.style.lineHeight = style.lineHeight
    span.style.color = style.color
    span.style.fontWeight = style.fontWeight
    span.style.fontStyle = style.fontStyle
    span.style.textDecoration = style.textDecoration
    span.setAttribute('data-style', styleName)

    // Extract the selected content
    const fragment = range.extractContents()

    // Remove any existing styling from the fragment
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT)
    let node
    while (node = walker.nextNode()) {
      if (node instanceof HTMLElement) {
        // Keep only the text content, remove inline styles
        node.removeAttribute('style')
      }
    }

    // Add cleaned content to the styled span
    span.appendChild(fragment)

    // Insert the styled span
    range.insertNode(span)

    // Keep the text selected by selecting the span's content
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(newRange)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }

    // Update current style
    setCurrentTextStyle(styleName)
  }

  // Apply only font family from text style preset to selected text
  const applyFontFamilyOnly = (styleName: keyof typeof textStylePresets) => {
    // Restore the saved selection first
    restoreSelection()

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No text selected

    const style = textStylePresets[styleName]

    // Create a span with only font family
    const span = document.createElement('span')
    span.style.fontFamily = style.fontFamily
    span.setAttribute('data-font-family', styleName)

    // Extract the selected content
    const fragment = range.extractContents()

    // Add content to the styled span (keep existing styles)
    span.appendChild(fragment)

    // Insert the styled span
    range.insertNode(span)

    // Keep the text selected by selecting the span's content
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(newRange)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }

    // Update current style
    setCurrentTextStyle(styleName)
  }

  // Increase font size by 1px
  const increaseFontSize = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No text selected

    // Get the parent element of the selection
    let element = range.startContainer
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as Node
    }

    // Get current font size
    let currentSize = 16 // Default size
    if (element instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(element)
      currentSize = parseInt(computedStyle.fontSize) || 16
    }

    // Increase by 1px
    const newSize = currentSize + 1

    // Create a span with the new font size
    const span = document.createElement('span')
    span.style.fontSize = `${newSize}px`

    // Extract the selected content
    const fragment = range.extractContents()

    // Add content to the styled span
    span.appendChild(fragment)

    // Insert the styled span
    range.insertNode(span)

    // Keep the text selected by selecting the span's content
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(newRange)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  // Decrease font size by 1px
  const decreaseFontSize = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No text selected

    // Get the parent element of the selection
    let element = range.startContainer
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as Node
    }

    // Get current font size
    let currentSize = 16 // Default size
    if (element instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(element)
      currentSize = parseInt(computedStyle.fontSize) || 16
    }

    // Decrease by 1px (minimum 8px)
    const newSize = Math.max(8, currentSize - 1)

    // Create a span with the new font size
    const span = document.createElement('span')
    span.style.fontSize = `${newSize}px`

    // Extract the selected content
    const fragment = range.extractContents()

    // Add content to the styled span
    span.appendChild(fragment)

    // Insert the styled span
    range.insertNode(span)

    // Keep the text selected by selecting the span's content
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(newRange)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  // Detect current text style
  const detectCurrentStyle = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setCurrentTextStyle('기본')
      return
    }

    const range = selection.getRangeAt(0)
    let node = range.startContainer

    // If text node, get parent element
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement as Node
    }

    // Check if element has data-style attribute
    if (node instanceof HTMLElement) {
      const styledParent = node.closest('[data-style]')
      if (styledParent) {
        const styleName = styledParent.getAttribute('data-style') as string

        // Check if style has been manually modified
        const preset = textStylePresets[styleName as keyof typeof textStylePresets]
        if (preset) {
          const element = styledParent as HTMLElement
          const isModified =
            element.style.fontSize !== preset.fontSize ||
            element.style.fontWeight !== preset.fontWeight ||
            element.style.color !== preset.color ||
            element.style.textDecoration !== preset.textDecoration

          setCurrentTextStyle(styleName)
          return
        }
      }
    }

    setCurrentTextStyle('기본')
  }

  const [authChecked, setAuthChecked] = React.useState(false)

  // Save editor content to state when leaving detail step to preserve it
  const [savedEditorContent, setSavedEditorContent] = React.useState<string>('')

  // Check authentication and redirect if needed - simplified
  React.useEffect(() => {
    // Wait a bit for redux-persist to rehydrate
    const timer = setTimeout(() => {
      setAuthChecked(true)
      if (!isAuthenticated && !user) {
        navigate('/login')
      }
    }, 500) // Give 500ms for redux-persist rehydration

    return () => clearTimeout(timer)
  }, [isAuthenticated, user, router])

  React.useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      const meetingId = parseInt(id)
      setIsEditMode(true)
      setEditMeetingId(meetingId)
      dispatch(fetchMeetingDetail(meetingId))
    }

    return () => {
      // Clear meeting detail when leaving the page
      dispatch(clearMeetingDetail())
    }
  }, [searchParams, dispatch])

  // Populate form fields when meeting data is loaded in edit mode
  React.useEffect(() => {
    if (isEditMode && existingMeetingData && !loadingMeetingData) {
      // Set basic info
      setClubName(existingMeetingData.meetingName || '')
      setDuration(existingMeetingData.duration || 60)
      setMinParticipants(existingMeetingData.minNum || 4)
      setMaxParticipants(existingMeetingData.maxNum || 4)

      // Set address
      setRoadNameLotNumber(existingMeetingData.roadNameAddress || '')
      setDetailedAddress(existingMeetingData.detailedAddress || '')

      // Set fee info
      if (existingMeetingData.hasFee) {
        setFeeOption('yes')
        setFeeAmount(existingMeetingData.fee?.toString() || '')
      } else {
        setFeeOption('no')
        setFeeAmount('')
      }

      // Set category (first category if multiple)
      if (existingMeetingData.categories && existingMeetingData.categories.length > 0) {
        setSelectedCategory(existingMeetingData.categories[0])
      }

      // Set activity (first activity if multiple)
      if (existingMeetingData.activities && existingMeetingData.activities.length > 0) {
        const activityId = parseInt(existingMeetingData.activities[0])
        if (!isNaN(activityId)) {
          setSelectedActivityId(activityId)
        }
      }

      // Set date and time
      if (existingMeetingData.meetingTime) {
        const meetingDateTime = new Date(existingMeetingData.meetingTime)
        const dateStr = meetingDateTime.toISOString().split('T')[0]
        const timeStr = meetingDateTime.toTimeString().slice(0, 5)
        setDateValue(dateStr)
        setTimeValue(timeStr)
        setMeetingDate(formatKoreanDate(dateStr))
        setMeetingTime(formatKoreanTime(timeStr))
      }

      // Save editor content to be loaded later
      if (existingMeetingData.description) {
        setSavedEditorContent(existingMeetingData.description)
      }

      // Set meeting background if available
      if (existingMeetingData.meetingBackground) {
        setBackgroundImage(existingMeetingData.meetingBackground)
      }

      // Skip intro and go to category selection (details step)
      // Note: createStep is already initialized to 'details' in edit mode, so this is redundant but kept for clarity
      setMeetingConsentPersonal(true)
      setMeetingConsentGuidelines(true)
    }
  }, [isEditMode, existingMeetingData, loadingMeetingData])


  // Update style detection on selection change
  React.useEffect(() => {
    if (editorRef.current) {
      const handleSelectionChange = () => {
        if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
          detectCurrentStyle()
        }
      }

      document.addEventListener('selectionchange', handleSelectionChange)
      return () => document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  // Close style menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showStyleMenu && !(e.target as Element).closest('.style-menu-container')) {
        setShowStyleMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStyleMenu])

  // Close color picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showColorPicker) {
        const target = e.target as Element
        // Check if click is outside the color picker and color button
        if (!target.closest('[data-color-picker]') && !target.closest('[data-color-button]')) {
          setShowColorPicker(false)
          if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
        }
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  // Cycle through alignments: left -> center -> right -> justify -> left
  const handleAlignClick = () => {
    const alignmentCycle: Array<'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull'> = [
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      'justifyFull'
    ]

    const currentIndex = alignmentCycle.indexOf(currentAlign)
    const nextIndex = (currentIndex + 1) % alignmentCycle.length
    const nextAlign = alignmentCycle[nextIndex]

    setCurrentAlign(nextAlign)
    execCommand(nextAlign)
  }

  // Get icon based on current alignment
  const getAlignIcon = (): string => {
    const icons: Record<TextAlignment, string> = {
      justifyLeft: 'ri-align-left',
      justifyCenter: 'ri-align-center',
      justifyRight: 'ri-align-right',
      justifyFull: 'ri-align-justify'
    }
    return icons[currentAlign]
  }

  // Save current editor state to history
  const saveToHistory = React.useCallback((content: string) => {
    if (isUndoingRef.current) return // Don't save during undo/redo operations

    setEditorHistory(prev => {
      // If we're not at the end of history, remove everything after current position
      const newHistory = prev.slice(0, historyIndex + 1)

      // Don't add if it's the same as the last entry
      if (newHistory.length > 0 && newHistory[newHistory.length - 1] === content) {
        return prev
      }

      // Add new state
      newHistory.push(content)

      // Limit history to last 50 states
      if (newHistory.length > 50) {
        newHistory.shift()
        // Update historyIndex to account for the shift
        setHistoryIndex(Math.min(newHistory.length - 1, 49))
        return newHistory
      }

      // Update historyIndex to point to the new entry
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
  }, [historyIndex])

  // Editor history and clear actions
  const handleUndo = () => {
    if (!editorRef.current || historyIndex <= 0) return

    isUndoingRef.current = true
    const newIndex = historyIndex - 1
    const previousContent = editorHistory[newIndex]

    if (previousContent !== undefined) {
      editorRef.current.innerHTML = previousContent
      setHistoryIndex(newIndex)

      // Restore focus and move cursor to end
      editorRef.current.focus()
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        range.collapse(false) // Collapse to end
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }

    setTimeout(() => {
      isUndoingRef.current = false
    }, 100)
  }

  const handleRedo = () => {
    if (!editorRef.current || historyIndex >= editorHistory.length - 1) return

    isUndoingRef.current = true
    const newIndex = historyIndex + 1
    const nextContent = editorHistory[newIndex]

    if (nextContent !== undefined) {
      editorRef.current.innerHTML = nextContent
      setHistoryIndex(newIndex)

      // Restore focus and move cursor to end
      editorRef.current.focus()
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        range.collapse(false) // Collapse to end
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }

    setTimeout(() => {
      isUndoingRef.current = false
    }, 100)
  }

  const handleClear = () => {
    if (!editorRef.current) return
    const ok = window.confirm('현재 편집 내용을 모두 삭제할까요?')
    if (!ok) return
    editorRef.current.innerHTML = ''
    setSelectedImageId(null)
    setResizeControlPosition(null)
    setGalleryImages([])
    savedSelectionRef.current = null
    // IMPORTANT: Also clear saved content so it doesn't restore later
    setSavedEditorContent('')
  }

  const processImageForDisplay = async (file: File): Promise<string> => {
    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1200,      // Good quality for meeting/post images
        maxHeight: 1200,
        quality: 0.80,       // Balance of quality and size
        maxSizeMB: 2         // Max 2MB for safety
      })

      // Return the compressed data URL directly - NO UPLOAD NEEDED!
      // This is instant and works offline
      return compressedDataUrl
    } catch (error) {
      if (error instanceof Error && error.message.includes('too large')) {
        alert('이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.')
      }
      // Fallback to a placeholder image
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4='
    }
  }

  // Re-attach event listeners to restored content (for edit mode)
  const reattachEventListeners = () => {
    if (!editorRef.current) return

    // 1. Re-attach close button handlers for single images
    const imageWrappers = editorRef.current.querySelectorAll('[data-image-block]')
    imageWrappers.forEach((wrapper) => {
      const closeBtn = wrapper.querySelector('button[aria-label="Remove image"]') as HTMLButtonElement
      if (closeBtn) {
        closeBtn.contentEditable = 'false'
        closeBtn.setAttribute('contenteditable', 'false')
        // Remove any existing handlers to prevent duplicates
        const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement
        closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn)
        newCloseBtn.onclick = (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (wrapper && wrapper.parentNode) {
            wrapper.remove()
          }
        }
      }
    })

    // 2. Re-attach handlers for gallery sliders
    const gallerySliders = editorRef.current.querySelectorAll('[data-gallery-slider]')
    gallerySliders.forEach((slider) => {
      // Per-image close buttons
      const itemCloseBtns = slider.querySelectorAll('button[aria-label="Remove image from slider"]')
      itemCloseBtns.forEach((closeBtn) => {
        const btn = closeBtn as HTMLButtonElement
        btn.contentEditable = 'false'
        btn.setAttribute('contenteditable', 'false')
        const item = btn.closest('div[style*="position: relative"]')
        const track = slider.querySelector('div[style*="display: flex"]')

        const newCloseBtn = btn.cloneNode(true) as HTMLButtonElement
        btn.parentNode?.replaceChild(newCloseBtn, btn)
        newCloseBtn.onclick = (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (item && item.parentNode) {
            item.remove()
          }
          // If slider is empty after removal, remove entire wrapper
          if (track && track.children.length === 0 && slider && slider.parentNode) {
            slider.remove()
          }
        }
      })

      // Slider main close button
      const sliderCloseBtn = slider.querySelector('button[aria-label="Remove slider"]') as HTMLButtonElement
      if (sliderCloseBtn) {
        sliderCloseBtn.contentEditable = 'false'
        sliderCloseBtn.setAttribute('contenteditable', 'false')
        const newCloseBtn = sliderCloseBtn.cloneNode(true) as HTMLButtonElement
        sliderCloseBtn.parentNode?.replaceChild(newCloseBtn, sliderCloseBtn)
        newCloseBtn.onclick = (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (slider && slider.parentNode) {
            slider.remove()
          }
        }
      }
    })

    // 3. Re-attach handlers for YouTube video close buttons
    const youtubeWrappers = editorRef.current.querySelectorAll('[data-youtube-embed]')
    youtubeWrappers.forEach((wrapper) => {
      const closeBtn = wrapper.querySelector('button[aria-label="Remove video"]') as HTMLButtonElement
      if (closeBtn) {
        closeBtn.contentEditable = 'false'
        closeBtn.setAttribute('contenteditable', 'false')
        const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement
        closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn)
        newCloseBtn.onclick = (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (wrapper && wrapper.parentNode) {
            wrapper.remove()
          }
        }
      }
    })

    // 4. Re-attach handlers for instructor section images
    const instructorSections = editorRef.current.querySelectorAll('[data-section="instructor"]')
    instructorSections.forEach((section) => {
      const imageWrapper = section.querySelector('div[style*="position: relative"][style*="width: 100px"]')
      if (imageWrapper) {
        const imagePlaceholder = imageWrapper.querySelector('div[style*="border-radius: 50%"]')
        const plusIcon = imageWrapper.querySelector('div[style*="position: absolute"][style*="bottom: 0"]')
        const closeBtn = imageWrapper.querySelector('button[aria-label="Remove instructor image"]')

        // Function to open file picker
        const openFilePicker = () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0]
            if (file && imagePlaceholder instanceof HTMLElement) {
              const imageUrl = await processImageForDisplay(file)
              imagePlaceholder.innerHTML = ''
              imagePlaceholder.style.backgroundImage = `url(${imageUrl})`
              imagePlaceholder.style.backgroundSize = 'cover'
              imagePlaceholder.style.backgroundPosition = 'center'

              if (closeBtn instanceof HTMLElement) {
                closeBtn.style.display = 'flex'
              }
            }
          }
          input.click()
        }

        // Re-attach to image placeholder
        if (imagePlaceholder instanceof HTMLElement) {
          imagePlaceholder.contentEditable = 'false'
          imagePlaceholder.setAttribute('contenteditable', 'false')
          imagePlaceholder.style.cursor = 'pointer'
          imagePlaceholder.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            openFilePicker()
          }
          // Prevent text input
          imagePlaceholder.onkeydown = (e) => e.preventDefault()
          imagePlaceholder.onkeypress = (e) => e.preventDefault()
          imagePlaceholder.oninput = (e) => e.preventDefault()
        }

        // Re-attach to plus icon
        if (plusIcon instanceof HTMLElement) {
          plusIcon.contentEditable = 'false'
          plusIcon.setAttribute('contenteditable', 'false')
          plusIcon.style.pointerEvents = 'auto'
          plusIcon.style.cursor = 'pointer'
          plusIcon.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            openFilePicker()
          }
        }

        // Re-attach to close button
        if (closeBtn instanceof HTMLElement) {
          closeBtn.contentEditable = 'false'
          closeBtn.setAttribute('contenteditable', 'false')
          const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement
          closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn)
          newCloseBtn.onclick = (ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            if (imagePlaceholder instanceof HTMLElement) {
              imagePlaceholder.style.backgroundImage = 'none'
              imagePlaceholder.innerHTML = ''
              newCloseBtn.style.display = 'none'
            }
          }
        }
      }
    })

    // 5. Re-attach click handlers to images for resize controls
    const allImages = editorRef.current.querySelectorAll('img[data-image-id]')
    allImages.forEach((img) => {
      const imageId = img.getAttribute('data-image-id')
      const imgElement = img as HTMLImageElement
      if (imageId) {
        imgElement.onclick = () => handleImageClick(imageId)
      }
    })
  }
  // Upload image to server and return server URL (with compression!)
  const uploadImageToServer = async (file: File): Promise<string> => {
    try {
      // Compress image FIRST before upload
      // Compressing image...
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.80,
        maxSizeMB: 2
      })

      // Convert compressed data URL back to File
      const compressedFile = dataURLtoFile(compressedDataUrl, file.name)
      // Compressed image size

      const formData = new FormData()
      formData.append('image', compressedFile)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const uploadResult = await response.json()

      if (!uploadResult.success) {
        throw new Error('Upload failed')
      }

      return uploadResult.data.imageUrl
    } catch (error) {
      // Image upload error
      throw error
    }
  }

  // Gallery functions
  const handleGalleryClick = () => {
    saveSelection() // Save cursor position before opening file picker
    galleryInputRef.current?.click()
  }

  const handleGallerySelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const filesArray = Array.from(files)

      try {
        // Show loading state
        setIsUploadingImages(true)
        setUploadProgress({ current: 0, total: filesArray.length })

        // Prepare insertion location based on target
        if (insertionTarget === 'start') ensureSelectionAtStart()
        else if (insertionTarget === 'end') ensureSelectionAtEnd()

        // If only one image, insert directly into editor
        if (filesArray.length === 1) {
          // Upload image to server and get URL
          const imageUrl = await uploadImageToServer(filesArray[0])
          setUploadProgress({ current: 1, total: 1 })
          const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // Insert into editor at cursor position
          if (!savedSelectionRef.current) ensureSelectionAtEnd()
          restoreSelection()
          if (editorRef.current) {
            editorRef.current.focus()
            // Wrapper to hold image + close button
            const wrapper = document.createElement('div')
            wrapper.style.position = 'relative'
            wrapper.style.margin = '10px 0'
            wrapper.setAttribute('data-image-block', imageId)
            const img = document.createElement('img')
            img.src = imageUrl
            img.style.width = '100%'
            img.style.height = 'auto'
            img.style.display = 'block'
            img.style.cursor = 'pointer'
            img.setAttribute('data-image-id', imageId)
            img.onclick = () => handleImageClick(imageId)
            wrapper.appendChild(img)

            // Close button for single image
            const closeBtn = document.createElement('button')
            closeBtn.type = 'button'
            closeBtn.innerText = '×'
            closeBtn.setAttribute('aria-label', 'Remove image')
            closeBtn.contentEditable = 'false'
            closeBtn.setAttribute('contenteditable', 'false')
            closeBtn.style.position = 'absolute'
            closeBtn.style.top = '4px'
            closeBtn.style.right = '8px'
            closeBtn.style.width = '24px'
            closeBtn.style.height = '24px'
            closeBtn.style.borderRadius = '12px'
            closeBtn.style.border = 'none'
            closeBtn.style.background = 'rgba(0,0,0,0.6)'
            closeBtn.style.color = '#fff'
            closeBtn.style.cursor = 'pointer'
            closeBtn.style.lineHeight = '24px'
            closeBtn.style.textAlign = 'center'
            closeBtn.style.fontSize = '16px'
            closeBtn.onclick = (ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              if (wrapper && wrapper.parentNode) {
                wrapper.remove()
              }
            }
            wrapper.appendChild(closeBtn)

            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              range.deleteContents()
              range.insertNode(wrapper)

              // Add a line break after the wrapper to ensure cursor is on new line
              const br = document.createElement('br')
              wrapper.parentNode?.insertBefore(br, wrapper.nextSibling)

              // Move cursor after the line break
              range.setStartAfter(br)
              range.setEndAfter(br)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              savedSelectionRef.current = range.cloneRange()
            }
          }
        }
        else {
          // Multiple images → insert as an inline slider at current insertion target
          const collected: { url: string; id: string }[] = []

          // Upload images in PARALLEL to server
          const processPromises = filesArray.map(async (file, index) => {
            const imageUrl = await uploadImageToServer(file)
            // Update progress
            setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }))
            const imageId = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
            return { url: imageUrl, id: imageId }
          })

          // Wait for all compressions to complete in parallel
          const results = await Promise.all(processPromises)
          collected.push(...results)

          // All files processed, now insert
          // We've consumed the files; do not keep selection list visible after insert
          setGalleryImages([])

          // Prepare insertion location
          if (insertionTarget === 'start') ensureSelectionAtStart()
          else if (insertionTarget === 'end') ensureSelectionAtEnd()
          restoreSelection()

          if (editorRef.current) {
            editorRef.current.focus()
            // Build a simple horizontal slider wrapper (non-editable)
            const wrapper = document.createElement('div')
            wrapper.contentEditable = 'false'
            wrapper.setAttribute('data-gallery-slider', 'true')
            wrapper.style.margin = '16px 0'
            wrapper.style.position = 'relative'

            const track = document.createElement('div')
            track.style.display = 'flex'
            track.style.gap = '8px'
            track.style.overflowX = 'auto'
            track.style.scrollSnapType = 'x mandatory'
            track.style.padding = '4px'

            collected.forEach(({ url, id }) => {
              const item = document.createElement('div')
              item.style.position = 'relative'
              item.style.display = 'inline-block'
              item.style.flex = '0 0 auto'

              const img = document.createElement('img')
              img.src = url
              img.setAttribute('data-image-id', id)
              img.style.height = '200px'
              img.style.width = 'auto'
              img.style.borderRadius = '8px'
              img.style.scrollSnapAlign = 'center'
              item.appendChild(img)

              // Per-image close button
              const closeBtn = document.createElement('button')
              closeBtn.type = 'button'
              closeBtn.innerText = '×'
              closeBtn.setAttribute('aria-label', 'Remove image from slider')
              closeBtn.contentEditable = 'false'
              closeBtn.setAttribute('contenteditable', 'false')
              closeBtn.style.position = 'absolute'
              closeBtn.style.top = '4px'
              closeBtn.style.right = '8px'
              closeBtn.style.width = '24px'
              closeBtn.style.height = '24px'
              closeBtn.style.borderRadius = '12px'
              closeBtn.style.border = 'none'
              closeBtn.style.background = 'rgba(0,0,0,0.6)'
              closeBtn.style.color = '#fff'
              closeBtn.style.cursor = 'pointer'
              closeBtn.style.lineHeight = '24px'
              closeBtn.style.textAlign = 'center'
              closeBtn.style.fontSize = '16px'
              closeBtn.onclick = (ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                if (item && item.parentNode) {
                  item.remove()
                }
                // If slider is empty after removal, remove entire wrapper
                if (track.children.length === 0 && wrapper && wrapper.parentNode) {
                  wrapper.remove()
                }
              }
              item.appendChild(closeBtn)

              track.appendChild(item)
            })

            wrapper.appendChild(track)

            // Close button for removing the slider
            const closeBtn = document.createElement('button')
            closeBtn.type = 'button'
            closeBtn.innerText = '×'
            closeBtn.setAttribute('aria-label', 'Remove slider')
            closeBtn.contentEditable = 'false'
            closeBtn.setAttribute('contenteditable', 'false')
            closeBtn.style.position = 'absolute'
            closeBtn.style.top = '4px'
            closeBtn.style.right = '8px'
            closeBtn.style.width = '24px'
            closeBtn.style.height = '24px'
            closeBtn.style.borderRadius = '12px'
            closeBtn.style.border = 'none'
            closeBtn.style.background = 'rgba(0,0,0,0.6)'
            closeBtn.style.color = '#fff'
            closeBtn.style.cursor = 'pointer'
            closeBtn.style.lineHeight = '24px'
            closeBtn.style.textAlign = 'center'
            closeBtn.style.fontSize = '16px'
            closeBtn.onclick = (ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              if (wrapper && wrapper.parentNode) {
                wrapper.remove()
              }
            }
            wrapper.appendChild(closeBtn)

            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              range.deleteContents()
              range.insertNode(wrapper)

              // Add a line break after the wrapper to ensure cursor is on new line
              const br = document.createElement('br')
              wrapper.parentNode?.insertBefore(br, wrapper.nextSibling)

              // Move cursor after the line break
              range.setStartAfter(br)
              range.setEndAfter(br)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              savedSelectionRef.current = range.cloneRange()
            } else {
              // Fallback: append to end
              editorRef.current.appendChild(wrapper)
              const br = document.createElement('br')
              editorRef.current.appendChild(br)
            }
          }
        }
      } catch (error) {
        alert('이미지 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      } finally {
        // Always hide loading indicator
        setIsUploadingImages(false)
      }
    }
    // Reset input value to allow same file selection again
    event.target.value = ''
  }

  const removeGalleryImage = (imageId: string) => {
    setGalleryImages(prev => prev.filter(img => img.id !== imageId))

    // Close resize controls if this image was selected
    if (selectedImageId === imageId) {
      setSelectedImageId(null)
    }

    // Also remove from editor if present
    if (editorRef.current) {
      const imgElement = editorRef.current.querySelector(`img[data-image-id="${imageId}"]`)
      if (imgElement && imgElement.parentNode) {
        imgElement.remove()
      }
    }
  }

  const insertGalleryImageToEditor = (imageUrl: string, imageId: string) => {
    // Insert image into the editor at cursor position
    restoreSelection()
    if (editorRef.current) {
      editorRef.current.focus()
      const img = document.createElement('img')
      img.src = imageUrl
      img.style.width = '100%'
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '10px 0'
      img.style.cursor = 'pointer'
      img.setAttribute('data-image-id', imageId)

      // Add click handler to show resize controls
      img.onclick = () => handleImageClick(imageId)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)

        // Add a line break after the image to ensure cursor is on new line
        const br = document.createElement('br')
        img.parentNode?.insertBefore(br, img.nextSibling)

        // Move cursor after the line break
        range.setStartAfter(br)
        range.setEndAfter(br)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        // Persist caret for subsequent inserts
        savedSelectionRef.current = range.cloneRange()
      }
    }
  }

  const handleImageClick = (imageId: string) => {
    // Get the clicked image element
    if (editorRef.current) {
      // Remove border from previously selected image
      const prevSelected = editorRef.current.querySelector('img[data-selected="true"]')
      if (prevSelected) {
        prevSelected.removeAttribute('data-selected')
          ; (prevSelected as HTMLImageElement).style.border = 'none'
      }

      const imgElement = editorRef.current.querySelector(`img[data-image-id="${imageId}"]`) as HTMLImageElement
      if (imgElement) {
        // Get current width
        const currentWidth = parseFloat(imgElement.style.width) || 100
        setSelectedImageSize(currentWidth)
        setSelectedImageId(imageId)

        // Add visual indicator for selected image
        imgElement.setAttribute('data-selected', 'true')
        imgElement.style.border = '3px solid #3B82F6'
        imgElement.style.borderRadius = '8px'

        // Calculate position for resize controls (position below the image)
        const rect = imgElement.getBoundingClientRect()
        const editorRect = editorRef.current.getBoundingClientRect()

        // Horizontal center of the editor/screen, vertical below the image
        const editorCenterX = editorRect.width / 2

        setResizeControlPosition({
          top: rect.bottom - editorRect.top + 10, // 10px gap below image
          left: editorCenterX, // Center of screen
          width: 280 // Fixed width for resize controls
        })
      }
    }
  }

  const updateImageSize = (newSize: number) => {
    setSelectedImageSize(newSize)

    // Update the selected image in the editor
    if (editorRef.current && selectedImageId) {
      const imgElement = editorRef.current.querySelector(`img[data-image-id="${selectedImageId}"]`) as HTMLImageElement
      if (imgElement) {
        imgElement.style.width = `${newSize}%`
        // Don't recalculate position - keep controls fixed while resizing
      }
    }
  }

  const closeResizeControls = () => {
    // Remove border from selected image
    if (editorRef.current && selectedImageId) {
      const imgElement = editorRef.current.querySelector(`img[data-image-id="${selectedImageId}"]`) as HTMLImageElement
      if (imgElement) {
        imgElement.removeAttribute('data-selected')
        imgElement.style.border = 'none'
      }
    }
    setSelectedImageId(null)
    setResizeControlPosition(null)
  }

  // YouTube modal handlers - Insert YouTube videos into editor
  const handleYouTubeClick = () => {
    saveSelection() // Save cursor position before opening modal
    setYoutubeLink('')
    setShowYouTubeModal(true)
  }

  const handleYouTubeInsert = () => {
    if (!youtubeLink.trim()) {
      alert('YouTube 링크를 입력해주세요')
      return
    }

    // Extract YouTube video ID from various URL formats
    const extractYouTubeId = (url: string): string | null => {
      // Remove any whitespace
      const cleanUrl = url.trim()

      const patterns = [
        // Standard watch URL
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        // Shortened youtu.be URL
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        // Embed URL
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        // Watch URL with additional parameters
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/,
        // YouTube Shorts URL
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      ]

      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }

      return null
    }

    const videoId = extractYouTubeId(youtubeLink)

    if (!videoId) {
      alert('올바른 YouTube 링크를 입력해주세요\n\n예시:\n• https://www.youtube.com/watch?v=VIDEO_ID\n• https://youtu.be/VIDEO_ID\n• https://youtube.com/shorts/VIDEO_ID')
      return
    }

    if (editorRef.current) {
      editorRef.current.focus()
      if (insertionTarget === 'start') ensureSelectionAtStart()
      else if (insertionTarget === 'end') ensureSelectionAtEnd()
      restoreSelection()

      const wrapper = document.createElement('div');
      wrapper.contentEditable = 'false';
      wrapper.classList.add('youtube-wrapper');
      wrapper.style.position = 'relative';
      wrapper.style.margin = '16px 0';
      wrapper.style.display = 'block';
      wrapper.style.borderRadius = '8px';
      wrapper.style.overflow = 'hidden';
      wrapper.setAttribute('data-youtube-embed', videoId)
      // wrapper.setAttribute('contenteditable', 'false');

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&enablejsapi=1`;
      iframe.style.width = '100%';
      iframe.style.height = '300px';
      iframe.style.border = 'none';
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('frameborder', '0');
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';


      wrapper.appendChild(iframe)

      // Add a small close button to remove the video block
      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.innerText = '×'
      closeBtn.setAttribute('aria-label', 'Remove video')
      closeBtn.contentEditable = 'false'
      closeBtn.setAttribute('contenteditable', 'false')
      closeBtn.style.position = 'absolute'
      closeBtn.style.top = '4px'
      closeBtn.style.right = '8px'
      closeBtn.style.width = '24px'
      closeBtn.style.height = '24px'
      closeBtn.style.borderRadius = '12px'
      closeBtn.style.border = 'none'
      closeBtn.style.background = 'rgba(0,0,0,0.6)'
      closeBtn.style.color = '#fff'
      closeBtn.style.cursor = 'pointer'
      closeBtn.style.lineHeight = '24px'
      closeBtn.style.textAlign = 'center'
      closeBtn.style.fontSize = '16px'
      closeBtn.onclick = (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        if (wrapper && wrapper.parentNode) {
          wrapper.remove()
        }
      }
      wrapper.appendChild(closeBtn)

      // Use a direct insertion fallback if range.insertNode fails
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(wrapper)

        // Add a line break after the wrapper to ensure cursor is on new line
        const br = document.createElement('br')
        wrapper.parentNode?.insertBefore(br, wrapper.nextSibling)

        // Move cursor after the line break
        range.setStartAfter(br)
        range.setEndAfter(br)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      } else {
        // Fallback: just append to editor end
        editorRef.current.appendChild(wrapper)
        const br = document.createElement('br')
        editorRef.current.appendChild(br)
      }

      // Debug: verify insertion

      // Verify DOM insertion
      setTimeout(() => {
        const insertedVideo = document.querySelector(`[data-youtube-embed="${videoId}"]`)
        if (insertedVideo) {
          const iframe = insertedVideo.querySelector('iframe')
          if (iframe) {
          }
        }
      }, 100)

      // Auto-clean selection
      setTimeout(() => {
        const sel = window.getSelection()
        sel?.removeAllRanges()
      }, 0)
    }

    // Close modal and reset
    setShowYouTubeModal(false)
    setYoutubeLink('')
  }

  const handleCloseYouTubeModal = () => {
    setShowYouTubeModal(false)
    setYoutubeLink('')
  }

  // Text + Body function - Inserts default title and body text
  const handleTextBodyInsert = () => {
    if (editorRef.current) {
      editorRef.current.focus()

      // Choose insertion spot
      if (insertionTarget === 'start') ensureSelectionAtStart()
      else if (insertionTarget === 'end') ensureSelectionAtEnd()
      restoreSelection()

      // Create container for title and body
      const container = document.createElement('div')
      container.style.margin = '16px 0'

      // Create title element with '제목' style preset
      const heading = document.createElement('div')
      const headingStyle = textStylePresets['제목']
      heading.style.fontSize = headingStyle.fontSize
      heading.style.fontFamily = headingStyle.fontFamily
      heading.style.lineHeight = headingStyle.lineHeight
      heading.style.color = headingStyle.color
      heading.style.fontWeight = headingStyle.fontWeight
      heading.style.display = 'block'
      heading.style.marginBottom = '6px'
      heading.setAttribute('data-style', '제목')
      heading.textContent = '제목을 입력하세요' // Default title text
      container.appendChild(heading)

      // Create body element with '본문' style preset
      const body = document.createElement('div')
      const bodyStyle = textStylePresets['본문']
      body.style.fontSize = bodyStyle.fontSize
      body.style.fontFamily = bodyStyle.fontFamily
      body.style.lineHeight = bodyStyle.lineHeight
      body.style.color = bodyStyle.color
      body.style.fontWeight = bodyStyle.fontWeight
      body.style.display = 'block'
      body.setAttribute('data-style', '본문')
      body.textContent = '본문 내용을 입력하세요' // Default body text
      container.appendChild(body)

      // Add a line break after for easier editing
      const br = document.createElement('br')
      container.appendChild(br)

      // Insert the container at cursor position
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Add a line break after container for clear cursor positioning
        const extraBr = document.createElement('br')
        container.parentNode?.insertBefore(extraBr, container.nextSibling)

        // Move cursor after the line break
        range.setStartAfter(extraBr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }
  }

  // Tab-specific content insertion handlers
  const handleAboutTabClick = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      if (insertionTarget === 'start') ensureSelectionAtStart()
      else if (insertionTarget === 'end') ensureSelectionAtEnd()
      restoreSelection()

      const container = document.createElement('div')
      container.style.margin = '16px 0'
      container.setAttribute('data-section', 'about')

      const heading = document.createElement('div')
      const headingStyle = textStylePresets['제목']
      heading.style.fontSize = headingStyle.fontSize
      heading.style.fontFamily = headingStyle.fontFamily
      heading.style.fontWeight = headingStyle.fontWeight
      heading.style.color = headingStyle.color
      heading.style.display = 'block'
      heading.style.marginBottom = '4px'
      heading.textContent = '퇴근 후 1시간 러닝 같이 해요 (초보 환영)\n무엇을 하는지 먼저 보여주세요 · 20~35자'
      container.appendChild(heading)

      const body = document.createElement('div')
      const bodyStyle = textStylePresets['본문']
      body.style.fontSize = bodyStyle.fontSize
      body.style.fontFamily = bodyStyle.fontFamily
      body.style.color = bodyStyle.color
      body.style.display = 'block'
      body.textContent = '이 모임은 ___을/를 ___해요\n진행: ___ → ___ → 마무리\n준비물/비용: ___\n장소/만남: ___ (도착: __분 전)'
      container.appendChild(body)

      const br = document.createElement('br')
      container.appendChild(br)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Add a line break after container for clear cursor positioning
        const extraBr = document.createElement('br')
        container.parentNode?.insertBefore(extraBr, container.nextSibling)

        range.setStartAfter(extraBr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }
    setSelectedTab('about')
  }

  const handleHostWelcomeTabClick = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      if (insertionTarget === 'start') ensureSelectionAtStart()
      else if (insertionTarget === 'end') ensureSelectionAtEnd()
      restoreSelection()

      const container = document.createElement('div')
      container.style.margin = '16px 0'
      container.setAttribute('data-section', 'about')

      const heading = document.createElement('div')
      const headingStyle = textStylePresets['제목']
      heading.style.fontSize = headingStyle.fontSize
      heading.style.fontFamily = headingStyle.fontFamily
      heading.style.fontWeight = headingStyle.fontWeight
      heading.style.color = headingStyle.color
      heading.style.display = 'block'
      heading.style.marginBottom = '4px'
      heading.textContent = '환영인사를 입력해주세요.'
      container.appendChild(heading)

      // const body = document.createElement('div')
      // const bodyStyle = textStylePresets['본문']
      // body.style.fontSize = bodyStyle.fontSize
      // body.style.fontFamily = bodyStyle.fontFamily
      // body.style.color = bodyStyle.color
      // body.style.display = 'block'
      // body.textContent = '이 모임은 ___을/를 ___해요\n진행: ___ → ___ → 마무리\n준비물/비용: ___\n장소/만남: ___ (도착: __분 전)'
      // container.appendChild(body)

      const br = document.createElement('br')
      container.appendChild(br)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Add a line break after container for clear cursor positioning
        const extraBr = document.createElement('br')
        container.parentNode?.insertBefore(extraBr, container.nextSibling)

        range.setStartAfter(extraBr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }
    setSelectedTab('about')
  }

  const handleInstructorTabClick = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      restoreSelection()

      const container = document.createElement('div')
      container.style.margin = '16px 0'
      container.setAttribute('data-section', 'instructor')

      // Field 1: List2 (title)
      const title = document.createElement('div')
      const titleStyle = textStylePresets['제목2']
      title.style.fontSize = titleStyle.fontSize
      title.style.fontFamily = titleStyle.fontFamily
      title.style.fontWeight = titleStyle.fontWeight
      title.style.color = titleStyle.color
      title.style.display = 'block'
      title.style.marginBottom = '12px'
      title.textContent = '1문장 / 30자 이내로 만들어주세요 직함보다는 “무엇을 하는 사람인지”만 전달해 주시는 것을 추천드려요.'
      container.appendChild(title)

      // Field 2: Image placeholder with file input functionality
      const imageWrapper = document.createElement('div')
      imageWrapper.style.position = 'relative'
      imageWrapper.style.width = '100px'
      imageWrapper.style.height = '100px'
      imageWrapper.style.marginBottom = '12px'
      imageWrapper.contentEditable = 'false'
      imageWrapper.setAttribute('contenteditable', 'false')

      const imagePlaceholder = document.createElement('div')
      imagePlaceholder.style.width = '100px'
      imagePlaceholder.style.height = '100px'
      imagePlaceholder.style.borderRadius = '50%'
      imagePlaceholder.style.backgroundColor = '#E5E7EB'
      imagePlaceholder.style.display = 'flex'
      imagePlaceholder.style.alignItems = 'center'
      imagePlaceholder.style.justifyContent = 'center'
      imagePlaceholder.style.cursor = 'pointer'
      imagePlaceholder.style.overflow = 'hidden'
      imagePlaceholder.contentEditable = 'false'
      imagePlaceholder.setAttribute('contenteditable', 'false')
      // Prevent text input inside image
      imagePlaceholder.addEventListener('keydown', (e) => e.preventDefault())
      imagePlaceholder.addEventListener('keypress', (e) => e.preventDefault())
      imagePlaceholder.addEventListener('input', (e) => e.preventDefault())

      // Add + icon on right corner
      const plusIcon = document.createElement('div')
      plusIcon.style.position = 'absolute'
      plusIcon.style.bottom = '0'
      plusIcon.style.right = '0'
      plusIcon.style.width = '28px'
      plusIcon.style.height = '28px'
      plusIcon.style.borderRadius = '50%'
      plusIcon.style.backgroundColor = '#E5E7EB'
      plusIcon.style.display = 'flex'
      plusIcon.style.alignItems = 'center'
      plusIcon.style.justifyContent = 'center'
      plusIcon.style.cursor = 'pointer'
      plusIcon.style.border = '2px solid white'
      plusIcon.style.fontSize = '18px'
      plusIcon.style.color = 'white'
      plusIcon.style.fontWeight = 'bold'
      plusIcon.innerHTML = '+'
      plusIcon.style.pointerEvents = 'none'
      plusIcon.contentEditable = 'false'
      plusIcon.setAttribute('contenteditable', 'false')

      // Add click handler to open file picker
      const openFilePicker = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (file) {
            // Process image and get base64 data URL (instant!)
            processImageForDisplay(file).then((imageUrl: string) => {
              // Replace placeholder with actual image
              imagePlaceholder.innerHTML = ''
              imagePlaceholder.style.backgroundImage = `url(${imageUrl})`
              imagePlaceholder.style.backgroundSize = 'cover'
              imagePlaceholder.style.backgroundPosition = 'center'

              // Show close button after image is loaded
              if (closeBtn) {
                closeBtn.style.display = 'flex'
              }
            })
          }
        }
        input.click()
      }

      imagePlaceholder.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openFilePicker()

        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (file) {
            try {
              // Upload image to server and get URL
              const imageUrl = await uploadImageToServer(file)
              // Replace placeholder with actual image
              imagePlaceholder.innerHTML = ''
              imagePlaceholder.style.backgroundImage = `url(${imageUrl})`
              imagePlaceholder.style.backgroundSize = 'cover'
              imagePlaceholder.style.backgroundPosition = 'center'
            } catch (error) {
              alert('이미지 업로드에 실패했습니다.')
            }
          }
        }
        input.click()
      }

      plusIcon.style.pointerEvents = 'auto'
      plusIcon.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        openFilePicker()
      }

      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.innerText = '×'
      closeBtn.setAttribute('aria-label', 'Remove instructor image')
      closeBtn.contentEditable = 'false'
      closeBtn.setAttribute('contenteditable', 'false')
      closeBtn.style.position = 'absolute'
      closeBtn.style.top = '-4px'
      closeBtn.style.left = '-4px'
      closeBtn.style.width = '24px'
      closeBtn.style.height = '24px'
      closeBtn.style.borderRadius = '50%'
      closeBtn.style.border = 'none'
      closeBtn.style.background = 'rgba(0,0,0,0.6)'
      closeBtn.style.color = '#fff'
      closeBtn.style.cursor = 'pointer'
      closeBtn.style.lineHeight = '24px'
      closeBtn.style.textAlign = 'center'
      closeBtn.style.fontSize = '16px'
      closeBtn.style.display = 'none' // Hidden by default, shown after image is loaded
      closeBtn.style.zIndex = '10'
      closeBtn.onclick = (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        // Reset to placeholder
        imagePlaceholder.style.backgroundImage = 'none'
        imagePlaceholder.innerHTML = ''
        closeBtn.style.display = 'none'
      }


      imageWrapper.appendChild(imagePlaceholder)
      imageWrapper.appendChild(plusIcon)
      container.appendChild(imageWrapper)

      // Field 3: Paragraph text
      const paragraph = document.createElement('div')
      const paraStyle = textStylePresets['본문']
      paragraph.style.fontSize = paraStyle.fontSize
      paragraph.style.fontFamily = paraStyle.fontFamily
      paragraph.style.color = paraStyle.color
      paragraph.style.display = 'block'
      paragraph.style.marginBottom = '12px'
      paragraph.contentEditable = 'true'
      paragraph.setAttribute('contenteditable', 'true')
      paragraph.textContent = '강사 소개를 입력하세요'
      container.appendChild(paragraph)

      // Field 4: Follow this host (12px bold)
      const followText = document.createElement('div')
      followText.style.fontSize = '12px'
      followText.style.fontWeight = 'bold'
      followText.style.color = '#000'
      followText.style.display = 'block'
      followText.textContent = '호스트 팔로우하기'
      container.appendChild(followText)

      const br = document.createElement('br')
      container.appendChild(br)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Position cursor at the start of the paragraph (editable text area)
        const newRange = document.createRange()
        newRange.selectNodeContents(paragraph)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
        savedSelectionRef.current = newRange.cloneRange()
      }
    }
    setSelectedTab('instructor')
  }

  const handlePlaceTabClick = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      restoreSelection()

      const container = document.createElement('div')
      container.style.margin = '16px 0'
      container.setAttribute('data-section', 'place')

      const heading = document.createElement('div')
      const headingStyle = textStylePresets['제목']
      heading.style.fontSize = headingStyle.fontSize
      heading.style.fontFamily = headingStyle.fontFamily
      heading.style.fontWeight = headingStyle.fontWeight
      heading.style.color = headingStyle.color
      heading.style.display = 'block'
      heading.style.marginBottom = '8px'
      heading.textContent = `'모임 때 같이 할 내용' 처럼 무엇을 함께 하는지 한 줄로 적어주세요`
      container.appendChild(heading)

      const body = document.createElement('div')
      const bodyStyle = textStylePresets['본문']
      body.style.fontSize = bodyStyle.fontSize
      body.style.fontFamily = bodyStyle.fontFamily
      body.style.color = bodyStyle.color
      body.style.display = 'block'
      body.textContent = '오늘 같이 하는 일: ___\n진행: ___ → ___ → 마무리\n시간/준비물: ___\n참여 방식: ___'
      container.appendChild(body)

      const br = document.createElement('br')
      container.appendChild(br)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Add a line break after container for clear cursor positioning
        const extraBr = document.createElement('br')
        container.parentNode?.insertBefore(extraBr, container.nextSibling)

        range.setStartAfter(extraBr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }
    setSelectedTab('place')
  }

  const handleParticipantsTabClick = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      restoreSelection()

      const container = document.createElement('div')
      container.style.margin = '16px 0'
      container.setAttribute('data-section', 'participants')

      const heading = document.createElement('div')
      const headingStyle = textStylePresets['제목']
      heading.style.fontSize = headingStyle.fontSize
      heading.style.fontFamily = headingStyle.fontFamily
      heading.style.fontWeight = headingStyle.fontWeight
      heading.style.color = headingStyle.color
      heading.style.display = 'block'
      heading.style.marginBottom = '8px'
      heading.textContent = '이런 분께 추천해요 처럼 짧게 한 줄로 적어주세요'
      container.appendChild(heading)

      const body = document.createElement('div')
      const bodyStyle = textStylePresets['본문']
      body.style.fontSize = bodyStyle.fontSize
      body.style.fontFamily = bodyStyle.fontFamily
      body.style.color = bodyStyle.color
      body.style.display = 'block'
      body.textContent = '이런 분께 추천해요 (2~4개)\n\n• ___\n• ___\n• ___'
      container.appendChild(body)

      const br = document.createElement('br')
      container.appendChild(br)

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(container)

        // Add a line break after container for clear cursor positioning
        const extraBr = document.createElement('br')
        container.parentNode?.insertBefore(extraBr, container.nextSibling)

        range.setStartAfter(extraBr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        savedSelectionRef.current = range.cloneRange()
      }
    }
    setSelectedTab('participants')
  }

  // Get handler function by name
  const getHandlerByName = (handlerName: string) => {
    switch (handlerName) {
      case 'handleAboutTabClick': return handleAboutTabClick
      case 'handleInstructorTabClick': return handleInstructorTabClick
      case 'handlePlaceTabClick': return handlePlaceTabClick
      case 'handleParticipantsTabClick': return handleParticipantsTabClick
      case 'handleHostWelcomeTabClick': return handleHostWelcomeTabClick
      default: return () => { }
    }
  }

  // Drag and drop handlers for tabs (Desktop)
  const handleTabDragStart = (index: number) => {
    setDraggedTabIndex(index)
  }

  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedTabIndex === null || draggedTabIndex === index) return

    const newOrder = [...tabOrder]
    const draggedItem = newOrder[draggedTabIndex]
    newOrder.splice(draggedTabIndex, 1)
    newOrder.splice(index, 0, draggedItem)

    setTabOrder(newOrder)
    setDraggedTabIndex(index)
  }

  const handleTabDragEnd = () => {
    setDraggedTabIndex(null)

    // Reorder content in editor after drag ends
    reorderEditorContent()
  }

  // Touch handlers for mobile drag and drop
  const handleTabTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    setDraggedTabIndex(index)
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '0.5'
  }

  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (draggedTabIndex === null) return

    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    // Find the tab button under the touch
    const tabButton = element?.closest('[data-tab-index]')
    if (tabButton) {
      const targetIndex = parseInt(tabButton.getAttribute('data-tab-index') || '-1')
      if (targetIndex !== -1 && targetIndex !== draggedTabIndex) {
        const newOrder = [...tabOrder]
        const draggedItem = newOrder[draggedTabIndex]
        newOrder.splice(draggedTabIndex, 1)
        newOrder.splice(targetIndex, 0, draggedItem)

        setTabOrder(newOrder)
        setDraggedTabIndex(targetIndex)
      }
    }
  }

  const handleTabTouchEnd = (e: React.TouchEvent) => {
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '1'
    setDraggedTabIndex(null)
    setTouchDragOverIndex(null)

    // Reorder content in editor after drag ends
    reorderEditorContent()
  }

  // Scoped drag handlers for editor tools toggle only
  useEffect(() => {
    if (!isToolsDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      if (toolsDragStartY !== null) {
        setToolsDragCurrentY(clientY)

        // Calculate drag distance from original start position
        const dragDistance = clientY - toolsDragStartY

        // Convert drag distance to vh units (viewport height percentage)
        // Positive drag (down) decreases height, negative drag (up) increases height
        const viewportHeight = window.innerHeight
        const dragVh = (dragDistance / viewportHeight) * 100

        // Use initial height when drag started for accurate calculation
        // Update box height - subtract dragVh because dragging down should decrease height
        // Min: 5vh (almost disappears), Max: 50vh (half screen)
        const initialHeight = initialBoxHeightOnDragStart.current
        const newHeight = Math.max(5, Math.min(50, initialHeight - dragVh))
        setBoxHeight(newHeight)
      }
    }

    const handleEnd = () => {
      setIsToolsDragging(false)
      setToolsDragStartY(null)
      setToolsDragCurrentY(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isToolsDragging, toolsDragStartY, toolsDragCurrentY, boxHeight])

  // Reorder content sections in the editor based on tab order
  const reorderEditorContent = () => {
    if (!editorRef.current) return

    // Find all section containers in the editor
    const sections = Array.from(editorRef.current.querySelectorAll('[data-section]'))

    if (sections.length === 0) return

    // Create a map of sections by their type
    const sectionMap = new Map<string, Element>()
    sections.forEach(section => {
      const sectionType = section.getAttribute('data-section')
      if (sectionType) {
        sectionMap.set(sectionType, section)
      }
    })

    // Remove all sections from editor
    sections.forEach(section => {
      if (section && section.parentNode) {
        section.remove()
      }
    })

    // Re-insert sections in the new tab order
    tabOrder.forEach(tab => {
      const section = sectionMap.get(tab.key)
      if (section && editorRef.current) {
        editorRef.current.appendChild(section)
      }
    })
  }

  // Add ref to track component mount status
  const mountedRef = React.useRef(true)

  // Refs for hidden input elements (React-managed)
  const hiddenDateInputRef = React.useRef<HTMLInputElement>(null)
  const hiddenTimeInputRef = React.useRef<HTMLInputElement>(null)

  const [isAgeFormOpen, setIsAgeFormOpen] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [dob, setDob] = React.useState('')
  // Mobile-friendly date picker states
  const [birthYear, setBirthYear] = React.useState('')
  const [birthMonth, setBirthMonth] = React.useState('')
  const [birthDay, setBirthDay] = React.useState('')
  const [nationality, setNationality] = React.useState<'local' | 'foreign'>('local')
  const [gender, setGender] = React.useState<'male' | 'female'>('male')
  const [agreePersonal, setAgreePersonal] = React.useState(false)
  const [agreeThirdParty, setAgreeThirdParty] = React.useState(false)
  const [isAgeComplete, setIsAgeComplete] = React.useState(false)
  const [showCreateIntro, setShowCreateIntro] = React.useState(false)
  const [isCheckingAgeStatus, setIsCheckingAgeStatus] = React.useState(true)
  const [meetingConsentPersonal, setMeetingConsentPersonal] = React.useState(false)
  const [meetingConsentGuidelines, setMeetingConsentGuidelines] = React.useState(false)
  const [createStep, setCreateStep] = React.useState<
    'intro' | 'details' | 'schedule' | 'duration' | 'participants' | 'customize' | 'detail' | 'completion'
  >(() => {
    // Check if we're in edit mode (has id parameter)
    const id = searchParams.get('id')
    return id ? 'details' : 'intro'
  })
  const [highestStepReached, setHighestStepReached] = React.useState<number>(0) // Track highest step index reached
  const [selectedCategory, setSelectedCategory] = React.useState<string>('1')
  const [minParticipants, setMinParticipants] = React.useState<number>(4)
  const [maxParticipants, setMaxParticipants] = React.useState<number>(4)
  const [feeAmount, setFeeAmount] = React.useState<string>('')
  const [feeAmountError, setFeeAmountError] = React.useState<string>('')
  const [feeBreakdown, setFeeBreakdown] = React.useState<{
    contentProduction: boolean
    hostSpot: boolean
    noShowFee: boolean
    royalties: boolean
    materialCost: boolean
    refreshmentFee: boolean
    other: boolean
    otherReason: string
  }>({
    contentProduction: false,
    hostSpot: false,
    noShowFee: false,
    royalties: false,
    materialCost: false,
    refreshmentFee: false,
    other: false,
    otherReason: ''
  })
  const [duration, setDuration] = React.useState<number>(60)
  const [participants, setParticipants] = React.useState<number>(8)
  const [clubName, setClubName] = React.useState<string>('')
  const [selectedTab, setSelectedTab] = React.useState<'about' | 'instructor' | 'place' | 'participants'>('about')
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [selectedMeetingType, setSelectedMeetingType] = React.useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = React.useState<number | null>(null)
  const [roadNameLotNumber, setRoadNameLotNumber] = React.useState('')
  const [detailedAddress, setDetailedAddress] = React.useState('')
  const [feeOption, setFeeOption] = React.useState<'yes' | 'no'>('yes') // Changed to English enum
  const [operationType, setOperationType] = React.useState<'콘텐츠 제작비' | '호스트 수고비'>('콘텐츠 제작비')
  const [feeTags, setFeeTags] = React.useState<string[]>(['노쇼발생비'])
  const [inputValue, setInputValue] = React.useState<string>('')
  const [activities, setActivities] = React.useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = React.useState(true)
  const [categories, setCategories] = React.useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(true)
  const [iconY, setIconY] = useState(0);
  const [isDraggingDown, setIsDraggingDown] = useState(false);
  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      setIconY(e.clientY); // store latest Y-position
    }
  });
  // Initialize with tomorrow at 10 AM to avoid past dates
  const getCurrentDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1) // Add 1 day
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getCurrentTime = () => {
    // Default to 10:00 AM
    return '10:00'
  }

  // Helpers to enforce future-only selection
  const getTodayDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getNowTimeString = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatKoreanDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}월 ${day}일`
  }

  const formatKoreanTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? '오후' : '오전'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${ampm} ${displayHour}시 ${minutes}분`
  }

  // Initialize with tomorrow at 10 AM to prevent past date issues
  const [dateValue, setDateValue] = React.useState(getCurrentDate())
  const [timeValue, setTimeValue] = React.useState(getCurrentTime())
  const [meetingDate, setMeetingDate] = React.useState(formatKoreanDate(getCurrentDate()))
  const [meetingTime, setMeetingTime] = React.useState(formatKoreanTime(getCurrentTime()))
  const [meetingFrequency, setMeetingFrequency] = React.useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('weekly') // Changed to English enum
  const [showFrequencyPicker, setShowFrequencyPicker] = React.useState(false)
  const dateInputRef = React.useRef<HTMLInputElement>(null)
  const timeInputRef = React.useRef<HTMLInputElement>(null)

  // Helper function to get display text for frequency (language-independent)
  const getFrequencyLabel = (freq: 'none' | 'weekly' | 'biweekly' | 'monthly') => {
    const labels = {
      none: '설정하지 않음',
      weekly: '매주',
      biweekly: '2주 간격으로',
      monthly: '한달 간격으로'
    }
    return labels[freq]
  }
  const labelSx = { width: '25%' }
  const leftInputSx = {
    flex: 1,
    '& .MuiInputBase-input': { textAlign: 'left', color: '#111827', fontSize: '0.875rem', padding: 0 }
  }

  // Map dot index to step name (dots are 0-3, representing the 4 visual progress dots)
  const getStepNameFromIndex = (dotIndex: number): typeof createStep => {
    const stepMap: Record<number, typeof createStep> = {
      0: 'intro',     // Dot 0 -> intro step
      1: 'details',   // Dot 1 -> details step
      2: 'schedule',  // Dot 2 -> schedule step (duration also shows this dot)
      3: 'detail'     // Dot 3 -> detail step
    }
    return stepMap[dotIndex] || 'intro'
  }

  // Progress indicator (borrowed from login page for consistent design)
  const renderProgress = (currentStepIndex: number, totalSteps: number) => {
    const dotSize = 6
    const gapPx = 20
    const paddingXTotal = 20

    // Green bar shows current progress (up to and including current step)
    const greenDots = currentStepIndex + 1

    // Remaining dots (all steps after current, whether reached or not)
    const remainingDots = totalSteps - greenDots

    // Calculate pill width - all dots same size now
    const pillWidth = paddingXTotal + greenDots * dotSize + Math.max(greenDots - 1, 0) * gapPx

    return (
      <Box className='flex items-center justify-center mt-8 mb-5 gap-2'>
        {/* Green progress pill - shows current step */}
        <Box
          className='h-6 rounded-full bg-green-500 flex items-center justify-start px-2.5'
          sx={{
            width: pillWidth,
            transition: 'width 1s ease-in-out'
          }}
        >
          <Box className='flex items-center' style={{ columnGap: `${gapPx}px` }}>
            {Array.from({ length: greenDots }, (_, i) => {
              const isCurrentStep = i === currentStepIndex
              const isClickable = i <= highestStepReached

              return (
                <Box
                  key={i}
                  sx={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    cursor: isClickable ? 'pointer' : 'default',
                    transition: 'all 1s ease-in-out',
                    opacity: isCurrentStep ? 1 : 0.7,
                    '&:hover': isClickable ? {
                      transform: 'scale(1.3)',
                      opacity: 1
                    } : {}
                  }}
                  onClick={() => {
                    if (isClickable) {
                      const targetStep = getStepNameFromIndex(i)
                      safeSetState(() => setCreateStep(targetStep))
                    }
                  }}
                />
              )
            })}
          </Box>
        </Box>

        {/* Gray dots - remaining steps */}
        {remainingDots > 0 && (
          <Box className='flex items-center' style={{ columnGap: `${gapPx}px` }}>
            {Array.from({ length: remainingDots }, (_, i) => {
              const stepIndex = currentStepIndex + 1 + i
              const isReached = stepIndex <= highestStepReached

              return (
                <Box
                  key={`remaining-${i}`}
                  sx={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#D1D5DB',
                    opacity: 0.3,
                    cursor: isReached ? 'pointer' : 'not-allowed',
                    transition: 'all 1s ease-in-out',
                    '&:hover': isReached ? {
                      transform: 'scale(1.3)',
                      opacity: 0.6
                    } : {}
                  }}
                  onClick={() => {
                    if (isReached) {
                      const targetStep = getStepNameFromIndex(stepIndex)
                      safeSetState(() => setCreateStep(targetStep))
                    }
                  }}
                />
              )
            })}
          </Box>
        )}
      </Box>
    )
  }

  // Confetti auto-hide effect
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  // Simple functions to trigger hidden inputs
  const triggerDatePicker = (event?: React.MouseEvent<HTMLSpanElement>) => {
    // Create a temporary input element
    const tempInput = document.createElement('input')
    tempInput.type = 'date'
    tempInput.value = dateValue
    tempInput.min = getTodayDateString()

    // Ensure we only remove this node once
    let isRemoved = false
    const safeRemove = () => {
      if (isRemoved) return
      isRemoved = true
      if (document.body.contains(tempInput)) {
        try {
          document.body.removeChild(tempInput)
        } catch { }
      }
    }

    // Get position of clicked element
    let top = window.innerHeight / 2
    let left = window.innerWidth / 2

    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Estimate calendar picker size (typical mobile calendar)
      const pickerWidth = 320
      const pickerHeight = 400

      // Position below the clicked text
      top = rect.bottom + 5 // 5px gap below text
      left = rect.left

      // Check right boundary - if calendar would overflow right edge
      if (left + pickerWidth > viewportWidth) {
        left = viewportWidth - pickerWidth - 10 // 10px margin from edge
      }

      // Check left boundary
      if (left < 10) {
        left = 10
      }

      // Check bottom boundary - if calendar would overflow bottom
      if (top + pickerHeight > viewportHeight) {
        // Open above the text instead
        top = rect.top - pickerHeight - 5
        // If still overflows top, position at top of screen
        if (top < 10) {
          top = 10
        }
      }
    }

    tempInput.style.position = 'fixed'
    tempInput.style.top = `${top}px`
    tempInput.style.left = `${left}px`
    tempInput.style.opacity = '0.01'
    tempInput.style.pointerEvents = 'auto'
    tempInput.style.zIndex = '9999'
    // tempInput.style.boxShadow = '1px 1px 1px 1px rgba(0, 0, 0, 0.1)'

    // Add to DOM
    document.body.appendChild(tempInput)

    // Handle change event
    const handleChange = (e: Event) => {
      let newDateValue = (e.target as HTMLInputElement).value
      const today = getTodayDateString()
      if (newDateValue < today) {
        newDateValue = today
      }
      safeSetState(() => {
        setDateValue(newDateValue)
        setMeetingDate(formatKoreanDate(newDateValue))
        // If selecting today, ensure time is not in the past
        if (newDateValue === today && timeValue < getNowTimeString()) {
          const correctedTime = getNowTimeString()
          setTimeValue(correctedTime)
          setMeetingTime(formatKoreanTime(correctedTime))
        }
      })
      // Remove from DOM
      safeRemove()
      tempInput.removeEventListener('change', handleChange)
    }
    tempInput.addEventListener('change', handleChange)

    // Focus and trigger
    tempInput.focus()

    // Try multiple methods to trigger the picker
    try {
      if ('showPicker' in tempInput) {
        ; (tempInput as any).showPicker()
      } else {
        ; (tempInput as any).click()
      }
    } catch (e) {
      tempInput.click()
    }

    // Fallback cleanup on blur with a short delay to avoid closing picker immediately
    const handleBlur = () => {
      setTimeout(() => {
        safeRemove()
      }, 300)
    }
    tempInput.addEventListener('blur', handleBlur, { once: true })
  }

  const triggerTimePicker = (event?: React.MouseEvent<HTMLSpanElement>) => {
    // Create a temporary input element
    const tempInput = document.createElement('input')
    tempInput.type = 'time'
    tempInput.value = timeValue
    // If date is today, restrict time to now or later
    const today = getTodayDateString()
    if (dateValue === today) {
      tempInput.min = getNowTimeString()
    } else {
      tempInput.removeAttribute('min')
    }

    // Ensure we only remove this node once
    let isRemoved = false
    const safeRemove = () => {
      if (isRemoved) return
      isRemoved = true
      if (document.body.contains(tempInput)) {
        try {
          document.body.removeChild(tempInput)
        } catch { }
      }
    }

    // Get position of clicked element
    let top = window.innerHeight / 2
    let left = window.innerWidth / 2

    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Estimate time picker size (typical mobile time picker)
      const pickerWidth = 280
      const pickerHeight = 300

      // Position below the clicked text
      top = rect.bottom + 5 // 5px gap below text
      left = rect.left

      // Check right boundary - if picker would overflow right edge
      if (left + pickerWidth > viewportWidth) {
        left = viewportWidth - pickerWidth - 10 // 10px margin from edge
      }

      // Check left boundary
      if (left < 10) {
        left = 10
      }

      // Check bottom boundary - if picker would overflow bottom
      if (top + pickerHeight > viewportHeight) {
        // Open above the text instead
        top = rect.top - pickerHeight - 5
        // If still overflows top, position at top of screen
        if (top < 10) {
          top = 10
        }
      }
    }

    tempInput.style.position = 'fixed'
    tempInput.style.top = `${top}px`
    tempInput.style.left = `${left}px`
    tempInput.style.opacity = '0.01'
    tempInput.style.pointerEvents = 'auto'
    tempInput.style.zIndex = '9999'

    // Add to DOM
    document.body.appendChild(tempInput)

    // Handle change event
    const handleChangeTime = (e: Event) => {
      let newTimeValue = (e.target as HTMLInputElement).value
      const today = getTodayDateString()
      if (dateValue === today) {
        const nowTime = getNowTimeString()
        if (newTimeValue < nowTime) {
          newTimeValue = nowTime
        }
      }
      safeSetState(() => {
        setTimeValue(newTimeValue)
        setMeetingTime(formatKoreanTime(newTimeValue))
      })
      // Remove from DOM
      safeRemove()
      tempInput.removeEventListener('change', handleChangeTime)
    }
    tempInput.addEventListener('change', handleChangeTime)

    // Focus and trigger
    tempInput.focus()

    // Try multiple methods to trigger the picker
    try {
      if ('showPicker' in tempInput) {
        ; (tempInput as any).showPicker()
      } else {
        ; (tempInput as any).click()
      }
    } catch (e) {
      tempInput.click()
    }

    // Fallback cleanup on blur with a short delay to avoid closing picker immediately
    const handleBlurTime = () => {
      setTimeout(() => {
        safeRemove()
      }, 300)
    }
    tempInput.addEventListener('blur', handleBlurTime, { once: true })
  }

  // Component mount/unmount tracking
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: true } }))
    } catch { }
    return () => {
      try {
        window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: false } }))
      } catch { }
    }
  }, [])


  // Update ref when isExpanded changes
  React.useEffect(() => {
    isExpandedRef.current = isExpanded
  }, [isExpanded])


  // Drag handler for expand functionality
  React.useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setDragCurrentY(clientY)
    }

    const handleEnd = () => {
      if (dragStartY !== null && dragCurrentY !== null) {
        const dragDistance = dragStartY - dragCurrentY

        if (isExpandedRef.current) {
          // When expanded, dragging down more than 50px should collapse
          if (dragDistance < -50) {
            setIsExpanded(false)
          }
        } else {
          // When collapsed, dragging up more than 100px should expand
          if (dragDistance > 100) {
            setIsExpanded(true)
          }
        }
      }
      setIsDragging(false)
      setDragStartY(null)
      setDragCurrentY(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragStartY, dragCurrentY])

  // Safe state setter function
  const safeSetState = React.useCallback((setter: () => void) => {
    if (mountedRef.current) {
      try {
        setter()
      } catch (error) {
        // Error setting state
      }
    }
  }, [])

  // Ensure minParticipants is never greater than maxParticipants
  React.useEffect(() => {
    if (minParticipants > maxParticipants) {
      safeSetState(() => setMaxParticipants(minParticipants))
    }
  }, [minParticipants, maxParticipants, safeSetState])

  // Reset only UI states when leaving detail step (NEVER clear content)
  const prevStepRef = React.useRef(createStep)
  React.useEffect(() => {
    // Only save when LEAVING detail step (not when entering other steps from non-detail)
    const leavingDetail = prevStepRef.current === 'detail' && createStep !== 'detail' && createStep !== 'completion'

    if (leavingDetail) {
      // Save content one last time before resetting UI (or clear if empty)
      if (editorRef.current?.innerHTML) {
        const content = editorRef.current.innerHTML
        const trimmedContent = content.trim()
        if (trimmedContent && trimmedContent !== '<br>' && trimmedContent !== '') {
          setSavedEditorContent(content)
        } else {
          setSavedEditorContent('')
        }
      }
      // If editor doesn't exist but we have saved content, keep it
      // Don't clear savedEditorContent just because editor is unmounted
    }

    if (createStep !== 'detail' && createStep !== 'completion') {
      // Only reset UI-related states, NOT content
      setIsExpanded(false)
      setBoxHeight(50)
      setSelectedImageId(null)
      setResizeControlPosition(null)
      setShowColorPicker(false)
      setShowStyleMenu(false)
      setShowYouTubeModal(false)
      savedSelectionRef.current = null
    }

    prevStepRef.current = createStep
  }, [createStep])

  // Save content when isExpanded changes from true to false
  const prevExpandedRefForSave = React.useRef(isExpanded)
  React.useEffect(() => {
    // Save when collapsing the editor (or clear if empty)
    if (createStep === 'detail' && !isExpanded && prevExpandedRefForSave.current) {
      if (editorRef.current?.innerHTML) {
        const content = editorRef.current.innerHTML
        const trimmedContent = content.trim()
        if (trimmedContent && trimmedContent !== '<br>' && trimmedContent !== '') {
          setSavedEditorContent(content)
        } else {
          // Content is empty, clear saved content
          setSavedEditorContent('')
        }
      } else {
        setSavedEditorContent('')
      }
    }
    prevExpandedRefForSave.current = isExpanded
  }, [isExpanded, createStep])

  // Save editor content automatically when it changes (for persistence)
  React.useEffect(() => {
    if (createStep === 'detail' && editorRef.current) {
      const saveContent = () => {
        if (editorRef.current?.innerHTML) {
          const content = editorRef.current.innerHTML
          const trimmedContent = content.trim()
          // Save if there's actual content, clear if empty
          if (trimmedContent && trimmedContent !== '<br>' && trimmedContent !== '') {
            setSavedEditorContent(content)
          } else if (!savedEditorContent) {
            // Only clear saved content if there's no previously saved content
            // This prevents clearing saved content on initial render before restoration
            setSavedEditorContent('')
          }
        }
      }

      // DON'T save immediately - let restoration happen first
      // Only set up the input listener to save when user types

      // Save on input
      const handleInput = () => {
        clearTimeout((window as any).__editorSaveTimeout)
        clearTimeout((window as any).__editorHistoryTimeout)

          // Save to localStorage after 500ms
          ; (window as any).__editorSaveTimeout = setTimeout(saveContent, 500)

          // Save to history for undo/redo after 1000ms (less frequent to avoid too many history entries)
          ; (window as any).__editorHistoryTimeout = setTimeout(() => {
            if (editorRef.current && !isUndoingRef.current) {
              const content = editorRef.current.innerHTML
              if (content && content.trim()) {
                saveToHistory(content)
              }
            }
          }, 1000)
      }

      editorRef.current.addEventListener('input', handleInput)
      const editor = editorRef.current

      return () => {
        // Save one last time before cleanup (only if there's content)
        if (editor?.innerHTML && editor.innerHTML.trim() && editor.innerHTML.trim() !== '<br>') {
          saveContent()
        }
        if (editor) {
          editor.removeEventListener('input', handleInput)
        }
        clearTimeout((window as any).__editorSaveTimeout)
        clearTimeout((window as any).__editorHistoryTimeout)
      }
    }
  }, [createStep, savedEditorContent])

  // Initialize history when editor content is available
  React.useEffect(() => {
    if (createStep === 'detail' && editorRef.current && !isUndoingRef.current) {
      const content = editorRef.current.innerHTML
      if (content && content.trim() && content !== '<br>') {
        // Initialize history if it's empty or if this is new content
        if (editorHistory.length === 0 || editorHistory[historyIndex] !== content) {
          const timer = setTimeout(() => {
            saveToHistory(content)
          }, 500)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [createStep, isExpanded, savedEditorContent])

  // Restore editor content when editor becomes available (when expanded)
  React.useEffect(() => {
    // Restore when: on detail step AND (expanded OR editor exists) AND have saved content
    if (createStep === 'detail' && savedEditorContent) {
      const attemptRestore = () => {
        if (editorRef.current) {
          const currentContent = editorRef.current.innerHTML.trim()

          // Restore if editor is empty or has minimal content
          if (!currentContent || currentContent === '' || currentContent === '<br>') {
            editorRef.current.innerHTML = savedEditorContent

            setTimeout(() => reattachEventListeners(), 100)

            return true // Successfully restored
          }
        }
        return false // Editor not ready or already has content
      }

      // Try immediately
      const restored = attemptRestore()

      // If not restored and we're expanded, try again after a small delay
      if (!restored && isExpanded) {
        const timer = setTimeout(() => {
          const success = attemptRestore()
          if (success) {
            setTimeout(() => reattachEventListeners(), 100)
          }
        }, 150)
        return () => clearTimeout(timer)
      }
    }
  }, [createStep, isExpanded, savedEditorContent])

  // Additional effect: Restore when isExpanded changes from false to true
  const prevExpandedRef = React.useRef(isExpanded)
  React.useEffect(() => {
    // Detect when expanded changes from false to true
    if (createStep === 'detail' && isExpanded && !prevExpandedRef.current && savedEditorContent && editorRef.current) {
      const timer = setTimeout(() => {
        if (editorRef.current) {
          const currentContent = editorRef.current.innerHTML.trim()
          if (!currentContent || currentContent === '' || currentContent === '<br>') {
            editorRef.current.innerHTML = savedEditorContent
            setTimeout(() => reattachEventListeners(), 100)
          }
        }
      }, 150)

      prevExpandedRef.current = isExpanded
      return () => clearTimeout(timer)
    }
    prevExpandedRef.current = isExpanded
  }, [isExpanded, createStep, savedEditorContent])

  // Validation function for each step
  const validateStep = (step: string): ValidationResult => {
    switch (step) {
      case 'intro':
        if (!meetingConsentPersonal) {
          return { isValid: false, errorMessage: '개인정보 처리에 대한 동의가 필요합니다.' }
        }
        if (!meetingConsentGuidelines) {
          return { isValid: false, errorMessage: '모임개설 가이드라인에 대한 동의가 필요합니다.' }
        }
        return { isValid: true }

      case 'details':
        // Activities are optional - no validation needed for selectedActivityId
        if (!selectedCategory) {
          return { isValid: false, errorMessage: '카테고리를 선택해주세요.' }
        }
        if (!roadNameLotNumber.trim()) {
          return { isValid: false, errorMessage: '도로명/지번을 입력해주세요.' }
        }
        if (!detailedAddress.trim()) {
          return { isValid: false, errorMessage: '상세주소를 입력해주세요.' }
        }
        // Validate fee amount if fee option is 'yes'
        if (feeOption === 'yes') {
          if (!feeAmount.trim()) {
            return { isValid: false, errorMessage: '참가비 금액을 입력해주세요.' }
          }
          if (!/^[0-9,]+$/.test(feeAmount.trim())) {
            return { isValid: false, errorMessage: '참가비는 숫자만 입력해주세요.' }
          }
          if (parseInt(feeAmount.replace(/,/g, '')) <= 0) {
            return { isValid: false, errorMessage: '참가비는 0보다 큰 금액이어야 합니다.' }
          }
          // Validate fee breakdown - at least one option must be selected
          const hasAnyBreakdown = Object.values(feeBreakdown).some(value =>
            typeof value === 'boolean' ? value : false
          )
          if (!hasAnyBreakdown) {
            return { isValid: false, errorMessage: '참가비 구성 항목을 최소 하나 선택해주세요.' }
          }
          // If "기타" is selected, otherReason must be provided
          if (feeBreakdown.other && !feeBreakdown.otherReason.trim()) {
            return { isValid: false, errorMessage: '기타 항목을 선택한 경우 사유를 입력해주세요.' }
          }
        }
        return { isValid: true }

      case 'schedule':
        if (!dateValue) {
          return { isValid: false, errorMessage: '모임 날짜를 선택해주세요.' }
        }
        if (!timeValue) {
          return { isValid: false, errorMessage: '모임 시간을 선택해주세요.' }
        }
        return { isValid: true }

      case 'duration':
        if (!duration || duration < 30) {
          return { isValid: false, errorMessage: '모임 소요시간을 선택해주세요.' }
        }
        return { isValid: true }

      case 'participants':
        if (minParticipants < 2) {
          return { isValid: false, errorMessage: '최소 인원은 2명 이상이어야 합니다.' }
        }
        if (maxParticipants < minParticipants) {
          return { isValid: false, errorMessage: '최대 인원은 최소 인원보다 작을 수 없습니다.' }
        }
        return { isValid: true }

      case 'customize':
        if (!clubName.trim()) {
          return { isValid: false, errorMessage: '모임 이름을 입력해주세요.' }
        }
        return { isValid: true }

      case 'detail':
        if (!titleBodyInput.title.trim() || !titleBodyInput.body.trim()) {
          return { isValid: false, errorMessage: '모임 상세 내용을 입력해주세요.' }
        }
        return { isValid: true }

      default:
        return { isValid: true }
    }
  }

  // Fetch activities from database
  React.useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            safeSetState(() => setActivities(data.data))
          }
        }
      } catch (error) {
        // Error fetching activities
      } finally {
        safeSetState(() => setLoadingActivities(false))
      }
    }
    fetchActivities()
  }, [safeSetState])

  // Fetch categories from database
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            safeSetState(() => setCategories(data.data))
          }
        }
      } catch (error) {
        // Error fetching categories
      } finally {
        safeSetState(() => setLoadingCategories(false))
      }
    }
    fetchCategories()
  }, [safeSetState])

  // Close address dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.address-dropdown-container')) {
        ; (window as any).__addrMain = []
          ; (window as any).__addrUnits = []
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Check if user has already completed age verification and populate form fields
  React.useEffect(() => {
    const checkAgeVerificationStatus = async () => {
      if (!isAuthenticated || !token) return

      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const responseData = await response.json()

          const profile = responseData.data?.profile
          const user = responseData.data?.user

          // Pre-populate form fields with existing user data

          if (user?.nickname) {
            safeSetState(() => setFullName(user.nickname))
          } else if (profile?.fullName) {
            safeSetState(() => setFullName(profile.fullName))
          }
          if (user?.phoneNumber) {
            safeSetState(() => setPhoneNumber(user.phoneNumber))
          }
          if (profile?.nationality) {
            // Map database values to form values
            const nationalityMapping = {
              'local': 'local',
              'foreign': 'foreign'
            }
            const mappedNationality = nationalityMapping[profile.nationality as keyof typeof nationalityMapping] || 'local'
            safeSetState(() => setNationality(mappedNationality as 'local' | 'foreign'))
          }
          if (profile?.gender) {
            // Map database values to form values
            const genderMapping = {
              'Male': 'male',
              'Female': 'female',
              'male': 'male',
              'female': 'female'
            }
            const mappedGender = genderMapping[profile.gender as keyof typeof genderMapping] || 'male'
            safeSetState(() => setGender(mappedGender as 'male' | 'female'))
          }
          if (profile?.dob) {
            // Convert date to YYYY-MM-DD format for input
            const dobDate = new Date(profile.dob)
            const formattedDob = dobDate.toISOString().split('T')[0]
            safeSetState(() => setDob(formattedDob))
          }

          // Load consent fields
          if (profile?.agreePersonal !== undefined) {
            safeSetState(() => setAgreePersonal(profile.agreePersonal))
          }
          if (profile?.agreeThirdParty !== undefined) {
            safeSetState(() => setAgreeThirdParty(profile.agreeThirdParty))
          }

          // Debug: Log all form state values after loading

          // Check if age verification is complete
          if (profile?.ageVerified === true &&
            profile?.dob &&
            profile?.agreePersonal === true &&
            profile?.agreeThirdParty === true) {

            // Calculate age to ensure 18+
            const dob = new Date(profile.dob)
            const now = new Date()
            let age = now.getFullYear() - dob.getFullYear()
            const m = now.getMonth() - dob.getMonth()
            if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--

            if (age >= 18) {
              safeSetState(() => {
                setIsAgeComplete(true)
                setShowCreateIntro(true) // Go directly to meeting creation
              })
            }
          }
        }
      } catch (error) {
        // Error checking age verification status
      } finally {
        // Always set checking status to false when done
        safeSetState(() => setIsCheckingAgeStatus(false))
      }
    }

    checkAgeVerificationStatus()
  }, [isAuthenticated, token, safeSetState])

  // Sync birth date dropdowns with dob field
  React.useEffect(() => {
    // When year/month/day change, update dob
    if (birthYear && birthMonth && birthDay) {
      const newDob = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
      if (newDob !== dob) {
        setDob(newDob)
      }
    }
  }, [birthYear, birthMonth, birthDay, dob])

  // Sync dob field with dropdowns when dob is loaded from server
  React.useEffect(() => {
    if (dob && !birthYear) {
      const [year, month, day] = dob.split('-')
      if (year && month && day) {
        setBirthYear(year)
        setBirthMonth(month)
        setBirthDay(day)
      }
    }
  }, [dob, birthYear])

  // Header back behavior: step back within the flow first, not full navigation
  const handleHeaderBack = React.useCallback(() => {
    if (!mountedRef.current) return

    // If age form is open and age verification is not complete, close the form
    if (isAgeFormOpen && !isAgeComplete) {
      safeSetState(() => setIsAgeFormOpen(false))
      return
    }

    // If age verification is complete and we're in the intro step, go back to previous page
    if (isAgeComplete && createStep === 'intro') {
      router.back()
      return
    }
    if (showCreateIntro) {
      if (createStep === 'completion') {
        safeSetState(() => setCreateStep('detail'))
      } else if (createStep === 'detail') {
        safeSetState(() => setCreateStep('customize'))
      } else if (createStep === 'customize') {
        safeSetState(() => setCreateStep('duration'))
      } else if (createStep === 'participants') {
        safeSetState(() => setCreateStep('duration'))
      } else if (createStep === 'duration') {
        safeSetState(() => setCreateStep('schedule'))
      } else if (createStep === 'schedule') {
        safeSetState(() => setCreateStep('details'))
      } else if (createStep === 'details') {
        safeSetState(() => setCreateStep('intro'))
      } else {
        // Go back to the main page instead of showing age verification again
        router.back()
      }
      return
    }
    try {
      router.back()
    } catch { }
  }, [isAgeFormOpen, isAgeComplete, showCreateIntro, createStep, router, safeSetState])

  // Show loading state while checking authentication
  if (!authChecked) {
    return <PageLoader />
  }

  return (
    <>
      {/* Image Processing Loading Indicator */}
      {isUploadingImages && (
        <Box
          className='fixed inset-0 z-[9999] flex items-center justify-center'
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Box className='bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4'>
            <CircularProgress size={60} thickness={4} sx={{ color: '#3B82F6' }} />
            <Typography variant='h6' className='text-gray-900 font-semibold'>
              이미지 처리 중...
            </Typography>
            <Typography variant='body2' className='text-gray-600 text-center'>
              {uploadProgress.current} / {uploadProgress.total} 이미지 처리됨
            </Typography>
            <Typography variant='caption' className='text-gray-500 text-center'>
              압축 중 - 곧 완료됩니다
            </Typography>
          </Box>
        </Box>
      )}

      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3B82F6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3B82F6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          input[type="range"]::-webkit-slider-runnable-track {
            height: 8px;
            border-radius: 4px;
          }
          
          input[type="range"]::-moz-range-track {
            height: 8px;
            border-radius: 4px;
          }
        `}
      </style>

      <Box className='min-h-screen bg-white'>
        {/* Fixed header */}
        {isAgeFormOpen && !isAgeComplete ? (
          <Box key='age-form-header' className='sticky top-0 z-10 bg-white border-b border-gray-100'>
            <Box className='flex items-center justify-between px-2 py-2'>
              <Button
                variant='text'
                className='normal-case text-blue-600'
                onClick={() => safeSetState(() => setIsAgeFormOpen(false))}
              >
                뒤로
              </Button>
              <Typography variant='subtitle1' className='font-semibold text-black'>
                연령 확인
              </Typography>
              <Button
                variant='text'
                className='normal-case text-blue-600'
                onClick={async () => {
                  // Persist age verification to backend
                  try {
                    // Validate required fields
                    if (!fullName.trim()) {
                      alert('이름을 입력해주세요.')
                      return
                    }
                    if (!birthYear || !birthMonth || !birthDay) {
                      alert('생년월일을 선택해주세요.')
                      return
                    }
                    if (!phoneNumber.trim()) {
                      alert('전화번호를 입력해주세요.')
                      return
                    }
                    if (!agreePersonal) {
                      alert('개인정보 처리에 대한 동의가 필요합니다.')
                      return
                    }
                    if (!agreeThirdParty) {
                      alert('제3자 이용 약관에 대한 동의가 필요합니다.')
                      return
                    }

                    // Construct date of birth from dropdown values
                    const dobValue = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`

                    const payload = {
                      fullName: fullName.trim(),
                      phoneNumber: phoneNumber.trim(),
                      dob: dobValue,
                      nationality,
                      gender,
                      agreePersonal,
                      agreeThirdParty
                    }
                    if (!isAuthenticated || !token) {
                      alert('로그인이 필요합니다. 먼저 로그인해주세요.')
                      return
                    }
                    // Use fetch directly to have better control over error handling
                    fetch('/api/users/verify-age', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(payload)
                    })
                      .then(async (response) => {
                        const data = await response.json()

                        if (data.success) {
                          safeSetState(() => setIsAgeComplete(true))
                        } else {
                          // This is a validation failure (201 Created) - expected behavior
                          alert(data.error || '연령 확인에 실패했습니다')
                        }
                      })
                      .catch((e) => {
                        // This is a real error (network, parsing, etc.)
                        alert('연령 확인에 실패했습니다. 나중에 다시 시도해주세요.')
                      })
                  } catch (e) {
                    alert('연령 확인에 실패했습니다')
                  }
                }}
              >
                다음
              </Button>
            </Box>
          </Box>
        ) : createStep !== 'customize' && createStep !== 'detail' ? (
          <Box key='default-header' className='sticky top-0 z-10 bg-white'>
            <Box className='flex items-center px-3 py-3'>
              <IconButton onClick={handleHeaderBack} className='p-0'>
                <i className='ri-arrow-left-s-line' style={{ fontSize: '26px' }} />
              </IconButton>
            </Box>
          </Box>
        ) : null}

        {/* Content */}
        {isCheckingAgeStatus ? null : !isAgeFormOpen && !showCreateIntro && !isAgeComplete ? (
          <>
            <Box className='px-5 pt-5'>
              <Typography variant='h4' className='font-semibold text-black'>
                {isAgeComplete ? '연령 확인 완료' : '연령 확인'}
              </Typography>
              <Typography className='text-black text-[14px] mt-1'>
                {isAgeComplete
                  ? '연령 확인이 완료되었습니다. 이제 모임을 개설할 수 있습니다.'
                  : '모임 개설을 위해 본인 확인이 필요해요 \n기재한 나이는 다른 사람에게 보이지 않아요'
                }
              </Typography>
            </Box>

            {/* Fixed bottom buttons */}
            <Box className='fixed left-0 right-0 bottom-0 bg-white px-4 pt-3 pb-6 border-t border-gray-100'>
              {isAgeComplete ? (
                <Button
                  fullWidth
                  variant='contained'
                  className='rounded-xl text-white'
                  sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.25 }}
                  onClick={() => safeSetState(() => setShowCreateIntro(true))}
                >
                  모임 만들기
                </Button>
              ) : (
                <>
                  <Button
                    fullWidth
                    variant='contained'
                    className='rounded-xl text-white'
                    sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.25 }}
                    onClick={() => safeSetState(() => setIsAgeFormOpen(true))}
                  >
                    연령 확인
                  </Button>
                  <Box className='text-center mt-3'>
                    <Button fullWidth variant='text' className='text-black rounded-xl' sx={{ textTransform: 'none' }}>
                      지금 안함
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </>
        ) : !isAgeComplete && !showCreateIntro ? (
          <Box key='age-form' className='px-3 py-3 bg-[#F4F5F7] min-h-[calc(100vh-56px)]'>
            {/* 개인 정보 */}
            <Typography variant='caption' className='text-gray-500 mb-1 block'>
              개인 정보
            </Typography>
            <Box className='bg-white rounded-xl overflow-hidden mb-3'>
              <Box className='flex items-center px-3 py-3 gap-2'>
                <Typography variant='body2' className='text-gray-800' sx={labelSx}>
                  이름
                </Typography>
                <TextField
                  size='small'
                  placeholder='필수'
                  variant='standard'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  InputProps={{ disableUnderline: true }}
                  sx={leftInputSx}
                  fullWidth
                />
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center px-3 py-3 gap-2'>
                <Typography variant='body2' className='text-gray-800' sx={labelSx}>
                  생년월일
                </Typography>
                <Box className='flex gap-2 flex-1'>
                  {/* Year Dropdown */}
                  <Select
                    size='small'
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    displayEmpty
                    variant='standard'
                    disableUnderline
                    sx={{
                      flex: 2,
                      fontSize: '14px',
                      '& .MuiSelect-select': {
                        padding: 0,
                        paddingRight: '24px !important'
                      }
                    }}
                  >
                    <MenuItem value='' disabled>
                      <span style={{ color: '#9CA3AF' }}>년</span>
                    </MenuItem>
                    {Array.from({ length: 100 }, (_, i) => {
                      const year = new Date().getFullYear() - i - 5
                      return (
                        <MenuItem key={year} value={year.toString()}>
                          {year}
                        </MenuItem>
                      )
                    })}
                  </Select>

                  {/* Month Dropdown */}
                  <Select
                    size='small'
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    displayEmpty
                    variant='standard'
                    disableUnderline
                    sx={{
                      flex: 1,
                      fontSize: '14px',
                      '& .MuiSelect-select': {
                        padding: 0,
                        paddingRight: '24px !important'
                      }
                    }}
                  >
                    <MenuItem value='' disabled>
                      <span style={{ color: '#9CA3AF' }}>월</span>
                    </MenuItem>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString()
                      return (
                        <MenuItem key={month} value={month}>
                          {month}월
                        </MenuItem>
                      )
                    })}
                  </Select>

                  {/* Day Dropdown */}
                  <Select
                    size='small'
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    displayEmpty
                    variant='standard'
                    disableUnderline
                    sx={{
                      flex: 1,
                      fontSize: '14px',
                      '& .MuiSelect-select': {
                        padding: 0,
                        paddingRight: '24px !important'
                      }
                    }}
                  >
                    <MenuItem value='' disabled>
                      <span style={{ color: '#9CA3AF' }}>일</span>
                    </MenuItem>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = (i + 1).toString()
                      return (
                        <MenuItem key={day} value={day}>
                          {day}일
                        </MenuItem>
                      )
                    })}
                  </Select>
                </Box>
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center px-3 py-3 gap-2'>
                <Typography variant='body2' className='text-gray-800' sx={labelSx}>
                  전화번호
                </Typography>
                <TextField
                  size='small'
                  type='tel'
                  placeholder='010-0000-0000'
                  variant='standard'
                  value={phoneNumber}
                  InputProps={{
                    disableUnderline: true,
                    readOnly: true
                  }}
                  sx={{
                    ...leftInputSx,
                    '& .MuiInputBase-input': {
                      color: '#666',
                      cursor: 'not-allowed'
                    }
                  }}
                  fullWidth
                />
              </Box>
            </Box>

            {/* 국적 */}
            <Typography variant='caption' className='text-gray-500 mb-1 block'>
              국적
            </Typography>
            <Box className='bg-white rounded-xl overflow-hidden mb-3'>
              <Box
                className='flex items-center justify-between px-3 py-3 cursor-pointer'
                onClick={() => safeSetState(() => setNationality('local'))}
              >
                <Typography variant='body2' className='text-gray-800'>
                  내국인
                </Typography>
                {nationality === 'local' && <i className='ri-check-line text-blue-600' />}
              </Box>
              <Divider className='mx-3' />
              <Box
                className='flex items-center justify-between px-3 py-3 cursor-pointer'
                onClick={() => safeSetState(() => setNationality('foreign'))}
              >
                <Typography variant='body2' className='text-gray-800'>
                  외국인
                </Typography>
                {nationality === 'foreign' && <i className='ri-check-line text-blue-600' />}
              </Box>
            </Box>

            {/* 성별 */}
            <Typography variant='caption' className='text-gray-500 mb-1 block'>
              성별
            </Typography>
            <Box className='bg-white rounded-xl overflow-hidden mb-3'>
              <Box
                className='flex items-center justify-between px-3 py-3 cursor-pointer'
                onClick={() => safeSetState(() => setGender('male'))}
              >
                <Typography variant='body2' className='text-gray-800'>
                  남성
                </Typography>
                {gender === 'male' && <i className='ri-check-line text-blue-600' />}
              </Box>
              <Divider className='mx-3' />
              <Box
                className='flex items-center justify-between px-3 py-3 cursor-pointer'
                onClick={() => safeSetState(() => setGender('female'))}
              >
                <Typography variant='body2' className='text-gray-800'>
                  여성
                </Typography>
                {gender === 'female' && <i className='ri-check-line text-blue-600' />}
              </Box>
            </Box>

            {/* 동의 */}
            <Typography variant='caption' className='text-gray-500 my-2 block'>
              개인 정보 및 이용 약관
            </Typography>
            <Typography variant='caption' className='text-gray-400 mb-2 block text-[11px]'>
              계속 진행할 경우 개인정보 수집, 이용 및 공유에 동의하는 것으로 간주됩니다.
            </Typography>
            <Box className='bg-white rounded-xl overflow-hidden'>
              <Box className='flex items-center justify-between px-3 py-1'>
                <Typography variant='body2' className='text-gray-800'>
                  The noldam의 개인 정보 처리에 대한 동의
                </Typography>
                <Switch
                  checked={agreePersonal}
                  onChange={e => safeSetState(() => setAgreePersonal(e.target.checked))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#34C759' // green track when checked
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#d1d5db' // Gray track when unchecked
                    }
                  }}
                />
              </Box>
              <Divider className='mx-3' />
              <Box className='px-3 py-2'>
                <Typography variant='caption' className='text-blue-600 block'>
                  수집 및 이용
                </Typography>
                <Typography variant='caption' className='text-blue-600'>
                  제3자와 공유
                </Typography>
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center justify-between px-3 py-1'>
                <Typography variant='body2' className='text-gray-800'>
                  타사 이용 약관에 동의
                </Typography>
                <Switch
                  checked={agreeThirdParty}
                  onChange={e => safeSetState(() => setAgreeThirdParty(e.target.checked))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#34C759' // green track when checked
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#d1d5db' // Gray track when unchecked
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
        ) : !showCreateIntro ? (
          <>
            <Box className='px-5 pt-5'>
              <Typography variant='h4' className='font-semibold text-black'>
                연령 확인
              </Typography>
              <Typography className='text-gray-600 text-[12px] mt-1'>본인 확인이 완료되었어요!</Typography>
            </Box>
            <Box className='fixed left-0 right-0 bottom-0 bg-white px-4 pt-3 pb-6'>
              <Button
                fullWidth
                variant='contained'
                className='rounded-xl text-white'
                sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.25 }}
                onClick={() =>
                  safeSetState(() => {
                    setIsAgeFormOpen(false)
                    setIsAgeComplete(false)
                    setShowCreateIntro(true)
                  })
                }
              >
                계속
              </Button>
            </Box>
          </>
        ) : (
          // Create club intro screen
          <>
            {createStep !== 'customize' && createStep !== 'detail' && (
              <Box className='px-5 pt-5'>
                {createStep === 'intro' && (
                  <>
                    <Typography variant='h4' className='font-bold text-black'>
                      모임 개설하기
                    </Typography>
                    <Typography className='text-gray-600 text-[14px] mt-2 leading-snug'>
                      The noldam은 이곳에 제출된 모든 모임 및 이벤트를 심사하여 사용자에게는 안전하고 신뢰할 수 있는
                      경험을, 호스트에게는 아이디어를 효과적으로 제안하고 성장시킬 수 있는 기회를 제공해요
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {createStep === 'intro' ? (
              <Box key='intro-step' className='fixed left-0 right-0 bottom-0 bg-white px-4 pt-3 pb-6'>
                <Box className=' mt-6'>
                  <Typography variant='caption' className='text-gray-400 mb-1 block'>
                    개인 정보 및 모임 개설 이용 약관
                  </Typography>
                  <Typography variant='caption' className='text-gray-400 mb-3 block text-[11px]'>
                    계속 진행할 경우 개인정보 수집, 이용 및 공유에 동의하는 것으로 간주됩니다.
                  </Typography>
                  <Box className='bg-white rounded-xl overflow-hidden'>
                    <Box className='flex items-center justify-between px-3 py-1'>
                      <Typography variant='body2' className='text-gray-800'>
                        The noldam의 개인 정보 처리에 대한 동의
                      </Typography>
                      <Switch
                        checked={meetingConsentPersonal}
                        onChange={(e) => setMeetingConsentPersonal(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#34C759' },
                          '& .MuiSwitch-track': { backgroundColor: '#d1d5db' }
                        }}
                      />
                    </Box>
                    <Divider className='mx-3' />
                    <Box className='px-3 py-2'>
                      <Typography variant='caption' className='text-blue-600 block'>
                        수집 및 이용
                      </Typography>
                      <Typography variant='caption' className='text-blue-600'>
                        제3자와 공유
                      </Typography>
                    </Box>
                    <Divider className='mx-3' />
                    <Box className='flex items-center justify-between px-3 py-1'>
                      <Typography variant='body2' className='text-gray-800'>
                        모임개설 가이드라인에 대한 동의
                      </Typography>
                      <Switch
                        checked={meetingConsentGuidelines}
                        onChange={(e) => setMeetingConsentGuidelines(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#34C759' },
                          '& .MuiSwitch-track': { backgroundColor: '#d1d5db' }
                        }}
                      />
                    </Box>
                    <Divider className='mx-3' />
                    <Box className='px-3 py-2' onClick={() => window.open('https://support.thenoldam.com/2a4a84c0-00a2-80ee-b3e5-fdd1de7de4ed')}>
                      <Typography variant='caption' className='text-blue-600'>
                        모임 개설 가이드라인보기
                      </Typography>
                    </Box>
                    <Divider className='mx-3' />
                  </Box>
                </Box>

                {renderProgress(0, 4)}

                <Button
                  fullWidth
                  variant='contained'
                  className='rounded-xl text-white'
                  sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.25 }}
                  onClick={() => {
                    const validation = validateStep('intro')
                    if (!validation.isValid) {
                      alert(validation.errorMessage)
                      return
                    }
                    safeSetState(() => {
                      setCreateStep('details')
                      setHighestStepReached(prev => Math.max(prev, 1)) // Step details = index 1
                    })
                  }}
                >
                  다음
                </Button>
              </Box>
            ) : createStep === 'details' ? (
              <>
                <Box className='px-4 pb-28'>
                  {/* <Typography variant='h4' className='font-bold text-gray-900 mt-2'>
                    멤버들과 함께
                    <br />
                    어떤 활동을 하고 싶나요?
                  </Typography>
                  <Typography variant='body1' className='text-gray-500 mt-1'>
                    내 스타일에 맞는 모임을 선택해보세요.
                  </Typography>

                  <Typography variant='subtitle2' className='text-gray-400 mt-4 mb-2'>
                    소셜링 방식
                  </Typography> */}
                  <Box className=''>
                    {/* {loadingActivities ? (
                      <Box className='flex items-center justify-center py-8'>
                        <Typography className='text-gray-500'>활동 목록을 불러오는 중...</Typography>
                      </Box>
                    ) : activities.length > 0 ? (
                      activities.map((activity) => {
                        const isSelected = selectedActivityId === activity.id
                        return (
                          <React.Fragment key={activity.id}>
                            <Box
                              className={`flex items-center px-3 py-2 mb-2 rounded-xl border overflow-hidden cursor-pointer transition-colors ${isSelected ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              onClick={() => safeSetState(() => {
                                setSelectedMeetingType(activity.name)
                                setSelectedActivityId(activity.id)
                              })}
                            >
                              <Image
                                src={activity.image || '/images/custom/coffee-in-cup.png'}
                                width={25}
                                height={25}
                                alt={activity.name}
                                className='rounded-md bg-gray-100 mr-3'
                              />
                              <Box className='flex-1'>
                                <Typography variant='subtitle2' className='text-gray-800'>
                                  {activity.name}
                                </Typography>
                                <Typography className='text-gray-500 text-[10px]'>{activity.description}</Typography>
                              </Box>
                            </Box>
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <Box className='flex items-center justify-center py-8'>
                        <Typography className='text-gray-500'>활동 목록이 없습니다.</Typography>
                      </Box>
                    )} */}
                  </Box>

                  <Typography variant='h4' className='text-gray-900 mt-6 font-bold'>
                    카테고리 정하기
                  </Typography>
                  <Typography variant='body1' className='text-gray-500 mb-2'>
                    모임에 맞는 항목을 선택해주세요.
                  </Typography>
                  <Box className='grid grid-cols-2 gap-3'>
                    {loadingCategories ? (
                      <Box className='col-span-2 flex items-center justify-center py-8'>
                        <Typography className='text-gray-500'>카테고리 목록을 불러오는 중...</Typography>
                      </Box>
                    ) : categories.length > 0 ? (
                      categories.map(category => {
                        const selected = selectedCategory === category.id.toString()
                        return (
                          <Button
                            key={category.id}
                            variant='outlined'
                            onClick={() => safeSetState(() => setSelectedCategory(category.id.toString()))}
                            className={`h-24 p-0 rounded-xl bg-gray-200 ${selected ? 'bg-gray-300 text-white' : ''}`}
                            sx={{ borderColor: '#E5E7EB', color: selected ? '#FFF' : '#111827' }}
                          >
                            <Box className='text-left w-full relative h-full'>
                              <Box
                                className='absolute inset-0 rounded-xl bg-cover bg-center opacity-30'
                                style={{
                                  backgroundImage: `url(${category.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop&crop=center'})`
                                }}
                              />
                              <Box className='relative z-9 p-2 h-full flex flex-col justify-center'>
                                <Typography variant='body2' className='text-gray-800 font-medium'>
                                  {category.name}
                                </Typography>
                                {selected && (
                                  <Typography variant='caption' className='text-gray-800'>
                                    (selected)
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Button>
                        )
                      })
                    ) : (
                      <Box className='col-span-2 flex items-center justify-center py-8'>
                        <Typography className='text-gray-500'>카테고리 목록이 없습니다.</Typography>
                      </Box>
                    )}
                  </Box>

                  <Typography variant='h4' className='text-gray-900 mt-8 font-bold'>
                    참여 인원 정하기
                  </Typography>
                  <Typography variant='body1' className='text-gray-500 mb-3'>
                    최소 2명부터, 원하는 인원수를 정할 수 있어요.
                  </Typography>
                  <Box className='space-y-3'>
                    {[
                      { label: '최소 인원', value: minParticipants, set: setMinParticipants, isMin: true },
                      { label: '최대 인원', value: maxParticipants, set: setMaxParticipants, isMin: false }
                    ].map(row => {
                      const isMinRow = row.isMin // Use boolean flag instead of Korean text comparison

                      // --- Determine button availability ---
                      const canDecrease = isMinRow
                        ? row.value > 2
                        : row.value > minParticipants // maxParticipants cannot go below minParticipants
                      const canIncrease = isMinRow
                        ? row.value < maxParticipants // minParticipants cannot exceed maxParticipants
                        : row.value < 20 // maxParticipants cannot exceed 20

                      return (
                        <Box key={row.label} className='flex items-center justify-between'>
                          {/* Label */}
                          <Box>
                            <Typography variant='subtitle2' className='text-gray-800'>
                              {row.label}
                            </Typography>
                            <Typography className='text-gray-500 text-[10px]'>
                              {isMinRow ? '최소 2명 이상' : '최대 20명 이하'}
                            </Typography>
                          </Box>

                          {/* Controls */}
                          <Box className='flex items-center gap-2'>
                            {/* Decrease Button */}
                            <Button
                              variant='text'
                              className={`min-w-0 w-8 h-8 rounded-full ${!canDecrease ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={!canDecrease}
                              onClick={() => {
                                if (canDecrease) {
                                  const newValue = isMinRow ? Math.max(2, row.value - 1) : Math.max(minParticipants, row.value - 1)
                                  safeSetState(() => row.set(newValue))
                                }
                              }}
                            >
                              -
                            </Button>

                            {/* Value Display */}
                            <Box className='w-12 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center'>
                              {row.value}
                            </Box>

                            {/* Increase Button */}
                            <Button
                              variant='text'
                              className={`min-w-0 w-8 h-8 rounded-full ${!canIncrease ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={!canIncrease}
                              onClick={() => {
                                if (canIncrease) {
                                  const newValue = isMinRow ? Math.min(maxParticipants, row.value + 1) : Math.min(20, row.value + 1)
                                  safeSetState(() => row.set(newValue))
                                }
                              }}
                            >
                              +
                            </Button>
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>


                  {/* Instruction text with count */}
                  <Box className='flex items-center gap-2 mt-5'>
                    <Box className='w-8 h-4 rounded bg-gray-200 py-2 flex items-center justify-center'>
                      <Typography variant='caption' className='text-gray-600 text-xs'>
                        {minParticipants}
                      </Typography>
                    </Box>
                    <Typography className='text-gray-500 text-[10px]'>
                      버튼을 좌우로 스와이프하여 참여 인원을 손쉽게 늘릴 수 있어요.
                    </Typography>
                  </Box>

                  <Typography variant='h4' className='text-gray-900 mt-8 font-bold'>
                    참가비 정하기
                  </Typography>
                  <Typography variant='body1' className='text-gray-500 mb-3'>
                    노쇼방지비, 호스트 수고비등 참가비를
                    <br />
                    다양하게 활용할 수 있어요.
                  </Typography>

                  <Box className='flex items-center gap-2 mb-4 flex-wrap'>
                    {([
                      { value: 'yes', label: '있음' },
                      { value: 'no', label: '없음' }
                    ] as const).map(opt => (
                      <Button
                        key={opt.value}
                        variant={feeOption === opt.value ? 'contained' : 'outlined'}
                        onClick={() => safeSetState(() => setFeeOption(opt.value))}
                        className={`rounded-full flex-1 ${feeOption === opt.value ? 'bg-gray-100 text-gray-900' : ''}`}
                        sx={{
                          borderColor: '#E5E7EB',
                          color: '#111827',
                          backgroundColor: feeOption === opt.value ? '#EDEDED' : 'transparent'
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </Box>

                  {feeOption === 'yes' && (
                    <>
                      <Typography variant='subtitle2' className='text-gray-800 my-2'>
                        참가비 금액
                      </Typography>
                      <Box className='rounded-xl border border-gray-200 px-3 py-2'>
                        <TextField
                          variant='standard'
                          fullWidth
                          value={feeAmount}
                          onChange={e => safeSetState(() => setFeeAmount(e.target.value))}
                          InputProps={{
                            disableUnderline: true,
                            endAdornment: feeAmount && (
                              <IconButton
                                size='small'
                                onClick={() => safeSetState(() => setFeeAmount(''))}
                                sx={{ p: 0.5 }}
                              >
                                <i className='ri-close-line text-gray-400' style={{ fontSize: '16px' }} />
                              </IconButton>
                            )
                          }}
                          placeholder='10,000원'
                          sx={{ '& .MuiInputBase-input': { padding: 0, fontSize: '14px' } }}
                        />
                      </Box>

                      <Typography variant='subtitle2' className='text-gray-500 my-4'>
                        참가비 구성
                      </Typography>
                      <Typography variant='body2' className='text-gray-600 mb-3'>
                        참가비에 포함된 항목을 선택해주세요 (최소 1개 이상 선택)
                      </Typography>

                      {/* Operating Expenses */}
                      <Box className='mb-4'>
                        <Typography variant='body1' className='text-black mb-2'>
                          운영비 <span className='text-gray-500 ml-2'>콘텐츠 기획 및 진행에 필요한 운영비</span>
                        </Typography>
                        <Box className='flex items-center gap-4 mt-2'>
                          {[
                            { key: 'contentProduction', label: '콘텐츠 제작비' },
                            { key: 'hostSpot', label: '호스트 수고비' }
                          ].map(item => (
                            <Box
                              key={item.key}
                              className='flex items-center gap-2 cursor-pointer'
                              onClick={() => safeSetState(() => setFeeBreakdown(prev => ({
                                ...prev,
                                [item.key]: !prev[item.key as keyof typeof prev]
                              })))}
                            >
                              <Box
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${feeBreakdown[item.key as keyof typeof feeBreakdown] ? 'bg-gray-600' : 'bg-gray-200'
                                  }`}
                              >
                                <i
                                  className={`ri-check-line text-sm ${feeBreakdown[item.key as keyof typeof feeBreakdown] ? 'text-white' : 'text-gray-600'
                                    }`}
                                />
                              </Box>
                              <Typography variant='body2' className='text-gray-800'>
                                {item.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Meeting Costs */}
                      <Box className='mb-4'>
                        <Typography variant='body1' className='text-black mb-2'>
                          모임비 <span className='text-gray-500 ml-2'>대관료, 재료 구매비 등 진행에 필요한 사전결제 비용</span>
                        </Typography>
                        <Box className='flex items-center gap-4 mt-2 flex-wrap'>
                          {[
                            { key: 'noShowFee', label: '노쇼발생비' },
                            { key: 'royalties', label: '대관료' },
                            { key: 'materialCost', label: '재료비' },
                            { key: 'refreshmentFee', label: '다과비' }
                          ].map(item => (
                            <Box
                              key={item.key}
                              className='flex items-center gap-2 cursor-pointer'
                              onClick={() => safeSetState(() => setFeeBreakdown(prev => ({
                                ...prev,
                                [item.key]: !prev[item.key as keyof typeof prev]
                              })))}
                            >
                              <Box
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${feeBreakdown[item.key as keyof typeof feeBreakdown] ? 'bg-gray-600' : 'bg-gray-200'
                                  }`}
                              >
                                <i
                                  className={`ri-check-line text-sm ${feeBreakdown[item.key as keyof typeof feeBreakdown] ? 'text-white' : 'text-gray-600'
                                    }`}
                                />
                              </Box>
                              <Typography variant='body2' className='text-gray-800'>
                                {item.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Other */}
                      <Box className='mb-4'>
                        <Box className='flex items-center gap-2 mb-2'>
                          <Box
                            className='flex items-center gap-2 cursor-pointer'
                            onClick={() => safeSetState(() => setFeeBreakdown(prev => ({
                              ...prev,
                              other: !prev.other
                            })))}
                          >
                            <Box
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${feeBreakdown.other ? 'bg-gray-600' : 'bg-gray-200'
                                }`}
                            >
                              <i
                                className={`ri-check-line text-sm ${feeBreakdown.other ? 'text-white' : 'text-gray-600'
                                  }`}
                              />
                            </Box>
                            <Typography variant='body2' className='text-gray-800'>
                              기타
                            </Typography>
                          </Box>
                          <Typography variant='body2' className='text-gray-500'>
                            직접 입력
                          </Typography>
                        </Box>
                        {feeBreakdown.other && (
                          <Box className='rounded-xl border border-gray-200 px-3 py-2 mt-2'>
                            <TextField
                              variant='standard'
                              fullWidth
                              value={feeBreakdown.otherReason}
                              onChange={e => safeSetState(() => setFeeBreakdown(prev => ({
                                ...prev,
                                otherReason: e.target.value
                              })))}
                              InputProps={{
                                disableUnderline: true,
                                endAdornment: feeBreakdown.otherReason && (
                                  <IconButton
                                    size='small'
                                    onClick={() => safeSetState(() => setFeeBreakdown(prev => ({
                                      ...prev,
                                      otherReason: ''
                                    })))}
                                    sx={{ p: 0.5 }}
                                  >
                                    <i className='ri-close-line text-gray-400' style={{ fontSize: '16px' }} />
                                  </IconButton>
                                )
                              }}
                              placeholder='기타 사유를 입력해주세요'
                              sx={{ '& .MuiInputBase-input': { padding: 0, fontSize: '14px' } }}
                            />
                          </Box>
                        )}
                      </Box>

                      <Box className='bg-gray-100 rounded-xl p-3 mt-4'>
                        <Typography className='text-[12px] text-gray-600 block mb-1'>
                          • 모임에 필요한 모든 금액을 참가비로 설정해주세요. 가이드 위반시 모임 삭제 및 이용 제재를 받을 수 있어요.
                        </Typography>
                        <Typography className='text-[12px] text-gray-600 block'>
                          • 협의된 수수료를 제한 금액을 정산해드려요.
                        </Typography>
                      </Box>
                    </>
                  )}

                  <Typography variant='h4' className='text-gray-900 mt-8 font-bold'>
                    장소 정하기
                  </Typography>
                  <Typography variant='body2' className='text-gray-500 mb-2'>
                    모임의 시작과 끝이 이루어지는 장소를 알려주세요.
                  </Typography>

                  {/* <Box className='mt-4'>
                  <Typography variant='body2' className='text-gray-800 mb-2'>장소를 입력해주세요</Typography>
                  <Box className='rounded-xl border border-gray-200 px-3 py-2'>
                    <TextField 
                      variant='standard' 
                      fullWidth 
                      value={place} 
                      onChange={(e) => safeSetState(() => setPlace(e.target.value))} 
                      InputProps={{ 
                        disableUnderline: true,
                        endAdornment: place && (
                          <IconButton size='small' onClick={() => safeSetState(() => setPlace(''))} sx={{ p: 0.5 }}>
                            <i className='ri-close-line text-gray-400' style={{ fontSize: '16px' }} />
                          </IconButton>
                        )
                      }} 
                      placeholder="'도로명 주소' 또는 '지번'을 입력해주세요." 
                      sx={{ '& .MuiInputBase-input': { padding: 0, fontSize: '14px' } }} 
                    />
                  </Box>
                </Box> */}

                  {/* Address Input Section */}
                  <Box className='mt-6'>
                    <Typography variant='body2' className='text-gray-800 mb-2'>
                      장소를 입력해주세요
                    </Typography>

                    {/* Road name / Lot number field with autocomplete from local JSON */}
                    <Box className='rounded-xl border border-gray-200 px-3 py-2 mb-3'>
                      <Box className='relative address-dropdown-container'>
                        <TextField
                          variant='standard'
                          fullWidth
                          value={roadNameLotNumber}
                          onChange={async e => {
                            const value = e.target.value
                            safeSetState(() => setRoadNameLotNumber(value))
                            try {
                              const res = await fetch('/data/addresses.json')
                              const all = await res.json()
                              const q = value.trim().toLowerCase()
                              const filtered = q
                                ? all.filter((a: any) =>
                                  [a.city, a.district, a.roadName, a.buildingName, a.postalCode, a.lotNumber]
                                    .filter(Boolean)
                                    .some((f: string) => f.toLowerCase().includes(q))
                                )
                                : []
                              const items = filtered.slice(0, 8).map((a: any) => ({
                                key: a.id,
                                label: `${a.city} ${a.district} ${a.roadName} ${a.lotNumber || ''} ${a.buildingName || ''}`.trim(),
                                value: `${a.city} ${a.district} ${a.roadName} ${a.lotNumber || ''} ${a.buildingName || ''}`.trim(),
                                units: a.units || []
                              }))
                                ; (window as any).__addrMain = items
                            } catch { }
                          }}
                          InputProps={{
                            disableUnderline: true,
                            endAdornment: roadNameLotNumber && (
                              <IconButton
                                size='small'
                                onClick={() => safeSetState(() => setRoadNameLotNumber(''))}
                                sx={{ p: 0.5 }}
                              >
                                <i className='ri-close-line text-gray-400' style={{ fontSize: '16px' }} />
                              </IconButton>
                            )
                          }}
                          placeholder='도로명/지번을 입력해주세요'
                          sx={{ '& .MuiInputBase-input': { padding: 0, fontSize: '14px' } }}
                        />
                        {/* Dropdown suggestions */}
                        {typeof window !== 'undefined' && (window as any).__addrMain && (window as any).__addrMain.length > 0 && roadNameLotNumber && (
                          <Box className='absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-56 overflow-auto'>
                            {((window as any).__addrMain as any[]).map((opt: any) => (
                              <Box
                                key={opt.key}
                                className='px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800'
                                onClick={() => {
                                  safeSetState(() => setRoadNameLotNumber(opt.value))
                                    // Pre-fill units into detailed address suggestion state
                                    ; (window as any).__addrUnits = opt.units
                                    ; (window as any).__addrMain = []
                                }}
                              >
                                {opt.label}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Detailed address field */}
                    <Box className='rounded-xl border border-gray-200 px-3 py-2'>
                      <Box className='relative address-dropdown-container'>
                        <TextField
                          variant='standard'
                          fullWidth
                          value={detailedAddress}
                          onChange={e => safeSetState(() => setDetailedAddress(e.target.value))}
                          InputProps={{
                            disableUnderline: true,
                            endAdornment: detailedAddress && (
                              <IconButton
                                size='small'
                                onClick={() => safeSetState(() => setDetailedAddress(''))}
                                sx={{ p: 0.5 }}
                              >
                                <i className='ri-close-line text-gray-400' style={{ fontSize: '16px' }} />
                              </IconButton>
                            )
                          }}
                          placeholder='상세 주소를 입력해주세요 (호수/층수 등)'
                          sx={{ '& .MuiInputBase-input': { padding: 0, fontSize: '14px' } }}
                        />
                        {/* Unit suggestions from chosen building */}
                        {typeof window !== 'undefined' && (window as any).__addrUnits && (window as any).__addrUnits.length > 0 && !detailedAddress && (
                          <Box className='absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-auto'>
                            {((window as any).__addrUnits as any[]).slice(0, 10).map((u: string, idx: number) => (
                              <Box
                                key={idx}
                                className='px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800'
                                onClick={() => {
                                  safeSetState(() => setDetailedAddress(u))
                                    // Clear the units dropdown after selection
                                    ; (window as any).__addrUnits = []
                                }}
                              >
                                {u}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box className='bg-gray-100 rounded-xl p-3 mt-4'>
                    <Typography className='text-[12px] text-gray-600 block mb-1'>
                      • 모임이 진행되는 상세 주소를 입력해주세요. 가이드 위반시 모임 삭제 및 이용 제재를 받을 수 있어요.
                    </Typography>
                    <Typography className='text-[12px] text-gray-600 block'>
                      • 모임이 진행되는 공간은 해당 모임만이 진행될 수 있도록 해주세요.
                    </Typography>
                  </Box>
                </Box>

                <Box className='fixed left-1/2 transform -translate-x-1/2' sx={{ bottom: 55, zIndex: 20 }}>
                  {renderProgress(1, 4)}
                </Box>
                <Box className='fixed left-1/2 transform -translate-x-1/2 w-[92%]' sx={{ bottom: 22, zIndex: 30 }}>
                  <Button
                    fullWidth
                    variant='contained'
                    className='rounded-xl text-white'
                    sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.3 }}
                    onClick={() => {
                      const validation = validateStep('details')
                      if (!validation.isValid) {
                        alert(validation.errorMessage)
                        return
                      }
                      safeSetState(() => {
                        setCreateStep('schedule')
                        setHighestStepReached(prev => Math.max(prev, 2)) // Step schedule = index 2
                      })
                    }}
                  >
                    다음
                  </Button>
                </Box>
              </>
            ) : createStep === 'schedule' ? (
              // Schedule step - new step before duration
              <>
                <Box className='px-4 pb-28'>
                  <Typography variant='h4' className='font-semibold text-[35px] text-gray-400 mt-2'>
                    첫 모임은
                    <br />
                    <span
                      className='text-black cursor-pointer font-bold'
                      onClick={(e) => triggerDatePicker(e)}
                    >
                      {meetingDate}
                    </span>
                    에 시작하고, 시간은{' '}
                    <span
                      className='text-black cursor-pointer font-bold'
                      onClick={(e) => triggerTimePicker(e)}
                    >
                      {meetingTime}
                    </span>
                    에 시작할 예정이에요. 모임의 간격은{' '}
                    <span
                      className='text-black cursor-pointer font-bold'
                      onClick={() => safeSetState(() => setShowFrequencyPicker(true))}
                    >
                      {getFrequencyLabel(meetingFrequency)}
                    </span>
                    로 진행할 예정이에요.
                  </Typography>
                </Box>

                {/* Frequency Picker Modal */}
                {showFrequencyPicker && (
                  <Box className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
                    <Box className='bg-white rounded-2xl p-6 w-full max-w-sm'>
                      <Typography variant='h6' className='text-center mb-4'>
                        모임 간격 선택
                      </Typography>
                      <Box className='space-y-2'>
                        {([
                          { value: 'none', label: '설정하지 않음' },
                          { value: 'weekly', label: '매주' },
                          { value: 'biweekly', label: '2주 간격으로' },
                          { value: 'monthly', label: '한달 간격으로' }
                        ] as const).map(option => (
                          <Button
                            key={option.value}
                            fullWidth
                            variant={meetingFrequency === option.value ? 'contained' : 'outlined'}
                            onClick={() => {
                              safeSetState(() => setMeetingFrequency(option.value))
                              safeSetState(() => setShowFrequencyPicker(false))
                            }}
                            sx={{
                              backgroundColor: meetingFrequency === option.value ? '#3D3D3D' : 'transparent',
                              borderColor: '#E5E7EB',
                              color: meetingFrequency === option.value ? '#FFF' : '#111827',
                              textTransform: 'none',
                              mb: 1
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}

                <Box className='fixed left-1/2 transform -translate-x-1/2' sx={{ bottom: 55, zIndex: 20 }}>
                  {renderProgress(2, 4)}
                </Box>
                <Box className='fixed left-1/2 transform -translate-x-1/2 w-[92%]' sx={{ bottom: 22, zIndex: 30 }}>
                  <Button
                    fullWidth
                    variant='contained'
                    className='rounded-xl text-white'
                    sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.3 }}
                    onClick={() => {
                      const validation = validateStep('schedule')
                      if (!validation.isValid) {
                        alert(validation.errorMessage)
                        return
                      }
                      safeSetState(() => {
                        setCreateStep('duration')
                        // Duration shares the same progress index (2) as schedule, so no new step to mark
                      })
                    }}
                  >
                    다음
                  </Button>
                </Box>
              </>
            ) : createStep === 'duration' ? (
              // Duration step
              <>
                <Box className='px-4 pb-28'>
                  <Typography variant='h4' className='font-bold text-gray-900 mt-2'>
                    모임이 진행되는 시간을 알려주세요.
                  </Typography>

                  <Box className='flex flex-col items-center mt-12'>
                    <Typography variant='h2' className='text-4xl font-bold text-gray-900 mb-8'>
                      {duration === 60 ? '1시간' : duration === 120 ? '2시간' : `${duration}분`}
                    </Typography>
                  </Box>
                </Box>
                <Box className='px-4'>
                  <Box className='w-full max-w-lg mx-auto'>
                    <Box className='relative'>
                      {/* Tick marks and labels */}
                      <Box className='relative mb-8'>
                        {/* Scrollable viewport container */}
                        <Box
                          className='relative h-12 overflow-x-auto overflow-y-hidden'
                          sx={{
                            scrollbarWidth: 'none', // Firefox
                            msOverflowStyle: 'none', // IE and Edge
                            '&::-webkit-scrollbar': {
                              display: 'none' // Chrome, Safari, Opera
                            },
                            scrollBehavior: 'smooth'
                          }}
                        >
                          {/* All tick marks container - wider than viewport */}
                          <Box
                            className='relative h-16'
                            style={{
                              width: '220%',
                              transform: `translateX(${Math.max(-60, Math.min(0, -((duration - 50) / 70) * 120 + 30))}%)`,
                              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            {/* Generate all tick marks from 50 to 120 */}
                            {Array.from({ length: 71 }, (_, i) => {
                              const value = 50 + i;
                              const isMajorTick = value % 5 === 0;
                              const position = (i / 70) * 100;

                              return (
                                <Box key={value} className='absolute' style={{ left: `${position}%` }}>
                                  {/* Tick mark */}
                                  <Box
                                    className={`w-px ${isMajorTick ? 'h-6 bg-gray-400' : 'h-3 bg-gray-200'}`}
                                  />
                                  {/* Label for major ticks */}
                                  {isMajorTick && (
                                    <Typography
                                      variant='caption'
                                      className='text-xs text-gray-700 font-medium absolute top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap'
                                    >
                                      {value}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}

                            {/* Selected value indicator */}
                            <Box
                              className='absolute w-1 h-8 bg-black top-0 transform -translate-x-1/2'
                              style={{
                                left: `${((duration - 50) / 70) * 100}%`,
                                marginTop: '-1px',
                                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Hidden slider for interaction */}
                      <input
                        type='range'
                        min='50'
                        max='120'
                        step='1'
                        value={duration}
                        onChange={e => safeSetState(() => setDuration(Number(e.target.value)))}
                        className='w-full h-8 opacity-0 cursor-pointer absolute top-0'
                        style={{
                          zIndex: 10,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          background: 'transparent'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Typography variant='body2' className='text-gray-500 text-center mt-8'>
                  모임 진행 시간은 최소 50분, 최대 120분 이내를 권장해요
                </Typography>
                <Box className='fixed left-1/2 transform -translate-x-1/2' sx={{ bottom: 55, zIndex: 20 }}>
                  {renderProgress(2, 4)}
                </Box>
                <Box className='fixed left-1/2 transform -translate-x-1/2 w-[92%]' sx={{ bottom: 22, zIndex: 30 }}>
                  <Button
                    fullWidth
                    variant='contained'
                    className='rounded-xl text-white'
                    sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.3 }}
                    onClick={() => {
                      const validation = validateStep('duration')
                      if (!validation.isValid) {
                        alert(validation.errorMessage)
                        return
                      }
                      safeSetState(() => setCreateStep('customize'))
                    }}
                  >
                    다음
                  </Button>
                </Box>
              </>
            ) : createStep === 'participants' ? // Participants step - COMMENTED OUT FOR NOW
              // <>
              //   <Box className='px-4 pb-28'>
              //     <Typography variant='h4' className='font-bold text-gray-900 mt-2 leading-tight'>
              //       모임의 최대 인원을<br />알려주세요.
              //     </Typography>
              //
              //     <Box className='flex flex-col items-center mt-16'>
              //       {/* Circular Slider Container */}
              //       <Box
              //         className='relative w-72 h-72 mb-8 cursor-pointer select-none'
              //           onMouseDown={(e) => {
              //             if (!mountedRef.current) return
              //             e.preventDefault()
              //           const rect = e.currentTarget.getBoundingClientRect()
              //           const centerX = rect.left + rect.width / 2
              //           const centerY = rect.top + rect.height / 2
              //
              //             const handleMouseMove = (moveEvent: MouseEvent) => {
              //               if (!mountedRef.current) return
              //             const deltaX = moveEvent.clientX - centerX
              //             const deltaY = moveEvent.clientY - centerY
              //               const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
              //               const normalizedAngle = (angle + 90 + 360) % 360
              //               const newValue = Math.round((normalizedAngle / 360) * 15)
              //               const clampedValue = Math.max(1, Math.min(15, newValue))
              //               safeSetState(() => setParticipants(clampedValue))
              //             }
              //
              //             const handleMouseUp = () => {
              //               document.removeEventListener('mousemove', handleMouseMove)
              //               document.removeEventListener('mouseup', handleMouseUp)
              //             }
              //
              //             document.addEventListener('mousemove', handleMouseMove)
              //             document.addEventListener('mouseup', handleMouseUp)
              //           }}
              //           onTouchStart={(e) => {
              //             if (!mountedRef.current) return
              //             e.preventDefault()
              //           const rect = e.currentTarget.getBoundingClientRect()
              //           const centerX = rect.left + rect.width / 2
              //           const centerY = rect.top + rect.height / 2
              //
              //             const handleTouchMove = (moveEvent: TouchEvent) => {
              //               if (!mountedRef.current) return
              //               moveEvent.preventDefault()
              //               const touch = moveEvent.touches[0]
              //             const deltaX = touch.clientX - centerX
              //             const deltaY = touch.clientY - centerY
              //               const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
              //               const normalizedAngle = (angle + 90 + 360) % 360
              //               const newValue = Math.round((normalizedAngle / 360) * 15)
              //               const clampedValue = Math.max(1, Math.min(15, newValue))
              //               safeSetState(() => setParticipants(clampedValue))
              //             }
              //
              //             const handleTouchEnd = () => {
              //               document.removeEventListener('touchmove', handleTouchMove)
              //               document.removeEventListener('touchend', handleTouchEnd)
              //             }
              //
              //             document.addEventListener('touchmove', handleTouchMove)
              //             document.addEventListener('touchend', handleTouchEnd)
              //           }}
              //       >
              //         {/* SVG Circle */}
              //         <svg className='w-full h-full transform -rotate-90' viewBox='0 0 100 100'>
              //           {/* Background circle - thicker and lighter gray */}
              //           <circle
              //             cx='50'
              //             cy='50'
              //             r='42'
              //             fill='none'
              //             stroke='#E5E7EB'
              //             strokeWidth='10'
              //           />
              //           {/* Progress circle - red to orange gradient with thick starting point */}
              //           <circle
              //             cx='50'
              //             cy='50'
              //             r='42'
              //             fill='none'
              //             stroke='url(#gradient)'
              //             strokeWidth='14'
              //             strokeLinecap='round'
              //             strokeDasharray={`${(participants / 15) * 264} 264`}
              //             style={{ transition: 'stroke-dasharray 0.3s ease' }}
              //           />
              //
              //           {/* Gradient definition - red to orange */}
              //           <defs>
              //             <linearGradient id='gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
              //               <stop offset='0%' stopColor='#EF4444' />
              //               <stop offset='100%' stopColor='#F97316' />
              //             </linearGradient>
              //           </defs>
              //
              //
              //
              //         </svg>
              //
              //         {/* Center Text - larger and bolder */}
              //         <Box className='absolute inset-0 flex items-center justify-center'>
              //           <Typography variant='h1' className='text-7xl font-bold text-gray-900'>
              //             {participants}명
              //           </Typography>
              //         </Box>
              //
              //       </Box>
              //     </Box>
              //
              //     <Typography variant='body2' className='text-gray-500 text-center mt-8'>
              //       최대 15명까지 가능해요
              //     </Typography>
              //   </Box>

              //   <Box className='fixed left-1/2 transform -translate-x-1/2' sx={{ bottom: 55, zIndex: 20 }}>
              //     {renderProgress(2, 4)}
              //   </Box>
              //   <Box className='fixed left-1/2 transform -translate-x-1/2 w-[92%]' sx={{ bottom: 22, zIndex: 30 }}>
              //     <Button fullWidth variant='contained' className='rounded-xl text-white' sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', py: 1.3 }} onClick={() => setCreateStep('customize')}>모임 소개 꾸미기</Button>
              //   </Box>
              // </>
              // Skip participants step and go directly to customize
              null : createStep === 'customize' ? (
                // Customize step - exact design from reference
                <>
                  {/* Fixed Header */}
                  <Box className='sticky top-0 z-10 bg-white'>
                    <Box className='flex bg-gray-400 items-center justify-between px-3 py-3'>
                      <IconButton onClick={handleHeaderBack} className='p-0'>
                        <i className='ri-arrow-left-s-line' style={{ fontSize: '26px' }} />
                      </IconButton>
                      <Typography variant='h6' className='font-semibold text-black'>
                        모임 꾸미기
                      </Typography>
                      <Box className='w-6' /> {/* Spacer for centering */}
                    </Box>
                  </Box>

                  {/* Main content with gray background */}
                  <Box className='min-h-[calc(100vh-52px)] flex overflow-hidden flex-col justify-center bg-gray-400 px-4 pb-16'>
                    {/* Club Name Input */}
                    <Box>
                      <Typography variant='body1' className='text-white mb-3 font-medium'>
                        모임 이름
                      </Typography>
                      <Box className='relative'>
                        <TextField
                          fullWidth
                          variant='outlined'
                          placeholder='Ex. New York, Bucket List'
                          value={clubName}
                          onChange={e => safeSetState(() => setClubName(e.target.value))}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                              backgroundColor: '#C2C2C2',
                              border: 'none',
                              '& fieldset': {
                                border: 'none'
                              },
                              '&:hover fieldset': {
                                border: 'none'
                              },
                              '&.Mui-focused fieldset': {
                                border: 'none'
                              }
                            },
                            '& .MuiInputBase-input': {
                              padding: '16px',
                              fontSize: '16px',
                              color: '#fff',
                              '&::placeholder': {
                                color: '#fff',
                                opacity: 1
                              }
                            }
                          }}
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                size='small'
                                onClick={() => safeSetState(() => setClubName(''))}
                                sx={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: '#E5E7EB',
                                  borderRadius: '50%',
                                  '&:hover': {
                                    backgroundColor: '#D1D5DB'
                                  }
                                }}
                              >
                                <i className='ri-close-line' style={{ fontSize: '14px', color: '#6B7280' }} />
                              </IconButton>
                            )
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Bottom Sheet */}
                  <Box className='fixed bottom-0 m-2 left-0 right-0 bg-white rounded-3xl shadow-lg' sx={{ zIndex: 40 }}>
                    {/* Drag Handle */}
                    <Box className='flex justify-center pt-3 pb-2'>
                      <Box className='w-12 h-1 bg-gray-300 rounded-full' />
                    </Box>

                    <Box className='p-2'>
                      <Box className='px-3 py-6'>
                        <Typography variant='h6' className='text-gray-800 mb-4 font-medium'>
                          배경 사진 추가하기
                        </Typography>

                        {/* Add Photo Button */}
                        <Box className='flex justify-start mb-6 gap-3 flex-wrap items-center'>
                          <Box
                            className='w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-black cursor-pointer hover:bg-gray-200 transition-colors'
                            onClick={() => backgroundInputRef.current?.click()}
                          >
                            <i className='ri-add-line text-3xl text-black' />
                          </Box>

                          {/* Hidden file input */}
                          <input
                            ref={backgroundInputRef}
                            type='file'
                            accept='image/*'
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  // Compress and upload image
                                  const imageUrl = await uploadImageToServer(file)
                                  // Background image uploaded
                                  setBackgroundImage(imageUrl)
                                } catch (error) {
                                  // Background image upload error
                                  alert('이미지 업로드 중 오류가 발생했습니다.')
                                }
                              }
                              e.target.value = ''
                            }}
                            style={{ display: 'none' }}
                          />

                          {/* Preview uploaded image */}
                          {backgroundImage && (
                            <Box className='relative'>
                              <Box
                                className='w-20 h-20 rounded-xl bg-cover bg-center'
                                style={{ backgroundImage: `url(${backgroundImage})` }}
                              />
                              <Box
                                className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors'
                                onClick={() => setBackgroundImage(null)}
                              >
                                <i className='ri-close-line text-white' style={{ fontSize: '14px' }} />
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Next Button */}
                      <Button
                        fullWidth
                        variant='contained'
                        className='rounded-xl text-white'
                        sx={{
                          backgroundColor: '#3D3D3D',
                          textTransform: 'none',
                          py: 1.5,
                          fontSize: '16px',
                          fontWeight: 'medium'
                        }}
                        onClick={() => {
                          const validation = validateStep('customize')
                          if (!validation.isValid) {
                            alert(validation.errorMessage)
                            return
                          }
                          safeSetState(() => {
                            setCreateStep('detail')
                            setIsExpanded(true) // Open rich editor immediately
                            setHighestStepReached(prev => Math.max(prev, 3)) // Step detail = index 3
                          })
                        }}
                      >
                        다음
                      </Button>
                    </Box>
                  </Box>
                </>
              ) : createStep === 'detail' ? (

                <>

                  {createStep === 'detail' && (
                    <Box
                      className={`fixed inset-0 ${boxHeight <= 5 ? 'bg-white' : 'bg-black'} z-50 flex flex-col ${!isExpanded && !isDragging ? 'pointer-events-none' : ''
                        }`}
                      sx={{
                        opacity: (() => {
                          if (isDragging && dragStartY !== null && dragCurrentY !== null) {
                            const dragDistance = dragStartY - dragCurrentY
                            const progress = Math.min(Math.max(dragDistance / 200, 0), 1)
                            return progress
                          }
                          return isExpanded ? 1 : 0
                        })(),
                        transform: (() => {
                          if (isDragging && dragStartY !== null && dragCurrentY !== null) {
                            const dragDistance = dragStartY - dragCurrentY
                            const translateY = Math.max(-dragDistance, 0)
                            return `translateY(${translateY}px)`
                          }
                          return isExpanded ? 'translateY(0)' : 'translateY(100%)'
                        })(),
                        transition: isDragging ? 'none' : 'opacity 0.3s ease, transform 0.3s ease'
                      }}
                    >
                      {/* White Header */}
                      <Box className='bg-white flex-shrink-0'>
                        <Box className='flex items-center justify-between px-4 py-3'>
                          <Button
                            variant='text'
                            className='text-black normal-case'
                            sx={{ flexShrink: 0 }}
                            onClick={() => safeSetState(() => setCreateStep('customize'))}
                          >
                            뒤로
                          </Button>
                          <Typography
                            variant='h6'
                            className='text-black font-medium'
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              textAlign: 'center',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              lineHeight: 1.2,
                              px: 2
                            }}
                          >
                            {clubName && clubName.trim().length > 0 ? clubName : 'Name'}
                          </Typography>
                          <Box className='grid grid-cols-2 gap-2'>
                            <Button
                              variant='text'
                              className='text-black normal-case'
                              sx={{ flexShrink: 0 }}
                              onClick={() => {
                                const richContent = editorRef.current?.innerHTML || savedEditorContent || ''
                                const payload: any = {
                                  clubName,
                                  selectedCategory,
                                  selectedActivities: selectedActivityId ? [selectedActivityId] : [],
                                  minParticipants,
                                  maxParticipants,
                                  feeAmount,
                                  feeOption,
                                  feeBreakdown,
                                  roadNameLotNumber,
                                  detailedAddress,
                                  dateValue,
                                  timeValue,
                                  meetingFrequency: meetingFrequency,
                                  duration,
                                  description: richContent || titleBodyInput.body || '',
                                  backgroundImage,
                                  meetingConsentPersonal,
                                  meetingConsentGuidelines,
                                  status: 'draft' // Set status to draft
                                }
                                if (!isAuthenticated || !token) {
                                  alert('로그인이 필요합니다. 먼저 로그인해주세요.')
                                  return
                                }

                                // Use conditional API call based on edit mode
                                const apiCall = isEditMode && editMeetingId
                                  ? apiPutWithStore(`/api/meetings/${editMeetingId}`, payload, token)
                                  : apiPostWithStore('/api/meetings', payload, token)

                                apiCall
                                  .then((result) => {
                                    safeSetState(() => setCreateStep('completion'))
                                    // Dispatch event to notify profile page to refresh meetings
                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('meeting-created'))
                                    }, 500)
                                  })
                                  .catch((e) => {
                                    const errorMessage = isEditMode
                                      ? '모임 수정에 실패했습니다. 나중에 다시 시도해주세요.'
                                      : '모임 초안 저장에 실패했습니다. 나중에 다시 시도해주세요.'
                                    alert(errorMessage)
                                  })
                              }}
                            >
                              임시 저장
                            </Button>
                            <Button
                              variant='text'
                              className='text-black normal-case'
                              sx={{ flexShrink: 0 }}
                              onClick={() => {
                                const richContent = editorRef.current?.innerHTML || savedEditorContent || ''
                                const payload: any = {
                                  clubName,
                                  selectedCategory,
                                  selectedActivities: selectedActivityId ? [selectedActivityId] : [],
                                  minParticipants,
                                  maxParticipants,
                                  feeAmount,
                                  feeOption,
                                  feeBreakdown,
                                  roadNameLotNumber,
                                  detailedAddress,
                                  dateValue,
                                  timeValue,
                                  meetingFrequency: meetingFrequency,
                                  duration,
                                  description: richContent || titleBodyInput.body || '',
                                  backgroundImage,
                                  meetingConsentPersonal,
                                  meetingConsentGuidelines,
                                  // Status will default to 'pending' on backend (requires admin approval)
                                }
                                if (!isAuthenticated || !token) {
                                  alert('로그인이 필요합니다. 먼저 로그인해주세요.')
                                  return
                                }

                                // Use conditional API call based on edit mode
                                const apiCall = isEditMode && editMeetingId
                                  ? apiPutWithStore(`/api/meetings/${editMeetingId}`, payload, token)
                                  : apiPostWithStore('/api/meetings', payload, token)

                                apiCall
                                  .then((result) => {
                                    safeSetState(() => setCreateStep('completion'))
                                    // Dispatch event to notify profile page to refresh meetings
                                    setTimeout(() => {
                                      window.dispatchEvent(new CustomEvent('meeting-created'))
                                    }, 500)
                                  })
                                  .catch((e) => {
                                    const errorMessage = isEditMode
                                      ? '모임 수정에 실패했습니다. 나중에 다시 시도해주세요.'
                                      : '모임 생성에 실패했습니다. 나중에 다시 시도해주세요.'
                                    alert(errorMessage)
                                  })
                              }}
                            >
                              완료
                            </Button>
                          </Box>
                        </Box>
                      </Box>

                      {/* White Content Area - Top Half */}
                      <Box
                        className='bg-white overflow-y-auto relative flex-1'
                        onScroll={() => {
                          // Update position on scroll if image is selected
                          if (selectedImageId && editorRef.current) {
                            const imgElement = editorRef.current.querySelector(`img[data-image-id="${selectedImageId}"]`) as HTMLImageElement
                            if (imgElement) {
                              const rect = imgElement.getBoundingClientRect()
                              const editorRect = editorRef.current.getBoundingClientRect()

                              // Horizontal center of the editor/screen
                              const editorCenterX = editorRect.width / 2

                              setResizeControlPosition({
                                top: rect.bottom - editorRect.top + 10,
                                left: editorCenterX, // Center of screen
                                width: 280 // Fixed width
                              })
                            }
                          }
                        }}
                      >{/* Empty white space - matches reference */}
                        <Box
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onMouseUp={saveSelection}
                          onKeyUp={saveSelection}
                          onClick={(e) => {
                            // Close resize controls if clicking outside of an image
                            const target = e.target as HTMLElement
                            if (target.tagName !== 'IMG') {
                              // Remove border from any selected image
                              if (editorRef.current) {
                                const prevSelected = editorRef.current.querySelector('img[data-selected="true"]')
                                if (prevSelected) {
                                  prevSelected.removeAttribute('data-selected')
                                    ; (prevSelected as HTMLImageElement).style.border = 'none'
                                }
                              }
                              setSelectedImageId(null)
                              setResizeControlPosition(null)
                            }
                          }}
                          className='bg-white text-black rounded-xl p-4 min-h-[200px] mb-2 outline-none'
                        >

                        </Box>



                        {/* Floating Image Resize Controls - Positioned below selected image */}
                        {selectedImageId && resizeControlPosition && (
                          <Box
                            className='absolute z-50'
                            style={{
                              top: `${resizeControlPosition.top}px`,
                              left: `${resizeControlPosition.left}px`,
                              width: `${resizeControlPosition.width}px`,
                              transform: 'translateX(-50%)', // Center the control below the image
                            }}
                          >
                            <Box className='bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg'>
                              <Box className='flex items-center justify-between mb-2'>
                                <Typography variant='body2' className='text-gray-700 font-medium text-xs'>
                                  이미지 크기 조절
                                </Typography>
                                <IconButton
                                  size='small'
                                  onClick={closeResizeControls}
                                  sx={{ p: 0.5 }}
                                >
                                  <i className='ri-close-line text-gray-600' style={{ fontSize: '16px' }} />
                                </IconButton>
                              </Box>
                              <Box className='flex items-center justify-between mb-2'>
                                <Typography variant='body2' className='text-gray-700 text-xs'>
                                  {selectedImageSize}%
                                </Typography>
                              </Box>
                              <input
                                type='range'
                                min='25'
                                max='100'
                                step='5'
                                value={selectedImageSize}
                                onChange={(e) => updateImageSize(Number(e.target.value))}
                                className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
                                style={{
                                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${selectedImageSize}%, #E5E7EB ${selectedImageSize}%, #E5E7EB 100%)`
                                }}
                              />
                              <Box className='flex justify-between mt-1 mb-2'>
                                <Typography variant='caption' className='text-gray-500 text-xs'>
                                  25%
                                </Typography>
                                <Typography variant='caption' className='text-gray-500 text-xs'>
                                  100%
                                </Typography>
                              </Box>
                              <Button
                                fullWidth
                                size='small'
                                variant='outlined'
                                onClick={() => {
                                  if (selectedImageId) {
                                    removeGalleryImage(selectedImageId)
                                  }
                                }}
                                sx={{
                                  textTransform: 'none',
                                  borderColor: '#EF4444',
                                  color: '#EF4444',
                                  fontSize: '11px',
                                  py: 0.5,
                                  '&:hover': {
                                    borderColor: '#DC2626',
                                    backgroundColor: '#FEF2F2'
                                  }
                                }}
                              >
                                <i className='ri-delete-bin-line mr-1' style={{ fontSize: '12px' }} />
                                이미지 삭제
                              </Button>
                            </Box>
                          </Box>
                        )}


                        {/* Image Gallery Slider - Show when multiple images */}
                        {false && galleryImages.length > 1 && (
                          <Box className='px-4 pb-4'>
                            <Typography variant='caption' className='text-gray-600 mb-2 block'>
                              선택된 이미지 ({galleryImages.length})
                            </Typography>
                            <Box className='flex gap-2 overflow-x-auto pb-2' style={{ scrollbarWidth: 'thin' }}>
                              {galleryImages.map(image => (
                                <Box
                                  key={image.id}
                                  className='relative flex-shrink-0'
                                  style={{ width: '120px', height: '120px' }}
                                >
                                  <img
                                    src={image.url}
                                    alt='Gallery image'
                                    className='w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity'
                                    onClick={() => insertGalleryImageToEditor(image.url, image.id)}
                                  />
                                  {/* Remove button */}
                                  <Box
                                    onClick={() => removeGalleryImage(image.id)}
                                    className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors shadow-lg'
                                  >
                                    <i className='ri-close-line text-white' style={{ fontSize: '14px' }} />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                            <Typography variant='caption' className='text-gray-500 text-xs mt-1 block'>
                              이미지를 클릭하여 에디터에 삽입하거나 X를 눌러 제거할 수 있습니다
                            </Typography>
                          </Box>
                        )}


                      </Box>

                      <Box
                        className='pt-2 pb-6 vvvv bg-white borderborder rounded-b-[20px]'
                        sx={{
                          position: 'relative',
                          zIndex: 10,
                          marginTop: '-20px'
                        }}
                      >
                        <Box
                          className='flex gap-2 overflow-x-auto px-2 pb-2 scrollbar-hide'
                          sx={{
                            '&::-webkit-scrollbar': {
                              display: 'none'
                            },
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                          }}
                        >
                          {tabOrder.map((tab, index) => (
                            <Box
                              key={tab.key}
                              data-tab-index={index}
                            >
                              <Button
                                variant='outlined'
                                onClick={() => {
                                  const fn = getHandlerByName(tab.handler)
                                  if (typeof fn === 'function') fn()
                                  setIsExpanded(true)
                                }}
                                className='whitespace-nowrap border border-radius-[9px] text-white border-white/50 bg-gray-300 px-3 py-1.5'
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '14px',
                                  px: 3,
                                  py: 1.5,
                                  minWidth: 'auto',
                                  flexShrink: 0,
                                  fontWeight: 'normal',
                                  cursor: draggedTabIndex === index ? 'grabbing' : 'grab'
                                }}
                              >
                                {tab.label}
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Dark Bottom Sheet - Bottom Half */}
                      <Box
                        className='rounded-t-3xl flex flex-col flex-shrink-0'
                        style={{
                          height: `${boxHeight}vh`,
                          backgroundColor: boxHeight <= 5 ? 'white' : 'black'
                        }}
                      >
                        {/* Drag Handle */}
                        <Box className='flex flex-col items-center justify-center pt-3 flex-shrink-0' style={{ marginTop: '-30px', position: 'relative', height: '64px' }}>
                          {/* Green gradient bar animation when dragging - positioned based on drag direction */}
                          {isToolsDragging && toolsDragStartY !== null && toolsDragCurrentY !== null && (() => {
                            const dragDistance = toolsDragCurrentY - toolsDragStartY
                            const isDraggingDown = dragDistance > 0 // Positive = dragging down

                            return (
                              <Box
                                sx={{
                                  position: "absolute",
                                  zIndex: 19,
                                  pointerEvents: "none",
                                }}
                              />

                            )
                          })()}

                          <Box
                            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              initialBoxHeightOnDragStart.current = boxHeight
                              setToolsDragStartY(e.clientY)
                              setToolsDragCurrentY(e.clientY)
                              setIsToolsDragging(true)
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault()
                              initialBoxHeightOnDragStart.current = boxHeight
                              setToolsDragStartY(e.touches[0].clientY)
                              setToolsDragCurrentY(e.touches[0].clientY)
                              setIsToolsDragging(true)
                            }}
                            sx={{
                              backgroundColor: '#D1D5DB',
                              transform: isToolsDragging ? 'scale(1.2)' : 'scale(1)',
                              transition: isToolsDragging ? 'none' : 'all 0.2s ease',
                              boxShadow: isToolsDragging ? '0 4px 16px' : 'none',
                              touchAction: 'none',
                              position: 'relative',
                              zIndex: 21,

                            }}
                          >
                            <i
                              className='ri-expand-up-down-line rrr'
                              style={{
                                fontSize: '16px',
                                color: isToolsDragging ? '#fff' : '#6B7280',
                                transition: 'color 0.2s ease',
                                position: 'relative',
                                zIndex: 22 // Ensure icon is on top
                              }}
                            />
                          </Box>
                        </Box>

                        {/* editor tools */}
                        {showEditorTools && (
                          <Box
                            className='px-6 pt-6 pb-8 flex-1'
                            style={{ overflowY: boxHeight <= 5 ? 'hidden' : 'auto' }}
                          >

                            <Box className="flex flex-col gap-3 mb-4">
                              {/* === Top Row: Style Dropdown + Undo / Redo / Delete === */}
                              <Box className="flex items-center justify-start gap-2">
                                {/* Font Style Dropdown */}
                                <Box
                                  className="bg-white/20 rounded-lg px-3 py-2 flex items-center justify-between border border-white/20 cursor-pointer hover:bg-white/30 transition-colors relative w-1/2"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    saveSelection()
                                    setShowStyleMenu(!showStyleMenu)
                                  }}
                                >
                                  <Typography variant="body2" className="text-white">
                                    {currentTextStyle}
                                  </Typography>
                                  <i className="ri-expand-up-down-line text-white text-[16px]" />

                                  {/* Dropdown Menu */}
                                  {showStyleMenu && (
                                    <Box
                                      className="absolute top-full left-0 right-0 mt-1 bg-gray-900 rounded-lg border border-white/20 overflow-hidden z-50"
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      {Object.keys(textStylePresets).map((styleName) => (
                                        <Box
                                          key={styleName}
                                          className="px-3 py-2 hover:bg-white/20 cursor-pointer transition-colors"
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            applyFontFamilyOnly(styleName as keyof typeof textStylePresets)
                                            setShowStyleMenu(false)
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            className="text-white"
                                            sx={{
                                              fontFamily:
                                                textStylePresets[styleName as keyof typeof textStylePresets]
                                                  .fontFamily,
                                            }}
                                          >
                                            {styleName}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>

                                {/* Undo / Redo / Delete Icons */}
                                <Box className="flex items-center gap-3 ml-2">

                                  <Box
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${historyIndex > 0
                                      ? 'bg-white/20 border-white/20 cursor-pointer'
                                      : 'bg-white/10 border-white/10 cursor-not-allowed opacity-50'
                                      }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={historyIndex > 0 ? handleUndo : undefined}
                                  >
                                    <i className="ri-arrow-go-back-line text-white text-[16px]" />
                                  </Box>

                                  <Box
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${historyIndex < editorHistory.length - 1
                                      ? 'bg-white/20 border-white/20 cursor-pointer'
                                      : 'bg-white/10 border-white/10 cursor-not-allowed opacity-50'
                                      }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={historyIndex < editorHistory.length - 1 ? handleRedo : undefined}
                                  >
                                    <i className="ri-arrow-go-forward-line text-white text-[16px]" />
                                  </Box>

                                  <Box
                                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 cursor-pointer"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleClear}
                                    title="모두 지우기"
                                  >
                                    <i className="ri-delete-bin-6-line text-white text-[16px]" />
                                  </Box>

                                </Box>

                              </Box>

                              {/* === Bottom Row: Text Editing Controls === */}
                              <Box className="flex flex-wrap items-center justify-start gap-3">
                                {/* Font Size Controls */}
                                <Box className="flex items-center bg-white/20 rounded-lg border border-white/20">
                                  <Box
                                    className="w-8 h-8 flex items-center justify-center cursor-pointer"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={decreaseFontSize}
                                  >
                                    <Typography variant="body2" className="text-white font-bold">
                                      A
                                    </Typography>
                                  </Box>

                                  <Divider
                                    orientation="vertical"
                                    className="h-4 bg-white/50"
                                    sx={{ width: "1px", alignSelf: "center" }}
                                    flexItem
                                  />

                                  <Box
                                    className="w-8 h-8 flex items-center justify-center cursor-pointer"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={increaseFontSize}
                                  >
                                    <Typography variant="body2" className="text-white font-bold text-lg">
                                      A
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Bold */}
                                <Box
                                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 cursor-pointer"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => execCommand("bold")}
                                >
                                  <Typography variant="body2" className="text-white font-bold">
                                    B
                                  </Typography>
                                </Box>

                                {/* Remove Format */}
                                <Box
                                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 cursor-pointer"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => execCommand("removeFormat")}
                                >
                                  <i className="ri-format-clear text-white text-[16px]" />
                                </Box>

                                {/* Align */}
                                <Box
                                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 cursor-pointer"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={handleAlignClick}
                                >
                                  <i className={`${getAlignIcon()} text-white text-[16px]`} />
                                </Box>

                                {/* Color Picker */}
                                <Box
                                  className="relative w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 cursor-pointer"
                                  data-color-button
                                  onClick={() => {
                                    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
                                    setShowColorPicker(true)
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <Box className="relative inline-block">
                                    <Box
                                      className="w-5 h-5 rounded-full"
                                      sx={{
                                        background:
                                          "conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000)",
                                      }}
                                    />
                                  </Box>

                                  {showColorPicker && (
                                    <Box
                                      data-color-picker
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
                                      }}
                                      onMouseLeave={() => {
                                        pickerTimeoutRef.current = setTimeout(
                                          () => setShowColorPicker(false),
                                          200
                                        )
                                      }}
                                      sx={{
                                        position: 'fixed',
                                        bottom: '250px', // Position above the toolbar
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 9999,
                                        maxWidth: "90vw",
                                        overflow: "visible"
                                      }}
                                    >
                                      <HexColorPicker
                                        color={selectedColor}
                                        onChange={(color) => {
                                          setSelectedColor(color)
                                          execCommand("foreColor", color)
                                        }}
                                      />
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Box>


                            {/* Add Section */}
                            <Box>
                              <Typography variant='h6' className='text-white mb-4 font-medium'>
                                추가
                              </Typography>
                              <Box className='flex gap-3'>
                                <Box className='flex flex-col flex-grow items-center gap-2'>

                                  <Box
                                    className='w-full h-24 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/30 transition-colors'
                                    onClick={handleTextBodyInsert}
                                  >
                                    <img
                                      src='/images/custom/t+b-img.png'
                                      alt='T+B'
                                      className='w-full h-full p-3 object-contain'
                                    />
                                  </Box>
                                  <Typography className='text-white text'>제목+바디</Typography>
                                </Box>

                                <Box className='flex flex-col flex-grow items-center gap-2'>
                                  <Box
                                    className='w-full h-24 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/30 transition-colors'
                                    onClick={handleGalleryClick}
                                    onContextMenu={(e) => {
                                      e.preventDefault()
                                      // Right-click adds at top
                                      ensureSelectionAtStart()
                                      galleryInputRef.current?.click()
                                    }}
                                  >
                                    <img
                                      src='/images/custom/gallery-img.png'
                                      alt='Gallery'
                                      className='w-full h-full p-5 object-contain'
                                    />
                                  </Box>
                                  <Typography className='text-white text'>이미지</Typography>
                                </Box>
                                {/* Hidden gallery input */}

                                <input
                                  ref={galleryInputRef}
                                  type='file'
                                  accept='image/*'
                                  multiple
                                  onChange={handleGallerySelect}
                                  style={{ display: 'none' }}
                                />

                                <Box className='flex flex-col flex-grow items-center gap-2'>
                                  <Box
                                    className='w-full h-24 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/30 transition-colors'
                                    onClick={handleYouTubeClick}
                                  >
                                    <img
                                      src='/images/custom/camera-img.png'
                                      alt='Camera'
                                      className='w-full h-full p-5 object-contain'
                                    />
                                  </Box>
                                  <Typography className='text-white text'>영상</Typography>
                                </Box>
                              </Box>
                            </Box>

                          </Box>
                        )}


                      </Box>

                    </Box>
                  )}
                  {/* </Box> */}
                </>
              ) : null}

            {/* Completion Page */}
            {createStep === 'completion' && (
              <>
                <Box className='fixed inset-0 bg-white flex flex-col z-50'>
                  {/* Header */}

                  {/* Main Content */}
                  <Box className='flex-1 flex flex-col px-6 pt-6'>
                    {/* Title */}
                    <Typography variant='h4' className='text-black font-bold'>
                      모임 신청을 완료했어요
                    </Typography>

                    {/* Description */}
                    <Box className=' mb-8'>
                      <Typography variant='body1' className='text-gray-600 '>
                        운영팀에서 검수하고 개시될 예정이에요.
                        <br />
                        검수는 영업일 기준으로 2-3일 소요돼요.
                      </Typography>
                    </Box>

                    {/* Confetti celebration */}
                    {showConfetti && <Confetti width={width} height={height} />}
                    {/* 
                    <Box className='fixed left-1/2 transform -translate-x-1/2 mb-5' sx={{ bottom: 55, zIndex: 20 }}>
                      {renderProgress(4, 4)}
                    </Box> */}
                    <Box className='fixed left-1/2 transform -translate-x-1/2 w-[92%]' sx={{ bottom: 22, zIndex: 30 }}>
                      <Button
                        fullWidth
                        variant='contained'
                        className='rounded-xl text-white'
                        sx={{ backgroundColor: '#3D3D3D', textTransform: 'none', paddingY: '16px' }}
                        onClick={() => {
                          try {
                            // Clear home data cache to force refetch with new meeting
                            dispatch(clearHomeData())
                            // Dispatch event to notify profile page to refresh meetings
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('meeting-created'))
                            }, 500)
                            // Redirect to profile with meetings tab active
                            navigate('/profile?tab=meetings')
                          } catch { }
                        }}
                      >
                        다음
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </>
        )}

        {/* Camera Modal - Hide on completion page */}
        {showYouTubeModal && createStep !== 'completion' && (
          <Box
            className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center'
            sx={{ zIndex: 9999 }}
            onClick={handleCloseYouTubeModal}
          >
            <Box
              className='bg-gray-900 rounded-2xl p-6 w-11/12 max-w-md'
              onClick={(e) => e.stopPropagation()}
            >
              <Box className='flex items-center gap-3 mb-4'>
                <i className='ri-youtube-line text-red-500 text-3xl' />
                <Typography variant='h6' className='text-white font-medium'>
                  YouTube 동영상 삽입
                </Typography>
              </Box>

              <Typography variant='body2' className='text-gray-400 mb-2'>
                파일 크기와 호환성 문제로 인해 YouTube 동영상 링크만 삽입할 수 있습니다.
              </Typography>

              <Typography variant='body2' className='text-gray-400 mb-4'>
                YouTube 링크를 입력하세요
              </Typography>

              <TextField
                fullWidth
                placeholder='https://www.youtube.com/watch?v=...'
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleYouTubeInsert()
                  }
                }}
                sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF0000',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    opacity: 1,
                  },
                }}
              />

              <Box className='flex gap-3 justify-end'>
                <Button
                  variant='outlined'
                  onClick={handleCloseYouTubeModal}
                  className='rounded-xl'
                  sx={{
                    textTransform: 'none',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    px: 3,
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    }
                  }}
                >
                  취소
                </Button>

                <Button
                  variant='contained'
                  onClick={handleYouTubeInsert}
                  className='rounded-xl'
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#FF0000',
                    color: 'white',
                    px: 3,
                    '&:hover': {
                      backgroundColor: '#CC0000',
                    }
                  }}
                >
                  삽입
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Title + Body Modal */}

        {/* Hidden input elements for date/time pickers */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={dateValue}
          min={getTodayDateString()}
          onChange={(e) => {
            let newDateValue = e.target.value
            const today = getTodayDateString()
            if (newDateValue < today) {
              newDateValue = today
            }
            safeSetState(() => {
              setDateValue(newDateValue)
              setMeetingDate(formatKoreanDate(newDateValue))
              if (newDateValue === today && timeValue < getNowTimeString()) {
                const correctedTime = getNowTimeString()
                setTimeValue(correctedTime)
                setMeetingTime(formatKoreanTime(correctedTime))
              }
            })
          }}
          style={{
            position: 'fixed',
            top: '-1000px',
            left: '-1000px',
            opacity: 0,
            pointerEvents: 'auto',
            zIndex: -1
          }}
          tabIndex={-1}
        />

        <input
          ref={hiddenTimeInputRef}
          type="time"
          value={timeValue}
          min={dateValue === getTodayDateString() ? getNowTimeString() : undefined}
          onChange={(e) => {
            let newTimeValue = e.target.value
            const today = getTodayDateString()
            if (dateValue === today) {
              const nowTime = getNowTimeString()
              if (newTimeValue < nowTime) {
                newTimeValue = nowTime
              }
            }
            safeSetState(() => {
              setTimeValue(newTimeValue)
              setMeetingTime(formatKoreanTime(newTimeValue))
            })
          }}
          style={{
            position: 'fixed',
            top: '-1000px',
            left: '-1000px',
            opacity: 0,
            pointerEvents: 'auto',
            zIndex: -1
          }}
          tabIndex={-1}
        />
      </Box >
    </>
  )
}

export default AddClubPage
