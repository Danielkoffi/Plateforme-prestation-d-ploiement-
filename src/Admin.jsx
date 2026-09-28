import React, { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { db, auth } from "./firebase-storage.js";

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

function prepareDownloadLink(url) {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);

    if (parsed.hostname.includes("dropbox.com")) {
      parsed.searchParams.set("dl", "1");
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [savingFile, setSavingFile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          return;
        }

        try {
          const adminRef = doc(
            db,
            "admins",
            currentUser.uid
          );

          const adminSnapshot =
            await getDoc(adminRef);

          if (!adminSnapshot.exists()) {
            setIsAdmin(false);

            setErrorMessage(
              "Document admin introuvable. UID connecté : " +
                currentUser.uid
            );

            await signOut(auth);
            return;
          }

          const adminData =
            adminSnapshot.data();

          if (adminData.role !== "admin") {
            setIsAdmin(false);

            setErrorMessage(
              "Document admin trouvé, mais le rôle est : " +
                String(adminData.role)
            );

            await signOut(auth);
            return;
          }

          setIsAdmin(true);
          setErrorMessage("");
        } catch (error) {
          console.error(
            "Erreur vérification administrateur :",
            error
          );

          setIsAdmin(false);

          setErrorMessage(
            "Erreur Firebase lors de la vérification administrateur : " +
              (error.code || error.message)
          );
        } finally {
          setCheckingAdmin(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
    }
  }, [isAdmin]);

  async function handleLogin(event) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage(
        "Veuillez saisir votre adresse e-mail."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Veuillez saisir votre mot de passe."
      );
      return;
    }

    try {
      setLoginLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (error) {
      console.error(
        "Erreur connexion :",
        error
      );

      setErrorMessage(
        "Erreur de connexion Firebase : " +
          (error.code || error.message)
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMessage("");

      const ordersRef =
        collection(db, "orders");

      const q = query(
        ordersRef,
        orderBy("createdAt", "desc")
      );

      const snapshot =
        await getDocs(q);

      const data = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      setOrders(data);
    } catch (error) {
      console.error(
        "Erreur chargement commandes :",
        error
      );

      setErrorMessage(
        "Impossible de charger les commandes : " +
          (error.code || error.message)
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(
    id,
    field,
    value
  ) {
    const order = orders.find(
      (item) => item.id === id
    );

    if (!order) {
      alert("Commande introuvable.");
      return false;
    }

    try {
      const orderRef = doc(
        db,
        "orders",
        id
      );

      await updateDoc(orderRef, {
        [field]: value,
        updatedAt: serverTimestamp(),
      });

      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
        )
      );

      /*
       * Synchronisation robuste avec tracking.
       *
       * setDoc(..., { merge: true }) permet :
       * - de modifier le document s'il existe ;
       * - de le créer s'il manque ;
       * - de conserver les autres informations.
       */
      if (order.trackingCode) {
        const trackingRef = doc(
          db,
          "tracking",
          order.trackingCode
        );

        const trackingUpdates = {
          orderNumber:
            order.orderNumber || "",
          trackingCode:
            order.trackingCode,
          serviceName:
            order.serviceName || "",
          amount:
            Number(order.amount || 0),
          updatedAt:
            serverTimestamp(),
        };

        if (field === "status") {
          trackingUpdates.status =
            value;
        }

        if (field === "paymentStatus") {
          trackingUpdates.paymentStatus =
            value;
        }

        if (field === "deliveryUrl") {
          trackingUpdates.deliveryUrl =
            value;
        }

        await setDoc(
          trackingRef,
          trackingUpdates,
          {
            merge: true,
          }
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Erreur modification :",
        error
      );

      alert(
        "La modification n'a pas pu être enregistrée : " +
          (error.code || error.message)
      );

      return false;
    }
  }

  async function saveDeliveryLink(order) {
    const rawLink = String(
      order.deliveryUrl || ""
    ).trim();

    if (!rawLink) {
      alert(
        "Veuillez saisir le lien du fichier livré."
      );
      return;
    }

    const finalLink =
      prepareDownloadLink(rawLink);

    try {
      setSavingFile(order.id);

      const saved =
        await updateOrder(
          order.id,
          "deliveryUrl",
          finalLink
        );

      if (!saved) {
        return;
      }

      alert(
        "Lien du fichier livré enregistré et synchronisé avec le suivi client."
      );
    } catch (error) {
      console.error(
        "Erreur enregistrement fichier :",
        error
      );

      alert(
        "Impossible d'enregistrer le lien du fichier."
      );
    } finally {
      setSavingFile(null);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);

      setUser(null);
      setIsAdmin(false);
      setOrders([]);
    } catch (error) {
      console.error(
        "Erreur déconnexion :",
        error
      );
    }
  }

  const filteredOrders =
    orders.filter((order) => {
      const text =
        search.toLowerCase();

      return (
        String(
          order.orderNumber || ""
        )
          .toLowerCase()
          .includes(text) ||
        String(
          order.clientName || ""
        )
          .toLowerCase()
          .includes(text) ||
        String(order.email || "")
          .toLowerCase()
          .includes(text) ||
        String(order.phone || "")
          .toLowerCase()
          .includes(text)
      );
    });

  if (checkingAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
          padding: "20px",
        }}
      >
        <p>
          Vérification de l'accès
          administrateur...
        </p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#fff",
            padding: "30px",
            borderRadius: "16px",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              marginTop: 0,
            }}
          >
            Administration
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: "25px",
            }}
          >
            Connectez-vous pour accéder
            aux commandes.
          </p>

          {errorMessage && (
            <div
              style={{
                background: "#ffecec",
                border:
                  "1px solid #ffb3b3",
                color: "#b00000",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                wordBreak:
                  "break-word",
              }}
            >
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleLogin}
          >
            <label
              style={{
                display: "block",
                marginBottom: "16px",
              }}
            >
              <strong>
                E-mail
              </strong>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="Adresse e-mail"
                autoComplete="email"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding: "13px",
                  marginTop: "7px",
                  border:
                    "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
              />
            </label>

            <label
              style={{
                display: "block",
                marginBottom: "20px",
              }}
            >
              <strong>
                Mot de passe
              </strong>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Mot de passe"
                autoComplete="current-password"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding: "13px",
                  marginTop: "7px",
                  border:
                    "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={
                loginLoading
              }
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "8px",
                cursor:
                  loginLoading
                    ? "not-allowed"
                    : "pointer",
                fontSize: "16px",
                fontWeight:
                  "bold",
              }}
            >
              {loginLoading
                ? "Connexion..."
                : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "24px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: "5px",
              }}
            >
              Espace administrateur
            </h1>

            <p
              style={{
                marginTop: 0,
              }}
            >
              Gestion des commandes
              Prestations Online
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding:
                "11px 16px",
              border:
                "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "#ffecec",
              border:
                "1px solid #ffb3b3",
              color: "#b00000",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              wordBreak:
                "break-word",
            }}
          >
            {errorMessage}
          </div>
        )}

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Rechercher une commande, un nom, un e-mail ou un téléphone..."
          style={{
            width: "100%",
            padding: "14px",
            margin:
              "10px 0 20px",
            border:
              "1px solid #ddd",
            borderRadius: "8px",
            boxSizing:
              "border-box",
          }}
        />

        {loading && (
          <p>
            Chargement des
            commandes...
          </p>
        )}

        {!loading &&
          filteredOrders.length ===
            0 && (
            <p>
              Aucune commande
              trouvée.
            </p>
          )}

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {filteredOrders.map(
            (order) => (
              <div
                key={order.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                <h2>
                  {order.orderNumber}
                </h2>

                <p>
                  <strong>
                    Client :
                  </strong>{" "}
                  {order.clientName ||
                    "Non renseigné"}
                </p>

                <p>
                  <strong>
                    E-mail :
                  </strong>{" "}
                  {order.email ||
                    "Non renseigné"}
                </p>

                <p>
                  <strong>
                    Téléphone :
                  </strong>{" "}
                  {order.phone ||
                    "Non renseigné"}
                </p>

                <p>
                  <strong>
                    Prestation :
                  </strong>{" "}
                  {order.serviceName ||
                    "Non renseignée"}
                </p>

                <p>
                  <strong>
                    Montant :
                  </strong>{" "}
                  {formatMoney(
                    order.amount
                  )}
                </p>

                <p>
                  <strong>
                    Description :
                  </strong>{" "}
                  {order.description ||
                    "Aucune description"}
                </p>

                <p>
                  <strong>
                    Moyen de paiement :
                  </strong>{" "}
                  {order.paymentMethod ||
                    "Non renseigné"}
                </p>

                {order.trackingCode && (
                  <p>
                    <strong>
                      Code de suivi :
                    </strong>{" "}
                    {order.trackingCode}
                  </p>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop:
                      "18px",
                  }}
                >
                  <label>
                    <strong>
                      Statut de la
                      commande
                    </strong>

                    <select
                      value={
                        order.status ||
                        "Reçue"
                      }
                      onChange={(e) =>
                        updateOrder(
                          order.id,
                          "status",
                          e.target.value
                        )
                      }
                      style={{
                        display:
                          "block",
                        width: "100%",
                        padding:
                          "12px",
                        marginTop:
                          "6px",
                      }}
                    >
                      {STATUSES.map(
                        (status) => (
                          <option
                            key={
                              status
                            }
                            value={
                              status
                            }
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <strong>
                      Statut du
                      paiement
                    </strong>

                    <select
                      value={
                        order.paymentStatus ||
                        "Non payé"
                      }
                      onChange={(e) =>
                        updateOrder(
                          order.id,
                          "paymentStatus",
                          e.target.value
                        )
                      }
                      style={{
                        display:
                          "block",
                        width: "100%",
                        padding:
                          "12px",
                        marginTop:
                          "6px",
                      }}
                    >
                      <option value="Non payé">
                        Non payé
                      </option>

                      <option value="Payé">
                        Payé
                      </option>
                    </select>
                  </label>

                  <label>
                    <strong>
                      Lien du fichier
                      livré
                    </strong>

                    <input
                      type="url"
                      value={
                        order.deliveryUrl ||
                        ""
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value;

                        setOrders(
                          (current) =>
                            current.map(
                              (item) =>
                                item.id ===
                                order.id
                                  ? {
                                      ...item,
                                      deliveryUrl:
                                        value,
                                    }
                                  : item
                            )
                        );
                      }}
                      placeholder="Collez ici le lien Dropbox..."
                      style={{
                        display:
                          "block",
                        width: "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "12px",
                        marginTop:
                          "6px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        saveDeliveryLink(
                          order
                        )
                      }
                      disabled={
                        savingFile ===
                        order.id
                      }
                      style={{
                        width:
                          "100%",
                        marginTop:
                          "8px",
                        padding:
                          "12px",
                        border: "none",
                        borderRadius:
                          "8px",
                        cursor:
                          savingFile ===
                          order.id
                            ? "not-allowed"
                            : "pointer",
                        fontWeight:
                          "bold",
                      }}
                    >
                      {savingFile ===
                      order.id
                        ? "Enregistrement..."
                        : "Enregistrer le fichier livré"}
                    </button>

                    {order.deliveryUrl && (
                      <a
                        href={prepareDownloadLink(
                          order.deliveryUrl
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display:
                            "block",
                          marginTop:
                            "10px",
                          textAlign:
                            "center",
                          padding:
                            "10px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "8px",
                          textDecoration:
                            "none",
                        }}
                      >
                        Tester le téléchargement
                      </a>
                    )}
                  </label>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
