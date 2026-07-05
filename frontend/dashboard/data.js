// ---------- Shared data store (API-backed) ----------
// All methods are async and talk to the Express backend via fetch.

const DataStore = (() => {
  const SESSION_KEY = "jobtracker-session";
  const API_BASE = "https://job-hunter-backend-five.vercel.app";

  function getSessionId() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSessionId(id) {
    localStorage.setItem(SESSION_KEY, id);
  }

  function clearSessionId() {
    localStorage.removeItem(SESSION_KEY);
  }

  function captureOAuthSession() {
    var params = new URLSearchParams(window.location.search);
    var sid = params.get("sessionId");
    if (sid) {
      setSessionId(sid);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  async function api(path, options = {}) {
    const sessionId = getSessionId();
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (sessionId) {
      headers["X-Session-Id"] = sessionId;
    }
    const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
    if (res.status === 204) return null;
    let body;
    try {
      body = await res.json();
    } catch (e) {
      throw new Error(`Server error (${res.status})`);
    }
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  async function signup(name, email, password) {
    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setSessionId(data.sessionId);
    return data.user;
  }

  async function login(email, password) {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSessionId(data.sessionId);
    return data.user;
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      clearSessionId();
    }
  }

  async function checkSession() {
    try {
      const data = await api("/auth/session");
      return data.user;
    } catch {
      clearSessionId();
      return null;
    }
  }

  // ── Applications ───────────────────────────────────────────────────────
  async function getApplications() {
    return await api("/applications");
  }

  async function getApplication(id) {
    return await api(`/applications/${id}`);
  }

  async function addApplication(app) {
    return await api("/applications", {
      method: "POST",
      body: JSON.stringify(app),
    });
  }

  async function updateApplication(id, patch) {
    return await api(`/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  async function deleteApplication(id) {
    await api(`/applications/${id}`, { method: "DELETE" });
  }

  // ── Profile ────────────────────────────────────────────────────────────
  async function getProfile() {
    return await api("/profile");
  }

  async function saveProfile(profile) {
    return await api("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────
  async function exportApplicationsAsJson() {
    const apps = await getApplications();
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Gmail ──────────────────────────────────────────────────────────────
  async function getGmailStatus() {
    return await api("/gmail/status");
  }

  async function connectGmail() {
    return await api("/gmail/connect");
  }

  async function syncGmail() {
    return await api("/gmail/sync", { method: "POST" });
  }

  async function disconnectGmail() {
    return await api("/gmail/disconnect", { method: "POST" });
  }

  captureOAuthSession();

  return {
    getSessionId,
    signup,
    login,
    logout,
    checkSession,
    getApplications,
    getApplication,
    addApplication,
    updateApplication,
    deleteApplication,
    getProfile,
    saveProfile,
    exportApplicationsAsJson,
    getGmailStatus,
    connectGmail,
    syncGmail,
    disconnectGmail,
  };
})();
