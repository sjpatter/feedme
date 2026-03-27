import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { callClaude, parseJSON } from "../lib/api";
import { SECTIONS } from "../lib/constants";

const DEFAULT_DATA = {
  recipes: [],
  weeklyPlans: [],
  currentWeek: null,
  groceryList: { id: null, produce: [], dairy: [], meat: [], grains: [], other: [] },
  staples: [],
  lastGenerated: null,
  mealHistory: [],
  fridgeItems: [],
  tasteProfile: [],
};

// ─── Transform helpers ────────────────────────────────────────────────────────

function transformRecipe(r) {
  return {
    id: r.id,
    name: r.name,
    source: r.source,
    sourceUrl: r.source_url,
    description: r.description,
    difficulty: r.difficulty,
    cookTime: r.cook_time,
    isMeat: r.is_meat,
    isVegetarian: r.is_vegetarian,
    isEasyCleanup: r.is_easy_cleanup,
    babyNote: r.baby_note,
    ingredients: (r.recipe_ingredients || []).map((i) => ({
      name: i.name,
      amount: i.amount,
      section: i.section,
    })),
    steps: (r.recipe_steps || [])
      .sort((a, b) => a.step_number - b.step_number)
      .map((s) => s.instruction),
  };
}

function transformPlan(p) {
  return {
    id: p.id,
    confirmedAt: new Date(p.confirmed_at).getTime(),
    weekStart: p.week_start,
    reviewedAt: p.reviewed_at ? new Date(p.reviewed_at).getTime() : null,
    meals: (p.meal_plan_items || []).map((item) => ({
      id: item.id,
      name: item.name,
      source: item.source,
      sourceUrl: item.source_url,
      isNew: item.is_new,
      isMeat: item.is_meat,
      isVegetarian: item.is_vegetarian,
      hasLeftovers: item.has_leftovers,
      leftoverDays: item.leftover_days,
      cookTime: item.cook_time,
      difficulty: item.difficulty,
      isEasyCleanup: item.is_easy_cleanup,
      description: item.description,
      babyNote: item.baby_note,
      usesFridgeItems: item.uses_fridge_items || [],
    })),
  };
}

