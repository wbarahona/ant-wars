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
import { areInContact, resolveCombat, replenishAlly } from "../combat";

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
    // ---- Contact detection ------------------------------------------------
    for (let i = 0; i < allAnts.length; i++) {
      for (let j = i + 1; j < allAnts.length; j++) {
        const a = allAnts[i];
        const b = allAnts[j];
        if (!a.isAlive || !b.isAlive) continue;
        if (!areInContact(a, b)) continue;

        if (a.species !== b.species) {
          // Track fight start / update midpoint each frame
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
          if (a.combatCooldown <= 0 && b.combatCooldown <= 0)
            replenishAlly(a, b);
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
