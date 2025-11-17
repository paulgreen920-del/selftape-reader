import { Suspense } from "react";
import AvailabilityForm from "./AvailabilityForm";

export const dynamic = "force-dynamic";

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-6">Loading...</div>}>
      <AvailabilityForm />
    </Suspense>
  );
}