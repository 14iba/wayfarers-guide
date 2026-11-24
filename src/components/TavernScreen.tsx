"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { useRealm } from "@/lib/store";
import { ALLERGY_NOTE, OATHS, REALMS, TRUST } from "@/lib/lore";
import { avgStars, directionsUrl } from "@/lib/geo";
import { mugs, scroll } from "@/lib/ascii";
import type { OathId, Place, YesNo } from "@/lib/types";
import { Ascii, Avatar, Coins, Icon, KindLabel, OathBadge, SampleNote, Stars } from "./bits";
import { PhotoPicker, PlaceForm } from "./PlaceForm";

type Tab = "about" | "logs" | "photos";

export function TavernScreen() {
  const { id } = useParams<{ id: string }>();
  const { state, me, toggleHoard, updatePlace } = useRealm();
  const [tab, setTab] = useState<Tab>("about");
  const [editing, setEditing] = useState(false);
  const place = state.places.find((p) => p.id === id);

  if (!place)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Ascii art={scroll} className="mx-auto w-fit text-ink-soft" />
        <h1 className="mt-4 text-3xl">This tavern isn&rsquo;t on the map</h1>
        <p className="mt-2">It may have been a dream. Head back and pick another flag.</p>
        <Link href="/" className="btn btn-moss sketch mt-6">
          Back to the map
        </Link>
      </div>
    );

  const logs = state.logs.filter((l) => l.placeId === place.id).sort((a, b) => b.createdAt - a.createdAt);
  const inHoard = me?.hoard.includes(place.id) ?? false;
  const hasAllergy = place.oaths.some((o) => OATHS[o.oath].allergy);
  const allPhotos = [...place.photos, ...logs.flatMap((l) => l.photos)];
  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "logs", label: `Quest Logs (${logs.length})` },
    { id: "photos", label: `Photos (${allPhotos.length})` },
  ];

  if (editing)
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button className="btn sketch mb-4" onClick={() => setEditing(false)}>
          Cancel editing
        </button>
        <h1 className="mb-6 text-3xl">Edit {place.name}</h1>
        <PlaceForm
          initial={place}
          submitLabel="Save changes"
          onSubmit={(d) => {
            updatePlace(place.id, d);
            setEditing(false);
          }}
        />
      </div>
    );

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="hint not-italic font-bold underline-offset-4 hover:underline">
        ← Back to the map
      </Link>

      <header className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <KindLabel kind={place.kind} />
          <h1 className="mt-1 text-[clamp(2rem,5vw,3.2rem)]">{place.name}</h1>
          <p className="mt-1">
            {place.address || "No address yet"} · {REALMS[place.realm].name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
            <Coins n={place.price} />
            <Stars value={avgStars(state.logs, place.id)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button className="btn sketch" aria-pressed={inHoard} onClick={() => toggleHoard(place.id)}>
            <Icon.hoard /> {inHoard ? "In your Hoard" : "Add to Dragon’s Hoard"}
          </button>
          <a className="btn sketch" href={directionsUrl(place)} target="_blank" rel="noreferrer">
            <Icon.map /> Directions
          </a>
          <button className="btn sketch" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </header>

      <div className="mt-8">
        <div role="tablist" aria-label="Tavern sections" className="folder-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className="folder-tab"
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                const i = tabs.findIndex((x) => x.id === tab);
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="folder-body p-5 sm:p-7">
          {tab === "about" && <About place={place} hasAllergy={hasAllergy} />}
          {tab === "logs" && <Logs place={place} />}
          {tab === "photos" && <Photos place={place} photos={allPhotos} />}
        </div>
      </div>
    </article>
  );
}

