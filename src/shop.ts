import { Container, Text, Graphics } from "pixi.js";
import {
  ARENA_WIDTH, ARENA_HEIGHT, WEAPONS, SHOP_SLOTS,
  SHOP_REROLL_BASE_COST, SHOP_REROLL_COST_PER_WAVE,
  SHOP_PRICE_BASE, SHOP_PRICE_PER_WAVE,
  DANGER_MULTIPLIERS, type WeaponDef,
} from "./params";
import type { GameState } from "./state";

function scaleWeapon(base: WeaponDef, tier: number): WeaponDef {
  const s = 1 + (tier - 1) * 0.5;
  return {
    ...base, tier,
    damage: Math.round(base.damage * s),
    fireRate: +(base.fireRate * (1 + (tier - 1) * 0.15)).toFixed(2),
    bulletSpeed: Math.round(base.bulletSpeed * (1 + (tier - 1) * 0.1)),
    bulletRange: Math.round(base.bulletRange * (1 + (tier - 1) * 0.1)),
  };
}

function getMaxTier(wave: number, dangerLevel: number): number {
  return Math.min(Math.ceil(wave / 5), DANGER_MULTIPLIERS[dangerLevel].shopTierMax);
}

function generateShopWeapon(wave: number, dangerLevel: number): WeaponDef {
  const maxTier = getMaxTier(wave, dangerLevel);
  const tier = 1 + Math.floor(Math.random() * maxTier);
  return scaleWeapon(WEAPONS[Math.floor(Math.random() * WEAPONS.length)], tier);
}

function getWeaponPrice(w: WeaponDef, wave: number): number {
  return Math.round((SHOP_PRICE_BASE + SHOP_PRICE_PER_WAVE * wave) * (1 + (w.tier - 1) * 0.6));
}

function getRerollCost(wave: number): number {
  return SHOP_REROLL_BASE_COST + SHOP_REROLL_COST_PER_WAVE * wave;
}

function findMergeTarget(slots: (WeaponDef | null)[]): { a: number; b: number } | null {
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      if (slots[i] && slots[j] && slots[i]!.id === slots[j]!.id && slots[i]!.tier === slots[j]!.tier)
        return { a: i, b: j };
  return null;
}

export class ShopScreen {
  container = new Container();
  private state: GameState;
  private onComplete: () => void;

  constructor(state: GameState, onComplete: () => void) {
    this.state = state;
    this.onComplete = onComplete;
    const allNull = !this.state.shopSlots[0] && !this.state.shopSlots[1] && !this.state.shopSlots[2] && !this.state.shopSlots[3];
    if (allNull) {
      for (let i = 0; i < SHOP_SLOTS; i++)
        this.state.shopSlots[i] = generateShopWeapon(this.state.wave, this.state.dangerLevel);
    }
    this.build();
  }

