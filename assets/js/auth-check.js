import { auth, db, dbRef, get, onAuthStateChanged, signOut } from "./firebase-config.js";
import { roleHome } from "./main.js";

function bindLogout() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await signOut(auth);
      window.location.href = "../index.html";
    });
  });
}

function setUserBadge(profile, user) {
  const badge = document.querySelector("[data-user-badge]");
  if (!badge) {
    return;
  }
  const name = profile?.displayName || user?.email || "Guest";
  badge.textContent = name;
}

function requireAuth(options = {}) {
  const roles = options.roles || [];
  const loginPath = options.loginPath || "../auth/login.html";
  const redirectTarget = encodeURIComponent(window.location.pathname + window.location.search);

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = `${loginPath}?redirect=${redirectTarget}`;
        return;
      }

      const snapshot = await get(dbRef(db, `users/${user.uid}`));
      const profile = snapshot.val();

      if (!profile || profile.status === "inactive") {
        await signOut(auth);
        window.location.href = loginPath;
        return;
      }

      const role = profile.role || "user";
      if (roles.length && !roles.includes(role)) {
        window.location.href = roleHome(role);
        return;
      }

      setUserBadge(profile, user);
      resolve({ user, profile });
    });
  });
}

export { requireAuth };

window.requireAuth = requireAuth;

window.addEventListener("DOMContentLoaded", () => {
  bindLogout();
});
