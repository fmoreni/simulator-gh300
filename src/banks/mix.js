// Simulado aleatório de cada nível (o 5º do nível). As 60 questões são sorteadas a cada
// execução entre as questões dos simulados fixos do mesmo nível, sem criar questões novas:
// - mantém a distribuição por domínio dos simulados (10/17/8/8/8/9);
// - dentro de cada domínio, inclui todos os subobjetivos oficiais e completa a cota com
//   as questões menos usadas, priorizando as que ainda não apareceram neste simulado;
// As questões continuam pertencendo aos bancos de origem (mesmos ids e gabaritos).
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var MIX = [
    { id: 'gh300-mix-ini', level: 'Iniciante', en: 'Beginner' },
    { id: 'gh300-mix-int', level: 'Intermediário', en: 'Intermediate' },
    { id: 'gh300-mix-adv', level: 'Avançado', en: 'Advanced' },
  ];
  var QUOTA = { 1: 10, 2: 17, 3: 8, 4: 8, 5: 8, 6: 9 };

  function pool(level) {
    var out = [];
    GHX.listBanks().forEach(function (b) {
      if (!b.dynamic && b.level === level && b.cert === 'GH-300') out = out.concat(GHX.bankItems(b));
    });
    return out;
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // usage: { idDaQuestão: vezes que já apareceu neste simulado aleatório }.
  function compose(bank, usage, rng) {
    usage = usage || {};
    rng = rng || Math.random;
    var items = pool(bank.level), picked = [];
    Object.keys(QUOTA).forEach(function (d) {
      var groups = {};
      items.filter(function (it) { return String(it.d) === d; }).forEach(function (it) {
        var sub = GHX.subObjectivesOf ? GHX.subObjectivesOf(it).ids[0] : 'all';
        (groups[sub] = groups[sub] || []).push(it);
      });
      // Em cada subobjetivo, primeiro as questões menos usadas; empate resolvido no sorteio.
      var gs = shuffle(Object.keys(groups), rng).map(function (k) {
        var list = shuffle(groups[k], rng).sort(function (a, b) { return (usage[a.id] || 0) - (usage[b.id] || 0); });
        return { list: list, taken: 0 };
      });
      for (var n = 0; n < QUOTA[d]; n++) {
        var best = null;
        gs.forEach(function (g) {
          if (g.taken >= g.list.length) return;
          var u = usage[g.list[g.taken].id] || 0;
          // 1º: cada subobjetivo do domínio aparece uma vez; depois, as questões menos usadas.
          var k = [g.taken ? 1 : 0, u, g.taken];
          if (!best || k[0] < best.k[0] || (k[0] === best.k[0] && (k[1] < best.k[1] || (k[1] === best.k[1] && k[2] < best.k[2])))) best = { g: g, k: k };
        });
        if (!best) break;
        picked.push(best.g.list[best.g.taken++]);
      }
    });
    return shuffle(picked, rng);
  }

  GHX.Mixer = {
    QUOTA: QUOTA,
    pool: pool,
    compose: compose,
    // Quantas vezes cada questão já apareceu em tentativas deste simulado.
    usage: function (bankId, attempts) {
      var u = {};
      (attempts || []).forEach(function (a) {
        if (a && a.bankId === bankId) (a.sections || []).forEach(function (s) { s.items.forEach(function (id) { u[id] = (u[id] || 0) + 1; }); });
      });
      return u;
    },
    // Monta uma nova seleção no banco antes de criar a tentativa (usage: id → vezes sorteada).
    refresh: function (bank, usage, rng) {
      bank.qs = compose(bank, usage, rng);
      return bank;
    },
  };

  MIX.forEach(function (m, i) {
    var b = {
      id: m.id,
      title: 'Simulado aleatório — ' + m.level,
      subtitle: m.level + ' · 60 questões sorteadas a cada execução',
      org: '', minutes: 100, lang: 'pt-BR', track: 'full', level: m.level, cert: 'GH-300',
      dynamic: true,
      blurb: 'Sorteia 60 questões dos simulados de nível ' + m.level + ' a cada execução, com a distribuição oficial por domínio e passando por todos os subobjetivos de cada domínio. Prioriza questões que ainda não apareceram aqui.',
      cases: [], ps: [], qs: [],
    };
    GHX.BANKS[b.id] = b;
    GHX.BANK_ORDER.push(b.id);
    // Seleção inicial, só para o cartão da tela inicial; cada execução sorteia de novo.
    b.qs = compose(b, {}, GHX.Session ? GHX.Session.seeded(i + 1) : Math.random);
  });

  if (GHX.addBankTranslations) {
    var tr = {};
    MIX.forEach(function (m) {
      tr[m.id] = {
        title: 'Randomized Practice Exam — ' + m.en,
        subtitle: m.en + ' · 60 questions drawn on every run',
        blurb: 'Draws 60 questions from the ' + m.en.toLowerCase() + ' practice exams on every run, keeping the official distribution by domain and covering every sub-objective of each domain. Questions that have not appeared here yet come first.',
      };
    });
    GHX.addBankTranslations('en', tr);
  }
})();
