const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { getFunctions } = require("firebase-admin/functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { Webhook } = require("svix");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const crypto = require("crypto");

// 1. INITIALIZE ADMIN SDK
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// 2. SET GLOBAL REGION
setGlobalOptions({ 
  region: "asia-east2",
  cors: true
});

// Define Secrets
const adminPhone = defineSecret("ADMIN_PHONE");
const deepseekKey = defineSecret("DEEPSEEK_KEY");
const resendKey = defineSecret("RESEND_KEY"); // transactional email (Resend); "unset" until configured
const resendWebhookSecret = defineSecret("RESEND_WEBHOOK_SECRET"); // Svix signing secret for inbound email; "unset" until configured
const resendInboundDomain = defineSecret("RESEND_INBOUND_DOMAIN"); // receiving domain for reply routing, e.g. reply.vowsos.com; "unset" until configured
const whatsappVerifyToken = defineSecret("WHATSAPP_VERIFY_TOKEN"); // platform token all tenants enter in their Meta webhook config; "unset" until configured

// --- Rate limiting for public (phone-auth) client-portal endpoints ---
// Tracks FAILED attempts per key in /rate_limits (Admin SDK only; clients can't touch it).
// Legitimate clients with the correct phone are never counted, so this throttles only
// brute-force. Set a Firestore TTL policy on rate_limits.expiresAt to auto-clean.
const RL_MAX = 12, RL_WINDOW_MS = 15 * 60 * 1000;
const rlKey = (...parts) => parts.join(':').replace(/[^a-zA-Z0-9_:-]/g, '_').slice(0, 250);
async function assertNotRateLimited(db, key) {
  const snap = await db.collection('rate_limits').doc(key).get();
  const d = snap.exists ? snap.data() : null;
  if (d && Date.now() - (d.windowStart || 0) < RL_WINDOW_MS && (d.count || 0) >= RL_MAX) {
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please try again in a few minutes.');
  }
}
async function recordFailedAttempt(db, key) {
  const ref = db.collection('rate_limits').doc(key);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (d && now - (d.windowStart || 0) < RL_WINDOW_MS) tx.update(ref, { count: (d.count || 0) + 1 });
    else tx.set(ref, { count: 1, windowStart: now, expiresAt: new Date(now + RL_WINDOW_MS) });
  });
}

// --- Client-portal password auth (phone + password) ---
// Credentials live in artifacts/{appId}/private/data/client_credentials/{last8phone}
// (locked to Cloud Functions only in firestore.rules). Passwords are scrypt-hashed with a
// per-record salt; a successful login mints an opaque session token (only its sha256 is
// stored) so the portal stays logged in without ever holding the password. Keyed by the
// last-8 digits of the phone — the same identity events are already matched on.
const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const cleanPhone8 = (p) => String(p || '').replace(/[^0-9]/g, '').slice(-8);
const clientCredRef = (db, appId, phone8) =>
  db.collection('artifacts').doc(appId).collection('private').doc('data').collection('client_credentials').doc(phone8);
function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), String(salt), SCRYPT_KEYLEN, (err, dk) => err ? reject(err) : resolve(dk.toString('hex')));
  });
}
function safeEqualHex(aHex, bHex) {
  try {
    const a = Buffer.from(String(aHex), 'hex'), b = Buffer.from(String(bHex), 'hex');
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_e) { return false; }
}
function newSessionToken() {
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, session: { tokenHash, expiresAt: Date.now() + SESSION_TTL_MS } };
}
function validClientSession(cred, sessionToken) {
  if (!cred || !cred.session || !cred.session.tokenHash || !sessionToken) return false;
  if ((cred.session.expiresAt || 0) < Date.now()) return false;
  const h = crypto.createHash('sha256').update(String(sessionToken)).digest('hex');
  return safeEqualHex(h, cred.session.tokenHash);
}
// Mutations still verify the phone matches the event; ADDITIONALLY, once a client has set
// a password, a valid session token is required (so knowing the phone alone is not enough).
async function assertClientSessionIfSet(db, appId, phone, sessionToken, rk) {
  const snap = await clientCredRef(db, appId, cleanPhone8(phone)).get();
  if (snap.exists && snap.data().hash) {
    if (!validClientSession(snap.data(), sessionToken)) {
      if (rk) await recordFailedAttempt(db, rk);
      throw new HttpsError('permission-denied', 'Your session has expired. Please log in again.');
    }
  }
}
async function findClientEvents(db, appId, eventId, phone8) {
  const eventsRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events');
  const matched = [];
  if (eventId) {
    const doc = await eventsRef.doc(eventId).get();
    if (doc.exists) { const d = doc.data(); if (cleanPhone8(d.clientPhone) === phone8) matched.push({ id: doc.id, ...d }); }
  } else {
    const snap = await eventsRef.where('clientPhoneClean', '==', phone8).get();
    snap.forEach(doc => matched.push({ id: doc.id, ...doc.data() }));
  }
  return matched;
}
function packClientEvents(matched) {
  const sanitized = matched.map(e => ({ ...e, totalAmount: parseFloat(e.totalAmount) || 0 }));
  sanitized.sort((a, b) => new Date(b.date) - new Date(a.date));
  return JSON.parse(JSON.stringify(sanitized));
}
async function getPortalSettings(db, appId) {
  const doc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('settings').doc('config').get();
  return doc.exists ? JSON.parse(JSON.stringify(doc.data())) : null;
}

const APP_ID = "my-venue-crm";

// Global cache for Puppeteer
let cachedBrowser = null;

