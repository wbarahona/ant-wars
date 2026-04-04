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

/**
 * How often (seconds) each nest attempts a spawn.
 * Roughly one new ant every 8 s once food income is healthy.
 */
const SPAWN_INTERVAL = 8;

/**
 * Target population fractions for spawnable castes.
 * Queens are excluded — the player controls the black queen; red gets none.
 */
const TARGET: Partial<Record<AntRole, number>> = {
  worker: 0.6,
  soldier: 0.25,
  drone: 0.15,
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
  const pop = Math.max(nest.population, 1);

  // Bootstrap: fill workers until colony has a bare minimum
  if (nest.population < 4) return "worker";

  let bestRole: AntRole = "worker";
  let bestDeficit = -Infinity;

  for (const role of SPAWN_ROLES) {
    const field = ROLE_FIELD[role]!;
    const current = (nest[field] as number) / pop;
    const deficit = (TARGET[role] ?? 0) - current;
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

    // Reset cooldown first (even if we can't afford a spawn this cycle)
    nest.spawnTimer = SPAWN_INTERVAL;

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
