import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 🆕 Fonction : essaie Gemini puis bascule sur OpenRouter si échec
async function generateWithFallback(prompt) {
  // 1. Essayer Gemini d'abord
  try {
    console.log(`🤖 Tentative Gemini 3.8-flash...`);
    const interaction = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });
    console.log(`✅ Gemini a réussi`);
    return interaction.text;
  } catch (error) {
    const code = error?.code || error?.status;
    console.warn(`⚠️ Gemini a échoué (${code}), bascule sur OpenRouter...`);
  }

  // 2. Fallback OpenRouter
  try {
    console.log(`🌐 Tentative OpenRouter (Llama 3.3)...`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.choices?.[0]?.message?.content) {
      throw new Error(data?.error?.message || "OpenRouter a échoué");
    }

    console.log(`✅ OpenRouter a réussi`);
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`❌ OpenRouter a échoué:`, error?.message);
    throw new Error("Gemini ET OpenRouter ont échoué");
  }
}

export async function generateDesign(order) {
  const metaPrompt = `
Tu es un directeur artistique professionnel.
À partir de la demande client ci-dessous, génère UN SEUL prompt en anglais, très détaillé, pour créer une image de logo professionnel.

Demande client : "${order.description}"
Service : ${order.serviceTitle}
Formule : ${order.packageName}

Réponds UNIQUEMENT avec le prompt en anglais, sans introduction, sans guillemets, sans explication.
`.trim();

  const imagePromptRaw = await generateWithFallback(metaPrompt);
  const imagePrompt = imagePromptRaw.trim().replace(/^["']|["']$/g, "");

  console.log(`🎨 Prompt image : ${imagePrompt.substring(0, 100)}...`);

  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    imagePrompt
  )}?width=1024&height=1024&nologo=true&seed=${seed}`;

  const uploaded = await cloudinary.uploader.upload(pollinationsUrl, {
    folder: `prestations/${order.orderNumber}`,
    public_id: `logo-${Date.now()}`,
    resource_type: "image",
  });

  console.log(`📤 Image uploadée : ${uploaded.secure_url}`);

  return {
    deliveryUrl: uploaded.secure_url,
    content: `Logo généré automatiquement à partir de : "${order.description}"`,
  };
}
