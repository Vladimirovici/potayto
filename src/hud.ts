import { Container, Text, Graphics } from "pixi.js";
import { WAVES_TOTAL, PLAYER_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_HEIGHT } from "./params";
import type { GameState } from "./state";

export class HUD {
  container = new Container();
  private waveText: Text;
  private timerText: Text;
  private matText: Text;
  private weaponText: Text;
  private hpBarBg: Graphics;
  private hpBarFill: Graphics;
  private hpText: Text;

  constructor(parent: Container) {
    const mk = (text: string, x: number, y: number, fill: number, size: number) => {
      const t = new Text({ text, style: { fontFamily: "monospace", fontSize: size, fill } });
      t.x = x; t.y = y;
      return t;
    };

    this.waveText = mk("Wave 1 / 20", 20, 20, 0xffffff, 20);
    this.timerText = mk("", 20, 48, 0xffffff, 20);
    this.matText = mk("Mats: 0", 20, 76, 0xffaa00, 20);
    this.weaponText = mk("", 20, 104, 0xcccccc, 16);
    this.hpText = mk("", 20, 156, 0x00ff44, 14);

    this.hpBarBg = new Graphics()
      .rect(0, 0, PLAYER_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_HEIGHT)
      .fill({ color: 0x333333 });
    this.hpBarBg.x = 20;
    this.hpBarBg.y = 132;

    this.hpBarFill = new Graphics()
      .rect(0, 0, PLAYER_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_HEIGHT)
      .fill({ color: 0x00ff44 });
    this.hpBarFill.x = 20;
    this.hpBarFill.y = 132;

    this.container.addChild(
      this.waveText, this.timerText, this.matText,
      this.weaponText, this.hpBarBg, this.hpBarFill, this.hpText,
    );
    parent.addChild(this.container);
  }

  update(state: GameState, waveTimer: number): void {
    this.waveText.text = `Wave ${state.wave} / ${WAVES_TOTAL}`;
    this.timerText.text = `${Math.max(0, Math.ceil(waveTimer))}s`;
    this.matText.text = `Mats: ${state.materials}`;
    const names = state.equippedWeapons.filter(Boolean).map(w => w!.name).join(", ");
    this.weaponText.text = names || "No weapon";

    const pct = Math.max(0, state.playerStats.currentHp / state.playerStats.maxHp);
    this.hpBarFill
      .clear()
      .rect(0, 0, PLAYER_HEALTH_BAR_WIDTH * pct, PLAYER_HEALTH_BAR_HEIGHT)
      .fill({ color: pct > 0.5 ? 0x00ff44 : pct > 0.25 ? 0xffaa00 : 0xff3333 });
    this.hpText.text = `HP: ${Math.ceil(state.playerStats.currentHp)} / ${state.playerStats.maxHp}`;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
