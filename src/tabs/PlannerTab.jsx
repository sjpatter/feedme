import { useState } from "react";
import { callClaude, parseJSON, getMeals } from "../lib/api";
import { UNSPECIFIED, SECTIONS } from "../lib/constants";
import { C, FONT, INPUT_STYLE } from "../styles/tokens";
import { Btn, Card, SectionLabel, Divider, PageHeader, ErrorBanner, AppLogo } from "../components/shared";
import { MealCard } from "../components/MealCard";
import { WeeklyReview } from "../components/WeeklyReview";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function PlannerTab({
  data,
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

  // Weekly review: show if current week was confirmed > 7 days ago and hasn't been reviewed
  const showWeeklyReview = !!(
    data.currentWeek &&
    !generatedPlan &&
    !data.currentWeek.reviewedAt &&
    data.currentWeek.confirmedAt &&
    Date.now() - data.currentWeek.confirmedAt > SEVEN_DAYS_MS
  );

  function setC(k, v) { setCriteria((p) => Object.assign({}, p, { [k]: v })); }
  function numOpt(max) { const o = [UNSPECIFIED]; for (let i = 0; i <= max; i++) o.push(i); return o; }

  async function handleAddFridgeItem() {
    if (!newFridgeItem.trim()) return;
    try {
      await addFridgeItem(newFridgeItem.trim());
      setNewFridgeItem("");
    } catch (e) {
      showToast("Could not add item. Try again.", "error");
    }
  }

  async function handleRemoveFridgeItem(id) {
    try { await removeFridgeItem(id); }
    catch (e) { showToast("Could not remove item.", "error"); }
  }

  function buildPrompt() {
    const hasFav = data.recipes.length > 0;
    const favNames = hasFav ? data.recipes.map((r) => r.name).join(", ") : "none";
    const fromFav = hasFav ? Math.max(0, criteria.cookingNights - criteria.newMeals) : 0;
    const newCount = hasFav ? criteria.newMeals : criteria.cookingNights;
    const recent = (data.weeklyPlans || []).slice(-2)
      .reduce((a, w) => a.concat((w.meals || []).map((m) => m.name)), []).join(", ") || "none";
    const fridge = (data.fridgeItems || []).map((i) => i.text).join(", ") || "none";
    const profile = (data.tasteProfile || []).map((p) => p.text).join("; ") || "none";
    const skipped = (data.mealHistory || []).filter((h) => h.signal === "skip").slice(-10).map((h) => h.name).join(", ") || "none";
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
      if (skippedMeals.length > 0) {
        try { await addMealSkips(skippedMeals); } catch (e) { /* non-critical */ }
      }

      setGeneratedPlan({ meals });
      setLastGenerated({ meals, generatedAt: Date.now() });
      setFeedback("");
    } catch (e) { setError("Feedback error: " + (e.message || "Something went wrong.")); }
    setFeedbackLoading(false);
  }

  async function handleConfirmPlan() {
    if (!plan || confirmingPlan) return;
    setConfirmingPlan(true);
    try {
      await confirmPlan(plan);
      setGeneratedPlan(null);
      showToast("Plan confirmed!");
    } catch (e) {
      showToast("Could not confirm plan. Try again.", "error");
    }
    setConfirmingPlan(false);
  }

  async function handleAddToFavorites(meal, details) {
    if (data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())) {
      showToast(meal.name + " is already in your favorites.", "error"); return;
    }
    try {
      await addRecipe(Object.assign({}, meal, details || {}));
      showToast(meal.name + " saved to favorites!");
    } catch (e) {
      showToast("Could not save recipe.", "error");
    }
  }

  async function handleDismissReview() {
    try { await markPlanReviewed(data.currentWeek.id); }
    catch (e) { /* non-critical */ }
  }

  return (
    <div>
      <PageHeader
        logo={<AppLogo />}
        subtitle={plan && plan.meals ? plan.meals.length + " meals this week" : "What's for dinner?"}
      />
      <div style={{ padding: "0 1.25rem" }}>
        {showWeeklyReview && (
          <WeeklyReview
            plan={data.currentWeek}
            recipes={data.recipes}
            onAddRecipe={(meal) => handleAddToFavorites(meal, null)}
            onDismiss={handleDismissReview}
            showToast={showToast}
          />
        )}

        {showCriteria && (
          <Card style={{ marginBottom: "1.5rem", background: C.surfaceAlt }}>
            <SectionLabel>Meals</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
              {[["Total dinners","totalDinners",7],["Cooking nights","cookingNights",criteria.totalDinners],["New recipes","newMeals",criteria.cookingNights]].map((a) => (
                <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                  {a[0]}
                  <input type="number" min={a[1]==="newMeals"?0:1} max={a[2]} value={criteria[a[1]]} onChange={(e) => setC(a[1], parseInt(e.target.value)||0)} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })} />
                </label>
              ))}
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
              {[["Meat meals (at least)","meatMeals"],["Vegetarian (at least)","vegMeals"]].map((a) => (
                <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                  {a[0]}
                  <select value={criteria[a[1]]} onChange={(e) => setC(a[1], e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value))} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })}>
                    {numOpt(criteria.cookingNights).map((v) => <option key={v} value={v}>{v===UNSPECIFIED?"No preference":v}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <Divider />
            <SectionLabel>Cooking style</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["quickMeals","<=30 min","Quick"],["mediumMeals","45-60 min","Medium"],["involvedMeals","1-2 hrs","Involved"]].map((a) => {
                const active = criteria[a[0]] !== UNSPECIFIED;
                return (
                  <div key={a[0]} style={{ background: active ? C.primaryLight : C.surface, border: "1.5px solid " + (active ? C.primaryMid : C.border), borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT }}>{a[2]}</p>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{a[1]}</p>
                    <select value={criteria[a[0]]} onChange={(e) => setC(a[0], e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value))} style={Object.assign({}, INPUT_STYLE, { fontSize: 13, padding: "6px 4px" })}>
                      {numOpt(criteria.cookingNights).map((v) => <option key={v} value={v}>{v===UNSPECIFIED?"Any":">= "+v}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500, flex: 1 }}>One-pot / sheet-pan (at least)</span>
              <select value={criteria.easyCleanup} onChange={(e) => setC("easyCleanup", e.target.value===UNSPECIFIED?UNSPECIFIED:parseInt(e.target.value))} style={Object.assign({}, INPUT_STYLE, { width: 150, flexShrink: 0 })}>
                {numOpt(criteria.cookingNights).map((v) => <option key={v} value={v}>{v===UNSPECIFIED?"No preference":v}</option>)}
              </select>
            </div>
            <Divider />
            <button onClick={() => setShowFridge(!showFridge)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, marginBottom: showFridge ? 10 : 0 }}>
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
                  <input value={newFridgeItem} onChange={(e) => setNewFridgeItem(e.target.value)} onKeyDown={(e) => { if (e.key==="Enter") handleAddFridgeItem(); }} placeholder="e.g. rotisserie chicken, leftover rice..." style={Object.assign({}, INPUT_STYLE, { flex: 1 })} />
                  <Btn small onClick={handleAddFridgeItem}>Add</Btn>
                </div>
                {(data.fridgeItems||[]).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(data.fridgeItems||[]).map((fi) => (
                      <div key={fi.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, border: "1px solid " + C.border, borderRadius: 99, padding: "4px 12px" }}>
                        <span style={{ fontSize: 13, color: C.text, fontFamily: FONT, fontWeight: 400 }}>{fi.text}</span>
                        <button onClick={() => handleRemoveFridgeItem(fi.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textTertiary, padding: 0, lineHeight: 1 }}>x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Divider />
            <SectionLabel>Other</SectionLabel>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.textSecondary, marginBottom: 14, cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>
              <input type="checkbox" checked={criteria.babyFriendly} onChange={(e) => setC("babyFriendly", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.primary, cursor: "pointer" }} />
              Include baby-friendly adaptation tips
            </label>
            <label style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500, display: "block" }}>
              Notes and requests
              <textarea value={criteria.notes} onChange={(e) => setC("notes", e.target.value)} placeholder="e.g. something quick on Wednesday, avoid shellfish..." rows={2} style={Object.assign({}, INPUT_STYLE, { marginTop: 5, resize: "vertical", lineHeight: 1.6 })} />
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
                  <Btn onClick={applyFeedback} disabled={feedbackLoading||!feedback.trim()} variant="soft" small>{feedbackLoading?"...":"Revise"}</Btn>
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
