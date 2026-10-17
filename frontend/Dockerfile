# Frontend — Next.js (standalone output for a small runtime image)
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Browser-facing API URL — baked into the client bundle at build time.
# Passed in by compose from the root .env (`NEXT_PUBLIC_API_URL`); override
# with --build-arg. Default points at the Docker backend on 5000.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- runtime: only what the standalone server needs ----
FROM node:22-bookworm-slim AS runner

WORKDIR /app

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# All values come from env (compose passes them in; --build-arg overrides).
# Defaults keep the frontend on 3000 listening on all interfaces.
ARG NODE_ENV=production
ARG HOSTNAME=0.0.0.0
ARG PORT=3000

ENV NODE_ENV=$NODE_ENV \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=$HOSTNAME \
    PORT=$PORT

EXPOSE ${PORT}

CMD ["node", "server.js"]
