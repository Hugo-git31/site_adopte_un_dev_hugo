import {
  initJobApply,
  subscribeJobApply,
  applyToJob as requestJobApply,
  setCurrentJob as setApplyCurrentJob,
  clearCurrentJob as clearApplyCurrentJob,
} from "./jobs_apply.js";

const API_BASE = "http://127.0.0.1:8000";
const grid = document.querySelector(".offres");
const companiesGrid = document.querySelector(".entreprises");
const pagination = document.querySelector(".jobs-pagination");
const PAGE_SIZE = 9;

const popupEl = document.getElementById("popup");
const pTitle = document.getElementById("popupTitle");
const pCompany = document.getElementById("popupCompany");
const pTags = document.getElementById("popupTags");
const pShort = document.getElementById("popupShort");
const pFull = document.getElementById("popupFull");
const pBanner = document.getElementById("popupBanner");
const pApply = document.getElementById("popupApply");

let currentPage = 1;
let totalPages = 1;
let currentQuery = "";

let applyState = {
  appliedIds: new Set(),
  processingId: null,
  currentJobId: null,
  isLoggedIn: false,
  isCandidate: false,
  isRecruiterOrAdmin: false,
};

initJobApply({ apiBase: API_BASE });
subscribeJobApply((snapshot) => {
  applyState = snapshot;
  refreshHearts();
  updateApplyButtonState();
});

function esc(s = "") {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
}

