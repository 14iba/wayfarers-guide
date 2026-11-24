"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { useRealm } from "@/lib/store";
import { KINDS, KIND_IDS, OATHS, OATH_IDS, REALMS, TRUST } from "@/lib/lore";
import { shrinkPhoto } from "@/lib/geo";
import type { OathId, Place, PlaceKind, PlaceOath, RealmId, Trust } from "@/lib/types";

const RealmMap = dynamic(() => import("./RealmMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center hint">Unrolling the map…</div>,
});

export type PlaceDraft = Omit<Place, "id" | "createdAt" | "addedBy">;

export function PhotoPicker({ photos, setPhotos, label = "Photos" }: { photos: string[]; setPhotos: (p: string[]) => void; label?: string }) {
  const id = useId();
  const [error, setError] = useState("");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} <span className="font-normal italic text-ink-soft">(optional, +10 XP each)</span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="field file:mr-3 file:rounded-md file:border-[1.5px] file:border-ink file:bg-vellum-light file:px-3 file:py-1 file:font-bold file:text-ink"
        onChange={async (e) => {
          setError("");
          const files = Array.from(e.target.files ?? []).slice(0, 4);
          try {
            const shrunk = await Promise.all(files.map((f) => shrinkPhoto(f)));
            setPhotos([...photos, ...shrunk].slice(0, 6));
          } catch (err) {
            setError((err as Error).message);
          }
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-1 font-bold text-door">
          {error}
        </p>
      )}
      {photos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
              <img src={p} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-md border-[1.5px] border-ink object-cover" />
              <button
                type="button"
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-ink bg-vellum-light text-sm font-bold"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlaceForm({ initial, submitLabel, onSubmit, realm: realm0 = "vietnam" }: { initial?: PlaceDraft; submitLabel: string; onSubmit: (d: PlaceDraft) => void; realm?: RealmId }) {
  const { state } = useRealm();
  const ids = { name: useId(), kind: useId(), desc: useId(), addr: useId(), hours: useId() };
  const [realm, setRealm] = useState<RealmId>(initial?.realm ?? realm0);
  const [pin, setPin] = useState<[number, number] | null>(initial ? [initial.lat, initial.lng] : null);
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<PlaceKind>(initial?.kind ?? "tavern");
  const [price, setPrice] = useState<1 | 2 | 3>(initial?.price ?? 1);
  const [oaths, setOaths] = useState<PlaceOath[]>(initial?.oaths ?? []);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [hours, setHours] = useState(initial?.hours ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [errors, setErrors] = useState<{ name?: string; pin?: string }>({});
  const [fly, setFly] = useState<{ center: [number, number]; zoom: number; key: string } | null>(null);

  function toggleOath(o: OathId) {
    setOaths((cur) => (cur.some((x) => x.oath === o) ? cur.filter((x) => x.oath !== o) : [...cur, { oath: o, trust: "rumour" }]));
  }
  function setTrust(o: OathId, trust: Trust) {
    setOaths((cur) => cur.map((x) => (x.oath === o ? { ...x, trust } : x)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Give the place a name.";
    if (!pin) errs.pin = "Tap the map to drop your flag.";
    setErrors(errs);
    if (Object.keys(errs).length || !pin) {
      document.getElementById(errs.pin ? "pin-section" : ids.name)?.focus();
      return;
    }
    onSubmit({
      name: name.trim(),
      kind,
      price,
      oaths,
      description: description.trim(),
      address: address.trim(),
      hours: hours.trim(),
      photos,
      lat: pin[0],
      lng: pin[1],
      realm,
      sample: initial?.sample,
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section id="pin-section" tabIndex={-1} aria-labelledby="pin-h" className="lg:sticky lg:top-4 lg:self-start">
        <h2 id="pin-h" className="text-xl">
          1. Drop the pin
        </h2>
        <p className="hint">Tap the map where the place is. Tap again to move it.</p>
        <div role="group" aria-label="Realm" className="my-2 flex gap-2">
          {(Object.keys(REALMS) as RealmId[]).map((r) => (
            <button
              type="button"
              key={r}
              className="chip"
              aria-pressed={realm === r}
              onClick={() => {
                setRealm(r);
                setFly({ ...REALMS[r], key: r + Date.now() });
              }}
            >
              {REALMS[r].name}
            </button>
          ))}
        </div>
        <RealmMap
          places={state.places.filter((p) => p.realm === realm)}
          logs={state.logs}
          center={pin ?? REALMS[realm].center}
          zoom={pin ? 14 : REALMS[realm].zoom}
          flyTo={fly}
          onPick={(c) => {
            setPin(c);
            setErrors((e) => ({ ...e, pin: undefined }));
          }}
          picked={pin}
          className="h-[320px] w-full overflow-hidden rounded-xl sm:h-[420px]"
          label="Map for choosing where to plant your flag"
        />
        <p className={`mt-2 text-sm ${errors.pin ? "font-bold text-door" : "hint"}`} role={errors.pin ? "alert" : undefined}>
          {errors.pin ?? (pin ? `Flag at ${pin[0].toFixed(4)}, ${pin[1].toFixed(4)}` : "No flag yet.")}
        </p>
      </section>

      <section aria-labelledby="details-h" className="grid content-start gap-4">
        <h2 id="details-h" className="text-xl">
          2. Tell the Fellowship
        </h2>
        <div>
          <label htmlFor={ids.name} className="label">
            Name
          </label>
          <input
            id={ids.name}
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${ids.name}-e` : undefined}
          />
          {errors.name && (
            <p id={`${ids.name}-e`} role="alert" className="mt-1 font-bold text-door">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.kind} className="label">
              Type
            </label>
            <select id={ids.kind} className="field" value={kind} onChange={(e) => setKind(e.target.value as PlaceKind)}>
              {KIND_IDS.map((k) => (
                <option key={k} value={k}>
                  {KINDS[k].name} ({KINDS[k].plain})
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Price</legend>
            <div className="flex gap-1.5">
              {([1, 2, 3] as const).map((n) => (
                <button type="button" key={n} className="chip" aria-pressed={price === n} onClick={() => setPrice(n)} aria-label={`${n} of 3 coins`}>
                  {"●".repeat(n)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="label">Oaths</legend>
          <p className="hint mb-2">Pick what this place offers, then say how sure you are.</p>
          <div className="flex flex-wrap gap-1.5">
            {OATH_IDS.map((o) => (
              <button type="button" key={o} className="chip" aria-pressed={oaths.some((x) => x.oath === o)} onClick={() => toggleOath(o)}>
                <span aria-hidden>{OATHS[o].glyph}</span> {OATHS[o].name}
              </button>
            ))}
          </div>
          {oaths.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {oaths.map((o) => (
                <li key={o.oath} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[9rem] font-bold">{OATHS[o.oath].name}</span>
                  <label className="sr-only" htmlFor={`trust-${o.oath}`}>
                    How sure for {OATHS[o.oath].name}
                  </label>
                  <select id={`trust-${o.oath}`} className="field !w-auto !min-h-[40px] !py-1" value={o.trust} onChange={(e) => setTrust(o.oath, e.target.value as Trust)}>
                    {(Object.keys(TRUST) as Trust[]).map((t) => (
                      <option key={t} value={t}>
                        {TRUST[t].name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div>
          <label htmlFor={ids.desc} className="label">
            A short note
          </label>
          <textarea id={ids.desc} className="field min-h-[88px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.addr} className="label">
              Address
            </label>
            <input id={ids.addr} className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label htmlFor={ids.hours} className="label">
              Opening hours
            </label>
            <input id={ids.hours} className="field" placeholder="e.g. 7am till late" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
        </div>
        <PhotoPicker photos={photos} setPhotos={setPhotos} />

        <button type="submit" className="btn btn-door sketch mt-2 text-lg">
          {submitLabel}
        </button>
      </section>
    </form>
  );
}
