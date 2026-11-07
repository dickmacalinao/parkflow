export interface SlotSharing {
  ownerUserId: string | null;
  isShared: boolean;
  availableDays: number[];
  availableFromDate: Date | null;
  availableToDate: Date | null;
  availableStartTime: string | null;
  availableEndTime: string | null;
}

const DAY_MS = 86_400_000;

function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return {
    dayUtc: Date.UTC(get('year'), get('month') - 1, get('day')),
    minutes: get('hour') * 60 + get('minute'),
  };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Whether others may book the slot for [startAt, endAt). Slots without an owner are always
 * bookable; owner slots are personal unless shared, and a shared slot's window must contain
 * every local day of the stay.
 */
export function isSlotBookableByOthers(slot: SlotSharing, timeZone: string, startAt: Date, endAt: Date): boolean {
  if (!slot.ownerUserId) return true;
  if (!slot.isShared) return false;

  const windowStart = slot.availableStartTime ? toMinutes(slot.availableStartTime) : 0;
  const windowEnd = slot.availableEndTime ? toMinutes(slot.availableEndTime) : 24 * 60;
  const from = slot.availableFromDate?.toISOString().slice(0, 10);
  const to = slot.availableToDate?.toISOString().slice(0, 10);

  const first = localParts(startAt, timeZone);
  const last = localParts(new Date(endAt.getTime() - 1), timeZone);
  const end = localParts(endAt, timeZone);

  for (let day = first.dayUtc; day <= last.dayUtc; day += DAY_MS) {
    const date = new Date(day);
    if (slot.availableDays.length > 0 && !slot.availableDays.includes(date.getUTCDay())) return false;
    const iso = date.toISOString().slice(0, 10);
    if (from && iso < from) return false;
    if (to && iso > to) return false;

    const segmentStart = day === first.dayUtc ? first.minutes : 0;
    const segmentEnd = day === last.dayUtc && end.dayUtc === last.dayUtc ? end.minutes : 24 * 60;
    if (segmentStart < windowStart || segmentEnd > windowEnd) return false;
  }
  return true;
}
