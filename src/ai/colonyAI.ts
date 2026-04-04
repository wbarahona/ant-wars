/**
 * colonyAI.ts
 *
 * Drives autonomous ant-spawning for every nest.
 *
 * Each nest checks a cooldown timer; when it fires it spends 1 food from
 * foodStored and spawns one ant of the most-needed caste at the nest
 * position (with a small jitter).  This applies to both the player's colony
 * and any opfor colony — a manual caste-slider override is planned for later.
 */

import { Ant } from "../entities/ant";
import type { Nest } from "../entities/nest";
import type { AntRole } from "../types";

/** Food pieces consumed per spawned ant. */
const SPAWN_COST = 1;

// ── Colony game phase ─────────────────────────────────────────────────────────
/**
 * Three-phase colony lifecycle that drives spawn priorities and timing.
 *
 *  early  (pop  <  12) – food income is critical; flood with workers.
 *  mid    (pop 12–34) – income is stable; grow exponentially across all castes.
 *  late   (pop >= 35) – war footing; mass-produce soldiers to assault the enemy.
 */
export type ColonyPhase = "early" | "mid" | "late";

const EARLY_POP_CAP = 12;
const LATE_POP_FLOOR = 35;

export function getColonyPhase(nest: Nest): ColonyPhase {
  if (nest.population < EARLY_POP_CAP) return "early";
  if (nest.population < LATE_POP_FLOOR) return "mid";
  return "late";
}

/** Caste target fractions per phase (queens excluded from auto-spawn). */
const PHASE_TARGETS: Record<ColonyPhase, Partial<Record<AntRole, number>>> = {
  early: { worker: 0.8, soldier: 0.15, drone: 0.05 },
  mid: { worker: 0.55, soldier: 0.3, drone: 0.15 },
  late: { worker: 0.35, soldier: 0.55, drone: 0.1 },
};

/**
 * Seconds between spawn attempts per phase.
 * Mid/late colonies have healthier food income and can afford tighter cycles.
 */
const PHASE_INTERVAL: Record<ColonyPhase, number> = {
  early: 10,
  mid: 6,
  late: 5,
};

/** Map each spawnable role to the matching Nest counter field. */
const ROLE_FIELD: Partial<Record<AntRole, "workers" | "soldiers" | "drones">> =
  {
    worker: "workers",
    soldier: "soldiers",
    drone: "drones",
  };

const SPAWN_ROLES: AntRole[] = ["worker", "soldier", "drone"];

/**
 * Decide which caste is most needed for this nest.
 * Prioritises workers for tiny colonies; otherwise picks the role whose
 * actual fraction falls furthest below its target.
 */
function pickCaste(nest: Nest): AntRole {
  // Bootstrap: fill workers until colony has a bare minimum
  if (nest.population < 4) return "worker";

  const phase = getColonyPhase(nest);
  const targets = PHASE_TARGETS[phase];
  const pop = Math.max(nest.population, 1);

  let bestRole: AntRole = "worker";
  let bestDeficit = -Infinity;

  for (const role of SPAWN_ROLES) {
    const field = ROLE_FIELD[role]!;
    const current = (nest[field] as number) / pop;
    const deficit = (targets[role] ?? 0) - current;
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      bestRole = role;
    }
  }

  return bestRole;
}

/** Small random offset so ants don't stack exactly on the nest sprite. */
function jitter(): number {
  return (Math.random() - 0.5) * 28;
}

/**
 * Called once per game tick for every nest.
 * Newly spawned ants are pushed directly into allAnts.
 *
 * @param nests   All active nests (player + opfor).
 * @param allAnts Shared ant array — new ants are appended here.
 * @param dt      Delta time in seconds.
 */
export function tickColonyAI(nests: Nest[], allAnts: Ant[], dt: number): void {
  for (const nest of nests) {
    nest.spawnTimer -= dt;
    if (nest.spawnTimer > 0) continue;

    // Reset cooldown (phase-dependent; faster in mid/late once food income is healthy)
    nest.spawnTimer = PHASE_INTERVAL[getColonyPhase(nest)];

    if (nest.foodStored < SPAWN_COST) continue;

    const role = pickCaste(nest);
    const ant = new Ant(nest.species, role, {
      x: nest.pos.x + jitter(),
      y: nest.pos.y + jitter(),
    });

    nest.foodStored -= SPAWN_COST;
    allAnts.push(ant);
  }
}
