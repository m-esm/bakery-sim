# Multi-stage build: Vite production bundle served by nginx-unprivileged.
# Runtime user is uid 101. Mount emptyDirs at /tmp, /var/cache/nginx, and
# /var/run when the root filesystem is read-only.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
COPY tests ./tests
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
