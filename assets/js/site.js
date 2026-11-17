/* VoxelPlanet documentation: everything interactive on the page except the 3D planet (planet.js). */
(function () {
  'use strict';

  // Links that change. The store page goes live later; set supportEmail to the address you want
  // published. Empty values hide their buttons.
  var SITE = {
    assetStoreUrl: '',
    supportEmail: '',
    discordUrl: 'https://discord.gg/PeTNV3FUrN'
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  // ---------------------------------------------------------------- links
  var storeBtn = $('#storeBtn');
  if (SITE.assetStoreUrl) { storeBtn.href = SITE.assetStoreUrl; storeBtn.hidden = false; }
  var mailCard = $('#mailCard');
  if (SITE.supportEmail) mailCard.href = 'mailto:' + SITE.supportEmail + '?subject=VoxelPlanet';
  else mailCard.hidden = true;
  $('#discordCard').href = SITE.discordUrl;

  // ---------------------------------------------------------------- theme
  $('#themeBtn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('vp-theme', next);
    document.dispatchEvent(new CustomEvent('vp-theme', { detail: next }));
  });

  // ---------------------------------------------------------------- sidebar drawer (narrow screens)
  var sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('open')); });
  scrim.addEventListener('click', function () { setMenu(false); });
  $$('.toc a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  // ---------------------------------------------------------------- scrollspy
  var tocLinks = $$('.toc a');
  var targets = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  function spy() {
    var line = window.scrollY + 120, current = null;
    targets.forEach(function (t) { if (t.getBoundingClientRect().top + window.scrollY <= line) current = t; });
    tocLinks.forEach(function (a) { a.classList.toggle('active', !!current && a.getAttribute('href') === '#' + current.id); });
    $('#toTop').hidden = window.scrollY < 900;
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();
  $('#toTop').addEventListener('click', function () { window.scrollTo({ top: 0 }); });

  // ---------------------------------------------------------------- search
  // The index is built from the page itself: every heading, and every paragraph-sized block under it.
  var index = [];
  $$('.doc').forEach(function (section) {
    var sectionTitle = $('h2', section).textContent.replace(/^\d+/, '').trim();
    var currentTitle = sectionTitle, currentId = section.id;
    $$('h2, h3, p, li, td, summary, article', section).forEach(function (el) {
      if (el.matches('h2, h3')) {
        currentTitle = el.textContent.replace(/^\d+/, '').trim();
        currentId = el.id || section.id;
        index.push({ title: currentTitle, where: sectionTitle, id: currentId, text: '', heading: true, el: el });
        return;
      }
      if (el.closest('.action-list')) return;
      if (el.matches('li') && el.querySelector('ul, details')) return;
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 12) return;
      index.push({ title: currentTitle, where: sectionTitle, id: currentId, text: text, el: el });
    });
  });

  var input = $('#searchInput'), results = $('#searchResults'), selected = -1, shown = [];
  if (window.matchMedia('(max-width: 760px)').matches) input.placeholder = 'Search';
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function highlight(text, words) {
    var html = escapeHtml(text);
    words.forEach(function (w) {
      if (!w) return;
      html = html.replace(new RegExp('(' + escapeHtml(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return html;
  }
  function snippet(text, word) {
    var i = text.toLowerCase().indexOf(word);
    if (i < 0) return text.slice(0, 110) + (text.length > 110 ? '…' : '');
    var start = Math.max(0, i - 40);
    return (start > 0 ? '…' : '') + text.slice(start, start + 120) + (start + 120 < text.length ? '…' : '');
  }
  function runSearch() {
    var q = input.value.trim().toLowerCase();
    selected = -1;
    if (q.length < 2) { results.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    var words = q.split(/\s+/);
    var scored = [];
    index.forEach(function (item) {
      var hay = (item.title + ' ' + item.text).toLowerCase();
      if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return;
      var score = (item.heading ? 5 : 0) + (item.title.toLowerCase().indexOf(words[0]) >= 0 ? 3 : 0) - item.text.length / 400;
      scored.push({ item: item, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var seen = {};
    shown = scored.filter(function (s) {
      var key = s.item.title + '|' + s.item.text.slice(0, 40);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 8).map(function (s) { return s.item; });
    results.innerHTML = shown.length
      ? shown.map(function (item, i) {
          return '<li role="option" id="sr' + i + '"><a href="#' + item.id + '" data-i="' + i + '">' +
            '<div class="r-title">' + highlight(item.title, words) + '</div>' +
            (item.title !== item.where ? '<div class="r-where">' + escapeHtml(item.where) + '</div>' : '') +
            (item.text ? '<div class="r-text">' + highlight(snippet(item.text, words[0]), words) + '</div>' : '') +
            '</a></li>';
        }).join('')
      : '<li class="r-none">Nothing found for “' + escapeHtml(input.value.trim()) + '”.</li>';
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function go(i) {
    var item = shown[i];
    if (!item) return;
    results.hidden = true;
    input.blur();
    var target = item.el;
    var details = target.closest('details');
    if (details) details.open = true;
    var panel = target.closest('.tab-panel');
    if (panel && panel.hidden) {
      var btn = $('[data-tab="' + panel.getAttribute('data-panel') + '"]', panel.closest('[data-tabs]'));
      if (btn) btn.click();
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('flash');
    void target.offsetWidth;
    target.classList.add('flash');
    history.replaceState(null, '', '#' + item.id);
  }
  input.addEventListener('input', runSearch);
  input.addEventListener('focus', runSearch);
  input.addEventListener('keydown', function (e) {
    var count = shown.length;
    if (e.key === 'ArrowDown' && count) { selected = (selected + 1) % count; e.preventDefault(); }
    else if (e.key === 'ArrowUp' && count) { selected = (selected - 1 + count) % count; e.preventDefault(); }
    else if (e.key === 'Enter') { go(selected < 0 ? 0 : selected); e.preventDefault(); return; }
    else if (e.key === 'Escape') { results.hidden = true; input.blur(); return; }
    else return;
    $$('li', results).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === selected)); });
  });
  results.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-i]');
    if (!a) return;
    e.preventDefault();
    go(+a.getAttribute('data-i'));
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) results.hidden = true; });
  document.addEventListener('keydown', function (e) {
    var typing = /input|textarea|select/i.test(document.activeElement.tagName);
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // ---------------------------------------------------------------- lightbox
  var lightbox = $('#lightbox'), lightImg = $('img', lightbox);
  document.addEventListener('click', function (e) {
    var img = e.target.closest('figure img, .tab-panel img');
    if (!img || img.closest('.hs-frame')) return;
    lightImg.src = img.currentSrc || img.src;
    lightImg.alt = img.alt;
    lightbox.hidden = false;
  });
  lightbox.addEventListener('click', function () { lightbox.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lightbox.hidden = true; });

  // ---------------------------------------------------------------- copy paths
  $$('code.copy').forEach(function (code) {
    code.title = 'Click to copy';
    code.addEventListener('click', function (e) {
      e.preventDefault();
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(code.textContent.trim()).then(function () {
        code.classList.add('copied');
        setTimeout(function () { code.classList.remove('copied'); }, 1200);
      });
    });
  });

  // ---------------------------------------------------------------- getting started checklist
  var steps = $$('#startSteps input');
  function updateSteps() {
    var done = steps.filter(function (s) { return s.checked; }).length;
    $('#stepsBar').style.width = (done / steps.length * 100) + '%';
    $('#stepsDone').hidden = done !== steps.length;
    store.set('vp-steps', JSON.stringify(steps.map(function (s) { return s.checked; })));
  }
  try { (JSON.parse(store.get('vp-steps')) || []).forEach(function (v, i) { if (steps[i]) steps[i].checked = !!v; }); } catch (e) { /* ignore */ }
  steps.forEach(function (s) { s.addEventListener('change', updateSteps); });
  $('#stepsReset').addEventListener('click', function () { steps.forEach(function (s) { s.checked = false; }); updateSteps(); });
  updateSteps();

  // ---------------------------------------------------------------- generic tabs
  $$('[data-tabs]').forEach(function (group) {
    var buttons = $$('.seg [data-tab]', group);
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); });
        $$('.tab-panel', group).forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== btn.getAttribute('data-tab'); });
      });
    });
  });

  // ---------------------------------------------------------------- shortcuts: Ctrl or Cmd
  $$('[data-os]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('[data-os]').forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); });
      var mac = btn.getAttribute('data-os') === 'mac';
      $$('kbd.mod').forEach(function (k) { k.textContent = mac ? 'Cmd' : 'Ctrl'; });
    });
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $('[data-os="mac"]').click();

  // ---------------------------------------------------------------- controls explorer
  var ACTIONS = [
    { name: 'Walk', kb: ['W', 'A', 'S', 'D', 'Arrows'], kbText: 'W A S D or arrows', pad: ['ls'], padText: 'Left stick' },
    { name: 'Look around', kb: ['Mouse'], kbText: 'Move the mouse', pad: ['rs'], padText: 'Right stick' },
    { name: 'Run', kb: ['Shift'], kbText: 'Hold Shift', pad: ['l3'], padText: 'Press the left stick' },
    { name: 'Jump', kb: ['Space'], kbText: 'Space', pad: ['a'], padText: 'A / Cross' },
    { name: 'Jetpack', kb: ['Space'], kbText: 'Keep holding Space', pad: ['a'], padText: 'Keep holding A' },
    { name: 'Use the tool', kb: ['LMB'], kbText: 'Left mouse button', pad: ['x'], padText: 'X / Square' },
    { name: 'Previous / next tool', kb: ['1', '2'], kbText: '1 / 2', pad: ['dl', 'dr'], padText: 'D-pad left / right' },
    { name: 'Brush size', kb: ['Wheel', '[', ']'], kbText: 'Wheel, [ and ]', pad: ['dd', 'du'], padText: 'D-pad down / up' },
    { name: 'Flatten while held', kb: ['Ctrl'], kbText: 'Hold Ctrl', pad: ['lb'], padText: 'Left shoulder' },
    { name: 'Level while held', kb: ['Alt'], kbText: 'Hold Alt', pad: ['rb'], padText: 'Right shoulder' },
    { name: 'Helmet lamp', kb: ['L'], kbText: 'L', pad: ['r3'], padText: 'Press the right stick' },
    { name: 'Orbit view', kb: ['Tab'], kbText: 'Tab', pad: ['select'], padText: 'Select / View' },
    { name: 'Zoom in orbit view', kb: ['Wheel'], kbText: 'Mouse wheel', pad: ['lt', 'rt'], padText: 'Triggers' },
    { name: 'Free the mouse', kb: ['Esc'], kbText: 'Esc', pad: [], padText: '' },
    { name: 'Free camera', kb: ['F1', 'Q', 'E', 'RMB'], kbText: 'F1, then Q / E', pad: [], padText: '' },
    { name: 'Display / statistics', kb: ['F3', 'F4'], kbText: 'F3 / F4', pad: [], padText: '' },
    { name: 'Save / load', kb: ['F5', 'F9'], kbText: 'F5 / F9', pad: [], padText: '' }
  ];
  var device = 'kb';
  var list = $('#actionList'), caption = $('#deviceCaption');
  function renderActions() {
    list.innerHTML = ACTIONS.filter(function (a) { return device === 'kb' || a.pad.length; }).map(function (a) {
      var i = ACTIONS.indexOf(a);
      return '<li data-a="' + i + '" tabindex="0"><span>' + a.name + '</span><span>' + (device === 'kb' ? a.kbText : a.padText) + '</span></li>';
    }).join('');
  }
  function clearHot() {
    $$('.controls .hot').forEach(function (el) { el.classList.remove('hot'); });
  }
  function showAction(a) {
    clearHot();
    var ids = device === 'kb' ? a.kb : a.pad;
    ids.forEach(function (k) {
      $$(device === 'kb' ? '[data-key="' + k + '"]' : '[data-pad="' + k + '"]').forEach(function (el) { el.classList.add('hot'); });
      if (device === 'pad' && (k === 'l3' || k === 'r3')) $$('[data-pad="' + k[0] + 's"]').forEach(function (el) { el.classList.add('hot'); });
    });
    if (device === 'kb' && ids.some(function (k) { return /LMB|RMB|Wheel|Mouse/.test(k); })) $('.mouse').classList.add('hot');
    $$('[data-a="' + ACTIONS.indexOf(a) + '"]').forEach(function (li) { li.classList.add('hot'); });
    caption.textContent = a.name + ': ' + (device === 'kb' ? a.kbText : a.padText) + '.';
  }
  function showKey(key, attr) {
    var matches = ACTIONS.filter(function (a) { return (attr === 'key' ? a.kb : a.pad).indexOf(key) >= 0; });
    clearHot();
    $$('[data-' + attr + '="' + key + '"]').forEach(function (el) { el.classList.add('hot'); });
    matches.forEach(function (a) { $$('[data-a="' + ACTIONS.indexOf(a) + '"]').forEach(function (li) { li.classList.add('hot'); }); });
    caption.textContent = matches.length ? matches.map(function (a) { return a.name; }).join(', ') + '.' : 'Not used by VoxelPlanet.';
  }
  list.addEventListener('mouseover', function (e) { var li = e.target.closest('[data-a]'); if (li) showAction(ACTIONS[+li.getAttribute('data-a')]); });
  list.addEventListener('focusin', function (e) { var li = e.target.closest('[data-a]'); if (li) showAction(ACTIONS[+li.getAttribute('data-a')]); });
  $('#kbView').addEventListener('mouseover', function (e) { var k = e.target.closest('[data-key]'); if (k) showKey(k.getAttribute('data-key'), 'key'); });
  $('#padView').addEventListener('mouseover', function (e) { var k = e.target.closest('[data-pad]'); if (k) showKey(k.getAttribute('data-pad'), 'pad'); });
  $('#controls-explorer').addEventListener('mouseleave', function () { clearHot(); caption.textContent = 'Point at something.'; });
  $$('[data-device]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      device = btn.getAttribute('data-device');
      $$('[data-device]').forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); });
      $('#kbView').hidden = device !== 'kb';
      $('#padView').hidden = device !== 'pad';
      clearHot();
      caption.textContent = 'Point at something.';
      renderActions();
    });
  });
  renderActions();

  // ---------------------------------------------------------------- terrain tool modes
  var MODES = {
    excavate: { title: 'Excavate', text: 'Digs a round hole the size of the brush. Hold the button and sweep across the ground to carve trenches and tunnels.', key: 'The default mode. Press 1 or 2 to change mode.',
      after: 'M0 70 L110 70 C125 70 128 108 160 108 C192 108 195 70 210 70 L320 70 L320 140 L0 140 Z', brush: [160, 72, 36] },
    add: { title: 'Add', text: 'Puts ground back. Keep the button held and it keeps building out along your line of sight, even into thin air. That is how you build towers and bridges.', key: 'Flying up with the jetpack while holding it builds a pillar under you.',
      after: 'M0 70 L110 70 C125 70 128 34 160 34 C192 34 195 70 210 70 L320 70 L320 140 L0 140 Z', brush: [160, 52, 36] },
    flatten: { title: 'Flatten', text: 'Smooths the ground to the slope that was under the cursor when you started the stroke. Good for ramps and terraces.', key: 'Hold Left Ctrl to flatten without leaving your current mode.',
      after: 'M0 92 L40 88 L280 52 L320 48 L320 140 L0 140 Z', brush: [160, 70, 36] },
    level: { title: 'Level', text: "Makes the ground level with the planet's curve, at the height where you started. Use it for building plots and floors.", key: 'Hold Left Alt for the same thing from any mode.',
      after: 'M0 70 C80 64 240 64 320 70 L320 140 L0 140 Z', brush: [160, 66, 36] }
  };
  $('#groundBefore').setAttribute('d', 'M0 72 C40 60 70 86 110 76 C150 66 170 50 200 64 C240 82 270 58 320 66');
  function showMode(m) {
    var mode = MODES[m];
    $('#groundAfter').setAttribute('d', mode.after);
    var brush = $('#modeBrush');
    brush.setAttribute('cx', mode.brush[0]); brush.setAttribute('cy', mode.brush[1]); brush.setAttribute('r', mode.brush[2]);
    $('#modeTitle').textContent = mode.title;
    $('#modeText').textContent = mode.text;
    $('#modeKey').textContent = mode.key;
    $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === m)); });
  }
  $$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { showMode(b.getAttribute('data-mode')); }); });
  showMode('excavate');

  // ---------------------------------------------------------------- brush size demo (to scale with a 1.8 m astronaut)
  var range = $('#brushRange');
  function showBrush() {
    var r = parseFloat(range.value), px = 18;           // 18 px per metre: the astronaut is 1.8 m tall
    $('#brushValue').textContent = r.toFixed(1) + ' m';
    var label = $('#brushText');
    label.textContent = r.toFixed(1) + ' m';
    var ring = $('#brushRing'), cx = 230, gy = 118, R = r * px;
    ring.setAttribute('rx', R); ring.setAttribute('ry', R * 0.2); ring.setAttribute('cx', cx);
    $('#brushDome').setAttribute('d', 'M' + (cx - R) + ' ' + gy + ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + gy);
    label.setAttribute('x', cx);
    $('#astronaut').setAttribute('transform', 'translate(' + Math.min(70, cx - R - 30) + ' 0)');
  }
  range.addEventListener('input', showBrush);
  showBrush();

  // ---------------------------------------------------------------- Planet Editor hotspots
  var frame = $('.hs-frame'), legend = $$('#hsLegend li'), tip = document.createElement('div');
  tip.className = 'spot-tip';
  tip.hidden = true;
  frame.appendChild(tip);
  legend.forEach(function (li, i) {
    var spot = document.createElement('button');
    spot.className = 'spot';
    spot.textContent = String(i + 1);
    spot.style.left = li.getAttribute('data-x') + '%';
    spot.style.top = li.getAttribute('data-y') + '%';
    spot.setAttribute('aria-label', li.textContent);
    frame.appendChild(spot);
    function on() {
      $$('.spot', frame).forEach(function (s) { s.classList.toggle('hot', s === spot); });
      legend.forEach(function (l) { l.classList.toggle('hot', l === li); });
      tip.innerHTML = li.innerHTML;
      tip.hidden = false;
      var x = parseFloat(li.getAttribute('data-x')), y = parseFloat(li.getAttribute('data-y'));
      var w = frame.clientWidth, h = frame.clientHeight;
      var left = Math.min(Math.max(8, x / 100 * w - 130), w - 268), top = y / 100 * h + 20;
      if (top > h - 90) top = y / 100 * h - 100;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
    function off() {
      spot.classList.remove('hot');
      li.classList.remove('hot');
      tip.hidden = true;
    }
    spot.addEventListener('mouseenter', on);
    spot.addEventListener('focus', on);
    spot.addEventListener('mouseleave', off);
    spot.addEventListener('blur', off);
    li.addEventListener('mouseenter', on);
    li.addEventListener('mouseleave', off);
  });

  // ---------------------------------------------------------------- stepper
  var pages = $$('.stepper-pages article'), dots = $('.stepper-dots'), at = 0;
  pages.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', 'Step ' + (i + 1));
    dot.addEventListener('click', function () { showStep(i); });
    dots.appendChild(dot);
  });
  function showStep(i) {
    at = Math.max(0, Math.min(pages.length - 1, i));
    pages.forEach(function (p, j) { p.classList.toggle('show', j === at); });
    $$('button', dots).forEach(function (d, j) { d.setAttribute('aria-selected', String(j === at)); d.classList.toggle('done', j < at); });
    $('#stepCount').textContent = (at + 1) + ' of ' + pages.length;
    $('#stepPrev').disabled = at === 0;
    $('#stepNext').textContent = at === pages.length - 1 ? 'Start over' : 'Next';
  }
  $('#stepPrev').addEventListener('click', function () { showStep(at - 1); });
  $('#stepNext').addEventListener('click', function () { showStep(at === pages.length - 1 ? 0 : at + 1); });
  showStep(0);

  // ---------------------------------------------------------------- 3D planet fallback
  // planet.js sets window.vpPlanetReady once it draws. Without WebGL or the CDN, show the screenshot.
  setTimeout(function () {
    if (window.vpPlanetReady) return;
    $('#planetCanvas').hidden = true;
    $('.planet-fallback').hidden = false;
    $('.planet-hint').hidden = true;
  }, 6000);

  // ---------------------------------------------------------------- filters (fields, troubleshooting)
  $$('[data-filter]').forEach(function (box) {
    var target = $(box.getAttribute('data-filter'));
    box.addEventListener('input', function () {
      var q = box.value.trim().toLowerCase(), any = false;
      $$('tbody tr, details', target).forEach(function (row) {
        var hit = !q || row.textContent.toLowerCase().indexOf(q) >= 0;
        row.classList.toggle('hidden', !hit);
        if (row.tagName === 'DETAILS') { row.hidden = !hit; if (q && hit) row.open = true; }
        any = any || hit;
      });
      if (target.id === 'troubleList') $('#troubleEmpty').hidden = any;
    });
  });
})();
