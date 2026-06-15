# POS System — Frontend

Next.js web application for the POS system. Connects to the NestJS backend API.

---

## Tech Stack

- **Framework**: Next.js v16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS v4, Lucide React icons
- **Server state**: TanStack Query (React Query)
- **Client state**: Zustand
- **Forms/validation**: React Hook Form + Zod
- **HTTP**: Axios
- **Notifications**: react-hot-toast
- **Auth storage**: js-cookie

---

## Prerequisites

- Node.js v20+
- Backend API running (see `../backend/README.md`)

---

## Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Create environment file
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000/api' > .env.local

# Start development server
npm run dev
```

App runs at `http://localhost:3001`

---

## Docker

A multi-stage `Dockerfile` (Next.js standalone output) is included and is wired
into the **root** `docker-compose.yml`, which runs the full stack
(Postgres + backend + frontend). From the repository root:

```bash
docker compose up -d --build      # frontend served at http://localhost:3001
```

`NEXT_PUBLIC_API_URL` is passed as a build arg and baked into the client bundle,
so it must be a host-reachable URL (`http://localhost:3000/api`). See the root
`README.md` for full Docker instructions.

---

## Environment Variables

| Variable              | Description           | Example                        |
|-----------------------|-----------------------|--------------------------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL  | `http://localhost:3000/api`    |

---

## Scripts

| Script          | Description                    |
|-----------------|--------------------------------|
| `npm run dev`   | Development server (port 3001) |
| `npm run build` | Production build               |
| `npm run start` | Start production server        |
| `npm run lint`  | ESLint                         |

---

## Project Structure

```
src/
├── app/                       # Next.js App Router — thin route shells
│   ├── (dashboard)/           # Authenticated route group
│   │   ├── dashboard/
│   │   ├── pos/
│   │   ├── orders/
│   │   │   └── [id]/adjust/
│   │   ├── products/          categories/        brands/
│   │   ├── inventory/         suppliers/         purchase-orders/
│   │   ├── transfers/         customers/
│   │   ├── stores/            users/             compensation/
│   │   ├── reports/           settings/
│   │   ├── unsupported-role/
│   │   └── layout.tsx
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                    # Shared presentational primitives
│   │                          # Button, Input, Select, Modal (+ ModalActions),
│   │                          # Badge, LoadingSpinner, DataTable, TableSkeleton,
│   │                          # TablePagination, FormField, FormSelect
│   ├── layout/                # App chrome — PageLayout, Sidebar, TopBar
│   ├── stores/                # Per-module feature components
│   ├── categories/            #   <Module>Table.tsx + <Module>FormModal.tsx
│   ├── products/              #   (products also has VariantEditor, ProductDetailModal)
│   ├── users/
│   ├── orders/                # OrdersTable, OrderDetailView, OrderAdjustForm
│   ├── pos/                   # ProductGrid, CartPanel, VariantPicker
│   ├── compensation/          # CompensationSummary, PayoutModal
│   └── dashboard/             # DashboardMetrics
│
├── hooks/                     # One folder per module; one file per hook
│   ├── shared/                # usePaginatedQuery, useErrorToast, useDebouncedValue
│   ├── stores/                # useStoresQuery, useCreateStore, useUpdateStore, ...
│   ├── categories/
│   ├── products/
│   ├── users/
│   ├── orders/
│   ├── pos/                   # useCart, usePosProductSearch, useCheckout
│   ├── compensation/
│   └── dashboard/
│
├── types/                     # Domain entity types (one file per module)
│   ├── shared.ts              # Role, OrderStatus, PaymentMethod, Paginated<T>, ...
│   └── store.ts, category.ts, product.ts, user.ts, order.ts,
│       pos.ts, compensation.ts, dashboard.ts
│
├── schemas/                   # Zod schemas (form-data types inferred via z.infer)
│   ├── shared.ts              # Reusable primitives (priceSchema, skuSchema, ...)
│   └── store.ts, category.ts, product.ts, user.ts, order.ts,
│       pos.ts, compensation.ts
│
├── lib/
│   ├── api.ts                 # Axios client + interceptors
│   ├── api-endpoints.ts       # Endpoint catalog
│   ├── api-utils.ts           # parseApiError()
│   ├── input-utils.ts         # Keystroke sanitizers
│   ├── badge-helpers.ts       # Status/role → badge variant mappers
│   ├── product-form.ts        # Variant pricing summary helpers
│   ├── route-access.ts        # APP_ROUTES, canAccessPath, canWrite, writeRoles
│   └── providers.tsx          # QueryClientProvider + toast provider
│
├── store/
│   └── auth-store.ts          # Zustand auth store
│
└── proxy.ts                   # Next.js middleware — auth + role-based route guard
```

---

## Authentication Flow

1. User logs in via the login page — credentials sent to `POST /api/auth/login`
2. Access token and refresh token are stored in cookies
3. Axios interceptor attaches the access token to every request
4. On 401, the interceptor uses the refresh token to get a new access token
5. On refresh failure, the user is redirected to the login page

---

## User Roles

Route access is enforced by `src/lib/route-access.ts` (and the `proxy.ts`
middleware). Each role lands on a default route after login; roles without a
matching route are sent to `/unsupported-role`.

| Role      | Access                                                                       |
|-----------|------------------------------------------------------------------------------|
| ADMIN     | Full access to all modules                                                   |
| CASHIER   | POS terminal, orders, customers; read access to products/categories/inventory |
| EMPLOYEE  | Sales-floor/commission role — no dashboard UI access (`/unsupported-role`)    |
| MANAGER   | **Deprecated** — still honored for existing accounts (catalog, inventory, dashboard) |
