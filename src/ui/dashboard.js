// Painel de progresso e prontidão para a GH-300 (somente apresentação).
// Os cálculos ficam em core/progress.js e core/objectives.js; aqui só há HTML/SVG.
// Todo o markup fica dentro de .progress-dashboard e usa classes pd-*, com estilos isolados
// (veja a seção "Painel de progresso" em styles.css), para não afetar as telas de prova.
// Gráficos: SVG inline, dicas ao passar o mouse ou com foco ([data-tip]) e tabela equivalente.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var esc = GHX.esc;
  var LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];
  var uid = 0;

  // ---------- formatação ----------

  function dec(x) { return String(x).replace('.', ','); }
  function pct(x) { return x == null ? '—' : dec(x) + '%'; }
  function num(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function dateShort(ms) { return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  function dateLong(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function bankTitle(id) { var b = GHX.getBank(id); return b ? b.title : id; }
  function langLabel(l) { return l === 'en' ? 'English' : 'Português'; }
  function modeLabel(m) { return m === 'study' ? 'Estudo' : 'Exame'; }
  function band(v) { return v == null ? 'none' : (GHX.Progress.BANDS.filter(function (b) { return v >= b.min; })[0] || {}).key; }

  // ---------- ícones (SVG de traço, 24×24) ----------

  var ICON = {
    gauge: 'M12 14l3.5-3.5M4.6 17a8.5 8.5 0 1 1 14.8 0',
    target: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M15 9l5-5M17 4h3v3',
    layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
    flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
    check: 'M4 12.5l5 5L20 6.5',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
    book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13',
    home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
    reset: 'M4 4v6h6M20 20v-6h-6M5.6 15a8 8 0 0 0 13.6 2.4M18.4 9A8 8 0 0 0 4.8 6.6',
    trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    copilot: 'M7 9a5 5 0 0 1 10 0v1.5a2.5 2.5 0 0 1 2 2.5v2a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-2a2.5 2.5 0 0 1 2-2.5V9zM9.5 14v1.5M14.5 14v1.5',
    list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
    play: 'M7 4.5v15l12-7.5-12-7.5z',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
    shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
    doc: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h7M9 17h7',
  };
  function icon(name, cls) {
    return '<svg class="pd-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + ICON[name] + '"/></svg>';
  }

  // ---------- status (cor + rótulo, nunca só a cor) ----------

  // Faixas: verde = bom domínio, azul = satisfatório, âmbar = atenção, vermelho = prioridade, cinza = não avaliado.
  function chip(st, fallback) {
    if (!st) return '<span class="pd-chip pd-s-none">' + esc(fallback || 'Não avaliado') + '</span>';
    return '<span class="pd-chip pd-s-' + st.key + '"><i aria-hidden="true"></i>' + esc(st.label) + '</span>';
  }
  function grayChip(text) { return '<span class="pd-chip pd-s-none">' + esc(text) + '</span>'; }
  var STATE_TONE = { initial: 'pri', developing: 'imp', good: 'dev', ready: 'exc' };

  function deltaBadge(x, unit) {
    if (x == null || isNaN(x)) return '';
    var cls = x > 0 ? 'up' : x < 0 ? 'down' : 'flat';
    var arrow = x > 0 ? '▲' : x < 0 ? '▼' : '■';
    return '<span class="pd-delta pd-' + cls + '"><span aria-hidden="true">' + arrow + '</span> ' + (x > 0 ? '+' : '') + dec(Math.round(x * 10) / 10) + (unit || ' p.p.') +
      '<span class="pd-sr"> em relação ao anterior</span></span>';
  }

  // Variação entre os dois últimos retratos da evolução.
  function lastDelta(an, key) {
    var t = an.timeline.filter(function (p) { return p[key] != null; });
    return t.length >= 2 ? t[t.length - 1][key] - t[t.length - 2][key] : null;
  }

  // ---------- componentes ----------

  function metric(o) {
    return '<article class="pd-metric pd-c-' + o.color + '">' +
      '<div class="pd-metric-top"><span class="pd-metric-ic">' + icon(o.icon) + '</span><h3>' + esc(o.label) + '</h3></div>' +
      '<div class="pd-metric-v">' + o.value + '</div>' +
      '<p class="pd-metric-d">' + o.desc + '</p>' +
      (o.delta ? '<div class="pd-metric-f">' + o.delta + '</div>' : '') + '</article>';
  }

  // Barra de progresso com a cor do status.
  function bar(value, tone) {
    return '<span class="pd-track" aria-hidden="true">' + (value != null ? '<span class="pd-fill pd-s-' + (tone || 'none') + '" style="width:' + Math.max(value, 1.5) + '%"></span>' : '') + '</span>';
  }

  // Donut / progresso radial, de 0 a 100.
  function donut(value, tone, center, sub, aria, size) {
    var r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
    return '<svg class="pd-donut' + (size ? ' pd-donut-' + size : '') + '" viewBox="0 0 128 128" role="img" aria-label="' + esc(aria) + '">' +
      '<circle class="pd-donut-bg" cx="64" cy="64" r="' + r + '"/>' +
      (v ? '<circle class="pd-donut-fg pd-s-' + tone + '" cx="64" cy="64" r="' + r + '" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 64 64)"/>' : '') +
      '<text class="pd-donut-v" x="64" y="' + (sub ? 66 : 72) + '" text-anchor="middle">' + center + '</text>' +
      (sub ? '<text class="pd-donut-s" x="64" y="86" text-anchor="middle">' + esc(sub) + '</text>' : '') + '</svg>';
  }

  // Linha suave com área em gradiente, pontos, eixos e dica por ponto.
  function lineChart(points, opts) {
    if (!points.length) return '<p class="pd-empty">Ainda sem dados para a evolução.</p>';
    var id = 'pdg' + (++uid);
    var W = 640, H = 250, L = 44, Rt = 18, T = 20, B = 34;
    var iw = W - L - Rt, ih = H - T - B, n = points.length;
    var x = function (i) { return L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); };
    var y = function (v) { return T + ih - (v / 100) * ih; };
    var P = points.map(function (p, i) { return [x(i), y(p.v)]; });
    var clampY = function (v) { return Math.max(T, Math.min(T + ih, v)); };
    var path = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (var i = 0; i < n - 1; i++) {
      var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, clampY(p1[1] + (p2[1] - p0[1]) / 6)];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, clampY(p2[1] - (p3[1] - p1[1]) / 6)];
      path += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    var area = path + ' L' + P[n - 1][0].toFixed(1) + ' ' + (T + ih) + ' L' + P[0][0].toFixed(1) + ' ' + (T + ih) + ' Z';
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      return '<line class="pd-grid" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="pd-axis" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + opts.unit + '</text>';
    }).join('');
    var step = Math.max(1, Math.ceil(n / 7));
    var xl = points.map(function (p, i) {
      return i % step && i !== n - 1 ? '' : '<text class="pd-axis" x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + dateShort(p.at) + '</text>';
    }).join('');
    var colW = n === 1 ? iw : iw / (n - 1);
    var pts = points.map(function (p, i) {
      return '<g class="pd-pt" data-tip="' + esc(p.tip) + '" tabindex="0" role="img" aria-label="' + esc(p.tip) + '">' +
        '<rect class="pd-hit" x="' + (x(i) - colW / 2).toFixed(1) + '" y="' + T + '" width="' + colW.toFixed(1) + '" height="' + ih + '"/>' +
        '<line class="pd-cross" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + T + '" y2="' + (T + ih) + '"/>' +
        '<circle class="pd-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="5"/></g>';
    }).join('');
    var last = points[n - 1];
    var lx = Math.min(x(n - 1), W - Rt - 4);
    return '<div class="pd-chart pd-tone-' + opts.tone + '"><svg class="pd-svg" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc(opts.label) + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="pd-grad-a"/><stop offset="1" class="pd-grad-b"/></linearGradient></defs>' +
      grid + xl + (n > 1 ? '<path class="pd-area" d="' + area + '" fill="url(#' + id + ')"/><path class="pd-line" d="' + path + '"/>' : '') + pts +
      '<text class="pd-lbl" x="' + lx + '" y="' + Math.max(14, y(last.v) - 12) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '">' + opts.fmt(last.v) + '</text></svg></div>';
  }

  // ---------- seções ----------

  function banner() {
    return '<header class="pd-banner">' +
      '<div class="pd-banner-main"><span class="pd-badge">' + icon('copilot') + 'GitHub Copilot · Exam GH-300</span>' +
      '<h1>Painel de Progresso</h1><p>Acompanhe sua evolução e descubra seu nível de preparação para a GH-300.</p></div>' +
      '<div class="pd-banner-actions">' +
      '<button type="button" class="pd-btn pd-btn-light" data-act="home" data-k="dash-home">' + icon('home') + 'Voltar ao início</button>' +
      '<button type="button" class="pd-btn pd-btn-ghost" data-act="reset-progress" data-k="dash-reset">' + icon('reset') + 'Zerar progresso</button>' +
      '</div></header>';
  }

  function readiness(an) {
    var st = an.state, tone = STATE_TONE[st.key];
    var msg = st.key === 'initial' && an.overall.pct != null && an.overall.pct < 70 ? st.msgLow : st.msg;
    var names = ['Evidência inicial', 'Em desenvolvimento', 'Boa evidência', 'Pronto para agendar'];
    var steps = names.map(function (nm, i) {
      var cls = st.step === i + 1 ? 'on' : st.step > i + 1 ? 'past' : '';
      return '<li class="' + cls + '"' + (cls === 'on' ? ' aria-current="step"' : '') + '><span aria-hidden="true">' + (cls === 'past' ? '✓' : i + 1) + '</span>' + nm + '</li>';
    }).join('');
    var mini = function (label, value, shown, tn, note) {
      return '<div class="pd-mini"><div class="pd-mini-h"><span>' + esc(label) + '</span><strong>' + shown + '</strong></div>' + bar(value, tn) + '<small>' + note + '</small></div>';
    };
    var idx = an.index;
    var missingParts = an.parts.filter(function (p) { return p.v == null; }).map(function (p) { return p.label.toLowerCase(); });
    return '<section class="pd-ready pd-st-' + tone + '" aria-labelledby="pd-state">' +
      '<div class="pd-ready-gauge">' +
      donut(idx, tone, idx == null ? '—' : dec(idx), 'de 100', 'Índice de prontidão GH-300: ' + (idx == null ? 'sem dados' : dec(idx) + ' de 100') + '. ' + st.label, 'lg') +
      '<div class="pd-ready-cap"><strong>Prontidão GH-300</strong><small>' + (an.provisional ? 'Índice provisório: ' + esc(missingParts.join(' e ')) + ' indisponível' : 'Todos os componentes calculados') + '</small></div></div>' +
      '<div class="pd-ready-body">' +
      '<div class="pd-eyebrow">Recomendação</div>' +
      '<h2 id="pd-state" data-state="' + st.key + '"><span class="pd-state-dot" aria-hidden="true"></span>' + esc(st.label) + '</h2>' +
      '<p class="pd-ready-msg">' + esc(msg) + '</p>' +
      '<ol class="pd-steps" aria-label="Etapas da avaliação">' + steps + '</ol>' +
      '<div class="pd-minis">' +
      mini('Desempenho geral', an.overall.pct, pct(an.overall.pct), 'dev', num(an.overall.correct) + ' de ' + num(an.overall.n) + ' questões') +
      mini('Cobertura oficial', an.coverage, '<span data-coverage="' + an.coverage + '">' + pct(an.coverage) + '</span>', 'info', esc(an.coverageBand.label)) +
      mini('Confiança', an.confidence, '<span data-confidence="' + an.confidence + '">' + esc(an.confidenceBand.label) + '</span>', 'conf', dec(an.confidence) + ' / 100') +
      '</div></div>' +
      '<details class="pd-criteria"' + (st.key === 'ready' ? '' : ' open') + '><summary>' + icon('list') + 'Critérios para "Pronto para agendar" <span class="pd-count">' + an.checks.filter(function (c) { return c.ok; }).length + '/' + an.checks.length + '</span></summary><ul>' +
      an.checks.map(function (c) {
        var v = c.value == null ? '' : ' <span class="pd-muted">(' + (c.key === 'index' || c.key === 'confidence' || c.key === 'consistency' ? dec(c.value) : pct(c.value)) + ')</span>';
        return '<li class="' + (c.ok ? 'ok' : 'no') + '"><span class="pd-mark" aria-hidden="true">' + (c.ok ? '✓' : '✕') + '</span><span>' + esc(c.label) + v + '<span class="pd-sr">' + (c.ok ? ' — atendido' : ' — não atendido') + '</span></span></li>';
      }).join('') + '</ul><p class="pd-note">Critérios de estudo deste simulador, não garantia de aprovação.</p></details>' +
      '</section>';
  }

  function metrics(s, an) {
    return '<section class="pd-metrics" aria-label="Indicadores">' +
      metric({ color: 'brand', icon: 'gauge', label: 'Prontidão GH-300', value: (an.index == null ? '—' : dec(an.index)) + '<small>/100</small>', desc: esc(an.state.label), delta: deltaBadge(lastDelta(an, 'index'), ' pts') }) +
      metric({ color: 'blue', icon: 'target', label: 'Desempenho geral', value: pct(an.overall.pct), desc: 'Acertos nas questões distintas', delta: deltaBadge(lastDelta(an, 'overall')) }) +
      metric({ color: 'cyan', icon: 'layers', label: 'Cobertura oficial', value: pct(an.coverage), desc: esc(an.coverageBand.label) + ' dos objetivos', delta: deltaBadge(lastDelta(an, 'coverage')) }) +
      metric({ color: 'purple', icon: 'shield', label: 'Confiança na avaliação', value: esc(an.confidenceBand.label), desc: dec(an.confidence) + ' / 100 · ' + an.nBanks + ' simulado' + (an.nBanks > 1 ? 's' : '') + ' diferente' + (an.nBanks > 1 ? 's' : ''), delta: deltaBadge(lastDelta(an, 'confidence'), ' pts') }) +
      metric({ color: 'amber', icon: 'flag', label: 'Simulados concluídos', value: s.banksDone + '<small>de ' + s.banksTotal + '</small>', desc: s.attempts + ' tentativa' + (s.attempts > 1 ? 's' : '') + ' · ' + s.byLang.pt + ' em português · ' + s.byLang.en + ' em inglês' }) +
      metric({ color: 'green', icon: 'check', label: 'Corretas e incorretas', value: num(an.overall.correct) + '<small>/ ' + num(an.overall.wrong) + '</small>', desc: an.repeatedQuestions ? an.repeatedQuestions + ' questões refeitas não contam de novo' : 'Questões distintas avaliadas' }) +
      metric({ color: 'indigo', icon: 'grid', label: 'Domínios avaliados', value: an.domainsEvaluated + '<small>de ' + an.domainsTotal + '</small>', desc: an.domains.filter(function (d) { return d.enough; }).length + ' com amostra suficiente' }) +
      metric({ color: 'red', icon: 'alert', label: 'Principal assunto a melhorar', value: '<span class="pd-metric-txt">' + (an.focus ? esc(an.focus.name) : '—') + '</span>', desc: an.focus ? pct(an.focus.s.pct) + ' de acertos em ' + an.focus.s.n + ' questões' : 'Sem assunto com evidência suficiente' }) +
      '</section>';
  }

  var GAP_ICON = { critical: 'alert', low: 'trend', none: 'info', partial: 'clock', confirm: 'shield' };

  function missing(an) {
    var g = an.gaps, lead;
    if (an.state.key === 'ready') lead = 'Você atende aos critérios de prontidão: ' + pct(an.overall.pct) + ' de acertos, cobertura oficial de ' + pct(an.coverage) + ' e confiança ' + an.confidenceBand.label.toLowerCase() + '.';
    else {
      lead = 'Você apresenta ' + pct(an.overall.pct) + ' de acertos, cobertura oficial de ' + pct(an.coverage) + ' e confiança ' + an.confidenceBand.label.toLowerCase() + ' na avaliação.';
      var miss = an.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.label.charAt(0).toLowerCase() + c.label.slice(1); });
      if (miss.length) lead += ' Para estar pronto, falta: ' + miss.join('; ') + '.';
    }
    var cards = g.groups.map(function (x) {
      var shown = x.items.slice(0, 8);
      return '<details class="pd-gap pd-gap-' + x.kind + '"' + (x.kind === 'critical' || x.kind === 'low' ? ' open' : '') + '>' +
        '<summary><span class="pd-gap-ic">' + icon(GAP_ICON[x.kind] || 'info') + '</span><span class="pd-gap-t">' + esc(x.title.replace(/ \(\d+\)$/, '')) + '</span><span class="pd-count">' + x.items.length + '</span></summary>' +
        '<ul>' + shown.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
        (x.items.length > shown.length ? '<p class="pd-note">+ ' + (x.items.length - shown.length) + ' outros</p>' : '') + '</details>';
    }).join('');
    var next = g.next ? '<div class="pd-next">' + icon('book') + '<p>Próximo passo sugerido: <strong>' + esc(g.next.title) + '</strong>, com ' + g.next.n + ' questões nos objetivos que ainda faltam avaliar.</p></div>' : '';
    return '<section class="pd-card pd-missing"><div class="pd-card-h"><h2>' + icon('list') + 'O que falta para eu estar preparado?</h2></div>' +
      '<p class="pd-lead">' + esc(lead) + '</p>' + next + '<div class="pd-gaps">' + cards + '</div></section>';
  }

  function evolutionCard(an, key, title, what, sub, tone, fmt, unit) {
    var pts = an.timeline.filter(function (p) { return p[key] != null; }).map(function (p) {
      return { at: p.at, v: p[key], tip: 'Após ' + bankTitle(p.bankId) + ' (' + dateLong(p.at) + '): ' + what + ' ' + fmt(p[key]) + ' · cobertura ' + pct(p.coverage) };
    });
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('trend') + esc(title) + '</h2><span class="pd-legend"><i class="pd-sw pd-tone-' + tone + '"></i>' + esc(sub) + '</span></div>' +
      lineChart(pts, { tone: tone, fmt: fmt, unit: unit, label: title + ' após cada simulado concluído' }) + '</section>';
  }

  function evolutionTable(an) {
    return '<details class="pd-more pd-more-wide"><summary>Ver a evolução como tabela</summary><div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Data</th><th>Simulado concluído</th><th class="num">Desempenho</th><th class="num">Cobertura</th><th class="num">Confiança</th><th class="num">Prontidão</th></tr></thead><tbody>' +
      an.timeline.map(function (p) { return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td class="num">' + pct(p.overall) + '</td><td class="num">' + pct(p.coverage) + '</td><td class="num">' + dec(p.confidence) + '</td><td class="num">' + (p.index == null ? '—' : dec(p.index)) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details>';
  }

  function legend() {
    return '<div class="pd-legend-row" aria-hidden="true">' + GHX.Progress.BANDS.map(function (b) { return chip(b); }).join('') + grayChip('Não avaliado') + '</div>';
  }

  function domains(an) {
    var rows = an.domains.map(function (s) {
      var tone = s.n && s.enough ? s.status.key : 'none';
      var tip = s.d + '. ' + s.name + (s.n ? ' · ' + pct(s.pct) + ' (' + s.correct + ' de ' + s.n + ')' : ' · não avaliado');
      return '<li class="pd-dom" data-tip="' + esc(tip) + '" tabindex="0">' +
        '<div class="pd-dom-h"><span class="pd-dom-n"><b>' + s.d + '</b>' + esc(s.short) + '</span><span class="pd-dom-v">' + pct(s.pct) + '</span></div>' +
        bar(s.pct, tone) +
        '<div class="pd-dom-f"><span>' + (s.n ? s.n + ' questões avaliadas' + (s.enough ? '' : ' · amostra pequena') : 'Sem questões avaliadas') + '</span>' +
        (s.n ? (s.enough ? chip(s.status) : grayChip('Amostra pequena')) : grayChip('Não avaliado')) + '</div></li>';
    }).join('');
    var table = '<details class="pd-more"><summary>Ver detalhes por domínio</summary><div class="pd-table-wrap"><table class="pd-table"><thead><tr>' +
      '<th>Domínio</th><th class="num">Peso</th><th class="num">Questões</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Evolução</th></tr></thead><tbody>' +
      an.domains.map(function (s) {
        return '<tr><td>' + s.d + '. ' + esc(s.name) + '</td><td class="num">' + Math.round(s.weight * 60) + '/60</td><td class="num">' + s.n + '</td><td class="num">' + s.correct + '</td><td class="num">' + s.wrong + '</td><td class="num"><strong>' + pct(s.pct) + '</strong></td><td class="num">' + s.attempts + '</td>' +
          '<td>' + (s.delta != null ? deltaBadge(s.delta) : '<span class="pd-muted">sem repetições</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('grid') + 'Desempenho por domínio</h2></div><ul class="pd-doms">' + rows + '</ul>' + legend() + table + '</section>';
  }

  function rightWrong(an) {
    var o = an.overall;
    var share = o.n ? (o.correct / o.n) * 100 : 0;
    var rows = an.domains.filter(function (s) { return s.n; }).map(function (s) {
      var c = (s.correct / s.n) * 100;
      var tip = s.d + '. ' + s.short + ': ' + s.correct + ' corretas e ' + s.wrong + ' incorretas';
      return '<li data-tip="' + esc(tip) + '" tabindex="0"><span class="pd-rw-n">' + s.d + '. ' + esc(s.short) + '</span>' +
        '<span class="pd-rw-t" aria-hidden="true">' + (s.correct ? '<span class="pd-ok" style="width:' + c + '%"></span>' : '') + (s.wrong ? '<span class="pd-bad" style="width:' + (100 - c) + '%"></span>' : '') + '</span>' +
        '<span class="pd-rw-v">' + s.correct + ' / ' + s.wrong + '</span></li>';
    }).join('');
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('check') + 'Acertos e erros</h2></div>' +
      '<div class="pd-rw">' +
      '<div class="pd-rw-donut">' + donut(share, 'ok', pct(o.pct), 'de acertos', o.correct + ' corretas e ' + o.wrong + ' incorretas em ' + o.n + ' questões distintas') +
      '<ul class="pd-legend-v"><li><i class="pd-sw pd-sw-ok"></i>Corretas <strong>' + num(o.correct) + '</strong></li><li><i class="pd-sw pd-sw-bad"></i>Incorretas <strong>' + num(o.wrong) + '</strong>' + (o.partial ? '<small>' + o.partial + (o.partial > 1 ? ' parciais incluídas' : ' parcial incluída') + '</small>' : '') + '</li></ul></div>' +
      '<ul class="pd-rw-list">' + rows + '</ul></div></section>';
  }

  var COVER_TONE = { covered: 'exc', partial: 'imp', none: 'none', unavailable: 'none' };
  var COVER_LABEL = { covered: 'Avaliado', partial: 'Parcialmente avaliado', none: 'Não avaliado', unavailable: 'Sem questões no banco' };

  function objectives(an) {
    var rows = an.objectives.filter(function (o) { return o.subs; }).map(function (o) {
      var subs = an.subs.filter(function (x) { return x.obj === o.id && x.available; });
      var segs = subs.map(function (x) {
        return '<span class="pd-seg pd-s-' + COVER_TONE[x.coverage] + '" title="' + esc(x.id + ' ' + x.name + ' — ' + COVER_LABEL[x.coverage] + ' (' + x.n + '/' + x.need + ')') + '"></span>';
      }).join('');
      var st = o.status === 'covered' ? { key: 'exc', label: 'Avaliado' } : o.status === 'partial' ? { key: 'imp', label: 'Parcial' } : null;
      var tip = o.id + ' ' + o.name + ' · ' + o.covered + ' de ' + o.subs + ' subobjetivos avaliados' + (o.perf != null ? ' · ' + pct(o.perf) + ' de acertos' : '');
      return '<li class="pd-obj" data-tip="' + esc(tip) + '" tabindex="0"><div class="pd-obj-h"><span><b>' + o.id + '</b> ' + esc(o.name) + '</span><span class="pd-obj-c">' + o.covered + '/' + o.subs + '</span></div>' +
        '<div class="pd-segs" aria-hidden="true">' + segs + '</div><div class="pd-obj-f">' + chip(st, 'Não avaliado') + (o.perf != null ? '<span class="pd-muted">' + pct(o.perf) + ' de acertos</span>' : '') + '</div></li>';
    }).join('');
    var table = '<details class="pd-more"><summary>Ver os ' + an.subs.length + ' subobjetivos oficiais</summary><div class="pd-table-wrap"><table class="pd-table"><thead><tr>' +
      '<th>Subobjetivo</th><th class="num">No banco</th><th class="num">Respondidas</th><th class="num">Acertos</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Cobertura</th></tr></thead><tbody>' +
      an.subs.map(function (x) {
        return '<tr><td><strong>' + x.id + '</strong> ' + esc(x.name) + '</td><td class="num">' + x.available + '</td><td class="num">' + x.n + '</td><td class="num">' + x.correct + '</td><td class="num">' + pct(x.pct) + '</td><td class="num">' + x.banks + '</td>' +
          '<td>' + (x.coverage === 'covered' || x.coverage === 'partial' ? chip({ key: COVER_TONE[x.coverage], label: COVER_LABEL[x.coverage] }) : grayChip(COVER_LABEL[x.coverage])) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="pd-note">Subobjetivo avaliado = pelo menos ' + GHX.Progress.CONFIG.minSub + ' questões distintas respondidas. A associação usa o domínio, o enunciado e os links oficiais de cada questão; questões sem combinação direta ficam no subobjetivo padrão do seu subtema.</p></details>';
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('layers') + 'Cobertura dos objetivos oficiais</h2>' +
      '<span class="pd-legend"><i class="pd-sw pd-s-exc"></i>Avaliado <i class="pd-sw pd-s-imp"></i>Parcial <i class="pd-sw pd-s-none"></i>Não avaliado</span></div>' +
      '<p class="pd-sub">Cada segmento é um subobjetivo do guia de estudo.</p><ul class="pd-objs">' + rows + '</ul>' + table + '</section>';
  }

  // Mapa de conhecimento: um cartão por subtema, separando não avaliado, evidência insuficiente e desempenho.
  function knowledgeMap(an) {
    var order = { enough: 0, limited: 1, none: 2 };
    var EV = { none: 'Nenhuma', limited: 'Limitada', enough: 'Suficiente' };
    var list = an.topics.slice().sort(function (a, b) { return (order[a.evidence] - order[b.evidence]) || ((a.pct == null ? 0 : a.pct) - (b.pct == null ? 0 : b.pct)) || (b.available - a.available); });
    var tiles = list.map(function (t) {
      var tone = t.evidence === 'enough' ? t.status.key : 'none';
      var state = t.evidence === 'none' ? grayChip('Não avaliado') : t.evidence === 'limited' ? grayChip('Avaliar mais') : chip(t.status);
      var tip = t.name + ' · ' + (t.n ? pct(t.pct) + ' em ' + t.n + ' questões de ' + t.banks + ' simulado' + (t.banks > 1 ? 's' : '') : 'não avaliado') + ' · evidência ' + EV[t.evidence].toLowerCase();
      return '<li class="pd-topic pd-ev-' + t.evidence + '" data-tip="' + esc(tip) + '" tabindex="0">' +
        '<div class="pd-topic-h"><span class="pd-topic-n">' + esc(t.name) + '</span><span class="pd-topic-v">' + pct(t.pct) + '</span></div>' +
        bar(t.pct, tone) +
        '<div class="pd-topic-f">' + state + '<span class="pd-muted">' + t.n + ' de ' + t.available + ' questões</span></div></li>';
    }).join('');
    var table = '<details class="pd-more"><summary>Ver como tabela</summary><div class="pd-table-wrap"><table class="pd-table pd-matrix"><thead><tr><th>Assunto</th><th class="num">No banco</th><th class="num">Respondidas</th><th class="num">Acertos</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Evidência</th><th>Situação</th></tr></thead><tbody>' +
      list.map(function (t) {
        return '<tr><td>' + esc(t.name) + '</td><td class="num">' + t.available + '</td><td class="num">' + t.n + '</td><td class="num">' + t.correct + '</td><td class="num">' + pct(t.pct) + '</td><td class="num">' + t.banks + '</td>' +
          '<td>' + EV[t.evidence] + '</td><td>' + (t.evidence === 'none' ? 'Não avaliado' : t.evidence === 'limited' ? 'Avaliar mais' : esc(t.status.label)) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    return '<section class="pd-card pd-kmap"><div class="pd-card-h"><h2>' + icon('book') + 'Mapa de conhecimento</h2></div>' +
      '<p class="pd-sub">Desempenho por assunto. Evidência suficiente = pelo menos ' + GHX.Progress.CONFIG.minTopic + ' questões distintas de ' + GHX.Progress.CONFIG.minTopicBanks + ' simulados diferentes; com menos, o assunto aparece como "Avaliar mais", mesmo com muitos acertos.</p>' +
      legend() + '<ul class="pd-topics">' + tiles + '</ul>' + table + '</section>';
  }

  function bestWorst(an) {
    var ok = an.topics.filter(function (t) { return t.enough; }).sort(function (a, b) { return b.pct - a.pct; });
    var body;
    if (!ok.length) body = '<p class="pd-empty">Nenhum assunto com evidência suficiente ainda. Conclua simulados diferentes para comparar os assuntos.</p>';
    else {
      var best = ok.slice(0, 5);
      var worst = ok.slice().reverse().filter(function (t) { return best.indexOf(t) < 0; }).slice(0, 5);
      var list = function (ts) {
        return '<ol class="pd-rank">' + ts.map(function (t) {
          return '<li data-tip="' + esc(t.name + ' · ' + pct(t.pct) + ' em ' + t.n + ' questões') + '" tabindex="0"><span class="pd-rank-n">' + esc(t.name) + '</span>' + bar(t.pct, t.status.key) + '<span class="pd-rank-v">' + pct(t.pct) + '</span></li>';
        }).join('') + '</ol>';
      };
      body = '<div class="pd-bw"><div><h3 class="pd-h3 pd-good">' + icon('trend') + 'Melhores resultados</h3>' + list(best) + '</div>' +
        (worst.length ? '<div><h3 class="pd-h3 pd-weak">' + icon('alert') + 'Precisam de reforço</h3>' + list(worst) + '</div>' : '') + '</div>';
    }
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('target') + 'Subtemas: melhores e piores</h2></div>' + body + '</section>';
  }

  function components(an) {
    var row = function (p) {
      return '<li><div class="pd-comp-h"><span>' + esc(p.label) + ' <span class="pd-muted">· peso ' + p.w + '%</span></span><strong>' + (p.v == null ? grayChip('Indisponível') : dec(p.v)) + '</strong></div>' + (p.v == null ? '' : bar(p.v, 'dev')) + '</li>';
    };
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('gauge') + 'Composição dos indicadores</h2></div><div class="pd-comp">' +
      '<div><h3 class="pd-h3">Índice de prontidão</h3><ul class="pd-comp-list">' + an.parts.map(row).join('') + '</ul>' +
      '<p class="pd-note">Componentes indisponíveis não recebem valor; o índice usa os demais, com os pesos renormalizados, e fica marcado como provisório.' +
      (an.retention == null ? ' Retenção: refaça questões 24 h ou mais depois (pelo menos ' + GHX.Progress.CONFIG.retentionMin + '; agora ' + an.retentionItems + ').' : '') +
      (an.consistency == null ? ' Consistência: conclua pelo menos 2 simulados diferentes.' : '') + '</p></div>' +
      '<div><h3 class="pd-h3">Confiança na avaliação</h3><ul class="pd-comp-list">' + an.confidenceParts.map(row).join('') + '</ul>' +
      '<p class="pd-note">Mede a suficiência das evidências, não a chance de aprovação. Evidência que ainda não existe não soma. Com um só simulado, a confiança fica no máximo "Limitada". Repetir as mesmas questões não aumenta a confiança.</p></div>' +
      '</div></section>';
  }

  function plan(an) {
    var item = function (c) {
      var s = c.s;
      return '<li class="pd-plan-i"><div class="pd-plan-ih"><span>' + esc(c.name) + '</span><b>' + pct(s.pct) + '</b></div>' + bar(s.pct, s.status ? s.status.key : 'none') +
        '<div class="pd-plan-if">' + chip(s.status) + '<span class="pd-muted">' + s.wrong + ' erros em ' + s.n + (s.delta != null ? ' · evolução ' + dec(s.delta) + ' p.p.' : '') + '</span></div></li>';
    };
    var col = function (title, tone, ic, list, empty) {
      return '<div class="pd-plan pd-plan-' + tone + '"><h3>' + icon(ic) + title + '<span class="pd-count">' + list.length + '</span></h3>' +
        (list.length ? '<ul>' + list.slice(0, 6).map(item).join('') + '</ul>' + (list.length > 6 ? '<p class="pd-note">+ ' + (list.length - 6) + ' outros</p>' : '') : '<p class="pd-empty">' + empty + '</p>') + '</div>';
    };
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('book') + 'O que devo estudar agora?</h2></div><div class="pd-plans">' +
      col('Prioridade alta', 'high', 'alert', an.plan.high, 'Nenhum tema avaliado abaixo de 70%.') +
      col('Prioridade média', 'mid', 'clock', an.plan.mid, 'Nenhum tema avaliado entre 70% e 85%.') +
      col('Bom desempenho', 'good', 'check', an.plan.good, 'Ainda nenhum tema com 85% ou mais e evidência suficiente.') +
      '</div><p class="pd-note">Só entram assuntos com evidência suficiente e domínios com pelo menos ' + GHX.Progress.CONFIG.minTopic + ' questões. Ordem: menor percentual, maior peso do domínio, mais erros, mais questões avaliadas e pior evolução recente.</p></section>';
  }

  function levels(perBank) {
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('flag') + 'Simulados por nível</h2><span class="pd-legend">Melhor aproveitamento, com crédito parcial</span></div><div class="pd-levels">' +
      LEVELS.map(function (lv) {
        var list = perBank.filter(function (p) { return p.level === lv; });
        if (!list.length) return '';
        return '<div class="pd-level"><h3 class="pd-h3">' + esc(lv) + ' <span class="pd-muted">' + list.filter(function (p) { return p.attempts; }).length + ' de ' + list.length + ' feitos</span></h3><ul>' +
          list.map(function (p) {
            var status = p.attempts ? p.attempts + ' tentativa' + (p.attempts > 1 ? 's' : '') + ' · última ' + pct(p.last) : 'Não iniciado';
            return '<li data-tip="' + esc(p.title + ' · melhor ' + pct(p.best) + ' · ' + status) + '" tabindex="0"><span class="pd-lv-n">' + esc(p.title.replace(/ — .*/, '').replace('Simulado aleatório', 'Aleatório')) + '<small>' + esc(status) + '</small></span>' +
              bar(p.best, band(p.best)) + '<span class="pd-lv-v">' + pct(p.best) + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div></section>';
  }

  function history(s) {
    var chrono = s.trend;
    var rows = chrono.map(function (p, i) { return { p: p, d: i ? p.pct - chrono[i - 1].pct : null }; }).reverse().slice(0, 50);
    return '<section class="pd-card"><div class="pd-card-h"><h2>' + icon('clock') + 'Histórico dos simulados</h2><span class="pd-legend">' + chrono.length + ' tentativa' + (chrono.length > 1 ? 's' : '') + '</span></div>' +
      '<div class="pd-table-wrap"><table class="pd-table pd-history"><thead><tr><th>Data</th><th>Simulado</th><th>Modo</th><th>Idioma</th><th class="num">Tempo</th><th class="num">Aproveitamento</th><th>Evolução</th><th><span class="pd-sr">Ações</span></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var p = r.p;
        return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td>' +
          '<td><span class="pd-tag pd-tag-' + (p.mode === 'study' ? 'study' : 'exam') + '">' + modeLabel(p.mode) + '</span></td>' +
          '<td><span class="pd-tag pd-tag-lang" title="' + langLabel(p.lang) + '">' + (p.lang === 'en' ? 'EN' : 'PT') + '</span><span class="pd-sr"> ' + langLabel(p.lang) + '</span></td>' +
          '<td class="num">' + Math.round(p.elapsedMs / 60000) + ' min</td>' +
          '<td class="num"><span class="pd-pill pd-s-' + band(p.pct) + '">' + pct(p.pct) + '</span></td>' +
          '<td>' + (r.d == null ? '<span class="pd-muted">—</span>' : deltaBadge(r.d)) + '</td>' +
          '<td><button type="button" class="pd-link" data-act="report" data-id="' + esc(p.id) + '">Relatório</button></td></tr>';
      }).join('') + '</tbody></table></div><p class="pd-note">Evolução: diferença para a tentativa anterior, em pontos percentuais.</p></section>';
  }

  function method(an) {
    var C = GHX.Progress.CONFIG;
    return '<details class="pd-card pd-method"><summary>' + icon('info') + 'Como os indicadores são calculados</summary><ul>' +
      '<li><strong>Desempenho</strong> = acertos ÷ questões distintas avaliadas. Acerto é a questão totalmente correta (parcial conta como erro). No modo exame, todas as questões da tentativa contam (sem resposta = erro); no modo estudo, só as respondidas. Vale a <strong>primeira</strong> resposta de cada questão; repetições aparecem como evolução.</li>' +
      '<li><strong>Cobertura oficial</strong> = subobjetivos do guia de estudo (Skills measured as of August 7, 2026) com pelo menos ' + C.minSub + ' questões distintas respondidas, ponderados pelo domínio (' + an.domains.map(function (s) { return 'D' + s.d + ' ' + Math.round(s.weight * 60) + '/60'; }).join(', ') + ', dividido igualmente entre os subobjetivos do domínio). Faixas: abaixo de 50% baixa, 50–69% parcial, 70–84% boa, 85% ou mais ampla.</li>' +
      '<li><strong>Confiança</strong> = questões distintas (' + C.confidenceWeights.volume + '%), simulados diferentes (' + C.confidenceWeights.banks + '%), cobertura (' + C.confidenceWeights.coverage + '%), consistência (' + C.confidenceWeights.consistency + '%) e diversidade de assuntos com evidência suficiente (' + C.confidenceWeights.diversity + '%). Volume e simulados seguem curvas de saturação (100 × (1 − e^(−x/k))).</li>' +
      '<li><strong>Índice de prontidão</strong> = desempenho ponderado por domínio (35%), cobertura (25%), consistência (20%, 100 − ' + C.consistencyK + ' × desvio-padrão entre simulados diferentes), volume (10%) e retenção (10%, acertos em questões refeitas ' + C.retentionGapH + ' h ou mais depois da primeira vez).</li>' +
      '<li><strong>Pronto para agendar</strong> exige todos os critérios listados no topo. Os critérios ficam em <code>GHX.Progress.CONFIG</code> e podem ser ajustados sem alterar os simulados.</li>' +
      '<li>Faixas, pesos e limites são critérios internos de estudo; não são pontuação oficial nem previsão da nota (escala de 1 a 1000, corte em 700).</li>' +
      '</ul></details>';
  }

  GHX.Dashboard = {
    icon: icon,
    render: function (s) {
      var an = s.analysis;
      uid = 0;
      if (!s.attempts) {
        return '<div class="progress-dashboard"><div class="pd-wrap">' + banner() +
          '<section class="pd-card pd-empty-state">' + donut(0, 'none', '—', 'de 100', 'Sem dados de prontidão') +
          '<div><h2>Nenhum simulado concluído ainda</h2>' +
          '<p>Os indicadores aparecem a partir do primeiro simulado concluído, no Modo exame ou no Modo estudo, e ficam mais confiáveis a cada simulado diferente. Não é preciso fazer todos os 12.</p>' +
          '<button type="button" class="pd-btn pd-btn-primary" data-act="home" data-k="dash-start">' + icon('flag') + 'Escolher um simulado</button></div></section></div></div>';
      }
      var confFmt = function (v) { return dec(v); };
      return '<div class="progress-dashboard"><div class="pd-wrap">' + banner() + readiness(an) + metrics(s, an) + missing(an) +
        '<div class="pd-grid2">' +
        evolutionCard(an, 'overall', 'Evolução do desempenho', 'desempenho', 'Acertos nas questões distintas', 'blue', pct, '%') +
        evolutionCard(an, 'confidence', 'Evolução da confiança', 'confiança', 'Suficiência das evidências (0–100)', 'purple', confFmt, '') +
        '</div>' + evolutionTable(an) +
        '<div class="pd-grid2">' + domains(an) + rightWrong(an) + '</div>' +
        objectives(an) + knowledgeMap(an) + bestWorst(an) +
        plan(an) + components(an) +
        levels(s.perBank) + history(s) +
        method(an) +
        '<p class="pd-disclaimer">' + icon('info') + 'Os indicadores são uma avaliação de estudo, não uma previsão de aprovação. A prova real usa escala de 1 a 1000, com corte em 700, e a conversão não é pública.</p>' +
        '</div></div>';
    },
  };
})();
