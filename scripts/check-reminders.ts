import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.$queryRaw`
    SELECT email, "setupReminderCount", "setupReminderLastSentAt"
    FROM "User"
    WHERE role = 'READER' AND "setupReminderCount" = 1
    ORDER BY "setupReminderLastSentAt"
  `;

  console.log('Users with setupReminderCount = 1:');
  console.log(JSON.stringify(users, null, 2));
  console.log(`\nTotal: ${(users as any[]).length} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
