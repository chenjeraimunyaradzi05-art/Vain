/**
 * Environment Configuration
 * 
 * Centralized, typed environment configuration for the API.
 * Uses Zod for runtime validation and TypeScript for type safety.
 */

import { z } from 'zod';

/**
 * Environment schema with strict validation
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Database (required)
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    { message: 'DATABASE_URL must be a PostgreSQL connection string' }
  ),

  JWT_SECRET: z.string().min(32).optional(),
  DEV_JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis (optional but recommended)
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),

  // AWS Services
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),
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

  // AI Services
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),

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
 * Inferred type from the schema
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validated and typed environment configuration
 */
let _config: EnvConfig | null = null;

/**
 * Validate environment variables on startup
 * @throws Error if validation fails in production
 */
export function validateEnv(): EnvConfig | null {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const isProd = process.env.NODE_ENV === 'production';
    
    console.error('\n❌ Environment validation failed:\n');
    
    const errors = result.error.flatten();
    Object.entries(errors.fieldErrors).forEach(([field, messages]) => {
      console.error(`  • ${field}: ${messages?.join(', ')}`);
    });
    
    if (errors.formErrors.length > 0) {
      console.error('\n  Configuration errors:');
      errors.formErrors.forEach((msg) => {
        console.error(`  • ${msg}`);
      });
    }

    if (isProd) {
      console.error('\n💥 Cannot start in production with invalid configuration\n');
      process.exit(1);
    }

    console.warn('\n⚠️  Running with partial configuration (development mode)\n');
    return null;
  }

  _config = result.data;
  return _config;
}

/**
 * Get the current configuration
 * @throws Error if configuration hasn't been validated
 */
export function getConfig(): EnvConfig {
  if (!_config) {
    throw new Error('Configuration not validated. Call validateEnv() first.');
  }
  return _config;
}

/**
 * Configuration object for convenience
 */
export const config = {
  get isDevelopment() {
    return process.env.NODE_ENV !== 'production';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get isTest() {
    return process.env.NODE_ENV === 'test';
  },
  get port() {
    return _config?.PORT ?? 3001;
  },
  get jwtSecret() {
    return _config?.JWT_SECRET ?? _config?.DEV_JWT_SECRET ?? 'dev-secret';
  },
  get databaseUrl() {
    return _config?.DATABASE_URL ?? '';
  },
  get allowedOrigins() {
    return (_config?.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  },
};

export { envSchema };

export {};
