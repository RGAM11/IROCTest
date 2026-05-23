import { useState, useEffect } from "react";

const CSV_TABS = {
  euh: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSduemATT9Oa7k56P0pvgMdEIp_dZyZ_Kbdo65QMzqLMjbUQsb_Cn1vdQ-PrOU_-w/pub?gid=839736423&single=true&output=csv",
  mid: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSduemATT9Oa7k56P0pvgMdEIp_dZyZ_Kbdo65QMzqLMjbUQsb_Cn1vdQ-PrOU_-w/pub?gid=1443595178&single=true&output=csv",
  gmh: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSduemATT9Oa7k56P0pvgMdEIp_dZyZ_Kbdo65QMzqLMjbUQsb_Cn1vdQ-PrOU_-w/pub?gid=1862411136&single=true&output=csv",
};

const DAYS = ["Friday","Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];

const HOSPITALS = [
  { id:1, abbr:"EUH",    name:"Emory University Hospital",     color:"#3D7A8F", address:"1364 Clifton Rd NE, Atlanta, GA 30322" },
  { id:2, abbr:"EHH",    name:"Emory Hillandale Hospital",     color:"#4A8A75", address:"https://maps.app.goo.gl/sVgwEnuatMc4urkL7" },
  { id:3, abbr:"EDH",    name:"Emory Decatur Hospital",        color:"#7B6BA8", address:"2701 N Decatur Rd, Decatur, GA 30033" },
  { id:4, abbr:"ESJH",   name:"Emory Saint Joseph's Hospital", color:"#B8892E", address:"5665 Peachtree Dunwoody Rd, Atlanta, GA 30342" },
  { id:5, abbr:"EJCH",   name:"Emory Johns Creek Hospital",    color:"#A8524A", address:"6325 Hospital Pkwy, Johns Creek, GA 30097" },
  { id:6, abbr:"MT/WEM", name:"Emory Midtown / WEM",           color:"#4A7EA0", address:"550 Peachtree St NE, Atlanta, GA 30308" },
  { id:7, abbr:"GMH",    name:"Grady Memorial Hospital",       color:"#7A5A90", address:"80 Jesse Hill Jr Dr SE, Atlanta, GA 30303" },
];

const HOSP_ID = { EUH:1, EHH:2, EDH:3, ESJH:4, EJCH:5, "MT/WEM":6, "MTWEM":6, GMH:7 };

// #9 Resident icon → 🙃
// #1 EUH: added IHRN + IHTech (weekendOnly flag)
// #2 EUH + EHH Anesthesia: EHConnect link/note
const HOSPITAL_ROLES = {
  1: [
    { key:"IR",          label:"IR",              icon:"🩺", row:0 },
    { key:"Resident",    label:"Resident",        icon:"🙃", row:0 },
    { key:"IHRN",        label:"In-House RN",           icon:"🩹", row:1, tint:"#ECF3F8", weekendOnly:true },
    { key:"PrimaryRN",   label:"Primary RN",      icon:"🩹", row:1, tint:"#ECF3F8" },
    { key:"SecondRN",    label:"2nd RN",           icon:"🩹", row:1, tint:"#ECF3F8", weekdayLink:"https://ehconnect.eushc.org/", weekdayLinkLabel:"Open EHConnect" },
    { key:"IHTech",      label:"In-House Tech",          icon:"🔧", row:2, tint:"#EEF5F1", weekendOnly:true },
    { key:"PrimaryTech", label:"Primary IR Tech",  icon:"🔧", row:2, tint:"#EEF5F1" },
    { key:"SecondTech",  label:"2nd IR Tech",       icon:"🔧", row:2, tint:"#EEF5F1", weekdayLink:"https://ehconnect.eushc.org/", weekdayLinkLabel:"Open EHConnect" },
    { key:"CTTech",      label:"CT Tech",           icon:"🖥️", row:3, static:true, phone:"" },
    { key:"Anesthesia",  label:"Anesthesia",        icon:"💉", row:3, static:true, phone:"404-712-7283", note:"Look up on EHConnect", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"EUH_Schedule", label:"Emailed Schedule", icon:"📋", row:4, static:true, phone:"", image:"/euh-schedule.png" },
  ],
  2: [
    { key:"IR",               label:"IR",                  icon:"🩺", row:0 },
    { key:"NursingSupervisor",label:"Nursing Supervisor",  icon:"👩‍⚕️", row:1, static:true, phone:"470-382-0191", note:"Nursing Supervisor will provide information on the technologist and the RN on call." },
    { key:"Anesthesia",       label:"Anesthesia",          icon:"💉", row:1, static:true, phone:"", note:"Look up on EHConnect", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
  ],
  3: [
    { key:"IR",                  label:"IR",                   icon:"🩺", row:0 },
    { key:"RadiologySupervisor", label:"Radiology Supervisor", icon:"🔬", row:1, static:true, phone:"470-630-7477", note:"Radiology Supervisor will provide information on the technologist and the RN on call." },
    { key:"Anesthesia",          label:"Anesthesia",           icon:"💉", row:1, static:true, phone:"678-371-9038" },
  ],
  4: [
    { key:"IR",          label:"IR",      icon:"🩺", row:0 },
    { key:"Technologist",label:"IR Tech", icon:"🔧", row:1 },
    { key:"RN",          label:"RN",      icon:"🩹", row:1 },
    { key:"ESJH_CTTech",     label:"CT Tech",          icon:"🖥️", row:1, static:true, phone:"678-843-7093" },
    { key:"ESJH_Anesthesia", label:"Anesthesia",       icon:"💉", row:2, static:true, phone:"", note:'EHConnect → On-Call → Anesthesiology → select "Anesthesiology - ESJH - Anesthesiologist - 1"', link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"ESJH_RadMain",   label:"Radiology Main",    icon:"📞", row:2, static:true, phone:"678-843-7341" },
    { key:"ESJH_ORFront",   label:"OR Front Desk",     icon:"📞", row:2, static:true, phone:"678-843-7360" },
  ],
  5: [
    { key:"IR",         label:"IR",            icon:"🩺", row:0 },
    { key:"OCC",        label:"Nursing Supervisor",  icon:"📞", row:1, static:true, phone:"404-491-5493", badge:"call 1st", note:"RN Supervisor will call in IR Tech & RN.\n\nProvide following:\n• Patient name, MRN, location\n• Planned procedure & expected time\n• If anesthesia needed\n\n⚠️ If unable to reach OCC, call EJCH Operator (678-474-7000) and ask for nursing supervisor." },
    { key:"POS",        label:"Point of Service",     icon:"📞", row:1, static:true, phone:"404-778-8298", note:"POS will help post case" },
    { key:"CTTech",     label:"CT Tech",       icon:"🖥️", row:1, static:true, phone:"470-707-5459", phone2:"470-686-2641", noText:true },
    { key:"Anesthesia", label:"Anesthesia",    icon:"💉", row:2, static:true, phone:"470-990-1356" },
    { key:"Operator",   label:"EJCH Operator", icon:"📞", row:2, static:true, phone:"678-474-7000" },
  ],
  6: [
    { key:"IR",          label:"IR",         icon:"🩺", row:0 },
    { key:"Resident",    label:"Resident",   icon:"🙃", row:0 },
    { key:"Technologist",label:"IR Tech",    icon:"🔧", row:1, friWeekend:true },
    { key:"RN",          label:"RN",         icon:"🩹", row:1, friWeekend:true },
    { key:"RadFrontDesk",label:"Radiology Front Desk", icon:"📞", row:1, static:true, phone:"404-686-5998", note:"Call to find out the on-call RN and IR Tech" },
    { key:"CTTech",      label:"CT Tech",    icon:"🖥️", row:2, static:true, phone:"404-696-8984" },
    { key:"Anesthesia",  label:"Anesthesia", icon:"💉", row:2, static:true, phone:"", note:"Check on EHConnect for on-call anesthesiologist", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
  ],
  7: [
    { key:"IR",          label:"IR",         icon:"🩺", row:0 },
    { key:"Resident",    label:"Resident",   icon:"🙃", row:0 },
    { key:"Technologist",label:"IR Tech",    icon:"🔧", row:1, hideWeek:true },
    { key:"RN",          label:"RN",         icon:"🩹", row:1, hideWeek:true },
    { key:"MTC",         label:"MTC",        icon:"🏥", row:2, static:true, phone:"404-616-2226" },
    { key:"Anesthesia",  label:"Anesthesia", icon:"💉", row:2, static:true, phone:"404-852-3253" },
  ],
};

// ── CSV Parsing ─────────────────────────────────────────────────────────────
const parseCSVRows = (text) => {
  if (!text) return [];
  return text.trim().split("\n").map(line => {
    const result = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    result.push(cur.trim()); return result;
  });
};
const clean = (s) => (s || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
const getDataRows = (allRows) => {
  return allRows.filter(r => {
    const h = clean(r[0]);
    return h && HOSP_ID[h];
  });
};
const c = (r, i) => clean(r[i]);

// EUH-EHH-EDH: 28 cols. IH RN cols 6-11, IH Tech cols 18-21 (weekend only)
const parseEUHTab = (text, data) => {
  getDataRows(parseCSVRows(text)).forEach(r => {
    const id = HOSP_ID[c(r,0)]; const day = c(r,1);
    if (!id || !day || !data[id]) return;
    const isWE = day === "Saturday" || day === "Sunday";
    data[id].IR[day] = { name:c(r,2), phone:c(r,3), time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
    if (id === 1) {
      data[id].Resident[day] = { name:c(r,4), phone:c(r,5), time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
      // IH RN — weekends only
      if (isWE) {
        const entries = [];
        if (c(r,6)) entries.push({ name:c(r,6), phone:c(r,7) });
        if (c(r,8)) entries.push({ name:c(r,8), phone:c(r,9) });
        if (c(r,10)) entries.push({ name:c(r,10), phone:c(r,11) });
        data[id].IHRN[day] = { name: entries.map(e=>e.name).join(", ") || "N/A", phone: entries[0]?.phone||"", time:"7:00 AM – 7:30 PM", entries };
      } else {
        data[id].IHRN[day] = { name:"Weekend Only", phone:"", time:"" };
      }
      // Primary RN
      if (isWE) {
        const dn=c(r,12), dp=c(r,13), nn=c(r,14), np=c(r,15);
        data[id].PrimaryRN[day] = { name:dn||nn||"N/A", phone:dp||np||"", time:dn?"7:00 AM – 7:00 PM":"7:00 PM – 7:00 AM",
          ...(dn && nn ? { name2:nn, phone2:np, time2:"7:00 PM – 7:00 AM" } : {}) };
      } else {
        data[id].PrimaryRN[day] = { name:c(r,14)||"N/A", phone:c(r,15)||"", time:c(r,14)?"7:00 PM – 7:00 AM":"" };
      }
      data[id].SecondRN[day] = { name:c(r,16)||"N/A", phone:c(r,17)||"", time:c(r,16)?"7:00 PM – 7:00 AM":"" };
      // IH Tech — weekends only
      if (isWE) {
        const entries = [];
        if (c(r,18)) entries.push({ name:c(r,18), phone:c(r,19) });
        if (c(r,20)) entries.push({ name:c(r,20), phone:c(r,21) });
        data[id].IHTech[day] = { name: entries.map(e=>e.name).join(", ") || "N/A", phone: entries[0]?.phone||"", time:"7:00 AM – 7:30 PM", entries };
      } else {
        data[id].IHTech[day] = { name:"Weekend Only", phone:"", time:"" };
      }
      // Primary Tech
      const isFri = day === "Friday";
      if (isWE) {
        const dn=c(r,22), dp=c(r,23), nn=c(r,24), np=c(r,25);
        data[id].PrimaryTech[day] = { name:dn||nn||"N/A", phone:dp||np||"", time:dn?"7:00 AM – 7:00 PM":"7:00 PM – 7:00 AM",
          ...(dn && nn ? { name2:nn, phone2:np, time2:"7:00 PM – 7:00 AM" } : {}) };
      } else {
        data[id].PrimaryTech[day] = { name:c(r,24)||"N/A", phone:c(r,25)||"", time:c(r,24)?(isFri?"3:00 PM – 7:00 AM":"7:00 PM – 7:00 AM"):"" };
      }
      data[id].SecondTech[day] = { name:c(r,26)||"N/A", phone:c(r,27)||"", time:c(r,26)?(isFri?"5:30 PM – 7:00 AM":"7:00 PM – 7:00 AM"):"" };
    }
  });
};

const parseMidTab = (text, data) => {
  getDataRows(parseCSVRows(text)).forEach(r => {
    const rawHosp = clean(r[0]).replace("MTWEM","MT/WEM");
    const id = HOSP_ID[rawHosp]; const day = c(r,1);
    if (!id || !day || !data[id]) return;
    const isWE = day === "Saturday" || day === "Sunday";
    data[id].IR[day] = { name:c(r,2), phone:c(r,3), time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
    if (id === 6) {
      data[id].Resident[day] = { name:c(r,4)||"N/A", phone:c(r,5)||"", time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
      const parseSplit = (raw, phone) => {
        if (!raw) return { name:"N/A", phone:"", time:"On Call" };
        if (raw.includes("/")) {
          const parts = raw.split("/").map(s => s.trim());
          const parseNameTime = (s) => {
            const m = s.match(/^(.+?)\s+(\d+[ap]?m?\s*-\s*\d+[ap]?m?)$/i);
            return m ? { name: m[1].trim(), time: m[2].trim() } : { name: s, time: "On Call" };
          };
          const p1 = parseNameTime(parts[0]), p2 = parseNameTime(parts[1]);
          return { name: p1.name, phone: phone, time: p1.time, name2: p2.name, phone2: "", time2: p2.time };
        }
        return { name: raw, phone: phone, time: "On Call" };
      };
      data[id].Technologist[day] = parseSplit(c(r,6), c(r,7));
      data[id].RN[day] = parseSplit(c(r,8), c(r,9));
    }
    if (id === 4) {
      data[id].Technologist[day] = { name:c(r,6)||"N/A", phone:c(r,7)||"", time:"On Call" };
      data[id].RN[day] = { name:c(r,8)||"N/A", phone:c(r,9)||"", time:"On Call" };
    }
    // EJCH: IR only — OCC/POS are static
  });
};

const parseGMHTab = (text, data) => {
  getDataRows(parseCSVRows(text)).forEach(r => {
    const id = HOSP_ID[c(r,0)]; const day = c(r,1);
    if (id !== 7 || !day || !data[id]) return;
    const isWE = day === "Saturday" || day === "Sunday";
    data[id].IR[day]          = { name:c(r,2), phone:c(r,3), time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
    data[id].Resident[day]    = { name:c(r,4)||"N/A", phone:c(r,5)||"", time: isWE ? "All Day" : "5:00 PM – 7:00 AM" };
    data[id].Technologist[day]= { name:c(r,6)||"N/A", phone:c(r,7)||"", time:"On Call" };
    data[id].RN[day]          = { name:c(r,8)||"N/A", phone:c(r,9)||"", time:"On Call" };
  });
};

const initData = () => {
  const data = {};
  HOSPITALS.forEach(h => {
    data[h.id] = {};
    (HOSPITAL_ROLES[h.id]||[]).forEach(role => { if (!role.static) data[h.id][role.key] = {}; });
  });
  return data;
};

const fetchSchedule = async () => {
  const data = initData();
  try {
    const [a,b,g] = await Promise.all([fetch(CSV_TABS.euh).then(r=>r.text()), fetch(CSV_TABS.mid).then(r=>r.text()), fetch(CSV_TABS.gmh).then(r=>r.text())]);
    try { parseEUHTab(a, data); } catch(e) { console.error("EUH parse error:", e); }
    try { parseMidTab(b, data); } catch(e) { console.error("Mid parse error:", e); }
    try { parseGMHTab(g, data); } catch(e) { console.error("GMH parse error:", e); }
  } catch(e) { console.error("CSV fetch error:", e); }
  return data;
};

const getDayName = () => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
const getWeekDates = () => {
  const today = new Date(); const dow = today.getDay();
  let fri = new Date(today); fri.setDate(today.getDate() - (dow >= 5 ? dow - 5 : dow + 2));
  return DAYS.map((_,i) => { const d = new Date(fri); d.setDate(fri.getDate()+i); return d; });
};
const fmtDate = (d) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getDate()}`;
const isToday = (d) => { const t=new Date(); return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear(); };

const CREST_URL = "/emory-crest.png";

// Zoomable image component (pinch + buttons)
function ZoomImage({ src, alt, color, T }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({x:0,y:0});
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({x:0,y:0});
  const [lastDist, setLastDist] = useState(null);
  const dist = (t) => Math.sqrt((t[0].clientX-t[1].clientX)**2 + (t[0].clientY-t[1].clientY)**2);
  const onTS = (e) => {
    if (e.touches.length===2) { e.preventDefault(); setLastDist(dist(e.touches)); }
    else if (e.touches.length===1 && scale>1) { setDragging(true); setDragStart({x:e.touches[0].clientX-pos.x,y:e.touches[0].clientY-pos.y}); }
  };
  const onTM = (e) => {
    if (e.touches.length===2 && lastDist) {
      e.preventDefault(); const nd=dist(e.touches); const ns=Math.min(5,Math.max(1,scale*(nd/lastDist)));
      setScale(ns); setLastDist(nd); if(ns<=1) setPos({x:0,y:0});
    } else if (e.touches.length===1 && dragging && scale>1) {
      setPos({x:e.touches[0].clientX-dragStart.x,y:e.touches[0].clientY-dragStart.y});
    }
  };
  const onTE = () => { setDragging(false); setLastDist(null); };
  const reset = () => { setScale(1); setPos({x:0,y:0}); };
  return (
    <div style={{ marginTop:"10px" }}>
      <div style={{ overflow:"hidden", borderRadius:"8px", border:`1px solid ${T.cardBorder}`, touchAction:scale>1?"none":"auto" }}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
        <img src={src} alt={alt} style={{ width:"100%", display:"block",
          transform:`scale(${scale}) translate(${pos.x/scale}px,${pos.y/scale}px)`,
          transformOrigin:"center", transition:dragging?"none":"transform 0.15s" }} />
      </div>
      <div style={{ display:"flex", gap:"6px", marginTop:"6px", justifyContent:"center" }}>
        <div onClick={()=>setScale(s=>Math.min(5,s+0.5))} style={{ padding:"6px 14px", borderRadius:"6px", background:color, color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>＋</div>
        <div onClick={()=>{const ns=Math.max(1,scale-0.5); setScale(ns); if(ns<=1) setPos({x:0,y:0});}} style={{ padding:"6px 14px", borderRadius:"6px", background:color, color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>－</div>
        {scale>1 && <div onClick={reset} style={{ padding:"6px 14px", borderRadius:"6px", background:T.roleBg, border:`1px solid ${T.roleBorder}`, color:T.roleText, fontSize:"12px", fontWeight:700, cursor:"pointer" }}>Reset</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [schedule, setSchedule] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getDayName());
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");

  useEffect(() => { fetchSchedule().then(d => setSchedule(d)).finally(() => setLoading(false)); }, []);

  // Update browser status bar color to match selected hospital
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", hospital ? hospital.color : "#3D7A8F");
  }, [selectedHospital]);

  const weekDates = getWeekDates();
  const todayName = getDayName();
  const hospital = HOSPITALS.find(h => h.id === selectedHospital);
  const roles = selectedHospital ? (HOSPITAL_ROLES[selectedHospital]||[]) : [];
  const font = "'Segoe UI',system-ui,sans-serif";
  const dk = theme === "dark";
  const T = {
    bg: dk ? "#0F1724" : "#EDF2F7", card: dk ? "#1A2332" : "#ffffff",
    cardBorder: dk ? "#2D3B4E" : "#D4DAE3", text: dk ? "#E2E8F0" : "#1E293B",
    textSub: dk ? "#8899AA" : "#7E8A9A", textMuted: dk ? "#5A6B7D" : "#94A3B8",
    roleBg: dk ? "#1A2332" : "#fff", roleBorder: dk ? "#3D4F63" : "#B8C4CE",
    roleText: dk ? "#94A8BE" : "#4A5568", detailBg: dk ? "#0F1724" : "#F0F4F8",
    dayBg: dk ? "#1A2332" : "#fff", dayBorder: dk ? "#2D3B4E" : "#E2E8F0",
    oncallBg: dk ? "#1A2332" : "#fff", weekBg: dk ? "#1A2332" : "#fff",
    quickLinkText: dk ? "#E2E8F0" : "#1E293B",
  };

  const handleSelectHospital = (id) => {
    setSelectedHospital(id);
    setSelectedRole((HOSPITAL_ROLES[id]||[])[0]?.key || null);
    setSelectedDay(todayName);
  };

  const getEntry = (hId, rKey, day) => {
    if (!schedule || !schedule[hId]) return null;
    const rd = (HOSPITAL_ROLES[hId]||[]).find(r => r.key === rKey);
    if (!rd) return null;
    if (rd.static) return { name:rd.label, phone:rd.phone||"", phone2:rd.phone2||"", note:rd.note||"", time:"" };
    return schedule[hId][rKey]?.[day] || null;
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, fontFamily:font }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"28px", marginBottom:"8px" }}>🏥</div>
        <div style={{ fontSize:"14px", color:T.textMuted, fontWeight:600 }}>Loading...</div>
      </div>
    </div>
  );

  // ─── HOME PAGE ───
  if (!selectedHospital) {
    const leftCol = [1,3,2].map(id => HOSPITALS.find(h=>h.id===id));
    const rightCol = [6,4,5].map(id => HOSPITALS.find(h=>h.id===id));
    const gmh = HOSPITALS.find(h=>h.id===7);
    const Card = ({h}) => (
      <div onClick={()=>handleSelectHospital(h.id)} style={{
        display:"flex", alignItems:"center", gap:"10px", background:T.card, borderRadius:"12px",
        padding:"14px 12px", cursor:"pointer", border:`1px solid ${T.cardBorder}`, boxShadow: dk ? "0 1px 4px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.06)",
        transition:"all 0.15s", minWidth:0, overflow:"hidden", borderLeft:`4px solid ${h.color}`, position:"relative", zIndex:2,
      }}>
        <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:h.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color:"#fff", fontWeight:800, fontSize:h.abbr.length>4?"9px":"12px" }}>{h.abbr}</span>
        </div>
        <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
          <div style={{ color:T.text, fontWeight:700, fontSize:"15px" }}>{h.abbr}</div>
          <div style={{ color:T.textSub, fontSize:"11px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.name}</div>
        </div>
        <div style={{ color:T.textMuted, fontSize:"18px", flexShrink:0 }}>›</div>
      </div>
    );

    return (
      <div style={{ minHeight:"100vh", background:T.bg, fontFamily:font, position:"relative", width:"100%", maxWidth:"100vw", overflowX:"hidden" }}>
        <div style={{ position:"relative", zIndex:1 }}>
          {/* #7 Watermark behind title */}
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", top:"85%", left:"50%", transform:"translate(-50%,-50%)", width:"55vw", maxWidth:"300px", aspectRatio:"1",
              backgroundImage:`url("${CREST_URL}")`, backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center",
              opacity: dk ? 0.04 : 0.07, pointerEvents:"none", zIndex:0 }} />
            <div style={{ paddingTop:"76px", textAlign:"center", position:"relative", zIndex:1 }}>
              <div style={{ fontSize:"12px", letterSpacing:"4px", color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Interventional Radiology On-Call</div>
              <div style={{ fontSize:"50px", fontWeight:900, letterSpacing:"3px", marginTop:"2px", lineHeight:"1" }}>
                <span style={{ color: dk ? "#6A9FD0" : "#7BA3C9" }}>I</span>
                <span style={{ color: dk ? "#4A85C0" : "#4A6FA0" }}>R</span>
                <span style={{ color: dk ? "#3068A8" : "#4A7EA0" }}>O</span>
                <span style={{ color: dk ? "#8BADE0" : "#1E3A5F" }}>C</span>
              </div>
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"4px", marginTop:"4px" }}>
                <div style={{ width:"28px", height:"4px", borderRadius:"2px", background: dk ? "#3068A8" : "#4A7EA0" }} />
                <div style={{ width:"8px", height:"4px", borderRadius:"2px", background: dk ? "#4A85C0" : "#4A6FA0" }} />
                <div style={{ width:"5px", height:"4px", borderRadius:"2px", background: dk ? "#6A9FD0" : "#7BA3C9" }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop:"70px", paddingLeft:"16px", paddingRight:"16px", maxWidth:"500px", marginLeft:"auto", marginRight:"auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"20px", minWidth:0 }}>{leftCol.map(h=><Card key={h.id} h={h}/>)}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"20px", minWidth:0 }}>{rightCol.map(h=><Card key={h.id} h={h}/>)}</div>
            </div>
            <div style={{ marginTop:"20px" }}><Card h={gmh}/></div>

            <div style={{ marginTop:"40px" }}>
              <div style={{ fontSize:"10px", letterSpacing:"2px", color:T.quickLinkText, fontWeight:700, textTransform:"uppercase", textAlign:"center", marginBottom:"8px" }}>Quick Links</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                <a href="https://ehconnect.eushc.org/" target="_blank" rel="noopener noreferrer" style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"5px",
                  padding:"14px 12px", borderRadius:"12px", textDecoration:"none",
                  background:"linear-gradient(135deg, #6EA3C8 0%, #4A7EA0 100%)", color:"#fff", fontWeight:700, fontSize:"13px",
                }}><span>🔗</span> EHConnect</a>
                <a href="https://www.emoryhealthcare.org/-/media/Project/EH/Emory/ui/pdfs/ejch-physician-forms/2018-Consent-to-Medical-or-Surgical-Treatment.pdf" target="_blank" rel="noopener noreferrer" style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"5px",
                  padding:"14px 12px", borderRadius:"12px", textDecoration:"none",
                  background:"linear-gradient(135deg, #C5DDE9 0%, #9CC5E0 100%)", color:"#2A4A5F", fontWeight:700, fontSize:"13px",
                }}><span>📄</span> Blank Consent</a>
              </div>
            </div>

            <div style={{ marginTop:"40px", display:"flex", justifyContent:"center", gap:"10px" }}>
              <div onClick={()=>setTheme("light")} style={{
                padding:"10px 24px", borderRadius:"10px", cursor:"pointer", fontWeight:700, fontSize:"12px",
                background: !dk ? "#fff" : "transparent", color: !dk ? "#1E293B" : T.textMuted,
                border:`2px solid ${!dk ? "#4A7EA0" : T.cardBorder}`,
              }}>☀️ Light</div>
              <div onClick={()=>setTheme("dark")} style={{
                padding:"10px 24px", borderRadius:"10px", cursor:"pointer", fontWeight:700, fontSize:"12px",
                background: dk ? "#1A2332" : "transparent", color: dk ? "#E2E8F0" : T.textMuted,
                border:`2px solid ${dk ? "#4A6FA0" : T.cardBorder}`,
              }}>🌙 Dark</div>
            </div>
            <div style={{ height:"30px" }} />
          </div>
        </div>
      </div>
    );
  }

  // ─── HOSPITAL DETAIL ───
  const selDayIdx = DAYS.indexOf(selectedDay);
  const selDate = weekDates[selDayIdx >= 0 ? selDayIdx : 0];
  const isTodaySel = selectedDay === todayName;
  const isWeekendDay = selectedDay === "Saturday" || selectedDay === "Sunday";
  const isFriWeekend = selectedDay === "Friday" || isWeekendDay;
  const visibleRoles = roles.filter(r => {
    if (r.weekendOnly) return isWeekendDay;
    if (r.friWeekend) return isFriWeekend;
    return true;
  });
  // If selected role is hidden (weekendOnly on weekday), switch to first visible
  const effectiveRole = visibleRoles.find(r => r.key === selectedRole) ? selectedRole : (visibleRoles[0]?.key || null);
  const activeRole = visibleRoles.find(r => r.key === effectiveRole);
  const todayEntry = getEntry(selectedHospital, effectiveRole, selectedDay);
  const rowGroups = {};
  visibleRoles.forEach(r => { if (!rowGroups[r.row]) rowGroups[r.row] = []; rowGroups[r.row].push(r); });
  const mapsUrl = hospital.address.startsWith("http") ? hospital.address : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.address)}`;

  // #5/#6 Hide full week for roles with hideWeek flag or static roles
  const showFullWeek = !activeRole?.static && !activeRole?.hideWeek;

  const PhoneButtons = ({ phone, clr, noText }) => {
    if (!phone) return null;
    const digits = phone.replace(/[^0-9]/g,"");
    return (
      <div style={{ display:"flex", gap:"8px", marginTop:"8px" }}>
        <a href={`tel:${digits}`} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"4px",
          padding:"8px 0", borderRadius:"8px", background:clr, color:"#fff", textDecoration:"none", fontSize:"12px", fontWeight:700 }}>
          📞 Call
        </a>
        {!noText && <a href={`sms:${digits}`} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"4px",
          padding:"8px 0", borderRadius:"8px", background:T.oncallBg, border:`1.5px solid ${clr}`, color:clr, textDecoration:"none", fontSize:"12px", fontWeight:700 }}>
          💬 Text
        </a>}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:T.detailBg, fontFamily:font, overflowX:"hidden" }}>
      {/* #8 Header — full name only, no abbreviation */}
      <div style={{ background:hospital.color, padding:"18px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div onClick={()=>setSelectedHospital(null)} style={{
          padding:"10px 20px", borderRadius:"10px", background:"rgba(255,255,255,0.2)",
          color:"#fff", fontSize:"15px", fontWeight:700, cursor:"pointer", flexShrink:0,
        }}>← Back</div>
        <div style={{ flex:1, textAlign:"center", overflow:"hidden" }}>
          <span style={{ color:"#fff", fontWeight:700, fontSize:"15px" }}>{hospital.name}</span>
        </div>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
          padding:"10px 16px", borderRadius:"10px", background:"rgba(255,255,255,0.2)",
          color:"#fff", fontSize:"14px", fontWeight:700, textDecoration:"none", flexShrink:0,
        }}>📍 Navigate</a>
      </div>

      <div style={{ padding:"12px 12px 40px", maxWidth:"500px", margin:"0 auto" }}>
        {/* #4 DAY selector FIRST — double sized */}
        <div style={{ fontSize:"10px", letterSpacing:"2px", color:T.textMuted, fontWeight:700, marginBottom:"5px", textTransform:"uppercase" }}>Day</div>
        <div style={{ display:"flex", gap:"4px", marginBottom:"14px" }}>
          {DAYS.map((day,i) => {
            const d = weekDates[i]; const act = selectedDay === day;
            return (
              <div key={day} onClick={()=>setSelectedDay(day)} style={{
                flex:"1", minWidth:"44px", textAlign:"center", padding:"10px 2px", borderRadius:"10px", cursor:"pointer",
                background: act ? hospital.color : T.dayBg, border:`1.5px solid ${act ? hospital.color : T.dayBorder}`, color: act ? "#fff" : T.roleText,
              }}>
                <div style={{ fontSize:"12px", fontWeight:800 }}>{day.slice(0,3).toUpperCase()}</div>
                <div style={{ fontSize:"10px", marginTop:"2px", opacity:0.8 }}>{fmtDate(d)}</div>
              </div>
            );
          })}
        </div>

        {/* ROLE selector */}
        <div style={{ fontSize:"10px", letterSpacing:"2px", color:T.textMuted, fontWeight:700, marginBottom:"5px", textTransform:"uppercase" }}>Role</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"14px" }}>
          {Object.keys(rowGroups).sort().map(rn => (
            <div key={rn} style={{ display:"grid", gridTemplateColumns:`repeat(${rowGroups[rn].length},1fr)`, gap:"6px" }}>
              {rowGroups[rn].map(role => {
                const act = effectiveRole === role.key;
                return (
                  <div key={role.key} onClick={()=>setSelectedRole(role.key)} style={{
                    textAlign:"center", padding:"10px 4px", borderRadius:"10px", cursor:"pointer",
                    background: act ? hospital.color : (role.tint && !dk ? role.tint : T.roleBg),
                    border:`2px solid ${act ? hospital.color : T.roleBorder}`,
                    color: act ? "#fff" : T.roleText,
                    boxShadow: act ? `0 2px 6px ${hospital.color}40` : "none",
                  }}>
                    <div style={{ fontSize:"16px" }}>{role.icon}</div>
                    <div style={{ fontSize:"12px", fontWeight:700, lineHeight:"1.2", marginTop:"2px" }}>{role.label}{role.badge && <span style={{ fontSize:"9px", fontWeight:600, opacity:0.75, display:"block" }}>({role.badge})</span>}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* EJCH Call Workflow — always visible */}
        {selectedHospital === 5 && (
          <div style={{ marginBottom:"12px", padding:"12px 14px", borderRadius:"12px", background: dk ? "#1E2A3A" : "#E6EDF8", border:`2px solid ${dk ? "#3D5A7A" : "#8AA0C0"}` }}>
            <div style={{ fontSize:"14px", fontWeight:800, color: dk ? "#C0D0E0" : "#1B3A5C", marginBottom:"5px" }}>📋 EJCH Call Workflow</div>
            <div style={{ fontSize:"13px", color: dk ? "#B0C0D0" : "#2A3A5A", lineHeight:"1.5", whiteSpace:"pre-line" }}>{"1. Call OCC/RN Supervisor — give appropriate info\n2. Call Anesthesia (if needed)\n3. Enter Procedure order\nOn-call team (RN/IR Tech) will post case utilizing P.O.S."}</div>
          </div>
        )}

        {/* ESJH Entry Points */}
        {selectedHospital === 4 && (
          <div style={{ marginBottom:"12px", padding:"12px 14px", borderRadius:"12px", background: dk ? "#1E2A3A" : "#FFF8E8", border:`2px solid ${dk ? "#3D5A7A" : "#D4B87A"}` }}>
            <div style={{ fontSize:"13px", color: dk ? "#D4C090" : "#5A4A20", lineHeight:"1.5" }}>
              🚪 Entry points after 9pm (Mon-Fri) and on weekends are through the <strong>ED waiting room</strong> and the <strong>Winship Main Entrance</strong>.
            </div>
          </div>
        )}

        {/* On-Call Card */}
        <div style={{ marginBottom:"14px" }}>
          <div style={{ fontSize:"13px", fontWeight:700, color:T.text, marginBottom:"6px" }}>
            On-Call — {selectedDay}, {fmtDate(selDate)}
            {isTodaySel && <span style={{ marginLeft:"8px", background:"#3DA07A", color:"#fff", fontSize:"9px", fontWeight:700, padding:"2px 7px", borderRadius:"10px" }}>TODAY</span>}
          </div>

          {activeRole?.static ? (
            <div style={{ borderRadius:"12px", border:`2px solid ${hospital.color}30`, background:T.oncallBg, padding:"14px" }}>
              <div style={{ fontSize:"10px", fontWeight:700, color:hospital.color, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"4px" }}>
                {activeRole.icon} {activeRole.label}
              </div>
              {activeRole.phone ? (
                <>
                  <div style={{ fontSize:"16px", fontWeight:700, color:T.text }}>{activeRole.phone}</div>
                  <PhoneButtons phone={activeRole.phone} clr={hospital.color} noText={activeRole.noText} />
                  {activeRole.phone2 && <>
                    <div style={{ fontSize:"14px", fontWeight:600, color:T.text, marginTop:"10px" }}>{activeRole.phone2}</div>
                    <PhoneButtons phone={activeRole.phone2} clr={hospital.color} noText={activeRole.noText} />
                  </>}
                </>
              ) : !activeRole.image ? <div style={{ color:T.textMuted, fontSize:"13px" }}>No number assigned</div> : null}
              {/* #3 Notes: 14px, no italic */}
              {activeRole.note && <div style={{ fontSize:"14px", color: dk ? "#D4A84A" : "#8A6D2A", marginTop:"8px", whiteSpace:"pre-line" }}>⚠️ {activeRole.note}</div>}
              {activeRole.image && <ZoomImage src={activeRole.image} alt={activeRole.label} color={hospital.color} T={T} />}
              {activeRole.link && (
                <a href={activeRole.link} target="_blank" rel="noopener noreferrer" style={{
                  display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"8px",
                  padding:"8px 16px", borderRadius:"8px", textDecoration:"none",
                  background:"linear-gradient(135deg, #6EA3C8 0%, #4A7EA0 100%)", color:"#fff", fontWeight:700, fontSize:"12px",
                }}>🔗 {activeRole.linkLabel || "Open Link"}</a>
              )}
            </div>
          ) : todayEntry && todayEntry.name && todayEntry.name !== "N/A" && todayEntry.name !== "Weekend Only" ? (
            <div style={{ borderRadius:"12px", border:`2px solid ${hospital.color}30`, background:T.oncallBg, padding:"14px" }}>
              <div style={{ fontSize:"10px", fontWeight:700, color:hospital.color, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"3px" }}>
                {activeRole?.icon} {activeRole?.label}
              </div>
              {todayEntry.time && <div style={{ fontSize:"12px", color:T.textSub, marginBottom:"6px" }}>{todayEntry.time}</div>}
              {/* Multi-person entries (IH RN/Tech) */}
              {todayEntry.entries && todayEntry.entries.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {todayEntry.entries.map((e, idx) => (
                    <div key={idx} style={{ paddingTop: idx > 0 ? "10px" : "0", borderTop: idx > 0 ? `1px solid ${T.dayBorder}` : "none" }}>
                      <div style={{ fontSize:"16px", fontWeight:700, color:T.text }}>{e.name}</div>
                      {e.phone && <div style={{ fontSize:"14px", fontWeight:600, color:T.text, marginTop:"2px" }}>📞 {e.phone}</div>}
                      <PhoneButtons phone={e.phone} clr={hospital.color} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:"18px", fontWeight:700, color:T.text }}>{todayEntry.name}</div>
                  {todayEntry.phone && <div style={{ fontSize:"15px", fontWeight:600, color:T.text, marginTop:"4px" }}>📞 {todayEntry.phone}</div>}
                  <PhoneButtons phone={todayEntry.phone} clr={hospital.color} />
                  {activeRole?.weekdayLink && !isWeekendDay && selectedDay !== "Friday" && (
                    <a href={activeRole.weekdayLink} target="_blank" rel="noopener noreferrer" style={{
                      display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"8px",
                      padding:"8px 16px", borderRadius:"8px", textDecoration:"none",
                      background:`linear-gradient(135deg, #4A6FA0 0%, #2B4A7A 100%)`, color:"#fff", fontWeight:700, fontSize:"12px",
                    }}>🔗 {activeRole.weekdayLinkLabel || "Open EHConnect"}</a>
                  )}
                  {todayEntry.name2 && (
                    <div style={{ marginTop:"12px", paddingTop:"10px", borderTop:`1px solid ${T.dayBorder}` }}>
                      <div style={{ fontSize:"15px", fontWeight:600, color:T.text }}>{todayEntry.name2}</div>
                      {todayEntry.time2 && <div style={{ fontSize:"11px", color:T.textSub }}>{todayEntry.time2}</div>}
                      {todayEntry.phone2 && <div style={{ fontSize:"14px", fontWeight:600, color:T.text, marginTop:"3px" }}>📞 {todayEntry.phone2}</div>}
                      <PhoneButtons phone={todayEntry.phone2} clr={hospital.color} />
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ borderRadius:"12px", border:`2px dashed ${T.cardBorder}`, background:T.oncallBg, padding:"18px", textAlign:"center" }}>
              <div style={{ color:T.textMuted, fontSize:"13px" }}>
                {todayEntry?.name === "Weekend Only" ? "Weekend Only — no weekday schedule for this role" : "No one scheduled"}
              </div>
              {activeRole?.weekdayLink && !isWeekendDay && selectedDay !== "Friday" && (
                <a href={activeRole.weekdayLink} target="_blank" rel="noopener noreferrer" style={{
                  display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"10px",
                  padding:"8px 16px", borderRadius:"8px", textDecoration:"none",
                  background:`linear-gradient(135deg, #4A6FA0 0%, #2B4A7A 100%)`, color:"#fff", fontWeight:700, fontSize:"12px",
                }}>🔗 {activeRole.weekdayLinkLabel || "Open EHConnect"}</a>
              )}
            </div>
          )}
        </div>

        {/* Group Text */}
        {[4,6,7].includes(selectedHospital) && (effectiveRole === "Technologist" || effectiveRole === "RN") && (() => {
          const te = getEntry(selectedHospital, "Technologist", selectedDay);
          const re = getEntry(selectedHospital, "RN", selectedDay);
          const td = (te?.phone||"").replace(/[^0-9]/g,""), rd = (re?.phone||"").replace(/[^0-9]/g,"");
          if (!td && !rd) return null;
          return (
            <div style={{ marginBottom:"14px" }}>
              <a href={`sms:${[td,rd].filter(Boolean).join(",")}`} style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"12px", borderRadius:"10px", textDecoration:"none",
                background:"linear-gradient(135deg, #3DA07A 0%, #2E8A6A 100%)", color:"#fff", fontWeight:700, fontSize:"13px",
              }}>💬 Group Text IR Tech & RN</a>
              <div style={{ fontSize:"10px", color:T.textMuted, textAlign:"center", marginTop:"4px" }}>
                {te?.name && te.name !== "N/A" ? te.name : "Tech"} + {re?.name && re.name !== "N/A" ? re.name : "RN"}
              </div>
            </div>
          );
        })()}

        {/* Full Week — hidden for hideWeek and static roles */}
        {showFullWeek && (
          <>
            <div style={{ fontSize:"10px", letterSpacing:"2px", color:T.textMuted, fontWeight:700, marginBottom:"5px", textTransform:"uppercase" }}>
              Full Week — {activeRole?.label}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
              {DAYS.map((day,i) => {
                const d = weekDates[i]; const entry = getEntry(selectedHospital, effectiveRole, day); const itd = isToday(d);
                return (
                  <div key={day} onClick={()=>setSelectedDay(day)} style={{
                    display:"flex", alignItems:"center", padding:"9px 10px", borderRadius:"8px", cursor:"pointer",
                    background: itd ? `${hospital.color}${dk ? "20" : "0D"}` : T.weekBg, border: itd ? `1.5px solid ${hospital.color}30` : "1.5px solid transparent",
                  }}>
                    <div style={{ width:"42px", flexShrink:0 }}>
                      <div style={{ fontSize:"10px", fontWeight:800, color: itd ? hospital.color : T.roleText }}>{day.slice(0,3).toUpperCase()}{itd && " ★"}</div>
                      <div style={{ fontSize:"9px", color:T.textMuted }}>{fmtDate(d)}</div>
                    </div>
                    <div style={{ flex:1, fontSize:"13px", fontWeight:600, color:T.text }}>
                      {entry?.name || "—"}
                      {entry?.name2 && <span style={{ color:T.textMuted, fontWeight:400, fontSize:"11px" }}> / {entry.name2}</span>}
                    </div>
                    <div style={{ fontSize:"11px", color:T.textMuted }}>{entry?.time || ""}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
