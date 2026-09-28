export function toWorkDateStorage(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function workDateFromStorage(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function leaveDaysInclusive(start: Date, end: Date): number {
  const startMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endMs = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.floor((endMs - startMs) / 86400000) + 1;
}

export function eachWorkDateInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let cursor = new Date(start);
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  while (
    Date.UTC(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth(),
      cursor.getUTCDate(),
    ) <= endUtc
  ) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return dates;
}
