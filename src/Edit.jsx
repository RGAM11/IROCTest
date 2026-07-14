import { useState, useEffect } from "react";

// ── JSONP: lets us read the response cross-origin (fetch/no-cors can't) ──
let jid = 0;
export const jsonp = (base, params) => new Promise((resolve, reject) => {
  const cb = "irocCb" + (++jid) + "_" + Date.now();
  const qs = Object.keys(params)
    .map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const script = document.createElement("script");
  const timer = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 25000);
  const cleanup = () => {
    clearTimeout(timer);
    try { delete window[cb]; } catch (e) { window[cb] = undefined; }
    if (script.parentNode) script.parentNode.removeChild(script);
  };
  window[cb] = (data) => { cleanup(); resolve(data); };
  script.onerror = () => { cleanup(); reject(new Error("network")); };
  script.src = `${base}?${qs}&callback=${cb}`;
  document.body.appendChild(script);
});

const DAYS = ["Friday","Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const WEEKEND = ["Saturday","Sunday"];

// hospital key → { label, color, tab (for shared banner/numbers) }
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

export default function EditMode({ endpoint, T, dk, onClose }) {
  const [step, setStep]       = useState("login"); // login | list | hosp | staff
  const [code, setCode]       = useState("");
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [data, setData]       = useState(null);
  const [hosp, setHosp]       = useState(null);
  const [form, setForm]       = useState(null);
  const [staff, setStaff]     = useState(null);
  const [savedAt, setSavedAt] = useState("");
  const [open, setOpen]       = useState({ a:true });

  const S = {
    page:  { position:"fixed", inset:0, zIndex:900, background:T.bg, overflowY:"auto", WebkitOverflowScrolling:"touch" },
    hdr:   { position:"sticky", top:0, zIndex:5, background:"#C6922E", padding:"12px 14px",
             display:"flex", alignItems:"center", gap:"8px" },
    hbtn:  { padding:"7px 12px", borderRadius:"8px", background:"#FFFFFF33", color:"#fff",
             fontWeight:700, fontSize:"12px", cursor:"pointer", border:"none" },
    body:  { padding:"14px", paddingBottom:"60px" },
    lab:   { fontSize:"9px", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase",
             color:T.textMuted, marginBottom:"3px", display:"block" },
    inp:   { width:"100%", boxSizing:"border-box", padding:"10px", borderRadius:"8px",
             border:`1.5px solid ${T.cardBorder}`, background: dk ? "#2A2410" : "#FFF9DC",
             color:T.text, fontSize:"13px", fontFamily:"inherit", marginBottom:"10px" },
    sect:  (c)=>({ display:"flex", justifyContent:"space-between", alignItems:"center",
             padding:"9px 12px", borderRadius:"7px", background:c, color:"#fff",
             fontWeight:700, fontSize:"11px", letterSpacing:"0.5px", cursor:"pointer",
             marginTop:"14px", marginBottom:"8px" }),
    save:  { width:"100%", padding:"14px", borderRadius:"10px", background:"#2A9D5A",
             color:"#fff", fontWeight:700, fontSize:"15px", border:"none", marginTop:"18px", cursor:"pointer" },
    row:   { display:"flex", gap:"6px", alignItems:"center", marginBottom:"8px" },
    small: { fontSize:"11px", color:T.textMuted, textAlign:"center", marginTop:"8px" },
  };

  // ── login ──
  const login = async () => {
    setBusy(true); setErr("");
    try {
      const c = (code || "").trim();
      const r = await jsonp(endpoint, { mode:"auth", code: c });
      if (!r.ok) { setErr(`Code not accepted (you sent "${c}"). Check for autofill or spaces.`); setBusy(false); return; }
      const d = await jsonp(endpoint, { mode:"data" });
      if (!d.ok) { setErr(d.error || "Could not load."); setBusy(false); return; }
      setData(d.data); setStaff(d.data.staff); setStep("list");
    } catch (e) { setErr("Connection failed. Try again."); }
    setBusy(false);
  };

  const names = (kind) => (staff?.[kind] || []).map(x => x.name).filter(Boolean);
  const rnList = names("rns"), techList = names("techs"),
        docList = names("physicians"), resList = names("residents");

  // ── build the editable form for a hospital ──
  const openHosp = (h) => {
    const d = data[h.k] || {};
    const tk = TABKEY[h.tab];
    setForm(JSON.parse(JSON.stringify({
      ...d,
      banner: data.banners?.[tk] || "",
      otherNumbers: data.otherNumbers?.[tk] || [],
    })));
    setHosp(h); setStep("hosp"); setSavedAt("");
  };

  const set = (path, val) => {
    setForm(f => {
      const n = JSON.parse(JSON.stringify(f));
      let o = n; const p = path.split(".");
      for (let i=0;i<p.length-1;i++){ if(o[p[i]]===undefined) o[p[i]]={}; o=o[p[i]]; }
      o[p[p.length-1]] = val; return n;
    });
  };

  const saveHosp = async () => {
    setBusy(true); setErr("");
    try {
      const r = await jsonp(endpoint, {
        mode:"save", code: (code||"").trim(), payload: JSON.stringify({ hospital: hosp.k, fields: form })
      });
      if (r.ok) { setSavedAt(new Date().toLocaleTimeString()); }
      else setErr(r.error || "Save failed.");
    } catch (e) { setErr("Save failed — check your connection."); }
    setBusy(false);
  };

  const saveStaff = async () => {
    setBusy(true); setErr("");
    try {
      const r = await jsonp(endpoint, { mode:"staff", code: (code||"").trim(), payload: JSON.stringify(staff) });
      if (r.ok) setSavedAt(new Date().toLocaleTimeString());
      else setErr(r.error || "Save failed.");
    } catch (e) { setErr("Save failed."); }
    setBusy(false);
  };

  // ── shared bits ──
  const Picker = ({ label, value, list, onChange }) => (
    <div>
      <label style={S.lab}>{label}</label>
      <select value={value || ""} onChange={e=>onChange(e.target.value)} style={S.inp}>
        <option value="">— none —</option>
        {list.map(n => <option key={n} value={n}>{n}</option>)}
        {value && !list.includes(value) && <option value={value}>{value}</option>}
      </select>
    </div>
  );

  const Section = ({ id, title, color, children }) => (
    <div>
      <div style={S.sect(color)} onClick={()=>setOpen(o=>({...o,[id]:!o[id]}))}>
        <span>{title}</span><span>{open[id] ? "▾" : "▸"}</span>
      </div>
      {open[id] && <div>{children}</div>}
    </div>
  );

  // ═══════════ LOGIN ═══════════
  if (step === "login") return (
    <div style={{...S.page, background:"#112240", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px"}}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔒</div>
      <div style={{ color:"#C8D8E8", fontWeight:800, fontSize:"20px" }}>Scheduler Access</div>
      <div style={{ color:"#8FA8C4", fontSize:"12px", marginTop:"6px", marginBottom:"22px" }}>
        Enter the scheduler code
      </div>
      <input type="text" inputMode="numeric" value={code}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        name="iroc-scheduler-code"
        placeholder="code"
        onChange={e=>setCode(e.target.value.replace(/\s/g, ""))}
        onKeyDown={e=>{ if(e.key==="Enter") login(); }}
        style={{ width:"200px", textAlign:"center", letterSpacing:"8px", fontSize:"22px",
          padding:"12px", borderRadius:"10px", border:"2px solid #3A5C86",
          background:"#1D3557", color:"#fff", fontWeight:700 }} />
      {err && <div style={{ color:"#F08A80", fontSize:"12px", marginTop:"12px" }}>{err}</div>}
      <button onClick={login} disabled={busy}
        style={{ marginTop:"18px", width:"200px", padding:"13px", borderRadius:"9px",
          background:"#3D7A8F", color:"#fff", fontWeight:700, fontSize:"14px", border:"none",
          opacity: busy ? 0.6 : 1 }}>
        {busy ? "Checking…" : "Unlock"}
      </button>
      <div onClick={onClose} style={{ marginTop:"20px", color:"#6B84A0", fontSize:"12px", cursor:"pointer" }}>
        Cancel
      </div>
    </div>
  );

  // ═══════════ HOSPITAL LIST ═══════════
  if (step === "list") return (
    <div style={S.page}>
      <div style={S.hdr}>
        <button style={S.hbtn} onClick={onClose}>✕ Exit</button>
        <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>
          EDIT MODE
        </div>
        <button style={S.hbtn} onClick={()=>{ setStep("staff"); setSavedAt(""); }}>👥 Staff</button>
      </div>
      <div style={S.body}>
        <div style={{ fontSize:"10px", fontWeight:800, letterSpacing:"1px", color:T.textMuted,
          textTransform:"uppercase", margin:"6px 0 10px" }}>Tap a site to edit</div>
        {HOSPS.map(h => {
          const d = data[h.k] || {};
          const filled = !!(d.ir);
          return (
            <div key={h.k} onClick={()=>openHosp(h)}
              style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px",
                background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:"10px",
                marginBottom:"8px", borderLeft:`6px solid ${h.color}`, cursor:"pointer" }}>
              <div style={{ flex:1, fontWeight:700, fontSize:"14px", color:T.text }}>{h.label}</div>
              <div style={{ fontSize:"11px", fontWeight:700,
                color: filled ? "#2A9D5A" : "#C0392B" }}>
                {filled ? "● set" : "▲ empty"}
              </div>
              <div style={{ color:T.textMuted }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════ STAFF ROSTER ═══════════
  if (step === "staff") {
    const groups = [
      ["physicians","IR Physicians","#3D7A8F"],
      ["residents","Residents","#7B6BA8"],
      ["techs","IR Techs","#3A7A62"],
      ["rns","IR Nurses","#2B6478"],
    ];
    const upd = (g,i,field,v) => setStaff(s => {
      const n = JSON.parse(JSON.stringify(s));
      n[g][i][field] = v; return n;
    });
    const add = (g) => setStaff(s => {
      const n = JSON.parse(JSON.stringify(s));
      if (!n[g]) n[g]=[]; n[g].push({name:"",phone:""}); return n;
    });
    const del = (g,i) => setStaff(s => {
      const n = JSON.parse(JSON.stringify(s));
      n[g].splice(i,1); return n;
    });
    return (
      <div style={S.page}>
        <div style={S.hdr}>
          <button style={S.hbtn} onClick={()=>setStep("list")}>← Back</button>
          <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>
            Staff Roster
          </div>
        </div>
        <div style={S.body}>
          <div style={{ fontSize:"11px", color:T.textMuted, marginBottom:"6px" }}>
            Names here fill every dropdown. Phone numbers auto-fill throughout the app.
          </div>
          {groups.map(([g,label,color]) => (
            <Section key={g} id={g} title={`${label}  (${(staff?.[g]||[]).length})`} color={color}>
              {(staff?.[g]||[]).map((p,i) => (
                <div key={i} style={S.row}>
                  <input value={p.name} placeholder="Name"
                    onChange={e=>upd(g,i,"name",e.target.value)}
                    style={{...S.inp, marginBottom:0, flex:2}} />
                  <input value={p.phone} placeholder="Phone" inputMode="tel"
                    onChange={e=>upd(g,i,"phone",e.target.value)}
                    style={{...S.inp, marginBottom:0, flex:1.3}} />
                  <div onClick={()=>del(g,i)} style={{ color:"#C0392B", fontWeight:800,
                    padding:"0 6px", cursor:"pointer" }}>✕</div>
                </div>
              ))}
              <div onClick={()=>add(g)} style={{ padding:"10px", textAlign:"center",
                border:`2px dashed ${color}`, borderRadius:"8px", color:color,
                fontWeight:700, fontSize:"12px", cursor:"pointer", marginBottom:"6px" }}>
                + Add
              </div>
            </Section>
          ))}
          {err && <div style={{ color:"#C0392B", fontSize:"12px", textAlign:"center", marginTop:"10px" }}>{err}</div>}
          <button style={{...S.save, opacity: busy?0.6:1}} onClick={saveStaff} disabled={busy}>
            {busy ? "Saving…" : savedAt ? `✓ Saved ${savedAt}` : "✓ Save roster"}
          </button>
          <div style={S.small}>Writes to the Staff Roster tab</div>
        </div>
      </div>
    );
  }

  // ═══════════ HOSPITAL EDITOR ═══════════
  const isEUH = hosp.k === "EUH";
  const isGrid = ["MTWEM","ESJH","GMH"].includes(hosp.k);
  const isEHHEDH = ["EHH","EDH"].includes(hosp.k);
  const isEJCH = hosp.k === "EJCH";

  const WeekendBlock = ({ pathKey, nIH, list, color, title }) => (
    <Section id={pathKey} title={title} color={color}>
      {WEEKEND.map(day => {
        const e = form[pathKey]?.[day] || {};
        return (
          <div key={day} style={{ marginBottom:"10px", padding:"10px",
            background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:"8px" }}>
            <div style={{ fontWeight:800, fontSize:"12px", color:T.text, marginBottom:"8px" }}>{day}</div>
            {Array.from({length:nIH}).map((_,i)=>(
              <Picker key={i} label={`In-House ${i+1}  (7a-7:30p)`}
                value={(e.inHouse||[])[i]} list={list}
                onChange={v=>{ const ih=[...(e.inHouse||[])]; ih[i]=v; set(`${pathKey}.${day}.inHouse`, ih); }} />
            ))}
            <Picker label="Primary day  (7a-7p)" value={e.primaryDay} list={list}
              onChange={v=>set(`${pathKey}.${day}.primaryDay`, v)} />
            <Picker label="Primary night  (7p-7a)" value={e.primaryNight} list={list}
              onChange={v=>set(`${pathKey}.${day}.primaryNight`, v)} />
            <Picker label="2nd  (7p-7a)" value={e.second} list={list}
              onChange={v=>set(`${pathKey}.${day}.second`, v)} />
          </div>
        );
      })}
    </Section>
  );

  const WeekdayBlock = ({ pathKey, list, color, title }) => (
    <Section id={pathKey} title={title} color={color}>
      {WEEKDAYS.map(day => {
        const people = form[pathKey]?.[day] || [];
        return (
          <div key={day} style={{ marginBottom:"10px", padding:"10px",
            background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:"8px" }}>
            <div style={{ fontWeight:800, fontSize:"12px", color:T.text, marginBottom:"8px" }}>
              {day} <span style={{ fontWeight:500, color:T.textMuted }}>· {people.length} on</span>
            </div>
            {people.map((p,i)=>(
              <div key={i} style={S.row}>
                <select value={p.name||""} onChange={e=>{
                    const n=[...people]; n[i]={...n[i],name:e.target.value}; set(`${pathKey}.${day}`, n);
                  }} style={{...S.inp, marginBottom:0, flex:2}}>
                  <option value="">— pick —</option>
                  {list.map(x=><option key={x} value={x}>{x}</option>)}
                  {p.name && !list.includes(p.name) && <option value={p.name}>{p.name}</option>}
                </select>
                <input value={p.time||""} placeholder="7a-3p"
                  onChange={e=>{ const n=[...people]; n[i]={...n[i],time:e.target.value}; set(`${pathKey}.${day}`, n); }}
                  style={{...S.inp, marginBottom:0, flex:1, textAlign:"center", fontWeight:700}} />
                <div onClick={()=>{ const n=people.filter((_,k)=>k!==i); set(`${pathKey}.${day}`, n); }}
                  style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
              </div>
            ))}
            {people.length < 4 && (
              <div onClick={()=>set(`${pathKey}.${day}`, [...people, {name:"",time:""}])}
                style={{ padding:"9px", textAlign:"center", border:`2px dashed ${color}`,
                  borderRadius:"8px", color:color, fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                + Add person
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );

  return (
    <div style={S.page}>
      <div style={{...S.hdr, background: hosp.color}}>
        <button style={S.hbtn} onClick={()=>setStep("list")}>← Sites</button>
        <div style={{ flex:1, textAlign:"center", color:"#fff", fontWeight:800, fontSize:"14px" }}>
          Edit {hosp.k}
        </div>
        <button style={S.hbtn} onClick={onClose}>✕</button>
      </div>

      <div style={S.body}>
        {/* IR + Resident */}
        <Section id="a" title="① IR PHYSICIAN + RESIDENT" color="#3D7A8F">
          <Picker label="IR Physician (all week)" value={form.ir} list={docList}
            onChange={v=>set("ir", v)} />
          {(isEUH || isGrid) && (
            <Picker label="Resident (all week)" value={form.resident} list={resList}
              onChange={v=>set("resident", v)} />
          )}
        </Section>

        {/* EUH composite roles */}
        {isEUH && <>
          <WeekendBlock pathKey="rnWeekend"   nIH={3} list={rnList}   color="#2B6478" title="② IR RN — WEEKEND" />
          <WeekdayBlock pathKey="rnWeekday"          list={rnList}   color="#2B6478" title="③ IR RN — WEEKDAY" />
          <WeekendBlock pathKey="techWeekend" nIH={2} list={techList} color="#3A7A62" title="④ IR TECH — WEEKEND" />
          <WeekdayBlock pathKey="techWeekday"        list={techList} color="#3A7A62" title="⑤ IR TECH — WEEKDAY" />
        </>}

        {/* MTWEM / ESJH / GMH — per-day tech + RN */}
        {isGrid && <>
          <Section id="tech" title="② IR TECH — by day" color="#3A7A62">
            {DAYS.map(day => (
              <Picker key={day} label={day} value={form.tech?.[day]} list={techList}
                onChange={v=>set(`tech.${day}`, v)} />
            ))}
          </Section>
          <Section id="rn" title="③ IR RN — by day" color="#2B6478">
            {DAYS.map(day => (
              <Picker key={day} label={day} value={form.rn?.[day]} list={rnList}
                onChange={v=>set(`rn.${day}`, v)} />
            ))}
          </Section>
        </>}

        {/* EHH / EDH */}
        {isEHHEDH && (
          <Section id="sup" title="② SUPERVISORS + ANESTHESIA" color="#4A8A75">
            <label style={S.lab}>Nursing Supervisor</label>
            <input value={form.nurseSup||""} onChange={e=>set("nurseSup", e.target.value)}
              placeholder="Phone or name" style={S.inp} />
            <label style={S.lab}>Radiology Supervisor</label>
            <input value={form.radSup||""} onChange={e=>set("radSup", e.target.value)}
              placeholder="Phone or name" style={S.inp} />
            <label style={S.lab}>Anesthesia</label>
            <input value={form.anes||""} onChange={e=>set("anes", e.target.value)}
              placeholder="Phone or name" style={S.inp} />
          </Section>
        )}

        {/* EJCH */}
        {isEJCH && (
          <Section id="ejch" title="② OCC + POS" color="#A8524A">
            <label style={S.lab}>OCC</label>
            <input value={form.occ||""} onChange={e=>set("occ", e.target.value)} style={S.inp} />
            <label style={S.lab}>POS</label>
            <input value={form.pos||""} onChange={e=>set("pos", e.target.value)} style={S.inp} />
          </Section>
        )}

        {/* Special instructions */}
        <Section id="banner" title="⚑ SPECIAL INSTRUCTIONS" color="#B8892E">
          <div style={{ fontSize:"11px", color:T.textMuted, marginBottom:"6px" }}>
            Shows as a gold banner on this hospital's page. Leave blank for none.
          </div>
          <textarea rows={3} value={form.banner||""} onChange={e=>set("banner", e.target.value)}
            placeholder="e.g. 2nd tech on all weekend due to volume"
            style={{...S.inp, resize:"vertical"}} />
        </Section>

        {/* Other numbers */}
        <Section id="nums" title={`✆ OTHER NUMBERS  (${(form.otherNumbers||[]).length})`} color="#4A7EA0">
          {(form.otherNumbers||[]).map((n,i)=>(
            <div key={i} style={S.row}>
              <input value={n.name||""} placeholder="Name"
                onChange={e=>{ const l=[...form.otherNumbers]; l[i]={...l[i],name:e.target.value}; set("otherNumbers", l); }}
                style={{...S.inp, marginBottom:0, flex:2}} />
              <input value={n.phone||""} placeholder="Number" inputMode="tel"
                onChange={e=>{ const l=[...form.otherNumbers]; l[i]={...l[i],phone:e.target.value}; set("otherNumbers", l); }}
                style={{...S.inp, marginBottom:0, flex:1.3}} />
              <div onClick={()=>set("otherNumbers", form.otherNumbers.filter((_,k)=>k!==i))}
                style={{ color:"#C0392B", fontWeight:800, padding:"0 6px", cursor:"pointer" }}>✕</div>
            </div>
          ))}
          {(form.otherNumbers||[]).length < 50 && (
            <div onClick={()=>set("otherNumbers", [...(form.otherNumbers||[]), {name:"",phone:""}])}
              style={{ padding:"10px", textAlign:"center", border:"2px dashed #4A7EA0",
                borderRadius:"8px", color:"#4A7EA0", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
              + Add number
            </div>
          )}
        </Section>

        {err && <div style={{ color:"#C0392B", fontSize:"12px", textAlign:"center", marginTop:"12px" }}>{err}</div>}

        <button style={{...S.save, opacity: busy?0.6:1}} onClick={saveHosp} disabled={busy}>
          {busy ? "Saving…" : savedAt ? `✓ Saved ${savedAt}` : `✓ Save ${hosp.k}`}
        </button>
        <div style={S.small}>
          {(hosp.k==="EHH"||hosp.k==="EDH") && "Instructions & numbers are shared by EHH and EDH. "}
          {(hosp.k==="ESJH"||hosp.k==="EJCH") && "Instructions & numbers are shared by ESJH and EJCH. "}
          Live in the app within ~1 minute.
        </div>
      </div>
    </div>
  );
}
