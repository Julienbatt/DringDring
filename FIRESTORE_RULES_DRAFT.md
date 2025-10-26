# DringDring — Firestore Security Rules (Draft)

This draft outlines access control for Cloud Firestore. Final rules must be tested with the emulator and automated tests.

## Collections

- `shops/{shopId}` — shop profile, contacts[<=10], departments[1..10]
- `clients/{clientId}` — client profile and address, `cms`
- `deliveries/{deliveryId}` — per-delivery doc (shopId, clientId, fields...)
- `globalDeliveries/{deliveryId}` — mirror for owner/manager visibility
- `roles/{uid}` (optional) — { roles: ["admin"|"shop"|"client"], shopId?, clientId? }

## Role Resolution

- Prefer Firebase custom claims: `request.auth.token.roles`, `shopId`, `clientId`
- Or read-only mapping from `roles/{uid}` (allow read to authenticated users, write admin-only)

## Rule Goals

- Admin: full read/write across all collections
- Shop: read/write its own `shop`, read/write deliveries where `shopId` matches, create clients; no delete clients
- Client: read/write own `clients/{clientId}`, read deliveries where `clientId` matches
- Global dataset only readable by admin (and possibly reporting service)

## Example Rules (illustrative)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function hasRole(role) {
      return request.auth != null && role in request.auth.token.roles;
    }

    function isAdmin() { return hasRole('admin'); }
    function isShop() { return hasRole('shop'); }
    function isClient() { return hasRole('client'); }

    function userShopId() { return request.auth.token.shopId; }
    function userClientId() { return request.auth.token.clientId; }

    // Roles mapping fallback (optional). Keep simple to avoid recursion.
    match /roles/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    match /shops/{shopId} {
      allow read: if isAdmin() || (isShop() && userShopId() == shopId);
      allow create: if isAdmin() || isShop();
      allow update: if isAdmin() || (isShop() && userShopId() == shopId);
      allow delete: if isAdmin();
    }

    match /clients/{clientId} {
      // Shop can create clients; admin can edit/delete; client can read/update own profile
      allow create: if isAdmin() || isShop();
      allow read: if isAdmin() || (isClient() && userClientId() == clientId) || isShop();
      allow update: if isAdmin() || (isClient() && userClientId() == clientId);
      allow delete: if isAdmin();
    }

    match /deliveries/{deliveryId} {
      allow read: if isAdmin() || (isShop() && resource.data.shopId == userShopId()) || (isClient() && resource.data.clientId == userClientId());
      allow create: if isAdmin() || (isShop() && request.resource.data.shopId == userShopId());
      allow update: if isAdmin() || (isShop() && resource.data.shopId == userShopId());
      allow delete: if isAdmin() || (isShop() && resource.data.shopId == userShopId());

      // Immutable fields: shopId, clientId
      allow update: if request.resource.data.shopId == resource.data.shopId && request.resource.data.clientId == resource.data.clientId;
    }

    match /globalDeliveries/{deliveryId} {
      // Only admin (or reporting service account) may read
      allow read: if isAdmin();
      allow write: if isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

## Field Validation Hints (enforce in backend; partially in rules)

- Enforce contacts length <= 10, departments 1..10 (prefer backend validation)
- NPA must be 4 digits, phone normalized to E.164 (backend)
- Delivery `bags` in 0..20, `startWindow` within 08:00–20:00 (backend)

## Testing Checklist

- Emulator tests for each role: admin, shop (own vs other shop), client (own vs other)
- Attempts to change immutable fields are denied
- Deliveries readable only by owner shop and client (plus admin)
- Global collection not exposed to non-admins

## Notes

- Keep business validation in backend to avoid complex rules
- Prefer verifying Firebase ID tokens in backend; rules enforce least-privilege access
- Consider service account for backend to perform mirrored writes to `globalDeliveries`
