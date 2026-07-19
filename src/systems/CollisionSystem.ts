import {
  ENEMY_SIZE, PLAYER_SIZE, INV_FRAMES_DURATION,
} from "../params";
import {
  C, type TransformComponent, type HealthComponent, type StatsComponent,
  type ProjectileComponent, type EnemyComponent, type RenderComponent,
  type PlayerComponent, type WeaponSlotsComponent, type ColliderComponent,
} from "../ecs/Components";
import type { World, System, Entity } from "../ecs/World";

export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function applyDamage(raw: number, armor: number): number {
  return raw * (1 - armor);
}

const MATERIAL_RADIUS = 4;
const PLAYER_COLLECT_DIST = PLAYER_SIZE / 2 + MATERIAL_RADIUS;

export class CollisionSystem implements System {
  materialsCollected = 0;

  update(world: World, _dt: number): void {
    this.materialsCollected = 0;
    const playerEnts = world.query(C.Player, C.Transform, C.Stats, C.Player, C.WeaponSlots);
    if (playerEnts.length === 0) return;
    const pe = playerEnts[0];
    const pt = world.get<TransformComponent>(pe, C.Transform);
    const ps = world.get<StatsComponent>(pe, C.Stats);
    const pp = world.get<PlayerComponent>(pe, C.Player);
    const ws = world.get<WeaponSlotsComponent>(pe, C.WeaponSlots);

    // 1. Melee arc damage
    for (const hit of ws.meleeHits) {
      for (const ee of world.query(C.Enemy, C.Transform, C.Health)) {
        const et = world.get<TransformComponent>(ee, C.Transform);
        const dist = Math.hypot(et.x - hit.px, et.y - hit.py);
        if (dist > hit.range) continue;
        const a2e = Math.atan2(et.y - hit.py, et.x - hit.px);
        if (Math.abs(normalizeAngle(a2e - hit.angle)) > (hit.arc / 2) * (Math.PI / 180)) continue;
        damageEnemy(world, ee, hit.damage, ps);
      }
    }

    // 2. Player projectiles vs enemies
    for (const ppe of world.query(C.Projectile, C.Transform, C.Collider)) {
      const ppc = world.get<ProjectileComponent>(ppe, C.Projectile);
      if (!ppc.isPlayer) continue;
      const ppt = world.get<TransformComponent>(ppe, C.Transform);
      const ppcol = world.get<ColliderComponent>(ppe, C.Collider);

      for (const ee of world.query(C.Enemy, C.Transform, C.Health, C.Collider)) {
        if (ppc.hitEnemies.has(ee)) continue;
        const et = world.get<TransformComponent>(ee, C.Transform);
        const ecol = world.get<ColliderComponent>(ee, C.Collider);
        if (!circlesOverlap(ppt.x, ppt.y, ppcol.radius, et.x, et.y, ecol.radius)) continue;

        damageEnemy(world, ee, ppc.damage, ps);
        ppc.hitEnemies.add(ee);

        if (ppc.aoeRadius > 0) {
          for (const oe of world.query(C.Enemy, C.Transform, C.Health)) {
            if (oe === ee) continue;
            const ot = world.get<TransformComponent>(oe, C.Transform);
            if (Math.hypot(ot.x - ppt.x, ot.y - ppt.y) < ppc.aoeRadius)
              damageEnemy(world, oe, ppc.damage, ps);
          }
        }

        if (!ppc.pierce) { world.destroy(ppe); break; }
      }
    }

    // 3. Enemy projectiles vs player
    for (const epe of world.query(C.Projectile, C.Transform, C.Collider)) {
      const epc = world.get<ProjectileComponent>(epe, C.Projectile);
      if (epc.isPlayer) continue;
      if (pp.invTimer > 0) continue;
      const ept = world.get<TransformComponent>(epe, C.Transform);
      const epcol = world.get<ColliderComponent>(epe, C.Collider);
      if (!circlesOverlap(ept.x, ept.y, epcol.radius, pt.x, pt.y, PLAYER_SIZE / 2)) continue;

      if (Math.random() >= ps.dodge) {
        ps.currentHp -= applyDamage(epc.damage, ps.armor);
        pp.invTimer = INV_FRAMES_DURATION;
      }
      world.destroy(epe);
    }

    // 4. Enemy contact damage vs player
    for (const ee of world.query(C.Enemy, C.Transform, C.Enemy)) {
      if (pp.invTimer > 0) continue;
      const et = world.get<TransformComponent>(ee, C.Transform);
      const ec = world.get<EnemyComponent>(ee, C.Enemy);
      if (!circlesOverlap(et.x, et.y, ENEMY_SIZE / 2, pt.x, pt.y, PLAYER_SIZE / 2)) continue;

      if (Math.random() >= ps.dodge) {
        ps.currentHp -= applyDamage(ec.contactDamage, ps.armor);
        pp.invTimer = INV_FRAMES_DURATION;
      }
    }

    // 5. Player collects materials
    for (const me of world.query(C.Material, C.Transform)) {
      const mt = world.get<TransformComponent>(me, C.Transform);
      if (Math.hypot(mt.x - pt.x, mt.y - pt.y) < PLAYER_COLLECT_DIST) {
        world.destroy(me);
        this.materialsCollected++;
      }
    }
  }
}

function damageEnemy(world: World, ee: Entity, dmg: number, ps: StatsComponent): void {
  const h = world.get<HealthComponent>(ee, C.Health);
  h.current -= dmg;
  ps.currentHp = Math.min(ps.maxHp, ps.currentHp + dmg * ps.lifeSteal);
  const r = world.get<RenderComponent>(ee, C.Render);
  if (r.hpBar) {
    const pct = Math.max(0, h.current / h.max);
    r.hpBar.clear()
      .rect(-ENEMY_SIZE / 2, -ENEMY_SIZE / 2 - 6, ENEMY_SIZE * pct, 3)
      .fill({ color: 0xff3333 });
  }
}

export function getDeadEnemies(world: World): Entity[] {
  return world.query(C.Enemy, C.Transform, C.Health).filter(e => {
    const h = world.get<HealthComponent>(e, C.Health);
    return h.current <= 0;
  });
}
