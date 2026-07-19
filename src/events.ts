type Cb = (...args: any[]) => void;

export class EventBus {
  private listeners = new Map<string, Cb[]>();

  on(event: string, cb: Cb): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }

  off(event: string, cb: Cb): void {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(c => c !== cb));
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export const EVENTS = {
  PHASE_CHANGE: "phase:change",
  PLAYER_HIT: "player:hit",
  PLAYER_DEATH: "player:death",
  ENEMY_KILLED: "enemy:killed",
  MATERIAL_COLLECTED: "material:collected",
  WAVE_START: "wave:start",
  WAVE_END: "wave:end",
  GAME_OVER: "game:over",
  LEVEL_UP: "level:up",
  SHOP_BUY: "shop:buy",
  SHOP_REROLL: "shop:reroll",
  WEAPON_MERGED: "weapon:merged",
} as const;

export type GamePhase = "title" | "weapon-select" | "combat" | "shop" | "level-up" | "game-over";
