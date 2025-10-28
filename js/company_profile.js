// company_profile.js — espace recruteur (fiche société + upload bannière)
const API = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";
const token = () => localStorage.getItem(TOKEN_KEY);
const authHeader = () => (token() ? { Authorization: `Bearer ${token()}` } : {});
const $ = (id) => document.getElementById(id);
const jobEls = {
  list: $("jobsList"),
  form: $("jobForm"),
  btnNew: $("btnNewJob"),
  btnReset: $("btnResetJob"),
  btnSave: $("btnSaveJob"),
};
const JOB_TITLE_MAX = 80;
const JOB_SHORT_MAX = 240;

let currentCompany = null;
let jobsItems = [];
let editingJobId = null;
const escCache = document.createElement("div");

function refreshMeta() {
  const offersEl = $("metaOffers");
  if (offersEl) offersEl.textContent = jobsItems.length ?? 0;
  const websiteEl = $("metaWebsite");
  if (websiteEl) websiteEl.textContent = currentCompany ? (currentCompany.website ? "Oui" : "Non") : "—";
  const bannerEl = $("metaBanner");
  if (bannerEl) bannerEl.textContent = currentCompany ? (currentCompany.banner_url ? "Oui" : "Non") : "—";
}

function esc(value = "") {
  escCache.textContent = value ?? "";
  return escCache.innerHTML;
}

function toRelativeUpload(u) {
  if (!u) return "";
  try { const abs = new URL(u, API); return abs.pathname; } catch { return u; }
}
function fullUrl(u) { if (!u) return ""; if (/^https?:\/\//i.test(u)) return u; return `${API}${u}`; }

function setMsg(t, ok=false){ const m=$("msg"); if(!m) return; m.textContent=t||""; m.style.color=ok?"#0bb07b":"#b00020"; }
function setGuard(t){ const g=$("guard"); if(g) g.textContent=t||""; }
function setStatus(logged){
  const p=$("statusPill"); if(!p) return;
  p.textContent = logged ? "Connecté" : "Non connecté";
  p.style.background = logged ? "#e6fbf1" : "#fff1f1";
  p.style.color = logged ? "#127c52" : "#a73636";
  p.style.border = "1px solid " + (logged ? "#c7f4e1" : "#ffdada");
}

async function api(path, {method="GET", body=null, headers={}} = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : null
  });
  let data={}; try{ data=await res.json() }catch{}
  if(!res.ok) throw data;
  return data;
}

function previewBanner(url) {
  const img = $("bannerPreview");
  const empty = $("bannerEmpty");
  const rel = toRelativeUpload(url);
  if (rel) { img.src = fullUrl(rel); img.style.display = "block"; empty.style.display = "none"; }
  else { img.style.display = "none"; empty.style.display = "flex"; }
  if (currentCompany) currentCompany.banner_url = rel;
  refreshMeta();
}

function fill(c) {
  currentCompany = c;
  $("co_name").value = c.name || "";
  $("co_city").value = c.hq_city || "";
  $("co_sector").value = c.sector || "";
  $("co_desc").value = c.description || "";
  $("co_web").value = c.website || "";
  $("co_headcount").value = c.headcount || "";
  $("co_banner").value = c.banner_url || "";
  previewBanner(c.banner_url || "");
  $("btnSave").dataset.id = c.id;
  refreshMeta();
}

async function loadOrCreate() {
  if(!token()){ setGuard("Non connecté — connecte-toi d’abord."); setStatus(false); return; }
  setStatus(true);
  try {
    const company = await api("/api/my/company", { headers: authHeader() });
    if (company) { fill(company); await loadJobs(); setJobFormEnabled(true); resetJobForm(); setJobMsg("Renseigne le formulaire pour créer une nouvelle offre."); }
    else {
      currentCompany = null;
      jobsItems = [];
      renderJobsList("Crée d’abord l’entreprise pour gérer tes offres.");
      resetJobForm(false);
      setJobFormEnabled(false);
      setGuard("Aucune entreprise. Renseigne le nom et clique Enregistrer pour créer.");
      refreshMeta();
    }
  } catch(e) { setMsg(e?.detail || "Erreur au chargement", false); }
}

