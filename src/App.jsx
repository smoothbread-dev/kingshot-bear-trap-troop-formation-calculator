// Rally Formation Planner
import { useState } from "react";

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────

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

// Chenko preset: 10% Infantry / 10% Cavalry / 80% Archer
const CHENKO_RATIO = { infantry: 10, cavalry: 10, archer: 80 };

// Lead preset: 45% Infantry / 45% Cavalry / 10% Archer
const LEAD_RATIO = { infantry: 45, cavalry: 45, archer: 10 };

// Bonus march options (0 to 30000, step 3000)
const BONUS_MARCH_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 3000);

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function fmt(n) {
  return Math.round(n).toLocaleString();
}

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

// ─────────────────────────────────────────────
//  CORE CALCULATION
// ─────────────────────────────────────────────

function calculateFormations(troops, baseMarchSize, bonusMarch, tokenCount) {
  const effectiveMarch = baseMarchSize + bonusMarch;

  // Mutable pool
  const pool = { ...troops };

  function deduct(key, amt) {
    const v = Math.min(pool[key], Math.max(0, Math.round(amt)));
    pool[key] -= v;
    return v;
  }

  function poolTotal() {
    return Object.values(pool).reduce((a, b) => a + b, 0);
  }

  // ── Deduct by ratio (Apex first, then Supreme) ──
  function deductByRatio(marchSize, ratioMap) {
    const t = {};

    // Infantry
    const infApex = deduct("apexInfantry",    Math.round(marchSize * ratioMap.infantry / 100));
    const infSup  = deduct("supremeInfantry", Math.max(0, Math.round(marchSize * ratioMap.infantry / 100) - infApex));
    if (infApex > 0) t["Apex Infantry"]    = (t["Apex Infantry"]    || 0) + infApex;
    if (infSup  > 0) t["Supreme Infantry"] = (t["Supreme Infantry"] || 0) + infSup;

    // Cavalry
    const cavApex = deduct("apexCavalry",    Math.round(marchSize * ratioMap.cavalry / 100));
    const cavSup  = deduct("supremeCavalry", Math.max(0, Math.round(marchSize * ratioMap.cavalry / 100) - cavApex));
    if (cavApex > 0) t["Apex Cavalry"]    = (t["Apex Cavalry"]    || 0) + cavApex;
    if (cavSup  > 0) t["Supreme Cavalry"] = (t["Supreme Cavalry"] || 0) + cavSup;

    // Archer
    const archApex = deduct("apexArcher",    Math.round(marchSize * ratioMap.archer / 100));
    const archSup  = deduct("supremeArcher", Math.max(0, Math.round(marchSize * ratioMap.archer / 100) - archApex));
    if (archApex > 0) t["Apex Archer"]    = (t["Apex Archer"]    || 0) + archApex;
    if (archSup  > 0) t["Supreme Archer"] = (t["Supreme Archer"] || 0) + archSup;

    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { troops: sortedTroops(t), total };
  }

  // ── Deduct archer-heavy by quantity (Apex Archers prioritized) ──
  // Takes as many Apex Archers as possible up to marchSize,
  // then fills remaining slots proportionally from the rest of the pool
  // Supreme Archers are protected (already reserved) so not touched here
  function deductArcherHeavy(marchSize) {
    const t = {};

    // Step 1: Take all available Apex Archers up to marchSize
    const apexArchersAvailable = pool.apexArcher;
    const apexArchersTaken     = deduct("apexArcher", Math.min(apexArchersAvailable, marchSize));
    if (apexArchersTaken > 0) t["Apex Archer"] = apexArchersTaken;

    const slotsRemaining = marchSize - apexArchersTaken;

    if (slotsRemaining <= 0) {
      const total = Object.values(t).reduce((a, b) => a + b, 0);
      return { troops: sortedTroops(t), total, filled: total };
    }

    // Step 2: Fill remaining slots proportionally from non-apex-archer pool
    // Pool at this point: apexInfantry, apexCavalry, supremeInfantry, supremeCavalry
    // (supremeArcher is reserved and untouched)
    const fillKeys = ["apexInfantry", "apexCavalry", "supremeInfantry", "supremeCavalry"];
    const fillPool  = fillKeys.reduce((a, k) => a + pool[k], 0);

    if (fillPool === 0) {
      const total = Object.values(t).reduce((a, b) => a + b, 0);
      return { troops: sortedTroops(t), total, filled: total };
    }

    const canFill = Math.min(slotsRemaining, fillPool);

    // Floor pass — proportional allocation
    const raws   = {};
    const allocs = {};
    let floorSum = 0;
    for (const k of fillKeys) {
      raws[k]   = canFill * pool[k] / fillPool;
      allocs[k] = Math.floor(raws[k]);
      floorSum += allocs[k];
    }

    // Distribute remainder by largest fractional part
    let gap = canFill - floorSum;
    const sorted = fillKeys
      .map(k => ({ k, frac: raws[k] - allocs[k] }))
      .sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < gap; i++) allocs[sorted[i % fillKeys.length].k]++;

    // Deduct and record
    for (const k of fillKeys) {
      const got = deduct(k, allocs[k]);
      if (got > 0) t[LABEL_MAP[k]] = (t[LABEL_MAP[k]] || 0) + got;
    }

    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { troops: sortedTroops(t), total, filled: total };
  }

  // ── Even split of remaining pool across token joins ──
  // Takes a snapshot of the pool, divides evenly, each token gets
  // a proportional share of that snapshot — intentionally not full
  function deductEvenTokenSplit(shareSize, poolSnapshot, snapshotTotal) {
    if (shareSize <= 0 || snapshotTotal === 0) {
      return { troops: {}, total: 0, filled: 0 };
    }

    const t    = {};
    const keys = [
      "apexInfantry", "apexCavalry", "apexArcher",
      "supremeInfantry", "supremeCavalry", "supremeArcher",
    ];

    // Floor pass — proportional to snapshot
    const raws   = {};
    const allocs = {};
    let floorSum = 0;
    for (const k of keys) {
      raws[k]   = shareSize * (poolSnapshot[k] / snapshotTotal);
      allocs[k] = Math.floor(raws[k]);
      floorSum += allocs[k];
    }

    // Distribute remainder by largest fractional part
    let gap = shareSize - floorSum;
    const sorted = keys
      .map(k => ({ k, frac: raws[k] - allocs[k] }))
      .sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < gap; i++) allocs[sorted[i % keys.length].k]++;

    // Deduct from live pool
    for (const k of keys) {
      const got = deduct(k, allocs[k]);
      if (got > 0) t[LABEL_MAP[k]] = (t[LABEL_MAP[k]] || 0) + got;
    }

    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { troops: sortedTroops(t), total, filled: total };
  }

  const formations = [];

  // ── STEP 1: Chenko (Join 1) — Ratio 10/10/80 at effectiveMarch ──
  const chenkoResult = deductByRatio(effectiveMarch, CHENKO_RATIO);
  formations.push({
    label:         "Rally Join 1",
    type:          "join",
    hero:          "Chenko",
    preset:        "RATIO",
    ratioLabel:    "10% Inf / 10% Cav / 80% Arch",
    effectiveMarch,
    baseMarch:     baseMarchSize,
    troops:        chenkoResult.troops,
    total:         chenkoResult.total,
  });

  // ── STEP 2: Lead — Ratio 45/45/10 at effectiveMarch ──
  const leadResult = deductByRatio(effectiveMarch, LEAD_RATIO);
  formations.push({
    label:         "Rally Lead",
    type:          "lead",
    hero:          null,
    preset:        "RATIO",
    ratioLabel:    "45% Inf / 45% Cav / 10% Arch",
    effectiveMarch,
    baseMarch:     baseMarchSize,
    troops:        leadResult.troops,
    total:         leadResult.total,
  });

  // ── STEP 3: Pre-reserve Supreme Archers for token joins ──
  // Reserve an equal share of Supreme Archers per token join
  // before distributing to Amane & Yeonwoo
  let reservedSupremePerToken = 0;
  if (tokenCount > 0 && pool.supremeArcher > 0) {
    reservedSupremePerToken = Math.floor(pool.supremeArcher / tokenCount);
    const totalReserved     = reservedSupremePerToken * tokenCount;
    deduct("supremeArcher", totalReserved);
  }

  // ── STEP 4: Amane (Join 2) — Archer-heavy quantity at baseMarch ──
  const amaneResult = deductArcherHeavy(baseMarchSize);
  formations.push({
    label:      "Rally Join 2",
    type:       "join",
    hero:       "Amane",
    preset:     "QUANTITY",
    baseMarch:  baseMarchSize,
    troops:     amaneResult.troops,
    total:      amaneResult.total,
    filled:     amaneResult.filled,
  });

  // ── STEP 5: Yeonwoo (Join 3) — Archer-heavy quantity at baseMarch ──
  const yeonwooResult = deductArcherHeavy(baseMarchSize);
  formations.push({
    label:      "Rally Join 3",
    type:       "join",
    hero:       "Yeonwoo",
    preset:     "QUANTITY",
    baseMarch:  baseMarchSize,
    troops:     yeonwooResult.troops,
    total:      yeonwooResult.total,
    filled:     yeonwooResult.filled,
  });

  // ── STEP 6: Token Joins — Even split of remaining pool ──
  // Return reserved Supreme Archers back to pool before snapshotting
  pool.supremeArcher += reservedSupremePerToken * tokenCount;

  // Snapshot the pool and total ONCE before splitting
  const tokenPoolSnapshot  = { ...pool };
  const tokenSnapshotTotal = poolTotal();
  const shareSize          = tokenCount > 0 ? Math.floor(tokenSnapshotTotal / tokenCount) : 0;

  for (let i = 0; i < tokenCount; i++) {
    const isLast      = i === tokenCount - 1;
    // Last token absorbs any rounding remainder
    const thisShare   = isLast
      ? Math.max(0, poolTotal())
      : shareSize;

    const tokenResult = deductEvenTokenSplit(thisShare, tokenPoolSnapshot, tokenSnapshotTotal);
    formations.push({
      label:      `Token Join ${i + 1}`,
      type:       "token",
      hero:       null,
      preset:     "QUANTITY",
      baseMarch:  baseMarchSize,
      troops:     tokenResult.troops,
      total:      tokenResult.total,
      filled:     tokenResult.filled,
    });
  }

  // Remaining pool snapshot
  const remaining = { ...pool };

  return { formations, remaining };
}

