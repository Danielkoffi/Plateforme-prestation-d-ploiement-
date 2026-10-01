import React, { useEffect, useMemo, useState } from "react";
import Admin from "./Admin.jsx";

import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Clock3,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Video,
  Palette,
  Code2,
  Megaphone,
  Bot,
  Smartphone,
  PenTool,
  Globe2,
  PackageCheck,
  CreditCard,
  ArrowLeft,
  SlidersHorizontal,
  CircleHelp,
  Lock,
  Truck,
  FileText,
  LayoutDashboard,
  LogOut,
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
    id: "video-restaurant",
    category: "Vidéo & Animation",
    categoryKey: "video",
    icon: Video,
    title: "Créer une vidéo publicitaire professionnelle pour votre restaurant",
    shortTitle: "Vidéo publicitaire IA pour restaurant",
    description:
      "Une vidéo publicitaire moderne adaptée aux réseaux sociaux, à WhatsApp et à la promotion de votre restaurant.",
    price: 15000,
    delivery: "2 à 3 jours",
    revisions: 2,
    badge: "Populaire",
    color: "green",
    packages: {
      basic: {
        name: "Basique",
        price: 15000,
        delivery: "3 jours",
        revisions: 1,
        description: "Vidéo courte adaptée aux réseaux sociaux.",
        items: [
          "Vidéo jusqu'à 30 secondes",
          "Montage professionnel",
          "Musique adaptée",
          "Format vertical",
        ],
      },
      standard: {
        name: "Standard",
        price: 30000,
        delivery: "3 jours",
        revisions: 2,
        description: "Publicité plus complète pour présenter votre restaurant.",
        items: [
          "Vidéo jusqu'à 60 secondes",
          "Montage professionnel",
          "Textes et animations",
          "Format vertical + horizontal",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 50000,
        delivery: "4 jours",
        revisions: 3,
        description: "Vidéo publicitaire complète pensée pour votre campagne.",
        items: [
          "Vidéo jusqu'à 90 secondes",
          "Storyboard",
          "Montage avancé",
          "Animations",
          "Formats réseaux sociaux",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "logo-design",
    category: "Design",
    categoryKey: "design",
    icon: Palette,
    title: "Créer un logo professionnel pour votre entreprise",
    shortTitle: "Logo professionnel",
    description:
      "Création d'une identité visuelle moderne et adaptée à votre activité.",
    price: 10000,
    delivery: "2 jours",
    revisions: 2,
    badge: "Nouveau",
    color: "purple",
    packages: {
      basic: {
        name: "Basique",
        price: 10000,
        delivery: "2 jours",
        revisions: 1,
        description: "Un logo simple et professionnel.",
        items: [
          "1 concept",
          "PNG haute qualité",
          "Fond transparent",
          "1 révision",
        ],
      },
      standard: {
        name: "Standard",
        price: 20000,
        delivery: "3 jours",
        revisions: 2,
        description: "Une identité plus travaillée.",
        items: [
          "2 concepts",
          "PNG + JPG",
          "Fond transparent",
          "Version couleur",
          "Version noir et blanc",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 35000,
        delivery: "4 jours",
        revisions: 3,
        description: "Logo complet avec fichiers professionnels.",
        items: [
          "3 concepts",
          "Fichiers PNG/JPG/SVG",
          "Logo couleur",
          "Logo noir et blanc",
          "Fichiers sources",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "website",
    category: "Web & Développement",
    categoryKey: "web",
    icon: Code2,
    title: "Créer un site web professionnel pour votre activité",
    shortTitle: "Site web professionnel",
    description:
      "Création d'un site web moderne, responsive et adapté à votre entreprise.",
    price: 75000,
    delivery: "5 à 7 jours",
    revisions: 2,
    badge: "",
    color: "blue",
    packages: {
      basic: {
        name: "Basique",
        price: 75000,
        delivery: "7 jours",
        revisions: 1,
        description: "Site vitrine simple.",
        items: [
          "Jusqu'à 3 pages",
          "Design responsive",
          "Formulaire de contact",
          "Mise en ligne",
        ],
      },
      standard: {
        name: "Standard",
        price: 150000,
        delivery: "7 jours",
        revisions: 2,
        description: "Site professionnel complet.",
        items: [
          "Jusqu'à 6 pages",
          "Design responsive",
          "Formulaire de contact",
          "Optimisation mobile",
          "Mise en ligne",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 250000,
        delivery: "10 jours",
        revisions: 3,
        description: "Solution web complète.",
        items: [
          "Jusqu'à 10 pages",
          "Design personnalisé",
          "Formulaires",
          "SEO de base",
          "Optimisation mobile",
          "Mise en ligne",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "social-media",
    category: "Marketing",
    categoryKey: "marketing",
    icon: Megaphone,
    title: "Créer du contenu professionnel pour vos réseaux sociaux",
    shortTitle: "Contenu réseaux sociaux",
    description:
      "Création de visuels et contenus adaptés à Facebook, Instagram, TikTok et autres plateformes.",
    price: 20000,
    delivery: "3 jours",
    revisions: 2,
    badge: "",
    color: "orange",
    packages: {
      basic: {
        name: "Basique",
        price: 20000,
        delivery: "3 jours",
        revisions: 1,
        description: "Pack de contenu simple.",
        items: [
          "5 visuels",
          "Formats réseaux sociaux",
          "Textes courts",
          "1 révision",
        ],
      },
      standard: {
        name: "Standard",
        price: 40000,
        delivery: "5 jours",
        revisions: 2,
        description: "Pack de contenu complet.",
        items: [
          "10 visuels",
          "5 textes",
          "Formats réseaux sociaux",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 70000,
        delivery: "7 jours",
        revisions: 3,
        description: "Pack complet pour votre communication.",
        items: [
          "15 visuels",
          "10 textes",
          "Calendrier de publication",
          "Formats réseaux sociaux",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "ai-content",
    category: "Intelligence artificielle",
    categoryKey: "ai",
    icon: Bot,
    title: "Créer du contenu avec l'intelligence artificielle",
    shortTitle: "Création de contenu IA",
    description:
      "Création de contenus assistés par IA pour développer votre activité.",
    price: 25000,
    delivery: "3 jours",
    revisions: 2,
    badge: "IA",
    color: "cyan",
    packages: {
      basic: {
        name: "Basique",
        price: 25000,
        delivery: "3 jours",
        revisions: 1,
        description: "Contenu IA simple.",
        items: [
          "5 contenus",
          "Adaptation à votre activité",
          "Livraison numérique",
        ],
      },
      standard: {
        name: "Standard",
        price: 50000,
        delivery: "5 jours",
        revisions: 2,
        description: "Pack de contenu IA plus complet.",
        items: [
          "10 contenus",
          "Personnalisation",
          "Formats réseaux sociaux",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 90000,
        delivery: "7 jours",
        revisions: 3,
        description: "Production de contenu IA avancée.",
        items: [
          "20 contenus",
          "Stratégie de contenu",
          "Personnalisation avancée",
          "Formats multiples",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "mobile-app",
    category: "Applications mobiles",
    categoryKey: "apps",
    icon: Smartphone,
    title: "Créer une application mobile moderne",
    shortTitle: "Application mobile",
    description:
      "Conception et développement d'une application mobile adaptée à votre projet.",
    price: 150000,
    delivery: "10 à 15 jours",
    revisions: 2,
    badge: "",
    color: "indigo",
    packages: {
      basic: {
        name: "Basique",
        price: 150000,
        delivery: "15 jours",
        revisions: 1,
        description: "Prototype ou application simple.",
        items: [
          "Interface mobile",
          "Écrans principaux",
          "Navigation",
          "1 révision",
        ],
      },
      standard: {
        name: "Standard",
        price: 300000,
        delivery: "20 jours",
        revisions: 2,
        description: "Application fonctionnelle.",
        items: [
          "Interface complète",
          "Authentification",
          "Base de données",
          "Responsive",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 500000,
        delivery: "30 jours",
        revisions: 3,
        description: "Solution mobile avancée.",
        items: [
          "Application complète",
          "Backend",
          "Base de données",
          "Authentification",
          "Notifications",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "writing",
    category: "Rédaction & Traduction",
    categoryKey: "writing",
    icon: PenTool,
    title: "Rédiger des textes professionnels pour votre activité",
    shortTitle: "Rédaction professionnelle",
    description:
      "Rédaction de textes clairs et adaptés à votre entreprise ou projet.",
    price: 10000,
    delivery: "2 jours",
    revisions: 2,
    badge: "",
    color: "pink",
    packages: {
      basic: {
        name: "Basique",
        price: 10000,
        delivery: "2 jours",
        revisions: 1,
        description: "Texte court et professionnel.",
        items: [
          "Jusqu'à 500 mots",
          "Correction",
          "Mise en forme",
        ],
      },
      standard: {
        name: "Standard",
        price: 20000,
        delivery: "3 jours",
        revisions: 2,
        description: "Rédaction complète.",
        items: [
          "Jusqu'à 1000 mots",
          "Correction",
          "Optimisation du texte",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 35000,
        delivery: "4 jours",
        revisions: 3,
        description: "Contenu professionnel approfondi.",
        items: [
          "Jusqu'à 2000 mots",
          "Recherche",
          "Optimisation",
          "Mise en page",
          "3 révisions",
        ],
      },
    },
  },

  {
    id: "business-document",
    category: "Business",
    categoryKey: "business",
    icon: FileText,
    title: "Préparer un document professionnel pour votre entreprise",
    shortTitle: "Document professionnel",
    description:
      "Création de documents professionnels pour vos besoins administratifs ou commerciaux.",
    price: 15000,
    delivery: "2 jours",
    revisions: 2,
    badge: "",
    color: "slate",
    packages: {
      basic: {
        name: "Basique",
        price: 15000,
        delivery: "2 jours",
        revisions: 1,
        description: "Document simple.",
        items: [
          "Jusqu'à 5 pages",
          "Mise en forme",
          "Format PDF",
        ],
      },
      standard: {
        name: "Standard",
        price: 30000,
        delivery: "3 jours",
        revisions: 2,
        description: "Document professionnel complet.",
        items: [
          "Jusqu'à 10 pages",
          "Mise en page professionnelle",
          "PDF",
          "2 révisions",
        ],
      },
      premium: {
        name: "Premium",
        price: 50000,
        delivery: "5 jours",
        revisions: 3,
        description: "Document professionnel avancé.",
        items: [
          "Jusqu'à 20 pages",
          "Mise en page avancée",
          "PDF",
          "Version modifiable",
          "3 révisions",
        ],
      },
    },
  },
];

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: Globe2 },
  { id: "video", label: "Vidéo & Animation", icon: Video },
  { id: "design", label: "Design", icon: Palette },
  { id: "web", label: "Web & Développement", icon: Code2 },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "ai", label: "Intelligence artificielle", icon: Bot },
  { id: "apps", label: "Applications mobiles", icon: Smartphone },
  { id: "writing", label: "Rédaction", icon: PenTool },
  { id: "business", label: "Business", icon: FileText },
];

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function createOrderNumber() {
  const now = Date.now().toString().slice(-8);
  const random = Math.floor(100 + Math.random() * 900);
  return `CMD-${now}-${random}`;
}

function createTrackingCode() {
  return `TRK-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}${Date.now().toString().slice(-4)}`;
}

function getServiceVisual(service) {
  const backgrounds = {
    video: "linear-gradient(135deg,#064e3b,#10b981)",
    design: "linear-gradient(135deg,#581c87,#a855f7)",
    web: "linear-gradient(135deg,#172554,#2563eb)",
    marketing: "linear-gradient(135deg,#7c2d12,#f97316)",
    ai: "linear-gradient(135deg,#164e63,#06b6d4)",
    apps: "linear-gradient(135deg,#312e81,#6366f1)",
    writing: "linear-gradient(135deg,#831843,#ec4899)",
    business: "linear-gradient(135deg,#1e293b,#64748b)",
  };

  return backgrounds[service.categoryKey] || backgrounds.video;
}

function ServiceArtwork({ service, large = false }) {
  const Icon = service.icon;

  return (
    <div
      style={{
        height: large ? 390 : 220,
        minHeight: large ? 300 : 180,
        background: getServiceVisual(service),
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: large ? 360 : 220,
          height: large ? 360 : 220,
          borderRadius: "50%",
          background: "rgba(255,255,255,.10)",
          top: -100,
          right: -80,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: large ? 250 : 160,
          height: large ? 250 : 160,
          borderRadius: "50%",
          background: "rgba(255,255,255,.08)",
          bottom: -90,
          left: -60,
        }}
      />

      <div
        style={{
          width: large ? 105 : 76,
          height: large ? 105 : 76,
          borderRadius: 26,
          background: "rgba(255,255,255,.16)",
          border: "1px solid rgba(255,255,255,.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          backdropFilter: "blur(8px)",
          zIndex: 2,
        }}
      >
        <Icon size={large ? 52 : 38} strokeWidth={1.6} />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 20,
          right: 20,
          color: "white",
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.8,
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          {service.category}
        </div>

        <div
          style={{
            marginTop: 5,
            fontWeight: 800,
            fontSize: large ? 22 : 15,
          }}
        >
          {service.shortTitle}
        </div>
      </div>
    </div>
  );
}

function App() {
  const isAdminPage = window.location.pathname === "/admin";

  if (isAdminPage) {
    return <Admin />;
  }

  return <ClientApp />;
}

function ClientApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [page, setPage] = useState("home");
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState("standard");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [maxPrice, setMaxPrice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("prestations-favorites") || "[]");
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  });

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        await loadOrders(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "prestations-favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const order = params.get("order");

    if (payment === "success") {
      setPaymentMessage(
        `Paiement confirmé pour la commande ${order || ""}.`
      );
      setPage("orders");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (payment === "pending") {
      setPaymentMessage(
        "Le paiement est encore en attente de confirmation."
      );
      setPage("orders");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (payment === "failed") {
      setPaymentMessage(
        "Le paiement n'a pas été confirmé."
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(""), 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  async function ensureAuth() {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    const result = await signInAnonymously(auth);

    return result.user;
  }

  async function loadOrders(uid) {
    if (!uid) return;

    setOrdersLoading(true);

    try {
      const q = query(
        collection(db, "orders"),
        where("customerUid", "==", uid)
      );

      const snapshot = await getDocs(q);

      const loaded = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
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

      setOrders(loaded);
    } catch (error) {
      console.error("Erreur chargement commandes :", error);
    } finally {
      setOrdersLoading(false);
    }
  }

  function showHome() {
    setPage("home");
    setSelectedService(null);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCatalog(categoryKey = "all", searchValue = "") {
    setCategory(categoryKey);
    setActiveSearch(searchValue);
    setSearch(searchValue);
    setPage("catalog");
    setSelectedService(null);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openService(service) {
    setSelectedService(service);
    setSelectedPackage("standard");
    setPage("service");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFavorite(serviceId) {
    setFavorites((current) => {
      if (current.includes(serviceId)) {
        setToast("Retiré des favoris");
        return current.filter((id) => id !== serviceId);
      }

      setToast("Ajouté aux favoris");
      return [...current, serviceId];
    });
  }

  function submitSearch(event) {
    event.preventDefault();
    openCatalog("all", search.trim());
  }

  const filteredServices = useMemo(() => {
    let result = [...SERVICES];

    if (category !== "all") {
      result = result.filter(
        (service) => service.categoryKey === category
      );
    }

    if (activeSearch.trim()) {
      const term = activeSearch.toLowerCase();

      result = result.filter((service) =>
        [
          service.title,
          service.shortTitle,
          service.description,
          service.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    if (maxPrice) {
      result = result.filter(
        (service) => service.price <= Number(maxPrice)
      );
    }

    if (sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [category, activeSearch, maxPrice, sort]);

  function startOrder(service) {
    setSelectedService(service);
    setSelectedPackage("standard");
    setOrderCreated(null);
    setPaymentMessage("");
    setPage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createOrder() {
    if (!selectedService) return;

    if (!customer.name.trim()) {
      setToast("Veuillez renseigner votre nom.");
      return;
    }

    if (!customer.email.trim()) {
      setToast("Veuillez renseigner votre adresse e-mail.");
      return;
    }

    if (!customer.phone.trim()) {
      setToast("Veuillez renseigner votre téléphone.");
      return;
    }

    if (!customer.description.trim()) {
      setToast("Veuillez expliquer votre besoin.");
      return;
    }

    setOrderSubmitting(true);

    try {
      const currentUser = await ensureAuth();

      const packageData =
        selectedService.packages[selectedPackage];

      const orderNumber = createOrderNumber();
      const tracking = createTrackingCode();

      const order = {
        orderNumber,
        trackingCode: tracking,

        customerUid: currentUser.uid,
        customerName: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),

        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        package: packageData.name,

        description: customer.description.trim(),

        amount: Number(packageData.price),

        status: "Reçue",
        paymentStatus: "Non payé",

        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "orders", orderNumber), order);

      await setDoc(doc(db, "tracking", tracking), {
        orderId: orderNumber,
        orderNumber,
        trackingCode: tracking,

        customerUid: currentUser.uid,
        customerName: customer.name.trim(),
        email: customer.email.trim(),

        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        package: packageData.name,

        amount: Number(packageData.price),

        status: "Reçue",
        paymentStatus: "Non payé",

        deliveryUrl: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const localOrder = {
        ...order,
        id: orderNumber,
      };

      setOrders((current) => [localOrder, ...current]);

      setOrderCreated(localOrder);
      setPage("confirmation");

      setToast("Commande créée avec succès.");
    } catch (error) {
      console.error("Erreur création commande :", error);
      setToast(
        "Impossible de créer la commande. Veuillez réessayer."
      );
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function payOrder(order) {
    if (!order) return;

    setPaymentLoading(true);
    setPaymentMessage("");

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
            description:
              order.serviceTitle || "Prestation en ligne",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok || !data.paymentUrl) {
        throw new Error(
          data.message || "Création du paiement impossible."
        );
      }

      window.location.href = data.paymentUrl;
    } catch (error) {
      console.error("Erreur paiement :", error);

      setPaymentMessage(
        error.message ||
          "Impossible de lancer le paiement."
      );

      setPaymentLoading(false);
    }
  }

  async function searchTracking(event) {
    event?.preventDefault();

    if (!trackingCode.trim()) {
      setToast("Entrez un numéro de suivi.");
      return;
    }

    setTrackingLoading(true);
    setTrackingResult(null);

    try {
      const snapshot = await getDocs(
        query(
          collection(db, "tracking"),
          where(
            "trackingCode",
            "==",
            trackingCode.trim().toUpperCase()
          )
        )
      );

      if (snapshot.empty) {
        setToast("Commande introuvable.");
        return;
      }

      const item = snapshot.docs[0];

      setTrackingResult({
        id: item.id,
        ...item.data(),
      });
    } catch (error) {
      console.error("Erreur suivi :", error);
      setToast("Impossible de rechercher la commande.");
    } finally {
      setTrackingLoading(false);
    }
  }

  function goToOrders() {
    setPage("orders");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToFavorites() {
    setPage("favorites");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToTracking() {
    setPage("tracking");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const favoriteServices = SERVICES.filter((service) =>
    favorites.includes(service.id)
  );

  const selectedPackageData = selectedService
    ? selectedService.packages[selectedPackage]
    : null;

  if (authLoading) {
    return (
      <>
        <GlobalStyles />

        <div className="loading-screen">
          <div className="loading-logo">P</div>
          <div className="spinner" />
          <div>Chargement de la marketplace...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />

      <div className="app">
        <Header
          search={search}
          setSearch={setSearch}
          submitSearch={submitSearch}
          onHome={showHome}
          onCatalog={() => openCatalog()}
          onOrders={goToOrders}
          onFavorites={goToFavorites}
          onTracking={goToTracking}
          favoritesCount={favorites.length}
          mobileMenu={mobileMenu}
          setMobileMenu={setMobileMenu}
        />

        {page === "home" && (
          <HomePage
            onSearch={openCatalog}
            onCategory={openCatalog}
            onService={openService}
            onCatalog={() => openCatalog()}
            favorites={favorites}
            onFavorite={toggleFavorite}
          />
        )}

        {page === "catalog" && (
          <CatalogPage
            services={filteredServices}
            category={category}
            setCategory={setCategory}
            search={activeSearch}
            setSearch={setActiveSearch}
            sort={sort}
            setSort={setSort}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            onService={openService}
            favorites={favorites}
            onFavorite={toggleFavorite}
          />
        )}

        {page === "service" && selectedService && (
          <ServicePage
            service={selectedService}
            selectedPackage={selectedPackage}
            setSelectedPackage={setSelectedPackage}
            onBack={() => openCatalog(selectedService.categoryKey)}
            onOrder={() => startOrder(selectedService)}
            favorites={favorites}
            onFavorite={toggleFavorite}
          />
        )}

        {page === "checkout" && selectedService && (
          <CheckoutPage
            service={selectedService}
            selectedPackage={selectedPackage}
            setSelectedPackage={setSelectedPackage}
            customer={customer}
            setCustomer={setCustomer}
            packageData={selectedPackageData}
            onBack={() => openService(selectedService)}
            onCreateOrder={createOrder}
            loading={orderSubmitting}
          />
        )}

        {page === "confirmation" && orderCreated && (
          <ConfirmationPage
            order={orderCreated}
            onPay={() => payOrder(orderCreated)}
            paymentLoading={paymentLoading}
            paymentMessage={paymentMessage}
            onOrders={goToOrders}
            onTracking={() => {
              setTrackingCode(orderCreated.trackingCode);
              setPage("tracking");
            }}
          />
        )}

        {page === "orders" && (
          <OrdersPage
            orders={orders}
            loading={ordersLoading}
            paymentMessage={paymentMessage}
            onPay={payOrder}
            paymentLoading={paymentLoading}
            onTracking={(order) => {
              setTrackingCode(order.trackingCode || "");
              setPage("tracking");
            }}
          />
        )}

        {page === "favorites" && (
          <FavoritesPage
            services={favoriteServices}
            onService={openService}
            onFavorite={toggleFavorite}
          />
        )}

        {page === "tracking" && (
          <TrackingPage
            trackingCode={trackingCode}
            setTrackingCode={setTrackingCode}
            trackingResult={trackingResult}
            loading={trackingLoading}
            onSearch={searchTracking}
          />
        )}

        {page === "account" && (
          <AccountPage
            user={user}
            orders={orders}
            onOrders={goToOrders}
            onFavorites={goToFavorites}
          />
        )}

        <Footer onCategory={openCatalog} />

        {toast && (
          <div className="toast">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

function Header({
  search,
  setSearch,
  submitSearch,
  onHome,
  onCatalog,
  onOrders,
  onFavorites,
  onTracking,
  favoritesCount,
  mobileMenu,
  setMobileMenu,
}) {
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <button className="brand" onClick={onHome}>
            <span className="brand-mark">P</span>
            <span>Prestations</span>
          </button>

          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>

          <nav className="desktop-nav">
            <button onClick={onCatalog}>
              Explorer
            </button>

            <button onClick={onCatalog}>
              Catégories
              <ChevronDown size={15} />
            </button>
          </nav>

          <form
            className="header-search"
            onSubmit={submitSearch}
          >
            <Search size={19} />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Que recherchez-vous ?"
            />
            <button type="submit">Rechercher</button>
          </form>

          <nav className="desktop-actions">
            <button
              className="icon-action"
              onClick={onFavorites}
              title="Favoris"
            >
              <Heart size={19} />
              {favoritesCount > 0 && (
                <span className="counter">
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              className="nav-action"
              onClick={onOrders}
            >
              <ShoppingBag size={18} />
              Commandes
            </button>

            <button
              className="nav-action"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-account")
                );
              }}
            >
              <User size={18} />
              Compte
            </button>
          </nav>
        </div>
      </header>

      {mobileMenu && (
        <div className="mobile-nav">
          <form
            className="mobile-search"
            onSubmit={(event) => {
              submitSearch(event);
              setMobileMenu(false);
            }}
          >
            <Search size={18} />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher une prestation"
            />
          </form>

          <button onClick={onCatalog}>
            Explorer les prestations
          </button>

          <button onClick={onFavorites}>
            <Heart size={18} />
            Mes favoris
          </button>

          <button onClick={onOrders}>
            <ShoppingBag size={18} />
            Mes commandes
          </button>

          <button onClick={onTracking}>
            <PackageCheck size={18} />
            Suivre une commande
          </button>
        </div>
      )}
    </>
  );
}

function HomePage({
  onSearch,
  onCategory,
  onService,
  onCatalog,
  favorites,
  onFavorite,
}) {
  const [heroSearch, setHeroSearch] = useState("");

  const popular = [
    "Vidéo publicitaire",
    "Logo",
    "Site web",
    "Marketing",
    "Intelligence artificielle",
  ];

  return (
    <main>
      <section className="hero">
        <div className="hero-background-circle hero-circle-one" />
        <div className="hero-background-circle hero-circle-two" />

        <div className="container hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            La marketplace de prestations en ligne
          </div>

          <h1>
            Tout ce qu'il vous faut
            <br />
            <span>pour développer votre activité.</span>
          </h1>

          <p className="hero-description">
            Trouvez des prestations professionnelles en
            vidéo, design, web, marketing, IA et plus encore.
          </p>

          <form
            className="hero-search"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch("all", heroSearch.trim());
            }}
          >
            <Search size={23} />
            <input
              value={heroSearch}
              onChange={(event) =>
                setHeroSearch(event.target.value)
              }
              placeholder="Ex. créer une vidéo publicitaire pour mon restaurant"
            />
            <button type="submit">
              Rechercher
            </button>
          </form>

          <div className="popular-searches">
            <span>Recherches populaires :</span>

            {popular.map((item) => (
              <button
                key={item}
                onClick={() => onSearch("all", item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div>
            <ShieldCheck />
            <div>
              <strong>Paiement sécurisé</strong>
              <span>Paiement en ligne protégé</span>
            </div>
          </div>

          <div>
            <PackageCheck />
            <div>
              <strong>Suivi de commande</strong>
              <span>Suivez votre prestation</span>
            </div>
          </div>

          <div>
            <Truck />
            <div>
              <strong>Livraison en ligne</strong>
              <span>Recevez vos fichiers</span>
            </div>
          </div>

          <div>
            <Globe2 />
            <div>
              <strong>Accessible partout</strong>
              <span>Services disponibles en ligne</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeader
            title="Explorer les catégories"
            action="Voir toutes les prestations"
            onAction={onCatalog}
          />

          <div className="category-grid">
            {CATEGORIES.filter(
              (category) => category.id !== "all"
            ).map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className="category-card"
                  key={item.id}
                  onClick={() => onCategory(item.id)}
                >
                  <span className="category-icon">
                    <Icon size={26} />
                  </span>

                  <strong>{item.label}</strong>

                  <span>
                    Découvrir
                    <ChevronRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-gray">
        <div className="container">
          <SectionHeader
            title="Prestations populaires"
            subtitle="Des services prêts à commander."
            action="Tout voir"
            onAction={onCatalog}
          />

          <div className="service-grid">
            {SERVICES.slice(0, 6).map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={() => onService(service)}
                favorite={favorites.includes(service.id)}
                onFavorite={() =>
                  onFavorite(service.id)
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="ai-banner">
        <div className="container ai-banner-inner">
          <div>
            <div className="ai-label">
              <Bot size={17} />
              PRESTATIONS IA
            </div>

            <h2>
              Donnez vie à vos idées avec
              l'intelligence artificielle.
            </h2>

            <p>
              Vidéos publicitaires, contenus, automatisation
              et solutions numériques.
            </p>

            <button
              className="button-white"
              onClick={() =>
                onSearch("ai", "")
              }
            >
              Explorer les services IA
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="ai-visual">
            <Bot size={90} strokeWidth={1.2} />
            <Sparkles
              className="ai-sparkle"
              size={30}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="process-title">
            <div className="eyebrow">
              COMMENT ÇA MARCHE
            </div>

            <h2>
              Commander une prestation
              simplement
            </h2>
          </div>

          <div className="process-grid">
            <ProcessStep
              number="01"
              icon={<Search />}
              title="Trouvez"
              text="Recherchez la prestation dont vous avez besoin."
            />

            <ProcessStep
              number="02"
              icon={<ShoppingBag />}
              title="Commandez"
              text="Choisissez votre formule et envoyez vos besoins."
            />

            <ProcessStep
              number="03"
              icon={<CreditCard />}
              title="Payez"
              text="Effectuez votre paiement en ligne."
            />

            <ProcessStep
              number="04"
              icon={<PackageCheck />}
              title="Recevez"
              text="Suivez votre commande et récupérez votre livraison."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function CatalogPage({
  services,
  category,
  setCategory,
  search,
  setSearch,
  sort,
  setSort,
  maxPrice,
  setMaxPrice,
  filterOpen,
  setFilterOpen,
  onService,
  favorites,
  onFavorite,
}) {
  return (
    <main className="catalog-page">
      <div className="container">
        <div className="breadcrumbs">
          Accueil
          <ChevronRight size={14} />
          Prestations
          {category !== "all" && (
            <>
              <ChevronRight size={14} />
              {
                CATEGORIES.find(
                  (item) => item.id === category
                )?.label
              }
            </>
          )}
        </div>

        <div className="catalog-heading">
          <div>
            <h1>
              {search
                ? `Prestations pour « ${search} »`
                : category === "all"
                ? "Toutes les prestations"
                : CATEGORIES.find(
                    (item) => item.id === category
                  )?.label}
            </h1>

            <p>
              {services.length} prestation
              {services.length > 1 ? "s" : ""} disponible
              {services.length > 1 ? "s" : ""}
            </p>
          </div>

          <button
            className="filter-mobile-button"
            onClick={() =>
              setFilterOpen(!filterOpen)
            }
          >
            <SlidersHorizontal size={18} />
            Filtres
          </button>
        </div>

        <div className="catalog-layout">
          <aside
            className={`filter-sidebar ${
              filterOpen ? "filter-visible" : ""
            }`}
          >
            <div className="filter-title">
              <strong>Filtrer</strong>

              <button
                onClick={() => {
                  setCategory("all");
                  setMaxPrice("");
                  setFilterOpen(false);
                }}
              >
                Réinitialiser
              </button>
            </div>

            <div className="filter-group">
              <h3>Catégories</h3>

              {CATEGORIES.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    className={`filter-category ${
                      category === item.id
                        ? "active"
                        : ""
                    }`}
                    key={item.id}
                    onClick={() => {
                      setCategory(item.id);
                      setFilterOpen(false);
                    }}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="filter-group">
              <h3>Budget maximum</h3>

              <select
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(event.target.value)
                }
              >
                <option value="">
                  Tous les budgets
                </option>
                <option value="15000">
                  Jusqu'à 15 000 FCFA
                </option>
                <option value="30000">
                  Jusqu'à 30 000 FCFA
                </option>
                <option value="75000">
                  Jusqu'à 75 000 FCFA
                </option>
                <option value="150000">
                  Jusqu'à 150 000 FCFA
                </option>
                <option value="300000">
                  Jusqu'à 300 000 FCFA
                </option>
              </select>
            </div>

            <div className="filter-security">
              <ShieldCheck size={20} />

              <div>
                <strong>Paiement sécurisé</strong>
                <span>
                  Vos paiements sont traités
                  de manière sécurisée.
                </span>
              </div>
            </div>
          </aside>

          <section className="catalog-results">
            <div className="results-toolbar">
              <div>
                <strong>
                  {services.length} résultats
                </strong>
              </div>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value)
                }
              >
                <option value="popular">
                  Trier : Pertinence
                </option>
                <option value="price-low">
                  Prix : croissant
                </option>
                <option value="price-high">
                  Prix : décroissant
                </option>
              </select>
            </div>

            {services.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="service-grid catalog-grid">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => onService(service)}
                    favorite={favorites.includes(
                      service.id
                    )}
                    onFavorite={() =>
                      onFavorite(service.id)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ServiceCard({
  service,
  onClick,
  favorite,
  onFavorite,
}) {
  return (
    <article className="service-card">
      <div
        className="service-card-cover"
        onClick={onClick}
      >
        <ServiceArtwork service={service} />

        {service.badge && (
          <span className="service-badge">
            {service.badge}
          </span>
        )}

        <button
          className={`favorite-button ${
            favorite ? "is-favorite" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Heart
            size={19}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="service-card-body">
        <div className="provider-row">
          <span className="provider-avatar">
            P
          </span>

          <div>
            <strong>Prestations Studio</strong>
            <span>Service professionnel</span>
          </div>
        </div>

        <button
          className="service-title"
          onClick={onClick}
        >
          {service.title}
        </button>

        <div className="service-meta">
          <span>
            <Clock3 size={15} />
            {service.delivery}
          </span>

          <span>
            <ShieldCheck size={15} />
            Paiement sécurisé
          </span>
        </div>

        <div className="service-card-footer">
          <span>
            À partir de
            <strong>
              {formatMoney(service.price)}
            </strong>
          </span>

          <button onClick={onClick}>
            Voir
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ServicePage({
  service,
  selectedPackage,
  setSelectedPackage,
  onBack,
  onOrder,
  favorites,
  onFavorite,
}) {
  const packageData =
    service.packages[selectedPackage];

  return (
    <main className="service-page">
      <div className="container">
        <div className="breadcrumbs">
          <button onClick={onBack}>
            <ArrowLeft size={15} />
            Retour
          </button>

          <ChevronRight size={14} />
          {service.category}
        </div>

        <div className="service-detail-layout">
          <div>
            <div className="service-detail-cover">
              <ServiceArtwork
                service={service}
                large
              />

              <button
                className={`detail-favorite ${
                  favorites.includes(service.id)
                    ? "is-favorite"
                    : ""
                }`}
                onClick={() =>
                  onFavorite(service.id)
                }
              >
                <Heart
                  size={21}
                  fill={
                    favorites.includes(service.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            <div className="service-description">
              <div className="eyebrow">
                {service.category}
              </div>

              <h1>{service.title}</h1>

              <p>{service.description}</p>

              <div className="seller-profile">
                <div className="seller-avatar">
                  P
                </div>

                <div>
                  <strong>
                    Prestations Studio
                  </strong>
                  <span>
                    Prestations numériques
                    professionnelles
                  </span>
                </div>
              </div>

              <div className="detail-features">
                <div>
                  <ShieldCheck />
                  <strong>Paiement sécurisé</strong>
                </div>

                <div>
                  <PackageCheck />
                  <strong>Livraison en ligne</strong>
                </div>

                <div>
                  <Clock3 />
                  <strong>
                    Délai : {service.delivery}
                  </strong>
                </div>
              </div>

              <div className="service-about">
                <h2>À propos de cette prestation</h2>

                <p>
                  Cette prestation est réalisée
                  selon les besoins indiqués lors
                  de la commande. Les éléments
                  nécessaires sont demandés avant
                  le début du travail.
                </p>

                <p>
                  Après validation du paiement,
                  votre commande passe dans le
                  processus de traitement et vous
                  pouvez suivre son évolution.
                </p>
              </div>
            </div>
          </div>

          <aside className="package-panel">
            <div className="package-tabs">
              {["basic", "standard", "premium"].map(
                (key) => (
                  <button
                    key={key}
                    className={
                      selectedPackage === key
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedPackage(key)
                    }
                  >
                    {service.packages[key].name}
                  </button>
                )
              )}
            </div>

            <div className="package-content">
              <div className="package-heading">
                <h2>{packageData.name}</h2>

                <strong>
                  {formatMoney(packageData.price)}
                </strong>
              </div>

              <p className="package-description">
                {packageData.description}
              </p>

              <div className="package-info">
                <span>
                  <Clock3 size={17} />
                  {packageData.delivery}
                </span>

                <span>
                  <CheckCircle2 size={17} />
                  {packageData.revisions} révision
                  {packageData.revisions > 1
                    ? "s"
                    : ""}
                </span>
              </div>

              <h3>Ce qui est inclus</h3>

              <ul className="included-list">
                {packageData.items.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={17} />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                className="button-primary full"
                onClick={onOrder}
              >
                Continuer
                <ChevronRight size={19} />
              </button>

              <div className="safe-order">
                <ShieldCheck size={18} />

                <span>
                  Vous pourrez vérifier votre
                  commande avant le paiement.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CheckoutPage({
  service,
  selectedPackage,
  setSelectedPackage,
  customer,
  setCustomer,
  packageData,
  onBack,
  onCreateOrder,
  loading,
}) {
  return (
    <main className="checkout-page">
      <div className="container">
        <div className="breadcrumbs">
          <button onClick={onBack}>
            <ArrowLeft size={15} />
            Retour
          </button>

          <ChevronRight size={14} />
          Commande
        </div>

        <div className="checkout-title">
          <div className="eyebrow">
            FINALISER LA COMMANDE
          </div>

          <h1>Votre commande</h1>

          <p>
            Renseignez les informations nécessaires
            pour commencer votre prestation.
          </p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-form">
            <div className="checkout-card">
              <div className="checkout-card-header">
                <span className="step-number">
                  1
                </span>

                <div>
                  <h2>Choisissez votre formule</h2>
                  <p>
                    Sélectionnez le niveau de service
                    souhaité.
                  </p>
                </div>
              </div>

              <div className="checkout-packages">
                {["basic", "standard", "premium"].map(
                  (key) => {
                    const item =
                      service.packages[key];

                    return (
                      <button
                        key={key}
                        className={`checkout-package ${
                          selectedPackage === key
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedPackage(key)
                        }
                      >
                        <div>
                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            {item.delivery}
                          </span>
                        </div>

                        <strong>
                          {formatMoney(item.price)}
                        </strong>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="checkout-card">
              <div className="checkout-card-header">
                <span className="step-number">
                  2
                </span>

                <div>
                  <h2>Vos informations</h2>
                  <p>
                    Ces informations nous permettent
                    de traiter votre commande.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  Nom complet
                  <input
                    value={customer.name}
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        name: event.target.value,
                      })
                    }
                    placeholder="Votre nom"
                  />
                </label>

                <label>
                  Adresse e-mail
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        email: event.target.value,
                      })
                    }
                    placeholder="vous@example.com"
                  />
                </label>

                <label>
                  Téléphone
                  <input
                    value={customer.phone}
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        phone: event.target.value,
                      })
                    }
                    placeholder="+225..."
                  />
                </label>
              </div>
            </div>

            <div className="checkout-card">
              <div className="checkout-card-header">
                <span className="step-number">
                  3
                </span>

                <div>
                  <h2>Expliquez votre besoin</h2>
                  <p>
                    Donnez-nous les informations
                    nécessaires à la réalisation.
                  </p>
                </div>
              </div>

              <label className="textarea-label">
                Description de votre projet

                <textarea
                  rows="7"
                  value={customer.description}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Décrivez votre projet, vos objectifs, les éléments à utiliser, les dimensions, les textes, etc."
                />
              </label>
            </div>

            <div className="checkout-security">
              <Lock size={19} />

              <span>
                Vos informations sont utilisées
                uniquement pour traiter votre commande.
              </span>
            </div>
          </section>

          <aside className="checkout-summary">
            <div className="summary-card">
              <div className="summary-cover">
                <ServiceArtwork service={service} />
              </div>

              <div className="summary-content">
                <span className="summary-category">
                  {service.category}
                </span>

                <h2>{service.title}</h2>

                <div className="summary-package">
                  <span>
                    Formule
                  </span>

                  <strong>
                    {packageData.name}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Prestation</span>
                  <strong>
                    {formatMoney(
                      packageData.price
                    )}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Frais</span>
                  <strong>
                    0 FCFA
                  </strong>
                </div>

                <div className="summary-total">
                  <span>Total</span>
                  <strong>
                    {formatMoney(
                      packageData.price
                    )}
                  </strong>
                </div>

                <button
                  className="button-primary full"
                  disabled={loading}
                  onClick={onCreateOrder}
                >
                  {loading
                    ? "Création..."
                    : "Créer la commande"}
                  {!loading && (
                    <ChevronRight size={19} />
                  )}
                </button>

                <p className="summary-note">
                  Le paiement sera proposé après
                  la création de votre commande.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ConfirmationPage({
  order,
  onPay,
  paymentLoading,
  paymentMessage,
  onOrders,
  onTracking,
}) {
  return (
    <main className="confirmation-page">
      <div className="container narrow">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={42} />
          </div>

          <div className="eyebrow">
            COMMANDE CRÉÉE
          </div>

          <h1>Votre commande a été reçue.</h1>

          <p>
            Votre commande est enregistrée. Vous
            pouvez maintenant effectuer le paiement
            pour commencer le traitement.
          </p>

          <div className="order-number-box">
            <span>Numéro de commande</span>
            <strong>{order.orderNumber}</strong>
          </div>

          <div className="order-number-box">
            <span>Numéro de suivi</span>
            <strong>{order.trackingCode}</strong>
          </div>

          <div className="confirmation-price">
            <span>Montant</span>
            <strong>
              {formatMoney(order.amount)}
            </strong>
          </div>

          {paymentMessage && (
            <div className="payment-message">
              {paymentMessage}
            </div>
          )}

          <button
            className="button-primary full"
            onClick={onPay}
            disabled={paymentLoading}
          >
            <CreditCard size={19} />
            {paymentLoading
              ? "Préparation du paiement..."
              : "Payer maintenant"}
          </button>

          <div className="confirmation-secondary">
            <button onClick={onTracking}>
              <PackageCheck size={18} />
              Suivre la commande
            </button>

            <button onClick={onOrders}>
              <ShoppingBag size={18} />
              Mes commandes
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function OrdersPage({
  orders,
  loading,
  paymentMessage,
  onPay,
  paymentLoading,
  onTracking,
}) {
  return (
    <main className="dashboard-page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">
              ESPACE CLIENT
            </div>

            <h1>Mes commandes</h1>

            <p>
              Retrouvez ici toutes vos commandes et
              leur état.
            </p>
          </div>

          <div className="dashboard-stat">
            <strong>{orders.length}</strong>
            <span>commande(s)</span>
          </div>
        </div>

        {paymentMessage && (
          <div className="payment-message dashboard-message">
            {paymentMessage}
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner" />
            Chargement de vos commandes...
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-dashboard">
            <ShoppingBag size={40} />

            <h2>Vous n'avez pas encore de commande</h2>

            <p>
              Explorez les prestations disponibles
              pour commencer.
            </p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPay={() => onPay(order)}
                paymentLoading={paymentLoading}
                onTracking={() => onTracking(order)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function OrderCard({
  order,
  onPay,
  paymentLoading,
  onTracking,
}) {
  const statusClass =
    order.status === "Livrée"
      ? "green"
      : order.status === "En cours"
      ? "blue"
      : order.status === "Acceptée"
      ? "purple"
      : "orange";

  return (
    <article className="order-card">
      <div className="order-card-top">
        <div>
          <span className="order-label">
            COMMANDE
          </span>

          <strong>{order.orderNumber}</strong>
        </div>

        <span
          className={`status-badge ${statusClass}`}
        >
          {order.status || "Reçue"}
        </span>
      </div>

      <div className="order-card-main">
        <div>
          <h2>{order.serviceTitle}</h2>

          <div className="order-details">
            <span>
              Formule :{" "}
              <strong>{order.package}</strong>
            </span>

            <span>
              Montant :{" "}
              <strong>
                {formatMoney(order.amount)}
              </strong>
            </span>

            <span>
              Paiement :{" "}
              <strong>
                {order.paymentStatus ||
                  "Non payé"}
              </strong>
            </span>
          </div>
        </div>

        <div className="order-actions">
          {order.paymentStatus !== "Payé" && (
            <button
              className="button-primary"
              onClick={onPay}
              disabled={paymentLoading}
            >
              <CreditCard size={17} />
              Payer
            </button>
          )}

          <button
            className="button-secondary"
            onClick={onTracking}
          >
            <PackageCheck size={17} />
            Suivre
          </button>

          {order.deliveryUrl &&
            order.status === "Livrée" && (
              <a
                className="button-secondary"
                href={order.deliveryUrl}
                target="_blank"
                rel="noreferrer"
              >
                Télécharger
              </a>
            )}
        </div>
      </div>

      <div className="order-progress">
        {[
          "Reçue",
          "Acceptée",
          "En cours",
          "Livrée",
          "Terminée",
        ].map((step, index) => {
          const statuses = [
            "Reçue",
            "Acceptée",
            "En cours",
            "Livrée",
            "Terminée",
          ];

          const current =
            statuses.indexOf(
              order.status || "Reçue"
            );

          const completed = index <= current;

          return (
            <React.Fragment key={step}>
              <div
                className={`progress-step ${
                  completed ? "completed" : ""
                }`}
              >
                <span>
                  {completed ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    index + 1
                  )}
                </span>

                <small>{step}</small>
              </div>

              {index < 4 && (
                <div
                  className={`progress-line ${
                    index < current
                      ? "completed"
                      : ""
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </article>
  );
}

function TrackingPage({
  trackingCode,
  setTrackingCode,
  trackingResult,
  loading,
  onSearch,
}) {
  return (
    <main className="tracking-page">
      <div className="container narrow">
        <div className="tracking-header">
          <div className="tracking-icon">
            <PackageCheck size={40} />
          </div>

          <div className="eyebrow">
            SUIVI DE COMMANDE
          </div>

          <h1>Où en est votre commande ?</h1>

          <p>
            Entrez votre numéro de suivi pour voir
            l'état de votre prestation.
          </p>

          <form
            className="tracking-search"
            onSubmit={onSearch}
          >
            <Search size={20} />

            <input
              value={trackingCode}
              onChange={(event) =>
                setTrackingCode(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Ex. TRK-ABC123456"
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Recherche..." : "Rechercher"}
            </button>
          </form>
        </div>

        {trackingResult && (
          <TrackingResult order={trackingResult} />
        )}
      </div>
    </main>
  );
}

function TrackingResult({ order }) {
  const steps = [
    "Reçue",
    "Acceptée",
    "En cours",
    "Livrée",
    "Terminée",
  ];

  const current = Math.max(
    0,
    steps.indexOf(order.status || "Reçue")
  );

  return (
    <div className="tracking-result">
      <div className="tracking-result-header">
        <div>
          <span>COMMANDE</span>
          <strong>{order.orderNumber}</strong>
        </div>

        <span className="status-badge green">
          {order.status}
        </span>
      </div>

      <h2>{order.serviceTitle}</h2>

      <div className="tracking-timeline">
        {steps.map((step, index) => (
          <div
            className={`timeline-step ${
              index <= current ? "active" : ""
            }`}
            key={step}
          >
            <div className="timeline-dot">
              {index <= current ? (
                <CheckCircle2 size={18} />
              ) : (
                index + 1
              )}
            </div>

            <div>
              <strong>{step}</strong>

              <span>
                {index === current
                  ? "Étape actuelle"
                  : index < current
                  ? "Terminée"
                  : "À venir"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="tracking-payment">
        <div>
          <CreditCard size={19} />

          <span>
            Paiement
            <strong>
              {order.paymentStatus}
            </strong>
          </span>
        </div>

        <div>
          <PackageCheck size={19} />

          <span>
            Suivi
            <strong>
              {order.trackingCode}
            </strong>
          </span>
        </div>
      </div>

      {order.deliveryUrl &&
        order.status === "Livrée" && (
          <a
            href={order.deliveryUrl}
            target="_blank"
            rel="noreferrer"
            className="button-primary full"
          >
            <PackageCheck size={19} />
            Accéder à ma livraison
          </a>
        )}
    </div>
  );
}

function FavoritesPage({
  services,
  onService,
  onFavorite,
}) {
  return (
    <main className="dashboard-page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">
              VOS FAVORIS
            </div>

            <h1>Mes prestations favorites</h1>

            <p>
              Retrouvez les prestations que vous
              avez enregistrées.
            </p>
          </div>

          <Heart size={42} />
        </div>

        {services.length === 0 ? (
          <div className="empty-dashboard">
            <Heart size={40} />

            <h2>Aucun favori</h2>

            <p>
              Cliquez sur le cœur d'une prestation
              pour la retrouver ici.
            </p>
          </div>
        ) : (
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onClick={() => onService(service)}
                favorite
                onFavorite={() =>
                  onFavorite(service.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AccountPage({
  user,
  orders,
  onOrders,
  onFavorites,
}) {
  return (
    <main className="dashboard-page">
      <div className="container narrow">
        <div className="account-card">
          <div className="account-avatar">
            <User size={38} />
          </div>

          <div className="eyebrow">
            ESPACE CLIENT
          </div>

          <h1>Mon compte</h1>

          <p>
            Votre espace personnel pour gérer vos
            prestations.
          </p>

          <div className="account-info">
            <div>
              <span>Session client</span>
              <strong>
                {user?.uid
                  ? "Active"
                  : "Non connectée"}
              </strong>
            </div>

            <div>
              <span>Commandes</span>
              <strong>{orders.length}</strong>
            </div>
          </div>

          <div className="account-actions">
            <button
              className="button-primary"
              onClick={onOrders}
            >
              <ShoppingBag size={18} />
              Mes commandes
            </button>

            <button
              className="button-secondary"
              onClick={onFavorites}
            >
              <Heart size={18} />
              Mes favoris
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
}

function ProcessStep({
  number,
  icon,
  title,
  text,
}) {
  return (
    <div className="process-step">
      <div className="process-number">
        {number}
      </div>

      <div className="process-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-results">
      <Search size={42} />

      <h2>Aucune prestation trouvée</h2>

      <p>
        Essayez une autre recherche ou une autre
        catégorie.
      </p>
    </div>
  );
}

function Footer({ onCategory }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <button
              className="brand footer-brand-button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
            >
              <span className="brand-mark">
                P
              </span>
              <span>Prestations</span>
            </button>

            <p>
              Une marketplace de prestations
              numériques pour les entreprises,
              créateurs et particuliers.
            </p>

            <div className="footer-secure">
              <ShieldCheck size={18} />
              Paiement sécurisé
            </div>
          </div>

          <div>
            <h3>Prestations</h3>

            <button
              onClick={() => onCategory("video")}
            >
              Vidéo & Animation
            </button>

            <button
              onClick={() => onCategory("design")}
            >
              Design
            </button>

            <button
              onClick={() => onCategory("web")}
            >
              Web & Développement
            </button>

            <button
              onClick={() => onCategory("marketing")}
            >
              Marketing
            </button>
          </div>

          <div>
            <h3>Solutions</h3>

            <button
              onClick={() => onCategory("ai")}
            >
              Intelligence artificielle
            </button>

            <button
              onClick={() => onCategory("apps")}
            >
              Applications mobiles
            </button>

            <button
              onClick={() => onCategory("writing")}
            >
              Rédaction
            </button>

            <button
              onClick={() => onCategory("business")}
            >
              Business
            </button>
          </div>

          <div>
            <h3>Service client</h3>

            <span className="footer-text">
              Suivi de commande
            </span>

            <span className="footer-text">
              Paiement sécurisé
            </span>

            <span className="footer-text">
              Livraison numérique
            </span>

            <span className="footer-text">
              <CircleHelp size={16} />
              Centre d'aide
            </span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Prestations.
            Tous droits réservés.
          </span>

          <span>
            Marketplace de services numériques
          </span>
        </div>
      </div>
    </footer>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        color: #111827;
        background: #ffffff;
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
        text-decoration: none;
        color: inherit;
      }

      .app {
        min-height: 100vh;
        background: #fff;
      }

      .container {
        width: min(1240px, calc(100% - 40px));
        margin: 0 auto;
      }

      .container.narrow {
        width: min(820px, calc(100% - 40px));
      }

      .header {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(255,255,255,.96);
        backdrop-filter: blur(15px);
        border-bottom: 1px solid #e5e7eb;
      }

      .header-inner {
        width: min(1400px, calc(100% - 40px));
        margin: 0 auto;
        min-height: 76px;
        display: flex;
        align-items: center;
        gap: 24px;
      }

      .brand {
        border: 0;
        background: none;
        padding: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 20px;
        font-weight: 800;
        color: #111827;
        white-space: nowrap;
      }

      .brand-mark {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #16a34a;
        color: #fff;
        font-weight: 900;
        box-shadow: 0 6px 18px rgba(22,163,74,.22);
      }

      .desktop-nav {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .desktop-nav button,
      .desktop-actions button {
        border: 0;
        background: transparent;
        color: #374151;
      }

      .desktop-nav button {
        padding: 10px 8px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 600;
      }

      .desktop-nav button:hover,
      .desktop-actions button:hover {
        color: #16a34a;
      }

      .header-search {
        flex: 1;
        max-width: 570px;
        min-width: 180px;
        height: 46px;
        border: 1px solid #cfd4dc;
        border-radius: 9px;
        display: flex;
        align-items: center;
        overflow: hidden;
        background: #fff;
      }

      .header-search > svg {
        margin-left: 14px;
        color: #6b7280;
      }

      .header-search input {
        border: 0;
        outline: 0;
        flex: 1;
        min-width: 0;
        padding: 0 12px;
        color: #111827;
      }

      .header-search button {
        height: 100%;
        border: 0;
        background: #111827;
        color: #fff;
        padding: 0 18px;
        font-weight: 700;
      }

      .header-search button:hover {
        background: #16a34a;
      }

      .desktop-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .nav-action {
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        white-space: nowrap;
      }

      .icon-action {
        position: relative;
        padding: 10px;
      }

      .counter {
        position: absolute;
        top: 2px;
        right: 1px;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: #16a34a;
        color: #fff;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }

      .mobile-menu-button {
        display: none;
        border: 0;
        background: none;
      }

      .mobile-nav {
        display: none;
      }

      .hero {
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at 85% 10%, rgba(74,222,128,.22), transparent 30%),
          linear-gradient(135deg, #064e3b 0%, #065f46 52%, #047857 100%);
        color: #fff;
        padding: 92px 0 84px;
      }

      .hero-background-circle {
        position: absolute;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.08);
      }

      .hero-circle-one {
        width: 500px;
        height: 500px;
        right: -190px;
        top: -220px;
      }

      .hero-circle-two {
        width: 340px;
        height: 340px;
        left: -150px;
        bottom: -210px;
      }

      .hero-content {
        position: relative;
        z-index: 2;
      }

      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 13px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.08);
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
      }

      .hero h1 {
        max-width: 850px;
        font-size: clamp(40px, 6vw, 68px);
        line-height: 1.05;
        letter-spacing: -2.8px;
        margin: 24px 0 20px;
      }

      .hero h1 span {
        color: #bbf7d0;
      }

      .hero-description {
        max-width: 690px;
        font-size: 18px;
        line-height: 1.65;
        color: #d1fae5;
        margin-bottom: 30px;
      }

      .hero-search {
        width: min(760px, 100%);
        height: 62px;
        background: #fff;
        border-radius: 8px;
        display: flex;
        align-items: center;
        overflow: hidden;
        color: #6b7280;
        box-shadow: 0 20px 50px rgba(0,0,0,.18);
      }

      .hero-search > svg {
        margin-left: 19px;
      }

      .hero-search input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        padding: 0 15px;
        font-size: 16px;
      }

      .hero-search button {
        height: 100%;
        border: 0;
        padding: 0 28px;
        background: #16a34a;
        color: white;
        font-weight: 800;
      }

      .hero-search button:hover {
        background: #15803d;
      }

      .popular-searches {
        margin-top: 17px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        color: #d1fae5;
        font-size: 13px;
      }

      .popular-searches button {
        border: 1px solid rgba(255,255,255,.2);
        background: rgba(255,255,255,.06);
        color: white;
        border-radius: 999px;
        padding: 7px 11px;
      }

      .popular-searches button:hover {
        background: rgba(255,255,255,.14);
      }

      .trust-strip {
        border-bottom: 1px solid #e5e7eb;
        background: #fff;
      }

      .trust-grid {
        min-height: 100px;
        display: grid;
        grid-template-columns: repeat(4,1fr);
        gap: 25px;
        align-items: center;
      }

      .trust-grid > div {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .trust-grid svg {
        color: #16a34a;
      }

      .trust-grid strong,
      .trust-grid span {
        display: block;
      }

      .trust-grid strong {
        font-size: 14px;
      }

      .trust-grid span {
        color: #6b7280;
        font-size: 12px;
        margin-top: 3px;
      }

      .section {
        padding: 72px 0;
      }

      .section-gray {
        background: #f7f8f7;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 20px;
        margin-bottom: 28px;
      }

      .section-header h2 {
        margin: 0;
        font-size: 30px;
        letter-spacing: -.8px;
      }

      .section-header p {
        color: #6b7280;
        margin: 7px 0 0;
      }

      .section-header button {
        border: 0;
        background: transparent;
        color: #15803d;
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 700;
      }

      .category-grid {
        display: grid;
        grid-template-columns: repeat(4,1fr);
        gap: 14px;
      }

      .category-card {
        min-height: 170px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fff;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
        text-align: left;
        transition: .2s ease;
      }

      .category-card:hover {
        border-color: #86efac;
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(15,23,42,.07);
      }

      .category-icon {
        width: 54px;
        height: 54px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ecfdf3;
        color: #16a34a;
      }

      .category-card strong {
        font-size: 16px;
      }

      .category-card > span:last-child {
        display: flex;
        align-items: center;
        gap: 3px;
        color: #6b7280;
        font-size: 12px;
      }

      .service-grid {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 22px;
      }

      .service-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        min-width: 0;
        transition: .2s ease;
      }

      .service-card:hover {
        box-shadow: 0 15px 35px rgba(15,23,42,.08);
        transform: translateY(-3px);
      }

      .service-card-cover {
        position: relative;
        cursor: pointer;
      }

      .service-badge {
        position: absolute;
        left: 13px;
        top: 13px;
        padding: 6px 9px;
        border-radius: 5px;
        background: #fff;
        color: #166534;
        font-size: 11px;
        font-weight: 800;
      }

      .favorite-button {
        position: absolute;
        right: 13px;
        top: 13px;
        width: 39px;
        height: 39px;
        border-radius: 50%;
        border: 0;
        background: rgba(255,255,255,.94);
        color: #374151;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .favorite-button.is-favorite {
        color: #dc2626;
      }

      .service-card-body {
        padding: 16px;
      }

      .provider-row {
        display: flex;
        gap: 9px;
        align-items: center;
        margin-bottom: 12px;
      }

      .provider-avatar,
      .seller-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        flex-shrink: 0;
      }

      .provider-row strong,
      .provider-row span {
        display: block;
      }

      .provider-row strong {
        font-size: 12px;
      }

      .provider-row span {
        font-size: 11px;
        color: #6b7280;
        margin-top: 2px;
      }

      .service-title {
        border: 0;
        background: none;
        padding: 0;
        width: 100%;
        text-align: left;
        color: #1f2937;
        font-weight: 600;
        line-height: 1.45;
        min-height: 48px;
      }

      .service-title:hover {
        color: #16a34a;
      }

      .service-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 11px;
        margin-top: 13px;
        color: #6b7280;
        font-size: 11px;
      }

      .service-meta span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .service-card-footer {
        border-top: 1px solid #f0f1f2;
        margin-top: 15px;
        padding-top: 13px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .service-card-footer span {
        color: #6b7280;
        font-size: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .service-card-footer strong {
        color: #111827;
        font-size: 14px;
      }

      .service-card-footer button {
        border: 0;
        background: #ecfdf3;
        color: #15803d;
        border-radius: 6px;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 12px;
        font-weight: 800;
      }

      .ai-banner {
        background: #111827;
        color: #fff;
        padding: 70px 0;
        overflow: hidden;
      }

      .ai-banner-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 40px;
      }

      .ai-banner h2 {
        max-width: 650px;
        font-size: 38px;
        line-height: 1.15;
        letter-spacing: -1.2px;
        margin: 12px 0;
      }

      .ai-banner p {
        color: #d1d5db;
        font-size: 16px;
        margin-bottom: 25px;
      }

      .ai-label,
      .eyebrow {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #16a34a;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .ai-label {
        color: #86efac;
      }

      .button-white {
        border: 0;
        background: #fff;
        color: #111827;
        padding: 12px 16px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 800;
      }

      .ai-visual {
        width: 280px;
        height: 280px;
        border: 1px solid rgba(255,255,255,.13);
        background: radial-gradient(circle, rgba(22,163,74,.4), transparent 65%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        color: #86efac;
        flex-shrink: 0;
      }

      .ai-sparkle {
        position: absolute;
        top: 35px;
        right: 35px;
      }

      .process-title {
        text-align: center;
        margin-bottom: 40px;
      }

      .process-title .eyebrow {
        justify-content: center;
      }

      .process-title h2 {
        font-size: 32px;
        margin: 10px 0 0;
      }

      .process-grid {
        display: grid;
        grid-template-columns: repeat(4,1fr);
        gap: 20px;
      }

      .process-step {
        text-align: center;
        position: relative;
      }

      .process-number {
        color: #16a34a;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .08em;
      }

      .process-icon {
        width: 60px;
        height: 60px;
        border-radius: 15px;
        margin: 12px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ecfdf3;
        color: #16a34a;
      }

      .process-step h3 {
        margin: 8px 0;
      }

      .process-step p {
        color: #6b7280;
        line-height: 1.6;
        font-size: 13px;
        margin: 0;
      }

      .footer {
        background: #111827;
        color: #fff;
        padding: 65px 0 25px;
      }

      .footer-grid {
        display: grid;
        grid-template-columns: 2fr repeat(3,1fr);
        gap: 50px;
        padding-bottom: 50px;
      }

      .footer-brand p {
        color: #9ca3af;
        max-width: 340px;
        line-height: 1.7;
        font-size: 13px;
      }

      .footer-brand-button {
        color: white;
      }

      .footer-secure {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #86efac;
        font-size: 12px;
        margin-top: 20px;
      }

      .footer h3 {
        font-size: 14px;
        margin: 0 0 18px;
      }

      .footer button,
      .footer-text {
        border: 0;
        background: none;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 0;
        font-size: 12px;
        text-align: left;
      }

      .footer button:hover {
        color: #fff;
      }

      .footer-bottom {
        border-top: 1px solid #374151;
        padding-top: 20px;
        display: flex;
        justify-content: space-between;
        color: #6b7280;
        font-size: 11px;
      }

      .catalog-page,
      .service-page,
      .checkout-page,
      .dashboard-page,
      .tracking-page,
      .confirmation-page {
        min-height: 65vh;
        padding: 34px 0 90px;
      }

      .breadcrumbs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
        color: #6b7280;
        font-size: 12px;
        margin-bottom: 28px;
      }

      .breadcrumbs button {
        border: 0;
        background: none;
        display: flex;
        align-items: center;
        gap: 5px;
        color: #4b5563;
        padding: 0;
      }

      .catalog-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 25px;
      }

      .catalog-heading h1,
      .checkout-title h1,
      .dashboard-heading h1 {
        margin: 8px 0;
        font-size: 34px;
        letter-spacing: -1px;
      }

      .catalog-heading p,
      .checkout-title p,
      .dashboard-heading p {
        margin: 0;
        color: #6b7280;
      }

      .filter-mobile-button {
        display: none;
      }

      .catalog-layout {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 28px;
      }

      .filter-sidebar {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 18px;
        height: fit-content;
        position: sticky;
        top: 100px;
      }

      .filter-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 15px;
        border-bottom: 1px solid #e5e7eb;
      }

      .filter-title button {
        border: 0;
        background: none;
        color: #16a34a;
        font-size: 11px;
        font-weight: 700;
      }

      .filter-group {
        padding: 20px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .filter-group h3 {
        margin: 0 0 12px;
        font-size: 13px;
      }

      .filter-category {
        width: 100%;
        border: 0;
        background: transparent;
        color: #4b5563;
        padding: 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-align: left;
      }

      .filter-category.active {
        color: #16a34a;
        font-weight: 800;
      }

      .filter-group select {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 9px;
        outline: 0;
        background: #fff;
      }

      .filter-security {
        display: flex;
        gap: 9px;
        margin-top: 20px;
        padding: 12px;
        background: #f0fdf4;
        color: #166534;
        border-radius: 7px;
      }

      .filter-security strong,
      .filter-security span {
        display: block;
      }

      .filter-security strong {
        font-size: 11px;
      }

      .filter-security span {
        margin-top: 3px;
        color: #4b5563;
        font-size: 10px;
        line-height: 1.4;
      }

      .results-toolbar {
        height: 48px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 18px;
      }

      .results-toolbar strong {
        font-size: 13px;
      }

      .results-toolbar select {
        border: 1px solid #d1d5db;
        background: #fff;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 12px;
      }

      .catalog-grid {
        grid-template-columns: repeat(3,1fr);
      }

      .service-detail-layout {
        display: grid;
        grid-template-columns: minmax(0,1fr) 390px;
        gap: 38px;
        align-items: start;
      }

      .service-detail-cover {
        position: relative;
        overflow: hidden;
        border-radius: 10px;
      }

      .detail-favorite {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        border: 0;
        background: #fff;
        color: #374151;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .detail-favorite.is-favorite {
        color: #dc2626;
      }

      .service-description {
        padding-top: 30px;
      }

      .service-description h1 {
        font-size: 32px;
        line-height: 1.2;
        margin: 9px 0 15px;
        letter-spacing: -.8px;
      }

      .service-description > p {
        color: #4b5563;
        line-height: 1.7;
      }

      .seller-profile {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 20px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .seller-avatar {
        width: 45px;
        height: 45px;
        font-size: 17px;
      }

      .seller-profile strong,
      .seller-profile span {
        display: block;
      }

      .seller-profile span {
        color: #6b7280;
        font-size: 12px;
        margin-top: 3px;
      }

      .detail-features {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 12px;
        padding: 25px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .detail-features div {
        display: flex;
        flex-direction: column;
        gap: 8px;
        color: #16a34a;
      }

      .detail-features strong {
        color: #374151;
        font-size: 11px;
        line-height: 1.4;
      }

      .service-about {
        padding-top: 28px;
      }

      .service-about h2 {
        font-size: 21px;
      }

      .service-about p {
        color: #4b5563;
        line-height: 1.7;
        font-size: 14px;
      }

      .package-panel {
        border: 1px solid #d1d5db;
        border-radius: 10px;
        position: sticky;
        top: 100px;
        background: #fff;
      }

      .package-tabs {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        border-bottom: 1px solid #e5e7eb;
      }

      .package-tabs button {
        border: 0;
        background: #fff;
        padding: 15px 8px;
        color: #6b7280;
        font-weight: 700;
        border-bottom: 2px solid transparent;
      }

      .package-tabs button.active {
        color: #111827;
        border-bottom-color: #16a34a;
      }

      .package-content {
        padding: 22px;
      }

      .package-heading {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .package-heading h2 {
        margin: 0;
        font-size: 21px;
      }

      .package-heading strong {
        font-size: 18px;
      }

      .package-description {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.6;
      }

      .package-info {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-top: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
        padding: 14px 0;
        margin: 16px 0;
        font-size: 11px;
        color: #4b5563;
      }

      .package-info span {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .package-info svg {
        color: #16a34a;
      }

      .package-content h3 {
        font-size: 13px;
      }

      .included-list {
        padding: 0;
        margin: 0 0 20px;
        list-style: none;
      }

      .included-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 7px 0;
        color: #4b5563;
        font-size: 12px;
      }

      .included-list svg {
        color: #16a34a;
        flex-shrink: 0;
      }

      .button-primary,
      .button-secondary {
        border-radius: 7px;
        min-height: 44px;
        padding: 0 17px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-weight: 800;
        border: 1px solid transparent;
      }

      .button-primary {
        background: #16a34a;
        color: #fff;
      }

      .button-primary:hover {
        background: #15803d;
      }

      .button-primary:disabled {
        opacity: .55;
        cursor: not-allowed;
      }

      .button-secondary {
        background: #fff;
        border-color: #d1d5db;
        color: #374151;
      }

      .button-secondary:hover {
        border-color: #16a34a;
        color: #15803d;
      }

      .button-primary.full,
      .button-secondary.full {
        width: 100%;
      }

      .safe-order {
        display: flex;
        gap: 7px;
        margin-top: 15px;
        color: #6b7280;
        font-size: 10px;
        line-height: 1.5;
      }

      .safe-order svg {
        color: #16a34a;
        flex-shrink: 0;
      }

      .checkout-title {
        margin-bottom: 30px;
      }

      .checkout-layout {
        display: grid;
        grid-template-columns: minmax(0,1fr) 360px;
        gap: 28px;
        align-items: start;
      }

      .checkout-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .checkout-card,
      .summary-card {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fff;
      }

      .checkout-card {
        padding: 23px;
      }

      .checkout-card-header {
        display: flex;
        gap: 12px;
        margin-bottom: 23px;
      }

      .step-number {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #ecfdf3;
        color: #15803d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        flex-shrink: 0;
      }

      .checkout-card h2 {
        margin: 0;
        font-size: 17px;
      }

      .checkout-card-header p {
        margin: 4px 0 0;
        color: #6b7280;
        font-size: 12px;
      }

      .checkout-packages {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 10px;
      }

      .checkout-package {
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 7px;
        padding: 14px;
        text-align: left;
      }

      .checkout-package.selected {
        border: 2px solid #16a34a;
        background: #f0fdf4;
      }

      .checkout-package div {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .checkout-package span {
        color: #6b7280;
        font-size: 10px;
      }

      .checkout-package > strong {
        display: block;
        margin-top: 12px;
        font-size: 13px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2,1fr);
        gap: 15px;
      }

      .form-grid label,
      .textarea-label {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: #374151;
        font-size: 12px;
        font-weight: 700;
      }

      .form-grid label:last-child {
        grid-column: 1 / -1;
      }

      .form-grid input,
      .textarea-label textarea {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 7px;
        outline: 0;
        padding: 12px;
        background: #fff;
        color: #111827;
        resize: vertical;
      }

      .form-grid input:focus,
      .textarea-label textarea:focus {
        border-color: #16a34a;
        box-shadow: 0 0 0 3px rgba(22,163,74,.08);
      }

      .checkout-security {
        padding: 13px;
        border-radius: 7px;
        background: #f9fafb;
        color: #6b7280;
        font-size: 11px;
        display: flex;
        gap: 8px;
      }

      .checkout-security svg {
        color: #16a34a;
        flex-shrink: 0;
      }

      .checkout-summary {
        position: sticky;
        top: 100px;
      }

      .summary-cover {
        border-radius: 10px 10px 0 0;
        overflow: hidden;
      }

      .summary-cover > div {
        height: 180px !important;
      }

      .summary-content {
        padding: 20px;
      }

      .summary-category {
        color: #16a34a;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .summary-content h2 {
        font-size: 17px;
        line-height: 1.4;
        margin: 8px 0 16px;
      }

      .summary-package {
        background: #f9fafb;
        padding: 11px;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        font-size: 12px;
      }

      .summary-package span {
        color: #6b7280;
      }

      .summary-row,
      .summary-total {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        padding: 9px 0;
        font-size: 12px;
      }

      .summary-row span {
        color: #6b7280;
      }

      .summary-total {
        border-top: 1px solid #e5e7eb;
        margin-top: 8px;
        padding-top: 15px;
        font-size: 14px;
      }

      .summary-total strong {
        font-size: 19px;
      }

      .summary-note {
        text-align: center;
        color: #9ca3af;
        font-size: 10px;
        line-height: 1.5;
      }

      .confirmation-page {
        background: #f8faf9;
      }

      .success-card {
        margin: 45px auto;
        max-width: 600px;
        border: 1px solid #e5e7eb;
        border-radius: 13px;
        background: #fff;
        padding: 45px;
        text-align: center;
        box-shadow: 0 15px 45px rgba(15,23,42,.06);
      }

      .success-icon {
        width: 75px;
        height: 75px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .success-card h1 {
        font-size: 30px;
        letter-spacing: -.8px;
        margin: 10px 0;
      }

      .success-card > p {
        color: #6b7280;
        line-height: 1.7;
        font-size: 13px;
      }

      .order-number-box {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        padding: 14px;
        margin-top: 10px;
        border-radius: 7px;
        text-align: left;
      }

      .order-number-box span {
        display: block;
        color: #6b7280;
        font-size: 10px;
      }

      .order-number-box strong {
        display: block;
        margin-top: 4px;
        font-size: 14px;
        letter-spacing: .04em;
      }

      .confirmation-price {
        display: flex;
        justify-content: space-between;
        padding: 18px 0;
        margin: 10px 0;
        border-top: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
      }

      .confirmation-price span {
        color: #6b7280;
      }

      .confirmation-price strong {
        font-size: 18px;
      }

      .payment-message {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        border-radius: 7px;
        padding: 11px;
        margin: 12px 0;
        font-size: 12px;
      }

      .confirmation-secondary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
      }

      .confirmation-secondary button {
        min-height: 42px;
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: #374151;
        font-weight: 700;
        font-size: 12px;
      }

      .dashboard-heading {
        display: flex;
        justify-content: space-between;
        align-items: end;
        margin-bottom: 30px;
      }

      .dashboard-stat {
        background: #ecfdf3;
        border-radius: 9px;
        padding: 15px 20px;
        text-align: center;
      }

      .dashboard-stat strong,
      .dashboard-stat span {
        display: block;
      }

      .dashboard-stat strong {
        font-size: 25px;
        color: #15803d;
      }

      .dashboard-stat span {
        color: #4b5563;
        font-size: 10px;
      }

      .orders-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .order-card {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 20px;
        background: #fff;
      }

      .order-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 15px;
        border-bottom: 1px solid #e5e7eb;
      }

      .order-label {
        display: block;
        color: #9ca3af;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .1em;
      }

      .order-card-top strong {
        display: block;
        margin-top: 3px;
        font-size: 13px;
      }

      .status-badge {
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 10px;
        font-weight: 800;
      }

      .status-badge.green {
        background: #dcfce7;
        color: #166534;
      }

      .status-badge.blue {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .status-badge.purple {
        background: #f3e8ff;
        color: #7e22ce;
      }

      .status-badge.orange {
        background: #ffedd5;
        color: #c2410c;
      }

      .order-card-main {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        padding: 18px 0;
      }

      .order-card-main h2 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      .order-details {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        color: #6b7280;
        font-size: 11px;
      }

      .order-details strong {
        color: #374151;
      }

      .order-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .order-actions .button-primary,
      .order-actions .button-secondary {
        min-height: 38px;
        font-size: 11px;
      }

      .order-progress {
        display: flex;
        align-items: flex-start;
        width: 100%;
        margin-top: 8px;
      }

      .progress-step {
        min-width: 58px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        text-align: center;
      }

      .progress-step span {
        width: 27px;
        height: 27px;
        border-radius: 50%;
        border: 1px solid #d1d5db;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        background: #fff;
      }

      .progress-step.completed span {
        border-color: #16a34a;
        background: #16a34a;
        color: #fff;
      }

      .progress-step small {
        color: #9ca3af;
        font-size: 8px;
      }

      .progress-step.completed small {
        color: #15803d;
        font-weight: 700;
      }

      .progress-line {
        height: 1px;
        background: #d1d5db;
        flex: 1;
        margin-top: 13px;
      }

      .progress-line.completed {
        background: #16a34a;
      }

      .dashboard-message {
        margin-bottom: 20px;
      }

      .empty-dashboard,
      .empty-results {
        border: 1px dashed #d1d5db;
        border-radius: 12px;
        padding: 65px 20px;
        text-align: center;
        color: #6b7280;
      }

      .empty-dashboard svg,
      .empty-results svg {
        color: #16a34a;
      }

      .empty-dashboard h2,
      .empty-results h2 {
        color: #111827;
        font-size: 19px;
      }

      .empty-dashboard p,
      .empty-results p {
        font-size: 13px;
      }

      .dashboard-loading {
        min-height: 250px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 15px;
        color: #6b7280;
        font-size: 13px;
      }

      .tracking-header {
        text-align: center;
        margin: 30px 0;
      }

      .tracking-icon {
        width: 75px;
        height: 75px;
        border-radius: 50%;
        background: #ecfdf3;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      }

      .tracking-header h1 {
        font-size: 34px;
        letter-spacing: -1px;
        margin: 10px 0;
      }

      .tracking-header p {
        color: #6b7280;
        font-size: 13px;
      }

      .tracking-search {
        height: 52px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        display: flex;
        align-items: center;
        margin: 25px auto;
        max-width: 650px;
        overflow: hidden;
        background: #fff;
      }

      .tracking-search > svg {
        margin-left: 15px;
        color: #9ca3af;
      }

      .tracking-search input {
        border: 0;
        outline: 0;
        flex: 1;
        min-width: 0;
        padding: 0 12px;
      }

      .tracking-search button {
        height: 100%;
        border: 0;
        background: #111827;
        color: #fff;
        padding: 0 20px;
        font-weight: 800;
      }

      .tracking-result {
        border: 1px solid #e5e7eb;
        border-radius: 11px;
        padding: 25px;
        background: #fff;
      }

      .tracking-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 18px;
      }

      .tracking-result-header span:first-child,
      .tracking-result-header strong {
        display: block;
      }

      .tracking-result-header span:first-child {
        color: #9ca3af;
        font-size: 9px;
      }

      .tracking-result-header strong {
        font-size: 13px;
        margin-top: 4px;
      }

      .tracking-result > h2 {
        font-size: 18px;
        margin: 20px 0;
      }

      .tracking-timeline {
        display: flex;
        flex-direction: column;
      }

      .timeline-step {
        display: flex;
        gap: 12px;
        position: relative;
        padding-bottom: 23px;
        color: #9ca3af;
      }

      .timeline-step:not(:last-child)::after {
        content: "";
        position: absolute;
        left: 14px;
        top: 30px;
        bottom: 0;
        width: 1px;
        background: #e5e7eb;
      }

      .timeline-step.active {
        color: #111827;
      }

      .timeline-step.active:not(:last-child)::after {
        background: #16a34a;
      }

      .timeline-dot {
        width: 29px;
        height: 29px;
        border-radius: 50%;
        border: 1px solid #d1d5db;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        z-index: 2;
        font-size: 10px;
      }

      .timeline-step.active .timeline-dot {
        background: #16a34a;
        color: #fff;
        border-color: #16a34a;
      }

      .timeline-step strong,
      .timeline-step span {
        display: block;
      }

      .timeline-step strong {
        font-size: 12px;
        margin-top: 2px;
      }

      .timeline-step span {
        font-size: 10px;
        color: #9ca3af;
        margin-top: 3px;
      }

      .tracking-payment {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 10px 0 20px;
      }

      .tracking-payment > div {
        padding: 13px;
        border-radius: 7px;
        background: #f9fafb;
        display: flex;
        gap: 9px;
        align-items: center;
      }

      .tracking-payment svg {
        color: #16a34a;
      }

      .tracking-payment span,
      .tracking-payment strong {
        display: block;
      }

      .tracking-payment span {
        color: #6b7280;
        font-size: 9px;
      }

      .tracking-payment strong {
        color: #111827;
        font-size: 11px;
        margin-top: 3px;
      }

      .account-card {
        text-align: center;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 45px;
        margin-top: 30px;
      }

      .account-avatar {
        width: 85px;
        height: 85px;
        border-radius: 50%;
        background: #ecfdf3;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      }

      .account-card h1 {
        margin: 8px 0;
      }

      .account-card p {
        color: #6b7280;
        font-size: 13px;
      }

      .account-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 25px 0;
      }

      .account-info div {
        padding: 15px;
        background: #f9fafb;
        border-radius: 7px;
      }

      .account-info span,
      .account-info strong {
        display: block;
      }

      .account-info span {
        color: #6b7280;
        font-size: 10px;
      }

      .account-info strong {
        margin-top: 4px;
      }

      .account-actions {
        display: flex;
        justify-content: center;
        gap: 10px;
      }

      .toast {
        position: fixed;
        z-index: 500;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        background: #111827;
        color: #fff;
        border-radius: 8px;
        padding: 12px 17px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 15px 40px rgba(0,0,0,.2);
        font-size: 12px;
        font-weight: 700;
      }

      .toast svg {
        color: #86efac;
      }

      .loading-screen {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #6b7280;
        font-size: 13px;
      }

      .loading-logo {
        width: 58px;
        height: 58px;
        background: #16a34a;
        color: #fff;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 25px;
        font-weight: 900;
      }

      .spinner {
        width: 25px;
        height: 25px;
        border: 3px solid #dcfce7;
        border-top-color: #16a34a;
        border-radius: 50%;
        animation: spin .8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1100px) {
        .desktop-nav {
          display: none;
        }

        .header-inner {
          gap: 14px;
        }

        .desktop-actions {
          gap: 2px;
        }

        .nav-action {
          font-size: 11px;
        }

        .category-grid {
          grid-template-columns: repeat(4,1fr);
        }

        .service-grid,
        .catalog-grid {
          grid-template-columns: repeat(2,1fr);
        }

        .catalog-layout {
          grid-template-columns: 220px 1fr;
        }
      }

      @media (max-width: 800px) {
        .container,
        .container.narrow {
          width: min(100% - 28px, 1240px);
        }

        .header-inner {
          min-height: 65px;
        }

        .brand {
          font-size: 17px;
        }

        .brand-mark {
          width: 34px;
          height: 34px;
        }

        .desktop-actions,
        .desktop-nav {
          display: none;
        }

        .mobile-menu-button {
          display: block;
          margin-left: auto;
        }

        .header-search {
          display: none;
        }

        .mobile-nav {
          display: flex;
          position: fixed;
          z-index: 99;
          top: 65px;
          left: 0;
          right: 0;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          padding: 15px;
          flex-direction: column;
          gap: 7px;
          box-shadow: 0 15px 30px rgba(0,0,0,.08);
        }

        .mobile-nav > button {
          border: 0;
          background: #fff;
          padding: 13px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 700;
        }

        .mobile-nav > button:hover {
          background: #f0fdf4;
          color: #15803d;
        }

        .mobile-search {
          height: 45px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          display: flex;
          align-items: center;
          padding: 0 10px;
        }

        .mobile-search input {
          border: 0;
          outline: 0;
          flex: 1;
          min-width: 0;
          padding: 0 8px;
        }

        .hero {
          padding: 65px 0;
        }

        .hero h1 {
          letter-spacing: -1.5px;
        }

        .hero-search {
          height: auto;
          flex-wrap: wrap;
          padding: 7px;
        }

        .hero-search > svg {
          margin-left: 10px;
        }

        .hero-search input {
          min-height: 48px;
        }

        .hero-search button {
          width: 100%;
          height: 45px;
          border-radius: 6px;
        }

        .trust-grid {
          grid-template-columns: repeat(2,1fr);
          padding: 20px 0;
        }

        .category-grid {
          grid-template-columns: repeat(2,1fr);
        }

        .service-grid,
        .catalog-grid {
          grid-template-columns: 1fr;
        }

        .ai-banner-inner {
          flex-direction: column;
          align-items: flex-start;
        }

        .ai-banner h2 {
          font-size: 30px;
        }

        .ai-visual {
          width: 190px;
          height: 190px;
          align-self: center;
        }

        .process-grid {
          grid-template-columns: repeat(2,1fr);
        }

        .footer-grid {
          grid-template-columns: 1fr 1fr;
          gap: 35px;
        }

        .footer-brand {
          grid-column: 1 / -1;
        }

        .footer-bottom {
          flex-direction: column;
          gap: 7px;
        }

        .catalog-layout {
          display: block;
        }

        .filter-mobile-button {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .filter-sidebar {
          display: none;
          position: fixed;
          z-index: 200;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(330px,90vw);
          background: #fff;
          overflow-y: auto;
          border-radius: 0;
          box-shadow: 15px 0 40px rgba(0,0,0,.12);
        }

        .filter-sidebar.filter-visible {
          display: block;
        }

        .catalog-heading h1 {
          font-size: 26px;
        }

        .service-detail-layout,
        .checkout-layout {
          grid-template-columns: 1fr;
        }

        .package-panel,
        .checkout-summary {
          position: static;
        }

        .detail-features {
          grid-template-columns: 1fr;
        }

        .checkout-packages {
          grid-template-columns: 1fr;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-grid label:last-child {
          grid-column: auto;
        }

        .order-card-main {
          flex-direction: column;
        }

        .order-actions {
          width: 100%;
        }

        .order-actions > * {
          flex: 1;
        }

        .progress-step small {
          font-size: 7px;
        }

        .dashboard-heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 15px;
        }
      }

      @media (max-width: 560px) {
        .section {
          padding: 50px 0;
        }

        .hero h1 {
          font-size: 39px;
        }

        .hero-description {
          font-size: 15px;
        }

        .trust-grid {
          grid-template-columns: 1fr;
        }

        .category-grid {
          grid-template-columns: 1fr 1fr;
        }

        .section-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .process-grid {
          grid-template-columns: 1fr;
        }

        .footer-grid {
          grid-template-columns: 1fr;
        }

        .footer-brand {
          grid-column: auto;
        }

        .service-description h1 {
          font-size: 27px;
        }

        .service-detail-cover > div {
          height: 300px !important;
        }

        .package-tabs button {
          font-size: 11px;
        }

        .success-card,
        .account-card {
          padding: 28px 18px;
        }

        .confirmation-secondary {
          grid-template-columns: 1fr;
        }

        .tracking-payment {
          grid-template-columns: 1fr;
        }

        .tracking-header h1 {
          font-size: 28px;
        }

        .tracking-search {
          height: auto;
          flex-wrap: wrap;
          padding: 6px;
        }

        .tracking-search input {
          min-height: 42px;
        }

        .tracking-search button {
          width: 100%;
          height: 43px;
          border-radius: 6px;
        }

        .order-progress {
          overflow-x: auto;
          padding-bottom: 5px;
        }

        .progress-step {
          min-width: 68px;
        }
      }
    `}</style>
  );
}

export default App;
