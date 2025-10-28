import { notify } from "../core.js";

let modalEl = null;
let dialogEl = null;
let titleEl = null;
let bodyEl = null;
let formEl = null;
let submitBtn = null;
let cancelBtn = null;
let closeBtn = null;
let currentSubmit = null;
let isSubmitting = false;
let isInitialized = false;

function setSubmitting(state) {
  isSubmitting = state;
  if (submitBtn) submitBtn.disabled = state;
  if (cancelBtn) cancelBtn.disabled = state;
}

export function closeModal() {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  bodyEl.innerHTML = "";
  formEl.reset();
  currentSubmit = null;
  setSubmitting(false);
  document.body.style.overflow = "";
}

function handleOverlayClick(event) {
  if (event.target === modalEl && !isSubmitting) {
    closeModal();
  }
}

function handleKeydown(event) {
  if (event.key === "Escape" && !isSubmitting && modalEl && !modalEl.classList.contains("hidden")) {
    closeModal();
  }
}

export function initModal() {
  if (isInitialized) return;
  modalEl = document.getElementById("adminModal");
  if (!modalEl) return;

  dialogEl = modalEl.querySelector(".admin-modal__dialog");
  titleEl = modalEl.querySelector("#adminModalTitle");
  bodyEl = modalEl.querySelector("#adminModalBody");
  formEl = modalEl.querySelector("#adminModalForm");
  submitBtn = modalEl.querySelector("#adminModalSubmit");
  cancelBtn = modalEl.querySelector("#adminModalCancel");
  closeBtn = modalEl.querySelector("#adminModalClose");

  modalEl.addEventListener("click", handleOverlayClick);
  cancelBtn?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);

  formEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentSubmit || isSubmitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData(formEl);
      const shouldClose = await currentSubmit(formData, { closeModal, setSubmitting });
      if (shouldClose !== false) {
        closeModal();
      }
    } catch (err) {
      console.error("Modal submit error", err);
      notify(err?.detail || "Action impossible", false);
    } finally {
      setSubmitting(false);
    }
  });

  document.addEventListener("keydown", handleKeydown);
  isInitialized = true;
}

export function openFormModal({ title, submitLabel = "Enregistrer", render, onSubmit, size } = {}) {
  if (!modalEl) return;
  if (!render || typeof render !== "function") {
    throw new Error("render function is required for openFormModal");
  }
  formEl.reset();
  bodyEl.innerHTML = "";
  currentSubmit = onSubmit;
  setSubmitting(false);

  if (size === "wide") {
    dialogEl.style.width = "min(720px, 94vw)";
  } else {
    dialogEl.style.width = "min(520px, 92vw)";
  }

  if (titleEl) titleEl.textContent = title || "";
  if (submitBtn) submitBtn.textContent = submitLabel;

  render(bodyEl);

  modalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => {
    const autofocus = bodyEl.querySelector("[data-autofocus]");
    const focusTarget = autofocus || bodyEl.querySelector("input, select, textarea, button");
    focusTarget?.focus();
  });
}
