/* Dados compartilhados. Cache em memória, na sessão e de requisições em andamento. */
const Poke = (() => {
  const API = "https://pokeapi.co/api/v2/",
    cache = new Map(),
    pending = new Map();
  const types = {
    water: "Água",
    ice: "Gelo",
    rock: "Pedra",
    steel: "Metal",
    normal: "Normal",
    poison: "Veneno",
    psychic: "Psíquico",
    fighting: "Lutador",
    fire: "Fogo",
    flying: "Voador",
    ghost: "Fantasma",
    grass: "Planta",
    electric: "Elétrico",
    fairy: "Fada",
    dark: "Sombrio",
    dragon: "Dragão",
    bug: "Inseto",
    ground: "Terrestre",
  };
  const colors = {
    water: "#6cbde4",
    ice: "#8cddd4",
    rock: "#d7cd90",
    steel: "#58a6aa",
    normal: "#a3a49e",
    poison: "#c261d4",
    psychic: "#fe9f92",
    fighting: "#e74347",
    fire: "#fbae46",
    flying: "#a6c2f2",
    ghost: "#7773d4",
    grass: "#5ac178",
    electric: "#fbe273",
    fairy: "#f3a7e7",
    dark: "#6e7587",
    dragon: "#378bd0",
    bug: "#afc836",
    ground: "#d29463",
  };
  const stats = {
    hp: "HP",
    attack: "Ataque",
    defense: "Defesa",
    "special-attack": "Atq. especial",
    "special-defense": "Def. especial",
    speed: "Velocidade",
  };
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const name = (v) =>
    String(v || "")
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  const number = (id) => `#${String(id).padStart(4, "0")}`;
  const idFrom = (url) => Number(String(url).split("/").filter(Boolean).pop());
  async function get(path) {
    const key = path.startsWith(API) ? path.slice(API.length) : path;
    if (/^https?:/.test(key)) throw new Error("Endereço de dados inválido.");
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("poke.data:" + key) || "null",
      );
      if (saved && Date.now() - saved.at < 86400000) {
        cache.set(key, saved.data);
        return saved.data;
      }
    } catch {}
    const task = (async () => {
      const controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(API + key, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Pokémon não encontrado."
              : "A PokéAPI está indisponível. Tente novamente.",
          );
        const data = await response.json();
        cache.set(key, data);
        try {
          sessionStorage.setItem(
            "poke.data:" + key,
            JSON.stringify({ at: Date.now(), data }),
          );
        } catch {}
        return data;
      } catch (error) {
        if (error.name === "AbortError")
          throw new Error("A consulta demorou demais. Tente novamente.");
        if (error instanceof TypeError)
          throw new Error(
            "Não foi possível consultar a PokéAPI. Confira sua conexão.",
          );
        throw error;
      } finally {
        clearTimeout(timeout);
        pending.delete(key);
      }
    })();
    pending.set(key, task);
    return task;
  }
  async function catalog() {
    return (await get("pokemon-species?limit=2000")).results.map((p) => ({
      id: idFrom(p.url),
      name: p.name,
    }));
  }
  const pokemon = (id) => {
    const value = String(id).trim().toLowerCase().replace(/^#/, "");
    return get(
      "pokemon/" +
        encodeURIComponent(/^\d+$/.test(value) ? String(Number(value)) : value),
    );
  };
  function sprite(p, shiny = false, animated = true) {
    const bw = p.sprites?.versions?.["generation-v"]?.["black-white"],
      suffix = shiny ? "front_shiny" : "front_default";
    return (
      (animated && bw?.animated?.[suffix]) ||
      bw?.[suffix] ||
      p.sprites?.[suffix] ||
      p.sprites?.other?.["official-artwork"]?.[suffix] ||
      "../assets/pokeball-icon.svg"
    );
  }
  function tone(p) {
    const color = colors[p.types?.[0]?.type.name] || colors.normal;
    const dark =
      "#" +
      [1, 3, 5]
        .map((i) =>
          Math.round(parseInt(color.slice(i, i + 2), 16) * 0.29)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    return `--type-color:${color};--type-dark:${dark}`;
  }
  const badges = (p) =>
    (p.types || [])
      .map(
        (t) =>
          `<span class="type-badge" style="--badge:${colors[t.type.name] || colors.normal}"><img src="../assets/types/tipos-desenho/${escape(t.type.name)}.svg" alt="">${types[t.type.name] || escape(t.type.name)}</span>`,
      )
      .join("");
  function statRows(p, other = null) {
    return p.stats
      .map((s, i) => {
        const delta = other ? s.base_stat - other.stats[i].base_stat : 0;
        return `<div class="stat-row ${other && delta > 0 ? "stat-leading" : ""}"><span>${stats[s.stat.name] || escape(s.stat.name)}</span><span class="stat-track"><span style="width:${Math.min(100, (s.base_stat / 255) * 100)}%"></span></span><strong>${s.base_stat}</strong>${other ? `<small>${delta > 0 ? "+" + delta : delta === 0 ? "=" : delta}</small>` : ""}</div>`;
      })
      .join("");
  }
  async function damage(p) {
    const result = Object.fromEntries(Object.keys(types).map((t) => [t, 1]));
    const data = await Promise.all(
      p.types.map((t) => get("type/" + t.type.name)),
    );
    data.forEach((item) => {
      for (const [rel, factor] of [
        ["double_damage_from", 2],
        ["half_damage_from", 0.5],
        ["no_damage_from", 0],
      ])
        item.damage_relations[rel].forEach((t) => (result[t.name] *= factor));
    });
    return result;
  }
  function damageBadges(data, test) {
    const items = Object.entries(data).filter(([, v]) => test(v));
    return items.length
      ? items
          .map(
            ([t, v]) =>
              `<span class="type-badge" style="--badge:${colors[t]}">${types[t]} <strong>×${String(v).replace(".", ",")}</strong></span>`,
          )
          .join("")
      : '<span class="muted">Nenhuma.</span>';
  }
  const summaries = {
    1: "Um Pokémon de Planta e Veneno. A semente em suas costas cresce junto com ele.",
    2: "A planta em suas costas se desenvolve e forma um botão de flor.",
    3: "A grande flor em suas costas aproveita a luz do sol.",
    4: "A chama na ponta da cauda faz parte de sua aparência característica.",
    5: "Usa suas garras e a chama da cauda para se defender.",
    6: "Um Pokémon de Fogo e Voador, reconhecido por suas asas e pela chama na cauda.",
    7: "Um Pokémon de Água que usa seu casco como proteção.",
    8: "Seu casco e sua cauda são características marcantes desta evolução.",
    9: "Um Pokémon de Água com dois canhões em seu casco, usados para lançar jatos de água.",
    25: "Armazena eletricidade nas bolsas de suas bochechas.",
    39: "É conhecido por seu corpo arredondado e por seu canto.",
    94: "Um Pokémon de Fantasma e Veneno que costuma se esconder nas sombras.",
    133: "Pode evoluir de diversas maneiras, dependendo das condições.",
    143: "Conhecido pelo grande porte e pelo hábito de dormir.",
    149: "Um Pokémon de Dragão e Voador que pode percorrer grandes distâncias.",
    150: "Um Pokémon de tipo Psíquico criado a partir de pesquisas genéticas.",
    151: "Um Pokémon mítico de tipo Psíquico, associado à diversidade genética dos Pokémon.",
  };
  const abilityNames = {
    torrent: "Torrente",
    overgrow: "Supercrescimento",
    blaze: "Chama",
    "rain-dish": "Prato de Chuva",
    chlorophyll: "Clorofila",
    "solar-power": "Poder Solar",
    static: "Estática",
    "lightning-rod": "Para-raios",
    levitate: "Levitação",
    intimidate: "Intimidação",
    "run-away": "Fuga",
    adaptability: "Adaptabilidade",
    anticipation: "Antecipação",
    "thick-fat": "Gordura Espessa",
    immunity: "Imunidade",
    gluttony: "Gula",
    pressure: "Pressão",
    "inner-focus": "Foco Interno",
    multiscale: "Multiescamas",
    synchronize: "Sincronismo",
  };
  const moveNames = {
    tackle: "Investida",
    scratch: "Arranhão",
    growl: "Rosnado",
    "tail-whip": "Chicote de Cauda",
    "water-gun": "Jato de Água",
    bubble: "Bolha",
    "bubble-beam": "Raio de Bolhas",
    "hydro-pump": "Hidrobomba",
    surf: "Surfar",
    "aqua-tail": "Cauda de Água",
    "water-pulse": "Pulso de Água",
    withdraw: "Recuar",
    "shell-smash": "Quebra de Casco",
    "skull-bash": "Cabeçada",
    bite: "Mordida",
    crunch: "Triturar",
    "ice-beam": "Raio de Gelo",
    blizzard: "Nevasca",
    "rapid-spin": "Giro Rápido",
    "flash-cannon": "Canhão de Luz",
    "rain-dance": "Dança da Chuva",
    protect: "Proteção",
    rest: "Descanso",
    "sleep-talk": "Falar Dormindo",
    "iron-defense": "Defesa de Ferro",
    "iron-tail": "Cauda de Ferro",
    "dragon-tail": "Cauda de Dragão",
    "dragon-pulse": "Pulso do Dragão",
    earthquake: "Terremoto",
    "body-slam": "Pancada Corporal",
    "double-edge": "Gume Duplo",
    headbutt: "Cabeçada",
    dig: "Cavar",
    strength: "Força",
    return: "Retorno",
    frustration: "Frustração",
    "hidden-power": "Poder Oculto",
    "hyper-beam": "Hiper-raio",
    "giga-impact": "Giga Impacto",
    toxic: "Tóxico",
    substitute: "Substituto",
    confide: "Confidência",
    roar: "Rugido",
    "mega-punch": "Soco Poderoso",
    "mega-kick": "Chute Poderoso",
    "ice-punch": "Soco de Gelo",
    counter: "Contra-ataque",
    "seismic-toss": "Arremesso Sísmico",
    submission: "Submissão",
    "double-team": "Equipe Dupla",
    "focus-punch": "Soco Concentrado",
    "focus-blast": "Explosão Focal",
    "brick-break": "Quebra-telha",
    "rock-slide": "Deslizamento de Pedras",
    "rock-tomb": "Tumba de Pedras",
    "rock-smash": "Quebra-pedra",
    round: "Canto em Coro",
    scald: "Escaldar",
    waterfall: "Cachoeira",
    whirlpool: "Redemoinho",
    dive: "Mergulho",
    ember: "Brasa",
    flamethrower: "Lança-chamas",
    "fire-blast": "Explosão de Fogo",
    "vine-whip": "Chicote de Vinha",
    "razor-leaf": "Folha Navalha",
    "solar-beam": "Raio Solar",
    thunderbolt: "Choque do Trovão",
    "thunder-shock": "Choque Elétrico",
    thunder: "Trovão",
    "quick-attack": "Ataque Rápido",
  };
  async function localized(path, fallback) {
    const data = await get(path),
      pt = data.names?.find(
        (n) => n.language.name === "pt-br" || n.language.name === "pt",
      ),
      description = (
        data.flavor_text_entries ||
        data.effect_entries ||
        []
      ).find((n) => n.language?.name === "pt-br" || n.language?.name === "pt");
    return {
      data,
      name: pt?.name || fallback || name(data.name),
      translated: !!pt,
      description: (
        description?.flavor_text ||
        description?.effect ||
        ""
      ).replace(/[\n\f]/g, " "),
    };
  }
  async function abilities(p) {
    return Promise.all(
      p.abilities.map(async (a) => {
        try {
          const localizedAbility = await localized(
            a.ability.url,
            abilityNames[a.ability.name],
          );
          return {
            ...localizedAbility,
            translated:
              localizedAbility.translated ||
              Boolean(abilityNames[a.ability.name]),
            hidden: a.is_hidden,
          };
        } catch {
          return {
            name: abilityNames[a.ability.name] || name(a.ability.name),
            description: "Descrição indisponível.",
            translated: Boolean(abilityNames[a.ability.name]),
            hidden: a.is_hidden,
          };
        }
      }),
    );
  }
  function remember(p) {
    const current = Store.read("poke.recent", []);
    Store.write(
      "poke.recent",
      [
        p.id,
        ...(Array.isArray(current) ? current : []).filter((id) => id !== p.id),
      ].slice(0, 8),
    );
  }
  return {
    get,
    catalog,
    pokemon,
    types,
    colors,
    stats,
    name,
    number,
    idFrom,
    sprite,
    tone,
    badges,
    statRows,
    damage,
    damageBadges,
    localized,
    abilities,
    summaries,
    moveNames,
    remember,
    escape,
  };
})();
