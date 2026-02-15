import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  sendEmailVerification as fbSendEmailVerification,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getDatabase,
  ref as fbDbRef,
  set as fbSet,
  update as fbUpdate,
  remove as fbRemove,
  get as fbGet,
  push as fbPush,
  onValue as fbOnValue,
  query as fbQuery,
  orderByChild as fbOrderByChild,
  equalTo as fbEqualTo
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import {
  getStorage,
  ref as fbStorageRef,
  uploadBytes as fbUploadBytes,
  getDownloadURL as fbGetDownloadURL
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCR9POiczG3jVWuapd27V_BhpI8u9zU4oY",
  authDomain: "bh-database-4b16e.firebaseapp.com",
  projectId: "bh-database-4b16e",
  storageBucket: "bh-database-4b16e.firebasestorage.app",
  messagingSenderId: "587954237010",
  appId: "1:587954237010:web:5bc5cb86df53ba2604398b",
  measurementId: "G-H2HPFDBWNC",
  databaseURL: "https://bh-database-4b16e-default-rtdb.firebaseio.com"
};

const DEMO_FLAG_KEY = "demoMode";
const DEMO_DB_KEY = "demoDb";
const DEMO_AUTH_KEY = "demoAuth";
const DEMO_STORAGE_KEY = "demoStorage";
const DEMO_SESSION_KEY = "demoSession";

function safeGetLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSetLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // ignore
  }
}

function safeRemoveLocal(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // ignore
  }
}

function safeJsonGet(key, fallback) {
  const raw = safeGetLocal(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function safeJsonSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // ignore
  }
}

function resolveDemoMode() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  const demoParam = params.get("demo");
  if (demoParam === "0") {
    safeRemoveLocal(DEMO_FLAG_KEY);
    return false;
  }
  if (demoParam === "1") {
    safeSetLocal(DEMO_FLAG_KEY, "1");
    return true;
  }
  return safeGetLocal(DEMO_FLAG_KEY) === "1";
}

const isDemoMode = resolveDemoMode();

let app = null;
let analytics = null;
let auth = null;
let db = null;
let storage = null;
let getSecondaryAuth = null;

let dbRef = null;
let set = null;
let update = null;
let remove = null;
let get = null;
let push = null;
let onValue = null;
let query = null;
let orderByChild = null;
let equalTo = null;
let storageRef = null;
let uploadBytes = null;
let getDownloadURL = null;
let createUserWithEmailAndPassword = null;
let signInWithEmailAndPassword = null;
let sendEmailVerification = null;
let onAuthStateChanged = null;
let signOut = null;

