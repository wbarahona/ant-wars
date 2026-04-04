/**
 * update.ts
 *
 * One game-logic tick: camera scroll, ant updates, fight manager step.
 */

import type { GameState } from "./gameState";
import { respawnPlayer } from "./gameState";
import type { FightManager } from "./fightManager";
import { showRespawnDialog } from "./respawnDialog";
import { circlesOverlap } from "../collision";
import { getContactRadius } from "../combat";
import {
  FOOD_QUIPS_HUNGRY,
  FOOD_DEPOSIT_QUIPS,
} from "../prefabs/playerAntPrefab";
import { DEPOSIT_INTERVAL } from "../world/pheromoneLayer";
import { tickNpcAI } from "../ai/npcAI";
import { tickColonyAI } from "../ai/colonyAI";

const SCROLL_SPEED = 600; // px/s
const EDGE_ZONE = 40; // px from canvas edge to trigger edge scroll
/** World-px from nest centre within which a carrying NPC deposits food. */
const NEST_DELIVER_RADIUS = 32;

export function update(
  state: GameState,
  fights: FightManager,
  dt: number,
): void {
  let dx = 0;
  let dy = 0;

  const { input, vw, vh, camera } = state;

  // Keyboard (arrows + WASD)
  if (input.isDown("ArrowLeft") || input.isDown("KeyA"))
    dx -= SCROLL_SPEED * dt;
  if (input.isDown("ArrowRight") || input.isDown("KeyD"))
    dx += SCROLL_SPEED * dt;
  if (input.isDown("ArrowUp") || input.isDown("KeyW")) dy -= SCROLL_SPEED * dt;
  if (input.isDown("ArrowDown") || input.isDown("KeyS"))
    dy += SCROLL_SPEED * dt;

  // Mouse edge scroll (proportional to how close to the edge)
  const mx = input.mouseX;
  const my = input.mouseY;
  if (mx >= 0) {
    if (mx < EDGE_ZONE) dx -= SCROLL_SPEED * dt * (1 - mx / EDGE_ZONE);
    if (mx > vw - EDGE_ZONE)
      dx += SCROLL_SPEED * dt * ((mx - (vw - EDGE_ZONE)) / EDGE_ZONE);
    if (my < EDGE_ZONE) dy -= SCROLL_SPEED * dt * (1 - my / EDGE_ZONE);
    if (my > vh - EDGE_ZONE)
      dy += SCROLL_SPEED * dt * ((my - (vh - EDGE_ZONE)) / EDGE_ZONE);
  }

  camera.move(dx, dy);
  state.gameTime += dt;

  for (const ant of state.allAnts) ant.update(dt);

  // ---- Colony stats (population census) ----------------------------------
  for (const nest of state.nests) nest.updateStats(state.allAnts);

  // ---- Pheromone trail deposits -------------------------------------------
  state.pheromoneLayer.update(dt);
  const foodCarriers = new Set(
    state.foods
      .filter((f) => f.isCarried && f.carriedBy)
      .map((f) => f.carriedBy!),
  );
  for (const ant of state.allAnts) {
    if (!ant.isAlive) continue;
    if (ant.depositAccumulator < DEPOSIT_INTERVAL) continue;
    ant.depositAccumulator -= DEPOSIT_INTERVAL;
    const isCarrying = foodCarriers.has(ant);
    const isFighting = ant.state === "attacking" || ant.postCombatTrailTime > 0;

    // Priority: combat overrides food; food overrides the manual trail flags
    if (isFighting || ant.leaveAttackTrail) {
      // In combat → always attack trail (even if carrying food)
      state.pheromoneLayer.deposit(ant.pos, "attack", ant.species);
    } else if (isCarrying || ant.leaveFoodTrail) {
      // Carrying food (and not fighting) → food trail
      state.pheromoneLayer.deposit(ant.pos, "food", ant.species);
    }
  }

  // ---- Food system --------------------------------------------------------
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const food = state.foods[i];

    // Any ant (player or NPC) delivers food when close enough to their nest
    if (food.isCarried && food.carriedBy) {
      const carrier = food.carriedBy;
      const homeNest = state.nests.find((n) => n.species === carrier.species);
      if (homeNest) {
        const ndx = carrier.pos.x - homeNest.pos.x;
        const ndy = carrier.pos.y - homeNest.pos.y;
        if (
          ndx * ndx + ndy * ndy <=
          NEST_DELIVER_RADIUS * NEST_DELIVER_RADIUS
        ) {
          food.drop();
          state.foods.splice(i, 1);
          carrier.target = null;
          homeNest.foodDelivered++;
          homeNest.foodStored++;
          if (carrier.isPlayer) {
            const q = FOOD_DEPOSIT_QUIPS;
            carrier.setSpeechBubble(
              q[Math.floor(Math.random() * q.length)],
              2500,
            );
          }
          continue;
        }
      }
    }

    // Drop food if the carrier just died
    if (food.isCarried && food.carriedBy && !food.carriedBy.isAlive) {
      food.drop();
    }

    // Carrying player got hungry — auto-digest the food being held
    if (
      food.isCarried &&
      food.carriedBy?.isPlayer &&
      food.carriedBy.energy / food.carriedBy.maxEnergy <= 0.3
    ) {
      const ant = food.carriedBy;
      ant.hp = ant.maxHp;
      ant.energy = ant.maxEnergy;
      const q = FOOD_QUIPS_HUNGRY;
      ant.setSpeechBubble(q[Math.floor(Math.random() * q.length)], 2500);
      state.foods.splice(i, 1);
      continue;
    }

    // Update carried position each frame
    if (food.isCarried) {
      food.updateCarriedPosition();
      continue;
    }

    // Ground food — test against every alive ant not already carrying something
    for (const ant of state.allAnts) {
      if (!ant.isAlive) continue;
      // One food per ant: skip if already carrying
      if (state.foods.some((f) => f.carriedBy === ant)) continue;
      if (
        circlesOverlap(
          { pos: ant.pos, collisionRadius: getContactRadius(ant) },
          food,
        )
      ) {
        // Hungry player ant digests the food immediately
        if (ant.isPlayer && ant.energy / ant.maxEnergy <= 0.3) {
          ant.hp = ant.maxHp;
          ant.energy = ant.maxEnergy;
          const q = FOOD_QUIPS_HUNGRY;
          ant.setSpeechBubble(q[Math.floor(Math.random() * q.length)], 2500);
          state.foods.splice(i, 1);
          break;
        }
        food.pickup(ant);
        break;
      }
    }
  }

  fights.update(state.allAnts, state.gameTime);

  // ---- NPC autonomous AI --------------------------------------------------
  tickNpcAI(
    state.allAnts,
    state.foods,
    state.nests,
    state.pheromoneLayer,
    state.worldWidth,
    state.worldHeight,
    dt,
  );

  // ---- Colony spawn AI (grow population with delivered food) ----------------
  tickColonyAI(state.nests, state.allAnts, dt);

  // Freeze ALL combatants for the duration of any active (unresolved) fight
  for (const rec of fights.records.values()) {
    if (rec.resolvedOutcome !== null) continue; // already resolved — let winner walk
    rec.antA.target = null;
    rec.antB.target = null;
  }
  // Also clear the player's march flag if they're in a fight
  const playerInActiveFight = [...fights.records.values()].some(
    (r) =>
      (r.antA === state.playerAnt || r.antB === state.playerAnt) &&
      r.resolvedOutcome === null,
  );
  if (playerInActiveFight) state.flag = null;

  // Detect player death (combat OR starvation) — show respawn dialog once
  if (!state.playerAnt.isAlive && !state.pendingRespawn) {
    state.pendingRespawn = true;
    state.flag = null; // clear any pending march marker
    showRespawnDialog((role) => respawnPlayer(state, role));
  }
}
