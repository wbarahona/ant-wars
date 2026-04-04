/**
 * fightManager.ts
 *
 * Owns all fight-lifecycle logic:
 *   - Contact detection between all ant pairs
 *   - Fight record creation and midpoint tracking
 *   - Ally HP replenishment
 *   - Forced kill resolution at 2 s
 *   - Record cleanup after 4 s
 */

import type { Ant } from "../entities/ant";
import {
  areInContact,
  resolveCombat,
  replenishAlly,
  regurgitate,
} from "../combat";

// ── Spatial contact grid ────────────────────────────────────────────────────────────
// Cell size = 2 × queen contact radius (16 px).  Ants can only be in contact if
// they are in the same or immediately adjacent grid cell, cutting the pair-scan
// from O(n²) to O(n × k) where k is the average ants per 3×3 neighbourhood.
const CONTACT_CELL = 32;

function cKey(x: number, y: number): number {
  // Pack two 14-bit cell indices into a single integer.
  // Supports worlds up to 16 384 × 32 = 524 288 px in each axis.
  const cx = Math.floor(x / CONTACT_CELL) & 0x3fff;
  const cy = Math.floor(y / CONTACT_CELL) & 0x3fff;
  return (cx << 14) | cy;
}

function buildContactGrid(allAnts: Ant[]): Map<number, Ant[]> {
  const grid = new Map<number, Ant[]>();
  for (const ant of allAnts) {
    if (!ant.isAlive) continue;
    const k = cKey(ant.pos.x, ant.pos.y);
    const cell = grid.get(k);
    if (cell) cell.push(ant);
    else grid.set(k, [ant]);
  }
  return grid;
}

export type FightRecord = {
  startTime: number;
  midX: number;
  midY: number;
  antA: Ant;
  antB: Ant;
  /** "K.O.!" or "OUCH!" — set at the 2 s resolution moment. */
  resolvedOutcome: string | null;
};

export class FightManager {
  readonly records = new Map<string, FightRecord>();

  key(a: Ant, b: Ant): string {
    const lo = Math.min(a.id, b.id);
    const hi = Math.max(a.id, b.id);
    return `${lo}-${hi}`;
  }

  update(allAnts: Ant[], gameTime: number): void {
    // ---- Contact detection (spatial grid: O(n×k) instead of O(n²)) --------
    const grid = buildContactGrid(allAnts);

    for (const a of allAnts) {
      if (!a.isAlive) continue;
      const cx = Math.floor(a.pos.x / CONTACT_CELL);
      const cy = Math.floor(a.pos.y / CONTACT_CELL);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = grid.get(
            (((cx + dx) & 0x3fff) << 14) | ((cy + dy) & 0x3fff),
          );
          if (!cell) continue;

          for (const b of cell) {
            // Only process each pair once: require b.id > a.id
            if (b.id <= a.id) continue;
            if (!areInContact(a, b)) continue;

            if (a.species !== b.species) {
              const key = this.key(a, b);
              const midX = (a.pos.x + b.pos.x) / 2;
              const midY = (a.pos.y + b.pos.y) / 2;
              if (!this.records.has(key)) {
                this.records.set(key, {
                  startTime: gameTime,
                  midX,
                  midY,
                  antA: a,
                  antB: b,
                  resolvedOutcome: null,
                });
              } else {
                const rec = this.records.get(key)!;
                rec.midX = midX;
                rec.midY = midY;
              }
              if (a.combatCooldown <= 0 && b.combatCooldown <= 0)
                resolveCombat(a, b);
            } else {
              if (a.combatCooldown <= 0 && b.combatCooldown <= 0) {
                replenishAlly(a, b);
                regurgitate(a, b);
              }
            }
          }
        }
      }
    }

    // ---- Force resolution at 1.2 s ----------------------------------------
    for (const rec of this.records.values()) {
      if (!rec.antA.isAlive || !rec.antB.isAlive) continue;
      if (gameTime - rec.startTime < 1.2) continue;

      const ratioA = rec.antA.hp / rec.antA.maxHp;
      const ratioB = rec.antB.hp / rec.antB.maxHp;
      const [loser, winner] =
        ratioA <= ratioB ? [rec.antA, rec.antB] : [rec.antB, rec.antA];

      loser.hp = 0;
      loser.state = "dead";
      if (winner.isPlayer) winner.recordKill();
      rec.resolvedOutcome = loser.isPlayer ? "OUCH!" : "K.O.!";
    }

    // ---- Cleanup expired records (> 2.8 s) --------------------------------
    for (const [key, rec] of this.records) {
      if (gameTime - rec.startTime > 2.8) this.records.delete(key);
    }
  }
}
