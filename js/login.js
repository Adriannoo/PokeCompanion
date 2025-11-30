//----------------------------------------------------
// ELEMENTOS DA TELA DE LOGIN/REGISTRO
//----------------------------------------------------
const authBox = document.getElementById('authBox');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authBtn = document.getElementById('authBtn');
const switchText = document.getElementById('switchText');
const switchLink = document.getElementById('switchLink');
const emailField = document.getElementById('emailField');

let isLogin = true; // estado inicial

//----------------------------------------------------
// TROCAR LOGIN <-> REGISTRO
//----------------------------------------------------
switchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;

    if (isLogin) {
        authTitle.textContent = 'Login';
        authBtn.textContent = 'Entrar';
        switchText.textContent = 'Não tem uma conta?';
        switchLink.textContent = 'Registre-se';
        emailField.style.display = 'none';
    } else {
        authTitle.textContent = 'Registrar';
        authBtn.textContent = 'Registrar';
        switchText.textContent = 'Já possui uma conta?';
        switchLink.textContent = 'Faça login';
        emailField.style.display = 'block';
    }

    authForm.reset();
});

//----------------------------------------------------
// SUBMISSÃO DO LOGIN/REGISTRO
//----------------------------------------------------
authForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    //---------------------------
    // REGISTRO
    //---------------------------
    if (!isLogin) {
        if (!email.includes("@")) {
            alert("Digite um e-mail válido!");
            return;
        }

        if (localStorage.getItem(username)) {
            alert("Usuário já existe!");
            return;
        }

        const userData = { email, username, password };
        localStorage.setItem(username, JSON.stringify(userData));

        alert("Registro realizado com sucesso!");

        isLogin = true;
        authTitle.textContent = 'Login';
        authBtn.textContent = 'Entrar';
        switchText.textContent = 'Não tem uma conta?';
        switchLink.textContent = 'Registre-se';
        emailField.style.display = 'none';

        authForm.reset();
        return;
    }

    //---------------------------
    // LOGIN
    //---------------------------
    const stored = localStorage.getItem(username);

    if (!stored) {
        alert("Usuário não encontrado!");
        return;
    }

    const userData = JSON.parse(stored);

    if (userData.password !== password) {
        alert("Senha incorreta!");
        return;
    }

    localStorage.setItem("loggedUser", username);

    alert("Login realizado!");
    window.location.href = "pagina-inicial.html";
});

//----------------------------------------------------
// HEADER - BOTÃO DO USUÁRIO
//----------------------------------------------------
const loginBtn = document.querySelector(".login-btn");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");

const loggedUser = localStorage.getItem("loggedUser");

// Se estiver logado, trocar botão por nome
if (loggedUser && loginBtn) {
    const userData = JSON.parse(localStorage.getItem(loggedUser));
    loginBtn.textContent = userData.username;
}

//----------------------------------------------------
// POSICIONAMENTO EXATO DO MENU
//----------------------------------------------------
function positionUserMenu() {
    const rect = loginBtn.getBoundingClientRect();

    const buttonTop = rect.top + window.scrollY;
    const buttonLeft = rect.left + window.scrollX;

    userMenu.style.top = (buttonTop + rect.height + 4) + "px";
    userMenu.style.left = buttonLeft + "px";
}

//----------------------------------------------------
// ABRIR / FECHAR MENU
//----------------------------------------------------
if (loggedUser) {
    const userData = JSON.parse(localStorage.getItem(loggedUser));
    loginBtn.textContent = userData.username;

    // impede mudança de página
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();

        // reposiciona antes de abrir
        positionUserMenu();

        userMenu.style.display =
            userMenu.style.display === "block" ? "none" : "block";
    });
}

//----------------------------------------------------
// LOGOUT
//----------------------------------------------------
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");

    loginBtn.textContent = "Fazer login";

    userMenu.style.display = "none";

    window.location.href = "login.html";
});

//----------------------------------------------------
// FECHAR MENU AO CLICAR FORA
//----------------------------------------------------
document.addEventListener("click", (e) => {
    if (!loginBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = "none";
    }
});