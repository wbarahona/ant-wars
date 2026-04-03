/**
 * species.ts
 *
 * Defines the Species base class and the four concrete ant species.
 * Each species supplies its own colour palette (sprite rendering), primary
 * display colour (fight cloud / minimap), per-role base stats, and a
 * natural "prey" species that it counters in combat (1.5× power advantage).
 *
 * Rock-paper-scissors cycle
 * ─────────────────────────
 *   Black (army)      → beats → Yellow (carpenter)
 *   Yellow (carpenter)→ beats → Red    (fire)
 *   Red   (fire)      → beats → Green  (leaf-cutter)
 *   Green (leaf-cutter)→ beats → Black  (army)
 *
 * Black:  balanced bruiser  — high HP + defense, steady damage
 * Red:    glass cannon      — maximum attack, minimal HP / defense
 * Green:  fortress          — deepest defense + HP pool, lowest offense
 * Yellow: swift scout       — fastest, well-rounded moderate stats
 */

import type { AntSpecies, AntRole } from "../types";

// ── Palette ──────────────────────────────────────────────────────────────────
// Tuple indexed by pixel value (0 = transparent, never used at runtime):
//   [0-empty, 1-body, 2-accent, 3-limb, 4-antenna, 5-wing]
export type Palette = ["", string, string, string, string, string];

// ── Per-role base stats ───────────────────────────────────────────────────────
export type BaseStats = {
  hp: number;
  speed: number;
  attack: number;
  defense: number;
};

// ── Internal data table ───────────────────────────────────────────────────────
type SpeciesRecord = {
  /** Primary CSS colour — used in fight cloud fragments and minimap dots. */
  color: string;
  /** Sprite colour palette (pixel slots 1–5). */
  palette: Palette;
  /** The species this one counters in combat. */
  prey: AntSpecies;
  /** Base stats by role, before rank-up buffs. */
  stats: Record<AntRole, BaseStats>;
};

const SPECIES_DATA: Record<AntSpecies, SpeciesRecord> = {
  // ── BLACK (Army ants) ── balanced bruisers ──────────────────────────────
  // High HP and defense; steady mid-range attack; low speed.
  // Natural prey: Yellow  (overwhelms the light scouts with raw mass)
  black: {
    color: "#2c2c2c",
    palette: ["", "#2c2c2c", "#111111", "#3f3f3f", "#3f3f3f", "#aac4e0"],
    prey: "yellow",
    stats: {
      queen: { hp: 570, speed: 25, attack: 10, defense: 20 },
      soldier: { hp: 185, speed: 50, attack: 28, defense: 16 },
      worker: { hp: 90, speed: 50, attack: 6, defense: 10 },
      drone: { hp: 36, speed: 60, attack: 3, defense: 3 },
    },
  },

  // ── RED (Fire ants) ── glass cannon ────────────────────────────────────
  // Highest attack in the game; very low HP and defense.
  // Natural prey: Green  (fire burns through even the toughest carapace)
  red: {
    color: "#c0392b",
    palette: ["", "#c0392b", "#7b241c", "#922b21", "#922b21", "#f5b7b1"],
    prey: "green",
    stats: {
      queen: { hp: 380, speed: 34, attack: 14, defense: 10 },
      soldier: { hp: 100, speed: 72, attack: 38, defense: 6 },
      worker: { hp: 50, speed: 72, attack: 8, defense: 3 },
      drone: { hp: 22, speed: 82, attack: 5, defense: 1 },
    },
  },

  // ── GREEN (Leaf-cutter ants) ── fortress ────────────────────────────────
  // Deepest defense and largest HP pool; lowest attack output.
  // Natural prey: Black  (outlasts the heavy hitters through pure attrition)
  green: {
    color: "#1e5229",
    palette: ["", "#1e5229", "#0e2e16", "#184020", "#184020", "#7ab87a"],
    prey: "black",
    stats: {
      queen: { hp: 600, speed: 25, attack: 8, defense: 30 },
      soldier: { hp: 220, speed: 50, attack: 20, defense: 25 },
      worker: { hp: 100, speed: 50, attack: 4, defense: 16 },
      drone: { hp: 38, speed: 60, attack: 2, defense: 8 },
    },
  },

  // ── YELLOW (Carpenter ants) ── swift scouts ─────────────────────────────
  // Fastest movement; balanced moderate stats across the board.
  // Natural prey: Red  (consistent speed + strikes chip the fragile glass cannon)
  yellow: {
    color: "#c8960a",
    palette: ["", "#c8960a", "#8b6200", "#a07200", "#a07200", "#ffe578"],
    prey: "red",
    stats: {
      queen: { hp: 440, speed: 38, attack: 11, defense: 17 },
      soldier: { hp: 140, speed: 75, attack: 27, defense: 13 },
      worker: { hp: 70, speed: 75, attack: 6, defense: 8 },
      drone: { hp: 28, speed: 85, attack: 4, defense: 2 },
    },
  },
};

/** Combat power multiplier granted when a species fights its natural prey. */
export const SPECIES_ADVANTAGE_MULT = 1.5;

// ── Species base class ────────────────────────────────────────────────────────

export class Species {
  /** Canonical species identifier — same string used across all modules. */
  readonly species: AntSpecies;

  /** Primary display colour (fight cloud, minimap dot, UI accents). */
  readonly color: string;

  /** Sprite colour palette — pixel slots 1–5. */
  readonly palette: Palette;

  constructor(speciesName: AntSpecies) {
    const data = SPECIES_DATA[speciesName];
    this.species = speciesName;
    this.color = data.color;
    this.palette = data.palette;
  }

  /** Returns the base stat block for an ant of this species and the given role. */
  baseStats(role: AntRole): BaseStats {
    return SPECIES_DATA[this.species].stats[role];
  }

  /**
   * Returns SPECIES_ADVANTAGE_MULT (1.5) if this species has a natural
   * advantage against `other`, otherwise returns 1.0.
   */
  advantageAgainst(other: AntSpecies): number {
    return SPECIES_DATA[this.species].prey === other
      ? SPECIES_ADVANTAGE_MULT
      : 1.0;
  }
}
