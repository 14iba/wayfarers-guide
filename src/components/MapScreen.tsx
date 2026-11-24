"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRealm } from "@/lib/store";
import { OATHS, OATH_IDS, REALMS } from "@/lib/lore";
import { avgStars, distanceKm, keepsOaths } from "@/lib/geo";
import { compass, seaSerpent, ship } from "@/lib/ascii";
import { rattle, pop } from "@/lib/sound";
import type { OathId, Place, RealmId } from "@/lib/types";
import {
  Ascii,
  Avatar,
  Coins,
  Icon,
  KindLabel,
  OathBadge,
  Stars,
} from "./bits";
import { Dialog } from "./Dialog";

const RealmMap = dynamic(() => import("./RealmMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center hint">
      Unrolling the map…
    </div>
  ),
});

export function MapScreen() {
  const { state, me, summonDragon } = useRealm();
  const [realm, setRealm] = useState<RealmId>("vietnam");
  const [filters, setFilters] = useState<OathId[]>([]);
  const [party, setParty] = useState<string[]>([]);
  const [view, setView] = useState<"map" | "list">("map");
  const [center, setCenter] = useState<[number, number]>(REALMS.vietnam.center);
  const [fly, setFly] = useState<{
    center: [number, number];
    zoom: number;
    key: string;
  } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const taps = useRef<number[]>([]);

  const partyMembers = state.members.filter((m) => party.includes(m.id));
  const partyOaths = [...new Set(partyMembers.flatMap((m) => m.oaths))];
  const required = [...new Set([...filters, ...partyOaths])];

  const requiredKey = required.join(",");
  const visible = useMemo(
    () =>
      state.places.filter((p) =>
        keepsOaths(p, requiredKey ? (requiredKey.split(",") as OathId[]) : []),
      ),
    [state.places, requiredKey],
  );
  const listed = useMemo(
    () =>
      visible
        .filter((p) => p.realm === realm)
        .map((p) => ({ p, km: distanceKm(center, [p.lat, p.lng]) }))
        .sort((a, b) => a.km - b.km),
    [visible, realm, center],
  );

  function goRealm(r: RealmId) {
    setRealm(r);
    setFly({ ...REALMS[r], key: r + Date.now() });
  }

  function tapCompass() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (state.sound) pop();
    if (taps.current.length >= 5) {
      taps.current = [];
      summonDragon();
    }
  }

  const controls = (
    <Controls
      realm={realm}
      goRealm={goRealm}
      filters={filters}
      setFilters={setFilters}
      partyOaths={partyOaths}
      partyCount={partyMembers.length}
      openParty={() => setPartyOpen(true)}
      clearParty={() => setParty([])}
      shown={listed.length}
    />
  );

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0 bottom-[61px] md:bottom-0">
        <RealmMap
          places={visible}
          logs={state.logs}
          center={REALMS.vietnam.center}
          zoom={REALMS.vietnam.zoom}
          flyTo={fly}
          chosenId={chosen}
          onMove={setCenter}
          className="h-full w-full"
          label={`Map of ${REALMS[realm].name}. ${listed.length} places shown.`}
        />
      </div>

      {/* margin creatures */}
      <div className="pointer-events-none absolute right-20 top-3 z-[460] hidden text-river/80 lg:block">
        <Ascii art={seaSerpent} className="text-[0.7rem]" />
      </div>
      <div className="ship pointer-events-none absolute bottom-40 right-[10%] z-[460] hidden text-ink/70 sm:block">
        <Ascii art={ship} className="text-[0.75rem]" />
      </div>
      {state.night && <Fireflies />}

      {/* desktop panel */}
      <aside className="paper sketch-alt absolute left-4 top-4 z-[500] hidden max-h-[calc(100%-2rem)] w-[310px] overflow-y-auto p-4 md:block">
        {controls}
        <div className="mt-4 flex gap-2">
          <ViewToggle view={view} setView={setView} />
        </div>
      </aside>

      {view === "list" && (
        <section
          aria-label="Places as a list"
          className="absolute inset-0 z-[600] overflow-y-auto bg-vellum px-4 pb-32 pt-4 md:left-[340px] md:pt-4"
        >
          <PlaceList items={listed} realm={realm} />
        </section>
      )}

      {/* compass rose: tap five times for a secret */}
      {view === "map" && (
        <button
          onClick={tapCompass}
          className="absolute bottom-20 left-3 z-[700] text-ink md:bottom-6 md:left-[346px]"
          aria-label="Compass rose"
        >
          <span className="wobble block rounded-full bg-vellum-light/80 p-2">
            <Ascii art={compass} className="text-[0.62rem] leading-[1.05]" />
          </span>
        </button>
      )}

      {/* action buttons */}
      <div className="absolute bottom-20 right-3 z-[700] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
        <Link href="/plant" className="btn btn-door sketch">
          <Icon.flag /> Plant a Flag
        </Link>
        <button
          onClick={() => {
            setRolling(true);
            if (state.sound) rattle();
          }}
          className="btn btn-moss sketch-alt !min-h-[64px] !px-5 text-lg"
        >
          <D20 /> Roll for Lunch
        </button>
      </div>

      {/* phone bar */}
      <div className="absolute inset-x-0 bottom-0 z-[800] flex gap-2 border-t-[1.5px] border-ink bg-vellum p-2 md:hidden">
        <button className="btn sketch flex-1" onClick={() => setSheet(true)}>
          <Icon.filter /> Filters
          {required.length ? ` (${required.length})` : ""}
        </button>
        <ViewToggle view={view} setView={setView} />
      </div>

      <Dialog
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filters"
        sheet
      >
        {controls}
      </Dialog>

      <PartyDialog
        open={partyOpen}
        onClose={() => setPartyOpen(false)}
        party={party}
        setParty={setParty}
        meId={me?.id ?? ""}
      />

      <RollDialog
        open={rolling}
        onClose={() => setRolling(false)}
        candidates={listed}
        anyInRealm={visible.filter((p) => p.realm === realm)}
        required={required}
        onShow={(p) => {
          setChosen(p.id);
          setView("map");
          setFly({ center: [p.lat, p.lng], zoom: 15, key: p.id + Date.now() });
        }}
      />
    </div>
  );
}

