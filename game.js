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
  { name: 'Sandbox Desert', icon: '🏖️', monsters: [['Sandcastle Golem', '🏰'], ['Beach Ball Bully', '🏐'], ['Sand Worm', '🪱'], ['Crabby Patty', '🦀']], boss: ['Dune Camel King', '🐪'], toys: [['Plastic Shovel', '⛏️'], ['Message in a Bottle', '🍾'], ['Golden Sand Dollar', '🌕']] },
  { name: 'Frosty Freezer', icon: '❄️', monsters: [['Snow Cone Slime', '🍧'], ['Penguin Plush', '🐧'], ['Ice Cube Golem', '🧊'], ['Polar Bear Cub', '🐻‍❄️']], boss: ['The Abominable Snowtoy', '⛄'], toys: [['Snowflake Charm', '❄️'], ['Mitten Puppet', '🧤'], ['Never-melting Popsicle', '🍦']] },
  { name: 'Jungle Gym', icon: '🐒', monsters: [['Swinging Monkey', '🐒'], ['Toucan Toy', '🦜'], ['Vine Snake', '🐍'], ['Jungle Frog', '🐸']], boss: ['King Kong-a-Lot', '🦍'], toys: [['Banana Squeaker', '🍌'], ['Explorer Hat', '🎩'], ['Golden Idol', '🗿']] },
  { name: 'Circus Big Top', icon: '🎪', monsters: [['Clown Puppet', '🤡'], ['Juggling Seal', '🦭'], ['Dancing Elephant', '🐘'], ['Tightrope Tiger', '🐯']], boss: ['The Ringmaster', '🎩'], toys: [['Popcorn Box', '🍿'], ['Tiny Unicycle', '🚲'], ['Human Cannonball', '⚫']] },
  { name: 'Dino Dig Site', icon: '🦴', monsters: [['Bone Digger', '🦴'], ['Raptor Figurine', '🦖'], ['Pterodactyl Kite', '🦅'], ['Fossil Turtle', '🐢']], boss: ['Mega Rex', '🦕'], toys: [['Dino Egg', '🥚'], ['Amber Stone', '🟠'], ['T-Rex Skull', '💀']] },
  { name: 'Pirate Bathtub Bay', icon: '🏴‍☠️', monsters: [['Parrot Puppet', '🦜'], ['Cannon Crab', '🦀'], ['Ghost Sailor', '👻'], ['Rubber Shark', '🦈']], boss: ['Captain Squeakbeard', '🧔'], toys: [['Treasure Map', '🗺️'], ['Eye Patch', '🕶️'], ['Golden Doubloon', '🪙']] },
  { name: 'Robot Factory', icon: '🏭', monsters: [['Assembly Arm', '🦾'], ['Battery Bug', '🔋'], ['Scrap Drone', '🛸'], ['Laser Cat', '😼']], boss: ['Mega Mech', '🤖'], toys: [['Blueprint', '📐'], ['Toy Chip', '💾'], ['Golden Circuit', '⚡']] },
  { name: 'Rainbow Cloud Kingdom', icon: '🌈', monsters: [['Cloud Sheep', '🐑'], ['Sun Sprite', '☀️'], ['Star Fairy', '🧚'], ['Thunder Puff', '⛈️']], boss: ['The Rainbow Unicorn', '🦄'], toys: [['Pot of Gold', '🍯'], ['Cloud Pillow', '☁️'], ['The Last Toy in the Box', '🎁']] },
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
  { id: 'petslot', icon: '🧺', name: 'Pet Basket',         desc: 'Bring a second pet into battle',                base: 2500, growth: 1,   max: 1 },
  { id: 'treats',  icon: '🍪', name: 'Treat Jar',          desc: '+15% pet damage per level',                     base: 300, growth: 1.7,  max: 20 },
];
const upgCost = (u, lvl) => Math.round(u.base * Math.pow(u.growth, lvl));

