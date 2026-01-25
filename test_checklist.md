# Test Scenarios Checklist

This checklist covers the core scenarios for each role using the data from `backend/scripts/seed.py`.

Prerequisites
- Migrations applied (including `update_schema_dispatch_v4.sql`, `update_security_v10.sql`, `update_security_v16.sql`, `update_customer_link_v17.sql`, `update_security_v18.sql`, `update_security_v21.sql`, `update_security_v22.sql`, `update_security_v23.sql`, `update_tariff_share_v24.sql`).
- Seed data loaded via `python backend/scripts/seed.py`.
- Auth trigger installed: `python backend/scripts/setup_auth_trigger.py` (includes `client_id`).
- Test users reset via `python backend/scripts/reset_test_users.py <TEST_USER_PASSWORD>` (assigns `client_id` to customer).
  - Requires `SUPABASE_SERVICE_KEY` in `backend/.env`.
  - Optional: set `TEST_USER_DOMAINS` (default `@dringdring.ch,@ik.me`).
- Users must logout/login after reset to refresh JWT claims.
- Backend running at `http://localhost:8010`.
- Frontend running at `http://localhost:3000`.
- `NEXT_PUBLIC_API_URL` set to `http://localhost:8010/api/v1`.

Default Credentials (from `reset_test_users.py`)
| Role | Email | Password | Context |
|------|-------|----------|---------|
| Super Admin | `superadmin@dringdring.ch` | `<TEST_USER_PASSWORD>` | Global |
| Admin Region | `admin_vs@dringdring.ch` | `<TEST_USER_PASSWORD>` | Velocite Valais |
| City | `sion@dringdring.ch` | `<TEST_USER_PASSWORD>` | Sion |
| HQ | `migros@dringdring.ch` | `<TEST_USER_PASSWORD>` | Migros Valais |
| Shop | `shop_metropole@dringdring.ch` | `<TEST_USER_PASSWORD>` | Migros Metropole |
| Shop (Independent) | `shop_mario@dringdring.ch` | `<TEST_USER_PASSWORD>` | Chez Mario |
| Courier | `coursier@dringdring.ch` | `<TEST_USER_PASSWORD>` | Courier |
| Customer | `client@dringdring.ch` | `<TEST_USER_PASSWORD>` | Customer |

Scenarios by Role

1) Shop (Migros Metropole)
- Login and confirm Shop navigation.
- Create a delivery for client "Bob Standard" with 2 bags.
- Verify the delivery appears in "Mes courses" with status "created".
- Update the delivery (notes/time window) if UI allows.
- Cancel/delete the delivery if UI allows (or mark as canceled if available).
- Check billing page shows current month summary.

2) Shop (Independent / Chez Mario)
- Login and confirm Shop navigation.
- Create a delivery and confirm it appears in the shop list.
- Verify HQ-specific data is not shown.

3) Admin Region (Velocite Valais)
- Login and confirm Admin navigation.
- Dispatch: view deliveries for Sion and not for Vevey.
- Assign a courier to a delivery.
- Verify couriers list loads and can be managed (create, edit, delete).
- Verify shops page loads and is filtered to the admin region.
  - Create a shop (requires Cities + Tariffs + HQ lists).
  - Edit the shop (change HQ, tariff, address).
  - Delete or deactivate the shop if UI allows.
- Verify clients page loads and is filtered to the admin region.
  - Create a client (requires Cities list).
  - Edit client address/phone.
  - Delete or deactivate client if UI allows.
- Verify cities page loads and is filtered to the admin region.
  - Create a city (requires Canton list).
  - Edit city info.
  - Delete or deactivate city if UI allows.
- Verify tariffs page loads and is filtered to the admin region.
  - Create a tariff grid + version.
  - Edit tariff version.
  - Deactivate a tariff if UI allows.

4) Courier
- Login and confirm Courier dashboard loads.
- Confirm assigned deliveries appear for the selected day.
- Update status to "picked_up" then "delivered".
- Confirm the delivery moves to history.

5) HQ (Migros Valais)
- Login and open reports/billing page.
- Verify visibility of deliveries from "Migros Metropole" and "Migros Midi".
- Verify "Chez Mario" and "Coop Vevey" are not visible.

6) City (Sion)
- Login and open city billing page.
- Verify only Sion deliveries appear (no Vevey).

7) Super Admin
- Login and confirm Super admin dashboard shows the 4 entry cards.
- Open `Entreprises regionales de livraison` and use "Gerer" to set a region context.
- Verify admin pages load only after a region context is set.
- Exit context (Sortir) and confirm admin pages are blocked again.
- Create/edit/delete an entreprise regionale de livraison.
- Verify cantons list loads (full Switzerland list).

8) Customer
- Login and open `/dashboard` (livraisons en cours).
- Open `/customer/deliveries` (historique) and confirm past deliveries list.
- Open `/customer/profile` and confirm client profile data loads (name, address, city, status).
- Update profile fields (address, phone) and save.

9) Role Integrity (quick sanity)
- Open Settings and confirm role matches expected user (super_admin, admin_region, city, hq, shop, courier, customer).
- If a role appears incorrect, rerun `reset_test_users.py` and re-login.

10) Reference Lists (global sanity)
- Admin shops form: Cities list loads, HQ list loads, Tariff list loads.
- Admin clients form: Cities list loads.
- Admin cities form: Cantons list loads.
- Regions form: Cantons list loads.
