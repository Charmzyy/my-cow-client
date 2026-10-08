# ---------------------------------------------------------------------------
# my-cow-client: Vue/Vite SPA. Multi-stage: Node builds it, nginx serves it.
# Build:  docker build -t cow-client:dev .
# The app calls /api and /storage on its OWN address; nginx forwards those to Laravel
# (API_UPSTREAM, set at run time). So the same image works on any host/IP: no rebuild per network.
# ---------------------------------------------------------------------------

# ---- Stage 1: build (Node exists only here, never in the final image) ----
FROM node:22-alpine AS build
WORKDIR /app

# deps first for layer caching; `npm ci` = exact versions from package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative URLs by default (same origin, via the nginx proxy). Override only if the API
# lives on a different domain, e.g. --build-arg VITE_API_URL=https://api.example.com/api
ARG VITE_API_URL=/api
ARG VITE_STORAGE_URL=/storage/
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL
RUN npm run build

# ---- Stage 2: serve static files + proxy /api ----
FROM nginx:1.27-alpine
# Where Laravel is reachable from this container. Default = the "app" service in the same compose stack.
ENV API_UPSTREAM=http://app:8001
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# CMD is inherited from the nginx image (nginx -g 'daemon off;'); its entrypoint renders the template
