# Nexspot — Application Event Flow

This document describes the **order in which API endpoints are called** across every major user journey in the application. Think of it as a walkthrough of the entire lifecycle, from opening the app for the first time to purchasing a ticket.

---

## Table of Contents

1. [App Startup](#1-app-startup)
2. [User Registration & Email Verification](#2-user-registration--email-verification)
3. [Login (Email/Password)](#3-login-emailpassword)
4. [Login (Google OAuth)](#4-login-google-oauth)
5. [Onboarding](#5-onboarding)
6. [Token Refresh](#6-token-refresh)
7. [Browsing & Discovering Events (Attendee)](#7-browsing--discovering-events-attendee)
8. [Purchasing Tickets (Attendee)](#8-purchasing-tickets-attendee)
9. [Viewing Orders (Attendee)](#9-viewing-orders-attendee)
10. [Requesting Organizer Status (Attendee)](#10-requesting-organizer-status-attendee)
11. [Creating & Publishing an Event (Organizer)](#11-creating--publishing-an-event-organizer)
12. [Managing an Existing Event (Organizer)](#12-managing-an-existing-event-organizer)
13. [Reviewing Elevation Requests (Admin)](#13-reviewing-elevation-requests-admin)
14. [Managing Categories (Admin)](#14-managing-categories-admin)
15. [Account Management (Any Authenticated User)](#15-account-management-any-authenticated-user)
16. [Password Recovery Flow](#16-password-recovery-flow)
17. [Logout](#17-logout)

---

## 1. App Startup

Before showing any UI, the client should confirm the server is reachable.

```
GET /health
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /health` | Ping the server. If `200`, proceed to load the app. |

---

## 2. User Registration & Email Verification

New users sign up, receive a verification email, then confirm their address before the account becomes active.

```
POST /auth/register
      ↓
  (Email sent to user)
      ↓
GET /auth/verify-email?token=<token>
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /auth/register` | User submits `firstName`, `lastName`, `email`, `password`. Server creates the account, sends a verification email, and returns an `access_token` + sets `refresh_token` cookie. Account is **inactive** until verified. |
| 2 | *(User clicks link in email)* | — |
| 3 | `GET /auth/verify-email?token=<token>` | Token in the email link is validated. Account is marked **active** (`isActive: true`). |

> **Note:** The user receives tokens immediately at step 1 so the frontend can proceed to onboarding without waiting. Some flows may choose to block progression until the email is verified.

---

## 3. Login (Email/Password)

```
POST /auth/login
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /auth/login` | User submits `email` and `password`. Server validates credentials, creates/updates the device session, returns `access_token` + sets `refresh_token` and `device_id` cookies. |

> If the account is not yet verified, the server resends the verification email and returns `401`.

---

## 4. Login (Google OAuth)

Browser-based redirect flow — not a direct API call.

```
GET /auth/google
      ↓
  (Google authorization page)
      ↓
GET /auth/google/callback
      ↓
  Redirect → {FRONTEND_URL}?access_token=<token>
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /auth/google` | Browser is redirected to Google's sign-in page. |
| 2 | *(User authenticates on Google)* | — |
| 3 | `GET /auth/google/callback` | Google redirects back. Server looks up or creates the user account (Google accounts skip email verification and are immediately active), generates tokens, sets cookies, and redirects the browser to the frontend with `access_token` in the URL query string. |

---

## 5. Onboarding

Runs immediately after a successful **registration** (or first login for Google users whose `onboarding_completed` is `false`). Steps 1 and 2 are sequential; either can be skipped entirely.

```
GET  /onboarding/interests   ← fetch options to display
POST /onboarding/interests   ← user saves their picks
POST /onboarding/location    ← user sets their city/country → onboarding DONE
```

Or, if the user wants to skip:

```
POST /onboarding/skip        ← marks onboarding as complete immediately
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /onboarding/interests` | Fetch all available interest categories to display to the user. |
| 2 | `POST /onboarding/interests` | User submits their chosen `interest_ids`. Stored, but onboarding not yet marked complete. |
| 3 | `POST /onboarding/location` | User submits `city`, `country`, and optionally `latitude`/`longitude`. Contact record is upserted. `onboarding_completed` is set to `true`. |
| *(alt)* | `POST /onboarding/skip` | User skips both steps. `onboarding_completed` is set to `true`. |

> The frontend should check `onboarding_completed` on the user object after login/register and redirect accordingly.

---

## 6. Token Refresh

Access tokens expire. The client should silently refresh them using the `refresh_token` cookie when a `401` is received from any protected endpoint.

```
(Any request returns 401)
      ↓
POST /auth/refresh
      ↓
(Retry original request with new access_token)
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /auth/refresh` | Browser sends the `refresh_token` cookie automatically. Server validates the token + DB session + token hash. Returns a new `access_token`. |

> The refresh token itself is **not rotated** on this call — only a new access token is issued.

---

## 7. Browsing & Discovering Events (Attendee)

The core public-facing discovery flow. These endpoints are open — no login required.

```
GET /categories           ← populate filter dropdowns
GET /formats              ← populate format filter
GET /events               ← browse the event feed with filters
GET /events/near-me       ← location-based discovery
GET /events/:slug         ← view a single event's detail page
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /categories` | Load available categories to populate filter UI (e.g. Technology, Music, Sports). |
| 2 | `GET /formats` | Load event format types (e.g. Conference, Workshop, Concert, Meetup). |
| 3 | `GET /events` | Fetch published events, optionally filtered by `q`, `location`, `category_id`, `format_id`, `price`, `date`, sorted and paginated. |
| 3a | `GET /events/near-me` | Alternative discovery: fetch events within a radius of `lat`/`lng` (or saved profile coordinates). |
| 4 | `GET /events/:slug` | User taps an event card — load full event details including tickets and organizer info. |

**Typical filter sequence on the events feed:**

```
GET /events?q=tech&location=Lagos&price=free&sort=date&page=1
GET /events?category_id=<uuid>&date=this_weekend&sort=price_asc
GET /events?date_from=2026-12-01&date_to=2026-12-31
```

---

## 8. Purchasing Tickets (Attendee)

After the user selects tickets on the event detail page, they proceed to checkout.

```
POST /orders              ← reserve tickets (creates PENDING order)
      ↓
  (Frontend sends user to payment gateway)
      ↓
POST /orders/:id/confirm  ← payment succeeded → confirm order
```

Or, if the user abandons:

```
POST /orders/:id/cancel   ← release reserved tickets
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /orders` | User submits `eventId` and `items[]` (ticketId + quantity). Tickets are **immediately reserved** (sold count incremented). A `PENDING` order is returned with a total. |
| 2 | *(Payment gateway — Paystack/Flutterwave)* | Frontend initiates payment with the order total. |
| 3 | `POST /orders/:id/confirm` | On payment success callback, frontend sends the `paymentReference` from the gateway. Order status moves to `CONFIRMED`. |
| *(alt)* | `POST /orders/:id/cancel` | User cancels or payment fails. Reserved tickets are **released back** to availability. Order status moves to `CANCELLED`. |

---

## 9. Viewing Orders (Attendee)

```
GET /me/orders
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /me/orders` | Returns all the authenticated user's orders (most recent first), including event details and ticket line items. |

---

## 10. Requesting Organizer Status (Attendee)

An `ATTENDEE` who wants to create events must request promotion to `ORGANIZER`. An admin must approve.

```
POST /me/elevation-request
      ↓
GET  /me/elevation-request   ← check current status
      ↓
  (Admin reviews in admin panel)
      ↓
  User role changes to ORGANIZER (if approved)
```

| Step | Endpoint | Who | What happens |
|------|----------|-----|--------------|
| 1 | `POST /me/elevation-request` | Attendee | Submits a `reason` (min 20 chars). Creates a `PENDING` elevation request. Only one pending request is allowed at a time. |
| 2 | `GET /me/elevation-request` | Attendee | Polls or checks the current status of their request (`PENDING`, `APPROVED`, or `REJECTED`). |
| 3 | `GET /admin/elevation-requests?status=PENDING` | Admin | Admin views all pending requests. |
| 4a | `PATCH /admin/elevation-requests/:id/approve` | Admin | Approves the request. User's role is atomically updated to `ORGANIZER`. |
| 4b | `PATCH /admin/elevation-requests/:id/reject` | Admin | Rejects with an optional `reviewNote`. User can reapply. |

---

## 11. Creating & Publishing an Event (Organizer)

The full event creation lifecycle from scratch to live.

```
GET  /categories                    ← pick a category
GET  /formats                       ← pick a format type
POST /events                        ← create event (DRAFT)
      ↓
PATCH /events/:id                   ← fill in details iteratively
      ↓
POST  /events/:id/save-draft        ← explicitly checkpoint as DRAFT
      ↓
PUT   /events/:id/ticketing         ← configure tickets (free or paid)
      ↓
GET   /events/:id/review            ← check completeness / missing fields
      ↓
POST  /events/:id/publish           ← go live (PUBLISHED)
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /categories` | Organizer picks a category for the event. |
| 2 | `GET /formats` | Organizer picks a format (Conference, Workshop, etc.). |
| 3 | `POST /events` | Creates the event in `DRAFT` status with core fields (`title`, `startDate`, `endDate`, `deliveryMode`, `categoryId`, `formatId`). Returns the new event object. |
| 4 | `PATCH /events/:id` | Organizer fills in or updates optional fields (`description`, `bannerURL`, `location`, `onlineLink`, `capacity`) — can be called multiple times. |
| 5 | `POST /events/:id/save-draft` | Explicitly confirms the current state is saved as a DRAFT checkpoint. No-op if already DRAFT. |
| 6 | `PUT /events/:id/ticketing` | Sets the ticketing model: `"free"` (auto-creates one free tier) or `"paid"` with a list of named `tiers` (name, price, currency, quantity). **Replaces all existing tiers.** |
| 7 | `GET /events/:id/review` | Returns the event plus `isComplete: bool` and `missingFields: string[]` — the organizer can see what's still blocking publication. |
| 8 | `POST /events/:id/publish` | Moves the event from `DRAFT` → `PUBLISHED`. Requires at least one ticket type. Event is now visible on `GET /events`. |

---

## 12. Managing an Existing Event (Organizer)

After an event is created, organizers can make changes or manage ticket types.

### Editing Event Details

```
PATCH /events/:id
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `PATCH /events/:id` | Update any event field. Only works on events that are **not** `CANCELLED` or `COMPLETED`. |

### Adding / Updating Ticket Types

```
POST  /events/:id/tickets                       ← add a new ticket type
PATCH /events/:eventId/tickets/:ticketId        ← update name/price/quantity
DELETE /events/:eventId/tickets/:ticketId       ← remove a ticket type (if no sales)
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /events/:id/tickets` | Add a single new ticket type (name, price, quantity). |
| 2 | `PATCH /events/:eventId/tickets/:ticketId` | Update ticket details. Cannot reduce quantity below `sold` count. |
| 3 | `DELETE /events/:eventId/tickets/:ticketId` | Remove a ticket type. Blocked if any have been sold. |

### Replacing All Ticket Tiers

```
PUT /events/:id/ticketing
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `PUT /events/:id/ticketing` | Atomically deletes all existing tiers and creates new ones. Blocked if any tier has sales. |

### Viewing Your Events

```
GET /me/events?status=PUBLISHED&page=1
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /me/events` | Returns the organizer's own events, optionally filtered by `status` (`DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`). Each event includes a `confirmed_orders` count. |

### Deleting a Draft

```
DELETE /events/:id
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `DELETE /events/:id` | Permanently deletes the event. Only works on `DRAFT` events. |

---

## 13. Reviewing Elevation Requests (Admin)

```
GET  /admin/elevation-requests?status=PENDING
PATCH /admin/elevation-requests/:id/approve
PATCH /admin/elevation-requests/:id/reject
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `GET /admin/elevation-requests` | List all elevation requests. Use `?status=PENDING` to see the queue. Each entry includes the user's profile info and their stated reason. |
| 2a | `PATCH /admin/elevation-requests/:id/approve` | Approve — atomically promotes the user to `ORGANIZER` and marks the request `APPROVED`. |
| 2b | `PATCH /admin/elevation-requests/:id/reject` | Reject — marks request `REJECTED`, optionally stores a `reviewNote` for the user. User may reapply. |

---

## 14. Managing Categories (Admin)

Categories must exist before organizers can assign them to events.

```
POST   /categories          ← seed a new category
GET    /categories          ← list all categories
DELETE /categories/:id      ← remove a category
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /categories` | Admin creates a category with `id` (human-readable slug), `name`, and optional `iconURL`. |
| 2 | `GET /categories` | Any authenticated user can list all categories (used in event creation forms). |
| 3 | `DELETE /categories/:id` | Admin removes a category by ID. |

> Event **formats** (Conference, Workshop, etc.) follow a similar pattern but are read-only through the public `GET /formats` endpoint — they are seeded directly into the database.

---

## 15. Account Management (Any Authenticated User)

These flows are user-initiated from the profile/settings screen.

### View Profile

```
GET /me
```

### Edit Display Name

```
PATCH /me/profile
```

### Update Profile Photo

```
PATCH /me/profile-photo
```

### Change Password (Local accounts only)

```
PUT /me/change-password
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `PUT /me/change-password` | User provides `oldPassword` and new `password`. Current password is verified before update. Google accounts cannot use this. |

### Change Email (Local accounts only)

```
PATCH /me/email
      ↓
  (Verification email sent to NEW address)
      ↓
GET /me/confirm-email-change?token=<token>
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `PATCH /me/email` | User provides `newEmail` and current `password` for verification. Server sends a link to the **new** email address. |
| 2 | *(User clicks link in email)* | — |
| 3 | `GET /me/confirm-email-change?token=<token>` | Token validated. Email address updated in the database. |

---

## 16. Password Recovery Flow

For users who have forgotten their password (local accounts only).

```
POST /auth/forgot-password
      ↓
  (Reset link emailed to user)
      ↓
POST /auth/reset-password?token=<token>
      ↓
POST /auth/login             ← login with new password
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /auth/forgot-password` | User submits their `email`. Server sends a time-limited reset link. |
| 2 | *(User clicks link in email)* | — |
| 3 | `POST /auth/reset-password?token=<token>` | User submits a new `password`. Token purpose validated (`forgot-password`). Password updated. |
| 4 | `POST /auth/login` | User logs in with their new password. |

---

## 17. Logout

```
POST /auth/logout
```

| Step | Endpoint | What happens |
|------|----------|--------------|
| 1 | `POST /auth/logout` | Server deletes the session from the database (keyed by `device_id` in the refresh token). `refresh_token` and `device_id` cookies are cleared. The `access_token` remains valid until it naturally expires — frontend should discard it. |

---

## Complete Lifecycle Overview

Below is a bird's-eye view of the full application lifecycle, combining all flows.

```
┌─────────────────────────────────────────────────────────────────────┐
│  APP STARTUP                                                        │
│  GET /health                                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │ NEW USER                           │ RETURNING USER
              │                                    │
        POST /auth/register              POST /auth/login
        GET  /auth/verify-email          (or GET /auth/google → callback)
              │                                    │
              └─────────────────┬──────────────────┘
                                │
                    onboarding_completed = false?
                                │
                    ┌───────────┴──────────┐
                    YES                    NO
                    │                      │
         GET  /onboarding/interests        │
         POST /onboarding/interests        │
         POST /onboarding/location         │
         (or POST /onboarding/skip)        │
                    │                      │
                    └───────────┬──────────┘
                                │
              ┌─────────────────┼──────────────────┐
        ATTENDEE           ORGANIZER             ADMIN
              │                 │                   │
    Browse events         GET /me/events    GET /admin/elevation-requests
    GET /events           POST /events      PATCH .../approve
    GET /events/near-me   PATCH /events/:id PATCH .../reject
    GET /events/:slug     PUT .../ticketing
              │           POST .../publish   POST /categories
    Purchase                   │             DELETE /categories/:id
    POST /orders               │
    POST /orders/:id/confirm   │
    POST /orders/:id/cancel    │
    GET /me/orders             │
              │                │
    Request upgrade:           │
    POST /me/elevation-request │
              │                │
              └─────────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │  ACCOUNT MANAGEMENT (all users)    │
              │  GET    /me                         │
              │  PATCH  /me/profile                 │
              │  PATCH  /me/profile-photo           │
              │  PUT    /me/change-password         │
              │  PATCH  /me/email                   │
              │  GET    /me/confirm-email-change    │
              └─────────────────┬──────────────────┘
                                │
                        POST /auth/logout
```

---

## Quick Reference: Endpoints in Flow Order

| # | Flow | Method | Endpoint | Auth | Role |
|---|------|--------|----------|------|------|
| 1 | App Startup | `GET` | `/health` | None | — |
| 2 | Registration | `POST` | `/auth/register` | None | — |
| 3 | Registration | `GET` | `/auth/verify-email?token=` | None | — |
| 4 | Login | `POST` | `/auth/login` | None | — |
| 5 | Login (Google) | `GET` | `/auth/google` | None | — |
| 6 | Login (Google) | `GET` | `/auth/google/callback` | None | — |
| 7 | Onboarding | `GET` | `/onboarding/interests` | Bearer | — |
| 8 | Onboarding | `POST` | `/onboarding/interests` | Bearer | — |
| 9 | Onboarding | `POST` | `/onboarding/location` | Bearer | — |
| 10 | Onboarding | `POST` | `/onboarding/skip` | Bearer | — |
| 11 | Token Refresh | `POST` | `/auth/refresh` | Cookie | — |
| 12 | Discovery | `GET` | `/categories` | Bearer | — |
| 13 | Discovery | `GET` | `/formats` | Bearer | — |
| 14 | Discovery | `GET` | `/events` | None | — |
| 15 | Discovery | `GET` | `/events/near-me` | Bearer* | — |
| 16 | Discovery | `GET` | `/events/:slug` | None | — |
| 17 | Ticketing | `POST` | `/orders` | Bearer | — |
| 18 | Ticketing | `POST` | `/orders/:id/confirm` | Bearer | — |
| 19 | Ticketing | `POST` | `/orders/:id/cancel` | Bearer | — |
| 20 | My Orders | `GET` | `/me/orders` | Bearer | — |
| 21 | Elevation | `POST` | `/me/elevation-request` | Bearer | ATTENDEE |
| 22 | Elevation | `GET` | `/me/elevation-request` | Bearer | — |
| 23 | Elevation (Admin) | `GET` | `/admin/elevation-requests` | Bearer | ADMIN |
| 24 | Elevation (Admin) | `PATCH` | `/admin/elevation-requests/:id/approve` | Bearer | ADMIN |
| 25 | Elevation (Admin) | `PATCH` | `/admin/elevation-requests/:id/reject` | Bearer | ADMIN |
| 26 | Event Creation | `POST` | `/events` | Bearer | ORGANIZER |
| 27 | Event Creation | `PATCH` | `/events/:id` | Bearer | ORGANIZER |
| 28 | Event Creation | `POST` | `/events/:id/save-draft` | Bearer | ORGANIZER |
| 29 | Event Creation | `PUT` | `/events/:id/ticketing` | Bearer | ORGANIZER |
| 30 | Event Creation | `POST` | `/events/:id/tickets` | Bearer | ORGANIZER |
| 31 | Event Creation | `GET` | `/events/:id/review` | Bearer | ORGANIZER |
| 32 | Event Creation | `POST` | `/events/:id/publish` | Bearer | ORGANIZER |
| 33 | Event Management | `PATCH` | `/events/:eventId/tickets/:ticketId` | Bearer | ORGANIZER |
| 34 | Event Management | `DELETE` | `/events/:eventId/tickets/:ticketId` | Bearer | ORGANIZER |
| 35 | Event Management | `GET` | `/me/events` | Bearer | ORGANIZER |
| 36 | Event Management | `DELETE` | `/events/:id` | Bearer | ORGANIZER |
| 37 | Admin | `POST` | `/categories` | Bearer | ADMIN |
| 38 | Admin | `DELETE` | `/categories/:id` | Bearer | ADMIN |
| 39 | Account | `GET` | `/me` | Bearer | — |
| 40 | Account | `PATCH` | `/me/profile` | Bearer | — |
| 41 | Account | `PATCH` | `/me/profile-photo` | Bearer | — |
| 42 | Account | `PUT` | `/me/change-password` | Bearer | — |
| 43 | Account | `PATCH` | `/me/email` | Bearer | — |
| 44 | Account | `GET` | `/me/confirm-email-change?token=` | Bearer | — |
| 45 | Password Recovery | `POST` | `/auth/forgot-password` | None | — |
| 46 | Password Recovery | `POST` | `/auth/reset-password?token=` | None | — |
| 47 | Logout | `POST` | `/auth/logout` | Bearer | — |

*`/events/near-me` — Bearer token is optional; required only when no `lat`/`lng` query params are provided.
