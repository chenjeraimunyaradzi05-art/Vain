/**
 * Circuit Breaker Implementation (Step 51)
 * 
 * Prevents cascading failures when external services are down.
 * Automatically opens circuit after threshold failures.
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  name?: string;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextRetry?: Date;
  private totalRequests = 0;
  private totalFailures = 0;
  
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly name: string;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;
  
  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 30000; // 30 seconds default
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds default
    this.name = options.name ?? 'default';
    this.onStateChange = options.onStateChange;
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    
    if (this.state === 'OPEN') {
      // Check if we should try again
      if (this.nextRetry && new Date() > this.nextRetry) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitOpenError(
          `Circuit breaker [${this.name}] is OPEN. Service temporarily unavailable.`,
          this.nextRetry
        );
      }
    }
    
    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        ),
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      
      if (this.successes >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }
  
  private onFailure(error: any): void {
    this.lastFailure = new Date();
    this.failures++;
    this.totalFailures++;
    this.successes = 0;
    
    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }
  
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === 'OPEN') {
      this.nextRetry = new Date(Date.now() + this.resetTimeout);
    } else if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
      this.nextRetry = undefined;
    }
    
    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
    
    console.log(`Circuit breaker [${this.name}] state: ${oldState} -> ${newState}`);
  }
  
  getStats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      state: this.state,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  isOpen(): boolean {
    return this.state === 'OPEN';
  }
  
  reset(): void {
    this.transitionTo('CLOSED');
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string, public readonly retryAfter?: Date) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
  stripe: new CircuitBreaker({ name: 'stripe', failureThreshold: 3, resetTimeout: 60000 }),
  ses: new CircuitBreaker({ name: 'ses', failureThreshold: 5, resetTimeout: 30000 }),
  s3: new CircuitBreaker({ name: 's3', failureThreshold: 3, resetTimeout: 30000 }),
  openai: new CircuitBreaker({ name: 'openai', failureThreshold: 3, resetTimeout: 60000 }),
};

export default CircuitBreaker;

export {};