function readPayload() {
  return {
    name: $("co_name").value.trim(),
    hq_city: $("co_city").value.trim() || null,
    sector: $("co_sector").value.trim() || null,
    description: $("co_desc").value.trim() || null,
    website: $("co_web").value.trim() || null,
    headcount: $("co_headcount").value ? $("co_headcount").value.trim() : null,
    banner_url: $("co_banner").value.trim() || null,
  };
}

async function save() {
  const payload = readPayload();
  if (!payload.name) {
    setMsg("Le nom est requis.", false);
    return false;
  }

  try {
    const id = $("btnSave").dataset.id;
    if (id) {
      const updated = await api(`/api/companies/${id}`, { method:"PUT", headers:authHeader(), body:payload });
      fill(updated);
      setMsg("Entreprise mise à jour ✅", true);
      setTimeout(() => {window.location.href = "index_entreprises.html";}, 1200);
    } else {
      const created = await api("/api/companies", { method:"POST", headers:authHeader(), body: payload });
      $("btnSave").dataset.id = created.id;
      setMsg("Entreprise créée ✅ (tu peux compléter les autres champs)", true);
      await loadOrCreate();
    }
    return true;
  } catch(e){
    setMsg(e?.detail || "Erreur", false);
    return false;
  }
}

async function uploadBanner() {
  const f = $("file").files[0];
  if(!f) return alert("Choisis une image.");
  const fd = new FormData(); fd.append("file", f);
  try {
    const res = await fetch(`${API}/upload/image`, { method:"POST", headers:authHeader(), body:fd });
    const data = await res.json();
    if (!res.ok) throw data;

    const rel = toRelativeUpload(data.url || data.path || data.location || "");
    $("co_banner").value = rel;
    previewBanner(rel);
    setMsg("Bannière envoyée ✅", true);

    const id = $("btnSave").dataset.id;
    if (id && rel) {
      await api(`/api/companies/${id}`, { method: "PUT", headers: authHeader(), body: { banner_url: rel } });
      setMsg("Bannière enregistrée ✅", true);
    }
  } catch(e){ setMsg(e?.detail || "Upload échoué", false); }
}

async function deleteCompany() {
  const id = $("btnSave").dataset.id;
  if (!id) {setMsg("Aucune entreprise à supprimer.", false); return;}
  if (!confirm("Supprimer cette entreprise et ton compte recruteur ?")) return;
  try {
    await api(`/api/companies/${id}`, {method: "DELETE", headers: authHeader()});
    await api("/auth/me", {method: "DELETE", headers: authHeader()});
    ["jb_token", "jb_role", "jb_avatar"].forEach((key) => localStorage.removeItem(key));
    setMsg("Entreprise supprimé avec succès ✅", true);
    setTimeout(() => {window.location.href = "index.html";},1200);
  } catch (e) {
    setMsg(e?.detail || "Suppression impossible.", false);
  }
}

async function deleteAccount() {
  if (!confirm("Supprimer définitivement ton compte ? Cette action est irréversible.")) return;
  try {
    await api("/auth/me", {method: "DELETE", headers: authHeader()});
    ["jb_token", "jb_role", "jb_avatar"].forEach((key) => localStorage.removeItem(key));
    setMsg("Compte supprimé avec succès ✅", true);
    setTimeout(() => {window.location.href = "index.html";}, 1200);
  } catch (e) {
    setMsg(e?.detail || "Suppression du compte impossible.", false);
  }
}

function wireShortcuts() {
  const id = $("btnSave").dataset.id;
  const goJobs = document.getElementById("goJobs");
  const goList = document.getElementById("goList");
  if (goJobs) {
    goJobs.addEventListener("click", (event) => {
      event.preventDefault();
      if (!$("btnSave").dataset.id) return setMsg("Crée d’abord l’entreprise.", false);
      document.getElementById("jobsFormBlock")?.scrollIntoView({ behavior: "smooth" });
    });
  }
  if (goList) {
    goList.addEventListener("click", (event) => {
      event.preventDefault();
      if (!$("btnSave").dataset.id) return setMsg("Crée d’abord l’entreprise.", false);
      document.getElementById("jobsListBlock")?.scrollIntoView({ behavior: "smooth" });
    });
  }
}

function setJobFormEnabled(enabled) {
  if (jobEls.btnNew) {
    jobEls.btnNew.disabled = !enabled;
    jobEls.btnNew.textContent = "Nouvelle offre";
  }
  if (!jobEls.form) return;
  const controls = jobEls.form.querySelectorAll("input, textarea, button");
  controls.forEach((el) => { if (el.id !== "jobMsg") el.disabled = !enabled; });
  if (!enabled) {
    setJobMsg("Crée ton entreprise pour publier des offres.", false);
  } else {
    setJobMsg("");
  }
}

