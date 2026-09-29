import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Serveur Prestations Online opérationnel"
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
      phone
    } = req.body;

    if (!orderNumber || !amount || !description) {
      return res.status(400).json({
        ok: false,
        message: "Informations de commande incomplètes."
      });
    }

    const response = await fetch(
      "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
          "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
          "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN
        },
        body: JSON.stringify({
          invoice: {
            total_amount: Number(amount),
            description: `${orderNumber} - ${description}`,
            customer: {
              name: name || "",
              email: email || "",
              phone: phone || ""
            }
          },
          store: {
            name: "Prestations Online"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.response_code !== "00") {
      console.error("Erreur PayDunya:", data);

      return res.status(502).json({
        ok: false,
        message: "PayDunya n'a pas pu créer la facture.",
        details: data
      });
    }

    return res.json({
      ok: true,
      paymentUrl: data.response_text,
      token: data.token
    });

  } catch (error) {
    console.error("Erreur serveur:", error);

    return res.status(500).json({
      ok: false,
      message: "Erreur interne du serveur."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
