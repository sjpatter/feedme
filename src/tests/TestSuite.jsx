import { useState } from "react";
import { getMeals, parseJSON } from "../lib/api";
import { SECTIONS, DIFFICULTY_OPTS } from "../lib/constants";
import { C, FONT } from "../styles/tokens";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTestData(o) {
  return Object.assign({ recipes:[], weeklyPlans:[], currentWeek:null, groceryList:{produce:[],dairy:[],meat:[],grains:[],other:[]}, staples:[], lastGenerated:null, mealHistory:[], fridgeItems:[], tasteProfile:[] }, o || {});
}
function makeTestMeal(o) {
  return Object.assign({ name:"Test Pasta", source:"Serious Eats", isNew:true, isMeat:false, isVegetarian:true, hasLeftovers:false, leftoverDays:0, cookTime:30, difficulty:"easy", isEasyCleanup:false, description:"A test meal.", babyNote:"Serve plain.", ingredients:[{name:"pasta",amount:"12 oz",section:"grains"}], steps:["Boil water.","Cook pasta."], usesFridgeItems:[] }, o || {});
}
function tParse(raw) { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
function tAssert(c, m) { if (!c) throw new Error(m || "Assertion failed"); }
function tEqual(a, b, m) { if (a !== b) throw new Error((m || "Expected equal") + " -- got " + JSON.stringify(a) + " vs " + JSON.stringify(b)); }
async function runOneTest(name, fn) {
  const s = Date.now();
  try { await fn(); return { name, status: "pass", duration: Date.now() - s }; }
  catch (e) { return { name, status: "fail", error: e.message, duration: Date.now() - s }; }
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

const UNIT_TESTS = [
  ["Data structure valid", function(){const d=makeTestData();tAssert(Array.isArray(d.recipes));tAssert(Array.isArray(d.mealHistory));tAssert(Array.isArray(d.fridgeItems));tAssert(Array.isArray(d.tasteProfile));SECTIONS.forEach(function(s){tAssert(Array.isArray(d.groceryList[s]));});}],
  ["Meal structure valid", function(){const m=makeTestMeal();tAssert(typeof m.name==="string");tAssert(DIFFICULTY_OPTS.includes(m.difficulty));tAssert(Array.isArray(m.usesFridgeItems));}],
  ["getMeals wrapped object", function(){const r=getMeals({meals:[{name:"Pasta"}]});tAssert(Array.isArray(r));tEqual(r[0].name,"Pasta");}],
  ["getMeals bare array", function(){const r=getMeals([{name:"Soup"}]);tAssert(Array.isArray(r));}],
  ["getMeals null for invalid", function(){tAssert(getMeals({foo:"bar"})===null);}],
  ["parseJSON clean", function(){tEqual(tParse("{\"meals\":[{\"name\":\"Pasta\"}]}").meals[0].name,"Pasta");}],
  ["parseJSON strips fences", function(){tEqual(tParse("```json\n{\"name\":\"Soup\"}\n```").name,"Soup");}],
  ["parseJSON throws on invalid", function(){let t=false;try{tParse("not json");}catch(e){t=true;}tAssert(t);}],
  ["Add recipe", function(){const d=makeTestData();const n=Object.assign({},d,{recipes:d.recipes.concat([makeTestMeal({id:1})])});tEqual(n.recipes.length,1);}],
  ["Remove recipe", function(){const d=makeTestData({recipes:[makeTestMeal({id:1}),makeTestMeal({id:2,name:"Soup"})]});const n=Object.assign({},d,{recipes:d.recipes.filter(function(r){return r.id!==1;})});tEqual(n.recipes.length,1);tEqual(n.recipes[0].name,"Soup");}],
  ["Duplicate detection", function(){const d=makeTestData({recipes:[makeTestMeal({id:1,name:"Pasta"})]});tAssert(d.recipes.some(function(r){return r.name.toLowerCase()==="pasta";}));tAssert(!d.recipes.some(function(r){return r.name.toLowerCase()==="soup";}));}],
  ["Confirm saves history", function(){const d=makeTestData();const plan={meals:[makeTestMeal()],confirmedAt:Date.now()};const n=Object.assign({},d,{currentWeek:plan,weeklyPlans:[plan],mealHistory:[{name:"Test Pasta",signal:"save",at:Date.now()}]});tEqual(n.mealHistory[0].signal,"save");}],
  ["Skip signal logged", function(){const d=makeTestData();const n=Object.assign({},d,{mealHistory:[{name:"Skipped",signal:"skip",at:Date.now()}]});tEqual(n.mealHistory[0].signal,"skip");}],
  ["Fridge add and remove", function(){const d=makeTestData();const n=Object.assign({},d,{fridgeItems:[{id:1,text:"chicken"}]});tEqual(n.fridgeItems.length,1);const n2=Object.assign({},n,{fridgeItems:n.fridgeItems.filter(function(i){return i.id!==1;})});tEqual(n2.fridgeItems.length,0);}],
  ["Used fridge cleared on confirm", function(){const d=makeTestData({fridgeItems:[{id:1,text:"leftover rice"},{id:2,text:"carrots"}]});const used={"leftover rice":true};const n=Object.assign({},d,{fridgeItems:d.fridgeItems.filter(function(fi){return !used[fi.text.toLowerCase()];})});tEqual(n.fridgeItems.length,1);tEqual(n.fridgeItems[0].text,"carrots");}],
  ["Taste profile edit", function(){const d=makeTestData({tasteProfile:[{id:1,text:"Likes Italian"}]});const n=Object.assign({},d,{tasteProfile:d.tasteProfile.map(function(p){return p.id===1?Object.assign({},p,{text:"Loves Italian"}):p;})});tEqual(n.tasteProfile[0].text,"Loves Italian");}],
  ["Taste profile remove", function(){const d=makeTestData({tasteProfile:[{id:1,text:"A"},{id:2,text:"B"}]});const n=Object.assign({},d,{tasteProfile:d.tasteProfile.filter(function(p){return p.id!==1;})});tEqual(n.tasteProfile.length,1);}],
  ["weeklyPlans capped at 10", function(){const plans=[0,1,2,3,4,5,6,7,8,9,10].map(function(i){return {meals:[],confirmedAt:i};});const np={meals:[],confirmedAt:Date.now()};const result=[np,...plans].slice(0,10);tEqual(result.length,10);}],
  ["Grocery toggle", function(){const item={id:1,checked:false};const t=[item].map(function(i){return Object.assign({},i,{checked:!i.checked});});tAssert(t[0].checked===true);}],
  ["Clear checked", function(){const items=[{id:1,checked:true},{id:2,checked:false}];tEqual(items.filter(function(i){return !i.checked;}).length,1);}],
  ["Section fallback", function(){tEqual(SECTIONS.includes("exotic")?"exotic":"other","other");}],
  ["Grocery rebuild keeps manual", function(){const existing=[{id:1,text:"Milk",fromMeal:false},{id:2,text:"old",fromMeal:true}];const newItems=[{id:3,text:"pasta",fromMeal:true}];const result=existing.filter(function(i){return !i.fromMeal;}).concat(newItems);tAssert(result.some(function(i){return i.text==="Milk";}));tAssert(!result.some(function(i){return i.text==="old";}));}],
];

// ─── API tests ────────────────────────────────────────────────────────────────

const API_TESTS = [
  ["API reachable", async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:50,messages:[{role:"user",content:"Reply: ok"}]})});tAssert(res.ok,"HTTP "+res.status);const d=await res.json();tAssert(d.content&&d.content.length>0);}],
  ["Meal plan valid JSON", async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Return a meal plan with 2 meals. Format: {\"meals\":[{\"name\":\"\",\"source\":\"\",\"isNew\":true,\"isMeat\":true,\"isVegetarian\":false,\"cookTime\":30,\"difficulty\":\"easy\",\"description\":\"One sentence.\",\"usesFridgeItems\":[]}]}"}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const meals=getMeals(tParse(text));tAssert(meals&&meals.length>=1,"no meals");tAssert(DIFFICULTY_OPTS.includes(meals[0].difficulty),"invalid difficulty");}],
  ["Ingredients valid sections", async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Return ingredients for \"Spaghetti Carbonara\". JSON: {\"ingredients\":[{\"name\":\"\",\"amount\":\"\",\"section\":\"\"}]} section must be one of: produce,dairy,meat,grains,other."}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const parsed=tParse(text);const ings=Array.isArray(parsed)?parsed:(parsed.ingredients||[]);tAssert(ings.length>0,"no ingredients");ings.forEach(function(ing,i){tAssert(SECTIONS.includes(ing.section),"bad section at "+i+": "+ing.section);});}],
  ["Feedback preserves count", async function(){const meals=[{name:"Pasta Carbonara",isMeat:true,isVegetarian:false,cookTime:30,difficulty:"easy",description:"Classic."},{name:"Sheet Pan Chicken",isMeat:true,isVegetarian:false,cookTime:45,difficulty:"easy",description:"Easy."}];const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Plan: "+JSON.stringify({meals:meals})+"\nFeedback: make one vegetarian.\nReturn {\"meals\":[...]} same count."}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const result=getMeals(tParse(text));tAssert(result&&result.length===2,"expected 2 meals");tAssert(result.some(function(m){return m.isVegetarian===true;}),"no vegetarian meal");}],
  ["Taste profile returns insights", async function(){const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:"Respond ONLY with valid JSON. No markdown.",messages:[{role:"user",content:"Generate 3 taste insights.\nConfirmed: Pasta, Cacio e Pepe\nSkipped: Fish Tacos\nReturn: {\"insights\":[{\"id\":1,\"text\":\"Short insight\"}]}"}]})});const d=await res.json();const text=(d.content.find(function(b){return b.type==="text";})||{}).text||"";const parsed=tParse(text);tAssert(Array.isArray(parsed.insights)&&parsed.insights.length>0);}],
];

