import { describe, expect, it } from 'vitest';
import { isSlotBookableByOthers, type SlotSharing } from '../../src/modules/parking/slotAvailability.js';

const MANILA = 'Asia/Manila'; // UTC+8, no DST
// Sat 2026-11-07 and Sun 2026-11-08 in Manila.
const at = (day: number, hour: number, minute = 0) => new Date(Date.UTC(2026, 10, day, hour - 8, minute));

const shared = (overrides: Partial<SlotSharing> = {}): SlotSharing => ({
  ownerUserId: 'owner-1',
  isShared: true,
  availableDays: [],
  availableFromDate: null,
  availableToDate: null,
  availableStartTime: null,
  availableEndTime: null,
  ...overrides,
});

describe('isSlotBookableByOthers', () => {
  it('always allows slots without an owner', () => {
    expect(isSlotBookableByOthers(shared({ ownerUserId: null, isShared: false }), MANILA, at(9, 10), at(9, 12))).toBe(true);
  });

  it('keeps an unshared owner slot personal', () => {
    expect(isSlotBookableByOthers(shared({ isShared: false }), MANILA, at(7, 10), at(7, 12))).toBe(false);
  });

  it('allows any time for a shared slot with no window', () => {
    expect(isSlotBookableByOthers(shared(), MANILA, at(9, 10), at(10, 10))).toBe(true);
  });

  it('allows a weekend-only stay and rejects one touching a weekday', () => {
    const weekend = shared({ availableDays: [0, 6] });
    expect(isSlotBookableByOthers(weekend, MANILA, at(7, 10), at(8, 10))).toBe(true);
    expect(isSlotBookableByOthers(weekend, MANILA, at(6, 22), at(7, 10))).toBe(false);
    expect(isSlotBookableByOthers(weekend, MANILA, at(8, 10), at(9, 10))).toBe(false);
  });

  it('evaluates days in the property timezone, not UTC', () => {
    const weekend = shared({ availableDays: [0, 6] });
    // Sat 00:30 Manila is still Friday in UTC.
    expect(isSlotBookableByOthers(weekend, MANILA, at(7, 0, 30), at(7, 12))).toBe(true);
    expect(isSlotBookableByOthers(weekend, 'UTC', at(7, 0, 30), at(7, 12))).toBe(false);
  });

  it('treats an end at local midnight as the end of the previous day', () => {
    const saturdayOnly = shared({ availableDays: [6] });
    expect(isSlotBookableByOthers(saturdayOnly, MANILA, at(7, 10), at(8, 0))).toBe(true);
  });

  it('enforces the daily time window', () => {
    const daytime = shared({ availableStartTime: '08:00', availableEndTime: '18:00' });
    expect(isSlotBookableByOthers(daytime, MANILA, at(7, 9), at(7, 17))).toBe(true);
    expect(isSlotBookableByOthers(daytime, MANILA, at(7, 7), at(7, 12))).toBe(false);
    expect(isSlotBookableByOthers(daytime, MANILA, at(7, 10), at(8, 0))).toBe(false);
  });

  it('enforces the date range inclusively', () => {
    const range = shared({ availableFromDate: new Date('2026-11-07'), availableToDate: new Date('2026-11-07') });
    expect(isSlotBookableByOthers(range, MANILA, at(7, 10), at(7, 12))).toBe(true);
    expect(isSlotBookableByOthers(range, MANILA, at(6, 10), at(7, 12))).toBe(false);
    expect(isSlotBookableByOthers(range, MANILA, at(7, 10), at(8, 10))).toBe(false);
  });
});
