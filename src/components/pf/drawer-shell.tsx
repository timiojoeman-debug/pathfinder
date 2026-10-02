"use client";

/** The slide-in panel every detail drawer sits in. */

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="pf-anim-fade"
      style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 60, cursor: "pointer" }}
    />
  );
}

export function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <Scrim onClose={onClose} />
      <div
        className="pf-anim-slidein"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px,94vw)", zIndex: 61, background: "var(--panelSolid)", borderLeft: "1px solid var(--line)", overflowY: "auto" }}
      >
        {children}
      </div>
    </>
  );
}

export function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="pf-tap"
      style={{ cursor: "pointer", width: 32, height: 32, borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 15, flexShrink: 0 }}
    >
      ✕
    </button>
  );
}
