// Telas e eventos: início, pré-prova, prova (moldura no estilo do sandbox de exames),
// revisão, pausa, ferramentas e relatório.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  if (typeof document === 'undefined') return;

  var S = GHX.Session, R = GHX.Render, C = GHX.Scoring, esc = GHX.esc;
  var CERT = GHX.CERTS['GH-300'];
  var app = document.getElementById('app');
  var store = GHX.Storage.open();
  var dnd = null;
  var now = function () { return Date.now(); };

  var ui = {
    screen: 'home',
    att: null,
    pre: 0,
    filter: 'all',
    instrOpen: true,
    cs: { open: {}, all: false },
    side: false,
    hideProgress: !!store.pref('hideProgress'),
    hideTime: !!store.pref('hideTime'),
    modal: null,
    reportId: null,
    onlyWrong: false,
    calc: { disp: '0', acc: null, op: null, fresh: true },
  };

  var SIZES = [0.9, 1, 1.15, 1.3];
  var SCHEMES = [
    { id: 'auto', label: 'Padrão do sistema' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
    { id: 'contrast', label: 'Alto contraste' },
  ];

  function applyPrefs() {
    var root = document.documentElement;
    root.setAttribute('data-scheme', store.pref('scheme') || 'auto');
    var fs = store.pref('fs');
    root.style.setProperty('--fs', String(SIZES.indexOf(fs) >= 0 ? fs : 1));
  }

  function bank() { return ui.att ? GHX.getBank(ui.att.bankId) : null; }
  function curItem() { return GHX.getItem(S.currentId(ui.att)); }
  function save() { if (ui.att) store.put(ui.att); }

  function announce(msg) {
    var sr = document.getElementById('sr');
    if (sr) { sr.textContent = ''; setTimeout(function () { sr.textContent = msg; }, 30); }
  }

  // ---------- render raiz com restauração de foco ----------

  function render() {
    var active = document.activeElement;
    var key = active && active.getAttribute && active.getAttribute('data-k');
    var scrollEl = document.querySelector('.q-scroll');
    var scrollTop = scrollEl ? scrollEl.scrollTop : 0;
    var html;
    switch (ui.screen) {
      case 'pre': html = renderPre(); break;
      case 'exam': html = renderExam(); break;
      case 'report': html = renderReport(); break;
      case 'comments': html = renderComments(); break;
      default: html = renderHome();
    }
    app.innerHTML = html + '<div id="sr" class="sr-only" aria-live="polite"></div>';
    app.className = 'scr-' + ui.screen;
    if (dnd) dnd.refresh();
    var sc = document.querySelector('.q-scroll');
    if (sc && ui.keepScroll) sc.scrollTop = scrollTop;
    ui.keepScroll = false;
    var target = key && app.querySelector('[data-k="' + key + '"]');
    if (!target && ui.modal) target = app.querySelector('.modal [data-k]');
    if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
  }

  // ---------- início ----------

  function typeList(b) {
    var st = GHX.bankStats(b);
    return Object.keys(st.types).map(function (t) { return GHX.TYPES[t].label; }).join(' · ');
  }

  function sectionList(b) {
    var secs = GHX.buildSections(b);
    if (secs.length === 1) return 'Seção única com ' + secs[0].items.length + ' questões';
    return secs.map(function (s) {
      var name = s.kind === 'case' ? 'Estudo de caso' : s.kind === 'ps' ? 'Série problema–solução' : 'Questões';
      return name + ' (' + s.items.length + ')';
    }).join(' → ');
  }

  function fmtDate(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function bankCard(b) {
    var st = GHX.bankStats(b);
    var active = store.active(b.id);
    var hist = store.history(b.id);
    var last = hist[0];
    var actions = [];
    if (active) actions.push('<button class="btn primary" data-act="continue" data-bank="' + b.id + '" data-k="cont-' + b.id + '">Continuar (' + (active.mode === 'exam' ? 'exame' : 'estudo') + ')</button>');
    actions.push('<button class="btn' + (active ? '' : ' primary') + '" data-act="start" data-mode="exam" data-bank="' + b.id + '" data-k="exam-' + b.id + '">Modo exame</button>');
    actions.push('<button class="btn" data-act="start" data-mode="study" data-bank="' + b.id + '" data-k="study-' + b.id + '">Modo estudo</button>');
    if (last) actions.push('<button class="btn ghost" data-act="report" data-id="' + last.id + '" data-k="rep-' + b.id + '">Ver relatório</button>');
    if (active) actions.push('<button class="btn ghost" data-act="discard" data-bank="' + b.id + '" data-k="disc-' + b.id + '">Descartar tentativa</button>');
    return '<article class="card bank" data-bank-card="' + b.id + '">' +
      '<header><h3>' + esc(b.title) + '</h3><p class="sub">' + esc(b.subtitle) + '</p></header>' +
      '<p>' + esc(b.blurb) + '</p>' +
      '<dl class="facts">' +
      '<div><dt>Questões</dt><dd>' + st.count + '</dd></div>' +
      '<div><dt>Tempo</dt><dd>' + b.minutes + ' min</dd></div>' +
      '<div><dt>Formato</dt><dd>' + esc(sectionList(b)) + '</dd></div>' +
      '<div class="wide"><dt>Tipos de item</dt><dd>' + esc(typeList(b)) + '</dd></div>' +
      '</dl>' +
      '<div class="actions">' + actions.join('') + '</div>' +
      (hist.length ? '<details class="hist"><summary>Histórico (' + hist.length + ')</summary><ul>' + hist.slice(0, 10).map(function (a) {
        return '<li><button class="link" data-act="report" data-id="' + a.id + '">' + fmtDate(a.finishedAt) + ' · ' + (a.mode === 'exam' ? 'exame' : 'estudo') + ' · <strong>' + a.result.pct + '%</strong></button></li>';
      }).join('') + '</ul></details>' : '') +
      '</article>';
  }

  function renderHome() {
    // Agrupa por nível de dificuldade; bancos sem nível caem nas trilhas antigas.
    var LEVELS = [
      { name: 'Iniciante', note: 'Fundamentos, conceitos essenciais e uso básico.' },
      { name: 'Intermediário', note: 'Cenários reais de desenvolvimento e aplicação prática.' },
      { name: 'Avançado', note: 'Cenários corporativos, governança, arquitetura e escolha da melhor abordagem.' },
    ];
    var all = GHX.listBanks();
    var groups = LEVELS.map(function (l) {
      return { name: l.name, note: l.note, banks: all.filter(function (b) { return b.level === l.name; }) };
    });
    var rest = all.filter(function (b) { return !b.level; });
    if (rest.length) {
      groups.push({ name: 'Formato completo da prova', banks: rest.filter(function (b) { return b.track === 'full'; }) });
      groups.push({ name: 'Treino por domínio', banks: rest.filter(function (b) { return b.track === 'practice'; }) });
    }
    groups = groups.filter(function (g) { return g.banks.length; });
    var extra = !!store.pref('extraTime');
    return '<div class="home">' +
      '<header class="home-h"><div><h1>Sala de prova GH-300</h1>' +
      '<p class="sub">Simulados para o exame ' + esc(CERT.exam) + ' · domínios do guia de estudo oficial (skills measured as of ' + esc(CERT.asOf.split('-').reverse().join('/')) + ')</p></div>' +
      '<div class="home-tools"><button class="btn ghost small" data-act="scheme" data-k="home-scheme">Color Scheme</button></div></header>' +
      (ui.notice ? '<p class="notice" role="status">' + esc(ui.notice) + '</p>' : '') +
      '<p class="disclaimer">Simulador independente, sem vínculo com GitHub, Microsoft ou Pearson VUE. As questões são originais e baseadas na documentação oficial. A moldura segue o <a href="' + esc(CERT.sandbox) + '" target="_blank" rel="noopener">sandbox oficial das provas do GitHub</a>: uma única seção, sem estudo de caso, com questões de múltipla escolha, Drag and Drop, Build List Reorder e Active Screen.</p>' +
      '<label class="extra"><input type="checkbox" data-act="extra" data-k="extra"' + (extra ? ' checked' : '') + '> Acrescentar 30 minutos no modo exame (acomodação para quem não tem inglês como língua nativa)</label>' +
      groups.map(function (g) {
        return '<section data-level="' + esc(g.name) + '"><h2>' + esc(g.name) + '</h2>' + (g.note ? '<p class="sub">' + esc(g.note) + '</p>' : '') +
          '<div class="grid">' + g.banks.map(bankCard).join('') + '</div></section>';
      }).join('') +
      '<section class="note"><h2>Sobre a prova e a pontuação</h2>' +
      '<p>A GH-300 tem <strong>100 minutos</strong>. O número de questões não é publicado na página do exame; o GitHub descreve suas provas como cerca de 60 questões pontuadas mais itens de pré-teste não pontuados, que não dá para identificar. Os simulados completos daqui têm 60 questões.</p>' +
      '<p>Este simulador mostra o <strong>aproveitamento em %</strong>, com crédito parcial nos itens de várias partes. A prova real usa uma <strong>escala de 1 a 1000</strong> e exige <strong>700</strong> para aprovação; a conversão a partir dos acertos <strong>não é pública</strong>. Portanto, 70% aqui não equivale a 700 na prova.</p>' +
      '<p>Domínios e pesos: ' + CERT.domains.map(function (d) { return esc(d.name) + ' (' + d.weight[0] + '–' + d.weight[1] + '%)'; }).join(' · ') + '.</p></section>' +
      (ui.modal ? renderModal() : '') +
      '</div>';
  }

  // ---------- pré-prova (mesma sequência do sandbox oficial do GitHub) ----------

  var PRE = ['Candidate Agreement', 'Overview', 'Information and Instructions', 'Ready to Start?'];

  function renderPre() {
    var b = bank(), a = ui.att, body = '';
    var total = S.total(a);
    var mins = Math.round(a.limitMs / 60000);
    var single = a.sections.length === 1;
    switch (ui.pre) {
      case 0:
        body = '<div class="scrollbox"><p><strong>Na prova real</strong>, você confirma o acordo do candidato das certificações do GitHub: o conteúdo do exame é confidencial, e é proibido copiá-lo ou divulgá-lo, usar outra identidade, receber ajuda, consultar materiais ou dispositivos não autorizados e usar ferramentas de inteligência artificial durante a prova.</p>' +
          '<p><strong>Neste simulador</strong>, que é independente e não tem vínculo com GitHub, Microsoft ou Pearson VUE, você concorda em usá-lo só para estudo. As questões são originais e o resultado não prevê a nota oficial.</p></div>' +
          '<div class="actions pre-agree"><button class="btn link-btn" data-act="pre-decline" data-k="pre-decline">No, I don\'t agree</button>' +
          '<button class="btn primary" data-act="pre-accept" data-k="pre-accept">Yes, I agree</button></div>';
        break;
      case 1:
        body = '<p class="pre-exam">Exam GH-300: ' + esc(b.title) + '</p>' +
          '<h2>Welcome!</h2><dl class="pre-facts">' +
          '<div><dt>Exam Time:</dt><dd>' + mins + ' minutes' + (a.extraTime ? ' (inclui +30 minutos de acomodação)' : '') + '</dd></div>' +
          '<div><dt>Total Questions:</dt><dd>' + total + '</dd></div>' +
          '<div><dt>Minimum Score Required To Pass:</dt><dd>700 (escala de 1 a 1000 na prova real)</dd></div></dl>' +
          '<p class="small muted">Neste simulador, o resultado sai em aproveitamento %, com crédito parcial.</p>';
        break;
      case 2:
        body = '<p class="pre-exam">Exam GH-300: ' + esc(b.title) + '</p>' +
          '<h3>Question Format and Types</h3><p>A prova pode ter vários tipos de questão: múltipla escolha (uma ou várias respostas; o enunciado diz quantas), Drag and Drop, Build List Reorder e Active Screen. O botão <strong>Help</strong> explica o tipo da questão atual.</p>' +
          '<h3>Timing</h3><p>O tempo restante aparece no canto superior direito. Você pode ocultar o relógio e mostrá-lo de novo a qualquer momento. Use o tempo como quiser entre as questões.</p>' +
          '<h3>Unscheduled Breaks</h3><p>Você pode fazer pausas (<strong>Take a Break</strong>) quantas vezes quiser. <strong>O cronômetro continua correndo durante a pausa</strong>, e depois dela você não pode voltar a nenhuma questão exibida antes. Se o tempo acabar durante a pausa, a prova é corrigida com o que foi respondido.</p>' +
          '<h3>Reviewing Items Later</h3><p>Marque <strong>Review later</strong> nas questões que quer rever. No fim, a tela <strong>Question Review</strong> lista todas as questões, com filtros All, Answered, Unanswered e For Review.</p>' +
          '<h3>Leaving Feedback on Questions</h3><p>Marque <strong>Leave Feedback</strong> para comentar a questão depois de terminar a prova. O tempo dos comentários é separado do tempo da prova.</p>' +
          '<h3>Keyboard Shortcuts</h3><p>Arrastar e soltar funciona com mouse, caneta e toque. Pelo teclado: <kbd>Tab</kbd> até o item, <kbd>Enter</kbd>/<kbd>Espaço</kbd> para pegar, setas para escolher o destino, <kbd>Enter</kbd> para soltar, <kbd>Esc</kbd> para cancelar e <kbd>Delete</kbd> para remover.</p>' +
          '<h3>Viewing Content</h3><p>Role a área da questão para ler todo o enunciado e todas as alternativas antes de responder.</p>';
        break;
      case 3:
        body = '<p class="pre-exam">Exam GH-300: ' + esc(b.title) + '</p><dl class="pre-facts">' +
          '<div><dt>Exam Time:</dt><dd>' + mins + ' minutes</dd></div>' +
          '<div><dt>Total Questions:</dt><dd>' + total + '</dd></div></dl>' +
          (single ? '<p>Todas as questões estão em uma única seção. Você pode navegar livremente entre elas até clicar em <strong>Finish</strong>, exceto nas questões travadas por uma pausa.</p>'
            : '<p><strong>Note:</strong> as questões estão agrupadas em seções. Depois de concluir uma seção, você não pode voltar a ela.</p>') +
          '<p>Ao clicar em <strong>Start</strong>, o cronômetro começa a contar.</p>';
        break;
    }
    var next = ui.pre === 3 ? '<button class="btn primary nav-btn" data-act="pre-start" data-k="pre-start">Start</button>'
      : ui.pre > 0 ? '<button class="btn primary nav-btn" data-act="pre-next" data-k="pre-next">Next ›</button>' : '';
    return '<div class="pre"><div class="pre-card"><h1>' + esc(PRE[ui.pre]) + '</h1>' + body + '</div>' +
      '<footer class="pre-foot">' + (ui.pre > 1 ? '<button class="btn primary nav-btn" data-act="pre-prev" data-k="pre-prev">‹ Previous</button>' : '') + next + '</footer>' +
      '<button class="btn ghost small pre-exit" data-act="exit" data-k="pre-exit">Exit simulator</button></div>';
  }

  // ---------- prova ----------

  function hms(ms) {
    if (!isFinite(ms)) return '--';
    var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(h) + ' : ' + p(m) + ' : ' + p(x);
  }

  function answeredCount() {
    var a = ui.att, n = 0;
    a.sections.forEach(function (s) { s.items.forEach(function (id) { if (C.isAnswered(GHX.getItem(id), a.answers[id])) n++; }); });
    return n;
  }

  function flaggedCount() { return Object.keys(ui.att.flags).length; }

  var ICONS = {
    expand: 'M6 6l6 6-6 6M13 6l6 6-6 6',
    collapse: 'M18 6l-6 6 6 6M11 6l-6 6 6 6',
    details: 'M4 4h10l4 4v12H4zM8 12h8M8 16h8M8 8h4',
    review: 'M4 5h16v14H4zM7 9h2M11 9h6M7 13h2M11 13h6',
    progress: 'M12 3a9 9 0 1 0 9 9M8 12l3 3 5-6',
    break: 'M8 5v14M16 5v14',
    calc: 'M5 3h14v18H5zM8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01',
    scheme: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
    text: 'M4 20l5-14 5 14M6 15h6M16 20l3-8 3 8M17 18h4',
    exit: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  };
  function icon(name) {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
  }

  function sideBtn(act, ic, label, extra) {
    return '<button class="side-btn" data-act="' + act + '" data-k="side-' + act + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"' + (extra || '') + '>' + icon(ic) + '<span class="side-lbl">' + esc(label) + '</span></button>';
  }

  // Mesma ordem do sandbox: Question Details, Review, Progress | Take a Break, Calculator, Color Scheme, Help.
  function renderSide() {
    var exam = S.isExam(ui.att);
    return '<nav class="side' + (ui.side ? ' open' : '') + '" aria-label="Toolbar">' +
      sideBtn('side', ui.side ? 'collapse' : 'expand', ui.side ? 'Collapse Toolbar' : 'Toggle Toolbar', ' aria-expanded="' + ui.side + '"') +
      sideBtn('details', 'details', 'Question Details') +
      sideBtn('review', 'review', 'Review') +
      sideBtn('progress', 'progress', 'Progress') +
      '<hr class="side-sep">' +
      (exam ? sideBtn('break', 'break', 'Take a Break') : '') +
      sideBtn('calc', 'calc', 'Calculator') +
      sideBtn('scheme', 'scheme', 'Color Scheme') +
      sideBtn('help', 'help', 'Help') +
      '<span class="side-gap"></span>' +
      sideBtn('textsize', 'text', 'Text Size') +
      sideBtn('exit', 'exit', 'Exit simulator') +
      '</nav>';
  }

  // Chave liga/desliga, como no sandbox, para ocultar PROGRESS e TIME REMAINING.
  function toggle(act, hidden, label) {
    return '<button class="switch" role="switch" data-act="' + act + '" data-k="' + act + '" aria-checked="' + !hidden + '" aria-label="' + (hidden ? 'Mostrar ' : 'Ocultar ') + label + '"><span></span></button>';
  }

  function renderHeader() {
    var a = ui.att, sec = S.section(a), total = S.total(a), done = answeredCount(), flagged = flaggedCount();
    var title = a.view === 'review' ? 'Question Review' :
      sec.kind === 'case' ? 'Case Study Question ' + (a.p + 1) + ' of ' + sec.items.length : 'Question ' + S.number(a);
    var timer = S.isTimed(a)
      ? '<div class="hblock hright"><div class="hlabel">TIME REMAINING ' + toggle('hide-time', ui.hideTime, 'tempo') + '</div>' +
        '<div class="hval clock mono" id="timer"' + (ui.hideTime ? ' hidden' : '') + '>' + hms(S.remainingMs(a, now())) + '</div></div>'
      : '<div class="hblock hright"><div class="hlabel">MODE</div><div class="hval">Modo estudo</div></div>';
    return '<header class="xh">' +
      '<div class="xh-title"><h1 data-k="q-title" tabindex="-1">' + esc(title) + '</h1><span class="exam-name">' + esc(bank().title) + '</span></div>' +
      '<div class="hblock hcenter"><div class="hlabel">PROGRESS ' + toggle('hide-progress', ui.hideProgress, 'progresso') + '</div>' +
      '<div class="hprog"' + (ui.hideProgress ? ' hidden' : '') + '>' +
      '<div><span class="tiny">Question Progress (' + done + '/' + total + ')</span><span class="pbar" role="progressbar" aria-label="Question Progress" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (100 * done / total).toFixed(1) + '%"></span></span></div>' +
      '<div><span class="tiny">Review</span><span class="pbar rbar" role="progressbar" aria-label="Review" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + flagged + '"><span style="width:' + (100 * flagged / total).toFixed(1) + '%"></span></span></div>' +
      '</div></div>' +
      timer + '</header>';
  }

  function renderQuestion() {
    var a = ui.att, it = curItem(), id = it.id;
    var isLocked = S.isLocked(a, id);
    var locked = isLocked || !S.canAnswer(a, id) && S.isExam(a);
    var checked = !S.isExam(a) && !!a.checked[id];
    var html = R.item(it, { resp: a.answers[id], shuffle: a.shuffle[id], checked: checked, locked: locked || checked });
    var tools = '<div class="qtools">' +
      '<div class="qrow"><button class="btn pill" data-act="reset" data-k="reset"' + (isLocked ? ' disabled' : '') + '><span aria-hidden="true">↺</span> Reset Answer</button>' +
      (!S.isExam(a) ? '<button class="btn small primary" data-act="check" data-k="check"' + (checked ? ' disabled' : '') + '>Corrigir</button>' : '') + '</div>' +
      '<div class="qrow"><label class="flag"><input type="checkbox" data-act="flag" data-k="flag"' + (a.flags[id] ? ' checked' : '') + (isLocked ? ' disabled' : '') + '> Review later</label>' +
      '<label class="flag"><input type="checkbox" data-act="fbflag" data-k="fbflag"' + (a.fb && a.fb[id] ? ' checked' : '') + (isLocked ? ' disabled' : '') + '> Leave Feedback</label></div>' +
      '</div>';
    var meta = !S.isExam(a) ? '<p class="meta small">Domínio ' + it.d + ' · ' + esc(CERT.domains[it.d - 1].short) + ' · ' + esc(GHX.TYPES[it.type].label) + '</p>' : '';
    var lockNote = isLocked ? '<p class="locked-note">This item is locked. Você não pode mais alterar esta resposta.</p>' : '';
    return '<div class="qbox">' + meta + lockNote + html + tools + '</div>';
  }

  function renderReview() {
    var a = ui.att, rows = S.reviewRows(a, ui.filter);
    var count = function (f) { return S.reviewRows(a, f).length; };
    var filters = [['all', 'All'], ['answered', 'Answered'], ['unanswered', 'Unanswered'], ['review', 'For Review']];
    var last = S.isExam(a) ? S.isLastSection(a) : true;
    var preview = function (id) {
      var q = String(GHX.getItem(id).q).replace(/[`*]/g, '').replace(/\s+/g, ' ');
      return esc(q.length > 170 ? q.slice(0, 170) + '…' : q);
    };
    var check = function (on) { return on ? '<span class="tick" aria-label="sim">✓</span>' : ''; };
    return '<div class="review">' +
      '<section class="rv-instr' + (ui.instrOpen ? ' open' : '') + '"><div class="rv-instr-h"><h2>Review Screen Instructions</h2>' +
      '<button class="btn link-btn small" data-act="rv-instr" data-k="rv-instr" aria-expanded="' + ui.instrOpen + '">' + (ui.instrOpen ? 'Collapse' : 'Expand') + '</button></div>' +
      (ui.instrOpen ? '<ul><li>Abaixo está a tabela com todas as questões' + (a.sections.length > 1 && S.isExam(a) ? ' desta seção' : '') + '.</li>' +
        '<li>Selecione uma questão na tabela para começar a percorrer as questões.</li>' +
        '<li>Para voltar a esta tela, use o botão <strong>Exit Review Mode</strong>.</li>' +
        '<li>Use o botão <strong>' + (last ? 'Finish' : 'Next Section') + '</strong> para ' + (last ? 'concluir a prova' : 'ir para a próxima seção') + '.</li></ul>' : '') +
      '</section>' +
      '<div class="rv-filters" role="radiogroup" aria-label="Filter By"><span class="rv-fl">Filter By:</span>' + filters.map(function (f) {
        var n = count(f[0]);
        return '<label class="rv-radio' + (n ? '' : ' dim') + '"><input type="radio" name="rvf" data-act="rv-filter" data-f="' + f[0] + '" data-k="rvf-' + f[0] + '"' + (ui.filter === f[0] ? ' checked' : '') + (n || f[0] === 'all' ? '' : ' disabled') + '> ' + f[1] + ' (' + n + ')</label>';
      }).join('') + '</div>' +
      '<div class="rv-wrap"><table class="rv-table"><thead><tr><th class="rv-n"></th><th>Questions</th><th class="rv-c">Answered</th><th class="rv-c">Unanswered</th><th class="rv-c">For Review</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        var cell = r.locked ? '<span class="muted">' + preview(r.id) + '</span>'
          : '<button class="link rv-q" data-act="rv-go" data-s="' + r.s + '" data-p="' + r.p + '" data-k="rv-' + r.n + '">' + preview(r.id) + '</button>';
        return '<tr class="' + (r.locked ? 'locked' : '') + '"><td class="rv-n">' + r.n + '</td><td>' + cell + (r.locked ? ' <span class="small muted">(locked)</span>' : '') + '</td>' +
          '<td class="rv-c">' + check(r.answered) + '</td><td class="rv-c">' + check(!r.answered) + '</td><td class="rv-c">' + check(r.flagged) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">Nenhuma questão neste filtro.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="actions rv-actions">' +
      '<button class="btn primary nav-btn" data-act="' + (last ? 'finish' : 'next-section') + '" data-k="rv-end">' + (last ? 'Finish' : 'Next Section') + '</button>' +
      '</div></div>';
  }

  function renderExam() {
    var a = ui.att, sec = S.section(a), review = a.view === 'review';
    var main;
    if (review) main = '<div class="q-scroll">' + renderReview() + '</div>';
    else if (sec.kind === 'case') {
      var cs = bank().cases.filter(function (c) { return c.id === sec.caseId; })[0];
      main = '<div class="split"><div class="case-pane q-scroll-l">' + R.caseStudy(cs, ui.cs) + '</div>' +
        '<div class="q-scroll">' + renderQuestion() + '</div></div>';
    } else main = '<div class="q-scroll">' + renderQuestion() + '</div>';
    var foot = review ? '' : '<footer class="xf">' +
      '<button class="btn primary nav-btn" data-act="prev" data-k="prev"' + (S.canPrev(a) ? '' : ' disabled') + '>‹ Previous</button>' +
      '<button class="btn primary nav-btn" data-act="next" data-k="next">Next ›</button>' +
      (a.reviewMode ? '<button class="btn nav-btn" data-act="rv-mode-exit" data-k="rv-mode-exit">Exit Review Mode</button>' : '') +
      '</footer>';
    return '<div class="exam">' + renderSide() +
      '<div class="xmain">' + renderHeader() + '<main class="xbody" aria-label="Question">' + main + '</main>' + foot + '</div>' +
      (a.status === 'break' ? renderBreak() : '') +
      (ui.modal ? renderModal() : '') + '</div>';
  }

  // Tela de pausa: o cronômetro continua (como na prova real).
  function renderBreak() {
    var a = ui.att;
    var left = S.total(a) - Object.keys(a.seen).length;
    return '<div class="overlay break" role="dialog" aria-modal="true" aria-labelledby="brk-h"><div class="modal">' +
      '<h2 id="brk-h">Your break has started</h2>' +
      '<p><strong>O cronômetro da prova continua correndo durante a pausa.</strong></p>' +
      '<p class="brk-clock mono" id="timer-break">' + hms(S.remainingMs(a, now())) + '</p>' +
      '<p>Questões restantes ainda não exibidas: <strong>' + left + '</strong>. As questões exibidas antes da pausa estão travadas.</p>' +
      '<div class="actions"><button class="btn primary" data-act="break-end" data-k="break-end">End Break</button></div></div></div>';
  }

  // ---------- comentários (depois da prova, tempo separado) ----------

  function renderComments() {
    var a = ui.att;
    var ids = Object.keys(a.fb || {});
    var n = 0, idx = {};
    a.sections.forEach(function (s) { s.items.forEach(function (id) { idx[id] = ++n; }); });
    ids.sort(function (x, y) { return idx[x] - idx[y]; });
    return '<div class="pre"><div class="pre-card"><h1>Item Comments</h1>' +
      '<p>Você marcou <strong>Leave Feedback</strong> nestas questões. Escreva os comentários abaixo; este tempo é separado do tempo da prova.</p>' +
      ids.map(function (id) {
        var q = String(GHX.getItem(id).q).replace(/[`*]/g, '');
        return '<div class="cmt"><label for="cmt-' + esc(id) + '"><strong>Question ' + idx[id] + '</strong> — ' + esc(q.length > 140 ? q.slice(0, 140) + '…' : q) + '</label>' +
          '<textarea id="cmt-' + esc(id) + '" class="fb-text" data-cmt="' + esc(id) + '" rows="3">' + esc((a.notes && a.notes[id]) || '') + '</textarea></div>';
      }).join('') +
      '</div><footer class="pre-foot"><button class="btn primary nav-btn" data-act="comments-done" data-k="comments-done">Done</button></footer></div>';
  }

  // ---------- modais ----------

  function modal(title, body, actions, cls) {
    return '<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="m-h"><div class="modal ' + (cls || '') + '">' +
      '<h2 id="m-h">' + esc(title) + '</h2>' + body +
      '<div class="actions">' + actions + '</div></div></div>';
  }

  function okBtn(label) { return '<button class="btn primary" data-act="modal-close" data-k="m-close">' + esc(label || 'Close') + '</button>'; }

  function renderModal() {
    var m = ui.modal, a = ui.att;
    switch (m.kind) {
      case 'confirm':
        return modal(m.title, '<p>' + m.text + '</p>',
          '<button class="btn primary" data-act="modal-yes" data-k="m-yes">Yes</button><button class="btn" data-act="modal-close" data-k="m-no">No</button>');
      case 'incomplete':
        return modal('Incomplete Question Warning',
          '<p>You have not selected an answer for this question or have not selected enough answers. Select OK to proceed to the next question although this question is incomplete. Select CANCEL to remain on the question.</p>' +
          '<p class="small muted">Você respondeu ' + m.given + ' de ' + m.expected + ' parte(s).</p>',
          '<button class="btn" data-act="modal-close" data-k="m-no">Cancel</button><button class="btn primary" data-act="modal-yes" data-k="m-yes">OK</button>');
      case 'details': {
        var it = curItem();
        return modal('Question Details', '<dl class="facts">' +
          '<div><dt>Question</dt><dd>' + S.number(a) + ' of ' + S.total(a) + '</dd></div>' +
          '<div><dt>Type</dt><dd>' + esc(GHX.TYPES[it.type].label) + '</dd></div>' +
          '<div><dt>Status</dt><dd>' + (C.isComplete(it, a.answers[it.id]) ? 'Answered' : C.isAnswered(it, a.answers[it.id]) ? 'Incomplete' : 'Unanswered') + (a.flags[it.id] ? ' · For Review' : '') + '</dd></div>' +
          (!S.isExam(a) ? '<div class="wide"><dt>Domínio</dt><dd>' + esc(CERT.domains[it.d - 1].name) + '</dd></div>' : '') +
          '</dl><p class="small">' + esc(R.instruction(it)) + '</p>', okBtn());
      }
      case 'progress': {
        var rows = a.sections.map(function (s, i) {
          var n = s.items.filter(function (id) { return C.isAnswered(GHX.getItem(id), a.answers[id]); }).length;
          var cur = i === a.s ? ' (atual)' : '';
          var st = s.locked ? ' · travada' : '';
          return '<li>' + esc(s.kind === 'case' ? 'Estudo de caso: ' + s.title : s.kind === 'ps' ? 'Série problema–solução' : 'Questões') + cur + st + ' — ' + n + ' de ' + s.items.length + ' respondidas</li>';
        }).join('');
        return modal('Progress', '<p>' + answeredCount() + ' de ' + S.total(a) + ' questões respondidas · ' + flaggedCount() + ' marcadas para revisão.</p>' + (a.sections.length > 1 ? '<ul>' + rows + '</ul>' : '') +
          (S.isTimed(a) ? '<p>Tempo restante: <span class="mono">' + hms(S.remainingMs(a, now())) + '</span></p>' : ''), okBtn());
      }
      case 'break': {
        var sum = S.breakSummary(a);
        return modal('Take a Break', '<p>Você viu <strong>' + sum.seen + '</strong> questão(ões) desde a última pausa; <strong>' + sum.unanswered + '</strong> estão sem resposta e <strong>' + sum.flagged + '</strong> estão marcadas para revisão.</p>' +
          '<p>Responda ou revise essas questões antes de começar a pausa. <strong>Depois da pausa, você não poderá voltar a elas.</strong></p>' +
          '<p><strong>O cronômetro da prova continua correndo durante a pausa.</strong></p>',
          '<button class="btn" data-act="modal-close" data-k="m-no">Return to Exam</button><button class="btn primary" data-act="modal-yes" data-k="m-yes">Start Break</button>');
      }
      case 'calc': {
        var keys = ['C', '±', '←', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];
        return modal('Calculator', '<div class="calc"><output class="calc-disp mono" aria-live="polite">' + esc(ui.calc.disp) + '</output><div class="calc-keys">' +
          keys.map(function (k) { return '<button class="btn calc-k' + (k === '=' ? ' primary wide' : '') + '" data-act="calc-key" data-key="' + k + '" data-k="ck-' + k + '">' + k + '</button>'; }).join('') +
          '</div></div>', okBtn(), 'narrow');
      }
      case 'scheme': {
        var cur = store.pref('scheme') || 'auto';
        return modal('Color Scheme', '<div class="opts" role="radiogroup">' + SCHEMES.map(function (s) {
          return '<label class="opt' + (cur === s.id ? ' sel' : '') + '"><input type="radio" name="scheme" data-act="scheme-set" data-v="' + s.id + '" data-k="sch-' + s.id + '"' + (cur === s.id ? ' checked' : '') + '><span>' + esc(s.label) + '</span></label>';
        }).join('') + '</div>', okBtn(), 'narrow');
      }
      case 'textsize': {
        var fs = store.pref('fs') || 1;
        return modal('Text Size', '<div class="opts" role="radiogroup">' + SIZES.map(function (s) {
          return '<label class="opt' + (fs === s ? ' sel' : '') + '"><input type="radio" name="fs" data-act="fs-set" data-v="' + s + '" data-k="fs-' + s + '"' + (fs === s ? ' checked' : '') + '><span style="font-size:' + s + 'em">' + Math.round(s * 100) + '%</span></label>';
        }).join('') + '</div>', okBtn(), 'narrow');
      }
      case 'help': {
        var hit = a && a.view !== 'review' ? curItem() : null;
        var TYPE_HELP = {
          single: 'Multiple choice, select one: há várias alternativas e uma resposta correta. Selecione o botão de opção ao lado da resposta.',
          multi: 'Multiple choice, multiple select: há várias respostas corretas e o enunciado diz quantas selecionar. Marque as caixas de seleção.',
          match: 'Drag and Drop: arraste os itens da esquerda para os alvos da Answer Area. A posição em que você solta cada item é a resposta.',
          inline: 'Drag and Drop: arraste os valores para as lacunas do código ou da configuração na Answer Area.',
          order: 'Build List Reorder: mova as ações para a Answer Area e ordene-as de cima para baixo. Pode haver mais ações do que posições.',
          dropdown: 'Active Screen: escolha uma opção em cada lista da tela ou da frase para completar a resposta.',
        };
        return modal('Help', (hit && TYPE_HELP[hit.type] ? '<p><strong>' + esc(GHX.TYPES[hit.type].label) + '.</strong> ' + esc(TYPE_HELP[hit.type]) + '</p>' : '') +
          '<ul class="instr-list">' +
          '<li><strong>Previous/Next</strong> navegam entre as questões. Depois da última, abre a tela <strong>Question Review</strong>.</li>' +
          '<li><strong>Review later</strong> marca a questão para revisão; <strong>Leave Feedback</strong> marca para comentar depois da prova.</li>' +
          '<li><strong>Reset Answer</strong> limpa a resposta da questão atual.</li>' +
          '<li>Arrastar e soltar: mouse, caneta ou toque (também dá para tocar no item e depois no destino). Pelo teclado: Enter/Espaço pega, setas escolhem o destino, Enter solta, Esc cancela e Delete remove.</li>' +
          '<li><strong>Take a Break</strong>: o cronômetro continua correndo, e as questões já exibidas ficam travadas.</li>' +
          '<li>As chaves ao lado de PROGRESS e TIME REMAINING ocultam ou mostram essas informações.</li>' +
          '<li><strong>Text Size</strong> e <strong>Exit simulator</strong> são recursos do simulador e não existem na prova real.</li></ul>', okBtn());
      }
      case 'exit':
        return modal('Exit simulator', '<p>Sair do simulador? A tentativa fica salva e pode ser retomada pelo botão <strong>Continuar</strong>. Este recurso não existe na prova real; aqui, o tempo fora do simulador não é contado.</p>',
          '<button class="btn primary" data-act="modal-yes" data-k="m-yes">Yes</button><button class="btn" data-act="modal-close" data-k="m-no">No</button>');
    }
    return '';
  }

  // ---------- relatório ----------

  function renderReport() {
    var a = store.get(ui.reportId);
    if (!a || !a.result) { ui.screen = 'home'; return renderHome(); }
    var b = GHX.getBank(a.bankId), res = a.result;
    var minutes = Math.round(a.elapsedMs / 60000);
    var reason = a.endReason === 'time' ? 'Tempo esgotado' : 'Finalizada pelo candidato';
    var doms = res.domains.map(function (d) {
      var pct = d.pct == null ? '—' : d.pct + '%';
      return '<tr><td>' + esc(d.name) + '<div class="small muted">' + esc(d.short) + '</div></td><td class="num">' + d.max + '</td><td class="num">' + (Math.round(d.score * 10) / 10) + '</td>' +
        '<td><span class="dbar"><span style="width:' + (d.pct || 0) + '%"></span></span> <strong>' + pct + '</strong></td></tr>';
    }).join('');
    var n = 0;
    var items = [];
    a.sections.forEach(function (s) {
      s.items.forEach(function (id) {
        var it = GHX.getItem(id);
        if (!it) return; // questão removida em uma atualização do simulado
        n++;
        var sc = C.score(it, a.answers[id]);
        if (ui.onlyWrong && sc === 1) return;
        var cls = sc === 1 ? 'ok' : sc > 0 ? 'part' : 'bad';
        items.push('<article class="rep-item ' + cls + '" id="ri-' + esc(id) + '">' +
          '<header><span class="badge ' + cls + '">' + Math.round(sc * 100) + '%</span> <strong>Questão ' + n + '</strong> · ' +
          esc(CERT.domains[it.d - 1].short) + ' · ' + esc(GHX.TYPES[it.type].label) + (s.kind === 'case' ? ' · Estudo de caso: ' + esc(s.title) : '') + (a.flags[id] ? ' · ⚑' : '') + '</header>' +
          '<div class="stem">' + R.md(it.q) + (it.ex ? '<pre class="code">' + esc(it.ex) + '</pre>' : '') +
          (it.type === 'ps' ? '<p><strong>Solução:</strong> ' + R.inline(it.sol) + '</p>' : '') +
          (it.code && it.type !== 'inline' && it.type !== 'dropdown' ? '' : '') + '</div>' +
          R.feedback(it, a.answers[id]) +
          (a.notes && a.notes[id] ? '<p class="small"><strong>Seu comentário:</strong> ' + esc(a.notes[id]) + '</p>' : '') +
          '</article>');
      });
    });
    return '<div class="report">' +
      '<header class="rep-h"><div><h1>Relatório</h1><p class="sub">' + esc(b.title) + ' · ' + (a.mode === 'exam' ? 'modo exame' : 'modo estudo') + ' · ' + fmtDate(a.finishedAt) + '</p></div>' +
      '<button class="btn" data-act="home" data-k="rep-home">Voltar ao início</button></header>' +
      '<section class="rep-score"><div class="big-pct" data-pct="' + res.pct + '">' + res.pct + '%</div><div>' +
      '<p><strong>Aproveitamento</strong>: ' + (Math.round(res.score * 10) / 10) + ' de ' + res.max + ' pontos, com crédito parcial por parte.</p>' +
      '<p class="small">' + reason + ' · tempo usado: ' + minutes + ' min' + (a.extraTime ? ' (com +30 min)' : '') + (a.breaks ? ' · pausas: ' + a.breaks : '') + '</p>' +
      '<p class="note-box small">A prova real usa uma nota escalonada de <strong>1 a 1000</strong>, com corte em <strong>700</strong>. A conversão de acertos para essa escala <strong>não é pública</strong>, então este percentual não é uma previsão da nota oficial.</p>' +
      '</div></section>' +
      '<section><h2>Desempenho por domínio</h2><table class="dom-table"><thead><tr><th>Domínio</th><th>Questões</th><th>Pontos</th><th>Aproveitamento</th></tr></thead><tbody>' + doms + '</tbody></table></section>' +
      '<section><div class="rep-list-h"><h2>Questões</h2><label><input type="checkbox" data-act="only-wrong" data-k="only-wrong"' + (ui.onlyWrong ? ' checked' : '') + '> Mostrar só erradas e parciais</label></div>' +
      (items.length ? items.join('') : '<p class="muted">Nenhuma questão neste filtro.</p>') + '</section></div>';
  }

  // ---------- ações ----------

  function startAttempt(bankId, mode) {
    var b = GHX.getBank(bankId);
    store.discard(bankId);
    var att = S.create(b, { mode: mode, now: now(), extraTime: mode === 'exam' && !!store.pref('extraTime') });
    att.notes = {};
    ui.att = att;
    ui.cs = { open: {}, all: false };
    ui.filter = 'all';
    ui.modal = null;
    if (mode === 'exam') { ui.screen = 'pre'; ui.pre = 0; }
    else { S.start(att, now()); ui.screen = 'exam'; }
    store.put(att);
    store.pref('current', att.id);
    render();
  }

  function resume(att) {
    ui.att = att;
    if (!att.notes) att.notes = {};
    ui.modal = null;
    ui.cs = { open: {}, all: false };
    if (att.status === 'ready') { ui.screen = 'pre'; ui.pre = 0; }
    else { S.resumeAfterReload(att, now()); ui.screen = 'exam'; }
    store.pref('current', att.id);
    save();
    render();
  }

  function showReport(id) {
    ui.reportId = id;
    ui.screen = 'report';
    ui.att = null;
    ui.modal = null;
    store.pref('current', null);
    render();
    window.scrollTo(0, 0);
  }

  // Depois do Finish, se houver questões marcadas com Leave Feedback, abre a tela de comentários.
  function finishAttempt(reason) {
    var a = ui.att;
    S.finish(a, now(), reason);
    save();
    if (a.fb && Object.keys(a.fb).length) { ui.screen = 'comments'; ui.modal = null; render(); window.scrollTo(0, 0); }
    else showReport(a.id);
  }

  function setAnswer(action) {
    var a = ui.att, it = curItem();
    if (!S.canAnswer(a, it.id)) return;
    var next = R.update(it, a.answers[it.id], action);
    S.answer(a, it.id, next);
    save();
    ui.keepScroll = true;
    render();
  }

  function goNext(force) {
    var a = ui.att, it = curItem(), r = a.answers[it.id];
    // Como no sandbox: avisa sempre que a questão estiver sem resposta ou com respostas a menos.
    if (!force && S.isExam(a) && !S.isLocked(a, it.id) && !C.isComplete(it, r)) {
      ui.modal = { kind: 'incomplete', given: C.givenParts(it, r), expected: C.expectedParts(it), then: 'next' };
      render();
      return;
    }
    var res = S.next(a);
    if (res.end) { ui.filter = 'all'; S.openReview(a); }
    save();
    render();
    focusTitle();
  }

  function focusTitle() {
    var h = app.querySelector('[data-k="q-title"]');
    if (h && !ui.modal) h.focus({ preventScroll: true });
  }

  function confirmEnd(kind) {
    var a = ui.att;
    var text = kind === 'finish'
      ? 'Ao finalizar, a prova será encerrada e você não poderá alterar nenhuma resposta. ' + (S.reviewRows(a, 'unanswered').length ? 'Ainda há questões sem resposta nesta seção. ' : '') + 'Are you sure you want to finish?'
      : 'Depois de ir para a próxima seção, você não poderá voltar às questões desta seção. Are you sure?';
    ui.modal = { kind: 'confirm', title: 'Are you sure?', text: text, then: kind };
    render();
  }

  function modalYes() {
    var m = ui.modal, a = ui.att;
    ui.modal = null;
    switch (m.kind) {
      case 'incomplete': goNext(true); return;
      case 'break': S.takeBreak(a, now()); save(); render(); return;
      case 'exit':
        if (a) { S.tick(a, now()); a.since = null; save(); }
        ui.att = null;
        ui.screen = 'home';
        store.pref('current', null);
        render();
        return;
      case 'confirm':
        if (m.then === 'finish') { finishAttempt('submitted'); return; }
        if (m.then === 'next-section') {
          S.nextSection(a, now());
          if (a.status === 'finished') { save(); showReport(a.id); return; }
          ui.cs = { open: {}, all: false };
          ui.filter = 'all';
          save();
          render();
          focusTitle();
          return;
        }
        if (m.then === 'discard') { store.discard(m.bank); render(); return; }
    }
    render();
  }

  function calcKey(k) {
    var c = ui.calc;
    var val = function () { return parseFloat(c.disp) || 0; };
    var apply = function (x, y, op) {
      switch (op) {
        case '+': return x + y;
        case '−': return x - y;
        case '×': return x * y;
        case '÷': return y === 0 ? NaN : x / y;
      }
      return y;
    };
    var show = function (n) { c.disp = isFinite(n) ? String(Math.round(n * 1e10) / 1e10) : 'Error'; };
    if (/^[0-9]$/.test(k)) { c.disp = c.fresh || c.disp === '0' || c.disp === 'Error' ? k : c.disp + k; c.fresh = false; }
    else if (k === '.') { if (c.fresh) { c.disp = '0.'; c.fresh = false; } else if (c.disp.indexOf('.') < 0) c.disp += '.'; }
    else if (k === 'C') { ui.calc = { disp: '0', acc: null, op: null, fresh: true }; }
    else if (k === '±') { show(-val()); }
    else if (k === '←') { c.disp = c.fresh || c.disp.length <= 1 ? '0' : c.disp.slice(0, -1); }
    else if (k === '=') { if (c.op) { show(apply(c.acc, val(), c.op)); c.acc = null; c.op = null; c.fresh = true; } }
    else {
      if (c.op && !c.fresh) show(apply(c.acc, val(), c.op));
      c.acc = val(); c.op = k; c.fresh = true;
    }
    render();
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || !app.contains(el) || el.disabled) return;
    var act = el.getAttribute('data-act');
    var a = ui.att;
    // Inputs são tratados no evento change.
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    switch (act) {
      case 'start': startAttempt(el.getAttribute('data-bank'), el.getAttribute('data-mode')); break;
      case 'continue': { var at = store.active(el.getAttribute('data-bank')); if (at) resume(at); break; }
      case 'discard': ui.modal = { kind: 'confirm', title: 'Descartar tentativa', text: 'Descartar a tentativa em andamento? Esta ação não pode ser desfeita.', then: 'discard', bank: el.getAttribute('data-bank') }; render(); break;
      case 'report': showReport(el.getAttribute('data-id')); break;
      case 'home': ui.screen = 'home'; ui.reportId = null; render(); break;
      case 'pre-accept': ui.pre = 1; render(); break;
      case 'pre-decline': ui.modal = null; store.discard(a.bankId); ui.att = null; ui.screen = 'home'; store.pref('current', null); render(); break;
      case 'pre-next': if (ui.pre > 0 && ui.pre < PRE.length - 1) ui.pre++; render(); break;
      case 'pre-prev': if (ui.pre > 0) ui.pre--; render(); break;
      case 'pre-start': S.start(a, now()); ui.screen = 'exam'; save(); render(); focusTitle(); break;
      case 'next': goNext(false); break;
      case 'prev': if (S.prev(a)) { save(); render(); focusTitle(); } break;
      case 'reset': if (S.reset(a, S.currentId(a))) { save(); render(); } break;
      case 'check': S.check(a, S.currentId(a)); save(); ui.keepScroll = true; render(); break;
      case 'side': ui.side = !ui.side; render(); break;
      case 'details': ui.modal = { kind: 'details' }; render(); break;
      case 'progress': ui.modal = { kind: 'progress' }; render(); break;
      case 'review': ui.filter = 'all'; S.openReview(a); save(); render(); break;
      case 'rv-mode-exit': ui.filter = 'all'; S.openReview(a); save(); render(); break;
      case 'break': ui.modal = { kind: 'break' }; render(); break;
      case 'break-end': S.endBreak(a, now()); save(); if (a.status === 'finished') showReport(a.id); else { render(); focusTitle(); } break;
      case 'calc': ui.modal = { kind: 'calc' }; render(); break;
      case 'calc-key': calcKey(el.getAttribute('data-key')); break;
      case 'scheme': ui.modal = { kind: 'scheme' }; render(); break;
      case 'textsize': ui.modal = { kind: 'textsize' }; render(); break;
      case 'help': ui.modal = { kind: 'help' }; render(); break;
      case 'comments-done':
        a.notes = a.notes || {};
        Array.prototype.forEach.call(app.querySelectorAll('[data-cmt]'), function (t) {
          var id = t.getAttribute('data-cmt');
          if (t.value.trim()) a.notes[id] = t.value.trim(); else delete a.notes[id];
        });
        save();
        showReport(a.id);
        break;
      case 'exit': ui.modal = { kind: 'exit' }; render(); break;
      case 'modal-close': ui.modal = null; render(); break;
      case 'modal-yes': modalYes(); break;
      case 'hide-progress': ui.hideProgress = !ui.hideProgress; store.pref('hideProgress', ui.hideProgress); render(); break;
      case 'hide-time': ui.hideTime = !ui.hideTime; store.pref('hideTime', ui.hideTime); render(); break;
      case 'rv-instr': ui.instrOpen = !ui.instrOpen; render(); break;
      case 'rv-go': if (S.goTo(a, +el.getAttribute('data-s'), +el.getAttribute('data-p'), true)) { save(); render(); focusTitle(); } break;
      case 'rv-exit': S.closeReview(a); save(); render(); focusTitle(); break;
      case 'next-section': confirmEnd('next-section'); break;
      case 'finish': confirmEnd('finish'); break;
      case 'cs-sec':
      case 'cs-sub': { var k = el.getAttribute('data-key'); ui.cs.open[k] = !ui.cs.open[k]; if (!ui.cs.open[k]) ui.cs.all = false; render(); break; }
      case 'cs-all': ui.cs.all = !ui.cs.all; if (!ui.cs.all) ui.cs.open = {}; render(); break;
      case 'order-move': setAnswer({ kind: 'order-move', tile: el.getAttribute('data-ref'), delta: +el.getAttribute('data-delta') }); break;
      case 'order-remove': setAnswer({ kind: 'order-remove', tile: el.getAttribute('data-ref') }); break;
      case 'hot': setAnswer({ kind: 'hot', region: el.getAttribute('data-region') }); break;
    }
  }

  function onChange(e) {
    var el = e.target;
    var act = el.getAttribute && el.getAttribute('data-act');
    if (!act) return;
    var a = ui.att;
    switch (act) {
      case 'single': setAnswer({ kind: 'single', i: +el.getAttribute('data-i') }); break;
      case 'multi': setAnswer({ kind: 'multi', i: +el.getAttribute('data-i'), on: el.checked }); break;
      case 'yn': setAnswer({ kind: 'yn', row: el.getAttribute('data-row'), val: el.getAttribute('data-val') === 'true' }); break;
      case 'ps': setAnswer({ kind: 'ps', val: el.getAttribute('data-val') === 'true' }); break;
      case 'dd': setAnswer({ kind: 'dd', list: el.getAttribute('data-list'), val: el.value }); break;
      case 'flag': S.toggleFlag(a, S.currentId(a)); save(); render(); break;
      case 'fbflag': S.toggleFeedback(a, S.currentId(a)); save(); render(); break;
      case 'rv-filter': ui.filter = el.getAttribute('data-f'); render(); break;
      case 'extra': store.pref('extraTime', el.checked); break;
      case 'only-wrong': ui.onlyWrong = el.checked; render(); break;
      case 'scheme-set': store.pref('scheme', el.getAttribute('data-v')); applyPrefs(); render(); break;
      case 'fs-set': store.pref('fs', +el.getAttribute('data-v')); applyPrefs(); render(); break;
    }
  }

  function onKey(e) {
    // Regiões do hotspot (SVG) respondem a Enter/Espaço.
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute && t.getAttribute('data-act') === 'hot') {
      e.preventDefault();
      setAnswer({ kind: 'hot', region: t.getAttribute('data-region') });
      return;
    }
    if (e.key === 'Escape' && ui.modal && !(dnd && dnd.carrying())) {
      ui.modal = null;
      render();
    }
  }

  function onDrop(tile, from, zone) {
    var it = curItem();
    var action = R.dropAction(it, tile, from, zone);
    if (action) setAnswer(action);
    var target = zone && app.querySelector('[data-zone="' + zone + '"]');
    if (target && target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    announce(zone && zone !== '__pool' ? 'Item colocado.' : 'Item removido.');
  }

  // ---------- cronômetro ----------

  var lastSave = 0;
  function tick() {
    var a = ui.att;
    if (ui.screen !== 'exam' || !a || (a.status !== 'running' && a.status !== 'break')) return;
    var t = now();
    S.tick(a, t);
    if (a.status === 'finished') {
      save();
      showReport(a.id);
      ui.modal = null;
      announce('O tempo acabou. A prova foi encerrada.');
      return;
    }
    ['timer', 'timer-break'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = hms(S.remainingMs(a, t));
    });
    if (t - lastSave > 5000) { save(); lastSave = t; }
  }

  // ---------- inicialização ----------

  applyPrefs();
  app.addEventListener('click', onClick);
  app.addEventListener('change', onChange);
  app.addEventListener('keydown', onKey);
  dnd = GHX.DnD.attach(app, { onDrop: onDrop, announce: announce });
  setInterval(tick, 500);
  window.addEventListener('pagehide', function () { if (ui.att && (ui.att.status === 'running' || ui.att.status === 'break')) { S.tick(ui.att, now()); save(); } });

  // Tentativas salvas antes de uma mudança nos bancos podem apontar para questões que não
  // existem mais; essas tentativas em andamento são descartadas para não quebrar a tela.
  function compatible(att) {
    return !!(att && GHX.getBank(att.bankId) && att.sections && att.sections.every(function (sec) {
      return sec.items.every(function (id) { return !!GHX.getItem(id); });
    }));
  }
  var dropped = 0;
  Object.keys(store.data.active).forEach(function (bankId) {
    var att = store.get(store.data.active[bankId]);
    if (att && !compatible(att)) { store.discard(bankId); dropped++; }
  });
  if (dropped) ui.notice = 'Uma tentativa em andamento foi descartada porque o simulado foi atualizado. Comece de novo pelo Modo exame ou pelo Modo estudo.';

  try {
    var cur = store.pref('current');
    var pending = cur && store.get(cur);
    if (pending && pending.status !== 'finished' && compatible(pending)) resume(pending);
    else { store.pref('current', null); render(); }
  } catch (e) {
    // Nunca deixar a página parada em "Carregando…": volta ao início.
    if (globalThis.console) console.error(e);
    ui.att = null; ui.modal = null; ui.screen = 'home';
    store.pref('current', null);
    ui.notice = 'Não foi possível retomar a última tentativa. Ela continua salva no histórico, se já tiver sido finalizada.';
    render();
  }

  // Gancho para testes e2e.
  GHX.App = { ui: ui, store: store, render: render };
})();
