# Potayto — Dev Roadmap

Spec firmed up via grill session. All tunable numbers go into a central params file.

---

## Phase 0: Project Scaffold
- [x] Vite + TypeScript 7 + PixiJS 8 setup
- [x] `index.html` entry
- [ ] `src/params.ts` — all tunable constants (speeds, HP, enemy counts, wave timings, weapon stats, etc.)
- [ ] `src/state.ts` — global game state singleton (current wave, materials, HP, equipped weapons, danger level, etc.)
- [ ] `src/events.ts` — event bus for decoupled communication between systems

## Phase 1: Arena & Player
- [ ] `src/arena.ts` — 1920×1080 fixed aspect, scales to fill window. Simple background rect placeholder.
- [ ] `src/player.ts` — 20×20 circle, spawns center. WASD/arrow movement. Has stats (HP, speed, fire rate, damage, collect radius, harvest %).
- [ ] `src/collision.ts` — collision detection system (player–enemy, player–material, projectile–enemy, projectile–player). Tunable invincibility frames.
- [ ] `src/projectile.ts` — projectile system (spawn, move, lifetime, hit detection, cull off-screen).

## Phase 2: Weapons
- [ ] `src/weapons.ts` — weapon catalog: Peashooter, Crossbow, Shotgun, Axe, Staff, Wand. Each has: class (Precise/Primitive/Elemental), fire rate, damage, projectile count/spread, special behavior (pierce, melee arc, AoE, homing).
- [ ] Auto-fire targeting: always shoot closest enemy within range.

## Phase 3: Enemies
- [ ] `src/enemies.ts` — enemy entity with HP, speed, behavior type.
- [ ] 3 behavior types: Chase (contact damage, no shoot), Random (wanders, shoots), Stationary (sits still, shoots).
- [ ] Enemy projectiles (only for Random & Stationary types). Visual = small red circles.
- [ ] Enemy death: drop materials, award XP.

## Phase 4: Wave System
- [ ] `src/waves.ts` — Wave timer (20s→120s scaling). Batches spawn every 1s. Enemy count = `ENEMY_BASE * wave`.
- [ ] Danger level (0–5) multiplier: enemy HP, damage, speed × scaling factor.
- [ ] Wave instant-end on timer=0. Uncollected materials → partially collected (Harvest stat %).
- [ ] Transition to Shop/Level-Up phase.

## Phase 5: Materials
- [ ] `src/materials.ts` — material orbs drop on enemy death. Attracted to player within Collect radius. Persistent on ground until wave end. Wave-end Harvest % yields remaining.

## Phase 6: HUD
- [ ] `src/hud.ts` — PixiJS text/graphics overlay:
  - Health bar (HP / MaxHP)
  - Wave counter (Wave N / 20)
  - Wave timer (countdown seconds)
  - Materials counter
  - Weapons bar (show 6 slots with equipped weapon icons/names)
- [ ] HUD updates every frame / on state change.

## Phase 7: Level-Up System
- [ ] `src/levelup.ts` — On wave complete, show 4 random stats to upgrade. Player picks one.
- [ ] Stat pool: Max HP, Life Steal, HP Regen, Armor, Dodge, Attack Speed, Range, Collect, Harvest.
- [ ] Diminishing returns / hard caps (Dodge 60%, etc) applied in state.

## Phase 8: Shop
- [ ] `src/shop.ts` — 4 weapon slots showing random weapons from pool (tier-gated by Danger level and wave).
- [ ] Reroll button (costs materials, scales price). Lock slot button (prevents that slot from rerolling).
- [ ] Buy: click weapon → deduct materials → equip into first empty slot or swap.
- [ ] Merge mechanic: if inventory has 2 identical same-tier weapons, show merge prompt → produces Tier+1 weapon.

## Phase 9: Meta Screens
- [ ] `src/title.ts` — Title screen. Danger level selector (0–5). Start button.
- [ ] `src/weaponselect.ts` — Show 5 random Tier-1 weapons, pick 1 to start.
- [ ] `src/gameover.ts` — Game over screen (player death or wave 20 cleared). Show stats. Restart button.

## Phase 10: Polish
- [ ] Particle effects (hit sparks, death poof, material pickup glow, level-up flash).
- [ ] Screen shake on player hit.
- [ ] Sound hooks (play sounds via events, actual assets later).
- [ ] Tuning pass: play with all param values until it feels right.
- [ ] Danger 5 elite boss waves — every 5th wave spawns an elite (chunky HP, bigger, special color).
