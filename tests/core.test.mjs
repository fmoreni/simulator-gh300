import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, registerFixture } from './helpers.mjs';

const GHX = loadAll();
const bank = registerFixture(GHX);
const S = GHX.Session;
const item = (id) => GHX.getItem(id);
const score = (id, r) => GHX.Scoring.score(item(id), r);
const MIN = 60000;

function exam(opts = {}) {
  const att = S.create(bank, { mode: 'exam', now: 0, rng: S.seeded(7), ...opts });
  S.start(att, 0);
  return att;
}

// ---------- normalização ----------

test('normalização preenche padrões por tipo', () => {
  assert.equal(item('fx-single').cert, 'TEST-ALL');
  assert.deepEqual(item('fx-multi').a, [0, 2]);
  assert.equal(item('fx-multi').n, 2);
  assert.deepEqual(item('fx-order').extra, ['x1']);
  assert.equal(item('fx-hot').n, 2);
  assert.deepEqual(item('fx-yn').labels, ['Sim', 'Não']);
  assert.equal(item('fx-ps1').type, 'ps');
  assert.equal(item('fx-ps1').sec, 'ps');
  assert.ok(Array.isArray(item('fx-single').ref));
});

test('normalização ordena gabarito de multi e aceita ref string', () => {
  const it = GHX.normalizeItem({ id: 'n1', d: 1, type: 'multi', q: 'q', o: ['a', 'b', 'c'], a: [2, 0], ref: 'https://docs.github.com/x' });
  assert.deepEqual(it.a, [0, 2]);
  assert.deepEqual(it.ref, ['https://docs.github.com/x']);
});

test('validação aponta problemas estruturais', () => {
  const bad = GHX.normalizeItem({ id: 'b1', d: 9, type: 'single', q: 'q', o: ['a', 'b'], a: 5, why: ['x'], exp: 'e', ref: 'http://exemplo.com' });
  const errs = GHX.validateItem(bad, bank).join('\n');
  assert.match(errs, /d fora/);
  assert.match(errs, /gabarito inválido/);
  assert.match(errs, /why deve cobrir/);
  assert.match(errs, /ref não oficial/);
  const orphan = GHX.normalizeItem({ id: 'b2', d: 1, case: 'zzz', type: 'ps', q: 'q', sol: 's', a: true, exp: 'e', why: 'w', ref: 'https://docs.github.com/x' });
  assert.match(GHX.validateItem(orphan, bank).join(), /estudo de caso inexistente/);
});

test('fixture é válido e seções saem na ordem caso → série → gerais', () => {
  assert.deepEqual(GHX.validateBank(bank), []);
  const secs = GHX.buildSections(bank);
  assert.deepEqual(secs.map((s) => s.kind), ['case', 'ps', 'general']);
  assert.equal(secs[2].items.length, 8);
});

test('registry: addItems e patchItem', () => {
  const b = registerFixture(GHX, 'reg');
  GHX.addItems('reg', [
    { id: 'ext1', d: 1, q: 'q', o: ['a', 'b'], a: 0, why: ['', ''], exp: 'e', ref: 'https://docs.github.com/x' },
    { id: 'ext2', type: 'ps', d: 1, q: 'q', sol: 's', a: true, exp: 'e', why: 'w', ref: 'https://docs.github.com/x' },
  ]);
  assert.equal(b.qs.at(-1).id, 'ext1');
  assert.equal(b.ps.at(-1).id, 'ext2');
  GHX.patchItem('ext1', { a: 1 });
  assert.equal(GHX.getItem('ext1').a, 1);
  assert.throws(() => GHX.addItems('reg', [{ id: 'ext1' }]), /já existe/);
  assert.throws(() => GHX.registerBank({ id: 'reg' }), /já registrado/);
});

// ---------- correção ----------

test('single e ps', () => {
  assert.equal(score('fx-single', 2), 1);
  assert.equal(score('fx-single', 0), 0);
  assert.equal(score('fx-single', undefined), 0);
  assert.equal(score('fx-ps1', true), 1);
  assert.equal(score('fx-ps2', true), 0);
  assert.equal(score('fx-ps2', false), 1);
});

