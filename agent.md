# Agent Debug Log

Purpose: track debugging changes and decisions. Read this before starting new work.

## 2026-01-05
- Normalized frontend API base usage to `API_BASE_URL` and updated billing/report pages to use it.
- Simplified shop navigation by removing duplicate "Nouvelle course" and "Mes courses".
- Redirected `/shop/new-delivery` and `/shop/deliveries` to `/dashboard`.
- Redirected `/admin/shops/new` and `/admin/shops/[shopId]` to `/admin/shops` to unify create/edit flow.
- Fixed garbled labels in client dialog ("Mettre a jour", "Creer Client").
- Restarted backend on `127.0.0.1:8016` and frontend on `127.0.0.1:3000`; health checks returned 200.
- Added geo + CO2 scaffolding: new migration for lat/lng and delivery distance, LV95->WGS84 conversion, OSRM routing with haversine fallback, and payload wiring for shop/client/address selection.
- Restarted backend on `127.0.0.1:8016` and verified new geo columns exist in `shop`, `client`, and `delivery`.
- Investigated missing `distance_km`/`co2_saved_kg`: most shops had no address/lat-lng; only "Chez Mario" had coordinates.
- Updated delivery creation to geocode missing shop/client coordinates and persist them when possible.
- Hardened `backfill_geo.py` with Swiss lat/lng validation, address cleanup, batch commits, and ClientCursor (Supabase pooler avoids prepared stmt errors).
- Ran full geo backfill (clients 400 updated, deliveries 7 updated; shops unchanged due to missing addresses).
- Fixed HQ report crash when `/reports/hq-billing` returns `{month, rows}` by handling object vs array in `HqReport`.
- Fixed HQ billing shop list to filter by `hq_id` (avoids showing independent shops in HQ reports).
- Added `hq_id`/`hq_name` to HQ billing payloads and filtered HQ billing UI by `user.hq_id`.
- Added automatic creation of the `billing-pdf` storage bucket when uploading PDFs (avoids 404 bucket not found).
- Clarified billing logic with user: client pays at shop (shop keeps), admin_region invoices commune + HQ; if HQ exists then shop share = 0 and HQ pays admin share.
- Aligned tariff snapshot: fold `share_shop` into `share_admin_region` (no separate shop share).
- HQ reporting updated to show only HQ dues and remove freeze action (CSV/PDF only).
- HQ billing exports now compute HQ share when HQ user requests, while admin_region/super_admin keep combined totals.

## 2026-01-10
- Dispatch assign now marks deliveries as `delivered` immediately (simplified flow).
- Dispatch UI reflects delivered status on assignment and keeps tabs in sync.
- Courier dashboard is now read-only (no pickup/delivery actions) with simpler status display.
- HQ billing/report pages remove freeze language; PDF exports no longer include `_FROZEN` in filenames.
- Restarted backend on `127.0.0.1:8016` (health 200) and frontend on `127.0.0.1:3000` (HTTP 200).
- Fixed courier dashboard status styling after simplification (no more stray status strings in class names).
- Replaced `share_shop` with `share_admin_region` across billing queries, PDFs, and frontend billing tables.
- Added HQ shops endpoint `/shops/hq` and replaced the HQ shops page with a filtered list view.
- Added JWT `app_metadata` fallback in `resolve_identity` for missing/incomplete profiles.
- Dispatch list now reads fixed columns directly (no `information_schema` checks).
- Geocoding now runs after a DB commit to avoid holding open transactions.
- Tariff dialog maps `bags_price` to backend `bags` rule_type.
- Backend restarted on `127.0.0.1:8017` and frontend on `127.0.0.1:3000`; updated `NEXT_PUBLIC_API_URL` to port 8017.
- Added Cursor agent best-practice scaffolding: `.cursor/rules/RULE.md`, `.cursor/commands/{review,debug,pr}.md`, and `.cursor/plans/PLAN_TEMPLATE.md`.
- Shop dashboard cleanup: address formatting avoids duplicate NPA/city, removed CMS checkbox and frozen-periods list.
- Added PDF logo helper and embedded logo in shop/city/hq/client PDFs.
- Switched QR payload generation to `qrbill` (Swiss QR Bill spec) with fallback, and adjusted QR size.
- HQ monthly PDF now shows only HQ due per shop and filters by HQ when generating.
- Shop monthly PDF no longer includes payment QR (report-only to avoid incorrect billing).
- Admin billing UI split into tabs (independent shops, HQ, communes) with HQ PDF download support.
- Admin billing labels normalized (PDF buttons and "Commune partenaire" headers).
- Admin billing delivery detail table now uses "Commune partenaire" label.
- Admin billing labels: "Magasin" -> "Commerce" for consistency.
- Harmonized "Magasin" -> "Commerce" labels across admin, HQ, city, shop, tariffs, login UI, and PDF report labels.
- Normalized remaining UI copy using "Commerce" (super users, shop dialog, shop report/HQ report filenames, admin region dashboard, tariff share labels, shop billing download name).
- Renamed remaining "Ville" labels to "Commune partenaire" across UI, CSV headers, and PDF reports (shop/HQ/city).
- Updated admin billing detail header and backend PDF/export labels to use "Commune" naming consistently (including filename base).
- Added migration for commune (city) admin fields and updated UI label to ASCII "Telephone" to avoid encoding artifacts.
- Admin billing ZIP download now handles empty periods gracefully (shows info toast instead of throwing).
- Added city_id to HQ billing payloads, added commune PDF action in admin billing, and allowed HQ monthly PDFs without full freeze (provisional export) with clearer UI feedback.
- Added commune/zone hierarchy support (parent city + NPA mapping), extended city admin UI, and grouped billing by parent commune.
- Added hierarchical rendering on Communes partenaires page (parent communes with zones, orphans section) and cleaned garbled labels to ASCII.
- City dialog now uses functional updates for parent/canton selects and ASCII button label; cities API now enforces parent_city_id column presence and raises if update is blocked (rowcount 0).
- Restarted backend on 8017; health check OK at /api/v1/health.
- City role can now manage zones: added admin-or-city guard, city-scoped list/create/update, and city-safe delete for child communes. City dialog enforces parent for city users and adds delete action; sidebar exposes Communes partenaires for city role.
- Delivery creation now resolves commune/zone from postal code when available, allows zone under the shop commune, and falls back to the selected city when NPA is unmapped. Shop delivery validation accepts clients in child zones and records delivery city as the client zone.
- Restarted backend on 8017 after city/zone and delivery updates; health check OK.
- Restarted backend (8017) and frontend (3000); health checks OK for both.
- Fixed indentation in reporting HQ PDF handler and restarted backend on 8018; health check OK. Updated frontend API base to 8018.

