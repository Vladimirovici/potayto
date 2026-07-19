import { Graphics, type Container } from "pixi.js";
import { PLAYER_SIZE, PLAYER_COLOR, ARENA_WIDTH, ARENA_HEIGHT } from "./params";
import type { PlayerStats } from "./state";

export const keys: Record<string, boolean> = {};
export function initKeyboard(): void {
  window.addEventListener("keydown", (e) => { keys[e.key] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });
}

export class Player {
  x: number;
  y: number;
  graphics: Graphics;
  private healthBarBg: Graphics;
  private healthBarFill: Graphics;
  private container: Container;

  constructor(container: Container) {
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;

    this.graphics = new Graphics()
      .circle(0, 0, PLAYER_SIZE / 2)
      .fill({ color: PLAYER_COLOR });

    this.healthBarBg = new Graphics()
      .rect(0, 0, 40, 5)
      .fill({ color: 0x333333 });
    this.healthBarFill = new Graphics()
      .rect(0, 0, 40, 5)
      .fill({ color: 0x00ff44 });

    this.container = container;
    container.addChild(this.graphics, this.healthBarBg, this.healthBarFill);
    this.syncPosition();
  }

  private syncPosition(): void {
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.healthBarBg.x = this.x - 20;
    this.healthBarBg.y = this.y - PLAYER_SIZE / 2 - 10;
    this.healthBarFill.x = this.healthBarBg.x;
    this.healthBarFill.y = this.healthBarBg.y;
  }

  update(dt: number, stats: PlayerStats): void {
    let dx = 0;
    let dy = 0;
    if (keys["w"] || keys["ArrowUp"]) dy = -1;
    if (keys["s"] || keys["ArrowDown"]) dy = 1;
    if (keys["a"] || keys["ArrowLeft"]) dx = -1;
    if (keys["d"] || keys["ArrowRight"]) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * stats.speed * dt;
      this.y += dy * stats.speed * dt;
    }

    this.x = Math.max(PLAYER_SIZE / 2, Math.min(ARENA_WIDTH - PLAYER_SIZE / 2, this.x));
    this.y = Math.max(PLAYER_SIZE / 2, Math.min(ARENA_HEIGHT - PLAYER_SIZE / 2, this.y));

    const hpPct = Math.max(0, stats.currentHp / stats.maxHp);
    this.healthBarFill
      .clear()
      .rect(0, 0, 40 * hpPct, 5)
      .fill({ color: hpPct > 0.5 ? 0x00ff44 : hpPct > 0.25 ? 0xffaa00 : 0xff3333 });

    this.syncPosition();
  }

  getRadius(): number {
    return PLAYER_SIZE / 2;
  }

  destroy(): void {
    this.container.removeChild(this.graphics, this.healthBarBg, this.healthBarFill);
    this.graphics.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
  }
}
