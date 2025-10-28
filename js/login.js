// login.js — Auth (candidat/entreprise) + avatar header + menu switch + garde recrut.
// -----------------------------------------------------------------------------
const API = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";
const AVATAR_KEY = "jb_avatar";
const ROLE_KEY = "jb_role";

const $ = (sel, root = document) => root.querySelector(sel);
const token = () => localStorage.getItem(TOKEN_KEY);
const setToken = (value) => localStorage.setItem(TOKEN_KEY, value);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const COMPANY_PROFILE_PAGE = "company_profile.html";
const CANDIDATE_PROFILE_PAGE = "profile.html";
const ADMIN_PAGE = "admin.html";

// -----------------------------------------------------------------------------
// Détermination dynamique du mode (company/candidate) — via ?mode=..., JB_MODE, nom page
// -----------------------------------------------------------------------------
const path = (window.location.pathname + window.location.search || "").toLowerCase();

function getBaseMode() {
  const qs = new URLSearchParams(window.location.search);
  const urlMode = (qs.get("mode") || "").toLowerCase();
  if (urlMode === "company") return "company";
  if (urlMode === "candidate") return "candidate";
  if (window.JB_MODE === "company") return "company";
  const p = path;
  if (p.includes("index_entreprises") || p.includes("company_profile")) return "company";
  return "candidate";
}

let userRole = localStorage.getItem(ROLE_KEY) || null;
const isRecruiter = () => userRole === "recruiter";
const isAdmin = () => userRole === "admin";
const canRecruit = () => isRecruiter() || isAdmin();

function applyRole(role) {
  userRole = role || null;
  if (userRole) localStorage.setItem(ROLE_KEY, userRole);
  else localStorage.removeItem(ROLE_KEY);
}

function currentMode() {
  if (canRecruit()) return "company"; // un recruteur/admin reste côté entreprise
  return getBaseMode();
}

function getProfilePage() {
  if (isAdmin()) return ADMIN_PAGE;
  if (isRecruiter()) return COMPANY_PROFILE_PAGE;
  return CANDIDATE_PROFILE_PAGE;
}

function getSwitchTarget(modeNow) {
  const now = modeNow || currentMode();
  return now === "company" ? "index.html?mode=candidate" : "index_entreprises.html?mode=company";
}

// -----------------------------------------------------------------------------
// UI header
// -----------------------------------------------------------------------------
function rememberLoginBtn() {
  const btn = document.getElementById("loginBtn");
  if (btn && !btn.dataset.originalSrc) btn.dataset.originalSrc = btn.getAttribute("src") || "";
}

function setLoggedUI(isLogged) {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;
  const mode = isLogged ? currentMode() : getBaseMode();
  btn.style.cursor = "pointer";
  btn.title = isLogged
    ? (isAdmin() ? "Connecté — panel administrateur" : "Connecté — cliquer pour gérer votre compte")
    : `Se connecter (${mode === "company" ? "entreprise" : "candidat"})`;
  btn.style.boxShadow = isLogged ? "0 0 0 3px rgba(61,169,252,.4)" : "none";
}

function setHeaderAvatar(relUrl) {
  if (!relUrl) return;
  const btn = document.getElementById("loginBtn");
  if (!btn) return;
  btn.src = `${API}${relUrl}`;
  btn.classList.add("is-avatar");
  btn.style.boxShadow = "0 0 0 3px rgba(61,169,252,.5)";
}
function resetHeaderAvatar() {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;
  const original = btn.dataset.originalSrc || btn.getAttribute("src");
  if (original) btn.src = original;
  btn.classList.remove("is-avatar");
  btn.style.boxShadow = "none";
}

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function toRelativeUpload(url) {
  if (!url) return "";
  try { if (url.startsWith("http")) return new URL(url).pathname; } catch {}
  return url;
}
function showToast(message, ok = true) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = `
    position:fixed; bottom:16px; left:50%; transform:translateX(-50%);
    background:${ok ? "#0bb07b" : "#b00020"}; color:#fff; padding:10px 14px;
    border-radius:10px; font-family:system-ui; z-index:99999; box-shadow:0 6px 20px rgba(0,0,0,.2);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

async function api(path, { method = "GET", body = null, auth = false, isJSON = true } = {}) {
  const headers = {};
  if (isJSON) headers["Content-Type"] = "application/json";
  if (auth && token()) headers["Authorization"] = `Bearer ${token()}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body && isJSON ? JSON.stringify(body) : body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

