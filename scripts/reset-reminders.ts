import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "User"
    SET "setupReminderCount" = 0, "setupReminderLastSentAt" = NULL
    WHERE email IN (
      'flight23ww@gmail.com',
      'trina.escartin@gmail.com',
      'carlybalog@gmail.com',
      'shawnburke47@gmail.com',
      'marlaseidell@gmail.com',
      'bmw4acting@gmail.com'
    )
  `;

  console.log(`Updated ${result} users`);
  
  // Verify the update
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'flight23ww@gmail.com',
          'trina.escartin@gmail.com',
          'carlybalog@gmail.com',
          'shawnburke47@gmail.com',
          'marlaseidell@gmail.com',
          'bmw4acting@gmail.com'
        ]
      }
    },
    select: {
      email: true,
      setupReminderCount: true,
      setupReminderLastSentAt: true,
    }
  });

  console.log('\nVerification:');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
