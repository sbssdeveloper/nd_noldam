/**
 * Toss Payments Configuration
 * 
 * Centralized configuration for Toss Payments keys and constants.
 * All keys are loaded from environment variables.
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: Client key for frontend (public)
 * - TOSS_PAYMENTS_SECRET_KEY: Secret key for backend (private)
 */

/**
 * Minimum payment amount required by Toss Payments (in KRW)
 * Toss Payments requires a minimum of 1,000 KRW for all payment methods
 */
export const MIN_TOSS_PAYMENTS_AMOUNT = 1000

/**
 * Get Toss Payments client key from environment
 * Used in frontend components
 * 
 * @returns Client key from environment or fallback test key for development
 */
export function getTossClientKey(): string {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY
  
  // Fallback to test key from Toss documentation if not set (development only)
  // In production, this should always be set in environment variables
  if (!clientKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY is not set in production!')
      throw new Error('NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY is required in production')
    }
    
    // Development fallback - test key from Toss documentation
    // https://docs.tosspayments.com/en/integration
    console.warn('⚠️ Using fallback test client key. Set NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY in .env for production.')
    return 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
  }
  
  return clientKey
}

/**
 * Validate client key format
 * 
 * @param key Client key to validate
 * @returns true if key format is valid
 */
export function isValidClientKey(key: string): boolean {
  const validPrefixes = ['test_ck_', 'test_gck_', 'test_gsk_docs', 'live_ck_']
  return validPrefixes.some(prefix => key.startsWith(prefix))
}

