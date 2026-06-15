# POS System — Backend

NestJS REST API for the POS system, backed by PostgreSQL via Prisma ORM.

---

## Tech Stack

- **Framework**: NestJS v10 + Express
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma v6
- **Auth**: JWT (access + refresh tokens), Passport.js, bcryptjs
- **Security**: Helmet (security headers), CORS origin allowlist
- **Docs**: Swagger / OpenAPI at `/api/docs` (non-production only)

---

## Prerequisites

- Node.js v20+
- PostgreSQL 16+ (or Docker)

---

## Local Setup

```bash
# Install dependencies (--legacy-peer-deps is required: NestJS 10 vs @nestjs/swagger 11)
npm install --legacy-peer-deps

# Copy environment file and fill in values
cp .env.example .env

# Run database migrations (also generates the Prisma client)
npx prisma migrate dev

# Seed the database with an initial admin user
npx prisma db seed

# Start development server (watch mode)
npm run start:dev
```

API: `http://localhost:3000/api`
Swagger: `http://localhost:3000/api/docs` (development only)

### Database seed

`npx prisma db seed` runs `prisma/seed.ts`, which creates a default admin (idempotent — it skips if the user already exists):

| Field    | Value           |
|----------|-----------------|
| Email    | `admin@pos.com` |
| Password | `admin123`      |
| Role     | `ADMIN`         |

> Change these credentials immediately outside local development.

---

## Docker Setup

This `backend/docker-compose.yml` starts **PostgreSQL only** — use it when you
want the database in Docker but the API (and frontend) running on your host.

```bash
# Start Postgres in the background (localhost:5432)
docker compose up -d

# Stop
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

Then run the API on the host with `npm run start:dev`.

To instead run the **entire stack** (Postgres + backend + frontend) in Docker,
use the root `docker-compose.yml` — see the repository root `README.md`. Both
compose files share the same `backend_postgres_data` volume, so only run one at
a time (they both bind port `5432` / the `pos_db` container name).

The backend image (`Dockerfile`) is a multi-stage build that runs
`prisma migrate deploy` on startup and then launches `node dist/src/main`.

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/pos_system?schema=public"

JWT_ACCESS_SECRET=your-access-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# Comma-separated list of allowed CORS origins (the frontend URL(s)).
# A wildcard cannot be combined with credentialed requests.
CORS_ORIGINS=http://localhost:3001
```

| Variable                 | Description                                                        |
|--------------------------|--------------------------------------------------------------------|
| `PORT`                   | Port the API listens on (default `3000`).                          |
| `NODE_ENV`               | `development` or `production`. Gates Swagger and secret checks.    |
| `DATABASE_URL`           | PostgreSQL connection string.                                      |
| `JWT_ACCESS_SECRET`      | Secret for signing access tokens.                                  |
| `JWT_ACCESS_EXPIRES_IN`  | Access token lifetime (e.g. `15m`).                                |
| `JWT_REFRESH_SECRET`     | Secret for signing refresh tokens (must differ from the access secret). |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`).                                |
| `CORS_ORIGINS`           | Comma-separated allowed origins for credentialed requests.        |

> **Production hardening:** when `NODE_ENV=production`, the app refuses to start
> if either JWT secret is missing, shorter than 32 characters, still a
> placeholder/default value, or if both secrets are identical. Generate strong
> values with `openssl rand -base64 48`.

---

## Scripts

| Script              | Description                        |
|---------------------|------------------------------------|
| `npm run start:dev` | Development server with watch mode |
| `npm run build`     | Compile TypeScript to `dist/`      |
| `npm run start:prod`| Run compiled production build      |
| `npm run lint`      | ESLint with auto-fix               |
| `npm run format`    | Prettier write                     |
| `npm run test`      | Run Jest unit tests                |
| `npm run test:e2e`  | Run end-to-end tests               |
| `npm run test:cov`  | Run tests with coverage            |
| `npx prisma db seed`| Seed the database (admin user)     |

---

## Project Structure

```
src/
├── auth/             # Login, JWT strategy, refresh token
├── users/            # User CRUD (+ compensation fields)
├── stores/           # Store CRUD
├── categories/       # Category CRUD (hierarchical, tax rate)
├── brands/           # Brand CRUD
├── attributes/       # Reusable attributes + attribute values
├── products/         # Products and their variants (SKU/barcode/price/cost)
├── inventory/        # Per-store stock levels + stock movements
├── suppliers/        # Suppliers and supplier catalog
├── purchase-orders/  # Purchase orders + receiving
├── transfers/        # Inter-store stock transfers
├── tax-rates/        # Tax rates
├── discounts/        # Discounts / coupons (order + line-item scope)
├── customers/        # Customer CRUD
├── orders/           # Order checkout, management, and adjustments (returns/exchanges)
├── compensation/     # Employee compensation payouts (base salary + commission)
├── reports/          # Sales / operational reports
├── prisma/           # PrismaService (database client)
└── shared/
    ├── decorators/   # @Public, @Roles, @CurrentUser decorators
    ├── filters/      # Global HTTP exception filter
    ├── guards/       # JwtAuthGuard, RolesGuard
    ├── pipes/        # Request validation pipe
    └── strategies/   # Passport JWT strategy
```

---

## Authentication

All routes are JWT-protected by default. Use the `@Public()` decorator to bypass auth on specific routes, and `@Roles(Role.ADMIN, ...)` to restrict by role. Roles come from the Prisma `Role` enum: `ADMIN`, `MANAGER`, `CASHIER`, `EMPLOYEE` (`MANAGER` is deprecated; `EMPLOYEE` is a sales-floor/commission role rather than a back-office one).

**Login** — `POST /api/auth/login`
```json
{ "email": "user@example.com", "password": "password" }
```
Returns `accessToken` and `refreshToken`.

**Refresh** — `POST /api/auth/refresh`
Pass the refresh token to get a new access token.

**Authorization header** on all protected requests:
```
Authorization: Bearer <accessToken>
```

---

## Database

Prisma schema: `prisma/schema.prisma`

```bash
# Create and apply a new migration (dev)
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```
