const Store = {
  read(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
const Icons = (() => {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    shuffle: '<path d="m3 5 14 14h4m-4-4 4 4-4 4M3 19 17 5h4m-4-4 4 4-4 4"/>',
    team: '<circle cx="8" cy="8" r="3"/><circle cx="18" cy="9" r="2"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-7a5 5 0 0 1 6 5v2"/>',
    quiz: '<path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 4v1"/><circle cx="12" cy="12" r="10"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  };
  return (name) =>
    `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.spark}</svg>`;
})();
const Session = {
  user() {
    try {
      const key = localStorage.getItem("loggedUser"),
        data = key && Store.read(key);
      return data && typeof data.username === "string" && data.username === key
        ? data
        : null;
    } catch {
      return null;
    }
  },
  require() {
    if (this.user()) return true;
    Interface.mensagem(
      "Entre na sua conta para salvar favoritos.",
      "info",
      true,
    );
    document.querySelector("#feedback a")?.focus();
    return false;
  },
  returnUrl() {
    const value = new URLSearchParams(location.search).get("retorno");
    if (value)
      try {
        const url = new URL(value, location.href);
        if (
          url.origin === location.origin &&
          /\/(pagina-inicial|pokedex|comparador|sobre-pokemon)\.html$/.test(
            url.pathname,
          )
        )
          return url.pathname + url.search;
      } catch {}
    return "pagina-inicial.html";
  },
};
const Interface = {
  tipo: (n) => Poke.types[n] || n,
  stat: (n) => Poke.stats[n] || n,
  mensagem(text = "", kind = "error", login = false) {
    const node = document.querySelector("#feedback");
    if (!node) return;
    node.hidden = !text;
    node.dataset.kind = kind;
    node.setAttribute("role", kind === "error" ? "alert" : "status");
    node.textContent = text;
    if (login) {
      const link = document.createElement("a");
      link.href = `login.html?retorno=${encodeURIComponent(location.pathname + location.search)}`;
      link.textContent = "Fazer login";
      node.append(" ", link);
    }
  },
  loading(node) {
    node.innerHTML =
      '<div class="loading" role="status"><img src="../assets/pokeball-icon.svg" alt="">Carregando Pokémon…</div>';
  },
  error(node, error, retry) {
    node.replaceChildren();
    const box = document.createElement("div");
    box.className = "empty-state";
    box.setAttribute("role", "alert");
    const p = document.createElement("p");
    p.textContent = error.message || "Não foi possível carregar.";
    box.append(p);
    const button = document.createElement("button");
    button.className = "button";
    button.textContent = "Tentar novamente";
    button.onclick = retry;
    box.append(button);
    node.append(box);
  },
  suggestions(input, onSelect) {
    const box = document.createElement("ul");
    box.className = "suggestions";
    box.hidden = true;
    box.id = "suggestions-" + input.id;
    box.role = "listbox";
    box.setAttribute("aria-label", "Sugestões de Pokémon");
    input.closest(".search-field").append(box);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", box.id);
    input.setAttribute("aria-expanded", "false");
    input.autocomplete = "off";
    let list = [],
      selected = -1,
      timer,
      version = 0;
    function close() {
      box.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      selected = -1;
    }
    function choose(i) {
      if (!list[i]) return;
      input.value = list[i].name;
      close();
      onSelect(list[i]);
    }
    async function show() {
      const current = ++version,
        query = input.value.trim().toLowerCase().replace(/^#/, "");
      if (!query) return close();
      try {
        const catalog = await Poke.catalog();
        if (current !== version || document.activeElement !== input) return;
        list = catalog
          .filter((p) => p.name.includes(query) || p.id === Number(query))
          .sort(
            (a, b) =>
              Number(b.name.startsWith(query)) -
                Number(a.name.startsWith(query)) || a.id - b.id,
          )
          .slice(0, 6);
        selected = -1;
        box.innerHTML = list.length
          ? list
              .map(
                (p, i) =>
                  `<li role="option" aria-selected="false" id="${box.id}-${i}" data-index="${i}"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt=""><span>${Poke.escape(Poke.name(p.name))}</span><small>${Poke.number(p.id)}</small></li>`,
              )
              .join("")
          : '<li class="suggestion-empty" role="presentation">Nenhum Pokémon encontrado.</li>';
        box.hidden = false;
        input.setAttribute("aria-expanded", "true");
      } catch {
        close();
      }
    }
    input.addEventListener("input", () => {
      version++;
      clearTimeout(timer);
      timer = setTimeout(show, 160);
    });
    input.addEventListener("focus", () => {
      if (input.value) show();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (box.hidden || !list.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        selected =
          (selected + (e.key === "ArrowDown" ? 1 : -1) + list.length) %
          list.length;
        [...box.querySelectorAll("[role=option]")].forEach((li, i) =>
          li.setAttribute("aria-selected", String(i === selected)),
        );
        input.setAttribute("aria-activedescendant", `${box.id}-${selected}`);
        box.children[selected].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && selected >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        choose(selected);
      }
    });
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      const item = e.target.closest("[data-index]");
      if (item) choose(Number(item.dataset.index));
    });
    input.addEventListener("blur", close);
  },
  card(p) {
    const card = document.createElement("article");
    card.className = "pokemon-card";
    card.style = Poke.tone(p);
    card.innerHTML = `<a class="pokemon-link" href="sobre-pokemon.html?id=${p.id}" aria-label="Ver detalhes de ${Poke.escape(Poke.name(p.name))}"><div class="card-image"><img src="${Poke.sprite(p)}" alt="${Poke.escape(Poke.name(p.name))}" loading="lazy"></div><div class="card-info"><p class="pokemon-number">${Poke.number(p.id)}</p><h3>${Poke.name(p.name)}</h3><div class="pokemon-types">${Poke.badges(p)}</div></div></a>`;
    card.append(Favoritos.criarBotao(p.id, p.name));
    return card;
  },
};
document.addEventListener("DOMContentLoaded", () => {
  const user = Session.user(),
    login = document.querySelector(".login-btn"),
    menu = document.querySelector("#userMenu");
  if (login && !user) {
    const compact = matchMedia("(max-width: 620px)");
    const label = () => {
      login.textContent = compact.matches ? "Entrar" : "Fazer login";
    };
    login.setAttribute("aria-label", "Fazer login");
    compact.addEventListener("change", label);
    label();
  }
  if (user && login) {
    login.textContent = user.username;
    login.title = user.username;
    login.href = "#conta";
    login.setAttribute("aria-expanded", "false");
    login.onclick = (e) => {
      e.preventDefault();
      menu.hidden = !menu.hidden;
      login.setAttribute("aria-expanded", String(!menu.hidden));
    };
  }
  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    Store.remove("loggedUser");
    location.reload();
  });
  document.addEventListener("click", (e) => {
    if (menu && !e.target.closest(".account")) {
      menu.hidden = true;
      login?.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu && !menu.hidden) {
      menu.hidden = true;
      login.focus();
      login.setAttribute("aria-expanded", "false");
    }
  });
  document
    .querySelectorAll("[data-icon]")
    .forEach((node) => (node.innerHTML = Icons(node.dataset.icon)));
  document.addEventListener(
    "error",
    (e) => {
      if (e.target.tagName === "IMG" && !e.target.dataset.fallback) {
        e.target.dataset.fallback = "true";
        e.target.src = "../assets/pokeball-icon.svg";
      }
    },
    true,
  );
});
window.addEventListener("storage", (event) => {
  if (event.key === "loggedUser" || event.key === null) location.reload();
});
/* Alinha a área opaca do sprite à base, sem esticar a imagem ou mudar o GIF. */
const SpriteLayout = (() => {
  const bounds = new WeakMap();
  function fit(img) {
    if (!img.complete || !img.naturalWidth) return;
    const frame = img.parentElement;
    if (!frame?.classList.contains("sprite-frame")) return;
    let box = bounds.get(img);
    if (!box) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      try {
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width,
          right = 0,
          top = canvas.height,
          bottom = 0;
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++)
            if (pixels[(y * canvas.width + x) * 4 + 3] > 30) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        box =
          right >= left
            ? { left, right, top, bottom }
            : {
                left: 0,
                right: canvas.width - 1,
                top: 0,
                bottom: canvas.height - 1,
              };
      } catch {
        box = {
          left: 0,
          right: img.naturalWidth - 1,
          top: 0,
          bottom: img.naturalHeight - 1,
        };
      }
      bounds.set(img, box);
    }
    const scale = Math.min(
      (frame.clientWidth * 0.93) / (box.right - box.left + 1),
      (frame.clientHeight * 0.96) / (box.bottom - box.top + 1),
    );
    img.style.width = img.naturalWidth * scale + "px";
    img.style.height = img.naturalHeight * scale + "px";
    img.style.left =
      (frame.clientWidth - (box.right - box.left + 1) * scale) / 2 -
      box.left * scale +
      "px";
    img.style.bottom = -(img.naturalHeight - 1 - box.bottom) * scale + "px";
  }
  document.addEventListener(
    "load",
    (e) => {
      if (e.target.matches?.(".sprite-normalized")) fit(e.target);
    },
    true,
  );
  window.addEventListener("resize", () =>
    document.querySelectorAll(".sprite-normalized").forEach(fit),
  );
  return { fit };
})();
