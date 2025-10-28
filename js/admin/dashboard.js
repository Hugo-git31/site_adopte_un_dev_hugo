import { $, ensureAdmin, escapeHtml, notify } from "./core.js";
import { loadAdminStats } from "./stats-panel.js";
import { createPaginatedSection, createFilterableList } from "./section-factories.js";
import { initModal } from "./ui/modal.js";
import { initTabs } from "./ui/tabs.js";
import { openCreateUserForm, openEditUserForm } from "./forms/user-form.js";
import { openCreateCompanyForm, openEditCompanyForm } from "./forms/company-form.js";
import { openCreateJobForm, openEditJobForm } from "./forms/job-form.js";
import { openApplicationModal } from "./forms/application-form.js";

const ROLE_LABELS = {
  user: "Candidat",
  recruiter: "Recruteur",
  admin: "Administrateur",
};

const APPLICATION_STATUS_LABELS = {
  new: "Nouveau",
  in_review: "En revue",
  contacted: "Contacté",
  accepted: "Acceptée",
  rejected: "Refusée",
  archived: "Archivée",
};

document.addEventListener("DOMContentLoaded", async () => {
  initModal();
  initTabs("dashboard");
  const me = await ensureAdmin();
  if (!me) return;

  const usersSection = createPaginatedSection({
    endpoint: "/api/profiles",
    tableBody: "#adminUsersBody",
    emptyState: "#adminUsersEmpty",
    pagination: "#adminUsersPagination",
    searchForm: "#adminUserFilters",
    searchInput: "#adminSearch",
    renderRow(profile) {
      const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "—";
      const email = escapeHtml(profile.email || "—");
      const roleLabel = ROLE_LABELS[profile.role] || "—";
      const city = escapeHtml(profile.city || "—");
      return `
        <tr data-profile-id="${profile.id}">
          <td>${escapeHtml(fullName)}</td>
          <td><div class="admin-user-email">${email}</div></td>
          <td>${escapeHtml(roleLabel)}</td>
          <td>${city}</td>
          <td>
            <div class="admin-actions-stack">
              <button class="admin-edit-btn admin-edit-user" data-profile-id="${profile.id}" data-user-id="${profile.user_id}">Modifier</button>
              <button class="admin-delete-btn admin-delete-user" data-profile-id="${profile.id}" data-user-id="${profile.user_id}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    },
    deleteSelector: ".admin-delete-user",
    extractId: (btn) => Number(btn.dataset.userId),
    deleteEndpoint: (userId) => `/api/users/${userId}`,
    confirmMessage:
      "Supprimer ce compte utilisateur ? Son profil et ses données associées seront supprimés.",
    successMessage: "Compte supprimé ✅",
    errorMessage: "Impossible de supprimer le compte",
    onAfterDelete: async () => loadAdminStats(),
  });

  const companiesSection = createFilterableList({
    endpoint: "/api/companies",
    tableBody: "#adminCompaniesBody",
    emptyState: "#adminCompaniesEmpty",
    pagination: "#adminCompaniesPagination",
    searchForm: "#adminCompanyFilters",
    searchInput: "#adminCompanySearch",
    renderRow(company) {
      const city = escapeHtml(company.hq_city || "—");
      const websiteUrl = company.website ? escapeHtml(company.website) : "";
      const website = company.website
        ? `<a href="${websiteUrl}" target="_blank" rel="noopener">${websiteUrl}</a>`
        : "—";
      return `
        <tr data-company-id="${company.id}">
          <td>${escapeHtml(company.name)}</td>
          <td>${city}</td>
          <td>${website}</td>
          <td>
            <div class="admin-actions-stack">
              <button class="admin-edit-btn admin-edit-company" data-company-id="${company.id}">Modifier</button>
              <button class="admin-delete-btn admin-delete-company" data-company-id="${company.id}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    },
    deleteSelector: ".admin-delete-company",
    extractId: (btn) => Number(btn.dataset.companyId),
    deleteEndpoint: (id) => `/api/companies/${id}`,
    confirmMessage:
      "Supprimer cette entreprise ? Toutes ses offres associées seront aussi supprimées.",
    successMessage: "Entreprise supprimée ✅",
    errorMessage: "Impossible de supprimer l'entreprise",
  });

  const jobsSection = createPaginatedSection({
    endpoint: "/api/jobs",
    tableBody: "#adminJobsBody",
    emptyState: "#adminJobsEmpty",
    pagination: "#adminJobsPagination",
    searchForm: "#adminJobFilters",
    searchInput: "#adminJobSearch",
    renderRow(job) {
      const title = escapeHtml(job.title || "—");
      const companyName = escapeHtml(job.company_name || "—");
      const location = job.location ? `<div class="admin-meta">${escapeHtml(job.location)}</div>` : "";
      return `
        <tr data-job-id="${job.id}">
          <td>
            <div class="admin-user-email">${title}</div>
            ${location}
          </td>
          <td>${companyName}</td>
          <td>
            <div class="admin-actions-stack">
              <button class="admin-edit-btn admin-edit-job" data-job-id="${job.id}">Modifier</button>
              <button class="admin-delete-btn admin-delete-job" data-job-id="${job.id}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    },
    deleteSelector: ".admin-delete-job",
    extractId: (btn) => Number(btn.dataset.jobId),
    deleteEndpoint: (id) => `/api/jobs/${id}`,
    confirmMessage: "Supprimer cette offre d'emploi ?",
    successMessage: "Offre supprimée ✅",
    errorMessage: "Impossible de supprimer l'offre",
  });

  const applicationsSection = createPaginatedSection({
    endpoint: "/api/applications",
    tableBody: "#adminApplicationsBody",
    emptyState: "#adminApplicationsEmpty",
    pagination: "#adminApplicationsPagination",
    pageSize: 15,
    initialState: {
      query: "",
    },
    paramBuilder(state) {
      const params = {};
      if (state.query) params.q = state.query;
      return params;
    },
    renderRow(application) {
      const candidate = escapeHtml(application.candidate_name || "—");
      const email = escapeHtml(application.candidate_email || "—");
      const phone = escapeHtml(application.candidate_phone || "—");
      const job = escapeHtml(application.job_title || "—");
      const company = escapeHtml(application.company_name || "—");
      const statusLabel = escapeHtml(
        APPLICATION_STATUS_LABELS[application.status] || application.status || "—"
      );
      const statusBadge = `<span class="admin-badge">${statusLabel}</span>`;
      return `
        <tr data-application-id="${application.id}">
          <td>${candidate}</td>
          <td>
            <div>${email}</div>
            <div class="admin-meta">${phone}</div>
          </td>
          <td>
            <div class="admin-user-email">${job}</div>
            <div class="admin-meta">${company}</div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div class="admin-actions-stack">
              <button class="admin-edit-btn admin-view-application" data-application-id="${application.id}">Détails</button>
              <button class="admin-delete-btn admin-delete-application" data-application-id="${application.id}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    },
    deleteSelector: ".admin-delete-application",
    extractId: (btn) => Number(btn.dataset.applicationId),
    deleteEndpoint: (id) => `/api/applications/${id}`,
    confirmMessage: "Supprimer cette candidature ?",
    successMessage: "Candidature supprimée ✅",
    errorMessage: "Impossible de supprimer la candidature",
    onAfterDelete: async () => loadAdminStats(),
  });

  companiesSection.setAfterDelete(async () => {
    await Promise.all([loadAdminStats(), jobsSection.refresh()]);
  });
  jobsSection.setAfterDelete(async () => {
    await Promise.all([loadAdminStats(), companiesSection.refresh()]);
  });

  await loadAdminStats();
  await usersSection.load();
  await companiesSection.load();
  await jobsSection.load();

  let applicationsLoaded = false;

  document.addEventListener("admin:view-change", async (event) => {
    const view = event.detail?.view;
    if (view === "applications" && !applicationsLoaded) {
      const result = await applicationsSection.load();
      if (result) {
        applicationsLoaded = true;
      }
    }
  });

  const userCreateBtn = $("#adminUserCreateBtn");
  userCreateBtn?.addEventListener("click", () => {
    openCreateUserForm({
      onSuccess: async () => {
        await usersSection.load(1);
        await loadAdminStats();
      },
    });
  });

  const usersBody = $("#adminUsersBody");
  usersBody?.addEventListener("click", (event) => {
    const editBtn = event.target.closest(".admin-edit-user");
    if (!editBtn) return;
    const profileId = Number(editBtn.dataset.profileId);
    const userId = Number(editBtn.dataset.userId);
    if (!Number.isFinite(profileId) || !Number.isFinite(userId)) return;
    openEditUserForm({
      profileId,
      userId,
      onSuccess: async () => {
        await usersSection.refresh();
        await loadAdminStats();
      },
    });
  });

  const companyCreateBtn = $("#adminCompanyCreateBtn");
  companyCreateBtn?.addEventListener("click", () => {
    openCreateCompanyForm({
      onSuccess: async () => {
        await companiesSection.load();
        await loadAdminStats();
        await jobsSection.refresh();
      },
    });
  });

  const companiesBody = $("#adminCompaniesBody");
  companiesBody?.addEventListener("click", (event) => {
    const editBtn = event.target.closest(".admin-edit-company");
    if (!editBtn) return;
    const companyId = Number(editBtn.dataset.companyId);
    if (!Number.isFinite(companyId)) return;
    openEditCompanyForm({
      companyId,
      onSuccess: async () => {
        await companiesSection.load();
        await loadAdminStats();
        await jobsSection.refresh();
      },
    });
  });

  async function getCompanyOptions() {
    if (!companiesSection.state.items || companiesSection.state.items.length === 0) {
      await companiesSection.load();
    }
    return companiesSection.state.items.map((company) => ({
      id: Number(company.id),
      name: company.name,
      hq_city: company.hq_city || "",
    }));
  }

  const jobCreateBtn = $("#adminJobCreateBtn");
  jobCreateBtn?.addEventListener("click", async () => {
    const companies = await getCompanyOptions();
    if (!companies.length) {
      notify("Veuillez d'abord créer une entreprise", false);
      return;
    }
    openCreateJobForm({
      companies,
      onSuccess: async () => {
        await jobsSection.load(1);
        await loadAdminStats();
      },
    });
  });

  const jobsBody = $("#adminJobsBody");
  jobsBody?.addEventListener("click", async (event) => {
    const editBtn = event.target.closest(".admin-edit-job");
    if (!editBtn) return;
    const jobId = Number(editBtn.dataset.jobId);
    if (!Number.isFinite(jobId)) return;
    const companies = await getCompanyOptions();
    openEditJobForm({
      jobId,
      companies,
      onSuccess: async () => {
        await jobsSection.refresh();
        await loadAdminStats();
      },
    });
  });

  const applicationsFiltersForm = $("#adminApplicationFilters");
  applicationsFiltersForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = $("#adminApplicationSearch")?.value.trim() || "";
    applicationsSection.setQuery(query);
    const result = await applicationsSection.load(1);
    if (result) {
      applicationsLoaded = true;
    }
  });

  const applicationsBody = $("#adminApplicationsBody");
  applicationsBody?.addEventListener("click", (event) => {
    const viewBtn = event.target.closest(".admin-view-application");
    if (viewBtn) {
      const applicationId = Number(viewBtn.dataset.applicationId);
      if (Number.isFinite(applicationId)) {
        openApplicationModal({
          applicationId,
          onSuccess: async () => {
            const result = await applicationsSection.refresh();
            if (result) {
              applicationsLoaded = true;
            }
            await loadAdminStats();
          },
        });
      }
      return;
    }
  });

  const loginBtn = $("#loginBtn");
  if (loginBtn) loginBtn.classList.add("is-admin");
});
