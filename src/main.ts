import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import GUI from 'lil-gui';
import { canonicalTurtleMasks } from './layouts/canonical_turtle_mask';
import { dragonMasks } from './layouts/preset_dragon';
import { fortressMasks } from './layouts/preset_fortress';
import { pyramidMasks } from './layouts/preset_pyramid';
import { bridgeMasks } from './layouts/preset_bridge';
import { crabMasks } from './layouts/preset_crab';
import { UN193_ISO2 } from './data/un193';
import { continentOf, type Continent } from './data/continents';
import { LEVELS, type LevelConfig } from './data/levels';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------
const TILE = {
	width: 2.4,
	height: 0.5,
	depth: 1.7,
	spacingX: 2.6,
	spacingZ: 1.9,
	layerStepY: 0.5
};

const physicsParams = { snapDown: true };
const antiOverlapParams = { enabled: true, delta: 0.1 };
const hoverParams = { eligibleLift: 0.0, lightIntensity: 1.0, lightDistance: 30, lightHeight: 1.15, shininessBoost: 32, lightColor: '#ffffff' };
const varietyParams = { autoPreset: true, randomQuarterRotations: true, jitterEnabled: false, jitterAmount: 0.25, strictNoOverlap: true, staggerTriadX: true, staggerAmountX: 0.33, staggerTriadZ: true, staggerAmountZ: 0.33 };
const stagedParams = { enabled: false, perTileMs: 60, dropHeight: 6, dropMs: 140, autoAdvance: true, layerPauseMs: 200 };
const globalDropParams = { enabled: true, height: 20, totalMs: 3000 };
const markersState = { visible: false, size: 6, color: '#00ffff' };

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Vec3 = THREE.Vector3;
type TileRecord = { mesh: THREE.Mesh, topMat: THREE.MeshPhongMaterial, iso: string };
type PresetGenerator = () => Vec3[];

// -----------------------------------------------------------------------------
// Global State
// -----------------------------------------------------------------------------
const STORAGE_KEY = 'flagtest_level_progress';
const CURRENT_VERSION = 'v1.2.0';
const HINT_COSTS = {
	COUNTRY: 15,
	CONTINENT: 20
};

let revealCountryHintActive = false;
let locateContinentHintActive = false;

function saveProgress(levelId: number) {
	try { localStorage.setItem(STORAGE_KEY, levelId.toString()); } catch { }
}

function loadProgress(): number {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? parseInt(stored, 10) : 1;
	} catch { return 1; }
}

let tileRecords: TileRecord[] = [];
let currentLevelIndex = loadProgress();
let currentLevelConfig: LevelConfig = LEVELS.find(l => l.id === currentLevelIndex) || LEVELS[0];
let levelPureAchieved = false;
let modalOpen = false;
let interactionLockUntil = 0;
let autoSeedOnLoad = true;
let currentPreset: string = 'canonical_turtle';
let gameMode: 'mahjong' | 'pipes' = 'pipes';
let showEmptyBase = false;
const tracksState = { visible: false };
let debugContinentsEnabled = false;
// Preset Continents
let assignedPillarContinents: Continent[] = [];

let lastHover: THREE.Mesh | null = null;
let pointerActive = false;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const selected: Array<{ mesh: THREE.Mesh, time: number }> = [];

const randomState = {
	seed: 98597,
	mirrorX: false,
	mirrorZ: false,
	rotate180: false
};

const tilesGroup = new THREE.Group();
const trackLabelsGroup = new THREE.Group();
const handLabelGroup = new THREE.Group();
const tracksGroup = new THREE.Group();
const markersGroup = new THREE.Group();
const LayoutRegistry: Record<string, PresetGenerator> = {};

// Cache & Loaders
const textureCache = new Map<string, { tex: THREE.Texture, refs: number }>();
const sharedTexLoader = new THREE.TextureLoader();
sharedTexLoader.setCrossOrigin('anonymous');
const countryNameCache = new Map<string, string>();
let regionNames: Intl.DisplayNames | null = null;
try { regionNames = new (Intl as any).DisplayNames(['en'], { type: 'region' }); } catch { }

// -----------------------------------------------------------------------------
// Scene Setup
// -----------------------------------------------------------------------------
THREE.Object3D.DEFAULT_UP.set(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x0b0f14, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03; // Heavy inertia (hard to stop)
controls.rotateSpeed = 0.3;    // High resistance (hard to start)
controls.enabled = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 20, 10);
dir.castShadow = true;
scene.add(dir);
const amb = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(amb);
// hoverLight removed

const baseGeo = new THREE.PlaneGeometry(500, 500);
const baseMatFloor = new THREE.MeshLambertMaterial({ color: 0x3e603e });
const floor = new THREE.Mesh(baseGeo, baseMatFloor);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(tilesGroup);
scene.add(tracksGroup);
scene.add(trackLabelsGroup);
scene.add(handLabelGroup);
scene.add(markersGroup);

// Axes removed as per request
// scene.add(new THREE.AxesHelper(4)); // Removed

// Tile Geometry & Shared Materials
const boxGeo = new RoundedBoxGeometry(TILE.width, TILE.height, TILE.depth, 3, 0.25);
const sideMat = new THREE.MeshPhongMaterial({ color: 0xe9eef2, specular: 0x222222, shininess: 28 });
const bottomMat = new THREE.MeshPhongMaterial({ color: 0xd0d7de, specular: 0x222222, shininess: 18 });

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function mulberry32(seed: number) {
	let t = seed >>> 0;
	return function () {
		t += 0x6D2B79F5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }

function hashIso(iso: string): number {
	let h = 0;
	for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
	return h;
}

function registerPreset(name: string, fn: PresetGenerator) { LayoutRegistry[name] = fn; }
function getPreset(name: string): PresetGenerator | undefined { return LayoutRegistry[name]; }

// -----------------------------------------------------------------------------
// Resource Management
// -----------------------------------------------------------------------------
function decrefTexture(iso: string) {
	const entry = textureCache.get(iso);
	if (!entry) return;
	entry.refs -= 1;
	if (entry.refs <= 0) {
		entry.tex.dispose();
		textureCache.delete(iso);
	}
}

function getOrCreateFlagMaterial(iso: string) {
	// If Capital Mode, we don't return a flag texture, we return a solid color + text?
	// Actually, Capital Mode might still show the flag? No, "Capital Mode (Text: 'Paris') | Count Up" -> usually implies text on tile?
	// "Capital Mode: Capital City Name Only (No Flag)" per design.
	// We'll handle this in createTileAt by swapping the material or geometry if needed, 
	// but it's easier to just use a placeholder material here if the mode demands it.

	if (currentLevelConfig.mode === 'Capital') {
		// Return a generic material, the text will be added as a child or texture. 
		// Actually, let's keep the flag material for now but maybe cover it?
		// User requirement: "Capital Cities only (e.g., tile says 'Tokyo' -> goes to Asia)"
		// This implies the TILE FACE shows "Tokyo".
		// Creating a text texture for every tile is expensive but doable for 144 tiles.
		// For now, let's stick to standard behavior here and handle the "Appearance" in createTileAt.
	}

	const cached = textureCache.get(iso);
	let tex: THREE.Texture;
	if (cached) {
		cached.refs += 1; tex = cached.tex;
	} else {
		const url = `https://flagcdn.com/w320/${iso}.png`;
		tex = sharedTexLoader.load(url);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.center.set(0.5, 0.5);
		tex.rotation = 0;
		tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
		tex.generateMipmaps = true;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		textureCache.set(iso, { tex, refs: 1 });
	}
	return new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30 });
}

