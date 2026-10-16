const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

// Exercita a lógica real sem rede e sem tocar nos dados de um navegador.
function app(fetcher = async () => ({ ok: true, json: async () => ({}) })) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const document = {
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      dataset: {},
      classList: { toggle() {} },
      setAttribute() {},
      getAttribute() {
        return "";
      },
    }),
  };
  const context = vm.createContext({
    document,
    window: { addEventListener() {}, dispatchEvent() {} },
    localStorage: storage,
    sessionStorage: { ...storage, getItem: () => null, setItem() {} },
    location: {
      href: "https://example.test/html/login.html",
      origin: "https://example.test",
      pathname: "/html/login.html",
      search: "",
    },
    URL,
    URLSearchParams,
    AbortController,
    Event,
    setTimeout,
    clearTimeout,
    fetch: fetcher,
    console,
  });
  for (const file of ["dados.js", "interface.js", "favoritos.js"])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "../js", file), "utf8"),
      context,
      { filename: file },
    );
  return { context, storage, run: (code) => vm.runInContext(code, context) };
}

test("visitante não lê a lista global antiga nem salva um favorito", () => {
  const env = app();
  env.storage.setItem("pokecompanion.favorites", "[1,9]");
  assert.equal(env.run("Favoritos.ids().length"), 0);
  env.run(
    "Favoritos.criarBotao(25,'pikachu').onclick({preventDefault(){},stopPropagation(){}})",
  );
  assert.equal(env.storage.getItem("pokecompanion.favorites"), "[1,9]");
  assert.equal(env.storage.getItem("pokecompanion.favorites:null"), null);
});
test("favoritos ficam isolados por conta e a lista antiga não é atribuída automaticamente", () => {
  const env = app();
  for (const user of ["ana", "bia"])
    env.storage.setItem(user, JSON.stringify({ username: user }));
  env.storage.setItem("loggedUser", "ana");
  env.storage.setItem("pokecompanion.favorites", "[99]");
  env.run(
    "Favoritos.criarBotao(9,'blastoise').onclick({preventDefault(){},stopPropagation(){}})",
  );
  assert.equal(env.run("Favoritos.ids().join()"), "9");
  env.storage.setItem("loggedUser", "bia");
  assert.equal(env.run("Favoritos.ids().length"), 0);
  env.storage.setItem("loggedUser", "ana");
  assert.equal(env.run("Favoritos.ids().join()"), "9");
});
test("toggle remove favorito e listas inválidas são normalizadas", () => {
  const env = app();
  env.storage.setItem("ana", '{"username":"ana"}');
  env.storage.setItem("loggedUser", "ana");
  env.storage.setItem("pokecompanion.favorites:ana", '[9,9,-1,"25",null]');
  assert.equal(env.run("Favoritos.ids().join()"), "9");
  env.run(
    "Favoritos.criarBotao(9,'blastoise').onclick({preventDefault(){},stopPropagation(){}})",
  );
  assert.equal(env.run("Favoritos.ids().length"), 0);
});
test("sessão inválida e JSON corrompido não quebram a página", () => {
  const env = app();
  env.storage.setItem("loggedUser", "ana");
  env.storage.setItem("ana", "{");
  assert.equal(env.run("Session.user()"), null);
  env.storage.setItem("ana", '{"username":"bia"}');
  assert.equal(env.run("Session.user()"), null);
});
test("armazenamento bloqueado produz falha controlada", () => {
  const env = app();
  env.context.localStorage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
    removeItem() {
      throw Error("blocked");
    },
  };
  assert.equal(env.run('Store.write("x",[1])'), false);
  assert.equal(env.run('Store.read("x",12)'), 12);
  assert.equal(env.run("Session.user()"), null);
});
test("retorno do login rejeita domínio externo e preserva página interna", () => {
  const env = app();
  env.context.location.search =
    "?retorno=https%3A%2F%2Fother.test%2Fhtml%2Fpokedex.html";
  assert.equal(env.run("Session.returnUrl()"), "pagina-inicial.html");
  env.context.location.search =
    "?retorno=%2Fhtml%2Fsobre-pokemon.html%3Fid%3D9";
  assert.equal(env.run("Session.returnUrl()"), "/html/sobre-pokemon.html?id=9");
});
test("consultas simultâneas compartilham uma requisição e depois usam cache", async () => {
  let calls = 0;
  const env = app(async () => {
    calls++;
    return { ok: true, json: async () => ({ id: 9, name: "blastoise" }) };
  });
  await env.run("Promise.all([Poke.pokemon(9),Poke.pokemon(9)])");
  await env.run("Poke.pokemon(9)");
  assert.equal(calls, 1);
});
test("falha na API pode ser tentada novamente sem cache de erro", async () => {
  let calls = 0;
  const env = app(async () => {
    calls++;
    return { ok: calls > 1, status: 503, json: async () => ({ id: 9 }) };
  });
  await assert.rejects(env.run("Poke.pokemon(9)"), /indisponível/);
  assert.equal((await env.run("Poke.pokemon(9)")).id, 9);
  assert.equal(calls, 2);
});
test("catálogo usa os IDs de espécies retornados, sem incluir formas alternativas", async () => {
  const env = app(async () => ({
    ok: true,
    json: async () => ({
      results: [
        { name: "mew", url: "https://pokeapi.co/api/v2/pokemon-species/151/" },
      ],
    }),
  }));
  assert.equal((await env.run("Poke.catalog()"))[0].id, 151);
});

test("busca por número aceita cerquilha e zeros à esquerda", async () => {
  let requested = "";
  const env = app(async (url) => {
    requested = url;
    return { ok: true, json: async () => ({ id: 9 }) };
  });
  await env.run('Poke.pokemon("#0009")');
  assert.equal(requested, "https://pokeapi.co/api/v2/pokemon/9");
});
test("dano de dois tipos combina fraqueza, resistência e imunidade", async () => {
  const data = {
    fire: {
      double_damage_from: [{ name: "water" }, { name: "rock" }],
      half_damage_from: [{ name: "grass" }],
      no_damage_from: [],
    },
    flying: {
      double_damage_from: [{ name: "rock" }],
      half_damage_from: [{ name: "grass" }],
      no_damage_from: [{ name: "ground" }],
    },
  };
  const env = app(async (url) => ({
    ok: true,
    json: async () => ({ damage_relations: data[url.split("/").pop()] }),
  }));
  const result = await env.run(
    'Poke.damage({types:[{type:{name:"fire"}},{type:{name:"flying"}}]})',
  );
  assert.equal(result.rock, 4);
  assert.equal(result.grass, 0.25);
  assert.equal(result.ground, 0);
  assert.equal(result.water, 2);
});
test("nome em pt-BR é priorizado quando existe", async () => {
  const env = app(async () => ({
    ok: true,
    json: async () => ({
      name: "sample",
      names: [
        { name: "English", language: { name: "en" } },
        { name: "Em português", language: { name: "pt-br" } },
      ],
      effect_entries: [],
    }),
  }));
  const result = await env.run('Poke.localized("ability/1")');
  assert.equal(result.name, "Em português");
  assert.equal(result.translated, true);
});
test("nomes externos são escapados e a escala dos atributos é limitada", () => {
  const env = app();
  assert.equal(env.run('Poke.escape("<img>")'), "&lt;img&gt;");
  assert.match(
    env.run('Poke.statRows({stats:[{stat:{name:"hp"},base_stat:300}]})'),
    /width:100%/,
  );
});
