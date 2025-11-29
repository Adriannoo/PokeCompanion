const fs = require('fs');
const path = require('path');

// Gera css/types-icons.css a partir de imagens em assets/types/
const projectRoot = path.join(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets', 'types');
const outCss = path.join(projectRoot, 'css', 'types-icons.css');

if (!fs.existsSync(assetsDir)) {
  console.error('Pasta de ícones não encontrada:', assetsDir);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.png', '.svg', '.jpg', '.jpeg'].includes(ext);
});

if (!files.length) {
  console.error('Nenhum arquivo de imagem encontrado em', assetsDir);
  process.exit(1);
}

function normalize(name) {
  // remove prefix type-, substitui espaços/underscores por -, lowercase
  return name.replace(/^type[-_]*/i, '').replace(/\s+/g, '-').replace(/_/g, '-').toLowerCase();
}

let css = `/* Gerado automaticamente por tools/generate-type-css.js */\n`;
css += `.type-icon{background-size:contain;background-repeat:no-repeat;background-position:center;display:inline-block}\n`;
css += `.type-badge{position:relative;display:inline-flex;align-items:center;gap:0.5rem;padding-left:54px;padding-right:12px;border-radius:999px;font-weight:700;color:#fff;height:auto}\n`;
css += `.type-badge::before{content:'';position:absolute;left:12px;width:30px;height:30px;background-size:contain;background-repeat:no-repeat;background-position:center;border-radius:50%}\n\n`;

files.forEach(file => {
  const base = file.replace(/\.[^.]+$/, '');
  let cls = normalize(base);
  // mapeamentos rápidos para nomes que diferem da API
  if (cls === 'fight') cls = 'fighting';
  const rel = path.posix.join('../assets/types', file).replace(/\\/g, '/');
  css += `.type-icon.${cls}{background-image:url("${rel}")}\n`;
  css += `.type-badge.${cls}::before{background-image:url("${rel}")}\n`;
});

fs.writeFileSync(outCss, css, 'utf8');
console.log('Gerado', outCss);
