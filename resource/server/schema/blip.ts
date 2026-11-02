import { BLIP_STYLE_FIELDS } from "@aifivem/lib/shared";

export const BLIP_STYLE = {
  type: "object" as const,
  optional: true,
  fields: BLIP_STYLE_FIELDS,
};
