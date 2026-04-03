/**
 * playerAntPrefab.ts
 *
 * Renders the player-controlled ant with additional HUD elements on top of the
 * base antPrefab sprite. Kept separate from antPrefab so all player-specific
 * visual concerns (energy bar, selection ring, future caste UI) live here.
 *
 * Design notes for future features:
 *  - On death: show "SELECT CASTE" overlay (drone / worker / soldier)
 *  - Queen mode: only available at game start when selecting the first burrow
 *  - Energy replenishment: eating overworld food or feeding from a fellow ant
 *  - Energy = 0 should slow the ant (speed penalty) before it fully stops
 */

import type { Ant } from "../entities/ant";
import type { RankLevel } from "../types";
import { RANKS } from "../types";
import { drawAnt } from "./antPrefab";

// How many pixels wide the bars are (at full value)
const BAR_WIDTH = 24;
const BAR_HEIGHT = 3;
// Gap between the two bars
const BAR_GAP = 2;
// How far above the ant's centre the bottom bar (energy) floats
const BAR_OFFSET_Y = 20;

// ---- Move quips (context-sensitive) ----------------------------------------

const MOVE_QUIPS_SOLO = [
  "ON MY WAY...",
  "JUST ME AND THE ROAD.",
  "SOLO MISSION, LET'S GO.",
  "HEADING OUT ALONE.",
  "I ROLL ALONE!",
  "MOVING OUT...",
];

const MOVE_QUIPS_LEADER = [
  "SQUAD, FOLLOW ME!",
  "ALL UNITS, MOVE OUT!",
  "ON ME, SISTERS!",
  "ADVANCE! STAY CLOSE!",
  "MARCH! FORWARD!",
  "MOVE MOVE MOVE!",
];

const CHARGE_QUIPS_SOLO = [
  "I'LL TAKE 'EM ALONE!",
  "CONTACT! MOVING IN!",
  "ONE ANT ARMY, LET'S GO!",
  "I SEE THE ENEMY, CHARGING!",
  "THAT DISGUSTING ANT IS MINE!",
  "ENGAGING OPFOR!",
];

const CHARGE_QUIPS_LEADER = [
  "ENGAGE YOU ANTS! YOU WANNA LIVE FOREVER?!",
  "ATTACK! ALL UNITS, CHARGE!",
  "SISTERS, DESTROY THEM!",
  "FLANKING! ON MY SIX!",
  "FOR THE QUEEN!",
  "CRUSH THEM! FOR THE COLONY!",
];

const FRIEND_QUIPS = [
  "HEY SISTER! GOOD TO SEE YOU!",
  "GLAD YOU'RE ON MY SIDE!",
  "RALLYING UP WITH A NESTMATE!",
  "WITH ME, SISTER — LET'S GO!",
  "NICE, A FRIENDLY FACE!",
  "FALL IN, FRIEND!",
];

export const GRATITUDE_QUIPS = [
  "THANKS FOR THE BOOST, SISTER!",
  "AHH! MUCH BETTER! THANKS!",
  "YOU SAVED MY ANTENNAE!",
  "ENERGY RESTORED! I OWE YOU ONE!",
  "THAT'S WHAT NESTMATES ARE FOR!",
  "FUELED UP! LET'S ROLL!",
];

export const FOOD_QUIPS_HUNGRY = [
  "FINALLY! I'M STARVING!",
  "FOOD! SWEET SUSTENANCE!",
  "MMMM... GLUCOSE AT LAST!",
  "I NEEDED THIS, BIG TIME!",
  "SUGAR RUSH INCOMING!",
  "ENERGY RESTORED! BACK IN ACTION!",
];

