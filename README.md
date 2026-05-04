# QUIZZERA

Monorepo layout for the QUIZZERA platform: API-first, role-based, taxonomy-driven, entitlement-controlled services behind a gateway, with a Next.js/React frontend per the unified master development guide.

## Repository layout

| Path | Role |
|------|------|
| `quizzera/gateway/` | API gateway / edge routing to backend services |
| `quizzera/frontend/` | Public app, dashboards, admin, CMS surfaces |
| `quizzera/services/auth-service/` | Identity, sessions, token validation (e.g. Firebase identity; DB remains source of truth for roles, plans, entitlements) |
| `quizzera/services/user-service/` | Profiles, roles mapping, account status, preferences |
| `quizzera/services/taxonomy-service/` | Exam body → subject → topic hierarchy powering MCQs, exams, search, SEO, recommendations |
| `quizzera/services/mcq-service/` | MCQ bank as master assessment content source |
| `quizzera/services/exam-service/` | Exam generation, attempts, evaluation, analytics hooks |
| `quizzera/services/notification-service/` | Email, in-app, billing and session alerts |

Additional services from the master spec (MENTIS, mentor, resources, billing, entitlements, CMS/SEO, analytics) can be added under `quizzera/services/` as they are implemented.

## Local orchestration

From `quizzera/`, run `npm install` once, then `npm run dev` to start gateway and all backend services with **concurrently** and **nodemon** (no Docker). Use local MongoDB on `mongodb://localhost:27017` (Community install or Atlas) with per-service database names as in `.cursorrules`.

The Next.js app lives in `quizzera/frontend/`: copy `.env.example` to `.env.local`, then `npm install` and `npm run dev` (port **3006**). `/api/*` is rewritten to the gateway on `NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:3000`).

## Principles (from platform spec)

- Access and commercial truth live in services (especially entitlements and billing), not in UI state alone.
- Taxonomy and the MCQ bank are shared spines across learning, discovery, and SEO.
- Log and audit financially and academically significant actions at the service layer.
