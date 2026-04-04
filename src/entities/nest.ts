/**
 * nest.ts
 *
 * A Nest is the colony origin point — spawned once per species.
 * It tracks colony-level stats that are displayed in the side panel.
 * All rendering is in anthillPrefab.ts.
 */

import type { Ant } from "./ant";
import type { AntSpecies } from "../types";

const SPECIES_COLOR: Record<AntSpecies, string> = {
  black: "#2c2c2c",
  red: "#c0392b",
  green: "#1e5229",
  yellow: "#c8960a",
};

export class Nest {
  readonly species: AntSpecies;
  readonly color: string;
  pos: { x: number; y: number };

  // ── Colony stats (updated each frame) ──────────────────────────────────
  /** Current alive population. */
  population = 0;
  workers = 0;
  soldiers = 0;
  drones = 0;
  queens = 0;

  /** Cumulative food pieces delivered to this nest (stat display only). */
  foodDelivered = 0;

  /** Current food reserves available to spend on spawning. */
  foodStored = 0;

  /** Countdown (seconds) until the next spawn attempt. */
  spawnTimer = 0;

  /** This colony's queen ant (NPC). Null until the queen is spawned. */
  queenAnt: Ant | null = null;

  constructor(species: AntSpecies, pos: { x: number; y: number }) {
    this.species = species;
    this.color = SPECIES_COLOR[species];
    this.pos = { ...pos };
  }

  /**
   * Recount living ants for this colony.
   * Call once per frame (cheap linear scan).
   */
  updateStats(allAnts: Ant[]): void {
    let pop = 0,
      workers = 0,
      soldiers = 0,
      drones = 0,
      queens = 0;
    for (const ant of allAnts) {
      if (ant.species !== this.species || !ant.isAlive) continue;
      pop++;
      if (ant.role === "worker") workers++;
      else if (ant.role === "soldier") soldiers++;
      else if (ant.role === "drone") drones++;
      else if (ant.role === "queen") queens++;
    }
    this.population = pop;
    this.workers = workers;
    this.soldiers = soldiers;
    this.drones = drones;
    this.queens = queens;
  }
}
