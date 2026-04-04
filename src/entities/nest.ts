/**
 * nest.ts
 *
 * A Nest is the colony origin point — spawned once per species.
 * It is purely positional data; all rendering is in anthillPrefab.ts.
 */

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

  constructor(species: AntSpecies, pos: { x: number; y: number }) {
    this.species = species;
    this.color = SPECIES_COLOR[species];
    this.pos = { ...pos };
  }
}
