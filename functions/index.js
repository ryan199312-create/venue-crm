const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2"); // Import this
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");

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