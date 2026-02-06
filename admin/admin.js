const page = document.body.dataset.page;

function createNotification(userId, message, type = "status") {
  const ref = db.ref("notifications").push();
  return ref.set({
    userId,
    message,
    type,
    createdAt: Date.now(),
    read: false
  });
}

async function renderApplications(container, applications, currentUserId) {
  if (!container) {
    return;
  }
  const entries = Object.entries(applications || {}).filter(([, app]) => app.status === "pending");
  if (!entries.length) {
    container.innerHTML = "<p class=\"notice\">No pending applications.</p>";
    return;
  }

  const cards = await Promise.all(entries.map(async ([id, app]) => {
    const userSnap = await db.ref(`users/${app.userId}`).once("value");
    const user = userSnap.val() || {};
    const bhSnap = await db.ref(`boardingHouses/${app.bhId}`).once("value");
    const bh = bhSnap.val() || {};
    const bhName = bh.name || app.bhId;

    return `
      <div class="form-card" data-app-id="${id}">
        <h3>${bhName}</h3>
        <p class="form-hint">Applicant: ${user.displayName || user.email || app.userId}</p>
        <p class="form-hint">Email: ${user.email || app.userEmail || "-"}</p>
        <p class="form-hint">Move-in: ${app.moveInDate || "-"} | Duration: ${app.duration || "-"} months</p>
        <p class="form-hint">Notes: ${app.requirements || "None"}</p>
        <div class="card-actions">
          <button class="btn" data-approve>Approve</button>
          <button class="btn btn-danger" data-reject>Reject</button>
        </div>
      </div>
    `;
  }));

  container.innerHTML = cards.join("");

  container.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-app-id]");
      const appId = card.dataset.appId;
      const app = applications[appId];
      const bhSnap = await db.ref(`boardingHouses/${app.bhId}`).once("value");
      const bh = bhSnap.val() || {};
      const bhName = bh.name || app.bhId;
      const reviewNote = window.prompt("Add a comment for the applicant (optional):") || "";
      await db.ref(`applications/${appId}`).update({
        status: "approved",
        reviewedBy: currentUserId,
        reviewedAt: Date.now(),
        reviewNote
      });
      await db.ref(`boardingHouses/${app.bhId}`).update({
        status: "occupied",
        occupiedBy: app.userId,
        updatedAt: Date.now()
      });
      await createNotification(app.userId, `Your application for ${bhName} is approved.`);
      showToast("Application approved.");
    });
  });

  container.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-app-id]");
      const appId = card.dataset.appId;
      const app = applications[appId];
      const bhSnap = await db.ref(`boardingHouses/${app.bhId}`).once("value");
      const bh = bhSnap.val() || {};
      const bhName = bh.name || app.bhId;
      const reviewNote = window.prompt("Add a comment for the applicant (optional):") || "";
      await db.ref(`applications/${appId}`).update({
        status: "rejected",
        reviewedBy: currentUserId,
        reviewedAt: Date.now(),
        reviewNote
      });
      await createNotification(app.userId, `Your application for ${bhName} was rejected.`);
      showToast("Application rejected.");
    });
  });
}

