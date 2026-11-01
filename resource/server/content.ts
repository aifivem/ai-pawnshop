import { AdminPanel, resourceExport } from "@aicore-fivem/lib/server";
import { readSettings, readShop, readYard } from "common/pawn";
import { pawnSchema } from "./schema";

export const core = resourceExport("ai-core");
const panel = new AdminPanel(pawnSchema);
export const settings = panel.view("settings", readSettings);
export const shops = panel.records("shops", readShop);
export const yards = panel.records("scrapyards", readYard);
