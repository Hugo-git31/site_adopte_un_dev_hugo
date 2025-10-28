const API = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";
const ROLE_KEY = "jb_role";

const state = {
  items: [],
  loading: false,
  error: null,
  hasFetched: false,
};

const widgets = new Set();

export function registerCompanyApplicationsWidget({
  containerSelector,
  counterSelector = null,
  emptyMessage = "Aucune candidature reçue pour le moment.",
  unauthorizedMessage = "Connecte-toi en tant qu’entreprise pour voir les candidatures.",
}) {
  const container = document.querySelector(containerSelector);
  if (!container) return () => {};

  const counter = counterSelector ? document.querySelector(counterSelector) : null;
  const widget = { container, counter, emptyMessage, unauthorizedMessage };
  widgets.add(widget);

  renderWidget(widget);

  if (!state.hasFetched) {
    fetchApplicants();
  }

  return () => widgets.delete(widget);
}

async function fetchApplicants() {
  state.loading = true;
  state.error = null;
  state.hasFetched = true;
  renderAll();

  try {
    const res = await fetch(`${API}/api/company/applications`, {
      headers: authHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      state.error = "Session expirée ou droits insuffisants.";
      state.loading = false;
      renderAll();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      state.error = data?.detail || `Erreur (HTTP ${res.status})`;
      state.loading = false;
      renderAll();
      return;
    }

    state.items = data.items || [];
  } catch (err) {
    state.error = err?.detail || "Impossible de charger les candidatures.";
  } finally {
    state.loading = false;
    renderAll();
  }
}

async function match(applicationId) {
  try {
    const res = await fetch(`${API}/api/company/applications/${applicationId}/match`, {
      method: "POST",
      headers: authHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || `Erreur (HTTP ${res.status})`);
    }

    const idx = state.items.findIndex((item) => item.id === applicationId);
    if (idx >= 0) {
      state.items[idx] = { ...state.items[idx], ...data };
    }
    renderAll("Match confirmé ✅");
  } catch (err) {
    renderAll(null, err.message || "Impossible de confirmer la candidature.");
  }
}

function renderAll(toastMessage = null, toastError = null) {
  widgets.forEach((widget) => renderWidget(widget, toastMessage, toastError));
}

function renderWidget(widget, toastMessage = null, toastError = null) {
  const { container, counter, emptyMessage, unauthorizedMessage } = widget;
  if (!container) return;

  if (toastMessage && typeof showToast === "function") showToast(toastMessage, true);
  if (toastError && typeof showToast === "function") showToast(toastError, false);

  if (!isAuthorized()) {
    container.innerHTML = `<div class="empty-state">${unauthorizedMessage}</div>`;
    if (counter) counter.textContent = "";
    return;
  }

  if (state.loading && !state.items.length) {
    container.innerHTML = `<div class="empty-state">Chargement des candidatures…</div>`;
    if (counter) counter.textContent = "";
    return;
  }

  if (state.error) {
    container.innerHTML = `<div class="empty-state" style="color:#b00020;">${escapeHtml(state.error)}</div>`;
    if (counter) counter.textContent = "";
    return;
  }

  if (!state.items.length) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    if (counter) counter.textContent = "";
    return;
  }

  if (counter) counter.textContent = `${state.items.length}`;

  container.innerHTML = state.items
    .map((item) => renderCard(item))
    .join("");

  container.querySelectorAll(".btn-match").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const id = Number(event.currentTarget.dataset.id);
      if (!Number.isFinite(id)) return;
      btn.disabled = true;
      match(id).finally(() => {
        btn.disabled = false;
      });
    });
  });

  container.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const id = Number(event.currentTarget.dataset.id);
      if (!Number.isFinite(id)) return;
      const candidate = state.items.find((item) => item.id === id);
      if (!candidate) return;
      openCandidateModal(candidate);
    });
  });
}

