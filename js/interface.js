/* Textos compartilhados e mensagens visíveis na própria página. */
const Interface = (() => {
    const tipos = {
        water: 'Água', ice: 'Gelo', rock: 'Pedra', steel: 'Metal', normal: 'Normal',
        poison: 'Veneno', psychic: 'Psíquico', fighting: 'Lutador', fire: 'Fogo',
        flying: 'Voador', ghost: 'Fantasma', grass: 'Planta', electric: 'Elétrico',
        fairy: 'Fada', dark: 'Sombrio', dragon: 'Dragão', bug: 'Inseto', ground: 'Terrestre'
    };
    const stats = {
        hp: 'HP', attack: 'Ataque', defense: 'Defesa', 'special-attack': 'Atq. especial',
        'special-defense': 'Def. especial', speed: 'Velocidade'
    };
    function mensagem(texto, tipo = 'error') {
        const aviso = document.getElementById('feedback');
        if (!aviso) return;
        aviso.hidden = !texto;
        aviso.textContent = texto;
        aviso.dataset.kind = tipo;
        aviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    }
    return { tipo: nome => tipos[nome] || nome, stat: nome => stats[nome] || nome, mensagem };
})();
