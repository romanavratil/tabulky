const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const verboseFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayId(): string {
  return toISODate(new Date());
}

export function shiftDate(date: string, delta: number): string {
  const d = fromISODate(date);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function formatDay(date: string): string {
  return formatter.format(fromISODate(date));
}

export function formatDayLong(date: string): string {
  return verboseFormatter.format(fromISODate(date));
}
