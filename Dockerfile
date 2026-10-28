# ---------- Build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first so Docker can cache this layer.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy sources and build.
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config with long-lived asset caching.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Health endpoint used by Docker / Watchtower / uptime checks.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
