export const ARENA_WIDTH = 1920;
export const ARENA_HEIGHT = 1080;
const scaling = 2;

export const WAVES_TOTAL = 20;
export const WAVE_TIME_MIN = 20;
export const WAVE_TIME_MAX = 120;
export const WAVE_SPAWN_INTERVAL = 5;
export const ENEMY_BASE_COUNT = 20;

export const PLAYER_SIZE = 20*scaling;
export const PLAYER_COLOR = 0x00ff88;

export const DEFAULT_STATS = {
  maxHp: 100,
  speed: 400,
  fireRate: 3,
  bulletDamage: 10,
  bulletSpeed: 600,
  bulletRange: 450,
  lifeSteal: 0,
  hpRegen: 0,
  armor: 0,
  dodge: 0,
  attackSpeed: 1,
  collectRadius: PLAYER_SIZE,
  harvestPercent: 0.2,
};

export const STAT_CAPS: Record<string, number> = {
  dodge: 0.6,
  armor: 0.8,
  attackSpeed: 3,
  speed: 600,
  fireRate: 15,
  collectRadius: 400,
  harvestPercent: 0.95,
};

export const ENEMY_SIZE = 16*scaling;
export const ENEMY_BASE_HP = 50;
export const ENEMY_BASE_DAMAGE = 10;
export const ENEMY_BASE_SPEED = 300;
export const ENEMY_SPEED_SCALE = 0.01;
export const ENEMY_SHOOT_COOLDOWN = 2;
export const ENEMY_PROJECTILE_SIZE = 6;
export const ENEMY_PROJECTILE_SPEED = 250;
export const ENEMY_PROJECTILE_COLOR = 0xff3333;

export const DANGER_MULTIPLIERS = [
  { enemyHp: 0.5, enemyDmg: 0.5, enemySpeed: 0.8, matMult: 0.5, shopTierMax: 1 },
  { enemyHp: 0.75, enemyDmg: 0.75, enemySpeed: 0.9, matMult: 0.75, shopTierMax: 1 },
  { enemyHp: 1.0, enemyDmg: 1.0, enemySpeed: 1.0, matMult: 1.0, shopTierMax: 2 },
  { enemyHp: 1.35, enemyDmg: 1.3, enemySpeed: 1.1, matMult: 1.5, shopTierMax: 2 },
  { enemyHp: 1.75, enemyDmg: 1.6, enemySpeed: 1.2, matMult: 2.0, shopTierMax: 3 },
  { enemyHp: 2.5, enemyDmg: 2.0, enemySpeed: 1.35, matMult: 3.0, shopTierMax: 4 },
];

export type WeaponClass = "precise" | "primitive" | "elemental";

export interface WeaponDef {
  id: string;
  name: string;
  tier: number;
  class: WeaponClass;
  fireRate: number;
  damage: number;
  bulletSpeed: number;
  bulletRange: number;
  bulletSize: number;
  bulletColor: number;
  pierce?: boolean;
  pellets?: number;
  spreadAngle?: number;
  melee?: boolean;
  meleeArc?: number;
  aoeRadius?: number;
  homing?: boolean;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: "peashooter", name: "Peashooter", tier: 1, class: "precise",
    fireRate: 5, damage: 8, bulletSpeed: 700, bulletRange: 500, bulletSize: 4, bulletColor: 0xffff44,
  },
  {
    id: "crossbow", name: "Crossbow", tier: 1, class: "precise",
    fireRate: 1, damage: 30, bulletSpeed: 800, bulletRange: 600, bulletSize: 5, bulletColor: 0xcc8844,
    pierce: true,
  },
  {
    id: "shotgun", name: "Shotgun", tier: 1, class: "primitive",
    fireRate: 1.5, damage: 6, bulletSpeed: 500, bulletRange: 300, bulletSize: 3, bulletColor: 0xff8844,
    pellets: 5, spreadAngle: 30,
  },
  {
    id: "axe", name: "Axe", tier: 1, class: "primitive",
    fireRate: 1.5, damage: 25, bulletSpeed: 0, bulletRange: 60, bulletSize: 0, bulletColor: 0xaaaaaa,
    melee: true, meleeArc: 120,
  },
  {
    id: "staff", name: "Staff", tier: 1, class: "elemental",
    fireRate: 2, damage: 15, bulletSpeed: 400, bulletRange: 350, bulletSize: 6, bulletColor: 0x44ffaa,
    aoeRadius: 40,
  },
  {
    id: "wand", name: "Wand", tier: 1, class: "elemental",
    fireRate: 2.5, damage: 12, bulletSpeed: 600, bulletRange: 450, bulletSize: 4, bulletColor: 0x88ccff,
    homing: true,
  },
];

export const SHOP_SLOTS = 4;
export const SHOP_REROLL_BASE_COST = 10;
export const SHOP_REROLL_COST_PER_WAVE = 5;
export const SHOP_PRICE_BASE = 15;
export const SHOP_PRICE_PER_WAVE = 5;

export const MATERIALS_PER_KILL = 3;
export const XP_PER_MATERIAL = 1;
export const XP_PER_LEVEL = 20;
export const XP_LEVEL_SCALE = 5;

export const INV_FRAMES_DURATION = 0.5;
export const PLAYER_HEALTH_BAR_WIDTH = 200;
export const PLAYER_HEALTH_BAR_HEIGHT = 16;
