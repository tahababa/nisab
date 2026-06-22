# نصاب الزكاة · Nisab Al Zakat

> A free, open JSON API for live Nisab thresholds — all four schools of Islamic jurisprudence, 37 currencies, **updated 6 times daily**, with a full historical archive.

**Live endpoint:** [nisab.tahababa.com/nisab.json](https://nisab.tahababa.com/nisab.json)  
**Landing page:** [nisab.tahababa.com](https://nisab.tahababa.com)

---

## What is Nisab?

The **Nisab** (نصاب) is the minimum threshold of wealth at which Zakat — the obligatory annual alms-giving and third pillar of Islam — becomes due. It is calculated based on the current market price of gold or silver, and differs slightly between the four major Sunni schools of jurisprudence.

Nisab Al Zakat provides this threshold as a clean, always-fresh JSON file, so developers, apps, and websites can consume it without building the data pipeline themselves.

---

## Update schedule

The data is refreshed **6 times every day**, every 4 hours (all times GMT):

| Run | GMT  |
|-----|------|
| 1   | 00:00 |
| 2   | 04:00 |
| 3   | 08:00 |
| 4   | 12:00 |
| 5   | 16:00 |
| 6   | 20:00 |

Each run commits: an updated `nisab.json`, 37 per-currency files in `nisab/`, and a new permanent timestamped file in `history/`.

---

## The API

No authentication. No rate limits. No registration required.

### Live data — always the latest snapshot

```bash
curl https://nisab.tahababa.com/nisab.json
```

### Per-currency slim payload

```bash
curl https://nisab.tahababa.com/nisab/SAR.json
curl https://nisab.tahababa.com/nisab/GBP.json
```

Returns Nisab values for a single currency across all four schools, plus a `pegged_to_usd` flag. Useful for lightweight integrations that only need one currency.

### A specific historical snapshot

```bash
curl https://nisab.tahababa.com/history/2026-03-15T0800GMT.json
```

### The full history index

```bash
curl https://nisab.tahababa.com/history/index.json
```

---

## Response structure

```json
{
  "meta": {
    "timestamp":      "2026-03-15T0800GMT",
    "updated_at":     "2026-03-15T09:01:22.000Z",
    "timezone":       "GMT",
    "base_currency":  "USD",
    "currencies":     ["USD", "GBP", "EUR", "...37 total"],
    "currency_count": 37,
    "fx_rate_date":   "2026-03-15",
    "usd_pegged": {
      "currencies": ["SAR", "AED", "QAR", "OMR", "BHD", "JOD"],
      "note": "These currencies are fixed against the US Dollar..."
    },
    "hijri": { "day": "15", "month_en": "Ramadan", "year": "1447", "..." },
    "disclaimer": "..."
  },
  "prices": {
    "gold":   { "per_troy_oz": 2962.10, "per_gram": 95.23 },
    "silver": { "per_troy_oz":   30.50, "per_gram":  0.98 }
  },
  "nisab": {
    "hanafi":  { "label": "Hanafi",  "gold": { "grams": 85, "values": { "USD": 8094.37, "SAR": 30354 } }, "silver": { "..." } },
    "maliki":  { "..." },
    "shafii":  { "..." },
    "hanbali": { "..." }
  }
}
```

Per-currency endpoint (`nisab/SAR.json`):

```json
{
  "meta":  { "updated_at": "2026-03-15T09:01:22.000Z", "currency": "SAR", "pegged_to_usd": true },
  "nisab": {
    "hanafi":  { "label": "Hanafi",  "gold": 30354, "silver": 9876 },
    "maliki":  { "label": "Maliki",  "gold": 30354, "silver": 9543 },
    "shafii":  { "label": "Shafi'i", "gold": 30354, "silver": 9543 },
    "hanbali": { "label": "Hanbali", "gold": 30354, "silver": 9543 }
  }
}
```

---

## Scholarly schools & thresholds

| School | Gold (grams) | Silver (grams) |
|--------|-------------|----------------|
| **Hanafi** | **85g** | **595g** |
| **Maliki** | **85g** | **595g** |
| **Shafi'i** | **85g** | **595g** |
| **Hanbali** | **85g** | **595g** |

All four schools use **85g** of gold and **595g** of silver (AAOIFI / Al-Azhar standard). The gram weights are now unified across all schools in this API.

> **Note on historical Hanafi figures:** Some older texts and South Asian scholarship cite 87.48g of gold (7.5 tola) and 612.36g of silver (52.5 tola) for the Hanafi school. Contemporary scholars and major institutions including Al-Azhar recognise 85g / 595g as the correct figures. See [/learn/gram-weights.html](https://nisab.tahababa.com/learn/gram-weights.html) for a full explanation of how these gram figures are derived.

---

## Currencies

All 37 currencies are returned in every response, grouped by region:

**Global (17)**  
`USD` `GBP` `EUR` `CAD` `AUD` `JPY` `CHF` `CNY` `INR` `MYR` `IDR` `TRY` `ZAR` `SEK` `NOK` `SGD` `DKK`

**GCC (6) — USD-pegged**  
`SAR` `AED` `KWD` `BHD` `OMR` `QAR`

**Major Muslim-majority economies (8)**  
`EGP` `PKR` `BDT` `NGN` `MAD` `DZD` `JOD` `TND`

**Additional MENA + Central Asia (6)**  
`IQD` `LBP` `LYD` `KZT` `AFN` `UZS`

USD-pegged currencies (SAR, AED, QAR, OMR, BHD, JOD) are flagged in `meta.usd_pegged`. Their Nisab values move only with gold/silver prices, not with FX fluctuation.

---

## Use it in your project

**JavaScript**
```javascript
const { nisab, prices } = await fetch('https://nisab.tahababa.com/nisab.json')
  .then(r => r.json());

console.log(nisab.hanafi.gold.values.GBP);    // Hanafi gold Nisab in GBP
console.log(nisab.maliki.silver.values.SAR);  // Maliki silver Nisab in SAR
console.log(prices.gold.per_gram);            // Gold price per gram (USD)
```

**Python**
```python
import requests

data = requests.get('https://nisab.tahababa.com/nisab.json').json()

print(data['nisab']['hanafi']['gold']['values']['PKR'])    # Hanafi gold, PKR
print(data['nisab']['maliki']['silver']['values']['USD'])  # Maliki silver, USD
```

**Per-currency (lightweight)**
```javascript
// Only fetch the data you need
const { nisab, meta } = await fetch('https://nisab.tahababa.com/nisab/AED.json')
  .then(r => r.json());

console.log(nisab.hanafi.gold);     // Hanafi gold Nisab in AED
console.log(meta.pegged_to_usd);   // true — this rate tracks USD
```

---

## Historical archive

Every snapshot is permanently committed to this repository. The `history/index.json` file groups all snapshots by date.

After one year this produces **~2,190 snapshots across 365 days** — a free, git-backed, queryable price history of Nisab thresholds in 37 currencies.

---

## Data sources

| Data | Source |
|------|--------|
| Gold & silver prices | [GoldPriceZ.com](https://goldpricez.com) |
| Exchange rates | [@fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) — free, no key, 150+ currencies, CDN-backed |
| Hijri date | [Aladhan API](https://aladhan.com) (Umm al-Qura / Saudi calendar) |
| Hosting | GitHub Pages |
| Automation | GitHub Actions |

---

## References

1. **Joe Bradford — Nisab Calculator** — [joebradford.net/nisab](https://joebradford.net/nisab/)
2. **AAOIFI** — 85g gold / 595g silver standard adopted by this API for all four schools.
3. **Joe Bradford — Nisab FAQ (2026)** — [joebradford.substack.com](https://joebradford.substack.com/p/nisab-your-complete-faq)
4. **Masarat Initiative** — 595g silver for all schools.
5. **Zakat.org** — Classical scholarly background and tola/gram methodology.
6. **nisab.tahababa.com/learn/gram-weights.html** — Full explanation of why scholars arrive at different gram figures and the history of the mithqal.

---

## Project structure

```
nisab/
├── .github/workflows/update-nisab.yml  # Cron — 6× per day, every 4 hours GMT
├── css/
│   ├── style.css                        # Unified stylesheet
│   └── popup.css                        # Popup component styles
├── learn/
│   ├── gram-weights.html                # Why gram figures differ between scholars
│   └── *.html                           # Educational articles on Zakat
├── scripts/
│   ├── update.js                        # Fetches prices + FX + Hijri, writes JSON
│   ├── popup.js                         # Popup component
│   └── theme.js                         # Dark/light theme toggle
├── history/
│   ├── index.json                       # Auto-generated index of all snapshots
│   └── YYYY-MM-DDTHHMMGMT.json         # One permanent file per snapshot
├── nisab/
│   └── {CURRENCY}.json                  # Per-currency slim payloads (37 files)
├── nisab.json                           # Always the latest full snapshot
├── index.html                           # Landing page with live Nisab + currency switcher
├── calculator.html                      # Zakat calculator
├── api.html                             # API documentation
├── CLAUDE.md                            # Codebase guide for Claude Code
└── CNAME                                # nisab.tahababa.com
```

---

## Disclaimer

Nisab values provided by this API are for informational purposes only and are based on live market prices of gold and silver. They do not constitute a religious ruling (fatwa). Please consult a qualified Islamic scholar for guidance specific to your situation.

---

## Built by

[Taha Baba](https://tahababa.com) · [tahababa.com](https://tahababa.com)
