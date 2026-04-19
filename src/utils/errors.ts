/**
 * Standardized error object for the application.
 */
export interface AppError {
  message: string;
  code?: string;
  originalError?: any;
}

/**
 * Handles and logs errors, returning a standardized AppError.
 * @param error The caught error
 * @param customMessage Optional custom message
 * @returns AppError
 */
export const handleError = (error: any, customMessage?: string): AppError => {
  console.error('Application Error:', error);
  
  return {
    message: customMessage || error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR',
    originalError: error
  };
};

/**
 * Type guard to check if an object is an AppError.
 * @param error 
 * @returns boolean
 */
export const isAppError = (error: any): error is AppError => {
  return error && typeof error.message === 'string';
};
