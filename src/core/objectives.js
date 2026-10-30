// Matriz de objetivos oficiais da GH-300 (study guide, "Skills measured as of August 7, 2026")
// e associação de cada questão aos subobjetivos, sem alterar os bancos. Sem DOM.
//
// Regras (calculadas na hora, a partir de dados reais de cada questão):
// - só subobjetivos do mesmo domínio da questão (campo d);
// - o enunciado (q, texto original) que combina com as palavras do subobjetivo vale 2;
//   o subtema da questão (derivado dos links oficiais) vale 1; subobjetivos definidos só
//   por subtema (sem palavras) valem 3; need exige subtema E palavra;
// - a questão fica com o subobjetivo de maior pontuação e, se houver, um segundo com 2+;
// - sem nenhuma combinação, vale o padrão do domínio pelo subtema (FALLBACK), marcado
//   como associação por padrão. Links genéricos (guia de estudo) não definem subtema.
var GHX = globalThis.GHX || (globalThis.GHX = {});
(function () {
  // o: objetivo; t: subtemas (pelos links oficiais); k: palavras do enunciado; need: exige subtema E palavra.
  var O = [
    { d: 1, id: '1.1', name: 'Understand responsible AI principles', subs: [
      { id: '1.1.1', name: 'Describe risks and limitations of Generative AI tools', t: ['Riscos e limitações da IA'], k: /limita|alucin|desatualiz|plaus[ií]vel|inexistente|n[aã]o existe|risco|depend[eê]ncia excessiva|vi[eé]s/i },
      { id: '1.1.2', name: 'Describe ethical and responsible AI usage', t: ['Princípios de IA responsável'], k: /princ[ií]pio|fairness|transparency|accountability|inclusiveness|privacy and security|reliability and safety|[ée]tic/i },
      { id: '1.1.3', name: 'Identify potential harms and mitigation strategies of AI usage', k: /dano|mitig|enviesad|inadequad|estereot|injust|prejudic|vazar|exfiltra|inje[cç][aã]o|prompt injection|segredo|chave de api|token|dados pessoais|cpf|e-mails?|licen[cç]a|correspond/i },
    ] },
    { d: 1, id: '1.2', name: 'Validate and operate AI tools', subs: [
      { id: '1.2.1', name: 'Explain the need to validate AI output', k: /valid|revis|conferi|verific|testes? (gerad|passa)|aceit(a|ar) (sem|todas|a sugest)|sem ler|compil|aprovar|comprova|evid[eê]ncia|incorret|erro|bug/i },
      { id: '1.2.2', name: 'Identify how to operate GitHub Copilot responsibly', k: /permiss|aprova|autonomia|respons[aá]vel|responde por|pol[ií]tica de uso|ado[cç][aã]o|agente|allow-all|yolo|merge|incidente|m[eé]trica/i },
    ] },
    { d: 2, id: '2.1', name: 'Use GitHub Copilot in the IDE', subs: [
      { id: '2.1.1', name: 'Enable Copilot in the IDE', t: ['Sugestões inline e editor'], k: /instal|entrar no copilot|conta do github|come[cç]ar a usar|habilit|desativ|snooze|pausar as sugest|github\.copilot\.enable|markdown/i },
      { id: '2.1.2', name: 'Trigger Copilot through inline suggestions, chat, CLI, and agent mode', t: ['Sugestões inline e editor', 'Copilot Chat'], k: /inline|ghost text|aceita a sugest|pr[oó]xima palavra|next edit|participante|@terminal|@github|@vscode|@azure|#\w+|slash command|modo agente|forma de usar|situa[cç][aã]o para a forma/i },
      { id: '2.1.3', name: 'Configure content exclusions for specific files or repositories (app knowledge)', t: ['Content exclusion'] },
    ] },
    { d: 2, id: '2.2', name: 'Use GitHub Copilot CLI', subs: [
      { id: '2.2.1', name: 'Define GitHub Copilot CLI and how it benefits developers', t: ['Copilot CLI'], need: true, k: /o que [ée] o github copilot cli|benef[ií]cio|sem ide|ssh|terminal|mcp server|vem configurado|j[aá] vem|explique|awk|investigar/i },
      { id: '2.2.2', name: 'Identify the steps for installing GitHub Copilot CLI', t: ['Copilot CLI'], need: true, k: /instal|npm|winget|homebrew|brew|node\.js|powershell|requisit|token|autentic|login/i },
      { id: '2.2.3', name: 'Describe key GitHub Copilot CLI features and commands', t: ['Copilot CLI'], need: true, k: /slash command|qual comando|comando do copilot cli|\/[a-z-]{3,}|atalho|plan mode|configura[cç][aã]o do copilot cli|--[a-z]|agente personalizado|mcp|permiss|deny|allow-tool|preced/i },
      { id: '2.2.4', name: 'Use GitHub Copilot CLI interactively and in sessions', t: ['Copilot CLI'], need: true, k: /sess[aã]o|interativ|retom|primeiro uso|confia|diret[oó]rio|@src|incluir o arquivo|contexto|ci\b|job|program[aá]tic|nuvem|sandbox|delega/i },
      { id: '2.2.5', name: 'Generate scripts and manage files with GitHub Copilot CLI', k: /script|renomear|converter|csv|apaga logs|logs com mais|arquivos de log|gerenciar arquivos|5 gb/i },
    ] },
    { d: 2, id: '2.3', name: 'Use GitHub Copilot features and capabilities', subs: [
      { id: '2.3.1', name: 'Use Agent Mode, Copilot Edits, and MCP; manage Agent Sessions and delegate tasks to Sub-Agents', t: ['Model Context Protocol (MCP)', 'Agentes personalizados e modo agente', 'Copilot cloud agent', 'Agent skills', 'Hooks'], k: /subagente|handoff|checkpoint|janela agents|sess(ões|ao) de agente/i },
      { id: '2.3.2', name: 'Use Copilot for code review and coding assistance', t: ['Copilot code review'] },
      { id: '2.3.3', name: 'Utilize Spaces, Spark, Pull Request summaries, and customizable review standards via instructions files', t: ['Copilot Spaces', 'GitHub Spark', 'Resumos de pull request', 'Custom instructions'] },
      { id: '2.3.4', name: 'Understand the limits, options, feedback, and commands of GitHub Copilot Chat; include prompt file reuse', t: ['Copilot Chat', 'Prompt files'], k: /copilot chat|slash command|prompt files?|\/[a-z]{3,}|chat do/i },
    ] },
    { d: 2, id: '2.4', name: 'Manage organization-wide settings and policies', subs: [
      { id: '2.4.1', name: 'Configure organization-wide policy management; Copilot Code Review policies and feature availability', t: ['Políticas', 'Planos do Copilot', 'Métricas de uso'], k: /pol[ií]tica|let organizations decide|plano|licen[cç]a da organiza/i },
      { id: '2.4.2', name: 'Utilize audit log events', t: ['Audit log'] },
      { id: '2.4.3', name: 'Manage subscriptions using the REST API', t: ['REST API de licenças'] },
    ] },
    { d: 3, id: '3.1', name: 'Describe data handling and flow', subs: [
      { id: '3.1.1', name: 'Explain data usage, flow, and sharing', t: ['Tratamento e retenção de dados'], k: /reten|retid|treinamento|treinar|compartilh|dados do business|descarta o prompt/i },
      { id: '3.1.2', name: 'Describe input processing and prompt building', k: /contexto|coleta|abas|fill-in|\bfim\b|nome e o tipo|estrutura do projeto|cursor|transmiss|https/i },
      { id: '3.1.3', name: 'Explain proxy filtering and post-processing', k: /proxy|revelar|convencer|manipul|p[oó]s-process|toxic|filtro|truncad|descartad|verifica[cç](ão|ões) de (qualidade|sa[ií]da)|azure/i },
    ] },
    { d: 3, id: '3.2', name: 'Understand lifecycle and limitations', subs: [
      { id: '3.2.1', name: 'Visualize code suggestion lifecycle', t: ['Fluxo de dados do prompt'], need: true, k: /ciclo|etapa|ordem|sequ[eê]ncia|entrega|feedback|primeiro passo|depois que voc[eê] aceita|caminho completo|dois grandes momentos|em que parte do fluxo|ghost text/i },
      { id: '3.2.2', name: 'Describe limitations of LLMs and Copilot', k: /limita|janela de contexto|desatualiz|alucin|invent|n[aã]o existe|vers[aã]o antiga|obsolet|variar|diferentes|n[aã]o conhece|vi[eé]s|convincente|arquivo (enorme|de 4)/i },
    ] },
    { d: 4, id: '4.1', name: 'Craft effective prompts', subs: [
      { id: '4.1.1', name: 'Describe prompt structure and context', k: /estrutura|objetivo, contexto|restri[cç]|formato|p[uú]blico|#file|#codebase|#selection|#terminalSelection|refer[eê]ncia|captura de tela|vers[oõ]es usadas/i },
      { id: '4.1.2', name: 'Understand how context is determined', k: /abas|arquivos abertos|nome de arquivo|nome do arquivo|surround|como o copilot (define|monta)|contexto (coletado|montado|define)|janela de contexto|instru[cç][oõ]es gerais|camadas|40 regras/i },
      { id: '4.1.3', name: 'Use zero-shot and few-shot prompting', k: /zero-shot|few-shot|one-shot|exemplos?\b/i },
      { id: '4.1.4', name: 'Apply best practices for prompt crafting', k: /specific|single|short|espec[ií]fic|vago|boa(s)? pr[aá]tica|assert and iterate|refin|melhor (prompt|estrat)|reescrev|corrija isso|suposi/i },
    ] },
    { d: 4, id: '4.2', name: 'Engineer prompts for performance', subs: [
      { id: '4.2.1', name: 'Explain prompt engineering principles', k: /princ[ií]pio|4 ss|engenharia de prompts|role prompting|act as|papel/i },
      { id: '4.2.2', name: 'Describe prompt process flow and chat history usage', k: /hist[oó]rico|conversa longa|conversa nova|nova conversa|chain|resum|reinici|\/clear|compact|pergunta de acompanhamento|cada pedido constru[ií]do|etapas|rodadas/i },
    ] },
    { d: 5, id: '5.1', name: 'Enhance productivity and code quality', subs: [
      { id: '5.1.1', name: 'Use Copilot for code generation, refactoring, and documentation', k: /refator|document|gerar c[oó]digo|boilerplate|dto|simplifi|readme|duplica|dividid|300 linhas|if.? aninhad|decis(ões|ao) de arquitetura/i },
      { id: '5.1.2', name: 'Accelerate learning and reduce context switching', k: /aprend|troca de contexto|express[aã]o regular|entender|linguagem nova|framework novo|plant[aã]o|incidente|sintaxe|plano de execu|rec[eé]m-chegad/i },
      { id: '5.1.3', name: 'Generate sample data and modernize legacy code', k: /dados (de exemplo|fict|sint)|fict[ií]ci|legado|moderniz|migra|csv|python 2|obsolet|callbacks|jquery|bash em python|integridade/i },
    ] },
    { d: 5, id: '5.2', name: 'Support testing and security', subs: [
      { id: '5.2.1', name: 'Generate unit and integration tests', k: /testes? de (unidade|integra)|\/tests|gerar testes|testes gerados|snapshot|contrato|test doubles|benchmark/i },
      { id: '5.2.2', name: 'Identify edge cases and write assertions', k: /borda|asser[cç]|assert|limite|bissexto|pagina[cç][aã]o|divide|caminho feliz|condi[cç][aã]o de corrida|texto vazio|malformad/i },
      { id: '5.2.3', name: 'Suggest security improvements and performance optimizations', k: /seguran|desempenho|performance|lent|otimiz|inje[cç]|xss|vulnerab|segredo|chave de api|cache|mem[oó]ria|code scanning|md5|tls|stack trace/i },
    ] },
    { d: 6, id: '6.1', name: 'Manage privacy settings and exclusions', subs: [
      { id: '6.1.1', name: 'Configure content exclusions and editor settings', t: ['Content exclusion'], k: /exclu|github\.copilot\.enable|bing|configura[cç](ão|ões) pessoa|treinamento/i },
      { id: '6.1.2', name: 'Describe ownership and limitations of outputs', t: ['Termos de uso'], k: /propriedade|ip indemnity|indemnity|indeniza|termos|copyleft|licen[cç]a (incompat|desconhec)|respons[aá]vel legal|limita[cç][aã]o documentada|n[aã]o h[aá] garantia|symb|link simb[oó]lic|sistemas de arquivos remotos|mcp de terceiros|sem[aâ]ntic/i },
    ] },
    { d: 6, id: '6.2', name: 'Apply safeguards and troubleshoot', subs: [
      { id: '6.2.1', name: 'Enable suggestions matching public code filtering', t: ['Código público, code referencing e IP indemnity'], k: /c[oó]digo p[uú]blico|matching public|view matches|code referencing|refer[eê]ncias? de c[oó]digo/i },
      { id: '6.2.2', name: 'Resolve issues with suggestions and content exclusions', t: ['Solução de problemas'], k: /continua(m)? recebendo|ainda recebe|reload|reabrir|fechar e abrir|diagn|parou|n[aã]o (recebe|est[aá] valendo|funciona|vale)|linha diagonal|[ií]cone|30 minutos|propaga|verifica[cç](ão|ões) recomendad|neovim|primeiras verifica/i },
    ] },
  ];
  var FALLBACK = {
    1: { 'Riscos e limitações da IA': '1.1.1', 'Princípios de IA responsável': '1.1.2', '*': '1.2.2' },
    2: { 'Copilot CLI': '2.2.3', 'Copilot Chat': '2.3.4', '*': '2.3.1' },
    3: { 'Fluxo de dados do prompt': '3.1.2', 'Código público, code referencing e IP indemnity': '3.1.3', 'Agentes personalizados e modo agente': '3.1.2', '*': '3.1.1' },
    4: { 'Técnicas de prompt': '4.1.4', 'Copilot CLI': '4.2.2', 'Copilot Chat': '4.1.1', '*': '4.1.2' },
    5: { 'Testes com o Copilot': '5.2.1', 'Copilot Chat': '5.1.2', '*': '5.1.1' },
    6: { '*': '6.1.1' },
  };

  var SUBS = [], BY_ID = {};
  O.forEach(function (o) {
    o.subs.forEach(function (s) { s.d = o.d; s.obj = o.id; SUBS.push(s); BY_ID[s.id] = s; });
  });

  var memo = {};
  // Subobjetivos avaliados por uma questão: { ids: [...], fallback: bool }.
  GHX.subObjectivesOf = function (it) {
    if (memo[it.id]) return memo[it.id];
    var topics = GHX.Progress.topicsOf(it), txt = String(it.q || '');
    var sc = SUBS.filter(function (s) { return s.d === it.d; }).map(function (s) {
      var t = (s.t || []).some(function (x) { return topics.indexOf(x) >= 0; });
      var k = !!(s.k && s.k.test(txt));
      var score = s.need ? (t && k ? 3 : 0) : !s.k ? (t ? 3 : 0) : (t ? 1 : 0) + (k ? 2 : 0);
      return { id: s.id, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
    var ids = sc.slice(0, 2).filter(function (x, i) { return i === 0 || x.score >= 2; }).map(function (x) { return x.id; });
    var fb = false;
    if (!ids.length && FALLBACK[it.d]) {
      var f = FALLBACK[it.d];
      ids = [topics.map(function (t) { return f[t]; }).filter(Boolean)[0] || f['*']];
      fb = true;
    }
    return (memo[it.id] = { ids: ids, fallback: fb });
  };

  GHX.OBJECTIVES = O;
  GHX.SUBOBJECTIVES = SUBS;
  GHX.subObjective = function (id) { return BY_ID[id] || null; };
})();
