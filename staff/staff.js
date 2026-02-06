import {
  db,
  dbRef,
  get,
  onValue,
  push,
  set,
  update
} from "../assets/js/firebase-config.js";
import { showToast, formatCurrency } from "../assets/js/main.js";
import { requireAuth } from "../assets/js/auth-check.js";

const staffPage = document.body.dataset.page;

function renderStaffBHCard(id, data) {
  const imageUrl = (data.images && data.images[0]) || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80";
  const notes = data.maintenanceNotes || [];
  const latestNote = notes.length ? notes[notes.length - 1].note : "No notes yet.";

  return `
    <article class="card" data-id="${id}">
      <img src="${imageUrl}" alt="${data.name}">
      <div class="card-body">
        <h3 class="card-title">${data.name}</h3>
        <div class="card-meta">
          <span>${data.address || "-"}</span>
          <span>${formatCurrency(data.price)}</span>
        </div>
        <div class="card-meta">
          <span class="status ${data.status}">${data.status}</span>
          <span class="badge">Occupied By: ${data.occupiedBy || "-"}</span>
        </div>
        <p class="form-hint">Owner Contact: ${data.contactNumber || "-"}</p>
        <p class="form-hint">Latest note: ${latestNote}</p>
        <div>
          <label>Status</label>
          <select data-status>
            <option value="available" ${data.status === "available" ? "selected" : ""}>Available</option>
            <option value="occupied" ${data.status === "occupied" ? "selected" : ""}>Occupied</option>
          </select>
        </div>
        <div>
          <label>Maintenance Note</label>
          <input type="text" data-note placeholder="Add note">
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost" data-update>Update</button>
        </div>
      </div>
    </article>
  `;
}

function initStaffDashboard() {
  requireAuth({ roles: ["staff", "admin"] }).then(({ user }) => {
    const list = document.getElementById("staff-bh-list");

    onValue(dbRef(db, "boardingHouses"), (snapshot) => {
      const data = snapshot.val() || {};
      list.innerHTML = Object.entries(data).map(([id, value]) => renderStaffBHCard(id, value)).join("");
    });

    list.addEventListener("click", async (event) => {
      if (!event.target.matches("[data-update]")) {
        return;
      }
      const card = event.target.closest("[data-id]");
      const bhId = card.dataset.id;
      const status = card.querySelector("[data-status]").value;
      const noteInput = card.querySelector("[data-note]");
      const noteValue = noteInput.value.trim();

      const updates = {
        status,
        updatedAt: Date.now()
      };

      if (noteValue) {
        const notesRef = push(dbRef(db, `boardingHouses/${bhId}/maintenanceNotes`));
        await set(notesRef, {
          note: noteValue,
          createdAt: Date.now(),
          createdBy: user.uid
        });
        noteInput.value = "";
      }

      await update(dbRef(db, `boardingHouses/${bhId}`), updates);
      showToast("Boarding house updated.");
    });
  });
}

async function renderStaffApplications(container, apps, reviewerId) {
  if (!container) {
    return;
  }
  const entries = Object.entries(apps || {}).filter(([, app]) => app.status === "pending");
  if (!entries.length) {
    container.innerHTML = "<p class=\"notice\">No pending applications.</p>";
    return;
  }

  const cards = await Promise.all(entries.map(async ([id, app]) => {
    const userSnap = await get(dbRef(db, `users/${app.userId}`));
    const user = userSnap.val() || {};
    const bhSnap = await get(dbRef(db, `boardingHouses/${app.bhId}`));
    const bh = bhSnap.val() || {};

    return `
      <div class="form-card" data-app-id="${id}">
        <h3>${bh.name || "Boarding House"}</h3>
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
      const app = apps[appId];
      const reviewNote = window.prompt("Add a comment for the applicant (optional):") || "";
      await update(dbRef(db, `applications/${appId}`), {
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: Date.now(),
        reviewNote
      });
      await update(dbRef(db, `boardingHouses/${app.bhId}`), {
        status: "occupied",
        occupiedBy: app.userId,
        updatedAt: Date.now()
      });
      showToast("Application approved.");
    });
  });

  container.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-app-id]");
      const appId = card.dataset.appId;
      const reviewNote = window.prompt("Add a comment for the applicant (optional):") || "";
      await update(dbRef(db, `applications/${appId}`), {
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt: Date.now(),
        reviewNote
      });
      showToast("Application rejected.");
    });
  });
}

function initStaffApplications() {
  requireAuth({ roles: ["staff", "admin"] }).then(({ user }) => {
    onValue(dbRef(db, "applications"), (snapshot) => {
      const apps = snapshot.val() || {};
      renderStaffApplications(document.getElementById("staff-applications"), apps, user.uid);
    });
  });
}

if (staffPage === "staff-dashboard") {
  initStaffDashboard();
}

if (staffPage === "staff-applications") {
  initStaffApplications();
}
