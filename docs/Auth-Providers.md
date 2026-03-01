# Auth Provider Swap Guide

StudentContext AI uses a pluggable authentication system. This document describes the `AuthProvider` interface, available implementations, and how to swap between them.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Client App  │────>│  Auth Middleware  │────>│  Auth Provider│
│  (React)     │     │  (Express)       │     │  (Interface)  │
└─────────────┘     └──────────────────┘     └──────────────┘
                                                     │
                                              ┌──────┴──────┐
                                              │              │
                                         ┌────┴───┐   ┌─────┴────┐
                                         │  Dev   │   │  Clerk   │
                                         │  Auth  │   │  Auth    │
                                         └────────┘   └──────────┘
                                         ┌────────┐   ┌──────────┐
                                         │ Entra  │   │  Google  │
                                         │  ID    │   │ Identity │
                                         └────────┘   └──────────┘
```

## Interface Contract

### Server-side (`AuthProvider`)

```typescript
// src/auth/auth-provider.ts
interface AuthProvider {
  readonly name: string;
  middleware(): (req: Request, res: Response, next: NextFunction) => void;
  verifyRequest(req: Request): Promise<AuthUser>;
}

interface AuthUser {
  userId: string;      // Internal DB user ID
  role: UserRole;      // Database role enum
  boardId: string;     // Multi-tenant board ID
  email?: string;      // User email
  externalId?: string; // Provider-specific user ID
}
```

### Client-side (`ClientAuthProvider`)

```typescript
// client/src/auth/auth-provider-client.ts
interface ClientAuthProvider {
  readonly name: string;
  login(email: string, password: string): Promise<{ token: string; user: UserInfo }>;
  logout(): void;
  getToken(): string | null;
  setToken(token: string): void;
  getUser(): Promise<UserInfo>;
}
```

## Available Providers

### 1. Dev Auth (default)

Local JWT/bcrypt authentication for development.

**Server**: `DevAuthProvider` — Issues JWTs signed with `JWT_SECRET`, verifies bcrypt passwords
**Client**: `DevAuthClient` — Stores token in `localStorage`

| Env Variable | Required | Description |
|---|---|---|
| `AUTH_PROVIDER` | No | Set to `dev` (default) |
| `JWT_SECRET` | No | Signing key (has dev default) |

### 2. Clerk SSO

Production-ready SSO via [Clerk](https://clerk.com).

**Server**: `ClerkAuthProvider` — Verifies Clerk session tokens, resolves email → DB user
**Client**: `ClerkAuthClient` — Uses `@clerk/clerk-react` SDK, lazy-loaded

| Env Variable | Required | Description |
|---|---|---|
| `AUTH_PROVIDER` | Yes | Set to `clerk` |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (auto-detects Clerk if set) |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_WEBHOOK_SECRET` | No | Svix webhook signing secret |
| `VITE_AUTH_PROVIDER` | Yes | Set to `clerk` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Same as CLERK_PUBLISHABLE_KEY |

**Webhook**: `POST /api/webhooks/clerk` handles `user.created`, `user.updated`, `user.deleted` events.

### 3. Microsoft Entra ID (Azure AD) — Stub

For boards using Microsoft 365 / Azure AD.

**Server**: `EntraAuthProvider` — Verifies Azure AD JWTs via JWKS, maps `oid` claim
**Client**: `EntraAuthClient` — Uses MSAL.js (stub, needs `@azure/msal-browser`)

| Env Variable | Required | Description |
|---|---|---|
| `AUTH_PROVIDER` | Yes | Set to `entra` |
| `ENTRA_TENANT_ID` | Yes | Azure AD tenant ID |
| `ENTRA_CLIENT_ID` | Yes | App registration client ID |
| `VITE_AUTH_PROVIDER` | Yes | Set to `entra` |
| `VITE_ENTRA_TENANT_ID` | Yes | Same as ENTRA_TENANT_ID |
| `VITE_ENTRA_CLIENT_ID` | Yes | Same as ENTRA_CLIENT_ID |

**To complete implementation**:
1. Install `jwks-rsa` for JWKS-based JWT verification
2. Install `@azure/msal-browser` for client-side auth
3. Replace stub token decoding with proper signature verification
4. Map Azure AD security groups to StudentContext roles

### 4. Google Identity — Stub

For boards using Google Workspace for Education.

**Server**: `GoogleAuthProvider` — Verifies Google ID tokens via `google-auth-library`
**Client**: `GoogleAuthClient` — Uses Google Identity Services (stub)

| Env Variable | Required | Description |
|---|---|---|
| `AUTH_PROVIDER` | Yes | Set to `google` |
| `GOOGLE_AUTH_CLIENT_ID` | Yes | OAuth 2.0 client ID (auth, not Classroom) |
| `VITE_AUTH_PROVIDER` | Yes | Set to `google` |
| `VITE_GOOGLE_AUTH_CLIENT_ID` | Yes | Same as GOOGLE_AUTH_CLIENT_ID |

**To complete implementation**:
1. `google-auth-library` is already a dependency (used for Classroom OAuth)
2. Replace stub token decoding with `OAuth2Client.verifyIdToken()`
3. Load Google Identity Services script in `index.html`
4. Map Google Workspace org units to StudentContext roles

## Swap Procedure

### Step 1: Pre-requisites

All providers require that users exist in the `users` table. The provider matches by email address. Options:
- Pre-provision users via seed data or admin API
- Use the Clerk webhook to auto-link `external_id` on first login

### Step 2: Set Environment Variables

```bash
# .env — switch to Clerk example
AUTH_PROVIDER=clerk
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...  # Optional
```

```bash
# client/.env — frontend
VITE_AUTH_PROVIDER=clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

### Step 3: Restart Services

```bash
# Backend
npm run dev

# Frontend (in client/)
npm run dev
```

### Step 4: Verify

1. Visit `https://dev.ecoworks.ca:3009`
2. Should redirect to provider's login page
3. After login, `GET /api/auth/me` should return the user profile
4. `GET /api/auth/provider` should return the new provider name

## User Matching

All providers use email-based matching:

```
External Auth → email → SELECT FROM users WHERE email = ? → AuthUser
```

If no matching user is found, the provider returns a descriptive error:
> "No StudentContext account found for user@example.com. Contact your school board administrator."

The `external_id` field on the `users` table stores the provider-specific user ID for caching and webhook handling.

## Adding a New Provider

1. Create `src/auth/my-auth-provider.ts` implementing `AuthProvider`
2. Create `client/src/auth/my-auth-client.ts` implementing `ClientAuthProvider`
3. Add the provider to the factory switch in `src/auth/index.ts` and `client/src/auth/index.ts`
4. Add env vars to `src/config/index.ts`
5. Document the provider in this file
