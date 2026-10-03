# Image unique pour tous les services Node du monorepo.
# Usage : docker build -f infra/docker/Dockerfile --build-arg APP=api .
# Alpine (musl) plutôt que Debian : pas de glibc (LGPL) dans l'image.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /repo

# 1. Ne garder que le service demandé et ses dépendances internes
FROM base AS pruner
ARG APP
COPY . .
RUN npx turbo@2 prune @fricadev/${APP} --docker

# 2. Installer les dépendances (couche mise en cache tant que les package.json ne changent pas)
FROM base AS builder
ARG APP
COPY --from=pruner /repo/out/json/ .
RUN npm ci
COPY --from=pruner /repo/out/full/ .
RUN npx turbo run build --filter=@fricadev/${APP}
RUN npm prune --omit=dev

# 3. Image finale minimale, sans les outils de build
FROM node:${NODE_VERSION} AS runner
ARG APP
RUN apk add --no-cache openssl && addgroup -S fricadev && adduser -S fricadev -G fricadev
WORKDIR /repo
ENV NODE_ENV=production APP=${APP}
COPY --from=builder --chown=fricadev:fricadev /repo .
RUN mkdir -p /data/uploads && chown fricadev:fricadev /data/uploads
USER fricadev
WORKDIR /repo/apps/${APP}
CMD ["npm", "run", "start"]
