/**
 * The 3 fixed shift windows the café runs on: 6h–14h / 14h–22h / 22h–6h.
 * Used to show each employee only the checklist items that fall inside the
 * shift currently running, instead of the whole day's tasks at once.
 */

export type ShiftPeriod = 'morning' | 'afternoon' | 'night';

export const SHIFT_PERIOD_LABEL: Record<ShiftPeriod, string> = {
  morning:   'Ca sáng (06:00–14:00)',
  afternoon: 'Ca chiều (14:00–22:00)',
  night:     'Ca đêm (22:00–06:00)',
};

// Boundaries in minutes-from-midnight. Night wraps past midnight, so it's
// expressed as 22:00–30:00 (i.e. up to 06:00 the next day) and any time
// before 06:00 gets +24h added before comparing (see shiftPeriodOf).
const BOUNDARIES: { key: ShiftPeriod; startMin: number; endMin: number }[] = [
  { key: 'morning',   startMin: 6 * 60,  endMin: 14 * 60 },
  { key: 'afternoon', startMin: 14 * 60, endMin: 22 * 60 },
  { key: 'night',     startMin: 22 * 60, endMin: 30 * 60 },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Which shift a given "HH:MM" clock time falls into */
export function shiftPeriodOf(hhmm: string): ShiftPeriod {
  const mins = toMinutes(hhmm);
  const normalized = mins < 6 * 60 ? mins + 24 * 60 : mins;
  const match = BOUNDARIES.find((b) => normalized >= b.startMin && normalized < b.endMin);
  return match?.key ?? 'night';
}

/** Which shift is running right now */
export function currentShiftPeriod(now: Date = new Date()): ShiftPeriod {
  return shiftPeriodOf(now.toTimeString().slice(0, 5));
}

/**
 * Minutes elapsed since the given shift started — use this (not the raw
 * "HH:MM" string) to sort tasks in shift order. The night shift starts at
 * 22:00 and runs past midnight, so a plain string sort would wrongly put
 * 00:xx/02:xx ahead of 22:xx even though 22:xx happens first.
 */
export function minutesIntoShift(hhmm: string, period: ShiftPeriod): number {
  const mins  = toMinutes(hhmm);
  const start = BOUNDARIES.find((b) => b.key === period)!.startMin % (24 * 60);
  return mins >= start ? mins - start : mins + (24 * 60 - start);
}
