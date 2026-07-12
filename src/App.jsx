import { useState, useRef, useEffect } from "react";
import {
  Camera, ImagePlus, X, LogOut, ClipboardList, ListChecks, LayoutDashboard,
  Activity, CheckCircle2, AlertTriangle, XCircle, Mail, ChevronRight, ArrowLeft,
  Pencil, Users, Eye, EyeOff, Plus, Trash2, Car, ChevronDown, Clock,
  ThumbsUp, ThumbsDown, Globe, AlertCircle,
} from "lucide-react";

/* ─── COLORS (inline style, not Tailwind classes — see note below) ───
   This environment doesn't compile Tailwind's arbitrary-value syntax
   (bg-[#1e2761] etc.) since there's no build step here, so every custom
   PSBank color and every font-size under 12px is applied via inline
   style={{}} instead. Standard Tailwind utility classes (flex, p-3,
   rounded, text-xs, border, text-emerald-600, etc.) still work fine and
   are used everywhere else.
──────────────────────────────────────────────────────────────────── */
const NAVY = "#1e2761";
const NAVY_DARK = "#162050";
const GOLD = "#fbbf24";

/* ─── ROLE SYSTEM ────────────────────────────────────────────────
   Demo accounts (not shown on login screen — reference only):
     superadmin  / sa@2026!   → super_admin
     aoofficer   / aoofc123   → appraisal_officer
     woofficer   / woofc123   → warehouse_officer
     roofficer   / roofc123   → repo_officer
     mreyes      / appr123    → Appraiser
     nvillanueva / appr456    → Appraiser
     rsantos     / ware123    → Warehouse
     lgarcia     / ware456    → Warehouse
     jcruz       / repo123    → Repossessor
     adizon      / repo456    → Repossessor
──────────────────────────────────────────────────────────────── */
const ROLE_META = {
  super_admin:       { label:"Super Admin",         color:"#e11d48", code:"SA" },
  appraisal_officer: { label:"Appraisal Officer",   color:"#d97706", code:"AO" },
  warehouse_officer: { label:"Warehouse Officer",   color:"#7c3aed", code:"WO" },
  repo_officer:      { label:"Repossessor Officer", color:"#0284c7", code:"RO" },
  Appraiser:         { label:"Appraiser",           color:"#d97706", code:"AP" },
  Warehouse:         { label:"Warehouse",           color:"#7c3aed", code:"WH" },
  Repossessor:       { label:"Repossessor",         color:"#0284c7", code:"RP" },
};
const ENCODER_ROLES = ["Repossessor","Warehouse","Appraiser"];
const OFFICER_ROLES = ["repo_officer","warehouse_officer","appraisal_officer"];
const ALL_ROLES = Object.keys(ROLE_META);
function isEncoder(r){ return ENCODER_ROLES.includes(r); }
function isOfficer(r){ return OFFICER_ROLES.includes(r); }
function isSuperAdmin(r){ return r==="super_admin"; }
function encoderGroup(r){ return r==="Appraiser"||r==="appraisal_officer"?"Appraiser":r==="Warehouse"||r==="warehouse_officer"?"Warehouse":r==="Repossessor"||r==="repo_officer"?"Repossessor":null; }

/* ─── CONDITIONS — no default, no GOOD ──────────────────────────
   Display order: FAIR, POOR, NONE, REPLACED
   Severity rank (for discrepancy calc): REPLACED(0) < FAIR(1) < POOR(2) < NONE(3)
──────────────────────────────────────────────────────────────── */
const CONDITIONS = ["FAIR","POOR","NONE","REPLACED"];
const RANK = { REPLACED:0, FAIR:1, POOR:2, NONE:3 };

/* ─── CHECKLIST DEFINITION ───────────────────────────────────── */
const MVC_SECTIONS = [
  { key:"ENGINE", label:"Engine Compartment", items:[
    {n:"Radiator",r:1},{n:"Radiator Cap",r:1},{n:"Radiator Reservoir Tank",r:1},{n:"Radiator Fan",r:1},{n:"Auxiliary Fan"},
    {n:"A/C Condenser",r:1},{n:"Washer Tank"},{n:"Engine Oil Filler Cap",r:1},{n:"Air Cleaner Cover",r:1},
    {n:"Brake Fluid Reservoir Cap",r:1},{n:"Fuse Box",r:1},{n:"Alternator",r:1},{n:"Alternator Belt",r:1},
    {n:"Power Steering Belt"},{n:"Aircon Belt"},{n:"Serpentine Belt"},{n:"Dipstick",r:1},{n:"Injection Pump"},
    {n:"Battery Brand",r:1,t:1},
  ]},
  { key:"EXTERIOR", label:"Body Exterior", items:[
    {n:"Head Light (Right)",r:1},{n:"Head Light (Left)",r:1},{n:"Head Signal Light (Right)"},{n:"Head Signal Light (Left)"},
    {n:"Fog Light (Right)"},{n:"Fog Light (Left)"},{n:"Signal Light Side Mirror (Right)"},{n:"Signal Light Side Mirror (Left)"},
    {n:"Tail Light (Right)",r:1},{n:"Tail Light (Left)",r:1},{n:"Tail Break Light (Right)",r:1},{n:"Tail Break Light (Left)",r:1},
    {n:"Tail Signal Light (Right)"},{n:"Tail Signal Light (Left)"},{n:"Tail Reverse Light Right"},{n:"Tail Reverse Light Left"},
    {n:"Third Break Light"},{n:"Emblem"},{n:"LTO Issued Plates",r:1},{n:"Radiator Grille",r:1},
    {n:"Front Bumper",r:1},{n:"Rear Bumper",r:1},{n:"Front Windshield",r:1},{n:"Rear Windshield",r:1},{n:"Spoiler (Built-in)"},
    {n:"Door Side Front (Right)",r:1},{n:"Door Side Front (Left)",r:1},{n:"Door Side Back (Right)"},{n:"Door Side Back (Left)"},
    {n:"Door Sliding (Right)"},{n:"Door Sliding (Left)"},{n:"Door Back / Trunk",r:1},
    {n:"F-Right Tire Brand",r:1,t:1},{n:"F-Left Tire Brand",r:1,t:1},{n:"R-Right Tire Brand",r:1,t:1},{n:"R-Left Tire Brand",r:1,t:1},
    {n:"Center Cap (pcs)"},{n:"Tire Valve Caps (pcs)"},
    {n:"Side Mirror (Right)",r:1},{n:"Side Mirror (Left)",r:1},{n:"Back Mirror",r:1},
    {n:"Front Wiper (pcs)",r:1},{n:"Rear Wiper (pcs)"},{n:"Front Suspension",r:1},{n:"Rear Suspension",r:1},{n:"Antenna"},
  ]},
  { key:"TRUNK", label:"Trunk Compartment", items:[
    {n:"Spare Tire Brand",r:1,t:1},{n:"Spare Wheel (Mags/Rim)",r:1},{n:"Spare Tire Cover"},
    {n:"Trunk Board Cover / Matting",r:1},{n:"Basic Tools (pcs)"},{n:"Tire Wrench (pcs)",r:1},
    {n:"EWD (pcs)"},{n:"Jack (Hydr/pcs)",r:1},{n:"Jack Handle (pcs)",r:1},{n:"Tow Bolt (pcs)"},
  ]},
  { key:"INTERIOR", label:"Body Interior", items:[
    {n:"Aircon",r:1},{n:"Instrument Panel (ODO, Etc.)",r:1},{n:"Airbag (pcs)"},{n:"Steering Wheel w/ Controls",r:1},
    {n:"Horn",r:1},{n:"Signal Light Lever",r:1},{n:"Wiper Lever",r:1},{n:"Window Handle (pcs)"},
    {n:"Power Window Main Controls"},{n:"Window Control Front Right"},{n:"Window Control Back Right"},{n:"Window Control Back Left"},
    {n:"Rear View Mirror",r:1},{n:"Sunvisors (pcs)"},{n:"Grab Handle (pcs)"},{n:"Glove Compartment",r:1},
    {n:"Arm Rest Compartment"},{n:"Dash Board",r:1},{n:"Back Board"},
    {n:"Ignition Key (pcs)",r:1},{n:"Remote Only (pcs)"},{n:"Key w/ Remote (pcs)"},{n:"Door Key Only (pcs)"},
    {n:"Domelight",r:1},{n:"Stereo / Infotainment",r:1},{n:"Speaker (pcs)"},{n:"Seat Belts (pcs)",r:1},{n:"Head Rest (pcs)"},
    {n:"Seat Front Right",r:1},{n:"Seat Front Left",r:1},{n:"Seat Back Row"},
    {n:"Seat 1st Row (Van Type)"},{n:"Seat 2nd Row (Van Type)"},{n:"Seat 3rd Row (Van Type)"},
    {n:"Seat 4th Row (Van Type)"},{n:"Seat Side Right (FB Type)"},{n:"Seat Side Left (FB Type)"},
  ]},
  { key:"ACCESSORIES", label:"Accessories", items:[
    {n:"Seat Cover (pcs)"},{n:"Floor Matting (pcs)"},{n:"Steering Wheel Cover"},
    {n:"Rain Guard (pcs)"},{n:"Garnish (pcs)"},{n:"Manual Booklet"},
  ]},
];
const ALL_ITEM_NAMES = MVC_SECTIONS.flatMap(s=>s.items.map(i=>i.n));

const APPRAISAL_SLOTS = [
  {key:"front_left",label:"Front Left"},{key:"rear_right",label:"Rear Right"},
  {key:"engine",label:"Engine"},{key:"driver_seat",label:"Driver Seat"},
  {key:"odometer",label:"Odometer"},{key:"damages",label:"Damages"},
  {key:"plate_number",label:"Plate Number"},{key:"conduction_sticker",label:"Conduction Sticker"},
  {key:"spare_tire",label:"Spare Tire"},{key:"shift_lever",label:"Shift Lever"},
];

