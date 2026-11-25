#!/usr/bin/env node
// Import diet-friendly food places from OpenStreetMap into the shared realm.
//
// Every imported place arrives as a "Rumour": OpenStreetMap says it keeps an
// Oath, but no friend has vouched for it yet. Running it again is safe —
// places already imported (or already planted by a friend nearby) are skipped.
//
// Usage (from the project folder):
//   npm run import:osm -- --dry-run                 preview, writes nothing
//   npm run import:osm                              import every region
//   npm run import:osm -- --regions hanoi,bali      only some regions
//   npm run import:osm -- --limit 100               at most 100 places per region
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// and FELLOWSHIP_PASSPHRASE (your current phrase; .env.local is never committed).
//
// Data © OpenStreetMap contributors, available under the Open Database License.

import { existsSync } from "node:fs";

// Each region is either a box [south, west, north, east] that sits fully inside
// one country, or a list of province codes (ISO 3166-2) for regions on a
// border, so nothing from China, Malaysia, Singapore or Timor-Leste slips in.
const REGIONS = {
  hanoi: { name: "Hanoi", country: "VN", bbox: [20.95, 105.75, 21.1, 105.92] },
  sapa: { name: "Sapa", country: "VN", bbox: [22.25, 103.75, 22.42, 103.92] },
  hagiang: { name: "Ha Giang", country: "VN", provinces: ["VN-03"] },
  ninhbinh: { name: "Ninh Binh", country: "VN", bbox: [20.1, 105.8, 20.35, 106.05] },
  danang: { name: "Da Nang", country: "VN", bbox: [15.95, 108.1, 16.15, 108.3] },
  hochiminh: { name: "Ho Chi Minh City", country: "VN", bbox: [10.7, 106.6, 10.86, 106.78] },
  hoian: { name: "Hoi An", country: "VN", bbox: [15.84, 108.27, 15.93, 108.37] },
  bali: { name: "Bali", country: "ID", bbox: [-8.9, 114.4, -8.05, 115.75] },
  sumatra: {
    name: "Sumatra",
    country: "ID",
    provinces: ["ID-AC", "ID-SU", "ID-SB", "ID-RI", "ID-JA", "ID-SS", "ID-BE", "ID-LA", "ID-BB", "ID-KR"],
  },
  java: { name: "Java", country: "ID", bbox: [-8.9, 105.1, -5.8, 114.6] },
  sulawesi: { name: "Sulawesi", country: "ID", bbox: [-6.0, 118.7, 2.0, 125.3] },
  lombok: { name: "Lombok", country: "ID", bbox: [-9.0, 115.8, -8.2, 116.8] },
  // Raja Ampat is in Southwest Papua province.
  rajaampat: { name: "Raja Ampat & Maluku", country: "ID", provinces: ["ID-PD", "ID-MA", "ID-MU"] },
};

const REALM = { VN: "vietnam", ID: "indonesia" };
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const USER_AGENT = "wayfarers-guide-osm-import/1.0";

/* ── Arguments and settings ─────────────────────────── */
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("dry-run");
const limit = Number(option("limit") ?? 200);
const picked = (option("regions") ?? Object.keys(REGIONS).join(",")).split(",").map((r) => r.trim().toLowerCase());
const unknown = picked.filter((r) => !REGIONS[r]);
if (unknown.length) fail(`Unknown region: ${unknown.join(", ")}. Choose from: ${Object.keys(REGIONS).join(", ")}`);
if (!Number.isInteger(limit) || limit < 1) fail("--limit must be a whole number above 0.");

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PHRASE = process.env.FELLOWSHIP_PASSPHRASE;
if (!dryRun && (!URL || !KEY)) fail("Missing Supabase settings. Run this from the project folder, where .env.local lives.");
if (!dryRun && !PHRASE) fail("Add FELLOWSHIP_PASSPHRASE=your phrase to .env.local, or use --dry-run to preview.");

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── OpenStreetMap ──────────────────────────────────── */
function query({ bbox, provinces }) {
  const food = '["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]';
  const shops = '["shop"~"^(supermarket|greengrocer|health_food|convenience)$"]';
  const diet = '[~"^diet:(halal|vegetarian|vegan|gluten_free)$"~"^(yes|only)$"]';
  const cuisine = '["cuisine"~"vegan|vegetarian",i]';
  const head = provinces ? `area["ISO3166-2"~"^(${provinces.join("|")})$"]->.r;\n` : "";
  const where = provinces ? "(area.r)" : `(${bbox.join(",")})`;
  return `[out:json][timeout:180];
${head}(
  nwr${food}["name"]${diet}${where};
  nwr${food}["name"]${cuisine}${where};
  nwr${shops}["name"]${diet}${where};
);
out center tags;`;
}