// ==========================================
// 1. DATA MIGRATION (SUPER ADMIN ONLY)
// ==========================================
exports.migrateTenantData = onCall({ 
  memory: "1GiB", 
  timeoutSeconds: 300
}, async (request) => {
  if (!request.auth || request.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admins can migrate data.');
  }
  const { sourceId, targetId } = request.data;
  if (!sourceId || !targetId) throw new HttpsError('invalid-argument', 'Source and Target IDs required.');
  const db = admin.firestore();
  const copyCollection = async (sourcePath, targetPath) => {
    const sourceSnap = await db.collection(sourcePath).get();
    const batches = [];
    let currentBatch = db.batch();
    let count = 0;
    for (const doc of sourceSnap.docs) {
      currentBatch.set(db.collection(targetPath).doc(doc.id), doc.data(), { merge: true });
      count++;
      if (count === 400) { batches.push(currentBatch.commit()); currentBatch = db.batch(); count = 0; }
    }
    if (count > 0) batches.push(currentBatch.commit());
    await Promise.all(batches);
    return sourceSnap.size;
  };
  try {
    await copyCollection(`artifacts/${sourceId}/private/data/settings`, `artifacts/${targetId}/private/data/settings`);
    await copyCollection(`artifacts/${sourceId}/private/data/events`, `artifacts/${targetId}/private/data/events`);
    await copyCollection(`artifacts/${sourceId}/public_calendar`, `artifacts/${targetId}/public_calendar`);
    await copyCollection(`artifacts/${sourceId}/private/data/users`, `artifacts/${targetId}/private/data/users`);
    await db.collection('artifacts').doc(targetId).collection('private').doc('data').collection('settings').doc('config').set({
      isSetupComplete: true, migratedFrom: sourceId, migratedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) { throw new HttpsError('internal', error.message); }
});

exports.deleteTenant = onCall({ 
  memory: "1GiB", 
  timeoutSeconds: 300
}, async (request) => {
  if (!request.auth || request.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admins can delete tenants.');
  }
  const { tenantId } = request.data;
  if (!tenantId) throw new HttpsError('invalid-argument', 'Tenant ID is required.');
  const db = admin.firestore();
  try {
    await db.collection('tenants').doc(tenantId).delete();
    const artifactRef = db.collection('artifacts').doc(tenantId);
    await db.recursiveDelete(artifactRef);
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', error.message || 'Unknown deletion error');
  }
});

// ==========================================
// 2. PING
// ==========================================
exports.ping = onCall(() => ({ message: "Pong!" }));

// ==========================================
// 3. PDF GENERATION SYSTEM
// ==========================================
exports.enqueuePdfJob = onRequest({ 
  memory: "2GiB",
  timeoutSeconds: 120,
  invoker: "public"
}, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // --- AUTH: require a valid Firebase ID token (was public: arbitrary file read+delete) ---
      const authHeader = req.headers.authorization || '';
      const bearer = authHeader.match(/^Bearer (.+)$/);
      if (!bearer) return res.status(401).send("Unauthorized");
      let caller;
      try { caller = await admin.auth().verifyIdToken(bearer[1]); }
      catch (e) { return res.status(401).send("Invalid token"); }

      const { htmlPath, fileName, docType, jobId, appId: requestAppId, orderId, eventName } = req.body.data || req.body;
      const appId = requestAppId || APP_ID;

      if (!jobId) return res.status(400).send("Missing jobId");
      if (!htmlPath) return res.status(400).send("Missing htmlPath");

      // --- TENANT BINDING: the caller must belong to the tenant they name ---
      const isSuper = caller.role === 'super_admin';
      if (!isSuper) {
        if (caller.tenantId) {
          if (caller.tenantId !== appId) return res.status(403).send("Tenant mismatch");
        } else {
          // Migration grace: bind via an existing user doc under the requested tenant.
          const memberDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(caller.uid).get();
          if (!memberDoc.exists) return res.status(403).send("Not a member of this tenant");
        }
      }

      // --- PATH ALLOWLIST: only the caller's own payload dir; never receipts / other tenants ---
      if (typeof htmlPath !== 'string'
          || htmlPath.indexOf('..') !== -1
          || !htmlPath.startsWith(`pdf_payloads/${appId}/`)
          || !htmlPath.endsWith('.html')) {
        return res.status(403).send("Invalid htmlPath");
      }

      console.log(`[PDF] Processing synchronous job ${jobId} for tenant ${appId}.`);

      const jobRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('pdf_jobs').doc(jobId);
      
      await jobRef.set({ 
        status: 'processing', 
        htmlPath, 
        fileName: fileName || 'document.pdf', 
        docType: docType || 'DOCUMENT', 
        orderId: orderId || '', 
        eventName: eventName || '', 
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
      });

      let page = null;
      try {
        // 1. Download HTML from Storage
        const bucket = admin.storage().bucket();
        const htmlFile = bucket.file(htmlPath);
        const [htmlContent] = await htmlFile.download();
        const htmlString = htmlContent.toString();

        // 2. Launch Puppeteer
        if (!cachedBrowser || !cachedBrowser.isConnected()) { 
          cachedBrowser = await puppeteer.launch({ 
            args: chromium.args, 
            defaultViewport: chromium.defaultViewport, 
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless, 
            ignoreHTTPSErrors: true 
          }); 
        }
        
        page = await cachedBrowser.newPage();
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
        await page.setContent(htmlString, { waitUntil: "networkidle0", timeout: 60000 });
        await page.evaluateHandle('document.fonts.ready');
        
        // 3. Generate PDF
        const pdfBuffer = await page.pdf({ 
          format: "A4", 
          printBackground: true, 
          preferCSSPageSize: false, 
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: `
            <style>
              #footer { padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact; }
            </style>
            <div style="width: 100%; font-size: 10px; padding: 0 15mm; display: flex; justify-content: space-between; align-items: center; color: #1e293b; font-family: 'Helvetica', 'Arial', sans-serif; border-top: 0.5px solid #cbd5e1; padding-top: 3mm; font-weight: bold;">
              <div style="text-transform: uppercase; letter-spacing: 0.02em;">
                ORDER: ${orderId || ''} | ${eventName || ''}
              </div>
              <div style="color: #64748b;">PAGE <span class="pageNumber"></span> OF <span class="totalPages"></span></div>
            </div>
          `,
          margin: { top: '10mm', bottom: '15mm', left: '10mm', right: '10mm' }
        });

        await page.close();

        // 4. Save to Storage
        const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_') : "document.pdf";
        const uniquePath = `generated_pdfs/${Date.now()}_${safeFileName}`;
        const pdfFile = bucket.file(uniquePath);
        const token = crypto.randomUUID();
        
        await pdfFile.save(pdfBuffer, { 
          metadata: { 
            contentType: 'application/pdf', 
            metadata: { firebaseStorageDownloadTokens: token } 
          } 
        });
        
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniquePath)}?alt=media&token=${token}`;
        
        // 5. Cleanup
        await htmlFile.delete().catch(err => console.error("[PDF] Cleanup Error:", err));

        await jobRef.update({ status: 'completed', url: publicUrl, htmlPath: admin.firestore.FieldValue.delete() });
        
        res.status(200).json({ data: { jobId, url: publicUrl } });

      } catch (error) { 
        if (page) await page.close().catch(() => {}); 
        await jobRef.update({ status: 'error', error: error.message }); 
        throw error; 
      }

    } catch (error) { 
      console.error("[PDF] Enqueue/Generation Error:", error);
      res.status(500).send(error.message);
    }
});

exports.generatePdfTask = onTaskDispatched({ 
  memory: "2GiB", 
  timeoutSeconds: 300,
  taskQueueName: "pdf-gen-queue" 
}, async (request) => {
    const { jobId, appId: taskAppId } = request.data;
    const db = admin.firestore();
    const appId = taskAppId || APP_ID;
    const jobRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('pdf_jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return;
    const { htmlPath, fileName, docType, orderId, eventName } = jobSnap.data();
    await jobRef.update({ status: 'processing' });
    let page = null;
    try {
      // Download HTML from Storage
      const bucket = admin.storage().bucket();
      const htmlFile = bucket.file(htmlPath);
      const [htmlContent] = await htmlFile.download();
      const htmlString = htmlContent.toString();

      if (!cachedBrowser || !cachedBrowser.isConnected()) { cachedBrowser = await puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: await chromium.executablePath(), headless: chromium.headless, ignoreHTTPSErrors: true }); }
      page = await cachedBrowser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 4 });
      await page.setContent(htmlString, { waitUntil: "networkidle0", timeout: 60000 });
      await page.evaluateHandle('document.fonts.ready');
      
      const pdfBuffer = await page.pdf({ 
        format: "A4", 
        printBackground: true, 
        preferCSSPageSize: false, 
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <style>
            #footer { 
              padding: 0 !important; 
              margin: 0 !important; 
              -webkit-print-color-adjust: exact;
            }
          </style>
          <div style="width: 100%; font-size: 10px; padding: 0 15mm; display: flex; justify-content: space-between; align-items: center; color: #1e293b; font-family: 'Helvetica', 'Arial', sans-serif; border-top: 0.5px solid #cbd5e1; padding-top: 3mm; font-weight: bold;">
            <div style="text-transform: uppercase; letter-spacing: 0.02em;">
              ORDER: ${orderId || ''} | ${eventName || ''}
            </div>
            <div style="color: #64748b;">PAGE <span class="pageNumber"></span> OF <span class="totalPages"></span></div>
          </div>
        `,
        margin: {
          top: '10mm',
          bottom: '15mm',
          left: '10mm',
          right: '10mm'
        }
      });
      await page.close();
      const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_') : "document.pdf";
      const uniquePath = `generated_pdfs/${Date.now()}_${safeFileName}`;
      const file = bucket.file(uniquePath);
      const token = crypto.randomUUID();
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: token } } });
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniquePath)}?alt=media&token=${token}`;
      
      // Cleanup: Delete the temp HTML payload
      await htmlFile.delete().catch(err => console.error("[PDF] Cleanup Error:", err));

      await jobRef.update({ status: 'completed', url: publicUrl, htmlPath: admin.firestore.FieldValue.delete() });
    } catch (error) { if (page) await page.close().catch(() => {}); await jobRef.update({ status: 'error', error: error.message }); throw error; }
});

// ==========================================
// 4. CLIENT PORTAL OPERATIONS (CRITICAL)
// ==========================================
exports.verifyClientAccess = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, password, sessionToken, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  try {
    const phone8 = cleanPhone8(phone);
    if (phone8.length < 8) throw new HttpsError('invalid-argument', 'A valid phone number is required.');
    const rk = rlKey('client', appId, eventId || phone8);
    await assertNotRateLimited(db, rk);

    // The phone must match a real event (this is what gates who may register/log in).
    const matchedEvents = await findClientEvents(db, appId, eventId, phone8);
    if (matchedEvents.length === 0) { await recordFailedAttempt(db, rk); throw new HttpsError('not-found', 'No events found.'); }

    const credSnap = await clientCredRef(db, appId, phone8).get();
    // First-time client: no password on file yet -> the portal must run one-time setup.
    if (!credSnap.exists || !credSnap.data().hash) return { needsSetup: true };
    const cred = credSnap.data();

    // Returning client with a valid session token -> log straight in (no password prompt).
    if (validClientSession(cred, sessionToken)) {
      return { events: packClientEvents(matchedEvents), appSettings: await getPortalSettings(db, appId) };
    }
    // No/invalid password supplied -> ask the portal to prompt for it.
    if (!password) return { needsPassword: true };

    // Verify the password.
    const attempt = await scryptHash(password, cred.salt);
    if (!safeEqualHex(attempt, cred.hash)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Incorrect password.'); }

    // Success: mint a fresh session token so the portal can stay logged in.
    const { token, session } = newSessionToken();
    await clientCredRef(db, appId, phone8).set({ session }, { merge: true });
    return { events: packClientEvents(matchedEvents), appSettings: await getPortalSettings(db, appId), sessionToken: token };
  } catch (error) { if (error instanceof HttpsError) throw error; throw new HttpsError('internal', error.message); }
});

// One-time setup: a client whose phone matches a real event creates their password.
// Fails if a password already exists (they must log in, or ask staff to reset it).
exports.setupClientPassword = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, password, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  try {
    const phone8 = cleanPhone8(phone);
    if (phone8.length < 8) throw new HttpsError('invalid-argument', 'A valid phone number is required.');
    if (!password || String(password).length < 6) throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    const rk = rlKey('client', appId, eventId || phone8);
    await assertNotRateLimited(db, rk);

    const matchedEvents = await findClientEvents(db, appId, eventId, phone8);
    if (matchedEvents.length === 0) { await recordFailedAttempt(db, rk); throw new HttpsError('not-found', 'No events found for this phone number.'); }

    const ref = clientCredRef(db, appId, phone8);
    const existing = await ref.get();
    if (existing.exists && existing.data().hash) throw new HttpsError('already-exists', 'A password is already set. Please log in, or ask staff to reset it.');

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scryptHash(password, salt);
    const { token, session } = newSessionToken();
    await ref.set({ phoneClean: phone8, salt, hash, session, createdAt: new Date().toISOString() }, { merge: true });
    return { events: packClientEvents(matchedEvents), appSettings: await getPortalSettings(db, appId), sessionToken: token };
  } catch (error) { if (error instanceof HttpsError) throw error; throw new HttpsError('internal', error.message); }
});

// Staff-only: clear a client's portal password so they can set a new one on next login
// (the portal has no email/OTP self-service reset).
exports.resetClientPassword = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { phone, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const role = request.auth.token.role;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const boundToTenant = role === 'super_admin' || request.auth.token.tenantId === appId;
  if (!isAdmin || !boundToTenant) throw new HttpsError('permission-denied', 'Admins only.');
  const phone8 = cleanPhone8(phone);
  if (phone8.length < 8) throw new HttpsError('invalid-argument', 'A valid phone number is required.');
  await clientCredRef(admin.firestore(), appId, phone8).delete().catch(() => {});
  return { success: true };
});

// Detect a file's real MIME from its magic bytes (never trust the filename extension).
function detectFileType(buf) {
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

exports.uploadClientPaymentProof = onCall({ memory: "512MiB" }, async (request) => {
  const { eventId, phone, fileName, fileBase64, sessionToken, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  try {
    if (!eventId || !fileName || !fileBase64) throw new HttpsError('invalid-argument', 'Missing required fields.');
    const safeEventId = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '');
    const rk = rlKey('client', appId, safeEventId);
    await assertNotRateLimited(db, rk);
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(safeEventId);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    if (String(phone).replace(/[^0-9]/g, '').slice(-8) !== String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
    await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length === 0) throw new HttpsError('invalid-argument', 'Empty file.');
    if (buffer.length > 10 * 1024 * 1024) throw new HttpsError('invalid-argument', 'File too large (max 10MB).');

    const contentType = detectFileType(buffer);
    if (!contentType) throw new HttpsError('invalid-argument', 'Only JPEG, PNG, WEBP, or PDF allowed.');

    if ((docSnap.data().clientUploadedProofs || []).length >= 20) {
      throw new HttpsError('resource-exhausted', 'Too many uploaded proofs.');
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
    const safeAppId = String(appId).replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    const uniqueFileName = `receipts/${safeAppId}/client_${safeEventId}_${Date.now()}_${safeName}`;
    const file = bucket.file(uniqueFileName);
    const token = crypto.randomUUID();
    await file.save(buffer, { metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } } });
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniqueFileName)}?alt=media&token=${token}`;
    await eventRef.update({ clientUploadedProofs: admin.firestore.FieldValue.arrayUnion({ url: publicUrl, uploadedAt: new Date().toISOString(), fileName: safeName }) });
    return { success: true, url: publicUrl };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('uploadClientPaymentProof error:', error);
    throw new HttpsError('internal', 'Upload failed.');
  }
});

