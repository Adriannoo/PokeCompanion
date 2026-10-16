/* Favoritos isolados por conta. O login continua sendo uma demonstração local. */
const Favoritos = (() => {
  const key = () =>
    Session.user()
      ? `pokecompanion.favorites:${Session.user().username}`
      : null;
  function ids() {
    const list = key() ? Store.read(key(), []) : [];
    return Array.isArray(list)
      ? [...new Set(list.filter((id) => Number.isInteger(id) && id > 0))]
      : [];
  }
  function update() {
    const list = ids();
    document.querySelectorAll(".favorite-btn").forEach((b) => {
      const active = list.includes(Number(b.dataset.pokemonId));
      b.innerHTML = Icons("star");
      b.classList.toggle("is-favorite", active);
      b.setAttribute("aria-pressed", String(active));
      b.setAttribute(
        "aria-label",
        `${active ? "Remover dos favoritos" : "Favoritar"} ${Poke.name(b.dataset.pokemonName)}`,
      );
      b.title = b.getAttribute("aria-label");
    });
    const count = document.querySelector("#favoritesCount");
    if (count) count.textContent = list.length;
  }
  function criarBotao(id, name) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "favorite-btn";
    button.dataset.pokemonId = id;
    button.dataset.pokemonName = name;
    const active = ids().includes(id);
    button.innerHTML = Icons("star");
    button.classList.toggle("is-favorite", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      `${active ? "Remover dos favoritos" : "Favoritar"} ${Poke.name(name)}`,
    );
    button.title = button.getAttribute("aria-label");
    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!Session.require()) return;
      const list = ids(),
        next = list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
      if (!Store.write(key(), next))
        return Interface.mensagem(
          "O navegador não permitiu salvar seus favoritos.",
        );
      window.dispatchEvent(new Event("favoritoschange"));
    };
    return button;
  }
  window.addEventListener("favoritoschange", update);
  window.addEventListener("storage", (e) => {
    if (e.key === key() || e.key === "loggedUser")
      window.dispatchEvent(new Event("favoritoschange"));
  });
  document.addEventListener("DOMContentLoaded", () => {
    update();
    const old = Store.read("pokecompanion.favorites", []),
      user = Session.user(),
      holder = document.querySelector("#legacy-favorites");
    if (
      user &&
      Array.isArray(old) &&
      old.length &&
      !Store.read("poke.imported:" + user.username) &&
      holder
    ) {
      holder.hidden = false;
      holder.querySelector("button").onclick = () => {
        if (
          !Store.write(key(), [
            ...new Set([
              ...ids(),
              ...old.filter((id) => Number.isInteger(id) && id > 0),
            ]),
          ])
        )
          return Interface.mensagem("Não foi possível importar.");
        Store.write("poke.imported:" + user.username, true);
        holder.hidden = true;
        window.dispatchEvent(new Event("favoritoschange"));
      };
    }
  });
  return { ids, criarBotao };
})();
