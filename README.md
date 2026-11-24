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

## Deploying

Pushing to `main` deploys to production on Vercel automatically.
