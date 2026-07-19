import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_SIZE } from "../params";
import { C, type TransformComponent, type StatsComponent, type PlayerComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";

export const keys: Record<string, boolean> = {};
export function initKeyboard(): void {
  window.addEventListener("keydown", (e) => { keys[e.key] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });
}

export class PlayerInputSystem implements System {
  update(world: World, dt: number): void {
    for (const e of world.query(C.Player, C.Transform, C.Stats)) {
      const t = world.get<TransformComponent>(e, C.Transform);
      const s = world.get<StatsComponent>(e, C.Stats);
      const p = world.get<PlayerComponent>(e, C.Player);

      let dx = 0, dy = 0;
      if (keys["w"] || keys["ArrowUp"]) dy = -1;
      if (keys["s"] || keys["ArrowDown"]) dy = 1;
      if (keys["a"] || keys["ArrowLeft"]) dx = -1;
      if (keys["d"] || keys["ArrowRight"]) dx = 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
        t.x += dx * s.speed * dt;
        t.y += dy * s.speed * dt;
      }

      t.x = Math.max(PLAYER_SIZE / 2, Math.min(ARENA_WIDTH - PLAYER_SIZE / 2, t.x));
      t.y = Math.max(PLAYER_SIZE / 2, Math.min(ARENA_HEIGHT - PLAYER_SIZE / 2, t.y));

      if (s.hpRegen > 0 && s.currentHp < s.maxHp)
        s.currentHp = Math.min(s.maxHp, s.currentHp + s.hpRegen * dt);
      if (p.invTimer > 0) p.invTimer -= dt;
    }
  }
}
