import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  entityCoords,
  inventory,
  isNear,
  notify,
  onClientCallback,
  online,
  optionalExport,
  PendingActions,
  resourceExport,
  vehicleNearPlayer,
} from "@aicore-fivem/lib/server";
import {
  fail,
  oneArg,
  readId,
  readInt,
  readText,
} from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  readSettings,
  readShops,
  readYards,
  type Offer,
} from "common/pawn";
import { pawnSchema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(pawnSchema);
const settings = panel.view("settings", readSettings);
const shops = panel.view("shops", readShops);
const yards = panel.view("scrapyards", readYards);
aiLogChannels({ pawn: {}, scrap: {} });

/** What the shop buys that the player carries, summed over stacks (the sell menu's one snapshot). */
onClientCallback(
  EVENTS.offers,
  { args: oneArg((v) => readText(v, 64)) },
  (source, id) => {
    const shop = shops.value.get(id);
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
    const shop = shops.value.get(id);
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

/** Vehicles being taken apart (one per player, token + 80% of the time). */
const scraps = new PendingActions<{ yard: string; vehicle: number }>();

/**
 * When each character may scrap again (Date.now), kept by character id so a reconnect does not reset it; expired
 * entries are dropped on the next start.
 */
const nextScrap = new Map<number, number>();
function cooldownLeft(charId: number): number {
  const until = nextScrap.get(charId) ?? 0;
  return Math.max(0, until - Date.now());
}
function startCooldown(charId: number, ms: number): void {
  const now = Date.now();
  for (const [id, until] of nextScrap) if (until <= now) nextScrap.delete(id);
  if (ms > 0) nextScrap.set(charId, now + ms);
}

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
    const yard = yards.value.get(id);
    const charId = online.character(source)?.id;
    if (!yard || charId === undefined || !isNear(source, yard.coords, 12))
      return fail("PAWN_ERR_FAR");
    if (cooldownLeft(charId) > 0) return fail("PAWN_ERR_COOLDOWN");
    const vehicle = vehicleNearPlayer(source, netId, { metres: 6 });
    if (!vehicle) return fail("PAWN_ERR_NO_VEHICLE");
    if (
      GetVehiclePedIsIn(GetPlayerPed(String(source)), false) === vehicle ||
      GetPedInVehicleSeat(vehicle, -1) !== 0
    )
      return fail("PAWN_ERR_EMPTY_IT");
    const refused = scrappable(vehicle);
    if (refused) return fail(refused);
    const seconds = settings.value.scrapSeconds;
    const token = scraps.start(source, { yard: id, vehicle }, seconds * 1000);
    return { ok: true, token, seconds };
  },
);

onClientCallback(
  EVENTS.scrapFinish,
  { args: oneArg(readId), lock: true },
  (source, token) => {
    const scrap = scraps.take(source, token);
    const yard = scrap ? yards.value.get(scrap.yard) : undefined;
    const charId = online.character(source)?.id;
    if (
      !scrap ||
      !yard ||
      charId === undefined ||
      !DoesEntityExist(scrap.vehicle) ||
      !isNear(source, yard.coords, 12) ||
      !isNear(source, entityCoords(scrap.vehicle), 8)
    )
      return fail("PAWN_ERR_FAR");
    if (GetPedInVehicleSeat(scrap.vehicle, -1) !== 0)
      return fail("PAWN_ERR_EMPTY_IT");
    DeleteEntity(scrap.vehicle);
    startCooldown(charId, settings.value.scrapCooldown * 60_000);
    for (const reward of yard.rewards) {
      const count =
        reward.min + Math.floor(Math.random() * (reward.max - reward.min + 1));
      if (count > 0) inventory.addItem(source, reward.name, count);
    }
    notify(source, Locale("PAWN_SCRAPPED"), "success");
    aiLog("scrap", "scrapped a vehicle", {
      source,
      metadata: { yard: yard.id },
    });
    return { ok: true };
  },
);
