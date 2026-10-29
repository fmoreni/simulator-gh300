// Ordem de carga dos scripts embutidos no HTML final.
export const CORE = [
  'src/core/registry.js',
  'src/core/model.js',
  'src/core/i18n.js',
  'src/core/scoring.js',
  'src/core/session.js',
  'src/core/storage.js',
  'src/core/progress.js',
];

export const BANKS = [
  'src/banks/_refs.js',
  'src/banks/practice-a.js', // Simulado 01 — Iniciante
  'src/banks/practice-b.js', // Simulado 02 — Iniciante
  'src/banks/s03.js',        // Simulado 03 — Iniciante
  'src/banks/full-a.js',     // Simulado 04 — Intermediário
  'src/banks/full-b.js',     // Simulado 05 — Intermediário
  'src/banks/s06.js',        // Simulado 06 — Intermediário
  'src/banks/s07.js',        // Simulado 07 — Avançado
  'src/banks/s08.js',        // Simulado 08 — Avançado
  'src/banks/s09.js',        // Simulado 09 — Avançado
  'src/banks/s10.js',        // Simulado 10 — Iniciante
  'src/banks/s11.js',        // Simulado 11 — Intermediário
  'src/banks/s12.js',        // Simulado 12 — Avançado
  'src/banks/extensions.js',
  // Versão em inglês das questões (mesmos ids e gabaritos; só os textos mudam).
  'src/banks/en/practice-a.js',
  'src/banks/en/practice-b.js',
  'src/banks/en/s03.js',
  'src/banks/en/full-a.js',
  'src/banks/en/full-b.js',
  'src/banks/en/s06.js',
  'src/banks/en/s07.js',
  'src/banks/en/s08.js',
  'src/banks/en/s09.js',
  'src/banks/en/s10.js',
  'src/banks/en/s11.js',
  'src/banks/en/s12.js',
];

export const UI = [
  'src/ui/dnd.js',
  'src/ui/renderers.js',
  'src/ui/dashboard.js',
  'src/ui/app.js',
];

export const STYLES = ['src/styles.css'];
