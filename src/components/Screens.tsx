"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useRealm } from "@/lib/store";
import { AVATARS, BESTIARY, CLASSES, OATHS, OATH_IDS, REALMS, XP_PER_LEVEL, levelOf, titleOf } from "@/lib/lore";
import { elf, fairyRing, rabbits, treasure } from "@/lib/ascii";
import type { Member, OathId, RealmId } from "@/lib/types";
import { Ascii, Avatar, Icon, KindLabel, OathBadge } from "./bits";
import { PlaceForm } from "./PlaceForm";

/* ── Plant a Flag ─────────────────────────────────────── */
export function PlantScreen() {
  const { addPlace } = useRealm();
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3rem)]">Plant a Flag</h1>
          <p className="mt-1 max-w-[55ch]">Drop a pin, add a name, Oaths and a note. It appears for everyone right away.</p>
        </div>
        <Ascii art={elf} className="hidden text-[0.8rem] text-moss sm:block" />
      </div>
      <div className="mt-8">
        <PlaceForm
          submitLabel="Plant the Flag"
          onSubmit={(d) => {
            const id = addPlace(d);
            router.push(`/tavern/${id}`);
          }}
        />
      </div>
    </div>
  );
}

/* ── Fellowship ───────────────────────────────────────── */
function XpBar({ xp }: { xp: number }) {
  const into = xp % XP_PER_LEVEL;
  return (
    <div>
      <div
        className="h-3 overflow-hidden rounded-full border-[1.5px] border-ink bg-vellum"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
        aria-valuenow={into}
        aria-label={`${into} of ${XP_PER_LEVEL} XP to the next level`}
      >
        <div className="h-full bg-gold" style={{ width: `${into}%` }} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {xp} XP · {XP_PER_LEVEL - into} to level {levelOf(xp) + 1}
      </p>
    </div>
  );
}

