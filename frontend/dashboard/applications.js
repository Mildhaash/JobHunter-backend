// ---------- Applications table page ----------

let currentSearch = "";
let currentStatusFilter = "All";
let editingId = null;
let openRowMenuId = null;
let refreshTimer = null;

const tbody = document.getElementById("appsTableBody");
const appsCardsEl = document.getElementById("appsCards");
const emptyStateEl = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const addBtn = document.getElementById("addBtn");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalSubmit = document.getElementById("modalSubmit");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const form = document.getElementById("applicationForm");
const appIdInput = document.getElementById("appId");
const companyInput = document.getElementById("companyInput");
const roleInput = document.getElementById("roleInput");
const locationInput = document.getElementById("locationInput");
const dateInput = document.getElementById("dateInput");
const statusInput = document.getElementById("statusInput");

async function initApplicationsPage() {
  const user = await DataStore.checkSession();
  if (!user) {
    window.location.href = "../Homepage/login.html";
    return;
  }
  await renderNav("applications");
  attachApplicationListeners();
  closeModal();
  await renderRows();
  startAutoRefresh();
}

document.addEventListener("DOMContentLoaded", initApplicationsPage);

window.addEventListener("beforeunload", () => {
  if (refreshTimer) clearInterval(refreshTimer);
});

const STAGE_ORDER = ["Applied", "Shortlisted", "Interview", "Offer"];

