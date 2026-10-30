import { AdminWorld, cache, hidePrompt, input, loadLocaleTexts, menu, notify, onPromptPressed, progress, showPrompt, triggerServerCallback, Zones } from "@aicore-fivem/lib/client";
import { record } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readShops, readYards, toOffers } from "common/pawn";

const world = new AdminWorld(["shops", "scrapyards"]);
const texts = loadLocaleTexts();
const content = { shops: readShops(world.get("shops")), yards: readYards(world.get("scrapyards")) };
const BLIP_TEXT = "AIPAWN_BLIP";
AddTextEntry(BLIP_TEXT, "~a~");
const errorText = (v: unknown, fallback: string): string => {
  const key = typeof record(v).error === "string" ? String(record(v).error) : fallback;
  return texts[key] ?? key;
};

/** Pawnshop and scrapyard prompts and blips, built again when the panel changes them. */
class Places {
  private readonly zones = new Zones();
  private blips: number[] = [];
  busy = false;

  rebuild(): void {
    this.zones.clear();
    for (const blip of this.blips) RemoveBlip(blip);
    this.blips = [];
    for (const shop of content.shops.values()) this.add(`shop:${shop.id}`, shop.coords, 2, Locale("PAWN_PROMPT_SHOP", shop.label), shop.blip ? 431 : 0, shop.label);
    for (const yard of content.yards.values()) this.add(`yard:${yard.id}`, yard.coords, 10, Locale("PAWN_PROMPT_YARD"), yard.blip ? 380 : 0, yard.label);
  }

  private add(id: string, center: { x: number; y: number; z: number }, radius: number, label: string, sprite: number, name: string): void {
    this.zones.add(id, { shape: { type: "sphere", center, radius }, interval: 500, onEnter: () => showPrompt(id, label), onExit: () => hidePrompt(id) });
    if (!sprite) return;
    const blip = AddBlipForCoord(center.x, center.y, center.z);
    SetBlipSprite(blip, sprite);
    SetBlipScale(blip, 0.7);
    SetBlipAsShortRange(blip, true);
    BeginTextCommandSetBlipName(BLIP_TEXT);
    AddTextComponentSubstringPlayerName(name);
    EndTextCommandSetBlipName(blip);
    this.blips.push(blip);
  }
}

const places = new Places();
places.rebuild();
world.onChange("shops", () => {
  content.shops = readShops(world.get("shops"));
  places.rebuild();
});
world.onChange("scrapyards", () => {
  content.yards = readYards(world.get("scrapyards"));
  places.rebuild();
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
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
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

onPromptPressed((id) => {
  if (places.busy) return;
  const [kind, key = ""] = id.split(":");
  const shop = content.shops.get(key);
  const run = kind === "shop" && shop ? pawn(key, shop.label) : kind === "yard" && content.yards.has(key) ? scrap(key) : null;
  if (!run) return;
  places.busy = true;
  void run.finally(() => (places.busy = false));
});
