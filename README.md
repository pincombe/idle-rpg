# 🧸 Toy Box Quest

An idle RPG set inside a toy box. Your hero fights automatically, showers you with loot, and fills a collection of toys while you watch (or don't).

**Play it:** https://pincombe.github.io/idle-rpg/

## Features

- **Auto-battling hero** across 20 toy-themed zones, each with four monsters and a boss.
- **Tons of loot**: six equipment slots, six rarity tiers (Common → Mythic), randomly generated names and affixes, auto-equip and auto-sell.
- **Crafting table**: combine three items of the same slot and rarity into one item of the next rarity up. The weakest three are used, the result keeps the highest item level, and three of the same toy make a matching upgrade. "Combine everything" chains through the whole bag.
- **184 collectables** across 22 sets: figurines for every monster and boss, zone toys, a marble jar and a sticker album. Every toy and completed set gives permanent bonuses.
- **Workbench upgrades**, **achievements**, and a **Tidy Up** prestige system that awards Gold Stars.
- **Automatic saving** to your browser's local storage every few seconds, plus export/import save codes.
- **Away-time progress** when you come back (up to 8 hours, extendable).
- **Pets** that fight beside you: hatch eggs (from bosses, rare drops and daily gifts) into 17 toy companions with their own attacks, passive bonuses and special abilities like healing, shielding and chilling enemies. Pets level up from shared XP and duplicate hatches, and survive Tidy Ups.
- **Daily gift** with a 7-day streak calendar: gold and gear scaled to your current zone, collectables, and a Gold Star on day 7.
- **Procedural sound and music**: every effect is synthesized live with the Web Audio API, and a generative music-box soundtrack plays a different tune in each zone (and speeds up for bosses). Mute button in the top bar, volume sliders in Settings.

## Running locally

It's plain HTML, CSS and JavaScript with no build step. Serve the folder with any static server, for example:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.
