import { api, notify, escapeHtml } from "../core.js";
import { openFormModal } from "../ui/modal.js";

function formDataToObject(formData) {
  const result = {};
  formData.forEach((value, key) => {
    result[key] = typeof value === "string" ? value.trim() : value;
  });
  return result;
}

function renderCompanyFields(body, values = {}) {
  body.innerHTML = `
    <div>
      <label for="companyName">Nom *</label>
      <input id="companyName" name="name" value="${escapeHtml(values.name)}" data-autofocus required>
    </div>
    <div class="admin-modal__grid">
      <div>
        <label for="companyCity">Ville</label>
        <input id="companyCity" name="hq_city" value="${escapeHtml(values.hq_city)}">
      </div>
      <div>
        <label for="companySector">Secteur</label>
        <input id="companySector" name="sector" value="${escapeHtml(values.sector)}">
      </div>
    </div>
    <div>
      <label for="companyWebsite">Site web</label>
      <input id="companyWebsite" name="website" value="${escapeHtml(values.website)}">
    </div>
    <div>
      <label for="companySocial">Réseaux sociaux</label>
      <input id="companySocial" name="social_links" value="${escapeHtml(values.social_links)}">
    </div>
    <div>
      <label for="companyHeadcount">Effectif</label>
      <input id="companyHeadcount" name="headcount" value="${escapeHtml(values.headcount)}">
    </div>
    <div>
      <label for="companyBanner">Bannière (URL)</label>
      <input id="companyBanner" name="banner_url" value="${escapeHtml(values.banner_url)}">
    </div>
    <div>
      <label for="companyDescription">Description</label>
      <textarea id="companyDescription" name="description">${escapeHtml(values.description)}</textarea>
    </div>
  `;
}

export function openCreateCompanyForm({ onSuccess } = {}) {
  openFormModal({
    title: "Nouvelle entreprise",
    submitLabel: "Créer",
    render(body) {
      renderCompanyFields(body, {});
    },
    async onSubmit(formData) {
      const values = formDataToObject(formData);
      if (!values.name) {
        notify("Le nom de l'entreprise est obligatoire", false);
        return false;
      }
      const payload = {
        name: values.name,
        hq_city: values.hq_city || null,
        sector: values.sector || null,
        description: values.description || null,
        website: values.website || null,
        social_links: values.social_links || null,
        headcount: values.headcount || null,
        banner_url: values.banner_url || null,
      };
      try {
        await api("/api/companies", { method: "POST", body: payload });
        notify("Entreprise créée ✅");
        await onSuccess?.();
        return true;
      } catch (err) {
        notify(err?.detail || "Création impossible", false);
        return false;
      }
    },
  });
}

export async function openEditCompanyForm({ companyId, onSuccess } = {}) {
  try {
    const company = await api(`/api/companies/${companyId}`);
    openFormModal({
      title: "Éditer l'entreprise",
      submitLabel: "Enregistrer",
      render(body) {
        renderCompanyFields(body, company);
      },
      async onSubmit(formData) {
        const values = formDataToObject(formData);
        if (!values.name) {
          notify("Le nom de l'entreprise est obligatoire", false);
          return false;
        }
        const payload = {
          name: values.name,
          hq_city: values.hq_city || null,
          sector: values.sector || null,
          description: values.description || null,
          website: values.website || null,
          social_links: values.social_links || null,
          headcount: values.headcount || null,
          banner_url: values.banner_url || null,
        };
        try {
          await api(`/api/companies/${companyId}`, { method: "PUT", body: payload });
          notify("Entreprise mise à jour ✅");
          await onSuccess?.();
          return true;
        } catch (err) {
          notify(err?.detail || "Mise à jour impossible", false);
          return false;
        }
      },
    });
  } catch (err) {
    notify(err?.detail || "Entreprise introuvable", false);
  }
}
