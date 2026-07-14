import { useState } from "react";

// ── Request helper ──
// IMPORTANT: we send the request WITHOUT Google cookies (credentials:"omit").
// If cookies go along, Google rewrites the URL to /macros/u/<N>/s/... to pick
// one of the user's signed-in accounts — and if that account can't see the
// script, the call dies. Omitting credentials makes it a plain anonymous
// request, which is what an "Anyone" deployment expects.
let jid = 0;

const viaJsonp = (base, params) => new Promise((resolve, reject) => {
  const cb = "irocCb" + (++jid) + "_" + Date.now();
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const script = document.createElement("script");
  const timer = setTimeout(() => { cleanup(); reject(new Error("timed out")); }, 25000);
  const cleanup = () => {
    clearTimeout(timer);
    try { delete window[cb]; } catch (e) { window[cb] = undefined; }
    if (script.parentNode) script.parentNode.removeChild(script);
  };
  window[cb] = (d) => { cleanup(); resolve(d); };
  script.onerror = () => { cleanup(); reject(new Error("blocked")); };
  script.src = `${base}?${qs}&callback=${cb}`;
  document.body.appendChild(script);
});

export const jsonp = async (base, params) => {
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const url = `${base}?${qs}&_=${Date.now()}`;
  // 1. cookie-less fetch — immune to the multi-account /u/N/ redirect
  try {
    const r = await fetch(url, {
      method: "GET",
      credentials: "omit",
      redirect: "follow",
      cache: "no-store",
    });
    if (r.ok) {
      const txt = await r.text();
      try { return JSON.parse(txt); }
      catch (e) { throw new Error("unexpected reply"); }
    }
    throw new Error("HTTP " + r.status);
  } catch (e) {
    // 2. fall back to JSONP (works where CORS is the blocker)
    return viaJsonp(base, params);
  }
};

