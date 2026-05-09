# syntax=docker/dockerfile:1.7

# ---- deps (full install, including dev — needed to run `next build`) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps (slim, runtime-only) ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

COPY --chown=nextjs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/server.js ./server.js
COPY --chown=nextjs:nodejs --from=builder /app/src/sockets ./src/sockets

EXPOSE 3000
CMD ["node", "server.js"]
