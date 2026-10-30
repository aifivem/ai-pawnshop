import { AdminPanel, aiLog, aiLogChannels, inventory, notify, onClientCallback, optionalExport, resourceExport } from "@aicore-fivem/lib/server";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readSettings, readShops, readYards, type Offer } from "common/pawn";
import { pawnSchema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(pawnSchema);
/** Panel content, parsed again after every change. */
const content = { settings: readSettings(panel.get("settings")), shops: readShops(panel.get("shops")), yards: readYards(panel.get("scrapyards")) };
panel.onChange("settings", () => (content.settings = readSettings(panel.get("settings"))));
panel.onChange("shops", () => (content.shops = readShops(panel.get("shops"))));
panel.onChange("scrapyards", () => (content.yards = readYards(panel.get("scrapyards"))));
aiLogChannels({ pawn: {}, scrap: {} });

const fail = (error: string) => ({ ok: false as const, error });
const near = (source: number, at: { x: number; y: number; z: number }, metres: number) => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return Math.hypot(x - at.x, y - at.y, z - at.z) <= metres;
};

/** What the shop buys that the player carries, summed over stacks (the sell menu's one snapshot). */
onClientCallback(EVENTS.offers, { args: ([id]) => asArgs(typeof id === "string" ? id : null) }, (source, id) => {
  const shop = content.shops.get(id);
  if (!shop || !near(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
  const offers = new Map<string, Offer>();
  for (const stack of inventory.getItems(source)) {
    const price = shop.prices.get(stack.name);
    if (price === undefined) continue;
    const offer = offers.get(stack.name) ?? { name: stack.name, label: stack.label, count: 0, price };
    offer.count += stack.count;
    offers.set(stack.name, offer);
  }
  return { ok: true, offers: [...offers.values()] };
});

onClientCallback(
  EVENTS.sell,
  {
    args: ([id, item, count]): [string, string, number] | null =>
      typeof id === "string" && typeof item === "string" && typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 10_000 ? [id, item, count] : null,
    lock: true,
  },
  (source, id, item, count) => {
    const shop = content.shops.get(id);
    if (!shop || !near(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
    const price = shop.prices.get(item);
    if (price === undefined) return fail("PAWN_ERR_NOT_BUYING");
    if (!inventory.removeItem(source, item, count)) return fail("PAWN_ERR_COUNT");
    const total = price * count;
    if (total > 0) core.AddMoney(source, content.settings.account, total, `pawn:${shop.id}`);
    notify(source, Locale("PAWN_SOLD", count, total), "success");
    aiLog("pawn", `sold ${count} ${item}`, { source, metadata: { shop: shop.id, total } });
    return { ok: true };
  },
);

/** Vehicles being taken apart (one per player) and when each player may scrap again. */
const scraps = new Map<number, { token: number; yard: string; vehicle: number; startedAt: number }>();
const nextScrap = new Map<number, number>();
let nextToken = 0;

onClientCallback(
  EVENTS.scrapStart,
  { args: ([id, netId]): [string, number] | null => (typeof id === "string" && typeof netId === "number" && Number.isInteger(netId) ? [id, netId] : null), lock: true },
  (source, id, netId) => {
    const yard = content.yards.get(id);
    if (!yard || !near(source, yard.coords, 12)) return fail("PAWN_ERR_FAR");
    if ((nextScrap.get(source) ?? 0) > Date.now()) return fail("PAWN_ERR_COOLDOWN");
    const vehicle = NetworkGetEntityFromNetworkId(netId);
    if (!vehicle || !DoesEntityExist(vehicle) || GetEntityType(vehicle) !== 2) return fail("PAWN_ERR_NO_VEHICLE");
    const [x = 0, y = 0, z = 0] = GetEntityCoords(vehicle);
    if (!near(source, { x, y, z }, 6)) return fail("PAWN_ERR_NO_VEHICLE");
    if (GetVehiclePedIsIn(GetPlayerPed(String(source)), false) === vehicle || GetPedInVehicleSeat(vehicle, -1) !== 0) return fail("PAWN_ERR_EMPTY_IT");
    if (optionalExport("ai-vehicles")?.GetVehicleIdByEntity(vehicle) != null) return fail("PAWN_ERR_OWNED");
    const token = ++nextToken;
    scraps.set(source, { token, yard: id, vehicle, startedAt: Date.now() });
    return { ok: true, token, seconds: content.settings.scrapSeconds };
  },
);

onClientCallback(EVENTS.scrapFinish, { args: ([token]) => asArgs(typeof token === "number" ? token : null), lock: true }, (source, token) => {
  const scrap = scraps.get(source);
  if (!scrap || scrap.token !== token) return fail("PAWN_ERR_FAR");
  scraps.delete(source);
  const yard = content.yards.get(scrap.yard);
  if (!yard || Date.now() - scrap.startedAt < content.settings.scrapSeconds * 800 || !DoesEntityExist(scrap.vehicle) || !near(source, yard.coords, 12)) return fail("PAWN_ERR_FAR");
  if (GetPedInVehicleSeat(scrap.vehicle, -1) !== 0) return fail("PAWN_ERR_EMPTY_IT");
  DeleteEntity(scrap.vehicle);
  nextScrap.set(source, Date.now() + content.settings.scrapCooldown * 60_000);
  for (const reward of yard.rewards) {
    const count = reward.min + Math.floor(Math.random() * (reward.max - reward.min + 1));
    if (count > 0) inventory.addItem(source, reward.name, count);
  }
  notify(source, Locale("PAWN_SCRAPPED"), "success");
  aiLog("scrap", "scrapped a vehicle", { source, metadata: { yard: yard.id } });
  return { ok: true };
});

on("playerDropped", () => {
  const source = Number(globalThis.source);
  scraps.delete(source);
  nextScrap.delete(source);
});
