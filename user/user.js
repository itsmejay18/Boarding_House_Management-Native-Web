const userPage = document.body.dataset.page;
let currentUser = null;

function renderBrowseCard(id, data) {
  const imageUrl = (data.images && data.images[0]) || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80";
  const statusClass = data.status || "available";
  const amenities = (Array.isArray(data.specs?.amenities) ? data.specs.amenities : []).map((item) => item.replace(/_/g, " ")).join(", ");
  const name = data.name || "Boarding House";
  return `
    <article class="card" data-id="${id}">
      <img src="${imageUrl}" alt="${name}">
      <div class="card-body">
        <h3 class="card-title">${name}</h3>
        <div class="card-meta">
          <span>${data.address || "-"}</span>
          <span>${formatCurrency(data.price)}</span>
        </div>
        <div class="card-meta">
          <span class="status ${statusClass}">${statusClass}</span>
          <span class="badge">${amenities || "Amenities: -"}</span>
        </div>
        <div class="card-actions">
          <button class="btn" data-apply ${statusClass !== "available" ? "disabled" : ""}>Apply</button>
          <button class="btn btn-ghost" data-favorite>Favorite</button>
        </div>
      </div>
    </article>
  `;
}

function initBrowse() {
  const grid = document.getElementById("browse-grid");
  const filterForm = document.getElementById("filter-form");
  const applyModal = document.getElementById("apply-modal");
  const applyForm = document.getElementById("apply-form");
  const applyName = document.getElementById("apply-bh-name");
  const applyIdInput = document.getElementById("apply-bh-id");
  const closeApply = document.getElementById("close-apply");
  const statusEl = applyForm?.querySelector("[data-status]");
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");
  const contactInfo = document.getElementById("contact-info");

  let allListings = [];
  let filteredListings = [];
  let currentPage = 1;
  const pageSize = 6;

  auth.onAuthStateChanged((user) => {
    currentUser = user;
  });

  const cachedListings = readLocal("bhListings");
  if (cachedListings) {
    allListings = cachedListings;
    applyFilters();
  }

  db.ref("landingContent").once("value").then((snapshot) => {
    const content = snapshot.val();
    if (contactInfo && content) {
      contactInfo.textContent = `Need help? Contact support at ${content.contactEmail || "hello@nativebh.com"} or ${content.contactPhone || "+63 900 000 0000"}.`;
    }
  });

  function applyFilters() {
    const search = filterForm.search.value.trim().toLowerCase();
    const location = filterForm.location.value.trim().toLowerCase();
    const minPrice = Number(filterForm.minPrice.value) || 0;
    const maxPrice = Number(filterForm.maxPrice.value) || Number.MAX_SAFE_INTEGER;
    const sortBy = filterForm.sortBy.value;
    const amenities = Array.from(filterForm.querySelectorAll("input[name='amenities']:checked")).map((input) => input.value);

    filteredListings = allListings.filter(({ data }) => {
      const nameValue = (data.name || "").toLowerCase();
      const addressValue = (data.address || "").toLowerCase();
      const statusValue = data.status || "available";
      const priceValue = Number(data.price) || 0;
      const amenitiesList = Array.isArray(data.specs?.amenities) ? data.specs.amenities : [];
      const nameMatch = nameValue.includes(search) || addressValue.includes(search);
      const locationMatch = !location || addressValue.includes(location);
      const priceMatch = priceValue >= minPrice && priceValue <= maxPrice;
      const amenitiesMatch = amenities.every((item) => amenitiesList.includes(item));
      return nameMatch && locationMatch && priceMatch && amenitiesMatch && statusValue !== "occupied";
    });

    if (sortBy === "price_low") {
      filteredListings.sort((a, b) => (Number(a.data.price) || 0) - (Number(b.data.price) || 0));
    } else if (sortBy === "price_high") {
      filteredListings.sort((a, b) => (Number(b.data.price) || 0) - (Number(a.data.price) || 0));
    } else {
      filteredListings.sort((a, b) => (Number(b.data.createdAt) || 0) - (Number(a.data.createdAt) || 0));
    }
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (currentPage - 1) * pageSize;
    const pageItems = filteredListings.slice(start, start + pageSize);
    if (!pageItems.length) {
      grid.innerHTML = "<p class=\"notice\">No listings found.</p>";
      return;
    }
    grid.innerHTML = pageItems.map(({ id, data }) => renderBrowseCard(id, data)).join("");
  }

  db.ref("boardingHouses").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    allListings = Object.entries(data).map(([id, value]) => ({ id, data: value }));
    storeLocal("bhListings", allListings);
    applyFilters();

    const quickId = getQueryParam("bhId");
    if (quickId) {
      const card = grid.querySelector(`[data-id='${quickId}']`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  filterForm.addEventListener("input", applyFilters);

  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderPage();
    }
  });

  nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredListings.length / pageSize);
    if (currentPage < totalPages) {
      currentPage += 1;
      renderPage();
    }
  });

  grid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) {
      return;
    }
    const bhId = card.dataset.id;
    const listing = allListings.find((item) => item.id === bhId);

    if (event.target.matches("[data-apply]")) {
      if (!currentUser) {
        window.location.href = `../auth/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      applyName.textContent = listing?.data?.name || "Boarding House";
      applyIdInput.value = bhId;
      applyModal.classList.add("open");
      applyModal.setAttribute("aria-hidden", "false");
    }

    if (event.target.matches("[data-favorite]")) {
      if (!currentUser) {
        window.location.href = `../auth/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      db.ref(`favorites/${currentUser.uid}/${bhId}`).set(true);
      showToast("Saved to favorites.");
    }
  });

  closeApply.addEventListener("click", () => {
    applyModal.classList.remove("open");
    applyModal.setAttribute("aria-hidden", "true");
  });

  applyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showToast("Please login to apply.");
      return;
    }
    setLoading(applyForm, true);
    statusEl.textContent = "";
    try {
      const profileSnap = await db.ref(`users/${currentUser.uid}`).once("value");
      const profile = profileSnap.val() || {};
      const appId = db.ref("applications").push().key;
      const payload = {
        userId: currentUser.uid,
        userName: profile.displayName || "",
        userEmail: profile.email || currentUser.email,
        bhId: applyIdInput.value,
        moveInDate: applyForm.moveIn.value,
        duration: Number(applyForm.duration.value) || 0,
        requirements: applyForm.requirements.value.trim(),
        status: "pending",
        createdAt: Date.now()
      };
      await db.ref(`applications/${appId}`).set(payload);
      applyModal.classList.remove("open");
      applyForm.reset();
      showToast("Application submitted.");
    } catch (error) {
      statusEl.textContent = error.message;
    } finally {
      setLoading(applyForm, false);
    }
  });
}

