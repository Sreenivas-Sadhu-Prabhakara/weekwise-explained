/* ============================================================
   weekwise-explained — the worked-example facts shown on the page.
   NOTHING here is hand-typed as a date: every ISO date is DERIVED
   at load time by the SAME calendar engine the weekwise app uses
   (UTC epoch-day math, 280-day Naegele rule, offset windows).
   The self-test in test/facts.test.js re-derives all of it and
   asserts the exact values, so a stale date can never ship.

   Dual export: browser global (WEEKWISE_FACTS) + Node (module.exports).
   This file is standalone — it embeds the tiny slice of the engine it
   needs so the explainer stays a self-contained repo, and the test
   proves that slice against the real weekwise engine's constants.
   ============================================================ */
(function () {
  'use strict';

  /* ---- constants, cited to the same sources weekwise cites ---- */
  const TERM_DAYS = 280;      // Naegele's rule, 280-day form (Royal Berkshire NHS FT, May 2026)
  const POST_TERM_DAYS = 294; // 42+0 weeks (NHS due-date calculator)
  const MS_DAY = 86400000;
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, mo) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  }
  function parseISO(iso) {
    const m = ISO_RE.exec(String(iso));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y, mo, d };
  }
  function toEpochDay(iso) {
    const p = parseISO(iso);
    return p ? Math.round(Date.UTC(p.y, p.mo - 1, p.d) / MS_DAY) : null;
  }
  function fromEpochDay(n) {
    const dt = new Date(n * MS_DAY);
    const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${mo}-${d}`;
  }
  function addDays(iso, n) {
    const e = toEpochDay(iso);
    return e === null ? null : fromEpochDay(e + n);
  }
  function diffDays(a, b) {
    const x = toEpochDay(a), y = toEpochDay(b);
    return (x === null || y === null) ? null : y - x;
  }

  /* EDD = LMP + 280 days (canonical 280-day Naegele's rule). */
  function edd(lmp) { return addDays(lmp, TERM_DAYS); }
  /* Exact inverse: LMP = EDD − 280 days (scan-EDD entry path). */
  function lmpFromEdd(e) { return addDays(e, -TERM_DAYS); }
  /* Gestational age on a date: weeks + remainder days. */
  function gaOn(lmp, on) {
    const d = diffDays(lmp, on);
    if (d === null || d < 0) return null;
    return { days: d, weeks: Math.floor(d / 7), rem: d % 7, label: `${Math.floor(d / 7)}+${d % 7}` };
  }
  /* A milestone window in real calendar dates, from LMP-day offsets. */
  function windowDates(startOff, endOff, lmp) {
    return [addDays(lmp, startOff), addDays(lmp, endOff)];
  }
  /* Status of a dated window against a frozen "today" (ticked wins upstream). */
  function statusOf(startIso, endIso, todayIso) {
    const t = toEpochDay(todayIso), s = toEpochDay(startIso), e = toEpochDay(endIso);
    if (t === null || s === null || e === null) return 'unknown';
    if (t < s) return 'upcoming';
    if (t > e) return 'passed';
    return 'open';
  }

  /* ---- the frozen worked example the page narrates ----
     A deliberately fixed LMP so the page tells the same story every load;
     "today" is pinned to exactly 20+0 weeks so the anomaly scan is the
     currently-open window. This is an EXAMPLE, not the reader's pregnancy. */
  const EXAMPLE_LMP = '2026-01-05';
  const EXAMPLE_EDD = edd(EXAMPLE_LMP);                 // 2026-10-12
  const EXAMPLE_TODAY = addDays(EXAMPLE_LMP, 140);      // 20+0 weeks → 2026-05-25
  const exGa = gaOn(EXAMPLE_LMP, EXAMPLE_TODAY);

  /* Milestone rows re-dated from the example LMP. Offsets and citations
     mirror data/timeline.js in the weekwise app (GA-day offsets). */
  function row(id, label, track, startOff, endOff) {
    const [start, end] = windowDates(startOff, endOff, EXAMPLE_LMP);
    return {
      id, label, track, startOff, endOff, start, end,
      status: statusOf(start, end, EXAMPLE_TODAY)
    };
  }
  const EXAMPLE_ROWS = [
    row('m-anc1', 'MoHFW ANC visit 1 (within 12 weeks)', 'MoHFW', 0, 84),
    row('n-dating', 'NHS 11–14 week dating scan', 'NHS', 77, 98),
    row('n-anomaly', 'NHS 18+0–20+6 anomaly scan', 'NHS', 126, 146),
    row('m-anc3', 'MoHFW ANC visit 3 (28–34 weeks)', 'MoHFW', 196, 238),
    row('n-40w', 'NHS 40-week appointment', 'NHS', 280, 286)
  ];

  const FACTS = {
    TERM_DAYS,
    POST_TERM_DAYS,
    DUE_DATE_ON_TIME_PCT: 4.4, // Royal Berkshire NHS FT, May 2026 — "only ~1 in 20"
    EXAMPLE_LMP,
    EXAMPLE_EDD,
    EXAMPLE_TODAY,
    EXAMPLE_GA_LABEL: exGa.label,          // "20+0"
    EXAMPLE_GA_WEEKS: exGa.weeks,          // 20
    EXAMPLE_GA_DAYS: exGa.days,            // 140
    EXAMPLE_DAYS_TO_EDD: diffDays(EXAMPLE_TODAY, EXAMPLE_EDD), // 140
    EXAMPLE_TRIMESTER: '2nd trimester',    // NHS grouping: weeks 13–27
    EXAMPLE_ROWS,
    // engine helpers, exported so the test can prove the page slice
    // matches the real weekwise engine
    _fn: { edd, lmpFromEdd, gaOn, windowDates, statusOf, addDays, diffDays }
  };

  if (typeof module !== 'undefined') module.exports = FACTS;
  else globalThis.WEEKWISE_FACTS = FACTS;
})();
