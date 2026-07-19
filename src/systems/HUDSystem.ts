import { Container, Text, Graphics } from "pixi.js";
import { PLAYER_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_HEIGHT } from "../params";
import { C, type StatsComponent } from "../ecs/Components";
import type { World, System } from "../ecs/World";

export class HUDSystem implements System {
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

  update(world: World, _dt: number): void {
    // HUD reads from ECS state via the player's StatsComponent
    const players = world.query(C.Player, C.Stats);
    if (players.length === 0) return;
    const s = world.get<StatsComponent>(players[0], C.Stats);

    // We need wave, materials from external tracking — passed via fields
    this.hpText.text = `HP: ${Math.ceil(s.currentHp)} / ${s.maxHp}`;
    const pct = Math.max(0, s.currentHp / s.maxHp);
    this.hpBarFill
      .clear()
      .rect(0, 0, PLAYER_HEALTH_BAR_WIDTH * pct, PLAYER_HEALTH_BAR_HEIGHT)
      .fill({ color: pct > 0.5 ? 0x00ff44 : pct > 0.25 ? 0xffaa00 : 0xff3333 });
  }

  setWaveText(v: string): void { this.waveText.text = v; }
  setTimerText(v: string): void { this.timerText.text = v; }
  setMatText(v: string): void { this.matText.text = v; }
  setWeaponText(v: string): void { this.weaponText.text = v; }
}
