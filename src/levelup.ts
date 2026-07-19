import { Container, Graphics, Text } from "pixi.js";
import { ARENA_HEIGHT, ARENA_WIDTH, STAT_CAPS } from "./params";
import type { PlayerStats } from "./state";

interface StatOption {
  key: keyof PlayerStats;
  label: string;
  amount: number;
  fmt: (v: number) => string;
}

const OPTIONS: StatOption[] = [
  { key: "maxHp", label: "Max HP", amount: 10, fmt: v => `+${v}` },
  { key: "lifeSteal", label: "Life Steal", amount: 0.03, fmt: v => `+${(v * 100).toFixed(0)}%` },
  { key: "hpRegen", label: "HP Regen", amount: 0.5, fmt: v => `+${v.toFixed(1)}/s` },
  { key: "armor", label: "Armor", amount: 0.05, fmt: v => `+${(v * 100).toFixed(0)}%` },
  { key: "dodge", label: "Dodge", amount: 0.03, fmt: v => `+${(v * 100).toFixed(0)}%` },
  { key: "attackSpeed", label: "Attack Speed", amount: 0.1, fmt: v => `+${(v * 100).toFixed(0)}%` },
  { key: "bulletRange", label: "Range", amount: 30, fmt: v => `+${v}` },
  { key: "collectRadius", label: "Collect", amount: 15, fmt: v => `+${v}` },
  { key: "harvestPercent", label: "Harvest", amount: 0.05, fmt: v => `+${(v * 100).toFixed(0)}%` },
  { key: "speed", label: "Speed", amount: 20, fmt: v => `+${v}` },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyUpgrade(stats: PlayerStats, opt: StatOption): void {
  const cur = stats[opt.key] as number;
  const cap = STAT_CAPS[opt.key];
  stats[opt.key] = cap !== undefined ? Math.min(cap, cur + opt.amount) as any : (cur + opt.amount) as any;
  if (opt.key === "maxHp") stats.currentHp = stats.maxHp;
}

export class LevelUpScreen {
  container = new Container();

  constructor(stats: PlayerStats, pending: number, onComplete: () => void) {
    const bg = new Graphics()
      .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .fill({ color: 0x0f0f23, alpha: 0.95 });
    this.container.addChild(bg);
    this.showPick(stats, pending, onComplete);
  }

  private showPick(stats: PlayerStats, remaining: number, onComplete: () => void): void {
    const title = new Text({
      text: `LEVEL UP! (${remaining} remaining)`,
      style: { fontFamily: "monospace", fontSize: 40, fill: 0xffff44, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.x = ARENA_WIDTH / 2; title.y = 100;
    this.container.addChild(title);

    const picks = shuffle(OPTIONS).slice(0, 4);
    const cardW = 260, cardH = 180, gap = 40;
    const totalW = picks.length * cardW + (picks.length - 1) * gap;
    const startX = (ARENA_WIDTH - totalW) / 2;
    const cardY = 280;

    picks.forEach((opt, i) => {
      const cx = startX + i * (cardW + gap);
      const card = new Graphics()
        .roundRect(0, 0, cardW, cardH, 8)
        .fill({ color: 0x1a1a3e })
        .stroke({ color: 0x444488, width: 2 });
      card.eventMode = "static";
      card.cursor = "pointer";
      card.x = cx; card.y = cardY;

      const cur = stats[opt.key] as number;
      const cap = STAT_CAPS[opt.key];
      const atCap = cap !== undefined && cur >= cap;

      const label = new Text({
        text: opt.label,
        style: { fontFamily: "monospace", fontSize: 22, fill: atCap ? 0x666666 : 0xffffff, fontWeight: "bold" },
      });
      label.anchor.set(0.5, 0); label.x = cardW / 2; label.y = 20;
      card.addChild(label);

      const curText = new Text({
        text: `Current: ${opt.fmt(cur)}`,
        style: { fontFamily: "monospace", fontSize: 15, fill: 0x888888 },
      });
      curText.anchor.set(0.5, 0); curText.x = cardW / 2; curText.y = 60;
      card.addChild(curText);

      if (!atCap) {
        const nextText = new Text({
          text: `→ ${opt.fmt(cur + opt.amount)}`,
          style: { fontFamily: "monospace", fontSize: 18, fill: 0x44ff88 },
        });
        nextText.anchor.set(0.5, 0); nextText.x = cardW / 2; nextText.y = 95;
        card.addChild(nextText);

        const delta = new Text({
          text: opt.fmt(opt.amount),
          style: { fontFamily: "monospace", fontSize: 28, fill: 0x44ff44 },
        });
        delta.anchor.set(0.5, 0); delta.x = cardW / 2; delta.y = 135;
        card.addChild(delta);
      } else {
        const capped = new Text({
          text: "MAXED",
          style: { fontFamily: "monospace", fontSize: 22, fill: 0xff4444 },
        });
        capped.anchor.set(0.5, 0); capped.x = cardW / 2; capped.y = 100;
        card.addChild(capped);
      }

      if (!atCap) {
        card.on("pointerdown", () => {
          applyUpgrade(stats, opt);
          remaining--;
          if (remaining > 0) {
            this.container.removeChildren();
            this.container.addChild(
              new Graphics().rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT).fill({ color: 0x0f0f23, alpha: 0.95 }),
            );
            this.showPick(stats, remaining, onComplete);
          } else {
            onComplete();
          }
        });
      }

      this.container.addChild(card);
    });
  }
}
