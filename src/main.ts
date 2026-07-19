import { Application, Container, Text } from "pixi.js";
import { createArena } from "./arena";
import { EVENTS, EventBus, type GamePhase } from "./events";
import { GameOverScreen } from "./gameover";
import { LevelUpScreen } from "./levelup";
import { ShopScreen } from "./shop";
import {
  ARENA_HEIGHT, ARENA_WIDTH, XP_LEVEL_SCALE, XP_PER_LEVEL, XP_PER_MATERIAL,
} from "./params";
import { createInitialState } from "./state";
import { StatsWidget } from "./stats";
import { TitleScreen } from "./title";
import { WeaponSelectScreen } from "./weaponselect";

import { World } from "./ecs/World";
import { C, type StatsComponent, type TransformComponent, type PlayerComponent, type RenderComponent } from "./ecs/Components";
import { initKeyboard, PlayerInputSystem } from "./systems/PlayerInputSystem";
import { EnemySystem } from "./systems/EnemySystem";
import { WeaponSystem } from "./systems/WeaponSystem";
import { ProjectileSystem, HomingSystem } from "./systems/ProjectileSystem";
import { MaterialSpawnSystem, MaterialPhysicsSystem, harvestMaterials, clearMaterials, countMaterials } from "./systems/MaterialSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { WaveSystem } from "./systems/WaveSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { HUDSystem } from "./systems/HUDSystem";

const events = new EventBus();
let state = createInitialState();

