# Potayto — Architecture

## Overview

A PixiJS 8 survival arena game (Vampire Survivors–like). 20 waves, timer-based,
auto-shooting, with a shop and level-up system between waves. Stack: TypeScript
7, Vite 8, PixiJS 8, 1920×1080 internal resolution (letterboxed to fill window).

---

## File Map

| File | Role |
|---|---|
| `main.ts` | Entry point. Creates PixiJS app, owns the game loop ticker, manages phase transitions (title → weapon-select → combat → level-up → shop → repeat) |
| `params.ts` | All tunable numbers: player stats, weapon catalog, enemy scaling, shop prices, danger multipliers, caps |
| `state.ts` | `GameState` singleton — current HP, materials, wave, equipped weapons, level-ups pending, shop slots/locks |
| `events.ts` | Lightweight event bus (`EventBus`) + phase type + event name constants |
| `arena.ts` | 1920×1080 background rect + CSS-based letterbox resize handler |
| `player.ts` | `Player` class — 20×20 circle, WASD/arrow movement, arena-clamped, HP bar above, invincibility flash |
| `projectile.ts` | `Projectile` interface + `ProjectileManager` — spawn, move, range cull, destroy |
| `collision.ts` | `circlesOverlap()` + `distance()` utilities |
| `weapons.ts` | `WeaponSystem` — per-slot fire cooldowns, auto-aims at closest enemy, handles melee arcs, creates projectiles with pierce/AoE/homing/spread |
| `enemies.ts` | `Enemy` (3 behavior types: chase, random, stationary) + `EnemyManager` (spawn batching every 1s, AI updates, enemy shooting) |
| `materials.ts` | `MaterialOrb` + `MaterialManager` — spawn 1 orb per material unit with velocity burst, attract within Collect radius (speed always > player speed), bounce off arena edges, collect on contact, wave-end Harvest % |
| `waves.ts` | `WaveManager` — timer countdown (20s–120s formula), active state, last-wave detection |
| `hud.ts` | `HUD` — wave counter, countdown timer, materials, weapon bar, HP bar (200px, color-shifts green→orange→red) |
| `levelup.ts` | `LevelUpScreen` — shows 4 random stat picks, applies upgrades with caps, chains multiple pending levels |
| `shop.ts` | `ShopScreen` — 4 weapon slots (tier-gated by danger/wave), buy (leaves "SOLD" slot), reroll (free when all empty), lock (persists across waves), merge detection, loadout + stats info panel |
| `title.ts` | `TitleScreen` — danger level selector (0–5), START button |
| `weaponselect.ts` | `WeaponSelectScreen` — 5 random Tier-1 weapon cards, pick 1 |
| `gameover.ts` | `GameOverScreen` — wave reached, materials collected, PLAY AGAIN |
| `stats.ts` | `StatsWidget` — FPS counter (30-frame rolling avg, color-coded), entity counts, toggled with backtick |

---

## Phase Flow

```
Title → Weapon Select → Combat (wave 1) → Level-Up → Shop → Combat (wave 2) → ... → Game Over
                                                ↑__________|
```

Phases are managed by an event bus (`events.ts`). `main.ts` listens for
`PHASE_CHANGE` events and swaps between the `screenLayer` (meta screens) and
`combatLayer` (arena + player + enemies + HUD).

The wave-complete transition:
1. Wave timer hits 0 → enemies cleared → materials harvested (Harvest %)
2. "WAVE N COMPLETE" overlay shown on combatLayer
3. SPACE/Enter → LevelUpScreen (if level-ups pending) → ShopScreen → next wave

---

## Combat Loop (per tick)

```
 1. WaveManager.update(dt)          — decrement wave timer
 2. EnemyManager.spawnUpdate(dt)     — batch spawn enemies every 1s
 3. EnemyManager.update(dt, ...)     — enemy AI movement + shooting
 4. Player.update(dt, stats)         — keyboard input, movement, HP bar
 5. WeaponSystem.update(dt, ...)     — fire cooldowns, auto-aim, create projectiles
 6. Homing steering                  — adjust homing projectiles toward closest enemy
 7. ProjectileManager.update(dt)     — move projectiles, cull out-of-range
 8. MaterialManager.update(dt, ...)  — attract orbs (speed > player speed, decaying velocity + boundary bounce), collect on contact
 9. Melee arc collision              — axe sweep damage to enemies + life steal heal
10. Player projectile vs enemies    — damage + AOE + pierce tracking + life steal heal
11. Enemy projectile vs player      — damage with dodge/armor check
12. Enemy contact damage            — chase enemies damage on overlap
13. removeDead → spawn material orbs with velocity burst
14. Player death check → Game Over
15. HP regen, invincibility frames, flash effect
16. HUD.update(state, timer)
```

