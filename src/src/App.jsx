import { useState, useMemo, useRef } from "react";

// ─── SABİTLER ────────────────────────────────────────────────────────────────
const FIRMA  = { name:"Muster GmbH", uid:"CHE-123.456.789", adresse:"Bahnhofstrasse 1, 8001 Zürich", mwstNr:"CHE-123.456.789 MWST" };
const JAHR   = 2025;
const FARBEN = { primary:"#0F1F3D", red:"#E8002D", green:"#059669", blue:"#2563EB", purple:"#7C3AED", amber:"#D97706" };

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────
const fmt  = (n,d=2) => Number(Math.abs(n)||0).toLocaleString("de-CH",{minimumFractionDigits:d,maximumFractionDigits:d});
const mAus = (b,r)   => { const bv=parseFloat(b)||0,rv=parseFloat(r)||0; return bv-bv/(1+rv/100); };
const pct  = (v,t)   => t===0?0:Math.round(v/t*1000)/10;
const diff = (c,p)   => p===0?0:Math.round((c-p)/Math.abs(p)*1000)/10;

// ─── BAŞLANGIÇ VERİLERİ ──────────────────────────────────────────────────────
const INIT = {
  buchungen:[
    {id:1,datum:"01.06.2025",beschreibung:"Miete Juni",         soll:"6000",haben:"1020",betrag:2400, mwst:0,     belegnr:"MR-001"},
    {id:2,datum:"03.06.2025",beschreibung:"Verkauf Müller AG",  soll:"1100",haben:"3200",betrag:5400, mwst:403.7, belegnr:"RE-001"},
    {id:3,datum:"05.06.2025",beschreibung:"Swisscom Rechnung",  soll:"6510",haben:"1020",betrag:189,  mwst:14.15, belegnr:"EK-001"},
    {id:4,datum:"10.06.2025",beschreibung:"Lohnzahlung",        soll:"5000",haben:"1020",betrag:8500, mwst:0,     belegnr:"LO-001"},
    {id:5,datum:"12.06.2025",beschreibung:"Müller AG zahlt ein",soll:"1020",haben:"1100",betrag:5400, mwst:0,     belegnr:"ZA-001"},
    {id:6,datum:"15.06.2025",beschreibung:"Wareneinkauf",       soll:"4000",haben:"2000",betrag:2160, mwst:161.5, belegnr:"EK-002"},
    {id:7,datum:"20.06.2025",beschreibung:"Weber zahlt ein",    soll:"1020",haben:"1100",betrag:5400, mwst:0,     belegnr:"ZA-002"},
    {id:8,datum:"25.06.2025",beschreibung:"Versicherung",       soll:"6300",haben:"1020",betrag:340,  mwst:0,     belegnr:"EK-003"},
  ],
  rechnungen:[
    {id:1,nr:"RE-2025-001",datum:"01.06.2025",faellig:"01.07.2025",kunde:"Müller GmbH",   beschreibung:"Buchhaltung Juni",betrag:2700, mwstSatz:8.1,status:"bezahlt"},
    {id:2,nr:"RE-2025-002",datum:"10.06.2025",faellig:"10.07.2025",kunde:"Weber & Partner",beschreibung:"Jahresabschluss", betrag:5400, mwstSatz:8.1,status:"bezahlt"},
    {id:3,nr:"RE-2025-003",datum:"15.06.2025",faellig:"15.07.2025",kunde:"Huber AG",      beschreibung:"Lohnbuchhaltung", betrag:1620, mwstSatz:8.1,status:"offen"},
    {id:4,nr:"RE-2025-004",datum:"20.06.2025",faellig:"20.07.2025",kunde:"Schmidt KG",    beschreibung:"Steuerberatung",  betrag:3240, mwstSatz:8.1,status:"ueberfaellig"},
  ],
  giderler:[
    {id:1,datum:"01.06.2025",tedarikci:"Swisscom AG",   aciklama:"Telefon Juni",  brutto:189,  mwstOran:8.1,kategori:"Telefon",  konto:"6510"},
    {id:2,datum:"01.06.2025",tedarikci:"Landlord GmbH", aciklama:"Miete Juni",    brutto:2400, mwstOran:0,  kategori:"Miete",    konto:"6000"},
    {id:3,datum:"05.06.2025",tedarikci:"Migros B2B",    aciklama:"Büromaterial",  brutto:94.5, mwstOran:8.1,kategori:"Büro",     konto:"6520"},
    {id:4,datum:"10.06.2025",tedarikci:"Google Ads",    aciklama:"Werbung Juni",  brutto:250,  mwstOran:8.1,kategori:"Marketing",konto:"6600"},
    {id:5,datum:"15.06.2025",tedarikci:"Zurich Versich.",aciklama:"Prämie",       brutto:340,  mwstOran:0,  kategori:"Versich.", konto:"6300"},
  ],
  mitarbeiter:[
    {id:1,name:"Anna Müller",  gebJahr:1988,ausweis:"C",kanton:"ZH",qstCode:"B1",brutto:8500, bvgPflicht:true, abteilung:"Buchhaltung"},
    {id:2,name:"Marco Rossi",  gebJahr:1975,ausweis:"B",kanton:"ZH",qstCode:"A0",brutto:6200, bvgPflicht:true, abteilung:"Verkauf"},
    {id:3,name:"Thomas Weber", gebJahr:1965,ausweis:"C",kanton:"ZH",qstCode:"B2",brutto:12000,bvgPflicht:true, abteilung:"Geschäftsltg."},
  ],
  zReports:[
    {id:"Z1",datum:"01.06.2025",zNr:"Z-154",bar:1014.50,visa:1240,master:612,maestro:345,twint:156,kassaSoll:2180.30,kassaIst:2175.80,verbucht:true},
    {id:"Z2",datum:"02.06.2025",zNr:"Z-155",bar:1329.50,visa:2340,master:957,maestro:456,twint:234,kassaSoll:2540.80,kassaIst:2540.80,verbucht:true},
    {id:"Z3",datum:"03.06.2025",zNr:"Z-156",bar:1136.00,visa:1890,master:678,maestro:323,twint:0,  kassaSoll:2426.80,kassaIst:2430.00,verbucht:false},
  ],
  mwst:{
    q1:{ertrag:420000,umsatzsteuer:34020,vorsteuer:12800},
    q2:{ertrag:580000,umsatzsteuer:46980,vorsteuer:16400},
    q3:{ertrag:710000,umsatzsteuer:57510,vorsteuer:20800},
    q4:{ertrag:840000,umsatzsteuer:68040,vorsteuer:27200},
  },
  konten:{
    "1000":3240,"1020":35599,"1100":18360,"1170":2841,"1200":8500,"1300":1200,
    "1400":28600,"1441":24300,"1700":4800,
    "2000":9840,"2200":6420,"2270":8500,"2330":6200,"2400":15000,"2800":42000,"2850":-8000,
    "3000":18000,"3200":64800,"4000":12400,"5000":43200,"5100":4558,
    "6000":14400,"6510":1134,"6600":1500,"6800":8240,"6900":111,"8500":8500,
  },
};