async function hydrateCurrentUserRole(force = false) {
  if (!token()) return null;
  if (userRole && !force) return userRole;
  try {
    const me = await api("/auth/me", { auth: true });
    applyRole(me?.role || null);
  } catch { applyRole(null); }
  return userRole;
}

// -----------------------------------------------------------------------------
// Modale d'auth (recalcul du mode à l'ouverture)
// -----------------------------------------------------------------------------
function buildModal() {
  if ($("#authModal")) return $("#authModal");

  const modalMode = currentMode();          // recalcul dynamique
  const isCompanyMode = modalMode === "company";
  const wrap = document.createElement("div");
  const switchLabel = isCompanyMode ? "Je suis un candidat" : "Je suis une entreprise";
  const switchTarget = getSwitchTarget();

  wrap.id = "authModal";
  wrap.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,.5);
                display:flex; align-items:center; justify-content:center; z-index:9999;">
      <div style="width:360px; background:#fff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.2);
                  padding:18px; font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0A1F4F;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:18px;">Connexion / Inscription${isCompanyMode ? " — Entreprises" : ""}</h3>
          <button id="authClose" style="border:none;background:transparent;font-size:20px;cursor:pointer;">×</button>
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; margin:6px 0 8px;">
          <button id="modeSwitch" style="border:none; background:transparent; color:#0b6bff; cursor:pointer; font-size:13px; text-decoration:underline;">
            ${switchLabel}
          </button>
        </div>
        <label style="font-size:13px;">Email</label>
        <input id="authEmail" type="email" placeholder="email@exemple.com"
               style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 10px;" />
        <label style="font-size:13px;">Mot de passe</label>
        <input id="authPass" type="password" placeholder="••••••••"
               style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin:6px 0 14px;" />
        <div style="border-top:1px solid #eee; margin:10px 0 12px;"></div>
        ${
          isCompanyMode
          ? `
            <div style="font-size:13px; margin-bottom:8px;">Infos entreprise (obligatoires à la création)</div>
            <label style="font-size:13px;">Nom de l’entreprise *</label>
            <input id="coName" placeholder="Ma Société"
                   style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:6px;" />
            <label style="font-size:13px;">Site web (optionnel)</label>
            <input id="coWeb" placeholder="https://..."
                   style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:6px;" />
          `
          : `
            <div style="font-size:13px; margin-bottom:8px;">Infos profil (obligatoires à la création)</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div>
                <label style="font-size:13px;">Prénom *</label>
                <input id="suFirst" placeholder="Alice"
                       style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:6px;" />
              </div>
              <div>
                <label style="font-size:13px;">Nom *</label>
                <input id="suLast" placeholder="Durand"
                       style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:6px;" />
              </div>
            </div>
            <div style="margin-top:8px;">
              <label style="font-size:13px;">Ville *</label>
              <input id="suCity" placeholder="Toulouse"
                     style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:6px;" />
            </div>
          `
        }
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button id="authLogin" style="background:#3DA9FC;color:#fff;border:none;padding:10px 12px;border-radius:8px;cursor:pointer;flex:1;">Se connecter</button>
          <button id="authSignup" style="background:#111;color:#fff;border:none;padding:10px 12px;border-radius:8px;cursor:pointer;flex:1;">Créer un compte</button>
        </div>
        <div id="authMsg" style="min-height:18px;font-size:13px;margin-top:8px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  $("#authClose").onclick = () => wrap.remove();
  $("#authLogin").onclick = onLogin;
  $("#authSignup").onclick = onSignup;
  $("#modeSwitch").onclick = () => { wrap.remove(); window.location.href = switchTarget; };

  return wrap;
}