const PETS = [
  { id: 'puppy',   name: 'Puppy Plush',     icon: '🐶', rarity: 0, dmg: 0.35, interval: 1.4, passive: { gold: 6 },            desc: 'Digs up extra gold' },
  { id: 'kitten',  name: 'Yarn Kitten',     icon: '🐱', rarity: 0, dmg: 0.30, interval: 1.2, passive: { crit: 4 },            desc: 'Pounces for critical hits' },
  { id: 'hamster', name: 'Wheel Hamster',   icon: '🐹', rarity: 0, dmg: 0.16, interval: 0.6, passive: { speed: 4 },           desc: 'Zooms around at top speed' },
  { id: 'turtle',  name: 'Shell Turtle',    icon: '🐢', rarity: 0, dmg: 0.25, interval: 2.0, passive: {}, special: 'shield',  desc: 'Blocks 12% of damage the hero takes' },
  { id: 'bunny',   name: 'Hop Bunny',       icon: '🐰', rarity: 1, dmg: 0.30, interval: 1.3, passive: { xp: 8 },              desc: 'Learns fast and shares XP' },
  { id: 'fox',     name: 'Clever Fox',      icon: '🦊', rarity: 1, dmg: 0.35, interval: 1.4, passive: { luck: 8 },            desc: 'Sniffs out rarer loot' },
  { id: 'bee',     name: 'Buzzy Bee',       icon: '🐝', rarity: 1, dmg: 0.13, interval: 0.45, passive: {},                    desc: 'Stings again and again and again' },
  { id: 'frog',    name: 'Lily Frog',       icon: '🐸', rarity: 1, dmg: 0.25, interval: 1.6, passive: {}, special: 'heal',    desc: 'Heals the hero 3% HP with every hop' },
  { id: 'owl',     name: 'Night Owl',       icon: '🦉', rarity: 2, dmg: 0.40, interval: 1.8, passive: { xp: 15 },             desc: 'Wise: a big XP boost' },
  { id: 'penguin', name: 'Slide Penguin',   icon: '🐧', rarity: 2, dmg: 0.35, interval: 1.5, passive: {}, special: 'chill',   desc: 'Chills enemies so they attack 15% slower' },
  { id: 'robot',   name: 'Mini Mech',       icon: '🤖', rarity: 2, dmg: 0.55, interval: 1.5, passive: {},                     desc: 'Reliable laser pew-pews' },
  { id: 'octopus', name: 'Ink Octopus',     icon: '🐙', rarity: 2, dmg: 0.20, interval: 0.55, passive: { gold: 5, luck: 5 },  desc: 'Eight arms, eight bonks' },
  { id: 'ghost',   name: 'Boo Buddy',       icon: '👻', rarity: 3, dmg: 0.50, interval: 1.4, passive: {}, special: 'lifesteal', desc: 'Heals the hero for 30% of its damage' },
  { id: 'dragon',  name: 'Baby Dragon',     icon: '🐲', rarity: 3, dmg: 1.20, interval: 2.4, passive: { crit: 5 },            desc: 'Slow but scorching' },
  { id: 'unicorn', name: 'Sparkle Unicorn', icon: '🦄', rarity: 4, dmg: 0.60, interval: 1.3, passive: { luck: 15, gold: 10 }, special: 'heal', desc: 'Lucky, shiny, and healing' },
  { id: 'phoenix', name: 'Ember Phoenix',   icon: '🔥', rarity: 4, dmg: 0.90, interval: 1.5, passive: { xp: 15 }, special: 'quicknap', desc: 'Naps last half as long' },
  { id: 'golden',  name: 'Golden Dragon',   icon: '🐉', rarity: 5, dmg: 1.60, interval: 1.8, passive: { gold: 25, luck: 15, crit: 8 }, desc: 'The ultimate toy companion' },
];
const PET_BY_ID = Object.fromEntries(PETS.map(p => [p.id, p]));
const PET_RARITY_MULT = [1, 1.2, 1.45, 1.8, 2.3, 3];
const SPECIAL_LABEL = { shield: '🛡️ Shield', heal: '💚 Healer', chill: '🧊 Chill', lifesteal: '🩸 Lifesteal', quicknap: '⏱️ Quick nap' };
const petXpNeeded = (lvl) => Math.floor(30 * Math.pow(lvl, 1.5));

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
  { id: 'zone13',    icon: '🏖️', name: 'Trailblazer',      desc: 'Unlock the 13th zone',         check: s => s.stats.maxZone >= 13 },
  { id: 'zone17',    icon: '🦴', name: 'World Traveler',   desc: 'Unlock the 17th zone',         check: s => s.stats.maxZone >= 17 },
  { id: 'zoneAll',   icon: '🌈', name: 'Whole Playroom',   desc: 'Unlock every zone',            check: s => s.stats.maxZone >= ZONES.length },
  { id: 'daily3',    icon: '🎁', name: 'Regular Visitor',  desc: 'Claim 3 daily gifts',          check: s => s.daily.total >= 3 },
  { id: 'daily7',    icon: '📅', name: 'Week of Play',     desc: 'Reach a 7-day login streak',   check: s => s.daily.bestStreak >= 7 },
  { id: 'daily30',   icon: '🗓️', name: 'Toy Box Regular',  desc: 'Claim 30 daily gifts',         check: s => s.daily.total >= 30 },
  { id: 'prestige1', icon: '🧹', name: 'Tidy Room',        desc: 'Tidy up once',                 check: s => s.stats.prestiges >= 1 },
  { id: 'prestige5', icon: '✨', name: 'Spotless',         desc: 'Tidy up 5 times',              check: s => s.stats.prestiges >= 5 },
  { id: 'sell100',   icon: '🏷️', name: 'Yard Sale',        desc: 'Sell 100 items',               check: s => s.stats.itemsSold >= 100 },
  { id: 'craft1',    icon: '🔨', name: 'Little Tinkerer',  desc: 'Combine items at the crafting table', check: s => s.stats.itemsCrafted >= 1 },
  { id: 'craft50',   icon: '🛠️', name: 'Master Tinkerer',  desc: 'Craft 50 items',               check: s => s.stats.itemsCrafted >= 50 },
  { id: 'craftMyth', icon: '💎', name: 'Handmade Legend',  desc: 'Craft a Mythic item',          check: s => s.stats.bestCrafted >= 5 },
  { id: 'nap10',     icon: '💤', name: 'Sleepyhead',       desc: 'Take 10 naps',                 check: s => s.stats.deaths >= 10 },
  { id: 'time1h',    icon: '⏰', name: 'Playtime',         desc: 'Play for 1 hour',              check: s => s.stats.playtime >= 3600 },
  { id: 'pet1',      icon: '🥚', name: 'It Hatched!',      desc: 'Hatch your first pet',         check: s => Object.keys(s.pets).length >= 1 },
  { id: 'pet8',      icon: '🐾', name: 'Pet Parade',       desc: 'Own 8 different pets',         check: s => Object.keys(s.pets).length >= 8 },
  { id: 'petAll',    icon: '🐉', name: 'Zookeeper',        desc: 'Own every pet',                check: s => Object.keys(s.pets).length >= PETS.length },
  { id: 'petLvl10',  icon: '🎓', name: 'Good Boy',         desc: 'Raise a pet to level 10',      check: s => Object.values(s.pets).some(p => p.lvl >= 10) },
  { id: 'eggs25',    icon: '🍳', name: 'Egg-cellent',      desc: 'Hatch 25 eggs',                check: s => s.stats.eggsHatched >= 25 },
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
    opts: { numbers: true, toasts: true, sound: { sfx: 0.6, music: 0.35, muted: false } },
    stats: { kills: 0, bosses: 0, goldEarned: 0, itemsFound: 0, itemsSold: 0, prestiges: 0, maxLevel: 1, maxZone: 1, playtime: 0, deaths: 0, bestRarity: -1, eggsHatched: 0, petDamage: 0, itemsCrafted: 0, bestCrafted: -1 },
    daily: { last: '', streak: 0, total: 0, bestStreak: 0 },
    pets: {}, activePets: [], eggs: 0, flags: {},
    lastSave: Date.now(),
  };
}
let S = defaultState();
let quiet = false; // suppress toasts during away-time simulation
const snd = (name, arg) => { if (!quiet && window.ToyAudio) window.ToyAudio.sfx(name, arg); };
function syncAudio() { if (window.ToyAudio) { window.ToyAudio.setOptions(S.opts.sound); window.ToyAudio.setZone(S.zone); } }

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
  for (const pid of S.activePets) {
    const P = PET_BY_ID[pid], pd = S.pets[pid];
    if (!P || !pd) continue;
    const lm = 1 + 0.05 * (pd.lvl - 1);
    for (const k in P.passive) st[k] += P.passive[k] * lm;
  }
  const achCount = Object.keys(S.achievements).length;
  const uniqueToys = Object.keys(S.collection).length;
  const sets = completeSets(S);
  const global = (1 + 0.05 * S.stars) * (1 + 0.01 * achCount) * (1 + 0.04 * sets);
  st.atk = st.atk * (1 + 0.10 * upgLvl('atk')) * global;
  st.hp = st.hp * (1 + 0.10 * upgLvl('hp')) * global;
  st.crit += 2 * upgLvl('crit');
  st.speed = 1 + (st.speed + 5 * upgLvl('spd')) / 100;
  st.gold = (st.gold + 10 * upgLvl('gold') + 0.5 * uniqueToys) * global + (global - 1) * 100;
  st.xp = (st.xp + 10 * upgLvl('xp') + 0.5 * uniqueToys) * global + (global - 1) * 100;
  st.luck += 5 * upgLvl('luck');
  st.regen = 0.005 * upgLvl('regen');
  st.petMult = 1 + 0.15 * upgLvl('treats');
  st.critMult = 2;
  st.global = global;
  return st;
}
let ST = computeStats();

