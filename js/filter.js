const API_BASE = "http://127.0.0.1:8000";

const searchInput = document.querySelector(".search-bar");
const jobsSection = document.querySelector(".offres");

const suggestionBox = document.createElement("div");
suggestionBox.classList.add("suggestion-box");
searchInput.parentNode.appendChild(suggestionBox);

let typingTimer;
const TYPING_DELAY = 200;

async function fetchSuggestions(query) {
  if (!query || query.trim() === "") {
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/jobs?q=${encodeURIComponent(query)}&page_size=5`);
    const data = await res.json();

    suggestionBox.innerHTML = "";
    if (!data.items || data.items.length === 0) {
      suggestionBox.style.display = "none";
      return;
    }

    data.items.forEach(job => {
      const div = document.createElement("div");
      div.classList.add("suggestion-item");
      div.textContent = job.title;
      div.addEventListener("click", () => {
        searchInput.value = job.title;
        suggestionBox.style.display = "none";
        filterJobs();
      });
      suggestionBox.appendChild(div);
    });

    suggestionBox.style.display = "block";
  } catch (err) {
    console.error("Erreur suggestions :", err);
  }
}

async function filterJobs() {
  const query = searchInput.value.trim();

  jobsSection.innerHTML = "<p>Chargement...</p>";
  try {
    const res = await fetch(`${API_BASE}/api/jobs?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    jobsSection.innerHTML = "";

    if (!data.items || data.items.length === 0) {
      jobsSection.innerHTML = "<p>Aucune offre trouvée.</p>";
      return;
    }

    data.items.forEach(job => {
      const div = document.createElement("div");
      div.classList.add("job-card");
      div.innerHTML = `
        <img src="${API_BASE}${job.company_banner_url}" alt="${job.company_name}" class="job-banner">
        <h3>${job.title}</h3>
        <p class="company">${job.company_name}</p>
        <p class="location">${job.location || "Non précisée"}</p>
        <p class="desc">${job.short_desc}</p>
      `;
      jobsSection.appendChild(div);
    });
  } catch (err) {
    console.error("Erreur affichage jobs :", err);
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    fetchSuggestions(searchInput.value);
  }, TYPING_DELAY);
});

document.addEventListener("click", (e) => {
  if (!suggestionBox.contains(e.target) && e.target !== searchInput) {
    suggestionBox.style.display = "none";
  }
});

