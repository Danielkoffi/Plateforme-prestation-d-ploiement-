import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock3,
  PackageCheck,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  FileText,
  Download,
} from "lucide-react";

import { auth, db } from "./firebase-storage.js";
import Admin from "./Admin.jsx";

const API_URL =
  "https://plateforme-prestation-d-ploiement.onrender.com";

const SERVICES = [
  {
    id: "video",
    title: "Vidéo publicitaire IA",
    description:
      "Création d'une vidéo professionnelle pour votre activité.",
    icon: Sparkles,
  },
  {
    id: "web",
    title: "Création de site web",
    description:
      "Site web moderne adapté à votre activité.",
    icon: ShoppingBag,
  },
  {
    id: "design",
    title: "Design graphique",
    description:
      "Visuels professionnels pour votre communication.",
    icon: Sparkles,
  },
];

const STATUSES = [
  {
    key: "Reçue",
    label: "Commande reçue",
    icon: CheckCircle2,
  },
  {
    key: "Acceptée",
    label: "Commande acceptée",
    icon: CheckCircle2,
  },
  {
    key: "En cours",
    label: "Production en cours",
    icon: Clock3,
  },
  {
    key: "Livrée",
    label: "Commande livrée",
    icon: PackageCheck,
  },
  {
    key: "Terminée",
    label: "Commande terminée",
    icon: CheckCircle2,
  },
];

function createOrderNumber() {
  const date = new Date();

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `CMD-${yyyy}${mm}${dd}-${random}`;
}

function createTrackingCode() {
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .toUpperCase();

  return `TRK-${random}`;
}

function formatAmount(amount) {
  return new Intl.NumberFormat("fr-FR").format(
    Number(amount || 0)
  );
}

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString("fr-FR");

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("fr-FR");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("fr-FR");
  }

  return date.toLocaleDateString("fr-FR");
}

