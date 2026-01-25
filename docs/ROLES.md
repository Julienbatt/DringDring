# DringDring Roles and Guards

This document defines canonical roles and their backend guards.

## Canonical roles
- super_admin
- admin_region
- hq
- city
- shop
- courier
- customer

## Backend guards (FastAPI)
The guards live in `backend/app/core/guards.py`.

- require_super_admin_user -> super_admin
- require_admin_user -> admin_region
- require_hq_user -> hq
- require_city_user -> city
- require_shop_user -> shop
- require_courier_user -> courier
- require_customer_user -> customer

## Notes
- All guards resolve identity through `resolve_identity` (DB + RLS).
- Roles must be kept in sync between `public.profiles` and JWT claims (`app_metadata` or `user_metadata`).
- RLS policies enforce access using JWT claims, while API guards use `public.profiles`.
