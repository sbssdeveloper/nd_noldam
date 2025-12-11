/**
 * Utility to clear all authentication data
 * This can be called from browser console or used in development
 */

/**
 * Clear all authentication data and reload the page
 * Note: This now just reloads the page as Redux persist handles the clearing
 */
export function clearAuthAndReload(): void {
  // Redux persist will handle clearing the auth data
  window.location.reload()
}

/**
 * Clear authentication data without reloading
 * Note: This is now handled by Redux actions
 */
export function clearAuthOnly(): void {
  // Redux persist will handle clearing the auth data
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAuth = clearAuthAndReload
  (window as any).clearAuthOnly = clearAuthOnly
}