test('multi: crédito parcial e seleção errada anula acerto', () => {
  assert.equal(score('fx-multi', [0, 2]), 1);
  assert.equal(score('fx-multi', [0]), 0.5);
  assert.equal(score('fx-multi', [0, 1]), 0);
  assert.equal(score('fx-multi', [1, 3]), 0);
  assert.equal(score('fx-multi', []), 0);
});

test('hotspot: mesma regra de multi', () => {
  assert.equal(score('fx-hot', ['h1', 'h3']), 1);
  assert.equal(score('fx-hot', ['h3']), 0.5);
  assert.equal(score('fx-hot', ['h1', 'h2']), 0);
});

test('match, inline, dropdown e yesno: crédito por parte', () => {
  assert.equal(score('fx-match', { t1: 'k1', t2: 'k2' }), 1);
  assert.equal(score('fx-match', { t1: 'k1', t2: 'k3' }), 0.5);
  assert.equal(score('fx-inline', { g1: 'x' }), 0.5);
  assert.equal(score('fx-inline', { g1: 'y', g2: 'x' }), 0);
  assert.equal(score('fx-dd', { l1: 0, l2: 2 }), 1);
  assert.equal(score('fx-dd', { l1: 1, l2: 2 }), 0.5);
  assert.equal(score('fx-yn', { r1: true, r2: false, r3: true }), 1);
  assert.ok(Math.abs(score('fx-yn', { r1: true, r2: true, r3: false }) - 1 / 3) < 1e-9);
});

