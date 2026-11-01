import { AdminWorld, Points } from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { readShop, readYard } from "common/pawn";
import { pawn, scrap } from "./actions";

const world = new AdminWorld(["shops", "scrapyards"]);

/** Pawnshop and scrapyard points and blips, one record's point rebuilt per panel edit. */
const points = new Points();
new RecordObjects(world, "shops", readShop, (id, shop) => {
  points.add(`shop:${id}`, {
    ped: shop.ped ?? undefined,
    coords: shop.coords,
    label: Locale("PAWN_PROMPT_SHOP", shop.label),
    icon: "sack-dollar",
    blip: shop.blip ? { ...shop.blipStyle, label: shop.label } : undefined,
    onPressed: () => pawn(shop.id, shop.label),
  });
  return () => points.remove(`shop:${id}`);
});
new RecordObjects(world, "scrapyards", readYard, (id, yard) => {
  points.add(`yard:${id}`, {
    coords: yard.coords,
    label: Locale("PAWN_PROMPT_YARD"),
    icon: "car-burst",
    radius: 10,
    blip: yard.blip ? { ...yard.blipStyle, label: yard.label } : undefined,
    onPressed: () => scrap(yard.id),
  });
  return () => points.remove(`yard:${id}`);
});
