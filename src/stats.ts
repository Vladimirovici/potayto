import { Container, Text } from "pixi.js";
import { ARENA_WIDTH } from "./params";

export class StatsWidget {
  container = new Container();
  private fpsText: Text;
  private entityText: Text;
  private fpsHistory: number[] = [];
  private shown = false;

  constructor(parent: Container) {
    this.fpsText = new Text({
      text: "FPS: --",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x00ff00 },
    });
    this.fpsText.x = ARENA_WIDTH - 140;
    this.fpsText.y = 16;

    this.entityText = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 13, fill: 0x00ff00 },
    });
    this.entityText.x = ARENA_WIDTH - 140;
    this.entityText.y = 36;

    this.container.addChild(this.fpsText, this.entityText);
    this.container.visible = false;
    parent.addChild(this.container);
  }

  toggle(): void {
    this.shown = !this.shown;
    this.container.visible = this.shown;
  }

  update(fps: number, entities: { enemies: number; projectiles: number; materials: number }): void {
    if (!this.shown) return;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    const avg = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    this.fpsText.text = `FPS: ${Math.round(avg)}`;
    this.entityText.text = `E:${entities.enemies}  P:${entities.projectiles}  M:${entities.materials}`;

    this.fpsText.style.fill = avg >= 55 ? 0x00ff00 : avg >= 30 ? 0xffaa00 : 0xff3333;
  }
}
