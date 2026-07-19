# Potayto — Architecture

## Overview

A PixiJS 8 survival arena game (Vampire Survivors–like). 20 waves, timer-based,
auto-shooting, with a shop and level-up system between waves. Stack: TypeScript
7, Vite 8, PixiJS 8, 1920×1080 internal resolution (letterboxed to fill window).

---

## File Map

### Core
| File | Role |
|---|---|
| `main.ts` | Entry point. Creates PixiJS app, owns the game loop ticker, manages phase transitions |
| `params.ts` | All tunable numbers: player stats, weapon catalog, enemy scaling, shop prices, danger multipliers, caps |
| `state.ts` | `GameState` — meta-level data (materials, wave, level, etc.) for UI screens |
| `events.ts` | Lightweight event bus (`EventBus`) + phase type + event name constants |
| `arena.ts` | 1920×1080 background rect + CSS-based letterbox resize handler |
| `stats.ts` | `StatsWidget` — FPS counter, entity counts, toggled with backtick |

### ECS Core
| File | Role |
|---|---|
| `ecs/World.ts` | Entity + component pool + system scheduling. `entity()`, `add()`, `get()`, `query()`, `destroy()`, `update()` |
| `ecs/Components.ts` | All component type interfaces + string constant map (`C.Transform`, `C.Health`, etc.) |

### Systems (each implements `System.update(world, dt)`)
| File | Role |
|---|---|
| `systems/PlayerInputSystem.ts` | WASD/arrow input → player position, arena clamping, HP regen, invincibility countdown |
| `systems/EnemySystem.ts` | Enemy AI (chase/random/stationary), shooting, batch spawning per wave |
| `systems/WeaponSystem.ts` | Per-slot fire cooldowns, auto-aim at closest enemy, create projectile entities, record melee hits |
| `systems/ProjectileSystem.ts` | Move projectiles (velocity → position), cull out-of-range; HOMING: steer toward closest enemy |
| `systems/MaterialSystem.ts` | Spawn material orbs on enemy death, velocity decay + boundary bounce, player attraction |
| `systems/CollisionSystem.ts` | Melee arc hit detection, player projectile vs enemy (+AOE+pierce), enemy projectile vs player, enemy contact vs player, material collection |
| `systems/WaveSystem.ts` | Wave timer countdown, active/last-wave state |
| `systems/RenderSystem.ts` | Sync all Graphics positions to transforms, player HP bar + invincibility flash |
| `systems/HUDSystem.ts` | HUD text/graphics: wave counter, timer, materials, weapon bar, HP bar |

### Meta Screens (standalone, not ECS)
| File | Role |
|---|---|
| `levelup.ts` | `LevelUpScreen` — 4 random stat picks, caps enforcement, chains pending levels |
| `shop.ts` | `ShopScreen` — 4 weapon slots, buy, reroll, lock, merge, loadout+stats panel |
| `title.ts` | `TitleScreen` — danger level selector (0–5), START button |
| `weaponselect.ts` | `WeaponSelectScreen` — 5 random Tier-1 weapon cards, pick 1 |
| `gameover.ts` | `GameOverScreen` — wave reached, materials collected, PLAY AGAIN |

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

All systems run in order via `World.update(dt)`, followed by material/xp bookkeeping:

```
 1. PlayerInputSystem       — WASD input → movement, arena clamp, HP regen, inv countdown
 2. EnemySystem             — spawn batch, AI movement, enemy shooting → create enemy projectiles
 3. WeaponSystem            — fire cooldowns, auto-aim, create player projectiles, record melee hits
 4. HomingSystem            — steer homing projectiles toward closest enemy
 5. ProjectileSystem        — move all projectiles (velocity → position), cull out-of-range
 6. MaterialPhysicsSystem   — orb velocity decay, boundary bounce, player attraction
 7. CollisionSystem         — melee arc → damage+life steal, bullet-enemy → damage+AOE+pierce+life steal,
                              enemy bullet-player → dodge+armor, enemy contact → dodge+armor,
                              player-material → collect
 8. MaterialSpawnSystem     — find dead enemies, spawn material orbs with burst velocity, destroy enemy entities
 9. RenderSystem            — sync all Graphics x/y to Transform, player HP bar + invincibility flash
    world.flush()           — actually remove entities queued for destruction
    Material/XP bookkeeping — state.materials += collisionSystem.materialsCollected, XP → level-up checks
    Player death check      — if HP ≤ 0, transition to game-over
10. HUDSystem               — update all HUD text/graphics
    StatsWidget             — FPS avg + entity counts
```

---

## ECS Architecture

The game uses a lightweight Entity-Component-System pattern for the combat loop.

### Entities
Just numeric IDs. An entity is a set of components. Created via `world.entity()`,
destroyed via `world.destroy(e)` (deferred until `world.flush()`).

### Components
Plain data interfaces stored in `Map<Entity, T>` pools keyed by string constant.
Available types defined in `Components.ts`:
- `Transform` / `Velocity` — position + movement
- `Health` — enemy HP
- `Render` — PixiJS `Graphics` reference (+ optional `hpBar`)
- `Collider` — collision radius
- `Player` — player tag + invincibility timer
- `Enemy` — behavior type, combat stats, AI timers
- `Projectile` — damage, range, pierce/AoE/homing flags, hit tracking
- `Material` — marker tag (no data)
- `Stats` — full player stats (shared reference with `GameState.playerStats`)
- `WeaponSlots` — equipped weapons + cooldowns + melee hit queue

### Systems
Each implements `System.update(world, dt)`. Systems query entities by component
signature (e.g. `world.query(C.Player, C.Transform)`) and operate on them. No
system references another directly — all inter-system data flows through the
World's component pools.

### ECS Core (`ecs/World.ts`)
- `entity()` → allocates a new ID
- `add(entity, type, component)` → stores component data
- `get(entity, type)` → reads component
- `has(entity, type)` → existence check
- `query(type1, type2, ...)` → returns entities with ALL specified components
- `destroy(entity)` → queues for removal (deferred to avoid iteration issues)
- `flush()` → actually removes destroyed entities from pools
- `update(dt)` → runs all systems in registration order, then flushes
- `clear()` → resets entire world

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
params.ts ──> main.ts ──> World (ECS)
                            │
                    ┌───────┴────────┐
                    │                │
              Components         Systems
              (pure data)      (logic, mutate
                                components)
                    │                │
                    └───────┬────────┘
                            │
                    GameState (meta data:
                    materials, wave,
                    equippedWeapons ref,
                    playerStats ref)
                            │
                    Meta screens
                    (shop, level-up,
                    title, game-over)
```

The **ECS World** owns combat data (positions, velocities, health, projectiles,
materials). Systems query entities by component composition and mutate data
in-place. `GameState` holds meta-level data (materials, wave number, level XP)
and shares references (`playerStats`, `equippedWeapons`) with the ECS player
entity's components — changes in ECS are visible to meta screens and vice versa.

Shop state (`shopSlots`, `shopLocks`) persists in `GameState` across waves.

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
