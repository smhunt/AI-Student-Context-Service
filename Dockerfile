# =============================================================================
# StudentContext AI - Production Dockerfile
# Multi-stage build: backend TypeScript -> frontend Vite -> production image
# =============================================================================

# Stage 1: Build backend TypeScript
FROM node:22-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Stage 2: Build frontend (Vite + React)
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy compiled backend from stage 1
COPY --from=backend-build /app/dist/ ./dist/

# Copy compiled frontend from stage 2
COPY --from=frontend-build /app/client/dist/ ./client/dist/

# Copy SQL migrations (needed at runtime for db:migrate)
COPY src/db/migrations/ ./dist/db/migrations/

ENV NODE_ENV=production
EXPOSE 3094

CMD ["node", "dist/server.js"]
