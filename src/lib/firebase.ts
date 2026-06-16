import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

// Inlined configuration from firebase-applet-config.json to prevent compile/load time errors
const firebaseConfig = {
  projectId: "striking-keep-6n56p",
  appId: "1:109520988324:web:d79d9a4170f1f3ddff1e31",
  apiKey: "AIzaSyB6l2SR8si7B5JMMkzqxH94ZsBPYHt2hdc",
  authDomain: "striking-keep-6n56p.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-601b9595-4c66-49d7-b458-392d78d24dda",
  storageBucket: "striking-keep-6n56p.firebasestorage.app",
  messagingSenderId: "109520988324",
};

let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro ao inicializar o Firebase. Ativando engine fallback local.", error);
}

export { 
  app, 
  auth, 
  db, 
  getAuth,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
};
export type { FirebaseUser };