  private build(): void {
    this.container.removeChildren();

    const bg = new Graphics()
      .rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      .fill({ color: 0x0f0f23, alpha: 0.95 });
    this.container.addChild(bg);

    const title = new Text({
      text: `SHOP — Wave ${this.state.wave}`,
      style: { fontFamily: "monospace", fontSize: 36, fill: 0xffffff, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0); title.x = ARENA_WIDTH / 2; title.y = 30;
    this.container.addChild(title);

    const matDisp = new Text({
      text: `Materials: ${this.state.materials}`,
      style: { fontFamily: "monospace", fontSize: 22, fill: 0xffaa00 },
    });
    matDisp.anchor.set(0.5, 0); matDisp.x = ARENA_WIDTH / 2; matDisp.y = 72;
    this.container.addChild(matDisp);

    // Merge
    const merge = findMergeTarget(this.state.equippedWeapons);
    if (merge) {
      const wa = this.state.equippedWeapons[merge.a]!;
      const wb = this.state.equippedWeapons[merge.b]!;
      const nextTier = scaleWeapon(WEAPONS.find(w => w.id === wa.id)!, wa.tier + 1);

      const mergeBtn = new Graphics()
        .roundRect(0, 0, 320, 40, 6)
        .fill({ color: 0x8844aa });
      mergeBtn.eventMode = "static"; mergeBtn.cursor = "pointer";
      mergeBtn.x = ARENA_WIDTH / 2 - 160; mergeBtn.y = 130;

      const mergeLabel = new Text({
        text: `MERGE: ${wa.name} T${wa.tier} + ${wb.name} T${wb.tier} → ${nextTier.name} T${nextTier.tier}`,
        style: { fontFamily: "monospace", fontSize: 15, fill: 0xffffff },
      });
      mergeLabel.anchor.set(0.5, 0.5); mergeLabel.x = 160; mergeLabel.y = 20;
      mergeBtn.addChild(mergeLabel);

      mergeBtn.on("pointerdown", () => {
        this.state.equippedWeapons[merge.a] = nextTier;
        this.state.equippedWeapons[merge.b] = null;
        this.build();
      });

      this.container.addChild(mergeBtn);
    }

    // Shop slots
    this.renderSlots();

    this.renderInfoPanel();

    // Continue
    const nextBtn = new Graphics()
      .roundRect(0, 0, 240, 54, 8)
      .fill({ color: 0x44aa44 });
    nextBtn.eventMode = "static"; nextBtn.cursor = "pointer";
    nextBtn.x = ARENA_WIDTH / 2 - 120; nextBtn.y = ARENA_HEIGHT - 90;

    const nextLabel = new Text({
      text: "NEXT WAVE",
      style: { fontFamily: "monospace", fontSize: 24, fill: 0xffffff, fontWeight: "bold" },
    });
    nextLabel.anchor.set(0.5, 0.5); nextLabel.x = 120; nextLabel.y = 27;
    nextBtn.addChild(nextLabel);
    nextBtn.on("pointerdown", () => this.onComplete());
    this.container.addChild(nextBtn);
  }

  private renderSlots(): void {
    const cardW = 260, cardH = 380, gap = 24;
    const totalW = SHOP_SLOTS * cardW + (SHOP_SLOTS - 1) * gap;
    const startX = (ARENA_WIDTH - totalW) / 2;
    const cardY = 180;

    for (let i = 0; i < SHOP_SLOTS; i++) {
      const w = this.state.shopSlots[i];
      const cx = startX + i * (cardW + gap);

      if (!w) {
        const emptyCard = new Graphics()
          .roundRect(0, 0, cardW, cardH, 8)
          .fill({ color: 0x0a0a1e })
          .stroke({ color: 0x222244, width: 1 });
        emptyCard.x = cx; emptyCard.y = cardY;
        this.container.addChild(emptyCard);

        const soldText = new Text({
          text: "SOLD",
          style: { fontFamily: "monospace", fontSize: 20, fill: 0x444466 },
        });
        soldText.anchor.set(0.5, 0.5); soldText.x = cx + cardW / 2; soldText.y = cardY + cardH / 2;
        this.container.addChild(soldText);
        continue;
      }

      const card = new Graphics()
        .roundRect(0, 0, cardW, cardH, 8)
        .fill({ color: 0x1a1a3e })
        .stroke({ color: this.state.shopLocks[i] ? 0xffaa00 : 0x333366, width: 2 });
      card.eventMode = "static"; card.cursor = "pointer";
      card.x = cx; card.y = cardY;

      const price = getWeaponPrice(w, this.state.wave);
      const canAfford = this.state.materials >= price;

      const nameText = new Text({
        text: `${w.name} T${w.tier}`,
        style: { fontFamily: "monospace", fontSize: 20, fill: 0xffffff, fontWeight: "bold" },
      });
      nameText.anchor.set(0.5, 0); nameText.x = cardW / 2; nameText.y = 12;
      card.addChild(nameText);

      const classText = new Text({
        text: w.class.toUpperCase(),
        style: { fontFamily: "monospace", fontSize: 13, fill: 0x888888 },
      });
      classText.anchor.set(0.5, 0); classText.x = cardW / 2; classText.y = 40;
      card.addChild(classText);

      card.addChild(new Graphics().circle(cardW / 2, 88, w.bulletSize + 6).fill({ color: w.bulletColor }));

      const lines = [
        `DMG: ${w.damage}`, `FIRE: ${w.fireRate}/s`,
        `RANGE: ${w.bulletRange}`, `SPEED: ${w.bulletSpeed}`,
      ];
      if (w.pellets) lines.push(`PELLETS: ${w.pellets}`);
      if (w.pierce) lines.push("PIERCING");
      if (w.aoeRadius) lines.push(`AOE: ${w.aoeRadius}`);
      if (w.homing) lines.push("HOMING");
      if (w.melee) lines.push("MELEE");

      const statsText = new Text({
        text: lines.join("\n"),
        style: { fontFamily: "monospace", fontSize: 13, fill: 0xcccccc, lineHeight: 18 },
      });
      statsText.x = 14; statsText.y = 118;
      card.addChild(statsText);

      const priceText = new Text({
        text: `${price} mats`,
        style: { fontFamily: "monospace", fontSize: 22, fill: canAfford ? 0xffff44 : 0xff4444 },
      });
      priceText.anchor.set(0.5, 0); priceText.x = cardW / 2; priceText.y = cardH - 80;
      card.addChild(priceText);

      card.on("pointerdown", () => {
        if (this.state.materials < price) return;

        const freeSlot = this.state.equippedWeapons.indexOf(null);

        if (freeSlot < 0) {
          // All slots full — only allow buy if weapon merges with existing
          const matchIdx = this.state.equippedWeapons.findIndex(
            e => e && e.id === w.id && e.tier === w.tier
          );
          if (matchIdx < 0) return;
          const base = WEAPONS.find(base => base.id === w.id)!;
          this.state.equippedWeapons[matchIdx] = scaleWeapon(base, w.tier + 1);
        } else {
          this.state.equippedWeapons[freeSlot] = w;
        }

        this.state.materials -= price;
        this.state.shopSlots[i] = null;
        this.state.shopLocks[i] = false;
        this.build();
      });

      this.container.addChild(card);

      const lockBtn = new Graphics()
        .roundRect(0, 0, 34, 26, 4)
        .fill({ color: this.state.shopLocks[i] ? 0xffaa00 : 0x444444 });
      lockBtn.x = cx + cardW - 38;
      lockBtn.y = cardY;
      lockBtn.eventMode = "static"; lockBtn.cursor = "pointer";
      const lockLabel = new Text({
        text: "L", style: { fontFamily: "monospace", fontSize: 13, fill: 0xffffff },
      });
      lockLabel.anchor.set(0.5, 0.5); lockLabel.x = 17; lockLabel.y = 13;
      lockBtn.addChild(lockLabel);
      lockBtn.on("pointerdown", () => {
        this.state.shopLocks[i] = !this.state.shopLocks[i];
        lockBtn.clear()
          .roundRect(0, 0, 34, 26, 4)
          .fill({ color: this.state.shopLocks[i] ? 0xffaa00 : 0x444444 });
      });
      this.container.addChild(lockBtn);
    }

    // Reroll
    const allEmpty = this.state.shopSlots.every(s => !s);
    const rerollCost = allEmpty ? 0 : getRerollCost(this.state.wave);
    const canReroll = this.state.materials >= rerollCost;
    const rerollBtn = new Graphics()
      .roundRect(0, 0, 200, 42, 6)
      .fill({ color: canReroll ? 0x336699 : 0x333333 });
    rerollBtn.eventMode = "static"; rerollBtn.cursor = "pointer";
    rerollBtn.x = ARENA_WIDTH / 2 - 100; rerollBtn.y = cardY + cardH + 16;

    const rText = new Text({
      text: allEmpty ? "REROLL (FREE)" : `REROLL (${rerollCost})`,
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff },
    });
    rText.anchor.set(0.5, 0.5); rText.x = 100; rText.y = 21;
    rerollBtn.addChild(rText);

    rerollBtn.on("pointerdown", () => {
      if (this.state.materials < rerollCost) return;
      this.state.materials -= rerollCost;
      for (let i = 0; i < SHOP_SLOTS; i++)
        if (!this.state.shopLocks[i]) this.state.shopSlots[i] = generateShopWeapon(this.state.wave, this.state.dangerLevel);
      this.build();
    });

    this.container.addChild(rerollBtn);
  }

  private renderInfoPanel(): void {
    const panelX = 80;
    const panelY = 620;
    const panelW = ARENA_WIDTH - 160;
    const panelH = 330;

    const bg = new Graphics()
      .roundRect(0, 0, panelW, panelH, 8)
      .fill({ color: 0x12122a, alpha: 0.8 })
      .stroke({ color: 0x333366, width: 1 });
    bg.x = panelX; bg.y = panelY;
    this.container.addChild(bg);

    // --- Left: Weapon Loadout ---
    const col1X = panelX + 20;

    const loadoutTitle = new Text({
      text: "LOADOUT",
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
    });
    loadoutTitle.x = col1X; loadoutTitle.y = panelY + 14;
    this.container.addChild(loadoutTitle);

    for (let i = 0; i < 6; i++) {
      const w = this.state.equippedWeapons[i];
      const rowY = panelY + 44 + i * 44;
      const slotGfx = new Graphics()
        .roundRect(0, 0, 28, 24, 4)
        .fill({ color: w ? 0x448844 : 0x333333 });
      slotGfx.x = col1X; slotGfx.y = rowY;
      this.container.addChild(slotGfx);

      const slotNum = new Text({
        text: `${i + 1}`,
        style: { fontFamily: "monospace", fontSize: 13, fill: w ? 0xffffff : 0x666666 },
      });
      slotNum.anchor.set(0.5, 0.5); slotNum.x = col1X + 14; slotNum.y = rowY + 12;
      this.container.addChild(slotNum);

      if (w) {
        const name = new Text({
          text: `${w.name} T${w.tier}`,
          style: { fontFamily: "monospace", fontSize: 15, fill: 0xffffff, fontWeight: "bold" },
        });
        name.x = col1X + 38; name.y = rowY;
        this.container.addChild(name);

        const cls = new Text({
          text: w.class.toUpperCase(),
          style: { fontFamily: "monospace", fontSize: 11, fill: 0x888888 },
        });
        cls.x = col1X + 38; cls.y = rowY + 18;
        this.container.addChild(cls);

        const stats = [
          `DMG:${w.damage}`,
          `RATE:${w.fireRate}`,
          `RNG:${w.bulletRange}`,
        ];
        if (w.pellets) stats.push(`PEL:${w.pellets}`);
        if (w.pierce) stats.push("PIERCE");
        if (w.aoeRadius) stats.push(`AOE:${w.aoeRadius}`);
        if (w.homing) stats.push("HOMING");
        if (w.melee) stats.push("MELEE");

        const statsLine = new Text({
          text: stats.join("  "),
          style: { fontFamily: "monospace", fontSize: 11, fill: 0xaaaaaa },
        });
        statsLine.x = col1X + 220; statsLine.y = rowY + 2;
        this.container.addChild(statsLine);
      } else {
        const empty = new Text({
          text: "empty",
          style: { fontFamily: "monospace", fontSize: 13, fill: 0x555555, fontStyle: "italic" },
        });
        empty.x = col1X + 38; empty.y = rowY + 3;
        this.container.addChild(empty);
      }
    }

    // --- Right: Player Stats ---
    const col2X = panelX + panelW * 0.57;

    const statsTitle = new Text({
      text: "PLAYER STATS",
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
    });
    statsTitle.x = col2X; statsTitle.y = panelY + 14;
    this.container.addChild(statsTitle);

    const s = this.state.playerStats;
    const statLines = [
      { label: "HP", value: `${Math.ceil(s.currentHp)} / ${s.maxHp}`, color: 0x00ff44 },
      { label: "Speed", value: `${s.speed}`, color: 0xcccccc },
      { label: "Damage", value: `${s.bulletDamage}`, color: 0xcccccc },
      { label: "Fire Rate", value: `${s.fireRate}/s`, color: 0xcccccc },
      { label: "Life Steal", value: `${(s.lifeSteal * 100).toFixed(0)}%`, color: 0xcccccc },
      { label: "HP Regen", value: `${s.hpRegen.toFixed(1)}/s`, color: 0xcccccc },
      { label: "Armor", value: `${(s.armor * 100).toFixed(0)}%`, color: 0xcccccc },
      { label: "Dodge", value: `${(s.dodge * 100).toFixed(0)}%`, color: 0xcccccc },
      { label: "Range", value: `${s.bulletRange}`, color: 0xcccccc },
      { label: "Collect", value: `${s.collectRadius}`, color: 0xcccccc },
      { label: "Harvest", value: `${(s.harvestPercent * 100).toFixed(0)}%`, color: 0xcccccc },
    ];

    statLines.forEach((sl, i) => {
      const rowY = panelY + 44 + i * 24;
      const label = new Text({
        text: sl.label,
        style: { fontFamily: "monospace", fontSize: 14, fill: 0x888888 },
      });
      label.x = col2X; label.y = rowY;
      this.container.addChild(label);

      const val = new Text({
        text: sl.value,
        style: { fontFamily: "monospace", fontSize: 14, fill: sl.color },
      });
      val.x = col2X + 130; val.y = rowY;
      this.container.addChild(val);
    });
  }
}
