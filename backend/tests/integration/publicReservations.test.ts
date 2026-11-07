import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

vi.mock('../../src/lib/email.js', () => ({
  sendEmail: vi.fn(),
  emailTemplates: { createReservation: vi.fn(() => ({ subject: 'Request', html: 'Request' })) },
}));
vi.mock('../../src/modules/audit/audit.service.js', () => ({ recordAudit: vi.fn() }));

const app = createApp();
const ownerId = '00000000-0000-4000-8000-000000000001';
const propertyId = '00000000-0000-4000-8000-000000000002';
const slotId = '00000000-0000-4000-8000-000000000003';
const range = { startAt: '2099-01-03T10:00:00.000Z', endAt: '2099-01-03T12:00:00.000Z' };
const guest = { ...range, slotId, name: 'Guest', email: 'guest@example.com', phone: '12345678', plate: 'ABC 123', method: 'WALLET', providerRef: 'REF123' };
const slot = { id: slotId, code: 'A1', ownerUserId: ownerId, isShared: true, availableDays: [], availableFromDate: null, availableToDate: null, availableStartTime: null, availableEndTime: null, dailyRate: 24, hourlyRate: null, zone: { name: 'Zone A' }, owner: { paymentInfo: 'Pay account 123', deletedAt: null } };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(prisma.property, 'findFirst').mockResolvedValue({ id: propertyId, name: 'Property', timezone: 'UTC' } as never);
  vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: ownerId, propertyId, firstName: 'Owner', email: 'owner@example.com' } as never);
});

describe('public reservation routes', () => {
  it('rejects missing and malformed scope', async () => {
    expect((await request(app).get('/api/public/reservations')).status).toBe(400);
    expect((await request(app).get('/api/public/reservations/owner/not-a-uuid/slots').query(range)).status).toBe(400);
  });

  it('limits owner slot lookup to the owner and hides personal slots', async () => {
    const lookup = vi.spyOn(prisma.parkingSlot, 'findMany').mockResolvedValue([slot, { ...slot, id: 'private', isShared: false }] as never);
    const response = await request(app).get(`/api/public/reservations/owner/${ownerId}/slots`).query(range);
    expect(response.status).toBe(200);
    expect(response.body.slots.map((item: { id: string }) => item.id)).toEqual([slotId]);
    expect(response.body.slots[0].paymentInfo).toBe('Pay account 123');
    expect(lookup.mock.calls[0][0]?.where).toMatchObject({ ownerUserId: ownerId, zone: { propertyId } });
  });

  it('returns the payment instructions for each available slot without owner details', async () => {
    vi.spyOn(prisma.parkingSlot, 'findMany').mockResolvedValue([
      slot,
      { ...slot, id: 'second', owner: { paymentInfo: 'Other account', deletedAt: null } },
      { ...slot, id: 'unowned', ownerUserId: null, owner: null },
    ] as never);
    const response = await request(app).get(`/api/public/reservations/property/${propertyId}/slots`).query(range);
    expect(response.status).toBe(200);
    expect(response.body.slots.map((item: { paymentInfo: string | null }) => item.paymentInfo)).toEqual(['Pay account 123', 'Other account', null]);
    expect(response.body.slots[0]).not.toHaveProperty('owner');
  });

  it('rejects missing or invalid guest payment information', async () => {
    const invalidMethod = await request(app).post(`/api/public/reservations/owner/${ownerId}/reservations`).send({ ...guest, method: 'INVALID' });
    const missingReference = await request(app).post(`/api/public/reservations/owner/${ownerId}/reservations`).send({ ...guest, providerRef: ' ' });
    expect(invalidMethod.status).toBe(400);
    expect(missingReference.status).toBe(400);
  });

  it('restricts submitted slots to the owner or property in the link', async () => {
    const lookup = vi.spyOn(prisma.parkingSlot, 'findFirst').mockResolvedValue(null);
    const ownerResponse = await request(app).post(`/api/public/reservations/owner/${ownerId}/reservations`).send(guest);
    expect(ownerResponse.status).toBe(404);
    expect(lookup.mock.calls[0][0]?.where).toMatchObject({ id: slotId, ownerUserId: ownerId, zone: { propertyId } });
    const propertyResponse = await request(app).post(`/api/public/reservations/property/${propertyId}/reservations`).send(guest);
    expect(propertyResponse.status).toBe(404);
    expect(lookup.mock.calls[1][0]?.where).toMatchObject({ id: slotId, zone: { propertyId } });
    expect(lookup.mock.calls[1][0]?.where).not.toHaveProperty('ownerUserId');
  });

  it('rejects overlapping reservations', async () => {
    vi.spyOn(prisma.parkingSlot, 'findFirst').mockResolvedValue(slot as never);
    vi.spyOn(prisma.reservation, 'findFirst').mockResolvedValue({ id: 'existing' } as never);
    const response = await request(app).post(`/api/public/reservations/property/${propertyId}/reservations`).send(guest);
    expect(response.status).toBe(409);
  });

  it('creates a pending guest reservation without an account', async () => {
    vi.spyOn(prisma.parkingSlot, 'findFirst').mockResolvedValue(slot as never);
    vi.spyOn(prisma.reservation, 'findFirst').mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: 'reservation', code: 'RES-TEST', status: 'PENDING', amount: 2 });
    vi.spyOn(prisma, '$transaction').mockImplementation((async (callback: (client: unknown) => unknown) => callback({ reservation: { create }, parkingSlot: { update: vi.fn() } })) as never);
    const response = await request(app).post(`/api/public/reservations/owner/${ownerId}/reservations`).send(guest);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ code: 'RES-TEST', status: 'PENDING', amount: 2 });
    expect(create.mock.calls[0][0].data).toMatchObject({ slotId, propertyId, guestName: 'Guest', guestEmail: guest.email, guestPlate: guest.plate, type: 'VISITOR' });
    expect(create.mock.calls[0][0].data).not.toHaveProperty('requestedById');
    expect(create.mock.calls[0][0].data.payment.create).toMatchObject({ amount: 2, method: 'WALLET', status: 'PENDING', providerRef: 'REF123' });
  });
});