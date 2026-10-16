document.addEventListener("DOMContentLoaded", () => {
  const orbit = document.querySelector("#orbit"),
    info = document.querySelector("#orbitInfo"),
    pause = document.querySelector("#orbitPause");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let pokemons = [],
    index = 0,
    paused = motion.matches,
    hovered = false,
    focused = false,
    visible = true,
    timer = null,
    suppressClickUntil = 0;
  function show() {
    const width = orbit.clientWidth;
    orbit.querySelectorAll(".orbit-item").forEach((node, i) => {
      const offset = (i - index + pokemons.length) % pokemons.length,
        angle = (offset * Math.PI * 2) / pokemons.length,
        depth = (Math.cos(angle) + 1) / 2;
      const scale = 0.36 + depth * 0.64,
        x = Math.sin(angle) * width * (width < 600 ? 0.25 : 0.32),
        y = Math.cos(angle) * orbit.clientHeight * 0.2;
      node.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
      node.style.zIndex = String(Math.round(depth * 25));
      node.style.opacity = String(0.45 + depth * 0.55);
      node.classList.toggle("front", i === index);
      node.setAttribute("aria-current", i === index ? "true" : "false");
    });
    const current = pokemons[index];
    if (!current) return;
    info.innerHTML = `<h2>${Poke.name(current.name)}</h2><p>${Poke.number(current.id)} · ${current.types.map((t) => Poke.types[t.type.name]).join(" / ")}</p>`;
    document.querySelector("#orbitDetails").href =
      "sobre-pokemon.html?id=" + current.id;
  }
  function sync() {
    clearInterval(timer);
    timer = null;
    if (
      !paused &&
      !hovered &&
      !focused &&
      visible &&
      !document.hidden &&
      !motion.matches &&
      pokemons.length > 1
    )
      timer = setInterval(() => {
        index = (index + 1) % pokemons.length;
        show();
      }, 5500);
    pause.innerHTML = Icons(paused ? "play" : "pause");
    pause.disabled = motion.matches;
    pause.title = motion.matches
      ? "Rotação automática desativada pela preferência de movimento reduzido."
      : "";
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute(
      "aria-label",
      paused ? "Iniciar rotação automática" : "Pausar rotação automática",
    );
  }
  function move(amount) {
    if (!pokemons.length) return;
    index = (index + amount + pokemons.length) % pokemons.length;
    show();
    sync();
  }
  async function load() {
    orbit.classList.remove("ready");
    Interface.loading(orbit);
    const result = await Promise.allSettled(
      [9, 6, 3, 25, 94, 133, 149].map(Poke.pokemon),
    );
    pokemons = result
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    if (!pokemons.length)
      return Interface.error(
        orbit,
        new Error("Não foi possível preparar a esteira."),
        load,
      );
    orbit.replaceChildren();
    pokemons.forEach((p, i) => {
      const button = document.createElement("button");
      button.className = "orbit-item";
      button.type = "button";
      button.setAttribute("aria-label", `Destacar ${Poke.name(p.name)}`);
      button.innerHTML = `<span class="orbit-base"></span><span class="sprite-frame"><img class="sprite-normalized" crossorigin="anonymous" src="${Poke.sprite(p)}" alt="${Poke.name(p.name)}"></span>`;
      button.onclick = () => {
        if (Date.now() < suppressClickUntil) return;
        index = i;
        show();
        sync();
      };
      orbit.append(button);
      const img = button.querySelector("img");
      if (img.complete) SpriteLayout.fit(img);
    });
    show();
    requestAnimationFrame(() => requestAnimationFrame(() => orbit.classList.add("ready")));
    sync();
  }
  document.querySelector("#orbitPrevious").onclick = () => move(-1);
  document.querySelector("#orbitNext").onclick = () => move(1);
  pause.onclick = () => {
    paused = !paused;
    sync();
  };
  const section = document.querySelector(".carousel-section");
  section.addEventListener("mouseenter", () => {
    hovered = true;
    sync();
  });
  section.addEventListener("mouseleave", () => {
    hovered = false;
    sync();
  });
  section.addEventListener("focusin", () => {
    focused = true;
    sync();
  });
  section.addEventListener("focusout", (e) => {
    if (!section.contains(e.relatedTarget)) {
      focused = false;
      sync();
    }
  });
  orbit.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(e.key === "ArrowRight" ? 1 : -1);
    }
  });
  let touch = null;
  orbit.addEventListener(
    "touchstart",
    (e) => {
      touch = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
    },
    { passive: true },
  );
  orbit.addEventListener(
    "touchend",
    (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x,
        dy = e.changedTouches[0].clientY - touch.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        suppressClickUntil = Date.now() + 450;
        move(dx < 0 ? 1 : -1);
      }
      touch = null;
    },
    { passive: true },
  );
  motion.addEventListener("change", () => {
    if (motion.matches) paused = true;
    sync();
  });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", show);
  if ("IntersectionObserver" in window)
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(orbit);
  load();
  const regions = {
    kanto: [1, 4, 7],
    johto: [152, 155, 158],
    hoenn: [252, 255, 258],
    sinnoh: [387, 390, 393],
    unova: [495, 498, 501],
    kalos: [650, 653, 656],
    alola: [722, 725, 728],
    galar: [810, 813, 816],
    paldea: [906, 909, 912],
  };
  let regionVersion = 0;
  async function starters() {
    const version = ++regionVersion,
      node = document.querySelector("#starters");
    Interface.loading(node);
    try {
      const data = await Promise.all(
        regions[document.querySelector("#regionSelect").value].map(
          Poke.pokemon,
        ),
      );
      if (version !== regionVersion) return;
      node.replaceChildren(...data.map(Interface.card));
    } catch (error) {
      if (version === regionVersion) Interface.error(node, error, starters);
    }
  }
  document.querySelector("#regionSelect").onchange = starters;
  starters();
  document.querySelector("#homeTypes").innerHTML = [
    "grass",
    "fire",
    "water",
    "electric",
    "psychic",
    "dragon",
  ]
    .map(
      (t) =>
        `<a href="pokedex.html?tipo=${t}" style="--badge:${Poke.colors[t]}"><img src="../assets/types/tipos-desenho/${t}.svg" alt="">${Poke.types[t]}</a>`,
    )
    .join("");
  const recent = Store.read("poke.recent", []);
  if (Array.isArray(recent) && recent.length) {
    document.querySelector("#recentSection").hidden = false;
    Promise.allSettled(
      recent.slice(0, 4).filter(Number.isInteger).map(Poke.pokemon),
    ).then((results) =>
      document
        .querySelector("#recentPokemon")
        .replaceChildren(
          ...results
            .filter((r) => r.status === "fulfilled")
            .map((r) => Interface.card(r.value)),
        ),
    );
  }
});
