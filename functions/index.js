const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2"); // Import this
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const crypto = require("crypto");

admin.initializeApp();

// 1. SET GLOBAL REGION TO HONG KONG
setGlobalOptions({ region: "asia-east2" });

// Define Secrets
const deepseekKey = defineSecret("DEEPSEEK_KEY");
const sleekflowKey = defineSecret("SLEEKFLOW_KEY");

// 2. SECURE DEEPSEEK FUNCTION
exports.callDeepSeek = onCall(
  { secrets: [deepseekKey] }, 
  async (request) => {
    
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { messages, response_format } = request.data;
    const API_KEY = deepseekKey.value();

    try {
      const response = await axios.post("https://api.deepseek.com/chat/completions", {
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        response_format: response_format
      }, {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}` 
        }
      });

      return response.data;
    } catch (error) {
      console.error("DeepSeek Error:", error.response?.data || error.message);
      throw new HttpsError("internal", "AI Service Failed: " + (error.response?.data?.error?.message || error.message));
    }
});

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

// 5. SECURE PDF GENERATOR
exports.generatePdfBackend = onCall(
  { memory: "2GiB", timeoutSeconds: 120 },
  async (request) => {
    const { html, fileName } = request.data;

    if (!html) {
      throw new HttpsError("invalid-argument", "HTML string is required.");
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      
      // 1. Force high DPI (4x) for crisp vector/raster rendering (fixes "low resolution" look)
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 4 });

      // 2. Wait for 'networkidle0' so Tailwind CDN and external images finish loading completely
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
      
      // 3. Add a small buffer to let the browser paint complex floorplan transforms
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Force Puppeteer to respect CSS page sizes and pagination
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      await browser.close();

      // Save to Firebase Storage instead of returning Base64 payload
      const bucket = admin.storage().bucket("event-management-system-9f764.firebasestorage.app");
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

      return { url: publicUrl, fileName: safeFileName };
    } catch (error) {
      if (browser) await browser.close();
      console.error("PDF Generation failed:", error);
      throw new HttpsError("internal", "Failed to generate PDF: " + error.message);
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
  // Explicitly set the bucket to prevent "No default bucket found" errors
  const bucket = admin.storage().bucket("event-management-system-9f764.firebasestorage.app");
  
  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = phone.replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = (eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

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
    if (error instanceof HttpsError) {
      throw error; // Allow our validation errors to pass through to the frontend
    }
    throw new HttpsError('internal', 'Internal Server Error');
  }
});

// ==========================================
// 9. AUTOMATIC CLEANUP OF OLD PDFS
// ==========================================
exports.cleanupOldPdfs = onSchedule("every day 00:00", async (event) => {
  const bucket = admin.storage().bucket("event-management-system-9f764.firebasestorage.app");
  
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
exports.signClientContract = onCall(async (request) => {
  const { eventId, phone, signatureBase64, docType } = request.data;

  if (!eventId || !phone || !signatureBase64) {
    throw new HttpsError('invalid-argument', 'Missing required fields.');
  }

  const appId = "my-venue-crm";
  const db = admin.firestore();
  
  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = phone.replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = (eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

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
    throw new HttpsError('internal', 'Internal Server Error');
  }
});

// 7. VERIFY CLIENT ACCESS (PORTAL LOGIN)
exports.verifyClientAccess = onCall(async (request) => {
  const { eventId, phone } = request.data;

  if (!phone) {
    throw new HttpsError('invalid-argument', 'Missing phone number.');
  }

  const appId = "my-venue-crm"; 
  const db = admin.firestore();
  
  try {
    const cleanInputPhone = phone.replace(/[^0-9]/g, '').slice(-8);
    let matchedEvents = [];
    const eventsRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events');

    // 1. Fetch relevant event(s)
    if (eventId) {
      // Direct Link Access
      const eventDoc = await eventsRef.doc(eventId).get();
      if (eventDoc.exists) {
        const data = eventDoc.data();
        const cleanDbPhone = (data.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);
        if (cleanDbPhone === cleanInputPhone) {
          matchedEvents.push({ id: eventDoc.id, ...data });
        }
      }
    } else {
      // General Login Access (Memory filter for phone matches)
      const snapshot = await eventsRef.get();
      snapshot.forEach(doc => {
        const data = doc.data();
        const cleanDbPhone = (data.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);
        if (cleanDbPhone === cleanInputPhone) {
          matchedEvents.push({ id: doc.id, ...data });
        }
      });
    }

    if (matchedEvents.length === 0) {
      throw new HttpsError('not-found', 'No events found for this phone number.');
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

    return { events: sanitizedEvents };

  } catch (error) {
    console.error("Client Portal Auth Error:", error);
    if (error instanceof HttpsError) {
      throw error; // Allow our validation errors to pass through to the frontend
    }
    throw new HttpsError('internal', 'Internal Server Error');
  }
});

// 8. UPDATE CLIENT DIETARY REQUIREMENTS
// Add { secrets: [sleekflowKey] } to allow this function to access your SleekFlow API Key
exports.updateClientDietaryReq = onCall({ secrets: [sleekflowKey] }, async (request) => {
  const { eventId, phone, specialMenuReq, allergies } = request.data;

  if (!eventId || !phone) {
    throw new HttpsError('invalid-argument', 'Missing eventId or phone number.');
  }

  const appId = "my-venue-crm";
  const db = admin.firestore();
  
  // IMPORTANT: Replace this with the actual WhatsApp number of your Sales Rep or Admin Team
  const adminNotificationPhone = "85212345678"; 

  try {
    const eventRef = db.collection('artifacts').doc(appId).collection('private').doc('data').collection('events').doc(eventId);
    const docSnap = await eventRef.get();

    if (!docSnap.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }

    const eventData = docSnap.data();
    const cleanInputPhone = phone.replace(/[^0-9]/g, '').slice(-8);
    const cleanDbPhone = (eventData.clientPhone || '').replace(/[^0-9]/g, '').slice(-8);

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
    throw new HttpsError('internal', 'Internal Server Error');
  }
});