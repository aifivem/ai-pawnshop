import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { YARD_BLIP } from "common/pawn";
import { BLIP_STYLE } from "./blip";
import { KEY } from "./itemKey";

export const scrapyardsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    coords: { x: 0, y: 0, z: 0 },
    blip: true,
    blipStyle: YARD_BLIP,
    rewards: [],
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    coords: { type: "vec3" },
    blip: { type: "bool" },
    blipStyle: BLIP_STYLE,
    rewards: {
      type: "list",
      max: 20,
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
          min: { type: "number", min: 0, max: 100, integer: true },
          max: { type: "number", min: 0, max: 100, integer: true },
        },
      },
    },
  },
};

export const scrapyardsTab: TabSpec = {
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
        {
          widget: "text",
          path: "label",
          suggest: { from: "coords" },
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_YARD_LABEL",
        },
        {
          widget: "point",
          path: "coords",
          label: "ADMIN_F_COORDS",
          hint: "ADMIN_H_YARD_COORDS",
          ground: true,
        },
        { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
        { widget: "blip", path: "blipStyle", label: "ADMIN_F_BLIP_STYLE" },
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
            {
              widget: "text",
              lookup: "item",
              path: "name",
              label: "ADMIN_F_ITEM",
              placeholder: "ADMIN_P_REWARD",
            },
            {
              widget: "number",
              path: "min",
              label: "ADMIN_F_MIN",
              min: 0,
              max: 100,
            },
            {
              widget: "number",
              path: "max",
              label: "ADMIN_F_MAX",
              min: 0,
              max: 100,
            },
          ],
        },
      ],
    },
  ],
};
