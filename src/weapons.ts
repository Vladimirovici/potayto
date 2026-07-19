import type { GameState } from "./state";
import type { ProjectileManager } from "./projectile";
import { createProjectile } from "./projectile";

export interface MeleeHit {
  px: number;
  py: number;
  angle: number;
  range: number;
  arc: number;
  damage: number;
}

export class WeaponSystem {
  private fireCooldowns: number[] = new Array(6).fill(0);
  private meleeHits: MeleeHit[] = [];

  update(
    dt: number, state: GameState,
    enemies: { x: number; y: number; active: boolean }[],
    pm: ProjectileManager, px: number, py: number,
  ): void {
    this.meleeHits = [];

    for (let i = 0; i < state.equippedWeapons.length; i++) {
      const w = state.equippedWeapons[i];
      if (!w) continue;

      this.fireCooldowns[i] -= dt;
      if (this.fireCooldowns[i] > 0) continue;

      const target = findClosestEnemy(enemies, px, py, w.bulletRange);
      if (!target) continue;

      this.fireCooldowns[i] = 1 / w.fireRate * (1 / state.playerStats.attackSpeed);

      const angle = Math.atan2(target.y - py, target.x - px);

      if (w.melee) {
        this.meleeHits.push({ px, py, angle, range: w.bulletRange, arc: w.meleeArc!, damage: w.damage });
        continue;
      }

      const pellets = w.pellets ?? 1;
      const spread = w.spreadAngle ?? 0;

      for (let j = 0; j < pellets; j++) {
        let a = angle;
        if (pellets > 1) {
          a += (j / (pellets - 1) - 0.5) * spread * (Math.PI / 180);
        }
        const vx = Math.cos(a) * w.bulletSpeed;
        const vy = Math.sin(a) * w.bulletSpeed;

        pm.add(createProjectile(
          px, py, vx, vy,
          w.damage, w.bulletRange, w.bulletSize, w.bulletColor, true,
          { pierce: w.pierce, aoeRadius: w.aoeRadius, homing: w.homing },
        ));
      }
    }
  }

  getAndClearMeleeHits(): MeleeHit[] {
    const hits = this.meleeHits;
    this.meleeHits = [];
    return hits;
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
    if (d < minDist) {
      minDist = d;
      closest = e;
    }
  }
  return closest;
}

export function findClosestEnemyPos(
  enemies: { x: number; y: number; active: boolean }[],
  px: number, py: number,
): { x: number; y: number } | null {
  let closest: { x: number; y: number } | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - px, e.y - py);
    if (d < minDist) {
      minDist = d;
      closest = e;
    }
  }
  return closest;
}
