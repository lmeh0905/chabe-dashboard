/**
 * Dérivation des données Daily / Monthly / Annual à partir des jobs Xano.
 * Plus de données en dur : tout provient de la base (jobs).
 */

import type { Job } from "./api/supabase";
import type { FleetVehicle } from "./api/supabase";

/** Données daily_op utiles pour les calculs de drivers */
export interface DailyOpRecord {
  free: number;
  pct_working: number;
  total_drivers?: number;
  working?: number;
  pool?: number;
}

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MONTH_SLUGS = ["jan", "fév", "mar", "avr", "mai", "jui", "juil", "aoû", "sep", "oct", "nov", "déc"];

function parseDate(d: string): { y: number; m: number; day: number } {
  const [y, m, day] = d.split("-").map(Number);
  return { y: y ?? 0, m: m ?? 0, day: day ?? 0 };
}

/** Clé jour pour affichage : "25 Fév" */
export function getDailyKey(dateStr: string): string {
  const { m, day } = parseDate(dateStr);
  const monthLabel = MONTHS[m - 1] ?? "";
  return `${day} ${monthLabel}`;
}

/** Clé mois pour affichage : "Fév 2026" */
export function getMonthlyKey(dateStr: string): string {
  const { y, m } = parseDate(dateStr);
  const monthLabel = MONTHS[m - 1] ?? "";
  return `${monthLabel} ${y}`;
}

/** Extrait le code de service (avant le " | ") : "LT | Lease Transfert" → "LT" */
function serviceCode(j: Job): string {
  return (j.service_type_low ?? "").split("|")[0].trim().toUpperCase();
}

/** Compte par type de service (service_type_low) */
function countByServiceType(jobs: Job[]): { LT: number; LH: number; ST: number; SH: number; S: number; T: number; H: number; IT: number; IHS: number; total: number } {
  const out = { LT: 0, LH: 0, ST: 0, SH: 0, S: 0, T: 0, H: 0, IT: 0, IHS: 0, total: jobs.length };
  for (const j of jobs) {
    const code = serviceCode(j);
    if (code === "LT") out.LT++;
    else if (code === "LH") out.LH++;
    else if (code === "ST") out.ST++;
    else if (code === "SH") out.SH++;
    else if (code === "S") out.S++;
    else if (code === "T") out.T++;
    else if (code === "H") out.H++;
    else if (code === "IT") out.IT++;
    else if (code === "IHS") out.IHS++;
  }
  return out;
}

/** Jobs hors LT & LH (hors lease) */
function isHorsLease(j: Job): boolean {
  const code = serviceCode(j);
  return code !== "LT" && code !== "LH";
}

const VERTICAL_COLORS: Record<string, string> = {
  Interco: "#007aff",
  Hotels: "#34c759",
  "Luxury Brands": "#af52de",
  Travel: "#ff9500",
  Default: "#86868b",
};

export interface DailyDay {
  /** Date ISO (YYYY-MM-DD) pour tri */
  dateIso?: string;
  label: string;
  drivers: { total: number; working: number; pool: number; free: number; off: number; sick: number; leave: number };
  jobs: { total: number; LT: number; LH: number; ST: number; SH: number; T: number; H: number; IT: number; IHS: number };
  revenue: {
    horsLease: number;
    internalRev: number;
    externalRev: number;
    revPerDriver: number;
    jobPerDriver: number;
    avgPrice: number;
  };
  providers: { name: string; type: string; rev: number; jobs: number; pct: number }[];
  perf: { name: string; missions: number; rev: number }[];
  topClients: { name: string; rev: number; jobs: number }[];
  verticals: { name: string; rev: number; jobs: number; color: string }[];
  fleetDemand: { type: string; missions: number; need: number; fleet: number; status: string }[];
}

/** Liste canonique des types véhicules — source unique pour toutes les vues */
export const VEHICLE_TYPES = ["S Class", "V Class", "BMW 7", "EQS", "SUV", "Executive Sedan"] as const;

