import { useRef } from "react";
import { C, FONT } from "../styles/tokens";
import { TABS, TAB_LABELS } from "../lib/constants";

function PlannerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Calendar body */}
      <rect x="2" y="5" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      {/* Ring-pull tabs at top */}
      <path d="M7 2.5v5M15 2.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Header bar */}
      <path d="M2 9h18" stroke="currentColor" strokeWidth="1.5"/>
      {/* Three dot indicators in grid */}
      <circle cx="7" cy="13.5" r="1.2" fill="currentColor"/>
      <circle cx="11" cy="13.5" r="1.2" fill="currentColor"/>
      <circle cx="15" cy="13.5" r="1.2" fill="currentColor" opacity="0.35"/>
      <circle cx="7" cy="17.5" r="1.2" fill="currentColor" opacity="0.35"/>
      <circle cx="11" cy="17.5" r="1.2" fill="currentColor"/>
    </svg>
  );
}

function RecipesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Open book spine */}
      <path d="M11 5v14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Left page */}
      <path d="M11 5C9 4.5 5 4.5 3 5v13c2-.5 6-.5 8 0V5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Right page */}
      <path d="M11 5c2-.5 6-.5 8 0v13c-2-.5-6-.5-8 0V5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Ruled lines — right page */}
      <path d="M13.5 8.5h4M13.5 11h4M13.5 13.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
      {/* Ruled lines — left page */}
      <path d="M4.5 8.5h4M4.5 11h4M4.5 13.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
      {/* Bookmark ribbon on right page */}
      <path d="M18.5 4.5v5l-1.5-1.2-1.5 1.2V4.5" fill="currentColor" opacity="0.8"/>
    </svg>
  );
}

function GroceryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Tote bag body */}
      <path d="M4.5 8.5h13l-1.5 10.5h-10L4.5 8.5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Handle curve */}
      <path d="M8.5 8.5C8.5 6 9.6 4.5 11 4.5s2.5 1.5 2.5 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Small teal leaf accent */}
      <path d="M10 14.5c.8-2 3.5-1.8 3.2 1" stroke="#0D9488" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <line x1="11.5" y1="13.5" x2="11.5" y2="16.5" stroke="#0D9488" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Chef's toque hat — top puff */}
      <path d="M7 11C7 8 8.5 6 11 6s4 2 4 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Left and right puffs */}
      <path d="M7 11C6 9.5 5 8 6 6.5C7 5 8.5 5.5 8.5 7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <path d="M15 11C16 9.5 17 8 16 6.5C15 5 13.5 5.5 13.5 7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      {/* Hat brim band */}
      <rect x="5.5" y="11" width="11" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Hat body below brim */}
      <rect x="6.5" y="13.5" width="9" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
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
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 680,
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      display: "flex",
      zIndex: 100,
    }}>
      {TABS.map((t) => {
        const active = tab === t;
        const Icon = NAV_ICONS[t];
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            style={{
              flex: 1, padding: "10px 4px 14px", border: "none", background: "none",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: active ? C.primary : "#BBBBBB",
              fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: FONT, letterSpacing: "0.01em",
              borderTop: "2px solid " + (active ? C.primary : "transparent"),
              transition: "color 0.15s",
            }}
          >
            <Icon />
            {TAB_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
