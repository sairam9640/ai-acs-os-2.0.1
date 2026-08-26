export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before tripping
  cooldownMs?: number; // Time in OPEN state before testing HALF_OPEN
  successThreshold?: number; // Successes in HALF_OPEN to reset to CLOSED
}

export class CircuitBreaker {
  public name: string;
  public state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private successThreshold: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 30000;
    this.successThreshold = options.successThreshold || 2;
  }

  /**
   * Executes a command through the circuit breaker
   */
  async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        if (fallback) return fallback();
        throw new Error(`CircuitBreaker [${this.name}] is OPEN. Fast-failing request.`);
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
    };
  }
}

// Registry of Circuit Breakers for external gateways
export const CircuitBreakerRegistry = {
  whatsappGateway: new CircuitBreaker('WhatsAppCloudAPI', { failureThreshold: 5, cooldownMs: 30000 }),
  smsGateway: new CircuitBreaker('SmsProviderAPI', { failureThreshold: 5, cooldownMs: 30000 }),
  acsRpcGateway: new CircuitBreaker('RemoteAcsConnectionRequest', { failureThreshold: 3, cooldownMs: 15000 }),
};
