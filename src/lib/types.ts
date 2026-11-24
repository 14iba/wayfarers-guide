export type OathId = "halal" | "green" | "plant" | "jain" | "gluten" | "nut";
export type Trust = "sworn" | "rumour" | "beware";
export type PlaceKind = "tavern" | "inn" | "hideout" | "hearth" | "potion" | "market";
export type RealmId = "vietnam" | "indonesia";

export interface PlaceOath {
  oath: OathId;
  trust: Trust;
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  description: string;
  address: string;
  lat: number;
  lng: number;
  price: 1 | 2 | 3;
  hours: string;
  photos: string[];
  oaths: PlaceOath[];
  realm: RealmId;
  addedBy: string;
  createdAt: number;
  sample?: boolean;
}

export type YesNo = "yes" | "no" | "unsure";

export interface QuestLog {
  id: string;
  placeId: string;
  memberId: string;
  stars: number;
  oathHeld: number;
  note: string;
  visitDate: string;
  photos: string[];
  checks: Partial<Record<OathId, YesNo>>;
  understood: YesNo;
  createdAt: number;
}

export interface Member {
  id: string;
  name: string;
  cls: string;
  avatar: string;
  oaths: OathId[];
  hoard: string[];
  xp: number;
  bestiary: string[];
  sample?: boolean;
}

export interface Expedition {
  id: string;
  name: string;
  realm: RealmId;
  dates: string;
  placeIds: string[];
  memberIds: string[];
}

export interface RealmState {
  version: 1;
  places: Place[];
  logs: QuestLog[];
  members: Member[];
  expeditions: Expedition[];
  meId: string | null;
  firstPinCelebrated: boolean;
  night: boolean;
  sound: boolean;
}
