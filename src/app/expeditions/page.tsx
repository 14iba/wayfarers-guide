import { ExpeditionsScreen } from "@/components/Screens";

// Pages render behind the Fellowship gate from browser storage, so Next.js
// cannot pre-check them for instant navigation.
export const instant = false;

export default function Page() {
  return <ExpeditionsScreen />;
}
