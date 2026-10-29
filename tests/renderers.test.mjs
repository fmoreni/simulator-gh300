import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore, loadRenderers, registerFixture } from './helpers.mjs';

const GHX = loadCore();
loadRenderers();
const bank = registerFixture(GHX);
const R = GHX.Render;
const item = (id) => GHX.getItem(id);
const att = GHX.Session.create(bank, { now: 0, rng: GHX.Session.seeded(3) });

// Respostas vazia, parcial e completa (correta) para cada tipo.
const STATES = {
  'fx-single': [undefined, undefined, 2],
  'fx-ps1': [undefined, undefined, true],
  'fx-multi': [undefined, [0], [0, 2]],
  'fx-match': [undefined, { t1: 'k1' }, { t1: 'k1', t2: 'k2' }],
  'fx-inline': [undefined, { g1: 'x' }, { g1: 'x', g2: 'y' }],
  'fx-dd': [undefined, { l1: 0 }, { l1: 0, l2: 2 }],
  'fx-order': [undefined, ['s1'], ['s1', 's2', 's3']],
  'fx-yn': [undefined, { r1: true }, { r1: true, r2: false, r3: true }],
  'fx-hot': [undefined, ['h1'], ['h1', 'h3']],
};

const count = (html, re) => (html.match(re) || []).length;
const render = (id, resp, extra = {}) => R.item(item(id), { resp, shuffle: att.shuffle[id], ...extra });

