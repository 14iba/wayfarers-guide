"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { Place, QuestLog } from "@/lib/types";
import { KINDS } from "@/lib/lore";
import { avgStars, placeTrust } from "@/lib/geo";
import { Coins, KindLabel, OathBadge, Stars } from "./bits";

function pinIcon(place: Place, chosen: boolean) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin${chosen ? " is-chosen" : ""}" data-trust="${placeTrust(place)}"><span>${KINDS[place.kind].glyph}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [4, 40],
    popupAnchor: [16, -38],
  });
}

const newPin = L.divIcon({ className: "pin-wrap", html: `<div class="pin-new"></div>`, iconSize: [32, 32], iconAnchor: [16, 16] });

function Watch({ onMove, onPick }: { onMove?: (c: [number, number]) => void; onPick?: (c: [number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove?.([c.lat, c.lng]);
    },
    click: (e) => onPick?.([e.latlng.lat, e.latlng.lng]),
  });
  return null;
}

function FlyTo({ to }: { to: { center: [number, number]; zoom: number; key: string } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!to) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) map.setView(to.center, to.zoom);
    else map.flyTo(to.center, to.zoom, { duration: 1.2 });
  }, [to, map]);
  return null;
}

export interface RealmMapProps {
  places: Place[];
  logs: QuestLog[];
  center: [number, number];
  zoom: number;
  flyTo?: { center: [number, number]; zoom: number; key: string } | null;
  chosenId?: string | null;
  onMove?: (c: [number, number]) => void;
  onPick?: (c: [number, number]) => void;
  picked?: [number, number] | null;
  className?: string;
  label: string;
}

export default function RealmMap({ places, logs, center, zoom, flyTo, chosenId, onMove, onPick, picked, className, label }: RealmMapProps) {
  const markers = useMemo(
    () =>
      places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p, p.id === chosenId)} title={p.name} alt={p.name}>
          {!onPick && (
            <Popup>
              <ScrollCard place={p} logs={logs} />
            </Popup>
          )}
        </Marker>
      )),
    [places, logs, chosenId, onPick],
  );

  return (
    <div className={`realm-map ${className ?? ""}`} role="region" aria-label={label}>
      <MapContainer center={center} zoom={zoom} minZoom={3} className="h-full w-full" worldCopyJump zoomControl={false}>
        <ZoomControl position={onPick ? "topleft" : "topright"} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Watch onMove={onMove} onPick={onPick} />
        <FlyTo to={flyTo ?? null} />
        {markers}
        {picked && <Marker position={picked} icon={newPin} title="Your new flag" alt="Your new flag" />}
      </MapContainer>
    </div>
  );
}

function ScrollCard({ place, logs }: { place: Place; logs: QuestLog[] }) {
  const photo = place.photos[0];
  return (
    <div className="w-[230px]">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- user photos stored as data URLs
        <img src={photo} alt="" className="mb-2 h-24 w-full rounded-md border-[1.5px] border-ink object-cover" />
      )}
      <p className="font-[family-name:var(--font-display)] text-lg leading-tight">{place.name}</p>
      <p className="text-sm">
        <KindLabel kind={place.kind} />
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <Coins n={place.price} />
        <Stars value={avgStars(logs, place.id)} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {place.oaths.map((o) => (
          <OathBadge key={o.oath} oath={o.oath} trust={o.trust} showTrust={false} />
        ))}
      </div>
      <Link href={`/tavern/${place.id}`} className="btn btn-moss sketch mt-3 w-full !text-on-moss">
        Open the tavern page
      </Link>
    </div>
  );
}