function ViewToggle({
  view,
  setView,
}: {
  view: "map" | "list";
  setView: (v: "map" | "list") => void;
}) {
  return (
    <div role="group" aria-label="View" className="flex flex-1 gap-1">
      <button
        className="chip flex-1 justify-center !min-h-[44px]"
        aria-pressed={view === "map"}
        onClick={() => setView("map")}
      >
        <Icon.map /> Map
      </button>
      <button
        className="chip flex-1 justify-center !min-h-[44px]"
        aria-pressed={view === "list"}
        onClick={() => setView("list")}
      >
        <Icon.list /> List
      </button>
    </div>
  );
}

function Controls(props: {
  realm: RealmId;
  goRealm: (r: RealmId) => void;
  filters: OathId[];
  setFilters: (f: OathId[]) => void;
  partyOaths: OathId[];
  partyCount: number;
  openParty: () => void;
  clearParty: () => void;
  shown: number;
}) {
  const {
    realm,
    goRealm,
    filters,
    setFilters,
    partyOaths,
    partyCount,
    openParty,
    clearParty,
    shown,
  } = props;
  return (
    <div className="grid gap-4">
      <div>
        <p className="label">Realm</p>
        <div role="group" aria-label="Realm" className="flex gap-2">
          {(Object.keys(REALMS) as RealmId[]).map((r) => (
            <button
              key={r}
              className="chip flex-1 justify-center"
              aria-pressed={realm === r}
              onClick={() => goRealm(r)}
            >
              {REALMS[r].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Oaths</p>
        <p className="hint mb-2">Show places that keep all of these.</p>
        <div className="flex flex-wrap gap-1.5">
          {OATH_IDS.map((o) => (
            <button
              key={o}
              className="chip"
              aria-pressed={filters.includes(o)}
              onClick={() =>
                setFilters(
                  filters.includes(o)
                    ? filters.filter((x) => x !== o)
                    : [...filters, o],
                )
              }
            >
              <span aria-hidden>{OATHS[o].glyph}</span> {OATHS[o].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Party Mode</p>
        {partyCount ? (
          <>
            <p className="text-[0.95rem]">
              {partyCount} dining tonight. Safe for:{" "}
              {partyOaths.length
                ? partyOaths.map((o) => OATHS[o].name).join(", ")
                : "everyone (no Oaths)"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                className="btn sketch flex-1 !min-h-[40px]"
                onClick={openParty}
              >
                Change party
              </button>
              <button className="btn sketch !min-h-[40px]" onClick={clearParty}>
                End
              </button>
            </div>
          </>
        ) : (
          <button className="btn sketch w-full" onClick={openParty}>
            <Icon.people /> Who&rsquo;s dining tonight?
          </button>
        )}
      </div>

      <p className="hint" aria-live="polite">
        {shown} {shown === 1 ? "place" : "places"} in {REALMS[realm].name}
      </p>
    </div>
  );
}

function PlaceList({
  items,
  realm,
}: {
  items: { p: Place; km: number }[];
  realm: RealmId;
}) {
  const { state } = useRealm();
  if (!items.length)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl">
          No taverns match
        </p>
        <p className="mt-2">
          Loosen an Oath filter, or plant the first flag in {REALMS[realm].name}
          .
        </p>
        <Link href="/plant" className="btn btn-door sketch mt-4">
          Plant a Flag
        </Link>
      </div>
    );
  return (
    <ul className="mx-auto grid max-w-3xl gap-3">
      {items.map(({ p, km }) => (
        <li key={p.id}>
          <Link
            href={`/tavern/${p.id}`}
            className="paper sketch block p-4 hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="font-[family-name:var(--font-display)] text-xl">
                {p.name}
              </span>
              <span className="text-sm text-ink-soft">
                {km < 1 ? "< 1" : Math.round(km)} km from map centre
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <KindLabel kind={p.kind} />
              <Coins n={p.price} />
              <Stars value={avgStars(state.logs, p.id)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.oaths.map((o) => (
                <OathBadge
                  key={o.oath}
                  oath={o.oath}
                  trust={o.trust}
                  showTrust={false}
                />
              ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PartyDialog(props: {
  open: boolean;
  onClose: () => void;
  party: string[];
  setParty: (p: string[]) => void;
  meId: string;
}) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Who's dining tonight?"
    >
      <PartyBody {...props} />
    </Dialog>
  );
}

function PartyBody({
  onClose,
  party,
  setParty,
  meId,
}: {
  onClose: () => void;
  party: string[];
  setParty: (p: string[]) => void;
  meId: string;
}) {
  const { state } = useRealm();
  const [draft, setDraft] = useState<string[]>(() =>
    party.length ? party : [meId],
  );
  return (
    <>
      <p className="hint mb-3">
        The map shows only places safe for everyone&rsquo;s Oaths combined.
      </p>
      <ul className="grid gap-2">
        {state.members.map((m) => {
          const on = draft.includes(m.id);
          return (
            <li key={m.id}>
              <button
                className="chip w-full !justify-start !rounded-xl !py-2"
                aria-pressed={on}
                onClick={() =>
                  setDraft(
                    on ? draft.filter((x) => x !== m.id) : [...draft, m.id],
                  )
                }
              >
                <Avatar face={m.avatar} size="sm" />
                <span className="text-left">
                  {m.name}
                  {m.id === meId && " (you)"}
                  <span className="block text-sm font-normal italic">
                    {m.oaths.length
                      ? m.oaths.map((o) => OATHS[o].name).join(", ")
                      : "No Oaths"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        className="btn btn-moss sketch mt-4 w-full"
        onClick={() => {
          setParty(draft);
          onClose();
        }}
      >
        Show safe places
      </button>
    </>
  );
}

function D20({ spin = false }: { spin?: boolean }) {
  return (
    <motion.svg
      width="34"
      height="34"
      viewBox="0 0 40 40"
      aria-hidden
      animate={spin ? { rotate: [0, 200, 400, 720] } : undefined}
      transition={spin ? { duration: 1.1, ease: "easeOut" } : undefined}
    >
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill="var(--vellum-light)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <polygon
        points="20,9 30,26 10,26"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.4"
      />
      <path
        d="M20 2 20 9M36 11 30 26M4 11 10 26M20 38 10 26M20 38 30 26M4 29 10 26M36 29 30 26M4 11 20 9M36 11 20 9"
        stroke="var(--ink)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="var(--ink)"
        fontFamily="var(--font-ascii)"
      >
        20
      </text>
    </motion.svg>
  );
}

function RollDialog(props: {
  open: boolean;
  onClose: () => void;
  candidates: { p: Place; km: number }[];
  anyInRealm: Place[];
  required: OathId[];
  onShow: (p: Place) => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Roll for Lunch">
      <RollBody {...props} />
    </Dialog>
  );
}

function RollBody({
  onClose,
  candidates,
  anyInRealm,
  required,
  onShow,
}: {
  open: boolean;
  onClose: () => void;
  candidates: { p: Place; km: number }[];
  anyInRealm: Place[];
  required: OathId[];
  onShow: (p: Place) => void;
}) {
  const { state } = useRealm();
  const reduce = useReducedMotion();
  const [result, setResult] = useState<{
    p: Place;
    face: number;
    far: boolean;
  } | null>(null);
  const [face, setFace] = useState(20);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function roll() {
    setResult(null);
    const near = candidates.filter((c) => c.km <= 25).map((c) => c.p);
    const pool = near.length ? near : anyInRealm;
    if (!pool.length) {
      setResult(null);
      setFace(1);
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const final = Math.floor(Math.random() * 20) + 1;
    if (reduce) {
      setFace(final);
      setResult({ p: pick, face: final, far: !near.length });
      return;
    }
    let n = 0;
    if (timer.current) clearInterval(timer.current);
    const iv = setInterval(() => {
      setFace(Math.floor(Math.random() * 20) + 1);
      if (++n > 10) {
        clearInterval(iv);
        setFace(final);
        setResult({ p: pick, face: final, far: !near.length });
      }
    }, 90);
    timer.current = iv;
  }

  useEffect(() => {
    const t = setTimeout(roll, 0);
    return () => {
      clearTimeout(t);
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roll once each time the dialog opens
  }, []);

  const empty = !candidates.length && !anyInRealm.length;

  return (
    <>
      {required.length > 0 && (
        <p className="hint mb-2">
          Only places that keep: {required.map((o) => OATHS[o].name).join(", ")}
          .
        </p>
      )}
      <div className="grid place-items-center py-3">
        <motion.div
          key={result ? "done" : "rolling"}
          animate={
            result || reduce
              ? { rotate: 0, scale: [1.25, 1] }
              : { rotate: [0, 360], y: [0, -14, 0] }
          }
          transition={
            result || reduce
              ? { duration: 0.35 }
              : { duration: 0.5, repeat: Infinity, ease: "linear" }
          }
          className="relative grid h-28 w-28 place-items-center"
        >
          <svg viewBox="0 0 40 40" className="absolute inset-0" aria-hidden>
            <polygon
              points="20,1 37,10.5 37,29.5 20,39 3,29.5 3,10.5"
              fill="var(--vellum-light)"
              stroke="var(--ink)"
              strokeWidth="1.6"
            />
            <polygon
              points="20,8 31,27 9,27"
              fill={result ? "var(--gold)" : "none"}
              stroke="var(--ink)"
              strokeWidth="1"
              opacity="0.9"
            />
          </svg>
          <span
            className="relative font-[family-name:var(--font-ascii)] text-3xl font-bold"
            aria-hidden
          >
            {face}
          </span>
        </motion.div>
      </div>
      <div aria-live="polite">
        {empty && (
          <p className="text-center">
            No places here keep your party&rsquo;s Oaths yet. Plant a flag to
            give the dice something to find.
          </p>
        )}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="hint">
                {result.face === 20
                  ? "A natural 20! Fate has chosen."
                  : result.face === 1
                    ? "A 1… but lunch is still lunch."
                    : `You rolled ${result.face}.`}
                {result.far &&
                  " Nothing within 25 km of the map centre, so the dice searched the whole realm."}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {result.p.name}
              </p>
              <p className="flex flex-wrap items-center justify-center gap-3">
                <KindLabel kind={result.p.kind} /> <Coins n={result.p.price} />{" "}
                <Stars value={avgStars(state.logs, result.p.id)} />
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  className="btn btn-moss sketch"
                  onClick={() => {
                    onShow(result.p);
                    onClose();
                  }}
                >
                  Show on map
                </button>
                <Link href={`/tavern/${result.p.id}`} className="btn sketch">
                  Open tavern page
                </Link>
                <button className="btn sketch" onClick={roll}>
                  Roll again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function Fireflies() {
  const [flies] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      fx: `${(Math.random() - 0.5) * 80}px`,
      fy: `${(Math.random() - 0.5) * 80}px`,
      dur: `${5 + Math.random() * 6}s`,
      delay: `${-Math.random() * 8}s`,
    })),
  );
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[455] overflow-hidden"
      aria-hidden
    >
      {flies.map((f) => (
        <span
          key={f.i}
          className="firefly"
          style={
            {
              left: `${f.left}%`,
              top: `${f.top}%`,
              "--fx": f.fx,
              "--fy": f.fy,
              "--dur": f.dur,
              "--delay": f.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
