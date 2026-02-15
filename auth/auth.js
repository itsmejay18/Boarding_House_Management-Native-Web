import {
  auth,
  db,
  dbRef,
  set,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "../assets/js/firebase-config.js";
import { setLoading, showToast, getQueryParam, routeByRole } from "../assets/js/main.js";

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

function showFormError(container, message) {
  if (!container) {
    return;
  }
  container.textContent = message;
  container.classList.add("notice");
}

function clearFormError(container) {
  if (!container) {
    return;
  }
  container.textContent = "";
  container.classList.remove("notice");
}

function enableDemoMode() {
  try {
    localStorage.setItem("demoMode", "1");
  } catch (error) {
    // ignore
  }
  const url = new URL(window.location.href);
  url.searchParams.set("demo", "1");
  window.location.href = url.toString();
}

function maybeEnableDemo(error) {
  const code = error?.code || "";
  if (
    code === "auth/configuration-not-found" ||
    code === "auth/invalid-api-key" ||
    code === "auth/project-not-found"
  ) {
    enableDemoMode();
    return true;
  }
  return false;
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const status = form.querySelector("[data-status]");
  clearFormError(status);

  const name = form.elements["fullName"].value.trim();
  const email = form.elements["email"].value.trim();
  const phone = form.elements["phone"].value.trim();
  const password = form.elements["password"].value;
  const confirmPassword = form.elements["confirmPassword"].value;

  if (password !== confirmPassword) {
    showFormError(status, "Passwords do not match.");
    return;
  }

  setLoading(form, true);
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await set(dbRef(db, `users/${user.uid}`), {
      displayName: name,
      email,
      phone,
      role: "user",
      status: "active",
      createdAt: Date.now()
    });

    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.warn("Email verification optional:", error.message);
    }

    showToast("Registration complete. Redirecting...");
    setTimeout(() => {
      window.location.href = "../user/dashboard.html";
    }, 900);
  } catch (error) {
    if (maybeEnableDemo(error)) {
      return;
    }
    showFormError(status, error.message);
  } finally {
    setLoading(form, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const status = form.querySelector("[data-status]");
  clearFormError(status);

  const email = form.elements["email"].value.trim();
  const password = form.elements["password"].value;

  setLoading(form, true);
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    const profileSnap = await get(dbRef(db, `users/${user.uid}`));
    const profile = profileSnap.val();

    if (!profile || profile.status === "inactive") {
      await signOut(auth);
      showFormError(status, "Account inactive. Contact support.");
      return;
    }

    const redirect = getQueryParam("redirect");
    if (redirect) {
      window.location.href = redirect;
      return;
    }

    await routeByRole(user);
  } catch (error) {
    if (maybeEnableDemo(error)) {
      return;
    }
    showFormError(status, error.message);
  } finally {
    setLoading(form, false);
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

function initFirebaseDebugPanel() {
  if (getQueryParam("debug") !== "1") {
    return;
  }

  const options = auth?.app?.options || {};
  const panel = document.createElement("div");
  panel.className = "form-card";
  panel.style.marginTop = "16px";
  panel.innerHTML = `
    <h3>Firebase Debug</h3>
    <p class="form-hint">Loaded from firebase-config.js:</p>
    <p class="form-hint"><strong>projectId</strong>: ${options.projectId || "-"}</p>
    <p class="form-hint"><strong>authDomain</strong>: ${options.authDomain || "-"}</p>
    <p class="form-hint"><strong>apiKey</strong>: ${options.apiKey ? options.apiKey.slice(0, 6) + "..." : "-"}</p>
    <p class="form-hint"><strong>appId</strong>: ${options.appId || "-"}</p>
    <p class="form-hint"><strong>host</strong>: ${window.location.host}</p>
    <p class="form-hint">If these do not match your Firebase project, update assets/js/firebase-config.js.</p>
  `;

  const container = document.querySelector(".container");
  if (container) {
    container.appendChild(panel);
  }
}

initFirebaseDebugPanel();
