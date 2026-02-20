export const metadata = {
  title: "Pricing | Self Tape Reader — No Subscription, Pay Per Session",
  description: "Self Tape Reader is free to join. Actors only pay when they book a session. Readers keep 80% of every booking. No monthly fees, no commitments.",
  keywords: ["self tape reader pricing", "audition reader cost", "self tape help price"],
  openGraph: {
    title: "Pricing | Self Tape Reader",
    description: "Free to join. Pay only when you book. Readers keep 80%.",
    url: "https://www.selftapereader.com/pricing",
  },
  alternates: {
    canonical: "https://selftapereader.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
