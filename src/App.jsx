import React, { useEffect, useMemo, useState } from "react";
import Admin from "./Admin.jsx";

import {
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Video,
  Palette,
  Globe,
  Megaphone,
  Bot,
  Smartphone,
  LayoutDashboard,
  ShoppingBag,
  Truck,
  LockKeyhole,
  CircleHelp,
  FileText,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
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

import { onAuthStateChanged } from "firebase/auth";

const API_URL =
  "https://plateforme-prestation-d-ploiement.onrender.com";

const SERVICES = [
  {
    id: "video-publicitaire",
    category: "Vidéo & Animation",
    icon: Video,
    title: "Vidéo publicitaire professionnelle avec IA",
    description:
      "Création d'une vidéo publicitaire moderne pour présenter votre restaurant, entreprise, produit ou service.",
    price: 15000,
    delivery: "2 à 4 jours",
    color: "from-violet-600 to-indigo-600",
    popular: true,
    included: [
      "Création du concept publicitaire",
      "Montage vidéo professionnel",
      "Textes et animations",
      "Format adapté aux réseaux sociaux",
      "Une livraison finale",
    ],
  },
  {
    id: "site-web",
    category: "Sites web",
    icon: Globe,
    title: "Création d'un site web professionnel",
    description:
      "Site vitrine moderne et responsive pour présenter votre activité sur Internet.",
    price: 50000,
    delivery: "5 à 10 jours",
    color: "from-blue-600 to-cyan-600",
    popular: true,
    included: [
      "Page d'accueil",
      "Présentation des services",
      "Design responsive",
      "Formulaire de contact",
      "Mise en ligne",
    ],
  },
  {
    id: "design",
    category: "Design & Création",
    icon: Palette,
    title: "Création graphique professionnelle",
    description:
      "Visuels, affiches, flyers et supports numériques adaptés à votre activité.",
    price: 10000,
    delivery: "1 à 3 jours",
    color: "from-pink-600 to-rose-600",
    popular: true,
    included: [
      "Création graphique",
      "Format numérique",
      "Design adapté à votre marque",
      "Révision",
      "Fichier final",
    ],
  },
  {
    id: "reseaux-sociaux",
    category: "Réseaux sociaux",
    icon: Megaphone,
    title: "Pack contenu pour réseaux sociaux",
    description:
      "Création de contenus visuels pour Facebook, Instagram, TikTok et autres plateformes.",
    price: 20000,
    delivery: "2 à 5 jours",
    color: "from-orange-500 to-red-500",
    popular: false,
    included: [
      "Création de contenus",
      "Formats réseaux sociaux",
      "Textes promotionnels",
      "Visuels adaptés au mobile",
      "Livraison numérique",
    ],
  },
  {
    id: "ia",
    category: "Intelligence artificielle",
    icon: Bot,
    title: "Service créatif avec intelligence artificielle",
    description:
      "Utilisation d'outils IA pour accélérer la création de contenus numériques.",
    price: 15000,
    delivery: "2 à 5 jours",
    color: "from-emerald-500 to-teal-600",
    popular: true,
    included: [
      "Analyse du besoin",
      "Production assistée par IA",
      "Personnalisation",
      "Contrôle humain du résultat",
      "Livraison numérique",
    ],
  },
  {
    id: "mobile",
    category: "Applications",
    icon: Smartphone,
    title: "Prototype d'application mobile",
    description:
      "Conception d'un prototype moderne pour présenter votre idée d'application.",
    price: 35000,
    delivery: "4 à 8 jours",
    color: "from-sky-500 to-blue-700",
    popular: false,
    included: [
      "Analyse de l'idée",
      "Structure des écrans",
      "Prototype",
      "Interface mobile",
      "Présentation du résultat",
    ],
  },
];

const CATEGORIES = [
  {
    name: "Vidéo & Animation",
    icon: Video,
  },
  {
    name: "Design & Création",
    icon: Palette,
  },
  {
    name: "Sites web",
    icon: Globe,
  },
  {
    name: "Réseaux sociaux",
    icon: Megaphone,
  },
  {
    name: "Intelligence artificielle",
    icon: Bot,
  },
  {
    name: "Applications",
    icon: Smartphone,
  },
];

const STATUS_STEPS = [
  "Reçue",
  "Acceptée",
  "En cours",
  "Livrée",
  "Terminée",
];

function formatFCFA(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function generateOrderNumber() {
  return `CMD-${Date.now().toString().slice(-8)}`;
}

function generateTrackingCode() {
  return `TRK-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}${Date.now().toString().slice(-4)}`;
}

function normalizeDropboxUrl(url) {
  if (!url) return "";
  if (url.includes("dropbox.com")) {
    if (url.includes("?")) {
      return url.replace(/([?&])dl=\d/, "$1dl=1");
    }
    return `${url}?dl=1`;
  }
  return url;
}

function App() {
  const isAdminPage =
    window.location.pathname.replace(/\/+$/, "") === "/admin";

  if (isAdminPage) {
    return <Admin />;
  }

  return <Marketplace />;
}

function Marketplace() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [page, setPage] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");

  const [selectedService, setSelectedService] = useState(null);
  const [orderStep, setOrderStep] = useState(1);

  const [orderForm, setOrderForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    description: "",
  });

  const [createdOrder, setCreatedOrder] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthReady(true);
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Authentification Firebase:", error);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const order = params.get("order");

    if (payment === "success") {
      alert(
        `Paiement confirmé${order ? ` pour la commande ${order}` : ""}.`
      );
      window.history.replaceState({}, "", "/");
    }

    if (payment === "pending") {
      alert("Le paiement est encore en attente de confirmation.");
      window.history.replaceState({}, "", "/");
    }

    if (payment === "failed") {
      alert("Le paiement n'a pas été confirmé.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return SERVICES.filter((service) => {
      const categoryOk =
        selectedCategory === "Toutes" ||
        service.category === selectedCategory;

      const searchOk =
        !term ||
        service.title.toLowerCase().includes(term) ||
        service.description.toLowerCase().includes(term) ||
        service.category.toLowerCase().includes(term);

      return categoryOk && searchOk;
    });
  }, [search, selectedCategory]);

  const popularServices = SERVICES.filter((service) => service.popular);

  function goHome() {
    setPage("home");
    setSelectedService(null);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCatalog(category = "Toutes") {
    setSelectedCategory(category);
    setPage("catalog");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openService(service) {
    setSelectedService(service);
    setPage("service");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startOrder(service) {
    setSelectedService(service);
    setOrderStep(1);
    setCreatedOrder(null);
    setPage("order");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadOrders() {
    if (!user) return;

    setOrdersLoading(true);

    try {
      const q = query(
        collection(db, "orders"),
        where("customerUid", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const result = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

      setOrders(result);
    } catch (error) {
      console.error("Chargement commandes:", error);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function openDashboard() {
    setPage("dashboard");
    setMobileMenu(false);
    await loadOrders();
  }

  async function createOrder() {
    if (!user || !selectedService) return;

    if (!orderForm.customerName.trim()) {
      alert("Veuillez renseigner votre nom.");
      return;
    }

    if (!orderForm.email.trim()) {
      alert("Veuillez renseigner votre adresse e-mail.");
      return;
    }

    if (!orderForm.phone.trim()) {
      alert("Veuillez renseigner votre numéro de téléphone.");
      return;
    }

    if (!orderForm.description.trim()) {
      alert("Décrivez votre besoin.");
      return;
    }

    setCreatingOrder(true);

    try {
      const orderNumber = generateOrderNumber();
      const trackingCode = generateTrackingCode();

      const order = {
        orderNumber,
        trackingCode,
        customerUid: user.uid,
        customerName: orderForm.customerName.trim(),
        email: orderForm.email.trim(),
        phone: orderForm.phone.trim(),

        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        serviceCategory: selectedService.category,

        description: orderForm.description.trim(),
        amount: Number(selectedService.price),

        status: "Reçue",
        paymentStatus: "Non payé",
        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "orders", orderNumber), order);

      await setDoc(doc(db, "tracking", trackingCode), {
        orderId: orderNumber,
        orderNumber,
        trackingCode,
        customerUid: user.uid,
        customerName: orderForm.customerName.trim(),

        serviceTitle: selectedService.title,
        status: "Reçue",
        paymentStatus: "Non payé",
        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCreatedOrder({
        ...order,
        orderNumber,
        trackingCode,
      });

      setOrderStep(3);
    } catch (error) {
      console.error("Création commande:", error);
      alert(
        "Impossible de créer la commande pour le moment. Vérifiez votre connexion puis réessayez."
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  async function payOrder(order) {
    if (!order) return;

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
            orderNumber: order.orderNumber,
            amount: Number(order.amount),
            description: order.serviceTitle || "Prestation en ligne",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok || !data.paymentUrl) {
        throw new Error(
          data.error || "Impossible de créer le paiement."
        );
      }

      window.location.href = data.paymentUrl;
    } catch (error) {
      console.error("Paiement:", error);
      alert(
        error.message ||
          "Une erreur est survenue lors de la préparation du paiement."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function trackOrder() {
    const code = trackingCode.trim();

    if (!code) {
      alert("Entrez votre numéro de suivi.");
      return;
    }

    setTrackingLoading(true);
    setTrackingResult(null);

    try {
      const snapshot = await getDocs(
        query(
          collection(db, "tracking"),
          where("trackingCode", "==", code)
        )
      );

      if (snapshot.empty) {
        setTrackingResult({ error: "Commande introuvable." });
        return;
      }

      const item = snapshot.docs[0].data();

      setTrackingResult({
        ...item,
      });
    } catch (error) {
      console.error("Suivi:", error);
      setTrackingResult({
        error:
          "Impossible de récupérer le suivi pour le moment.",
      });
    } finally {
      setTrackingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        search={search}
        setSearch={setSearch}
        onHome={goHome}
        onCatalog={() => openCatalog()}
        onDashboard={openDashboard}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
      />

      {!authReady && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-xl">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connexion...
        </div>
      )}

      {page === "home" && (
        <HomePage
          search={search}
          setSearch={setSearch}
          onSearch={() => openCatalog()}
          onCategory={openCatalog}
          onService={openService}
          onCatalog={() => openCatalog()}
          popularServices={popularServices}
          trackingCode={trackingCode}
          setTrackingCode={setTrackingCode}
          trackingResult={trackingResult}
          trackingLoading={trackingLoading}
          trackOrder={trackOrder}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
        />
      )}

      {page === "catalog" && (
        <CatalogPage
          search={search}
          setSearch={setSearch}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          services={filteredServices}
          onService={openService}
          onHome={goHome}
        />
      )}

      {page === "service" && selectedService && (
        <ServicePage
          service={selectedService}
          onBack={() => openCatalog(selectedService.category)}
          onOrder={() => startOrder(selectedService)}
        />
      )}

      {page === "order" && selectedService && (
        <OrderPage
          service={selectedService}
          step={orderStep}
          setStep={setOrderStep}
          form={orderForm}
          setForm={setOrderForm}
          createdOrder={createdOrder}
          creatingOrder={creatingOrder}
          paymentLoading={paymentLoading}
          onCreate={createOrder}
          onPay={payOrder}
          onBack={() => openService(selectedService)}
          onDashboard={openDashboard}
        />
      )}

      {page === "dashboard" && (
        <DashboardPage
          orders={orders}
          loading={ordersLoading}
          onRefresh={loadOrders}
          onService={openService}
          onPay={payOrder}
          paymentLoading={paymentLoading}
          onHome={goHome}
        />
      )}

      <Footer
        onHome={goHome}
        onCatalog={() => openCatalog()}
        onDashboard={openDashboard}
      />
    </div>
  );
}

function Header({
  search,
  setSearch,
  onHome,
  onCatalog,
  onDashboard,
  mobileMenu,
  setMobileMenu,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <button
          onClick={onHome}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="hidden sm:block">
            <div className="font-bold leading-none">
              Prestations
            </div>
            <div className="text-xs text-slate-500">
              Services en ligne
            </div>
          </div>
        </button>

        <nav className="hidden items-center gap-6 lg:flex">
          <button
            onClick={onHome}
            className="text-sm font-medium hover:text-indigo-600"
          >
            Accueil
          </button>

          <button
            onClick={onCatalog}
            className="text-sm font-medium hover:text-indigo-600"
          >
            Explorer
          </button>

          <button
            onClick={onDashboard}
            className="text-sm font-medium hover:text-indigo-600"
          >
            Mes commandes
          </button>
        </nav>

        <div className="relative ml-auto hidden max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCatalog();
            }}
            placeholder="Rechercher une prestation..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
          />
        </div>

        <button
          onClick={onDashboard}
          className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 sm:flex"
        >
          <ShoppingBag className="h-4 w-4" />
          Mes commandes
        </button>

        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
        >
          {mobileMenu ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenu && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCatalog();
              }}
              placeholder="Que recherchez-vous ?"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none"
            />
          </div>

          <div className="grid gap-1">
            <button
              onClick={onHome}
              className="rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-50"
            >
              Accueil
            </button>

            <button
              onClick={onCatalog}
              className="rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-50"
            >
              Explorer les prestations
            </button>

            <button
              onClick={onDashboard}
              className="rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-50"
            >
              Mes commandes
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function HomePage({
  search,
  setSearch,
  onSearch,
  onCategory,
  onService,
  onCatalog,
  popularServices,
  trackingCode,
  setTrackingCode,
  trackingResult,
  trackingLoading,
  trackOrder,
  openFaq,
  setOpenFaq,
}) {
  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.25),_transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
              <Sparkles className="h-4 w-4" />
              Prestations numériques à la demande
            </div>

            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Trouvez le service dont votre projet a besoin.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Vidéo, design, site web, réseaux sociaux, IA et
              applications. Choisissez une prestation, commandez
              en ligne et suivez votre commande.
            </p>

            <div className="mt-8 rounded-2xl bg-white p-2 shadow-2xl">
              <div className="flex items-center gap-2">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearch();
                  }}
                  placeholder="Que recherchez-vous ?"
                  className="h-12 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none sm:text-base"
                />

                <button
                  onClick={onSearch}
                  className="hidden h-12 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-800 sm:block"
                >
                  Rechercher
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Vidéo & Animation",
                "Sites web",
                "Design & Création",
                "Intelligence artificielle",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => onCategory(item)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative mx-auto max-w-lg">
              <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/20 blur-3xl" />

              <div className="relative grid grid-cols-2 gap-4">
                <VisualCard
                  icon={Video}
                  title="Vidéo IA"
                  text="Publicité"
                  gradient="from-violet-600 to-indigo-600"
                />

                <VisualCard
                  icon={Globe}
                  title="Site web"
                  text="Professionnel"
                  gradient="from-blue-600 to-cyan-600"
                  offset
                />

                <VisualCard
                  icon={Palette}
                  title="Design"
                  text="Créatif"
                  gradient="from-pink-600 to-rose-600"
                />

                <VisualCard
                  icon={Bot}
                  title="IA"
                  text="Solutions"
                  gradient="from-emerald-500 to-teal-600"
                  offset
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 sm:grid-cols-4">
          <TrustStat
            icon={ShieldCheck}
            title="Paiement sécurisé"
            text="Paiement en ligne"
          />
          <TrustStat
            icon={PackageCheck}
            title="Commande suivie"
            text="Statut en temps réel"
          />
          <TrustStat
            icon={Clock3}
            title="Délais indiqués"
            text="Avant la commande"
          />
          <TrustStat
            icon={LockKeyhole}
            title="Espace client"
            text="Vos commandes"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionTitle
          eyebrow="Explorer"
          title="Choisissez une catégorie"
          text="Commencez par le type de prestation dont vous avez besoin."
        />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;

            return (
              <button
                key={category.name}
                onClick={() => onCategory(category.name)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition group-hover:bg-indigo-50">
                  <Icon className="h-5 w-5 text-slate-700 group-hover:text-indigo-600" />
                </div>

                <div className="text-sm font-bold">
                  {category.name}
                </div>

                <div className="mt-2 flex items-center text-xs text-slate-400">
                  Explorer
                  <ChevronRight className="ml-1 h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Sélection"
              title="Prestations populaires"
              text="Des services prêts à être commandés."
            />

            <button
              onClick={onCatalog}
              className="hidden items-center gap-1 text-sm font-bold text-indigo-600 sm:flex"
            >
              Voir tout
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={() => onService(service)}
              />
            ))}
          </div>

          <button
            onClick={onCatalog}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold sm:hidden"
          >
            Voir toutes les prestations
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-slate-950 p-8 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Truck className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Suivez votre commande
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Utilisez le numéro de suivi reçu après votre commande
              pour connaître son état.
            </p>

            <div className="mt-6 flex gap-2">
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Ex. TRK-ABC123456"
                className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              />

              <button
                onClick={trackOrder}
                disabled={trackingLoading}
                className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold hover:bg-indigo-400 disabled:opacity-60"
              >
                {trackingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Suivre"
                )}
              </button>
            </div>

            {trackingResult && (
              <TrackingResult result={trackingResult} />
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <LayoutDashboard className="h-6 w-6 text-indigo-600" />
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Un espace pour vos commandes
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Retrouvez vos commandes, leurs statuts, vos paiements
              et les fichiers livrés au même endroit.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Voir les commandes en cours",
                "Consulter le statut du paiement",
                "Accéder à la livraison",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionTitle
            eyebrow="Simple"
            title="Comment ça fonctionne"
            text="De la recherche à la livraison, le parcours reste clair."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            <ProcessStep
              number="01"
              icon={Search}
              title="Choisissez"
              text="Recherchez une prestation et consultez ses détails."
            />
            <ProcessStep
              number="02"
              icon={FileText}
              title="Décrivez"
              text="Expliquez précisément ce dont vous avez besoin."
            />
            <ProcessStep
              number="03"
              icon={CreditCard}
              title="Commandez"
              text="Créez votre commande puis effectuez le paiement."
            />
            <ProcessStep
              number="04"
              icon={PackageCheck}
              title="Recevez"
              text="Suivez l'avancement et récupérez votre livraison."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <SectionTitle
          eyebrow="Aide"
          title="Questions fréquentes"
          text="Les informations essentielles avant de commander."
        />

        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {[
            {
              q: "Comment passer une commande ?",
              a: "Choisissez une prestation, consultez son détail, indiquez vos coordonnées et décrivez votre projet. Une commande et un numéro de suivi sont ensuite créés.",
            },
            {
              q: "Comment fonctionne le paiement ?",
              a: "Après la création de la commande, le paiement est préparé via PayDunya. Le statut de paiement est ensuite mis à jour lorsque le paiement est confirmé.",
            },
            {
              q: "Comment suivre ma commande ?",
              a: "Vous pouvez utiliser le numéro de suivi fourni après la commande ou consulter votre espace client.",
            },
            {
              q: "Quand la prestation est-elle livrée ?",
              a: "Le délai indicatif est affiché sur la fiche de chaque prestation. Le statut évolue ensuite selon l'avancement de la commande.",
            },
          ].map((faq, index) => (
            <div key={faq.q}>
              <button
                onClick={() =>
                  setOpenFaq(openFaq === index ? null : index)
                }
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="text-sm font-bold">
                  {faq.q}
                </span>

                {openFaq === index ? (
                  <Minus className="h-4 w-4 shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0" />
                )}
              </button>

              {openFaq === index && (
                <div className="px-5 pb-5 text-sm leading-6 text-slate-500">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CatalogPage({
  search,
  setSearch,
  selectedCategory,
  setSelectedCategory,
  services,
  onService,
  onHome,
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button
        onClick={onHome}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Accueil
      </button>

      <div className="rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold text-indigo-300">
            Catalogue de prestations
          </div>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Trouvez le service adapté à votre projet
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Parcourez les prestations disponibles ou utilisez la
            recherche pour trouver directement ce dont vous avez
            besoin.
          </p>

          <div className="mt-6 flex rounded-2xl bg-white p-2">
            <Search className="ml-3 h-5 w-5 self-center text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {["Toutes", ...CATEGORIES.map((c) => c.name)].map(
          (category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === category
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {category}
            </button>
          )
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {selectedCategory === "Toutes"
              ? "Toutes les prestations"
              : selectedCategory}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {services.length} prestation
            {services.length > 1 ? "s" : ""} disponible
            {services.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-300" />

          <h3 className="mt-4 font-bold">
            Aucune prestation trouvée
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Essayez une autre recherche ou une autre catégorie.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onClick={() => onService(service)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function ServicePage({ service, onBack, onOrder }) {
  const Icon = service.icon;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <div
            className={`flex h-64 items-center justify-center rounded-3xl bg-gradient-to-br ${service.color}`}
          >
            <Icon className="h-24 w-24 text-white/90" />
          </div>

          <div className="mt-7">
            <div className="text-sm font-semibold text-indigo-600">
              {service.category}
            </div>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {service.title}
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600">
              {service.description}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">
              Ce qui est inclus
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.included.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm text-slate-600"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside>
          <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">
              À partir de
            </div>

            <div className="mt-1 text-3xl font-black">
              {formatFCFA(service.price)}
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4">
              <Clock3 className="h-5 w-5 text-indigo-600" />

              <div>
                <div className="text-xs text-slate-500">
                  Délai indicatif
                </div>

                <div className="text-sm font-bold">
                  {service.delivery}
                </div>
              </div>
            </div>

            <button
              onClick={onOrder}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              Commander cette prestation
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <div className="flex gap-3 text-sm text-slate-500">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Paiement traité de manière sécurisée
              </div>

              <div className="flex gap-3 text-sm text-slate-500">
                <Truck className="h-5 w-5 text-indigo-500" />
                Suivi de commande disponible
              </div>

              <div className="flex gap-3 text-sm text-slate-500">
                <PackageCheck className="h-5 w-5 text-orange-500" />
                Livraison numérique
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OrderPage({
  service,
  step,
  setStep,
  form,
  setForm,
  createdOrder,
  creatingOrder,
  paymentLoading,
  onCreate,
  onPay,
  onBack,
  onDashboard,
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la prestation
      </button>

      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600">
          Commander
        </div>

        <h1 className="mt-1 text-3xl font-black">
          {service.title}
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-2">
        <OrderStep number="1" active={step >= 1} text="Votre besoin" />
        <OrderStep number="2" active={step >= 2} text="Vérification" />
        <OrderStep number="3" active={step >= 3} text="Confirmation" />
      </div>

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">
              Décrivez votre projet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Ces informations permettront de traiter votre demande.
            </p>

            <div className="mt-6 grid gap-5">
              <Field
                label="Nom complet"
                value={form.customerName}
                onChange={(value) =>
                  setForm({
                    ...form,
                    customerName: value,
                  })
                }
                placeholder="Votre nom"
              />

              <Field
                label="Adresse e-mail"
                type="email"
                value={form.email}
                onChange={(value) =>
                  setForm({
                    ...form,
                    email: value,
                  })
                }
                placeholder="vous@example.com"
              />

              <Field
                label="Téléphone"
                value={form.phone}
                onChange={(value) =>
                  setForm({
                    ...form,
                    phone: value,
                  })
                }
                placeholder="+225 ..."
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Description du projet
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  rows={7}
                  placeholder="Expliquez ce que vous souhaitez obtenir..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
              >
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <OrderSummary service={service} />
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">
            Vérifiez votre commande
          </h2>

          <div className="mt-6 space-y-4">
            <SummaryRow
              label="Prestation"
              value={service.title}
            />

            <SummaryRow
              label="Nom"
              value={form.customerName}
            />

            <SummaryRow
              label="E-mail"
              value={form.email}
            />

            <SummaryRow
              label="Téléphone"
              value={form.phone}
            />

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Description
              </div>

              <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {form.description}
              </div>
            </div>

            <SummaryRow
              label="Montant"
              value={formatFCFA(service.price)}
              strong
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-4 text-sm font-bold"
            >
              Modifier
            </button>

            <button
              onClick={onCreate}
              disabled={creatingOrder}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {creatingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Confirmer la commande
                  <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && createdOrder && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Commande créée
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Votre demande a été enregistrée. Conservez les
              informations ci-dessous pour suivre votre commande.
            </p>

            <div className="mt-7 grid gap-3 text-left">
              <InfoBox
                label="Numéro de commande"
                value={createdOrder.orderNumber}
              />

              <InfoBox
                label="Numéro de suivi"
                value={createdOrder.trackingCode}
              />

              <InfoBox
                label="Montant"
                value={formatFCFA(createdOrder.amount)}
              />

              <InfoBox
                label="Paiement"
                value="Non payé"
              />
            </div>

            <button
              onClick={() => onPay(createdOrder)}
              disabled={paymentLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Préparation du paiement...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Payer maintenant
                </>
              )}
            </button>

            <button
              onClick={onDashboard}
              className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-4 text-sm font-bold"
            >
              Voir mes commandes
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function DashboardPage({
  orders,
  loading,
  onRefresh,
  onService,
  onPay,
  paymentLoading,
  onHome,
}) {
  const active = orders.filter(
    (order) =>
      order.status !== "Terminée" &&
      order.status !== "Livrée"
  );

  const unpaid = orders.filter(
    (order) =>
      order.paymentStatus !== "Payé"
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-sm font-semibold text-indigo-600">
            Espace client
          </div>

          <h1 className="mt-1 text-3xl font-black">
            Mes commandes
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Retrouvez ici vos commandes et leur avancement.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            Actualiser
          </button>

          <button
            onClick={onHome}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            Explorer
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <DashboardStat
          icon={ShoppingBag}
          label="Commandes"
          value={orders.length}
        />

        <DashboardStat
          icon={Clock3}
          label="En cours"
          value={active.length}
        />

        <DashboardStat
          icon={CreditCard}
          label="Paiements à effectuer"
          value={unpaid.length}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-bold">
            Aucune commande pour le moment
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Explorez les prestations disponibles pour commencer.
          </p>

          <button
            onClick={onHome}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            Explorer les prestations
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPay={onPay}
              paymentLoading={paymentLoading}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function OrderCard({
  order,
  onPay,
  paymentLoading,
}) {
  const deliveryUrl = normalizeDropboxUrl(order.deliveryUrl);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <PackageCheck className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {order.orderNumber}
            </div>

            <h2 className="mt-1 font-bold">
              {order.serviceTitle}
            </h2>

            <div className="mt-2 text-sm text-slate-500">
              Suivi :{" "}
              <span className="font-semibold text-slate-700">
                {order.trackingCode || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />

          <PaymentBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <div className="text-xs text-slate-400">
            Montant
          </div>
          <div className="mt-1 text-sm font-bold">
            {formatFCFA(order.amount)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">
            État
          </div>
          <div className="mt-1 text-sm font-bold">
            {order.status || "Reçue"}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">
            Paiement
          </div>
          <div className="mt-1 text-sm font-bold">
            {order.paymentStatus || "Non payé"}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <StatusTimeline status={order.status} />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {order.paymentStatus !== "Payé" && (
          <button
            onClick={() => onPay(order)}
            disabled={paymentLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            Payer
          </button>
        )}

        {deliveryUrl && order.status === "Livrée" && (
          <a
            href={deliveryUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Voir la livraison
          </a>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service, onClick }) {
  const Icon = service.icon;

  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${service.color}`}
      >
        <Icon className="h-16 w-16 text-white/90 transition group-hover:scale-110" />

        {service.popular && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900">
            Populaire
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="text-xs font-semibold text-indigo-600">
          {service.category}
        </div>

        <h3 className="mt-2 min-h-[48px] font-bold leading-6">
          {service.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {service.description}
        </p>

        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="text-xs text-slate-400">
              À partir de
            </div>

            <div className="mt-1 font-black">
              {formatFCFA(service.price)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">
              Délai
            </div>

            <div className="mt-1 text-xs font-bold">
              {service.delivery}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function OrderSummary({ service }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Votre prestation
      </div>

      <h3 className="mt-2 font-bold">
        {service.title}
      </h3>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
        <span className="text-sm text-slate-500">
          Total
        </span>

        <span className="text-xl font-black">
          {formatFCFA(service.price)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Clock3 className="h-4 w-4" />
        Délai : {service.delivery}
      </div>
    </div>
  );
}

function TrackingResult({ result }) {
  if (result.error) {
    return (
      <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">
        {result.error}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl bg-white p-5 text-slate-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {result.orderNumber}
      </div>

      <div className="mt-1 font-bold">
        {result.serviceTitle}
      </div>

      <div className="mt-4">
        <StatusTimeline status={result.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Statut</span>
          <span className="font-bold">{result.status}</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Paiement</span>
          <span className="font-bold">
            {result.paymentStatus}
          </span>
        </div>
      </div>

      {result.deliveryUrl && result.status === "Livrée" && (
        <a
          href={normalizeDropboxUrl(result.deliveryUrl)}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Accéder à la livraison
        </a>
      )}
    </div>
  );
}

function StatusTimeline({ status }) {
  const current = Math.max(
    0,
    STATUS_STEPS.indexOf(status || "Reçue")
  );

  return (
    <div className="grid grid-cols-5 gap-1">
      {STATUS_STEPS.map((step, index) => {
        const done = index <= current;

        return (
          <div key={step}>
            <div
              className={`h-1.5 rounded-full ${
                done ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />

            <div
              className={`mt-2 text-[10px] leading-3 ${
                done
                  ? "font-bold text-slate-700"
                  : "text-slate-400"
              }`}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
      {status || "Reçue"}
    </span>
  );
}

function PaymentBadge({ status }) {
  const paid = status === "Payé";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        paid
          ? "bg-emerald-50 text-emerald-700"
          : "bg-orange-50 text-orange-700"
      }`}
    >
      {status || "Non payé"}
    </span>
  );
}

function OrderStep({ number, active, text }) {
  return (
    <div
      className={`rounded-xl px-3 py-3 text-center ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-200 text-slate-400"
      }`}
    >
      <div className="text-xs font-black">
        {number}
      </div>

      <div className="mt-1 hidden text-xs font-semibold sm:block">
        {text}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 pb-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-right text-sm ${
          strong ? "font-black" : "font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all font-bold">
        {value}
      </div>
    </div>
  );
}

function DashboardStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {label}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>

      <div className="mt-4 text-3xl font-black">
        {value}
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-xs font-black text-slate-300">
          {number}
        </span>
      </div>

      <h3 className="mt-5 font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function TrustStat({ icon: Icon, title, text }) {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-indigo-600" />

        <div>
          <div className="text-xs font-bold sm:text-sm">
            {title}
          </div>

          <div className="mt-1 hidden text-xs text-slate-400 sm:block">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualCard({
  icon: Icon,
  title,
  text,
  gradient,
  offset = false,
}) {
  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 shadow-2xl ${
        offset ? "mt-8" : ""
      }`}
    >
      <Icon className="h-10 w-10 text-white" />

      <div className="mt-10">
        <div className="font-bold text-white">
          {title}
        </div>

        <div className="mt-1 text-sm text-white/70">
          {text}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
        {eyebrow}
      </div>

      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {title}
      </h2>

      {text && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {text}
        </p>
      )}
    </div>
  );
}

function Footer({ onHome, onCatalog, onDashboard }) {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <button
            onClick={onHome}
            className="flex items-center gap-2 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <div className="font-bold text-white">
                Prestations
              </div>

              <div className="text-xs text-slate-500">
                Services en ligne
              </div>
            </div>
          </button>

          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
            Une plateforme de prestations numériques permettant de
            rechercher, commander, payer et suivre des services en
            ligne.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white">
            Navigation
          </h3>

          <div className="mt-4 grid gap-3 text-sm">
            <button
              onClick={onHome}
              className="text-left hover:text-white"
            >
              Accueil
            </button>

            <button
              onClick={onCatalog}
              className="text-left hover:text-white"
            >
              Explorer
            </button>

            <button
              onClick={onDashboard}
              className="text-left hover:text-white"
            >
              Mes commandes
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white">
            Informations
          </h3>

          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Paiement sécurisé
            </div>

            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Suivi des commandes
            </div>

            <div className="flex items-center gap-2">
              <CircleHelp className="h-4 w-4" />
              Support client
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} Prestations. Tous droits
          réservés.
        </div>
      </div>
    </footer>
  );
}

export default App;