## 2026-01-11
- Marked `frontend/app/(protected)/layout.tsx` as `dynamic = 'force-dynamic'` to avoid static prerender warnings on auth-protected routes (e.g., `/admin/cities`).
- Removed NPA input from commune dialog UI (keeps NPA mapping backend-only) and only sends postal codes when present.
- Made `cities` update preserve `parent_city_id` unless explicitly provided (prevents accidental reset) and updates parent only when requested or for city-role edits.
- Forced dynamic rendering on `frontend/app/(protected)/admin/cities/page.tsx` to stop static-route warnings in dev.
- Restarted backend on `127.0.0.1:8018` and frontend on `127.0.0.1:3000` for commune/zone fixes; backend health OK, frontend listening on 3000.
- Added HQ CRUD endpoints under `/shops/hqs` and added admin HQ management page and sidebar link.
- Added shop delete endpoint and UI delete action in the commerce dialog.
- Shop creation now optionally creates an auth user (email_confirm=true) with default password from config and app_metadata role `shop`.
- Added VAT note to payment PDF blocks ("Montants TTC (TVA 8% incluse)").
- Added HQ CRUD UI (`/admin/hqs`) and endpoints; added shop deletion endpoint and default shop-user provisioning.
- Added migration `backend/migrations/update_security_v33.sql` to allow admin_region/super_admin to manage HQ records under RLS.
- Rebuilt `frontend/app/(protected)/admin/shops/components/ShopDialog.tsx` to fix encoding corruption, add delete, and show shop-account creation info.
- Added VAT breakdown to payment PDFs (HT, TVA 8%, TTC) instead of a simple note.
- Fixed corruption in `frontend/app/(protected)/admin/hqs/page.tsx` (broken ternaries, session var, table keys).
- Fixed corruption and typos in `frontend/app/(protected)/admin/hqs/components/HqDialog.tsx` (props, session guard, ternaries, confirm text).
- Added fetch error context in `frontend/lib/api.ts` to log URL and underlying message when network fetch fails.
- Added HQ contact fields (address/contact/email/phone) to API and HQ dialog, plus a migration to add columns to `hq`.
- Shop creation now surfaces Supabase auth user creation errors in UI to explain missing users.
- HQ dialog now uses the same Swiss address autocomplete pattern as other entities and enforces a required address; HQ API enforces address as required.
- Aligned HQ list UI with commerce list layout (address/contact columns, icons, search hint, count header).
- Ran terminal checks as admin_vs: backend health OK, created a test shop with email and auth user was created (user_created true, auth user found).
- Compared shop emails vs Supabase auth users: 9 shop emails missing in auth (examples include info@vetvissigen.ch, info@delgenio.ch).
- Billing API test `/reports/hq-billing?month=2025-12` returns HTTP 500 (still unresolved).
- Added `backend/scripts/backfill_shop_users.py` to create missing auth users for shops with emails.
- Ran backfill: scanned 11 shops, created 9 auth users, 0 failures.
- Added `backend/scripts/backfill_shop_roles.py` to sync shop roles into auth app_metadata and profiles.
- Ran shop-role backfill: updated 11 auth users, updated 11 profiles (role/shop_id/admin_region_id/city_id/hq_id).
- TODO (prod/Vercel): enforce first-login password change for newly provisioned users (keep in mind for deployment).
- Removed the month selector from the shop deliveries screen (use current month implicitly).
- Fixed shop billing periods query to use `frozen_comment` (billing_period had no `comment` column).
- Added `backend/migrations/update_billing_period_comment_v35.sql` to add legacy `comment` column and backfill from `frozen_comment`; applied it to fix `/deliveries/shop/periods` 500.
- Fixed indentation in `/deliveries/shop/periods` handler that caused backend crash after reload.
- Shop dashboard now strips `?month=` from the URL when present (no functional change to API calls).
- HQ billing query now groups by `city_id` and `parent_city_id` to avoid SQL aggregation errors.
- HQ billing API verified OK on a clean backend instance; switched frontend API base to `http://127.0.0.1:8020/api/v1` to avoid stale/zombie 8018 listeners.

