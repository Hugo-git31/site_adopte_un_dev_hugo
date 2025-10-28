const API_BASE = "http://127.0.0.1:8000";
const grid = document.querySelector(".offres");
const pagination = document.querySelector(".profiles-pagination");
const searchInput = document.getElementById("searchInput");
const cityInput = document.getElementById("cityInput");
const filterBtn = document.getElementById("filterBtn");
const PAGE_SIZE = 9;
let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let currentCity = "";

function esc(s = "") {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
}

function profileToCard(p) {
    return `
    <div class="carte">
        <div class="carte-image">
            <img src="${esc(p.avatar_url || 'default-avatar.png')}" alt="Profil ${esc(p.id)}">
        </div>
        <div class="carte-contenu">
            <h3>${esc(p.first_name)} ${esc(p.last_name)}</h3>
            <p class="ville">${esc(p.city || "Ville non renseignée")}</p>
            <p class="description">${esc(p.job_target || "Poste recherché non précisé")}</p>
            <div class="tags">
                <span>${esc(p.skills || "Compétences non précisées")}</span>
            </div>
            <button class="learn-more" data-id="${p.id}">Voir le profil</button>
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

async function loadProfiles(page = 1, pageSize = PAGE_SIZE, search = "", city = "") {
    const qs = new URLSearchParams({page, page_size: pageSize});
    if (search) qs.set("q", search);
    if (city) qs.set("city", city);
    const res = await fetch(`${API_BASE}/api/profiles?${qs}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.items.length && page > 1 && !data.total) {
        totalPages = Math.max(1, page - 1);
        renderPagination();
        return loadProfiles(page - 1, pageSize, search, city);
    }
    currentPage = page;
    currentSearch = search;
    currentCity = city;
    totalPages = data.total ? Math.max(1, Math.ceil(data.total / pageSize)) : (data.items.length < pageSize ? page : page + 1);
    grid.innerHTML = data.items.map(profileToCard).join("") || "<p>Aucun profil trouvé</p>";
    renderPagination();
}

function handleLoadError(err) {
    grid.innerHTML = `<p style="color:red">Erreur chargement: ${esc(err.message)}</p>`;
    if (pagination) pagination.innerHTML = "";
}

if (pagination) {
    pagination.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "prev" && currentPage > 1) {
            loadProfiles(currentPage - 1, PAGE_SIZE, currentSearch, currentCity).catch(handleLoadError);
        } else if (btn.dataset.action === "next" && currentPage < totalPages) {
            loadProfiles(currentPage + 1, PAGE_SIZE, currentSearch, currentCity).catch(handleLoadError);
        }
    });
}

if (filterBtn) {
    filterBtn.addEventListener("click", () => {
        const search = searchInput?.value.trim() || "";
        const city = cityInput?.value.trim() || "";
        loadProfiles(1, PAGE_SIZE, search, city).catch(handleLoadError);
    });
}

document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".learn-more");
    if (!btn) return;
    const id = btn.dataset.id;
    try {
        const res = await fetch(`${API_BASE}/api/profiles/${id}`);
        const profile = await res.json();
        alert(`${profile.first_name} ${profile.last_name}\n\n` +
              `📍 ${profile.city || "Ville non renseignée"}\n\n` +
              `🎯 Poste recherché : ${profile.job_target || "(non précisé)"}\n\n` +
              `💡 Compétences : ${profile.skills || "(non précisées)"}\n\n` +
              `🗣️ Motivation :\n${profile.motivation || "(non renseignée)"}`);
    } catch (err) {
        alert("Erreur: " + err.message);
    }
});

loadProfiles().catch(handleLoadError);
