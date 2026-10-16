document.addEventListener("DOMContentLoaded", () => {
  const holder = document.querySelector("#pokemon-detail"),
    id = new URLSearchParams(location.search).get("id") || "9";
  let active = null,
    shiny = false;
  async function start() {
    Interface.loading(holder);
    try {
      const p = await Poke.pokemon(id);
      active = p;
      Poke.remember(p);
      document.title = Poke.name(p.name) + " · PokéCompanion";
      holder.innerHTML = `<article class="detail-card" style="${Poke.tone(p)}"><div class="back-row"><a class="button button-secondary" href="pokedex.html">${Icons("left")} Voltar</a></div><div class="detail-stage"><div class="detail-art" data-type="${p.types[0].type.name}"><div class="sprite-frame"><img class="sprite-normalized" crossorigin="anonymous" src="${Poke.sprite(p)}" alt="${Poke.name(p.name)}" id="detailSprite"></div></div><div class="detail-header"><p class="eyebrow">Conheça este Pokémon</p><h1>${Poke.name(p.name)}</h1><p class="pokemon-number">${Poke.number(p.id)}</p><div class="pokemon-types">${Poke.badges(p)}</div><div class="detail-measures"><div><strong>${(p.height / 10).toLocaleString("pt-BR")} m</strong><span>Altura</span></div><div><strong>${(p.weight / 10).toLocaleString("pt-BR")} kg</strong><span>Peso</span></div></div><button class="button button-secondary shiny-toggle" id="shinyToggle" aria-pressed="false">${Icons("spark")} Ver shiny</button></div></div><div class="detail-tabs" role="tablist" aria-label="Informações do Pokémon">${[
        ["about", "Sobre"],
        ["stats", "Atributos"],
        ["evolution", "Evoluções"],
        ["moves", "Golpes"],
      ]
        .map(
          ([key, label], i) =>
            `<button class="button" role="tab" id="tab-${key}" aria-controls="panel-${key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${key}">${label}</button>`,
        )
        .join("")}</div>${[
        ["about", "Sobre"],
        ["stats", "Atributos"],
        ["evolution", "Evoluções"],
        ["moves", "Golpes"],
      ]
        .map(
          ([key, label], i) =>
            `<section class="detail-panel" id="panel-${key}" role="tabpanel" aria-labelledby="tab-${key}" ${i ? "hidden" : ""}><h2>${label}</h2><div class="panel-body"></div></section>`,
        )
        .join(
          "",
        )}<nav class="detail-nav" aria-label="Próximo Pokémon">${p.id > 1 ? `<a href="sobre-pokemon.html?id=${p.id - 1}">← ${Poke.number(p.id - 1)}</a>` : "<span></span>"}<a href="pokedex.html">Voltar à Pokédex</a><a id="nextPokemon" href="sobre-pokemon.html?id=${p.id + 1}">${Poke.number(p.id + 1)} →</a></nav></article>`;
      holder
        .querySelector(".back-row")
        .append(Favoritos.criarBotao(p.id, p.name));
      const image = document.querySelector("#detailSprite");
      if (image.complete) SpriteLayout.fit(image);
      const shinyButton = document.querySelector("#shinyToggle");
      const bw = p.sprites?.versions?.["generation-v"]?.["black-white"];
      if (!(
        bw?.animated?.front_shiny ||
        bw?.front_shiny ||
        p.sprites?.front_shiny ||
        p.sprites?.other?.["official-artwork"]?.front_shiny
      ))
        shinyButton.hidden = true;
      shinyButton.onclick = () => {
        shiny = !shiny;
        delete image.dataset.fallback;
        image.src = Poke.sprite(p, shiny);
        shinyButton.setAttribute("aria-pressed", String(shiny));
        shinyButton.innerHTML =
          Icons("spark") + (shiny ? " Ver normal" : " Ver shiny");
      };
      document.querySelector("#panel-stats .panel-body").innerHTML =
        Poke.statRows(p) +
        `<div class="stat-total"><span>Total dos atributos base</span><strong>${p.stats.reduce((s, v) => s + v.base_stat, 0)}</strong></div><p class="translation-note">Escala das barras: 0–255. Estes são atributos base, não valores de uma batalha.</p>`;
      const loaded = new Set(["stats"]);
      function select(key) {
        holder.querySelectorAll("[role=tab]").forEach((button) => {
          const current = button.dataset.tab === key;
          button.setAttribute("aria-selected", String(current));
          button.tabIndex = current ? 0 : -1;
          document.querySelector("#panel-" + button.dataset.tab).hidden =
            !current;
        });
        if (!loaded.has(key)) {
          loaded.add(key);
          ({ about: loadAbout, evolution: loadEvolution, moves: loadMoves })[
            key
          ]();
        }
      }
      holder.querySelectorAll("[role=tab]").forEach((button, i, list) => {
        button.onclick = () => select(button.dataset.tab);
        button.onkeydown = (e) => {
          let next = i;
          if (e.key === "ArrowRight") next = (i + 1) % list.length;
          else if (e.key === "ArrowLeft")
            next = (i - 1 + list.length) % list.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = list.length - 1;
          else return;
          e.preventDefault();
          list[next].focus();
          select(list[next].dataset.tab);
        };
      });
      select("about");
      Poke.catalog()
        .then((list) => {
          if (!list.some((v) => v.id === p.id + 1))
            document.querySelector("#nextPokemon").hidden = true;
        })
        .catch(() => {});
    } catch (error) {
      Interface.error(holder, error, start);
    }
  }
  async function loadAbout() {
    const node = document.querySelector("#panel-about .panel-body");
    Interface.loading(node);
    try {
      const [species, abilities, damage] = await Promise.all([
        Poke.get("pokemon-species/" + Poke.idFrom(active.species.url)),
        Poke.abilities(active),
        Poke.damage(active),
      ]);
      const pt = species.flavor_text_entries?.find(
        (e) => e.language.name === "pt-br" || e.language.name === "pt",
      );
      const summary =
        pt?.flavor_text ||
        Poke.summaries[active.id] ||
        `${Poke.name(active.name)} é um Pokémon ${active.types.length > 1 ? "dos tipos" : "do tipo"} ${active.types.map((t) => Poke.types[t.type.name]).join(" e ")}. Mede ${(active.height / 10).toLocaleString("pt-BR")} m e pesa ${(active.weight / 10).toLocaleString("pt-BR")} kg.`;
      const generation = {
        "generation-i": "Kanto · 1ª geração",
        "generation-ii": "Johto · 2ª geração",
        "generation-iii": "Hoenn · 3ª geração",
        "generation-iv": "Sinnoh · 4ª geração",
        "generation-v": "Unova · 5ª geração",
        "generation-vi": "Kalos · 6ª geração",
        "generation-vii": "Alola · 7ª geração",
        "generation-viii": "8ª geração",
        "generation-ix": "Paldea · 9ª geração",
      };
      node.innerHTML = `<div class="detail-about-grid"><div><p>${Poke.escape(summary.replace(/[\n\f]/g, " "))}</p>${!pt ? '<p class="translation-note">Resumo em português elaborado a partir dos dados do Pokémon; não é uma descrição oficial traduzida.</p>' : ""}<h3>Origem</h3><p>${generation[species.generation?.name] || "Informação indisponível"}</p><h3>Habilidades</h3><div class="abilities-list">${abilities.map((a) => `<div><strong>${Poke.escape(a.name)}</strong>${!a.translated ? "<small>Nome original</small>" : ""}${a.hidden ? "<small>Habilidade oculta</small>" : ""}<p>${Poke.escape(a.description || "Descrição em português ainda não disponível.")}</p></div>`).join("")}</div></div><div><h3>Fraquezas</h3><div class="pokemon-types">${Poke.damageBadges(damage, (v) => v > 1)}</div><h3>Resistências</h3><div class="pokemon-types">${Poke.damageBadges(damage, (v) => v > 0 && v < 1)}</div><h3>Imunidades</h3><div class="pokemon-types">${Poke.damageBadges(damage, (v) => v === 0)}</div><p class="translation-note">Dano recebido considerando a combinação de tipos, sem habilidades.</p></div></div>`;
    } catch (error) {
      Interface.error(node, error, loadAbout);
    }
  }
  async function loadEvolution() {
    const node = document.querySelector("#panel-evolution .panel-body");
    Interface.loading(node);
    try {
      const species = await Poke.get(
          "pokemon-species/" + Poke.idFrom(active.species.url),
        ),
        data = await Poke.get(species.evolution_chain.url),
        nodes = [];
      function walk(item, depth = 0) {
        nodes.push({
          id: Poke.idFrom(item.species.url),
          depth,
          details: item.evolution_details,
        });
        item.evolves_to.forEach((child) => walk(child, depth + 1));
      }
      walk(data.chain);
      const list = await Promise.all(
        nodes.map((item) => Poke.pokemon(item.id)),
      );
      node.innerHTML =
        '<p class="translation-note">Ramos diferentes podem apresentar evoluções alternativas; a numeração indica a etapa.</p><div class="evolution-grid">' +
        list
          .map((p, i) => {
            const requirements = nodes[i].details
              .map((d) => {
                const info = [];
                if (d.min_level) info.push("Nível " + d.min_level);
                if (d.item) info.push("Item específico");
                if (d.min_happiness) info.push("Amizade");
                if (d.trigger.name === "trade") info.push("Troca");
                if (d.time_of_day)
                  info.push(
                    d.time_of_day === "day"
                      ? "Durante o dia"
                      : "Durante a noite",
                  );
                return info.join(" · ") || "Condição específica";
              })
              .join(" ou ");
            return `<a class="evolution-item ${p.id === active.id ? "current" : ""}" href="sobre-pokemon.html?id=${p.id}"><small>Etapa ${nodes[i].depth + 1}</small><img src="${Poke.sprite(p)}" alt="${Poke.name(p.name)}"><p>${Poke.number(p.id)}</p><h3>${Poke.name(p.name)}</h3><small>${Poke.escape(requirements || "Forma inicial")}</small></a>`;
          })
          .join("") +
        "</div>";
    } catch (error) {
      Interface.error(node, error, loadEvolution);
    }
  }
  async function loadMoves() {
    const node = document.querySelector("#panel-moves .panel-body");
    node.innerHTML =
      '<div class="move-controls"><input id="moveSearch" placeholder="Filtrar pelo nome do golpe" aria-label="Filtrar golpes por nome"></div><div class="moves-table-wrap"><table class="moves-table"><caption>Golpes registrados na API entre diferentes versões dos jogos. A disponibilidade varia por jogo. “—” indica valor não definido. Nomes em português podem incluir traduções locais de apoio.</caption><thead><tr><th>Golpe</th><th>Tipo</th><th>Categoria</th><th>Potência</th><th>Precisão</th></tr></thead><tbody id="movesBody"></tbody></table></div><p id="movesStatus" class="translation-note" role="status"></p><button class="button moves-load" id="loadMoves">Carregar mais golpes</button>';
    const all = active.moves.map((m) => m.move),
      body = document.querySelector("#movesBody"),
      button = document.querySelector("#loadMoves"),
      search = document.querySelector("#moveSearch");
    let offset = 0,
      busy = false,
      entries = [];
    function display() {
      const query = search.value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const filtered = entries.filter((e) =>
        (e.name + " " + e.data.name)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(query),
      );
      body.innerHTML =
        filtered
          .map(
            (e) =>
              `<tr><td>${Poke.escape(e.name)}${!e.translated ? '<small class="translation-note"> · nome original</small>' : ""}</td><td>${Poke.types[e.data.type.name] || e.data.type.name}</td><td>${{ physical: "Físico", special: "Especial", status: "Status" }[e.data.damage_class.name] || "—"}</td><td>${e.data.power ?? "—"}</td><td>${e.data.accuracy == null ? "—" : e.data.accuracy + "%"}</td></tr>`,
          )
          .join("") ||
        '<tr><td colspan="5">Nenhum golpe nesta seleção. Carregue mais para ampliar a consulta.</td></tr>';
      document.querySelector("#movesStatus").textContent =
        `${entries.length} de ${all.length} golpes carregados; a busca filtra esta lista.`;
    }
    async function load() {
      if (busy) return;
      busy = true;
      button.disabled = true;
      button.textContent = "Carregando…";
      try {
        const batch = await Promise.all(
          all.slice(offset, offset + 12).map(async (m) => {
            const item = await Poke.localized(m.url, Poke.moveNames[m.name]);
            return {
              ...item,
              translated: item.translated || Boolean(Poke.moveNames[m.name]),
            };
          }),
        );
        entries.push(...batch);
        offset += batch.length;
        display();
        button.hidden = offset >= all.length;
      } catch (e) {
        document.querySelector("#movesStatus").textContent = e.message;
      } finally {
        busy = false;
        button.disabled = false;
        button.textContent = "Carregar mais golpes";
      }
    }
    search.oninput = display;
    button.onclick = load;
    load();
  }
  start();
});
