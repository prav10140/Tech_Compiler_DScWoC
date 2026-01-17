// src/components/ChatBot/chatApi.js
import Groq from "groq-sdk";

// Initialize Groq with your API key
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // required to call from frontend
});

// Set your model
const MODEL_NAME = "llama-3.3-70b-versatile";

// Function to send messages to Groq
export async function askCodeMate(messages) {
  try {
    const chat = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
      temperature: 0.3, // Adjust creativity
    });

    // Return the assistant's reply
    return chat.choices[0].message.content;
  } catch (err) {
    console.error("Groq API Error:", err);
    throw new Error("Error connecting to Groq API.");
  }
}
