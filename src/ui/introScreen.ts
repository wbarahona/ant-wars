/**
 * introScreen.ts
 *
 * Two-screen intro flow drawn entirely in DOM (no canvas).
 *  Screen 0 — Title: game logo, "Play" button.
 *  Screen 1 — Species select: player species + foe species pickers.
 *             Each species card shows a pixel-art ant preview canvas,
 *             colour swatch, stat bars, and the species name.
 *             Selecting the same species for both sides is disallowed.
 *             "Start Game" calls the provided callback with the selections.
 */

import type { AntSpecies } from "../types";

// ── Static data ───────────────────────────────────────────────────────────────

type SpeciesInfo = {
  label: string;
  color: string;
  palette: [string, string, string, string, string]; // slots 1-5
  tagline: string;
  stats: { hp: number; speed: number; attack: number; defense: number };
  advantage: AntSpecies;
  lore: string;
};

const SPECIES: Record<AntSpecies, SpeciesInfo> = {
  black: {
    label: "Army Ant",
    color: "#2c2c2c",
    palette: ["#2c2c2c", "#111111", "#3f3f3f", "#3f3f3f", "#aac4e0"],
    tagline: "Balanced bruiser",
    stats: { hp: 185, speed: 50, attack: 28, defense: 16 },
    advantage: "yellow",
    lore: "Eciton burchellii — forms raiding columns of 200,000+ workers. Has no permanent nest; the colony itself is the home.",
  },
  red: {
    label: "Fire Ant",
    color: "#c0392b",
    palette: ["#c0392b", "#7b241c", "#922b21", "#922b21", "#f5b7b1"],
    tagline: "Glass cannon",
    stats: { hp: 100, speed: 72, attack: 38, defense: 6 },
    advantage: "green",
    lore: "Solenopsis invicta — injects alkaloid venom that causes a burning sting. Workers can form living rafts on water using their own bodies.",
  },
  green: {
    label: "Leaf-cutter",
    color: "#1e5229",
    palette: ["#1e5229", "#0e2e16", "#184020", "#184020", "#7ab87a"],
    tagline: "Fortress",
    stats: { hp: 220, speed: 50, attack: 20, defense: 25 },
    advantage: "black",
    lore: "Atta cephalotes — grows fungus gardens underground as its sole food source. Soldier mandibles are so strong they can cut through human skin.",
  },
  yellow: {
    label: "Carpenter Ant",
    color: "#c8960a",
    palette: ["#c8960a", "#8b6200", "#a07200", "#a07200", "#ffe578"],
    tagline: "Swift scout",
    stats: { hp: 140, speed: 75, attack: 27, defense: 13 },
    advantage: "red",
    lore: "Camponotus ligniperda — excavates wood with no wood-eating, leaving sawdust trails. Can live up to 6 years, one of the longest-lived ants.",
  },
};

const ALL_SPECIES: AntSpecies[] = ["black", "red", "green", "yellow"];

// ── Pixel-art worker sprite (8×12, same layout as SPRITE_WORKER in antPrefab) ─

const WORKER_A: number[][] = [
  [0, 4, 0, 0, 0, 0, 4, 0],
  [0, 0, 4, 0, 0, 4, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [3, 0, 0, 1, 1, 0, 0, 3],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 3, 1, 1, 1, 1, 3, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [3, 0, 1, 1, 1, 1, 0, 3],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const SPRITE_COLS = 8;
const SPRITE_ROWS = 12;
const SPRITE_SCALE = 4; // 32×48 px preview

function drawSpeciesPreview(
  canvas: HTMLCanvasElement,
  species: AntSpecies,
): void {
  canvas.width = SPRITE_COLS * SPRITE_SCALE;
  canvas.height = SPRITE_ROWS * SPRITE_SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pal = SPECIES[species].palette;
  for (let row = 0; row < SPRITE_ROWS; row++) {
    for (let col = 0; col < SPRITE_COLS; col++) {
      const px = WORKER_A[row][col];
      if (px === 0) continue;
      ctx.globalAlpha = px === 5 ? 0.55 : 1.0;
      ctx.fillStyle = pal[px - 1]; // palette slots are 0-indexed here (1→0)
      ctx.fillRect(
        col * SPRITE_SCALE,
        row * SPRITE_SCALE,
        SPRITE_SCALE,
        SPRITE_SCALE,
      );
    }
  }
  ctx.globalAlpha = 1;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<Record<string, string>> = {},
  styles: Partial<CSSStyleDeclaration> = {},
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) e.setAttribute(k, v);
  }
  Object.assign(e.style, styles);
  return e;
}