function renderCard(item) {
  const matched = item.status === "matched";
  const contactEmail = matched ? item.contact_email || "—" : "Masqué (match requis)";
  const contactPhone = matched ? item.contact_phone || "—" : "Masqué (match requis)";
  const avatar = item.avatar_url ? buildCvLink(item.avatar_url) : null;
  return `
    <article class="applicant-card" data-id="${item.id}">
      <div class="applicant-header">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          ${avatar ? `<img src="${avatar}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;flex:0 0 auto;"/>` : ""}
          <div style="min-width:0;">
            <h4 style="margin:0;">${escapeHtml(item.candidate_name || "Candidat inconnu")}</h4>
            <div class="applicant-meta">
              <span>${escapeHtml(item.job_title || "Offre #"+item.job_id)}</span>
              <span>Status : ${escapeHtml(item.status || "—")}</span>
            </div>
          </div>
        </div>
        <div class="applicant-actions">
          ${
            matched
              ? `<span class="badge badge-success">❤ Match</span>`
              : `<button class="btn-heart btn-match" data-id="${item.id}">♡ Matcher</button>`
          }
          <button class="btn-ghost btn-view" data-id="${item.id}">Voir le profil</button>
        </div>
      </div>
      <dl class="applicant-details">
        <div>
          <dt>Email</dt>
          <dd>${escapeHtml(contactEmail)}</dd>
        </div>
        <div>
          <dt>Téléphone</dt>
          <dd>${escapeHtml(contactPhone)}</dd>
        </div>
        <div>
          <dt>Reçu le</dt>
          <dd>${escapeHtml(formatDate(item.created_at))}</dd>
        </div>
      </dl>
    </article>
  `;
}

function authHeaders() {
  const tok = token();
  if (!tok) throw { detail: "Non connecté" };
  return { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
}

function isAuthorized() {
  const tok = token();
  const r = localStorage.getItem(ROLE_KEY);
  return Boolean(tok) && ["recruiter", "admin"].includes(r);
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

function buildCvLink(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${API}${normalized}`;
}

function openCandidateModal(candidate) {
  const modalId = "candidateModal";
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(15,23,42,.65)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.innerHTML = `
      <div class="candidate-modal-content" style="width:min(600px, 90%); background:#fff; border-radius:16px; box-shadow:0 30px 80px rgba(15,23,42,.25); padding:28px; font-family:system-ui;">
        <button type="button" data-close style="border:none;background:transparent;font-size:22px;position:absolute;top:16px;right:18px;color:#475569;cursor:pointer;">×</button>
        <div id="candidateModalBody"></div>
      </div>
    `;
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.hasAttribute("data-close")) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  const body = modal.querySelector("#candidateModalBody");
  if (body) {
    const matched = candidate.status === "matched";
    // Le CV doit être visible même sans match
    const cvLink = buildCvLink(candidate.cv_url);
    const avatar = candidate.avatar_url ? buildCvLink(candidate.avatar_url) : null;
    const skills = (candidate.skills || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const motivation = (candidate.motivation || "").trim();
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
        ${avatar ? `<img src="${avatar}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;"/>` : ""}
        <div>
          <h3 style="margin:0;color:#0A1F4F;font-size:22px;">${escapeHtml(candidate.candidate_name || "Candidat")}</h3>
          <div style="color:#64748b;font-size:14px;">${escapeHtml(candidate.job_title || "Offre #"+candidate.job_id)}</div>
        </div>
      </div>
      <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:0;">
        <div><dt style="font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Email</dt><dd style="margin:0;font-size:14px;color:#0A1F4F;">${escapeHtml(matched ? candidate.contact_email || "—" : "Masqué (match requis)")}</dd></div>
        <div><dt style="font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Téléphone</dt><dd style="margin:0;font-size:14px;color:#0A1F4F;">${escapeHtml(matched ? candidate.contact_phone || "—" : "Masqué (match requis)")}</dd></div>
        <div><dt style="font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Ville</dt><dd style="margin:0;font-size:14px;color:#0A1F4F;">${escapeHtml(candidate.city || "—")}</dd></div>
        <div><dt style="font-size:12px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Reçu le</dt><dd style="margin:0;font-size:14px;color:#0A1F4F;">${escapeHtml(formatDate(candidate.created_at))}</dd></div>
      </dl>
      <div style="margin-top:18px;">
        <strong>Profil ciblé :</strong> ${escapeHtml(candidate.job_target || "—")}
      </div>
      <div style="margin-top:12px;">
        <strong>Compétences :</strong> ${skills.length ? skills.map(escapeHtml).join(", ") : "—"}
      </div>
      ${motivation ? `<div style="margin-top:12px;"><strong>Motivation :</strong><br>${escapeHtml(motivation)}</div>` : ""}
      ${cvLink ? `<div style="margin-top:18px;"><a href="${cvLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:#f2f6ff;border:1px solid #d7e3ff;color:#1f3a93;font-weight:600;text-decoration:none;">Consulter le CV</a></div>` : ""}
    `;
  }

  modal.style.display = "flex";
}
