document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#authForm"),
    button = document.querySelector("#authBtn"),
    password = document.querySelector("#password");
  let register = false;
  function mode(value) {
    register = value;
    document.querySelector("#authTitle").textContent = value
      ? "Criar conta"
      : "Fazer login";
    button.textContent = value ? "Cadastrar" : "Entrar";
    document.querySelector("#emailField").hidden = !value;
    document.querySelector("#email").required = value;
    document.querySelector("#switchText").textContent = value
      ? "Já tem uma conta?"
      : "Não tem uma conta?";
    document.querySelector("#switchAuth").textContent = value
      ? "Fazer login"
      : "Criar conta";
    password.autocomplete = value ? "new-password" : "current-password";
    password.minLength = value ? 6 : 1;
    const usernameInput = document.querySelector("#username");
    usernameInput.minLength = value ? 3 : 1;
    usernameInput.maxLength = value ? 30 : 80;
    if (value) usernameInput.pattern = "[a-zA-Z0-9_-]+";
    else usernameInput.removeAttribute("pattern");
    Interface.mensagem("");
  }
  document.querySelector("#switchAuth").onclick = () => {
    form.reset();
    mode(!register);
  };
  document.querySelector("#showPassword").onclick = (e) => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Ocultar" : "Mostrar";
    e.currentTarget.setAttribute("aria-pressed", String(show));
  };
  async function hash(text, salt) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(text),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bytes = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new Uint8Array(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    );
    return [...new Uint8Array(bytes)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (button.disabled) return;
    const username = document.querySelector("#username").value.trim(),
      text = password.value,
      email = document.querySelector("#email").value.trim();
    if (
      register &&
      (!/^[a-zA-Z0-9_-]{3,30}$/.test(username) ||
        ["loggedUser", "pokemonsComparados"].includes(username))
    )
      return Interface.mensagem(
        "Use um nome de usuário válido, com 3 a 30 caracteres.",
      );
    button.disabled = true;
    try {
      if (register) {
        if (Store.read(username)) throw new Error("Este usuário já existe.");
        if (!crypto.subtle)
          throw new Error(
            "Abra o projeto em localhost ou HTTPS para criar uma conta.",
          );
        const salt = [...crypto.getRandomValues(new Uint8Array(16))],
          digest = await hash(text, salt);
        if (!Store.write(username, { username, email, salt, digest }))
          throw new Error("O navegador não permitiu salvar a conta.");
        form.reset();
        mode(false);
        Interface.mensagem("Conta criada. Agora você pode entrar.", "success");
      } else {
        const data = Store.read(username);
        if (!data || data.username !== username)
          throw new Error("Usuário não encontrado.");
        const valid = data.digest
          ? (await hash(text, data.salt)) === data.digest
          : data.password === text.trim();
        if (!valid) throw new Error("Senha incorreta.");
        if (!data.digest && crypto.subtle) {
          const salt = [...crypto.getRandomValues(new Uint8Array(16))];
          Store.write(username, {
            username,
            email: data.email,
            salt,
            digest: await hash(text, salt),
          });
        }
        try {
          localStorage.setItem("loggedUser", username);
        } catch {
          throw new Error("O navegador não permitiu iniciar a sessão.");
        }
        location.href = Session.returnUrl();
      }
    } catch (error) {
      Interface.mensagem(error.message);
    } finally {
      button.disabled = false;
    }
  };
  mode(false);
});
