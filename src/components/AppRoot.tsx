"use client";

import { RealmProvider, useRealm } from "@/lib/store";
import { Gate } from "./Gate";
import { Shell } from "./Shell";
import { Ascii } from "./bits";
import { lantern } from "@/lib/ascii";

function Inner({ children }: { children: React.ReactNode }) {
  const { ready, me } = useRealm();
  if (!ready)
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <div className="text-center">
          <Ascii art={lantern} className="text-ink-soft" />
          <p className="hint mt-2">Lighting the lanterns…</p>
        </div>
      </div>
    );
  if (!me) return <Gate />;
  return <Shell>{children}</Shell>;
}

export function AppRoot({ children }: { children: React.ReactNode }) {
  return (
    <RealmProvider>
      <Inner>{children}</Inner>
    </RealmProvider>
  );
}
