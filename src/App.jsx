import { useState, useEffect } from "react";
import EditMode from "./Edit";

const BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSz1MLm6ZSF1hSKaxr6bdDrO98npeCxLhrkaxcdsKytZgAIPE80wCs1o0ot5ATTPcjTuf3wRfgs1VVM/pub";
const CSV_TABS = {
  euh:      `${BASE}?gid=775592937&single=true&output=csv`,
  ehhedh:   `${BASE}?gid=1534156653&single=true&output=csv`,
  mtwem:    `${BASE}?gid=1603761457&single=true&output=csv`,
  esjhejch: `${BASE}?gid=577995959&single=true&output=csv`,
  gmh:      `${BASE}?gid=1818891382&single=true&output=csv`,
};

// Google Apps Script endpoint that emails suggestions to radsgam@gmail.com.
// Deploy the script (see instructions) and paste its Web App URL here:
const SUGGESTION_ENDPOINT = "https://script.google.com/macros/s/AKfycbxpP4gX31KCTJKzFsq7qna3u-GpQxd5GhMCXQtyfYCVE7WddPGpDw8tFEk5EUvtMRX2Gg/exec";

// ─── Anonymous usage logging ───
// Logs WHAT was used, never WHO used it. No names, no phone numbers, no call
// destinations. "Device" is a random string generated on this phone — it lets
// us count unique users without identifying anyone.
const getDeviceId = () => {
  try {
    let id = localStorage.getItem("iroc_did");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("iroc_did", id);
    }
    return id;
  } catch (e) { return "na"; }
};

