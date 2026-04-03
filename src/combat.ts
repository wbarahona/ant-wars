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

  return { winner, loser, rawDamage, isCrit };
}

// ---- Ally replenishment -----------------------------------------------------

/**
 * Transfer HP from the healthier ally to the needier one.
 * The donor always keeps at least 30 % HP and transfers at most 8 HP.
 * Uses combatCooldown to throttle (0.5 s between transfers).
 */
export function replenishAlly(a: Ant, b: Ant): void {
  const ratioA = a.hp / a.maxHp;
  const ratioB = b.hp / b.maxHp;
  if (Math.abs(ratioA - ratioB) < 0.1) return; // already similar — skip

  const [donor, recipient] = ratioA >= ratioB ? [a, b] : [b, a];

  const maxGive = Math.floor(donor.hp - donor.maxHp * 0.3);
  const maxReceive = recipient.maxHp - recipient.hp;
  const transfer = Math.min(8, maxGive, maxReceive);
  if (transfer <= 0) return;

  donor.hp -= transfer;
  recipient.hp += transfer;

  const REPLENISH_CD = 0.5;
  donor.combatCooldown = REPLENISH_CD;
  recipient.combatCooldown = REPLENISH_CD;
}
