# Fire Planner Web

Next.js frontend for the [FIRE Planner](https://github.com/d-leong/FIRE-Planner) retirement planning tool. Connects to the Django REST API to project liquid assets, calculate retirement age, and model FIRE scenarios.

## Running Locally

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

**Docker (recommended):**

```bash
docker build --tag fire-planner-web .
docker run --publish 3000:3000 --env-file .env.local fire-planner-web
```

**Without Docker:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Django API (e.g. `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_API_KEY` | Client API key (`X-API-Key` header) — request from the API owner |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID for Sign In |