exports.signClientContract = onCall({ invoker: "public" }, async (request) => {
    const { eventId, phone, signatureBase64, docType, sessionToken, appId: requestAppId } = request.data;
    const appId = requestAppId || APP_ID;
    const db = admin.firestore();
    const rk = rlKey('client', appId, eventId);
    await assertNotRateLimited(db, rk);
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    if (String(phone).replace(/[^0-9]/g, '').slice(-8) !== String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
    await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);
    const updateData = {};
    if (docType) { updateData[`signatures.${docType}.client`] = signatureBase64; updateData[`signatures.${docType}.clientDate`] = new Date().toISOString(); }
    else { updateData.clientSignature = signatureBase64; updateData.clientSignatureDate = new Date().toISOString(); }
    await eventRef.update(updateData);
    return { success: true };
});

exports.updateClientRundown = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, rundown, sessionToken, appId: requestAppId } = request.data;
  const db = admin.firestore();
  const appId = requestAppId || APP_ID;
  const rk = rlKey('client', appId, eventId);
  await assertNotRateLimited(db, rk);
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
  const docSnap = await eventRef.get();
  if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  if (String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
  await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);
  await eventRef.update({ rundown });
  return { success: true };
});

// Client (couple) manages their wedding guest list from the portal. Stored as an array
// on the event doc (like rundown), so the admin sees the same list + headcount.
exports.updateClientGuests = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, guests, sessionToken, appId: requestAppId } = request.data;
  const db = admin.firestore();
  const appId = requestAppId || APP_ID;
  const rk = rlKey('client', appId, eventId);
  await assertNotRateLimited(db, rk);
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
  const docSnap = await eventRef.get();
  if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  if (String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
  await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);
  if (!Array.isArray(guests)) throw new HttpsError('invalid-argument', 'guests must be an array.');
  if (guests.length > 1000) throw new HttpsError('invalid-argument', 'Too many guests (max 1000).');
  await eventRef.update({ guests });
  return { success: true };
});

// ==========================================
// 4b. GUEST RSVP PORTAL (public, no login)
// ==========================================
const normName = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');
const rsvpOpen = (ev) => !!ev.rsvpEnabled && (!ev.rsvpDeadline || new Date(ev.rsvpDeadline) >= new Date(new Date().toDateString()));

// Enable/disable RSVP collection for an event and lazily mint a shareable token.
// Authorized by EITHER a tenant admin (Firebase auth) OR the client (phone + session).
exports.setRsvpConfig = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, sessionToken, enabled, deadline, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(String(eventId || ''));
  const docSnap = await eventRef.get();
  if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  const ev = docSnap.data();

  const t = request.auth && request.auth.token;
  const isAdmin = t && (t.role === 'super_admin' || (['admin', 'staff'].includes(t.role) && t.tenantId === appId));
  if (!isAdmin) {
    const rk = rlKey('client', appId, eventId);
    await assertNotRateLimited(db, rk);
    if (cleanPhone8(phone) !== cleanPhone8(ev.clientPhone)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
    await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);
  }

  const patch = { rsvpEnabled: !!enabled };
  if (enabled && !ev.rsvpToken) patch.rsvpToken = crypto.randomBytes(9).toString('base64url'); // ~12-char, unguessable
  if (deadline !== undefined) patch.rsvpDeadline = deadline || '';
  await eventRef.update(patch);
  return { success: true, rsvpEnabled: !!enabled, rsvpToken: ev.rsvpToken || patch.rsvpToken || '', rsvpDeadline: patch.rsvpDeadline !== undefined ? patch.rsvpDeadline : (ev.rsvpDeadline || '') };
});

// Public: minimal info to render the RSVP form. NEVER returns the guest list.
exports.getRsvpInfo = onCall({ invoker: "public" }, async (request) => {
  const { token, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const tok = String(token || '').trim();
  if (!tok) throw new HttpsError('invalid-argument', 'Missing link.');
  const rk = rlKey('rsvp', appId, tok);
  await assertNotRateLimited(db, rk);
  const snap = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').where('rsvpToken', '==', tok).limit(1).get();
  if (snap.empty) { await recordFailedAttempt(db, rk); throw new HttpsError('not-found', 'Invalid link.'); }
  const ev = snap.docs[0].data();
  const settings = await getPortalSettings(db, appId);
  return {
    open: rsvpOpen(ev),
    eventName: ev.eventName || '',
    clientName: ev.clientName || '',
    date: ev.date || '',
    venueLocation: ev.venueLocation || '',
    venueName: settings?.venueProfile?.nameZh || settings?.branding?.portalTitle || '',
    venueNameEn: settings?.venueProfile?.nameEn || '',
    deadline: ev.rsvpDeadline || '',
  };
});

// Public: a guest submits their RSVP. Matches an existing guest by name or appends a new
// one. Transactional so simultaneous replies don't clobber each other.
exports.submitRsvp = onCall({ invoker: "public" }, async (request) => {
  const { token, name, phone, attending, partySize, mealChoice, dietary, message, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const tok = String(token || '').trim();
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!tok) throw new HttpsError('invalid-argument', 'Missing link.');
  if (!cleanName) throw new HttpsError('invalid-argument', 'Please enter your name.');
  const rk = rlKey('rsvp', appId, tok);
  await assertNotRateLimited(db, rk);

  const snap = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').where('rsvpToken', '==', tok).limit(1).get();
  if (snap.empty) { await recordFailedAttempt(db, rk); throw new HttpsError('not-found', 'Invalid link.'); }
  const eventRef = snap.docs[0].ref;

  const entry = {
    name: cleanName,
    phone: cleanPhone8(phone) || '',
    partySize: Math.max(1, Math.min(50, Number(partySize) || 1)),
    rsvp: (attending === false || attending === 'no') ? 'no' : 'yes',
    mealChoice: String(mealChoice || '').slice(0, 60),
    dietary: String(dietary || '').slice(0, 200),
    message: String(message || '').slice(0, 300),
    side: '',
    relation: '',
    source: 'self',
    submittedAt: new Date().toISOString(),
  };

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(eventRef);
    const ev = fresh.data();
    if (!rsvpOpen(ev)) throw new HttpsError('failed-precondition', 'RSVP is closed.');
    const guests = Array.isArray(ev.guests) ? [...ev.guests] : [];
    const idx = guests.findIndex(g => normName(g.name) && normName(g.name) === normName(cleanName));
    if (idx >= 0) {
      guests[idx] = { ...guests[idx], ...entry, id: guests[idx].id };
    } else {
      if (guests.length >= 1000) throw new HttpsError('resource-exhausted', 'Guest list is full.');
      guests.push({ ...entry, id: Date.now().toString() + Math.random().toString(36).slice(2, 7) });
    }
    tx.update(eventRef, { guests });
  });
  return { success: true, rsvp: entry.rsvp };
});