// ─────────────────────────────────────────────
//  APP COMPONENT
// ─────────────────────────────────────────────

export default function App() {
  const [troops,      setTroops]      = useState(DEFAULT_TROOPS);
  const [baseMarch,   setBaseMarch]   = useState(0);
  const [bonusMarch,  setBonusMarch]  = useState(0);
  const [tokenCount,  setTokenCount]  = useState(3);
  const [result,      setResult]      = useState(null);

  const totalTroops    = Object.values(troops).reduce((a, b) => a + b, 0);
  const effectiveMarch = baseMarch + bonusMarch;

  const deployedTotal = result
    ? result.formations.reduce((a, f) => a + f.total, 0)
    : 0;
  const undeployed = totalTroops - deployedTotal;

  // Card color themes
  const C = {
    join:  { bg: "#1a2a1a", border: "#2d5a2d", badge: "#3d7a3d", text: "#7dba7d" },
    token: { bg: "#1a1a2a", border: "#2d2d5a", badge: "#3d3d7a", text: "#7d7dba" },
    lead:  { bg: "#2a1a0a", border: "#5a3a0a", badge: "#8a5a0a", text: "#e8a020" },
  };

  const heroColors = {
    Chenko:  "#e8a020",
    Amane:   "#20a0e8",
    Yeonwoo: "#a020e8",
  };

  const inp = {
    width: "100%", background: "#161b22", border: "1px solid #2a3040",
    borderRadius: 6, padding: "7px 10px", color: "#e0d8c8",
    fontSize: 14, boxSizing: "border-box",
  };

  const selectStyle = {
    ...inp,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  };

  function handleCalculate() {
    if (!baseMarch || baseMarch <= 0) return;
    const res = calculateFormations(troops, baseMarch, bonusMarch, tokenCount);
    setResult(res);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0c0f", color: "#e0d8c8",
      fontFamily: "'Georgia', serif", padding: "20px 16px",
    }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#6a5a3a", marginBottom: 6, textTransform: "uppercase" }}>
          ⚔ Battle Planner ⚔
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: "bold", margin: 0,
          background: "linear-gradient(135deg,#e8c060,#c8a040)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Troop Formation Calculator
        </h1>
        <div style={{ fontSize: 12, color: "#5a4a2a", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span>Total Troops:</span>
          <span style={{ color: "#c8a040", fontSize: 14, fontWeight: "bold" }}>{fmt(totalTroops)}</span>
        </div>
      </div>

      {/* ── Troop Counts ── */}
      <div style={{ background: "#0f1318", border: "1px solid #2a2010", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 12, textTransform: "uppercase" }}>
          Troop Counts
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TROOP_TYPES.map(t => (
            <div key={t.key}>
              <div style={{ fontSize: 10, color: t.tier === "apex" ? "#c8a040" : "#7a9ab0", marginBottom: 3, letterSpacing: 1 }}>
                {t.label.toUpperCase()}
              </div>
              <input
                type="number"
                value={troops[t.key] || ""}
                placeholder="0"
                onChange={e => setTroops(p => ({ ...p, [t.key]: parseInt(e.target.value) || 0 }))}
                style={inp}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── March Settings ── */}
      <div style={{ background: "#0f1318", border: "1px solid #2a2010", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 12, textTransform: "uppercase" }}>
          March Settings
        </div>

        {/* Base March Size */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>BASE MARCH SIZE</div>
          <input
            type="number"
            value={baseMarch || ""}
            placeholder="e.g. 135210"
            onChange={e => setBaseMarch(parseInt(e.target.value) || 0)}
            style={inp}
          />
        </div>

        {/* Bonus March + Token Count */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>
              BONUS MARCH (CHENKO &amp; LEAD)
            </div>
            <select
              value={bonusMarch}
              onChange={e => setBonusMarch(parseInt(e.target.value) || 0)}
              style={selectStyle}
            >
              {BONUS_MARCH_OPTIONS.map(opt => (
                <option key={opt} value={opt} style={{ background: "#161b22" }}>
                  {opt === 0 ? "+0 (No Bonus)" : `+${fmt(opt)}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#3d3d7a", marginBottom: 3, letterSpacing: 1 }}>TOKEN JOINS</div>
            <input
              type="number"
              min={0}
              max={10}
              value={tokenCount}
              onChange={e => setTokenCount(Math.max(0, parseInt(e.target.value) || 0))}
              style={inp}
            />
          </div>
        </div>

        {/* Effective March Info */}
        <div style={{ fontSize: 11, color: "#5a4a2a", textAlign: "center" }}>
          Effective march (Chenko &amp; Lead):{" "}
          <span style={{ color: "#c8a040", fontWeight: "bold" }}>{fmt(effectiveMarch)}</span>
          {bonusMarch > 0 && (
            <span style={{ color: "#6a5a3a" }}> ({fmt(baseMarch)} + {fmt(bonusMarch)})</span>
          )}
        </div>
      </div>

      {/* ── Calculate Button ── */}
      <button
        onClick={handleCalculate}
        style={{
          width: "100%", padding: 13, borderRadius: 10, border: "none",
          background: "linear-gradient(135deg,#8a6010,#c8a040)",
          color: "#0a0c0f", fontWeight: "bold", fontSize: 15,
          letterSpacing: 1, cursor: "pointer", marginBottom: 20,
          fontFamily: "'Georgia', serif",
        }}
      >
        ⚔ CALCULATE FORMATIONS
      </button>

      {/* ── Results ── */}
      {result && (
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 14, textTransform: "uppercase", textAlign: "center" }}>
            — Formation Results —
          </div>

          {result.formations.map((f, idx) => {
            const c         = C[f.type];
            const isRatio   = f.preset === "RATIO";
            const shortfall = !isRatio && f.baseMarch ? f.baseMarch - f.filled : 0;

            return (
              <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>

                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "bold", fontSize: 14, color: c.text }}>{f.label}</span>

                    {/* Hero badge */}
                    {f.hero && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: heroColors[f.hero] || "#fff" }}>
                        {f.hero}
                      </span>
                    )}

                    {/* Type badge */}
                    {f.type === "token" && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: "#9090d0" }}>TOKEN</span>
                    )}
                    {f.type === "lead" && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: "#e8a020" }}>LEAD</span>
                    )}

                    {/* Preset badge */}
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10,
                      background: isRatio ? "#0a2a0a" : "#2a0a0a",
                      color:      isRatio ? "#4aba4a" : "#e84040",
                      border:     `1px solid ${isRatio ? "#2a6a2a" : "#6a2a2a"}`,
                    }}>
                      {isRatio ? "🟢 RATIO" : "🔴 QUANTITY"}
                    </span>
                  </div>

                  <span style={{ fontSize: 13, color: c.text, fontWeight: "bold" }}>{fmt(f.total)}</span>
                </div>

                {/* Ratio label */}
                {isRatio && (
                  <div style={{ fontSize: 10, color: "#6a5a3a", marginBottom: 8, letterSpacing: 0.5 }}>
                    Preset ratio: <span style={{ color: "#c8a040" }}>{f.ratioLabel}</span>
                    {" · "}Effective march: <span style={{ color: "#c8a040" }}>{fmt(f.effectiveMarch)}</span>
                  </div>
                )}

                {/* Quantity label */}
                {!isRatio && f.type !== "token" && (
                  <div style={{ fontSize: 10, color: "#6a5a3a", marginBottom: 8, letterSpacing: 0.5 }}>
                    Saved at base march: <span style={{ color: "#c8a040" }}>{fmt(f.baseMarch)}</span>
                    {" · "}Apex Archers prioritized · No bonus march applied
                  </div>
                )}

                {/* Token label */}
                {f.type === "token" && (
                  <div style={{ fontSize: 10, color: "#6a5a3a", marginBottom: 8, letterSpacing: 0.5 }}>
                    Even split of remaining pool · Intentionally not full · Includes reserved Supreme Archers
                  </div>
                )}

                {/* Troop rows */}
                <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 8 }}>
                  {Object.keys(f.troops).length === 0 ? (
                    <div style={{ fontSize: 12, color: "#5a4a2a", textAlign: "center", padding: "6px 0" }}>
                      No troops available
                    </div>
                  ) : (
                    Object.entries(f.troops).map(([name, qty]) => (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, color: name.includes("Apex") ? "#c8a040" : "#8a9aaa" }}>
                        <span>{name}</span>
                        <span style={{ fontWeight: "bold" }}>{fmt(qty)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Shortfall warning — only for hero joins if pool ran dry */}
                {shortfall > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#e87020", background: "#2a1500", border: "1px solid #5a3000", borderRadius: 6, padding: "6px 10px" }}>
                    ⚠️ Pool ran short by {fmt(shortfall)} troops — march will not be full.
                  </div>
                )}

                {/* Ratio save reminder */}
                {isRatio && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#4a8a4a", background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 6, padding: "6px 10px" }}>
                    💡 Save as a <strong>Ratio preset</strong> in-game. Quantities shown are previews at effective march size.
                  </div>
                )}

                {/* Quantity save reminder */}
                {!isRatio && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#4a4a8a", background: "#0a0a1a", border: "1px solid #2a2a4a", borderRadius: 6, padding: "6px 10px" }}>
                    💡 Save as a <strong>Quantity preset</strong> in-game. Troops locked at exact quantities shown.
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Remaining Pool ── */}
          <div style={{ background: "#0f1318", border: "1px solid #2a2010", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 10, textTransform: "uppercase" }}>
              Remaining Pool
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {TROOP_TYPES.map(t => (
                <div key={t.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #1a1a10" }}>
                  <span style={{ color: t.tier === "apex" ? "#c8a040" : "#7a9ab0" }}>{t.label}</span>
                  <span style={{ fontWeight: "bold", color: result.remaining[t.key] > 0 ? "#e0d8c8" : "#3a3020" }}>
                    {fmt(result.remaining[t.key])}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#8a7a5a" }}>Total remaining</span>
              <span style={{ fontWeight: "bold", color: "#c8a040" }}>
                {fmt(Object.values(result.remaining).reduce((a, b) => a + b, 0))}
              </span>
            </div>
          </div>

          {/* ── Summary ── */}
          <div style={{ background: "#12100a", border: "1px solid #3a2a10", borderRadius: 12, padding: 14, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a5a3a", marginBottom: 10, textTransform: "uppercase" }}>
              Summary
            </div>
            {[
              ["Troops deployed",   fmt(deployedTotal),                                         "#c8a040"],
              ["Total available",   fmt(totalTroops),                                           "#c8a040"],
              ["Undeployed",        fmt(undeployed) + (undeployed === 0 ? " ✓" : ""),          undeployed === 0 ? "#4aba4a" : "#e87020"],
              ["Base march size",   fmt(baseMarch),                                             "#c8a040"],
              ["Bonus march",       bonusMarch > 0 ? `+${fmt(bonusMarch)}` : "None",           bonusMarch > 0 ? "#c8a040" : "#5a4a2a"],
              ["Effective march",   fmt(effectiveMarch),                                        "#c8a040"],
              ["Token joins",       tokenCount > 0 ? String(tokenCount) : "None",              tokenCount > 0 ? "#c8a040" : "#5a4a2a"],
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
