# ==============================================================================
# LifeTrace Production Container
# Multi-stage optimized Node.js runtime for TiDB Cloud & Cloud Hosting
# ==============================================================================

FROM node:20-alpine AS base

# Install dumb-init for proper signal handling (SIGINT / SIGTERM)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies (only production dependencies)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application source code
COPY backend ./backend
COPY frontend ./frontend
COPY controllers ./controllers

# Create upload directories and set permissions for node non-root user
RUN mkdir -p backend/uploads/media backend/uploads/avatars backend/uploads/submissions \
    && chown -R node:node /app

USER node

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/server.js"]
