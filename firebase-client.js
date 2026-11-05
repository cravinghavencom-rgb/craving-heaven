import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  initializeAuth, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword,
  signInWithCustomToken, createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider,
  sendEmailVerification, verifyBeforeUpdateEmail, sendPasswordResetEmail,
  onAuthStateChanged, browserLocalPersistence,
  signOut, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js";

const hostname = location.hostname;
const loopback = ["localhost", "127.0.0.1"].includes(hostname);
const privateLan = /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
const localEmulators = loopback || (new URLSearchParams(location.search).get("emulator") === "1" && privateLan);
const config = {
  apiKey: "AIzaSyDVYYv3TMRKWktXA33jOGjniz43hDfRVe4",
  authDomain: "craving-heaven-e2e94.firebaseapp.com",
  projectId: localEmulators ? "demo-craving-heaven-local" : "craving-heaven-e2e94",
  storageBucket: "craving-heaven-e2e94.firebasestorage.app",
  messagingSenderId: "20081214048",
  appId: "1:20081214048:web:cae6c7b0874111ab653905",
  measurementId: "G-GD2EPFLYPZ"
};

export const firebaseApp = initializeApp(config);
export const firebaseAuth = initializeAuth(firebaseApp, { persistence: browserLocalPersistence });
export const firebaseFunctions = getFunctions(firebaseApp, "asia-south1");
export const firebaseAuthPersistenceReady = firebaseAuth.authStateReady();
export const useLocalFirebaseEmulators = localEmulators;

if (localEmulators) {
  connectAuthEmulator(firebaseAuth, `http://${hostname}:9400`, { disableWarnings: true });
  connectFunctionsEmulator(firebaseFunctions, hostname, 9402);
}

let firestoreModulePromise = null;
let appCheckPromise = null;
export function ensureFirebaseAppCheck() {
  if (localEmulators) return Promise.resolve(null);
  if (!appCheckPromise) {
    appCheckPromise = import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js")
      .then(module => module.initializeAppCheck(firebaseApp, {
        provider: new module.ReCaptchaEnterpriseProvider("6LdBasMtAAAAAJE5V6ZDZefojEfJx9vfDFowfIjU"),
        isTokenAutoRefreshEnabled: true
      }))
      .catch(error => {
        appCheckPromise = null;
        throw error;
      });
  }
  return appCheckPromise;
}

export function loadFirebaseFirestore() {
  if (!firestoreModulePromise) {
    firestoreModulePromise = import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js")
      .then(module => {
        const firebaseDB = module.getFirestore(firebaseApp);
        if (localEmulators) module.connectFirestoreEmulator(firebaseDB, hostname, 9401);
        const FirebaseFirestoreAPI = {
          doc: module.doc,
          setDoc: module.setDoc,
          serverTimestamp: module.serverTimestamp
        };
        Object.assign(window, { firebaseDB, FirebaseFirestoreAPI });
        return { firebaseDB, FirebaseFirestoreAPI };
      })
      .catch(error => {
        firestoreModulePromise = null;
        throw error;
      });
  }
  return firestoreModulePromise;
}

export const FirebaseAuthAPI = {
  RecaptchaVerifier, signInWithPhoneNumber, signInWithCustomToken, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider,
  sendEmailVerification, verifyBeforeUpdateEmail, sendPasswordResetEmail,
  onAuthStateChanged, signOut
};
export const FirebaseFunctionsAPI = { httpsCallable };

Object.assign(window, {
  firebaseApp, firebaseAuth, firebaseFunctions, firebaseAuthPersistenceReady,
  useLocalFirebaseEmulators, ensureFirebaseAppCheck, loadFirebaseFirestore, FirebaseAuthAPI, FirebaseFunctionsAPI
});
