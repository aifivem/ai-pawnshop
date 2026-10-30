import {
  AdminWorld,
  cache,
  callAction,
  input,
  menu,
  nearestVehicle,
  notify,
  Points,
  progress,
} from "@aicore-fivem/lib/client";
import { readFinite, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readShops, readYards, toOffers } from "common/pawn";

const world = new AdminWorld(["shops", "scrapyards"]);
const shops = world.view("shops", readShops);
const yards = world.view("scrapyards", readYards);
const FAR = { fallback: "PAWN_ERR_FAR" };

/** Pawnshop and scrapyard points and blips, built again when the panel changes them. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const shop of shops.value.values())
    points.add(`shop:${shop.id}`, {
      ped: shop.ped ?? undefined,
      coords: shop.coords,
      label: Locale("PAWN_PROMPT_SHOP", shop.label),
      icon: "sack-dollar",
      blip: shop.blip ? { ...shop.blipStyle, label: shop.label } : undefined,
      onPressed: () => pawn(shop.id, shop.label),
    });
  for (const yard of yards.value.values())
    points.add(`yard:${yard.id}`, {
      coords: yard.coords,
      label: Locale("PAWN_PROMPT_YARD"),
      icon: "car-burst",
      radius: 10,
      blip: yard.blip ? { ...yard.blipStyle, label: yard.label } : undefined,
      onPressed: () => scrap(yard.id),
    });
}

rebuild();
world.onChange("shops", rebuild);
world.onChange("scrapyards", rebuild);

/** Sell menu: one snapshot of what the shop buys from the player, then sell and ask again. */
async function pawn(shopId: string, title: string): Promise<void> {
  for (;;) {
    const result = await callAction(EVENTS.offers, [shopId], FAR);
    if (!result) return;
    const offers = toOffers(result.offers);
    if (offers.length === 0) return notify(Locale("PAWN_NOTHING"), "info");
    const pick = await menu({
      title,
      items: offers.map((o) => ({
        id: o.name,
        label: o.label,
        description: Locale("PAWN_OFFER", o.price, o.count),
      })),
    });
    const offer = offers.find((o) => o.name === pick);
    if (!offer) return;
    const values = await input({
      title: offer.label,
      confirm: Locale("PAWN_SELL"),
      fields: [
        {
          name: "count",
          label: Locale("PAWN_COUNT"),
          type: "number",
          min: 1,
          max: offer.count,
          placeholder: String(offer.count),
        },
      ],
    });
    const count = Math.floor(Number(values?.count));
    if (!values || !(count >= 1 && count <= offer.count)) continue;
    await callAction(EVENTS.sell, [shopId, offer.name, count], FAR);
  }
}

/** The closest vehicle within 6 m of the player, on foot. */
function vehicleNearby(): number | null {
  if (cache.vehicle !== false) return null;
  return nearestVehicle(6) || null;
}

async function scrap(yardId: string): Promise<void> {
  const vehicle = vehicleNearby();
  if (vehicle === null) return notify(Locale("PAWN_ERR_NO_VEHICLE"), "warning");
  const started = await callAction(
    EVENTS.scrapStart,
    [yardId, VehToNet(vehicle)],
    FAR,
  );
  const token = readId(started?.token);
  const seconds = readFinite(started?.seconds);
  if (token === null || seconds === null) return;
  TaskTurnPedToFaceEntity(cache.ped, vehicle, 1000);
  const done = await progress({
    label: Locale("PAWN_SCRAPPING"),
    duration: seconds * 1000,
    anim: { dict: "mini@repair", clip: "fixing_a_player" },
  });
  if (!done) return;
  await callAction(EVENTS.scrapFinish, [token], FAR);
}
