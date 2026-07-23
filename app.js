/* weekwise explained — page logic.
   No network calls (the CSP forbids them anyway). localStorage holds only
   the theme choice. Every date shown is read from data/facts.js, which
   derives them with the same 280-day / offset arithmetic the weekwise app
   uses and test/facts.test.js proves. The two bead strands are drawn here
   from those facts — no numbers are hand-typed into the DOM. */
'use strict';

(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var F = (typeof window !== 'undefined' && window.WEEKWISE_FACTS) || null;

  /* ---------- theme toggle ---------- */
  var THEME_KEY = 'weekwise-explained.theme';
  var toggle = document.getElementById('theme-toggle');

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
    if (toggle) toggle.setAttribute('aria-pressed', String(effectiveTheme() === 'dark'));
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); }
  catch (e) { /* storage may be unavailable; theme stays on system preference */ }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* non-fatal */ }
    });
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---------- draw the 40-bead week strand ----------
     nowWeek = the lit current-week bead (0-based GA week, from the facts).
     tagWeeks = milestone weeks that hang a small tag.
     Beads before nowWeek are threaded solid, the nowWeek bead is blush,
     beads after wait hollow. */
  function drawStrand(svg, opts) {
    if (!svg) return;
    var W = 1000, weeks = 40;
    var padX = 26, y = opts.threadY || 34;
    var step = (W - padX * 2) / (weeks - 1);
    var r = opts.r || 8, rNow = opts.rNow || 11;

    // thread
    var d = 'M ' + padX + ' ' + y;
    for (var i = 1; i < weeks; i++) {
      var x = padX + i * step;
      d += ' L ' + x.toFixed(1) + ' ' + y;
    }
    svg.appendChild(svgEl('path', { d: d, class: 'thread' }));

    var tagSet = {};
    (opts.tagWeeks || []).forEach(function (w) { tagSet[w] = true; });

    for (var wk = 0; wk < weeks; wk++) {
      var cx = padX + wk * step;
      var cls = 'bead';
      if (wk < opts.nowWeek) cls = 'bead bead--past';
      else if (wk === opts.nowWeek) cls = 'bead bead--now';
      var rr = (wk === opts.nowWeek) ? rNow : r;
      // milestone tag hangs above the bead
      if (tagSet[wk] && wk !== opts.nowWeek) {
        svg.appendChild(svgEl('line', { x1: cx, y1: y - r, x2: cx, y2: y - 17, class: 'tag-line' }));
        svg.appendChild(svgEl('circle', { cx: cx, cy: y - 21, r: 3.4, class: 'tag' }));
      }
      svg.appendChild(svgEl('circle', { cx: cx, cy: y, r: rr, class: cls }));
    }

    // label under the "now" bead
    var nx = padX + opts.nowWeek * step;
    var lbl = svgEl('text', { x: nx, y: y + rNow + 16, 'text-anchor': 'middle', class: 'now-label' });
    lbl.textContent = opts.nowLabel;
    svg.appendChild(lbl);

    // sparse week ticks so the strand reads as a scale
    [0, 10, 20, 30, 39].forEach(function (wk) {
      if (wk === opts.nowWeek) return;
      var tx = padX + wk * step;
      var t = svgEl('text', { x: tx, y: y + r + 15, 'text-anchor': 'middle' });
      t.textContent = 'wk ' + (wk + 1);
      svg.appendChild(t);
    });
  }

  if (F) {
    // milestone weeks (0-based GA week of each example row's start), for tags
    var tagWeeks = (F.EXAMPLE_ROWS || []).map(function (r) {
      return Math.floor(r.startOff / 7);
    });
    var strandOpts = {
      nowWeek: F.EXAMPLE_GA_WEEKS,       // 20
      nowLabel: F.EXAMPLE_GA_LABEL,      // "20+0"
      tagWeeks: tagWeeks
    };
    drawStrand(document.getElementById('hero-strand'), strandOpts);
    drawStrand(document.getElementById('scene-strand'),
      { nowWeek: F.EXAMPLE_GA_WEEKS, nowLabel: F.EXAMPLE_GA_LABEL, tagWeeks: tagWeeks, threadY: 30 });

    /* ---------- render the example timeline rows ---------- */
    var list = document.getElementById('tl-list');
    if (list) {
      var STATUS = {
        upcoming: { word: 'upcoming', glyph: '○' },
        open:     { word: 'open now', glyph: '●' },
        passed:   { word: 'passed',   glyph: '▲' },
        done:     { word: 'done',     glyph: '✓' }
      };
      F.EXAMPLE_ROWS.forEach(function (row) {
        var meta = STATUS[row.status] || STATUS.upcoming;
        var li = document.createElement('li');
        li.className = 'tl-row';

        var bead = document.createElement('span');
        bead.className = 'tl-bead tl-bead--' + row.status;
        li.appendChild(bead);

        var main = document.createElement('div');
        main.className = 'tl-main';
        var track = document.createElement('span');
        track.className = 'tl-track';
        track.textContent = row.track + ' · ';
        var label = document.createElement('span');
        label.className = 'tl-label';
        label.textContent = row.label;
        var lblLine = document.createElement('div');
        lblLine.appendChild(track); lblLine.appendChild(label);
        main.appendChild(lblLine);

        var dates = document.createElement('div');
        dates.className = 'tl-dates';
        var a = document.createElement('span'); a.textContent = row.start;
        var arr = document.createElement('span'); arr.className = 'arrow'; arr.textContent = '→';
        var b = document.createElement('span'); b.textContent = row.end;
        dates.appendChild(a); dates.appendChild(arr); dates.appendChild(b);
        main.appendChild(dates);
        li.appendChild(main);

        var pill = document.createElement('span');
        pill.className = 'pill pill--' + row.status;
        pill.textContent = meta.word + ' ' + meta.glyph;
        li.appendChild(pill);

        list.appendChild(li);
      });
    }
  }

  /* ---------- scroll-triggered scene animations ---------- */
  var animated = Array.prototype.slice.call(
    document.querySelectorAll('.anim, .strand')
  );
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          // the looping privacy figure keeps its 'in'; static scenes only need it once
          if (!entry.target.classList.contains('privacy-fig')) io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.22 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add('in'); });
  }
})();