function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFiltered(apps) {
  return apps.filter((app) => {
    const matchesStatus = currentStatusFilter === "All" || app.status === currentStatusFilter;
    const haystack = `${app.company} ${app.role}`.toLowerCase();
    const matchesSearch = haystack.includes(currentSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });
}

function stepStatesFor(status) {
  if (status === "Rejected") return ["rejected", "pending", "pending", "pending"];
  if (status === "Offer") return ["done", "done", "done", "done"];
  if (status === "Interview") return ["done", "done", "active", "pending"];
  return ["active", "pending", "pending", "pending"];
}

function renderProgressSteps(status) {
  const states = stepStatesFor(status);
  return `<div class="progress-track">${states
    .map((state, i) => {
      const stepNum = i + 1;
      let inner = stepNum;
      if (state === "done") {
        inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>';
      } else if (state === "rejected") {
        inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      }
      const connector = stepNum < 4 ? `<span class="progress-line progress-line-${state}"></span>` : "";
      return `<span class="progress-step progress-step-${state}">${inner}</span>${connector}`;
    })
    .join("")}</div>`;
}

function buildCardHtml(app) {
  const appId = app._id || app.id;
  return `
    <div class="card-mobile-top">
      <div class="card-mobile-info">
        <span class="card-mobile-company">${escapeHtml(app.company)}</span>
        <span class="card-mobile-role">${escapeHtml(app.role)}</span>
        <span class="card-mobile-meta">${escapeHtml(app.location || "\u2014")} &middot; ${formatDate(app.date)}</span>
      </div>
      <div class="card-mobile-actions">
        <span class="status-badge" data-status="${app.status}">${app.status}</span>
        <button class="row-menu-btn" data-id="${appId}" aria-label="Row actions" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
        </button>
        <div class="row-menu-dropdown" data-id="${appId}" hidden>
          <button class="dropdown-item" data-action="edit" data-id="${appId}" type="button">Edit</button>
          <button class="dropdown-item dropdown-danger" data-action="delete" data-id="${appId}" type="button">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function buildRowHtml(app) {
  const appId = app._id || app.id;
  return `
    <td class="cell-company">${escapeHtml(app.company)}</td>
    <td>${escapeHtml(app.role)}</td>
    <td>${escapeHtml(app.location || "\u2014")}</td>
    <td>${formatDate(app.date)}</td>
    <td><span class="status-badge" data-status="${app.status}">${app.status}</span></td>
    <td>${renderProgressSteps(app.status)}</td>
    <td class="cell-menu">
      <button class="row-menu-btn" data-id="${appId}" aria-label="Row actions" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
      </button>
      <div class="row-menu-dropdown" data-id="${appId}" hidden>
        <button class="dropdown-item" data-action="edit" data-id="${appId}" type="button">Edit</button>
        <button class="dropdown-item dropdown-danger" data-action="delete" data-id="${appId}" type="button">Delete</button>
      </div>
    </td>
  `;
}

async function renderRows() {
  let apps;
  try {
    apps = await DataStore.getApplications();
  } catch (err) {
    console.error("Failed to load applications:", err);
    return;
  }

  document.getElementById("headCount").textContent = apps.length;

  const visible = getFiltered(apps);
  tbody.innerHTML = "";
  appsCardsEl.innerHTML = "";
  emptyStateEl.hidden = visible.length !== 0;

  visible.forEach((app) => {
    const tr = document.createElement("tr");
    tr.innerHTML = buildRowHtml(app);
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "app-card-mobile";
    card.innerHTML = buildCardHtml(app);
    appsCardsEl.appendChild(card);
  });

  attachRowEvents();
}

function attachRowEvents() {
  const allMenuBtns = [
    ...tbody.querySelectorAll(".row-menu-btn"),
    ...appsCardsEl.querySelectorAll(".row-menu-btn"),
  ];

  allMenuBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const container = btn.closest("tbody") || btn.closest(".app-card-mobile");
      const dropdown = container
        ? container.querySelector(`.row-menu-dropdown[data-id="${id}"]`)
        : null;
      const isOpen = openRowMenuId === id;
      closeAllRowMenus();
      if (!isOpen && dropdown) {
        dropdown.hidden = false;
        openRowMenuId = id;
      }
    });
  });

  const allEditBtns = [
    ...tbody.querySelectorAll('[data-action="edit"]'),
    ...appsCardsEl.querySelectorAll('[data-action="edit"]'),
  ];

  allEditBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleEdit(btn.dataset.id);
    });
  });

  const allDeleteBtns = [
    ...tbody.querySelectorAll('[data-action="delete"]'),
    ...appsCardsEl.querySelectorAll('[data-action="delete"]'),
  ];

  allDeleteBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDelete(btn.dataset.id);
    });
  });
}

async function handleEdit(id) {
  closeAllRowMenus();
  let app;
  try {
    app = await DataStore.getApplication(id);
  } catch (err) {
    console.error("Failed to load application:", err.message, "id:", id);
    alert("Could not load application: " + err.message);
    return;
  }
  if (!app) {
    alert("Application not found.");
    return;
  }
  editingId = app._id || app.id;
  if (appIdInput) appIdInput.value = editingId;
  companyInput.value = app.company;
  roleInput.value = app.role;
  locationInput.value = app.location || "";
  dateInput.value = app.date;
  statusInput.value = app.status;
  modalTitle.textContent = "Edit application";
  modalSubmit.textContent = "Save changes";
  clearFormErrors();
  modalOverlay.hidden = false;
  companyInput.focus();
}

async function handleDelete(id) {
  closeAllRowMenus();
  console.log("DELETE request for id:", id, "type:", typeof id);
  if (!confirm("Are you sure you want to delete this application?")) return;
  try {
    await DataStore.deleteApplication(id);
  } catch (err) {
    console.error("Failed to delete application:", err.message, "id:", id);
    alert("Could not delete application: " + err.message);
    return;
  }
  await renderRows();
}

function closeAllRowMenus() {
  document.querySelectorAll(".row-menu-dropdown").forEach((d) => (d.hidden = true));
  openRowMenuId = null;
}

document.addEventListener("click", closeAllRowMenus);

// ---------- Search & filter ----------
let searchTimeout;
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => renderRows(), 200);
});

statusFilter.addEventListener("change", (e) => {
  currentStatusFilter = e.target.value;
  renderRows();
});

// ---------- Modal ----------
function openModalForAdd() {
  editingId = null;
  form.reset();
  if (appIdInput) appIdInput.value = "";
  modalTitle.textContent = "Add application";
  modalSubmit.textContent = "Add application";
  clearFormErrors();
  modalOverlay.hidden = false;
  companyInput.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  editingId = null;
  form.reset();
  clearFormErrors();
}

function clearFormErrors() {
  ["companyError", "roleError", "locationError", "dateError"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });
}

function attachApplicationListeners() {
  addBtn.addEventListener("click", openModalForAdd);
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
  });
}

function validateForm() {
  let valid = true;
  clearFormErrors();

  if (!document.getElementById("companyInput").value.trim()) {
    document.getElementById("companyError").textContent = "Company name is required.";
    valid = false;
  }
  if (!document.getElementById("roleInput").value.trim()) {
    document.getElementById("roleError").textContent = "Role is required.";
    valid = false;
  }
  if (!document.getElementById("locationInput").value.trim()) {
    document.getElementById("locationError").textContent = "Location is required.";
    valid = false;
  }
  if (!document.getElementById("dateInput").value) {
    document.getElementById("dateError").textContent = "Date applied is required.";
    valid = false;
  }
  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    company: companyInput.value.trim(),
    role: roleInput.value.trim(),
    location: locationInput.value.trim(),
    date: dateInput.value,
    status: statusInput.value,
  };

  try {
    if (editingId) {
      await DataStore.updateApplication(editingId, payload);
    } else {
      await DataStore.addApplication(payload);
    }
  } catch (err) {
    console.error("Failed to save application:", err);
    alert("Could not save application. Please try again.");
    return;
  }

  closeModal();
  await renderRows();
});

// ---------- Real-time auto-refresh ----------
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    if (document.hidden) return;
    await renderRows();
  }, 30000);
}
