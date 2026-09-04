/* =====================================================================
   TOY BOX QUEST — an idle RPG in a toy box
   Plain JS, no build step. Saves to localStorage automatically.
   ===================================================================== */
(() => {
'use strict';

const SAVE_KEY = 'toyBoxQuestSave';
const SAVE_VERSION = 1;

/* ----------------------------- helpers ----------------------------- */
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function weightedPick(items, weightOf) {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = Math.random() * total;
  for (const it of items) { r -= weightOf(it); if (r <= 0) return it; }
  return items[items.length - 1];
}
const SUFFIXES_NUM = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) < 1000) return Math.round(n).toString();
  let i = 0;
  while (Math.abs(n) >= 1000 && i < SUFFIXES_NUM.length - 1) { n /= 1000; i++; }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + SUFFIXES_NUM[i];
}
const pct = (n) => (Math.round(n * 10) / 10) + '%';
function timeStr(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
let uid = Date.now() % 1e9;
const nextId = () => (uid++).toString(36);

/* ------------------------------ data ------------------------------- */
const RARITIES = [
  { id: 'common',    name: 'Common',    w: 60,  mult: 1.0, affixes: 0, sell: 1,   prefixes: ['Plastic', 'Cardboard', 'Wooden', 'Foam', 'Hand-me-down'] },
  { id: 'uncommon',  name: 'Uncommon',  w: 25,  mult: 1.3, affixes: 1, sell: 2.5, prefixes: ['Shiny', 'Squeaky', 'Bouncy', 'Polished', 'Sturdy'] },
  { id: 'rare',      name: 'Rare',      w: 10,  mult: 1.7, affixes: 2, sell: 6,   prefixes: ['Glittery', 'Glow-in-the-Dark', 'Rainbow', 'Wind-up', 'Sparkly'] },
  { id: 'epic',      name: 'Epic',      w: 3.5, mult: 2.3, affixes: 3, sell: 15,  prefixes: ['Enchanted', 'Turbo', 'Deluxe', 'Collector\'s', 'Supercharged'] },
  { id: 'legendary', name: 'Legendary', w: 1.2, mult: 3.1, affixes: 4, sell: 40,  prefixes: ['Legendary', 'Golden', 'Limited Edition', 'Heirloom', 'Radiant'] },
  { id: 'mythic',    name: 'Mythic',    w: 0.3, mult: 4.2, affixes: 5, sell: 120, prefixes: ['Mythic', 'Cosmic', 'Ultimate', 'Prismatic', 'Birthday-Wish'] },
];
const SUFFIXES = ['of Giggles', 'of Naptime', 'of Bubbles', 'of Sprinkles', 'of Zoomies', 'of the Sandbox', 'of Bedtime Stories', 'of Infinite Snacks',
  'of Recess', 'of the Lost Sock', 'of Sticky Fingers', 'of Show-and-Tell', 'of Pillow Forts', 'of Juice Boxes'];

const SLOTS = ['weapon', 'hat', 'outfit', 'shoes', 'charm', 'sidekick'];
const SLOT_LABEL = { weapon: 'Weapon', hat: 'Hat', outfit: 'Outfit', shoes: 'Shoes', charm: 'Charm', sidekick: 'Sidekick' };
const BASES = {
  weapon:   [['Foam Sword', '🗡️'], ['Water Blaster', '🔫'], ['Pillow Mace', '🏏'], ['Yo-yo', '🪀'], ['Slingshot', '🏹'], ['Magic Wand', '🪄'], ['Boomerang', '🪃'], ['Toy Hammer', '🔨'], ['Lightsaber', '🔦'], ['Pool Noodle', '🥖']],
  hat:      [['Party Hat', '🎉'], ['Paper Crown', '👑'], ['Ball Cap', '🧢'], ['Cowboy Hat', '🤠'], ['Wizard Hat', '🎩'], ['Toy Helmet', '⛑️'], ['Pirate Hat', '🏴‍☠️'], ['Bucket', '🪣']],
  outfit:   [['Superhero Cape', '🦸'], ['Dino Onesie', '🦕'], ['Pajamas', '👘'], ['Knight Costume', '🥋'], ['Space Suit', '👩‍🚀'], ['Raincoat', '🧥'], ['Tutu', '🩰'], ['Striped Shirt', '👕']],
  shoes:    [['Light-up Sneakers', '👟'], ['Bunny Slippers', '🥿'], ['Roller Skates', '🛼'], ['Rain Boots', '👢'], ['Flippers', '🩴'], ['Moon Boots', '🥾']],
  charm:    [['Lucky Marble', '🔮'], ['Friendship Bracelet', '📿'], ['Whistle', '🎺'], ['Compass', '🧭'], ['Keychain', '🔑'], ['Mood Ring', '💍'], ['Four-leaf Clover', '🍀'], ['Evil Eye Bead', '🧿']],
  sidekick: [['Wind-up Robot', '🤖'], ['Rubber Duck', '🦆'], ['Toy Dino', '🦖'], ['Plush Cat', '🐱'], ['Balloon Dog', '🎈'], ['Pet Rock', '🪨'], ['Toy Train', '🚂'], ['Tiny Dragon', '🐲']],
};
const STAT_LABEL = { atk: '⚔️ Attack', def: '🛡️ Defense', hp: '❤️ Max HP', crit: '🎯 Crit chance', speed: '⚡ Attack speed', gold: '🪙 Gold find', xp: '📚 XP gain', luck: '🍀 Luck' };
const PCT_STATS = new Set(['crit', 'speed', 'gold', 'xp', 'luck']);
const STAT_WEIGHT = { atk: 4, def: 2.5, hp: 0.6, crit: 4, speed: 5, gold: 1.2, xp: 1.2, luck: 1.5 };

const ZONES = [
  { name: 'Toy Chest', icon: '🧸', monsters: [['Sock Puppet', '🧦'], ['Rubber Ducky', '🦆'], ['Bouncy Ball', '🏀'], ['Wind-up Mouse', '🐭']], boss: ['Jack-in-the-Box', '🎁'], toys: [['Spinning Top', '🪀'], ['Toy Whistle', '🎺'], ['Golden Kazoo', '🎷']] },
  { name: 'Block Castle', icon: '🏰', monsters: [['Brick Golem', '🧱'], ['Toy Soldier', '💂'], ['Knight Figurine', '🛡️'], ['Catapult Cart', '🛒']], boss: ['The Block King', '👑'], toys: [['Blue Brick', '🟦'], ['Castle Flag', '🚩'], ['Royal Scepter', '🪄']] },
  { name: 'Plush Forest', icon: '🌳', monsters: [['Plush Bunny', '🐰'], ['Fuzzy Bear', '🐻'], ['Stuffed Owl', '🦉'], ['Cotton Fox', '🦊']], boss: ['Giant Teddy', '🧸'], toys: [['Acorn Button', '🌰'], ['Pinecone Rattle', '🌲'], ['Mushroom Lamp', '🍄']] },
  { name: 'Marble Mountains', icon: '⛰️', monsters: [['Marble Roller', '⚪'], ['Rock Candy Crab', '🦀'], ['Boulder Beetle', '🪲'], ['Tin Goat', '🐐']], boss: ['Marble Colossus', '🗿'], toys: [['Cat\'s Eye Marble', '👁️'], ['Geode Half', '💎'], ['Summit Flag', '🏔️']] },
  { name: 'Bath Time Lagoon', icon: '🛁', monsters: [['Squirt Fish', '🐟'], ['Soap Slime', '🧼'], ['Bubble Jelly', '🪼'], ['Toy Boat', '🚤']], boss: ['Kraken Ducky', '🐙'], toys: [['Bath Bomb', '🫧'], ['Shell Whistle', '🐚'], ['Captain\'s Wheel', '⚓']] },
  { name: 'Crayon Canyon', icon: '🖍️', monsters: [['Doodle Dog', '🐕'], ['Scribble Snake', '🐍'], ['Paper Plane', '🛩️'], ['Crayon Cactus', '🌵']], boss: ['Scribble Dragon', '🐲'], toys: [['Broken Crayon', '🖍️'], ['Gold Star Sticker', '🌟'], ['Fridge Masterpiece', '🖼️']] },
  { name: 'Wind-up Wasteland', icon: '⚙️', monsters: [['Tin Robot', '🤖'], ['Gear Spider', '🕷️'], ['Clockwork Crow', '🐦‍⬛'], ['Spring Scorpion', '🦂']], boss: ['Clockwork Titan', '🦾'], toys: [['Brass Gear', '⚙️'], ['Wind-up Key', '🗝️'], ['Robot Heart', '🔋']] },
  { name: 'Candy Kingdom', icon: '🍭', monsters: [['Gummy Bear', '🍬'], ['Lollipop Knight', '🍭'], ['Cupcake Golem', '🧁'], ['Jellybean Swarm', '🫘']], boss: ['Chocolate Emperor', '🍫'], toys: [['Candy Ring', '🍩'], ['Sugar Crown', '👑'], ['Everlasting Gobstopper', '🔵']] },
  { name: 'Puzzle Peaks', icon: '🧩', monsters: [['Puzzle Piece', '🧩'], ['Dice Golem', '🎲'], ['Domino Snake', '🁫'], ['Chess Knight', '♟️']], boss: ['Sphinx of Riddles', '🦁'], toys: [['Missing Piece', '🧩'], ['Rubik\'s Cube', '🟥'], ['Trophy Cup', '🏆']] },
  { name: 'Haunted Attic', icon: '🕯️', monsters: [['Dust Bunny', '🐇'], ['Creaky Doll', '🪆'], ['Cobweb Bat', '🦇'], ['Ghost Sheet', '👻']], boss: ['Nightlight Wraith', '💀'], toys: [['Old Photo', '📷'], ['Music Box', '🎵'], ['Grandpa\'s Watch', '⌚']] },
  { name: 'Space Playroom', icon: '🚀', monsters: [['Alien Blob', '👾'], ['Rocket Rat', '🐀'], ['Moon Bot', '🛸'], ['Star Slime', '⭐']], boss: ['Galaxy Overlord', '🪐'], toys: [['Moon Rock', '🌑'], ['Glow Planet', '🌍'], ['Comet Tail', '☄️']] },
  { name: 'Dragon\'s Toy Hoard', icon: '🐉', monsters: [['Gold Gecko', '🦎'], ['Gem Beetle', '💎'], ['Coin Golem', '🪙'], ['Treasure Mimic', '🧰']], boss: ['The Toy Dragon', '🐉'], toys: [['Dragon Scale', '🐲'], ['Hoard Key', '🔐'], ['The Very First Toy', '🎁']] },
];
const KILLS_PER_BOSS = 10;

/* collectables */
const COLLECTABLES = [];
const SETS = [];
ZONES.forEach((z, zi) => {
  const set = { id: 'zone' + zi, name: z.name, icon: z.icon, zone: zi, items: [] };
  const rar = [0, 0, 1, 1];
  z.monsters.forEach((m, i) => set.items.push({ id: `z${zi}m${i}`, name: m[0] + ' Figurine', icon: m[1], rarity: rar[i], set: set.id }));
  set.items.push({ id: `z${zi}b`, name: z.boss[0] + ' Figurine', icon: z.boss[1], rarity: 3, set: set.id });
  z.toys.forEach((t, i) => set.items.push({ id: `z${zi}t${i}`, name: t[0], icon: t[1], rarity: [1, 2, 4][i], set: set.id }));
  SETS.push(set);
  COLLECTABLES.push(...set.items);
});
const MARBLE_SET = { id: 'marbles', name: 'Marble Jar', icon: '🫙', zone: -1, items: [] };
[['Red Swirl', '🔴', 0], ['Blue Swirl', '🔵', 0], ['Green Swirl', '🟢', 0], ['Yellow Swirl', '🟡', 0], ['Purple Swirl', '🟣', 1], ['Orange Swirl', '🟠', 1],
 ['Clearie', '⚪', 1], ['Onyx', '⚫', 2], ['Galaxy Marble', '🌌', 2], ['Steelie', '🔘', 3], ['Rainbow Shooter', '🌈', 4], ['The Moon Marble', '🌕', 5]]
  .forEach((m, i) => MARBLE_SET.items.push({ id: 'mb' + i, name: m[0], icon: m[1], rarity: m[2], set: 'marbles' }));
const STICKER_SET = { id: 'stickers', name: 'Sticker Album', icon: '📒', zone: -1, items: [] };
[['Smiley', '😀', 0], ['Heart', '❤️', 0], ['Star', '⭐', 0], ['Dinosaur', '🦕', 0], ['Unicorn', '🦄', 1], ['Rocket', '🚀', 1],
 ['Rainbow', '🌈', 1], ['Puffy Cloud', '☁️', 2], ['Scratch-n-Sniff Pizza', '🍕', 2], ['Holographic Dragon', '🐉', 3], ['Glitter Crown', '👑', 4], ['Teacher\'s Gold Star', '🌟', 5]]
  .forEach((m, i) => STICKER_SET.items.push({ id: 'st' + i, name: m[0], icon: m[1], rarity: m[2], set: 'stickers' }));
SETS.push(MARBLE_SET, STICKER_SET);
COLLECTABLES.push(...MARBLE_SET.items, ...STICKER_SET.items);
const COLL_BY_ID = Object.fromEntries(COLLECTABLES.map(c => [c.id, c]));
const COLL_WEIGHTS = [50, 28, 14, 6, 1.6, 0.4];

const UPGRADES = [
  { id: 'atk',     icon: '🖍️', name: 'Sharpened Crayons', desc: '+10% attack per level',                         base: 20,  growth: 1.5,  max: 60 },
  { id: 'hp',      icon: '🧵', name: 'Extra Stuffing',     desc: '+10% max HP per level',                         base: 20,  growth: 1.5,  max: 60 },
  { id: 'spd',     icon: '🔋', name: 'Fresh Batteries',    desc: '+5% attack speed per level',                    base: 60,  growth: 1.7,  max: 20 },
  { id: 'crit',    icon: '🎲', name: 'Loaded Dice',        desc: '+2% crit chance per level',                     base: 80,  growth: 1.7,  max: 15 },
  { id: 'luck',    icon: '🍀', name: 'Lucky Clover',       desc: '+5% luck: rarer loot and more drops',           base: 70,  growth: 1.65, max: 30 },
  { id: 'gold',    icon: '🐷', name: 'Piggy Bank',         desc: '+10% gold per level',                           base: 40,  growth: 1.55, max: 60 },
  { id: 'xp',      icon: '📚', name: 'Flash Cards',        desc: '+10% XP per level',                             base: 40,  growth: 1.55, max: 60 },
  { id: 'regen',   icon: '🩹', name: 'Bandage Box',        desc: '+0.5% max HP regenerated per second in battle', base: 100, growth: 1.8,  max: 10 },
  { id: 'bag',     icon: '🧰', name: 'Bigger Toy Box',     desc: '+6 bag slots per level',                        base: 150, growth: 2.0,  max: 10 },
  { id: 'offline', icon: '⏰', name: 'Night Light',        desc: '+2 hours of away-time progress per level',      base: 500, growth: 2.2,  max: 8 },
];
const upgCost = (u, lvl) => Math.round(u.base * Math.pow(u.growth, lvl));

const HEROES = [['🧸', 'Teddy'], ['🤖', 'Robo'], ['🦄', 'Sparkle'], ['🦖', 'Rexy'], ['🧙', 'Wizzo'], ['🥷', 'Shadow'], ['🐙', 'Inky'], ['👾', 'Pixel']];

const ACHIEVEMENTS = [
  { id: 'kill1',     icon: '🥊', name: 'First Bonk',       desc: 'Defeat your first toy',        check: s => s.stats.kills >= 1 },
  { id: 'kill100',   icon: '👊', name: 'Bonk Squad',       desc: 'Defeat 100 toys',              check: s => s.stats.kills >= 100 },
  { id: 'kill1000',  icon: '💥', name: 'Bonk Master',      desc: 'Defeat 1,000 toys',            check: s => s.stats.kills >= 1000 },
  { id: 'kill10000', icon: '🌪️', name: 'Bonk Tornado',     desc: 'Defeat 10,000 toys',           check: s => s.stats.kills >= 10000 },
  { id: 'boss1',     icon: '👑', name: 'Boss Buster',      desc: 'Defeat a boss',                check: s => s.stats.bosses >= 1 },
  { id: 'boss25',    icon: '🏆', name: 'Boss Collector',   desc: 'Defeat 25 bosses',             check: s => s.stats.bosses >= 25 },
  { id: 'boss100',   icon: '🎖️', name: 'Boss Legend',      desc: 'Defeat 100 bosses',            check: s => s.stats.bosses >= 100 },
  { id: 'gold1k',    icon: '🐷', name: 'Piggy Full',       desc: 'Earn 1,000 gold',              check: s => s.stats.goldEarned >= 1e3 },
  { id: 'gold100k',  icon: '💰', name: 'Allowance Day',    desc: 'Earn 100,000 gold',            check: s => s.stats.goldEarned >= 1e5 },
  { id: 'gold10m',   icon: '🏦', name: 'Toy Tycoon',       desc: 'Earn 10 million gold',         check: s => s.stats.goldEarned >= 1e7 },
  { id: 'loot10',    icon: '🎒', name: 'Loot Goblin',      desc: 'Find 10 items',                check: s => s.stats.itemsFound >= 10 },
  { id: 'loot250',   icon: '📦', name: 'Pack Rat',         desc: 'Find 250 items',               check: s => s.stats.itemsFound >= 250 },
  { id: 'loot2500',  icon: '🏚️', name: 'Hoarder',          desc: 'Find 2,500 items',             check: s => s.stats.itemsFound >= 2500 },
  { id: 'legend',    icon: '🌟', name: 'Shiny!',           desc: 'Find a Legendary item',        check: s => s.stats.bestRarity >= 4 },
  { id: 'mythic',    icon: '🌈', name: 'Beyond Shiny',     desc: 'Find a Mythic item',           check: s => s.stats.bestRarity >= 5 },
  { id: 'toys10',    icon: '🧸', name: 'Starter Shelf',    desc: 'Collect 10 different toys',    check: s => Object.keys(s.collection).length >= 10 },
  { id: 'toys50',    icon: '🧰', name: 'Full Shelf',       desc: 'Collect 50 different toys',    check: s => Object.keys(s.collection).length >= 50 },
  { id: 'toys100',   icon: '🏠', name: 'Toy Museum',       desc: 'Collect 100 different toys',   check: s => Object.keys(s.collection).length >= 100 },
  { id: 'toysAll',   icon: '👑', name: 'Completionist',    desc: 'Collect every toy',            check: s => Object.keys(s.collection).length >= COLLECTABLES.length },
  { id: 'set1',      icon: '✅', name: 'Complete Set',     desc: 'Complete a collection set',    check: s => completeSets(s) >= 1 },
  { id: 'set5',      icon: '🗂️', name: 'Set Collector',    desc: 'Complete 5 collection sets',   check: s => completeSets(s) >= 5 },
  { id: 'lvl10',     icon: '🎈', name: 'Big Kid',          desc: 'Reach level 10',               check: s => s.stats.maxLevel >= 10 },
  { id: 'lvl30',     icon: '🎓', name: 'Honor Roll',       desc: 'Reach level 30',               check: s => s.stats.maxLevel >= 30 },
  { id: 'lvl60',     icon: '🧠', name: 'Big Brain',        desc: 'Reach level 60',               check: s => s.stats.maxLevel >= 60 },
  { id: 'zone5',     icon: '🗺️', name: 'Explorer',         desc: 'Unlock the 5th zone',          check: s => s.stats.maxZone >= 5 },
  { id: 'zone9',     icon: '🧭', name: 'Adventurer',       desc: 'Unlock the 9th zone',          check: s => s.stats.maxZone >= 9 },
  { id: 'zoneAll',   icon: '🐉', name: 'Whole Playroom',   desc: 'Unlock every zone',            check: s => s.stats.maxZone >= ZONES.length },
  { id: 'prestige1', icon: '🧹', name: 'Tidy Room',        desc: 'Tidy up once',                 check: s => s.stats.prestiges >= 1 },
  { id: 'prestige5', icon: '✨', name: 'Spotless',         desc: 'Tidy up 5 times',              check: s => s.stats.prestiges >= 5 },
  { id: 'sell100',   icon: '🏷️', name: 'Yard Sale',        desc: 'Sell 100 items',               check: s => s.stats.itemsSold >= 100 },
  { id: 'nap10',     icon: '💤', name: 'Sleepyhead',       desc: 'Take 10 naps',                 check: s => s.stats.deaths >= 10 },
  { id: 'time1h',    icon: '⏰', name: 'Playtime',         desc: 'Play for 1 hour',              check: s => s.stats.playtime >= 3600 },
];

/* ------------------------------ state ------------------------------ */
function defaultState() {
  return {
    v: SAVE_VERSION,
    gold: 0, stars: 0, level: 1, xp: 0,
    heroSkin: 0,
    zone: 0, unlockedZones: 1, zoneKills: 0,
    heroHp: 1, // ratio
    inventory: [], equipment: {},
    upgrades: {},
    collection: {}, newColl: {},
    achievements: {},
    autosell: {}, autoEquip: true,
    opts: { numbers: true, toasts: true },
    stats: { kills: 0, bosses: 0, goldEarned: 0, itemsFound: 0, itemsSold: 0, prestiges: 0, maxLevel: 1, maxZone: 1, playtime: 0, deaths: 0, bestRarity: -1 },
    lastSave: Date.now(),
  };
}
let S = defaultState();
let quiet = false; // suppress toasts during away-time simulation

/* ----------------------------- derived ----------------------------- */
const xpNeeded = (lvl) => Math.floor(20 * Math.pow(lvl, 1.55));
function completeSets(s) {
  let n = 0;
  for (const set of SETS) if (set.items.every(it => s.collection[it.id])) n++;
  return n;
}
function upgLvl(id) { return S.upgrades[id] || 0; }
function bagMax() { return 30 + 6 * upgLvl('bag'); }
function offlineCapHours() { return 8 + 2 * upgLvl('offline'); }

function computeStats() {
  const L = S.level;
  const st = { atk: 6 + L * 1.6, def: L * 0.6, hp: 40 + L * 12, crit: 5, speed: 0, gold: 0, xp: 0, luck: 0 };
  for (const slot of SLOTS) {
    const it = S.equipment[slot];
    if (!it) continue;
    for (const k in it.stats) st[k] += it.stats[k];
  }
  const achCount = Object.keys(S.achievements).length;
  const uniqueToys = Object.keys(S.collection).length;
  const sets = completeSets(S);
  const global = (1 + 0.05 * S.stars) * (1 + 0.01 * achCount) * (1 + 0.04 * sets);
  st.atk = st.atk * (1 + 0.10 * upgLvl('atk')) * global;
  st.hp = st.hp * (1 + 0.10 * upgLvl('hp')) * global;
  st.def = st.def * global;
  st.crit += 2 * upgLvl('crit');
  st.speed = 1 + (st.speed + 5 * upgLvl('spd')) / 100;
  st.gold = (st.gold + 10 * upgLvl('gold') + 0.5 * uniqueToys) * global + (global - 1) * 100;
  st.xp = (st.xp + 10 * upgLvl('xp') + 0.5 * uniqueToys) * global + (global - 1) * 100;
  st.luck += 5 * upgLvl('luck');
  st.regen = 0.005 * upgLvl('regen');
  st.critMult = 2;
  st.global = global;
  return st;
}
let ST = computeStats();

/* ------------------------------- items ----------------------------- */
function rollRarity(luck, minIdx = 0) {
  const pool = RARITIES.map((r, i) => ({ r, i })).filter(x => x.i >= minIdx);
  return weightedPick(pool, x => x.r.w * (1 + (luck / 100) * x.i * 0.6)).i;
}
function itemLevelFor(zoneIdx) { return zoneIdx * 5 + 1 + randInt(0, 4); }
function makeItem(zoneIdx, minRarity = 0) {
  const slot = pick(SLOTS);
  const base = pick(BASES[slot]);
  const rIdx = rollRarity(ST.luck, minRarity);
  const R = RARITIES[rIdx];
  const ilvl = itemLevelFor(zoneIdx);
  const v = () => rand(0.85, 1.15) * R.mult;
  const stats = {};
  const add = (k, val) => { stats[k] = (stats[k] || 0) + val; };
  switch (slot) {
    case 'weapon':   add('atk', (3 + ilvl * 1.2) * v()); break;
    case 'hat':      add('def', (1 + ilvl * 0.5) * v()); add('hp', (5 + ilvl * 1.5) * v()); break;
    case 'outfit':   add('hp', (10 + ilvl * 4) * v()); break;
    case 'shoes':    add('def', (1 + ilvl * 0.4) * v()); add('speed', (2 + ilvl * 0.15) * v() / R.mult * Math.sqrt(R.mult)); break;
    case 'charm':    add('luck', (3 + ilvl * 0.3) * v()); add('gold', (3 + ilvl * 0.3) * v()); break;
    case 'sidekick': add('atk', (1 + ilvl * 0.45) * v()); add('xp', (3 + ilvl * 0.3) * v()); break;
  }
  const affixPool = ['atk', 'def', 'hp', 'crit', 'speed', 'gold', 'xp', 'luck'];
  for (let i = 0; i < R.affixes; i++) {
    const k = affixPool.splice(Math.floor(Math.random() * affixPool.length), 1)[0];
    const m = R.mult * 0.7 * rand(0.85, 1.15);
    const val = { atk: 1 + ilvl * 0.3, def: 0.5 + ilvl * 0.25, hp: 4 + ilvl * 1.5, crit: 2 + ilvl * 0.08, speed: 1 + ilvl * 0.08, gold: 2 + ilvl * 0.2, xp: 2 + ilvl * 0.2, luck: 2 + ilvl * 0.2 }[k];
    add(k, val * (PCT_STATS.has(k) ? Math.sqrt(m) : m));
  }
  for (const k in stats) stats[k] = PCT_STATS.has(k) ? Math.round(stats[k] * 10) / 10 : Math.round(stats[k]);
  let name = pick(R.prefixes) + ' ' + base[0];
  if (rIdx >= 2) name += ' ' + pick(SUFFIXES);
  return { id: nextId(), slot, name, icon: base[1], rarity: rIdx, ilvl, stats, sell: Math.round((2 + ilvl * 1.5) * R.sell) };
}
function itemScore(it) {
  if (!it) return 0;
  let s = 0;
  for (const k in it.stats) s += it.stats[k] * STAT_WEIGHT[k];
  return s;
}

/* ------------------------------ monsters --------------------------- */
let M = null;           // current monster
let spawnDelay = 0;
let heroAtkTimer = 0, monAtkTimer = 0;
let napTimer = 0;

function zoneMonsterStats(zi, k, boss) {
  const hp = 25 * Math.pow(1.75, zi) * (1 + k * 0.06);
  const atk = 3 * Math.pow(1.55, zi) * (1 + k * 0.03);
  const gold = 4 * Math.pow(1.7, zi);
  const xp = 6 * Math.pow(1.6, zi);
  return boss
    ? { hp: hp * 7, atk: atk * 1.8, gold: gold * 6, xp: xp * 5, interval: 1.6 }
    : { hp, atk, gold, xp, interval: 1.4 };
}
function spawnMonster() {
  const zi = S.zone, z = ZONES[zi];
  const boss = S.zoneKills >= KILLS_PER_BOSS;
  const def = boss ? z.boss : z.monsters[randInt(0, z.monsters.length - 1)];
  const base = zoneMonsterStats(zi, boss ? KILLS_PER_BOSS : S.zoneKills, boss);
  M = { name: def[0], icon: def[1], boss, hp: base.hp, maxHp: base.hp, atk: base.atk, gold: base.gold, xp: base.xp, interval: base.interval, mIdx: z.monsters.indexOf(def) };
  monAtkTimer = -0.6; // small grace period
  const sp = $('monster-sprite');
  sp.className = 'sprite' + (boss ? ' boss' : '');
  sp.textContent = M.icon;
  $('monster-name').textContent = (boss ? '👑 BOSS: ' : '') + M.name;
  ui.zoneDirty = true;
}

/* ------------------------------- combat ---------------------------- */
function heroMaxHp() { return Math.max(1, Math.round(ST.hp)); }

function tick(dt) {
  S.stats.playtime += dt;
  if (napTimer > 0) {
    napTimer -= dt;
    $('nap-timer').textContent = Math.ceil(napTimer) + 's';
    if (napTimer <= 0) {
      $('nap-overlay').classList.add('hidden');
      S.heroHp = 1;
      spawnMonster();
    }
    return;
  }
  if (!M) {
    spawnDelay -= dt;
    if (spawnDelay <= 0) spawnMonster();
    return;
  }
  const maxHp = heroMaxHp();
  // regen
  if (ST.regen > 0 && S.heroHp < 1) S.heroHp = Math.min(1, S.heroHp + ST.regen * dt);
  // hero attacks
  heroAtkTimer += dt * ST.speed;
  let guard = 0;
  while (heroAtkTimer >= 1 && M && guard++ < 20) {
    heroAtkTimer -= 1;
    const crit = Math.random() * 100 < ST.crit;
    const dmg = Math.max(1, Math.round(ST.atk * rand(0.9, 1.1) * (crit ? ST.critMult : 1)));
    M.hp -= dmg;
    fxDamage('monster', dmg, crit ? 'crit' : '');
    flash('hero-sprite', 'lunge'); flash('monster-sprite', 'hit');
    if (M.hp <= 0) { onKill(); }
  }
  if (!M) return;
  // monster attacks
  monAtkTimer += dt;
  if (monAtkTimer >= M.interval) {
    monAtkTimer -= M.interval;
    const raw = M.atk * rand(0.85, 1.15);
    const dmg = Math.max(1, Math.round(raw * 100 / (100 + ST.def)));
    S.heroHp -= dmg / maxHp;
    fxDamage('hero', dmg, 'hurt');
    flash('hero-sprite', 'hit');
    if (S.heroHp <= 0) onHeroDown();
  }
}

function onHeroDown() {
  S.heroHp = 0;
  S.stats.deaths++;
  napTimer = 6;
  $('nap-overlay').classList.remove('hidden');
  log(`💤 <span class="bad">${esc(M.name)} knocked ${esc(heroName())} over!</span> Nap time… boss progress in this zone resets.`, 'bad');
  S.zoneKills = 0;
  M = null;
  ui.zoneDirty = true;
}

function onKill() {
  const m = M;
  M = null;
  spawnDelay = 0.3;
  const sp = $('monster-sprite'); flash(sp.id, 'dead');
  S.stats.kills++;
  if (m.boss) S.stats.bosses++;
  // gold
  const gold = Math.max(1, Math.round(m.gold * rand(0.8, 1.2) * (1 + ST.gold / 100)));
  S.gold += gold; S.stats.goldEarned += gold;
  fxCoins(Math.min(6, 1 + Math.floor(Math.log10(gold))));
  // xp
  addXp(Math.round(m.xp * (1 + ST.xp / 100)));
  // heal
  S.heroHp = Math.min(1, S.heroHp + 0.10);
  // loot
  const zi = S.zone;
  const dropBoost = 1 + ST.luck / 200;
  if (m.boss) {
    for (let i = 0; i < 2; i++) receiveItem(makeItem(zi, 1));
    if (Math.random() < 0.65 * dropBoost) receiveCollectable(rollCollectable(zi, true));
    if (Math.random() < 0.10 * dropBoost) receiveCollectable(rollGlobalCollectable());
  } else {
    if (Math.random() < 0.33 * dropBoost) receiveItem(makeItem(zi));
    if (Math.random() < 0.12 * dropBoost) receiveCollectable(rollCollectable(zi, false));
    if (Math.random() < 0.035 * dropBoost) receiveCollectable(rollGlobalCollectable());
  }
  // zone progress
  if (m.boss) {
    S.zoneKills = 0;
    if (S.unlockedZones === zi + 1 && zi + 1 < ZONES.length) {
      S.unlockedZones++;
      S.stats.maxZone = Math.max(S.stats.maxZone, S.unlockedZones);
      const nz = ZONES[zi + 1];
      log(`🗺️ <span class="good">New zone unlocked: ${nz.icon} ${esc(nz.name)}!</span> Use ▶ to travel there.`);
      toast('🗺️', `New zone: ${nz.name}!`, 'Click ▶ on the play mat to travel', 'rc-legendary', true);
    } else {
      log(`👑 <span class="good">${esc(m.name)} defeated!</span>`);
    }
  } else {
    S.zoneKills++;
  }
  ui.zoneDirty = true;
  checkAchievements();
}

function addXp(amount) {
  S.xp += amount;
  let leveled = false;
  while (S.xp >= xpNeeded(S.level)) {
    S.xp -= xpNeeded(S.level);
    S.level++;
    leveled = true;
  }
  if (leveled) {
    S.stats.maxLevel = Math.max(S.stats.maxLevel, S.level);
    ST = computeStats();
    S.heroHp = 1;
    fxDamage('hero', 'LEVEL UP!', 'heal');
    log(`🎉 <span class="good">Level up! ${esc(heroName())} is now level ${S.level}.</span>`);
    toast('🎉', `Level ${S.level}!`, 'Stats increased, HP restored', 'rc-uncommon');
    ui.heroDirty = true;
  }
}

/* ------------------------------- loot ------------------------------ */
function receiveItem(it) {
  S.stats.itemsFound++;
  if (it.rarity > S.stats.bestRarity) S.stats.bestRarity = it.rarity;
  const R = RARITIES[it.rarity];
  const cls = 'r-' + R.id;
  if (it.rarity >= 3) toast(it.icon, it.name, `${R.name} ${SLOT_LABEL[it.slot]} · Lv ${it.ilvl}`, 'rc-' + R.id, it.rarity >= 4);
  // auto-equip
  if (S.autoEquip && itemScore(it) > itemScore(S.equipment[it.slot])) {
    const old = S.equipment[it.slot];
    S.equipment[it.slot] = it;
    ST = computeStats();
    ui.heroDirty = true;
    log(`🧷 Equipped <span class="${cls}">${esc(it.name)}</span>${old ? ` (replacing ${esc(old.name)})` : ''}.`);
    if (old) stashItem(old, true);
    return;
  }
  log(`🎁 Found <span class="${cls}">${esc(it.name)}</span> (${R.name} ${SLOT_LABEL[it.slot]}, Lv ${it.ilvl}).`);
  stashItem(it, false);
}
function stashItem(it, silent) {
  const R = RARITIES[it.rarity];
  if (S.autosell[R.id]) { sellItem(it, false, true); return; }
  if (S.inventory.length >= bagMax()) {
    S.gold += it.sell; S.stats.goldEarned += it.sell; S.stats.itemsSold++;
    log(`🧰 Bag full! Sold <span class="r-${R.id}">${esc(it.name)}</span> for 🪙${fmt(it.sell)}.`);
    return;
  }
  S.inventory.push(it);
  ui.bagDirty = true;
}
function sellItem(it, fromBag, auto) {
  if (fromBag) {
    const i = S.inventory.findIndex(x => x.id === it.id);
    if (i < 0) return;
    S.inventory.splice(i, 1);
  }
  S.gold += it.sell; S.stats.goldEarned += it.sell; S.stats.itemsSold++;
  if (!auto) log(`🏷️ Sold <span class="r-${RARITIES[it.rarity].id}">${esc(it.name)}</span> for 🪙${fmt(it.sell)}.`);
  ui.bagDirty = true;
}
function equipFromBag(it) {
  const i = S.inventory.findIndex(x => x.id === it.id);
  if (i < 0) return;
  S.inventory.splice(i, 1);
  const old = S.equipment[it.slot];
  S.equipment[it.slot] = it;
  if (old) S.inventory.push(old);
  ST = computeStats();
  S.heroHp = Math.min(1, S.heroHp);
  log(`🧷 Equipped <span class="r-${RARITIES[it.rarity].id}">${esc(it.name)}</span>.`);
  ui.bagDirty = ui.heroDirty = true;
}
function unequip(slot) {
  const it = S.equipment[slot];
  if (!it) return;
  if (S.inventory.length >= bagMax()) { toast('🧰', 'Bag is full!', 'Sell something first', 'rc-common'); return; }
  delete S.equipment[slot];
  S.inventory.push(it);
  ST = computeStats();
  ui.bagDirty = ui.heroDirty = true;
}
function sellEquipped(slot) {
  const it = S.equipment[slot];
  if (!it) return;
  delete S.equipment[slot];
  sellItem(it, false, false);
  ST = computeStats();
  ui.heroDirty = true;
}

/* ---------------------------- collectables ------------------------- */
function rollCollectable(zi, boss) {
  const set = SETS[zi];
  return weightedPick(set.items, c => COLL_WEIGHTS[c.rarity] * (boss ? (c.rarity >= 3 ? 6 : 1) : 1) * (1 + ST.luck / 100 * c.rarity * 0.3));
}
function rollGlobalCollectable() {
  const items = [...MARBLE_SET.items, ...STICKER_SET.items];
  return weightedPick(items, c => COLL_WEIGHTS[c.rarity] * (1 + ST.luck / 100 * c.rarity * 0.3));
}
function receiveCollectable(c) {
  const R = RARITIES[c.rarity];
  const isNew = !S.collection[c.id];
  S.collection[c.id] = (S.collection[c.id] || 0) + 1;
  if (isNew) {
    S.newColl[c.id] = 1;
    log(`🧸 <span class="r-${R.id}">NEW toy: ${esc(c.name)}</span> added to your Toy Box!`);
    toast(c.icon, `New toy: ${c.name}`, `${R.name} · ${SETS.find(s => s.id === c.set).name}`, 'rc-' + R.id, c.rarity >= 3);
    const set = SETS.find(s => s.id === c.set);
    if (set.items.every(it => S.collection[it.id])) {
      log(`🏆 <span class="good">Set complete: ${esc(set.name)}! +4% attack and HP.</span>`);
      toast('🏆', `Set complete: ${set.name}!`, '+4% attack & HP forever', 'rc-legendary', true);
    }
    ST = computeStats();
  } else {
    log(`🧸 Found another <span class="r-${R.id}">${esc(c.name)}</span> (×${S.collection[c.id]}).`);
  }
  ui.collDirty = true;
  ui.heroDirty = true;
}

/* ------------------------------ upgrades --------------------------- */
function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  const lvl = upgLvl(id);
  if (lvl >= u.max) return;
  const cost = upgCost(u, lvl);
  if (S.gold < cost) return;
  S.gold -= cost;
  S.upgrades[id] = lvl + 1;
  ST = computeStats();
  log(`🔧 Bought ${u.icon} ${esc(u.name)} level ${lvl + 1}.`);
  ui.upgDirty = ui.heroDirty = ui.bagDirty = true;
}

