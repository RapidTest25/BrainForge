import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const passwordHash = await bcryptjs.hash('Password123!', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@brainforge.dev' },
    update: {},
    create: {
      email: 'test@brainforge.dev',
      name: 'Test User',
      passwordHash,
    },
  });

  // Create a default team
  const team = await prisma.team.upsert({
    where: { id: 'default-team' },
    update: {},
    create: {
      id: 'default-team',
      name: 'My Workspace',
      description: 'Default workspace',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('✅ Seed complete');
  console.log(`   User: ${user.email}`);
  console.log(`   Team: ${team.name} (${team.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
