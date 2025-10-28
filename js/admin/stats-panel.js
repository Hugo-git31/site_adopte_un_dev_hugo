import { $, api, formatDate, notify } from "./core.js";

function renderStats(stats) {
  const grid = $("#adminStats");
  if (!grid) return;
  grid.innerHTML = "";
  const mapping = [
    ["total_users", "Utilisateurs"],
    ["total_admins", "Admins"],
    ["total_recruiters", "Recruteurs"],
    ["total_companies", "Entreprises"],
    ["total_jobs", "Offres"],
    ["total_applications", "Candidatures"],
  ];
  const tpl = $("#adminStatTpl");
  mapping.forEach(([key, label]) => {
    const value = stats?.[key] ?? 0;
    const node = tpl.content.firstElementChild.cloneNode(true);
    $(".admin-stat-label", node).textContent = label;
    $(".admin-stat-value", node).textContent = Number(value).toLocaleString("fr-FR");
    grid.appendChild(node);
  });
}

function renderRecentList(selector, items, renderFn) {
  const container = $(selector);
  if (!container) return;
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune donnée.";
    container.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = renderFn(item);
    container.appendChild(li);
  });
}

export async function loadAdminStats() {
  try {
    const data = await api("/api/admin/stats");
    renderStats(data.stats || {});
    renderRecentList("#recentUsers", data.latest_users, (user) => {
      const info = `${user.email} — ${user.role}`;
      return `${info}<br><span class="admin-meta">${formatDate(user.created_at)}</span>`;
    });
    renderRecentList("#recentCompanies", data.latest_companies, (company) => {
      return `${company.name}<br><span class="admin-meta">${formatDate(company.created_at)}</span>`;
    });
    renderRecentList("#recentJobs", data.latest_jobs, (job) => {
      return `${job.title}<br><span class="admin-meta">${job.company_name} • ${formatDate(job.created_at)}</span>`;
    });
    renderRecentList("#recentApplications", data.latest_applications, (app) => {
      const author = app.candidate_email || "Inconnu";
      return `${app.job_title}<br><span class="admin-meta">${author} • ${app.status} • ${formatDate(app.created_at)}</span>`;
    });
    return data;
  } catch (err) {
    console.error("Erreur stats", err);
    notify(err?.detail || "Impossible de charger les statistiques", false);
    return null;
  }
}