function About({ place, hasAllergy }: { place: Place; hasAllergy: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div className="grid content-start gap-5">
        {place.sample && <SampleNote />}
        <p className="max-w-[65ch] text-lg">{place.description || "No description yet. Add one with Edit."}</p>
        <section aria-labelledby="oaths-h">
          <h2 id="oaths-h" className="text-xl">
            Oaths
          </h2>
          {place.oaths.length ? (
            <ul className="mt-2 grid gap-2">
              {place.oaths.map((o) => (
                <li key={o.oath} className="flex flex-wrap items-center gap-2">
                  <OathBadge oath={o.oath} trust={o.trust} />
                  <span className="hint text-sm">{TRUST[o.trust].plain}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">No Oaths listed yet.</p>
          )}
          {hasAllergy && (
            <p className="mt-3 border-l-4 border-door pl-3 font-bold" role="note">
              {ALLERGY_NOTE}
            </p>
          )}
        </section>
        <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="font-bold">Opening hours</dt>
          <dd>{place.hours || "Unknown. Ask a local."}</dd>
          <dt className="font-bold">Pin</dt>
          <dd>
            {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
          </dd>
        </dl>
      </div>
      <Ascii art={mugs} className="hidden self-start text-[0.7rem] text-ink-soft md:block" />
    </div>
  );
}

const YN: { v: YesNo; label: string }[] = [
  { v: "yes", label: "Yes" },
  { v: "no", label: "No" },
  { v: "unsure", label: "Not sure" },
];

function Logs({ place }: { place: Place }) {
  const { state } = useRealm();
  const [writing, setWriting] = useState(false);
  const logs = state.logs.filter((l) => l.placeId === place.id).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div>
      {!writing && (
        <button className="btn btn-moss sketch" onClick={() => setWriting(true)}>
          Write a Quest Log
        </button>
      )}
      {writing && <LogForm place={place} onDone={() => setWriting(false)} />}

      {logs.length === 0 && !writing && (
        <div className="mt-6 flex items-center gap-6">
          <Ascii art={scroll} className="text-ink-soft" />
          <p>No Quest Logs yet. Been here? Tell the Fellowship how it went.</p>
        </div>
      )}
      <ul className="mt-6 grid gap-5">
        {logs.map((l) => {
          const who = state.members.find((m) => m.id === l.memberId);
          return (
            <li key={l.id} className="border-t-2 border-dotted border-ink/40 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                {who && <Avatar face={who.avatar} size="sm" />}
                <span className="font-bold">{who?.name ?? "A wanderer"}</span>
                <span className="hint text-sm">{l.visitDate}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-5 text-[0.95rem]">
                <Stars value={l.stars} />
                <span>
                  Did the Oath hold? <strong>{l.oathHeld} of 5</strong>
                </span>
              </div>
              {l.note && <p className="mt-2 max-w-[65ch]">{l.note}</p>}
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {Object.entries(l.checks).map(([o, v]) => (
                  <li key={o}>
                    Really {OATHS[o as OathId].plain}? <strong>{YN.find((y) => y.v === v)?.label}</strong>
                  </li>
                ))}
                <li>
                  Understood us? <strong>{YN.find((y) => y.v === l.understood)?.label}</strong>
                </li>
              </ul>
              {l.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {l.photos.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- local data URL
                    <img key={i} src={p} alt={`Photo from ${who?.name ?? "a friend"}`} className="h-20 w-20 rounded-md border-[1.5px] border-ink object-cover" />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RatingPicker({ label, value, set, hint }: { label: string; value: number; set: (n: number) => void; hint?: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      {hint && <p className="hint mb-1">{hint}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => set(n)}
            aria-pressed={value === n}
            aria-label={`${n} of 5`}
            className={`grid h-11 w-11 place-items-center text-2xl ${n <= value ? "text-gold" : "text-ink-soft"}`}
          >
            <span aria-hidden className={n <= value ? "[-webkit-text-stroke:1px_var(--ink)]" : ""}>
              {n <= value ? "★" : "☆"}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function YesNoPicker({ label, value, set }: { label: string; value: YesNo | undefined; set: (v: YesNo) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="min-w-[12rem] font-bold">
        {label}
      </span>
      {YN.map((y) => (
        <button type="button" key={y.v} className="chip" aria-pressed={value === y.v} onClick={() => set(y.v)}>
          {y.label}
        </button>
      ))}
    </fieldset>
  );
}

function LogForm({ place, onDone }: { place: Place; onDone: () => void }) {
  const { addLog } = useRealm();
  const ids = { note: useId(), date: useId() };
  const [stars, setStars] = useState(0);
  const [oathHeld, setOathHeld] = useState(0);
  const [note, setNote] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photos, setPhotos] = useState<string[]>([]);
  const [checks, setChecks] = useState<Partial<Record<OathId, YesNo>>>({});
  const [understood, setUnderstood] = useState<YesNo>("unsure");
  const [error, setError] = useState("");

  return (
    <form
      noValidate
      className="paper sketch grid gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!stars) {
          setError("Pick a star rating first.");
          return;
        }
        addLog({ placeId: place.id, stars, oathHeld: oathHeld || stars, note: note.trim(), visitDate, photos, checks, understood });
        onDone();
      }}
    >
      <h3 className="text-xl">New Quest Log</h3>
      <RatingPicker label="How was it?" value={stars} set={(n) => { setStars(n); setError(""); }} />
      {error && (
        <p role="alert" className="-mt-2 font-bold text-door">
          {error}
        </p>
      )}
      <RatingPicker label="Did the Oath hold?" hint="How well did they keep your dietary needs?" value={oathHeld} set={setOathHeld} />
      {place.oaths.length > 0 && (
        <div className="grid gap-2">
          <p className="label !mb-0">Quick questions</p>
          <p className="hint -mt-1">Your answers update the trust labels on this place.</p>
          {place.oaths.map((o) => (
            <YesNoPicker
              key={o.oath}
              label={`Really ${OATHS[o.oath].plain}?`}
              value={checks[o.oath]}
              set={(v) => setChecks((c) => ({ ...c, [o.oath]: v }))}
            />
          ))}
          <YesNoPicker label="Did they understand you?" value={understood} set={setUnderstood} />
        </div>
      )}
      <div>
        <label htmlFor={ids.note} className="label">
          A short note
        </label>
        <textarea id={ids.note} className="field min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="max-w-[14rem]">
        <label htmlFor={ids.date} className="label">
          Visit date
        </label>
        <input id={ids.date} type="date" className="field" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
      </div>
      <PhotoPicker photos={photos} setPhotos={setPhotos} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-moss sketch">
          Save Quest Log
        </button>
        <button type="button" className="btn sketch" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Photos({ place, photos }: { place: Place; photos: string[] }) {
  const { addPhotos } = useRealm();
  const [adding, setAdding] = useState<string[]>([]);
  return (
    <div className="grid gap-5">
      {photos.length === 0 ? (
        <p>No photos yet. Snap the next meal!</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
              <img src={p} alt={`Photo ${i + 1} of ${place.name}`} className="aspect-square w-full rounded-lg border-[1.5px] border-ink object-cover" />
            </li>
          ))}
        </ul>
      )}
      <PhotoPicker photos={adding} setPhotos={setAdding} label="Add photos" />
      {adding.length > 0 && (
        <button
          className="btn btn-moss sketch w-fit"
          onClick={() => {
            addPhotos(place.id, adding);
            setAdding([]);
          }}
        >
          Save {adding.length} {adding.length === 1 ? "photo" : "photos"}
        </button>
      )}
    </div>
  );
}
