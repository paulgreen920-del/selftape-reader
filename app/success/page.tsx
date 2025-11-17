// app/success/page.tsx
import Stripe from "stripe";
import { redirect } from "next/navigation";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const sessionId =
    (typeof searchParams.session_id === "string" && searchParams.session_id) || "";

  if (!sessionId) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Payment completed</h1>
        <p className="text-gray-600 mt-2">Missing session_id in URL.</p>
      </main>
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY!;
  const stripe = new Stripe(secret);

  // Look up the Checkout Session → get our bookingId from metadata
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const bookingId = session?.metadata?.bookingId;

  if (!bookingId) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Payment completed</h1>
        <p className="text-gray-600 mt-2">
          We couldn't find a bookingId. If you reached this page directly, please complete checkout
          again.
        </p>
      </main>
    );
  }

  // Instant redirect to your detailed success page
  redirect(`/checkout/success?bookingId=${bookingId}`);
}
