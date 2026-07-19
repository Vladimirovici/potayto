import type { GamePhase } from "./events";
import { DEFAULT_STATS, type WeaponDef } from "./params";

export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  speed: number;
  fireRate: number;
  bulletDamage: number;
  bulletSpeed: number;
  bulletRange: number;
  lifeSteal: number;
  hpRegen: number;
  armor: number;
  dodge: number;
  attackSpeed: number;
  collectRadius: number;
  harvestPercent: number;
}

export interface GameState {
  phase: GamePhase;
  wave: number;
  materials: number;
  xp: number;
  level: number;
  playerStats: PlayerStats;
  equippedWeapons: (WeaponDef | null)[];
  dangerLevel: number;
  elapsed: number;
  levelUpsPending: number;
  shopSlots: (WeaponDef | null)[];
  shopLocks: boolean[];
}

export function createBaseStats(): PlayerStats {
  return {
    maxHp: DEFAULT_STATS.maxHp,
    currentHp: DEFAULT_STATS.maxHp,
    speed: DEFAULT_STATS.speed,
    fireRate: DEFAULT_STATS.fireRate,
    bulletDamage: DEFAULT_STATS.bulletDamage,
    bulletSpeed: DEFAULT_STATS.bulletSpeed,
    bulletRange: DEFAULT_STATS.bulletRange,
    lifeSteal: DEFAULT_STATS.lifeSteal,
    hpRegen: DEFAULT_STATS.hpRegen,
    armor: DEFAULT_STATS.armor,
    dodge: DEFAULT_STATS.dodge,
    attackSpeed: DEFAULT_STATS.attackSpeed,
    collectRadius: DEFAULT_STATS.collectRadius,
    harvestPercent: DEFAULT_STATS.harvestPercent,
  };
}

export function createInitialState(): GameState {
  const base = createBaseStats();
  return {
    phase: "title",
    wave: 0,
    materials: 0,
    xp: 0,
    level: 1,
    playerStats: { ...base, currentHp: base.maxHp },
    equippedWeapons: new Array(6).fill(null),
    dangerLevel: 0,
    elapsed: 0,
    levelUpsPending: 0,
    shopSlots: Array(4).fill(null),
    shopLocks: Array(4).fill(false),
  };
}
