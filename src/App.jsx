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

const HERO_RATIO    = { infantry: 1, cavalry: 10, archer: 89 };

const SAVAGE_ADVANTAGE_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 3000);

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
//  REMINDER BANNER COMPONENT
// ─────────────────────────────────────────────

function ReminderBanner({ onDismiss }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1200, #2a1e00)",
      border: "1px solid #6a4a00",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1.3 }}>🐾</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#e8a020", marginBottom: 3, letterSpacing: 0.5 }}>
            Pre-Battle Reminder
          </div>
          <div style={{ fontSize: 11, color: "#b08030", lineHeight: 1.5 }}>
            Activate <strong style={{ color: "#e8c060" }}>all pet skills</strong> before Bear Trap begins to maximize your damage output.
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#6a4a00",
          fontSize: 16,
          cursor: "pointer",
          padding: "0 2px",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 2,
        }}
        aria-label="Dismiss reminder"
      >
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  REMINDER INLINE COMPONENT
// ─────────────────────────────────────────────

function ReminderInline({ onDismiss }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1200, #2a1e00)",
      border: "1px solid #6a4a00",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1.3 }}>⚔️</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#e8a020", marginBottom: 3, letterSpacing: 0.5 }}>
            Ready to calculate?
          </div>
          <div style={{ fontSize: 11, color: "#b08030", lineHeight: 1.5 }}>
            Double-check that <strong style={{ color: "#e8c060" }}>all pet skills are active</strong> before launching Bear Trap — don't leave damage on the table!
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#6a4a00",
          fontSize: 16,
          cursor: "pointer",
          padding: "0 2px",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 2,
        }}
        aria-label="Dismiss reminder"
      >
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  CORE CALCULATION
// ─────────────────────────────────────────────

