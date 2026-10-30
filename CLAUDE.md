# ai-pawnshop

Pawnshops that buy items at panel prices, and scrapyards that take unregistered vehicles apart for materials. Depends on ai-core (money, menu, input, prompts, progress); uses ai-inventory (items) and ai-vehicles (owned check). Research: `docs/research/ai-pawnshop.md`.

## Decisions

- The sell menu takes one snapshot of the shop's offers per open (`offers`), sales return `{ ok }` and the menu asks again.
- Scrapping is the two-step timed action (token, 80% time check); the vehicle is deleted on the server.
- Settings (account, scrap time and cooldown) stay server-only; shops and yards are `sync: "all"` for prompts and blips.

## Contracts

- Callbacks: `resource/common/pawn.ts`.

## Entry points

- Sales and scrapping `resource/server/index.ts`; menus and prompts `resource/client/index.ts`.