function normalizeBanner(url) {
    if (!url) return "../assets/company_logo_default.png";
    const raw = String(url).trim();
    if (!raw) return "../assets/company_logo_default.png";
    if (/^https?:\/\//i.test(raw)) return raw;
    const prefix = raw.startsWith("/") ? "" : "/";
    return `${API_BASE}${prefix}${raw}`;
}

function jobToCard(j) {
    const bannerUrl = esc(normalizeBanner(j.company_banner_url));
    const title = esc(j.title || "(sans titre)");
    const company = esc(j.company_name || "");
    const summary = esc(j.short_desc || "");
    return `
    <div class="carte" style="position:relative;">
        <div class="carte-image">
            <img src="${bannerUrl}" alt="Offre ${esc(j.id)}"> 
        </div>
        <div class="carte-contenu">
            <h3 title="${title}">${title}</h3>
            <p class="entreprise" title="${company}">${company}</p>
            <p class="description" title="${summary}">${summary}</p>
            <div class="tags">
                <span>${esc(j.contract_type || "—")}</span>
                <span>${esc(j.location || "—")}</span>
                <span>${esc(j.work_mode || "—")}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                <a class="learn-more" href="#popup" data-id="${j.id}">En savoir plus</a>
                <button
                    type="button"
                    class="apply-heart"
                    data-id="${esc(j.id)}"
                    title="Postuler"
                    aria-label="Postuler"
                    style="width:38px;height:38px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;color:#ef4444;cursor:pointer;box-shadow:0 6px 10px rgba(15,23,42,0.12);"
                >♡</button>
            </div>
        </div>
    </div>`; 
}

function renderPagination() {
    if (!pagination) return;
    if (totalPages <= 1) {
        pagination.innerHTML = "";
        pagination.style.display = "none";
        return;
    }
    pagination.style.display = "flex";
    pagination.innerHTML = `
        <button class="page-btn" data-action="prev" ${currentPage === 1 ? "disabled" : ""}>Précédent</button>
        <span class="page-info">Page ${currentPage} / ${totalPages}</span>
        <button class="page-btn" data-action="next" ${currentPage === totalPages ? "disabled" : ""}>Suivant</button>
    `;
}

async function loadJobs(page = 1, pageSize = PAGE_SIZE, q = "") {
    const qs = new URLSearchParams({page, page_size: pageSize, q});
    const res = await fetch(`${API_BASE}/api/jobs?${qs}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.items.length && page > 1 && !data.total) {
        totalPages = Math.max(1, page - 1);
        renderPagination();
        return loadJobs(page - 1, pageSize, q);
    }
    currentPage = page;
    currentQuery = q;
    totalPages = data.total ? Math.max(1, Math.ceil(data.total / pageSize)) : (data.items.length < pageSize ? page : page + 1);
    grid.innerHTML = data.items.map(jobToCard).join("") || "<p>Aucune offre</p>";
    refreshHearts();
    renderPagination();
}

if (pagination) {
    pagination.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-action]");
        if (!btn) return;

        if (btn.dataset.action === "prev" && currentPage > 1) {
            loadJobs(currentPage - 1, PAGE_SIZE, currentQuery).catch(handleLoadError);
        } else if (btn.dataset.action === "next" && currentPage < totalPages) {
            loadJobs(currentPage + 1, PAGE_SIZE, currentQuery).catch(handleLoadError);
        }
    });
}

function handleLoadError(err) {
    grid.innerHTML = `<p style="color:red">Erreur chargement: ${esc(err.message)}</p>`;
    if (pagination) pagination.innerHTML = "";
}

loadJobs().catch(handleLoadError);

// Pop-ups

function nl2p(text="") {
    const safe = esc(text);
    return safe.split(/\n+/).map(t => `<p>${t}</p>`).join("");
}

async function openJobPopup(jobId) {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        if(!res.ok) throw new Error(await res.text());
        const j = await res.json();

        pTitle.textContent = j.title || "";
        pCompany.textContent = j.company_name || "";
        pTags.innerHTML = [j.contract_type || "—", j.location || "—", j.work_mode || "—"].map(t => `<span>${esc(t)}</span>`).join("");
        pShort.textContent = j.short_desc || "";
        pFull.innerHTML = j.full_desc ? nl2p(j.full_desc) : "<p>(pas de description détaillée)</p>";

        if (j.company_banner_url) {
            pBanner.src = j.company_banner_url;
            pBanner.alt = j.company_name ? `Bannière ${j.company_name}` : "Bannière";
            pBanner.style.display = "";
        } else {
            pBanner.style.display = "none";
            pBanner.removeAttribute("src");
        }

        if (!popupEl) {
            console.warn("Popup introuvable, rien à afficher");
            return;
        }

        if (pApply) {
            setApplyCurrentJob(Number(j.id));
            pApply.href = "#";
        }

        if (
            popupEl.style.display === "none" ||
            (!popupEl.style.display && getComputedStyle(popupEl).display === "none")
        ) {
            popupEl.style.display = "flex";
        }

        location.hash = "popup";
    } catch (err) {
        console.error("Impossible de charger l'offre :", err);
    }
}

document.addEventListener("click", (e) => {
    const heart = e.target.closest(".apply-heart");
    if (heart) {
        const jobId = Number(heart.dataset.id);
        if (jobId) handleApply(jobId);
        return;
    }

    const a = e.target.closest(".learn-more");
    if (!a) return;

    const id = a.dataset.id;

    location.hash = "popup";

    const popupEl = document.getElementById("popup");
    if (popupEl && getComputedStyle(popupEl).display === "none") {
        popupEl.style.display = "flex";
    }
    openJobPopup(id);
});

window.addEventListener("hashchange", () => {
    if (location.hash !== "#popup" && popupEl) {
        if (popupEl.style.display === "block") popupEl.style.display = "";
        clearApplyCurrentJob();
    }
});

if (pApply) {
    pApply.addEventListener("click", onApplyClick);
}

function configureApplyButton(text, { disabled = false } = {}) {
    if (!pApply) return;
    pApply.textContent = text;
    pApply.style.opacity = disabled ? "0.6" : "";
    pApply.style.pointerEvents = disabled ? "none" : "auto";
    pApply.disabled = disabled;
    if (disabled) pApply.setAttribute("aria-disabled", "true");
    else pApply.removeAttribute("aria-disabled");
}

function updateApplyButtonState() {
    if (!pApply) return;
    const jobId = applyState.currentJobId;
    if (!jobId) {
        configureApplyButton("Postuler", { disabled: true });
        return;
    }
    if (applyState.processingId === jobId) {
        configureApplyButton("Envoi…", { disabled: true });
        return;
    }
    if (applyState.isRecruiterOrAdmin) {
        configureApplyButton("Réservé aux candidats", { disabled: true });
        return;
    }
    if (applyState.appliedIds.has(jobId)) {
        configureApplyButton("Déjà postulé", { disabled: true });
        return;
    }
    configureApplyButton("Postuler");
}

async function onApplyClick(event) {
    event.preventDefault();
    if (!applyState.currentJobId) return;
    handleApply(applyState.currentJobId);
}

async function handleApply(jobId) {
    const result = await requestJobApply(jobId);
    switch (result.status) {
        case "ok":
            showFeedback("Candidature envoyée ✅");
            break;
        case "duplicate":
            showFeedback(result.message || "Tu as déjà postulé à cette offre.", false);
            break;
        case "role":
            showFeedback(result.message || "Seuls les candidats peuvent postuler à une offre.", false);
            break;
        case "auth":
            if (typeof buildModal === "function") buildModal();
            else window.location.href = "profile.html";
            break;
        case "error":
            showFeedback(result.message || "Impossible de postuler pour le moment.", false);
            break;
        default:
            showFeedback("Impossible de postuler pour le moment.", false);
    }
}

function refreshHearts() {
    document.querySelectorAll(".apply-heart[data-id]").forEach((btn) => {
        const jobId = Number(btn.dataset.id);
        if (!Number.isFinite(jobId)) return;
        if (applyState.processingId === jobId) {
            btn.textContent = "…";
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.style.opacity = "0.6";
        } else if (applyState.appliedIds.has(jobId)) {
            btn.textContent = "❤";
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.style.opacity = "0.6";
        } else {
            btn.textContent = "♡";
            btn.disabled = false;
            btn.removeAttribute("aria-disabled");
            btn.style.opacity = "";
        }
    });
}

function showFeedback(message, ok = true) {
    const fn = typeof showToast === "function" ? showToast : null;
    if (fn) fn(message, ok);
    else window.alert(message);
}