/** Détermine le type d'un véhicule (priorité au champ DB vehicleType, sinon heuristique modèle) */
export function getVehicleType(v: FleetVehicle): string {
  if (v.vehicleType) return v.vehicleType;
  const m = (v.modelName || v.model || "").toLowerCase();
  if (m.includes("s-class") || m.includes("maybach")) return "S Class";
  if (m.includes("v-class") || m.includes("vito") || m.includes("falcon")) return "V Class";
  if (m.includes("eqs")) return "EQS";
  if (m.includes("i7") || m.includes("7 series") || m.includes("735") || m.includes("730")) return "BMW 7";
  if (m.includes("520") || m.includes("5 series")) return "Executive Sedan";
  if (m.includes("suburban") || m.includes("escalade") || m.includes("yukon")) return "SUV";
  return "Autre";
}

function normalizeVehicleType(t?: string): string {
  if (!t) return "Autre";
  const u = t.toUpperCase();
  if (u.includes("S CLASS") || u.includes("MAYBACH") || u.includes("S-CLASS")) return "S Class";
  if (u.includes("V CLASS") || u.includes("VITO") || u.includes("FALCON") || u.includes("SPRINTER")) return "V Class";
  if (u.includes("EQS") || u.includes("I7") || u.includes("ELECTRIC")) return "EQS";
  if (u.includes("BMW 7") || u.includes("735") || u.includes("730")) return "BMW 7";
  if (u.includes("EXEC") || u.includes("EXECUTIVE") || u.includes("520") || u.includes("5 SERIES")) return "Executive Sedan";
  if (u.includes("SUBURBAN") || u.includes("ESCALADE") || u.includes("YUKON") || u.includes("GMC") || u.includes("CADILLAC")) return "SUV";
  return t || "Autre";
}

