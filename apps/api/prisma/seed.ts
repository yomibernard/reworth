/**
 * ReWorth Prisma seed — Super Admin bootstrap.
 *
 * Permission matrix: see docs/RBAC.md
 *
 * Env:
 *   ADMIN_SUPER_EMAIL
 *   ADMIN_SUPER_PASSWORD
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_SUPER_EMAIL ?? 'admin@example.com')
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_SUPER_PASSWORD ?? 'change-me-strong-password';

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      emailVerifiedAt: new Date(),
      passwordHash,
      status: 'ACTIVE',
      profile: {
        create: {
          displayName: 'Super Admin',
          preferredCommunity: '',
          language: 'en-NG',
          currency: 'NGN',
        },
      },
      roles: {
        create: { role: AdminRole.SUPER_ADMIN },
      },
      verifications: {
        create: {
          level: 'L2_EMAIL',
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    update: {
      passwordHash,
      status: 'ACTIVE',
    },
    include: { roles: true },
  });

  const hasSuper = user.roles.some((r) => r.role === AdminRole.SUPER_ADMIN);
  if (!hasSuper) {
    await prisma.userRole.create({
      data: { userId: user.id, role: AdminRole.SUPER_ADMIN },
    });
  }

  // eslint-disable-next-line no-console
  console.info(`[seed] Super Admin ready: ${email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
