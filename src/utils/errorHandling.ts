import { Alert } from 'react-native';

export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  additionalData?: any;
}

export class ErrorHandler {
  static handle(error: unknown, context?: ErrorContext): string {
    console.error('Error occurred:', error, context);
    
    let userMessage = 'Noma\'lum xatolik yuz berdi';
    
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch')) {
        userMessage = 'Internet aloqasi yo\'q. Iltimos, internetni tekshiring.';
      }
      // API errors
      else if (error.message.includes('API')) {
        userMessage = 'Server bilan bog\'lanishda xatolik. Iltimos, keyinroq urinib ko\'ring.';
      }
      // Validation errors
      else if (error.message.includes('required') || error.message.includes('invalid')) {
        userMessage = error.message;
      }
      // Timeout errors
      else if (error.message.includes('timeout')) {
        userMessage = 'So\'rov vaqti tugadi. Iltimos, qayta urinib ko\'ring.';
      }
      // Default error message
      else {
        userMessage = error.message;
      }
    }
    
    // Show error alert
    Alert.alert('Xatolik', userMessage);
    
    return userMessage;
  }
  
  static handleApiError(error: any, context?: ErrorContext): string {
    console.error('API Error:', error, context);
    
    let userMessage = 'Server xatoligi';
    
    if (error?.response?.data?.error) {
      userMessage = error.response.data.error;
    } else if (error?.message) {
      userMessage = error.message;
    }
    
    Alert.alert('Server Xatoligi', userMessage);
    return userMessage;
  }
  
  static handleNetworkError(error: any, context?: ErrorContext): string {
    console.error('Network Error:', error, context);
    
    const userMessage = 'Internet aloqasi yo\'q. Iltimos, internetni tekshiring.';
    Alert.alert('Internet Xatoligi', userMessage);
    
    return userMessage;
  }
  
  static handleValidationError(error: any, context?: ErrorContext): string {
    console.error('Validation Error:', error, context);
    
    let userMessage = 'Ma\'lumot noto\'g\'ri';
    
    if (error?.message) {
      userMessage = error.message;
    }
    
    Alert.alert('Ma\'lumot Xatoligi', userMessage);
    return userMessage;
  }
  
  static handleAuthError(error: any, context?: ErrorContext): string {
    console.error('Auth Error:', error, context);
    
    let userMessage = 'Autentifikatsiya xatoligi';
    
    if (error?.message?.includes('auth')) {
      userMessage = 'Login yoki parol noto\'g\'ri';
    } else if (error?.message?.includes('permission')) {
      userMessage = 'Ruxsat yo\'q';
    }
    
    Alert.alert('Autentifikatsiya Xatoligi', userMessage);
    return userMessage;
  }
}

export const handleError = ErrorHandler.handle;
export const handleApiError = ErrorHandler.handleApiError;
export const handleNetworkError = ErrorHandler.handleNetworkError;
export const handleValidationError = ErrorHandler.handleValidationError;
export const handleAuthError = ErrorHandler.handleAuthError;
