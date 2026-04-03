/**
 * respawnDialog.ts
 *
 * Full-screen "YOU DIED" overlay with caste selection.
 * Choosing a caste calls onRespawn(role) and removes itself.
 * Only drone, worker, and soldier are available — no queen on respawn.
 */

import type { AntRole } from "../types";

let activeDialog: HTMLDivElement | null = null;

export function showRespawnDialog(onRespawn: (role: AntRole) => void): void {
  if (activeDialog) return; // already showing

  const overlay = document.createElement("div");
  overlay.id = "respawn-overlay";
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
  title.textContent = "YOU DIED";
  Object.assign(title.style, {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#c0392b",
    letterSpacing: "10px",
    textShadow: "0 0 24px rgba(192,57,43,0.8), 0 2px 0 #000",
    marginBottom: "12px",
  });

  // ---- Subtitle ------------------------------------------------------------
  const subtitle = document.createElement("div");
  subtitle.textContent = "PICK A CASTE TO RESPAWN";
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
      desc: "Low HP · Low attack · Reproducer",
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
  Object.assign(row.style, {
    display: "flex",
    gap: "20px",
  });

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
      hideRespawnDialog();
      onRespawn(c.role);
    });

    row.appendChild(btn);
  }

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(row);
  document.body.appendChild(overlay);
  activeDialog = overlay;
}

export function hideRespawnDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}
