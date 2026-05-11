@AGENTS.md

# Fire-Planner-Web

Next.js 16 frontend for the FIRE (Financial Independence/Retire Early) planner SaaS. Connects to the Fire-Planner Django REST API at `NEXT_PUBLIC_API_URL`.

## Product context

Freemium SaaS. Two tiers:
- **Free tier** — zero-friction, no account required. Projection and retirement age calculators. Target: focus group studies, traffic BI, ad revenue.
- **Paid tier** — requires Google login. Annual savings and max safe withdrawal calculators. Uses Monte Carlo/SGLD simulation on the backend.

## Auth pattern

1. User clicks "Sign in with Google" → `@react-oauth/google` returns a Google ID token
2. POST `/auth/google/` with that token → Django backend verifies with Google, returns `{ access, refresh }` JWT pair
3. Store tokens in `useAuth` hook state (not localStorage — keep it simple for now)
4. Send `Authorization: Bearer <access>` on paid-tier API calls
5. Every request also sends `X-API-Key` header — this gates client-level access (not user-level)

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Django API base URL |
| `NEXT_PUBLIC_API_KEY` | Client-level API key (X-API-Key header) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

Never commit `.env.local`. Edit `.env.local.example` for documentation.

## Key files

- `src/lib/api.ts` — all API calls, X-API-Key injected automatically
- `src/hooks/useAuth.ts` — Google login state, returns `{ accessToken, isAuthenticated, loginWithGoogle, logout, refresh }`
- `src/components/ui/` — shadcn/ui components (Radix primitives + Tailwind)
- `src/app/` — App Router pages

## Conventions

- Use shadcn/ui components from `src/components/ui/` for all UI primitives
- Charts: Recharts with Tailwind color tokens
- API calls always go through `src/lib/api.ts` — never call `fetch` directly in components
- Free-tier pages must work without calling `loginWithGoogle` — pass no token to free API methods
- Paid-tier pages gate content behind `isAuthenticated` check, show Google sign-in if false

## API endpoints

| Path | Tier | Hook |
|---|---|---|
| `POST /auth/google/` | — | `api.googleAuth(googleToken)` |
| `POST /token/refresh/` | — | `api.refreshToken(refresh)` |
| `POST /project/` | Free | `api.projectLiquidAsset(payload)` |
| `POST /retirementage/` | Free | `api.calculateRetirementAge(payload)` |
| `POST /requiredannualsaving/` | Paid | `api.calculateAnnualSavings(payload, token)` |
| `POST /maxsafewithdrawal/` | Paid | `api.calculateMaxSafeWithdrawal(payload, token)` |
