import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateWithFallback(prompt) {
  // 1. Essayer Gemini
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

export async function generateWebsite(order) {
  const prompt = `
Tu es un développeur web professionnel.
Génère un SITE WEB COMPLET en HTML + CSS + JavaScript dans UN SEUL fichier HTML.

Service : ${order.serviceTitle}
Formule : ${order.packageName}
Client : ${order.customerName}

Brief client :
"""
${order.description}
"""

Contraintes techniques :
- HTML5 valide, responsive mobile-first
- CSS moderne (variables, flexbox, grid)
- JavaScript vanilla (pas de framework)
- Polices Google Fonts
- Design moderne et professionnel
- Sections : Hero, À propos, Services, Contact, Footer
- Inclure animations CSS douces
- Code propre et commenté

Réponds UNIQUEMENT avec le code HTML complet, sans explication autour.
Commence directement par <!DOCTYPE html>
`.trim();

  let html = await generateWithFallback(prompt);
  html = html.trim();
  html = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "");

  const buffer = Buffer.from(html, "utf-8");
  const uploaded = await cloudinary.uploader.upload(
    `data:text/html;base64,${buffer.toString("base64")}`,
    {
      folder: `prestations/${order.orderNumber}`,
      public_id: `site-${Date.now()}`,
      resource_type: "raw",
      format: "html",
    }
  );

  return {
    deliveryUrl: uploaded.secure_url,
    content: `Site web généré (${html.length} caractères)`,
  };
}