function buildGroceryListFromItems(listId, items) {
  const gl = { id: listId, produce: [], dairy: [], meat: [], grains: [], other: [] };
  for (const item of items) {
    const sec = SECTIONS.includes(item.section) ? item.section : "other";
    gl[sec].push({ id: item.id, text: item.text, checked: item.checked, fromMeal: item.from_meal });
  }
  return gl;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppData(userId) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [groceryListId, setGroceryListId] = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadAll(userId);
  }, [userId]);

  // Real-time grocery subscription
  useEffect(() => {
    if (!groceryListId) return;

    const channel = supabase
      .channel(`grocery:${groceryListId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_items", filter: `grocery_list_id=eq.${groceryListId}` },
        handleRealtimeGrocery
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [groceryListId]);

  function handleRealtimeGrocery(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    setData((prev) => {
      const gl = { ...prev.groceryList };
      SECTIONS.forEach((s) => { gl[s] = [...(gl[s] || [])]; });

      if (eventType === "INSERT") {
        const item = newRecord;
        const sec = SECTIONS.includes(item.section) ? item.section : "other";
        if (gl[sec].some((i) => i.id === item.id)) return prev; // already added optimistically
        gl[sec] = [...gl[sec], { id: item.id, text: item.text, checked: item.checked, fromMeal: item.from_meal }];
      } else if (eventType === "UPDATE") {
        const item = newRecord;
        const sec = SECTIONS.includes(item.section) ? item.section : "other";
        gl[sec] = gl[sec].map((i) => i.id === item.id ? { ...i, checked: item.checked } : i);
      } else if (eventType === "DELETE") {
        const item = oldRecord;
        SECTIONS.forEach((sec) => { gl[sec] = gl[sec].filter((i) => i.id !== item.id); });
      }

      return { ...prev, groceryList: gl };
    });
  }

  async function ensureHousehold(uid) {
    const { data: existing } = await supabase
      .from("households")
      .select("id")
      .eq("id", uid)
      .maybeSingle();

    if (!existing) {
      await supabase.from("households").insert({ id: uid, name: "My Household" });
    }
  }

  async function getOrCreateGroceryList(uid) {
    const { data: existing } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("household_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newList } = await supabase
      .from("grocery_lists")
      .insert({ household_id: uid })
      .select("id")
      .single();

    return newList.id;
  }

  async function loadAll(uid) {
    setLoading(true);
    try {
      await ensureHousehold(uid);

      const [recipesRes, plansRes, staplesRes, fridgeRes, historyRes, profileRes] = await Promise.all([
        supabase.from("recipes").select("*, recipe_ingredients(*), recipe_steps(*)").eq("household_id", uid).order("created_at", { ascending: false }),
        supabase.from("meal_plans").select("*, meal_plan_items(*)").eq("household_id", uid).order("confirmed_at", { ascending: false }).limit(10),
        supabase.from("staples").select("*").eq("household_id", uid),
        supabase.from("fridge_items").select("*").eq("household_id", uid).order("created_at"),
        supabase.from("meal_history").select("*").eq("household_id", uid).order("created_at", { ascending: false }),
        supabase.from("taste_profile").select("*").eq("household_id", uid).order("created_at"),
      ]);

      const listId = await getOrCreateGroceryList(uid);
      setGroceryListId(listId);

      const { data: groceryItems } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("grocery_list_id", listId)
        .order("created_at");

      const weeklyPlans = (plansRes.data || []).map(transformPlan);

      setData({
        recipes: (recipesRes.data || []).map(transformRecipe),
        weeklyPlans,
        currentWeek: weeklyPlans[0] || null,
        groceryList: buildGroceryListFromItems(listId, groceryItems || []),
        staples: (staplesRes.data || []).map((s) => ({ id: s.id, text: s.text, section: s.section })),
        lastGenerated: null,
        mealHistory: (historyRes.data || []).map((h) => ({
          id: h.id,
          name: h.meal_name,
          source: h.source,
          signal: h.signal,
          at: new Date(h.created_at).getTime(),
        })),
        fridgeItems: (fridgeRes.data || []).map((f) => ({ id: f.id, text: f.text })),
        tasteProfile: (profileRes.data || []).map((p) => ({ id: p.id, text: p.text })),
      });
    } catch (e) {
      console.error("Failed to load app data:", e);
    }
    setLoading(false);
  }

  // ─── Recipes ────────────────────────────────────────────────────────────────

  async function addRecipe(recipe) {
    const uid = userId;
    const { data: row, error } = await supabase
      .from("recipes")
      .insert({
        household_id: uid,
        name: recipe.name,
        source: recipe.source || null,
        source_url: recipe.sourceUrl || null,
        description: recipe.description || null,
        difficulty: recipe.difficulty || null,
        cook_time: recipe.cookTime || null,
        is_meat: recipe.isMeat || false,
        is_vegetarian: recipe.isVegetarian || false,
        is_easy_cleanup: recipe.isEasyCleanup || false,
        baby_note: recipe.babyNote || null,
      })
      .select()
      .single();

    if (error) throw error;

    const ingredients = recipe.ingredients || [];
    const steps = recipe.steps || [];

    if (ingredients.length > 0) {
      await supabase.from("recipe_ingredients").insert(
        ingredients.map((ing) => ({
          recipe_id: row.id,
          name: typeof ing === "string" ? ing : ing.name,
          amount: ing.amount || null,
          section: SECTIONS.includes(ing.section) ? ing.section : "other",
        }))
      );
    }

    if (steps.length > 0) {
      await supabase.from("recipe_steps").insert(
        steps.map((step, i) => ({
          recipe_id: row.id,
          step_number: i + 1,
          instruction: typeof step === "string" ? step : step,
        }))
      );
    }

    const newRecipe = {
      id: row.id,
      name: row.name,
      source: row.source,
      sourceUrl: row.source_url,
      description: row.description,
      difficulty: row.difficulty,
      cookTime: row.cook_time,
      isMeat: row.is_meat,
      isVegetarian: row.is_vegetarian,
      isEasyCleanup: row.is_easy_cleanup,
      babyNote: row.baby_note,
      ingredients: ingredients.map((ing) => ({
        name: typeof ing === "string" ? ing : ing.name,
        amount: ing.amount || null,
        section: SECTIONS.includes(ing.section) ? ing.section : "other",
      })),
      steps: steps.map((s) => (typeof s === "string" ? s : s)),
    };

    setData((prev) => ({ ...prev, recipes: [newRecipe, ...prev.recipes] }));
  }

  async function removeRecipe(id) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) throw error;
    setData((prev) => ({ ...prev, recipes: prev.recipes.filter((r) => r.id !== id) }));
  }

  // ─── Meal plans ─────────────────────────────────────────────────────────────

  async function confirmPlan(plan) {
    const uid = userId;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday

    const { data: planRow, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        household_id: uid,
        week_start: weekStart.toISOString().split("T")[0],
        confirmed_at: now.toISOString(),
      })
      .select()
      .single();

    if (planError) throw planError;

    if (plan.meals && plan.meals.length > 0) {
      const { error: itemsError } = await supabase.from("meal_plan_items").insert(
        plan.meals.map((meal) => ({
          meal_plan_id: planRow.id,
          name: meal.name,
          source: meal.source || null,
          source_url: meal.sourceUrl || null,
          is_new: meal.isNew || false,
          is_meat: meal.isMeat || false,
          is_vegetarian: meal.isVegetarian || false,
          has_leftovers: meal.hasLeftovers || false,
          leftover_days: meal.leftoverDays || 0,
          cook_time: meal.cookTime || null,
          difficulty: meal.difficulty || null,
          is_easy_cleanup: meal.isEasyCleanup || false,
          description: meal.description || null,
          baby_note: meal.babyNote || null,
          uses_fridge_items: meal.usesFridgeItems || [],
        }))
      );
      if (itemsError) throw itemsError;
    }

    // Log save signals to meal history
    const historyRecords = (plan.meals || []).map((meal) => ({
      household_id: uid,
      meal_name: meal.name,
      source: meal.source || null,
      signal: "save",
    }));
    if (historyRecords.length > 0) {
      await supabase.from("meal_history").insert(historyRecords);
    }

    // Clear used fridge items
    const usedFridge = {};
    (plan.meals || []).forEach((meal) => {
      (meal.usesFridgeItems || []).forEach((item) => { usedFridge[item.toLowerCase()] = true; });
    });
    const fridgeToRemove = data.fridgeItems
      .filter((fi) => usedFridge[fi.text.toLowerCase()])
      .map((fi) => fi.id);
    if (fridgeToRemove.length > 0) {
      await supabase.from("fridge_items").delete().in("id", fridgeToRemove);
    }

    const confirmedAt = now.getTime();
    const newPlan = {
      id: planRow.id,
      confirmedAt,
      weekStart: weekStart.toISOString().split("T")[0],
      reviewedAt: null,
      meals: plan.meals || [],
    };
    const newHistory = (plan.meals || []).map((m) => ({
      name: m.name,
      source: m.source || "",
      signal: "save",
      at: confirmedAt,
    }));

    setData((prev) => ({
      ...prev,
      currentWeek: newPlan,
      weeklyPlans: [newPlan, ...prev.weeklyPlans].slice(0, 10),
      lastGenerated: null,
      mealHistory: [...newHistory, ...prev.mealHistory],
      fridgeItems: prev.fridgeItems.filter((fi) => !usedFridge[fi.text.toLowerCase()]),
    }));

    // Background: update taste profile
    const updatedHistory = [...newHistory, ...data.mealHistory];
    setTimeout(() => triggerProfileUpdate(updatedHistory, data.recipes, uid), 500);
  }

  async function markPlanReviewed(planId) {
    await supabase.from("meal_plans").update({ reviewed_at: new Date().toISOString() }).eq("id", planId);
    setData((prev) => ({
      ...prev,
      weeklyPlans: prev.weeklyPlans.map((p) =>
        p.id === planId ? { ...p, reviewedAt: Date.now() } : p
      ),
      currentWeek: prev.currentWeek?.id === planId
        ? { ...prev.currentWeek, reviewedAt: Date.now() }
        : prev.currentWeek,
    }));
  }

  // ─── Meal history (skips) ────────────────────────────────────────────────────

  async function addMealSkips(meals) {
    const uid = userId;
    const records = meals.map((m) => ({
      household_id: uid,
      meal_name: m.name,
      source: m.source || null,
      signal: "skip",
    }));
    if (records.length > 0) {
      const { error } = await supabase.from("meal_history").insert(records);
      if (error) throw error;
    }
    const newSkips = meals.map((m) => ({ name: m.name, source: m.source || "", signal: "skip", at: Date.now() }));
    setData((prev) => ({ ...prev, mealHistory: [...newSkips, ...prev.mealHistory] }));
  }

  // ─── Grocery ────────────────────────────────────────────────────────────────

  async function addGroceryItem(text, section, fromMeal = false) {
    const sec = SECTIONS.includes(section) ? section : "other";
    const { data: row, error } = await supabase
      .from("grocery_items")
      .insert({ grocery_list_id: groceryListId, text, section: sec, from_meal: fromMeal, checked: false })
      .select()
      .single();
    if (error) throw error;
    setData((prev) => {
      const gl = { ...prev.groceryList };
      gl[sec] = [...gl[sec], { id: row.id, text: row.text, checked: false, fromMeal: row.from_meal }];
      return { ...prev, groceryList: gl };
    });
    return row.id;
  }

  async function toggleGroceryItem(id, section, currentChecked) {
    // Optimistic
    setData((prev) => {
      const gl = { ...prev.groceryList };
      gl[section] = gl[section].map((i) => i.id === id ? { ...i, checked: !currentChecked } : i);
      return { ...prev, groceryList: gl };
    });
    await supabase.from("grocery_items").update({ checked: !currentChecked }).eq("id", id);
  }

  async function clearCheckedGroceryItems() {
    await supabase.from("grocery_items").delete().eq("grocery_list_id", groceryListId).eq("checked", true);
    setData((prev) => {
      const gl = { ...prev.groceryList };
      SECTIONS.forEach((sec) => { gl[sec] = gl[sec].filter((i) => !i.checked); });
      return { ...prev, groceryList: gl };
    });
  }

  async function clearAllGroceryItems() {
    await supabase.from("grocery_items").delete().eq("grocery_list_id", groceryListId);
    setData((prev) => ({
      ...prev,
      groceryList: { ...prev.groceryList, produce: [], dairy: [], meat: [], grains: [], other: [] },
    }));
  }

  async function buildGroceryFromPlan(onProgress) {
    const meals = data.currentWeek?.meals || [];
    const all = [];

    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      if (onProgress) onProgress(`Fetching ${meal.name} (${i + 1}/${meals.length})...`);

      let ingredients = [];
      if (meal.ingredients && meal.ingredients.length > 0) {
        ingredients = meal.ingredients;
      } else {
        try {
          const raw = await callClaude(
            [{ role: "user", content: `Return ingredients for: "${meal.name}"${meal.source ? " from " + meal.source : ""}. JSON: {"ingredients":[{"name":"","amount":"","section":""}]} section=produce/dairy/meat/grains/other.` }],
            "You are a recipe assistant. Respond ONLY with valid JSON. No markdown, no backticks."
          );
          const parsed = parseJSON(raw);
          ingredients = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
        } catch (e) {
          // skip meal
        }
      }

      ingredients.forEach((ing) => {
        const sec = SECTIONS.includes(ing.section) ? ing.section : "other";
        all.push({
          grocery_list_id: groceryListId,
          text: (ing.amount ? ing.amount + " " : "") + (typeof ing === "string" ? ing : ing.name),
          section: sec,
          from_meal: true,
          checked: false,
        });
      });
    }

    if (all.length === 0) throw new Error("Could not fetch ingredients. Try again.");

    // Replace existing from-meal items
    await supabase.from("grocery_items").delete().eq("grocery_list_id", groceryListId).eq("from_meal", true);

    const { data: rows, error } = await supabase.from("grocery_items").insert(all).select();
    if (error) throw error;

    setData((prev) => {
      const gl = { ...prev.groceryList };
      SECTIONS.forEach((sec) => { gl[sec] = gl[sec].filter((i) => !i.fromMeal); });
      (rows || []).forEach((row) => {
        const sec = SECTIONS.includes(row.section) ? row.section : "other";
        gl[sec] = [...gl[sec], { id: row.id, text: row.text, checked: false, fromMeal: true }];
      });
      return { ...prev, groceryList: gl };
    });

    return rows.length;
  }

  // ─── Staples ────────────────────────────────────────────────────────────────

  async function addStaple(text, section) {
    const uid = userId;
    const sec = SECTIONS.includes(section) ? section : "other";
    const { data: row, error } = await supabase
      .from("staples")
      .insert({ household_id: uid, text, section: sec })
      .select()
      .single();
    if (error) throw error;
    setData((prev) => ({ ...prev, staples: [...prev.staples, { id: row.id, text: row.text, section: row.section }] }));
  }

  async function removeStaple(id) {
    await supabase.from("staples").delete().eq("id", id);
    setData((prev) => ({ ...prev, staples: prev.staples.filter((s) => s.id !== id) }));
  }

  async function addStaplesToGrocery() {
    const toAdd = data.staples.filter((st) => {
      const sec = SECTIONS.includes(st.section) ? st.section : "other";
      return !(data.groceryList[sec] || []).some((i) => i.text.toLowerCase() === st.text.toLowerCase());
    });
    if (toAdd.length === 0) return 0;

    const { data: rows, error } = await supabase
      .from("grocery_items")
      .insert(toAdd.map((st) => ({
        grocery_list_id: groceryListId,
        text: st.text,
        section: SECTIONS.includes(st.section) ? st.section : "other",
        from_meal: false,
        checked: false,
      })))
      .select();
    if (error) throw error;

    setData((prev) => {
      const gl = { ...prev.groceryList };
      (rows || []).forEach((row) => {
        const sec = SECTIONS.includes(row.section) ? row.section : "other";
        gl[sec] = [...(gl[sec] || []), { id: row.id, text: row.text, checked: false, fromMeal: false }];
      });
      return { ...prev, groceryList: gl };
    });
    return rows.length;
  }

  // ─── Fridge items ────────────────────────────────────────────────────────────

  async function addFridgeItem(text) {
    const uid = userId;
    const { data: row, error } = await supabase
      .from("fridge_items")
      .insert({ household_id: uid, text })
      .select()
      .single();
    if (error) throw error;
    setData((prev) => ({ ...prev, fridgeItems: [...prev.fridgeItems, { id: row.id, text: row.text }] }));
  }

  async function removeFridgeItem(id) {
    await supabase.from("fridge_items").delete().eq("id", id);
    setData((prev) => ({ ...prev, fridgeItems: prev.fridgeItems.filter((fi) => fi.id !== id) }));
  }

  // ─── Taste profile ───────────────────────────────────────────────────────────

  async function saveTasteProfile(insights) {
    const uid = userId;
    await supabase.from("taste_profile").delete().eq("household_id", uid);
    if (insights.length === 0) {
      setData((prev) => ({ ...prev, tasteProfile: [] }));
      return;
    }
    const { data: rows, error } = await supabase
      .from("taste_profile")
      .insert(insights.map((text) => ({ household_id: uid, text })))
      .select();
    if (error) throw error;
    setData((prev) => ({ ...prev, tasteProfile: (rows || []).map((p) => ({ id: p.id, text: p.text })) }));
  }

  async function addTasteInsight(text) {
    const uid = userId;
    const { data: row, error } = await supabase
      .from("taste_profile")
      .insert({ household_id: uid, text })
      .select()
      .single();
    if (error) throw error;
    setData((prev) => ({ ...prev, tasteProfile: [...prev.tasteProfile, { id: row.id, text: row.text }] }));
  }

  async function removeTasteInsight(id) {
    await supabase.from("taste_profile").delete().eq("id", id);
    setData((prev) => ({ ...prev, tasteProfile: prev.tasteProfile.filter((p) => p.id !== id) }));
  }

  async function editTasteInsight(id, text) {
    await supabase.from("taste_profile").update({ text }).eq("id", id);
    setData((prev) => ({ ...prev, tasteProfile: prev.tasteProfile.map((p) => p.id === id ? { ...p, text } : p) }));
  }

  // ─── Ephemeral (local only) ──────────────────────────────────────────────────

  function setLastGenerated(plan) {
    setData((prev) => ({ ...prev, lastGenerated: plan }));
  }

  // ─── Background helpers ──────────────────────────────────────────────────────

  async function triggerProfileUpdate(history, recipes, uid) {
    const saved = history.filter((h) => h.signal === "save");
    if (saved.length < 3) return;
    const savedNames = saved.map((h) => h.name).join(", ");
    const skippedNames = history.filter((h) => h.signal === "skip").map((h) => h.name).join(", ") || "none";
    const favNames = recipes.map((r) => r.name).join(", ") || "none";
    try {
      const raw = await callClaude(
        [{ role: "user", content: `Generate 4-6 short taste profile insights.\nConfirmed: ${savedNames}\nSkipped: ${skippedNames}\nFavorites: ${favNames}\nReturn JSON: {"insights":[{"id":1,"text":"Short insight"}]}\nMax 12 words each, specific and actionable.` }],
        "You are a culinary assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      const insights = (parsed.insights || []).map((ins) => ins.text);
      await supabase.from("taste_profile").delete().eq("household_id", uid);
      if (insights.length > 0) {
        const { data: rows } = await supabase
          .from("taste_profile")
          .insert(insights.map((text) => ({ household_id: uid, text })))
          .select();
        setData((prev) => ({ ...prev, tasteProfile: (rows || []).map((p) => ({ id: p.id, text: p.text })) }));
      }
    } catch (e) {
      // silent fail — taste profile update is not critical
    }
  }

  return {
    data,
    loading,
    addRecipe,
    removeRecipe,
    confirmPlan,
    markPlanReviewed,
    addMealSkips,
    addGroceryItem,
    toggleGroceryItem,
    clearCheckedGroceryItems,
    clearAllGroceryItems,
    buildGroceryFromPlan,
    addStaple,
    removeStaple,
    addStaplesToGrocery,
    addFridgeItem,
    removeFridgeItem,
    saveTasteProfile,
    addTasteInsight,
    removeTasteInsight,
    editTasteInsight,
    setLastGenerated,
  };
}
