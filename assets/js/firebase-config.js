// Firebase configuration - replace with your project credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

window.firebaseApp = firebase.app();
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebaseRef = (path) => db.ref(path);
