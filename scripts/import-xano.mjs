/**
 * scripts/import-xano.mjs
 * Import all Xano CSV exports into Supabase.
 * Run: node scripts/import-xano.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = "https://zqchghfpmjdxokumutqu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2hnaGZwbWpkeG9rdW11dHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MTA0NzcsImV4cCI6MjA4Nzk4NjQ3N30.-dD7d2m_tmmdzbGeiShs-sEZ6wBIS91Nm_mhddnj43Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DOWNLOADS = "/Users/laurenteuzet/Downloads";

// ─── CSV Parser (state machine, handles quoted commas & newlines) ─────────────

function parseCSV(filePath) {
  const content = readFileSync(resolve(filePath), "utf-8");
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\r") {
        // skip CR
      } else if (ch === "\n") {
        current.push(field);
        field = "";
        if (current.length > 0) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  // last field/row
  if (field !== "" || current.length > 0) {
    current.push(field);
    if (current.some((f) => f !== "")) rows.push(current);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

const toInt = (v) => {
  if (v === "" || v == null) return null;
  const n = parseInt(v, 10);
  if (isNaN(n)) return null;
  // Out of Postgres integer range → null (likely a corrupt Xano timestamp)
  if (n > INT_MAX || n < INT_MIN) return null;
  return n;
};

const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const toStr = (v) => (v === "" ? null : v);

const toDate = (v) => {
  if (!v || v === "") return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
};

// ─── Bulk insert helper ───────────────────────────────────────────────────────

async function bulkUpsert(table, rows, BATCH = 500) {
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows — skipped`);
    return;
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from(table)
      .upsert(batch, { onConflict: "id", count: "exact" });
    if (error) {
      console.error(`  ✗ ${table} batch ${i}–${i + BATCH - 1}:`, error.message);
      throw error;
    }
    inserted += count ?? batch.length;
  }
  console.log(`  ✓ ${table}: ${inserted} rows inserted`);
}

// ─── Transform functions ──────────────────────────────────────────────────────

function transformMakes(rows) {
  return rows.map((r) => ({
    id: toInt(r.id),
    name: toStr(r.name),
  }));
}

function transformLocations(rows) {
  return rows.map((r) => ({
    id: toInt(r.id),
    name: toStr(r.name),
    type: toStr(r.type),
    full_name: toStr(r.full_name),
  }));
}

function transformVehicles(rows) {
  return rows.map((r) => ({
    id: toInt(r.id),
    plate: toStr(r.plate),
    trim: toStr(r.trim),
    fuel: toStr(r.fuel),
    ext_color: toStr(r.ext_color),
    int_color: toStr(r.int_color),
    year: toInt(r.year),
    vin: toStr(r.vin),
    engine_size: toStr(r.engine_size),
    co2: toNum(r.co2),
    operation_date: toDate(r.operation_date),
    status: toStr(r.status),
    lease_amount: toNum(r.lease_amount),
    lease_status: toStr(r.lease_status),
    lease_end: toDate(r.lease_end),
    purchase_date: toDate(r.purchase_date),
    purchase_amount: toNum(r.purchase_amount),
    bank: toStr(r.bank),
    loan_amount: toNum(r.loan_amount),
    loan_emi: toNum(r.loan_emi),
    loan_tenure: toInt(r.loan_tenure),
    interest_rate: toNum(r.interest_rate),
    end_of_loan: toDate(r.end_of_loan),
    insurance: toStr(r.insurance),
    insurance_payment: toNum(r.insurance_payment),
    insurance_due: toDate(r.insurance_due),
    km: toInt(r.km),
    avg_km_month: toNum(r.avg_km_month),
    service_interval: toInt(r.service_interval),
    last_service_km: toInt(r.last_service_km),
    makes_id: toInt(r.makes_id),
    models_id: toInt(r.models_id),
    location_id: toInt(r.location_id),
  }));
}

function transformJobs(rows) {
  // Ignorer les lignes sans salesforce_id
  rows = rows.filter((r) => r.salesforce_id && r.salesforce_id.trim() !== "");
  return rows.map((r) => ({
    id: toInt(r.id),
    source_id: toInt(r.source_id),
    folder: toInt(r.folder),
    job_number: toInt(r.job_number),
    status: toStr(r.status),
    date: toDate(r.date),
    week_number: toInt(r.week_number),
    vertical: toStr(r.vertical),
    main_account: toStr(r.main_account),
    billing_account: toStr(r.billing_account),
    invoice_number: toStr(r.invoice_number),
    service_type_high: toStr(r.service_type_high),
    service_type_mid: toStr(r.service_type_mid),
    service_type_low: toStr(r.service_type_low),
    provider_type: toStr(r.provider_type),
    provider_name: toStr(r.provider_name),
    driver_name: toStr(r.driver_name),
    vehicle_type_requested: toStr(r.vehicle_type_requested),
    vehicle_type_assigned: toStr(r.vehicle_type_assigned),
    vehicle_plate: toStr(r.vehicle_plate),
    pickup_location: toStr(r.pickup_location),
    dropoff_location: toStr(r.dropoff_location),
    lead_time_fine: toStr(r.lead_time_fine),
    lead_time_broad: toStr(r.lead_time_broad),
    lead_time_hours: toNum(r.lead_time_hours),
    revenue_aed: toNum(r.revenue_aed),
    revenue_eur: toNum(r.revenue_eur),
    hourly_revenue_aed: toNum(r.hourly_revenue_aed),
    hourly_revenue_eur: toNum(r.hourly_revenue_eur),
    cost_aed: toNum(r.cost_aed),
    cost_eur: toNum(r.cost_eur),
    gross_margin: toNum(r.gross_margin),
    exchange_rate: toNum(r.exchange_rate),
    duration_hours: toNum(r.duration_hours),
    salesforce_id: toStr(r.salesforce_id),
  }));
}

function transformDailyOp(rows) {
  return rows.map((r) => {
    const total = toInt(r.total_drivers) ?? 0;
    const working = toInt(r.working) ?? 0;
    const pct = total > 0 ? Math.round((working / total) * 10000) / 100 : 0;
    return {
      id: toInt(r.id),
      date: toDate(r.date),
      total_drivers: total,
      working: working,
      pool: toInt(r.pool),
      free: toInt(r.free),
      off: toInt(r.off),
      sick: toInt(r.sick),
      leave: toInt(r.leave),
      pct_working: pct,
    };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 CHABE — Import Xano → Supabase\n");

  // 1. Makes
  console.log("1/5 makes...");
  const makes = parseCSV(`${DOWNLOADS}/dbo-makes-747651-live.1772436557.csv`);
  await bulkUpsert("makes", transformMakes(makes));

  // 2. Locations
  console.log("2/5 locations...");
  const locations = parseCSV(`${DOWNLOADS}/dbo-locations-747640-live.1772436549.csv`);
  await bulkUpsert("locations", transformLocations(locations));

  // 3. Vehicles (depends on makes & locations)
  console.log("3/5 vehicles...");
  const vehicles = parseCSV(`${DOWNLOADS}/dbo-vehicles-747882-live.1772436581.csv`);
  await bulkUpsert("vehicles", transformVehicles(vehicles));

  // 4. Jobs (2053 rows — batches of 500, dédupliqués par id)
  console.log("4/5 jobs...");
  const jobsRaw = parseCSV(`${DOWNLOADS}/dbo-jobs-747612-live.1772436549.csv`);
  // Déduplique : garder le dernier enregistrement par id
  const jobsMap = new Map();
  for (const r of jobsRaw) jobsMap.set(r.id, r);
  const jobs = Array.from(jobsMap.values());
  console.log(`  ${jobsRaw.length} lignes → ${jobs.length} après déduplification`);
  await bulkUpsert("jobs", transformJobs(jobs), 500);

  // 5. Daily Op
  console.log("5/5 daily_op...");
  const dailyOp = parseCSV(`${DOWNLOADS}/dbo-daily_op-747967-live.1772436538.csv`);
  await bulkUpsert("daily_op", transformDailyOp(dailyOp));

  console.log("\n✅ Import complet !");
  console.log("   (check_in, vehicle_expense, vehicle_service : 0 lignes dans Xano — tables prêtes)\n");
}

main().catch((err) => {
  console.error("❌ Erreur fatale:", err);
  process.exit(1);
});
