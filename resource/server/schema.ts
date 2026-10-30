import type { PanelSchema } from "@aicore-fivem/shared";

const KEY = "^[a-z0-9_]{2,48}$";

/** ai-pawnshop's panel: pawnshops and what they pay, scrapyards and what a vehicle gives. */
export const pawnSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "store",
  files: {
    settings: {
      kind: "settings",
      sync: "admin",
      sections: {
        account: { type: "text", lookup: "account", min: 2, max: 32 },
        scrapCooldown: { type: "number", min: 0, max: 1440, integer: true },
        scrapSeconds: { type: "number", min: 1, max: 600, integer: true },
      },
    },
    shops: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", coords: { x: 0, y: 0, z: 0 }, blip: true, items: [] },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        coords: { type: "vec3" },
        blip: { type: "bool" },
        items: { type: "list", max: 100, of: { type: "object", fields: { name: { type: "text", lookup: "item", min: 2, max: 48, pattern: KEY }, price: { type: "number", min: 0, max: 10_000_000, integer: true } } } },
      },
    },
    scrapyards: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", coords: { x: 0, y: 0, z: 0 }, blip: true, rewards: [] },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        coords: { type: "vec3" },
        blip: { type: "bool" },
        rewards: {
          type: "list",
          max: 20,
          of: { type: "object", fields: { name: { type: "text", lookup: "item", min: 2, max: 48, pattern: KEY }, min: { type: "number", min: 0, max: 100, integer: true }, max: { type: "number", min: 0, max: 100, integer: true } } },
        },
      },
    },
  },
  tabs: [
    {
      id: "shops",
      file: "shops",
      icon: "store",
      label: "ADMIN_TAB_SHOPS",
      desc: "ADMIN_TAB_SHOPS_DESC",
      createLabel: "ADMIN_NEW_SHOP",
      deleteLabel: "ADMIN_DELETE_SHOP",
      cards: [
        {
          icon: "store",
          title: "ADMIN_C_SHOP",
          desc: "ADMIN_C_SHOP_DESC",
          fields: [
            { widget: "text", path: "label", suggest: { from: "coords" }, label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_LABEL" },
            { widget: "point", path: "coords", label: "ADMIN_F_COORDS", hint: "ADMIN_H_COORDS", ground: true },
            { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
          ],
        },
        {
          icon: "money-bill-wave",
          title: "ADMIN_C_PRICES",
          desc: "ADMIN_C_PRICES_DESC",
          fields: [
            {
              widget: "list",
              path: "items",
              label: "ADMIN_F_ITEMS",
              addLabel: "ADMIN_ADD_ITEM",
              max: 100,
              newRow: { name: "rolex", price: 100 },
              rows: [
                { widget: "text", lookup: "item", path: "name", label: "ADMIN_F_ITEM", placeholder: "ADMIN_P_ITEM" },
                { widget: "number", path: "price", label: "ADMIN_F_PRICE", min: 0, max: 10_000_000, unit: "$" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "scrapyards",
      file: "scrapyards",
      icon: "car-side",
      label: "ADMIN_TAB_YARDS",
      desc: "ADMIN_TAB_YARDS_DESC",
      createLabel: "ADMIN_NEW_YARD",
      deleteLabel: "ADMIN_DELETE_YARD",
      cards: [
        {
          icon: "car-side",
          title: "ADMIN_C_YARD",
          desc: "ADMIN_C_YARD_DESC",
          fields: [
            { widget: "text", path: "label", suggest: { from: "coords" }, label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_YARD_LABEL" },
            { widget: "point", path: "coords", label: "ADMIN_F_COORDS", hint: "ADMIN_H_YARD_COORDS", ground: true },
            { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
          ],
        },
        {
          icon: "box",
          title: "ADMIN_C_REWARDS",
          desc: "ADMIN_C_REWARDS_DESC",
          fields: [
            {
              widget: "list",
              path: "rewards",
              label: "ADMIN_F_REWARDS",
              addLabel: "ADMIN_ADD_REWARD",
              max: 20,
              newRow: { name: "scrapmetal", min: 1, max: 5 },
              rows: [
                { widget: "text", lookup: "item", path: "name", label: "ADMIN_F_ITEM", placeholder: "ADMIN_P_REWARD" },
                { widget: "number", path: "min", label: "ADMIN_F_MIN", min: 0, max: 100 },
                { widget: "number", path: "max", label: "ADMIN_F_MAX", min: 0, max: 100 },
              ],
            },
          ],
        },
      ],
    },
    {
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
            { widget: "text", lookup: "account", path: "account", label: "ADMIN_F_ACCOUNT", hint: "ADMIN_H_ACCOUNT", placeholder: "ADMIN_P_ACCOUNT" },
            { widget: "number", path: "scrapSeconds", label: "ADMIN_F_SCRAP_SECONDS", min: 1, max: 600, unit: "s" },
            { widget: "number", path: "scrapCooldown", label: "ADMIN_F_SCRAP_COOLDOWN", hint: "ADMIN_H_SCRAP_COOLDOWN", min: 0, max: 1440, unit: "min" },
          ],
        },
      ],
    },
  ],
};