// ─── LOHN HESAPLAMA ───────────────────────────────────────────────────────────
function lohnCalc(ma) {
  const b=ma.brutto,ahv=b*5.3/100,alv=b*1.1/100,nbu=b*1.1/100;
  const bvg=ma.bvgPflicht&&b*12>=22680?Math.max(0,Math.min(b*12,90720)-26460)*5/100/12:0;
  const qst=ma.ausweis==="B"?b*14.5/100:0;
  const an=ahv+alv+bvg+nbu+qst;
  const ag=ahv+alv+bvg+(b*0.17/100)+(b*1.5/100);
  return {brutto:b,ahv,alv,bvg,nbu,qst,netto:b-an,an_total:an,ag_total:b+ag};
}

// ─── UI BİLEŞENLERİ ──────────────────────────────────────────────────────────
function Card({children,style={}}) {
  return <div style={{background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",
    boxShadow:"0 1px 6px rgba(0,0,0,.05)",overflow:"hidden",...style}}>{children}</div>;
}

function CardHeader({title,sub,action}) {
  return (
    <div style={{padding:"16px 20px",borderBottom:"1px solid #F3F4F6",
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontWeight:700,fontSize:15,color:"#0F1F3D"}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function Btn({onClick,children,color="#0F1F3D",style={}}) {
  return (
    <button onClick={onClick} style={{background:color,color:"#fff",border:"none",
      borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",
      fontFamily:"inherit",...style}}>
      {children}
    </button>
  );
}

function Input({label,value,onChange,placeholder,type="text",readOnly=false}) {
  return (
    <div>
      {label&&<div style={{fontSize:10,fontWeight:700,color:"#9CA3AF",
        textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        readOnly={readOnly}
        style={{border:"1.5px solid #E5E7EB",borderRadius:8,padding:"9px 12px",
          fontSize:13,outline:"none",width:"100%",fontFamily:"inherit",color:"#1A1A2E",
          background:readOnly?"#F9FAFB":"#fff"}}/>
    </div>
  );
}

function Select({label,value,onChange,children}) {
  return (
    <div>
      {label&&<div style={{fontSize:10,fontWeight:700,color:"#9CA3AF",
        textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{label}</div>}
      <select value={value} onChange={onChange}
        style={{border:"1.5px solid #E5E7EB",borderRadius:8,padding:"9px 12px",
          fontSize:13,outline:"none",width:"100%",fontFamily:"inherit",
          color:"#1A1A2E",background:"#fff"}}>
        {children}
      </select>
    </div>
  );
}

function StatusBadge({status}) {
  const m={bezahlt:{bg:"#ECFDF5",c:"#059669",l:"✓ Bezahlt"},
           offen:  {bg:"#FFFBEB",c:"#D97706",l:"⏳ Offen"},
           ueberfaellig:{bg:"#FEF2F2",c:"#DC2626",l:"⚠ Überfällig"}};
  const s=m[status]||m.offen;
  return <span style={{background:s.bg,color:s.c,border:`1px solid ${s.c}33`,
    borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{s.l}</span>;
}

function StatCard({icon,label,value,sub,color="#0F1F3D"}) {
  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",
      padding:"18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
      <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:19,fontWeight:800,color,letterSpacing:"-0.5px"}}>{value}</div>
      <div style={{fontSize:12,color:"#374151",fontWeight:600,marginTop:3}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── MODÜLLER ─────────────────────────────────────────────────────────────────

// DASHBOARD
function Dashboard({state}) {
  const totUmsatz = state.rechnungen.reduce((s,r)=>s+r.betrag,0);
  const offene    = state.rechnungen.filter(r=>r.status!=="bezahlt").reduce((s,r)=>s+r.betrag,0);
  const totLohn   = state.mitarbeiter.reduce((s,m)=>s+m.brutto,0);
  const mwstZL    = Object.values(state.mwst).reduce((s,q)=>s+(q.umsatzsteuer-q.vorsteuer),0);
  const zTotal    = state.zReports.reduce((s,z)=>s+z.bar+z.visa+z.master+z.maestro+z.twint,0);

  const alerts=[
    ...state.rechnungen.filter(r=>r.status==="ueberfaellig").map(r=>({t:"danger",m:`Überfällig: ${r.nr} — ${r.kunde} — CHF ${fmt(r.betrag)}`})),
    ...state.rechnungen.filter(r=>r.status==="offen").map(r=>({t:"warning",m:`Offen: ${r.nr} fällig ${r.faellig}`})),
    {t:"info",m:"MWST Q2 2025 fällig bis 01.09.2025"},
    {t:"info",m:`${state.zReports.filter(z=>!z.verbucht).length} Z-Abschlüsse noch nicht verbucht`},
  ].filter(Boolean);

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0F1F3D",letterSpacing:"-0.5px"}}>
          Willkommen — {FIRMA.name}
        </h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:4}}>
          Geschäftsjahr {JAHR} • {new Date().toLocaleDateString("de-CH")}
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        <StatCard icon="💵" label="Jahresumsatz"       value={"CHF "+fmt(totUmsatz)}  sub="Ausgangsrechnungen" color={FARBEN.primary}/>
        <StatCard icon="⏳" label="Offene Forderungen" value={"CHF "+fmt(offene)}     sub={state.rechnungen.filter(r=>r.status!=="bezahlt").length+" Rechnungen"} color={FARBEN.amber}/>
        <StatCard icon="🖨️" label="Kassenumsatz YTD"  value={"CHF "+fmt(zTotal)}     sub={state.zReports.length+" Z-Abschlüsse"} color={FARBEN.primary}/>
        <StatCard icon="👥" label="Lohnkosten/Monat"  value={"CHF "+fmt(totLohn)}    sub={state.mitarbeiter.length+" Mitarbeiter"} color={FARBEN.purple}/>
        <StatCard icon="🧾" label="MWST Zahllast YTD" value={"CHF "+fmt(mwstZL)}     sub="An ESTV abzuführen" color={FARBEN.blue}/>
        <StatCard icon="📋" label="Buchungen"          value={state.buchungen.length+""} sub="Journal Einträge" color={FARBEN.primary}/>
      </div>

      {alerts.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:700,fontSize:14,color:"#0F1F3D",marginBottom:10}}>🔔 Aufgaben & Hinweise</div>
          {alerts.map((a,i)=>(
            <div key={i} style={{padding:"11px 16px",borderRadius:10,marginBottom:8,
              fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:10,
              background:a.t==="danger"?"#FEF2F2":a.t==="warning"?"#FFFBEB":"#EFF6FF",
              color:a.t==="danger"?"#DC2626":a.t==="warning"?"#D97706":"#2563EB",
              border:`1px solid ${a.t==="danger"?"#FECACA":a.t==="warning"?"#FDE68A":"#BFDBFE"}`}}>
              {a.t==="danger"?"⚠️":a.t==="warning"?"⏰":"ℹ️"} {a.m}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Letzte Buchungen" sub={state.buchungen.length+" Einträge"}/>
        {state.buchungen.slice(0,6).map(b=>(
          <div key={b.id} style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",padding:"11px 20px",borderBottom:"1px solid #F9FAFB"}}>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:"#0F1F3D"}}>{b.beschreibung}</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{b.datum} • {b.belegnr} • {b.soll} / {b.haben}</div>
            </div>
            <div style={{fontWeight:700,fontSize:14,color:"#0F1F3D"}}>CHF {fmt(b.betrag)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// JOURNAL
function Journal({state,setState}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({datum:"",beschreibung:"",soll:"",haben:"",betrag:"",belegnr:""});
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const VORLAGEN=[
    {l:"Miete",s:"6000",h:"1020"},{l:"Lohn",s:"5000",h:"1020"},
    {l:"Verkauf bar",s:"1000",h:"3200"},{l:"Verkauf Debitor",s:"1100",h:"3200"},
    {l:"Einkauf Kredit",s:"4000",h:"2000"},{l:"Debitor zahlt",s:"1020",h:"1100"},
    {l:"Kreditor zahlen",s:"2000",h:"1020"},{l:"Bankspesen",s:"6900",h:"1020"},
  ];

  function speichern(){
    setState(p=>({...p,buchungen:[{...form,id:Date.now(),betrag:parseFloat(form.betrag)||0,mwst:0},...p.buchungen]}));
    setForm({datum:"",beschreibung:"",soll:"",haben:"",betrag:"",belegnr:""});
    setShowForm(false);
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>📋 Buchungsjournal</h2>
          <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>{state.buchungen.length} Buchungen</p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)}>+ Neue Buchung</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:20}}>
          <div style={{padding:20}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {VORLAGEN.map(v=>(
                <button key={v.l} onClick={()=>setForm(p=>({...p,soll:v.s,haben:v.h,beschreibung:v.l}))}
                  style={{background:"#F3F4F6",border:"1.5px solid #E5E7EB",borderRadius:8,
                    padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",color:"#374151"}}>
                  {v.l}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 80px 80px 120px 140px",gap:10,marginBottom:12}}>
              <Input label="Datum" value={form.datum} onChange={set("datum")} placeholder="TT.MM.JJJJ"/>
              <Input label="Beschreibung" value={form.beschreibung} onChange={set("beschreibung")} placeholder="Buchungstext"/>
              <Input label="Soll" value={form.soll} onChange={set("soll")} placeholder="6000"/>
              <Input label="Haben" value={form.haben} onChange={set("haben")} placeholder="1020"/>
              <Input label="Betrag CHF" type="number" value={form.betrag} onChange={set("betrag")} placeholder="0.00"/>
              <Input label="Belegnr." value={form.belegnr} onChange={set("belegnr")} placeholder="RE-2025-001"/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{background:"#F3F4F6",border:"none",
                borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#374151"}}>
                Abbrechen
              </button>
              <Btn onClick={speichern}>💾 Speichern</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Datum","Beleg","Buchungstext","Soll","Haben","Betrag","MWST"].map(h=>(
                <th key={h} style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",
                  letterSpacing:".6px",padding:"10px 14px",background:"#F9FAFB",
                  borderBottom:"1px solid #F3F4F6",textAlign:["Betrag","MWST"].includes(h)?"right":"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.buchungen.map(b=>(
              <tr key={b.id} onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{padding:"10px 14px",fontSize:12,color:"#6B7280",borderBottom:"1px solid #F9FAFB"}}>{b.datum}</td>
                <td style={{padding:"10px 14px",fontSize:11,color:"#9CA3AF",borderBottom:"1px solid #F9FAFB"}}>{b.belegnr}</td>
                <td style={{padding:"10px 14px",fontWeight:600,fontSize:13,color:"#0F1F3D",borderBottom:"1px solid #F9FAFB"}}>{b.beschreibung}</td>
                <td style={{padding:"10px 14px",borderBottom:"1px solid #F9FAFB"}}>
                  <span style={{background:"#FEF2F2",color:"#DC2626",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{b.soll}</span>
                </td>
                <td style={{padding:"10px 14px",borderBottom:"1px solid #F9FAFB"}}>
                  <span style={{background:"#ECFDF5",color:"#059669",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{b.haben}</span>
                </td>
                <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,borderBottom:"1px solid #F9FAFB"}}>CHF {fmt(b.betrag)}</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontSize:12,color:"#DC2626",borderBottom:"1px solid #F9FAFB"}}>
                  {b.mwst>0?`CHF ${fmt(b.mwst)}`:"—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// AUSGANGSRECHNUNGEN
function Ertraege({state,setState}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({kunde:"",beschreibung:"",betrag:"",mwstSatz:8.1,datum:"",faellig:"",status:"offen"});
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const nextNr=()=>{
    const max=state.rechnungen.reduce((m,r)=>Math.max(m,parseInt(r.nr.split("-")[2]||"0")),0);
    return `RE-${JAHR}-${String(max+1).padStart(3,"0")}`;
  };

  function speichern(){
    setState(p=>({...p,rechnungen:[{...form,id:Date.now(),nr:nextNr(),betrag:parseFloat(form.betrag)||0},...p.rechnungen]}));
    setForm({kunde:"",beschreibung:"",betrag:"",mwstSatz:8.1,datum:"",faellig:"",status:"offen"});
    setShowForm(false);
  }

  const totBrutto=state.rechnungen.reduce((s,r)=>s+r.betrag,0);
  const totOffen=state.rechnungen.filter(r=>r.status!=="bezahlt").reduce((s,r)=>s+r.betrag,0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>💵 Ausgangsrechnungen</h2>
          <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>
            Total CHF {fmt(totBrutto)} • Offen CHF {fmt(totOffen)}
          </p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)} color={FARBEN.green}>+ Neue Rechnung</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:20}}>
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr 120px",gap:10,marginBottom:10}}>
              <Input label="Rechnungsnr." value={nextNr()} readOnly/>
              <Input label="Kunde" value={form.kunde} onChange={set("kunde")} placeholder="Müller GmbH"/>
              <Input label="Leistung" value={form.beschreibung} onChange={set("beschreibung")} placeholder="Buchhaltung Juni"/>
              <Input label="Betrag CHF" type="number" value={form.betrag} onChange={set("betrag")} placeholder="0.00"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <Input label="Datum" value={form.datum} onChange={set("datum")} placeholder="TT.MM.JJJJ"/>
              <Input label="Fällig" value={form.faellig} onChange={set("faellig")} placeholder="TT.MM.JJJJ"/>
              <Select label="MWST" value={form.mwstSatz} onChange={e=>setForm(p=>({...p,mwstSatz:parseFloat(e.target.value)}))}>
                <option value={8.1}>8.1% Normalsatz</option>
                <option value={2.6}>2.6% Reduziert</option>
                <option value={0}>0% Ohne MWST</option>
              </Select>
              <Select label="Status" value={form.status} onChange={set("status")}>
                <option value="offen">Offen</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="ueberfaellig">Überfällig</option>
              </Select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{background:"#F3F4F6",border:"none",
                borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#374151"}}>Abbrechen</button>
              <Btn onClick={speichern} color={FARBEN.green}>💾 Speichern</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Nr.","Datum","Fällig","Kunde","Beschreibung","Brutto","MWST","Netto","Status"].map(h=>(
                <th key={h} style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",
                  letterSpacing:".6px",padding:"10px 14px",background:"#F9FAFB",
                  borderBottom:"1px solid #F3F4F6",textAlign:["Brutto","MWST","Netto"].includes(h)?"right":"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.rechnungen.map(r=>{
              const mwst=mAus(r.betrag,r.mwstSatz);
              return (
                <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{padding:"10px 14px",fontWeight:700,color:FARBEN.blue,fontSize:12,borderBottom:"1px solid #F9FAFB"}}>{r.nr}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#6B7280",borderBottom:"1px solid #F9FAFB"}}>{r.datum}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:r.status==="ueberfaellig"?"#DC2626":"#6B7280",borderBottom:"1px solid #F9FAFB"}}>{r.faellig}</td>
                  <td style={{padding:"10px 14px",fontWeight:600,color:"#0F1F3D",borderBottom:"1px solid #F9FAFB"}}>{r.kunde}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #F9FAFB"}}>{r.beschreibung}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,borderBottom:"1px solid #F9FAFB"}}>{fmt(r.betrag)}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontSize:12,color:"#DC2626",borderBottom:"1px solid #F9FAFB"}}>{fmt(mwst)}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:FARBEN.green,borderBottom:"1px solid #F9FAFB"}}>{fmt(r.betrag-mwst)}</td>
                  <td style={{padding:"10px 14px",borderBottom:"1px solid #F9FAFB"}}><StatusBadge status={r.status}/></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:"#F9FAFB",borderTop:"2px solid #E5E7EB"}}>
              <td colSpan={5} style={{padding:"10px 14px",fontWeight:700}}>TOTAL</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800}}>{fmt(totBrutto)}</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#DC2626"}}>{fmt(state.rechnungen.reduce((s,r)=>s+mAus(r.betrag,r.mwstSatz),0))}</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:FARBEN.green}}>{fmt(state.rechnungen.reduce((s,r)=>s+r.betrag-mAus(r.betrag,r.mwstSatz),0))}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

// EINGANGSRECHNUNGEN (Giderler)
function Giderler({state,setState}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({datum:"",tedarikci:"",aciklama:"",brutto:"",mwstOran:8.1,kategori:"Miete",konto:"6000"});
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const KATEGORIEN=[
    {l:"Miete",k:"6000"},{l:"Telefon",k:"6510"},{l:"Versicherung",k:"6300"},
    {l:"Marketing",k:"6600"},{l:"Büro",k:"6520"},{l:"Fahrzeug",k:"6200"},
    {l:"Personal",k:"5000"},{l:"Waren",k:"4000"},{l:"Bankspesen",k:"6900"},
  ];

  function speichern(){
    setState(p=>({...p,giderler:[{...form,id:Date.now(),brutto:parseFloat(form.brutto)||0},...p.giderler]}));
    setForm({datum:"",tedarikci:"",aciklama:"",brutto:"",mwstOran:8.1,kategori:"Miete",konto:"6000"});
    setShowForm(false);
  }

  const totBrutto=state.giderler.reduce((s,g)=>s+g.brutto,0);
  const totMwst=state.giderler.reduce((s,g)=>s+mAus(g.brutto,g.mwstOran),0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>📤 Eingangsrechnungen</h2>
          <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>
            Total CHF {fmt(totBrutto)} • Vorsteuer CHF {fmt(totMwst)}
          </p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)} color={FARBEN.red}>+ Neue Rechnung</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:20}}>
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 120px",gap:10,marginBottom:10}}>
              <Input label="Datum" value={form.datum} onChange={set("datum")} placeholder="TT.MM.JJJJ"/>
              <Input label="Lieferant" value={form.tedarikci} onChange={set("tedarikci")} placeholder="Swisscom AG"/>
              <Input label="Beschreibung" value={form.aciklama} onChange={set("aciklama")} placeholder="Telefonrechnung"/>
              <Input label="Betrag CHF" type="number" value={form.brutto} onChange={set("brutto")} placeholder="0.00"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <Select label="Kategorie" value={form.kategori} onChange={e=>{
                const k=KATEGORIEN.find(x=>x.l===e.target.value);
                setForm(p=>({...p,kategori:e.target.value,konto:k?.k||"6000"}));
              }}>
                {KATEGORIEN.map(k=><option key={k.l}>{k.l}</option>)}
              </Select>
              <Select label="MWST" value={form.mwstOran} onChange={e=>setForm(p=>({...p,mwstOran:parseFloat(e.target.value)}))}>
                <option value={8.1}>8.1% Normalsatz</option>
                <option value={2.6}>2.6% Reduziert</option>
                <option value={0}>0% Ohne MWST</option>
              </Select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowForm(false)} style={{background:"#F3F4F6",border:"none",
                borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#374151"}}>Abbrechen</button>
              <Btn onClick={speichern} color={FARBEN.red}>💾 Speichern</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Datum","Lieferant","Beschreibung","Kategorie","Konto","Brutto","Vorsteuer","Netto"].map(h=>(
                <th key={h} style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",
                  letterSpacing:".6px",padding:"10px 14px",background:"#F9FAFB",
                  borderBottom:"1px solid #F3F4F6",textAlign:["Brutto","Vorsteuer","Netto"].includes(h)?"right":"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.giderler.map(g=>{
              const mwst=mAus(g.brutto,g.mwstOran);
              return (
                <tr key={g.id} onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#6B7280",borderBottom:"1px solid #F9FAFB"}}>{g.datum}</td>
                  <td style={{padding:"10px 14px",fontWeight:600,color:"#0F1F3D",borderBottom:"1px solid #F9FAFB"}}>{g.tedarikci}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151",borderBottom:"1px solid #F9FAFB"}}>{g.aciklama}</td>
                  <td style={{padding:"10px 14px",borderBottom:"1px solid #F9FAFB"}}>
                    <span style={{background:"#F3F4F6",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{g.kategori}</span>
                  </td>
                  <td style={{padding:"10px 14px",borderBottom:"1px solid #F9FAFB"}}>
                    <span style={{background:"#EFF6FF",color:FARBEN.blue,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{g.konto}</span>
                  </td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#DC2626",borderBottom:"1px solid #F9FAFB"}}>{fmt(g.brutto)}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontSize:12,color:FARBEN.green,borderBottom:"1px solid #F9FAFB"}}>{mwst>0?fmt(mwst):"—"}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,borderBottom:"1px solid #F9FAFB"}}>{fmt(g.brutto-mwst)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:"#F9FAFB",borderTop:"2px solid #E5E7EB"}}>
              <td colSpan={5} style={{padding:"10px 14px",fontWeight:700}}>TOTAL</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:"#DC2626"}}>{fmt(totBrutto)}</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:FARBEN.green}}>{fmt(totMwst)}</td>
              <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700}}>{fmt(totBrutto-totMwst)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

// LOHN
function Lohn({state}) {
  const alleLoehne=state.mitarbeiter.map(ma=>({ma,l:lohnCalc(ma)}));
  const totB=alleLoehne.reduce((s,x)=>s+x.l.brutto,0);
  const totN=alleLoehne.reduce((s,x)=>s+x.l.netto,0);
  const totAG=alleLoehne.reduce((s,x)=>s+x.l.ag_total,0);

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>👥 Lohnabrechnung</h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>{state.mitarbeiter.length} Mitarbeiter • Monatslohn</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        <StatCard icon="💰" label="Bruttolohn Total" value={"CHF "+fmt(totB)} color={FARBEN.primary}/>
        <StatCard icon="💸" label="Nettolohn Total"  value={"CHF "+fmt(totN)} color={FARBEN.green}/>
        <StatCard icon="🏦" label="AG-Kosten Total"  value={"CHF "+fmt(totAG)} color={FARBEN.red}/>
      </div>

      {alleLoehne.map(({ma,l})=>(
        <Card key={ma.id} style={{marginBottom:12}}>
          <div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:FARBEN.primary,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:800,fontSize:17,color:"#fff"}}>{ma.name.charAt(0)}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#0F1F3D"}}>{ma.name}</div>
                  <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>
                    {ma.abteilung} • Ausweis {ma.ausweis} • {ma.kanton}
                    {ma.ausweis==="B"&&<span style={{marginLeft:8,background:"#EDE9FE",color:FARBEN.purple,
                      borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>QST pflichtig</span>}
                  </div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#9CA3AF"}}>Nettolohn</div>
                <div style={{fontSize:22,fontWeight:900,color:FARBEN.primary}}>CHF {fmt(l.netto)}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
              {[
                {l:"Brutto",v:l.brutto,c:FARBEN.primary},
                {l:"AHV/IV 5.3%",v:l.ahv,c:"#DC2626"},
                {l:"ALV 1.1%",v:l.alv,c:"#DC2626"},
                {l:"BVG",v:l.bvg,c:"#DC2626"},
                {l:"NBU 1.1%",v:l.nbu,c:"#DC2626"},
                {l:"AG-Kosten",v:l.ag_total,c:FARBEN.purple},
              ].map(s=>(
                <div key={s.l} style={{background:"#F9FAFB",borderRadius:8,padding:"10px 12px",textAlign:"center",border:"1px solid #E5E7EB"}}>
                  <div style={{fontSize:13,fontWeight:700,color:s.c}}>{fmt(s.v)}</div>
                  <div style={{fontSize:10,color:"#9CA3AF",marginTop:2,fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
            {l.qst>0&&(
              <div style={{marginTop:10,background:"#EDE9FE",borderRadius:8,padding:"8px 12px",
                fontSize:12,color:FARBEN.purple,border:"1px solid #DDD6FE"}}>
                🏛️ Quellensteuer: CHF {fmt(l.qst)} (14.5% Tarif {ma.qstCode} Kanton {ma.kanton})
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// MWST
function MwstModul({state}) {
  const qs=["q1","q2","q3","q4"];
  const lb=["Q1 Jan–Mär","Q2 Apr–Jun","Q3 Jul–Sep","Q4 Okt–Dez"];
  const fr=["01.03."+JAHR,"01.09."+JAHR,"30.11."+JAHR,"01.03."+(JAHR+1)];
  const jt={
    ertrag:qs.reduce((s,q)=>s+state.mwst[q].ertrag,0),
    ust:   qs.reduce((s,q)=>s+state.mwst[q].umsatzsteuer,0),
    vst:   qs.reduce((s,q)=>s+state.mwst[q].vorsteuer,0),
    zl:    qs.reduce((s,q)=>s+(state.mwst[q].umsatzsteuer-state.mwst[q].vorsteuer),0),
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>🧾 MWST-Abrechnung {JAHR}</h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>Effektive Methode • ESTV Format</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <StatCard icon="💰" label="Jahresumsatz"    value={"CHF "+fmt(jt.ertrag)} color={FARBEN.primary}/>
        <StatCard icon="📤" label="Umsatzsteuer"    value={"CHF "+fmt(jt.ust)}    color="#DC2626"/>
        <StatCard icon="📥" label="Vorsteuer"       value={"CHF "+fmt(jt.vst)}    color={FARBEN.green}/>
        <StatCard icon="🏦" label="Zahllast ESTV"   value={"CHF "+fmt(jt.zl)}     color={FARBEN.purple}/>
      </div>

      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Quartal","Brutto Ertrag","Umsatzsteuer","Vorsteuer","Zahllast","Frist","Status"].map(h=>(
                <th key={h} style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",
                  letterSpacing:".6px",padding:"10px 16px",background:"#F9FAFB",
                  borderBottom:"1px solid #F3F4F6",
                  textAlign:["Brutto Ertrag","Umsatzsteuer","Vorsteuer","Zahllast"].includes(h)?"right":"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qs.map((q,i)=>{
              const d=state.mwst[q],zl=d.umsatzsteuer-d.vorsteuer;
              return (
                <tr key={q} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{padding:"12px 16px",fontWeight:700,color:"#0F1F3D",borderBottom:"1px solid #F9FAFB"}}>{lb[i]}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",borderBottom:"1px solid #F9FAFB"}}>{fmt(d.ertrag)}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",color:"#DC2626",fontWeight:600,borderBottom:"1px solid #F9FAFB"}}>{fmt(d.umsatzsteuer)}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",color:FARBEN.green,fontWeight:600,borderBottom:"1px solid #F9FAFB"}}>{fmt(d.vorsteuer)}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",fontWeight:800,color:zl>0?"#DC2626":FARBEN.green,borderBottom:"1px solid #F9FAFB"}}>CHF {fmt(zl)}</td>
                  <td style={{padding:"12px 16px",fontSize:12,color:"#6B7280",borderBottom:"1px solid #F9FAFB"}}>{fr[i]}</td>
                  <td style={{padding:"12px 16px",borderBottom:"1px solid #F9FAFB"}}>
                    <span style={{background:i<2?"#ECFDF5":"#FFFBEB",color:i<2?FARBEN.green:"#D97706",
                      borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>
                      {i<2?"✓ Eingereicht":"⏳ Ausstehend"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:"#0F1F3D"}}>
              <td style={{padding:"12px 16px",fontWeight:800,color:"#fff"}}>JAHRESTOTAL</td>
              <td style={{padding:"12px 16px",textAlign:"right",color:"rgba(255,255,255,.7)",fontWeight:700}}>{fmt(jt.ertrag)}</td>
              <td style={{padding:"12px 16px",textAlign:"right",color:"#FCA5A5",fontWeight:700}}>{fmt(jt.ust)}</td>
              <td style={{padding:"12px 16px",textAlign:"right",color:"#6EE7B7",fontWeight:700}}>{fmt(jt.vst)}</td>
              <td style={{padding:"12px 16px",textAlign:"right",color:"#C4B5FD",fontWeight:900,fontSize:14}}>CHF {fmt(jt.zl)}</td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

// Z-ABSCHLUSS
function ZKasse({state,setState}) {
  const totUmsatz=state.zReports.reduce((s,z)=>s+z.bar+z.visa+z.master+z.maestro+z.twint,0);
  const totBar   =state.zReports.reduce((s,z)=>s+z.bar,0);
  const totKarte =state.zReports.reduce((s,z)=>s+z.visa+z.master+z.maestro+z.twint,0);

  function verbuchen(id){
    setState(p=>({...p,zReports:p.zReports.map(z=>z.id===id?{...z,verbucht:true}:z)}));
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>🖨️ Z-Abschluss & Kassenbuch</h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>{state.zReports.length} Z-Abschlüsse • Total CHF {fmt(totUmsatz)}</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <StatCard icon="💰" label="Total Umsatz" value={"CHF "+fmt(totUmsatz)} color={FARBEN.primary}/>
        <StatCard icon="💵" label="davon Bar"    value={"CHF "+fmt(totBar)}    color="#374151"/>
        <StatCard icon="💳" label="davon Karte"  value={"CHF "+fmt(totKarte)}  color={FARBEN.blue}/>
      </div>

      {state.zReports.map(z=>{
        const total=z.bar+z.visa+z.master+z.maestro+z.twint;
        const diff=z.kassaIst-z.kassaSoll;
        return (
          <Card key={z.id} style={{marginBottom:12}}>
            <div style={{background:z.verbucht?FARBEN.primary:"#1E3A5F",padding:"16px 20px",color:"#fff",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15}}>{z.datum} — {z.zNr}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:2}}>
                  Kassendifferenz: {Math.abs(diff)<0.01?"✓ Ausgeglichen":diff>0?`+CHF ${fmt(diff)}`:`-CHF ${fmt(Math.abs(diff))}`}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:22,fontWeight:900,color:"#7CB3FF"}}>CHF {fmt(total)}</div>
                {!z.verbucht&&(
                  <button onClick={()=>verbuchen(z.id)} style={{background:"#E8002D",border:"none",
                    color:"#fff",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    ✓ Verbuchen
                  </button>
                )}
                {z.verbucht&&<span style={{background:"rgba(255,255,255,.15)",borderRadius:8,
                  padding:"6px 12px",fontSize:11,fontWeight:700}}>✓ Verbucht</span>}
              </div>
            </div>
            <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[
                {l:"💵 Bar",    v:z.bar,    k:"1000",c:"#374151"},
                {l:"💳 Visa",   v:z.visa,   k:"1031",c:"#1A1F71"},
                {l:"💳 Master", v:z.master, k:"1032",c:"#EB001B"},
                {l:"💳 Maestro",v:z.maestro,k:"1033",c:"#009BE0"},
                {l:"📱 TWINT",  v:z.twint,  k:"1020",c:"#000"},
              ].map(s=>(
                <div key={s.l} style={{background:"#F9FAFB",borderRadius:8,padding:"10px 12px",
                  textAlign:"center",border:"1px solid #E5E7EB",opacity:s.v===0?0.4:1}}>
                  <div style={{fontSize:12,fontWeight:800,color:s.c}}>{fmt(s.v)}</div>
                  <div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>{s.l}</div>
                  <div style={{fontSize:9,color:FARBEN.blue,marginTop:1,fontWeight:600}}>→ {s.k}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// BİLANZ
function Bilanz({state}) {
  const s=state.konten;
  const uv=(s["1000"]||0)+(s["1020"]||0)+(s["1100"]||0)+(s["1170"]||0)+(s["1200"]||0)+(s["1300"]||0);
  const av=(s["1400"]||0)+(s["1441"]||0)+(s["1700"]||0);
  const akt=uv+av;
  const kfv=(s["2000"]||0)+(s["2200"]||0)+(s["2270"]||0)+(s["2330"]||0);
  const lfv=s["2400"]||0;
  const ek0=(s["2800"]||0)+(s["2850"]||0);
  const je=akt-kfv-lfv-ek0;
  const ek=ek0+je;
  const pas=kfv+lfv+ek;

  const Gruppe=({title,items,total,farbe})=>(
    <div style={{marginBottom:6}}>
      <div style={{padding:"7px 16px",background:farbe+"15",borderLeft:`3px solid ${farbe}`}}>
        <span style={{fontSize:10,fontWeight:800,color:farbe,textTransform:"uppercase",letterSpacing:".5px"}}>{title}</span>
      </div>
      {items.filter(([,v])=>v!==0).map(([l,v])=>(
        <div key={l} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 16px 8px 22px",borderBottom:"1px solid #F9FAFB",fontSize:12,color:"#374151"}}>
          <span>{l}</span>
          <span style={{fontWeight:500}}>{fmt(v)}</span>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",padding:"9px 16px",
        background:"#F9FAFB",borderTop:"1px solid #E5E7EB",fontWeight:700,fontSize:13}}>
        <span>Total</span><span style={{color:farbe}}>CHF {fmt(total)}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D"}}>⚖️ Bilanz per 31.12.{JAHR}</h2>
        <p style={{color:"#6B7280",fontSize:13,marginTop:2}}>
          Bilanzsumme CHF {fmt(akt)} •{" "}
          <span style={{color:Math.abs(akt-pas)<1?FARBEN.green:"#DC2626",fontWeight:700}}>
            {Math.abs(akt-pas)<1?"✓ Ausgeglichen":"⚠ Differenz CHF "+fmt(Math.abs(akt-pas))}
          </span>
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Card>
          <div style={{background:FARBEN.primary,padding:"13px 18px",color:"#fff",fontWeight:800,fontSize:14}}>AKTIVEN</div>
          <Gruppe title="Umlaufvermögen" farbe={FARBEN.blue} total={uv} items={[
            ["Kasse",s["1000"]],["Bank",s["1020"]],["Debitoren",s["1100"]],
            ["Vorsteuer MWST",s["1170"]],["Vorräte",s["1200"]],["Trans. Aktiven",s["1300"]],
          ]}/>
          <Gruppe title="Anlagevermögen" farbe={FARBEN.purple} total={av} items={[
            ["Sachanlagen",s["1400"]],["Fahrzeuge",s["1441"]||0],["Immaterielle",s["1700"]||0],
          ]}/>
          <div style={{background:FARBEN.primary,padding:"13px 18px",display:"flex",justifyContent:"space-between",color:"#fff"}}>
            <span style={{fontWeight:700}}>TOTAL AKTIVEN</span>
            <span style={{fontWeight:900,fontSize:15,color:"#7CB3FF"}}>CHF {fmt(akt)}</span>
          </div>
        </Card>
        <Card>
          <div style={{background:"#1E3A5F",padding:"13px 18px",color:"#fff",fontWeight:800,fontSize:14}}>PASSIVEN</div>
          <Gruppe title="Kurzfristig" farbe="#DC2626" total={kfv} items={[
            ["Kreditoren",s["2000"]],["Geschuldete MWST",s["2200"]],
            ["Steuern",s["2270"]],["Rückstellungen",s["2330"]],
          ]}/>
          <Gruppe title="Langfristig" farbe={FARBEN.amber} total={lfv} items={[["Bankdarlehen",s["2400"]]]}/>
          <Gruppe title="Eigenkapital" farbe={FARBEN.green} total={ek} items={[
            ["Eigenkapital",s["2800"]],["Privat",s["2850"]],["Jahresergebnis",je],
          ]}/>
          <div style={{background:"#1E3A5F",padding:"13px 18px",display:"flex",justifyContent:"space-between",color:"#fff"}}>
            <span style={{fontWeight:700}}>TOTAL PASSIVEN</span>
            <span style={{fontWeight:900,fontSize:15,color:"#7CB3FF"}}>CHF {fmt(pas)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// EINSTELLUNGEN
function Einstellungen() {
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:800,color:"#0F1F3D",marginBottom:20}}>⚙️ Einstellungen</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[
          {title:"🏢 Firmendaten",items:[["Firmenname",FIRMA.name],["UID",FIRMA.uid],["Adresse",FIRMA.adresse],["MWST-Nr.",FIRMA.mwstNr]]},
          {title:"⚙️ System",items:[["Geschäftsjahr",JAHR],["MWST-Methode","Effektiv"],["Standard","OR / Swiss GAAP FER"],["Währung","CHF (Schweizer Franken)"]]},
        ].map(g=>(
          <Card key={g.title}>
            <CardHeader title={g.title}/>
            <div style={{padding:"0 0 8px"}}>
              {g.items.map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",
                  padding:"11px 20px",borderBottom:"1px solid #F9FAFB",fontSize:13}}>
                  <span style={{color:"#6B7280"}}>{l}</span>
                  <span style={{fontWeight:600,color:"#0F1F3D"}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div style={{marginTop:16,background:"#ECFDF5",borderRadius:12,padding:"16px 20px",
        border:"1px solid #A7F3D0",fontSize:13,color:"#065F46"}}>
        ✅ <strong>TreuhandPro v1.0</strong> — Aktive Module: Dashboard, Journal, Erträge, Aufwand, Lohn, MWST, Z-Abschluss, Bilanz, Einstellungen
      </div>
      <div style={{marginTop:12,background:"#EFF6FF",borderRadius:12,padding:"16px 20px",
        border:"1px solid #BFDBFE",fontSize:13,color:"#1D4ED8"}}>
        💡 Weitere Module (Bankabstimmung, POS/KK, Jahresabschluss, Finanztabellen) sind als eigenständige Dateien verfügbar und können hier integriert werden.
      </div>
    </div>
  );
}

// ─── NAVİGASYON ──────────────────────────────────────────────────────────────
const NAV=[
  {g:"Übersicht",  items:[{id:"dashboard",l:"Dashboard",       i:"🏠"}]},
  {g:"Buchhaltung",items:[
    {id:"journal",  l:"Journal",              i:"📋"},
    {id:"ertraege", l:"Ausgangsrechnungen",   i:"💵"},
    {id:"giderler", l:"Eingangsrechnungen",   i:"📤"},
  ]},
  {g:"Kasse & POS",items:[
    {id:"zkasse",   l:"Z-Abschluss & Kasse",  i:"🖨️"},
  ]},
  {g:"Personal",   items:[{id:"lohn",l:"Lohnabrechnung",i:"👥"}]},
  {g:"Steuern",    items:[{id:"mwst",l:"MWST-Abrechnung",i:"🧾"}]},
  {g:"Abschluss",  items:[{id:"bilanz",l:"Bilanz",i:"⚖️"}]},
  {g:"System",     items:[{id:"einstellungen",l:"Einstellungen",i:"⚙️"}]},
];

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function App() {
  const [state,setState]=useState(INIT);
  const [modul,setModul]=useState("dashboard");
  const [sidebar,setSidebar]=useState(true);

  function renderModul() {
    switch(modul) {
      case "dashboard":     return <Dashboard state={state}/>;
      case "journal":       return <Journal state={state} setState={setState}/>;
      case "ertraege":      return <Ertraege state={state} setState={setState}/>;
      case "giderler":      return <Giderler state={state} setState={setState}/>;
      case "lohn":          return <Lohn state={state}/>;
      case "mwst":          return <MwstModul state={state}/>;
      case "zkasse":        return <ZKasse state={state} setState={setState}/>;
      case "bilanz":        return <Bilanz state={state}/>;
      case "einstellungen": return <Einstellungen/>;
      default:              return <Dashboard state={state}/>;
    }
  }

  const aktItem=NAV.flatMap(g=>g.items).find(i=>i.id===modul);

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:"#F4F6F9",minHeight:"100vh",
      display:"flex",flexDirection:"column"}}>

      {/* TOP BAR */}
      <nav style={{background:FARBEN.primary,color:"#fff",padding:"0 20px",height:56,
        display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:200,
        boxShadow:"0 2px 16px rgba(0,0,0,.3)"}}>
        <button onClick={()=>setSidebar(!sidebar)} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"#fff",width:34,height:34,borderRadius:8,cursor:"pointer",
          fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
        <div style={{display:"flex",alignItems:"center",gap:10,fontWeight:800,fontSize:17}}>
          <div style={{width:30,height:30,background:FARBEN.red,borderRadius:6,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:900,fontSize:13}}>T+</div>
          Treuhand<span style={{color:"#7CB3FF"}}>Pro</span>
        </div>
        <div style={{width:1,height:24,background:"rgba(255,255,255,.2)",margin:"0 4px"}}/>
        <span style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>{aktItem?.i} {aktItem?.l}</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:700}}>{FIRMA.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>{FIRMA.uid}</div>
          </div>
          <div style={{width:34,height:34,borderRadius:"50%",background:FARBEN.red,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:800,fontSize:14,cursor:"pointer"}}>T</div>
        </div>
      </nav>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* SIDEBAR */}
        {sidebar&&(
          <aside style={{width:220,background:"#1A2B47",flexShrink:0,
            overflowY:"auto",padding:"16px 0"}}>
            {NAV.map(g=>(
              <div key={g.g} style={{marginBottom:6}}>
                <div style={{padding:"6px 18px",fontSize:9,fontWeight:800,
                  color:"rgba(255,255,255,.3)",textTransform:"uppercase",
                  letterSpacing:"1px",marginBottom:2}}>{g.g}</div>
                {g.items.map(item=>{
                  const aktiv=modul===item.id;
                  return (
                    <button key={item.id} onClick={()=>setModul(item.id)} style={{
                      width:"100%",textAlign:"left",
                      background:aktiv?"rgba(124,179,255,.15)":"transparent",
                      border:"none",
                      borderLeft:aktiv?"3px solid #7CB3FF":"3px solid transparent",
                      color:aktiv?"#7CB3FF":"rgba(255,255,255,.6)",
                      padding:"9px 18px",fontSize:13,fontWeight:aktiv?700:400,
                      cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                      transition:"all .12s"}}>
                      <span style={{fontSize:15}}>{item.i}</span>{item.l}
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>
        )}

        {/* MAIN */}
        <main style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
          {renderModul()}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;}
        input,select,button,textarea{font-family:'Inter',sans-serif;}
        input:focus,select:focus{border-color:#7CB3FF!important;outline:none;}
        aside::-webkit-scrollbar{width:4px;}
        aside::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:2px;}
        main::-webkit-scrollbar{width:6px;}
        main::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
        @media print{nav,aside{display:none!important;}main{padding:0!important;}}
      `}</style>
    </div>
  );
}
