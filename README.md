# A Wayfarer's Guide

A tiny, whimsical map of where our friend group can eat well, wherever we wander.

Live at **https://wayfarers-guide.vercel.app** (friends only: you need the Fellowship passphrase).

## What's inside

- Parchment realm map (Leaflet + OpenStreetMap) with Oath filters, Party Mode and Roll for Lunch
- Tavern pages with Quest Logs, photos and trust labels (Sworn, Rumour, Beware)
- Fellowship profiles with XP, titles and the Dragon's Hoard
- The Bestiary, Expeditions, day/night mode, sounds and a secret dragon

## Run it locally

```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm install
npm run dev
```

Without `.env.local` the app still runs, saving everything in the browser.

## Data and access

Data lives in Supabase (`supabase/migrations/0001_wayfarer.sql`). Every request carries the
passphrase in an `x-fellowship` header and row-level security refuses anything without it.
To change the passphrase, run in the Supabase SQL editor:

```sql
update private.fellowship
set phrase_hash = encode(extensions.digest(lower(trim('your new phrase')), 'sha256'), 'hex');
```

## Importing places from OpenStreetMap

`scripts/import-osm.mjs` pulls named restaurants, cafés, food stalls and shops tagged as
halal, vegetarian, vegan or gluten-free from OpenStreetMap for 13 regions: Hanoi, Sapa,
Ha Giang, Ninh Binh, Da Nang, Ho Chi Minh City, Hoi An, Bali, Sumatra, Java, Sulawesi,
Lombok, and Raja Ampat & Maluku. Imports arrive as **Rumours** until a friend vouches for them.
Re-running is safe: places already on the map are skipped.

Add your current phrase to `.env.local` (never committed):

```
FELLOWSHIP_PASSPHRASE=your phrase
```

Then, from this folder:

```bash
npm run import:osm -- --dry-run          # preview counts, writes nothing
npm run import:osm                        # import every region
npm run import:osm -- --regions hanoi,bali --limit 50
```

Options: `--regions` (comma-separated: hanoi, sapa, hagiang, ninhbinh, danang, hochiminh,
hoian, bali, sumatra, java, sulawesi, lombok, rajaampat), `--limit` (per region, default 200),
`--show` (with `--dry-run`, list a few names per region).

OpenStreetMap tags are added by volunteers, so treat them as hints, not guarantees. Many
meat-free places carry a copy-pasted "halal + gluten-free" tag set; the importer skips the
halal claim on vegetarian-only or vegan-only places (and gluten-free when it comes from that
template), since meat-free is not the same as halal-certified. Big regions are sampled evenly
across ~20 km grid cells, so the limit doesn't bunch picks into one city.
Data © OpenStreetMap contributors, under the Open Database License.

## Deploying

Pushing to `main` deploys to production on Vercel automatically.
