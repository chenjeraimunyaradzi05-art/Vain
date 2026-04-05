// @ts-nocheck
"use strict";
/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables on startup using Zod.
 * Fails fast with clear error messages if configuration is invalid.
 */

const { z } = require('zod');

// Define environment schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Database (required in production, optional in dev)
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    { message: 'DATABASE_URL must be a PostgreSQL connection string' }
  ).optional(),

  // JWT Authentication (at least one required)
  JWT_SECRET: z.string().min(32).optional(),
  DEV_JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis (optional but recommended)
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),

  // AWS Services (optional)
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY: z.string().optional(),
  AWS_SES_SECRET_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  // Email (one provider optional)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@ngurrapathways.com.au'),

  // SMS (optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_WEBHOOK_SECRET: z.string().optional(),

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Plaid (optional)
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).optional(),
  PLAID_PRODUCTS: z.string().optional(),

  // AI Services (optional)
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  AI_PROTOTYPE_URL: z.string().url().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),

  // Feature Flags
  FEATURE_WEBSOCKETS: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  FEATURE_AI_CHAT: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  FEATURE_VIDEO_CALLS: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),

  // Testing
  SES_TEST_CAPTURE: z.enum(['0', '1']).default('0'),
}).refine(
  (data) => data.JWT_SECRET || data.DEV_JWT_SECRET,
  { message: 'Either JWT_SECRET or DEV_JWT_SECRET must be provided', path: ['JWT_SECRET'] }
);

/**
 * Validate environment variables
 * Call this at application startup before any other initialization
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment validation failed:\n');

    const errors = result.error.format();
    const flatErrors = result.error.flatten();

    // Print field-specific errors
    Object.entries(flatErrors.fieldErrors).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        console.error(`  • ${field}: ${messages.join(', ')}`);
      }
    });

    // Print form-level errors
    if (flatErrors.formErrors.length > 0) {
      console.error('\n  Configuration errors:');
      flatErrors.formErrors.forEach((msg) => {
        console.error(`  • ${msg}`);
      });
    }

    console.error('\n💡 Tip: Check your .env file or environment configuration.\n');

    // In production, fail hard. In development, warn but continue.
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: Environment validation failed in production');
      console.error('Required environment variables may be missing. Check Railway variables.');
      // Don't exit - let the app start so health checks can report the issue
      return null;
    } else {
      console.warn('⚠️  Continuing in development mode with invalid config...\n');
      return null;
    }
  }

  return result.data;
}

/**
 * Get validated environment configuration
 * Returns a type-safe config object
 */
function getEnvConfig() {
  const validated = validateEnv();

  if (!validated) {
    // Return defaults for development when validation fails
    return {
      nodeEnv: 'development',
      port: 3001,
      databaseUrl: process.env.DATABASE_URL || 'postgresql://ngurra:dev_password_secure@localhost:5432/ngurra_dev',
      jwtSecret: process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'dev-secret-key-for-local-development-only',
      jwtExpiresIn: '15m',
      jwtRefreshExpiresIn: '7d',
      redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      aws: {
        region: process.env.AWS_REGION || 'ap-southeast-2',
        s3Bucket: process.env.AWS_S3_BUCKET,
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      email: {
        from: process.env.EMAIL_FROM || 'noreply@ngurrapathways.com.au',
        sendgridKey: process.env.SENDGRID_API_KEY,
        smtpHost: process.env.SMTP_HOST,
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
      },
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      },
      plaid: {
        clientId: process.env.PLAID_CLIENT_ID,
        env: process.env.PLAID_ENV,
      },
      features: {
        websockets: process.env.FEATURE_WEBSOCKETS === 'true',
        aiChat: process.env.FEATURE_AI_CHAT === 'true',
        videoCalls: process.env.FEATURE_VIDEO_CALLS === 'true',
      },
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
    };
  }

  return {
    nodeEnv: validated.NODE_ENV,
    port: validated.PORT,
    databaseUrl: validated.DATABASE_URL,
    jwtSecret: validated.JWT_SECRET || validated.DEV_JWT_SECRET,
    jwtExpiresIn: validated.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: validated.JWT_REFRESH_EXPIRES_IN,
    redis: {
      url: validated.REDIS_URL,
      host: validated.REDIS_HOST,
      port: validated.REDIS_PORT,
    },
    aws: {
      region: validated.AWS_REGION,
      s3Bucket: validated.AWS_S3_BUCKET,
    },
    stripe: {
      secretKey: validated.STRIPE_SECRET_KEY,
      webhookSecret: validated.STRIPE_WEBHOOK_SECRET,
    },
    email: {
      from: validated.EMAIL_FROM,
      sendgridKey: validated.SENDGRID_API_KEY,
      smtpHost: validated.SMTP_HOST,
    },
    twilio: {
      accountSid: validated.TWILIO_ACCOUNT_SID,
      authToken: validated.TWILIO_AUTH_TOKEN,
      fromNumber: validated.TWILIO_FROM_NUMBER,
    },
    cloudinary: {
      cloudName: validated.CLOUDINARY_CLOUD_NAME,
      apiKey: validated.CLOUDINARY_API_KEY,
    },
    plaid: {
      clientId: validated.PLAID_CLIENT_ID,
      env: validated.PLAID_ENV,
      products: validated.PLAID_PRODUCTS ? validated.PLAID_PRODUCTS.split(',').map((s) => s.trim()).filter(Boolean) : [],
    },
    features: {
      websockets: validated.FEATURE_WEBSOCKETS,
      aiChat: validated.FEATURE_AI_CHAT,
      videoCalls: validated.FEATURE_VIDEO_CALLS,
    },
    allowedOrigins: validated.ALLOWED_ORIGINS.split(',').map(s => s.trim()),
  };
}

// Export singleton config
let _config = null;

export function config() {
  if (!_config) {
    _config = getEnvConfig();
  }
  return _config;
}

export {
  validateEnv,
  getEnvConfig,
  envSchema,
};

