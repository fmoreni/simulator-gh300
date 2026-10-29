// Teste ponta a ponta em Chrome headless via Chrome DevTools Protocol (sem Puppeteer/Playwright).
// Uso: npm run serve (em outro terminal) e depois npm run e2e.
// Se nada responder em http://localhost:8765, o script sobe o servidor sozinho.
// Variáveis: CHROME_PATH (binário do Chrome), E2E_URL (página), E2E_SHOTS=0 (sem capturas),
// E2E_DEBUG=1 (mostra a resposta a cada passo dos itens de sequência).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const URL_ = process.env.E2E_URL || 'http://localhost:8765/dev.html';
const SHOTS = process.env.E2E_SHOTS !== '0';
const OUT = new URL('./e2e-output/', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = [];
let passed = 0;

function step(name) { console.log(`  ✔ ${name}`); passed++; }

// ---------- servidor ----------

async function ensureServer() {
  try { const r = await fetch(URL_); if (r.ok) return; } catch { /* sobe abaixo */ }
  const p = spawn('python3', ['-m', 'http.server', '8765', '--directory', 'dist'], {
    cwd: new URL('../', import.meta.url).pathname, stdio: 'ignore',
  });
  procs.push(p);
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    try { const r = await fetch(URL_); if (r.ok) { console.log('  (servidor iniciado pelo e2e)'); return; } } catch { /* tenta de novo */ }
  }
  throw new Error('Servidor não respondeu em ' + URL_ + '. Rode "npm run build" e "npm run serve".');
}

// ---------- Chrome + CDP ----------

function chromePath() {
  const c = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = c.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome não encontrado; defina CHROME_PATH.');
  return found;
}

async function launch() {
  const dir = mkdtempSync(join(tmpdir(), 'ghx-e2e-'));
  const p = spawn(chromePath(), [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });
  procs.push(p);
  const portFile = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  return { ws: page.webSocketDebuggerUrl, dir };
}

class CDP {
  constructor(ws) {
    this.id = 0; this.pending = new Map(); this.listeners = [];
    this.sock = new WebSocket(ws);
    this.sock.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) this.listeners.forEach((f) => f(m));
    };
  }
  open() { return new Promise((r, j) => { this.sock.onopen = r; this.sock.onerror = j; }); }
  send(method, params = {}) {
    const id = ++this.id;
    this.sock.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  close() { try { this.sock.close(); } catch { /* ignore */ } }
}

let cdp;
const errors = [];

async function evaluate(expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('Erro no página: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n  em: ' + expr.slice(0, 160));
  return r.result.value;
}

async function waitFor(expr, timeout = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(`!!(${expr})`)) return;
    await sleep(40);
  }
  throw new Error('Tempo esgotado esperando: ' + expr);
}

async function center(sel) {
  const r = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' }); const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  if (!r) throw new Error('Elemento não encontrado: ' + sel);
  return r;
}

async function click(sel) {
  const { x, y } = await center(sel);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(30);
}

// Mede origem e destino depois de rolar os dois para a área visível.
async function ends(from, to) {
  const r = await evaluate(`(() => { const f = document.querySelector(${JSON.stringify(from)}), t = document.querySelector(${JSON.stringify(to)});
    if (!f || !t) return { missing: !f ? ${JSON.stringify(from)} : ${JSON.stringify(to)} };
    t.scrollIntoView({ block: 'nearest' }); f.scrollIntoView({ block: 'nearest' });
    const c = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
    return { a: c(f), b: c(t) }; })()`);
  if (r.missing) throw new Error('Elemento não encontrado: ' + r.missing);
  return r;
}

async function mouseDrag(from, to) {
  const { a, b } = await ends(from, to);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + ((b.x - a.x) * i) / 8, y: a.y + ((b.y - a.y) * i) / 8, button: 'left', buttons: 1 });
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(40);
}

async function touchDrag(from, to) {
  const { a, b } = await ends(from, to);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 8, y: a.y + ((b.y - a.y) * i) / 8 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(60);
}

