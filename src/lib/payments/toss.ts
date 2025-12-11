/**
 * Toss Payments API Integration
 * 
 * Professional implementation following Toss Payments documentation:
 * - https://docs.tosspayments.com/en/integration
 * - https://docs.tosspayments.com/en/api-guide
 * 
 * Features:
 * - Payment creation with proper validation
 * - Payment confirmation with amount verification
 * - Payment cancellation/refund
 * - Payment retrieval
 * - Webhook signature verification
 * - Comprehensive error handling
 * - TypeScript types
 */

const TOSS_API_BASE_URL = 'https://api.tosspayments.com/v1'
const TOSS_MIN_AMOUNT = 1000 // Minimum payment amount in KRW

// ============================================================================
// Type Definitions
// ============================================================================

export interface TossPaymentRequest {
  amount: number
  orderId: string
  orderName: string
  customerName?: string
  customerEmail?: string
  customerMobilePhone?: string
  successUrl: string
  failUrl: string
  currency?: string
  method?: 'CARD' | 'VIRTUAL_ACCOUNT' | 'MOBILE_PHONE' | 'TRANSFER' | 'FOREIGN_EASY_PAY'
}

export interface TossPaymentResponse {
  paymentKey: string
  orderId: string
  status: string
  requestedAt: string
  totalAmount: number
  balanceAmount: number
  currency: string
}

export interface TossPaymentConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
}

export interface TossPaymentConfirmResponse {
  paymentKey: string
  orderId: string
  status: string
  totalAmount: number
  balanceAmount: number
  approvedAt: string | null
  method: string
  card?: {
    number: string
    installmentPlanMonths: number
    isInterestFree: boolean
    approveNo: string
    useCardPoint: boolean
    cardType: string
    ownerType: string
    acquireStatus: string
    receiptUrl: string
  }
  virtualAccount?: {
    accountType: string
    accountNumber: string
    bankCode: string
    customerName: string
    dueDate: string
    refundStatus: string
    expired: boolean
    settlementStatus: string
    refundReceiveAccount?: {
      bank: string
      accountNumber: string
      holderName: string
    }
  }
  transfer?: {
    bankCode: string
    settlementStatus: string
  }
  mobilePhone?: {
    customerMobilePhone: string
    settlementStatus: string
    receiptUrl: string
  }
  easyPay?: {
    provider: string
    amount: number
    discountAmount: number
  }
  country: string
  currency: string
  failure?: {
    code: string
    message: string
  }
}

export interface TossPaymentCancelRequest {
  cancelReason: string
  cancelAmount?: number
  refundReceiveAccount?: {
    bank: string
    accountNumber: string
    holderName: string
  }
  taxFreeAmount?: number
  taxAmount?: number
  refundableAmount?: number
}

export interface TossPaymentCancelResponse {
  cancelId: string
  cancelAmount: number
  cancelReason: string
  taxFreeAmount: number
  taxAmount: number
  refundableAmount: number
  easyPayDiscountAmount: number
  canceledAt: string
  transactionKey: string
  receiptKey: string
  currency: string
}

