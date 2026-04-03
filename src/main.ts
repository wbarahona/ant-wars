import { createGameState } from "./game/gameState";
import { FightManager } from "./game/fightManager";
import { update } from "./game/update";
import { render } from "./game/renderer";
import { registerInputHandlers } from "./game/inputHandlers";

// ---- Boot ------------------------------------------------------------------

const state = createGameState();
const fights = new FightManager();

registerInputHandlers(state, fights);

let lastTime = 0;

function loop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(state, fights, dt);
  render(state, fights);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
