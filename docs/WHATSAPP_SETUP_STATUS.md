# WhatsApp Cloud API — Setup Status & Handoff

> Living handoff note so this work can resume on any machine / in a fresh Claude session.
> **No secrets are stored here** (tokens/app-secret live in Firestore + Meta). See "Secrets" below.

## TL;DR — where we are
Goal: **WhatsApp Business Cloud API** built into VowsOS (direct integration, no BSP).
Status: **Test setup is WORKING** — an outbound send from VowsOS reached Meta's API
(error `#131030 "recipient not in allowed list"` = the pipe works; the test recipient just
wasn't whitelisted). Remaining work is whitelisting a test number, the webhook, then moving
to a real production number + permanent token + business verification.

## ⚠️ Critical context — the account restriction (this cost us days)
- The personal Facebook account **"Ryan Cy Lo"** is **permanently restricted** (since **20 Feb 2023** — advertising / "can't manage advertising assets or people for businesses"). It **cannot** connect apps to businesses → this blocked every WhatsApp attempt with "temporarily blocked."
- **Fix / rule:** do ALL Meta WhatsApp work as a **different clean account — "King Lung Heen"** (`kinglungheen@gmail.com`) which owns the real restaurant business **"KINGLUNGHEEN 璿瓏軒"**. **Never use the Ryan Cy Lo account for Meta business actions.**

## Meta assets (all under the clean "King Lung Heen" account)
| Thing | Value |
|---|---|
| Clean login | **King Lung Heen** (`kinglungheen@gmail.com`) — manages real Page `Kinglungheenhk 璿瓏軒`, IG/Threads `kinglungheenhk` |
| Business portfolio | **KINGLUNGHEEN 璿瓏軒**, Business ID `1857773107927918` |
| Developer app | **KLH Chat**, App ID `2061268307820149` (use case: *Connect with customers through WhatsApp*) |
| TEST number | `+1 555 201-7800`, Phone Number ID `1208723425661101`, WABA ID `1051902097388851`, **temporary** token (~24h) |

Abandoned (do not use): business **"King Lung Heen"** `894308775142813` (under the *restricted* Ryan account) with WABA `king lung heen vowsOS` + number `+852 5222 6057`. That number is stuck in that business's WABA and can't easily be freed (needs actions the restricted account is blocked from). **Plan on a NEW production number under 璿瓏軒.**

## Secrets — NOT in this repo
- **Access token + App Secret** are stored in Firestore `messaging_secrets/{appId}` (written via VowsOS → Settings → 通訊 → WhatsApp; card shows "已連接"). Locked `read,write:if false`.
- Re-fetch **App Secret** anytime: Meta → KLH Chat → App settings → Basic → 顯示.
- **Webhook callback URL:** `https://asia-east2-event-management-system-9f764.cloudfunctions.net/whatsappWebhook`
- **Webhook verify token:** the `WHATSAPP_VERIFY_TOKEN` Firebase secret (platform-wide, same for all tenants). Get the value from the deployed secret / the person who set it — **not committed here**.
- **Subscribe field:** `messages`.

## VowsOS config already saved
Settings → 通訊 → WhatsApp holds: Phone Number ID `1208723425661101`, WABA ID `1051902097388851`, the test token, and the App Secret → status **已連接**. Stored server-side (Firestore) so it persists across machines.

## Done
- [x] Found the root cause (restricted Ryan account) and pivoted to the clean **King Lung Heen / 璿瓏軒** account.
- [x] Developer account verified (via credit card).
- [x] Created app **KLH Chat** with the WhatsApp use case — no more "temporarily blocked".
- [x] Generated test credentials, saved into VowsOS → outbound call to Meta **succeeded** (`#131030` only = recipient not whitelisted).

## Next steps — RESUME HERE
1. **Whitelist a real mobile** on the test number: Meta → KLH Chat → WhatsApp → API Setup (步驟 1) → 傳送對象 → add your mobile (+852…) → enter the SMS code. Set that same number as an event's client phone in VowsOS, then resend the template → confirm the WhatsApp arrives.
2. **Webhook (inbound):** Meta → KLH Chat → WhatsApp → Configuration → set callback URL + verify token (above) → Verify & Save → subscribe `messages`. Then a reply from the phone lands in VowsOS **對話**.
3. **Production number (Step 2 / 正式環境設定):** add a **new** real number under 璿瓏軒's WABA and verify it (52226057 is stuck in the old restricted business).
4. **Permanent token:** replace the temp token — Business Settings → Users → System users → create a system user → assign the WABA + KLH Chat app → generate token with `whatsapp_business_messaging` + `whatsapp_business_management`. Paste into VowsOS → Settings → 通訊.
5. **Business verification (Step 3):** verify **璿瓏軒** (Security Center) to lift limits and message any customer.
6. Update VowsOS WhatsApp config with the **production** Phone Number ID + WABA ID + permanent token.

## VowsOS code that powers this (built + deployed)
- `functions/index.js`: `setWhatsappConfig`, `getWhatsappStatus`, `getWhatsappTemplates`, `whatsappWebhook`, `sendEventMessage` (WhatsApp branch: text within 24h window, else template).
- Firestore: `messaging_secrets/{appId}` (creds, functions-only), `wa_routes/{phoneNumberId}` → appId (inbound routing).
- Frontend: `SettingsView` 通訊 WhatsApp card (`src/features/settings/SettingsView.jsx`); `MessagesTab` WhatsApp mode + template picker (`src/features/events/components/MessagesTab.jsx`).

## Run / deploy
- Live: `kinglungheen.vowsos.com`
- Local: `npm install` → `npm run dev` → `http://kinglungheen.localhost:5173` (subdomain resolves the tenant; plain localhost won't).
- Deploy: `git push` → Vercel builds the frontend; `firebase deploy --only functions` for the backend.

## Also recently built (context for a fresh session)
Native comms inbox replacing SleekFlow: per-store email via Resend (send/receive, attachments, CC/BCC, auto-BCC, signature), global Messages inbox + Unassigned bucket, and in the chatbox: **AI 草擬** (AI draft that pulls the event's real details via DeepSeek), **一鍵翻譯** (per-message + draft translate), **📄 attach system documents** (generate PDF → attach), draft persistence across tabs, and the 對話 footer toggle. WhatsApp is the last channel to finish (this doc).
