/**
 * fightCloud.ts
 *
 * Draws an animated comic-style fighting cloud when two foe ants collide.
 * The cloud wobbles rhythmically; coloured pixel fragments of each ant spin
 * inside it; electric sparks flash at the perimeter; and a cycling impact
 * word (POW! / BAM! / WHAM! …) pops above the cloud.
 *
 * Usage:
 *   drawFightCloud(ctx, midX, midY, gameTimeSeconds, antASpecies, antBSpecies)
 *
 * All coordinates are in world space — call *inside* the camera-translated
 * save/restore block in the render function.
 */

const IMPACTS = ["POW!", "BAM!", "WHAM!", "ZAP!", "CRACK!"] as const;

// ---- Helpers ---------------------------------------------------------------

function speciesColor(species: string): string {
  switch (species) {
    case "black":
      return "#2c2c2c";
    case "red":
      return "#c0392b";
    case "green":
      return "#1e5229";
    case "yellow":
      return "#c8960a";
    case "white":
      return "#d0ccc8";
    default:
      return species; // pass-through for CSS color strings
  }
}

// ---- Main export -----------------------------------------------------------

export function drawFightCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  /** Monotonically increasing game time in seconds — drives all animation. */
  rawT: number,
  speciesA: string,
  speciesB: string,
): void {
  ctx.save();
  // Speed up internal animation 2.5× so the cloud looks full within the
  // shortened 1.2 s window.
  const t = rawT * 2.5;

  // ---- Cloud shape (wobbly union of overlapping circles) ------------------

  const wobble = Math.sin(t * 9) * 1.8;
  const R = 26 + Math.sin(t * 6) * 2; // main radius, gently pulsing

  const blobs: { x: number; y: number; r: number }[] = [
    { x: 0, y: 0, r: R },
    { x: R * 0.55 + wobble, y: -R * 0.3, r: R * 0.68 },
    { x: -R * 0.55, y: -R * 0.3 + wobble, r: R * 0.65 },
    { x: R * 0.6, y: R * 0.28, r: R * 0.58 },
    { x: -R * 0.6 + wobble * 0.6, y: R * 0.28, r: R * 0.58 },
    { x: R * 0.2, y: R * 0.62, r: R * 0.5 },
    { x: -R * 0.2, y: -R * 0.54 + wobble, r: R * 0.52 },
  ];

  // Dark outline (drawn slightly larger first)
  ctx.fillStyle = "rgba(25, 20, 15, 0.82)";
  for (const b of blobs) {
    ctx.beginPath();
    ctx.arc(cx + b.x, cy + b.y, b.r + 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // White/cream fill
  ctx.fillStyle = "rgba(248, 246, 240, 0.92)";
  for (const b of blobs) {
    ctx.beginPath();
    ctx.arc(cx + b.x, cy + b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Ant fragments orbiting inside the cloud ----------------------------
  // Clip so pixel dust stays inside the cloud shape

  ctx.save();
  ctx.beginPath();
  for (const b of blobs) {
    ctx.arc(cx + b.x, cy + b.y, b.r, 0, Math.PI * 2);
  }
  ctx.clip(); // union of all blobs via non-zero fill rule

  type Frag = { r: number; spd: number; ph: number; w: number; h: number };

  // Ant A fragments — orbit counter-clockwise at various speeds
  const fragsA: Frag[] = [
    { r: 7, spd: 3.4, ph: 0, w: 4, h: 2 },
    { r: 13, spd: -2.2, ph: Math.PI * 0.5, w: 2, h: 5 }, // leg-like
    { r: 9, spd: 5.0, ph: Math.PI, w: 3, h: 3 },
    { r: 16, spd: -3.0, ph: Math.PI * 1.4, w: 5, h: 2 },
  ];

  // Ant B fragments — counter-phase so they weave between A's
  const fragsB: Frag[] = [
    { r: 8, spd: -3.8, ph: Math.PI * 0.33, w: 4, h: 2 },
    { r: 12, spd: 2.6, ph: -Math.PI * 0.25, w: 2, h: 5 },
    { r: 6, spd: -4.6, ph: Math.PI * 0.66, w: 3, h: 3 },
    { r: 15, spd: 3.1, ph: Math.PI * 1.7, w: 5, h: 2 },
  ];

  const drawFrags = (frags: Frag[], color: string): void => {
    ctx.fillStyle = color;
    for (const f of frags) {
      const angle = t * f.spd + f.ph;
      const fx = cx + Math.cos(angle) * f.r;
      const fy = cy + Math.sin(angle) * f.r;
      ctx.fillRect(fx - f.w / 2, fy - f.h / 2, f.w, f.h);
    }
  };

  drawFrags(fragsA, speciesColor(speciesA));
  drawFrags(fragsB, speciesColor(speciesB));

  // Extra star-burst flashes inside the cloud (neutral)
  const burstCount = 3;
  for (let i = 0; i < burstCount; i++) {
    const burstPhase = t * 6 + (i * Math.PI * 2) / burstCount;
    if (Math.abs(Math.sin(burstPhase)) < 0.65) continue; // flicker
    const bx = cx + Math.cos(burstPhase * 0.7) * 8;
    const by = cy + Math.sin(burstPhase * 1.1) * 7;
    const bs = Math.abs(Math.sin(burstPhase)) * 5 + 1;
    // Draw a tiny 4-point star
    ctx.fillStyle = "rgba(255, 240, 120, 0.9)";
    ctx.fillRect(bx - bs / 2, by - 0.8, bs, 1.6);
    ctx.fillRect(bx - 0.8, by - bs / 2, 1.6, bs);
  }

  ctx.restore(); // end clip

  // ---- Electric sparks around the perimeter --------------------------------

  const N_SPARKS = 8;
  for (let i = 0; i < N_SPARKS; i++) {
    const angle = (i / N_SPARKS) * Math.PI * 2 + t * 3.2;
    if (Math.abs(Math.sin(t * 7.5 + i * 1.6)) < 0.42) continue; // flicker
    const innerR = R + 3;
    const outerR = R + 7 + Math.abs(Math.sin(t * 5.3 + i * 0.9)) * 5;
    const sx1 = cx + Math.cos(angle) * innerR;
    const sy1 = cy + Math.sin(angle) * innerR;
    const sx2 = cx + Math.cos(angle) * outerR;
    const sy2 = cy + Math.sin(angle) * outerR;

    ctx.strokeStyle = i % 2 === 0 ? "#f4d03f" : "#e67e22";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // Bright tip dot
    ctx.fillStyle = "#fffde7";
    ctx.beginPath();
    ctx.arc(sx2, sy2, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Impact text ---------------------------------------------------------

  const CYCLE = 0.35; // seconds per word — fast cycling for snappy 1.2 s fight window
  const cycleIdx = Math.floor(t / CYCLE) % IMPACTS.length;
  const cyclePhase = (t % CYCLE) / CYCLE; // 0 → 1

  if (cyclePhase < 0.4) {
    // Grow in, hold, then snap out
    const grow = 0.55 + (cyclePhase / 0.4) * 0.9;
    const alpha = cyclePhase < 0.3 ? 1 : 1 - (cyclePhase - 0.3) / 0.1;
    // Slight horizontal jitter so words don't stack in the same spot
    const jitterX = Math.sin(cycleIdx * 2.7) * 9;
    const wordX = cx + jitterX;
    const wordY = cy - R - 12;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    ctx.translate(wordX, wordY);
    ctx.scale(grow, grow);
    ctx.font = "bold 12px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(IMPACTS[cycleIdx], 0, 0);
    ctx.fillStyle = "#c0392b";
    ctx.fillText(IMPACTS[cycleIdx], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// ---- Fight resolution splash -----------------------------------------------

/**
 * Comic-book K.O. splash shown after the fight cloud fades.
 * `age` is 0 when resolution starts, in seconds.  Caller stops at 2 s.
 * `winnerSpecies` drives the text and burst-line colour.
 */
export function drawFightResolution(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  age: number,
  winnerSpecies: string,
  /** "K.O.!" when player wins, "OUCH!" when player loses, defaults to "K.O.!" */
  outcomeText = "K.O.!",
): void {
  const DURATION = 1.2;
  if (age >= DURATION) return;

  const fade = 1 - age / DURATION;
  const wColor = speciesColor(winnerSpecies) || "#f4d03f";

  ctx.save();
  ctx.globalAlpha = fade;

  // ---- Expanding burst lines -----------------------------------------------

  const N_LINES = 16;
  const burstP = Math.min(1, age / 0.22); // 0 → 1 over first 0.22 s
  const R_INNER = 14 * (1 - burstP); // inner gap collapses inward
  const R_OUTER = 14 + burstP * 52; // outer end expands to ~66 px

  for (let i = 0; i < N_LINES; i++) {
    const angle = (i / N_LINES) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? wColor : "#f4d03f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * R_INNER, cy + Math.sin(angle) * R_INNER);
    ctx.lineTo(cx + Math.cos(angle) * R_OUTER, cy + Math.sin(angle) * R_OUTER);
    ctx.stroke();

    // Bright dot at each burst tip
    if (burstP > 0.55) {
      ctx.fillStyle = "#fffde7";
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(angle) * R_OUTER,
        cy + Math.sin(angle) * R_OUTER,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // ---- K.O.! / OUCH! text —— pops in with an overshoot bounce ---------------

  // K.O.! uses the winner's colour; OUCH! always red to signal player pain
  const textColor = outcomeText === "OUCH!" ? "#e74c3c" : wColor;
  const textAge = Math.max(0, age - 0.03); // tiny entry delay
  const textScale =
    textAge < 0.12
      ? (textAge / 0.12) * 1.4 // snap grow with overshoot
      : textAge < 0.22
        ? 1.4 - ((textAge - 0.12) / 0.1) * 0.4 // settle to 1.0
        : 1.0;

  ctx.save();
  ctx.translate(cx, cy - 40);
  ctx.scale(textScale, textScale);
  ctx.font = "bold 22px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(outcomeText, 0, 0);
  ctx.fillStyle = textColor;
  ctx.fillText(outcomeText, 0, 0);
  ctx.restore();

  // ---- Winner label — fades in after text settles -------------------------

  if (age > 0.18) {
    const labelAlpha = Math.min(1, (age - 0.18) / 0.12);
    ctx.save();
    ctx.globalAlpha = fade * labelAlpha;
    ctx.font = "bold 8px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = wColor;
    ctx.fillText(`${winnerSpecies.toUpperCase()} WINS`, cx, cy - 24);
    ctx.restore();
  }

  ctx.restore();
}
