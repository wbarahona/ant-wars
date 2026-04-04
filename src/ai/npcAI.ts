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
import type { Nest } from "../entities/nest";
import type { PheromoneLayer } from "../world/pheromoneLayer";
import type { Point } from "../types";
import { getColonyPhase } from "./colonyAI";

// ── Tuning constants ──────────────────────────────────────────────────────────

/** Seconds between AI decision ticks per ant. */
const AI_TICK_INTERVAL = 1.5;

/** World-px radius within which an ant can smell pheromones. */
const PHEROMONE_SMELL_RADIUS = 280;

/** World-px radius within which a soldier/queen can see food directly. */
const FOOD_SIGHT_RADIUS = 220;

/** World-px radius within which a worker/drone can see food directly.
 *  Larger than soldiers — workers are specialised foragers. */
const WORKER_FOOD_SIGHT_RADIUS = 380;

/** World-px scan radius for a worker/drone that has reached the dim end of a
 *  food trail and found no more pheromones to follow.  Wider scan lets them
 *  spot food items in the surrounding cluster and pick up the next piece. */
const WORKER_TRAIL_END_SIGHT_RADIUS = 520;

/** World-px spread of a random roam destination. */
const ROAM_SPREAD = 300;

/** 0–1 probability that a Soldier follows an attack trail when it finds one. */
const SOLDIER_ATTACK_BIAS = 0.8;

/** 0–1 probability that a Worker follows a food trail when it finds one.
 *  Set high so workers reliably chain onto existing pheromone paths. */
const WORKER_FOOD_BIAS = 0.95;

/** 0–1 probability that any ant follows a food trail as a fallback. */
const GENERAL_FOOD_TRAIL_BIAS = 0.7;

/** World-px radius within which drones patrol around their home nest. */
const DRONE_LINGER_RADIUS = 160;

/** Late-game probability that soldiers march directly on the enemy nest. */
const LATE_ENEMY_NEST_BIAS = 0.75;

/** World-px orbit radius for recruited squad members around the player ant. */
const SQUAD_ORBIT_RADIUS = 200;

/**
 * Half-angle of the directional cone used when an ant roams without a target.
 * Black (player) colony ants bias eastward; red (opfor) bias westward.
 * A ±120° cone keeps movement natural while strongly favouring mid-world food.
 */
const ROAM_CONE_HALF = (Math.PI * 2) / 3; // 120°

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

/**
 * Pick a random roam destination near the ant's current position.
 *
 * Directional bias: player-colony ants (black) prefer to explore rightward
 * (east = +x) toward mid-world food clusters; opfor ants (red/green/yellow)
 * prefer leftward (west = -x).  The ±120° cone still allows vertical and
 * backward movement so behaviour stays natural and non-robotic.
 */
function randomRoam(ant: Ant, worldWidth: number, worldHeight: number): Point {
  // Preferred heading: east for black, west for all opfor species
  const preferredAngle = ant.species === "black" ? 0 : Math.PI;
  const angle = preferredAngle + (Math.random() - 0.5) * ROAM_CONE_HALF * 2;
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
  nests: Nest[],
  pheromones: PheromoneLayer,
  worldWidth: number,
  worldHeight: number,
  dt: number,
  playerAnt: Ant,
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

    // ── Recruited squad: orbit the player within SQUAD_ORBIT_RADIUS ─────────
    if (ant.isRecruited) {
      if (playerAnt.isAlive) {
        const angle = Math.random() * Math.PI * 2;
        const r = 40 + Math.random() * (SQUAD_ORBIT_RADIUS - 40);
        ant.target = clampToWorld(
          {
            x: playerAnt.pos.x + Math.cos(angle) * r,
            y: playerAnt.pos.y + Math.sin(angle) * r,
          },
          worldWidth,
          worldHeight,
        );
      } else {
        ant.target = null; // player dead — wait in place
      }
      continue;
    }

    // Already has an active target → stay course
    if (ant.target !== null) continue;

    // During / fresh-from a fight, let the fight system handle movement
    if (ant.postCombatTrailTime > 0) continue;

    const isCarrying = foods.some((f) => f.carriedBy === ant);
    const newTarget = decideTarget(
      ant,
      isCarrying,
      foods,
      nests,
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
  nests: Nest[],
  pheromones: PheromoneLayer,
  worldWidth: number,
  worldHeight: number,
): Point {
  // ── Carrying food → head straight home to deposit ────────────────────────
  if (isCarrying) {
    const homeNest = nests.find((n) => n.species === ant.species);
    if (homeNest) return { ...homeNest.pos };
  }
  // ── Drones: patrol / linger near their home nest (tactical reserve) ─────────
  if (ant.role === "drone") {
    const homeNest = nests.find((n) => n.species === ant.species);
    if (homeNest) {
      const angle = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * (DRONE_LINGER_RADIUS - 30);
      return clampToWorld(
        {
          x: homeNest.pos.x + Math.cos(angle) * r,
          y: homeNest.pos.y + Math.sin(angle) * r,
        },
        worldWidth,
        worldHeight,
      );
    }
    return randomRoam(ant, worldWidth, worldHeight);
  }
  const roll = Math.random();

  // ── Soldiers & queens: late-game march on enemy nest; else follow attack trail ─
  if (ant.role === "soldier" || ant.role === "queen") {
    const homeNest = nests.find((n) => n.species === ant.species);
    if (
      homeNest &&
      getColonyPhase(homeNest) === "late" &&
      roll < LATE_ENEMY_NEST_BIAS
    ) {
      const enemyNest = nests.find((n) => n.species !== ant.species);
      if (enemyNest) return { ...enemyNest.pos };
    }
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

  // ── Workers: follow food trail toward its DIM end (= food source) ────────────
  // queryWeakest returns the pheromone with the lowest strength within range.
  // Since food pheromones are deposited on the return trip (food→nest),
  // the weakest end of the trail points toward where the food was picked up.
  if (!isCarrying && ant.role === "worker") {
    if (roll < WORKER_FOOD_BIAS) {
      const foodTrail = pheromones.queryWeakest(
        ant.pos,
        "food",
        ant.species,
        PHEROMONE_SMELL_RADIUS,
      );
      if (foodTrail) return { ...foodTrail.pos };
    }
  }

  // ── Any role: fallback food trail — also follow toward source ────────────
  if (!isCarrying && roll < GENERAL_FOOD_TRAIL_BIAS) {
    const foodTrail = pheromones.queryWeakest(
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
  // Workers/drones that exhausted all trail signals get an even wider scan
  // (WORKER_TRAIL_END_SIGHT_RADIUS) so they can spot the next piece in the
  // same food cluster before falling back to a directional roam.
  if (!isCarrying) {
    const noTrailNearby =
      pheromones.queryWeakest(
        ant.pos,
        "food",
        ant.species,
        PHEROMONE_SMELL_RADIUS,
      ) === null;
    const sightR =
      ant.role === "worker"
        ? noTrailNearby
          ? WORKER_TRAIL_END_SIGHT_RADIUS
          : WORKER_FOOD_SIGHT_RADIUS
        : FOOD_SIGHT_RADIUS;
    const groundFoods = foods.filter((f) => !f.isCarried);
    let bestFood: Food | null = null;
    let bestDist = sightR * sightR;
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
