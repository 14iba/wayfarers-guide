import type { OathId, PlaceKind, RealmId, Trust } from "./types";

export const REALM_NAME = "The Land of the Free-Men";

/** Change this to your Fellowship's secret phrase. Not case sensitive. */
export const PASSPHRASE = "second breakfast";

export const OATHS: Record<OathId, { name: string; plain: string; glyph: string; allergy: boolean }> = {
  halal: { name: "Halal Oath", plain: "halal", glyph: "☾", allergy: false },
  green: { name: "Green Oath", plain: "vegetarian", glyph: "♣", allergy: false },
  plant: { name: "Pure-Plant Oath", plain: "vegan", glyph: "❦", allergy: false },
  jain: { name: "Jain Oath", plain: "Jain", glyph: "✿", allergy: false },
  gluten: { name: "Gluten-Free Charm", plain: "gluten-free", glyph: "◇", allergy: true },
  nut: { name: "Nut-Free Charm", plain: "nut-free", glyph: "○", allergy: true },
};
export const OATH_IDS = Object.keys(OATHS) as OathId[];

export const TRUST: Record<Trust, { name: string; mark: string; plain: string }> = {
  sworn: { name: "Sworn by a Friend", mark: "⛨", plain: "Someone in the Fellowship ate here and vouches for it." },
  rumour: { name: "Rumour", mark: "≈", plain: "Heard about it. Not yet tested." },
  beware: { name: "Beware", mark: "!", plain: "A friend found this claim to be wrong." },
};

export const KINDS: Record<PlaceKind, { name: string; plain: string; glyph: string }> = {
  tavern: { name: "Tavern", plain: "restaurant", glyph: "T" },
  inn: { name: "Inn", plain: "sit-down spot", glyph: "I" },
  hideout: { name: "Hideout", plain: "hidden gem", glyph: "H" },
  hearth: { name: "Hearth", plain: "noodle stall", glyph: "~" },
  potion: { name: "Potion Parlour", plain: "café", glyph: "P" },
  market: { name: "Market of Wonders", plain: "grocery", glyph: "M" },
};
export const KIND_IDS = Object.keys(KINDS) as PlaceKind[];

export const REALMS: Record<RealmId, { name: string; center: [number, number]; zoom: number }> = {
  vietnam: { name: "Vietnam", center: [16.2, 106.6], zoom: 5 },
  indonesia: { name: "Indonesia", center: [-7.9, 113.2], zoom: 6 },
};

export const ALLERGY_NOTE = "Fellowship wisdom, not a guarantee — always ask the kitchen.";

export const CLASSES = [
  "Wandering Bard",
  "Snack Ranger",
  "Noodle Knight",
  "Spice Wizard",
  "Broth Cleric",
  "Dumpling Druid",
  "Coffee Alchemist",
  "Sambal Sorcerer",
  "Street-Food Rogue",
  "Mango Paladin",
];

export const AVATARS = ["(•‿•)", "ʕ•ᴥ•ʔ", "(=^･ω･^=)", "(ᵔᴥᵔ)", "(¬‿¬)", "(◕‿◕)", "( ˘▽˘)", "(o_O)", "(^_−)", "(╹ڡ╹)"];

export const TITLES = [
  "Hungry Newcomer",
  "Seeker of Snacks",
  "Keeper of the Broth",
  "Slayer of Bland Meals",
  "Warden of the Chilli Jar",
  "Lord of Second Breakfast",
  "Grand Gourmand of the Realm",
];

export const XP = { place: 30, log: 20, photo: 10, dish: 5 } as const;
export const XP_PER_LEVEL = 100;

export function levelOf(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function titleOf(xp: number) {
  return TITLES[Math.min(levelOf(xp) - 1, TITLES.length - 1)];
}

export const BESTIARY: { id: string; beast: string; dish: string; realm: RealmId; lore: string; art: string }[] = [
  { id: "pho", beast: "Dragon Broth", dish: "Phở", realm: "vietnam", lore: "Simmered all night until it breathes steam.", art: " (  )  )\n  ) (  (\n.-'''''-.\n|~~~~~~~|\n'._____.'" },
  { id: "banhmi", beast: "The Crunchy Sandwich Serpent", dish: "Bánh mì", realm: "vietnam", lore: "Long, golden, and it crackles when caught.", art: "  ______________\n /~~~~~~~~~~~~~~\\\n(  @  ~  @  ~  @ )\n \\______________/" },
  { id: "bunbo", beast: "Spice-Fire Hydra", dish: "Bún bò Huế", realm: "vietnam", lore: "Many noodles, one fiery temper.", art: " ~ ~ ~\n.-'''-.\n|^^^^^|\n'.___.'" },
  { id: "caolau", beast: "The Lantern Noodle", dish: "Cao lầu", realm: "vietnam", lore: "Only found where lanterns float on the river.", art: "  (_)\n .-'-.\n|=====|\n'.___.'" },
  { id: "banhxeo", beast: "Sizzling Moon Crêpe", dish: "Bánh xèo", realm: "vietnam", lore: "Folded like a half-moon, loud as a festival.", art: "   .--.\n .'    '.\n(________)" },
  { id: "goicuon", beast: "Glass-Scale Wyrmlings", dish: "Gỏi cuốn", realm: "vietnam", lore: "See-through scales, herbs within.", art: " (===) (===)\n (===) (===)" },
  { id: "cafe", beast: "Egg-Cloud Elixir", dish: "Cà phê trứng", realm: "vietnam", lore: "A potion with a cloud floating on top.", art: "  .~~.\n |~~~~|]\n |    |\n '----'" },
  { id: "nasigoreng", beast: "Ember Rice Golem", dish: "Nasi goreng", realm: "indonesia", lore: "Wears a fried egg as a crown.", art: "   (o)\n .-'''-.\n(:::::::)\n '-----'" },
  { id: "rendang", beast: "The Slow-Fire Ox", dish: "Rendang", realm: "indonesia", lore: "Patient. Rich. Takes hours to tame.", art: " ((   ))\n( o   o )\n '-._.-'" },
  { id: "satay", beast: "Skewer Sprites", dish: "Sate", realm: "indonesia", lore: "They travel in bundles over glowing coals.", art: "--o-o-o-o--\n--o-o-o-o--\n  ^^^^^^^" },
  { id: "gadogado", beast: "Peanut Grove Guardian", dish: "Gado-gado", realm: "indonesia", lore: "A garden that wears a peanut cloak.", art: " ,;;;;;,\n(  ***  )\n '-----'" },
  { id: "martabak", beast: "Folded Treasure Tome", dish: "Martabak", realm: "indonesia", lore: "Sweet or savoury. Every page is a surprise.", art: " ________\n|########|\n|########|\n'--------'" },
];
