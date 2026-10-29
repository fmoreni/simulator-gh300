// Idiomas da prova: textos da interface (GHX.t) e tradução das questões (GHX.localize).
// A mesma prova roda em português ou em inglês: ids, gabaritos e ordem não mudam,
// só os textos. Sem DOM.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  GHX.LANGS = [
    { id: 'pt', label: 'Português', locale: 'pt-BR' },
    { id: 'en', label: 'English', locale: 'en-US' },
  ];
  GHX.lang = GHX.lang || 'pt';
  GHX.setLang = function (l) { GHX.lang = l === 'en' ? 'en' : 'pt'; return GHX.lang; };
  GHX.locale = function () { return GHX.lang === 'en' ? 'en-US' : 'pt-BR'; };

  // ---------- textos da interface (prova, revisão, modais e relatório) ----------

  var STR = GHX.STR = { pt: {}, en: {} };

  function add(key, pt, en) { STR.pt[key] = pt; STR.en[key] = en; }

  // Renderers
  add('correct', 'Correto', 'Correct');
  add('incorrect', 'Incorreto', 'Incorrect');
  add('partial', 'Parcialmente correto ({pct}%)', 'Partially correct ({pct}%)');
  add('options', 'Alternativas', 'Options');
  add('instr.single', 'Selecione 1 resposta entre {n} alternativas.', 'Select 1 answer from {n} options.');
  add('instr.multi', 'Selecione {n} respostas entre {m} alternativas. Cada resposta correta vale um ponto.', 'Select {n} answers from {m} options. Each correct answer is worth one point.');
  add('instr.match', 'Arraste cada item para o alvo correto', 'Drag each item to the correct target');
  add('instr.match.reuse', '. Cada item pode ser usado uma vez, mais de uma vez ou nenhuma vez.', '. Each item may be used once, more than once, or not at all.');
  add('instr.match.once', '. Cada item pode ser usado no máximo uma vez.', '. Each item may be used at most once.');
  add('instr.match.kbd', ' Pelo teclado: Enter para pegar, setas para escolher o alvo, Enter para soltar.', ' Keyboard: Enter to pick up, arrow keys to choose the target, Enter to drop.');
  add('instr.inline', 'Arraste os valores para as lacunas', 'Drag the values to the gaps');
  add('instr.inline.reuse', ' (cada valor pode ser usado mais de uma vez).', ' (each value may be used more than once).');
  add('instr.inline.once', ' (cada valor pode ser usado no máximo uma vez).', ' (each value may be used at most once).');
  add('instr.inline.kbd', ' Pelo teclado: Enter para pegar, setas para escolher a lacuna, Enter para soltar.', ' Keyboard: Enter to pick up, arrow keys to choose the gap, Enter to drop.');
  add('instr.dropdown', 'Selecione a opção correta em cada lista da área de resposta.', 'Select the correct option in each list of the answer area.');
  add('instr.order', 'Mova as ações para a área de resposta e coloque-as na sequência correta, de cima para baixo.', 'Move the actions to the answer area and arrange them in the correct order, from top to bottom.');
  add('instr.order.extra', ' Nem todas as ações serão usadas.', ' Not all actions will be used.');
  add('instr.yesno', 'Para cada afirmação, selecione {a} ou {b}. NOTE: Each correct selection is worth one point.', 'For each statement, select {a} or {b}. NOTE: Each correct selection is worth one point.');
  add('instr.ps', 'Esta questão faz parte de uma série com o mesmo cenário. Depois de responder, você não poderá voltar a ela.', 'This question is part of a series that presents the same scenario. After you answer it, you will not be able to return to it.');
  add('instr.hotspot', 'Selecione {n} área(s) na imagem.', 'Select {n} area(s) in the image.');
  add('tiles', 'Itens', 'Items');
  add('tokens', 'Valores', 'Values');
  add('placed', ' (colocado; Delete remove)', ' (placed; Delete removes it)');
  add('target', 'Alvo', 'Target');
  add('empty', 'vazio', 'empty');
  add('gap', 'Lacuna', 'Gap');
  add('gap.empty', 'vazia', 'empty');
  add('list', 'Lista', 'List');
  add('move.up', 'Mover para cima', 'Move up');
  add('move.down', 'Mover para baixo', 'Move down');
  add('remove', 'Remover', 'Remove');
  add('order.end', 'Adicionar ao fim da sequência', 'Add to the end of the sequence');
  add('drop.here', 'Solte aqui', 'Drop here');
  add('statement', 'Afirmação', 'Statement');
  add('yes', 'Sim', 'Yes');
  add('no', 'Não', 'No');
  add('solution', 'Solução:', 'Solution:');
  add('ps.ask', 'Essa solução atende ao objetivo?', 'Does the solution meet the goal?');
  add('hs.img', 'Imagem com áreas selecionáveis', 'Image with selectable areas');
  add('hs.count', '{a} de {b} selecionada(s)', '{a} of {b} selected');
  add('unsupported', 'Tipo não suportado: ', 'Unsupported type: ');
  add('no.answer', '(sem resposta)', '(no answer)');
  add('fb.yours', 'Sua resposta', 'Your answer');
  add('fb.right', 'Resposta correta', 'Correct answer');
  add('fb.exp', 'Explicação', 'Explanation');
  add('fb.docs', 'Documentação oficial', 'Official documentation');

  // Tipos de item (nomes do sandbox oficial ficam iguais nos dois idiomas)
  add('type.single', 'Multiple choice, select one', 'Multiple choice, select one');
  add('type.multi', 'Multiple choice, multiple select', 'Multiple choice, multiple select');
  add('type.match', 'Drag and Drop', 'Drag and Drop');
  add('type.inline', 'Drag and Drop (código)', 'Drag and Drop (code)');
  add('type.dropdown', 'Active Screen', 'Active Screen');
  add('type.order', 'Build List Reorder', 'Build List Reorder');
  add('type.yesno', 'Sim/Não', 'Yes/No');
  add('type.ps', 'Problema–solução', 'Problem–solution');
  add('type.hotspot', 'Área de seleção', 'Hotspot');

  // Pré-prova
  add('pre.agree1', '<strong>Na prova real</strong>, você confirma o acordo do candidato das certificações do GitHub: o conteúdo do exame é confidencial, e é proibido copiá-lo ou divulgá-lo, usar outra identidade, receber ajuda, consultar materiais ou dispositivos não autorizados e usar ferramentas de inteligência artificial durante a prova.',
    '<strong>In the real exam</strong>, you accept the GitHub certification candidate agreement: the exam content is confidential, and you may not copy or disclose it, use another identity, receive help, consult unauthorized materials or devices, or use artificial intelligence tools during the exam.');
  add('pre.agree2', '<strong>Neste simulador</strong>, que é independente e não tem vínculo com GitHub, Microsoft ou Pearson VUE, você concorda em usá-lo só para estudo. As questões são originais e o resultado não prevê a nota oficial.',
    '<strong>In this simulator</strong>, which is independent and not affiliated with GitHub, Microsoft, or Pearson VUE, you agree to use it for study only. The questions are original, and the result does not predict your official score.');
  add('pre.extra', ' (inclui +30 minutos de acomodação)', ' (includes the 30-minute accommodation)');
  add('pre.passing', '700 (escala de 1 a 1000 na prova real)', '700 (on a scale of 1 to 1000 in the real exam)');
  add('pre.pctnote', 'Neste simulador, o resultado sai em aproveitamento %, com crédito parcial.', 'In this simulator, the result is shown as a percentage score, with partial credit.');
  add('pre.formats', 'A prova pode ter vários tipos de questão: múltipla escolha (uma ou várias respostas; o enunciado diz quantas), Drag and Drop, Build List Reorder e Active Screen. O botão <strong>Help</strong> explica o tipo da questão atual.',
    'The exam can include several question types: multiple choice (one or several answers; the question says how many), Drag and Drop, Build List Reorder, and Active Screen. The <strong>Help</strong> button explains the current question type.');
  add('pre.timing', 'O tempo restante aparece no canto superior direito. Você pode ocultar o relógio e mostrá-lo de novo a qualquer momento. Use o tempo como quiser entre as questões.',
    'The time remaining is shown in the upper-right corner. You can hide the clock and show it again at any time. Spend your time across the questions however you like.');
  add('pre.breaks', 'Você pode fazer pausas (<strong>Take a Break</strong>) quantas vezes quiser. <strong>O cronômetro continua correndo durante a pausa</strong>, e depois dela você não pode voltar a nenhuma questão exibida antes. Se o tempo acabar durante a pausa, a prova é corrigida com o que foi respondido.',
    'You can take breaks (<strong>Take a Break</strong>) as often as you like. <strong>The exam clock keeps running during a break</strong>, and afterward you cannot return to any question displayed before it. If time runs out during a break, the exam is scored with what you have answered.');
  add('pre.review', 'Marque <strong>Review later</strong> nas questões que quer rever. No fim, a tela <strong>Question Review</strong> lista todas as questões, com filtros All, Answered, Unanswered e For Review.',
    'Check <strong>Review later</strong> on the questions you want to revisit. At the end, the <strong>Question Review</strong> screen lists every question, with the All, Answered, Unanswered, and For Review filters.');
  add('pre.feedback', 'Marque <strong>Leave Feedback</strong> para comentar a questão depois de terminar a prova. O tempo dos comentários é separado do tempo da prova.',
    'Check <strong>Leave Feedback</strong> to comment on the question after you finish the exam. Time spent on comments is separate from the exam time.');
  add('pre.keys', 'Arrastar e soltar funciona com mouse, caneta e toque. Pelo teclado: <kbd>Tab</kbd> até o item, <kbd>Enter</kbd>/<kbd>Espaço</kbd> para pegar, setas para escolher o destino, <kbd>Enter</kbd> para soltar, <kbd>Esc</kbd> para cancelar e <kbd>Delete</kbd> para remover.',
    'Drag and drop works with mouse, pen, and touch. With the keyboard: <kbd>Tab</kbd> to the item, <kbd>Enter</kbd>/<kbd>Space</kbd> to pick it up, arrow keys to choose the destination, <kbd>Enter</kbd> to drop, <kbd>Esc</kbd> to cancel, and <kbd>Delete</kbd> to remove.');
  add('pre.view', 'Role a área da questão para ler todo o enunciado e todas as alternativas antes de responder.', 'Scroll the question area to read the entire question and all options before answering.');
  add('pre.single', 'Todas as questões estão em uma única seção. Você pode navegar livremente entre elas até clicar em <strong>Finish</strong>, exceto nas questões travadas por uma pausa.',
    'All questions are in a single section. You can move freely between them until you click <strong>Finish</strong>, except for questions locked by a break.');
  add('pre.sections', '<strong>Note:</strong> as questões estão agrupadas em seções. Depois de concluir uma seção, você não pode voltar a ela.', '<strong>Note:</strong> the questions are grouped into sections. After you complete a section, you cannot return to it.');
  add('pre.start', 'Ao clicar em <strong>Start</strong>, o cronômetro começa a contar.', 'When you click <strong>Start</strong>, the clock starts.');

  // Prova
  add('study.mode', 'Modo estudo', 'Study mode');
  add('show', 'Mostrar ', 'Show ');
  add('hide', 'Ocultar ', 'Hide ');
  add('time.w', 'tempo', 'time');
  add('progress.w', 'progresso', 'progress');
  add('check', 'Corrigir', 'Check answer');
  add('domain', 'Domínio', 'Domain');
  add('locked.note', 'This item is locked. Você não pode mais alterar esta resposta.', 'This item is locked. You can no longer change this answer.');
  add('rv.i1', 'Abaixo está a tabela com todas as questões', 'Below is a table of all the questions');
  add('rv.i1.sec', ' desta seção', ' in this section');
  add('rv.i2', 'Selecione uma questão na tabela para começar a percorrer as questões.', 'Select a question in the table to start reviewing the questions.');
  add('rv.i3', 'Para voltar a esta tela, use o botão <strong>Exit Review Mode</strong>.', 'To return to this screen, use the <strong>Exit Review Mode</strong> button.');
  add('rv.i4.finish', 'Use o botão <strong>Finish</strong> para concluir a prova.', 'Use the <strong>Finish</strong> button to complete the exam.');
  add('rv.i4.next', 'Use o botão <strong>Next Section</strong> para ir para a próxima seção.', 'Use the <strong>Next Section</strong> button to move to the next section.');
  add('rv.none', 'Nenhuma questão neste filtro.', 'No questions match this filter.');
  add('rv.yes', 'sim', 'yes');
  add('brk.running', '<strong>O cronômetro da prova continua correndo durante a pausa.</strong>', '<strong>The exam clock keeps running during the break.</strong>');
  add('brk.left', 'Questões restantes ainda não exibidas: <strong>{n}</strong>. As questões exibidas antes da pausa estão travadas.', 'Remaining questions not yet displayed: <strong>{n}</strong>. Questions displayed before the break are locked.');
  add('cmt.intro', 'Você marcou <strong>Leave Feedback</strong> nestas questões. Escreva os comentários abaixo; este tempo é separado do tempo da prova.', 'You checked <strong>Leave Feedback</strong> on these questions. Write your comments below; this time is separate from the exam time.');
  add('inc.parts', 'Você respondeu {a} de {b} parte(s).', 'You answered {a} of {b} part(s).');
  add('pg.current', ' (atual)', ' (current)');
  add('pg.locked', ' · travada', ' · locked');
  add('pg.case', 'Estudo de caso: ', 'Case study: ');
  add('pg.ps', 'Série problema–solução', 'Problem–solution series');
  add('pg.qs', 'Questões', 'Questions');
  add('pg.row', ' — {a} de {b} respondidas', ' — {a} of {b} answered');
  add('pg.sum', '{a} de {b} questões respondidas · {c} marcadas para revisão.', '{a} of {b} questions answered · {c} marked for review.');
  add('pg.time', 'Tempo restante: ', 'Time remaining: ');
  add('brk.sum', 'Você viu <strong>{a}</strong> questão(ões) desde a última pausa; <strong>{b}</strong> estão sem resposta e <strong>{c}</strong> estão marcadas para revisão.', 'You have viewed <strong>{a}</strong> question(s) since the last break; <strong>{b}</strong> are unanswered and <strong>{c}</strong> are marked for review.');
  add('brk.warn', 'Responda ou revise essas questões antes de começar a pausa. <strong>Depois da pausa, você não poderá voltar a elas.</strong>', 'Answer or review these questions before you start the break. <strong>After the break, you will not be able to return to them.</strong>');
  add('help.single', 'Multiple choice, select one: há várias alternativas e uma resposta correta. Selecione o botão de opção ao lado da resposta.', 'Multiple choice, select one: there are several options and one correct answer. Select the option button next to the answer.');
  add('help.multi', 'Multiple choice, multiple select: há várias respostas corretas e o enunciado diz quantas selecionar. Marque as caixas de seleção.', 'Multiple choice, multiple select: there are several correct answers, and the question says how many to select. Select the check boxes.');
  add('help.match', 'Drag and Drop: arraste os itens da esquerda para os alvos da Answer Area. A posição em que você solta cada item é a resposta.', 'Drag and Drop: drag the items on the left to the targets in the Answer Area. Where you drop each item is your answer.');
  add('help.inline', 'Drag and Drop: arraste os valores para as lacunas do código ou da configuração na Answer Area.', 'Drag and Drop: drag the values to the gaps in the code or configuration in the Answer Area.');
  add('help.order', 'Build List Reorder: mova as ações para a Answer Area e ordene-as de cima para baixo. Pode haver mais ações do que posições.', 'Build List Reorder: move the actions to the Answer Area and arrange them from top to bottom. There may be more actions than positions.');
  add('help.dropdown', 'Active Screen: escolha uma opção em cada lista da tela ou da frase para completar a resposta.', 'Active Screen: choose an option in each list on the screen or in the sentence to complete the answer.');
  add('help.l1', '<strong>Previous/Next</strong> navegam entre as questões. Depois da última, abre a tela <strong>Question Review</strong>.', '<strong>Previous/Next</strong> move between questions. After the last one, the <strong>Question Review</strong> screen opens.');
  add('help.l2', '<strong>Review later</strong> marca a questão para revisão; <strong>Leave Feedback</strong> marca para comentar depois da prova.', '<strong>Review later</strong> marks the question for review; <strong>Leave Feedback</strong> marks it for a comment after the exam.');
  add('help.l3', '<strong>Reset Answer</strong> limpa a resposta da questão atual.', '<strong>Reset Answer</strong> clears the answer to the current question.');
  add('help.l4', 'Arrastar e soltar: mouse, caneta ou toque (também dá para tocar no item e depois no destino). Pelo teclado: Enter/Espaço pega, setas escolhem o destino, Enter solta, Esc cancela e Delete remove.', 'Drag and drop: mouse, pen, or touch (you can also tap the item and then the destination). Keyboard: Enter/Space picks up, arrow keys choose the destination, Enter drops, Esc cancels, and Delete removes.');
  add('help.l5', '<strong>Take a Break</strong>: o cronômetro continua correndo, e as questões já exibidas ficam travadas.', '<strong>Take a Break</strong>: the clock keeps running, and questions already displayed become locked.');
  add('help.l6', 'As chaves ao lado de PROGRESS e TIME REMAINING ocultam ou mostram essas informações.', 'The switches next to PROGRESS and TIME REMAINING hide or show that information.');
  add('help.l7', '<strong>Text Size</strong> e <strong>Exit simulator</strong> são recursos do simulador e não existem na prova real.', '<strong>Text Size</strong> and <strong>Exit simulator</strong> are simulator features and do not exist in the real exam.');
  add('exit.text', 'Sair do simulador? A tentativa fica salva e pode ser retomada pelo botão <strong>Continuar</strong>. Este recurso não existe na prova real; aqui, o tempo fora do simulador não é contado.', 'Exit the simulator? The attempt is saved and can be resumed with the <strong>Continuar</strong> button. This feature does not exist in the real exam; here, time spent outside the simulator is not counted.');
  add('end.finish', 'Ao finalizar, a prova será encerrada e você não poderá alterar nenhuma resposta. ', 'When you finish, the exam ends and you will not be able to change any answers. ');
  add('end.unanswered', 'Ainda há questões sem resposta nesta seção. ', 'There are still unanswered questions in this section. ');
  add('end.section', 'Depois de ir para a próxima seção, você não poderá voltar às questões desta seção. Are you sure?', 'After you move to the next section, you will not be able to return to the questions in this section. Are you sure?');
  add('sch.auto', 'Padrão do sistema', 'System default');
  add('sch.light', 'Claro', 'Light');
  add('sch.dark', 'Escuro', 'Dark');
  add('sch.contrast', 'Alto contraste', 'High contrast');
  add('time.up', 'O tempo acabou. A prova foi encerrada.', 'Time is up. The exam has ended.');
  add('dnd.placed', 'Item colocado.', 'Item placed.');
  add('dnd.removed', 'Item removido.', 'Item removed.');

  // Relatório
  add('rep.title', 'Relatório', 'Score report');
  add('rep.exam', 'modo exame', 'exam mode');
  add('rep.study', 'modo estudo', 'study mode');
  add('rep.home', 'Voltar ao início', 'Back to home');
  add('rep.time', 'Tempo esgotado', 'Time expired');
  add('rep.submitted', 'Finalizada pelo candidato', 'Submitted by the candidate');
  add('rep.score', '<strong>Aproveitamento</strong>: {a} de {b} pontos, com crédito parcial por parte.', '<strong>Score</strong>: {a} of {b} points, with partial credit per part.');
  add('rep.used', ' · tempo usado: {n} min', ' · time used: {n} min');
  add('rep.extra', ' (com +30 min)', ' (with +30 min)');
  add('rep.breaks', ' · pausas: {n}', ' · breaks: {n}');
  add('rep.note', 'A prova real usa uma nota escalonada de <strong>1 a 1000</strong>, com corte em <strong>700</strong>. A conversão de acertos para essa escala <strong>não é pública</strong>, então este percentual não é uma previsão da nota oficial.', 'The real exam uses a scaled score from <strong>1 to 1000</strong>, with a passing score of <strong>700</strong>. The conversion from correct answers to that scale is <strong>not public</strong>, so this percentage is not a prediction of your official score.');
  add('rep.domains', 'Desempenho por domínio', 'Performance by domain');
  add('rep.questions', 'Questões', 'Questions');
  add('rep.points', 'Pontos', 'Points');
  add('rep.pct', 'Aproveitamento', 'Score');
  add('rep.only', 'Mostrar só erradas e parciais', 'Show only incorrect and partial answers');
  add('rep.q', 'Questão {n}', 'Question {n}');
  add('rep.case', 'Estudo de caso: ', 'Case study: ');
  add('rep.comment', 'Seu comentário:', 'Your comment:');
  add('rep.lang', 'Idioma: {l}', 'Language: {l}');

  GHX.t = function (key, vars) {
    var s = (STR[GHX.lang] && STR[GHX.lang][key]);
    if (s == null) s = STR.pt[key];
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  };

  GHX.typeLabel = function (type) { return GHX.t('type.' + type); };
  GHX.domShort = function (dm) { return GHX.lang === 'en' && dm.short_en ? dm.short_en : dm.short; };

  // ---------- tradução das questões ----------
  //
  // GHX.addTranslations('en', { 'pa-c1': { q, o, why, exp, ... } }) — só os campos de texto.
  //   q, exp, ex, code, text, sol, tilesTitle, targetsTitle, tokensTitle: string
  //   o: lista de strings (single/multi; null mantém a original) ou mapa id → rótulo (order)
  //   why: lista (single/multi; null mantém o original), string ou mapa parte → texto
  //   targets, tiles, tokens, regions: mapa id → rótulo; rows: mapa id → texto
  //   lists: mapa lista → opções
  // Rótulos omitidos ficam iguais ao original (código, nomes de produto, comandos).

  GHX.TR = GHX.TR || { en: {} };
  GHX.BANK_TR = GHX.BANK_TR || { en: {} };

  GHX.addTranslations = function (lang, map) {
    var dst = GHX.TR[lang] || (GHX.TR[lang] = {});
    Object.keys(map || {}).forEach(function (id) {
      if (dst[id]) throw new Error('addTranslations: tradução repetida ' + id);
      dst[id] = map[id];
    });
    cache = {};
  };

  GHX.addBankTranslations = function (lang, map) {
    var dst = GHX.BANK_TR[lang] || (GHX.BANK_TR[lang] = {});
    Object.keys(map || {}).forEach(function (id) { dst[id] = map[id]; });
  };

  var STRINGS = ['q', 'exp', 'ex', 'code', 'text', 'sol', 'tilesTitle', 'targetsTitle', 'tokensTitle'];
  var LABELS = ['targets', 'tiles', 'tokens', 'regions'];
  var cache = {};

  function relabel(list, map, field) {
    return list.map(function (x) {
      var y = Object.assign({}, x);
      if (map[x.id] != null) y[field] = map[x.id];
      return y;
    });
  }

  function merge(it, tr) {
    var out = Object.assign({}, it);
    Object.defineProperty(out, '__bank', { value: it.__bank, enumerable: false, configurable: true });
    STRINGS.forEach(function (k) { if (tr[k] != null) out[k] = tr[k]; });
    if (tr.o) {
      if (Array.isArray(tr.o)) out.o = tr.o.map(function (x, i) { return x == null ? it.o[i] : x; });
      else out.o = relabel(it.o, tr.o, 'label');
    }
    if (tr.why != null) {
      if (Array.isArray(tr.why)) out.why = tr.why.map(function (x, i) { return x == null ? it.why[i] : x; });
      else if (typeof tr.why === 'string') out.why = tr.why;
      else {
        out.why = Object.assign({}, it.why);
        Object.keys(tr.why).forEach(function (k) { if (tr.why[k] != null) out.why[k] = tr.why[k]; });
      }
    }
    LABELS.forEach(function (k) { if (tr[k] && it[k]) out[k] = relabel(it[k], tr[k], 'label'); });
    if (tr.rows && it.rows) out.rows = relabel(it.rows, tr.rows, 'text');
    if (tr.lists && it.lists) {
      out.lists = Object.assign({}, it.lists);
      Object.keys(tr.lists).forEach(function (k) { out.lists[k] = tr.lists[k].slice(); });
    }
    return out;
  }

  // Item no idioma pedido; sem tradução, devolve o original.
  GHX.localize = function (it, lang) {
    lang = lang || GHX.lang;
    if (!it || lang === 'pt') return it;
    var tr = (GHX.TR[lang] || {})[it.id];
    if (!tr) return it;
    var key = lang + ':' + it.id;
    if (!cache[key] || cache[key].src !== it) cache[key] = { src: it, out: merge(it, tr) };
    return cache[key].out;
  };

  GHX.itemIn = function (id, lang) { return GHX.localize(GHX.getItem(id), lang); };

  GHX.bankText = function (b, lang) {
    lang = lang || GHX.lang;
    var tr = lang !== 'pt' && b && (GHX.BANK_TR[lang] || {})[b.id];
    return {
      title: tr && tr.title || (b ? b.title : ''),
      subtitle: tr && tr.subtitle || (b ? b.subtitle : ''),
      blurb: tr && tr.blurb || (b ? b.blurb : ''),
    };
  };

  // ---------- validação das traduções ----------

  // Heurística para achar português que ficou sem tradução. Trechos entre crases
  // (código, comandos, caminhos) são ignorados.
  var PT_CHARS = /[ãõçáàâêéíóôúÃÕÇÁÀÂÊÉÍÓÔÚ]/;
  var PT_WORDS = /\b(de|da|das|dos|para|que|uma|com|pelo|pela|pelos|pelas|ao|aos|ou|sem|mais|seu|sua|seus|suas|quando|como|isso|esse|essa|este|esta|nao|qual|quais|empresa|equipe|deve|pode|precisa|sobre|entre|cada|todos|todas|nenhum|nenhuma|apenas|arquivo|arquivos|usuario|codigo|resposta|questao|ainda|depois|antes|porque|onde|nos|nas|num|numa)\b/i;
  GHX.looksPortuguese = function (s) {
    var x = String(s == null ? '' : s).replace(/`[^`]*`/g, ' ').replace(/\S*[./]\S+/g, ' ');
    return PT_CHARS.test(x) || PT_WORDS.test(x);
  };

  function texts(it) {
    var out = [];
    var push = function (where, s) { if (s != null && s !== '') out.push([where, String(s)]); };
    STRINGS.forEach(function (k) { if (k !== 'code' && k !== 'ex') push(k, it[k]); });
    // Em código, só os comentários e textos de linguagem natural importam.
    ['code', 'ex'].forEach(function (k) { if (it[k]) push(k, it[k]); });
    if (Array.isArray(it.o)) it.o.forEach(function (x, i) { push('o[' + i + ']', typeof x === 'string' ? x : x.label); });
    if (Array.isArray(it.why)) it.why.forEach(function (x, i) { push('why[' + i + ']', x); });
    else if (typeof it.why === 'string') push('why', it.why);
    else if (it.why) Object.keys(it.why).forEach(function (k) { push('why.' + k, it.why[k]); });
    LABELS.forEach(function (k) { (it[k] || []).forEach(function (x) { push(k + '.' + x.id, x.label); }); });
    (it.rows || []).forEach(function (x) { push('rows.' + x.id, x.text); });
    if (it.lists) Object.keys(it.lists).forEach(function (k) { it.lists[k].forEach(function (x, i) { push('lists.' + k + '[' + i + ']', x); }); });
    return out;
  }

  function sameSlots(a, b) { return GHX.slots(a).join('|') === GHX.slots(b).join('|'); }

  // Problemas da tradução de um item (vazia se estiver ok).
  GHX.checkTranslation = function (it, lang) {
    var e = [];
    var err = function (m) { e.push(it.id + ' [' + lang + ']: ' + m); };
    var tr = (GHX.TR[lang] || {})[it.id];
    if (!tr) { err('sem tradução'); return e; }
    if (!tr.q) err('sem q');
    if (!tr.exp) err('sem exp');
    var known = STRINGS.concat(['o', 'why', 'rows', 'lists']).concat(LABELS);
    Object.keys(tr).forEach(function (k) { if (known.indexOf(k) < 0) err('campo desconhecido ' + k); });
    ['code', 'text'].forEach(function (k) {
      if (tr[k] != null && !sameSlots(it[k], tr[k])) err(k + ' com marcadores [[...]] diferentes do original');
    });
    if (tr.o) {
      if (Array.isArray(it.o) && typeof it.o[0] === 'string') {
        if (!Array.isArray(tr.o) || tr.o.length !== it.o.length) err('o deve ter ' + it.o.length + ' alternativas');
      } else if (Array.isArray(tr.o)) err('o deve ser mapa id → rótulo');
      else Object.keys(tr.o).forEach(function (k) { if (!it.o.some(function (x) { return x.id === k; })) err('o: id inexistente ' + k); });
    }
    if (tr.why != null) {
      if (Array.isArray(it.why)) { if (!Array.isArray(tr.why) || tr.why.length !== it.why.length) err('why deve ter ' + it.why.length + ' entradas'); }
      else if (typeof it.why === 'string') { if (typeof tr.why !== 'string') err('why deve ser texto'); }
      else Object.keys(tr.why).forEach(function (k) { if (!(k in it.why)) err('why: parte inexistente ' + k); });
    }
    LABELS.concat(['rows']).forEach(function (k) {
      if (!tr[k]) return;
      Object.keys(tr[k]).forEach(function (id) { if (!(it[k] || []).some(function (x) { return x.id === id; })) err(k + ': id inexistente ' + id); });
    });
    if (tr.lists) Object.keys(tr.lists).forEach(function (k) {
      if (!it.lists || !it.lists[k]) err('lists: lista inexistente ' + k);
      else if (tr.lists[k].length !== it.lists[k].length) err('lists.' + k + ' deve ter ' + it.lists[k].length + ' opções');
    });
    if (e.length) return e;
    texts(GHX.localize(it, lang)).forEach(function (p) {
      if (GHX.looksPortuguese(p[1])) err('texto em português em ' + p[0] + ': ' + p[1].slice(0, 80));
    });
    return e;
  };

  GHX.checkBankTranslation = function (b, lang) {
    var e = [];
    var tr = (GHX.BANK_TR[lang] || {})[b.id];
    if (!tr || !tr.title || !tr.subtitle || !tr.blurb) e.push(b.id + ' [' + lang + ']: banco sem título, subtítulo ou descrição traduzidos');
    else ['title', 'subtitle', 'blurb'].forEach(function (k) { if (GHX.looksPortuguese(tr[k])) e.push(b.id + ' [' + lang + ']: ' + k + ' em português'); });
    GHX.bankItems(b).forEach(function (it) { e.push.apply(e, GHX.checkTranslation(it, lang)); });
    return e;
  };
})();