function setJobMsg(text, ok = null) {
  const el = $("jobMsg");
  if (!el) return;
  el.textContent = text || "";
  if (ok === true) el.style.color = "#0bb07b";
  else if (ok === false) el.style.color = "#b00020";
  else el.style.color = "#6b7a90";
}

function resetJobForm(focus = false) {
  editingJobId = null;
  $("jobId").value = "";
  ["jobTitle","jobShort","jobFull","jobLocation","jobContract","jobWorkMode","jobTags","jobSalaryMin","jobSalaryMax","jobCurrency","jobProfile"].forEach((id) => {
    const input = $(id);
    if (input) input.value = "";
  });
  setJobMsg("Renseigne le formulaire pour publier une nouvelle offre.");
  if (jobEls.btnSave) jobEls.btnSave.textContent = "Enregistrer";
  const title = $("jobFormTitle");
  if (title) title.textContent = "Nouvelle offre";
  if (jobEls.btnNew) jobEls.btnNew.textContent = "Nouvelle offre";
  if (focus) $("jobTitle")?.focus();
}

function updateJobCount(count) {
  const el = $("jobCount");
  if (!el) return;
  if (!count) {
    el.textContent = "";
    return;
  }
  el.textContent = `${count} offre${count > 1 ? "s" : ""}`;
}

function renderJobsList(emptyMessage) {
  if (!jobEls.list) return;
  if (emptyMessage) {
    jobEls.list.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    updateJobCount(0);
    return;
  }
  if (!jobsItems.length) {
    jobEls.list.innerHTML = `<div class="empty-state">Aucune offre pour le moment.</div>`;
    updateJobCount(0);
    return;
  }
  updateJobCount(jobsItems.length);
  jobEls.list.innerHTML = jobsItems.map((job) => `
    <div class="job-row" data-id="${job.id}">
      <div class="job-title">
        <span class="job-title-text" title="${esc(job.title || "(sans titre)")}">${esc(job.title || "(sans titre)")}</span>
        <span style="font-size:12px; color:#94a3b8;">#${job.id}</span>
      </div>
      <p class="job-short" title="${esc(job.short_desc || "")}">${esc(job.short_desc || "")}</p>
      <div class="job-meta">
        ${job.location ? `<span>📍 ${esc(job.location)}</span>` : ""}
        ${job.contract_type ? `<span>📄 ${esc(job.contract_type)}</span>` : ""}
        ${job.work_mode ? `<span>🏠 ${esc(job.work_mode)}</span>` : ""}
      </div>
      <div class="job-actions">
        <button class="btn btn-primary" data-action="edit" data-id="${job.id}">Modifier</button>
        <button class="btn btn-ghost" data-action="delete" data-id="${job.id}">Supprimer</button>
      </div>
    </div>
  `).join("");
}

