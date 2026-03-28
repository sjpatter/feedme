import { useState, useEffect } from "react";
import { callClaude, parseJSON } from "../lib/api";
import { C, FONT } from "../styles/tokens";
import { Btn, Tag, Card, SectionLabel } from "./shared";

export function MealCard({ meal, showFavorite, showBabyNote, onAddFavorite, alreadySaved }) {
  const [expanded, setExpanded] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saved, setSaved] = useState(!!alreadySaved);
  const [details, setDetails] = useState(
    meal.ingredients && meal.ingredients.length > 0
      ? { ingredients: meal.ingredients, steps: meal.steps || [] }
      : null
  );
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  // Fetch Unsplash hero image on mount
  useEffect(() => {
    const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!key) { setPhotoLoading(false); return; }
    let cancelled = false;
    fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(meal.name + " food")}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.results && data.results[0]) {
          setPhotoUrl(data.results[0].urls.small);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [meal.name]);

  // Difficulty → tag color
  const diffColor = meal.difficulty === "easy" ? "teal" : meal.difficulty === "advanced" ? "danger" : "warning";

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (details) return;
    setDetailsLoading(true);
    try {
      const raw = await callClaude(
        [{ role: "user", content: `Return ingredients and steps for: "${meal.name}"${meal.source ? " from " + meal.source : ""}.\nJSON: {"ingredients":[{"name":"","amount":"","section":""}],"steps":["Step 1."]}\nsection=produce/dairy/meat/grains/other. 4-6 steps.` }],
        "You are a recipe assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      setDetails({ ingredients: parsed.ingredients || [], steps: parsed.steps || [] });
    } catch (e) {
      setDetails({ ingredients: [], steps: ["Could not load recipe details. Try again."] });
    }
    setDetailsLoading(false);
  }

  function shareViaSMS() {
    const ingLines = details ? details.ingredients.map((i) => (i.amount ? i.amount + " " : "") + i.name).join("\n") : "";
    const parts = [
      "Dinner: " + meal.name,
      meal.description || "",
      meal.source ? "Source: " + (meal.sourceUrl || meal.source) : "",
      ingLines ? "\nIngredients:\n" + ingLines : "",
      details && details.steps.length ? "\nSteps:\n" + details.steps.map((s, i) => (i + 1) + ". " + s).join("\n") : "",
    ];
    window.open("sms:?body=" + encodeURIComponent(parts.filter(Boolean).join("\n").trim()));
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Hero image — shown while loading (placeholder) or when photo found */}
      {(photoLoading || photoUrl) && (
        <div style={{
          height: 180,
          background: "#F5EDE4",
          position: "relative",
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={meal.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
          {photoUrl && (
            <div style={{
              position: "absolute", bottom: 8, right: 8,
              background: "rgba(0,0,0,0.35)", borderRadius: 4, padding: "2px 6px",
            }}>
              <span style={{ fontSize: 10, color: "#fff", fontFamily: FONT, fontWeight: 400 }}>via Unsplash</span>
            </div>
          )}
        </div>
      )}

      {/* Card content */}
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tags row */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {meal.isNew && <Tag label="new" color="primary" />}
              {meal.isMeat && <Tag label="meat" color="warning" />}
              {meal.isVegetarian && <Tag label="veggie" color="teal" />}
              {meal.isEasyCleanup && <Tag label="easy cleanup" color="teal" />}
              {meal.hasLeftovers && <Tag label={"+" + (meal.leftoverDays || 1) + " leftover"} color="neutral" />}
            </div>

            {/* Title */}
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: C.text, letterSpacing: "-0.02em", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {meal.name}
            </p>

            {/* Source link */}
            {meal.source && (
              <p style={{ margin: "0 0 6px", fontSize: 11, fontFamily: FONT, color: C.textTertiary, fontWeight: 400 }}>
                {meal.sourceUrl
                  ? <a href={meal.sourceUrl} target="_blank" rel="noreferrer" style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>{meal.source} ↗</a>
                  : meal.source}
              </p>
            )}

            {/* Metadata row */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {meal.cookTime && (
                <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{"⏱ " + meal.cookTime + " min"}</span>
              )}
              {meal.difficulty && <Tag label={meal.difficulty} color={diffColor} />}
            </div>

            {/* Description */}
            {meal.description && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textSecondary, fontFamily: FONT, lineHeight: 1.6, fontWeight: 400 }}>
                {meal.description}
              </p>
            )}
          </div>

          {/* Expand toggle */}
          <button onClick={handleExpand} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: C.textTertiary, fontSize: 11, flexShrink: 0, fontFamily: FONT, fontWeight: 700 }}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.border }}>
            {showBabyNote && meal.babyNote && (
              <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid #FDE68A" }}>
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
                      {details.ingredients.map((ing, i) => {
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
                      {details.steps.map((s, i) => (
                        <li key={i} style={{ fontSize: 14, color: C.textSecondary, fontFamily: FONT, marginBottom: 5, lineHeight: 1.6, fontWeight: 400 }}>{s}</li>
                      ))}
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
                  : <Btn small variant="soft" onClick={() => { onAddFavorite(details); setSaved(true); }}>Save to favorites</Btn>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
