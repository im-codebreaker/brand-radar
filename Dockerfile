# syntax=docker/dockerfile:1.7
###################################################
# Base — node + pnpm via corepack
###################################################
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /stackit
ENV CI=true \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
ENTRYPOINT ["/sbin/tini", "--"]

###################################################
# Deps — install workspace deps with frozen lockfile
#
# Uses `pnpm fetch` so we only need the lockfile to populate the
# store. Then we copy source and run `pnpm install --offline`,
# which works regardless of which optional packages exist —
# important because `pnpm setup` may have pruned packages/cache
# or packages/auth.
###################################################
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline

###################################################
# API — build + dev + prod
###################################################
FROM deps AS api-build
ENV NODE_ENV=production
RUN pnpm --filter @stackit/api run build

FROM deps AS api-dev
ENV NODE_ENV=development
WORKDIR /stackit/apps/api
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM node:24-alpine AS api-prod
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /stackit
ENV NODE_ENV=production
COPY --from=api-build /stackit /stackit
WORKDIR /stackit/apps/api
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

###################################################
# Web — build + dev + prod (nginx)
###################################################
FROM deps AS web-build
ENV NODE_ENV=production
RUN pnpm --filter @stackit/web run build

FROM deps AS web-dev
ENV NODE_ENV=development
WORKDIR /stackit/apps/web
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

FROM nginx:alpine AS web-prod
COPY --from=web-build /stackit/apps/web/dist /usr/share/nginx/html
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
