# syntax=docker/dockerfile:1
# Immagine UNICA per entrambe le unità di esecuzione del monolite modulare:
# il ruolo si sceglie a runtime con la variabile APP_ROLE (app | worker).
#   docker run -e APP_ROLE=app    ... → server HTTP (facciata REST)
#   docker run -e APP_ROLE=worker ... → worker senza listener HTTP
#
# Da eseguire dal contesto ROOT del monorepo:
#   docker build -f apps/api/Dockerfile -t prome-api .

# ---------- Stage 1: dipendenze + build ----------
FROM node:22-alpine AS build
# openssl serve ai motori Prisma su Alpine (musl)
RUN apk add --no-cache openssl
# corepack legge "packageManager" dal package.json di root e usa la pnpm giusta
RUN corepack enable
WORKDIR /repo

# Prima i soli manifest, per sfruttare la cache dei layer sull'install
COPY package.json pnpm-workspace.yaml .npmrc pnpm-lock.yaml* ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --no-frozen-lockfile

# Poi i sorgenti e la build (contracts prima, perché api ne dipende)
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @prome/contracts build \
 && pnpm --filter @prome/api prisma:generate \
 && pnpm --filter @prome/api build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

# Con node-linker=hoisted (vedi .npmrc) i node_modules stanno alla root del
# workspace; il symlink @prome/contracts resta valido perché ricreiamo la
# stessa disposizione di cartelle (packages/contracts accanto a node_modules).
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 3001
# Il ruolo (app | worker) arriva da APP_ROLE a runtime: stessa immagine per entrambi.
CMD ["node", "dist/main.js"]
