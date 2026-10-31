# ai-pawnshop

Pawnshops that buy items at panel prices, and scrapyards that take unregistered vehicles apart for materials. Depends on ai-core (money, menu, input, prompts, progress); uses the active inventory through ai-core's inventory layer (lib `inventory`) and ai-vehicles (owned check).

## Decisions

- The sell menu takes one snapshot of the shop's offers per open (`offers`), sales return `{ ok }` and the menu asks again.
- Scrapping is the two-step timed action (lib `PendingActions`: token, 80% time check); the vehicle is deleted on the server. Only world vehicles are taken: a server-created vehicle (population type 7 "mission": rentals, job and service cars, owned cars, the armored truck) or one registered in ai-vehicles is refused (`PAWN_ERR_OWNED`).
- The scrap cooldown is a lib `KeyedCooldowns` by character id, so a reconnect does not reset it.
- Each shop and yard has its blip look in the panel (`blipStyle`, `blip` widget) next to its on / off switch.
- Settings (account, scrap time and cooldown) stay server-only; shops and yards are `sync: "all"` for the points and blips.

## Contracts

- Callbacks: `resource/common/pawn.ts`.

## Entry points

- Sales and scrapping `resource/server/index.ts`; menus and interaction points (lib `Points` with blips, kept per record by `RecordObjects`) `resource/client/index.ts`.