/* ─── PH VEHICLES ────────────────────────────────────────────── */
const PH_VEHICLES = {
  Toyota:{Vios:["1.3 XE MT","1.3 E CVT","1.5 G CVT","1.5 V CVT"],Wigo:["1.0 E MT","1.0 E AT","1.0 G AT"],Fortuner:["2.4 G DSL 4x2 AT","2.4 G DSL 4x4 MT","2.8 V DSL 4x4 AT","2.8 GR Sport 4x4 AT"],Innova:["2.0 E Gas MT","2.0 E Gas AT","2.8 E DSL MT","2.8 G DSL AT","2.8 V DSL AT"],Hilux:["2.4 J DSL 4x2 MT","2.4 G DSL 4x2 AT","2.8 G DSL 4x4 AT","2.8 Conquest DSL 4x4 AT"],Hiace:["2.8 Commuter DSL MT","2.8 Super Grandia Elite AT","2.8 GL Grandia AT"],"Corolla Cross":["1.8 E CVT","1.8 G HEV CVT","1.8 V HEV CVT"],Rush:["1.5 E AT","1.5 G AT"],Camry:["2.5 V CVT","2.5 Hybrid CVT"]},
  Honda:{City:["1.5 S CVT","1.5 V CVT","1.5 RS CVT","1.5 RS Turbo CVT"],Brio:["1.2 S MT","1.2 S CVT","1.2 RS CVT"],Civic:["1.5 RS Turbo CVT","1.5 FE Turbo CVT","1.5 EL Turbo CVT"],"CR-V":["1.5 S Turbo CVT","1.5 V Turbo CVT","1.5 SX Turbo AWD CVT"],"HR-V":["1.5 S CVT","1.5 V CVT","1.5 RS CVT"],"BR-V":["1.5 S CVT","1.5 V CVT","1.5 RS CVT"],Jazz:["1.5 S CVT","1.5 V CVT"],Mobilio:["1.5 S MT","1.5 S CVT"]},
  Mitsubishi:{Mirage:["1.2 GLX MT","1.2 GLX CVT","1.2 GLS CVT"],"Mirage G4":["1.2 GLX CVT","1.2 GLS CVT"],Xpander:["1.5 GLX MT","1.5 GLX AT","1.5 GLS AT","1.5 Cross AT","1.5 Cross Plus AT"],"Montero Sport":["2.4 GLX DSL 4x2 MT","2.4 GLS DSL 4x2 AT","2.4 GLS Premium DSL 4x4 AT","2.4 GT DSL 4x4 AT"],Strada:["2.4 GLX DSL 4x2 MT","2.4 GLS DSL 4x2 AT","2.4 GT DSL 4x4 AT"],L300:["2.2 Cab Chassis FB DSL MT","2.2 Exceed FB DSL MT"]},
  Nissan:{Almera:["1.0 Turbo E MT","1.0 Turbo E CVT","1.0 Turbo V CVT","1.0 Turbo VL CVT"],Terra:["2.5 VL 4x4 AT DSL","2.5 VE 4x2 AT DSL","2.5 E 4x2 MT DSL"],Navara:["2.5 EL Calibre 4x2 AT","2.5 VL 4x4 AT","2.5 Pro-4X 4x4 AT"],"NV350 Urvan":["2.5 Premium DSL MT","2.5 Standard DSL MT"],Patrol:["4.0 Royale Safari AT","5.6 Platinum AT"]},
  Ford:{Ranger:["2.0 XL DSL MT 4x2","2.0 XLS DSL AT 4x2","2.0 XLT DSL AT 4x2","2.0 Wildtrak DSL AT 4x2","3.0 Raptor DSL 4WD AT"],Everest:["2.0 Trend DSL AT 4x2","2.0 Titanium DSL AT 4x2","2.0 Sport DSL AT 4x4","3.0 Platinum DSL 4WD AT"],Territory:["1.5 Trend EcoBoost AT","1.5 Titanium EcoBoost AT"]},
  Hyundai:{Accent:["1.4 GL MT","1.4 GL AT","1.4 GLS AT","1.6 CRDi DSL AT"],Tucson:["2.0 GL AT","2.0 GLS AT","1.6 N Line AT"],Starex:["2.5 CRDi Limousine AT","2.5 CRDi Gold AT"],Staria:["2.2 CRDi Premium AT","2.2 CRDi Signature AT"],Creta:["1.5 GL IVT","1.5 GLS IVT"]},
  Kia:{Soluto:["1.4 LX MT","1.4 EX AT","1.4 SX AT"],Picanto:["1.0 LX MT","1.0 EX AT"],Seltos:["1.4 Turbo LX IVT","1.4 Turbo EX IVT"],Sportage:["2.0 LX AT","2.0 EX AT","2.0 SX AT"],Carnival:["2.2 CRDi EX AT","2.2 CRDi SX AT"]},
  Suzuki:{Swift:["1.2 GL MT","1.2 GL AT","1.2 GLX AT"],Ertiga:["1.5 GL MT","1.5 GL AT","1.5 GLX AT"],"XL7":["1.5 GL AT","1.5 GLX AT","1.5 Alpha AT"],Jimny:["1.5 JLX MT","1.5 JLX AT"],APV:["1.6 GA MT","1.6 GL MT","1.6 GLX AT"]},
  Isuzu:{"mu-X":["1.9 LS-A AT 4x2","3.0 LS-E AT 4x2","3.0 LS-E AT 4x4","3.0 Ultimate AT 4x4"],"D-Max":["1.9 Blue Power LS MT","1.9 Blue Power LS AT","3.0 Blue Power S AT","3.0 Blue Power V-Cross AT"],Crosswind:["3.0 XZ AT","3.0 XUV MT"]},
  Mazda:{"Mazda2 HB":["1.5 V Skyactiv-G AT","1.5 G Skyactiv-G AT"],"Mazda3 HB":["2.0 Skyactiv-G AT","2.5 Turbo AT AWD"],"CX-5":["2.0 FWD AT","2.5 FWD AT","2.5 AWD AT","2.5 Turbo AWD AT"],"BT-50":["3.0 DSL 4x2 AT","3.0 DSL 4x4 AT"]},
  MG:{MG3:["1.5 Style MT","1.5 Style AT"],ZS:["1.5 Style AT","1.5 Alpha AT","ZS EV Excite"],HS:["1.5 Style AT","1.5 Alpha AT"],Extender:["2.0 DSL Style MT","2.0 DSL Style AT"]},
  Geely:{Coolray:["1.5 GSE Urban AT","1.5 GSE Premium AT","1.5 GSE Sport AT"],Okavango:["1.5 TGDi Comfort AT","1.5 TGDi Luxury AT"]},
  Chery:{"Tiggo 2 Pro":["1.5 CVT Base","1.5 CVT Premium"],"Tiggo 7 Pro":["1.5 Turbo CVT Style","1.5 Turbo CVT Luxury"],"Omoda 5":["1.6 AT Comfort","1.6 AT Premium"]},
  BYD:{Dolphin:["Standard Range","Extended Range"],Seal:["Dynamic","Excellence AWD"],"Atto 3":["Standard Range","Extended Range"]},
  Foton:{Toplander:["2.0 MT 4x2","2.0 AT 4x2","2.0 AT 4x4"],Thunder:["2.0 MT 4x2","2.0 AT 4x2","2.0 AT 4x4"],"View Transvan":["2.8 DSL MT","2.8 DSL AT"]},
  Others:{Others:["Others — specify"]},
};
const MAKES = [...Object.keys(PH_VEHICLES).filter(k=>k!=="Others").sort(),"Others"];

/* ─── HELPERS ────────────────────────────────────────────────── */
function emptyItem(){ return { condition:"", value:"", remarks:"", photos:[] }; } // condition:"" = not ticked
function emptyChecklist(){ const c={}; ALL_ITEM_NAMES.forEach(n=>{ c[n]=emptyItem(); }); return c; }
function emptyAP(){ const p={}; APPRAISAL_SLOTS.forEach(s=>{ p[s.key]=[]; }); p.dents_scratches=[]; return p; }
function emptyForm(role){
  return {
    accountNumber:"",venue:"",warehouse:"",color:"",plateNumber:"",conductionSticker:"",
    fuelType:"",transmission:"",odometerR:"",odometerW:"",fuelReadingW:"",engineNumber:"",mileage:"",
    vehicleMake:"",vehicleModel:"",vehicleVariant:"",vehicleMakeOther:"",vehicleModelOther:"",vehicleVariantOther:"",
    yearModel:"",checklist:emptyChecklist(),
    otherItems:["","","","","",""],personalBelongings:["","","","","",""],damageRemarks:"",
    clientName:"", clientSignature:null,
    repoName:"", repoSignature:null,
    warehouseName:"", warehouseSignature:null,
    ...(role==="Appraiser"?{appraisalPhotos:emptyAP()}:{}),
  };
}
function genId(p){ return `${p}-${Math.floor(100000+Math.random()*900000)}`; }
function fmtDate(ts){ return ts?new Date(ts).toLocaleString():"—"; }
function vehicleLabel(f){
  const make=f.vehicleMake==="Others"?f.vehicleMakeOther||"":f.vehicleMake||"";
  const model=(!f.vehicleModel||f.vehicleModel==="Others")?f.vehicleModelOther||"":f.vehicleModel||"";
  const variant=(!f.vehicleVariant||f.vehicleVariant==="Others")?f.vehicleVariantOther||"":f.vehicleVariant||"";
  return [make,model,variant].filter(Boolean).join(" ");
}
function readFile(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); }); }

/* ─── COMPARISON ENGINE ──────────────────────────────────────── */
function cmpValues(data,key){
  const entries=ENCODER_ROLES.map(r=>data[r]?{role:r,value:String(data[r][key]||"")}:null).filter(Boolean);
  if(entries.length<2) return{status:"pending",entries};
  const u=new Set(entries.map(e=>e.value.trim().toUpperCase()));
  return{status:u.size===1?"match":"major",entries};
}
function cmpItem(data,itemDef){
  const name=itemDef.n;
  const entries=ENCODER_ROLES.map(r=>{
    if(!data[r]) return null;
    const cl=data[r].checklist[name]||{};
    return{role:r,condition:cl.condition||"",value:cl.value||"",remarks:cl.remarks||"",photos:cl.photos||[]};
  }).filter(Boolean);
  if(entries.length<2) return{status:"pending",entries};
  if(itemDef.t){ // text-only item — compare by declared value, not condition
    const norm=e=>(e.value||"").trim().toLowerCase();
    const allSame=entries.every(e=>norm(e)===norm(entries[0]));
    return{status:allSame?"match":"major",entries};
  }
  const anyBlank=entries.some(e=>!e.condition);
  const allSame=entries.every(e=>e.condition===entries[0].condition);
  if(allSame) return{status:"match",entries};
  if(anyBlank) return{status:"partial",entries};
  const ranks=entries.map(e=>RANK[e.condition]??0);
  const spread=Math.max(...ranks)-Math.min(...ranks);
  return{status:spread>=2?"major":"partial",entries};
}
function getAccountSummary(data){
  const rolesPresent=ENCODER_ROLES.filter(r=>data[r]);
  const vehicleFields=[
    {key:"plateNumber",label:"Plate No."},{key:"conductionSticker",label:"Conduction"},
    {key:"odometerR",label:"Odometer (R)"},{key:"odometerW",label:"Odometer (W)"},
    {key:"engineNumber",label:"Engine No."},{key:"color",label:"Color"},{key:"fuelType",label:"Fuel Type"},
  ].map(f=>({...f,...cmpValues(data,f.key)}));
  const sectionComparisons=MVC_SECTIONS.map(s=>({...s,items:s.items.map(it=>({...it,...cmpItem(data,it)}))}));
  const all=[...vehicleFields,...sectionComparisons.flatMap(s=>s.items)];
  const majorCount=all.filter(c=>c.status==="major").length;
  const partialCount=all.filter(c=>c.status==="partial").length;
  const status=rolesPresent.length<3?"pending":majorCount>0?"major":partialCount>0?"partial":"match";
  return{rolesPresent,vehicleFields,sectionComparisons,majorCount,partialCount,status};
}

