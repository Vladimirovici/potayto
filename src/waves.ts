import { WAVES_TOTAL } from "./params";

export class WaveManager {
  wave = 0;
  timer = 0;
  active = false;

  startWave(w: number): void {
    this.wave = w;
    this.timer = this.getDuration(w);
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.active = false;
    }
  }

  get isOver(): boolean {
    return !this.active;
  }

  get isLastWave(): boolean {
    return this.wave >= WAVES_TOTAL;
  }

  get duration(): number {
    return this.getDuration(this.wave);
  }

  private getDuration(wave: number): number {
    return 20 + (wave - 1) * (100 / 19);
  }
}
