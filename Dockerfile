# ── Stage 1: Build frontend + compile native modules ──────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Build tools required for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Copy pre-compiled node_modules (includes better-sqlite3 .node binary)
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy package.json (tsx needs it for module resolution)
COPY package.json ./

# Copy server TypeScript sources
# tsx (production dep) runs .ts + resolves .js→.ts specifiers correctly
COPY server/ ./server/

# Copy database migrations
COPY migrations/ ./migrations/

# Persistent config and SQLite DB live in a mounted volume at /data
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_PATH=/data/config.json
ENV DB_PATH=/data/unirule.db

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/index.ts"]
