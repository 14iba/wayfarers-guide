import { Suspense } from "react";
import { ProfileScreen } from "@/components/Screens";

// Pages render behind the Fellowship gate from browser storage, so Next.js
// cannot pre-check them for instant navigation.
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<p className="hint p-8">Finding the wanderer…</p>}>
      <ProfileScreen />
    </Suspense>
  );
}
