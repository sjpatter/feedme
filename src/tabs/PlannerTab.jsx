import { useState, useEffect } from "react";
import { callClaude, parseJSON, getMeals } from "../lib/api";
import { C, FONT, INPUT_STYLE, SERIF } from "../styles/tokens";
import { Btn, Card, SectionLabel, Divider, PageHeader, ErrorBanner, AppLogo, CollapsibleButton } from "../components/shared";
import { MealCard } from "../components/MealCard";
import { WeeklyReview } from "../components/WeeklyReview";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_KEY = (uid) => "pmd_draft_" + uid;

// ── Cooking ambition levels ──────────────────────────────────────────────────
const AMBITION_LEVELS = [
  { max: 20,  label: "All quick",         title: "Quick meals every night — ≤30 min",   subtitle: "Fast, fuss-free cooking all week",                prompt: "All meals should be 30 minutes or less. Prioritise easy cleanup." },
  { max: 40,  label: "Mostly quick",      title: "Mostly quick with one medium meal",    subtitle: "Mostly ≤30 min, one 45-60 min meal is fine",     prompt: "Mostly quick meals (≤30 min), one medium meal (45-60 min) is fine." },
  { max: 60,  label: "Mix it up",         title: "A good mix of quick and medium",       subtitle: "Some ≤30 min, some 45-60 min meals",             prompt: "Mix of quick (≤30 min) and medium (45-60 min) meals. One involved meal (1-2 hrs) is welcome." },
  { max: 80,  label: "Feeling ambitious", title: "Mix of medium and one involved meal",  subtitle: "Mostly 45-60 min, one or two 1-2 hr cooks",      prompt: "Mostly medium meals (45-60 min), include one or two involved meals (1-2 hrs)." },
  { max: 100, label: "Go all out",        title: "Room for big cooks this week",         subtitle: "Several 1-2 hr meals — a real cooking week",     prompt: "Include several involved meals (1-2 hrs). This is a cooking week." },
];

const PROTEINS = ["Beef", "Lamb", "Pork", "Chicken", "Turkey", "Fish", "Shellfish"];

function getAmbitionLevel(v) {
  return AMBITION_LEVELS.find((l) => v <= l.max) ?? AMBITION_LEVELS[AMBITION_LEVELS.length - 1];
}

// ── Inline Stepper component ─────────────────────────────────────────────────
function Stepper({ label, value, min, max, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FONT }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{
            width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #E8E8E8",
            background: "#fff", color: "#666", fontSize: 18, lineHeight: 1,
            cursor: value <= min ? "not-allowed" : "pointer", padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: value <= min ? 0.4 : 1,
          }}
        >−</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#111", fontFamily: FONT, minWidth: 22, textAlign: "center" }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{
            width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #C0472A",
            background: "#FDF0EC", color: "#C0472A", fontSize: 18, lineHeight: 1,
            cursor: value >= max ? "not-allowed" : "pointer", padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: value >= max ? 0.4 : 1,
          }}
        >+</button>
      </div>
    </div>
  );
}

