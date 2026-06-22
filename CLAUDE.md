# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Pure static site — no framework, no build step, no package manager. Every page is a self-contained HTML file. Deployed to Cloudflare Pages from the `main` branch.

The one server-side component is **`scripts/update.js`**, a Node.js ESM script run by GitHub Actions 6× daily. It is the only file in the repo that requires Node; everything else is browser JS.

## Running the update script locally

```bash
GOLD_API_KEY=<your_key> node scripts/update.js
```

Requires Node 24 (matches CI). The script needs `GOLD_API_KEY` (goldpricez.com) set as an env var; it will throw immediately without it. After a successful run it writes/overwrites `nisab.json`, `history/<timestamp>.json`, `history/index.json`, and all 37 `nisab/<CURRENCY>.json` files.

There is no dev server, linter, or test runner configured.

## Data pipeline

```
GitHub Actions (6×/day)
  └─ scripts/update.js
       ├─ goldpricez.com  → gold & silver spot prices (USD)
       ├─ fawazahmed0/currency-api → FX rates for 37 currencies
       └─ aladhan.com → Hijri date
  Writes:
       nisab.json                        ← canonical "latest" snapshot (all schools, all 37 currencies)
       nisab/<CURRENCY>.json             ← slim per-currency file (37 files): {label, gold, silver} per school
       history/<timestamp>.json          ← permanent timestamped copy of nisab.json
       history/index.json                ← {total_records, total_days, latest, by_date{}}
```

The browser never calls any external API directly. Everything is served as static JSON from the same origin.

## Gram-weight configuration (source of truth)

`scripts/update.js` contains the `SCHOOLS` constant. This is the single source of truth for gram weights. Changing a gram value here changes it in all generated JSON and all downstream calculations. All four schools currently use **85g gold / 595g silver** (unified after a 2026-06 update; old Hanafi silver was 612.36g). Any HTML pages that display gram figures statically must be updated manually to stay in sync.

## CSS design system

Single stylesheet: `css/style.css`. Everything uses CSS custom properties defined in `:root`. Key tokens:

| Purpose | Variable |
|---|---|
| Gold accent | `--gold` `--gold-lt` `--gold-dim` |
| Text on dark | `--paper` `--paper-dim` |
| Background | `--ink` `--ink-card` |
| Borders | `--border` `--border-s` |
| Fonts | `--serif` (Lora) `--mono` (JetBrains Mono) |

**Never hardcode `rgba(250,248,243,…)` for text** — those are invisible in light mode. Use `var(--paper-dim)`, `var(--text-dim)`, or `var(--paper)` instead.

Light mode is activated by `<html data-theme="light">`. The theme is set in two places: an inline FOUC-prevention script in `<head>` (reads `localStorage['nisab-theme']`, falls back to time-of-day), and `scripts/theme.js` which exposes `window.toggleTheme()`.

## Page structure conventions

All HTML pages share the same nav and footer markup. Copy from any existing learn page — the active nav link is set manually with `class="active"`. Scripts loaded at the bottom of `<body>`:

```html
<script src="/scripts/popup.js"></script>   <!-- privacy banner -->
<script src="/scripts/theme.js"></script>   <!-- theme toggle -->
```

Learn pages live in `learn/` and reference `../css/style.css`, `../scripts/...`.

## History data — querying for sparklines / trends

`history/index.json` has a `by_date` object keyed by `YYYY-MM-DD`, each containing an ordered list of timestamp slugs for that day. Individual snapshots are at `history/<slug>.json`. The slug format is `YYYY-MM-DDTHHMMGMT`. There are ~100 days / 593 snapshots available (as of 2026-06-22).

## Per-currency slim files

`nisab/<CURRENCY>.json` contains only the data needed for a single currency:
```json
{ "meta": { "updated_at": "…", "currency": "GBP", "pegged_to_usd": false },
  "nisab": { "hanafi": { "label": "Hanafi", "gold": 10234.56, "silver": 432.10 }, … } }
```
Use these for currency-specific pages or widgets rather than loading the full `nisab.json`.

## localStorage keys

| Key | Written by | Purpose |
|---|---|---|
| `nisab-theme` | `scripts/theme.js` | `"light"` or `"dark"` |
| `nisab_notice_dismissed` | `scripts/popup.js` | `"1"` when the privacy banner is dismissed |

## faqs.json

`faqs.json` at the repo root is a standalone structured FAQ dataset. The homepage does **not** load it — it has its own inline `FAQS` array in its `<script>` block. If FAQ content is changed, update both `faqs.json` and the inline array in `index.html` to keep them in sync.