/* ------------------------------ prestige --------------------------- */
function prestigeGain() {
  const cleared = S.unlockedZones - 1; // bosses beaten this run
  return Math.floor(cleared * (cleared + 1) / 2) + Math.floor(S.level / 10);
}
function doPrestige() {
  const gain = prestigeGain();
  if (gain <= 0) return;
  if (!confirm(`Tidy up now and earn ${gain} ⭐ Gold Stars?\n\nYou will lose: level, gold, bag, equipment, upgrades and zone progress.\nYou keep: Toy Box collection, achievements, stars.`)) return;
  const keep = { stars: S.stars + gain, collection: S.collection, newColl: S.newColl, achievements: S.achievements, autosell: S.autosell, autoEquip: S.autoEquip, opts: S.opts, stats: S.stats, heroSkin: S.heroSkin };
  S = Object.assign(defaultState(), keep);
  S.stats.prestiges++;
  ST = computeStats();
  M = null; napTimer = 0; spawnDelay = 0.3;
  $('nap-overlay').classList.add('hidden');
  log(`🧹 <span class="good">Tidied up! Earned ${gain} ⭐. Everything is +${S.stars * 5}% stronger now.</span>`);
  toast('⭐', `+${gain} Gold Stars!`, `Total ${S.stars} · +${S.stars * 5}% to everything`, 'rc-mythic', true);
  ui.all();
  checkAchievements();
  save();
}

