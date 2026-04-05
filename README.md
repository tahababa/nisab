# نصاب الزكاة · Nisab Al Zakat

> A free, open JSON API for live Nisab thresholds — all four schools of Islamic jurisprudence, 17 currencies, **updated 6 times daily**, with a full historical archive.

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

Each run commits two things: an updated `nisab.json` and a new permanent timestamped file in `history/` (e.g. `history/2026-03-15T0800GMT.json`).

After one year this produces **~2,190 snapshots across 365 days** — a free, git-backed, queryable price history of Nisab thresholds.

---

## The API

No authentication. No rate limits. No registration required.

### Live data — always the latest snapshot

```bash
curl https://nisab.tahababa.com/nisab.json
```

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
    "timestamp":    "2026-03-15T0800GMT",
    "updated_at":   "2026-03-15T09:01:22.000Z",
    "timezone":     "GMT",
    "base_currency": "USD",
    "currencies":   ["USD", "GBP", "EUR", "...17 total"],
    "hijri": {
      "day":          "15",
      "month_en":     "Ramadan",
      "month_ar":     "رَمَضَان",
      "year":         "1447",
      "formatted_en": "15 Ramadan 1447 AH",
      "formatted_ar": "15 رَمَضَان 1447"
    },
    "disclaimer":   "Nisab values are for informational purposes only. Consult a qualified scholar for your specific situation.",
    "source":       "Nisab Al Zakat",
    "url":          "nisab.tahababa.com",
    "github":       "https://github.com/tahababa/nisab"
  },
  "prices": {
    "gold":   { "per_troy_oz": 2962.10, "per_gram": 95.23 },
    "silver": { "per_troy_oz":   30.50, "per_gram":  0.98 }
  },
  "nisab": {
    "hanafi": {
      "label": "Hanafi",
      "note":  "Based on 85g of gold or 612.36g of silver",
      "gold":   { "grams": 85, "values": { "USD": 8094.37, "GBP": 6382.95, "...": "17 currencies" } },
      "silver": { "grams": 612.36, "tola": 52.5, "values": { "USD": 599.11, "...": "17 currencies" } }
    },
    "maliki":  { "..." },
    "shafii":  { "..." },
    "hanbali": { "..." }
  }
}
```

---

## Scholarly schools & thresholds

The Nisab thresholds used in this API are sourced from authoritative Islamic scholarly institutions. See the [References](#references) section below for full citations.

| School | Gold (grams) | Silver (grams) | Silver (tola) |
|--------|-------------|----------------|---------------|
| **Hanafi** | **85g** | **612.36g** | 52.5 |
| **Maliki** | **85g** | **595g** | — |
| **Shafi'i** | **85g** | **595g** | — |
| **Hanbali** | **85g** | **595g** | — |

**Gold Nisab — all four schools**  
All four schools use **85g** of gold as the gold Nisab threshold. The Hanafi school was historically associated with 87.48g (7.5 tola, based on the classical South Asian tola unit), but contemporary scholarly consensus and major institutions recognise 85g as the correct value. The Hanafi silver Nisab remains 612.36g (52.5 tola), which is slightly higher than the other three schools' 595g.

---

## Currencies

All 17 currencies are returned in every response:

`USD` `GBP` `EUR` `CAD` `AUD` `JPY` `CHF` `CNY` `INR` `MYR` `IDR` `TRY` `ZAR` `SEK` `NOK` `SGD` `DKK`

> Gulf and South Asian currencies (SAR, AED, KWD, QAR, PKR, BDT, etc.) are not included as they are not available from the Frankfurter exchange rate API. Use the USD value with your local exchange rate to convert.

---

## Use it in your project

**JavaScript**
```javascript
const { nisab, prices } = await fetch('https://nisab.tahababa.com/nisab.json')
  .then(r => r.json());

// Hanafi gold Nisab in British pounds
console.log(nisab.hanafi.gold.values.GBP);

// Maliki silver Nisab in US dollars
console.log(nisab.maliki.silver.values.USD);

// Current gold price per gram
console.log(prices.gold.per_gram);
```

**Python**
```python
import requests

data = requests.get('https://nisab.tahababa.com/nisab.json').json()

