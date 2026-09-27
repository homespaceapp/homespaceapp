export type CycleData = {
  len: number;
  plen: number;
  starts: string[];
  ends: string[];
};

export type CellMark = {
  period?: 'real' | 'pred';
  fertile?: boolean;
  ovu?: boolean;
};

export type CycleEstimate = {
  cycleLength: number;
  periodLength: number;
  intervalCount: number;
  completedPeriodCount: number;
  cycleSource: 'history' | 'saved' | 'default';
  periodSource: 'history' | 'saved' | 'default';
  variationDays: number;
};

export type CycleStatus = CycleEstimate & {
  nextPeriodStart: string;
  nextPeriodEnd: string;
  nextOvulation: string;
};

const DAY_MS = 86_400_000;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

function epochDay(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function fromEpochDay(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(epochDay(value));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(isDateString))].sort();
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function safeSavedLength(value: number, min: number, max: number, fallback: number) {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded >= min && rounded <= max ? rounded : fallback;
}

export function addDaysStr(dateStr: string, days: number) {
  return fromEpochDay(epochDay(dateStr) + days);
}

export function diffDaysStr(from: string, to: string) {
  return epochDay(to) - epochDay(from);
}

function completedPeriodLengths(starts: string[], ends: string[]) {
  const lengths: number[] = [];

  starts.forEach((start, index) => {
    const nextStart = starts[index + 1];
    const end = ends.find(candidate => candidate >= start && (!nextStart || candidate < nextStart));
    if (!end) return;
    const length = diffDaysStr(start, end) + 1;
    // Chroni prognozę przed przypadkowym kliknięciem odległej daty. Nietypowe
    // krwawienie nadal pozostaje zapisane w historii, ale nie steruje predykcją.
    if (length >= 1 && length <= 10) lengths.push(length);
  });

  return lengths;
}

export function estimateCycle(cycle: CycleData): CycleEstimate {
  const starts = uniqueSorted(cycle.starts || []);
  const ends = uniqueSorted(cycle.ends || []);

  const intervals = starts
    .slice(1)
    .map((start, index) => diffDaysStr(starts[index], start))
    // Szeroki zakres jest wyłącznie zabezpieczeniem przed błędnym kliknięciem.
    // Nie służy do diagnozowania regularności cyklu.
    .filter(days => days >= 15 && days <= 60)
    .slice(-6);

  const savedCycleLength = safeSavedLength(cycle.len, 15, 60, DEFAULT_CYCLE_LENGTH);
  const cycleLength = intervals.length ? Math.round(median(intervals)) : savedCycleLength;
  const cycleSource: CycleEstimate['cycleSource'] = intervals.length
    ? 'history'
    : savedCycleLength !== DEFAULT_CYCLE_LENGTH
      ? 'saved'
      : 'default';

  const periodLengths = completedPeriodLengths(starts, ends);
  const savedPeriodLength = safeSavedLength(cycle.plen, 1, 10, DEFAULT_PERIOD_LENGTH);
  // Zgodnie z oczekiwaniem użytkownika długość prognozy bierze się z ostatniego
  // kompletnego zakresu początek–koniec, a nie ze średniej kilku krwawień.
  const periodLength = periodLengths.length ? periodLengths[periodLengths.length - 1] : savedPeriodLength;
  const periodSource: CycleEstimate['periodSource'] = periodLengths.length
    ? 'history'
    : savedPeriodLength !== DEFAULT_PERIOD_LENGTH
      ? 'saved'
      : 'default';

  return {
    cycleLength,
    periodLength,
    intervalCount: intervals.length,
    completedPeriodCount: periodLengths.length,
    cycleSource,
    periodSource,
    variationDays: intervals.length > 1 ? Math.max(...intervals) - Math.min(...intervals) : 0,
  };
}

export function withUpdatedEstimates(cycle: CycleData): CycleData {
  const estimate = estimateCycle(cycle);
  return {
    ...cycle,
    len: estimate.cycleLength,
    plen: estimate.periodLength,
    starts: uniqueSorted(cycle.starts || []),
    ends: uniqueSorted(cycle.ends || []),
  };
}

export function cycleMarks(cycle: CycleData | null, fromStr: string, toStr: string): Record<string, CellMark> {
  const marks: Record<string, CellMark> = {};
  if (!cycle) return marks;

  const set = (date: string, patch: CellMark) => {
    if (date < fromStr || date > toStr) return;
    marks[date] = { ...marks[date], ...patch };
  };

  const starts = uniqueSorted(cycle.starts || []);
  const ends = uniqueSorted(cycle.ends || []);
  if (!starts.length) return marks;

  const estimate = estimateCycle(cycle);

  starts.forEach((start, index) => {
    const nextStart = starts[index + 1];
    const end = ends.find(candidate => candidate >= start && (!nextStart || candidate < nextStart));
    const last = end || addDaysStr(start, estimate.periodLength - 1);
    for (let date = start; date <= last; date = addDaysStr(date, 1)) {
      set(date, { period: 'real' });
    }
  });

  const anchor = starts[starts.length - 1];
  const maxCycle = Math.max(1, Math.ceil((diffDaysStr(anchor, toStr) + estimate.cycleLength) / estimate.cycleLength)) + 1;

  for (let cycleNumber = 0; cycleNumber <= maxCycle; cycleNumber++) {
    const cycleStart = addDaysStr(anchor, cycleNumber * estimate.cycleLength);
    const ovulation = addDaysStr(cycleStart, estimate.cycleLength - 14);

    for (let offset = -5; offset <= 1; offset++) {
      const fertileDate = addDaysStr(ovulation, offset);
      if (!marks[fertileDate]?.ovu) set(fertileDate, { fertile: true });
    }
    set(ovulation, { ovu: true });

    if (cycleNumber >= 1) {
      for (let offset = 0; offset < estimate.periodLength; offset++) {
        const predictedDate = addDaysStr(cycleStart, offset);
        if (marks[predictedDate]?.period !== 'real') set(predictedDate, { period: 'pred' });
      }
    }
  }

  return marks;
}

export function cycleStatus(cycle: CycleData | null, todayStr: string): CycleStatus | null {
  if (!cycle?.starts?.length) return null;

  const starts = uniqueSorted(cycle.starts);
  const anchor = starts[starts.length - 1];
  const estimate = estimateCycle(cycle);
  const elapsed = diffDaysStr(anchor, todayStr);
  let cycleNumber = Math.max(1, Math.floor(elapsed / estimate.cycleLength));
  let nextPeriodStart = addDaysStr(anchor, cycleNumber * estimate.cycleLength);
  let nextPeriodEnd = addDaysStr(nextPeriodStart, estimate.periodLength - 1);

  // Jeżeli dziś wypada wewnątrz prognozowanego zakresu, nadal pokazujemy ten
  // zakres jako bieżący. Dopiero dzień po jego końcu przechodzimy do kolejnego.
  if (todayStr > nextPeriodEnd) {
    cycleNumber += 1;
    nextPeriodStart = addDaysStr(anchor, cycleNumber * estimate.cycleLength);
    nextPeriodEnd = addDaysStr(nextPeriodStart, estimate.periodLength - 1);
  }

  return {
    ...estimate,
    nextPeriodStart,
    nextPeriodEnd,
    nextOvulation: addDaysStr(nextPeriodStart, -14),
  };
}
