import { createGameState } from "./game/gameState";
import { FightManager } from "./game/fightManager";
import { update } from "./game/update";
import { render } from "./game/renderer";
import { registerInputHandlers } from "./game/inputHandlers";
import { showIntroScreen } from "./ui/introScreen";
import { playTrack } from "./audio/audioManager";
import type { AntSpecies } from "./types";

// ---- Boot ------------------------------------------------------------------

// Browsers block audio that isn't triggered by a user gesture.
// Defer intro music to the first pointer interaction so it always succeeds.
document.addEventListener("pointerdown", () => playTrack("intro"), {
  once: true,
});

showIntroScreen((playerSpecies: AntSpecies, foeSpecies: AntSpecies) => {
  // "click" is a user-gesture context, so playTrack succeeds unconditionally.
  playTrack("overworld");
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
