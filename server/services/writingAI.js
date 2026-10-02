import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateWriting(order) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const result = await model.generateContent(prompt);
  const content = result.response.text();

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
