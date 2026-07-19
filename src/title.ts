import { Container, Text, Graphics } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT, DANGER_MULTIPLIERS } from "./params";
import type { EventBus, GamePhase } from "./events";
import { EVENTS } from "./events";

export class TitleScreen {
  container = new Container();
  private dangerLevel = 0;
  private startBtn!: Graphics;
  private dangerText!: Text;

  constructor(events: EventBus) {
    const bg = new Graphics()
      .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .fill({ color: 0x0f0f23 });
    this.container.addChild(bg);

    const title = new Text({
      text: "POTAYTO",
      style: { fontFamily: "monospace", fontSize: 72, fill: 0xe94560, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0.5);
    title.x = ARENA_WIDTH / 2;
    title.y = 250;
    this.container.addChild(title);

    const subtitle = new Text({
      text: "Survive 20 Waves",
      style: { fontFamily: "monospace", fontSize: 24, fill: 0x888888 },
    });
    subtitle.anchor.set(0.5, 0.5);
    subtitle.x = ARENA_WIDTH / 2;
    subtitle.y = 330;
    this.container.addChild(subtitle);

    const dangerLabel = new Text({
      text: "DANGER LEVEL",
      style: { fontFamily: "monospace", fontSize: 20, fill: 0xcccccc },
    });
    dangerLabel.anchor.set(0.5, 0.5);
    dangerLabel.x = ARENA_WIDTH / 2;
    dangerLabel.y = 430;
    this.container.addChild(dangerLabel);

    const btnW = 60;
    const btnH = 50;
    const gap = 10;
    const totalW = DANGER_MULTIPLIERS.length * btnW + (DANGER_MULTIPLIERS.length - 1) * gap;
    const startX = (ARENA_WIDTH - totalW) / 2;

    for (let i = 0; i < DANGER_MULTIPLIERS.length; i++) {
      const bx = startX + i * (btnW + gap);
      const by = 480;
      const btn = new Graphics()
        .roundRect(0, 0, btnW, btnH, 6)
        .fill({ color: i === this.dangerLevel ? 0xe94560 : 0x333333 });
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.x = bx;
      btn.y = by;

      const label = new Text({
        text: `${i}`,
        style: { fontFamily: "monospace", fontSize: 22, fill: 0xffffff },
      });
      label.anchor.set(0.5, 0.5);
      label.x = btnW / 2;
      label.y = btnH / 2;
      btn.addChild(label);

      btn.on("pointerdown", () => {
        this.dangerLevel = i;
        this.dangerText.text = `Rewards x${DANGER_MULTIPLIERS[i].matMult.toFixed(1)}`;
        for (const child of this.container.children) {
          if (child === btn.parent) continue;
        }
        this.highlightSelected();
      });

      this.container.addChild(btn);
    }

    this.dangerText = new Text({
      text: `Rewards x${DANGER_MULTIPLIERS[0].matMult.toFixed(1)}`,
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xffaa00 },
    });
    this.dangerText.anchor.set(0.5, 0.5);
    this.dangerText.x = ARENA_WIDTH / 2;
    this.dangerText.y = 550;
    this.container.addChild(this.dangerText);

    this.startBtn = new Graphics()
      .roundRect(0, 0, 200, 60, 8)
      .fill({ color: 0x44aa44 });
    this.startBtn.eventMode = "static";
    this.startBtn.cursor = "pointer";
    this.startBtn.x = ARENA_WIDTH / 2 - 100;
    this.startBtn.y = 620;

    const startLabel = new Text({
      text: "START",
      style: { fontFamily: "monospace", fontSize: 28, fill: 0xffffff, fontWeight: "bold" },
    });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.x = 100;
    startLabel.y = 30;
    this.startBtn.addChild(startLabel);

    this.startBtn.on("pointerdown", () => {
      events.emit(EVENTS.PHASE_CHANGE, "weapon-select" as GamePhase, this.dangerLevel);
    });

    this.container.addChild(this.startBtn);

    this.highlightSelected();
  }

  private highlightSelected(): void {
    const buttons = this.container.children.filter(
      (c): c is Graphics => c instanceof Graphics && c.eventMode === "static" && c !== this.startBtn,
    );
    for (let i = 0; i < buttons.length && i < DANGER_MULTIPLIERS.length; i++) {
      buttons[i].clear()
        .roundRect(0, 0, 60, 50, 6)
        .fill({ color: i === this.dangerLevel ? 0xe94560 : 0x333333 });
    }
  }
}
