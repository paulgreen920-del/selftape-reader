import { checkReaderOnboardingStatus } from "../lib/onboarding-checker";
import { prisma } from "../lib/prisma";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "angelinajolie@selftape-help.com" },
  });
  if (!user) {
    console.log("User not found");
    process.exit(1);
  }
  const status = await checkReaderOnboardingStatus(user.id);
  console.log("Onboarding status for:", user.email);
  console.log(JSON.stringify(status, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
