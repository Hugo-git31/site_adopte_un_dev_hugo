import { api, notify, escapeHtml } from "../core.js";
import { openFormModal } from "../ui/modal.js";

const STATUS_OPTIONS = [
  { value: "new", label: "Nouveau" },
  { value: "in_review", label: "En revue" },
  { value: "contacted", label: "Contacté" },
  { value: "accepted", label: "Acceptée" },
  { value: "rejected", label: "Refusée" },
  { value: "archived", label: "Archivée" },
];

function renderReadOnlyGroup(label, content) {
  return `
    <div class="admin-modal__group">
      <label>${label}</label>
      <div class="admin-readonly">${content}</div>
    </div>
  `;
}

export async function openApplicationModal({ applicationId, onSuccess } = {}) {
  try {
    const application = await api(`/api/applications/${applicationId}`);
    const currentStatus = application.status || "";
    const hasKnownStatus = STATUS_OPTIONS.some((opt) => opt.value === currentStatus);

    openFormModal({
      title: "Détail candidature",
      submitLabel: "Mettre à jour",
      size: "wide",
      render(body) {
        const statusOptions = [
          !hasKnownStatus && currentStatus
            ? `<option value="${escapeHtml(currentStatus)}" selected>${escapeHtml(
                currentStatus
              )}</option>`
            : "",
          STATUS_OPTIONS.map((opt) => {
            const selected = currentStatus === opt.value ? "selected" : "";
            return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
          }).join(""),
        ].join("");

        body.innerHTML = `
          ${renderReadOnlyGroup(
            "Offre",
            `<strong>${escapeHtml(application.job_title || "-")}</strong><br><span>${escapeHtml(
              application.company_name || "-"
            )}</span>`
          )}
          ${renderReadOnlyGroup(
            "Candidat",
            escapeHtml(application.candidate_name || "-")
          )}
          ${renderReadOnlyGroup(
            "Email",
            application.candidate_email
              ? `<a href="mailto:${escapeHtml(application.candidate_email)}">${escapeHtml(
                  application.candidate_email
                )}</a>`
              : "-"
          )}
          ${renderReadOnlyGroup(
            "Téléphone",
            escapeHtml(application.candidate_phone || "-")
          )}
          <div class="admin-modal__group">
            <label for="applicationStatus">Statut</label>
            <select id="applicationStatus" name="status">
              <option value="">-- Choisir un statut --</option>
              ${statusOptions}
            </select>
          </div>
          ${application.cv_url ? renderReadOnlyGroup(
            "CV",
            `<a href="${escapeHtml(application.cv_url)}" target="_blank" rel="noopener">Télécharger</a>`
          ) : ""}
          <div class="admin-modal__group">
            <label>Message du candidat</label>
            <textarea readonly>${escapeHtml(application.message || "")}</textarea>
          </div>
        `;
      },
      async onSubmit(formData) {
        const status = formData.get("status")?.toString().trim();
        try {
          await api(`/api/applications/${applicationId}`, {
            method: "PATCH",
            body: status ? { status } : {},
          });
          notify("Candidature mise à jour ✅");
          await onSuccess?.();
          return true;
        } catch (err) {
          notify(err?.detail || "Mise à jour impossible", false);
          return false;
        }
      },
    });
  } catch (err) {
    notify(err?.detail || "Impossible de charger la candidature", false);
  }
}
