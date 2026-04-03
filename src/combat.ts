/**
 * combat.ts
 *
 * Pure game-logic module — no DOM, no canvas.
 * Handles:
 *  - Contact detection between any two ants
 *  - Combat resolution (foes)
 *  - HP replenishment (allies)
 *
 * Combat power formula
 * --------------------
 *   power = attack × casteMul × rankBonus × energyFactor  +  randomCrit
 *
 * Caste tier (Queen → Soldier → Worker → Drone):
 *   Queen 2.0×  Soldier 1.5×  Worker 1.0×  Drone 0.7×
 *
 * Rank bonus:   +12 % per rank level  (rank 6 = +72 %)
 * Energy factor: 50–100 % effectiveness (0 energy = half power)
 * Crit:         15 % chance of ×1.5 final damage
 *
 * Damage flow:
 *   1. combatPower() selects who wins the exchange
 *   2. rawDamage = winner.attack × casteAdvantage × rankBonus × energyFactor (± crit)
 *   3. loser.takeDamage(rawDamage)  →  takeDamage applies loser's defense internally
 *
 * One exchange per second per pair (combatCooldown on each Ant).
 */

import type { Ant } from "./entities/ant";
import type { AntRole } from "./types";
import { circlesOverlap } from "./collision";
import { GRATITUDE_QUIPS } from "./prefabs/playerAntPrefab";
import { DEPOSIT_INTERVAL } from "./world/pheromoneLayer";

// ---- Caste tier multipliers -------------------------------------------------
// Queen > Soldier > Worker > Drone
const CASTE_MULTIPLIER: Record<AntRole, number> = {
  queen: 2.0,
  soldier: 1.5,
  worker: 1.0,
  drone: 0.7,
};

// ---- Contact radii (world px = half sprite-width at its caste scale) --------
// queen: 8 cols × scale4 / 2 = 16   soldier: 10 cols × scale3 / 2 = 15
// worker: 8 cols × scale2 / 2 = 8    drone: 10 cols × scale2 / 2 = 10
const CONTACT_RADIUS: Record<AntRole, number> = {
  queen: 16,
  soldier: 15,
  worker: 8,
  drone: 10,
};

export function getContactRadius(ant: Ant): number {
  return CONTACT_RADIUS[ant.role];
}

export function areInContact(a: Ant, b: Ant): boolean {
  if (!a.isAlive || !b.isAlive) return false;
  return circlesOverlap(
    { pos: a.pos, collisionRadius: getContactRadius(a) },
    { pos: b.pos, collisionRadius: getContactRadius(b) },
  );
}

// ---- Combat resolution ------------------------------------------------------

export interface CombatResult {
  winner: Ant;
  loser: Ant;
  /** Raw damage sent to takeDamage (before loser's defense). */
  rawDamage: number;
  isCrit: boolean;
}

function combatPower(ant: Ant, opponent?: Ant): number {
  const casteMul = CASTE_MULTIPLIER[ant.role];
  const rankBonus = 1 + ant.rank * 0.12;
  const energyFactor = 0.5 + 0.5 * (ant.energy / ant.maxEnergy);
  const speciesAdv = opponent ? ant.advantageAgainst(opponent.species) : 1.0;
  const critBonus = Math.random() * ant.attack * 0.3; // up to 30 % of attack
  return (
    ant.attack * casteMul * rankBonus * energyFactor * speciesAdv + critBonus
  );
}

/**
 * One combat exchange between two hostile ants.
 * Sets both to 'attacking', applies damage to the loser, sets a 1 s cooldown.
 */
export function resolveCombat(a: Ant, b: Ant): CombatResult {
  const powerA = combatPower(a, b);
  const powerB = combatPower(b, a);
  const [winner, loser] = powerA >= powerB ? [a, b] : [b, a];

  // Damage: winner's attack scaled by caste advantage, rank, and energy
  const casteAdv = CASTE_MULTIPLIER[winner.role] / CASTE_MULTIPLIER[loser.role];
  const rankBonus = 1 + winner.rank * 0.12;
  const energyFactor = 0.5 + 0.5 * (winner.energy / winner.maxEnergy);
  const isCrit = Math.random() < 0.15;

  const rawDamage = Math.round(
    Math.max(1, winner.attack * casteAdv * rankBonus * energyFactor) *
      (isCrit ? 1.5 : 1),
  );

  // takeDamage() subtracts loser.defense internally
  loser.takeDamage(rawDamage);

  // Update states
  winner.state = "attacking";
  if (!loser.isAlive) {
    loser.state = "dead";
    // Award kill to the winner if it's the player
    if (winner.isPlayer) winner.recordKill();
  } else {
    loser.state = "attacking";
  }

  // One exchange per second
  const COMBAT_CD = 1.0;
  winner.combatCooldown = COMBAT_CD;
  loser.combatCooldown = COMBAT_CD;

  // Force a pheromone deposit on the next frame (ants may not be moving)
  winner.depositAccumulator = DEPOSIT_INTERVAL;
  if (loser.isAlive) loser.depositAccumulator = DEPOSIT_INTERVAL;

  // Keep attack trail emitting for 8 s of walking after the fight
  const POST_COMBAT_TRAIL = 8.0;
  winner.postCombatTrailTime = POST_COMBAT_TRAIL;
  if (loser.isAlive) loser.postCombatTrailTime = POST_COMBAT_TRAIL;

  return { winner, loser, rawDamage, isCrit };
}

/** Reserved for future use. Replenishment is handled by replenishAlly. */
export function regurgitate(_a: Ant, _b: Ant): void {}

// ---- Ally replenishment (energy) --------------------------------------------

/**
 * When a friendly ally touches the player ant, fully restore the player's
 * energy to max. The ally's stats are left untouched.
 * Throttled by a 2 s cooldown to prevent instant re-use.
 */
export function replenishAlly(a: Ant, b: Ant): void {
  const player = a.isPlayer ? a : b.isPlayer ? b : null;
  if (!player) return; // neither ant is the player — nothing to do
  if (player.energy >= player.maxEnergy) return; // already full
  if (player.combatCooldown > 0) return; // throttle

  const wasHungry = player.energy / player.maxEnergy <= 0.6;
  player.energy = player.maxEnergy;

  if (wasHungry) {
    const q = GRATITUDE_QUIPS;
    player.setSpeechBubble(q[Math.floor(Math.random() * q.length)], 2500);
  }

  const REPLENISH_CD = 2.0;
  player.combatCooldown = REPLENISH_CD;
}
