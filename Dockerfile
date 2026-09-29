# Stage 1: Install dependencies
FROM node:26-alpine AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g corepack && corepack enable && corepack install
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:26-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g corepack && corepack enable && corepack install

ENV NODE_ENV=production
RUN pnpm run build

# Stage 3: Production runner
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/.timber/dist/nitro/.output ./

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOST="0.0.0.0"
ENV RELISTEN_API_URL="http://relistenapi-srv.default:3823"

CMD ["node", "server/index.mjs"]