async function init() {
  const app = new Application();
  await app.init({
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    background: "#000000",
  });
  document.body.appendChild(app.canvas);
  app.canvas.style.position = "absolute";

  const { bg: arenaBg, resize } = createArena(app);
  app.stage.addChild(arenaBg);
  resize();

  const screenLayer = new Container();
  const combatLayer = new Container();
  app.stage.addChild(screenLayer);
  app.stage.addChild(combatLayer);

  const statsWidget = new StatsWidget(app.stage);

  let currentMeta: Container | null = null;
  let world: World | null = null;
  let waveSystem: WaveSystem | null = null;
  let enemySystem: EnemySystem | null = null;
  let collisionSystem: CollisionSystem | null = null;
  let hudSystem: HUDSystem | null = null;
  let renderSystem: RenderSystem | null = null;
  let waveTransitionTimer = 0;
  let waveCompleteText: Text | null = null;

  function showMeta(container: Container) {
    combatLayer.visible = false;
    combatLayer.removeChildren();
    screenLayer.visible = true;
    if (currentMeta) screenLayer.removeChild(currentMeta);
    screenLayer.addChild(container);
    currentMeta = container;
  }

  function startLevelUpFlow(): void {
    if (!world) return;
    enemySystem?.startWave(0, 0); // reset spawns
    const harvested = harvestMaterials(world, state.playerStats.harvestPercent);
    if (harvested > 0) {
      state.materials += harvested;
      state.xp += harvested * XP_PER_MATERIAL;
    }
    clearMaterials(world);
    if (waveCompleteText) {
      combatLayer.removeChild(waveCompleteText);
      waveCompleteText.destroy();
      waveCompleteText = null;
    }
    if (state.levelUpsPending > 0) {
      showPhase("level-up");
    } else {
      showPhase("shop");
    }
  }

  function showPhase(phase: GamePhase): void {
    state.phase = phase;
    switch (phase) {
      case "level-up": {
        combatLayer.visible = false;
        screenLayer.visible = true;
        if (currentMeta) screenLayer.removeChild(currentMeta);
        const screen = new LevelUpScreen(state.playerStats, state.levelUpsPending, () => {
          state.levelUpsPending = 0;
          showPhase("shop");
        });
        screenLayer.addChild(screen.container);
        currentMeta = screen.container;
        break;
      }
      case "shop": {
        combatLayer.visible = false;
        screenLayer.visible = true;
        if (currentMeta) screenLayer.removeChild(currentMeta);
        const screen = new ShopScreen(state, () => {
          nextWave();
        });
        screenLayer.addChild(screen.container);
        currentMeta = screen.container;
        break;
      }
    }
  }

  function nextWave(): void {
    if (!waveSystem || !enemySystem) return;
    waveSystem.startWave(state.wave + 1);
    enemySystem.startWave(waveSystem.wave, state.dangerLevel);
    state.wave = waveSystem.wave;
    state.playerStats.currentHp = Math.min(state.playerStats.maxHp, state.playerStats.currentHp);
    state.phase = "combat";
    screenLayer.visible = false;
    combatLayer.visible = true;
    waveTransitionTimer = 0;
    if (waveCompleteText) {
      combatLayer.removeChild(waveCompleteText);
      waveCompleteText.destroy();
      waveCompleteText = null;
    }
    if (renderSystem && world) {
      const p = world.query(C.Player, C.Player)[0];
      if (p !== undefined) {
        const pp = world.get<PlayerComponent>(p, C.Player);
        pp.invTimer = 0;
      }
    }
  }

  function initCombat(chosenWeapon: any): void {
    state = createInitialState();
    state.phase = "combat";
    state.wave = 1;
    state.equippedWeapons[0] = chosenWeapon;

    screenLayer.visible = false;
    combatLayer.visible = true;
    combatLayer.removeChildren();
    waveTransitionTimer = 0;
    waveCompleteText = null;

    world = new World();
    waveSystem = new WaveSystem();
    enemySystem = new EnemySystem(combatLayer);
    collisionSystem = new CollisionSystem();
    renderSystem = new RenderSystem();

    // Create player entity
    renderSystem.createPlayerGraphics(world, combatLayer);
    const playerEnt = world.query(C.Player)[0];
    world.add(playerEnt, C.Stats, state.playerStats as StatsComponent);
    world.add(playerEnt, C.WeaponSlots, {
      weapons: state.equippedWeapons as (any)[],
      cooldowns: new Array(6).fill(0),
      meleeHits: [],
    });
    const pt = world.get<TransformComponent>(playerEnt, C.Transform);
    pt.x = ARENA_WIDTH / 2;
    pt.y = ARENA_HEIGHT / 2;

    // Add systems in order
    world.addSystem(new PlayerInputSystem());
    world.addSystem(enemySystem);
    world.addSystem(new WeaponSystem(combatLayer));
    world.addSystem(new HomingSystem());
    world.addSystem(new ProjectileSystem());
    world.addSystem(new MaterialPhysicsSystem());
    world.addSystem(collisionSystem);
    world.addSystem(new MaterialSpawnSystem(combatLayer));
    world.addSystem(renderSystem);

    waveSystem.startWave(1);
    enemySystem.startWave(1, state.dangerLevel);
    hudSystem = new HUDSystem(combatLayer);
  }

  function clearCombat(): void {
    if (hudSystem) {
      hudSystem.container.destroy({ children: true });
      hudSystem = null;
    }
    world?.clear();
    world = null;
    waveSystem = null;
    enemySystem = null;
    collisionSystem = null;
    renderSystem = null;
    if (waveCompleteText) {
      combatLayer.removeChild(waveCompleteText);
      waveCompleteText.destroy();
      waveCompleteText = null;
    }
  }

  events.on(EVENTS.PHASE_CHANGE, (phase: GamePhase, data?: any) => {
    state.phase = phase;
    switch (phase) {
      case "title": {
        clearCombat();
        combatLayer.removeChildren();
        showMeta(new TitleScreen(events).container);
        break;
      }
      case "weapon-select": {
        state.dangerLevel = data;
        showMeta(new WeaponSelectScreen(events).container);
        break;
      }
      case "combat": {
        initCombat(data);
        break;
      }
      case "game-over": {
        clearCombat();
        showMeta(new GameOverScreen(events, state.wave, state.materials, state.dangerLevel).container);
        break;
      }
    }
  });

  window.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && waveTransitionTimer > 0) {
      startLevelUpFlow();
    }
    if (e.key === "§") statsWidget.toggle();
    if (e.key === "Escape" && state.phase === "combat" && waveTransitionTimer <= 0) {
      clearCombat();
      events.emit(EVENTS.PHASE_CHANGE, "game-over");
    }
  });

  initKeyboard();
  events.emit(EVENTS.PHASE_CHANGE, "title");

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 0.1);
    if (state.phase !== "combat" || !world || !waveSystem || !enemySystem || !collisionSystem || !hudSystem || !renderSystem) return;

    state.elapsed += dt;

    waveSystem.update(world, dt);

    if (waveSystem.isOver) {
      if (waveTransitionTimer <= 0) {
        enemySystem.startWave(0, 0); // stop spawning
        const harvested = harvestMaterials(world, state.playerStats.harvestPercent);
        if (harvested > 0) {
          state.materials += harvested;
          state.xp += harvested * XP_PER_MATERIAL;
        }

        if (waveSystem.isLastWave) {
          events.emit(EVENTS.PHASE_CHANGE, "game-over");
          return;
        }

        waveCompleteText = new Text({
          text: `WAVE ${state.wave} COMPLETE\nMaterials +${harvested}\nPress SPACE to continue`,
          style: { fontFamily: "monospace", fontSize: 36, fill: 0xffffff, align: "center" },
        });
        waveCompleteText.anchor.set(0.5, 0.5);
        waveCompleteText.x = ARENA_WIDTH / 2;
        waveCompleteText.y = ARENA_HEIGHT / 2;
        combatLayer.addChild(waveCompleteText);

        waveTransitionTimer = 60;
        world.flush((e) => {
          if (world?.has(e, C.Render)) {
            const r = world?.get<RenderComponent>(e, C.Render);
            if (r?.gfx?.parent) r.gfx.parent.removeChild(r.gfx);
            r?.gfx?.destroy(true);
          }
        });
      }

      waveTransitionTimer -= dt;
      hudSystem.setWaveText(`Wave ${state.wave} / 20`);
      hudSystem.setTimerText("0s");
      hudSystem.setMatText(`Mats: ${state.materials}`);
      const names = state.equippedWeapons.filter(Boolean).map(w => w!.name).join(", ");
      hudSystem.setWeaponText(names || "No weapon");
      hudSystem.update(world, dt);
      statsWidget.update(app.ticker.FPS, { enemies: 0, projectiles: 0, materials: 0 });
      return;
    }

    world.update(dt, (e) => {
      if (world?.has(e, C.Render)) {
        const r = world?.get<RenderComponent>(e, C.Render);
        if (r?.gfx?.parent) r.gfx.parent.removeChild(r.gfx);
        r?.gfx?.destroy(true);
      }
    });

    // Material collection + XP
    if (collisionSystem.materialsCollected > 0) {
      state.materials += collisionSystem.materialsCollected;
      state.xp += collisionSystem.materialsCollected * XP_PER_MATERIAL;
      const needed = XP_PER_LEVEL + (state.level - 1) * XP_LEVEL_SCALE;
      while (state.xp >= needed) {
        state.xp -= needed;
        state.level++;
        state.levelUpsPending++;
      }
    }

    // Player death check
    if (state.playerStats.currentHp <= 0) {
      clearCombat();
      events.emit(EVENTS.PHASE_CHANGE, "game-over");
      return;
    }

    // HUD
    const waveTimerActive = Math.max(0, Math.ceil(waveSystem.timer));
    hudSystem.setWaveText(`Wave ${state.wave} / 20`);
    hudSystem.setTimerText(`${waveTimerActive}s`);
    hudSystem.setMatText(`Mats: ${state.materials}`);
    const names = state.equippedWeapons.filter(Boolean).map(w => w!.name).join(", ");
    hudSystem.setWeaponText(names || "No weapon");
    hudSystem.update(world, dt);

    statsWidget.update(app.ticker.FPS, {
      enemies: world.query(C.Enemy).length,
      projectiles: world.query(C.Projectile).length,
      materials: countMaterials(world),
    });
  });
}

init();