function getContinentSideMaterial(iso: string): THREE.MeshPhongMaterial {
	// User requested white edges only (Standardized to 0xeeeeee)
	// We no longer color-code sides by continent.
	return new THREE.MeshPhongMaterial({ color: 0xeeeeee, specular: 0x222222, shininess: 28 });
}

// -----------------------------------------------------------------------------
// HUD & Badge UI
// -----------------------------------------------------------------------------
const hud = document.createElement('div');
hud.className = 'hud';
Object.assign(hud.style, {
	position: 'fixed', left: '12px', bottom: '12px', padding: '8px 10px',
	background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
	borderRadius: '8px', color: '#e6edf3', display: 'none'
});
document.body.appendChild(hud);

function updateHUD(intersect?: THREE.Intersection) {
	if (intersect) {
		const { x, y, z } = intersect.point;
		hud.textContent = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)}`;
	} else {
		hud.textContent = `X: 0.00 | Y: 0.00 | Z: 0.00`;
	}
}

function ensureLevelBadge() {
	let lb = document.getElementById('level-badge');
	if (lb) return lb;
	lb = document.createElement('div');
	lb.id = 'level-badge';
	Object.assign(lb.style, {
		position: 'fixed', right: '20px', top: '20px', padding: '10px 20px',
		background: 'rgba(0,0,0,0.4)', color: '#e6edf3', borderRadius: '22px',
		backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)',
		boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'right',
		lineHeight: '1.2', zIndex: '2000'
	});
	document.body.appendChild(lb);
	return lb;
}

function updateLevelBadge() {
	const lb = ensureLevelBadge();
	lb.innerHTML = `<span style="font-size:1.2em;font-weight:bold">${currentLevelConfig.mode === 'Standard' || currentLevelConfig.mode === 'Capital' ? currentLevelConfig.title : currentLevelConfig.title}</span><br><span style="font-size:0.9em;opacity:0.8">${currentLevelConfig.subtitle}</span>`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const words = text.split(' ');
	const lines = [];
	let currentLine = words[0];

	for (let i = 1; i < words.length; i++) {
		const word = words[i];
		const width = ctx.measureText(currentLine + " " + word).width;
		if (width < maxWidth) {
			currentLine += " " + word;
		} else {
			lines.push(currentLine);
			currentLine = word;
		}
	}
	lines.push(currentLine);
	return lines;
}

function makeTextLabel(text: string, sub?: string, subColor: string = '#ffffff'): THREE.Mesh {
	const canvas = document.createElement('canvas');
	// Taller canvas for multiline support
	canvas.width = 512; canvas.height = 256;
	const ctx = canvas.getContext('2d')!;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

	const fontStack = '"Segoe UI", "Roboto", system-ui, sans-serif';

	if (sub) {
		// Country Name (sub) - Main Feature
		// Start larger because we reduced the plane width
		let fontSub = 90;
		const maxWSub = canvas.width - 20;
		let lines: string[] = [sub];

		// Iteratively reduce font size until it fits
		while (fontSub > 30) {
			ctx.font = `bold ${fontSub}px ${fontStack}`;
			lines = wrapText(ctx, sub, maxWSub);

			// Check vertical fit
			const totalH = lines.length * (fontSub * 1.1);
			if (totalH > canvas.height * 0.6) { // Use max 60% of height for Name
				fontSub -= 5;
				continue;
			}
			// Check horizontal fit (rare due to wrap, but single words check)
			const longestWordW = sub.split(' ').reduce((max, w) => Math.max(max, ctx.measureText(w).width), 0);
			if (longestWordW > maxWSub) {
				fontSub -= 5;
				continue;
			}
			break;
		}

		ctx.fillStyle = subColor;
		const lineHeight = fontSub * 1.1;
		const blockHeight = lines.length * lineHeight;
		// Center block in upper portion. Continent is at bottom.
		const startY = (canvas.height * 0.45) - (blockHeight / 2) + (fontSub * 0.3);

		lines.forEach((line, i) => {
			ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
		});

		// Continent - Bottom
		let fontMain = 60; ctx.font = `bold ${fontMain}px ${fontStack}`;
		const maxWMain = canvas.width - 20;
		while (ctx.measureText(text).width > maxWMain && fontMain > 20) {
			fontMain -= 5; ctx.font = `bold ${fontMain}px ${fontStack}`;
		}
		ctx.fillStyle = '#cccccc';
		ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);

	} else {
		// Single line label (simple)
		let font = 80; ctx.font = `bold ${font}px ${fontStack}`;
		const maxW = canvas.width - 20;
		while (ctx.measureText(text).width > maxW && font > 24) { font -= 5; ctx.font = `bold ${font}px ${fontStack}`; }
		ctx.fillText(text, canvas.width / 2, canvas.height / 2);
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.generateMipmaps = false;
	tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;

	const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
	const aspect = canvas.width / canvas.height;
	// Significantly reduced plane width to prevent viewport bleeding (was 3.0)
	const w = TILE.width * 1.7;
	const h = w / aspect;
	const geo = new THREE.PlaneGeometry(w, h);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	mesh.renderOrder = 10;
	return mesh;
}

// -----------------------------------------------------------------------------
// Layout & Physics
// -----------------------------------------------------------------------------
function snapDownPositions(input: Vec3[]): Vec3[] {
	if (!input.length) return input;
	const tiles = input.map(v => v.clone()).sort((a, b) => a.y - b.y);
	const baseCenterY = TILE.height * 0.5;
	const halfX = TILE.spacingX * 0.5, halfZ = TILE.spacingZ * 0.5;
	const eps = 1e-3;
	let changed = false;
	for (let i = 0; i < tiles.length; i++) {
		const t = tiles[i]; let supportY = baseCenterY;
		for (let j = 0; j < i; j++) {
			const b = tiles[j];
			if (Math.abs(t.x - b.x) <= (halfX + eps) && Math.abs(t.z - b.z) <= (halfZ + eps)) {
				const candidate = b.y + TILE.layerStepY;
				if (candidate > supportY) supportY = candidate;
			}
		}
		if (Math.abs(t.y - supportY) > eps) { t.y = supportY; changed = true; }
	}
	if (changed) tiles.sort((a, b) => a.y - b.y);
	return tiles;
}

function applyStaggerOffsets(input: Vec3[]): Vec3[] {
	const byColumn = new Map<string, Vec3[]>();
	for (const v of input) {
		const k = `${Math.round(v.x * 1000)}|${Math.round(v.z * 1000)}`;
		if (!byColumn.has(k)) byColumn.set(k, []);
		byColumn.get(k)!.push(v);
	}
	const out: Vec3[] = [];
	const dx = antiOverlapParams.delta * TILE.spacingX;
	for (const group of byColumn.values()) {
		group.sort((a, b) => a.y - b.y);
		for (let i = 0; i < group.length; i++) {
			const p = group[i].clone();
			if (i > 0) p.x += ((i % 2 === 1) ? 1 : -1) * dx;
			out.push(p);
		}
	}
	return out;
}

function resolveInLayerOverlaps(input: Vec3[]): Vec3[] {
	const y0 = TILE.height * 0.5;
	const layerMap = new Map<number, Vec3[]>();
	for (const p of input) {
		const l = Math.round((p.y - y0) / TILE.layerStepY);
		if (!layerMap.has(l)) layerMap.set(l, []);
		layerMap.get(l)!.push(p);
	}
	const hw = TILE.width, hd = TILE.depth;
	for (const pts of layerMap.values()) {
		for (let iter = 0; iter < 6; iter++) {
			let moved = false;
			for (let i = 0; i < pts.length; i++) {
				for (let j = i + 1; j < pts.length; j++) {
					const a = pts[i], b = pts[j];
					const dx = b.x - a.x, dz = b.z - a.z;
					const ox = hw - Math.abs(dx), oz = hd - Math.abs(dz);
					if (ox > 0 && oz > 0) {
						if (ox < oz) { const push = ox / 2 + 1e-4; const s = dx >= 0 ? 1 : -1; a.x -= s * push; b.x += s * push; }
						else { const push = oz / 2 + 1e-4; const s = dz >= 0 ? 1 : -1; a.z -= s * push; b.z += s * push; }
						moved = true;
					}
				}
			}
			if (!moved) break;
		}
	}
	return input;
}

// -----------------------------------------------------------------------------
// Tile Handling
// -----------------------------------------------------------------------------
function clearTiles() {
	for (const rec of tileRecords) {
		decrefTexture(rec.iso);
		tilesGroup.remove(rec.mesh);
		if (Array.isArray(rec.mesh.material)) { (rec.mesh.material[2] as THREE.Material).dispose(); }
	}
	while (tilesGroup.children.length) tilesGroup.remove(tilesGroup.children[0]);
	tileRecords = [];
}

function createTileAt(p: Vec3, iso: string): TileRecord {
	let topMat: THREE.Material;

	if (currentLevelConfig.mode === 'Capital') {
		// Create text texture for capital
		// We can't await here, so we might need a placeholders or pre-fetching.
		// For now, let's use the Flag but maybe overlay?
		// The design says "Capital Cities only (No Flag)".
		// Implementation hack: Use a simple canvas texture with "..." and update it async.
		const canvas = document.createElement('canvas');
		canvas.width = 256; canvas.height = 128;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 256, 128);
		ctx.fillStyle = '#333333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.font = 'bold 24px sans-serif'; ctx.fillText('Loading...', 128, 64);
		const tex = new THREE.CanvasTexture(canvas);
		topMat = new THREE.MeshPhongMaterial({ map: tex });

		resolveCapitalName(iso).then(cap => {
			ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 256, 128);
			ctx.fillStyle = '#000000';
			// Word wrap logic simple
			const words = cap.split(' ');
			if (words.length > 1) {
				ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), 128, 48);
				ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), 128, 88);
			} else {
				ctx.fillText(cap, 128, 64);
			}
			tex.needsUpdate = true;
		});

	} else if (currentLevelConfig.mode === 'Shape') { // Visual fallback for now
		topMat = getOrCreateFlagMaterial(iso);
		// TODO: Shape implementation
	} else {
		topMat = getOrCreateFlagMaterial(iso);
	}

	// Determine side material based on level
	// In strict modes, we don't show continent colors on sides
	// We determine this in getContinentSideMaterial logic above (checking currentLevelConfig)
	const sideMatToUse = getContinentSideMaterial(iso);
	const materials = [sideMatToUse, sideMatToUse, topMat, bottomMat, sideMatToUse, sideMatToUse];
	const tile = new THREE.Mesh(boxGeo, materials);
	tile.position.copy(p);
	tile.castShadow = true; tile.receiveShadow = true;
	tile.userData.iso = iso;
	tilesGroup.add(tile);
	const rec = { mesh: tile, topMat, iso };
	tileRecords.push(rec);
	return rec;
}

function buildSolvableAssignment(positions: Vec3[], rng: () => number): string[] {
	const n = positions.length, pairCount = Math.floor(n / 2);
	const isoPool = [...UN193_ISO2];
	for (let i = isoPool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[isoPool[i], isoPool[j]] = [isoPool[j], isoPool[i]]; }
	const pairIsoList: string[] = [];
	for (let i = 0; i < pairCount; i++) pairIsoList.push(isoPool[i % isoPool.length]);

	for (let attempt = 0; attempt < 30; attempt++) {
		const assigned: (string | null)[] = new Array(n).fill(null);
		const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));
		const halfX = TILE.spacingX * 0.5, halfZ = TILE.spacingZ * 0.5;

		const isFreeAt = (idx: number, alive: Set<number>) => {
			const p = positions[idx];
			for (const j of alive) {
				if (j === idx) continue;
				const q = positions[j];
				if (q.y >= p.y + TILE.layerStepY - 1e-3 && Math.abs(p.x - q.x) <= halfX && Math.abs(p.z - q.z) <= halfZ) return false;
			}
			let hasLeft = false, hasRight = false;
			for (const j of alive) {
				if (j === idx || Math.abs(positions[j].y - p.y) > TILE.layerStepY * 0.25 || Math.abs(p.z - positions[j].z) > halfZ) continue;
				const qx = positions[j].x;
				if (qx < p.x && Math.abs(p.x - qx) <= TILE.spacingX - 1e-3) hasLeft = true;
				if (qx > p.x && Math.abs(p.x - qx) <= TILE.spacingX - 1e-3) hasRight = true;
			}
			return !(hasLeft && hasRight);
		};

		let ok = true;
		for (let k = 0; k < pairCount; k++) {
			const free: number[] = [];
			for (const idx of remaining) if (isFreeAt(idx, remaining)) free.push(idx);
			if (free.length < 2) { ok = false; break; }
			const a = free[Math.floor(rng() * free.length)];
			let b = a; for (let g = 0; g < 10 && b === a; g++) b = free[Math.floor(rng() * free.length)];
			if (a === b) { ok = false; break; }
			assigned[a] = assigned[b] = pairIsoList[k];
			remaining.delete(a); remaining.delete(b);
		}
		if (ok && assigned.every(v => v !== null)) return assigned as string[];
		for (let t = 0; t < 5; t++) rng();
	}
	return Array.from({ length: n }, (_, i) => pairIsoList[Math.floor(i / 2) % pairIsoList.length]);
}

// -----------------------------------------------------------------------------
// Gameplay Logic
// -----------------------------------------------------------------------------
async function resolveCountryName(iso: string): Promise<string> {
	const code = (iso || '').toUpperCase();
	if (countryNameCache.has(code)) return countryNameCache.get(code)!;
	try {
		const n = regionNames?.of(code);
		if (n) { countryNameCache.set(code, n); return n; }
	} catch { }
	return fetch(`https://restcountries.com/v3.1/alpha/${code}`)
		.then(r => r.ok ? r.json() : null)
		.then(data => {
			const name = (Array.isArray(data) && data[0]?.name?.common) ? data[0].name.common : code;
			// Pre-cache capital if available
			if (Array.isArray(data) && data[0]?.capital?.[0]) {
				countryNameCache.set(code + '_CAP', data[0].capital[0]);
			}
			countryNameCache.set(code, name); return name;
		}).catch(() => code);
}

