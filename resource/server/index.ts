import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  entityCoords,
  inventory,
  isNear,
  KeyedCooldowns,
  notify,
  onClientCallback,
  online,
  optionalExport,
  progressFor,
  resourceExport,
  vehicleNearPlayer,
  vehicleOf,
} from "@aicore-fivem/lib/server";
import {
  fail,
  oneArg,
  randomInt,
  readId,
  readInt,
  readText,
} from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  readSettings,
  readShop,
  readYard,
  type Offer,
} from "common/pawn";
import { pawnSchema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(pawnSchema);
const settings = panel.view("settings", readSettings);
const shops = panel.records("shops", readShop);
const yards = panel.records("scrapyards", readYard);
aiLogChannels({ pawn: {}, scrap: {} });

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

/** When each character may scrap again, by character id so a reconnect does not reset it. */
const scrapCooldowns = new KeyedCooldowns();

/** Population type of script vehicles (server-created: rentals, job and service cars, owned cars, the armored truck). */
const POPTYPE_MISSION = 7;

/** A world vehicle the yard takes: not created by a script, not registered in ai-vehicles. */
function scrappable(vehicle: number): string | null {
  if (GetEntityPopulationType(vehicle) === POPTYPE_MISSION)
    return "PAWN_ERR_OWNED";
  if (optionalExport("ai-vehicles")?.GetVehicleIdByEntity(vehicle) != null)
    return "PAWN_ERR_OWNED";
  return null;
}

onClientCallback(
  EVENTS.scrapStart,
  {
    args: ([id, netId]): [string, number] | null => {
      const yard = readText(id, 64);
      const net = readId(netId);
      return yard === null || net === null ? null : [yard, net];
    },
    lock: true,
  },
  (source, id, netId) => {
    const yard = yards.get(id);
    const charId = online.charId(source);
    if (!yard || charId === undefined || !isNear(source, yard.coords, 12))
      return fail("PAWN_ERR_FAR");
    if (!scrapCooldowns.ready(charId)) return fail("PAWN_ERR_COOLDOWN");
    const vehicle = vehicleNearPlayer(source, netId, { metres: 6 });
    if (!vehicle) return fail("PAWN_ERR_NO_VEHICLE");
    if (vehicleOf(source) === vehicle || GetPedInVehicleSeat(vehicle, -1) !== 0)
      return fail("PAWN_ERR_EMPTY_IT");
    const refused = scrappable(vehicle);
    if (refused) return fail(refused);
    void takeApart(source, yard.id, vehicle);
    return { ok: true };
  },
);

/**
 * The scrapping itself: the server-timed progress bar facing the vehicle (a second start replaces the first), then
 * the vehicle goes and the materials arrive if the player is still at the yard and the vehicle still empty.
 */
async function takeApart(
  source: number,
  yardId: string,
  vehicle: number,
): Promise<void> {
  const done = await progressFor(source, {
    label: Locale("PAWN_SCRAPPING"),
    duration: settings.value.scrapSeconds * 1000,
    anim: { dict: "mini@repair", clip: "fixing_a_player" },
    face: entityCoords(vehicle),
  });
  const yard = yards.get(yardId);
  const charId = online.charId(source);
  if (
    !done ||
    !yard ||
    charId === undefined ||
    !DoesEntityExist(vehicle) ||
    !isNear(source, yard.coords, 12) ||
    !isNear(source, entityCoords(vehicle), 8)
  )
    return;
  if (GetPedInVehicleSeat(vehicle, -1) !== 0)
    return notify(source, Locale("PAWN_ERR_EMPTY_IT"), "error");
  DeleteEntity(vehicle);
  scrapCooldowns.start(charId, settings.value.scrapCooldown * 60_000);
  for (const reward of yard.rewards) {
    const count = randomInt(reward.min, reward.max);
    if (count > 0) inventory.addItem(source, reward.name, count);
  }
  notify(source, Locale("PAWN_SCRAPPED"), "success");
  aiLog("scrap", "scrapped a vehicle", {
    source,
    metadata: { yard: yard.id },
  });
}