const logEvent = (ev, hospital = "", role = "") => {
  try {
    const url = `${SUGGESTION_ENDPOINT}?log=1&ev=${encodeURIComponent(ev)}`
      + `&h=${encodeURIComponent(hospital)}&r=${encodeURIComponent(role)}`
      + `&d=${encodeURIComponent(getDeviceId())}&t=${Date.now()}`;
    fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
  } catch (e) { /* logging must never break the app */ }
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
    { key:"IR",          label:"IR",              icon:"🩺", row:0, hideWeek:true },
    { key:"Resident",    label:"Resident",        icon:"🙃", row:0, hideWeek:true },
    { key:"AllRN",       label:"IR RN",            icon:"🩹", row:1, tint:"#ECF3F8", composite:[
      {key:"IHRN",      label:"In-House IR RN",   weekendOnly:true},
      {key:"PrimaryRN", label:"Primary IR RN"},
      {key:"SecondRN",  label:"2nd IR RN",         weekdayLink:"https://ehconnect.eushc.org/", weekdayLinkLabel:"Open EHConnect"},
    ]},
    { key:"AllTech",     label:"IR Tech",           icon:"🔧", row:1, tint:"#EEF5F1", composite:[
      {key:"IHTech",      label:"In-House IR Tech", weekendOnly:true},
      {key:"PrimaryTech", label:"Primary IR Tech"},
      {key:"SecondTech",  label:"2nd IR Tech",       weekdayLink:"https://ehconnect.eushc.org/", weekdayLinkLabel:"Open EHConnect"},
    ]},
    { key:"CTTech",      label:"CT Tech",           icon:"🖥️", row:1, static:true, phone:"404-712-7036" },
    { key:"Anesthesia",  label:"Anesthesia",        icon:"💉", row:2, static:true, phone:"404-712-7283", note:"Look up on EHConnect", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"TieLines",    label:"Tie Line Dialer",   icon:"📞", row:2, static:true, phone:"", tieLines:[{shortcut:"2-XXXX", prefix:"404712", display:"404-712-XXXX"},{shortcut:"8-XXXX", prefix:"404778", display:"404-778-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers",     icon:"📱", row:2, static:true, phone:"" , numbers:[{label:"Operator", phone:"404-712-2000"}] },
  ],
  2: [
    { key:"IR",               label:"IR",                  icon:"🩺", row:0, hideWeek:true },
    { key:"NursingSupervisor",label:"Nursing Supervisor",  icon:"👩‍⚕️", row:1, static:true, phone:"470-382-0191", dynamicPhone:"_nursingSup", note:"Nursing Supervisor will provide information on the technologist and the RN on call." },
    { key:"Anesthesia",       label:"Anesthesia",          icon:"💉", row:1, static:true, phone:"", dynamicPhone:"_anes", note:"Look up on EHConnect", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:2, static:true, phone:"", tieLines:[{shortcut:"1-XXXX", prefix:"404501", display:"404-501-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:2, static:true, phone:"" , numbers:[{label:"Operator", phone:"404-501-8000"}] },
  ],
  3: [
    { key:"IR",                  label:"IR",                   icon:"🩺", row:0, hideWeek:true },
    { key:"RadiologySupervisor", label:"Radiology Supervisor", icon:"🔬", row:1, static:true, phone:"470-630-7477", dynamicPhone:"_radSup", note:"Radiology Supervisor will provide information on the technologist and the RN on call." },
    { key:"Anesthesia",          label:"Anesthesia",           icon:"💉", row:1, static:true, phone:"678-371-9038", dynamicPhone:"_anes" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:2, static:true, phone:"", tieLines:[{shortcut:"1-XXXX", prefix:"404501", display:"404-501-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:2, static:true, phone:"" , numbers:[{label:"Operator", phone:"404-501-1000"}] },
  ],
  4: [
    { key:"IR",          label:"IR",      icon:"🩺", row:0, hideWeek:true },
    { key:"Technologist",label:"IR Tech", icon:"🔧", row:1 },
    { key:"RN",          label:"IR RN",  icon:"🩹", row:1 },
    { key:"ESJH_CTTech",     label:"CT Tech",          icon:"🖥️", row:1, static:true, phone:"678-843-7093" },
    { key:"ESJH_Anesthesia", label:"Anesthesia",       icon:"💉", row:2, static:true, phone:"", note:'EHConnect → On-Call → Anesthesiology → select "Anesthesiology - ESJH - Anesthesiologist - 1"', link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"ESJH_RadMain",   label:"Radiology Main",    icon:"📞", row:2, static:true, phone:"678-843-7341" },
    { key:"ESJH_ORFront",   label:"OR Front Desk",     icon:"📞", row:2, static:true, phone:"678-843-7360" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:3, static:true, phone:"", tieLines:[{shortcut:"3-XXXX", prefix:"404843", display:"404-843-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:3, static:true, phone:"" , numbers:[{label:"Operator", phone:"678-843-7001"}] },
  ],
  5: [
    { key:"IR",         label:"IR",            icon:"🩺", row:0, hideWeek:true },
    { key:"OCC",        label:"Nursing Supervisor",  icon:"📞", row:1, static:true, phone:"404-491-5493", dynamicPhone:"_occ", badge:"call 1st", note:"RN Supervisor will call in IR Tech & RN.\n\nProvide following:\n• Patient name, MRN, location\n• Planned procedure & expected time\n• If anesthesia needed\n\n⚠️ If unable to reach, call EJCH Operator (678-474-7000) and ask for nursing supervisor." },
    { key:"POS",        label:"Point of Service",     icon:"📞", row:1, static:true, phone:"404-778-8298", dynamicPhone:"_pos", note:"POS will help post case" },
    { key:"CTTech",     label:"CT Tech",       icon:"🖥️", row:2, static:true, phone:"470-707-5459", phone2:"470-686-2641", noText:true },
    { key:"Anesthesia", label:"Anesthesia",    icon:"💉", row:2, static:true, phone:"470-990-1356" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:3, static:true, phone:"", tieLines:[{shortcut:"4-XXXX", prefix:"404474", display:"404-474-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:3, static:true, phone:"", numbers:[{label:"Operator", phone:"678-474-7000"}] },
  ],
  6: [
    { key:"IR",          label:"IR",         icon:"🩺", row:0, hideWeek:true },
    { key:"Resident",    label:"Resident",   icon:"🙃", row:0, hideWeek:true },
    { key:"Technologist",label:"IR Tech",    icon:"🔧", row:1, friWeekend:true },
    { key:"RN",          label:"IR RN",     icon:"🩹", row:1, friWeekend:true },
    { key:"RadFrontDesk",label:"Radiology Front Desk", icon:"📞", row:1, static:true, phone:"404-686-5998", note:"Call to find out the on-call RN and IR Tech" },
    { key:"CTTech",      label:"CT Tech",    icon:"🖥️", row:2, static:true, phone:"404-696-8984" },
    { key:"Anesthesia",  label:"Anesthesia", icon:"💉", row:2, static:true, phone:"", note:"Check on EHConnect for on-call anesthesiologist", link:"https://ehconnect.eushc.org/", linkLabel:"Open EHConnect" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:3, static:true, phone:"", tieLines:[{shortcut:"6-XXXX", prefix:"404686", display:"404-686-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:3, static:true, phone:"" , numbers:[{label:"Operator", phone:"404-686-4411"}] },
  ],
  7: [
    { key:"IR",          label:"IR",         icon:"🩺", row:0, hideWeek:true },
    { key:"Resident",    label:"Resident",   icon:"🙃", row:0, hideWeek:true },
    { key:"Technologist",label:"IR Tech",    icon:"🔧", row:1, hideWeek:true },
    { key:"RN",          label:"IR RN",     icon:"🩹", row:1, hideWeek:true },
    { key:"MTC",         label:"MTC",        icon:"🏥", row:2, static:true, phone:"404-616-2226" },
    { key:"Anesthesia",  label:"Anesthesia", icon:"💉", row:2, static:true, phone:"404-852-3253" },
    { key:"TieLines", label:"Tie Line Dialer", icon:"📞", row:3, static:true, phone:"", tieLines:[{shortcut:"5-XXXX", prefix:"404616", display:"404-616-XXXX"},{shortcut:"4-XXXX", prefix:"404489", display:"404-489-XXXX"}] },
    { key:"OtherPhones", label:"Other Numbers", icon:"📱", row:3, static:true, phone:"" , numbers:[{label:"Operator", phone:"404-616-1000"}] },
  ],
};

// ── CSV Parsing ─────────────────────────────────────────────────────────────
const parseCSVRows = (text) => {
  if (!text) return [];
  const rows = []; let row = []; let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { row.push(cur); cur = ""; }
    else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
};
// Find first row index whose any cell contains substring (case-insensitive)
const findAnchor = (rows, sub, from=0) => {
  const s = sub.toLowerCase();
  for (let i = from; i < rows.length; i++) {
    if (rows[i].some(cell => clean(cell).toLowerCase().includes(s))) return i;
  }
  return -1;
};
const clean = (s) => (s || "").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
const getDataRows = (allRows) => {
  return allRows.filter(r => {
    const h = clean(r[0]);
    return h && HOSP_ID[h];
  });
};
const c = (r, i) => clean(r[i]);

// ── Helpers for banner + other numbers (shared) ──
const parseBanner = (rows, data, id) => {
  let bi = findAnchor(rows, "SPECIAL INSTRUCTIONS");
  if (bi < 0) bi = findAnchor(rows, "ANNOUNCEMENT");
  if (bi >= 0) {
    // instruction text is in the next non-empty row, col 0
    for (let r = bi+1; r < Math.min(bi+3, rows.length); r++) {
      const txt = c(rows[r], 0);
      if (txt && !txt.toUpperCase().includes("SPECIAL INSTRUCTIONS") && !txt.toUpperCase().includes("ANNOUNCEMENT")) { data[id]._banner = txt; break; }
    }
  }
};
const parseOtherNumbers = (rows, data, id) => {
  const oi = findAnchor(rows, "OTHER NUMBERS");
  if (oi < 0) return;
  const nums = [];
  // skip the band row and the Name/Number header row
  for (let r = oi+2; r < rows.length; r++) {
    const name = c(rows[r], 0), phone = c(rows[r], 1);
    if (!name && !phone) continue;
    if (name.toUpperCase() === "NAME") continue;
    if (name) nums.push({ label: name, phone });
  }
  if (nums.length) data[id]._extraNumbers = nums;
};

// ─── EUH tab (stacked tables, anchor-based) ───
const parseEUHTab = (text, data) => {
  const rows = parseCSVRows(text); const id = 1; if (!data[id]) return;
  parseBanner(rows, data, id);
  parseOtherNumbers(rows, data, id);

  // ② IR + Resident
  const irAnchor = findAnchor(rows, "IR PHYSICIAN + RESIDENT");
  if (irAnchor >= 0) {
    for (let r = irAnchor+2; r < irAnchor+9 && r < rows.length; r++) {
      const day = c(rows[r],1); if (!DAYS.includes(day)) continue;
      const isWE = day==="Saturday"||day==="Sunday";
      data[id].IR[day] = { name:c(rows[r],2), phone:c(rows[r],3), time: isWE?"All Day":"5:00 PM – 7:00 AM" };
      data[id].Resident[day] = { name:c(rows[r],4), phone:c(rows[r],5), time: isWE?"All Day":"5:00 PM – 7:00 AM" };
    }
  }

  // ③ RN Weekend / ④ Tech Weekend — Name/Time/Phone triplets, labels in header
  const parseWeekend = (anchorText, keyIH, keyPrimary, keySecond) => {
    const a = findAnchor(rows, anchorText); if (a < 0) return;
    const hdr = rows[a+1] || [];
    // slot labels sit every 3rd column starting at index 2
    const labels = [];
    for (let c = 2; c < hdr.length; c += 3) {
      const lb = clean(hdr[c]); if (!lb) break;
      labels.push(lb.split("\n")[0]);
    }
    if (!labels.length) return;

    for (let r = a+2; r < a+5 && r < rows.length; r++) {
      const day = c(rows[r],1);
      if (day !== "Saturday" && day !== "Sunday") continue;

      const ih = [], primary = [], second = [], extra = [];
      labels.forEach((lb, k) => {
        const base = 2 + k*3;
        const nm = c(rows[r], base), tm = c(rows[r], base+1), ph = c(rows[r], base+2);
        if (!nm) return;
        const L = lb.toLowerCase();
        const item = { name:nm, time:tm, phone:ph };
        if (L.includes("in-house") || L.includes("in house")) ih.push(item);
        else if (L.includes("primary")) primary.push(item);
        else if (L.includes("2nd") || L.includes("second")) second.push(item);
        else extra.push(item);
      });

      const box = (list, fallbackTime) => list.length
        ? { name: list.map(e=>e.name).join(", "), phone: list[0].phone || "",
            time: list[0].time || fallbackTime, entries: list }
        : { name:"N/A", phone:"", time:"" };

      data[id][keyIH][day]      = box(ih, "7:00 AM – 7:30 PM");
      data[id][keyPrimary][day] = box(primary.concat(extra), "");
      data[id][keySecond][day]  = box(second, "7:00 PM – 7:00 AM");
    }
  };
  parseWeekend("IR RN — WEEKEND", "IHRN", "PrimaryRN", "SecondRN");
  parseWeekend("IR TECH — WEEKEND", "IHTech", "PrimaryTech", "SecondTech");

  // ⑤ RN Weekday / ⑥ Tech Weekday — RN1/2/3 (Name,Time,Phone), Mon-Fri
  const parseWeekday = (anchorText, keyPrimary) => {
    const a = findAnchor(rows, anchorText); if (a < 0) return;
    for (let r = a+2; r < a+8 && r < rows.length; r++) {
      const day = c(rows[r],1); if (!["Monday","Tuesday","Wednesday","Thursday","Friday"].includes(day)) continue;
      const slots = [];
      for (let k=0;k<4;k++){ const base=2+k*3; const nm=c(rows[r],base), tm=c(rows[r],base+1), ph=c(rows[r],base+2);
        if (nm && tm) slots.push({ name:nm, time:tm, phone:ph }); }
      // weekday people go into the Primary sub-role as a list (In-House/2nd empty on weekdays)
      data[id][keyPrimary][day] = slots.length ? { name:slots.map(s=>s.name).join(", "), phone:slots[0]?.phone||"", entries:slots } : { name:"N/A", phone:"", time:"" };
    }
  };
  parseWeekday("IR RN — WEEKDAY", "PrimaryRN");
  parseWeekday("IR TECH — WEEKDAY", "PrimaryTech");
};

// ─── EHH-EDH tab (two tables) ───
const parseEHHEDHTab = (text, data) => {
  const rows = parseCSVRows(text);
  // Banner + other numbers apply to both EHH(2) and EDH(3) — store on each
  const bi = findAnchor(rows, "SPECIAL INSTRUCTIONS");
  let banner = "";
  if (bi>=0) for (let r=bi+1;r<Math.min(bi+3,rows.length);r++){ const t=c(rows[r],0); if(t&&!t.toUpperCase().includes("SPECIAL INSTRUCTIONS") && !t.toUpperCase().includes("ANNOUNCEMENT")){banner=t;break;} }
  const oNums = []; const oi = findAnchor(rows, "OTHER NUMBERS");
  if (oi>=0) for (let r=oi+2;r<rows.length;r++){ const nm=c(rows[r],0),ph=c(rows[r],1); if(nm&&nm.toUpperCase()!=="NAME") oNums.push({label:nm,phone:ph}); }
  [2,3].forEach(hid => { if(data[hid]){ if(banner) data[hid]._banner=banner; if(oNums.length) data[hid]._extraNumbers=oNums; }});
  // Schedule rows: read by hospital name in col 0
  getDataRows(rows).forEach(r => {
    const id = HOSP_ID[c(r,0)]; const day = c(r,1);
    if ((id!==2 && id!==3) || !DAYS.includes(day) || !data[id]) return;
    const isWE = day==="Saturday"||day==="Sunday";
    data[id].IR[day] = { name:c(r,2), phone:c(r,3), time: isWE?"All Day":"5:00 PM – 7:00 AM" };
    data[id]._nursingSup = data[id]._nursingSup||{}; data[id]._radSup = data[id]._radSup||{}; data[id]._anes = data[id]._anes||{};
    if (c(r,4)) data[id]._nursingSup[day]=c(r,4);
    if (c(r,5)) data[id]._radSup[day]=c(r,5);
    if (c(r,6)) data[id]._anes[day]=c(r,6);
  });
};

// ─── MTWEM tab ───
const parseMTWEMTab = (text, data) => {
  const rows = parseCSVRows(text); const id=6; if(!data[id]) return;
  parseBanner(rows,data,id); parseOtherNumbers(rows,data,id);
  getDataRows(rows).forEach(r => {
    const raw = clean(r[0]).replace("MTWEM","MT/WEM"); if (HOSP_ID[raw]!==6) return;
    const day=c(r,1); if(!DAYS.includes(day)) return;
    const isWE=day==="Saturday"||day==="Sunday";
    data[id].IR[day]={name:c(r,2),phone:c(r,3),time:isWE?"All Day":"5:00 PM – 7:00 AM"};
    data[id].Resident[day]={name:c(r,4)||"N/A",phone:c(r,5)||"",time:isWE?"All Day":"5:00 PM – 7:00 AM"};
    const splt=(raw2,phone)=>{ if(!raw2) return {name:"N/A",phone:"",time:"On Call"};
      if(raw2.includes("/")){ const parts=raw2.split("/").map(s=>s.trim());
        const pnt=(s)=>{const m=s.match(/^(.+?)\s+(\d+[ap]?m?\s*-\s*\d+[ap]?m?)$/i); return m?{name:m[1].trim(),time:m[2].trim()}:{name:s,time:"On Call"};};
        const p1=pnt(parts[0]),p2=pnt(parts[1]); return {name:p1.name,phone,time:p1.time,name2:p2.name,phone2:"",time2:p2.time}; }
      return {name:raw2,phone,time:"On Call"}; };
    data[id].Technologist[day]=splt(c(r,6),c(r,7));
    data[id].RN[day]=splt(c(r,8),c(r,9));
  });
};

// ─── ESJH-EJCH tab (two tables; EJCH old format IR/OCC/POS) ───
const parseESJHEJCHTab = (text, data) => {
  const rows = parseCSVRows(text);
  let bi=findAnchor(rows,"SPECIAL INSTRUCTIONS"); if(bi<0) bi=findAnchor(rows,"ANNOUNCEMENT"); let banner="";
  if(bi>=0) for(let r=bi+1;r<Math.min(bi+3,rows.length);r++){const t=c(rows[r],0); if(t&&!t.toUpperCase().includes("SPECIAL INSTRUCTIONS") && !t.toUpperCase().includes("ANNOUNCEMENT")){banner=t;break;}}
  const oNums=[]; const oi=findAnchor(rows,"OTHER NUMBERS");
  if(oi>=0) for(let r=oi+2;r<rows.length;r++){const nm=c(rows[r],0),ph=c(rows[r],1); if(nm&&nm.toUpperCase()!=="NAME") oNums.push({label:nm,phone:ph});}
  [4,5].forEach(hid=>{if(data[hid]){if(banner)data[hid]._banner=banner; if(oNums.length)data[hid]._extraNumbers=oNums;}});
  getDataRows(rows).forEach(r => {
    const id=HOSP_ID[c(r,0)]; const day=c(r,1);
    if((id!==4&&id!==5)||!DAYS.includes(day)||!data[id]) return;
    const isWE=day==="Saturday"||day==="Sunday";
    data[id].IR[day]={name:c(r,2),phone:c(r,3),time:isWE?"All Day":"5:00 PM – 7:00 AM"};
    if(id===4){ // ESJH full: Tech col6/7, RN col8/9
      data[id].Technologist[day]={name:c(r,6)||"N/A",phone:c(r,7)||"",time:"On Call"};
      data[id].RN[day]={name:c(r,8)||"N/A",phone:c(r,9)||"",time:"On Call"};
    }
    if(id===5){ // EJCH old format: OCC col4, POS col5
      data[id]._occ=data[id]._occ||{}; data[id]._pos=data[id]._pos||{};
      if(c(r,4)) data[id]._occ[day]=c(r,4);
      if(c(r,5)) data[id]._pos[day]=c(r,5);
    }
  });
};

const parseGMHTab = (text, data) => {
  const rows = parseCSVRows(text); const id=7; if(!data[id]) return;
  parseBanner(rows,data,id); parseOtherNumbers(rows,data,id);
  getDataRows(rows).forEach(r => {
    if (HOSP_ID[c(r,0)]!==7) return; const day=c(r,1); if(!DAYS.includes(day)) return;
    const isWE=day==="Saturday"||day==="Sunday";
    data[id].IR[day]={name:c(r,2),phone:c(r,3),time:isWE?"All Day":"5:00 PM – 7:00 AM"};
    data[id].Resident[day]={name:c(r,4)||"N/A",phone:c(r,5)||"",time:isWE?"All Day":"5:00 PM – 7:00 AM"};
    data[id].Technologist[day]={name:c(r,6)||"N/A",phone:c(r,7)||"",time:"On Call"};
    data[id].RN[day]={name:c(r,8)||"N/A",phone:c(r,9)||"",time:"On Call"};
  });
};

const initData = () => {
  const data = {};
  HOSPITALS.forEach(h => {
    data[h.id] = {};
    (HOSPITAL_ROLES[h.id]||[]).forEach(role => {
      if (!role.static) data[h.id][role.key] = {};
      // Also init composite sub-keys
      if (role.composite) role.composite.forEach(sub => { data[h.id][sub.key] = {}; });
    });
  });
  return data;
};

const fetchSchedule = async () => {
  const data = initData();
  try {
    // cache-bust so a fresh save shows up instead of a stale cached CSV
    const bust = `&_=${Date.now()}`;
    const grab = (u) => fetch(u + bust, { cache: "no-store" }).then(r=>r.text());
    const [euh, ehhedh, mtwem, esjhejch, gmh] = await Promise.all([
      grab(CSV_TABS.euh),
      grab(CSV_TABS.ehhedh),
      grab(CSV_TABS.mtwem),
      grab(CSV_TABS.esjhejch),
      grab(CSV_TABS.gmh),
    ]);
    try { parseEUHTab(euh, data); } catch(e) { console.error("EUH parse error:", e); }
    try { parseEHHEDHTab(ehhedh, data); } catch(e) { console.error("EHH-EDH parse error:", e); }
    try { parseMTWEMTab(mtwem, data); } catch(e) { console.error("MTWEM parse error:", e); }
    try { parseESJHEJCHTab(esjhejch, data); } catch(e) { console.error("ESJH-EJCH parse error:", e); }
    try { parseGMHTab(gmh, data); } catch(e) { console.error("GMH parse error:", e); }
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

// Tie Line Dialer — enter last 4 digits, tap to call full number
function TieLineDialer({ tieLines, T, color }) {
  const [digits, setDigits] = useState("");
  const [selected, setSelected] = useState(0);
  const full = digits.length === 4 ? tieLines[selected].prefix + digits : null;
  const fullDisplay = digits.length === 4 ? tieLines[selected].display.replace("XXXX", digits) : null;
  return (
    <div style={{ marginTop:"10px" }}>
      <div style={{ display:"flex", gap:"6px", alignItems:"stretch" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
          {tieLines.map((tl, i) => (
            <div key={i} onClick={()=>setSelected(i)} style={{
              padding:"9px 14px", borderRadius:"8px", textAlign:"center", cursor:"pointer", fontSize:"13px", fontWeight:600, whiteSpace:"nowrap",
              background: selected === i ? color : T.roleBg,
              color: selected === i ? "#fff" : T.roleText,
              border:`1.5px solid ${selected === i ? color : T.roleBorder}`,
            }}>{tl.shortcut}</div>
          ))}
        </div>
        <div style={{ flex: full ? "0 0 35%" : 1 }}>
          <input type="tel" maxLength={4} placeholder="enter 4 digits" value={digits}
            onChange={e => setDigits(e.target.value.replace(/[^0-9]/g,"").slice(0,4))}
            style={{
              width:"100%", height:"100%", padding:"8px 4px", borderRadius:"8px", fontSize:"18px", fontWeight:600, letterSpacing:"5px",
              border:`2px solid ${digits.length === 4 ? color : T.roleBorder}`,
              background:T.roleBg, color:T.text, outline:"none", textAlign:"center",
              boxSizing:"border-box",
            }} />
        </div>
        {full && (
          <a href={`tel:${full}`} style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"8px 6px", borderRadius:"8px", background:color, color:"#fff",
            textDecoration:"none", fontWeight:700, fontSize:"12px", textAlign:"center",
          }}>📞 {fullDisplay}</a>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [schedule, setSchedule] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getDayName());
  const [suggestion, setSuggestion] = useState("");
  const [sugStatus, setSugStatus] = useState("idle"); // idle | sending | sent | error
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { fetchSchedule().then(d => setSchedule(d)).finally(() => setLoading(false)); }, []);
  useEffect(() => { logEvent("open"); }, []);

  // Android/iOS back button: navigate within app instead of exiting.
  // When a hospital is opened we push a history entry; the phone back button
  // fires popstate, which we intercept to return to the hospital list.
  useEffect(() => {
    const onPop = () => { setSelectedHospital(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Open/close a hospital through history so hardware back works.
  const closeHospital = () => {
    // Go back in history if we're on a pushed entry; else just clear.
    if (window.history.state && window.history.state.hospital) window.history.back();
    else setSelectedHospital(null);
  };

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
    window.history.pushState({ hospital: id }, "");
    setSelectedHospital(id);
    setSelectedRole((HOSPITAL_ROLES[id]||[])[0]?.key || null);
    setSelectedDay(todayName);
    logEvent("hospital", HOSPITALS.find(h => h.id === id)?.abbr || "");
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

        {editOpen && (
          <EditMode endpoint={SUGGESTION_ENDPOINT} T={T} dk={dk}
            onClose={()=>{ setEditOpen(false); setMenuOpen(false); }} />
        )}

        {/* ── top-right menu ── */}
        <div style={{ position:"absolute", top:"14px", right:"14px", zIndex:50 }}>
          <div onClick={()=>setMenuOpen(o=>!o)}
            style={{ width:"40px", height:"40px", borderRadius:"10px", display:"flex",
              alignItems:"center", justifyContent:"center", cursor:"pointer",
              background:T.card, border:`1px solid ${T.cardBorder}`,
              color:T.text, fontSize:"18px", fontWeight:700, lineHeight:1 }}>
            ⋮
          </div>
          {menuOpen && (
            <>
              <div onClick={()=>setMenuOpen(false)}
                style={{ position:"fixed", inset:0, zIndex:40 }} />
              <div style={{ position:"absolute", top:"46px", right:0, zIndex:50, minWidth:"188px",
                background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:"12px",
                overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.18)" }}>
                <div onClick={()=>{ setMenuOpen(false); setEditOpen(true); }}
                  style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:"9px",
                    color:T.text, fontWeight:700, fontSize:"13px", cursor:"pointer",
                    borderBottom:`1px solid ${T.cardBorder}` }}>
                  🔒 Scheduler Login
                </div>
                <div onClick={()=>{ setTheme(dk ? "light" : "dark"); setMenuOpen(false); }}
                  style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:"9px",
                    color:T.text, fontWeight:600, fontSize:"13px", cursor:"pointer" }}>
                  {dk ? "☀️ Light mode" : "🌙 Dark mode"}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ position:"relative", zIndex:1 }}>
          {/* #7 Watermark behind title */}
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", top:"85%", left:"50%", transform:"translate(-50%,-50%)", width:"55vw", maxWidth:"300px", aspectRatio:"1",
              backgroundImage:`url("${CREST_URL}")`, backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center",
              opacity: dk ? 0.07 : 0.07, pointerEvents:"none", zIndex:0, filter: dk ? "invert(1)" : "none" }} />
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
              <a href="https://login.microsoftonline.com/e004fb9c-b0a4-424f-bcd0-322606d5df38/oauth2/authorize?client%5Fid=00000003%2D0000%2D0ff1%2Dce00%2D000000000000&response%5Fmode=form%5Fpost&ear%5Fjwe%5Fcrypto=eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkdDTSIsImFwdiI6IkFBQUFDVVZoY2tOc2FXVnVkR2dBQUFCRlEwc3pNQUFBQUpJR1lzbStJSjVEMU5TbU5HL3RwYWh5bTZqVXlWNVpFZmozR3RXK0FrMStRditkTGlGdzNKc25TcEhHZk9WTXVLeEJsTFNqUExhd1lIQTI5ayt0QndOYmE1dmlLM2ozTnpxR0JubUViMXNXcEttTTlXa2J4ZjAzTlNEaHFDZUdjZ0FBQUJoeU9wMy8zSEdkbVRDcVV2eGRsR1VWcUFOQythN0VmUFk9In0%3D&ear%5Fjwk=eyJhbGciOiJFQ0RILUVTIiwiY3J2IjoiUC0zODQiLCJ4IjoiQUFBQU1KSUdZc20rSUo1RDFOU21ORy90cGFoeW02alV5VjVaRWZqM0d0VytBazErUXYrZExpRnczSnNuU3BIR2ZPVk11QT09IiwieSI6IkFBQUFNS3hCbExTalBMYXdZSEEyOWsrdEJ3TmJhNXZpSzNqM056cUdCbm1FYjFzV3BLbU05V2tieGYwM05TRGhxQ2VHY2c9PSIsImt0eSI6IkVDIn0%3D&spa%5Fclient%5Fid=08e18876%2D6177%2D487e%2Db8b5%2Dcf950c1e598c&client%5Finfo=1&response%5Ftype=code%20id%5Ftoken%20spa%5Frt&resource=00000003%2D0000%2D0ff1%2Dce00%2D000000000000&scope=openid&nonce=4AE8661AA7463540F6A9B6325A39CFF8901F255A95BC6DE7%2D9494BA717D411087C1C45D5C24BCF455BDD924B4D04EE6C063C575BBF63EB244&redirect%5Furi=https%3A%2F%2Femory%2Dmy%2Esharepoint%2Ecom%2F%5Fforms%2Fdefault%2Easpx&state=OD0wJjMyPUFBTDRuQUFBQUJRNzI4MlFkU1lLamZBU0pYSiUyRmI4aVo4VzV2aGhhJTJGRzE2R2NvVkh1YU84c05pZlRrYmtid1Qza2hibkNHSCUyQnlGUDc4WkNLaDZtMVpLaVlCVkpaNCUyRnhOZ3lJMTF5RUIyRTJDM1hrS25lOTdNbXFiU1ZKSVFTVXlEaFBiaThiWnNlVEE4YXd4OTB4YXdwYVBlNyUyQk1FWXVseVlDN3hBY3dYQjVCZ2x2N1UwV3dJVyUyQkJRWkRhY0tCam5jZDR1RkolMkZWazhUSlJVOUN6Q0NOUndKbDBMbUJINGwyUCUyQnJJeGNTbmxNOFhHaVlDNEprJTJGbUg5R2NOUXFWZlFqcXBKOUlwYnFYT3FhalZrcE05WXJwUnhpT1dwQVBzTXNzYU4yOFJKJTJGd3l5UVA4N3cyVVB2WWk3Q3JPczJSTDlObTV0JTJGNHNnUWw4czBpbXBRSzE0Z1JzMzJsMFNEOURqNGlMYjlNdCUyRk9tNzFCamh4RDNCMlExdDE4bU1yMW4wTkNJayUzRA&claims=%7B%22id%5Ftoken%22%3A%7B%22xms%5Fcc%22%3A%7B%22values%22%3A%5B%22CP1%22%5D%7D%7D%7D&wsucxt=1&cobrandid=11bd8083%2D87e0%2D41b5%2Dbb78%2D0bc43c8a8e8a&client%2Drequest%2Did=57b818a2%2Db001%2D8000%2D10c8%2Da79f04538046&sso_reload=true" target="_blank" rel="noopener noreferrer" style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:"5px",
                padding:"14px 12px", borderRadius:"12px", textDecoration:"none", marginTop:"8px",
                background:"linear-gradient(135deg, #2B5797 0%, #1A3A6A 100%)", color:"#fff", fontWeight:700, fontSize:"13px",
              }}><span>☁️</span> OneDrive - Call Sign Out</a>
            </div>

            {/* Divider */}
            <div style={{ height:"1px", background:T.cardBorder, margin:"22px 30px" }} />

            {/* Suggestion box */}
            <div style={{ background: dk ? "#132033" : "#FFFFFF", border:`1.5px solid ${T.cardBorder}`, borderRadius:"12px", padding:"10px" }}>
              <div style={{ fontSize:"10px", letterSpacing:"1.5px", color:T.quickLinkText, fontWeight:700, textTransform:"uppercase", textAlign:"center", marginBottom:"6px" }}>
                💡 Suggest an Improvement
              </div>
              <textarea
                value={suggestion}
                onChange={(e)=>{ setSuggestion(e.target.value); if (sugStatus==="sent"||sugStatus==="error") setSugStatus("idle"); }}
                placeholder="Idea, issue, or feature request…"
                rows={2}
                style={{ width:"100%", boxSizing:"border-box", padding:"8px", borderRadius:"9px", resize:"vertical",
                  border:`1px solid ${T.cardBorder}`, background: dk ? "#0F1D30" : "#F7FAFC",
                  color: dk ? "#E2E8F0" : "#1E293B", fontSize:"13px", fontFamily:"inherit" }}
              />
              <div
                onClick={async ()=>{
                  if (!suggestion.trim() || sugStatus==="sending") return;
                  const text = suggestion.trim();
                  setSugStatus("sending");
                  const url = `${SUGGESTION_ENDPOINT}?s=${encodeURIComponent(text)}&t=${Date.now()}`;
                  try {
                    await fetch(url, { method:"GET", mode:"no-cors", cache:"no-store", redirect:"follow" });
                    setSugStatus("sent"); setSuggestion("");
                  } catch(e) {
                    // Fallback: image beacon — can't be blocked by CORS
                    try {
                      const img = new Image();
                      img.src = url;
                      setSugStatus("sent"); setSuggestion("");
                    } catch(e2) { setSugStatus("error"); }
                  }
                }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginTop:"6px",
                  padding:"10px", borderRadius:"9px", fontWeight:700, fontSize:"13px",
                  background: sugStatus==="sent" ? "#2A9D5A" : (suggestion.trim() ? "linear-gradient(135deg, #3D7A8F 0%, #2B5A6C 100%)" : (dk ? "#1A2A3F" : "#E2E8F0")),
                  color: (suggestion.trim()||sugStatus==="sent") ? "#fff" : T.textMuted,
                  cursor: suggestion.trim() ? "pointer" : "default" }}
              >
                {sugStatus==="sending" ? "Sending…" : sugStatus==="sent" ? "✓ Sent — thank you!" : sugStatus==="error" ? "Couldn't send — tap to retry" : "📨 Send Suggestion"}
              </div>
            </div>

            <div style={{ textAlign:"center", marginTop:"14px", fontSize:"9px", color:T.textMuted, letterSpacing:"1px" }}>
              IROC v10.2.1
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
    // Data-driven roles (MT/WEM tech/RN, ESJH tech/RN): show only if data exists for the day
    if (r.weekendOnly || r.friWeekend) {
      const entry = schedule?.[selectedHospital]?.[r.key]?.[selectedDay];
      return entry && entry.name && entry.name !== "N/A" && entry.name !== "Weekend Only";
    }
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
  const showFullWeek = !activeRole?.static && !activeRole?.hideWeek && !activeRole?.composite;

  const PhoneButtons = ({ phone, clr, noText }) => {
    if (!phone) return null;
    const digits = phone.replace(/[^0-9]/g,"");
    return (
      <div style={{ display:"flex", gap:"8px", marginTop:"8px" }}>
        <a href={`tel:${digits}`} onClick={()=>logEvent("call", hospital?.abbr || "", activeRole?.label || "")} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"4px",
          padding:"8px 0", borderRadius:"8px", background:clr, color:"#fff", textDecoration:"none", fontSize:"12px", fontWeight:700 }}>
          📞 Call
        </a>
        {!noText && <a href={`sms:${digits}`} onClick={()=>logEvent("text", hospital?.abbr || "", activeRole?.label || "")} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"4px",
          padding:"8px 0", borderRadius:"8px", background:T.oncallBg, border:`1.5px solid ${clr}`, color:clr, textDecoration:"none", fontSize:"12px", fontWeight:700 }}>
          💬 Text
        </a>}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:T.detailBg, fontFamily:font, overflowX:"hidden" }}>
      {/* Fixed header */}
      <div style={{ background:hospital.color, padding:"18px 16px", display:"flex", alignItems:"center", gap:"10px", position:"fixed", top:0, left:0, right:0, zIndex:100 }}>
        <div onClick={closeHospital} style={{
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

      <div style={{ padding:"68px 12px 40px", maxWidth:"500px", margin:"0 auto" }}>
        {/* #4 DAY selector FIRST — double sized */}
        <div style={{ fontSize:"10px", letterSpacing:"2px", color:T.textMuted, fontWeight:700, marginBottom:"5px", textTransform:"uppercase" }}>Day</div>
        {schedule?.[selectedHospital]?._banner && (
          <div style={{ marginBottom:"14px", padding:"12px 14px", borderRadius:"12px",
            background: dk ? "#3A2E14" : "#FFF7E0", border:`2px solid ${dk ? "#B8892E" : "#E0B84A"}` }}>
            <div style={{ fontSize:"10px", fontWeight:800, color: dk ? "#E0B84A" : "#9A6E1A", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"4px" }}>
              📢 Announcements
            </div>
            <div style={{ fontSize:"14px", color: dk ? "#F0E4C4" : "#5A4A1A", lineHeight:1.5, whiteSpace:"pre-line" }}>
              {schedule[selectedHospital]._banner}
            </div>
          </div>
        )}
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
        <div style={{ display:"flex", flexDirection:"column", gap:"4px", marginBottom:"12px" }}>
          {Object.keys(rowGroups).sort().map(rn => (
            <div key={rn} style={{ display:"grid", gridTemplateColumns:`repeat(${rowGroups[rn].length},1fr)`, gap:"4px" }}>
              {rowGroups[rn].map(role => {
                const act = effectiveRole === role.key;
                return (
                  <div key={role.key} onClick={()=>{ setSelectedRole(role.key); logEvent("role", hospital?.abbr || "", role.label); }} style={{
                    textAlign:"center", padding:"7px 3px", borderRadius:"8px", cursor:"pointer",
                    background: act ? hospital.color : (role.tint && !dk ? role.tint : T.roleBg),
                    border:`2px solid ${act ? hospital.color : T.roleBorder}`,
                    color: act ? "#fff" : T.roleText,
                    boxShadow: act ? `0 2px 6px ${hospital.color}40` : "none",
                  }}>
                    <div style={{ fontSize:"14px" }}>{role.icon}</div>
                    <div style={{ fontSize:"10px", fontWeight:700, lineHeight:"1.2", marginTop:"1px" }}>{role.label}{role.badge && <span style={{ fontSize:"8px", fontWeight:600, opacity:0.75, display:"block" }}>({role.badge})</span>}</div>
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
            <div style={{ fontSize:"13px", color: dk ? "#B0C0D0" : "#2A3A5A", lineHeight:"1.5", whiteSpace:"pre-line" }}>{"1. Call RN Supervisor — give appropriate info\n2. Call Anesthesia (if needed)\n3. Enter Procedure order\nOn-call team (RN/IR Tech) will post case utilizing P.O.S."}</div>
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

          {activeRole?.static ? (() => {
            const dynPhone = activeRole.dynamicPhone ? (schedule?.[selectedHospital]?.[activeRole.dynamicPhone]?.[selectedDay] || activeRole.phone) : activeRole.phone;
            return (
            <div style={{ borderRadius:"12px", border:`2px solid ${hospital.color}30`, background:T.oncallBg, padding:"12px" }}>
              <div style={{ fontSize:"10px", fontWeight:700, color:hospital.color, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"4px" }}>
                {activeRole.icon} {activeRole.label}
              </div>
              {dynPhone ? (
                <>
                  <div style={{ fontSize:"16px", fontWeight:700, color:T.text }}>{dynPhone}</div>
                  <PhoneButtons phone={dynPhone} clr={hospital.color} noText={activeRole.noText} />
                  {activeRole.phone2 && <>
                    <div style={{ fontSize:"14px", fontWeight:600, color:T.text, marginTop:"10px" }}>{activeRole.phone2}</div>
                    <PhoneButtons phone={activeRole.phone2} clr={hospital.color} noText={activeRole.noText} />
                  </>}
                </>
              ) : null}
              {activeRole.note && <div style={{ fontSize:"14px", color: dk ? "#D4A84A" : "#8A6D2A", marginTop:"8px", whiteSpace:"pre-line" }}>⚠️ {activeRole.note}</div>}
              {activeRole.image && <ZoomImage src={activeRole.image} alt={activeRole.label} color={hospital.color} T={T} />}
              {activeRole.link && (
                <a href={activeRole.link} target="_blank" rel="noopener noreferrer" style={{
                  display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"8px",
                  padding:"8px 16px", borderRadius:"8px", textDecoration:"none",
                  background:"linear-gradient(135deg, #6EA3C8 0%, #4A7EA0 100%)", color:"#fff", fontWeight:700, fontSize:"12px",
                }}>🔗 {activeRole.linkLabel || "Open Link"}</a>
              )}
              {activeRole.tieLines && <TieLineDialer tieLines={activeRole.tieLines} T={T} color={hospital.color} />}
              {activeRole.numbers && [...activeRole.numbers, ...(schedule?.[selectedHospital]?._extraNumbers || [])].map((n, i) => (
                <div key={i} style={{ paddingTop: i > 0 ? "8px" : "4px", paddingBottom:"8px", borderBottom: `1px solid ${T.dayBorder}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ flex:1, fontSize:"15px", fontWeight:700, color:T.text }}>{n.label}</div>
                    <a href={`tel:${n.phone.replace(/[^0-9]/g,"")}`} style={{
                      flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"4px",
                      padding:"8px 0", borderRadius:"8px", background:hospital.color, color:"#fff",
                      textDecoration:"none", fontSize:"13px", fontWeight:700,
                    }}>📞 {n.phone}</a>
                  </div>
                </div>
              ))}
            </div>
            );
          })() : activeRole?.composite ? (
            (() => {
              const visibleSubs = activeRole.composite.filter(sub => {
                const entry = schedule?.[selectedHospital]?.[sub.key]?.[selectedDay];
                const hasData = entry && entry.name && entry.name !== "N/A" && entry.name !== "Weekend Only";
                const showLink = sub.weekdayLink && !isWeekendDay && selectedDay !== "Friday";
                return hasData || showLink;
              });
              if (visibleSubs.length === 0) {
                return (
                  <div style={{ borderRadius:"12px", border:`2px dashed ${T.cardBorder}`, background:T.oncallBg, padding:"18px", textAlign:"center" }}>
                    <div style={{ color:T.textMuted, fontSize:"13px" }}>No one scheduled</div>
                  </div>
                );
              }
              return (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {visibleSubs.map((sub, subIdx) => {
                const entry = schedule?.[selectedHospital]?.[sub.key]?.[selectedDay];
                const hasData = entry && entry.name && entry.name !== "N/A" && entry.name !== "Weekend Only";
                const boxBg = subIdx % 2 === 0
                  ? (dk ? `${hospital.color}12` : `${hospital.color}08`)
                  : (dk ? T.oncallBg : "#ffffff");
                return (
                  <div key={sub.key} style={{ borderRadius:"12px", border:`2px solid ${hospital.color}40`, background:boxBg, padding:"10px" }}>
                    <div style={{ fontSize:"12px", fontWeight:800, color:hospital.color, letterSpacing:"1px", textTransform:"uppercase", textAlign:"center", marginBottom:"6px" }}>
                      {(!isWeekendDay && sub.label.startsWith("Primary ")) ? sub.label.replace("Primary ", "") : sub.label}{sub.weekendOnly && entry?.time ? ` — ${entry.time}` : ""}
                    </div>
                    {hasData ? (
                      <>
                        {entry.entries && entry.entries.length > 0 ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                            {entry.entries.map((e, ei) => (
                              <div key={ei} style={{ padding:"6px 0", borderTop: ei > 0 ? `1px solid ${T.dayBorder}` : "none" }}>
                                <div style={{ fontSize:"14px", fontWeight:600, color:T.text }}>
                                  {e.name}
                                  {e.time ? <span style={{ fontWeight:500, fontSize:"11px", color:T.textSub }}> · {e.time}</span> : ""}
                                  {e.phone ? <span style={{ fontWeight:500, fontSize:"12px", color:T.textSub }}> · 📞 {e.phone}</span> : ""}
                                </div>
                                <PhoneButtons phone={e.phone} clr={hospital.color} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize:"14px", fontWeight:600, color:T.text }}>
                              {entry.name}
                              {entry.time ? <span style={{ fontWeight:500, fontSize:"11px", color:T.textSub }}> · {entry.time}</span> : ""}
                              {entry.phone ? <span style={{ fontWeight:500, fontSize:"12px", color:T.textSub }}> · 📞 {entry.phone}</span> : ""}
                            </div>
                            <PhoneButtons phone={entry.phone} clr={hospital.color} />
                            {entry.name2 && (
                              <div style={{ marginTop:"6px", paddingTop:"6px", borderTop:`1px solid ${T.dayBorder}` }}>
                                <div style={{ fontSize:"14px", fontWeight:600, color:T.text }}>
                                  {entry.name2}
                                  {entry.time2 ? <span style={{ fontWeight:500, fontSize:"11px", color:T.textSub }}> · {entry.time2}</span> : ""}
                                  {entry.phone2 ? <span style={{ fontWeight:500, fontSize:"12px", color:T.textSub }}> · 📞 {entry.phone2}</span> : ""}
                                </div>
                                <PhoneButtons phone={entry.phone2} clr={hospital.color} />
                              </div>
                            )}
                          </>
                        )}
                        {sub.weekdayLink && !isWeekendDay && selectedDay !== "Friday" && (
                          <a href={sub.weekdayLink} target="_blank" rel="noopener noreferrer" style={{
                            display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"4px",
                            padding:"6px 12px", borderRadius:"6px", textDecoration:"none",
                            background:"linear-gradient(135deg, #4A6FA0 0%, #2B4A7A 100%)", color:"#fff", fontWeight:700, fontSize:"11px",
                          }}>🔗 {sub.weekdayLinkLabel || "Open EHConnect"}</a>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign:"center" }}>
                        {sub.weekdayLink && !isWeekendDay && selectedDay !== "Friday" ? (
                          <a href={sub.weekdayLink} target="_blank" rel="noopener noreferrer" style={{
                            display:"inline-flex", alignItems:"center", gap:"5px",
                            padding:"6px 12px", borderRadius:"6px", textDecoration:"none",
                            background:"linear-gradient(135deg, #4A6FA0 0%, #2B4A7A 100%)", color:"#fff", fontWeight:700, fontSize:"11px",
                          }}>🔗 {sub.weekdayLinkLabel || "Open EHConnect"}</a>
                        ) : <span style={{ color:T.textMuted, fontSize:"12px" }}>—</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              );
            })()
          ) : todayEntry && todayEntry.name && todayEntry.name !== "N/A" && todayEntry.name !== "Weekend Only" ? (
            <div style={{ borderRadius:"12px", border:`2px solid ${hospital.color}30`, background:T.oncallBg, padding:"12px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:hospital.color, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"6px" }}>
                {activeRole?.icon} {activeRole?.label}{todayEntry.time ? ` — ${todayEntry.time}` : ""}
              </div>
              {/* Multi-person entries (In-House RN/Tech) */}
              {todayEntry.entries && todayEntry.entries.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {todayEntry.entries.map((e, idx) => (
                    <div key={idx} style={{ paddingTop: idx > 0 ? "8px" : "0", borderTop: idx > 0 ? `1px solid ${T.dayBorder}` : "none" }}>
                      <div style={{ fontSize:"15px", fontWeight:700, color:T.text }}>{e.name}{e.phone ? <span style={{ fontWeight:500, fontSize:"13px", color:T.textSub }}> · 📞 {e.phone}</span> : ""}</div>
                      <PhoneButtons phone={e.phone} clr={hospital.color} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:"16px", fontWeight:700, color:T.text }}>{todayEntry.name}{todayEntry.phone ? <span style={{ fontWeight:500, fontSize:"13px", color:T.textSub }}> · 📞 {todayEntry.phone}</span> : ""}</div>
                  <PhoneButtons phone={todayEntry.phone} clr={hospital.color} />
                  {activeRole?.weekdayLink && !isWeekendDay && selectedDay !== "Friday" && (
                    <a href={activeRole.weekdayLink} target="_blank" rel="noopener noreferrer" style={{
                      display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"8px",
                      padding:"8px 16px", borderRadius:"8px", textDecoration:"none",
                      background:`linear-gradient(135deg, #4A6FA0 0%, #2B4A7A 100%)`, color:"#fff", fontWeight:700, fontSize:"12px",
                    }}>🔗 {activeRole.weekdayLinkLabel || "Open EHConnect"}</a>
                  )}
                  {todayEntry.name2 && (
                    <div style={{ marginTop:"10px", paddingTop:"8px", borderTop:`1px solid ${T.dayBorder}` }}>
                      <div style={{ fontSize:"14px", fontWeight:600, color:T.text }}>{todayEntry.name2}{todayEntry.time2 ? <span style={{ fontWeight:400, fontSize:"11px", color:T.textSub }}> · {todayEntry.time2}</span> : ""}{todayEntry.phone2 ? <span style={{ fontWeight:500, fontSize:"12px", color:T.textSub }}> · 📞 {todayEntry.phone2}</span> : ""}</div>
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
