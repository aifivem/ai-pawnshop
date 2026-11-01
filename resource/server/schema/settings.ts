import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

export const settingsFile: FileSpec = {
  kind: "settings",
  sync: "admin",
  sections: {
    account: { type: "text", lookup: "account", min: 2, max: 32 },
    scrapCooldown: { type: "number", min: 0, max: 1440, integer: true },
    scrapSeconds: { type: "number", min: 1, max: 600, integer: true },
  },
};

export const settingsTab: TabSpec = {
  id: "settings",
  file: "settings",
  icon: "sliders",
  label: "ADMIN_TAB_SETTINGS",
  desc: "ADMIN_TAB_SETTINGS_DESC",
  cards: [
    {
      icon: "sliders",
      title: "ADMIN_C_SETTINGS",
      desc: "ADMIN_C_SETTINGS_DESC",
      fields: [
        {
          widget: "text",
          lookup: "account",
          path: "account",
          label: "ADMIN_F_ACCOUNT",
          hint: "ADMIN_H_ACCOUNT",
          placeholder: "ADMIN_P_ACCOUNT",
        },
        {
          widget: "number",
          path: "scrapSeconds",
          label: "ADMIN_F_SCRAP_SECONDS",
          min: 1,
          max: 600,
          unit: "s",
        },
        {
          widget: "number",
          path: "scrapCooldown",
          label: "ADMIN_F_SCRAP_COOLDOWN",
          hint: "ADMIN_H_SCRAP_COOLDOWN",
          min: 0,
          max: 1440,
          unit: "min",
        },
      ],
    },
  ],
};
