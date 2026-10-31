exports = globalThis.exports;
let node_fs_promises = require("node:fs/promises");
// ../../../packages/lib/src/server/rateLimit.ts
var SourceLock = class {
	active = new Set();
	async run(source, busy, task) {
		if (this.active.has(source)) return busy;
		this.active.add(source);
		try {
			return await task();
		} finally {
			this.active.delete(source);
		}
	}
	release(source) {
		this.active.delete(source);
	}
}, RateLimit = class {
	count;
	windowMs;
	hits = new Map();
	constructor(count, windowMs) {
		this.count = count, this.windowMs = windowMs;
	}
	take(source) {
		let now = GetGameTimer(), recent = (this.hits.get(source) ?? []).filter((at) => now - at < this.windowMs);
		return recent.length >= this.count ? (this.hits.set(source, recent), !1) : (recent.push(now), this.hits.set(source, recent), !0);
	}
	release(source) {
		this.hits.delete(source);
	}
};
// ../../../packages/lib/src/shared/read.ts
function num(value, fallback, min = -Infinity, max = Infinity) {
	return typeof value == "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function int(value, fallback, min = -Infinity, max = Infinity) {
	return Math.round(num(value, fallback, min, max));
}
function bool(value, fallback) {
	return typeof value == "boolean" ? value : fallback;
}
function str(value, fallback, max = 64) {
	return typeof value == "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function record(value) {
	return typeof value == "object" && value && !Array.isArray(value) ? value : {};
}
// ../../../packages/lib/src/shared/strict.ts
function readInt(value, min, max) {
	return Number.isInteger(value) && value >= min && value <= max ? value : null;
}
const readId = (value) => readInt(value, 1, 2147483647);
function readText(value, max) {
	if (typeof value != "string") return null;
	let text = value.trim();
	return text ? text.slice(0, max) : null;
}
const oneArg = (read) => ([value]) => {
	let parsed = read(value);
	return parsed === null ? null : [parsed];
}, fail = (error) => ({
	ok: !1,
	error
}), isPublic = (rule) => rule.jobs.length === 0 && rule.gangs.length === 0, BLIP_STYLE_FIELDS = {
	sprite: {
		type: "number",
		min: 0,
		max: 1e3,
		integer: !0
	},
	color: {
		type: "number",
		min: 0,
		max: 100,
		integer: !0
	},
	scale: {
		type: "number",
		min: .3,
		max: 2
	}
};
function readBlipStyle(value, fallback) {
	let v = record(value);
	return {
		sprite: int(v.sprite, fallback.sprite, 0, 1e3),
		color: int(v.color, fallback.color, 0, 100),
		scale: num(v.scale, fallback.scale, .3, 2)
	};
}
// ../../../packages/lib/src/shared/records.ts
const isObject = (value) => typeof value == "object" && !!value && !Array.isArray(value);
function readRecords(raw, readOne) {
	let out = new Map();
	if (!isObject(raw)) return out;
	for (let key in raw) {
		let value = raw[key];
		if (!isObject(value)) continue;
		let parsed = readOne(key, value);
		parsed !== null && out.set(key, parsed);
	}
	return out;
}
var FileViews = class {
	read;
	updaters = new Map();
	constructor(read) {
		this.read = read;
	}
	view(file, parse) {
		let box = { value: parse(this.read(file)) };
		return this.on(file, () => box.value = parse(this.read(file))), box;
	}
	records(file, readOne) {
		let live = new LiveRecords(readOne);
		return live.reset(this.read(file)), this.on(file, (key, value) => live.update(key, value, this.read(file))), live.map;
	}
	changed(file, key, value) {
		for (let update of this.updaters.get(file) ?? []) update(key, value);
	}
	on(file, update) {
		let list = this.updaters.get(file);
		list ? list.push(update) : this.updaters.set(file, [update]);
	}
}, LiveRecords = class {
	readOne;
	map = new Map();
	constructor(readOne) {
		this.readOne = readOne;
	}
	reset(raw) {
		this.map.clear();
		for (let [key, value] of readRecords(raw, this.readOne)) this.map.set(key, value);
	}
	update(key, value, whole) {
		if (key === void 0) return this.reset(whole);
		let parsed = isObject(value) ? this.readOne(key, value) : null;
		parsed === null ? this.map.delete(key) : this.map.set(key, parsed);
	}
};
// ../../../packages/lib/src/shared/lang.ts
function formatText(template, args) {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		let value = args[Number(index)];
		return value === void 0 ? match : String(value);
	});
}
// ../../../packages/lib/src/shared/placePed.ts
const isRecord$1 = (v) => typeof v == "object" && !!v && !Array.isArray(v), SCENARIOS = [
	"",
	"WORLD_HUMAN_STAND_IMPATIENT",
	"WORLD_HUMAN_CLIPBOARD",
	"WORLD_HUMAN_STAND_MOBILE",
	"WORLD_HUMAN_AA_COFFEE",
	"WORLD_HUMAN_SMOKING",
	"WORLD_HUMAN_GUARD_STAND",
	"WORLD_HUMAN_COP_IDLES",
	"WORLD_HUMAN_HANG_OUT_STREET"
], PLACE_PED_SPEC = {
	type: "object",
	optional: !0,
	fields: {
		model: {
			type: "text",
			max: 64,
			optional: !0
		},
		scenario: {
			type: "enum",
			values: [...SCENARIOS],
			optional: !0
		},
		coords: {
			type: "vec4",
			optional: !0
		}
	}
};
function placePedFields(path = "ped") {
	return [
		{
			widget: "model",
			kind: "ped",
			path: `${path}.model`,
			label: "ADMIN_F_PED_MODEL",
			hint: "ADMIN_H_PED_MODEL",
			placeholder: "ADMIN_PH_PED_MODEL"
		},
		{
			widget: "select",
			path: `${path}.scenario`,
			label: "ADMIN_F_PED_SCENARIO",
			hint: "ADMIN_H_PED_SCENARIO",
			options: SCENARIOS.map((value) => ({
				value,
				label: value ? `ADMIN_O_SCENARIO_${value}` : "ADMIN_O_SCENARIO_NONE"
			}))
		},
		{
			widget: "point",
			path: `${path}.coords`,
			heading: !0,
			ground: !0,
			label: "ADMIN_F_PED_POSITION",
			hint: "ADMIN_H_PED_POSITION"
		}
	];
}
function readPlacePed(value) {
	if (!isRecord$1(value) || typeof value.model != "string" || !value.model.trim()) return null;
	let c = value.coords, coords = isRecord$1(c) && [
		c.x,
		c.y,
		c.z,
		c.heading
	].every((n) => typeof n == "number") ? {
		x: Number(c.x),
		y: Number(c.y),
		z: Number(c.z),
		heading: Number(c.heading)
	} : void 0;
	return {
		model: value.model.trim(),
		scenario: typeof value.scenario == "string" && value.scenario ? value.scenario : void 0,
		coords
	};
}
// ../../../packages/lib/src/shared/index.ts
function isRecord(value) {
	return typeof value == "object" && !!value && !Array.isArray(value);
}
function logSafe(text, max) {
	return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
}
function previewJson(value, max) {
	let out = "", walk = (v, depth) => {
		if (out.length >= max) return;
		if (typeof v == "string") {
			out += JSON.stringify(v.length > max ? v.slice(0, max) : v);
			return;
		}
		if (typeof v != "object" || !v) {
			out += String(v);
			return;
		}
		if (depth > 4) {
			out += Array.isArray(v) ? "[...]" : "{...}";
			return;
		}
		if (Array.isArray(v)) {
			out += "[";
			for (let i = 0; i < v.length && out.length < max; i++) i > 0 && (out += ","), walk(v[i], depth + 1);
			out += "]";
			return;
		}
		out += "{";
		let first = !0;
		for (let key in v) {
			if (out.length >= max) break;
			first || (out += ","), first = !1, out += `${JSON.stringify(key.slice(0, 50))}:`, walk(v[key], depth + 1);
		}
		out += "}";
	};
	return walk(value, 0), out.slice(0, max);
}
function createLogger(resource) {
	let prefix = `[${resource}]`;
	return {
		info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
		warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
		error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
	};
}
function withoutSchemaKey(value) {
	if (!isRecord(value) || !("$schema" in value)) return value;
	let { $schema: _schema, ...rest } = value;
	return rest;
}
var DataFile = class {
	resource;
	name;
	log;
	writes = Promise.resolve();
	pending = void 0;
	timer = null;
	schemaRef = null;
	constructor(resource, name, log) {
		this.resource = resource, this.name = name, this.log = log;
	}
	hasSchemaRef() {
		return (LoadResourceFile(this.resource, this.path) ?? "").includes("\"$schema\"");
	}
	read() {
		for (let path of [this.path, `${this.path}.bak`]) {
			let raw = LoadResourceFile(this.resource, path);
			if (raw) try {
				return withoutSchemaKey(JSON.parse(raw));
			} catch (error) {
				this.log.error(`${this.resource}/${path} is not valid JSON${path === this.path ? ", trying the backup" : ""}`, error);
			}
		}
		return null;
	}
	write(value) {
		this.pending = value, this.timer ||= setTimeout(() => {
			this.timer = null;
			let data = this.schemaRef && isRecord(this.pending) ? {
				$schema: this.schemaRef,
				...this.pending
			} : this.pending, text = `${JSON.stringify(data, null, 2)}\n`;
			this.writes = this.writes.then(() => this.flush(text)).catch((error) => this.log.error(`saving ${this.resource}/${this.path} failed`, error));
		}, 250);
	}
	get path() {
		return `data/${this.name}.json`;
	}
	async flush(text) {
		let file = `${GetResourcePath(this.resource)}/${this.path}`;
		await (0, node_fs_promises.mkdir)(file.slice(0, file.lastIndexOf("/")), { recursive: !0 }), await (0, node_fs_promises.writeFile)(`${file}.tmp`, text, "utf8"), await (0, node_fs_promises.copyFile)(file, `${file}.bak`).catch(() => void 0), await (0, node_fs_promises.rename)(`${file}.tmp`, file);
	}
};
// ../../../packages/shared/src/core.ts
const CORE = {
	resource: "ai-core",
	clientErrorEvent: "ai-core:clientError",
	playerLoadedEvent: "ai-core:playerLoaded",
	playerUnloadedEvent: "ai-core:playerUnloaded",
	moneyChangedEvent: "ai-core:moneyChanged",
	jobsChangedEvent: "ai-core:jobsChanged",
	dutyChangedEvent: "ai-core:dutyChanged",
	gangsChangedEvent: "ai-core:gangsChanged",
	activeGangChangedEvent: "ai-core:activeGangChanged",
	metaChangedEvent: "ai-core:metaChanged",
	definitionsChangedEvent: "ai-core:definitionsChanged",
	characterScreenEvent: "ai-core:characterScreen",
	inventoryChangedEvent: "ai-core:inventoryChanged",
	itemUsedEvent: "ai-core:itemUsed",
	playerDiedEvent: "ai-core:playerDied",
	clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
	clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
	clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
	characterLooksEvent: "ai-core:client:characterLooks",
	clientCacheEvent: "ai-core:client:cache",
	clientHudVisibleEvent: "ai-core:client:hudVisible",
	clientWorldSyncEvent: "ai-core:client:worldSync",
	clientDefinitionsEvent: "ai-core:client:definitions",
	vehicleTypeCallback: "ai-core:vehicleType",
	interactionStateKey: "ai:interaction",
	charactersCallback: "ai-core:characters",
	createCharacterCallback: "ai-core:createCharacter",
	deleteCharacterCallback: "ai-core:deleteCharacter",
	selectCharacterCallback: "ai-core:selectCharacter",
	spawnEvent: "ai-core:client:spawn",
	chooseSpawnEvent: "ai-core:client:chooseSpawn",
	spawnChoiceCallback: "ai-core:spawnChoice",
	openCharactersEvent: "ai-core:client:openCharacters"
}, ADMIN = {
	ace: "ai.admin",
	openCallback: "ai-core:admin:open",
	panelDataCallback: "ai-core:admin:panelData",
	applyCallback: "ai-core:admin:apply",
	closeEvent: "ai-core:admin:close",
	showEvent: "ai-core:admin:show",
	deltaEvent: "ai-core:admin:delta",
	recommendationEvent: "ai-core:admin:recommendation",
	worldEvent: (resource) => `${resource}:admin:world`,
	worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
}, LIB_UI = {
	resource: "ai-lib",
	notifyEvent: "ai-lib:client:notify",
	promptPressedEvent: "ai-lib:client:promptPressed",
	cancelProgressEvent: "ai-lib:client:cancelProgress",
	progressForCallback: "ai-lib:progressFor",
	progressForCancelEvent: "ai-lib:client:progressForCancel",
	minigameForCallback: "ai-lib:minigameFor"
}, named = new Set();
function registerExport(name, handler) {
	named.add(name), globalThis.exports(name, handler);
	let first = name.charAt(0), twin = (first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()) + name.slice(1);
	twin !== name && !named.has(twin) && globalThis.exports(twin, handler);
}
function resourceExport(resource) {
	return globalThis.exports[resource];
}
function isResourceStarted(resource) {
	return GetResourceState(resource) === "started";
}
function optionalExport(resource) {
	return isResourceStarted(resource) ? globalThis.exports[resource] : null;
}
function readLocaleFile(resource, lang) {
	let raw = LoadResourceFile(resource, `locales/${lang}.json`);
	if (!raw) return {};
	let parsed = JSON.parse(raw);
	if (!isRecord(parsed)) return {};
	let texts = {};
	for (let [key, value] of Object.entries(parsed)) typeof value == "string" && (texts[key] = value);
	return texts;
}
function createLocale() {
	let texts = loadLocaleTexts();
	return (key, ...args) => formatText(texts[key] ?? key, args);
}
function loadLocaleTexts(resource = GetCurrentResourceName()) {
	let lang = GetConvar("ai:locale", "en"), texts = {
		...readLocaleFile(resource, "en"),
		...lang === "en" ? {} : readLocaleFile(resource, lang)
	};
	for (let key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
	return texts;
}
// ../../../packages/lib/src/fivem/callbackNames.ts
const requestEvent = (name) => `aicore:cb:${name}`, responseEvent = (resource) => `aicore:cbr:${resource}`;
// ../../../packages/lib/src/server/position.ts
function entityCoords(entity) {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
	return {
		x,
		y,
		z
	};
}
function isNear(source, point, metres) {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source))), dx = x - point.x, dy = y - point.y, dz = z - point.z;
	return dx * dx + dy * dy + dz * dz <= metres * metres;
}
resourceExport(CORE.resource);
const log$5 = createLogger(GetCurrentResourceName()), gates = new Set();
on("playerDropped", () => {
	let source = Number(globalThis.source);
	for (let gate of gates) gate.release(source);
});
var ClientGate = class {
	name;
	options;
	limit;
	lock;
	refusals = new Map();
	constructor(name, options, defaultRate) {
		this.name = name, this.options = options, this.limit = new RateLimit(options.rate?.count ?? defaultRate, options.rate?.windowMs ?? 1e3), this.lock = options.lock ? new SourceLock() : null, gates.add(this);
	}
	check(source, raw) {
		if (!(source > 0) || !GetPlayerName(String(source))) return null;
		if (!this.limit.take(source)) return this.refuse(source, "rate limit"), null;
		for (let guard of this.options.guards ?? []) {
			let verdict = guard(source);
			if (verdict !== !0) return typeof verdict == "string" && this.refuse(source, verdict), null;
		}
		if (!this.options.args) return [];
		let args = this.options.args(raw);
		return args === null && this.refuse(source, () => `invalid arguments ${logSafe(previewJson(raw, 200), 200)}`), args;
	}
	run(source, busy, task) {
		return this.lock ? this.lock.run(source, busy, async () => task()) : Promise.resolve(task());
	}
	release(source) {
		this.limit.release(source), this.lock?.release(source), this.refusals.delete(source);
	}
	refuse(source, reason) {
		let now = GetGameTimer(), last = this.refusals.get(source);
		if (last && now - last.at < 1e4) {
			last.skipped++;
			return;
		}
		let more = last?.skipped ? ` (+${last.skipped} more refused)` : "";
		this.refusals.set(source, {
			at: now,
			skipped: 0
		}), log$5.warn(`${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${typeof reason == "string" ? reason : reason()}${more}`);
	}
};
// ../../../packages/lib/src/server/callback.ts
const log$4 = createLogger(GetCurrentResourceName()), resource$1 = GetCurrentResourceName(), REFUSED = Symbol("refused");
function onClientCallback(name, first, second) {
	let [handler, options] = typeof first == "function" ? [first, second ?? {}] : [second, first], gate = new ClientGate(name, options, 20);
	onNet(requestEvent(name), async (caller, id, ...raw) => {
		let source = Number(globalThis.source);
		if (typeof caller != "string" || caller.length > 64 || typeof id != "number") return;
		let args = gate.check(source, raw);
		if (!args) return emitNet(responseEvent(caller), source, id, !1, null);
		try {
			let result = await gate.run(source, REFUSED, () => handler(source, ...args));
			result === REFUSED ? emitNet(responseEvent(caller), source, id, !1, null) : emitNet(responseEvent(caller), source, id, !0, result ?? null);
		} catch (error) {
			log$4.error(`callback ${name} failed for ${source}`, error), emitNet(responseEvent(caller), source, id, !1, null);
		}
	});
}
const pending = new Map();
let nextId = 0;
onNet(responseEvent(resource$1), (id, ok, result) => {
	let entry = typeof id == "number" ? pending.get(id) : void 0;
	entry && entry.source === Number(globalThis.source) && (pending.delete(id), clearTimeout(entry.timer), ok === !0 ? entry.resolve(result) : entry.reject(Error("client callback failed")));
});
function triggerClientCallback(name, source, args = [], timeoutMs = 3e4) {
	let id = ++nextId;
	return new Promise((resolve, reject) => {
		let timer = setTimeout(() => {
			pending.delete(id), reject(Error(`client callback ${name} timed out for ${source}`));
		}, timeoutMs);
		pending.set(id, {
			source,
			resolve,
			reject,
			timer
		}), emitNet(requestEvent(name), source, resource$1, id, ...args);
	});
}
// ../../../packages/lib/src/server/admin/patch.ts
function toPatch(value) {
	if (!isRecord(value) || typeof value.file != "string") return null;
	let key = typeof value.key == "string" ? value.key : void 0;
	switch (value.action) {
		case "set": return typeof value.section == "string" ? {
			file: value.file,
			action: "set",
			key,
			section: value.section,
			value: value.value
		} : null;
		case "create": return key && typeof value.label == "string" ? {
			file: value.file,
			action: "create",
			key,
			label: value.label
		} : null;
		case "delete": return key ? {
			file: value.file,
			action: "delete",
			key
		} : null;
		case "run": return typeof value.id == "string" && value.id.length <= 64 ? {
			file: value.file,
			action: "run",
			key,
			id: value.id
		} : null;
		case "import": {
			if (!isRecord(value.records)) return null;
			let records = {};
			for (let [k, v] of Object.entries(value.records)) isRecord(v) && (records[k] = v);
			return Object.keys(records).length > 0 && Object.keys(records).length <= 500 ? {
				file: value.file,
				action: "import",
				records
			} : null;
		}
		default: return null;
	}
}
const clone = (value) => value === void 0 ? value : JSON.parse(JSON.stringify(value)), core$16 = resourceExport(CORE.resource), ERR = {
	type: "ADMIN_ERR_TYPE",
	range: "ADMIN_ERR_RANGE",
	length: "ADMIN_ERR_LENGTH",
	pattern: "ADMIN_ERR_PATTERN",
	required: "ADMIN_ERR_REQUIRED",
	lookup: "ADMIN_ERR_LOOKUP"
}, lookups = new class {
	lists = new Map();
	values(source) {
		let cached = this.lists.get(source);
		if (cached && Date.now() - cached.at < 2e3) return cached.values.size > 0 ? cached.values : null;
		let list = [];
		try {
			list = core$16.GetLookupValues(source);
		} catch {}
		let values = new Set(Array.isArray(list) ? list.filter((v) => typeof v == "string") : []);
		return this.lists.set(source, {
			at: Date.now(),
			values
		}), values.size > 0 ? values : null;
	}
}(), isVec = (value, keys) => isRecord(value) && keys.every((k) => typeof value[k] == "number" && Number.isFinite(value[k]));
function validate(spec, value, path) {
	if (value == null) return spec.optional ? null : {
		error: ERR.required,
		path
	};
	let fail = (error) => ({
		error,
		path
	});
	switch (spec.type) {
		case "text": return typeof value == "string" ? value.length < (spec.min ?? 1) || value.length > (spec.max ?? 120) ? fail(ERR.length) : spec.pattern && !new RegExp(spec.pattern).test(value) ? fail(ERR.pattern) : spec.lookup && value !== "" && lookups.values(spec.lookup)?.has(value) === !1 ? fail(ERR.lookup) : null : fail(ERR.type);
		case "number": return typeof value != "number" || !Number.isFinite(value) || spec.integer && !Number.isInteger(value) ? fail(ERR.type) : spec.min !== void 0 && value < spec.min || spec.max !== void 0 && value > spec.max ? fail(ERR.range) : null;
		case "bool": return typeof value == "boolean" ? null : fail(ERR.type);
		case "enum": return spec.values.includes(value) ? null : fail(ERR.type);
		case "names": {
			if (!Array.isArray(value) || value.length > (spec.max ?? 50)) return fail(ERR.length);
			let pattern = new RegExp(spec.pattern ?? "^[\\w.:-]+$"), seen = new Set();
			for (let name of value) {
				if (typeof name != "string" || name.length > (spec.itemMax ?? 64) || seen.has(name)) return fail(ERR.type);
				if (!pattern.test(name)) return fail(ERR.pattern);
				if (spec.lookup && lookups.values(spec.lookup)?.has(name) === !1) return fail(ERR.lookup);
				seen.add(name);
			}
			return null;
		}
		case "vec3": return isVec(value, [
			"x",
			"y",
			"z"
		]) ? null : fail(ERR.type);
		case "vec4": return isVec(value, [
			"x",
			"y",
			"z",
			"heading"
		]) ? null : fail(ERR.type);
		case "object":
			if (!isRecord(value)) return fail(ERR.type);
			for (let key of Object.keys(value)) if (!(key in spec.fields)) return {
				error: ERR.type,
				path: `${path}.${key}`
			};
			for (let [key, field] of Object.entries(spec.fields)) {
				let refusal = validate(field, value[key], `${path}.${key}`);
				if (refusal) return refusal;
			}
			return null;
		case "list":
			if (!Array.isArray(value)) return fail(ERR.type);
			if (value.length < (spec.min ?? 0) || value.length > (spec.max ?? 100)) return fail(ERR.length);
			for (let i = 0; i < value.length; i++) {
				let refusal = validate(spec.of, value[i], `${path}.${i + 1}`);
				if (refusal) return refusal;
			}
			return null;
		default: return spec;
	}
}
// ../../../packages/lib/src/server/admin/edit.ts
const DEFAULT_KEY = "^[a-z0-9_]{2,32}$";
function imported(spec, value) {
	let base = clone(spec.newRecord ?? {}), out = {};
	for (let name of Object.keys(spec.sections)) {
		let v = name in value ? value[name] : base[name];
		v !== void 0 && (out[name] = clone(v));
	}
	return out;
}
function linked(spec, value, ctx) {
	return spec.type === "text" && spec.records && typeof value == "string" && value !== "" && !(value in ctx.get(spec.records)) ? "ADMIN_ERR_LOOKUP" : null;
}
function checkEdit(patch, spec, ctx) {
	let data = ctx.get(patch.file);
	if (patch.action === "create") return spec.kind !== "records" || !new RegExp(spec.keyPattern ?? DEFAULT_KEY).test(patch.key) ? ERR.pattern : patch.key in data ? "ADMIN_ERR_EXISTS" : null;
	if (patch.action === "delete") return spec.kind !== "records" || !(patch.key in data) ? ERR.type : spec.locked?.includes(patch.key) ? "ADMIN_ERR_LOCKED" : null;
	if (patch.action === "import") {
		if (spec.kind !== "records") return ERR.type;
		let pattern = new RegExp(spec.keyPattern ?? DEFAULT_KEY);
		for (let [key, value] of Object.entries(patch.records)) {
			if (!pattern.test(key)) return ERR.pattern;
			let record = imported(spec, value);
			for (let [name, section] of Object.entries(spec.sections)) {
				let refusal = validate(section, record[name], name);
				if (refusal) return refusal.error;
				let link = linked(section, record[name], ctx);
				if (link) return link;
			}
			let ruled = ctx.rule(patch.file)?.(key, record);
			if (ruled) return ruled;
		}
		return null;
	}
	let section = spec.sections[patch.section];
	if (!section || spec.kind === "records" && (!patch.key || !(patch.key in data))) return ERR.type;
	let refusal = validate(section, patch.value, patch.section);
	if (refusal) return refusal.error;
	let link = linked(section, patch.value, ctx);
	if (link) return link;
	let current = spec.kind === "records" ? data[patch.key ?? ""] : data, next = {
		...isRecord(current) ? current : {},
		[patch.section]: patch.value
	};
	return ctx.rule(patch.file)?.(patch.key, next) ?? null;
}
function applyEdit(data, patch, spec) {
	if (patch.action === "import") {
		for (let [key, value] of Object.entries(patch.records)) data[key] = imported(spec, value);
		return Object.keys(patch.records);
	}
	if (patch.action === "create") {
		let record = clone(spec.newRecord ?? {});
		spec.labelPath && (record[spec.labelPath] = patch.label), data[patch.key] = record;
	} else if (patch.action === "delete") delete data[patch.key];
	else {
		let target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!isRecord(target)) return [];
		patch.value === void 0 || patch.value === null ? delete target[patch.section] : target[patch.section] = clone(patch.value);
	}
	return [spec.kind === "records" ? patch.key : void 0];
}
// ../../../packages/lib/src/server/admin/jsonSchema.ts
const SCHEMA_KEY = {
	type: "string",
	description: "This file's JSON Schema (for editors)."
};
function langFile(resource) {
	try {
		let raw = JSON.parse(LoadResourceFile(resource, "locales/en.json") ?? "{}");
		return isRecord(raw) ? Object.fromEntries(Object.entries(raw).filter((e) => typeof e[1] == "string")) : {};
	} catch {
		return {};
	}
}
function texts(resource) {
	return {
		...langFile("ai-core"),
		...langFile(resource)
	};
}
function collect(fields, prefix, lang, out) {
	for (let field of fields) {
		if (field.widget === "action") continue;
		let path = prefix + field.path, label = lang[field.label] ?? field.label, hint = field.hint ? lang[field.hint] ?? field.hint : "";
		out.has(path) || out.set(path, hint ? `${label}: ${hint}` : label), field.widget === "list" && collect(field.rows, `${path}[].`, lang, out);
	}
}
function describe(schema, file, lang) {
	let out = new Map();
	for (let tab of schema.tabs) if (tab.file === file) for (let card of tab.cards) collect(card.fields, "", lang, out);
	return out;
}
function toJson(spec, path, desc) {
	let description = desc.get(path), base = description ? { description } : {};
	switch (spec.type) {
		case "text": return {
			...base,
			type: "string",
			minLength: spec.min,
			maxLength: spec.max,
			pattern: spec.pattern
		};
		case "number": return {
			...base,
			type: spec.integer ? "integer" : "number",
			minimum: spec.min,
			maximum: spec.max
		};
		case "bool": return {
			...base,
			type: "boolean"
		};
		case "enum": return {
			...base,
			enum: spec.values
		};
		case "names": return {
			...base,
			type: "array",
			maxItems: spec.max,
			uniqueItems: !0,
			items: {
				type: "string",
				maxLength: spec.itemMax,
				pattern: spec.pattern
			}
		};
		case "vec3":
		case "vec4": {
			let keys = spec.type === "vec3" ? [
				"x",
				"y",
				"z"
			] : [
				"x",
				"y",
				"z",
				"heading"
			];
			return {
				...base,
				type: "object",
				required: keys,
				properties: Object.fromEntries(keys.map((k) => [k, { type: "number" }]))
			};
		}
		case "object": return {
			...base,
			...objectOf(spec.fields, path ? `${path}.` : "", desc)
		};
		case "list": return {
			...base,
			type: "array",
			minItems: spec.min,
			maxItems: spec.max,
			items: toJson(spec.of, `${path}[]`, desc)
		};
		default: return spec;
	}
}
function objectOf(fields, prefix, desc) {
	return {
		type: "object",
		properties: Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, toJson(s, prefix + k, desc)])),
		required: Object.entries(fields).filter(([, s]) => !s.optional).map(([k]) => k)
	};
}
function fileSchema(resource, schema, name, spec) {
	let desc = describe(schema, name, texts(resource)), title = `${resource}/data/${name}.json`, body = spec.kind === "settings" ? (() => {
		let obj = objectOf(spec.sections, "", desc), required = obj.required.filter((k) => !(k in (spec.defaults ?? {})));
		return {
			...obj,
			properties: {
				$schema: SCHEMA_KEY,
				...obj.properties
			},
			required
		};
	})() : {
		type: "object",
		properties: { $schema: SCHEMA_KEY },
		patternProperties: { [spec.keyPattern ?? "^[a-z0-9_]{2,32}$"]: objectOf(spec.sections, "", desc) },
		additionalProperties: !1
	};
	return `${JSON.stringify({
		$schema: "http://json-schema.org/draft-07/schema#",
		title,
		...body
	}, null, 2)}\n`;
}
function writeSchema(resource, name, text, log) {
	let path = `data/schemas/${name}.schema.json`;
	if (LoadResourceFile(resource, path) === text) return;
	let dir = `${GetResourcePath(resource)}/data/schemas`;
	(0, node_fs_promises.mkdir)(dir, { recursive: !0 }).then(() => (0, node_fs_promises.writeFile)(`${dir}/${name}.schema.json`, text, "utf8")).catch((error) => log.error(`writing ${resource}/${path} failed`, error));
}
// ../../../packages/lib/src/server/admin/panel.ts
const core$15 = resourceExport(CORE.resource);
var AdminPanel = class {
	schema;
	data = new Map();
	dataFiles = new Map();
	handlers = new Map();
	rules = new Map();
	actions = new Map();
	views = new FileViews((file) => this.get(file));
	worldChanges = new Map();
	resource = GetCurrentResourceName();
	log = createLogger(this.resource);
	editor = 0;
	constructor(schema) {
		this.schema = schema;
		for (let [name, spec] of Object.entries(schema.files)) this.load(name, spec);
		registerExport("AdminPanelSnapshot", () => this.snapshot()), registerExport("AdminPanelSummary", () => this.summary()), registerExport("AdminPanelApply", (admin, patch) => this.apply(admin, patch)), onClientCallback(ADMIN.worldChangesCallback(this.resource), () => Object.fromEntries(this.worldChanges), { rate: {
			count: 4,
			windowMs: 1e4
		} }), setImmediate(() => core$15.RegisterAdminPanel(this.resource));
	}
	get(file) {
		return this.data.get(file) ?? {};
	}
	onChange(file, handler) {
		this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
	}
	rule(file, rule) {
		this.rules.set(file, rule);
	}
	onAction(id, handler) {
		this.actions.set(id, handler);
	}
	view(file, read) {
		return this.views.view(file, read);
	}
	records(file, readOne) {
		return this.views.records(file, readOne);
	}
	snapshot() {
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data: clone(Object.fromEntries(this.data))
		};
	}
	summary() {
		let data = {}, index = {};
		for (let [file, spec] of Object.entries(this.schema.files)) {
			let content = this.data.get(file);
			if (spec.kind !== "records") {
				data[file] = clone(content ?? {});
				continue;
			}
			let labels = {};
			for (let [key, record] of Object.entries(content ?? {})) labels[key] = labelOf(record, spec.labelPath) ?? key;
			index[file] = labels;
		}
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data,
			loaded: !1,
			index
		};
	}
	apply(admin, raw) {
		let patch = toPatch(raw), spec = patch ? this.schema.files[patch.file] : void 0;
		if (!patch || !spec) return {
			ok: !1,
			error: ERR.type
		};
		this.editor = admin;
		try {
			if (patch.action === "run") return this.run(admin, patch, spec);
			if (spec.memory) return {
				ok: !1,
				error: ERR.type
			};
			let error = checkEdit(patch, spec, {
				get: (file) => this.get(file),
				rule: (file) => this.rules.get(file)
			});
			return error ? (this.log.warn(`admin ${admin} edit refused (${error}): ${previewJson(patch, 300)}`), {
				ok: !1,
				error
			}) : (this.store(patch, spec), { ok: !0 });
		} finally {
			this.editor = 0;
		}
	}
	run(admin, patch, spec) {
		let handler = this.actions.get(patch.id), data = this.get(patch.file), target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!handler || !isRecord(target)) return {
			ok: !1,
			error: ERR.type
		};
		try {
			let error = handler(admin, clone(target), patch.key);
			return error ? {
				ok: !1,
				error
			} : { ok: !0 };
		} catch (error) {
			return this.log.error(`panel action ${patch.id} failed`, error), {
				ok: !1,
				error: ERR.type
			};
		}
	}
	commit(file, key, value) {
		let data = this.data.get(file);
		data && (key === void 0 ? isRecord(value) && this.data.set(file, clone(value)) : value === null ? delete data[key] : data[key] = clone(value), this.changed(file, key));
	}
	commitAfter(file, key, value) {
		setImmediate(() => this.commit(file, key, value));
	}
	store(patch, spec) {
		let data = this.data.get(patch.file) ?? {}, keys = applyEdit(data, patch, spec);
		if (keys.length !== 0) {
			this.data.set(patch.file, data);
			for (let key of keys) this.changed(patch.file, key);
		}
	}
	changed(file, key) {
		let spec = this.schema.files[file], data = this.get(file), value = key === void 0 ? data : data[key] ?? null;
		this.dataFiles.get(file)?.write(data), this.views.changed(file, key, value);
		for (let handler of this.handlers.get(file) ?? []) handler(key, value);
		if (core$15.AdminPanelChanged({
			resource: this.resource,
			file,
			key,
			value: clone(value)
		}), spec?.sync !== "all") return;
		let changes = this.worldChanges.get(file) ?? {};
		changes[key ?? ""] = clone(value), this.worldChanges.set(file, changes), emitNet(ADMIN.worldEvent(this.resource), -1, file, key ?? null, value);
	}
	load(name, spec) {
		if (spec.memory) {
			this.data.set(name, {});
			return;
		}
		let file = new DataFile(this.resource, name, this.log);
		this.dataFiles.set(name, file), file.schemaRef = `./schemas/${name}.schema.json`, writeSchema(this.resource, name, fileSchema(this.resource, this.schema, name, spec), this.log);
		let raw = file.read(), data = isRecord(raw) ? raw : {}, filled = !1;
		if (spec.kind === "settings") for (let [section, value] of Object.entries(spec.defaults ?? {})) section in data || (data[section] = clone(value), filled = !0);
		this.data.set(name, data), (filled || raw === null || !file.hasSchemaRef()) && file.write(data);
	}
};
function labelOf(record, path) {
	if (!path) return null;
	let at = record;
	for (let part of path.split(".")) {
		if (typeof at != "object" || !at) return null;
		at = at[part];
	}
	return typeof at == "string" && at !== "" ? at : null;
}
// ../../../packages/lib/src/server/log.ts
function aiLog(channel, message, options) {
	optionalExport("ai-core")?.Log(channel, message, options);
}
function aiLogChannels(channels) {
	optionalExport("ai-core")?.LogChannels(channels);
}
// ../../../packages/lib/src/server/notify.ts
function notify(source, text, kind = "info", duration) {
	let notification = {
		text,
		kind,
		duration
	};
	emitNet(LIB_UI.notifyEvent, source, notification);
}
// ../../../packages/lib/src/server/inventory.ts
const core$14 = resourceExport(CORE.resource), inventory = {
	addItem: (inv, item, count = 1, metadata, slot) => core$14.AddItem(inv, item, count, metadata, slot),
	removeItem: (inv, item, count = 1, metadata, slot) => core$14.RemoveItem(inv, item, count, metadata, slot),
	getItemCount: (inv, item, metadata) => core$14.GetItemCount(inv, item, metadata),
	hasItem: (inv, item, count = 1) => core$14.HasItem(inv, item, count),
	canCarryItem: (inv, item, count = 1, metadata) => core$14.CanCarryItem(inv, item, count, metadata),
	getItems: (inv) => core$14.GetItems(inv),
	clearInventory: (inv) => core$14.ClearInventory(inv),
	registerStash: (name, label, slots, maxWeight, jobs = []) => core$14.RegisterStash(name, label, slots, maxWeight, jobs),
	openInventory: (source, inv) => core$14.OpenInventory(source, inv),
	registerUsableItem: (name, handler) => core$14.RegisterUsableItem(name, handler),
	getItemDefinition: (name) => core$14.GetItemDefinition(name)
}, core$13 = resourceExport(CORE.resource);
function reindex(index, source, before, after) {
	for (let name of before) {
		let set = index.get(name);
		set && (set.delete(source), set.size === 0 && index.delete(name));
	}
	for (let name of after) {
		let set = index.get(name);
		set || index.set(name, set = new Set()), set.add(source);
	}
}
var OnlinePlayers = class {
	players = new Map();
	onDuty = new Map();
	jobIndex = new Map();
	gangIndex = new Map();
	started = !1;
	start() {
		if (this.started) return;
		this.started = !0;
		let load = (source, character) => {
			this.drop(source), this.players.set(source, {
				character,
				jobs: [],
				jobNames: [],
				gangs: [],
				gangNames: [],
				duty: null
			}), this.setJobs(source, core$13.GetJobs(source) ?? []), this.setGangs(source, core$13.GetGangs(source) ?? []), this.setDuty(source, core$13.GetDutyJob(source));
		};
		on(CORE.playerLoadedEvent, load), on(CORE.playerUnloadedEvent, (source) => this.drop(source)), on(CORE.jobsChangedEvent, (source, jobs) => this.setJobs(source, jobs)), on(CORE.gangsChangedEvent, (source, gangs) => this.setGangs(source, gangs)), on(CORE.dutyChangedEvent, (source, job) => this.setDuty(source, job));
		for (let source of core$13.GetLoadedSources()) {
			let character = core$13.GetCharacter(source);
			character && load(source, character);
		}
	}
	drop(source) {
		let player = this.players.get(source);
		player && (this.setDuty(source, null), reindex(this.jobIndex, source, player.jobNames, []), reindex(this.gangIndex, source, player.gangNames, []), this.players.delete(source));
	}
	setJobs(source, jobs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = jobs.map((m) => m.job);
		reindex(this.jobIndex, source, player.jobNames, names), player.jobs = jobs, player.jobNames = names;
	}
	setGangs(source, gangs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = gangs.map((m) => m.gang);
		reindex(this.gangIndex, source, player.gangNames, names), player.gangs = gangs, player.gangNames = names;
	}
	setDuty(source, job) {
		let player = this.players.get(source);
		if (!player) return;
		if (player.duty) {
			let set = this.onDuty.get(player.duty);
			set?.delete(source), set?.size === 0 && this.onDuty.delete(player.duty);
		}
		if (player.duty = job, !job) return;
		let set = this.onDuty.get(job);
		set || this.onDuty.set(job, set = new Set()), set.add(source);
	}
	sources() {
		return this.start(), this.players.keys();
	}
	get size() {
		return this.start(), this.players.size;
	}
	character(source) {
		return this.start(), this.players.get(source)?.character ?? null;
	}
	name(source, options = {}) {
		let c = this.character(source);
		return c ? `${c.firstname} ${c.lastname}` : options.fallback === !1 ? "" : GetPlayerName(String(source));
	}
	jobs(source) {
		return this.start(), this.players.get(source)?.jobNames ?? [];
	}
	gangs(source) {
		return this.start(), this.players.get(source)?.gangNames ?? [];
	}
	jobGrade(source, job) {
		return this.start(), this.players.get(source)?.jobs.find((m) => m.job === job)?.grade ?? null;
	}
	gangGrade(source, gang) {
		return this.start(), this.players.get(source)?.gangs.find((m) => m.gang === gang)?.grade ?? null;
	}
	jobMembers(job) {
		return this.start(), this.jobIndex.get(job) ?? EMPTY;
	}
	gangMembers(gang) {
		return this.start(), this.gangIndex.get(gang) ?? EMPTY;
	}
	dutyJob(source) {
		return this.start(), this.players.get(source)?.duty ?? null;
	}
	onDutyIn(source, jobs) {
		let duty = this.dutyJob(source);
		return duty !== null && jobs.includes(duty);
	}
	allows(source, rule) {
		if (isPublic(rule)) return !0;
		let min = (name) => rule.grades[name] ?? 0;
		for (let gang of rule.gangs) {
			let grade = this.gangGrade(source, gang);
			if (grade !== null && grade >= min(gang)) return !0;
		}
		let duty = rule.onDuty ? this.dutyJob(source) : null;
		for (let job of rule.jobs) {
			let grade = this.jobGrade(source, job);
			if (grade !== null && grade >= min(job) && (!rule.onDuty || duty === job)) return !0;
		}
		return !1;
	}
	countOnDuty(jobs) {
		this.start();
		let count = 0;
		for (let job of jobs) count += this.onDuty.get(job)?.size ?? 0;
		return count;
	}
	onDutyFor(job) {
		return this.start(), this.onDuty.get(job) ?? EMPTY;
	}
};
const EMPTY = new Set(), online = new OnlinePlayers();
resourceExport(CORE.resource);
// ../../../packages/lib/src/server/vehicle.ts
function entityFromNet(netId, type) {
	if (readId(netId) === null) return 0;
	let entity = NetworkGetEntityFromNetworkId(netId);
	return !entity || !DoesEntityExist(entity) ? 0 : type === void 0 || GetEntityType(entity) === type ? entity : 0;
}
const vehicleFromNet = (netId) => entityFromNet(netId, 2);
function vehicleNearPlayer(source, netId, options = {}) {
	let vehicle = vehicleFromNet(netId);
	if (!vehicle) return 0;
	let ped = GetPlayerPed(String(source));
	if (options.driver) return GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : 0;
	let [px = 0, py = 0, pz = 0] = GetEntityCoords(ped), [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle);
	return Math.hypot(vx - px, vy - py, vz - pz) <= (options.metres ?? 5) ? vehicle : 0;
}
resourceExport(CORE.resource), createLogger(GetCurrentResourceName());
const dropped = new Set();
let listening = !1;
function onDropped(fn) {
	listening || (listening = !0, on("playerDropped", () => {
		let source = Number(globalThis.source);
		for (let handler of dropped) handler(source);
	})), dropped.add(fn);
}
var PlayerMap = class extends Map {
	constructor(options = {}) {
		super(), onDropped((source) => {
			if (!this.has(source)) return;
			let value = this.get(source);
			this.delete(source), options.onDrop?.(source, value);
		});
	}
}, KeyedCooldowns = class {
	until = new Map();
	sweepAt = 64;
	ready(key) {
		return this.left(key) === 0;
	}
	start(key, ms) {
		ms <= 0 ? this.until.delete(key) : (this.until.size >= this.sweepAt && this.sweep(), this.until.set(key, GetGameTimer() + ms));
	}
	take(key, ms) {
		return this.ready(key) ? (this.start(key, ms), !0) : !1;
	}
	left(key) {
		let until = this.until.get(key);
		if (until === void 0) return 0;
		let left = until - GetGameTimer();
		return left > 0 ? left : (this.until.delete(key), 0);
	}
	clear(key) {
		this.until.delete(key);
	}
	sweep() {
		let now = GetGameTimer();
		for (let [key, until] of this.until) until <= now && this.until.delete(key);
		this.sweepAt = Math.max(64, this.until.size * 2);
	}
};
// ../../../packages/lib/src/server/progressFor.ts
const running = new PlayerMap({ onDrop: (_source, settle) => settle(!1) });
on(CORE.playerUnloadedEvent, (source) => {
	let settle = running.get(source);
	settle && settle(!1);
});
function progressFor(source, options) {
	let previous = running.get(source);
	previous && (previous(!1), emitNet(LIB_UI.progressForCancelEvent, source));
	let { minRatio = .8, ...bar } = options, startedAt = GetGameTimer();
	return new Promise((resolve) => {
		let done = !1, settle = (ok) => {
			done || (done = !0, running.get(source) === settle && running.delete(source), resolve(ok));
		};
		running.set(source, settle), triggerClientCallback(LIB_UI.progressForCallback, source, [bar], bar.duration + 15e3).then((answer) => settle(answer === !0 && GetGameTimer() - startedAt >= bar.duration * minRatio), () => settle(!1));
	});
}
// ../../../packages/lib/src/server/command.ts
const resource = GetCurrentResourceName();
createLogger(resource), new class {
	list = [];
	sent = new Map();
	announced = 0;
	queued = !1;
	listening = !1;
	add(command) {
		this.listening || this.listen(), this.list.push(command), this.queued || (this.queued = !0, setImmediate(() => this.flush()));
	}
	refresh(source) {
		let before = this.sent.get(source), now = new Set(), add = [];
		for (let command of this.list) for (let name of command.info.names) command.allowed(source, name) && (now.add(name), before?.has(name) || add.push(command.suggestion(name)));
		if (this.sent.set(source, now), add.length && emitNet("chat:addSuggestions", source, add), before) for (let name of before) now.has(name) || emitNet("chat:removeSuggestion", source, `/${name}`);
	}
	flush() {
		this.queued = !1, optionalExport(CORE.resource)?.RegisterCommands(resource, this.list.slice(this.announced).map((c) => c.info)), this.announced = this.list.length;
		for (let player of getPlayers()) this.refresh(Number(player));
	}
	listen() {
		this.listening = !0;
		let refresh = (source) => this.refresh(Number(source));
		on(CORE.playerLoadedEvent, refresh), on(CORE.jobsChangedEvent, refresh), on(CORE.gangsChangedEvent, refresh), on("playerDropped", () => this.sent.delete(Number(globalThis.source))), on("onResourceStop", (name) => {
			if (name === resource) for (let command of this.list) for (let n of command.info.names) emitNet("chat:removeSuggestion", -1, `/${n}`);
		});
	}
}(), createLogger(GetCurrentResourceName()), createLogger("aicore-lib");
// ../../../packages/lib/src/fivem/scheduler.ts
var Group = class {
	interval;
	jobs = Array(8);
	gens = Array(8).fill(0);
	dues = Array(8).fill(0);
	head = 0;
	mask = 7;
	count = 0;
	constructor(interval) {
		this.interval = interval;
	}
	get front() {
		return this.dues[this.head] ?? 0;
	}
	compactAt = 64;
	push(job, due) {
		this.count >= this.compactAt && this.compact(), this.count > this.mask && this.grow();
		let i = this.head + this.count & this.mask;
		this.jobs[i] = job, this.gens[i] = job.gen, this.dues[i] = due, this.count++;
	}
	run(now) {
		for (let left = this.count; left > 0 && this.count > 0; left--) {
			let i = this.head, due = this.dues[i] ?? 0;
			if (due > now) return;
			let job = this.jobs[i], gen = this.gens[i];
			if (this.jobs[i] = void 0, this.head = i + 1 & this.mask, this.count--, !job || job.gen !== gen) continue;
			let next = due + this.interval;
			next <= now && (next = now + this.interval), this.push(job, next), job.call();
		}
	}
	compact() {
		let kept = 0;
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask, job = this.jobs[i];
			if (!job || job.gen !== this.gens[i]) continue;
			let k = this.head + kept & this.mask;
			this.jobs[k] = job, this.gens[k] = this.gens[i] ?? 0, this.dues[k] = this.dues[i] ?? 0, kept++;
		}
		for (let n = kept; n < this.count; n++) this.jobs[this.head + n & this.mask] = void 0;
		this.count = kept, this.compactAt = Math.max(64, kept * 2);
	}
	grow() {
		let size = (this.mask + 1) * 2, jobs = Array(size), gens = Array(size).fill(0), dues = Array(size).fill(0);
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask;
			jobs[n] = this.jobs[i], gens[n] = this.gens[i] ?? 0, dues[n] = this.dues[i] ?? 0;
		}
		this.jobs = jobs, this.gens = gens, this.dues = dues, this.head = 0, this.mask = size - 1;
	}
};
new class {
	groups = [];
	byInterval = new Map();
	tick = null;
	active = 0;
	nextDue = Infinity;
	running = !1;
	activate(job) {
		job.gen++, this.active++;
		let due = GetGameTimer() + job.interval, group = this.byInterval.get(job.interval);
		group || (group = new Group(job.interval), this.byInterval.set(job.interval, group), this.groups.push(group)), group.push(job, due), due < this.nextDue && (this.nextDue = due), this.tick ??= setTick(this.onTick);
	}
	deactivate(job) {
		job.gen++, this.active--, this.active === 0 && !this.running && this.halt();
	}
	halt() {
		this.tick !== null && clearTick(this.tick), this.tick = null, this.groups.length = 0, this.byInterval.clear(), this.nextDue = Infinity;
	}
	onTick = () => {
		let now = GetGameTimer();
		if (now < this.nextDue) return;
		let groups = this.groups;
		this.running = !0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && group.count > 0 && group.front <= now && group.run(now);
		}
		if (this.running = !1, this.active === 0) return this.halt();
		let soonest = Infinity, kept = 0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && (group.count === 0 ? this.byInterval.delete(group.interval) : (groups[kept++] = group, group.front < soonest && (soonest = group.front)));
		}
		groups.length = kept, this.nextDue = soonest;
	};
}(), IsDuplicityVersion(), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource);
// resource/common/locale.ts
const Locale = createLocale();
GetCurrentResourceName(), IsDuplicityVersion();
// resource/common/pawn.ts
const EVENTS = {
	offers: "ai-pawnshop:offers",
	sell: "ai-pawnshop:sell",
	scrapStart: "ai-pawnshop:scrapStart"
}, point = (v) => {
	let p = record(v);
	return {
		x: num(p.x, 0),
		y: num(p.y, 0),
		z: num(p.z, 0)
	};
}, list = (v) => Array.isArray(v) ? v.map(record) : [], SHOP_BLIP = {
	sprite: 431,
	color: 5,
	scale: .7
}, YARD_BLIP = {
	sprite: 380,
	color: 9,
	scale: .7
}, blipStyle = (v, d) => readBlipStyle(record(v), {
	sprite: d.sprite,
	color: d.color,
	scale: d.scale
});
function readSettings(raw) {
	let v = record(raw);
	return {
		account: str(v.account, "cash", 32),
		scrapCooldown: int(v.scrapCooldown, 15, 0, 1440),
		scrapSeconds: int(v.scrapSeconds, 30, 1, 600)
	};
}
function readShop(id, v) {
	let prices = new Map();
	for (let row of list(v.items)) typeof row.name == "string" && prices.set(row.name, int(row.price, 0, 0));
	return {
		ped: readPlacePed(v.ped),
		id,
		label: str(v.label, id, 48),
		coords: point(v.coords),
		blip: bool(v.blip, !0),
		blipStyle: blipStyle(v.blipStyle, SHOP_BLIP),
		prices
	};
}
function readYard(id, v) {
	let rewards = list(v.rewards).flatMap((r) => {
		if (typeof r.name != "string") return [];
		let min = int(r.min, 1, 0, 100);
		return [{
			name: r.name,
			min,
			max: Math.max(min, int(r.max, min, 0, 100))
		}];
	});
	return {
		id,
		label: str(v.label, id, 48),
		coords: point(v.coords),
		blip: bool(v.blip, !0),
		blipStyle: blipStyle(v.blipStyle, YARD_BLIP),
		rewards
	};
}
// resource/server/schema.ts
const KEY = "^[a-z0-9_]{2,48}$", BLIP_STYLE = {
	type: "object",
	optional: !0,
	fields: BLIP_STYLE_FIELDS
}, pawnSchema = {
	title: "ADMIN_TITLE",
	icon: "store",
	files: {
		settings: {
			kind: "settings",
			sync: "admin",
			sections: {
				account: {
					type: "text",
					lookup: "account",
					min: 2,
					max: 32
				},
				scrapCooldown: {
					type: "number",
					min: 0,
					max: 1440,
					integer: !0
				},
				scrapSeconds: {
					type: "number",
					min: 1,
					max: 600,
					integer: !0
				}
			}
		},
		shops: {
			kind: "records",
			sync: "all",
			labelPath: "label",
			newRecord: {
				label: "",
				coords: {
					x: 0,
					y: 0,
					z: 0
				},
				blip: !0,
				blipStyle: SHOP_BLIP,
				items: []
			},
			sections: {
				ped: PLACE_PED_SPEC,
				label: {
					type: "text",
					min: 1,
					max: 48
				},
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
								pattern: KEY
							},
							price: {
								type: "number",
								min: 0,
								max: 1e7,
								integer: !0
							}
						}
					}
				}
			}
		},
		scrapyards: {
			kind: "records",
			sync: "all",
			labelPath: "label",
			newRecord: {
				label: "",
				coords: {
					x: 0,
					y: 0,
					z: 0
				},
				blip: !0,
				blipStyle: YARD_BLIP,
				rewards: []
			},
			sections: {
				label: {
					type: "text",
					min: 1,
					max: 48
				},
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
								pattern: KEY
							},
							min: {
								type: "number",
								min: 0,
								max: 100,
								integer: !0
							},
							max: {
								type: "number",
								min: 0,
								max: 100,
								integer: !0
							}
						}
					}
				}
			}
		}
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
						{
							widget: "text",
							path: "label",
							suggest: { from: "coords" },
							label: "ADMIN_F_LABEL",
							placeholder: "ADMIN_P_LABEL"
						},
						{
							widget: "point",
							path: "coords",
							label: "ADMIN_F_COORDS",
							hint: "ADMIN_H_COORDS",
							ground: !0
						},
						{
							widget: "switch",
							path: "blip",
							label: "ADMIN_F_BLIP"
						},
						{
							widget: "blip",
							path: "blipStyle",
							label: "ADMIN_F_BLIP_STYLE"
						}
					]
				},
				{
					icon: "money-bill-wave",
					title: "ADMIN_C_PRICES",
					desc: "ADMIN_C_PRICES_DESC",
					fields: [{
						widget: "list",
						path: "items",
						label: "ADMIN_F_ITEMS",
						addLabel: "ADMIN_ADD_ITEM",
						max: 100,
						newRow: {
							name: "rolex",
							price: 100
						},
						rows: [{
							widget: "text",
							lookup: "item",
							path: "name",
							label: "ADMIN_F_ITEM",
							placeholder: "ADMIN_P_ITEM"
						}, {
							widget: "number",
							path: "price",
							label: "ADMIN_F_PRICE",
							min: 0,
							max: 1e7,
							unit: "$"
						}]
					}]
				},
				{
					icon: "user",
					title: "ADMIN_C_PED",
					desc: "ADMIN_C_PED_DESC",
					fields: placePedFields()
				}
			]
		},
		{
			id: "scrapyards",
			file: "scrapyards",
			icon: "car-side",
			label: "ADMIN_TAB_YARDS",
			desc: "ADMIN_TAB_YARDS_DESC",
			createLabel: "ADMIN_NEW_YARD",
			deleteLabel: "ADMIN_DELETE_YARD",
			cards: [{
				icon: "car-side",
				title: "ADMIN_C_YARD",
				desc: "ADMIN_C_YARD_DESC",
				fields: [
					{
						widget: "text",
						path: "label",
						suggest: { from: "coords" },
						label: "ADMIN_F_LABEL",
						placeholder: "ADMIN_P_YARD_LABEL"
					},
					{
						widget: "point",
						path: "coords",
						label: "ADMIN_F_COORDS",
						hint: "ADMIN_H_YARD_COORDS",
						ground: !0
					},
					{
						widget: "switch",
						path: "blip",
						label: "ADMIN_F_BLIP"
					},
					{
						widget: "blip",
						path: "blipStyle",
						label: "ADMIN_F_BLIP_STYLE"
					}
				]
			}, {
				icon: "box",
				title: "ADMIN_C_REWARDS",
				desc: "ADMIN_C_REWARDS_DESC",
				fields: [{
					widget: "list",
					path: "rewards",
					label: "ADMIN_F_REWARDS",
					addLabel: "ADMIN_ADD_REWARD",
					max: 20,
					newRow: {
						name: "scrapmetal",
						min: 1,
						max: 5
					},
					rows: [
						{
							widget: "text",
							lookup: "item",
							path: "name",
							label: "ADMIN_F_ITEM",
							placeholder: "ADMIN_P_REWARD"
						},
						{
							widget: "number",
							path: "min",
							label: "ADMIN_F_MIN",
							min: 0,
							max: 100
						},
						{
							widget: "number",
							path: "max",
							label: "ADMIN_F_MAX",
							min: 0,
							max: 100
						}
					]
				}]
			}]
		},
		{
			id: "settings",
			file: "settings",
			icon: "sliders",
			label: "ADMIN_TAB_SETTINGS",
			desc: "ADMIN_TAB_SETTINGS_DESC",
			cards: [{
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
						placeholder: "ADMIN_P_ACCOUNT"
					},
					{
						widget: "number",
						path: "scrapSeconds",
						label: "ADMIN_F_SCRAP_SECONDS",
						min: 1,
						max: 600,
						unit: "s"
					},
					{
						widget: "number",
						path: "scrapCooldown",
						label: "ADMIN_F_SCRAP_COOLDOWN",
						hint: "ADMIN_H_SCRAP_COOLDOWN",
						min: 0,
						max: 1440,
						unit: "min"
					}
				]
			}]
		}
	]
}, core = resourceExport("ai-core"), panel = new AdminPanel(pawnSchema), settings = panel.view("settings", readSettings), shops = panel.records("shops", readShop), yards = panel.records("scrapyards", readYard);
aiLogChannels({
	pawn: {},
	scrap: {}
}), onClientCallback(EVENTS.offers, { args: oneArg((v) => readText(v, 64)) }, (source, id) => {
	let shop = shops.get(id);
	if (!shop || !isNear(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
	let offers = new Map();
	for (let stack of inventory.getItems(source)) {
		let price = shop.prices.get(stack.name);
		if (price === void 0) continue;
		let offer = offers.get(stack.name) ?? {
			name: stack.name,
			label: stack.label,
			count: 0,
			price
		};
		offer.count += stack.count, offers.set(stack.name, offer);
	}
	return {
		ok: !0,
		offers: [...offers.values()]
	};
}), onClientCallback(EVENTS.sell, {
	args: ([id, item, count]) => {
		let shop = readText(id, 64), name = readText(item, 64), n = readInt(count, 1, 1e4);
		return shop === null || name === null || n === null ? null : [
			shop,
			name,
			n
		];
	},
	lock: !0
}, (source, id, item, count) => {
	let shop = shops.get(id);
	if (!shop || !isNear(source, shop.coords, 3)) return fail("PAWN_ERR_FAR");
	let price = shop.prices.get(item);
	if (price === void 0) return fail("PAWN_ERR_NOT_BUYING");
	if (!inventory.removeItem(source, item, count)) return fail("PAWN_ERR_COUNT");
	let total = price * count;
	return total > 0 && core.AddMoney(source, settings.value.account, total, `pawn:${shop.id}`), notify(source, Locale("PAWN_SOLD", count, total), "success"), aiLog("pawn", `sold ${count} ${item}`, {
		source,
		metadata: {
			shop: shop.id,
			total
		}
	}), { ok: !0 };
});
const scrapCooldowns = new KeyedCooldowns();
function scrappable(vehicle) {
	return GetEntityPopulationType(vehicle) === 7 || optionalExport("ai-vehicles")?.GetVehicleIdByEntity(vehicle) != null ? "PAWN_ERR_OWNED" : null;
}
onClientCallback(EVENTS.scrapStart, {
	args: ([id, netId]) => {
		let yard = readText(id, 64), net = readId(netId);
		return yard === null || net === null ? null : [yard, net];
	},
	lock: !0
}, (source, id, netId) => {
	let yard = yards.get(id), charId = online.character(source)?.id;
	if (!yard || charId === void 0 || !isNear(source, yard.coords, 12)) return fail("PAWN_ERR_FAR");
	if (!scrapCooldowns.ready(charId)) return fail("PAWN_ERR_COOLDOWN");
	let vehicle = vehicleNearPlayer(source, netId, { metres: 6 });
	if (!vehicle) return fail("PAWN_ERR_NO_VEHICLE");
	if (GetVehiclePedIsIn(GetPlayerPed(String(source)), !1) === vehicle || GetPedInVehicleSeat(vehicle, -1) !== 0) return fail("PAWN_ERR_EMPTY_IT");
	let refused = scrappable(vehicle);
	return refused ? fail(refused) : (takeApart(source, yard.id, vehicle), { ok: !0 });
});
async function takeApart(source, yardId, vehicle) {
	let done = await progressFor(source, {
		label: Locale("PAWN_SCRAPPING"),
		duration: settings.value.scrapSeconds * 1e3,
		anim: {
			dict: "mini@repair",
			clip: "fixing_a_player"
		},
		face: entityCoords(vehicle)
	}), yard = yards.get(yardId), charId = online.character(source)?.id;
	if (done && yard && charId !== void 0 && DoesEntityExist(vehicle) && isNear(source, yard.coords, 12) && isNear(source, entityCoords(vehicle), 8)) {
		if (GetPedInVehicleSeat(vehicle, -1) !== 0) return notify(source, Locale("PAWN_ERR_EMPTY_IT"), "error");
		DeleteEntity(vehicle), scrapCooldowns.start(charId, settings.value.scrapCooldown * 6e4);
		for (let reward of yard.rewards) {
			let count = reward.min + Math.floor(Math.random() * (reward.max - reward.min + 1));
			count > 0 && inventory.addItem(source, reward.name, count);
		}
		notify(source, Locale("PAWN_SCRAPPED"), "success"), aiLog("scrap", "scrapped a vehicle", {
			source,
			metadata: { yard: yard.id }
		});
	}
}
