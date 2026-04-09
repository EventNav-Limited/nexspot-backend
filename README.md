# Nexspot API

**Stack:** NestJS + Prisma · **Version:** 1.0.0  
**Base URL:** `{{domain_name}}`  
**Content-Type:** `application/json`

> **Status:** Auth module 4/6 complete. `forgot-password` and `reset-password` are pending mail service setup.

--- 

## auth Endpoint Summary

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| `POST` | `/auth/register` | No | ✅ Done |
| `POST` | `/auth/login` | No | ✅ Done |
| `POST` | `/auth/logout` | Yes | ✅ Done |
| `POST` | `/auth/refresh` | No | ✅ Done |
| `POST` | `/auth/forgot-password` | No | ⏳ Pending (mail service) |
| `POST` | `/auth/reset-password` | No | ⏳ Pending (mail service) |
| `PUT` | `/me/change-password` | Yes | ✅ Done |

---

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens expire after `3600` seconds. Use `POST /auth/refresh` to get a new access token without re-authenticating.

---

## Standard Response Envelope

**Success**
```json
{
  "success": true,
  "data": { }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
  }
}
```

---

## Endpoints

### `POST /auth/register`

Registers a new user account. All new accounts are assigned `role: attendee` by default. Organizer role is assigned via an internal admin action.

> 🍪 **Cookie:** The `refresh_token` is set as an `HttpOnly` cookie on the response. It is not returned in the response body.

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `first_name` | `string` | Yes |
| `last_name` | `string` | Yes |
| `email` | `string` | Yes |
| `password` | `string` | Yes |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01J9XYZ",
      "first_name": "Andrea",
      "last_name": "Gomez",
      "email": "andreagomes@example.com",
      "role": "attendee",
      "profile_photo_url": null,
      "created_at": "2024-12-01T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1..."
  }
}
```

**Error Responses**

| Status | Scenario | Code |
|--------|----------|------|
| `400` | Missing or invalid fields | `VALIDATION_ERROR` |
| `409` | Email address already registered | `CONFLICT` |

---

### `POST /auth/login`

Authenticates a user and returns access and refresh tokens.

> 🍪 **Cookie:** The `refresh_token` is set as an `HttpOnly` cookie on the response. It is not returned in the response body.

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | Yes |
| `password` | `string` | Yes |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01J9XYZ",
      "first_name": "Andrea",
      "last_name": "Gomez",
      "email": "andreagomes@example.com",
      "role": "attendee",
      "profile_photo_url": null,
      "created_at": "2024-12-01T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1..."
  }
}
```

**Error Responses**

| Status | Scenario | Code |
|--------|----------|------|
| `400` | Missing or invalid fields | `VALIDATION_ERROR` |
| `401` | Invalid email or password | `UNAUTHORIZED` |

---

### `POST /auth/logout`

> 🔒 **Protected** — requires a valid Bearer token.

Invalidates the current access and refresh tokens server-side. No request body required.

**Response `200`**
```json
{
  "success": true,
  "message": ""
}
```

**Error Responses**

| Status | Scenario | Code |
|--------|----------|------|
| `401` | Missing, expired, or invalid token | `UNAUTHORIZED` |

---

### `POST /auth/refresh`


Obtains a new access token using the refresh token cookie set at login.
 
> 🍪 **Cookie:** Reads the `refresh_token` from the `HttpOnly` cookie automatically. No request body is required.
 
**Response `200`**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1..."
  }
}
```
 
**Error Responses**
 
| Status | Scenario | Code |
|--------|----------|------|
| `401` | Refresh token cookie missing, expired, or invalid | `UNAUTHORIZED` |
 
---

### `POST /auth/forgot-password`

> ⏳ **Pending** — mail service not yet configured.

Sends a password reset link to the provided email address.

> The response is identical whether or not the email exists, to prevent account enumeration.

**Request Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | Yes |

**Response `200`**
```json
{
  "success": true,
  "message": "If an account exists with this email, a reset link has been sent."
}
```

---

### `PUT /me/password`

> 🔒 **Protected** — requires a valid Bearer token.

Resets the user's password after verifying authentication startus.

**Request Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `old_password` | `string` | Yes | Must match current password |
| `new_password` | `string` | Yes | |
| `confirm_password` | `string` | Yes | Must match `new_password` |

**Response `200`**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Responses**

| Status | Scenario | Code |
|--------|----------|------|
| `400` | Fields missing or passwords do not match | `VALIDATION_ERROR` |
| `401` | Reset token is invalid or has expired | `UNAUTHORIZED` |

---

## NestJS Module Structure

```
nexspot-backend/src/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── auth
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── dto
│   │   ├── forgot-password.dto.ts
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── guard
│   │   └── jwt-auth.guard.ts
│   ├── strategies
│   │   └── jwt.strategies.ts
│   └── token.service.ts
├── categories
│   ├── categories.controller.ts
│   ├── categories.module.ts
│   ├── categories.service.ts
│   └── dto
│       ├── create-category.dto.ts
│       └── update-category.dto.ts
├── config
│   ├── config.module.ts
│   ├── env.ts
│   └── prisma.service.ts
├── generated
│   └── prisma
│       ├── browser.ts
│       ├── client.ts
│       ├── commonInputTypes.ts
│       ├── enums.ts
│       ├── internal
│       │   ├── class.ts
│       │   ├── prismaNamespaceBrowser.ts
│       │   └── prismaNamespace.ts
│       ├── models
│       │   ├── Session.ts
│       │   └── Users.ts
│       └── models.ts
├── lib
│   ├── error.lib.ts
│   └── response.lib.ts
├── main.ts
└── users
    ├── dto
    │   └── change-password.dto.ts
    ├── users.controller.ts
    ├── users.helper.ts
    ├── users.module.ts
    └── users.service.ts
```

---

## Prisma — User Model

```prisma
model Users {
  id                        String    @id@default(uuid())
  name                      String 
  email                     String    @unique
  password                  String 
  role                      Role      @default(ATTENDEE)

  created_at                DateTime  @default(now())
  updated_at                DateTime  @updatedAt
  isActive                  Boolean   @default(true)

  session Session[]

  @@map("users")
}

model Session {
  id                        String    @default(uuid())
  user_id                   String    
  device_id                 String    @unique
  token_hash                String
  created_at                DateTime  @default(now())
  updated_at                DateTime  @updatedAt
  expiresAt                 DateTime

  user                      Users     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  @@index([expiresAt])
  @@map("session")
}

enum Role {
  ATTENDEE
  ORGANIZER
  ADMIN
}
```

---

## Overall Module Progress

| Module | Endpoints | Done | Status |
|--------|-----------|------|--------|
| Auth | 6 | 4 | ⚡ In Progress |
| Categories & Formats | 3 | 0 | ○ Not Started |
| Events | 10 | 0 | ○ Not Started |
| Interests | 3 | 0 | ○ Not Started |
| Tickets & Purchases | 2 | 0 | ○ Not Started |
| Hosts & Following | 2 | 0 | ○ Not Started |
| Calendar | 2 | 0 | ○ Not Started |
| User Profile & Settings | 6 | 1 | ⚡ In Progress |
| Organizer Event Mgmt | 1 | 0 | ○ Not Started |
| Location Autocomplete | 1 | 0 | ○ Not Started |
| **Total** | **36** | **5** | **14% complete** |
