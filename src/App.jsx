import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import {
  auth,
  db,
  signInAnonymously,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "./firebase-storage.js";

const SERVICES = [
  {
    id: "site-web",
    name: "Création de site web",
    description: "Site vitrine, boutique ou plateforme professionnelle.",
    price: 50000,
  },
  {
    id: "design",
    name: "Design graphique",
    description: "Logo, affiche, visuels publicitaires et identité visuelle.",
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
    description: "Une prestation personnalisée selon votre besoin.",
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
    new Intl.NumberFormat("fr-FR").format(Number(amount || 0)) + " FCFA"
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
  const [page, setPage] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  const [lastOrder, setLastOrder] = useState(null);

  const [firebaseReady, setFirebaseReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = useMemo(
    () => SERVICES.find((service) => service.id === form.serviceId),
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
      amount: service.price ? String(service.price) : "",
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
        throw new Error("Utilisateur Firebase non disponible.");
      }

      const orderRef = doc(collection(db, "orders"));

      const order = {
        id: orderRef.id,

        orderNumber: generateOrderNumber(),

        clientId: user.uid,

        clientName: form.clientName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),

        serviceId: form.serviceId,
        serviceName: selectedService?.name || "Autre prestation",

        amount: Number(
          form.amount || selectedService?.price || 0
        ),

        description: form.description.trim(),

        paymentMethod: form.paymentMethod,

        status: "Reçue",
        paymentStatus: "Non payé",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(orderRef, order);

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
      console.error("Erreur création commande :", error);

      alert(
        "La commande n'a pas pu être enregistrée. Vérifiez votre connexion Internet puis réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();

    const number = trackingNumber.trim().toUpperCase();

    if (!number) {
      alert("Saisissez votre numéro de commande.");
      return;
    }

    setTrackingResult(null);

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Utilisateur Firebase non disponible.");
      }

      const ordersRef = collection(db, "orders");

      const q = query(
        ordersRef,
        where("orderNumber", "==", number),
        where("clientId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTrackingResult(false);
        return;
      }

      const data = snapshot.docs[0].data();

      setTrackingResult({
        id: snapshot.docs[0].id,
        ...data,
      });
    } catch (error) {
      console.error("Erreur suivi commande :", error);

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
      <header className="header">
        <div className="container header-inner">
          <button className="logo" onClick={openHome}>
            <span className="logo-icon">
              <ShoppingBag size={22} />
            </span>

            <span>
              <strong>Prestations</strong>
              <small>Online</small>
            </span>
          </button>

          <nav className={`nav ${mobileMenu ? "nav-open" : ""}`}>
            <button onClick={openHome}>Accueil</button>

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

            <button className="nav-order" onClick={openOrder}>
              Commander
            </button>
          </nav>

          <button
            className="menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Menu"
          >
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
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
                    Commandez facilement une prestation professionnelle en
                    ligne et suivez son avancement depuis votre téléphone.
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

                <div className="video-card">
                  <div className="video-placeholder">
                    <div className="video-icon">
                      <Sparkles size={34} />
                    </div>

                    <h3>Vidéo publicitaire IA</h3>

                    <p>
                      Présentation automatique de nos prestations.
                    </p>

                    <span>
                      Vidéo disponible prochainement
                    </span>
                  </div>
                </div>
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
                    onClick={() => setPage("services")}
                  >
                    Tout voir
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="services-grid">
                  {SERVICES.slice(0, 4).map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onSelect={chooseService}
                    />
                  ))}
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
                  text="Utilisez votre numéro de commande pour connaître son avancement."
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
                <span className="eyebrow">Catalogue</span>

                <h1>Nos prestations</h1>

                <p>
                  Sélectionnez une prestation pour commencer votre commande.
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
                <span className="eyebrow">Commande</span>

                <h1>Passer une commande</h1>

                <p>
                  Remplissez les informations ci-dessous. Votre commande
                  recevra automatiquement un numéro unique.
                </p>
              </div>

              <form
                className="order-form"
                onSubmit={submitOrder}
              >
                <div className="form-section">
                  <h3>1. Vos informations</h3>

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
                  <h3>2. Votre prestation</h3>

                  <label>
                    Type de prestation

                    <select
                      value={form.serviceId}
                      onChange={(e) => {
                        const service = SERVICES.find(
                          (item) =>
                            item.id === e.target.value
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
                    submitting || !firebaseReady
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
                  commande pour suivre son avancement.
                </p>

                <div className="order-number">
                  <small>
                    Numéro de commande
                  </small>

                  <strong>
                    {lastOrder.orderNumber}
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
                      {formatMoney(lastOrder.amount)}
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
                  Entrez le numéro reçu après votre
                  commande.
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
                    placeholder="Ex. CMD-20260926-ABC123"
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
                    Vérifiez le numéro de commande puis
                    réessayez.
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

function TrackingCard({ order }) {
  const currentIndex =
    STATUSES.indexOf(order.status);

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
    </div>
  );
}
