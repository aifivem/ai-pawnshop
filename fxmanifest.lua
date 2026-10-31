name 'ai-pawnshop'
author 'TGIANN'
version '0.1.1' -- x-release-please-version
license 'GPL-3.0-only'
description 'Pawnshops buying loot and scrapyards taking stolen vehicles apart'
repository 'https://github.com/aifivem/ai-pawnshop'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/shops.json',
	'data/scrapyards.json',
}
