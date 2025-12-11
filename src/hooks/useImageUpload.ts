/**
 * Reusable Hook for Image Upload with Compression
 * Use this hook throughout your app for consistent image handling
 */

import { useState, useCallback } from 'react'
import { compressImage, ImageCompressionOptions } from '@/utils/imageCompression'

interface UseImageUploadOptions extends ImageCompressionOptions {
  onSuccess?: (dataUrl: string) => void
  onError?: (error: Error) => void
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const uploadImage = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        quality: options.quality || 0.85,
        maxSizeMB: options.maxSizeMB || 1
      })

      setImageDataUrl(compressedDataUrl)
      options.onSuccess?.(compressedDataUrl)
      
      return compressedDataUrl
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process image')
      setError(error.message)
      options.onError?.(error)
      throw error
    } finally {
      setUploading(false)
    }
  }, [options])

  const selectAndUploadImage = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }

        try {
          const result = await uploadImage(file)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      input.click()
    })
  }, [uploadImage])

  const reset = useCallback(() => {
    setImageDataUrl(null)
    setError(null)
    setUploading(false)
  }, [])

  return {
    uploading,
    error,
    imageDataUrl,
    uploadImage,
    selectAndUploadImage,
    reset
  }
}