const FOOD_QUIPS_NORMAL = [
  "PICKING THIS UP.",
  "FOOD SECURED.",
  "COLONY NEEDS THIS!",
  "GRABBING SUPPLIES.",
  "GOT IT. HEADING BACK.",
  "RATIONS ACQUIRED!",
  "THIS'LL COME IN HANDY.",
  "SEEMS LIKE THIS FOOD NEEDS SOME FREEDOM!",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Orders the player ant to march. Quips change based on whether the ant
 * is commanding a group (followerCount > 0) or moving solo.
 */
export function orderMarch(
  ant: Ant,
  target: { x: number; y: number },
  followerCount = 0,
): void {
  ant.target = { ...target };
  ant.setSpeechBubble(
    pick(followerCount > 0 ? MOVE_QUIPS_LEADER : MOVE_QUIPS_SOLO),
    2000,
  );
}

/**
 * Orders the player ant to approach a friendly ant with a social quip.
 */
export function orderApproachFriend(
  ant: Ant,
  friendPos: { x: number; y: number },
): void {
  ant.target = { ...friendPos };
  ant.setSpeechBubble(pick(FRIEND_QUIPS), 2500);
}

/**
 * Orders the player ant to march toward a food item.
 * Emits a hungry quip if energy is below 30 %, otherwise a normal carry quip.
 */
export function orderPickFood(
  ant: Ant,
  foodPos: { x: number; y: number },
): void {
  ant.target = { ...foodPos };
  const isHungry = ant.energy / ant.maxEnergy <= 0.3;
  ant.setSpeechBubble(
    pick(isHungry ? FOOD_QUIPS_HUNGRY : FOOD_QUIPS_NORMAL),
    2500,
  );
}

/**
 * Orders the player ant to charge toward an enemy position.
 * No actual combat yet — just movement + flavour quip.
 */
export function orderCharge(
  ant: Ant,
  target: { x: number; y: number },
  followerCount = 0,
): void {
  ant.target = { ...target };
  ant.setSpeechBubble(
    pick(followerCount > 0 ? CHARGE_QUIPS_LEADER : CHARGE_QUIPS_SOLO),
    2500,
  );
}

// ---- Context menu -----------------------------------------------------------

export type ContextMenuAction =
  | "recruit5"
  | "recruit10"
  | "release"
  | "askFood"
  | "trailFood"
  | "trailAttack";

const MENU_QUIPS: Record<ContextMenuAction, string[]> = {
  recruit5: [
    "I NEED 5 VOLUNTEER SISTERS!",
    "FIVE MORE TO THE CAUSE!",
    "WHO'S BRAVE? FIVE OF YOU!",
    "FORM UP! FIVE IS ALL I ASK!",
    "FIVE SISTERS, JOIN ME NOW!",
    "FIVE ONLY — MOVE IT!",
  ],
  recruit10: [
    "TEN SISTERS WITH ME, NOW!",
    "I NEED A SQUAD OF TEN!",
    "TEN BRAVE SOULS, FALL IN!",
    "RALLY! TEN VOLUNTEERS!",
    "TEN OF YOU, DOUBLE TIME!",
    "ALL HANDS — TEN, ON ME!",
  ],
  release: [
    "AT EASE! YOU'RE FREE!",
    "DISMISSED! RETURN TO NEST!",
    "FALL OUT! MISSION COMPLETE!",
    "GO HOME, SISTERS. WELL DONE!",
    "STAND DOWN! YOU'RE RELEASED!",
    "THAT'S ALL! GET SOME REST!",
  ],
  askFood: [
    "ANYONE GOT ANY SUGAR?!",
    "I'M STARVING! FEED ME!",
    "CORPANT! CORPANT! I NEED FUEL!",
    "ENERGY CRITICAL! HELP!",
    "A LITTLE SUGAR... PLEASE?",
    "HUNGRY OVER HERE!",
  ],
  // Trail quips are handled inline via the toggle section — these are unused
  trailFood: [],
  trailAttack: [],
};

const TRAIL_FOOD_ON_QUIPS = [
  "MARKING FOOD TRAIL!",
  "PHEROMONE BREADCRUMBS — GO!",
  "FOOD THIS WAY, SISTERS!",
  "BLAZING A FOOD PATH!",
  "TRAIL ACTIVE — FOLLOW THE GREEN!",
  "LAYING DOWN FOOD SCENT!",
];

const TRAIL_FOOD_OFF_QUIPS = [
  "FOOD TRAIL CLEARED.",
  "GOING SCENTLESS.",
  "TRAIL DEACTIVATED.",
  "NO MORE BREADCRUMBS.",
  "SCENT TRAIL OFF.",
  "CLEANED UP THE MARKING.",
];

const TRAIL_ATTACK_ON_QUIPS = [
  "ATTACK VECTOR MARKED!",
  "PAINTING THE TARGET ROUTE!",
  "FOLLOW THE RED, SISTERS!",
  "ATTACK TRAIL ACTIVE!",
  "ENEMIES AHEAD — TRAIL SET!",
  "HOSTILE TERRITORY MARKED!",
];

const TRAIL_ATTACK_OFF_QUIPS = [
  "ATTACK TRAIL CLEARED.",
  "STANDING DOWN THE MARKING.",
  "TRAIL OFF.",
  "HOSTILE MARKING REMOVED.",
  "GOING DARK ON ATTACK TRAIL.",
  "ATTACK SCENT DEACTIVATED.",
];

let activeMenu: HTMLDivElement | null = null;

export function hidePlayerContextMenu(): void {
  activeMenu?.remove();
  activeMenu = null;
}

/**
 * Creates and shows a floating context menu near (screenX, screenY).
 * `isHungry` controls whether the "Ask for food" option is shown.
 * `onAction` is called with the chosen action after the quip is set on the ant.
 */
export function showPlayerContextMenu(
  ant: Ant,
  screenX: number,
  screenY: number,
  isHungry: boolean,
  onAction: (action: ContextMenuAction) => void,
): void {
  hidePlayerContextMenu();

  const menu = document.createElement("div");
  menu.id = "player-context-menu";
  Object.assign(menu.style, {
    position: "fixed",
    left: `${screenX}px`,
    top: `${screenY}px`,
    zIndex: "999",
    background: "#0f0f1e",
    border: "1px solid #f4d03f",
    borderRadius: "4px",
    padding: "4px 0",
    fontFamily: "'Courier New', monospace",
    fontSize: "11px",
    minWidth: "160px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.7)",
    userSelect: "none",
  });

  const items: { action: ContextMenuAction; label: string; show: boolean }[] = [
    { action: "recruit5", label: "⚐  Recruit 5 ants", show: true },
    { action: "recruit10", label: "⚐  Recruit 10 ants", show: true },
    { action: "release", label: "✦  Release squad", show: true },
    { action: "askFood", label: "⬥  Ask for food!", show: isHungry },
  ];

  for (const item of items) {
    if (!item.show) continue;

    const btn = document.createElement("div");
    btn.textContent = item.label;
    Object.assign(btn.style, {
      padding: "6px 14px",
      color: item.action === "askFood" ? "#ef4444" : "#d0d0d0",
      cursor: "pointer",
      letterSpacing: "0.5px",
      transition: "background 0.1s",
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#1f1f3a";
      btn.style.color = "#f4d03f";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
      btn.style.color = item.action === "askFood" ? "#ef4444" : "#d0d0d0";
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      ant.setSpeechBubble(pick(MENU_QUIPS[item.action]), 3000);
      onAction(item.action);
      hidePlayerContextMenu();
    });
    menu.appendChild(btn);
  }

  // ---- Separator -----------------------------------------------------------
  const sep = document.createElement("div");
  Object.assign(sep.style, { borderTop: "1px solid #2a2a4a", margin: "4px 0" });
  menu.appendChild(sep);

  // ---- Pheromone trail toggles --------------------------------------------
  const trailDefs: {
    getActive: () => boolean;
    toggle: () => void;
    onQuips: string[];
    offQuips: string[];
    action: ContextMenuAction;
    label: string;
  }[] = [
    {
      getActive: () => ant.leaveFoodTrail,
      toggle: () => {
        ant.leaveFoodTrail = !ant.leaveFoodTrail;
      },
      onQuips: TRAIL_FOOD_ON_QUIPS,
      offQuips: TRAIL_FOOD_OFF_QUIPS,
      action: "trailFood",
      label: "Food trail",
    },
    {
      getActive: () => ant.leaveAttackTrail,
      toggle: () => {
        ant.leaveAttackTrail = !ant.leaveAttackTrail;
      },
      onQuips: TRAIL_ATTACK_ON_QUIPS,
      offQuips: TRAIL_ATTACK_OFF_QUIPS,
      action: "trailAttack",
      label: "Attack trail",
    },
  ];

  for (const td of trailDefs) {
    const isOn = td.getActive();
    const trailBtn = document.createElement("div");
    trailBtn.textContent = (isOn ? "\u2714  " : "\u25cb  ") + td.label;
    Object.assign(trailBtn.style, {
      padding: "6px 14px",
      color: isOn ? "#4ade80" : "#d0d0d0",
      cursor: "pointer",
      letterSpacing: "0.5px",
      transition: "background 0.1s",
    });
    trailBtn.addEventListener("mouseenter", () => {
      trailBtn.style.background = "#1f1f3a";
      trailBtn.style.color = "#f4d03f";
    });
    trailBtn.addEventListener("mouseleave", () => {
      trailBtn.style.background = "transparent";
      trailBtn.style.color = td.getActive() ? "#4ade80" : "#d0d0d0";
    });
    trailBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      td.toggle();
      const nowOn = td.getActive();
      ant.setSpeechBubble(pick(nowOn ? td.onQuips : td.offQuips), 3000);
      onAction(td.action);
      hidePlayerContextMenu();
    });
    menu.appendChild(trailBtn);
  }

  // Clamp to viewport so it never goes off-screen
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth)
    menu.style.left = `${screenX - rect.width}px`;
  if (rect.bottom > window.innerHeight)
    menu.style.top = `${screenY - rect.height}px`;

  activeMenu = menu;
}

