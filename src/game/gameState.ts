/**
 * gameState.ts
 *
 * Shared mutable game state created once at boot and passed to every module.
 * Keeps canvas/world setup co-located with the objects that depend on it.
 */

import type { Point } from "../types";
import type { AntRole } from "../types";
import { Camera } from "../world/camera";
import { InputHandler } from "../input";
import { Ant } from "../entities/ant";
import { Food } from "../entities/food";
import { Nest } from "../entities/nest";
import { PheromoneLayer } from "../world/pheromoneLayer";

/** Phases of the game flow. */
export type GamePhase = "placing_burrow" | "playing";

export interface GameState {
  // Render targets
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Viewport / world dimensions
  vw: number;
  vh: number;
  worldWidth: number;
  worldHeight: number;

  // Systems
  camera: Camera;
  input: InputHandler;

  // Mutable game state
  flag: Point | null;
  followerCount: number;
  gameTime: number;

  // Entities
  playerAnt: Ant;
  allAnts: Ant[];
  foods: Food[];
  nests: Nest[];

  // Game phase
  phase: GamePhase;

  // Respawn flow
  /** True from the moment the player dies until the new ant is spawned. */
  pendingRespawn: boolean;

  // Pheromone trail system
  pheromoneLayer: PheromoneLayer;
  showFoodTrail: boolean;
  showAttackTrail: boolean;
}

export function createGameState(): GameState {
  // ---- Canvas sizing: full window -----------------------------------------
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  canvas.width = vw;
  canvas.height = vh;

  // ---- World: 3× viewport in each axis ------------------------------------
  const worldWidth = vw * 3;
  const worldHeight = vh * 3;

  // ---- Systems ------------------------------------------------------------
  const camera = new Camera(vw, vh, worldWidth, worldHeight);
  const input = new InputHandler(canvas);

  // ---- Entities -----------------------------------------------------------
  // Player starts as a queen near the LEFT edge (~10%)
  const playerSpawnX = Math.round(worldWidth * 0.1);
  const playerSpawnY = Math.round(worldHeight / 2);
  const playerAnt = new Ant(
    "black",
    "queen",
    { x: playerSpawnX, y: playerSpawnY },
    true,
  );
  playerAnt.rank = 0;

  // ---- Red nest near the RIGHT edge (~90%) --------------------------------
  const nests: Nest[] = [];

  // Red nest near the RIGHT edge (~90%)
  const redNestX = Math.round(worldWidth * 0.9);
  const redNestY = Math.round(worldHeight / 2);
  const redNest = new Nest("red", { x: redNestX, y: redNestY });
  nests.push(redNest);

  // ---- OpFor ants — 1 soldier + 3 workers near the red nest ---------------
  const allAnts: Ant[] = [playerAnt];
  allAnts.push(
    new Ant("red", "soldier", {
      x: redNest.pos.x + (Math.random() - 0.5) * 60,
      y: redNest.pos.y + (Math.random() - 0.5) * 60,
    }),
  );
  for (let i = 0; i < 3; i++) {
    allAnts.push(
      new Ant("red", "worker", {
        x: redNest.pos.x + (Math.random() - 0.5) * 60,
        y: redNest.pos.y + (Math.random() - 0.5) * 60,
      }),
    );
  }

  // ---- Food items scattered across the full world -------------------------
  const foodSpawns: Point[] = [
    { x: worldWidth * 0.12, y: worldHeight * 0.3 },
    { x: worldWidth * 0.2, y: worldHeight * 0.7 },
    { x: worldWidth * 0.35, y: worldHeight * 0.2 },
    { x: worldWidth * 0.35, y: worldHeight * 0.8 },
    { x: worldWidth * 0.5, y: worldHeight * 0.5 },
    { x: worldWidth * 0.65, y: worldHeight * 0.25 },
    { x: worldWidth * 0.65, y: worldHeight * 0.75 },
    { x: worldWidth * 0.8, y: worldHeight * 0.4 },
    { x: worldWidth * 0.8, y: worldHeight * 0.6 },
    { x: worldWidth * 0.92, y: worldHeight * 0.5 },
  ];
  const foods = foodSpawns.map((pos) => new Food(pos));

  camera.centerOn(playerAnt.pos.x, playerAnt.pos.y);

  return {
    canvas,
    ctx,
    vw,
    vh,
    worldWidth,
    worldHeight,
    camera,
    input,
    flag: null,
    followerCount: 0,
    gameTime: 0,
    playerAnt,
    allAnts,
    foods,
    nests,
    phase: "placing_burrow",
    pendingRespawn: false,
    pheromoneLayer: new PheromoneLayer(),
    showFoodTrail: true,
    showAttackTrail: true,
  };
}

/**
 * Called on window resize — updates canvas dimensions and camera viewport.
 * World size stays fixed; only the visible window changes.
 */
export function resizeViewport(state: GameState): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  state.canvas.width = vw;
  state.canvas.height = vh;
  state.vw = vw;
  state.vh = vh;
  state.camera.resize(vw, vh);
}

/**
 * Replaces the dead player ant with a fresh one of the chosen caste.
 * Stats reset to base values; spawns at world centre; old ant removed from allAnts.
 */
export function respawnPlayer(state: GameState, newRole: AntRole): void {
  // Spawn at the player's nest if one exists, otherwise world centre
  const playerNest = state.nests.find(
    (n) => n.species === state.playerAnt.species,
  );
  const spawnPos = playerNest
    ? { x: playerNest.pos.x, y: playerNest.pos.y - 20 }
    : { x: state.worldWidth / 2, y: state.worldHeight / 2 };
  const newAnt = new Ant(state.playerAnt.species, newRole, spawnPos, true);

  // Swap old player ant for new one in the shared array
  const idx = state.allAnts.indexOf(state.playerAnt);
  if (idx !== -1) state.allAnts[idx] = newAnt;
  else state.allAnts.unshift(newAnt);

  state.playerAnt = newAnt;
  state.flag = null;
  state.followerCount = 0;
  state.pendingRespawn = false;
  state.camera.centerOn(spawnPos.x, spawnPos.y);
}