function calculateFormations(troops, baseMarchSize, savageAdvantage, tokenCount, tokenMarchSize) {
  const effectiveMarch = baseMarchSize + savageAdvantage;

  const pool = { ...troops };

  function deduct(key, amt) {
    const v = Math.min(pool[key], Math.max(0, Math.round(amt)));
    pool[key] -= v;
    return v;
  }

  // ── Ratio-based deduction with graceful degradation, archers prioritised ──
  function deductByRatio(marchSize, ratioMap) {
    const t = {};

    // ── Step A: Attempt archers first (highest priority) ──
    const archerTarget = Math.round(marchSize * ratioMap.archer / 100);

    const archApex = deduct("apexArcher", archerTarget);
    if (archApex > 0) t["Apex Archer"] = archApex;

    const archSupTarget = Math.max(0, archerTarget - archApex);
    const archSup = deduct("supremeArcher", archSupTarget);
    if (archSup > 0) t["Supreme Archer"] = archSup;
    
    // ── Step B: Cavalry ──
    const cavTarget = Math.round(marchSize * ratioMap.cavalry / 100);

    const cavApex = deduct("apexCavalry", cavTarget);
    if (cavApex > 0) t["Apex Cavalry"] = cavApex;

    const cavSupTarget = Math.max(0, cavTarget - cavApex);
    const cavSup = deduct("supremeCavalry", cavSupTarget);
    if (cavSup > 0) t["Supreme Cavalry"] = cavSup;

    // ── Step C: Infantry ──
    const infTarget = Math.round(marchSize * ratioMap.infantry / 100);

    const infApex = deduct("apexInfantry", infTarget);
    if (infApex > 0) t["Apex Infantry"] = infApex;

    const infSupTarget = Math.max(0, infTarget - infApex);
    const infSup = deduct("supremeInfantry", infSupTarget);
    if (infSup > 0) t["Supreme Infantry"] = infSup;

    // ── Step D: Fill remaining slots — archers first, then cav, then inf ──
    const allocated = Object.values(t).reduce((a, b) => a + b, 0);
    let slotsLeft = marchSize - allocated;

    if (slotsLeft > 0) {
      // Try to fill with more archers first
      const extraArchApex = deduct("apexArcher", slotsLeft);
      if (extraArchApex > 0) {
        t["Apex Archer"] = (t["Apex Archer"] || 0) + extraArchApex;
        slotsLeft -= extraArchApex;
      }
    }

    if (slotsLeft > 0) {
      const extraArchSup = deduct("supremeArcher", slotsLeft);
      if (extraArchSup > 0) {
        t["Supreme Archer"] = (t["Supreme Archer"] || 0) + extraArchSup;
        slotsLeft -= extraArchSup;
      }
    }

    if (slotsLeft > 0) {
      const extraCavApex = deduct("apexCavalry", slotsLeft);
      if (extraCavApex > 0) {
        t["Apex Cavalry"] = (t["Apex Cavalry"] || 0) + extraCavApex;
        slotsLeft -= extraCavApex;
      }
    }

    if (slotsLeft > 0) {
      const extraCavSup = deduct("supremeCavalry", slotsLeft);
      if (extraCavSup > 0) {
        t["Supreme Cavalry"] = (t["Supreme Cavalry"] || 0) + extraCavSup;
        slotsLeft -= extraCavSup;
      }
    }

    if (slotsLeft > 0) {
      const extraInfApex = deduct("apexInfantry", slotsLeft);
      if (extraInfApex > 0) {
        t["Apex Infantry"] = (t["Apex Infantry"] || 0) + extraInfApex;
        slotsLeft -= extraInfApex;
      }
    }

    if (slotsLeft > 0) {
      const extraInfSup = deduct("supremeInfantry", slotsLeft);
      if (extraInfSup > 0) {
        t["Supreme Infantry"] = (t["Supreme Infantry"] || 0) + extraInfSup;
        slotsLeft -= extraInfSup;
      }
    }

    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { troops: sortedTroops(t), total };
  }

  // ── Even token split — Supreme Archers guaranteed, Apex Archers never touched ──
  function deductEvenTokenSplit(shareSize, poolSnapshot, snapshotTotal) {
    const cap = tokenMarchSize > 0 ? Math.min(shareSize, tokenMarchSize) : shareSize;

    if (cap <= 0 || snapshotTotal === 0) {
      return { troops: {}, total: 0, filled: 0 };
    }

    const t    = {};
    const keys = [
      "apexInfantry", "apexCavalry",
      "supremeInfantry", "supremeCavalry", "supremeArcher",
      // Note: apexArcher intentionally excluded — never touched by tokens
    ];

    // ── Guarantee Supreme Archers first ──
    const supArchShare = Math.floor(
      cap * (poolSnapshot.supremeArcher / snapshotTotal)
    );
    const gotSupArch = deduct("supremeArcher", supArchShare);
    if (gotSupArch > 0) t["Supreme Archer"] = gotSupArch;

    let slotsLeft = cap - gotSupArch;

    // ── Spread remaining slots proportionally across non-archer types ──
    const nonArcherKeys = [
      "apexInfantry", "apexCavalry",
      "supremeInfantry", "supremeCavalry",
    ];
    const nonArcherTotal = nonArcherKeys.reduce(
      (a, k) => a + (pool[k] || 0), 0
    );

    if (slotsLeft > 0 && nonArcherTotal > 0) {
      const raws   = {};
      const allocs = {};
      let floorSum = 0;

      for (const k of nonArcherKeys) {
        raws[k]   = slotsLeft * (pool[k] / nonArcherTotal);
        allocs[k] = Math.floor(raws[k]);
        floorSum += allocs[k];
      }

      let gap = slotsLeft - floorSum;
      const sorted = nonArcherKeys
        .map(k => ({ k, frac: raws[k] - allocs[k] }))
        .sort((a, b) => b.frac - a.frac);
      for (let i = 0; i < gap; i++) allocs[sorted[i % nonArcherKeys.length].k]++;

      for (const k of nonArcherKeys) {
        const got = deduct(k, allocs[k]);
        if (got > 0) t[LABEL_MAP[k]] = (t[LABEL_MAP[k]] || 0) + got;
      }
    }

    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { troops: sortedTroops(t), total, filled: total };
  }

  const formations = [];

  // ── STEP 1: Chenko ──
  const chenkoResult = deductByRatio(effectiveMarch, HERO_RATIO);
  formations.push({
    label:         "Rally Join 1",
    type:          "join",
    hero:          "Chenko",
    preset:        "RATIO",
    ratioLabel:    "1% Inf / 10% Cav / 89% Arch",
    effectiveMarch,
    baseMarch:     baseMarchSize,
    troops:        chenkoResult.troops,
    total:         chenkoResult.total,
  });

  // ── STEP 2: Yeonwoo ──
  const yeonwooResult = deductByRatio(effectiveMarch, HERO_RATIO);
  formations.push({
    label:      "Rally Join 2",
    type:       "join",
    hero:       "Yeonwoo",
    preset:     "RATIO",
    ratioLabel: "1% Inf / 10% Cav / 89% Arch",
    effectiveMarch,
    baseMarch:  baseMarchSize,
    troops:     yeonwooResult.troops,
    total:      yeonwooResult.total,
  });

  // ── STEP 3: Amane ──
  const amaneResult = deductByRatio(effectiveMarch, HERO_RATIO);
  formations.push({
    label:      "Rally Join 3",
    type:       "join",
    hero:       "Amane",
    preset:     "RATIO",
    ratioLabel: "1% Inf / 10% Cav / 89% Arch",
    effectiveMarch,
    baseMarch:  baseMarchSize,
    troops:     amaneResult.troops,
    total:      amaneResult.total,
  });

  // ── STEP 4: Token Joins ──
  // Tokens take whatever Supreme Archers remain — no upfront reservation
  // Apex Archers are never touched by token joins
  const tokenPoolSnapshot  = { ...pool };
  // Exclude Apex Archers from snapshot total so they are never allocated
  const tokenSnapshotTotal =
    pool.apexInfantry +
    pool.apexCavalry  +
    pool.supremeInfantry +
    pool.supremeCavalry  +
    pool.supremeArcher;

  const shareSize = tokenCount > 0
    ? Math.floor(tokenSnapshotTotal / tokenCount)
    : 0;

  for (let i = 0; i < tokenCount; i++) {
    const isLast    = i === tokenCount - 1;
    const remaining =
      pool.apexInfantry +
      pool.apexCavalry  +
      pool.supremeInfantry +
      pool.supremeCavalry  +
      pool.supremeArcher;
    const thisShare = isLast ? Math.max(0, remaining) : shareSize;

    const tokenResult = deductEvenTokenSplit(
      thisShare,
      tokenPoolSnapshot,
      tokenSnapshotTotal
    );
    formations.push({
      label:          `Token Join ${i + 1}`,
      type:           "token",
      hero:           null,
      preset:         "QUANTITY",
      baseMarch:      baseMarchSize,
      tokenMarchSize: tokenMarchSize,
      troops:         tokenResult.troops,
      total:          tokenResult.total,
      filled:         tokenResult.filled,
    });
  }

  const remaining = { ...pool };
  return { formations, remaining };
}

