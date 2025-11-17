// scripts/create-admin.cjs
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function main() {
  // 👉 CHANGE THESE TWO VALUES to whatever you want for the admin user
  const adminEmail = "admin@example.com";
  const plainPassword = "TempAdminPass123!";

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
    },
    create: {
      id: randomUUID(),          // 👈 give Prisma a String id
      email: adminEmail,
      name: "Admin User",
      password: hashedPassword,
      // If your schema requires other non-null fields with no defaults,
      // Prisma will tell us and we can add them here.
    },
  });

  console.log("Admin user created/updated:");
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  console.log(
    "TEMP PASSWORD:",
    plainPassword,
    "(change this after first login!)"
  );
}

main()
  .catch((e) => {
    console.error("Error creating admin user:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
