import { Container, Text, Graphics } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT } from "./params";
import type { EventBus, GamePhase } from "./events";
import { EVENTS } from "./events";

export class GameOverScreen {
  container = new Container();

  constructor(events: EventBus, wave: number, materials: number, dangerLevel: number) {
    const bg = new Graphics()
      .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .fill({ color: 0x0f0f23 });
    this.container.addChild(bg);

    const title = new Text({
      text: "GAME OVER",
      style: { fontFamily: "monospace", fontSize: 64, fill: 0xe94560, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0.5);
    title.x = ARENA_WIDTH / 2;
    title.y = 250;
    this.container.addChild(title);

    const survived = new Text({
      text: `Survived ${wave} waves`,
      style: { fontFamily: "monospace", fontSize: 28, fill: 0xcccccc },
    });
    survived.anchor.set(0.5, 0.5);
    survived.x = ARENA_WIDTH / 2;
    survived.y = 340;
    this.container.addChild(survived);

    const collected = new Text({
      text: `Materials collected: ${materials}`,
      style: { fontFamily: "monospace", fontSize: 22, fill: 0xffaa00 },
    });
    collected.anchor.set(0.5, 0.5);
    collected.x = ARENA_WIDTH / 2;
    collected.y = 390;
    this.container.addChild(collected);

    const dangerText = new Text({
      text: `Danger level: ${dangerLevel}`,
      style: { fontFamily: "monospace", fontSize: 18, fill: 0x888888 },
    });
    dangerText.anchor.set(0.5, 0.5);
    dangerText.x = ARENA_WIDTH / 2;
    dangerText.y = 430;
    this.container.addChild(dangerText);

    const btn = new Graphics()
      .roundRect(0, 0, 240, 60, 8)
      .fill({ color: 0x44aa44 });
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.x = ARENA_WIDTH / 2 - 120;
    btn.y = 520;

    const label = new Text({
      text: "PLAY AGAIN",
      style: { fontFamily: "monospace", fontSize: 28, fill: 0xffffff, fontWeight: "bold" },
    });
    label.anchor.set(0.5, 0.5);
    label.x = 120;
    label.y = 30;
    btn.addChild(label);

    btn.on("pointerdown", () => {
      events.emit(EVENTS.PHASE_CHANGE, "title" as GamePhase);
    });

    this.container.addChild(btn);
  }
}
