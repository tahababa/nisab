/**
 * Nisab Al Zakat — scripts/update.js
 *
 * Fetches gold & silver prices from goldpricez.com (free, 30-60 req/hour)
 * and exchange rates from @fawazahmed0/currency-api (free, 150+ currencies, no key, CDN-backed).
 *
 * Writes:
 *   nisab.json                       — always the latest snapshot
 *   history/2026-03-15T0000Z.json    — permanent timestamped record
 *   history/index.json               — updated list of all snapshots
 *   nisab/{CURRENCY}.json            — slim per-currency payload for all 37 currencies
 */

import fs   from 'fs';
import path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAMS = 31.1035;

const CURRENCIES = [
  // Original global set (17)
  'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY',
  'INR', 'MYR', 'IDR', 'TRY', 'ZAR', 'SEK', 'NOK', 'SGD', 'DKK',
  // GCC (6)
  'SAR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR',
  // Major Muslim-majority economies (8)
  'EGP', 'PKR', 'BDT', 'NGN', 'MAD', 'DZD', 'JOD', 'TND',
  // Additional MENA + Central Asia (6)
  'IQD', 'LBP', 'LYD', 'KZT', 'AFN', 'UZS'
];

// Currencies with a hard peg to the US Dollar
const USD_PEGGED = new Set(['SAR', 'AED', 'QAR', 'OMR', 'BHD', 'JOD']);

// Low-denomination currencies where decimal places are noise
const LOW_DECIMAL_CURRENCIES = ['IDR', 'IQD', 'LBP', 'KZT', 'UZS', 'AFN', 'NGN', 'PKR', 'BDT'];

const SCHOOLS = {
  hanafi: {
    label: 'Hanafi',
    note:  'Based on 85g of gold (following Al-Azhar) or 595g of silver. The lower threshold is preferred to benefit the poor.',
    gold:   { grams: 85.0  },
    silver: { grams: 595.0 }
  },
  maliki: {
    label: 'Maliki',
    note:  'Based on 85g of gold or 595g of silver',
    gold:   { grams: 85.0  },
    silver: { grams: 595.0 }
  },
  shafii: {
    label: "Shafi'i",
    note:  'Based on 85g of gold or 595g of silver',
    gold:   { grams: 85.0  },
    silver: { grams: 595.0 }
  },
  hanbali: {
    label: 'Hanbali',
    note:  'Based on 85g of gold or 595g of silver',
    gold:   { grams: 85.0  },
    silver: { grams: 595.0 }
  }
};

// ─── Timestamp helpers ────────────────────────────────────────────────────────

// Returns e.g. "2026-03-15T0800GMT" — safe for filenames and URLs
function getTimestampSlug(date) {
  const d    = date || new Date();
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const min  = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}${min}GMT`;
}

function getDateStr(date) {
  const d = date || new Date();
  return d.toISOString().slice(0, 10); // "2026-03-15"
}

// ─── Fetch metal prices from goldpricez.com ───────────────────────────────────
// Free tier: 30–60 req/hour. We use 2 req per run × 6 runs/day = 12/day. Fine.
// Attribution required (visible on the landing page).

async function fetchMetalPrices() {
  const key = process.env.GOLD_API_KEY;
  if (!key) throw new Error('GOLD_API_KEY env var is not set');

  const headers = { 'X-API-KEY': key };

  const [goldRes, silverRes] = await Promise.all([
    fetch('https://goldpricez.com/api/rates/currency/usd/measure/all', { headers }),
    fetch('https://goldpricez.com/api/rates/currency/usd/measure/all/metal/silver', { headers })
  ]);

  if (!goldRes.ok)   throw new Error(`goldpricez gold error: ${goldRes.status}`);
  if (!silverRes.ok) throw new Error(`goldpricez silver error: ${silverRes.status}`);

  // API returns a double-encoded JSON string — parse twice
  const goldRaw   = await goldRes.json();
  const silverRaw = await silverRes.json();
  const gold   = typeof goldRaw   === 'string' ? JSON.parse(goldRaw)   : goldRaw;
  const silver = typeof silverRaw === 'string' ? JSON.parse(silverRaw) : silverRaw;

  const goldOz   = parseFloat(gold.ounce_price_usd);
  const silverOz = parseFloat(silver.silver_ounce_price_ask_usd);

  if (!goldOz || !silverOz) {
    throw new Error(`Could not parse prices. Gold: ${JSON.stringify(gold)}, Silver: ${JSON.stringify(silver)}`);
  }

  return {
    gold: {
      per_troy_oz: parseFloat(goldOz.toFixed(4)),
      per_gram:    parseFloat((goldOz / TROY_OZ_TO_GRAMS).toFixed(6))
    },
    silver: {
      per_troy_oz: parseFloat(silverOz.toFixed(4)),
      per_gram:    parseFloat((silverOz / TROY_OZ_TO_GRAMS).toFixed(6))
    }
  };
}

// ─── Fetch exchange rates from @fawazahmed0/currency-api ──────────────────────
// Free, no API key, 150+ currencies, served via jsDelivr CDN with a fallback.
// Response shape: { "date": "YYYY-MM-DD", "usd": { "aed": 3.67, "eur": 0.92, … } }

async function fetchRates() {
  const primaryUrl  = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
  const fallbackUrl = 'https://latest.currency-api.pages.dev/v1/currencies/usd.json';

  let data;
  try {
    const res = await fetch(primaryUrl);
    if (!res.ok) throw new Error(`Primary FX error: ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.warn(`Primary FX fetch failed (${e.message}), trying fallback…`);
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`Fallback FX error: ${res.status}`);
    data = await res.json();
  }

  const raw   = data.usd;   // lowercase ISO codes keyed off "usd"
  const rates = { USD: 1.0 };
  for (const c of CURRENCIES) {
    if (c === 'USD') continue;
    const key  = c.toLowerCase();
    rates[c]   = raw[key] != null ? raw[key] : null;
  }
  return { rates, fx_date: data.date };
}

