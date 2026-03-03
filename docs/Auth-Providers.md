# Auth Provider Swap Guide

StudentContext AI uses a pluggable authentication system. This document describes the `AuthProvider` interface, available implementations, and how to swap between them.

## Why Pluggable Authentication Matters

Ontario school boards have made significant investments in identity infrastructure. Some boards run Microsoft 365 with Azure Active Directory (Entra ID). Others use Google Workspace for Education. A growing number have adopted modern identity platforms like Clerk for staff-facing applications. Requiring boards to adopt a new identity provider just to deploy a student context tool would be a non-starter -- it would create duplicate credential management, confuse users, and violate the SSO expectations that boards have spent years establishing.

StudentContext AI's pluggable `AuthProvider` architecture eliminates this barrier entirely.

**Protect existing identity investments.** A board that has spent three years rolling out Entra ID with conditional access policies, MFA enrollment, and security group management does not need to replicate any of that work. StudentContext AI plugs directly into their existing Entra ID tenant. Teachers sign in with the same credentials they use for Outlook, Teams, and SharePoint. There is no separate password to manage, no additional MFA enrollment, and no new account provisioning workflow.

**Single sign-on from day one.** Because the auth layer delegates to the board's own identity provider, users experience true SSO. A teacher already signed into their Google Workspace session can access StudentContext AI without re-authenticating. A staff member logged into their Microsoft 365 environment gets the same seamless experience. This reduces friction, increases adoption, and eliminates the support tickets that come with yet-another-login.

**Zero vendor lock-in on identity.** Boards change identity providers. A board that starts with Google Workspace may migrate to Microsoft 365 as part of a broader IT strategy. With StudentContext AI, this change requires updating two environment variables (`AUTH_PROVIDER` and the provider-specific keys) and restarting the service. No data migration, no user re-provisioning, no code changes. The same applies in reverse.

**Security posture inheritance.** The board's existing conditional access policies, IP restrictions, MFA requirements, and session management rules apply automatically. If the board's Entra ID tenant requires MFA for all staff, StudentContext AI inherits that requirement without any additional configuration. If the board revokes a teacher's Google Workspace account, that teacher immediately loses access to StudentContext AI as well.

**Simplified compliance reporting.** When boards audit authentication and access controls for FIPPA compliance, StudentContext AI's auth layer points directly to the board's own identity infrastructure. There is no separate user database to audit, no separate password policy to document, and no separate MFA configuration to verify. The board's existing identity compliance posture extends seamlessly to the AI context system.

**Rapid pilot deployment.** For initial pilots and development, the built-in `DevAuthProvider` allows boards to evaluate the system without any identity integration at all. Seed users with pre-set passwords enable immediate testing across all roles -- student, teacher, guidance counsellor, principal, parent, and board admin. When the pilot transitions to production, swapping to the board's real identity provider is a configuration change, not a development project.

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