---

## Key Design Decisions

### Fixed resolution, letterbox scaling
The canvas renders at a fixed 1920×1080. On resize, the canvas element is
scaled via CSS (`width`/`height` in px) to fit the window while maintaining
16:9, centered with black bars on non-16:9 displays. All game code uses
1920×1080 coordinates — no camera, no scrolling.

### Auto-fire targeting
Shooting is fully automated. Each equipped weapon independently tracks its fire
cooldown. Every frame, it scans for the closest enemy within its range. If one
exists and the cooldown is ready, it fires. Player controls only movement.

### Decoupled systems via event bus
`events.ts` provides a lightweight `EventBus` used primarily for phase
transitions. Systems don't directly reference each other — `main.ts` owns the
combat loop and orchestrates all interactions (collision, death, spawning).

### Geometric placeholders
All entities are circles/rects drawn with `Graphics`. A `color` field on each
weapon/bullet is the only visual differentiation. Ready to swap to spritesheet
atlas rendering later.

### Tier-scaled weapons
The catalog (`params.ts`) defines only Tier 1 weapons. Higher tiers are
generated at runtime by scaling stats (+50% damage, +15% fire rate, +10%
speed/range per tier). The shop generates tier-scaled versions, and the merge
system combines two identical same-tier weapons into the next tier.

### Stat caps
All player stats enforce hard caps (e.g. Dodge ≤ 60%, Attack Speed ≤ 3×,
Collect ≤ 400px). Caps are defined in `params.ts` and enforced during level-up
application.

---

## Data Flow

```
params.ts  ──>  state.ts  ──>  main.ts (ticker)  ──>  HUD
                   ▲                                      │
                   │                                      │
              (systems mutate                              │
               GameState                                  │
               directly)                                  │
                   │                                      │
                   └──────────────────────────────────────┘
```

`GameState` is the single source of truth. Combat systems (`Player`,
`EnemyManager`, `WeaponSystem`, `MaterialManager`) read from and write to it
directly. `main.ts` passes the relevant slice to each system. The HUD reads
`GameState` every frame to render.

Shop state (`shopSlots`, `shopLocks`) persists in `GameState` across waves so
lock/sold status survives shop-to-shop transitions.

---

## Enemy Behavior Split

| Type | Movement | Attack | Color |
|---|---|---|---|
| Chase | Toward player | Contact damage only | `#ff4444` |
| Random | Wanders with periodic angle changes | Shoots projectiles | `#ff8844` |
| Stationary | None | Shoots projectiles | `#cc4444` |

All 3 types spawn in equal proportion (tunable). Chase enemies don't shoot.
Random and Stationary enemies fire red projectiles at the player on a cooldown.

---

## Weapon Catalog

| Weapon | Class | Special |
|---|---|---|
| Peashooter | Precise | Fast fire, small projectile |
| Crossbow | Precise | Pierces enemies |
| Shotgun | Primitive | 5-pellet spread, 30° cone |
| Axe | Primitive | 120° melee arc sweep |
| Staff | Elemental | AoE explosion on hit (radius 40) |
| Wand | Elemental | Homing projectiles |

Class synergy (stacking passive bonuses for holding 2+ of same class) is
tracked in `state.equippedWeapons` but passive bonus application is TBD.

---

## Stats for Level-Up

9 upgradeable stats, each with a fixed increment per pick:

| Stat | Per Pick | Cap |
|---|---|---|
| Max HP | +10 | — |
| Life Steal | +3% | — |
| HP Regen | +0.5/s | — |
| Armor | +5% | 80% |
| Dodge | +3% | 60% |
| Attack Speed | +10% | 3× |
| Range | +30 px | — |
| Collect | +15 px | 400 px |
| Harvest | +5% | 95% |
