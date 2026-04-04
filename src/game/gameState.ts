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

  // ---- Nests ---------------------------------------------------------------
  // Red nest near the RIGHT edge (~90%).
  // The player's black nest is NOT pre-created here — it is added to this
  // array only when the player places the burrow during placing_burrow phase.
  const redNestX = Math.round(worldWidth * 0.9);
  const redNestY = Math.round(worldHeight / 2);
  const redNest = new Nest("red", { x: redNestX, y: redNestY });
  const nests: Nest[] = [redNest];

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

  // ---- Food clumps ---------------------------------------------------------
  // Clumps are placed near each nest and at semi-random mid-world anchors.
  // Within each clump, items follow a sqrt(random) radial distribution which
  // gives uniform area density — items are denser at the centre and thin out
  // naturally toward the edges, mimicking real foraging patches.
  const foods = spawnFoodClumps(
    worldWidth,
    worldHeight,
    playerSpawnX,
    playerSpawnY,
    nests,
  );

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

// ── Food clump generator ───────────────────────────────────────────────────────
/**
 * Spawns food in natural-looking clumps.
 *
 * Distribution: each item is placed at angle = uniform random,
 * distance = clumpRadius * sqrt(random).  The sqrt pull gives uniform
 * area density — items are denser at the centre and thin out toward the
 * edge, matching how real resource patches look.
 *
 * Clump anchors:
 *   • One patch near the player starting position
 *   • One patch near each nest
 *   • Several mid-world patches at spread-out grid-jittered positions
 */
function spawnFoodClumps(
  worldWidth: number,
  worldHeight: number,
  playerX: number,
  playerY: number,
  nests: Nest[],
): Food[] {
  const MARGIN = 30;

  interface Clump {
    cx: number;
    cy: number;
    count: number;
    radius: number;
  }

  const clumps: Clump[] = [];

  // Near the player starting area — small forage patch
  clumps.push({ cx: playerX + 120, cy: playerY, count: 5, radius: 90 });

  // Near each nest
  for (const nest of nests) {
    clumps.push({
      cx: nest.pos.x - 140,
      cy: nest.pos.y,
      count: 6,
      radius: 110,
    });
  }

  // Mid-world clumps on a loose 3×3 grid with per-cell jitter
  const cols = 3;
  const rows = 3;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      // Base position in normalised space (0.2…0.8 range keeps away from edges)
      const nx = 0.2 + (col / (cols - 1)) * 0.6;
      const ny = 0.2 + (row / (rows - 1)) * 0.6;
      // Jitter up to ±8% of world size so clumps don't sit on a perfect grid
      const jx = (Math.random() - 0.5) * worldWidth * 0.16;
      const jy = (Math.random() - 0.5) * worldHeight * 0.16;
      clumps.push({
        cx: worldWidth * nx + jx,
        cy: worldHeight * ny + jy,
        count: 4 + Math.floor(Math.random() * 3), // 4–6 items per clump
        radius: 80 + Math.random() * 60, // 80–140 px radius
      });
    }
  }

  const foods: Food[] = [];
  for (const c of clumps) {
    for (let i = 0; i < c.count; i++) {
      const r = c.radius * Math.sqrt(Math.random()); // uniform area density
      const angle = Math.random() * Math.PI * 2;
      const x = Math.max(
        MARGIN,
        Math.min(worldWidth - MARGIN, c.cx + Math.cos(angle) * r),
      );
      const y = Math.max(
        MARGIN,
        Math.min(worldHeight - MARGIN, c.cy + Math.sin(angle) * r),
      );
      foods.push(new Food({ x, y }));
    }
  }
  return foods;
}
