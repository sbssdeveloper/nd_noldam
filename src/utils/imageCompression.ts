/**
 * Image Compression Utility
 * Compresses images before upload to prevent 413 errors
 */

export interface ImageCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 to 1.0
  maxSizeMB?: number
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  maxSizeMB: 2
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<string> - Base64 data URL of compressed image
 */
export const compressImage = async (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    // Check original file size
    const originalSizeMB = file.size / (1024 * 1024)
    console.log(`Original image size: ${originalSizeMB.toFixed(2)} MB`)

    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img
          const aspectRatio = width / height

          if (width > opts.maxWidth!) {
            width = opts.maxWidth!
            height = width / aspectRatio
          }

          if (height > opts.maxHeight!) {
            height = opts.maxHeight!
            width = height * aspectRatio
          }

          // Create canvas for compression
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height)

          // Compress and convert to base64
          let quality = opts.quality!
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality)

          // If still too large, reduce quality further
          let iterations = 0
          const maxIterations = 5
          while (iterations < maxIterations) {
            const compressedSizeMB = (compressedDataUrl.length * 0.75) / (1024 * 1024)
            
            if (compressedSizeMB <= opts.maxSizeMB!) {
              console.log(`Compressed image size: ${compressedSizeMB.toFixed(2)} MB (quality: ${quality})`)
              break
            }

            // Reduce quality by 10% each iteration
            quality = Math.max(0.1, quality - 0.1)
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
            iterations++
          }

          // Final size check
          const finalSizeMB = (compressedDataUrl.length * 0.75) / (1024 * 1024)
          if (finalSizeMB > opts.maxSizeMB!) {
            reject(new Error(`Image is too large even after compression. Final size: ${finalSizeMB.toFixed(2)} MB, Max allowed: ${opts.maxSizeMB} MB`))
            return
          }

          resolve(compressedDataUrl)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Convert data URL to File object
 * @param dataUrl - Base64 data URL
 * @param filename - Name for the file
 * @returns File object
 */
export const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

/**
 * Get file size in MB from base64 data URL
 * @param dataUrl - Base64 data URL
 * @returns Size in MB
 */
export const getDataURLSizeMB = (dataUrl: string): number => {
  return (dataUrl.length * 0.75) / (1024 * 1024)
}

