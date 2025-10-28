export const API = "http://127.0.0.1:8000";
export const TOKEN_KEY = "jb_token";
export const ROLE_KEY = "jb_role";

export const $ = (sel, root = document) => root.querySelector(sel);
export const token = () => localStorage.getItem(TOKEN_KEY);

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function redirectHome() {
  window.location.href = "index.html";
}

export function notify(message, ok = true) {
  if (typeof showToast === "function") {
    showToast(message, ok);
  } else {
    window.alert(message);
  }
}

export async function api(path, { method = "GET", body = null } = {}) {
  const headers = {};
  const tok = token();
  if (!tok) throw { detail: "Non authentifié" };
  headers.Authorization = `Bearer ${tok}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    redirectHome();
    throw { detail: "Non autorisé" };
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function ensureAdmin() {
  const tok = token();
  if (!tok) {
    redirectHome();
    return null;
  }
  try {
    const me = await api("/auth/me");
    if (me.role !== "admin") {
      notify("Accès administrateur requis.", false);
      redirectHome();
      return null;
    }
    return me;
  } catch (err) {
    console.error("ensureAdmin error", err);
    redirectHome();
    return null;
  }
}
