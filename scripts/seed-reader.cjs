require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    // 1) Create a reader
    const reader = await prisma.reader.create({
      data: {
        displayName: "Test Reader",
        email: "testreader@example.com",
        bio: "This is a test reader seeded into Postgres.",
        timezone: "America/New_York",
        ratePer15Min: 1500,
        ratePer30Min: 2500,
        ratePer60Min: 6000,
        acceptsTerms: true,
        marketingOptIn: false,
        isActive: true,
      },
    });

    // 2) Add a couple of availability slots for that reader
    await prisma.availabilitySlot.createMany({
      data: [
        // Monday 10:00–12:00 (in minutes since midnight)
        { readerId: reader.id, dayOfWeek: 1, startMin: 10 * 60, endMin: 12 * 60 },
        // Wednesday 14:00–16:00
        { readerId: reader.id, dayOfWeek: 3, startMin: 14 * 60, endMin: 16 * 60 },
      ],
    });

    console.log("✅ Seeded reader with availability:", reader);
  } catch (e) {
    console.error("❌ Seed failed:");
    console.error("message:", e.message);
    console.error("meta:", e.meta);
  } finally {
    await prisma.$disconnect();
  }
})();
