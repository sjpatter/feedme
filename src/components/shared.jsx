import { C, FONT } from "../styles/tokens";

export function Btn(props) {
  const variant = props.variant || "ghost";
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, cursor: props.disabled ? "not-allowed" : "pointer", border: "none",
    borderRadius: 10, fontFamily: FONT, fontWeight: 700,
    opacity: props.disabled ? 0.4 : 1,
    width: props.fullWidth ? "100%" : "auto",
    padding: props.small ? "7px 14px" : "11px 20px",
    fontSize: props.small ? 13 : 14,
    letterSpacing: "-0.01em",
    boxSizing: "border-box",
  };
  const styles = {
    primary: { background: C.primary, color: "#fff" },
    ghost: { background: "transparent", color: C.text, border: "1.5px solid " + C.border },
    soft: { background: C.primaryLight, color: C.primaryDark, border: "1.5px solid " + C.primaryMid },
    teal: { background: C.secondaryLight, color: C.secondary, border: "1.5px solid " + C.secondaryMid },
    danger: { background: "transparent", color: C.danger, border: "1.5px solid " + C.border },
    dark: { background: C.text, color: "#fff" },
  };
  const s = props.danger ? styles.danger : (styles[variant] || styles.ghost);
  return (
    <button onClick={props.onClick} disabled={props.disabled} style={Object.assign({}, base, s)}>
      {props.children}
    </button>
  );
}

export function Tag(props) {
  const map = {
    neutral: { bg: C.neutralLight, text: C.neutral },
    primary: { bg: C.primaryLight, text: C.primaryDark },
    teal: { bg: C.secondaryLight, text: C.secondary },
    warning: { bg: C.warningLight, text: C.warning },
    danger: { bg: C.dangerLight, text: C.danger },
  };
  const c = map[props.color] || map.neutral;
  return (
    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: c.bg, color: c.text, fontWeight: 600, letterSpacing: "0.02em", fontFamily: FONT }}>
      {props.label}
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
    <div style={{ padding: "1.5rem 1.25rem 0", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {props.logo ? props.logo : (
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.text, letterSpacing: "-0.03em", fontFamily: FONT }}>
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
      <div style={{ height: 1, background: C.border, marginTop: "1.25rem" }} />
    </div>
  );
}

export function Card(props) {
  const base = { background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "1rem 1.25rem" };
  return <div style={Object.assign({}, base, props.style || {})}>{props.children}</div>;
}

export function ErrorBanner(props) {
  if (!props.message) return null;
  return (
    <div style={{ background: C.dangerLight, border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: C.danger, fontFamily: FONT, fontWeight: 400 }}>
        <strong>Error: </strong>{props.message}
      </p>
    </div>
  );
}

export function CollapsibleButton(props) {
  return (
    <button
      onClick={props.onToggle}
      style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + (props.isOpen ? C.primaryMid : C.border), background: props.isOpen ? C.primaryLight : C.surface, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: props.isOpen ? 10 : "1rem" }}
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="18" cy="22" rx="13" ry="5" fill={C.primaryLight} stroke={C.primary} strokeWidth="1.5"/>
        <path d="M5 22 Q5 32 18 32 Q31 32 31 22" fill={C.primaryLight} stroke={C.primary} strokeWidth="1.5"/>
        <path d="M12 16 Q13 13 12 10" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18 15 Q19 12 18 9" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M24 16 Q25 13 24 10" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="29" y1="4" x2="29" y2="18" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="27" y1="4" x2="27" y2="9" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="29" y1="4" x2="29" y2="9" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="31" y1="4" x2="31" y2="9" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M27 9 Q29 11 31 9" stroke={C.primary} strokeWidth="1.5" fill="none"/>
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", fontFamily: FONT }}>feed</span>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.primary, letterSpacing: "-0.04em", fontFamily: FONT }}>me</span>
        <span style={{ fontSize: 20, marginLeft: 1 }}>🍕</span>
      </div>
    </div>
  );
}

export function ToastContainer(props) {
  if (!props.toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 640, padding: "0 1.25rem", pointerEvents: "none" }}>
      {props.toasts.map((t) => (
        <div key={t.id} style={{ background: t.type === "error" ? C.danger : C.text, color: "#fff", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: FONT, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{t.type === "error" ? "✕" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
