import dotenv from 'dotenv';
import http from 'http';

// Load environment variables FIRST before any other imports
dotenv.config();

// PORT handling: Railway injects PORT=5432 from PostgreSQL service
// Use API_PORT if set, otherwise PORT (but exclude 5432 which is PostgreSQL's port)
const rawPort = process.env.API_PORT || process.env.PORT;
const PORT = rawPort && rawPort !== '5432' ? Number(rawPort) : 3001;

// Log startup immediately to see if we even get this far
console.log('========================================');
console.log('🚀 Starting Vantage API...');
console.log('========================================');
console.log('Environment:');
console.log('  PORT:', PORT, rawPort === '5432' ? '(ignored 5432 - PostgreSQL port)' : '');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('  DEV_JWT_SECRET:', process.env.DEV_JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ SET' : '❌ NOT SET (rate limiting uses memory)');
console.log('========================================');

// Critical check: DATABASE_URL must be set
if (!process.env.DATABASE_URL) {
  console.error('');
  console.error('❌ FATAL ERROR: DATABASE_URL is not set!');
  console.error('');
  console.error('Please set the DATABASE_URL environment variable in Railway:');
  console.error('  1. Go to your Railway project');
  console.error('  2. Click on your API service');
  console.error('  3. Go to Variables tab');
  console.error('  4. Add DATABASE_URL with your PostgreSQL connection string');
  console.error('');
  console.error('Example: postgresql://user:password@host:5432/database');
  console.error('');
  // Don't exit - let the app try to start so we can see more logs
}

// Now import the rest of the application
console.log('📦 Loading application modules...');

import { createApp } from './app';
import { logger } from './lib/logger';
import * as deployment from './lib/deployment';
import { initRedis } from './lib/redisCache';
import { setupSocket, getIO } from './lib/socket';
import { initializeScheduler, shutdownScheduler } from './lib/scheduler';

console.log('✅ Application modules loaded successfully');

// Create app instance (reused for server + tests)
const app = createApp();

// Initialize services and start server
async function startServer() {
    // Create HTTP server from Express app
    const httpServer = http.createServer(app);

    // Initialize Redis (non-blocking, falls back to memory cache)
    try {
        const redisConnected = await initRedis();
        if (redisConnected) {
            logger.info('✅ Redis connected');
        } else {
            logger.info('ℹ️  Redis not configured, using in-memory cache');
        }
    } catch (err) {
        logger.warn('⚠️  Redis initialization failed, using in-memory cache');
    }

    // Initialize Socket.io for real-time communication
    try {
        setupSocket(httpServer);
        logger.info('🔌 Socket.io initialized');
    } catch (err) {
        logger.warn('⚠️  Socket.io initialization failed:', err);
    }

    const server = httpServer.listen(PORT, () => {
        logger.info(`🚀 API running on http://localhost:${PORT}`);
        logger.info(`📚 API docs available at http://localhost:${PORT}/docs`);
        logger.info(`❤️  Health check at http://localhost:${PORT}/health`);
        logger.info(`🔌 Socket.io ready at ws://localhost:${PORT}`);
        
        // Initialize deployment tracking
        deployment.initDeployment(server);
        
        // Initialize scheduled tasks (job alerts, pre-apply processing)
        initializeScheduler();
    });

    // Enhanced graceful shutdown with connection draining
    deployment.registerShutdownHandlers(server);

    return server;
}

// Only start the server if we're not in test mode, or if strictly requested
let serverPromise: Promise<any> | undefined; // Using any to avoid type complexity with http types

if (process.env.NODE_ENV !== 'test') {
    serverPromise = startServer().catch((err) => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });
}

export { serverPromise as server, getIO };
export default app;