const DAYS = ["Friday","Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const WEEKEND = ["Saturday","Sunday"];

const HOSPS = [
  { k:"EUH",   label:"EUH — Emory University",   color:"#3D7A8F", tab:"EUH" },
  { k:"MTWEM", label:"MT/WEM — Midtown",         color:"#4A7EA0", tab:"MTWEM" },
  { k:"EHH",   label:"EHH — Hillandale",         color:"#4A8A75", tab:"EHH-EDH" },
  { k:"EDH",   label:"EDH — Decatur",            color:"#7B6BA8", tab:"EHH-EDH" },
  { k:"ESJH",  label:"ESJH — Saint Joseph's",    color:"#B8892E", tab:"ESJH-EJCH" },
  { k:"EJCH",  label:"EJCH — Johns Creek",       color:"#A8524A", tab:"ESJH-EJCH" },
  { k:"GMH",   label:"GMH — Grady Memorial",     color:"#7A5A90", tab:"GMH" },
];
const TABKEY = { "EUH":"EUH", "EHH-EDH":"EHHEDH", "MTWEM":"MTWEM", "ESJH-EJCH":"ESJHEJCH", "GMH":"GMH" };

// ═══ Hoisted to module scope. Defining these INSIDE the parent makes React
// ═══ treat them as new component types on every keystroke, which remounts
// ═══ the input and steals focus after one character.
const mk = (T, dk) => ({
  lab: { fontSize:"9px", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase",
         color:T.textMuted, marginBottom:"3px", display:"block" },
  inp: { width:"100%", boxSizing:"border-box", padding:"10px", borderRadius:"8px",
         border:`1.5px solid ${T.cardBorder}`, background: dk ? "#2A2410" : "#FFF9DC",
         color:T.text, fontSize:"13px", fontFamily:"inherit", marginBottom:"10px" },
  row: { display:"flex", gap:"6px", alignItems:"center", marginBottom:"8px" },
});

function Picker({ T, dk, label, value, list, onChange }) {
  const S = mk(T, dk);
  return (
    <div>
      <label style={S.lab}>{label}</label>
      <select value={value || ""} onChange={e=>onChange(e.target.value)} style={S.inp}>
        <option value="">— none —</option>
        {list.map(n => <option key={n} value={n}>{n}</option>)}
        {value && !list.includes(value) && <option value={value}>{value}</option>}
      </select>
    </div>
  );
}

function Section({ id, title, color, open, toggle, children }) {
  return (
    <div>
      <div onClick={()=>toggle(id)}
        style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"9px 12px", borderRadius:"7px", background:color, color:"#fff",
          fontWeight:700, fontSize:"11px", letterSpacing:"0.5px", cursor:"pointer",
          marginTop:"14px", marginBottom:"8px" }}>
        <span>{title}</span><span>{open ? "▾" : "▸"}</span>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

/** Weekend day: labeled slots with editable times + unlimited extra rows. */
function WeekendDay({ T, dk, day, entry, list, color, onChange }) {
  const S = mk(T, dk);
  const slots = entry.slots || [];
  const upd = (i, f, v) => onChange({ ...entry,
    slots: slots.map((s,k)=> k===i ? {...s, [f]: v} : s) });
  return (
    <div style={{ marginBottom:"12px", padding:"10px", background:T.card,
      border:`1px solid ${T.cardBorder}`, borderRadius:"8px" }}>
      <div style={{ fontWeight:800, fontSize:"12px", color:T.text, marginBottom:"8px" }}>{day}</div>
      {slots.map((s,i)=>(
        <div key={i} style={{ marginBottom:"10px" }}>
          <label style={S.lab}>{s.label || "Additional"}</label>
          <div style={S.row}>
            <select value={s.name||""} onChange={e=>upd(i,"name",e.target.value)}
              style={{...S.inp, marginBottom:0, flex:2}}>
              <option value="">— none —</option>
              {list.map(n=><option key={n} value={n}>{n}</option>)}
              {s.name && !list.includes(s.name) && <option value={s.name}>{s.name}</option>}
            </select>
            <input value={s.time||""} placeholder="7a-7p"
              onChange={e=>upd(i,"time",e.target.value)}
              style={{...S.inp, marginBottom:0, flex:1, textAlign:"center", fontWeight:700}} />
            <div onClick={()=>onChange({...entry, slots: slots.filter((_,k)=>k!==i)})}
              style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
          </div>
        </div>
      ))}
      <div onClick={()=>onChange({...entry, slots:[...slots,{label:"Additional",name:"",time:""}]})}
        style={{ padding:"9px", textAlign:"center", border:`2px dashed ${color}`,
          borderRadius:"8px", color, fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
        + Add another person
      </div>
    </div>
  );
}

function WeekdayDay({ T, dk, day, people, list, color, onChange }) {
  const S = mk(T, dk);
  return (
    <div style={{ marginBottom:"10px", padding:"10px", background:T.card,
      border:`1px solid ${T.cardBorder}`, borderRadius:"8px" }}>
      <div style={{ fontWeight:800, fontSize:"12px", color:T.text, marginBottom:"8px" }}>
        {day} <span style={{ fontWeight:500, color:T.textMuted }}>· {people.length} on</span>
      </div>
      {people.map((p,i)=>(
        <div key={i} style={S.row}>
          <select value={p.name||""}
            onChange={e=>onChange(people.map((x,k)=>k===i?{...x,name:e.target.value}:x))}
            style={{...S.inp, marginBottom:0, flex:2}}>
            <option value="">— pick —</option>
            {list.map(x=><option key={x} value={x}>{x}</option>)}
            {p.name && !list.includes(p.name) && <option value={p.name}>{p.name}</option>}
          </select>
          <input value={p.time||""} placeholder="7a-3p"
            onChange={e=>onChange(people.map((x,k)=>k===i?{...x,time:e.target.value}:x))}
            style={{...S.inp, marginBottom:0, flex:1, textAlign:"center", fontWeight:700}} />
          <div onClick={()=>onChange(people.filter((_,k)=>k!==i))}
            style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
        </div>
      ))}
      {people.length < 6 && (
        <div onClick={()=>onChange([...people,{name:"",time:""}])}
          style={{ padding:"9px", textAlign:"center", border:`2px dashed ${color}`,
            borderRadius:"8px", color, fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
          + Add person
        </div>
      )}
    </div>
  );
}

// ═════════════════════════ MAIN ═════════════════════════
export default function EditMode({ endpoint, T, dk, onClose }) {
  const [step, setStep]       = useState("login");
  const [code, setCode]       = useState("");
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [data, setData]       = useState(null);
  const [hosp, setHosp]       = useState(null);
  const [form, setForm]       = useState(null);
  const [staff, setStaff]     = useState(null);
  const [savedAt, setSavedAt] = useState("");
  const [open, setOpen]       = useState({ ann:true, a:true });

  const S = mk(T, dk);
  const page = { position:"fixed", inset:0, zIndex:900, background:T.bg,
                 overflowY:"auto", WebkitOverflowScrolling:"touch" };
  const hdrS = { position:"sticky", top:0, zIndex:5, padding:"12px 14px",
                 display:"flex", alignItems:"center", gap:"8px" };
  const hbtn = { padding:"7px 12px", borderRadius:"8px", background:"#FFFFFF33",
                 color:"#fff", fontWeight:700, fontSize:"12px", cursor:"pointer", border:"none" };
  const body = { padding:"14px", paddingBottom:"70px" };
  const saveBtn = { width:"100%", padding:"14px", borderRadius:"10px", background:"#2A9D5A",
                    color:"#fff", fontWeight:700, fontSize:"15px", border:"none",
                    marginTop:"18px", cursor:"pointer" };
  const toggle = (id) => setOpen(o => ({ ...o, [id]: !o[id] }));
  const clean = () => (code || "").replace(/\s/g, "");

  const login = async () => {
    const c = clean();
    setBusy(true); setErr("");
    try {
      const r = await jsonp(endpoint, { mode:"auth", code:c });
      if (!r || !r.ok) { setErr(`Code not accepted. Sent: "${c}" (${c.length} chars)`); setBusy(false); return; }
      const d = await jsonp(endpoint, { mode:"data" });
      if (!d || !d.ok) { setErr((d && d.error) || "Signed in, but could not read the sheet."); setBusy(false); return; }
      setData(d.data); setStaff(d.data.staff); setStep("list");
    } catch (e) { setErr("Could not reach the script: " + e.message); }
    setBusy(false);
  };

  const names = (k) => (staff?.[k] || []).map(x=>x.name).filter(Boolean);
  const rnList = names("rns"), techList = names("techs"),
        docList = names("physicians"), resList = names("residents");

  const loadForm = (h) => {
    const d = data[h.k] || {};
    const tk = TABKEY[h.tab];
    return JSON.parse(JSON.stringify({
      ...d,
      banner: (data.banners && data.banners[tk]) || "",
      otherNumbers: (data.otherNumbers && data.otherNumbers[tk]) || [],
    }));
  };
  const openHosp = (h) => { setForm(loadForm(h)); setHosp(h); setStep("hosp"); setSavedAt(""); setErr(""); };

  const set = (path, val) => setForm(f => {
    const n = JSON.parse(JSON.stringify(f));
    let o = n; const p = path.split(".");
    for (let i=0;i<p.length-1;i++){ if(o[p[i]]===undefined) o[p[i]]={}; o=o[p[i]]; }
    o[p[p.length-1]] = val; return n;
  });

  const saveHosp = async () => {
    setBusy(true); setErr("");
    try {
      const r = await jsonp(endpoint, { mode:"save", code:clean(),
        payload: JSON.stringify({ hospital: hosp.k, fields: form }) });
      if (r && r.ok) setSavedAt(new Date().toLocaleTimeString());
      else setErr((r && r.error) || "Save failed.");
    } catch (e) { setErr("Save failed: " + e.message); }
    setBusy(false);
  };

  const saveStaff = async () => {
    setBusy(true); setErr("");
    try {
      const r = await jsonp(endpoint, { mode:"staff", code:clean(),
        payload: JSON.stringify(staff) });
      if (r && r.ok) setSavedAt(new Date().toLocaleTimeString());
      else setErr((r && r.error) || "Save failed.");
    } catch (e) { setErr("Save failed: " + e.message); }
    setBusy(false);
  };

  // ═══ LOGIN ═══
  if (step === "login") return (
    <div style={{...page, background:"#112240", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px"}}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔒</div>
      <div style={{ color:"#C8D8E8", fontWeight:800, fontSize:"20px" }}>Scheduler Access</div>
      <div style={{ color:"#8FA8C4", fontSize:"12px", marginTop:"6px", marginBottom:"22px" }}>
        Enter the scheduler code
      </div>
      <input type="text" inputMode="numeric" value={code}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        name="iroc-code" placeholder="code"
        onChange={e=>setCode(e.target.value.replace(/\s/g,""))}
        onKeyDown={e=>{ if(e.key==="Enter") login(); }}
        style={{ width:"210px", textAlign:"center", letterSpacing:"8px", fontSize:"22px",
          padding:"12px", borderRadius:"10px", border:"2px solid #3A5C86",
          background:"#1D3557", color:"#fff", fontWeight:700 }} />
      {err && <div style={{ color:"#F08A80", fontSize:"12px", marginTop:"14px",
        textAlign:"center", maxWidth:"300px", lineHeight:1.5 }}>{err}</div>}
      <button onClick={login} disabled={busy}
        style={{ marginTop:"18px", width:"210px", padding:"13px", borderRadius:"9px",
          background:"#3D7A8F", color:"#fff", fontWeight:700, fontSize:"14px",
          border:"none", opacity: busy?0.6:1 }}>
        {busy ? "Checking…" : "Unlock"}
      </button>
      <div onClick={onClose} style={{ marginTop:"20px", color:"#6B84A0",
        fontSize:"12px", cursor:"pointer" }}>Cancel</div>
    </div>
  );

  // ═══ SITE LIST ═══
  if (step === "list") return (
    <div style={page}>
      <div style={{...hdrS, background:"#C6922E"}}>
        <button style={hbtn} onClick={onClose}>✕ Exit</button>
        <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>EDIT MODE</div>
        <button style={hbtn} onClick={()=>{ setStep("staff"); setSavedAt(""); setErr(""); }}>👥 Staff</button>
      </div>
      <div style={body}>
        <div style={{ fontSize:"10px", fontWeight:800, letterSpacing:"1px", color:T.textMuted,
          textTransform:"uppercase", margin:"6px 0 10px" }}>Tap a site to edit</div>
        {HOSPS.map(h => {
          const filled = !!(data[h.k] && data[h.k].ir);
          return (
            <div key={h.k} onClick={()=>openHosp(h)}
              style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px",
                background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:"10px",
                marginBottom:"8px", borderLeft:`6px solid ${h.color}`, cursor:"pointer" }}>
              <div style={{ flex:1, fontWeight:700, fontSize:"14px", color:T.text }}>{h.label}</div>
              <div style={{ fontSize:"11px", fontWeight:700, color: filled?"#2A9D5A":"#C0392B" }}>
                {filled ? "● set" : "▲ empty"}
              </div>
              <div style={{ color:T.textMuted }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══ STAFF ═══
  if (step === "staff") {
    const groups = [["physicians","IR Physicians","#3D7A8F"],["residents","Residents","#7B6BA8"],
                    ["techs","IR Techs","#3A7A62"],["rns","IR Nurses","#2B6478"]];
    return (
      <div style={page}>
        <div style={{...hdrS, background:"#C6922E"}}>
          <button style={hbtn} onClick={()=>setStep("list")}>← Back</button>
          <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>Staff Roster</div>
        </div>
        <div style={body}>
          <div style={{ fontSize:"11px", color:T.textMuted, marginBottom:"6px" }}>
            Names here fill every dropdown. Phones auto-fill throughout the app.
          </div>
          {groups.map(([g,label,color]) => (
            <Section key={g} id={g} title={`${label}  (${(staff&&staff[g]?staff[g]:[]).length})`}
              color={color} open={!!open[g]} toggle={toggle}>
              {(staff&&staff[g]?staff[g]:[]).map((p,i)=>(
                <div key={i} style={S.row}>
                  <input value={p.name} placeholder="Name"
                    onChange={e=>setStaff(s=>{const n=JSON.parse(JSON.stringify(s));n[g][i].name=e.target.value;return n;})}
                    style={{...S.inp, marginBottom:0, flex:2}} />
                  <input value={p.phone} placeholder="Phone" inputMode="tel"
                    onChange={e=>setStaff(s=>{const n=JSON.parse(JSON.stringify(s));n[g][i].phone=e.target.value;return n;})}
                    style={{...S.inp, marginBottom:0, flex:1.3}} />
                  <div onClick={()=>setStaff(s=>{const n=JSON.parse(JSON.stringify(s));n[g].splice(i,1);return n;})}
                    style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
                </div>
              ))}
              <div onClick={()=>setStaff(s=>{const n=JSON.parse(JSON.stringify(s));
                if(!n[g])n[g]=[]; n[g].push({name:"",phone:""}); return n;})}
                style={{ padding:"10px", textAlign:"center", border:`2px dashed ${color}`,
                  borderRadius:"8px", color, fontWeight:700, fontSize:"12px",
                  cursor:"pointer", marginBottom:"6px" }}>+ Add</div>
            </Section>
          ))}
          {err && <div style={{ color:"#C0392B", fontSize:"12px", textAlign:"center", marginTop:"10px" }}>{err}</div>}
          <button style={{...saveBtn, opacity:busy?0.6:1}} onClick={saveStaff} disabled={busy}>
            {busy ? "Saving…" : savedAt ? `✓ Saved ${savedAt}` : "✓ Save roster"}
          </button>
        </div>
      </div>
    );
  }

  // ═══ HOSPITAL EDITOR ═══
  const isEUH = hosp.k === "EUH";
  const isGrid = ["MTWEM","ESJH","GMH"].indexOf(hosp.k) >= 0;
  const isEHHEDH = ["EHH","EDH"].indexOf(hosp.k) >= 0;
  const isEJCH = hosp.k === "EJCH";

  return (
    <div style={page}>
      <div style={{...hdrS, background: hosp.color}}>
        <button style={hbtn} onClick={()=>setStep("list")}>← Sites</button>
        <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>
          Edit {hosp.k}
        </div>
        <button style={hbtn} onClick={onClose}>✕</button>
      </div>

      <div style={body}>
        {/* ANNOUNCEMENTS — always first */}
        <Section id="ann" title="📢 ANNOUNCEMENTS" color="#B8892E" open={!!open.ann} toggle={toggle}>
          <div style={{ fontSize:"11px", color:T.textMuted, marginBottom:"6px" }}>
            Shows as a gold banner at the top of this site's page. Blank = no banner.
          </div>
          <textarea rows={3} value={form.banner||""} onChange={e=>set("banner", e.target.value)}
            placeholder="e.g. 2nd tech on all weekend due to volume"
            style={{...S.inp, resize:"vertical"}} />
        </Section>

        <div onClick={()=>{ setForm(loadForm(hosp)); setSavedAt(""); setErr(""); }}
          style={{ padding:"11px", textAlign:"center", border:`2px solid ${T.cardBorder}`,
            borderRadius:"9px", color:T.text, fontWeight:700, fontSize:"12px",
            cursor:"pointer", marginTop:"12px", background:T.card }}>
          ⧉ Copy last week
        </div>

        <Section id="a" title="IR PHYSICIAN + RESIDENT" color="#3D7A8F" open={!!open.a} toggle={toggle}>
          <Picker T={T} dk={dk} label="IR Physician (all week)" value={form.ir}
            list={docList} onChange={v=>set("ir", v)} />
          {(isEUH || isGrid) && (
            <Picker T={T} dk={dk} label="Resident (all week)" value={form.resident}
              list={resList} onChange={v=>set("resident", v)} />
          )}
        </Section>

        {isEUH && <>
          <Section id="rnwe" title="IR RN — WEEKEND" color="#2B6478" open={!!open.rnwe} toggle={toggle}>
            {WEEKEND.map(day=>(
              <WeekendDay key={day} T={T} dk={dk} day={day} list={rnList} color="#2B6478"
                entry={(form.rnWeekend && form.rnWeekend[day]) || {slots:[]}}
                onChange={v=>set(`rnWeekend.${day}`, v)} />
            ))}
          </Section>
          <Section id="rnwd" title="IR RN — WEEKDAY" color="#2B6478" open={!!open.rnwd} toggle={toggle}>
            {WEEKDAYS.map(day=>(
              <WeekdayDay key={day} T={T} dk={dk} day={day} list={rnList} color="#2B6478"
                people={(form.rnWeekday && form.rnWeekday[day]) || []}
                onChange={v=>set(`rnWeekday.${day}`, v)} />
            ))}
          </Section>
          <Section id="twe" title="IR TECH — WEEKEND" color="#3A7A62" open={!!open.twe} toggle={toggle}>
            {WEEKEND.map(day=>(
              <WeekendDay key={day} T={T} dk={dk} day={day} list={techList} color="#3A7A62"
                entry={(form.techWeekend && form.techWeekend[day]) || {slots:[]}}
                onChange={v=>set(`techWeekend.${day}`, v)} />
            ))}
          </Section>
          <Section id="twd" title="IR TECH — WEEKDAY" color="#3A7A62" open={!!open.twd} toggle={toggle}>
            {WEEKDAYS.map(day=>(
              <WeekdayDay key={day} T={T} dk={dk} day={day} list={techList} color="#3A7A62"
                people={(form.techWeekday && form.techWeekday[day]) || []}
                onChange={v=>set(`techWeekday.${day}`, v)} />
            ))}
          </Section>
        </>}

        {isGrid && <>
          <Section id="tech" title="IR TECH — by day" color="#3A7A62" open={!!open.tech} toggle={toggle}>
            {DAYS.map(day=>(
              <Picker key={day} T={T} dk={dk} label={day} value={form.tech && form.tech[day]}
                list={techList} onChange={v=>set(`tech.${day}`, v)} />
            ))}
          </Section>
          <Section id="rn" title="IR RN — by day" color="#2B6478" open={!!open.rn} toggle={toggle}>
            {DAYS.map(day=>(
              <Picker key={day} T={T} dk={dk} label={day} value={form.rn && form.rn[day]}
                list={rnList} onChange={v=>set(`rn.${day}`, v)} />
            ))}
          </Section>
        </>}

        {isEHHEDH && (
          <Section id="sup" title="SUPERVISORS + ANESTHESIA" color="#4A8A75" open={!!open.sup} toggle={toggle}>
            <label style={S.lab}>Nursing Supervisor</label>
            <input value={form.nurseSup||""} onChange={e=>set("nurseSup", e.target.value)} style={S.inp} />
            <label style={S.lab}>Radiology Supervisor</label>
            <input value={form.radSup||""} onChange={e=>set("radSup", e.target.value)} style={S.inp} />
            <label style={S.lab}>Anesthesia</label>
            <input value={form.anes||""} onChange={e=>set("anes", e.target.value)} style={S.inp} />
          </Section>
        )}

        {isEJCH && (
          <Section id="ejch" title="OCC + POS" color="#A8524A" open={!!open.ejch} toggle={toggle}>
            <label style={S.lab}>OCC</label>
            <input value={form.occ||""} onChange={e=>set("occ", e.target.value)} style={S.inp} />
            <label style={S.lab}>POS</label>
            <input value={form.pos||""} onChange={e=>set("pos", e.target.value)} style={S.inp} />
          </Section>
        )}

        <Section id="nums" title={`OTHER NUMBERS  (${(form.otherNumbers||[]).length})`}
          color="#4A7EA0" open={!!open.nums} toggle={toggle}>
          {(form.otherNumbers||[]).map((n,i)=>(
            <div key={i} style={S.row}>
              <input value={n.name||""} placeholder="Name"
                onChange={e=>set("otherNumbers", form.otherNumbers.map((x,k)=>k===i?{...x,name:e.target.value}:x))}
                style={{...S.inp, marginBottom:0, flex:2}} />
              <input value={n.phone||""} placeholder="Number" inputMode="tel"
                onChange={e=>set("otherNumbers", form.otherNumbers.map((x,k)=>k===i?{...x,phone:e.target.value}:x))}
                style={{...S.inp, marginBottom:0, flex:1.3}} />
              <div onClick={()=>set("otherNumbers", form.otherNumbers.filter((_,k)=>k!==i))}
                style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
            </div>
          ))}
          {(form.otherNumbers||[]).length < 50 && (
            <div onClick={()=>set("otherNumbers", [...(form.otherNumbers||[]), {name:"",phone:""}])}
              style={{ padding:"10px", textAlign:"center", border:"2px dashed #4A7EA0",
                borderRadius:"8px", color:"#4A7EA0", fontWeight:700, fontSize:"12px",
                cursor:"pointer" }}>+ Add number</div>
          )}
        </Section>

        {err && <div style={{ color:"#C0392B", fontSize:"12px", textAlign:"center",
          marginTop:"12px", lineHeight:1.5 }}>{err}</div>}

        <button style={{...saveBtn, opacity:busy?0.6:1}} onClick={saveHosp} disabled={busy}>
          {busy ? "Saving…" : savedAt ? `✓ Saved ${savedAt}` : `✓ Save ${hosp.k}`}
        </button>
        <div style={{ fontSize:"11px", color:T.textMuted, textAlign:"center", marginTop:"8px" }}>
          {(hosp.k==="EHH"||hosp.k==="EDH") && "Announcements & numbers are shared by EHH and EDH. "}
          {(hosp.k==="ESJH"||hosp.k==="EJCH") && "Announcements & numbers are shared by ESJH and EJCH. "}
          Live in the app within ~1 minute.
        </div>
      </div>
    </div>
  );
}