// -----------------------------------------------------------------------------
// Actions login / signup
// -----------------------------------------------------------------------------
async function onLogin() {
  const email = $("#authEmail")?.value.trim();
  const password = $("#authPass")?.value || "";
  if (!email || !password) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = "Merci de saisir email et mot de passe.";
    return;
  }
  $("#authMsg").style.color = "#0A1F4F";
  $("#authMsg").textContent = "Connexion…";
  try {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(data.access_token);
    await hydrateCurrentUserRole(true);
    $("#authMsg").style.color = "#0bb07b";
    $("#authMsg").textContent = "Connecté ✅";
    $("#authModal")?.remove();
    setLoggedUI(true);
    if (!canRecruit()) await loadMyAvatar();
    showToast("Connecté");
    if (isAdmin()) {
      window.location.href = ADMIN_PAGE;
    } else if (canRecruit()) {
      window.location.href = "index_entreprises.html?mode=company";
    } else {
      window.location.reload();
    }
  } catch (err) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = err?.detail || "Erreur de connexion";
  }
}

async function onSignup() {
  const email = $("#authEmail")?.value.trim();
  const password = $("#authPass")?.value || "";
  const first_name = $("#suFirst")?.value?.trim();
  const last_name = $("#suLast")?.value?.trim();
  const city = $("#suCity")?.value?.trim();
  const coName = $("#coName")?.value?.trim();
  const coWeb = $("#coWeb")?.value?.trim();
  const isCompanyMode = currentMode() === "company";

  if (!email || !password) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = "Email et mot de passe sont obligatoires.";
    return;
  }
  if (!isCompanyMode && (!first_name || !last_name || !city)) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = "Merci de renseigner prénom, nom et ville.";
    return;
  }
  if (isCompanyMode && !coName) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = "Le nom de l’entreprise est obligatoire.";
    return;
  }

  $("#authMsg").style.color = "#0A1F4F";
  $("#authMsg").textContent = "Création du compte…";

  try {
    const payload = { email, password, role: isCompanyMode ? "recruiter" : "user" };
    await api("/auth/signup", { method: "POST", body: payload });
    const login = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(login.access_token);
    applyRole(isCompanyMode ? "recruiter" : "user");
    setLoggedUI(true);

    if (isCompanyMode) {
      await api("/api/companies", { method: "POST", auth: true, body: { name: coName, website: coWeb || null, banner_url: null } });
    } else {
      await api("/api/profiles", { method: "POST", auth: true, body: { first_name, last_name, city } });
      await loadMyAvatar();
    }

    $("#authMsg").style.color = "#0bb07b";
    $("#authMsg").textContent = "Compte créé ✅";
    window.location.href = getProfilePage();
  } catch (err) {
    $("#authMsg").style.color = "#b00020";
    $("#authMsg").textContent = err?.detail || "Erreur lors de la création du compte";
  }
}

// -----------------------------------------------------------------------------
// Avatar (candidat)
// -----------------------------------------------------------------------------
async function loadMyAvatar() {
  if (!token() || canRecruit()) return;
  try {
    const cached = localStorage.getItem(AVATAR_KEY);
    if (cached) setHeaderAvatar(cached);

    const me = await api("/auth/me", { auth: true });
    let page = 1, pageSize = 100, mine = null;
    while (!mine) {
      const list = await api(`/api/profiles?page=${page}&page_size=${pageSize}`, { auth: true });
      mine = (list.items || []).find((p) => p.user_id === me.id);
      if (mine || page * pageSize >= (list.total || 0)) break;
      page += 1;
    }
    const rel = toRelativeUpload(mine?.avatar_url || "");
    if (rel) { localStorage.setItem(AVATAR_KEY, rel); setHeaderAvatar(rel); }
  } catch {}
}

