# foodmaza

FeastOS (Foodmaaza) is a full-stack Next.js and Node.js Restaurant Management System. It streamlines order lifecycles, kitchen updates, table tracking, and billing. It also features a Python ML microservice that predicts daily food demand to optimize inventory and reduce waste.

## Architecture / ports

| Service   | Where it runs              | URL / connection                    |
| --------- | -------------------------- | ----------------------------------- |
| Frontend  | Next.js (`:3000`)          | http://localhost:3000               |
| Backend   | Express (`:5001`)          | http://localhost:5001/api           |
| Database  | **Docker Compose only**    | host `localhost:5433` / container `db:5432` |

Port notes:

- Backend is **5001** (5000 is used by another local project).
- PostgreSQL is published on host port **5433** (5432 is used by the system PostgreSQL).

## Mode 1 — run backend & frontend locally (`npm run dev`)

PostgreSQL still runs in Docker; everything else runs on your machine.

```bash
# 1. start only the database (once)
docker compose up -d db

# 2. backend — terminal 1
cd backend
npm run dev          # http://localhost:5001/api

# 3. frontend — terminal 2
cd frontend
npm run dev          # http://localhost:3000
```

Optional (fresh database only): seed demo users & menu

```bash
cd backend && npm run seed
# admin@foodmaza.com / Admin@123   —   customer@foodmaza.com / Customer@123
```

How the connection works in this mode:

- `backend/.env` → `DATABASE_URL=...@localhost:5433/foodmaaza` (host port of the compose DB)
- `frontend/.env` → `NEXT_PUBLIC_API_URL=http://localhost:5001/api` (browser calls the API directly)

## Mode 2 — run everything with Docker (`docker compose up -d`)

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend     # follow API logs
```

This starts **db + backend + frontend** together. No local Node needed.

How the connection works in this mode:

- Backend gets `DATABASE_URL=...@db:5432/foodmaaza` from compose (service name = DB host)
- Frontend image gets `NEXT_PUBLIC_API_URL` as a **build arg** (must stay browser-reachable: `http://localhost:5001/api`)
- Backend runs `prisma migrate deploy` automatically on every start

## Everyday commands

```bash
docker compose up -d              # start everything
docker compose stop               # stop containers (DB data persists in volume)
docker compose down               # stop + remove containers (data persists)
docker compose down -v            # stop + DELETE database data
docker compose logs -f backend    # tail API logs
docker compose exec backend npm run seed    # seed demo data
docker compose exec db psql -U postgres -d foodmaaza   # open psql
```

## Environment variables

| File                     | Used by                              | Key values                                                                 |
| ------------------------ | ------------------------------------ | -------------------------------------------------------------------------- |
| `backend/.env`           | local `npm run dev`                  | `PORT=5001`, `DATABASE_URL=...@localhost:5433/...`, `JWT_SECRET`            |
| `frontend/.env`          | local `npm run dev`                  | `NEXT_PUBLIC_API_URL=http://localhost:5001/api`                             |
| `.env` (project root)    | `docker compose` interpolation       | `POSTGRES_*`, `DB_PORT`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`                |
| `docker-compose.yml`     | Docker mode backend                  | sets `DATABASE_URL=...@db:5432/...` (overrides for the container network)   |

**Never commit real secrets** — root `.env` and `backend/.env` are gitignored; see `.env.example` and `backend/.env.example`.

### Changing ports

- API port: `backend/.env` `PORT` + `NEXT_PUBLIC_API_URL` (frontend) + `docker-compose.yml` backend `ports`
- DB port: root `.env` `DB_PORT` + `backend/.env` `DATABASE_URL`
- After changing `NEXT_PUBLIC_API_URL` for Docker mode, rebuild: `docker compose build frontend`
