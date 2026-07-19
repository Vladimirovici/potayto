import { Container, Text, Graphics } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT, WEAPONS } from "./params";
import type { EventBus, GamePhase } from "./events";
import { EVENTS } from "./events";

export class WeaponSelectScreen {
  container = new Container();

  constructor(events: EventBus) {
    const bg = new Graphics()
      .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .fill({ color: 0x0f0f23 });
    this.container.addChild(bg);

    const title = new Text({
      text: "CHOOSE YOUR WEAPON",
      style: { fontFamily: "monospace", fontSize: 36, fill: 0xffffff, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0.5);
    title.x = ARENA_WIDTH / 2;
    title.y = 120;
    this.container.addChild(title);

    const tier1 = WEAPONS.filter(w => w.tier === 1);
    const picks = shuffle(tier1).slice(0, 5);

    const cardW = 280;
    const cardH = 420;
    const gap = 30;
    const totalW = picks.length * cardW + (picks.length - 1) * gap;
    const startX = (ARENA_WIDTH - totalW) / 2;
    const cardY = 260;

    for (let i = 0; i < picks.length; i++) {
      const w = picks[i];
      const cx = startX + i * (cardW + gap);

      const card = new Graphics()
        .roundRect(0, 0, cardW, cardH, 10)
        .fill({ color: 0x1a1a3e })
        .stroke({ color: 0x333366, width: 2 });
      card.eventMode = "static";
      card.cursor = "pointer";
      card.x = cx;
      card.y = cardY;

      const nameText = new Text({
        text: w.name,
        style: { fontFamily: "monospace", fontSize: 22, fill: 0xffffff, fontWeight: "bold" },
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = cardW / 2;
      nameText.y = 20;
      card.addChild(nameText);

      const classText = new Text({
        text: w.class.toUpperCase(),
        style: { fontFamily: "monospace", fontSize: 14, fill: 0x888888 },
      });
      classText.anchor.set(0.5, 0);
      classText.x = cardW / 2;
      classText.y = 52;
      card.addChild(classText);

      const preview = new Graphics()
        .circle(cardW / 2, 140, w.bulletSize + 8)
        .fill({ color: w.bulletColor });
      card.addChild(preview);

      const lines = [
        `DMG: ${w.damage}`,
        `FIRE: ${w.fireRate}/s`,
        `RANGE: ${w.bulletRange}`,
        `SPEED: ${w.bulletSpeed}`,
      ];
      if (w.pellets) lines.push(`PELLETS: ${w.pellets}`);
      if (w.pierce) lines.push("PIERCING");
      if (w.aoeRadius) lines.push(`AOE: ${w.aoeRadius}`);
      if (w.homing) lines.push("HOMING");
      if (w.melee) lines.push("MELEE");

      const statsText = new Text({
        text: lines.join("\n"),
        style: { fontFamily: "monospace", fontSize: 14, fill: 0xcccccc, lineHeight: 20 },
      });
      statsText.x = 20;
      statsText.y = 190;
      card.addChild(statsText);

      card.on("pointerdown", () => {
        events.emit(EVENTS.PHASE_CHANGE, "combat" as GamePhase, w);
      });

      this.container.addChild(card);
    }
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
