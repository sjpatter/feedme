import { useState } from "react";
import { C, FONT } from "../styles/tokens";
import { Btn, Card, SectionLabel } from "./shared";
import { MealCard } from "./MealCard";

// Shown when the confirmed plan week has passed (confirmedAt > 7 days ago)
// Lets the user save meals to favorites and marks the plan as reviewed.
export function WeeklyReview({ plan, recipes, onAddRecipe, onDismiss, showToast }) {
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState(() => {
    const s = {};
    (plan.meals || []).forEach((m) => {
      if (recipes.some((r) => r.name.toLowerCase() === m.name.toLowerCase())) s[m.name] = true;
    });
    return s;
  });

  async function handleSave(meal) {
    if (saved[meal.name]) return;
    setSaving((prev) => ({ ...prev, [meal.name]: true }));
    try {
      await onAddRecipe(meal);
      setSaved((prev) => ({ ...prev, [meal.name]: true }));
      showToast(meal.name + " saved to favorites!");
    } catch (e) {
      showToast("Could not save recipe. Try again.", "error");
    }
    setSaving((prev) => ({ ...prev, [meal.name]: false }));
  }

  return (
    <Card style={{ marginBottom: "1.5rem", border: "1.5px solid " + C.primaryMid, background: C.primaryLight }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.text, fontFamily: FONT, letterSpacing: "-0.02em" }}>
            How did last week go?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontFamily: FONT, fontWeight: 400 }}>
            Save any meals you'd like to make again.
          </p>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textTertiary, padding: 0, lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(plan.meals || []).map((meal, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 14px", border: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT, letterSpacing: "-0.01em" }}>{meal.name}</p>
              {meal.source && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textTertiary, fontFamily: FONT, fontWeight: 400 }}>{meal.source}</p>
              )}
            </div>
            {saved[meal.name]
              ? <span style={{ fontSize: 12, color: C.secondary, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>✓ Saved</span>
              : (
                <Btn small variant="soft" disabled={saving[meal.name]} onClick={() => handleSave(meal)}>
                  {saving[meal.name] ? "..." : "Save"}
                </Btn>
              )
            }
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Btn fullWidth onClick={onDismiss}>Done with review</Btn>
      </div>
    </Card>
  );
}
