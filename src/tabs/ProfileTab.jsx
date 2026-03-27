import { useState } from "react";
import { callClaude, parseJSON } from "../lib/api";
import { C, FONT, INPUT_STYLE } from "../styles/tokens";
import { Btn, Card, SectionLabel, PageHeader } from "../components/shared";

export function ProfileTab({
  data,
  showToast,
  signOut,
  saveTasteProfile,
  addTasteInsight,
  removeTasteInsight,
  editTasteInsight,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newInsight, setNewInsight] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const saved = (data.mealHistory || []).filter((h) => h.signal === "save");
  const skipped = (data.mealHistory || []).filter((h) => h.signal === "skip");
  const profile = data.tasteProfile || [];

  async function handleSaveEdit(id) {
    try {
      await editTasteInsight(id, editText);
      setEditingId(null);
      showToast("Insight updated.");
    } catch (e) {
      showToast("Could not update insight.", "error");
    }
  }

  async function handleRemoveInsight(id) {
    try {
      await removeTasteInsight(id);
      showToast("Insight removed.");
    } catch (e) {
      showToast("Could not remove insight.", "error");
    }
  }

  async function handleAddInsight() {
    if (!newInsight.trim()) return;
    try {
      await addTasteInsight(newInsight.trim());
      setNewInsight("");
      showToast("Insight added.");
    } catch (e) {
      showToast("Could not add insight.", "error");
    }
  }

  async function regenerateProfile() {
    if (saved.length < 2) { showToast("Confirm a few more meal plans first.", "error"); return; }
    setRegenerating(true);
    try {
      const raw = await callClaude(
        [{ role: "user", content: "Generate 4-6 short taste profile insights.\nConfirmed: " + saved.map((h) => h.name).join(", ") + "\nSkipped: " + (skipped.map((h) => h.name).join(", ") || "none") + "\nFavorites: " + ((data.recipes || []).map((r) => r.name).join(", ") || "none") + "\nReturn JSON: {\"insights\":[{\"id\":1,\"text\":\"Short insight\"}]}\nMax 12 words each." }],
        "You are a culinary assistant. Respond ONLY with valid JSON. No markdown, no backticks."
      );
      const parsed = parseJSON(raw);
      await saveTasteProfile((parsed.insights || []).map((ins) => ins.text));
      showToast("Taste profile updated.");
    } catch (e) {
      showToast("Could not regenerate. Try again.", "error");
    }
    setRegenerating(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); }
    catch (e) { showToast("Could not sign out.", "error"); setSigningOut(false); }
  }

  return (
    <div>
      <PageHeader
        title="My profile"
        subtitle="How Feed Me learns your taste"
        action={
          <Btn small onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "..." : "Sign out"}
          </Btn>
        }
      />
      <div style={{ padding: "0 1.25rem" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.5rem" }}>
          {[["Meals confirmed",saved.length,C.secondaryLight,C.secondary],["Meals skipped",skipped.length,C.primaryLight,C.primaryDark]].map((a) => (
            <div key={a[0]} style={{ background:a[2],borderRadius:14,padding:"16px",textAlign:"center",border:"1px solid "+C.border }}>
              <p style={{ margin:0,fontSize:32,fontWeight:700,color:a[3],fontFamily:FONT,letterSpacing:"-0.04em" }}>{a[1]}</p>
              <p style={{ margin:"4px 0 0",fontSize:12,color:a[3],fontFamily:FONT,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em" }}>{a[0]}</p>
            </div>
          ))}
        </div>

        <Card style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <SectionLabel style={{ margin:0 }}>Taste profile</SectionLabel>
            <Btn small onClick={regenerateProfile} disabled={regenerating} variant="soft">{regenerating?"Updating...":"Regenerate"}</Btn>
          </div>
          {profile.length === 0 ? (
            <p style={{ fontSize:13,color:C.textTertiary,fontFamily:FONT,margin:0,lineHeight:1.6,fontWeight:400 }}>
              {saved.length < 3 ? "Confirm a few weekly plans and Feed Me will start learning your preferences." : "Tap Regenerate to build your taste profile from your history."}
            </p>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
              {profile.map((ins) => (
                <div key={ins.id} style={{ display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,borderRadius:10,padding:"10px 12px",border:"1px solid "+C.border }}>
                  <span style={{ fontSize:12,color:C.primary,flexShrink:0,fontWeight:700 }}>◆</span>
                  {editingId === ins.id ? (
                    <div style={{ flex:1,display:"flex",gap:8 }}>
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if(e.key==="Enter") handleSaveEdit(ins.id); }} style={Object.assign({},INPUT_STYLE,{flex:1,padding:"6px 10px",fontSize:13})} />
                      <Btn small onClick={() => handleSaveEdit(ins.id)} variant="primary">Save</Btn>
                      <Btn small onClick={() => setEditingId(null)}>Cancel</Btn>
                    </div>
                  ) : (
                    <div style={{ flex:1,display:"flex",alignItems:"center",gap:8 }}>
                      <p style={{ flex:1,margin:0,fontSize:13,color:C.textSecondary,fontFamily:FONT,lineHeight:1.5,fontWeight:400 }}>{ins.text}</p>
                      <button onClick={() => { setEditingId(ins.id); setEditText(ins.text); }} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textTertiary,padding:"0 4px",fontFamily:FONT,fontWeight:600 }}>Edit</button>
                      <button onClick={() => handleRemoveInsight(ins.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textTertiary,padding:0,lineHeight:1 }}>x</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex",gap:8 }}>
            <input value={newInsight} onChange={(e) => setNewInsight(e.target.value)} onKeyDown={(e) => { if(e.key==="Enter") handleAddInsight(); }} placeholder="Add your own insight..." style={Object.assign({},INPUT_STYLE,{flex:1})} />
            <Btn small onClick={handleAddInsight} disabled={!newInsight.trim()}>Add</Btn>
          </div>
        </Card>

        {(saved.length > 0 || skipped.length > 0) && (
          <Card>
            <SectionLabel>Recent history</SectionLabel>
            {saved.slice(0, 5).map((h, i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid "+C.border }}>
                <span style={{ fontSize:12,color:C.secondary,fontWeight:700 }}>✓</span>
                <span style={{ fontSize:13,color:C.text,fontFamily:FONT,flex:1,fontWeight:500 }}>{h.name}</span>
                {h.source && <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{h.source}</span>}
              </div>
            ))}
            {skipped.slice(0, 3).map((h, i) => (
              <div key={"s"+i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid "+C.border }}>
                <span style={{ fontSize:11,color:C.textTertiary,fontWeight:700,background:C.neutralLight,padding:"2px 6px",borderRadius:4 }}>skip</span>
                <span style={{ fontSize:13,color:C.textSecondary,fontFamily:FONT,flex:1,fontWeight:400 }}>{h.name}</span>
                {h.source && <span style={{ fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{h.source}</span>}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
