(function () {
  const SESSION_KEY = "jobtracker-session";
  const API_BASE = window.location.origin;

  function showMessage(message) {
    window.alert(message);
  }

  function redirectToDashboard() {
    window.location.href = "../dashboard/dashboard.html";
  }

  function initOAuthButtons() {
    var googleBtns = document.querySelectorAll(".btn-oauth");
    googleBtns.forEach(function (btn) {
      var text = btn.textContent.trim();
      if (text.includes("Google")) {
        btn.addEventListener("click", function () {
          window.location.href = API_BASE + "/auth/google";
        });
      } else if (text.includes("GitHub")) {
        btn.addEventListener("click", function () {
          window.location.href = API_BASE + "/auth/github";
        });
      }
    });
  }

  async function redirectIfAuthenticated() {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/session`, {
        headers: { "X-Session-Id": sessionId },
      });
      if (res.ok) {
        const currentPage = window.location.pathname.toLowerCase();
        if (currentPage.includes("/login.html") || currentPage.includes("/signup.html")) {
          redirectToDashboard();
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function initLoginFlow() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      if (!email || !password) {
        showMessage("Please enter both email and password.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showMessage(data.error || "Login failed.");
          return;
        }

        localStorage.setItem(SESSION_KEY, data.sessionId);
        redirectToDashboard();
      } catch {
        showMessage("Could not connect to server.");
      }
    });
  }

  function initSignupFlow() {
    const signupForm = document.getElementById("signupForm");
    if (!signupForm) return;

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = signupForm.name.value.trim();
      const email = signupForm.email.value.trim();
      const password = signupForm.password.value;

      if (!name || !email || !password) {
        showMessage("Please fill out all fields.");
        return;
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        showMessage("Please enter a valid email address.");
        return;
      }

      if (password.length < 6) {
        showMessage("Password must be at least 6 characters.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showMessage(data.error || "Signup failed.");
          return;
        }

        localStorage.setItem(SESSION_KEY, data.sessionId);
        redirectToDashboard();
      } catch {
        showMessage("Could not connect to server.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    redirectIfAuthenticated();
    initLoginFlow();
    initSignupFlow();
    initOAuthButtons();
  });
})();
