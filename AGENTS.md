# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TTMA (Trades Tool Management App) is a **single Next.js 16 application** (monolith) that serves as both a WhatsApp bot backend and a web dashboard. There are no Docker containers, microservices, or local databases to manage.

### Running the app

- `npm run dev` starts the Next.js dev server on port 3000.
- `npm run lint` runs ESLint.
- `npm run build` runs a production build. Note: this requires valid Firebase credentials in `.env.local` because API routes initialize the Firebase Admin SDK at module level during build.

### External service dependencies

The app depends on three external SaaS services (Firebase Firestore, Twilio, Google Gemini AI). These require real credentials in `.env.local` to function. Without them:

- The dev server starts and renders all UI pages (landing, dashboard, admin).
- API routes that touch Firestore will return connection errors.
- `npm run build` will fail during page data collection due to Firebase SDK initialization.

### Environment variables

All required env vars are listed in the README. A `.env.local` file must exist with at minimum placeholder values for the dev server to start. The key variables are: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`, `SUPER_ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`.

### Lint

`npm run lint` has one pre-existing error in `src/components/ThemeProvider.tsx` (setState called inside useEffect, flagged by `react-hooks/set-state-in-effect`). This is a known issue in the codebase.

### No automated tests

The repository has no test framework or automated tests configured. Manual testing is done via the browser (dashboard/admin UI) and via WhatsApp messages (webhook flow).
