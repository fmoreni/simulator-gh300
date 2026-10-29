// Registro de simulados (bancos) e índice global de itens. Sem DOM.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  GHX.BANKS = GHX.BANKS || {};
  GHX.BANK_ORDER = GHX.BANK_ORDER || [];
  GHX.ITEMS = GHX.ITEMS || {};

  function indexItem(bank, item) {
    if (GHX.ITEMS[item.id] && GHX.ITEMS[item.id].__bank !== bank.id) {
      throw new Error('ID de item duplicado entre bancos: ' + item.id);
    }
    Object.defineProperty(item, '__bank', { value: bank.id, enumerable: false, configurable: true });
    GHX.ITEMS[item.id] = item;
  }

  // Registra um simulado completo. Itens são normalizados (model.js) quando disponível.
  GHX.registerBank = function (bank) {
    if (!bank || !bank.id) throw new Error('registerBank: id obrigatório');
    if (GHX.BANKS[bank.id]) throw new Error('Banco já registrado: ' + bank.id);
    var norm = GHX.normalizeItem || function (x) { return x; };
    var b = {
      id: bank.id,
      title: bank.title || bank.id,
      subtitle: bank.subtitle || '',
      org: bank.org || '',
      minutes: bank.minutes || 0,
      blurb: bank.blurb || '',
      lang: bank.lang || 'pt-BR',
      track: bank.track || 'practice',
      level: bank.level || '',
      cert: bank.cert || 'GH-300',
      cases: (bank.cases || []).slice(),
      ps: (bank.ps || []).map(function (it) { return norm(Object.assign({ type: 'ps', cert: bank.cert || 'GH-300' }, it)); }),
      qs: (bank.qs || []).map(function (it) { return norm(Object.assign({ cert: bank.cert || 'GH-300' }, it)); }),
    };
    b.ps.forEach(function (it) { it.sec = 'ps'; });
    GHX.BANKS[b.id] = b;
    GHX.BANK_ORDER.push(b.id);
    b.ps.concat(b.qs).forEach(function (it) { indexItem(b, it); });
    return b;
  };

  // Acrescenta itens a um banco existente (usado por extensions.js).
  GHX.addItems = function (bankId, items) {
    var b = GHX.BANKS[bankId];
    if (!b) throw new Error('addItems: banco inexistente ' + bankId);
    var norm = GHX.normalizeItem || function (x) { return x; };
    (items || []).forEach(function (raw) {
      if (GHX.ITEMS[raw.id]) throw new Error('addItems: id já existe ' + raw.id);
      var it = norm(raw);
      if (it.type === 'ps') { it.sec = 'ps'; b.ps.push(it); } else { b.qs.push(it); }
      indexItem(b, it);
    });
    return b;
  };

  // Corrige campos de um item já registrado sem editar o arquivo do banco.
  GHX.patchItem = function (id, patch) {
    var it = GHX.ITEMS[id];
    if (!it) throw new Error('patchItem: item inexistente ' + id);
    Object.keys(patch || {}).forEach(function (k) { it[k] = patch[k]; });
    if (GHX.normalizeItem) GHX.normalizeItem(it);
    return it;
  };

  GHX.getBank = function (id) { return GHX.BANKS[id] || null; };
  GHX.getItem = function (id) { return GHX.ITEMS[id] || null; };
  GHX.bankItems = function (bank) { return bank.ps.concat(bank.qs); };
  GHX.listBanks = function (track) {
    return GHX.BANK_ORDER.map(function (id) { return GHX.BANKS[id]; })
      .filter(function (b) { return !track || b.track === track; });
  };
})();
