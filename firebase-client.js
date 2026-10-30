import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js";
import {
  getAuth, RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword,
  signInWithCustomToken, createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider,
  sendEmailVerification, verifyBeforeUpdateEmail, sendPasswordResetEmail,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
  signOut, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, addDoc, serverTimestamp, getDocs, getDoc, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
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
if (!localEmulators) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider("6LdBasMtAAAAAJE5V6ZDZefojEfJx9vfDFowfIjU"),
    isTokenAutoRefreshEnabled: true
  });
}
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDB = getFirestore(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp, "asia-south1");
export const firebaseAuthPersistenceReady = setPersistence(firebaseAuth, browserLocalPersistence);
export const useLocalFirebaseEmulators = localEmulators;

if (localEmulators) {
  connectAuthEmulator(firebaseAuth, `http://${hostname}:9400`, { disableWarnings: true });
  connectFirestoreEmulator(firebaseDB, hostname, 9401);
  connectFunctionsEmulator(firebaseFunctions, hostname, 9402);
}

export const FirebaseAuthAPI = {
  RecaptchaVerifier, signInWithPhoneNumber, signInWithCustomToken, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider,
  sendEmailVerification, verifyBeforeUpdateEmail, sendPasswordResetEmail,
  onAuthStateChanged, signOut
};
export const FirebaseFirestoreAPI = { collection, doc, setDoc, addDoc, serverTimestamp, getDocs, getDoc, query, where };
export const FirebaseFunctionsAPI = { httpsCallable };

Object.assign(window, {
  firebaseApp, firebaseAuth, firebaseDB, firebaseFunctions, firebaseAuthPersistenceReady,
  useLocalFirebaseEmulators, FirebaseAuthAPI, FirebaseFirestoreAPI, FirebaseFunctionsAPI
});