## 2026-01-18
- Dispatch UI cleanup: removed "En cours" tab (todo/done only) and added operations-of-the-day metrics plus an operations journal panel with quick actions.
- Dispatch assignment now opens WhatsApp automatically after a courier is assigned.
- Normalized dispatch UI labels and removed non-ASCII glyphs from dispatch text strings for consistency.
- Added `table-scroll` utility for safe horizontal scrolling on small screens and applied it to dispatch, admin billing, admin shops, and communes/zone tables.
- Added compact sidebar mode for smaller screens (icons only, labels on xl) and condensed table columns with mobile summaries in dispatch, commerces, and communes partner pages.
- Hid low-priority billing detail columns (Adresse/NPA) under xl to reduce cramped layouts on smaller screens.
- Adjusted sidebar breakpoint from xl to lg so menu labels and full logo show on typical desktop widths.
- Added courier import script for `docs/Import_Coursiers.csv` and imported 32 couriers into the Velocite Valais admin region.
- Updated city update auth: admin_region can reassign zones when the parent commune belongs to their region (also backfills admin_region_id if missing).

## 2026-01-18 (cont.)
- Fixed admin-region city update/delete auth comparison (UUID vs string) in `backend/app/routes/cities.py` to resolve false 403s.
- Restored admin-region eco metrics (deliveries, km, CO2) on `/dashboard` by adding `useEcoStats` cards to `frontend/app/(protected)/dashboard/components/AdminRegionDashboard.tsx`.
- Restarted backend on 8020 (PID 10656) and frontend on 3000 (PID 30400) after city auth + admin-region dashboard updates.
- Added preview-mode support for admin billing exports and PDFs (shop/city/client) and added preview toggle in admin billing UI to bypass freeze without breaking WORM.
- Added preview PDF generation for shop/hq/city/client with explicit provisional status in PDF outputs.
- Updated VAT breakdown to 8.1% (amount HT/TVA/TTC and labels) in payment details.

## 2026-01-18 (cont. 2)
- Added configurable VAT settings: new `app_settings` table migration with RLS and default 0.081 rate, plus `/settings/vat-rate` endpoints for super_admin.
- Wired settings router in `backend/app/main.py` and added super_admin VAT UI in `frontend/app/(protected)/settings/page.tsx`.
- VAT rate now pulled per month from `app_settings` and passed into HQ/city/client PDF generators; fixed city monthly PDF indentation.
- Added VAT rate handling to payment flowables and PDF generators to compute HT/TVA/TTC dynamically.
- Fixed backend startup crash by aliasing the settings route import (`settings_routes`) to avoid shadowing config `settings`.
- Restarted backend on `127.0.0.1:8020`; health check OK after the alias fix.
- Normalized IBAN input for QR bills (strip spaces/non-alphanumeric) to ensure Swiss QR codes validate reliably in PDFs.
- Fixed QRBill usage by passing address dicts (not StructuredAddress objects) and added a Swiss cross overlay in the QR code drawing for PDFs.
- Sidebar labels/logo now appear at md+ widths and sidebar width increases at md to avoid compressed logo and missing labels.
- Admin billing UI: added period-wide totals (TTC/TVA/HT) and renamed "Part entreprise regionale" to "Part HQ/commerce"; clarified table headers to "Montant facture (TTC)".
- VAT rate read endpoint now allows admin_region/super_admin (GET /settings/vat-rate uses require_admin_user).
- Admin billing UI now silently falls back when VAT rate endpoint returns super_admin-only (avoids console error for admin_region).
- Commune PDF billing table simplified: removed Total CHF and Part entreprise regionale columns; totals now focus on commune amount only.
- QR bill generation upgraded: prefer full Swiss QR bill SVG via qrbill.as_svg + svglib (fallback to QR code with Swiss cross), and added svglib to backend requirements.
- Fixed QR bill SVG generation to use text-mode SVG output (StringIO -> bytes) so qrbill renders correctly instead of always falling back.
- Sidebar responsive tweaks: labels show from `sm` breakpoint, wider sidebar at `sm`, and less logo compression at small widths.
- Admin billing VAT fetch now ignores any 403/access-required errors and falls back silently.

