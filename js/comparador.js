document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#compareSearch"),
    holder = document.querySelector("#compareCards"),
    status = document.querySelector("#compareStatus");
  const query = new URLSearchParams(location.search).get("ids");
  const old = Store.read("pokemonsComparados", []);
  let ids = query
    ? query.split(",").map(Number)
    : Store.read(
        "poke.compare",
        Array.isArray(old) ? old.map((p) => p.id) : [],
      );
  ids = Array.isArray(ids)
    ? [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(
        0,
        2,
      )
    : [];
  let version = 0,
    adding = false;
  function save() {
    if (!Store.write("poke.compare", ids))
      Interface.mensagem(
        "Não foi possível salvar a comparação neste navegador.",
      );
  }
  function buttons() {
    document.querySelector("#swapCompare").disabled = ids.length !== 2;
    document.querySelector("#clearCompare").disabled = !ids.length;
    document.querySelector("#shareCompare").disabled = ids.length !== 2;
  }
  async function render() {
    const current = ++version;
    buttons();
    Interface.loading(holder);
    document.querySelector("#matchup").hidden = true;
    status.textContent = "";
    try {
      const pokemons = await Promise.all(ids.map(Poke.pokemon));
      if (current !== version) return;
      holder.replaceChildren();
      for (let i = 0; i < 2; i++) {
        const p = pokemons[i];
        if (!p) {
          const empty = document.createElement("div");
          empty.className = "compare-empty";
          empty.innerHTML =
            '<img src="../assets/pokeball-icon.svg" alt=""><h2>Quem entra na comparação?</h2><p>Pesquise um nome ou número acima para preencher este espaço.</p>';
          holder.append(empty);
          continue;
        }
        const card = document.createElement("article");
        card.className = "compare-card";
        card.style = Poke.tone(p);
        card.innerHTML = `<button class="remove-btn" aria-label="Remover ${Poke.name(p.name)} da comparação">${Icons("close")}</button><div class="compare-stage"><a href="sobre-pokemon.html?id=${p.id}" aria-label="Ver detalhes de ${Poke.name(p.name)}"><img src="${Poke.sprite(p)}" alt="${Poke.name(p.name)}"><p class="pokemon-number">${Poke.number(p.id)}</p><h2>${Poke.name(p.name)}</h2></a><div class="pokemon-types">${Poke.badges(p)}</div></div><div class="compare-meta"><span>Altura: ${(p.height / 10).toLocaleString("pt-BR")} m</span><span>Peso: ${(p.weight / 10).toLocaleString("pt-BR")} kg</span></div><div class="mini-panel"><h3>Atributos base</h3>${Poke.statRows(p, pokemons[1 - i])}<div class="stat-total"><span>Total</span><strong>${p.stats.reduce((s, v) => s + v.base_stat, 0)}</strong></div></div><div class="mini-panel"><h3>Habilidades</h3><div class="abilities-list">Carregando…</div></div><div class="mini-panel"><h3>Fraquezas</h3><div class="pokemon-types weak-list">Carregando…</div><p class="comparison-note" style="color:#d8e1eb">Dano recebido por tipo, sem habilidades.</p></div>`;
        card.append(Favoritos.criarBotao(p.id, p.name));
        card.querySelector(".remove-btn").onclick = () => {
          ids.splice(i, 1);
          save();
          render();
        };
        holder.append(card);
        Poke.abilities(p)
          .then((list) => {
            if (current !== version) return;
            card.querySelector(".abilities-list").innerHTML = list
              .map(
                (a) =>
                  `<p>${Poke.escape(a.name)}${!a.translated ? " <small>Nome original</small>" : ""}${a.hidden ? " <small>Habilidade oculta</small>" : ""}</p>`,
              )
              .join("");
          })
          .catch(() => {
            if (current === version)
              card.querySelector(".abilities-list").textContent =
                "Informações indisponíveis.";
          });
        Poke.damage(p)
          .then((data) => {
            if (current === version)
              card.querySelector(".weak-list").innerHTML = Poke.damageBadges(
                data,
                (v) => v > 1,
              );
          })
          .catch(() => {
            if (current === version)
              card.querySelector(".weak-list").textContent =
                "Não foi possível consultar os tipos.";
          });
      }
      if (pokemons.length === 2) {
        status.textContent =
          "Os maiores valores de cada atributo aparecem em amarelo. “=” indica empate.";
        const defense = await Promise.all(pokemons.map(Poke.damage));
        if (current !== version) return;
        const node = document.querySelector("#matchup");
        node.hidden = false;
        node.innerHTML =
          '<h2>Relação entre os tipos</h2><div class="matchup-columns">' +
          pokemons
            .map(
              (p, i) =>
                `<div><h3>${Poke.name(p.name)} → ${Poke.name(pokemons[1 - i].name)}</h3><div class="pokemon-types">${p.types.map((t) => `<span class="type-badge" style="--badge:${Poke.colors[t.type.name]}">${Poke.types[t.type.name]} <strong>×${String(defense[1 - i][t.type.name]).replace(".", ",")}</strong></span>`).join("")}</div><p>Multiplicador defensivo antes de bônus, atributos, golpes e habilidades.</p></div>`,
            )
            .join("") +
          "</div>";
      }
    } catch (error) {
      if (current === version) Interface.error(holder, error, render);
    }
  }
  async function add() {
    if (adding) return;
    if (!input.value.trim())
      return Interface.mensagem("Digite um nome ou número.");
    if (ids.length >= 2)
      return Interface.mensagem("Remova um Pokémon antes de adicionar outro.");
    adding = true;
    const button = document.querySelector(".search-btn");
    button.disabled = true;
    try {
      const p = await Poke.pokemon(input.value);
      if (ids.includes(p.id))
        return Interface.mensagem("Esse Pokémon já está na comparação.");
      ids.push(p.id);
      save();
      input.value = "";
      Interface.mensagem("Pokémon adicionado.", "success");
      render();
    } catch (error) {
      Interface.mensagem(error.message);
    } finally {
      adding = false;
      button.disabled = false;
    }
  }
  Interface.suggestions(input, add);
  document.querySelector(".search-container").onsubmit = (e) => {
    e.preventDefault();
    input.blur();
    add();
  };
  document.querySelector("#swapCompare").onclick = () => {
    ids.reverse();
    save();
    render();
  };
  document.querySelector("#clearCompare").onclick = () => {
    ids = [];
    save();
    render();
  };
  document.querySelector("#shareCompare").onclick = async () => {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("ids", ids.join(","));
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = "Link da comparação copiado.";
    } catch {
      status.textContent = "Copie este endereço: " + url.href;
    }
  };
  render();
});
