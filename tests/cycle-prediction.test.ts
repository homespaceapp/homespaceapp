import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDaysStr,
  cycleMarks,
  cycleStatus,
  estimateCycle,
  withUpdatedEstimates,
  type CycleData,
} from '../lib/cycle-prediction';

const currentHistory: CycleData = {
  len: 28,
  plen: 5,
  starts: ['2026-08-09', '2026-09-06'],
  ends: ['2026-08-12'],
};

test('liczy cykl od pierwszego dnia okresu do pierwszego dnia kolejnego', () => {
  const estimate = estimateCycle(currentHistory);
  assert.equal(estimate.cycleLength, 28);
  assert.equal(estimate.intervalCount, 1);
  assert.equal(estimate.cycleSource, 'history');
});

test('bierze długość prognozowanego okresu z ostatniego kompletnego zakresu', () => {
  const estimate = estimateCycle(currentHistory);
  assert.equal(estimate.periodLength, 4);
  assert.equal(estimate.periodSource, 'history');
});

test('dla bieżących danych przewiduje okres 4–7 października', () => {
  const status = cycleStatus(currentHistory, '2026-09-27');
  assert.equal(status?.nextPeriodStart, '2026-10-04');
  assert.equal(status?.nextPeriodEnd, '2026-10-07');
});

test('w trakcie prognozowanego okresu nie przeskakuje od razu do kolejnego cyklu', () => {
  const status = cycleStatus(currentHistory, '2026-10-05');
  assert.equal(status?.nextPeriodStart, '2026-10-04');
  assert.equal(status?.nextPeriodEnd, '2026-10-07');
});

test('dzień po końcu zakresu pokazuje następny przewidywany okres', () => {
  const status = cycleStatus(currentHistory, '2026-10-08');
  assert.equal(status?.nextPeriodStart, '2026-11-01');
  assert.equal(status?.nextPeriodEnd, '2026-11-04');
});

test('mediana ostatnich cykli ogranicza wpływ pojedynczego odchylenia', () => {
  const cycle: CycleData = {
    len: 28,
    plen: 5,
    starts: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-04-20'],
    ends: [],
  };
  const estimate = estimateCycle(cycle);
  assert.equal(estimate.cycleLength, 28);
  assert.equal(estimate.variationDays, 25);
});

test('przy jednej dacie używa fallbacku 28 dni i 5 dni okresu', () => {
  const cycle: CycleData = { len: 28, plen: 5, starts: ['2026-09-06'], ends: [] };
  const estimate = estimateCycle(cycle);
  assert.equal(estimate.cycleLength, 28);
  assert.equal(estimate.periodLength, 5);
  assert.equal(estimate.cycleSource, 'default');
  assert.equal(estimate.periodSource, 'default');
});

test('oznacza przyszły zakres jako prognozę, a zapisany jako fakt', () => {
  const marks = cycleMarks(currentHistory, '2026-09-01', '2026-10-31');
  assert.equal(marks['2026-09-06']?.period, 'real');
  assert.equal(marks['2026-10-04']?.period, 'pred');
  assert.equal(marks['2026-10-07']?.period, 'pred');
  assert.equal(marks['2026-10-08']?.period, undefined);
});

test('aktualizuje zapisane parametry po dodaniu historii', () => {
  const updated = withUpdatedEstimates(currentHistory);
  assert.equal(updated.len, 28);
  assert.equal(updated.plen, 4);
});

test('dodawanie dni działa przez zmianę miesiąca i roku', () => {
  assert.equal(addDaysStr('2026-12-20', 28), '2027-01-17');
});