## 2026-01-19
- Admin billing invoices now use the unified recipient invoice template for communes, HQ, and independent commerces (per-delivery list + amount due only).
- `shop-monthly-pdf` preview now renders an invoice for independent shops (share admin_region) and keeps a statement format for shops under an HQ.
- Preview bypasses stored PDFs so updated templates show even if a period was previously frozen.
- Payment QR rendering now always uses the Swiss QR payload with a guaranteed Swiss cross overlay (skips SVG rendering that dropped the cross).
- Admin billing detail table simplified to show only the amount due for the active tab (commune vs HQ/commerce).

## 2026-01-20
- Restarted backend on 8020 and frontend on 3000 for billing validation.
- API tests as admin_vs (password): `/reports/hq-billing` and `/reports/hq-billing-deliveries` returned 200.
- HQ PDF and commune PDF generated successfully for 2025-12 and 2026-01 (preview mode).
- No independent-shop deliveries found for 2025-12 or 2026-01, so independent shop PDF returned 404 "No deliveries for this period".
- Restarted frontend via PowerShell (npm run dev) and confirmed port 3000 listening (PID 27968).

## 2026-01-20 (cont. 3)
- Strengthened Swiss QR rendering by using ReportLab QR with error correction level H to tolerate the Swiss cross overlay.
- Independent shop detection now treats "Indep" HQ labels as independent in `/reports/shop-monthly-pdf` (preview and frozen output).
- Frozen invoices for independent shops now use the unified recipient invoice template (share admin_region) during freeze processing.
- Admin billing ZIP for independent shops now generates unified invoice PDFs in both preview and frozen modes.
- Admin billing header now includes a "PDF commerces independants (ZIP)" action wired to `/reports/admin-billing/zip`.

## 2026-01-21
- Added payor-centric billing tables migration `backend/migrations/update_billing_documents_v37.sql` (billing_run, billing_document, billing_document_line with RLS).
- Added payor-centric billing aggregator `backend/app/core/billing_aggregator.py` and `/billing/region/aggregate` endpoint to build billing_run + billing_document + billing_document_line.
- Added migration `backend/migrations/update_security_v38.sql` to enable RLS and policies for `city_postal_code`.
- Applied `backend/migrations/update_security_v38.sql` to enable RLS on `public.city_postal_code`.
- Rewired admin billing UI to the new payor-centric documents list/lines and simplified the detail table to show only amount due (no address/NPA columns).
- Admin billing detail filter now targets recipients (communes/HQ/commerces) and resets on tab switch; removed unused client-side fields from the detail view.
- Swiss QR bill renderer: corrected garbled labels to ASCII French/German and raised QR error correction to H for the Swiss cross overlay.
- Added billing reference helpers (RF with check digits, QRR for QR-IBAN) and wired per-region creditor overrides in shop freeze and payor-centric billing PDFs.
- Added admin_region billing fields migration for per-region creditor details in QR invoices.
- Added migration `backend/migrations/update_billing_documents_v40.sql` to snapshot creditor/reference details on billing documents.
- Updated `backend/app/core/billing_aggregator.py` to store creditor snapshots + references and to parse admin-region addresses robustly.
- Fixed `backend/app/routes/billing.py` indentation, added snapshot usage, and hardened address parsing for leading house numbers.
- Added `backend/scripts/test_billing_reference.py` to validate RF/QRR reference generation logic.
- Restored `backend/app/pdf/invoice_report.py` as a compatibility wrapper that routes all recipient invoice PDFs through the Swiss QR bill template.
- Swiss QR bill rendering now omits the debtor section when address data is missing to avoid empty "Payable by" blocks.
- Fixed a mis-indented filename assignment in `backend/app/routes/reporting.py` that caused an ImportError in CLI billing tests.
- Fixed `freeze_shop_billing_period` to use `city_postal_code` (LATERAL join) instead of a non-existent `city.postal_code`.
## 2026-01-21 (cont.)
- Courier update now relies on row-level filter (admin_region_id) instead of manual region mismatch checks to avoid false 403s; update returns 403 only if no row updated.
## 2026-01-21 (cont. 2)
- Restarted backend on 8020 and frontend on 3000 (Next dev via cmd /c npm run dev). Ports now listening.