async function overpass(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const endpoint = OVERPASS[attempt % OVERPASS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      });
      if (res.ok) {
        const json = await res.json();
        // A timed-out query still replies 200, with an error remark and no elements: retry it.
        if (!/error|timed out|out of memory/i.test(json.remark ?? "")) return json.elements ?? [];
      } else if (![429, 502, 503, 504].includes(res.status)) throw new Error(`Overpass replied ${res.status}`);
    } catch (e) {
      if (attempt === 3) throw e;
    }
    await sleep(15000 * (attempt + 1)); // busy: wait and try the other server
  }
  throw new Error("OpenStreetMap's Overpass servers are busy. Try again in a few minutes.");
}

const yes = (v) => v === "yes" || v === "only";

function toPlace(el, regionKey) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null || !t.name) return null;

  const cuisine = (t.cuisine ?? "").toLowerCase();
  const meatFree = t["diet:vegetarian"] === "only" || t["diet:vegan"] === "only";
  // Many meat-free places carry a copy-pasted "halal + gluten-free" template.
  // Meat-free is not the same as halal-certified, so those claims are skipped.
  const template = meatFree && yes(t["diet:halal"]) && yes(t["diet:gluten_free"]);
  const oaths = new Set();
  if (yes(t["diet:halal"]) && !meatFree) oaths.add("halal");
  if (yes(t["diet:vegetarian"]) || cuisine.includes("vegetarian")) oaths.add("green");
  if (yes(t["diet:vegan"]) || cuisine.includes("vegan")) oaths.add("plant");
  if (yes(t["diet:gluten_free"]) && !template) oaths.add("gluten");
  if (!oaths.size) return null;

  const kind = t.shop
    ? "market"
    : t.amenity === "cafe"
      ? "potion"
      : t.amenity === "fast_food" || t.amenity === "food_court"
        ? "hearth"
        : "tavern";
  const address = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] ?? t["addr:district"], t["addr:city"]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const region = REGIONS[regionKey];

  return {
    place: {
      id: `osm-${el.type[0]}${el.id}`,
      name: t["name:en"] && t["name:en"] !== t.name ? `${t.name} (${t["name:en"]})`.slice(0, 120) : t.name.slice(0, 120),
      kind,
      description: `Found on OpenStreetMap in ${region.name}. Not yet tested by the Fellowship.`,
      address: address || region.name,
      lat,
      lng,
      price: kind === "hearth" || kind === "market" ? 1 : 2,
      hours: (t.opening_hours ?? "").slice(0, 120),
      realm: REALM[region.country],
      added_by: null,
      sample: false,
    },
    oaths: [...oaths].map((oath) => ({ place_id: `osm-${el.type[0]}${el.id}`, oath, trust: "rumour" })),
  };
}

/* ── Supabase ───────────────────────────────────────── */
const headers = () => ({
  apikey: KEY,
  "x-fellowship": PHRASE,
  "Content-Type": "application/json",
});

async function supabase(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...init.headers } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 || res.headers.get("content-length") === "0" ? null : res.json();
}