/**
 * Draws US Marines enlisted insignia aside the ant head.
 *
 * Chevrons (∧) sit at the top; rockers (∪ arcs) sit below them, closest to head.
 * Shapes are each 2px tall, stacked 3px apart.
 *
 * Layout from bottom to top (lowest y = closest to sprite top):
 *   • rockers first  (1–3 arcs, for E-5 through E-7)
 *   • 1px extra gap when both groups are present
 *   • chevrons above (1–3, for E-2 through E-7)
 */
export function drawRankInsignia(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  rank: RankLevel,
): void {
  const info = RANKS[rank];
  if (info.chevrons === 0 && info.rockers === 0) return;

  ctx.fillStyle = "#f4d03f"; // gold

  // cursor = bottom y of the next element to draw; we build upward
  let cursor = topY - 2;

  // --- Rockers (closest to head, bottom of insignia) ---
  for (let r = 0; r < info.rockers; r++) {
    // ∪ shape: two top arms + bottom arc
    ctx.fillRect(cx - 3, cursor - 1, 1, 1); // left arm
    ctx.fillRect(cx + 2, cursor - 1, 1, 1); // right arm
    ctx.fillRect(cx - 2, cursor, 3, 1); // bottom curve
    cursor -= 4;
  }
  if (info.rockers > 0) cursor -= 1; // gap between rockers and chevrons

  // --- Chevrons (top of insignia, farthest from head) ---
  for (let c = 0; c < info.chevrons; c++) {
    // ∧ shape: top peak + two bottom arms
    ctx.fillRect(cx - 1, cursor - 1, 3, 1); // peak
    ctx.fillRect(cx - 2, cursor, 1, 1); // left arm
    ctx.fillRect(cx + 2, cursor, 1, 1); // right arm
    cursor -= 4;
  }
}

