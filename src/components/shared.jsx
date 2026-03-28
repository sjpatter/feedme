import { C, FONT, SERIF } from "../styles/tokens";

export function Btn(props) {
  const variant = props.variant || "ghost";
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, cursor: props.disabled ? "not-allowed" : "pointer", border: "none",
    borderRadius: 12, fontFamily: FONT, fontWeight: 700,
    opacity: props.disabled ? 0.4 : 1,
    width: props.fullWidth ? "100%" : "auto",
    padding: props.small ? "7px 14px" : "13px 20px",
    fontSize: props.small ? 13 : 14,
    letterSpacing: "-0.01em",
    boxSizing: "border-box",
    transition: "opacity 0.15s",
  };
  const styles = {
    primary: { background: C.primary, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.text, border: "1.5px solid #E8E8E8" },
    soft: { background: C.primaryLight, color: C.primaryDark, border: "1.5px solid " + C.primaryMid },
    teal: { background: C.secondaryLight, color: C.secondary, border: "1.5px solid " + C.secondaryMid },
    danger: { background: "transparent", color: "#991B1B", border: "1.5px solid #E8E8E8" },
    dark: { background: C.text, color: "#fff", border: "none" },
  };
  const s = props.danger ? styles.danger : (styles[variant] || styles.ghost);
  return (
    <button onClick={props.onClick} disabled={props.disabled} style={Object.assign({}, base, s)}>
      {props.children}
    </button>
  );
}

// Tag color map following design spec exactly
const TAG_COLORS = {
  neutral:  { bg: "#F3F4F6", text: "#6B7280" },  // LEFTOVER
  primary:  { bg: "#FDF0EC", text: "#993C1D" },  // NEW
  teal:     { bg: "#E1F5EE", text: "#0F6E56" },  // VEGGIE / EASY CLEANUP / EASY
  warning:  { bg: "#FEF3C7", text: "#78350F" },  // MEAT / INTERMEDIATE
  danger:   { bg: "#FEF2F2", text: "#991B1B" },  // ADVANCED
};

export function Tag({ label, color }) {
  const c = TAG_COLORS[color] || TAG_COLORS.neutral;
  return (
    <span style={{
      fontSize: 10, padding: "3px 10px", borderRadius: 20,
      background: c.bg, color: c.text,
      fontWeight: 700, letterSpacing: "0.02em", fontFamily: FONT,
      display: "inline-block",
    }}>
      {label}
    </span>
  );
}

export function SectionLabel(props) {
  const style = Object.assign({
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: C.textTertiary,
    margin: "0 0 10px", fontFamily: FONT,
  }, props.style || {});
  return <p style={style}>{props.children}</p>;
}

export function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "18px 0" }} />;
}

export function PageHeader(props) {
  return (
    <div style={{
      padding: "1.25rem 1.25rem 0",
      marginBottom: "1.25rem",
      background: "#FFFFFF",
      borderBottom: "1px solid #F0EDE8",
      paddingBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {props.logo ? props.logo : (
            <h1 style={{
              fontSize: 24, fontWeight: 700, margin: 0, color: C.text,
              letterSpacing: "-0.5px", fontFamily: SERIF,
            }}>
              {props.title}
            </h1>
          )}
          {props.subtitle && (
            <p style={{ fontSize: 13, color: C.textTertiary, margin: "3px 0 0", fontFamily: FONT, fontWeight: 400 }}>
              {props.subtitle}
            </p>
          )}
        </div>
        {props.action}
      </div>
    </div>
  );
}

export function Card(props) {
  const base = {
    background: "#FFFFFF",
    border: "1px solid rgba(0,0,0,0.05)",
    borderRadius: 16,
    padding: "16px 18px",
    boxShadow: "0 4px 20px rgba(168, 67, 42, 0.08)",
  };
  return <div style={Object.assign({}, base, props.style || {})}>{props.children}</div>;
}

export function ErrorBanner(props) {
  if (!props.message) return null;
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#991B1B", fontFamily: FONT, fontWeight: 400 }}>
        <strong>Error: </strong>{props.message}
      </p>
    </div>
  );
}

export function CollapsibleButton(props) {
  return (
    <button
      onClick={props.onToggle}
      style={{
        width: "100%", padding: "12px 16px", borderRadius: 12,
        border: "1px solid " + (props.isOpen ? C.primaryMid : "rgba(0,0,0,0.06)"),
        background: props.isOpen ? C.primaryLight : "#FFFFFF",
        boxShadow: props.isOpen ? "none" : "0 2px 8px rgba(168,67,42,0.06)",
        cursor: "pointer", fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: props.isOpen ? 10 : "1rem",
      }}
    >
      <div style={{ textAlign: "left" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{props.label}</p>
        {props.sublabel && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textTertiary, fontWeight: 400 }}>{props.sublabel}</p>}
      </div>
      <span style={{ color: C.textTertiary, fontSize: 11, fontWeight: 700 }}>{props.isOpen ? "▲" : "▼"}</span>
    </button>
  );
}

export function AppLogo() {
  /*
   * viewBox 0 0 116 68
   * Plate: cx=65 cy=34 r=28 → left x=37, right x=93, top y=6, bottom y=62
   * Fork: 4 tines at x=18,21,24,27. Rightmost outer edge: 27.75. Gap to plate: 9.25px ✓
   * Fork handle: x=22.5, y=24 to y=62 — matches plate height (56px)
   * Knife blade: leftmost ≈ x=101 (cubic curve control). Gap from plate right: 8px ✓
   * Knife handle: y=53 to y=62 — matches plate height
   * Text centered inside plate at cx=65, cy=34
   */
  return (
    <svg width="100" height="59" viewBox="0 0 116 68" fill="none" xmlns="http://www.w3.org/2000/svg">

      {/* Fork — 4 tines, height y:6-62 matches plate diameter */}
      <line x1="18" y1="8"  x2="18" y2="20" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="21" y1="6"  x2="21" y2="22" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="24" y1="6"  x2="24" y2="22" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="27" y1="8"  x2="27" y2="20" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 20 Q22.5 24.5 27 20" fill="none" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22.5" y1="24" x2="22.5" y2="62" stroke="#C0472A" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Plate — two concentric circles */}
      <circle cx="65" cy="34" r="28" fill="#FDF0EC" stroke="#C0472A" strokeWidth="2"/>
      <circle cx="65" cy="34" r="22" fill="none" stroke="#C0472A" strokeWidth="0.8" opacity="0.4"/>

      {/* "PLAN MY" — small caps sans-serif, centered inside plate */}
      <text
        x="65" y="28"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#C0472A"
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="1.5"
      >PLAN MY</text>

      {/* "dinner" — italic Georgia, centered below */}
      <text
        x="65" y="42"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#C0472A"
        fontSize="16"
        fontWeight="700"
        fontStyle="italic"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing="-0.5"
      >dinner</text>

      {/* Knife — blade left (cutting edge) curves slightly, spine right is straight */}
      <path
        d="M103 8 C101 22 101 40 102 52 L106 52 L105 8 Q104 6 103 8 Z"
        fill="#C0472A"
      />
      {/* Knife handle — thicker to distinguish from blade */}
      <line x1="104" y1="53" x2="104" y2="62" stroke="#C0472A" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

export function ToastContainer(props) {
  if (!props.toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 640, padding: "0 1.25rem", pointerEvents: "none" }}>
      {props.toasts.map((t) => (
        <div key={t.id} style={{ background: t.type === "error" ? "#991B1B" : C.text, color: "#fff", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: FONT, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
          <span style={{ fontSize: 16 }}>{t.type === "error" ? "✕" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
