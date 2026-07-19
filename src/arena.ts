import { Graphics, type Application } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./params";

export function createArena(app: Application): { bg: Graphics; resize: () => void } {
  const bg = new Graphics()
    .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    .fill({ color: 0x1a1a2e })
    .stroke({ color: 0x16213e, width: 4 });

  const border = new Graphics()
    .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    .stroke({ color: 0x0f3460, width: 2 });
  bg.addChild(border);

  function resize() {
    const scaleX = window.innerWidth / ARENA_WIDTH;
    const scaleY = window.innerHeight / ARENA_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    app.canvas.style.width = `${ARENA_WIDTH * scale}px`;
    app.canvas.style.height = `${ARENA_HEIGHT * scale}px`;
    app.canvas.style.left = `${(window.innerWidth - ARENA_WIDTH * scale) / 2}px`;
    app.canvas.style.top = `${(window.innerHeight - ARENA_HEIGHT * scale) / 2}px`;
  }

  window.addEventListener("resize", resize);

  return { bg, resize };
}
