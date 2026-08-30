# POS System

A full-featured Point of Sale system built with **NestJS** (backend) and **Next.js** (frontend), backed by **PostgreSQL** via **Prisma ORM**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Docker Setup](#docker-setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [User Roles](#user-roles)

---

## Overview

This POS (Point of Sale) system is designed for retail businesses to manage stores, catalog, inventory, purchasing, and sales. It supports multiple store locations with role-based access control, variant-level product catalog (SKU + barcode + price per variant), per-store inventory with stock-movement history, suppliers and purchase orders, inter-store stock transfers, taxes and discounts, returns/exchanges, and employee compensation (base salary + sales commission).

---

## Architecture

```
pos-system/
├── backend/      # NestJS REST API (port 3000, global /api prefix)
├── frontend/     # Next.js web application (port 3001)
├── docker-compose.yml        # Full stack: postgres + backend + frontend
└── .env                      # Values consumed by docker-compose
```

The backend exposes a REST API consumed by the Next.js frontend. Authentication uses a JWT access/refresh token strategy. All API routes are prefixed with `/api`.

---

## Features

- **Multi-store support** — manage multiple store locations from a single system
- **Role-based access control** — Admin, Cashier, and Employee roles (Manager is deprecated)
- **Variant-level catalog** — products with typed variants (SIMPLE/VARIABLE); each variant carries its own SKU, barcode, price, and cost
- **Brands & reusable attributes** — normalized attributes (Size, Color, …) and attribute values composed into variants
- **Categories** — hierarchical (parent/child) with optional tax rate
- **Inventory** — per-store stock levels (quantity, reserved, reorder point) with a full stock-movement ledger
- **Suppliers & purchasing** — suppliers, supplier catalog, and purchase orders with partial receiving
- **Stock transfers** — move stock between stores with in-transit tracking
- **Taxes & discounts** — tax rates (inclusive/exclusive) and order- or line-item-scoped discounts/coupons
- **Customers** — optional customer record on orders
- **Order management** — cart checkout, multiple payment methods, change/amount-paid tracking, per-store receipt numbering
- **Returns / exchanges / sale adjustments** — post-sale adjustments with optional restock
- **Employee compensation** — base salary + sales commission, with payout generation and statuses
- **Reports** — sales and operational reporting endpoints
- **JWT authentication** — short-lived access tokens + long-lived refresh tokens
- **Swagger API docs** — interactive API documentation at `/api/docs` (non-production)

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | NestJS v10, TypeScript, Express             |
| Frontend   | Next.js v16, React 19, TypeScript           |
| Database   | PostgreSQL 16                               |
| ORM        | Prisma v6                                   |
| Auth       | JWT (Passport.js), bcryptjs                 |
| Server state | TanStack Query (React Query)              |
| Client state | Zustand                                   |
| Forms/validation | React Hook Form + Zod                 |
| Styling    | Tailwind CSS v4                             |
| API Client | Axios                                       |
| Docs       | Swagger / OpenAPI                           |

---

## Project Structure

```
pos-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Default admin seed
│   │   └── migrations/          # Prisma migrations
│   ├── src/
│   │   ├── auth/                # Authentication
│   │   ├── users/              stores/            categories/
│   │   ├── brands/             attributes/        products/
│   │   ├── inventory/          suppliers/         purchase-orders/
│   │   ├── transfers/          tax-rates/         discounts/
│   │   ├── customers/          orders/            compensation/
│   │   ├── reports/
│   │   ├── prisma/              # PrismaService
│   │   └── shared/             # Guards, filters, pipes, decorators, strategies
│   ├── Dockerfile
│   ├── docker-compose.yml      # DB-only (Postgres) for local-app development
│   └── .env.example
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── app/                # Next.js App Router (route group + login)
│       ├── components/         # Feature + UI components
│       ├── hooks/              # React Query hooks per module
│       ├── types/  schemas/    # Domain types + Zod schemas
│       ├── lib/                # api client, endpoints, route-access
│       └── store/              # Zustand auth store
├── docker-compose.yml          # Full stack
├── .env / .env.example         # Compose env values
└── CLAUDE.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [PostgreSQL](https://www.postgresql.org/) 16+ (or use Docker)
- [Docker](https://www.docker.com/) & Docker Compose (optional)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd pos-system
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
npm install --legacy-peer-deps   # required: NestJS 10 vs @nestjs/swagger 11
npx prisma migrate dev
npx prisma db seed               # creates the default admin user
npm run start:dev
```

Backend runs at `http://localhost:3000` (API under `/api`).

### 3. Frontend setup

```bash
cd frontend
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000/api' > .env.local
npm install --legacy-peer-deps
npm run dev
```

Frontend runs at `http://localhost:3001`

> Tip: for local-app development you can run **just the database** in Docker
> (`cd backend && docker compose up -d`) and run the backend/frontend on your
> host as above.

---

## Docker Setup

There are two ways to use Docker. They share the **same** Postgres data volume
(`backend_postgres_data`), but only one may run at a time — they both publish
port `5432` and use the `pos_db` container name.

### Option A — Full stack in Docker (recommended)

The root `docker-compose.yml` builds and runs **PostgreSQL + backend + frontend**
together. Values come from the root `.env` (copy `.env.example` first).

```bash
cp .env.example .env
# Edit .env — at minimum set strong JWT_ACCESS_SECRET / JWT_REFRESH_SECRET

# Build and start everything (detached)
docker compose up -d --build

# Follow logs
docker compose logs -f backend

# Stop
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

| Service       | URL                              |
|---------------|----------------------------------|
| Frontend      | `http://localhost:3001`          |
| Backend API   | `http://localhost:3000/api`      |
| Swagger Docs  | `http://localhost:3000/api/docs` |
| PostgreSQL    | `localhost:5432`                 |

The backend container automatically runs `prisma migrate deploy` on startup.

> **Note:** `NEXT_PUBLIC_API_URL` is baked into the browser bundle at build time,
> so it must be a host-reachable URL (`http://localhost:3000/api`) — **not** the
> internal `backend` service name. The browser, not the container, makes those calls.

### Option B — Database only in Docker

Run only Postgres in Docker and the apps on your host. This is the long-standing
workflow and lives in `backend/docker-compose.yml`:

```bash
cd backend
docker compose up -d            # Postgres only, on localhost:5432
npm run start:dev               # backend on the host
# (separately) cd ../frontend && npm run dev
```

---

## Environment Variables

### Root `.env` (consumed by `docker-compose.yml`)

| Variable                 | Description                                   | Default                       |
|--------------------------|-----------------------------------------------|-------------------------------|
| `POSTGRES_USER`          | Postgres user                                 | `myuser`                      |
| `POSTGRES_PASSWORD`      | Postgres password                             | `mypassword`                  |
| `POSTGRES_DB`            | Postgres database name                        | `pos_system`                  |
| `JWT_ACCESS_SECRET`      | Secret for signing access tokens              | —                             |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiry                           | `15m`                         |
| `JWT_REFRESH_SECRET`     | Secret for signing refresh tokens             | —                             |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry                          | `7d`                          |
| `CORS_ORIGINS`           | Comma-separated allowed browser origins       | `http://localhost:3001`       |
| `NEXT_PUBLIC_API_URL`    | Backend URL baked into the frontend build     | `http://localhost:3000/api`   |

Inside the compose network the backend's `DATABASE_URL` is derived automatically
and points at the `postgres` service host (not `localhost`).

### Backend (`backend/.env`, for running on the host)

| Variable                | Description                          | Default        |
|-------------------------|--------------------------------------|----------------|
| `PORT`                  | Port the API listens on              | `3000`         |
| `NODE_ENV`              | `development` or `production`         | `development`  |
| `DATABASE_URL`          | PostgreSQL connection string         | —              |
| `JWT_ACCESS_SECRET`     | Secret for signing access tokens     | —              |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry                  | `15m`          |
| `JWT_REFRESH_SECRET`    | Secret for signing refresh tokens    | —              |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token expiry                 | `7d`           |
| `CORS_ORIGINS`          | Comma-separated allowed origins      | `http://localhost:3001` |

Example `DATABASE_URL` (host → Dockerized DB):
```
postgresql://myuser:mypassword@localhost:5432/pos_system?schema=public
```

### Frontend (`frontend/.env.local`)

| Variable              | Description              | Default                        |
|-----------------------|--------------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL     | `http://localhost:3000/api`    |

---

## API Documentation

Swagger UI is available (non-production) at:

```
http://localhost:3000/api/docs
```

All routes require a **Bearer token** (JWT) unless marked public. Obtain a token via `POST /api/auth/login`.

### API modules

`auth`, `users`, `stores`, `categories`, `brands`, `attributes`, `products`,
`inventory`, `suppliers`, `purchase-orders`, `transfers`, `tax-rates`,
`discounts`, `customers`, `orders`, `compensation`, `reports`.

Most resource modules follow the standard REST shape
(`GET/POST /api/<module>`, `GET/PATCH/DELETE /api/<module>/:id`).

---

## Database Schema

Prisma schema: `backend/prisma/schema.prisma`. High-level relationships:

```
Store ─┬─< User ─< EmployeeCompensationPayout
       ├─< InventoryLevel >─ ProductVariant
       ├─< StockMovement
       ├─< PurchaseOrder >─ Supplier
       ├─< StockTransfer (from/to Store)
       └─< Order ─< OrderItem >─ ProductVariant
                └─< OrderAdjustment (returns / exchanges)

Category (self-nesting) ─< Product ─< ProductVariant >─< VariantAttributeValue >─ AttributeValue >─ Attribute
Brand ─< Product
TaxRate ─< Product / Category
Discount ─< Order / OrderItem  (LINE_ITEM discounts pinned to variants)
Customer ─< Order
```

| Model                        | Key Fields                                                         |
|------------------------------|--------------------------------------------------------------------|
| Store                        | id, name, code (unique), currency, receiptCounter                  |
| User                         | id, email, password (hashed), role, storeId, baseSalary, commissionPercent |
| Category                     | id, name, code, parentId, taxRateId                                |
| Brand                        | id, name                                                           |
| Product                      | id, name, sku (unique), type (SIMPLE/VARIABLE), categoryId, brandId, taxRateId |
| ProductVariant               | id, productId, sku (unique), barcode (unique), price, cost         |
| Attribute / AttributeValue   | reusable attribute definitions composed into variants              |
| InventoryLevel               | storeId, variantId, quantity, reserved, reorderPoint               |
| StockMovement                | storeId, variantId, type, quantity (signed), reference             |
| Supplier / SupplierProduct   | supplier catalog with cost + lead time                             |
| PurchaseOrder / …Item        | poNumber, supplierId, storeId, status, ordered/received quantities |
| StockTransfer / …Item        | transferNumber, from/to store, status, received quantities         |
| TaxRate                      | name, rate, isInclusive                                            |
| Discount / DiscountVariant   | type, scope (ORDER/LINE_ITEM), value, optional coupon code         |
| Customer                     | id, fullName, phone, email                                         |
| Order                        | id, storeId, cashierId, salespersonId, customerId, status, totals  |
| OrderItem                    | orderId, productId, variantId, quantity, pricing + snapshots       |
| OrderAdjustment + items      | returns / exchanges / sale adjustments with restock flag           |
| EmployeeCompensationPayout   | userId, period, baseSalary, commission, status                     |

---

## User Roles

Roles come from the Prisma `Role` enum: `ADMIN`, `MANAGER`, `CASHIER`, `EMPLOYEE`.

| Role       | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| `ADMIN`    | Full access — stores, users, catalog, inventory, purchasing, compensation, reports |
| `CASHIER`  | POS terminal, orders, customers, and read access to catalog/inventory       |
| `EMPLOYEE` | Sales-floor staff credited as **salesperson** on orders; earns base salary + commission. Not a back-office UI role |
| `MANAGER`  | **Deprecated** — hidden for new users but still honored for existing accounts (catalog/inventory management, dashboard) |

## License

Copyright (c) 2026 Abdul Samad. All rights reserved. 

This project is strictly for portfolio demonstration purposes. 
No part of this project may be copied, modified, or distributed 
without explicit written permission from the author.
