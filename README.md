# Habit Tracker

A minimal Chrome extension that replaces your new tab page with a habit tracker featuring year-at-a-glance visualizations.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## Features

- **Year visualization** - See your entire year as a color-coded grid (red → yellow → green based on completion)
- **Individual habit maps** - Each habit gets its own mini year chart showing completion history
- **Two habit types**:
  - Binary (done/not done)
  - Count-based (e.g., 8 glasses of water)
- **Streak tracking** - Current streak displayed for each habit
- **Click any day** - View and review past habit completion
- **Data portability** - Export/import your data as JSON
- **Dark theme** - Easy on the eyes

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the extension directory
6. Open a new tab to start tracking habits

## Usage

- **Add habits** - Click "+ Add Habit" (max 5 habits)
- **Track today** - Check off binary habits or use +/- for count-based
- **View history** - Click any day on the year chart to see that day's status
- **Manage habits** - Click Settings to delete habits
- **Backup data** - Use Export to save your data as JSON

## Privacy

All data is stored locally in your browser using `chrome.storage.local`. No data is sent to any server.

## License

MIT
