import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { generateDesign } from "./designAI.js";
import { generateWriting } from "./writingAI.js";
import { generateVideoScript } from "./videoAI.js";
import { generateWebsite } from "./webAI.js";

/**
 * 🎯 Point d'entrée : reçoit une commande et lance la génération IA
 *    avec retry automatique en cas de surcharge Google (503)
 */
export async function runAIGeneration(order) {
  const db = getFirestore();
  const { orderNumber, serviceId } = order;

  console.log(`🤖 [IA] Démarrage pour ${orderNumber} (serviceId: ${serviceId})`);

  try {
    await updateOrderAndTracking(orderNumber, {
      aiStatus: "processing",
      status: "En cours",
      aiStartedAt: FieldValue.serverTimestamp(),
      aiLogs: [`Démarrage à ${new Date().toISOString()}`],
    });

    const maxAttempts = 3;
    const delays = [0, 10000, 30000, 120000];
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const wait = delays[attempt] || 30000;
          console.log(`⏳ Attente ${wait / 1000}s avant essai ${attempt + 1}...`);
          await new Promise((r) => setTimeout(r, wait));
        }

        console.log(`🔄 Essai ${attempt + 1}/${maxAttempts} pour ${orderNumber}`);

        const result = await executeService(serviceId, order);

        await updateOrderAndTracking(orderNumber, {
          aiStatus: "done",
          status: "Livrée",
          deliveryUrl: result.deliveryUrl || "",
          aiContent: result.content || null,
          aiFinishedAt: FieldValue.serverTimestamp(),
          aiLogs: FieldValue.arrayUnion(
            `✅ Terminé (essai ${attempt + 1}) à ${new Date().toISOString()}`
          ),
        });

        console.log(`✅ [IA] Livraison terminée pour ${orderNumber}`);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Essai ${attempt + 1} échoué:`, error?.message || error);

        const code = error?.code || error?.status;
        const isOverload =
          code === 503 ||
          code === 429 ||
          String(error?.message).includes("503") ||
          String(error?.message).includes("high demand");

        if (!isOverload) {
          throw error;
        }
      }
    }

    throw new Error(`Échec après ${maxAttempts} essais: ${lastError?.message}`);
  } catch (error) {
    console.error(`❌ [IA] Erreur finale pour ${orderNumber}:`, error?.message || error);

    await updateOrderAndTracking(orderNumber, {
      aiStatus: "error",
      aiError: String(error?.message || error),
      aiFinishedAt: FieldValue.serverTimestamp(),
      aiLogs: FieldValue.arrayUnion(
        `❌ Erreur à ${new Date().toISOString()}: ${error?.message || error}`
      ),
    });

    throw error;
  }
}

/**
 * 🎯 Route vers le bon service IA
 */
async function executeService(serviceId, order) {
  switch (serviceId) {
    case "logo-design":
    case "social-media":
      return await generateDesign(order);

    case "writing":
    case "business-document":
      return await generateWriting(order);

    case "video-restaurant":
      return await generateVideoScript(order);

    case "website":
      return await generateWebsite(order);

    case "ai-content":
      return await generateWriting(order);

    case "mobile-app":
      return {
        deliveryUrl: "",
        content: "Prestation en cours de traitement manuel.",
        manual: true,
      };

    default:
      throw new Error(`Service non pris en charge: ${serviceId}`);
  }
}

/**
 * 🔄 Met à jour la commande dans `orders` ET `tracking`
 */
async function updateOrderAndTracking(orderNumber, data) {
  const db = getFirestore();

  const ordersSnap = await db
    .collection("orders")
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  if (ordersSnap.empty) {
    console.error(`Commande introuvable: ${orderNumber}`);
    return;
  }

  const orderDoc = ordersSnap.docs[0];
  const orderData = orderDoc.data();

  await orderDoc.ref.update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (orderData.trackingCode) {
    await db
      .collection("tracking")
      .doc(orderData.trackingCode)
      .update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch((err) =>
        console.warn(`Tracking non mis à jour: ${err?.message}`)
      );
  }
}
