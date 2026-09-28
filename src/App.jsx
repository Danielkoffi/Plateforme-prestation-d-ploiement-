import React, { useEffect, useMemo, useState } from "react";
import Admin from "./Admin.jsx";

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
  MonitorSmartphone,
  Palette,
  Video,
  Code2,
  FileText,
  Megaphone,
  PlayCircle,
  Globe2,
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
    description:
      "Site vitrine, boutique ou plateforme professionnelle.",
    price: 50000,
  },
  {
    id: "design",
    name: "Design graphique",
    description:
      "Logo, affiche, visuels publicitaires et identité visuelle.",
    price: 15000,
  },
  {
    id: "video",
    name: "Montage vidéo",
    description:
      "Montage de vidéos pour réseaux sociaux, publicité ou présentation.",
    price: 20000,
  },
  {
    id: "reseaux",
    name: "Gestion réseaux sociaux",
    description:
      "Création et organisation de contenus pour vos réseaux sociaux.",
    price: 30000,
  },
  {
    id: "autre",
    name: "Autre prestation",
    description:
      "Une prestation personnalisée selon votre besoin.",
    price: 0,
  },
];

const STATUSES = [
  "Reçue",
  "Acceptée",
  "En cours",
  "Livrée",
  "Terminée",
];

function formatMoney(amount) {
  return (
    new Intl.NumberFormat("fr-FR").format(
      Number(amount || 0)
    ) + " FCFA"
  );
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
  const bytes = new Uint8Array(12);

  crypto.getRandomValues(bytes);

  const random = Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("")
    .toUpperCase();

  return `TRK-${random}`;
}

function emptyForm() {
  return {
    clientName: "",
    email: "",
    phone: "",
    serviceId: "",
    amount: "",
    description: "",
    paymentMethod: "Mobile Money",
  };
}