// ==========================================
// 4c. CLIENT MESSAGING (email + notes; logged to events/{eventId}/messages)
// ==========================================
// The chat thread lives at events/{eventId}/messages. Staff (Firebase-authed) read/write
// notes directly via the SDK (real-time onSnapshot); outbound EMAIL goes through
// sendEventMessage (needs the Resend key). There is no in-app client chat — clients are
// reached by email (and WhatsApp later), and inbound replies land in the same thread.

// Staff-side outbound message that goes through an external channel (email now, WhatsApp
// later) AND is logged into the same thread.
// Save a buffer to tenant-scoped Storage and return a token URL. Used to re-host inbound
// attachments (email/WhatsApp) into our bucket; referenced by message bubbles.
async function saveAttachmentToStorage(appId, buffer, filename, contentType) {
  const bucket = admin.storage().bucket();
  const safeAppId = String(appId).replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
  const safeName = (String(filename || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80)) || 'file';
  const path = `attachments/${safeAppId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeName}`;
  const file = bucket.file(path);
  const token = crypto.randomUUID();
  await file.save(buffer, { metadata: { contentType: contentType || 'application/octet-stream', metadata: { firebaseStorageDownloadTokens: token } } });
  return { url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`, name: safeName, type: contentType || '' };
}
// Parse a CC/BCC value (array or comma/semicolon/space-separated string) into clean emails.
function parseEmails(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/);
  return arr.map(s => String(s).trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)).slice(0, 20);
}
// Download a WhatsApp media object (two-step: resolve URL, then fetch bytes with the token).
async function fetchWaMedia(mediaId, accessToken) {
  const meta = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 });
  const url = meta.data && meta.data.url;
  if (!url) return null;
  const bin = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer', timeout: 20000, maxContentLength: 30 * 1024 * 1024 });
  return { buffer: Buffer.from(bin.data), mime: (meta.data && meta.data.mime_type) || '' };
}

exports.sendEventMessage = onCall({ secrets: [resendKey, resendInboundDomain] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { eventId, body, subject, channel, attachments, template, cc, bcc, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const tok = request.auth.token;
  const isStaff = tok.role === 'super_admin' || (['admin', 'staff'].includes(tok.role) && tok.tenantId === appId);
  if (!isStaff) throw new HttpsError('permission-denied', 'Staff only.');

  const db = admin.firestore();
  const text = String(body || '').trim().slice(0, 5000);
  // Attachments are already uploaded to our Storage by the client; we just forward URLs.
  const atts = Array.isArray(attachments) ? attachments.filter(a => a && a.url).slice(0, 10).map(a => ({ url: String(a.url), name: String(a.name || 'file').slice(0, 120), type: String(a.type || '') })) : [];
  const hasTemplate = !!(template && template.name && channel === 'whatsapp');
  if (!text && atts.length === 0 && !hasTemplate) throw new HttpsError('invalid-argument', 'Message is empty.');
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(String(eventId || ''));
  const evSnap = await eventRef.get();
  if (!evSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  const ev = evSnap.data();

  const msg = {
    channel: (channel === 'email' || channel === 'whatsapp') ? channel : 'portal',
    direction: 'out', body: text,
    author: request.auth.uid, authorName: tok.name || tok.email || 'Staff',
    status: 'sent', internal: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(atts.length ? { attachments: atts } : {}),
  };

  if (channel === 'email') {
    const to = String(ev.clientEmail || '').trim();
    if (!to) throw new HttpsError('failed-precondition', 'This client has no email address on file.');
    const key = resendKey.value();
    if (!key || key === 'unset') throw new HttpsError('failed-precondition', 'Email is not configured yet. Set the RESEND_KEY secret.');
    const settings = await getPortalSettings(db, appId);
    // Email config is PER-STORE: use the event's outlet override, else the tenant default.
    const mcfg = (ev.venueId && settings?.venues && settings.venues[ev.venueId] && settings.venues[ev.venueId].messaging) || settings?.messaging || {};
    // Sender display name: an explicit override, then the EVENT's venue profile (venue
    // names live in venueProfiles[venueId], not always the top-level venueProfile), then
    // the default profile, then a safe fallback.
    const vp = (ev.venueId && settings?.venueProfiles && settings.venueProfiles[ev.venueId]) || settings?.venueProfile || {};
    const venueName = mcfg.emailFromName || vp.nameEn || vp.nameZh || settings?.venueProfile?.nameEn || settings?.venueProfile?.nameZh || 'VowsOS';

    // Per-tenant sending identity — the tenant's own from-address if configured (must be a
    // domain they've verified in Resend), otherwise the shared VowsOS sender.
    const fromLine = `${venueName} <${mcfg.emailFrom || 'noreply@vowsos.com'}>`;

    // Reply routing: prefer the tenant's own receiving domain, then the platform default.
    // Replies go to a unique per-event address (<token>@<inboundDomain>) that the inbound
    // webhook maps back to this exact thread. With none configured, fall back to the
    // venue's own email (replies just go to their normal inbox, not into the thread).
    const platformInbound = resendInboundDomain.value();
    const inboundDomain = mcfg.emailInboundDomain || (platformInbound && platformInbound !== 'unset' ? platformInbound : '');
    let replyTo = vp.email || settings?.venueProfile?.email || undefined;
    if (inboundDomain) {
      let token = ev.mailToken;
      if (!token) {
        token = crypto.randomBytes(12).toString('hex'); // 24 lowercase hex chars — case-safe localpart
        await eventRef.update({ mailToken: token }).catch(() => {});
        await db.collection('mail_routes').doc(token).set({ appId, eventId: String(eventId), createdAt: new Date().toISOString() }).catch(() => {});
      }
      // Map the receiving domain -> tenant (idempotent) so inbound with no token can still be routed by sender.
      await db.collection('mail_domains').doc(String(inboundDomain).toLowerCase()).set({ appId }).catch(() => {});
      replyTo = `${venueName} <${token}@${inboundDomain}>`;
    }
    try {
      // Default the subject to the event name so the client's mail app threads the
      // conversation together. Staff can override it from the composer.
      const emailSubject = String(subject || ev.eventName || venueName).slice(0, 200);
      msg.subject = emailSubject;
      const payload = {
        from: fromLine,
        to: [to],
        subject: emailSubject,
        text: text || `📎 ${atts.map(a => a.name).join(', ')}`,
        reply_to: replyTo,
      };
      if (atts.length) payload.attachments = atts.map(a => ({ path: a.url, filename: a.name }));
      const ccList = parseEmails(cc);
      const bccList = parseEmails(bcc);
      // Auto-BCC the tenant's own inbox (a copy of every sent email), if configured.
      if (mcfg.autoBcc && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mcfg.autoBcc)) bccList.push(mcfg.autoBcc);
      if (ccList.length) { payload.cc = ccList; msg.cc = ccList; }
      if (bccList.length) payload.bcc = Array.from(new Set(bccList));
      const resp = await axios.post('https://api.resend.com/emails', payload, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 });
      msg.meta = { to, emailId: (resp.data && resp.data.id) || '' };
    } catch (e) {
      msg.status = 'failed';
      msg.meta = { to, error: String((e.response && e.response.data && e.response.data.message) || e.message || 'send failed').slice(0, 200) };
      await eventRef.collection('messages').add(msg);
      throw new HttpsError('internal', `Email failed: ${msg.meta.error}`);
    }
  }

  if (channel === 'whatsapp') {
    const raw = String(ev.clientPhone || '').replace(/[^0-9]/g, '');
    if (!raw) throw new HttpsError('failed-precondition', 'This client has no phone number on file.');
    const cfg = await getWaConfig(db, appId);
    if (!cfg || !cfg.phoneNumberId || !cfg.accessToken) throw new HttpsError('failed-precondition', 'WhatsApp is not set up for this tenant. Configure it in Settings.');
    const waTo = raw.length === 8 ? '852' + raw : raw; // HK 8-digit -> +852
    const waUrl = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;
    const waHeaders = { headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 };
    try {
      if (hasTemplate) {
        const params = Array.isArray(template.params) ? template.params : [];
        const components = params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p).slice(0, 800) })) }] : [];
        const resp = await axios.post(waUrl, {
          messaging_product: 'whatsapp', to: waTo, type: 'template',
          template: { name: template.name, language: { code: template.language || 'en' }, ...(components.length ? { components } : {}) },
        }, waHeaders);
        msg.meta = { to: waTo, waId: (resp.data && resp.data.messages && resp.data.messages[0] && resp.data.messages[0].id) || '', template: template.name };
      } else if (atts.length) {
        // One media message per attachment; text (if any) becomes the caption on the first.
        for (let i = 0; i < atts.length; i++) {
          const a = atts[i];
          const cap = (i === 0 && text) ? text : undefined;
          const isImg = String(a.type || '').startsWith('image/');
          const payload = isImg
            ? { messaging_product: 'whatsapp', to: waTo, type: 'image', image: { link: a.url, ...(cap ? { caption: cap } : {}) } }
            : { messaging_product: 'whatsapp', to: waTo, type: 'document', document: { link: a.url, filename: a.name, ...(cap ? { caption: cap } : {}) } };
          const resp = await axios.post(waUrl, payload, waHeaders);
          if (i === 0) msg.meta = { to: waTo, waId: (resp.data && resp.data.messages && resp.data.messages[0] && resp.data.messages[0].id) || '' };
        }
      } else {
        const resp = await axios.post(waUrl, { messaging_product: 'whatsapp', to: waTo, type: 'text', text: { body: text } }, waHeaders);
        msg.meta = { to: waTo, waId: (resp.data && resp.data.messages && resp.data.messages[0] && resp.data.messages[0].id) || '' };
      }
    } catch (e) {
      msg.status = 'failed';
      const apiErr = e.response && e.response.data && e.response.data.error;
      msg.meta = { to: waTo, error: String((apiErr && apiErr.message) || e.message || 'send failed').slice(0, 200) };
      await eventRef.collection('messages').add(msg);
      // 24h-window/template errors surface here so staff know why it didn't go.
      throw new HttpsError('internal', `WhatsApp failed: ${msg.meta.error}`);
    }
  }

  const ref = await eventRef.collection('messages').add(msg);
  await eventRef.update({
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageBody: text.slice(0, 140),
    lastMessageDirection: 'out',
  }).catch(() => {});
  return { success: true, id: ref.id, status: msg.status };
});

// --- Inbound-email helpers ---
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function parseFromName(from) {
  const m = String(from || '').match(/^\s*"?([^"<]+?)"?\s*</);
  if (m && m[1].trim()) return m[1].trim();
  return String(from || '').split('@')[0] || 'Client';
}
// Pull the bare, lowercased email out of a "Name <email>" or raw address string.
function extractBareEmail(s) {
  const angle = String(s || '').match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : String(s || '')).trim().toLowerCase();
  const m = candidate.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
  return m ? m[0] : '';
}
// Cut common quoted-reply history + trailing mobile signature so a bubble shows just the
// new message. Handles Apple Mail / Gmail / Outlook attribution lines, which are often
// already prefixed with ">".
function trimQuotedReply(text) {
  const lines = String(text).split('\n');
  const out = [];
  for (const ln of lines) {
    if (/^\s*>*\s*On\b.*\bwrote:\s*$/i.test(ln)) break;           // "On <date> … wrote:"
    if (/^\s*>*\s*-{2,}\s*Original Message\s*-{2,}/i.test(ln)) break;
    if (/^\s*>*\s*(From|發件人|寄件者):\s.+@.+/i.test(ln) && out.length) break; // Outlook header block
    if (/^\s*_{5,}\s*$/.test(ln)) break;
    out.push(ln);
  }
  const result = out.join('\n').replace(/\s*Sent from my [^\n]*\s*$/i, '').trim();
  return result || String(text).trim();
}

// Inbound email webhook (Resend). Verifies the Svix signature, routes the message to the
// right event thread via the reply-to token, fetches the body, and appends an inbound
// bubble. Always answers 200 (except bad signature) so Resend doesn't retry on our bugs.
exports.inboundEmail = onRequest({ secrets: [resendKey, resendWebhookSecret] }, async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const secret = resendWebhookSecret.value();

    if (secret && secret !== 'unset') {
      try {
        new Webhook(secret).verify(raw, {
          'svix-id': req.get('svix-id'),
          'svix-timestamp': req.get('svix-timestamp'),
          'svix-signature': req.get('svix-signature'),
        });
      } catch (e) {
        console.warn('[inboundEmail] signature verify failed:', e.message);
        res.status(401).send('invalid signature');
        return;
      }
    }

    const evt = (req.body && typeof req.body === 'object') ? req.body : JSON.parse(raw || '{}');
    if (!evt || evt.type !== 'email.received') { res.status(200).send('ignored'); return; }
    const data = evt.data || {};
    const db = admin.firestore();
    const key = resendKey.value();
    const asArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
    const recips = [...asArr(data.to), ...asArr(data.cc)].filter(Boolean); // token can be in To or Cc
    const eventsCol = (aid) => db.collection('artifacts').doc(aid).collection('private').doc('data').collection('events');

    // Fetch the real from/subject/body up front — we need the sender for fallback routing.
    let fromAddr = data.from || '';
    let subject = data.subject || '';
    let bodyText = '';
    if (data.email_id && key && key !== 'unset') {
      try {
        const r = await axios.get(`https://api.resend.com/emails/receiving/${data.email_id}`, { headers: { Authorization: `Bearer ${key}` }, timeout: 15000 });
        const full = r.data || {};
        fromAddr = full.from || fromAddr;
        subject = full.subject || subject;
        bodyText = String(full.text || stripHtml(full.html) || '').trim();
      } catch (e) { console.warn('[inboundEmail] fetch body failed:', e.message); }
    }
    bodyText = trimQuotedReply(bodyText || '(empty message)').slice(0, 8000);
    const bareFrom = extractBareEmail(fromAddr);

    // --- Resolve which event this belongs to ---
    let appId = null, eventRef = null;
    // 1) Conversation token in To/Cc — the reliable path (survives a different sender or a
    //    colleague taking over the reply, since routing keys off the token, not the sender).
    for (const addr of recips) {
      const local = String(addr).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!local) continue;
      const snap = await db.collection('mail_routes').doc(local).get();
      if (snap.exists) { appId = snap.data().appId; const er = eventsCol(appId).doc(snap.data().eventId); if ((await er.get()).exists) eventRef = er; break; }
    }
    // 2) Fallback: resolve the tenant from the receiving domain, then match the sender's
    //    email to a client on one of that tenant's events (most-recent wins). Catches a
    //    mangled/stripped reply-to, or a known client emailing the receiving address fresh.
    let tenantAppId = appId;
    if (!eventRef) {
      if (!tenantAppId) {
        for (const addr of recips) {
          const domain = (String(addr).split('@')[1] || '').toLowerCase();
          if (!domain) continue;
          const dsnap = await db.collection('mail_domains').doc(domain).get();
          if (dsnap.exists) { tenantAppId = dsnap.data().appId; break; }
        }
      }
      if (tenantAppId && bareFrom) {
        const q = await eventsCol(tenantAppId).where('clientEmail', '==', bareFrom).get();
        const cands = q.docs.map(d => ({ ref: d.ref, data: d.data() }));
        if (cands.length === 1) {
          appId = tenantAppId; eventRef = cands[0].ref; // unambiguous
        } else if (cands.length > 1) {
          // Same client, multiple events (e.g. a corporate client over several years).
          // Disambiguate: (1) subject names a specific event; else (2) the most recently
          // active conversation; else (3) leave it UNASSIGNED rather than guess wrong.
          const ms = (t) => (t && t.toMillis ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : 0));
          const subjNorm = String(subject).replace(/^\s*(re|fwd|fw|回覆|轉寄)\s*:\s*/i, '').trim().toLowerCase();
          let pick = subjNorm ? cands.find(c => {
            const en = String(c.data.eventName || '').trim().toLowerCase();
            return en.length >= 2 && subjNorm.includes(en);
          }) : null;
          if (!pick) {
            const active = cands.filter(c => ms(c.data.lastMessageAt) > 0).sort((a, b) => ms(b.data.lastMessageAt) - ms(a.data.lastMessageAt));
            if (active.length) pick = active[0]; // continue the live conversation
          }
          if (pick) { appId = tenantAppId; eventRef = pick.ref; }
          // else: no confident pick -> falls through to the unassigned bucket below.
        }
      }
    }

    // Re-host attachments into the resolved tenant's Storage.
    const storeAppId = appId || tenantAppId;
    const attachments = [];
    if (storeAppId && data.email_id && key && key !== 'unset') {
      try {
        const ar = await axios.get(`https://api.resend.com/emails/receiving/${data.email_id}/attachments`, { headers: { Authorization: `Bearer ${key}` }, timeout: 15000 });
        const list = (ar.data && ar.data.data) || [];
        for (const at of list.slice(0, 10)) {
          try {
            const dl = await axios.get(at.download_url, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 25 * 1024 * 1024 });
            attachments.push(await saveAttachmentToStorage(storeAppId, Buffer.from(dl.data), at.filename, at.content_type));
          } catch (e) { console.warn('[inboundEmail] attachment download failed:', e.message); }
        }
      } catch (e) { console.warn('[inboundEmail] attachments list failed:', e.message); }
    }

    // 3) Still unmatched? NEVER silently drop — park it in the tenant's unassigned bucket
    //    for staff review (if we at least know the tenant); otherwise log it.
    if (!eventRef) {
      if (tenantAppId) {
        await db.collection('artifacts').doc(tenantAppId).collection('private').doc('data').collection('unassigned_inbound').add({
          channel: 'email', direction: 'in', body: bodyText, subject,
          fromEmail: bareFrom || fromAddr, authorName: parseFromName(fromAddr),
          toList: recips, status: 'unassigned',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(attachments.length ? { attachments } : {}),
        }).catch((e) => console.warn('[inboundEmail] unassigned store failed:', e.message));
        console.warn('[inboundEmail] UNASSIGNED (parked) from', bareFrom, 'tenant', tenantAppId);
      } else {
        console.warn('[inboundEmail] UNMATCHED, no tenant, from', bareFrom, 'to', recips);
      }
      res.status(200).send('unassigned'); return;
    }

    await eventRef.collection('messages').add({
      channel: 'email', direction: 'in', body: bodyText, subject,
      author: 'client', authorName: parseFromName(fromAddr), fromEmail: bareFrom || fromAddr,
      status: 'received', internal: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(attachments.length ? { attachments } : {}),
    });
    await eventRef.update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageBody: bodyText.slice(0, 140),
      lastMessageDirection: 'in',
      unreadForStaff: admin.firestore.FieldValue.increment(1),
    }).catch(() => {});

    res.status(200).send('ok');
  } catch (e) {
    console.error('[inboundEmail] error:', e);
    res.status(200).send('error-logged');
  }
});

