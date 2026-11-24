import { Suspense } from "react";
import { TavernScreen } from "@/components/TavernScreen";

// Pages render behind the Fellowship gate from browser storage, so Next.js
// cannot pre-check them for instant navigation.
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<p className="hint p-8">Opening the tavern door…</p>}>
      <TavernScreen />
    </Suspense>
  );
}