export function PlannerTab({
  data,
  userId,
  showToast,
  addFridgeItem,
  removeFridgeItem,
  confirmPlan,
  addMealSkips,
  setLastGenerated,
  addRecipe,
  markPlanReviewed,
}) {
  const [criteria, setCriteria] = useState({
    totalDinners: 5,
    cookingNights: 4,
    newMeals: 2,
    vegMeals: 0,
    ambition: 40,
    skippedProteins: [],
    babyFriendly: true,
    notes: "",
  });
  const [showCriteria, setShowCriteria] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFridgeItem, setNewFridgeItem] = useState("");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showReviewExpanded, setShowReviewExpanded] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(userId));
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.meals) { setGeneratedPlan(draft); setShowCriteria(false); }
      }
    } catch {}
  }, [userId]);

  // Persist draft to localStorage whenever it changes
  useEffect(() => {
    if (!userId) return;
    if (generatedPlan) {
      localStorage.setItem(DRAFT_KEY(userId), JSON.stringify(generatedPlan));
    } else {
      localStorage.removeItem(DRAFT_KEY(userId));
    }
  }, [generatedPlan, userId]);

  const plan = generatedPlan || data.currentWeek;

  const showWeeklyReview = !!(
    data.currentWeek &&
    !generatedPlan &&
    !data.currentWeek.reviewedAt &&
    data.currentWeek.confirmedAt &&
    Date.now() - data.currentWeek.confirmedAt > SEVEN_DAYS_MS
  );

  // ── Criteria helpers ────────────────────────────────────────────────────────
  function setC(k, v) { setCriteria((p) => Object.assign({}, p, { [k]: v })); }

  function setTotalDinners(v) {
    setCriteria((p) => ({ ...p, totalDinners: v, cookingNights: Math.min(p.cookingNights, v) }));
  }
  function setCookingNights(v) {
    setCriteria((p) => ({ ...p, cookingNights: v, newMeals: Math.min(p.newMeals, v), vegMeals: Math.min(p.vegMeals, v) }));
  }
  function setNewMeals(v) { setC("newMeals", v); }
  function setVegMeals(v) { setC("vegMeals", v); }

  function toggleProtein(p) {
    setCriteria((prev) => ({
      ...prev,
      skippedProteins: prev.skippedProteins.includes(p)
        ? prev.skippedProteins.filter((x) => x !== p)
        : [...prev.skippedProteins, p],
    }));
  }

  // ── Fridge ─────────────────────────────────────────────────────────────────
  async function handleAddFridgeItem() {
    if (!newFridgeItem.trim()) return;
    try { await addFridgeItem(newFridgeItem.trim()); setNewFridgeItem(""); }
    catch (e) { showToast("Could not add item. Try again.", "error"); }
  }

  async function handleRemoveFridgeItem(id) {
    try { await removeFridgeItem(id); }
    catch (e) { showToast("Could not remove item.", "error"); }
  }

  // ── Prompt builder ──────────────────────────────────────────────────────────
  function buildPrompt() {
    const hasFav = data.recipes.length > 0;
    const favNames = hasFav ? data.recipes.map((r) => r.name).join(", ") : "none";
    const fromFav = hasFav ? Math.max(0, criteria.cookingNights - criteria.newMeals) : 0;
    const newCount = hasFav ? criteria.newMeals : criteria.cookingNights;
    const allPastMeals = (data.weeklyPlans || [])
      .reduce((a, w) => a.concat((w.meals || []).map((m) => m.name)), []).join(", ") || "none";
    const fridge = (data.fridgeItems || []).map((i) => i.text).join(", ") || "none";
    const profile = (data.tasteProfile || []).map((p) => p.text).join("; ") || "none";
    const skipped = (data.mealHistory || []).filter((h) => h.signal === "skip").slice(-10).map((h) => h.name).join(", ") || "none";
    const ambitionLevel = getAmbitionLevel(criteria.ambition);

    return "Generate a weekly dinner plan.\n" +
      "Saved favorites: " + favNames + "\n" +
      "All past meals (avoid repeating recently): " + allPastMeals + "\n" +
      "Previously skipped (don't suggest): " + skipped + "\n" +
      "Taste profile: " + profile + "\n" +
      "Fridge items to use: " + fridge + "\n\n" +
      "Total dinners: " + criteria.totalDinners + "\n" +
      "Cooking nights: " + criteria.cookingNights + "\n" +
      "New recipes: " + newCount + ", from favorites: " + fromFav + (!hasFav ? " (no favorites yet)" : "") + "\n" +
      (criteria.vegMeals > 0 ? "Vegetarian meals (at least): " + criteria.vegMeals + "\n" : "") +
      (criteria.skippedProteins.length > 0 ? "Do NOT use these proteins: " + criteria.skippedProteins.join(", ") + "\n" : "") +
      "Cooking pace: " + ambitionLevel.prompt + "\n" +
      "Baby tips: " + (criteria.babyFriendly ? "yes" : "no") + "\n" +
      "Notes: " + (criteria.notes || "none") + "\n\n" +
      "Global cuisine variety: Draw from a wide range — Italian, Japanese, Mexican, Indian, Thai, Korean, Vietnamese, Mediterranean, Middle Eastern, French, American classics. Aim for variety across the week. Avoid two meals from the same cuisine.\n\n" +
      "Recipe sourcing: Prioritize iconic, celebrated versions — Kenji Lopez-Alt, Smitten Kitchen, Ottolenghi, Bon Appétit, Serious Eats, NYT Cooking, Food52, Ina Garten, The Kitchn. For each dish: who makes the most celebrated version? Vary sources. Only include sourceUrl if confident it's correct.\n\n" +
      "Return ONLY JSON overview, no ingredients or steps:\n{\"meals\":[{\"name\":\"\",\"source\":\"\",\"sourceUrl\":\"\",\"isNew\":true,\"isMeat\":true,\"isVegetarian\":false,\"hasLeftovers\":false,\"leftoverDays\":0,\"cookTime\":30,\"difficulty\":\"easy\",\"isEasyCleanup\":false,\"description\":\"One sentence.\",\"babyNote\":\"One tip.\",\"usesFridgeItems\":[]}]}\ndifficulty=easy/intermediate/advanced.";
  }

  // ── Plan actions (unchanged) ─────────────────────────────────────────────────
  async function generatePlan() {
    if (data.currentWeek && data.currentWeek.confirmedAt && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true); return;
    }
    setShowOverwriteConfirm(false);
    setLoading(true); setError(null);
    try {
      const raw = await callClaude([{ role: "user", content: buildPrompt() }], "You are a helpful meal planner. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.");
      if (!raw) throw new Error("Empty response from API.");
      const meals = getMeals(parseJSON(raw));
      if (!meals) throw new Error("Response missing meals array.");
      setGeneratedPlan({ meals });
      setLastGenerated({ meals, generatedAt: Date.now() });
      setShowCriteria(false);
    } catch (e) { setError(e.message || "Something went wrong. Try again."); }
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
      meals.forEach((m) => { newSet[m.name.toLowerCase()] = true; });
      const skippedMeals = (plan.meals || []).filter((m) => !newSet[m.name.toLowerCase()]);
      if (skippedMeals.length > 0) { try { await addMealSkips(skippedMeals); } catch (e) { /* non-critical */ } }
      setGeneratedPlan({ meals });
      setLastGenerated({ meals, generatedAt: Date.now() });
      setFeedback("");
    } catch (e) { setError("Feedback error: " + (e.message || "Something went wrong.")); }
    setFeedbackLoading(false);
  }

  async function handleConfirmPlan() {
    if (!plan || confirmingPlan) return;
    setConfirmingPlan(true);
    try { await confirmPlan(plan); setGeneratedPlan(null); showToast("Plan confirmed!"); }
    catch (e) { showToast("Could not confirm plan. Try again.", "error"); }
    setConfirmingPlan(false);
  }

  async function handleAddToFavorites(meal, details) {
    if (data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())) {
      showToast(meal.name + " is already in your favorites.", "error"); return;
    }
    try { await addRecipe(Object.assign({}, meal, details || {})); showToast(meal.name + " saved to favorites!"); }
    catch (e) { showToast("Could not save recipe.", "error"); }
  }

  async function handleDismissReview() {
    try { await markPlanReviewed(data.currentWeek.id); }
    catch (e) { /* non-critical */ }
  }

  // ── Ambition slider data ────────────────────────────────────────────────────
  const ambitionLevel = getAmbitionLevel(criteria.ambition);
  const ambitionPct = criteria.ambition + "%";

  return (
    <div>
      {/* Slider thumb styles — scoped to this component */}
      <style>{`
        .ambition-slider { -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; }
        .ambition-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #C0472A; border: none;
          box-shadow: 0 2px 6px rgba(192,71,42,0.3);
          margin-top: -8px;
        }
        .ambition-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #C0472A; border: none;
          box-shadow: 0 2px 6px rgba(192,71,42,0.3);
        }
        .ambition-slider::-moz-range-progress { height: 4px; background: #C0472A; border-radius: 2px; }
        .ambition-slider::-moz-range-track { height: 4px; background: #EDE8E3; border-radius: 2px; }
      `}</style>

      <PageHeader logo={<AppLogo />} />

      <div style={{ padding: "0 1.25rem" }}>
        {/* Weekly review banner */}
        {showWeeklyReview && (
          <div style={{ marginBottom: "1.25rem" }}>
            <CollapsibleButton
              label="Time to review this week's meals"
              sublabel="Save what you loved to your favorites"
              isOpen={showReviewExpanded}
              onToggle={() => setShowReviewExpanded(!showReviewExpanded)}
            />
            {showReviewExpanded && (
              <WeeklyReview
                plan={data.currentWeek}
                recipes={data.recipes}
                onAddRecipe={(meal) => handleAddToFavorites(meal, null)}
                onDismiss={handleDismissReview}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* Back to options link */}
        {generatedPlan && !showCriteria && (
          <button
            onClick={() => setShowCriteria(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.primary, fontFamily: FONT, fontWeight: 600, padding: "0 0 12px", display: "flex", alignItems: "center", gap: 4 }}
          >
            ← Edit options
          </button>
        )}

        {/* ── CRITERIA FORM ──────────────────────────────────────────────────── */}
        {showCriteria && (
          <div style={{ marginBottom: "1.5rem" }}>

            {/* Page heading */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: C.text, letterSpacing: "-0.5px" }}>Plan this week</h1>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, fontFamily: FONT, fontWeight: 400 }}>Tell us what you're looking for</p>
            </div>

            {/* ── MEALS ──────────────────────────────────────────────────────── */}
            <Card style={{ marginBottom: 12, background: "#FFFFFF" }}>
              <SectionLabel>Meals</SectionLabel>
              <Stepper label="Total dinners" value={criteria.totalDinners} min={1} max={7} onChange={setTotalDinners} />
              <Stepper label="Cooking nights" value={criteria.cookingNights} min={1} max={criteria.totalDinners} onChange={setCookingNights} />
              <Stepper label="New recipes" value={criteria.newMeals} min={0} max={criteria.cookingNights} onChange={setNewMeals} />

              {/* Info banners */}
              {!data.recipes.length && criteria.cookingNights > criteria.newMeals && (
                <p style={{ fontSize: 12, color: C.infoNeutralText, fontFamily: FONT, margin: "10px 0 0", background: C.infoNeutralBg, borderRadius: 8, padding: "7px 10px", fontWeight: 400 }}>
                  {"No saved favorites yet — all " + criteria.cookingNights + " meals will be new suggestions."}
                </p>
              )}
              {(criteria.totalDinners > criteria.cookingNights || (data.recipes.length > 0 && criteria.cookingNights > criteria.newMeals)) && (
                <p style={{ fontSize: 12, color: C.infoAmberText, fontFamily: FONT, margin: "8px 0 0", background: C.infoAmberBg, borderRadius: 8, padding: "7px 10px", fontWeight: 400 }}>
                  {[
                    criteria.totalDinners > criteria.cookingNights
                      ? (criteria.totalDinners - criteria.cookingNights) + " leftover night" + (criteria.totalDinners - criteria.cookingNights > 1 ? "s" : "") + " built in"
                      : null,
                    data.recipes.length > 0 && criteria.cookingNights > criteria.newMeals
                      ? (criteria.cookingNights - criteria.newMeals) + " from favorites"
                      : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
            </Card>

            {/* ── COOKING AMBITION ───────────────────────────────────────────── */}
            <Card style={{ marginBottom: 12, background: "#FFFFFF" }}>
              <SectionLabel>Cooking ambition</SectionLabel>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: C.text, fontFamily: FONT, fontWeight: 500 }}>
                How ambitious are you feeling this week?
              </p>
              {/* Slider track + input */}
              <input
                type="range"
                min={0}
                max={100}
                value={criteria.ambition}
                onChange={(e) => setC("ambition", Number(e.target.value))}
                className="ambition-slider"
                style={{
                  width: "100%", height: 4, border: "none",
                  background: `linear-gradient(to right, #C0472A ${ambitionPct}, #EDE8E3 ${ambitionPct})`,
                  borderRadius: 2, display: "block", marginBottom: 8,
                }}
              />
              {/* Scale labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                {["All quick", "Mix", "Go all out"].map((l) => (
                  <span key={l} style={{ fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 500 }}>{l}</span>
                ))}
              </div>
              {/* Live description */}
              <div style={{ background: "#FDF0EC", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#C0472A", fontFamily: FONT }}>{ambitionLevel.title}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#C0472A", opacity: 0.7, fontFamily: FONT, fontWeight: 400 }}>{ambitionLevel.subtitle}</p>
              </div>
            </Card>

            {/* ── DIETARY ────────────────────────────────────────────────────── */}
            <Card style={{ marginBottom: 12, background: "#FFFFFF" }}>
              <SectionLabel>Dietary</SectionLabel>
              <div style={{ marginBottom: 16 }}>
                <Stepper label="Vegetarian meals" value={criteria.vegMeals} min={0} max={criteria.cookingNights} onChange={setVegMeals} />
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>Skip these proteins</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PROTEINS.map((p) => {
                  const active = criteria.skippedProteins.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggleProtein(p)}
                      style={{
                        padding: "6px 14px", borderRadius: 20,
                        border: active ? "1.5px solid #C0472A" : "1.5px solid #E8E8E8",
                        background: active ? "#FDF0EC" : "#fff",
                        color: active ? "#C0472A" : "#666",
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        fontFamily: FONT, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      {active && <span style={{ fontSize: 11, fontWeight: 700 }}>✕</span>}
                      {p}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* ── FRIDGE ─────────────────────────────────────────────────────── */}
            <Card style={{ marginBottom: 12, background: "#FFFFFF" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionLabel style={{ margin: 0 }}>What's in the fridge?</SectionLabel>
                {(data.fridgeItems || []).length > 0 && (
                  <span style={{ fontSize: 12, color: C.primary, fontFamily: FONT, fontWeight: 700 }}>
                    {(data.fridgeItems || []).length + " item" + ((data.fridgeItems || []).length > 1 ? "s" : "")}
                  </span>
                )}
              </div>
              {/* Existing items as pill tags */}
              {(data.fridgeItems || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {(data.fridgeItems || []).map((fi) => (
                    <div key={fi.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F7F3EF", border: "1px solid #EDE8E3", borderRadius: 20, padding: "4px 10px 4px 12px" }}>
                      <span style={{ fontSize: 13, color: C.text, fontFamily: FONT, fontWeight: 400 }}>{fi.text}</span>
                      <button
                        onClick={() => handleRemoveFridgeItem(fi.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.textTertiary, padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add new item */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newFridgeItem}
                  onChange={(e) => setNewFridgeItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddFridgeItem(); }}
                  placeholder="Add an ingredient..."
                  style={Object.assign({}, INPUT_STYLE, { flex: 1 })}
                />
                <button
                  onClick={handleAddFridgeItem}
                  style={{
                    background: "#FDF0EC", color: "#C0472A", border: "1.5px solid #E8A898",
                    borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 700,
                    fontFamily: FONT, cursor: "pointer", flexShrink: 0,
                  }}
                >Add</button>
              </div>
            </Card>

            {/* ── OTHER ──────────────────────────────────────────────────────── */}
            <Card style={{ marginBottom: 20, background: "#FFFFFF" }}>
              <SectionLabel>Other</SectionLabel>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.textSecondary, marginBottom: 16, cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>
                <input type="checkbox" checked={criteria.babyFriendly} onChange={(e) => setC("babyFriendly", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.primary, cursor: "pointer" }} />
                Baby-friendly tips
              </label>
              <label style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500, display: "block" }}>
                Anything else?
                <textarea
                  value={criteria.notes}
                  onChange={(e) => setC("notes", e.target.value)}
                  placeholder="e.g. something quick on Wednesday, avoid shellfish..."
                  rows={2}
                  style={Object.assign({}, INPUT_STYLE, { marginTop: 8, resize: "vertical", lineHeight: 1.6 })}
                />
              </label>
            </Card>

            {/* Overwrite warning */}
            {showOverwriteConfirm && (
              <div style={{ marginBottom: 14, background: C.warningLight, border: "1px solid #FCD34D", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: C.infoAmberText, fontFamily: FONT, fontWeight: 500, lineHeight: 1.5 }}>
                  You already have a confirmed plan. A new plan will be saved as a draft — you'll still need to confirm it to replace the current one.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={generatePlan} variant="primary">Generate anyway</Btn>
                  <Btn small onClick={() => setShowOverwriteConfirm(false)}>Cancel</Btn>
                </div>
              </div>
            )}

            <ErrorBanner message={error} />

            {/* Generate button */}
            {!showOverwriteConfirm && (
              <button
                onClick={generatePlan}
                disabled={loading}
                style={{
                  width: "100%", background: loading ? "#C0472A" : "#C0472A", color: "#fff",
                  border: "none", borderRadius: 14, padding: "14px 20px",
                  fontSize: 16, fontWeight: 700, fontFamily: FONT,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1, letterSpacing: "-0.01em",
                  boxSizing: "border-box", marginTop: error ? 10 : 0,
                }}
              >
                {loading ? "Generating your plan..." : "Generate meal plan"}
              </button>
            )}
          </div>
        )}

        {/* ── PLAN DISPLAY (unchanged) ─────────────────────────────────────── */}
        {plan && plan.meals && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
              {plan.meals.map((meal, i) => (
                <div key={i}>
                  <MealCard
                    meal={meal}
                    showFavorite={!!meal.isNew}
                    showBabyNote={criteria.babyFriendly}
                    onAddFavorite={(d) => handleAddToFavorites(meal, d)}
                    alreadySaved={data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())}
                  />
                  {meal.usesFridgeItems && meal.usesFridgeItems.length > 0 && (
                    <p style={{ fontSize: 12, color: C.secondary, fontFamily: FONT, margin: "5px 4px 0", fontWeight: 600 }}>{"✓ Uses: " + meal.usesFridgeItems.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
            {generatedPlan && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback? e.g. swap one for something vegetarian..." rows={2} style={Object.assign({}, INPUT_STYLE, { flex: 1, resize: "vertical" })} />
                  <Btn onClick={applyFeedback} disabled={feedbackLoading || !feedback.trim()} variant="soft" small>{feedbackLoading ? "..." : "Revise"}</Btn>
                </div>
                <ErrorBanner message={error} />
                <div style={{ marginTop: error ? 10 : 0 }}>
                  <Btn fullWidth onClick={handleConfirmPlan} disabled={confirmingPlan} variant="primary">
                    {confirmingPlan ? "Confirming..." : "Confirm this plan"}
                  </Btn>
                </div>
              </div>
            )}
            {!generatedPlan && data.currentWeek && (
              <p style={{ fontSize: 13, color: C.textTertiary, textAlign: "center", marginBottom: "1.5rem", fontFamily: FONT, fontWeight: 400 }}>
                Plan confirmed — <span style={{ color: C.primary, cursor: "pointer", fontWeight: 700 }} onClick={() => setShowCriteria(true)}>generate a new one?</span>
              </p>
            )}
          </div>
        )}

        {!plan && !showCriteria && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🍽</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: FONT, letterSpacing: "-0.03em" }}>What's for dinner?</p>
            <p style={{ fontSize: 14, color: C.textTertiary, marginBottom: 24, fontFamily: FONT, fontWeight: 400 }}>Let's plan your week.</p>
            <Btn onClick={() => setShowCriteria(true)} variant="primary">Get started</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