/* ---------------------------- achievements ------------------------- */
function checkAchievements() {
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (S.achievements[a.id]) continue;
    if (a.check(S)) {
      S.achievements[a.id] = Date.now();
      changed = true;
      log(`🏅 <span class="good">Achievement: ${a.icon} ${esc(a.name)}</span> — ${esc(a.desc)}. +1% to everything!`);
      toast(a.icon, `Achievement: ${a.name}`, a.desc + ' · +1% everything', 'rc-epic', true);
    }
  }
  if (changed) { ST = computeStats(); ui.achDirty = ui.heroDirty = true; }
}

/* -------------------------- offline progress ----------------------- */
function simulateAway(seconds) {
  const cap = offlineCapHours() * 3600;
  const t = Math.min(seconds, cap);
  if (t < 30) return null;
  const zi = S.zone;
  const avg = zoneMonsterStats(zi, 5, false);
  const dps = ST.atk * ST.speed * (1 + (ST.crit / 100) * (ST.critMult - 1));
  const timePerKill = avg.hp / Math.max(1, dps) + 0.5;
  // sustainability: damage taken per kill vs heal per kill
  const dmgTaken = (avg.atk * 100 / (100 + ST.def)) * (timePerKill / 1.4);
  const healed = heroMaxHp() * (0.10 + ST.regen * timePerKill);
  const efficiency = dmgTaken > healed ? 0.15 : 0.5; // away-time runs at half speed
  const kills = Math.floor((t / timePerKill) * efficiency);
  if (kills <= 0) return { t, kills: 0, gold: 0, xp: 0, items: [], toys: [] };
  const gold = Math.round(kills * avg.gold * (1 + ST.gold / 100));
  const xp = Math.round(kills * avg.xp * (1 + ST.xp / 100));
  S.gold += gold; S.stats.goldEarned += gold;
  S.stats.kills += kills;
  const lvlBefore = S.level;
  addXp(xp);
  const items = [], toys = [];
  quiet = true;
  const nItems = Math.min(25, Math.floor(kills * 0.33 * (1 + ST.luck / 200)));
  for (let i = 0; i < nItems; i++) { const it = makeItem(zi); items.push(it); receiveItem(it); }
  const nToys = Math.min(12, Math.floor(kills * 0.12 * (1 + ST.luck / 200)));
  for (let i = 0; i < nToys; i++) { const c = rollCollectable(zi, false); toys.push(c); receiveCollectable(c); }
  quiet = false;
  checkAchievements();
  ui.all();
  return { t, kills, gold, xp, items, toys, levels: S.level - lvlBefore, efficiency };
}
function showAwayModal(r) {
  if (!r || r.kills <= 0) return;
  const best = r.items.reduce((b, it) => (!b || it.rarity > b.rarity ? it : b), null);
  const newToys = r.toys.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
  showModal(`
    <div class="levelup-burst">⏰</div>
    <h2>Welcome back!</h2>
    <p>While you were away for <b>${timeStr(r.t)}</b>, ${esc(heroName())} kept playing in <b>${ZONES[S.zone].icon} ${esc(ZONES[S.zone].name)}</b>${r.efficiency < 0.5 ? ' (and took a lot of naps)' : ''}.</p>
    <ul>
      <li>👊 Defeated <b>${fmt(r.kills)}</b> toys</li>
      <li>🪙 Earned <b>${fmt(r.gold)}</b> gold</li>
      <li>📚 Gained <b>${fmt(r.xp)}</b> XP${r.levels ? ` (<b>+${r.levels}</b> levels!)` : ''}</li>
      <li>🎁 Found <b>${r.items.length}</b> items${best ? ` — best: <span style="color:var(--r-${RARITIES[best.rarity].id});font-weight:700">${esc(best.name)}</span>` : ''}</li>
      <li>🧸 Found <b>${r.toys.length}</b> collectables${newToys.length ? ` (${newToys.map(c => c.icon).join(' ')})` : ''}</li>
    </ul>
    <p class="hint">Away-time progress is capped at ${offlineCapHours()} hours. Buy Night Lights at the Workbench to extend it.</p>`);
}

