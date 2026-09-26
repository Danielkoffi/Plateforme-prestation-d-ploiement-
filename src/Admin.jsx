import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "./firebase-storage.js";

const STATUSES = [
  "Reçue",
  "Acceptée",
  "En cours",
  "Livrée",
  "Terminée",
];

function formatMoney(amount) {
  return (
    new Intl.NumberFormat("fr-FR").format(Number(amount || 0)) +
    " FCFA"
  );
}

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);

      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setOrders(data);
    } catch (error) {
      console.error("Erreur chargement commandes :", error);
      alert(
        "Impossible de charger les commandes. Vérifiez Firebase."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateOrder(id, field, value) {
    try {
      const orderRef = doc(db, "orders", id);

      await updateDoc(orderRef, {
        [field]: value,
      });

      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                [field]: value,
              }
            : order
        )
      );
    } catch (error) {
      console.error("Erreur modification :", error);
      alert(
        "La modification n'a pas pu être enregistrée."
      );
    }
  }

  const filteredOrders = orders.filter((order) => {
    const text = search.toLowerCase();

    return (
      String(order.orderNumber || "")
        .toLowerCase()
        .includes(text) ||
      String(order.clientName || "")
        .toLowerCase()
        .includes(text) ||
      String(order.email || "")
        .toLowerCase()
        .includes(text)
    );
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>Espace administrateur</h1>

        <p>
          Gestion des commandes Prestations Online
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une commande, un nom ou un e-mail..."
          style={{
            width: "100%",
            padding: "14px",
            margin: "20px 0",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        />

        {loading && <p>Chargement des commandes...</p>}

        {!loading && filteredOrders.length === 0 && (
          <p>Aucune commande trouvée.</p>
        )}

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {filteredOrders.map((order) => (
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
                <strong>Client :</strong>{" "}
                {order.clientName || "Non renseigné"}
              </p>

              <p>
                <strong>E-mail :</strong>{" "}
                {order.email || "Non renseigné"}
              </p>

              <p>
                <strong>Téléphone :</strong>{" "}
                {order.phone || "Non renseigné"}
              </p>

              <p>
                <strong>Prestation :</strong>{" "}
                {order.serviceName || "Non renseignée"}
              </p>

              <p>
                <strong>Montant :</strong>{" "}
                {formatMoney(order.amount)}
              </p>

              <p>
                <strong>Description :</strong>{" "}
                {order.description || "Aucune description"}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginTop: "18px",
                }}
              >
                <label>
                  <strong>Statut de la commande</strong>

                  <select
                    value={order.status || "Reçue"}
                    onChange={(e) =>
                      updateOrder(
                        order.id,
                        "status",
                        e.target.value
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px",
                      marginTop: "6px",
                    }}
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <strong>Statut du paiement</strong>

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
                      display: "block",
                      width: "100%",
                      padding: "12px",
                      marginTop: "6px",
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
