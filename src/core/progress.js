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
        analysis: GHX.Progress.analyze(done, banks, cert),
      };
    },
  };

  // ---------- prontidão por domínio e subtema ----------
  //
  // Critérios internos de acompanhamento (não são parâmetros oficiais da certificação):
  // - acerto = questão totalmente correta; parcial conta como erro;
  // - no modo exame, toda questão da tentativa foi avaliada (sem resposta = erro);
  //   no modo estudo, só as questões respondidas;
  // - o indicador principal usa a primeira avaliação de cada questão; as repetições
  //   (refazer o mesmo simulado) mostram a evolução, sem contar como evidência nova.

  var BANDS = [
    { min: 90, key: 'exc', label: 'Excelente domínio' },
    { min: 80, key: 'good', label: 'Bom domínio' },
    { min: 70, key: 'dev', label: 'Em desenvolvimento' },
    { min: 60, key: 'imp', label: 'Precisa melhorar' },
    { min: -1, key: 'pri', label: 'Prioridade de estudo' },
  ];
  var READY = [
    { min: 90, key: 'exc', label: 'Preparação elevada' },
    { min: 80, key: 'good', label: 'Boa preparação' },
    { min: 70, key: 'dev', label: 'Preparação intermediária' },
    { min: 60, key: 'imp', label: 'Necessita reforço' },
    { min: -1, key: 'pri', label: 'Preparação insuficiente' },
  ];
  var MIN_DOMAIN = 10;   // questões avaliadas por domínio para considerar a amostra suficiente
  var MIN_TOPIC = 5;     // questões avaliadas para classificar um subtema
  var SCHEDULE = { readiness: 85, domainFloor: 75 };

  function band(list, pct) {
    if (pct == null) return null;
    for (var i = 0; i < list.length; i++) if (pct >= list[i].min) return list[i];
    return list[list.length - 1];
  }

  // Subtemas a partir dos links de documentação oficial cadastrados em cada questão (ref).
  // Links genéricos (guia de estudo) não definem subtema.
  var TOPICS = [
    ['Princípios de IA responsável', ['RAI', 'RAI6']],
    ['Riscos e limitações da IA', ['RAI_RISKS']],
    ['Técnicas de prompt', ['PE', 'PROMPT_DOCS']],
    ['Fluxo de dados do prompt', ['FLOW']],
    ['Tratamento e retenção de dados', ['DATA']],
    ['Casos de uso de produtividade', ['USECASES']],
    ['Testes com o Copilot', ['TESTS']],
    ['Planos do Copilot', ['PLANS', 'LEARN_PLANS']],
    ['Content exclusion', ['CE_HOW', 'CE_ABOUT']],
    ['Copilot CLI', ['CLI_INSTALL', 'CLI_USE', 'CLI_REF', 'CLI_TOOLS']],
    ['Custom instructions', ['INSTR']],
    ['Prompt files', ['PROMPT_FILES']],
    ['Copilot Chat', ['CHEAT', 'VS_CHAT']],
    ['Sugestões inline e editor', ['VS_INLINE', 'VS_OVERVIEW']],
    ['Audit log', ['AUDIT']],
    ['REST API de licenças', ['API']],
    ['Código público, code referencing e IP indemnity', ['CODEREF', 'FIND_MATCH', 'LEARN_PROTECT']],
    ['Políticas', ['POLICIES', 'ORG_POLICIES']],
    ['Copilot code review', ['REVIEW']],
    ['Resumos de pull request', ['PR_SUMMARY', 'PR_SUMMARY_RAI']],
    ['Copilot Spaces', ['SPACES']],
    ['Model Context Protocol (MCP)', ['VS_MCP']],
    ['Agentes personalizados e modo agente', ['VS_AGENTS']],
    ['Copilot cloud agent', ['CLOUD_ABOUT', 'CLOUD_RISKS']],
    ['Agent skills', ['SKILLS']],
    ['Hooks', ['HOOKS']],
    ['Métricas de uso', ['METRICS']],
    ['Termos de uso', ['TERMS']],
    ['Solução de problemas', ['LEARN_TROUBLE']],
    ['GitHub Spark', ['SPARK']],
  ];
  var topicByUrl = null;
  function topicsOf(it) {
    if (!topicByUrl) {
      topicByUrl = {};
      var R = GHX.REF || {};
      TOPICS.forEach(function (t) { t[1].forEach(function (k) { if (R[k]) topicByUrl[R[k]] = t[0]; }); });
    }
    var out = [];
    (it.ref || []).forEach(function (u) { var t = topicByUrl[u]; if (t && out.indexOf(t) < 0) out.push(t); });
    return out;
  }

  // Questões avaliadas em uma tentativa finalizada: [{ id, d, score }].
  function evaluated(a) {
    var answers = a.answers || {};
    return (a.result.items || []).filter(function (r) {
      var it = GHX.getItem(r.id);
      if (!it) return false;
      return a.mode !== 'study' || GHX.Scoring.isAnswered(it, answers[r.id]);
    });
  }

  function stat(list) {
    var n = list.length, correct = 0, partial = 0;
    list.forEach(function (s) { if (s === 1) correct++; else if (s > 0) partial++; });
    return { n: n, correct: correct, partial: partial, wrong: n - correct, pct: n ? round1((correct / n) * 100) : null };
  }

  // Pesos: distribuição configurada nos simulados (questões por domínio / total).
  function weights(banks, cert) {
    var w = {}, total = 0;
    cert.domains.forEach(function (dm) { w[dm.d] = 0; });
    banks.forEach(function (b) { GHX.bankItems(b).forEach(function (it) { if (it.d in w) { w[it.d]++; total++; } }); });
    cert.domains.forEach(function (dm) { w[dm.d] = total ? w[dm.d] / total : 1 / cert.domains.length; });
    return w;
  }

  function readinessOf(byDomain, w, cert) {
    var sum = 0, wsum = 0, cov = 0;
    cert.domains.forEach(function (dm) {
      var s = byDomain[dm.d];
      if (!s || !s.n) return;
      cov++;
      sum += w[dm.d] * (s.correct / s.n);
      wsum += w[dm.d];
    });
    return { pct: wsum ? round1((sum / wsum) * 100) : null, coverage: cov };
  }

  GHX.Progress.BANDS = BANDS;
  GHX.Progress.READY = READY;
  GHX.Progress.MIN_DOMAIN = MIN_DOMAIN;
  GHX.Progress.MIN_TOPIC = MIN_TOPIC;
  GHX.Progress.topicsOf = topicsOf;

  GHX.Progress.analyze = function (done, banks, cert) {
    cert = cert || GHX.CERTS['GH-300'];
    var w = weights(banks, cert);
    var first = {}, latest = {}, evals = {};
    var timeline = [];
    var domAttempts = {};
    cert.domains.forEach(function (dm) { domAttempts[dm.d] = 0; });

    done.forEach(function (a) {
      var seenD = {};
      evaluated(a).forEach(function (r) {
        if (!(r.id in first)) first[r.id] = r.score;
        latest[r.id] = r.score;
        evals[r.id] = (evals[r.id] || 0) + 1;
        seenD[r.d] = 1;
      });
      Object.keys(seenD).forEach(function (d) { if (d in domAttempts) domAttempts[d]++; });
      // Evolução: prontidão com as primeiras avaliações acumuladas até esta tentativa.
      var byD = {};
      Object.keys(first).forEach(function (id) {
        var d = GHX.getItem(id).d;
        (byD[d] = byD[d] || []).push(first[id]);
      });
      var acc = {};
      Object.keys(byD).forEach(function (d) { acc[d] = stat(byD[d]); });
      var r = readinessOf(acc, w, cert);
      timeline.push({ id: a.id, at: a.finishedAt, bankId: a.bankId, readiness: r.pct, coverage: r.coverage, attemptPct: a.result.pct });
    });

    var ids = Object.keys(first);
    var group = function (keyFn) {
      var g = {};
      ids.forEach(function (id) {
        keyFn(GHX.getItem(id)).forEach(function (k) {
          var x = g[k] || (g[k] = { first: [], latest: [], repeated: 0 });
          x.first.push(first[id]);
          x.latest.push(latest[id]);
          if (evals[id] > 1) x.repeated++;
        });
      });
      return g;
    };
    var withTrend = function (x) {
      var s = stat(x.first), l = stat(x.latest);
      s.latestPct = l.pct;
      s.repeated = x.repeated;
      s.delta = x.repeated ? round1(l.pct - s.pct) : null;
      return s;
    };

    var gd = group(function (it) { return [it.d]; });
    var domains = cert.domains.map(function (dm) {
      var s = gd[dm.d] ? withTrend(gd[dm.d]) : { n: 0, correct: 0, partial: 0, wrong: 0, pct: null, latestPct: null, repeated: 0, delta: null };
      s.d = dm.d; s.name = dm.name; s.short = dm.short;
      s.weight = w[dm.d];
      s.attempts = domAttempts[dm.d];
      s.status = band(BANDS, s.pct);
      s.enough = s.n >= MIN_DOMAIN;
      return s;
    });
    var byDomain = {};
    domains.forEach(function (s) { byDomain[s.d] = s; });
    var r = readinessOf(byDomain, w, cert);

    var gt = group(topicsOf);
    var topics = Object.keys(gt).map(function (name) {
      var s = withTrend(gt[name]);
      s.name = name;
      s.enough = s.n >= MIN_TOPIC;
      s.status = s.enough ? band(BANDS, s.pct) : null;
      // Domínio predominante do subtema, para pesar a relevância na prova.
      var cnt = {};
      ids.forEach(function (id) { var it = GHX.getItem(id); if (topicsOf(it).indexOf(name) >= 0) cnt[it.d] = (cnt[it.d] || 0) + 1; });
      s.d = +Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; })[0];
      s.weight = w[s.d] || 0;
      return s;
    });

    var all = stat(ids.map(function (id) { return first[id]; }));
    var ready = band(READY, r.pct);
    var checks = [
      { ok: r.pct != null && r.pct >= SCHEDULE.readiness, label: 'Preparação estimada de ' + SCHEDULE.readiness + '% ou mais' },
      { ok: r.coverage === cert.domains.length, label: 'Os ' + cert.domains.length + ' domínios avaliados' },
      { ok: r.coverage === cert.domains.length && domains.every(function (s) { return s.pct >= SCHEDULE.domainFloor; }), label: 'Nenhum domínio abaixo de ' + SCHEDULE.domainFloor + '%' },
      { ok: domains.every(function (s) { return s.enough; }), label: 'Pelo menos ' + MIN_DOMAIN + ' questões avaliadas em cada domínio' },
    ];

    // O que estudar: subtemas classificados e domínios avaliados, por faixa e pelos critérios em ordem.
    var cand = topics.filter(function (s) { return s.enough; }).map(function (s) { return { kind: 'topic', name: s.name, s: s }; })
      .concat(domains.filter(function (s) { return s.n >= MIN_TOPIC; }).map(function (s) { return { kind: 'domain', name: 'Domínio ' + s.d + ' · ' + s.short, s: s }; }));
    cand.sort(function (x, y) {
      return (x.s.pct - y.s.pct) || (y.s.weight - x.s.weight) || (y.s.wrong - x.s.wrong) || (y.s.n - x.s.n) || ((x.s.delta || 0) - (y.s.delta || 0));
    });
    var plan = {
      high: cand.filter(function (c) { return c.s.pct < 70; }),
      mid: cand.filter(function (c) { return c.s.pct >= 70 && c.s.pct < 85; }),
      good: cand.filter(function (c) { return c.s.pct >= 85; }).reverse(),
    };
    var focus = (plan.high.concat(plan.mid).filter(function (c) { return c.kind === 'topic'; })[0]) || plan.high[0] || plan.mid[0] || null;

    return {
      readiness: r.pct,
      coverage: r.coverage,
      domainsTotal: cert.domains.length,
      partial: r.coverage < cert.domains.length,
      ready: ready,
      schedule: { ok: checks.every(function (c) { return c.ok; }), checks: checks },
      overall: all,
      evaluations: Object.keys(evals).reduce(function (n, id) { return n + evals[id]; }, 0),
      repeatedQuestions: ids.filter(function (id) { return evals[id] > 1; }).length,
      domains: domains,
      topics: topics.sort(function (x, y) { return (y.pct - x.pct) || (y.n - x.n); }),
      timeline: timeline,
      plan: plan,
      focus: focus,
    };
  };
})();
