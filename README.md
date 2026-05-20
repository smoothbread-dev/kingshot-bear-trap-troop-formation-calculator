# ⚔️ Kingshot Bear Trap Troop Formation Calculator

A mobile-friendly React app that helps Kingshot alliance members plan and distribute troops across rally formations — including hero joins, token joins, and the rally lead — without going over march capacity.

🌐 **Live App:** <a href="https://smoothbread-dev.github.io/kingshot-bear-trap-troop-formation-calculator/" target="_blank" rel="noopener noreferrer">Open Calculator</a>

---

## 🚀 Features

- **Troop input** for all 6 troop types (Apex & Supreme: Infantry, Cavalry, Archer)
- **Main joins** (up to 3, assigned to Chenko, Amane, Yeonwoo) with hero-optimized compositions
- **Token joins** (up to 10) each capped at the same march size as main joins and the lead
- **Rally Lead** formation always filled last and guaranteed its full march size
- **Archer reserve logic** pre-allocates archers across all non-Chenko formations
- **Undeployed troop tracking** so no troops are left behind accidentally
- **Dark fantasy UI** styled for readability on mobile screens

---

## 🛠️ Tech Stack

- [React](https://react.dev/) (with Hooks)
- [Vite](https://vitejs.dev/) for fast dev/build
- Inline styles only — no CSS framework dependencies

---

## 🧮 How It Works

1. **Enter your troop counts** for each type across Apex and Supreme tiers.
2. **Set your march size**.
3. **Choose how many main joins** (hero marches, 1–3) and **token joins** (0–10) you want.
4. Hit **⚔ CALCULATE FORMATIONS** and the app will:
   - Fill Chenko's march with ~80% Apex Archers
   - Distribute remaining archers fairly across Amane, Yeonwoo, and token joins
   - Cap formations (main and lead) at the same effective march size
   - Reserve the lead's full march size before allocating token joins
   - Show undeployed troops in the summary
