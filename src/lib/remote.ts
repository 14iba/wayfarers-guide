"use client";

// Shared realm on Supabase. Every request carries the Fellowship passphrase in
// the `x-fellowship` header; database rules refuse anything without it.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { uid } from "./geo";
import { seedState } from "./seed";
import type { Expedition, Member, OathId, Place, PlaceOath, QuestLog, Trust } from "./types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const remoteEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
let clientPhrase = "";

export function db(phrase: string) {
  if (!remoteEnabled) throw new Error("Supabase isn't configured.");
  if (!client || clientPhrase !== phrase) {
    client = createClient(URL!, KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-fellowship": phrase } },
    });
    clientPhrase = phrase;
  }
  return client;
}

export async function checkPhrase(phrase: string) {
  const { data, error } = await db(phrase).rpc("fellowship_ok");
  if (error) throw new Error("Couldn't reach the realm. Check your connection and try again.");
  return data === true;
}

/* ── Row shapes ─────────────────────────────────────── */
type MemberRow = { id: string; name: string; cls: string; avatar: string; oaths: string[]; hoard: string[]; xp: number; bestiary: string[]; sample: boolean };
type PlaceRow = { id: string; name: string; kind: Place["kind"]; description: string; address: string; lat: number; lng: number; price: 1 | 2 | 3; hours: string; realm: Place["realm"]; added_by: string | null; sample: boolean; created_at: string };
type OathRow = { place_id: string; oath: OathId; trust: Trust };
type LogRow = { id: string; place_id: string; member_id: string | null; stars: number; oath_held: number; note: string; visit_date: string | null; checks: QuestLog["checks"]; understood: QuestLog["understood"]; created_at: string };
type PhotoRow = { id: string; place_id: string; log_id: string | null; data: string };
type ExpRow = { id: string; name: string; realm: Expedition["realm"]; dates: string; place_ids: string[]; member_ids: string[] };

const toMember = (r: MemberRow): Member => ({ ...r, oaths: r.oaths as OathId[], sample: r.sample || undefined });
const memberRow = (m: Member): MemberRow => ({ id: m.id, name: m.name, cls: m.cls, avatar: m.avatar, oaths: m.oaths, hoard: m.hoard, xp: m.xp, bestiary: m.bestiary, sample: !!m.sample });
const placeRow = (p: Place) => ({
  id: p.id, name: p.name, kind: p.kind, description: p.description, address: p.address, lat: p.lat, lng: p.lng,
  price: p.price, hours: p.hours, realm: p.realm, added_by: p.addedBy || null, sample: !!p.sample, created_at: new Date(p.createdAt).toISOString(),
});
const logRow = (l: QuestLog) => ({
  id: l.id, place_id: l.placeId, member_id: l.memberId, stars: l.stars, oath_held: l.oathHeld, note: l.note,
  visit_date: l.visitDate || null, checks: l.checks, understood: l.understood, created_at: new Date(l.createdAt).toISOString(),
});
const expRow = (e: Expedition): ExpRow => ({ id: e.id, name: e.name, realm: e.realm, dates: e.dates, place_ids: e.placeIds, member_ids: e.memberIds });

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface Shared {
  places: Place[];
  logs: QuestLog[];
  members: Member[];
  expeditions: Expedition[];
}

export async function loadShared(phrase: string): Promise<Shared> {
  const c = db(phrase);
  const [members, places, oaths, logs, photos, exps] = await Promise.all([
    c.from("members").select("*").then(check<MemberRow[]>),
    c.from("places").select("*").order("created_at").then(check<PlaceRow[]>),
    c.from("oaths_on_places").select("*").then(check<OathRow[]>),
    c.from("quest_logs").select("*").order("created_at").then(check<LogRow[]>),
    c.from("photos").select("id, place_id, log_id, data").order("created_at").then(check<PhotoRow[]>),
    c.from("expeditions").select("*").order("created_at").then(check<ExpRow[]>),
  ]);
  return {
    members: members.map(toMember),
    places: places.map((p) => ({
      id: p.id, name: p.name, kind: p.kind, description: p.description, address: p.address, lat: p.lat, lng: p.lng,
      price: p.price, hours: p.hours, realm: p.realm, addedBy: p.added_by ?? "", sample: p.sample || undefined,
      createdAt: Date.parse(p.created_at),
      oaths: oaths.filter((o) => o.place_id === p.id).map((o): PlaceOath => ({ oath: o.oath, trust: o.trust })),
      photos: photos.filter((ph) => ph.place_id === p.id && !ph.log_id).map((ph) => ph.data),
    })),
    logs: logs.map((l) => ({
      id: l.id, placeId: l.place_id, memberId: l.member_id ?? "", stars: l.stars, oathHeld: l.oath_held, note: l.note,
      visitDate: l.visit_date ?? "", checks: l.checks, understood: l.understood, createdAt: Date.parse(l.created_at),
      photos: photos.filter((ph) => ph.log_id === l.id).map((ph) => ph.data),
    })),
    expeditions: exps.map((e) => ({ id: e.id, name: e.name, realm: e.realm, dates: e.dates, placeIds: e.place_ids, memberIds: e.member_ids })),
  };
}

/** A brand-new realm gets the sample places so the map isn't empty. */
export async function seedIfEmpty(phrase: string) {
  const c = db(phrase);
  const { count, error } = await c.from("places").select("id", { count: "exact", head: true });
  if (error || (count ?? 0) > 0) return false;
  const s = seedState();
  check(await c.from("members").upsert(s.members.map(memberRow)));
  for (const p of s.places) await savePlace(phrase, p);
  check(await c.from("quest_logs").upsert(s.logs.map(logRow)));
  check(await c.from("expeditions").upsert(s.expeditions.map(expRow)));
  return true;
}

/* ── Writes ─────────────────────────────────────────── */
export async function saveMember(phrase: string, m: Member) {
  check(await db(phrase).from("members").upsert(memberRow(m)));
}

export async function savePlace(phrase: string, p: Place) {
  const c = db(phrase);
  const { photos: _photos, oaths, ...rest } = p;
  void _photos;
  check(await c.from("places").upsert(placeRow({ ...rest, photos: [], oaths: [] } as Place)));
  check(await c.from("oaths_on_places").delete().eq("place_id", p.id));
  if (oaths.length) check(await c.from("oaths_on_places").insert(oaths.map((o) => ({ place_id: p.id, oath: o.oath, trust: o.trust }))));
}

export async function addPhotos(phrase: string, placeId: string, photos: string[], logId: string | null = null) {
  if (!photos.length) return;
  check(await db(phrase).from("photos").insert(photos.map((data) => ({ id: uid(), place_id: placeId, log_id: logId, data }))));
}

export async function saveLog(phrase: string, l: QuestLog) {
  check(await db(phrase).from("quest_logs").insert(logRow(l)));
  await addPhotos(phrase, l.placeId, l.photos, l.id);
}

export async function saveExpedition(phrase: string, e: Expedition) {
  check(await db(phrase).from("expeditions").upsert(expRow(e)));
}

export async function replacePlacePhotos(phrase: string, placeId: string, photos: string[]) {
  check(await db(phrase).from("photos").delete().eq("place_id", placeId).is("log_id", null));
  await addPhotos(phrase, placeId, photos);
}