export function FellowshipScreen() {
  const { state, me } = useRealm();
  const members = [...state.members].sort((a, b) => b.xp - a.xp);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3rem)]">The Fellowship</h1>
          <p className="mt-1 max-w-[55ch]">Everyone eating their way across the realm. Add places, photos and notes to earn XP.</p>
        </div>
        <Ascii art={fairyRing} className="text-[0.75rem] text-moss" />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <li key={m.id}>
            <Link href={`/fellowship/${m.id}`} className={`paper block p-5 transition-transform hover:-translate-y-0.5 ${m.id === me?.id ? "sketch-alt" : "sketch"}`}>
              <div className="flex items-center gap-3">
                <Avatar face={m.avatar} />
                <div>
                  <p className="font-bold leading-tight">
                    {m.name}
                    {m.id === me?.id && <span className="font-normal italic"> (you)</span>}
                  </p>
                  <p className="text-sm italic text-ink-soft">{m.cls}</p>
                </div>
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)]">
                Lv {levelOf(m.xp)} · {titleOf(m.xp)}
              </p>
              <div className="mt-2">
                <XpBar xp={m.xp} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const { state, me, updateMe, leave } = useRealm();
  const [editing, setEditing] = useState(false);
  const m = state.members.find((x) => x.id === id);
  if (!m)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl">No such wanderer</h1>
        <Link href="/fellowship" className="btn btn-moss sketch mt-6">
          See the Fellowship
        </Link>
      </div>
    );
  const isMe = m.id === me?.id;
  const hoard = state.places.filter((p) => m.hoard.includes(p.id));
  const logs = state.logs.filter((l) => l.memberId === m.id);
  const planted = state.places.filter((p) => p.addedBy === m.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/fellowship" className="hint not-italic font-bold underline-offset-4 hover:underline">
        ← The Fellowship
      </Link>
      <header className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar face={m.avatar} size="lg" />
        <div className="flex-1">
          <h1 className="text-[clamp(2rem,5vw,3rem)]">{m.name}</h1>
          <p className="italic">
            {m.cls} · Lv {levelOf(m.xp)} · <strong className="not-italic">{titleOf(m.xp)}</strong>
          </p>
          <div className="mt-2 max-w-xs">
            <XpBar xp={m.xp} />
          </div>
        </div>
        {isMe && !editing && (
          <div className="flex gap-2">
            <button className="btn sketch" onClick={() => setEditing(true)}>
              Edit profile
            </button>
            <button className="btn sketch" onClick={leave}>
              Leave
            </button>
          </div>
        )}
      </header>

      {isMe && editing ? (
        <EditMe m={m} onSave={(p) => { updateMe(p); setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        <section className="mt-6" aria-labelledby="my-oaths">
          <h2 id="my-oaths" className="text-xl">
            Oaths
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.oaths.length ? m.oaths.map((o) => <OathBadge key={o} oath={o} />) : <p className="hint">No Oaths. Eats anything!</p>}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="hoard-h">
          <div className="flex items-end gap-4">
            <h2 id="hoard-h" className="text-2xl">
              Dragon&rsquo;s Hoard
            </h2>
            <Ascii art={treasure} className="text-[0.55rem] text-gold" />
          </div>
          {hoard.length ? (
            <ul className="mt-3 grid gap-2">
              {hoard.map((p) => (
                <li key={p.id}>
                  <Link href={`/tavern/${p.id}`} className="font-bold underline decoration-gold decoration-2 underline-offset-4">
                    {p.name}
                  </Link>{" "}
                  <KindLabel kind={p.kind} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">Nothing hoarded yet. Tap &ldquo;Add to Dragon&rsquo;s Hoard&rdquo; on any tavern.</p>
          )}
        </section>
        <section aria-labelledby="deeds-h">
          <h2 id="deeds-h" className="text-2xl">
            Deeds
          </h2>
          <ul className="mt-3 grid gap-1">
            <li>
              <strong>{planted.length}</strong> flags planted
            </li>
            <li>
              <strong>{logs.length}</strong> Quest Logs written
            </li>
            <li>
              <strong>{m.bestiary.length}</strong> of {BESTIARY.length} beasts tasted
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function EditMe({ m, onSave, onCancel }: { m: Member; onSave: (p: Partial<Member>) => void; onCancel: () => void }) {
  const ids = { name: useId(), cls: useId() };
  const [name, setName] = useState(m.name);
  const [cls, setCls] = useState(m.cls);
  const [avatar, setAvatar] = useState(m.avatar);
  const [oaths, setOaths] = useState<OathId[]>(m.oaths);
  return (
    <form
      className="paper sketch mt-6 grid gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim() || m.name, cls, avatar, oaths });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.name} className="label">
            Name
          </label>
          <input id={ids.name} className="field" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor={ids.cls} className="label">
            Class
          </label>
          <select id={ids.cls} className="field" value={cls} onChange={(e) => setCls(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Face</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button type="button" key={a} className="chip font-[family-name:var(--font-ascii)]" aria-pressed={avatar === a} aria-label={`Face ${a}`} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Oaths</legend>
        <div className="flex flex-wrap gap-1.5">
          {OATH_IDS.map((o) => (
            <button type="button" key={o} className="chip" aria-pressed={oaths.includes(o)} onClick={() => setOaths(oaths.includes(o) ? oaths.filter((x) => x !== o) : [...oaths, o])}>
              <span aria-hidden>{OATHS[o].glyph}</span> {OATHS[o].name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button className="btn btn-moss sketch" type="submit">
          Save changes
        </button>
        <button className="btn sketch" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Bestiary ─────────────────────────────────────────── */
export function BestiaryScreen() {
  const { me, toggleDish } = useRealm();
  const [realm, setRealm] = useState<RealmId | "all">("all");
  const tasted = me?.bestiary ?? [];
  const beasts = BESTIARY.filter((b) => realm === "all" || b.realm === realm);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-[clamp(2rem,5vw,3rem)]">The Bestiary</h1>
      <p className="mt-1 max-w-[55ch]">Local dishes to collect. Try one on a trip and tick it off.</p>
      <Ascii art={rabbits} className="mt-4 overflow-x-auto text-[0.7rem] text-moss" />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-[family-name:var(--font-display)] text-xl" aria-live="polite">
          {tasted.length} of {BESTIARY.length} tasted
        </p>
        <div role="group" aria-label="Realm" className="flex gap-2">
          {(["all", "vietnam", "indonesia"] as const).map((r) => (
            <button key={r} className="chip" aria-pressed={realm === r} onClick={() => setRealm(r)}>
              {r === "all" ? "All realms" : REALMS[r].name}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {beasts.map((b) => {
          const got = tasted.includes(b.id);
          return (
            <li key={b.id} className={`paper p-5 ${got ? "sketch-alt" : "sketch"}`}>
              <Ascii art={b.art} className={`h-[5.5em] text-[0.8rem] ${got ? "text-moss" : "text-ink-soft opacity-70"}`} />
              <h2 className="mt-3 text-xl">{b.beast}</h2>
              <p className="italic">
                {b.dish} · {REALMS[b.realm].name}
              </p>
              <p className="mt-1 text-[0.95rem]">{b.lore}</p>
              <button className={`btn sketch mt-3 w-full ${got ? "btn-moss" : ""}`} aria-pressed={got} onClick={() => toggleDish(b.id)}>
                {got ? "Tasted ✓" : "I tried it"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Expeditions ──────────────────────────────────────── */
export function ExpeditionsScreen() {
  const { state, me, addExpedition, toggleExpeditionPlace } = useRealm();
  const ids = { name: useId(), dates: useId() };
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [dates, setDates] = useState("");
  const [realm, setRealm] = useState<RealmId>("vietnam");
  const [members, setMembers] = useState<string[]>(me ? [me.id] : []);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-[clamp(2rem,5vw,3rem)]">Expeditions</h1>
      <p className="mt-1 max-w-[55ch]">Plan a trip: who&rsquo;s going and which taverns are on the route.</p>

      {!creating ? (
        <button className="btn btn-moss sketch mt-6" onClick={() => setCreating(true)}>
          Start an Expedition
        </button>
      ) : (
        <form
          noValidate
          className="paper sketch mt-6 grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setError("Give the Expedition a name.");
              return;
            }
            const id = addExpedition({ name: name.trim(), dates: dates.trim(), realm, placeIds: [], memberIds: members });
            setCreating(false);
            setName("");
            setDates("");
            setEditingId(id);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.name} className="label">
                Name
              </label>
              <input id={ids.name} className="field" placeholder="e.g. The Great Noodle Crossing" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} aria-invalid={!!error} />
              {error && (
                <p role="alert" className="mt-1 font-bold text-door">
                  {error}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={ids.dates} className="label">
                When
              </label>
              <input id={ids.dates} className="field" placeholder="e.g. 3–17 March" value={dates} onChange={(e) => setDates(e.target.value)} />
            </div>
          </div>
          <fieldset>
            <legend className="label">Realm</legend>
            <div className="flex gap-2">
              {(Object.keys(REALMS) as RealmId[]).map((r) => (
                <button type="button" key={r} className="chip" aria-pressed={realm === r} onClick={() => setRealm(r)}>
                  {REALMS[r].name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Who&rsquo;s going</legend>
            <div className="flex flex-wrap gap-2">
              {state.members.map((m) => (
                <button type="button" key={m.id} className="chip" aria-pressed={members.includes(m.id)} onClick={() => setMembers(members.includes(m.id) ? members.filter((x) => x !== m.id) : [...members, m.id])}>
                  <span className="font-[family-name:var(--font-ascii)] text-sm">{m.avatar}</span> {m.name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-moss sketch">
              Start the Expedition
            </button>
            <button type="button" className="btn sketch" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {state.expeditions.length === 0 && !creating && (
        <div className="mt-8 flex items-center gap-6">
          <Ascii art={treasure} className="text-[0.7rem] text-gold" />
          <p>No Expeditions yet. Start one for the next trip.</p>
        </div>
      )}

      <ul className="mt-8 grid gap-6">
        {[...state.expeditions].reverse().map((x) => {
          const stops = state.places.filter((p) => x.placeIds.includes(p.id));
          const crew = state.members.filter((m) => x.memberIds.includes(m.id));
          const open = editingId === x.id;
          return (
            <li key={x.id} className="paper sketch-alt p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl">{x.name}</h2>
                <p className="italic">
                  {REALMS[x.realm].name}
                  {x.dates && ` · ${x.dates}`}
                </p>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <Icon.people />
                {crew.length ? crew.map((m) => m.name).join(", ") : "No one yet"}
              </p>
              <h3 className="mt-4 font-bold">The route</h3>
              {stops.length ? (
                <ol className="mt-1 grid gap-1 pl-6 [list-style:decimal]">
                  {stops.map((p) => (
                    <li key={p.id}>
                      <Link href={`/tavern/${p.id}`} className="underline decoration-gold decoration-2 underline-offset-4">
                        {p.name}
                      </Link>{" "}
                      <KindLabel kind={p.kind} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="hint">No stops yet.</p>
              )}
              <button className="btn sketch mt-4" aria-expanded={open} onClick={() => setEditingId(open ? null : x.id)}>
                {open ? "Done choosing stops" : "Choose stops"}
              </button>
              {open && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {state.places
                    .filter((p) => p.realm === x.realm)
                    .map((p) => (
                      <li key={p.id}>
                        <button className="chip" aria-pressed={x.placeIds.includes(p.id)} onClick={() => toggleExpeditionPlace(x.id, p.id)}>
                          {p.name}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
