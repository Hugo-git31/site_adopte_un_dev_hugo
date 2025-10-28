const API_BASE = "http://127.0.0.1:8000";
const grid = document.querySelector(".entreprises");
const companiesById = new Map();

const companyPopup = document.getElementById("companyPopup");
const pName = document.getElementById("companyPopupName");
const pCity = document.getElementById("companyPopupCity");
const pDesc = document.getElementById("companyPopupDescription");
const pSite = document.getElementById("companyPopupSite");
const pBanner = document.getElementById("companyPopupBanner");

function esc(s = "") {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
}

function bannerSrc(c) {
    const raw = c.banner_url || "";
    if (!raw) return "./assets/company_logo_default.png";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${API_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`
}

function companyToCard(c) {
    return `
    <div class="carte">
        <div class="carte-image">
            <img src="${esc(bannerSrc(c))}" alt="Entreprise ${esc(c.name || c.id)}">
        </div>
        <div class="carte-contenu">
            <h3>${esc(c.name || "")}</h3>
            <p class="entreprise">${esc(c.hq_city || "")}</p>
            <p class="description">${esc(c.description) || ""}</p>
            <a class="link" href="${esc(c.website)}">site web</a> 
            <button class="company-more" data-id="${esc(c.id)}">En savoir plus</button>
        </div>
        <section class="offres"></section>
    </div>
    `
}

async function loadCompanies() {
    const res = await fetch(`${API_BASE}/api/companies`);
    if (!res.ok) throw new Error (await res.text());
    const data = await res.json();
    for (const company of data.items) {
        companiesById.set(String(company.id), company);
    }
    grid.innerHTML = data.items.map(companyToCard).join("") || "<p>Aucune entreprise</p>";
}

loadCompanies().catch(err => {
    grid.innerHTML = `<p style="color:red">Erreur chargement : ${esc(err.message)}</p>`;
});

function openCompanyPopup(id) {
    const company = companiesById.get(String(id));
    if (!company || !companyPopup) return ;
    pName.textContent = company.name || "";
    pCity.textContent = company.hq_city || "";
    pDesc.innerHTML = company.description ? esc(company.description) : "<p>(Description indisponible)</p>";
    if (company.banner_url) {
        pBanner.src = company.banner_url.startsWith("http")
            ? company.banner_url
            : `${API_BASE}${company.banner_url}`;
        pBanner.style.display ="";
    } else {
        pBanner.style.display = "none";
        pBanner.removeAttribute("src");
    }
    if (company.website) {
        pSite.href = company.website;
        pSite.style.display = "";
    } else {
        pSite.removeAttribute("href");
        pSite.style.display = "none";
    }
    companyPopup.style.display = "flex";
}

document.addEventListener("click", (event) => {
    const btn = event.target.closest(".company-more");
    if (btn) {
        event.preventDefault();
        openCompanyPopup(btn.dataset.id);
    }
    if (event.target.matches("[data-close-company]") && companyPopup) {
        event.preventDefault();
        companyPopup.style.display ="";
    }
});

window.addEventListener("hashchange", () => {
    if (companyPopup && location.hash !== "#companyPopup") {
        companyPopup.style.display = "";
    }
});