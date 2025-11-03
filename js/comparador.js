const apiURL = "https://pokeapi.co/api/v2/pokemon/";
let pokemonsSelecionados = [];

const input = document.getElementById("pokemonSearch");
const addBtn = document.getElementById("addPokemonBtn");
const cards = [document.getElementById("pokemon1"), document.getElementById("pokemon2")];

// Carregar do localStorage
window.addEventListener("load", () => {
  const salvos = JSON.parse(localStorage.getItem("pokemonsComparados")) || [];
  pokemonsSelecionados = salvos;
  atualizarCards();
});

// Buscar Pokémon
addBtn.addEventListener("click", async () => {
  const nome = input.value.trim().toLowerCase();
  if (!nome) return alert("Digite o nome de um Pokémon!");

  try {
    const res = await fetch(apiURL + nome);
    if (!res.ok) throw new Error("Pokémon não encontrado!");
    const data = await res.json();

    if (pokemonsSelecionados.length >= 2) {
      alert("Limite de 2 Pokémons. Remova um antes de adicionar outro.");
      return;
    }

    pokemonsSelecionados.push(data);
    localStorage.setItem("pokemonsComparados", JSON.stringify(pokemonsSelecionados));
    atualizarCards();
    input.value = "";

  } catch (error) {
    alert("Erro ao buscar Pokémon: " + error.message);
  }
});

// Atualizar interface
function atualizarCards() {
  cards.forEach((card, index) => {
    const pokemon = pokemonsSelecionados[index];
    if (pokemon) {
      card.innerHTML = `
        <button class="remove-btn" onclick="removerPokemon(${index})">X</button>
        <img class="pokemon-img" src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h2>#${pokemon.id.toString().padStart(4, "0")} - ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
        <p>Altura: ${(pokemon.height / 10).toFixed(1)}m | Peso: ${(pokemon.weight / 10).toFixed(1)}kg</p>
        <p><strong>Tipos:</strong> ${pokemon.types.map(t => t.type.name).join(", ")}</p>
        <p><strong>Habilidades:</strong> ${pokemon.abilities.map(a => a.ability.name).join(", ")}</p>
        <h3>Estatísticas</h3>
        ${pokemon.stats.map(s => `
          <div class="stat">
            <span>${s.stat.name.toUpperCase()}</span>
            <span>${s.base_stat}</span>
          </div>
        `).join("")}
      `;
    } else {
      card.innerHTML = `<p class="placeholder-text">Selecione um Pokémon</p>`;
    }
  });
}

// Remover Pokémon
function removerPokemon(index) {
  pokemonsSelecionados.splice(index, 1);
  localStorage.setItem("pokemonsComparados", JSON.stringify(pokemonsSelecionados));
  atualizarCards();
}