/* -------------------------------- pets ----------------------------- */
function maxActivePets() { return 1 + upgLvl('petslot'); }
function activePetList() { return S.activePets.map(id => PET_BY_ID[id]).filter(Boolean); }
function hasSpecial(sp) { return S.activePets.some(id => PET_BY_ID[id] && PET_BY_ID[id].special === sp); }
function petDamage(P) {
  const pd = S.pets[P.id];
  return ST.atk * P.dmg * PET_RARITY_MULT[P.rarity] * (1 + 0.06 * ((pd ? pd.lvl : 1) - 1)) * ST.petMult;
}
function petInterval(P) { return P.interval / (1 + (ST.speed - 1) * 0.5); }
function petDps(P) { return petDamage(P) / petInterval(P) * (1 + (ST.crit / 100) * (ST.critMult - 1)); }
function totalPetDps() { return activePetList().reduce((a, P) => a + petDps(P), 0); }
const petTimers = {};
function rollPet() { return weightedPick(PETS, p => COLL_WEIGHTS[p.rarity] * (1 + ST.luck / 100 * p.rarity * 0.3)); }
function gainEgg(n, why) {
  S.eggs += n;
  log(`🥚 <span class="good">Found ${n > 1 ? n + ' Pet Eggs' : 'a Pet Egg'}!</span> ${why || ''} Hatch it in the 🐾 Pets tab.`);
  toast('🥚', n > 1 ? `${n} Pet Eggs!` : 'A Pet Egg!', 'Hatch it in the Pets tab', 'rc-rare', true);
  snd('pickup');
  ui.petsDirty = true;
}
function hatchEgg() {
  if (S.eggs <= 0) { snd('deny'); return null; }
  S.eggs--; S.stats.eggsHatched++;
  const P = rollPet();
  const R = RARITIES[P.rarity];
  let result;
  if (!S.pets[P.id]) {
    S.pets[P.id] = { lvl: 1, xp: 0 };
    if (S.activePets.length < maxActivePets()) S.activePets.push(P.id);
    result = { P, isNew: true };
    log(`🐾 <span class="r-${R.id}">NEW pet: ${P.icon} ${esc(P.name)}</span> hatched! ${esc(P.desc)}.`);
    toast(P.icon, `New pet: ${P.name}!`, `${R.name} · ${P.desc}`, 'rc-' + R.id, true);
  } else {
    const gained = petXpNeeded(S.pets[P.id].lvl);
    result = { P, isNew: false, xpGained: gained };
    addPetXp(P.id, gained, true);
    log(`🐾 Another <span class="r-${R.id}">${esc(P.name)}</span> hatched — your ${esc(P.name)} gained ${fmt(gained)} XP.`);
  }
  snd('hatch');
  ST = computeStats();
  checkAchievements();
  ui.petsDirty = ui.heroDirty = true;
  return result;
}
function addPetXp(id, amount, fromDup) {
  const pd = S.pets[id]; if (!pd) return;
  pd.xp += amount;
  let ups = 0;
  while (pd.xp >= petXpNeeded(pd.lvl) && pd.lvl < 100) { pd.xp -= petXpNeeded(pd.lvl); pd.lvl++; ups++; }
  if (ups) {
    const P = PET_BY_ID[id];
    log(`🐾 <span class="good">${P.icon} ${esc(P.name)} grew to level ${pd.lvl}!</span>`);
    if (!fromDup) toast(P.icon, `${P.name} is level ${pd.lvl}!`, 'Pet damage and bonuses increased', 'rc-uncommon');
    snd('petLevel');
    ST = computeStats();
    ui.petsDirty = ui.heroDirty = true;
    checkAchievements();
  }
}
function togglePet(id) {
  const i = S.activePets.indexOf(id);
  if (i >= 0) S.activePets.splice(i, 1);
  else {
    if (!S.pets[id]) return;
    if (S.activePets.length >= maxActivePets()) { snd('deny'); toast('🧺', 'No room!', 'Rest a pet first, or buy a Pet Basket', 'rc-common'); return; }
    S.activePets.push(id);
  }
  snd('click');
  ST = computeStats();
  ui.petsDirty = ui.heroDirty = true;
  renderPetSprites();
}
function petsTick(dt) {
  if (!M) return;
  const maxHp = heroMaxHp();
  for (const P of activePetList()) {
    petTimers[P.id] = (petTimers[P.id] || 0) + dt;
    const iv = petInterval(P);
    let guard = 0;
    while (petTimers[P.id] >= iv && M && guard++ < 10) {
      petTimers[P.id] -= iv;
      const crit = Math.random() * 100 < ST.crit;
      const dmg = Math.max(1, Math.round(petDamage(P) * rand(0.9, 1.1) * (crit ? ST.critMult : 1)));
      M.hp -= dmg;
      S.stats.petDamage += dmg;
      fxDamage('pet-' + P.id, dmg, crit ? 'crit pet' : 'pet');
      flash('pet-' + P.id, 'lunge'); flash('monster-sprite', 'hit');
      snd('petHit');
      if (P.special === 'heal' && S.heroHp < 1) { S.heroHp = Math.min(1, S.heroHp + 0.03); fxDamage('hero', '+' + fmt(maxHp * 0.03), 'heal'); }
      if (P.special === 'lifesteal' && S.heroHp < 1) { S.heroHp = Math.min(1, S.heroHp + (dmg * 0.3) / maxHp); }
      if (M.hp <= 0) onKill();
    }
  }
}
function renderPetSprites() {
  const row = $('pet-row'); row.innerHTML = '';
  for (const P of activePetList()) {
    const d = document.createElement('div');
    d.className = 'pet-sprite'; d.id = 'pet-' + P.id; d.textContent = P.icon; d.title = `${P.name} (Lv ${S.pets[P.id].lvl})`;
    row.appendChild(d);
  }
}

