/**
 * Load Testing Configuration
 * 
 * k6 load testing script for API performance testing
 * 
 * Usage:
 *   k6 run apps/api/tests/load/load-test.js
 *   k6 run --vus 50 --duration 30s apps/api/tests/load/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const requestCounter = new Counter('requests');

// Test configuration
export const options = {
  // Stages define ramp-up/ramp-down patterns
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],

  // Thresholds define pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'], // 95% < 500ms, 99% < 1500ms
    http_req_failed: ['rate<0.05'], // Less than 5% errors
    errors: ['rate<0.1'], // Less than 10% custom errors
  },

  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// Environment configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'Test123!' },
  { email: 'loadtest2@example.com', password: 'Test123!' },
  { email: 'loadtest3@example.com', password: 'Test123!' },
];

// Helper functions
function randomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function apiUrl(path) {
  return `${BASE_URL}/api/${API_VERSION}${path}`;
}

function defaultHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Setup function - runs once before test
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Verify API is available
  const healthCheck = http.get(`${BASE_URL}/api/${API_VERSION}/health/live`);
  check(healthCheck, {
    'API is healthy': (r) => r.status === 200,
  });

  if (healthCheck.status !== 200) {
    throw new Error('API health check failed - aborting test');
  }

  return { startTime: Date.now() };
}

// Main test function - runs for each virtual user
export default function (data) {
  // Health check
  group('Health Check', function () {
    const res = http.get(apiUrl('/health/live'));
    requestCounter.add(1);
    requestDuration.add(res.timings.duration);
    
    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    errorRate.add(!success);
  });

  sleep(0.5);

  // Public endpoints - Jobs listing
  group('Public Jobs Listing', function () {
    const res = http.get(apiUrl('/jobs?page=1&limit=20'), {
      headers: defaultHeaders(),
    });
    requestCounter.add(1);
    requestDuration.add(res.timings.duration);
    
    const success = check(res, {
      'jobs listing status is 200': (r) => r.status === 200,
      'jobs listing response time < 500ms': (r) => r.timings.duration < 500,
      'jobs listing has data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data);
      },
    });
    
    errorRate.add(!success);
  });

  sleep(0.3);

  // Authentication flow
  group('Authentication', function () {
    const user = randomUser();
    
    // Login
    const loginRes = http.post(
      apiUrl('/auth/login'),
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: defaultHeaders() }
    );
    requestCounter.add(1);
    requestDuration.add(loginRes.timings.duration);
    
    const loginSuccess = check(loginRes, {
      'login status is 200 or 401': (r) => [200, 401].includes(r.status),
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!loginSuccess);
    
    // If login succeeded, do authenticated requests
    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      const token = body.token || body.data?.token;
      
      if (token) {
        // Get profile
        const profileRes = http.get(apiUrl('/users/me'), {
          headers: defaultHeaders(token),
        });
        requestCounter.add(1);
        requestDuration.add(profileRes.timings.duration);
        
        check(profileRes, {
          'profile status is 200': (r) => r.status === 200,
          'profile response time < 300ms': (r) => r.timings.duration < 300,
        });
      }
    }
  });

  sleep(0.5);

  // Job search
  group('Job Search', function () {
    const searchTerms = ['developer', 'manager', 'analyst', 'engineer', 'designer'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    const res = http.get(apiUrl(`/jobs?search=${term}&page=1&limit=10`), {
      headers: defaultHeaders(),
    });
    requestCounter.add(1);
    requestDuration.add(res.timings.duration);
    
    const success = check(res, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    errorRate.add(!success);
  });

  sleep(0.5);

  // Single job view
  group('Single Job View', function () {
    // First get job list
    const listRes = http.get(apiUrl('/jobs?limit=5'), {
      headers: defaultHeaders(),
    });
    
    if (listRes.status === 200) {
      const body = JSON.parse(listRes.body);
      if (body.data && body.data.length > 0) {
        const jobId = body.data[Math.floor(Math.random() * body.data.length)].id;
        
        const res = http.get(apiUrl(`/jobs/${jobId}`), {
          headers: defaultHeaders(),
        });
        requestCounter.add(1);
        requestDuration.add(res.timings.duration);
        
        const success = check(res, {
          'job detail status is 200': (r) => r.status === 200,
          'job detail response time < 300ms': (r) => r.timings.duration < 300,
        });
        
        errorRate.add(!success);
      }
    }
  });

  sleep(1);
}

// Teardown function - runs once after test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

// Text summary helper (k6 doesn't have this built-in for all outputs)
function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  let output = '';
  
  output += `${indent}============================================\n`;
  output += `${indent}  LOAD TEST RESULTS\n`;
  output += `${indent}============================================\n\n`;
  
  // Request metrics
  if (data.metrics.http_req_duration) {
    output += `${indent}HTTP Request Duration:\n`;
    output += `${indent}  avg: ${data.metrics.http_req_duration.values.avg?.toFixed(2)}ms\n`;
    output += `${indent}  p95: ${data.metrics.http_req_duration.values['p(95)']?.toFixed(2)}ms\n`;
    output += `${indent}  p99: ${data.metrics.http_req_duration.values['p(99)']?.toFixed(2)}ms\n\n`;
  }
  
  // Error rate
  if (data.metrics.http_req_failed) {
    output += `${indent}Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // Iteration count
  if (data.metrics.iterations) {
    output += `${indent}Total Iterations: ${data.metrics.iterations.values.count}\n`;
  }
  
  output += `${indent}============================================\n`;
  
  return output;
}
