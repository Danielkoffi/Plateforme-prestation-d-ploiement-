import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { generateDesign } from "./designAI.js";
import { generateWriting } from "./writingAI.js";
import { generateVideoScript } from "./videoAI.js";
import { generateWebsite } from "./webAI.js";

const db = getFirestore();

/**
 * 🎯 Point d'entrée : reçoit une commande et lance la génération IA
 */
export async function runAIGeneration(order) {
  const { orderNumber, serviceId } = order;

  console.log(`🤖 [IA] Démarrage pour ${orderNumber} (serviceId: ${serviceId})`);

  try {
    // 1. Marquer comme "en cours"
    await updateOrderAndTracking(orderNumber, {
      aiStatus: "processing",
      status: "En cours",
      aiStartedAt: FieldValue.serverTimestamp(),
      aiLogs: [`Démarrage à ${new Date().toISOString()}`],
    });

    // 2. Router vers le bon service
    let result;

    switch (serviceId) {
      case "logo-design":
      case "social-media":
        result = await generateDesign(order);
        break;

      case "writing":
      case "business-document":
        result = await generateWriting(order);
        break;

      case "video-restaurant":
        result = await generateVideoScript(order);
        break;

      case "website":
        result = await generateWebsite(order);
        break;

      case "ai-content":
        // Fallback : traité comme du contenu écrit
        result = await generateWriting(order);
        break;

      case "mobile-app":
        // Pas encore automatisé → reste manuel
        result = {
          deliveryUrl: "",
          content: "Prestation en cours de traitement manuel.",
          manual: true,
        };
        break;

      default:
        throw new Error(`Service non pris en charge: ${serviceId}`);
    }

    // 3. Marquer comme livrée
    const finalStatus = result.manual ? "En cours" : "Livrée";

    await updateOrderAndTracking(orderNumber, {
      aiStatus: "done",
      status: finalStatus,
      deliveryUrl: result.deliveryUrl || "",
      aiContent: result.content || null,
      aiFinishedAt: FieldValue.serverTimestamp(),
      aiLogs: FieldValue.arrayUnion(
        `Terminé à ${new Date().toISOString()}`
      ),
    });

    console.log(`✅ [IA] Livraison terminée pour ${orderNumber}`);
    return result;
  } catch (error) {
    console.error(`❌ [IA] Erreur pour ${orderNumber}:`, error?.message || error);

    await updateOrderAndTracking(orderNumber, {
      aiStatus: "error",
      aiError: String(error?.message || error),
      aiFinishedAt: FieldValue.serverTimestamp(),
      aiLogs: FieldValue.arrayUnion(
        `Erreur à ${new Date().toISOString()}: ${error?.message || error}`
      ),
    });

    throw error;
  }
}

/**
 * 🔄 Met à jour la commande dans `orders` ET `tracking`
 */
async function updateOrderAndTracking(orderNumber, data) {
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

  // Synchroniser tracking
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