for (const [id, [empty, partial, full]] of Object.entries(STATES)) {
  const it = item(id);

  test(`${it.type}: estado vazio`, () => {
    const h = render(id, empty);
    assert.match(h, new RegExp(`data-item="${id}"`));
    assert.match(h, /class="instr"/);
    assert.doesNotMatch(h, /class="feedback/);
    assert.doesNotMatch(h, / checked/);
    assert.doesNotMatch(h, /class="tile"[^>]*data-from/);
    assert.equal(count(h, /class="hs on"/g), 0);
  });

  if (partial !== undefined) {
    test(`${it.type}: estado parcial`, () => {
      const h = render(id, partial);
      assert.equal(GHX.Scoring.isComplete(it, partial), false);
      assert.ok(GHX.Scoring.isAnswered(it, partial));
      assert.doesNotMatch(h, /class="feedback/);
    });
  }

  test(`${it.type}: estado completo`, () => {
    const h = render(id, full);
    assert.ok(GHX.Scoring.isComplete(it, full));
    assert.doesNotMatch(h, /class="feedback/);
  });

  test(`${it.type}: estado corrigido (certo e errado)`, () => {
    const ok = render(id, full, { checked: true, locked: true });
    assert.match(ok, /class="feedback ok"/);
    assert.match(ok, /Resposta correta/);
    assert.match(ok, /docs\.github\.com\/copilot/);
    assert.match(ok, /is-checked/);
    const bad = render(id, empty, { checked: true, locked: true });
    assert.match(bad, /class="feedback bad"/);
    assert.match(bad, /\(sem resposta\)/);
    if (partial !== undefined) assert.match(render(id, partial, { checked: true }), /class="feedback part"/);
  });
}

test('single: segue a ordem embaralhada e marca a escolha', () => {
  const sh = { o: [2, 0, 1] };
  const h = R.item(item('fx-single'), { resp: 0, shuffle: sh });
  const order = [...h.matchAll(/data-i="(\d)"/g)].map((m) => +m[1]);
  assert.deepEqual(order, [2, 0, 1]);
  assert.equal(count(h, / checked/g), 1);
});

test('multi: desabilita as demais ao atingir o limite', () => {
  const h = render('fx-multi', [0, 2]);
  assert.equal(count(h, /type="checkbox"[^>]*disabled/g), 2);
});

test('match: tile colocado sai da origem quando não há reuse', () => {
  const h = render('fx-match', { t1: 'k1' });
  assert.equal(count(h, /data-tile="k1"/g), 1);
  assert.match(h, /data-tile="k1"[^>]*data-from="t1"/);
  assert.match(h, /class="divider"/);
});

test('inline: lacunas viram alvos dentro do código', () => {
  const h = render('fx-inline', { g1: 'x' });
  assert.match(h, /<pre class="code">a: <span class="gap zone"/);
  assert.match(h, /data-zone="g2"/);
});

test('dropdown: listas dentro do bloco de código, com opção vazia', () => {
  const h = render('fx-dd', { l1: 1 });
  assert.equal(count(h, /<select/g), 2);
  assert.match(h, /<option value="1" selected>b<\/option>/);
  const txt = R.item({ ...item('fx-dd'), code: undefined, text: 'Use [[l1]] e [[l2]]' }, {});
  assert.match(txt, /class="dd-text"/);
});

test('order: lista numerada, botões de mover e alvo final', () => {
  const h = render('fx-order', ['s2', 's1']);
  assert.match(h, /data-zone="pos:2"/);
  assert.equal(count(h, /data-act="order-move"/g), 4);
  assert.match(h, /aria-label="Mover para cima" disabled/);
});

test('yesno: rótulos personalizados', () => {
  const tf = { ...item('fx-yn'), labels: ['Verdadeiro', 'Falso'] };
  const h = R.item(tf, { resp: { r1: false } });
  assert.match(h, /<th>Verdadeiro<\/th><th>Falso<\/th>/);
  assert.equal(count(h, / checked/g), 1);
});

test('ps: mostra a solução e Sim/Não', () => {
  const h = render('fx-ps2', false);
  assert.match(h, /Solução:<\/strong> Solução B/);
  assert.match(h, /data-val="false" checked/);
});

test('hotspot: regiões acessíveis e bloqueio após o limite', () => {
  const h = render('fx-hot', ['h1', 'h3']);
  assert.match(h, /role="checkbox" aria-checked="true" aria-label="H1"/);
  assert.match(h, /data-region="h2"[^>]*tabindex="-1"/);
});

test('travado: entradas desabilitadas', () => {
  const h = render('fx-single', 1, { locked: true });
  assert.equal(count(h, /type="radio"[^>]*disabled/g), 3);
  assert.match(h, /is-locked/);
});

test('escapa HTML do conteúdo', () => {
  const h = R.item({ ...item('fx-single'), q: '<script>x</script> `a<b>`' }, {});
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /<code>a&lt;b&gt;<\/code>/);
});

// ---------- atualização de respostas ----------

test('update: multi respeita limite n', () => {
  const it = item('fx-multi');
  let r = R.update(it, null, { kind: 'multi', i: 3, on: true });
  r = R.update(it, r, { kind: 'multi', i: 0, on: true });
  assert.deepEqual(r, [0, 3]);
  assert.deepEqual(R.update(it, r, { kind: 'multi', i: 1, on: true }), [0, 3]);
  assert.deepEqual(R.update(it, r, { kind: 'multi', i: 3, on: false }), [0]);
  assert.equal(R.update(it, [0], { kind: 'multi', i: 0, on: false }), null);
});

test('update: place/unplace com e sem reuse', () => {
  const it = item('fx-match');
  let r = R.update(it, null, { kind: 'place', tile: 'k1', zone: 't1' });
  r = R.update(it, r, { kind: 'place', tile: 'k1', zone: 't2' });
  assert.deepEqual(r, { t2: 'k1' });
  r = R.update(it, r, { kind: 'place', tile: 'k1', from: 't2', zone: 't1' });
  assert.deepEqual(r, { t1: 'k1' });
  const reuse = { ...it, reuse: true };
  r = R.update(reuse, { t1: 'k1' }, { kind: 'place', tile: 'k1', zone: 't2' });
  assert.deepEqual(r, { t1: 'k1', t2: 'k1' });
  assert.equal(R.update(it, { t1: 'k1' }, { kind: 'unplace', zone: 't1' }), null);
});

test('update: order add/move/remove', () => {
  const it = item('fx-order');
  let r = R.update(it, null, { kind: 'order-add', tile: 's2' });
  r = R.update(it, r, { kind: 'order-add', tile: 's1', at: 0 });
  r = R.update(it, r, { kind: 'order-add', tile: 's3', at: 2 });
  assert.deepEqual(r, ['s1', 's2', 's3']);
  r = R.update(it, r, { kind: 'order-add', tile: 's3', at: 0 });
  assert.deepEqual(r, ['s3', 's1', 's2']);
  r = R.update(it, r, { kind: 'order-move', tile: 's3', delta: 1 });
  assert.deepEqual(r, ['s1', 's3', 's2']);
  r = R.update(it, r, { kind: 'order-remove', tile: 's1' });
  assert.deepEqual(r, ['s3', 's2']);
});

test('update: dropdown, yesno, hot, single, ps', () => {
  assert.deepEqual(R.update(item('fx-dd'), null, { kind: 'dd', list: 'l2', val: '1' }), { l2: 1 });
  assert.equal(R.update(item('fx-dd'), { l2: 1 }, { kind: 'dd', list: 'l2', val: '' }), null);
  assert.deepEqual(R.update(item('fx-yn'), { r1: true }, { kind: 'yn', row: 'r2', val: false }), { r1: true, r2: false });
  assert.deepEqual(R.update(item('fx-hot'), ['h1'], { kind: 'hot', region: 'h1' }), null);
  assert.equal(R.update(item('fx-single'), 0, { kind: 'single', i: 2 }), 2);
  assert.equal(R.update(item('fx-ps1'), true, { kind: 'ps', val: false }), false);
});

test('dropAction traduz o arrasto por tipo', () => {
  assert.deepEqual(R.dropAction(item('fx-order'), 's1', null, 'pos:0'), { kind: 'order-add', tile: 's1', at: 0 });
  assert.deepEqual(R.dropAction(item('fx-order'), 's1', 'pos:0', '__pool'), { kind: 'order-remove', tile: 's1' });
  assert.deepEqual(R.dropAction(item('fx-match'), 'k1', 't1', null), { kind: 'unplace', zone: 't1' });
  assert.equal(R.dropAction(item('fx-match'), 'k1', null, '__pool'), null);
  assert.deepEqual(R.dropAction(item('fx-inline'), 'x', null, 'g1'), { kind: 'place', tile: 'x', from: null, zone: 'g1' });
});

// ---------- estudo de caso ----------

test('estudo de caso: seções, subseções a partir de <h4> e All Information', () => {
  const cs = { title: 'Contoso', tabs: [{ title: 'Visão geral', html: '<p>Intro</p><h4>Empresa</h4><p>A</p><h4>Equipes</h4><p>B</p>' }, { title: 'Requisitos', html: '<h4>R</h4><p>C</p>' }] };
  const closed = R.caseStudy(cs, {});
  assert.equal(count(closed, /data-act="cs-sec"/g), 2);
  assert.doesNotMatch(closed, /data-act="cs-sub"/);
  const open = R.caseStudy(cs, { open: { 0: true } });
  assert.equal(count(open, /data-act="cs-sub"/g), 2);
  assert.match(open, /Intro/);
  assert.doesNotMatch(open, /<p>A<\/p>/);
  const sub = R.caseStudy(cs, { open: { 0: true, '0.1': true } });
  assert.match(sub, /<p>A<\/p>/);
  const all = R.caseStudy(cs, { all: true });
  assert.match(all, /<p>B<\/p>/);
  assert.match(all, /<p>C<\/p>/);
  assert.match(all, /Collapse All/);
});

test('describe gera textos de resposta para o relatório', () => {
  assert.match(R.describe(item('fx-order'), ['s1', 's2']), /<ol class="ans"><li>S1<\/li><li>S2<\/li><\/ol>/);
  assert.match(R.describe(item('fx-match'), { t1: 'k2' }), /T1 → K2/);
  assert.match(R.describe(item('fx-yn'), { r1: false }), /R1: <strong>Não<\/strong>/);
  assert.match(R.describe(item('fx-ps1'), true), /Sim/);
});

test('padrão do sandbox: alternativas com letras, instrução com quantidade e Answer Area', () => {
  const h = R.item(item('fx-multi'), { shuffle: { o: [3, 1, 0, 2] } });
  assert.deepEqual([...h.matchAll(/class="ltr" aria-hidden="true">([A-D])\./g)].map((m) => m[1]), ['A', 'B', 'C', 'D']);
  assert.match(h, /Selecione 2 respostas entre 4 alternativas/);
  assert.match(R.item(item('fx-single'), {}), /Selecione 1 resposta entre 3 alternativas/);
  assert.match(render('fx-order', null), /<div class="pool-h">Actions<\/div>/);
  assert.match(render('fx-dd', null), /<div class="pool-h">Answer Area<\/div>/);
});

test('renderers em inglês: instruções, rótulos e feedback seguem GHX.lang', () => {
  GHX.setLang('en');
  try {
    assert.equal(R.instruction(item('fx-multi')), 'Select 2 answers from 4 options. Each correct answer is worth one point.');
    const html = R.item(item('fx-order'), { resp: ['s1'] });
    assert.match(html, /Drop here/);
    assert.match(html, /aria-label="Move up"/);
    const fb = R.feedback(item('fx-single'), 0);
    assert.match(fb, /<h3>Incorrect<\/h3>/);
    assert.match(fb, /Your answer/);
    assert.match(fb, /Official documentation/);
    assert.doesNotMatch(fb, /Resposta correta|Explicação/);
  } finally {
    GHX.setLang('pt');
  }
  assert.match(R.feedback(item('fx-single'), 2), /<h3>Correto<\/h3>/);
});