async function resolveCapitalName(iso: string): Promise<string> {
	const code = (iso || '').toUpperCase();
	const key = code + '_CAP';
	if (countryNameCache.has(key)) return countryNameCache.get(key)!;

	// Fetch if not present (reuse resolveCountryName flow logic essentially)
	return fetch(`https://restcountries.com/v3.1/alpha/${code}`)
		.then(r => r.ok ? r.json() : null)
		.then(data => {
			const cap = (Array.isArray(data) && data[0]?.capital?.[0]) ? data[0].capital[0] : 'Unknown';
			countryNameCache.set(key, cap);
			return cap;
		}).catch(() => "Unknown");
}

function buildBalancedIsoPool(seed: number, perCount: number): string[] {
	// Use the tier from the current level
	const sourcePool = currentLevelConfig.tier;

	const buckets: Record<string, string[]> = {};
	for (const iso of sourcePool) {
		const c = continentOf(iso); if (c === 'Unknown') continue;
		if (!buckets[c]) buckets[c] = []; buckets[c].push(iso);
	}
	const out: string[] = [];
	const conts: Continent[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
	conts.forEach((c, idx) => {
		const arr = buckets[c] || [];
		// If explicit tier is small, we might not have enough flags for 'perCount'. 
		// In that case, we just accept what we have or repeat?
		// Let's assume the tiers are built large enough or we loop.

		const r = mulberry32(seed + idx * 1000);
		// Fisher-Yates shuffle
		for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }

		// Take needed amount
		let needed = perCount;
		let taken = 0;
		while (taken < needed && taken < arr.length) {
			out.push(arr[taken]);
			taken++;
		}

		// If we still need more, fallback to general pool but keep same continent
		if (taken < needed) {
			// Find extra unique flags for this continent
			const usedSet = new Set(out);
			const candidates = UN193_ISO2.filter(iso => continentOf(iso) === c && !usedSet.has(iso));

			// Shuffle candidates
			for (let i = candidates.length - 1; i > 0; i--) {
				const j = Math.floor(r() * (i + 1));
				[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
			}

			let extraIdx = 0;
			while (taken < needed && extraIdx < candidates.length) {
				out.push(candidates[extraIdx++]);
				taken++;
			}
		}

		// Absolute fallback: Duplicate only if we exhausted the ENTIRE continent (rare)
		while (taken < needed) {
			out.push(out[taken % out.length]);
			taken++;
		}
	});
	const rAll = mulberry32(seed + 999);
	for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rAll() * (i + 1));[out[i], out[j]] = [out[j], out[i]]; }
	return out;
}

