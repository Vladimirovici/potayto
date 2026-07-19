export type Entity = number;

export interface System {
  init?(world: World): void;
  update(world: World, dt: number): void;
}

export class World {
  private nextId = 1;
  private alive = new Set<Entity>();
  private pools = new Map<string, Map<Entity, unknown>>();
  private systems: System[] = [];
  private toDestroy: Entity[] = [];

  entity(): Entity {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  destroy(entity: Entity): void {
    this.toDestroy.push(entity);
  }

  flush(onDestroy?: (e: Entity) => void): void {
    for (const e of this.toDestroy) {
      onDestroy?.(e);
      this.alive.delete(e);
      for (const pool of this.pools.values()) pool.delete(e);
    }
    this.toDestroy.length = 0;
  }

  add<T>(entity: Entity, type: string, component: T): void {
    if (!this.pools.has(type)) this.pools.set(type, new Map());
    this.pools.get(type)!.set(entity, component);
  }

  get<T>(entity: Entity, type: string): T {
    return this.pools.get(type)?.get(entity) as T;
  }

  has(entity: Entity, type: string): boolean {
    return this.alive.has(entity) && (this.pools.get(type)?.has(entity) ?? false);
  }

  remove(entity: Entity, type: string): void {
    this.pools.get(type)?.delete(entity);
  }

  query(...types: string[]): Entity[] {
    const result: Entity[] = [];
    const first = types[0];
    const pool = this.pools.get(first);
    if (!pool) return result;
    for (const e of pool.keys()) {
      if (!this.alive.has(e)) continue;
      let ok = true;
      for (let i = 1; i < types.length; i++) {
        if (!this.pools.get(types[i])?.has(e)) { ok = false; break; }
      }
      if (ok) result.push(e);
    }
    return result;
  }

  addSystem(s: System): void {
    this.systems.push(s);
    s.init?.(this);
  }

  update(dt: number, onDestroy?: (e: Entity) => void): void {
    for (const s of this.systems) s.update(this, dt);
    this.flush(onDestroy);
  }

  clear(): void {
    for (const pool of this.pools.values()) pool.clear();
    this.alive.clear();
    this.nextId = 1;
    this.toDestroy.length = 0;
  }
}
