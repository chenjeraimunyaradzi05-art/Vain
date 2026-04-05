# =====================================
# Ngurra Pathways API - Production Dockerfile
# =====================================
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Production
# Using distroless-inspired minimal image
FROM node:20-alpine AS production

WORKDIR /app

# Install only essential production dependencies
# Note: curl and postgresql-client removed to reduce attack surface
# Use 'docker exec' or sidecar containers for debugging if needed
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ngurra -u 1001

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and production dependencies
RUN npm install -g pnpm pm2 && \
    pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/ecosystem.config.cjs ./

# Create logs directory
RUN mkdir -p logs && chown -R ngurra:nodejs logs

# Step 44: Create tmp directory for read-only root filesystem support
RUN mkdir -p /app/tmp && chown -R ngurra:nodejs /app/tmp

# Set ownership
RUN chown -R ngurra:nodejs /app

# Switch to non-root user
USER ngurra

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Step 44: Set secure environment defaults
ENV TMPDIR=/app/tmp
ENV npm_config_cache=/app/tmp/.npm

# Expose port
EXPOSE 3001

# Step 43: Enhanced health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health/ready', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Security labels
LABEL maintainer="security@ngurrapathways.com.au"
LABEL security.scan="required"
LABEL security.non-root="true"

# Start with PM2 for process management
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--env", "production"]
