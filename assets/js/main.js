const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  const numberValue = Number(value || 0);
  if (Number.isNaN(numberValue)) {
    return "PHP 0";
  }
  return currencyFormatter.format(numberValue);
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function setLoading(element, isLoading) {
  if (!element) {
    return;
  }
  element.classList.toggle("loading", Boolean(isLoading));
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function getAmenitiesDisplay(amenities = []) {
  if (!Array.isArray(amenities)) {
    return "";
  }
  return amenities.map((item) => item.replace(/_/g, " ")).join(", ");
}

function renderBoardingHouseCard(id, data, options = {}) {
  const imageUrl = (data.images && data.images[0]) || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80";
  const statusClass = data.status || "available";
  const quickViewLink = options.quickViewLink || `user/browse.html?bhId=${id}`;

  return `
    <article class="card" data-id="${id}">
      <img src="${imageUrl}" alt="${data.name} photo" loading="lazy">
      <div class="card-body">
        <div>
          <h3 class="card-title">${data.name || "Unnamed Boarding House"}</h3>
          <div class="card-meta">
            <span>${data.address || "Address not set"}</span>
            <span>${formatCurrency(data.price)}</span>
          </div>
        </div>
        <div class="card-meta">
          <span class="badge">Rooms: ${data.specs?.rooms ?? "-"}</span>
          <span class="badge">Baths: ${data.specs?.bathrooms ?? "-"}</span>
          <span class="badge">${data.specs?.floorArea ?? "-"} sqm</span>
        </div>
        <div class="card-meta">
          <span class="status ${statusClass}">${statusClass}</span>
          <span class="badge">${getAmenitiesDisplay(data.specs?.amenities || []) || "Amenities: -"}</span>
        </div>
        <div class="card-actions">
          <a class="btn btn-ghost" href="${quickViewLink}">Quick View</a>
        </div>
      </div>
    </article>
  `;
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
}

function storeLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("Local storage unavailable", error);
  }
}

function readLocal(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function loadLandingContent() {
  const heroTitle = document.getElementById("hero-title");
  const heroSubtitle = document.getElementById("hero-subtitle");
  const heroImage = document.getElementById("hero-image");
  const contactEmail = document.getElementById("contact-email");
  const contactPhone = document.getElementById("contact-phone");
  const footerText = document.getElementById("footer-text");

  const applyContent = (content) => {
    if (!content) {
      return;
    }
    if (heroTitle) heroTitle.textContent = content.heroTitle || heroTitle.textContent;
    if (heroSubtitle) heroSubtitle.textContent = content.heroSubtitle || heroSubtitle.textContent;
    if (heroImage && content.heroImage) heroImage.src = content.heroImage;
    if (contactEmail) contactEmail.textContent = content.contactEmail || contactEmail.textContent;
    if (contactPhone) contactPhone.textContent = content.contactPhone || contactPhone.textContent;
    if (footerText) footerText.textContent = content.footerText || footerText.textContent;
  };

  const cached = readLocal("landingContent");
  applyContent(cached);

  if (!window.db) {
    return;
  }

  db.ref("landingContent").on("value", (snapshot) => {
    const content = snapshot.val();
    applyContent(content);
    storeLocal("landingContent", content);
  }, () => {
    showToast("Offline mode: showing cached landing content.");
  });
}

function loadFeaturedBoardingHouses() {
  const grid = document.getElementById("featured-grid");
  if (!grid) {
    return;
  }

  const renderList = (data) => {
    if (!data) {
      grid.innerHTML = "<p class=\"notice\">No featured boarding houses yet.</p>";
      return;
    }
    const entries = Object.entries(data).filter(([, value]) => value.featured);
    if (!entries.length) {
      grid.innerHTML = "<p class=\"notice\">No featured boarding houses yet.</p>";
      return;
    }
    grid.innerHTML = entries.map(([id, value]) => renderBoardingHouseCard(id, value)).join("");
  };

  const cached = readLocal("featuredBoardingHouses");
  if (cached) {
    renderList(cached);
  }

  db.ref("boardingHouses").orderByChild("featured").equalTo(true).on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      storeLocal("featuredBoardingHouses", data);
    }
    renderList(data);
  }, () => {
    showToast("Offline mode: showing cached featured listings.");
  });
}

function basePath() {
  const path = window.location.pathname;
  const knownFolders = ["/auth/", "/admin/", "/staff/", "/user/"];
  for (const folder of knownFolders) {
    if (path.includes(folder)) {
      return path.split(folder)[0] || "";
    }
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) {
    return "";
  }
  return path.substring(0, lastSlash);
}

function roleHome(role) {
  const base = basePath();
  if (role === "admin") {
    return `${base}/admin/dashboard.html`;
  }
  if (role === "staff") {
    return `${base}/staff/dashboard.html`;
  }
  return `${base}/user/dashboard.html`;
}

async function routeByRole(user) {
  const profileSnapshot = await db.ref(`users/${user.uid}`).once("value");
  const profile = profileSnapshot.val() || {};
  const role = profile.role || "user";
  window.location.href = roleHome(role);
}

window.showToast = showToast;
window.setLoading = setLoading;
window.formatCurrency = formatCurrency;
window.renderBoardingHouseCard = renderBoardingHouseCard;
window.roleHome = roleHome;
window.routeByRole = routeByRole;
window.getQueryParam = getQueryParam;

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  if (document.body.dataset.page === "landing") {
    loadLandingContent();
    loadFeaturedBoardingHouses();
  }
});
