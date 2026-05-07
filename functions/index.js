const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { getFunctions } = require("firebase-admin/functions");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const crypto = require("crypto");

// 1. INITIALIZE ADMIN SDK
admin.initializeApp();

// 2. SET GLOBAL REGION
setGlobalOptions({ 
  region: "asia-east2"
});

// Define Secrets
const sleekflowKey = defineSecret("SLEEKFLOW_KEY");
const adminPhone = defineSecret("ADMIN_PHONE");
const deepseekKey = defineSecret("DEEPSEEK_KEY");

const APP_ID = "my-venue-crm"; 

// Global cache for Puppeteer
let cachedBrowser = null;

// ==========================================
// 1. DATA MIGRATION (SUPER ADMIN ONLY)
// ==========================================
exports.migrateTenantData = onCall({ 
  memory: "1GiB", 
  timeoutSeconds: 300,
  cors: true 
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
  timeoutSeconds: 300,
  cors: true 
}, async (request) => {
  if (!request.auth || request.auth.token.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admins can delete tenants.');
  }

  const { tenantId } = request.data;
  if (!tenantId) throw new HttpsError('invalid-argument', 'Tenant ID is required.');

  const db = admin.firestore();

  try {
    console.log(`[DeleteTenant] Starting deletion for: ${tenantId}`);
    
    // 1. Delete the global tenant record
    await db.collection('tenants').doc(tenantId).delete();
    console.log(`[DeleteTenant] Global record deleted`);

    // 2. Recursively delete artifacts
    const artifactRef = db.collection('artifacts').doc(tenantId);
    await db.recursiveDelete(artifactRef);
    console.log(`[DeleteTenant] Artifacts recursively deleted`);

    return { success: true };
  } catch (error) {
    console.error(`[DeleteTenant] FATAL ERROR:`, error);
    throw new HttpsError('internal', error.message || 'Unknown deletion error');
  }
});

// ==========================================
// 2. SLEEKFLOW & PING
// ==========================================
exports.sendSleekFlow = onCall({ secrets: [sleekflowKey], cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
    const { to, messageContent, pdfUrl, fileName, isTemplate, appId: requestAppId } = request.data;
    const API_KEY = sleekflowKey.value();
    try {
      if (pdfUrl) {
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const form = new FormData();
        form.append("channel", "whatsappcloudapi");
        form.append("to", to);
        form.append("type", "document"); 
        form.append("caption", messageContent || ""); 
        form.append("file", Buffer.from(pdfResponse.data), { filename: fileName || "Document.pdf", contentType: "application/pdf" });
        await axios.post("https://api.sleekflow.io/api/message/send/file", form, { headers: { ...form.getHeaders(), "X-Sleekflow-Api-Key": API_KEY } });
      } else {
        const payload = isTemplate ? { type: "template", template: { name: "document_sending_template", language: "zh_HK" }, receiver: to, channel: "whatsappcloudapi", from: "85252226066" } : { type: "text", messageType: "text", messageContent, to, channel: "whatsappcloudapi", from: "85252226066" };
        await axios.post("https://api.sleekflow.io/api/message/send/json", payload, { headers: { "Content-Type": "application/json", "X-Sleekflow-Api-Key": API_KEY } });
      }
      return { success: true };
    } catch (error) { throw new HttpsError("internal", error.message); }
});

exports.ping = onCall({ cors: true }, () => ({ message: "Pong!" }));