async function insert(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    await supabase(table, {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
  }
}

function distanceM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const simple = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Pick up to `n` places spread across the region, not bunched by alphabet:
 *  round-robin over ~20 km grid cells, best-tagged places first in each cell. */
function spread(list, n) {
  const cells = new Map();
  for (const p of list) {
    const k = `${Math.floor(p.place.lat / 0.2)}:${Math.floor(p.place.lng / 0.2)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(p);
  }
  const queues = [...cells.values()].map((c) => c.sort((a, b) => b.oaths.length - a.oaths.length));
  const out = [];
  while (out.length < n && queues.some((q) => q.length)) for (const q of queues) if (q.length && out.length < n) out.push(q.shift());
  return out;
}

/* ── Run ────────────────────────────────────────────── */
console.log(`\n${dryRun ? "Previewing" : "Importing"} from OpenStreetMap: ${picked.map((r) => REGIONS[r].name).join(", ")}`);
console.log(`At most ${limit} places per region.${dryRun ? " Dry run: nothing will be written." : ""}\n`);

let existing = [];
if (!dryRun) {
  const ok = await supabase("rpc/fellowship_ok", { method: "POST", body: "{}" });
  if (ok !== true) fail("Supabase didn't accept FELLOWSHIP_PASSPHRASE. Check it matches the current phrase.");
  existing = await supabase("places?select=id,name,lat,lng");
}
const existingIds = new Set(existing.map((p) => p.id));

const totals = { found: 0, added: 0, skipped: 0 };
for (const key of picked) {
  const region = REGIONS[key];
  process.stdout.write(`  ${region.name.padEnd(22)}`);
  let elements;
  try {
    elements = await overpass(query(region));
  } catch (e) {
    console.log(`✗ ${e.message}`);
    continue;
  }

  // Drop repeats: the same place mapped as both a point and a building outline.
  const found = [];
  for (const p of elements.map((el) => toPlace(el, key)).filter(Boolean)) {
    const dup = found.some(
      (f) => f.place.id === p.place.id || (simple(f.place.name) === simple(p.place.name) && distanceM(f.place, p.place) < 150),
    );
    if (!dup) found.push(p);
  }

  const fresh = found.filter(({ place }) => {
    if (existingIds.has(place.id)) return false;
    // A friend may already have planted this place by hand.
    const key = simple(place.name).slice(0, 8);
    return !existing.some(
      (e) => distanceM(e, place) < 60 && (key.length < 3 ? e.name === place.name : simple(e.name).includes(key)),
    );
  });
  const chosen = spread(fresh, limit);
  totals.found += found.length;
  totals.skipped += found.length - chosen.length;

  const byOath = {};
  for (const { oaths } of chosen) for (const o of oaths) byOath[o.oath] = (byOath[o.oath] ?? 0) + 1;
  const summary = Object.entries(byOath)
    .map(([o, n]) => `${n} ${{ halal: "halal", green: "veg", plant: "vegan", gluten: "gluten-free" }[o]}`)
    .join(", ");

  if (!dryRun && chosen.length) {
    await insert("places", chosen.map((c) => c.place));
    await insert("oaths_on_places", chosen.flatMap((c) => c.oaths));
    chosen.forEach((c) => existing.push(c.place));
  }
  totals.added += chosen.length;
  const extra = fresh.length > chosen.length ? ` (${fresh.length - chosen.length} more over the limit)` : "";
  console.log(`${String(chosen.length).padStart(4)} ${dryRun ? "to add" : "added"}${chosen.length ? ` · ${summary}` : ""}${extra}`);

  if (dryRun && chosen.length && flag("show")) {
    for (const { place, oaths } of chosen.slice(0, 5)) console.log(`        - ${place.name} [${oaths.map((o) => o.oath).join(", ")}]`);
  }
  await sleep(4000); // be gentle with the free Overpass servers
}

console.log(
  `\n${dryRun ? "Would add" : "Added"} ${totals.added} places (${totals.found} found, ${totals.skipped} skipped as duplicates or over the limit).`,
);
if (!dryRun && totals.added) console.log("They show on the map as Rumours. Reload the site to see them.\n");
