// ============================================================
// Feed Me — App.jsx
// Single-file React app. Currently uses in-memory state only.
// Claude Code migration target: Supabase + auth + friends.
// See migration prompt for full instructions.
// ============================================================
import { useState, useCallback, useRef } from "react";
// ─── Constants ───────────────────────────────────────────────────────────────
const UNSPECIFIED = "unspecified";
const TABS = ["planner", "recipes", "grocery", "profile"];
const TAB_LABELS = { planner: "This Week", recipes: "Recipes", grocery: "Grocery", profile: "Profile" };
const SECTIONS = ["produce", "dairy", "meat", "grains", "other"];
const SECTION_ICONS = { produce: "🥦", dairy: "🧀", meat: "🥩", grains: "🌾", other: "📦" };
const DIFFICULTY_OPTS = ["easy", "intermediate", "advanced"];
// ─── Design tokens ───────────────────────────────────────────────────────────
// Extracted to /src/styles/colors.js during migration
const C = {
  bg: "#F7F7F7",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  border: "#E8E8E8",
  borderMid: "#D4D4D4",
  text: "#111111",
  textSecondary: "#555555",
  textTertiary: "#999999",
  primary: "#A8432A",
  primaryDark: "#8C3622",
  primaryLight: "#FDF0EC",
  primaryMid: "#E8A898",
  secondary: "#0D9488",
  secondaryLight: "#F0FDF9",
  secondaryMid: "#99F6E4",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  neutral: "#6B7280",
  neutralLight: "#F3F4F6",
  infoNeutralBg: "#F3F4F6",
  infoNeutralText: "#374151",
  infoAmberBg: "#FEF3C7",
  infoAmberText: "#78350F",
};
// Extracted to /src/styles/fonts.js during migration
const FONT = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
// ─── Typography scale ─────────────────────────────────────────────────────────
// Bold (700):   page headers, card titles, section labels, button text
// Medium (500): form labels, secondary UI text
// Regular (400): body text, descriptions, metadata
// ─── Input style ─────────────────────────────────────────────────────────────
const INPUT_STYLE = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid " + C.border,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  background: C.surface,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
// ─── Default data shape ───────────────────────────────────────────────────────
// This is the in-memory state structure.
// During migration, each key maps to a Supabase table (see migration prompt).
const defaultData = {
  recipes: [],        // → table: recipes
  weeklyPlans: [],    // → table: meal_plans
  currentWeek: null,  // → table: meal_plans (most recent)
  groceryList: { produce: [], dairy: [], meat: [], grains: [], other: [] }, // → table: grocery_lists
  staples: [],        // → table: staples
  lastGenerated: null, // ephemeral, not persisted
  mealHistory: [],    // → table: meal_history
  fridgeItems: [],    // → table: fridge_items
  tasteProfile: [],   // → table: taste_profile
};
// ─── API ──────────────────────────────────────────────────────────────────────
// During migration, move callClaude to /src/lib/api.js
// and add all Supabase data functions alongside it.
async function callClaude(messages, system) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: system || "",
      messages: messages,
    }),
  });
  const d = await res.json();
  const block = d.content && d.content.find(function(b) { return b.type === "text"; });
  return block ? block.text : "";
}
function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}
// Normalises Claude's meal plan response — handles both {meals:[]} and bare []
function getMeals(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.meals)) return parsed.meals;
  return null;
}
// ─── Shared UI components ─────────────────────────────────────────────────────
// During migration, extract each to /src/components/shared/
function Btn(props) {
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
function Tag(props) {
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
function SectionLabel(props) {
  const style = Object.assign({
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: C.textTertiary,
    margin: "0 0 10px", fontFamily: FONT,
  }, props.style || {});
  return <p style={style}>{props.children}</p>;
}
function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "18px 0" }} />;
}
function PageHeader(props) {
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
function Card(props) {
  const base = { background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "1rem 1.25rem" };
  return <div style={Object.assign({}, base, props.style || {})}>{props.children}</div>;
}
function ErrorBanner(props) {
  if (!props.message) return null;
  return (
    <div style={{ background: C.dangerLight, border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: C.danger, fontFamily: FONT, fontWeight: 400 }}>
        <strong>Error: </strong>{props.message}
      </p>
    </div>
  );
}
// ─── App logo ─────────────────────────────────────────────────────────────────
function AppLogo() {
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
// ─── Toast ────────────────────────────────────────────────────────────────────
// During migration, extract to /src/hooks/useToast.js + /src/components/shared/Toast.jsx
function useToast() {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback(function(message, type) {
    const id = Date.now();
    setToasts(function(prev) { return prev.concat([{ id: id, message: message, type: type || "success" }]); });
    setTimeout(function() { setToasts(function(prev) { return prev.filter(function(t) { return t.id !== id; }); }); }, 3000);
  }, []);
  return { toasts: toasts, showToast: showToast };
}
function ToastContainer(props) {
  if (!props.toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 640, padding: "0 1.25rem", pointerEvents: "none" }}>
      {props.toasts.map(function(t) {
        return (
          <div key={t.id} style={{ background: t.type === "error" ? C.danger : C.text, color: "#fff", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: FONT, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{t.type === "error" ? "✕" : "✓"}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
// ─── CollapsibleButton ────────────────────────────────────────────────────────
function CollapsibleButton(props) {
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
// ─── MealCard ─────────────────────────────────────────────────────────────────
// During migration, extract to /src/components/MealCard.jsx
function MealCard(props) {
  const { meal, showFavorite, showBabyNote, onAddFavorite, alreadySaved } = props;
  const [expanded, setExpanded] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saved, setSaved] = useState(!!alreadySaved);
  const [details, setDetails] = useState(
    meal.ingredients && meal.ingredients.length > 0
      ? { ingredients: meal.ingredients, steps: meal.steps || [] }
      : null
  );
  const diffStyles = {
    easy: { bg: C.secondaryLight, text: C.secondary },
    intermediate: { bg: C.warningLight, text: C.warning },
    advanced: { bg: C.dangerLight, text: C.danger },
  };
  const diff = diffStyles[meal.difficulty] || diffStyles.easy;
  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (details) return;
    setDetailsLoading(true);
    const system = "You are a recipe assistant. Respond ONLY with valid JSON. No markdown, no backticks.";
    const prompt = "Return ingredients and steps for: \"" + meal.name + "\"" + (meal.source ? " from " + meal.source : "") + ".\nJSON: {\"ingredients\":[{\"name\":\"\",\"amount\":\"\",\"section\":\"\"}],\"steps\":[\"Step 1.\"]}\nsection=produce/dairy/meat/grains/other. 4-6 steps.";
    try {
      const raw = await callClaude([{ role: "user", content: prompt }], system);
      const parsed = parseJSON(raw);
      setDetails({ ingredients: parsed.ingredients || [], steps: parsed.steps || [] });
    } catch(e) {
      setDetails({ ingredients: [], steps: ["Could not load recipe details. Try again."] });
    }
    setDetailsLoading(false);
  }
  function shareViaSMS() {
    const ingLines = details ? details.ingredients.map(function(i) { return (i.amount ? i.amount + " " : "") + i.name; }).join("\n") : "";
    const parts = [
      "Dinner: " + meal.name,
      meal.description || "",
      meal.source ? "Source: " + (meal.sourceUrl || meal.source) : "",
      ingLines ? "\nIngredients:\n" + ingLines : "",
      details && details.steps.length ? "\nSteps:\n" + details.steps.map(function(s, i) { return (i + 1) + ". " + s; }).join("\n") : "",
    ];
    window.open("sms:?body=" + encodeURIComponent(parts.filter(Boolean).join("\n").trim()));
  }
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {meal.isNew && <Tag label="new" color="primary" />}
            {meal.isMeat && <Tag label="meat" color="warning" />}
            {meal.isVegetarian && <Tag label="veggie" color="teal" />}
            {meal.isEasyCleanup && <Tag label="easy cleanup" color="teal" />}
            {meal.hasLeftovers && <Tag label={"+" + (meal.leftoverDays || 1) + " leftover"} color="neutral" />}
          </div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: C.text, letterSpacing: "-0.02em", fontFamily: FONT }}>{meal.name}</p>
          {meal.source && (
            <p style={{ margin: "0 0 6px", fontSize: 12, fontFamily: FONT, color: C.textTertiary, fontWeight: 400 }}>
              {meal.sourceUrl
                ? <a href={meal.sourceUrl} style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>{meal.source} ↗</a>
                : meal.source}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {meal.cookTime && (
              <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{"⏱ " + meal.cookTime + " min"}</span>
            )}
            {meal.difficulty && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontFamily: FONT, fontWeight: 600, background: diff.bg, color: diff.text }}>{meal.difficulty}</span>
            )}
          </div>
          {meal.description && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textSecondary, fontFamily: FONT, lineHeight: 1.6, fontWeight: 400 }}>{meal.description}</p>
          )}
        </div>
        <button onClick={handleExpand} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: C.textTertiary, fontSize: 11, flexShrink: 0, fontFamily: FONT, fontWeight: 700 }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.border }}>
          {showBabyNote && meal.babyNote && (
            <div style={{ background: C.warningLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid #FDE68A" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontFamily: FONT, lineHeight: 1.5, fontWeight: 400 }}>
                <strong>Baby tip: </strong>{meal.babyNote}
              </p>
            </div>
          )}
          {detailsLoading && (
            <p style={{ fontSize: 13, color: C.textTertiary, fontFamily: FONT, margin: "0 0 12px", fontWeight: 400 }}>Loading recipe details...</p>
          )}
          {details && !detailsLoading && (
            <div>
              {details.ingredients.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 6 }}>Ingredients</SectionLabel>
                  <ul style={{ margin: "0 0 14px", paddingLeft: 18 }}>
                    {details.ingredients.map(function(ing, i) {
                      const label = typeof ing === "string" ? ing : (ing.amount ? ing.amount + " " : "") + ing.name;
                      return <li key={i} style={{ fontSize: 14, color: C.textSecondary, fontFamily: FONT, marginBottom: 3, lineHeight: 1.5, fontWeight: 400 }}>{label}</li>;
                    })}
                  </ul>
                </div>
              )}
              {details.steps.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 6 }}>Steps</SectionLabel>
                  <ol style={{ margin: "0 0 14px", paddingLeft: 18 }}>
                    {details.steps.map(function(s, i) {
                      return <li key={i} style={{ fontSize: 14, color: C.textSecondary, fontFamily: FONT, marginBottom: 5, lineHeight: 1.6, fontWeight: 400 }}>{s}</li>;
                    })}
                  </ol>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn small onClick={shareViaSMS}>Share via text</Btn>
            {showFavorite && onAddFavorite && (
              saved
                ? <span style={{ fontSize: 13, color: C.secondary, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5, padding: "7px 0", fontWeight: 600 }}>✓ Saved</span>
                : <Btn small variant="soft" onClick={function() { onAddFavorite(details); setSaved(true); }}>Save to favorites</Btn>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
// ─── PlannerTab ───────────────────────────────────────────────────────────────
function PlannerTab(props) {
  const { data, update, showToast } = props;
  const [criteria, setCriteria] = useState({
    totalDinners: 5, cookingNights: 4, newMeals: 2,
    meatMeals: UNSPECIFIED, vegMeals: UNSPECIFIED,
    babyFriendly: true, notes: "",
    quickMeals: UNSPECIFIED, mediumMeals: UNSPECIFIED, involvedMeals: UNSPECIFIED,
    easyCleanup: UNSPECIFIED,
  });
  const [showCriteria, setShowCriteria] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFridge, setShowFridge] = useState(false);
  const [newFridgeItem, setNewFridgeItem] = useState("");
  const plan = generatedPlan || data.currentWeek;
  function setC(k, v) { setCriteria(function(p) { return Object.assign({}, p, { [k]: v }); }); }
  function numOpt(max) { const o = [UNSPECIFIED]; for (let i = 0; i <= max; i++) o.push(i); return o; }
  function addFridgeItem() {
    if (!newFridgeItem.trim()) return;
    update(function(d) { return Object.assign({}, d, { fridgeItems: (d.fridgeItems || []).concat([{ id: Date.now(), text: newFridgeItem.trim() }]) }); });
    setNewFridgeItem("");
  }
  function removeFridgeItem(id) {
    update(function(d) { return Object.assign({}, d, { fridgeItems: (d.fridgeItems || []).filter(function(i) { return i.id !== id; }) }); });
  }
  function buildPrompt() {
    const hasFav = data.recipes.length > 0;
    const favNames = hasFav ? data.recipes.map(function(r) { return r.name; }).join(", ") : "none";
    const fromFav = hasFav ? Math.max(0, criteria.cookingNights - criteria.newMeals) : 0;
    const newCount = hasFav ? criteria.newMeals : criteria.cookingNights;
    const recent = (data.weeklyPlans || []).slice(-2).reduce(function(a, w) { return a.concat((w.meals || []).map(function(m) { return m.name; })); }, []).join(", ") || "none";
    const fridge = (data.fridgeItems || []).map(function(i) { return i.text; }).join(", ") || "none";
    const profile = (data.tasteProfile || []).map(function(p) { return p.text; }).join("; ") || "none";
    const skipped = (data.mealHistory || []).filter(function(h) { return h.signal === "skip"; }).slice(-10).map(function(h) { return h.name; }).join(", ") || "none";
    return "Generate a weekly dinner plan.\n" +
      "Saved favorites: " + favNames + "\nRecent meals to avoid: " + recent + "\nPreviously skipped: " + skipped + "\nTaste profile: " + profile + "\nFridge items to use: " + fridge + "\n" +
      "Total dinners: " + criteria.totalDinners + "\nCooking nights: " + criteria.cookingNights + "\nNew recipes: " + newCount + ", from favorites: " + fromFav + (!hasFav ? " (no favorites yet)" : "") + "\n" +
      "Meat: " + (criteria.meatMeals === UNSPECIFIED ? "your choice" : "at least " + criteria.meatMeals) + "\nVegetarian: " + (criteria.vegMeals === UNSPECIFIED ? "your choice" : "at least " + criteria.vegMeals) + "\n" +
      "Quick (<=30min): " + (criteria.quickMeals === UNSPECIFIED ? "your choice" : "at least " + criteria.quickMeals) + "\nMedium (45-60min): " + (criteria.mediumMeals === UNSPECIFIED ? "your choice" : "at least " + criteria.mediumMeals) + "\nInvolved (1-2hr): " + (criteria.involvedMeals === UNSPECIFIED ? "your choice" : "at least " + criteria.involvedMeals) + "\n" +
      "One-pot/sheet-pan: " + (criteria.easyCleanup === UNSPECIFIED ? "your choice" : "at least " + criteria.easyCleanup) + "\nBaby tips: " + (criteria.babyFriendly ? "yes" : "no") + "\nNotes: " + (criteria.notes || "none") + "\n\n" +
      "Recipe sourcing: Draw from a wide variety. Prioritize iconic recipes -- Kenji Lopez-Alt classics, Smitten Kitchen, Ottolenghi vegetables, Bon Appetit BA Best, Serious Eats tested classics, NYT Cooking most-saved, Food52 favorites, Ina Garten, Joshua Weissman, The Kitchn. For each dish: who makes the most celebrated version? Vary sources. Only include sourceUrl if confident.\n\n" +
      "Return ONLY JSON overview, no ingredients or steps:\n{\"meals\":[{\"name\":\"\",\"source\":\"\",\"sourceUrl\":\"\",\"isNew\":true,\"isMeat\":true,\"isVegetarian\":false,\"hasLeftovers\":false,\"leftoverDays\":0,\"cookTime\":30,\"difficulty\":\"easy\",\"isEasyCleanup\":false,\"description\":\"One sentence.\",\"babyNote\":\"One tip.\",\"usesFridgeItems\":[]}]}\ndifficulty=easy/intermediate/advanced.";
  }
  async function generatePlan() {
    setLoading(true); setError(null);
    try {
      const raw = await callClaude([{ role: "user", content: buildPrompt() }], "You are a helpful meal planner. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.");
      if (!raw) throw new Error("Empty response from API.");
      const meals = getMeals(parseJSON(raw));
      if (!meals) throw new Error("Response missing meals array.");
      setGeneratedPlan({ meals: meals });
      update(function(d) { return Object.assign({}, d, { lastGenerated: { meals: meals, generatedAt: Date.now() } }); });
      setShowCriteria(false);
    } catch(e) { setError(e.message || "Something went wrong. Try again."); }
    setLoading(false);
  }
  async function applyFeedback() {
    if (!feedback.trim() || !plan) return;
    setFeedbackLoading(true); setError(null);
    try {
      const raw = await callClaude(
        [{ role: "user", content: "Current plan: " + JSON.stringify({ meals: plan.meals }) + "\n\nFeedback: \"" + feedback + "\"\n\nReturn updated plan as {\"meals\":[...]}. No ingredients or steps. Keep unchanged meals." }],
        "You are a helpful meal planner. Respond ONLY with valid JSON. No markdown, no backticks, no preamble."
      );
      if (!raw) throw new Error("Empty response.");
      const meals = getMeals(parseJSON(raw));
      if (!meals) throw new Error("Response missing meals array.");
      const newSet = {};
      meals.forEach(function(m) { newSet[m.name.toLowerCase()] = true; });
      const skipped = (plan.meals || []).filter(function(m) { return !newSet[m.name.toLowerCase()]; });
      if (skipped.length > 0) {
        update(function(d) {
          return Object.assign({}, d, {
            mealHistory: (d.mealHistory || []).concat(skipped.map(function(m) {
              return { name: m.name, source: m.source || "", signal: "skip", at: Date.now() };
            }))
          });
        });
      }
      setGeneratedPlan({ meals: meals });
      update(function(d) { return Object.assign({}, d, { lastGenerated: { meals: meals, generatedAt: Date.now() } }); });
      setFeedback("");
    } catch(e) { setError("Feedback error: " + (e.message || "Something went wrong.")); }
    setFeedbackLoading(false);
  }
  async function confirmPlan() {
    if (!plan || confirmingPlan) return;
    setConfirmingPlan(true);
    const planWithDate = Object.assign({}, plan, { confirmedAt: Date.now() });
    const usedFridge = {};
    (plan.meals || []).forEach(function(m) { (m.usesFridgeItems || []).forEach(function(x) { usedFridge[x.toLowerCase()] = true; }); });
    const saveSignals = (plan.meals || []).map(function(m) { return { name: m.name, source: m.source || "", signal: "save", at: Date.now() }; });
    update(function(d) {
      return Object.assign({}, d, {
        currentWeek: planWithDate,
        weeklyPlans: (d.weeklyPlans || []).slice(-3).concat([planWithDate]),
        lastGenerated: null,
        mealHistory: (d.mealHistory || []).concat(saveSignals),
        fridgeItems: (d.fridgeItems || []).filter(function(fi) { return !usedFridge[fi.text.toLowerCase()]; }),
      });
    });
    setGeneratedPlan(null);
    showToast("Plan confirmed!");
    setConfirmingPlan(false);
    setTimeout(function() { update(function(d) { triggerProfileUpdate(d); return d; }); }, 500);
  }
  async function triggerProfileUpdate(freshData) {
    const hist = freshData.mealHistory || [];
    if (hist.length < 3) return;
    const saved = hist.filter(function(h) { return h.signal === "save"; }).map(function(h) { return h.name; }).join(", ");
    const skipped = hist.filter(function(h) { return h.signal === "skip"; }).map(function(h) { return h.name; }).join(", ") || "none";
    const favs = (freshData.recipes || []).map(function(r) { return r.name; }).join(", ") || "none";
    try {
      const raw = await callClaude(
        [{ role: "user", content: "Generate 4-6 short taste profile insights.\nConfirmed: " + saved + "\nSkipped: " + skipped + "\nFavorites: " + favs + "\nReturn JSON: {\"insights\":[{\"id\":1,\"text\":\"Short insight\"}]}\nMax 12 words each, specific and actionable." }],
        "You are a culinary assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      update(function(d) {
        return Object.assign({}, d, { tasteProfile: (parsed.insights || []).map(function(ins, i) { return { id: Date.now() + i, text: ins.text }; }) });
      });
    } catch(e) {}
  }
  function addToFavorites(meal, details) {
    if (data.recipes.some(function(r) { return r.name.toLowerCase() === meal.name.toLowerCase(); })) {
      showToast(meal.name + " is already in your favorites.", "error"); return;
    }
    update(function(d) { return Object.assign({}, d, { recipes: d.recipes.concat([Object.assign({ id: Date.now() }, meal, details || {})]) }); });
    showToast(meal.name + " saved to favorites!");
  }
  return (
    <div>
      <PageHeader
        logo={<AppLogo />}
        subtitle={plan && plan.meals ? plan.meals.length + " meals this week" : "What's for dinner?"}
      />
      <div style={{ padding: "0 1.25rem" }}>
        {showCriteria && (
          <Card style={{ marginBottom: "1.5rem", background: C.surfaceAlt }}>
            <SectionLabel>Meals</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
              {[["Total dinners","totalDinners",7],["Cooking nights","cookingNights",criteria.totalDinners],["New recipes","newMeals",criteria.cookingNights]].map(function(a) {
                return (
                  <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                    {a[0]}
                    <input type="number" min={a[1]==="newMeals"?0:1} max={a[2]} value={criteria[a[1]]} onChange={function(e) { setC(a[1], parseInt(e.target.value)||0); }} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })} />
                  </label>
                );
              })}
            </div>
            {!data.recipes.length && criteria.cookingNights > criteria.newMeals && (
              <p style={{ fontSize: 12, color: C.infoNeutralText, fontFamily: FONT, margin: "0 0 8px", background: C.infoNeutralBg, borderRadius: 8, padding: "7px 10px", fontWeight: 400 }}>
                {"No saved favorites yet -- all " + criteria.cookingNights + " meals will be new suggestions."}
              </p>
            )}
            {criteria.totalDinners > criteria.cookingNights && (
              <p style={{ fontSize: 12, color: C.infoAmberText, fontFamily: FONT, margin: "0 0 8px", background: C.infoAmberBg, borderRadius: 8, padding: "7px 10px", fontWeight: 400 }}>
                {(criteria.totalDinners - criteria.cookingNights) + " leftover night" + (criteria.totalDinners - criteria.cookingNights > 1 ? "s" : "") + " built in"}
              </p>
            )}
            <Divider />
            <SectionLabel>Dietary</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
              {[["Meat meals (at least)","meatMeals"],["Vegetarian (at least)","vegMeals"]].map(function(a) {
                return (
                  <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                    {a[0]}
                    <select value={criteria[a[1]]} onChange={function(e) { setC(a[1], e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value)); }} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })}>
                      {numOpt(criteria.cookingNights).map(function(v) { return <option key={v} value={v}>{v===UNSPECIFIED?"No preference":v}</option>; })}
                    </select>
                  </label>
                );
              })}
            </div>
            <Divider />
            <SectionLabel>Cooking style</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["quickMeals","<=30 min","Quick"],["mediumMeals","45-60 min","Medium"],["involvedMeals","1-2 hrs","Involved"]].map(function(a) {
                const active = criteria[a[0]] !== UNSPECIFIED;
                return (
                  <div key={a[0]} style={{ background: active ? C.primaryLight : C.surface, border: "1.5px solid " + (active ? C.primaryMid : C.border), borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>{a[2]}</p>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{a[1]}</p>
                    <select value={criteria[a[0]]} onChange={function(e) { setC(a[0], e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value)); }} style={Object.assign({}, INPUT_STYLE, { fontSize: 13, padding: "6px 4px" })}>
                      {numOpt(criteria.cookingNights).map(function(v) { return <option key={v} value={v}>{v===UNSPECIFIED?"Any":">= "+v}</option>; })}
                    </select>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500, flex: 1 }}>One-pot / sheet-pan (at least)</span>
              <select value={criteria.easyCleanup} onChange={function(e) { setC("easyCleanup", e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value)); }} style={Object.assign({}, INPUT_STYLE, { width: 150, flexShrink: 0 })}>
                {numOpt(criteria.cookingNights).map(function(v) { return <option key={v} value={v}>{v===UNSPECIFIED?"No preference":v}</option>; })}
              </select>
            </div>
            <Divider />
            <button onClick={function() { setShowFridge(!showFridge); }} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, marginBottom: showFridge ? 10 : 0 }}>
              <SectionLabel style={{ margin: 0 }}>What's in the fridge?</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(data.fridgeItems||[]).length > 0 && <span style={{ fontSize: 11, color: C.primary, fontFamily: FONT, fontWeight: 700 }}>{(data.fridgeItems||[]).length + " items"}</span>}
                <span style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700 }}>{showFridge?"▲":"▼"}</span>
              </div>
            </button>
            {showFridge && (
              <div style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: C.textTertiary, margin: "0 0 10px", fontFamily: FONT, lineHeight: 1.5, fontWeight: 400 }}>Items here get factored into suggestions. Claude will mark which meals use them up.</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={newFridgeItem} onChange={function(e) { setNewFridgeItem(e.target.value); }} onKeyDown={function(e) { if (e.key==="Enter") addFridgeItem(); }} placeholder="e.g. rotisserie chicken, leftover rice..." style={Object.assign({}, INPUT_STYLE, { flex: 1 })} />
                  <Btn small onClick={addFridgeItem}>Add</Btn>
                </div>
                {(data.fridgeItems||[]).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(data.fridgeItems||[]).map(function(fi) {
                      return (
                        <div key={fi.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, border: "1px solid " + C.border, borderRadius: 99, padding: "4px 12px" }}>
                          <span style={{ fontSize: 13, color: C.text, fontFamily: FONT, fontWeight: 400 }}>{fi.text}</span>
                          <button onClick={function() { removeFridgeItem(fi.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTertiary, padding: 0, lineHeight: 1 }}>x</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <Divider />
            <SectionLabel>Other</SectionLabel>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.textSecondary, marginBottom: 14, cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>
              <input type="checkbox" checked={criteria.babyFriendly} onChange={function(e) { setC("babyFriendly", e.target.checked); }} style={{ width: 18, height: 18, accentColor: C.primary, cursor: "pointer" }} />
              Include baby-friendly adaptation tips
            </label>
            <label style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500, display: "block" }}>
              Notes and requests
              <textarea value={criteria.notes} onChange={function(e) { setC("notes", e.target.value); }} placeholder="e.g. something quick on Wednesday, avoid shellfish..." rows={2} style={Object.assign({}, INPUT_STYLE, { marginTop: 5, resize: "vertical", lineHeight: 1.6 })} />
            </label>
            <ErrorBanner message={error} />
            <div style={{ marginTop: 14 }}>
              <Btn fullWidth onClick={generatePlan} disabled={loading} variant="primary">
                {loading ? "Generating your plan..." : "Generate meal plan"}
              </Btn>
            </div>
          </Card>
        )}
        {plan && plan.meals && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
              {plan.meals.map(function(meal, i) {
                return (
                  <div key={i}>
                    <MealCard
                      meal={meal}
                      showFavorite={!!meal.isNew}
                      showBabyNote={criteria.babyFriendly}
                      onAddFavorite={function(d) { addToFavorites(meal, d); }}
                      alreadySaved={data.recipes.some(function(r) { return r.name.toLowerCase() === meal.name.toLowerCase(); })}
                    />
                    {meal.usesFridgeItems && meal.usesFridgeItems.length > 0 && (
                      <p style={{ fontSize: 12, color: C.secondary, fontFamily: FONT, margin: "5px 4px 0", fontWeight: 600 }}>{"✓ Uses: " + meal.usesFridgeItems.join(", ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {generatedPlan && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <textarea value={feedback} onChange={function(e) { setFeedback(e.target.value); }} placeholder="Feedback? e.g. swap one for something vegetarian..." rows={2} style={Object.assign({}, INPUT_STYLE, { flex: 1, resize: "vertical" })} />
                  <Btn onClick={applyFeedback} disabled={feedbackLoading||!feedback.trim()} variant="soft" small>{feedbackLoading?"...":"Revise"}</Btn>
                </div>
                <ErrorBanner message={error} />
                <div style={{ marginTop: error ? 10 : 0 }}>
                  <Btn fullWidth onClick={confirmPlan} disabled={confirmingPlan} variant="primary">
                    {confirmingPlan ? "Confirming..." : "Confirm this plan"}
                  </Btn>
                </div>
              </div>
            )}
            {!generatedPlan && data.currentWeek && (
              <p style={{ fontSize: 13, color: C.textTertiary, textAlign: "center", marginBottom: "1.5rem", fontFamily: FONT, fontWeight: 400 }}>
                Plan confirmed -- <span style={{ color: C.primary, cursor: "pointer", fontWeight: 700 }} onClick={function() { setShowCriteria(true); }}>generate a new one?</span>
              </p>
            )}
          </div>
        )}
        {!plan && !showCriteria && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🍽</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: FONT, letterSpacing: "-0.03em" }}>What's for dinner?</p>
            <p style={{ fontSize: 14, color: C.textTertiary, marginBottom: 24, fontFamily: FONT, fontWeight: 400 }}>Let's plan your week.</p>
            <Btn onClick={function() { setShowCriteria(true); }} variant="primary">Get started</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── RecipesTab ───────────────────────────────────────────────────────────────
function RecipesTab(props) {
  const { data, update, showToast } = props;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLastGen, setShowLastGen] = useState(false);
  const [addMode, setAddMode] = useState("manual");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [form, setForm] = useState({ name: "", source: "", sourceUrl: "", description: "", babyNote: "", ingredients: "", steps: "" });
  const recipes = data.recipes.filter(function(r) { return r.name.toLowerCase().includes(search.toLowerCase()); });
  const pastPlans = (data.weeklyPlans || []).slice(-4).reverse();
  const lastGen = data.lastGenerated;
  function setF(k, v) { setForm(function(p) { return Object.assign({}, p, { [k]: v }); }); }
  function formatDate(ts) { if (!ts) return ""; return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  async function fetchFromUrl() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const raw = await callClaude(
        [{ role: "user", content: "URL: " + urlInput + "\nReturn JSON: {\"name\":\"\",\"source\":\"\",\"sourceUrl\":\"" + urlInput + "\",\"description\":\"\",\"babyNote\":\"\",\"ingredients\":[{\"name\":\"\",\"amount\":\"\",\"section\":\"\"}],\"steps\":[]}\nsection=produce/dairy/meat/grains/other." }],
        "You are a recipe parser. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      setForm({ name: parsed.name||"", source: parsed.source||"", sourceUrl: urlInput, description: parsed.description||"", babyNote: parsed.babyNote||"", ingredients: (parsed.ingredients||[]).map(function(i) { return (i.amount?i.amount+" ":"")+i.name; }).join("\n"), steps: (parsed.steps||[]).join("\n") });
      setAddMode("manual");
    } catch(e) { showToast("Couldn't parse that URL. Try entering manually.", "error"); }
    setUrlLoading(false);
  }
  function saveRecipe() {
    if (!form.name.trim()) { showToast("Please enter a recipe name.", "error"); return; }
    const recipe = {
      id: Date.now(), name: form.name.trim(), source: form.source.trim(),
      sourceUrl: form.sourceUrl.trim(), description: form.description.trim(), babyNote: form.babyNote.trim(),
      ingredients: form.ingredients.split("\n").map(function(s) { return s.trim(); }).filter(Boolean).map(function(s) { return { name: s, section: "other" }; }),
      steps: form.steps.split("\n").map(function(s) { return s.trim(); }).filter(Boolean),
    };
    update(function(d) { return Object.assign({}, d, { recipes: d.recipes.concat([recipe]) }); });
    setForm({ name:"",source:"",sourceUrl:"",description:"",babyNote:"",ingredients:"",steps:"" });
    setUrlInput(""); setShowAdd(false);
    showToast("Recipe saved to favorites!");
  }
  function addFromHistory(meal) {
    if (data.recipes.some(function(r) { return r.name.toLowerCase()===meal.name.toLowerCase(); })) { showToast(meal.name+" is already in your favorites.","error"); return; }
    update(function(d) { return Object.assign({}, d, { recipes: d.recipes.concat([Object.assign({ id: Date.now() }, meal)]) }); });
    showToast(meal.name + " saved to favorites!");
  }
  function removeRecipe(id) {
    update(function(d) { return Object.assign({}, d, { recipes: d.recipes.filter(function(r) { return r.id!==id; }) }); });
    showToast("Recipe removed.");
  }
  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle={data.recipes.length + " favorite" + (data.recipes.length!==1?"s":"") + " saved"}
        action={<Btn small onClick={function() { setShowAdd(!showAdd); }} variant={showAdd?"ghost":"primary"}>{showAdd?"Cancel":"+ Add recipe"}</Btn>}
      />
      <div style={{ padding: "0 1.25rem" }}>
        {showAdd && (
          <Card style={{ marginBottom: "1.5rem", background: C.surfaceAlt }}>
            <SectionLabel>New recipe</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
              {["url","manual"].map(function(m) {
                return <button key={m} onClick={function() { setAddMode(m); }} style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", border: "1.5px solid "+(addMode===m?C.primary:C.border), background: addMode===m?C.primary:"transparent", color: addMode===m?"#fff":C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{m==="url"?"From a URL":"Enter manually"}</button>;
              })}
            </div>
            {addMode === "url" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <input value={urlInput} onChange={function(e) { setUrlInput(e.target.value); }} placeholder="Paste a recipe URL..." style={Object.assign({}, INPUT_STYLE, { marginBottom: 8 })} />
                <Btn fullWidth onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()} variant="primary">{urlLoading?"Looking up...":"Look up recipe"}</Btn>
                <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 8, lineHeight: 1.6, fontFamily: FONT, fontWeight: 400 }}>Claude will use its knowledge of the recipe. Paywalled sites may need manual editing.</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Recipe name *","name","e.g. Pasta all'Amatriciana"],["Source","source","e.g. Serious Eats"],["Source URL","sourceUrl","https://..."],["Description","description","A brief description..."],["Baby-friendly tip","babyNote","e.g. Serve pasta plain, hold the salt..."]].map(function(a) {
                return <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>{a[0]}<input value={form[a[1]]} onChange={function(e) { setF(a[1], e.target.value); }} placeholder={a[2]} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })} /></label>;
              })}
              {[["Ingredients (one per line)","ingredients","2 cups flour\n1 tsp salt",4],["Steps (one per line)","steps","Bring water to boil\nCook pasta",4]].map(function(a) {
                return <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>{a[0]}<textarea value={form[a[1]]} onChange={function(e) { setF(a[1], e.target.value); }} placeholder={a[2]} rows={a[3]} style={Object.assign({}, INPUT_STYLE, { marginTop: 5, resize: "vertical", lineHeight: 1.6 })} /></label>;
              })}
              <Btn fullWidth onClick={saveRecipe} variant="primary">Save to favorites</Btn>
            </div>
          </Card>
        )}
        {!showAdd && <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search your recipes..." style={Object.assign({}, INPUT_STYLE, { marginBottom: "1.25rem" })} />}
        {recipes.length===0 && !showAdd && <p style={{ color: C.textTertiary, fontSize: 14, textAlign: "center", padding: "2rem 0", fontFamily: FONT, fontWeight: 400 }}>{data.recipes.length===0?"No favorites yet. Add your first recipe above.":"No matches."}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
          {recipes.map(function(r) {
            return (
              <div key={r.id}>
                <MealCard meal={r} showFavorite={false} showBabyNote />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <Btn small danger onClick={function() { removeRecipe(r.id); }}>Remove</Btn>
                </div>
              </div>
            );
          })}
        </div>
        {lastGen && lastGen.meals && (
          <div style={{ marginBottom: "1rem" }}>
            <CollapsibleButton label="Last generated plan" sublabel={"Generated " + formatDate(lastGen.generatedAt) + " -- not confirmed"} isOpen={showLastGen} onToggle={function() { setShowLastGen(!showLastGen); }} />
            {showLastGen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
                {lastGen.meals.map(function(meal, i) {
                  return <MealCard key={i} meal={meal} showFavorite showBabyNote onAddFavorite={function() { addFromHistory(meal); }} alreadySaved={data.recipes.some(function(r) { return r.name.toLowerCase()===meal.name.toLowerCase(); })} />;
                })}
              </div>
            )}
          </div>
        )}
        {pastPlans.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <CollapsibleButton label="Past meal plans" sublabel={pastPlans.length + " confirmed week" + (pastPlans.length!==1?"s":"")} isOpen={showHistory} onToggle={function() { setShowHistory(!showHistory); }} />
            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {pastPlans.map(function(week, wi) {
                  return (
                    <div key={wi}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, fontFamily: FONT, margin: "0 0 8px" }}>{"Week of " + formatDate(week.confirmedAt)}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(week.meals||[]).map(function(meal, mi) {
                          return <MealCard key={mi} meal={meal} showFavorite showBabyNote onAddFavorite={function() { addFromHistory(meal); }} alreadySaved={data.recipes.some(function(r) { return r.name.toLowerCase()===meal.name.toLowerCase(); })} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── GroceryTab ───────────────────────────────────────────────────────────────
function GroceryTab(props) {
  const { data, update, showToast } = props;
  const [newItem, setNewItem] = useState("");
  const [newSection, setNewSection] = useState("other");
  const [showStaples, setShowStaples] = useState(false);
  const [newStaple, setNewStaple] = useState("");
  const [newStapleSection, setNewStapleSection] = useState("other");
  const [buildingList, setBuildingList] = useState(false);
  const [buildProgress, setBuildProgress] = useState("");
  const totalItems = SECTIONS.reduce(function(n,s) { return n+(data.groceryList[s]||[]).length; }, 0);
  const checkedCount = SECTIONS.reduce(function(n,s) { return n+(data.groceryList[s]||[]).filter(function(i) { return i.checked; }).length; }, 0);
  const hasCurrentWeek = !!(data.currentWeek && data.currentWeek.meals && data.currentWeek.meals.length > 0);
  const hasMealIngredients = SECTIONS.some(function(s) { return (data.groceryList[s]||[]).some(function(i) { return i.fromMeal; }); });
  function addItem() {
    if (!newItem.trim()) return;
    update(function(d) { const gl=Object.assign({},d.groceryList); gl[newSection]=(gl[newSection]||[]).concat([{ id: Date.now(), text: newItem.trim(), checked: false, fromMeal: false }]); return Object.assign({},d,{groceryList:gl}); });
    setNewItem("");
  }
  function toggleItem(section, id) {
    update(function(d) { const gl=Object.assign({},d.groceryList); gl[section]=gl[section].map(function(i) { return i.id===id?Object.assign({},i,{checked:!i.checked}):i; }); return Object.assign({},d,{groceryList:gl}); });
  }
  function clearChecked() {
    update(function(d) { const gl={}; SECTIONS.forEach(function(s) { gl[s]=(d.groceryList[s]||[]).filter(function(i) { return !i.checked; }); }); return Object.assign({},d,{groceryList:gl}); });
    showToast("Checked items cleared.");
  }
  function clearAll() {
    update(function(d) { return Object.assign({},d,{groceryList:{produce:[],dairy:[],meat:[],grains:[],other:[]}}); });
    showToast("Grocery list cleared.");
  }
  function addStaple() {
    if (!newStaple.trim()) return;
    update(function(d) { return Object.assign({},d,{staples:(d.staples||[]).concat([{id:Date.now(),text:newStaple.trim(),section:newStapleSection}])}); });
    setNewStaple("");
  }
  function removeStaple(id) {
    update(function(d) { return Object.assign({},d,{staples:(d.staples||[]).filter(function(s) { return s.id!==id; })}); });
  }
  function addStaplesToList() {
    update(function(d) { const gl=Object.assign({},d.groceryList); (d.staples||[]).forEach(function(st) { const sec=SECTIONS.includes(st.section)?st.section:"other"; if (!(gl[sec]||[]).some(function(i) { return i.text.toLowerCase()===st.text.toLowerCase(); })) gl[sec]=(gl[sec]||[]).concat([{id:Date.now()+Math.random(),text:st.text,checked:false,fromMeal:false}]); }); return Object.assign({},d,{groceryList:gl}); });
    showToast("Staples added to your list.");
  }
  async function buildGroceryList() {
    if (!hasCurrentWeek || buildingList) return;
    setBuildingList(true); setBuildProgress("");
    const meals = data.currentWeek.meals;
    const system = "You are a recipe assistant. Respond ONLY with valid JSON. No markdown, no backticks.";
    const all = { produce:[], dairy:[], meat:[], grains:[], other:[] };
    for (let i=0; i<meals.length; i++) {
      const meal = meals[i];
      setBuildProgress("Fetching " + meal.name + " (" + (i+1) + "/" + meals.length + ")...");
      if (meal.ingredients && meal.ingredients.length > 0) {
        meal.ingredients.forEach(function(ing) { const sec=SECTIONS.includes(ing.section)?ing.section:"other"; all[sec].push({ id:Date.now()+Math.random(), text:(ing.amount?ing.amount+" ":"")+(typeof ing==="string"?ing:ing.name), checked:false, fromMeal:true }); });
        continue;
      }
      try {
        const raw = await callClaude([{ role:"user", content:"Return ingredients for: \""+meal.name+"\""+(meal.source?" from "+meal.source:"")+". JSON: {\"ingredients\":[{\"name\":\"\",\"amount\":\"\",\"section\":\"\"}]} section=produce/dairy/meat/grains/other." }], system);
        const parsed = parseJSON(raw);
        const ings = Array.isArray(parsed)?parsed:(parsed.ingredients||[]);
        ings.forEach(function(ing) { const sec=SECTIONS.includes(ing.section)?ing.section:"other"; all[sec].push({ id:Date.now()+Math.random(), text:(ing.amount?ing.amount+" ":"")+ing.name, checked:false, fromMeal:true }); });
      } catch(e) {}
    }
    const total = SECTIONS.reduce(function(n,s) { return n+all[s].length; }, 0);
    if (total > 0) {
      update(function(d) { const gl={}; SECTIONS.forEach(function(s) { gl[s]=(d.groceryList[s]||[]).filter(function(i) { return !i.fromMeal; }).concat(all[s]); }); return Object.assign({},d,{groceryList:gl}); });
      showToast("Grocery list built -- " + total + " ingredients added.");
    } else { showToast("Could not fetch ingredients. Try again.", "error"); }
    setBuildingList(false); setBuildProgress("");
  }
  return (
    <div>
      <PageHeader
        title="Grocery list"
        subtitle={totalItems>0?(totalItems-checkedCount)+" of "+totalItems+" remaining":"Empty"}
        action={<div style={{display:"flex",gap:6}}>{checkedCount>0&&<Btn small onClick={clearChecked}>Clear checked</Btn>}{totalItems>0&&<Btn small danger onClick={clearAll}>Clear all</Btn>}</div>}
      />
      <div style={{ padding: "0 1.25rem" }}>
        {hasCurrentWeek && (
          <div style={{ marginBottom: "1.25rem" }}>
            {buildingList ? (
              <div style={{ background: C.primaryLight, border: "1px solid " + C.primaryMid, borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.primaryDark, fontFamily: FONT, fontWeight: 700 }}>Building your list...</p>
                {buildProgress && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSecondary, fontFamily: FONT, fontWeight: 400 }}>{buildProgress}</p>}
              </div>
            ) : (
              <Btn fullWidth variant={hasMealIngredients?"ghost":"soft"} onClick={buildGroceryList}>
                {hasMealIngredients?"Rebuild ingredients from this week's plan":"Add ingredients from this week's plan"}
              </Btn>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={newItem} onChange={function(e) { setNewItem(e.target.value); }} onKeyDown={function(e) { if(e.key==="Enter") addItem(); }} placeholder="Add an item..." style={Object.assign({}, INPUT_STYLE, { flex: 1 })} />
          <select value={newSection} onChange={function(e) { setNewSection(e.target.value); }} style={Object.assign({}, INPUT_STYLE, { width: 110 })}>
            {SECTIONS.map(function(s) { return <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>; })}
          </select>
          <Btn onClick={addItem}>Add</Btn>
        </div>
        <button onClick={function() { setShowStaples(!showStaples); }} style={{ width:"100%",marginBottom:"1.25rem",padding:"12px 16px",borderRadius:10,border:"1px solid "+(showStaples?C.primaryMid:C.border),background:showStaples?C.primaryLight:C.surface,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontWeight:700,fontSize:13,color:C.text }}>Weekly staples</span>
          <span style={{ color:C.textTertiary,fontSize:11,fontWeight:700 }}>{(data.staples||[]).length+" saved  "+(showStaples?"▲":"▼")}</span>
        </button>
        {showStaples && (
          <Card style={{ marginBottom:"1.5rem",background:C.surfaceAlt }}>
            <p style={{ fontSize:13,color:C.textTertiary,margin:"0 0 12px",fontFamily:FONT,fontWeight:400 }}>Things you buy every week regardless of the meal plan.</p>
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              <input value={newStaple} onChange={function(e){setNewStaple(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addStaple();}} placeholder="e.g. whole milk" style={Object.assign({},INPUT_STYLE,{flex:1})} />
              <select value={newStapleSection} onChange={function(e){setNewStapleSection(e.target.value);}} style={Object.assign({},INPUT_STYLE,{width:110})}>
                {SECTIONS.map(function(s){return <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>;})}
              </select>
              <Btn small onClick={addStaple}>Add</Btn>
            </div>
            {(data.staples||[]).length > 0 && (
              <div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:14 }}>
                  {(data.staples||[]).map(function(st) {
                    return (
                      <div key={st.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,borderRadius:10,padding:"8px 12px",border:"1px solid "+C.border }}>
                        <span style={{ fontSize:13,color:C.text,fontFamily:FONT,fontWeight:400 }}>{st.text}</span>
                        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                          <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{st.section}</span>
                          <button onClick={function(){removeStaple(st.id);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.textTertiary,padding:0,lineHeight:1 }}>x</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Btn fullWidth variant="soft" onClick={addStaplesToList}>Add all staples to this week's list</Btn>
              </div>
            )}
          </Card>
        )}
        {totalItems===0 && !hasCurrentWeek && <p style={{ color:C.textTertiary,fontSize:14,textAlign:"center",paddingTop:"2.5rem",fontFamily:FONT,fontWeight:400 }}>Confirm a weekly plan, then add its ingredients here.</p>}
        {SECTIONS.map(function(section) {
          const items = data.groceryList[section] || [];
          if (!items.length) return null;
          return (
            <div key={section} style={{ marginBottom: "1.5rem" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <span style={{ fontSize:16 }}>{SECTION_ICONS[section]}</span>
                <SectionLabel style={{ margin:0 }}>{section}</SectionLabel>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                {items.map(function(item) {
                  return (
                    <div key={item.id} onClick={function(){toggleItem(section,item.id);}} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",background:item.checked?"transparent":C.surface,border:item.checked?"none":"1px solid "+C.border }}>
                      <div style={{ width:20,height:20,borderRadius:6,flexShrink:0,border:item.checked?"none":"2px solid "+C.borderMid,background:item.checked?C.primary:"none",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        {item.checked && <span style={{ fontSize:11,color:"#fff",fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:14,fontFamily:FONT,flex:1,color:item.checked?C.textTertiary:C.text,textDecoration:item.checked?"line-through":"none",fontWeight:item.checked?400:500 }}>{item.text}</span>
                      {item.fromMeal && !item.checked && <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>from plan</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab(props) {
  const { data, update, showToast } = props;
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newInsight, setNewInsight] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const saved = (data.mealHistory||[]).filter(function(h){return h.signal==="save";});
  const skipped = (data.mealHistory||[]).filter(function(h){return h.signal==="skip";});
  const profile = data.tasteProfile || [];
  function saveEdit(id) {
    update(function(d){return Object.assign({},d,{tasteProfile:(d.tasteProfile||[]).map(function(p){return p.id===id?Object.assign({},p,{text:editText}):p;})});});
    setEditingId(null); showToast("Insight updated.");
  }
  function removeInsight(id) {
    update(function(d){return Object.assign({},d,{tasteProfile:(d.tasteProfile||[]).filter(function(p){return p.id!==id;})});});
    showToast("Insight removed.");
  }
  function addInsight() {
    if (!newInsight.trim()) return;
    update(function(d){return Object.assign({},d,{tasteProfile:(d.tasteProfile||[]).concat([{id:Date.now(),text:newInsight.trim()}])});});
    setNewInsight(""); showToast("Insight added.");
  }
  async function regenerateProfile() {
    if (saved.length < 2) { showToast("Confirm a few more meal plans first.", "error"); return; }
    setRegenerating(true);
    try {
      const raw = await callClaude(
        [{ role:"user", content:"Generate 4-6 short taste profile insights.\nConfirmed: "+saved.map(function(h){return h.name;}).join(", ")+"\nSkipped: "+(skipped.map(function(h){return h.name;}).join(", ")||"none")+"\nFavorites: "+((data.recipes||[]).map(function(r){return r.name;}).join(", ")||"none")+"\nReturn JSON: {\"insights\":[{\"id\":1,\"text\":\"Short insight\"}]}\nMax 12 words each." }],
        "You are a culinary assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      update(function(d){return Object.assign({},d,{tasteProfile:(parsed.insights||[]).map(function(ins,i){return {id:Date.now()+i,text:ins.text};})});});
      showToast("Taste profile updated.");
    } catch(e) { showToast("Could not regenerate. Try again.", "error"); }
    setRegenerating(false);
  }
  return (
    <div>
      <PageHeader title="My profile" subtitle="How Feed Me learns your taste" />
      <div style={{ padding: "0 1.25rem" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.5rem" }}>
          {[["Meals confirmed",saved.length,C.secondaryLight,C.secondary],["Meals skipped",skipped.length,C.primaryLight,C.primaryDark]].map(function(a) {
            return (
              <div key={a[0]} style={{ background:a[2],borderRadius:14,padding:"16px",textAlign:"center",border:"1px solid "+C.border }}>
                <p style={{ margin:0,fontSize:32,fontWeight:700,color:a[3],fontFamily:FONT,letterSpacing:"-0.04em" }}>{a[1]}</p>
                <p style={{ margin:"4px 0 0",fontSize:12,color:a[3],fontFamily:FONT,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em" }}>{a[0]}</p>
              </div>
            );
          })}
        </div>
        <Card style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <SectionLabel style={{ margin:0 }}>Taste profile</SectionLabel>
            <Btn small onClick={regenerateProfile} disabled={regenerating} variant="soft">{regenerating?"Updating...":"Regenerate"}</Btn>
          </div>
          {profile.length === 0 ? (
            <p style={{ fontSize:13,color:C.textTertiary,fontFamily:FONT,margin:0,lineHeight:1.6,fontWeight:400 }}>
              {saved.length<3?"Confirm a few weekly plans and Feed Me will start learning your preferences.":"Tap Regenerate to build your taste profile from your history."}
            </p>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
              {profile.map(function(ins) {
                return (
                  <div key={ins.id} style={{ display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,borderRadius:10,padding:"10px 12px",border:"1px solid "+C.border }}>
                    <span style={{ fontSize:12,color:C.primary,flexShrink:0,fontWeight:700 }}>◆</span>
                    {editingId===ins.id ? (
                      <div style={{ flex:1,display:"flex",gap:8 }}>
                        <input value={editText} onChange={function(e){setEditText(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")saveEdit(ins.id);}} style={Object.assign({},INPUT_STYLE,{flex:1,padding:"6px 10px",fontSize:13})} />
                        <Btn small onClick={function(){saveEdit(ins.id);}} variant="primary">Save</Btn>
                        <Btn small onClick={function(){setEditingId(null);}}>Cancel</Btn>
                      </div>
                    ) : (
                      <div style={{ flex:1,display:"flex",alignItems:"center",gap:8 }}>
                        <p style={{ flex:1,margin:0,fontSize:13,color:C.textSecondary,fontFamily:FONT,lineHeight:1.5,fontWeight:400 }}>{ins.text}</p>
                        <button onClick={function(){setEditingId(ins.id);setEditText(ins.text);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textTertiary,padding:"0 4px",fontFamily:FONT,fontWeight:600 }}>Edit</button>
                        <button onClick={function(){removeInsight(ins.id);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textTertiary,padding:0,lineHeight:1 }}>x</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display:"flex",gap:8 }}>
            <input value={newInsight} onChange={function(e){setNewInsight(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addInsight();}} placeholder="Add your own insight..." style={Object.assign({},INPUT_STYLE,{flex:1})} />
            <Btn small onClick={addInsight} disabled={!newInsight.trim()}>Add</Btn>
          </div>
        </Card>
        {(saved.length>0||skipped.length>0) && (
          <Card>
            <SectionLabel>Recent history</SectionLabel>
            {saved.slice(-5).reverse().map(function(h,i) {
              return <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid "+C.border }}><span style={{ fontSize:12,color:C.secondary,fontWeight:700 }}>✓</span><span style={{ fontSize:13,color:C.text,fontFamily:FONT,flex:1,fontWeight:500 }}>{h.name}</span>{h.source&&<span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{h.source}</span>}</div>;
            })}
            {skipped.slice(-3).reverse().map(function(h,i) {
              return <div key={"s"+i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid "+C.border }}><span style={{ fontSize:11,color:C.textTertiary,fontWeight:700,background:C.neutralLight,padding:"2px 6px",borderRadius:4 }}>skip</span><span style={{ fontSize:13,color:C.textSecondary,fontFamily:FONT,flex:1,fontWeight:400 }}>{h.name}</span>{h.source&&<span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{h.source}</span>}</div>;
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
// ─── BottomNav ────────────────────────────────────────────────────────────────
// During migration, extract to /src/components/BottomNav.jsx
// Add "Friends" as a 5th tab per migration prompt
function BottomNav(props) {
  const { tab, setTab, onLongPress } = props;
  const icons = { planner: "📅", recipes: "📖", grocery: "🛒", profile: "👤" };
  const pressTimer = useRef(null);
  function handlePressStart() { pressTimer.current = setTimeout(function() { if (onLongPress) onLongPress(); }, 800); }
  function handlePressEnd() { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }
  return (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:C.surface,borderTop:"1px solid "+C.border,display:"flex" }}>
      {TABS.map(function(t) {
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={function(){setTab(t);}}
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            style={{ flex:1,padding:"10px 4px 12px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:active?C.primary:C.textTertiary,fontSize:11,fontWeight:active?700:500,fontFamily:FONT,letterSpacing:"0.01em",borderTop:"2px solid "+(active?C.primary:"transparent") }}
          >
            <span style={{ fontSize:18 }}>{icons[t]}</span>
            {TAB_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
// ─── Test utilities ───────────────────────────────────────────────────────────
// During migration, move to /src/tests/
function makeTestData(o) { return Object.assign({recipes:[],weeklyPlans:[],currentWeek:null,groceryList:{produce:[],dairy:[],meat:[],grains:[],other:[]},staples:[],lastGenerated:null,mealHistory:[],fridgeItems:[],tasteProfile:[]},o||{}); }
function makeTestMeal(o) { return Object.assign({name:"Test Pasta",source:"Serious Eats",isNew:true,isMeat:false,isVegetarian:true,hasLeftovers:false,leftoverDays:0,cookTime:30,difficulty:"easy",isEasyCleanup:false,description:"A test meal.",babyNote:"Serve plain.",ingredients:[{name:"pasta",amount:"12 oz",section:"grains"}],steps:["Boil water.","Cook pasta."],usesFridgeItems:[]},o||{}); }
function tParse(raw) { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
function tAssert(c,m) { if (!c) throw new Error(m||"Assertion failed"); }
function tEqual(a,b,m) { if (a!==b) throw new Error((m||"Expected equal")+" -- got "+JSON.stringify(a)+" vs "+JSON.stringify(b)); }
async function runOneTest(name,fn) { const s=Date.now(); try { await fn(); return {name:name,status:"pass",duration:Date.now()-s}; } catch(e) { return {name:name,status:"fail",error:e.message,duration:Date.now()-s}; } }
const UNIT_TESTS = [
  ["Data structure valid",function(){const d=makeTestData();tAssert(Array.isArray(d.recipes));tAssert(Array.isArray(d.mealHistory));tAssert(Array.isArray(d.fridgeItems));tAssert(Array.isArray(d.tasteProfile));SECTIONS.forEach(function(s){tAssert(Array.isArray(d.groceryList[s]));});}],
  ["Meal structure valid",function(){const m=makeTestMeal();tAssert(typeof m.name==="string");tAssert(DIFFICULTY_OPTS.includes(m.difficulty));tAssert(Array.isArray(m.usesFridgeItems));}],
  ["getMeals wrapped object",function(){const r=getMeals({meals:[{name:"Pasta"}]});tAssert(Array.isArray(r));tEqual(r[0].name,"Pasta");}],
  ["getMeals bare array",function(){const r=getMeals([{name:"Soup"}]);tAssert(Array.isArray(r));}],
  ["getMeals null for invalid",function(){tAssert(getMeals({foo:"bar"})===null);}],
  ["parseJSON clean",function(){tEqual(tParse("{\"meals\":[{\"name\":\"Pasta\"}]}").meals[0].name,"Pasta");}],
  ["parseJSON strips fences",function(){tEqual(tParse("```json\n{\"name\":\"Soup\"}\n```").name,"Soup");}],
  ["parseJSON throws on invalid",function(){let t=false;try{tParse("not json");}catch(e){t=true;}tAssert(t);}],
  ["Add recipe",function(){const d=makeTestData();const n=Object.assign({},d,{recipes:d.recipes.concat([makeTestMeal({id:1})])});tEqual(n.recipes.length,1);}],
  ["Remove recipe",function(){const d=makeTestData({recipes:[makeTestMeal({id:1}),makeTestMeal({id:2,name:"Soup"})]});const n=Object.assign({},d,{recipes:d.recipes.filter(function(r){return r.id!==1;})});tEqual(n.recipes.length,1);tEqual(n.recipes[0].name,"Soup");}],
  ["Duplicate detection",function(){const d=makeTestData({recipes:[makeTestMeal({id:1,name:"Pasta"})]});tAssert(d.recipes.some(function(r){return r.name.toLowerCase()==="pasta";}));tAssert(!d.recipes.some(function(r){return r.name.toLowerCase()==="soup";}));}],
  ["Confirm saves history",function(){const d=makeTestData();const plan={meals:[makeTestMeal()],confirmedAt:Date.now()};const n=Object.assign({},d,{currentWeek:plan,weeklyPlans:[plan],mealHistory:[{name:"Test Pasta",signal:"save",at:Date.now()}]});tEqual(n.mealHistory[0].signal,"save");}],
  ["Skip signal logged",function(){const d=makeTestData();const n=Object.assign({},d,{mealHistory:[{name:"Skipped",signal:"skip",at:Date.now()}]});tEqual(n.mealHistory[0].signal,"skip");}],
  ["Fridge add and remove",function(){const d=makeTestData();const n=Object.assign({},d,{fridgeItems:[{id:1,text:"chicken"}]});tEqual(n.fridgeItems.length,1);const n2=Object.assign({},n,{fridgeItems:n.fridgeItems.filter(function(i){return i.id!==1;})});tEqual(n2.fridgeItems.length,0);}],
  ["Used fridge cleared on confirm",function(){const d=makeTestData({fridgeItems:[{id:1,text:"leftover rice"},{id:2,text:"carrots"}]});const used={"leftover rice":true};const n=Object.assign({},d,{fridgeItems:d.fridgeItems.filter(function(fi){return !used[fi.text.toLowerCase()];})});tEqual(n.fridgeItems.length,1);tEqual(n.fridgeItems[0].text,"carrots");}],
  ["Taste profile edit",function(){const d=makeTestData({tasteProfile:[{id:1,text:"Likes Italian"}]});const n=Object.assign({},d,{tasteProfile:d.tasteProfile.map(function(p){return p.id===1?Object.assign({},p,{text:"Loves Italian"}):p;})});tEqual(n.tasteProfile[0].text,"Loves Italian");}],
  ["Taste profile remove",function(){const d=makeTestData({tasteProfile:[{id:1,text:"A"},{id:2,text:"B"}]});const n=Object.assign({},d,{tasteProfile:d.tasteProfile.filter(function(p){return p.id!==1;})});tEqual(n.tasteProfile.length,1);}],
  ["weeklyPlans capped at 4",function(){const d=makeTestData({weeklyPlans:[0,1,2,3].map(function(i){return {meals:[],confirmedAt:i};})});const np={meals:[],confirmedAt:Date.now()};const n=Object.assign({},d,{weeklyPlans:d.weeklyPlans.slice(-3).concat([np])});tEqual(n.weeklyPlans.length,4);}],
  ["Grocery toggle",function(){const item={id:1,checked:false};const t=[item].map(function(i){return Object.assign({},i,{checked:!i.checked});});tAssert(t[0].checked===true);}],
  ["Clear checked",function(){const items=[{id:1,checked:true},{id:2,checked:false}];tEqual(items.filter(function(i){return !i.checked;}).length,1);}],
  ["Section fallback",function(){tEqual(SECTIONS.includes("exotic")?"exotic":"other","other");}],
  ["Grocery rebuild keeps manual",function(){const existing=[{id:1,text:"Milk",fromMeal:false},{id:2,text:"old",fromMeal:true}];const newItems=[{id:3,text:"pasta",fromMeal:true}];const result=existing.filter(function(i){return !i.fromMeal;}).concat(newItems);tAssert(result.some(function(i){return i.text==="Milk";}));tAssert(!result.some(function(i){return i.text==="old";}));}],
];
const API_TESTS = [
  ["API reachable",async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:50,messages:[{role:"user",content:"Reply: ok"}]})});tAssert(res.ok,"HTTP "+res.status);const d=await res.json();tAssert(d.content&&d.content.length>0);}],
  ["Meal plan valid JSON",async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Return a meal plan with 2 meals. Format: {\"meals\":[{\"name\":\"\",\"source\":\"\",\"isNew\":true,\"isMeat\":true,\"isVegetarian\":false,\"cookTime\":30,\"difficulty\":\"easy\",\"description\":\"One sentence.\",\"usesFridgeItems\":[]}]}"}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const meals=getMeals(tParse(text));tAssert(meals&&meals.length>=1,"no meals");tAssert(DIFFICULTY_OPTS.includes(meals[0].difficulty),"invalid difficulty");}],
  ["Ingredients valid sections",async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Return ingredients for \"Spaghetti Carbonara\". JSON: {\"ingredients\":[{\"name\":\"\",\"amount\":\"\",\"section\":\"\"}]} section must be one of: produce,dairy,meat,grains,other."}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const parsed=tParse(text);const ings=Array.isArray(parsed)?parsed:(parsed.ingredients||[]);tAssert(ings.length>0,"no ingredients");ings.forEach(function(ing,i){tAssert(SECTIONS.includes(ing.section),"bad section at "+i+": "+ing.section);});}],
  ["Feedback preserves count",async function(){const meals=[{name:"Pasta Carbonara",isMeat:true,isVegetarian:false,cookTime:30,difficulty:"easy",description:"Classic."},{name:"Sheet Pan Chicken",isMeat:true,isVegetarian:false,cookTime:45,difficulty:"easy",description:"Easy."}];const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Plan: "+JSON.stringify({meals:meals})+"\nFeedback: make one vegetarian.\nReturn {\"meals\":[...]} same count."}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const result=getMeals(tParse(text));tAssert(result&&result.length===2,"expected 2 meals");tAssert(result.some(function(m){return m.isVegetarian===true;}),"no vegetarian meal");}],
  ["Taste profile returns insights",async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Generate 3 taste insights.\nConfirmed: Pasta, Cacio e Pepe\nSkipped: Fish Tacos\nReturn: {\"insights\":[{\"id\":1,\"text\":\"Short insight\"}]}"}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const parsed=tParse(text);tAssert(Array.isArray(parsed.insights)&&parsed.insights.length>0);}],
];
// ─── TestSuite component ──────────────────────────────────────────────────────
function TestSuite(props) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [runningName, setRunningName] = useState("");
  const [mode, setMode] = useState("unit");
  const tests = mode==="unit"?UNIT_TESTS:API_TESTS;
  const passed = results.filter(function(r){return r.status==="pass";}).length;
  const failed = results.filter(function(r){return r.status==="fail";}).length;
  async function runAll() {
    setRunning(true); setResults([]);
    const out = [];
    for (let i=0;i<tests.length;i++) { setRunningName(tests[i][0]); out.push(await runOneTest(tests[i][0],tests[i][1])); setResults(out.slice()); }
    setRunningName(""); setRunning(false);
  }
  return (
    <div style={{ fontFamily:FONT,background:C.bg,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:40 }}>
      <div style={{ padding:"1.5rem 1.25rem 0",marginBottom:"1.25rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:24,fontWeight:700,color:C.text,margin:"0 0 4px",letterSpacing:"-0.03em" }}>Test Suite</h1>
            <p style={{ fontSize:13,color:C.textTertiary,margin:0,fontWeight:400 }}>Verify core logic and API responses</p>
          </div>
          <button onClick={props.onClose} style={{ background:"none",border:"1.5px solid "+C.border,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,color:C.text,fontFamily:FONT,fontWeight:700 }}>Back to app</button>
        </div>
        <div style={{ height:1,background:C.border,marginTop:"1.25rem" }} />
      </div>
      <div style={{ padding:"0 1.25rem" }}>
        <div style={{ display:"flex",gap:8,marginBottom:"1.25rem" }}>
          {["unit","api"].map(function(m){return <button key={m} onClick={function(){setMode(m);setResults([]);}} style={{ padding:"8px 18px",borderRadius:10,cursor:"pointer",border:"1.5px solid "+(mode===m?C.primary:C.border),background:mode===m?C.primary:"transparent",color:mode===m?"#fff":C.text,fontSize:13,fontWeight:700,fontFamily:FONT }}>{m==="unit"?"Unit tests":"API tests"}</button>;})}
          <button onClick={runAll} disabled={running} style={{ marginLeft:"auto",padding:"8px 20px",borderRadius:10,background:running?C.textTertiary:C.text,color:"#fff",border:"none",cursor:running?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:FONT }}>{running?"Running...":"Run all"}</button>
        </div>
        {mode==="api"&&<div style={{ background:C.warningLight,border:"1px solid #FDE68A",borderRadius:10,padding:"10px 14px",marginBottom:"1.25rem" }}><p style={{ margin:0,fontSize:13,color:"#92400E",fontFamily:FONT,fontWeight:400 }}><strong>Note:</strong> API tests make real Claude calls -- takes 15-30 seconds.</p></div>}
        {results.length>0&&(
          <div style={{ display:"flex",gap:12,marginBottom:"1.25rem" }}>
            {[["pass",passed,C.secondaryLight,C.secondary],["fail",failed,C.dangerLight,C.danger],["total",tests.length,C.surfaceAlt,C.textSecondary]].map(function(a){
              return <div key={a[0]} style={{ flex:1,background:a[2],borderRadius:10,padding:"12px 16px",textAlign:"center",border:"1px solid "+C.border }}><p style={{ margin:0,fontSize:24,fontWeight:700,color:a[3],letterSpacing:"-0.04em" }}>{a[1]}</p><p style={{ margin:"2px 0 0",fontSize:11,color:a[3],textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700 }}>{a[0]}</p></div>;
            })}
          </div>
        )}
        {running&&runningName&&<p style={{ fontSize:13,color:C.textTertiary,marginBottom:"1rem",fontFamily:FONT,fontWeight:400 }}>{"Running: "+runningName+"..."}</p>}
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {tests.map(function(t) {
            const result=results.find(function(r){return r.name===t[0];});
            const isRunning=running&&runningName===t[0];
            return (
              <div key={t[0]} style={{ background:C.surface,border:"1px solid "+(result?(result.status==="pass"?"#BBF7D0":C.danger):C.border),borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:10 }}>
                <span style={{ fontSize:12,marginTop:1,flexShrink:0,fontWeight:700,color:isRunning?C.primary:result?(result.status==="pass"?C.secondary:C.danger):C.textTertiary }}>{isRunning?">":result?(result.status==="pass"?"✓":"x"):"o"}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0,fontSize:13,color:C.text,fontFamily:FONT,fontWeight:500 }}>{t[0]}</p>
                  {result&&result.status==="fail"&&<p style={{ margin:"4px 0 0",fontSize:12,color:C.danger,fontFamily:"monospace" }}>{result.error}</p>}
                  {result&&<p style={{ margin:"2px 0 0",fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{result.duration+"ms"}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ─── App root ─────────────────────────────────────────────────────────────────
// During migration this becomes a thin wrapper that:
// 1. Checks auth state (useAuth hook)
// 2. Shows AuthScreen if not logged in
// 3. Loads data via useAppData hook
// 4. Renders tabs
export default function App() {
  const [tab, setTab] = useState("planner");
  const [data, setData] = useState(defaultData);
  const [showTests, setShowTests] = useState(false);
  const { toasts, showToast } = useToast();
  // NOTE: replace this with useAppData() hook after migration
  const update = useCallback(function(fn) {
    setData(function(prev) { return fn(prev); });
  }, []);
  if (showTests) {
    return <TestSuite onClose={function() { setShowTests(false); }} />;
  }
  return (
    <div style={{ fontFamily:FONT,background:C.bg,maxWidth:680,margin:"0 auto",paddingBottom:80,minHeight:"100vh" }}>
      {tab==="planner" && <PlannerTab data={data} update={update} showToast={showToast} />}
      {tab==="recipes" && <RecipesTab data={data} update={update} showToast={showToast} />}
      {tab==="grocery" && <GroceryTab data={data} update={update} showToast={showToast} />}
      {tab==="profile" && <ProfileTab data={data} update={update} showToast={showToast} />}
      <BottomNav tab={tab} setTab={setTab} onLongPress={function() { setShowTests(true); }} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