test('order: crédito por posição; ação extra não pontua', () => {
  assert.equal(score('fx-order', ['s1', 's2', 's3']), 1);
  assert.ok(Math.abs(score('fx-order', ['s1', 's3', 's2']) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(score('fx-order', ['s1', 'x1', 's3']) - 2 / 3) < 1e-9);
  assert.equal(score('fx-order', 'lixo'), 0);
});

test('completo/incompleto por tipo', () => {
  const C = GHX.Scoring;
  assert.equal(C.isComplete(item('fx-multi'), [0]), false);
  assert.equal(C.isComplete(item('fx-multi'), [0, 1]), true);
  assert.equal(C.isComplete(item('fx-match'), { t1: 'k1' }), false);
  assert.equal(C.isComplete(item('fx-dd'), { l1: 0, l2: 1 }), true);
  assert.equal(C.isComplete(item('fx-order'), ['s1', 's2']), false);
  assert.equal(C.isComplete(item('fx-yn'), { r1: true, r2: false, r3: false }), true);
  assert.equal(C.isAnswered(item('fx-single'), 0), true);
  assert.equal(C.isAnswered(item('fx-ps1'), undefined), false);
});

test('resultado por domínio', () => {
  const items = GHX.bankItems(bank);
  const answers = { 'fx-single': 2, 'fx-multi': [0], 'fx-ps1': true };
  const r = GHX.Scoring.results(items, answers);
  assert.equal(r.max, items.length);
  assert.equal(r.score, 2.5);
  const d1 = r.domains.find((x) => x.d === 1);
  assert.equal(d1.pct, 100);
  const d2 = r.domains.find((x) => x.d === 2);
  assert.equal(d2.max, 2);
  assert.equal(d2.pct, 25);
});

// ---------- sessão ----------

test('embaralhamento guardado na tentativa e reprodutível pela semente', () => {
  const a = S.create(bank, { now: 0, rng: S.seeded(42) });
  const b = S.create(bank, { now: 0, rng: S.seeded(42) });
  assert.deepEqual(a.shuffle, b.shuffle);
  assert.deepEqual([...a.shuffle['fx-multi'].o].sort(), [0, 1, 2, 3]);
  assert.equal(a.shuffle['fx-match'].tiles.length, 3);
  assert.equal(a.shuffle['fx-inline'].tokens.length, 3);
  assert.equal(a.shuffle['fx-order'].o.length, 4);
  assert.equal(a.shuffle['fx-dd'], undefined);
});

test('cronômetro, tempo esgotado e +30 minutos', () => {
  const att = exam();
  assert.equal(att.limitMs, 10 * MIN);
  assert.equal(S.remainingMs(att, 4 * MIN), 6 * MIN);
  assert.equal(S.tick(att, 9 * MIN), 'running');
  assert.equal(S.tick(att, 10 * MIN), 'finished');
  assert.equal(att.endReason, 'time');
  assert.ok(att.result);
  const ext = exam({ extraTime: true });
  assert.equal(ext.limitMs, 40 * MIN);
  assert.equal(S.tick(ext, 30 * MIN), 'running');
});

test('estudo de caso trava ao sair da seção', () => {
  const att = exam();
  assert.equal(S.section(att).kind, 'case');
  assert.ok(S.answer(att, 'fx-c1', 1));
  assert.deepEqual(S.next(att), { ok: false, end: true });
  S.nextSection(att, 1000);
  assert.equal(S.section(att).kind, 'ps');
  assert.equal(S.answer(att, 'fx-c1', 0), false);
  assert.equal(S.canGoTo(att, 0, 0), false);
  assert.equal(att.answers['fx-c1'], 1);
});

test('série problema–solução trava item a item e não volta', () => {
  const att = exam();
  S.nextSection(att, 0);
  assert.equal(S.currentId(att), 'fx-ps1');
  S.answer(att, 'fx-ps1', true);
  assert.equal(S.canPrev(att), false);
  S.next(att);
  assert.equal(S.currentId(att), 'fx-ps2');
  assert.equal(S.canPrev(att), false);
  assert.equal(S.answer(att, 'fx-ps1', false), false);
  assert.equal(S.canGoTo(att, att.s, 0), false);
  const rows = S.reviewRows(att);
  assert.equal(rows[0].locked, true);
});

test('navegação livre dentro da seção geral, review e filtros', () => {
  const att = exam();
  S.nextSection(att, 0);
  S.nextSection(att, 0);
  assert.equal(S.section(att).kind, 'general');
  assert.equal(S.number(att), 4);
  S.answer(att, 'fx-single', 2);
  S.next(att);
  S.toggleFlag(att, 'fx-multi');
  assert.ok(S.canPrev(att));
  S.prev(att);
  assert.ok(S.goTo(att, att.s, 5));
  assert.equal(S.currentId(att), 'fx-order');
  S.openReview(att);
  assert.equal(att.view, 'review');
  assert.equal(S.reviewRows(att, 'all').length, 8);
  assert.equal(S.reviewRows(att, 'answered').length, 1);
  assert.equal(S.reviewRows(att, 'unanswered').length, 7);
  assert.deepEqual(S.reviewRows(att, 'review').map((r) => r.id), ['fx-multi']);
  S.closeReview(att);
  assert.equal(att.view, 'item');
  S.nextSection(att, 5 * MIN);
  assert.equal(att.status, 'finished');
  assert.equal(att.endReason, 'submitted');
});

test('Take a Break: o cronômetro continua e todas as questões exibidas travam', () => {
  const att = exam();
  S.nextSection(att, 0);
  S.nextSection(att, 0);
  S.answer(att, 'fx-single', 0);
  S.next(att); // exibe fx-multi
  S.toggleFlag(att, 'fx-multi');
  assert.deepEqual(S.breakSummary(att), { seen: 2, unanswered: 1, flagged: 1, remaining: 7 }); // seções anteriores já travadas
  assert.ok(S.takeBreak(att, 2 * MIN));
  assert.equal(att.status, 'break');
  assert.equal(S.remainingMs(att, 5 * MIN), 5 * MIN);
  assert.equal(S.tick(att, 6 * MIN), 'break');
  assert.equal(S.answer(att, 'fx-match', {}), false);
  S.endBreak(att, 7 * MIN);
  assert.equal(att.status, 'running');
  assert.equal(S.currentId(att), 'fx-match');
  assert.equal(S.answer(att, 'fx-multi', [0]), false);
  assert.equal(S.answer(att, 'fx-single', 2), false);
  assert.equal(S.canPrev(att), false);
  assert.equal(S.remainingMs(att, 7 * MIN), 3 * MIN);
});

test('tempo esgotado durante a pausa encerra a prova', () => {
  const att = exam();
  S.takeBreak(att, MIN);
  assert.equal(S.tick(att, 11 * MIN), 'finished');
  assert.equal(att.endReason, 'time');
});

test('pausa no último item da seção segue para a próxima; não há pausa na série problema–solução', () => {
  const att = exam();
  S.takeBreak(att, 0);
  S.endBreak(att, 0);
  assert.equal(S.section(att).kind, 'ps');
  assert.equal(att.sections[0].locked, true);
  assert.equal(S.takeBreak(att, 0), false);
});

test('Leave Feedback marca a questão e o review mode começa ao abrir uma questão pela revisão', () => {
  const att = exam();
  S.nextSection(att, 0);
  S.nextSection(att, 0);
  assert.ok(S.toggleFeedback(att, 'fx-single'));
  assert.deepEqual(att.fb, { 'fx-single': true });
  S.openReview(att);
  assert.equal(att.reviewMode, false);
  assert.ok(S.goTo(att, att.s, 3, true));
  assert.equal(att.reviewMode, true);
  S.openReview(att);
  assert.equal(att.reviewMode, false);
});

test('modo estudo: sem cronômetro, navegação livre e correção por item', () => {
  const att = S.create(bank, { mode: 'study', now: 0, rng: S.seeded(1) });
  S.start(att, 0);
  assert.equal(att.limitMs, 0);
  assert.equal(S.remainingMs(att, 1e9), Infinity);
  assert.equal(S.tick(att, 1e9), 'running');
  assert.ok(S.goTo(att, 2, 3));
  assert.ok(S.goTo(att, 0, 0));
  assert.equal(S.takeBreak(att, 0), false);
  S.answer(att, 'fx-c1', 0);
  assert.equal(S.check(att, 'fx-c1'), 0);
  assert.equal(S.answer(att, 'fx-c1', 1), false);
  assert.ok(S.reset(att, 'fx-c1'));
  assert.ok(S.answer(att, 'fx-c1', 1));
  assert.equal(S.check(att, 'fx-c1'), 1);
  S.next(att);
  assert.equal(S.section(att).kind, 'ps');
  S.next(att);
  assert.ok(S.canPrev(att));
  assert.equal(S.reviewRows(att).length, 11);
});

test('retomada após recarregar não conta o tempo com a página fechada', () => {
  const att = exam();
  S.tick(att, 3 * MIN);
  const saved = JSON.parse(JSON.stringify(att));
  S.resumeAfterReload(saved, 100 * MIN);
  assert.equal(S.remainingMs(saved, 101 * MIN), 6 * MIN);
});

// ---------- storage ----------

test('storage: grava, retoma ativa, histórico e prefs', () => {
  const backend = GHX.Storage.memoryBackend();
  const st = GHX.Storage.open(backend);
  const att = exam({ id: 'a1' });
  st.put(att);
  const st2 = GHX.Storage.open(backend);
  assert.equal(st2.active('fx').id, 'a1');
  S.finish(att, 1000);
  st2.put(att);
  assert.equal(st2.active('fx'), null);
  assert.equal(st2.history('fx').length, 1);
  st2.pref('scheme', 'dark');
  assert.equal(GHX.Storage.open(backend).pref('scheme'), 'dark');
  const att2 = exam({ id: 'a2' });
  st2.put(att2);
  st2.discard('fx');
  assert.equal(st2.get('a2'), null);
});

test('storage: migração v1 → v2 e dados corrompidos', () => {
  const backend = GHX.Storage.memoryBackend();
  backend.setItem(GHX.Storage.KEY, JSON.stringify({ attempts: [{ id: 'old', bankId: 'fx', status: 'running' }, { id: 'done', bankId: 'fx', status: 'finished', finishedAt: 1 }] }));
  const st = GHX.Storage.open(backend);
  assert.equal(st.data.v, 2);
  assert.equal(st.active('fx').id, 'old');
  assert.deepEqual(st.get('old').flags, {});
  assert.equal(st.history().length, 1);
  backend.setItem(GHX.Storage.KEY, '{quebrado');
  assert.deepEqual(GHX.Storage.open(backend).data.attempts, {});
});

// ---------- bancos reais ----------

const real = GHX.listBanks().filter((b) => !['fx', 'reg'].includes(b.id));
const FORMAT = GHX.CERTS['GH-300'].format;

test('9 simulados de 60 questões: 3 por nível, 540 no total', { skip: real.length === 0 && 'bancos ainda não criados' }, () => {
  assert.equal(real.length, 9);
  for (const level of ['Iniciante', 'Intermediário', 'Avançado']) {
    assert.equal(real.filter((b) => b.level === level).length, 3, `nível ${level}`);
  }
  assert.equal(real.reduce((n, b) => n + GHX.bankItems(b).length, 0), 540);
  assert.deepEqual(real.map((b) => b.title.slice(0, 11)), ['Simulado 01', 'Simulado 02', 'Simulado 03', 'Simulado 04', 'Simulado 05', 'Simulado 06', 'Simulado 07', 'Simulado 08', 'Simulado 09']);
});

test('formato GH-300: sem estudo de caso, sem série problema–solução, só os tipos do sandbox oficial', () => {
  const b = { ...GHX.BANKS.fx, id: 'fake', cert: 'GH-300' };
  const errs = GHX.validateBank(b).join('\n');
  assert.match(errs, /não tem estudo de caso/);
  assert.match(errs, /não tem série problema–solução/);
  assert.match(errs, /tipo hotspot não aparece na GH-300/);
  assert.match(errs, /tipo yesno não aparece na GH-300/);
});

for (const b of real) {
  test(`banco ${b.id}: validação estrutural e formato`, () => {
    assert.deepEqual(GHX.validateBank(b), []);
    assert.equal(b.cases.length, 0);
    assert.equal(b.ps.length, 0);
    assert.deepEqual(GHX.buildSections(b).map((s) => s.kind), ['general']);
    const n = GHX.bankItems(b).length;
    if (b.track === 'full') {
      assert.equal(n, FORMAT.fullQuestions);
      assert.equal(b.minutes, GHX.CERTS['GH-300'].minutes);
    } else {
      assert.ok(n >= 25 && n <= 35, `${b.id} tem ${n} questões`);
    }
  });

  test(`banco ${b.id}: distribuição dentro dos pesos oficiais`, () => {
    const items = GHX.bankItems(b);
    const n = items.length;
    for (const dm of GHX.CERTS['GH-300'].domains) {
      const k = items.filter((it) => it.d === dm.d).length;
      const pct = (k / n) * 100;
      const tol = b.track === 'full' ? 0 : 2;
      assert.ok(pct >= dm.weight[0] - tol && pct <= dm.weight[1] + tol, `${b.id} domínio ${dm.d}: ${pct.toFixed(1)}%`);
    }
  });
}

test('ids únicos entre todos os bancos e todos os tipos da GH-300 aparecem', { skip: real.length === 0 && 'bancos ainda não criados' }, () => {
  const all = real.flatMap((b) => GHX.bankItems(b));
  assert.equal(new Set(all.map((x) => x.id)).size, all.length);
  const types = new Set(all.map((x) => x.type));
  for (const t of FORMAT.itemTypes) assert.ok(types.has(t), `nenhum item do tipo ${t}`);
  for (const t of types) assert.ok(FORMAT.itemTypes.includes(t), `tipo fora do formato: ${t}`);
});
