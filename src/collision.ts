export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = dx * dx + dy * dy;
  const r = a.radius + b.radius;
  return dist < r * r;
}

export function distance(a: Circle, b: Circle): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