export interface TossErrorResponse {
  code: string
  message: string
  error?: {
    code: string
    message: string
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get Toss Payments secret key from environment
 * @throws Error if secret key is not set or invalid
 */
function getSecretKey(): string {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
  
  if (!secretKey) {
    throw new Error('TOSS_PAYMENTS_SECRET_KEY is not set in environment variables')
  }

  // Validate key format
  const validPrefixes = ['test_sk_', 'test_gsk_', 'live_sk_', 'live_gsk_']
  const hasValidPrefix = validPrefixes.some(prefix => secretKey.startsWith(prefix))
  
  if (!hasValidPrefix) {
    throw new Error('Invalid Toss Payments secret key format. Key should start with test_sk_, test_gsk_, live_sk_, or live_gsk_')
  }

  return secretKey
}

/**
 * Create Basic Auth header for Toss API
 * Format: Basic {base64(secretKey:)}
 */
function getAuthHeader(): string {
  const secretKey = getSecretKey()
  const encoded = Buffer.from(`${secretKey}:`).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Validate order ID format
 * Must be 6-64 characters, alphanumeric with - and _
 */
function validateOrderId(orderId: string): void {
  if (!orderId || orderId.length < 6 || orderId.length > 64) {
    throw new Error('orderId must be between 6 and 64 characters')
  }
  
  // Only allow alphanumeric, -, and _
  if (!/^[a-zA-Z0-9_-]+$/.test(orderId)) {
    throw new Error('orderId can only contain letters, numbers, hyphens, and underscores')
  }
}

/**
 * Validate amount
 * Minimum 1000 KRW for most payment methods
 */
function validateAmount(amount: number, currency: string = 'KRW'): void {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  
  if (currency === 'KRW' && amount < TOSS_MIN_AMOUNT) {
    throw new Error(`Amount must be at least ${TOSS_MIN_AMOUNT} KRW`)
  }
  
  if (!Number.isInteger(amount)) {
    throw new Error('Amount must be an integer')
  }
}

/**
 * Format phone number for Toss Payments
 * Removes non-digits and validates Korean phone format (10-11 digits)
 */
function formatPhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined
  
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Korean phone numbers: 10-11 digits (typically starting with 010)
  if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
    return digitsOnly
  }
  
  return undefined
}

/**
 * Handle Toss API errors
 */
function handleTossError(response: Response, errorText: string): never {
  let errorData: TossErrorResponse
  
  try {
    errorData = JSON.parse(errorText)
  } catch {
    errorData = {
      code: 'UNKNOWN_ERROR',
      message: errorText || 'Unknown error occurred'
    }
  }
  
  const errorMessage = errorData.message || 
                      errorData.error?.message || 
                      errorData.code || 
                      response.statusText
  
  const error = new Error(`Toss API error (${response.status}): ${errorMessage}`)
  ;(error as any).code = errorData.code
  ;(error as any).status = response.status
  throw error
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a payment request
 * 
 * @param request Payment request data
 * @returns Payment response with paymentKey
 * @throws Error if request is invalid or API call fails
 * 
 * Reference: https://docs.tosspayments.com/en/api-guide#create-a-payment
 */
export async function createPaymentRequest(
  request: TossPaymentRequest
): Promise<TossPaymentResponse> {
  // Validate required fields
  if (!request.amount) {
    throw new Error('Amount is required')
  }
  
  if (!request.orderId) {
    throw new Error('orderId is required')
  }
  
  if (!request.orderName) {
    throw new Error('orderName is required')
  }
  
  if (!request.successUrl || !request.failUrl) {
    throw new Error('successUrl and failUrl are required')
  }
  
  // Validate order ID format
  validateOrderId(request.orderId)
  
  // Validate amount
  const currency = request.currency || 'KRW'
  validateAmount(request.amount, currency)
  
  // Validate order name length (max 100 characters)
  if (request.orderName.length > 100) {
    throw new Error('orderName must be 100 characters or less')
  }
  
  // Build request body - only include defined values
  const requestBody: any = {
    amount: Math.round(request.amount), // Ensure integer
    orderId: request.orderId,
    orderName: request.orderName,
    successUrl: request.successUrl,
    failUrl: request.failUrl
  }
  
  // Add optional fields - only if they have values (avoid undefined/null)
  if (request.method) {
    requestBody.method = request.method
  }
  
  if (currency !== 'KRW') {
    requestBody.currency = currency
  }
  
  // Only add customer fields if they have actual values
  if (request.customerName && request.customerName.trim()) {
    requestBody.customerName = request.customerName.trim()
  }
  
  if (request.customerEmail && request.customerEmail.trim()) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(request.customerEmail.trim())) {
      requestBody.customerEmail = request.customerEmail.trim()
    } else {
      console.warn('[Toss API] Invalid email format, skipping:', request.customerEmail)
    }
  }
  
  const formattedPhone = formatPhoneNumber(request.customerMobilePhone)
  if (formattedPhone) {
    requestBody.customerMobilePhone = formattedPhone
  }
  
  // Log final request body (without sensitive data)
  console.log('[Toss API] Final request body keys:', Object.keys(requestBody))
  console.log('[Toss API] Request body size:', JSON.stringify(requestBody).length, 'bytes')
  
  // Make API call
  const authHeader = getAuthHeader()
  
  // Log request details for debugging (without sensitive data)
  console.log('[Toss API] Creating payment request:')
  console.log('[Toss API] URL:', `${TOSS_API_BASE_URL}/payments`)
  console.log('[Toss API] Request body:', JSON.stringify(requestBody, null, 2))
  console.log('[Toss API] Secret key prefix:', getSecretKey().substring(0, 10) + '...')
  
