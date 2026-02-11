# ─── Stage 1: Build ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production Runtime ───
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy build artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy migration files (needed at runtime)
COPY migrations ./migrations
COPY ci ./ci

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
