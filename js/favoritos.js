/* Favoritos locais: compartilha apenas IDs entre as telas. */
const Favoritos = (() => {
    const chave = 'pokecompanion.favorites';

    function ids() {
        try {
            const valor = JSON.parse(localStorage.getItem(chave) || '[]');
            if (!Array.isArray(valor)) return [];
            return [...new Set(valor.filter(id => Number.isInteger(id) && id > 0))];
        } catch { return []; }
    }

    function atualizarBotoes() {
        const salvos = new Set(ids());
        document.querySelectorAll('.favorite-btn').forEach(botao => {
            const ativo = salvos.has(Number(botao.dataset.pokemonId));
            botao.textContent = ativo ? '★ Favoritado' : '☆ Favoritar';
            botao.setAttribute('aria-pressed', String(ativo));
            botao.setAttribute('aria-label', `${ativo ? 'Remover dos favoritos' : 'Favoritar'} ${botao.dataset.pokemonName}`);
        });
    }

    function criarBotao(id, nome) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'favorite-btn';
        botao.dataset.pokemonId = id;
        botao.dataset.pokemonName = nome;
        const ativo = ids().includes(id);
        botao.textContent = ativo ? '★ Favoritado' : '☆ Favoritar';
        botao.setAttribute('aria-pressed', String(ativo));
        botao.setAttribute('aria-label', `${ativo ? 'Remover dos favoritos' : 'Favoritar'} ${nome}`);
        botao.addEventListener('click', event => {
            event.stopPropagation();
            const salvos = ids();
            const novos = salvos.includes(id) ? salvos.filter(item => item !== id) : [...salvos, id];
            try {
                localStorage.setItem(chave, JSON.stringify(novos));
                window.dispatchEvent(new Event('favoritoschange'));
            } catch {
                botao.textContent = 'Não foi possível salvar';
            }
        });
        return botao;
    }

    window.addEventListener('favoritoschange', atualizarBotoes);
    window.addEventListener('storage', event => {
        if (event.key === chave) window.dispatchEvent(new Event('favoritoschange'));
    });
    return { ids, criarBotao };
})();