// ── Stat bar ──────────────────────────────────────────────────────────────────

const STAT_MAX: Record<string, number> = {
  hp: 220,
  speed: 85,
  attack: 38,
  defense: 30,
};

function makeStatBar(
  label: string,
  value: number,
  max: number,
  color: string,
): HTMLElement {
  const row = el(
    "div",
    {},
    {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "5px",
    },
  );

  const lbl = el(
    "span",
    {},
    {
      width: "56px",
      fontSize: "10px",
      color: "#aaa",
      fontFamily: "'Courier New', monospace",
      textTransform: "uppercase",
      flexShrink: "0",
    },
  );
  lbl.textContent = label;

  const track = el(
    "div",
    {},
    {
      flex: "1",
      height: "6px",
      background: "#1a1a2e",
      borderRadius: "3px",
      overflow: "hidden",
    },
  );

  const fill = el(
    "div",
    {},
    {
      height: "100%",
      width: `${Math.round((value / max) * 100)}%`,
      background: color,
      borderRadius: "3px",
      transition: "width 0.3s",
    },
  );

  track.appendChild(fill);
  const val = el(
    "span",
    {},
    {
      width: "28px",
      fontSize: "10px",
      color: "#ccc",
      fontFamily: "'Courier New', monospace",
      textAlign: "right",
      flexShrink: "0",
    },
  );
  val.textContent = String(value);

  row.appendChild(lbl);
  row.appendChild(track);
  row.appendChild(val);
  return row;
}

// ── Species card ──────────────────────────────────────────────────────────────

function makeSpeciesCard(
  species: AntSpecies,
  isSelected: boolean,
  isDisabled: boolean,
  onClick: () => void,
): HTMLElement {
  const info = SPECIES[species];

  const card = el(
    "div",
    { "data-species": species },
    {
      width: "200px",
      background: isSelected ? "rgba(244,208,63,0.08)" : "rgba(20,20,46,0.7)",
      border: `2px solid ${isSelected ? "#f4d03f" : isDisabled ? "#2a2a4a" : "#3a3a6a"}`,
      borderRadius: "8px",
      padding: "12px",
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? "0.4" : "1",
      transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      userSelect: "none",
    },
  );

  // Header row: colour swatch + name
  const header = el(
    "div",
    {},
    { display: "flex", alignItems: "center", gap: "8px" },
  );

  const swatch = el(
    "div",
    {},
    {
      width: "16px",
      height: "16px",
      borderRadius: "3px",
      background: info.color,
      flexShrink: "0",
      border: "1px solid rgba(255,255,255,0.15)",
    },
  );

  const nameEl = el(
    "span",
    {},
    {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontWeight: "bold",
      color: isSelected ? "#f4d03f" : "#d0d0d0",
    },
  );
  nameEl.textContent = info.label;

  header.appendChild(swatch);
  header.appendChild(nameEl);
  card.appendChild(header);

  // Pixel-art preview canvas
  const preview = el(
    "canvas",
    {},
    {
      display: "block",
      margin: "0 auto",
      imageRendering: "pixelated",
    },
  ) as HTMLCanvasElement;
  drawSpeciesPreview(preview, species);
  card.appendChild(preview);

  // Tagline
  const tag = el(
    "div",
    {},
    {
      fontFamily: "'Courier New', monospace",
      fontSize: "10px",
      color: "#7a7aaa",
      textAlign: "center",
      fontStyle: "italic",
    },
  );
  tag.textContent = info.tagline;
  card.appendChild(tag);

  // Stat bars
  const bars = el("div", {}, { marginTop: "4px" });
  const statColor = info.color;
  for (const [key, val] of Object.entries(info.stats) as [string, number][]) {
    bars.appendChild(makeStatBar(key, val, STAT_MAX[key], statColor));
  }
  card.appendChild(bars);

  // Advantage line
  const adv = el(
    "div",
    {},
    {
      fontFamily: "'Courier New', monospace",
      fontSize: "9px",
      color: "#5a9a6a",
      textAlign: "center",
    },
  );
  adv.textContent = `▲ beats ${SPECIES[info.advantage].label}`;
  card.appendChild(adv);

  // Lore blurb
  const loreEl = el(
    "div",
    {},
    {
      fontFamily: "'Courier New', monospace",
      fontSize: "9px",
      color: "#6a6a8a",
      textAlign: "left",
      lineHeight: "1.5",
      marginTop: "6px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      paddingTop: "6px",
    },
  );
  loreEl.textContent = info.lore;
  card.appendChild(loreEl);

  if (!isDisabled) {
    card.addEventListener("mouseenter", () => {
      if (!isSelected) {
        card.style.borderColor = info.color;
        card.style.background = "rgba(40,40,80,0.8)";
      }
    });
    card.addEventListener("mouseleave", () => {
      if (!isSelected) {
        card.style.borderColor = "#3a3a6a";
        card.style.background = "rgba(20,20,46,0.7)";
      }
    });
    card.addEventListener("click", onClick);
  }

  return card;
}

