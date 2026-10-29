// Consolidação do histórico para o painel de progresso. Sem DOM.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  function round1(x) { return Math.round(x * 10) / 10; }

  // history: tentativas finalizadas (qualquer ordem). banks: simulados na ordem da tela inicial.
  GHX.Progress = {
    summary: function (history, banks, cert) {
      cert = cert || GHX.CERTS['GH-300'];
      var done = (history || []).filter(function (a) { return a && a.status === 'finished' && a.result && GHX.getBank(a.bankId); })
        .slice().sort(function (x, y) { return (x.finishedAt || 0) - (y.finishedAt || 0); });

      var dom = {};
      cert.domains.forEach(function (dm) { dom[dm.d] = { d: dm.d, name: dm.name, short: dm.short, short_en: dm.short_en, score: 0, max: 0, pct: null }; });
      var mastered = {}, seenItems = {}, timeMs = 0, sum = 0, best = null, byLang = { pt: 0, en: 0 }, byMode = { exam: 0, study: 0 };

      done.forEach(function (a) {
        sum += a.result.pct;
        timeMs += a.elapsedMs || 0;
        if (!best || a.result.pct > best.result.pct) best = a;
        byLang[a.lang === 'en' ? 'en' : 'pt']++;
        byMode[a.mode === 'study' ? 'study' : 'exam']++;
        (a.result.items || []).forEach(function (r) {
          if (!GHX.getItem(r.id)) return; // questão removida em uma atualização
          seenItems[r.id] = 1;
          if (r.score === 1) mastered[r.id] = 1;
          if (dom[r.d]) { dom[r.d].score += r.score; dom[r.d].max += 1; }
        });
      });
      var domains = cert.domains.map(function (dm) {
        var x = dom[dm.d];
        x.pct = x.max ? round1((x.score / x.max) * 100) : null;
        return x;
      });

      var perBank = banks.map(function (b) {
        var mine = done.filter(function (a) { return a.bankId === b.id; });
        var last = mine[mine.length - 1];
        return {
          id: b.id, title: b.title, level: b.level,
          attempts: mine.length,
          best: mine.length ? Math.max.apply(null, mine.map(function (a) { return a.result.pct; })) : null,
          last: last ? last.result.pct : null,
          lastAt: last ? last.finishedAt : null,
        };
      });

      var rated = domains.filter(function (x) { return x.pct != null; });
      var weakest = rated.length ? rated.slice().sort(function (x, y) { return x.pct - y.pct; })[0] : null;
      var next = perBank.filter(function (p) { return !p.attempts; })[0] ||
        perBank.slice().sort(function (x, y) { return x.best - y.best; })[0] || null;
      var itemsTotal = banks.reduce(function (n, b) { return n + GHX.bankItems(b).length; }, 0);

      return {
        attempts: done.length,
        banksDone: perBank.filter(function (p) { return p.attempts; }).length,
        banksTotal: banks.length,
        avg: done.length ? round1(sum / done.length) : null,
        best: best ? { pct: best.result.pct, bankId: best.bankId } : null,
        mastered: Object.keys(mastered).length,
        seen: Object.keys(seenItems).length,
        itemsTotal: itemsTotal,
        timeMs: timeMs,
        byLang: byLang,
        byMode: byMode,
        domains: domains,
        weakest: weakest,
        next: next,
        perBank: perBank,
        trend: done.map(function (a) {
          return { id: a.id, at: a.finishedAt, pct: a.result.pct, bankId: a.bankId, mode: a.mode, lang: a.lang === 'en' ? 'en' : 'pt', elapsedMs: a.elapsedMs || 0 };
        }),
      };
    },
  };
})();
