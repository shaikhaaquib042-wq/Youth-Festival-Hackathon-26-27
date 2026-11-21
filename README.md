# SunShield Hackathon

This repository contains the existing Node.js backend/database work at the repository root and
the SunShield React frontend in `frontend/`.

## Frontend

```sh
cd frontend
npm ci
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` to configure the frontend API base URL and
mock mode. Do not put database credentials or Supabase service-role keys in frontend environment
files.

Frontend type checking, linting, formatting, and build commands are documented in
`frontend/README.md`.