// -----------------------------------------------------------------------------
// Menu du bouton login — empêche l'accès entreprise aux non-recruteurs
// -----------------------------------------------------------------------------
function attachMenu() {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!token()) { buildModal(); return; }
    if ($("#authMenu")) return;

    const menu = document.createElement("div");
    menu.id = "authMenu";
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position:fixed; top:70px; right:20px; background:#fff; border:1px solid #eee; border-radius:10px;
      box-shadow:0 10px 30px rgba(0,0,0,.15); padding:8px; z-index:9999; min-width:240px;
      font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0A1F4F;
    `;

    const createButton = ({ id, label, variant = "secondary", onClick, disabled = false, isLast = false }) => {
      const btnEl = document.createElement("button");
      btnEl.id = id;
      const baseStyle = [
        "width:100%",
        "padding:10px",
        "border-radius:8px",
        "cursor:pointer",
        isLast ? "margin-bottom:0" : "margin-bottom:8px",
      ];
      if (variant === "primary") baseStyle.push("background:#3DA9FC", "color:#fff", "border:none");
      else if (variant === "dark") baseStyle.push("background:#111", "color:#fff", "border:none");
      else baseStyle.push("background:#f5f7fb", "color:#0A1F4F", "border:1px solid #e6e9f2");
      btnEl.style.cssText = baseStyle.join(";");
      btnEl.textContent = label;
      btnEl.disabled = disabled;
      if (disabled) btnEl.style.opacity = "0.4";
      btnEl.addEventListener("click", () => {
        if (disabled) return;
        menu.remove();
        onClick?.();
      });
      wrapper.appendChild(btnEl);
      return btnEl;
    };

    const addLogoutButton = () =>
      createButton({
        id: "logoutBtn",
        label: "Se déconnecter",
        variant: "dark",
        isLast: true,
        onClick: () => {
          clearToken();
          localStorage.removeItem(AVATAR_KEY);
          applyRole(null);
          setLoggedUI(false);
          resetHeaderAvatar();
          showToast("Déconnecté", true);
        },
      });

    if (isAdmin()) {
      const onAdminPage = window.location.pathname.toLowerCase().includes("admin.html");
      if (!onAdminPage) {
        createButton({
          id: "btnAdminPanel",
          label: "Administration",
          variant: "primary",
          onClick: () => { window.location.href = ADMIN_PAGE; },
        });
      }
      addLogoutButton();
    } else if (canRecruit()) {
      createButton({
        id: "btnHomeCompany",
        label: "Accueil entreprises",
        variant: "primary",
        onClick: () => { window.location.href = "index_entreprises.html?mode=company"; },
      });
      createButton({
        id: "btnProfileCompany",
        label: "Gérer mon entreprise",
        onClick: () => { window.location.href = COMPANY_PROFILE_PAGE; },
      });
      addLogoutButton();
    } else {
      createButton({
        id: "btnHomeCandidate",
        label: "Accueil candidats",
        variant: "primary",
        onClick: () => { window.location.href = "index.html?mode=candidate"; },
      });
      createButton({
        id: "btnProfileCandidate",
        label: "Mon profil candidat",
        onClick: () => { window.location.href = CANDIDATE_PROFILE_PAGE; },
      });
      addLogoutButton();
    }

    menu.appendChild(wrapper);
    document.body.appendChild(menu);

    const onClose = (event) => {
      if (!menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener("click", onClose);
      }
    };
    setTimeout(() => document.addEventListener("click", onClose), 0);
  });
}

// -----------------------------------------------------------------------------
// Boot — ouvre la modale en mode entreprise si ask=recruiter et non-recruteur
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  rememberLoginBtn();
  attachMenu();

  const logged = !!token();
  if (logged) {
    await hydrateCurrentUserRole();
    setLoggedUI(true);
    if (!canRecruit()) await loadMyAvatar();
  } else {
    setLoggedUI(false);
  }

  // Auto-modale si on a été redirigé pour créer un compte recruteur
  const qs = new URLSearchParams(window.location.search);
  if (qs.get("ask") === "recruiter" && (!canRecruit())) {
    // On force l’ouverture de la modale en mode entreprise (déterminé par ?mode=company)
    buildModal();
  }
});
