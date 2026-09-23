import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ClipboardList, BarChart3, Tag, Settings, Plus, RefreshCw, MessageCircle, Check, X,
  ChevronLeft, ChevronRight, Lock, Store, Smartphone, Landmark, Banknote, Play,
  PackageCheck, Wallet, AlertTriangle, Trash2, Pencil, Copy, ArrowLeft, CheckCircle2,
  Phone, LogOut, Palette, Wrench, Eye, EyeOff,
} from "lucide-react";

/* ==========================================================================
   STOCKAGE
   - Données publiques (catalogue, réglages, code) : partagées (shared = true)
   - Commandes des clients : déposées dans une "boîte de réception" partagée,
     puis rapatriées dans l'espace privé de la gérante (shared = false)
   ========================================================================== */



let lastStoreError = "";
let useMem = false;          // secours mémoire uniquement si le stockage persistant échoue
const memStore = new Map();
const mkey = (k, s) => (s ? "s:" : "p:") + k;
const store = {
  isMem: () => useMem,
  async get(key, shared = false) {
    if (useMem) { const v = memStore.get(mkey(key, shared)); return v === undefined ? null : JSON.parse(v); }
    try {
      const r = await window.storage.get(key, shared);
      return r && r.value != null ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, val, shared = false) {
    if (useMem) { memStore.set(mkey(key, shared), JSON.stringify(val)); return true; }
    try { await window.storage.set(key, JSON.stringify(val), shared); return true; }
    catch (e) {
      console.error("Storage error", e);
      lastStoreError = (e && e.message) || String(e);
      if (!shared && /not available/i.test(lastStoreError)) {
        useMem = true;
        memStore.set(mkey(key, shared), JSON.stringify(val));
        return true;
      }
      return false;
    }
  },
  async del(key, shared = false) {
    if (useMem) { memStore.delete(mkey(key, shared)); return true; }
    try { await window.storage.delete(key, shared); return true; } catch { return false; }
  },
  async list(prefix, shared = false) {
    if (useMem) return [...memStore.keys()].filter((x) => x.startsWith(mkey(prefix, shared))).map((x) => x.slice(2));
    try { const r = await window.storage.list(prefix, shared); return (r && r.keys) || []; }
    catch { return []; }
  },
};

/* Données publiques (catalogue, réglages, code) : stockage partagé si possible,
   sinon repli sur le stockage personnel ("mode local", pour configurer et tester seule). */
const LOCAL = (k) => `local-${k}`;
store.pubGet = async (key) => {
  const v = await store.get(key, true);
  return v !== null ? v : store.get(LOCAL(key), false);
};
store.pubSet = async (key, val) => (await store.set(key, val, true)) || store.set(LOCAL(key), val, false);
store.probe = () => store.set("probe", Date.now(), true);
store.putInbox = async (order, allowLocal) => {
  if (await store.set(`inbox:${order.id}`, order, true)) return true;
  return allowLocal ? store.set(`local-inbox:${order.id}`, order, false) : false;
};

/* ==========================================================================
   CONSTANTES
   ========================================================================== */

const CATEGORIES = ["Créatif", "Technique"];

const OPERATORS = [
  { id: "orange", label: "Orange Money" },
  { id: "mtn", label: "MTN MoMo" },
  { id: "moov", label: "Moov Money" },
  { id: "wave", label: "Wave" },
  { id: "airtel", label: "Airtel Money" },
];

const METHODS = [
  { id: "momo", label: "Mobile Money", icon: Smartphone },
  { id: "virement", label: "Virement bancaire", icon: Landmark },
  { id: "especes", label: "Espèces", icon: Banknote },
];

const DEFAULT_CONFIG = {
  businessName: "Mon atelier",
  whatsapp: "",
  countryCode: "",
  momo: { orange: "", mtn: "", moov: "", wave: "", airtel: "" },
  bankInfo: "",
  cashInfo: "Paiement en main propre, à la remise du travail.",
};

const DEFAULT_CATALOG = [
  { id: "s1", name: "Logo et identité visuelle", category: "Créatif", price: 45000, active: true,
    desc: "Logo, couleurs et polices, livrés en fichiers prêts à l'emploi." },
  { id: "s2", name: "Affiche ou flyer", category: "Créatif", price: 15000, active: true,
    desc: "Un visuel prêt à imprimer ou à publier sur les réseaux sociaux." },
  { id: "s3", name: "Montage vidéo", category: "Créatif", price: 25000, active: true,
    desc: "Montage, sous-titres et musique pour une vidéo jusqu'à 3 minutes." },
  { id: "s4", name: "Site vitrine", category: "Technique", price: 150000, active: true,
    desc: "Un site de 3 à 5 pages, lisible sur téléphone." },
  { id: "s5", name: "Dépannage informatique", category: "Technique", price: 10000, active: true,
    desc: "Diagnostic et réparation, à distance ou sur place." },
];

const STATUS = {
  attente: { label: "En attente" },
  cours: { label: "En cours" },
  livree: { label: "Livrée" },
  payee: { label: "Payée" },
};

/* ==========================================================================
   OUTILS
   ========================================================================== */

const nf = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
const fcfa = (n) => `${nf(n)}\u00A0FCFA`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeRef = () => Array.from({ length: 5 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join("");
const nowISO = () => new Date().toISOString();
const clean = (s, n) => String(s == null ? "" : s).trim().slice(0, n);
const digits = (s) => String(s || "").replace(/\D/g, "");

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDay = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtWeek = (start) => {
  const label = `${fmtDay(start)} – ${fmtDay(addDays(start, 6))}`;
  return start.getFullYear() === new Date().getFullYear() ? label : `${label} ${start.getFullYear()}`;
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const daysAgo = (iso) => Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
const agoLabel = (n) => (n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} jours`);

const paidTotal = (o) => (o.payments || []).reduce((s, p) => s + p.amount, 0);
const remaining = (o) => Math.max(0, o.amount - paidTotal(o));
const isLate = (o) => o.status === "livree" && remaining(o) > 0;
const displayStatus = (o) => (o.status === "livree" && remaining(o) <= 0 ? "payee" : o.status);

const methodLabel = (method, operator) =>
  method === "momo" ? operator || "Mobile Money"
    : method === "virement" ? "Virement bancaire"
      : method === "especes" ? "Espèces" : "Non précisé";

function waLink(phone, countryCode, text) {
  let d = String(phone || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else d = digits(countryCode) + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* repli ci-dessous */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch { return false; }
}

async function hashPin(pin, salt) {
  const text = `${salt}:${pin}`;
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* repli ci-dessous */ }
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return "f" + h;
}

/* Une commande déposée par un client est une donnée non fiable : on la nettoie,
   et le prix est relu dans le catalogue de la gérante. */
function normalizeOrder(raw, catalog) {
  const svc = catalog.find((s) => s.id === raw.serviceId);
  const rawAmount = Number(raw.amount);
  const amount = svc ? Number(svc.price) : (isFinite(rawAmount) && rawAmount > 0 ? Math.round(rawAmount) : 0);
  const method = ["momo", "virement", "especes"].includes(raw.payMethod) ? raw.payMethod : "";
  return {
    id: clean(raw.id, 40),
    ref: clean(raw.ref, 12) || makeRef(),
    createdAt: isNaN(Date.parse(raw.createdAt)) ? nowISO() : new Date(raw.createdAt).toISOString(),
    clientName: clean(raw.clientName, 80) || "Client",
    clientPhone: clean(raw.clientPhone, 30).replace(/[^\d+\s().-]/g, ""),
    serviceId: svc ? svc.id : clean(raw.serviceId, 40),
    serviceName: svc ? svc.name : clean(raw.serviceName, 80) || "Prestation",
    category: svc ? svc.category : (CATEGORIES.includes(raw.category) ? raw.category : "Créatif"),
    amount,
    brief: clean(raw.brief, 1000),
    payMethod: method,
    payOperator: method === "momo" ? clean(raw.payOperator, 30) : "",
    status: "attente",
    payments: [],
    source: "client",
  };
}

function buildStats(orders) {
  const weeks = {};
  const wk = (date) => {
    const s = startOfWeek(date);
    const k = ymd(s);
    if (!weeks[k]) {
      weeks[k] = { key: k, start: s, orders: 0, sold: 0, collected: 0, byService: {},
        byMethod: { momo: 0, virement: 0, especes: 0 }, byOp: {}, byCat: { "Créatif": 0, "Technique": 0 } };
    }
    return weeks[k];
  };
  const svc = (w, o) => {
    if (!w.byService[o.serviceName]) {
      w.byService[o.serviceName] = { name: o.serviceName, category: o.category, count: 0, sold: 0, collected: 0 };
    }
    return w.byService[o.serviceName];
  };
  let totalCollected = 0, outstanding = 0, late = 0, lateCount = 0;
  for (const o of orders) {
    const w = wk(new Date(o.createdAt));
    w.orders += 1; w.sold += o.amount;
    const s = svc(w, o); s.count += 1; s.sold += o.amount;
    for (const p of o.payments || []) {
      const pw = wk(new Date(p.date));
      pw.collected += p.amount; totalCollected += p.amount;
      svc(pw, o).collected += p.amount;
      if (pw.byMethod[p.method] !== undefined) pw.byMethod[p.method] += p.amount;
      if (p.method === "momo") { const k = p.operator || "Mobile Money"; pw.byOp[k] = (pw.byOp[k] || 0) + p.amount; }
      if (pw.byCat[o.category] !== undefined) pw.byCat[o.category] += p.amount;
    }
    const r = remaining(o);
    outstanding += r;
    if (isLate(o)) { late += r; lateCount += 1; }
  }
  return { weeks, totalCollected, outstanding, late, lateCount };
}

/* ==========================================================================
   STYLES
   ========================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');

.app{--ink:#1D2452;--blue:#2F4FD8;--mango:#F6A81C;--palm:#1B8A5A;--hib:#D3365A;--paper:#F2F4FB;--line:#DDE1F1;--muted:#586088;
  font-family:'Bricolage Grotesque',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink);background:#E4E8F5;min-height:100vh;font-size:16px;line-height:1.4;-webkit-text-size-adjust:100%}
.app *{box-sizing:border-box}
.app h1,.app h2,.app h3,.app p{margin:0}
:where(.app) button{font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;cursor:pointer}
:where(.app) input,:where(.app) textarea,:where(.app) select{font-family:inherit;font-size:16px;color:var(--ink)}
.app :focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.app .num{font-variant-numeric:tabular-nums}
.frame{max-width:520px;margin:0 auto;min-height:100vh;background:var(--paper);position:relative}
.frame.has-nav{padding-bottom:96px}
.center{display:grid;place-items:center;min-height:60vh;color:var(--muted);font-weight:600}

/* boutons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:0 18px;min-height:48px;
  font-weight:700;font-size:16px;background:var(--blue);color:#fff;text-decoration:none;text-align:center;line-height:1.2}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn.block{width:100%}
.btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--ink)}
.btn.soft{background:#E3E8FC;color:#1B2FA0}
.btn.wa{background:#128C4A;color:#fff}
.btn.ink{background:var(--ink);color:#fff}
.btn.small{min-height:40px;padding:0 14px;font-size:15px;border-radius:10px}
.btn.armed,.app .btn.ghost.armed{background:var(--hib);border-color:var(--hib);color:#fff}
.icon-btn{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:12px;border:0;background:transparent}
.icon-btn:hover{background:rgba(29,36,82,.07)}
.link-btn{background:none;border:0;padding:8px 4px;font-weight:600;color:var(--muted);display:inline-flex;align-items:center;gap:6px;font-size:14.5px}

/* puces */
.chips{display:flex;gap:8px;overflow-x:auto;padding:2px 16px 6px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex:none;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:6px 14px;font-weight:600;font-size:15px;min-height:40px}
.chip[aria-pressed="true"],.chip[aria-checked="true"]{background:var(--ink);border-color:var(--ink);color:#fff}
.chip .count{margin-left:6px;opacity:.7;font-weight:500}
.ops{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 6px 12px;border-left:3px solid var(--blue);margin-left:6px}
.ops .chip[aria-checked="true"]{background:var(--blue);border-color:var(--blue)}

/* pastilles de statut */
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;font-weight:700;font-size:13.5px;line-height:1.2}
.st-attente{background:#FFEFC9;color:#7A4E00}
.st-cours{background:#E1E7FF;color:#1B2FA0}
.st-livree{background:#FFDCE4;color:#9B1B3A}
.st-payee{background:#D8F1E4;color:#14603F}
.pill.acompte{background:#FFEFC9;color:#7A4E00}

/* boîtes de dialogue */
.sheet-backdrop{position:fixed;inset:0;background:rgba(29,36,82,.5);display:flex;align-items:flex-end;justify-content:center;z-index:50}
.sheet{width:100%;max-width:520px;max-height:92vh;background:#fff;border-radius:24px 24px 0 0;display:flex;flex-direction:column;animation:sheetUp .22s ease-out}
@keyframes sheetUp{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .9s linear infinite}
@media (prefers-reduced-motion:reduce){.sheet,.toast,.spin{animation:none}}
.sheet-head{display:flex;align-items:center;justify-content:space-between;padding:12px 10px 4px 20px;gap:8px}
.sheet-head h2{font-size:21px;font-weight:800;letter-spacing:-.01em}
.sheet-body{overflow-y:auto;padding:10px 20px 22px;display:grid;gap:18px;align-content:start}
.sheet-foot{padding:12px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);display:grid;gap:8px}

/* formulaires */
.field{display:grid;gap:6px;min-width:0}
.field-label{font-weight:700;font-size:15px}
.field-hint{font-size:13.5px;color:var(--muted);line-height:1.35}
.field-error{font-size:14px;color:var(--hib);font-weight:700}
.input{width:100%;min-height:48px;border:1.5px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff}
.input:focus{border-color:var(--blue);outline:none;box-shadow:0 0 0 3px rgba(47,79,216,.2)}
.input.err{border-color:var(--hib)}
textarea.input{min-height:92px;resize:vertical}
.money{position:relative}
.money .input{padding-right:64px;font-weight:700;font-variant-numeric:tabular-nums}
.money span{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-weight:700;font-size:14px;pointer-events:none}
.group-label{font-weight:700;font-size:15px;margin-bottom:8px;display:block}
.methods{display:grid;gap:8px}
.method{display:flex;align-items:center;gap:12px;text-align:left;border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:10px 14px;min-height:58px;width:100%}
.method[aria-checked="true"]{border-color:var(--blue);background:#EEF1FF;box-shadow:inset 0 0 0 1px var(--blue)}
.method .m-ico{width:38px;height:38px;border-radius:10px;background:#E3E8FC;color:var(--blue);display:grid;place-items:center;flex:none}
.method b{display:block;font-size:16px}
.method small{display:block;color:var(--muted);font-size:13.5px;line-height:1.3}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#E7EAF6;border-radius:12px;padding:4px}
.seg button{border:0;background:transparent;border-radius:9px;min-height:42px;font-weight:700;font-size:14.5px}
.seg button[aria-checked="true"]{background:#fff;box-shadow:0 1px 3px rgba(29,36,82,.2)}
.switch{width:52px;height:32px;border-radius:16px;border:0;background:#C9CFE6;position:relative;flex:none;transition:background .15s}
.switch::after{content:"";position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .15s}
.switch[aria-checked="true"]{background:var(--palm)}
.switch[aria-checked="true"]::after{transform:translateX(20px)}

/* toast */
.toast{position:fixed;left:0;right:0;margin:0 auto;top:calc(12px + env(safe-area-inset-top));width:fit-content;max-width:calc(100% - 32px);background:var(--ink);color:#fff;
  padding:12px 16px;border-radius:12px;font-weight:600;z-index:70;animation:fadeIn .18s ease-out;display:flex;gap:8px;align-items:center}

/* vitrine */
.shop{background:#fff;min-height:100vh;position:relative}
.preview-bar{position:sticky;top:0;z-index:15;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 8px 8px 16px;font-weight:600;font-size:14.5px}
.preview-bar .btn{background:var(--mango);color:var(--ink);min-height:38px}
.wax{display:block;width:100%}
.shop-head{margin-top:-24px;position:relative;background:#fff;border-radius:24px 24px 0 0;padding:24px 20px 12px}
.shop-head h1{font-size:36px;line-height:1.02;font-weight:800;letter-spacing:-.025em;overflow-wrap:anywhere}
.shop-head p{margin-top:10px;color:var(--muted);font-size:17px;max-width:32ch;line-height:1.35}
.shop .chips{padding-top:10px;padding-bottom:12px}
.svc{display:grid;grid-template-columns:48px 1fr auto;gap:14px;align-items:center;text-align:left;width:100%;background:#fff;border:0;border-bottom:1px solid var(--line);padding:16px 20px}
.svc:first-child{border-top:1px solid var(--line)}
.svc:active{background:#F6F7FD}
.svc-mark{width:48px;height:48px;border-radius:14px;display:grid;place-items:center}
.mk-creatif{background:var(--mango);color:var(--ink)}
.mk-tech{background:var(--blue);color:#fff}
.svc-name{font-weight:700;font-size:17px;display:block;line-height:1.2}
.svc-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted);font-size:14.5px;margin-top:3px;line-height:1.35}
.svc-cta{display:block;margin-top:6px;color:var(--blue);font-weight:700;font-size:14.5px}
.price{background:var(--mango);color:var(--ink);border-radius:10px;padding:6px 10px;font-weight:800;font-size:17px;white-space:nowrap;text-align:right;line-height:1.1;font-variant-numeric:tabular-nums}
.price small{display:block;font-size:11.5px;font-weight:700;margin-top:2px}
.shop-foot{padding:24px 20px 40px;display:grid;gap:14px;justify-items:start}
.shop-foot .link-btn{color:var(--muted)}
.recap{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--paper);border-radius:14px;padding:12px 14px}
.recap b{font-size:17px;line-height:1.2}
.ticket{border:2px solid var(--ink);border-radius:16px;background:#fff}
.ticket .t-top{padding:16px;display:grid;gap:4px}
.ticket .t-ref{font-size:34px;font-weight:800;letter-spacing:.12em;line-height:1.1;font-variant-numeric:tabular-nums}
.ticket .t-bottom{padding:16px;border-top:2px dashed var(--ink);display:grid;gap:10px}
.ticket .t-number{font-size:26px;font-weight:800;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.ticket pre{margin:0;font-family:inherit;white-space:pre-wrap;font-size:16px;line-height:1.4}
.muted{color:var(--muted)}
.ok-head{display:flex;align-items:center;gap:10px;color:var(--palm);font-weight:800;font-size:17px}

/* gestion */
.a-head{display:flex;align-items:center;justify-content:space-between;padding:14px 8px 4px 16px}
.a-head h1{font-size:26px;font-weight:800;letter-spacing:-.015em}
.a-head .right{display:flex;align-items:center}
.alert{margin:10px 16px 0;background:var(--hib);color:#fff;border-radius:16px;padding:14px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}
.alert b{display:block;font-size:16px;line-height:1.25}
.alert span.sub{font-size:14px;opacity:.95}
.alert .btn{background:#fff;color:var(--hib);min-height:40px;padding:0 14px}
.notice{margin:10px 16px 0;background:#FFEFC9;color:#5E3B00;border-radius:14px;padding:12px 14px;display:grid;gap:2px;font-size:14.5px;line-height:1.35}
.notice b{font-size:15.5px}
.toolbar{display:flex;justify-content:flex-end;padding:12px 16px 4px}
.list{display:grid;gap:10px;padding:8px 16px 0}
.order{position:relative;background:#fff;border-radius:16px;overflow:hidden}
.order::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--stripe,#C9CFE6)}
.order.s-attente{--stripe:var(--mango)}
.order.s-cours{--stripe:var(--blue)}
.order.s-livree{--stripe:var(--hib)}
.order.s-payee{--stripe:var(--palm)}
.order-hit{display:grid;gap:6px;width:100%;text-align:left;background:none;border:0;padding:14px 14px 10px 20px}
.order-hit .l1{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.order-hit .name{font-size:17px;font-weight:800;overflow-wrap:anywhere}
.order-hit .amt{font-weight:800;white-space:nowrap}
.order-hit .svcname{color:var(--muted);font-size:15px}
.order-hit .l3{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.order-hit .ref{margin-left:auto;color:var(--muted);font-size:13.5px;font-weight:600;letter-spacing:.06em}
.order-hit .late{color:#9B1B3A;font-weight:700;font-size:14.5px}
.o-actions{display:flex;gap:8px;justify-content:flex-end;padding:0 12px 12px 20px}
.empty{margin:24px 16px;background:#fff;border-radius:16px;padding:22px;display:grid;gap:12px;justify-items:start}
.empty b{font-size:18px}
.nav{position:fixed;bottom:0;left:0;right:0;margin:0 auto;width:100%;max-width:520px;background:#fff;border-top:1px solid var(--line);
  display:grid;grid-template-columns:repeat(4,1fr);padding-bottom:env(safe-area-inset-bottom);z-index:20}
.nav button{position:relative;display:grid;justify-items:center;gap:3px;border:0;background:none;padding:12px 4px 9px;font-size:13px;font-weight:600;color:var(--muted)}
.nav button[aria-current="page"]{color:var(--ink);font-weight:800}
.nav button[aria-current="page"]::before{content:"";position:absolute;top:0;left:24%;right:24%;height:4px;border-radius:0 0 4px 4px;background:var(--mango)}
.nav .badge{position:absolute;top:6px;left:calc(50% + 6px);min-width:19px;height:19px;border-radius:10px;background:var(--hib);color:#fff;font-size:11.5px;font-weight:800;display:grid;place-items:center;padding:0 5px}

/* ventes */
.week-nav{display:flex;align-items:center;justify-content:space-between;padding:6px 8px}
.week-nav b{font-size:17px;text-align:center}
.week-nav .sub{display:block;text-align:center;font-size:13px;color:var(--muted);font-weight:600}
.collect{background:var(--ink);color:#fff;border-radius:20px;padding:20px;margin:6px 16px 0;display:grid;gap:4px}
.collect .lbl{font-size:15px;opacity:.85;font-weight:600}
.collect .big{font-size:42px;font-weight:800;letter-spacing:-.02em;line-height:1.05;color:var(--mango);font-variant-numeric:tabular-nums}
.collect .two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.2)}
.collect .two b{display:block;font-size:19px}
.collect .two span{font-size:13.5px;opacity:.85}
.section{padding:22px 16px 0;display:grid;gap:10px}
.section h2{font-size:18px;font-weight:800}
.panel{background:#fff;border-radius:16px;padding:14px 16px;display