function ClientApp() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseMessage, setFirebaseMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "video",
    description: "",
    amount: "",
  });

  const [submittedOrder, setSubmittedOrder] =
    useState(null);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [invoiceLoading, setInvoiceLoading] =
    useState(false);

  const [trackingCode, setTrackingCode] =
    useState("");

  const [trackingResult, setTrackingResult] =
    useState(null);

  const [trackingLoading, setTrackingLoading] =
    useState(false);

  useEffect(() => {
    async function connectFirebase() {
      try {
        await signInAnonymously(auth);

        console.log("Firebase connecté");

        console.log(
          "Projet Firebase :",
          auth.app.options.projectId
        );

        setAuthReady(true);

        setFirebaseMessage(
          `Firebase connecté — projet : ${auth.app.options.projectId}`
        );
      } catch (error) {
        console.error(
          "Erreur connexion Firebase :",
          error
        );

        setErrorMessage(
          `Connexion Firebase impossible : ${error.message}`
        );
      }
    }

    connectFirebase();
  }, []);

  /*
   * Après le retour de PayDunya, on récupère
   * automatiquement la commande payée.
   */
  useEffect(() => {
    async function loadPaymentResult() {
      const params = new URLSearchParams(
        window.location.search
      );

      const payment =
        params.get("payment");

      const orderNumber =
        params.get("order");

      if (!payment) {
        return;
      }

      if (payment === "success" && orderNumber) {
        setPaymentMessage(
          "Paiement confirmé avec succès."
        );

        setInvoiceLoading(true);

        try {
          const ordersQuery = query(
            collection(db, "orders"),
            where(
              "orderNumber",
              "==",
              orderNumber
            )
          );

          const snapshot =
            await getDocs(ordersQuery);

          if (snapshot.empty) {
            setErrorMessage(
              "Paiement confirmé, mais la commande n'a pas été retrouvée."
            );
            return;
          }

          const orderDoc =
            snapshot.docs[0];

          const data =
            orderDoc.data();

          setSubmittedOrder({
            orderNumber:
              data.orderNumber,
            trackingCode:
              data.trackingCode,
            documentId:
              orderDoc.id,
            amount:
              data.amount,
            name:
              data.customerName,
            email:
              data.email,
            phone:
              data.phone,
            serviceName:
              data.serviceName,
            description:
              data.description,
            paymentStatus:
              data.paymentStatus,
            paydunyaToken:
              data.paydunyaToken || "",
            status:
              data.status,
            createdAt:
              data.createdAt,
          });
        } catch (error) {
          console.error(
            "Erreur récupération commande payée :",
            error
          );

          setErrorMessage(
            `Impossible de récupérer la facture : ${error.message}`
          );
        } finally {
          setInvoiceLoading(false);
        }
      }

      if (payment === "pending") {
        setPaymentMessage(
          "Le paiement est encore en attente de confirmation."
        );
      }

      if (
        payment === "failed" ||
        payment === "verification-error"
      ) {
        setErrorMessage(
          "Le paiement n'a pas été confirmé."
        );
      }

      if (payment === "order-not-found") {
        setErrorMessage(
          "Le paiement a été reçu, mais la commande correspondante n'a pas été retrouvée."
        );
      }

      /*
       * On retire les paramètres de paiement de l'URL
       * sans recharger la page.
       */
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (authReady) {
      loadPaymentResult();
    }
  }, [authReady]);

  const selectedService = useMemo(
    () =>
      SERVICES.find(
        (service) => service.id === form.service
      ),
    [form.service]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();

    setErrorMessage("");
    setPaymentMessage("");
    setSubmittedOrder(null);

    if (!authReady || !auth.currentUser) {
      setErrorMessage(
        "Firebase n'est pas encore connecté."
      );
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage(
        "Veuillez renseigner votre nom."
      );
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage(
        "Veuillez renseigner votre adresse e-mail."
      );
      return;
    }

    if (!form.phone.trim()) {
      setErrorMessage(
        "Veuillez renseigner votre numéro de téléphone."
      );
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage(
        "Veuillez décrire votre besoin."
      );
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage(
        "Veuillez renseigner un montant valide."
      );
      return;
    }

    const orderNumber = createOrderNumber();
    const newTrackingCode =
      createTrackingCode();

    try {
      const customerName =
        form.name.trim();

      const customerEmail =
        form.email.trim();

      const customerPhone =
        form.phone.trim();

      const description =
        form.description.trim();

      const serviceName =
        selectedService?.title ||
        form.service;

      const orderRef = doc(
        collection(db, "orders")
      );

      const orderData = {
        orderNumber,
        trackingCode: newTrackingCode,

        customerName,
        email: customerEmail,
        phone: customerPhone,

        serviceId: form.service,
        serviceName,

        description,

        amount,
        currency: "XOF",

        status: "Reçue",
        paymentStatus: "Non payé",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        customerUid:
          auth.currentUser.uid,
      };

      await setDoc(
        orderRef,
        orderData
      );

      const savedOrder =
        await getDoc(orderRef);

      if (!savedOrder.exists()) {
        throw new Error(
          "La commande n'a pas pu être vérifiée après son écriture."
        );
      }

      const trackingRef = doc(
        db,
        "tracking",
        newTrackingCode
      );

      const trackingData = {
        orderNumber,
        trackingCode: newTrackingCode,

        orderId: orderRef.id,

        customerName,
        serviceName,

        amount,
        currency: "XOF",

        status: "Reçue",
        paymentStatus: "Non payé",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        trackingRef,
        trackingData
      );

      const savedTracking =
        await getDoc(trackingRef);

      if (!savedTracking.exists()) {
        throw new Error(
          "Le document tracking n'a pas pu être vérifié après son écriture."
        );
      }

      setSubmittedOrder({
        orderNumber,
        trackingCode: newTrackingCode,
        documentId: orderRef.id,
        amount,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        serviceName,
        description,
        paymentStatus: "Non payé",
        status: "Reçue",
        createdAt: new Date(),
      });

      setForm({
        name: "",
        email: "",
        phone: "",
        service: "video",
        description: "",
        amount: "",
      });
    } catch (error) {
      console.error(
        "ERREUR FIRESTORE :",
        error
      );

      setErrorMessage(
        `Erreur lors de l'enregistrement : ${error.message}`
      );
    }
  }

  async function startPayment() {
    if (!submittedOrder) {
      setErrorMessage(
        "Aucune commande à payer."
      );
      return;
    }

    setErrorMessage("");
    setPaymentLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/paydunya/create-invoice`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            orderNumber:
              submittedOrder.orderNumber,

            amount:
              submittedOrder.amount,

            description:
              submittedOrder.description,

            name:
              submittedOrder.name,

            email:
              submittedOrder.email,

            phone:
              submittedOrder.phone,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.message ||
            "Impossible de créer la facture PayDunya."
        );
      }

      if (!data.paymentUrl) {
        throw new Error(
          "PayDunya n'a pas fourni de lien de paiement."
        );
      }

      window.location.href =
        data.paymentUrl;
    } catch (error) {
      console.error(
        "Erreur démarrage paiement :",
        error
      );

      setErrorMessage(
        `Paiement impossible : ${error.message}`
      );

      setPaymentLoading(false);
    }
  }

  function downloadInvoice() {
    if (!submittedOrder) {
      return;
    }

    const invoiceWindow =
      window.open(
        "",
        "_blank",
        "width=800,height=900"
      );

    if (!invoiceWindow) {
      setErrorMessage(
        "Le navigateur a bloqué la facture. Autorisez les fenêtres contextuelles puis réessayez."
      );
      return;
    }

    const order =
      submittedOrder;

    const date =
      formatDate(order.createdAt);

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Facture ${order.orderNumber}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 30px;
              color: #111827;
              background: #ffffff;
            }

            .invoice {
              max-width: 760px;
              margin: auto;
              border: 1px solid #e5e7eb;
              padding: 35px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 2px solid #111827;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }

            h1 {
              margin: 0;
              font-size: 28px;
            }

            h2 {
              margin-top: 0;
            }

            .muted {
              color: #6b7280;
            }

            .paid {
              display: inline-block;
              margin-top: 10px;
              padding: 8px 14px;
              border-radius: 8px;
              background: #dcfce7;
              color: #166534;
              font-weight: bold;
            }

            .section {
              margin-top: 25px;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 8px 0;
              border-bottom: 1px solid #f3f4f6;
            }

            .total {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #111827;
              font-size: 20px;
              font-weight: bold;
            }

            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }

            .print {
              margin-bottom: 20px;
              padding: 10px 18px;
              border: none;
              border-radius: 8px;
              background: #111827;
              color: white;
              cursor: pointer;
            }

            @media print {
              .print {
                display: none;
              }

              body {
                padding: 0;
              }

              .invoice {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <button class="print" onclick="window.print()">
            Enregistrer / Imprimer en PDF
          </button>

          <div class="invoice">

            <div class="header">
              <div>
                <h1>Prestations Online</h1>
                <p class="muted">
                  Facture / Reçu de paiement
                </p>
              </div>

              <div>
                <strong>${order.orderNumber}</strong>
                <br />
                <span class="muted">${date}</span>
                <br />
                <span class="paid">PAYÉ</span>
              </div>
            </div>

            <div class="section">
              <h2>Informations client</h2>

              <div class="row">
                <strong>Nom</strong>
                <span>${escapeHtml(order.name)}</span>
              </div>

              <div class="row">
                <strong>E-mail</strong>
                <span>${escapeHtml(order.email)}</span>
              </div>

              <div class="row">
                <strong>Téléphone</strong>
                <span>${escapeHtml(order.phone)}</span>
              </div>
            </div>

            <div class="section">
              <h2>Prestation</h2>

              <div class="row">
                <strong>Service</strong>
                <span>${escapeHtml(order.serviceName || "")}</span>
              </div>

              <div class="row">
                <strong>Description</strong>
                <span>${escapeHtml(order.description || "")}</span>
              </div>

              <div class="row">
                <strong>Code de suivi</strong>
                <span>${escapeHtml(order.trackingCode)}</span>
              </div>

              <div class="row">
                <strong>Statut</strong>
                <span>${escapeHtml(order.status || "Reçue")}</span>
              </div>

              <div class="row">
                <strong>Paiement</strong>
                <span>Payé</span>
              </div>

              <div class="total">
                Total payé :
                ${formatAmount(order.amount)} FCFA
              </div>
            </div>

            <div class="footer">
              Merci pour votre commande.<br />
              Votre paiement a été confirmé.
            </div>

          </div>
        </body>
      </html>
    `);

    invoiceWindow.document.close();

    setTimeout(() => {
      invoiceWindow.focus();
    }, 300);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function searchTracking(event) {
    event.preventDefault();

    setTrackingResult(null);
    setErrorMessage("");

    const code = trackingCode
      .trim()
      .toUpperCase();

    if (!code) {
      setErrorMessage(
        "Entrez votre code de suivi."
      );
      return;
    }

    setTrackingLoading(true);

    try {
      const trackingRef = doc(
        db,
        "tracking",
        code
      );

      const result =
        await getDoc(trackingRef);

      if (!result.exists()) {
        setTrackingResult({
          found: false,
          message:
            "Aucune commande trouvée avec ce code.",
        });

        return;
      }

      setTrackingResult({
        found: true,
        data: result.data(),
      });
    } catch (error) {
      console.error(
        "Erreur recherche tracking :",
        error
      );

      setErrorMessage(
        `Erreur de recherche : ${error.message}`
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">
              Mes Prestations
            </h1>

            <p className="text-xs text-slate-400">
              Prestations en ligne
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            className="rounded-lg border border-white/10 p-2"
          >
            {menuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 px-4 py-4">
            <a
              href="#commander"
              onClick={() =>
                setMenuOpen(false)
              }
              className="block py-2 text-sm text-slate-300"
            >
              Commander
            </a>

            <a
              href="#suivi"
              onClick={() =>
                setMenuOpen(false)
              }
              className="block py-2 text-sm text-slate-300"
            >
              Suivre une commande
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={32} />
          </div>

          <h2 className="text-4xl font-bold">
            Vos prestations, simplement.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Commandez une prestation en ligne et
            suivez son évolution avec votre numéro
            de commande.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <ShieldCheck size={16} />

            {firebaseMessage ||
              "Connexion à Firebase..."}
          </div>
        </section>

        <section className="mb-12 grid gap-4 md:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <Icon size={26} />

                <h3 className="mt-4 font-semibold">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {service.description}
                </p>
              </div>
            );
          })}
        </section>

        {paymentMessage && (
          <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {paymentMessage}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {invoiceLoading && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            Récupération de votre facture...
          </div>
        )}

        {submittedOrder && (
          <section className="mb-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2
                className="text-emerald-400"
                size={28}
              />

              <h3 className="text-xl font-bold">
                Commande enregistrée
              </h3>
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <p>
                <strong>
                  Numéro de commande :
                </strong>{" "}
                {submittedOrder.orderNumber}
              </p>

              <p>
                <strong>
                  Code de suivi :
                </strong>{" "}
                {submittedOrder.trackingCode}
              </p>

              <p>
                <strong>
                  Document de commande :
                </strong>{" "}
                {submittedOrder.documentId}
              </p>

              <p>
                <strong>
                  Montant :
                </strong>{" "}
                {formatAmount(
                  submittedOrder.amount
                )}{" "}
                FCFA
              </p>

              <p>
                <strong>
                  Paiement :
                </strong>{" "}
                <span
                  className={
                    submittedOrder.paymentStatus ===
                    "Payé"
                      ? "text-emerald-300"
                      : "text-yellow-300"
                  }
                >
                  {submittedOrder.paymentStatus}
                </span>
              </p>
            </div>

            {submittedOrder.paymentStatus ===
              "Payé" ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={
                    downloadInvoice
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950"
                >
                  <Download size={18} />
                  Télécharger la facture
                </button>

                <p className="mt-3 text-center text-xs text-slate-400">
                  La facture peut être enregistrée
                  en PDF depuis la fenêtre d'impression.
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={paymentLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard size={18} />

                  {paymentLoading
                    ? "Préparation du paiement..."
                    : "Payer maintenant"}

                  {!paymentLoading && (
                    <ArrowRight size={18} />
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Le paiement sera vérifié avant le
                  démarrage de la prestation.
                </p>
              </div>
            )}
          </section>
        )}

        <section
          id="commander"
          className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <ShoppingBag size={22} />

              <h2 className="text-2xl font-bold">
                Passer une commande
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Remplissez le formulaire pour créer
              votre commande.
            </p>
          </div>

          <form
            onSubmit={submitOrder}
            className="grid gap-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm">
                  Nom
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  E-mail
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="vous@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Téléphone
                </label>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+225..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Prestation
                </label>

                <select
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                >
                  {SERVICES.map(
                    (service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.title}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Montant (FCFA)
                </label>

                <input
                  type="number"
                  min="1"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Décrivez votre besoin
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="5"
                placeholder="Expliquez ce que vous souhaitez..."
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!authReady}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={18} />

              {authReady
                ? "Enregistrer la commande"
                : "Connexion Firebase..."}

              <ArrowRight size={18} />
            </button>
          </form>
        </section>

        <section
          id="suivi"
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="mb-6 flex items-center gap-2">
            <Search size={22} />

            <h2 className="text-2xl font-bold">
              Suivre une commande
            </h2>
          </div>

          <form
            onSubmit={searchTracking}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={trackingCode}
              onChange={(event) =>
                setTrackingCode(
                  event.target.value
                )
              }
              placeholder="TRK-..."
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
            />

            <button
              type="submit"
              disabled={trackingLoading}
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {trackingLoading
                ? "Recherche..."
                : "Rechercher"}
            </button>
          </form>

          {trackingResult && (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-5">
              {!trackingResult.found ? (
                <p className="text-sm text-slate-400">
                  {trackingResult.message}
                </p>
              ) : (
                <>
                  <p className="font-semibold">
                    Commande :{" "}
                    {
                      trackingResult.data
                        .orderNumber
                    }
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Statut :{" "}
                    <span className="text-white">
                      {
                        trackingResult.data
                          .status
                      }
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Paiement :{" "}
                    <span className="text-white">
                      {
                        trackingResult.data
                          .paymentStatus
                      }
                    </span>
                  </p>

                  <div className="mt-6 grid gap-3">
                    {STATUSES.map(
                      (status) => {
                        const Icon =
                          status.icon;

                        const currentIndex =
                          STATUSES.findIndex(
                            (item) =>
                              item.key ===
                              trackingResult
                                .data.status
                          );

                        const statusIndex =
                          STATUSES.findIndex(
                            (item) =>
                              item.key ===
                              status.key
                          );

                        const active =
                          statusIndex <=
                          currentIndex;

                        return (
                          <div
                            key={status.key}
                            className={`flex items-center gap-3 rounded-lg border p-3 ${
                              active
                                ? "border-emerald-400/30 bg-emerald-400/10"
                                : "border-white/10"
                            }`}
                          >
                            <Icon size={18} />

                            <span className="text-sm">
                              {status.label}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function App() {
  const isAdminPage =
    window.location.pathname === "/admin";

  if (isAdminPage) {
    return <Admin />;
  }

  return <ClientApp />;
}

export default App;
