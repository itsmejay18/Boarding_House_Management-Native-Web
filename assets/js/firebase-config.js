import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDatabase,
  ref as dbRef,
  set,
  update,
  remove,
  get,
  push,
  onValue,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCR9POiczG3jVWuapd27V_BhpI8u9zU4oY",
  authDomain: "bh-database-4b16e.firebaseapp.com",
  databaseURL: "https://bh-database-4b16e-default-rtdb.firebaseio.com",
  projectId: "bh-database-4b16e",
  storageBucket: "bh-database-4b16e.firebasestorage.app",
  messagingSenderId: "587954237010",
  appId: "1:587954237010:web:7f10162fcf0d348304398b",
  measurementId: "G-3B4WWB9ZW1"
};

const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  // Analytics is optional and can fail on unsupported environments.
}

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch(() => {
  // Persistence is optional; ignore failures (e.g. private browsing).
});

export { app, analytics, auth, db, storage };
export {
  dbRef,
  set,
  update,
  remove,
  get,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  storageRef,
  uploadBytes,
  getDownloadURL,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
};