// ─────────────────────────────────────────────
//  APP COMPONENT
// ─────────────────────────────────────────────

export default function App() {
  const [troops,            setTroops]            = useState(DEFAULT_TROOPS);
  const [baseMarch,         setBaseMarch]         = useState(0);
  const [savageAdvantage,   setSavageAdvantage]   = useState(0);
  const [tokenCount,        setTokenCount]        = useState(0);
  const [tokenMarch,        setTokenMarch]        = useState(0);
  const [result,            setResult]            = useState(null);
  const [showTopReminder,   setShowTopReminder]   = useState(true);
  const [showInlineReminder, setShowInlineReminder] = useState(true);

  const totalTroops    = Object.values(troops).reduce((a, b) => a + b, 0);
  const effectiveMarch = baseMarch + savageAdvantage;

  const deployedTotal = result
    ? result.formations.reduce((a, f) => a + f.total, 0)
    : 0;
  const undeployed = totalTroops - deployedTotal;

  const C = {
    join:  { bg: "#1a2a1a", border: "#2d5a2d", badge: "#3d7a3d", text: "#7dba7d" },
    token: { bg: "#1a1a2a", border: "#2d2d5a", badge: "#3d3d7a", text: "#7d7dba" },
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
    const res = calculateFormations(troops, baseMarch, savageAdvantage, tokenCount, tokenMarch);
    setResult(res);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0c0f", color: "#e0d8c8",
      fontFamily: "'Georgia', serif", padding: "20px 16px",
    }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
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

      {/* ── Top Reminder Banner ── */}
      {showTopReminder && (
        <ReminderBanner onDismiss={() => setShowTopReminder(false)} />
      )}

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

        {/* Base March */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>BASE MARCH SIZE</div>
          <div style={{ fontSize: 9, color: "#5a4a2a", marginBottom: 4 }}>Include Fearless Roar bonus if active</div>
          <input
            type="number"
            value={baseMarch || ""}
            placeholder="0"
            onChange={e => setBaseMarch(parseInt(e.target.value) || 0)}
            style={inp}
          />
        </div>

        {/* Savage Advantage */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 3, letterSpacing: 1 }}>SAVAGE ADVANTAGE</div>
          <div style={{ fontSize: 9, color: "#5a4a2a", marginBottom: 4 }}>Master Valora's Skill — applies to all ratio marches</div>
          <select
            value={savageAdvantage}
            onChange={e => setSavageAdvantage(parseInt(e.target.value) || 0)}
            style={selectStyle}
          >
            {SAVAGE_ADVANTAGE_OPTIONS.map(opt => (
              <option key={opt} value={opt} style={{ background: "#161b22" }}>
                {opt === 0 ? "+0 (None)" : `+${fmt(opt)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Effective March Breakdown */}
        <div style={{ fontSize: 11, color: "#5a4a2a", textAlign: "center", marginBottom: 16 }}>
          Effective march (all ratio marches):{" "}
          <span style={{ color: "#c8a040", fontWeight: "bold" }}>{fmt(effectiveMarch)}</span>
          {savageAdvantage > 0 && (
            <span style={{ color: "#6a5a3a" }}>
              {" "}({fmt(baseMarch)} + {fmt(savageAdvantage)})
            </span>
          )}
        </div>

        {/* Token Settings */}
        <div style={{ borderTop: "1px solid #2a2010", paddingTop: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#3d3d7a", marginBottom: 10, textTransform: "uppercase" }}>
            Token Join Settings
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            {/* Token Count */}
            <div>
              <div style={{ fontSize: 10, color: "#5a5a8a", marginBottom: 3, letterSpacing: 1 }}>NUMBER OF JOINS</div>
              <div style={{ fontSize: 9, color: "#5a4a2a", marginBottom: 4 }}>0–10 additional joins</div>
              <input
                type="number"
                min={0}
                max={10}
                value={tokenCount || ""}
                placeholder="0"
                onChange={e => setTokenCount(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                style={inp}
              />
            </div>

            {/* Token March Size */}
            <div>
              <div style={{ fontSize: 10, color: "#5a5a8a", marginBottom: 3, letterSpacing: 1 }}>TOKEN MARCH SIZE</div>
              <div style={{ fontSize: 9, color: "#5a4a2a", marginBottom: 4 }}>Hard cap per token join</div>
              <input
                type="number"
                value={tokenMarch || ""}
                placeholder="0"
                onChange={e => setTokenMarch(parseInt(e.target.value) || 0)}
                style={inp}
              />
            </div>

          </div>
        </div>
      </div>

      {/* ── Inline Reminder ── */}
      {showInlineReminder && (
        <ReminderInline onDismiss={() => setShowInlineReminder(false)} />
      )}

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
            const marchCap  = f.type === "token" ? f.tokenMarchSize : f.baseMarch;
            const shortfall = !isRatio && marchCap > 0 ? marchCap - f.filled : 0;

            return (
              <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "bold", fontSize: 14, color: c.text }}>{f.label}</span>

                    {f.hero && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: heroColors[f.hero] || "#fff" }}>
                        {f.hero}
                      </span>
                    )}
                    {f.type === "token" && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: c.badge, borderRadius: 10, color: "#9090d0" }}>TOKEN</span>
                    )}

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

                {isRatio && (
                  <div style={{ fontSize: 10, color: "#6a5a3a", marginBottom: 8, letterSpacing: 0.5 }}>
                    Preset ratio: <span style={{ color: "#c8a040" }}>{f.ratioLabel}</span>
                    {" · "}Effective march: <span style={{ color: "#c8a040" }}>{fmt(f.effectiveMarch)}</span>
                  </div>
                )}

                {f.type === "token" && (
                  <div style={{ fontSize: 10, color: "#6a5a3a", marginBottom: 8, letterSpacing: 0.5 }}>
                    March cap: <span style={{ color: "#c8a040" }}>{f.tokenMarchSize > 0 ? fmt(f.tokenMarchSize) : "None set"}</span>
                    {" · "}Even split of remaining pool · Includes reserved Supreme Archers
                  </div>
                )}

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

                {shortfall > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#e87020", background: "#2a1500", border: "1px solid #5a3000", borderRadius: 6, padding: "6px 10px" }}>
                    ⚠️ Pool ran short by {fmt(shortfall)} troops — march will not be full.
                  </div>
                )}

                {isRatio && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#4a8a4a", background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 6, padding: "6px 10px" }}>
                    💡 Save as a <strong>Ratio preset</strong> in-game. Quantities shown are previews at effective march size ({fmt(f.effectiveMarch)}).
                  </div>
                )}

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
              ["Troops deployed",  fmt(deployedTotal),                                                        "#c8a040"],
              ["Total available",  fmt(totalTroops),                                                          "#c8a040"],
              ["Undeployed",       fmt(undeployed) + (undeployed === 0 ? " ✓" : ""),                         undeployed === 0 ? "#4aba4a" : "#e87020"],
              ["Base march size",  fmt(baseMarch),                                                            "#c8a040"],
              ["Savage Advantage", savageAdvantage > 0 ? `+${fmt(savageAdvantage)}` : "None",                savageAdvantage > 0 ? "#c8a040" : "#5a4a2a"],
              ["Effective march",  fmt(effectiveMarch),                                                       "#c8a040"],
              ["Token joins",      tokenCount > 0 ? String(tokenCount) : "None",                             tokenCount > 0 ? "#c8a040" : "#5a4a2a"],
              ["Token march cap",  tokenCount > 0 && tokenMarch > 0 ? fmt(tokenMarch) : "None",             tokenCount > 0 && tokenMarch > 0 ? "#c8a040" : "#5a4a2a"],
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
