import { useState } from "react";

const TROOP_TYPES = [
  { key: "apexInfantry",    label: "Apex Infantry",    tier: "apex" },
  { key: "apexCavalry",     label: "Apex Cavalry",     tier: "apex" },
  { key: "apexArcher",      label: "Apex Archer",      tier: "apex" },
  { key: "supremeInfantry", label: "Supreme Infantry", tier: "supreme" },
  { key: "supremeCavalry",  label: "Supreme Cavalry",  tier: "supreme" },
  { key: "supremeArcher",   label: "Supreme Archer",   tier: "supreme" },
];

const LABEL_MAP = {
  apexInfantry:    "Apex Infantry",
  apexCavalry:     "Apex Cavalry",
  apexArcher:      "Apex Archer",
  supremeInfantry: "Supreme Infantry",
  supremeCavalry:  "Supreme Cavalry",
  supremeArcher:   "Supreme Archer",
};

const DISPLAY_ORDER = [
  "Apex Infantry",
  "Apex Cavalry",
  "Apex Archer",
  "Supreme Infantry",
  "Supreme Cavalry",
  "Supreme Archer",
];

const DEFAULT_TROOPS = {
  apexInfantry:    0,
  apexCavalry:     0,
  apexArcher:      0,
  supremeInfantry: 0,
  supremeCavalry:  0,
  supremeArcher:   0,
};

const ADDITIONAL_OPTIONS = [0, ...Array.from({ length: 10 }, (_, i) => (i + 1) * 3000)];

function fmt(n) { return Math.round(n).toLocaleString(); }

function sortedTroops(troopMap) {
  const result = {};
  for (const name of DISPLAY_ORDER) {
    if (troopMap[name] && troopMap[name] > 0) result[name] = troopMap[name];
  }
  for (const [name, qty] of Object.entries(troopMap)) {
    if (!result[name] && qty > 0) result[name] = qty;
  }
  return result;
}

