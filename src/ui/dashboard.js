// Painel de progresso e prontidão para a GH-300: desempenho, cobertura dos objetivos
// oficiais e confiança na avaliação (indicadores independentes), índice de prontidão,
// recomendação em quatro estados, matriz de assuntos, evolução, o que falta e histórico.
// Gera HTML em string (testável no Node); os gráficos são SVG/HTML com as cores do tema
// e dicas ao passar o mouse ([data-tip]). Os cálculos ficam em core/progress.js.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var esc = GHX.esc;
  var LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];

  function pct(x) { return x == null ? '—' : String(x).replace('.', ',') + '%'; }
  function num(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function dateShort(ms) { return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  function dateLong(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function bankTitle(id) { var b = GHX.getBank(id); return b ? b.title : id; }
  function shortTitle(id) { return bankTitle(id).replace(/ — .*/, ''); }
  function langLabel(l) { return l === 'en' ? 'English' : 'Português'; }
  function modeLabel(m) { return m === 'study' ? 'estudo' : 'exame'; }
  function delta(x) {
    if (x == null) return '<span class="muted">—</span>';
    var sign = x > 0 ? '▲ +' : x < 0 ? '▼ ' : '■ ';
    return '<span class="delta">' + sign + String(x).replace('.', ',') + ' p.p.</span>';
  }

  // Selo de status: cor + rótulo (nunca só a cor).
  function chip(st, fallback) {
    if (!st) return '<span class="chip st-none">' + esc(fallback || 'Não avaliado') + '</span>';
    return '<span class="chip st-' + st.key + '"><i aria-hidden="true"></i>' + esc(st.label) + '</span>';
  }

  function tile(label, value, note, cls) {
    return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="kpi-l">' + esc(label) + '</div><div class="kpi-v">' + value + '</div>' +
      (note ? '<div class="kpi-n">' + note + '</div>' : '') + '</div>';
  }

  // Linha única, eixo 0–100%, marcador por ponto e dica com detalhes.
  function lineChart(points, label, fmt) {
    fmt = fmt || pct;
    if (!points.length) return '<p class="muted">Ainda sem dados para a evolução.</p>';
    var W = 640, H = 240, L = 40, Rt = 16, T = 14, B = 34;
    var iw = W - L - Rt, ih = H - T - B, n = points.length;
    var x = function (i) { return L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); };
    var y = function (v) { return T + ih - (v / 100) * ih; };
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      return '<line class="ch-grid" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="ch-ax" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '%</text>';
    }).join('');
    var step = Math.max(1, Math.ceil(n / 8));
    var xl = points.map(function (p, i) {
      return i % step && i !== n - 1 ? '' : '<text class="ch-ax" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + dateShort(p.at) + '</text>';
    }).join('');
    var path = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
    var colW = n === 1 ? iw : iw / (n - 1);
    var pts = points.map(function (p, i) {
      return '<g class="ch-pt" data-tip="' + esc(p.tip) + '" tabindex="0" role="img" aria-label="' + esc(p.tip) + '">' +
        '<rect class="ch-hit" x="' + (x(i) - colW / 2).toFixed(1) + '" y="' + T + '" width="' + colW.toFixed(1) + '" height="' + ih + '"/>' +
        '<line class="ch-cross" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + T + '" y2="' + (T + ih) + '"/>' +
        '<circle class="ch-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="4.5"/></g>';
    }).join('');
    var last = points[n - 1];
    var lastLabel = '<text class="ch-lbl" x="' + Math.min(x(n - 1), W - Rt - 4) + '" y="' + (y(last.v) - 10) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '">' + fmt(last.v) + '</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc(label) + '">' +
      grid + xl + (n > 1 ? '<path class="ch-line" d="' + path + '"/>' : '') + pts + lastLabel + '</svg>';
  }

  // Barra horizontal com cor do status e rótulo de texto.
  function statusBar(name, s, extra) {
    var tip = name + ' · ' + pct(s.pct) + ' (' + s.correct + ' de ' + s.n + ' questões)' + (s.status ? ' · ' + s.status.label : '');
    return '<li data-tip="' + esc(tip) + '" tabindex="0">' +
      '<span class="hb-l">' + esc(name) + (extra || '') + '</span>' +
      '<span class="hb-t" aria-hidden="true">' + (s.pct != null ? '<span class="hb-f st-' + (s.status ? s.status.key : 'none') + '" style="width:' + Math.max(s.pct, 1) + '%"></span>' : '') + '</span>' +
      '<span class="hb-v">' + pct(s.pct) + '</span></li>';
  }

  var EVIDENCE = { none: 'Nenhuma', limited: 'Limitada', enough: 'Suficiente' };
  var COVER = { none: 'Não avaliado', partial: 'Parcialmente avaliado', covered: 'Avaliado', unavailable: 'Sem questões no banco' };
  var COVER_ST = { none: null, partial: { key: 'dev', label: 'Parcialmente avaliado' }, covered: { key: 'exc', label: 'Avaliado' } };

  // Situação de um assunto: separa não avaliado, evidência insuficiente e desempenho.
  function situation(t) {
    if (t.evidence === 'none') return chip(null, 'Não avaliado');
    if (t.evidence === 'limited') return '<span class="chip st-none">Avaliar mais</span>';
    return chip(t.status);
  }

  // ---------- destaque: estado, quatro indicadores e critérios ----------

  function hero(an) {
    var st = an.state;
    var msg = st.key === 'initial' && an.overall.pct != null && an.overall.pct < 70 ? st.msgLow : st.msg;
    var steps = ['initial', 'developing', 'good', 'ready'].map(function (k, i) {
      var names = ['Evidência inicial', 'Em desenvolvimento', 'Boa evidência', 'Pronto para agendar'];
      return '<li class="' + (st.step === i + 1 ? 'on' : st.step > i + 1 ? 'past' : '') + '"' + (st.step === i + 1 ? ' aria-current="step"' : '') + '>' + names[i] + '</li>';
    }).join('');
    var big = function (label, value, note, extra) {
      return '<div class="big"><div class="kpi-l">' + esc(label) + '</div><div class="big-v">' + value + '</div><div class="small">' + note + '</div>' + (extra || '') + '</div>';
    };
    return '<section class="card hero2" aria-labelledby="state-h">' +
      '<div class="state st-' + st.st + '"><div class="kpi-l">Recomendação</div><h2 id="state-h" data-state="' + st.key + '">' + esc(st.label) + '</h2><p>' + esc(msg) + '</p>' +
      '<ol class="steps" aria-label="Etapas da avaliação">' + steps + '</ol></div>' +
      '<div class="bigs">' +
      big('Prontidão GH-300', '<span data-index="' + (an.index == null ? '' : an.index) + '">' + (an.index == null ? '—' : String(an.index).replace('.', ',')) + '</span><span class="kpi-of"> / 100</span>',
        an.provisional ? 'Índice provisório: ' + an.parts.filter(function (p) { return p.v == null; }).map(function (p) { return p.label.toLowerCase(); }).join(' e ') + ' indisponível' : 'Todos os componentes calculados') +
      big('Desempenho geral', pct(an.overall.pct), num(an.overall.correct) + ' de ' + num(an.overall.n) + ' questões distintas') +
      big('Cobertura oficial', '<span data-coverage="' + an.coverage + '">' + pct(an.coverage) + '</span>', esc(an.coverageBand.label) + ' · ' + an.subs.filter(function (x) { return x.coverage === 'covered'; }).length + ' de ' + an.subs.filter(function (x) { return x.available; }).length + ' subobjetivos') +
      big('Confiança na avaliação', '<span data-confidence="' + an.confidence + '">' + esc(an.confidenceBand.label) + '</span>', String(an.confidence).replace('.', ',') + ' / 100 · ' + an.nBanks + ' simulado' + (an.nBanks > 1 ? 's' : '') + ' diferente' + (an.nBanks > 1 ? 's' : '')) +
      '</div>' +
      '<div class="crit"><h3>Critérios para "Pronto para agendar"</h3><ul class="checks">' + an.checks.map(function (c) {
        var v = c.value == null ? '' : ' <span class="muted small">(' + (c.key === 'index' || c.key === 'confidence' || c.key === 'consistency' ? String(c.value).replace('.', ',') : pct(c.value)) + ')</span>';
        return '<li class="' + (c.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (c.ok ? '✓' : '✗') + '</span> ' + esc(c.label) + v + '<span class="sr-only">' + (c.ok ? ' (atendido)' : ' (não atendido)') + '</span></li>';
      }).join('') + '</ul><p class="small muted">Critérios de estudo deste simulador, não garantia de aprovação.</p></div></section>';
  }

  // ---------- o que falta ----------

  function whatsMissing(an) {
    var g = an.gaps;
    var lead;
    if (an.state.key === 'ready') lead = 'Você atende aos critérios de prontidão: ' + pct(an.overall.pct) + ' de acertos, cobertura oficial de ' + pct(an.coverage) + ' e confiança ' + an.confidenceBand.label.toLowerCase() + '.';
    else {
      lead = 'Você apresenta ' + pct(an.overall.pct) + ' de acertos, cobertura oficial de ' + pct(an.coverage) + ' e confiança ' + an.confidenceBand.label.toLowerCase() + ' na avaliação.';
      var miss = an.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.label.charAt(0).toLowerCase() + c.label.slice(1); });
      if (miss.length) lead += ' Para estar pronto, falta: ' + miss.join('; ') + '.';
    }
    var groups = g.groups.map(function (x) {
      var shown = x.items.slice(0, 8);
      return '<details class="gap gap-' + x.kind + '"' + (x.kind === 'critical' || x.kind === 'low' ? ' open' : '') + '><summary>' + esc(x.title) + '</summary><ul>' +
        shown.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' + (x.items.length > shown.length ? '<p class="small muted">+ ' + (x.items.length - shown.length) + ' outros</p>' : '') + '</details>';
    }).join('');
    var next = g.next ? '<p class="next">Próximo passo sugerido: <strong>' + esc(g.next.title) + '</strong>, que tem ' + g.next.n + ' questões nos objetivos que ainda faltam avaliar.</p>' : '';
    return '<section class="card missing"><h2>O que falta para eu estar preparado?</h2><p class="lead">' + esc(lead) + '</p>' + next + groups + '</section>';
  }

  // ---------- gráficos ----------

  function evolution(an, key, label, fmt) {
    var pts = an.timeline.filter(function (p) { return p[key] != null; }).map(function (p) {
      return { at: p.at, v: p[key], tip: 'Após ' + bankTitle(p.bankId) + ' (' + dateLong(p.at) + '): ' + label.toLowerCase() + ' ' + fmt(p[key]) + ' · cobertura ' + pct(p.coverage) };
    });
    return lineChart(pts, label + ' após cada simulado concluído', fmt);
  }

  function objectivesChart(an) {
    return '<ul class="hbars obj">' + an.objectives.filter(function (o) { return o.subs; }).map(function (o) {
      var st = COVER_ST[o.status];
      var tip = o.id + ' ' + o.name + ' · ' + o.covered + ' de ' + o.subs + ' subobjetivos avaliados' + (o.perf != null ? ' · ' + pct(o.perf) + ' de acertos' : '');
      return '<li data-tip="' + esc(tip) + '" tabindex="0"><span class="hb-l">' + o.id + ' ' + esc(o.name) + '</span>' +
        '<span class="hb-t" aria-hidden="true">' + (o.pct ? '<span class="hb-f st-' + (st ? st.key : 'none') + '" style="width:' + Math.max(o.pct, 1) + '%"></span>' : '') + '</span>' +
        '<span class="hb-v">' + o.covered + '/' + o.subs + '</span><span class="hb-s">' + chip(st, 'Não avaliado') + '</span></li>';
    }).join('') + '</ul>';
  }

  function subsTable(an) {
    return '<details class="tview"><summary>Ver os ' + an.subs.length + ' subobjetivos oficiais</summary><div class="rv-wrap"><table class="dom-table"><thead><tr>' +
      '<th>Subobjetivo</th><th class="num">No banco</th><th class="num">Respondidas</th><th class="num">Acertos</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Cobertura</th></tr></thead><tbody>' +
      an.subs.map(function (x) {
        return '<tr><td><strong>' + x.id + '</strong> ' + esc(x.name) + '</td><td class="num">' + x.available + '</td><td class="num">' + x.n + '</td><td class="num">' + x.correct + '</td><td class="num">' + pct(x.pct) + '</td><td class="num">' + x.banks + '</td>' +
          '<td>' + (x.coverage === 'covered' || x.coverage === 'partial' ? chip(COVER_ST[x.coverage]) : '<span class="chip st-none">' + COVER[x.coverage] + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="small muted">Subobjetivo avaliado = pelo menos ' + GHX.Progress.CONFIG.minSub + ' questões distintas respondidas. A associação usa o domínio, o enunciado e os links oficiais de cada questão; ' +
      'questões sem combinação direta ficam no subobjetivo padrão do seu subtema.</p></details>';
  }

  function domainChart(an) {
    return '<ul class="hbars">' + an.domains.map(function (s) {
      if (!s.n) return '<li><span class="hb-l">' + s.d + '. ' + esc(s.short) + '</span><span class="hb-t" aria-hidden="true"></span><span class="hb-v small muted">Não avaliado</span></li>';
      return statusBar(s.d + '. ' + s.short, s, ' <span class="small muted">· ' + s.n + ' questões' + (s.enough ? '' : ' (amostra pequena)') + '</span>');
    }).join('') + '</ul>' +
      '<div class="legend small" aria-hidden="true">' + GHX.Progress.BANDS.map(function (b) { return chip(b); }).join('') + '</div>';
  }

  function domainTable(an) {
    return '<details class="tview"><summary>Ver detalhes por domínio</summary><div class="rv-wrap"><table class="dom-table"><thead><tr>' +
      '<th>Domínio</th><th class="num">Peso</th><th class="num">Questões</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Evolução</th><th>Status</th></tr></thead><tbody>' +
      an.domains.map(function (s) {
        return '<tr><td>' + s.d + '. ' + esc(s.name) + '</td><td class="num">' + Math.round(s.weight * 60) + '/60</td><td class="num">' + s.n + '</td><td class="num">' + s.correct + '</td><td class="num">' + s.wrong + '</td><td class="num"><strong>' + pct(s.pct) + '</strong></td><td class="num">' + s.attempts + '</td>' +
          '<td>' + (s.delta != null ? delta(s.delta) : '<span class="small muted">sem repetições</span>') + '</td><td>' + (s.n ? (s.enough ? chip(s.status) : '<span class="chip st-none">Amostra pequena</span>') : chip(null)) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
  }

  function topicMatrix(an) {
    var order = { enough: 0, limited: 1, none: 2 };
    var list = an.topics.slice().sort(function (a, b) { return (order[a.evidence] - order[b.evidence]) || ((a.pct == null ? 0 : a.pct) - (b.pct == null ? 0 : b.pct)) || (b.available - a.available); });
    return '<div class="rv-wrap"><table class="dom-table matrix"><thead><tr><th>Assunto</th><th class="num">No banco</th><th class="num">Respondidas</th><th class="num">Acertos</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Evidência</th><th>Situação</th></tr></thead><tbody>' +
      list.map(function (t) {
        return '<tr><td>' + esc(t.name) + '</td><td class="num">' + t.available + '</td><td class="num">' + t.n + '</td><td class="num">' + t.correct + '</td><td class="num">' + pct(t.pct) + '</td><td class="num">' + t.banks + '</td>' +
          '<td><span class="ev ev-' + t.evidence + '">' + EVIDENCE[t.evidence] + '</span></td><td>' + situation(t) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="small muted">Evidência suficiente = pelo menos ' + GHX.Progress.CONFIG.minTopic + ' questões distintas vindas de ' + GHX.Progress.CONFIG.minTopicBanks + ' simulados diferentes. Acertar poucas questões de um assunto não comprova domínio: ele aparece como "Avaliar mais".</p>';
  }

  function topicChart(an) {
    var ok = an.topics.filter(function (t) { return t.enough; }).sort(function (a, b) { return b.pct - a.pct; });
    if (!ok.length) return '<p class="muted">Nenhum assunto com evidência suficiente ainda. Conclua simulados diferentes para comparar os assuntos.</p>';
    var best = ok.slice(0, 5);
    var worst = ok.slice().reverse().filter(function (t) { return best.indexOf(t) < 0; }).slice(0, 5);
    var list = function (ts) { return '<ul class="hbars">' + ts.map(function (t) { return statusBar(t.name, t, ' <span class="small muted">· ' + t.n + '</span>'); }).join('') + '</ul>'; };
    return '<div class="tp-cols"><div><h3>Melhores resultados</h3>' + list(best) + '</div>' +
      (worst.length ? '<div><h3>Precisam de reforço</h3>' + list(worst) + '</div>' : '') + '</div>';
  }

  function rightWrong(an) {
    var row = function (name, s, total) {
      if (!s.n) return '';
      var c = (s.correct / s.n) * 100;
      var tip = name + ': ' + s.correct + ' corretas e ' + s.wrong + ' incorretas' + (s.partial ? ' (' + s.partial + (s.partial > 1 ? ' parciais' : ' parcial') + ')' : '');
      return '<li class="' + (total ? 'rw-total' : '') + '" data-tip="' + esc(tip) + '" tabindex="0"><span class="hb-l">' + esc(name) + '</span>' +
        '<span class="rw-t" aria-hidden="true">' + (s.correct ? '<span class="rw-ok" style="width:' + c + '%"></span>' : '') + (s.wrong ? '<span class="rw-bad" style="width:' + (100 - c) + '%"></span>' : '') + '</span>' +
        '<span class="rw-v">' + s.correct + ' / ' + s.wrong + '</span></li>';
    };
    return '<div class="legend small"><span class="lg"><i class="sw rw-ok"></i>Corretas</span><span class="lg"><i class="sw rw-bad"></i>Incorretas (inclui parciais)</span></div>' +
      '<ul class="hbars rw">' + row('Total', an.overall, true) + an.domains.map(function (s) { return row(s.d + '. ' + s.short, s); }).join('') + '</ul>';
  }

  function components(an) {
    var row = function (p, unit) {
      return '<tr><td>' + esc(p.label) + '</td><td class="num">' + p.w + '%</td><td class="num">' + (p.v == null ? '<span class="muted">Indisponível</span>' : String(p.v).replace('.', ',') + unit) + '</td></tr>';
    };
    return '<div class="comp-cols"><div><h3>Índice de prontidão</h3><table class="dom-table"><thead><tr><th>Componente</th><th class="num">Peso</th><th class="num">Valor</th></tr></thead><tbody>' +
      an.parts.map(function (p) { return row(p, ''); }).join('') + '</tbody></table>' +
      '<p class="small muted">Componentes indisponíveis não recebem valor; o índice usa os demais, com os pesos renormalizados, e fica marcado como provisório.' +
      (an.retention == null ? ' Retenção: refaça questões 24 h ou mais depois (pelo menos ' + GHX.Progress.CONFIG.retentionMin + '; agora ' + an.retentionItems + ').' : '') +
      (an.consistency == null ? ' Consistência: conclua pelo menos 2 simulados diferentes.' : '') + '</p></div>' +
      '<div><h3>Confiança na avaliação</h3><table class="dom-table"><thead><tr><th>Evidência</th><th class="num">Peso</th><th class="num">Valor</th></tr></thead><tbody>' +
      an.confidenceParts.map(function (p) { return row(p, ''); }).join('') + '</tbody></table>' +
      '<p class="small muted">Mede a suficiência das evidências, não a chance de aprovação. Evidência que ainda não existe não soma. Com um só simulado, a confiança fica no máximo "Limitada". Repetir as mesmas questões não aumenta a confiança.</p></div></div>';
  }

  function studyPlan(an) {
    var item = function (c) {
      var s = c.s;
      return '<li><strong>' + esc(c.name) + '</strong> — ' + pct(s.pct) + ' de acertos <span class="small muted">(' + s.wrong + ' erros em ' + s.n + ' questões' +
        (s.delta != null ? '; evolução ' + String(s.delta).replace('.', ',') + ' p.p.' : '') + ')</span></li>';
    };
    var group = function (title, cls, list, empty) {
      return '<div class="plan ' + cls + '"><h3>' + title + '</h3>' + (list.length ? '<ul>' + list.slice(0, 6).map(item).join('') + '</ul>' + (list.length > 6 ? '<p class="small muted">+ ' + (list.length - 6) + ' outros</p>' : '') : '<p class="small muted">' + empty + '</p>') + '</div>';
    };
    return '<div class="plan-grid">' +
      group('Prioridade alta', 'st-pri', an.plan.high, 'Nenhum tema avaliado abaixo de 70%.') +
      group('Prioridade média', 'st-dev', an.plan.mid, 'Nenhum tema avaliado entre 70% e 85%.') +
      group('Bom desempenho', 'st-exc', an.plan.good, 'Ainda nenhum tema com 85% ou mais e evidência suficiente.') +
      '</div><p class="small muted">Só entram assuntos com evidência suficiente e domínios com pelo menos ' + GHX.Progress.CONFIG.minTopic + ' questões. Ordem: menor percentual, maior peso do domínio, mais erros, mais questões avaliadas e pior evolução recente.</p>';
  }

  function method(an) {
    var C = GHX.Progress.CONFIG;
    return '<details class="tview method"><summary>Como os indicadores são calculados</summary><ul class="small">' +
      '<li><strong>Desempenho</strong> = acertos ÷ questões distintas avaliadas. Acerto é a questão totalmente correta (parcial conta como erro). No modo exame, todas as questões da tentativa contam (sem resposta = erro); no modo estudo, só as respondidas. Vale a <strong>primeira</strong> resposta de cada questão; repetições aparecem como evolução.</li>' +
      '<li><strong>Cobertura oficial</strong> = subobjetivos do guia de estudo (Skills measured as of August 7, 2026) com pelo menos ' + C.minSub + ' questões distintas respondidas, ponderados pelo domínio (' + an.domains.map(function (s) { return 'D' + s.d + ' ' + Math.round(s.weight * 60) + '/60'; }).join(', ') + ', dividido igualmente entre os subobjetivos do domínio). Faixas: abaixo de 50% baixa, 50–69% parcial, 70–84% boa, 85% ou mais ampla.</li>' +
      '<li><strong>Confiança</strong> = questões distintas (' + C.confidenceWeights.volume + '%), simulados diferentes (' + C.confidenceWeights.banks + '%), cobertura (' + C.confidenceWeights.coverage + '%), consistência (' + C.confidenceWeights.consistency + '%) e diversidade de assuntos com evidência suficiente (' + C.confidenceWeights.diversity + '%). Volume e simulados seguem curvas de saturação (100 × (1 − e^(−x/k))).</li>' +
      '<li><strong>Índice de prontidão</strong> = desempenho ponderado por domínio (35%), cobertura (25%), consistência (20%, 100 − ' + C.consistencyK + ' × desvio-padrão entre simulados diferentes), volume (10%) e retenção (10%, acertos em questões refeitas ' + C.retentionGapH + ' h ou mais depois da primeira vez).</li>' +
      '<li><strong>Pronto para agendar</strong> exige todos os critérios listados no topo. Os critérios ficam em <code>GHX.Progress.CONFIG</code> e podem ser ajustados sem alterar os simulados.</li>' +
      '<li>Faixas, pesos e limites são critérios internos de estudo; não são pontuação oficial nem previsão da nota (escala de 1 a 1000, corte em 700).</li>' +
      '</ul></details>';
  }

  function bankRows(perBank) {
    return LEVELS.map(function (lv) {
      var list = perBank.filter(function (p) { return p.level === lv; });
      if (!list.length) return '';
      return '<div class="lv"><h3>' + esc(lv) + ' <span class="muted small">' + list.filter(function (p) { return p.attempts; }).length + ' de ' + list.length + ' feitos</span></h3><ul class="hbars">' +
        list.map(function (p) {
          var status = p.attempts ? p.attempts + ' tentativa' + (p.attempts > 1 ? 's' : '') + ' · última ' + pct(p.last) : 'Não iniciado';
          return '<li data-tip="' + esc(p.title + ' · melhor ' + pct(p.best) + ' · ' + status) + '" tabindex="0"><span class="hb-l">' + esc(p.title.replace(/ — .*/, '')) + '<span class="muted small"> · ' + esc(status) + '</span></span>' +
            '<span class="hb-t" aria-hidden="true">' + (p.best != null ? '<span class="hb-f" style="width:' + Math.max(p.best, 1) + '%"></span>' : '') + '</span>' +
            '<span class="hb-v">' + pct(p.best) + '</span></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  GHX.Dashboard = {
    render: function (s) {
      var an = s.analysis;
      var head = '<header class="home-h"><div><h1>Painel de progresso</h1><p class="sub">Avaliação progressiva da sua preparação para a GH-300: desempenho, cobertura dos objetivos oficiais e confiança nas evidências.</p></div>' +
        '<div class="home-tools"><button class="btn" data-act="home" data-k="dash-home">Voltar ao início</button></div></header>';
      if (!s.attempts) {
        return '<div class="home dash">' + head + '<section class="card empty-dash"><h2>Nenhum simulado concluído ainda</h2>' +
          '<p>Os indicadores aparecem a partir do primeiro simulado concluído, no Modo exame ou no Modo estudo, e ficam mais confiáveis a cada simulado diferente. Não é preciso fazer todos os 12.</p>' +
          '<div class="actions"><button class="btn primary" data-act="home" data-k="dash-start">Escolher um simulado</button></div></section></div>';
      }
      var kpis = '<section class="kpis" aria-label="Indicadores">' +
        tile('Simulados concluídos', s.banksDone + ' <span class="kpi-of">de ' + s.banksTotal + '</span>', s.attempts + ' tentativa' + (s.attempts > 1 ? 's' : '') + ' · ' + s.byLang.pt + ' em português · ' + s.byLang.en + ' em inglês') +
        tile('Corretas e incorretas', num(an.overall.correct) + ' <span class="kpi-of">/ ' + num(an.overall.wrong) + '</span>', an.repeatedQuestions ? an.repeatedQuestions + ' questões refeitas não contam de novo' : 'questões distintas') +
        tile('Domínios avaliados', an.domainsEvaluated + ' <span class="kpi-of">de ' + an.domainsTotal + '</span>', an.domains.filter(function (d) { return d.enough; }).length + ' com amostra suficiente') +
        tile('Principal assunto a melhorar', an.focus ? '<span class="kpi-txt">' + esc(an.focus.name) + '</span>' : '<span class="kpi-txt">—</span>', an.focus ? pct(an.focus.s.pct) + ' de acertos em ' + an.focus.s.n + ' questões' : 'Sem assunto com evidência suficiente') +
        '</section>';
      var evoTable = '<details class="tview"><summary>Ver como tabela</summary><div class="rv-wrap"><table class="dom-table"><thead><tr><th>Data</th><th>Simulado concluído</th><th class="num">Desempenho</th><th class="num">Cobertura</th><th class="num">Confiança</th><th class="num">Prontidão</th></tr></thead><tbody>' +
        an.timeline.map(function (p) { return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td class="num">' + pct(p.overall) + '</td><td class="num">' + pct(p.coverage) + '</td><td class="num">' + String(p.confidence).replace('.', ',') + '</td><td class="num">' + (p.index == null ? '—' : String(p.index).replace('.', ',')) + '</td></tr>'; }).join('') +
        '</tbody></table></div></details>';
      var hist = s.trend.slice().reverse();
      var histTable = '<table class="dom-table hist-table"><thead><tr><th>Data</th><th>Simulado</th><th>Modo</th><th>Idioma</th><th class="num">Tempo</th><th class="num">Aproveitamento</th><th></th></tr></thead><tbody>' +
        hist.slice(0, 50).map(function (p) {
          return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td>' + modeLabel(p.mode) + '</td><td>' + langLabel(p.lang) + '</td>' +
            '<td class="num">' + Math.round(p.elapsedMs / 60000) + ' min</td><td class="num"><strong>' + pct(p.pct) + '</strong></td>' +
            '<td><button class="link" data-act="report" data-id="' + esc(p.id) + '">Relatório</button></td></tr>';
        }).join('') + '</tbody></table>';
      var conf = function (v) { return String(v).replace('.', ','); };
      return '<div class="home dash">' + head + hero(an) + kpis + whatsMissing(an) +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Evolução do desempenho</h2><p class="sub small">Acertos nas questões distintas, após cada simulado concluído.</p>' + evolution(an, 'overall', 'Desempenho', pct) + evoTable + '</section>' +
        '<section class="card"><h2>Evolução da confiança</h2><p class="sub small">Suficiência das evidências após cada simulado concluído.</p>' + evolution(an, 'confidence', 'Confiança', conf) + '</section>' +
        '</div>' +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Cobertura dos objetivos oficiais</h2><p class="sub small">Subobjetivos avaliados em cada objetivo do guia de estudo.</p>' + objectivesChart(an) + subsTable(an) + '</section>' +
        '<section class="card"><h2>Desempenho por domínio</h2><p class="sub small">Percentual de acertos nos seis domínios oficiais.</p>' + domainChart(an) + domainTable(an) + '</section>' +
        '</div>' +
        '<section class="card"><h2>Matriz de assuntos</h2><p class="sub small">Conhecimento por subtema, separando assunto não avaliado, evidência insuficiente e desempenho.</p>' + topicMatrix(an) + '</section>' +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Conhecimento por subtema</h2><p class="sub small">Melhores e piores resultados entre os assuntos com evidência suficiente.</p>' + topicChart(an) + '</section>' +
        '<section class="card"><h2>Acertos e erros</h2><p class="sub small">Questões distintas corretas e incorretas, no total e por domínio.</p>' + rightWrong(an) + '</section>' +
        '</div>' +
        '<section class="card"><h2>Composição dos indicadores</h2>' + components(an) + '</section>' +
        '<section class="card study"><h2>O que devo estudar agora?</h2>' + studyPlan(an) + '</section>' +
        '<section class="card"><h2>Simulados por nível</h2><p class="sub small">Barra = melhor aproveitamento em cada simulado (com crédito parcial).</p>' + bankRows(s.perBank) + '</section>' +
        '<section class="card"><h2>Histórico</h2><div class="rv-wrap">' + histTable + '</div></section>' +
        method(an) +
        '<p class="note-box small">Os indicadores são uma avaliação de estudo, não uma previsão de aprovação. A prova real usa escala de 1 a 1000, com corte em 700, e a conversão não é pública.</p>' +
        '</div>';
    },
  };
})();
