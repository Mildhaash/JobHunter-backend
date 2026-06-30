function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("jobtracker-theme", theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem("jobtracker-theme");
  applyTheme(savedTheme === "dark" ? "dark" : "light");

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }
}

async function initNav() {
  let profile;
  try {
    profile = await DataStore.getProfile();
  } catch {
    profile = { name: "User", email: "" };
  }

  const initialEl = document.getElementById("profileInitial");
  const nameEl = document.querySelector(".dropdown-name");
  const emailEl = document.querySelector(".dropdown-email");

  const initial = (profile.name || "U").trim().charAt(0).toUpperCase() || "U";
  if (initialEl) initialEl.textContent = escapeHtml(initial);
  if (nameEl) nameEl.textContent = escapeHtml(profile.name);
  if (emailEl) emailEl.textContent = escapeHtml(profile.email);

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const profileTrigger = document.getElementById("profileTrigger");
  const profileDropdown = document.getElementById("profileDropdown");
  const signOutBtn = document.getElementById("signOutBtn");
  const exportBtn = document.getElementById("exportBtn");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      menuToggle.classList.toggle("is-active", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mainNav.classList.contains("is-open")) {
          mainNav.classList.remove("is-open");
          menuToggle.classList.remove("is-active");
          menuToggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768 && mainNav.classList.contains("is-open")) {
        mainNav.classList.remove("is-open");
        menuToggle.classList.remove("is-active");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !profileDropdown.hidden;
      profileDropdown.hidden = isOpen;
      profileTrigger.setAttribute("aria-expanded", String(!isOpen));
    });

    document.addEventListener("click", (e) => {
      if (!profileDropdown.hidden && !profileDropdown.contains(e.target) && e.target !== profileTrigger) {
        profileDropdown.hidden = true;
        profileTrigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !profileDropdown.hidden) {
        profileDropdown.hidden = true;
        profileTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await DataStore.logout();
      window.location.href = "../Homepage/login.html";
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      DataStore.exportApplicationsAsJson();
    });
  }

  initTheme();
}

async function renderNav(activePage) {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  header.innerHTML = `
    <div class="header-inner">
      <a href="dashboard.html" class="brand">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span class="brand-name">Application<span> Tracker</span></span>
      </a>

      <div class="header-actions">
        <nav class="main-nav" id="mainNav">
          <a href="dashboard.html" ${activePage === "dashboard" ? 'class="is-active"' : ""}>Dashboard</a>
          <a href="applications.html" ${activePage === "applications" ? 'class="is-active"' : ""}>Applications</a>
        </nav>

        <button class="icon-btn" id="exportBtn" type="button" aria-label="Export applications as JSON" title="Export data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>
        </button>

        <button id="themeToggle" class="theme-toggle" type="button" aria-label="Toggle dark mode">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"/></svg>
        </button>

        <div class="profile-menu">
          <button id="profileTrigger" class="avatar-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Open profile menu">
            <span id="profileInitial">U</span>
          </button>
          <div class="profile-dropdown" id="profileDropdown" hidden>
            <p class="dropdown-name">dummy user</p>
            <p class="dropdown-email">dummyuser1.net</p>
            <a href="profile.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>
              My Profile
            </a>
            <button class="dropdown-item dropdown-danger" id="signOutBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  await initNav();
}
