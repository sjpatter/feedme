import { useState, useEffect } from "react";
import { callClaude, parseJSON, getMeals } from "../lib/api";
import { C, FONT, INPUT_STYLE, SERIF } from "../styles/tokens";
import { Btn, Card, SectionLabel, Divider, PageHeader, ErrorBanner, AppLogo, CollapsibleButton, Tag } from "../components/shared";
import { MealCard } from "../components/MealCard";
import { WeeklyReview } from "../components/WeeklyReview";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_KEY = (uid) => "pmd_draft_" + uid;

const AMBITION_LEVELS = [
  { max: 20,  label: "All quick",         title: "Quick meals every night — ≤30 min",   subtitle: "Fast, fuss-free cooking all week",               prompt: "All meals should be 30 minutes or less. Prioritise easy cleanup." },
  { max: 40,  label: "Mostly quick",      title: "Mostly quick with one medium meal",    subtitle: "Mostly ≤30 min, one 45-60 min meal is fine",    prompt: "Mostly quick meals (≤30 min), one medium meal (45-60 min) is fine." },
  { max: 60,  label: "Mix it up",         title: "A good mix of quick and medium",       subtitle: "Some ≤30 min, some 45-60 min meals",            prompt: "Mix of quick (≤30 min) and medium (45-60 min) meals. One involved meal (1-2 hrs) is welcome." },
  { max: 80,  label: "Feeling ambitious", title: "Mix of medium and one involved meal",  subtitle: "Mostly 45-60 min, one or two 1-2 hr cooks",     prompt: "Mostly medium meals (45-60 min), include one or two involved meals (1-2 hrs)." },
  { max: 100, label: "Go all out",        title: "Room for big cooks this week",         subtitle: "Several 1-2 hr meals — a real cooking week",    prompt: "Include several involved meals (1-2 hrs). This is a cooking week." },
];

const PROTEINS = ["Beef", "Lamb", "Pork", "Chicken", "Turkey", "Fish", "Shellfish"];
const REJECTION_REASONS = ["Wrong protein", "Too complicated", "Too simple", "Wrong cuisine", "Made it recently", "Not feeling it"];

function getAmbitionLevel(v) {
  return AMBITION_LEVELS.find((l) => v <= l.max) ?? AMBITION_LEVELS[AMBITION_LEVELS.length - 1];
}

let _idCounter = 0;
function nextId() { return "m_" + (++_idCounter) + "_" + Date.now(); }

function Stepper({ label, subtitle, value, min, max, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <div>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FONT }}>{label}</span>
        {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #E8E8E8", background: "#fff", color: "#666", fontSize: 18, lineHeight: 1, cursor: value <= min ? "not-allowed" : "pointer", padding: 0, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: value <= min ? 0.4 : 1 }}
        >−</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#111", fontFamily: FONT, minWidth: 22, textAlign: "center" }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #C0472A", background: "#FDF0EC", color: "#C0472A", fontSize: 18, lineHeight: 1, cursor: value >= max ? "not-allowed" : "pointer", padding: 0, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: value >= max ? 0.4 : 1 }}
        >+</button>
      </div>
    </div>
  );
}

