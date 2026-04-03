export interface Point {
  x: number;
  y: number;
}

export type AntSpecies = "red" | "black" | "green" | "yellow";

export type AntRole = "queen" | "drone" | "worker" | "soldier";

export type AntState =
  | "idle"
  | "moving"
  | "attacking"
  | "gathering"
  | "returning"
  | "dead";

// US Marines enlisted rank ladder — index = RankLevel
export const RANKS = [
  { level: 0, grade: "E-1", name: "Private", chevrons: 0, rockers: 0 },
  {
    level: 1,
    grade: "E-2",
    name: "Private First Class",
    chevrons: 1,
    rockers: 0,
  },
  { level: 2, grade: "E-3", name: "Lance Corporal", chevrons: 2, rockers: 0 },
  { level: 3, grade: "E-4", name: "Corporal", chevrons: 3, rockers: 0 },
  { level: 4, grade: "E-5", name: "Sergeant", chevrons: 3, rockers: 1 },
  { level: 5, grade: "E-6", name: "Staff Sergeant", chevrons: 3, rockers: 2 },
  { level: 6, grade: "E-7", name: "Gunnery Sergeant", chevrons: 3, rockers: 3 },
] as const;

// Convenience alias for O(1) name lookup by level
export const RANK_NAMES = RANKS.map((r) => r.name) as string[];

export type RankLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
