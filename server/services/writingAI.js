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
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
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

export async function generateWriting(order) {
  const prompt = `
Tu es un rédacteur professionnel francophone.
Génère un contenu de haute qualité pour la demande suivante.

Service : ${order.serviceTitle}
Formule : ${order.packageName}
Client : ${order.customerName}

Demande du client :
"""
${order.description}
"""

Instructions :
- Rédige en français impeccable
- Structure claire (titres, paragraphes)
- Adapté au type de prestation
- Longueur cohérente avec la formule "${order.packageName}"
- Retourne le texte final uniquement, sans explication autour
`.trim();

  const content = await generateWithFallback(prompt);

  const buffer = Buffer.from(content, "utf-8");
  const uploaded = await cloudinary.uploader.upload(
    `data:text/plain;base64,${buffer.toString("base64")}`,
    {
      folder: `prestations/${order.orderNumber}`,
      public_id: `contenu-${Date.now()}`,
      resource_type: "raw",
      format: "txt",
    }
  );

  return {
    deliveryUrl: uploaded.secure_url,
    content,
  };
}