/* ─── SEED DATA ──────────────────────────────────────────────── */
function mkCL(overrides={}){
  const c=emptyChecklist();
  Object.entries(overrides).forEach(([k,v])=>{ if(c[k]) c[k]={...c[k],...v}; });
  return c;
}
const SEED_REPORTS = {
  "ACC-100234":{
    Repossessor:{
      reportId:"MVC-100201",accountNumber:"ACC-100234",venue:"8008 Mañalac Ave. Bicutan Taguig",warehouse:"Metrodrug Annex",
      vehicleMake:"Toyota",vehicleModel:"Vios",vehicleVariant:"1.5 G CVT",yearModel:"2019",
      plateNumber:"NBC-1234",conductionSticker:"CD-9921",color:"Silver",fuelType:"Gasoline",transmission:"CVT",
      odometerR:"50,000",odometerW:"50,100",fuelReadingW:"1/4",engineNumber:"2NRFE-88213",mileage:"50000",
      submittedBy:"J. Cruz",submissionDate:"2026-06-10T09:14:00",
      checklist:mkCL({
        "Battery Brand":{value:"Motolite",remarks:"Terminals show corrosion"},
        "Front Bumper":{condition:"POOR",remarks:"Cracked"},
        "Head Light (Right)":{condition:"FAIR"},
        "Spare Tire Brand":{value:"Bridgestone"},
        "Side Mirror (Left)":{condition:"POOR",remarks:"Cracked casing"},
      }),
      otherItems:["Floor mat set","","","","",""],personalBelongings:["Registration papers","","","","",""],
      damageRemarks:"Minor dents on left rear panel. Cracked side mirror casing (left).",
    },
    Warehouse:{
      reportId:"MVC-100245",accountNumber:"ACC-100234",venue:"8008 Mañalac Ave. Bicutan Taguig",warehouse:"Metrodrug Annex",
      vehicleMake:"Toyota",vehicleModel:"Vios",vehicleVariant:"1.5 G CVT",yearModel:"2019",
      plateNumber:"NBC-1234",conductionSticker:"CD-9921",color:"Silver",fuelType:"Gasoline",transmission:"CVT",
      odometerR:"50,050",odometerW:"50,100",fuelReadingW:"1/4",engineNumber:"2NRFE-88213",mileage:"50050",
      submittedBy:"R. Santos",submissionDate:"2026-06-11T14:02:00",
      checklist:mkCL({
        "Battery Brand":{value:"",remarks:"Missing on intake — unit not found"},
        "Front Bumper":{condition:"POOR",remarks:"Cracked confirmed"},
        "Head Light (Right)":{condition:"FAIR"},
        "Spare Tire Brand":{value:"Bridgestone"},
        "Side Mirror (Left)":{condition:"POOR",remarks:"Confirmed cracked"},
      }),
      otherItems:["","","","","",""],personalBelongings:["","","","","",""],
      damageRemarks:"Battery missing on intake. Left rear panel dent confirmed.",
    },
    Appraiser:{
      reportId:"MVC-100299",accountNumber:"ACC-100234",venue:"8008 Mañalac Ave. Bicutan Taguig",warehouse:"Metrodrug Annex",
      vehicleMake:"Toyota",vehicleModel:"Vios",vehicleVariant:"1.5 G CVT",yearModel:"2019",
      plateNumber:"NBC-1234",conductionSticker:"CD-9921",color:"Silver",fuelType:"Gasoline",transmission:"CVT",
      odometerR:"55,000",odometerW:"55,100",fuelReadingW:"E",engineNumber:"2NRFE-88213",mileage:"55000",
      submittedBy:"M. Reyes",submissionDate:"2026-06-12T10:30:00",
      checklist:mkCL({
        "Battery Brand":{value:"Motolite",remarks:"Present — appears new"},
        "Front Bumper":{condition:"POOR"},
        "Head Light (Right)":{condition:"FAIR"},
        "Spare Tire Brand":{value:"",remarks:"No spare tire found at appraisal"},
        "Side Mirror (Left)":{condition:"REPLACED",remarks:"Mirror assembly replaced before appraisal"},
      }),
      otherItems:["","","","","",""],personalBelongings:["","","","","",""],
      damageRemarks:"Battery present — Warehouse reported it missing. Spare tire missing at appraisal. Side mirror replaced, contradicts earlier POOR reports.",
      appraisalPhotos:emptyAP(),
    },
  },
  "ACC-100501":{
    Repossessor:{
      reportId:"MVC-100310",accountNumber:"ACC-100501",venue:"Ortigas Branch",warehouse:"North EDSA Depot",
      vehicleMake:"Mitsubishi",vehicleModel:"Xpander",vehicleVariant:"1.5 Cross AT",yearModel:"2021",
      plateNumber:"NDQ-5521",conductionSticker:"CE-4412",color:"White",fuelType:"Gasoline",transmission:"AT",
      odometerR:"32,000",odometerW:"32,050",fuelReadingW:"1/2",engineNumber:"4B12-77410",mileage:"32000",
      submittedBy:"A. Dizon",submissionDate:"2026-06-13T08:00:00",
      checklist:mkCL({
        "Battery Brand":{value:"Yuasa"},
        "Front Bumper":{condition:"REPLACED",remarks:"Bumper replaced prior to repossession"},
        "Spare Tire Brand":{value:"Michelin"},
        "Dash Board":{condition:"FAIR",remarks:"Minor scratches"},
      }),
      otherItems:["","","","","",""],personalBelongings:["Car registration","Insurance card","","","",""],
      damageRemarks:"Minor scratches on dashboard. Bumper was replaced before repossession, in good condition.",
    },
    Warehouse:{
      reportId:"MVC-100322",accountNumber:"ACC-100501",venue:"Ortigas Branch",warehouse:"North EDSA Depot",
      vehicleMake:"Mitsubishi",vehicleModel:"Xpander",vehicleVariant:"1.5 Cross AT",yearModel:"2021",
      plateNumber:"NDQ-5521",conductionSticker:"CE-4412",color:"White",fuelType:"Gasoline",transmission:"AT",
      odometerR:"32,020",odometerW:"32,050",fuelReadingW:"1/2",engineNumber:"4B12-77410",mileage:"32020",
      submittedBy:"L. Garcia",submissionDate:"2026-06-13T15:45:00",
      checklist:mkCL({
        "Battery Brand":{value:"Yuasa"},
        "Front Bumper":{condition:"REPLACED",remarks:"Confirmed replaced, good condition"},
        "Spare Tire Brand":{value:"Michelin"},
        "Dash Board":{condition:"FAIR",remarks:"Minor scratches"},
      }),
      otherItems:["","","","","",""],personalBelongings:["","","","","",""],
      damageRemarks:"Consistent with repossessor report.",
    },
    Appraiser:{
      reportId:"MVC-100388",accountNumber:"ACC-100501",venue:"Ortigas Branch",warehouse:"North EDSA Depot",
      vehicleMake:"Mitsubishi",vehicleModel:"Xpander",vehicleVariant:"1.5 Cross AT",yearModel:"2021",
      plateNumber:"NDQ-5521",conductionSticker:"CE-4412",color:"White",fuelType:"Gasoline",transmission:"AT",
      odometerR:"32,000",odometerW:"32,050",fuelReadingW:"1/2",engineNumber:"4B12-77410",mileage:"32000",
      submittedBy:"N. Villanueva",submissionDate:"2026-06-14T10:00:00",
      checklist:mkCL({
        "Battery Brand":{value:"Yuasa"},
        "Front Bumper":{condition:"REPLACED",remarks:"Replacement confirmed"},
        "Spare Tire Brand":{value:"Michelin"},
        "Dash Board":{condition:"FAIR",remarks:"Minor scratches"},
      }),
      otherItems:["","","","","",""],personalBelongings:["","","","","",""],
      damageRemarks:"All consistent across the three reports.",
      appraisalPhotos:emptyAP(),
    },
  },
};
const SEED_LOG=[
  {id:6,userName:"N. Villanueva",role:"Appraiser",action:"Submitted MVC-100388 for ACC-100501",ts:"2026-06-14T10:00:00"},
  {id:5,userName:"L. Garcia",role:"Warehouse",action:"Submitted MVC-100322 for ACC-100501",ts:"2026-06-13T15:45:00"},
  {id:4,userName:"A. Dizon",role:"Repossessor",action:"Submitted MVC-100310 for ACC-100501",ts:"2026-06-13T08:00:00"},
  {id:3,userName:"M. Reyes",role:"Appraiser",action:"Submitted MVC-100299 for ACC-100234",ts:"2026-06-12T10:30:00"},
  {id:2,userName:"R. Santos",role:"Warehouse",action:"Submitted MVC-100245 for ACC-100234",ts:"2026-06-11T14:02:00"},
  {id:1,userName:"J. Cruz",role:"Repossessor",action:"Submitted MVC-100201 for ACC-100234",ts:"2026-06-10T09:14:00"},
];
const INIT_USERS=[
  {id:"u1",username:"jcruz",password:"repo123",name:"J. Cruz",role:"Repossessor",active:true},
  {id:"u2",username:"adizon",password:"repo456",name:"A. Dizon",role:"Repossessor",active:true},
  {id:"u3",username:"rsantos",password:"ware123",name:"R. Santos",role:"Warehouse",active:true},
  {id:"u4",username:"lgarcia",password:"ware456",name:"L. Garcia",role:"Warehouse",active:true},
  {id:"u5",username:"mreyes",password:"appr123",name:"M. Reyes",role:"Appraiser",active:true},
  {id:"u6",username:"nvillanueva",password:"appr456",name:"N. Villanueva",role:"Appraiser",active:true},
  {id:"u7",username:"roofficer",password:"roofc123",name:"R. Dela Cruz",role:"repo_officer",active:true},
  {id:"u8",username:"woofficer",password:"woofc123",name:"W. Fernandez",role:"warehouse_officer",active:true},
  {id:"u9",username:"aoofficer",password:"aoofc123",name:"A. Bautista",role:"appraisal_officer",active:true},
  {id:"u10",username:"superadmin",password:"sa@2026!",name:"System Super Admin",role:"super_admin",active:true},
];

/* ═══════════════════════ UI ATOMS ═══════════════════════════ */
function Lightbox({ src, onClose }){
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <button onClick={onClose} style={{position:"absolute",top:16,right:16,color:"#fff",background:"none",border:"none"}}><X size={26}/></button>
      <img src={src} alt="" style={{maxHeight:"85vh",maxWidth:"92vw",borderRadius:6,objectFit:"contain"}} onClick={e=>e.stopPropagation()}/>
    </div>
  );
}
function PhotoThumbs({ photos }){
  const [lb,setLb]=useState(null);
  if(!photos||!photos.length) return <span style={{color:"#cbd5e1",fontSize:10}}>—</span>;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
      {lb && <Lightbox src={lb} onClose={()=>setLb(null)}/>}
      {photos.map((src,i)=>(
        <img key={i} src={src} alt="" onClick={()=>setLb(src)}
          style={{width:24,height:24,objectFit:"cover",borderRadius:3,border:"1px solid #cbd5e1",cursor:"pointer"}}/>
      ))}
    </div>
  );
}
function PhotoInput({ photos, onAdd, onRemove, maxPhotos=5 }){
  const fileRef=useRef(); const camRef=useRef(); const [lb,setLb]=useState(null);
  async function handle(e){
    const files=Array.from(e.target.files||[]);
    for(const f of files){ if(photos.length>=maxPhotos) break; const url=await readFile(f); onAdd(url); }
    e.target.value="";
  }
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
      {lb && <Lightbox src={lb} onClose={()=>setLb(null)}/>}
      {photos.map((src,i)=>(
        <div key={i} className="group" style={{position:"relative",width:24,height:24,borderRadius:3,overflow:"hidden",border:"1px solid #cbd5e1",flexShrink:0}}>
          <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}} onClick={()=>setLb(src)}/>
          <button type="button" onClick={()=>onRemove(i)}
            className="opacity-0 group-hover:opacity-100"
            style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center",border:"none"}}>
            <X size={12}/>
          </button>
        </div>
      ))}
      {photos.length<maxPhotos && (
        <div style={{display:"flex",gap:3}}>
          <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handle}/>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handle}/>
          <button type="button" onClick={()=>camRef.current.click()} title="Camera"
            style={{width:24,height:24,border:"1px solid #cbd5e1",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",background:"#fff"}}>
            <Camera size={13}/>
          </button>
          <button type="button" onClick={()=>fileRef.current.click()} title="Attach"
            style={{width:24,height:24,border:"1px solid #cbd5e1",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",background:"#fff"}}>
            <ImagePlus size={13}/>
          </button>
        </div>
      )}
    </div>
  );
}

/* TickBox — the draggable checkbox. 100% inline style (no Tailwind arbitrary values)
   so the checked/unchecked visual state is guaranteed to actually render. */
function TickBox({ checked, item, cond, onDown, onEnter }){
  return (
    <div
      data-tick="1" data-item={item} data-cond={cond}
      onMouseDown={onDown} onMouseEnter={onEnter} onTouchStart={onDown}
      style={{
        touchAction:"none", width:22, height:22, borderRadius:4,
        border: checked ? `2px solid ${NAVY}` : "2px solid #94a3b8",
        backgroundColor: checked ? NAVY : "#ffffff",
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", userSelect:"none", margin:"0 auto", flexShrink:0,
      }}
    >
      {checked && <span style={{color:"#ffffff",fontSize:13,fontWeight:700,lineHeight:1}}>✓</span>}
    </div>
  );
}
/* Small read-only version used in the reconciliation view */
function MiniTicks({ condition }){
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {CONDITIONS.map(c=>{
        const on = condition===c;
        return (
          <span key={c} style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:8,color:"#64748b"}}>
            <span style={{
              width:12,height:12,borderRadius:2,
              border: on ? `1px solid ${NAVY}` : "1px solid #cbd5e1",
              backgroundColor: on ? NAVY : "#ffffff",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:7,fontWeight:700,color:"#ffffff",
            }}>{on ? "✓" : ""}</span>
            {c}
          </span>
        );
      })}
    </div>
  );
}

