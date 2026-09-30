# Production Dockerfile for "صدى حكايتي / My Memory Tells" Backend on Google Cloud Run
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build Vite frontend bundle
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend assets and server source code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Cloud Run binds to 0.0.0.0 and uses PORT env var
EXPOSE 8080

# Start production server
CMD ["tsx", "server.ts"]
