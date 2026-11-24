"use client";

import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useRealm } from "@/lib/store";
import { AVATARS, CLASSES, OATHS, OATH_IDS, PASSPHRASE, REALM_NAME } from "@/lib/lore";
import { doorAjar, doorClosed, doorOpen } from "@/lib/ascii";
import { Ascii } from "./bits";
import { clink } from "@/lib/sound";
import type { OathId } from "@/lib/types";

type Step = "phrase" | "opening" | "who";

export function Gate() {
  const { enter, state, remote, unlock } = useRealm();
  const [checking, setChecking] = useState(false);
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("phrase");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [frame, setFrame] = useState(0);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [cls, setCls] = useState(CLASSES[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [oaths, setOaths] = useState<OathId[]>([]);
  const ids = { phrase: useId(), name: useId(), cls: useId() };

  // The one orchestrated moment: the round door swings open.
  useEffect(() => {
    if (step !== "opening") return;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- skip the animation entirely
      setFrame(2);
      setStep("who");
      return;
    }
    const a = setTimeout(() => setFrame(1), 350);
    const b = setTimeout(() => setFrame(2), 800);
    const c = setTimeout(() => setStep("who"), 1700);
    return () => [a, b, c].forEach(clearTimeout);
  }, [step, reduce]);

  const door = [doorClosed, doorAjar, doorOpen][frame];
  const returning = state.members.filter((m) => !m.sample);

  async function tryPhrase(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    setError("");
    let ok = false;
    if (remote) {
      setChecking(true);
      try {
        ok = await unlock(phrase.trim());
      } catch (err) {
        setError((err as Error).message);
        setChecking(false);
        return;
      }
      setChecking(false);
    } else {
      ok = phrase.trim().toLowerCase() === PASSPHRASE;
    }
    if (ok) {
      if (state.sound) clink();
      setStep("opening");
    } else {
      setError("That's not the phrase. Ask the Fellowship for it.");
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Pick a name so the Fellowship knows it's you.");
      return;
    }
    enter({ name: name.trim(), cls, avatar, oaths });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center px-4 py-10 sm:py-14">
      <p className="hint not-italic text-center">A Wayfarer&rsquo;s Guide to</p>
      <h1 className="mt-1 text-center text-[clamp(2rem,6vw,3.4rem)]">{REALM_NAME}</h1>

      <div className="relative mt-6 w-full overflow-hidden">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-fit"
        >
          {frame > 0 && (
            <div
              aria-hidden
              className="absolute left-1/2 top-[62%] h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/50 blur-2xl transition-opacity duration-700"
            />
          )}
          <Ascii
            art={door}
            label={frame === 0 ? "A round green hobbit door set into a grassy hill" : "The round door swings open"}
            className="relative text-[clamp(0.5rem,1.9vw,0.85rem)] text-moss"
          />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {step === "phrase" && (
          <motion.form
            key="phrase"
            onSubmit={tryPhrase}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            className="mt-8 w-full max-w-sm"
            noValidate
          >
            <label htmlFor={ids.phrase} className="label">
              Speak the Fellowship passphrase
            </label>
            <input
              id={ids.phrase}
              className="field"
              type="password"
              autoComplete="off"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${ids.phrase}-err` : undefined}
              autoFocus
            />
            {error && (
              <p id={`${ids.phrase}-err`} role="alert" className="mt-2 font-bold text-door">
                {error}
              </p>
            )}
            <button className="btn btn-moss sketch mt-4 w-full" type="submit" disabled={checking} aria-busy={checking}>
              {checking ? "Knocking…" : "Open the door"}
            </button>
            <p className="hint mt-4 text-center">Friends only. No sign-up.</p>
          </motion.form>
        )}

        {step === "who" && (
          <motion.form
            key="who"
            onSubmit={join}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper sketch mt-8 w-full max-w-lg p-5 sm:p-7"
            noValidate
          >
            <h2 className="text-2xl">Who goes there?</h2>
            <p className="hint mt-1">Pick a name, a class and a tiny face.</p>

            <div className="mt-5 grid gap-4">
              <div>
                <label htmlFor={ids.name} className="label">
                  Your name
                </label>
                <input
                  id={ids.name}
                  className="field"
                  value={name}
                  maxLength={30}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? `${ids.name}-err` : undefined}
                  autoFocus
                />
                {nameError && (
                  <p id={`${ids.name}-err`} role="alert" className="mt-1 font-bold text-door">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={ids.cls} className="label">
                  Your class
                </label>
                <select id={ids.cls} className="field" value={cls} onChange={(e) => setCls(e.target.value)}>
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="label">Your face</legend>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      aria-label={`Face ${a}`}
                      className="chip font-[family-name:var(--font-ascii)]"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label">Your Oaths</legend>
                <p className="hint mb-2">What you can eat. Party Mode uses these.</p>
                <div className="flex flex-wrap gap-2">
                  {OATH_IDS.map((o) => (
                    <button
                      type="button"
                      key={o}
                      className="chip"
                      aria-pressed={oaths.includes(o)}
                      onClick={() => setOaths((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]))}
                    >
                      <span aria-hidden>{OATHS[o].glyph}</span> {OATHS[o].name}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <button className="btn btn-moss sketch mt-6 w-full" type="submit">
              Join the Fellowship
            </button>

            {returning.length > 0 && <ReturnAs />}
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  );
}

function ReturnAs() {
  const { state, returnAs } = useRealm();
  const returning = state.members.filter((m) => !m.sample);
  return (
    <div className="mt-6">
      <hr className="dotted-rule" />
      <p className="label mt-4">Been here before? Return as</p>
      <div className="flex flex-wrap gap-2">
        {returning.map((m) => (
          <button key={m.id} type="button" className="chip" onClick={() => returnAs(m.id)}>
            <span className="font-[family-name:var(--font-ascii)] text-sm">{m.avatar}</span> {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}