function initAdminDashboard() {
  requireAuth({ roles: ["admin"] }).then(({ user }) => {
    const landingForm = document.getElementById("landing-form");
    const statusEl = landingForm?.querySelector("[data-status]");

    db.ref("landingContent").on("value", (snapshot) => {
      const data = snapshot.val() || {};
      if (landingForm) {
        landingForm.heroTitle.value = data.heroTitle || "";
        landingForm.heroSubtitle.value = data.heroSubtitle || "";
        landingForm.heroImage.value = data.heroImage || "";
        landingForm.contactEmail.value = data.contactEmail || "";
        landingForm.contactPhone.value = data.contactPhone || "";
        landingForm.footerText.value = data.footerText || "";
      }
    });

    landingForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setLoading(landingForm, true);
      statusEl.textContent = "";
      try {
        const payload = {
          heroTitle: landingForm.heroTitle.value.trim(),
          heroSubtitle: landingForm.heroSubtitle.value.trim(),
          heroImage: landingForm.heroImage.value.trim(),
          contactEmail: landingForm.contactEmail.value.trim(),
          contactPhone: landingForm.contactPhone.value.trim(),
          footerText: landingForm.footerText.value.trim(),
          updatedAt: Date.now()
        };
        await db.ref("landingContent").set(payload);
        statusEl.textContent = "Landing page updated.";
      } catch (error) {
        statusEl.textContent = error.message;
      } finally {
        setLoading(landingForm, false);
      }
    });

    db.ref("boardingHouses").on("value", (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-bh").textContent = count;
    });

    db.ref("applications").on("value", (snapshot) => {
      const apps = snapshot.val() || {};
      const pendingCount = Object.values(apps).filter((app) => app.status === "pending").length;
      document.getElementById("stat-apps").textContent = pendingCount;
      renderApplications(document.getElementById("admin-applications"), apps, user.uid);
    });

    db.ref("users").on("value", (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-users").textContent = count;
    });
  });
}

function collectAmenities(form) {
  return Array.from(form.querySelectorAll("input[name='amenities']:checked")).map((input) => input.value);
}

function collectRules(value) {
  if (!value) {
    return [];
  }
  return value.split("\n").map((rule) => rule.trim()).filter(Boolean);
}

async function uploadImages(files, bhId) {
  if (!files || !files.length) {
    return [];
  }
  const uploads = Array.from(files).map((file) => {
    const fileRef = storage.ref(`boardingHouses/${bhId}/${Date.now()}_${file.name}`);
    return fileRef.put(file).then(() => fileRef.getDownloadURL());
  });
  return Promise.all(uploads);
}

function renderAdminBHCard(id, data) {
  const imageUrl = (data.images && data.images[0]) || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80";
  return `
    <article class="card" data-id="${id}">
      <img src="${imageUrl}" alt="${data.name}">
      <div class="card-body">
        <h3 class="card-title">${data.name}</h3>
        <div class="card-meta">
          <span>${data.address}</span>
          <span>${formatCurrency(data.price)}</span>
        </div>
        <div class="card-meta">
          <span class="status ${data.status}">${data.status}</span>
          <span class="badge">Featured: ${data.featured ? "Yes" : "No"}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost" data-edit>Edit</button>
          <button class="btn btn-danger" data-delete>Delete</button>
        </div>
      </div>
    </article>
  `;
}

