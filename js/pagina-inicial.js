//----------------------------------------------------
// BUSCAR SPRITE DO BLASTOISE
//----------------------------------------------------
const sprite_blastoise = document.getElementById("blastoise-gif");

fetch("https://pokeapi.co/api/v2/pokemon/blastoise")
  .then(response => response.json())
  .then(data => {
    const sprite_animado =
      data.sprites.versions["generation-v"]["black-white"].animated.front_default;

    sprite_blastoise.src = sprite_animado;
  })
  .catch(error => console.error("Erro ao buscar Pokémon:", error));


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