import type { OathId, Place, QuestLog } from "./types";

/** Distance in km between two points (haversine). */
export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A place keeps an oath if it lists it and no friend has marked it Beware. */
export function keepsOaths(place: Place, oaths: OathId[]) {
  return oaths.every((o) => place.oaths.some((po) => po.oath === o && po.trust !== "beware"));
}

export function avgStars(logs: QuestLog[], placeId: string) {
  const mine = logs.filter((l) => l.placeId === placeId);
  if (!mine.length) return null;
  return mine.reduce((s, l) => s + l.stars, 0) / mine.length;
}

/** The place's strongest trust: any Beware wins, then Sworn, else Rumour. */
export function placeTrust(place: Place) {
  if (place.oaths.some((o) => o.trust === "beware")) return "beware" as const;
  if (place.oaths.some((o) => o.trust === "sworn")) return "sworn" as const;
  return "rumour" as const;
}

export function directionsUrl(place: Place) {
  return `https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`;
}

/** Shrink a photo so it fits in browser storage. */
export function shrinkPhoto(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a picture we can read."));
    };
    img.src = url;
  });
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
