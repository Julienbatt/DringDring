# DringDring — API Contract (Draft)

This document defines the REST API exposed by the backend (FastAPI) and consumed by the Next.js frontend. Authentication uses Firebase ID tokens. Data is stored in Firebase (Cloud Firestore).

## Conventions

- **Base URL**
  - Staging: https://api.staging.dringdring.example
  - Production: https://api.dringdring.example
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Content type**: `application/json`
- **IDs**: UUIDv4 unless stated
- **Timestamps**: ISO 8601 UTC strings
- **Pagination**: `?limit` (default 20, max 100) and `?page` (1-based)
- **Errors**:
```json
{
  "error": {
    "code": "string",
    "message": "human readable",
    "details": { "field": "optional context" }
  }
}
```

## Authentication

- Verify Firebase ID token on every request server-side
- Roles: `admin`, `shop`, `client` (via custom claims or role mapping)

### GET /auth/me
- Returns the authenticated user profile and roles
- 200 response:
```json
{
  "userId": "uid-123",
  "email": "user@example.com",
  "roles": ["shop"],
  "shopId": "shop-uuid-or-null",
  "clientId": "client-uuid-or-null"
}
```

## Shops

### POST /shops
- Create shop profile (admin or first-time shop onboarding)
- Body:
```json
{
  "name": "Nom du magasin",
  "address": {
    "street": "Adresse",
    "streetNumber": "12",
    "zip": "1950",
    "city": "Sion"
  },
  "email": "shop@example.com",
  "phone": "+41 27 000 00 00",
  "contacts": [
    { "name": "Alice", "email": "a@ex.com", "phone": "+41..." }
  ],
  "departments": ["Épicerie", "Boucherie"]
}
```
- 201 response:
```json
{ "id": "shop-uuid", "createdAt": "2025-01-01T10:00:00Z" }
```

### GET /shops/{shopId}
- 200 response:
```json
{
  "id": "shop-uuid",
  "name": "...",
  "address": { "street": "...", "streetNumber": "...", "zip": "1950", "city": "Sion" },
  "email": "...",
  "phone": "...",
  "contacts": [{ "name": "...", "email": "...", "phone": "..." }],
  "departments": ["..."],
  "updatedAt": "..."
}
```

### PUT /shops/{shopId}
- Update profile, contacts (<=10), departments (1..10)

## Clients

### POST /clients
- Create new delivery-to client (shop-initiated)
- Body:
```json
{
  "firstName": "Prénom",
  "lastName": "Nom",
  "address": {
    "street": "Adresse",
    "streetNumber": "12",
    "zip": "1950",
    "city": "Sion"
  },
  "email": "client@example.com",
  "phone": "+41 79 000 00 00",
  "floor": "2",
  "entryCode": "1234",
  "cms": true
}
```
- 201 response: `{ "id": "client-uuid" }`

### GET /clients/{clientId}
- Returns client profile (role-restricted)

### GET /clients?query=...&limit=&page=
- Autocomplete/search by first or last name

### PATCH /clients/{clientId}
- Admin-only edits/deletes; clients can edit their own via role-restricted routes if allowed

## Deliveries

### POST /deliveries
- Create a delivery and mirror to `globalDeliveries`
- Body:
```json
{
  "shopId": "shop-uuid",
  "clientId": "client-uuid",
  "employee": "Employée X",
  "sector": "Boucherie",
  "ticketNo": "T-123",
  "amount": 123.45,
  "today": true,
  "startWindow": "2025-01-01T14:00:00Z",
  "bags": 3
}
```
- 201 response:
```json
{
  "id": "delivery-uuid",
  "createdAt": "2025-01-01T10:00:00Z"
}
```

### GET /deliveries?shopId=&dateFrom=&dateTo=&futureOnly=true&limit=&page=
- List deliveries (scoped by role)

### GET /deliveries/{deliveryId}
- 200 response includes full delivery object

### PATCH /deliveries/{deliveryId}
- Update editable fields; keep `shopId`/`clientId` immutable
- Mirrors update to `globalDeliveries`

### DELETE /deliveries/{deliveryId}
- Deletes both delivery documents (shop and global)

## Reports

### GET /reports/shops/{shopId}/summary?granularity=day|month|year&dateFrom=&dateTo=
- 200 response:
```json
{
  "granularity": "day",
  "rows": [
    {
      "date": "2025-01-01",
      "ticketCount": 10,
      "totalAmount": 1234.56,
      "bagCount": 25,
      "bySector": { "Épicerie": 12, "Boucherie": 13 },
      "cmsCount": 4
    }
  ]
}
```

## Imports

### POST /imports/clients
- CSV upload URL retrieval or direct JSON batch import
- Response includes import job id and error report URL

### POST /imports/shops
- Admin-only bulk onboarding

## Common Status Codes

- 200 OK, 201 Created, 204 No Content
- 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error

## Validation Rules (selected)

- Swiss NPA: 4 digits (e.g., 1950)
- Phone: Swiss formats; store E.164
- Departments: 1..10; Contacts: 0..10
- Time window: 08:00–20:00 (30-minute increments)
- Bags: 0..20

## Security Notes

- Enforce RBAC per endpoint
- Verify Firebase ID token; optionally check custom claims
- All writes validate ownership (shopId must match caller’s shop where applicable)
