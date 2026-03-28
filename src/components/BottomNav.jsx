import { useRef } from "react";
import { C, FONT } from "../styles/tokens";
import { TABS, TAB_LABELS } from "../lib/constants";

function PlannerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 9h18" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 3v4M15 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="5" y="12" width="3" height="2" rx="0.5" fill="currentColor"/>
      <rect x="9.5" y="12" width="3" height="2" rx="0.5" fill="currentColor"/>
      <rect x="14" y="12" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.35"/>
      <rect x="5" y="16" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.35"/>
      <rect x="9.5" y="16" width="3" height="2" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function RecipesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 5C9 4.5 5 4.5 3 5v13c2-.5 6-.5 8 0V5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <path d="M11 5c2-.5 6-.5 8 0v13c-2-.5-6-.5-8 0V5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <path d="M13.5 8.5h4M13.5 11.5h4M13.5 14.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <path d="M5 3.5v6l2-1.5 2 1.5v-6" fill="currentColor" opacity="0.8"/>
    </svg>
  );
}

function GroceryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 8h14l-1.5 11H5.5L4 8z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <path d="M8.5 8C8.5 5.5 9.8 4 11 4s2.5 1.5 2.5 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M9 14c1-2.5 4.5-2 4 1.5" stroke="#0D9488" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <line x1="11" y1="13" x2="11" y2="16.5" stroke="#0D9488" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <ellipse cx="11" cy="8.5" rx="5" ry="4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M6 13C6 9 16 9 16 13" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="5" y="13" width="12" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M6 16v2.5M11 16v3M16 16v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

const NAV_ICONS = { planner: PlannerIcon, recipes: RecipesIcon, grocery: GroceryIcon, profile: ProfileIcon };

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
        const Icon = NAV_ICONS[t];
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? C.primary : C.textTertiary, fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: FONT, letterSpacing: "0.01em", borderTop: "2px solid " + (active ? C.primary : "transparent") }}
          >
            <Icon />
            {TAB_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