// ==========================================
// 3. PDF GENERATION SYSTEM
// ==========================================
exports.enqueuePdfJob = onCall({ cors: true }, async (request) => {
    const { html, fileName, docType, jobId, appId: requestAppId } = request.data;
    const db = admin.firestore();
    const appId = requestAppId || APP_ID; 
    await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('pdf_jobs').doc(jobId).set({ status: 'pending', html, fileName, docType, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const queue = getFunctions().taskQueue("generatePdfTask", "asia-east2");
    await queue.enqueue({ jobId, appId }, { dispatchDeadlineSeconds: 60 * 5 });
    return { jobId };
});

exports.generatePdfTask = onTaskDispatched({ memory: "2GiB", timeoutSeconds: 120 }, async (request) => {
    const { jobId, appId: taskAppId } = request.data;
    const db = admin.firestore();
    const appId = taskAppId || APP_ID;
    const jobRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('pdf_jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return;
    const { html, fileName } = jobSnap.data();
    await jobRef.update({ status: 'processing' });
    let page = null;
    try {
      if (!cachedBrowser || !cachedBrowser.isConnected()) { cachedBrowser = await puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: await chromium.executablePath(), headless: chromium.headless, ignoreHTTPSErrors: true }); }
      page = await cachedBrowser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 4 });
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
      await page.evaluateHandle('document.fonts.ready');
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      await page.close();
      const bucket = admin.storage().bucket();
      const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_') : "document.pdf";
      const uniquePath = `generated_pdfs/${Date.now()}_${safeFileName}`;
      const file = bucket.file(uniquePath);
      const token = crypto.randomUUID();
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: token } } });
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniquePath)}?alt=media&token=${token}`;
      await jobRef.update({ status: 'completed', url: publicUrl, html: admin.firestore.FieldValue.delete() });
    } catch (error) { if (page) await page.close().catch(() => {}); await jobRef.update({ status: 'error', error: error.message }); throw error; }
});

// ==========================================
// 4. CLIENT PORTAL OPERATIONS (CRITICAL)
// ==========================================

exports.verifyClientAccess = onCall({ invoker: "public", cors: true }, async (request) => {
  const { eventId, phone, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID; 
  const db = admin.firestore();
  try {
    const cleanInputPhone = String(phone).replace(/[^0-9]/g, '').slice(-8);
    let matchedEvents = [];
    const eventsRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events');
    if (eventId) {
      const eventDoc = await eventsRef.doc(eventId).get();
      if (eventDoc.exists) { const data = eventDoc.data(); if (String(data.clientPhone || '').replace(/[^0-9]/g, '').slice(-8) === cleanInputPhone) matchedEvents.push({ id: eventDoc.id, ...data }); }
    } else {
      const cleanSnap = await eventsRef.where('clientPhoneClean', '==', cleanInputPhone).get();
      cleanSnap.forEach(doc => matchedEvents.push({ id: doc.id, ...doc.data() }));
    }
    if (matchedEvents.length === 0) throw new HttpsError('not-found', 'No events found.');
    const sanitizedEvents = matchedEvents.map(e => ({ ...e, totalAmount: parseFloat(e.totalAmount) || 0 }));
    sanitizedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    const settingsDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('settings').doc('config').get();
    return { events: JSON.parse(JSON.stringify(sanitizedEvents)), appSettings: settingsDoc.exists ? JSON.parse(JSON.stringify(settingsDoc.data())) : null };
  } catch (error) { throw new HttpsError('internal', error.message); }
});

exports.uploadClientPaymentProof = onCall({ memory: "512MiB", cors: true }, async (request) => {
  const { eventId, phone, fileName, fileBase64, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID; 
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    if (String(phone).replace(/[^0-9]/g, '').slice(-8) !== String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8)) throw new HttpsError('permission-denied', 'Invalid phone.');
    const uniqueFileName = `receipts/client_${eventId}_${Date.now()}_${fileName}`;
    const file = bucket.file(uniqueFileName);
    const token = crypto.randomUUID();
    await file.save(Buffer.from(fileBase64, 'base64'), { metadata: { contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } } });
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniqueFileName)}?alt=media&token=${token}`;
    await eventRef.update({ clientUploadedProofs: admin.firestore.FieldValue.arrayUnion({ url: publicUrl, uploadedAt: new Date().toISOString(), fileName }) });
    return { success: true, url: publicUrl };
  } catch (error) { throw new HttpsError('internal', error.message); }
});

exports.signClientContract = onCall({ invoker: "public", cors: true }, async (request) => {
    const { eventId, phone, signatureBase64, docType, appId: requestAppId } = request.data;
    const appId = requestAppId || APP_ID;
    const db = admin.firestore();
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    if (String(phone).replace(/[^0-9]/g, '').slice(-8) !== String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8)) throw new HttpsError('permission-denied', 'Invalid phone.');
    const updateData = {};
    if (docType) { updateData[`signatures.${docType}.client`] = signatureBase64; updateData[`signatures.${docType}.clientDate`] = new Date().toISOString(); }
    else { updateData.clientSignature = signatureBase64; updateData.clientSignatureDate = new Date().toISOString(); }
    await eventRef.update(updateData);
    return { success: true };
});

