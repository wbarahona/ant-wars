/**
 * burrowDialog.ts
 *
 * "SELECT YOUR CASTE" overlay shown after the player places their burrow.
 * Reuses the same card layout as respawnDialog but with colony-start flavour text.
 * Does NOT show any death messaging.
 */

import type { AntRole, AntSpecies } from "../types";

let activeDialog: HTMLDivElement | null = null;

export function showBurrowDialog(
  species: AntSpecies,
  onSelect: (role: AntRole) => void,
): void {
  if (activeDialog) return;

  const overlay = document.createElement("div");
  overlay.id = "burrow-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.82)",
    fontFamily: "'Courier New', monospace",
    gap: "0",
  });

  // ---- Title ---------------------------------------------------------------
  const title = document.createElement("div");
  title.textContent = `A NEW ${species.toUpperCase()} COLONY HAS STARTED`;
  Object.assign(title.style, {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#f4d03f",
    letterSpacing: "5px",
    textShadow: "0 0 20px rgba(244,208,63,0.7), 0 2px 0 #000",
    marginBottom: "12px",
    textAlign: "center",
    maxWidth: "640px",
    lineHeight: "1.3",
  });

  // ---- Subtitle ------------------------------------------------------------
  const subtitle = document.createElement("div");
  subtitle.textContent = "SELECT YOUR ANT CASTE";
  Object.assign(subtitle.style, {
    fontSize: "13px",
    color: "#aaa",
    letterSpacing: "4px",
    marginBottom: "40px",
  });

  // ---- Caste options -------------------------------------------------------
  const castes: {
    role: AntRole;
    label: string;
    desc: string;
    color: string;
  }[] = [
    {
      role: "drone",
      label: "DRONE",
      desc: "Low HP · Low attack · Scout",
      color: "#60a5fa",
    },
    {
      role: "worker",
      label: "WORKER",
      desc: "Medium HP · Medium attack · Gatherer",
      color: "#22c55e",
    },
    {
      role: "soldier",
      label: "SOLDIER",
      desc: "High HP · High attack · Defender",
      color: "#f59e0b",
    },
  ];

  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", gap: "20px" });

  for (const c of castes) {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      background: "#0f0f1e",
      border: `2px solid ${c.color}`,
      borderRadius: "6px",
      color: c.color,
      padding: "20px 28px",
      cursor: "pointer",
      textAlign: "center",
      minWidth: "140px",
      transition: "background 0.15s, transform 0.1s",
    });

    const roleName = document.createElement("div");
    roleName.textContent = c.label;
    Object.assign(roleName.style, {
      fontSize: "18px",
      fontWeight: "bold",
      letterSpacing: "3px",
      marginBottom: "8px",
    });

    const roleDesc = document.createElement("div");
    roleDesc.textContent = c.desc;
    Object.assign(roleDesc.style, {
      fontSize: "10px",
      color: "#888",
      letterSpacing: "1px",
      lineHeight: "1.5",
    });

    btn.appendChild(roleName);
    btn.appendChild(roleDesc);

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#1a1a3a";
      btn.style.transform = "scale(1.05)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#0f0f1e";
      btn.style.transform = "scale(1)";
    });
    btn.addEventListener("click", () => {
      hideBurrowDialog();
      onSelect(c.role);
    });

    row.appendChild(btn);
  }

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(row);
  document.body.appendChild(overlay);
  activeDialog = overlay;
}

export function hideBurrowDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}
