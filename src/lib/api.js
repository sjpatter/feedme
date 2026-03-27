export async function callClaude(messages, system) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: system || "",
      messages,
    }),
  });
  const d = await res.json();
  const block = d.content && d.content.find((b) => b.type === "text");
  return block ? block.text : "";
}

export function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// Normalises Claude's meal plan response — handles both {meals:[]} and bare []
export function getMeals(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.meals)) return parsed.meals;
  return null;
}
