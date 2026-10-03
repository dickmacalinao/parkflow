import { PrismaClient, Role, UserStatus, PropertyType, PropertyStatus, SlotType, ReservationType, ReservationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Passw0rd!';

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function code(): string {
  return 'RES-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  console.log('Seeding ParkFlow demo data...');

  const passwordHash = await hash(DEMO_PASSWORD);
  const now = new Date();

  const property = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Harbor Point Residences',
      type: PropertyType.RESIDENTIAL_CONDOMINIUM,
      status: PropertyStatus.ACTIVE,
      addressLine1: '1200 Marina Boulevard',
      city: 'Metro City',
      state: 'CA',
      postalCode: '90001',
      country: 'USA',
    },
  });

  const [superAdmin, owner, manager, attendant, tenant, visitor] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'super.admin@parkflow.app' },
      update: { propertyId: null },
      create: { email: 'super.admin@parkflow.app', passwordHash, firstName: 'Sasha', lastName: 'Root', role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
    prisma.user.upsert({
      where: { email: 'owner@parkflow.app' },
      update: { propertyId: property.id },
      create: { email: 'owner@parkflow.app', passwordHash, firstName: 'Owen', lastName: 'Harbor', role: Role.PROPERTY_OWNER, propertyId: property.id, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
    prisma.user.upsert({
      where: { email: 'manager@parkflow.app' },
      update: { propertyId: property.id },
      create: { email: 'manager@parkflow.app', passwordHash, firstName: 'Mia', lastName: 'Manager', role: Role.PROPERTY_MANAGER, propertyId: property.id, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
    prisma.user.upsert({
      where: { email: 'attendant@parkflow.app' },
      update: { propertyId: property.id },
      create: { email: 'attendant@parkflow.app', passwordHash, firstName: 'Alex', lastName: 'Gatekeeper', role: Role.PARKING_ATTENDANT, propertyId: property.id, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
    prisma.user.upsert({
      where: { email: 'tenant@parkflow.app' },
      update: { propertyId: property.id },
      create: { email: 'tenant@parkflow.app', passwordHash, firstName: 'Tara', lastName: 'Tenant', role: Role.TENANT, propertyId: property.id, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
    prisma.user.upsert({
      where: { email: 'visitor@parkflow.app' },
      update: { propertyId: property.id },
      create: { email: 'visitor@parkflow.app', passwordHash, firstName: 'Val', lastName: 'Visitor', role: Role.VISITOR, propertyId: property.id, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    }),
  ]);

  await prisma.property.update({ where: { id: property.id }, data: { ownerId: owner.id } });

  await prisma.propertyManager.upsert({
    where: { propertyId_userId: { propertyId: property.id, userId: manager.id } },
    update: {},
    create: { propertyId: property.id, userId: manager.id, canApprove: true },
  });

  const zone = await prisma.parkingZone.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000002', propertyId: property.id, name: 'Level P1', sortOrder: 0 },
  });

  const slotCodes = Array.from({ length: 12 }, (_, i) => `A-${String(i + 1).padStart(2, '0')}`);
  for (const [i, slotCode] of slotCodes.entries()) {
    await prisma.parkingSlot.upsert({
      where: { zoneId_code: { zoneId: zone.id, code: slotCode } },
      update: {},
      create: {
        zoneId: zone.id,
        code: slotCode,
        type: i === 0 ? SlotType.ACCESSIBLE : i % 5 === 4 ? SlotType.EV_CHARGING : SlotType.STANDARD,
        isEvCharging: i % 5 === 4,
        dailyRate: 12,
        hourlyRate: 2,
      },
    });
  }

  const firstSlot = await prisma.parkingSlot.findFirstOrThrow({ where: { zoneId: zone.id, code: 'A-02' } });
  const existingReservation = await prisma.reservation.findFirst({ where: { slotId: firstSlot.id, requestedById: tenant.id } });
  if (!existingReservation) {
    const startAt = new Date(Date.now() + 24 * 3_600_000);
    const endAt = new Date(startAt.getTime() + 3 * 24 * 3_600_000);
    await prisma.reservation.create({
      data: {
        code: code(),
        propertyId: property.id,
        slotId: firstSlot.id,
        requestedById: tenant.id,
        type: ReservationType.TENANT,
        status: ReservationStatus.PENDING,
        startAt,
        endAt,
        rate: firstSlot.dailyRate,
        amount: 36,
        qrCodeToken: crypto.randomBytes(16).toString('hex'),
      },
    });
    await prisma.parkingSlot.update({ where: { id: firstSlot.id }, data: { status: 'RESERVED' } });
  }

  console.log('Seed complete. Demo accounts (password for all: "Passw0rd!"):');
  console.table(
    [superAdmin, owner, manager, attendant, tenant, visitor].map((u) => ({ role: u.role, email: u.email }))
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
