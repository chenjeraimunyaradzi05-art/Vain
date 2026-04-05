/**
 * Metrics Utility Unit Tests
 */

// Mock metrics module
const createMockMetrics = () => {
  const metrics = {
    requests: {
      total: 0,
      byMethod: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byPath: {} as Record<string, number>,
    },
    latency: {
      sum: 0,
      count: 0,
    },
    errors: {
      total: 0,
      byType: {} as Record<string, number>,
    },
    activeRequests: 0,
  };

  return {
    incrementRequest: (method: string, path: string) => {
      metrics.requests.total++;
      metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
      metrics.requests.byPath[path] = (metrics.requests.byPath[path] || 0) + 1;
      metrics.activeRequests++;
    },

    recordResponse: (status: number, latencyMs: number) => {
      metrics.requests.byStatus[status.toString()] = 
        (metrics.requests.byStatus[status.toString()] || 0) + 1;
      metrics.latency.sum += latencyMs;
      metrics.latency.count++;
      metrics.activeRequests--;
      
      if (status >= 400) {
        metrics.errors.total++;
        const errorType = status >= 500 ? 'server' : 'client';
        metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
      }
    },

    getMetrics: () => ({
      requests: { ...metrics.requests },
      latency: {
        mean: metrics.latency.count > 0 ? metrics.latency.sum / metrics.latency.count : 0,
      },
      errors: { ...metrics.errors },
      activeRequests: metrics.activeRequests,
    }),

    reset: () => {
      metrics.requests = { total: 0, byMethod: {}, byStatus: {}, byPath: {} };
      metrics.latency = { sum: 0, count: 0 };
      metrics.errors = { total: 0, byType: {} };
      metrics.activeRequests = 0;
    },

    getHealthStatus: () => {
      const errorRate = metrics.requests.total > 0 
        ? (metrics.errors.total / metrics.requests.total) * 100 
        : 0;
      const avgLatency = metrics.latency.count > 0 
        ? metrics.latency.sum / metrics.latency.count 
        : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (errorRate > 10 || avgLatency > 2000) status = 'unhealthy';
      else if (errorRate > 5 || avgLatency > 500) status = 'degraded';

      return { status, errorRate, avgLatency };
    },
  };
};

describe('Metrics Utility', () => {
  let mockMetrics: ReturnType<typeof createMockMetrics>;

  beforeEach(() => {
    mockMetrics = createMockMetrics();
  });

  describe('Request Counting', () => {
    it('should count total requests', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('POST', '/api/applications');
      mockMetrics.incrementRequest('GET', '/api/jobs');

      const metrics = mockMetrics.getMetrics();
      expect(metrics.requests.total).toBe(3);
    });

    it('should count requests by method', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('POST', '/api/applications');
      mockMetrics.incrementRequest('DELETE', '/api/users/1');

      const metrics = mockMetrics.getMetrics();
      expect(metrics.requests.byMethod['GET']).toBe(2);
      expect(metrics.requests.byMethod['POST']).toBe(1);
      expect(metrics.requests.byMethod['DELETE']).toBe(1);
    });

    it('should count requests by path', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('GET', '/api/users');

      const metrics = mockMetrics.getMetrics();
      expect(metrics.requests.byPath['/api/jobs']).toBe(2);
      expect(metrics.requests.byPath['/api/users']).toBe(1);
    });
  });

  describe('Response Tracking', () => {
    it('should count responses by status code', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 50);
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 45);
      mockMetrics.incrementRequest('POST', '/api/invalid');
      mockMetrics.recordResponse(400, 10);

      const metrics = mockMetrics.getMetrics();
      expect(metrics.requests.byStatus['200']).toBe(2);
      expect(metrics.requests.byStatus['400']).toBe(1);
    });

    it('should track active requests', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.incrementRequest('GET', '/api/users');
      
      let metrics = mockMetrics.getMetrics();
      expect(metrics.activeRequests).toBe(2);

      mockMetrics.recordResponse(200, 50);
      
      metrics = mockMetrics.getMetrics();
      expect(metrics.activeRequests).toBe(1);
    });
  });

  describe('Latency Tracking', () => {
    it('should calculate mean latency', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 100);
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 200);
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 300);

      const metrics = mockMetrics.getMetrics();
      expect(metrics.latency.mean).toBe(200);
    });

    it('should handle zero requests', () => {
      const metrics = mockMetrics.getMetrics();
      expect(metrics.latency.mean).toBe(0);
    });
  });

  describe('Error Tracking', () => {
    it('should count total errors', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 50);
      mockMetrics.incrementRequest('POST', '/api/invalid');
      mockMetrics.recordResponse(400, 10);
      mockMetrics.incrementRequest('GET', '/api/error');
      mockMetrics.recordResponse(500, 5);

      const metrics = mockMetrics.getMetrics();
      expect(metrics.errors.total).toBe(2);
    });

    it('should categorize errors by type', () => {
      mockMetrics.incrementRequest('POST', '/api/invalid');
      mockMetrics.recordResponse(400, 10);
      mockMetrics.incrementRequest('GET', '/api/notfound');
      mockMetrics.recordResponse(404, 10);
      mockMetrics.incrementRequest('GET', '/api/error');
      mockMetrics.recordResponse(500, 5);
      mockMetrics.incrementRequest('GET', '/api/timeout');
      mockMetrics.recordResponse(503, 5);

      const metrics = mockMetrics.getMetrics();
      expect(metrics.errors.byType['client']).toBe(2);
      expect(metrics.errors.byType['server']).toBe(2);
    });
  });

  describe('Health Status', () => {
    it('should report healthy status', () => {
      for (let i = 0; i < 100; i++) {
        mockMetrics.incrementRequest('GET', '/api/jobs');
        mockMetrics.recordResponse(200, 100);
      }

      const health = mockMetrics.getHealthStatus();
      expect(health.status).toBe('healthy');
    });

    it('should report degraded status on high latency', () => {
      for (let i = 0; i < 100; i++) {
        mockMetrics.incrementRequest('GET', '/api/jobs');
        mockMetrics.recordResponse(200, 600); // 600ms average
      }

      const health = mockMetrics.getHealthStatus();
      expect(health.status).toBe('degraded');
    });

    it('should report degraded status on moderate error rate', () => {
      for (let i = 0; i < 94; i++) {
        mockMetrics.incrementRequest('GET', '/api/jobs');
        mockMetrics.recordResponse(200, 50);
      }
      for (let i = 0; i < 6; i++) {
        mockMetrics.incrementRequest('GET', '/api/error');
        mockMetrics.recordResponse(500, 5);
      }

      const health = mockMetrics.getHealthStatus();
      expect(health.status).toBe('degraded');
      expect(health.errorRate).toBe(6);
    });

    it('should report unhealthy status on high error rate', () => {
      for (let i = 0; i < 85; i++) {
        mockMetrics.incrementRequest('GET', '/api/jobs');
        mockMetrics.recordResponse(200, 50);
      }
      for (let i = 0; i < 15; i++) {
        mockMetrics.incrementRequest('GET', '/api/error');
        mockMetrics.recordResponse(500, 5);
      }

      const health = mockMetrics.getHealthStatus();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      mockMetrics.incrementRequest('GET', '/api/jobs');
      mockMetrics.recordResponse(200, 100);
      mockMetrics.incrementRequest('POST', '/api/error');
      mockMetrics.recordResponse(500, 5);

      mockMetrics.reset();

      const metrics = mockMetrics.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.latency.mean).toBe(0);
      expect(metrics.errors.total).toBe(0);
    });
  });
});
