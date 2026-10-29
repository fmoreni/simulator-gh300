// Painel de progresso: indicadores, evolução das tentativas, desempenho por domínio,
// situação de cada simulado e histórico. Gera HTML em string (testável no Node);
// os gráficos são SVG inline com as cores do tema e dicas ao passar o mouse ([data-tip]).
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var esc = GHX.esc;
  var LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];

  function pct(x) { return x == null ? '—' : String(x).replace('.', ',') + '%'; }
  function dateShort(ms) { return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  function dateLong(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function duration(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60);
    return h ? h + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  function bankTitle(id) { var b = GHX.getBank(id); return b ? b.title : id; }
  function langLabel(l) { return l === 'en' ? 'English' : 'Português'; }
  function modeLabel(m) { return m === 'study' ? 'estudo' : 'exame'; }

  function tile(label, value, note) {
    return '<div class="kpi"><div class="kpi-l">' + esc(label) + '</div><div class="kpi-v">' + value + '</div>' +
      (note ? '<div class="kpi-n">' + note + '</div>' : '') + '</div>';
  }

  // Evolução do aproveitamento: uma série, eixo 0–100%, marcador em cada tentativa.
  function trendChart(trend) {
    if (!trend.length) return '<p class="muted">Termine um simulado para ver a evolução.</p>';
    var W = 640, H = 240, L = 40, Rt = 16, T = 14, B = 34;
    var iw = W - L - Rt, ih = H - T - B;
    var n = trend.length;
    var x = function (i) { return L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); };
    var y = function (v) { return T + ih - (v / 100) * ih; };
    var grid = [0, 25, 50, 75, 100].map(function (v) {
      return '<line class="ch-grid" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="ch-ax" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '%</text>';
    }).join('');
    var step = Math.max(1, Math.ceil(n / 8));
    var xl = trend.map(function (p, i) {
      return i % step && i !== n - 1 ? '' : '<text class="ch-ax" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + dateShort(p.at) + '</text>';
    }).join('');
    var path = trend.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.pct).toFixed(1); }).join(' ');
    var colW = n === 1 ? iw : iw / (n - 1);
    var pts = trend.map(function (p, i) {
      var tip = bankTitle(p.bankId) + ' · ' + pct(p.pct) + ' · ' + dateLong(p.at) + ' · ' + modeLabel(p.mode) + ' · ' + langLabel(p.lang);
      return '<g class="ch-pt" data-tip="' + esc(tip) + '" tabindex="0" role="img" aria-label="' + esc(tip) + '">' +
        '<rect class="ch-hit" x="' + (x(i) - colW / 2).toFixed(1) + '" y="' + T + '" width="' + colW.toFixed(1) + '" height="' + ih + '"/>' +
        '<line class="ch-cross" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1) + '" y1="' + T + '" y2="' + (T + ih) + '"/>' +
        '<circle class="ch-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(p.pct).toFixed(1) + '" r="4.5"/></g>';
    }).join('');
    var lastP = trend[n - 1];
    var lastLabel = '<text class="ch-lbl" x="' + Math.min(x(n - 1), W - Rt - 4) + '" y="' + (y(lastP.pct) - 10) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '">' + pct(lastP.pct) + '</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Aproveitamento por tentativa, em ordem cronológica">' +
      grid + xl + (n > 1 ? '<path class="ch-line" d="' + path + '"/>' : '') + pts + lastLabel + '</svg>';
  }

  // Desempenho por domínio: barras horizontais ordenadas do maior para o menor.
  function domainBars(domains, weakest) {
    var rows = domains.filter(function (d) { return d.pct != null; }).slice().sort(function (a, b) { return b.pct - a.pct; });
    if (!rows.length) return '<p class="muted">Ainda sem dados por domínio.</p>';
    return '<ul class="hbars">' + rows.map(function (d) {
      var weak = weakest && weakest.d === d.d;
      var tip = 'Domínio ' + d.d + ' · ' + d.name + ' · ' + pct(d.pct) + ' (' + (Math.round(d.score * 10) / 10) + ' de ' + d.max + ' pontos)';
      return '<li data-tip="' + esc(tip) + '" tabindex="0">' +
        '<span class="hb-l">' + d.d + '. ' + esc(d.short) + (weak ? ' <span class="tag">mais fraco</span>' : '') + '</span>' +
        '<span class="hb-t" aria-hidden="true"><span class="hb-f" style="width:' + Math.max(d.pct, 1) + '%"></span></span>' +
        '<span class="hb-v">' + pct(d.pct) + '</span></li>';
    }).join('') + '</ul>';
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

  function recommendations(s) {
    var out = [];
    if (s.weakest) out.push('Reforce o domínio <strong>' + s.weakest.d + ' · ' + esc(s.weakest.name) + '</strong> (' + pct(s.weakest.pct) + '): faça o Modo estudo e leia as explicações e a documentação das questões erradas.');
    if (s.next) out.push((s.next.attempts ? 'Refaça' : 'Próximo simulado sugerido:') + ' <strong>' + esc(s.next.title) + '</strong>' + (s.next.attempts ? ', seu menor melhor resultado (' + pct(s.next.best) + ').' : '.'));
    if (s.attempts && !s.byLang.en) out.push('Faça pelo menos um simulado em <strong>English</strong>: a prova oficial é em inglês e os termos aparecem como na documentação.');
    if (s.attempts && !s.byMode.exam) out.push('Treine no <strong>Modo exame</strong>, com o cronômetro de 100 minutos, para medir o ritmo.');
    return out.length ? '<ul class="recs">' + out.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '';
  }

  GHX.Dashboard = {
    render: function (s) {
      var head = '<header class="home-h"><div><h1>Painel de progresso</h1><p class="sub">Acompanhe seus resultados nos ' + s.banksTotal + ' simulados, em português e em inglês.</p></div>' +
        '<div class="home-tools"><button class="btn" data-act="home" data-k="dash-home">Voltar ao início</button></div></header>';
      if (!s.attempts) {
        return '<div class="home dash">' + head + '<section class="card empty-dash"><h2>Nenhum simulado finalizado ainda</h2>' +
          '<p>Os indicadores aparecem depois que você terminar o primeiro simulado, no Modo exame ou no Modo estudo.</p>' + recommendations(s) +
          '<div class="actions"><button class="btn primary" data-act="home" data-k="dash-start">Escolher um simulado</button></div></section></div>';
      }
      var kpis = '<section class="kpis" aria-label="Indicadores">' +
        tile('Simulados concluídos', s.banksDone + ' <span class="kpi-of">de ' + s.banksTotal + '</span>') +
        tile('Tentativas', String(s.attempts), s.byMode.exam + ' exame · ' + s.byMode.study + ' estudo<br>' + s.byLang.pt + ' em português · ' + s.byLang.en + ' em inglês') +
        tile('Média geral', pct(s.avg)) +
        tile('Melhor resultado', pct(s.best.pct), esc(bankTitle(s.best.bankId).replace(/ — .*/, ''))) +
        tile('Questões dominadas', s.mastered + ' <span class="kpi-of">de ' + s.itemsTotal + '</span>', 'acertadas por completo ao menos uma vez') +
        tile('Tempo de prática', duration(s.timeMs), 'nas tentativas finalizadas') +
        '</section>';
      var trendTable = '<details class="tview"><summary>Ver como tabela</summary><table class="dom-table"><thead><tr><th>Data</th><th>Simulado</th><th>Modo</th><th>Idioma</th><th class="num">Aproveitamento</th></tr></thead><tbody>' +
        s.trend.map(function (p) { return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td>' + modeLabel(p.mode) + '</td><td>' + langLabel(p.lang) + '</td><td class="num">' + pct(p.pct) + '</td></tr>'; }).join('') +
        '</tbody></table></details>';
      var domTable = '<details class="tview"><summary>Ver como tabela</summary><table class="dom-table"><thead><tr><th>Domínio</th><th class="num">Questões</th><th class="num">Pontos</th><th class="num">Aproveitamento</th></tr></thead><tbody>' +
        s.domains.map(function (d) { return '<tr><td>' + d.d + '. ' + esc(d.name) + '</td><td class="num">' + d.max + '</td><td class="num">' + (Math.round(d.score * 10) / 10) + '</td><td class="num">' + pct(d.pct) + '</td></tr>'; }).join('') +
        '</tbody></table></details>';
      var hist = s.trend.slice().reverse();
      var histTable = '<table class="dom-table hist-table"><thead><tr><th>Data</th><th>Simulado</th><th>Modo</th><th>Idioma</th><th class="num">Tempo</th><th class="num">Aproveitamento</th><th></th></tr></thead><tbody>' +
        hist.slice(0, 50).map(function (p) {
          return '<tr><td>' + dateLong(p.at) + '</td><td>' + esc(bankTitle(p.bankId)) + '</td><td>' + modeLabel(p.mode) + '</td><td>' + langLabel(p.lang) + '</td>' +
            '<td class="num">' + Math.round(p.elapsedMs / 60000) + ' min</td><td class="num"><strong>' + pct(p.pct) + '</strong></td>' +
            '<td><button class="link" data-act="report" data-id="' + esc(p.id) + '">Relatório</button></td></tr>';
        }).join('') + '</tbody></table>';
      return '<div class="home dash">' + head + kpis +
        '<div class="dash-grid">' +
        '<section class="card"><h2>Evolução do aproveitamento</h2><p class="sub small">Cada ponto é uma tentativa finalizada, em ordem cronológica.</p>' + trendChart(s.trend) + trendTable + '</section>' +
        '<section class="card"><h2>Desempenho por domínio</h2><p class="sub small">Soma de todas as tentativas, com crédito parcial.</p>' + domainBars(s.domains, s.weakest) + domTable + '</section>' +
        '</div>' +
        '<section class="card"><h2>Recomendações</h2>' + recommendations(s) + '</section>' +
        '<section class="card"><h2>Simulados por nível</h2><p class="sub small">Barra = melhor aproveitamento em cada simulado.</p>' + bankRows(s.perBank) + '</section>' +
        '<section class="card"><h2>Histórico</h2><div class="rv-wrap">' + histTable + '</div></section>' +
        '<p class="note-box small">O aproveitamento em % não equivale à nota oficial (escala de 1 a 1000, corte em 700); a conversão não é pública.</p>' +
        '</div>';
    },
  };
})();
