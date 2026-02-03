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

// Streak Freezes (per habit)
{ habitId: ['YYYY-MM-DD', ...] }  // dates where streak is protected

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
  streakFreezes: { habitId: ['YYYY-MM-DD', ...] },
  websiteEntries: { 'YYYY-MM-DD': { domain: websiteEntry } },
  websiteSettings: { domain: settings },
  websiteCategories: []
}
```

## Features

### Habit Tracking
- Binary (done/not done) and count-based habits
- Year-at-a-glance visualization (7 columns × 53 rows)
- Streak calculation and display (inline next to habit names)
- Maximum 5 habits
- **Habit editing** - modify name, type, target without deleting
- **Habit templates** - quick-start with Exercise, Read, Meditate, Water, Sleep
- **Backfill entries** - edit habits for past dates (not just today)
- **Streak freeze** - protect streak on missed days (grace day feature)
- **Daily progress ring** - visual indicator showing completion status

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

## Security

**XSS Prevention:** All user-provided data (habit names, category names, domains) must use safe DOM methods:
- Use `textContent` instead of `innerHTML` for text content
- Use `createElement` + `appendChild` for dynamic HTML
- Use `dataset` for data attributes
- `Storage.sanitizeString()` available for import validation
- **Audited 2026-02:** All dynamic content rendering verified to use safe DOM methods

**Import Validation:** `Storage.importData()` sanitizes all string fields and validates structure before saving.

**Permissions:** Extension uses minimal required permissions:
- `storage` - Store habit and website data locally
- `tabs` - Track active tab for website time tracking
- `idle` - Detect user inactivity to pause tracking
- `alarms` - Periodic saves and daily limit resets
- Host permissions limited to `http://` and `https://` (excludes chrome://, file://, etc.)

## Storage Management

**Automatic Cleanup:** To prevent unbounded storage growth:
- Website entries older than 90 days are automatically pruned
- Habit entries older than 400 days (~13 months) are pruned
- Cleanup runs daily via background service worker alarm
- Manual cleanup available via `Storage.runCleanup()`

## Constraints

- Maximum 5 habits (enforced in `Storage.saveHabit()`)
- Date format: `YYYY-MM-DD` throughout (use `Storage.formatDate()`)
- Year charts are vertical: 7 columns (days) × 53 rows (weeks)
- Website tracking only for http/https URLs (skips chrome://, etc.)
- Content script runs at `document_start` for early blocking
- Habits can only be edited for past/present dates, not future
- Website data retained for 90 days, habit data for 400 days
