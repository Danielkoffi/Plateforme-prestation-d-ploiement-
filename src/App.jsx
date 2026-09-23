import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  Clock3,
  PackageCheck,
  CreditCard,
  X,
  BarChart3,
  Settings,
  ShoppingBag,
} from "lucide-react";

const STORAGE_KEY = "plateforme-prestations-orders-v1";
const CONFIG_KEY = "plateforme-prestations-config-v1";

const STATUS = ["En attente", "En cours", "Livrée", "Payée"];
const METHODS = ["Mobile Money", "Virement", "Espèces"];

const DEFAULT_CONFIG = {
  businessName: "Mes Prestations",
};

const DEFAULT_SERVICES = [
  { id: "web", name: "Création de site web" },
  { id: "design", name: "Design graphique" },
  { id: "video", name: "Montage vidéo" },
  { id: "social", name: "Gestion réseaux sociaux" },
  { id: "other", name: "Autre prestation" },
];

function money(value) {
  return (
    new Intl.NumberFormat("fr-FR").format(Number(value) || 0) + " FCFA"
  );
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function emptyForm() {
  return {
    client: "",
    service: DEFAULT_SERVICES[0].name,
    amount: "",
    status: "En attente",
    method: "Mobile Money",
    notes: "",
  };
}

export default function App() {
  const [orders, setOrders] = useState(() =>
    loadData(STORAGE_KEY, [])
  );

  const [config, setConfig] = useState(() =>
    loadData(CONFIG_KEY, DEFAULT_CONFIG)
  );

  const [services, setServices] = useState(DEFAULT_SERVICES);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");

  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    saveData(STORAGE_KEY, orders);
  }, [orders]);

  useEffect(() => {
    saveData(CONFIG_KEY, config);
  }, [config]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchSearch =
        !query ||
        order.client.toLowerCase().includes(query) ||
        order.service.toLowerCase().includes(query);

      const matchStatus =
        statusFilter === "Tous" || order.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const delivered = orders.filter((o) =>
      ["Livrée", "Payée"].includes(o.status)
    );

    const paid = orders.filter((o) => o.status === "Payée");

    const unpaid = orders.filter((o) => o.status === "Livrée");

    return {
      total: orders.length,

      pending: orders.filter(
        (o) => o.status === "En attente"
      ).length,

      progress: orders.filter(
        (o) => o.status === "En cours"
      ).length,

      delivered: orders.filter(
        (o) => o.status === "Livrée"
      ).length,

      revenue: delivered.reduce(
        (sum, o) => sum + Number(o.amount || 0),
        0
      ),

      paid: paid.reduce(
        (sum, o) => sum + Number(o.amount || 0),
        0
      ),

      unpaid: unpaid.reduce(
        (sum, o) => sum + Number(o.amount || 0),
        0
      ),
    };
  }, [orders]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(order) {
    setEditingId(order.id);

    setForm({
      client: order.client,
      service: order.service,
      amount: String(order.amount),
      status: order.status,
      method: order.method,
      notes: order.notes || "",
    });

    setShowForm(true);
  }

  function saveOrder(event) {
    event.preventDefault();

    if (!form.client.trim()) {
      alert("Veuillez saisir le nom du client.");
      return;
    }

    if (!form.service.trim()) {
      alert("Veuillez saisir la prestation.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    if (editingId) {
      setOrders((current) =>
        current.map((order) =>
          order.id === editingId
            ? {
                ...order,
                client: form.client.trim(),
                service: form.service.trim(),
                amount,
                status: form.status,
                method: form.method,
                notes: form.notes.trim(),
                updatedAt: new Date().toISOString(),
              }
            : order
        )
      );
    } else {
      const newOrder = {
        id: makeId(),
        client: form.client.trim(),
        service: form.service.trim(),
        amount,
        status: form.status,
        method: form.method,
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setOrders((current) => [newOrder, ...current]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function deleteOrder(id) {
    if (!window.confirm("Supprimer cette commande ?")) {
      return;
    }

    setOrders((current) =>
      current.filter((order) => order.id !== id)
    );
  }

  function changeStatus(id, status) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
              updatedAt: new Date().toISOString(),
            }
          : order
      )
    );
  }

  function addService() {
    const name = window.prompt(
      "Nom de la nouvelle prestation :"
    );

    if (!name?.trim()) {
      return;
    }

    setServices((current) => [
      ...current,
      {
        id: makeId(),
        name: name.trim(),
      },
    ]);
  }

  function removeService(id) {
    if (services.length <= 1) {
      return;
    }

    setServices((current) =>
      current.filter((service) => service.id !== id)
    );
  }

  function exportData() {
    const data = {
      config,
      services,
      orders,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "prestations-sauvegarde.json";

    link.click();

    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }

        if (Array.isArray(data.services)) {
          setServices(data.services);
        }

        if (data.config) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.config,
          });
        }

        alert("Sauvegarde importée.");
      } catch {
        alert("Fichier de sauvegarde invalide.");
      }
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="topbar">
        <div>
          <div className="eyebrow">
            PLATEFORME DE PRESTATIONS
          </div>

          <h1>{config.businessName}</h1>
        </div>

        <button
          className="iconButton"
          onClick={() => setShowSettings(true)}
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="main">
        {activeTab === "dashboard" && (
          <>
            <section className="hero">
              <span>Chiffre d'affaires</span>

              <strong>{money(stats.revenue)}</strong>

              <div className="heroGrid">
                <div>
                  <b>{money(stats.paid)}</b>
                  <span>Payé</span>
                </div>

                <div>
                  <b>{money(stats.unpaid)}</b>
                  <span>Livré non payé</span>
                </div>
              </div>
            </section>

            <section className="section">
              <h2>Activité</h2>

              <div className="statsGrid">
                <Stat
                  icon={<ShoppingBag />}
                  label="Commandes"
                  value={stats.total}
                />

                <Stat
                  icon={<Clock3 />}
                  label="En attente"
                  value={stats.pending}
                />

                <Stat
                  icon={<PackageCheck />}
                  label="En cours"
                  value={stats.progress}
                />

                <Stat
                  icon={<Check />}
                  label="Livrées"
                  value={stats.delivered}
                />
              </div>
            </section>

            <section className="section">
              <div className="sectionTitle">
                <h2>Commandes récentes</h2>

                <button
                  className="linkButton"
                  onClick={() => setActiveTab("orders")}
                >
                  Voir tout
                </button>
              </div>

              {orders.length === 0 ? (
                <Empty />
              ) : (
                <div className="list">
                  {orders.slice(0, 5).map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onEdit={() => openEdit(order)}
                      onDelete={() => deleteOrder(order.id)}
                      onStatus={(status) =>
                        changeStatus(order.id, status)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "orders" && (
          <section className="section first">
            <div className="sectionTitle">
              <h2>Commandes</h2>

              <button
                className="primary"
                onClick={openNew}
              >
                <Plus size={18} />
                Nouvelle
              </button>
            </div>

            <div className="searchRow">
              <div className="search">
                <Search size={18} />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Rechercher un client..."
                />
              </div>
            </div>

            <div className="filters">
              {["Tous", ...STATUS].map((status) => (
                <button
                  key={status}
                  className={
                    statusFilter === status
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setStatusFilter(status)
                  }
                >
                  {status}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <Empty />
            ) : (
              <div className="list">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onEdit={() => openEdit(order)}
                    onDelete={() => deleteOrder(order.id)}
                    onStatus={(status) =>
                      changeStatus(order.id, status)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "sales" && (
          <section className="section first">
            <h2>Ventes</h2>

            <div className="panel revenuePanel">
              <span>Total livré ou payé</span>

              <strong>{money(stats.revenue)}</strong>
            </div>

            <div className="panel">
              <h3>Répartition des commandes</h3>

              {STATUS.map((status) => {
                const count = orders.filter(
                  (order) => order.status === status
                ).length;

                return (
                  <div className="barRow" key={status}>
                    <span>{status}</span>
                    <b>{count}</b>
                  </div>
                );
              })}
            </div>

            <div className="panel">
              <h3>Par mode de paiement</h3>

              {METHODS.map((method) => {
                const total = orders
                  .filter(
                    (order) =>
                      order.status === "Payée" &&
                      order.method === method
                  )
                  .reduce(
                    (sum, order) =>
                      sum + Number(order.amount || 0),
                    0
                  );

                return (
                  <div className="barRow" key={method}>
                    <span>{method}</span>
                    <b>{money(total)}</b>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "services" && (
          <section className="section first">
            <div className="sectionTitle">
              <h2>Prestations</h2>

              <button
                className="primary"
                onClick={addService}
              >
                <Plus size={18} />
                Ajouter
              </button>
            </div>

            <div className="list">
              {services.map((service) => (
                <div
                  className="serviceCard"
                  key={service.id}
                >
                  <div>
                    <b>{service.name}</b>
                    <span>
                      Prix défini lors de la commande
                    </span>
                  </div>

                  <button
                    className="dangerIcon"
                    onClick={() =>
                      removeService(service.id)
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="bottomNav">
        <NavItem
          active={activeTab === "dashboard"}
          label="Accueil"
          icon={<BarChart3 size={20} />}
          onClick={() => setActiveTab("dashboard")}
        />

        <NavItem
          active={activeTab === "orders"}
          label="Commandes"
          icon={<ShoppingBag size={20} />}
          onClick={() => setActiveTab("orders")}
        />

        <NavItem
          active={activeTab === "sales"}
          label="Ventes"
          icon={<CreditCard size={20} />}
          onClick={() => setActiveTab("sales")}
        />

        <NavItem
          active={activeTab === "services"}
          label="Prestations"
          icon={<PackageCheck size={20} />}
          onClick={() => setActiveTab("services")}
        />
      </nav>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="modalHeader">
            <div>
              <div className="eyebrow">
                COMMANDE
              </div>

              <h2>
                {editingId
                  ? "Modifier la commande"
                  : "Nouvelle commande"}
              </h2>
            </div>

            <button
              className="iconButton"
              onClick={() => setShowForm(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={saveOrder}
            className="form"
          >
            <label>
              Client

              <input
                value={form.client}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client: e.target.value,
                  })
                }
                placeholder="Nom du client"
              />
            </label>

            <label>
              Prestation

              <select
                value={form.service}
                onChange={(e) =>
                  setForm({
                    ...form,
                    service: e.target.value,
                  })
                }
              >
                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.name}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Montant

              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value,
                  })
                }
                placeholder="Ex. 25000"
              />
            </label>

            <div className="twoCols">
              <label>
                Statut

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                >
                  {STATUS.map((status) => (
                    <option key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Paiement

                <select
                  value={form.method}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      method: e.target.value,
                    })
                  }
                >
                  {METHODS.map((method) => (
                    <option key={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Notes

              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
                placeholder="Informations complémentaires"
              />
            </label>

            <button
              className="primary submit"
              type="submit"
            >
              <Check size={18} />

              {editingId
                ? "Enregistrer"
                : "Créer la commande"}
            </button>
          </form>
        </Modal>
      )}

      {showSettings && (
        <Modal
          onClose={() => setShowSettings(false)}
        >
          <div className="modalHeader">
            <div>
              <div className="eyebrow">
                CONFIGURATION
              </div>

              <h2>Paramètres</h2>
            </div>

            <button
              className="iconButton"
              onClick={() =>
                setShowSettings(false)
              }
            >
              <X size={20} />
            </button>
          </div>

          <div className="form">
            <label>
              Nom de l'activité

              <input
                value={config.businessName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    businessName: e.target.value,
                  })
                }
              />
            </label>

            <button
              className="secondary"
              onClick={exportData}
            >
              Exporter mes données
            </button>

            <label className="fileButton">
              Importer une sauvegarde

              <input
                type="file"
                accept=".json"
                onChange={importData}
              />
            </label>

            <button
              className="dangerButton"
              onClick={() => {
                if (
                  !window.confirm(
                    "Effacer toutes les commandes ?"
                  )
                ) {
                  return;
                }

                setOrders([]);
              }}
            >
              Effacer toutes les commandes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="statIcon">
        {icon}
      </div>

      <b>{value}</b>

      <span>{label}</span>
    </div>
  );
}

function NavItem({
  active,
  label,
  icon,
  onClick,
}) {
  return (
    <button
      className={
        active
          ? "navItem active"
          : "navItem"
      }
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Empty() {
  return (
    <div className="empty">
      <ShoppingBag size={30} />

      <b>Aucune commande</b>

      <span>
        Les nouvelles commandes apparaîtront ici.
      </span>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="modalBackdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onEdit,
  onDelete,
  onStatus,
}) {
  return (
    <article className="orderCard">
      <div className="orderTop">
        <div>
          <b>{order.client}</b>

          <span>{order.service}</span>
        </div>

        <strong>
          {money(order.amount)}
        </strong>
      </div>

      <div className="orderMeta">
        <span
          className={`badge ${order.status
            .toLowerCase()
            .replaceAll(" ", "-")}`}
        >
          {order.status}
        </span>

        <span>{order.method}</span>

        <span>
          {formatDate(order.createdAt)}
        </span>
      </div>

      {order.notes && (
        <p className="notes">
          {order.notes}
        </p>
      )}

      <div className="orderActions">
        <select
          value={order.status}
          onChange={(e) =>
            onStatus(e.target.value)
          }
          aria-label="Changer le statut"
        >
          {STATUS.map((status) => (
            <option key={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          onClick={onEdit}
          title="Modifier"
        >
          <Pencil size={16} />
        </button>

        <button
          className="dangerIcon"
          onClick={onDelete}
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

const CSS = `
:root{
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:#18202a;
  background:#f4f5f7;
  --ink:#18202a;
  --muted:#6d7480;
  --line:#e3e6ea;
  --white:#fff;
  --mango:#ffb000;
  --red:#c93434;
  --blue:#2868d8;
}

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#f4f5f7;
}

button,
input,
select,
textarea{
  font:inherit;
}

button{
  cursor:pointer;
}

.app{
  min-height:100vh;
  padding-bottom:84px;
}

.topbar{
  background:#fff;
  padding:18px 16px 14px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-bottom:1px solid var(--line);
  position:sticky;
  top:0;
  z-index:10;
}

.topbar h1{
  margin:2px 0 0;
  font-size:21px;
}

.eyebrow{
  font-size:10px;
  font-weight:800;
  letter-spacing:.13em;
  color:var(--muted);
}

.iconButton{
  width:42px;
  height:42px;
  border:1px solid var(--line);
  border-radius:13px;
  background:#fff;
  display:grid;
  place-items:center;
  color:var(--ink);
}

.main{
  max-width:900px;
  margin:auto;
}

.hero{
  background:var(--ink);
  color:#fff;
  margin:16px;
  border-radius:20px;
  padding:20px;
}

.hero>span{
  color:#aeb6c1;
  font-size:13px;
}

.hero>strong{
  display:block;
  font-size:34px;
  margin-top:4px;
  color:var(--mango);
}

.heroGrid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  margin-top:18px;
  padding-top:15px;
  border-top:1px solid #3d454f;
}

.heroGrid b{
  display:block;
  font-size:17px;
  margin-bottom:3px;
}

.heroGrid span{
  color:#aeb6c1;
  font-size:13px;
}

.section{
  padding:18px 16px 0;
}

.section.first{
  padding-top:22px;
}

.section h2{
  font-size:18px;
  margin:0 0 10px;
}

.sectionTitle{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
}

.linkButton{
  border:0;
  background:none;
  color:var(--blue);
  font-weight:700;
}

.statsGrid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}

.stat{
  background:#fff;
  border:1px solid var(--line);
  border-radius:16px;
  padding:15px;
  min-height:110px;
}

.statIcon{
  color:var(--blue);
  margin-bottom:13px;
}

.stat b{
  display:block;
  font-size:25px;
}

.stat span{
  font-size:13px;
  color:var(--muted);
}

.primary,
.secondary,
.dangerButton,
.fileButton{
  border:0;
  border-radius:12px;
  padding:11px 14px;
  font-weight:800;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
}

.primary{
  background:var(--ink);
  color:#fff;
}

.secondary{
  background:#eef1f5;
  color:var(--ink);
}

.dangerButton{
  background:#ffe8e8;
  color:var(--red);
}

.fileButton{
  background:#eef1f5;
  color:var(--ink);
  position:relative;
}

.fileButton input{
  position:absolute;
  inset:0;
  opacity:0;
  cursor:pointer;
}

.searchRow{
  margin:14px 0 10px;
}

.search{
  background:#fff;
  border:1px solid var(--line);
  border-radius:13px;
  padding:0 13px;
  display:flex;
  align-items:center;
  gap:8px;
  color:var(--muted);
}

.search input{
  border:0;
  outline:0;
  padding:12px 0;
  width:100%;
  background:transparent;
}

.filters{
  display:flex;
  gap:7px;
  overflow:auto;
  padding-bottom:4px;
}

.filter{
  white-space:nowrap;
  border:1px solid var(--line);
  background:#fff;
  border-radius:999px;
  padding:8px 11px;
  font-size:12px;
  font-weight:700;
}

.filter.active{
  background:var(--ink);
  color:#fff;
  border-color:var(--ink);
}

.list{
  display:grid;
  gap:10px;
}

.orderCard,
.panel,
.serviceCard{
  background:#fff;
  border:1px solid var(--line);
  border-radius:16px;
  padding:14px;
}

.orderTop{
  display:flex;
  justify-content:space-between;
  gap:12px;
}

.orderTop b,
.orderTop span{
  display:block;
}

.orderTop span{
  font-size:13px;
  color:var(--muted);
  margin-top:3px;
}

.orderTop strong{
  white-space:nowrap;
}

.orderMeta{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
  color:var(--muted);
  font-size:12px;
  margin-top:12px;
}

.badge{
  padding:5px 8px;
  border-radius:999px;
  background:#eef1f5;
  color:var(--ink);
  font-weight:800;
}

.badge.en-attente{
  background:#fff3cd;
  color:#856404;
}

.badge.en-cours{
  background:#e4efff;
  color:#2054a3;
}

.badge.livrée{
  background:#e5f7ed;
  color:#16713f;
}

.badge.payée{
  background:#dff6e9;
  color:#12633a;
}

.notes{
  font-size:13px;
  color:#59616c;
  margin:10px 0 0;
}

.orderActions{
  display:flex;
  justify-content:flex-end;
  gap:7px;
  margin-top:12px;
}

.orderActions button,
.orderActions select{
  border:1px solid var(--line);
  background:#fff;
  border-radius:10px;
  padding:8px 9px;
}

.dangerIcon{
  color:var(--red)!important;
}

.empty{
  background:#fff;
  border:1px dashed #ccd1d7;
  border-radius:16px;
  padding:35px 20px;
  text-align:center;
  color:var(--muted);
  display:grid;
  place-items:center;
  gap:7px;
}

.empty b{
  color:var(--ink);
}

.bottomNav{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  background:#fff;
  border-top:1px solid var(--line);
  display:grid;
  grid-template-columns:repeat(4,1fr);
  z-index:20;
}

.navItem{
  border:0;
  background:#fff;
  color:var(--muted);
  padding:10px 3px 9px;
  display:grid;
  place-items:center;
  gap:4px;
  font-size:10px;
  font-weight:700;
}

.navItem.active{
  color:var(--ink);
}

.panel{
  margin-top:10px;
}

.panel h3{
  margin:0 0 15px;
  font-size:15px;
}

.revenuePanel{
  display:grid;
  gap:5px;
  background:var(--ink);
  color:#fff;
}

.revenuePanel span{
  color:#adb4bf;
  font-size:13px;
}

.revenuePanel strong{
  font-size:30px;
  color:var(--mango);
}

.barRow{
  display:flex;
  justify-content:space-between;
  padding:11px 0;
  border-bottom:1px solid var(--line);
}

.barRow:last-child{
  border-bottom:0;
}

.serviceCard{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
}

.serviceCard b,
.serviceCard span{
  display:block;
}

.serviceCard span{
  font-size:12px;
  color:var(--muted);
  margin-top:3px;
}

.modalBackdrop{
  position:fixed;
  inset:0;
  background:rgba(10,14,20,.55);
  z-index:50;
  display:flex;
  align-items:flex-end;
  justify-content:center;
}

.modal{
  background:#fff;
  width:min(100%,600px);
  max-height:92vh;
  overflow:auto;
  border-radius:22px 22px 0 0;
  padding:18px;
}

.modalHeader{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  margin-bottom:18px;
}

.modalHeader h2{
  margin:3px 0 0;
  font-size:21px;
}

.form{
  display:grid;
  gap:13px;
}

.form label{
  display:grid;
  gap:6px;
  font-size:13px;
  font-weight:800;
}

.form input,
.form select,
.form textarea{
  width:100%;
  border:1px solid #d6dae0;
  border-radius:11px;
  padding:11px 12px;
  outline:none;
  background:#fff;
}

.form input:focus,
.form select:focus,
.form textarea:focus{
  border-color:#8a94a2;
}

.twoCols{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.submit{
  margin-top:5px;
  width:100%;
}

@media(min-width:700px){
  .modalBackdrop{
    align-items:center;
  }

  .modal{
    border-radius:22px;
  }

  .statsGrid{
    grid-template-columns:repeat(4,1fr);
  }

  .bottomNav{
    left:50%;
    right:auto;
    transform:translateX(-50%);
    width:min(700px,100%);
  }
}
`;
