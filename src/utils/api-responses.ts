export const successResponse = (data: any = null, message: string = 'OK') => ({
  success: true,
  message,
  data
})

export const errorResponse = (reason: string = 'Error', statusCode: number = 400) => ({
  success: false,
  reason,
  statusCode
})

export const validationErrorResponse = (reason: string = 'Validation error') => ({
  success: false,
  reason,
  statusCode: 201
})

export const resourceNotFoundResponse = (reason: string = 'Resource not found') => ({
  success: false,
  reason,
  statusCode: 201
})