const KEYS = {
  Enter: { code: 'Enter', vk: 13, text: '\r' }, ' ': { code: 'Space', vk: 32, text: ' ' }, Tab: { code: 'Tab', vk: 9 },
  ArrowDown: { code: 'ArrowDown', vk: 40 }, ArrowUp: { code: 'ArrowUp', vk: 38 }, ArrowRight: { code: 'ArrowRight', vk: 39 },
  Escape: { code: 'Escape', vk: 27 }, Delete: { code: 'Delete', vk: 46 },
};

async function key(k) {
  const d = KEYS[k];
  const base = { key: k, code: d.code, windowsVirtualKeyCode: d.vk, nativeVirtualKeyCode: d.vk };
  await cdp.send('Input.dispatchKeyEvent', { type: d.text ? 'keyDown' : 'rawKeyDown', ...base, text: d.text });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(25);
}

// Tab de verdade até o foco chegar ao seletor (simula navegação por teclado).
async function tabTo(sel, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await evaluate(`document.activeElement && document.activeElement.matches(${JSON.stringify(sel)})`)) return;
    await key('Tab');
  }
  throw new Error('Tab não alcançou ' + sel);
}

async function arrowTo(sel, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await evaluate(`document.activeElement && document.activeElement.matches(${JSON.stringify(sel)})`)) return;
    await key('ArrowDown');
  }
  throw new Error('Setas não alcançaram ' + sel);
}

async function shot(name) {
  if (!SHOTS) return;
  mkdirSync(OUT, { recursive: true });
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(new URL(name + '.png', OUT), Buffer.from(r.data, 'base64'));
}