export default function App() {
  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  const [page, setPage] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  const [lastOrder, setLastOrder] = useState(null);

  const [firebaseReady, setFirebaseReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = useMemo(
    () =>
      SERVICES.find(
        (service) => service.id === form.serviceId
      ),
    [form.serviceId]
  );

  useEffect(() => {
    async function connectFirebase() {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        setFirebaseReady(true);
      } catch (error) {
        console.error("Erreur Firebase :", error);

        alert(
          "La connexion au service de commande n'est pas disponible. Veuillez réessayer."
        );
      }
    }

    connectFirebase();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function chooseService(service) {
    setForm((current) => ({
      ...current,
      serviceId: service.id,
      amount: service.price
        ? String(service.price)
        : "",
    }));

    setPage("order");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (submitting) return;

    if (!form.clientName.trim()) {
      alert("Veuillez saisir votre nom.");
      return;
    }

    if (!form.email.trim()) {
      alert("Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (!form.serviceId) {
      alert("Veuillez choisir une prestation.");
      return;
    }

    if (!form.description.trim()) {
      alert("Veuillez décrire votre besoin.");
      return;
    }

    setSubmitting(true);

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Utilisateur Firebase non disponible."
        );
      }

      const orderRef = doc(
        collection(db, "orders")
      );

      const orderNumber = generateOrderNumber();
      const trackingCodeValue =
        generateTrackingCode();

      const order = {
        id: orderRef.id,

        orderNumber,

        trackingCode: trackingCodeValue,

        clientId: user.uid,

        clientName: form.clientName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),

        serviceId: form.serviceId,

        serviceName:
          selectedService?.name ||
          "Autre prestation",

        amount: Number(
          form.amount ||
            selectedService?.price ||
            0
        ),

        description: form.description.trim(),

        paymentMethod: form.paymentMethod,

        status: "Reçue",
        paymentStatus: "Non payé",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(orderRef, order);

      const trackingRef = doc(
        db,
        "tracking",
        trackingCodeValue
      );

      await setDoc(trackingRef, {
        orderNumber: orderNumber,
        trackingCode: trackingCodeValue,
        serviceName: order.serviceName,
        amount: order.amount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const displayOrder = {
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLastOrder(displayOrder);

      setForm(emptyForm());

      setPage("success");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Erreur création commande :",
        error
      );

      alert(
        "La commande n'a pas pu être enregistrée. Vérifiez votre connexion Internet puis réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();

    const number = trackingNumber
      .trim()
      .toUpperCase();

    const code = trackingCode
      .trim()
      .toUpperCase();

    if (!number) {
      alert(
        "Saisissez votre numéro de commande."
      );
      return;
    }

    if (!code) {
      alert("Saisissez votre code de suivi.");
      return;
    }

    setTrackingResult(null);

    try {
      const trackingRef = doc(
        db,
        "tracking",
        code
      );

      const trackingSnapshot =
        await getDoc(trackingRef);

      if (!trackingSnapshot.exists()) {
        setTrackingResult(false);
        return;
      }

      const data = trackingSnapshot.data();

      if (data.orderNumber !== number) {
        setTrackingResult(false);
        return;
      }

      setTrackingResult({
        ...data,
        trackingCode: code,
      });
    } catch (error) {
      console.error(
        "Erreur suivi commande :",
        error
      );

      alert(
        "Impossible de rechercher la commande. Vérifiez votre connexion puis réessayez."
      );
    }
  }

  function openOrder() {
    setPage("order");
    setMobileMenu(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openHome() {
    setPage("home");
    setMobileMenu(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openTracking() {
    setPage("tracking");
    setMobileMenu(false);
    setTrackingResult(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="app">
      <style>{`
        .professional-hero-visual {
          position: relative;
          width: 100%;
          min-height: 520px;
          border-radius: 32px;
          overflow: hidden;
          background:
            radial-gradient(circle at 80% 10%, rgba(34,211,238,.28), transparent 28%),
            radial-gradient(circle at 10% 90%, rgba(59,130,246,.30), transparent 30%),
            linear-gradient(145deg, #071426 0%, #0b1d38 55%, #102b52 100%);
          box-shadow: 0 30px 80px rgba(15,23,42,.25);
          padding: 28px;
          color: white;
        }

        .hero-visual-glow {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: rgba(34,211,238,.12);
          filter: blur(10px);
          top: 40px;
          right: 20px;
        }

        .hero-visual-top {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .hero-visual-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 18px;
        }

        .hero-visual-brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #22d3ee, #3b82f6);
          box-shadow: 0 10px 30px rgba(34,211,238,.25);
        }

        .hero-visual-online {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          font-size: 12px;
        }

        .hero-visual-online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px rgba(34,197,94,.7);
        }

        .hero-visual-content {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 24px;
          align-items: center;
        }

        .hero-visual-copy h2 {
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.05;
          margin: 0 0 16px;
          letter-spacing: -1.5px;
        }

        .hero-visual-copy h2 span {
          color: #67e8f9;
        }

        .hero-visual-copy p {
          color: rgba(255,255,255,.72);
          line-height: 1.65;
          margin: 0 0 22px;
          max-width: 440px;
        }

        .hero-visual-points {
          display: grid;
          gap: 10px;
        }

        .hero-visual-point {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(255,255,255,.88);
          font-size: 13px;
        }

        .hero-visual-point svg {
          color: #67e8f9;
          flex-shrink: 0;
        }

        .hero-device-area {
          position: relative;
          min-height: 360px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-device {
          position: relative;
          width: min(250px, 70%);
          min-height: 390px;
          border-radius: 34px;
          padding: 10px;
          background: #050b15;
          border: 2px solid rgba(255,255,255,.14);
          box-shadow:
            0 30px 60px rgba(0,0,0,.35),
            inset 0 0 0 1px rgba(255,255,255,.04);
          transform: rotate(-3deg);
        }

        .hero-device-screen {
          height: 100%;
          min-height: 366px;
          border-radius: 26px;
          background: #f8fafc;
          color: #0f172a;
          overflow: hidden;
          padding: 15px;
        }

        .hero-device-notch {
          width: 70px;
          height: 16px;
          background: #050b15;
          border-radius: 0 0 12px 12px;
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
        }

        .device-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 18px 0 15px;
        }

        .device-title {
          font-size: 15px;
          font-weight: 800;
        }

        .device-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22d3ee, #2563eb);
        }

        .device-card-main {
          padding: 15px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f2c55, #164e86);
          color: white;
          margin-bottom: 12px;
        }

        .device-card-main small {
          opacity: .7;
          font-size: 10px;
        }

        .device-card-main strong {
          display: block;
          margin-top: 5px;
          font-size: 17px;
        }

        .device-service-list {
          display: grid;
          gap: 8px;
        }

        .device-service {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
        }

        .device-service-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: #e0f2fe;
          color: #0369a1;
        }

        .device-service-text {
          min-width: 0;
        }

        .device-service-text strong {
          display: block;
          font-size: 10px;
        }

        .device-service-text span {
          display: block;
          font-size: 8px;
          color: #64748b;
          margin-top: 2px;
        }

        .hero-floating-card {
          position: absolute;
          z-index: 4;
          background: rgba(255,255,255,.96);
          color: #0f172a;
          border-radius: 16px;
          padding: 12px 14px;
          box-shadow: 0 18px 40px rgba(0,0,0,.25);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .hero-floating-card svg {
          color: #2563eb;
        }

        .hero-floating-card.one {
          right: 0;
          top: 40px;
        }

        .hero-floating-card.two {
          left: 0;
          bottom: 42px;
        }

        .hero-process {
          position: relative;
          z-index: 2;
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .hero-process-item {
          padding: 11px 8px;
          border-radius: 14px;
          text-align: center;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.08);
        }

        .hero-process-item svg {
          color: #67e8f9;
          margin-bottom: 5px;
        }

        .hero-process-item span {
          display: block;
          font-size: 10px;
          color: rgba(255,255,255,.78);
        }

        .delivery-download {
          margin-top: 24px;
          padding: 20px;
          border-radius: 16px;
          background: linear-gradient(135deg, #eff6ff, #ecfeff);
          border: 1px solid #bae6fd;
          text-align: center;
        }

        .delivery-download-icon {
          color: #0284c7;
          margin-bottom: 8px;
        }

        .delivery-download h3 {
          margin: 0 0 8px;
        }

        .delivery-download p {
          margin: 0 0 16px;
          color: #475569;
        }

        .delivery-download-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          padding: 14px 18px;
          border-radius: 10px;
          background: #0284c7;
          color: #fff;
          text-decoration: none;
          font-weight: 700;
        }

        .delivery-waiting {
          margin-top: 24px;
          padding: 16px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          text-align: center;
          color: #64748b;
        }

        .delivery-waiting p {
          margin: 0;
        }

        @media (max-width: 900px) {
          .professional-hero-visual {
            min-height: auto;
          }

          .hero-visual-content {
            grid-template-columns: 1fr;
          }

          .hero-visual-copy {
            text-align: center;
          }

          .hero-visual-copy p {
            margin-left: auto;
            margin-right: auto;
          }

          .hero-visual-points {
            justify-items: center;
          }

          .hero-device-area {
            min-height: 390px;
          }
        }

        @media (max-width: 560px) {
          .professional-hero-visual {
            padding: 18px;
            border-radius: 24px;
          }

          .hero-visual-top {
            margin-bottom: 18px;
          }

          .hero-visual-brand {
            font-size: 15px;
          }

          .hero-visual-brand-icon {
            width: 36px;
            height: 36px;
          }

          .hero-visual-online {
            display: none;
          }

          .hero-visual-copy h2 {
            font-size: 31px;
          }

          .hero-device-area {
            min-height: 360px;
          }

          .hero-device {
            width: 205px;
            min-height: 325px;
          }

          .hero-device-screen {
            min-height: 301px;
          }

          .hero-floating-card {
            padding: 9px 10px;
            font-size: 9px;
          }

          .hero-floating-card.one {
            right: -4px;
            top: 30px;
          }

          .hero-floating-card.two {
            left: -4px;
            bottom: 30px;
          }

          .hero-process {
            grid-template-columns: repeat(2, 1fr);
            margin-top: 5px;
          }
        }
      `}</style>

      <header className="header">
        <div className="container header-inner">
          <button
            className="logo"
            onClick={openHome}
          >
            <span className="logo-icon">
              <ShoppingBag size={22} />
            </span>

            <span>
              <strong>Prestations</strong>
              <small>Online</small>
            </span>
          </button>

          <nav
            className={`nav ${
              mobileMenu ? "nav-open" : ""
            }`}
          >
            <button onClick={openHome}>
              Accueil
            </button>

            <button
              onClick={() => {
                setPage("services");
                setMobileMenu(false);

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              Prestations
            </button>

            <button onClick={openTracking}>
              Suivre commande
            </button>

            <button
              className="nav-order"
              onClick={openOrder}
            >
              Commander
            </button>
          </nav>

          <button
            className="menu-button"
            onClick={() =>
              setMobileMenu(!mobileMenu)
            }
            aria-label="Menu"
          >
            {mobileMenu ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </header>

      <main>
        {page === "home" && (
          <>
            <section className="hero">
              <div className="container hero-grid">
                <div className="hero-content">
                  <div className="badge">
                    <Sparkles size={16} />
                    Prestations en ligne
                  </div>

                  <h1>
                    Votre besoin.
                    <br />
                    <span>Notre prestation.</span>
                  </h1>

                  <p>
                    Commandez facilement une prestation
                    professionnelle en ligne et suivez son
                    avancement depuis votre téléphone,
                    tablette ou ordinateur.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={openOrder}
                    >
                      Commander maintenant
                      <ArrowRight size={18} />
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => {
                        setPage("services");

                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                    >
                      Voir les prestations
                    </button>
                  </div>

                  <div className="trust-line">
                    <ShieldCheck size={18} />
                    Commande avec numéro de suivi unique
                  </div>
                </div>

                <ProfessionalHeroVisual />
              </div>
            </section>

            <section className="section">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      Nos services
                    </span>

                    <h2>
                      Choisissez votre prestation
                    </h2>
                  </div>

                  <button
                    className="text-button"
                    onClick={() =>
                      setPage("services")
                    }
                  >
                    Tout voir
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="services-grid">
                  {SERVICES.slice(0, 4).map(
                    (service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onSelect={chooseService}
                      />
                    )
                  )}
                </div>
              </div>
            </section>

            <section className="features">
              <div className="container features-grid">
                <Feature
                  icon={<CheckCircle2 />}
                  title="Commande simple"
                  text="Décrivez votre besoin et envoyez votre commande en quelques étapes."
                />

                <Feature
                  icon={<Clock3 />}
                  title="Suivi"
                  text="Utilisez votre numéro et votre code de suivi pour connaître son avancement."
                />

                <Feature
                  icon={<CreditCard />}
                  title="Paiement"
                  text="Plusieurs moyens de paiement pourront être proposés selon votre pays."
                />

                <Feature
                  icon={<PackageCheck />}
                  title="Livraison"
                  text="Recevez votre prestation une fois le travail terminé."
                />
              </div>
            </section>
          </>
        )}

        {page === "services" && (
          <section className="section page-section">
            <div className="container">
              <div className="page-title">
                <span className="eyebrow">
                  Catalogue
                </span>

                <h1>Nos prestations</h1>

                <p>
                  Sélectionnez une prestation pour
                  commencer votre commande.
                </p>
              </div>

              <div className="services-grid large">
                {SERVICES.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onSelect={chooseService}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {page === "order" && (
          <section className="section page-section">
            <div className="container narrow">
              <div className="page-title">
                <span className="eyebrow">
                  Commande
                </span>

                <h1>Passer une commande</h1>

                <p>
                  Remplissez les informations ci-dessous.
                  Votre commande recevra automatiquement un
                  numéro unique et un code de suivi.
                </p>
              </div>

              <form
                className="order-form"
                onSubmit={submitOrder}
              >
                <div className="form-section">
                  <h3>
                    1. Vos informations
                  </h3>

                  <div className="form-grid">
                    <label>
                      Nom complet

                      <input
                        value={form.clientName}
                        onChange={(e) =>
                          updateForm(
                            "clientName",
                            e.target.value
                          )
                        }
                        placeholder="Ex. Koffi Daniel"
                      />
                    </label>

                    <label>
                      E-mail

                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          updateForm(
                            "email",
                            e.target.value
                          )
                        }
                        placeholder="exemple@email.com"
                      />
                    </label>

                    <label>
                      Téléphone

                      <input
                        value={form.phone}
                        onChange={(e) =>
                          updateForm(
                            "phone",
                            e.target.value
                          )
                        }
                        placeholder="+225..."
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>
                    2. Votre prestation
                  </h3>

                  <label>
                    Type de prestation

                    <select
                      value={form.serviceId}
                      onChange={(e) => {
                        const service =
                          SERVICES.find(
                            (item) =>
                              item.id ===
                              e.target.value
                          );

                        updateForm(
                          "serviceId",
                          e.target.value
                        );

                        updateForm(
                          "amount",
                          service?.price
                            ? String(service.price)
                            : ""
                        );
                      }}
                    >
                      <option value="">
                        Sélectionner une prestation
                      </option>

                      {SERVICES.map((service) => (
                        <option
                          key={service.id}
                          value={service.id}
                        >
                          {service.name}

                          {service.price
                            ? ` — ${formatMoney(
                                service.price
                              )}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Budget / montant

                    <input
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) =>
                        updateForm(
                          "amount",
                          e.target.value
                        )
                      }
                      placeholder="Montant en FCFA"
                    />
                  </label>

                  <label>
                    Décrivez votre besoin

                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        updateForm(
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Expliquez précisément ce que vous souhaitez..."
                      rows="6"
                    />
                  </label>
                </div>

                <div className="form-section">
                  <h3>3. Paiement</h3>

                  <label>
                    Moyen de paiement souhaité

                    <select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        updateForm(
                          "paymentMethod",
                          e.target.value
                        )
                      }
                    >
                      <option>
                        Mobile Money
                      </option>

                      <option>
                        Virement bancaire
                      </option>

                      <option>
                        Espèces
                      </option>
                    </select>
                  </label>

                  <div className="notice">
                    <ShieldCheck size={20} />

                    <div>
                      <strong>
                        Paiement sécurisé
                      </strong>

                      <p>
                        Le paiement en ligne sécurisé sera
                        connecté dans une prochaine étape.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  className="primary-button submit-button"
                  type="submit"
                  disabled={
                    submitting ||
                    !firebaseReady
                  }
                >
                  {submitting
                    ? "Enregistrement..."
                    : !firebaseReady
                    ? "Connexion..."
                    : "Envoyer ma commande"}

                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </section>
        )}

        {page === "success" && lastOrder && (
          <section className="section page-section">
            <div className="container narrow">
              <div className="success-card">
                <div className="success-icon">
                  <CheckCircle2 size={42} />
                </div>

                <span className="eyebrow">
                  Commande reçue
                </span>

                <h1>
                  Votre commande a été enregistrée
                </h1>

                <p>
                  Conservez précieusement votre numéro de
                  commande et votre code de suivi.
                </p>

                <div className="order-number">
                  <small>
                    Numéro de commande
                  </small>

                  <strong>
                    {lastOrder.orderNumber}
                  </strong>
                </div>

                <div className="order-number">
                  <small>
                    Code de suivi
                  </small>

                  <strong>
                    {lastOrder.trackingCode}
                  </strong>
                </div>

                <div className="order-summary">
                  <div>
                    <span>Prestation</span>

                    <strong>
                      {lastOrder.serviceName}
                    </strong>
                  </div>

                  <div>
                    <span>Montant</span>

                    <strong>
                      {formatMoney(
                        lastOrder.amount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Statut</span>

                    <strong>
                      {lastOrder.status}
                    </strong>
                  </div>
                </div>

                <div className="success-actions">
                  <button
                    className="primary-button"
                    onClick={() => {
                      setTrackingNumber(
                        lastOrder.orderNumber
                      );

                      setTrackingCode(
                        lastOrder.trackingCode
                      );

                      setTrackingResult(
                        lastOrder
                      );

                      setPage("tracking");
                    }}
                  >
                    Suivre ma commande
                  </button>

                  <button
                    className="secondary-button"
                    onClick={openHome}
                  >
                    Retour à l'accueil
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {page === "tracking" && (
          <section className="section page-section">
            <div className="container narrow">
              <div className="page-title">
                <span className="eyebrow">
                  Suivi
                </span>

                <h1>
                  Suivre votre commande
                </h1>

                <p>
                  Entrez votre numéro de commande et votre
                  code de suivi.
                </p>
              </div>

              <form
                className="tracking-form"
                onSubmit={trackOrder}
              >
                <div className="search-box">
                  <Search size={20} />

                  <input
                    value={trackingNumber}
                    onChange={(e) =>
                      setTrackingNumber(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="Numéro de commande"
                  />

                  <input
                    value={trackingCode}
                    onChange={(e) =>
                      setTrackingCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="Code de suivi"
                  />

                  <button type="submit">
                    Rechercher
                  </button>
                </div>
              </form>

              {trackingResult === false && (
                <div className="not-found">
                  <Search size={30} />

                  <h3>
                    Commande introuvable
                  </h3>

                  <p>
                    Vérifiez le numéro de commande et le
                    code de suivi puis réessayez.
                  </p>
                </div>
              )}

              {trackingResult && (
                <TrackingCard
                  order={trackingResult}
                />
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>
              Prestations Online
            </strong>

            <p>
              Plateforme de prestations à la demande.
            </p>
          </div>

          <div>
            <span>
              Commande simple • Suivi • Livraison
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProfessionalHeroVisual() {
  return (
    <div className="professional-hero-visual">
      <div className="hero-visual-glow" />

      <div className="hero-visual-top">
        <div className="hero-visual-brand">
          <span className="hero-visual-brand-icon">
            <Globe2 size={22} />
          </span>

          <span>
            Prestations Online
          </span>
        </div>

        <div className="hero-visual-online">
          <span className="hero-visual-online-dot" />
          Plateforme en ligne
        </div>
      </div>

      <div className="hero-visual-content">
        <div className="hero-visual-copy">
          <h2>
            Vos prestations,
            <br />
            <span>simplement en ligne.</span>
          </h2>

          <p>
            Une plateforme pour commander des prestations
            professionnelles, suivre votre commande et
            recevoir votre résultat.
          </p>

          <div className="hero-visual-points">
            <div className="hero-visual-point">
              <CheckCircle2 size={17} />
              Commande en ligne
            </div>

            <div className="hero-visual-point">
              <CheckCircle2 size={17} />
              Numéro de commande unique
            </div>

            <div className="hero-visual-point">
              <CheckCircle2 size={17} />
              Code de suivi
            </div>

            <div className="hero-visual-point">
              <CheckCircle2 size={17} />
              Suivi jusqu'à la livraison
            </div>
          </div>
        </div>

        <div className="hero-device-area">
          <div className="hero-floating-card one">
            <CheckCircle2 size={17} />
            Commande reçue
          </div>

          <div className="hero-floating-card two">
            <Clock3 size={17} />
            Suivi en temps réel
          </div>

          <div className="hero-device">
            <div className="hero-device-notch" />

            <div className="hero-device-screen">
              <div className="device-header">
                <div className="device-title">
                  Prestations Online
                </div>

                <div className="device-avatar" />
              </div>

              <div className="device-card-main">
                <small>
                  Besoin d'une prestation ?
                </small>

                <strong>
                  Commandez maintenant
                </strong>
              </div>

              <div className="device-service-list">
                <div className="device-service">
                  <div className="device-service-icon">
                    <Code2 size={15} />
                  </div>

                  <div className="device-service-text">
                    <strong>
                      Création web
                    </strong>

                    <span>
                      Site professionnel
                    </span>
                  </div>
                </div>

                <div className="device-service">
                  <div className="device-service-icon">
                    <Palette size={15} />
                  </div>

                  <div className="device-service-text">
                    <strong>
                      Design graphique
                    </strong>

                    <span>
                      Logo et visuels
                    </span>
                  </div>
                </div>

                <div className="device-service">
                  <div className="device-service-icon">
                    <Video size={15} />
                  </div>

                  <div className="device-service-text">
                    <strong>
                      Montage vidéo
                    </strong>

                    <span>
                      Vidéo professionnelle
                    </span>
                  </div>
                </div>

                <div className="device-service">
                  <div className="device-service-icon">
                    <Megaphone size={15} />
                  </div>

                  <div className="device-service-text">
                    <strong>
                      Communication
                    </strong>

                    <span>
                      Réseaux sociaux
                    </span>
                  </div>
                </div>

                <div className="device-service">
                  <div className="device-service-icon">
                    <FileText size={15} />
                  </div>

                  <div className="device-service-text">
                    <strong>
                      Autres prestations
                    </strong>

                    <span>
                      Besoin personnalisé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-process">
        <div className="hero-process-item">
          <ShoppingBag size={18} />
          <span>Commander</span>
        </div>

        <div className="hero-process-item">
          <Search size={18} />
          <span>Suivre</span>
        </div>

        <div className="hero-process-item">
          <CreditCard size={18} />
          <span>Payer</span>
        </div>

        <div className="hero-process-item">
          <PackageCheck size={18} />
          <span>Recevoir</span>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service, onSelect }) {
  return (
    <article className="service-card">
      <div className="service-icon">
        <ShoppingBag size={22} />
      </div>

      <h3>{service.name}</h3>

      <p>{service.description}</p>

      <div className="service-bottom">
        <strong>
          {service.price
            ? formatMoney(service.price)
            : "Sur devis"}
        </strong>

        <button
          onClick={() => onSelect(service)}
        >
          Commander
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="feature-icon">
        {icon}
      </div>

      <div>
        <h3>{title}</h3>

        <p>{text}</p>
      </div>
    </div>
  );
}

function prepareDownloadLink(url) {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);

    if (
      parsed.hostname.includes("dropbox.com")
    ) {
      parsed.searchParams.set("dl", "1");
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

function TrackingCard({ order }) {
  const currentIndex =
    STATUSES.indexOf(order.status);

  const deliveryLink =
    prepareDownloadLink(
      order.deliveryUrl
    );

  const isDelivered =
    order.status === "Livrée" ||
    order.status === "Terminée";

  return (
    <div className="tracking-card">
      <div className="tracking-header">
        <div>
          <span>Commande</span>

          <strong>
            {order.orderNumber}
          </strong>
        </div>

        <div className="status-badge">
          {order.status}
        </div>
      </div>

      <div className="tracking-info">
        <div>
          <span>Prestation</span>

          <strong>
            {order.serviceName}
          </strong>
        </div>

        <div>
          <span>Montant</span>

          <strong>
            {formatMoney(order.amount)}
          </strong>
        </div>

        <div>
          <span>Paiement</span>

          <strong>
            {order.paymentStatus}
          </strong>
        </div>
      </div>

      <div className="timeline">
        {STATUSES.map((status, index) => {
          const active =
            index <= currentIndex;

          return (
            <div
              className={`timeline-item ${
                active ? "active" : ""
              }`}
              key={status}
            >
              <div className="timeline-dot">
                {active ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
              </div>

              <span>{status}</span>
            </div>
          );
        })}
      </div>

      {isDelivered && deliveryLink && (
        <div className="delivery-download">
          <PackageCheck
            size={38}
            className="delivery-download-icon"
          />

          <h3>
            Votre prestation est prête
          </h3>

          <p>
            Votre fichier livré est disponible.
          </p>

          <a
            href={deliveryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="delivery-download-button"
          >
            Télécharger mon fichier
            <ArrowRight size={18} />
          </a>
        </div>
      )}

      {isDelivered && !deliveryLink && (
        <div className="delivery-waiting">
          <p>
            Votre commande est livrée. Le fichier sera
            disponible ici dès que la livraison sera
            ajoutée.
          </p>
        </div>
      )}
    </div>
  );
}
