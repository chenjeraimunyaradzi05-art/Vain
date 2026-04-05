/**
 * Retry Utilities
 * 
 * Provides retry logic with exponential backoff for external service calls.
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Initial delay between retries in milliseconds */
  initialDelay?: number;
  
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  
  /** Add random jitter to prevent thundering herd */
  jitter?: boolean;
  
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  
  /** Callback called on each retry */
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: () => true,
  onRetry: () => {},
};

/**
 * Calculate delay for given attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean
): number {
  let delay = initialDelay * Math.pow(multiplier, attempt - 1);
  delay = Math.min(delay, maxDelay);
  
  if (jitter) {
    // Add up to 25% random jitter
    delay = delay * (0.75 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Execute an async operation with retry logic
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt > opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!opts.isRetryable(error)) {
        throw error;
      }

      // Calculate delay with backoff
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier,
        opts.jitter
      );

      // Log retry attempt
      logger.warn('Operation failed, retrying', {
        attempt,
        maxRetries: opts.maxRetries,
        delay,
        error: error.message,
      });

      // Call retry callback
      opts.onRetry(error, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 */
export function withRetry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retry(() => fn(...args), options);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Common retryable error checks
 */
export const retryableErrors = {
  /** Network-related errors */
  isNetworkError: (error: Error): boolean => {
    const networkCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    return networkCodes.includes((error as any).code);
  },

  /** HTTP 5xx errors */
  isServerError: (error: Error): boolean => {
    const status = (error as any).status || (error as any).statusCode;
    return typeof status === 'number' && status >= 500 && status < 600;
  },

  /** Rate limit errors (429) */
  isRateLimitError: (error: Error): boolean => {
    const status = (error as any).status || (error as any).statusCode;
    return status === 429;
  },

  /** Combined check for common retryable errors */
  isRetryable: (error: Error): boolean => {
    return (
      retryableErrors.isNetworkError(error) ||
      retryableErrors.isServerError(error) ||
      retryableErrors.isRateLimitError(error)
    );
  },
};

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly options: {
      failureThreshold: number;
      resetTimeout: number;
      onStateChange?: (state: 'closed' | 'open' | 'half-open') => void;
    }
  ) {}

  private setState(state: 'closed' | 'open' | 'half-open'): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onStateChange?.(state);
      logger.info('Circuit breaker state changed', { state });
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.lastFailure || 0);
      
      if (timeSinceLastFailure < this.options.resetTimeout) {
        throw new Error('Circuit breaker is open');
      }
      
      // Try half-open state
      this.setState('half-open');
    }

    try {
      const result = await operation();
      
      // Success - reset circuit
      if (this.state === 'half-open') {
        this.failures = 0;
        this.setState('closed');
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.options.failureThreshold) {
        this.setState('open');
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailure = null;
    this.setState('closed');
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Batch operations with concurrency limit
 */
export async function batchWithConcurrency<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = operation(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const p = executing[i];
        if (await Promise.race([p, Promise.resolve('pending')]) !== 'pending') {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

export {};