function fleetCountByType(vehicles: FleetVehicle[]): Record<string, number> {
  const office = vehicles.filter((v) => v.location === "Office");
  const out: Record<string, number> = {};
  for (const t of VEHICLE_TYPES) out[t] = 0;
  for (const v of office) {
    const t = getVehicleType(v);
    if (t in out) out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

/** Dérive les données journalières à partir des jobs (et flotte pour fleetDemand).
 * @param dailyOpRecord  données daily_op du jour (free, pct_working, total_drivers, working)
 */
export function deriveDailyData(jobs: Job[], vehicles: FleetVehicle[] = [], dailyOpRecord?: DailyOpRecord): Record<string, DailyDay> {
  const byDate = new Map<string, Job[]>();
  for (const j of jobs) {
    if (!j.date) continue;
    const key = getDailyKey(j.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(j);
  }

  const fleetByType = fleetCountByType(vehicles);
  const result: Record<string, DailyDay> = {};

  for (const [key, dayJobs] of byDate) {
    const counts = countByServiceType(dayJobs);
    const horsLeaseJobs = dayJobs.filter(isHorsLease);
    const revHorsLease = horsLeaseJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
    const internalJobs = horsLeaseJobs.filter((j) => j.provider_type === "Internal");
    const externalJobs = horsLeaseJobs.filter((j) => j.provider_type === "External");
    const internalRev = internalJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
    const externalRev = externalJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
    const driversSet = new Set(dayJobs.map((j) => j.driver_name).filter(Boolean));
    // Driver Free : priorité daily_op (saisi manuellement), sinon fallback jobs
    const dFree = dailyOpRecord?.free ?? driversSet.size;
    const revPerDriver = dFree > 0 ? Math.round(internalRev / dFree) : 0;
    const jobPerDriver = dFree > 0 ? Math.round((internalJobs.length / dFree) * 10) / 10 : 0;
    const avgPrice = horsLeaseJobs.length ? Math.round(revHorsLease / horsLeaseJobs.length) : 0;

    const providerMap = new Map<string, { rev: number; jobs: number; type: string }>();
    for (const j of horsLeaseJobs) {
      const name = j.provider_name ?? "Inconnu";
      const type = j.provider_type ?? "External";
      const rev = j.revenue_aed ?? 0;
      if (!providerMap.has(name)) providerMap.set(name, { rev: 0, jobs: 0, type });
      const p = providerMap.get(name)!;
      p.rev += rev;
      p.jobs += 1;
    }
    const providers = Array.from(providerMap.entries()).map(([name, p]) => ({
      name,
      type: p.type === "Internal" ? "Internal" : "External",
      rev: p.rev,
      jobs: p.jobs,
      pct: horsLeaseJobs.length > 0 ? Number(((p.jobs / horsLeaseJobs.length) * 100).toFixed(1)) : 0,
    })).sort((a, b) => {
      if (a.type === "Internal" && b.type !== "Internal") return -1;
      if (a.type !== "Internal" && b.type === "Internal") return 1;
      return b.rev - a.rev;
    });

    const driverRev = new Map<string, { missions: number; rev: number }>();
    for (const j of horsLeaseJobs) {
      const name = j.driver_name ?? "Inconnu";
      if (!driverRev.has(name)) driverRev.set(name, { missions: 0, rev: 0 });
      const d = driverRev.get(name)!;
      d.missions += 1;
      d.rev += j.revenue_aed ?? 0;
    }
    const perf = Array.from(driverRev.entries())
      .map(([name, x]) => ({ name, missions: x.missions, rev: x.rev }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 10);

    const clientMap = new Map<string, { rev: number; jobs: number }>();
    for (const j of horsLeaseJobs) {
      const name = j.billing_account ?? j.main_account ?? "Inconnu";
      if (!clientMap.has(name)) clientMap.set(name, { rev: 0, jobs: 0 });
      const c = clientMap.get(name)!;
      c.rev += j.revenue_aed ?? 0;
      c.jobs += 1;
    }
    const topClients = Array.from(clientMap.entries())
      .map(([name, x]) => ({ name, rev: x.rev, jobs: x.jobs }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 8);

    const verticalMap = new Map<string, { rev: number; jobs: number }>();
    for (const j of horsLeaseJobs) {
      const name = j.vertical ?? "Autre";
      if (!verticalMap.has(name)) verticalMap.set(name, { rev: 0, jobs: 0 });
      const v = verticalMap.get(name)!;
      v.rev += j.revenue_aed ?? 0;
      v.jobs += 1;
    }
    const verticals = Array.from(verticalMap.entries()).map(([name, x]) => ({
      name,
      rev: x.rev,
      jobs: x.jobs,
      color: VERTICAL_COLORS[name] ?? VERTICAL_COLORS.Default,
    }));

    const typeMissions = new Map<string, number>();
    for (const j of horsLeaseJobs) {
      const t = normalizeVehicleType(j.vehicle_type_assigned || j.vehicle_type_requested);
      typeMissions.set(t, (typeMissions.get(t) ?? 0) + 1);
    }
    let fleetDemand = ([...VEHICLE_TYPES] as string[]).map((type) => {
      const missions = typeMissions.get(type) ?? 0;
      const need = Math.round((missions / 2.5) * 10) / 10;
      const fleet = fleetByType[type] ?? 0;
      let status = "ok";
      if (fleet < need * 0.8) status = "under";
      else if (fleet < need) status = "tight";
      else if (fleet > need) status = "surplus";
      return { type, missions, need, fleet, status };
    }).filter((r) => r.missions > 0 || r.fleet > 0);

    if (fleetDemand.length === 0) {
      fleetDemand = ([...VEHICLE_TYPES] as string[]).map((type) => ({
        type, missions: 0, need: 0, fleet: fleetByType[type] ?? 0, status: "ok",
      }));
    }

    const jobDriverCount = driversSet.size;
    const firstDate = dayJobs[0]?.date ?? "";
    // Priorité daily_op, sinon fallback sur le compte des driver_name des jobs
    const dTotal = dailyOpRecord?.total_drivers ?? jobDriverCount;
    const dWorking = dailyOpRecord?.working ?? jobDriverCount;
    // dFree déjà calculé plus haut (utilisé pour revPerDriver)
    result[key] = {
      dateIso: firstDate,
      label: `${key} ${firstDate ? parseDate(firstDate).y : ""}`.trim() || key,
      drivers: {
        total: dTotal,
        working: dWorking,
        pool: dailyOpRecord?.pool ?? 0,
        free: dFree,
        off: Math.max(0, dTotal - dWorking),
        sick: 0,
        leave: 0,
      },
      jobs: counts,
      revenue: {
        horsLease: revHorsLease,
        internalRev,
        externalRev,
        revPerDriver,
        jobPerDriver,
        avgPrice,
      },
      providers,
      perf,
      topClients,
      verticals,
      fleetDemand,
    };
  }

  return result;
}

export interface MonthlyMonth {
  label: string;
  days: number[];
  amount: number[];
  amountTotal: number[];
  jobs: number[];
  free: number[];
  working: number[];
  pctWorking: number[];
  revDriver: number[];
  LT: number[];
  LH: number[];
  ST: number[];
  SH: number[];
  S: number[];
  T: number[];
  H: number[];
  billingAccounts: { name: string; rev: number; revEur: number; jobs: number; hasLease: boolean }[];
  providers: { name: string; type: string; rev: number; jobs: number; pct: number }[];
  verticals: { name: string; rev: number; jobs: number; color: string; pct: number }[];
  driverPerf: { name: string; rev: number; jobs: number; revPerJob: number }[];
  /** Nombre de chauffeurs uniques ayant travaillé ce mois */
  uniqueDrivers: number;
  /** Missions hors-lease par type de véhicule (vehicle_type_assigned/requested) */
  vehicleTypeMissions: Record<string, number>;
}

/** Dérive les données mensuelles à partir des jobs.
 * @param dailyOpMap  map date (YYYY-MM-DD) → { free, pct_working } (source daily_op)
 */
export function deriveMonthlyData(jobs: Job[], dailyOpMap?: Map<string, DailyOpRecord>): Record<string, MonthlyMonth> {
  const byMonth = new Map<string, Job[]>();
  for (const j of jobs) {
    if (!j.date) continue;
    const key = getMonthlyKey(j.date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(j);
  }

  const result: Record<string, MonthlyMonth> = {};
  for (const [key, monthJobs] of byMonth) {
    const byDay = new Map<number, Job[]>();
    for (const j of monthJobs) {
      const { day } = parseDate(j.date);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(j);
    }
    const days = Array.from(byDay.keys()).sort((a, b) => a - b);
    const amount: number[] = [];
    const amountTotal: number[] = [];
    const jobsPerDay: number[] = [];
    const freePerDay: number[] = [];
    const workingPerDay: number[] = [];
    const pctWorkingPerDay: number[] = [];
    const revDriverPerDay: number[] = [];
    const LT: number[] = [];
    const LH: number[] = [];
    const ST: number[] = [];
    const SH: number[] = [];
    const S: number[] = [];
    const T: number[] = [];
    const H: number[] = [];

    for (const d of days) {
      const dayJobs = byDay.get(d) ?? [];
      const counts = countByServiceType(dayJobs);
      const horsLeaseJobs = dayJobs.filter(isHorsLease);
      const rev = horsLeaseJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
      const revTotal = dayJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
      const internalJobs = horsLeaseJobs.filter((j) => j.provider_type === "Internal");
      // Chauffeurs libres & pct_working : priorité daily_op, sinon fallback jobs
      const dateKey = dayJobs[0]?.date ?? "";
      const dop = dailyOpMap?.get(dateKey);
      const freeCount = dop != null ? dop.free : new Set(dayJobs.map((j) => j.driver_name).filter(Boolean)).size;
      const workingCount = dop?.working ?? 0;
      const pctW = dop != null ? dop.pct_working : 0;
      const internalRev = internalJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
      amount.push(rev);
      amountTotal.push(revTotal);
      jobsPerDay.push(dayJobs.length);
      freePerDay.push(freeCount);
      workingPerDay.push(workingCount);
      pctWorkingPerDay.push(pctW);
      // Rev/Driver = revenue interne / Driver Free (daily_op si dispo)
      revDriverPerDay.push(freeCount > 0 ? Math.round(internalRev / freeCount) : 0);
      LT.push(counts.LT);
      LH.push(counts.LH);
      ST.push(counts.ST);
      SH.push(counts.SH);
      S.push(counts.S);
      T.push(counts.T);
      H.push(counts.H);
    }

    const billingMap = new Map<string, { rev: number; revEur: number; jobs: number; hasLease: boolean }>();
    for (const j of monthJobs) {
      const name = (j.billing_account ?? j.main_account ?? "Inconnu").toUpperCase();
      const hasLease = (j.billing_account ?? "").toUpperCase().includes("LEASE");
      if (!billingMap.has(name)) billingMap.set(name, { rev: 0, revEur: 0, jobs: 0, hasLease });
      const b = billingMap.get(name)!;
      b.rev += j.revenue_aed ?? 0;
      b.revEur += j.revenue_eur ?? 0;
      b.jobs += 1;
    }
    const billingAccounts = Array.from(billingMap.entries())
      .map(([name, x]) => ({ name, rev: x.rev, revEur: x.revEur, jobs: x.jobs, hasLease: x.hasLease }))
      .filter((b) => b.rev > 0)
      .sort((a, b) => b.rev - a.rev);

    const providerMap = new Map<string, { rev: number; jobs: number; type: string }>();
    const horsLeaseAll = monthJobs.filter(isHorsLease);
    for (const j of horsLeaseAll) {
      const name = j.provider_name ?? "Inconnu";
      const type = j.provider_type ?? "External";
      if (!providerMap.has(name)) providerMap.set(name, { rev: 0, jobs: 0, type });
      const p = providerMap.get(name)!;
      p.rev += j.revenue_aed ?? 0;
      p.jobs += 1;
    }
    const providers = Array.from(providerMap.entries()).map(([name, p]) => ({
      name,
      type: p.type === "Internal" ? "Internal" : "External",
      rev: p.rev,
      jobs: p.jobs,
      pct: horsLeaseAll.length > 0 ? Number(((p.jobs / horsLeaseAll.length) * 100).toFixed(1)) : 0,
    })).sort((a, b) => {
      if (a.type === "Internal" && b.type !== "Internal") return -1;
      if (a.type !== "Internal" && b.type === "Internal") return 1;
      return b.rev - a.rev;
    });

    // Verticals — tous jobs LT & LH inclus
    const totalRevAllMonth = monthJobs.reduce((s, j) => s + (j.revenue_aed ?? 0), 0);
    const verticalMap = new Map<string, { rev: number; jobs: number }>();
    for (const j of monthJobs) {
      const name = j.vertical && j.vertical.trim() !== "" ? j.vertical : "Autre";
      if (!verticalMap.has(name)) verticalMap.set(name, { rev: 0, jobs: 0 });
      const v = verticalMap.get(name)!;
      v.rev += j.revenue_aed ?? 0;
      v.jobs += 1;
    }
    const verticals = Array.from(verticalMap.entries())
      .map(([name, x]) => ({
        name,
        rev: x.rev,
        jobs: x.jobs,
        color: VERTICAL_COLORS[name] ?? VERTICAL_COLORS.Default,
        pct: totalRevAllMonth > 0 ? Number(((x.rev / totalRevAllMonth) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.rev - a.rev);

    // Performance par chauffeur — Internal, hors LT & LH
    const driverMap = new Map<string, { rev: number; jobs: number }>();
    for (const j of horsLeaseAll.filter((j) => j.provider_type === "Internal")) {
      const name = j.driver_name && j.driver_name.trim() !== "" ? j.driver_name : "Inconnu";
      if (!driverMap.has(name)) driverMap.set(name, { rev: 0, jobs: 0 });
      const d = driverMap.get(name)!;
      d.rev += j.revenue_aed ?? 0;
      d.jobs += 1;
    }
    const driverPerf = Array.from(driverMap.entries())
      .map(([name, x]) => ({ name, rev: x.rev, jobs: x.jobs, revPerJob: x.jobs > 0 ? Math.round(x.rev / x.jobs) : 0 }))
      .sort((a, b) => b.rev - a.rev);

    // Chauffeurs uniques ayant travaillé ce mois
    const uniqueDrivers = new Set(monthJobs.map((j) => j.driver_name).filter(Boolean)).size;

    // Missions hors-lease par type de véhicule réel
    const vehicleTypeMissions: Record<string, number> = {};
    for (const t of VEHICLE_TYPES) vehicleTypeMissions[t] = 0;
    for (const j of horsLeaseAll) {
      const t = normalizeVehicleType(j.vehicle_type_assigned || j.vehicle_type_requested);
      if (t in vehicleTypeMissions) vehicleTypeMissions[t] = (vehicleTypeMissions[t] ?? 0) + 1;
      else vehicleTypeMissions[t] = (vehicleTypeMissions[t] ?? 0) + 1;
    }

    result[key] = {
      label: key,
      days,
      amount,
      amountTotal,
      jobs: jobsPerDay,
      free: freePerDay,
      working: workingPerDay,
      pctWorking: pctWorkingPerDay,
      revDriver: revDriverPerDay,
      LT,
      LH,
      ST,
      SH,
      S,
      T,
      H,
      billingAccounts,
      providers,
      verticals,
      driverPerf,
      uniqueDrivers,
      vehicleTypeMissions,
    };
  }
  return result;
}

export interface AnnualData {
  months: string[];
  amount2025: (number | null)[];
  amount2026: (number | null)[];
  revPerDriver2025: (number | null)[];
  revPerDriver2026: (number | null)[];
  jobs2025: (number | null)[];
  jobs2026: (number | null)[];
  freeAvg2025: (number | null)[];
  freeAvg2026: (number | null)[];
  verticals2025: { name: string; rev: number; jobs: number; color: string; pct: number }[];
  verticals2026: { name: string; rev: number; jobs: number; color: string; pct: number }[];
}

/** Dérive les données annuelles (2025 vs 2026) à partir des jobs. */
export function deriveAnnual(jobs: Job[], dailyOpMap?: Map<string, DailyOpRecord>): AnnualData {
  const monthly = deriveMonthlyData(jobs, dailyOpMap);
  const months = MONTHS;
  const amount2025: (number | null)[] = new Array(12).fill(null);
  const amount2026: (number | null)[] = new Array(12).fill(null);
  const revPerDriver2025: (number | null)[] = new Array(12).fill(null);
  const revPerDriver2026: (number | null)[] = new Array(12).fill(null);
  const jobs2025: (number | null)[] = new Array(12).fill(null);
  const jobs2026: (number | null)[] = new Array(12).fill(null);
  const freeAvg2025: (number | null)[] = new Array(12).fill(null);
  const freeAvg2026: (number | null)[] = new Array(12).fill(null);

  const vertMap2025 = new Map<string, { rev: number; jobs: number }>();
  const vertMap2026 = new Map<string, { rev: number; jobs: number }>();
  let totalRev2025 = 0;
  let totalRev2026 = 0;

  for (let i = 0; i < 12; i++) {
    const slug = MONTH_SLUGS[i];
    const key2025 = Object.keys(monthly).find((k) => k.includes("2025") && k.toLowerCase().includes(slug));
    const key2026 = Object.keys(monthly).find((k) => k.includes("2026") && k.toLowerCase().includes(slug));
    if (key2025 && monthly[key2025]) {
      const m = monthly[key2025];
      amount2025[i] = m.amountTotal.reduce((s, v) => s + v, 0);
      jobs2025[i] = m.jobs.reduce((s, v) => s + v, 0);
      revPerDriver2025[i] = m.revDriver.length ? Math.round(m.revDriver.reduce((s, v) => s + v, 0) / m.revDriver.length) : null;
      freeAvg2025[i] = m.free.length ? Math.round(m.free.reduce((s, v) => s + v, 0) / m.free.length * 10) / 10 : null;
      for (const v of m.verticals) {
        const e = vertMap2025.get(v.name);
        if (e) { e.rev += v.rev; e.jobs += v.jobs; } else { vertMap2025.set(v.name, { rev: v.rev, jobs: v.jobs }); }
        totalRev2025 += v.rev;
      }
    }
    if (key2026 && monthly[key2026]) {
      const m = monthly[key2026];
      amount2026[i] = m.amountTotal.reduce((s, v) => s + v, 0);
      jobs2026[i] = m.jobs.reduce((s, v) => s + v, 0);
      revPerDriver2026[i] = m.revDriver.length ? Math.round(m.revDriver.reduce((s, v) => s + v, 0) / m.revDriver.length) : null;
      freeAvg2026[i] = m.free.length ? Math.round(m.free.reduce((s, v) => s + v, 0) / m.free.length * 10) / 10 : null;
      for (const v of m.verticals) {
        const e = vertMap2026.get(v.name);
        if (e) { e.rev += v.rev; e.jobs += v.jobs; } else { vertMap2026.set(v.name, { rev: v.rev, jobs: v.jobs }); }
        totalRev2026 += v.rev;
      }
    }
  }

  const toVerticals = (map: Map<string, { rev: number; jobs: number }>, total: number) =>
    Array.from(map.entries())
      .map(([name, x]) => ({
        name,
        rev: x.rev,
        jobs: x.jobs,
        color: VERTICAL_COLORS[name] ?? VERTICAL_COLORS.Default,
        pct: total > 0 ? Number(((x.rev / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.rev - a.rev);

  return {
    months,
    amount2025,
    amount2026,
    revPerDriver2025,
    revPerDriver2026,
    jobs2025,
    jobs2026,
    freeAvg2025,
    freeAvg2026,
    verticals2025: toVerticals(vertMap2025, totalRev2025),
    verticals2026: toVerticals(vertMap2026, totalRev2026),
  };
}
