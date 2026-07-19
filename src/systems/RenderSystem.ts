import { Graphics } from "pixi.js";
import { PLAYER_COLOR, PLAYER_SIZE } from "../params";
import { C, type TransformComponent, type RenderComponent, type StatsComponent, type PlayerComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";

export class RenderSystem implements System {
  private playerGfx: Graphics | null = null;
  private playerHpBarFill: Graphics | null = null;
  private playerEnt = -1;

  init(world: World): void {
    for (const e of world.query(C.Player, C.Render)) {
      this.playerEnt = e;
      const r = world.get<RenderComponent>(e, C.Render);
      this.playerGfx = r.gfx;
    }
  }

  update(world: World, _dt: number): void {
    // Sync all Render → Transform
    for (const e of world.query(C.Render, C.Transform)) {
      const r = world.get<RenderComponent>(e, C.Render);
      const t = world.get<TransformComponent>(e, C.Transform);
      r.gfx.x = t.x;
      r.gfx.y = t.y;
    }

    // Player HP bar + flash
    if (this.playerGfx && world.has(this.playerEnt, C.Player) && world.has(this.playerEnt, C.Stats)) {
      const p = world.get<PlayerComponent>(this.playerEnt, C.Player);
      const s = world.get<StatsComponent>(this.playerEnt, C.Stats);

      const hpPct = Math.max(0, s.currentHp / s.maxHp);
      this.playerGfx.alpha = p.invTimer > 0 && Math.floor(p.invTimer * 10) % 2 === 0 ? 0.3 : 1;

      if (this.playerHpBarFill) {
        this.playerHpBarFill
          .clear()
          .rect(0, 0, 40 * hpPct, 5)
          .fill({ color: hpPct > 0.5 ? 0x00ff44 : hpPct > 0.25 ? 0xffaa00 : 0xff3333 });
      }
    }
  }

  createPlayerGraphics(world: World, container: any): number {
    const e = world.entity();
    const gfx = new Graphics().circle(0, 0, PLAYER_SIZE / 2).fill({ color: PLAYER_COLOR });
    const hpBarBg = new Graphics().rect(0, 0, 40, 5).fill({ color: 0x333333 });
    const hpBarFill = new Graphics().rect(0, 0, 40, 5).fill({ color: 0x00ff44 });

    world.add(e, C.Transform, { x: 0, y: 0 });
    world.add(e, C.Render, { gfx });
    world.add(e, C.Collider, { radius: PLAYER_SIZE / 2 });
    world.add(e, C.Player, { invTimer: 0, flashTimer: 0 });

    this.playerEnt = e;
    this.playerGfx = gfx;
    this.playerHpBarFill = hpBarFill;

    container.addChild(gfx, hpBarBg, hpBarFill);
    return e;
  }
}

export function addToContainer(world: World, container: any): void {
  for (const e of world.query(C.Render)) {
    const r = world.get<RenderComponent>(e, C.Render);
    container.addChild(r.gfx);
  }
}
