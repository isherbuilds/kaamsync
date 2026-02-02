# Build stage - install all deps and build
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production dependencies stage
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Final runtime image
FROM node:24-alpine AS runner
WORKDIR /app

# Add wget for healthcheck
RUN apk add --no-cache wget

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built app
COPY --from=builder /app/build ./build
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "run", "start"]