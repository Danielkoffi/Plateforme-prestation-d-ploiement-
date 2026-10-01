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
  Download,
  User,
  LayoutDashboard,
  Receipt,
  Headphones,
  LogOut,
  ChevronRight,
  LockKeyhole,
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
      "Création d'une vidéo publicitaire professionnelle pour votre activité.",
    icon: Sparkles,
  },
  {
    id: "web",
    title: "Création de site web",
    description:
      "Création d'un site moderne adapté à votre activité.",
    icon: ShoppingBag,
  },
  {
    id: "design",
    title: "Design graphique",
    description:
      "Création de visuels professionnels pour votre communication.",
    icon: Sparkles,
  },
];

const STATUSES = [
  {
    key: "Reçue",
    label: "Commande reçue",
    description: "Votre commande a bien été enregistrée.",
    icon: CheckCircle2,
  },
  {
    key: "Acceptée",
    label: "Commande acceptée",
    description: "Votre demande a été prise en charge.",
    icon: CheckCircle2,
  },
  {
    key: "En cours",
    label: "Production en cours",
    description: "Votre prestation est actuellement réalisée.",
    icon: Clock3,
  },
  {
    key: "Livrée",
    label: "Commande livrée",
    description: "Votre prestation est disponible.",
    icon: PackageCheck,
  },
  {
    key: "Terminée",
    label: "Commande terminée",
    description: "La commande est terminée.",
    icon: CheckCircle2,
  },
];

