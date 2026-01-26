# Runbook (Production Debug)

## First checks
1. Backend health: `/api/v1/health`
2. Auth: login to confirm JWT + RLS
3. Billing: `/api/v1/settings/vat-rate?month=YYYY-MM`

## Logs
- Vercel: Project -> Deployments -> Logs
- Render: Service -> Logs
- Supabase: Database -> Logs (queries/locks)

## Common issues
- **Frontend calls localhost:** `NEXT_PUBLIC_API_URL` not set on Vercel.
- **CORS blocked:** Vercel domain missing in backend `CORS_ORIGINS`.
- **PDF errors:** missing billing creditor env vars.
- **Billing 404/409:** period frozen or missing migrations/views.

## Safe debug approach
1. Reproduce locally with the same month and role.
2. Add temporary logs or enable verbose logging via env flag.
3. Deploy a small fix; avoid editing production DB manually.

## Rollback
Use GitHub/Vercel/Render rollback to last stable commit.

