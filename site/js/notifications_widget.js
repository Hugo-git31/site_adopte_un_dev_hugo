const API = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";

let dropdown;
let backdrop;
let indicator;
let isOpen = false;
let cachedNotifications = [];
let lastFetched = 0;

export function initNotificationsWidget() {
  const icon = document.querySelector(".logo-3");
  if (!icon) return;

  if (!indicator) {
    const wrapper = document.createElement("span");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    icon.parentNode?.insertBefore(wrapper, icon);
    wrapper.appendChild(icon);

    indicator = document.createElement("span");
    indicator.className = "notif-indicator";
    wrapper.appendChild(indicator);
  }

  renderDropdown();

  if (hasToken()) {
    ensureNotifications(true);
  }

  icon.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!hasToken()) {
      if (typeof buildModal === "function") buildModal();
      return;
    }
    if (!isOpen) {
      await ensureNotifications();
      markAllRead(true);
      showDropdown();
    } else {
      hideDropdown();
    }
  });
}

async function ensureNotifications(force = false) {
  if (!force && Date.now() - lastFetched < 20_000 && cachedNotifications.length) return;
  try {
    const res = await fetch(`${API}/api/me/notifications`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    cachedNotifications = data.items || [];
    lastFetched = Date.now();
    updateIndicator();
    updateDropdownList();
  } catch (err) {
    console.warn("notifications fetch error", err);
  }
}

function renderDropdown() {
  if (dropdown) return;

  backdrop = document.createElement("div");
  backdrop.className = "notif-backdrop";
  backdrop.style.display = "none";
  backdrop.addEventListener("click", hideDropdown);
  document.body.appendChild(backdrop);

  dropdown = document.createElement("div");
  dropdown.className = "notif-dropdown";
  dropdown.innerHTML = `
    <div class="notif-header">
      <h4>Notifications</h4>
      <button type="button" class="notif-button" data-action="refresh">Rafraîchir</button>
    </div>
    <div class="notif-items" id="notifItems"></div>
    <div class="notif-actions">
      <button type="button" class="notif-button" data-action="mark-all">Tout marquer lu</button>
      <button type="button" class="notif-button" data-action="fermer">Fermer</button>
    </div>
  `;
  document.body.appendChild(dropdown);

  dropdown.addEventListener("click", (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    if (action === "refresh") {
      ensureNotifications(true);
    } else if (action === "mark-all") {
      markAllRead(true);
    } else if (action === "fermer") {
      hideDropdown();
    } else if (action === "contact-mail") {
      const email = event.target.dataset.email;
      if (email) {
        window.open(`mailto:${email}?subject=Contact suite à match`, "_blank");
      }
    }
  });
}

function updateDropdownList() {
  const list = dropdown?.querySelector("#notifItems");
  if (!list) return;
  if (!cachedNotifications.length) {
    list.innerHTML = `<div class="notif-empty">Aucune notification pour le moment.</div>`;
    return;
  }
  list.innerHTML = cachedNotifications
    .map((item) => renderItem(item))
    .join("");
}

function renderItem(item) {
  const unreadClass = item.is_read ? "" : "unread";
  const time = formatDate(item.created_at);
  const message = escapeHtml(item.message || "Nouvelle notification");
  const canContact = item.type === "application:matched" && item.contact_email;
  let contactBlock = "";
  if (canContact) {
    const label = item.contact_role === "candidate" ? "Contacter le candidat" : "Contacter l’entreprise";
    const emailLink = `<a href=\"mailto:${escapeAttr(item.contact_email)}\" class=\"notif-contact-link\">${escapeHtml(
      item.contact_email
    )}</a>`;
    contactBlock = `<div class=\"notif-contact\"><strong>${label}</strong><br>${emailLink}</div>`;
  }
  return `
    <article class="notif-item ${unreadClass}" data-id="${item.id}">
      <div class="notif-message">${message}</div>
      <time>${escapeHtml(time)}</time>
      ${contactBlock}
    </article>
  `;
}

function updateIndicator() {
  if (!indicator) return;
  const hasUnread = cachedNotifications.some((n) => !n.is_read);
  indicator.style.display = hasUnread ? "block" : "none";
}

async function markAllRead(callApi = false) {
  if (!cachedNotifications.length) return;
  cachedNotifications = cachedNotifications.map((n) => ({ ...n, is_read: true }));
  updateIndicator();
  updateDropdownList();
  if (callApi) {
    try {
      await fetch(`${API}/api/me/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
    } catch (err) {
      console.warn("markAllRead", err);
    }
  }
}

function showDropdown() {
  if (!dropdown) return;
  isOpen = true;
  dropdown.style.display = "block";
  if (backdrop) backdrop.style.display = "block";
}

function hideDropdown() {
  if (!dropdown) return;
  isOpen = false;
  dropdown.style.display = "none";
  if (backdrop) backdrop.style.display = "none";
}

function hasToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(value) {
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

document.addEventListener("click", (event) => {
  if (!isOpen || !dropdown) return;
  if (dropdown.contains(event.target)) return;
  const icon = document.querySelector(".logo-3");
  if (icon && icon.contains(event.target)) return;
  hideDropdown();
});

document.addEventListener("DOMContentLoaded", initNotificationsWidget);
