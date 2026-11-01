import { PLACE_PED_SPEC, placePedFields } from "@aicore-fivem/lib/shared";
import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { SHOP_BLIP } from "common/pawn";
import { BLIP_STYLE } from "./blip";
import { KEY } from "./itemKey";

export const shopsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    coords: { x: 0, y: 0, z: 0 },
    blip: true,
    blipStyle: SHOP_BLIP,
    items: [],
  },
  sections: {
    ped: PLACE_PED_SPEC,
    label: { type: "text", min: 1, max: 48 },
    coords: { type: "vec3" },
    blip: { type: "bool" },
    blipStyle: BLIP_STYLE,
    items: {
      type: "list",
      max: 100,
      of: {
        type: "object",
        fields: {
          name: {
            type: "text",
            lookup: "item",
            min: 2,
            max: 48,
            pattern: KEY,
          },
          price: { type: "number", min: 0, max: 10_000_000, integer: true },
        },
      },
    },
  },
};

export const shopsTab: TabSpec = {
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
        {
          widget: "text",
          path: "label",
          suggest: { from: "coords" },
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_LABEL",
        },
        {
          widget: "point",
          path: "coords",
          label: "ADMIN_F_COORDS",
          hint: "ADMIN_H_COORDS",
          ground: true,
        },
        { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
        { widget: "blip", path: "blipStyle", label: "ADMIN_F_BLIP_STYLE" },
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
            {
              widget: "text",
              lookup: "item",
              path: "name",
              label: "ADMIN_F_ITEM",
              placeholder: "ADMIN_P_ITEM",
            },
            {
              widget: "number",
              path: "price",
              label: "ADMIN_F_PRICE",
              min: 0,
              max: 10_000_000,
              unit: "$",
            },
          ],
        },
      ],
    },
    {
      icon: "user",
      title: "ADMIN_C_PED",
      desc: "ADMIN_C_PED_DESC",
      fields: placePedFields(),
    },
  ],
};