/* ------------------------------- items ----------------------------- */
function rollRarity(luck, minIdx = 0) {
  const pool = RARITIES.map((r, i) => ({ r, i })).filter(x => x.i >= minIdx);
  return weightedPick(pool, x => x.r.w * (1 + (luck / 100) * x.i * 0.6)).i;
}
function itemLevelFor(zoneIdx) { return zoneIdx * 5 + 1 + randInt(0, 4); }
function makeItem(zoneIdx, minRarity = 0, fixed = {}) {
  // `fixed` lets crafting pin the slot, rarity, item level and base toy
  const slot = fixed.slot || pick(SLOTS);
  const base = fixed.base || pick(BASES[slot]);
  const rIdx = fixed.rarity != null ? fixed.rarity : rollRarity(ST.luck, minRarity);
  const R = RARITIES[rIdx];
  const ilvl = fixed.ilvl || itemLevelFor(zoneIdx);
  const zm = Math.pow(1.08, zoneIdx); // deep zones drop meaningfully stronger gear
  const v = () => rand(0.85, 1.15) * R.mult * zm;
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
    const m = R.mult * 0.7 * rand(0.85, 1.15) * zm;
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
  if (window.ToyAudio) window.ToyAudio.setBoss(boss);
  if (boss) snd('boss');
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
    snd(crit ? 'crit' : 'hit');
    flash('hero-sprite', 'lunge'); flash('monster-sprite', 'hit');
    if (M.hp <= 0) { onKill(); }
  }
  if (!M) return;
  petsTick(dt);
  if (!M) return;
  // monster attacks
  monAtkTimer += dt;
  const mInterval = M.interval * (hasSpecial('chill') ? 1.15 : 1);
  if (monAtkTimer >= mInterval) {
    monAtkTimer -= mInterval;
    const raw = M.atk * rand(0.85, 1.15) * (hasSpecial('shield') ? 0.88 : 1);
    const dmg = Math.max(1, Math.round(raw * 100 / (100 + ST.def)));
    S.heroHp -= dmg / maxHp;
    fxDamage('hero', dmg, 'hurt');
    snd('hurt');
    flash('hero-sprite', 'hit');
    if (S.heroHp <= 0) onHeroDown();
  }
}