print(data['nisab']['hanafi']['gold']['values']['GBP'])    # Hanafi gold, GBP
print(data['nisab']['maliki']['silver']['values']['USD'])  # Maliki silver, USD
print(data['prices']['gold']['per_troy_oz'])               # Gold spot price
```

**n8n / automation**  
Use an HTTP Request node pointing to `https://nisab.tahababa.com/nisab.json`. No headers or authentication needed. The response is ready to use directly in any subsequent node.

---

## Historical archive

Every snapshot is permanently committed to this repository. The `history/index.json` file groups all snapshots by date:

```json
{
  "total_records": 2190,
  "total_days": 365,
  "latest": "2026-03-15T2000GMT",
  "by_date": {
    "2026-03-15": ["2026-03-15T2000GMT", "2026-03-15T1600GMT", "...6 per day"],
    "2026-03-14": ["2026-03-14T2000GMT", "..."]
  }
}
```

---

## Data sources

| Data | Source |
|------|--------|
| Gold & silver prices | [GoldPriceZ.com](https://goldpricez.com) |
| Exchange rates | [Frankfurter API](https://www.frankfurter.app) |
| Hijri date | [Aladhan API](https://aladhan.com) (Umm al-Qura / Saudi calendar) |
| Hosting | GitHub Pages |
| Automation | GitHub Actions |

---

## References

The scholarly thresholds used in this API are sourced from the following authoritative institutions:

1. **Joe Bradford — Nisab Calculator**  
   [joebradford.net/nisab](https://joebradford.net/nisab/)  
   Sources cited: Fatwa of Mufti Muhammad Shafi of Deoband (Hanafi); Dar al-Ifta of Al-Azhar (Egypt); Dar al-Ifta of Jordan; Mufti of the Federal Territory, Malaysia; Wizarat al-Awqaf of Morocco; Wizarat al-Awqaf of the Kingdom of Saudi Arabia.

2. **AAOIFI — Accounting and Auditing Organization for Islamic Financial Institutions**  
   [aaoifi.com](https://aaoifi.com)  
   Adopted standard: 85g gold / 595g silver for Maliki, Shafi'i, and Hanbali schools.

3. **National Zakat Foundation UK (NZF)**  
   [nzf.org.uk/knowledge/zakat-on-gold-silver-jewellery](https://nzf.org.uk/knowledge/zakat-on-gold-silver-jewellery/)  
   Confirms Hanafi Nisab at 85g gold / 612.36g silver (52.5 tola).

4. **Joe Bradford — Nisab FAQ (2026)**  
   [joebradford.substack.com/p/nisab-your-complete-faq](https://joebradford.substack.com/p/nisab-your-complete-faq)  
   Scholarly analysis of gold vs silver Nisab and contemporary application.

5. **Masarat Initiative — Silver Zakat Calculation**  
   [masarat-sy.org/en/silver-zakat-calculation](https://masarat-sy.org/en/silver-zakat-calculation/)  
   Confirms 595g silver threshold for Maliki, Shafi'i, and Hanbali schools.

6. **Zakat.org — What is Nisab in Islam?**  
   [zakat.org/what-is-ni-ab-in-islam](https://www.zakat.org/what-is-ni-ab-in-islam)  
   Classical scholarly background and tola/gram conversion methodology.

---

## Project structure

```
nisab/
├── .github/
│   └── workflows/
│       └── update-nisab.yml      # Cron — 6× per day, every 4 hours GMT
├── css/
│   ├── style.css                 # Unified stylesheet
│   └── popup.css                 # Popup component styles
├── learn/
│   └── *.html                    # Educational articles on Zakat
├── scripts/
│   ├── update.js                 # Fetches prices + Hijri date, writes JSON
│   ├── popup.js                  # Popup component
│   └── theme.js                  # Dark/light theme toggle
├── history/
│   ├── index.json                # Auto-generated index of all snapshots
│   └── YYYY-MM-DDTHHMMGMT.json  # One permanent file per snapshot
├── nisab.json                    # Always the latest snapshot
├── index.html                    # Landing page (GitHub Pages)
├── calculator.html               # Zakat calculator
├── .gitignore
├── CNAME                         # nisab.tahababa.com
└── package.json
```

---

## Disclaimer

Nisab values provided by this API are for informational purposes only and are based on live market prices of gold and silver. They do not constitute a religious ruling (fatwa). Please consult a qualified Islamic scholar for guidance specific to your situation.

---

## Built by

[Taha Baba](https://tahababa.com) · [tahababa.com](https://tahababa.com)
