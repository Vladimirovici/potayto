# Potayto — Game Design Spec

## Core Loop & Economy

The game operates on a minimalist, highly structured loop designed to maximize player engagement through rapid iteration.
The Loop: Combat Wave -> Collect Material -> Shop / Level Up Phase -> Next Wave.
Limited to 20 combat waves.
The Clock: Time is the ultimate progression driver. Waves end automatically when the timer reaches zero, forcing aggressive survival over methodical clearing.
Wave 1 starts at 20 seconds, each wave increases until wave 20 has 120 seconds (formula: `20 + (wave - 1) * (100 / 19)`).
Dual-Purpose Currency: "Materials" dropped by enemies serve as both gold (for the shop) and XP (for leveling up). This creates a brilliant tension: spending materials builds immediate power, but missing drops permanently stunts long-term scaling.

## Arena & Display

- Resolution: 1920×1080 internal, 16:9 fixed aspect ratio, scales to fill window (letterboxed on non-16:9 displays).
- Single-screen rectangle — no camera scrolling. Forces constant navigation through enemy crowds.
- All entities are geometric placeholders for MVP (circles, rects) — spritesheet support ready.

## Combat & Input Specifications

- Controls: WASD + arrow keys for movement.
- Automation: Shooting is automated by default (targeting the closest enemy in range).
- Player: 20×20 circle, spawns at arena center. No starting gold.

## Player Stats (MVP)

All tunable in `params.ts`. Invincibility frames on hit (tunable duration).
- Max HP
- Movement Speed (px/s)
- Fire Rate (shots/s)
- Bullet Damage
- Bullet Speed (px/s)
- Bullet Range
- Life Steal
- HP Regeneration (HP/s)
- Armor (damage reduction %)
- Dodge (hard cap 60%)
- Attack Speed
- Collect (radius for auto-attracting materials)
- Harvest (% of uncollected materials collected at wave end)

Each Level-up gives a choice of upgrading 4 random stats. Diminishing returns / hard caps enforced.

## Weapons

6 weapons in the catalog, 2 per class. All tunable in params.

### Precise Class
1. **Peashooter** — Fast fire, low damage, small projectile
2. **Crossbow** — Slow, high damage, pierces enemies

### Primitive Class
3. **Shotgun** — Short range, 5-pellet spread
4. **Axe** — Melee, wide arc sweep, hits all in range

### Elemental Class
5. **Staff** — Medium rate, projectile explodes on impact (small AoE)
6. **Wand** — Homing projectiles, medium damage

### Rules
- Up to 6 weapon slots.
- Merge: two identical same-tier weapons → produce Tier+1 weapon (Tier 1–4).
- Class Synergies: equipping multiple weapons of same class triggers passive stacking stat bonuses.
- Starting selection: pick 1 of 5 random Tier-1 weapons before first wave.

## Shop (Post-Wave Phase)

- 4 weapon slots showing random weapons (tier-gated by Danger level and wave progression).
- Reroll button (cost scales with wave). Lock slot button (prevents that slot from rerolling).
- No starting gold — spend materials earned during combat.
- Prices scale with each subsequent wave (inflation).
- Slots fill from left — clicking a weapon buys and equips into first empty slot (or swaps).

## Enemies

### Count & Spawn
- Enemy count per wave: `ENEMY_BASE * wave`, spawned in batches every 1 second.
- 3 behavior types (equal split MVP, tunable):
  - **Chase** — moves toward player, contact damage only, no projectile.
  - **Random** — wanders randomly, shoots at player.
  - **Stationary** — sits still, shoots at player.
- Base speed = player speed, scales +1% per wave.
- All enemy projectiles: small red circles.

### Difficulty Scaling (Danger Levels)
- Danger 0 to 5: before run, player selects danger level.
- Each level multiplies enemy HP, damage, and movement speed.
- Higher danger = more materials per kill + better shop tier access.
- Elite boss waves every 5th wave on Danger 5 (chunky HP, bigger, special visual).

### Wave End
- Timer hits zero → wave instantly ends, enemies freeze/disappear.
- Uncollected materials on ground → partially collected based on Harvest stat (%).
- Transition to Shop / Level-Up phase.

## Materials

- Drop on enemy death as small orbs on the ground.
- Player must walk over them to collect (risk/reward).
- Orbs are auto-attracted to player within Collect radius.
- At wave end, Harvest % of remaining ground materials is auto-collected.
- Serve dual purpose: gold (shop) + XP (level-ups).

## HUD (Visible During Combat)

- Health bar (HP / MaxHP)
- Wave counter (Wave N / 20)
- Wave timer (countdown seconds)
- Materials counter
- Weapons bar (6 slots showing equipped weapons)

Tasks and progress are tracked in todo.md