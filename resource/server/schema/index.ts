import type { PanelSchema } from "@aicore-fivem/shared";
import { scrapyardsFile, scrapyardsTab } from "./scrapyards";
import { settingsFile, settingsTab } from "./settings";
import { shopsFile, shopsTab } from "./shops";

/** ai-pawnshop's panel: pawnshops and what they pay, scrapyards and what a vehicle gives. */
export const pawnSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "store",
  files: {
    settings: settingsFile,
    shops: shopsFile,
    scrapyards: scrapyardsFile,
  },
  tabs: [shopsTab, scrapyardsTab, settingsTab],
};
