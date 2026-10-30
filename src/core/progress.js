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

  // ---------- avaliação progressiva de prontidão ----------
  //
  // Três indicadores independentes:
  // - DESEMPENHO: quanto o candidato acertou (primeira resposta de cada questão);
  // - COBERTURA: quanto dos subobjetivos oficiais da GH-300 foi avaliado (objectives.js);
  // - CONFIANÇA: quantidade e qualidade das evidências (questões distintas, simulados
  //   diferentes, cobertura, consistência e diversidade de assuntos).
  // O índice de prontidão combina desempenho, cobertura, consistência, volume e retenção.
  // Critérios internos de acompanhamento, configuráveis em CONFIG; não são parâmetros
  // oficiais da certificação nem previsão de aprovação.
  //
  // Contagem: acerto = questão totalmente correta (parcial conta como erro); no modo exame,
  // toda questão da tentativa foi avaliada; no modo estudo, só as respondidas. Repetições
  // não contam como evidência nova: valem para evolução e, com 24 h ou mais, para retenção.

  var BANDS = [
    { min: 90, key: 'exc', label: 'Excelente domínio' },
    { min: 80, key: 'good', label: 'Bom domínio' },
    { min: 70, key: 'dev', label: 'Em desenvolvimento' },
    { min: 60, key: 'imp', label: 'Precisa melhorar' },
    { min: -1, key: 'pri', label: 'Prioridade de estudo' },
  ];
  var STATES = {
    initial: { key: 'initial', step: 1, label: 'Evidência inicial', st: 'imp',
      msg: 'Seu desempenho inicial é positivo, mas ainda existem assuntos que precisam ser avaliados.',
      msgLow: 'Seus primeiros resultados mostram pontos a reforçar, e ainda existem assuntos que precisam ser avaliados.' },
    developing: { key: 'developing', step: 2, label: 'Preparação em desenvolvimento', st: 'dev',
      msg: 'Você está evoluindo. Reforce os assuntos identificados antes de agendar a certificação.' },
    good: { key: 'good', step: 3, label: 'Boa evidência de preparação', st: 'good',
      msg: 'Seus resultados indicam boa preparação. Revise os pontos restantes antes de agendar a prova.' },
    ready: { key: 'ready', step: 4, label: 'Pronto para agendar', st: 'exc',
      msg: 'Os critérios de prontidão foram atendidos com evidência suficiente. Revise os pontos fracos restantes e agende a GH-300.' },
  };
  var CONF_BANDS = [
    { min: 80, key: 'exc', label: 'Alta' },
    { min: 60, key: 'good', label: 'Boa' },
    { min: 40, key: 'dev', label: 'Moderada' },
    { min: -1, key: 'imp', label: 'Limitada' },
  ];
  var COV_BANDS = [
    { min: 85, key: 'exc', label: 'Cobertura ampla' },
    { min: 70, key: 'good', label: 'Cobertura boa' },
    { min: 50, key: 'dev', label: 'Cobertura parcial' },
    { min: -1, key: 'imp', label: 'Cobertura baixa' },
  ];
  // Critérios heurísticos, configuráveis sem tocar no motor dos simulados.
  var CONFIG = {
    minDomain: 10,          // questões distintas para um domínio ter amostra suficiente
    minTopic: 5,            // questões distintas para um subtema ter evidência suficiente...
    minTopicBanks: 2,       // ...vindas de pelo menos 2 simulados diferentes
    minSub: 3,              // questões distintas para um subobjetivo oficial ser considerado avaliado
    volumeScale: 200,       // volume = 100 × (1 − e^(−questões/200)): 60 → 26, 240 → 70, 480 → 91
    banksScale: 2,          // simulados = 100 × (1 − e^(−simulados/2)): 1 → 39, 2 → 63, 4 → 86
    consistencyMinItems: 20, // questões de um simulado para entrar na consistência
    consistencyK: 2.5,      // consistência = 100 − 2,5 × desvio-padrão (p.p.) entre simulados
    retentionGapH: 24,      // reavaliação só conta para retenção 24 h ou mais depois da primeira
    retentionMin: 10,       // questões reavaliadas necessárias para medir retenção
    confidenceSingleCap: 39, // com um só simulado, a confiança fica no máximo "Limitada"
    readinessWeights: { performance: 35, coverage: 25, consistency: 20, volume: 10, retention: 10 },
    confidenceWeights: { volume: 25, banks: 20, coverage: 25, consistency: 15, diversity: 15 },
    ready: { index: 85, coverage: 85, overall: 85, domainFloor: 75, consistency: 70, confidence: 70, criticalDomain: 60, criticalSub: 50 },
    good: { performance: 80, coverage: 70, confidence: 55, domainFloor: 70 },
    developing: { questions: 120, coverage: 40 },
  };

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

  function clamp(x) { return Math.max(0, Math.min(100, x)); }
  function sd(xs) {
    var m = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
    return Math.sqrt(xs.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / xs.length);
  }
  function wavg(parts) {
    var s = 0, w = 0;
    parts.forEach(function (p) { if (p.v != null) { s += p.w * p.v; w += p.w; } });
    return w ? round1(s / w) : null;
  }

  GHX.Progress.BANDS = BANDS;
  GHX.Progress.CONFIG = CONFIG;
  GHX.Progress.MIN_DOMAIN = CONFIG.minDomain;
  GHX.Progress.MIN_TOPIC = CONFIG.minTopic;
  GHX.Progress.topicsOf = topicsOf;

  // Questões disponíveis por subtema e por subobjetivo, em todos os simulados.
  function availability(banks) {
    var topic = {}, sub = {};
    banks.forEach(function (b) {
      GHX.bankItems(b).forEach(function (it) {
        topicsOf(it).forEach(function (t) { topic[t] = (topic[t] || 0) + 1; });
        if (GHX.subObjectivesOf) GHX.subObjectivesOf(it).ids.forEach(function (s) { sub[s] = (sub[s] || 0) + 1; });
      });
    });
    return { topic: topic, sub: sub };
  }

  // Um retrato completo a partir das tentativas finalizadas (em ordem cronológica).
  function snapshot(done, banks, cert, w, avail) {
    var C = CONFIG;
    var evals = {};            // id → [{ at, score, bankId }]
    var bankSet = {}, domAttempts = {};
    cert.domains.forEach(function (dm) { domAttempts[dm.d] = 0; });
    done.forEach(function (a) {
      var seenD = {}, any = false;
      evaluated(a).forEach(function (r) {
        (evals[r.id] = evals[r.id] || []).push({ at: a.finishedAt || 0, score: r.score, bankId: a.bankId });
        seenD[r.d] = 1; any = true;
      });
      if (any) bankSet[a.bankId] = 1;
      Object.keys(seenD).forEach(function (d) { if (d in domAttempts) domAttempts[d]++; });
    });
    var ids = Object.keys(evals);
    var first = function (id) { return evals[id][0].score; };
    var last = function (id) { return evals[id][evals[id].length - 1].score; };
    var itemBanks = function (list) { var s = {}; list.forEach(function (id) { evals[id].forEach(function (e) { s[e.bankId] = 1; }); }); return Object.keys(s).length; };

    // Agrupamento genérico: primeira resposta (indicador), última (evolução), simulados.
    function group(keyFn) {
      var g = {};
      ids.forEach(function (id) {
        keyFn(GHX.getItem(id)).forEach(function (k) { (g[k] = g[k] || []).push(id); });
      });
      return g;
    }
    function measure(list) {
      var s = stat(list.map(first)), l = stat(list.map(last));
      var rep = list.filter(function (id) { return evals[id].length > 1; }).length;
      s.latestPct = l.pct;
      s.repeated = rep;
      s.delta = rep ? round1(l.pct - s.pct) : null;
      s.banks = itemBanks(list);
      return s;
    }

    // ----- domínios -----
    var gd = group(function (it) { return [it.d]; });
    var domains = cert.domains.map(function (dm) {
      var s = gd[dm.d] ? measure(gd[dm.d]) : { n: 0, correct: 0, partial: 0, wrong: 0, pct: null, latestPct: null, repeated: 0, delta: null, banks: 0 };
      s.d = dm.d; s.name = dm.name; s.short = dm.short;
      s.weight = w[dm.d];
      s.attempts = domAttempts[dm.d];
      s.enough = s.n >= C.minDomain;
      s.status = band(BANDS, s.pct);
      return s;
    });
    var performance = wavg(domains.map(function (s) { return { w: s.weight, v: s.n ? (s.correct / s.n) * 100 : null }; }));
    var overall = stat(ids.map(first));

    // ----- subtemas -----
    var gt = group(topicsOf);
    var topicNames = Object.keys(avail.topic);
    var topics = topicNames.map(function (name) {
      var s = gt[name] ? measure(gt[name]) : { n: 0, correct: 0, partial: 0, wrong: 0, pct: null, latestPct: null, repeated: 0, delta: null, banks: 0 };
      s.name = name;
      s.available = avail.topic[name];
      s.evidence = !s.n ? 'none' : (s.n >= C.minTopic && s.banks >= C.minTopicBanks ? 'enough' : 'limited');
      s.enough = s.evidence === 'enough';
      s.status = s.enough ? band(BANDS, s.pct) : null;
      var cnt = {};
      (gt[name] || []).forEach(function (id) { var d = GHX.getItem(id).d; cnt[d] = (cnt[d] || 0) + 1; });
      s.d = +Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; })[0] || null;
      s.weight = (s.d && w[s.d]) || 0;
      return s;
    });

    // ----- matriz de objetivos oficiais -----
    var gs = group(function (it) { return GHX.subObjectivesOf ? GHX.subObjectivesOf(it).ids : []; });
    var subsByDomain = {};
    (GHX.SUBOBJECTIVES || []).forEach(function (s) { if (avail.sub[s.id]) (subsByDomain[s.d] = subsByDomain[s.d] || []).push(s.id); });
    var subs = (GHX.SUBOBJECTIVES || []).map(function (so) {
      var s = gs[so.id] ? measure(gs[so.id]) : { n: 0, correct: 0, partial: 0, wrong: 0, pct: null, latestPct: null, repeated: 0, delta: null, banks: 0 };
      s.id = so.id; s.name = so.name; s.d = so.d; s.obj = so.obj;
      s.available = avail.sub[so.id] || 0;
      s.need = Math.min(C.minSub, s.available);
      s.coverage = !s.available ? 'unavailable' : !s.n ? 'none' : s.n >= s.need ? 'covered' : 'partial';
      s.weight = s.available ? w[so.d] / subsByDomain[so.d].length : 0;
      return s;
    });
    var objectives = (GHX.OBJECTIVES || []).map(function (o) {
      var list = subs.filter(function (s) { return s.obj === o.id && s.available; });
      var covered = list.filter(function (s) { return s.coverage === 'covered'; }).length;
      var touched = list.filter(function (s) { return s.n; }).length;
      var st = stat([].concat.apply([], list.map(function (s) { return (gs[s.id] || []).map(first); })));
      return {
        id: o.id, d: o.d, name: o.name, subs: list.length, covered: covered, touched: touched,
        pct: list.length ? round1((covered / list.length) * 100) : null,
        perf: st.pct,
        status: !touched ? 'none' : covered === list.length ? 'covered' : 'partial',
      };
    });
    var covW = 0, covT = 0;
    subs.forEach(function (s) { if (s.available) { covT += s.weight; if (s.coverage === 'covered') covW += s.weight; } });
    var coverage = covT ? round1((covW / covT) * 100) : 0;

    // ----- consistência entre simulados diferentes -----
    var byBank = {};
    ids.forEach(function (id) { var b = evals[id][0].bankId; (byBank[b] = byBank[b] || []).push(first(id)); });
    var bankPcts = Object.keys(byBank).filter(function (b) { return byBank[b].length >= C.consistencyMinItems; }).map(function (b) {
      var s = stat(byBank[b]);
      return { bankId: b, pct: s.pct, n: s.n };
    });
    var consistency = bankPcts.length >= 2 ? round1(clamp(100 - C.consistencyK * sd(bankPcts.map(function (x) { return x.pct; })))) : null;

    // ----- volume (curva de saturação) -----
    var volume = round1(100 * (1 - Math.exp(-overall.n / C.volumeScale)));

    // ----- retenção: reavaliações com pelo menos 24 h desde a primeira -----
    var delayed = ids.map(function (id) {
      var e = evals[id], t0 = e[0].at, later = null;
      for (var i = 1; i < e.length; i++) if (e[i].at - t0 >= C.retentionGapH * 3600000) later = e[i];
      return later;
    }).filter(Boolean);
    var retention = delayed.length >= C.retentionMin ? round1(stat(delayed.map(function (x) { return x.score; })).pct) : null;

    // ----- diversidade de assuntos -----
    var diversity = topicNames.length ? round1((topics.filter(function (t) { return t.enough; }).length / topicNames.length) * 100) : 0;

    // ----- confiança na avaliação (suficiência das evidências) -----
    var nBanks = Object.keys(bankSet).length;
    var banksScore = round1(100 * (1 - Math.exp(-nBanks / C.banksScale)));
    var cw = C.confidenceWeights;
    var confParts = [
      { key: 'volume', label: 'Questões distintas', v: volume, w: cw.volume },
      { key: 'banks', label: 'Simulados diferentes', v: banksScore, w: cw.banks },
      { key: 'coverage', label: 'Cobertura oficial', v: coverage, w: cw.coverage },
      { key: 'consistency', label: 'Consistência', v: consistency, w: cw.consistency },
      { key: 'diversity', label: 'Diversidade de assuntos', v: diversity, w: cw.diversity },
    ];
    // Componente sem dados não soma (falta de evidência), mas o peso continua no total.
    var cSum = 0, cTot = 0;
    confParts.forEach(function (p) { cTot += p.w; if (p.v != null) cSum += p.w * p.v; });
    var confidence = round1(cSum / cTot);
    if (nBanks < 2) confidence = Math.min(confidence, C.confidenceSingleCap);
    var confBand = band(CONF_BANDS, confidence);

    // ----- índice de prontidão -----
    var rw = C.readinessWeights;
    var parts = [
      { key: 'performance', label: 'Desempenho por domínio', v: performance, w: rw.performance },
      { key: 'coverage', label: 'Cobertura oficial', v: ids.length ? coverage : null, w: rw.coverage },
      { key: 'consistency', label: 'Consistência', v: consistency, w: rw.consistency },
      { key: 'volume', label: 'Volume de questões distintas', v: ids.length ? volume : null, w: rw.volume },
      { key: 'retention', label: 'Retenção', v: retention, w: rw.retention },
    ];
    var index = wavg(parts);
    var provisional = parts.some(function (p) { return p.v == null; });

    // ----- estado da recomendação -----
    var R = C.ready, G = C.good, D = C.developing;
    var enoughDomains = domains.filter(function (s) { return s.enough; });
    var criticalDomains = enoughDomains.filter(function (s) { return s.pct < R.criticalDomain; });
    var lowDomains = enoughDomains.filter(function (s) { return s.pct < R.domainFloor; });
    var missingObjectives = objectives.filter(function (o) { return o.subs && o.status === 'none'; });
    var criticalSubs = subs.filter(function (s) { return s.coverage === 'covered' && s.pct < R.criticalSub; });
    var checks = [
      { key: 'index', ok: index != null && index >= R.index && parts.every(function (p) { return p.v != null || p.key === 'retention'; }), label: 'Índice de prontidão de ' + R.index + ' ou mais (só a retenção pode estar indisponível)', value: index },
      { key: 'coverage', ok: coverage >= R.coverage, label: 'Cobertura oficial de ' + R.coverage + '% ou mais', value: coverage },
      { key: 'overall', ok: overall.pct != null && overall.pct >= R.overall, label: 'Desempenho geral de ' + R.overall + '% ou mais', value: overall.pct },
      { key: 'domains', ok: enoughDomains.length === cert.domains.length && !lowDomains.length, label: 'Todos os domínios com amostra suficiente e pelo menos ' + R.domainFloor + '%', value: null },
      { key: 'consistency', ok: consistency != null && consistency >= R.consistency, label: 'Resultados consistentes entre simulados diferentes', value: consistency },
      { key: 'gaps', ok: !missingObjectives.length && !criticalDomains.length && !criticalSubs.length, label: 'Sem lacunas críticas nos objetivos oficiais', value: null },
      { key: 'confidence', ok: confidence >= R.confidence, label: 'Confiança na avaliação de ' + R.confidence + ' ou mais', value: confidence },
    ];
    var state;
    if (checks.every(function (c) { return c.ok; })) state = 'ready';
    else if (performance != null && performance >= G.performance && coverage >= G.coverage && confidence >= G.confidence && consistency != null &&
      !enoughDomains.some(function (s) { return s.pct < G.domainFloor; })) state = 'good';
    else if (overall.n >= D.questions || coverage >= D.coverage) state = 'developing';
    else state = 'initial';

    return {
      performance: performance, overall: overall, coverage: coverage, coverageBand: band(COV_BANDS, coverage),
      consistency: consistency, bankPcts: bankPcts, volume: volume, retention: retention, retentionItems: delayed.length,
      diversity: diversity, banksScore: banksScore, nBanks: nBanks,
      confidence: confidence, confidenceBand: confBand, confidenceParts: confParts,
      index: index, provisional: provisional, parts: parts,
      state: STATES[state], checks: checks,
      domains: domains, topics: topics, subs: subs, objectives: objectives,
      criticalDomains: criticalDomains, lowDomains: lowDomains, missingObjectives: missingObjectives, criticalSubs: criticalSubs,
      evaluations: ids.reduce(function (n, id) { return n + evals[id].length; }, 0),
      repeatedQuestions: ids.filter(function (id) { return evals[id].length > 1; }).length,
      firstAnswers: function () { var o = {}; ids.forEach(function (id) { o[id] = first(id); }); return o; },
    };
  }

  // "O que falta para eu estar preparado?": lista gerada só com dados reais.
  function gaps(s, done, banks) {
    var out = [];
    var P = function (x) { return String(x).replace('.', ',') + '%'; };
    var subName = function (x) { return x.id + ' ' + x.name; };
    var none = s.subs.filter(function (x) { return x.coverage === 'none'; });
    var partial = s.subs.filter(function (x) { return x.coverage === 'partial'; });
    var lowSubs = s.subs.filter(function (x) { return x.coverage === 'covered' && x.pct < 70; });
    var limitedTopics = s.topics.filter(function (t) { return t.evidence === 'limited'; }).sort(function (a, b) { return b.available - a.available; });
    var noTopics = s.topics.filter(function (t) { return t.evidence === 'none'; }).sort(function (a, b) { return b.available - a.available; });
    var confirm = limitedTopics.filter(function (t) { return t.pct >= 80; });
    var lowTopics = s.topics.filter(function (t) { return t.enough && t.pct < 70; }).sort(function (a, b) { return a.pct - b.pct; });
    if (s.criticalDomains.length) out.push({ kind: 'critical', title: 'Domínios críticos (abaixo de ' + CONFIG.ready.criticalDomain + '%)', items: s.criticalDomains.map(function (d) { return d.d + '. ' + d.short + ' — ' + P(d.pct) + ' em ' + d.n + ' questões'; }) });
    if (s.lowDomains.some(function (d) { return s.criticalDomains.indexOf(d) < 0; })) out.push({ kind: 'low', title: 'Domínios abaixo de ' + CONFIG.ready.domainFloor + '%', items: s.lowDomains.filter(function (d) { return s.criticalDomains.indexOf(d) < 0; }).map(function (d) { return d.d + '. ' + d.short + ' — ' + P(d.pct); }) });
    if (lowSubs.length || lowTopics.length) out.push({ kind: 'low', title: 'Assuntos com desempenho abaixo do esperado', items: lowTopics.map(function (t) { return t.name + ' — ' + P(t.pct) + ' em ' + t.n + ' questões'; }).concat(lowSubs.map(function (x) { return 'Objetivo ' + subName(x) + ' — ' + P(x.pct); })) });
    if (none.length) out.push({ kind: 'none', title: 'Objetivos oficiais ainda não avaliados (' + none.length + ')', items: none.map(subName) });
    if (partial.length) out.push({ kind: 'partial', title: 'Objetivos oficiais com poucas questões respondidas (' + partial.length + ')', items: partial.map(function (x) { return subName(x) + ' — ' + x.n + ' de ' + x.need + ' questões necessárias'; }) });
    if (noTopics.length) out.push({ kind: 'none', title: 'Assuntos ainda não avaliados', items: noTopics.map(function (t) { return t.name; }) });
    if (confirm.length) out.push({ kind: 'confirm', title: 'Bom resultado, mas o conhecimento precisa ser confirmado', items: confirm.map(function (t) { return t.name + ' — ' + t.correct + ' de ' + t.n + ' (' + t.banks + ' simulado' + (t.banks > 1 ? 's' : '') + ')'; }) });
    var others = limitedTopics.filter(function (t) { return confirm.indexOf(t) < 0; });
    if (others.length) out.push({ kind: 'partial', title: 'Assuntos com poucas questões respondidas', items: others.map(function (t) { return t.name + ' — ' + t.n + ' questões'; }) });

    // Próximo simulado: o ainda não feito com mais questões nos subobjetivos que faltam.
    var doneBanks = {};
    done.forEach(function (a) { doneBanks[a.bankId] = 1; });
    var missing = {};
    none.concat(partial).forEach(function (x) { missing[x.id] = 1; });
    var next = banks.filter(function (b) { return !doneBanks[b.id]; }).map(function (b) {
      var n = GHX.bankItems(b).filter(function (it) { return GHX.subObjectivesOf(it).ids.some(function (id) { return missing[id]; }); }).length;
      return { id: b.id, title: b.title, n: n };
    }).sort(function (a, b) { return b.n - a.n; })[0] || null;
    return { groups: out, next: next && next.n ? next : null };
  }

  GHX.Progress.analyze = function (done, banks, cert) {
    cert = cert || GHX.CERTS['GH-300'];
    var w = weights(banks, cert);
    var avail = availability(banks);
    var s = snapshot(done, banks, cert, w, avail);

    // Evolução: um retrato após cada tentativa concluída.
    s.timeline = done.map(function (a, i) {
      var x = snapshot(done.slice(0, i + 1), banks, cert, w, avail);
      return {
        id: a.id, at: a.finishedAt, bankId: a.bankId, attemptPct: a.result.pct,
        performance: x.performance, overall: x.overall.pct, coverage: x.coverage, confidence: x.confidence,
        index: x.index, state: x.state.key,
      };
    });

    // O que estudar: subtemas com evidência suficiente e domínios avaliados, por faixa.
    var cand = s.topics.filter(function (t) { return t.enough; }).map(function (t) { return { kind: 'topic', name: t.name, s: t }; })
      .concat(s.domains.filter(function (d) { return d.n >= CONFIG.minTopic; }).map(function (d) { return { kind: 'domain', name: 'Domínio ' + d.d + ' · ' + d.short, s: d }; }));
    cand.sort(function (x, y) {
      return (x.s.pct - y.s.pct) || (y.s.weight - x.s.weight) || (y.s.wrong - x.s.wrong) || (y.s.n - x.s.n) || ((x.s.delta || 0) - (y.s.delta || 0));
    });
    s.plan = {
      high: cand.filter(function (c) { return c.s.pct < 70; }),
      mid: cand.filter(function (c) { return c.s.pct >= 70 && c.s.pct < 85; }),
      good: cand.filter(function (c) { return c.s.pct >= 85; }).reverse(),
    };
    s.focus = (s.plan.high.concat(s.plan.mid).filter(function (c) { return c.kind === 'topic'; })[0]) || s.plan.high[0] || s.plan.mid[0] || null;
    s.gaps = gaps(s, done, banks);
    s.domainsTotal = cert.domains.length;
    s.domainsEvaluated = s.domains.filter(function (d) { return d.n; }).length;
    delete s.firstAnswers;
    return s;
  };
})();