function onHeroDown() {
  S.heroHp = 0;
  S.stats.deaths++;
  napTimer = hasSpecial('quicknap') ? 3 : 6;
  snd('nap');
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
  snd('kill'); snd('coin');
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
    if (Math.random() < 0.25 * dropBoost) gainEgg(1, `${esc(m.name)} was guarding it.`);
  } else {
    if (Math.random() < 0.33 * dropBoost) receiveItem(makeItem(zi));
    if (Math.random() < 0.12 * dropBoost) receiveCollectable(rollCollectable(zi, false));
    if (Math.random() < 0.035 * dropBoost) receiveCollectable(rollGlobalCollectable());
    if (Math.random() < 0.012 * dropBoost) gainEgg(1);
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
  for (const id of S.activePets) addPetXp(id, Math.max(1, Math.round(amount * 0.3)));
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
    snd('levelup');
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
  snd(it.rarity >= 1 ? 'loot' : 'pickup', it.rarity);
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
  if (!auto) snd('sell');
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
  snd('equip');
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

/* ------------------------------ crafting --------------------------- */
const CRAFT_NEED = 3;
const plural = (label) => label.endsWith('s') ? label : label + 's';
// Gold cost to craft an item of a given rarity: free up to Uncommon, then a
// multiple of the result's sell value so it keeps pace with deeper zones.
const CRAFT_COST_MULT = [0, 0, 2, 3, 5, 8];
function craftCost(targetRarity, ilvl) {
  return Math.round((2 + ilvl * 1.5) * RARITIES[targetRarity].sell * CRAFT_COST_MULT[targetRarity]);
}
function craftGroupCost(g) { return craftCost(g.rarity + 1, Math.max(...g.use.map(it => it.ilvl))); }
// Groups the bag by slot + rarity; every group with 3+ items is a recipe.
// `use` is the three weakest items (the best ones are kept).
function craftGroups() {
  const groups = {};
  for (const it of S.inventory) {
    if (it.rarity >= RARITIES.length - 1) continue;
    const key = it.rarity + ':' + it.slot;
    (groups[key] = groups[key] || []).push(it);
  }
  const out = [];
  for (const key in groups) {
    const items = groups[key].sort((a, b) => itemScore(a) - itemScore(b));
    if (items.length < CRAFT_NEED) continue;
    const [rarity, slot] = key.split(':');
    out.push({ slot, rarity: +rarity, items, use: items.slice(0, CRAFT_NEED) });
  }
  return out.sort((a, b) => b.rarity - a.rarity || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}
function sameBaseOf(items) {
  return items.every(it => it.icon === items[0].icon) ? BASES[items[0].slot].find(b => b[1] === items[0].icon) || null : null;
}
function craftItems(use, silent) {
  if (use.length < CRAFT_NEED || use[0].rarity >= RARITIES.length - 1) return null;
  if (use.some(it => !S.inventory.some(x => x.id === it.id))) return null;
  const slot = use[0].slot, rarity = use[0].rarity + 1;
  const ilvl = Math.max(...use.map(it => it.ilvl));
  const cost = craftCost(rarity, ilvl);
  if (S.gold < cost) {
    if (!silent) toast('🪙', 'Not enough gold!', `Crafting this costs 🪙${fmt(cost)}`, 'rc-common');
    return null;
  }
  S.gold -= cost;
  for (const it of use) S.inventory.splice(S.inventory.findIndex(x => x.id === it.id), 1);
  const base = sameBaseOf(use);
  const it = makeItem(Math.floor((ilvl - 1) / 5), 0, { slot, rarity, ilvl, base });
  const R = RARITIES[rarity];
  S.stats.itemsCrafted++;
  if (rarity > S.stats.bestCrafted) S.stats.bestCrafted = rarity;
  if (rarity > S.stats.bestRarity) S.stats.bestRarity = rarity;
  log(`🔨 Combined ${CRAFT_NEED} ${RARITIES[rarity - 1].name} ${plural(SLOT_LABEL[slot])} into <span class="r-${R.id}">${esc(it.name)}</span>${base ? ' (matching set!)' : ''}${cost ? ` for 🪙${fmt(cost)}` : ''}.`);
  if (S.autoEquip && itemScore(it) > itemScore(S.equipment[slot])) {
    const old = S.equipment[slot];
    S.equipment[slot] = it;
    ST = computeStats();
    ui.heroDirty = true;
    log(`🧷 Equipped <span class="r-${R.id}">${esc(it.name)}</span>${old ? ` (replacing ${esc(old.name)})` : ''}.`);
    if (old) stashItem(old, true);
  } else {
    S.inventory.push(it); // bag has room: three went in, one comes out
  }
  if (!silent) {
    snd('craft', rarity);
    toast(it.icon, it.name, `Crafted ${R.name} ${SLOT_LABEL[slot]} · Lv ${it.ilvl}`, 'rc-' + R.id, rarity >= 4);
  }
  ui.bagDirty = true;
  checkAchievements();
  return it;
}
function craftAll() {
  let n = 0, best = null, spent = 0;
  for (let guard = 0; guard < 500; guard++) {
    const g = craftGroups().find(x => S.gold >= craftGroupCost(x));
    if (!g) break;
    const cost = craftGroupCost(g);
    const it = craftItems(g.use, true);
    if (!it) break;
    n++; spent += cost;
    if (!best || it.rarity > best.rarity || (it.rarity === best.rarity && itemScore(it) > itemScore(best))) best = it;
  }
  if (!n) { toast('🪙', 'Nothing you can afford to combine', '', 'rc-common'); return; }
  snd('craft', best.rarity);
  toast('🔨', `Combined ${n} time${n > 1 ? 's' : ''}!`, `Best: ${best.name}${spent ? ` · spent 🪙${fmt(spent)}` : ''}`, 'rc-' + RARITIES[best.rarity].id, best.rarity >= 4);
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
    snd('newToy');
    log(`🧸 <span class="r-${R.id}">NEW toy: ${esc(c.name)}</span> added to your Toy Box!`);
    toast(c.icon, `New toy: ${c.name}`, `${R.name} · ${SETS.find(s => s.id === c.set).name}`, 'rc-' + R.id, c.rarity >= 3);
    const set = SETS.find(s => s.id === c.set);
    if (set.items.every(it => S.collection[it.id])) {
      log(`🏆 <span class="good">Set complete: ${esc(set.name)}! +4% attack and HP.</span>`);
      toast('🏆', `Set complete: ${set.name}!`, '+4% attack & HP forever', 'rc-legendary', true);
      snd('setComplete');
    }
    ST = computeStats();
  } else {
    snd('toy');
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
  if (S.gold < cost) { snd('deny'); return; }
  S.gold -= cost;
  snd('buy');
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
  const keep = { stars: S.stars + gain, collection: S.collection, newColl: S.newColl, achievements: S.achievements, autosell: S.autosell, autoEquip: S.autoEquip, opts: S.opts, stats: S.stats, heroSkin: S.heroSkin, pets: S.pets, activePets: S.activePets, eggs: S.eggs, flags: S.flags };
  S = Object.assign(defaultState(), keep);
  S.stats.prestiges++;
  ST = computeStats();
  M = null; napTimer = 0; spawnDelay = 0.3;
  $('nap-overlay').classList.add('hidden');
  log(`🧹 <span class="good">Tidied up! Earned ${gain} ⭐. Everything is +${S.stars * 5}% stronger now.</span>`);
  snd('prestige'); syncAudio();
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
      snd('achievement');
    }
  }
  if (changed) { ST = computeStats(); ui.achDirty = ui.heroDirty = true; }
}

