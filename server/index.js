import express from "express";
import cors from "cors";
import fs from "node:fs";

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// 🆕 Import de l'orchestrateur IA
import { runAIGeneration } from "./services/aiOrchestrator.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 10000;

const APPLICATION_URL = "https://prestations-5f025.web.app/";

const FIREBASE_SERVICE_ACCOUNT_PATH =
  "/etc/secrets/firebase-service-account.json";

const PAYDUNYA_CREATE_URL =
  "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

const PAYDUNYA_CONFIRM_BASE_URL =
  "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm";

const PAYDUNYA_RETURN_URL =
  "https://plateforme-prestation-d-ploiement.onrender.com/api/paydunya/payment-return";

// =====================================================
// FIREBASE ADMIN
// =====================================================

let firebaseServiceAccount;

try {
  firebaseServiceAccount = JSON.parse(
    fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
  );

  initializeApp({
    credential: cert(firebaseServiceAccount),
  });

  console.log("Firebase Admin initialisé avec succès.");
} catch (error) {
  console.error("Erreur Firebase Admin:", error?.message || error);
  process.exit(1);
}

const db = getFirestore();

// =====================================================
// ACCUEIL
// =====================================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Serveur Prestations Online opérationnel",
    aiEnabled: true,
  });
});

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Prestations Online",
    payment: "PayDunya Sandbox",
    firebaseAdmin: true,
    ai: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      cloudinary: Boolean(process.env.CLOUDINARY_API_KEY),
    },
  });
});

// =====================================================
// CRÉATION DE LA FACTURE PAYDUNYA
// =====================================================

