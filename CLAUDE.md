# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that replaces the new tab page with a habit tracker and website time tracker. Features year-at-a-glance habit visualizations and website usage monitoring with daily time limits.

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
js/websites.js       Website utilities (time formatting, categories, trends)
js/app.js            UI controller, event binding, render orchestration
js/background.js     Service worker for website time tracking
js/content.js        Blocking overlay with breathing exercises
css/styles.css       Dark theme, three-column layout
```

**Data flow:**
- Habits: `Storage` → `Habits` (logic) → `Chart` (visualization) → `App` (orchestration)
- Websites: `background.js` (tracking) → `Storage` → `Websites` (utilities) → `App` (display)
- Blocking: `background.js` (limit check) → `content.js` (overlay injection)

**Key globals:** `Storage`, `Habits`, `Chart`, `Websites`, `App` - all defined on window, loaded sequentially.

## Data Model

```javascript
// Habit
{ id, name, type: 'binary'|'count', target, createdAt: 'YYYY-MM-DD' }

// Habit Entry (per date, per habit)
{ completed: boolean, value: number }

// Website Entry (per date, per domain)
{ totalSeconds: number, favicon: string }

// Website Settings (per domain)
{ dailyLimitSeconds: number|null, categoryId: string|null, customName: string|null }

// Website Category
{ id: string, name: string, color: string }

// Storage structure
{
  habits: [],
  entries: { 'YYYY-MM-DD': { habitId: entry } },
  websiteEntries: { 'YYYY-MM-DD': { domain: websiteEntry } },
  websiteSettings: { domain: settings },
  websiteCategories: []
}
```

## Features

### Habit Tracking
- Binary (done/not done) and count-based habits
- Year-at-a-glance visualization (7 columns × 53 rows)
- Streak calculation and display
- Maximum 5 habits

### Website Time Tracking
- Automatic tracking via background service worker
- Idle detection (pauses after 60s of inactivity)
- Per-domain daily time limits
- Category assignment (Productivity, Code, Social, Entertainment)
- Weekly/monthly trend data

### Blocking System
- When daily limit exceeded, content script injects full-page overlay
- Ultra-minimal breathing exercise UI (reduces friction)
- Four breathing styles: Box, Deep, Anulom Vilom, Conscious
- Configurable duration: 1, 2, 3, or 5 minutes
- Default: Box breathing, 2 minutes
- Settings hidden behind gear icon (power users only)
- Blocks reset at midnight

## Constraints

- Maximum 5 habits (enforced in `Storage.saveHabit()`)
- Date format: `YYYY-MM-DD` throughout (use `Storage.formatDate()`)
- Year charts are vertical: 7 columns (days) × 53 rows (weeks)
- Website tracking only for http/https URLs (skips chrome://, etc.)
- Content script runs at `document_start` for early blocking
