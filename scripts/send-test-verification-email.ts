// scripts/send-test-verification-email.ts
import { sendVerificationEmail } from '../lib/email-verification';

(async () => {
  const result = await sendVerificationEmail('paulgreen920@gmail.com', 'Paul Green');
  console.log(result);
})();
