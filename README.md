# TTMA — Trades Tool Management App

A WhatsApp bot that helps trades teams track tools on job sites. Workers check tools in and out by sending a simple text message — no app download, no login required. Managers view all data on a password-protected web dashboard.

## Stack

- **Next.js 16** — Backend API + Dashboard UI
- **Twilio** — WhatsApp messaging
- **Firebase Firestore** — Database
- **Gemini AI** (`@google/genai`) — Natural language message parsing
- **Vercel** — Hosting

---

## How It Works

1. A worker sends a WhatsApp message to the bot (e.g. _"grabbed the Dewalt Drill"_).
2. Twilio forwards the message to the `/api/webhook` endpoint.
3. The bot looks up the sender's phone number in Firestore.
   - If new, it asks for their name and registers them.
4. Gemini AI parses the message into a structured intent (checkout, checkin, status, help).
5. The bot reads/writes Firestore accordingly.
6. A confirmation is sent back to the worker via WhatsApp.

Managers visit `/dashboard`, enter the crew password, and see a live table of all active checkouts, history, and registered users.

---

## Prerequisites

### 1. Twilio WhatsApp

- A Twilio account with a WhatsApp-enabled sender ([docs](https://www.twilio.com/docs/whatsapp)).
- Note your **Account SID**, **Auth Token**, and **WhatsApp number** (format: `whatsapp:+1XXXXXXXXXX`).

### 2. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name it (e.g. "TTMA") — disable Google Analytics if you don't need it. Click **Create project**.
3. **Enable Firestore**:
   - In the left sidebar, click **Build** > **Firestore Database**.
   - Click **Create database**.
   - Choose a location close to your users.
   - Start in **production mode** (we use Admin SDK which bypasses rules).
4. **Get Service Account Credentials**:
   - Click the gear icon (top-left) > **Project settings**.
   - Go to the **Service accounts** tab.
   - Click **Generate new private key** > **Generate key**.
   - A JSON file downloads. Open it and extract these three values:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (the entire string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

> **Important**: Keep the JSON file safe and never commit it to git.

### 3. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key. Copy it → `GEMINI_API_KEY`.

### 4. Dashboard Password

Pick a password that your crew will use to access the dashboard. Set it as `DASHBOARD_PASSWORD`.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | Your Twilio WhatsApp number (e.g. `whatsapp:+14155238886`) |
| `FIREBASE_PROJECT_ID` | Firebase project ID (from service account JSON) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (full PEM string) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `DASHBOARD_PASSWORD` | Shared password for the `/dashboard` page |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (e.g. `https://ttma.vercel.app`) |

---

## Local Development

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`. The dashboard is at `http://localhost:3000/dashboard`.

For local webhook testing, use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
```

Then set the ngrok URL as your Twilio webhook: `https://xxxx.ngrok.io/api/webhook`.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo on [Vercel](https://vercel.com/new).
3. Add all environment variables in the Vercel project settings.
4. Deploy. Your webhook URL will be `https://your-app.vercel.app/api/webhook`.
5. Set this URL in your Twilio WhatsApp sender configuration:
   - Twilio Console > Messaging > Senders > WhatsApp Senders > your number > Endpoint URL.

---

## Project Structure

```
TTMA/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/route.ts       ← Twilio webhook (bot entry point)
│   │   │   ├── auth/route.ts          ← Dashboard password check
│   │   │   └── dashboard/route.ts     ← Dashboard data API
│   │   ├── dashboard/page.tsx         ← Dashboard UI (password-protected)
│   │   ├── layout.tsx
│   │   ├── page.tsx                   ← Landing page
│   │   └── globals.css
│   ├── lib/
│   │   ├── firebase.ts               ← Firebase Admin SDK init
│   │   ├── twilio.ts                  ← Twilio signature validation + TwiML
│   │   ├── gemini.ts                  ← Gemini AI message parsing
│   │   ├── sheets.ts                  ← Firestore CRUD operations
│   │   └── types.ts                   ← Shared TypeScript types
│   └── config/
│       └── prompts.ts                 ← Gemini system prompts
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Firestore Collections

The app uses three collections (created automatically on first write):

- **`users`** — registered workers (doc ID = phone number)
- **`activeCheckouts`** — tools currently checked out
- **`history`** — completed checkout/return records

---

## Message Examples

| You send | Bot does |
|----------|----------|
| _"grabbed the Dewalt Drill"_ | Checks out Dewalt Drill to you |
| _"bringing back the circular saw"_ | Returns the Circular Saw |
| _"who has the ladder?"_ | Shows who has the Ladder checked out |
| _"what's checked out?"_ | Lists all active checkouts |
| _"help"_ | Shows available commands |
