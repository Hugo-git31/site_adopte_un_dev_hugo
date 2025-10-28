import { api, notify, escapeHtml } from "../core.js";
import { openFormModal } from "../ui/modal.js";

const ROLE_OPTIONS = [
  { value: "user", label: "Candidat" },
  { value: "recruiter", label: "Recruteur" },
  { value: "admin", label: "Administrateur" },
];

function formDataToObject(formData) {
  const result = {};
  formData.forEach((value, key) => {
    result[key] = typeof value === "string" ? value.trim() : value;
  });
  return result;
}

function renderUserFields(body, values = {}) {
  const selectedRole = values.role || "user";
  body.innerHTML = `
    <div>
      <label for="userEmail">Email</label>
      <input id="userEmail" name="email" type="email" value="${escapeHtml(values.email)}" data-autofocus required>
    </div>
    <div>
      <label for="userRole">Rôle</label>
      <select id="userRole" name="role" required>
        ${ROLE_OPTIONS.map((opt) => `<option value="${opt.value}" ${selectedRole === opt.value ? "selected" : ""}>${opt.label}</option>`).join("")}
      </select>
    </div>
    <div>
      <label for="userPassword">Mot de passe ${values.id ? "(laisser vide pour conserver)" : ""}</label>
      <input id="userPassword" name="password" type="password" ${values.id ? "" : "required"} minlength="6">
    </div>
    <div class="admin-modal__divider"></div>
    <div class="admin-modal__grid">
      <div>
        <label for="profileFirstName">Prénom</label>
        <input id="profileFirstName" name="first_name" value="${escapeHtml(values.first_name)}" required>
      </div>
      <div>
        <label for="profileLastName">Nom</label>
        <input id="profileLastName" name="last_name" value="${escapeHtml(values.last_name)}" required>
      </div>
    </div>
    <div class="admin-modal__grid">
      <div>
        <label for="profileCity">Ville</label>
        <input id="profileCity" name="city" value="${escapeHtml(values.city)}" required>
      </div>
      <div>
        <label for="profilePhone">Téléphone</label>
        <input id="profilePhone" name="phone" value="${escapeHtml(values.phone)}">
      </div>
    </div>
    <div>
      <label for="profileSkills">Compétences (séparées par des virgules)</label>
      <input id="profileSkills" name="skills" value="${escapeHtml(values.skills)}">
    </div>
    <div>
      <label for="profileJobTarget">Poste cible</label>
      <input id="profileJobTarget" name="job_target" value="${escapeHtml(values.job_target)}">
    </div>
    <div>
      <label for="profileLinks">Liens (portfolio, LinkedIn...)</label>
      <input id="profileLinks" name="links" value="${escapeHtml(values.links)}">
    </div>
    <div>
      <label for="profileMotivation">Motivation</label>
      <textarea id="profileMotivation" name="motivation">${escapeHtml(values.motivation)}</textarea>
    </div>
  `;
}

export function openCreateUserForm({ onSuccess } = {}) {
  openFormModal({
    title: "Nouvel utilisateur",
    submitLabel: "Créer",
    render(body) {
      renderUserFields(body, {});
    },
    async onSubmit(formData) {
      const values = formDataToObject(formData);
      if (!values.email || !values.password || !values.first_name || !values.last_name || !values.city) {
        notify("Veuillez renseigner les champs obligatoires", false);
        return false;
      }
      try {
        const signupPayload = {
          email: values.email,
          password: values.password,
          role: values.role || "user",
        };
        const newUser = await api("/auth/signup", { method: "POST", body: signupPayload });
        const createdProfile = await api("/api/profiles", {
          method: "POST",
          body: {
            user_id: newUser.id,
            first_name: values.first_name,
            last_name: values.last_name,
            city: values.city,
            phone: values.phone || null,
            skills: values.skills || null,
            job_target: values.job_target || null,
            motivation: values.motivation || null,
            links: values.links || null,
          },
        });
        await api(`/api/profiles/${createdProfile.id}`, {
          method: "PUT",
          body: {
            first_name: values.first_name,
            last_name: values.last_name,
            city: values.city,
            phone: values.phone || null,
            skills: values.skills || null,
            job_target: values.job_target || null,
            motivation: values.motivation || null,
            links: values.links || null,
          },
        });
        notify("Compte créé ✅");
        await onSuccess?.();
        return true;
      } catch (err) {
        notify(err?.detail || "Création impossible", false);
        return false;
      }
    },
  });
}

export async function openEditUserForm({ profileId, userId, onSuccess } = {}) {
  try {
    const profile = await api(`/api/profiles/${profileId}`);
    openFormModal({
      title: "Éditer l'utilisateur",
      submitLabel: "Enregistrer",
      render(body) {
        renderUserFields(body, profile);
      },
      async onSubmit(formData) {
        const values = formDataToObject(formData);
        const userUpdate = {};
        if (values.email && values.email !== profile.email) {
          userUpdate.email = values.email;
        }
        if (values.role && values.role !== profile.role) {
          userUpdate.role = values.role;
        }
        if (values.password) {
          userUpdate.password = values.password;
        }

        const profileUpdate = {
          first_name: values.first_name || "",
          last_name: values.last_name || "",
          city: values.city || "",
          phone: values.phone || null,
          skills: values.skills || null,
          job_target: values.job_target || null,
          motivation: values.motivation || null,
          links: values.links || null,
        };

        if (!profileUpdate.first_name || !profileUpdate.last_name || !profileUpdate.city) {
          notify("Prénom, nom et ville sont requis", false);
          return false;
        }

        try {
          if (Object.keys(userUpdate).length > 0) {
            await api(`/api/users/${userId}`, { method: "PATCH", body: userUpdate });
          }
          await api(`/api/profiles/${profileId}`, { method: "PUT", body: profileUpdate });
          notify("Compte mis à jour ✅");
          await onSuccess?.();
          return true;
        } catch (err) {
          notify(err?.detail || "Mise à jour impossible", false);
          return false;
        }
      },
    });
  } catch (err) {
    notify(err?.detail || "Impossible de charger l'utilisateur", false);
  }
}
