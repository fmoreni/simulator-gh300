// Links oficiais usados nas referências (ref) das questões e figuras SVG compartilhadas.
var GHX = globalThis.GHX || (globalThis.GHX = {});

GHX.REF = {
  RAI: 'https://learn.microsoft.com/training/modules/responsible-ai-with-github-copilot/',
  RAI_RISKS: 'https://learn.microsoft.com/training/modules/responsible-ai-with-github-copilot/2-manage-ai-risks',
  RAI6: 'https://learn.microsoft.com/training/modules/responsible-ai-with-github-copilot/3-six-principles-of-responsible-ai',
  PE: 'https://learn.microsoft.com/training/modules/introduction-prompt-engineering-with-github-copilot/2-prompt-engineering-foundations-best-practices',
  FLOW: 'https://learn.microsoft.com/training/modules/introduction-prompt-engineering-with-github-copilot/3-github-copilot-user-prompt-process-flow',
  DATA: 'https://learn.microsoft.com/training/modules/introduction-prompt-engineering-with-github-copilot/4-github-copilot-data',
  PROMPT_DOCS: 'https://docs.github.com/copilot/using-github-copilot/copilot-chat/prompt-engineering-for-copilot-chat',
  USECASES: 'https://learn.microsoft.com/training/modules/developer-use-cases-for-ai-with-github-copilot/',
  TESTS: 'https://learn.microsoft.com/training/modules/develop-unit-tests-using-github-copilot-tools/',
  PLANS: 'https://docs.github.com/copilot/about-github-copilot/plans-for-github-copilot',
  CE_HOW: 'https://docs.github.com/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot',
  CE_ABOUT: 'https://docs.github.com/copilot/concepts/context/content-exclusion',
  CLI_INSTALL: 'https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli',
  CLI_USE: 'https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli',
  INSTR: 'https://docs.github.com/copilot/how-tos/configure-custom-instructions/add-repository-instructions',
  PROMPT_FILES: 'https://docs.github.com/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file',
  CHEAT: 'https://docs.github.com/copilot/reference/cheat-sheet',
  AUDIT: 'https://docs.github.com/copilot/how-tos/administer-copilot/manage-for-organization/review-activity/review-audit-logs',
  API: 'https://docs.github.com/rest/copilot/copilot-user-management',
  CODEREF: 'https://docs.github.com/copilot/concepts/completions/code-referencing',
  FIND_MATCH: 'https://docs.github.com/copilot/how-tos/get-code-suggestions/find-matching-code',
  POLICIES: 'https://docs.github.com/copilot/how-tos/manage-your-account/manage-policies',
  REVIEW: 'https://docs.github.com/copilot/concepts/agents/code-review',
  SPACES: 'https://docs.github.com/copilot/concepts/context/spaces',
  VS_MCP: 'https://code.visualstudio.com/docs/copilot/customization/mcp-servers',
  VS_AGENTS: 'https://code.visualstudio.com/docs/copilot/chat/chat-modes',
  VS_CHAT: 'https://code.visualstudio.com/docs/copilot/chat/copilot-chat',
  GUIDE: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/gh-300',
  CLI_REF: 'https://docs.github.com/copilot/reference/cli-command-reference',
  CLI_TOOLS: 'https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools',
  CLOUD_ABOUT: 'https://docs.github.com/copilot/concepts/agents/cloud-agent/about-cloud-agent',
  CLOUD_RISKS: 'https://docs.github.com/copilot/concepts/agents/cloud-agent/risks-and-mitigations',
  SKILLS: 'https://docs.github.com/copilot/concepts/agents/about-agent-skills',
  HOOKS: 'https://docs.github.com/copilot/concepts/agents/hooks',
  ORG_POLICIES: 'https://docs.github.com/copilot/concepts/policies',
  METRICS: 'https://docs.github.com/copilot/concepts/copilot-usage-metrics/copilot-metrics',
  PR_SUMMARY: 'https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/creating-a-pull-request-summary-with-github-copilot',
  PR_SUMMARY_RAI: 'https://docs.github.com/copilot/responsible-use/pull-request-summaries',
  SPARK: 'https://docs.github.com/copilot/tutorials/building-ai-app-prototypes',
  TERMS: 'https://docs.github.com/site-policy/github-terms/github-terms-for-additional-products-and-features',
  LEARN_PROTECT: 'https://learn.microsoft.com/training/modules/github-copilot-management-and-customizations/3-github-copilot-contractual-protections-disabling-matching-public-code',
  LEARN_TROUBLE: 'https://learn.microsoft.com/training/modules/github-copilot-management-and-customizations/5-troubleshoot-common-issues-with-github-copilot',
  LEARN_PLANS: 'https://learn.microsoft.com/training/modules/github-copilot-management-and-customizations/2-explore-github-copilot-plans-associated-management-customization-features',
  VS_INLINE: 'https://code.visualstudio.com/docs/copilot/ai-powered-suggestions',
  VS_OVERVIEW: 'https://code.visualstudio.com/docs/copilot/overview',
};

// Figuras SVG dos itens hotspot. As classes sv-* seguem o esquema de cores da página.
GHX.FIG = {
  row: function (y, text, indent, cls) {
    return '<text class="' + (cls || 'sv-txt') + '" x="' + (24 + (indent || 0) * 20) + '" y="' + y + '">' + text + '</text>';
  },
};