// Staff assign a parked "unassigned" inbound email to a specific event's thread.
exports.assignInboundEmail = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { unassignedId, eventId, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const tok = request.auth.token;
  const isStaff = tok.role === 'super_admin' || (['admin', 'staff'].includes(tok.role) && tok.tenantId === appId);
  if (!isStaff) throw new HttpsError('permission-denied', 'Staff only.');
  const db = admin.firestore();
  const uRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('unassigned_inbound').doc(String(unassignedId || ''));
  const uSnap = await uRef.get();
  if (!uSnap.exists) throw new HttpsError('not-found', 'Message not found (already assigned?).');
  const u = uSnap.data();
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(String(eventId || ''));
  if (!(await eventRef.get()).exists) throw new HttpsError('not-found', 'Event not found.');
  await eventRef.collection('messages').add({
    channel: 'email', direction: 'in', body: u.body || '', subject: u.subject || '',
    author: 'client', authorName: u.authorName || u.fromEmail || 'Client', fromEmail: u.fromEmail || '',
    status: 'received', internal: false,
    createdAt: u.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    ...(Array.isArray(u.attachments) && u.attachments.length ? { attachments: u.attachments } : {}),
  });
  await eventRef.update({
    lastMessageAt: u.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    lastMessageBody: String(u.body || '').slice(0, 140),
    lastMessageDirection: 'in',
    unreadForStaff: admin.firestore.FieldValue.increment(1),
  }).catch(() => {});
  await uRef.delete().catch(() => {});
  return { success: true };
});

