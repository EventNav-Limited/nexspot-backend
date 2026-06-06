# Nexspot API Documentation

> **Base URL:** `https://api.nexspot.com.ng`  
> **Local Dev:** `http://localhost:3000`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Format](#error-format)
5. [Roles & Permissions](#roles--permissions)
6. [Enums Reference](#enums-reference)
7. [Endpoints](#endpoints)
   - [Health](#health)
   - [Auth](#auth)
   - [Onboarding](#onboarding)
   - [Users (Me)](#users-me)
   - [Events](#events)
   - [Orders](#orders)
   - [Categories](#categories)
   - [Formats](#formats)
   - [Admin](#admin)
8. [Data Models](#data-models)

---

## Overview

Nexspot is an event discovery and ticketing platform. The API is built with **NestJS**, uses **PostgreSQL** via **Prisma ORM**, and follows a cookie-based session model for authentication alongside short-lived JWT access tokens.

### Key Design Decisions

- **Access tokens** are short-lived JWTs sent in the `Authorization: Bearer` header.
- **Refresh tokens** are long-lived JWTs stored in an `HttpOnly`-style cookie (`refresh_token`) scoped to `/auth` routes.
- **Device tracking** is done via a `device_id` cookie to support per-device session management.
- **All request bodies** must use `Content-Type: application/json`.
- **Validation** uses `class-validator`; invalid payloads return structured `400` errors.

---

## Authentication

The API uses a **JWT Bearer token** scheme for protected routes.

### Token Flow

```
1. POST /auth/register  or  POST /auth/login
   → Response: { access_token }  +  Set-Cookie: refresh_token, device_id

2. Attach access_token to all protected requests:
   Authorization: Bearer <access_token>

3. When access_token expires:
   POST /auth/refresh  (cookie refresh_token sent automatically)
   → Response: { access_token }  (new short-lived token)

4. POST /auth/logout  (clears server session + cookies)
```

### Cookie Details

| Cookie | Path | Max Age | Notes |
|--------|------|---------|-------|
| `refresh_token` | `/auth` | 7 days | JWT encoding user ID and device ID |
| `device_id` | `/` | 365 days | Stable identifier per browser/device |

---

## Response Format

All successful responses follow this envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

For list endpoints, `data` contains the items array plus a pagination object:

```json
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "must be a valid email address" }
    ]
  }
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No Content (delete operations) |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `409` | Conflict (e.g. duplicate email) |
| `500` | Internal Server Error |

---

## Roles & Permissions

| Role | Description |
|------|-------------|
| `ATTENDEE` | Default role. Can browse events, purchase tickets, request elevation. |
| `ORGANIZER` | Can create, manage, and publish events. |
| `ADMIN` | Full platform access. Manages categories, reviews elevation requests. |

> Attendees can request promotion to ORGANIZER via `POST /me/elevation-request`. An ADMIN must approve it.

---

## Enums Reference

### `Role`
`ATTENDEE` · `ORGANIZER` · `ADMIN`

### `AuthProvider`
`LOCAL` · `GOOGLE`

### `EventStatus`
`DRAFT` · `PUBLISHED` · `CANCELLED` · `COMPLETED`

### `EventFormat` (delivery mode)
`IN_PERSON` · `ONLINE` · `HYBRID`

### `OrderStatus`
`PENDING` · `CONFIRMED` · `CANCELLED` · `REFUNDED`

### `ElevationStatus`
`PENDING` · `APPROVED` · `REJECTED`

---

## Endpoints

---

### Health

#### `GET /health`

Health check. Returns server status.

**Auth:** None

**Response `200`:**
```json
{
  "success": true,
  "data": "OK"
}
```

---

### Auth

Base path: `/auth`

---

#### `POST /auth/register`

Register a new user account. Sends a verification email on success. Sets `refresh_token` and `device_id` cookies.

**Auth:** None

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `firstName` | `string` | ✅ | — |
| `lastName` | `string` | ✅ | — |
| `email` | `string` | ✅ | Valid email format |
| `password` | `string` | ✅ | Minimum 8 characters |
| `profilePhotoURL` | `string` | ❌ | Defaults to auto-generated avatar |

```json
{
  "firstName": "Ada",
  "lastName": "Obi",
  "email": "ada@example.com",
  "password": "securepassword123"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "Ada",
      "last_name": "Obi",
      "email": "ada@example.com",
      "role": "ATTENDEE",
      "profile_photo_url": "https://ui-avatars.com/api/?name=Ada+Obi",
      "onboarding_completed": false,
      "created_at": "2026-01-01T00:00:00.000Z"
    },
    "access_token": "eyJhbGci..."
  }
}
```

**Set-Cookie:** `refresh_token=<jwt>; Path=/auth; Max-Age=604800; SameSite=Lax`
**Set-Cookie:** `device_id=<uuid>; Max-Age=31536000; SameSite=Lax`

**Errors:**

| Status | Condition |
|--------|-----------|
| `409` | Email already registered |
| `500` | Failed to send verification email (user rolled back) |

---

#### `POST /auth/login`

Authenticate with email and password. Updates the existing session for the device or creates a new one. Sets `refresh_token` cookie.

**Auth:** None

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | ✅ |
| `password` | `string` | ✅ |

```json
{
  "email": "ada@example.com",
  "password": "securepassword123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "access_token": "eyJhbGci..."
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `401` | Invalid email or password |
| `401` | Account registered via Google — must use Google login |
| `401` | Account not verified — verification email resent |

---

#### `GET /auth/verify-email?token=<token>`

Verifies a user's email address via a signed token sent by email. Activates the account.

**Auth:** None

**Query Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `token` | `string` | ✅ |

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid or expired token |
| `400` | Token purpose is not `registration` |

---

#### `GET /auth/google`

Initiates Google OAuth 2.0 flow. Redirects the browser to Google's authorization page.

**Auth:** None

> This is a browser-redirect endpoint — not suitable for direct API calls. Open in a browser or WebView.

---

#### `GET /auth/google/callback`

OAuth 2.0 callback from Google. Creates or retrieves the user account, generates tokens, and redirects to the frontend with the access token in the query string.

**Auth:** None (handled by Google OAuth Guard)

**Redirect:** `{FRONTEND_URL}?access_token=<jwt>`

**Cookies set:** `refresh_token`, `device_id`

**Errors:**

| Status | Condition |
|--------|-----------|
| `409` | Email already registered as a LOCAL account |

---

#### `POST /auth/forgot-password`

Sends a password reset email to the user.

**Auth:** None

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | ✅ |

```json
{ "email": "ada@example.com" }
```

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Email not found |

---

#### `POST /auth/reset-password?token=<token>`

Resets the user's password using the token from the forgot-password email.

**Auth:** None

**Query Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `token` | `string` | ✅ |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `password` | `string` | ✅ | Minimum 8 characters |

```json
{ "password": "newSecurePassword1" }
```

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid or expired token |
| `400` | Token purpose is not `forgot-password` |

---

#### `POST /auth/refresh`

Issues a new access token using the `refresh_token` cookie. Does **not** rotate the refresh token.

**Auth:** `refresh_token` cookie (sent automatically by browser)

**Response `200`:**
```json
{
  "success": true,
  "data": "eyJhbGci..."
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `401` | No refresh token cookie present |
| `401` | Invalid or expired refresh token JWT |
| `401` | Session not found in DB |
| `401` | Session expired (DB check) |
| `401` | Token hash mismatch — potential token reuse |

---

#### `POST /auth/logout`

Deletes the server-side session and clears `refresh_token` and `device_id` cookies.

**Auth:** `Authorization: Bearer <access_token>` + `refresh_token` cookie

**Response `200`:**
```json
{ "success": true, "data": null }
```

---

### Onboarding

Base path: `/onboarding`  
**All routes require:** `Authorization: Bearer <access_token>`

The onboarding flow is a two-step post-registration process:

1. **Select interests** → `POST /onboarding/interests`
2. **Set location** → `POST /onboarding/location` *(marks onboarding complete)*

Users can skip the entire flow with `POST /onboarding/skip`.

---

#### `GET /onboarding/interests`

Returns all available interests for the user to pick from.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "music_concerts", "name": "Music Concerts" },
    { "id": "tech_conferences", "name": "Tech Conferences" }
  ]
}
```

---

#### `POST /onboarding/interests`

Saves the user's interest selections. Replaces any prior selections. Does **not** mark onboarding as complete.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `interest_ids` | `string[]` | ✅ | Array of interest IDs |

```json
{
  "interest_ids": ["music_concerts", "tech_conferences"]
}
```

**Response `200`:**
```json
{ "success": true, "data": null }
```

---

#### `POST /onboarding/location`

Saves the user's preferred location and marks onboarding as **complete**.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `city` | `string` | ✅ |
| `country` | `string` | ✅ |
| `latitude` | `number` | ❌ |
| `longitude` | `number` | ❌ |

```json
{
  "city": "Lagos",
  "country": "Nigeria",
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "onboarding_completed": true }
}
```

---

#### `POST /onboarding/skip`

Skips onboarding and marks it as complete immediately.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": { "onboarding_completed": true }
}
```

---

### Users (Me)

Base path: `/me`  
**All routes require:** `Authorization: Bearer <access_token>`

---

#### `GET /me`

Returns the authenticated user's profile.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "Ada",
    "last_name": "Obi",
    "email": "ada@example.com",
    "role": "ATTENDEE",
    "profile_photo_url": "https://...",
    "onboarding_completed": true,
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

#### `PATCH /me/profile`

Updates the authenticated user's display name. All fields are optional; only provided fields are updated.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `firstName` | `string` | ❌ | Min length 1 |
| `lastName` | `string` | ❌ | Min length 1 |

```json
{ "firstName": "Adaeze" }
```

**Response `200`:** Returns updated [User object](#user-object).

---

#### `PATCH /me/profile-photo`

Updates the authenticated user's profile photo URL.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `profilePhotoURL` | `string` | ✅ | Must be a valid URL |

```json
{ "profilePhotoURL": "https://cdn.example.com/avatar.jpg" }
```

**Response `200`:** Returns updated [User object](#user-object).

---

#### `PUT /me/change-password`

Changes the authenticated user's password. Requires the current password for verification.  
**Google accounts cannot use this endpoint.**

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `oldPassword` | `string` | ✅ | Min 8 characters |
| `password` | `string` | ✅ | Min 8 characters (new password) |

```json
{
  "oldPassword": "currentPassword1",
  "password": "newSecurePassword2"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset. You can now log in with your new password."
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `401` | Current password is incorrect |
| `401` | Account uses Google sign-in |

---

#### `PATCH /me/email`

Initiates an email change. Sends a verification link to the **new** email. Only **LOCAL** accounts can change their email.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `newEmail` | `string` | ✅ | Valid email |
| `password` | `string` | ✅ | Current password for verification |

```json
{
  "newEmail": "newemail@example.com",
  "password": "currentPassword1"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "A verification link has been sent to newemail@example.com. Please confirm to complete the email change."
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Cannot change email for Google accounts |
| `400` | New email is already in use |
| `401` | Current password is incorrect |

---

#### `GET /me/confirm-email-change?token=<token>`

Completes the email change after the user clicks the verification link sent to their new email.

**Auth:** Bearer token

**Query Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `token` | `string` | ✅ |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Your email address has been updated successfully."
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid token purpose |

---

#### `POST /me/elevation-request`

Submits a request for the authenticated `ATTENDEE` to be promoted to `ORGANIZER`. Only one pending request allowed at a time.

**Auth:** Bearer token · **Role:** `ATTENDEE`

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `reason` | `string` | ✅ | Minimum 20 characters |

```json
{
  "reason": "I want to organize tech meetups in Lagos for the local developer community."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "reason": "I want to organize...",
    "status": "PENDING",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `409` | A pending elevation request already exists |

---

#### `GET /me/events`

Returns the authenticated organizer's own events, with pagination and optional status filtering.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `EventStatus` | — | Filter by status: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` |
| `page` | `integer` | `1` | Page number |
| `per_page` | `integer` | `20` | Results per page (max 50) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Lagos Tech Meetup",
        "slug": "lagos-tech-meetup-abc123",
        "status": "published",
        "confirmed_orders": 42,
        "date": { "start": "...", "end": "...", "display": "Dec 16 | 10:30 AM – 1:30 PM" },
        "ticket": { "type": "paid", "min_price": 5000, "max_price": 15000, "display_price": "₦5,000" }
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### `GET /me/orders`

Returns all orders placed by the authenticated user, ordered by most recent.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "status": "CONFIRMED",
      "total": "5000.00",
      "paymentReference": "PAY-XXXX",
      "createdAt": "...",
      "event": {
        "id": "uuid",
        "title": "Lagos Tech Meetup",
        "slug": "lagos-tech-meetup-abc123",
        "startDate": "...",
        "endDate": "...",
        "location": "Bode Thomas, Surulere",
        "bannerURL": "https://..."
      },
      "items": [
        {
          "id": "uuid",
          "quantity": 2,
          "price": "2500.00",
          "ticket": { "id": "uuid", "name": "Regular", "price": "2500.00" }
        }
      ]
    }
  ]
}
```

---

### Events

Base path: `/events`

---

#### `GET /events`

Returns a paginated list of **published** events with filtering and sorting.

**Auth:** None (public)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | `string` | Full-text search on title and description |
| `location` | `string` | Filter by location (case-insensitive contains match) |
| `price` | `"free"` \| `"paid"` | Filter by ticket pricing |
| `date` | `"today"` \| `"tomorrow"` \| `"this_week"` \| `"this_weekend"` | Date preset filter |
| `date_from` | `ISO 8601 date` | Custom start date (inclusive). Overrides `date` preset. |
| `date_to` | `ISO 8601 date` | Custom end date (inclusive). Overrides `date` preset. |
| `category_id` | `UUID` | Filter by category |
| `format_id` | `UUID` | Filter by event format |
| `sort` | `"relevance"` \| `"date"` \| `"price_asc"` \| `"price_desc"` | Sort order |
| `page` | `integer` | Page number (default: `1`) |
| `per_page` | `integer` | Results per page (default: `20`, max: `50`) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Lagos Tech Meetup",
        "slug": "lagos-tech-meetup-abc123",
        "description": "A community event for developers.",
        "banner_url": "https://...",
        "category_id": "uuid",
        "format_id": "uuid",
        "format": "IN_PERSON",
        "status": "published",
        "date": {
          "start": "2026-12-16T10:30:00.000Z",
          "end": "2026-12-16T13:30:00.000Z",
          "display": "16 Dec | 10:30 AM – 1:30 PM"
        },
        "location": { "display": "Bode Thomas, Surulere, Lagos" },
        "online_link": null,
        "ticket": {
          "type": "paid",
          "min_price": 5000,
          "max_price": 15000,
          "display_price": "₦5,000"
        },
        "organizer": {
          "id": "uuid",
          "name": "Emeka Eze",
          "photo": "https://..."
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 85,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    },
    "applied_filters": {
      "q": null,
      "price": "paid",
      "date": null,
      "category_id": null,
      "format_id": null,
      "sort": "relevance"
    }
  }
}
```

---

#### `GET /events/near-me`

Returns published **in-person** and **hybrid** events within a specified radius of a coordinate point.  
- Provide `lat` and `lng` query params directly, **or**
- Authenticate and rely on the saved location from your profile.

Distance is calculated using the **Haversine formula**.

**Auth:** Bearer token (required if no `lat`/`lng` is provided)

**Query Parameters:**

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `lat` | `number` | — | Valid latitude | Latitude of search center |
| `lng` | `number` | — | Valid longitude | Longitude of search center |
| `radius` | `number` | `10` | 1 – 100 (km) | Search radius in kilometers |
| `page` | `integer` | `1` | ≥ 1 | Page number |
| `per_page` | `integer` | `20` | 1 – 50 | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Lagos Tech Meetup",
        "slug": "lagos-tech-meetup-abc123",
        "banner_url": "https://...",
        "category_id": "uuid",
        "format_id": "uuid",
        "format": "IN_PERSON",
        "status": "PUBLISHED",
        "date": {
          "start": "2026-12-16T10:30:00.000Z",
          "end": "2026-12-16T13:30:00.000Z",
          "display": "16 Dec | 10:30 AM – 1:30 PM"
        },
        "location": {
          "display": "Bode Thomas, Surulere",
          "distance_km": "3.2km"
        }
      }
    ],
    "pagination": { ... },
    "coordinates_used": { "lat": 6.5244, "lng": 3.3792 }
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | No `lat`/`lng` provided and user has no saved coordinates |
| `401` | No `lat`/`lng` provided and no auth token |

---

#### `GET /events/:slug`

Returns a single published event by its URL slug.

**Auth:** None (public)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | URL-safe event slug (e.g. `lagos-tech-meetup-abc123`) |

**Response `200`:** Returns a single [Event object](#event-object).

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Event not found or not published |

---

#### `POST /events`

Creates a new event in `DRAFT` status.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | `string` | ✅ | — |
| `description` | `string` | ❌ | — |
| `startDate` | `ISO 8601 datetime` | ✅ | — |
| `endDate` | `ISO 8601 datetime` | ✅ | Must be after `startDate` |
| `deliveryMode` | `EventFormat` | ✅ | `IN_PERSON`, `ONLINE`, or `HYBRID` |
| `categoryId` | `string (UUID)` | ✅ | Must reference existing category |
| `formatId` | `string (UUID)` | ✅ | Must reference existing format |
| `capacity` | `integer` | ❌ | Min 1; `null` = unlimited |
| `bannerURL` | `string (URL)` | ❌ | — |
| `location` | `string` | ❌* | Required for `IN_PERSON` and `HYBRID` |
| `latitude` | `number` | ❌* | Required for `IN_PERSON` and `HYBRID` |
| `longitude` | `number` | ❌* | Required for `IN_PERSON` and `HYBRID` |
| `onlineLink` | `string (URL)` | ❌* | Required for `ONLINE` and `HYBRID` |

*Conditionally required based on `deliveryMode`.

```json
{
  "title": "Lagos Tech Meetup",
  "description": "A community event for developers in Lagos.",
  "startDate": "2026-12-16T10:30:00.000Z",
  "endDate": "2026-12-16T13:30:00.000Z",
  "deliveryMode": "IN_PERSON",
  "categoryId": "uuid",
  "formatId": "uuid",
  "capacity": 200,
  "location": "Bode Thomas, Surulere, Lagos",
  "latitude": 6.5015,
  "longitude": 3.3543
}
```

**Response `201`:** Returns the created [Event object](#event-object).

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | `endDate` is not after `startDate` |
| `400` | Online event missing `onlineLink` |
| `400` | In-person event missing `location` |

---

#### `PATCH /events/:id`

Updates an existing event. Only the owning organizer can update. All fields are optional.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Request Body:** Any subset of the [create event fields](#post-events).

**Response `200`:** Returns the updated [Event object](#event-object).

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Authenticated user does not own this event |
| `404` | Event not found |
| `400` | Event is `CANCELLED` or `COMPLETED` |

---

#### `POST /events/:id/save-draft`

Explicitly saves the current state as `DRAFT`. No-op if already a DRAFT — returns current state.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `200`:** Returns the [Event object](#event-object).

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Does not own this event |
| `404` | Event not found |
| `400` | Event is not in `DRAFT` status |

---

#### `GET /events/:id/review`

Returns the full event details plus a **completeness check** — useful for showing pre-publish validation to the organizer.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    ...eventObject,
    "isComplete": false,
    "missingFields": [
      "banner",
      "at least one ticket type"
    ]
  }
}
```

**`missingFields` possible values:**
- `"title"`
- `"banner"`
- `"at least one ticket type"`
- `"start date must be in the future"`
- `"location"` (for IN_PERSON events)
- `"online link"` (for ONLINE events)

---

#### `POST /events/:id/publish`

Publishes a `DRAFT` event. Requires at least one ticket type to be configured.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `200`:** Returns the published [Event object](#event-object).

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Does not own this event |
| `404` | Event not found |
| `400` | Event is not in `DRAFT` status |
| `400` | No ticket types configured |

---

#### `DELETE /events/:id`

Permanently deletes a `DRAFT` event. Cannot delete published, cancelled, or completed events.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `204`:** No content.

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Does not own this event |
| `404` | Event not found |
| `400` | Event is not in `DRAFT` status |

---

### Ticket Management (Organizer)

These endpoints are nested under `/events` and require `ORGANIZER` role and event ownership.

---

#### `PUT /events/:id/ticketing`

**Replaces all** ticket tiers for an event in a single atomic operation. Use this for initial setup or full replacement.

- `type: "free"` → creates one free ticket tier using the event's capacity (default 1000).
- `type: "paid"` → requires a `tiers` array with at least one tier.

⚠️ **Blocked if any existing tier has recorded sales.**

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `type` | `"free"` \| `"paid"` | ✅ | — |
| `tiers` | `TicketTierDto[]` | Conditional | Required when `type` is `"paid"` |

**TicketTierDto:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | e.g. `"VIP"`, `"Regular"` |
| `price` | `number` | ✅ | Min 0, max 2 decimal places |
| `currency` | `string` | ✅ | e.g. `"NGN"` |
| `quantity` | `integer` | ✅ | Min 1 |

```json
{
  "type": "paid",
  "tiers": [
    { "name": "Regular", "price": 5000, "currency": "NGN", "quantity": 150 },
    { "name": "VIP", "price": 15000, "currency": "NGN", "quantity": 50 }
  ]
}
```

**Response `200`:** Returns the updated event with tickets array.

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Some tiers already have sales |
| `400` | Event is `COMPLETED` or `CANCELLED` |
| `403` | Does not own this event |
| `404` | Event not found |

---

#### `POST /events/:id/tickets`

Adds a single ticket type to an event. Use for incremental additions.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` (event ID) |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | — |
| `price` | `number` | ✅ | Min 0, max 2 decimal places |
| `quantity` | `integer` | ✅ | Min 1 |

```json
{
  "name": "Early Bird",
  "price": 3500,
  "quantity": 50
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Early Bird",
    "price": "3500.00",
    "quantity": 50,
    "sold": 0,
    "eventId": "uuid",
    "createdAt": "..."
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Does not own this event |
| `404` | Event not found |
| `400` | Event is `CANCELLED` or `COMPLETED` |

---

#### `PATCH /events/:eventId/tickets/:ticketId`

Updates a ticket type. Cannot reduce `quantity` below the number already sold.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `eventId` | `UUID` |
| `ticketId` | `UUID` |

**Request Body:** Any subset of ticket fields (`name`, `price`, `quantity`).

```json
{ "quantity": 100 }
```

**Response `200`:** Returns the updated ticket.

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | New quantity is less than the number already sold |
| `403` | Does not own this ticket's event |
| `404` | Ticket not found |

---

#### `DELETE /events/:eventId/tickets/:ticketId`

Deletes a ticket type. Cannot delete if any of these tickets have been sold.

**Auth:** Bearer token · **Role:** `ORGANIZER`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `eventId` | `UUID` |
| `ticketId` | `UUID` |

**Response `204`:** No content.

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Tickets have already been sold |
| `403` | Does not own this ticket's event |
| `404` | Ticket not found |

---

### Orders

Base path: `/orders`  
**All routes require:** `Authorization: Bearer <access_token>`

---

#### `POST /orders`

Creates a `PENDING` order and immediately reserves the requested tickets (decrements availability). Payment is expected to follow. Stale PENDING orders should be cleaned up by a scheduled job.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `eventId` | `UUID` | ✅ |
| `items` | `OrderItemDto[]` | ✅ |

**OrderItemDto:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `ticketId` | `UUID` | ✅ | Must belong to the event |
| `quantity` | `integer` | ✅ | Min 1 |

```json
{
  "eventId": "uuid",
  "items": [
    { "ticketId": "uuid", "quantity": 2 },
    { "ticketId": "uuid", "quantity": 1 }
  ]
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "eventId": "uuid",
    "status": "PENDING",
    "total": "10000.00",
    "paymentReference": null,
    "createdAt": "...",
    "items": [
      {
        "id": "uuid",
        "ticketId": "uuid",
        "quantity": 2,
        "price": "5000.00"
      }
    ]
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Event not found or not published |
| `400` | Ticket does not belong to this event |
| `400` | Requested quantity exceeds available stock |

---

#### `POST /orders/:id/confirm`

Confirms a `PENDING` order after successful payment. Stores the payment gateway reference.

**Auth:** Bearer token

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` (order ID) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentReference` | `string` | ✅ | Paystack/Flutterwave transaction reference |

```json
{ "paymentReference": "PAY-XXXXXXXXXX" }
```

**Response `200`:** Returns the confirmed order with items and event details.

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Order not found |
| `400` | Order is not in `PENDING` status |

---

#### `POST /orders/:id/cancel`

Cancels a `PENDING` order and releases the reserved tickets back to availability.  
Only PENDING orders can be self-cancelled. Confirmed orders require a separate refund flow.

**Auth:** Bearer token · Must be the order owner.

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` (order ID) |

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `403` | Authenticated user does not own this order |
| `404` | Order not found |
| `400` | Order is not in `PENDING` status |

---

### Categories

Base path: `/categories`

---

#### `GET /categories`

Returns all event categories.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Technology",
      "slug": "technology",
      "iconURL": "https://...",
      "createdAt": "..."
    }
  ]
}
```

---

#### `GET /categories/:id`

Returns a single category by ID.

**Auth:** Bearer token

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `200`:** Returns single category object.

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Category not found |

---

#### `POST /categories`

Creates a new category.

**Auth:** Bearer token · **Role:** `ADMIN`

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `id` | `string` | ✅ |
| `name` | `string` | ✅ |
| `iconURL` | `string` | ❌ |

```json
{
  "id": "technology",
  "name": "Technology",
  "iconURL": "https://cdn.nexspot.com/icons/tech.svg"
}
```

**Response `201`:** Returns the created category.

**Errors:**

| Status | Condition |
|--------|-----------|
| `409` | Category with this name already exists |

---

#### `DELETE /categories/:id`

Deletes a category by ID.

**Auth:** Bearer token · **Role:** `ADMIN`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` |

**Response `200`:** Returns the deleted category.

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Category not found |

---

### Formats

Base path: `/formats`

---

#### `GET /formats`

Returns all event format types (e.g. Conference, Workshop, Meetup, Concert).

**Auth:** Bearer token

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Conference",
      "slug": "conference",
      "createdAt": "..."
    }
  ]
}
```

---

### Admin

Base path: `/admin`  
**All routes require:** `Authorization: Bearer <access_token>` · **Role:** `ADMIN`

---

#### `GET /admin/elevation-requests`

Returns all organizer elevation requests, optionally filtered by status.

**Auth:** Bearer token · **Role:** `ADMIN`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `"PENDING"` \| `"APPROVED"` \| `"REJECTED"` | Optional filter |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "reason": "I want to organize tech meetups in Lagos...",
      "status": "PENDING",
      "reviewedAt": null,
      "reviewNote": null,
      "createdAt": "...",
      "user": {
        "id": "uuid",
        "firstName": "Ada",
        "lastName": "Obi",
        "email": "ada@example.com",
        "profilePhotoURL": "https://..."
      }
    }
  ]
}
```

---

#### `PATCH /admin/elevation-requests/:id/approve`

Approves an elevation request and promotes the user from `ATTENDEE` to `ORGANIZER`.

**Auth:** Bearer token · **Role:** `ADMIN`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` (elevation request ID) |

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Elevation request not found |
| `400` | Request is no longer in `PENDING` status |

---

#### `PATCH /admin/elevation-requests/:id/reject`

Rejects an elevation request with an optional review note.

**Auth:** Bearer token · **Role:** `ADMIN`

**Path Parameters:**

| Parameter | Type |
|-----------|------|
| `id` | `UUID` (elevation request ID) |

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `reviewNote` | `string` | ❌ |

```json
{ "reviewNote": "Insufficient profile information provided." }
```

**Response `200`:**
```json
{ "success": true, "data": null }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Elevation request not found |
| `400` | Request is no longer in `PENDING` status |

---

## Data Models

### User Object

```json
{
  "id": "uuid",
  "first_name": "Ada",
  "last_name": "Obi",
  "email": "ada@example.com",
  "role": "ATTENDEE",
  "profile_photo_url": "https://...",
  "onboarding_completed": false,
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

### Event Object

```json
{
  "id": "uuid",
  "title": "Lagos Tech Meetup",
  "slug": "lagos-tech-meetup-abc123",
  "description": "A community event for developers.",
  "banner_url": "https://...",
  "category_id": "uuid",
  "format_id": "uuid",
  "format": "IN_PERSON",
  "status": "published",
  "date": {
    "start": "2026-12-16T10:30:00.000Z",
    "end": "2026-12-16T13:30:00.000Z",
    "display": "16 Dec | 10:30 AM – 1:30 PM"
  },
  "location": { "display": "Bode Thomas, Surulere, Lagos" },
  "online_link": null,
  "ticket": {
    "type": "paid",
    "min_price": 5000,
    "max_price": 15000,
    "display_price": "₦5,000"
  },
  "organizer": {
    "id": "uuid",
    "name": "Emeka Eze",
    "photo": "https://..."
  }
}
```

### Ticket Object

```json
{
  "id": "uuid",
  "name": "Regular",
  "price": "5000.00",
  "quantity": 150,
  "sold": 42,
  "eventId": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Order Object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "eventId": "uuid",
  "status": "CONFIRMED",
  "total": "10000.00",
  "paymentReference": "PAY-XXXXXXXXXX",
  "createdAt": "...",
  "updatedAt": "...",
  "items": [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "quantity": 2,
      "price": "5000.00"
    }
  ]
}
```

### Elevation Request Object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "reason": "I want to organize events...",
  "status": "PENDING",
  "reviewedAt": null,
  "reviewNote": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Endpoint Summary

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/health` | None | — | Server health check |
| `POST` | `/auth/register` | None | — | Register new user |
| `POST` | `/auth/login` | None | — | Login with email/password |
| `GET` | `/auth/verify-email` | None | — | Verify email via token |
| `GET` | `/auth/google` | None | — | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | None | — | Google OAuth callback |
| `POST` | `/auth/forgot-password` | None | — | Send password reset email |
| `POST` | `/auth/reset-password` | None | — | Reset password via token |
| `POST` | `/auth/refresh` | Cookie | — | Refresh access token |
| `POST` | `/auth/logout` | Bearer | — | Logout and clear session |
| `GET` | `/onboarding/interests` | Bearer | — | Get available interests |
| `POST` | `/onboarding/interests` | Bearer | — | Save user interests |
| `POST` | `/onboarding/location` | Bearer | — | Save location & complete onboarding |
| `POST` | `/onboarding/skip` | Bearer | — | Skip onboarding |
| `GET` | `/me` | Bearer | — | Get own profile |
| `PATCH` | `/me/profile` | Bearer | — | Update name |
| `PATCH` | `/me/profile-photo` | Bearer | — | Update profile photo |
| `PUT` | `/me/change-password` | Bearer | — | Change password |
| `PATCH` | `/me/email` | Bearer | — | Request email change |
| `GET` | `/me/confirm-email-change` | Bearer | — | Confirm email change |
| `POST` | `/me/elevation-request` | Bearer | `ATTENDEE` | Request organizer promotion |
| `GET` | `/me/events` | Bearer | `ORGANIZER` | Get own events |
| `GET` | `/me/orders` | Bearer | — | Get own orders |
| `GET` | `/events` | None | — | Browse published events |
| `GET` | `/events/near-me` | Bearer* | — | Events near a location |
| `GET` | `/events/:slug` | None | — | Get single event by slug |
| `POST` | `/events` | Bearer | `ORGANIZER` | Create event (DRAFT) |
| `PATCH` | `/events/:id` | Bearer | `ORGANIZER` | Update event |
| `POST` | `/events/:id/save-draft` | Bearer | `ORGANIZER` | Save as draft |
| `GET` | `/events/:id/review` | Bearer | `ORGANIZER` | Review event completeness |
| `POST` | `/events/:id/publish` | Bearer | `ORGANIZER` | Publish event |
| `DELETE` | `/events/:id` | Bearer | `ORGANIZER` | Delete draft event |
| `PUT` | `/events/:id/ticketing` | Bearer | `ORGANIZER` | Replace all ticket tiers |
| `POST` | `/events/:id/tickets` | Bearer | `ORGANIZER` | Add a ticket type |
| `PATCH` | `/events/:eventId/tickets/:ticketId` | Bearer | `ORGANIZER` | Update ticket type |
| `DELETE` | `/events/:eventId/tickets/:ticketId` | Bearer | `ORGANIZER` | Delete ticket type |
| `POST` | `/orders` | Bearer | — | Create order (reserve tickets) |
| `POST` | `/orders/:id/confirm` | Bearer | — | Confirm order after payment |
| `POST` | `/orders/:id/cancel` | Bearer | — | Cancel pending order |
| `GET` | `/categories` | Bearer | — | List all categories |
| `GET` | `/categories/:id` | Bearer | — | Get category by ID |
| `POST` | `/categories` | Bearer | `ADMIN` | Create category |
| `DELETE` | `/categories/:id` | Bearer | `ADMIN` | Delete category |
| `GET` | `/formats` | Bearer | — | List all event formats |
| `GET` | `/admin/elevation-requests` | Bearer | `ADMIN` | List elevation requests |
| `PATCH` | `/admin/elevation-requests/:id/approve` | Bearer | `ADMIN` | Approve elevation request |
| `PATCH` | `/admin/elevation-requests/:id/reject` | Bearer | `ADMIN` | Reject elevation request |

*`/events/near-me` — Bearer token optional; required only when `lat`/`lng` are not provided.