app.post("/api/paydunya/create-invoice", async (req, res) => {
  try {
    const { orderNumber, amount, description, name, email, phone } = req.body;

    if (!orderNumber || !amount || !description) {
      return res.status(400).json({
        ok: false,
        message: "Informations de commande incomplètes.",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Le montant de la commande est invalide.",
      });
    }

    const paydunyaConfig = {
      masterKey: Boolean(process.env.PAYDUNYA_MASTER_KEY?.trim()),
      privateKey: Boolean(process.env.PAYDUNYA_PRIVATE_KEY?.trim()),
      token: Boolean(process.env.PAYDUNYA_TOKEN?.trim()),
    };

    console.log("Configuration PayDunya:", paydunyaConfig);

    if (
      !paydunyaConfig.masterKey ||
      !paydunyaConfig.privateKey ||
      !paydunyaConfig.token
    ) {
      return res.status(500).json({
        ok: false,
        message: "La configuration du paiement n'est pas disponible.",
      });
    }

    console.log(`Création de la facture PayDunya pour ${orderNumber}`);

    const response = await fetch(PAYDUNYA_CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
        "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
        "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: numericAmount,
          description: `${orderNumber} - ${description}`,
          customer: {
            name: name || "",
            email: email || "",
            phone: phone || "",
          },
        },
        store: {
          name: "Prestations Online",
          website_url: "https://prestations-5f025.web.app",
        },
        actions: {
          return_url: PAYDUNYA_RETURN_URL,
        },
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    console.log("Réponse PayDunya:", {
      httpStatus: response.status,
      responseCode: data?.response_code || null,
      responseText: data?.response_text || null,
      description: data?.description || null,
      hasPaymentUrl: Boolean(data?.response_text),
      hasToken: Boolean(data?.token),
    });

    if (!response.ok || data?.response_code !== "00") {
      console.error("PayDunya a refusé la création de la facture.");

      return res.status(502).json({
        ok: false,
        message:
          data?.response_text ||
          data?.description ||
          "PayDunya n'a pas pu créer la facture.",
        responseCode: data?.response_code || null,
      });
    }

    if (!data.response_text || !data.token) {
      return res.status(502).json({
        ok: false,
        message:
          "PayDunya n'a pas retourné les informations de paiement nécessaires.",
      });
    }

    const ordersSnapshot = await db
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (ordersSnapshot.empty) {
      console.error(`Commande introuvable: ${orderNumber}`);
      return res.status(404).json({
        ok: false,
        message: "Commande introuvable dans Firebase.",
      });
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();

    await orderDoc.ref.update({
      paydunyaToken: data.token,
      paymentStatus: "En attente",
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (orderData.trackingCode) {
      await db
        .collection("tracking")
        .doc(orderData.trackingCode)
        .update({
          paydunyaToken: data.token,
          paymentStatus: "En attente",
          updatedAt: FieldValue.serverTimestamp(),
        });
    }

    console.log(`Facture PayDunya créée avec succès pour ${orderNumber}`);

    return res.json({
      ok: true,
      paymentUrl: data.response_text,
      token: data.token,
    });
  } catch (error) {
    console.error("Erreur création facture:", error?.message || error);
    return res.status(500).json({
      ok: false,
      message: "Erreur interne du serveur.",
    });
  }
});

// =====================================================
// RETOUR APRÈS PAIEMENT
// =====================================================

app.get("/api/paydunya/payment-return", async (req, res) => {
  try {
    const token = req.query.token;

    console.log("Retour PayDunya reçu:", Boolean(token));

    if (!token) {
      return res.redirect(`${APPLICATION_URL}?payment=missing-token`);
    }

    const response = await fetch(
      `${PAYDUNYA_CONFIRM_BASE_URL}/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
          "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
          "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
        },
      }
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const paymentStatus = data?.invoice?.status || data?.status || "";

    console.log("Confirmation PayDunya:", {
      httpStatus: response.status,
      responseCode: data?.response_code || null,
      status: paymentStatus || null,
    });

    if (!response.ok || data?.response_code !== "00") {
      return res.redirect(`${APPLICATION_URL}?payment=verification-error`);
    }

    const ordersSnapshot = await db
      .collection("orders")
      .where("paydunyaToken", "==", token)
      .limit(1)
      .get();

    if (ordersSnapshot.empty) {
      console.error("Commande correspondant au token introuvable.");
      return res.redirect(`${APPLICATION_URL}?payment=order-not-found`);
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();

    // -------------------------------------------------
    // PAIEMENT CONFIRMÉ
    // -------------------------------------------------
    if (paymentStatus.toLowerCase() === "completed") {
      await orderDoc.ref.update({
        paymentStatus: "Payé",
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (orderData.trackingCode) {
        await db
          .collection("tracking")
          .doc(orderData.trackingCode)
          .update({
            paymentStatus: "Payé",
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
      }

      console.log(`Paiement confirmé pour ${orderData.orderNumber}`);

      // 🆕 DÉCLENCHER LA GÉNÉRATION IA (en arrière-plan)
      runAIGeneration({
        orderNumber: orderData.orderNumber,
        serviceId: orderData.serviceId,
        serviceTitle: orderData.serviceTitle,
        packageName: orderData.package,
        description: orderData.description,
        customerName: orderData.customerName,
        email: orderData.email,
      }).catch((err) =>
        console.error("Erreur génération IA:", err?.message || err)
      );

      return res.redirect(
        `${APPLICATION_URL}?payment=success&order=${encodeURIComponent(
          orderData.orderNumber
        )}`
      );
    }

    // -------------------------------------------------
    // PAIEMENT EN ATTENTE
    // -------------------------------------------------
    if (paymentStatus.toLowerCase() === "pending") {
      return res.redirect(
        `${APPLICATION_URL}?payment=pending&order=${encodeURIComponent(
          orderData.orderNumber
        )}`
      );
    }

    // -------------------------------------------------
    // PAIEMENT ANNULÉ / ÉCHOUÉ
    // -------------------------------------------------
    return res.redirect(
      `${APPLICATION_URL}?payment=failed&order=${encodeURIComponent(
        orderData.orderNumber
      )}`
    );
  } catch (error) {
    console.error("Erreur confirmation PayDunya:", error?.message || error);
    return res.redirect(`${APPLICATION_URL}?payment=error`);
  }
});

// =====================================================
// 🆕 STATUT DE GÉNÉRATION IA
// =====================================================

app.get("/api/ai/status/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const snap = await db
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ ok: false, message: "Commande introuvable." });
    }

    const data = snap.docs[0].data();

    return res.json({
      ok: true,
      status: data.status,
      aiStatus: data.aiStatus || "idle",
      deliveryUrl: data.deliveryUrl || "",
      aiError: data.aiError || null,
    });
  } catch (error) {
    console.error("Erreur statut IA:", error?.message || error);
    return res.status(500).json({ ok: false, message: "Erreur serveur." });
  }
});

// =====================================================
// 🆕 RELANCE MANUELLE DE L'IA (admin)
// =====================================================

app.post("/api/ai/retry/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const snap = await db
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ ok: false, message: "Commande introuvable." });
    }

    const data = snap.docs[0].data();

    runAIGeneration({
      orderNumber: data.orderNumber,
      serviceId: data.serviceId,
      serviceTitle: data.serviceTitle,
      packageName: data.package,
      description: data.description,
      customerName: data.customerName,
      email: data.email,
    }).catch((err) =>
      console.error("Erreur relance IA:", err?.message || err)
    );

    return res.json({ ok: true, message: "Génération IA relancée." });
  } catch (error) {
    console.error("Erreur relance IA:", error?.message || error);
    return res.status(500).json({ ok: false, message: "Erreur serveur." });
  }
});

// =====================================================
// SERVEUR
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`IA Gemini : ${process.env.GEMINI_API_KEY ? "✅" : "❌"}`);
  console.log(`Cloudinary : ${process.env.CLOUDINARY_API_KEY ? "✅" : "❌"}`);
});
