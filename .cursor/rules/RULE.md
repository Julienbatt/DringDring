# Cursor Rules - DringDring

## Commands
- Frontend dev: `cd frontend; npm run dev`
- Frontend lint: `cd frontend; npm run lint`
- Backend dev: `cd backend; uvicorn app.main:app --reload --port 8017`
- Backend tests: `cd backend; python -m pytest tests -v`

## Code style
- Prefer existing patterns in `backend/app/routes` and `frontend/app/(protected)`.
- Keep SQL migrations idempotent (IF EXISTS / CREATE IF NOT EXISTS).
- Keep new files ASCII unless the file already uses non-ASCII.

## Workflow
- Update `agent.md` with a short log of debugging changes.
- After multi-file edits, run relevant lint/tests.
- For UI changes, verify core roles: super_admin, admin_region, hq, shop, client.
