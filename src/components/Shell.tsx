"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRealm, type Celebration } from "@/lib/store";
import { REALM_NAME, levelOf, titleOf } from "@/lib/lore";
import { dragonFrames } from "@/lib/ascii";
import { startAmbience, stopAmbience } from "@/lib/sound";
import { Ascii, Avatar, Icon } from "./bits";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Map" },
  { href: "/fellowship", label: "Fellowship" },
  { href: "/bestiary", label: "Bestiary" },
  { href: "/expeditions", label: "Expeditions" },
];

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, me, setNight, setSound, summonDragon } = useRealm();
  const path = usePathname();

  // Sound is on by default, but browsers only allow audio after the first tap or key press.
  useEffect(() => {
    if (!state.sound) {
      stopAmbience();
      return;
    }
    const start = () => startAmbience();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [state.sound]);

  // Secret door: the Konami code.
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const want = KONAMI[i];
      i = e.key.toLowerCase() === want.toLowerCase() ? i + 1 : e.key === KONAMI[0] ? 1 : 0;
      if (i === KONAMI.length) {
        i = 0;
        summonDragon();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [summonDragon]);

  if (!me) return null;
  const isMap = path === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[2000] btn">
        Skip to content
      </a>
      <header className="relative z-[1000] border-b-[1.5px] border-ink bg-vellum">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Link href="/" className="ribbon text-lg leading-tight sm:text-xl" aria-label={`${REALM_NAME}, go to the map`}>
            {REALM_NAME}
          </Link>

          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center whitespace-nowrap px-3 font-bold underline-offset-[6px] decoration-2 ${
                    active ? "underline decoration-gold" : "text-ink-soft hover:text-ink hover:underline"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn sketch !px-2.5"
              onClick={() => setNight(!state.night)}
              aria-label={state.night ? "Switch to day" : "Switch to night"}
              title={state.night ? "Day" : "Night"}
            >
              {state.night ? <Icon.sun /> : <Icon.moon />}
            </button>
            <button
              className="btn sketch !px-2.5"
              onClick={() => setSound(!state.sound)}
              aria-pressed={state.sound}
              aria-label="Sound"
              title={state.sound ? "Sound on" : "Sound off"}
            >
              {state.sound ? <Icon.sound /> : <Icon.mute />}
            </button>
            <Link
              href={`/fellowship/${me.id}`}
              className="flex min-h-[44px] items-center gap-2 rounded-lg px-1"
              aria-label={`Your profile: ${me.name}, level ${levelOf(me.xp)}`}
            >
              <Avatar face={me.avatar} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block font-bold">{me.name}</span>
                <span className="block text-sm italic text-ink-soft">
                  Lv {levelOf(me.xp)} · {titleOf(me.xp)}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className={isMap ? "relative flex-1" : "flex-1"}>
        {children}
      </main>

      <Celebrations />
      <DancingDragon />
    </div>
  );
}

function Celebrations() {
  const { celebrations, dismiss } = useRealm();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[1500] flex flex-col items-center gap-2 px-4 sm:bottom-8"
    >
      <AnimatePresence>
        {celebrations.slice(-3).map((c) => (
          <Toast key={c.id} c={c} onDone={() => dismiss(c.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ c, onDone }: { c: Celebration; onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = setTimeout(() => done.current(), c.kind === "notice" ? 7000 : c.kind === "xp" ? 2600 : 4500);
    return () => clearTimeout(t);
  }, [c.kind]);

  if (c.kind === "firstPin") return <Confetti />;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: 8 }}
      className={`pointer-events-auto paper sketch px-5 py-2.5 text-center ${c.kind === "level" ? "py-4" : ""}`}
    >
      {c.kind === "level" ? (
        <>
          <p className="font-[family-name:var(--font-display)] text-2xl">{c.text}</p>
          <p className="italic">
            New title: <strong>{c.title}</strong>
          </p>
        </>
      ) : (
        <p className={c.kind === "notice" ? "font-bold text-door" : "font-bold"}>{c.text}</p>
      )}
    </motion.div>
  );
}

function Confetti() {
  const reduce = useReducedMotion();
  const [bits] = useState(() =>
    Array.from({ length: 46 }, (_, i) => ({
      i,
      x: (Math.random() - 0.5) * 700,
      y: -200 - Math.random() * 360,
      r: Math.random() * 540 - 270,
      c: ["var(--gold)", "var(--moss)", "var(--door)", "var(--river)"][i % 4],
      ch: ["*", "+", "~", "o", "·"][i % 5],
    })),
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[1600] grid place-items-center" role="status">
      <p className="paper sketch px-5 py-3 text-center text-lg font-bold">Your first flag! The realm grows.</p>
      {!reduce &&
        bits.map((b) => (
          <motion.span
            key={b.i}
            className="absolute font-[family-name:var(--font-ascii)] text-2xl font-bold"
            style={{ color: b.c }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: b.x, y: [0, b.y, b.y + 520], opacity: [1, 1, 0], rotate: b.r }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            aria-hidden
          >
            {b.ch}
          </motion.span>
        ))}
    </div>
  );
}

function DancingDragon() {
  const { dragon, dismissDragon } = useRealm();
  const reduce = useReducedMotion();
  const [f, setF] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dragon) return;
    closeRef.current?.focus();
    const tick = reduce ? null : setInterval(() => setF((n) => (n + 1) % dragonFrames.length), 260);
    const end = setTimeout(dismissDragon, 9000);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && dismissDragon();
    window.addEventListener("keydown", esc);
    return () => {
      if (tick) clearInterval(tick);
      clearTimeout(end);
      window.removeEventListener("keydown", esc);
    };
  }, [dragon, reduce, dismissDragon]);

  return (
    <AnimatePresence>
      {dragon && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="A dragon appears and dances"
          className="fixed inset-0 z-[1700] grid place-items-center bg-[rgb(18_14_10/0.5)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissDragon}
        >
          <motion.div
            className="paper sketch p-6 text-center"
            initial={reduce ? false : { scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -10, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 0.52, repeat: Infinity }}
            >
              <Ascii art={dragonFrames[f]} className="text-base text-moss sm:text-lg" />
            </motion.div>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl">Wait, that dragon is dancing?!</p>
            <p className="hint">You found the secret door.</p>
            <button ref={closeRef} className="btn sketch mt-4" onClick={dismissDragon}>
              Bow and leave
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