function parseIntOrNull(value) {
  const v = value?.trim();
  if (!v) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function readJobPayload() {
  return {
    title: $("jobTitle").value.trim(),
    short_desc: $("jobShort").value.trim(),
    full_desc: $("jobFull").value.trim() || null,
    location: $("jobLocation").value.trim() || null,
    contract_type: $("jobContract").value.trim() || null,
    work_mode: $("jobWorkMode").value.trim() || null,
    tags: $("jobTags").value.trim() || null,
    salary_min: parseIntOrNull($("jobSalaryMin").value),
    salary_max: parseIntOrNull($("jobSalaryMax").value),
    currency: $("jobCurrency").value.trim() || null,
    profile_sought: $("jobProfile").value.trim() || null,
  };
}

async function loadJobs() {
  if (!currentCompany?.id) {
    renderJobsList("Crée d’abord l’entreprise pour gérer tes offres.");
    return;
  }
  renderJobsList("Chargement des offres…");
  try {
    const data = await JobsService.list({ token: token(), companyId: currentCompany.id, pageSize: 100, baseUrl: API });
    jobsItems = (data.items || []).map((j) => ({ ...j }));
    renderJobsList();
    refreshMeta();
  } catch (e) {
    renderJobsList(e?.detail || "Impossible de charger les offres.");
  }
}

async function loadJobDetail(id) {
  try {
    const detail = await JobsService.get({ id, token: token(), baseUrl: API });
    editingJobId = detail.id;
    $("jobId").value = detail.id;
    $("jobTitle").value = detail.title || "";
    $("jobShort").value = detail.short_desc || "";
    $("jobFull").value = detail.full_desc || "";
    $("jobLocation").value = detail.location || "";
    $("jobContract").value = detail.contract_type || "";
    $("jobWorkMode").value = detail.work_mode || "";
    $("jobTags").value = detail.tags || "";
    $("jobSalaryMin").value = detail.salary_min ?? "";
    $("jobSalaryMax").value = detail.salary_max ?? "";
    $("jobCurrency").value = detail.currency || "";
    $("jobProfile").value = detail.profile_sought || "";
    if (jobEls.btnSave) jobEls.btnSave.textContent = "Mettre à jour";
    if (jobEls.btnNew) jobEls.btnNew.textContent = "Créer une nouvelle offre";
    const title = $("jobFormTitle");
    if (title) title.textContent = "Modifier l’offre";
    setJobMsg(`Modification de l’offre « ${detail.title} »`, null);
  } catch (e) {
    setJobMsg(e?.detail || "Impossible de charger l’offre.", false);
  }
}

async function saveJob(event) {
  event.preventDefault();
  if (!currentCompany?.id) {
    setJobMsg("Crée d’abord ton entreprise.", false);
    return;
  }
  const payload = readJobPayload();
  if (!payload.title || !payload.short_desc) {
    setJobMsg("Titre et résumé sont requis.", false);
    return;
  }
  if (payload.title.length > JOB_TITLE_MAX) {
    setJobMsg(`Le titre est limité à ${JOB_TITLE_MAX} caractères (${payload.title.length} actuellement).`, false);
    return;
  }
  if (payload.short_desc.length > JOB_SHORT_MAX) {
    setJobMsg(`Le résumé est limité à ${JOB_SHORT_MAX} caractères (${payload.short_desc.length} actuellement).`, false);
    return;
  }
  setJobMsg("Enregistrement en cours…");
  try {
    if (editingJobId) {
      await JobsService.update({ id: editingJobId, payload, token: token(), baseUrl: API });
      await loadJobs();
      resetJobForm(false);
      setJobMsg("Offre mise à jour ✅", true);
    } else {
      await JobsService.create({ companyId: currentCompany.id, payload, token: token(), baseUrl: API });
      await loadJobs();
      resetJobForm(false);
      setJobMsg("Offre publiée ✅", true);
    }
  } catch (e) {
    setJobMsg(e?.detail || "Erreur lors de l’enregistrement", false);
  }
}

async function deleteJob(id) {
  if (!confirm("Supprimer cette offre ? Cette action est définitive.")) return;
  try {
    await JobsService.remove({ id, token: token(), baseUrl: API });
    setJobMsg("Offre supprimée ✅", true);
    await loadJobs();
  } catch (e) {
    setJobMsg(e?.detail || "Suppression impossible", false);
  }
}

async function saveAndLeave() {
  const succeeded = await save();
  if (succeeded) {
    window.location.href = "index_entreprises.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("btnSave").onclick = saveAndLeave;
  $("btnSaveTop").onclick = saveAndLeave;
  $("btnUpload").onclick = uploadBanner;
  $("btnDelete").onclick = deleteCompany;
  $("btnDeleteAccount").onclick = deleteAccount;
  const fileInput = $("file");
  const fileName = document.getElementById("uploadFileName");
  if (fileInput && fileName) {
    fileInput.addEventListener("change", () => {
      const f = fileInput.files?.[0];
      fileName.textContent = f ? f.name : "Aucun fichier choisi";
    });
  }
  $("co_banner").addEventListener("input", (e)=> previewBanner(e.target.value.trim()));
  if (jobEls.btnNew) jobEls.btnNew.onclick = () => { resetJobForm(true); };
  if (jobEls.btnReset) jobEls.btnReset.onclick = () => resetJobForm();
  if (jobEls.form) jobEls.form.addEventListener("submit", saveJob);
  if (jobEls.list) jobEls.list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit") loadJobDetail(id);
    if (btn.dataset.action === "delete") deleteJob(id);
  });
  await loadOrCreate();
  wireShortcuts();
});
