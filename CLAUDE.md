# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that replaces the new tab page with a habit tracker featuring year-at-a-glance visualizations.

## Development

**Load extension for testing:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Open a new tab to see the extension

**No build step required** - vanilla JavaScript, direct browser loading.

## Architecture

```
newtab.html          Entry point, loads all JS in order
js/storage.js        Data layer using chrome.storage.local
js/habits.js         Habit logic (create, streak calculation, colors)
js/chart.js          SVG year chart rendering (main + mini per-habit)
js/app.js            UI controller, event binding, render orchestration
css/styles.css       Dark theme, three-column layout
```

**Data flow:** `Storage` → `Habits` (logic) → `Chart` (visualization) → `App` (orchestration)

**Key globals:** `Storage`, `Habits`, `Chart`, `App` - all defined on window, loaded sequentially.

## Data Model

```javascript
// Habit
{ id, name, type: 'binary'|'count', target, createdAt: 'YYYY-MM-DD' }

// Entry (per date, per habit)
{ completed: boolean, value: number }

// Storage structure
{ habits: [], entries: { 'YYYY-MM-DD': { habitId: entry } } }
```

## Constraints

- Maximum 5 habits (enforced in `Storage.saveHabit()`)
- Date format: `YYYY-MM-DD` throughout (use `Storage.formatDate()`)
- Year charts are vertical: 7 columns (days) × 53 rows (weeks)