function calculateFormations(troops, marchSize, numMain, numToken) {
  const pool = { ...troops };

  function deduct(key, amt) {
    const v = Math.min(pool[key], Math.max(0, Math.round(amt)));
    pool[key] -= v;
    return v;
  }

  function poolTotal() {
    return Object.values(pool).reduce((a, b) => a + b, 0);
  }

  function fill(troopMap, targetSize) {
    const fillOrder = [
      "apexInfantry", "apexCavalry", "apexArcher",
      "supremeInfantry", "supremeCavalry", "supremeArcher",
    ];
    let used = Object.values(troopMap).reduce((a, b) => a + b, 0);
    for (const k of fillOrder) {
      if (used >= targetSize) break;
      const got = deduct(k, targetSize - used);
      if (got > 0) {
        troopMap[LABEL_MAP[k]] = (troopMap[LABEL_MAP[k]] || 0) + got;
        used += got;
      }
    }
  }

  // ── Archer reserve for all non-Chenko formations ──────────────────────────
  const totalFormations           = numMain + numToken + 1;
  const formationsNeedingReserve  = totalFormations - 1;
  const archerReservePerFormation = Math.round(marchSize * 0.05);
  const totalArchersAvailable     = pool.apexArcher + pool.supremeArcher;

  const actualReservePerFormation = Math.min(
    archerReservePerFormation,
    Math.floor(totalArchersAvailable / totalFormations)
  );

  const totalReserve = actualReservePerFormation * formationsNeedingReserve;
  const supReserve   = deduct("supremeArcher", Math.min(pool.supremeArcher, totalReserve));
  const apexReserve  = deduct("apexArcher",    Math.max(0, totalReserve - supReserve));

  const perFormationApex    = formationsNeedingReserve > 0
    ? Math.floor(apexReserve    / formationsNeedingReserve) : 0;
  const perFormationSupreme = formationsNeedingReserve > 0
    ? Math.floor(supReserve / formationsNeedingReserve) : 0;

  let reserveDrawsLeft = formationsNeedingReserve;

  function takeReservedArchers() {
    if (reserveDrawsLeft <= 0) return { apex: 0, supreme: 0 };
    reserveDrawsLeft--;
    return { apex: perFormationApex, supreme: perFormationSupreme };
  }

  const formations = [];

  // ── Main joins (hero marches) — capped at marchSize ──────────────────────
  for (let i = 0; i < numMain; i++) {
    const t    = {};
    const hero = ["Chenko", "Amane", "Yeonwoo"][i] || null;

    if (i === 0) {
      // Chenko: 10% inf / 10% cav / 80% archer
      const inf  = deduct("apexInfantry", Math.round(marchSize * 0.10));
      const cav  = deduct("apexCavalry",  Math.round(marchSize * 0.10));
      const arch = deduct("apexArcher",   marchSize - inf - cav);
      if (inf  > 0) t["Apex Infantry"] = inf;
      if (cav  > 0) t["Apex Cavalry"]  = cav;
      if (arch > 0) t["Apex Archer"]   = arch;
      fill(t, marchSize);
    } else {
      // Amane / Yeonwoo: reserved archers first, then archer-heavy
      const reserved = takeReservedArchers();
      if (reserved.apex    > 0) t["Apex Archer"]    = (t["Apex Archer"]    || 0) + reserved.apex;
      if (reserved.supreme > 0) t["Supreme Archer"] = (t["Supreme Archer"] || 0) + reserved.supreme;
      const usedSoFar = reserved.apex + reserved.supreme;

      const remaining  = numMain - i;
      const availArch  = pool.apexArcher + pool.supremeArcher;
      const archTarget = Math.min(
        Math.floor(availArch / remaining),
        Math.round(marchSize * 0.75)
      );
      const extraApexA = deduct("apexArcher",    Math.min(pool.apexArcher,    Math.max(0, archTarget - usedSoFar)));
      const extraSupA  = deduct("supremeArcher", Math.max(0, archTarget - usedSoFar - extraApexA));
      if (extraApexA > 0) t["Apex Archer"]    = (t["Apex Archer"]    || 0) + extraApexA;
      if (extraSupA  > 0) t["Supreme Archer"] = (t["Supreme Archer"] || 0) + extraSupA;

      const rest = marchSize - (t["Apex Archer"] || 0) - (t["Supreme Archer"] || 0);
      const inf  = deduct("apexInfantry", Math.round(rest * 0.6));
      const cav  = deduct("apexCavalry",  Math.round(rest * 0.4));
      if (inf > 0) t["Apex Infantry"] = inf;
      if (cav > 0) t["Apex Cavalry"]  = cav;
      fill(t, marchSize);
    }

    formations.push({
      label: `Rally Join ${i + 1}`,
      type: "join",
      hero,
      troops: sortedTroops(t),
    });
  }

  // Return unused archer reserves to pool before token joins
  const unusedReserveApex    = perFormationApex    * reserveDrawsLeft;
  const unusedReserveSupreme = perFormationSupreme * reserveDrawsLeft;
  pool.apexArcher    += unusedReserveApex;
  pool.supremeArcher += unusedReserveSupreme;
  reserveDrawsLeft = 0;

  // ── Token joins — each capped at marchSize, same as main joins & lead ─────
  for (let i = 0; i < numToken; i++) {
    const t        = {};
    const available = Math.min(marchSize, poolTotal());

    // Keep marchSize worth of troops reserved for the lead before filling token
    const reservedForLead = Math.min(marchSize, poolTotal());
    const canUse          = Math.max(0, poolTotal() - reservedForLead + available);
    const thisSize        = Math.min(marchSize, Math.max(0, poolTotal() - marchSize));

    if (thisSize > 0) {
      // 5% archers, rest split infantry / cavalry from supreme pool
      const archerSlice = Math.round(thisSize * 0.05);
      const supA = deduct("supremeArcher", Math.min(pool.supremeArcher, archerSlice));
      const apxA = deduct("apexArcher",    Math.min(pool.apexArcher,    Math.max(0, archerSlice - supA)));
      if (apxA > 0) t["Apex Archer"]    = apxA;
      if (supA > 0) t["Supreme Archer"] = supA;

      const rest = thisSize - (apxA + supA);
      const inf  = deduct("supremeInfantry", Math.min(pool.supremeInfantry, Math.round(rest * 0.5)));
      const cav  = deduct("supremeCavalry",  Math.max(0, rest - inf));
      if (inf > 0) t["Supreme Infantry"] = inf;
      if (cav > 0) t["Supreme Cavalry"]  = cav;
      fill(t, thisSize);
    }

    formations.push({
      label: `Rally Join ${numMain + i + 1}`,
      type: "token",
      hero: null,
      troops: sortedTroops(t),
    });
  }

  // ── Rally Lead — fill up to marchSize ─────────────────────────────────────
  const leadTroops = {};
  const fillOrder  = [
    "apexInfantry", "apexCavalry", "apexArcher",
    "supremeInfantry", "supremeCavalry", "supremeArcher",
  ];
  let leadUsed = 0;
  for (const k of fillOrder) {
    if (leadUsed >= marchSize) break;
    const got = deduct(k, marchSize - leadUsed);
    if (got > 0) {
      leadTroops[LABEL_MAP[k]] = (leadTroops[LABEL_MAP[k]] || 0) + got;
      leadUsed += got;
    }
  }

  formations.push({
    label: "Rally Lead",
    type: "lead",
    hero: null,
    troops: sortedTroops(leadTroops),
  });

  return formations;
}

