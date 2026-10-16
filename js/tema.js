/* Executado no head para restaurar o tema antes de desenhar a página. */
(() => {
  const key = "pokecompanion.theme";
  const read = () => {
    try {
      return localStorage.getItem(key) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  };
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    const button = document.querySelector("#themeToggle");
    if (!button) return;
    const dark = theme === "dark";
    const label = dark ? "Ativar tema claro" : "Ativar tema escuro";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", String(dark));
    button.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>' : '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>'}</svg>`;
  };
  apply(read());
  document.addEventListener("DOMContentLoaded", () => {
    const account = document.querySelector(".account");
    if (!account) return;
    const button = document.createElement("button");
    button.id = "themeToggle";
    button.type = "button";
    button.className = "icon-button theme-toggle";
    account.append(button);
    apply(document.documentElement.dataset.theme);
    button.addEventListener("click", () => {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      apply(theme);
      try {
        localStorage.setItem(key, theme);
      } catch {}
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) apply(read());
  });
})();
