/**
 * Comprehensive Test Configuration
 * 
 * This file contains all test configurations and settings for the Vantage platform.
 */

module.exports = {
  // Test environments
  environments: {
    development: {
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/vantage_dev',
        migrations: 'prisma/migrate dev',
        seed: 'prisma/seed.js'
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      s3: {
        endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin123',
        bucket: process.env.AWS_S3_BUCKET || 'vantage-dev'
      }
    },
    test: {
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/vantage_test',
        migrations: 'prisma migrate deploy',
        seed: null
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6380'
      },
      s3: {
        endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9001',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin123',
        bucket: process.env.AWS_S3_BUCKET || 'vantage-test'
      }
    },
    ci: {
      database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres-test:5432/vantage_test',
        migrations: 'prisma migrate deploy',
        seed: null
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://redis-test:6379'
      },
      s3: {
        endpoint: process.env.AWS_S3_ENDPOINT || 'http://minio-test:9000',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin123',
        bucket: process.env.AWS_S3_BUCKET || 'vantage-test'
      }
    }
  },

  // Test configurations
  tests: {
    // Unit tests
    unit: {
      timeout: 30000,
      retries: 0,
      parallel: true,
      coverage: true,
      reporters: ['text', 'junit'],
      testMatch: [
        '**/*.unit.test.{js,ts,jsx,tsx}',
        '**/unit/**/*.test.{js,ts,jsx,tsx}'
      ],
      testIgnore: [
        'node_modules',
        'dist',
        'build',
        '.next'
      ]
    },

    // Integration tests
    integration: {
      timeout: 60000,
      retries: 1,
      parallel: false,
      coverage: false,
      reporters: ['text', 'junit'],
      testMatch: [
        '**/*.integration.test.{js,ts}',
        '**/integration/**/*.test.{js,ts}'
      ],
      setupFiles: [
        'src/tests/setup.ts'
      ],
      globalSetup: 'src/tests/global-setup.ts',
      globalTeardown: 'src/tests/global-teardown.ts'
    },

    // E2E tests
    e2e: {
      timeout: 120000,
      retries: 2,
      parallel: false,
      coverage: false,
      reporters: ['html', 'junit'],
      testMatch: [
        '**/*.e2e.test.{js,ts}',
        '**/e2e/**/*.test.{js,ts}'
      ],
      use: {
        browser: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
      }
    },

    // Performance tests
    performance: {
      timeout: 300000,
      retries: 0,
      parallel: false,
      coverage: false,
      reporters: ['text'],
      testMatch: [
        '**/*.performance.test.{js,ts}',
        '**/performance/**/*.test.{js,ts}'
      ]
    },

    // Load tests
    load: {
      timeout: 600000,
      retries: 0,
      parallel: false,
      coverage: false,
      reporters: ['text'],
      config: 'tests/load/artillery.yml'
    }
  },

  // Coverage configuration
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    reportsDirectory: './coverage',
    include: [
      'src/**/*.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'src/**/*.d.ts',
      'src/types/**',
      'src/**/*.test.{js,ts,jsx,tsx}',
      'src/**/*.spec.{js,ts,jsx,tsx}',
      'src/index.ts',
      'dist/**',
      'node_modules/**'
    ],
    thresholds: {
      global: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      },
      // Lower thresholds for new modules
      newModules: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50
      }
    },
    watermarks: {
      statements: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      lines: [50, 80]
    }
  },

  // Linting configuration
  linting: {
    rules: {
      // Enable all recommended rules
      'recommended': true,
      // Additional rules for test files
      'test-environment': true,
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    ignorePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**'
    ]
  },

  // Type checking configuration
  typecheck: {
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    forceConsistentCasingInFileNames: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: 'node',
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: 'preserve',
    incremental: true,
    tsBuildInfoFile: '.tsbuildinfo'
  },

  // Mock configuration
  mocks: {
    // Database mocks
    prisma: {
      client: true,
      operations: ['find', 'create', 'update', 'delete', 'count', 'groupBy', 'aggregate']
    },
    // External service mocks
    redis: true,
    email: true,
    fileUpload: true,
    payment: true,
    analytics: true
  },

  // Test data factories
  factories: {
    user: {
      default: {
        email: 'test@example.com',
        userType: 'MEMBER',
        firstName: 'Test',
        lastName: 'User',
        password: 'TestPassword123!'
      },
      admin: {
        userType: 'ADMIN',
        email: 'admin@example.com'
      },
      company: {
        userType: 'COMPANY',
        email: 'company@example.com'
      }
    },
    job: {
      default: {
        title: 'Test Job',
        description: 'A test job for testing',
        location: 'Test Location',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        salaryMin: 50000,
        salaryMax: 80000
      }
    },
    application: {
      default: {
        status: 'SUBMITTED',
        coverLetter: 'Test cover letter'
      }
    }
  },

  // CI/CD configuration
  ci: {
    // GitHub Actions
    github: {
      workflows: [
        'ci.yml',
        'deploy.yml',
        'security.yml'
      ],
      secrets: [
        'DATABASE_URL',
        'REDIS_URL',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'JWT_SECRET',
        'SES_ACCESS_KEY',
        'SES_SECRET_KEY'
      ]
    },
    // Docker
    docker: {
      compose: 'docker-compose.test.yml',
      images: [
        'postgres:15',
        'redis:7-alpine',
        'minio/minio:latest'
      ]
    },
    // Artifacts
    artifacts: {
      coverage: {
        path: 'coverage',
        retention: '30 days'
      },
      testResults: {
        path: 'test-results',
        retention: '30 days'
      },
      reports: {
        path: 'reports',
        retention: '30 days'
      }
    }
  },

  // Monitoring and reporting
  monitoring: {
    // Test metrics
    metrics: {
      duration: true,
      memory: true,
      cpu: true,
      network: true
    },
    // Alerting
    alerts: {
      failureThreshold: 5,
      durationThreshold: 300000, // 5 minutes
      memoryThreshold: 512 * 1024 * 1024, // 512MB
      cpuThreshold: 80 // 80%
    },
    // Reporting
    reports: {
      formats: ['html', 'json', 'junit'],
      include: ['summary', 'details', 'coverage', 'performance'],
      destination: 'reports'
    }
  },

  // Security testing
  security: {
    // OWASP ZAP integration
    zap: {
      enabled: true,
      scanType: 'baseline',
      target: 'http://localhost:3333',
      reportFormat: 'html'
    },
    // Dependency scanning
    dependencies: {
      enabled: true,
      scanner: 'npm audit',
      severity: 'high',
      failOnVulnerabilities: true
    },
    // Code scanning
    code: {
      enabled: true,
      tools: ['eslint', 'sonarqube'],
      rules: ['security', 'best-practices']
    }
  },

  // Performance testing
  performance: {
    // Load testing
    load: {
      enabled: true,
      tool: 'artillery',
      config: 'tests/load/artillery.yml',
      scenarios: [
        'api-endpoints',
        'user-registration',
        'job-search',
        'application-submission'
      ]
    },
    // Benchmarking
    benchmark: {
      enabled: true,
      metrics: ['response-time', 'throughput', 'error-rate'],
      targets: {
        responseTime: 200, // ms
        throughput: 1000, // req/s
        errorRate: 0.01 // 1%
      }
    }
  }
};
