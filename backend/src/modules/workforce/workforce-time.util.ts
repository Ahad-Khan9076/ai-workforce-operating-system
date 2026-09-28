import { DateTime } from 'luxon';

export function getOrgDateTime(date: Date, timezone: string): DateTime {
  return DateTime.fromJSDate(date, { zone: 'utc' }).setZone(timezone);
}

export function getOrgWorkDate(date: Date, timezone: string): string {
  return getOrgDateTime(date, timezone).toISODate()!;
}

export function parseOrgWorkDate(workDate: string, timezone: string): DateTime {
  return DateTime.fromISO(workDate, { zone: timezone }).startOf('day');
}

export function combineOrgDateAndTime(
  workDate: string,
  timeHHmm: string,
  timezone: string,
): Date {
  const [hour, minute] = timeHHmm.split(':').map(Number);
  const dt = DateTime.fromISO(workDate, { zone: timezone }).set({
    hour: hour ?? 0,
    minute: minute ?? 0,
    second: 0,
    millisecond: 0,
  });
  return dt.toUTC().toJSDate();
}

export function diffMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function weekdayInOrg(date: Date, timezone: string): number {
  return getOrgDateTime(date, timezone).weekday;
}

export function isWorkingDay(
  workDate: string,
  workingDays: number[],
  timezone: string,
): boolean {
  const weekday = parseOrgWorkDate(workDate, timezone).weekday;
  return workingDays.includes(weekday);
}
