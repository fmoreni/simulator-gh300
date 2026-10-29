// Painel de progresso e prontidão para a GH-300: preparação estimada, desempenho por
// domínio e por subtema, acertos e erros, evolução, recomendações de estudo e histórico.
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
  function lineChart(points, label) {
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
    var lastLabel = '<text class="ch-lbl" x="' + Math.min(x(n - 1), W - Rt - 4) + '" y="' + (y(last.v) - 10) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '">' + pct(last.v) + '</text>';
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

  // Gráfico 1: desempenho por domínio, na ordem oficial.
  function domainChart(an) {
    return '<ul class="hbars">' + an.domains.map(function (s) {
      if (!s.n) {
        return '<li><span class="hb-l">' + s.d + '. ' + esc(s.short) + '</span><span class="hb-t" aria-hidden="true"></span><span class="hb-v small muted">Não avaliado</span></li>';
      }
      return statusBar(s.d + '. ' + s.short, s, ' <span class="small muted">· ' + s.n + ' questões</span>');
    }).join('') + '</ul>' +
      '<div class="legend small" aria-hidden="true">' + GHX.Progress.BANDS.map(function (b) { return chip(b); }).join('') + '</div>';
  }

  function domainTable(an) {
    return '<details class="tview"><summary>Ver detalhes por domínio</summary><div class="rv-wrap"><table class="dom-table"><thead><tr>' +
      '<th>Domínio</th><th class="num">Peso</th><th class="num">Questões</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Desempenho</th><th class="num">Simulados</th><th>Evolução</th><th>Status</th></tr></thead><tbody>' +
      an.domains.map(function (s) {
        return '<tr><td>' + s.d + '. ' + esc(s.name) + '</td><td class="num">' + Math.round(s.weight * 60) + '/60</td><td class="num">' + s.n + '</td><td class="num">' + s.correct + '</td><td class="num">' + s.wrong +
          (s.partial ? ' <span class="small muted">(' + s.partial + (s.partial > 1 ? ' parciais' : ' parcial') + ')</span>' : '') + '</td><td class="num"><strong>' + pct(s.pct) + '</strong></td><td class="num">' + s.attempts + '</td>' +
          '<td>' + (s.delta != null ? delta(s.delta) + ' <span class="small muted">em ' + s.repeated + ' repetidas</span>' : '<span class="small muted">sem repetições</span>') + '</td><td>' + chip(s.status) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
  }

  // Gráfico 3: acertos e erros, por domínio e no total (barras 100% empilhadas).
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

  // Gráfico 4: melhores e piores subtemas (só os com amostra suficiente).
  function topicChart(an) {
    var ok = an.topics.filter(function (t) { return t.enough; });
    if (!ok.length) return '<p class="muted">Ainda não há subtema com pelo menos ' + GHX.Progress.MIN_TOPIC + ' questões avaliadas.</p>';
    var best = ok.slice(0, 5);
    var worst = ok.slice().reverse().filter(function (t) { return best.indexOf(t) < 0; }).slice(0, 5);
    var list = function (ts) { return '<ul class="hbars">' + ts.map(function (t) { return statusBar(t.name, t, ' <span class="small muted">· ' + t.n + '</span>'); }).join('') + '</ul>'; };
    return '<div class="tp-cols"><div><h3>Melhores resultados</h3>' + list(best) + '</div>' +
      '<div><h3>Precisam de reforço</h3>' + (worst.length ? list(worst) : '<p class="muted small">Todos os subtemas avaliados já aparecem ao lado.</p>') + '</div></div>';
  }

  function topicTable(an) {
    return '<details class="tview"><summary>Ver todos os subtemas (' + an.topics.length + ')</summary><div class="rv-wrap"><table class="dom-table"><thead><tr>' +
      '<th>Subtema</th><th class="num">Questões</th><th class="num">Acertos</th><th class="num">Erros</th><th class="num">Desempenho</th><th>Evolução</th><th>Status</th></tr></thead><tbody>' +
      an.topics.map(function (t) {
        return '<tr><td>' + esc(t.name) + '</td><td class="num">' + t.n + '</td><td class="num">' + t.correct + '</td><td class="num">' + t.wrong + '</td><td class="num">' + pct(t.pct) + '</td>' +
          '<td>' + delta(t.delta) + '</td><td>' + chip(t.status, 'Amostra insuficiente') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="small muted">O subtema vem dos links de documentação oficial de cada questão; uma questão pode tocar mais de um subtema. Subtemas com menos de ' + GHX.Progress.MIN_TOPIC + ' questões avaliadas não recebem status.</p></details>';
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
      group('Prioridade alta', 'st-pri', an.plan.high, 'Nenhum tema abaixo de 70%.') +
      group('Prioridade média', 'st-dev', an.plan.mid, 'Nenhum tema entre 70% e 85%.') +
      group('Bom desempenho', 'st-exc', an.plan.good, 'Ainda nenhum tema com 85% ou mais.') +
      '</div><p class="small muted">Ordem dentro de cada grupo: menor percentual de acertos, maior peso do domínio na prova, mais erros, mais questões avaliadas e pior evolução recente. Só entram temas com pelo menos ' + GHX.Progress.MIN_TOPIC + ' questões avaliadas.</p>';
  }

  function readinessHero(an) {
    var r = an.readiness;
    var schedule = an.schedule.ok
      ? '<p class="sched ok"><strong>Bom indicativo para agendar a GH-300.</strong></p>'
      : '<p class="sched"><strong>Ainda não há evidência suficiente para agendar a prova.</strong></p>';
    return '<section class="card hero"><div class="hero-main">' +
      '<div class="kpi-l">Preparação estimada GH-300</div>' +
      '<div class="hero-v" data-readiness="' + (r == null ? '' : r) + '">' + pct(r) + '</div>' +
      '<div>' + (an.ready ? chip(an.ready) : chip(null, 'Sem dados')) + '</div>' +
      '<p class="small">Cobertura: <strong>' + an.coverage + ' de ' + an.domainsTotal + ' domínios</strong> · ' + (an.partial ? 'Avaliação parcial' : 'Avaliação completa') +
      ' · ' + num(an.overall.n) + ' questões avaliadas</p></div>' +
      '<div class="hero-side"><h2>Recomendação para a prova</h2>' + schedule +
      '<ul class="checks">' + an.schedule.checks.map(function (c) {
        return '<li class="' + (c.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (c.ok ? '✓' : '✗') + '</span> ' + esc(c.label) + '<span class="sr-only">' + (c.ok ? ' (atendido)' : ' (não atendido)') + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="small muted">Critérios de estudo deste simulador, não garantia de aprovação.</p></div></section>';
  }

  function method(an) {
    return '<details class="tview method"><summary>Como os indicadores são calculados</summary><ul class="small">' +
      '<li><strong>Desempenho do domínio</strong> = acertos ÷ questões avaliadas × 100. Acerto é a questão totalmente correta; resposta parcial conta como erro (o relatório de cada simulado, que dá crédito parcial, pode mostrar um percentual maior).</li>' +
      '<li><strong>Questões avaliadas:</strong> no modo exame, todas as questões da tentativa (sem resposta conta como erro); no modo estudo, só as respondidas.</li>' +
      '<li><strong>Repetições:</strong> o indicador usa a <strong>primeira</strong> avaliação de cada questão. Refazer um simulado não conta a mesma questão de novo como evidência; a diferença entre a primeira e a última resposta aparece como evolução.</li>' +
      '<li><strong>Preparação estimada</strong> = média dos domínios ponderada pela distribuição dos simulados (' + an.domains.map(function (s) { return 'D' + s.d + ' ' + Math.round(s.weight * 60) + '/60'; }).join(', ') + '). Domínios sem questões avaliadas ficam como "Não avaliado" e os pesos dos demais são renormalizados.</li>' +
      '<li>Todos os simulados contam, de qualquer nível de dificuldade. Faixas de status e prontidão são critérios internos de acompanhamento; os pesos não são uma pontuação oficial, e a estimativa não prevê a nota da prova (escala de 1 a 1000, corte em 700).</li>' +
      '</ul></details>';
  }

  function bankRows(perBank) {
    return LEVELS.map(function (lv) {
      var list = perBank.filter(function (p) { return p.level === lv; });
      if (!list.length) return '';
      return '<div class="lv"><h3>' + esc(lv) + ' <span class="muted small">' + list.filter(function (p) { return p.attempts; }).length + ' de ' + list.length + ' feitos</span></h3><ul class="hbars">' +
        list.map(function (p) {
          var status = p.attempts ? p.attempts + ' tentativa' + (p.attempts > 1 ? 's' : '') + ' · última ' + pct(p.last) : 'Não iniciado';
          var tip = p.title + ' · melhor ' + pct(p.best) + ' · ' + status;
          return '<li data-tip="' + esc(tip) + '" tabindex="0"><span class="hb-l">' + esc(p.title.replace(/ — .*/, '')) + '<span class="muted small"> · ' + esc(status) + '</span></span>' +
            '<span class="hb-t" aria-hidden="true">' + (p.best != null ? '<span class="hb-f" style="width:' + Math.max(p.best, 1) + '%"></span>' : '') + '</span>' +
            '<span class="hb-v">' + pct(p.best) + '</span></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  GHX.Dashboard = {
    render: function (s) {
      var an = s.analysis;
      var head = '<header class="home-h"><div><h1>Painel de progresso</h1><p class="sub">Sua preparação para a GH-300 a partir de todos os simulados concluídos, de qualquer nível.</p></div>' +
        '<div class="home-tools"><button class="btn" data-act="home" data-k="dash-home">Voltar ao início</button></div></header>';
      if (!s.attempts) {
        return '<div class="home dash">' + head + '<section class="card empty-dash"><h2>Nenhum simulado concluído ainda</h2>' +
          '<p>A preparação estimada, o desempenho por domínio e as recomendações aparecem a partir do primeiro simulado concluído, no Modo exame ou no Modo estudo. Não é preciso fazer todos os simulados.</p>' +
          '<div class="actions"><button class="btn primary" data-act="home" data-k="dash-start">Escolher um simulado</button></div></section></div>';
      }
      var evaluatedDomains = an.domains.filter(function (d) { return d.n; }).length;
      var kpis = '<section class="kpis" aria-label="Indicadores">' +
        tile('Preparação estimada', pct(an.readiness), an.ready ? esc(an.ready.label) : 'Sem dados') +
        tile('Acertos no geral', pct(an.overall.pct), num(an.overall.n) + ' questões avaliadas') +
        tile('Simulados concluídos', s.banksDone + ' <span class="kpi-of">de ' + s.banksTotal + '</span>', s.attempts + ' tentativa' + (s.attempts > 1 ? 's' : '') + ' · ' + s.byLang.pt + ' em português · ' + s.byLang.en + ' em inglês') +
        tile('Corretas e incorretas', num(an.overall.correct) + ' <span class="kpi-of">/ ' + num(an.overall.wrong) + '</span>', an.overall.partial ? an.overall.partial + (an.overall.partial > 1 ? ' parciais contadas' : ' parcial contada') + ' como incorreta' + (an.overall.partial > 1 ? 's' : '') : 'corretas / incorretas') +
        tile('Domínios avaliados', evaluatedDomains + ' <span class="kpi-of">de ' + an.domainsTotal + '</span>', an.partial ? 'Avaliação parcial' : 'Avaliação completa') +
        tile('Principal assunto a melhorar', an.focus ? '<span class="kpi-txt">' + esc(an.focus.name) + '</span>' : '<span class="kpi-txt">—</span>', an.focus ? pct(an.focus.s.pct) + ' de acertos em ' + an.focus.s.n + ' questões' : 'Sem tema com amostra suficiente') +
        '</section>';
      var evo = an.timeline.filter(function (p) { return p.readiness != null; }).map(function (p) {
        return { at: p.at, v: p.readiness, tip: 'Após ' + bankTitle(p.bankId) + ' (' + dateLong(p.at) + '): preparação ' + pct(p.readiness) + ' · ' + p.coverage + ' de 6 domínios · tentativa ' + pct(p.attemptPct) };
      });
      var evoTable = '<details class="tview"><summary>Ver como tabela</summary><table class="dom-table"><thead><tr><th>Data</th><th>Simulado concluído</th><th class="num">Tentativa</th><th class="num">Preparação</th><th class="num">Cobertura</th></tr></thead><tbody>' +
        an.timeline.map(function (p) { return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td class="num">' + pct(p.attemptPct) + '</td><td class="num">' + pct(p.readiness) + '</td><td class="num">' + p.coverage + '/6</td></tr>'; }).join('') +
        '</tbody></table></details>';
      var hist = s.trend.slice().reverse();
      var histTable = '<table class="dom-table hist-table"><thead><tr><th>Data</th><th>Simulado</th><th>Modo</th><th>Idioma</th><th class="num">Tempo</th><th class="num">Aproveitamento</th><th></th></tr></thead><tbody>' +
        hist.slice(0, 50).map(function (p) {
          return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td>' + modeLabel(p.mode) + '</td><td>' + langLabel(p.lang) + '</td>' +
            '<td class="num">' + Math.round(p.elapsedMs / 60000) + ' min</td><td class="num"><strong>' + pct(p.pct) + '</strong></td>' +
            '<td><button class="link" data-act="report" data-id="' + esc(p.id) + '">Relatório</button></td></tr>';
        }).join('') + '</tbody></table>';
      return '<div class="home dash">' + head + readinessHero(an) + kpis +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Desempenho por domínio</h2><p class="sub small">Percentual de acertos nos seis domínios oficiais.</p>' + domainChart(an) + domainTable(an) + '</section>' +
        '<section class="card"><h2>Evolução da preparação</h2><p class="sub small">Preparação estimada após cada simulado concluído.</p>' + lineChart(evo, 'Preparação estimada após cada simulado concluído') + evoTable + '</section>' +
        '</div>' +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Acertos e erros</h2><p class="sub small">Questões corretas e incorretas, no total e por domínio.</p>' + rightWrong(an) + '</section>' +
        '<section class="card"><h2>Desempenho por subtema</h2><p class="sub small">Assuntos com melhores e piores resultados.</p>' + topicChart(an) + topicTable(an) + '</section>' +
        '</div>' +
        '<section class="card study"><h2>O que devo estudar agora?</h2>' + studyPlan(an) + '</section>' +
        '<section class="card"><h2>Simulados por nível</h2><p class="sub small">Barra = melhor aproveitamento em cada simulado (com crédito parcial).</p>' + bankRows(s.perBank) + '</section>' +
        '<section class="card"><h2>Histórico</h2><div class="rv-wrap">' + histTable + '</div></section>' +
        method(an) +
        '<p class="note-box small">A preparação estimada é um indicador de estudo, não uma previsão de aprovação. A prova real usa escala de 1 a 1000, com corte em 700, e a conversão não é pública.</p>' +
        '</div>';
    },
  };
})();