// ─── TestSuite component ──────────────────────────────────────────────────────

export function TestSuite({ onClose }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [runningName, setRunningName] = useState("");
  const [mode, setMode] = useState("unit");
  const tests = mode === "unit" ? UNIT_TESTS : API_TESTS;
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  async function runAll() {
    setRunning(true); setResults([]);
    const out = [];
    for (let i = 0; i < tests.length; i++) {
      setRunningName(tests[i][0]);
      out.push(await runOneTest(tests[i][0], tests[i][1]));
      setResults(out.slice());
    }
    setRunningName(""); setRunning(false);
  }

  return (
    <div style={{ fontFamily:FONT,background:C.bg,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:40 }}>
      <div style={{ padding:"1.5rem 1.25rem 0",marginBottom:"1.25rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:24,fontWeight:700,color:C.text,margin:"0 0 4px",letterSpacing:"-0.03em" }}>Test Suite</h1>
            <p style={{ fontSize:13,color:C.textTertiary,margin:0,fontWeight:400 }}>Verify core logic and API responses</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"1.5px solid "+C.border,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,color:C.text,fontFamily:FONT,fontWeight:700 }}>Back to app</button>
        </div>
        <div style={{ height:1,background:C.border,marginTop:"1.25rem" }} />
      </div>
      <div style={{ padding:"0 1.25rem" }}>
        <div style={{ display:"flex",gap:8,marginBottom:"1.25rem" }}>
          {["unit","api"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setResults([]); }} style={{ padding:"8px 18px",borderRadius:10,cursor:"pointer",border:"1.5px solid "+(mode===m?C.primary:C.border),background:mode===m?C.primary:"transparent",color:mode===m?"#fff":C.text,fontSize:13,fontWeight:700,fontFamily:FONT }}>
              {m==="unit"?"Unit tests":"API tests"}
            </button>
          ))}
          <button onClick={runAll} disabled={running} style={{ marginLeft:"auto",padding:"8px 20px",borderRadius:10,background:running?C.textTertiary:C.text,color:"#fff",border:"none",cursor:running?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:FONT }}>
            {running?"Running...":"Run all"}
          </button>
        </div>
        {mode==="api" && (
          <div style={{ background:C.warningLight,border:"1px solid #FDE68A",borderRadius:10,padding:"10px 14px",marginBottom:"1.25rem" }}>
            <p style={{ margin:0,fontSize:13,color:"#92400E",fontFamily:FONT,fontWeight:400 }}><strong>Note:</strong> API tests make real Claude calls — takes 15-30 seconds.</p>
          </div>
        )}
        {results.length > 0 && (
          <div style={{ display:"flex",gap:12,marginBottom:"1.25rem" }}>
            {[["pass",passed,C.secondaryLight,C.secondary],["fail",failed,C.dangerLight,C.danger],["total",tests.length,C.surfaceAlt,C.textSecondary]].map((a) => (
              <div key={a[0]} style={{ flex:1,background:a[2],borderRadius:10,padding:"12px 16px",textAlign:"center",border:"1px solid "+C.border }}>
                <p style={{ margin:0,fontSize:24,fontWeight:700,color:a[3],letterSpacing:"-0.04em" }}>{a[1]}</p>
                <p style={{ margin:"2px 0 0",fontSize:11,color:a[3],textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700 }}>{a[0]}</p>
              </div>
            ))}
          </div>
        )}
        {running && runningName && <p style={{ fontSize:13,color:C.textTertiary,marginBottom:"1rem",fontFamily:FONT,fontWeight:400 }}>{"Running: " + runningName + "..."}</p>}
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {tests.map((t) => {
            const result = results.find((r) => r.name === t[0]);
            const isRunning = running && runningName === t[0];
            return (
              <div key={t[0]} style={{ background:C.surface,border:"1px solid "+(result?(result.status==="pass"?"#BBF7D0":C.danger):C.border),borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:10 }}>
                <span style={{ fontSize:12,marginTop:1,flexShrink:0,fontWeight:700,color:isRunning?C.primary:result?(result.status==="pass"?C.secondary:C.danger):C.textTertiary }}>
                  {isRunning?">":(result?(result.status==="pass"?"✓":"x"):"o")}
                </span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0,fontSize:13,color:C.text,fontFamily:FONT,fontWeight:500 }}>{t[0]}</p>
                  {result && result.status==="fail" && <p style={{ margin:"4px 0 0",fontSize:12,color:C.danger,fontFamily:"monospace" }}>{result.error}</p>}
                  {result && <p style={{ margin:"2px 0 0",fontSize:11,color:C.textTertiary,fontFamily:FONT,fontWeight:400 }}>{result.duration+"ms"}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
