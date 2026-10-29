// Máquina de estados da tentativa. Recebe `now` (ms) e `rng` para ser testável. Sem DOM.
// A tentativa é um objeto simples (serializável em JSON); as funções a modificam no lugar.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var EXTRA_MS = 30 * 60 * 1000;

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function ids(list) { return list.map(function (x) { return x.id; }); }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  // Ordem de exibição sorteada por tentativa; as respostas continuam nos índices/ids originais.
  function shuffleFor(it, rng) {
    switch (it.type) {
      case 'single':
      case 'multi': return { o: shuffle(range(it.o.length), rng) };
      case 'match': return { tiles: shuffle(ids(it.tiles), rng) };
      case 'inline': return { tokens: shuffle(ids(it.tokens), rng) };
      case 'order': return { o: shuffle(ids(it.o), rng) };
      default: return null;
    }
  }

  var S = {};
  S.EXTRA_MS = EXTRA_MS;

  S.create = function (bank, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var now = opts.now || 0;
    var mode = opts.mode === 'study' ? 'study' : 'exam';
    var sections = GHX.buildSections(bank).map(function (s) {
      return { id: s.id, kind: s.kind, caseId: s.caseId || null, title: s.title, items: s.items.slice(), locked: false };
    });
    var shuf = {};
    sections.forEach(function (s) {
      s.items.forEach(function (id) {
        var x = shuffleFor(GHX.getItem(id), rng);
        if (x) shuf[id] = x;
      });
    });
    return {
      v: 2,
      id: opts.id || ('t' + now.toString(36) + Math.floor(rng() * 1e6).toString(36)),
      bankId: bank.id,
      mode: mode,
      extraTime: !!opts.extraTime,
      createdAt: now,
      status: 'ready',
      view: 'item',
      sections: sections,
      s: 0,
      p: 0,
      answers: {},
      flags: {},
      seen: {},
      locked: {},
      checked: {},
      fb: {},
      notes: {},
      reviewMode: false,
      shuffle: shuf,
      limitMs: mode === 'exam' ? bank.minutes * 60000 + (opts.extraTime ? EXTRA_MS : 0) : 0,
      elapsedMs: 0,
      since: null,
      breaks: 0,
      finishedAt: null,
      endReason: null,
      result: null,
    };
  };

  S.section = function (att) { return att.sections[att.s]; };
  S.currentId = function (att) { var s = S.section(att); return s ? s.items[att.p] : null; };
  S.total = function (att) { return att.sections.reduce(function (n, s) { return n + s.items.length; }, 0); };
  S.number = function (att, s, p) {
    if (s == null) { s = att.s; p = att.p; }
    var n = 0;
    for (var i = 0; i < s; i++) n += att.sections[i].items.length;
    return n + p + 1;
  };
  S.isExam = function (att) { return att.mode === 'exam'; };
  S.isTimed = function (att) { return att.limitMs > 0; };

  function fold(att, now) {
    if (att.since != null) { att.elapsedMs += Math.max(0, now - att.since); att.since = now; }
  }

  function visit(att) {
    var id = S.currentId(att);
    if (id) att.seen[id] = true;
  }

  S.start = function (att, now) {
    if (att.status !== 'ready') return false;
    att.status = 'running';
    att.since = now;
    visit(att);
    return true;
  };

  // Retomada após recarregar a página: o tempo com a página fechada não é contado.
  S.resumeAfterReload = function (att, now) {
    if (att.status === 'paused') att.status = 'break'; // formato antigo
    if (att.status === 'running' || att.status === 'break') att.since = now;
  };

  S.remainingMs = function (att, now) {
    if (!S.isTimed(att)) return Infinity;
    var used = att.elapsedMs + (att.since != null ? Math.max(0, now - att.since) : 0);
    return Math.max(0, att.limitMs - used);
  };

  S.tick = function (att, now) {
    if (att.status !== 'running' && att.status !== 'break') return att.status;
    fold(att, now);
    if (S.isTimed(att) && att.elapsedMs >= att.limitMs) S.finish(att, now, 'time');
    return att.status;
  };

  S.isLocked = function (att, id) {
    if (att.status === 'finished') return true;
    if (!S.isExam(att)) return false;
    return !!att.locked[id];
  };

  S.canAnswer = function (att, id) {
    if (att.status !== 'running') return false;
    if (S.isLocked(att, id)) return false;
    if (!S.isExam(att) && att.checked[id]) return false;
    return true;
  };

  S.answer = function (att, id, resp) {
    if (!S.canAnswer(att, id)) return false;
    if (resp == null) delete att.answers[id]; else att.answers[id] = resp;
    return true;
  };

  S.reset = function (att, id) {
    if (att.status !== 'running' || S.isLocked(att, id)) return false;
    delete att.answers[id];
    delete att.checked[id];
    return true;
  };

  // "Leave Feedback": marca a questão para comentar depois de terminar a prova.
  S.toggleFeedback = function (att, id) {
    if (att.status !== 'running' || S.isLocked(att, id)) return false;
    att.fb = att.fb || {};
    if (att.fb[id]) delete att.fb[id]; else att.fb[id] = true;
    return true;
  };

  S.toggleFlag = function (att, id) {
    if (att.status !== 'running' || S.isLocked(att, id)) return false;
    if (att.flags[id]) delete att.flags[id]; else att.flags[id] = true;
    return true;
  };

  // Modo estudo: corrige o item e trava a resposta até "Reset Answer".
  S.check = function (att, id) {
    if (S.isExam(att) || att.status !== 'running') return null;
    att.checked[id] = true;
    return GHX.Scoring.score(GHX.getItem(id), att.answers[id]);
  };

  S.canPrev = function (att) {
    if (att.status !== 'running') return false;
    if (!S.isExam(att)) return att.s > 0 || att.p > 0;
    var sec = S.section(att);
    if (sec.kind === 'ps' || att.p === 0) return false;
    return !att.locked[sec.items[att.p - 1]];
  };

  S.prev = function (att) {
    if (!S.canPrev(att)) return false;
    if (att.p > 0) att.p--;
    else { att.s--; att.p = att.sections[att.s].items.length - 1; }
    att.view = 'item';
    visit(att);
    return true;
  };

  S.isLastInSection = function (att) { return att.p >= S.section(att).items.length - 1; };
  S.isLastSection = function (att) { return att.s >= att.sections.length - 1; };

  // Avança; no fim da seção devolve {end:true} e a interface decide (revisão ou próxima seção).
  S.next = function (att) {
    if (att.status !== 'running') return { ok: false };
    var sec = S.section(att);
    if (S.isExam(att) && sec.kind === 'ps') att.locked[sec.items[att.p]] = true;
    if (att.p < sec.items.length - 1) {
      att.p++;
      att.view = 'item';
      visit(att);
      return { ok: true };
    }
    if (!S.isExam(att) && att.s < att.sections.length - 1) {
      att.s++; att.p = 0; att.view = 'item'; visit(att);
      return { ok: true };
    }
    return { ok: false, end: true };
  };

  S.canGoTo = function (att, s, p) {
    if (att.status !== 'running') return false;
    var sec = att.sections[s];
    if (!sec || p < 0 || p >= sec.items.length) return false;
    if (!S.isExam(att)) return true;
    if (s !== att.s) return false;
    if (sec.kind === 'ps') return p === att.p;
    return !att.locked[sec.items[p]];
  };

  // fromReview: a navegação passa ao "review mode", com o botão Exit Review Mode.
  S.goTo = function (att, s, p, fromReview) {
    if (!S.canGoTo(att, s, p)) return false;
    att.s = s; att.p = p; att.view = 'item';
    if (fromReview) att.reviewMode = true;
    visit(att);
    return true;
  };

  S.openReview = function (att) {
    if (att.status !== 'running') return false;
    att.view = 'review';
    att.reviewMode = false;
    return true;
  };

  S.closeReview = function (att) {
    att.view = 'item';
    var sec = S.section(att);
    // Se o item atual travou (pausa), volta para o primeiro disponível.
    if (S.isExam(att) && att.locked[sec.items[att.p]]) {
      var free = sec.items.findIndex(function (id) { return !att.locked[id]; });
      if (free >= 0) att.p = free;
    }
    return true;
  };

  // Linhas da tela "Question Review" (seção atual no modo exame; tudo no modo estudo).
  S.reviewRows = function (att, filter) {
    var rows = [];
    att.sections.forEach(function (sec, si) {
      if (S.isExam(att) && si !== att.s) return;
      sec.items.forEach(function (id, pi) {
        var it = GHX.getItem(id), r = att.answers[id];
        rows.push({
          s: si, p: pi, id: id, n: S.number(att, si, pi),
          answered: GHX.Scoring.isAnswered(it, r),
          complete: GHX.Scoring.isComplete(it, r),
          flagged: !!att.flags[id],
          locked: S.isLocked(att, id) || (S.isExam(att) && sec.kind === 'ps' && pi !== att.p),
          seen: !!att.seen[id],
        });
      });
    });
    switch (filter) {
      case 'answered': return rows.filter(function (r) { return r.answered; });
      case 'unanswered': return rows.filter(function (r) { return !r.answered; });
      case 'review': return rows.filter(function (r) { return r.flagged; });
      default: return rows;
    }
  };

  // Sai da seção: no modo exame ela trava e não pode ser revisitada.
  S.nextSection = function (att, now) {
    if (att.status !== 'running') return false;
    var sec = S.section(att);
    if (S.isExam(att)) {
      sec.locked = true;
      sec.items.forEach(function (id) { att.locked[id] = true; });
    }
    if (S.isLastSection(att)) { S.finish(att, now, 'submitted'); return true; }
    att.s++; att.p = 0; att.view = 'item';
    visit(att);
    return true;
  };

  // Resumo mostrado antes da pausa: vistas, sem resposta e marcadas para revisão.
  S.breakSummary = function (att) {
    var seen = Object.keys(att.seen).filter(function (id) { return !att.locked[id]; });
    var unanswered = seen.filter(function (id) { return !GHX.Scoring.isAnswered(GHX.getItem(id), att.answers[id]); });
    var flagged = seen.filter(function (id) { return att.flags[id]; });
    return { seen: seen.length, unanswered: unanswered.length, flagged: flagged.length, remaining: S.total(att) - Object.keys(att.seen).length };
  };

  // "Take a Break" (como na prova real): o cronômetro CONTINUA correndo e todas as
  // questões exibidas antes da pausa, inclusive a atual, ficam travadas.
  S.takeBreak = function (att, now) {
    if (!S.isExam(att) || att.status !== 'running') return false;
    if (S.section(att).kind === 'ps') return false;
    fold(att, now);
    att.status = 'break';
    att.breaks++;
    Object.keys(att.seen).forEach(function (id) { att.locked[id] = true; });
    return true;
  };

  S.endBreak = function (att, now) {
    if (att.status !== 'break') return false;
    fold(att, now);
    att.status = 'running';
    att.view = 'item';
    att.reviewMode = false;
    if (S.isTimed(att) && att.elapsedMs >= att.limitMs) { S.finish(att, now, 'time'); return true; }
    // Vai para o próximo item ainda não visto; se a seção acabou, segue para a próxima.
    while (true) {
      var sec = S.section(att);
      var idx = sec.items.findIndex(function (id) { return !att.locked[id]; });
      if (idx >= 0) { att.p = idx; break; }
      sec.locked = true;
      if (S.isLastSection(att)) { S.finish(att, now, 'submitted'); return true; }
      att.s++; att.p = 0;
    }
    visit(att);
    return true;
  };

  S.finish = function (att, now, reason) {
    if (att.status === 'finished') return att.result;
    fold(att, now);
    att.since = null;
    att.status = 'finished';
    att.view = 'item';
    att.finishedAt = now;
    att.endReason = reason || 'submitted';
    var items = [];
    att.sections.forEach(function (s) { s.items.forEach(function (id) { items.push(GHX.getItem(id)); }); });
    att.result = GHX.Scoring.results(items, att.answers);
    return att.result;
  };

  S.shuffleList = shuffle;

  // Gerador determinístico (mulberry32) para testes e sorteio reprodutível.
  S.seeded = function (seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  GHX.Session = S;
})();
