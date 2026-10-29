// Carrega os scripts (não-módulos) no contexto global do Node, na ordem do build.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CORE, BANKS } from '../build.config.mjs';

const root = new URL('../', import.meta.url);

export function load(paths) {
  for (const p of paths) vm.runInThisContext(readFileSync(new URL(p, root), 'utf8'), { filename: p });
  return globalThis.GHX;
}

export function loadCore() { return load(CORE); }
export function loadAll() { load(CORE); return load(BANKS); }
export function loadRenderers() { return load(['src/ui/renderers.js']); }

const REF = ['https://docs.github.com/copilot'];

// Banco mínimo com um item de cada tipo do motor (inclusive estudo de caso e série
// problema–solução, que a GH-300 não usa), ligado a uma certificação de teste sem regras de formato.
export const FIXTURE = {
  id: 'fx',
  cert: 'TEST-ALL',
  title: 'Fixture',
  minutes: 10,
  track: 'practice',
  cases: [{ id: 'c1', title: 'Contoso', tabs: [{ title: 'Visão geral', html: '<h4>Empresa</h4><p>Texto</p>' }] }],
  ps: [
    { id: 'fx-ps1', d: 6, q: 'Problema', sol: 'Solução A', a: true, exp: 'e', why: 'w', ref: REF },
    { id: 'fx-ps2', d: 6, q: 'Problema', sol: 'Solução B', a: false, exp: 'e', why: 'w', ref: REF },
  ],
  qs: [
    { id: 'fx-c1', case: 'c1', d: 2, type: 'single', q: 'Caso?', o: ['A', 'B'], a: 1, why: ['n', 's'], exp: 'e', ref: REF },
    { id: 'fx-single', d: 1, type: 'single', q: 'Q1', o: ['A', 'B', 'C'], a: 2, why: ['x', 'y', 'z'], exp: 'e', ref: REF },
    { id: 'fx-multi', d: 2, type: 'multi', q: 'Q2', o: ['A', 'B', 'C', 'D'], a: [0, 2], why: ['a', 'b', 'c', 'd'], exp: 'e', ref: REF },
    {
      id: 'fx-match', d: 3, type: 'match', q: 'Q3',
      targets: [{ id: 't1', label: 'T1' }, { id: 't2', label: 'T2' }],
      tiles: [{ id: 'k1', label: 'K1' }, { id: 'k2', label: 'K2' }, { id: 'k3', label: 'K3' }],
      a: { t1: 'k1', t2: 'k2' }, why: { t1: 'w' }, exp: 'e', ref: REF,
    },
    {
      id: 'fx-inline', d: 4, type: 'inline', q: 'Q4', code: 'a: [[g1]]\nb: [[g2]]',
      tokens: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }, { id: 'z', label: 'Z' }],
      a: { g1: 'x', g2: 'y' }, why: { g1: 'w' }, exp: 'e', ref: REF,
    },
    {
      id: 'fx-dd', d: 5, type: 'dropdown', q: 'Q5', code: 'run [[l1]] then [[l2]]',
      lists: { l1: ['a', 'b'], l2: ['c', 'd', 'e'] }, a: { l1: 0, l2: 2 }, why: { l1: 'w' }, exp: 'e', ref: REF,
    },
    {
      id: 'fx-order', d: 5, type: 'order', q: 'Q6',
      o: [{ id: 's1', label: 'S1' }, { id: 's2', label: 'S2' }, { id: 's3', label: 'S3' }, { id: 'x1', label: 'Extra' }],
      a: ['s1', 's2', 's3'], why: { s1: 'w' }, exp: 'e', ref: REF,
    },
    {
      id: 'fx-yn', d: 6, type: 'yesno', q: 'Q7',
      rows: [{ id: 'r1', text: 'R1' }, { id: 'r2', text: 'R2' }, { id: 'r3', text: 'R3' }],
      a: { r1: true, r2: false, r3: true }, why: { r1: 'w' }, exp: 'e', ref: REF,
    },
    {
      id: 'fx-hot', d: 6, type: 'hotspot', q: 'Q8', viewBox: '0 0 100 100',
      svg: '<rect x="0" y="0" width="100" height="100" fill="#eee"/>',
      regions: [
        { id: 'h1', x: 0, y: 0, w: 50, h: 50, label: 'H1' },
        { id: 'h2', x: 50, y: 0, w: 50, h: 50, label: 'H2' },
        { id: 'h3', x: 0, y: 50, w: 50, h: 50, label: 'H3' },
      ],
      a: ['h1', 'h3'], why: { h1: 'w' }, exp: 'e', ref: REF,
    },
  ],
};

export function registerFixture(GHX, id = 'fx') {
  if (GHX.BANKS[id]) return GHX.BANKS[id];
  if (!GHX.CERTS['TEST-ALL']) GHX.CERTS['TEST-ALL'] = { ...GHX.CERTS['GH-300'], id: 'TEST-ALL', format: null };
  const clone = structuredClone(FIXTURE);
  clone.id = id;
  const suffix = id === 'fx' ? '' : '-' + id;
  for (const it of [...clone.ps, ...clone.qs]) it.id += suffix;
  return GHX.registerBank(clone);
}

export const sid = (id, b) => (b.id === 'fx' ? id : id + '-' + b.id);
