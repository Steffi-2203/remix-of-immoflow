FROM node:22-alpine AS base
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./
COPY --from=build /app/migrations ./migrations
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1
CMD ["node", "--import", "tsx", "server/index.ts"]
