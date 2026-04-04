import { createGameState } from "./game/gameState";
import { FightManager } from "./game/fightManager";
import { update } from "./game/update";
import { render } from "./game/renderer";
import { registerInputHandlers } from "./game/inputHandlers";
import { showIntroScreen } from "./ui/introScreen";
import { playTrack } from "./audio/audioManager";
import type { AntSpecies } from "./types";

// ---- Boot ------------------------------------------------------------------

// Attempt autoplay immediately — works on reload when the browser has already
// recorded user engagement with the page (MEI ≥ 0.5). If blocked, audioManager
// queues a first-pointer-down retry automatically.
playTrack("intro");

showIntroScreen((playerSpecies: AntSpecies, foeSpecies: AntSpecies) => {
  const state = createGameState(playerSpecies, foeSpecies);
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
});