function initAdminBoardingHouses() {
  requireAuth({ roles: ["admin"] }).then(() => {
    const form = document.getElementById("bh-form");
    const list = document.getElementById("bh-list");
    const statusEl = form.querySelector("[data-status]");

    db.ref("boardingHouses").on("value", (snapshot) => {
      const data = snapshot.val() || {};
      list.innerHTML = Object.entries(data).map(([id, value]) => renderAdminBHCard(id, value)).join("");
    });

    list.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-id]");
      if (!card) {
        return;
      }
      const bhId = card.dataset.id;
      if (event.target.matches("[data-delete]")) {
        const confirmed = window.confirm("Delete this boarding house?");
        if (!confirmed) {
          return;
        }
        await db.ref(`boardingHouses/${bhId}`).remove();
        showToast("Listing deleted.");
      }
      if (event.target.matches("[data-edit]")) {
        const snapshot = await db.ref(`boardingHouses/${bhId}`).once("value");
        const data = snapshot.val();
        if (!data) {
          return;
        }
        form.bhId.value = bhId;
        form.bhName.value = data.name || "";
        form.bhPrice.value = data.price || "";
        form.bhAddress.value = data.address || "";
        form.bhContact.value = data.contactNumber || "";
        form.bhDescription.value = data.description || "";
        form.bhRooms.value = data.specs?.rooms || "";
        form.bhBathrooms.value = data.specs?.bathrooms || "";
        form.bhFloorArea.value = data.specs?.floorArea || "";
        form.bhStatus.value = data.status || "available";
        form.bhRules.value = (data.rules || []).join("\n");
        form.bhFeatured.checked = Boolean(data.featured);

        form.querySelectorAll("input[name='amenities']").forEach((input) => {
          input.checked = data.specs?.amenities?.includes(input.value) || false;
        });

        form.dataset.images = JSON.stringify(data.images || []);
        form.dataset.previousPrice = data.price || 0;
        showToast("Loaded listing for editing.");
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      statusEl.textContent = "";
      setLoading(form, true);

      try {
        const bhId = form.bhId.value || db.ref("boardingHouses").push().key;
        const existingImages = form.dataset.images ? JSON.parse(form.dataset.images) : [];
        const newImages = await uploadImages(form.bhImages.files, bhId);
        const combinedImages = [...existingImages, ...newImages];
        const payload = {
          name: form.bhName.value.trim(),
          description: form.bhDescription.value.trim(),
          address: form.bhAddress.value.trim(),
          price: Number(form.bhPrice.value) || 0,
          specs: {
            rooms: Number(form.bhRooms.value) || 0,
            bathrooms: Number(form.bhBathrooms.value) || 0,
            floorArea: Number(form.bhFloorArea.value) || 0,
            amenities: collectAmenities(form)
          },
          images: combinedImages,
          status: form.bhStatus.value,
          contactNumber: form.bhContact.value.trim(),
          rules: collectRules(form.bhRules.value),
          featured: form.bhFeatured.checked,
          updatedAt: Date.now()
        };

        if (!form.bhId.value) {
          payload.createdAt = Date.now();
        }

        await db.ref(`boardingHouses/${bhId}`).update(payload);

        const previousPrice = Number(form.dataset.previousPrice);
        if (!Number.isNaN(previousPrice) && previousPrice && previousPrice !== payload.price) {
          const favoritesSnap = await db.ref("favorites").once("value");
          const favorites = favoritesSnap.val() || {};
          const impactedUsers = Object.keys(favorites).filter((uid) => favorites[uid] && favorites[uid][bhId]);
          await Promise.all(impactedUsers.map((uid) => createNotification(uid, `Price updated for ${payload.name}: ${formatCurrency(payload.price)}.`)));
        }
        form.reset();
        form.bhId.value = "";
        form.dataset.images = "";
        form.dataset.previousPrice = "";
        statusEl.textContent = "Boarding house saved.";
      } catch (error) {
        statusEl.textContent = error.message;
      } finally {
        setLoading(form, false);
      }
    });
  });
}

function initAdminUsers() {
  requireAuth({ roles: ["admin"] }).then(() => {
    const tableBody = document.getElementById("user-table");

    db.ref("users").on("value", (snapshot) => {
      const users = snapshot.val() || {};
      tableBody.innerHTML = Object.entries(users).map(([id, user]) => {
        return `
          <tr data-id="${id}">
            <td>${user.displayName || "-"}</td>
            <td>${user.email || "-"}</td>
            <td>
              <select data-role>
                <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
                <option value="staff" ${user.role === "staff" ? "selected" : ""}>Staff</option>
                <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </td>
            <td>
              <select data-status>
                <option value="active" ${user.status === "active" ? "selected" : ""}>Active</option>
                <option value="inactive" ${user.status === "inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </td>
            <td>
              <button class="btn btn-ghost" data-save>Save</button>
            </td>
          </tr>
        `;
      }).join("");
    });

    tableBody.addEventListener("click", async (event) => {
      if (!event.target.matches("[data-save]")) {
        return;
      }
      const row = event.target.closest("tr");
      const uid = row.dataset.id;
      const role = row.querySelector("[data-role]").value;
      const status = row.querySelector("[data-status]").value;
      await db.ref(`users/${uid}`).update({ role, status, updatedAt: Date.now() });
      showToast("User updated.");
    });
  });
}

if (page === "admin-dashboard") {
  initAdminDashboard();
}

if (page === "admin-boarding-houses") {
  initAdminBoardingHouses();
}

if (page === "admin-users") {
  initAdminUsers();
}