// ==========================================
// 4d. WHATSAPP (Meta Cloud API, per-tenant)
// ==========================================
// Per-tenant WhatsApp credentials live in messaging_secrets/{appId} (functions-only in
// rules — never exposed to any client). wa_routes/{phoneNumberId} maps an incoming number
// to its tenant so ONE webhook serves every tenant.
const waSecretRef = (db, appId) => db.collection('messaging_secrets').doc(appId);
async function getWaConfig(db, appId) {
  const snap = await waSecretRef(db, appId).get();
  return (snap.exists && snap.data().whatsapp) ? snap.data().whatsapp : null;
}
function extractWaText(m) {
  if (!m || !m.type) return '';
  if (m.type === 'text') return (m.text && m.text.body) || '';
  if (m.type === 'button') return (m.button && m.button.text) || '';
  if (m.type === 'interactive') {
    const i = m.interactive || {};
    return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
  }
  if (['image', 'document', 'audio', 'video', 'sticker'].includes(m.type)) {
    const cap = m[m.type] && m[m.type].caption;
    return `[${m.type}]${cap ? ' ' + cap : ''}`;
  }
  return `[${m.type}]`;
}

// Staff configure their tenant's WhatsApp Cloud API credentials. Blank fields keep the
// existing value (so staff needn't re-paste the token to change the WABA id, etc.).
exports.setWhatsappConfig = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const { phoneNumberId, accessToken, appSecret, wabaId, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const tok = request.auth.token;
  const isAdmin = tok.role === 'super_admin' || (tok.role === 'admin' && tok.tenantId === appId);
  if (!isAdmin) throw new HttpsError('permission-denied', 'Admins only.');
  const db = admin.firestore();
  const existing = (await getWaConfig(db, appId)) || {};
  const next = { ...existing };
  const pid = String(phoneNumberId || '').replace(/[^0-9]/g, '');
  const at = String(accessToken || '').trim();
  const asec = String(appSecret || '').trim();
  const wid = String(wabaId || '').replace(/[^0-9]/g, '');
  if (pid) next.phoneNumberId = pid;
  if (at) next.accessToken = at;
  if (asec) next.appSecret = asec;
  if (wid) next.wabaId = wid;
  next.updatedAt = new Date().toISOString();
  if (!next.phoneNumberId || !next.accessToken) throw new HttpsError('invalid-argument', 'Phone Number ID and access token are required.');
  if (existing.phoneNumberId && existing.phoneNumberId !== next.phoneNumberId) {
    await db.collection('wa_routes').doc(existing.phoneNumberId).delete().catch(() => {});
  }
  await waSecretRef(db, appId).set({ whatsapp: next }, { merge: true });
  await db.collection('wa_routes').doc(next.phoneNumberId).set({ appId }).catch(() => {});
  return { success: true };
});

// Report whether WhatsApp is configured (never returns the token/secret).
exports.getWhatsappStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const appId = request.data.appId || APP_ID;
  const tok = request.auth.token;
  const isAdmin = tok.role === 'super_admin' || (tok.role === 'admin' && tok.tenantId === appId);
  if (!isAdmin) throw new HttpsError('permission-denied', 'Admins only.');
  const cfg = await getWaConfig(admin.firestore(), appId);
  return {
    configured: !!(cfg && cfg.phoneNumberId && cfg.accessToken),
    phoneNumberId: (cfg && cfg.phoneNumberId) || '',
    wabaId: (cfg && cfg.wabaId) || '',
    hasAppSecret: !!(cfg && cfg.appSecret),
  };
});

// List the tenant's APPROVED WhatsApp templates (name, language, body text + variable
// count) so staff can pick one to start a conversation outside the 24h window.
exports.getWhatsappTemplates = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const appId = request.data.appId || APP_ID;
  const tok = request.auth.token;
  const isAdmin = tok.role === 'super_admin' || (tok.role === 'admin' && tok.tenantId === appId);
  if (!isAdmin) throw new HttpsError('permission-denied', 'Admins only.');
  const cfg = await getWaConfig(admin.firestore(), appId);
  if (!cfg || !cfg.wabaId || !cfg.accessToken) throw new HttpsError('failed-precondition', 'Set the WhatsApp Business Account ID (WABA ID) first.');
  try {
    const r = await axios.get(`https://graph.facebook.com/v21.0/${cfg.wabaId}/message_templates`, {
      params: { limit: 100, fields: 'name,status,language,category,components' },
      headers: { Authorization: `Bearer ${cfg.accessToken}` }, timeout: 15000,
    });
    const list = (r.data && r.data.data) || [];
    const templates = list.filter(t => t.status === 'APPROVED').map(t => {
      const bodyComp = (t.components || []).find(c => c.type === 'BODY');
      const bodyText = (bodyComp && bodyComp.text) || '';
      const varCount = (bodyText.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
      return { name: t.name, language: t.language, category: t.category, bodyText, varCount };
    });
    return { templates };
  } catch (e) {
    throw new HttpsError('internal', String((e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message || 'Failed to load templates').slice(0, 200));
  }
});

