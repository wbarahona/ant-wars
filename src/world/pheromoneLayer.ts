/**
 * pheromoneLayer.ts
 *
 * Manages the two pheromone trail layers: food and attack.
 *
 * Emission rules (automatic):
 *   • Any ant in 'attacking' state deposits attack pheromones while moving
 *   • Any ant carrying food deposits food pheromones while moving
 *
 * Emission rules (player-controlled):
 *   • ant.leaveFoodTrail   → deposit food pheromones while walking
 *   • ant.leaveAttackTrail → deposit attack pheromones while walking
 *
 * Future AI hook:
 *   queryNearest() lets NPC ants detect trails and steer toward them.
 */

import type { Point, AntSpecies } from "../types";

export type PheromoneType = "food" | "attack";

export interface Pheromone {
  pos: Point;
  type: PheromoneType;
  species: AntSpecies;
  /** 0–1 strength; decays to zero then the particle is removed */
  strength: number;
}

/** Full fade in 60 seconds */
const DECAY_RATE = 1 / 60;

/** World pixels of movement between each pheromone deposit */
export const DEPOSIT_INTERVAL = 12;

const TRAIL_COLOR: Record<PheromoneType, string> = {
  food: "#86efac", // soft green
  attack: "#fca5a5", // soft red/pink
};

const MINIMAP_COLOR: Record<PheromoneType, string> = {
  food: "#4ade80",
  attack: "#ef4444",
};

export class PheromoneLayer {
  readonly pheromones: Pheromone[] = [];

  deposit(pos: Point, type: PheromoneType, species: AntSpecies): void {
    this.pheromones.push({ pos: { ...pos }, type, species, strength: 1.0 });
  }

  update(dt: number): void {
    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      this.pheromones[i].strength -= DECAY_RATE * dt;
      if (this.pheromones[i].strength <= 0) this.pheromones.splice(i, 1);
    }
  }

  /**
   * Draw all pheromones of the given type in world space.
   * Only pheromones belonging to `playerSpecies` are drawn — enemy trails are
   * invisible to the player but still exist for enemy AI.
   * ctx must already be translated by (-camera.x, -camera.y).
   */
  draw(
    ctx: CanvasRenderingContext2D,
    type: PheromoneType,
    visible: boolean,
    playerSpecies: AntSpecies,
  ): void {
    if (!visible) return;
    const col = TRAIL_COLOR[type];
    ctx.fillStyle = col;
    for (const p of this.pheromones) {
      if (p.type !== type || p.species !== playerSpecies) continue;
      ctx.globalAlpha = p.strength * 0.55;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Draw pheromone dots on top of the minimap (screen space).
   * Only pheromones belonging to `playerSpecies` are drawn.
   * mmX/mmY/mmW/mmH describe the minimap's world-area rect in screen pixels.
   */
  drawMinimap(
    ctx: CanvasRenderingContext2D,
    type: PheromoneType,
    visible: boolean,
    playerSpecies: AntSpecies,
    mmX: number,
    mmY: number,
    mmW: number,
    mmH: number,
    worldWidth: number,
    worldHeight: number,
  ): void {
    if (!visible) return;
    const col = MINIMAP_COLOR[type];
    ctx.fillStyle = col;
    for (const p of this.pheromones) {
      if (p.type !== type || p.species !== playerSpecies || p.strength < 0.2)
        continue;
      const sx = mmX + (p.pos.x / worldWidth) * mmW;
      const sy = mmY + (p.pos.y / worldHeight) * mmH;
      if (sx < mmX || sx > mmX + mmW || sy < mmY || sy > mmY + mmH) continue;
      ctx.globalAlpha = p.strength * 0.5;
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Find the nearest pheromone of a given type and species within radius.
   * Returns null when nothing qualifies.
   */
  queryNearest(
    pos: Point,
    type: PheromoneType,
    species: AntSpecies,
    radius: number,
  ): Pheromone | null {
    let best: Pheromone | null = null;
    let bestDist = radius * radius;
    for (const p of this.pheromones) {
      if (p.type !== type || p.species !== species) continue;
      const dx = p.pos.x - pos.x;
      const dy = p.pos.y - pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        best = p;
      }
    }
    return best;
  }

  /**
   * Gradient climbing: find the STRONGEST (freshest) pheromone within radius.
   * Freshest particles were deposited most recently — closest to the source
   * (food item or combat site). Following them steers the ant toward the goal.
   */
  queryStrongest(
    pos: Point,
    type: PheromoneType,
    species: AntSpecies,
    radius: number,
  ): Pheromone | null {
    let best: Pheromone | null = null;
    let bestStrength = 0;
    const r2 = radius * radius;
    for (const p of this.pheromones) {
      if (p.type !== type || p.species !== species) continue;
      const dx = p.pos.x - pos.x;
      const dy = p.pos.y - pos.y;
      if (dx * dx + dy * dy > r2) continue;
      if (p.strength > bestStrength) {
        bestStrength = p.strength;
        best = p;
      }
    }
    return best;
  }
}