function clearTracks() { while (tracksGroup.children.length) tracksGroup.remove(tracksGroup.children[0]); }
function getTrackBases() { const px = TILE.spacingX * 0.8; return [px, px, px, px, px]; }
function getTrackBasesZ() { const sz = TILE.spacingZ * 1.25, startZ = -TILE.spacingZ * 2.5; return [0, 1, 2, 3, 4].map(i => startZ + i * sz); }

function buildTracks() {
	clearTracks(); if (!tracksState.visible) return;
	const bases = getTrackBases(), basesZ = getTrackBasesZ(), levels = 12, y0 = TILE.height * 0.5;
	for (let i = 0; i < bases.length; i++) {
		const h = levels * TILE.layerStepY + TILE.height;
		const rail = new THREE.Mesh(new THREE.BoxGeometry(TILE.width * 0.4, h, TILE.depth * 0.4), new THREE.MeshBasicMaterial({ color: 0x5c6f7b, transparent: true, opacity: 0.35 }));
		rail.position.set(bases[i], y0 + h * 0.5 - TILE.height * 0.5, basesZ[i]);
		tracksGroup.add(rail);
	}
}


function populateTracksWithTiles(levels = 10) {
	clearTiles();
	const pool = buildBalancedIsoPool(randomState.seed, levels);
	const bases = getTrackBases();
	const basesZ = getTrackBasesZ();
	const y0 = TILE.height * 0.5;

	// Distribute pool into pillars such that no pillar has > 30% of any continent
	const numPillars = bases.length;
	const maxCount = Math.ceil(levels * 0.3); // 30% tolerance
	let assignment: string[][] = [];
	let success = false;
	const rng = mulberry32(randomState.seed + 555);

	// Attempt to solve assignment
	for (let attempt = 0; attempt < 100; attempt++) {
		// Shuffle pool
		const current = [...pool];
		for (let i = current.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[current[i], current[j]] = [current[j], current[i]];
		}

		const parts: string[][] = Array.from({ length: numPillars }, () => []);
		const counts: Record<string, number>[] = Array.from({ length: numPillars }, () => ({}));
		let ok = true;

		// Fill layer by layer to keep balance
		for (let l = 0; l < levels; l++) {
			for (let p = 0; p < numPillars; p++) {
				// Find a valid candidate in restricted window to ensure randomness? 
				// Just linear search in shuffled 'current' is fine since it's already shuffled.
				let pickIdx = -1;
				for (let k = 0; k < current.length; k++) {
					const c = continentOf(current[k]);
					if ((counts[p][c] || 0) < maxCount) {
						pickIdx = k;
						break;
					}
				}
				if (pickIdx === -1) { ok = false; break; }

				const iso = current[pickIdx];
				current.splice(pickIdx, 1);
				parts[p].push(iso);
				counts[p][continentOf(iso)] = (counts[p][continentOf(iso)] || 0) + 1;
			}
			if (!ok) break;
		}

		if (ok) {
			assignment = parts;
			success = true;
			break;
		}
	}

	// If strict solve failed (unlikely), fallback to simple chunking
	if (!success) {
		console.warn('Constraint shuffle failed, falling back to random');
		const current = [...pool]; // reshuffle needed? just take as is
		for (let i = 0; i < numPillars; i++) {
			assignment.push(current.slice(i * levels, (i + 1) * levels));
		}
	}

	// Spawn tiles
	for (let i = 0; i < numPillars; i++) {
		const x = bases[i];
		const baseZ = basesZ[i];
		for (let l = 0; l < levels; l++) {
			createTileAt(new THREE.Vector3(x, y0 + l * TILE.layerStepY, baseZ), assignment[i][l]);
		}
	}

	updateTrackLabels();
	spawnOutsideTile(levels);
}

function spawnOutsideTile(levels: number) {
	const hX = -TILE.spacingX * 1.5, y = TILE.height * 0.5;
	const used = new Set(tileRecords.map(r => r.iso));
	const rem = UN193_ISO2.filter(c => !used.has(c));
	const rng = mulberry32(randomState.seed + Math.floor(performance.now()));
	const iso = rem.length ? rem[Math.floor(rng() * rem.length)] : UN193_ISO2[Math.floor(rng() * UN193_ISO2.length)];
	const hand = createTileAt(new THREE.Vector3(hX, y, 0), iso);
	hand.mesh.userData.hand = true; hand.mesh.scale.set(1.1, 1.1, 1.1);
	setTimeout(() => updateHandLabelFromCurrentHand(), 0);
}

// Helper to interpolate between two hex colors
function lerpColor(hexA: string, hexB: string, t: number): string {
	const c1 = new THREE.Color(hexA);
	const c2 = new THREE.Color(hexB);
	c1.lerp(c2, t);
	return '#' + c1.getHexString();
}

function getColorForPercentage(p: number): string {
	// Red: 0-40
	// Orange: 41-60
	// Yellow: 61-80
	// Green: 81-100

	if (p <= 40) {
		return '#f44336'; // Red
	}
	if (p <= 60) {
		// Graduate from Red to Orange
		const t = (p - 40) / 20;
		return lerpColor('#f44336', '#ff9800', t);
	}
	if (p <= 80) {
		// Graduate from Orange to Yellow
		const t = (p - 60) / 20;
		return lerpColor('#ff9800', '#ffeb3b', t);
	}
	// Graduate from Yellow to Green (stopping at 99 before 100)
	const t = (p - 80) / 20;
	return lerpColor('#ffeb3b', '#4caf50', t);
}

