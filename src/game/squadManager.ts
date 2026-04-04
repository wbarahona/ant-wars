/**
 * squadManager.ts
 *
 * Manages the player's recruited squad — a group of allied non-drone ants
 * that orbit the player and follow them around the world.
 *
 * Recruit: picks the N nearest eligible allies and marks them isRecruited.
 * Release: clears isRecruited on all squad members so they resume normal AI.
 *
 * Eligible recruits:
 *   - same species as player
 *   - alive
 *   - not the player ant itself
 *   - not a drone (drones are tactical reserves, never recruited)
 *   - not a queen (queens guard the nest, never recruited)
 *   - not already recruited
 */

import type { Ant } from "../entities/ant";

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

/**
 * Recruit up to `count` additional ants into the squad.
 * Picks the nearest eligible ants first.
 * Returns the new total recruited count.
 */
export function recruitAnts(
  count: number,
  allAnts: Ant[],
  playerAnt: Ant,
): number {
  const candidates = allAnts
    .filter(
      (a) =>
        !a.isPlayer &&
        a.isAlive &&
        a.species === playerAnt.species &&
        a.role !== "drone" &&
        a.role !== "queen" &&
        !a.isRecruited,
    )
    .sort(
      (a, b) =>
        dist2(a.pos.x, a.pos.y, playerAnt.pos.x, playerAnt.pos.y) -
        dist2(b.pos.x, b.pos.y, playerAnt.pos.x, playerAnt.pos.y),
    );

  const toRecruit = candidates.slice(0, count);
  for (const ant of toRecruit) {
    ant.isRecruited = true;
    ant.target = null; // clear any current waypoint immediately
  }

  return countSquad(allAnts);
}

/**
 * Release all currently recruited ants back to normal AI behaviour.
 * Returns 0 (new squad count).
 */
export function releaseSquad(allAnts: Ant[]): number {
  for (const ant of allAnts) {
    if (ant.isRecruited) {
      ant.isRecruited = false;
      ant.target = null; // let AI pick a fresh target next tick
    }
  }
  return 0;
}

/** Returns how many ants are currently recruited (alive members only). */
export function countSquad(allAnts: Ant[]): number {
  return allAnts.filter((a) => a.isRecruited && a.isAlive).length;
}
