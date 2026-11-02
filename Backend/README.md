# Landed backend

NestJS microservices for Landed, a website for international students applying to German universities and student visas.

## Architecture

The browser only talks to the **gateway**. It handles HTTP concerns (validation, rate limiting, cookies, Swagger) and forwards work to services over Redis. Each service owns its own database, and no service reads another's data.

| App | Responsibility | Status |
| --- | --- | --- |
| `apps/gateway` | Public REST API at `/api` | Running |
| `apps/identity` | Auth and users | Auth done |
| `apps/community` | Feed, communities, notifications, realtime, moderation | Planned |
| `apps/catalog` | Universities, programs, shortlist, uploads | Planned |
| `apps/visa` | Visa timelines and stats | Planned |
| `apps/learning` | German course | Planned |

A service is only added when its first module is built. Message names and shared types live in `libs/common`.

## Rules

- Validate input in the gateway with DTOs. Services trust what the gateway sends.
- Services throw normal Nest HTTP exceptions. `RpcExceptionsFilter` and `callService` carry them back to the client.
- Errors always look like `{ statusCode, message, errors }`, with messages written in plain words.
- Keep unbounded lists such as comments and followers in their own collections, and add an index for every query.
- Never log or store tokens in plain text.
- After every module: run lint and tests, then summarise what was built.

## Run with Docker

```
docker compose up --build
```

| What | Where |
| --- | --- |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/api/health |
| Emails sent in development | http://localhost:8025 |

To enable Google sign-in, create a `.env` file next to `docker-compose.yml` with `GOOGLE_CLIENT_ID=<your client id>`.

## Run on your machine

Needs Node 24 (`nvm use 24`).

```
npm install
cp .env.example .env
docker compose up mongo redis mailpit
npm run start:identity
npm run start:gateway
```

## Checks

```
npm run lint
npm run typecheck
npm test
```

The first test run downloads a MongoDB binary, so it takes a little longer.

## Auth API

| Endpoint | Body | Result |
| --- | --- | --- |
| `POST /api/auth/signup` | `fullName, email, password` | 201 and a verification email. 409 if the email is taken |
| `POST /api/auth/login` | `email, password` | `{ user, accessToken }` and the refresh cookie. 401 for wrong details, 403 if unverified |
| `POST /api/auth/google` | `idToken` | `{ user, accessToken, isNewUser }` and the refresh cookie |
| `POST /api/auth/refresh` | Refresh cookie | New access token and a rotated cookie |
| `POST /api/auth/logout` | Refresh cookie | 204 and clears the cookie |
| `GET /api/auth/verify-email?token=` | | Redirects to `/login?verified=true` or `false` |
| `POST /api/auth/resend-verification` | `email` | Always 200 |
| `POST /api/auth/forgot-password` | `email` | Always 200 |
| `POST /api/auth/reset-password` | `token, password` | 200. 400 for a bad link. Ends all sessions |
| `DELETE /api/auth/account` | Bearer token | 204. Deletes the user and their tokens |

Access tokens last 15 minutes. Refresh tokens last 30 days, rotate on every use and are stored only as hashes. Replaying an old refresh token ends that session.
