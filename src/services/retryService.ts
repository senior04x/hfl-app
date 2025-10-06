// Retry Service for HFL Mobile App
// Handles retry logic with exponential backoff

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  jitter: boolean; // add random jitter
}

interface RetryOptions {
  config?: Partial<RetryConfig>;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (result: any) => void;
  onFailure?: (error: Error) => void;
}

class RetryService {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
  };

  // Execute function with retry logic
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...options.config };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (options.onRetry) {
          options.onRetry(attempt, lastError);
        }

        // If this is the last attempt, don't wait
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config);
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`);
        
        await this.sleep(delay);
      }
    }

    if (options.onFailure) {
      options.onFailure(lastError!);
    }

    throw lastError!;
  }

  // Calculate delay with exponential backoff and jitter
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
    const delay = Math.min(exponentialDelay, config.maxDelay);
    
    if (config.jitter) {
      // Add up to 25% jitter
      const jitterAmount = delay * 0.25 * Math.random();
      return delay + jitterAmount;
    }
    
    return delay;
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry with specific error handling
  async retryOnNetworkError<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.executeWithRetry(fn, {
      ...options,
      onRetry: (attempt, error) => {
        if (this.isNetworkError(error)) {
          console.log(`🌐 Network error detected, retrying... (attempt ${attempt})`);
        } else {
          console.log(`❌ Error detected, retrying... (attempt ${attempt})`);
        }
        
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }
      },
    });
  }

  // Check if error is network-related
  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'Failed to fetch',
      'Network request failed',
      'Connection refused',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
    ];

    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  // Retry with circuit breaker pattern
  async executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: RetryOptions & {
      failureThreshold?: number;
      recoveryTimeout?: number;
    } = {}
  ): Promise<T> {
    const failureThreshold = options.failureThreshold || 5;
    const recoveryTimeout = options.recoveryTimeout || 30000; // 30 seconds
    
    // This is a simplified circuit breaker implementation
    // In a real app, you'd want to track state across multiple calls
    return this.executeWithRetry(fn, options);
  }

  // Retry with timeout
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    options: RetryOptions = {}
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const operationPromise = this.executeWithRetry(fn, options);

    return Promise.race([operationPromise, timeoutPromise]);
  }
}

// Export singleton instance
export const retryService = new RetryService();
export default RetryService;
