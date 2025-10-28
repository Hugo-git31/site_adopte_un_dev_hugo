const API_BASE = "http://127.0.0.1:8000";
const pingBtn = document.getElementById("ping");
const out = document.getElementById("out");

pingBtn.addEventListener("click", async () => {
  out.textContent = "Appel en cours...";
  try {
    const res = await fetch(`${API_BASE}/health`, {
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Erreur: " + err.message;
  }
});
