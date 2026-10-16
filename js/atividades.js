document.addEventListener("DOMContentLoaded", () => {
  const teamPanel = document.querySelector("#teamActivity"),
    quizPanel = document.querySelector("#quizActivity"),
    teamTab = document.querySelector("#teamTab"),
    quizTab = document.querySelector("#quizTab");
  function tab(quiz) {
    Interface.mensagem("");
    teamPanel.hidden = quiz;
    quizPanel.hidden = !quiz;
    teamTab.setAttribute("aria-pressed", String(!quiz));
    quizTab.setAttribute("aria-pressed", String(quiz));
  }
  teamTab.onclick = () => tab(false);
  quizTab.onclick = () => tab(true);
  const saved = Store.read("poke.team", []);
  let ids = Array.isArray(saved)
      ? [
          ...new Set(saved.filter((id) => Number.isInteger(id) && id > 0)),
        ].slice(0, 6)
      : [],
    teamVersion = 0,
    adding = false;
  const input = document.querySelector("#teamSearch");
  async function renderTeam() {
    const current = ++teamVersion,
      node = document.querySelector("#teamSlots"),
      summary = document.querySelector("#teamSummary");
    Interface.loading(node);
    summary.textContent = "";
    document.querySelector("#clearTeam").disabled = !ids.length;
    try {
      const pokemons = await Promise.all(ids.map(Poke.pokemon));
      if (current !== teamVersion) return;
      node.replaceChildren();
      pokemons.forEach((p) => {
        const slot = document.createElement("div");
        slot.className = "team-slot";
        slot.style = Poke.tone(p);
        slot.innerHTML = `<img src="${Poke.sprite(p)}" alt="${Poke.name(p.name)}"><h3>${Poke.name(p.name)}</h3><button class="remove-btn" aria-label="Remover ${Poke.name(p.name)} da equipe">${Icons("close")}</button>`;
        slot.querySelector("button").onclick = () => {
          ids = ids.filter((id) => id !== p.id);
          Store.write("poke.team", ids);
          renderTeam();
        };
        node.append(slot);
      });
      for (let i = pokemons.length; i < 6; i++) {
        const slot = document.createElement("div");
        slot.className = "team-slot empty";
        slot.textContent = String(i + 1).padStart(2, "0");
        node.append(slot);
      }
      if (!pokemons.length) {
        summary.textContent =
          "Procure um Pokémon acima para começar sua equipe.";
        return;
      }
      const totals = {};
      pokemons.forEach((p) =>
        p.types.forEach(
          (t) => (totals[t.type.name] = (totals[t.type.name] || 0) + 1),
        ),
      );
      summary.innerHTML =
        '<div><h3>Tipos na equipe</h3><div class="pokemon-types">' +
        Object.entries(totals)
          .map(
            ([t, n]) =>
              `<span class="type-badge" style="--badge:${Poke.colors[t]}">${Poke.types[t]} · ${n}</span>`,
          )
          .join("") +
        "</div></div>";
      const risks = await Promise.all(pokemons.map(Poke.damage));
      if (current !== teamVersion) return;
      const common = Object.keys(Poke.types)
        .map((t) => [t, risks.filter((r) => r[t] > 1).length])
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1]);
      const p = document.createElement("p");
      p.textContent = common.length
        ? "Fraquezas compartilhadas: " +
          common.map(([t, n]) => `${Poke.types[t]} (${n} Pokémon)`).join(" · ")
        : "Nenhuma fraqueza compartilhada por dois ou mais membros.";
      summary.append(p);
    } catch (error) {
      if (current === teamVersion) Interface.error(node, error, renderTeam);
    }
  }
  async function add() {
    if (adding) return;
    const value = input.value.trim();
    if (!value)
      return Interface.mensagem("Digite um Pokémon para adicionar à equipe.");
    if (ids.length >= 6)
      return Interface.mensagem(
        "Sua equipe já tem seis Pokémon. Remova um para continuar.",
      );
    adding = true;
    const button = teamPanel.querySelector(".search-btn");
    button.disabled = true;
    try {
      const p = await Poke.pokemon(value);
      if (ids.includes(p.id))
        return Interface.mensagem("Esse Pokémon já está na sua equipe.");
      const next = [...ids, p.id];
      if (!Store.write("poke.team", next))
        return Interface.mensagem("Não foi possível salvar sua equipe.");
      ids = next;
      input.value = "";
      Interface.mensagem("Pokémon adicionado à equipe.", "success");
      renderTeam();
    } catch (e) {
      Interface.mensagem(e.message);
    } finally {
      adding = false;
      button.disabled = false;
    }
  }
  Interface.suggestions(input, () => add());
  teamPanel.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    input.blur();
    add();
  };
  document.querySelector("#clearTeam").onclick = () => {
    if (!confirm("Remover todos os Pokémon da equipe?")) return;
    ids = [];
    Store.write("poke.team", ids);
    renderTeam();
  };
  renderTeam();
  const stage = document.querySelector("#quizStage"),
    options = document.querySelector("#quizOptions"),
    feedback = document.querySelector("#quizFeedback"),
    next = document.querySelector("#nextQuiz");
  let score = 0,
    answered = false,
    correct = null,
    questionBusy = false,
    choices = [];
  function quizRecord() {
    const record = Store.read("poke.quiz", { right: 0, total: 0 });
    document.querySelector("#quizRecord").textContent =
      `Histórico local: ${record.right || 0}/${record.total || 0} acertos`;
  }
  async function question() {
    if (questionBusy) return;
    questionBusy = true;
    answered = false;
    next.hidden = true;
    feedback.textContent = "";
    options.replaceChildren();
    Interface.loading(stage);
    try {
      const catalog = await Poke.catalog(),
        selection = [...catalog]
          .filter((p) => p.id <= 151)
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);
      choices = await Promise.all(selection.map((p) => Poke.pokemon(p.id)));
      correct = choices[Math.floor(Math.random() * choices.length)];
      stage.classList.remove("revealed");
      stage.innerHTML = `<img src="${Poke.sprite(correct, false, false)}" alt="Silhueta do Pokémon misterioso">`;
      choices.forEach((p) => {
        const b = document.createElement("button");
        b.className = "button button-secondary";
        b.textContent = Poke.name(p.name);
        b.onclick = () => answer(p, b);
        options.append(b);
      });
    } catch (error) {
      Interface.error(stage, error, question);
    } finally {
      questionBusy = false;
    }
  }
  function answer(p, button) {
    if (answered) return;
    answered = true;
    stage.classList.add("revealed");
    stage.querySelector("img").alt = Poke.name(correct.name);
    const right = p.id === correct.id;
    if (right) score++;
    document.querySelector("#quizScore").textContent = "Pontuação: " + score;
    feedback.textContent = right
      ? "Acertou! É " + Poke.name(correct.name) + "."
      : "É " + Poke.name(correct.name) + ". Tente o próximo!";
    button.classList.add(right ? "correct" : "wrong");
    [...options.children].forEach((b, i) => {
      b.disabled = true;
      if (choices[i].id === correct.id) b.classList.add("correct");
    });
    const record = Store.read("poke.quiz", { right: 0, total: 0 });
    Store.write("poke.quiz", {
      right: (Number(record.right) || 0) + (right ? 1 : 0),
      total: (Number(record.total) || 0) + 1,
    });
    quizRecord();
    next.hidden = false;
  }
  document.querySelector("#startQuiz").onclick = question;
  next.onclick = question;
  quizRecord();
});
