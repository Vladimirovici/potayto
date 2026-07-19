import { Graphics, type Container } from "pixi.js";

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distTraveled: number;
  size: number;
  color: number;
  graphics: Graphics;
  isPlayer: boolean;
  pierce: boolean;
  hitEnemies: Set<any>;
  aoeRadius: number;
  homing: boolean;
  active: boolean;
}

export function createProjectile(
  x: number, y: number, vx: number, vy: number,
  damage: number, range: number, size: number, color: number,
  isPlayer: boolean, opts?: { pierce?: boolean; aoeRadius?: number; homing?: boolean },
): Projectile {
  const gfx = new Graphics().circle(0, 0, size).fill({ color });
  gfx.x = x;
  gfx.y = y;

  return {
    x, y, vx, vy, damage, range, distTraveled: 0,
    size, color, graphics: gfx, isPlayer,
    pierce: opts?.pierce ?? false,
    hitEnemies: new Set(),
    aoeRadius: opts?.aoeRadius ?? 0,
    homing: opts?.homing ?? false,
    active: true,
  };
}

export class ProjectileManager {
  projectiles: Projectile[] = [];
  container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  add(p: Projectile): void {
    this.projectiles.push(p);
    this.container.addChild(p.graphics);
  }

  update(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.destroy(i);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.distTraveled += Math.hypot(p.vx * dt, p.vy * dt);
      p.graphics.x = p.x;
      p.graphics.y = p.y;
      if (p.distTraveled >= p.range) {
        this.destroy(i);
      }
    }
  }

  private destroy(index: number): void {
    const p = this.projectiles[index];
    this.container.removeChild(p.graphics);
    p.graphics.destroy();
    this.projectiles.splice(index, 1);
  }

  clear(): void {
    for (const p of this.projectiles) {
      this.container.removeChild(p.graphics);
      p.graphics.destroy();
    }
    this.projectiles.length = 0;
  }
}