const pillarStates = [0, 0, 0, 0, 0];

function updateTrackLabels() {
	while (trackLabelsGroup.children.length) trackLabelsGroup.remove(trackLabelsGroup.children[0]);
	const bases = getTrackBases(), basesZ = getTrackBasesZ();

	// Initialize counters for 5 pillars
	const pillars = bases.map(() => ({ total: 0, counts: {} as Record<string, number> }));
	let allPure = true;
	let completedPillars = 0;

	// Assign every tile to its closest pillar (Robust Stats)
	for (const r of tileRecords) {
		if (r.mesh.userData.hand) continue; // Skip hand tile

		let bestDist = 1e9, bestPillar = -1;
		for (let i = 0; i < bases.length; i++) {
			const dx = r.mesh.position.x - bases[i];
			const dz = r.mesh.position.z - basesZ[i];
			const d = dx * dx + dz * dz; // squared dist is enough
			if (d < bestDist) { bestDist = d; bestPillar = i; }
		}

		if (bestPillar !== -1) {
			const c = continentOf(r.iso);
			pillars[bestPillar].counts[c] = (pillars[bestPillar].counts[c] || 0) + 1;
			pillars[bestPillar].total++;
		}
	}

	// Render Labels
	for (let i = 0; i < pillars.length; i++) {
		const { total, counts } = pillars[i];

		// New Logic: Target Continent is PRESET.
		const targetVal = assignedPillarContinents[i] || 'None';
		const targetCount = counts[targetVal] || 0;

		const purity = (targetCount > 0 && total > 0) ? Math.round((targetCount / total) * 100) : 0;
		// Always show the Target Name
		const labelText = targetVal;

		// For 100%, we want to flash on achievement, then stay stable Cyan.
		const is100 = (purity === 100 && total >= 1); // Ensure we have at least 1 tile to count as 100% done
		const colorToUse = is100 ? '#ffffff' : getColorForPercentage(purity);

		const label = makeTextLabel(labelText, `${purity}%`, colorToUse);

		if (is100) {
			label.userData.is100 = true;
			label.material.color.setHex(0x00ffff); // Default stable Cyan

			// Trigger flash if it wasn't 100% before.
			if (pillarStates[i] !== 100) {
				label.userData.flashStart = Date.now();
			}
		}
		pillarStates[i] = purity;

		// Position label
		label.position.set(bases[i] - TILE.width * 1.0, 0.03, basesZ[i]);
		label.rotation.x = -Math.PI / 2;
		trackLabelsGroup.add(label);

		if (pillarStates[i] === 100) completedPillars++;
	}

	// Win Condition: 4 out of 5 Pillars complete
	if (completedPillars >= 4 && !modalOpen && tileRecords.length > 0) handleLevelUp();
}


// Timer State
let startTime = 0;
let blitzRemaining = 0;
let gameActive = false;
let blitzMode = false;
const timerDiv = document.createElement('div');
Object.assign(timerDiv.style, {
	position: 'fixed', top: '20px', left: '20px', padding: '10px 20px',
	color: 'white', fontSize: '32px', fontFamily: '"Segoe UI", "Roboto", system-ui, sans-serif', fontWeight: '900',
	textShadow: '0 4px 8px rgba(0,0,0,0.3)', pointerEvents: 'none', zIndex: '2000',
	background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)', borderRadius: '22px',
	border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
	textAlign: 'left', lineHeight: '1.2'
});
timerDiv.innerText = '00:00';
document.body.appendChild(timerDiv);

// Version Tag removed, moved to Settings UI


function updateTimer() {
	if (!gameActive) return;

	if (blitzMode) {
		// Countdown
		const now = Date.now();
		const elapsed = (now - startTime) / 1000;
		let remaining = blitzRemaining - elapsed;

		if (remaining <= 0) {
			remaining = 0;
			gameActive = false;
			timerDiv.innerText = "00:00";
			timerDiv.style.color = '#ff0000';
			// Trigger Game Over
			alert("Time's Up! Try Again.");
			repopulatePilesRandomUnique(); // Restart level
			return;
		}

		// Update global state tracking for bonuses
		// Actually, simpler to just store 'lastTime' and decrement logic? 
		// We need to support +5s bonuses.
		// Better approach: store 'endTime' and adjust it?
		// Let's change strategy:
		// blitzRemaining is the source of truth, updated by delta.
		// We'll trust the loop frequency? No, define variable logic.

		// Simplest: 
		// On Start: blitzEndTime = Date.now() + seconds * 1000;
		// On Frame: rem = (blitzEndTime - Date.now())
		// On Bonus: blitzEndTime += 5000;
	} else {
		// Count Up
		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
		const s = (elapsed % 60).toString().padStart(2, '0');
		timerDiv.innerText = `${m}:${s}`;
	}
}

// Revised Timer Logic with flexible specific-state needed
let blitzEndTime = 0;

function startTimer() {
	gameActive = true;
	startTime = Date.now();
	timerDiv.style.color = 'white';

	const cfg = currentLevelConfig;
	if (cfg.timer === 'Blitz' && cfg.blitzTimeSeconds) {
		blitzMode = true;
		blitzEndTime = Date.now() + cfg.blitzTimeSeconds * 1000;
	} else {
		blitzMode = false;
	}

	// Start loop if not already (requestAnimationFrame handles it essentially via render loop calling this?)
	// Wait, updateTimer() needs to be called in the animate loop.
	// Currently it's called? I need to check the animate function at the bottom of the file.
	// Assuming it's there.
}

function updateTimerDisplay() {
	if (!gameActive) return;
	if (!blitzMode) {
		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
		const s = (elapsed % 60).toString().padStart(2, '0');
		timerDiv.innerText = `${m}:${s}`;
	} else {
		const remMs = blitzEndTime - Date.now();
		if (remMs <= 0) {
			timerDiv.innerText = "00:00";
			gameActive = false;
			handleGameOver("Time's Up!");
			return;
		}
		const remS = Math.floor(remMs / 1000);
		const m = Math.floor(remS / 60).toString().padStart(2, '0');
		const s = (remS % 60).toString().padStart(2, '0');
		timerDiv.innerText = `${m}:${s}`;

		if (remS < 30) timerDiv.style.color = '#ff4444'; // Red alert
	}
}

function addTimeBonus(seconds: number) {
	if (!gameActive) return;
	if (blitzMode) {
		blitzEndTime += seconds * 1000;
	} else if (currentLevelConfig.timer === 'CountUp') {
		// Reduce elapsed time by shifting startTime forward
		startTime += seconds * 1000;
	}
	showFloatingText(`+${seconds}s`, '#00ff00');
}

function applyTimePenalty(seconds: number) {
	if (!gameActive) return;
	if (blitzMode) {
		blitzEndTime -= seconds * 1000;
	} else if (currentLevelConfig.timer === 'CountUp') {
		// Increase elapsed time by shifting startTime backward
		startTime -= seconds * 1000;
	}
	showFloatingText(`-${seconds}s`, '#ff0000');
	timerDiv.style.color = '#ff0000';
	setTimeout(() => { if (gameActive) timerDiv.style.color = 'white'; }, 500);
}

