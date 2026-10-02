import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Config Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateDesign(order) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  // 1. Gemini génère un prompt d'image optimisé
  const metaPrompt = `
Tu es un directeur artistique professionnel.
À partir de la demande client ci-dessous, génère UN SEUL prompt en anglais, très détaillé, pour créer une image de logo professionnel.

Demande client : "${order.description}"
Service : ${order.serviceTitle}
Formule : ${order.packageName}

Réponds UNIQUEMENT avec le prompt en anglais, sans introduction, sans guillemets, sans explication.
Le prompt doit décrire : style, couleurs, formes, ambiance, type de logo.
Exemple : "minimalist modern logo for a restaurant, warm colors, fork and knife icon, clean vector style, flat design, centered, white background, high quality"
`.trim();

  const result = await model.generateContent(metaPrompt);
  const imagePrompt = result.response.text().trim().replace(/^["']|["']$/g, "");

  console.log(`🎨 Prompt image généré : ${imagePrompt.substring(0, 100)}...`);

  // 2. Générer l'image via Pollinations (gratuit, sans clé)
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    imagePrompt
  )}?width=1024&height=1024&nologo=true&seed=${seed}`;

  // 3. Upload vers Cloudinary
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
