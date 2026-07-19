import { Graphics, type Container } from "pixi.js";
import { C, type TransformComponent, type StatsComponent, type WeaponSlotsComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";
import { createProjectileData } from "./ProjectileSystem";

export class WeaponSystem implements System {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  update(world: World, dt: number): void {
    const enemies = world.query(C.Enemy, C.Transform);
    const enemyPositions = enemies.map(e => {
      const t = world.get<TransformComponent>(e, C.Transform);
      return { x: t.x, y: t.y, active: true };
    });

    for (const pe of world.query(C.Player, C.Transform, C.Stats, C.WeaponSlots)) {
      const pt = world.get<TransformComponent>(pe, C.Transform);
      const s = world.get<StatsComponent>(pe, C.Stats);
      const ws = world.get<WeaponSlotsComponent>(pe, C.WeaponSlots);

      ws.meleeHits = [];

      for (let i = 0; i < ws.weapons.length; i++) {
        const w = ws.weapons[i];
        if (!w) continue;

        ws.cooldowns[i] -= dt;
        if (ws.cooldowns[i] > 0) continue;

        const target = findClosestEnemy(enemyPositions, pt.x, pt.y, w.bulletRange);
        if (!target) continue;

        ws.cooldowns[i] = 1 / w.fireRate * (1 / s.attackSpeed);

        const angle = Math.atan2(target.y - pt.y, target.x - pt.x);

        if (w.melee) {
          ws.meleeHits.push({ px: pt.x, py: pt.y, angle, range: w.bulletRange, arc: w.meleeArc!, damage: w.damage });
          continue;
        }

        const pellets = w.pellets ?? 1;
        const spread = w.spreadAngle ?? 0;

        for (let j = 0; j < pellets; j++) {
          let a = angle;
          if (pellets > 1) a += (j / (pellets - 1) - 0.5) * spread * (Math.PI / 180);
          const vx = Math.cos(a) * w.bulletSpeed;
          const vy = Math.sin(a) * w.bulletSpeed;

          const pe2 = world.entity();
          const gfx = new Graphics().circle(0, 0, w.bulletSize).fill({ color: w.bulletColor });
          this.container.addChild(gfx);
          world.add(pe2, C.Transform, { x: pt.x, y: pt.y });
          world.add(pe2, C.Velocity, { vx, vy });
          world.add(pe2, C.Render, { gfx });
          world.add(pe2, C.Collider, { radius: w.bulletSize });
          world.add(pe2, C.Projectile, createProjectileData(
            w.damage, w.bulletRange, w.bulletSize, w.bulletColor, true,
            { pierce: w.pierce, aoeRadius: w.aoeRadius, homing: w.homing },
          ));
        }
      }
    }
  }
}

function findClosestEnemy(
  enemies: { x: number; y: number; active: boolean }[],
  px: number, py: number, range: number,
): { x: number; y: number } | null {
  let closest: { x: number; y: number } | null = null;
  let minDist = range;
  for (const e of enemies) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - px, e.y - py);
    if (d < minDist) { minDist = d; closest = e; }
  }
  return closest;
}
