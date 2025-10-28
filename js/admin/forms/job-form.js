import { api, notify, escapeHtml } from "../core.js";
import { openFormModal } from "../ui/modal.js";

function formDataToObject(formData) {
  const result = {};
  formData.forEach((value, key) => {
    result[key] = typeof value === "string" ? value.trim() : value;
  });
  return result;
}

function parseNumber(value) {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function renderJobFields(body, values = {}, companies = []) {
  body.innerHTML = `
    <div>
      <label for="jobCompany">Entreprise *</label>
      <select id="jobCompany" name="company_id" required data-autofocus>
        <option value="">Sélectionner une entreprise</option>
        ${companies
          .map((company) => {
            const label = company.hq_city
              ? `${company.name} — ${company.hq_city}`
              : company.name;
            return `<option value="${company.id}" ${Number(values.company_id) === company.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
          })
          .join("")}
      </select>
    </div>
    <div>
      <label for="jobTitle">Titre *</label>
      <input id="jobTitle" name="title" value="${escapeHtml(values.title)}" required>
    </div>
    <div>
      <label for="jobShort">Description courte *</label>
      <textarea id="jobShort" name="short_desc" required>${escapeHtml(values.short_desc)}</textarea>
    </div>
    <div>
      <label for="jobFull">Description complète</label>
      <textarea id="jobFull" name="full_desc">${escapeHtml(values.full_desc)}</textarea>
    </div>
    <div>
      <label for="jobProfile">Profil recherché</label>
      <textarea id="jobProfile" name="profile_sought">${escapeHtml(values.profile_sought)}</textarea>
    </div>
    <div class="admin-modal__grid">
      <div>
        <label for="jobLocation">Localisation</label>
        <input id="jobLocation" name="location" value="${escapeHtml(values.location)}">
      </div>
      <div>
        <label for="jobContract">Type de contrat</label>
        <input id="jobContract" name="contract_type" value="${escapeHtml(values.contract_type)}">
      </div>
      <div>
        <label for="jobMode">Mode de travail</label>
        <input id="jobMode" name="work_mode" value="${escapeHtml(values.work_mode)}">
      </div>
    </div>
    <div class="admin-modal__grid">
      <div>
        <label for="jobSalaryMin">Salaire min</label>
        <input id="jobSalaryMin" name="salary_min" type="number" value="${values.salary_min ?? ""}">
      </div>
      <div>
        <label for="jobSalaryMax">Salaire max</label>
        <input id="jobSalaryMax" name="salary_max" type="number" value="${values.salary_max ?? ""}">
      </div>
      <div>
        <label for="jobCurrency">Devise</label>
        <input id="jobCurrency" name="currency" value="${escapeHtml(values.currency || "EUR")}">
      </div>
    </div>
    <div>
      <label for="jobTags">Tags (séparés par des virgules)</label>
      <input id="jobTags" name="tags" value="${escapeHtml(values.tags)}">
    </div>
  `;
}

export function openCreateJobForm({ companies = [], onSuccess } = {}) {
  openFormModal({
    title: "Nouvelle offre",
    submitLabel: "Publier",
    size: "wide",
    render(body) {
      renderJobFields(body, {}, companies);
    },
    async onSubmit(formData) {
      const values = formDataToObject(formData);
      if (!values.company_id || !values.title || !values.short_desc) {
        notify("Veuillez renseigner l'entreprise, le titre et la description courte", false);
        return false;
      }
      const companyId = Number(values.company_id);
      if (!Number.isFinite(companyId) || companyId <= 0) {
        notify("Entreprise invalide", false);
        return false;
      }
      const payload = {
        company_id: companyId,
        title: values.title,
        short_desc: values.short_desc,
        full_desc: values.full_desc || null,
        location: values.location || null,
        profile_sought: values.profile_sought || null,
        contract_type: values.contract_type || null,
        work_mode: values.work_mode || null,
        salary_min: parseNumber(values.salary_min),
        salary_max: parseNumber(values.salary_max),
        currency: values.currency || null,
        tags: values.tags || null,
      };
      try {
        await api("/api/jobs", { method: "POST", body: payload });
        notify("Offre créée ✅");
        await onSuccess?.();
        return true;
      } catch (err) {
        notify(err?.detail || "Création impossible", false);
        return false;
      }
    },
  });
}

export async function openEditJobForm({ jobId, companies = [], onSuccess } = {}) {
  try {
    const job = await api(`/api/jobs/${jobId}`);
    openFormModal({
      title: "Éditer l'offre",
      submitLabel: "Enregistrer",
      size: "wide",
      render(body) {
        renderJobFields(body, job, companies);
      },
      async onSubmit(formData) {
        const values = formDataToObject(formData);
        if (!values.company_id || !values.title || !values.short_desc) {
          notify("Veuillez renseigner l'entreprise, le titre et la description courte", false);
          return false;
        }
        const companyId = Number(values.company_id);
        if (!Number.isFinite(companyId) || companyId <= 0) {
          notify("Entreprise invalide", false);
          return false;
        }
        const payload = {
          company_id: companyId,
          title: values.title,
          short_desc: values.short_desc,
          full_desc: values.full_desc || null,
          location: values.location || null,
          profile_sought: values.profile_sought || null,
          contract_type: values.contract_type || null,
          work_mode: values.work_mode || null,
          salary_min: parseNumber(values.salary_min),
          salary_max: parseNumber(values.salary_max),
          currency: values.currency || null,
          tags: values.tags || null,
        };
        try {
          await api(`/api/jobs/${jobId}`, { method: "PATCH", body: payload });
          notify("Offre mise à jour ✅");
          await onSuccess?.();
          return true;
        } catch (err) {
          notify(err?.detail || "Mise à jour impossible", false);
          return false;
        }
      },
    });
  } catch (err) {
    notify(err?.detail || "Offre introuvable", false);
  }
}
