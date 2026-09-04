# Email Outreach Dashboard

A one-page Next.js (App Router + TypeScript) app for uploading a CSV of
contacts, attaching a CV, and sending personalized outreach emails through
[Resend](https://resend.com) — via a persistent, database-backed queue, not a
synchronous loop.

Each user brings their own Resend account. New accounts are unverified by
default; the app owner manually verifies accounts (sec. "Manual account
verification" below) before they can actually send email.

## 1. Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM (works great with [Neon](https://neon.tech))
- Resend Node SDK for delivery
- Custom email/password auth (no third-party auth provider)
- Cron-triggered queue worker (Vercel Cron, or any external scheduler)

## 2. Local development

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET, APP_ENCRYPTION_KEY (sec. "Environment variables")

npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000, sign up, and log in.

### Manually verifying an account (no verification endpoint)

There is deliberately no self-serve "verify my account" API route — that's a
guard against a publicly deployed instance being used by strangers for free.
After someone signs up, verify them yourself directly in the database.

Using the Neon SQL console (or `psql`, or Prisma Studio via `npx prisma
studio`):

```sql
UPDATE "User" SET "verified" = true WHERE "email" = 'someone@example.com';
```

Until an account is verified, that user can log in, upload a CSV/CV, write
templates, and preview emails — but starting a campaign is blocked with a 403.

## 3. Environment variables

See `.env.example`. In short:

| Variable             | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `DATABASE_URL`       | Postgres connection string                            |
| `AUTH_SECRET`        | Signs session cookies                                 |
| `APP_ENCRYPTION_KEY` | Encrypts each user's Resend API key at rest           |
| `CRON_SECRET`        | Optional bearer token to protect `/api/queue/process` |

Notably absent: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`,
`RESEND_REPLY_TO`. Those are never set via `.env` — each signed-in user enters
their own in the **Resend settings** panel in the app. The key is encrypted
(`lib/crypto.ts`, AES-256-GCM) before it's written to the database, and is
only decrypted in memory for the duration of a single send call
(`lib/queue.ts`). The UI also caches these values (lightly encoded) in that
browser's `localStorage` purely so the form doesn't come back empty next
visit — the values that actually matter live on the server.

## 4. Database

```bash
npx prisma migrate dev --name init      # local
npx prisma migrate deploy               # production
```

Models: `User`, `Attachment`, `Campaign`, `CampaignContact` — see
`prisma/schema.prisma`. The CV is stored as base64 in `Attachment.data`
rather than on disk, because serverless platforms don't guarantee a writable,
persistent filesystem between invocations. `lib/storage.ts` isolates this
choice behind a small interface so it can be swapped for S3-compatible
storage later without touching the rest of the app.

## 5. How sending avoids request timeouts and browser dependency

1. The browser calls `POST /api/campaigns/:id/start`. That route only flips
   the campaign's status to `ACTIVE` and returns immediately — it never sends
   an email itself.
2. A separate endpoint, `GET/POST /api/queue/process`, does the actual
   sending. It processes **one batch** (`batchSize` contacts) for every
   `ACTIVE` campaign and returns — never a loop over "all remaining
   contacts."
3. That endpoint is triggered by **Vercel Cron** (see `vercel.json`, runs
   every minute) or any external scheduler hitting the same URL. Because
   sending happens on a schedule independent of any open tab, closing the
   browser does not stop or pause a campaign.
4. Retries use exponential backoff: a failed contact is set back to
   `PENDING` with `scheduledAt` pushed into the future (1m, 2m, 4m, ...) until
   `maxRetries` is hit, at which point it's marked `FAILED`.
5. `Campaign.lastBatchAt` + `delayBetweenBatchesMs` enforce the configured
   delay between batches even if the cron trigger fires more often than that.

### Vercel Cron notes

- Vercel Cron's minimum interval depends on your plan; Hobby plans have
  historically been limited to once-per-day crons, while Pro supports
  per-minute schedules. Check your current plan's limits before relying on
  the `*/1 * * * *` schedule in `vercel.json`.
- If your plan doesn't support frequent crons, point an external scheduler
  (e.g. cron-job.org, GitHub Actions on a schedule) at
  `https://your-domain/api/queue/process` with header
  `Authorization: Bearer <CRON_SECRET>` instead.

## 6. Resend configuration (per user, in-app)

1. Create a Resend account and API key at https://resend.com.
2. Verify a sending domain in Resend (or use their test domain while
   developing).
3. Log into this app, open the **Resend settings** panel, and enter:
   - API key
   - From email (must be on a domain verified in your Resend account)
   - From name (optional)
   - Reply-to email (optional — replies land here instead of the from
     address)
4. Click **Save settings**. Nothing here touches server `.env` files.

## 7. Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Set `DATABASE_URL`, `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, and (optionally)
   `CRON_SECRET` as project environment variables. Do **not** set any
   Resend-related variables.
4. Deploy. `vercel.json` registers the cron job automatically on Pro-tier
   (or higher) projects; confirm it appears under Project → Cron Jobs.
5. Run `npx prisma migrate deploy` against your production `DATABASE_URL`
   (e.g. from your local machine, or a one-off Vercel deploy hook) before
   first use.
6. Sign up through the deployed app, then verify your own account with the
   SQL statement in sec. 2 above.

## 8. Security notes

- All Resend calls happen server-side only (`lib/resend.ts`); the API key
  never reaches the browser after being saved.
- CSV and CV uploads are validated server-side (type, size) regardless of
  what the client already checked.
- Campaign and contact routes are scoped to the authenticated user —
  one account can never see or act on another account's campaigns.
- Unverified accounts can use every part of the UI except actually starting
  a campaign (`403` from `/api/campaigns/:id/start`), which is enforced
  server-side, not just hidden in the UI.
- The queue endpoint checks for an `Authorization: Bearer <CRON_SECRET>`
  header or Vercel's own `x-vercel-cron` header before processing anything,
  when `CRON_SECRET` is set.

## 9. Project structure

```text
app/
  page.tsx
  api/
    auth/            signup, login, logout, me
    settings/         per-user Resend settings (encrypted at rest)
    upload/           csv, cv
    campaigns/         create/list/detail/start/pause/resume
    contacts/          retry/cancel
    preview/           render a single email without saving
    queue/process/    cron-triggered batch worker

lib/
  db.ts               Prisma client singleton
  auth.ts             password hashing, session JWT, current user
  crypto.ts           AES-256-GCM encode/decode for stored secrets
  csv.ts               CSV parsing/validation
  email-template.ts   built-in Company/School templates, rendering
  resend.ts            Resend API wrapper (per-user config, no env key)
  queue.ts              batch processing + retry/backoff logic
  storage.ts            CV attachment storage abstraction
  validation.ts         shared validators
  local-settings.ts     client-side localStorage cache for Settings form

components/
  AuthPanel.tsx  SettingsPanel.tsx  CsvUploader.tsx  CvUploader.tsx
  TemplateEditor.tsx  CampaignPreview.tsx  CampaignStats.tsx
  ContactTable.tsx  QueueControls.tsx  CampaignHistory.tsx

prisma/
  schema.prisma
```
