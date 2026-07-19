import { Graphics, type Container } from "pixi.js";
import {
  ENEMY_SIZE, ENEMY_BASE_HP, ENEMY_BASE_DAMAGE, ENEMY_BASE_SPEED,
  ENEMY_SPEED_SCALE, ENEMY_SHOOT_COOLDOWN, ENEMY_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_SIZE, ENEMY_PROJECTILE_COLOR,
  ARENA_WIDTH, ARENA_HEIGHT, WAVE_SPAWN_INTERVAL,
  ENEMY_BASE_COUNT, DANGER_MULTIPLIERS,
} from "./params";
import type { ProjectileManager } from "./projectile";
import { createProjectile } from "./projectile";

export enum EnemyBehavior {
  Chase = "chase",
  Random = "random",
  Stationary = "stationary",
}

export class Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  behavior: EnemyBehavior;
  active = true;
  shootTimer: number;
  shootCooldown: number;
  private gfx: Graphics;
  private hpBarFill: Graphics;

  constructor(x: number, y: number, wave: number, dangerLevel: number, behavior: EnemyBehavior) {
    this.x = x;
    this.y = y;
    this.behavior = behavior;

    const d = DANGER_MULTIPLIERS[dangerLevel];
    this.maxHp = ENEMY_BASE_HP * d.enemyHp;
    this.hp = this.maxHp;
    this.speed = ENEMY_BASE_SPEED * d.enemySpeed * (1 + (wave - 1) * ENEMY_SPEED_SCALE);
    this.contactDamage = ENEMY_BASE_DAMAGE * d.enemyDmg;
    this.shootCooldown = ENEMY_SHOOT_COOLDOWN + Math.random();

    this.shootTimer = Math.random() * this.shootCooldown;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 1 + Math.random() * 2;

    const color = behavior === EnemyBehavior.Chase ? 0xff4444
      : behavior === EnemyBehavior.Random ? 0xff8844
      : 0xcc4444;

    this.gfx = new Graphics();
    this.gfx.circle(0, 0, ENEMY_SIZE / 2).fill({ color });
    this.gfx.x = x;
    this.gfx.y = y;

    this.hpBarFill = new Graphics()
      .rect(-ENEMY_SIZE / 2, -ENEMY_SIZE / 2 - 6, ENEMY_SIZE, 3)
      .fill({ color: 0xff3333 });
    this.gfx.addChild(this.hpBarFill);
  }

  private wanderAngle = 0;
  private wanderTimer = 0;

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return;

    switch (this.behavior) {
      case EnemyBehavior.Chase: {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * this.speed * dt;
        }
        break;
      }
      case EnemyBehavior.Random: {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderAngle = Math.random() * Math.PI * 2;
          this.wanderTimer = 1 + Math.random() * 2;
        }
        this.x += Math.cos(this.wanderAngle) * this.speed * dt * 0.6;
        this.y += Math.sin(this.wanderAngle) * this.speed * dt * 0.6;
        break;
      }
      case EnemyBehavior.Stationary:
        break;
    }

    this.x = Math.max(ENEMY_SIZE / 2, Math.min(ARENA_WIDTH - ENEMY_SIZE / 2, this.x));
    this.y = Math.max(ENEMY_SIZE / 2, Math.min(ARENA_HEIGHT - ENEMY_SIZE / 2, this.y));
    this.gfx.x = this.x;
    this.gfx.y = this.y;
  }

  takeDamage(dmg: number): boolean {
    this.hp -= dmg;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill
      .clear()
      .rect(-ENEMY_SIZE / 2, -ENEMY_SIZE / 2 - 6, ENEMY_SIZE * pct, 3)
      .fill({ color: 0xff3333 });
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  destroy(): void {
    this.gfx.destroy({ children: true });
  }

  getGraphics(): Graphics {
    return this.gfx;
  }
}

export class EnemyManager {
  enemies: Enemy[] = [];
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

  spawnUpdate(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemiesToSpawn > 0) {
      this.spawnTimer = WAVE_SPAWN_INTERVAL;
      const batch = Math.min(5, this.enemiesToSpawn);
      for (let i = 0; i < batch; i++) {
        this.spawnEnemy();
      }
      this.enemiesToSpawn -= batch;
    }
  }

  update(dt: number, playerX: number, playerY: number, pm: ProjectileManager): void {
    for (const e of this.enemies) {
      e.update(dt, playerX, playerY);
      if (e.active && e.behavior !== EnemyBehavior.Chase) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootCooldown;
          const angle = Math.atan2(playerY - e.y, playerX - e.x);
          const vx = Math.cos(angle) * ENEMY_PROJECTILE_SPEED;
          const vy = Math.sin(angle) * ENEMY_PROJECTILE_SPEED;
          pm.add(createProjectile(
            e.x, e.y, vx, vy, e.contactDamage, 800,
            ENEMY_PROJECTILE_SIZE, ENEMY_PROJECTILE_COLOR, false,
          ));
        }
      }
    }
  }

  private spawnEnemy(): void {
    const behaviors = [EnemyBehavior.Chase, EnemyBehavior.Random, EnemyBehavior.Stationary];
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

    const enemy = new Enemy(x, y, this.currentWave, this.currentDanger, behavior);
    this.enemies.push(enemy);
    this.container.addChild(enemy.getGraphics());
  }

  removeDead(): Enemy[] {
    const dead = this.enemies.filter(e => !e.active);
    for (const e of dead) {
      this.container.removeChild(e.getGraphics());
      e.destroy();
    }
    this.enemies = this.enemies.filter(e => e.active);
    return dead;
  }

  clear(): void {
    for (const e of this.enemies) {
      this.container.removeChild(e.getGraphics());
      e.destroy();
    }
    this.enemies.length = 0;
  }
}
