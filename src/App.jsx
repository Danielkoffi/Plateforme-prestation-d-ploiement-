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

const SERVICES = [
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

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `CMD-${y}${m}${d}-${random}`;
}

function generateTrackingCode() {
  const random = crypto
    .randomUUID()
    .replaceAll("-", "")
    .toUpperCase();

  return `TRK-${random.substring(0, 24)}`;
}

export default function App() {
  const [page, setPage] = useState("home");

  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("site-web");
  const [amount, setAmount] = useState(50000);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("Mobile Money");

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    initializeFirebaseAuth();
  }, []);

  async function initializeFirebaseAuth() {
    try {
      setError("");

      console.log("========== INITIALISATION FIREBASE ==========");

      console.log(
        "FIREBASE PROJECT RÉEL :",
        auth.app.options.projectId
      );

      console.log(
        "FIREBASE AUTH DOMAIN :",
        auth.app.options.authDomain
      );

      console.log(
        "FIREBASE APP ID :",
        auth.app.options.appId
      );

      if (!auth.currentUser) {
        const result = await signInAnonymously(auth);

        console.log(
          "AUTHENTIFICATION FIREBASE OK",
          result.user.uid
        );
      } else {
        console.log(
          "UTILISATEUR FIREBASE DÉJÀ CONNECTÉ",
          auth.currentUser.uid
        );
      }

      setAuthReady(true);

      console.log(
        "FIRESTORE DATABASE : default"
      );

      console.log(
        "========== FIREBASE PRÊT =========="
      );
    } catch (e) {
      console.error(
        "ERREUR AUTH FIREBASE :",
        e
      );

      setAuthReady(false);

      const firebaseError =
        `AUTH FIREBASE : ${
          e?.code || "unknown"
        } - ${
          e?.message || String(e)
        }`;

      setError(firebaseError);
    }
  }

  function handleServiceChange(value) {
    setServiceId(value);

    const service = SERVICES.find(
      (item) => item.id === value
    );

    if (service) {
      setAmount(service.price);
    }
  }

  async function submitOrder(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      console.log(
        "========== NOUVELLE COMMANDE =========="
      );

      if (!clientName.trim()) {
        throw new Error(
          "Le nom du client est obligatoire."
        );
      }

      if (!email.trim()) {
        throw new Error(
          "L'adresse email est obligatoire."
        );
      }

      if (!phone.trim()) {
        throw new Error(
          "Le téléphone est obligatoire."
        );
      }

      if (!description.trim()) {
        throw new Error(
          "La description de la prestation est obligatoire."
        );
      }

      // =====================================================
      // AUTHENTIFICATION FIREBASE
      // =====================================================

      let clientId =
        auth.currentUser?.uid;

      if (!clientId) {
        console.log(
          "Utilisateur non connecté. Authentification anonyme..."
        );

        const result =
          await signInAnonymously(auth);

        clientId =
          result.user.uid;

        console.log(
          "AUTHENTIFICATION ANONYME OK :",
          clientId
        );
      }

      if (!clientId) {
        throw new Error(
          "Firebase Authentication n'a pas fourni d'identifiant utilisateur."
        );
      }

      console.log(
        "CLIENT UID :",
        clientId
      );

      console.log(
        "PROJET FIREBASE UTILISÉ :",
        auth.app.options.projectId
      );

      console.log(
        "AUTH DOMAIN UTILISÉ :",
        auth.app.options.authDomain
      );

      // =====================================================
      // IDENTIFIANTS COMMANDE
      // =====================================================

      const orderNumber =
        generateOrderNumber();

      const newTrackingCode =
        generateTrackingCode();

      console.log(
        "NUMÉRO COMMANDE :",
        orderNumber
      );

      console.log(
        "CODE TRACKING :",
        newTrackingCode
      );

      // =====================================================
      // SERVICE
      // =====================================================

      const service =
        SERVICES.find(
          (item) =>
            item.id === serviceId
        );

      if (!service) {
        throw new Error(
          "Prestation introuvable."
        );
      }

      // =====================================================
      // ORDERS
      // =====================================================

      const orderRef = doc(
        collection(db, "orders")
      );

      console.log(
        "ORDERS COLLECTION : orders"
      );

      console.log(
        "ORDERS DOCUMENT ID :",
        orderRef.id
      );

      const orderData = {
        orderNumber,
        trackingCode:
          newTrackingCode,

        clientId,

        clientName:
          clientName.trim(),

        email:
          email.trim(),

        phone:
          phone.trim(),

        serviceId:
          service.id,

        serviceName:
          service.name,

        amount:
          Number(amount) || 0,

        description:
          description.trim(),

        paymentMethod,

        status:
          "En attente",

        paymentStatus:
          "En attente",

        createdAt:
          serverTimestamp(),
      };

      console.log(
        "DONNÉES ORDERS :",
        orderData
      );

      console.log(
        "TENTATIVE ÉCRITURE ORDERS..."
      );

      try {
        await setDoc(
          orderRef,
          orderData
        );

        console.log(
          "ORDERS : ÉCRITURE RÉUSSIE"
        );
      } catch (e) {
        console.error(
          "ORDERS : ERREUR FIREBASE",
          e
        );

        throw new Error(
          `ORDERS FIREBASE : ${
            e?.code || "unknown"
          } - ${
            e?.message || String(e)
          }`
        );
      }

      // =====================================================
      // VÉRIFICATION ORDERS
      // =====================================================

      console.log(
        "VÉRIFICATION ORDERS..."
      );

      try {
        const verification =
          await getDoc(orderRef);

        if (
          !verification.exists()
        ) {
          throw new Error(
            "Le document orders n'a pas été retrouvé après l'écriture."
          );
        }

        console.log(
          "ORDERS : DOCUMENT VÉRIFIÉ"
        );

        console.log(
          "ORDERS DATA :",
          verification.data()
        );
      } catch (e) {
        console.error(
          "ORDERS : ERREUR VÉRIFICATION",
          e
        );

        throw new Error(
          `ORDERS VÉRIFICATION : ${
            e?.code || "unknown"
          } - ${
            e?.message || String(e)
          }`
        );
      }

      // =====================================================
      // TRACKING
      // =====================================================

      const trackingRef =
        doc(
          db,
          "tracking",
          newTrackingCode
        );

      console.log(
        "TRACKING DOCUMENT ID :",
        newTrackingCode
      );

      const trackingData = {
        trackingCode:
          newTrackingCode,

        orderId:
          orderRef.id,

        orderNumber,

        clientId,

        clientName:
          clientName.trim(),

        serviceName:
          service.name,

        status:
          "En attente",

        paymentStatus:
          "En attente",

        deliveryUrl:
          "",

        createdAt:
          serverTimestamp(),
      };

      console.log(
        "DONNÉES TRACKING :",
        trackingData
      );

      console.log(
        "TENTATIVE ÉCRITURE TRACKING..."
      );

      try {
        await setDoc(
          trackingRef,
          trackingData
        );

        console.log(
          "TRACKING : ÉCRITURE RÉUSSIE"
        );
      } catch (e) {
        console.error(
          "TRACKING : ERREUR FIREBASE",
          e
        );

        throw new Error(
          `TRACKING FIREBASE : ${
            e?.code || "unknown"
          } - ${
            e?.message || String(e)
          }`
        );
      }

      // =====================================================
      // VÉRIFICATION TRACKING
      // =====================================================

      console.log(
        "VÉRIFICATION TRACKING..."
      );

      try {
        const trackingVerification =
          await getDoc(
            trackingRef
          );

        if (
          !trackingVerification.exists()
        ) {
          throw new Error(
            "Le document tracking n'a pas été retrouvé après l'écriture."
          );
        }

        console.log(
          "TRACKING : DOCUMENT VÉRIFIÉ"
        );

        console.log(
          "TRACKING DATA :",
          trackingVerification.data()
        );
      } catch (e) {
        console.error(
          "TRACKING : ERREUR VÉRIFICATION",
          e
        );

        throw new Error(
          `TRACKING VÉRIFICATION : ${
            e?.code || "unknown"
          } - ${
            e?.message || String(e)
          }`
        );
      }

      // =====================================================
      // SUCCÈS
      // =====================================================

      const successMessage =
        `Commande ${orderNumber} enregistrée dans Firebase. ` +
        `Orders et Tracking sont enregistrés.`;

      setMessage(
        successMessage
      );

      setLastOrder({
        orderNumber,
        trackingCode:
          newTrackingCode,
        orderId:
          orderRef.id,
      });

      setTrackingCode(
        newTrackingCode
      );

      console.log(
        "=========================================="
      );

      console.log(
        "COMMANDE ENREGISTRÉE AVEC SUCCÈS"
      );

      console.log(
        "PROJET FIREBASE :",
        auth.app.options.projectId
      );

      console.log(
        "ORDERS ID :",
        orderRef.id
      );

      console.log(
        "TRACKING ID :",
        newTrackingCode
      );

      console.log(
        "=========================================="
      );

      // =====================================================
      // RÉINITIALISATION
      // =====================================================

      setClientName("");
      setEmail("");
      setPhone("");
      setDescription("");
    } catch (e) {
      console.error(
        "ERREUR COMMANDE :",
        e
      );

      const finalError =
        e?.message ||
        "Une erreur inconnue est survenue.";

      setError(
        finalError
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // RECHERCHE TRACKING
  // =====================================================

  async function searchTracking(e) {
    e.preventDefault();

    setTrackingResult(null);
    setError("");
    setMessage("");

    const code =
      trackingCode
        .trim()
        .toUpperCase();

    if (!code) {
      setError(
        "Entre un code de suivi."
      );
      return;
    }

    try {
      const trackingRef =
        doc(
          db,
          "tracking",
          code
        );

      console.log(
        "RECHERCHE TRACKING :",
        code
      );

      const result =
        await getDoc(
          trackingRef
        );

      if (!result.exists()) {
        setError(
          "Aucune commande trouvée avec ce code de suivi."
        );
        return;
      }

      setTrackingResult(
        result.data()
      );
    } catch (e) {
      console.error(
        "ERREUR TRACKING :",
        e
      );

      setError(
        `TRACKING LECTURE : ${
          e?.code || "unknown"
        } - ${
          e?.message || String(e)
        }`
      );
    }
  }

  // =====================================================
  // ADMIN
  // =====================================================

  if (page === "admin") {
    return (
      <div>
        <button
          onClick={() =>
            setPage("home")
          }
          style={{
            margin: 20,
            padding:
              "10px 15px",
          }}
        >
          Retour au site
        </button>

        <Admin />
      </div>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 20,
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: 30,
        }}
      >
        <h1>
          Prestations Online
        </h1>

        <p>
          Commandez une prestation
          en ligne et suivez votre
          commande.
        </p>

        <div
          style={{
            padding: 10,
            background:
              authReady
                ? "#e8f5e9"
                : "#fff3cd",
            borderRadius: 8,
            marginTop: 10,
          }}
        >
          Firebase :
          {" "}
          {authReady
            ? "Connecté"
            : "Connexion en cours..."}
        </div>
      </header>

      {message && (
        <div
          style={{
            padding: 15,
            marginBottom: 20,
            background:
              "#d4edda",
            color:
              "#155724",
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 15,
            marginBottom: 20,
            background:
              "#f8d7da",
            color:
              "#721c24",
            borderRadius: 8,
            border:
              "2px solid #dc3545",
            whiteSpace:
              "pre-wrap",
            wordBreak:
              "break-word",
          }}
        >
          <strong>
            ERREUR :
          </strong>

          <br />

          {error}
        </div>
      )}

      <section
        style={{
          marginBottom: 40,
        }}
      >
        <h2>
          Passer une commande
        </h2>

        <form
          onSubmit={
            submitOrder
          }
        >
          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Nom du client
            </label>

            <input
              type="text"
              value={
                clientName
              }
              onChange={(e) =>
                setClientName(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
              placeholder="Votre nom"
            />
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
              placeholder="email@example.com"
            />
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Téléphone
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
              placeholder="Votre numéro"
            />
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Prestation
            </label>

            <select
              value={
                serviceId
              }
              onChange={(e) =>
                handleServiceChange(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              {SERVICES.map(
                (service) => (
                  <option
                    key={
                      service.id
                    }
                    value={
                      service.id
                    }
                  >
                    {
                      service.name
                    }{" "}
                    —{" "}
                    {service.price.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    FCFA
                  </option>
                )
              )}
            </select>
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Montant
            </label>

            <input
              type="number"
              value={
                amount
              }
              onChange={(e) =>
                setAmount(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Description de la
              prestation
            </label>

            <textarea
              value={
                description
              }
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                minHeight: 120,
              }}
              placeholder="Décrivez ce que vous souhaitez..."
            />
          </div>

          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label>
              Mode de paiement
            </label>

            <select
              value={
                paymentMethod
              }
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
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
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !authReady
            }
            style={{
              padding:
                "14px 20px",
              border: "none",
              borderRadius: 8,
              background:
                loading ||
                !authReady
                  ? "#9ca3af"
                  : "#111827",
              color: "#fff",
              width: "100%",
              fontSize: 16,
              cursor:
                loading ||
                !authReady
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Enregistrement..."
              : !authReady
              ? "Connexion Firebase..."
              : "Commander"}
          </button>
        </form>
      </section>

      {lastOrder && (
        <section
          style={{
            padding: 20,
            marginBottom: 30,
            background:
              "#eef6ff",
            borderRadius: 10,
          }}
        >
          <h2>
            Commande enregistrée
          </h2>

          <p>
            <strong>
              Numéro de commande :
            </strong>
            <br />
            {
              lastOrder.orderNumber
            }
          </p>

          <p>
            <strong>
              Code de suivi :
            </strong>
            <br />
            {
              lastOrder.trackingCode
            }
          </p>

          <p>
            <strong>
              Document Orders :
            </strong>
            <br />
            {
              lastOrder.orderId
            }
          </p>
        </section>
      )}

      <section
        style={{
          marginBottom: 30,
        }}
      >
        <h2>
          Suivre une commande
        </h2>

        <form
          onSubmit={
            searchTracking
          }
        >
          <input
            type="text"
            value={
              trackingCode
            }
            onChange={(e) =>
              setTrackingCode(
                e.target.value
              )
            }
            style={
              inputStyle
            }
            placeholder="TRK-..."
          />

          <button
            type="submit"
            style={{
              marginTop: 10,
              padding:
                "12px 18px",
              border: "none",
              borderRadius: 8,
              background:
                "#2563eb",
              color: "#fff",
            }}
          >
            Rechercher
          </button>
        </form>

        {trackingResult && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              background:
                "#f3f4f6",
              borderRadius: 10,
            }}
          >
            <p>
              <strong>
                Commande :
              </strong>{" "}
              {
                trackingResult.orderNumber
              }
            </p>

            <p>
              <strong>
                Prestation :
              </strong>{" "}
              {
                trackingResult.serviceName
              }
            </p>

            <p>
              <strong>
                Statut :
              </strong>{" "}
              {
                trackingResult.status
              }
            </p>

            <p>
              <strong>
                Paiement :
              </strong>{" "}
              {
                trackingResult.paymentStatus
              }
            </p>
          </div>
        )}
      </section>

      <button
        onClick={() =>
          setPage("admin")
        }
        style={{
          padding:
            "12px 18px",
          border:
            "1px solid #ccc",
          borderRadius: 8,
          background: "#fff",
        }}
      >
        Administration
      </button>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing:
    "border-box",
  padding: 12,
  marginTop: 6,
  border:
    "1px solid #ccc",
  borderRadius: 8,
  fontSize: 16,
};
