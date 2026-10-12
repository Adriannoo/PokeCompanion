// Escolhe um Pokemon da Pokedex nacional a cada recarga.
const sprite_blastoise = document.getElementById('blastoise-gif');

async function carregarPokemonInicial() {
    try {
        const countResponse = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1');
        if (!countResponse.ok) throw new Error('Catalogo indisponivel');
        const { count } = await countResponse.json();
        let id = Math.floor(Math.random() * count) + 1;
        try {
            const previous = Number(sessionStorage.getItem('homePokemonId'));
            if (count > 1 && id === previous) id = id % count + 1;
            sessionStorage.setItem('homePokemonId', String(id));
        } catch { /* O sorteio funciona mesmo sem armazenamento da sessao. */ }
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!response.ok) throw new Error('Pokemon indisponivel');
        const data = await response.json();
        sprite_blastoise.src = data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
            || data.sprites?.other?.['official-artwork']?.front_default
            || data.sprites?.front_default || '../assets/pokeball-icon.svg';
        sprite_blastoise.alt = data.name;
        sprite_blastoise.title = data.name;
    } catch (error) {
        sprite_blastoise.src = '../assets/pokeball-icon.svg';
        sprite_blastoise.alt = 'Pokemon indisponivel';
        console.warn('Erro ao carregar Pokemon inicial', error);
    }
    sprite_blastoise.onerror = () => {
        sprite_blastoise.onerror = null;
        sprite_blastoise.src = '../assets/pokeball-icon.svg';
    };
}

if (sprite_blastoise) carregarPokemonInicial();

//----------------------------------------------------
// ELEMENTOS DO HEADER
//----------------------------------------------------
const loginBtn = document.querySelector(".login-btn");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");

const loggedUser = localStorage.getItem("loggedUser");


//----------------------------------------------------
// SE O USUÁRIO ESTIVER LOGADO, TROCAR O BOTÃO
//----------------------------------------------------
if (loggedUser) {
    const userData = JSON.parse(localStorage.getItem(loggedUser));

    // mantém estrutura padrão do botão (com <span>)
    loginBtn.innerHTML = `<span>${userData.username}</span>`;

    // impedir navegação para login.html
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();

        positionUserMenu(); // posiciona abaixo do botão

        userMenu.style.display =
            userMenu.style.display === "block" ? "none" : "block";
    });
}


//----------------------------------------------------
// FUNÇÃO PARA POSICIONAR O MENU DO USUÁRIO
//----------------------------------------------------
function positionUserMenu() {
    const rect = loginBtn.getBoundingClientRect();

    const top = rect.top + window.scrollY + rect.height + 4;
    const left = rect.left + window.scrollX;

    userMenu.style.top = top + "px";
    userMenu.style.left = left + "px";
}


//----------------------------------------------------
// LOGOUT
//----------------------------------------------------
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");

    userMenu.style.display = "none";

    // atualiza a página para restabelecer o botão padrão
    window.location.reload();
});


//----------------------------------------------------
// FECHAR MENU AO CLICAR FORA
//----------------------------------------------------
document.addEventListener("click", (e) => {
    if (!loginBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = "none";
    }
});