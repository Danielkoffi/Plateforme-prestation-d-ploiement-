import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const interaction = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
  });

  let html = interaction.text.trim();
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
