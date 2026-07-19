import { Graphics, type Container } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT, MATERIALS_PER_KILL } from "../params";
import { C, type TransformComponent, type StatsComponent, type VelocityComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";
import { getDeadEnemies } from "./CollisionSystem";

const ORB_RADIUS = 4;
const ORB_COLOR = 0xffdd44;
const SPREAD_SPEED = 100;
const SPREAD_DAMPING = 0.92;

export class MaterialSpawnSystem implements System {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  update(world: World, _dt: number): void {
    for (const ee of getDeadEnemies(world)) {
      const t = world.get<TransformComponent>(ee, C.Transform);
      for (let i = 0; i < MATERIALS_PER_KILL; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = SPREAD_SPEED * (0.5 + Math.random());
        const me = world.entity();
        const gfx = new Graphics().circle(0, 0, ORB_RADIUS).fill({ color: ORB_COLOR });
        this.container.addChild(gfx);
        world.add(me, C.Transform, { x: t.x, y: t.y });
        world.add(me, C.Velocity, { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
        world.add(me, C.Render, { gfx });
        world.add(me, C.Material, {});
        world.add(me, C.Collider, { radius: ORB_RADIUS });
      }
      world.destroy(ee);
    }
  }
}

export class MaterialPhysicsSystem implements System {
  update(world: World, dt: number): void {
    const playerEnts = world.query(C.Player, C.Transform, C.Stats);
    let px = 0, py = 0, collectRadius = 0, playerSpeed = 0;
    if (playerEnts.length > 0) {
      const pt = world.get<TransformComponent>(playerEnts[0], C.Transform);
      const ps = world.get<StatsComponent>(playerEnts[0], C.Stats);
      px = pt.x; py = pt.y; collectRadius = ps.collectRadius; playerSpeed = ps.speed;
    }

    for (const me of world.query(C.Material, C.Transform, C.Velocity)) {
      const t = world.get<TransformComponent>(me, C.Transform);
      const v = world.get<VelocityComponent>(me, C.Velocity);

      t.x += v.vx * dt;
      t.y += v.vy * dt;
      v.vx *= SPREAD_DAMPING;
      v.vy *= SPREAD_DAMPING;

      if (t.x < ORB_RADIUS) { t.x = ORB_RADIUS; v.vx *= -0.5; }
      if (t.x > ARENA_WIDTH - ORB_RADIUS) { t.x = ARENA_WIDTH - ORB_RADIUS; v.vx *= -0.5; }
      if (t.y < ORB_RADIUS) { t.y = ORB_RADIUS; v.vy *= -0.5; }
      if (t.y > ARENA_HEIGHT - ORB_RADIUS) { t.y = ARENA_HEIGHT - ORB_RADIUS; v.vy *= -0.5; }

      const dx = px - t.x;
      const dy = py - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist < collectRadius && dist > 0) {
        const pull = 1 - dist / collectRadius;
        const speed = playerSpeed * (1.2 + pull * 1.3);
        t.x += (dx / dist) * speed * dt;
        t.y += (dy / dist) * speed * dt;
      }
    }
  }
}

export function countMaterials(world: World): number {
  return world.query(C.Material).length;
}

export function harvestMaterials(world: World, pct: number): number {
  const mats = world.query(C.Material);
  const count = Math.floor(mats.length * pct);
  for (let i = 0; i < count; i++) world.destroy(mats[i]);
  return count;
}

export function clearMaterials(world: World): void {
  for (const me of world.query(C.Material)) world.destroy(me);
}