// Compact meal card for the confirmed plan view
function ConfirmedMealCard({ meal, babyFriendly, onAddFavorite, alreadySaved }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ border: "1px solid #EDE8E3", borderRadius: 12, overflow: "hidden", marginBottom: 8, background: "#fff" }}>
      <div
        style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tags row */}
          {meal.isLocked && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: "#F3F4F6", color: "#6B7280", borderRadius: 20, padding: "2px 8px", fontFamily: FONT, letterSpacing: "0.04em", display: "inline-block" }}>YOUR PICK</span>
            </div>
          )}
          {!meal.isLocked && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {meal.isVegetarian && <Tag label="veggie" color="teal" />}
              {meal.isMeat && !meal.isVegetarian && <Tag label="meat" color="warning" />}
              {meal.isNew && <Tag label="new" color="primary" />}
              {meal.isEasyCleanup && <Tag label="easy cleanup" color="teal" />}
            </div>
          )}
          <p style={{ margin: "0 0 2px", fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{meal.name}</p>
          {meal.source && (
            <p style={{ margin: 0, fontSize: 11, color: "#C0472A", fontFamily: FONT, fontWeight: 600 }}>
              {meal.sourceUrl
                ? <a href={meal.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#C0472A", textDecoration: "none" }}>{meal.source} ↗</a>
                : meal.source}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: C.textTertiary, fontSize: 11, flexShrink: 0, fontFamily: FONT, fontWeight: 700 }}
        >{expanded ? "▲" : "▼"}</button>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #EDE8E3" }}>
          <MealCard
            meal={meal}
            showFavorite={!!meal.isNew}
            showBabyNote={babyFriendly}
            onAddFavorite={onAddFavorite}
            alreadySaved={alreadySaved}
          />
        </div>
      )}
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
  onNavigateToGrocery,
}) {
  const [criteria, setCriteria] = useState({
    totalDinners: 5,
    ambition: 40,
    skippedProteins: [],
    vegPreference: null, // null | "include" | "only"
    babyFriendly: true,
    notes: "",
  });

  const [step, setStep] = useState(1); // 1 = start, 2 = fill, 3 = review
  const [planningNew, setPlanningNew] = useState(false); // override confirmed view
  const [lockedMeals, setLockedMeals] = useState([]);
  const [suggestedMeals, setSuggestedMeals] = useState([]);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [showCravingInput, setShowCravingInput] = useState(false);
  const [cravingInput, setCravingInput] = useState("");
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newFridgeItem, setNewFridgeItem] = useState("");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showReviewExpanded, setShowReviewExpanded] = useState(false);

  // ── Draft persistence ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(userId));
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.version === 2) {
          if (draft.criteria) setCriteria((prev) => ({ ...prev, ...draft.criteria }));
          if (draft.lockedMeals) setLockedMeals(draft.lockedMeals);
          if (draft.suggestedMeals) setSuggestedMeals(draft.suggestedMeals);
          if (draft.step) setStep(draft.step);
        }
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (suggestedMeals.length > 0 || lockedMeals.length > 0 || step > 1) {
      localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({ version: 2, step, lockedMeals, suggestedMeals, criteria }));
    } else {
      localStorage.removeItem(DRAFT_KEY(userId));
    }
  }, [suggestedMeals, lockedMeals, step, criteria, userId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const remainingSlots = Math.max(0, criteria.totalDinners - lockedMeals.length);
  const ambitionLevel = getAmbitionLevel(criteria.ambition);
  const ambitionPct = criteria.ambition + "%";

  const allReviewed = suggestedMeals.length > 0 && suggestedMeals.every((m) => m.reviewState !== "pending");
  const rejectedCount = suggestedMeals.filter((m) => m.reviewState === "rejected").length;
  const rejectedReasonsSummary = (() => {
    const allReasons = suggestedMeals
      .filter((m) => m.reviewState === "rejected" && m.rejectionReasons.length > 0)
      .flatMap((m) => m.rejectionReasons);
    if (!allReasons.length) return null;
    return "Claude will avoid: " + [...new Set(allReasons)].map((r) => r.toLowerCase()).join(", ");
  })();

  // Show confirmed plan when: there's a confirmed week, no active draft, not explicitly planning new
  const showConfirmedPlan = !!(
    step === 1 &&
    data.currentWeek?.confirmedAt &&
    !planningNew &&
    lockedMeals.length === 0 &&
    suggestedMeals.length === 0
  );

  const showWeeklyReview = !!(
    showConfirmedPlan &&
    !data.currentWeek.reviewedAt &&
    Date.now() - data.currentWeek.confirmedAt > SEVEN_DAYS_MS
  );

  // ── Criteria helpers ────────────────────────────────────────────────────────
  function setC(k, v) { setCriteria((p) => ({ ...p, [k]: v })); }

  function setTotalDinners(v) {
    setLockedMeals((prev) => prev.slice(0, v)); // trim if locked meals exceed new total
    setCriteria((p) => ({ ...p, totalDinners: v }));
  }

  function toggleProtein(p) {
    setCriteria((prev) => ({
      ...prev,
      skippedProteins: prev.skippedProteins.includes(p)
        ? prev.skippedProteins.filter((x) => x !== p)
        : [...prev.skippedProteins, p],
    }));
  }

  function setVegPreference(val) {
    setCriteria((prev) => ({ ...prev, vegPreference: prev.vegPreference === val ? null : val }));
  }

  // ── Fridge ──────────────────────────────────────────────────────────────────
  async function handleAddFridgeItem() {
    if (!newFridgeItem.trim()) return;
    try { await addFridgeItem(newFridgeItem.trim()); setNewFridgeItem(""); }
    catch { showToast("Could not add item. Try again.", "error"); }
  }

  async function handleRemoveFridgeItem(id) {
    try { await removeFridgeItem(id); }
    catch { showToast("Could not remove item.", "error"); }
  }

  // ── Locked meals ────────────────────────────────────────────────────────────
  function addLockedMeal(meal) {
    if (lockedMeals.length >= criteria.totalDinners) return;
    setLockedMeals((prev) => [...prev, { ...meal, id: nextId(), isLocked: true }]);
  }

  function removeLockedMeal(id) {
    setLockedMeals((prev) => prev.filter((m) => m.id !== id));
  }

  function handleAddFavorite(recipe) {
    addLockedMeal({ name: recipe.name, source: recipe.source || "", sourceUrl: recipe.sourceUrl || "" });
    setShowFavoritePicker(false);
  }

  function handleSubmitCraving() {
    if (!cravingInput.trim()) return;
    addLockedMeal({ name: cravingInput.trim(), source: "", sourceUrl: "" });
    setCravingInput("");
    setShowCravingInput(false);
  }

  async function handleLookupUrl() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError(null);
    try {
      const raw = await callClaude(
        [{ role: "user", content: `Given this URL: ${urlInput.trim()}\nWhat is the recipe name and source (website or author name)? Return JSON: {"name":"","source":"","sourceUrl":""}` }],
        "You are a recipe assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      if (!parsed || !parsed.name) throw new Error("no name");
      addLockedMeal({ name: parsed.name, source: parsed.source || "", sourceUrl: parsed.sourceUrl || urlInput.trim() });
      setUrlInput("");
      setShowUrlInput(false);
    } catch {
      setUrlError("Couldn't read that URL — try entering the name manually");
    }
    setUrlLoading(false);
  }

  // ── Prompt builders ─────────────────────────────────────────────────────────
  function buildPrompt() {
    const allPastMeals = (data.weeklyPlans || []).reduce((a, w) => a.concat((w.meals || []).map((m) => m.name)), []).join(", ") || "none";
    const fridge = (data.fridgeItems || []).map((i) => i.text).join(", ") || "none";
    const profile = (data.tasteProfile || []).map((p) => p.text).join("; ") || "none";
    const skipped = (data.mealHistory || []).filter((h) => h.signal === "skip").slice(-10).map((h) => h.name).join(", ") || "none";
    const lockedList = lockedMeals.length > 0
      ? lockedMeals.map((m) => `- ${m.name}${m.source ? " (" + m.source + ")" : ""}`).join("\n")
      : "none";
    const vegLine = criteria.vegPreference === "only"
      ? "All suggested meals should be vegetarian.\n"
      : criteria.vegPreference === "include"
      ? "Include at least one vegetarian meal.\n"
      : "";

    return `Generate ${remainingSlots} dinner suggestion${remainingSlots !== 1 ? "s" : ""} to complete this week's meal plan.\n\n` +
      `Already locked in for this week (DO NOT suggest these or similar dishes):\n${lockedList}\n\n` +
      `Remaining slots to fill: ${remainingSlots}\n\n` +
      `Avoid repeating proteins or cuisines already represented in the locked meals above.\n` +
      `Avoid these recently confirmed meals: ${allPastMeals}\n` +
      `Previously skipped (don't suggest): ${skipped}\n` +
      `Taste profile: ${profile}\n` +
      `Fridge items to use: ${fridge}\n\n` +
      vegLine +
      (criteria.skippedProteins.length > 0 ? `Do NOT use these proteins: ${criteria.skippedProteins.join(", ")}\n` : "") +
      `Cooking pace: ${ambitionLevel.prompt}\n` +
      `Baby tips: ${criteria.babyFriendly ? "yes" : "no"}\n` +
      `Notes: ${criteria.notes || "none"}\n\n` +
      `Global cuisine variety: Draw from a wide range — Italian, Japanese, Mexican, Indian, Thai, Korean, Vietnamese, Mediterranean, Middle Eastern, French, American classics. Aim for variety across the week. Avoid two meals from the same cuisine.\n\n` +
      `Recipe sourcing: Prioritize iconic, celebrated versions — Kenji Lopez-Alt, Smitten Kitchen, Ottolenghi, Bon Appétit, Serious Eats, NYT Cooking, Food52, Ina Garten, The Kitchn. Vary sources. Only include sourceUrl if confident it's correct.\n\n` +
      `Return ONLY JSON: {"meals":[{"name":"","source":"","sourceUrl":"","isNew":true,"isMeat":true,"isVegetarian":false,"hasLeftovers":false,"leftoverDays":0,"cookTime":30,"difficulty":"easy","isEasyCleanup":false,"description":"One sentence.","babyNote":"One tip.","usesFridgeItems":[]}]}\ndifficulty=easy/intermediate/advanced. ${remainingSlots} meals only.`;
  }

  function buildRegeneratePrompt(rejectedMeals) {
    const acceptedNames = suggestedMeals.filter((m) => m.reviewState === "accepted").map((m) => m.name);
    const alreadyInPlan = [...lockedMeals.map((m) => m.name), ...acceptedNames];
    const rejectedSummary = rejectedMeals.map((m) => {
      const reasons = m.rejectionReasons && m.rejectionReasons.length > 0 ? " — Reasons: " + m.rejectionReasons.join(", ") : "";
      return `- ${m.name}${reasons}`;
    }).join("\n");
    const allPastMeals = (data.weeklyPlans || []).reduce((a, w) => a.concat((w.meals || []).map((m) => m.name)), []).join(", ") || "none";
    const fridge = (data.fridgeItems || []).map((i) => i.text).join(", ") || "none";
    const profile = (data.tasteProfile || []).map((p) => p.text).join("; ") || "none";
    const vegLine = criteria.vegPreference === "only"
      ? "All suggested meals should be vegetarian.\n"
      : criteria.vegPreference === "include"
      ? "Include at least one vegetarian meal.\n"
      : "";
    const n = rejectedMeals.length;

    return `Replace ${n} meal${n !== 1 ? "s" : ""} in this week's plan.\n\n` +
      `Already in the plan — DO NOT suggest any of these or similar:\n${alreadyInPlan.map((name) => "- " + name).join("\n") || "none"}\n\n` +
      `Meals to replace:\n${rejectedSummary}\n\n` +
      `Take the rejection reasons seriously when choosing replacements.\n` +
      `Avoid these recently confirmed meals: ${allPastMeals}\n` +
      `Taste profile: ${profile}\n` +
      `Fridge items to use: ${fridge}\n` +
      vegLine +
      (criteria.skippedProteins.length > 0 ? `Do NOT use these proteins: ${criteria.skippedProteins.join(", ")}\n` : "") +
      `Cooking pace: ${ambitionLevel.prompt}\n` +
      `Baby tips: ${criteria.babyFriendly ? "yes" : "no"}\n` +
      `Notes: ${criteria.notes || "none"}\n\n` +
      `Global cuisine variety: Draw from a wide range. Avoid two meals from the same cuisine.\n\n` +
      `Recipe sourcing: Prioritize iconic, celebrated versions. Vary sources.\n\n` +
      `Return ONLY JSON: {"meals":[{"name":"","source":"","sourceUrl":"","isNew":true,"isMeat":true,"isVegetarian":false,"hasLeftovers":false,"leftoverDays":0,"cookTime":30,"difficulty":"easy","isEasyCleanup":false,"description":"One sentence.","babyNote":"One tip.","usesFridgeItems":[]}]}\n${n} meals only.`;
  }

  // ── Plan actions ─────────────────────────────────────────────────────────────
  async function generateSuggestions() {
    if (data.currentWeek && data.currentWeek.confirmedAt && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true); return;
    }
    setShowOverwriteConfirm(false);
    setLoading(true); setError(null);
    try {
      const raw = await callClaude(
        [{ role: "user", content: buildPrompt() }],
        "You are a helpful meal planner. Respond ONLY with valid JSON. No markdown, no backticks, no preamble."
      );
      if (!raw) throw new Error("Empty response from API.");
      const meals = getMeals(parseJSON(raw));
      if (!meals) throw new Error("Response missing meals array.");
      setSuggestedMeals(meals.map((m) => ({ ...m, id: nextId(), reviewState: "pending", rejectionReasons: [] })));
      setLastGenerated({ meals, generatedAt: Date.now() });
      setStep(3);
    } catch (e) { setError(e.message || "Something went wrong. Try again."); }
    setLoading(false);
  }

  function handleContinueToStep2() {
    if (remainingSlots === 0) {
      setSuggestedMeals([]);
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleAccept(id) {
    setSuggestedMeals((prev) => prev.map((m) => m.id === id ? { ...m, reviewState: "accepted" } : m));
  }

  function handleReject(id) {
    setSuggestedMeals((prev) => prev.map((m) => m.id === id ? { ...m, reviewState: "rejected" } : m));
  }

  function handleUndoReview(id) {
    setSuggestedMeals((prev) => prev.map((m) => m.id === id ? { ...m, reviewState: "pending", rejectionReasons: [] } : m));
  }

  function toggleRejectionReason(id, reason) {
    setSuggestedMeals((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const reasons = m.rejectionReasons.includes(reason)
        ? m.rejectionReasons.filter((r) => r !== reason)
        : [...m.rejectionReasons, reason];
      return { ...m, rejectionReasons: reasons };
    }));
  }

  async function handleRegenerate() {
    const rejected = suggestedMeals.filter((m) => m.reviewState === "rejected");
    if (!rejected.length) return;
    setLoading(true); setError(null);
    try {
      const raw = await callClaude(
        [{ role: "user", content: buildRegeneratePrompt(rejected) }],
        "You are a helpful meal planner. Respond ONLY with valid JSON. No markdown, no backticks, no preamble."
      );
      if (!raw) throw new Error("Empty response from API.");
      const meals = getMeals(parseJSON(raw));
      if (!meals) throw new Error("Response missing meals array.");
      let replaceIdx = 0;
      setSuggestedMeals((prev) => prev.map((m) => {
        if (m.reviewState !== "rejected") return m;
        const replacement = meals[replaceIdx++];
        if (!replacement) return m;
        return { ...replacement, id: nextId(), reviewState: "pending", rejectionReasons: [] };
      }));
    } catch (e) { setError(e.message || "Something went wrong. Try again."); }
    setLoading(false);
  }

  async function handleConfirmPlan() {
    if (confirmLoading) return;
    const acceptedMeals = suggestedMeals.filter((m) => m.reviewState === "accepted");
    const planMeals = [...lockedMeals, ...acceptedMeals];
    if (!planMeals.length) return;
    setConfirmLoading(true);
    try {
      await confirmPlan({ meals: planMeals });
      setLockedMeals([]);
      setSuggestedMeals([]);
      setPlanningNew(false);
      setStep(1);
      localStorage.removeItem(DRAFT_KEY(userId));
      showToast("Plan confirmed!");
    } catch { showToast("Could not confirm plan. Try again.", "error"); }
    setConfirmLoading(false);
  }

  function handlePlanNewWeek() {
    setLockedMeals([]);
    setSuggestedMeals([]);
    setStep(1);
    setPlanningNew(true);
    setError(null);
  }

  async function handleAddToFavorites(meal, details) {
    if (data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())) {
      showToast(meal.name + " is already in your favorites.", "error"); return;
    }
    try { await addRecipe(Object.assign({}, meal, details || {})); showToast(meal.name + " saved to favorites!"); }
    catch { showToast("Could not save recipe.", "error"); }
  }

  async function handleDismissReview() {
    try { await markPlanReviewed(data.currentWeek.id); }
    catch { /* non-critical */ }
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const primaryBtn = {
    width: "100%", background: "#C0472A", color: "#fff", border: "none",
    borderRadius: 14, padding: "14px 20px", fontSize: 16, fontWeight: 700,
    fontFamily: FONT, cursor: "pointer", letterSpacing: "-0.01em", boxSizing: "border-box",
  };
  const backLink = {
    background: "none", border: "none", cursor: "pointer", fontSize: 13,
    color: C.primary, fontFamily: FONT, fontWeight: 600,
    padding: "0 0 12px", display: "flex", alignItems: "center", gap: 4,
  };

  // ── Veg preference chip style helper ─────────────────────────────────────────
  function vegChipStyle(val) {
    const active = criteria.vegPreference === val;
    return {
      padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: FONT,
      fontWeight: active ? 700 : 500,
      background: active ? "#E1F5EE" : "#fff",
      border: active ? "1.5px solid #0D9488" : "1.5px solid #E8E8E8",
      color: active ? "#0D9488" : "#666",
      display: "flex", alignItems: "center", gap: 5,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        .ambition-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; background: transparent; cursor: pointer; }
        .ambition-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: #EDE8E3; }
        .ambition-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #C0472A; margin-top: -8px; box-shadow: 0 2px 6px rgba(192,71,42,0.3); }
        .ambition-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #C0472A; border: none; box-shadow: 0 2px 6px rgba(192,71,42,0.3); }
      `}</style>

      <PageHeader logo={<AppLogo />} />

      <div style={{ padding: "0 1.25rem" }}>

        {/* ── CONFIRMED PLAN VIEW ─────────────────────────────────────────── */}
        {showConfirmedPlan && (
          <div style={{ marginBottom: "1.5rem" }}>

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

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h1 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, margin: "0 0 2px", color: C.text, letterSpacing: "-0.3px" }}>This week</h1>
                <p style={{ fontSize: 11, color: "#AAA", margin: 0, fontFamily: FONT, fontWeight: 400 }}>
                  {(data.currentWeek.meals || []).length} dinner{(data.currentWeek.meals || []).length !== 1 ? "s" : ""} confirmed
                </p>
              </div>
              <button
                onClick={handlePlanNewWeek}
                style={{ background: "#FDF0EC", color: "#C0472A", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}
              >Plan new week</button>
            </div>

            {/* Meal cards */}
            {(data.currentWeek.meals || []).map((meal, i) => {
              const rows = [];
              rows.push(
                <ConfirmedMealCard
                  key={meal.id || meal.name || i}
                  meal={meal}
                  babyFriendly={criteria.babyFriendly}
                  onAddFavorite={(d) => handleAddToFavorites(meal, d)}
                  alreadySaved={data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())}
                />
              );
              if (meal.hasLeftovers && meal.leftoverDays > 0) {
                for (let d = 0; d < meal.leftoverDays; d++) {
                  rows.push(
                    <div key={`leftover-${i}-${d}`} style={{ border: "1px solid #EDE8E3", borderRadius: 12, padding: "12px 14px", marginBottom: 8, background: "#FAFAF9", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🔄</span>
                      <p style={{ margin: 0, fontSize: 13, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>Leftover night — from earlier in the week</p>
                    </div>
                  );
                }
              }
              return rows;
            })}

            {/* Grocery nudge */}
            <div style={{ background: "#E1F5EE", border: "1px solid #99F6E4", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0D9488", fontFamily: FONT }}>Ready to build your grocery list?</p>
              {onNavigateToGrocery && (
                <button
                  onClick={onNavigateToGrocery}
                  style={{ background: "#0D9488", color: "#fff", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}
                >Go →</button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: Start your week ─────────────────────────────────────── */}
        {step === 1 && !showConfirmedPlan && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: C.text, letterSpacing: "-0.5px" }}>Plan this week</h1>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, fontFamily: FONT, fontWeight: 400 }}>Start with what you know</p>
            </div>

            <Card style={{ marginBottom: 16 }}>
              <Stepper
                label="Dinners this week"
                subtitle="Including leftovers"
                value={criteria.totalDinners}
                min={1}
                max={7}
                onChange={setTotalDinners}
              />

              <Divider />

              {/* Locked meals list */}
              <p style={{ fontSize: 12, fontWeight: 600, color: "#666", margin: "0 0 10px", fontFamily: FONT }}>
                Meals you already know you want
              </p>
              {lockedMeals.map((meal) => (
                <div key={meal.id} style={{ background: "#F7F3EF", border: "1px solid #EDE8E3", borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: C.text }}>{meal.name}</p>
                    {meal.source && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#AAA", fontFamily: FONT }}>{meal.source}</p>}
                  </div>
                  <button onClick={() => removeLockedMeal(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#AAA", padding: "0 0 0 10px", lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}

              {/* Add buttons */}
              {lockedMeals.length < criteria.totalDinners && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: lockedMeals.length > 0 ? 4 : 0 }}>
                  <button
                    onClick={() => setShowFavoritePicker(true)}
                    style={{ background: C.primaryLight, color: C.primaryDark, border: "1.5px solid " + C.primaryMid, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
                  >+ From favorites</button>
                  <button
                    onClick={() => { setShowUrlInput((v) => !v); setShowCravingInput(false); setUrlError(null); }}
                    style={{ background: C.primaryLight, color: C.primaryDark, border: "1.5px solid " + C.primaryMid, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
                  >+ Paste a URL</button>
                  <button
                    onClick={() => { setShowCravingInput((v) => !v); setShowUrlInput(false); setUrlError(null); }}
                    style={{ background: "transparent", color: C.primaryDark, border: "1.5px solid #E8E8E8", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
                  >+ I'm craving...</button>
                </div>
              )}

              {/* URL input */}
              {showUrlInput && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleLookupUrl(); }}
                      placeholder="Paste recipe URL..."
                      style={Object.assign({}, INPUT_STYLE, { flex: 1 })}
                    />
                    <button
                      onClick={handleLookupUrl}
                      disabled={urlLoading || !urlInput.trim()}
                      style={{ background: "#FDF0EC", color: "#C0472A", border: "1.5px solid #E8A898", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: urlLoading || !urlInput.trim() ? "not-allowed" : "pointer", opacity: urlLoading || !urlInput.trim() ? 0.5 : 1, flexShrink: 0, whiteSpace: "nowrap" }}
                    >{urlLoading ? "..." : "Look up"}</button>
                  </div>
                  {urlError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#991B1B", fontFamily: FONT }}>{urlError}</p>}
                </div>
              )}

              {/* Craving input */}
              {showCravingInput && (
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <input
                    value={cravingInput}
                    onChange={(e) => setCravingInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitCraving(); }}
                    placeholder="What are you craving?"
                    style={Object.assign({}, INPUT_STYLE, { flex: 1 })}
                  />
                  <button
                    onClick={handleSubmitCraving}
                    disabled={!cravingInput.trim()}
                    style={{ background: "#FDF0EC", color: "#C0472A", border: "1.5px solid #E8A898", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: !cravingInput.trim() ? "not-allowed" : "pointer", opacity: !cravingInput.trim() ? 0.5 : 1, flexShrink: 0 }}
                  >Add</button>
                </div>
              )}
            </Card>

            <button onClick={handleContinueToStep2} style={primaryBtn}>
              {lockedMeals.length === criteria.totalDinners
                ? "My week is full — confirm plan →"
                : lockedMeals.length === 0
                ? "Let Claude choose everything →"
                : `Find me ${remainingSlots} more meal${remainingSlots !== 1 ? "s" : ""} →`}
            </button>
          </div>
        )}

        {/* ── STEP 2: Fill the rest ────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <button onClick={() => setStep(1)} style={backLink}>← Start your week</button>

            {/* Step header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#C0472A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>2</div>
              <div>
                <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, margin: 0, color: C.text, letterSpacing: "-0.5px" }}>Fill the rest</h1>
                <p style={{ fontSize: 12, color: "#AAA", margin: "2px 0 0", fontFamily: FONT, fontWeight: 400 }}>
                  Claude will suggest {remainingSlots} meal{remainingSlots !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Cooking ambition */}
            <Card style={{ marginBottom: 12 }}>
              <SectionLabel>Cooking ambition</SectionLabel>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: C.text, fontFamily: FONT, fontWeight: 500 }}>How ambitious are you feeling this week?</p>
              <input
                type="range" min={0} max={100}
                value={criteria.ambition}
                onChange={(e) => setC("ambition", Number(e.target.value))}
                className="ambition-slider"
                style={{ width: "100%", height: 4, border: "none", background: `linear-gradient(to right, #C0472A ${ambitionPct}, #EDE8E3 ${ambitionPct})`, borderRadius: 2, display: "block", marginBottom: 8 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                {["All quick", "Mix", "Go all out"].map((l) => (
                  <span key={l} style={{ fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 500 }}>{l}</span>
                ))}
              </div>
              <div style={{ background: "#FDF0EC", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#C0472A", fontFamily: FONT }}>{ambitionLevel.title}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#C0472A", opacity: 0.7, fontFamily: FONT, fontWeight: 400 }}>{ambitionLevel.subtitle}</p>
              </div>
            </Card>

            {/* Dietary */}
            <Card style={{ marginBottom: 12 }}>
              <SectionLabel>Dietary</SectionLabel>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>Skip these proteins</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {PROTEINS.map((p) => {
                  const active = criteria.skippedProteins.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggleProtein(p)}
                      style={{ padding: "6px 14px", borderRadius: 20, border: active ? "1.5px solid #C0472A" : "1.5px solid #E8E8E8", background: active ? "#FDF0EC" : "#fff", color: active ? "#C0472A" : "#666", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      {active && <span style={{ fontSize: 11, fontWeight: 700 }}>✕</span>}
                      {p}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>Vegetarian preference</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setVegPreference("include")} style={vegChipStyle("include")}>
                  {criteria.vegPreference === "include" && <span style={{ fontSize: 11 }}>✓</span>}
                  Include a veggie meal
                </button>
                <button onClick={() => setVegPreference("only")} style={vegChipStyle("only")}>
                  {criteria.vegPreference === "only" && <span style={{ fontSize: 11 }}>✓</span>}
                  Veggie meals only
                </button>
              </div>
            </Card>

            {/* Anything else? — fridge + baby + notes */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>Anything else?</p>
                <p style={{ margin: 0, fontSize: 11, color: "#AAA", fontFamily: FONT, fontWeight: 400 }}>All optional — but helpful</p>
              </div>

              {/* Fridge items */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: C.textTertiary, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>What's in the fridge?</p>
                {(data.fridgeItems || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {(data.fridgeItems || []).map((fi) => (
                      <div key={fi.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F7F3EF", border: "1px solid #EDE8E3", borderRadius: 20, padding: "4px 10px 4px 12px" }}>
                        <span style={{ fontSize: 13, color: C.text, fontFamily: FONT, fontWeight: 400 }}>{fi.text}</span>
                        <button onClick={() => handleRemoveFridgeItem(fi.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.textTertiary, padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newFridgeItem} onChange={(e) => setNewFridgeItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddFridgeItem(); }} placeholder="Add an ingredient..." style={Object.assign({}, INPUT_STYLE, { flex: 1 })} />
                  <button onClick={handleAddFridgeItem} style={{ background: "#FDF0EC", color: "#C0472A", border: "1.5px solid #E8A898", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>Add</button>
                </div>
              </div>

              <Divider />

              {/* Baby-friendly */}
              <div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={criteria.babyFriendly} onChange={(e) => setC("babyFriendly", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.primary, cursor: "pointer", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: C.text, fontFamily: FONT, fontWeight: 600 }}>Baby-friendly tips</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#AAA", fontFamily: FONT, fontWeight: 400 }}>Adaptations for little ones</p>
                  </div>
                </label>
              </div>

              <Divider />

              {/* Free-text notes */}
              <div>
                <textarea
                  value={criteria.notes}
                  onChange={(e) => setC("notes", e.target.value)}
                  placeholder="Special requests, constraints, cravings..."
                  rows={2}
                  style={Object.assign({}, INPUT_STYLE, { resize: "vertical", lineHeight: 1.6 })}
                />
              </div>
            </Card>

            {showOverwriteConfirm && (
              <div style={{ marginBottom: 14, background: C.warningLight, border: "1px solid #FCD34D", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: C.infoAmberText, fontFamily: FONT, fontWeight: 500, lineHeight: 1.5 }}>
                  You already have a confirmed plan. A new plan will be saved as a draft — you'll still need to confirm it to replace the current one.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={generateSuggestions} variant="primary">Generate anyway</Btn>
                  <Btn small onClick={() => setShowOverwriteConfirm(false)}>Cancel</Btn>
                </div>
              </div>
            )}

            <ErrorBanner message={error} />

            {!showOverwriteConfirm && (
              <button
                onClick={generateSuggestions}
                disabled={loading}
                style={Object.assign({}, primaryBtn, { opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: error ? 10 : 0 })}
              >
                {loading ? "Generating suggestions..." : `Suggest ${remainingSlots} meal${remainingSlots !== 1 ? "s" : ""} →`}
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: Review ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ marginBottom: "1.5rem" }}>
            {suggestedMeals.length > 0 && (
              <button onClick={() => setStep(2)} style={backLink}>← Adjust criteria</button>
            )}
            {suggestedMeals.length === 0 && (
              <button onClick={() => setStep(1)} style={backLink}>← Edit plan</button>
            )}

            <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, margin: "0 0 16px", color: C.text, letterSpacing: "-0.5px" }}>Your week</h1>

            {/* Locked meals */}
            {lockedMeals.map((meal) => (
              <div key={meal.id} style={{ background: "#F7F3EF", border: "1px solid #EDE8E3", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#F3F4F6", color: "#6B7280", borderRadius: 20, padding: "2px 8px", fontFamily: FONT, letterSpacing: "0.04em", display: "inline-block", marginBottom: 8 }}>YOUR PICK</span>
                <p style={{ margin: "0 0 3px", fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.text }}>{meal.name}</p>
                {meal.source && (
                  <p style={{ margin: 0, fontSize: 11, color: "#AAA", fontFamily: FONT }}>
                    {meal.sourceUrl
                      ? <a href={meal.sourceUrl} target="_blank" rel="noreferrer" style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>{meal.source} ↗</a>
                      : meal.source}
                  </p>
                )}
              </div>
            ))}

            {/* Suggested meals with accept/reject */}
            {suggestedMeals.map((meal) => {
              const isPending = meal.reviewState === "pending";
              const isAccepted = meal.reviewState === "accepted";
              const isRejected = meal.reviewState === "rejected";
              return (
                <div key={meal.id} style={{ marginBottom: 10, borderRadius: 16, overflow: "hidden", boxShadow: isAccepted ? "0 0 0 1.5px #0D9488, 0 4px 20px rgba(13,148,136,0.08)" : isRejected ? "0 0 0 1.5px #EF4444" : "0 4px 20px rgba(168,67,42,0.08)" }}>
                  <MealCard
                    meal={meal}
                    showFavorite={!!meal.isNew}
                    showBabyNote={criteria.babyFriendly}
                    onAddFavorite={(d) => handleAddToFavorites(meal, d)}
                    alreadySaved={data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())}
                  />
                  {meal.usesFridgeItems && meal.usesFridgeItems.length > 0 && (
                    <div style={{ padding: "0 18px 10px", background: "#fff" }}>
                      <p style={{ fontSize: 12, color: C.secondary, fontFamily: FONT, margin: 0, fontWeight: 600 }}>{"✓ Uses: " + meal.usesFridgeItems.join(", ")}</p>
                    </div>
                  )}

                  {/* Pending footer */}
                  {isPending && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "10px 14px", display: "flex", gap: 8, background: "#fff" }}>
                      <button onClick={() => handleAccept(meal.id)} style={{ flex: 1, background: "#F0FDF9", border: "1.5px solid #99F6E4", color: "#0D9488", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>✓ Keep</button>
                      <button onClick={() => handleReject(meal.id)} style={{ flex: 1, background: "#FEF2F2", border: "1.5px solid #FCA5A5", color: "#EF4444", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>✕ Swap</button>
                    </div>
                  )}

                  {/* Accepted footer */}
                  {isAccepted && (
                    <div style={{ borderTop: "1px solid #E1F5EE", padding: "10px 14px", background: "#F0FDF9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0D9488", fontFamily: FONT }}>✓ Keeping this one</span>
                      <button onClick={() => handleUndoReview(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#AAA", fontFamily: FONT, fontWeight: 600, padding: 0 }}>Undo</button>
                    </div>
                  )}

                  {/* Rejected footer */}
                  {isRejected && (
                    <div style={{ borderTop: "1px solid #FEE2E2", padding: "12px 14px", background: "#FEF2F2" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#991B1B", fontFamily: FONT }}>Why not? (optional)</p>
                        <button onClick={() => handleUndoReview(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#AAA", fontFamily: FONT, fontWeight: 600, padding: 0 }}>Undo</button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {REJECTION_REASONS.map((reason) => {
                          const sel = meal.rejectionReasons.includes(reason);
                          return (
                            <button
                              key={reason}
                              onClick={() => toggleRejectionReason(meal.id, reason)}
                              style={{ background: sel ? "#FEE2E2" : "#fff", border: sel ? "1.5px solid #EF4444" : "1.5px solid #FCA5A5", color: sel ? "#EF4444" : "#991B1B", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
                            >{reason}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <ErrorBanner message={error} />

            {/* CTA banner — once all suggestions reviewed */}
            {allReviewed && (
              <div style={{ marginTop: 16 }}>
                {rejectedCount > 0 ? (
                  <div style={{ background: "#FDF0EC", border: "1px solid #E8A898", borderRadius: 14, padding: "14px 16px" }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#C0472A", fontFamily: FONT }}>
                      {rejectedCount} meal{rejectedCount !== 1 ? "s" : ""} to swap
                    </p>
                    {rejectedReasonsSummary && (
                      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#AAA", fontFamily: FONT, fontWeight: 400 }}>{rejectedReasonsSummary}</p>
                    )}
                    <button
                      onClick={handleRegenerate}
                      disabled={loading}
                      style={Object.assign({}, primaryBtn, { borderRadius: 12, padding: "12px 0", fontSize: 15, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" })}
                    >
                      {loading ? "Finding replacements..." : `Regenerate ${rejectedCount} meal${rejectedCount !== 1 ? "s" : ""} →`}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmPlan}
                    disabled={confirmLoading}
                    style={Object.assign({}, primaryBtn, { opacity: confirmLoading ? 0.7 : 1, cursor: confirmLoading ? "not-allowed" : "pointer" })}
                  >
                    {confirmLoading ? "Confirming..." : "Confirm this plan →"}
                  </button>
                )}
              </div>
            )}

            {/* Locked-only confirm (no suggestions) */}
            {suggestedMeals.length === 0 && lockedMeals.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleConfirmPlan}
                  disabled={confirmLoading}
                  style={Object.assign({}, primaryBtn, { opacity: confirmLoading ? 0.7 : 1, cursor: confirmLoading ? "not-allowed" : "pointer" })}
                >
                  {confirmLoading ? "Confirming..." : "Confirm this plan →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FAVORITES PICKER MODAL ──────────────────────────────────────── */}
        {showFavoritePicker && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
            onClick={() => setShowFavoritePicker(false)}
          >
            <div
              style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxHeight: "70vh", overflowY: "auto", boxSizing: "border-box" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, fontFamily: FONT }}>Pick from favorites</p>
                <button onClick={() => setShowFavoritePicker(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#AAA", padding: 0, lineHeight: 1 }}>×</button>
              </div>
              {data.recipes.length === 0 ? (
                <p style={{ fontSize: 14, color: C.textTertiary, fontFamily: FONT, textAlign: "center", padding: "24px 0" }}>No saved favorites yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.recipes.map((recipe) => {
                    const alreadyLocked = lockedMeals.some((m) => m.name.toLowerCase() === recipe.name.toLowerCase());
                    return (
                      <button
                        key={recipe.id || recipe.name}
                        onClick={() => !alreadyLocked && handleAddFavorite(recipe)}
                        disabled={alreadyLocked}
                        style={{ background: alreadyLocked ? "#F7F3EF" : "#fff", border: "1px solid #EDE8E3", borderRadius: 12, padding: "12px 14px", textAlign: "left", cursor: alreadyLocked ? "default" : "pointer", opacity: alreadyLocked ? 0.7 : 1 }}
                      >
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT }}>{recipe.name}</p>
                        {recipe.source && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#AAA", fontFamily: FONT }}>{recipe.source}</p>}
                        {alreadyLocked && <p style={{ margin: "3px 0 0", fontSize: 11, color: C.primary, fontFamily: FONT, fontWeight: 600 }}>Already added</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
