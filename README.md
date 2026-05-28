# ⚔️ Kingshot Bear Trap Troop Formation Calculator

A mobile-friendly React app that helps Kingshot alliance members plan and distribute troops across rally formations without going over march capacity.

🌐 **Live App:** [Open Calculator](https://smoothbread-dev.github.io/kingshot-bear-trap-troop-formation-calculator/)

---

## 🚀 Features

- Troop input for all 6 types (Apex & Supreme: Infantry, Cavalry, Archer)
- Hero joins for Chenko, Amane, and Yeonwoo with optimized compositions
- Token joins (0–10) with a separate configurable march size as a hard cap per join
- Token join even proportional split of the remaining pool (includes reserved Supreme Archers)
- **Savage Advantage** bonus march for Chenko and Lead — Master Valora's Skill (0–30,000 in steps of 3,000)
- Fearless Roar is applied at activation — include it directly in your base march size input
- Apex Archers split evenly between Amane & Yeonwoo before any deduction
- Supreme Archers reserved exclusively for token joins
- Undeployed troop tracking in the summary
- **Pre-battle reminders** to activate all pet skills before Bear Trap begins

---

## 🧮 How It Works

Formations are calculated in this order:

| Step | Formation | Logic |
|------|-----------|-------|
| 1 | **Chenko** | Ratio — 10% Inf / 10% Cav / 80% Arch at effective march (base + Savage Advantage) |
| 2 | **Lead** | Ratio — 45% Inf / 45% Cav / 10% Arch at effective march (base + Savage Advantage) |
| 3 | **Amane** | Quantity — half of Apex Archers (ceil) + Inf/Cav fill at base march |
| 4 | **Yeonwoo** | Quantity — half of Apex Archers (floor) + Inf/Cav fill at base march |
| 5 | **Token Joins** | Quantity — even proportional split of remaining pool, capped at token march size per join |

> **Chenko & Lead** → save as **Ratio** presets in-game.
> **Amane, Yeonwoo & Token Joins** → save as **Quantity** presets in-game.

---

## 💡 Pre-Battle Checklist

The app displays two dismissible reminders to help you prepare:

- **Top banner** — visible as soon as the page loads
- **Inline reminder** — shown just above the Calculate button

Both prompt you to activate all pet skills before Bear Trap begins to maximize damage output.

---

## 🛠️ Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- Inline styles only — no CSS framework
