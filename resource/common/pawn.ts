import {
  bool,
  int,
  num,
  type PlacePed,
  readBlipStyle,
  readPlacePed,
  record,
  str,
} from "@aicore-fivem/lib/shared";

/** ai-pawnshop's contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: (shopId) -> { ok, offers: Offer[] } what this shop buys that the player carries. */
  offers: "ai-pawnshop:offers",
  /** Callback: (shopId, item, count) -> { ok } sells items. */
  sell: "ai-pawnshop:sell",
  /** Callback: (yardId, netId) -> { ok } starts taking a vehicle apart (the server runs the progress bar and pays). */
  scrapStart: "ai-pawnshop:scrapStart",
} as const;

type Point = { x: number; y: number; z: number };
const point = (v: unknown): Point => {
  const p = record(v);
  return { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0) };
};
const list = (v: unknown) => (Array.isArray(v) ? v.map(record) : []);

export interface BlipStyle {
  sprite: number;
  color: number;
  scale: number;
}
export const SHOP_BLIP: BlipStyle = { sprite: 431, color: 0, scale: 0.7 };
export const YARD_BLIP: BlipStyle = { sprite: 380, color: 0, scale: 0.7 };
const blipStyle = (v: unknown, d: BlipStyle): BlipStyle => {
  const b = record(v);
  return readBlipStyle(b, { sprite: d.sprite, color: d.color, scale: d.scale });
};

export interface Settings {
  account: string;
  /** Minutes between two vehicles one player scraps. */
  scrapCooldown: number;
  scrapSeconds: number;
}

export function readSettings(raw: unknown): Settings {
  const v = record(raw);
  return {
    account: str(v.account, "cash", 32),
    scrapCooldown: int(v.scrapCooldown, 15, 0, 1440),
    scrapSeconds: int(v.scrapSeconds, 30, 1, 600),
  };
}

export interface Shop {
  /** NPC standing at the place (panel), null for none. */
  ped: PlacePed | null;
  id: string;
  label: string;
  coords: Point;
  blip: boolean;
  blipStyle: BlipStyle;
  /** Item -> dollars paid per piece. */
  prices: Map<string, number>;
}

export function readShops(raw: unknown): Map<string, Shop> {
  const out = new Map<string, Shop>();
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    const prices = new Map<string, number>();
    for (const row of list(v.items))
      if (typeof row.name === "string")
        prices.set(row.name, int(row.price, 0, 0));
    out.set(id, {
      ped: readPlacePed(v.ped),
      id,
      label: str(v.label, id, 48),
      coords: point(v.coords),
      blip: bool(v.blip, true),
      blipStyle: blipStyle(v.blipStyle, SHOP_BLIP),
      prices,
    });
  }
  return out;
}

export interface Yard {
  id: string;
  label: string;
  coords: Point;
  blip: boolean;
  blipStyle: BlipStyle;
  rewards: Array<{ name: string; min: number; max: number }>;
}

export function readYards(raw: unknown): Map<string, Yard> {
  const out = new Map<string, Yard>();
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    const rewards = list(v.rewards).flatMap((r) => {
      if (typeof r.name !== "string") return [];
      const min = int(r.min, 1, 0, 100);
      return [
        { name: r.name, min, max: Math.max(min, int(r.max, min, 0, 100)) },
      ];
    });
    out.set(id, {
      id,
      label: str(v.label, id, 48),
      coords: point(v.coords),
      blip: bool(v.blip, true),
      blipStyle: blipStyle(v.blipStyle, YARD_BLIP),
      rewards,
    });
  }
  return out;
}

export interface Offer {
  name: string;
  label: string;
  count: number;
  price: number;
}

export function toOffers(v: unknown): Offer[] {
  return list(v).flatMap((o) =>
    typeof o.name === "string" &&
    typeof o.label === "string" &&
    typeof o.count === "number" &&
    typeof o.price === "number"
      ? [{ name: o.name, label: o.label, count: o.count, price: o.price }]
      : [],
  );
}
