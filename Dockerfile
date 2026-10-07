# ---------------------------------------------------------------------------
# my-cow-client: Vue/Vite SPA. Multi-stage: Node builds it, nginx serves it.
# Build:  docker build -t cow-client:dev --build-arg VITE_API_URL=http://localhost:8001/api .
# VITE_* values are BAKED INTO the JS at build time. To change the API URL, rebuild.
# ---------------------------------------------------------------------------

# ---- Stage 1: build (Node exists only here, never in the final image) ----
FROM node:22-alpine AS build
WORKDIR /app

# deps first for layer caching; `npm ci` = exact versions from package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ARG = build-time variable; ENV makes it visible to `npm run build` (Vite reads VITE_*)
ARG VITE_API_URL=http://localhost:8001/api
ARG VITE_STORAGE_URL=http://localhost:8001/storage/
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL
RUN npm run build

# ---- Stage 2: serve static files ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# CMD is inherited from the nginx image (nginx -g 'daemon off;')