export function drawPlayerAnt(ctx: CanvasRenderingContext2D, ant: Ant): void {
  // ---- Base sprite (no indicator — rank drawn separately below) -----------
  drawAnt(ctx, ant);

  // ---- Rank insignia — right side, unrotated so chevrons always read up ---
  // Positioned just past the sprite's right edge (soldier: 10 cols × scale 3 = 15 px half-width)
  // topY is set to ant mid-body + a small offset so chevrons build upward into view
  if (ant.isAlive) {
    drawRankInsignia(
      ctx,
      ant.pos.x + 20,
      ant.pos.y + 10,
      ant.rank as RankLevel,
    );
  }

  // ---- Selection ring -----------------------------------------------------
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(ant.pos.x, ant.pos.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ---- HP + Energy bars (hidden when dead) ---------------------------------
  if (ant.isAlive) {
    const enRatio = Math.max(0, ant.energy / ant.maxEnergy);
    const hpRatio = Math.max(0, ant.hp / ant.maxHp);

    const enBarY = Math.round(ant.pos.y - BAR_OFFSET_Y);
    const hpBarY = enBarY - BAR_HEIGHT - BAR_GAP;

    const barX = Math.round(ant.pos.x - BAR_WIDTH / 2);

    // Shared shadow outline
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(
      barX - 1,
      hpBarY - 1,
      BAR_WIDTH + 2,
      BAR_HEIGHT * 2 + BAR_GAP + 2,
    );

    // ---- HP bar (green → yellow → red) ---
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, hpBarY, BAR_WIDTH, BAR_HEIGHT);
    const hpColor =
      hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, hpBarY, Math.round(BAR_WIDTH * hpRatio), BAR_HEIGHT);

    // ---- Energy bar (always blue) ---
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, enBarY, BAR_WIDTH, BAR_HEIGHT);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(barX, enBarY, Math.round(BAR_WIDTH * enRatio), BAR_HEIGHT);
  }

  // ---- Speech bubble -------------------------------------------------------
  if (ant.state !== "dead") {
    // barY reference: energy bar top (or estimated position when dead, unused)
    const barY = Math.round(ant.pos.y - BAR_OFFSET_Y);
    drawSpeechBubble(ctx, ant, barY);
  }
}

