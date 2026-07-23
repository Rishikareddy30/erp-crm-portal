# Mini ERP + CRM Operations Portal

A small internal ops portal for a wholesale/distribution company: customer CRM,
product & inventory tracking, and a sales challan flow with stock-safety logic.

## Architecture

```
erp-crm/
├── backend/     Node + TypeScript + Express + Prisma + PostgreSQL, JWT auth
├── frontend/    React + TypeScript + Vite + Tailwind CSS
├── docker-compose.yml    Local Postgres for development
└── postman_collection.json
```

**Backend**: REST API. Each module (`auth`, `customers`, `products`, `challans`) has a
`routes` file (auth + role checks + validation wiring) and a `controllers` file (business
logic). Prisma is the ORM/migration tool against PostgreSQL. Zod validates all request
bodies. A single `errorHandler` middleware turns thrown `ApiError`s (and Prisma errors)
into consistent JSON error responses.

**Frontend**: React Router for navigation, a small `AuthContext` for the JWT/session and
role checks, and an Axios instance that attaches the token to every request and redirects
to `/login` on a 401.

**Key business logic** (in `backend/src/controllers/challan.controller.ts`):
- A challan is created as **Draft** by default. Draft creation/edits never touch stock.
- **Confirming** a challan runs inside a single DB transaction: it checks stock for
  *every* line item first, and only if all items have enough stock does it decrement
  stock and write `StockMovement` (OUT) rows. If any item is short, the whole confirm
  is rejected with a `400` and a list of the specific shortages — nothing is
  partially applied.
- Stock can never go negative — the check above enforces `currentStock >= quantity` for
  every OUT movement, both in the direct stock-movement endpoint and in challan confirm.
- Challan line items store a **snapshot** of the product's name, SKU, and price at the
  time they were added, alongside the `productId`. So price changes later don't rewrite
  history.
- **Cancelling** a confirmed challan restores stock (writes IN movements) so inventory
  stays accurate; cancelling a still-Draft challan is a no-op on stock.

**Bonus delivered**: PDF export of a challan (`GET /challans/:id/pdf`, "Download PDF"
button on the challan detail page) via `pdfkit` — a single-page dispatch note with
customer details, line items, and totals, generated straight from the same snapshot
data stored on the challan.

**Roles**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`. Enforced server-side via
`requireRole(...)` middleware on each route (see the routes files for exactly who can do
what), and mirrored in the frontend by hiding actions the current user isn't allowed to
perform (a nicety, not the real security boundary — the API is the source of truth).

## Prerequisites

- Node.js 18+
- Docker (for local Postgres) — or any Postgres 14+ instance you already have

## Local setup

### 1. Start Postgres

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already wired into
`backend/.env.example` (user `erp_user`, password `erp_password`, db `erp_crm`).

If you'd rather use an existing Postgres instance, just point `DATABASE_URL` (see below)
at it instead.

### 2. Backend

```bash
cd backend
cp .env.example .env      # edit if you're not using the docker-compose Postgres
npm install
npx prisma migrate dev --name init   # creates tables
npm run seed                          # creates one user per role + sample data
npm run dev                           # starts API on http://localhost:4000
```

Seeded logins (password for all: `password123`):
| Role      | Email               |
|-----------|---------------------|
| Admin     | admin@erp.test      |
| Sales     | sales@erp.test      |
| Warehouse | warehouse@erp.test  |
| Accounts  | accounts@erp.test   |

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173` and log in with one of the seeded accounts above.

## Environment variables

**Backend (`backend/.env`)**
| Variable          | Purpose                                              |
|-------------------|-------------------------------------------------------|
| `DATABASE_URL`    | Postgres connection string                            |
| `JWT_SECRET`      | Secret used to sign/verify JWTs — set a real random value in production |
| `JWT_EXPIRES_IN`  | Token lifetime, e.g. `8h`                              |
| `PORT`            | API port (default 4000)                               |
| `CORS_ORIGIN`     | Allowed frontend origin for CORS                       |

**Frontend (`frontend/.env`)**
| Variable        | Purpose                          |
|------------------|-----------------------------------|
| `VITE_API_URL`   | Base URL of the backend API       |

Never commit real `.env` files — only the `.env.example` templates are in the repo.

## Deployment (free-tier friendly)

This was built to deploy without spending money:

- **Database**: [Neon](https://neon.tech) or [Supabase](https://supabase.com) free Postgres,
  or Render's free Postgres. Copy the connection string into `DATABASE_URL`.
- **Backend**: [Render](https://render.com) or [Railway](https://railway.app) —
  point it at `backend/`, build command `npm install && npm run build && npx prisma migrate deploy`,
  start command `npm start`. Set the env vars from the table above in the platform's dashboard.
- **Frontend**: [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — point it
  at `frontend/`, build command `npm run build`, output directory `dist`. Set `VITE_API_URL`
  to your deployed backend's URL.

AWS deployment is treated as a bonus per the brief and isn't required for functionality —
the same Docker/Node build works on an EC2 instance or Elastic Beanstalk if needed later,
using the same environment variables.

## API overview

See `postman_collection.json` for a ready-to-import collection covering every endpoint
below. Import it into Postman, set the `baseUrl` variable, log in via the `Auth` folder,
and copy the returned token into the `token` collection variable.

- `POST /auth/login`, `GET /auth/me`, `POST /auth/users` (admin only)
- `GET/POST /customers`, `GET/PUT /customers/:id`, `POST /customers/:id/notes`
- `GET/POST /products`, `GET/PUT /products/:id`, `POST /products/:id/stock-movements`
- `GET/POST /challans`, `GET /challans/:id`, `PUT /challans/:id/items`,
  `POST /challans/:id/confirm`, `POST /challans/:id/cancel`, `GET /challans/:id/pdf`
  (downloads a printable dispatch-note PDF, using the same product-name/SKU/price
  snapshot stored on the challan — so an exported PDF never drifts from what was
  actually recorded)

All list endpoints support `page`/`pageSize` pagination and relevant `search`/`status`/
`type` filters. All endpoints validate input with Zod and return `400` with a structured
`details` object on validation failure.

## Assumptions made

- "Sales challan" is treated as the dispatch document; invoicing/accounts-side documents
  (GST invoice, payments) are out of scope for this build, per the brief's focus on the
  four core modules.
- One `User` per employee, no multi-tenant/company separation (single company, per the
  brief).
- Stock adjustments outside the challan flow (damage, correction, purchase receipt) go
  through the generic stock-movement endpoint rather than a dedicated "Purchase Order"
  module, since PO management wasn't in the required modules list.
- Cancelling a **confirmed** challan restores stock automatically. This wasn't explicitly
  specified, but seemed like the only sane behavior — flagged here in case the reviewer
  expects cancellation to leave stock untouched instead.

## Known limitations / not yet done

- No automated test suite (unit/integration tests) — given the 48-hour scope, effort went
  into correct business logic and a working end-to-end flow instead.
- No product image upload to S3 (listed as a bonus in the brief).
- No CI/CD pipeline (GitHub Actions) configured yet.
- Customer/product search is a simple `contains` filter, not full-text search.
- Frontend product/customer pickers on the challan form are plain `<select>` dropdowns;
  fine at small catalog sizes but would want type-ahead search at scale.