function showFloatingText(text: string, color: string) {
	const el = document.createElement('div');
	el.innerText = text;
	Object.assign(el.style, {
		position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0.5)',
		color: color, fontSize: '100px', fontWeight: '900', pointerEvents: 'none',
		transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: '9999',
		textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px ' + color,
		opacity: '0', filter: 'blur(10px)',
		fontFamily: '"Segoe UI", "Roboto", system-ui, sans-serif'
	});
	document.body.appendChild(el);

	// Animate in
	setTimeout(() => {
		el.style.opacity = '1';
		el.style.transform = 'translate(-50%, -50%) scale(1)';
		el.style.filter = 'blur(0px)';
	}, 20);

	// Animate out
	setTimeout(() => {
		el.style.opacity = '0';
		el.style.transform = 'translate(-50%, -100%) scale(1.5)';
		el.style.filter = 'blur(20px)';
	}, 600);

	setTimeout(() => el.remove(), 1200);
}

function handleGameOver(reason: string) {
	showLevelUpModal(
		"Failed!",
		`${reason}<br>Try again?`,
		() => { repopulatePilesRandomUnique(); }
	);
}

function handleLevelUp() {
	gameActive = false;
	const nextId = currentLevelConfig.id + 1;
	const nextConfig = LEVELS.find(l => l.id === nextId);

	const finalTime = timerDiv.innerText;

	let btnText = "Next Level";
	let callback = () => {
		if (nextConfig) {
			currentLevelConfig = nextConfig;
			saveProgress(currentLevelConfig.id);
			updateLevelBadge();
			repopulatePilesRandomUnique();
		} else {
			alert("You have completed all implemented levels! Resetting to Level 1.");
			currentLevelConfig = LEVELS[0];
			saveProgress(1);
			updateLevelBadge();
			repopulatePilesRandomUnique();
		}
	};

	showLevelUpModal(
		"Level Complete!",
		`Time: ${finalTime}<br>${currentLevelConfig.timer === 'Blitz' ? 'Blitz Bonus Applied!' : 'Well done!'}`,
		callback
	);
}

function handleLevelStart() {
	currentLevelConfig = LEVELS[currentLevelIndex];
	saveProgress(currentLevelConfig.id);
	updateLevelBadge();
	clearTiles();
	repopulatePilesRandomUnique();
	applyCameraActionPreset();
}

function updateHandLabelFromCurrentHand() {
	while (handLabelGroup.children.length) handLabelGroup.remove(handLabelGroup.children[0]);
	// Respect Level Mode
	const mode = currentLevelConfig.mode;

	// Visual Mode: Show NOTHING (unless debug or hint)
	if ((mode === 'Visual' || mode === 'Shape') && !debugContinentsEnabled && !revealCountryHintActive) return;

	const hand = tileRecords.find(r => r.mesh.userData.hand);
	if (!hand) return;

	if (mode === 'Capital' && !debugContinentsEnabled) {
		// Show Capital Name
		resolveCapitalName(hand.iso).then(cap => {
			const label = makeTextLabel(cap, undefined, '#ffeb3b'); // Yellow for capital
			label.position.set(hand.mesh.position.x, 0.03, hand.mesh.position.z + TILE.depth * 0.8);
			handLabelGroup.add(label);
		});
		return;
	}

	// Standard Mode: Show Country Name + Continent
	resolveCountryName(hand.iso).then(name => {
		const cont = continentOf(hand.iso);
		let label: THREE.Mesh;

		if (currentLevelConfig.mode === 'Standard' || debugContinentsEnabled) {
			// makeTextLabel logic: sub is TOP (Large), text is BOTTOM (Small)
			// We want Country Name TOP, Continent BOTTOM.
			// Debug mode forces this view even if level is Visual/Capital (actually Visual/Capital return early above? No, we need to fix that early return too)
			label = makeTextLabel(cont, name);
		} else {
			label = makeTextLabel(name);
		}
		// Increased offset to 1.5 to prevent overlapping the tile (Label mesh is large)
		label.position.set(hand.mesh.position.x, 0.03, hand.mesh.position.z + TILE.depth * 1.5);
		handLabelGroup.add(label);
	});
}

