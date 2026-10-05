import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  PropertyStatus,
  PropertyType,
  ReservationStatus,
  ReservationType,
  Role,
  SlotApprovalStatus,
  SlotType,
  UserStatus,
} from '@prisma/client';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signAccessToken } from '../../src/utils/tokens.js';

const app = createApp();
let dbAvailable = false;

beforeAll(async () => {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'ignore' });
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('reservation ownership', () => {
  it('limits a Property Owner to reservations on slots they own', async ({ skip }) => {
    if (!dbAvailable) skip();

    const suffix = randomUUID();
    const ownerAId = randomUUID();
    const ownerBId = randomUUID();
    const tenantAId = randomUUID();
    const tenantBId = randomUUID();
    const propertyId = randomUUID();
    const zoneId = randomUUID();
    const slotIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const reservationIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];

    try {
      await prisma.property.create({
        data: {
          id: propertyId,
          name: `Owner scope test ${suffix}`,
          type: PropertyType.RESIDENTIAL_CONDOMINIUM,
          status: PropertyStatus.ACTIVE,
          addressLine1: '1 Test Street',
          city: 'Test City',
          state: 'CA',
          postalCode: '90000',
          country: 'USA',
        },
      });

      await prisma.user.createMany({
        data: [
          { id: ownerAId, email: `owner-a-${suffix}@example.com`, passwordHash: 'test', firstName: 'Owner', lastName: 'A', role: Role.PROPERTY_OWNER, status: UserStatus.ACTIVE, propertyId },
          { id: ownerBId, email: `owner-b-${suffix}@example.com`, passwordHash: 'test', firstName: 'Owner', lastName: 'B', role: Role.PROPERTY_OWNER, status: UserStatus.ACTIVE, propertyId },
          { id: tenantAId, email: `tenant-a-${suffix}@example.com`, passwordHash: 'test', firstName: 'Tenant', lastName: 'A', role: Role.TENANT, status: UserStatus.ACTIVE, propertyId },
          { id: tenantBId, email: `tenant-b-${suffix}@example.com`, passwordHash: 'test', firstName: 'Tenant', lastName: 'B', role: Role.TENANT, status: UserStatus.ACTIVE, propertyId },
        ],
      });

      await prisma.property.update({ where: { id: propertyId }, data: { ownerId: ownerBId } });

      await prisma.parkingZone.create({
        data: { id: zoneId, propertyId, name: `Zone ${suffix}` },
      });

      await prisma.parkingSlot.createMany({
        data: [
          { id: slotIds[0], zoneId, code: `A-${suffix}`, type: SlotType.STANDARD, dailyRate: 10, ownerUserId: ownerAId, approvalStatus: SlotApprovalStatus.APPROVED },
          { id: slotIds[1], zoneId, code: `B1-${suffix}`, type: SlotType.STANDARD, dailyRate: 10, ownerUserId: ownerBId, approvalStatus: SlotApprovalStatus.APPROVED },
          { id: slotIds[2], zoneId, code: `B2-${suffix}`, type: SlotType.STANDARD, dailyRate: 10, ownerUserId: ownerBId, approvalStatus: SlotApprovalStatus.APPROVED },
          { id: slotIds[3], zoneId, code: `B3-${suffix}`, type: SlotType.STANDARD, dailyRate: 10, ownerUserId: null, approvalStatus: SlotApprovalStatus.APPROVED },
        ],
      });

      const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      await prisma.reservation.createMany({
        data: [
          { id: reservationIds[0], code: `A-${suffix}`, propertyId, slotId: slotIds[0], requestedById: tenantAId, type: ReservationType.TENANT, status: ReservationStatus.PENDING, startAt, endAt, rate: 10, amount: 1, qrCodeToken: randomUUID() },
          { id: reservationIds[1], code: `B1-${suffix}`, propertyId, slotId: slotIds[1], requestedById: ownerBId, type: ReservationType.TENANT, status: ReservationStatus.PENDING, startAt, endAt, rate: 10, amount: 1, qrCodeToken: randomUUID() },
          { id: reservationIds[2], code: `B2-${suffix}`, propertyId, slotId: slotIds[2], requestedById: tenantBId, type: ReservationType.TENANT, status: ReservationStatus.PENDING, startAt, endAt, rate: 10, amount: 1, qrCodeToken: randomUUID() },
          { id: reservationIds[3], code: `B3-${suffix}`, propertyId, slotId: slotIds[3], requestedById: tenantBId, type: ReservationType.TENANT, status: ReservationStatus.PENDING, startAt, endAt, rate: 10, amount: 1, qrCodeToken: randomUUID() },
        ],
      });

      const token = signAccessToken({ sub: ownerBId, role: Role.PROPERTY_OWNER });
      const listResponse = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${token}`);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.rows.map((row: { id: string }) => row.id).sort()).toEqual(
        [reservationIds[1], reservationIds[2]].sort(),
      );

      const foreignSlotResponse = await request(app)
        .post(`/api/reservations/${reservationIds[3]}/decision`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'APPROVED' });
      expect(foreignSlotResponse.status).toBe(404);
    } finally {
      await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
      await prisma.parkingSlot.deleteMany({ where: { id: { in: slotIds } } });
      await prisma.parkingZone.delete({ where: { id: zoneId } });
      await prisma.property.update({ where: { id: propertyId }, data: { ownerId: null } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerAId, ownerBId, tenantAId, tenantBId] } } });
      await prisma.property.delete({ where: { id: propertyId } });
    }
  });
});