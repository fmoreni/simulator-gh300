// Arrastar e soltar com Pointer Events (mouse, caneta e toque) e alternativa por teclado.
// Elementos: [data-tile] arrastável (opcional data-from = alvo de origem), [data-zone] alvo.
// Toque/clique sem arrastar também funciona: escolhe o tile e depois o alvo.
var GHX = globalThis.GHX || (globalThis.GHX = {});

(function () {
  var THRESHOLD = 5;

  function attach(root, opts) {
    var drag = null;     // arrasto em andamento
    var carry = null;    // tile "na mão" (teclado ou toque): { tile, from }

    function zones() { return Array.prototype.slice.call(root.querySelectorAll('[data-zone]')); }
    function zoneAt(x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('[data-zone]') : null;
    }
    function clearHover() {
      zones().forEach(function (z) { z.classList.remove('hover'); });
    }
    function announce(msg) { if (opts.announce) opts.announce(msg); }

    function setCarry(c) {
      carry = c;
      root.classList.toggle('carrying', !!c);
      Array.prototype.forEach.call(root.querySelectorAll('[data-tile]'), function (t) {
        var on = !!c && t.getAttribute('data-tile') === c.tile && (t.getAttribute('data-from') || null) === c.from;
        t.classList.toggle('picked', on);
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function drop(tile, from, zone) {
      setCarry(null);
      opts.onDrop(tile, from || null, zone || null);
    }

    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      var t = e.target.closest && e.target.closest('[data-tile]');
      if (!t || !root.contains(t) || t.disabled) return;
      drag = {
        el: t, id: e.pointerId,
        tile: t.getAttribute('data-tile'), from: t.getAttribute('data-from'),
        x0: e.clientX, y0: e.clientY, moved: false, ghost: null,
      };
      try { t.setPointerCapture(e.pointerId); } catch (_) { /* elemento pode sumir */ }
    }

    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < THRESHOLD) return;
      e.preventDefault();
      if (!drag.moved) {
        drag.moved = true;
        var g = drag.el.cloneNode(true);
        g.classList.add('drag-ghost');
        g.removeAttribute('data-tile');
        g.style.width = drag.el.offsetWidth + 'px';
        document.body.appendChild(g);
        drag.ghost = g;
        drag.el.classList.add('dragging');
      }
      drag.ghost.style.transform = 'translate(' + (e.clientX - drag.ghost.offsetWidth / 2) + 'px,' + (e.clientY - 18) + 'px)';
      clearHover();
      var z = zoneAt(e.clientX, e.clientY);
      if (z && root.contains(z)) z.classList.add('hover');
    }

    function finish(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      clearHover();
      if (d.ghost) d.ghost.remove();
      d.el.classList.remove('dragging');
      if (cancelled) return;
      if (d.moved) {
        var z = zoneAt(e.clientX, e.clientY);
        var zone = z && root.contains(z) ? z.getAttribute('data-zone') : null;
        if (zone === d.from) return;
        // Solto fora de qualquer alvo: tile colocado volta para a origem.
        if (!zone && !d.from) return;
        drop(d.tile, d.from, zone);
        return;
      }
      // Toque/clique: pega ou troca o tile "na mão".
      if (carry && carry.tile === d.tile && carry.from === (d.from || null)) setCarry(null);
      else { setCarry({ tile: d.tile, from: d.from || null }); announce('Item selecionado. Escolha o destino.'); }
    }

    function onUp(e) { finish(e, false); }
    function onCancel(e) { finish(e, true); }

    // Clique em um alvo com um tile "na mão" solta ali.
    function onClick(e) {
      if (!carry) return;
      if (e.target.closest('[data-tile]')) return;
      var z = e.target.closest('[data-zone]');
      if (!z || !root.contains(z)) return;
      var zone = z.getAttribute('data-zone');
      if (zone === carry.from) { setCarry(null); return; }
      drop(carry.tile, carry.from, zone);
    }

    function focusables() {
      return Array.prototype.slice.call(root.querySelectorAll('[data-zone][tabindex], [data-tile]:not([disabled])'));
    }

    function onKey(e) {
      var t = e.target.closest && e.target.closest('[data-tile]');
      var z = e.target.closest && e.target.closest('[data-zone]');
      var k = e.key;
      if (k === 'Escape' && carry) { setCarry(null); announce('Cancelado.'); e.preventDefault(); return; }
      if ((k === 'Delete' || k === 'Backspace') && t && t.getAttribute('data-from')) {
        e.preventDefault();
        drop(t.getAttribute('data-tile'), t.getAttribute('data-from'), null);
        return;
      }
      if (k === 'Enter' || k === ' ') {
        if (carry && z && (!t || t.getAttribute('data-from'))) {
          e.preventDefault();
          var zone = z.getAttribute('data-zone');
          if (zone === carry.from) { setCarry(null); return; }
          drop(carry.tile, carry.from, zone);
          return;
        }
        if (t) {
          e.preventDefault();
          var c = { tile: t.getAttribute('data-tile'), from: t.getAttribute('data-from') || null };
          if (carry && carry.tile === c.tile && carry.from === c.from) setCarry(null);
          else { setCarry(c); announce('Item pego. Use as setas para escolher o destino e Enter para soltar.'); }
        }
        return;
      }
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowLeft') {
        var list = carry ? zones().filter(function (x) { return x.hasAttribute('tabindex') || x.getAttribute('data-zone') === '__pool'; }) : focusables();
        if (!list.length) return;
        var cur = list.indexOf(z && carry ? z : (t || z));
        var step = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1;
        var next = list[(cur + step + list.length) % list.length];
        e.preventDefault();
        if (next.getAttribute('data-zone') === '__pool' && !next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
        next.focus();
      }
    }

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onCancel);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);

    return {
      carrying: function () { return carry; },
      // Reaplica o destaque depois que a interface redesenha o item.
      refresh: function () { setCarry(carry && root.querySelector('[data-tile="' + carry.tile + '"]') ? carry : null); },
      cancel: function () { setCarry(null); },
      detach: function () {
        root.removeEventListener('pointerdown', onDown);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerup', onUp);
        root.removeEventListener('pointercancel', onCancel);
        root.removeEventListener('click', onClick);
        root.removeEventListener('keydown', onKey);
      },
    };
  }

  GHX.DnD = { attach: attach };
})();
