const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2"); // Import this
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { getFunctions } = require("firebase-admin/functions");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const crypto = require("crypto");

admin.initializeApp();

// Global cache for Puppeteer to dramatically speed up PDF generation
let cachedBrowser = null;

// 1. SET GLOBAL REGION TO HONG KONG
setGlobalOptions({ region: "asia-east2" });

// Define Secrets
const sleekflowKey = defineSecret("SLEEKFLOW_KEY");
const adminPhone = defineSecret("ADMIN_PHONE");

// 3. SECURE SLEEKFLOW FUNCTION
exports.sendSleekFlow = onCall(
  { secrets: [sleekflowKey] },
  async (request) => {
    
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { to, messageContent, pdfUrl, fileName, isTemplate } = request.data;
    const API_KEY = sleekflowKey.value();

    try {
      if (pdfUrl) {
        // 🌟 Fetch the PDF from URL into a buffer
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(pdfResponse.data);
        
        const form = new FormData();
        
        form.append("channel", "whatsappcloudapi");
        form.append("to", to);
        form.append("type", "document"); 
        form.append("caption", messageContent || ""); 
        
        // 附加檔案，必須指定檔名與類型
        form.append("file", fileBuffer, {
          filename: fileName || "Document.pdf",
          contentType: "application/pdf"
        });

        await axios.post("https://api.sleekflow.io/api/message/send/file", form, {
          headers: { 
            ...form.getHeaders(),
            "X-Sleekflow-Api-Key": API_KEY 
          }
        });

      } else {
        // 🌟 沒有 PDF 的情況：發送純文字或模板
        const payload = isTemplate ? {
          type: "template",
          template: { name: "document_sending_template", language: "zh_HK" },
          receiver: to,
          channel: "whatsappcloudapi",
          from: "85252226066"
        } : {
          type: "text",
          messageType: "text",
          messageContent: messageContent,
          to: to,
          channel: "whatsappcloudapi",
          from: "85252226066"
        };

        await axios.post("https://api.sleekflow.io/api/message/send/json", payload, {
          headers: { 
            "Content-Type": "application/json",
            "X-Sleekflow-Api-Key": API_KEY 
          }
        });
      }

      return { success: true };
    } catch (error) {
      const exactError = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error("SleekFlow API Error:", exactError);
      throw new HttpsError("internal", `SleekFlow 拒絕請求: ${exactError}`);
    }
});

// 4. PING TEST
exports.ping = onCall({}, (request) => {
    return { message: "Pong from Hong Kong! (asia-east2)" };
});