function createOrderNumber() {
  const date = new Date();

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 8)
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
  if (!value) {
    return new Date().toLocaleDateString("fr-FR");
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("fr-FR");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("fr-FR");
  }

  return date.toLocaleDateString("fr-FR");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ClientApp() {
  const [authReady, setAuthReady] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "video",
    description: "",
    amount: "",
  });

  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const selectedService = useMemo(
    () =>
      SERVICES.find(
        (service) => service.id === form.service
      ),
    [form.service]
  );

  /*
   * AUTHENTIFICATION CLIENT
   */
  useEffect(() => {
    async function connectFirebase() {
      try {
        await signInAnonymously(auth);

        setAuthReady(true);
      } catch (error) {
        console.error(
          "Erreur connexion Firebase :",
          error
        );

        setErrorMessage(
          "La connexion sécurisée à la plateforme est momentanément indisponible."
        );
      }
    }

    connectFirebase();
  }, []);

  /*
   * RETOUR PAYDUNYA
   */
  useEffect(() => {
    async function loadPaymentResult() {
      const params = new URLSearchParams(
        window.location.search
      );

      const payment = params.get("payment");
      const orderNumber = params.get("order");

      if (!payment) {
        return;
      }

      if (payment === "success" && orderNumber) {
        setSuccessMessage(
          "Votre paiement a été confirmé avec succès."
        );

        setInvoiceLoading(true);

        try {
          if (!auth.currentUser) {
            throw new Error(
              "Session client indisponible."
            );
          }

          const ordersQuery = query(
            collection(db, "orders"),
            where(
              "orderNumber",
              "==",
              orderNumber
            ),
            where(
              "customerUid",
              "==",
              auth.currentUser.uid
            )
          );

          const snapshot = await getDocs(
            ordersQuery
          );

          if (snapshot.empty) {
            setErrorMessage(
              "Le paiement a été confirmé, mais la commande n'est pas disponible dans cette session."
            );
            return;
          }

          const orderDoc = snapshot.docs[0];
          const data = orderDoc.data();

          setSubmittedOrder({
            orderNumber: data.orderNumber,
            trackingCode: data.trackingCode,
            documentId: orderDoc.id,
            amount: data.amount,
            name: data.customerName,
            email: data.email,
            phone: data.phone,
            serviceName: data.serviceName,
            description: data.description,
            paymentStatus: data.paymentStatus,
            paydunyaToken: data.paydunyaToken || "",
            status: data.status,
            createdAt: data.createdAt,
            deliveryUrl: data.deliveryUrl || "",
          });

          setActiveSection("commande");
        } catch (error) {
          console.error(
            "Erreur récupération commande :",
            error
          );

          setErrorMessage(
            "Impossible de récupérer les informations de votre commande."
          );
        } finally {
          setInvoiceLoading(false);
        }
      }

      if (payment === "pending") {
        setErrorMessage(
          "Votre paiement est encore en cours de confirmation."
        );
      }

      if (
        payment === "failed" ||
        payment === "verification-error"
      ) {
        setErrorMessage(
          "Le paiement n'a pas pu être confirmé."
        );
      }

      if (payment === "order-not-found") {
        setErrorMessage(
          "Le paiement a été reçu, mais la commande correspondante n'a pas été retrouvée."
        );
      }

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

  /*
   * CHARGER LES COMMANDES DU CLIENT
   */
  async function loadMyOrders() {
    if (!auth.currentUser) {
      return;
    }

    setOrdersLoading(true);
    setErrorMessage("");

    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where(
          "customerUid",
          "==",
          auth.currentUser.uid
        )
      );

      const snapshot = await getDocs(
        ordersQuery
      );

      const orders = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
          const dateA =
            a.createdAt?.toDate?.()?.getTime?.() || 0;

          const dateB =
            b.createdAt?.toDate?.()?.getTime?.() || 0;

          return dateB - dateA;
        });

      setMyOrders(orders);
    } catch (error) {
      console.error(
        "Erreur récupération commandes :",
        error
      );

      setErrorMessage(
        "Impossible de charger vos commandes."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    if (authReady) {
      loadMyOrders();
    }
  }, [authReady]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function navigateTo(section) {
    setActiveSection(section);
    setMenuOpen(false);
    setErrorMessage("");

    setTimeout(() => {
      const element =
        document.getElementById(section);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 50);
  }

  /*
   * CREATION COMMANDE
   */
  async function submitOrder(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setSubmittedOrder(null);

    if (!authReady || !auth.currentUser) {
      setErrorMessage(
        "La connexion sécurisée n'est pas encore prête."
      );
      return;
    }

    const customerName = form.name.trim();
    const customerEmail = form.email.trim();
    const customerPhone = form.phone.trim();
    const description = form.description.trim();

    if (customerName.length < 2) {
      setErrorMessage(
        "Veuillez renseigner votre nom."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ) {
      setErrorMessage(
        "Veuillez renseigner une adresse e-mail valide."
      );
      return;
    }

    if (customerPhone.length < 6) {
      setErrorMessage(
        "Veuillez renseigner un numéro de téléphone valide."
      );
      return;
    }

    if (description.length < 5) {
      setErrorMessage(
        "Veuillez décrire votre besoin."
      );
      return;
    }

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setErrorMessage(
        "Veuillez renseigner un montant valide."
      );
      return;
    }

    if (amount > 100000000) {
      setErrorMessage(
        "Le montant indiqué est trop élevé."
      );
      return;
    }

    const orderNumber = createOrderNumber();
    const newTrackingCode =
      createTrackingCode();

    try {
      const serviceName =
        selectedService?.title ||
        form.service;

      const customerUid =
        auth.currentUser.uid;

      const orderRef = doc(
        collection(db, "orders")
      );

      const orderData = {
        orderNumber,
        trackingCode: newTrackingCode,

        customerUid,

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
      };

      await setDoc(
        orderRef,
        orderData
      );

      const savedOrder =
        await getDoc(orderRef);

      if (!savedOrder.exists()) {
        throw new Error(
          "La commande n'a pas pu être vérifiée."
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

        customerUid,

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
          "Le suivi de la commande n'a pas pu être vérifié."
        );
      }

      const order = {
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
        deliveryUrl: "",
      };

      setSubmittedOrder(order);

      setSuccessMessage(
        "Votre commande a été enregistrée avec succès."
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        service: "video",
        description: "",
        amount: "",
      });

      await loadMyOrders();

      setActiveSection("commande");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "ERREUR CREATION COMMANDE :",
        error
      );

      setErrorMessage(
        `Impossible d'enregistrer la commande : ${error.message}`
      );
    }
  }

  /*
   * PAIEMENT
   */
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
            "Content-Type": "application/json",
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
            "Impossible de créer le paiement."
        );
      }

      if (!data.paymentUrl) {
        throw new Error(
          "Aucun lien de paiement n'a été fourni."
        );
      }

      window.location.href =
        data.paymentUrl;
    } catch (error) {
      console.error(
        "Erreur paiement :",
        error
      );

      setErrorMessage(
        `Paiement impossible : ${error.message}`
      );

      setPaymentLoading(false);
    }
  }

  /*
   * FACTURE
   */
  function downloadInvoice() {
    if (!submittedOrder) {
      return;
    }

    if (
      submittedOrder.paymentStatus !==
      "Payé"
    ) {
      setErrorMessage(
        "La facture sera disponible après confirmation du paiement."
      );
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
        "Autorisez les fenêtres contextuelles pour ouvrir la facture."
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

          <title>
            Reçu ${escapeHtml(order.orderNumber)}
          </title>

          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 30px;
              color: #111827;
              background: #f8fafc;
            }

            .invoice {
              max-width: 760px;
              margin: auto;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
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
              padding: 9px 0;
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
                background: white;
              }

              .invoice {
                border: none;
              }
            }
          </style>
        </head>

        <body>

          <button
            class="print"
            onclick="window.print()"
          >
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
                <strong>
                  ${escapeHtml(order.orderNumber)}
                </strong>

                <br />

                <span class="muted">
                  ${escapeHtml(date)}
                </span>

                <br />

                <span class="paid">
                  PAYÉ
                </span>
              </div>

            </div>

            <div class="section">

              <h2>
                Informations client
              </h2>

              <div class="row">
                <strong>Nom</strong>
                <span>
                  ${escapeHtml(order.name)}
                </span>
              </div>

              <div class="row">
                <strong>E-mail</strong>
                <span>
                  ${escapeHtml(order.email)}
                </span>
              </div>

              <div class="row">
                <strong>Téléphone</strong>
                <span>
                  ${escapeHtml(order.phone)}
                </span>
              </div>

            </div>

            <div class="section">

              <h2>
                Prestation
              </h2>

              <div class="row">
                <strong>Service</strong>
                <span>
                  ${escapeHtml(
                    order.serviceName || ""
                  )}
                </span>
              </div>

              <div class="row">
                <strong>Description</strong>
                <span>
                  ${escapeHtml(
                    order.description || ""
                  )}
                </span>
              </div>

              <div class="row">
                <strong>Code de suivi</strong>
                <span>
                  ${escapeHtml(
                    order.trackingCode
                  )}
                </span>
              </div>

              <div class="row">
                <strong>Statut</strong>
                <span>
                  ${escapeHtml(
                    order.status || "Reçue"
                  )}
                </span>
              </div>

              <div class="row">
                <strong>Paiement</strong>
                <span>
                  Payé
                </span>
              </div>

              <div class="total">
                Total payé :
                ${formatAmount(
                  order.amount
                )}
                FCFA
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

  /*
   * SUIVI
   */
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

    if (!auth.currentUser) {
      setErrorMessage(
        "Votre session sécurisée n'est pas disponible."
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

      const data = result.data();

      /*
       * Vérification supplémentaire côté interface.
       * Les règles Firestore doivent également effectuer
       * cette protection côté serveur.
       */
      if (
        data.customerUid !==
        auth.currentUser.uid
      ) {
        setTrackingResult({
          found: false,
          message:
            "Cette commande n'est pas associée à votre session.",
        });

        return;
      }

      setTrackingResult({
        found: true,
        data,
      });
    } catch (error) {
      console.error(
        "Erreur recherche tracking :",
        error
      );

      setErrorMessage(
        "Impossible de rechercher cette commande."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  function getStatusIndex(status) {
    return STATUSES.findIndex(
      (item) => item.key === status
    );
  }

  function renderStatusTimeline(status) {
    const currentIndex =
      getStatusIndex(status);

    return (
      <div className="space-y-3">
        {STATUSES.map(
          (item, index) => {
            const Icon = item.icon;

            const active =
              currentIndex >= 0 &&
              index <= currentIndex;

            const current =
              item.key === status;

            return (
              <div
                key={item.key}
                className={`flex gap-3 rounded-xl border p-4 ${
                  current
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : active
                    ? "border-white/10 bg-white/5"
                    : "border-white/5 bg-slate-950/40"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    active
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-white/10 text-slate-500"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div>
                  <p className="font-semibold">
                    {item.label}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  }

  /*
   * HEADER
   */
  function Header() {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() =>
              navigateTo("accueil")
            }
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <Sparkles size={21} />
            </div>

            <div>
              <p className="font-bold">
                Prestations Online
              </p>

              <p className="text-xs text-slate-400">
                Services professionnels en ligne
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            <button
              onClick={() =>
                navigateTo("accueil")
              }
              className="text-sm text-slate-300 hover:text-white"
            >
              Accueil
            </button>

            <button
              onClick={() =>
                navigateTo("commander")
              }
              className="text-sm text-slate-300 hover:text-white"
            >
              Commander
            </button>

            <button
              onClick={() =>
                navigateTo("commandes")
              }
              className="text-sm text-slate-300 hover:text-white"
            >
              Mes commandes
            </button>

            <button
              onClick={() =>
                navigateTo("suivi")
              }
              className="text-sm text-slate-300 hover:text-white"
            >
              Suivi
            </button>

            <button
              onClick={() =>
                navigateTo("support")
              }
              className="text-sm text-slate-300 hover:text-white"
            >
              Support
            </button>
          </nav>

          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            className="rounded-xl border border-white/10 p-2 md:hidden"
          >
            {menuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-slate-950 px-4 py-4 md:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {[
                ["accueil", "Accueil"],
                ["commander", "Commander"],
                ["commandes", "Mes commandes"],
                ["suivi", "Suivre une commande"],
                ["support", "Support"],
              ].map(
                ([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      navigateTo(id)
                    }
                    className="rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </header>
    );
  }

  /*
   * ACCUEIL
   */
  function HomeSection() {
    return (
      <section
        id="accueil"
        className="scroll-mt-24"
      >
        <div className="grid gap-8 py-12 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">
              <ShieldCheck size={15} />
              Plateforme sécurisée
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              Vos prestations
              <span className="block text-emerald-400">
                en ligne, simplement.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              Commandez une prestation professionnelle,
              effectuez votre paiement en ligne et suivez
              l'évolution de votre commande depuis votre
              espace client.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateTo("commander")
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950"
              >
                Commander maintenant
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateTo("suivi")
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold"
              >
                Suivre ma commande
                <Search size={18} />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <ShieldCheck
                  size={20}
                  className="text-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Paiement vérifié
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Receipt
                  size={20}
                  className="text-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Reçu disponible
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <PackageCheck
                  size={20}
                  className="text-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Livraison suivie
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/10 to-white/5 p-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Exemple de commande
                  </p>

                  <p className="mt-1 font-bold">
                    Vidéo publicitaire IA
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
                  <Sparkles size={20} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Commande reçue",
                  "Commande acceptée",
                  "Production en cours",
                  "Commande livrée",
                ].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                        <CheckCircle2
                          size={16}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {item}
                        </p>

                        <p className="text-xs text-slate-500">
                          {index === 3
                            ? "À venir"
                            : "Étape du processus"}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-10">
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-400">
              NOS SERVICES
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Des prestations adaptées à vos besoins
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {SERVICES.map(
              (service) => {
                const Icon = service.icon;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setForm(
                        (current) => ({
                          ...current,
                          service: service.id,
                        })
                      );

                      navigateTo("commander");
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-emerald-400/30 hover:bg-white/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Icon size={24} />
                    </div>

                    <h3 className="mt-5 text-lg font-bold">
                      {service.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {service.description}
                    </p>

                    <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-emerald-400">
                      Commander
                      <ChevronRight size={16} />
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </section>
    );
  }

  /*
   * COMMANDE
   */
  function OrderSection() {
    return (
      <section
        id="commander"
        className="scroll-mt-24 py-10"
      >
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-400">
            NOUVELLE COMMANDE
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Commander une prestation
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Indiquez votre besoin. Votre commande sera
            enregistrée avec un numéro et un code de suivi.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form
              onSubmit={submitOrder}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Nom
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    E-mail
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="vous@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Téléphone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+225..."
                    autoComplete="tel"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Prestation
                  </label>

                  <select
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
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
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Montant estimé (FCFA)
                </label>

                <input
                  type="number"
                  min="1"
                  max="100000000"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Le montant sera vérifié côté serveur avant le paiement.
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Décrivez votre besoin
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="6"
                  maxLength="5000"
                  placeholder="Expliquez précisément ce que vous souhaitez..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {form.description.length}/5000
                </p>
              </div>

              <button
                type="submit"
                disabled={!authReady}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {authReady
                  ? "Créer ma commande"
                  : "Connexion sécurisée..."}

                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <LockKeyhole
                  className="text-emerald-400"
                  size={22}
                />

                <h3 className="font-bold">
                  Votre commande
                </h3>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">
                    Service
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedService?.title}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Montant
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {formatAmount(
                      form.amount
                    ) || "0"}{" "}
                    FCFA
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />

                    <p className="text-xs leading-5 text-slate-400">
                      Votre commande est associée à votre
                      session client. Les informations de
                      paiement sont traitées par notre
                      système de paiement sécurisé.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /*
   * COMMANDE EN COURS
   */
  function SubmittedOrderSection() {
    if (!submittedOrder) {
      return null;
    }

    return (
      <section
        id="commande"
        className="scroll-mt-24 py-8"
      >
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <CheckCircle2 size={25} />
              </div>

              <div>
                <p className="text-sm text-emerald-300">
                  Commande enregistrée
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {submittedOrder.orderNumber}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Votre commande peut maintenant être suivie.
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-center text-sm font-bold ${
                submittedOrder.paymentStatus ===
                "Payé"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-yellow-400/10 text-yellow-300"
              }`}
            >
              {submittedOrder.paymentStatus}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">
                Prestation
              </p>

              <p className="mt-1 font-semibold">
                {submittedOrder.serviceName}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">
                Code de suivi
              </p>

              <p className="mt-1 break-all font-semibold">
                {submittedOrder.trackingCode}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">
                Montant
              </p>

              <p className="mt-1 font-semibold">
                {formatAmount(
                  submittedOrder.amount
                )}{" "}
                FCFA
              </p>
            </div>
          </div>

          <div className="mt-6">
            {submittedOrder.paymentStatus ===
            "Payé" ? (
              <button
                type="button"
                onClick={
                  downloadInvoice
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
              >
                <Download size={18} />
                Télécharger mon reçu
              </button>
            ) : (
              <button
                type="button"
                onClick={startPayment}
                disabled={paymentLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CreditCard size={18} />

                {paymentLoading
                  ? "Préparation du paiement..."
                  : "Payer maintenant"}

                {!paymentLoading && (
                  <ArrowRight size={18} />
                )}
              </button>
            )}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-400"
            />

            <p className="text-xs leading-5 text-slate-400">
              Le statut de paiement est confirmé par le
              serveur. Il ne peut pas être simplement modifié
              depuis l'interface client.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * MES COMMANDES
   */
  function OrdersSection() {
    return (
      <section
        id="commandes"
        className="scroll-mt-24 py-10"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              ESPACE CLIENT
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Mes commandes
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Retrouvez ici vos commandes et leur évolution.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMyOrders}
            disabled={ordersLoading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold"
          >
            {ordersLoading
              ? "Actualisation..."
              : "Actualiser"}
          </button>
        </div>

        {ordersLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
            Chargement de vos commandes...
          </div>
        ) : myOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <ShoppingBag
              size={35}
              className="mx-auto text-slate-500"
            />

            <h3 className="mt-4 font-bold">
              Aucune commande
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Vos commandes apparaîtront ici.
            </p>

            <button
              type="button"
              onClick={() =>
                navigateTo("commander")
              }
              className="mt-5 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Commander une prestation
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myOrders.map(
              (order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSubmittedOrder({
                      orderNumber:
                        order.orderNumber,
                      trackingCode:
                        order.trackingCode,
                      documentId:
                        order.id,
                      amount:
                        order.amount,
                      name:
                        order.customerName,
                      email:
                        order.email,
                      phone:
                        order.phone,
                      serviceName:
                        order.serviceName,
                      description:
                        order.description,
                      paymentStatus:
                        order.paymentStatus,
                      status:
                        order.status,
                      createdAt:
                        order.createdAt,
                      deliveryUrl:
                        order.deliveryUrl ||
                        "",
                    });

                    navigateTo(
                      "commande"
                    );
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-emerald-400/30 hover:bg-white/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        {formatDate(
                          order.createdAt
                        )}
                      </p>

                      <h3 className="mt-1 font-bold">
                        {order.orderNumber}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {order.serviceName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-white/10 px-3 py-2 text-xs">
                        {order.status}
                      </span>

                      <span
                        className={`rounded-lg px-3 py-2 text-xs ${
                          order.paymentStatus ===
                          "Payé"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-yellow-400/10 text-yellow-300"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>

                      <ChevronRight
                        size={18}
                        className="text-slate-500"
                      />
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </section>
    );
  }

  /*
   * SUIVI
   */
  function TrackingSection() {
    return (
      <section
        id="suivi"
        className="scroll-mt-24 py-10"
      >
        <div className="mb-8">
          <p className="text-sm font-semibold text-emerald-400">
            SUIVI
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Suivre une commande
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Utilisez votre code de suivi pour consulter
            l'avancement de votre commande.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
              placeholder="Exemple : TRK-..."
              className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400/50"
            />

            <button
              type="submit"
              disabled={trackingLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              <Search size={18} />

              {trackingLoading
                ? "Recherche..."
                : "Rechercher"}
            </button>
          </form>

          {trackingResult && (
            <div className="mt-8">
              {!trackingResult.found ? (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">
                  {trackingResult.message}
                </div>
              ) : (
                <div>
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs text-slate-500">
                        Commande
                      </p>

                      <p className="mt-1 font-bold">
                        {
                          trackingResult.data
                            .orderNumber
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs text-slate-500">
                        Statut
                      </p>

                      <p className="mt-1 font-bold">
                        {
                          trackingResult.data
                            .status
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs text-slate-500">
                        Paiement
                      </p>

                      <p className="mt-1 font-bold">
                        {
                          trackingResult.data
                            .paymentStatus
                        }
                      </p>
                    </div>
                  </div>

                  {renderStatusTimeline(
                    trackingResult.data
                      .status
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  /*
   * SUPPORT
   */
  function SupportSection() {
    return (
      <section
        id="support"
        className="scroll-mt-24 py-10"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-7 md:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <Headphones size={24} />
          </div>

          <h2 className="mt-5 text-3xl font-bold">
            Besoin d'aide ?
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Pour une question concernant une commande,
            un paiement ou une livraison, utilisez votre
            numéro de commande et votre code de suivi afin
            de faciliter le traitement de votre demande.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
              <Receipt
                size={20}
                className="text-emerald-400"
              />

              <p className="mt-3 font-semibold">
                Commande
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Gardez votre numéro de commande.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
              <Search
                size={20}
                className="text-emerald-400"
              />

              <p className="mt-3 font-semibold">
                Suivi
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Utilisez votre code de suivi.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
              <ShieldCheck
                size={20}
                className="text-emerald-400"
              />

              <p className="mt-3 font-semibold">
                Paiement
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Le paiement est vérifié côté serveur.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /*
   * FOOTER
   */
  function Footer() {
    return (
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Prestations Online
          </p>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} />
            Paiements et données protégés
          </div>
        </div>
      </footer>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4">
        {errorMessage && (
          <div className="sticky top-[73px] z-40 mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300 backdrop-blur">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="sticky top-[73px] z-40 mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-300 backdrop-blur">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          </div>
        )}

        {invoiceLoading && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
            Récupération sécurisée de votre commande...
          </div>
        )}

        <HomeSection />

        <SubmittedOrderSection />

        <OrderSection />

        <OrdersSection />

        <TrackingSection />

        <SupportSection />
      </main>

      <Footer />
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
