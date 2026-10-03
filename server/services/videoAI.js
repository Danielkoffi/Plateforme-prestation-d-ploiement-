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

export async function generateVideoScript(order) {
  const prompt = `
Tu es un réalisateur professionnel de vidéos publicitaires.
Génère un SCRIPT VIDÉO COMPLET + STORYBOARD pour le projet suivant.

Service : ${order.serviceTitle}
Formule : ${order.packageName}
Client : ${order.customerName}

Brief client :
"""
${order.description}
"""

Structure attendue :

# 🎬 SCRIPT VIDÉO

## Durée estimée
## Public cible
## Objectif

## Scène 1 (0-5s)
- Visuel :
- Voix off :
- Texte à l'écran :
- Musique/Son :

## Scène 2 (5-15s)
...

## Scène 3 (15-30s)
...

## Conclusion / Call to action

## 🎨 STORYBOARD
(pour chaque scène : description visuelle détaillée)

## 💡 Conseils de tournage
- Lieux recommandés
- Matériel minimum
- Éclairage
- Ambiance

Rédige en français, sois précis et créatif.
`.trim();

  const content = await generateWithFallback(prompt);

  const buffer = Buffer.from(content, "utf-8");
  const uploaded = await cloudinary.uploader.upload(
    `data:text/plain;base64,${buffer.toString("base64")}`,
    {
      folder: `prestations/${order.orderNumber}`,
      public_id: `script-video-${Date.now()}`,
      resource_type: "raw",
      format: "txt",
    }
  );

  return {
    deliveryUrl: uploaded.secure_url,
    content,
  };
}