// ---- Speech bubble helpers --------------------------------------------------

/**
 * Resolves the highest-priority message to show above the ant, or null.
 *
 * Priority order:
 *  1. Timed bubble (e.g. "OVER THERE!") while it hasn't expired
 *  2. "FIGHT!"       — while the ant is in attacking state
 *  3. "I'M HUNGRY!"  — when energy is at or below 20 %
 */
function resolveLabel(ant: Ant): string | null {
  if (ant.speechBubbleText !== null) return ant.speechBubbleText;
  if (ant.state === "attacking") return "FIGHT!";
  if (ant.energy / ant.maxEnergy <= 0.2) return "I'M HUNGRY!";
  return null;
}

/**
 * Draws a comic-style speech bubble centred horizontally above the energy bar.
 * The bubble has a small downward-pointing tail aimed at the ant's head.
 */
function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  ant: Ant,
  barY: number,
): void {
  const label = resolveLabel(ant);
  if (label === null) return;

  const cx = ant.pos.x;

  ctx.save();

  // Measure text
  ctx.font = "bold 9px monospace";
  const textW = ctx.measureText(label).width;

  const PAD_X = 5;
  const PAD_Y = 4;
  const TAIL_H = 5;
  const CORNER_R = 4;

  const bubbleW = textW + PAD_X * 2;
  const bubbleH = 9 + PAD_Y * 2; // line height ≈ font size
  const bubbleX = cx - bubbleW / 2;
  const bubbleY = barY - bubbleH - TAIL_H - 4; // above the energy bar
  const tailCX = cx;
  const tailBaseY = bubbleY + bubbleH;

  // Choose bubble colour by message type
  let bgColor = "#fffde7"; // default cream
  let borderColor = "#555";
  let textColor = "#1a1a1a";
  if (label === "FIGHT!") {
    bgColor = "#fff0f0";
    borderColor = "#c0392b";
    textColor = "#c0392b";
  } else if (label === "I'M HUNGRY!") {
    bgColor = "#fff8f0";
    borderColor = "#e67e22";
    textColor = "#c0392b";
  } else {
    // timed bubble — friendly blue-ish
    bgColor = "#f0f8ff";
    borderColor = "#2980b9";
    textColor = "#1a4a6e";
  }

  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  // Bubble body (rounded rect + tail as one path)
  ctx.beginPath();
  ctx.moveTo(bubbleX + CORNER_R, bubbleY);
  ctx.lineTo(bubbleX + bubbleW - CORNER_R, bubbleY);
  ctx.arcTo(
    bubbleX + bubbleW,
    bubbleY,
    bubbleX + bubbleW,
    bubbleY + CORNER_R,
    CORNER_R,
  );
  ctx.lineTo(bubbleX + bubbleW, tailBaseY - CORNER_R);
  ctx.arcTo(
    bubbleX + bubbleW,
    tailBaseY,
    bubbleX + bubbleW - CORNER_R,
    tailBaseY,
    CORNER_R,
  );
  // Tail: right of centre → tip → left of centre
  ctx.lineTo(tailCX + 5, tailBaseY);
  ctx.lineTo(tailCX, tailBaseY + TAIL_H);
  ctx.lineTo(tailCX - 5, tailBaseY);
  ctx.lineTo(bubbleX + CORNER_R, tailBaseY);
  ctx.arcTo(bubbleX, tailBaseY, bubbleX, tailBaseY - CORNER_R, CORNER_R);
  ctx.lineTo(bubbleX, bubbleY + CORNER_R);
  ctx.arcTo(bubbleX, bubbleY, bubbleX + CORNER_R, bubbleY, CORNER_R);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label text
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, bubbleY + bubbleH / 2);

  ctx.restore();
}
