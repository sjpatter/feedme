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
   * viewBox 0 0 200 136 — displayed at width=140 height=95 (0.7× scale)
   *
   * Plate: cx=100 cy=68 r=58 → left x=42, right x=158, top y=10, bottom y=126 (diam=116)
   * Fork: 3 tines x=10,16,22. Rightmost outer edge 22+0.9=22.9. Gap to plate: 19.1px ≈ 20 ✓
   * Knife: cutting edge leftmost ≈ x=176. Gap from plate right (158): 18px ✓
   * Fork + knife both span y=10–126, matching plate diameter (116px) ✓
   * Text block center at y=68.5 ≈ cy=68 ✓
   */
  return (
    <svg width="140" height="95" viewBox="0 0 200 136" fill="none" xmlns="http://www.w3.org/2000/svg">

      {/* ── FORK ── 3 tines + base connector + handle, total height y:10-126 */}
      {/* Three tines */}
      <line x1="10" y1="10" x2="10" y2="36" stroke="#C0472A" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="10" x2="16" y2="45" stroke="#C0472A" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="22" y1="10" x2="22" y2="36" stroke="#C0472A" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Base connector — outer tines curve into center */}
      <path d="M10 36 C11 43 13 45 16 45" fill="none" stroke="#C0472A" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M22 36 C21 43 19 45 16 45" fill="none" stroke="#C0472A" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Handle — thicker, runs from neck to plate bottom */}
      <line x1="16" y1="44" x2="16" y2="126" stroke="#C0472A" strokeWidth="2.8" strokeLinecap="round"/>

      {/* ── PLATE ── */}
      <circle cx="100" cy="68" r="58" fill="#FDF0EC" stroke="#C0472A" strokeWidth="2"/>
      <circle cx="100" cy="68" r="46" fill="white" stroke="#C0472A" strokeWidth="1.2" opacity="0.5"/>

      {/* ── TEXT INSIDE PLATE ── */}
      {/* "PLAN MY" — system-ui, 12px, 700, letter-spacing 1.8 */}
      <text
        x="100" y="54"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#C0472A"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="1.8"
      >PLAN MY</text>
      {/* "dinner" — Baskerville/Palatino/Georgia, 22px, italic, 700 */}
      <text
        x="100" y="78"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#C0472A"
        fontSize="22"
        fontWeight="700"
        fontStyle="italic"
        fontFamily="'Baskerville', 'Book Antiqua', 'Palatino Linotype', 'Palatino', Georgia, serif"
      >dinner</text>

      {/* ── KNIFE ── blade + bolster + handle, total height y:10-126 */}
      {/* Blade — spine right straight, cutting edge left with subtle outward curve */}
      <path
        d="M181 10 L176 13 C175 38 175 66 176 88 L181 88 Z"
        fill="#C0472A"
      />
      {/* Bolster — slightly wider, separates blade from handle */}
      <rect x="174" y="88" width="10" height="11" rx="1" fill="#C0472A"/>
      {/* Handle */}
      <rect x="175" y="99" width="8" height="27" rx="3" fill="#C0472A"/>
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
