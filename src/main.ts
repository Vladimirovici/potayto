import { Application, Container, Text } from "pixi.js";
import { createArena } from "./arena";
import { circlesOverlap } from "./collision";
import { EnemyManager } from "./enemies";
import { EVENTS, EventBus, type GamePhase } from "./events";
import { GameOverScreen } from "./gameover";
import { HUD } from "./hud";
import { LevelUpScreen } from "./levelup";
import { MaterialManager } from "./materials";
import { ARENA_HEIGHT, ARENA_WIDTH, ENEMY_SIZE, INV_FRAMES_DURATION, MATERIALS_PER_KILL, XP_LEVEL_SCALE, XP_PER_LEVEL, XP_PER_MATERIAL } from "./params";
import { Player, initKeyboard } from "./player";
import { ProjectileManager } from "./projectile";
import { ShopScreen } from "./shop";
import { createInitialState } from "./state";
import { StatsWidget } from "./stats";
import { TitleScreen } from "./title";
import { WaveManager } from "./waves";
import { WeaponSystem, findClosestEnemyPos } from "./weapons";
import { WeaponSelectScreen } from "./weaponselect";

const events = new EventBus();
let state = createInitialState();

function applyDamage(raw: number, armor: number): number {
  return raw * (1 - armor);
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

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

  function showMeta(container: Container) {
    combatLayer.visible = false;
    combatLayer.removeChildren();
    screenLayer.visible = true;
    if (currentMeta) screenLayer.removeChild(currentMeta);
    screenLayer.addChild(container);
    currentMeta = container;
  }

  let player: Player | null = null;
  let hud: HUD | null = null;
  let projectileManager: ProjectileManager | null = null;
  let enemyManager: EnemyManager | null = null;
  let weaponSystem: WeaponSystem | null = null;
  let materialManager: MaterialManager | null = null;
  let waveManager: WaveManager | null = null;
  let waveTransitionTimer = 0;
  let waveCompleteText: Text | null = null;

  function startLevelUpFlow(): void {
    if (!materialManager || !enemyManager) return;
    enemyManager.clear();
    const harvested = materialManager.harvestRemaining(state.playerStats.harvestPercent);
    if (harvested > 0) {
      state.materials += harvested;
      state.xp += harvested * XP_PER_MATERIAL;
    }
    materialManager.clear();
    projectileManager?.clear();
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
    if (!waveManager || !enemyManager) return;
    waveManager.startWave(state.wave + 1);
    enemyManager.startWave(waveManager.wave, state.dangerLevel);
    state.wave = waveManager.wave;
    state.invFramesTimer = 0;
    state.phase = "combat";
    screenLayer.visible = false;
    combatLayer.visible = true;
    waveTransitionTimer = 0;
    if (waveCompleteText) {
      combatLayer.removeChild(waveCompleteText);
      waveCompleteText.destroy();
      waveCompleteText = null;
    }
  }

  function endWaveEarly(): void {
    if (!materialManager || !enemyManager) return;
    enemyManager.clear();
    materialManager.clear();
    projectileManager?.clear();
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

    projectileManager = new ProjectileManager(combatLayer);
    weaponSystem = new WeaponSystem();
    enemyManager = new EnemyManager(combatLayer);
    materialManager = new MaterialManager(combatLayer);
    waveManager = new WaveManager();
    waveManager.startWave(1);
    enemyManager.startWave(1, state.dangerLevel);
    player = new Player(combatLayer);
    hud = new HUD(combatLayer);
  }

  function clearCombat(): void {
    player?.destroy();
    enemyManager?.clear();
    projectileManager?.clear();
    materialManager?.clear();
    hud?.destroy();
    if (waveCompleteText) {
      combatLayer.removeChild(waveCompleteText);
      waveCompleteText.destroy();
      waveCompleteText = null;
    }
    player = null;
    enemyManager = null;
    projectileManager = null;
    weaponSystem = null;
    materialManager = null;
    waveManager = null;
    hud = null;
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
      endWaveEarly();
      events.emit(EVENTS.PHASE_CHANGE, "game-over");
    }
  });

  initKeyboard();
  events.emit(EVENTS.PHASE_CHANGE, "title");

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 0.1);
    if (state.phase !== "combat" || !player || !enemyManager || !projectileManager || !weaponSystem || !materialManager || !waveManager || !hud) return;

    state.elapsed += dt;

    waveManager.update(dt);

    if (waveManager.isOver) {
      if (waveTransitionTimer <= 0) {
        enemyManager.clear();
        const harvested = materialManager.harvestRemaining(state.playerStats.harvestPercent);
        if (harvested > 0) {
          state.materials += harvested;
          state.xp += harvested * XP_PER_MATERIAL;
        }
        projectileManager.clear();

        if (waveManager.isLastWave) {
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
      }

      waveTransitionTimer -= dt;
      hud.update(state, 0);
      statsWidget.update(app.ticker.FPS, { enemies: 0, projectiles: 0, materials: 0 });
      return;
    }

    enemyManager.spawnUpdate(dt);
    enemyManager.update(dt, player.x, player.y, projectileManager);
    player.update(dt, state.playerStats);

    weaponSystem.update(dt, state, enemyManager.enemies, projectileManager, player.x, player.y);

    for (const p of projectileManager.projectiles) {
      if (!p.active || !p.homing) continue;
      const tgt = findClosestEnemyPos(
        enemyManager.enemies.map(e => ({ x: e.x, y: e.y, active: e.active })),
        p.x, p.y,
      );
      if (tgt) {
        const angle = Math.atan2(tgt.y - p.y, tgt.x - p.x);
        const speed = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
    }

    projectileManager.update(dt);

    materialManager.update(dt, player.x, player.y, state.playerStats.collectRadius, state.playerStats.speed);
    const collected = materialManager.collectCount;
    if (collected > 0) {
      state.materials += collected;
      state.xp += collected * XP_PER_MATERIAL;
      const needed = XP_PER_LEVEL + (state.level - 1) * XP_LEVEL_SCALE;
      while (state.xp >= needed) {
        state.xp -= needed;
        state.level++;
        state.levelUpsPending++;
      }
    }
    materialManager.removeCollected();

    for (const hit of weaponSystem.getAndClearMeleeHits()) {
      for (const e of enemyManager.enemies) {
        if (!e.active) continue;
        const dist = Math.hypot(e.x - hit.px, e.y - hit.py);
        if (dist > hit.range) continue;
        const a2e = Math.atan2(e.y - hit.py, e.x - hit.px);
        if (Math.abs(normalizeAngle(a2e - hit.angle)) > (hit.arc / 2) * (Math.PI / 180)) continue;
        e.takeDamage(hit.damage);
        state.playerStats.currentHp = Math.min(state.playerStats.maxHp, state.playerStats.currentHp + hit.damage * state.playerStats.lifeSteal);
      }
    }

    for (const p of projectileManager.projectiles) {
      if (!p.active || !p.isPlayer) continue;
      for (const e of enemyManager.enemies) {
        if (!e.active) continue;
        if (p.hitEnemies.has(e)) continue;
        if (!circlesOverlap({ x: p.x, y: p.y, radius: p.size }, { x: e.x, y: e.y, radius: ENEMY_SIZE / 2 })) continue;
        e.takeDamage(p.damage);
        state.playerStats.currentHp = Math.min(state.playerStats.maxHp, state.playerStats.currentHp + p.damage * state.playerStats.lifeSteal);
        p.hitEnemies.add(e);
        if (p.aoeRadius > 0) {
          for (const o of enemyManager.enemies) {
            if (o === e || !o.active) continue;
            if (Math.hypot(o.x - p.x, o.y - p.y) < p.aoeRadius) {
              o.takeDamage(p.damage);
              state.playerStats.currentHp = Math.min(state.playerStats.maxHp, state.playerStats.currentHp + p.damage * state.playerStats.lifeSteal);
            }
          }
        }
        if (!p.pierce) p.active = false;
        if (!p.active) break;
      }
    }

    for (const p of projectileManager.projectiles) {
      if (!p.active || p.isPlayer) continue;
      if (state.invFramesTimer > 0) continue;
      if (!circlesOverlap({ x: p.x, y: p.y, radius: p.size }, { x: player.x, y: player.y, radius: player.getRadius() })) continue;
      if (Math.random() >= state.playerStats.dodge) {
        state.playerStats.currentHp -= applyDamage(p.damage, state.playerStats.armor);
        state.invFramesTimer = INV_FRAMES_DURATION;
      }
      p.active = false;
    }

    for (const e of enemyManager.enemies) {
      if (!e.active) continue;
      if (state.invFramesTimer > 0) continue;
      if (!circlesOverlap({ x: e.x, y: e.y, radius: ENEMY_SIZE / 2 }, { x: player.x, y: player.y, radius: player.getRadius() })) continue;
      if (Math.random() >= state.playerStats.dodge) {
        state.playerStats.currentHp -= applyDamage(e.contactDamage, state.playerStats.armor);
        state.invFramesTimer = INV_FRAMES_DURATION;
      }
    }

    const dead = enemyManager.removeDead();
    for (const d of dead) materialManager.spawn(d.x, d.y, MATERIALS_PER_KILL);

    if (state.playerStats.currentHp <= 0) {
      endWaveEarly();
      events.emit(EVENTS.PHASE_CHANGE, "game-over");
      return;
    }

    if (state.playerStats.hpRegen > 0)
      state.playerStats.currentHp = Math.min(state.playerStats.maxHp, state.playerStats.currentHp + state.playerStats.hpRegen * dt);
    if (state.invFramesTimer > 0) state.invFramesTimer -= dt;

    player.graphics.alpha = state.invFramesTimer > 0 && Math.floor(state.invFramesTimer * 10) % 2 === 0 ? 0.3 : 1;

    hud.update(state, waveManager.timer);

    statsWidget.update(app.ticker.FPS, {
      enemies: enemyManager.enemies.filter(e => e.active).length,
      projectiles: projectileManager.projectiles.length,
      materials: materialManager.orbs.filter(o => !o.collected).length,
    });
  });
}

init();
