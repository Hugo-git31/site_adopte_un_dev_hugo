const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const TOKEN_KEY = "jb_token";
const ROLE_KEY = "jb_role";

const state = {
  apiBase: DEFAULT_API_BASE,
  appliedIds: new Set(),
  processingId: null,
  currentJobId: null,
  listeners: new Set(),
};

function getSnapshot() {
  return {
    apiBase: state.apiBase,
    appliedIds: new Set(state.appliedIds),
    processingId: state.processingId,
    currentJobId: state.currentJobId,
    isLoggedIn: isLoggedIn(),
    isCandidate: isCandidate(),
    isRecruiterOrAdmin: isRecruiterOrAdmin(),
  };
}

function emit() {
  const snapshot = getSnapshot();
  state.listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (err) {
      console.error("JobApply listener error", err);
    }
  });
}

export function initJobApply({ apiBase } = {}) {
  if (apiBase) state.apiBase = apiBase;
  hydrateAppliedJobs();
}

export function subscribeJobApply(callback) {
  if (typeof callback !== "function") return () => {};
  state.listeners.add(callback);
  callback(getSnapshot());
  return () => state.listeners.delete(callback);
}

export function setCurrentJob(jobId) {
  const parsed = jobId == null ? null : Number(jobId);
  state.currentJobId = Number.isFinite(parsed) ? parsed : null;
  emit();
}

export function clearCurrentJob() {
  setCurrentJob(null);
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isCandidate() {
  return localStorage.getItem(ROLE_KEY) === "user";
}

export function isRecruiterOrAdmin() {
  return ["recruiter", "admin"].includes(localStorage.getItem(ROLE_KEY));
}

export async function hydrateAppliedJobs() {
  if (!isLoggedIn() || !isCandidate()) {
    state.appliedIds = new Set();
    emit();
    return;
  }

  try {
    const res = await fetch(`${state.apiBase}/api/me/applications`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const ids = (data.items || [])
      .map((item) => Number(item.job_id))
      .filter((id) => Number.isFinite(id));
    state.appliedIds = new Set(ids);
    emit();
  } catch (err) {
    console.warn("hydrateAppliedJobs error", err);
  }
}

export async function applyToJob(jobId) {
  const parsed = Number(jobId);
  if (!Number.isFinite(parsed)) {
    return { status: "error", code: "invalid", message: "Offre inconnue." };
  }

  if (!isLoggedIn()) {
    return { status: "auth" };
  }

  if (isRecruiterOrAdmin()) {
    return {
      status: "role",
      message: "Seuls les comptes candidats peuvent postuler.",
    };
  }

  if (!isCandidate()) {
    return {
      status: "role",
      message: "Ton profil doit être configuré comme candidat pour postuler.",
    };
  }

  if (state.appliedIds.has(parsed)) {
    return { status: "duplicate", message: "Déjà postulé." };
  }

  const token = getToken();
  if (!token) {
    return { status: "auth" };
  }

  state.processingId = parsed;
  emit();

  try {
    const res = await fetch(`${state.apiBase}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ job_id: parsed }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      state.processingId = null;
      state.appliedIds = new Set();
      emit();
      return { status: "auth", message: "Session expirée. Merci de te reconnecter." };
    }

    if (res.status === 409) {
      state.appliedIds.add(parsed);
      state.processingId = null;
      emit();
      return { status: "duplicate", message: "Tu as déjà postulé à cette offre." };
    }

    if (!res.ok) {
      state.processingId = null;
      emit();
      return {
        status: "error",
        code: "http",
        message: data?.detail || "Impossible de postuler pour le moment.",
      };
    }

    state.appliedIds.add(parsed);
    state.processingId = null;
    emit();
    return { status: "ok" };
  } catch (err) {
    console.error("applyToJob error", err);
    state.processingId = null;
    emit();
    return {
      status: "error",
      code: "network",
      message: "Erreur réseau. Réessaye dans un instant.",
    };
  }
}

export function getJobApplySnapshot() {
  return getSnapshot();
}
