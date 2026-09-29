import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const PAYDUNYA_CREATE_URL =
  "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

const RETURN_URL =
  "https://prestations-5f025.web.app/";

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Serveur Prestations Online opérationnel",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Prestations Online",
    payment: "PayDunya Sandbox",
  });
});

app.post("/api/paydunya/create-invoice", async (req, res) => {
  try {
    const {
      orderNumber,
      amount,
      description,
      name,
      email,
      phone,
    } = req.body;

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

    // Vérification sécurisée des variables PayDunya.
    // Les valeurs des clés ne sont jamais affichées.
    const paydunyaConfig = {
      masterKey: Boolean(
        process.env.PAYDUNYA_MASTER_KEY?.trim()
      ),
      privateKey: Boolean(
        process.env.PAYDUNYA_PRIVATE_KEY?.trim()
      ),
      token: Boolean(
        process.env.PAYDUNYA_TOKEN?.trim()
      ),
    };

    console.log(
      "Configuration PayDunya:",
      paydunyaConfig
    );

    if (
      !paydunyaConfig.masterKey ||
      !paydunyaConfig.privateKey ||
      !paydunyaConfig.token
    ) {
      return res.status(500).json({
        ok: false,
        message:
          "La configuration du paiement n'est pas disponible.",
      });
    }

    console.log(
      `Création de la facture PayDunya pour ${orderNumber}`
    );

    const response = await fetch(
      PAYDUNYA_CREATE_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "PAYDUNYA-MASTER-KEY":
            process.env.PAYDUNYA_MASTER_KEY,

          "PAYDUNYA-PRIVATE-KEY":
            process.env.PAYDUNYA_PRIVATE_KEY,

          "PAYDUNYA-TOKEN":
            process.env.PAYDUNYA_TOKEN,
        },

        body: JSON.stringify({
          invoice: {
            total_amount: numericAmount,

            description:
              `${orderNumber} - ${description}`,

            customer: {
              name: name || "",
              email: email || "",
              phone: phone || "",
            },
          },

          store: {
            name: "Prestations Online",

            website_url:
              "https://prestations-5f025.web.app",
          },

          actions: {
            return_url: RETURN_URL,
          },
        }),
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Diagnostic sécurisé :
    // aucune clé PayDunya n'est affichée.
    console.log("Réponse PayDunya:", {
      httpStatus: response.status,
      responseCode: data?.response_code || null,
      responseText: data?.response_text || null,
      description: data?.description || null,
      hasPaymentUrl: Boolean(data?.response_text),
      hasToken: Boolean(data?.token),
    });

    if (
      !response.ok ||
      data?.response_code !== "00"
    ) {
      console.error(
        "PayDunya a refusé la création de la facture."
      );

      return res.status(502).json({
        ok: false,
        message:
          data?.response_text ||
          data?.description ||
          "PayDunya n'a pas pu créer la facture.",
        responseCode:
          data?.response_code || null,
      });
    }

    if (
      !data.response_text ||
      !data.token
    ) {
      console.error(
        "Réponse PayDunya incomplète."
      );

      return res.status(502).json({
        ok: false,
        message:
          "PayDunya n'a pas retourné les informations de paiement nécessaires.",
      });
    }

    console.log(
      `Facture PayDunya créée avec succès pour ${orderNumber}`
    );

    return res.json({
      ok: true,
      paymentUrl: data.response_text,
      token: data.token,
    });

  } catch (error) {
    console.error(
      "Erreur serveur:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      message: "Erreur interne du serveur.",
    });
  }
});

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Serveur démarré sur le port ${PORT}`
    );
  }
);
