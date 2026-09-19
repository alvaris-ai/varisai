# VARIS Backend

The API is a Fastify 5 service in `src/`. `src/app.mjs` composes plugins and routes; `src/repositories.mjs` contains parameterized PostgreSQL queries; `src/security.mjs` owns password/session cryptography; `src/config.mjs` owns environment parsing; and `src/server.mjs` is the production entry point.

## Endpoints

All application routes are under `/api` and return JSON. Protected routes require the `varis_session` HttpOnly cookie.

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | required |
| GET | `/api/auth/me` | required |
| GET/POST | `/api/conversations` | required |
| GET/DELETE | `/api/conversations/:id` | required |
| GET | `/api/conversations/:id/messages` | required |
| GET/PUT | `/api/preferences` | required |
| GET | `/api/voice/profiles` | required |

`POST /api/auth/register` and `POST /api/auth/login` have a stricter 10 requests/minute limit. All routes have a 100 requests/minute default limit.

## Security behavior

- Passwords use Node's scrypt with a random salt and a 64-byte derived key. Only the encoded hash is persisted.
- Sessions use 256-bit random opaque cookies; only SHA-256 token digests are stored in `auth_sessions`. Sessions expire and can be revoked on logout.
- All SQL values are PostgreSQL parameters (`$1`, `$2`, ...); no user input is interpolated into SQL.
- Fastify JSON Schema rejects unknown properties, invalid UUIDs, oversized fields, invalid numeric ranges, and malformed bodies.
- Mutating requests with an `Origin` header must match `APP_ORIGIN`; cookies are HttpOnly, SameSite=Lax, and optionally Secure.
- Helmet sets security headers. The API emits JSON only and never reflects user input as HTML; UI output escaping remains the frontend responsibility.
- Every protected query scopes by `user_id`, providing authorization even if an ID is guessed.

## Run and test

```bash
pnpm install
pnpm api:test
pnpm api:dev
```

`api:test` uses a repository mock and Fastify injection to exercise authentication, authorization, validation, cookie sessions, conversation/message access, preferences, voice profiles, logout, CSRF origin checks, and error responses. Set `DATABASE_URL` and apply both migrations before starting the real service.

