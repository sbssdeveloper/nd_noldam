import { apiPostWithStore } from '@/utils/api'

export interface CreatePaymentRequest {
  meetingId: number
  amount: number
  orderName?: string
}

export interface CreatePaymentResponse {
  success: boolean
  data?: {
    paymentId: number
    paymentKey: string
    orderId: string
    amount: number
    status: string
  }
  message?: string
  error?: string
}

export interface ConfirmPaymentRequest {
  paymentKey: string
  orderId: string
  amount: number
}

export interface ConfirmPaymentResponse {
  success: boolean
  data?: {
    paymentId: number
    status: string
    paymentMethod?: string
    approvedAt?: string
  }
  message?: string
  error?: string
}

class PaymentsApiService {
  /**
   * Create a payment request
   */
  async createPayment(request: CreatePaymentRequest, token?: string): Promise<CreatePaymentResponse> {
    try {
      console.log('[Frontend] Creating payment request:', request)
      const response = await apiPostWithStore('/api/payments/create', request, token)
      console.log('[Frontend] Payment response:', response)
      return response
    } catch (error: any) {
      console.error('[Frontend] Payment creation error:', error)
      console.error('[Frontend] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      return {
        success: false,
        error: error.message || 'Failed to create payment request'
      }
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(request: ConfirmPaymentRequest, token?: string): Promise<ConfirmPaymentResponse> {
    try {
      const response = await apiPostWithStore('/api/payments/confirm', request, token)
      return response
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to confirm payment'
      }
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: number, cancelReason: string, token?: string): Promise<any> {
    try {
      const response = await apiPostWithStore(
        '/api/payments/cancel',
        { paymentId, cancelReason },
        token
      )
      return response
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel payment'
      }
    }
  }
}

export const paymentsApi = new PaymentsApiService()

