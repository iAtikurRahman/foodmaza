# Backend — Express + Prisma + transformers.js
# Debian slim (glibc) because onnxruntime-node ships glibc-only native binaries.
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma: copy schema/config, generate the client, then the rest of the source.
# DATABASE_URL is only a syntactic placeholder (generate never connects);
# the real URL arrives as runtime env from compose (or docker run -e ...).
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder"
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN DATABASE_URL="$DATABASE_URL" npx prisma generate

COPY . .

# Everything is configurable via env — compose passes these as build args,
# so no value is hardcoded here. Defaults keep the backend on 5000.
ARG NODE_ENV=production
ARG PORT=5000
ENV NODE_ENV=$NODE_ENV \
    PORT=$PORT

EXPOSE ${PORT}

# db readiness is guaranteed by compose's depends_on + healthcheck
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
