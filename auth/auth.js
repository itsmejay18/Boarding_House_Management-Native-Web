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
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const user = credential.user;

    await db.ref(`users/${user.uid}`).set({
      displayName: name,
      email,
      phone,
      role: "user",
      status: "active",
      createdAt: Date.now()
    });

    try {
      await user.sendEmailVerification();
    } catch (error) {
      console.warn("Email verification optional:", error.message);
    }

    showToast("Registration complete. Redirecting...");
    setTimeout(() => {
      window.location.href = "../user/dashboard.html";
    }, 900);
  } catch (error) {
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
    const credential = await auth.signInWithEmailAndPassword(email, password);
    const user = credential.user;

    const profileSnap = await db.ref(`users/${user.uid}`).once("value");
    const profile = profileSnap.val();

    if (!profile || profile.status === "inactive") {
      await auth.signOut();
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
