import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // Adjust path if needed

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
      const callDeepSeek = httpsCallable(functions, 'callDeepSeek');
      
      const response = await callDeepSeek({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "text" }
      });

      const aiText = response.data.choices[0].message.content;
      setResult(aiText);
      return aiText; // Return it so you can use it immediately if needed

    } catch (err) {
      console.error("AI Hook Error:", err);
      setError(err.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, result, loading, error };
};