const app = (expr) => evaluate(`(() => { const ui = GHX.App.ui, a = ui.att, S = GHX.Session; return ${expr}; })()`);
const curId = () => app('S.currentId(a)');
const item = (id) => evaluate(`JSON.parse(JSON.stringify(GHX.getItem(${JSON.stringify(id)})))`);
const resp = (id) => app(`a.answers[${JSON.stringify(id)}] ?? null`);
const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`);

// ---------- respostas por tipo, alternando mouse, toque e teclado ----------

const counters = {};
function method(type, list) { counters[type] = (counters[type] || 0) + 1; return list[(counters[type] - 1) % list.length]; }

async function selectDropdown(list, value) {
  await evaluate(`(() => { const s = document.querySelector('select[data-list="${list}"]'); s.focus(); s.value = '${value}'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(30);
}

async function placeTile(tile, zone, how) {
  const tileSel = `.pool [data-tile="${tile}"]`;
  const zoneSel = `[data-zone="${zone}"]`;
  if (how === 'mouse') await mouseDrag(tileSel, zoneSel);
  else if (how === 'touch') await touchDrag(tileSel, zoneSel);
  else if (how === 'tap') { await click(tileSel); await click(zoneSel); }
  else {
    await tabTo(tileSel);
    await key(' ');
    await arrowTo(zoneSel);
    await key('Enter');
  }
}

async function answer(id, opts = {}) {
  const it = await item(id);
  const wrong = !!opts.wrong;
  switch (it.type) {
    case 'single': {
      const i = wrong ? (it.a + 1) % it.o.length : it.a;
      if (method('single', ['mouse', 'keyboard']) === 'mouse') await click(`input[data-act="single"][data-i="${i}"]`);
      else { await tabTo(`input[data-act="single"]`); await evaluate(`document.querySelector('input[data-act="single"][data-i="${i}"]').focus()`); await key(' '); }
      break;
    }
    case 'ps': await click(`input[data-act="ps"][data-val="${wrong ? !it.a : it.a}"]`); break;
    case 'multi': {
      const pick = opts.partial ? it.a.slice(0, 1) : it.a;
      for (const i of pick) await click(`input[data-act="multi"][data-i="${i}"]`);
      break;
    }
    case 'yesno':
      for (const row of it.rows) await click(`input[data-act="yn"][data-row="${row.id}"][data-val="${wrong ? !it.a[row.id] : it.a[row.id]}"]`);
      break;
    case 'dropdown':
      for (const k of Object.keys(it.a)) await selectDropdown(k, it.a[k]);
      break;
    case 'match':
    case 'inline': {
      const methods = ['mouse', 'touch', 'keyboard', 'tap'];
      let n = method(it.type, [0, 1, 2, 3]);
      for (const zone of Object.keys(it.a)) await placeTile(it.a[zone], zone, methods[n++ % methods.length]);
      break;
    }
    case 'order': {
      // Primeiro com toque, depois mouse; no fim usa as setas ▲ para corrigir a posição.
      const seq = it.a;
      const dbg = async (m) => { if (process.env.E2E_DEBUG) console.log('   order', m, JSON.stringify(await resp(id)), JSON.stringify(await evaluate('GHX.App.ui.att && document.querySelector(".carrying") ? "carry" : "-"'))); };
      await touchDrag(`.pool [data-tile="${seq[1]}"]`, '[data-zone="pos:0"]'); await dbg('touch');
      await mouseDrag(`.pool [data-tile="${seq[0]}"]`, '[data-zone="pos:1"]'); await dbg('mouse');
      await click(`button[data-act="order-move"][data-ref="${seq[0]}"][data-delta="-1"]`); await dbg('up');
      for (let i = 2; i < seq.length; i++) { await mouseDrag(`.pool [data-tile="${seq[i]}"]`, `[data-zone="pos:${i}"]`); await dbg('m' + i); }
      break;
    }
    case 'hotspot': {
      const [first, ...rest] = it.a;
      await click(`rect[data-region="${first}"]`);
      for (const r of rest) { await evaluate(`document.querySelector('rect[data-region="${r}"]').focus()`); await key(' '); }
      break;
    }
  }
  return it;
}

async function next() { await click('[data-act="next"]'); }

async function confirmYes() { await waitFor(`document.querySelector('[data-act="modal-yes"]')`); await click('[data-act="modal-yes"]'); }

// ---------- cenário ----------

async function run() {
  await ensureServer();
  const { ws, dir } = await launch();
  cdp = new CDP(ws);
  await cdp.open();
  cdp.listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value).join(' '));
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  console.log('GH-300 e2e — ' + URL_);
  await cdp.send('Page.navigate', { url: URL_ });
  await waitFor(`window.GHX && GHX.App`);
  await evaluate(`localStorage.clear(); location.reload()`);
  await sleep(300);
  await waitFor(`window.GHX && GHX.App && document.querySelector('.home')`);

  // Início
  for (const level of ['Iniciante', 'Intermediário', 'Avançado']) {
    assert.equal(await evaluate(`document.querySelectorAll('[data-level="${level}"] .card.bank').length`), 4, level);
  }
  assert.equal(await evaluate(`document.querySelectorAll('.card.bank').length`), 12);
  assert.match(await text('.home'), /700/);
  assert.match(await text('.home'), /sem estudo de caso/);
  await shot('01-home');
  step('tela inicial com 12 simulados agrupados por nível e nota sobre a prova e a pontuação');

  // Pré-prova na sequência do sandbox oficial do GitHub
  await click('input[data-act="extra"]');
  await click('[data-act="start"][data-mode="exam"][data-bank="gh300-full-a"]');
  await waitFor(`document.querySelector('.pre')`);
  assert.match(await text('.pre-card h1'), /^Candidate Agreement$/);
  assert.match(await text('.pre-card'), /No, I don't agree/);
  await shot('02-pre');
  await click('[data-act="pre-accept"]');
  assert.match(await text('.pre-card h1'), /Overview/);
  assert.match(await text('.pre-card'), /Exam Time:\s*130 minutes/);
  assert.match(await text('.pre-card'), /Total Questions:\s*60/);
  await click('[data-act="pre-next"]');
  assert.match(await text('.pre-card h1'), /Information and Instructions/);
  assert.match(await text('.pre-card'), /cronômetro continua correndo durante a pausa/);
  await click('[data-act="pre-next"]');
  assert.match(await text('.pre-card h1'), /Ready to Start\?/);
  await click('[data-act="pre-start"]');
  await waitFor(`document.querySelector('.exam')`);
  assert.equal(await app('a.limitMs'), 130 * 60000);
  assert.equal(await app('a.sections.length'), 1);
  assert.match(await text('#timer'), /^02 : 09 : 5\d$|^02 : 10 : 00$/);
  assert.match(await text('.xh-title h1'), /^Question 1$/);
  assert.match(await text('.hcenter'), /Question Progress \(0\/60\)/);
  step('pré-prova (Candidate Agreement, Overview, Information and Instructions, Ready to Start?) e +30 minutos');

  // Incomplete Question Warning também para questão sem resposta
  const general = await app('S.section(a).items');
  await next();
  await waitFor(`document.querySelector('.modal h2') && /Incomplete Question Warning/.test(document.querySelector('.modal h2').textContent)`);
  assert.match(await text('.modal'), /Select OK to proceed/);
  await shot('03-incomplete');
  await click('[data-act="modal-close"]');
  assert.equal(await curId(), general[0]);
  step('Incomplete Question Warning (Cancel/OK) ao avançar sem resposta');

  // Barra lateral
  await click('[data-act="side"]');
  assert.equal(await evaluate(`document.querySelector('.side').classList.contains('open')`), true);
  await shot('04-sidebar');
  await click('[data-act="side"]');
  await click('[data-act="details"]'); assert.match(await text('.modal'), /Question Details/); await click('[data-act="modal-close"]');
  await click('[data-act="progress"]'); assert.match(await text('.modal'), /respondidas/); await click('[data-act="modal-close"]');
  await click('[data-act="calc"]');
  for (const k of ['7', '×', '6', '=']) await click(`[data-act="calc-key"][data-key="${k}"]`);
  assert.equal((await text('.calc-disp')).trim(), '42');
  await click('[data-act="modal-close"]');
  await click('[data-act="scheme"]'); await click('input[data-v="dark"]');
  assert.equal(await evaluate(`document.documentElement.getAttribute('data-scheme')`), 'dark');
  await click('[data-act="modal-close"]');
  await click('[data-act="textsize"]'); await click('input[data-v="1.15"]'); await click('[data-act="modal-close"]');
  assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()`), '1.15');
  await click('[data-act="help"]'); assert.match(await text('.modal'), /Multiple choice/); await click('[data-act="modal-close"]');
  await click('[data-act="hide-time"]');
  assert.equal(await evaluate(`document.getElementById('timer').hidden`), true);
  await click('[data-act="hide-time"]');
  await click('[data-act="hide-progress"]'); await click('[data-act="hide-progress"]');
  step('barra lateral: Question Details, Review, Progress, Take a Break, Calculator, Color Scheme, Help e chaves de ocultar');

  // Responde a prova inteira; uma multi parcial, uma single errada; pausa e recarga no meio
  let id, partialDone = false, wrongDone = false, brk = false, reloaded = false;
  const skipped = [];
  // A pausa trava a questão aberta; escolhe um ponto em que ela seja de escolha única.
  const types = await evaluate(`GHX.App.ui.att.sections[0].items.map((id) => GHX.getItem(id).type)`);
  const breakAt = types.findIndex((t, i) => i >= 8 && types[i + 1] === 'single');
  const seenTypes = new Set();
  for (let guard = 0; guard < 80; guard++) {
    if (await app('a.view') === 'review') break;
    id = await curId();
    const i = general.indexOf(id);
    const it = await item(id);
    seenTypes.add(it.type);
    let opts = {};
    if (it.type === 'multi' && !partialDone) { opts = { partial: true }; partialDone = true; }
    else if (it.type === 'single' && !wrongDone && i > 3) { opts = { wrong: true }; wrongDone = true; }
    await answer(id, opts);
    const r = await resp(id);
    assert.ok(r !== null, 'sem resposta em ' + id);
    if (['match', 'inline', 'order'].includes(it.type)) {
      const sc = await evaluate(`GHX.Scoring.score(GHX.getItem(${JSON.stringify(id)}), ${JSON.stringify(r)})`);
      assert.equal(sc, 1, `${it.type} ${id} não ficou correto: ${JSON.stringify(r)}`);
      await shot(`05-${it.type}`);
    }
    if (i === 0) { await click('input[data-act="flag"]'); await click('input[data-act="fbflag"]'); }
    await next();
    if (opts.partial) {
      await waitFor(`/Incomplete Question Warning/.test(document.body.textContent)`);
      await confirmYes();
    }

    // Pausa: o relógio continua e as questões exibidas (inclusive a atual) travam
    if (!brk && i === breakAt) {
      brk = true;
      const shown = await curId();
      await click('[data-act="break"]');
      await waitFor(`/Start Break/.test(document.body.textContent)`);
      assert.match(await text('.modal'), /continua correndo/);
      await confirmYes();
      await waitFor(`document.querySelector('.overlay.break')`);
      const r1 = await app('S.remainingMs(a, Date.now())');
      await sleep(1300);
      const r2 = await app('S.remainingMs(a, Date.now())');
      assert.ok(r1 - r2 >= 1000, 'o tempo deveria correr durante a pausa');
      await shot('06-break');
      await click('[data-act="break-end"]');
      assert.equal(await app('a.status'), 'running');
      assert.equal(await app(`S.canAnswer(a, ${JSON.stringify(shown)})`), false);
      assert.equal(await curId(), general[general.indexOf(shown) + 1]);
      assert.equal(await evaluate(`document.querySelector('[data-act="prev"]').disabled`), true);
      skipped.push(shown);
      step('Take a Break: o cronômetro continua e as questões exibidas, inclusive a atual, travam');
    }

    if (!reloaded && i === 25) {
      reloaded = true;
      const before = await app('({ id: a.id, p: a.p, n: Object.keys(a.answers).length })');
      await evaluate('location.reload()');
      await sleep(300);
      await waitFor(`window.GHX && GHX.App && GHX.App.ui.att && document.querySelector('.exam')`);
      const after = await app('({ id: a.id, p: a.p, n: Object.keys(a.answers).length })');
      assert.deepEqual(after, before);
      step('retomada da tentativa após recarregar a página');
    }
  }
  for (const t of ['single', 'multi', 'match', 'inline', 'dropdown', 'order']) assert.ok(seenTypes.has(t), 'tipo não exercitado: ' + t);
  step('todos os tipos (multiple choice, Drag and Drop, Build List Reorder, Active Screen) com mouse, toque e teclado');

  // Question Review: filtros, review mode e Finish
  await waitFor(`document.querySelector('.review')`);
  assert.match(await text('.xh-title h1'), /Question Review/);
  assert.match(await text('.rv-instr'), /Review Screen Instructions/);
  assert.match(await text('.rv-filters'), /Unanswered \(1\)/);
  await click('input[data-act="rv-filter"][data-f="review"]');
  assert.equal(await evaluate(`document.querySelectorAll('.rv-table tbody tr').length`), 1);
  await click('input[data-act="rv-filter"][data-f="all"]');
  await shot('07-review');
  const target = general.indexOf(general[40]);
  await click(`[data-act="rv-go"][data-p="${target}"]`);
  assert.equal(await app('a.reviewMode'), true);
  assert.match(await text('.xf'), /Exit Review Mode/);
  await next();
  assert.equal(await app('a.p'), target + 1);
  await click('[data-act="rv-mode-exit"]');
  assert.equal(await app('a.view'), 'review');
  step('Question Review: instruções, filtros, review mode e Exit Review Mode');

  await click('[data-act="finish"]');
  await waitFor(`/Are you sure/.test(document.body.textContent)`);
  await confirmYes();
  await waitFor(`document.querySelector('[data-cmt]')`);
  assert.match(await text('.pre-card'), /Item Comments/);
  await evaluate(`document.querySelector('[data-cmt]').value = 'Comentário de teste do e2e'`);
  await click('[data-act="comments-done"]');
  await waitFor(`document.querySelector('.report')`);
  step('Leave Feedback: comentários depois do Finish, fora do tempo da prova');

  const result = await evaluate(`GHX.App.store.history('gh300-full-a')[0].result`);
  assert.equal(result.max, 60);
  assert.ok(result.score > 55 && result.score < 59, 'pontuação inesperada ' + result.score);
  assert.match(await text('.big-pct'), new RegExp(String(result.pct).replace('.', '\\.') + '%'));
  assert.equal(await evaluate(`document.querySelectorAll('.dom-table tbody tr').length`), 6);
  assert.equal(await evaluate(`document.querySelectorAll('.rep-item').length`), 60);
  assert.match(await text('.report'), /1 a 1000/);
  assert.match(await text('.report'), /Comentário de teste do e2e/);
  await shot('08-report');
  await click('input[data-act="only-wrong"]');
  const shown = await evaluate(`document.querySelectorAll('.rep-item').length`);
  assert.ok(shown >= 3 && shown < 60);
  step(`relatório: ${result.pct}% com crédito parcial, 6 domínios, ${shown} itens errados/parciais filtrados`);

  await click('[data-act="home"]');
  await waitFor(`document.querySelector('.home')`);
  assert.match(await text('[data-bank-card="gh300-full-a"]'), /Histórico \(1\)/);
  step('histórico e "Ver relatório" na tela inicial');

  // Modo estudo
  await click('[data-act="start"][data-mode="study"][data-bank="gh300-practice-a"]');
  await waitFor(`document.querySelector('.exam')`);
  assert.match(await text('.xh'), /Modo estudo/);
  id = await curId();
  await answer(id, { wrong: true });
  await click('[data-act="check"]');
  await waitFor(`document.querySelector('.feedback')`);
  assert.match(await text('.feedback'), /Documentação oficial/);
  assert.ok(await evaluate(`document.querySelectorAll('.feedback .refs a').length >= 1`));
  await shot('10-study-feedback');
  await click('[data-act="reset"]');
  assert.equal(await resp(id), null);
  await answer(id);
  await click('[data-act="check"]');
  assert.match(await text('.feedback h3'), /Correto/);
  await click('[data-act="review"]');
  await click('[data-act="rv-go"][data-p="20"]');
  assert.equal(await app('a.p'), 20);
  await click('[data-act="prev"]');
  assert.equal(await app('a.p'), 19);
  step('modo estudo: Corrigir com explicação/why/links, Reset Answer e navegação livre');

  await click('[data-act="exit"]');
  await confirmYes();
  await waitFor(`document.querySelector('.home')`);
  assert.match(await text('[data-bank-card="gh300-practice-a"]'), /Continuar/);
  step('Exit simulator mantém a tentativa para continuar');

  // Mesma prova em inglês
  await click('input[data-act="lang"][data-v="en"]');
  assert.equal(await evaluate(`GHX.App.store.pref('lang')`), 'en');
  await click('[data-act="start"][data-mode="exam"][data-bank="gh300-s10"]');
  await waitFor(`document.querySelector('.pre')`);
  assert.equal(await app('a.lang'), 'en');
  assert.match(await text('.pre-card'), /In the real exam/);
  assert.equal(await evaluate(`document.documentElement.lang`), 'en-US');
  for (let i = 0; i < 3; i++) await click(i ? '[data-act="pre-next"]' : '[data-act="pre-accept"]');
  assert.match(await text('.pre-card'), /Practice Exam 10 — Beginner/);
  await click('[data-act="pre-start"]');
  await waitFor(`document.querySelector('.exam')`);
  for (let i = 0; i < 6; i++) {
    id = await curId();
    const en = await evaluate(`GHX.itemIn(${JSON.stringify(id)}, 'en').q.replace(/[\`*]/g, '')`);
    assert.ok((await text('.stem')).replace(/\s+/g, ' ').includes(en.replace(/\s+/g, ' ').slice(0, 60)), 'enunciado não está em inglês: ' + id);
    assert.equal(await evaluate(`GHX.looksPortuguese(document.querySelector('.q-scroll').innerText)`), false, 'texto em português em ' + id);
    await answer(id);
    await next();
  }
  await shot('12-exam-en');
  await click('[data-act="review"]');
  await click('[data-act="finish"]');
  await waitFor(`/Are you sure/.test(document.body.textContent)`);
  assert.match(await text('.modal'), /When you finish, the exam ends/);
  await confirmYes();
  await waitFor(`document.querySelector('.report')`);
  assert.match(await text('.rep-h'), /Score report/);
  assert.match(await text('.report'), /Performance by domain/);
  assert.match(await text('.report'), /Language: English/);
  const enRes = await evaluate(`GHX.App.store.history('gh300-s10')[0]`);
  assert.equal(enRes.lang, 'en');
  assert.equal(enRes.result.max, 60);
  assert.ok(enRes.result.score >= 6, 'as 6 respostas certas deveriam pontuar');
  await shot('13-report-en');
  step('mesma prova em inglês: pré-prova, questões, revisão e relatório traduzidos, com o mesmo gabarito');

  // Painel de progresso
  await click('[data-act="dash"]');
  await waitFor(`document.querySelector('.dash')`);
  assert.match(await text('.dash h1'), /Painel de progresso/);
  assert.match(await text('.kpis'), /Simulados concluídos\s*2\s*de 12/);
  assert.match(await text('.kpis'), /1 em português · 1 em inglês/);
  assert.equal(await evaluate(`document.querySelectorAll('.chart .ch-pt').length`), 2);
  assert.equal(await evaluate(`document.querySelectorAll('.hist-table tbody tr').length`), 2);
  assert.ok(await evaluate(`document.querySelectorAll('.dash-grid .hbars li').length`) === 6);
  await evaluate(`document.querySelector('.ch-pt').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))`);
  assert.match(await evaluate(`(document.querySelector('.ch-tip:not([hidden])') || {}).textContent || ''`), /Simulado 04/);
  await shot('14-dashboard');
  await click('.hist-table [data-act="report"]');
  await waitFor(`document.querySelector('.report')`);
  await click('[data-act="home"]');
  await waitFor(`document.querySelector('.home')`);
  assert.equal(await evaluate(`document.documentElement.lang`), 'pt-BR');
  await click('input[data-act="lang"][data-v="pt"]');
  step('painel de progresso: indicadores, evolução com dica ao passar o mouse, domínios e histórico');

  // Celular
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await click('[data-act="continue"][data-bank="gh300-practice-a"]');
  await waitFor(`document.querySelector('.exam')`);
  await evaluate(`(() => { const a = GHX.App.ui.att; const s = a.sections.findIndex(x => x.items.includes('pa-c1')); GHX.Session.goTo(a, s, a.sections[s].items.indexOf('pa-c1')); GHX.App.render(); })()`);
  await click('[data-act="reset"]');
  assert.equal(await resp('pa-c1'), null);
  await answer('pa-c1');
  assert.equal(await evaluate(`GHX.Scoring.score(GHX.getItem('pa-c1'), GHX.App.ui.att.answers['pa-c1'])`), 1);
  const overflow = await evaluate(`document.documentElement.scrollWidth - window.innerWidth`);
  assert.ok(overflow <= 0, 'rolagem horizontal no celular: ' + overflow);
  await shot('11-mobile');
  step('layout de celular (390 px) sem rolagem horizontal, com arrastar por toque');

  assert.deepEqual(errors, [], 'erros no console');
  step('nenhum erro de JavaScript no console');

  cdp.close();
  return dir;
}

let dir;
try {
  dir = await run();
  console.log(`\n${passed} verificações ok.` + (SHOTS ? ' Capturas em tests/e2e-output/.' : ''));
} catch (e) {
  console.error('\n✖ ' + (e.stack || e.message));
  if (errors.length) console.error('Erros do console:\n' + errors.join('\n'));
  try { await shot('zz-failure'); } catch { /* ignore */ }
  process.exitCode = 1;
} finally {
  for (const p of procs) { try { p.kill(); } catch { /* ignore */ } }
  if (dir) { await sleep(200); try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
}
