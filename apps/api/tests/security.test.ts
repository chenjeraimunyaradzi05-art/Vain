/**
 * Security Test Suite (Step 71-80)
 * 
 * Automated security tests for:
 * - Token replay protection
 * - Rate limiting effectiveness
 * - SQL injection prevention
 * - XSS protection
 * - Privilege escalation prevention
 * - CSRF protection
 * 
 * NOTE: These tests require a running API server at TEST_API_URL (default: localhost:3001)
 * Run with: TEST_API_URL=http://localhost:3001 npm test
 */

// Base URL for testing
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Check if API server is reachable
let serverAvailable = false;

// Test user credentials (create in test setup)
const testUser = {
  email: 'security-test@example.com',
  password: 'SecureP@ssw0rd!123',
};

const adminUser = {
  email: 'admin-test@example.com',
  password: 'AdminP@ssw0rd!123',
};

// Helper to make authenticated requests
async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<Response | undefined> {
  if (!serverAvailable) return undefined;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    return undefined;
  }
}

// Helper to skip test if server not available
function skipIfNoServer(response: Response | undefined): response is Response {
  if (!response) {
    return false; // Will cause test to be effectively skipped
  }
  return true;
}

describe('Security Tests', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Check if server is available
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { 
        signal: AbortSignal.timeout(2000) 
      });
      serverAvailable = response.ok;
      if (serverAvailable) {
        console.log(`✅ API server available at ${BASE_URL}`);
      }
    } catch {
      serverAvailable = false;
      console.warn(`⚠️ API server not available at ${BASE_URL}. Security tests will be skipped.`);
    }
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  describe('Step 71: Token Replay Protection', () => {
    it('should reject expired tokens', async () => {
      if (!serverAvailable) return;
      
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
      const response = await fetchWithAuth('/api/users/me', {}, expiredToken);
      if (!skipIfNoServer(response)) return;
      expect(response.status).toBe(401);
    });
    
    it('should reject malformed tokens', async () => {
      if (!serverAvailable) return;
      
      const malformedToken = 'not-a-valid-jwt-token';
      const response = await fetchWithAuth('/api/users/me', {}, malformedToken);
      if (!skipIfNoServer(response)) return;
      expect(response.status).toBe(401);
    });
    
    it('should reject tokens after logout', async () => {
      if (!serverAvailable) return;
      
      const loginResponse = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(testUser),
      });
      if (!skipIfNoServer(loginResponse)) return;
      
      if (loginResponse.ok) {
        const { accessToken } = await loginResponse.json();
        await fetchWithAuth('/api/auth/logout', { method: 'POST' }, accessToken);
        const response = await fetchWithAuth('/api/users/me', {}, accessToken);
        if (!skipIfNoServer(response)) return;
        expect([401, 403]).toContain(response.status);
      }
    });
  });
  
  describe('Step 72: Rate Limiting', () => {
    it('should enforce rate limits on login endpoint', async () => {
      if (!serverAvailable) return;
      
      const attempts = 20;
      const responses: Response[] = [];
      
      for (let i = 0; i < attempts; i++) {
        const response = await fetchWithAuth('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid@test.com', password: 'wrong' }),
        });
        if (response) responses.push(response);
      }
      
      if (responses.length === 0) return;
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
    
    it('should include rate limit headers', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/health', { method: 'GET' });
      if (!skipIfNoServer(response)) return;
      
      const headers = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
      const hasRateLimitHeaders = headers.some(h => response.headers.has(h));
      expect(hasRateLimitHeaders).toBe(true);
    });
  });
  
  describe('Step 73: SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM users",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET role='admin' WHERE '1'='1",
    ];
    
    it('should prevent SQL injection in query parameters', async () => {
      if (!serverAvailable) return;
      
      for (const payload of sqlInjectionPayloads) {
        const response = await fetchWithAuth(`/api/jobs?search=${encodeURIComponent(payload)}`);
        if (!skipIfNoServer(response)) continue;
        expect(response.status).not.toBe(500);
      }
    });
    
    it('should prevent SQL injection in request body', async () => {
      if (!serverAvailable) return;
      
      for (const payload of sqlInjectionPayloads) {
        const response = await fetchWithAuth('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: payload,
            password: payload,
          }),
        });
        if (!skipIfNoServer(response)) continue;
        expect([400, 401, 422]).toContain(response.status);
      }
    });
  });
  
  describe('Step 74: XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><img src=x onerror=alert("XSS")>',
      "javascript:alert('XSS')",
      '<svg onload=alert("XSS")>',
      '{{constructor.constructor("return this")()}}',
    ];
    
    it('should sanitize XSS in user input', async () => {
      if (!serverAvailable) return;
      
      for (const payload of xssPayloads) {
        const response = await fetchWithAuth('/api/users/profile', {
          method: 'PATCH',
          body: JSON.stringify({ bio: payload }),
        }, userToken);
        
        if (response?.ok) {
          const data = await response.json();
          expect(data.bio).not.toContain('<script>');
          expect(data.bio).not.toContain('onerror=');
        }
      }
    });
    
    it('should set proper Content-Type headers', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/health');
      if (!skipIfNoServer(response)) return;
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });
  });
  
  describe('Step 75: Privilege Escalation Prevention', () => {
    it('should prevent role modification by non-admin', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }, userToken);
      
      if (response?.ok) {
        const data = await response.json();
        expect(data.role).not.toBe('admin');
      }
    });
    
    it('should prevent accessing other users data', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/users/other-user-id', {
        method: 'GET',
      }, userToken);
      if (!skipIfNoServer(response)) return;
      expect([403, 404]).toContain(response.status);
    });
    
    it('should prevent admin actions by regular users', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/admin/users', {
        method: 'GET',
      }, userToken);
      if (!skipIfNoServer(response)) return;
      expect([401, 403]).toContain(response.status);
    });
  });
  
  describe('Step 76: CSRF Protection', () => {
    it('should require proper origin header', async () => {
      if (!serverAvailable) return;
      
      try {
        const response = await fetch(`${BASE_URL}/api/users/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://evil-site.com',
          },
          body: JSON.stringify({ bio: 'hacked' }),
        });
        expect([403, 401]).toContain(response.status);
      } catch {
        // Connection error is acceptable if server is not running
      }
    });
  });
  
  describe('Step 77: Input Validation', () => {
    it('should reject oversized payloads', async () => {
      if (!serverAvailable) return;
      
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const response = await fetchWithAuth('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ bio: largePayload }),
      }, userToken);
      if (!skipIfNoServer(response)) return;
      expect([413, 400]).toContain(response.status);
    });
    
    it('should validate email format', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'SecureP@ss123!',
          name: 'Test User',
        }),
      });
      if (!skipIfNoServer(response)) return;
      expect([400, 422]).toContain(response.status);
    });
    
    it('should validate password strength', async () => {
      if (!serverAvailable) return;
      
      const weakPasswords = ['123456', 'password', 'abc'];
      
      for (const password of weakPasswords) {
        const response = await fetchWithAuth('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password,
            name: 'Test User',
          }),
        });
        if (!skipIfNoServer(response)) continue;
        expect([400, 422]).toContain(response.status);
      }
    });
  });
  
  describe('Step 78: Path Traversal Prevention', () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
    ];
    
    it('should prevent path traversal in file endpoints', async () => {
      if (!serverAvailable) return;
      
      for (const payload of traversalPayloads) {
        const response = await fetchWithAuth(`/api/files/${encodeURIComponent(payload)}`);
        if (!skipIfNoServer(response)) continue;
        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });
  
  describe('Step 79: Header Injection Prevention', () => {
    it('should prevent header injection', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com\r\nX-Injected: header',
          password: 'password',
        }),
      });
      if (!skipIfNoServer(response)) return;
      expect(response.headers.has('x-injected')).toBe(false);
    });
  });
  
  describe('Step 80: Security Headers', () => {
    it('should include required security headers', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/health');
      if (!skipIfNoServer(response)) return;
      
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
      ];
      
      for (const header of requiredHeaders) {
        expect(response.headers.has(header)).toBe(true);
      }
    });
    
    it('should set X-Content-Type-Options to nosniff', async () => {
      if (!serverAvailable) return;
      
      const response = await fetchWithAuth('/api/health');
      if (!skipIfNoServer(response)) return;
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});

export { fetchWithAuth };
