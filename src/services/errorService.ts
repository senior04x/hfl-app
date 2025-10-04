// Error Service for HFL Mobile App
// Handles error management and reporting

interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  timestamp: number;
  context?: any;
  userId?: string;
  screen?: string;
  action?: string;
}

interface ErrorReport {
  id: string;
  error: ErrorInfo;
  resolved: boolean;
  reported: boolean;
  createdAt: number;
  updatedAt: number;
}

class ErrorService {
  private errors: ErrorReport[] = [];
  private maxErrors = 100;

  // Log error
  logError(
    error: Error | string,
    context?: {
      screen?: string;
      action?: string;
      userId?: string;
      additionalData?: any;
    }
  ): void {
    try {
      const errorInfo: ErrorInfo = {
        message: typeof error === 'string' ? error : error.message,
        code: typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
        stack: typeof error === 'object' ? error.stack : undefined,
        timestamp: Date.now(),
        context: context?.additionalData,
        userId: context?.userId,
        screen: context?.screen,
        action: context?.action,
      };

      const errorReport: ErrorReport = {
        id: this.generateErrorId(),
        error: errorInfo,
        resolved: false,
        reported: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.errors.push(errorReport);
      
      // Keep only recent errors
      if (this.errors.length > this.maxErrors) {
        this.errors = this.errors.slice(-this.maxErrors);
      }

      console.error('🚨 Error logged:', errorInfo);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all errors
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // Get unresolved errors
  getUnresolvedErrors(): ErrorReport[] {
    return this.errors.filter(error => !error.resolved);
  }

  // Mark error as resolved
  markErrorResolved(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.updatedAt = Date.now();
    }
  }

  // Mark error as reported
  markErrorReported(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.reported = true;
      error.updatedAt = Date.now();
    }
  }

  // Clear resolved errors
  clearResolvedErrors(): void {
    this.errors = this.errors.filter(error => !error.resolved);
  }

  // Clear all errors
  clearAllErrors(): void {
    this.errors = [];
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    unresolved: number;
    reported: number;
    recent: number; // last 24 hours
  } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      total: this.errors.length,
      unresolved: this.errors.filter(e => !e.resolved).length,
      reported: this.errors.filter(e => e.reported).length,
      recent: this.errors.filter(e => e.createdAt > oneDayAgo).length,
    };
  }

  // Handle API errors
  handleApiError(error: any, context?: any): string {
    let userMessage = 'Noma\'lum xatolik yuz berdi';

    if (error.message) {
      if (error.message.includes('Network request failed')) {
        userMessage = 'Internet aloqasi yo\'q. Internet aloqangizni tekshiring.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Server javob bermayapti. Keyinroq urinib ko\'ring.';
      } else if (error.message.includes('404')) {
        userMessage = 'Ma\'lumot topilmadi.';
      } else if (error.message.includes('500')) {
        userMessage = 'Server xatoligi. Keyinroq urinib ko\'ring.';
      } else if (error.message.includes('403')) {
        userMessage = 'Ruxsat yo\'q.';
      } else if (error.message.includes('401')) {
        userMessage = 'Autentifikatsiya kerak.';
      } else {
        userMessage = error.message;
      }
    }

    this.logError(error, context);
    return userMessage;
  }

  // Handle network errors
  handleNetworkError(error: any, context?: any): string {
    let userMessage = 'Internet aloqasi yo\'q';

    if (error.message) {
      if (error.message.includes('Network request failed')) {
        userMessage = 'Internet aloqasi yo\'q. Internet aloqangizni tekshiring.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Server javob bermayapti. Keyinroq urinib ko\'ring.';
      } else {
        userMessage = error.message;
      }
    }

    this.logError(error, context);
    return userMessage;
  }

  // Handle validation errors
  handleValidationError(error: any, context?: any): string {
    let userMessage = 'Ma\'lumot noto\'g\'ri';

    if (error.message) {
      if (error.message.includes('required')) {
        userMessage = 'Barcha maydonlarni to\'ldiring';
      } else if (error.message.includes('email')) {
        userMessage = 'Email manzili noto\'g\'ri';
      } else if (error.message.includes('phone')) {
        userMessage = 'Telefon raqami noto\'g\'ri';
      } else if (error.message.includes('password')) {
        userMessage = 'Parol noto\'g\'ri';
      } else {
        userMessage = error.message;
      }
    }

    this.logError(error, context);
    return userMessage;
  }

  // Handle authentication errors
  handleAuthError(error: any, context?: any): string {
    let userMessage = 'Autentifikatsiya xatoligi';

    if (error.message) {
      if (error.message.includes('invalid-credential')) {
        userMessage = 'Login yoki parol noto\'g\'ri';
      } else if (error.message.includes('user-not-found')) {
        userMessage = 'Foydalanuvchi topilmadi';
      } else if (error.message.includes('email-already-in-use')) {
        userMessage = 'Bu email allaqachon ishlatilgan';
      } else if (error.message.includes('weak-password')) {
        userMessage = 'Parol juda zaif';
      } else if (error.message.includes('too-many-requests')) {
        userMessage = 'Juda ko\'p urinish. Keyinroq urinib ko\'ring.';
      } else {
        userMessage = error.message;
      }
    }

    this.logError(error, context);
    return userMessage;
  }

  // Create error boundary handler
  createErrorBoundaryHandler(screen: string) {
    return (error: Error, errorInfo: any) => {
      this.logError(error, {
        screen,
        action: 'error_boundary',
        additionalData: errorInfo,
      });
    };
  }

  // Report errors to server (optional)
  async reportErrorsToServer(): Promise<void> {
    try {
      const unreportedErrors = this.errors.filter(e => !e.reported);
      
      if (unreportedErrors.length === 0) return;

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiBaseUrl}/api/errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: unreportedErrors,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        // Mark errors as reported
        unreportedErrors.forEach(error => {
          this.markErrorReported(error.id);
        });
        console.log('✅ Errors reported to server');
      }
    } catch (error) {
      console.error('Failed to report errors to server:', error);
    }
  }
}

// Export singleton instance
export const errorService = new ErrorService();
export default ErrorService;
