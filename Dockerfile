# Multi-stage Dockerfile for building a Vite React app and serving it via Nginx

# 1) Build stage
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the production bundle
RUN npm run build


# 2) Run stage: serve static files with Nginx
FROM nginx:alpine AS runner

# Copy built assets from the builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