// Inbound WhatsApp webhook (Meta). GET = verification handshake (platform verify token).
// POST = incoming messages; routes to the tenant by phone_number_id, verifies Meta's
// signature with that tenant's app secret, and appends inbound bubbles.
exports.whatsappWebhook = onRequest({ secrets: [whatsappVerifyToken] }, async (req, res) => {
  if (req.method === 'GET') {
    const vt = whatsappVerifyToken.value();
    if (req.query['hub.mode'] === 'subscribe' && vt && vt !== 'unset' && req.query['hub.verify_token'] === vt) {
      res.status(200).send(req.query['hub.challenge']); return;
    }
    res.status(403).send('forbidden');
    return;
  }
  if (req.method !== 'POST') { res.status(405).send('method'); return; }
  try {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const body = (req.body && typeof req.body === 'object') ? req.body : JSON.parse(raw || '{}');
    const db = admin.firestore();
    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value || {};
        const phoneNumberId = value.metadata && value.metadata.phone_number_id;
        const messagesArr = Array.isArray(value.messages) ? value.messages : [];
        if (!phoneNumberId || messagesArr.length === 0) continue; // ignore delivery-status callbacks

        const routeSnap = await db.collection('wa_routes').doc(String(phoneNumberId)).get();
        if (!routeSnap.exists) { console.warn('[wa] no route for', phoneNumberId); continue; }
        const appId = routeSnap.data().appId;
        const cfg = await getWaConfig(db, appId);

        // Verify Meta's signature with the tenant's app secret before trusting the payload.
        if (cfg && cfg.appSecret) {
          const sig = String(req.get('x-hub-signature-256') || '').replace('sha256=', '');
          const expected = crypto.createHmac('sha256', cfg.appSecret).update(raw).digest('hex');
          if (!safeEqualHex(sig, expected)) { console.warn('[wa] bad signature for', appId); continue; }
        }

        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const nameByWa = {};
        for (const c of contacts) nameByWa[c.wa_id] = (c.profile && c.profile.name) || '';

        for (const m of messagesArr) {
          const from = String(m.from || '').replace(/[^0-9]/g, '');
          let bodyText = extractWaText(m);
          // Re-host media (image/document/video/audio/sticker) into our Storage.
          const attachments = [];
          const mediaObj = m[m.type];
          if (mediaObj && mediaObj.id && cfg && cfg.accessToken && ['image', 'document', 'video', 'audio', 'sticker'].includes(m.type)) {
            try {
              const md = await fetchWaMedia(mediaObj.id, cfg.accessToken);
              if (md) attachments.push(await saveAttachmentToStorage(appId, md.buffer, mediaObj.filename || `${m.type}_${mediaObj.id}`, md.mime || mediaObj.mime_type));
            } catch (e) { console.warn('[wa] media fetch failed:', e.message); }
            bodyText = String(mediaObj.caption || '').trim();
          }
          if (!from || (!bodyText && attachments.length === 0)) continue;
          const phone8 = from.slice(-8);
          const evSnap = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').where('clientPhoneClean', '==', phone8).get();
          if (evSnap.empty) { console.warn('[wa] no event for', phone8, appId); continue; }
          const docs = evSnap.docs.map(d => ({ ref: d.ref, data: d.data() }));
          docs.sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
          const eventRef = docs[0].ref;
          const summary = bodyText || (attachments[0] ? `📎 ${attachments[0].name}` : '');
          await eventRef.collection('messages').add({
            channel: 'whatsapp', direction: 'in', body: bodyText.slice(0, 8000),
            author: 'client', authorName: nameByWa[m.from] || from, fromPhone: from,
            status: 'received', internal: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(attachments.length ? { attachments } : {}),
          });
          await eventRef.update({
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageBody: summary.slice(0, 140),
            lastMessageDirection: 'in',
            unreadForStaff: admin.firestore.FieldValue.increment(1),
          }).catch(() => {});
        }
      }
    }
    res.status(200).send('ok');
  } catch (e) {
    console.error('[wa] error:', e);
    res.status(200).send('error-logged');
  }
});

exports.updateClientDietaryReq = onCall({ secrets: [adminPhone], invoker: "public" }, async (request) => {
  const { eventId, phone, specialMenuReq, allergies, sessionToken, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const rk = rlKey('client', appId, eventId);
  await assertNotRateLimited(db, rk);
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
  const docSnap = await eventRef.get();
  if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  if (String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) { await recordFailedAttempt(db, rk); throw new HttpsError('permission-denied', 'Invalid phone.'); }
  await assertClientSessionIfSet(db, appId, phone, sessionToken, rk);
  await eventRef.update({ specialMenuReq: specialMenuReq || '', allergies: allergies || '' });
  return { success: true };
});

// ==========================================
// 5. USER MANAGEMENT (RBAC)
// ==========================================

// Generate a short, human-shareable one-time password (no ambiguous 0/O/1/l chars).
function generateTempPassword() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

// --- Identity helpers for the provision / self-activate flow ---
// Staff log in with an email OR a phone. Phone logins have no OTP; they are backed by a
// synthetic internal email so Firebase email/password auth can be reused.
function normalizeIdentifier(identifier, type) {
  if (type === 'phone') return String(identifier || '').replace(/[^0-9]/g, '');
  return String(identifier || '').trim().toLowerCase();
}

// The Firebase Auth email used for login. Phone -> synthetic internal address.
function authEmailFor(normalized, type, appId) {
  if (type === 'phone') {
    const safeTenant = String(appId || 'tenant').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'tenant';
    return `phone_${normalized}@${safeTenant}.phone.vowsos.internal`;
  }
  return normalized; // real email
}

// Stable doc id for a whitelisted (pending) identifier.
function pendingKey(normalized, type) {
  return `${type}_${normalized}`;
}

exports.inviteUser = onCall({
  memory: "256MiB"
}, async (request) => {
  const { email, displayName, role, accessibleVenues, appId: requestAppId } = request.data;
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');

  const isSuperAdmin = requester.token.role === 'super_admin';
  // Tenant admins may only invite into their OWN tenant; super_admins may target any.
  // (During migration, admins without a tenantId claim yet fall back to the request body.)
  const appId = isSuperAdmin ? (requestAppId || APP_ID) : (requester.token.tenantId || requestAppId || APP_ID);
  const db = admin.firestore();

  if (!isSuperAdmin) {
    const requesterDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).get();
    if (requesterDoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can invite.');
  }

  // Never allow granting super_admin via invite; restrict to a known role set (fixes H7).
  const INVITABLE_ROLES = ['staff', 'admin'];
  const safeRole = INVITABLE_ROLES.includes(role) ? role : 'staff';
  if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }

  try {
    let userRecord;
    let isNew = false;
    let tempPassword = null;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      // Brand-new account: provision with a shareable one-time password.
      tempPassword = generateTempPassword();
      userRecord = await admin.auth().createUser({ email, displayName, password: tempPassword });
      isNew = true;
    }

    // Stamp tenant + role claims so the invited user is immediately tenant-scoped.
    const existing = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(userRecord.uid, { ...existing, role: safeRole, tenantId: appId });

    await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid, email, displayName: displayName || email, role: safeRole,
      accessibleVenues: accessibleVenues || [], isInvited: true,
      // New accounts must set their own password on first login.
      ...(isNew ? { mustChangePassword: true } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true, isNew, tempPassword };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('inviteUser error:', error);
    throw new HttpsError('internal', 'Failed to invite user.');
  }
});

