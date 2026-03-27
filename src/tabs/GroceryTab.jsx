import { useState } from "react";
import { C, FONT, INPUT_STYLE } from "../styles/tokens";
import { SECTIONS, SECTION_ICONS } from "../lib/constants";
import { Btn, Card, SectionLabel, PageHeader } from "../components/shared";

export function GroceryTab({
  data,
  showToast,
  addGroceryItem,
  toggleGroceryItem,
  clearCheckedGroceryItems,
  clearAllGroceryItems,
  addStaple,
  removeStaple,
  addStaplesToGrocery,
  buildGroceryFromPlan,
}) {
  const [newItem, setNewItem] = useState("");
  const [newSection, setNewSection] = useState("other");
  const [showStaples, setShowStaples] = useState(false);
  const [newStaple, setNewStaple] = useState("");
  const [newStapleSection, setNewStapleSection] = useState("other");
  const [buildingList, setBuildingList] = useState(false);
  const [buildProgress, setBuildProgress] = useState("");

  const totalItems = SECTIONS.reduce((n, s) => n + (data.groceryList[s] || []).length, 0);
  const checkedCount = SECTIONS.reduce((n, s) => n + (data.groceryList[s] || []).filter((i) => i.checked).length, 0);
  const hasCurrentWeek = !!(data.currentWeek && data.currentWeek.meals && data.currentWeek.meals.length > 0);
  const hasMealIngredients = SECTIONS.some((s) => (data.groceryList[s] || []).some((i) => i.fromMeal));

  async function handleAddItem() {
    if (!newItem.trim()) return;
    try {
      await addGroceryItem(newItem.trim(), newSection);
      setNewItem("");
    } catch (e) {
      showToast("Could not add item.", "error");
    }
  }

  async function handleToggleItem(id, section, checked) {
    try { await toggleGroceryItem(id, section, checked); }
    catch (e) { showToast("Could not update item.", "error"); }
  }

  async function handleClearChecked() {
    try {
      await clearCheckedGroceryItems();
      showToast("Checked items cleared.");
    } catch (e) {
      showToast("Could not clear items.", "error");
    }
  }

  async function handleClearAll() {
    try {
      await clearAllGroceryItems();
      showToast("Grocery list cleared.");
    } catch (e) {
      showToast("Could not clear list.", "error");
    }
  }

  async function handleAddStaple() {
    if (!newStaple.trim()) return;
    try {
      await addStaple(newStaple.trim(), newStapleSection);
      setNewStaple("");
    } catch (e) {
      showToast("Could not add staple.", "error");
    }
  }

  async function handleRemoveStaple(id) {
    try { await removeStaple(id); }
    catch (e) { showToast("Could not remove staple.", "error"); }
  }

  async function handleAddStaplesToList() {
    try {
      const count = await addStaplesToGrocery();
      if (count === 0) { showToast("All staples already on your list."); }
      else { showToast("Staples added to your list."); }
    } catch (e) {
      showToast("Could not add staples.", "error");
    }
  }

  async function handleBuildGroceryList() {
    if (!hasCurrentWeek || buildingList) return;
    setBuildingList(true); setBuildProgress("");
    try {
      const count = await buildGroceryFromPlan((msg) => setBuildProgress(msg));
      showToast("Grocery list built — " + count + " ingredients added.");
    } catch (e) {
      showToast(e.message || "Could not build list. Try again.", "error");
    }
    setBuildingList(false); setBuildProgress("");
  }

  return (
    <div>
      <PageHeader
        title="Grocery list"
        subtitle={totalItems > 0 ? (totalItems - checkedCount) + " of " + totalItems + " remaining" : "Empty"}
        action={
          <div style={{ display: "flex", gap: 6 }}>
            {checkedCount > 0 && <Btn small onClick={handleClearChecked}>Clear checked</Btn>}
            {totalItems > 0 && <Btn small danger onClick={handleClearAll}>Clear all</Btn>}
          </div>
        }
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
              <Btn fullWidth variant={hasMealIngredients ? "ghost" : "soft"} onClick={handleBuildGroceryList}>
                {hasMealIngredients ? "Rebuild ingredients from this week's plan" : "Add ingredients from this week's plan"}
              </Btn>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key==="Enter") handleAddItem(); }} placeholder="Add an item..." style={Object.assign({}, INPUT_STYLE, { flex: 1 })} />
          <select value={newSection} onChange={(e) => setNewSection(e.target.value)} style={Object.assign({}, INPUT_STYLE, { width: 110 })}>
            {SECTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <Btn onClick={handleAddItem}>Add</Btn>
        </div>

        <button onClick={() => setShowStaples(!showStaples)} style={{ width:"100%",marginBottom:"1.25rem",padding:"12px 16px",borderRadius:10,border:"1px solid "+(showStaples?C.primaryMid:C.border),background:showStaples?C.primaryLight:C.surface,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontWeight:700,fontSize:13,color:C.text }}>Weekly staples</span>
          <span style={{ color:C.textTertiary,fontSize:11,fontWeight:700 }}>{(data.staples||[]).length + " saved  " + (showStaples?"▲":"▼")}</span>
        </button>

        {showStaples && (
          <Card style={{ marginBottom:"1.5rem",background:C.surfaceAlt }}>
            <p style={{ fontSize:13,color:C.textTertiary,margin:"0 0 12px",fontFamily:FONT,fontWeight:400 }}>Things you buy every week regardless of the meal plan.</p>
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              <input value={newStaple} onChange={(e) => setNewStaple(e.target.value)} onKeyDown={(e) => { if(e.key==="Enter") handleAddStaple(); }} placeholder="e.g. whole milk" style={Object.assign({},INPUT_STYLE,{flex:1})} />
              <select value={newStapleSection} onChange={(e) => setNewStapleSection(e.target.value)} style={Object.assign({},INPUT_STYLE,{width:110})}>
                {SECTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
              <Btn small onClick={handleAddStaple}>Add</Btn>
            </div>
            {(data.staples||[]).length > 0 && (
              <div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:14 }}>
                  {(data.staples||[]).map((st) => (
                    <div key={st.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,borderRadius:10,padding:"8px 12px",border:"1px solid "+C.border }}>
                      <span style={{ fontSize:13,color:C.text,fontFamily:FONT,fontWeight:400 }}>{st.text}</span>
                      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                        <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{st.section}</span>
                        <button onClick={() => handleRemoveStaple(st.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.textTertiary,padding:0,lineHeight:1 }}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
                <Btn fullWidth variant="soft" onClick={handleAddStaplesToList}>Add all staples to this week's list</Btn>
              </div>
            )}
          </Card>
        )}

        {totalItems === 0 && !hasCurrentWeek && (
          <p style={{ color:C.textTertiary,fontSize:14,textAlign:"center",paddingTop:"2.5rem",fontFamily:FONT,fontWeight:400 }}>Confirm a weekly plan, then add its ingredients here.</p>
        )}

        {SECTIONS.map((section) => {
          const items = data.groceryList[section] || [];
          if (!items.length) return null;
          return (
            <div key={section} style={{ marginBottom: "1.5rem" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <span style={{ fontSize:16 }}>{SECTION_ICONS[section]}</span>
                <SectionLabel style={{ margin:0 }}>{section}</SectionLabel>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                {items.map((item) => (
                  <div key={item.id} onClick={() => handleToggleItem(item.id, section, item.checked)} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",background:item.checked?"transparent":C.surface,border:item.checked?"none":"1px solid "+C.border }}>
                    <div style={{ width:20,height:20,borderRadius:6,flexShrink:0,border:item.checked?"none":"2px solid "+C.borderMid,background:item.checked?C.primary:"none",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {item.checked && <span style={{ fontSize:11,color:"#fff",fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:14,fontFamily:FONT,flex:1,color:item.checked?C.textTertiary:C.text,textDecoration:item.checked?"line-through":"none",fontWeight:item.checked?400:500 }}>{item.text}</span>
                    {item.fromMeal && !item.checked && <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>from plan</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