async function renderUserApplications(container, apps) {
  if (!container) {
    return;
  }
  const entries = Object.entries(apps || {});
  if (!entries.length) {
    container.innerHTML = "<p class=\"notice\">No applications yet.</p>";
    return;
  }

  const cards = await Promise.all(entries.map(async ([id, app]) => {
    const bhSnap = await db.ref(`boardingHouses/${app.bhId}`).once("value");
    const bh = bhSnap.val() || {};
    return `
      <div class="form-card" data-app-id="${id}">
        <h3>${bh.name || "Boarding House"}</h3>
        <p class="form-hint">Status: <span class="pill">${app.status}</span></p>
        <p class="form-hint">Move-in: ${app.moveInDate || "-"} | Duration: ${app.duration || "-"} months</p>
        <p class="form-hint">Reviewer Note: ${app.reviewNote || "None"}</p>
        <div>
          <label>Upload Documents</label>
          <input type="file" data-doc>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost" data-upload>Upload</button>
        </div>
      </div>
    `;
  }));

  container.innerHTML = cards.join("");

  container.querySelectorAll("[data-upload]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-app-id]");
      const appId = card.dataset.appId;
      const fileInput = card.querySelector("[data-doc]");
      const file = fileInput.files[0];
      if (!file) {
        showToast("Select a document first.");
        return;
      }
      const fileRef = storage.ref(`applications/${appId}/${Date.now()}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      const docRef = db.ref(`applications/${appId}/documents`).push();
      await docRef.set({
        name: file.name,
        url,
        uploadedAt: Date.now()
      });
      showToast("Document uploaded.");
      fileInput.value = "";
    });
  });
}

async function renderFavorites(container, favorites) {
  if (!container) {
    return;
  }
  const ids = Object.keys(favorites || {});
  if (!ids.length) {
    container.innerHTML = "<p class=\"notice\">No favorites yet.</p>";
    return;
  }
  const snapshot = await db.ref("boardingHouses").once("value");
  const data = snapshot.val() || {};
  const cards = ids.map((id) => {
    const bh = data[id];
    if (!bh) {
      return "";
    }
    return `
      <article class="card" data-id="${id}">
        <img src="${(bh.images && bh.images[0]) || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80"}" alt="${bh.name}">
        <div class="card-body">
          <h3 class="card-title">${bh.name}</h3>
          <div class="card-meta">
            <span>${bh.address}</span>
            <span>${formatCurrency(bh.price)}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-ghost" data-remove>Remove</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  container.innerHTML = cards;

  container.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-id]");
      const bhId = card.dataset.id;
      await db.ref(`favorites/${currentUser.uid}/${bhId}`).remove();
      showToast("Removed from favorites.");
    });
  });
}

function initUserDashboard() {
  requireAuth({ roles: ["user"] }).then(({ user }) => {
    currentUser = user;
    const appCount = document.getElementById("user-app-count");
    const favCount = document.getElementById("user-fav-count");

    db.ref("applications").orderByChild("userId").equalTo(user.uid).on("value", (snapshot) => {
      const apps = snapshot.val() || {};
      appCount.textContent = Object.keys(apps).length;
      renderUserApplications(document.getElementById("user-applications"), apps);
    });

    db.ref(`favorites/${user.uid}`).on("value", (snapshot) => {
      const favorites = snapshot.val() || {};
      favCount.textContent = Object.keys(favorites).length;
      renderFavorites(document.getElementById("user-favorites"), favorites);
    });
  });
}

if (userPage === "user-browse") {
  initBrowse();
}

if (userPage === "user-dashboard") {
  initUserDashboard();
}
