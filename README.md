# Simulador GH-300 — GitHub Copilot

Simulador de provas para a certificação **GH-300: GitHub Copilot**. São **9 simulados com 60 questões cada (540 no total)**, divididos em três níveis, que reproduzem o fluxo da prova aplicada pela Pearson VUE. A moldura segue o [sandbox oficial das provas do GitHub](https://GHCertDemo.starttest.com).

> Simulador independente, sem vínculo com GitHub, Microsoft ou Pearson VUE. Todas as questões são originais e escritas a partir da documentação oficial; nenhuma vem de dumps ou de provas reais. O resultado aqui **não** prevê a nota oficial.

- Interface em português; a moldura da prova (botões, avisos e telas) fica em inglês, como na prova real.
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
- Cada cartão mostra o **histórico** das tentativas e o botão **Ver relatório** da última.
- Os dados ficam só no navegador e no computador em que você fez os simulados. Limpar os dados do site apaga o histórico.
- **Color Scheme** oferece os modos claro, escuro e alto contraste. **Text Size** ajusta o tamanho do texto. O layout funciona no celular.

### Sobre a pontuação

O simulador mostra o **aproveitamento em %**, com crédito parcial nos itens de várias partes: em múltipla escolha, cada seleção errada anula um acerto; nos demais tipos, cada parte certa vale uma fração. A prova real usa uma **escala de 1 a 1000** com **corte em 700**, e a conversão a partir dos acertos **não é pública**. Portanto, 70% aqui não equivale a 700 na prova.

---

## Os 9 simulados

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

Cada simulado tem **60 questões em 100 minutos**, distribuídas pelos pesos oficiais dos domínios (*Skills measured as of August 7, 2026*):

| # | Domínio | Peso oficial | Por simulado | Total |
| --- | --- | --- | --- | --- |
| 1 | Use GitHub Copilot responsibly | 15–20% | 10 | 90 |
| 2 | Use GitHub Copilot features | 25–30% | 17 | 153 |
| 3 | Understand GitHub Copilot data and architecture | 10–15% | 8 | 72 |
| 4 | Apply prompt engineering and context crafting | 10–15% | 8 | 72 |
| 5 | Improve developer productivity with GitHub Copilot | 10–15% | 8 | 72 |
| 6 | Configure privacy, content exclusions, and safeguards | 10–15% | 9 | 81 |

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
| `npm test` | Testes de núcleo, de renderers e a validação estrutural dos 9 bancos (`node --test tests/`) |
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
  banks/
    _refs.js          links oficiais usados nas referências
    practice-a.js     Simulado 01      practice-b.js   Simulado 02      s03.js   Simulado 03
    full-a.js         Simulado 04      full-b.js       Simulado 05      s06.js   Simulado 06
    s07.js            Simulado 07      s08.js          Simulado 08      s09.js   Simulado 09
    extensions.js     itens extras e correções sem editar os bancos
  ui/
    dnd.js            arrastar e soltar com Pointer Events, mais alternativa por teclado
    renderers.js      um renderer por tipo de item e atualização pura das respostas
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

Depois de qualquer mudança, rode `npm run build` e `npm test`. A validação confere ids únicos, domínio, gabarito coerente com o tipo, justificativas, links oficiais, o formato da GH-300 e a distribuição pelos pesos dos domínios.

## Fontes oficiais

- [Sandbox oficial das provas do GitHub](https://GHCertDemo.starttest.com) e [Exam duration and exam experience](https://learn.microsoft.com/credentials/support/exam-duration-exam-experience)
- [Guia de estudo GH-300](https://learn.microsoft.com/credentials/certifications/resources/study-guides/gh-300) e [página da certificação](https://learn.microsoft.com/credentials/certifications/github-copilot/)
- [GitHub Copilot Fundamentals](https://learn.microsoft.com/training/paths/copilot/) (Microsoft Learn)
- [Documentação do GitHub Copilot](https://docs.github.com/copilot): planos, content exclusion, Copilot CLI, cloud agent, hooks, skills, políticas, métricas, code review, Spaces, custom instructions, prompt files, audit log e REST API
- [Copilot no VS Code](https://code.visualstudio.com/docs/copilot/overview)

A documentação do Copilot muda com frequência (planos, limites e recursos em preview). As questões evitam números voláteis e se baseiam no que as páginas oficiais diziam em outubro de 2026. Se encontrar algo desatualizado, abra uma issue ou corrija com `GHX.patchItem`.
