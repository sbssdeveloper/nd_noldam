'use client'

import { useAppDispatch } from '@/store/hooks'
import { clearAuth } from '@/store/slices/authSlice'

export default function ClearAuthButton() {
  const dispatch = useAppDispatch()
  
  const handleClearAuth = () => {
    if (confirm('Are you sure you want to clear all authentication data? This will log you out.')) {
      dispatch(clearAuth())
      window.location.reload()
    }
  }

  return (
    <button
      onClick={handleClearAuth}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
    >
      Clear Auth Data
    </button>
  )
}
