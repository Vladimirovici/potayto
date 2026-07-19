import { Graphics, type Container } from "pixi.js";
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_SIZE } from "./params";

const ORB_RADIUS = 4;
const ORB_COLOR = 0xffdd44;
const COLLECT_DIST = PLAYER_SIZE / 2 + ORB_RADIUS;

const SPREAD_SPEED = 100;
const SPREAD_DAMPING = 0.92;

export class MaterialOrb {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  collected = false;
  graphics: Graphics;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.graphics = new Graphics().circle(0, 0, ORB_RADIUS).fill({ color: ORB_COLOR });
    this.graphics.x = x;
    this.graphics.y = y;
  }
}

export class MaterialManager {
  orbs: MaterialOrb[] = [];
  private container: Container;
  private collectedThisFrame = 0;

  constructor(container: Container) {
    this.container = container;
  }

  spawn(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = SPREAD_SPEED * (0.5 + Math.random());
      const orb = new MaterialOrb(x, y);
      orb.vx = Math.cos(angle) * speed;
      orb.vy = Math.sin(angle) * speed;
      this.orbs.push(orb);
      this.container.addChild(orb.graphics);
    }
  }

  update(dt: number, playerX: number, playerY: number, collectRadius: number, playerSpeed: number): void {
    this.collectedThisFrame = 0;
    for (const orb of this.orbs) {
      if (orb.collected) continue;

      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.vx *= SPREAD_DAMPING;
      orb.vy *= SPREAD_DAMPING;

      if (orb.x < ORB_RADIUS) { orb.x = ORB_RADIUS; orb.vx *= -0.5; }
      if (orb.x > ARENA_WIDTH - ORB_RADIUS) { orb.x = ARENA_WIDTH - ORB_RADIUS; orb.vx *= -0.5; }
      if (orb.y < ORB_RADIUS) { orb.y = ORB_RADIUS; orb.vy *= -0.5; }
      if (orb.y > ARENA_HEIGHT - ORB_RADIUS) { orb.y = ARENA_HEIGHT - ORB_RADIUS; orb.vy *= -0.5; }

      const dx = playerX - orb.x;
      const dy = playerY - orb.y;
      const dist = Math.hypot(dx, dy);

      if (dist < collectRadius && dist > 0) {
        const pull = 1 - dist / collectRadius;
        const speed = playerSpeed * (1.2 + pull * 1.3);
        orb.x += (dx / dist) * speed * dt;
        orb.y += (dy / dist) * speed * dt;
      }

      orb.graphics.x = orb.x;
      orb.graphics.y = orb.y;

      if (dist < COLLECT_DIST) {
        orb.collected = true;
        this.collectedThisFrame++;
      }
    }
  }

  get collectCount(): number {
    return this.collectedThisFrame;
  }

  removeCollected(): MaterialOrb[] {
    const collected: MaterialOrb[] = [];
    for (const orb of this.orbs) {
      if (orb.collected) {
        this.container.removeChild(orb.graphics);
        orb.graphics.destroy();
        collected.push(orb);
      }
    }
    this.orbs = this.orbs.filter(o => !o.collected);
    return collected;
  }

  harvestRemaining(pct: number): number {
    const remaining = this.orbs.filter(o => !o.collected);
    const count = Math.floor(remaining.length * pct);
    for (let i = 0; i < count; i++) {
      remaining[i].collected = true;
    }
    for (const orb of remaining.slice(0, count)) {
      this.container.removeChild(orb.graphics);
      orb.graphics.destroy();
    }
    this.orbs = this.orbs.filter(o => !o.collected);
    return count;
  }

  clear(): void {
    for (const orb of this.orbs) {
      this.container.removeChild(orb.graphics);
      orb.graphics.destroy();
    }
    this.orbs.length = 0;
  }
}
