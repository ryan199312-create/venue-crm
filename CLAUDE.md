# VowsOS — project notes for Claude

VowsOS is a multi-tenant SaaS venue/wedding-management CRM for HK banquet venues
(bilingual zh-HK / English). React + Vite SPA on Firebase (Auth, Firestore, Storage,
Cloud Functions v2 `asia-east2`). Multi-tenant by subdomain; data under
`/artifacts/{appId}/private/data/...`.

## ▶ Resuming in-progress work
**Read [docs/WHATSAPP_SETUP_STATUS.md](docs/WHATSAPP_SETUP_STATUS.md) first.** That's the live
handoff for the WhatsApp Cloud API integration — the current in-progress task — including
the Meta account situation, the assets/IDs, and the exact next steps to continue.

## Run / deploy
- Live site: `kinglungheen.vowsos.com`
- Local dev: `npm install` → `npm run dev` → open `http://kinglungheen.localhost:5173`
  (the `kinglungheen.` subdomain resolves the tenant; plain `localhost:5173` won't).
  Localhost talks to the **live production Firebase**.
- Deploy: `git push` → Vercel auto-builds the frontend on `main`;
  `firebase deploy --only functions` deploys the Cloud Functions (Firebase project
  `event-management-system-9f764`).

## Conventions
- Commit/push to `main` only when the user asks (that's the deploy trigger).
- Secrets are Firebase Functions secrets / functions-only Firestore docs
  (`messaging_secrets`, `wa_routes`, etc., locked `read,write: if false`) — never commit them.