export default function App() {
  const [troops,          setTroops]          = useState(DEFAULT_TROOPS);
  const [marchSize,       setMarchSize]       = useState(138710);
  const [additionalMarch, setAdditionalMarch] = useState(0);
  const [mainMarches,     setMainMarches]     = useState(3);
  const [tokenMarches,    setTokenMarches]    = useState(3);
  const [formations,      setFormations]      = useState(null);

  const effectiveMarch = marchSize + additionalMarch;

  const totalTroops   = Object.values(troops).reduce((a, b) => a + b, 0);
  const totalMarches  = mainMarches + tokenMarches + 1;
  const deployedTotal = formations
    ? formations.reduce((a, f) => a + Object.values(f.troops).reduce((b, v) => b + v, 0), 0)
    : 0;
  const undeployed = totalTroops - deployedTotal;

  const C = {
    join:  { bg: "#1a2a1a", border: "#2d5a2d", badge: "#3d7a3d", text: "#7dba7d" },
    token: { bg: "#1a1a2a", border: "#2d2d5a", badge: "#3d3d7a", text: "#7d7dba" },
    lead:  { bg: "#2a1a0a", border: "#5a3a0a", badge: "#8a5a0a", text: "#e8a020" },
  };
  const heroColors = ["#e8a020", "#20a0e8", "#a020e8"];

  const inp = {
    width: "100%", background: "#161b22", border: "1px solid #2a3040",
    borderRadius: 6, padding: "7px 10px", color: "#e0d8c8",
    fontSize: 14, boxSizing: "border-box",
  };

  const sel = {
    width: "100%", background: "#161b22", border: "1px solid #2a3040",
    borderRadius: 6, padding: "7px 10px", color: "#e0d8c8",
    fontSize: 14, boxSizing: "border-box", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c8a040' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 30,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0d8c8", fontFamily: "'Georgia',serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#6a5a3a", marginBottom: 6, textTransform: "uppercase" }}>⚔ Battle Planner ⚔</div>
        <h1 style={{ fontSize: 26, fontWeight: "bold", margin: 0, background: "linear-gradient(135deg,#e8c060,#c8a040)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Troop Formation Calculator
        </h1>
        <div style={{ fontSize: 12, color: "#5a4a2a", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span>Total Troops:</span>
          <span style={{ color: "#c8a040", fontSize: 14, fontWeight: "bold" }}>{fmt(totalTroops)}</span>
        </div>
      </div>

      {/* Troop Counts */}
      <div style={{ background: "#0f1318", border: "1px solid #2a2010", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 12, textTransform: "uppercase" }}>Troop Counts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TROOP_TYPES.map(t => (
            <div key={t.key}>
              <div style={{ fontSize: 10, color: t.tier === "apex" ? "#c8a040" : "#7a9ab0", marginBottom: 3, letterSpacing: 1 }}>{t.label.toUpperCase()}</div>
              <input type="number" value={troops[t.key] || ""} placeholder="0"
                onChange={e => setTroops(p => ({ ...p, [t.key]: parseInt(e.target.value) || 0 }))}
                style={inp} />
            </div>
          ))}
        </div>
      </div>

      {/* March Settings */}
      <div style={{ background: "#0f1318", border: "1px solid #2a2010", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 12, textTransform: "uppercase" }}>March Settings</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>MARCH SIZE</div>
            <input
              type="number"
              value={marchSize || ""}
              placeholder="0"
              onChange={e => setMarchSize(parseInt(e.target.value) || 0)}
              style={inp}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>ADDITIONAL MARCH SIZE</div>
            <select
              value={additionalMarch}
              onChange={e => setAdditionalMarch(parseInt(e.target.value))}
              style={sel}
            >
              {ADDITIONAL_OPTIONS.map(v => (
                <option key={v} value={v} style={{ color: v === 30000 ? "#20e8b0" : "#e0d8c8" }}>
                  {v === 0 ? "None" : fmt(v)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {additionalMarch > 0 && (
          <div style={{ marginBottom: 12, fontSize: 11, color: "#5a4a2a", textAlign: "right" }}>
            Effective march size: <span style={{ color: "#c8a040", fontWeight: "bold" }}>{fmt(effectiveMarch)}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#3d7a3d", marginBottom: 3, letterSpacing: 1 }}>MAIN JOINS (w/ heroes)</div>
            <input type="number" min={1} max={3} value={mainMarches}
              onChange={e => setMainMarches(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#3d3d7a", marginBottom: 3, letterSpacing: 1 }}>TOKEN JOINS</div>
            <input type="number" min={0} max={10} value={tokenMarches}
              onChange={e => setTokenMarches(Math.max(0, parseInt(e.target.value) || 0))} style={inp} />
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: "#5a4a2a", textAlign: "center" }}>
          Total marches: <span style={{ color: "#c8a040" }}>{totalMarches}</span> (incl. 1 rally lead)
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={() => setFormations(calculateFormations(troops, effectiveMarch, mainMarches, tokenMarches))}
        style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#8a6010,#c8a040)", color: "#0a0c0f", fontWeight: "bold", fontSize: 15, letterSpacing: 1, cursor: "pointer", marginBottom: 20, fontFamily: "'Georgia',serif" }}>
        ⚔ CALCULATE FORMATIONS
      </button>

      {/* Results */}
      {formations && (
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 14, textTransform: "uppercase", textAlign: "center" }}>— Formation Results —</div>

          {formations.map((f, idx) => {
            const c     = C[f.type];
            const total = Object.values(f.troops).reduce((a, b) => a + b, 0);
            const hi    = ["Chenko", "Amane", "Yeonwoo"].indexOf(f.hero);
            return (
              <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "bold", fontSize: 14, color: c.text }}>{f.label}</span>
                    {f.hero    && <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: heroColors[hi] || "#fff" }}>{f.hero}</span>}
                    {f.type === "token" && <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: "#9090d0" }}>TOKEN</span>}
                    {f.type === "lead"  && <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: "#e8a020" }}>LEAD</span>}
                  </div>
                  <span style={{ fontSize: 13, color: c.text, fontWeight: "bold" }}>{fmt(total)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 8 }}>
                  {Object.entries(f.troops).map(([name, qty]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, color: name.includes("Apex") ? "#c8a040" : "#8a9aaa" }}>
                      <span>{name}</span>
                      <span style={{ fontWeight: "bold" }}>{fmt(qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Summary */}
          <div style={{ background: "#12100a", border: "1px solid #3a2a10", borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 10, textTransform: "uppercase" }}>Summary</div>
            {[
              ["Troops deployed", fmt(deployedTotal), "#c8a040"],
              ["Total available", fmt(totalTroops),   "#c8a040"],
              ["Undeployed",      fmt(undeployed) + (undeployed === 0 ? " ✓" : ""), undeployed === 0 ? "#4aba4a" : "#e87020"],
            ].map(([label, value, col]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#8a7a5a" }}>{label}</span>
                <span style={{ fontWeight: "bold", color: col }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
