import { Graphics } from "pixi.js";
import type { WeaponDef } from "../params";

export const C = {
  Transform: "transform",
  Velocity: "velocity",
  Health: "health",
  Render: "render",
  Collider: "collider",
  Player: "player",
  Enemy: "enemy",
  Projectile: "projectile",
  Material: "material",
  Stats: "stats",
  WeaponSlots: "weaponSlots",
} as const;

export interface TransformComponent {
  x: number;
  y: number;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
}

export interface HealthComponent {
  current: number;
  max: number;
}

export interface RenderComponent {
  gfx: Graphics;
  hpBar?: Graphics;
  hpBarBg?: Graphics;
}

export interface ColliderComponent {
  radius: number;
}

export interface PlayerComponent {
  invTimer: number;
  flashTimer: number;
}

export interface EnemyComponent {
  behavior: "chase" | "random" | "stationary";
  contactDamage: number;
  fireTimer: number;
  fireCooldown: number;
  speed: number;
  wanderAngle: number;
  wanderTimer: number;
}

export interface ProjectileComponent {
  damage: number;
  range: number;
  distTraveled: number;
  isPlayer: boolean;
  pierce: boolean;
  aoeRadius: number;
  homing: boolean;
  hitEnemies: Set<Entity>;
}

import type { Entity } from "./World";

export interface MaterialComponent {} // marker

export interface StatsComponent {
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

export interface WeaponSlotsComponent {
  weapons: (WeaponDef | null)[];
  cooldowns: number[];
  meleeHits: { px: number; py: number; angle: number; range: number; arc: number; damage: number }[];
}