if (!isDemoMode) {
  app = initializeApp(firebaseConfig);

  try {
    analytics = getAnalytics(app);
  } catch (error) {
    // Analytics is optional.
  }

  auth = getAuth(app);
  db = getDatabase(app);
  storage = getStorage(app);

  setPersistence(auth, browserLocalPersistence).catch(() => {
    // ignore
  });

  dbRef = fbDbRef;
  set = fbSet;
  update = fbUpdate;
  remove = fbRemove;
  get = fbGet;
  push = fbPush;
  onValue = fbOnValue;
  query = fbQuery;
  orderByChild = fbOrderByChild;
  equalTo = fbEqualTo;
  storageRef = fbStorageRef;
  uploadBytes = fbUploadBytes;
  getDownloadURL = fbGetDownloadURL;
  createUserWithEmailAndPassword = fbCreateUserWithEmailAndPassword;
  signInWithEmailAndPassword = fbSignInWithEmailAndPassword;
  sendEmailVerification = fbSendEmailVerification;
  onAuthStateChanged = fbOnAuthStateChanged;
  signOut = fbSignOut;

  getSecondaryAuth = () => {
    let secondaryApp = getApps().find((existing) => existing.name === "secondary");
    if (!secondaryApp) {
      secondaryApp = initializeApp(firebaseConfig, "secondary");
    }
    return getAuth(secondaryApp);
  };
} else {
  const demoAuthListeners = new Map();
  const demoDbListeners = new Set();
  const primaryAuth = createLocalAuth("primary");
  const secondaryAuth = createLocalAuth("secondary");

  app = { name: "demo", options: firebaseConfig };
  auth = primaryAuth;
  db = { __demo: true };
  storage = { __demo: true };

  seedDemoUsers();

  dbRef = (database, path) => ({
    path: normalizePath(path),
    key: lastSegment(path)
  });

  set = async (ref, value) => {
    const root = loadDemoDb();
    const nextRoot = setAtPath(root, ref.path, value);
    saveDemoDb(nextRoot);
    emitDb(ref.path);
  };

  update = async (ref, value) => {
    const root = loadDemoDb();
    const nextRoot = updateAtPath(root, ref.path, value);
    saveDemoDb(nextRoot);
    emitDb(ref.path);
  };

  remove = async (ref) => {
    const root = loadDemoDb();
    const nextRoot = removeAtPath(root, ref.path);
    saveDemoDb(nextRoot);
    emitDb(ref.path);
  };

  get = async (target) => {
    const root = loadDemoDb();
    const value = resolveTargetValue(target, root);
    return makeSnapshot(value);
  };

  push = (ref) => {
    const key = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      path: ref.path ? `${ref.path}/${key}` : key,
      key
    };
  };

  onValue = (target, callback, errorCallback) => {
    const listener = { target, callback, errorCallback };
    demoDbListeners.add(listener);
    try {
      const root = loadDemoDb();
      const value = resolveTargetValue(target, root);
      callback(makeSnapshot(value));
    } catch (error) {
      if (errorCallback) {
        errorCallback(error);
      }
    }
    return () => demoDbListeners.delete(listener);
  };

  orderByChild = (key) => ({ type: "orderByChild", key });
  equalTo = (value) => ({ type: "equalTo", value });
  query = (ref, ...constraints) => ({ __isQuery: true, ref, constraints });

  storageRef = (store, path) => ({
    path: normalizePath(path)
  });

  uploadBytes = async (ref, file) => {
    const dataUrl = await readFileAsDataUrl(file);
    const storageData = loadDemoStorage();
    storageData[ref.path] = {
      dataUrl,
      name: file.name,
      type: file.type,
      updatedAt: Date.now()
    };
    saveDemoStorage(storageData);
    return { ref };
  };

  getDownloadURL = async (ref) => {
    const storageData = loadDemoStorage();
    return storageData[ref.path]?.dataUrl || "";
  };

  createUserWithEmailAndPassword = async (authInstance, email, password) => {
    const store = loadDemoAuth();
    const normalizedEmail = normalizeEmail(email);

    if (!password || password.length < 6) {
      throw makeAuthError("auth/weak-password", "Password should be at least 6 characters.");
    }

    if (store.byEmail[normalizedEmail]) {
      throw makeAuthError("auth/email-already-in-use", "Email already in use.");
    }

    const uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    store.byEmail[normalizedEmail] = uid;
    store.byUid[uid] = { email: normalizedEmail, password };
    saveDemoAuth(store);

    const user = { uid, email: normalizedEmail };
    setCurrentUser(authInstance, user);
    return { user };
  };

  signInWithEmailAndPassword = async (authInstance, email, password) => {
    const store = loadDemoAuth();
    const normalizedEmail = normalizeEmail(email);
    const uid = store.byEmail[normalizedEmail];

    if (!uid) {
      throw makeAuthError("auth/user-not-found", "No user found.");
    }

    const record = store.byUid[uid];
    if (!record || record.password !== password) {
      throw makeAuthError("auth/wrong-password", "Invalid password.");
    }

    const user = { uid, email: normalizedEmail };
    setCurrentUser(authInstance, user);
    return { user };
  };

  sendEmailVerification = async () => {};

  onAuthStateChanged = (authInstance, callback) => {
    if (!demoAuthListeners.has(authInstance)) {
      demoAuthListeners.set(authInstance, new Set());
    }
    const listeners = demoAuthListeners.get(authInstance);
    listeners.add(callback);
    hydrateSession(authInstance);
    callback(authInstance.currentUser || null);
    return () => listeners.delete(callback);
  };

  signOut = async (authInstance) => {
    setCurrentUser(authInstance, null);
  };

  getSecondaryAuth = () => secondaryAuth;

  function createLocalAuth(name) {
    return {
      __demo: true,
      name,
      app: { name: "demo", options: firebaseConfig },
      currentUser: null
    };
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function makeAuthError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function setCurrentUser(authInstance, user) {
    authInstance.currentUser = user;
    if (authInstance.name === "primary") {
      if (user?.uid) {
        safeJsonSet(DEMO_SESSION_KEY, { uid: user.uid });
      } else {
        safeRemoveLocal(DEMO_SESSION_KEY);
      }
    }
    notifyAuth(authInstance);
  }

  function hydrateSession(authInstance) {
    if (authInstance.name !== "primary" || authInstance.currentUser) {
      return;
    }
    const session = safeJsonGet(DEMO_SESSION_KEY, null);
    if (!session?.uid) {
      return;
    }
    const store = loadDemoAuth();
    const record = store.byUid[session.uid];
    if (record) {
      authInstance.currentUser = { uid: session.uid, email: record.email };
    }
  }

  function notifyAuth(authInstance) {
    const listeners = demoAuthListeners.get(authInstance);
    if (!listeners) {
      return;
    }
    listeners.forEach((callback) => {
      callback(authInstance.currentUser || null);
    });
  }

  function loadDemoDb() {
    return safeJsonGet(DEMO_DB_KEY, {});
  }

  function saveDemoDb(root) {
    safeJsonSet(DEMO_DB_KEY, root);
  }

  function loadDemoAuth() {
    return safeJsonGet(DEMO_AUTH_KEY, { byEmail: {}, byUid: {} });
  }

  function saveDemoAuth(store) {
    safeJsonSet(DEMO_AUTH_KEY, store);
  }

  function loadDemoStorage() {
    return safeJsonGet(DEMO_STORAGE_KEY, {});
  }

  function saveDemoStorage(store) {
    safeJsonSet(DEMO_STORAGE_KEY, store);
  }

  function seedDemoUsers() {
    const store = loadDemoAuth();
    if (Object.keys(store.byUid).length) {
      return;
    }

    const seeds = [
      {
        displayName: "Native Admin",
        email: "admin@nativebh.test",
        phone: "",
        role: "admin",
        password: "password"
      },
      {
        displayName: "Native Staff",
        email: "staff@nativebh.test",
        phone: "",
        role: "staff",
        password: "password"
      },
      {
        displayName: "Native Tenant",
        email: "tenant@nativebh.test",
        phone: "",
        role: "user",
        password: "password"
      }
    ];

    const root = loadDemoDb();

    seeds.forEach((seed) => {
      const normalizedEmail = normalizeEmail(seed.email);
      const uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      store.byEmail[normalizedEmail] = uid;
      store.byUid[uid] = { email: normalizedEmail, password: seed.password };
      setAtPath(root, `users/${uid}`, {
        displayName: seed.displayName,
        email: normalizedEmail,
        phone: seed.phone,
        role: seed.role,
        status: "active",
        createdAt: Date.now()
      });
    });

    saveDemoAuth(store);
    saveDemoDb(root);
  }

  function normalizePath(path) {
    return String(path || "").replace(/^\/+|\/+$/g, "");
  }

  function lastSegment(path) {
    const normalized = normalizePath(path);
    if (!normalized) {
      return null;
    }
    const parts = normalized.split("/");
    return parts[parts.length - 1] || null;
  }

  function pathParts(path) {
    const normalized = normalizePath(path);
    if (!normalized) {
      return [];
    }
    return normalized.split("/").filter(Boolean);
  }

  function getAtPath(root, path) {
    const parts = pathParts(path);
    let node = root;
    for (const part of parts) {
      if (!node || typeof node !== "object") {
        return null;
      }
      node = node[part];
    }
    return node === undefined ? null : node;
  }

  function setAtPath(root, path, value) {
    if (!path) {
      return value || {};
    }
    const parts = pathParts(path);
    const nextRoot = root || {};
    let node = nextRoot;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!node[part] || typeof node[part] !== "object") {
        node[part] = {};
      }
      node = node[part];
    }
    node[parts[parts.length - 1]] = value;
    return nextRoot;
  }

  function updateAtPath(root, path, value) {
    const current = getAtPath(root, path);
    const nextValue = {
      ...(current && typeof current === "object" ? current : {}),
      ...value
    };
    return setAtPath(root, path, nextValue);
  }

  function removeAtPath(root, path) {
    if (!path) {
      return {};
    }
    const parts = pathParts(path);
    const nextRoot = root || {};
    let node = nextRoot;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!node[part] || typeof node[part] !== "object") {
        return nextRoot;
      }
      node = node[part];
    }
    delete node[parts[parts.length - 1]];
    return nextRoot;
  }

  function makeSnapshot(value) {
    return {
      val: () => value,
      exists: () => value !== null && value !== undefined
    };
  }

  function resolveTargetValue(target, root) {
    if (target?.__isQuery) {
      return applyQuery(target, root);
    }
    return getAtPath(root, target?.path || "");
  }

  function applyQuery(target, root) {
    const baseData = getAtPath(root, target.ref.path) || {};
    if (!baseData || typeof baseData !== "object") {
      return null;
    }
    let entries = Object.entries(baseData);
    let orderKey = null;
    let equalValue = null;

    target.constraints.forEach((constraint) => {
      if (constraint.type === "orderByChild") {
        orderKey = constraint.key;
      }
      if (constraint.type === "equalTo") {
        equalValue = constraint.value;
      }
    });

    if (orderKey !== null && equalValue !== null) {
      entries = entries.filter(([, value]) => value && value[orderKey] === equalValue);
    }

    return entries.length ? Object.fromEntries(entries) : null;
  }

  function isPathRelated(listenerPath, changedPath) {
    const a = normalizePath(listenerPath);
    const b = normalizePath(changedPath);
    if (!a || !b) {
      return true;
    }
    return a.startsWith(b) || b.startsWith(a);
  }

  function emitDb(changedPath) {
    const root = loadDemoDb();
    demoDbListeners.forEach((listener) => {
      const targetPath = listener.target.__isQuery ? listener.target.ref.path : listener.target.path;
      if (isPathRelated(targetPath, changedPath)) {
        const value = resolveTargetValue(listener.target, root);
        listener.callback(makeSnapshot(value));
      }
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export {
  isDemoMode,
  app,
  analytics,
  auth,
  db,
  storage,
  getSecondaryAuth,
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
