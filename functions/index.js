const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2"); // Import this
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

    // 接收從前端傳來的 base64 檔案資料
    const { to, messageContent, pdfBase64, fileName, isTemplate } = request.data;
    const API_KEY = sleekflowKey.value();

    try {
      if (pdfBase64) {
        // 🌟 有 PDF 的情況：使用 send/file API (Local File)
        const fileBuffer = Buffer.from(pdfBase64, 'base64');
        const form = new FormData();
        
        form.append("channel", "whatsappcloudapi");
        form.append("to", to);
        form.append("type", "document"); // 檔案類型為 document
        form.append("caption", messageContent || ""); // 將 AI 文字放入檔案備註
        
        // 附加檔案，必須指定檔名與類型
        form.append("file", fileBuffer, {
          filename: fileName || "Document.pdf",
          contentType: "application/pdf"
        });

        await axios.post("https://api.sleekflow.io/api/message/send/file", form, {
          headers: { 
            ...form.getHeaders(), // FormData 專屬 Headers
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
  { memory: "1GiB", timeoutSeconds: 120 },
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
      await page.setContent(html, { waitUntil: "networkidle2", timeout: 60000 });

      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      return { pdfBase64: pdfBuffer.toString("base64"), fileName: fileName || "document.pdf" };
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
        id: eventData.id,
        eventName: eventData.eventName,
        date: eventData.date,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        venueLocation: eventData.venueLocation,
        guestCount: eventData.guestCount,
        tableCount: eventData.tableCount,
        totalAmount: total,
        balanceDue: balanceDue,
        deposit1: eventData.deposit1 || '',
        deposit1Date: eventData.deposit1Date || '',
        deposit1Received: eventData.deposit1Received || false,
        deposit2: eventData.deposit2 || '',
        deposit2Date: eventData.deposit2Date || '',
        deposit2Received: eventData.deposit2Received || false,
        deposit3: eventData.deposit3 || '',
        deposit3Date: eventData.deposit3Date || '',
        deposit3Received: eventData.deposit3Received || false,
        balanceReceived: eventData.balanceReceived || false,
        status: eventData.status,
        rundown: eventData.rundown || [],
        menus: eventData.menus || [],
        specialMenuReq: eventData.specialMenuReq || '',
        allergies: eventData.allergies || '',
        floorplan: eventData.floorplan || null,
        clientUploadedProofs: eventData.clientUploadedProofs || []
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