document.addEventListener("DOMContentLoaded", () => {
  const openBtns = document.querySelectorAll(".open-popup");
  const closeBtns = document.querySelectorAll(".close");
  const popups = document.querySelectorAll(".popup");

  openBtns.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const targetId = btn.getAttribute("href").replace("#","");
      document.getElementById(targetId).style.display = "flex";
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      btn.closest(".popup").style.display = "none";
    });
  });

  popups.forEach(popup => {
    popup.addEventListener("click", e => {
      if(e.target === popup) popup.style.display = "none";
    });
  });
});
