import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Default store
  const store = await prisma.store.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Store',
      currency: 'PKR',
    },
  });

  // Admin user
  const email = 'admin@pos.com';
  const password = 'admin123';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: 'System Admin',
        role: Role.ADMIN,
        storeId: store.id,
      },
    });
    console.log(`Created admin user: ${email} / ${password}`);
  } else {
    console.log(`Admin user ${email} already exists — skipping.`);
  }

  // Default tax rate (GST 17% — adjust to your jurisdiction)
  await prisma.taxRate.upsert({
    where: { name: 'GST 17%' },
    update: {},
    create: { name: 'GST 17%', rate: 17.0 },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