function Stamp({ status }){
  const m = {
    match:  { label:"Reconciled", color:"#059669" },
    partial:{ label:"For Review", color:"#d97706" },
    major:  { label:"Discrepancy",color:"#dc2626" },
    pending:{ label:"Awaiting",   color:"#64748b" },
  }[status] || { label:"—", color:"#94a3b8" };
  return (
    <span style={{
      display:"inline-block", border:`3px double ${m.color}`, padding:"4px 10px",
      transform:"rotate(-2deg)", textTransform:"uppercase", fontSize:10, fontWeight:700,
      letterSpacing:"0.15em", color:m.color,
    }}>{m.label}</span>
  );
}
function StatusIcon({ status }){
  if(status==="major") return <XCircle size={16} color="#ef4444"/>;
  if(status==="partial") return <AlertTriangle size={16} color="#f59e0b"/>;
  if(status==="pending") return <span style={{color:"#cbd5e1",fontSize:11}}>—</span>;
  return <CheckCircle2 size={16} color="#10b981"/>;
}
function rowBg(status){ return status==="major"?"#fef2f2":status==="partial"?"#fffbeb":"transparent"; }
function Empty({ text }){ return <div style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:13,border:"2px dashed #e2e8f0",borderRadius:6,margin:16}}>{text}</div>; }
function Inp({ label, value, onChange, placeholder, mono, required }){
  return (
    <label style={{display:"block"}}>
      <span style={{display:"block",fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em",color:"#64748b",marginBottom:2}}>
        {label}{required && <span style={{color:"#ef4444"}}> *</span>}
      </span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",border:"none",borderBottom:"1px solid #cbd5e1",fontSize:13,padding:"3px 0",outline:"none",background:"transparent",fontFamily:mono?"monospace":"inherit"}}/>
    </label>
  );
}
function Sel({ label, value, onChange, options, placeholder, disabled }){
  return (
    <label style={{display:"block",position:"relative"}}>
      {label && <span style={{display:"block",fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em",color:"#64748b",marginBottom:2}}>{label}</span>}
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{width:"100%",appearance:"none",border:"none",borderBottom:"1px solid #cbd5e1",fontSize:13,padding:"3px 18px 3px 0",outline:"none",background:"transparent",opacity:disabled?0.4:1}}>
        <option value="">{placeholder||"— select —"}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} color="#94a3b8" style={{position:"absolute",right:0,bottom:8,pointerEvents:"none"}}/>
    </label>
  );
}
function PanelBar({ children, right }){
  return (
    <div style={{backgroundColor:NAVY,color:"#fff",padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>{children}</span>
      {right && <span style={{color:"#fca5a5",fontWeight:400,textTransform:"none",fontSize:10}}>{right}</span>}
    </div>
  );
}

/* ─── URL BAR (cosmetic) ─────────────────────────────────────── */
function URLBar(){
  return (
    <div style={{backgroundColor:"#0d1117",padding:"6px 12px",display:"flex",alignItems:"center",gap:8}}>
      <div style={{display:"flex",gap:4}}>
        <span style={{width:10,height:10,borderRadius:"50%",backgroundColor:"#ef4444"}}/>
        <span style={{width:10,height:10,borderRadius:"50%",backgroundColor:"#fbbf24"}}/>
        <span style={{width:10,height:10,borderRadius:"50%",backgroundColor:"#10b981"}}/>
      </div>
      <div style={{backgroundColor:"#1b222c",borderRadius:4,padding:"4px 10px",display:"flex",alignItems:"center",gap:6,fontSize:11,fontFamily:"monospace",color:"#cbd5e1",maxWidth:320}}>
        <Globe size={12} color="#34d399"/>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>https://online-mvc.com/psbank</span>
        <span style={{marginLeft:"auto",color:"#34d399",fontSize:9,flexShrink:0}}>Secure</span>
      </div>
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────── */
function Login({ users, onLogin }){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [show,setShow]=useState(false); const [err,setErr]=useState("");
  function submit(e){
    e.preventDefault();
    const found=users.find(x=>x.username===u.trim()&&x.password===p&&x.active);
    if(found){ setErr(""); onLogin(found); } else setErr("Invalid username or password. Contact your administrator.");
  }
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",backgroundColor:"#0d1117"}}>
      <URLBar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:320}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:56,height:56,borderRadius:"50%",border:"2px solid rgba(251,191,36,0.4)",backgroundColor:"rgba(251,191,36,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <span style={{color:GOLD,fontSize:22,fontWeight:700}}>P</span>
            </div>
            <h1 style={{color:"#fff",fontSize:24,fontWeight:700}}>PSBank MVCRS</h1>
            <p style={{color:"#94a3b8",fontSize:12,marginTop:4}}>Motor Vehicle Checklist Reconciliation System</p>
            <p style={{color:"#475569",fontSize:10,marginTop:2}}>Philippine Savings Bank — Internal System</p>
          </div>
          <form onSubmit={submit} style={{backgroundColor:"#1b222c",border:"1px solid #334155",borderRadius:8,padding:20}}>
            <h2 style={{color:"#fff",fontSize:14,fontWeight:600,marginBottom:12}}>Sign in to your account</h2>
            <label style={{display:"block",marginBottom:10}}>
              <span style={{display:"block",fontSize:10,color:"#94a3b8",marginBottom:4}}>Username</span>
              <input value={u} onChange={e=>setU(e.target.value)} placeholder="Enter your username" autoComplete="username"
                style={{width:"100%",backgroundColor:"#11161d",border:"1px solid #475569",borderRadius:4,padding:"8px 10px",fontSize:13,color:"#e2e8f0",fontFamily:"monospace",outline:"none"}}/>
            </label>
            <label style={{display:"block",marginBottom:10,position:"relative"}}>
              <span style={{display:"block",fontSize:10,color:"#94a3b8",marginBottom:4}}>Password</span>
              <input type={show?"text":"password"} value={p} onChange={e=>setP(e.target.value)} placeholder="Enter your password"
                style={{width:"100%",backgroundColor:"#11161d",border:"1px solid #475569",borderRadius:4,padding:"8px 34px 8px 10px",fontSize:13,color:"#e2e8f0",outline:"none"}}/>
              <button type="button" onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:8,bottom:8,background:"none",border:"none",color:"#94a3b8"}}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </label>
            {err && <p style={{color:"#f87171",fontSize:11,backgroundColor:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"6px 8px",marginBottom:8}}>{err}</p>}
            <button type="submit" style={{width:"100%",backgroundColor:GOLD,color:"#0d1117",fontWeight:700,fontSize:13,padding:"9px 0",borderRadius:4,border:"none"}}>Sign in</button>
            <p style={{textAlign:"center",fontSize:10,color:"#475569",marginTop:10}}>For account access, contact your system administrator.</p>
          </form>
          <p style={{textAlign:"center",color:"#334155",fontSize:10,marginTop:14}}>© 2026 Philippine Savings Bank · Internal Use Only</p>
        </div>
      </div>
    </div>
  );
}

/* ─── CHROME ─────────────────────────────────────────────────── */
function TopBar({ user, pendingCount, onLogout }){
  const m=ROLE_META[user.role];
  return (
    <div style={{backgroundColor:NAVY,padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:30}}>
      <span style={{color:"#fff",fontWeight:700,fontSize:13}}>PSBank MVCRS</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {pendingCount>0 && <span style={{backgroundColor:GOLD,color:"#111827",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999}}>{pendingCount} pending</span>}
        <span style={{fontSize:10,fontFamily:"monospace",fontWeight:700,border:`1px solid ${m.color}`,color:m.color,backgroundColor:"#fff",padding:"1px 6px",borderRadius:3}}>{m.code}</span>
        <button onClick={onLogout} style={{background:"none",border:"none",color:"#cbd5e1"}}><LogOut size={16}/></button>
      </div>
    </div>
  );
}
function Tabs({ tabs, active, onChange }){
  return (
    <div style={{display:"flex",backgroundColor:"#111827",overflowX:"auto",position:"sticky",top:41,zIndex:20,borderBottom:"1px solid #334155"}}>
      {tabs.map(t=>{ const Icon=t.icon; const on=active===t.key; return (
        <button key={t.key} onClick={()=>onChange(t.key)}
          style={{
            display:"flex",alignItems:"center",gap:6,padding:"10px 12px",fontSize:12,fontWeight:600,whiteSpace:"nowrap",
            borderBottom: on ? `2px solid ${GOLD}` : "2px solid transparent",
            color: on ? GOLD : "#94a3b8", background:"none", border:"none", borderBottomWidth:2,
          }}>
          <Icon size={14}/>{t.label}
          {t.badge>0 && <span style={{backgroundColor:GOLD,color:"#111827",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:999}}>{t.badge}</span>}
        </button>
      );})}
    </div>
  );
}

/* ─── VEHICLE DROPDOWNS ──────────────────────────────────────── */
function VehicleDropdowns({ form, onChange }){
  const otherMake=form.vehicleMake==="Others";
  const otherModel=form.vehicleModel==="Others";
  const models=!otherMake&&form.vehicleMake?Object.keys(PH_VEHICLES[form.vehicleMake]||{}).sort():[];
  const variants=!otherMake&&!otherModel&&form.vehicleMake&&form.vehicleModel?(PH_VEHICLES[form.vehicleMake]?.[form.vehicleModel]||[]):[];
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <div>
        <Sel label="Make" value={form.vehicleMake} options={MAKES} placeholder="— select make —"
          onChange={v=>onChange({...form,vehicleMake:v,vehicleModel:"",vehicleVariant:"",vehicleMakeOther:"",vehicleModelOther:"",vehicleVariantOther:""})}/>
        {otherMake && <input value={form.vehicleMakeOther||""} onChange={e=>onChange({...form,vehicleMakeOther:e.target.value})}
          placeholder="Type make / brand" style={{marginTop:4,width:"100%",border:`1px solid ${GOLD}`,borderRadius:3,padding:"4px 6px",fontSize:11,outline:"none"}}/>}
      </div>
      <div>
        <span style={{display:"block",fontSize:9,textTransform:"uppercase",color:"#64748b",marginBottom:2}}>Model</span>
        {otherMake ? (
          <input value={form.vehicleModelOther||""} onChange={e=>onChange({...form,vehicleModelOther:e.target.value})}
            placeholder="Type model" style={{width:"100%",border:"none",borderBottom:"1px solid #cbd5e1",fontSize:13,padding:"3px 0",outline:"none"}}/>
        ) : (
          <>
            <Sel value={form.vehicleModel} options={models} disabled={!form.vehicleMake}
              placeholder={form.vehicleMake?"— select model —":"— pick make first —"}
              onChange={v=>onChange({...form,vehicleModel:v,vehicleVariant:"",vehicleModelOther:"",vehicleVariantOther:""})}/>
            {otherModel && <input value={form.vehicleModelOther||""} onChange={e=>onChange({...form,vehicleModelOther:e.target.value})}
              placeholder="Type model name" style={{marginTop:4,width:"100%",border:`1px solid ${GOLD}`,borderRadius:3,padding:"4px 6px",fontSize:11,outline:"none"}}/>}
          </>
        )}
      </div>
      <div>
        <span style={{display:"block",fontSize:9,textTransform:"uppercase",color:"#64748b",marginBottom:2}}>Variant / Trim</span>
        {(otherMake||otherModel) ? (
          <input value={form.vehicleVariantOther||""} onChange={e=>onChange({...form,vehicleVariantOther:e.target.value})}
            placeholder="Type variant" style={{width:"100%",border:"none",borderBottom:"1px solid #cbd5e1",fontSize:13,padding:"3px 0",outline:"none"}}/>
        ) : (
          <Sel value={form.vehicleVariant} options={variants} disabled={!form.vehicleModel}
            placeholder={form.vehicleModel?"— select variant —":"— pick model first —"}
            onChange={v=>onChange({...form,vehicleVariant:v,vehicleVariantOther:""})}/>
        )}
      </div>
    </div>
  );
}

/* ─── CHECKLIST SECTION (form, with drag/swipe-to-tick) ──────── */
function ChecklistSectionForm({ sec, checklist, onSetVal, onAddPhoto, onRemovePhoto, dragHandlers }){
  return (
    <div style={{border:`2px solid ${NAVY}`, borderRadius:"0 0 4px 4px", overflow:"hidden", marginBottom:12}}>
      <PanelBar right="* = required">{sec.label}</PanelBar>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",fontSize:11,backgroundColor:"#fff",minWidth:720,borderCollapse:"collapse"}}>
          <thead>
            <tr style={{backgroundColor:"#dde4f0",color:NAVY}}>
              <th style={{textAlign:"left",padding:"6px 8px",fontWeight:700,fontSize:9,textTransform:"uppercase",width:210}}>Description</th>
              {CONDITIONS.map(c=><th key={c} style={{padding:"6px 4px",fontWeight:700,fontSize:9,textTransform:"uppercase",width:58}}>{c}</th>)}
              <th style={{textAlign:"left",padding:"6px 8px",fontWeight:700,fontSize:9,textTransform:"uppercase"}}>Value / Brand / Qty</th>
              <th style={{textAlign:"left",padding:"6px 8px",fontWeight:700,fontSize:9,textTransform:"uppercase"}}>Remarks</th>
              <th style={{padding:"6px 8px",fontWeight:700,fontSize:9,textTransform:"uppercase",width:80}}>Photo</th>
            </tr>
          </thead>
          <tbody>
            {sec.items.map((it,i)=>{
              const cl=checklist[it.n]||emptyItem();
              return (
                <tr key={it.n} style={{backgroundColor:i%2===0?"#f5f7fc":"#fff"}}>
                  <td style={{padding:"6px 8px",border:"1px solid #e2e8f0",fontWeight:500,color:"#1e293b",verticalAlign:"top"}}>
                    {it.n}{it.r && <span style={{color:"#ef4444"}}> *</span>}
                  </td>
                  {it.t ? (
                    <td colSpan={4} style={{border:"1px solid #e2e8f0",textAlign:"center",fontSize:9,color:"#94a3b8",fontStyle:"italic"}}>text field — see Value →</td>
                  ) : CONDITIONS.map(cond=>(
                    <td key={cond} style={{border:"1px solid #e2e8f0",textAlign:"center",padding:"6px 2px",verticalAlign:"top"}}>
                      <TickBox checked={cl.condition===cond} item={it.n} cond={cond}
                        onDown={()=>dragHandlers.startDrag(it.n,cond)} onEnter={()=>dragHandlers.dragEnter(it.n,cond)}/>
                    </td>
                  ))}
                  <td style={{border:"1px solid #e2e8f0",padding:"4px 6px",verticalAlign:"top"}}>
                    <input value={cl.value} onChange={e=>onSetVal(it.n,"value",e.target.value)}
                      placeholder={it.t?"brand / qty":"-"}
                      style={{width:"100%",fontSize:11,border:"none",borderBottom:"1px dashed #cbd5e1",outline:"none",background:"transparent",padding:"2px 0"}}/>
                  </td>
                  <td style={{border:"1px solid #e2e8f0",padding:"4px 6px",verticalAlign:"top"}}>
                    <input value={cl.remarks} onChange={e=>onSetVal(it.n,"remarks",e.target.value)} placeholder="optional"
                      style={{width:"100%",fontSize:11,border:"none",borderBottom:"1px dashed #cbd5e1",outline:"none",background:"transparent",padding:"2px 0"}}/>
                  </td>
                  <td style={{border:"1px solid #e2e8f0",padding:"4px 6px",verticalAlign:"top"}}>
                    <PhotoInput photos={cl.photos} maxPhotos={3}
                      onAdd={url=>onAddPhoto(it.n,url)} onRemove={idx=>onRemovePhoto(it.n,idx)}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── APPRAISAL PHOTOS ───────────────────────────────────────── */
function AppraisalPhotosPanel({ ap, onUpdate }){
  const done=APPRAISAL_SLOTS.filter(s=>(ap[s.key]||[]).length>0).length;
  const [lb,setLb]=useState(null);
  return (
    <div>
      {lb && <Lightbox src={lb} onClose={()=>setLb(null)}/>}
      <div style={{border:`2px solid ${NAVY}`,borderRadius:6,overflow:"hidden"}}>
        <PanelBar right={`${done}/10 done`}>Appraisal Photos — Mandatory</PanelBar>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:8,backgroundColor:"#fff"}}>
          {APPRAISAL_SLOTS.map(slot=>{
            const photos=ap[slot.key]||[]; const ok=photos.length>0;
            return (
              <div key={slot.key} style={{border:`1px solid ${ok?"#6ee7b7":"#fca5a5"}`,borderRadius:4,padding:6,backgroundColor:ok?"#f0fdf4":"#fef2f2"}}>
                <p style={{fontSize:10,fontWeight:700,marginBottom:4,color:ok?"#059669":"#dc2626"}}>{ok?"":"! "}{slot.label} *</p>
                {ok ? (
                  <img src={photos[0]} alt={slot.label} onClick={()=>setLb(photos[0])}
                    style={{width:"100%",height:64,objectFit:"cover",borderRadius:3,cursor:"pointer",marginBottom:4}}/>
                ) : (
                  <div style={{width:"100%",height:64,backgroundColor:"#f1f5f9",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#94a3b8",marginBottom:4}}>No photo yet</div>
                )}
                <PhotoInput photos={photos} maxPhotos={5}
                  onAdd={url=>onUpdate(slot.key,[...photos,url])} onRemove={idx=>onUpdate(slot.key,photos.filter((_,j)=>j!==idx))}/>
              </div>
            );
          })}
        </div>
        <div style={{borderTop:"1px solid #e2e8f0",padding:8,backgroundColor:"#fff"}}>
          <PanelBar>{`Dents & Scratches (${(ap.dents_scratches||[]).length}/20)`}</PanelBar>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
            {(ap.dents_scratches||[]).map((p,i)=>(
              <img key={i} src={p} alt="" onClick={()=>setLb(p)} style={{width:48,height:40,objectFit:"cover",borderRadius:3,border:"1px solid #cbd5e1",cursor:"pointer"}}/>
            ))}
          </div>
          <div style={{marginTop:8}}>
            <PhotoInput photos={ap.dents_scratches||[]} maxPhotos={20}
              onAdd={url=>onUpdate("dents_scratches",[...(ap.dents_scratches||[]),url])}
              onRemove={idx=>onUpdate("dents_scratches",(ap.dents_scratches||[]).filter((_,j)=>j!==idx))}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SIGNATURE PAD — fullscreen draw-your-signature modal ───── */
function SignaturePad({ title, onSave, onCancel }){
  const canvasRef=useRef(null);
  const wrapRef=useRef(null);
  const drawingRef=useRef(false);
  const lastRef=useRef({x:0,y:0});
  const [hasDrawn,setHasDrawn]=useState(false);

  useEffect(()=>{
    const canvas=canvasRef.current, wrap=wrapRef.current;
    if(!canvas||!wrap) return;
    const rect=wrap.getBoundingClientRect();
    canvas.width=Math.max(1,Math.floor(rect.width));
    canvas.height=Math.max(1,Math.floor(rect.height));
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="#1e293b"; ctx.lineWidth=3; ctx.lineCap="round"; ctx.lineJoin="round";
  },[]);

  function getPos(e){
    const canvas=canvasRef.current;
    const rect=canvas.getBoundingClientRect();
    const t=e.touches&&e.touches[0];
    const clientX=t?t.clientX:e.clientX, clientY=t?t.clientY:e.clientY;
    return { x: clientX-rect.left, y: clientY-rect.top };
  }
  function start(e){ e.preventDefault(); drawingRef.current=true; lastRef.current=getPos(e); }
  function move(e){
    if(!drawingRef.current) return;
    e.preventDefault();
    const ctx=canvasRef.current.getContext("2d");
    const pos=getPos(e);
    ctx.beginPath(); ctx.moveTo(lastRef.current.x,lastRef.current.y); ctx.lineTo(pos.x,pos.y); ctx.stroke();
    lastRef.current=pos;
    if(!hasDrawn) setHasDrawn(true);
  }
  function end(){ drawingRef.current=false; }
  function clear(){
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    setHasDrawn(false);
  }
  function save(){ if(!hasDrawn) return; onSave(canvasRef.current.toDataURL("image/png")); }

  return (
    <div style={{position:"fixed",inset:0,zIndex:70,backgroundColor:"rgba(15,23,42,0.9)",display:"flex",flexDirection:"column",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <p style={{color:"#fff",fontSize:14,fontWeight:700}}>{title||"Sign here"}</p>
          <p style={{color:"#94a3b8",fontSize:11,marginTop:2}}>Draw your signature with your finger or mouse</p>
        </div>
        <button onClick={onCancel} style={{background:"none",border:"none",color:"#fff"}}><X size={22}/></button>
      </div>
      <div ref={wrapRef} style={{flex:1,backgroundColor:"#ffffff",borderRadius:8,overflow:"hidden",touchAction:"none",position:"relative",minHeight:180}}>
        <canvas
          ref={canvasRef}
          style={{width:"100%",height:"100%",display:"block",cursor:"crosshair",touchAction:"none"}}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {!hasDrawn && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <span style={{color:"#cbd5e1",fontSize:13}}>Sign here</span>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:12}}>
        <button onClick={clear} style={{fontSize:12,fontWeight:600,padding:"10px 16px",borderRadius:6,border:"1px solid #475569",background:"transparent",color:"#e2e8f0"}}>Clear</button>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{fontSize:12,fontWeight:600,padding:"10px 16px",borderRadius:6,border:"1px solid #475569",background:"transparent",color:"#e2e8f0"}}>Cancel</button>
          <button onClick={save} disabled={!hasDrawn}
            style={{fontSize:12,fontWeight:700,padding:"10px 22px",borderRadius:6,border:"none",backgroundColor:hasDrawn?GOLD:"#475569",color:hasDrawn?"#111827":"#94a3b8"}}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SIGNATURE FIELD — printed-name input + tap-to-sign box ─── */
function SignatureField({ sectionLabel, roleLabel, name, onNameChange, signature, onSignatureChange }){
  const [showPad,setShowPad]=useState(false);
  return (
    <div style={{padding:12}}>
      {sectionLabel && <p style={{fontSize:9,color:"#64748b",marginBottom:8}}>{sectionLabel}</p>}
      <div
        onClick={()=>setShowPad(true)}
        style={{
          border: signature ? "1px solid #94a3b8" : "1px dashed #94a3b8",
          borderRadius:4, height:64, backgroundColor:"#fafafa",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", position:"relative", marginBottom:6,
        }}
      >
        {signature ? (
          <>
            <img src={signature} alt="Signature" style={{maxHeight:"90%",maxWidth:"92%",objectFit:"contain"}}/>
            <button type="button" onClick={e=>{ e.stopPropagation(); onSignatureChange(null); }}
              style={{position:"absolute",top:3,right:3,width:18,height:18,borderRadius:3,border:"1px solid #cbd5e1",backgroundColor:"#fff",color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <X size={11}/>
            </button>
          </>
        ) : (
          <span style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:5}}>
            <Pencil size={13}/> Tap to sign
          </span>
        )}
      </div>
      <input
        value={name} onChange={e=>onNameChange(e.target.value)} placeholder="Type printed name"
        style={{width:"100%",fontSize:12,border:"none",borderBottom:"1px solid #1e293b",padding:"3px 0",outline:"none",textAlign:"center",background:"transparent"}}
      />
      <p style={{fontSize:8,textAlign:"center",color:"#64748b",textTransform:"uppercase",marginTop:4}}>
        {roleLabel}<br/>(Signature over Printed Name / Date &amp; Time)
      </p>
      {showPad && (
        <SignaturePad
          title={`Sign as ${roleLabel}`}
          onSave={dataUrl=>{ onSignatureChange(dataUrl); setShowPad(false); }}
          onCancel={()=>setShowPad(false)}
        />
      )}
    </div>
  );
}

/* ─── REPORT FORM ────────────────────────────────────────────── */
function ReportForm({ user, form, setForm, onSubmit, isEdit }){
  const draggingRef=useRef(false);
  const dragCondRef=useRef(null);
  const [err,setErr]=useState("");

  useEffect(()=>{
    function stop(){ draggingRef.current=false; dragCondRef.current=null; }
    window.addEventListener("mouseup",stop);
    window.addEventListener("touchend",stop);
    window.addEventListener("touchcancel",stop);
    return ()=>{
      window.removeEventListener("mouseup",stop);
      window.removeEventListener("touchend",stop);
      window.removeEventListener("touchcancel",stop);
    };
  },[]);

  function setCond(item,cond){
    setForm(f=>{
      const cur=f.checklist[item]?.condition;
      if(cur===cond) return f;
      return {...f,checklist:{...f.checklist,[item]:{...(f.checklist[item]||emptyItem()),condition:cond}}};
    });
  }
  function startDrag(item,cond){ draggingRef.current=true; dragCondRef.current=cond; setCond(item,cond); }
  function dragEnter(item,cond){ if(draggingRef.current && dragCondRef.current===cond) setCond(item,cond); }
  function handleTouchMove(e){
    if(!draggingRef.current) return;
    const t=e.touches[0]; if(!t) return;
    e.preventDefault();
    const el=document.elementFromPoint(t.clientX,t.clientY);
    const box=el && el.closest('[data-tick="1"]');
    if(box){
      const item=box.getAttribute("data-item");
      const cond=box.getAttribute("data-cond");
      if(cond===dragCondRef.current) setCond(item,cond);
    }
  }
  const dragHandlers={ startDrag, dragEnter };

  function sf(k,v){ setForm(f=>({...f,[k]:v})); }
  function setVal(item,key,val){
    setForm(f=>({...f,checklist:{...f.checklist,[item]:{...(f.checklist[item]||emptyItem()),[key]:val}}}));
  }
  function addPhoto(item,url){
    setForm(f=>({...f,checklist:{...f.checklist,[item]:{...(f.checklist[item]||emptyItem()),photos:[...(f.checklist[item]?.photos||[]),url]}}}));
  }
  function removePhoto(item,idx){
    setForm(f=>({...f,checklist:{...f.checklist,[item]:{...(f.checklist[item]||emptyItem()),photos:(f.checklist[item]?.photos||[]).filter((_,j)=>j!==idx)}}}));
  }
  function setAP(key,val){ setForm(f=>({...f,appraisalPhotos:{...f.appraisalPhotos,[key]:val}})); }

  const years=Array.from({length:2025-1990+1},(_,i)=>2025-i);
  const isAppraiser=user.role==="Appraiser";

  function handleSubmit(e){
    e.preventDefault();
    if(!form.accountNumber.trim()){ setErr("Account number is required."); return; }
    if(!form.vehicleMake){ setErr("Vehicle make is required."); return; }
    if(isAppraiser){
      const missing=APPRAISAL_SLOTS.filter(s=>!(form.appraisalPhotos?.[s.key]?.length));
      if(missing.length){ setErr(`Missing appraisal photos: ${missing.map(s=>s.label).join(", ")}`); return; }
    }
    setErr(""); onSubmit(e);
  }

  return (
    <form onSubmit={handleSubmit} onTouchMove={handleTouchMove} style={{padding:12,maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:12}}>
        <h2 style={{fontSize:17,fontWeight:700,color:NAVY}}>{isEdit?"Edit MVC Report":"New MVC Report"}</h2>
        <p style={{fontSize:11,color:"#64748b"}}>{user.role} — {user.name}{isEdit && <span style={{color:"#d97706",marginLeft:4}}>· Changes require officer approval</span>}</p>
      </div>

      {/* Paper header */}
      <div style={{border:`2px solid ${NAVY}`,borderRadius:6,marginBottom:12,overflow:"hidden"}}>
        <div style={{backgroundColor:NAVY,color:"#fff",textAlign:"center",padding:"7px 12px",position:"relative"}}>
          <span style={{position:"absolute",right:12,top:8,color:GOLD,fontSize:10,fontWeight:700}}>APP COPY</span>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:"0.03em"}}>PHILIPPINE SAVINGS BANK</div>
          <div style={{fontSize:9,color:"#bfdbfe",letterSpacing:"0.2em"}}>MOTOR VEHICLE CHECKLIST</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",backgroundColor:"#fff"}}>
          <div style={{borderRight:"1px solid #e2e8f0",borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Account Name / Number" value={form.accountNumber} onChange={v=>sf("accountNumber",v)} placeholder="ACC-100234" mono required/></div>
          <div style={{borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Venue" value={form.venue} onChange={v=>sf("venue",v)} placeholder="Branch / Address"/></div>
          <div style={{borderRight:"1px solid #e2e8f0",borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Warehouse" value={form.warehouse} onChange={v=>sf("warehouse",v)} placeholder="Warehouse name"/></div>
          <div style={{borderBottom:"1px solid #e2e8f0",padding:8}}><Sel label="Year Model" value={form.yearModel} onChange={v=>sf("yearModel",v)} options={years.map(String)} placeholder="— year —"/></div>
          <div style={{gridColumn:"1 / -1",borderBottom:"1px solid #e2e8f0",padding:8}}><VehicleDropdowns form={form} onChange={setForm}/></div>
          <div style={{borderRight:"1px solid #e2e8f0",borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Color" value={form.color} onChange={v=>sf("color",v)} placeholder="Silver"/></div>
          <div style={{borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Plate No." value={form.plateNumber} onChange={v=>sf("plateNumber",v)} placeholder="NBC-1234" mono/></div>
          <div style={{borderRight:"1px solid #e2e8f0",borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Conduction" value={form.conductionSticker} onChange={v=>sf("conductionSticker",v)} placeholder="CD-9921" mono/></div>
          <div style={{borderBottom:"1px solid #e2e8f0",padding:8}}><Inp label="Engine No." value={form.engineNumber} onChange={v=>sf("engineNumber",v)} placeholder="2NRFE-88213" mono/></div>
          <div style={{borderRight:"1px solid #e2e8f0",padding:8}}><Inp label="Fuel Type" value={form.fuelType} onChange={v=>sf("fuelType",v)} placeholder="Gasoline"/></div>
          <div style={{padding:8}}><Inp label="Transmission" value={form.transmission} onChange={v=>sf("transmission",v)} placeholder="CVT"/></div>
          <div style={{borderRight:"1px solid #e2e8f0",borderTop:"1px solid #e2e8f0",padding:8}}><Inp label="Odometer (R)" value={form.odometerR} onChange={v=>sf("odometerR",v)} placeholder="50,000" mono/></div>
          <div style={{borderTop:"1px solid #e2e8f0",padding:8}}><Inp label="Odometer (W)" value={form.odometerW} onChange={v=>sf("odometerW",v)} placeholder="50,100" mono/></div>
        </div>
      </div>

      {/* Checklist sections */}
      {MVC_SECTIONS.map(sec=>(
        <ChecklistSectionForm key={sec.key} sec={sec} checklist={form.checklist}
          onSetVal={setVal} onAddPhoto={addPhoto} onRemovePhoto={removePhoto} dragHandlers={dragHandlers}/>
      ))}

      {/* Other items / personal belongings / damage remarks */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div style={{border:"1px solid #cbd5e1",borderRadius:4,overflow:"hidden"}}>
          <PanelBar>Other Vehicle Items</PanelBar>
          {form.otherItems.map((v,i)=>(
            <input key={i} value={v} onChange={e=>{ const a=[...form.otherItems]; a[i]=e.target.value; sf("otherItems",a); }}
              placeholder={`Item ${i+1}`}
              style={{width:"100%",fontSize:11,borderBottom:"1px solid #f1f5f9",border:"none",padding:"5px 8px",outline:"none"}}/>
          ))}
        </div>
        <div style={{border:"1px solid #cbd5e1",borderRadius:4,overflow:"hidden"}}>
          <PanelBar>Personal Belongings</PanelBar>
          {form.personalBelongings.map((v,i)=>(
            <input key={i} value={v} onChange={e=>{ const a=[...form.personalBelongings]; a[i]=e.target.value; sf("personalBelongings",a); }}
              placeholder={`Item ${i+1}`}
              style={{width:"100%",fontSize:11,borderBottom:"1px solid #f1f5f9",border:"none",padding:"5px 8px",outline:"none"}}/>
          ))}
        </div>
      </div>
      <div style={{border:"1px solid #cbd5e1",borderRadius:4,overflow:"hidden",marginBottom:12}}>
        <PanelBar>Damage / Defects / Remarks</PanelBar>
        <textarea value={form.damageRemarks} onChange={e=>sf("damageRemarks",e.target.value)} rows={3}
          placeholder="Describe all damages and defects..."
          style={{width:"100%",fontSize:12,padding:8,outline:"none",resize:"none",border:"none"}}/>
      </div>

      {/* Appraisal photos (Appraiser only) */}
      {isAppraiser && <div style={{marginBottom:12}}><AppraisalPhotosPanel ap={form.appraisalPhotos||emptyAP()} onUpdate={setAP}/></div>}

      {/* Signatures */}
      <div style={{border:"1px solid #cbd5e1",borderRadius:4,overflow:"hidden",marginBottom:16}}>
        <PanelBar>Signatures</PanelBar>
        <SignatureField
          sectionLabel="To be filled up by Client/Possessor"
          roleLabel="Client / Possessor"
          name={form.clientName} onNameChange={v=>sf("clientName",v)}
          signature={form.clientSignature} onSignatureChange={v=>sf("clientSignature",v)}
        />
        <div style={{borderTop:"1px solid #e2e8f0"}}>
          <SignatureField
            sectionLabel="To be filled up by Repossessor/Driver/Branch/External Agency"
            roleLabel="Repossessor / Driver / Branch / External Agency"
            name={form.repoName} onNameChange={v=>sf("repoName",v)}
            signature={form.repoSignature} onSignatureChange={v=>sf("repoSignature",v)}
          />
        </div>
        <div style={{backgroundColor:"#dde4f0",color:NAVY,textAlign:"center",fontSize:9,fontWeight:700,textTransform:"uppercase",padding:4}}>To be filled up by Bank's Warehouse Personnel/Guard on Duty</div>
        <SignatureField
          roleLabel="Bank's Warehouse Personnel / Guard on Duty"
          name={form.warehouseName} onNameChange={v=>sf("warehouseName",v)}
          signature={form.warehouseSignature} onSignatureChange={v=>sf("warehouseSignature",v)}
        />
      </div>

      {err && (
        <div style={{display:"flex",gap:6,backgroundColor:"#fef2f2",border:"1px solid #fca5a5",borderRadius:4,padding:"8px 10px",marginBottom:10,color:"#dc2626",fontSize:11}}>
          <AlertCircle size={14} style={{flexShrink:0,marginTop:1}}/><span>{err}</span>
        </div>
      )}
      <button type="submit" style={{backgroundColor:NAVY,color:"#fff",fontWeight:700,fontSize:13,padding:"10px 24px",borderRadius:4,border:"none"}}>
        {isEdit?"Submit for Approval":"Submit MVC Report"}
      </button>
    </form>
  );
}

/* ─── CONFIRM BANNER ─────────────────────────────────────────── */
function ConfirmBanner({ c, onClose }){
  if(!c) return null;
  return (
    <div style={{margin:12,backgroundColor:"#f0fdf4",border:"1px solid #86efac",borderRadius:4,padding:12,display:"flex",gap:8}}>
      <Mail size={18} color="#059669" style={{flexShrink:0,marginTop:1}}/>
      <div style={{fontSize:11,flex:1}}>
        <p style={{fontWeight:700,color:"#065f46"}}>{c.type==="edit"?"Edit Request Submitted — Pending Approval":"MVC Report Submitted Successfully"}</p>
        <p style={{color:"#047857",fontFamily:"monospace",marginTop:2}}>Account: {c.accountNumber} · {c.vehicle}</p>
        <p style={{color:"#047857",fontFamily:"monospace"}}>Ref: {c.reportId} · {fmtDate(c.time)}</p>
        {c.type==="edit" && <p style={{color:"#d97706",marginTop:4}}>⏳ Awaiting officer review before changes apply.</p>}
      </div>
      <button onClick={onClose} style={{color:"#047857",background:"none",border:"none"}}><X size={14}/></button>
    </div>
  );
}

/* ─── MY REPORTS ─────────────────────────────────────────────── */
function MyReports({ user, reports, pendingEdits, onEdit }){
  const mine=Object.entries(reports).filter(([,r])=>r[user.role]).map(([acc,r])=>({acc,r:r[user.role]}))
    .sort((a,b)=>new Date(b.r.submissionDate)-new Date(a.r.submissionDate));
  const myPending=pendingEdits.filter(e=>e.submittedBy===user.name&&e.encoderRole===user.role);
  if(!mine.length) return <Empty text="No reports submitted yet."/>;
  return (
    <div style={{padding:12,maxWidth:700,margin:"0 auto"}}>
      {myPending.length>0 && (
        <div style={{backgroundColor:"#fffbeb",border:"1px solid #fcd34d",borderRadius:4,padding:8,marginBottom:12,fontSize:11,color:"#92400e"}}>
          ⏳ You have {myPending.length} edit request(s) pending officer approval.
        </div>
      )}
      {mine.map(({acc,r})=>{
        const hp=myPending.some(pe=>pe.accountNumber===acc);
        return (
          <div key={acc} style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,padding:12,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <div>
              <p style={{fontFamily:"monospace",color:NAVY,fontSize:13,fontWeight:700}}>{acc}</p>
              <p style={{fontSize:12,color:"#334155"}}>{vehicleLabel(r)||`${r.vehicleMake} ${r.vehicleModel}`} ({r.yearModel})</p>
              <p style={{fontSize:10,color:"#94a3b8"}}>Plate: {r.plateNumber} · Filed {fmtDate(r.submissionDate)} · Ref {r.reportId}</p>
              {hp && <p style={{fontSize:10,color:"#d97706",marginTop:2}}>⏳ Edit pending approval</p>}
            </div>
            <button onClick={()=>onEdit(r)} disabled={hp}
              style={{display:"flex",alignItems:"center",gap:4,fontSize:11,border:"1px solid #cbd5e1",borderRadius:4,padding:"6px 10px",background:"#fff",opacity:hp?0.4:1,color:"#334155"}}>
              <Pencil size={12}/> {hp?"Pending...":"Request Edit"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── RECONCILIATION ─────────────────────────────────────────── */
function ComparisonDetail({ account, data, onBack }){
  const s=getAccountSummary(data);
  const sample=data[s.rolesPresent[0]];
  if(!sample) return <Empty text="No data available."/>;
  return (
    <div style={{padding:12,maxWidth:900,margin:"0 auto"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:4,fontSize:13,color:NAVY,fontWeight:600,marginBottom:12,background:"none",border:"none"}}>
        <ArrowLeft size={15}/> Back
      </button>
      <div style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,padding:12,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
        <div>
          <p style={{fontFamily:"monospace",color:NAVY,fontSize:15,fontWeight:700}}>{account}</p>
          <p style={{fontSize:13,color:"#334155"}}>{vehicleLabel(sample)||`${sample.vehicleMake} ${sample.vehicleModel}`} ({sample.yearModel})</p>
          <p style={{fontSize:10,color:"#94a3b8"}}>Plate: {sample.plateNumber} · Engine: {sample.engineNumber}</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
            {ENCODER_ROLES.map(r=>{
              const present=!!data[r]; const rm=ROLE_META[r];
              return (
                <span key={r} style={{fontSize:9,fontFamily:"monospace",fontWeight:700,padding:"2px 6px",border:`1px solid ${present?rm.color:"#e2e8f0"}`,color:present?rm.color:"#cbd5e1",borderRadius:3}}>
                  {r}{present?` — ${data[r].submittedBy}`:" — pending"}
                </span>
              );
            })}
          </div>
        </div>
        <Stamp status={s.status}/>
      </div>

      {/* Vehicle fields */}
      <div style={{border:"1px solid #e2e8f0",borderRadius:4,overflow:"hidden",marginBottom:12}}>
        <PanelBar>Vehicle &amp; Unit Details</PanelBar>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:11,minWidth:520,borderCollapse:"collapse"}}>
            <thead><tr style={{backgroundColor:"#dde4f0",color:NAVY}}>
              <th style={{textAlign:"left",padding:"6px 8px",fontSize:9,fontWeight:700,textTransform:"uppercase"}}>Field</th>
              {ENCODER_ROLES.map(r=><th key={r} style={{textAlign:"left",padding:"6px 8px",fontSize:9,fontWeight:700,textTransform:"uppercase"}}>{r}</th>)}
              <th style={{padding:"6px 8px",fontSize:9}}>Status</th>
            </tr></thead>
            <tbody>
              {s.vehicleFields.map(c=>(
                <tr key={c.key} style={{backgroundColor:rowBg(c.status)}}>
                  <td style={{padding:"6px 8px",border:"1px solid #f1f5f9",fontWeight:500,color:"#334155"}}>{c.label}</td>
                  {ENCODER_ROLES.map(role=>{ const e=c.entries.find(en=>en.role===role); return <td key={role} style={{padding:"6px 8px",border:"1px solid #f1f5f9",fontFamily:"monospace"}}>{e?e.value:"—"}</td>; })}
                  <td style={{padding:"6px 8px",border:"1px solid #f1f5f9",textAlign:"center"}}><StatusIcon status={c.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist sections */}
      {s.sectionComparisons.map(sec=>(
        <div key={sec.key} style={{border:"1px solid #e2e8f0",borderRadius:4,overflow:"hidden",marginBottom:12}}>
          <PanelBar>{sec.label}</PanelBar>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:11,minWidth:620,borderCollapse:"collapse"}}>
              <thead><tr style={{backgroundColor:"#dde4f0",color:NAVY}}>
                <th style={{textAlign:"left",padding:"6px 8px",fontSize:9,fontWeight:700,textTransform:"uppercase",width:160}}>Component</th>
                {ENCODER_ROLES.map(r=><th key={r} style={{textAlign:"left",padding:"6px 8px",fontSize:9,fontWeight:700,textTransform:"uppercase"}}>{r}</th>)}
                <th style={{padding:"6px 8px",fontSize:9}}>Status</th>
              </tr></thead>
              <tbody>
                {sec.items.map(c=>(
                  <tr key={c.n} style={{backgroundColor:rowBg(c.status)}}>
                    <td style={{padding:"6px 8px",border:"1px solid #f1f5f9",fontWeight:500,color:"#334155",verticalAlign:"top"}}>{c.n}{c.r && <span style={{color:"#ef4444"}}>*</span>}</td>
                    {ENCODER_ROLES.map(role=>{
                      const e=c.entries.find(en=>en.role===role);
                      return (
                        <td key={role} style={{padding:"6px 8px",border:"1px solid #f1f5f9",verticalAlign:"top"}}>
                          {e ? (
                            <div style={{display:"flex",flexDirection:"column",gap:2}}>
                              {!c.t && <MiniTicks condition={e.condition}/>}
                              {e.value && <p style={{fontSize:10,color:"#64748b"}}>{e.value}</p>}
                              {e.remarks && <p style={{fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>{e.remarks}</p>}
                              <PhotoThumbs photos={e.photos}/>
                            </div>
                          ) : <span style={{color:"#cbd5e1"}}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{padding:"6px 8px",border:"1px solid #f1f5f9",textAlign:"center",verticalAlign:"top"}}><StatusIcon status={c.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Appraisal photos */}
      {data.Appraiser?.appraisalPhotos && (
        <div style={{border:"1px solid #fcd34d",borderRadius:4,overflow:"hidden",marginBottom:12}}>
          <PanelBar right={`by ${data.Appraiser.submittedBy}`}>Appraisal Photo Evidence</PanelBar>
          <div style={{padding:8,backgroundColor:"#fff",display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8}}>
            {APPRAISAL_SLOTS.map(slot=>{
              const photos=data.Appraiser.appraisalPhotos[slot.key]||[];
              return (
                <div key={slot.key} style={{border:`1px solid ${photos.length?"#6ee7b7":"#fca5a5"}`,borderRadius:4,padding:6,backgroundColor:photos.length?"#f0fdf4":"#fef2f2"}}>
                  <p style={{fontSize:9,fontWeight:700,marginBottom:4,color:photos.length?"#059669":"#dc2626"}}>{slot.label}{!photos.length&&" ✗"}</p>
                  {photos.length ? <img src={photos[0]} alt="" style={{width:"100%",height:56,objectFit:"cover",borderRadius:3}}/> : <div style={{width:"100%",height:56,backgroundColor:"#f1f5f9",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#94a3b8"}}>No photo</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Damage remarks */}
      <div style={{border:"1px solid #e2e8f0",borderRadius:4,overflow:"hidden",marginBottom:12}}>
        <PanelBar>Damage / Defects / Remarks</PanelBar>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",backgroundColor:"#fff"}}>
          {ENCODER_ROLES.map((role,i)=>(
            <div key={role} style={{padding:8,borderRight:i<2?"1px solid #f1f5f9":"none"}}>
              <p style={{fontSize:9,fontWeight:700,marginBottom:4,color:ROLE_META[role].color}}>{role}</p>
              <p style={{fontSize:11,color:"#475569"}}>{data[role]?.damageRemarks||"—"}</p>
            </div>
          ))}
        </div>
      </div>
      <p style={{fontSize:10,color:"#94a3b8",paddingBottom:8}}>{s.majorCount} major · {s.partialCount} for review · {s.rolesPresent.length}/3 submitted</p>
    </div>
  );
}

function Dashboard({ reports, selected, setSelected }){
  const accs=Object.keys(reports);
  if(selected && reports[selected]) return <ComparisonDetail account={selected} data={reports[selected]} onBack={()=>setSelected(null)}/>;
  if(!accs.length) return <Empty text="No accounts submitted yet."/>;
  return (
    <div style={{padding:12,maxWidth:700,margin:"0 auto"}}>
      {accs.map(acc=>{
        const s=getAccountSummary(reports[acc]);
        const sample=reports[acc][s.rolesPresent[0]];
        if(!sample) return null;
        return (
          <button key={acc} onClick={()=>setSelected(acc)}
            style={{width:"100%",textAlign:"left",backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,padding:12,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <div>
              <p style={{fontFamily:"monospace",color:NAVY,fontSize:13,fontWeight:700}}>{acc}</p>
              <p style={{fontSize:12,color:"#334155"}}>{vehicleLabel(sample)||`${sample.vehicleMake} ${sample.vehicleModel}`} ({sample.yearModel})</p>
              <p style={{fontSize:10,color:"#94a3b8"}}>Plate: {sample.plateNumber}</p>
              <div style={{display:"flex",gap:4,marginTop:4}}>
                {ENCODER_ROLES.map(r=>{ const present=!!reports[acc][r]; const rm=ROLE_META[r]; return <span key={r} style={{fontSize:9,fontFamily:"monospace",fontWeight:700,padding:"1px 5px",border:`1px solid ${present?rm.color:"#e2e8f0"}`,color:present?rm.color:"#cbd5e1",borderRadius:3}}>{rm.code}</span>; })}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {s.majorCount>0 && <span style={{fontSize:11,color:"#dc2626",fontWeight:600}}>{s.majorCount} major</span>}
              {s.partialCount>0 && <span style={{fontSize:11,color:"#d97706",fontWeight:600}}>{s.partialCount} review</span>}
              <Stamp status={s.status}/>
              <ChevronRight size={16} color="#cbd5e1"/>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── ALL REPORTS ────────────────────────────────────────────── */
function AllReports({ reports, filterRole }){
  const rows=[];
  Object.entries(reports).forEach(([acc,r])=>ENCODER_ROLES.forEach(role=>{ if(r[role]&&(!filterRole||role===filterRole)) rows.push({acc,role,...r[role]}); }));
  rows.sort((a,b)=>new Date(b.submissionDate)-new Date(a.submissionDate));
  if(!rows.length) return <Empty text="No submissions yet."/>;
  return (
    <div style={{padding:12,overflowX:"auto"}}>
      <table style={{width:"100%",fontSize:11,backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,minWidth:680,borderCollapse:"collapse"}}>
        <thead><tr style={{backgroundColor:NAVY,color:"#fff"}}>
          {["Account","Role","Make/Model","Year","Plate","Color","Odo R","Filed By","Submitted"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:9,fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} style={{borderTop:"1px solid #f1f5f9"}}>
              <td style={{padding:"6px 8px",fontFamily:"monospace",color:NAVY,fontWeight:700}}>{r.acc}</td>
              <td style={{padding:"6px 8px"}}><span style={{fontSize:9,fontFamily:"monospace",fontWeight:700,padding:"1px 5px",border:`1px solid ${ROLE_META[r.role].color}`,color:ROLE_META[r.role].color,borderRadius:3}}>{ROLE_META[r.role].code}</span></td>
              <td style={{padding:"6px 8px"}}>{vehicleLabel(r)||`${r.vehicleMake} ${r.vehicleModel}`}</td>
              <td style={{padding:"6px 8px"}}>{r.yearModel}</td>
              <td style={{padding:"6px 8px",fontFamily:"monospace"}}>{r.plateNumber}</td>
              <td style={{padding:"6px 8px"}}>{r.color||"—"}</td>
              <td style={{padding:"6px 8px",fontFamily:"monospace"}}>{r.odometerR||"—"}</td>
              <td style={{padding:"6px 8px"}}>{r.submittedBy}</td>
              <td style={{padding:"6px 8px",color:"#94a3b8",whiteSpace:"nowrap"}}>{fmtDate(r.submissionDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── PENDING APPROVALS ──────────────────────────────────────── */
function PendingApprovals({ user, pendingEdits, onApprove, onReject }){
  const mine=pendingEdits.filter(e=>{
    if(isSuperAdmin(user.role)) return true;
    if(user.role==="appraisal_officer") return e.encoderRole==="Appraiser";
    if(user.role==="warehouse_officer") return e.encoderRole==="Warehouse";
    if(user.role==="repo_officer") return e.encoderRole==="Repossessor";
    return false;
  });
  if(!mine.length) return <Empty text="No pending edit requests."/>;
  return (
    <div style={{padding:12,maxWidth:700,margin:"0 auto"}}>
      {mine.map(pe=>(
        <div key={pe.id} style={{backgroundColor:"#fffbeb",border:"1px solid #fcd34d",borderRadius:4,padding:12,marginBottom:8}}>
          <p style={{fontFamily:"monospace",color:NAVY,fontSize:13,fontWeight:700}}>{pe.accountNumber}</p>
          <p style={{fontSize:10,color:"#94a3b8",marginBottom:8}}>{pe.encoderRole} — {pe.submittedBy} · {fmtDate(pe.submittedAt)}</p>
          <div style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,padding:8,fontSize:10,color:"#475569",marginBottom:8}}>
            <p>Plate: {pe.newData.plateNumber||"—"} &nbsp; Odo R: {pe.newData.odometerR||"—"} &nbsp; Mileage: {pe.newData.mileage||"—"}</p>
            {pe.newData.damageRemarks && <p style={{marginTop:4}}>Remarks: {pe.newData.damageRemarks}</p>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onApprove(pe.id)} style={{display:"flex",alignItems:"center",gap:4,backgroundColor:"#059669",color:"#fff",fontSize:11,fontWeight:700,padding:"6px 12px",borderRadius:4,border:"none"}}><ThumbsUp size={12}/> Approve</button>
            <button onClick={()=>onReject(pe.id)} style={{display:"flex",alignItems:"center",gap:4,backgroundColor:"#dc2626",color:"#fff",fontSize:11,fontWeight:700,padding:"6px 12px",borderRadius:4,border:"none"}}><ThumbsDown size={12}/> Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── USERS ──────────────────────────────────────────────────── */
function UserMgmt({ users, setUsers }){
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState({username:"",password:"",name:"",role:"Repossessor"});
  const [err,setErr]=useState("");
  function add(){
    if(!draft.username.trim()||!draft.password.trim()||!draft.name.trim()){ setErr("All fields required."); return; }
    if(users.find(u=>u.username===draft.username.trim())){ setErr("Username already taken."); return; }
    setUsers(u=>[...u,{id:genId("u"),...draft,username:draft.username.trim(),active:true}]);
    setDraft({username:"",password:"",name:"",role:"Repossessor"}); setAdding(false); setErr("");
  }
  return (
    <div style={{padding:12,maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{fontSize:14,fontWeight:700,color:NAVY}}>User Accounts</h3>
        <button onClick={()=>setAdding(a=>!a)} style={{display:"flex",alignItems:"center",gap:4,backgroundColor:NAVY,color:"#fff",fontSize:11,fontWeight:700,padding:"6px 12px",borderRadius:4,border:"none"}}><Plus size={12}/> Add User</button>
      </div>
      {adding && (
        <div style={{backgroundColor:"#fff",border:`1px solid ${GOLD}`,borderRadius:4,padding:12,marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Full name" style={{border:"1px solid #cbd5e1",borderRadius:4,padding:"6px 8px",fontSize:12,outline:"none"}}/>
          <input value={draft.username} onChange={e=>setDraft(d=>({...d,username:e.target.value}))} placeholder="Username" style={{border:"1px solid #cbd5e1",borderRadius:4,padding:"6px 8px",fontSize:12,fontFamily:"monospace",outline:"none"}}/>
          <input value={draft.password} onChange={e=>setDraft(d=>({...d,password:e.target.value}))} placeholder="Password" style={{border:"1px solid #cbd5e1",borderRadius:4,padding:"6px 8px",fontSize:12,outline:"none"}}/>
          <select value={draft.role} onChange={e=>setDraft(d=>({...d,role:e.target.value}))} style={{border:"1px solid #cbd5e1",borderRadius:4,padding:"6px 8px",fontSize:12,outline:"none"}}>
            {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
          {err && <p style={{color:"#dc2626",fontSize:10,gridColumn:"1 / -1"}}>{err}</p>}
          <div style={{display:"flex",gap:8,gridColumn:"1 / -1"}}>
            <button onClick={add} style={{backgroundColor:"#059669",color:"#fff",fontSize:11,fontWeight:700,padding:"6px 12px",borderRadius:4,border:"none"}}>Create</button>
            <button onClick={()=>{setAdding(false);setErr("");}} style={{border:"1px solid #cbd5e1",fontSize:11,padding:"6px 12px",borderRadius:4,background:"#fff"}}>Cancel</button>
          </div>
        </div>
      )}
      {ALL_ROLES.map(role=>{
        const members=users.filter(u=>u.role===role);
        if(!members.length) return null;
        return (
          <div key={role} style={{marginBottom:12}}>
            <p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:700,marginBottom:4,color:ROLE_META[role].color}}>{ROLE_META[role].label} · {members.length}</p>
            {members.map(u=>(
              <div key={u.id} style={{backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4,padding:8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",opacity:u.active?1:0.5}}>
                <div><span style={{fontSize:12,fontWeight:600}}>{u.name}</span> <span style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace"}}>/ {u.username}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <select value={u.role} onChange={e=>setUsers(us=>us.map(x=>x.id===u.id?{...x,role:e.target.value}:x))} style={{fontSize:10,border:"1px solid #cbd5e1",borderRadius:3,padding:"2px 4px"}}>
                    {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                  <span style={{fontSize:10,color:u.active?"#059669":"#94a3b8"}}>{u.active?"● Active":"○ Inactive"}</span>
                  <button onClick={()=>setUsers(us=>us.map(x=>x.id===u.id?{...x,active:!x.active}:x))} style={{fontSize:10,border:"1px solid #cbd5e1",borderRadius:3,padding:"2px 6px",background:"#fff"}}>{u.active?"Deactivate":"Activate"}</button>
                  <button onClick={()=>setUsers(us=>us.filter(x=>x.id!==u.id))} style={{color:"#ef4444",background:"none",border:"none"}}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ─── ACTIVITY LOG ───────────────────────────────────────────── */
function ActivityLogView({ log }){
  if(!log.length) return <Empty text="No activity yet."/>;
  return (
    <div style={{padding:12,maxWidth:600,margin:"0 auto",backgroundColor:"#fff",border:"1px solid #e2e8f0",borderRadius:4}}>
      {log.map((e,i)=>(
        <div key={e.id} style={{display:"flex",gap:8,padding:10,borderBottom:i<log.length-1?"1px solid #f1f5f9":"none"}}>
          <Activity size={14} color="#cbd5e1" style={{flexShrink:0,marginTop:1}}/>
          <div>
            <p style={{fontSize:12,color:"#334155"}}>{e.action}</p>
            <p style={{fontSize:10,color:"#94a3b8"}}>{e.userName} ({e.role}) · {fmtDate(e.ts)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ ROOT APP ═══════════════════════════ */
export default function App(){
  const [users,setUsers]=useState(INIT_USERS);
  const [user,setUser]=useState(null);
  const [reports,setReports]=useState(SEED_REPORTS);
  const [log,setLog]=useState(SEED_LOG);
  const [pendingEdits,setPendingEdits]=useState([]);
  const [tab,setTab]=useState("submit");
  const [form,setForm]=useState(null);
  const [editMode,setEditMode]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const [selected,setSelected]=useState(null);

  function login(u){ setUser(u); setTab(isSuperAdmin(u.role)||isOfficer(u.role)?"dashboard":"submit"); setSelected(null); setConfirm(null); setForm(emptyForm(u.role)); }
  function logout(){ setUser(null); setForm(null); setEditMode(false); setConfirm(null); }

  function submitNew(e){
    e.preventDefault();
    const reportId=genId("MVC"), ts=new Date().toISOString();
    const nr={...form,reportId,submittedBy:user.name,submissionDate:ts};
    setReports(prev=>({...prev,[form.accountNumber]:{...(prev[form.accountNumber]||{}),[user.role]:nr}}));
    setLog(prev=>[{id:Date.now(),userName:user.name,role:user.role,action:`Submitted ${reportId} for ${form.accountNumber}`,ts},...prev]);
    setConfirm({reportId,accountNumber:form.accountNumber,vehicle:vehicleLabel(form)||`${form.vehicleMake} ${form.vehicleModel}`,time:ts,type:"new"});
    setForm(emptyForm(user.role)); setEditMode(false);
  }
  function submitEdit(e){
    e.preventDefault();
    const id=genId("PE"), ts=new Date().toISOString();
    setPendingEdits(prev=>[...prev,{id,accountNumber:form.accountNumber,encoderRole:user.role,submittedBy:user.name,submittedAt:ts,newData:{...form}}]);
    setLog(prev=>[{id:Date.now(),userName:user.name,role:user.role,action:`Edit request for ${form.accountNumber} — awaiting approval`,ts},...prev]);
    setConfirm({reportId:id,accountNumber:form.accountNumber,vehicle:vehicleLabel(form)||`${form.vehicleMake} ${form.vehicleModel}`,time:ts,type:"edit"});
    setForm(emptyForm(user.role)); setEditMode(false);
  }
  function approveEdit(id){
    const pe=pendingEdits.find(e=>e.id===id); if(!pe) return;
    setReports(prev=>({...prev,[pe.accountNumber]:{...(prev[pe.accountNumber]||{}),[pe.encoderRole]:{...pe.newData,reportId:prev[pe.accountNumber]?.[pe.encoderRole]?.reportId||pe.id,submissionDate:new Date().toISOString()}}}));
    setPendingEdits(prev=>prev.filter(e=>e.id!==id));
    setLog(prev=>[{id:Date.now(),userName:user.name,role:user.role,action:`Approved edit for ${pe.accountNumber} by ${pe.submittedBy}`,ts:new Date().toISOString()},...prev]);
  }
  function rejectEdit(id){
    const pe=pendingEdits.find(e=>e.id===id); if(!pe) return;
    setPendingEdits(prev=>prev.filter(e=>e.id!==id));
    setLog(prev=>[{id:Date.now(),userName:user.name,role:user.role,action:`Rejected edit for ${pe.accountNumber} by ${pe.submittedBy}`,ts:new Date().toISOString()},...prev]);
  }
  function startEdit(report){
    setForm({...report,checklist:{...report.checklist},appraisalPhotos:report.appraisalPhotos?{...report.appraisalPhotos}:undefined});
    setEditMode(true); setTab("submit"); setConfirm(null);
  }

  if(!user) return <Login users={users} onLogin={login}/>;

  const myPendingCount=pendingEdits.filter(e=>{
    if(isSuperAdmin(user.role)) return true;
    if(user.role==="appraisal_officer") return e.encoderRole==="Appraiser";
    if(user.role==="warehouse_officer") return e.encoderRole==="Warehouse";
    if(user.role==="repo_officer") return e.encoderRole==="Repossessor";
    return false;
  }).length;

  const officerGroup=encoderGroup(user.role);
  const eTabs=[{key:"submit",label:editMode?"Edit":"Submit",icon:ClipboardList},{key:"mine",label:"My Reports",icon:ListChecks}];
  const oTabs=[{key:"dashboard",label:"Reconciliation",icon:LayoutDashboard},{key:"all",label:`${officerGroup} Reports`,icon:Car},{key:"pending",label:"Approvals",icon:Clock,badge:myPendingCount},{key:"log",label:"Activity",icon:Activity}];
  const aTabs=[{key:"dashboard",label:"Reconciliation",icon:LayoutDashboard},{key:"all",label:"All Submissions",icon:Car},{key:"pending",label:"Approvals",icon:Clock,badge:myPendingCount},{key:"users",label:"Users",icon:Users},{key:"log",label:"Activity",icon:Activity}];
  const activeTabs=isSuperAdmin(user.role)?aTabs:isOfficer(user.role)?oTabs:eTabs;

  return (
    <div style={{minHeight:"100vh",backgroundColor:"#f0f2f5"}}>
      <URLBar/>
      <TopBar user={user} pendingCount={myPendingCount} onLogout={logout}/>
      <Tabs tabs={activeTabs} active={tab} onChange={t=>{ setTab(t); setSelected(null); if(t!=="submit") setEditMode(false); }}/>

      {isEncoder(user.role) && tab==="submit" && form && (
        <>
          <ConfirmBanner c={confirm} onClose={()=>setConfirm(null)}/>
          <ReportForm user={user} form={form} setForm={setForm} onSubmit={editMode?submitEdit:submitNew} isEdit={editMode}/>
        </>
      )}
      {isEncoder(user.role) && tab==="mine" && <MyReports user={user} reports={reports} pendingEdits={pendingEdits} onEdit={startEdit}/>}

      {isOfficer(user.role) && tab==="dashboard" && <Dashboard reports={reports} selected={selected} setSelected={setSelected}/>}
      {isOfficer(user.role) && tab==="all" && <AllReports reports={reports} filterRole={officerGroup}/>}
      {isOfficer(user.role) && tab==="pending" && <PendingApprovals user={user} pendingEdits={pendingEdits} onApprove={approveEdit} onReject={rejectEdit}/>}
      {isOfficer(user.role) && tab==="log" && <ActivityLogView log={log}/>}

      {isSuperAdmin(user.role) && tab==="dashboard" && <Dashboard reports={reports} selected={selected} setSelected={setSelected}/>}
      {isSuperAdmin(user.role) && tab==="all" && <AllReports reports={reports}/>}
      {isSuperAdmin(user.role) && tab==="pending" && <PendingApprovals user={user} pendingEdits={pendingEdits} onApprove={approveEdit} onReject={rejectEdit}/>}
      {isSuperAdmin(user.role) && tab==="users" && <UserMgmt users={users} setUsers={setUsers}/>}
      {isSuperAdmin(user.role) && tab==="log" && <ActivityLogView log={log}/>}
    </div>
  );
}