// ── Shared button factory ─────────────────────────────────────────────────────

function makeBtn(text: string, primary = false): HTMLButtonElement {
  const btn = el(
    "button",
    {},
    {
      fontFamily: "'Courier New', monospace",
      fontSize: "14px",
      padding: "10px 32px",
      background: primary ? "#f4d03f" : "transparent",
      color: primary ? "#0f0f1e" : "#f4d03f",
      border: "2px solid #f4d03f",
      borderRadius: "4px",
      cursor: "pointer",
      letterSpacing: "1px",
      textTransform: "uppercase",
      transition: "background 0.15s, color 0.15s",
      userSelect: "none",
    },
  ) as HTMLButtonElement;
  btn.textContent = text;
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#f4d03f";
    btn.style.color = "#0f0f1e";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = primary ? "#f4d03f" : "transparent";
    btn.style.color = primary ? "#0f0f1e" : "#f4d03f";
  });
  return btn;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mount the intro overlay and run the two-screen flow.
 * Calls `onStart(playerSpecies, foeSpecies)` when the player clicks Start.
 * Removes the overlay from the DOM before calling the callback.
 */
export function showIntroScreen(
  onStart: (player: AntSpecies, foe: AntSpecies) => void,
): void {
  const overlay = document.getElementById("intro-overlay")!;
  overlay.style.display = "flex";

  // ── Screen 0: Title ───────────────────────────────────────────────────────
  function showTitle(): void {
    overlay.innerHTML = "";

    const wrap = el(
      "div",
      {},
      {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
        textAlign: "center",
      },
    );

    // ASCII-art / logo title
    const titleEl = el(
      "h1",
      {},
      {
        fontFamily: "'Courier New', monospace",
        fontSize: "clamp(48px, 8vw, 96px)",
        color: "#f4d03f",
        letterSpacing: "6px",
        textShadow: "0 0 20px rgba(244,208,63,0.5)",
        lineHeight: "1",
      },
    );
    titleEl.textContent = "ANT WARS";

    const sub = el(
      "p",
      {},
      {
        fontFamily: "'Courier New', monospace",
        fontSize: "13px",
        color: "#7a7aaa",
        letterSpacing: "3px",
        textTransform: "uppercase",
      },
    );
    sub.textContent = "Conquer the overworld";
    const credits = el(
      "p",
      {},
      {
        fontFamily: "'Courier New', monospace",
        fontSize: "10px",
        color: "#4a4a6a",
        letterSpacing: "2px",
        marginTop: "12px",
      },
    );
    credits.textContent = "Vibecoded by Wilmer Barahona";

    const playBtn = makeBtn("Play", true);
    playBtn.addEventListener("click", showSpeciesSelect);

    wrap.appendChild(titleEl);
    wrap.appendChild(sub);
    wrap.appendChild(credits);
    wrap.appendChild(playBtn);
    overlay.appendChild(wrap);
  }

  // ── Screen 1: Species selection ───────────────────────────────────────────
  function showSpeciesSelect(): void {
    let playerSpecies: AntSpecies = "black";
    let foeSpecies: AntSpecies = "red";

    function rebuild(): void {
      overlay.innerHTML = "";

      const outer = el(
        "div",
        {},
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          width: "100%",
          maxWidth: "700px",
        },
      );

      // Title
      const heading = el(
        "h2",
        {},
        {
          fontFamily: "'Courier New', monospace",
          fontSize: "16px",
          color: "#f4d03f",
          letterSpacing: "2px",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: "1.4",
        },
      );
      heading.textContent = "Select your species and your enemy's species";

      // Two columns + VS divider
      const cols = el(
        "div",
        {},
        {
          display: "flex",
          gap: "0",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
        },
      );

      const makeColumn = (
        colLabel: string,
        selected: AntSpecies,
        other: AntSpecies,
        onPick: (s: AntSpecies) => void,
      ): HTMLElement => {
        const col = el(
          "div",
          {},
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            flex: "1",
            maxWidth: "260px",
          },
        );

        // Column label
        const colTitle = el(
          "div",
          {},
          {
            fontFamily: "'Courier New', monospace",
            fontSize: "11px",
            color: "#aaaacc",
            letterSpacing: "2px",
            textTransform: "uppercase",
          },
        );
        colTitle.textContent = colLabel;
        col.appendChild(colTitle);

        // Dropdown
        const select = el(
          "select",
          {},
          {
            fontFamily: "'Courier New', monospace",
            fontSize: "13px",
            background: "#14142a",
            color: "#f4d03f",
            border: "2px solid #3a3a6a",
            borderRadius: "6px",
            padding: "7px 12px",
            cursor: "pointer",
            width: "100%",
            maxWidth: "220px",
            outline: "none",
            appearance: "auto",
          },
        ) as HTMLSelectElement;

        for (const sp of ALL_SPECIES) {
          const opt = document.createElement("option");
          opt.value = sp;
          opt.textContent = SPECIES[sp].label;
          if (sp === other) opt.disabled = true;
          if (sp === selected) opt.selected = true;
          select.appendChild(opt);
        }

        select.addEventListener("change", () => {
          onPick(select.value as AntSpecies);
          rebuild();
        });

        col.appendChild(select);

        // Species info card (display-only for currently selected species)
        col.appendChild(makeSpeciesCard(selected, true, false, () => {}));

        return col;
      };

      const playerCol = makeColumn(
        "Your Colony",
        playerSpecies,
        foeSpecies,
        (s) => {
          playerSpecies = s;
        },
      );

      const vs = el(
        "div",
        {},
        {
          fontFamily: "'Courier New', monospace",
          fontSize: "28px",
          color: "#ef4444",
          fontWeight: "bold",
          flexShrink: "0",
          padding: "0 28px",
          alignSelf: "center",
          marginTop: "36px",
        },
      );
      vs.textContent = "VS";

      const foeCol = makeColumn(
        "Enemy Colony",
        foeSpecies,
        playerSpecies,
        (s) => {
          foeSpecies = s;
        },
      );

      cols.appendChild(playerCol);
      cols.appendChild(vs);
      cols.appendChild(foeCol);

      // Buttons row
      const btnRow = el(
        "div",
        {},
        {
          display: "flex",
          gap: "16px",
          marginTop: "8px",
        },
      );

      const backBtn = makeBtn("← Back");
      backBtn.addEventListener("click", showTitle);

      const startBtn = makeBtn("Start Game", true);
      startBtn.addEventListener("click", () => {
        overlay.style.display = "none";
        overlay.innerHTML = "";
        onStart(playerSpecies, foeSpecies);
      });

      btnRow.appendChild(backBtn);
      btnRow.appendChild(startBtn);

      outer.appendChild(heading);
      outer.appendChild(cols);
      outer.appendChild(btnRow);
      overlay.appendChild(outer);
    }

    rebuild();
  }

  showTitle();
}
