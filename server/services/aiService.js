import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const SYSTEM_INSTRUCTION = "You are EzTalk AI, a concise, high-speed tutor & companion in EzTalk Messenger. Keep answers direct, fast, and helpful. Use clean Markdown. Match user language (Russian, Uzbek, English).";

/**
 * Sends a message to EzTalk AI and retrieves the response.
 * @param {string} userMessage - The current message from the user.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Up to 6 previous messages.
 * @returns {Promise<string>} The AI's response text.
 */
export async function askEzTalkAI(userMessage, conversationHistory = []) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return "⚠️ **API Key Missing!**\n\nTo talk to me, you need to add your Gemini API Key.\n\n1. Get it here: [Google AI Studio](https://aistudio.google.com/app/apikey)\n2. Add `GEMINI_API_KEY=\"your_key\"` to your `.env` file.\n3. Restart the server (`npm run dev`).";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const aiPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 10000);
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    let text = response.text || "I'm sorry, I couldn't process that.";
    
    // Post-processing to forcefully strip LaTeX math delimiters
    text = text.replace(/\$\$/g, ''); // Remove block math delimiters
    text = text.replace(/\$([^$\n]+)\$/g, '$1'); // Remove inline math delimiters (paired $ on the same line)

    return text;
  } catch (error) {
    if (error.message === 'AI_TIMEOUT') {
      return "Извините, ответ занял слишком много времени. Попробуйте отправить вопрос еще раз!";
    }
    console.error('[EzTalk AI] Error generating content:', error);
    return "Oops, something went wrong on my end. Please try again!";
  }
}
