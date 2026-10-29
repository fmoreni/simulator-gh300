// Correção pura por tipo: (item, resposta) -> 0..1, com crédito parcial por parte. Sem DOM.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  function keys(o) { return o ? Object.keys(o) : []; }

  // Em multi e hotspot cada seleção errada anula um acerto.
  function selection(correct, given) {
    given = Array.isArray(given) ? given : [];
    var hit = 0, miss = 0;
    given.forEach(function (g) { if (correct.indexOf(g) >= 0) hit++; else miss++; });
    return Math.max(0, hit - miss) / correct.length;
  }

  function perKey(expected, given) {
    var k = keys(expected);
    if (!k.length) return 0;
    given = given || {};
    var ok = k.filter(function (x) { return given[x] === expected[x]; }).length;
    return ok / k.length;
  }

  var S = {};

  S.score = function (it, r) {
    if (r == null) return 0;
    switch (it.type) {
      case 'single': return r === it.a ? 1 : 0;
      case 'ps': return r === it.a ? 1 : 0;
      case 'multi':
      case 'hotspot': return selection(it.a, r);
      case 'match':
      case 'inline':
      case 'dropdown':
      case 'yesno': return perKey(it.a, r);
      case 'order': {
        if (!Array.isArray(r)) return 0;
        var ok = 0;
        it.a.forEach(function (id, i) { if (r[i] === id) ok++; });
        return ok / it.a.length;
      }
    }
    return 0;
  };

  // Quantas partes o item espera (para avisar resposta incompleta).
  S.expectedParts = function (it) {
    switch (it.type) {
      case 'multi':
      case 'hotspot': return it.n;
      case 'match': return it.targets.length;
      case 'inline': return GHX.slots(it.code).length;
      case 'dropdown': return GHX.slots(it.code || it.text).length;
      case 'order': return it.a.length;
      case 'yesno': return it.rows.length;
      default: return 1;
    }
  };

  S.givenParts = function (it, r) {
    if (r == null) return 0;
    switch (it.type) {
      case 'single': return typeof r === 'number' ? 1 : 0;
      case 'ps': return typeof r === 'boolean' ? 1 : 0;
      case 'multi':
      case 'hotspot':
      case 'order': return Array.isArray(r) ? r.length : 0;
      case 'yesno': return keys(r).filter(function (k) { return typeof r[k] === 'boolean'; }).length;
      default: return keys(r).filter(function (k) { return r[k] != null; }).length;
    }
  };

  S.isAnswered = function (it, r) { return S.givenParts(it, r) > 0; };
  S.isComplete = function (it, r) { return S.givenParts(it, r) >= S.expectedParts(it); };

  // Resultado consolidado de uma lista de itens e respostas.
  S.results = function (items, answers, cert) {
    cert = cert || GHX.CERTS['GH-300'];
    var byD = {}, total = 0, rows = [];
    cert.domains.forEach(function (dm) { byD[dm.d] = { d: dm.d, name: dm.name, short: dm.short, score: 0, max: 0 }; });
    items.forEach(function (it) {
      var sc = S.score(it, answers[it.id]);
      total += sc;
      if (byD[it.d]) { byD[it.d].score += sc; byD[it.d].max += 1; }
      rows.push({ id: it.id, d: it.d, type: it.type, score: sc });
    });
    var domains = cert.domains.map(function (dm) {
      var x = byD[dm.d];
      x.pct = x.max ? Math.round((x.score / x.max) * 100) : null;
      return x;
    });
    return {
      score: total,
      max: items.length,
      pct: items.length ? Math.round((total / items.length) * 1000) / 10 : 0,
      domains: domains,
      items: rows,
    };
  };

  GHX.Scoring = S;
})();
