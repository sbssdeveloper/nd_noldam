// Frontend Add Club / Meeting Creation Types

// Gallery Image Types
export interface GalleryImage {
  url: string
  id: string
}

// Resize Control Position
export interface ResizeControlPosition {
  top: number
  left: number
  width: number
}

// Text Alignment Types
export type TextAlignment = 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull'

// Form Validation Types
export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}
