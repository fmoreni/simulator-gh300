# Simulador GH-300 — GitHub Copilot

Simulador de provas para a certificação **GH-300: GitHub Copilot**. São **12 simulados fixos com 60 questões cada (720 no total)**, quatro por nível de dificuldade, mais **um simulado aleatório por nível**, sorteado a cada execução, que reproduzem o fluxo da prova aplicada pela Pearson VUE. A moldura segue o [sandbox oficial das provas do GitHub](https://GHCertDemo.starttest.com).

> Simulador independente, sem vínculo com GitHub, Microsoft ou Pearson VUE. Todas as questões são originais e escritas a partir da documentação oficial; nenhuma vem de dumps ou de provas reais. O resultado aqui **não** prevê a nota oficial.

- **A mesma prova em português ou em inglês:** as 720 questões têm versão em inglês, com os mesmos ids, gabaritos e ordem. Os termos seguem a documentação oficial em inglês, como na prova real.
- Interface em português; a moldura da prova (botões, avisos e telas) fica em inglês, como na prova real.
- **Painel de progresso e prontidão:** desempenho, cobertura dos objetivos oficiais e confiança na avaliação, com recomendação progressiva para agendar a prova.
- Funciona offline, em um único arquivo HTML, sem instalar nada.
- Modo exame com cronômetro e modo estudo com correção e explicação em cada questão.
- Relatório com aproveitamento por domínio, gabarito comentado e links para a documentação oficial.

---

## Como usar

### Opção 1 — abrir o arquivo (mais simples)

1. Baixe o arquivo [`dist/gh300-platform.html`](dist/gh300-platform.html) (no GitHub, abra o arquivo e clique em **Download raw file**) ou clone o repositório.
2. Abra o arquivo no navegador (Chrome, Edge, Firefox ou Safari, em versões recentes).

Não precisa de internet nem de servidor. O progresso fica salvo no próprio navegador.

### Opção 2 — rodar um servidor local

Requisitos: [Node.js](https://nodejs.org/) 22 ou superior e Python 3.

```bash
git clone https://github.com/fmoreni/simulator-gh300.git
cd simulator-gh300
npm run build      # gera os arquivos em dist/
npm run serve      # serve em http://localhost:8765
```

Depois acesse **http://localhost:8765/dev.html**. O projeto não tem dependências npm, então não é preciso rodar `npm install`.

### Passo a passo

1. **Tela inicial.** Os simulados aparecem agrupados em **Iniciante**, **Intermediário** e **Avançado**. Cada cartão mostra o número de questões, o tempo, o formato e os tipos de item.
   - Em **Idioma das questões**, escolha **Português** ou **English** antes de começar. Vale para as próximas tentativas; a tentativa em andamento mantém o idioma em que começou.
2. **Escolha o modo:**
   - **Modo exame:** simula a prova real, com cronômetro de 100 minutos e sem respostas durante a prova. Se o inglês não for sua língua nativa, marque **"Acrescentar 30 minutos"** antes de começar, como a acomodação oficial.
   - **Modo estudo:** sem cronômetro e com navegação livre. O botão **Corrigir** mostra se você acertou, a explicação, o motivo de cada alternativa e os links oficiais.
3. **Antes da prova** (só no modo exame): *Candidate Agreement* → *Overview* → *Information and Instructions* → *Ready to Start?* → **Start**.
4. **Durante a prova:**
   - **Previous / Next** navegam entre as questões. Ao avançar com uma questão sem resposta ou com respostas a menos, aparece o **Incomplete Question Warning** (Cancel/OK).
   - **Review later** marca a questão para revisar; **Leave Feedback** marca para comentar depois da prova; **Reset Answer** limpa a resposta.
   - A barra lateral tem **Question Details, Review, Progress, Take a Break, Calculator, Color Scheme e Help**, além de **Text Size** e **Exit simulator**.
   - As chaves ao lado de **PROGRESS** e **TIME REMAINING** ocultam essas informações.
5. **Question Review.** Depois da última questão, abre a tela de revisão, com filtros (All, Answered, Unanswered, For Review). Clique em uma questão para voltar a ela (*review mode*) e use **Exit Review Mode** para retornar à tabela. **Finish** encerra a prova.
6. **Comentários.** Se você marcou **Leave Feedback**, aparece a tela *Item Comments* para escrever seus comentários, fora do tempo da prova.
7. **Relatório.** Mostra o aproveitamento em %, o desempenho em cada um dos seis domínios e todas as questões com sua resposta, o gabarito, a explicação e os links. Use **"Mostrar só erradas e parciais"** para focar nos pontos fracos.
8. **Painel de progresso.** O botão no topo da tela inicial (ou no relatório) abre o acompanhamento de todos os simulados finalizados.

### Prova em inglês

A prova oficial é aplicada em inglês. Para treinar nessas condições, escolha **English** em *Idioma das questões* na tela inicial:

- Enunciados, alternativas, listas, itens de arrastar, comentários em código, explicações e justificativas aparecem em inglês.
- As telas da prova (pré-prova, instruções, avisos, revisão, pausa, ajuda e comentários) e o relatório também ficam em inglês.
- As questões, o gabarito, a ordem e a correção são os mesmos da versão em português. Assim dá para fazer o mesmo simulado nos dois idiomas e comparar o resultado.
- O relatório e o painel indicam o idioma de cada tentativa.

### Zerar progresso

O botão **Zerar progresso**, no painel, apaga (depois de confirmar) todo o histórico, as tentativas em andamento, os indicadores do painel e o registro de sorteio dos simulados aleatórios. Idioma, tema e tempo extra são mantidos. A ação não pode ser desfeita.

### Painel de progresso e prontidão

Funciona desde o primeiro simulado concluído, usa todos os simulados (de qualquer nível) e fica mais confiável a cada simulado diferente. Não é preciso fazer os 12. Três indicadores independentes:

- **Desempenho:** quanto você acertou nas questões distintas.
- **Cobertura oficial:** quanto dos **41 subobjetivos** do guia de estudo da GH-300 (*Skills measured as of August 7, 2026*, 14 objetivos em 6 domínios) já foi avaliado. Um subobjetivo conta como avaliado com pelo menos 3 questões distintas respondidas; o resultado é ponderado pelo peso do domínio. Faixas: baixa (< 50%), parcial (50–69%), boa (70–84%) e ampla (85%+).
- **Confiança na avaliação:** suficiência das evidências — questões distintas, simulados diferentes, cobertura, consistência e diversidade de assuntos. Com um só simulado, a confiança fica no máximo "Limitada", mesmo com 100% de acertos.

O **índice de prontidão** (0–100) combina desempenho por domínio (35%), cobertura (25%), consistência entre simulados diferentes (20%), volume de questões distintas (10%, com curva de saturação) e retenção (10%, questões refeitas 24 h ou mais depois). Componente sem dados aparece como **indisponível** e o índice fica marcado como provisório.

A recomendação tem quatro estados: **Evidência inicial**, **Preparação em desenvolvimento**, **Boa evidência de preparação** e **Pronto para agendar**. "Pronto para agendar" exige, ao mesmo tempo:
- índice de prontidão de 85 ou mais;
- cobertura oficial de 85% ou mais;
- desempenho geral de 85% ou mais;
- todos os domínios com amostra suficiente (10+ questões) e pelo menos 75%;
- resultados consistentes entre simulados diferentes;
- nenhuma lacuna crítica (objetivo sem avaliação, domínio abaixo de 60% ou subobjetivo avaliado abaixo de 50%);
- confiança de 70 ou mais.

O painel mostra cada critério atendido ou não e, em **"O que falta para eu estar preparado?"**, lista domínios críticos, assuntos com desempenho baixo, objetivos não avaliados ou com poucas questões, assuntos a confirmar e o simulado que mais amplia a cobertura.

Também traz: evolução do desempenho e da confiança, cobertura de cada objetivo oficial (e tabela dos 41 subobjetivos), desempenho por domínio, **matriz de assuntos** (questões no banco, respondidas, acertos, desempenho, simulados, evidência — nenhuma, limitada ou suficiente — e situação), melhores e piores assuntos, acertos e erros, composição dos indicadores, "O que devo estudar agora?", simulados por nível e histórico.

Como é contado:
- Acerto é a questão totalmente correta; resposta parcial conta como erro. Por isso o painel pode mostrar menos que o relatório, que dá crédito parcial.
- No modo exame, todas as questões da tentativa são avaliadas (sem resposta conta como erro); no modo estudo, só as respondidas.
- O indicador usa a **primeira** resposta de cada questão. Refazer um simulado não conta a mesma questão de novo nem aumenta a confiança; a diferença para a última resposta aparece como evolução e, com 24 h ou mais de intervalo, como retenção.
- **Subtemas** vêm dos links de documentação oficial de cada questão. **Subobjetivos** vêm do domínio, do enunciado e desses links (regras em `src/core/objectives.js`); cerca de 15% das questões, sem combinação direta, ficam no subobjetivo padrão do seu subtema.
- Todos os limites e pesos ficam em `GHX.Progress.CONFIG` e podem ser ajustados sem alterar os simulados.
- As faixas e os pesos são critérios de estudo deste simulador, não parâmetros oficiais, e a estimativa não prevê a nota da prova.

### Regras iguais às da prova real

- **Take a Break:** o cronômetro **continua correndo** durante a pausa. Depois dela, você não pode voltar a nenhuma questão já exibida, nem à que estava aberta.
- **Tempo esgotado:** a prova é encerrada e corrigida com o que foi respondido.
- **Seção única:** as questões ficam em uma única seção, sem estudo de caso e sem série problema–solução.

### Como responder cada tipo de questão

| Tipo (nome no sandbox) | Como responder |
| --- | --- |
| Multiple choice, select one | Clique na alternativa (A., B., C., D.). |
| Multiple choice, multiple select | Marque a quantidade de alternativas pedida no enunciado. |
| Drag and Drop | Arraste cada item da esquerda para o alvo na **Answer Area**. |
| Drag and Drop (código) | Arraste os valores para as lacunas do código ou da configuração. |
| Build List Reorder | Arraste as ações para a **Answer Area** e ordene de cima para baixo (▲▼ para mover, ✕ para remover). Pode sobrar ação. |
| Active Screen | Escolha uma opção em cada lista da tela ou da frase. |

Arrastar e soltar funciona com **mouse, caneta e toque**. Também dá para tocar no item e depois no destino. Pelo **teclado**: <kbd>Tab</kbd> até o item, <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para pegar, setas para escolher o destino, <kbd>Enter</kbd> para soltar, <kbd>Esc</kbd> para cancelar e <kbd>Delete</kbd> para remover.

### Progresso, histórico e acessibilidade

- A tentativa em andamento fica salva no navegador e é **retomada ao reabrir a página** (botão **Continuar** no cartão do simulado). O tempo com a página fechada não é contado.
- Cada cartão mostra o **histórico** das tentativas (com o idioma) e o botão **Ver relatório** da última.
- Os dados ficam só no navegador e no computador em que você fez os simulados. Limpar os dados do site apaga o histórico.
- **Color Scheme** oferece os modos claro, escuro e alto contraste. **Text Size** ajusta o tamanho do texto. O layout funciona no celular.

### Sobre a pontuação

O simulador mostra o **aproveitamento em %**, com crédito parcial nos itens de várias partes: em múltipla escolha, cada seleção errada anula um acerto; nos demais tipos, cada parte certa vale uma fração. A prova real usa uma **escala de 1 a 1000** com **corte em 700**, e a conversão a partir dos acertos **não é pública**. Portanto, 70% aqui não equivale a 700 na prova.

---

## Os simulados

| Simulado | Nível | Foco |
| --- | --- | --- |
| 01 | Iniciante | Sugestões inline, Chat, CLI, MCP, custom instructions, prompt files, resumos de PR, IA responsável, prompts básicos, testes e content exclusion |
| 02 | Iniciante | Planos, Copilot CLI, Spaces, code review, REST API, audit log, fluxo de dados e prompts |
| 03 | Iniciante | Princípios de IA responsável, participantes e variáveis do Chat, comandos básicos da CLI, agentes, fluxo de dados e salvaguardas |
| 04 | Intermediário | Adoção corporativa, escolha de plano, content exclusion, instruções por caminho, REST API, audit log e testes |
| 05 | Intermediário | Copilot CLI, automação de licenças, auditoria, code review, Spaces, agentes personalizados e privacidade |
| 06 | Intermediário | Planejamento, revisão e delegação na CLI, checkpoints e handoffs, políticas, métricas e diagnóstico de content exclusion |
| 07 | Avançado | Copilot cloud agent e seus controles, hooks, skills, políticas entre organizações e empresas, auditoria e subagentes |
| 08 | Avançado | Copilot CLI a fundo (configuração, permissões, sessões, scripts e CI), MCP, gerenciamento de contexto e code review a fundo |
| 09 | Avançado | Arquitetura e dados, métricas e impacto, IP indemnity e contratos, engenharia de prompts avançada e decisões de IA responsável |
| 10 | Iniciante | Comandos e participantes do Chat, comandos básicos da CLI, Spaces, agentes, audit log, princípios de IA responsável, fluxo de dados, prompts, testes e código público |
| 11 | Intermediário | CLI e REST API em cenários, políticas, code review, IA responsável no dia a dia, fluxo de dados, prompts com restrições, testes, segurança e diagnóstico de exclusões |
| 12 | Avançado | Governança de agentes, hooks e MCP, licenças e métricas em escala, fluxo de dados e controles, engenharia de contexto, estratégia de testes e defesa em profundidade |

### Simulado aleatório (o 5º de cada nível)

Cada nível tem um **Simulado aleatório** que sorteia 60 questões novas a cada execução, entre as 240 questões dos quatro simulados fixos do mesmo nível:

- mantém a distribuição por domínio dos simulados fixos (10/17/8/8/8/9);
- em cada execução, inclui todos os subobjetivos oficiais da GH-300 presentes no nível, para que os assuntos cobrados continuem os mesmos;
- completa a cota de cada domínio com as questões que ainda não foram sorteadas nesse simulado; repetições só acontecem quando um subobjetivo tem poucas questões no nível ou quando as questões do nível acabam;
- o cartão mostra quantas execuções você fez e quantas questões do nível ainda não foram sorteadas;
- funciona nos modos exame e estudo e nos dois idiomas. As questões, gabaritos e explicações são os mesmos dos simulados de origem.

### Simulados fixos

Cada simulado fixo tem **60 questões em 100 minutos**, distribuídas pelos pesos oficiais dos domínios (*Skills measured as of August 7, 2026*):

| # | Domínio | Peso oficial | Por simulado | Total (720) |
| --- | --- | --- | --- | --- |
| 1 | Use GitHub Copilot responsibly | 15–20% | 10 | 120 |
| 2 | Use GitHub Copilot features | 25–30% | 17 | 204 |
| 3 | Understand GitHub Copilot data and architecture | 10–15% | 8 | 96 |
| 4 | Apply prompt engineering and context crafting | 10–15% | 8 | 96 |
| 5 | Improve developer productivity with GitHub Copilot | 10–15% | 8 | 96 |
| 6 | Configure privacy, content exclusions, and safeguards | 10–15% | 9 | 108 |

**Como os níveis são definidos:** os quatro simulados de cada nível cobrem os seis domínios, e o nível muda o tipo de raciocínio exigido:
- **Iniciante:** reconhecer e entender conceitos e recursos.
- **Intermediário:** aplicar em cenários do dia a dia.
- **Avançado:** escolher entre alternativas próximas com várias restrições, e diagnosticar.

Toda questão tem explicação, justificativa para cada alternativa (ou parte) e pelo menos um link para a documentação oficial (docs.github.com, learn.microsoft.com ou code.visualstudio.com).

## Como a GH-300 é aplicada (verificado em outubro de 2026)

| Aspecto | GH-300 |
| --- | --- |
| Duração | 100 minutos (+30 de acomodação se o exame não estiver no seu idioma) |
| Aprovação | 700 em escala de 1 a 1000 |
| Número de questões | Não publicado na página do exame. O GitHub descreve suas provas como cerca de 60 questões pontuadas mais itens de pré-teste não identificáveis. |
| Seções | Uma única seção, sem estudo de caso e sem série problema–solução |
| Tipos de questão | Multiple choice (select one / multiple select), Drag and Drop, Build List Reorder e Active Screen |
| Pausa | O cronômetro continua; questões exibidas antes da pausa não podem ser revisitadas |
| Microsoft Learn durante a prova | Não disponível nas provas do GitHub |

O sandbox geral da Microsoft (`aka.ms/examdemo`) mostra estudos de caso, séries problema–solução, Hot Area e Labs. Esses formatos são das provas de função da Microsoft e não aparecem no sandbox das provas do GitHub.

---

## Para desenvolvedores

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera `dist/gh300-platform.html` (arquivo único, autocontido) e `dist/dev.html` (com doctype e charset, para testes locais) |
| `npm test` | Testes de núcleo, de renderers, a validação estrutural dos 12 bancos e a das traduções (`node --test tests/`) |
| `npm run serve` | Serve `dist/` em http://localhost:8765 |
| `npm run e2e` | Faz um simulado inteiro em Chrome headless via Chrome DevTools Protocol, com mouse, toque e teclado (sem Puppeteer/Playwright) |

O e2e usa o servidor de `npm run serve` se ele estiver rodando; se não, sobe um sozinho. Variáveis: `CHROME_PATH`, `E2E_URL`, `E2E_SHOTS=0` (sem capturas em `tests/e2e-output/`) e `E2E_DEBUG=1`.

### Tecnologia e estrutura

JavaScript puro, sem frameworks e sem dependências npm em tempo de execução. O build embute CSS e scripts em um único HTML.

```
build.config.mjs      ordem de carga: CORE, BANKS, UI e STYLES
build.mjs             embute CSS e scripts em src/index.html → dist/
src/
  core/               sem DOM, testável no Node; tudo em globalThis.GHX
    registry.js       registerBank, addItems, patchItem e índice de itens
    model.js          GHX.CERTS["GH-300"] (domínios, pesos e formato), tipos, normalização e validação
    scoring.js        correção pura (item, resposta) → 0..1, com crédito parcial e desempenho por domínio
    session.js        máquina de estados da tentativa (recebe now e rng)
    storage.js        localStorage com versão do formato e migração
    i18n.js           textos da interface em pt/en (GHX.t), tradução das questões (GHX.localize) e validação
    progress.js       histórico, desempenho, cobertura, confiança e índice de prontidão (CONFIG)
    objectives.js     objetivos oficiais da GH-300 e associação das questões aos subobjetivos
  banks/
    _refs.js          links oficiais usados nas referências
    practice-a.js     Simulado 01      practice-b.js   Simulado 02      s03.js   Simulado 03
    full-a.js         Simulado 04      full-b.js       Simulado 05      s06.js   Simulado 06
    s07.js            Simulado 07      s08.js          Simulado 08      s09.js   Simulado 09
    s10.js            Simulado 10      s11.js          Simulado 11      s12.js   Simulado 12
    extensions.js     itens extras e correções sem editar os bancos
    mix.js            simulado aleatório de cada nível (sorteio por domínio e subobjetivo)
    en/               versão em inglês de cada simulado (mesmos ids; só os textos)
  ui/
    dnd.js            arrastar e soltar com Pointer Events, mais alternativa por teclado
    renderers.js      um renderer por tipo de item e atualização pura das respostas
    dashboard.js      painel de progresso (indicadores e gráficos em SVG)
    app.js            telas, moldura da prova, ferramentas, relatório e eventos
  index.html, styles.css
tests/
  core.test.mjs, renderers.test.mjs, helpers.mjs, e2e.mjs
```

### Formato de uma questão

```js
{
  id: 's03-11',          // único entre todos os bancos
  d: 2,                  // domínio 1–6
  type: 'single',        // single | multi | match | inline | dropdown | order
  q: 'Enunciado com `código` e **negrito**',
  o: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
  a: 0,                  // gabarito (o formato depende do tipo)
  why: ['por que A', 'por que B', 'por que C', 'por que D'],
  exp: 'Explicação geral.',
  ref: [R.CHEAT],        // links oficiais (veja src/banks/_refs.js)
}
```

| `type` | Resposta gravada | Correção |
| --- | --- | --- |
| `single` | índice | 1 ou 0 |
| `multi` | `[índices]` (limite `n`) | por acerto; cada seleção errada anula um acerto |
| `match` | `{ alvo: idDoItem }` (`reuse` opcional) | por alvo |
| `inline` | `{ lacuna: idDoToken }`, com lacunas `[[id]]` no `code` | por lacuna |
| `dropdown` | `{ lista: índice }`, com listas `[[id]]` em `code` ou `text` | por lista |
| `order` | `[ids]` (ações extras sobram) | por posição |

O motor também suporta `yesno`, `ps` (problema–solução), `hotspot` e estudos de caso para outras certificações, mas a validação rejeita esses formatos em bancos da GH-300 (`GHX.CERTS['GH-300'].format`).

### Adicionar ou corrigir questões

- **Corrigir uma questão** sem mexer no banco: use `GHX.patchItem('id', { exp: '…' })` em `src/banks/extensions.js`.
- **Acrescentar questões** a um banco: use `GHX.addItems('gh300-s03', [ … ])` no mesmo arquivo.
- **Criar um simulado:** crie `src/banks/novo.js` com `GHX.registerBank({ id, title, subtitle, level, minutes: 100, track: 'full', blurb, qs: [...] })` e inclua o arquivo em `BANKS` no `build.config.mjs`, antes de `extensions.js`.
- **Traduzir:** toda questão precisa de versão em inglês em `src/banks/en/`. O arquivo traz só os textos, pelo id:

```js
GHX.addBankTranslations('en', { 'gh300-s03': { title, subtitle, blurb } });
GHX.addTranslations('en', {
  's03-11': {
    q: 'In Copilot Chat in VS Code, which variable…',
    o: [null, null, null, null],   // null mantém a alternativa original (código, nomes de produto)
    why: ['…', '…', '…', '…'],
    exp: '…',
  },
  // order: o = { id: rótulo }; match/inline: targets/tiles/tokens = { id: rótulo };
  // dropdown: lists = { lista: [opções] }; code/text: mesmos marcadores [[id]] do original
});
```

Depois de qualquer mudança, rode `npm run build` e `npm test`. A validação confere ids únicos, domínio, gabarito coerente com o tipo, justificativas, links oficiais, o formato da GH-300 e a distribuição pelos pesos dos domínios. Nas traduções, confere se cada questão tem versão em inglês, se a estrutura bate com o original (alternativas, ids, marcadores) e se sobrou texto em português.

## Fontes oficiais

- [Sandbox oficial das provas do GitHub](https://GHCertDemo.starttest.com) e [Exam duration and exam experience](https://learn.microsoft.com/credentials/support/exam-duration-exam-experience)
- [Guia de estudo GH-300](https://learn.microsoft.com/credentials/certifications/resources/study-guides/gh-300) e [página da certificação](https://learn.microsoft.com/credentials/certifications/github-copilot/)
- [GitHub Copilot Fundamentals](https://learn.microsoft.com/training/paths/copilot/) (Microsoft Learn)
- [Documentação do GitHub Copilot](https://docs.github.com/copilot): planos, content exclusion, Copilot CLI, cloud agent, hooks, skills, políticas, métricas, code review, Spaces, custom instructions, prompt files, audit log e REST API
- [Copilot no VS Code](https://code.visualstudio.com/docs/copilot/overview)

A documentação do Copilot muda com frequência (planos, limites e recursos em preview). As questões evitam números voláteis e se baseiam no que as páginas oficiais diziam em outubro de 2026. Se encontrar algo desatualizado, abra uma issue ou corrija com `GHX.patchItem`.
