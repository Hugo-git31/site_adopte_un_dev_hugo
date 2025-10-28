export function initTabs(defaultView) {
  const tabs = Array.from(document.querySelectorAll(".admin-tab"));
  const views = new Map(
    Array.from(document.querySelectorAll(".admin-view"), (view) => [view.dataset.view, view])
  );

  if (!tabs.length || !views.size) {
    return { activate: () => {}, current: () => null };
  }

  let current = null;

  const activate = (viewName) => {
    if (!viewName || !views.has(viewName) || current === viewName) {
      return;
    }
    tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.view === viewName);
    });
    views.forEach((viewEl, name) => {
      viewEl.classList.toggle("is-active", name === viewName);
    });
    current = viewName;
    document.dispatchEvent(
      new CustomEvent("admin:view-change", {
        detail: { view: viewName },
      })
    );
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activate(tab.dataset.view);
    });
  });

  const initial =
    defaultView ||
    tabs.find((tab) => tab.classList.contains("is-active"))?.dataset.view ||
    tabs[0].dataset.view;

  activate(initial);

  return {
    activate,
    current: () => current,
  };
}