// ─── Fetch Hijri date from Aladhan (Umm al-Qura / Saudi calendar) ─────────────

async function fetchHijriDate() {
  const now  = new Date();
  const dd   = String(now.getUTCDate()).padStart(2, '0');
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = now.getUTCFullYear();
  const res  = await fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`);
  if (!res.ok) throw new Error(`Aladhan error: ${res.status}`);
  const data = await res.json();
  const h    = data.data.hijri;
  return {
    day:          h.day,
    month_en:     h.month.en,
    month_ar:     h.month.ar,
    year:         h.year,
    formatted_en: `${parseInt(h.day, 10)} ${h.month.en} ${h.year} AH`,
    formatted_ar: `${h.day} ${h.month.ar} ${h.year}`
  };
}

// ─── Build payload ─────────────────────────────────────────────────────────────

function currencyValues(pricePerGramUSD, grams, rates) {
  const usdValue = pricePerGramUSD * grams;
  const out = {};
  for (const c of CURRENCIES) {
    if (rates[c] == null) { out[c] = null; continue; }
    const raw  = usdValue * rates[c];
    const dp   = LOW_DECIMAL_CURRENCIES.includes(c) ? 0 : 2;
    out[c]     = parseFloat(raw.toFixed(dp));
  }
  return out;
}

function buildPayload(metals, rates, fx_date, slug, isoTimestamp, hijri) {
  const schoolPayload = {};
  for (const [key, school] of Object.entries(SCHOOLS)) {
    schoolPayload[key] = {
      label: school.label,
      note:  school.note,
      gold: {
        grams:  school.gold.grams,
        ...(school.gold.tola ? { tola: school.gold.tola } : {}),
        values: currencyValues(metals.gold.per_gram, school.gold.grams, rates)
      },
      silver: {
        grams:  school.silver.grams,
        ...(school.silver.tola ? { tola: school.silver.tola } : {}),
        values: currencyValues(metals.silver.per_gram, school.silver.grams, rates)
      }
    };
  }

  return {
    meta: {
      timestamp:      slug,           // e.g. "2026-03-15T0800GMT"
      updated_at:     isoTimestamp,   // full ISO string
      timezone:       'GMT',
      base_currency:  'USD',
      currencies:     CURRENCIES,
      currency_count: CURRENCIES.length,
      fx_rate_date:   fx_date,
      usd_pegged: {
        currencies: Array.from(USD_PEGGED),
        note: 'These currencies are fixed against the US Dollar. Nisab values in these currencies move only with gold and silver prices, not with FX fluctuation.'
      },
      hijri:          hijri ?? null,
      disclaimer:     'Nisab values are for informational purposes only. Consult a qualified scholar for your specific situation.',
      source:         'Nisab Al Zakat',
      url:            'nisab.tahababa.com',
      data_source:    'goldpricez.com',
      github:         'https://github.com/tahababa/nisab'
    },
    prices:  metals,
    nisab:   schoolPayload
  };
}

// ─── Write files ──────────────────────────────────────────────────────────────

function writeFiles(payload, slug) {
  const json    = JSON.stringify(payload, null, 2);
  const histDir = path.resolve('history');
  if (!fs.existsSync(histDir)) fs.mkdirSync(histDir);

  // 1. nisab.json — always the freshest snapshot
  fs.writeFileSync(path.resolve('nisab.json'), json, 'utf8');
  console.log('✓ nisab.json updated');

  // 2. history/2026-03-15T0800Z.json — permanent timestamped record
  const histFile = path.join(histDir, `${slug}.json`);
  fs.writeFileSync(histFile, json, 'utf8');
  console.log(`✓ history/${slug}.json written (GMT)`);

  // 3. Rebuild index.json — sorted newest first, grouped by date
  const allFiles = fs.readdirSync(histDir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();

  // Group timestamps by date for easier querying
  const byDate = {};
  for (const ts of allFiles) {
    const date = ts.slice(0, 10); // "2026-03-15"
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(ts);
  }

  const index = {
    updated_at:    new Date().toISOString(),
    total_records: allFiles.length,
    total_days:    Object.keys(byDate).length,
    latest:        allFiles[0] ?? null,
    by_date:       byDate      // { "2026-03-15": ["2026-03-15T2000Z", "2026-03-15T1600Z", ...] }
  };

  fs.writeFileSync(
    path.join(histDir, 'index.json'),
    JSON.stringify(index, null, 2),
    'utf8'
  );
  console.log(`✓ history/index.json updated (${allFiles.length} records across ${Object.keys(byDate).length} days)`);
}

// ─── Write per-currency slim files ────────────────────────────────────────────
// Generates nisab/{CURRENCY}.json for each of the 37 currencies.
// These are served as static files by GitHub Pages, acting as per-currency endpoints.

function writePerCurrencyFiles(payload) {
  const dir = path.resolve('nisab');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  for (const currency of CURRENCIES) {
    const slim = {
      meta: {
        updated_at:    payload.meta.updated_at,
        currency,
        pegged_to_usd: USD_PEGGED.has(currency)
      },
      nisab: {}
    };

    for (const [key, school] of Object.entries(payload.nisab)) {
      slim.nisab[key] = {
        label:  school.label,
        gold:   school.gold.values[currency]   ?? null,
        silver: school.silver.values[currency] ?? null
      };
    }

    fs.writeFileSync(
      path.join(dir, `${currency}.json`),
      JSON.stringify(slim, null, 2),
      'utf8'
    );
  }
  console.log(`✓ nisab/*.json updated (${CURRENCIES.length} per-currency files)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now       = new Date();
  const slug      = getTimestampSlug(now);    // "2026-03-15T0800GMT"
  const isoStr    = now.toISOString();

  console.log(`Running nisab update: ${slug}`);

  const [metals, fxResult, hijri] = await Promise.all([
    fetchMetalPrices(),
    fetchRates(),
    fetchHijriDate().catch(e => { console.warn('Hijri fetch failed:', e.message); return null; })
  ]);
  const { rates, fx_date } = fxResult;

  console.log(`Gold:   $${metals.gold.per_troy_oz}/oz   ($${metals.gold.per_gram}/g)`);
  console.log(`Silver: $${metals.silver.per_troy_oz}/oz  ($${metals.silver.per_gram}/g)`);
  console.log(`FX date: ${fx_date}`);

  const payload = buildPayload(metals, rates, fx_date, slug, isoStr, hijri);
  writeFiles(payload, slug);
  writePerCurrencyFiles(payload);

  console.log('\nHanafi gold nisab:');
  console.log(`  USD: $${payload.nisab.hanafi.gold.values.USD?.toLocaleString() ?? 'N/A'}`);
  console.log(`  GBP: £${payload.nisab.hanafi.gold.values.GBP?.toLocaleString() ?? 'N/A'}`);
  console.log(`  SAR: ﷼${payload.nisab.hanafi.gold.values.SAR?.toLocaleString() ?? 'N/A'}`);
}

main().catch(err => {
  console.error('Update failed:', err.message);
  process.exit(1);
});