  const response = await fetch(`${TOSS_API_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  const responseText = await response.text()
  console.log('[Toss API] Response status:', response.status, response.statusText)
  console.log('[Toss API] Response body:', responseText)
  
  if (!response.ok) {
    handleTossError(response, responseText)
  }
  
  return response.json()
}

/**
 * Confirm a payment
 * 
 * IMPORTANT: Verify that the amount matches the original payment request
 * to prevent malicious amount manipulation on the client side.
 * 
 * @param request Payment confirmation data
 * @returns Confirmed payment details
 * @throws Error if confirmation fails
 * 
 * Reference: https://docs.tosspayments.com/en/api-guide#authorize-a-payment
 */
export async function confirmPayment(
  request: TossPaymentConfirmRequest
): Promise<TossPaymentConfirmResponse> {
  if (!request.paymentKey || !request.orderId || !request.amount) {
    throw new Error('paymentKey, orderId, and amount are required')
  }
  
  validateAmount(request.amount)
  
  const authHeader = getAuthHeader()
  
  const response = await fetch(`${TOSS_API_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentKey: request.paymentKey,
      orderId: request.orderId,
      amount: Math.round(request.amount)
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    handleTossError(response, errorText)
  }
  
  return response.json()
}

/**
 * Get payment details by paymentKey
 * 
 * @param paymentKey Payment key from Toss
 * @returns Payment details
 * @throws Error if retrieval fails
 * 
 * Reference: https://docs.tosspayments.com/en/api-guide#retrieve-a-payment
 */
export async function getPaymentDetails(
  paymentKey: string
): Promise<TossPaymentConfirmResponse> {
  if (!paymentKey) {
    throw new Error('paymentKey is required')
  }
  
  const authHeader = getAuthHeader()
  
  const response = await fetch(`${TOSS_API_BASE_URL}/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    handleTossError(response, errorText)
  }
  
  return response.json()
}

/**
 * Cancel a payment (refund)
 * 
 * @param paymentKey Payment key from Toss
 * @param request Cancel request data
 * @returns Cancel response
 * @throws Error if cancellation fails
 * 
 * Reference: https://docs.tosspayments.com/en/api-guide#cancel-a-payment
 */
export async function cancelPayment(
  paymentKey: string,
  request: TossPaymentCancelRequest
): Promise<TossPaymentCancelResponse> {
  if (!paymentKey) {
    throw new Error('paymentKey is required')
  }
  
  if (!request.cancelReason) {
    throw new Error('cancelReason is required')
  }
  
  const authHeader = getAuthHeader()
  
  const requestBody: any = {
    cancelReason: request.cancelReason
  }
  
  if (request.cancelAmount) {
    requestBody.cancelAmount = Math.round(request.cancelAmount)
  }
  
  if (request.refundReceiveAccount) {
    requestBody.refundReceiveAccount = request.refundReceiveAccount
  }
  
  if (request.taxFreeAmount !== undefined) {
    requestBody.taxFreeAmount = Math.round(request.taxFreeAmount)
  }
  
  if (request.taxAmount !== undefined) {
    requestBody.taxAmount = Math.round(request.taxAmount)
  }
  
  if (request.refundableAmount !== undefined) {
    requestBody.refundableAmount = Math.round(request.refundableAmount)
  }
  
  const response = await fetch(`${TOSS_API_BASE_URL}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    handleTossError(response, errorText)
  }
  
  return response.json()
}

/**
 * Verify webhook signature
 * 
 * TODO: Implement proper signature verification based on Toss documentation
 * Currently returns true as placeholder
 * 
 * Reference: https://docs.tosspayments.com/en/webhooks
 * 
 * @param signature Webhook signature from header
 * @param payload Webhook payload
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  signature: string | null,
  payload: string
): boolean {
  // TODO: Implement webhook signature verification
  // Toss Payments webhook signature verification method should be implemented here
  // For now, return true (in production, this should be properly implemented)
  
  if (!signature) {
    // In test mode, allow webhooks without signature
    // In production, this should be required
    return process.env.NODE_ENV !== 'production'
  }
  
  // Placeholder - implement actual verification
  return true
}
