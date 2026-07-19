import { C, type TransformComponent, type VelocityComponent, type ProjectileComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";

export function createProjectileData(
  damage: number, range: number, _size: number, _color: number, isPlayer: boolean,
  opts?: { pierce?: boolean; aoeRadius?: number; homing?: boolean },
): ProjectileComponent {
  return {
    damage,
    range,
    distTraveled: 0,
    isPlayer,
    pierce: opts?.pierce ?? false,
    aoeRadius: opts?.aoeRadius ?? 0,
    homing: opts?.homing ?? false,
    hitEnemies: new Set(),
  };
}

export class ProjectileSystem implements System {
  update(world: World, dt: number): void {
    for (const e of world.query(C.Projectile, C.Transform, C.Velocity)) {
      const t = world.get<TransformComponent>(e, C.Transform);
      const v = world.get<VelocityComponent>(e, C.Velocity);
      const p = world.get<ProjectileComponent>(e, C.Projectile);

      t.x += v.vx * dt;
      t.y += v.vy * dt;
      p.distTraveled += Math.hypot(v.vx * dt, v.vy * dt);

      if (p.distTraveled >= p.range) {
        world.destroy(e);
      }
    }
  }
}

export class HomingSystem implements System {
  update(world: World, _dt: number): void {
    const enemies = world.query(C.Enemy, C.Transform);
    if (enemies.length === 0) return;

    for (const e of world.query(C.Projectile, C.Transform, C.Velocity)) {
      const p = world.get<ProjectileComponent>(e, C.Projectile);
      if (!p.homing) continue;
      const t = world.get<TransformComponent>(e, C.Transform);
      const v = world.get<VelocityComponent>(e, C.Velocity);

      let closest: { x: number; y: number } | null = null;
      let minDist = Infinity;
      for (const ee of enemies) {
        const et = world.get<TransformComponent>(ee, C.Transform);
        const d = Math.hypot(et.x - t.x, et.y - t.y);
        if (d < minDist) { minDist = d; closest = et; }
      }
      if (closest) {
        const angle = Math.atan2(closest.y - t.y, closest.x - t.x);
        const speed = Math.hypot(v.vx, v.vy);
        v.vx = Math.cos(angle) * speed;
        v.vy = Math.sin(angle) * speed;
      }
    }
  }
}
