import React, { useEffect, useMemo, useState } from "react";
import Admin from "./Admin.jsx";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileText,
  Globe,
  Home,
  Loader2,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Phone,
  PlayCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
} from "lucide-react";

import {
  auth,
  db,
  signInAnonymously,
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "./firebase-storage.js";

const SERVICES = [
  {
    id: "site-web",
    name: "Création de site web",
    price: 50000,
    icon: Globe,
    description:
      "Création d'un site web professionnel adapté à votre activité.",
  },
  {
    id: "design",
    name: "Design graphique",
    price: 15000,
    icon: Sparkles,
    description:
      "Création de visuels professionnels pour votre entreprise ou projet.",
  },
  {
    id: "video",
    name: "Montage vidéo",
    price: 20000,
    icon: PlayCircle,
    description:
      "Montage vidéo professionnel pour publicité, réseaux sociaux ou présentation.",
  },
  {
    id: "reseaux",
    name: "Gestion réseaux sociaux",
    price: 30000,
    icon: MessageCircle,
    description:
      "Création et organisation de contenus pour vos réseaux sociaux.",
  },
  {
    id: "autre",
    name: "Autre prestation",
    price: 0,
    icon: Package,
    description:
      "Décrivez votre besoin et nous étudierons votre demande.",
  },
];

const STATUS_STEPS = [
  "Reçue",
  "Acceptée",
  "En cours",
  "Livrée",
  "Terminée",
];

function formatPrice(value) {
  const number = Number(value || 0);

  if (!number) {
    return "Sur devis";
  }

  return `${number.toLocaleString("fr-FR")} FCFA`;
}

function generateOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `CMD-${year}${month}${day}-${random}`;
}

function generateTrackingCode() {
  const random = Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");

  return `TRK-${random.toUpperCase()}`;
}

function normalizeDropboxLink(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("dropbox.com")) {
      parsed.searchParams.set("dl", "1");
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
}

function ProfessionalHeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />

      <div className="hero-dashboard">
        <div className="hero-dashboard-top">
          <div className="hero-dot" />
          <div className="hero-dot" />
          <div className="hero-dot" />
        </div>

        <div className="hero-dashboard-content">
          <div className="hero-mini-card">
            <div className="hero-mini-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>Prestation</strong>
              <span>En cours</span>
            </div>
          </div>

          <div className="hero-progress">
            <div />
          </div>

          <div className="hero-mini-row">
            <span>Commande</span>
            <strong>CMD-ONLINE</strong>
          </div>

          <div className="hero-mini-row">
            <span>Paiement</span>
            <strong className="hero-paid">Sécurisé</strong>
          </div>
        </div>
      </div>

      <div className="hero-floating-card hero-floating-card-one">
        <CheckCircle2 size={20} />
        <span>Commande reçue</span>
      </div>

      <div className="hero-floating-card hero-floating-card-two">
        <ShieldCheck size={20} />
        <span>Paiement sécurisé</span>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("home");

  const [services] = useState(SERVICES);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [selectedService, setSelectedService] = useState(null);

  const [lastOrder, setLastOrder] = useState(null);

  const [tracking, setTracking] = useState(null);

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingOrderNumber, setTrackingOrderNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [error, setError] = useState("");
  const [trackingError, setTrackingError] = useState("");

  const [copied, setCopied] = useState("");

  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    serviceId: "",
    amount: "",
    description: "",
    paymentMethod: "Mobile Money",
  });

  const isAdminPage =
    window.location.pathname === "/admin" ||
    window.location.hash === "#admin";

  useEffect(() => {
    if (isAdminPage) {
      setPage("admin");
    }
  }, [isAdminPage]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erreur authentification anonyme:", err);
      }
    };

    initAuth();
  }, []);

  const selectedServiceObject = useMemo(() => {
    return services.find((service) => service.id === form.serviceId);
  }, [services, form.serviceId]);

  function goHome() {
    setPage("home");
    setSelectedService(null);
    setError("");
    setTrackingError("");
    setMobileMenu(false);
  }

  function goToServices() {
    setPage("services");
    setMobileMenu(false);

    setTimeout(() => {
      document
        .getElementById("services")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function selectService(service) {
    setSelectedService(service);

    setForm((previous) => ({
      ...previous,
      serviceId: service.id,
      amount: service.price || "",
    }));

    setError("");
    setPage("order");
    setMobileMenu(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();

    setError("");

    if (!form.clientName.trim()) {
      setError("Veuillez renseigner votre nom.");
      return;
    }

    if (!form.email.trim()) {
      setError("Veuillez renseigner votre adresse email.");
      return;
    }

    if (!form.serviceId) {
      setError("Veuillez choisir une prestation.");
      return;
    }

    if (!form.description.trim()) {
      setError("Veuillez décrire votre besoin.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError(
        "Veuillez renseigner un montant valide pour cette prestation."
      );
      return;
    }

    setLoading(true);

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const clientId = auth.currentUser.uid;

      const orderNumber = generateOrderNumber();
      const trackingCode = generateTrackingCode();

      const service = services.find(
        (item) => item.id === form.serviceId
      );

      if (!service) {
        throw new Error("Prestation introuvable.");
      }

      const orderId = doc(collection(db, "orders")).id;

      const order = {
        id: orderId,
        orderNumber,
        trackingCode,

        clientId,

        clientName: form.clientName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),

        serviceId: service.id,
        serviceName: service.name,

        amount: Number(form.amount),

        description: form.description.trim(),

        paymentMethod: form.paymentMethod,

        status: "Reçue",
        paymentStatus: "Non payé",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderRef = doc(db, "orders", orderId);

      await setDoc(orderRef, order);

      const trackingRef = doc(db, "tracking", trackingCode);

      await setDoc(trackingRef, {
        orderNumber,
        trackingCode,
        serviceName: service.name,
        amount: Number(form.amount),

        status: "Reçue",
        paymentStatus: "Non payé",

        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      /*
       * Création de la facture PayDunya.
       *
       * Les clés PayDunya restent sur le serveur Render.
       * Elles ne sont jamais placées dans App.jsx.
       */
      const paymentResponse = await fetch(
        "https://plateforme-prestation-d-ploiement.onrender.com/api/paydunya/create-invoice",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            orderNumber,
            amount: Number(form.amount),
            description: form.description.trim(),
            name: form.clientName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }),
        }
      );

      let paymentData = null;

      try {
        paymentData = await paymentResponse.json();
      } catch {
        paymentData = null;
      }

      if (!paymentResponse.ok || !paymentData?.ok) {
        throw new Error(
          paymentData?.message ||
            "Impossible de créer le paiement PayDunya."
        );
      }

      if (!paymentData.paymentUrl) {
        throw new Error(
          "PayDunya n'a pas retourné de lien de paiement."
        );
      }

      /*
       * On garde temporairement les informations de commande
       * avant de rediriger le client vers PayDunya.
       */
      const displayOrder = {
        ...order,
        createdAt: new Date().toISOString(),
      };

      setLastOrder(displayOrder);

      /*
       * Redirection vers la page de paiement PayDunya.
       */
      window.location.href = paymentData.paymentUrl;

      return;
    } catch (err) {
      console.error("Erreur création commande/paiement:", err);

      setError(
        err?.message ||
          "Une erreur est survenue pendant la création de votre commande."
      );
    } finally {
      setLoading(false);
    }
  }

  async function trackOrder(event) {
    event?.preventDefault();

    setTrackingError("");
    setTracking(null);

    if (!trackingCode.trim()) {
      setTrackingError("Veuillez renseigner votre code de suivi.");
      return;
    }

    if (!trackingOrderNumber.trim()) {
      setTrackingError("Veuillez renseigner votre numéro de commande.");
      return;
    }

    setTrackingLoading(true);

    try {
      const cleanTrackingCode = trackingCode.trim().toUpperCase();
      const cleanOrderNumber =
        trackingOrderNumber.trim().toUpperCase();

      const trackingRef = doc(
        db,
        "tracking",
        cleanTrackingCode
      );

      const snapshot = await getDoc(trackingRef);

      if (!snapshot.exists()) {
        throw new Error(
          "Aucune commande ne correspond à ce code de suivi."
        );
      }

      const data = snapshot.data();

      if (
        String(data.orderNumber || "").toUpperCase() !==
        cleanOrderNumber
      ) {
        throw new Error(
          "Le numéro de commande ne correspond pas au code de suivi."
        );
      }

      setTracking({
        ...data,
        trackingCode: cleanTrackingCode,
      });

      setPage("tracking");
    } catch (err) {
      console.error("Erreur suivi:", err);

      setTrackingError(
        err?.message ||
          "Impossible de récupérer le suivi de votre commande."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  async function copyText(text, type) {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(type);

      setTimeout(() => {
        setCopied("");
      }, 2000);
    } catch (err) {
      console.error("Copie impossible:", err);
    }
  }

  function openTracking() {
    setTracking(null);
    setTrackingError("");
    setPage("track");
    setMobileMenu(false);
  }

  function openOrder(service = null) {
    if (service) {
      selectService(service);
      return;
    }

    setSelectedService(null);

    setForm((previous) => ({
      ...previous,
      serviceId: "",
      amount: "",
    }));

    setPage("order");
    setMobileMenu(false);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (page === "admin") {
    return <Admin />;
  }

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          background: #f7f9fc;
          color: #172033;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.08),
              transparent 32%
            ),
            #f7f9fc;
        }

        .container {
          width: min(1160px, calc(100% - 32px));
          margin: 0 auto;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid #e7ebf2;
        }

        .nav-inner {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          font-weight: 800;
          font-size: 19px;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.22);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 26px;
        }

        .nav-button {
          border: 0;
          background: transparent;
          color: #526078;
          font-weight: 600;
        }

        .nav-button:hover {
          color: #2563eb;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .primary-button,
        .secondary-button {
          border: 0;
          border-radius: 12px;
          min-height: 46px;
          padding: 0 18px;
          font-weight: 750;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s ease;
        }

        .primary-button {
          color: white;
          background: #2563eb;
          box-shadow: 0 9px 20px rgba(37, 99, 235, 0.2);
        }

        .primary-button:hover {
          transform: translateY(-1px);
          background: #1d4ed8;
        }

        .secondary-button {
          color: #1f2937;
          background: white;
          border: 1px solid #dbe2ec;
        }

        .secondary-button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .menu-button {
          display: none;
          border: 0;
          background: transparent;
          width: 42px;
          height: 42px;
        }

        .hero {
          padding: 78px 0 80px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 50px;
          align-items: center;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2563eb;
          font-weight: 800;
          font-size: 14px;
          margin-bottom: 17px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(40px, 6vw, 66px);
          line-height: 1.02;
          letter-spacing: -2.8px;
          color: #101828;
        }

        .hero h1 span {
          color: #2563eb;
        }

        .hero-text {
          max-width: 650px;
          margin: 23px 0 28px;
          color: #5c687d;
          font-size: 18px;
          line-height: 1.7;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .trust-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 26px;
          color: #5d697c;
          font-size: 14px;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .trust-item svg {
          color: #16a34a;
        }

        .hero-visual {
          position: relative;
          min-height: 430px;
          display: grid;
          place-items: center;
        }

        .hero-dashboard {
          position: relative;
          z-index: 2;
          width: min(390px, 90%);
          border-radius: 24px;
          background: white;
          border: 1px solid #e5eaf1;
          box-shadow: 0 30px 70px rgba(26, 44, 77, 0.15);
          overflow: hidden;
        }

        .hero-dashboard-top {
          height: 48px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 17px;
          background: #f7f9fc;
          border-bottom: 1px solid #edf0f5;
        }

        .hero-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #cbd5e1;
        }

        .hero-dashboard-content {
          padding: 26px;
        }

        .hero-mini-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px;
          border: 1px solid #e7ecf3;
          border-radius: 16px;
        }

        .hero-mini-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          color: #2563eb;
          background: #eff6ff;
          border-radius: 12px;
        }

        .hero-mini-card strong,
        .hero-mini-card span {
          display: block;
        }

        .hero-mini-card span {
          color: #718096;
          margin-top: 3px;
          font-size: 13px;
        }

        .hero-progress {
          height: 9px;
          background: #edf1f6;
          border-radius: 99px;
          overflow: hidden;
          margin: 25px 0;
        }

        .hero-progress div {
          width: 68%;
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #7c3aed);
          border-radius: inherit;
        }

        .hero-mini-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 15px 0;
          border-bottom: 1px solid #eef1f5;
          font-size: 14px;
        }

        .hero-mini-row span {
          color: #718096;
        }

        .hero-paid {
          color: #16a34a;
        }

        .hero-floating-card {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 13px 15px;
          border-radius: 14px;
          box-shadow: 0 15px 35px rgba(26, 44, 77, 0.14);
          border: 1px solid #e8edf3;
          font-size: 13px;
          font-weight: 700;
        }

        .hero-floating-card svg {
          color: #2563eb;
        }

        .hero-floating-card-one {
          top: 54px;
          left: 0;
        }

        .hero-floating-card-two {
          right: 0;
          bottom: 54px;
        }

        .hero-orbit {
          position: absolute;
          border: 1px solid rgba(37, 99, 235, 0.13);
          border-radius: 50%;
        }

        .hero-orbit-one {
          width: 440px;
          height: 440px;
        }

        .hero-orbit-two {
          width: 300px;
          height: 300px;
        }

        .section {
          padding: 78px 0;
        }

        .section-white {
          background: white;
        }

        .section-heading {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 42px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 44px);
          letter-spacing: -1.5px;
          color: #111827;
        }

        .section-heading p {
          margin: 13px auto 0;
          color: #667085;
          line-height: 1.7;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 17px;
        }

        .service-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 18px;
          padding: 23px;
          transition: 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .service-card:hover {
          transform: translateY(-3px);
          border-color: #cbdcff;
          box-shadow: 0 15px 30px rgba(26, 44, 77, 0.07);
        }

        .service-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
          margin-bottom: 19px;
        }

        .service-card h3 {
          margin: 0;
          font-size: 18px;
        }

        .service-card p {
          color: #6b7280;
          line-height: 1.6;
          font-size: 14px;
          min-height: 68px;
        }

        .service-price {
          margin-top: auto;
          margin-bottom: 17px;
          font-weight: 800;
          color: #111827;
        }

        .service-card .primary-button {
          width: 100%;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .step {
          text-align: center;
          padding: 22px;
        }

        .step-number {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: 0 auto 15px;
          color: white;
          background: #2563eb;
          font-weight: 800;
        }

        .step h3 {
          margin: 0 0 9px;
        }

        .step p {
          color: #687386;
          line-height: 1.6;
          font-size: 14px;
        }

        .track-box {
          max-width: 700px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e4e9f0;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 20px 45px rgba(26, 44, 77, 0.06);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 17px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 700;
          font-size: 14px;
          color: #374151;
        }

        .input,
        .textarea,
        .select {
          width: 100%;
          border: 1px solid #d9e0e9;
          border-radius: 11px;
          min-height: 48px;
          padding: 0 14px;
          background: white;
          color: #111827;
          outline: none;
        }

        .textarea {
          padding: 13px 14px;
          min-height: 130px;
          resize: vertical;
        }

        .input:focus,
        .textarea:focus,
        .select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.09);
        }

        .error-box {
          margin-bottom: 18px;
          padding: 13px 15px;
          border-radius: 11px;
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          font-size: 14px;
        }

        .info-box {
          padding: 15px;
          border-radius: 12px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #1e40af;
          font-size: 14px;
          line-height: 1.6;
        }

        .order-layout {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 25px;
          align-items: start;
        }

        .panel {
          background: white;
          border: 1px solid #e3e8f0;
          border-radius: 20px;
          padding: 27px;
          box-shadow: 0 15px 35px rgba(26, 44, 77, 0.05);
        }

        .panel h2 {
          margin-top: 0;
        }

        .summary-card {
          position: sticky;
          top: 95px;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid #edf0f4;
          font-size: 14px;
        }

        .summary-line span {
          color: #667085;
        }

        .summary-total {
          padding-top: 18px;
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          font-weight: 800;
        }

        .success-page,
        .tracking-page {
          min-height: calc(100vh - 72px);
          padding: 70px 0;
        }

        .success-card,
        .tracking-card {
          max-width: 760px;
          margin: 0 auto;
          background: white;
          border: 1px solid #e3e8f0;
          border-radius: 24px;
          padding: 35px;
          text-align: center;
          box-shadow: 0 25px 55px rgba(26, 44, 77, 0.08);
        }

        .success-icon {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          border-radius: 50%;
          color: #15803d;
          background: #dcfce7;
        }

        .code-box {
          margin: 14px 0;
          padding: 17px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          text-align: left;
        }

        .code-label {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .code-value {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-weight: 800;
          word-break: break-all;
        }

        .copy-button {
          border: 1px solid #dce3ec;
          background: white;
          border-radius: 9px;
          padding: 7px 10px;
          color: #2563eb;
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .tracking-status {
          margin: 28px 0;
          text-align: left;
        }

        .status-step {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          padding: 12px 0;
        }

        .status-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e5e7eb;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .status-step.active .status-dot {
          background: #2563eb;
          color: white;
        }

        .status-step.done .status-dot {
          background: #16a34a;
          color: white;
        }

        .status-step strong {
          display: block;
        }

        .status-step span {
          color: #667085;
          font-size: 13px;
        }

        .payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 13px;
          border-radius: 99px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 13px;
          font-weight: 750;
        }

        .payment-badge.paid {
          background: #dcfce7;
          color: #15803d;
        }

        .download-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
          padding: 12px 17px;
          border-radius: 11px;
          background: #16a34a;
          color: white;
          font-weight: 750;
        }

        .page-header {
          padding: 55px 0 30px;
        }

        .page-header h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 48px);
          letter-spacing: -1.5px;
        }

        .page-header p {
          color: #667085;
          line-height: 1.7;
          max-width: 700px;
        }

        .footer {
          padding: 38px 0;
          background: #101828;
          color: #d0d5dd;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .footer-brand {
          color: white;
          font-weight: 800;
        }

        .footer-small {
          font-size: 13px;
          color: #98a2b3;
        }

        @media (max-width: 900px) {
          .nav-links,
          .nav-actions {
            display: none;
          }

          .menu-button {
            display: grid;
            place-items: center;
          }

          .mobile-menu {
            padding: 12px 0 18px;
            border-top: 1px solid #edf0f4;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .mobile-menu button {
            border: 0;
            background: transparent;
            text-align: left;
            padding: 11px 0;
            font-weight: 700;
          }

          .hero-grid,
          .order-layout {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 50px;
          }

          .hero-visual {
            min-height: 380px;
          }

          .service-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .steps {
            grid-template-columns: repeat(2, 1fr);
          }

          .summary-card {
            position: static;
          }
        }

        @media (max-width: 600px) {
          .container {
            width: min(100% - 22px, 1160px);
          }

          .hero h1 {
            letter-spacing: -1.8px;
          }

          .hero-text {
            font-size: 16px;
          }

          .hero-buttons {
            flex-direction: column;
          }

          .hero-buttons button {
            width: 100%;
          }

          .hero-visual {
            min-height: 320px;
          }

          .hero-dashboard {
            width: 94%;
          }

          .hero-floating-card {
            font-size: 11px;
            padding: 10px;
          }

          .hero-floating-card-one {
            left: -4px;
            top: 30px;
          }

          .hero-floating-card-two {
            right: -4px;
            bottom: 25px;
          }

          .hero-orbit-one {
            width: 330px;
            height: 330px;
          }

          .hero-orbit-two {
            width: 230px;
            height: 230px;
          }

          .service-grid,
          .steps,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full {
            grid-column: auto;
          }

          .panel,
          .track-box,
          .success-card,
          .tracking-card {
            padding: 21px;
          }

          .footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .code-value {
            flex-direction: column;
            align-items: flex-start;
          }

          .copy-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <header className="navbar">
        <div className="container nav-inner">
          <button
            className="brand"
            onClick={goHome}
            style={{ border: 0, background: "transparent" }}
          >
            <span className="brand-icon">
              <Sparkles size={21} />
            </span>

            <span>Prestations Online</span>
          </button>

          <nav className="nav-links">
            <button className="nav-button" onClick={goHome}>
              Accueil
            </button>

            <button className="nav-button" onClick={goToServices}>
              Prestations
            </button>

            <button className="nav-button" onClick={openTracking}>
              Suivre une commande
            </button>
          </nav>

          <div className="nav-actions">
            <button
              className="secondary-button"
              onClick={openTracking}
            >
              <Search size={17} />
              Suivre
            </button>

            <button
              className="primary-button"
              onClick={() => openOrder()}
            >
              Commander
            </button>
          </div>

          <button
            className="menu-button"
            onClick={() => setMobileMenu((value) => !value)}
            aria-label="Menu"
          >
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="container mobile-menu">
            <button onClick={goHome}>Accueil</button>
            <button onClick={goToServices}>Prestations</button>
            <button onClick={openTracking}>
              Suivre une commande
            </button>
            <button onClick={() => openOrder()}>
              Passer une commande
            </button>
          </div>
        )}
      </header>

      {page === "home" && (
        <>
          <section className="hero">
            <div className="container hero-grid">
              <div>
                <div className="eyebrow">
                  <Sparkles size={17} />
                  Prestations numériques en ligne
                </div>

                <h1>
                  Donnez vie à vos projets{" "}
                  <span>en ligne.</span>
                </h1>

                <p className="hero-text">
                  Commandez une prestation numérique, recevez votre
                  numéro de commande et suivez son avancement en ligne.
                  Le paiement est effectué sur une page sécurisée
                  PayDunya.
                </p>

                <div className="hero-buttons">
                  <button
                    className="primary-button"
                    onClick={() => openOrder()}
                  >
                    Commander une prestation
                    <ArrowRight size={18} />
                  </button>

                  <button
                    className="secondary-button"
                    onClick={goToServices}
                  >
                    Voir les prestations
                  </button>
                </div>

                <div className="trust-row">
                  <div className="trust-item">
                    <ShieldCheck size={17} />
                    Paiement sécurisé
                  </div>

                  <div className="trust-item">
                    <CheckCircle2 size={17} />
                    Suivi de commande
                  </div>

                  <div className="trust-item">
                    <Package size={17} />
                    Livraison numérique
                  </div>
                </div>
              </div>

              <ProfessionalHeroVisual />
            </div>
          </section>

          <section
            className="section section-white"
            id="services"
          >
            <div className="container">
              <div className="section-heading">
                <div className="eyebrow">
                  <Sparkles size={16} />
                  Nos prestations
                </div>

                <h2>Choisissez le service dont vous avez besoin</h2>

                <p>
                  Sélectionnez une prestation, expliquez votre besoin
                  et envoyez votre commande.
                </p>
              </div>

              <div className="service-grid">
                {services.map((service) => {
                  const Icon = service.icon;

                  return (
                    <div className="service-card" key={service.id}>
                      <div className="service-icon">
                        <Icon size={23} />
                      </div>

                      <h3>{service.name}</h3>

                      <p>{service.description}</p>

                      <div className="service-price">
                        {service.price
                          ? formatPrice(service.price)
                          : "Sur devis"}
                      </div>

                      <button
                        className="primary-button"
                        onClick={() => selectService(service)}
                      >
                        Commander
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="section-heading">
                <div className="eyebrow">
                  <CheckCircle2 size={16} />
                  Fonctionnement
                </div>

                <h2>Une commande simple à suivre</h2>

                <p>
                  Chaque commande possède un numéro et un code de suivi
                  uniques.
                </p>
              </div>

              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <h3>Commandez</h3>
                  <p>
                    Remplissez le formulaire et décrivez précisément
                    votre besoin.
                  </p>
                </div>

                <div className="step">
                  <div className="step-number">2</div>
                  <h3>Payez</h3>
                  <p>
                    Vous êtes redirigé vers PayDunya pour effectuer le
                    paiement.
                  </p>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <h3>Suivez</h3>
                  <p>
                    Utilisez votre numéro de commande et votre code de
                    suivi.
                  </p>
                </div>

                <div className="step">
                  <div className="step-number">4</div>
                  <h3>Recevez</h3>
                  <p>
                    Lorsque la prestation est livrée, le lien de
                    téléchargement apparaît dans le suivi.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="section section-white">
            <div className="container">
              <div className="track-box">
                <div className="section-heading" style={{ marginBottom: 25 }}>
                  <div className="eyebrow">
                    <Search size={16} />
                    Suivi
                  </div>

                  <h2 style={{ fontSize: 30 }}>
                    Où en est votre commande ?
                  </h2>

                  <p>
                    Retrouvez l'état de votre commande avec votre numéro
                    et votre code de suivi.
                  </p>
                </div>

                <button
                  className="primary-button"
                  style={{ width: "100%" }}
                  onClick={openTracking}
                >
                  Suivre ma commande
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {page === "services" && (
        <>
          <section className="page-header">
            <div className="container">
              <div className="eyebrow">
                <Sparkles size={17} />
                Prestations
              </div>

              <h1>Nos prestations numériques</h1>

              <p>
                Choisissez le service qui correspond à votre besoin et
                commencez votre commande.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="service-grid">
                {services.map((service) => {
                  const Icon = service.icon;

                  return (
                    <div className="service-card" key={service.id}>
                      <div className="service-icon">
                        <Icon size={23} />
                      </div>

                      <h3>{service.name}</h3>

                      <p>{service.description}</p>

                      <div className="service-price">
                        {service.price
                          ? formatPrice(service.price)
                          : "Sur devis"}
                      </div>

                      <button
                        className="primary-button"
                        onClick={() => selectService(service)}
                      >
                        Commander
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {page === "order" && (
        <section className="section">
          <div className="container">
            <button
              className="secondary-button"
              onClick={goHome}
              style={{ marginBottom: 22 }}
            >
              <ArrowLeft size={17} />
              Retour
            </button>

            <div className="order-layout">
              <div className="panel">
                <h2>Passer une commande</h2>

                <p style={{ color: "#667085", lineHeight: 1.6 }}>
                  Renseignez les informations nécessaires pour traiter
                  votre demande.
                </p>

                {error && (
                  <div className="error-box">
                    {error}
                  </div>
                )}

                <form onSubmit={submitOrder}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="clientName">
                        Nom complet
                      </label>

                      <div style={{ position: "relative" }}>
                        <User
                          size={17}
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 15,
                            color: "#94a3b8",
                          }}
                        />

                        <input
                          id="clientName"
                          className="input"
                          style={{ paddingLeft: 42 }}
                          value={form.clientName}
                          onChange={(event) =>
                            updateForm(
                              "clientName",
                              event.target.value
                            )
                          }
                          placeholder="Votre nom complet"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email</label>

                      <div style={{ position: "relative" }}>
                        <Mail
                          size={17}
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 15,
                            color: "#94a3b8",
                          }}
                        />

                        <input
                          id="email"
                          type="email"
                          className="input"
                          style={{ paddingLeft: 42 }}
                          value={form.email}
                          onChange={(event) =>
                            updateForm(
                              "email",
                              event.target.value
                            )
                          }
                          placeholder="vous@exemple.com"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">
                        Téléphone
                      </label>

                      <div style={{ position: "relative" }}>
                        <Phone
                          size={17}
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 15,
                            color: "#94a3b8",
                          }}
                        />

                        <input
                          id="phone"
                          className="input"
                          style={{ paddingLeft: 42 }}
                          value={form.phone}
                          onChange={(event) =>
                            updateForm(
                              "phone",
                              event.target.value
                            )
                          }
                          placeholder="+225 ..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="service">
                        Prestation
                      </label>

                      <select
                        id="service"
                        className="select"
                        value={form.serviceId}
                        onChange={(event) => {
                          const serviceId =
                            event.target.value;

                          const service = services.find(
                            (item) => item.id === serviceId
                          );

                          updateForm("serviceId", serviceId);

                          if (service?.price) {
                            updateForm(
                              "amount",
                              service.price
                            );
                          }
                        }}
                      >
                        <option value="">
                          Choisir une prestation
                        </option>

                        {services.map((service) => (
                          <option
                            value={service.id}
                            key={service.id}
                          >
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="amount">
                        Montant
                      </label>

                      <input
                        id="amount"
                        type="number"
                        min="1"
                        className="input"
                        value={form.amount}
                        onChange={(event) =>
                          updateForm(
                            "amount",
                            event.target.value
                          )
                        }
                        placeholder="Montant en FCFA"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="paymentMethod">
                        Mode de paiement
                      </label>

                      <select
                        id="paymentMethod"
                        className="select"
                        value={form.paymentMethod}
                        onChange={(event) =>
                          updateForm(
                            "paymentMethod",
                            event.target.value
                          )
                        }
                      >
                        <option>
                          Mobile Money
                        </option>
                        <option>
                          Carte bancaire
                        </option>
                        <option>
                          Autre moyen PayDunya
                        </option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label htmlFor="description">
                        Description de votre besoin
                      </label>

                      <textarea
                        id="description"
                        className="textarea"
                        value={form.description}
                        onChange={(event) =>
                          updateForm(
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Expliquez ce que vous souhaitez obtenir, les éléments importants, le format souhaité, etc."
                      />
                    </div>

                    <div className="form-group full">
                      <div className="info-box">
                        <strong>
                          Paiement sécurisé
                        </strong>
                        <br />
                        Après l'envoi de la commande, vous serez
                        redirigé vers PayDunya pour effectuer le
                        paiement. Les informations secrètes de
                        paiement restent sur notre serveur.
                      </div>
                    </div>

                    <div className="form-group full">
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                        style={{
                          width: "100%",
                          minHeight: 52,
                        }}
                      >
                        {loading ? (
                          <>
                            <Loader2
                              size={19}
                              className="spin"
                            />
                            Préparation du paiement...
                          </>
                        ) : (
                          <>
                            <CreditCard size={19} />
                            Envoyer la commande et payer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="panel summary-card">
                <h3>Résumé</h3>

                <div className="summary-line">
                  <span>Prestation</span>
                  <strong>
                    {selectedServiceObject?.name ||
                      serviceForForm(
                        services,
                        form.serviceId
                      ) ||
                      "Non sélectionnée"}
                  </strong>
                </div>

                <div className="summary-line">
                  <span>Paiement</span>
                  <strong>
                    {form.paymentMethod}
                  </strong>
                </div>

                <div className="summary-line">
                  <span>Statut initial</span>
                  <strong>Reçue</strong>
                </div>

                <div className="summary-total">
                  <span>Total</span>
                  <span>
                    {formatPrice(form.amount)}
                  </span>
                </div>

                <div
                  className="info-box"
                  style={{ marginTop: 20 }}
                >
                  Vous recevrez un numéro de commande et un code de
                  suivi après la création de votre commande.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "track" && (
        <section className="section">
          <div className="container">
            <div className="track-box">
              <div className="section-heading">
                <div className="eyebrow">
                  <Search size={17} />
                  Suivi de commande
                </div>

                <h2>Retrouver votre commande</h2>

                <p>
                  Entrez votre numéro de commande et votre code de
                  suivi.
                </p>
              </div>

              {trackingError && (
                <div className="error-box">
                  {trackingError}
                </div>
              )}

              <form onSubmit={trackOrder}>
                <div className="form-group">
                  <label htmlFor="trackingOrderNumber">
                    Numéro de commande
                  </label>

                  <input
                    id="trackingOrderNumber"
                    className="input"
                    value={trackingOrderNumber}
                    onChange={(event) =>
                      setTrackingOrderNumber(
                        event.target.value
                      )
                    }
                    placeholder="Ex. CMD-20260927-ABC123"
                  />
                </div>

                <div
                  className="form-group"
                  style={{ marginTop: 17 }}
                >
                  <label htmlFor="trackingCode">
                    Code de suivi
                  </label>

                  <input
                    id="trackingCode"
                    className="input"
                    value={trackingCode}
                    onChange={(event) =>
                      setTrackingCode(
                        event.target.value
                      )
                    }
                    placeholder="Ex. TRK-..."
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={trackingLoading}
                  style={{
                    width: "100%",
                    marginTop: 20,
                  }}
                >
                  {trackingLoading ? (
                    <>
                      <Loader2 size={18} />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Rechercher
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {page === "success" && lastOrder && (
        <section className="success-page">
          <div className="container">
            <div className="success-card">
              <div className="success-icon">
                <CheckCircle2 size={38} />
              </div>

              <h1>Commande enregistrée</h1>

              <p
                style={{
                  color: "#667085",
                  lineHeight: 1.7,
                }}
              >
                Votre commande a été enregistrée. Vous pouvez
                conserver les informations ci-dessous pour suivre
                votre commande.
              </p>

              <div className="code-box">
                <span className="code-label">
                  Numéro de commande
                </span>

                <div className="code-value">
                  <span>{lastOrder.orderNumber}</span>

                  <button
                    className="copy-button"
                    onClick={() =>
                      copyText(
                        lastOrder.orderNumber,
                        "order"
                      )
                    }
                  >
                    <Clipboard size={15} />

                    {copied === "order"
                      ? "Copié"
                      : "Copier"}
                  </button>
                </div>
              </div>

              <div className="code-box">
                <span className="code-label">
                  Code de suivi
                </span>

                <div className="code-value">
                  <span>{lastOrder.trackingCode}</span>

                  <button
                    className="copy-button"
                    onClick={() =>
                      copyText(
                        lastOrder.trackingCode,
                        "tracking"
                      )
                    }
                  >
                    <Clipboard size={15} />

                    {copied === "tracking"
                      ? "Copié"
                      : "Copier"}
                  </button>
                </div>
              </div>

              <div
                className="info-box"
                style={{ marginTop: 20, textAlign: "left" }}
              >
                <strong>Paiement</strong>
                <br />
                Votre commande est enregistrée avec le statut
                « Non payé ». Le paiement est effectué sur la page
                sécurisée PayDunya.
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 25,
                  justifyContent: "center",
                }}
              >
                <button
                  className="primary-button"
                  onClick={openTracking}
                >
                  Suivre ma commande
                  <ArrowRight size={17} />
                </button>

                <button
                  className="secondary-button"
                  onClick={goHome}
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "tracking" && tracking && (
        <section className="tracking-page">
          <div className="container">
            <div className="tracking-card">
              <div className="eyebrow">
                <Package size={17} />
                Suivi de commande
              </div>

              <h1>
                {tracking.serviceName}
              </h1>

              <p
                style={{
                  color: "#667085",
                  lineHeight: 1.7,
                }}
              >
                Commande :{" "}
                <strong>
                  {tracking.orderNumber}
                </strong>
              </p>

              <div className="tracking-status">
                {STATUS_STEPS.map((status, index) => {
                  const currentIndex =
                    STATUS_STEPS.indexOf(
                      tracking.status
                    );

                  const isDone =
                    currentIndex >= 0 &&
                    index < currentIndex;

                  const isActive =
                    status === tracking.status;

                  return (
                    <div
                      className={`status-step ${
                        isDone ? "done" : ""
                      } ${isActive ? "active" : ""}`}
                      key={status}
                    >
                      <div className="status-dot">
                        {isDone ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div>
                        <strong>{status}</strong>

                        {isActive && (
                          <span>
                            Étape actuelle de votre commande
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <div
                  className={`payment-badge ${
                    tracking.paymentStatus === "Payé"
                      ? "paid"
                      : ""
                  }`}
                >
                  {tracking.paymentStatus === "Payé" ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <CreditCard size={15} />
                  )}

                  Paiement :{" "}
                  {tracking.paymentStatus || "Non payé"}
                </div>
              </div>

              {tracking.deliveryUrl && (
                <div>
                  <p
                    style={{
                      color: "#667085",
                      lineHeight: 1.6,
                    }}
                  >
                    Votre fichier est disponible.
                  </p>

                  <a
                    className="download-button"
                    href={normalizeDropboxLink(
                      tracking.deliveryUrl
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={18} />
                    Télécharger ma livraison
                  </a>
                </div>
              )}

              {!tracking.deliveryUrl &&
                tracking.status === "Livrée" && (
                  <div
                    className="info-box"
                    style={{ marginTop: 18 }}
                  >
                    Votre prestation est indiquée comme livrée.
                    Le lien de téléchargement sera affiché dès
                    qu'il sera disponible.
                  </div>
                )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "center",
                  marginTop: 28,
                }}
              >
                <button
                  className="secondary-button"
                  onClick={openTracking}
                >
                  <Search size={17} />
                  Nouvelle recherche
                </button>

                <button
                  className="secondary-button"
                  onClick={goHome}
                >
                  <Home size={17} />
                  Accueil
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <div className="footer-brand">
              Prestations Online
            </div>

            <div className="footer-small">
              Prestations numériques en ligne
            </div>
          </div>

          <div className="footer-small">
            Commande • Paiement • Suivi • Livraison
          </div>
        </div>
      </footer>
    </div>
  );
}

function serviceForForm(services, serviceId) {
  return services.find(
    (service) => service.id === serviceId
  )?.name;
}

export default App;