// 5a. ENQUEUE PDF JOB (Stores HTML safely, avoids 100KB Task Queue limit)
exports.enqueuePdfJob = onCall(
  async (request) => {
    const { html, fileName, docType } = request.data;
    if (!html) throw new HttpsError("invalid-argument", "HTML string is required.");

    const db = admin.firestore();
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const jobRef = db.collection('artifacts').doc('my-venue-crm').collection('private').doc('data').collection('pdf_jobs').doc(jobId);

    // Store the massive HTML string in Firestore
    await jobRef.set({
      status: 'pending', html, fileName, docType, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Enqueue the background task
    const queue = getFunctions().taskQueue("generatePdfTask", "asia-east2");
    await queue.enqueue({ jobId }, { dispatchDeadlineSeconds: 60 * 5 }); // 5 minute timeout

    return { jobId };
  }
);

// 5b. ASYNC TASK GENERATOR (Does the heavy lifting in the background)
exports.generatePdfTask = onTaskDispatched(
  { memory: "2GiB", timeoutSeconds: 120 },
  async (request) => {
    const { jobId } = request.data;
    const db = admin.firestore();
    const jobRef = db.collection('artifacts').doc('my-venue-crm').collection('private').doc('data').collection('pdf_jobs').doc(jobId);

    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return;
    const { html, fileName } = jobSnap.data();
    
    await jobRef.update({ status: 'processing' });

    let page = null;
    try {
      // 1. Reuse browser instance to avoid 3-5 second Chromium cold start
      if (!cachedBrowser || !cachedBrowser.isConnected()) {
        cachedBrowser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      }

      try {
        page = await cachedBrowser.newPage();
      } catch (e) {
        // Fallback: If the cached browser crashed while the container was frozen, relaunch it
        cachedBrowser = await puppeteer.launch({
          args: chromium.args, defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(), headless: chromium.headless, ignoreHTTPSErrors: true,
        });
        page = await cachedBrowser.newPage();
      }
      
      // 1. Force high DPI (4x) for crisp vector/raster rendering (fixes "low resolution" look)
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 4 });

      // 2. Wait for 'networkidle0'
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
      
      // 🌟 CRITICAL FIX: Force Puppeteer to wait until custom fonts (Noto Sans TC) are fully loaded
      await page.evaluateHandle('document.fonts.ready');

      // 3. Add a small buffer to let the browser paint complex floorplan transforms
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Force Puppeteer to respect CSS page sizes and pagination
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      
      // 5. ONLY close the page, keep the browser alive for the next request
      await page.close();

      // Save to Firebase Storage instead of returning Base64 payload
      const bucket = admin.storage().bucket();
      const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_') : "document.pdf";
      const uniquePath = `generated_pdfs/${Date.now()}_${safeFileName}`;
      const file = bucket.file(uniquePath);
      const token = crypto.randomUUID();

      await file.save(pdfBuffer, {
        metadata: { 
          contentType: 'application/pdf',
          contentDisposition: `attachment; filename="${safeFileName}"`,
          metadata: { firebaseStorageDownloadTokens: token }
        }
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniquePath)}?alt=media&token=${token}`;

      // Update job as completed and delete the heavy HTML string to save database space
      await jobRef.update({
        status: 'completed', url: publicUrl, html: admin.firestore.FieldValue.delete()
      });

    } catch (error) {
      if (page) await page.close().catch(() => {});
      console.error("PDF Generation failed:", error);
      await jobRef.update({ status: 'error', error: error.message });
      throw error; // Throwing triggers Cloud Tasks to automatically retry
    }
});

// 6. CLIENT PORTAL SECURE UPLOAD
exports.uploadClientPaymentProof = onCall({ memory: "512MiB" }, async (request) => {
  const { eventId, phone, fileName, fileBase64 } = request.data;

  if (!eventId || !phone || !fileBase64) {
    throw new HttpsError('invalid-argument', 'Missing required fields.');
  }

  const appId = "my-venue-crm"; 
  const db = admin.firestore();
  // Use default bucket
  const bucket = admin.storage().bucket();
  
  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = String(phone).replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = String(eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

    if (cleanInputPhone !== cleanDbPhone) {
      throw new HttpsError('permission-denied', 'Invalid phone number.');
    }

    // Upload to Storage securely with a generated token
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const uniqueFileName = `receipts/client_${eventId}_${Date.now()}_${fileName}`;
    const file = bucket.file(uniqueFileName);
    const token = crypto.randomUUID();
    
    await file.save(fileBuffer, {
      metadata: { 
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(uniqueFileName)}?alt=media&token=${token}`;

    // Save URL to the Event Document
    await eventRef.update({
      clientUploadedProofs: admin.firestore.FieldValue.arrayUnion({
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        fileName: fileName
      })
    });

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload Proof Error:", error);
    if (error instanceof HttpsError) throw error;
    const validCodes = ['ok', 'cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded', 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated'];
    const code = validCodes.includes(error?.code) ? error.code : 'aborted';
    throw new HttpsError(code, error.message || 'Unknown upload error occurred');
  }
});

// ==========================================
// 9. AUTOMATIC CLEANUP OF OLD PDFS
// ==========================================
exports.cleanupOldPdfs = onSchedule("every day 00:00", async (event) => {
  const bucket = admin.storage().bucket();
  
  try {
    const [files] = await bucket.getFiles({ prefix: 'generated_pdfs/' });
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const deletePromises = files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      const timeCreated = new Date(metadata.timeCreated).getTime();
      
      if (now - timeCreated > THIRTY_DAYS_MS) {
        await file.delete();
        deletedCount++;
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Successfully deleted ${deletedCount} old PDF(s) from Storage.`);
  } catch (error) {
    console.error("Error cleaning up old PDFs:", error);
  }
});

// ==========================================
// 10. SIGN CLIENT CONTRACT
// ==========================================
exports.signClientContract = onCall({ invoker: "public" }, async (request) => {
  try {
    if (!request || !request.data) throw new HttpsError('invalid-argument', 'Request data is missing.');
    const { eventId, phone, signatureBase64, docType } = request.data;

    if (!eventId || !phone || !signatureBase64) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    const appId = "my-venue-crm";
    const db = admin.firestore();

    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = String(phone).replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = String(eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

    if (cleanInputPhone !== cleanDbPhone) {
      throw new HttpsError('permission-denied', 'Invalid phone number.');
    }

    // Update the database with the signature PNG
    const updateData = {};
    if (docType) {
      updateData[`signatures.${docType}.client`] = signatureBase64;
      updateData[`signatures.${docType}.clientDate`] = new Date().toISOString();
    } else {
      // Fallback for legacy
      updateData.clientSignature = signatureBase64;
      updateData.clientSignatureDate = new Date().toISOString();
    }

    await eventRef.update(updateData);

    return { success: true };
  } catch (error) {
    console.error("Sign Contract Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Sign Contract Error: ${error.message}`);
  }
});

// 7. VERIFY CLIENT ACCESS (PORTAL LOGIN)
exports.verifyClientAccess = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone } = request.data;

  if (!phone) {
    throw new HttpsError('invalid-argument', 'Missing phone number.');
  }

  const appId = "my-venue-crm"; 
  const db = admin.firestore();
  
  try {
    const cleanInputPhone = String(phone).replace(/[^0-9]/g, '').slice(-8);
    let matchedEvents = [];
    const eventsRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events');

    // 1. Fetch relevant event(s)
    if (eventId) {
      // Direct Link Access
      const eventDoc = await eventsRef.doc(eventId).get();
      if (eventDoc.exists) {
        const data = eventDoc.data();
        const cleanDbPhone = String(data.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);
        if (cleanDbPhone === cleanInputPhone) {
          matchedEvents.push({ id: eventDoc.id, ...data });
        }
      }
    } else {
      // General Login Access (Indexed Query)
      const cleanSnap = await eventsRef.where('clientPhoneClean', '==', cleanInputPhone).get();
      cleanSnap.forEach(doc => {
        matchedEvents.push({ id: doc.id, ...doc.data() });
      });
      
      // Fallback for legacy records that don't have clientPhoneClean yet
      const legacySnap = await eventsRef.where('clientPhone', '==', phone).get();
      legacySnap.forEach(doc => {
        if (!matchedEvents.some(e => e.id === doc.id)) {
          matchedEvents.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    if (matchedEvents.length === 0) {
      throw new HttpsError('not-found', '找不到符合的手機號碼或活動紀錄 (No events found for this phone number).');
    }

    // 2. Sanitize all matches
    const sanitizedEvents = matchedEvents.map(eventData => {
      const total = parseFloat(eventData.totalAmount) || 0;
      
      let actualPaid = 0;
      if (eventData.deposit1Received) actualPaid += (parseFloat(eventData.deposit1) || 0);
      if (eventData.deposit2Received) actualPaid += (parseFloat(eventData.deposit2) || 0);
      if (eventData.deposit3Received) actualPaid += (parseFloat(eventData.deposit3) || 0);
      
      const expectedFinalBalance = Math.max(0, total - ((parseFloat(eventData.deposit1) || 0) + (parseFloat(eventData.deposit2) || 0) + (parseFloat(eventData.deposit3) || 0)));
      if (eventData.balanceReceived) actualPaid += expectedFinalBalance;

      const balanceDue = Math.max(0, total - actualPaid);

      return {
        ...eventData,
        id: eventData.id,
        totalAmount: total,
        balanceDue: balanceDue
      };
    });

    // 3. Sort newest first
    sanitizedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Fetch appSettings securely inside the backend
    let appSettings = null;
    try {
      const settingsDoc = await db.collection('artifacts').doc(appId).collection('private').doc('data').collection('settings').doc('config').get();
      if (settingsDoc.exists) {
        appSettings = settingsDoc.data();
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }

    // Safely serialize data to prevent "INTERNAL" crashes caused by Firestore Timestamps
    const safeEvents = JSON.parse(JSON.stringify(sanitizedEvents));
    const safeSettings = appSettings ? JSON.parse(JSON.stringify(appSettings)) : null;

    return { events: safeEvents, appSettings: safeSettings };
  } catch (error) {
    console.error("Client Portal Auth Error:", error);
    if (error instanceof HttpsError) throw error;
    const validCodes = ['ok', 'cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded', 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated'];
    const code = validCodes.includes(error?.code) ? error.code : 'internal';
    throw new HttpsError(code, error.message || 'Unknown auth error occurred');
  }
});

// 9. UPDATE CLIENT RUNDOWN
exports.updateClientRundown = onCall({ invoker: "public" }, async (request) => {
  const { eventId, phone, rundown } = request.data;

  if (!eventId || !phone || !rundown) {
    throw new HttpsError('invalid-argument', 'Missing fields.');
  }

  const db = admin.firestore();
  
  try {
    const eventRef = db.collection('artifacts').doc("my-venue-crm").collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();
    if (!docSnap.exists) throw new HttpsError('not-found', 'Event not found.');
    
    const eventData = docSnap.data();
    if (String(eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8) !== String(phone).replace(/[^0-9]/g, '').slice(-8)) {
      throw new HttpsError('permission-denied', 'Invalid phone number.');
    }

    await eventRef.update({ rundown });
    return { success: true };
  } catch (error) {
    console.error("Update Rundown Error:", error);
    throw new HttpsError('internal', error.message || 'Unknown update error occurred');
  }
});

// 8. UPDATE CLIENT DIETARY REQUIREMENTS
// Add { secrets: [sleekflowKey] } to allow this function to access your SleekFlow API Key
exports.updateClientDietaryReq = onCall({ secrets: [sleekflowKey, adminPhone], invoker: "public" }, async (request) => {
  const { eventId, phone, specialMenuReq, allergies } = request.data;

  if (!eventId || !phone) {
    throw new HttpsError('invalid-argument', 'Missing eventId or phone number.');
  }

  const appId = "my-venue-crm";
  const db = admin.firestore();
  
  const adminNotificationPhone = adminPhone.value(); 

  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = String(phone).replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = String(eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

    if (cleanInputPhone !== cleanDbPhone) {
      throw new HttpsError('permission-denied', 'Invalid phone number.');
    }

    // Update dietary fields securely
    await eventRef.update({ specialMenuReq: specialMenuReq || '', allergies: allergies || '' });
    
    // --- AUTOMATED WHATSAPP NOTIFICATION ---
    try {
      const notificationText = `⚠️ *客戶已更新餐飲要求 (Dietary Update)*\n\n*活動 (Event):* ${eventData.eventName}\n*編號 (Order ID):* ${eventData.orderId || eventId}\n\n*特殊要求 (Special Reqs):*\n${specialMenuReq || '無 (None)'}\n\n*食物過敏 (Allergies):*\n${allergies || '無 (None)'}`;
      
      await axios.post("https://api.sleekflow.io/api/message/send/json", {
        type: "text",
        messageType: "text",
        messageContent: notificationText,
        to: adminNotificationPhone,
        channel: "whatsappcloudapi",
        from: "85252226066" // Your King Lung Heen SleekFlow Sender Number
      }, {
        headers: { 
          "Content-Type": "application/json",
          "X-Sleekflow-Api-Key": sleekflowKey.value() 
        }
      });
    } catch (sfError) {
      console.error("Failed to send SleekFlow notification:", sfError.message);
    }

    return { success: true };
  } catch (error) {
    console.error("Update Dietary Req Error:", error);
    if (error instanceof HttpsError) throw error;
    const validCodes = ['ok', 'cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded', 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated'];
    const code = validCodes.includes(error?.code) ? error.code : 'aborted';
    throw new HttpsError(code, error.message || 'Unknown dietary update error occurred');
  }
});