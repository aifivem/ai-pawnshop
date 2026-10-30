import { AdminWorld, cache, input, loadLocaleTexts, menu, notify, player, Points, progress, triggerServerCallback } from "@aicore-fivem/lib/client";
import { record } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readShops, readYards, toOffers } from "common/pawn";

const world = new AdminWorld(["shops", "scrapyards"]);
const texts = loadLocaleTexts();
const content = { shops: readShops(world.get("shops")), yards: readYards(world.get("scrapyards")) };
const errorText = (v: unknown, fallback: string): string => {
  const key = typeof record(v).error === "string" ? String(record(v).error) : fallback;
  return texts[key] ?? key;
};

/** Pawnshop and scrapyard points and blips, built again when the panel changes them. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const shop of content.shops.values())
    points.add(`shop:${shop.id}`, {
      coords: shop.coords,
      label: Locale("PAWN_PROMPT_SHOP", shop.label),
      icon: "sack-dollar",
      blip: shop.blip ? { sprite: 431, color: 0, scale: 0.7, label: shop.label } : undefined,
      onPressed: () => pawn(shop.id, shop.label),
    });
  for (const yard of content.yards.values())
    points.add(`yard:${yard.id}`, {
      coords: yard.coords,
      label: Locale("PAWN_PROMPT_YARD"),
      icon: "car-burst",
      radius: 10,
      blip: yard.blip ? { sprite: 380, color: 0, scale: 0.7, label: yard.label } : undefined,
      onPressed: () => scrap(yard.id),
    });
}

rebuild();
world.onChange("shops", () => {
  content.shops = readShops(world.get("shops"));
  rebuild();
});
world.onChange("scrapyards", () => {
  content.yards = readYards(world.get("scrapyards"));
  rebuild();
});

/** Sell menu: one snapshot of what the shop buys from the player, then sell and ask again. */
async function pawn(shopId: string, title: string): Promise<void> {
  for (;;) {
    const result = record(await triggerServerCallback(EVENTS.offers, [shopId]).catch(() => null));
    if (result.ok !== true) return notify(errorText(result, "PAWN_ERR_FAR"), "error");
    const offers = toOffers(result.offers);
    if (offers.length === 0) return notify(Locale("PAWN_NOTHING"), "info");
    const pick = await menu({ title, items: offers.map((o) => ({ id: o.name, label: o.label, description: Locale("PAWN_OFFER", o.price, o.count) })) });
    const offer = offers.find((o) => o.name === pick);
    if (!offer) return;
    const values = await input({ title: offer.label, confirm: Locale("PAWN_SELL"), fields: [{ name: "count", label: Locale("PAWN_COUNT"), type: "number", min: 1, max: offer.count, placeholder: String(offer.count) }] });
    const count = Math.floor(Number(values?.count));
    if (!values || !(count >= 1 && count <= offer.count)) continue;
    const sold = record(await triggerServerCallback(EVENTS.sell, [shopId, offer.name, count]).catch(() => null));
    if (sold.ok !== true) notify(errorText(sold, "PAWN_ERR_FAR"), "error");
  }
}

/** The closest vehicle within 6 m of the player, on foot. */
function vehicleNearby(): number | null {
  if (cache.vehicle !== false) return null;
  const { x, y, z } = player.coords();
  const vehicle = GetClosestVehicle(x, y, z, 6, 0, 70);
  return vehicle && DoesEntityExist(vehicle) ? vehicle : null;
}

async function scrap(yardId: string): Promise<void> {
  const vehicle = vehicleNearby();
  if (vehicle === null) return notify(Locale("PAWN_ERR_NO_VEHICLE"), "warning");
  const started = record(await triggerServerCallback(EVENTS.scrapStart, [yardId, VehToNet(vehicle)]).catch(() => null));
  if (started.ok !== true || typeof started.token !== "number" || typeof started.seconds !== "number") return notify(errorText(started, "PAWN_ERR_FAR"), "error");
  TaskTurnPedToFaceEntity(cache.ped, vehicle, 1000);
  const done = await progress({ label: Locale("PAWN_SCRAPPING"), duration: started.seconds * 1000, anim: { dict: "mini@repair", clip: "fixing_a_player" } });
  if (!done) return;
  const result = record(await triggerServerCallback(EVENTS.scrapFinish, [started.token]).catch(() => null));
  if (result.ok !== true) notify(errorText(result, "PAWN_ERR_FAR"), "error");
}
