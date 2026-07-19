import {
  ENEMY_SIZE, ENEMY_BASE_HP, ENEMY_BASE_DAMAGE, ENEMY_BASE_SPEED,
  ENEMY_SPEED_SCALE, ENEMY_SHOOT_COOLDOWN, ENEMY_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_SIZE, ENEMY_PROJECTILE_COLOR,
  ARENA_WIDTH, ARENA_HEIGHT, WAVE_SPAWN_INTERVAL,
  ENEMY_BASE_COUNT, DANGER_MULTIPLIERS,
} from "../params";
import { C, type TransformComponent, type EnemyComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";
import { Graphics, type Container } from "pixi.js";
import { createProjectileData } from "./ProjectileSystem";

export class EnemySystem implements System {
  private spawnTimer = 0;
  private enemiesToSpawn = 0;
  private currentWave = 1;
  private currentDanger = 0;
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  startWave(wave: number, dangerLevel: number): void {
    this.currentWave = wave;
    this.currentDanger = dangerLevel;
    this.spawnTimer = 0;
    this.enemiesToSpawn = ENEMY_BASE_COUNT * wave;
  }

  get isSpawningDone(): boolean {
    return this.enemiesToSpawn <= 0;
  }

  update(world: World, dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemiesToSpawn > 0) {
      this.spawnTimer = WAVE_SPAWN_INTERVAL;
      const batch = Math.min(5, this.enemiesToSpawn);
      for (let i = 0; i < batch; i++) this.spawnEnemy(world);
      this.enemiesToSpawn -= batch;
    }

    for (const e of world.query(C.Enemy, C.Transform)) {
      if (!world.has(e, C.Enemy)) continue;
      const t = world.get<TransformComponent>(e, C.Transform);
      const en = world.get<EnemyComponent>(e, C.Enemy);
      const playerEnts = world.query(C.Player, C.Transform);
      let px = 0, py = 0;
      if (playerEnts.length > 0) {
        const pt = world.get<TransformComponent>(playerEnts[0], C.Transform);
        px = pt.x; py = pt.y;
      }

      switch (en.behavior) {
        case "chase": {
          const dx = px - t.x;
          const dy = py - t.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            t.x += (dx / dist) * en.speed * dt;
            t.y += (dy / dist) * en.speed * dt;
          }
          break;
        }
        case "random": {
          en.wanderTimer -= dt;
          if (en.wanderTimer <= 0) {
            en.wanderAngle = Math.random() * Math.PI * 2;
            en.wanderTimer = 1 + Math.random() * 2;
          }
          t.x += Math.cos(en.wanderAngle) * en.speed * dt * 0.6;
          t.y += Math.sin(en.wanderAngle) * en.speed * dt * 0.6;
          break;
        }
        case "stationary":
          break;
      }

      t.x = Math.max(ENEMY_SIZE / 2, Math.min(ARENA_WIDTH - ENEMY_SIZE / 2, t.x));
      t.y = Math.max(ENEMY_SIZE / 2, Math.min(ARENA_HEIGHT - ENEMY_SIZE / 2, t.y));

      if (en.behavior !== "chase") {
        en.fireTimer -= dt;
        if (en.fireTimer <= 0) {
          en.fireTimer = en.fireCooldown;
          const angle = Math.atan2(py - t.y, px - t.x);
          const vx = Math.cos(angle) * ENEMY_PROJECTILE_SPEED;
          const vy = Math.sin(angle) * ENEMY_PROJECTILE_SPEED;
          const pe = world.entity();
          const gfx = new Graphics().circle(0, 0, ENEMY_PROJECTILE_SIZE).fill({ color: ENEMY_PROJECTILE_COLOR });
          this.container.addChild(gfx);
          world.add(pe, C.Transform, { x: t.x, y: t.y });
          world.add(pe, C.Velocity, { vx, vy });
          world.add(pe, C.Render, { gfx });
          world.add(pe, C.Collider, { radius: ENEMY_PROJECTILE_SIZE });
          world.add(pe, C.Projectile, createProjectileData(en.contactDamage, 800, ENEMY_PROJECTILE_SIZE, ENEMY_PROJECTILE_COLOR, false));
        }
      }
    }
  }

  private spawnEnemy(world: World): void {
    const behaviors: ("chase" | "random" | "stationary")[] = ["chase", "random", "stationary"];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

    let x: number, y: number;
    const side = Math.floor(Math.random() * 4);
    const margin = 40;
    switch (side) {
      case 0: x = Math.random() * ARENA_WIDTH; y = -margin; break;
      case 1: x = ARENA_WIDTH + margin; y = Math.random() * ARENA_HEIGHT; break;
      case 2: x = Math.random() * ARENA_WIDTH; y = ARENA_HEIGHT + margin; break;
      default: x = -margin; y = Math.random() * ARENA_HEIGHT; break;
    }

    const d = DANGER_MULTIPLIERS[this.currentDanger];
    const maxHp = ENEMY_BASE_HP * d.enemyHp;
    const speed = ENEMY_BASE_SPEED * d.enemySpeed * (1 + (this.currentWave - 1) * ENEMY_SPEED_SCALE);
    const contactDamage = ENEMY_BASE_DAMAGE * d.enemyDmg;

    const color = behavior === "chase" ? 0xff4444
      : behavior === "random" ? 0xff8844
      : 0xcc4444;

    const gfx = new Graphics().circle(0, 0, ENEMY_SIZE / 2).fill({ color });
    const hpBarFill = new Graphics()
      .rect(-ENEMY_SIZE / 2, -ENEMY_SIZE / 2 - 6, ENEMY_SIZE, 3)
      .fill({ color: 0xff3333 });
    gfx.addChild(hpBarFill);
    this.container.addChild(gfx);

    const e = world.entity();
    world.add(e, C.Transform, { x, y });
    world.add(e, C.Render, { gfx, hpBar: hpBarFill });
    world.add(e, C.Collider, { radius: ENEMY_SIZE / 2 });
    world.add(e, C.Health, { current: maxHp, max: maxHp });
    world.add(e, C.Enemy, {
      behavior,
      contactDamage,
      fireTimer: Math.random() * ENEMY_SHOOT_COOLDOWN,
      fireCooldown: ENEMY_SHOOT_COOLDOWN + Math.random(),
      speed,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 1 + Math.random() * 2,
    });
  }
}
