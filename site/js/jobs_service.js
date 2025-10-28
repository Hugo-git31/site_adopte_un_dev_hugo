// jobs_service.js — utilitaires réutilisables pour gérer les offres côté admin/entreprise
// Fournit un petit wrapper fetch pour lister/créer/modifier/supprimer des jobs.
// Utilisation :
//   JobsService.list({ token, companyId })
//   JobsService.create({ token, companyId, payload })
// Toutes les méthodes acceptent un `baseUrl` optionnel (défaut : http://127.0.0.1:8000).

(function (global) {
  const DEFAULT_BASE = "http://127.0.0.1:8000";

  function buildHeaders(token, extraHeaders = {}, isJSON = true) {
    const headers = { ...extraHeaders };
    if (isJSON && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  async function request(path, { method = "GET", body = null, token = null, baseUrl = DEFAULT_BASE, isJSON = true } = {}) {
    const headers = buildHeaders(token, {}, isJSON);
    const payload = body && isJSON ? JSON.stringify(body) : body;
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: payload });
    let data = {};
    try {
      // Certaines routes (DELETE) renvoient 204 → pas de JSON
      if (res.status !== 204) {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      }
    } catch (err) {
      data = {};
    }
    if (!res.ok) {
      throw data && typeof data === "object" && Object.keys(data).length ? data : { detail: res.statusText };
    }
    return data;
  }

  function buildQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") search.set(key, value);
    });
    return search.toString();
  }

  const JobsService = {
    list({ token = null, baseUrl = DEFAULT_BASE, companyId = null, q = null, page = 1, pageSize = 20 } = {}) {
      const query = buildQuery({ company_id: companyId, q, page, page_size: pageSize });
      return request(`/api/jobs?${query}`, { token, baseUrl });
    },
    get({ token = null, baseUrl = DEFAULT_BASE, id }) {
      if (!id) throw new Error("Job id requis");
      return request(`/api/jobs/${id}`, { token, baseUrl });
    },
    create({ token = null, baseUrl = DEFAULT_BASE, companyId, payload = {} }) {
      if (!companyId) throw new Error("companyId requis");
      return request("/api/jobs", { method: "POST", body: { company_id: companyId, ...payload }, token, baseUrl });
    },
    update({ token = null, baseUrl = DEFAULT_BASE, id, payload = {} }) {
      if (!id) throw new Error("Job id requis");
      return request(`/api/jobs/${id}`, { method: "PATCH", body: payload, token, baseUrl });
    },
    remove({ token = null, baseUrl = DEFAULT_BASE, id }) {
      if (!id) throw new Error("Job id requis");
      return request(`/api/jobs/${id}`, { method: "DELETE", token, baseUrl });
    }
  };

  global.JobsService = JobsService;
})(window);
