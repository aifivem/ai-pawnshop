import {
  aiLog,
  inventory,
  isNear,
  notify,
  onClientCallback,
} from "@aicore-fivem/lib/server";
import { fail, oneArg, readInt, readText } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, type Offer } from "common/pawn";
import { core, settings, shops } from "./content";

/** What the shop buys that the player carries, summed over stacks (the sell menu's one snapshot). */
onClientCallback(
  EVENTS.offers,
  { args: oneArg((v) => readText(v, 64)) },
  (source, id) => {
    const shop = shops.get(id);
    if (!shop || !isNear(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
    const offers = new Map<string, Offer>();
    for (const stack of inventory.getItems(source)) {
      const price = shop.prices.get(stack.name);
      if (price === undefined) continue;
      const offer = offers.get(stack.name) ?? {
        name: stack.name,
        label: stack.label,
        count: 0,
        price,
      };
      offer.count += stack.count;
      offers.set(stack.name, offer);
    }
    return { ok: true, offers: [...offers.values()] };
  },
);

onClientCallback(
  EVENTS.sell,
  {
    args: ([id, item, count]): [string, string, number] | null => {
      const shop = readText(id, 64);
      const name = readText(item, 64);
      const n = readInt(count, 1, 10_000);
      return shop === null || name === null || n === null
        ? null
        : [shop, name, n];
    },
    lock: true,
  },
  (source, id, item, count) => {
    const shop = shops.get(id);
    if (!shop || !isNear(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
    const price = shop.prices.get(item);
    if (price === undefined) return fail("PAWN_ERR_NOT_BUYING");
    if (!inventory.removeItem(source, item, count))
      return fail("PAWN_ERR_COUNT");
    const total = price * count;
    if (total > 0)
      core.AddMoney(source, settings.value.account, total, `pawn:${shop.id}`);
    notify(source, Locale("PAWN_SOLD", count, total), "success");
    aiLog("pawn", `sold ${count} ${item}`, {
      source,
      metadata: { shop: shop.id, total },
    });
    return { ok: true };
  },
);