/* ------------------------------ daily gift ------------------------- */
const DAILY_DAYS = [
  { icon: '🪙', label: 'Gold + Uncommon item',            goldMult: 1,   items: [1],    toys: 0, eggs: 0, star: 0 },
  { icon: '🥚', label: 'Gold + collectable + Pet Egg',    goldMult: 1.2, items: [],     toys: 1, eggs: 1, star: 0 },
  { icon: '💙', label: 'Gold + Rare item',                goldMult: 1.5, items: [2],    toys: 0, eggs: 0, star: 0 },
  { icon: '🥚', label: 'Gold + 2 collectables + Pet Egg', goldMult: 1.8, items: [],     toys: 2, eggs: 1, star: 0 },
  { icon: '💜', label: 'Gold + Epic item',                goldMult: 2.2, items: [3],    toys: 0, eggs: 0, star: 0 },
  { icon: '🎁', label: 'Gold + 2 Rare + collectable',     goldMult: 2.6, items: [2, 2], toys: 1, eggs: 0, star: 0 },
  { icon: '⭐', label: 'Legendary + Pet Egg + Gold Star!', goldMult: 4,   items: [4],    toys: 1, eggs: 1, star: 1 },
];
function localDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dailyInfo() {
  const today = localDateStr(new Date());
  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  const claimedToday = S.daily.last === today;
  let streak = S.daily.streak || 0;
  if (!claimedToday) streak = S.daily.last === yesterday ? streak + 1 : 1; // streak you'll have after claiming
  const day = ((streak - 1) % 7) + 1;
  return { today, claimedToday, streak, day, broke: !claimedToday && S.daily.last && S.daily.last !== yesterday && S.daily.streak > 1 };
}
function dailyGold(day) {
  const base = zoneMonsterStats(S.zone, 5, false).gold * (1 + ST.gold / 100);
  return Math.max(25, Math.round(base * 50 * DAILY_DAYS[day - 1].goldMult));
}
function claimDaily() {
  const info = dailyInfo();
  if (info.claimedToday) return null;
  const D = DAILY_DAYS[info.day - 1];
  const gold = dailyGold(info.day);
  S.gold += gold; S.stats.goldEarned += gold;
  const items = [], toys = [];
  for (const minR of D.items) { const it = makeItem(S.zone, minR); items.push(it); receiveItem(it); }
  for (let i = 0; i < D.toys; i++) { const c = Math.random() < 0.25 ? rollGlobalCollectable() : rollCollectable(randInt(0, S.unlockedZones - 1), true); toys.push(c); receiveCollectable(c); }
  if (D.eggs) { quiet = true; gainEgg(D.eggs, 'It came with your daily gift.'); quiet = false; }
  if (D.star) { S.stars += D.star; ST = computeStats(); }
  S.daily.last = info.today; S.daily.streak = info.streak; S.daily.total = (S.daily.total || 0) + 1;
  S.daily.bestStreak = Math.max(S.daily.bestStreak || 0, info.streak);
  log(`🎁 <span class="good">Daily gift day ${info.day} claimed!</span> +🪙${fmt(gold)}${D.star ? ' +⭐' : ''}. Streak: ${info.streak} day${info.streak === 1 ? '' : 's'}.`);
  snd(D.star ? 'prestige' : 'achievement');
  checkAchievements();
  ui.all(); save();
  return { info, D, gold, items, toys };
}
function dailyCalendarHtml(info) {
  const claimedDay = info.claimedToday ? info.day : info.day - 1; // days already lit this week
  let html = '<div class="daily-cal">';
  DAILY_DAYS.forEach((d, i) => {
    const n = i + 1;
    const cls = n <= claimedDay ? 'done' : (n === info.day && !info.claimedToday ? 'today' : '');
    html += `<div class="daily-day ${cls}" title="${esc(d.label)}"><div class="dd-num">Day ${n}</div><div class="dd-ico">${n <= claimedDay ? '✅' : d.icon}</div></div>`;
  });
  return html + '</div>';
}
function openDailyModal() {
  const info = dailyInfo();
  const D = DAILY_DAYS[info.day - 1];
  let body;
  if (info.claimedToday) {
    body = `<div class="levelup-burst">📅</div><h2>Daily Gift</h2>
      <p>You already opened today's gift. Come back tomorrow for <b>Day ${(info.day % 7) + 1}</b>: ${esc(DAILY_DAYS[info.day % 7].label)}.</p>
      ${dailyCalendarHtml(info)}
      <p class="hint">Current streak: <b>${info.streak}</b> day${info.streak === 1 ? '' : 's'} · Gifts opened: <b>${S.daily.total}</b></p>`;
  } else {
    body = `<div class="levelup-burst daily-shake">🎁</div><h2>Daily Gift — Day ${info.day}</h2>
      ${info.broke ? `<p class="hint">You missed a day, so the streak starts over. No worries!</p>` : ''}
      <p>Today's gift: <b>${esc(D.label)}</b> (about 🪙${fmt(dailyGold(info.day))}).</p>
      ${dailyCalendarHtml(info)}
      <button class="btn purple" id="daily-claim">Open the gift! 🎁</button>
      <p class="hint">Log in on consecutive days to work up to the Day 7 Gold Star.</p>`;
  }
  showModal(body);
  const b = $('daily-claim');
  if (b) b.onclick = () => {
    const r = claimDaily();
    if (!r) return;
    const itemHtml = r.items.map(it => `<li>🎁 <span style="color:var(--r-${RARITIES[it.rarity].id});font-weight:700">${it.icon} ${esc(it.name)}</span></li>`).join('');
    const toyHtml = r.toys.map(c => `<li>🧸 ${c.icon} ${esc(c.name)}${S.collection[c.id] > 1 ? ` (×${S.collection[c.id]})` : ' <b>NEW!</b>'}</li>`).join('');
    showModal(`<div class="levelup-burst">🎉</div><h2>Day ${r.info.day} gift opened!</h2>
      <ul><li>🪙 <b>${fmt(r.gold)}</b> gold</li>${itemHtml}${toyHtml}${r.D.eggs ? `<li>🥚 <b>${r.D.eggs} Pet Egg</b> — hatch it in the Pets tab</li>` : ''}${r.D.star ? '<li>⭐ <b>+1 Gold Star</b> (+5% to everything, forever)</li>' : ''}</ul>
      ${dailyCalendarHtml(dailyInfo())}
      <p class="hint">Streak: <b>${r.info.streak}</b> day${r.info.streak === 1 ? '' : 's'}. See you tomorrow!</p>`);
    renderDailyButton();
  };
}
function renderDailyButton() {
  const info = dailyInfo();
  const b = $('daily-btn');
  b.classList.toggle('ready', !info.claimedToday);
  $('daily-txt').textContent = info.claimedToday ? `Day ${info.day} ✓` : 'Gift!';
  b.title = info.claimedToday ? `Daily gift claimed · streak ${info.streak}` : 'Your daily gift is ready!';
}

