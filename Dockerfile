# syntax=docker/dockerfile:1.7
###################################################
# Base — node + pnpm via corepack
###################################################
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /brand-radar
ENV CI=true \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
ENTRYPOINT ["/sbin/tini", "--"]

###################################################
# Dependencies — install all workspace deps
###################################################
FROM base AS dependencies
# Copy package files for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json from each workspace package
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/redis/package.json ./packages/redis/
COPY packages/search/package.json ./packages/search/
COPY packages/ai/package.json ./packages/ai/
COPY packages/taxonomy/package.json ./packages/taxonomy/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/eslint-config/package.json ./packages/config/eslint-config/
COPY packages/config/tsconfig/package.json ./packages/config/tsconfig/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/workers/package.json ./apps/workers/
COPY apps/scheduler/package.json ./apps/scheduler/

# Install ALL dependencies (dev + prod)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Now copy source code
COPY packages ./packages
COPY apps ./apps

###################################################
# API — build + dev + prod
###################################################
FROM dependencies AS api-build
ENV NODE_ENV=production
RUN pnpm --filter @brand-radar/api run build

FROM dependencies AS api-dev
ENV NODE_ENV=development
WORKDIR /brand-radar/apps/api
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM node:24-alpine AS api-prod
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /brand-radar
ENV NODE_ENV=production
COPY --from=api-build /brand-radar /brand-radar
WORKDIR /brand-radar/apps/api
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

###################################################
# Web — build + dev + prod (nginx)
###################################################
FROM dependencies AS web-build
ENV NODE_ENV=production
RUN pnpm --filter @brand-radar/web run build

FROM dependencies AS web-dev
ENV NODE_ENV=development
WORKDIR /brand-radar/apps/web
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

FROM nginx:alpine AS web-prod
COPY --from=web-build /brand-radar/apps/web/dist /usr/share/nginx/html
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

###################################################
# Workers — build + dev + prod
###################################################
FROM dependencies AS workers-dev
ENV NODE_ENV=development
WORKDIR /brand-radar/apps/workers
CMD ["pnpm", "dev"]

FROM dependencies AS workers-build
ENV NODE_ENV=production
RUN pnpm --filter @brand-radar/workers run build

FROM node:24-alpine AS workers-prod
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /brand-radar
ENV NODE_ENV=production
COPY --from=workers-build /brand-radar /brand-radar
WORKDIR /brand-radar/apps/workers
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/bootstrap.js"]

###################################################
# Scheduler — build + dev + prod
###################################################
FROM dependencies AS scheduler-dev
ENV NODE_ENV=development
WORKDIR /brand-radar/apps/scheduler
CMD ["pnpm", "dev"]

FROM dependencies AS scheduler-build
ENV NODE_ENV=production
RUN pnpm --filter @brand-radar/scheduler run build

FROM node:24-alpine AS scheduler-prod
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /brand-radar
ENV NODE_ENV=production
COPY --from=scheduler-build /brand-radar /brand-radar
WORKDIR /brand-radar/apps/scheduler
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
