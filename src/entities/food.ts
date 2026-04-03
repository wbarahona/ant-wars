/**
 * food.ts
 *
 * Food entity — a pick-up-able item any ant can carry.
 *
 * Lifecycle
 * ─────────
 *   idle on ground → ant walks into collision radius → food.pickup(ant)
 *   → food moves with ant (updateCarriedPosition each frame)
 *   → ant dies → food.drop()  (stays at death location)
 *
 * Carried position
 * ────────────────
 *   Placed just in front of the carrier's head along its facing direction.
 *   "Forward" in world space for a sprite that points north at facingAngle=0:
 *     forward = ( sin(facingAngle), -cos(facingAngle) )
 */

import type { Point, AntRole } from "../types";
import type { Ant } from "./ant";

/** World-px from thorax-centre to the carried food position, per caste. */
const CARRY_OFFSET: Record<AntRole, number> = {
  queen: 28,
  soldier: 24,
  worker: 16,
  drone: 16,
};

export class Food {
  private static nextId = 1;
  readonly id: number;

  pos: Point;

  /** Collision radius (world px) — used by circlesOverlap() in the collision system. */
  readonly collisionRadius = 10;

  isCarried = false;
  carriedBy: Ant | null = null;

  constructor(pos: Point) {
    this.id = Food.nextId++;
    this.pos = { ...pos };
  }

  pickup(ant: Ant): void {
    this.isCarried = true;
    this.carriedBy = ant;
  }

  drop(): void {
    this.isCarried = false;
    this.carriedBy = null;
  }

  /**
   * Called every frame while isCarried — snaps the food to just in front of
   * the carrier's head.
   */
  updateCarriedPosition(): void {
    if (!this.carriedBy) return;
    const ant = this.carriedBy;
    const offset = CARRY_OFFSET[ant.role];
    // forward direction in world space (sprite points north at angle 0)
    this.pos.x = ant.pos.x + Math.sin(ant.facingAngle) * offset;
    this.pos.y = ant.pos.y - Math.cos(ant.facingAngle) * offset;
  }
}
