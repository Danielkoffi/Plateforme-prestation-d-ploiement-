import React, { useEffect, useMemo, useState } from "react";
import Admin from "./Admin.jsx";

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Headphones,
  LockKeyhole,
  Menu,
  PackageCheck,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserRound,
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

import {
  onAuthStateChanged,
} from "firebase/auth";

const API_BASE =
  "https://plateforme-prestation-d-ploiement.onrender.com";

const APP_URL = "https://prestations-5f025.web.app/";

const SERVICES = [
  {
    id: "video",
    title: "Vidéo publicitaire IA",
    description:
      "Création d’une vidéo publicitaire professionnelle pour présenter votre activité, produit ou restaurant.",
    price: 15000,
    icon: PlayCircle,
    popular: true,
  },
  {
    id: "design",
    title: "Design graphique",
    description:
      "Création de visuels professionnels pour votre entreprise, marque, événement ou communication.",
    price: 10000,
    icon: Sparkles,
  },
  {
    id: "web",
    title: "Création de site web",
    description:
      "Création d’une présence web moderne adaptée à votre activité et à vos besoins.",
    price: 30000,
    icon: Search,
  },
  {
    id: "social",
    title: "Contenu réseaux sociaux",
    description:
      "Création de contenus adaptés à Instagram, Facebook, TikTok et autres plateformes.",
    price: 10000,
    icon: Star,
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
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function getStatusIndex(status) {
  const index = STATUS_STEPS.indexOf(status);
  return index < 0 ? 0 : index;
}

function App() {
  const isAdminPage =
    window.location.pathname.replace(/\/+$/, "") === "/admin";

  if (isAdminPage) {
    return <Admin />;
  }

  return <ClientApp />;
}

function ClientApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");

  const [selectedService, setSelectedService] = useState(null);

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    let unsubscribe;

    async function initAuth() {
      try {
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        });

        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erreur authentification:", error);
        setAuthLoading(false);
      }
    }

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadMyOrders(user.uid);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const order = params.get("order");

    if (!payment) return;

    if (payment === "success") {
      setPaymentMessage(
        `Paiement confirmé pour la commande ${order || ""}.`
      );
    } else if (payment === "pending") {
      setPaymentMessage(
        "Le paiement est encore en cours de vérification."
      );
    } else if (payment === "failed") {
      setPaymentMessage(
        "Le paiement n'a pas été confirmé."
      );
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function loadMyOrders(uid) {
    if (!uid) return;

    try {
      setOrdersLoading(true);

      const q = query(
        collection(db, "orders"),
        where("customerUid", "==", uid)
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      list.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds ||
          a.createdAt?.toMillis?.() ||
          0;

        const bTime =
          b.createdAt?.seconds ||
          b.createdAt?.toMillis?.() ||
          0;

        return bTime - aTime;
      });

      setOrders(list);
    } catch (error) {
      console.error("Erreur chargement commandes:", error);
    } finally {
      setOrdersLoading(false);
    }
  }

  function scrollToSection(section) {
    setMobileMenu(false);
    setActiveSection(section);

    const element = document.getElementById(section);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function openOrder(service = null) {
    setSelectedService(service);

    if (service) {
      setForm((previous) => ({
        ...previous,
        description: `${service.title} - `,
      }));
    }

    setTimeout(() => {
      scrollToSection("commander");
    }, 50);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function generateOrderNumber() {
    const date = new Date();

    const part1 = date
      .getTime()
      .toString()
      .slice(-8);

    const part2 = Math.floor(
      1000 + Math.random() * 9000
    );

    return `CMD-${part1}-${part2}`;
  }

  function generateTrackingCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "TRK-";

    for (let i = 0; i < 8; i++) {
      result += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return result;
  }

  async function handleCreateOrder(event) {
    event.preventDefault();

    if (!user) {
      alert("Veuillez patienter pendant la connexion.");
      return;
    }

    if (!selectedService) {
      alert("Veuillez sélectionner une prestation.");
      return;
    }

    if (!form.customerName.trim()) {
      alert("Veuillez renseigner votre nom.");
      return;
    }

    if (!form.email.trim()) {
      alert("Veuillez renseigner votre adresse e-mail.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Veuillez renseigner votre numéro de téléphone.");
      return;
    }

    if (!form.description.trim()) {
      alert("Veuillez décrire votre besoin.");
      return;
    }

    try {
      setSubmitting(true);
      setPaymentMessage("");

      const orderNumber = generateOrderNumber();
      const trackingCode = generateTrackingCode();

      const orderData = {
        orderNumber,
        trackingCode,
        customerUid: user.uid,

        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),

        serviceId: selectedService.id,
        serviceTitle: selectedService.title,

        description: form.description.trim(),

        amount: Number(selectedService.price),

        status: "Reçue",
        paymentStatus: "Non payé",

        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "orders", orderNumber),
        orderData
      );

      await setDoc(
        doc(db, "tracking", trackingCode),
        {
          orderId: orderNumber,
          orderNumber,
          trackingCode,

          customerUid: user.uid,

          customerName: form.customerName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),

          serviceTitle: selectedService.title,
          description: form.description.trim(),

          amount: Number(selectedService.price),

          status: "Reçue",
          paymentStatus: "Non payé",

          deliveryUrl: "",

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      const newOrder = {
        ...orderData,
        id: orderNumber,
      };

      setCreatedOrder(newOrder);

      setForm({
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        description: "",
      });

      await loadMyOrders(user.uid);

      setTimeout(() => {
        const element =
          document.getElementById("confirmation");

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    } catch (error) {
      console.error("Erreur création commande:", error);

      alert(
        "Impossible de créer la commande pour le moment. Veuillez réessayer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayment(order) {
    if (!order) return;

    try {
      setPaymentLoading(true);
      setPaymentMessage("");

      const response = await fetch(
        `${API_BASE}/api/paydunya/create-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            amount: Number(order.amount),
            description:
              order.serviceTitle ||
              "Prestation en ligne",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            "Impossible de créer le paiement."
        );
      }

      if (!data.paymentUrl) {
        throw new Error(
          "Lien de paiement indisponible."
        );
      }

      window.location.href = data.paymentUrl;
    } catch (error) {
      console.error("Erreur paiement:", error);

      setPaymentMessage(
        error.message ||
          "Une erreur est survenue lors du paiement."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleTracking(event) {
    event.preventDefault();

    const code = trackingCode.trim().toUpperCase();

    if (!code) {
      setTrackingError(
        "Veuillez saisir votre numéro de suivi."
      );
      setTrackingResult(null);
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError("");
      setTrackingResult(null);

      const q = query(
        collection(db, "tracking"),
        where("trackingCode", "==", code)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTrackingError(
          "Aucune commande ne correspond à ce numéro de suivi."
        );
        return;
      }

      const item = snapshot.docs[0];

      const result = {
        id: item.id,
        ...item.data(),
      };

      if (
        user &&
        result.customerUid &&
        result.customerUid !== user.uid
      ) {
        setTrackingError(
          "Cette commande n'est pas associée à cette session."
        );
        return;
      }

      setTrackingResult(result);
    } catch (error) {
      console.error(
        "Erreur suivi commande:",
        error
      );

      setTrackingError(
        "Impossible de récupérer la commande."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  const selectedPrice = useMemo(() => {
    return selectedService?.price || 0;
  }, [selectedService]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f8fafc;
        }

        * {
          box-sizing: border-box;
        }

        .platform-shadow {
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.06),
            0 2px 8px rgba(15, 23, 42, 0.03);
        }

        .hero-grid {
          background-image:
            linear-gradient(
              rgba(99, 102, 241, 0.06) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(99, 102, 241, 0.06) 1px,
              transparent 1px
            );
          background-size: 32px 32px;
        }

        .glass {
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(16px);
        }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => scrollToSection("accueil")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Sparkles size={21} />
            </div>

            <div className="text-left">
              <div className="text-lg font-extrabold tracking-tight text-slate-900">
                Prestations
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Services en ligne
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <button
              onClick={() => scrollToSection("accueil")}
              className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              Accueil
            </button>

            <button
              onClick={() => scrollToSection("services")}
              className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              Services
            </button>

            <button
              onClick={() => scrollToSection("fonctionnement")}
              className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              Comment ça marche
            </button>

            <button
              onClick={() => scrollToSection("suivi")}
              className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              Suivre une commande
            </button>

            <button
              onClick={() => scrollToSection("mes-commandes")}
              className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              Mes commandes
            </button>
          </nav>

          <div className="hidden md:block">
            <button
              onClick={() => openOrder(SERVICES[0])}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              Commander
              <ArrowRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden"
            aria-label="Menu"
          >
            {mobileMenu ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </div>

        {mobileMenu && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ["accueil", "Accueil"],
                ["services", "Services"],
                ["fonctionnement", "Comment ça marche"],
                ["suivi", "Suivre une commande"],
                ["mes-commandes", "Mes commandes"],
                ["commander", "Commander"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {paymentMessage && (
        <div className="border-b border-indigo-100 bg-indigo-50">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-800 sm:px-6 lg:px-8">
            <CheckCircle2 size={18} />
            <span>{paymentMessage}</span>

            <button
              onClick={() => setPaymentMessage("")}
              className="ml-auto rounded-lg p-1 hover:bg-indigo-100"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      <main>
        <section
          id="accueil"
          className="relative overflow-hidden border-b border-slate-200 bg-white"
        >
          <div className="hero-grid absolute inset-0" />

          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                <BadgeCheck size={17} />
                Prestations professionnelles en ligne
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Donnez vie à vos
                <span className="text-indigo-600">
                  {" "}projets numériques.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Commandez des services créatifs et numériques
                en ligne, suivez votre commande et recevez votre
                livraison dans un espace simple et sécurisé.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => openOrder(SERVICES[0])}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700"
                >
                  Commander une prestation
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() =>
                    scrollToSection("services")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Découvrir les services
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={17}
                    className="text-emerald-600"
                  />
                  Paiement sécurisé
                </div>

                <div className="flex items-center gap-2">
                  <Clock3
                    size={17}
                    className="text-indigo-600"
                  />
                  Suivi de commande
                </div>

                <div className="flex items-center gap-2">
                  <Headphones
                    size={17}
                    className="text-blue-600"
                  />
                  Assistance
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="platform-shadow glass relative rounded-3xl border border-white p-5">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-indigo-100">
                        Votre projet
                      </div>
                      <div className="mt-1 text-2xl font-extrabold">
                        Simple. Suivi. Livré.
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/15 p-3">
                      <PackageCheck size={25} />
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    {[
                      ["1", "Commande reçue", true],
                      ["2", "Production en cours", true],
                      ["3", "Livraison", false],
                    ].map(([number, text, done]) => (
                      <div
                        key={number}
                        className="flex items-center gap-3 rounded-xl bg-white/10 p-3"
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            done
                              ? "bg-white text-indigo-600"
                              : "border border-white/30 text-white"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            number
                          )}
                        </div>

                        <div className="font-semibold">
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-2 pt-5">
                  <MiniStat
                    icon={<ShieldCheck size={17} />}
                    title="Sécurisé"
                  />
                  <MiniStat
                    icon={<Truck size={17} />}
                    title="Livraison"
                  />
                  <MiniStat
                    icon={<Star size={17} />}
                    title="Qualité"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <SectionHeading
            eyebrow="Nos services"
            title="Des prestations adaptées à vos besoins"
            description="Choisissez un service, décrivez votre projet et passez votre commande directement en ligne."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.id}
                  className="group platform-shadow relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-indigo-200"
                >
                  {service.popular && (
                    <div className="absolute right-4 top-4 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                      Populaire
                    </div>
                  )}

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                    {service.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                    {service.description}
                  </p>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      À partir de
                    </div>

                    <div className="mt-1 text-xl font-black text-slate-900">
                      {formatPrice(service.price)}
                    </div>

                    <button
                      onClick={() => openOrder(service)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-600"
                    >
                      Commander
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="fonctionnement"
          className="border-y border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Comment ça marche"
              title="Une commande en quelques étapes"
              description="Tout est organisé pour vous permettre de passer de votre besoin à la livraison."
            />

            <div className="mt-10 grid gap-5 md:grid-cols-4">
              <StepCard
                number="01"
                icon={<Search size={22} />}
                title="Choisissez"
                text="Sélectionnez la prestation qui correspond à votre projet."
              />

              <StepCard
                number="02"
                icon={<UserRound size={22} />}
                title="Décrivez"
                text="Indiquez vos coordonnées et expliquez précisément votre besoin."
              />

              <StepCard
                number="03"
                icon={<CreditCard size={22} />}
                title="Payez"
                text="Effectuez le paiement via notre solution de paiement sécurisée."
              />

              <StepCard
                number="04"
                icon={<PackageCheck size={22} />}
                title="Recevez"
                text="Suivez l'avancement et récupérez votre livraison."
              />
            </div>
          </div>
        </section>

        <section
          id="suivi"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700">
                <Truck size={15} />
                Suivi
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                Suivez votre commande
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-slate-600">
                Entrez votre numéro de suivi pour consulter
                l'état de votre prestation.
              </p>

              <form
                onSubmit={handleTracking}
                className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 platform-shadow"
              >
                <label className="text-sm font-bold text-slate-800">
                  Numéro de suivi
                </label>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={trackingCode}
                    onChange={(event) =>
                      setTrackingCode(event.target.value)
                    }
                    placeholder="Ex. TRK-AB12CD34"
                    className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />

                  <button
                    type="submit"
                    disabled={trackingLoading}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {trackingLoading
                      ? "Recherche..."
                      : "Suivre"}
                    {!trackingLoading && (
                      <ArrowRight size={16} />
                    )}
                  </button>
                </div>

                {trackingError && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {trackingError}
                  </div>
                )}
              </form>
            </div>

            <div>
              {trackingResult ? (
                <TrackingCard result={trackingResult} />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Truck size={25} />
                    </div>

                    <h3 className="mt-4 font-extrabold text-slate-900">
                      Aucun suivi sélectionné
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Votre progression apparaîtra ici après
                      la recherche de votre numéro de suivi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="commander"
          className="border-y border-slate-200 bg-slate-100"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700">
                  <Sparkles size={15} />
                  Nouvelle commande
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Dites-nous ce dont vous avez besoin
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                  Remplissez le formulaire. Votre commande sera
                  enregistrée et vous recevrez un numéro de
                  commande ainsi qu'un numéro de suivi.
                </p>

                <form
                  onSubmit={handleCreateOrder}
                  className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 platform-shadow sm:p-8"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Nom complet"
                      name="customerName"
                      value={form.customerName}
                      onChange={handleFormChange}
                      placeholder="Votre nom"
                      required
                    />

                    <FormField
                      label="Adresse e-mail"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="vous@example.com"
                      required
                    />

                    <FormField
                      label="Téléphone"
                      name="phone"
                      value={form.phone}
                      onChange={handleFormChange}
                      placeholder="+225..."
                      required
                    />

                    <div>
                      <label className="text-sm font-bold text-slate-800">
                        Prestation
                      </label>

                      <select
                        value={selectedService?.id || ""}
                        onChange={(event) => {
                          const service =
                            SERVICES.find(
                              (item) =>
                                item.id ===
                                event.target.value
                            );

                          setSelectedService(
                            service || null
                          );
                        }}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        required
                      >
                        <option value="">
                          Sélectionner une prestation
                        </option>

                        {SERVICES.map((service) => (
                          <option
                            key={service.id}
                            value={service.id}
                          >
                            {service.title} —{" "}
                            {formatPrice(service.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-800">
                      Décrivez votre besoin
                    </label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      rows={6}
                      placeholder="Expliquez votre projet, votre objectif, les informations importantes..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Montant estimé
                      </div>

                      <div className="mt-1 text-2xl font-black text-slate-900">
                        {formatPrice(selectedPrice)}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Création..."
                        : "Créer ma commande"}
                      {!submitting && (
                        <ArrowRight size={18} />
                      )}
                    </button>
                  </div>

                  <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
                    <LockKeyhole
                      size={15}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      Vos informations sont utilisées pour
                      traiter votre commande et assurer son
                      suivi.
                    </span>
                  </div>
                </form>
              </div>

              <div>
                <div className="sticky top-24 rounded-3xl border border-indigo-100 bg-white p-6 platform-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ShieldCheck size={24} />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-slate-900">
                    Une expérience simple
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    De la commande à la livraison, vous
                    gardez une visibilité sur l'avancement de
                    votre projet.
                  </p>

                  <div className="mt-6 space-y-4">
                    <TrustItem
                      title="Commande enregistrée"
                      text="Chaque commande reçoit un numéro unique."
                    />

                    <TrustItem
                      title="Suivi"
                      text="Consultez l'évolution de votre prestation."
                    />

                    <TrustItem
                      title="Paiement sécurisé"
                      text="Le paiement est traité via notre solution de paiement."
                    />

                    <TrustItem
                      title="Livraison"
                      text="Votre résultat final est transmis lorsque la prestation est prête."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {createdOrder && (
          <section
            id="confirmation"
            className="bg-white"
          >
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white platform-shadow">
                <div className="bg-emerald-50 p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={32} />
                  </div>

                  <h2 className="mt-5 text-3xl font-black text-slate-950">
                    Commande enregistrée
                  </h2>

                  <p className="mt-2 text-slate-600">
                    Votre commande a bien été créée.
                  </p>
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                  <InfoBox
                    label="Numéro de commande"
                    value={createdOrder.orderNumber}
                  />

                  <InfoBox
                    label="Numéro de suivi"
                    value={createdOrder.trackingCode}
                  />

                  <InfoBox
                    label="Prestation"
                    value={createdOrder.serviceTitle}
                  />

                  <InfoBox
                    label="Montant"
                    value={formatPrice(createdOrder.amount)}
                  />
                </div>

                <div className="border-t border-slate-100 p-6 sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() =>
                        handlePayment(createdOrder)
                      }
                      disabled={paymentLoading}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      <CreditCard size={18} />

                      {paymentLoading
                        ? "Préparation du paiement..."
                        : "Payer maintenant"}
                    </button>

                    <button
                      onClick={() =>
                        scrollToSection("suivi")
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      Suivre ma commande
                      <ArrowRight size={17} />
                    </button>
                  </div>

                  {paymentMessage && (
                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      {paymentMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          id="mes-commandes"
          className="border-t border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700">
                  <UserRound size={15} />
                  Espace client
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                  Mes commandes
                </h2>

                <p className="mt-2 text-slate-600">
                  Retrouvez les commandes associées à votre
                  espace actuel.
                </p>
              </div>

              <button
                onClick={() =>
                  user && loadMyOrders(user.uid)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
              >
                Actualiser
              </button>
            </div>

            {authLoading || ordersLoading ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Chargement de vos commandes...
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <PackageCheck size={25} />
                </div>

                <h3 className="mt-4 font-extrabold text-slate-900">
                  Aucune commande
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Vos commandes apparaîtront ici après votre
                  première commande.
                </p>

                <button
                  onClick={() =>
                    openOrder(SERVICES[0])
                  }
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Passer une commande
                </button>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPay={() => handlePayment(order)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Sparkles size={20} />
                </div>

                <div>
                  <div className="font-extrabold text-slate-900">
                    Prestations
                  </div>
                  <div className="text-xs text-slate-500">
                    Services en ligne
                  </div>
                </div>
              </div>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                Une plateforme pour commander et suivre
                simplement vos prestations numériques.
              </p>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900">
                Navigation
              </h3>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <button
                  onClick={() =>
                    scrollToSection("services")
                  }
                  className="block hover:text-indigo-600"
                >
                  Services
                </button>

                <button
                  onClick={() =>
                    scrollToSection("fonctionnement")
                  }
                  className="block hover:text-indigo-600"
                >
                  Comment ça marche
                </button>

                <button
                  onClick={() =>
                    scrollToSection("suivi")
                  }
                  className="block hover:text-indigo-600"
                >
                  Suivre une commande
                </button>

                <button
                  onClick={() =>
                    scrollToSection("commander")
                  }
                  className="block hover:text-indigo-600"
                >
                  Commander
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900">
                Sécurité
              </h3>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ShieldCheck
                    size={17}
                    className="text-emerald-600"
                  />
                  Paiement sécurisé
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <LockKeyhole
                    size={17}
                    className="text-indigo-600"
                  />
                  Données protégées
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Headphones
                    size={17}
                    className="text-blue-600"
                  />
                  Assistance client
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Prestations. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="max-w-2xl">
      <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700">
        {eyebrow}
      </div>

      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function MiniStat({ icon, title }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">
      <div className="flex justify-center text-indigo-600">
        {icon}
      </div>

      <div className="mt-1 text-[11px] font-bold text-slate-600">
        {title}
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          {icon}
        </div>

        <div className="text-xs font-black text-indigo-200">
          {number}
        </div>
      </div>

      <h3 className="mt-5 font-extrabold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-800">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
    </div>
  );
}

function TrustItem({ title, text }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={17} />
      </div>

      <div>
        <div className="text-sm font-extrabold text-slate-900">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-500">
          {text}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-extrabold text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

function TrackingCard({ result }) {
  const currentIndex = getStatusIndex(result.status);

  return (
    <div className="platform-shadow rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Commande
          </div>

          <div className="mt-1 text-xl font-black text-slate-900">
            {result.orderNumber || "—"}
          </div>
        </div>

        <StatusBadge status={result.status} />
      </div>

      <div className="mt-8">
        {STATUS_STEPS.map((step, index) => {
          const done = index <= currentIndex;
          const active = index === currentIndex;

          return (
            <div
              key={step}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {index < STATUS_STEPS.length - 1 && (
                <div
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${
                    index < currentIndex
                      ? "bg-indigo-500"
                      : "bg-slate-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <span className="text-xs font-bold">
                    {index + 1}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <div
                  className={`text-sm font-extrabold ${
                    active
                      ? "text-indigo-600"
                      : done
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <InfoBox
          label="Prestation"
          value={result.serviceTitle}
        />

        <InfoBox
          label="Paiement"
          value={result.paymentStatus || "Non payé"}
        />
      </div>

      {result.deliveryUrl &&
        result.status === "Livrée" && (
          <a
            href={
              result.deliveryUrl.includes("?")
                ? result.deliveryUrl
                : `${result.deliveryUrl}?dl=1`
            }
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <PackageCheck size={18} />
            Télécharger ma livraison
          </a>
        )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Reçue: "bg-blue-50 text-blue-700",
    Acceptée: "bg-indigo-50 text-indigo-700",
    "En cours": "bg-amber-50 text-amber-700",
    Livrée: "bg-emerald-50 text-emerald-700",
    Terminée: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Reçue"}
    </span>
  );
}

function OrderCard({ order, onPay }) {
  return (
    <div className="platform-shadow rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Commande
          </div>

          <div className="mt-1 text-base font-black text-slate-900">
            {order.orderNumber}
          </div>
        </div>

        <StatusBadge status={order.status} />
      </div>

      <div className="mt-5">
        <div className="text-sm font-extrabold text-slate-900">
          {order.serviceTitle}
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Suivi :{" "}
          <span className="font-bold text-slate-700">
            {order.trackingCode}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <div className="text-xs text-slate-400">
            Montant
          </div>

          <div className="font-black text-slate-900">
            {formatPrice(order.amount)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">
            Paiement
          </div>

          <div
            className={`text-sm font-extrabold ${
              order.paymentStatus === "Payé"
                ? "text-emerald-600"
                : "text-amber-600"
            }`}
          >
            {order.paymentStatus || "Non payé"}
          </div>
        </div>
      </div>

      {order.paymentStatus !== "Payé" && (
        <button
          onClick={onPay}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          <CreditCard size={17} />
          Payer maintenant
        </button>
      )}

      {order.deliveryUrl &&
        order.status === "Livrée" && (
          <a
            href={
              order.deliveryUrl.includes("?")
                ? order.deliveryUrl
                : `${order.deliveryUrl}?dl=1`
            }
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <PackageCheck size={17} />
            Télécharger la livraison
          </a>
        )}
    </div>
  );
}

export default App;
