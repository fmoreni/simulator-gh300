// Certificações, tipos de item, normalização e validação estrutural. Sem DOM.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  // Domínios e pesos do "Skills measured as of August 7, 2026" (guia de estudo oficial).
  GHX.CERTS = GHX.CERTS || {};
  GHX.CERTS['GH-300'] = {
    id: 'GH-300',
    name: 'GitHub Copilot',
    exam: 'Exam GH-300: GitHub Copilot',
    minutes: 100,
    passing: 700,
    asOf: '2026-08-07',
    studyGuide: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/gh-300',
    sandbox: 'https://GHCertDemo.starttest.com',
    // Formato observado no sandbox oficial do GitHub (GH_Sandbox_Exam_ENU_V1): uma única seção,
    // sem estudo de caso nem série problema–solução; tipos: multiple choice (select one / multiple
    // select), Drag and Drop, Build List Reorder e Active Screen (listas em tela ou em texto).
    format: {
      itemTypes: ['single', 'multi', 'match', 'inline', 'order', 'dropdown'],
      caseStudies: false,
      problemSolution: false,
      fullQuestions: 60,
    },
    domains: [
      { d: 1, name: 'Use GitHub Copilot responsibly', short: 'IA responsável', short_en: 'Responsible AI', weight: [15, 20] },
      { d: 2, name: 'Use GitHub Copilot features', short: 'Recursos do Copilot', short_en: 'Copilot features', weight: [25, 30] },
      { d: 3, name: 'Understand GitHub Copilot data and architecture', short: 'Dados e arquitetura', short_en: 'Data and architecture', weight: [10, 15] },
      { d: 4, name: 'Apply prompt engineering and context crafting', short: 'Prompts e contexto', short_en: 'Prompts and context', weight: [10, 15] },
      { d: 5, name: 'Improve developer productivity with GitHub Copilot', short: 'Produtividade', short_en: 'Productivity', weight: [10, 15] },
      { d: 6, name: 'Configure privacy, content exclusions, and safeguards', short: 'Privacidade e salvaguardas', short_en: 'Privacy and safeguards', weight: [10, 15] },
    ],
  };

  // Nomes como aparecem no sandbox oficial do GitHub.
  GHX.TYPES = {
    single: { label: 'Multiple choice, select one', parts: false },
    multi: { label: 'Multiple choice, multiple select', parts: true },
    match: { label: 'Drag and Drop', parts: true },
    inline: { label: 'Drag and Drop (código)', parts: true },
    dropdown: { label: 'Active Screen', parts: true },
    order: { label: 'Build List Reorder', parts: true },
    yesno: { label: 'Sim/Não', parts: true },
    ps: { label: 'Problema–solução', parts: false },
    hotspot: { label: 'Área de seleção', parts: true },
  };

  GHX.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // Lacunas e listas são marcadas como [[id]] no código ou no texto.
  GHX.slots = function (src) {
    var out = [], re = /\[\[([A-Za-z0-9_-]+)\]\]/g, m;
    while ((m = re.exec(String(src || '')))) out.push(m[1]);
    return out;
  };

  function arr(x) { return x == null ? [] : Array.isArray(x) ? x : [x]; }

  GHX.normalizeItem = function (it) {
    if (!it.cert) it.cert = 'GH-300';
    if (!it.type) it.type = 'single';
    it.ref = arr(it.ref);
    if (it.why == null) it.why = it.type === 'single' || it.type === 'multi' ? [] : {};
    switch (it.type) {
      case 'multi':
        it.a = arr(it.a).slice().sort(function (x, y) { return x - y; });
        if (!it.n) it.n = it.a.length;
        break;
      case 'order':
        it.extra = (it.o || []).map(function (x) { return x.id; })
          .filter(function (id) { return it.a.indexOf(id) < 0; });
        break;
      case 'hotspot':
        it.a = arr(it.a);
        if (!it.n) it.n = it.a.length;
        break;
      case 'yesno':
        if (!it.labels) it.labels = ['Sim', 'Não'];
        break;
      case 'match':
      case 'inline':
        it.reuse = !!it.reuse;
        break;
    }
    return it;
  };

  function isInt(x) { return typeof x === 'number' && Math.floor(x) === x; }
  function ids(list) { return (list || []).map(function (x) { return x.id; }); }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    var s = a.slice().sort().join('|');
    return s === b.slice().sort().join('|');
  }

  // Devolve a lista de problemas estruturais de um item (vazia se estiver ok).
  GHX.validateItem = function (it, bank) {
    var e = [];
    function err(m) { e.push(it.id + ': ' + m); }
    if (!it.id) e.push('item sem id');
    var cert = bank ? bank.cert : 'GH-300';
    if (it.cert !== cert) err('cert deve ser ' + cert);
    if (!isInt(it.d) || it.d < 1 || it.d > 6) err('d fora de 1–6');
    if (!GHX.TYPES[it.type]) err('tipo desconhecido ' + it.type);
    if (!it.q) err('sem enunciado');
    if (!it.exp) err('sem explicação');
    if (!it.ref.length) err('sem ref');
    it.ref.forEach(function (r) { if (!/^https:\/\/(docs\.github\.com|learn\.microsoft\.com|github\.com|code\.visualstudio\.com|resources\.github\.com)\//.test(r)) err('ref não oficial ' + r); });
    if (it.case && bank && !bank.cases.some(function (c) { return c.id === it.case; })) err('estudo de caso inexistente ' + it.case);
    var o = it.o || [];
    switch (it.type) {
      case 'single':
        if (o.length < 2) err('poucas alternativas');
        if (!isInt(it.a) || it.a < 0 || it.a >= o.length) err('gabarito inválido');
        if (it.why.length !== o.length) err('why deve cobrir cada alternativa');
        break;
      case 'multi':
        if (o.length < 3) err('poucas alternativas');
        if (it.a.length < 2) err('multi precisa de 2+ corretas');
        it.a.forEach(function (i) { if (!isInt(i) || i < 0 || i >= o.length) err('gabarito inválido'); });
        if (new Set(it.a).size !== it.a.length) err('gabarito repetido');
        if (it.n !== it.a.length) err('n deve ser igual ao número de corretas');
        if (it.why.length !== o.length) err('why deve cobrir cada alternativa');
        break;
      case 'match': {
        var t = ids(it.targets), tiles = ids(it.tiles);
        if (t.length < 2) err('poucos alvos');
        if (!it.a || !sameSet(Object.keys(it.a), t)) err('gabarito deve cobrir cada alvo');
        else {
          var used = t.map(function (k) { return it.a[k]; });
          used.forEach(function (v) { if (tiles.indexOf(v) < 0) err('tile inexistente ' + v); });
          if (!it.reuse && new Set(used).size !== used.length) err('tile repetido sem reuse');
        }
        break;
      }
      case 'inline': {
        var gaps = GHX.slots(it.code), toks = ids(it.tokens);
        if (!gaps.length) err('código sem lacunas');
        if (!it.a || !sameSet(Object.keys(it.a), gaps)) err('gabarito deve cobrir cada lacuna');
        else {
          var gv = gaps.map(function (k) { return it.a[k]; });
          gv.forEach(function (v) { if (toks.indexOf(v) < 0) err('token inexistente ' + v); });
          if (!it.reuse && new Set(gv).size !== gv.length) err('token repetido sem reuse');
        }
        break;
      }
      case 'dropdown': {
        var lists = GHX.slots(it.code || it.text);
        if (!lists.length) err('sem listas');
        if (!it.lists || !sameSet(Object.keys(it.lists), lists)) err('lists deve cobrir cada marcador');
        if (!it.a || !sameSet(Object.keys(it.a), lists)) err('gabarito deve cobrir cada lista');
        else lists.forEach(function (k) {
          var opts = (it.lists || {})[k] || [];
          if (opts.length < 2) err('lista ' + k + ' com poucas opções');
          if (!isInt(it.a[k]) || it.a[k] < 0 || it.a[k] >= opts.length) err('gabarito inválido em ' + k);
        });
        break;
      }
      case 'order': {
        var oi = ids(o);
        if (!Array.isArray(it.a) || it.a.length < 2) err('sequência curta');
        else it.a.forEach(function (v) { if (oi.indexOf(v) < 0) err('ação inexistente ' + v); });
        if (new Set(it.a || []).size !== (it.a || []).length) err('sequência repetida');
        break;
      }
      case 'yesno': {
        var rows = ids(it.rows);
        if (rows.length < 2) err('poucas linhas');
        if (!it.a || !sameSet(Object.keys(it.a), rows)) err('gabarito deve cobrir cada linha');
        else rows.forEach(function (r) { if (typeof it.a[r] !== 'boolean') err('linha ' + r + ' sem booleano'); });
        if (!Array.isArray(it.labels) || it.labels.length !== 2) err('labels inválidos');
        break;
      }
      case 'ps':
        if (typeof it.a !== 'boolean') err('ps exige gabarito booleano');
        if (!it.sol) err('ps sem solução');
        break;
      case 'hotspot': {
        var rg = ids(it.regions);
        if (!it.svg || !it.viewBox) err('hotspot sem svg/viewBox');
        if (!it.a.length) err('hotspot sem gabarito');
        it.a.forEach(function (v) { if (rg.indexOf(v) < 0) err('região inexistente ' + v); });
        if (it.n !== it.a.length) err('n deve ser igual ao número de regiões corretas');
        break;
      }
    }
    if (it.type !== 'single' && it.type !== 'multi' && it.type !== 'ps') {
      if (!it.why || (typeof it.why === 'object' && !Object.keys(it.why).length)) err('sem why');
    }
    if (it.type === 'ps' && !it.why) err('sem why');
    return e;
  };

  GHX.validateBank = function (bank) {
    var e = [], seen = {};
    var fmt = (GHX.CERTS[bank.cert] || {}).format;
    if (fmt) {
      if (!fmt.caseStudies && bank.cases.length) e.push(bank.id + ': ' + bank.cert + ' não tem estudo de caso');
      if (!fmt.problemSolution && bank.ps.length) e.push(bank.id + ': ' + bank.cert + ' não tem série problema–solução');
      GHX.bankItems(bank).forEach(function (it) {
        if (fmt.itemTypes.indexOf(it.type) < 0) e.push(it.id + ': tipo ' + it.type + ' não aparece na ' + bank.cert);
      });
    }
    if (!bank.title) e.push(bank.id + ': sem título');
    if (!(bank.minutes > 0)) e.push(bank.id + ': minutos inválidos');
    if (['full', 'practice'].indexOf(bank.track) < 0) e.push(bank.id + ': track inválido');
    GHX.bankItems(bank).forEach(function (it) {
      if (seen[it.id]) e.push('id duplicado ' + it.id);
      seen[it.id] = 1;
      e.push.apply(e, GHX.validateItem(it, bank));
    });
    bank.cases.forEach(function (c) {
      if (!c.id || !c.title || !Array.isArray(c.tabs) || !c.tabs.length) e.push(bank.id + ': estudo de caso malformado ' + c.id);
      if (!bank.qs.some(function (it) { return it.case === c.id; })) e.push(bank.id + ': estudo de caso sem itens ' + c.id);
    });
    return e;
  };

  // Seções na ordem da prova: estudos de caso, série problema–solução, questões gerais.
  GHX.buildSections = function (bank) {
    var s = [];
    bank.cases.forEach(function (c) {
      var items = bank.qs.filter(function (it) { return it.case === c.id; });
      if (items.length) s.push({ id: 'case:' + c.id, kind: 'case', caseId: c.id, title: c.title, items: items.map(function (x) { return x.id; }) });
    });
    if (bank.ps.length) s.push({ id: 'ps', kind: 'ps', title: 'Problem–solution series', items: bank.ps.map(function (x) { return x.id; }) });
    var gen = bank.qs.filter(function (it) { return !it.case; });
    if (gen.length) s.push({ id: 'general', kind: 'general', title: 'Questions', items: gen.map(function (x) { return x.id; }) });
    return s;
  };

  GHX.bankStats = function (bank) {
    var items = GHX.bankItems(bank), types = {}, dom = {};
    items.forEach(function (it) {
      types[it.type] = (types[it.type] || 0) + 1;
      dom[it.d] = (dom[it.d] || 0) + 1;
    });
    return { count: items.length, types: types, domains: dom, sections: GHX.buildSections(bank) };
  };
})();
