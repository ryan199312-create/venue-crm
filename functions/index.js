const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2"); // Import this
const admin = require("firebase-admin");
const axios = require("axios");

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

    const { to, messageContent } = request.data;
    const API_KEY = sleekflowKey.value();

    try {
      const response = await axios.post("https://api.sleekflow.io/api/message/send/json", {
        channel: "whatsappcloudapi",
        from: "85252226066",
        to: to,            
        messageType: "text",
        messageContent: messageContent,
        analyticTags: ["CRM_Auto", "Event_EO"]
      }, {
        headers: { 
          "Content-Type": "application/json",
          "X-Sleekflow-Api-Key": API_KEY 
        }
      });

      return response.data;
    } catch (error) {
      console.error("SleekFlow Error:", error.response?.data || error.message);
      throw new HttpsError("internal", "Messaging Service Failed");
    }
});

// 4. PING TEST
exports.ping = onCall({}, (request) => {
    return { message: "Pong from Hong Kong! (asia-east2)" };
});