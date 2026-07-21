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
3. Store tokens in `useAuth` hook state AND `localStorage` (`fire_auth` key) — deliberate decision to enable returning-user flow across sessions
4. Send `Authorization: Bearer <access>` on paid-tier API calls
5. Every request also sends `X-API-Key` header — this gates client-level access (not user-level)

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `API_URL` | Server-only | Django API base URL — used by Next.js Route Handlers |
| `API_KEY` | Server-only | Client-level API key (X-API-Key header) — never sent to browser |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public | Google OAuth client ID — needed client-side for Sign In |

Never commit `.env.local`. Edit `.env.local.example` for documentation.

## Key files

- `src/lib/api.ts` — all API calls, X-API-Key injected automatically; canonical home for shared types (`ExpenseProjection`, `FineProjection`, `ApiSnapshot`)
- `src/hooks/useAuth.ts` — Google login state, returns `{ accessToken, isAuthenticated, loginWithGoogle, logout, refresh }`
- `src/components/ui/` — shadcn/ui components (Radix primitives + Tailwind)
- `src/app/` — App Router pages
- `src/app/dashboard/page.tsx` — authenticated dashboard (see Dashboard section below)
- `src/components/expense-coverage-chart.tsx` — stacked bar + line chart; imports `ExpenseProjection` from `api.ts` and re-exports it
- `src/components/cpf-results-chart.tsx` — CPF balance projection chart used on both landing page and dashboard CPF tab

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
| `POST /pension/` | Free | via `/api/pension-coverage` route handler |
| `POST /snapshots/` | Account | `createSnapshot(payload, token)` |
| `GET /snapshots/` | Account | `listSnapshots(token)` |
| `POST /snapshots/{id}/compare/` | Account | `compareSnapshot(id, payload, token)` |

## Dashboard (`src/app/dashboard/page.tsx`)

Authenticated page. Two tabs: **FIRE Calculator** and **CPF Coverage Today**.

### Snapshot model fields (`ApiSnapshot`)

`id, created_at, income, expense, assets[], oa, sa, ma, age55Withdrawal, cpfLifePlan, cpfLifePayoutAge`

`age55Withdrawal` values: `"brs_withdrawal" | "frs_withdrawal" | "ers_pursuit"`
`cpfLifePlan` values: `"basic" | "standard" | "escalating"`

### `compareSnapshot` return shape

```ts
{
  snapshot: { id, createdAt, ageAtSnapshot, retirementAge, yearsToRetire, targetFIRE, fineProjection, expenseProjection? }
  live:     { age, retirementAge, yearsToRetire, targetFIRE, fineProjection, expenseProjection? }
  scorecard: { retirementAgeDelta, yearsToRetireDelta, targetFIREDelta }
}
```

`expenseProjection` shape (also exported from `expense-coverage-chart.tsx`):
```ts
{ age: number[], income: number[], cpf: number[], cash: number[], investment: number[], shortfall: number[], total: number[] }
```

### Tab layout

- **FIRE Calculator** tab: snapshot selector → scorecard → expense coverage chart → wealth projection chart → input panel
- **CPF Coverage Today** tab: CPF results chart + inline input panel (reuses shared CPF state — NOT `CpfForm` component, to avoid the age field conflict since age is derived from profile DOB on the dashboard)

### Shared CPF state

`liveOa, liveSa, liveMa, liveAge55Withdrawal, liveCpfLifePlan, liveCpfLifePayoutAge` are declared at page level and used by **both** tabs — edits in the CPF tab feed into the FIRE projection and vice versa.

### `skipLiveResultClear` ref pattern

After `handleSave`, `setSnapshots([newSnap, ...prev])` changes `latestSnap`, which triggers the seed effect. The seed effect normally calls `setLiveResult(null)`, causing a 1-second blank while the compare debounce re-fires. Since the inputs haven't changed after a save, blanking is wrong.

Fix: `skipLiveResultClear = useRef(false)`. Set to `true` in `handleSave` before `setSnapshots`. Seed effect checks the flag: if true, resets it and skips `setLiveResult(null)`.

### Pension coverage route handler

`src/app/api/pension-coverage/route.ts` — proxies to Django `/pension/`. Has try/catch that returns `{ detail: "Service unavailable." }` with status 503 if Django is down.
