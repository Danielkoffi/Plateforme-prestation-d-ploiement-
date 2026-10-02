import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDesign(order) {
  const metaPrompt = `
Tu es un directeur artistique professionnel.
À partir de la demande client ci-dessous, génère UN SEUL prompt en anglais, très détaillé, pour créer une image de logo professionnel.

Demande client : "${order.description}"
Service : ${order.serviceTitle}
Formule : ${order.packageName}

Réponds UNIQUEMENT avec le prompt en anglais, sans introduction, sans guillemets, sans explication.
Le prompt doit décrire : style, couleurs, formes, ambiance, type de logo.
`.trim();

  const interaction = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: metaPrompt,
  });

  const imagePrompt = interaction.text.trim().replace(/^["']|["']$/g, "");

  console.log(`🎨 Prompt image généré : ${imagePrompt.substring(0, 100)}...`);

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