// -----------------------------------------------------------------------------
// Scene Controls & Interaction
// -----------------------------------------------------------------------------
function createSettingsUI() {
	// Settings UI removed/simplified for Level Progression System.
	// We no longer allow users to freely toggle hints; the level config dictates this.
	// If we want a debug menu, we can keep it hidden or reduced.

	// Unified Control Bar (Bottom Left)
	const controlBar = document.createElement('div');
	controlBar.id = 'control-bar';
	Object.assign(controlBar.style, {
		position: 'fixed', left: '20px', bottom: '20px',
		display: 'flex', alignItems: 'center', gap: '10px', zIndex: '2000'
	});
	document.body.appendChild(controlBar);

	const btn = document.createElement('div');
	btn.id = 'settings-btn';
	btn.innerHTML = '⚙️';
	Object.assign(btn.style, {
		width: '44px', height: '44px', background: 'rgba(0,0,0,0.5)',
		borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
		fontSize: '24px', cursor: 'pointer', backdropFilter: 'blur(10px)',
		border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s'
	});
	btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; btn.style.background = 'rgba(0,0,0,0.7)'; };
	btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.background = 'rgba(0,0,0,0.5)'; };
	controlBar.appendChild(btn);

	const menu = document.createElement('div');
	menu.id = 'settings-menu';
	Object.assign(menu.style, {
		position: 'fixed', left: '20px', bottom: '74px',
		background: 'rgba(20,24,28,0.9)', padding: '15px', borderRadius: '12px',
		display: 'flex', flexDirection: 'column', gap: '15px',
		boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: '1000', color: 'white',
		opacity: '0', transform: 'translateY(10px) scale(0.95)', pointerEvents: 'none',
		transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
	});

	let hideTimer: any;
	const closeMenu = () => {
		Object.assign(menu.style, { opacity: '0', transform: 'translateY(10px) scale(0.95)', pointerEvents: 'none' });
	};
	const openMenu = () => {
		Object.assign(menu.style, { opacity: '1', transform: 'translateY(0) scale(1)', pointerEvents: 'auto' });
		resetTimer();
	};
	const resetTimer = () => {
		clearTimeout(hideTimer);
		hideTimer = setTimeout(closeMenu, 5000);
	};

	// Camera Lock Toggle
	const addToggle = (label: string, id: string, onChange: (checked: boolean) => void, initial = false) => {
		const wrap = document.createElement('label');
		Object.assign(wrap.style, { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' });
		wrap.innerHTML = `<span>${label}</span><input type="checkbox" id="${id}" ${initial ? 'checked' : ''}>`;
		menu.appendChild(wrap);
		wrap.querySelector('input')!.onchange = (e) => {
			onChange((e.target as HTMLInputElement).checked);
			resetTimer();
		};
	};

	addToggle('Camera Lock', 'cam-lock', (v) => { controls.enabled = !v; });

	// Version Info
	const ver = document.createElement('div');
	ver.innerText = typeof CURRENT_VERSION !== 'undefined' ? CURRENT_VERSION : 'v1.2.3';
	ver.style.fontSize = "10px"; ver.style.opacity = "0.5"; ver.style.marginTop = "10px"; ver.style.cursor = 'default';
	menu.appendChild(ver);

	document.body.appendChild(menu);

	const createHintBtn = (label: string, cost: number, color: string, onClick: () => void) => {
		const b = document.createElement('button');
		b.innerHTML = `<span style="font-weight:700">${label}</span> <span style="background:${color}; color:white; padding:1px 6px; border-radius:10px; font-size:10px; margin-left:6px; font-weight:900; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">${cost}s</span>`;
		Object.assign(b.style, {
			background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
			color: '#fff', cursor: 'pointer',
			fontSize: '13px', padding: '10px 14px', borderRadius: '22px', transition: 'all 0.2s',
			display: 'flex', alignItems: 'center', fontWeight: '600',
			boxShadow: '0 4px 12px rgba(0,0,0,0.2)', backdropFilter: 'blur(15px)'
		});
		b.onmouseenter = () => {
			b.style.background = 'rgba(255,255,255,0.15)';
			b.style.transform = 'translateY(-2px)';
			b.style.boxShadow = '0 8px 16px rgba(0,0,0,0.4)';
		};
		b.onmouseleave = () => {
			b.style.background = 'rgba(0,0,0,0.4)';
			b.style.transform = 'translateY(0)';
			b.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
		};
		b.onclick = () => {
			const timeRem = blitzEndTime - Date.now();
			if (gameActive && blitzMode && timeRem > (cost * 1000 + 1000)) {
				applyTimePenalty(cost);
				onClick();
			} else if (gameActive && !blitzMode) {
				onClick();
			}
		};
		controlBar.appendChild(b);
	};

	createHintBtn('Country', HINT_COSTS.COUNTRY, '#ea580c', () => { // Orange
		revealCountryHintActive = true;
		updateHandLabelFromCurrentHand();
		setTimeout(() => { revealCountryHintActive = false; updateHandLabelFromCurrentHand(); }, 5000);
	});

	createHintBtn('Continent', HINT_COSTS.CONTINENT, '#2563eb', () => { // Blue
		locateContinentHintActive = true;
		setTimeout(() => { locateContinentHintActive = false; }, 4000);
	});

	btn.onclick = () => {
		const isOpen = menu.style.opacity === '1';
		if (isOpen) { closeMenu(); clearTimeout(hideTimer); } else { openMenu(); }
	};
}

// -----------------------------------------------------------------------------
// Scene Controls & Interaction
// -----------------------------------------------------------------------------

function applyCameraActionPreset() {
	// Max zoom optimized with portrait support and Extra Padding (safety factor 9.0)
	const isPortrait = camera.aspect < 0.8; // Stricter portrait check
	// Base Y for Landscape (wide aspect) ~11.5
	// If portrait, we need to cover specific Width with padding.
	const y = isPortrait ? 9.0 / camera.aspect : 11.5;

	camera.position.set(-0.6, y, 2.0);
	controls.target.set(-0.6, 1.0, 0);

	// Apply Limits
	controls.minAzimuthAngle = -Math.PI / 9; // -20 deg
	controls.maxAzimuthAngle = Math.PI / 9;  // +20 deg
	controls.minPolarAngle = 0;              // Top down
	controls.maxPolarAngle = Math.PI / 4;    // 45 deg max trim
	controls.enablePan = false;

	camera.fov = 60;
	camera.updateProjectionMatrix();
	controls.update();
}

function isTileFree(mesh: THREE.Mesh): boolean {
	const p = mesh.position, hx = TILE.spacingX * 0.5, hz = TILE.spacingZ * 0.5, ay = p.y + TILE.layerStepY - 1e-3;
	for (const r of tileRecords) if (r.mesh !== mesh && r.mesh.position.y >= ay && Math.abs(p.x - r.mesh.position.x) <= hx && Math.abs(p.z - r.mesh.position.z) <= hz) return false;
	let left = false, right = false;
	for (const r of tileRecords) {
		if (r.mesh === mesh || Math.abs(r.mesh.position.y - p.y) > TILE.layerStepY * 0.25 || Math.abs(p.z - r.mesh.position.z) > hz) continue;
		const ox = r.mesh.position.x;
		if (ox < p.x && Math.abs(p.x - ox) <= TILE.spacingX - 1e-3) left = true;
		if (ox > p.x && Math.abs(p.x - ox) <= TILE.spacingX - 1e-3) right = true;
	}
	return !(left && right);
}

function setHover(mesh: THREE.Mesh | null) {
	if (lastHover && lastHover !== mesh) {
		const top = (lastHover.material as THREE.Material[])[2] as THREE.MeshPhongMaterial;
		top.emissive?.setHex(0x000000); top.specular.setHex(0x222222); top.shininess = 30;
		lastHover = null;
	}
	if (!mesh) return;
	const top = (mesh.material as THREE.Material[])[2] as THREE.MeshPhongMaterial;
	if (isTileFree(mesh)) {
		top.emissive.setHex(0x333333); top.specular.setHex(0xffffff); top.shininess = 60;
	}
	lastHover = mesh;
}

window.addEventListener('pointermove', (e) => {
	const rect = renderer.domElement.getBoundingClientRect();
	mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(tilesGroup.children)[0];
	setHover(hit ? hit.object as THREE.Mesh : null);
});

window.addEventListener('pointerdown', (e) => {
	if (Date.now() < interactionLockUntil) return;

	// CRITICAL FIX: Update mouse coordinates!
	const rect = renderer.domElement.getBoundingClientRect();
	mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));

	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(tilesGroup.children)[0];
	if (!hit) return;
	const mesh = hit.object as THREE.Mesh;
	if (gameMode === 'pipes') handlePileInteraction(mesh);
});


window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	applyCameraActionPreset(); // Re-calc for aspect ratio
});

