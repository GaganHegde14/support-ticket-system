# ── Build stage ──
FROM node:18-alpine AS build

WORKDIR /app

# No REACT_APP_API_URL needed — Nginx proxies /api/ to backend

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── Production stage ──
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