/* -------------------------- offline progress ----------------------- */
function simulateAway(seconds) {
  const cap = offlineCapHours() * 3600;
  const t = Math.min(seconds, cap);
  if (t < 30) return null;
  const zi = S.zone;
  const avg = zoneMonsterStats(zi, 5, false);
  const dps = ST.atk * ST.speed * (1 + (ST.crit / 100) * (ST.critMult - 1)) + totalPetDps();
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
  const eggs = Math.min(3, Math.floor(kills * 0.012 * (1 + ST.luck / 200)));
  if (eggs) gainEgg(eggs, 'Your pets kept them warm while you were away.');
  quiet = false;
  checkAchievements();
  ui.all();
  return { t, kills, gold, xp, items, toys, eggs, levels: S.level - lvlBefore, efficiency };
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
      ${r.eggs ? `<li>🥚 Found <b>${r.eggs}</b> Pet Egg${r.eggs > 1 ? 's' : ''}</li>` : ''}
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
  const def = defaultState();
  S = Object.assign(defaultState(), data);
  S.stats = Object.assign(def.stats, data.stats || {});
  S.opts = Object.assign(def.opts, data.opts || {});
  S.opts.sound = Object.assign(def.opts.sound, (data.opts && data.opts.sound) || {});
  S.daily = Object.assign(def.daily, data.daily || {});
  S.pets = data.pets || {}; S.activePets = Array.isArray(data.activePets) ? data.activePets.filter(id => S.pets[id]) : []; S.eggs = data.eggs | 0; S.flags = data.flags || {};
  S.upgrades = data.upgrades || {}; S.collection = data.collection || {}; S.newColl = data.newColl || {};
  S.achievements = data.achievements || {}; S.autosell = data.autosell || {}; S.equipment = data.equipment || {};
  S.inventory = Array.isArray(data.inventory) ? data.inventory : [];
  S.zone = clamp(S.zone | 0, 0, ZONES.length - 1);
  S.unlockedZones = clamp(S.unlockedZones | 0, 1, ZONES.length);
  if (!(S.heroHp > 0)) S.heroHp = 1;
  S.v = SAVE_VERSION;
  ST = computeStats();
  syncAudio();
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
  S = defaultState(); ST = computeStats(); syncAudio();
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
  const el = $(which === 'hero' ? 'hero-sprite' : which === 'monster' ? 'monster-sprite' : which) || $('hero-sprite');
  const sp = el.getBoundingClientRect();
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
  heroDirty: true, bagDirty: true, collDirty: true, upgDirty: true, achDirty: true, zoneDirty: true, petsDirty: true,
  all() { this.heroDirty = this.bagDirty = this.collDirty = this.upgDirty = this.achDirty = this.zoneDirty = this.petsDirty = true; renderStatic(); renderPetSprites(); },
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
  const snd0 = S.opts.sound;
  $('vol-sfx').value = Math.round(snd0.sfx * 100); $('vol-sfx-val').textContent = Math.round(snd0.sfx * 100) + '%';
  $('vol-music').value = Math.round(snd0.music * 100); $('vol-music-val').textContent = Math.round(snd0.music * 100) + '%';
  $('opt-muted').checked = snd0.muted;
  $('mute-ico').textContent = snd0.muted ? '🔇' : '🔊';
  $('sound-hint').classList.toggle('hidden', snd0.muted || (window.ToyAudio && window.ToyAudio.isUnlocked()));
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
  else if (activeTab === 'bag') refreshCraftButtons();
  if (ui.collDirty && activeTab === 'toybox') { renderCollection(); ui.collDirty = false; }
  if (activeTab === 'workbench') { renderUpgrades(); ui.upgDirty = false; }
  if (ui.achDirty && activeTab === 'stars') { renderAchievements(); ui.achDirty = false; }
  if (ui.petsDirty) { $('egg-count').textContent = S.eggs; $('egg-count').classList.toggle('hidden', S.eggs === 0); if (activeTab === 'pets') { renderPets(); renderPetSprites(); ui.petsDirty = false; } }
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
    <div><span>🐾 Pet damage</span><b>${fmt(totalPetDps())}/s</b></div>
    <div><span>🌟 Global bonus</span><b>×${ST.global.toFixed(2)}</b></div>
    <div><span>⭐ Stars</span><b>${S.stars} (+${S.stars * 5}%)</b></div>
    <div><span>🏅 Achievements</span><b>${ach} (+${ach}%)</b></div>
    <div><span>🧸 Toys found</span><b>${toys} (+${(toys * 0.5).toFixed(1)}% gold/xp)</b></div>
    <div><span>🏆 Sets complete</span><b>${sets} (+${sets * 4}% atk/hp)</b></div>`;
}

function renderCrafting() {
  const box = $('craft-list'); box.innerHTML = '';
  const groups = craftGroups();
  $('craft-count').textContent = groups.length ? `${groups.length} recipe${groups.length > 1 ? 's' : ''} ready` : '';
  if (!groups.length) {
    box.innerHTML = `<div class="craft-empty">Nothing to combine yet. Collect ${CRAFT_NEED} items with the same slot and rarity.</div>`;
    return;
  }
  for (const g of groups) {
    const R = RARITIES[g.rarity], R2 = RARITIES[g.rarity + 1];
    const base = sameBaseOf(g.use);
    const lvl = Math.max(...g.use.map(it => it.ilvl));
    const d = document.createElement('div'); d.className = 'craft-row';
    d.innerHTML = `<div class="craft-in"></div>
      <span class="craft-arrow">➜</span>
      <div class="craft-out rc-${R2.id}"><span class="mini">${base ? base[1] : '❓'}</span>
        <div><b style="color:var(--r-${R2.id})">${R2.name} ${SLOT_LABEL[g.slot]}</b><small>Lv ${lvl}${base ? ' · matching set!' : ''} · ${g.items.length} ${R.name} in bag</small></div></div>
      <button class="btn small purple" data-cost="${craftGroupCost(g)}"></button>`;
    const inBox = d.querySelector('.craft-in');
    for (const it of g.use) {
      const m = document.createElement('span');
      m.className = `mini rc-${R.id}`; m.textContent = it.icon;
      m.onmouseenter = (e) => showTooltip(e, itemTooltipHtml(it, S.equipment[it.slot]), R.id);
      m.onmousemove = moveTooltip;
      m.onmouseleave = hideTooltip;
      inBox.appendChild(m);
    }
    d.querySelector('button').onclick = () => { hideTooltip(true); craftItems(g.use, false); renderFrame(); };
    box.appendChild(d);
  }
  refreshCraftButtons();
}
// Gold changes every kill, so button labels and affordability update each frame.
function refreshCraftButtons() {
  let any = false;
  for (const b of $('craft-list').querySelectorAll('button[data-cost]')) {
    const cost = +b.dataset.cost, ok = S.gold >= cost;
    b.textContent = cost ? `Combine 🪙${fmt(cost)}` : 'Combine · free';
    b.disabled = !ok;
    if (ok) any = true;
  }
  $('craft-all').disabled = !any;
}

function renderBag() {
  $('bag-used').textContent = S.inventory.length;
  $('bag-max').textContent = bagMax();
  renderCrafting();
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

function renderPets() {
  $('pets-eggs').textContent = S.eggs;
  $('hatch-btn').disabled = S.eggs <= 0;
  $('pets-active').textContent = `${S.activePets.length}/${maxActivePets()}`;
  $('pets-owned').textContent = `${Object.keys(S.pets).length}/${PETS.length}`;
  const g = $('pet-grid'); g.innerHTML = '';
  const sorted = [...PETS].sort((a, b) => (S.pets[b.id] ? 1 : 0) - (S.pets[a.id] ? 1 : 0) || a.rarity - b.rarity);
  for (const P of sorted) {
    const pd = S.pets[P.id], R = RARITIES[P.rarity], active = S.activePets.includes(P.id);
    const d = document.createElement('div');
    d.className = `pet-card rc-${R.id} ${pd ? '' : 'locked'} ${active ? 'active' : ''}`;
    const passives = Object.entries(P.passive).map(([k, v]) => `${STAT_LABEL[k]} +${pct(v * (pd ? 1 + 0.05 * (pd.lvl - 1) : 1))}`).join(' · ');
    if (pd) {
      const need = petXpNeeded(pd.lvl);
      d.innerHTML = `<div class="pc-ico">${P.icon}</div>
        <div class="pc-body">
          <div class="pc-name">${esc(P.name)} <small>Lv ${pd.lvl}</small> <span class="pc-rar" style="color:var(--r-${R.id})">${R.name}</span></div>
          <div class="pc-desc">${esc(P.desc)}${P.special ? ` · ${SPECIAL_LABEL[P.special]}` : ''}</div>
          <div class="pc-stats">⚔️ ${fmt(petDamage(P))} every ${petInterval(P).toFixed(1)}s (${fmt(petDps(P))}/s)${passives ? ' · ' + passives : ''}</div>
          <div class="pc-xp"><div style="width:${Math.min(100, pd.xp / need * 100)}%"></div></div>
          <div class="pc-xpl">XP ${fmt(pd.xp)} / ${fmt(need)}</div>
        </div>
        <button class="btn small ${active ? 'yellow' : 'green'}">${active ? 'Rest' : 'Send out'}</button>`;
      d.querySelector('button').onclick = () => togglePet(P.id);
    } else {
      d.innerHTML = `<div class="pc-ico">❓</div><div class="pc-body"><div class="pc-name">??? <span class="pc-rar" style="color:var(--r-${R.id})">${R.name}</span></div><div class="pc-desc">Hatch eggs to find this pet.</div></div>`;
    }
    g.appendChild(d);
  }
}
function openHatchModal() {
  const r = hatchEgg();
  if (!r) return;
  const R = RARITIES[r.P.rarity];
  const pd = S.pets[r.P.id];
  showModal(`<div class="levelup-burst hatch-pop">${r.P.icon}</div>
    <h2>${r.isNew ? 'A new friend!' : 'Hatched a twin!'}</h2>
    <p><span style="color:var(--r-${R.id});font-weight:700">${R.name} ${esc(r.P.name)}</span> ${r.isNew ? 'hatched from the egg!' : `hatched — your ${esc(r.P.name)} is now <b>level ${pd.lvl}</b>.`}</p>
    <p>${esc(r.P.desc)}${r.P.special ? ` · ${SPECIAL_LABEL[r.P.special]}` : ''}</p>
    ${r.isNew && S.activePets.includes(r.P.id) ? '<p class="hint">It has joined you in battle.</p>' : ''}
    ${S.eggs > 0 ? `<button class="btn purple" id="hatch-again">Hatch another (${S.eggs} left) 🥚</button>` : ''}`);
  const b = $('hatch-again'); if (b) b.onclick = openHatchModal;
  renderPets();
}
function renderLifetime() {
  const s = S.stats;
  $('lifetime-stats').textContent = `Lifetime: ${fmt(s.kills)} toys bonked · ${fmt(s.bosses)} bosses · ${fmt(s.goldEarned)} gold earned · ${fmt(s.itemsFound)} items found · ${fmt(s.itemsSold)} sold · ${fmt(s.itemsCrafted)} crafted · ${s.deaths} naps · ${s.prestiges} tidy-ups · ${timeStr(s.playtime)} played`;
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
    snd('click');
    document.querySelectorAll('.tab-body').forEach(b => b.classList.add('hidden'));
    $('tab-' + activeTab).classList.remove('hidden');
    ui.heroDirty = ui.bagDirty = ui.collDirty = ui.upgDirty = ui.achDirty = ui.petsDirty = true;
    hideTooltip(true);
    renderFrame();
  });
  $('zone-prev').onclick = () => changeZone(-1);
  $('zone-next').onclick = () => changeZone(1);
  $('auto-equip').onchange = (e) => { S.autoEquip = e.target.checked; };
  $('opt-numbers').onchange = (e) => { S.opts.numbers = e.target.checked; };
  $('opt-toasts').onchange = (e) => { S.opts.toasts = e.target.checked; };
  $('vol-sfx').oninput = (e) => { S.opts.sound.sfx = e.target.value / 100; $('vol-sfx-val').textContent = e.target.value + '%'; syncAudio(); };
  $('vol-sfx').onchange = () => snd('coin');
  $('vol-music').oninput = (e) => { S.opts.sound.music = e.target.value / 100; $('vol-music-val').textContent = e.target.value + '%'; syncAudio(); };
  const setMuted = (m) => { S.opts.sound.muted = m; syncAudio(); renderStatic(); if (!m) snd('click'); };
  $('opt-muted').onchange = (e) => setMuted(e.target.checked);
  $('mute-btn').onclick = () => setMuted(!S.opts.sound.muted);
  $('daily-btn').onclick = () => { snd('click'); openDailyModal(); };
  $('hatch-btn').onclick = openHatchModal;
  $('sound-hint').onclick = () => { if (window.ToyAudio) window.ToyAudio.unlock(); $('sound-hint').classList.add('hidden'); };
  document.addEventListener('toyaudio-unlocked', () => { $('sound-hint').classList.add('hidden'); syncAudio(); });
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
  $('craft-all').onclick = () => { hideTooltip(true); craftAll(); renderFrame(); };
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
  snd('zone');
  if (window.ToyAudio) window.ToyAudio.setZone(nz);
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
  if (saveTimer >= 5) { saveTimer = 0; save(); renderDailyButton(); }
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
  syncAudio();
  ui.all();
  renderDailyButton();
  renderPetSprites();
  if (!S.flags.firstEgg) { S.flags.firstEgg = true; if (Object.keys(S.pets).length === 0) gainEgg(1, 'A welcome gift from the toy box!'); }
  if (!dailyInfo().claimedToday) { log('🎁 <span class="good">Your daily gift is ready!</span> Click the gift in the top bar.'); toast('🎁', 'Daily gift ready!', 'Click the gift box in the top bar', 'rc-legendary', true); }
  spawnDelay = 0.3;
  lastTick = Date.now();
  setInterval(loop, 100);
  save();
}

init();
})();
