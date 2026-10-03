import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateWithFallback(prompt) {
  const modeles = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
  ];

  let lastError = null;

  for (const modele of modeles) {
    try {
      console.log(`🤖 Tentative avec ${modele}...`);
      const interaction = await ai.models.generateContent({
        model: modele,
        contents: prompt,
      });
      console.log(`✅ Succès avec ${modele}`);
      return interaction.text;
    } catch (error) {
      const code = error?.code || error?.status;
      console.warn(`⚠️ ${modele} a échoué (${code})`);
      lastError = error;
    }
  }

  throw lastError || new Error("Tous les modèles ont échoué");
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
