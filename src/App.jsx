import React, { useEffect, useState } from "react";
import Admin from "./Admin.jsx";

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

const services = [
  {
    id: "site-web",
    name: "Création de site web",
    price: 50000,
  },
  {
    id: "design",
    name: "Design graphique",
    price: 15000,
  },
  {
    id: "video",
    name: "Montage vidéo",
    price: 20000,
  },
  {
    id: "reseaux",
    name: "Gestion réseaux sociaux",
    price: 30000,
  },
  {
    id: "autre",
    name: "Autre prestation",
    price: 0,
  },
];

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
  const random =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random()
          .toString(36)
          .substring(2, 26)
          .padEnd(24, "0");

  return `TRK-${random.substring(0, 24).toUpperCase()}`;
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString("fr-FR");
}

function App() {
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    serviceId: "",
    amount: "",
    description: "",
    paymentMethod: "Mobile Money",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  const [trackingCode, setTrackingCode] = useState("");
  const [tracking, setTracking] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const [paymentResult, setPaymentResult] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");

  useEffect(() => {
    initializeAnonymousAuth();
    handlePaymentReturn();

    if (window.location.pathname === "/admin") {
      setCurrentPage("admin");
    }
  }, []);

  async function initializeAnonymousAuth() {
    try {
      if (!auth.currentUser) {
        const credential = await signInAnonymously(auth);

        console.log(
          "Authentification anonyme réussie:",
          credential.user.uid
        );
      } else {
        console.log(
          "Utilisateur Firebase déjà connecté:",
          auth.currentUser.uid
        );
      }
    } catch (err) {
      console.error(
        "Erreur authentification Firebase:",
        err
      );
    }
  }

  function handlePaymentReturn() {
    const params = new URLSearchParams(
      window.location.search
    );

    const payment = params.get("payment");
    const order = params.get("order");

    if (!payment) {
      return;
    }

    if (payment === "success") {
      setPaymentResult({
        type: "success",
        orderNumber: order || "",
      });
    }

    if (payment === "pending") {
      setPaymentResult({
        type: "pending",
        orderNumber: order || "",
      });
    }

    if (payment === "failed") {
      setPaymentResult({
        type: "failed",
        orderNumber: order || "",
      });
    }

    window.history.replaceState(
      {},
      document.title,
      "/"
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function handleServiceChange(event) {
    const serviceId = event.target.value;

    const service = services.find(
      (item) => item.id === serviceId
    );

    setForm((previous) => ({
      ...previous,
      serviceId,
      amount:
        service && service.price > 0
          ? String(service.price)
          : "",
    }));

    setError("");
  }

  async function submitOrder(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setPaymentResult(null);

    if (!form.clientName.trim()) {
      setError("Veuillez renseigner votre nom.");
      return;
    }

    if (!form.email.trim()) {
      setError(
        "Veuillez renseigner votre adresse email."
      );
      return;
    }

    if (!form.serviceId) {
      setError(
        "Veuillez choisir une prestation."
      );
      return;
    }

    if (!form.description.trim()) {
      setError(
        "Veuillez décrire votre besoin."
      );
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError(
        "Veuillez renseigner un montant valide."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * ==================================================
       * 1. AUTHENTIFICATION ANONYME
       * ==================================================
       */

      let clientId = null;

      if (!auth.currentUser) {
        const credential =
          await signInAnonymously(auth);

        clientId = credential.user.uid;
      } else {
        clientId = auth.currentUser.uid;
      }

      if (!clientId) {
        throw new Error(
          "Firebase n'a pas fourni l'identifiant du client."
        );
      }

      console.log(
        "UID CLIENT UTILISÉ:",
        clientId
      );

      /*
       * ==================================================
       * 2. IDENTIFIANTS DE COMMANDE
       * ==================================================
       */

      const orderNumber =
        generateOrderNumber();

      const trackingCode =
        generateTrackingCode();

      console.log(
        "NUMÉRO COMMANDE:",
        orderNumber
      );

      console.log(
        "CODE SUIVI:",
        trackingCode
      );

      /*
       * ==================================================
       * 3. SERVICE
       * ==================================================
       */

      const service = services.find(
        (item) =>
          item.id === form.serviceId
      );

      if (!service) {
        throw new Error(
          "La prestation sélectionnée est introuvable."
        );
      }

      /*
       * ==================================================
       * 4. CRÉATION DU DOCUMENT FIRESTORE
       * ==================================================
       */

      const orderRef = doc(
        collection(db, "orders")
      );

      const orderId = orderRef.id;

      const orderData = {
        id: orderId,
        orderNumber,
        trackingCode,

        clientId,

        clientName:
          form.clientName.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim(),

        serviceId:
          service.id,

        serviceName:
          service.name,

        amount:
          Number(form.amount),

        description:
          form.description.trim(),

        paymentMethod:
          form.paymentMethod,

        status: "Reçue",

        paymentStatus:
          "Non payé",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      console.log(
        "ÉCRITURE FIRESTORE ORDERS..."
      );

      /*
       * ==================================================
       * 5. ENREGISTREMENT ORDERS
       * ==================================================
       */

      try {
        await setDoc(
          orderRef,
          orderData
        );
      } catch (firestoreError) {
        console.error(
          "ERREUR FIRESTORE ORDERS:",
          firestoreError
        );

        throw new Error(
          `Impossible d'enregistrer la commande dans Firebase. ${
            firestoreError?.code || ""
          } ${firestoreError?.message || ""}`
        );
      }

      console.log(
        "ORDERS : ÉCRITURE RÉUSSIE"
      );

      /*
       * ==================================================
       * 6. VÉRIFICATION ORDERS
       * ==================================================
       */

      const savedOrder =
        await getDoc(orderRef);

      if (!savedOrder.exists()) {
        throw new Error(
          "Firebase n'a pas permis de vérifier la commande après son enregistrement."
        );
      }

      console.log(
        "ORDERS : VÉRIFICATION RÉUSSIE"
      );

      /*
       * MESSAGE VISIBLE
       */

      setMessage(
        `Commande ${orderNumber} enregistrée dans Firebase.`
      );

      /*
       * ==================================================
       * 7. CRÉATION DU TRACKING
       * ==================================================
       */

      const trackingRef = doc(
        db,
        "tracking",
        trackingCode
      );

      const trackingData = {
        orderNumber,
        trackingCode,

        serviceName:
          service.name,

        amount:
          Number(form.amount),

        status: "Reçue",

        paymentStatus:
          "Non payé",

        deliveryUrl: "",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      try {
        await setDoc(
          trackingRef,
          trackingData
        );
      } catch (trackingError) {
        console.error(
          "ERREUR TRACKING:",
          trackingError
        );

        throw new Error(
          `La commande est enregistrée, mais le suivi n'a pas pu être créé. ${
            trackingError?.code || ""
          } ${trackingError?.message || ""}`
        );
      }

      console.log(
        "TRACKING : ÉCRITURE RÉUSSIE"
      );

      /*
       * ==================================================
       * 8. VÉRIFICATION TRACKING
       * ==================================================
       */

      const savedTracking =
        await getDoc(
          trackingRef
        );

      if (
        !savedTracking.exists()
      ) {
        throw new Error(
          "Le document de suivi n'a pas pu être vérifié."
        );
      }

      console.log(
        "TRACKING : VÉRIFICATION RÉUSSIE"
      );

      /*
       * ==================================================
       * 9. PRÉPARATION DE L'INTERFACE
       * ==================================================
       */

      setLastOrder({
        orderId,
        orderNumber,
        trackingCode,

        clientName:
          form.clientName.trim(),

        email:
          form.email.trim(),

        serviceName:
          service.name,

        amount:
          Number(form.amount),

        status: "Reçue",

        paymentStatus:
          "Non payé",

        createdAt:
          new Date().toISOString(),
      });

      /*
       * ==================================================
       * 10. CRÉATION DU PAIEMENT PAYDUNYA
       * ==================================================
       */

      console.log(
        "CRÉATION FACTURE PAYDUNYA..."
      );

      const paymentResponse =
        await fetch(
          "https://plateforme-prestation-d-ploiement.onrender.com/api/paydunya/create-invoice",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              orderNumber,

              amount:
                Number(form.amount),

              description:
                form.description.trim(),

              name:
                form.clientName.trim(),

              email:
                form.email.trim(),

              phone:
                form.phone.trim(),
            }),
          }
        );

      let paymentData = null;

      try {
        paymentData =
          await paymentResponse.json();
      } catch {
        paymentData = null;
      }

      console.log(
        "RÉPONSE PAYDUNYA:",
        paymentData
      );

      if (
        !paymentResponse.ok ||
        !paymentData?.ok
      ) {
        throw new Error(
          paymentData?.message ||
            "Impossible de créer le paiement PayDunya."
        );
      }

      if (
        !paymentData.paymentUrl
      ) {
        throw new Error(
          "PayDunya n'a pas retourné de lien de paiement."
        );
      }

      /*
       * ==================================================
       * 11. REDIRECTION VERS PAYDUNYA
       * ==================================================
       */

      console.log(
        "COMMANDE ENREGISTRÉE."
      );

      console.log(
        "REDIRECTION VERS PAYDUNYA..."
      );

      window.location.href =
        paymentData.paymentUrl;

      return;
    } catch (err) {
      console.error(
        "ERREUR COMPLÈTE:",
        err
      );

      setError(
        err?.message ||
          "Une erreur est survenue pendant la création de la commande."
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchTracking(event) {
    event?.preventDefault();

    setTrackingError("");
    setTracking(null);

    const code =
      trackingCode.trim().toUpperCase();

    if (!code) {
      setTrackingError(
        "Veuillez saisir votre code de suivi."
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

      const snapshot =
        await getDoc(
          trackingRef
        );

      if (!snapshot.exists()) {
        setTrackingError(
          "Aucune commande trouvée avec ce code de suivi."
        );
        return;
      }

      setTracking({
        id: snapshot.id,
        ...snapshot.data(),
      });
    } catch (err) {
      console.error(
        "Erreur recherche tracking:",
        err
      );

      setTrackingError(
        `Impossible de récupérer le suivi. ${
          err?.code || ""
        } ${err?.message || ""}`
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  function goHome() {
    setCurrentPage("home");

    window.history.pushState(
      {},
      "",
      "/"
    );
  }

  function goTracking() {
    setCurrentPage("tracking");

    window.history.pushState(
      {},
      "",
      "/suivi"
    );
  }

  function goAdmin() {
    window.location.href =
      "/admin";
  }

  if (currentPage === "admin") {
    return <Admin />;
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={goHome}
            style={styles.logoButton}
          >
            Prestations Online
          </button>

          <nav style={styles.nav}>
            <button
              type="button"
              onClick={goHome}
              style={styles.navButton}
            >
              Accueil
            </button>

            <button
              type="button"
              onClick={goTracking}
              style={styles.navButton}
            >
              Suivre une commande
            </button>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        {paymentResult && (
          <section
            style={{
              ...styles.alert,

              ...(paymentResult.type ===
              "success"
                ? styles.success
                : paymentResult.type ===
                  "pending"
                ? styles.warning
                : styles.danger),
            }}
          >
            {paymentResult.type ===
              "success" && (
              <>
                <strong>
                  Paiement confirmé
                </strong>

                <p>
                  Votre paiement a été
                  confirmé.
                </p>

                {paymentResult.orderNumber && (
                  <p>
                    Commande :{" "}
                    <strong>
                      {
                        paymentResult.orderNumber
                      }
                    </strong>
                  </p>
                )}

                <p>
                  Utilisez votre code de
                  suivi pour consulter
                  l'avancement de votre
                  commande.
                </p>
              </>
            )}

            {paymentResult.type ===
              "pending" && (
              <>
                <strong>
                  Paiement en attente
                </strong>

                <p>
                  La confirmation du
                  paiement est encore en
                  cours.
                </p>
              </>
            )}

            {paymentResult.type ===
              "failed" && (
              <>
                <strong>
                  Paiement non confirmé
                </strong>

                <p>
                  Le paiement n'a pas été
                  confirmé.
                </p>

                <p>
                  La commande reste
                  enregistrée.
                </p>
              </>
            )}
          </section>
        )}

        {currentPage ===
        "tracking" ? (
          <section style={styles.card}>
            <h1 style={styles.title}>
              Suivre ma commande
            </h1>

            <p style={styles.subtitle}>
              Entrez votre code de suivi.
            </p>

            <form
              onSubmit={searchTracking}
            >
              <label
                style={styles.label}
              >
                Code de suivi
              </label>

              <input
                type="text"
                value={trackingCode}
                onChange={(event) =>
                  setTrackingCode(
                    event.target.value
                  )
                }
                placeholder="TRK-XXXXXXXX"
                style={styles.input}
              />

              <button
                type="submit"
                disabled={
                  trackingLoading
                }
                style={
                  styles.primaryButton
                }
              >
                {trackingLoading
                  ? "Recherche..."
                  : "Rechercher"}
              </button>
            </form>

            {trackingError && (
              <div
                style={{
                  ...styles.alert,
                  ...styles.danger,
                }}
              >
                {trackingError}
              </div>
            )}

            {tracking && (
              <div
                style={
                  styles.trackingResult
                }
              >
                <h2>
                  Commande trouvée
                </h2>

                <p>
                  <strong>
                    Numéro :
                  </strong>{" "}
                  {
                    tracking.orderNumber
                  }
                </p>

                <p>
                  <strong>
                    Prestation :
                  </strong>{" "}
                  {
                    tracking.serviceName
                  }
                </p>

                <p>
                  <strong>
                    Montant :
                  </strong>{" "}
                  {formatAmount(
                    tracking.amount
                  )}{" "}
                  FCFA
                </p>

                <p>
                  <strong>
                    Statut :
                  </strong>{" "}
                  {tracking.status}
                </p>

                <p>
                  <strong>
                    Paiement :
                  </strong>{" "}
                  {
                    tracking.paymentStatus
                  }
                </p>

                {tracking.deliveryUrl &&
                  tracking.paymentStatus ===
                    "Payé" &&
                  tracking.status ===
                    "Livrée" && (
                    <a
                      href={
                        tracking.deliveryUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={
                        styles.deliveryButton
                      }
                    >
                      Télécharger ma
                      livraison
                    </a>
                  )}

                {!(
                  tracking.deliveryUrl &&
                  tracking.paymentStatus ===
                    "Payé" &&
                  tracking.status ===
                    "Livrée"
                ) && (
                  <p
                    style={
                      styles.smallText
                    }
                  >
                    La livraison apparaîtra
                    ici lorsque la commande
                    sera livrée.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={goHome}
              style={
                styles.secondaryButton
              }
            >
              Retour à l'accueil
            </button>
          </section>
        ) : (
          <>
            <section style={styles.hero}>
              <h1
                style={
                  styles.heroTitle
                }
              >
                Commandez votre
                prestation en ligne
              </h1>

              <p
                style={
                  styles.heroText
                }
              >
                Choisissez votre service,
                décrivez votre besoin et
                suivez votre commande en
                ligne.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      "commande"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    })
                }
                style={
                  styles.heroButton
                }
              >
                Commander maintenant
              </button>
            </section>

            <section
              id="commande"
              style={styles.card}
            >
              <h2 style={styles.title}>
                Nouvelle commande
              </h2>

              {error && (
                <div
                  style={{
                    ...styles.alert,
                    ...styles.danger,
                  }}
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  style={{
                    ...styles.alert,
                    ...styles.success,
                  }}
                >
                  {message}
                </div>
              )}

              <form
                onSubmit={submitOrder}
              >
                <label
                  style={styles.label}
                >
                  Nom complet
                </label>

                <input
                  name="clientName"
                  value={
                    form.clientName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Votre nom complet"
                  style={styles.input}
                />

                <label
                  style={styles.label}
                >
                  Adresse email
                </label>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={
                    handleChange
                  }
                  placeholder="vous@example.com"
                  style={styles.input}
                />

                <label
                  style={styles.label}
                >
                  Téléphone
                </label>

                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={
                    handleChange
                  }
                  placeholder="Votre numéro"
                  style={styles.input}
                />

                <label
                  style={styles.label}
                >
                  Prestation
                </label>

                <select
                  name="serviceId"
                  value={
                    form.serviceId
                  }
                  onChange={
                    handleServiceChange
                  }
                  style={styles.input}
                >
                  <option value="">
                    Sélectionner une
                    prestation
                  </option>

                  {services.map(
                    (service) => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.id
                        }
                      >
                        {service.name}
                        {service.price > 0
                          ? ` — ${formatAmount(
                              service.price
                            )} FCFA`
                          : ""}
                      </option>
                    )
                  )}
                </select>

                <label
                  style={styles.label}
                >
                  Montant en FCFA
                </label>

                <input
                  name="amount"
                  type="number"
                  min="1"
                  value={
                    form.amount
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Montant"
                  style={styles.input}
                />

                <label
                  style={styles.label}
                >
                  Décrivez votre besoin
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Décrivez précisément votre besoin..."
                  rows="6"
                  style={
                    styles.textarea
                  }
                />

                <label
                  style={styles.label}
                >
                  Moyen de paiement
                </label>

                <select
                  name="paymentMethod"
                  value={
                    form.paymentMethod
                  }
                  onChange={
                    handleChange
                  }
                  style={styles.input}
                >
                  <option>
                    Mobile Money
                  </option>

                  <option>
                    Virement
                  </option>

                  <option>
                    Espèces
                  </option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  style={
                    styles.primaryButton
                  }
                >
                  {loading
                    ? "Création en cours..."
                    : "Créer la commande et payer"}
                </button>
              </form>
            </section>

            {lastOrder && (
              <section
                style={styles.card}
              >
                <h2>
                  Commande créée
                </h2>

                <div
                  style={
                    styles.orderBox
                  }
                >
                  <p>
                    <strong>
                      Numéro de commande
                    </strong>
                  </p>

                  <div
                    style={styles.code}
                  >
                    {
                      lastOrder.orderNumber
                    }
                  </div>

                  <p>
                    <strong>
                      Code de suivi
                    </strong>
                  </p>

                  <div
                    style={styles.code}
                  >
                    {
                      lastOrder.trackingCode
                    }
                  </div>

                  <p
                    style={
                      styles.smallText
                    }
                  >
                    Conservez ces
                    informations pour
                    suivre votre commande.
                  </p>
                </div>
              </section>
            )}

            <section style={styles.card}>
              <h2>
                Vous avez déjà commandé ?
              </h2>

              <p
                style={
                  styles.subtitle
                }
              >
                Utilisez votre code de suivi
                pour consulter l'état de
                votre commande.
              </p>

              <button
                type="button"
                onClick={
                  goTracking
                }
                style={
                  styles.secondaryButton
                }
              >
                Suivre ma commande
              </button>
            </section>
          </>
        )}
      </main>

      <footer style={styles.footer}>
        <span>
          © {new Date().getFullYear()}{" "}
          Prestations Online
        </span>

        <button
          type="button"
          onClick={goAdmin}
          style={styles.adminButton}
        >
          Administration
        </button>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  header: {
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },

  headerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "15px 20px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
  },

  logoButton: {
    border: "none",
    background:
      "transparent",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
  },

  nav: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  navButton: {
    border: "none",
    background:
      "transparent",
    cursor: "pointer",
    padding: "8px 10px",
    fontSize: "14px",
  },

  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding:
      "30px 16px 60px",
  },

  hero: {
    background: "#111827",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "45px 25px",
    marginBottom: "25px",
  },

  heroTitle: {
    fontSize: "34px",
    lineHeight: "1.2",
    margin:
      "0 0 15px",
  },

  heroText: {
    lineHeight: "1.6",
    fontSize: "16px",
    marginBottom: "25px",
  },

  heroButton: {
    border: "none",
    borderRadius: "10px",
    padding:
      "14px 20px",
    background:
      "#ffffff",
    color: "#111827",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "22px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.06)",
  },

  title: {
    marginTop: 0,
  },

  subtitle: {
    color: "#667085",
    lineHeight: "1.6",
  },

  label: {
    display: "block",
    fontWeight: "600",
    margin:
      "18px 0 7px",
  },

  input: {
    width: "100%",
    boxSizing:
      "border-box",
    border:
      "1px solid #d0d5dd",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "15px",
    background:
      "#ffffff",
  },

  textarea: {
    width: "100%",
    boxSizing:
      "border-box",
    border:
      "1px solid #d0d5dd",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "15px",
    resize: "vertical",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  primaryButton: {
    width: "100%",
    marginTop: "20px",
    border: "none",
    borderRadius: "10px",
    padding: "14px 18px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
  },

  secondaryButton: {
    width: "100%",
    marginTop: "15px",
    border:
      "1px solid #111827",
    borderRadius: "10px",
    padding: "13px 18px",
    background:
      "#ffffff",
    color: "#111827",
    fontWeight: "700",
    cursor: "pointer",
  },

  alert: {
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    lineHeight: "1.5",
  },

  success: {
    background: "#ecfdf3",
    color: "#027a48",
    border:
      "1px solid #abefc6",
  },

  warning: {
    background: "#fffaeb",
    color: "#b54708",
    border:
      "1px solid #fedf89",
  },

  danger: {
    background: "#fef3f2",
    color: "#b42318",
    border:
      "1px solid #fecdca",
  },

  trackingResult: {
    marginTop: "25px",
    padding: "20px",
    borderRadius: "12px",
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
  },

  orderBox: {
    background:
      "#f8fafc",
    borderRadius: "12px",
    padding: "20px",
    border:
      "1px solid #e2e8f0",
  },

  code: {
    fontWeight: "700",
    fontSize: "18px",
    wordBreak:
      "break-word",
    background:
      "#ffffff",
    borderRadius: "8px",
    padding: "10px",
    border:
      "1px solid #e5e7eb",
  },

  deliveryButton: {
    display: "block",
    textAlign: "center",
    marginTop: "20px",
    borderRadius: "10px",
    padding: "14px",
    background: "#111827",
    color: "#ffffff",
    textDecoration:
      "none",
    fontWeight: "700",
  },

  smallText: {
    color: "#667085",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  footer: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding:
      "25px 20px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    color: "#667085",
    fontSize: "14px",
  },

  adminButton: {
    border: "none",
    background:
      "transparent",
    color: "#667085",
    cursor: "pointer",
  },
};

export default App;
