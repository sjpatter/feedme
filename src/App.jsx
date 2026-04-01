import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useAppData } from "./hooks/useAppData";
import { supabaseConfigured } from "./lib/supabase";
import { useToast } from "./hooks/useToast";
import { C, FONT } from "./styles/tokens";
import { ToastContainer } from "./components/shared";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNav } from "./components/BottomNav";
import { PlannerTab } from "./tabs/PlannerTab";
import { RecipesTab } from "./tabs/RecipesTab";
import { GroceryTab } from "./tabs/GroceryTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { TestSuite } from "./tests/TestSuite";

const VALID_TABS = ["planner", "recipes", "grocery", "profile"];

function getHashTab() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_TABS.includes(hash) ? hash : "planner";
}

function LoadingScreen() {
  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 14, color: C.textTertiary, fontWeight: 400 }}>Loading...</p>
    </div>
  );
}

export default function App() {
  const { session, user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const {
    data,
    loading: dataLoading,
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
  } = useAppData(user?.id ?? null);

  const { toasts, showToast } = useToast();
  const [tab, setTab] = useState(getHashTab);
  const [showTests, setShowTests] = useState(false);

  useEffect(() => {
    function onHashChange() { setTab(getHashTab()); }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigateTo(newTab) {
    window.location.hash = "/" + newTab;
    setTab(newTab);
  }

  if (!supabaseConfigured) {
    return (
      <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⚙️</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Supabase not configured</h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Add <code style={{ background: C.neutralLight, padding: "2px 6px", borderRadius: 4 }}>VITE_SUPABASE_URL</code> and{" "}
            <code style={{ background: C.neutralLight, padding: "2px 6px", borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code> to your{" "}
            <code style={{ background: C.neutralLight, padding: "2px 6px", borderRadius: 4 }}>.env.local</code> file to run locally.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) return <LoadingScreen />;

  if (!session) {
    return (
      <>
        <AuthScreen onSignIn={signIn} onSignUp={signUp} showToast={showToast} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  if (dataLoading) return <LoadingScreen />;

  if (showTests) {
    return <TestSuite onClose={() => setShowTests(false)} />;
  }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, maxWidth: 680, margin: "0 auto", paddingBottom: 80, minHeight: "100vh" }}>
      {tab === "planner" && (
        <PlannerTab
          data={data}
          userId={user?.id}
          showToast={showToast}
          addFridgeItem={addFridgeItem}
          removeFridgeItem={removeFridgeItem}
          confirmPlan={confirmPlan}
          addMealSkips={addMealSkips}
          setLastGenerated={setLastGenerated}
          addRecipe={addRecipe}
          markPlanReviewed={markPlanReviewed}
          onNavigateToGrocery={() => navigateTo("grocery")}
          buildGroceryFromPlan={buildGroceryFromPlan}
        />
      )}
      {tab === "recipes" && (
        <RecipesTab
          data={data}
          showToast={showToast}
          addRecipe={addRecipe}
          removeRecipe={removeRecipe}
        />
      )}
      {tab === "grocery" && (
        <GroceryTab
          data={data}
          showToast={showToast}
          addGroceryItem={addGroceryItem}
          toggleGroceryItem={toggleGroceryItem}
          clearCheckedGroceryItems={clearCheckedGroceryItems}
          clearAllGroceryItems={clearAllGroceryItems}
          addStaple={addStaple}
          removeStaple={removeStaple}
          addStaplesToGrocery={addStaplesToGrocery}
          buildGroceryFromPlan={buildGroceryFromPlan}
        />
      )}
      {tab === "profile" && (
        <ProfileTab
          data={data}
          showToast={showToast}
          signOut={signOut}
          saveTasteProfile={saveTasteProfile}
          addTasteInsight={addTasteInsight}
          removeTasteInsight={removeTasteInsight}
          editTasteInsight={editTasteInsight}
        />
      )}
      <BottomNav tab={tab} setTab={navigateTo} onLongPress={() => setShowTests(true)} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