function handlePileInteraction(clicked: THREE.Mesh) {
	const bases = getTrackBases(), basesZ = getTrackBasesZ();

	// 1. Identify which pillar column (Index) was clicked
	let bIdx = -1, minD = 1e9;
	for (let i = 0; i < bases.length; i++) {
		const dx = clicked.position.x - bases[i];
		const dz = clicked.position.z - basesZ[i];
		const d = dx * dx + dz * dz;
		if (d < minD) { minD = d; bIdx = i; }
	}
	if (bIdx === -1) return;

	// 2. Robustly gather ALL tiles belonging to this pillar
	//    (Using same Nearest-Neighbor logic as stats to ensure consistency)
	const pillar: TileRecord[] = [];
	for (const r of tileRecords) {
		if (r.mesh.userData.hand) continue;
		// Find closest base for this tile
		let tIdx = -1, tMinD = 1e9;
		for (let k = 0; k < bases.length; k++) {
			const dx = r.mesh.position.x - bases[k];
			const dz = r.mesh.position.z - basesZ[k];
			const d = dx * dx + dz * dz;
			if (d < tMinD) { tMinD = d; tIdx = k; }
		}
		// If tile belongs to clicked pillar
		if (tIdx === bIdx) pillar.push(r);
	}

	// Sort by Y to get stack order
	pillar.sort((a, b) => a.mesh.position.y - b.mesh.position.y);

	const hand = tileRecords.find(r => r.mesh.userData.hand);
	if (!pillar.length || !hand) return;

	// Start timer on first interaction if not active
	if (!gameActive && currentLevelConfig.id > 0 && !blitzMode) {
		// If Blitz mode, timer usually starts on load? Or on first move?
		// Design decision: Blitz starts on first move? Or immediately?
		// "3 Minutes. Go fast." -> Usually implies immediate start or start on interaction.
		// Current logic: startTimer() is called during buildPipesGame().
		// If timer is already running (gameActive=true), we don't reset.
		// Logic below (original) started it if not active.
		// We have moved to 'startTimer()' which is called in buildPipesGame().
		// So game is likely already active.
		if (!gameActive) { startTimer(); }
	}

	interactionLockUntil = Date.now() + 500;

	const top = pillar[pillar.length - 1];
	const bottom = pillar[0];
	const handPos = hand.mesh.position.clone();
	const bottomPos = bottom.mesh.position.clone(); // Target for Hand

	// Cycle Logic:
	// 1. Hand -> Bottom
	// 2. Pillar[0...N-2] -> Shift Up
	// 3. Top -> Hand

	const animateMove = (m: THREE.Mesh, to: Vec3) => {
		const s = m.position.clone(), start = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / 300); m.position.lerpVectors(s, to, t);
			if (t < 1) requestAnimationFrame(step);
			else {
				if (m.userData.hand) m.scale.set(1.1, 1.1, 1.1); else m.scale.set(1, 1, 1);
			}
		};
		requestAnimationFrame(step);
	};

	// Hand moves to Bottom position
	animateMove(hand.mesh, bottomPos);

	// Pillar items shift up
	for (let i = 0; i < pillar.length - 1; i++) {
		// P[i] moves to P[i+1] position
		const nextPos = pillar[i + 1].mesh.position.clone();
		animateMove(pillar[i].mesh, nextPos);
	}

	// Top moves to Hand position
	animateMove(top.mesh, handPos);

	// Time Feedback (Any Level with Timer)
	if (gameActive && currentLevelConfig.timer !== 'None') {
		const handCont = continentOf(hand.iso);
		const targetCont = assignedPillarContinents[bIdx];
		if (handCont === targetCont) {
			const bonus = currentLevelConfig.correctBonusSeconds ?? 5; // Default 5s
			if (bonus > 0) addTimeBonus(bonus);
		} else {
			const penalty = currentLevelConfig.wrongPenaltySeconds ?? 5; // Default 5s
			if (penalty > 0) applyTimePenalty(penalty);
		}
	}

	// Update State
	hand.mesh.userData.hand = false;
	top.mesh.userData.hand = true;

	setTimeout(() => { updateTrackLabels(); updateHandLabelFromCurrentHand(); interactionLockUntil = 0; }, 350);
}

// -----------------------------------------------------------------------------
// Initialization & Boot
// -----------------------------------------------------------------------------

// Initialize if empty (first run)
if (assignedPillarContinents.length === 0) repopulatePilesRandomUnique();

function buildPipesGame() {
	clearTracks();
	populateTracksWithTiles(10);
	startTimer();
}

function repopulatePilesRandomUnique() {
	// Fixed Alphabetical Order: Africa, Americas, Asia, Europe, Oceania
	assignedPillarContinents = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

	populateTracksWithTiles(10);
	startTimer(); // Updated to use startTimer() which sets blitz mode
}

function showLevelUpModal(title: string, subtitle: string, onOk: () => void) {
	modalOpen = true; const m = document.createElement('div');
	Object.assign(m.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '9999' });
	m.innerHTML = `<div style="background:#1a1f24; padding:30px; border-radius:15px; text-align:center; color:white; min-width:300px;">
		<h2>${title}</h2><p>${subtitle}</p><button id="modal-ok" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer;">OK</button>
	</div>`;
	document.body.appendChild(m);
	document.getElementById('modal-ok')!.onclick = () => { m.remove(); modalOpen = false; onOk(); };
}

const gui = new GUI({ title: 'Debug' });
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '84px';
gui.domElement.style.left = '20px';
const debugObj = {
	level: `Level ${currentLevelIndex + 1}`
};
const levelOptions = LEVELS.map((_, i) => `Level ${i + 1}`);

gui.add(debugObj, 'level', levelOptions).name('Jump to Level').onChange((v: string) => {
	const idx = parseInt(v.replace('Level ', '')) - 1;
	if (idx >= 0 && idx < LEVELS.length) {
		currentLevelIndex = idx;
		handleLevelStart();
	}
});
gui.show(false);

// Debug Shortcut: Ctrl+Alt+Shift+D
window.addEventListener('keydown', (e) => {
	if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyD') {
		const isHidden = (gui.domElement.style.display === 'none');
		gui.show(isHidden); // Toggle GUI
		debugContinentsEnabled = isHidden; // Enable debug info when showing GUI
		updateHandLabelFromCurrentHand();
		updateTrackLabels();
	}
});

createSettingsUI();
applyCameraActionPreset();
buildPipesGame();
updateLevelBadge();

// Version Check
(async function checkVersion() {
	try {
		const resp = await fetch('./version.json');
		if (resp.ok) {
			const data = await resp.json();
			if (data.version && data.version !== CURRENT_VERSION) {
				const n = document.createElement('div');
				Object.assign(n.style, {
					position: 'fixed', top: '10px', right: '10px', padding: '15px 20px',
					background: '#2563eb', color: 'white', borderRadius: '8px', zIndex: '10000',
					boxShadow: '0 4px 6px rgba(0,0,0,0.3)', fontFamily: 'sans-serif', transition: 'opacity 0.5s'
				});
				n.innerHTML = `
					<div style="font-weight:bold; margin-bottom:5px;">Update Available!</div>
					<div style="font-size:0.9em; margin-bottom:10px;">New version ${data.version} is available.</div>
					<button id="update-btn" style="background:white; color:#2563eb; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Refresh</button>
				`;
				document.body.appendChild(n);
				document.getElementById('update-btn')!.onclick = () => location.reload();
			}
		}
	} catch (e) { console.error('Version check failed', e); }
})();

function animateLoop() {
	requestAnimationFrame(animateLoop);
	controls.update();
	updateTimerDisplay();

	// Flash 100% labels
	const now = Date.now();
	trackLabelsGroup.children.forEach((child: any) => {
		if (child.userData.is100) {
			if (child.userData.flashStart) {
				const elapsed = now - child.userData.flashStart;
				if (elapsed < 1000) { // 1 sec total
					// 5 flashes: 100ms Bright, 100ms Cyan
					const step = Math.floor(elapsed / 100);
					const isBright = step % 2 === 0;
					child.material.color.setHex(isBright ? 0xffffff : 0x00ffff);
				} else {
					child.userData.flashStart = 0; // Stop flashing
					child.material.color.setHex(0x00ffff); // Stable Cyan
				}
			} else {
				child.material.color.setHex(0x00ffff); // Ensure stable Cyan
			}
		}
	});

	renderer.render(scene, camera);

	// Continent Hint Logic (Shimmer/Pulse selectable matching tiles)
	if (typeof locateContinentHintActive !== 'undefined' && locateContinentHintActive) {
		const hand = tileRecords.find(r => r.mesh.userData.hand);
		if (hand) {
			const targetCont = continentOf(hand.iso);
			const shimmer = (Math.sin(now * 0.01) * 0.5 + 0.5) * 0.4;
			tileRecords.forEach(r => {
				if (r.mesh.userData.hand) return;
				if (continentOf(r.iso) === targetCont && isTileFree(r.mesh)) {
					r.topMat.emissive.setRGB(shimmer, shimmer, shimmer);
				}
			});
		}
	}
}
animateLoop();
