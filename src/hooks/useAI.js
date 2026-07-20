import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../core/firebase';
import { getTenantId } from '../core/tenantResolver';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // This is the function you will call from your UI
  const generate = async (userPrompt, systemPrompt = "You are a helpful assistant.") => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const appId = getTenantId();
      console.log(`[useAI] Calling AI for tenant: ${appId}`);

      // Send the caller's Firebase ID token — the endpoint now requires auth.
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('https://callaiassistant-tebfenc7da-df.a.run.app', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
      }

      const resultData = await response.json();
      const aiText = resultData.data.choices[0].message.content;
      setResult(aiText);
      return aiText; 

    } catch (err) {
      console.error("AI Hook Error:", err);
      if (err.details) {
        console.error("AI Hook Error Details:", err.details);
      }
      setError(err.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, result, loading, error };
};