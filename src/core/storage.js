// Persistência em localStorage com versão do formato e migração. Sem DOM
// (o backend é injetável: qualquer objeto com getItem/setItem/removeItem).
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var KEY = 'ghx.gh300';
  var VERSION = 2;

  function empty() { return { v: VERSION, attempts: {}, order: [], active: {}, prefs: {} }; }

  // v1 guardava { attempts: [ ... ] } sem número de versão nem índice de tentativa ativa.
  function migrate(data) {
    if (!data || typeof data !== 'object') return empty();
    if (data.v === VERSION) return data;
    if (data.v == null && Array.isArray(data.attempts)) {
      var out = empty();
      data.attempts.forEach(function (a) {
        if (!a || !a.id) return;
        a.v = VERSION;
        if (!a.flags) a.flags = {};
        if (!a.checked) a.checked = {};
        if (!a.locked) a.locked = {};
        if (!a.seen) a.seen = {};
        out.attempts[a.id] = a;
        out.order.push(a.id);
        if (a.status !== 'finished') out.active[a.bankId] = a.id;
      });
      out.prefs = data.prefs || {};
      return out;
    }
    return empty();
  }

  function memoryBackend() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
    };
  }

  function defaultBackend() {
    try {
      var ls = globalThis.localStorage;
      var probe = '__ghx_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    } catch (e) {
      return memoryBackend();
    }
  }

  function Store(backend) {
    this.backend = backend || defaultBackend();
    this.data = this.load();
  }

  Store.prototype.load = function () {
    var raw = null;
    try { raw = this.backend.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) return empty();
    try { return migrate(JSON.parse(raw)); } catch (e) { return empty(); }
  };

  Store.prototype.flush = function () {
    try { this.backend.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  };

  Store.prototype.put = function (att) {
    if (!this.data.attempts[att.id]) this.data.order.push(att.id);
    this.data.attempts[att.id] = att;
    if (att.status === 'finished') {
      if (this.data.active[att.bankId] === att.id) delete this.data.active[att.bankId];
    } else {
      this.data.active[att.bankId] = att.id;
    }
    return this.flush();
  };

  Store.prototype.get = function (id) { return this.data.attempts[id] || null; };

  Store.prototype.active = function (bankId) {
    var id = this.data.active[bankId];
    var a = id && this.data.attempts[id];
    return a && a.status !== 'finished' ? a : null;
  };

  Store.prototype.discard = function (bankId) {
    var id = this.data.active[bankId];
    if (!id) return;
    delete this.data.active[bankId];
    delete this.data.attempts[id];
    this.data.order = this.data.order.filter(function (x) { return x !== id; });
    this.flush();
  };

  Store.prototype.history = function (bankId) {
    var d = this.data;
    return d.order.map(function (id) { return d.attempts[id]; })
      .filter(function (a) { return a && a.status === 'finished' && (!bankId || a.bankId === bankId); })
      .sort(function (x, y) { return (y.finishedAt || 0) - (x.finishedAt || 0); });
  };

  Store.prototype.pref = function (k, v) {
    if (arguments.length === 1) return this.data.prefs[k];
    this.data.prefs[k] = v;
    this.flush();
    return v;
  };

  Store.prototype.clear = function () { this.data = empty(); this.flush(); };

  // Apaga tentativas finalizadas e em andamento; mantém as preferências (idioma, tema etc.).
  Store.prototype.resetProgress = function () {
    var prefs = this.data.prefs || {};
    delete prefs.current;
    delete prefs.mixUsage;
    this.data = empty();
    this.data.prefs = prefs;
    return this.flush();
  };

  GHX.Storage = {
    KEY: KEY,
    VERSION: VERSION,
    migrate: migrate,
    memoryBackend: memoryBackend,
    open: function (backend) { return new Store(backend); },
  };
})();