/* ------------------------------- saving ---------------------------- */
function save() {
  S.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    $('last-saved').textContent = new Date(S.lastSave).toLocaleTimeString();
  } catch (e) { console.warn('Save failed', e); }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    applyLoaded(data);
    return true;
  } catch (e) { console.warn('Load failed', e); return false; }
}
function applyLoaded(data) {
  const d = defaultState();
  S = Object.assign(d, data);
  S.stats = Object.assign(d.stats, data.stats || {});
  S.opts = Object.assign(d.opts, data.opts || {});
  S.upgrades = data.upgrades || {}; S.collection = data.collection || {}; S.newColl = data.newColl || {};
  S.achievements = data.achievements || {}; S.autosell = data.autosell || {}; S.equipment = data.equipment || {};
  S.inventory = Array.isArray(data.inventory) ? data.inventory : [];
  S.zone = clamp(S.zone | 0, 0, ZONES.length - 1);
  S.unlockedZones = clamp(S.unlockedZones | 0, 1, ZONES.length);
  if (!(S.heroHp > 0)) S.heroHp = 1;
  S.v = SAVE_VERSION;
  ST = computeStats();
}
function exportSave() {
  save();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  const ta = $('save-io'); ta.value = code; ta.select();
  try { navigator.clipboard.writeText(code); toast('📋', 'Save code copied!', 'Paste it somewhere safe', 'rc-rare'); } catch (e) { toast('📋', 'Save code shown below', 'Copy it manually', 'rc-rare'); }
}
function importSave() {
  const code = $('save-io').value.trim();
  if (!code) { toast('⚠️', 'Paste a save code first', '', 'rc-common'); return; }
  try {
    const json = decodeURIComponent(escape(atob(code)));
    const data = JSON.parse(json);
    if (typeof data !== 'object' || !('gold' in data)) throw new Error('bad');
    if (!confirm('Load this save? Your current progress will be replaced.')) return;
    applyLoaded(data);
    M = null; napTimer = 0; spawnDelay = 0.2;
    $('nap-overlay').classList.add('hidden');
    ui.all(); save();
    toast('💾', 'Save loaded!', '', 'rc-uncommon');
  } catch (e) { toast('⚠️', 'That save code is not valid', '', 'rc-common'); }
}
function hardReset() {
  if (!confirm('Delete ALL progress, including your Toy Box collection and stars? This cannot be undone.')) return;
  if (!confirm('Really really sure?')) return;
  localStorage.removeItem(SAVE_KEY);
  S = defaultState(); ST = computeStats();
  M = null; napTimer = 0; spawnDelay = 0.2;
  $('nap-overlay').classList.add('hidden');
  $('log').innerHTML = '';
  ui.all(); save();
  log('🧸 A brand new toy box! Welcome to Toy Box Quest.');
}

