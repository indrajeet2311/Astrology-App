export interface WallTimeChoice {
  instant: string;
  label: string;
  offset: string;
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]));
}

function offsetText(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const total = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Returns both UTC instants when a clock repeats, and none when the local time was skipped by DST. */
export function wallTimeChoices(date: string, time: string, timeZone: string): WallTimeChoice[] {
  if (!date || !time || !timeZone) return [];
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallMs = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set<number>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    offsets.add(offsetMinutes(new Date(wallMs + hours * 3_600_000), timeZone));
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const choices = [...offsets].flatMap((offset) => {
    const instant = new Date(wallMs - offset * 60_000);
    const parts = formatter.formatToParts(instant);
    const value = (key: string) => parts.find((part) => part.type === key)?.value;
    if (Number(value('year')) !== year || Number(value('month')) !== month || Number(value('day')) !== day
        || Number(value('hour')) !== hour || Number(value('minute')) !== minute) return [];
    const shortZone = new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: 'short' })
      .formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
    return [{
      instant: instant.toISOString(),
      offset: offsetText(offset),
      label: `${shortZone ?? timeZone} (${offsetText(offset)})`,
    }];
  });
  return choices.sort((a, b) => a.instant.localeCompare(b.instant));
}