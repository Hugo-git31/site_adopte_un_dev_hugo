// profile.js — page Mon profil (candidat)
const API = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";
const AVATAR_KEY = "jb_avatar";

const token = () => localStorage.getItem(TOKEN_KEY);
const authHeader = () => (token() ? { Authorization: `Bearer ${token()}` } : {});
const $ = (id) => document.getElementById(id);

function setMsg(text, ok = false) {
  const el = $("msg"); if (!el) return;
  el.textContent = text || "";
  el.className = ok ? "ok" : text ? "err" : "";
}
function setGuard(text) { const el = $("guard"); if (el) el.textContent = text || ""; }

function toRelativeUpload(u) {
  if (!u) return "";
  try { if (u.startsWith("http")) return new URL(u).pathname; } catch {}
  return u;
}
function updateHeaderAvatar(relUrl) {
  const el = document.getElementById("loginBtn");
  if (!el || !relUrl) return;
  el.src = `${API}${relUrl}`;
  el.classList.add("is-avatar");
  el.style.boxShadow = "0 0 0 3px rgba(61,169,252,.5)";
}

async function api(path, { method = "GET", body = null, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

function needsMandatory(p) {
  return !p?.first_name || !p?.last_name || !p?.city || !p?.contact_email || !p?.cv_url;
}
function fill(p) {
  $("first_name").value = p.first_name || "";
  $("last_name").value = p.last_name || "";
  $("city").value = p.city || "";
  $("contact_email").value = p.contact_email || me?.email || "";
  $("cv_url").value = p.cv_url || "";
  $("skills").value = p.skills || "";
  $("job_target").value = p.job_target || "";
  $("motivation").value = p.motivation || "";

  const rel = toRelativeUpload(p.avatar_url || "");
  $("avatarUrl").textContent = rel;
  $("avatar").src = rel ? `${API}${rel}` : "";

  if (rel) {
    localStorage.setItem(AVATAR_KEY, rel);
    updateHeaderAvatar(rel);
  }
  setGuard(
    needsMandatory(p)
      ? "⚠️ Merci de compléter prénom, nom, ville, email de contact et lien CV pour pouvoir postuler."
      : ""
  );
}

let profileId = null;
let me = null;

async function getMe() { me = await api("/auth/me", { headers: authHeader() }); return me; }

async function findMyProfileId() {
  let page = 1;
  const pageSize = 100;
  while (true) {
    const list = await api(`/api/profiles?page=${page}&page_size=${pageSize}`, { headers: authHeader() });
    for (const p of list.items || []) if (p.user_id === me.id) return p.id;
    if (page * pageSize >= (list.total || 0)) break;
    page++;
  }
  return null;
}

async function loadProfile() {
  if (!token()) { setGuard("Tu n’es pas connecté. Retourne à l’accueil pour te connecter."); return; }
  setGuard("Chargement du profil…");
  const meData = await getMe();

  profileId = await findMyProfileId();
  if (!profileId) {
    const email = meData?.email || "user@example.com";
    const guess = email.split("@")[0] || "User";
    const defaults = {
      first_name: guess,
      last_name: "Profile",
      city: "—",
      skills: "",
      contact_email: meData?.email || "",
      cv_url: "",
    };
    const created = await api("/api/profiles", { method: "POST", headers: authHeader(), body: defaults });
    profileId = created.id;
    fill(created);
    return;
  }

  const list = await api(`/api/profiles?page=1&page_size=1000`, { headers: authHeader() });
  const mine = (list.items || []).find((p) => p.id === profileId);
  if (mine) fill(mine);
}

async function saveProfile() {
  setMsg("");
  if (!profileId) return;

  const payload = {
    first_name: $("first_name").value,
    last_name: $("last_name").value,
    city: $("city").value,
    contact_email: $("contact_email").value.trim(),
    cv_url: $("cv_url").value.trim(),
    skills: $("skills").value,
    job_target: $("job_target").value,
    motivation: $("motivation").value,
    avatar_url: $("avatarUrl").textContent || null,
  };

  if (!payload.contact_email || !payload.cv_url) {
    setMsg("Merci de renseigner email de contact et lien vers ton CV.", false);
    return;
  }

  try {
    const updated = await api(`/api/profiles/${profileId}`, { method: "PUT", headers: authHeader(), body: payload });
    fill(updated);
    setMsg("Profil mis à jour ✅", true);
    setTimeout(() => {window.location.href = "index.html";}, 1200);
  } catch (e) {
    setMsg(e?.detail || "Erreur lors de l’enregistrement");
  }
}

async function uploadAvatar() {
  const f = $("file").files[0];
  if (!f) return alert("Choisis une image.");
  const fd = new FormData();
  fd.append("file", f);
  const btn = $("btnUpload");
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/upload/image`, { method: "POST", headers: { ...authHeader() }, body: fd });
    let data = {}; try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.detail || `Upload échoué (HTTP ${res.status}).` + (res.status === 413 ? " Image trop lourde." : "");
      throw new Error(msg);
    }
    const rel = toRelativeUpload(data.url);
    $("avatarUrl").textContent = rel;
    $("avatar").src = `${API}${rel}`;

    const updated = await api(`/api/profiles/${profileId}`, { method: "PUT", headers: authHeader(), body: { avatar_url: rel } });
    localStorage.setItem(AVATAR_KEY, rel);
    fill(updated);
    setMsg("Avatar téléversé et enregistré ✅", true);
  } catch (e) {
    setMsg(e.message || "Upload échoué");
  } finally {
    btn.disabled = false;
    $("file").value = "";
  }
}

async function deleteProfile() {
  if (!profileId) {
    setMsg("Aucun profil à supprimer.", false); return;
  }
  if (!confirm("Voulez-vous VRAIMENT supprimer votre profil ? Cette action est irréversible.")) return;
  try {
    await api(`/api/profiles/${profileId}`, {method: "DELETE", headers: authHeader()});
    await api(`/auth/me`, {method: "DELETE", headers: authHeader()});
    ["jb_token", "jb_avatar", "jb_role"].forEach(localStorage.removeItem.bind(localStorage));
    profileId = null;
    ["first_name", "last_name", "city", "contact_email", "cv_url", "skills", "job_target", "motivation"].forEach(id => $(id).value = "");
    $("avatar").src = "";
    $("avatarUrl").textContent = "";
    setGuard("Profil supprimé.");
    setMsg("Compte supprimé avec succès ✅", true);
    setGuard("Tu as été déconnecté.");
    setTimeout(() => {window.location.href = "index.html";}, 1000);
  } catch (e) {
    setMsg(e?.detail || "Suppression impossible.", false);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("btnSave").onclick = saveProfile;
  $("btnUpload").onclick = uploadAvatar;
  $("btnBack").onclick = () => history.back();
  $("btnDelete").onclick = deleteProfile;

  if (!token()) { setGuard("Non connecté — retourne à l’accueil et clique sur l’icône pour te connecter."); return; }
  try { await loadProfile(); } catch (e) { setMsg(e?.detail || "Impossible de charger le profil"); }
});
