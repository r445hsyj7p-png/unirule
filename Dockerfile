# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server TypeScript sources
# tsx (production dep) runs .ts + resolves .js→.ts specifiers correctly
COPY server/ ./server/

# Persistent config lives in a mounted volume at /data
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_PATH=/data/config.json

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/index.ts"]
