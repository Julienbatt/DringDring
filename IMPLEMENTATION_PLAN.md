# DringDring — Implementation Plan

This plan breaks down the work to deliver the product described in `VISION.md`, organized by phases with concrete tasks, deliverables, and acceptance criteria.

## Phase 0 — Project Setup and Governance

- Repository structure
  - Create two separate projects: `frontend/` (Next.js + TS + Tailwind) and `backend/` (Python + FastAPI)
  - Shared `docs/` for specs and diagrams; `infra/` for deployment manifests
- Tooling and quality gates
  - Prettier + ESLint (frontend), Ruff/Black + mypy (backend)
  - Commit hooks via Husky (frontend) and pre-commit (backend)
  - CI: GitHub Actions for lint, type-check, unit tests on PRs
- Secrets management
  - Use `.env.local` for frontend; `.env` for backend (never commit)
  - Configure Firebase credentials and service account via environment variables / GitHub Actions secrets
- Deliverables
  - Repo initialized with readmes and basic CI checks green

## Phase 1 — Authentication and Identity

- Firebase project setup
  - Enable Email/Password and Google providers (as needed)
  - Create service account for backend token verification and Firestore access
- Frontend auth
  - Initialize Firebase SDK
  - Implement sign up / sign in pages with Firebase Auth
  - Session persistence; redirect to app if already logged in
- Backend auth
  - Add Firebase Admin SDK to FastAPI
  - Implement dependency to verify ID token on each protected route
  - Define user roles: `shop`, `client`, `admin` (claims or role mapping collection)
- Acceptance
  - Auth e2e: users can sign up/in; protected API returns 401 without token and 200 with valid token

## Phase 2 — Data Model and Firestore Schema

- Core collections (Cloud Firestore)
  - `shops`: profile, contacts[<=10], departments[1..10]
  - `clients`: profile, address details, CMS flag
  - `deliveries`: shopId, clientId, employee, sector, ticketNo?, amount?, todayFlag, startWindow, bags[0..20], status, createdAt, updatedAt
  - `globalDeliveries`: mirror of `deliveries` plus shop name for owner visibility
  - `roles` (optional): userId -> role mapping if not using custom claims
- Indexes
  - Composite indexes for common queries: by shopId+date, by clientId+date, by todayFlag
- Validation
  - Define TypeScript and Python models with validation (Pydantic schemas)
  - Swiss specific validators: NPA, phone formats
- Acceptance
  - Read/write tests for each collection; Firestore security rules drafted

## Phase 3 — Backend API (FastAPI)

- Project scaffolding
  - Routers: `auth`, `shops`, `clients`, `deliveries`, `reports`
  - Pydantic models for request/response; error handling middleware
- Endpoints (illustrative set)
  - Shops: create/read/update profile; manage contacts and departments
  - Clients: create (shop-initiated), read; admin-only edit/delete
  - Deliveries: CRUD; ensure write-through to `globalDeliveries`
  - Reports: aggregates by day/month/year; fields: Date, Ticket no, Montant, #Sacs, Secteur, CMS
- Consistency strategy
  - Use Firestore transactions or outbox pattern to keep `deliveries` and `globalDeliveries` in sync
- Security
  - Verify ID token; enforce role-based access at route level
- Acceptance
  - API contract documented (OpenAPI); unit tests for core flows; Postman collection running green

## Phase 4 — Frontend App (Next.js + TS + Tailwind)

- App shell and routing
  - Public routes: `/login`
  - Protected routes: `/shop`, `/shop/livraison`, `/shop/clients`, `/client`, `/admin` (as needed)
  - Guarded routes via Firebase Auth state
- Shop main menu page
  - Buttons: “Livraison +”, “Clients +”, “Edit profile”
  - “Livraisons en cours” editable table (today and future)
- Livraison + page
  - Client autocomplete (search by name/family name)
  - Fields: Employé(e), Secteur?, Ticket no?, Montant?, Livraison aujourd’hui, À partir de (08:00–20:00, 30min steps), Nombre de sacs (0–20)
  - Submit → calls backend to create delivery (and mirrors to global)
- Clients + page
  - Create new client; show note that edits/deletes are admin-only
- Edit profile page
  - Manage contacts (<=10) and departments (1–10)
- Client dashboard
  - Past deliveries visualization; upcoming deliveries table
- Acceptance
  - Key user journeys clickable in the browser; basic accessibility and responsive layout

## Phase 5 — CSV Imports and Storage

- Use Firebase Cloud Storage to upload CSVs (shops, clients)
- Backend parsing endpoints
  - Validate records; batch write to Firestore with error reporting
- Frontend upload UI (admin / shop as appropriate)
- Acceptance
  - Sample CSVs import successfully; invalid rows reported clearly

## Phase 6 — Reporting and Analytics

- Backend aggregation endpoints
  - By year/month/day with required columns
  - Optimize with pre-computed daily summaries if needed
- Frontend reporting views
  - Shop view: summaries and filters
  - Client dashboard: past deliveries charts
- Acceptance
  - Reports match dataset with test fixtures; performance acceptable on sample scale

## Phase 7 — Security, Rules, and Hardening

- Firestore security rules
  - Shops can access only their records; clients only theirs; admin global
- Rate limiting and input validation
- Audit logging for critical actions (delivery create/update/delete)
- Acceptance
  - Security tests and rule emulation pass

## Phase 8 — Observability and Operations

- Logging and tracing (backend): structured logs; request IDs
- Error reporting: Sentry (frontend/backend)
- Metrics: basic endpoint latencies, error rates
- Acceptance
  - Dashboards exist; error is captured end-to-end during test

## Phase 9 — Deployment

- Environments: dev, staging, prod
- Backend: deploy FastAPI (e.g., Fly.io, Railway, or Cloud Run)
- Frontend: Vercel or Firebase Hosting
- CI/CD pipelines for automatic deploys on main branch
- Acceptance
  - Staging mirrors production config with test data; zero-downtime deploys

## Phase 10 — UAT and Launch

- Seed data and UAT scripts for shops and clients
- Feedback rounds; fix critical issues
- Production data migration (if any), cutover plan
- Acceptance
  - Sign-off from stakeholders; issue tracker at zero criticals

---

## Milestones and Estimates (high level)

- M1 (Weeks 1–2): Setup, Auth baseline, Schema drafted
- M2 (Weeks 3–4): Backend CRUD + reporting skeleton, Frontend shell and shop flows
- M3 (Weeks 5–6): Client dashboard, CSV imports, security rules
- M4 (Weeks 7–8): Observability, performance pass, deployments, UAT, launch prep

## Risks and Mitigations

- Firestore consistency between `deliveries` and `globalDeliveries`
  - Mitigation: transactions or reliable outbox + retry worker
- Validation of Swiss formats
  - Mitigation: shared validators and unit tests with real-world samples
- Role enforcement
  - Mitigation: centralize RBAC checks; test matrix across routes

## Documentation Deliverables

- API reference (OpenAPI), Postman collection
- Data dictionary and Firestore indexes list
- Security rules documentation and access matrix
- Runbooks for deployments and incident response


