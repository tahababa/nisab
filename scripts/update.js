/**
 * Nisab Al Zakat — scripts/update.js
 *
 * Fetches gold & silver prices from goldpricez.com (free, 30-60 req/hour)
 * and exchange rates from Frankfurter (free, unlimited, no key).
 *
 * Writes:
 *   nisab.json                       — always the latest snapshot
 *   history/2026-03-15T0000Z.json    — permanent timestamped record
 *   history/index.json               — updated list of all snapshots
 */

import fs   from 'fs';
import path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAMS = 31.1035;

const CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY',
  'CHF', 'CNY', 'INR', 'MYR', 'IDR', 'TRY',
  'ZAR', 'SEK', 'NOK', 'SGD', 'DKK'
];

const SCHOOLS = {
  hanafi: {
    label: 'Hanafi',
    note:  'Based on 7.5 tola (87.48g) of gold or 52.5 tola (612.36g) of silver',
    gold:   { grams: 87.48,  tola: 7.5   },
    silver: { grams: 612.36, tola: 52.5  }
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

// ─── Fetch exchange rates from Frankfurter ─────────────────────────────────────
// Free, no API key, no rate limit.

async function fetchRates() {
  const nonUSD = CURRENCIES.filter(c => c !== 'USD').join(',');
  const res    = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${nonUSD}`);
  if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`);
  const data = await res.json();
  return { USD: 1.0, ...data.rates };
}

// ─── Build payload ─────────────────────────────────────────────────────────────

function currencyValues(pricePerGramUSD, grams, rates) {
  const usdValue = pricePerGramUSD * grams;
  const out = {};
  for (const c of CURRENCIES) {
    out[c] = rates[c] != null
      ? parseFloat((usdValue * rates[c]).toFixed(2))
      : null;
  }
  return out;
}

function buildPayload(metals, rates, slug, isoTimestamp) {
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
      timestamp:    slug,             // e.g. "2026-03-15T0800GMT"
      updated_at:   isoTimestamp,     // full ISO string
      timezone:     'GMT',
      base_currency: 'USD',
      currencies:   CURRENCIES,
      disclaimer:   'Nisab values are for informational purposes only. Consult a qualified scholar for your specific situation.',
      source:       'Nisab Al Zakat',
      url:          'nisab.tahababa.com',
      data_source:  'goldpricez.com',
      github:       'https://github.com/tahababa/nisab'
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now       = new Date();
  const slug      = getTimestampSlug(now);    // "2026-03-15T0800GMT"
  const isoStr    = now.toISOString();

  console.log(`Running nisab update: ${slug}`);

  const [metals, rates] = await Promise.all([
    fetchMetalPrices(),
    fetchRates()
  ]);

  console.log(`Gold:   $${metals.gold.per_troy_oz}/oz   ($${metals.gold.per_gram}/g)`);
  console.log(`Silver: $${metals.silver.per_troy_oz}/oz  ($${metals.silver.per_gram}/g)`);

  const payload = buildPayload(metals, rates, slug, isoStr);
  writeFiles(payload, slug);

  console.log('\nHanafi gold nisab:');
  console.log(`  USD: $${payload.nisab.hanafi.gold.values.USD?.toLocaleString() ?? 'N/A'}`);
  console.log(`  GBP: £${payload.nisab.hanafi.gold.values.GBP?.toLocaleString() ?? 'N/A'}`);
  console.log(`  SAR: ﷼${payload.nisab.hanafi.gold.values.SAR?.toLocaleString() ?? 'N/A'}`);
}

main().catch(err => {
  console.error('Update failed:', err.message);
  process.exit(1);
});
