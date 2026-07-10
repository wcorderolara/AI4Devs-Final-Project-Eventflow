# US-133 (PB-P0-016) — Dockerfile multi-stage del backend EventFlow.
# ADR-DEVOPS-001 (App Runner es el runtime objetivo), Doc 21 §10.
# Base pinneada por versión (Node 22 LTS: alineada con `engines.node>=22` y CI `node-version:22`).
# NO usa tags flotantes (`latest`/`lts`). No recibe secretos por ARG; el runtime los toma del entorno.

# ── Stage 1: deps — instala TODAS las dependencias (build + prod). Capa cacheable: solo se
#    invalida si cambian package*.json o el schema Prisma, no el código fuente (AC-07). ──
FROM node:22-alpine AS deps
WORKDIR /app
# openssl: requerido por el query engine de Prisma en Alpine (musl) — EC-03.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ── Stage 2: build — genera el Prisma client (motor musl para el runtime Alpine), compila TS a
#    `dist/` y poda a dependencias de producción (el client generado en node_modules/.prisma se
#    conserva tras el prune porque no es un devDependency). ──
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ── Stage 3: runtime — imagen mínima, no-root, solo artefactos productivos. ──
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
# EC-01: puerto por defecto 3000 (App Runner lo respeta / puede sobreescribir por entorno).
ENV NODE_ENV=production \
    PORT=3000
# Artefactos productivos con ownership del usuario no-root `node` (provisto por la imagen oficial).
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
# AC-04 / SEC-02: el contenedor corre como usuario no-root.
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