// Clear the first-login password flag for the calling user, after they set a new password.
exports.completePasswordSetup = onCall({ memory: "256MiB" }, async (request) => {
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');
  const appId = requester.token.tenantId || request.data?.appId || APP_ID;
  const db = admin.firestore();
  await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).set({
    mustChangePassword: admin.firestore.FieldValue.delete(),
    passwordSetAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { success: true };
});

// PROVISION a user: a tenant admin (or super_admin) whitelists an email/phone + role.
// No login is created yet — the person self-activates later. Enforces the tenant's
// maxUsers license (active users + pending records). Unset maxUsers = ungated (grace).
exports.provisionUser = onCall({ memory: "256MiB" }, async (request) => {
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');
  const { identifier, type, role, displayName, accessibleVenues, firstUser, appId: requestAppId } = request.data;

  const isSuperAdmin = requester.token.role === 'super_admin';
  const appId = isSuperAdmin ? (requestAppId || APP_ID) : (requester.token.tenantId || requestAppId || APP_ID);
  const db = admin.firestore();

  if (!isSuperAdmin) {
    const rdoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).get();
    if (rdoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can add users.');
  }

  const kind = type === 'phone' ? 'phone' : 'email';
  const safeRole = ['staff', 'admin'].includes(role) ? role : 'staff';
  const normalized = normalizeIdentifier(identifier, kind);
  if (kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new HttpsError('invalid-argument', 'A valid email is required.');
  if (kind === 'phone' && normalized.length < 6) throw new HttpsError('invalid-argument', 'A valid phone number is required.');

  const base = db.collection('artifacts').doc(appId).collection('private').doc('data');
  const key = pendingKey(normalized, kind);

  // Enforce the user license (active + pending), unless the tenant has no maxUsers set.
  const tenantSnap = await db.collection('tenants').doc(appId).get();
  const maxUsers = (tenantSnap.exists && typeof tenantSnap.data().maxUsers === 'number') ? tenantSnap.data().maxUsers : null;
  if (maxUsers !== null) {
    const [usersSnap, pendingSnap] = await Promise.all([
      base.collection('users').get(),
      base.collection('pending_users').get()
    ]);
    const activeCount = usersSnap.docs.filter(d => (d.data().role || 'staff') !== 'deleted').length;
    const alreadyPending = pendingSnap.docs.some(d => d.id === key);
    if (!alreadyPending && (activeCount + pendingSnap.size) >= maxUsers) {
      throw new HttpsError('resource-exhausted', `已達授權用戶數量上限 (${maxUsers})。請聯絡平台管理員升級。`);
    }
  }

  await base.collection('pending_users').doc(key).set({
    identifier: normalized, type: kind, role: safeRole,
    displayName: displayName || '', accessibleVenues: accessibleVenues || [],
    requiresEmailVerification: !!firstUser && kind === 'email',
    status: 'pending', createdBy: requester.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true, identifier: normalized, type: kind };
});

// ACTIVATE a whitelisted account (public — the person has no login yet). They supply their
// whitelisted email/phone and set their own password. No email/phone verification for staff;
// first-user (owner) accounts are flagged so the client can require email verification.
exports.activateUser = onCall({ invoker: "public", memory: "256MiB" }, async (request) => {
  const { tenantId, identifier, type, password } = request.data;
  const appId = tenantId || APP_ID;
  const kind = type === 'phone' ? 'phone' : 'email';
  const db = admin.firestore();

  if (!password || String(password).length < 8) throw new HttpsError('invalid-argument', '密碼至少需 8 位字元。');
  const normalized = normalizeIdentifier(identifier, kind);
  const base = db.collection('artifacts').doc(appId).collection('private').doc('data');
  const key = pendingKey(normalized, kind);

  const pendingRef = base.collection('pending_users').doc(key);
  const pendingSnap = await pendingRef.get();
  if (!pendingSnap.exists) throw new HttpsError('not-found', '找不到此帳戶的設定，請聯絡您的場地管理員。');
  const pending = pendingSnap.data();

  const authEmail = authEmailFor(normalized, kind, appId);

  // Already claimed?
  try {
    await admin.auth().getUserByEmail(authEmail);
    await pendingRef.delete().catch(() => {});
    throw new HttpsError('already-exists', '此帳戶已啟用，請直接登入。');
  } catch (e) {
    if (e instanceof HttpsError) throw e; // already-exists
    // otherwise user-not-found -> good, continue
  }

  const userRecord = await admin.auth().createUser({ email: authEmail, password: String(password) });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: pending.role || 'staff', tenantId: appId });

  await base.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: kind === 'email' ? normalized : null,
    phone: kind === 'phone' ? normalized : null,
    loginType: kind,
    displayName: pending.displayName || normalized,
    role: pending.role || 'staff',
    accessibleVenues: pending.accessibleVenues || [],
    // Owner accounts must verify their email before full access (gated client-side).
    requiresEmailVerification: !!pending.requiresEmailVerification,
    activatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await pendingRef.delete().catch(() => {});

  // authEmail lets the client sign in (needed for phone -> synthetic email).
  return { success: true, authEmail, type: kind, requiresEmailVerification: !!pending.requiresEmailVerification };
});

// Remove a pending (not-yet-activated) whitelisted user. Tenant admin / super_admin only.
exports.revokeProvisionedUser = onCall({ memory: "256MiB" }, async (request) => {
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');
  const { key, appId: requestAppId } = request.data;
  if (!key) throw new HttpsError('invalid-argument', 'Missing key.');
  const isSuperAdmin = requester.token.role === 'super_admin';
  const appId = isSuperAdmin ? (requestAppId || APP_ID) : (requester.token.tenantId || requestAppId || APP_ID);
  const db = admin.firestore();
  if (!isSuperAdmin) {
    const rdoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).get();
    if (rdoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can manage users.');
  }
  await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('pending_users').doc(key).delete();
  return { success: true };
});

exports.updateUserRoleSecure = onCall({
  memory: "256MiB"
}, async (request) => {
  const { uid, newRole, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');
  if (!uid || !newRole) throw new HttpsError('invalid-argument', 'uid and newRole are required.');

  const ALLOWED_ROLES = ['staff', 'admin', 'super_admin'];
  if (!ALLOWED_ROLES.includes(newRole)) throw new HttpsError('invalid-argument', 'Invalid role.');

  const isSuperAdmin = requester.token.role === 'super_admin';

  // Only a platform super_admin may grant the super_admin role.
  if (newRole === 'super_admin' && !isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Only a super admin can grant super admin.');
  }

  // Non-super-admins must be a verified admin OF THIS tenant. Looking up the requester's
  // own user doc under {appId} binds them to that tenant (an admin of tenant A passing
  // tenant B's appId has no doc there -> denied). The old bootstrap fall-through, which
  // let any user self-claim when no admin existed yet, has been removed. The first
  // super_admin must be seeded out-of-band (Firebase console / admin script).
  if (!isSuperAdmin) {
    const requesterDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).get();
    if (requesterDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can manage roles.');
    }
  }

  try {
    // Preserve any existing claims, update role, and (re)bind the user to this tenant.
    const existing = (await admin.auth().getUser(uid)).customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, role: newRole, tenantId: existing.tenantId || appId });
    await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(uid).set({
      role: newRole, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('updateUserRoleSecure error:', error);
    throw new HttpsError('internal', 'Failed to update role.');
  }
});

// One-time (idempotent) migration: stamp every existing user with a `tenantId` custom
// claim equal to the tenant/appId their user doc lives under. Run this AFTER deploying,
// BEFORE tightening the Firestore rules to the hard-cutover version. Super-admin only.
exports.backfillTenantClaims = onCall({ memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
  if (!request.auth || request.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admins can run migrations.');
  }
  const db = admin.firestore();
  const tenantsSnap = await db.collection('tenants').get();
  const appIds = tenantsSnap.docs.map(d => d.id);
  if (!appIds.includes(APP_ID)) appIds.push(APP_ID);

  let updated = 0, skipped = 0;
  const perTenant = [];
  for (const appId of appIds) {
    const usersSnap = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').get();
    for (const userDoc of usersSnap.docs) {
      try {
        const authUser = await admin.auth().getUser(userDoc.id);
        const existing = authUser.customClaims || {};
        const role = existing.role || userDoc.data().role || 'staff';
        // First-write-wins on tenantId so a user already bound isn't reassigned.
        await admin.auth().setCustomUserClaims(userDoc.id, { ...existing, role, tenantId: existing.tenantId || appId });
        updated++;
      } catch (e) {
        skipped++;
      }
    }
    perTenant.push({ appId, users: usersSnap.size });
  }
  return { success: true, updated, skipped, tenants: perTenant };
});

// ==========================================
// 6. AI & EXTERNAL SERVICES
// ==========================================
exports.callAiAssistant = onRequest({ 
  secrets: [deepseekKey], 
  invoker: "public",
  timeoutSeconds: 120,
  memory: "256MiB"
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.set('Access-Control-Allow-Methods', 'POST'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.status(204).send(''); return; }

  // --- AUTH: require a valid Firebase ID token (was a public proxy to the paid DeepSeek key) ---
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.match(/^Bearer (.+)$/);
  if (!bearer) return res.status(401).json({ error: { message: 'Unauthorized' } });
  try { await admin.auth().verifyIdToken(bearer[1]); }
  catch (e) { return res.status(401).json({ error: { message: 'Invalid token' } }); }

  // The client sends { data: { messages: [...] } }; accept that (or a bare { prompt }).
  const body = req.body?.data || req.body || {};
  const messages = (Array.isArray(body.messages) && body.messages.length)
    ? body.messages
    : (body.prompt ? [{ role: 'user', content: String(body.prompt) }] : null);
  if (!messages) return res.status(400).json({ error: { message: 'Missing messages' } });
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', { model: "deepseek-chat", messages }, { headers: { 'Authorization': `Bearer ${deepseekKey.value()}`, 'Content-Type': 'application/json' } });
    // Wrap in { data } so the client reads resultData.data.choices[...] consistently.
    res.status(200).json({ data: response.data });
  } catch (error) { res.status(500).json({ error: { message: error.message } }); }
});
