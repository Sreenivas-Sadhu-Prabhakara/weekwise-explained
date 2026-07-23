'use strict';
/* Re-derive every date the explainer asserts, two independent ways:
   (1) with the facts module's own engine slice, and
   (2) against the REAL weekwise app engine, so the explainer can never
       drift from the app it explains. If the weekwise engine isn't
       present next to this repo, those cross-checks are skipped (but the
       internal invariants still run and must pass). */
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../data/facts.js');

// Try to load the real weekwise engine sitting beside this repo.
let ENGINE = null;
try { ENGINE = require('../../weekwise/data/engine.js'); } catch (_) { /* optional */ }

test('EDD = LMP + 280 days (Naegele 280-day form)', () => {
  assert.equal(F.TERM_DAYS, 280);
  assert.equal(F._fn.edd('2026-01-05'), '2026-10-12');
  assert.equal(F.EXAMPLE_EDD, '2026-10-12');
});

test('EDD ↔ LMP inversion is exact', () => {
  assert.equal(F._fn.lmpFromEdd(F.EXAMPLE_EDD), F.EXAMPLE_LMP);
  assert.equal(F._fn.edd(F._fn.lmpFromEdd('2026-10-12')), '2026-10-12');
});

test('example "today" is exactly 20+0 weeks after LMP', () => {
  assert.equal(F.EXAMPLE_TODAY, '2026-05-25');
  assert.equal(F.EXAMPLE_GA_LABEL, '20+0');
  assert.equal(F.EXAMPLE_GA_WEEKS, 20);
  assert.equal(F.EXAMPLE_GA_DAYS, 140);
});

test('days-to-EDD from the example today', () => {
  assert.equal(F.EXAMPLE_DAYS_TO_EDD, 140); // 280 − 140
});

test('gestational-age math: weeks + remainder', () => {
  assert.deepEqual(
    { w: F._fn.gaOn('2026-01-05', '2026-01-05').weeks, r: F._fn.gaOn('2026-01-05', '2026-01-05').rem },
    { w: 0, r: 0 }
  );
  const g = F._fn.gaOn('2026-01-05', '2026-01-19'); // 14 days
  assert.equal(g.label, '2+0');
  assert.equal(F._fn.gaOn('2026-01-05', '2026-01-04'), null); // before LMP → no negative age
});

test('leap-day arithmetic clamps correctly through Feb 2028', () => {
  // 2028 is a leap year; +280 days must count Feb 29.
  assert.equal(F._fn.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(F._fn.addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(F._fn.diffDays('2028-02-28', '2028-03-01'), 2);
});

test('milestone windows are re-dated from the example LMP with correct statuses', () => {
  const byId = Object.fromEntries(F.EXAMPLE_ROWS.map(r => [r.id, r]));
  assert.deepEqual(
    { s: byId['n-dating'].start, e: byId['n-dating'].end, st: byId['n-dating'].status },
    { s: '2026-03-23', e: '2026-04-13', st: 'passed' }
  );
  assert.deepEqual(
    { s: byId['n-anomaly'].start, e: byId['n-anomaly'].end, st: byId['n-anomaly'].status },
    { s: '2026-05-11', e: '2026-05-31', st: 'open' } // the currently-open window
  );
  assert.deepEqual(
    { s: byId['m-anc3'].start, e: byId['m-anc3'].end, st: byId['m-anc3'].status },
    { s: '2026-07-20', e: '2026-08-31', st: 'upcoming' }
  );
  assert.deepEqual(
    { s: byId['n-40w'].start, e: byId['n-40w'].end, st: byId['n-40w'].status },
    { s: '2026-10-12', e: '2026-10-18', st: 'upcoming' }
  );
  // ANC-1 opens at LMP and closes at 12w → already passed at 20w.
  assert.equal(byId['m-anc1'].start, '2026-01-05');
  assert.equal(byId['m-anc1'].status, 'passed');
});

test('the anomaly window contains the example today (it is genuinely "open")', () => {
  const anomaly = F.EXAMPLE_ROWS.find(r => r.id === 'n-anomaly');
  assert.ok(anomaly.start <= F.EXAMPLE_TODAY && F.EXAMPLE_TODAY <= anomaly.end);
});

test('every asserted date is a valid ISO YYYY-MM-DD', () => {
  const dates = [F.EXAMPLE_LMP, F.EXAMPLE_EDD, F.EXAMPLE_TODAY]
    .concat(F.EXAMPLE_ROWS.flatMap(r => [r.start, r.end]));
  for (const d of dates) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});

test('CROSS-CHECK against the real weekwise engine (if present)', (t) => {
  if (!ENGINE) { t.skip('weekwise/data/engine.js not found beside this repo'); return; }
  // Same constant.
  assert.equal(ENGINE.TERM_DAYS, F.TERM_DAYS);
  // Same EDD, same GA label, same days-to-EDD.
  assert.equal(ENGINE.edd(F.EXAMPLE_LMP), F.EXAMPLE_EDD);
  assert.equal(ENGINE.gaOn(F.EXAMPLE_LMP, F.EXAMPLE_TODAY).label, F.EXAMPLE_GA_LABEL);
  assert.equal(ENGINE.daysToEdd(F.EXAMPLE_EDD, F.EXAMPLE_TODAY), F.EXAMPLE_DAYS_TO_EDD);
  // Same window dates and statuses for every example row.
  for (const r of F.EXAMPLE_ROWS) {
    const [s, e] = ENGINE.windowDates(r.startOff, r.endOff, F.EXAMPLE_LMP);
    assert.equal(s, r.start, `${r.id} start`);
    assert.equal(e, r.end, `${r.id} end`);
    assert.equal(ENGINE.statusOf(s, e, F.EXAMPLE_TODAY, false), r.status, `${r.id} status`);
  }
});
