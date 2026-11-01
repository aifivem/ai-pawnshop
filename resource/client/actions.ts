import {
  cache,
  callAction,
  input,
  menu,
  nearestVehicle,
  notify,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, toOffers } from "common/pawn";

const FAR = { fallback: "PAWN_ERR_FAR" };

/** Sell menu: one snapshot of what the shop buys from the player, then sell and ask again. */
export async function pawn(shopId: string, title: string): Promise<void> {
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

export async function scrap(yardId: string): Promise<void> {
  const vehicle = vehicleNearby();
  if (vehicle === null) return notify(Locale("PAWN_ERR_NO_VEHICLE"), "warning");
  // The server runs the progress bar and pays when it ran out.
  await callAction(EVENTS.scrapStart, [yardId, VehToNet(vehicle)], FAR);
}