exports.updateClientRundown = onCall({ invoker: "public", cors: true }, async (request) => {
  const { eventId, phone, rundown, appId: requestAppId } = request.data;
  const db = admin.firestore();
  const appId = requestAppId || APP_ID;
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
  const docSnap = await eventRef.get();
  if (String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) throw new HttpsError('permission-denied', 'Invalid phone.');
  await eventRef.update({ rundown });
  return { success: true };
});

exports.updateClientDietaryReq = onCall({ secrets: [sleekflowKey, adminPhone], invoker: "public", cors: true }, async (request) => {
  const { eventId, phone, specialMenuReq, allergies, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
  const docSnap = await eventRef.get();
  if (String(docSnap.data().clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) throw new HttpsError('permission-denied', 'Invalid phone.');
  await eventRef.update({ specialMenuReq: specialMenuReq || '', allergies: allergies || '' });
  return { success: true };
});

// ==========================================
// 5. USER MANAGEMENT (RBAC)
// ==========================================
exports.inviteUser = onCall({ cors: true }, async (request) => {
  const { email, displayName, role, accessibleVenues, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();
  if (!request.auth || (request.auth.token.role !== 'super_admin' && (await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(request.auth.uid).get()).data()?.role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Only admins can invite.');
  }
  try {
    let userRecord;
    try { userRecord = await admin.auth().getUserByEmail(email); } 
    catch (e) { userRecord = await admin.auth().createUser({ email, displayName, password: crypto.randomBytes(16).toString('hex') }); }
    await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid, email, displayName: displayName || email, role, accessibleVenues: accessibleVenues || [], isInvited: true, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) { throw new HttpsError('internal', error.message); }
});

exports.updateUserRoleSecure = onCall({ cors: true }, async (request) => {
  const { uid, newRole, appId: requestAppId } = request.data;
  const appId = requestAppId || APP_ID;
  const db = admin.firestore();

  // 🌟 Senior Security: Only allow promotion if:
  // 1. Requester is Super Admin
  // 2. Requester is already an Admin in this tenant
  // 3. The tenant has NO admins (Bootstrap case)
  const requester = request.auth;
  if (!requester) throw new HttpsError('unauthenticated', 'Login required.');

  const isSuperAdmin = requester.token.role === 'super_admin';

  if (!isSuperAdmin) {
    // Check if requester is admin
    const requesterDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(requester.uid).get();
    const requesterRole = requesterDoc.data()?.role;
    const isTenantAdmin = requesterRole === 'admin';

    if (!isTenantAdmin) {
       // Check for bootstrap case: are there ANY admins?
       const adminsSnap = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users')
         .where('role', 'in', ['admin', 'super_admin']).limit(1).get();

       if (!adminsSnap.empty) {
         throw new HttpsError('permission-denied', 'Only admins can manage roles.');
       }
       // If snap is empty, we allow the promotion (Bootstrap)
    }
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role: newRole });
    await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('users').doc(uid).set({ 
      role: newRole, updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });
    return { success: true };
  } catch (error) { throw new HttpsError('internal', error.message); }
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
  // 🌟 Bulletproof Manual CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { messages, response_format } = req.body.data || req.body; 
  const API_KEY = deepseekKey.value();
  
  console.log(`[callAiAssistant] Calling DeepSeek API... (Key configured: ${!!API_KEY})`);
  
  if (!API_KEY) {
    console.error("[callAiAssistant] ERROR: DeepSeek API Key is missing.");
    return res.status(400).json({ error: { message: "DeepSeek API Key is not configured." } });
  }

  try {
    const response = await axios.post("https://api.deepseek.com/chat/completions", {
      model: "deepseek-chat",
      messages: messages,
      response_format: response_format || { type: "text" },
      temperature: 0.7
    }, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 110000
    });

    return res.json({ data: response.data });
  } catch (error) {
    console.error("DeepSeek API Error:", error.response?.data || error.message);
    return res.status(500).json({ 
      error: { 
        message: error.response?.data?.error?.message || error.message,
        details: error.response?.data 
      } 
    });
  }
});

// Cleanup
exports.cleanupOldPdfs = onSchedule("every day 00:00", async (event) => {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'generated_pdfs/' });
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  await Promise.all(files.map(async (file) => {
    const [metadata] = await file.getMetadata();
    if (Date.now() - new Date(metadata.timeCreated).getTime() > THIRTY_DAYS_MS) await file.delete();
  }));
});
