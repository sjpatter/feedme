import { useRef } from "react";
import { C, FONT } from "../styles/tokens";
import { TABS, TAB_LABELS } from "../lib/constants";

const ICONS = { planner: "📅", recipes: "📖", grocery: "🛒", profile: "👤" };

export function BottomNav({ tab, setTab, onLongPress }) {
  const pressTimer = useRef(null);

  function handlePressStart() {
    pressTimer.current = setTimeout(() => { if (onLongPress) onLongPress(); }, 800);
  }
  function handlePressEnd() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 680, background: C.surface, borderTop: "1px solid " + C.border, display: "flex" }}>
      {TABS.map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? C.primary : C.textTertiary, fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: FONT, letterSpacing: "0.01em", borderTop: "2px solid " + (active ? C.primary : "transparent") }}
          >
            <span style={{ fontSize: 18 }}>{ICONS[t]}</span>
            {TAB_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
