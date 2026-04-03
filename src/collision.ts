/**
 * collision.ts
 *
 * Entity-agnostic circle-vs-circle overlap test — the single source of truth
 * for all proximity/contact detection in the game (ant↔ant, ant↔food, etc.).
 *
 * Caller supplies concrete radii; each entity module owns its own radius logic.
 */

import type { Point } from "./types";

export interface CircleShape {
  pos: Point;
  /** Collision radius in world-space pixels. */
  collisionRadius: number;
}

/**
 * Returns true when two circles overlap (inclusive of exact touching).
 */
export function circlesOverlap(a: CircleShape, b: CircleShape): boolean {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const r = a.collisionRadius + b.collisionRadius;
  return dx * dx + dy * dy <= r * r;
}
