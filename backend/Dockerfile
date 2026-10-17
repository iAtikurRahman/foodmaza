# Backend — Express + Prisma + transformers.js
# Debian slim (glibc) because onnxruntime-node ships glibc-only native binaries.
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma: copy schema/config, generate the client, then the rest of the source
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder" \
    npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 5001

# db readiness is guaranteed by compose's depends_on + healthcheck
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
