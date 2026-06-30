// ---------- Dashboard: stats + Chart.js visuals ----------

let statusChartInstance = null;
let monthlyChartInstance = null;
let interviewChartInstance = null;

function themeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function lastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getFullYear(), d.getMonth()) });
  }
  return months;
}

function renderLegend(targetId, items) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = items
    .map(
      (item) =>
        `<li><span class="legend-dot" style="background:${item.color}"></span>${escapeHtml(item.label)}: ${item.value}</li>`
    )
    .join("");
}

function renderStats(apps) {
  const total = apps.length;
  const interviewsTotal = apps.filter((a) => a.status === "Interview" || a.status === "Offer").length;
  const activeInterviews = apps.filter((a) => a.status === "Interview").length;
  const offers = apps.filter((a) => a.status === "Offer").length;
  const activePipeline = apps.filter((a) => a.status === "Applied" || a.status === "Interview").length;

  const interviewRate = total ? Math.round((interviewsTotal / total) * 100) : 0;
  const conversion = total ? Math.round((offers / total) * 100) : 0;

  document.getElementById("headCount").textContent = total;
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statInterview").textContent = interviewsTotal;
  document.getElementById("statInterviewActive").textContent = `(${activeInterviews} active)`;
  document.getElementById("statInterviewRate").textContent = `${interviewRate}% interview rate`;
  document.getElementById("statOffer").textContent = offers;
  document.getElementById("statConversion").textContent = `${conversion}% conversion`;
  document.getElementById("statActive").textContent = activePipeline;
}

function renderStatusChart(apps) {
  const counts = {
    Applied: apps.filter((a) => a.status === "Applied").length,
    Interview: apps.filter((a) => a.status === "Interview").length,
    Offer: apps.filter((a) => a.status === "Offer").length,
    Rejected: apps.filter((a) => a.status === "Rejected").length
  };

  const colors = [themeColor("--color-blue-dark"), themeColor("--color-accent"), themeColor("--color-green-dark"), themeColor("--color-red")];

  const data = {
    labels: Object.keys(counts),
    datasets: [{ data: Object.values(counts), backgroundColor: colors, borderWidth: 0 }]
  };

  const ctx = document.getElementById("statusChart");
  if (statusChartInstance) statusChartInstance.destroy();
  statusChartInstance = new Chart(ctx, {
    type: "doughnut",
    data,
    options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false }, tooltip: { enabled: true } } }
  });

  renderLegend(
    "statusLegend",
    Object.keys(counts).map((label, i) => ({ label, value: counts[label], color: colors[i] }))
  );
}

function renderMonthlyChart(apps) {
  const months = lastSixMonths();
  const counts = months.map(
    (m) => apps.filter((a) => {
      const d = new Date(a.date + "T00:00:00");
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length
  );

  const data = {
    labels: months.map((m) => m.label),
    datasets: [{ data: counts, backgroundColor: themeColor("--color-accent"), borderRadius: 6, maxBarThickness: 36 }]
  };

  const gridColor = themeColor("--color-border");
  const textColor = themeColor("--color-text-muted");

  const ctx = document.getElementById("monthlyChart");
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  monthlyChartInstance = new Chart(ctx, {
    type: "bar",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { beginAtZero: true, ticks: { precision: 0, color: textColor }, grid: { color: gridColor } }
      }
    }
  });
}

function renderInterviewChart(apps) {
  const total = apps.length;
  const interviewed = apps.filter((a) => a.status !== "Applied").length;
  const notInterviewed = total - interviewed;

  const colors = [themeColor("--color-green-dark"), themeColor("--color-border")];

  const data = {
    labels: ["Interviewed", "Not interviewed"],
    datasets: [{ data: [interviewed, notInterviewed], backgroundColor: colors, borderWidth: 0 }]
  };

  const ctx = document.getElementById("interviewChart");
  if (interviewChartInstance) interviewChartInstance.destroy();
  interviewChartInstance = new Chart(ctx, {
    type: "doughnut",
    data,
    options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }
  });

  renderLegend("interviewLegend", [
    { label: "Interviewed", value: interviewed, color: colors[0] },
    { label: "Not interviewed", value: notInterviewed, color: colors[1] }
  ]);
}

async function renderDashboard() {
  const apps = await DataStore.getApplications();
  renderStats(apps);
  renderStatusChart(apps);
  renderMonthlyChart(apps);
  renderInterviewChart(apps);
}

async function initDashboard() {
  const user = await DataStore.checkSession();
  if (!user) {
    window.location.href = "../Homepage/login.html";
    return;
  }
  await renderNav("dashboard");
  await renderDashboard();
}

document.addEventListener("DOMContentLoaded", initDashboard);

const themeObserver = new MutationObserver(() => renderDashboard());
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
