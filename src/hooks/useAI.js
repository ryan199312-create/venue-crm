import { useState } from 'react';
import { auth } from '../core/firebase';
import { getTenantId } from '../core/tenantResolver';

// callAiAssistant (Cloud Functions v2, asia-east2) — a DeepSeek proxy that requires a Firebase ID token.
const AI_ENDPOINT = 'https://callaiassistant-tebfenc7da-df.a.run.app';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /**
   * Ask the AI. Resolves to the reply text, or null on failure (the reason is in `error`).
   * Pass { throwOnError: true } to reject instead, so the caller can show the actual reason.
   */
  const generate = async (userPrompt, systemPrompt = "You are a helpful assistant.", { throwOnError = false } = {}) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const appId = getTenantId();
      console.log(`[useAI] Calling AI for tenant: ${appId}`);

      // Send the caller's Firebase ID token — the endpoint requires auth.
      const idToken = await auth.currentUser?.getIdToken();
      let response;
      try {
        response = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify({
            data: { // Wrapped in data to keep compatibility with existing backend structure
              appId,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ]
            }
          }),
        });
      } catch (netErr) {
        // Cloud Run rejects the request before any CORS headers are added when, e.g., the
        // project's billing is disabled or the function is down — the browser then only
        // reports a generic "Failed to fetch".
        console.error("AI Hook network error:", netErr);
        throw new Error('無法連接 AI 服務 (Cannot reach the AI service — check the project billing / function deployment)');
      }

      if (!response.ok) {
        // The function answers JSON ({ error: { message } }), but a 401/403/5xx from the
        // platform itself is plain text — read whichever we got.
        const bodyText = await response.text().catch(() => '');
        let message = `HTTP Error ${response.status}`;
        try {
          message = JSON.parse(bodyText)?.error?.message || message;
        } catch {
          if (bodyText) message = `${message}: ${bodyText.slice(0, 200)}`;
        }
        throw new Error(message);
      }

      const resultData = await response.json();
      const aiText = resultData?.data?.choices?.[0]?.message?.content;
      if (!aiText) throw new Error('AI 回應為空 (Empty AI response)');
      setResult(aiText);
      return aiText;

    } catch (err) {
      console.error("AI Hook Error:", err);
      if (err.details) {
        console.error("AI Hook Error Details:", err.details);
      }
      setError(err.message || "Something went wrong");
      if (throwOnError) throw err;
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, result, loading, error };
};
