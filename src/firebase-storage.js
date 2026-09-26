import { initializeApp } from "firebase/app";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhbQQdgJDbL5vwjggC6HKsmQ_Y8jKTXlo",
  authDomain: "prestations-5f025.firebaseapp.com",
  projectId: "prestations-5f025",
  storageBucket: "prestations-5f025.firebasestorage.app",
  messagingSenderId: "190548715867",
  appId: "1:190548715867:web:8596b810d31fe59535927e",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export {
  app,
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
};