/* -------------------------------- FX ------------------------------- */
function heroName() { return HEROES[S.heroSkin][1]; }
function flash(id, cls) {
  const el = $(id);
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 320);
}
function spritePos(which) {
  const arena = $('arena').getBoundingClientRect();
  const sp = $(which === 'hero' ? 'hero-sprite' : 'monster-sprite').getBoundingClientRect();
  return { x: sp.left - arena.left + sp.width / 2, y: sp.top - arena.top };
}
function fxDamage(target, text, cls) {
  if (!S.opts.numbers) return;
  const layer = $('fx-layer');
  if (layer.childElementCount > 40) return;
  const p = spritePos(target);
  const el = document.createElement('div');
  el.className = 'dmg ' + cls;
  el.textContent = typeof text === 'number' ? fmt(text) : text;
  el.style.left = (p.x + rand(-30, 30)) + 'px';
  el.style.top = (p.y - 10) + 'px';
  el.style.transform = 'translateX(-50%)';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
function fxCoins(n) {
  if (!S.opts.numbers) return;
  const layer = $('fx-layer');
  const p = spritePos('monster');
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'coin'; el.textContent = '🪙';
    el.style.left = p.x + 'px'; el.style.top = (p.y + 30) + 'px';
    el.style.setProperty('--dx', rand(-60, 60) + 'px');
    el.style.animationDelay = (i * 0.05) + 's';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
function toast(icon, text, sub, cls, big) {
  if (!S.opts.toasts || quiet) return;
  const box = $('toasts');
  if (box.childElementCount > 5) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + (cls || '') + (big ? ' big' : '');
  el.innerHTML = `<span class="t-ico">${icon}</span><span>${esc(text)}${sub ? `<span class="t-sub">${esc(sub)}</span>` : ''}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3700);
}
function log(html) {
  const box = $('log');
  const el = document.createElement('div');
  el.innerHTML = html;
  box.prepend(el);
  while (box.childElementCount > 60) box.lastElementChild.remove();
}
function showModal(html) {
  $('modal-content').innerHTML = html;
  $('modal').classList.remove('hidden');
}

/* -------------------------------- UI ------------------------------- */
const ui = {
  heroDirty: true, bagDirty: true, collDirty: true, upgDirty: true, achDirty: true, zoneDirty: true,
  all() { this.heroDirty = this.bagDirty = this.collDirty = this.upgDirty = this.achDirty = this.zoneDirty = true; renderStatic(); },
};
let activeTab = 'hero';

function renderStatic() {
  $('hero-sprite').textContent = HEROES[S.heroSkin][0];
  $('hero-portrait').textContent = HEROES[S.heroSkin][0];
  $('hero-name').textContent = heroName();
  $('hero-title-name').textContent = heroName();
  $('auto-equip').checked = S.autoEquip;
  $('opt-numbers').checked = S.opts.numbers;
  $('opt-toasts').checked = S.opts.toasts;
  document.querySelectorAll('[data-autosell]').forEach(cb => { cb.checked = !!S.autosell[cb.dataset.autosell]; });
  $('res-toys-max').textContent = COLLECTABLES.length;
  const hp = $('hero-pick'); hp.innerHTML = '';
  HEROES.forEach((h, i) => {
    const b = document.createElement('button');
    b.textContent = h[0]; b.title = h[1]; b.className = i === S.heroSkin ? 'active' : '';
    b.onclick = () => { S.heroSkin = i; renderStatic(); ui.heroDirty = true; };
    hp.appendChild(b);
  });
}

function renderFrame() {
  // resources
  $('res-gold').textContent = fmt(S.gold);
  $('res-stars').textContent = S.stars;
  $('res-level').textContent = S.level;
  $('res-toys').textContent = Object.keys(S.collection).length;
  // hp bars
  const maxHp = heroMaxHp();
  $('hero-hp-fill').style.width = (clamp(S.heroHp, 0, 1) * 100) + '%';
  $('hero-hp-text').textContent = `${fmt(Math.max(0, S.heroHp * maxHp))} / ${fmt(maxHp)}`;
  if (M) {
    $('monster-hp-fill').style.width = (clamp(M.hp / M.maxHp, 0, 1) * 100) + '%';
    $('monster-hp-text').textContent = `${fmt(Math.max(0, M.hp))} / ${fmt(M.maxHp)}`;
  }
  // xp
  const need = xpNeeded(S.level);
  $('xp-fill').style.width = (S.xp / need * 100) + '%';
  $('xp-label').textContent = `XP ${fmt(S.xp)} / ${fmt(need)}`;
  // quick stats
  $('qs-atk').textContent = fmt(ST.atk);
  $('qs-def').textContent = fmt(ST.def);
  $('qs-spd').textContent = ST.speed.toFixed(2) + '/s';
  $('qs-crit').textContent = pct(ST.crit);
  $('qs-luck').textContent = '+' + pct(ST.luck);
  $('qs-gold').textContent = '+' + pct(ST.gold);
  $('hero-title-lvl').textContent = S.level;
  $('bag-count').textContent = S.inventory.length;
  $('prestige-gain').textContent = prestigeGain();

  if (ui.zoneDirty) { renderZone(); ui.zoneDirty = false; }
  if (ui.heroDirty && activeTab === 'hero') { renderHero(); ui.heroDirty = false; }
  if (ui.bagDirty && activeTab === 'bag') { renderBag(); ui.bagDirty = false; }
  if (ui.collDirty && activeTab === 'toybox') { renderCollection(); ui.collDirty = false; }
  if (activeTab === 'workbench') { renderUpgrades(); ui.upgDirty = false; }
  if (ui.achDirty && activeTab === 'stars') { renderAchievements(); ui.achDirty = false; }
  if (activeTab === 'settings') renderLifetime();
}

function renderZone() {
  const z = ZONES[S.zone];
  $('zone-icon').textContent = z.icon;
  $('zone-title').textContent = `${z.name} (${S.zone + 1}/${ZONES.length})`;
  $('zone-prev').disabled = S.zone === 0;
  $('zone-next').disabled = S.zone + 1 >= S.unlockedZones;
  $('zone-next').title = S.zone + 1 >= S.unlockedZones ? (S.zone + 1 < ZONES.length ? 'Beat this zone\'s boss to unlock the next zone' : 'This is the last zone') : 'Next zone';
  const boss = S.zoneKills >= KILLS_PER_BOSS;
  $('zp-fill').style.width = (Math.min(S.zoneKills, KILLS_PER_BOSS) / KILLS_PER_BOSS * 100) + '%';
  $('zp-label').textContent = boss ? '👑 BOSS FIGHT!' : `Boss in ${KILLS_PER_BOSS - S.zoneKills}`;
}

function statLines(it, compareTo) {
  const keys = Object.keys(STAT_LABEL);
  let html = '';
  for (const k of keys) {
    const a = it.stats[k] || 0, b = compareTo ? (compareTo.stats[k] || 0) : 0;
    if (!a && !b) continue;
    const d = a - b;
    const dHtml = compareTo && Math.abs(d) >= 0.05 ? `<span class="delta ${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${PCT_STATS.has(k) ? pct(d) : fmt(d)}</span>` : '';
    html += `<div class="tt-stat"><span>${STAT_LABEL[k]}</span><span><b>${PCT_STATS.has(k) ? '+' + pct(a) : fmt(a)}</b> ${dHtml}</span></div>`;
  }
  return html;
}
function itemTooltipHtml(it, compareTo, actions) {
  const R = RARITIES[it.rarity];
  const cmp = compareTo && compareTo.id !== it.id ? compareTo : null;
  return `<h4>${it.icon} ${esc(it.name)}</h4>
    <div class="tt-sub">${R.name} ${SLOT_LABEL[it.slot]} · Item level ${it.ilvl} · Sells for 🪙${fmt(it.sell)}</div>
    ${statLines(it, cmp)}
    ${cmp ? `<div class="tt-sub" style="margin-top:6px">Power ${fmt(itemScore(it))} vs equipped ${fmt(itemScore(cmp))}</div>` : `<div class="tt-sub" style="margin-top:6px">Power ${fmt(itemScore(it))}</div>`}
    ${actions || ''}`;
}

function renderHero() {
  const g = $('equip-grid'); g.innerHTML = '';
  for (const slot of SLOTS) {
    const it = S.equipment[slot];
    const d = document.createElement('div');
    d.className = 'slot' + (it ? ` filled rc-${RARITIES[it.rarity].id} r-${RARITIES[it.rarity].id}` : '');
    d.innerHTML = it
      ? `<div class="s-ico">${it.icon}</div><div class="s-name">${esc(it.name)}</div><div class="s-slot">${SLOT_LABEL[slot]} · Lv ${it.ilvl}</div>`
      : `<div class="s-ico" style="opacity:.3">${{ weapon: '🗡️', hat: '🎩', outfit: '👕', shoes: '👟', charm: '🔮', sidekick: '🤖' }[slot]}</div><div class="s-slot">${SLOT_LABEL[slot]}</div><div class="s-name" style="color:#aaa">empty</div>`;
    if (it) {
      d.onmouseenter = (e) => showTooltip(e, itemTooltipHtml(it, null), RARITIES[it.rarity].id);
      d.onmousemove = moveTooltip;
      d.onmouseleave = hideTooltip;
      d.onclick = (e) => {
        e.stopPropagation();
        showTooltip(e, itemTooltipHtml(it, null, `<div class="tt-actions"><button class="btn small" data-act="unequip">Unequip</button><button class="btn small yellow" data-act="sell">Sell 🪙${fmt(it.sell)}</button></div>`), RARITIES[it.rarity].id, true);
        $('tooltip').querySelector('[data-act="unequip"]').onclick = () => { unequip(slot); hideTooltip(); };
        $('tooltip').querySelector('[data-act="sell"]').onclick = () => { sellEquipped(slot); hideTooltip(); };
      };
    }
    g.appendChild(d);
  }
  const sets = completeSets(S), ach = Object.keys(S.achievements).length, toys = Object.keys(S.collection).length;
  $('stat-sheet').innerHTML = `
    <div><span>⚔️ Attack</span><b>${fmt(ST.atk)}</b></div>
    <div><span>❤️ Max HP</span><b>${fmt(ST.hp)}</b></div>
    <div><span>🛡️ Defense</span><b>${fmt(ST.def)} (${pct(100 - 10000 / (100 + ST.def))} less dmg)</b></div>
    <div><span>⚡ Attack speed</span><b>${ST.speed.toFixed(2)}/s</b></div>
    <div><span>🎯 Crit chance</span><b>${pct(ST.crit)} (×2 dmg)</b></div>
    <div><span>🍀 Luck</span><b>+${pct(ST.luck)}</b></div>
    <div><span>🪙 Gold find</span><b>+${pct(ST.gold)}</b></div>
    <div><span>📚 XP gain</span><b>+${pct(ST.xp)}</b></div>
    <div><span>🩹 Regen</span><b>${pct(ST.regen * 100)}/s</b></div>
    <div><span>🌟 Global bonus</span><b>×${ST.global.toFixed(2)}</b></div>
    <div><span>⭐ Stars</span><b>${S.stars} (+${S.stars * 5}%)</b></div>
    <div><span>🏅 Achievements</span><b>${ach} (+${ach}%)</b></div>
    <div><span>🧸 Toys found</span><b>${toys} (+${(toys * 0.5).toFixed(1)}% gold/xp)</b></div>
    <div><span>🏆 Sets complete</span><b>${sets} (+${sets * 4}% atk/hp)</b></div>`;
}

function renderBag() {
  $('bag-used').textContent = S.inventory.length;
  $('bag-max').textContent = bagMax();
  const g = $('inv-grid'); g.innerHTML = '';
  const sorted = [...S.inventory].sort((a, b) => b.rarity - a.rarity || itemScore(b) - itemScore(a));
  for (const it of sorted) {
    const R = RARITIES[it.rarity];
    const d = document.createElement('div');
    d.className = `item rc-${R.id} r-${R.id}`;
    const eq = S.equipment[it.slot];
    const better = itemScore(it) > itemScore(eq);
    d.innerHTML = `${it.icon}<span class="lv">${it.ilvl}</span><span class="up ${better ? '' : 'down'}">${better ? '▲' : '▼'}</span>`;
    d.onmouseenter = (e) => showTooltip(e, itemTooltipHtml(it, eq), R.id);
    d.onmousemove = moveTooltip;
    d.onmouseleave = hideTooltip;
    d.onclick = (e) => {
      e.stopPropagation();
      showTooltip(e, itemTooltipHtml(it, eq, `<div class="tt-actions"><button class="btn small green" data-act="equip">Equip</button><button class="btn small yellow" data-act="sell">Sell 🪙${fmt(it.sell)}</button></div>`), R.id, true);
      $('tooltip').querySelector('[data-act="equip"]').onclick = () => { equipFromBag(it); hideTooltip(); };
      $('tooltip').querySelector('[data-act="sell"]').onclick = () => { sellItem(it, true, false); hideTooltip(); };
    };
    g.appendChild(d);
  }
  const empty = bagMax() - S.inventory.length;
  for (let i = 0; i < Math.min(empty, 12); i++) { const d = document.createElement('div'); d.className = 'item empty'; g.appendChild(d); }
}

function renderCollection() {
  const owned = Object.keys(S.collection).length;
  const sets = completeSets(S);
  $('collection-summary').innerHTML = `🧸 ${owned} / ${COLLECTABLES.length} toys collected · 🏆 ${sets} / ${SETS.length} sets complete<br><small class="hint">Each toy: +0.5% gold &amp; XP. Each complete set: +4% attack &amp; HP. Toys drop from monsters in their zone; marbles and stickers can drop anywhere.</small>`;
  const box = $('collection'); box.innerHTML = '';
  for (const set of SETS) {
    const have = set.items.filter(it => S.collection[it.id]).length;
    const done = have === set.items.length;
    const wrap = document.createElement('div'); wrap.className = 'coll-set';
    wrap.innerHTML = `<div class="coll-set-head"><span>${set.icon} ${esc(set.name)} <small>${have}/${set.items.length}</small></span><span class="bonus ${done ? 'on' : ''}">${done ? '✅ Set bonus active' : (set.zone >= 0 && set.zone >= S.unlockedZones ? '🔒 Zone locked' : 'Complete for +4% atk/hp')}</span></div>`;
    const shelf = document.createElement('div'); shelf.className = 'shelf';
    for (const c of set.items) {
      const R = RARITIES[c.rarity];
      const n = S.collection[c.id] || 0;
      const t = document.createElement('div');
      t.className = `toy rc-${R.id} ${n ? '' : 'locked'} ${S.newColl[c.id] ? 'new' : ''}`;
      t.innerHTML = `<span class="ico">${c.icon}</span>${n > 1 ? `<span class="cnt">×${n}</span>` : ''}`;
      t.onmouseenter = (e) => showTooltip(e, `<h4>${n ? c.icon : '❓'} ${n ? esc(c.name) : '???'}</h4><div class="tt-sub">${R.name} collectable · ${esc(set.name)}${n ? ` · found ×${n}` : ''}</div>${n ? '' : `<div class="tt-flavor">${set.zone >= 0 ? 'Drops from toys in ' + esc(set.name) : 'Can drop anywhere'}</div>`}`, R.id);
      t.onmousemove = moveTooltip; t.onmouseleave = hideTooltip;
      shelf.appendChild(t);
    }
    wrap.appendChild(shelf); box.appendChild(wrap);
  }
  S.newColl = {};
}

function renderUpgrades() {
  const box = $('upgrades');
  if (ui.upgDirty || box.childElementCount === 0) {
    box.innerHTML = '';
    for (const u of UPGRADES) {
      const d = document.createElement('div'); d.className = 'upg'; d.dataset.id = u.id;
      d.innerHTML = `<div class="u-ico">${u.icon}</div><div><div class="u-name">${esc(u.name)} <span class="u-lvl"></span></div><div class="u-desc">${esc(u.desc)}</div></div><button class="btn green"></button>`;
      d.querySelector('button').onclick = () => buyUpgrade(u.id);
      box.appendChild(d);
    }
  }
  for (const d of box.children) {
    const u = UPGRADES.find(x => x.id === d.dataset.id);
    const lvl = upgLvl(u.id), maxed = lvl >= u.max, cost = upgCost(u, lvl);
    d.querySelector('.u-lvl').textContent = `Lv ${lvl}/${u.max}`;
    const b = d.querySelector('button');
    b.textContent = maxed ? 'MAX' : `🪙 ${fmt(cost)}`;
    b.disabled = maxed || S.gold < cost;
  }
}

function renderAchievements() {
  const have = Object.keys(S.achievements).length;
  $('ach-count').textContent = `${have}/${ACHIEVEMENTS.length} · each gives +1% to everything`;
  const box = $('achievements'); box.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'ach-grid';
  for (const a of ACHIEVEMENTS) {
    const got = !!S.achievements[a.id];
    const d = document.createElement('div'); d.className = 'ach' + (got ? '' : ' locked');
    d.innerHTML = `<div class="a-ico">${a.icon}</div><div><div class="a-name">${esc(a.name)}</div><div>${esc(a.desc)}</div></div>`;
    grid.appendChild(d);
  }
  box.appendChild(grid);
}

function renderLifetime() {
  const s = S.stats;
  $('lifetime-stats').textContent = `Lifetime: ${fmt(s.kills)} toys bonked · ${fmt(s.bosses)} bosses · ${fmt(s.goldEarned)} gold earned · ${fmt(s.itemsFound)} items found · ${fmt(s.itemsSold)} sold · ${s.deaths} naps · ${s.prestiges} tidy-ups · ${timeStr(s.playtime)} played`;
}

/* tooltip */
let ttPinned = false;
function showTooltip(e, html, rarityId, pinned) {
  const tt = $('tooltip');
  if (ttPinned && !pinned) return;
  ttPinned = !!pinned;
  tt.className = `tooltip rc-${rarityId || 'common'}` + (pinned ? ' interactive' : '');
  tt.innerHTML = html;
  positionTooltip(e.clientX, e.clientY);
}
function moveTooltip(e) { if (!ttPinned) positionTooltip(e.clientX, e.clientY); }
function positionTooltip(x, y) {
  const tt = $('tooltip');
  const w = tt.offsetWidth || 260, h = tt.offsetHeight || 150;
  let left = x + 16, top = y + 16;
  if (left + w > window.innerWidth - 8) left = x - w - 16;
  if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
  tt.style.left = Math.max(8, left) + 'px'; tt.style.top = top + 'px';
}
function hideTooltip(force) {
  if (ttPinned && force !== true) return;
  ttPinned = false;
  $('tooltip').className = 'tooltip hidden';
}

/* ------------------------------- wiring ---------------------------- */
function bind() {
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    activeTab = t.dataset.tab;
    document.querySelectorAll('.tab-body').forEach(b => b.classList.add('hidden'));
    $('tab-' + activeTab).classList.remove('hidden');
    ui.heroDirty = ui.bagDirty = ui.collDirty = ui.upgDirty = ui.achDirty = true;
    hideTooltip(true);
    renderFrame();
  });
  $('zone-prev').onclick = () => changeZone(-1);
  $('zone-next').onclick = () => changeZone(1);
  $('auto-equip').onchange = (e) => { S.autoEquip = e.target.checked; };
  $('opt-numbers').onchange = (e) => { S.opts.numbers = e.target.checked; };
  $('opt-toasts').onchange = (e) => { S.opts.toasts = e.target.checked; };
  document.querySelectorAll('[data-autosell]').forEach(cb => cb.onchange = (e) => {
    S.autosell[cb.dataset.autosell] = e.target.checked;
    if (e.target.checked) {
      const r = RARITIES.findIndex(x => x.id === cb.dataset.autosell);
      const toSell = S.inventory.filter(it => it.rarity === r);
      toSell.forEach(it => sellItem(it, true, true));
      if (toSell.length) log(`🏷️ Auto-sold ${toSell.length} ${RARITIES[r].name} items.`);
    }
  });
  $('sell-all-junk').onclick = () => {
    const toSell = S.inventory.filter(it => it.rarity === 0);
    let g = 0; toSell.forEach(it => { g += it.sell; sellItem(it, true, true); });
    if (toSell.length) log(`🏷️ Sold ${toSell.length} Common items for 🪙${fmt(g)}.`);
  };
  $('sell-all').onclick = () => {
    if (!S.inventory.length) return;
    if (S.inventory.some(it => it.rarity >= 3) && !confirm('Your bag contains Epic or better items. Sell everything anyway?')) return;
    let g = 0; const n = S.inventory.length;
    [...S.inventory].forEach(it => { g += it.sell; sellItem(it, true, true); });
    log(`🏷️ Sold ${n} items for 🪙${fmt(g)}.`);
  };
  $('prestige-btn').onclick = doPrestige;
  $('save-now').onclick = () => { save(); toast('💾', 'Saved!', '', 'rc-uncommon'); };
  $('export-save').onclick = exportSave;
  $('import-save').onclick = importSave;
  $('hard-reset').onclick = hardReset;
  $('modal-close').onclick = () => $('modal').classList.add('hidden');
  document.addEventListener('click', (e) => { if (!$('tooltip').contains(e.target)) hideTooltip(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideTooltip(true); $('modal').classList.add('hidden'); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('beforeunload', save);
  window.addEventListener('pagehide', save);
}
function changeZone(dir) {
  const nz = S.zone + dir;
  if (nz < 0 || nz >= S.unlockedZones) return;
  S.zone = nz; S.zoneKills = 0;
  M = null; spawnDelay = 0.2;
  heroAtkTimer = 0;
  log(`🗺️ Traveled to ${ZONES[nz].icon} ${esc(ZONES[nz].name)}.`);
  ui.zoneDirty = true;
}

/* ------------------------------- main loop ------------------------- */
let lastTick = Date.now();
let saveTimer = 0;
function loop() {
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt > 30) {
    // came back from a long pause (tab throttled / device asleep)
    const r = simulateAway(dt);
    showAwayModal(r);
    dt = 0.1;
  }
  dt = Math.min(dt, 1);
  tick(dt);
  saveTimer += dt;
  if (saveTimer >= 5) { saveTimer = 0; save(); }
  renderFrame();
}

function init() {
  bind();
  const loaded = load();
  renderStatic();
  if (loaded) {
    const away = (Date.now() - (S.lastSave || Date.now())) / 1000;
    log(`👋 Welcome back, ${esc(heroName())}!`);
    const r = simulateAway(away);
    showAwayModal(r);
  } else {
    log('🧸 Welcome to <b>Toy Box Quest</b>! Your hero fights automatically. Collect loot, fill your Toy Box, and tidy up for Gold Stars.');
    log('💡 Tip: hover over items to compare them. Click an item to equip or sell it.');
  }
  ST = computeStats();
  ui.all();
  spawnDelay = 0.3;
  lastTick = Date.now();
  setInterval(loop, 100);
  save();
}

init();
})();
