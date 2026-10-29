import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CORE, BANKS, UI, STYLES } from './build.config.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// Impede que um "</script>" dentro do código feche a tag antes da hora.
const safe = (src) => src.replace(/<\/(script)/gi, '<\\/$1');

const css = STYLES.map(read).join('\n');
const js = [...CORE, ...BANKS, ...UI]
  .map((p) => `/* ---- ${p} ---- */\n${read(p)}`)
  .join('\n;\n');

const page = read('src/index.html')
  .replace('<!-- @STYLES -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- @SCRIPTS -->', () => `<script>\n${safe(js)}\n</script>`);

const dev = `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${page}\n</body>\n</html>\n`;

mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('dist/gh300-platform.html', import.meta.url), page);
writeFileSync(new URL('dist/dev.html', import.meta.url), dev);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log(`dist/gh300-platform.html  ${kb(page)}`);
console.log(`dist/dev.html             ${kb(dev)}`);
console.log(`${CORE.length} core · ${BANKS.length} bancos · ${UI.length} UI · ${STYLES.length} CSS`);
