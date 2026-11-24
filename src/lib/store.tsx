"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedState } from "./seed";
import type { Expedition, Member, OathId, Place, QuestLog, RealmState, Trust } from "./types";
import { levelOf, titleOf, XP } from "./lore";
import { clink, fanfare } from "./sound";
import { uid } from "./geo";
import * as remote from "./remote";

// Two modes:
// - Supabase configured (.env.local): the realm is shared by the Fellowship.
//   Only per-device settings live in this browser.
// - Not configured: everything lives in this browser's storage.
const KEY = "wayfarer:v1";
const DEVICE_KEY = "wayfarer:device";
type Device = Pick<RealmState, "meId" | "night" | "sound" | "firstPinCelebrated"> & { phrase: string | null };
function loadDevice(): Device | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as Device) : null;
  } catch {
    return null;
  }
}
function saveDevice(d: Device) {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}
const shared = (s: RealmState): remote.Shared => ({ places: s.places, logs: s.logs, members: s.members, expeditions: s.expeditions });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Work out what changed and write only that, in foreign-key order. */
async function pushChanges(phrase: string, before: remote.Shared, after: remote.Shared) {
  const oldMembers = new Map(before.members.map((m) => [m.id, m]));
  for (const m of after.members) if (!same(oldMembers.get(m.id), m)) await remote.saveMember(phrase, m);

  const oldPlaces = new Map(before.places.map((p) => [p.id, p]));
  for (const p of after.places) {
    const old = oldPlaces.get(p.id);
    const { photos, ...rest } = p;
    if (!old || !same({ ...old, photos: [] }, { ...rest, photos: [] })) await remote.savePlace(phrase, p);
    const oldPhotos = old?.photos ?? [];
    if (photos.length > oldPhotos.length && same(oldPhotos, photos.slice(0, oldPhotos.length))) {
      await remote.addPhotos(phrase, p.id, photos.slice(oldPhotos.length));
    } else if (!same(oldPhotos, photos)) {
      await remote.replacePlacePhotos(phrase, p.id, photos);
    }
  }

  const oldLogs = new Set(before.logs.map((l) => l.id));
  for (const l of after.logs) if (!oldLogs.has(l.id)) await remote.saveLog(phrase, l);

  const oldExps = new Map(before.expeditions.map((e) => [e.id, e]));
  for (const e of after.expeditions) if (!same(oldExps.get(e.id), e)) await remote.saveExpedition(phrase, e);
}
function load(): RealmState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RealmState) : null;
  } catch {
    return null;
  }
}
function save(s: RealmState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export type Celebration =
  | { id: string; kind: "xp"; text: string }
  | { id: string; kind: "level"; text: string; title: string }
  | { id: string; kind: "firstPin" }
  | { id: string; kind: "notice"; text: string };

type NewPlace = Omit<Place, "id" | "createdAt" | "addedBy">;
type NewLog = Omit<QuestLog, "id" | "createdAt" | "memberId">;

interface Store {
  ready: boolean;
  state: RealmState;
  me: Member | null;
  celebrations: Celebration[];
  dismiss: (id: string) => void;
  remote: boolean;
  unlock: (phrase: string) => Promise<boolean>;
  enter: (m: Pick<Member, "name" | "cls" | "avatar" | "oaths">) => void;
  leave: () => void;
  returnAs: (id: string) => void;
  updateMe: (p: Partial<Pick<Member, "name" | "cls" | "avatar" | "oaths">>) => void;
  addPlace: (p: NewPlace) => string;
  updatePlace: (id: string, p: Partial<NewPlace>) => void;
  addLog: (l: NewLog) => void;
  addPhotos: (placeId: string, photos: string[]) => void;
  toggleHoard: (placeId: string) => void;
  toggleDish: (dishId: string) => void;
  addExpedition: (e: Omit<Expedition, "id">) => string;
  toggleExpeditionPlace: (expId: string, placeId: string) => void;
  setNight: (v: boolean) => void;
  setSound: (v: boolean) => void;
  summonDragon: () => void;
  dragon: boolean;
  dismissDragon: () => void;
}

const Ctx = createContext<Store | null>(null);

export function RealmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RealmState>(() =>
    remote.remoteEnabled ? { ...seedState(), places: [], logs: [], members: [], expeditions: [] } : seedState(),
  );
  const [ready, setReady] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [dragon, setDragon] = useState(false);
  const [phrase, setPhrase] = useState<string | null>(null);
  const storageWarned = useRef(false);
  const synced = useRef<remote.Shared | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const notice = useCallback(
    (text: string) => setCelebrations((c) => [...c, { id: uid(), kind: "notice", text }]),
    [],
  );

  const pull = useCallback(async (p: string) => {
    const sh = await remote.loadShared(p);
    synced.current = sh;
    setState((s) => ({ ...s, ...sh }));
  }, []);

  useEffect(() => {
    if (!remote.remoteEnabled) {
      const saved = load();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser storage once
      if (saved?.version === 1) setState(saved);
      setReady(true);
      return;
    }
    const device = loadDevice();
    if (device) setState((s) => ({ ...s, meId: device.meId, night: device.night, sound: device.sound, firstPinCelebrated: device.firstPinCelebrated }));
    if (!device?.phrase) {
      setReady(true);
      return;
    }
    setPhrase(device.phrase);
    pull(device.phrase)
      .catch(() => notice("Couldn't reach the realm. Showing nothing until the connection is back."))
      .finally(() => setReady(true));
  }, [pull, notice]);

  // Save: device settings locally, and (in shared mode) push what changed.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = state.night ? "night" : "day";
    if (!remote.remoteEnabled) {
      if (!save(state) && !storageWarned.current) {
        storageWarned.current = true;
        notice("This device's storage is full. Remove some photos so new changes are kept.");
      }
      return;
    }
    saveDevice({ meId: state.meId, night: state.night, sound: state.sound, firstPinCelebrated: state.firstPinCelebrated, phrase });
    if (!phrase || !synced.current) return;
    const before = synced.current;
    const after = shared(state);
    if (same(before, after)) return;
    synced.current = after;
    queue.current = queue.current.then(() =>
      pushChanges(phrase, before, after).catch(async (e: Error) => {
        notice(`Couldn't save to the realm: ${e.message}. Reloaded the latest map.`);
        await pull(phrase).catch(() => {});
      }),
    );
  }, [state, ready, phrase, notice, pull]);

  // See friends' changes when coming back to the tab.
  useEffect(() => {
    if (!phrase) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      queue.current = queue.current.then(() => pull(phrase).catch(() => {}));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [phrase, pull]);

  const me = useMemo(() => state.members.find((m) => m.id === state.meId) ?? null, [state]);
  const push = useCallback((c: Celebration) => setCelebrations((cs) => [...cs, c]), []);
  const sound = state.sound;

  // Pure: returns the new state plus the celebration to show. Effects run outside setState.
  const withXp = (s: RealmState, amount: number, reason: string): [RealmState, () => void] => {
    const who = s.members.find((m) => m.id === s.meId);
    if (!who || amount <= 0) return [s, () => {}];
    const before = levelOf(who.xp);
    const after = levelOf(who.xp + amount);
    const effect =
      after > before
        ? () => {
            push({ id: uid(), kind: "level", text: `Level ${after}!`, title: titleOf(who.xp + amount) });
            if (sound) fanfare();
          }
        : () => {
            push({ id: uid(), kind: "xp", text: `+${amount} XP · ${reason}` });
            if (sound) clink();
          };
    return [{ ...s, members: s.members.map((m) => (m.id === who.id ? { ...m, xp: m.xp + amount } : m)) }, effect];
  };

  const store: Store = {
    ready,
    state,
    me,
    celebrations,
    dragon,
    remote: remote.remoteEnabled,
    unlock: async (p) => {
      if (!remote.remoteEnabled) return false;
      const ok = await remote.checkPhrase(p);
      if (!ok) return false;
      await remote.seedIfEmpty(p);
      await pull(p);
      setPhrase(p);
      return true;
    },
    dismiss: (id) => setCelebrations((cs) => cs.filter((c) => c.id !== id)),
    enter: (m) => {
      const id = uid();
      setState((s) => ({
        ...s,
        meId: id,
        members: [...s.members, { ...m, id, hoard: [], xp: 0, bestiary: [] }],
      }));
    },
    leave: () => setState((s) => ({ ...s, meId: null })),
    returnAs: (id) => setState((s) => ({ ...s, meId: id })),
    updateMe: (p) =>
      setState((s) => ({ ...s, members: s.members.map((m) => (m.id === s.meId ? { ...m, ...p } : m)) })),
    addPlace: (p) => {
      const id = uid();
      const base: RealmState = {
        ...state,
        firstPinCelebrated: true,
        places: [...state.places, { ...p, id, createdAt: Date.now(), addedBy: state.meId ?? "unknown" }],
      };
      const [next, effect] = withXp(base, XP.place + p.photos.length * XP.photo, "Flag planted");
      setState(next);
      effect();
      if (!state.firstPinCelebrated) push({ id: uid(), kind: "firstPin" });
      return id;
    },
    updatePlace: (id, p) => {
      setState((s) => ({ ...s, places: s.places.map((pl) => (pl.id === id ? { ...pl, ...p } : pl)) }));
      if (sound) clink();
    },
    addLog: (l) => {
      // A friend's answer to "did the Oath hold?" updates the place's trust labels.
      const places = state.places.map((pl) => {
        if (pl.id !== l.placeId) return pl;
        return {
          ...pl,
          oaths: pl.oaths.map((o) => {
            const answer = l.checks[o.oath as OathId];
            const trust: Trust = answer === "yes" ? "sworn" : answer === "no" ? "beware" : o.trust;
            return { ...o, trust };
          }),
        };
      });
      const base: RealmState = {
        ...state,
        places,
        logs: [...state.logs, { ...l, id: uid(), createdAt: Date.now(), memberId: state.meId ?? "unknown" }],
      };
      const [next, effect] = withXp(base, XP.log + l.photos.length * XP.photo, "Quest Log written");
      setState(next);
      effect();
    },
    addPhotos: (placeId, photos) => {
      const base: RealmState = {
        ...state,
        places: state.places.map((pl) => (pl.id === placeId ? { ...pl, photos: [...pl.photos, ...photos] } : pl)),
      };
      const [next, effect] = withXp(base, photos.length * XP.photo, photos.length === 1 ? "Photo added" : "Photos added");
      setState(next);
      effect();
    },
    toggleHoard: (placeId) => {
      setState((s) => ({
        ...s,
        members: s.members.map((m) =>
          m.id === s.meId
            ? { ...m, hoard: m.hoard.includes(placeId) ? m.hoard.filter((h) => h !== placeId) : [...m.hoard, placeId] }
            : m,
        ),
      }));
      if (sound) clink();
    },
    toggleDish: (dishId) => {
      const who = state.members.find((m) => m.id === state.meId);
      if (!who) return;
      const has = who.bestiary.includes(dishId);
      const base: RealmState = {
        ...state,
        members: state.members.map((m) =>
          m.id === who.id
            ? { ...m, bestiary: has ? m.bestiary.filter((d) => d !== dishId) : [...m.bestiary, dishId] }
            : m,
        ),
      };
      if (has) return setState(base);
      const [next, effect] = withXp(base, XP.dish, "Beast tasted");
      setState(next);
      effect();
    },
    addExpedition: (e) => {
      const id = uid();
      setState((s) => ({ ...s, expeditions: [...s.expeditions, { ...e, id }] }));
      if (sound) clink();
      return id;
    },
    toggleExpeditionPlace: (expId, placeId) =>
      setState((s) => ({
        ...s,
        expeditions: s.expeditions.map((e) =>
          e.id === expId
            ? {
                ...e,
                placeIds: e.placeIds.includes(placeId)
                  ? e.placeIds.filter((p) => p !== placeId)
                  : [...e.placeIds, placeId],
              }
            : e,
        ),
      })),
    setNight: (v) => setState((s) => ({ ...s, night: v })),
    setSound: (v) => setState((s) => ({ ...s, sound: v })),
    summonDragon: () => {
      setDragon(true);
      if (sound) fanfare();
    },
    dismissDragon: () => setDragon(false),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useRealm() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRealm must be used inside RealmProvider");
  return s;
}
