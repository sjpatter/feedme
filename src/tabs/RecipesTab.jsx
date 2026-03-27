import { useState } from "react";
import { callClaude, parseJSON } from "../lib/api";
import { C, FONT, INPUT_STYLE } from "../styles/tokens";
import { Btn, Card, SectionLabel, CollapsibleButton, PageHeader } from "../components/shared";
import { MealCard } from "../components/MealCard";

export function RecipesTab({ data, showToast, addRecipe, removeRecipe }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLastGen, setShowLastGen] = useState(false);
  const [addMode, setAddMode] = useState("manual");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", source: "", sourceUrl: "", description: "", babyNote: "", ingredients: "", steps: "" });

  const recipes = data.recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const pastPlans = (data.weeklyPlans || []).slice(0, 4);
  const lastGen = data.lastGenerated;

  function setF(k, v) { setForm((p) => Object.assign({}, p, { [k]: v })); }
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
      setForm({
        name: parsed.name || "",
        source: parsed.source || "",
        sourceUrl: urlInput,
        description: parsed.description || "",
        babyNote: parsed.babyNote || "",
        ingredients: (parsed.ingredients || []).map((i) => (i.amount ? i.amount + " " : "") + i.name).join("\n"),
        steps: (parsed.steps || []).join("\n"),
      });
      setAddMode("manual");
    } catch (e) {
      showToast("Couldn't parse that URL. Try entering manually.", "error");
    }
    setUrlLoading(false);
  }

  async function saveRecipe() {
    if (!form.name.trim()) { showToast("Please enter a recipe name.", "error"); return; }
    setSaving(true);
    const recipe = {
      name: form.name.trim(),
      source: form.source.trim(),
      sourceUrl: form.sourceUrl.trim(),
      description: form.description.trim(),
      babyNote: form.babyNote.trim(),
      ingredients: form.ingredients.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => ({ name: s, section: "other" })),
      steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    try {
      await addRecipe(recipe);
      setForm({ name:"",source:"",sourceUrl:"",description:"",babyNote:"",ingredients:"",steps:"" });
      setUrlInput(""); setShowAdd(false);
      showToast("Recipe saved to favorites!");
    } catch (e) {
      showToast("Could not save recipe. Try again.", "error");
    }
    setSaving(false);
  }

  async function addFromHistory(meal) {
    if (data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())) {
      showToast(meal.name + " is already in your favorites.", "error"); return;
    }
    try {
      await addRecipe(meal);
      showToast(meal.name + " saved to favorites!");
    } catch (e) {
      showToast("Could not save recipe.", "error");
    }
  }

  async function handleRemoveRecipe(id) {
    try {
      await removeRecipe(id);
      showToast("Recipe removed.");
    } catch (e) {
      showToast("Could not remove recipe.", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle={data.recipes.length + " favorite" + (data.recipes.length !== 1 ? "s" : "") + " saved"}
        action={<Btn small onClick={() => setShowAdd(!showAdd)} variant={showAdd?"ghost":"primary"}>{showAdd?"Cancel":"+ Add recipe"}</Btn>}
      />
      <div style={{ padding: "0 1.25rem" }}>
        {showAdd && (
          <Card style={{ marginBottom: "1.5rem", background: C.surfaceAlt }}>
            <SectionLabel>New recipe</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
              {["url","manual"].map((m) => (
                <button key={m} onClick={() => setAddMode(m)} style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", border: "1.5px solid " + (addMode===m?C.primary:C.border), background: addMode===m?C.primary:"transparent", color: addMode===m?"#fff":C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>
                  {m==="url"?"From a URL":"Enter manually"}
                </button>
              ))}
            </div>
            {addMode === "url" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste a recipe URL..." style={Object.assign({}, INPUT_STYLE, { marginBottom: 8 })} />
                <Btn fullWidth onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()} variant="primary">{urlLoading?"Looking up...":"Look up recipe"}</Btn>
                <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 8, lineHeight: 1.6, fontFamily: FONT, fontWeight: 400 }}>Claude will use its knowledge of the recipe. Paywalled sites may need manual editing.</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Recipe name *","name","e.g. Pasta all'Amatriciana"],["Source","source","e.g. Serious Eats"],["Source URL","sourceUrl","https://..."],["Description","description","A brief description..."],["Baby-friendly tip","babyNote","e.g. Serve pasta plain, hold the salt..."]].map((a) => (
                <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                  {a[0]}
                  <input value={form[a[1]]} onChange={(e) => setF(a[1], e.target.value)} placeholder={a[2]} style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })} />
                </label>
              ))}
              {[["Ingredients (one per line)","ingredients","2 cups flour\n1 tsp salt",4],["Steps (one per line)","steps","Bring water to boil\nCook pasta",4]].map((a) => (
                <label key={a[1]} style={{ fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 500 }}>
                  {a[0]}
                  <textarea value={form[a[1]]} onChange={(e) => setF(a[1], e.target.value)} placeholder={a[2]} rows={a[3]} style={Object.assign({}, INPUT_STYLE, { marginTop: 5, resize: "vertical", lineHeight: 1.6 })} />
                </label>
              ))}
              <Btn fullWidth onClick={saveRecipe} variant="primary" disabled={saving}>{saving?"Saving...":"Save to favorites"}</Btn>
            </div>
          </Card>
        )}

        {!showAdd && (
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your recipes..." style={Object.assign({}, INPUT_STYLE, { marginBottom: "1.25rem" })} />
        )}

        {recipes.length === 0 && !showAdd && (
          <p style={{ color: C.textTertiary, fontSize: 14, textAlign: "center", padding: "2rem 0", fontFamily: FONT, fontWeight: 400 }}>
            {data.recipes.length === 0 ? "No favorites yet. Add your first recipe above." : "No matches."}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
          {recipes.map((r) => (
            <div key={r.id}>
              <MealCard meal={r} showFavorite={false} showBabyNote />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <Btn small danger onClick={() => handleRemoveRecipe(r.id)}>Remove</Btn>
              </div>
            </div>
          ))}
        </div>

        {lastGen && lastGen.meals && (
          <div style={{ marginBottom: "1rem" }}>
            <CollapsibleButton label="Last generated plan" sublabel={"Generated " + formatDate(lastGen.generatedAt) + " — not confirmed"} isOpen={showLastGen} onToggle={() => setShowLastGen(!showLastGen)} />
            {showLastGen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
                {lastGen.meals.map((meal, i) => (
                  <MealCard key={i} meal={meal} showFavorite showBabyNote onAddFavorite={() => addFromHistory(meal)} alreadySaved={data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())} />
                ))}
              </div>
            )}
          </div>
        )}

        {pastPlans.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <CollapsibleButton label="Past meal plans" sublabel={pastPlans.length + " confirmed week" + (pastPlans.length!==1?"s":"")} isOpen={showHistory} onToggle={() => setShowHistory(!showHistory)} />
            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {pastPlans.map((week, wi) => (
                  <div key={wi}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textTertiary, fontFamily: FONT, margin: "0 0 8px" }}>{"Week of " + formatDate(week.confirmedAt)}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(week.meals||[]).map((meal, mi) => (
                        <MealCard key={mi} meal={meal} showFavorite showBabyNote onAddFavorite={() => addFromHistory(meal)} alreadySaved={data.recipes.some((r) => r.name.toLowerCase() === meal.name.toLowerCase())} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
