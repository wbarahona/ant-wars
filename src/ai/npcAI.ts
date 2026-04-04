/**
 * npcAI.ts
 *
 * Autonomous behaviour agent for all non-player ants.
 *
 * Decision hierarchy (evaluated once per AI tick, ~every 1.5 s):
 *   1. Already has a target → keep it (let movement system drive)
 *   2. In combat / post-combat window → skip (fightManager handles)
 *   3. Role-specific pheromone bias:
 *        Soldier  → sniff for ally ATTACK trail  (ATTACK_BIAS chance)
 *        Worker   → sniff for ally FOOD trail    (FOOD_BIAS chance)
 *        All      → fallback sniff for any food trail within radius
 *   4. Food search: wander toward the nearest visible food item
 *   5. Default: pick a random roam point near current position
 *
 * Future extension points:
 *   • "returning" state — carry food back toward a nest point
 *   • Group cohesion — soldiers try to stay near other soldiers
 *   • Flee behaviour — low-HP ants retreat from enemies
 */

import type { Ant } from "../entities/ant";
import type { Food } from "../entities/food";
import type { PheromoneLayer } from "../world/pheromoneLayer";
import type { Point } from "../types";

// ── Tuning constants ──────────────────────────────────────────────────────────

/** Seconds between AI decision ticks per ant. */
const AI_TICK_INTERVAL = 1.5;

/** World-px radius within which an ant can smell pheromones. */
const PHEROMONE_SMELL_RADIUS = 180;

/** World-px radius within which an ant can see food directly. */
const FOOD_SIGHT_RADIUS = 220;

/** World-px spread of a random roam destination. */
const ROAM_SPREAD = 300;

/** 0–1 probability that a Soldier follows an attack trail when it finds one. */
const SOLDIER_ATTACK_BIAS = 0.8;

/** 0–1 probability that a Worker follows a food trail when it finds one. */
const WORKER_FOOD_BIAS = 0.8;

/** 0–1 probability that any ant follows a food trail as a fallback. */
const GENERAL_FOOD_TRAIL_BIAS = 0.45;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Clamp a point so the ant doesn't roam outside the world bounds. */
function clampToWorld(
  p: Point,
  worldWidth: number,
  worldHeight: number,
): Point {
  const MARGIN = 40;
  return {
    x: Math.max(MARGIN, Math.min(worldWidth - MARGIN, p.x)),
    y: Math.max(MARGIN, Math.min(worldHeight - MARGIN, p.y)),
  };
}

/** Pick a random roam destination near the ant's current position. */
function randomRoam(ant: Ant, worldWidth: number, worldHeight: number): Point {
  const angle = Math.random() * Math.PI * 2;
  const radius = ROAM_SPREAD * (0.3 + Math.random() * 0.7);
  return clampToWorld(
    {
      x: ant.pos.x + Math.cos(angle) * radius,
      y: ant.pos.y + Math.sin(angle) * radius,
    },
    worldWidth,
    worldHeight,
  );
}

// ── Per-ant AI state ──────────────────────────────────────────────────────────

/** Keyed by ant.id — stores the countdown to the next decision for each NPC. */
const tickTimers = new Map<number, number>();

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Tick the AI for every non-player alive ant.
 * Call once per game-logic frame from update.ts, passing delta time (seconds).
 */
export function tickNpcAI(
  allAnts: Ant[],
  foods: Food[],
  pheromones: PheromoneLayer,
  worldWidth: number,
  worldHeight: number,
  dt: number,
): void {
  for (const ant of allAnts) {
    if (ant.isPlayer || !ant.isAlive) continue;

    // Count down the npc's personal tick timer
    const prev = tickTimers.get(ant.id) ?? Math.random() * AI_TICK_INTERVAL;
    const next = prev - dt;
    tickTimers.set(ant.id, next);

    // Not time to decide yet — just let existing movement continue
    if (next > 0) continue;

    // Reset the countdown (with slight randomness to prevent synchronised ticks)
    tickTimers.set(ant.id, AI_TICK_INTERVAL * (0.8 + Math.random() * 0.4));

    // Already has an active target → stay course
    if (ant.target !== null) continue;

    // During / fresh-from a fight, let the fight system handle movement
    if (ant.postCombatTrailTime > 0) continue;

    const isCarrying = foods.some((f) => f.carriedBy === ant);
    const newTarget = decideTarget(
      ant,
      isCarrying,
      foods,
      pheromones,
      worldWidth,
      worldHeight,
    );
    ant.target = newTarget;
  }
}

/**
 * Returns the best target position for the given NPC ant.
 * isCarrying — true when this ant already has food in its mandibles.
 */
function decideTarget(
  ant: Ant,
  isCarrying: boolean,
  foods: Food[],
  pheromones: PheromoneLayer,
  worldWidth: number,
  worldHeight: number,
): Point {
  const roll = Math.random();

  // ── Soldiers & queens: strongly drawn to attack trails ───────────────────
  if (ant.role === "soldier" || ant.role === "queen") {
    if (roll < SOLDIER_ATTACK_BIAS) {
      const atkTrail = pheromones.queryStrongest(
        ant.pos,
        "attack",
        ant.species,
        PHEROMONE_SMELL_RADIUS,
      );
      if (atkTrail) return { ...atkTrail.pos };
    }
  }

  // ── Workers & drones: strongly drawn to food trails (only when empty) ────
  if (!isCarrying && (ant.role === "worker" || ant.role === "drone")) {
    if (roll < WORKER_FOOD_BIAS) {
      const foodTrail = pheromones.queryStrongest(
        ant.pos,
        "food",
        ant.species,
        PHEROMONE_SMELL_RADIUS,
      );
      if (foodTrail) return { ...foodTrail.pos };
    }
  }

  // ── Any role: fallback food trail (only when not carrying) ───────────────
  if (!isCarrying && roll < GENERAL_FOOD_TRAIL_BIAS) {
    const foodTrail = pheromones.queryStrongest(
      ant.pos,
      "food",
      ant.species,
      PHEROMONE_SMELL_RADIUS,
    );
    if (foodTrail) return { ...foodTrail.pos };
  }

  // ── Any role: fallback attack trail ──────────────────────────────────────
  if (roll < GENERAL_FOOD_TRAIL_BIAS) {
    const atkTrail = pheromones.queryStrongest(
      ant.pos,
      "attack",
      ant.species,
      PHEROMONE_SMELL_RADIUS,
    );
    if (atkTrail) return { ...atkTrail.pos };
  }

  // ── Direct food sight (only when not carrying) ───────────────────────────
  if (!isCarrying) {
    const groundFoods = foods.filter((f) => !f.isCarried);
    let bestFood: Food | null = null;
    let bestDist = FOOD_SIGHT_RADIUS * FOOD_SIGHT_RADIUS;
    for (const f of groundFoods) {
      const d = dist2(ant.pos, f.pos);
      if (d < bestDist) {
        bestDist = d;
        bestFood = f;
      }
    }
    if (bestFood) return { ...bestFood.pos };
  }

  // ── Default: wander ───────────────────────────────────────────────────────
  return randomRoam(ant, worldWidth, worldHeight);
}
