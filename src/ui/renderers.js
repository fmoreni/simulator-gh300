// Um renderer por tipo de item. Gera HTML em string (testável no Node) e atualiza
// respostas de forma pura; a ligação de eventos fica em app.js e dnd.js.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var esc = GHX.esc, t = function (k, v) { return GHX.t(k, v); };
  var R = {};

  // Marcação mínima no texto: `código`, **negrito** e quebras de linha.
  R.md = function (text) {
    var parts = String(text || '').split(/\n{2,}/);
    return parts.map(function (p) {
      var h = esc(p)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return '<p>' + h + '</p>';
    }).join('');
  };

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function label(list, id) { var x = byId(list, id); return x ? x.label : ''; }
  function attr(cond, a) { return cond ? ' ' + a : ''; }
  function order(it, sh, key, fallback) { return sh && sh[key] ? sh[key] : fallback; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function idsOf(list) { return list.map(function (x) { return x.id; }); }
  function mark(ok) {
    return ok ? '<span class="mk ok" aria-label="' + t('correct') + '">✓</span>' : '<span class="mk bad" aria-label="' + t('incorrect') + '">✗</span>';
  }

  // Itens que usam a área de resposta separada por divisor (arrastar e código).
  R.usesDivider = function (it) {
    return ['match', 'inline', 'order', 'dropdown', 'hotspot'].indexOf(it.type) >= 0;
  };

  R.instruction = function (it) {
    switch (it.type) {
      case 'single': return t('instr.single', { n: it.o.length });
      case 'multi': return t('instr.multi', { n: it.n, m: it.o.length });
      case 'match': return t('instr.match') + t(it.reuse ? 'instr.match.reuse' : 'instr.match.once') + t('instr.match.kbd');
      case 'inline': return t('instr.inline') + t(it.reuse ? 'instr.inline.reuse' : 'instr.inline.once') + t('instr.inline.kbd');
      case 'dropdown': return t('instr.dropdown');
      case 'order': return t('instr.order') + (it.extra && it.extra.length ? t('instr.order.extra') : '');
      case 'yesno': return t('instr.yesno', { a: it.labels[0], b: it.labels[1] });
      case 'ps': return t('instr.ps');
      case 'hotspot': return t('instr.hotspot', { n: it.n });
    }
    return '';
  };

  // ---------- renderers ----------

  var T = {};

  var LETTERS = 'ABCDEFGHIJ';
  function letter(pos) { return '<span class="ltr" aria-hidden="true">' + LETTERS[pos] + '.</span>'; }

  T.single = function (it, c) {
    var ord = order(it, c.shuffle, 'o', range(it.o.length));
    return '<div class="opts" role="radiogroup" aria-label="' + t('options') + '">' + ord.map(function (i, pos) {
      var on = c.resp === i, fb = '';
      if (c.checked) fb = i === it.a ? mark(true) : (on ? mark(false) : '');
      return '<label class="opt' + attr(on, 'sel') + (c.checked && i === it.a ? ' right' : '') + '" data-k="o' + i + '">' +
        '<input type="radio" name="ans-' + esc(it.id) + '" data-act="single" data-i="' + i + '"' + attr(on, 'checked') + attr(c.locked, 'disabled') + '>' +
        letter(pos) + '<span>' + R.inline(it.o[i]) + '</span>' + fb + '</label>';
    }).join('') + '</div>';
  };

  T.multi = function (it, c) {
    var ord = order(it, c.shuffle, 'o', range(it.o.length));
    var sel = Array.isArray(c.resp) ? c.resp : [];
    var full = sel.length >= it.n;
    return '<div class="opts" role="group" aria-label="' + t('options') + '">' + ord.map(function (i, pos) {
      var on = sel.indexOf(i) >= 0, fb = '';
      if (c.checked) fb = it.a.indexOf(i) >= 0 ? mark(true) : (on ? mark(false) : '');
      return '<label class="opt' + attr(on, 'sel') + (c.checked && it.a.indexOf(i) >= 0 ? ' right' : '') + '" data-k="o' + i + '">' +
        '<input type="checkbox" data-act="multi" data-i="' + i + '"' + attr(on, 'checked') + attr(c.locked || (full && !on), 'disabled') + '>' +
        letter(pos) + '<span>' + R.inline(it.o[i]) + '</span>' + fb + '</label>';
    }).join('') + '</div>';
  };

  function tile(id, text, extra) {
    return '<button type="button" class="tile" data-tile="' + esc(id) + '" data-k="tile-' + esc(id) + (extra && extra.from ? '-in-' + esc(extra.from) : '') + '"' +
      (extra && extra.from ? ' data-from="' + esc(extra.from) + '"' : '') +
      attr(extra && extra.locked, 'disabled') + ' aria-label="' + esc(text) + (extra && extra.from ? t('placed') : '') + '">' + R.inline(text) + '</button>';
  }

  function sourceTiles(list, ordIds, used, c, reuse, title) {
    var avail = ordIds.filter(function (id) { return reuse || used.indexOf(id) < 0; });
    return '<div class="pool" data-zone="__pool" data-k="pool" aria-label="' + esc(title) + '">' +
      '<div class="pool-h">' + esc(title) + '</div>' +
      (avail.length ? avail.map(function (id) { return tile(id, label(list, id), { locked: c.locked }); }).join('') : '<span class="muted">—</span>') +
      '</div>';
  }

  T.match = function (it, c) {
    var r = c.resp || {};
    var used = Object.keys(r).map(function (k) { return r[k]; });
    var ord = order(it, c.shuffle, 'tiles', idsOf(it.tiles));
    var rows = it.targets.map(function (tg) {
      var v = r[tg.id], fb = '';
      if (c.checked) fb = mark(v === it.a[tg.id]);
      return '<div class="mrow"><div class="mtarget">' + R.inline(tg.label) + '</div>' +
        '<div class="zone' + attr(!v, 'empty') + '" data-zone="' + esc(tg.id) + '" data-k="zone-' + esc(tg.id) + '" tabindex="' + (c.locked ? -1 : 0) + '" role="button" aria-label="' + t('target') + ': ' + esc(tg.label) + ' — ' + (v ? esc(label(it.tiles, v)) : t('empty')) + '">' +
        (v ? tile(v, label(it.tiles, v), { from: tg.id, locked: c.locked }) : '') + '</div>' + fb + '</div>';
    }).join('');
    return '<div class="dnd match">' + sourceTiles(it.tiles, ord, used, c, it.reuse, it.tilesTitle || t('tiles')) +
      '<div class="answer-area"><div class="pool-h">Answer Area</div>' + (it.targetsTitle ? '<div class="mhead"><span>' + esc(it.targetsTitle) + '</span><span></span></div>' : '') + rows + '</div></div>';
  };

  T.inline = function (it, c) {
    var r = c.resp || {};
    var used = Object.keys(r).map(function (k) { return r[k]; });
    var ord = order(it, c.shuffle, 'tokens', idsOf(it.tokens));
    var html = esc(it.code).replace(/\[\[([A-Za-z0-9_-]+)\]\]/g, function (_, g) {
      var v = r[g], fb = c.checked ? mark(v === it.a[g]) : '';
      return '<span class="gap zone' + attr(!v, 'empty') + '" data-zone="' + g + '" data-k="zone-' + g + '" tabindex="' + (c.locked ? -1 : 0) + '" role="button" aria-label="' + t('gap') + ' ' + g + (v ? ': ' + esc(label(it.tokens, v)) : ' ' + t('gap.empty')) + '">' +
        (v ? tile(v, label(it.tokens, v), { from: g, locked: c.locked }) : '&nbsp;') + '</span>' + fb;
    });
    return '<div class="dnd inline">' + sourceTiles(it.tokens, ord, used, c, it.reuse, it.tokensTitle || t('tokens')) +
      '<div class="answer-area"><div class="pool-h">Answer Area</div><pre class="code' + (it.lang ? ' lang-' + esc(it.lang) : '') + '">' + html + '</pre></div></div>';
  };

  T.dropdown = function (it, c) {
    var r = c.resp || {};
    var src = it.code || it.text;
    var html = esc(src).replace(/\[\[([A-Za-z0-9_-]+)\]\]/g, function (_, k) {
      var opts = it.lists[k], v = r[k], fb = c.checked ? mark(v === it.a[k]) : '';
      return '<select class="dd" data-act="dd" data-list="' + k + '" data-k="dd-' + k + '" aria-label="' + t('list') + ' ' + k + '"' + attr(c.locked, 'disabled') + '>' +
        '<option value=""' + attr(v == null, 'selected') + '>▾</option>' +
        opts.map(function (o, i) { return '<option value="' + i + '"' + attr(v === i, 'selected') + '>' + esc(o) + '</option>'; }).join('') +
        '</select>' + fb;
    });
    var body = it.code ? '<pre class="code">' + html + '</pre>' : '<div class="dd-text">' + html.replace(/\n/g, '<br>') + '</div>';
    return '<div class="answer-area dropdown"><div class="pool-h">Answer Area</div>' + body + '</div>';
  };

  T.order = function (it, c) {
    var r = Array.isArray(c.resp) ? c.resp : [];
    var ord = order(it, c.shuffle, 'o', idsOf(it.o));
    var pool = ord.filter(function (id) { return r.indexOf(id) < 0; });
    var list = r.map(function (id, i) {
      var fb = c.checked ? mark(it.a[i] === id) : '';
      return '<li class="oslot" data-zone="pos:' + i + '" data-k="pos-' + i + '">' +
        '<span class="onum">' + (i + 1) + '</span>' + tile(id, label(it.o, id), { from: 'pos:' + i, locked: c.locked }) +
        '<span class="omove">' +
        '<button type="button" class="mini" data-act="order-move" data-ref="' + esc(id) + '" data-delta="-1" aria-label="' + t('move.up') + '"' + attr(c.locked || i === 0, 'disabled') + '>▲</button>' +
        '<button type="button" class="mini" data-act="order-move" data-ref="' + esc(id) + '" data-delta="1" aria-label="' + t('move.down') + '"' + attr(c.locked || i === r.length - 1, 'disabled') + '>▼</button>' +
        '<button type="button" class="mini" data-act="order-remove" data-ref="' + esc(id) + '" aria-label="' + t('remove') + '"' + attr(c.locked, 'disabled') + '>✕</button>' +
        '</span>' + fb + '</li>';
    }).join('');
    return '<div class="dnd order">' +
      '<div class="pool" data-zone="__pool" data-k="pool"><div class="pool-h">Actions</div>' +
      (pool.length ? pool.map(function (id) { return tile(id, label(it.o, id), { locked: c.locked }); }).join('') : '<span class="muted">—</span>') + '</div>' +
      '<div class="answer-area"><div class="pool-h">Answer Area</div><ol class="olist">' + list + '</ol>' +
      '<div class="zone empty oend" data-zone="pos:' + r.length + '" data-k="pos-end" tabindex="' + (c.locked ? -1 : 0) + '" role="button" aria-label="' + t('order.end') + '">' + t('drop.here') + '</div></div></div>';
  };

  T.yesno = function (it, c) {
    var r = c.resp || {};
    return '<table class="yn"><thead><tr><th>' + t('statement') + '</th><th>' + esc(it.labels[0]) + '</th><th>' + esc(it.labels[1]) + '</th>' + (c.checked ? '<th></th>' : '') + '</tr></thead><tbody>' +
      it.rows.map(function (row) {
        var v = r[row.id];
        var cell = function (val, i) {
          return '<td><input type="radio" name="yn-' + esc(it.id) + '-' + esc(row.id) + '" data-act="yn" data-row="' + esc(row.id) + '" data-val="' + val + '" data-k="yn-' + esc(row.id) + '-' + i + '" aria-label="' + esc(it.labels[i]) + '"' + attr(v === val, 'checked') + attr(c.locked, 'disabled') + '></td>';
        };
        return '<tr><td>' + R.inline(row.text) + '</td>' + cell(true, 0) + cell(false, 1) + (c.checked ? '<td>' + mark(v === it.a[row.id]) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  };

  T.ps = function (it, c) {
    var v = c.resp;
    var opt = function (val, txt, i) {
      var fb = c.checked ? (val === it.a ? mark(true) : (v === val ? mark(false) : '')) : '';
      return '<label class="opt' + attr(v === val, 'sel') + '" data-k="ps' + i + '"><input type="radio" name="ps-' + esc(it.id) + '" data-act="ps" data-val="' + val + '"' + attr(v === val, 'checked') + attr(c.locked, 'disabled') + '><span>' + txt + '</span>' + fb + '</label>';
    };
    return '<div class="ps-sol"><strong>' + t('solution') + '</strong> ' + R.inline(it.sol) + '</div>' +
      '<p class="ps-ask">' + t('ps.ask') + '</p>' +
      '<div class="opts" role="radiogroup">' + opt(true, t('yes'), 0) + opt(false, t('no'), 1) + '</div>';
  };

  T.hotspot = function (it, c) {
    var sel = Array.isArray(c.resp) ? c.resp : [];
    var full = sel.length >= it.n;
    var regions = it.regions.map(function (g) {
      var on = sel.indexOf(g.id) >= 0;
      var cls = 'hs' + attr(on, 'on');
      if (c.checked) cls += it.a.indexOf(g.id) >= 0 ? ' right' : (on ? ' wrong' : '');
      return '<rect class="' + cls + '" data-act="hot" data-region="' + esc(g.id) + '" data-k="hs-' + esc(g.id) + '" x="' + g.x + '" y="' + g.y + '" width="' + g.w + '" height="' + g.h + '" rx="3" tabindex="' + (c.locked || (full && !on) ? -1 : 0) + '" role="checkbox" aria-checked="' + on + '" aria-label="' + esc(g.label) + '"></rect>';
    }).join('');
    return '<div class="answer-area hotspot"><div class="pool-h">Answer Area</div>' +
      '<svg class="hs-svg" viewBox="' + esc(it.viewBox) + '" role="group" aria-label="' + t('hs.img') + '" xmlns="http://www.w3.org/2000/svg">' + it.svg + regions + '</svg>' +
      '<div class="muted small">' + t('hs.count', { a: sel.length, b: it.n }) + '</div></div>';
  };

  R.types = T;

  // Texto curto em linha (alternativas, rótulos): só `código` e **negrito**.
  R.inline = function (text) {
    return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  };

  // Bloco completo do item: enunciado, código, divisor e área de resposta.
  // ctx: { resp, shuffle, checked, locked }
  R.item = function (it, ctx) {
    ctx = ctx || {};
    var body = T[it.type] ? T[it.type](it, ctx) : '<p>' + t('unsupported') + esc(it.type) + '</p>';
    var stem = '<div class="stem">' + R.md(it.q) + (it.ex ? '<pre class="code">' + esc(it.ex) + '</pre>' : '') + '</div>';
    var instr = '<p class="instr">' + esc(R.instruction(it)) + '</p>';
    var divider = R.usesDivider(it) ? '<hr class="divider" aria-hidden="true">' : '';
    return '<div class="item t-' + it.type + (ctx.locked ? ' is-locked' : '') + (ctx.checked ? ' is-checked' : '') + '" data-item="' + esc(it.id) + '">' +
      stem + instr + divider + '<div class="resp">' + body + '</div>' +
      (ctx.checked ? R.feedback(it, ctx.resp) : '') + '</div>';
  };

  // ---------- atualização pura das respostas ----------

  function copy(o) { return o && typeof o === 'object' ? JSON.parse(JSON.stringify(o)) : o; }

  R.update = function (it, resp, a) {
    var r = copy(resp);
    switch (a.kind) {
      case 'single': return a.i;
      case 'ps': return a.val;
      case 'multi':
      case 'hot': {
        var key = a.kind === 'multi' ? a.i : a.region;
        r = Array.isArray(r) ? r : [];
        var at = r.indexOf(key);
        var on = a.on == null ? at < 0 : a.on;
        if (on && at < 0) { if (r.length >= it.n) return r.length ? r : null; r.push(key); }
        if (!on && at >= 0) r.splice(at, 1);
        if (a.kind === 'multi') r.sort(function (x, y) { return x - y; });
        return r.length ? r : null;
      }
      case 'dd': {
        r = r || {};
        if (a.val == null || a.val === '') delete r[a.list]; else r[a.list] = Number(a.val);
        return Object.keys(r).length ? r : null;
      }
      case 'yn': {
        r = r || {};
        r[a.row] = a.val;
        return r;
      }
      case 'place': {
        // match e inline: solta um tile em um alvo (ou de volta na origem quando zone é nulo).
        r = r || {};
        if (a.from && a.from !== '__pool') delete r[a.from];
        if (a.zone && a.zone !== '__pool') {
          if (!it.reuse) Object.keys(r).forEach(function (k) { if (r[k] === a.tile) delete r[k]; });
          r[a.zone] = a.tile;
        }
        return Object.keys(r).length ? r : null;
      }
      case 'unplace': {
        r = r || {};
        delete r[a.zone];
        return Object.keys(r).length ? r : null;
      }
      case 'order-add': {
        r = Array.isArray(r) ? r : [];
        var cur = r.indexOf(a.tile);
        var pos = a.at == null ? r.length : a.at;
        if (cur >= 0) { r.splice(cur, 1); if (cur < pos) pos--; }
        if (pos > r.length) pos = r.length;
        r.splice(pos, 0, a.tile);
        return r;
      }
      case 'order-remove': {
        r = Array.isArray(r) ? r.filter(function (x) { return x !== a.tile; }) : [];
        return r.length ? r : null;
      }
      case 'order-move': {
        r = Array.isArray(r) ? r : [];
        var i = r.indexOf(a.tile), j = i + a.delta;
        if (i < 0 || j < 0 || j >= r.length) return r;
        r.splice(i, 1);
        r.splice(j, 0, a.tile);
        return r;
      }
    }
    return r;
  };

  // Converte um "drop" do arrastar-e-soltar na ação certa para o tipo do item.
  R.dropAction = function (it, tile, from, zone) {
    if (it.type === 'order') {
      if (!zone || zone === '__pool') return { kind: 'order-remove', tile: tile };
      return { kind: 'order-add', tile: tile, at: Number(zone.split(':')[1]) };
    }
    if (!zone || zone === '__pool') return from && from !== '__pool' ? { kind: 'unplace', zone: from } : null;
    return { kind: 'place', tile: tile, from: from, zone: zone };
  };

  // ---------- textos de resposta, gabarito e feedback ----------

  R.describe = function (it, r) {
    var none = '<span class="muted">' + t('no.answer') + '</span>';
    if (r == null) return none;
    var li = function (xs) { return xs.length ? '<ul class="ans">' + xs.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : none; };
    switch (it.type) {
      case 'single': return it.o[r] != null ? R.inline(it.o[r]) : none;
      case 'ps': return r ? t('yes') : t('no');
      case 'multi': return li(r.map(function (i) { return R.inline(it.o[i]); }));
      case 'hotspot': return li(r.map(function (id) { return esc(label(it.regions, id)); }));
      case 'match': return li(it.targets.filter(function (tg) { return r[tg.id]; }).map(function (tg) { return R.inline(tg.label) + ' → ' + R.inline(label(it.tiles, r[tg.id])); }));
      case 'inline': return li(GHX.slots(it.code).filter(function (g) { return r[g]; }).map(function (g) { return '<code>' + esc(g) + '</code>: ' + R.inline(label(it.tokens, r[g])); }));
      case 'dropdown': return li(GHX.slots(it.code || it.text).filter(function (k) { return r[k] != null; }).map(function (k) { return '<code>' + esc(k) + '</code>: ' + esc(it.lists[k][r[k]]); }));
      case 'order': return r.length ? '<ol class="ans">' + r.map(function (id) { return '<li>' + R.inline(label(it.o, id)) + '</li>'; }).join('') + '</ol>' : none;
      case 'yesno': return li(it.rows.filter(function (row) { return typeof r[row.id] === 'boolean'; }).map(function (row) { return R.inline(row.text) + ': <strong>' + esc(r[row.id] ? it.labels[0] : it.labels[1]) + '</strong>'; }));
    }
    return none;
  };

  R.whyList = function (it) {
    var w = it.why;
    if (!w) return '';
    if (typeof w === 'string') return '<p>' + R.inline(w) + '</p>';
    if (Array.isArray(w)) {
      if (!w.length) return '';
      return '<ul class="why">' + w.map(function (txt, i) {
        var ok = it.type === 'single' ? i === it.a : it.a.indexOf(i) >= 0;
        return '<li class="' + (ok ? 'ok' : 'bad') + '"><strong>' + R.inline(it.o[i]) + '</strong> — ' + R.inline(txt) + '</li>';
      }).join('') + '</ul>';
    }
    var partLabel = function (k) {
      var src = it.targets || it.rows || it.regions || it.o;
      var x = src && byId(src, k);
      return x ? (x.label || x.text) : k;
    };
    return '<ul class="why">' + Object.keys(w).map(function (k) {
      return '<li><strong>' + R.inline(partLabel(k)) + '</strong> — ' + R.inline(w[k]) + '</li>';
    }).join('') + '</ul>';
  };

  R.refs = function (it) {
    return '<ul class="refs">' + it.ref.map(function (u) {
      return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https:\/\//, '')) + '</a></li>';
    }).join('') + '</ul>';
  };

  R.feedback = function (it, resp) {
    var sc = GHX.Scoring.score(it, resp);
    var cls = sc === 1 ? 'ok' : sc > 0 ? 'part' : 'bad';
    var txt = sc === 1 ? t('correct') : sc > 0 ? t('partial', { pct: Math.round(sc * 100) }) : t('incorrect');
    return '<section class="feedback ' + cls + '" aria-live="polite">' +
      '<h3>' + txt + '</h3>' +
      '<div class="fb-grid"><div><h4>' + t('fb.yours') + '</h4>' + R.describe(it, resp) + '</div>' +
      '<div><h4>' + t('fb.right') + '</h4>' + R.describe(it, it.a) + '</div></div>' +
      '<h4>' + t('fb.exp') + '</h4>' + R.md(it.exp) +
      R.whyList(it) +
      '<h4>' + t('fb.docs') + '</h4>' + R.refs(it) + '</section>';
  };

  // ---------- estudo de caso ----------

  // Cada aba vira uma seção expansível; cada <h4> dentro dela vira uma subseção.
  R.caseStudy = function (cs, opts) {
    opts = opts || {};
    var open = opts.open || {};
    var all = !!opts.all;
    var tabs = cs.tabs.map(function (tab, ti) {
      var chunks = String(tab.html).split(/(?=<h4>)/i).filter(function (x) { return x.trim(); });
      var subs = chunks.map(function (ch, si) {
        var m = /^<h4>([\s\S]*?)<\/h4>/i.exec(ch);
        if (!m) return '<div class="cs-intro">' + ch + '</div>';
        var key = ti + '.' + si;
        var isOpen = all || open[key];
        return '<div class="cs-sub' + attr(isOpen, 'open') + '">' +
          '<button type="button" class="cs-toggle" data-act="cs-sub" data-key="' + key + '" aria-expanded="' + !!isOpen + '">' + m[1] + '</button>' +
          (isOpen ? '<div class="cs-body">' + ch.slice(m[0].length) + '</div>' : '') + '</div>';
      }).join('');
      var key = String(ti);
      var isOpen = all || open[key];
      return '<section class="cs-sec' + attr(isOpen, 'open') + '">' +
        '<button type="button" class="cs-toggle cs-top" data-act="cs-sec" data-key="' + key + '" aria-expanded="' + !!isOpen + '">' + esc(tab.title) + '</button>' +
        (isOpen ? '<div class="cs-subs">' + subs + '</div>' : '') + '</section>';
    }).join('');
    return '<div class="case-study"><div class="cs-head"><h2>' + esc(cs.title) + '</h2>' +
      '<button type="button" class="btn small" data-act="cs-all" aria-pressed="' + all + '">' + (all ? 'Collapse All' : 'All Information') + '</button></div>' +
      tabs + '</div>';
  };

  GHX.Render = R;
})();
