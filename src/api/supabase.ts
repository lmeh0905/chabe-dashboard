/**
 * src/api/supabase.ts
 * Remplace src/api/xano.ts — mêmes signatures exportées, backend Supabase.
 */
import { createClient } from "@supabase/supabase-js";

// ─── Client Supabase ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  allowedTabs?: string[];
  /** Granular permissions: tab_id → access_level */
  permissions?: Record<string, "view" | "edit">;
}

export interface Role {
  id: number;
  name: string;
  label: string;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from("roles").select("id, name, label").order("id");
  if (error) throw error;
  return (data ?? []) as Role[];
}

export async function createRole(name: string, label: string): Promise<Role> {
  const { data, error } = await supabase.from("roles").insert({ name: name.trim(), label: label.trim() }).select().single();
  if (error) throw error;
  return data as Role;
}

export async function deleteRole(id: number): Promise<void> {
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw error;
}

// ─── Role Permissions ────────────────────────────────────────────────────────

export interface RolePermission {
  id: number;
  role_name: string;
  tab_id: string;
  access_level: "view" | "edit";
}

export interface TabPermission {
  tab_id: string;
  access_level: "view" | "edit";
}

export async function fetchRolePermissions(): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("id, role_name, tab_id, access_level")
    .order("role_name");
  if (error) throw error;
  return (data ?? []) as RolePermission[];
}

export async function fetchPermissionsForRole(roleName: string): Promise<TabPermission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("tab_id, access_level")
    .eq("role_name", roleName);
  if (error) throw error;
  return (data ?? []) as TabPermission[];
}

export async function setRolePermissions(
  roleName: string,
  permissions: { tab_id: string; access_level: "view" | "edit" }[]
): Promise<void> {
  const { error: delError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_name", roleName);
  if (delError) throw delError;

  if (permissions.length > 0) {
    const rows = permissions.map((p) => ({
      role_name: roleName,
      tab_id: p.tab_id,
      access_level: p.access_level,
    }));
    const { error: insError } = await supabase
      .from("role_permissions")
      .insert(rows);
    if (insError) throw insError;
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(cb: (session: import("@supabase/supabase-js").Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id,name,role,email")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  // Fetch allowed tabs + access levels for this role
  const { data: perms } = await supabase
    .from("role_permissions")
    .select("tab_id, access_level")
    .eq("role_name", data.role);

  const permsList = (perms ?? []) as { tab_id: string; access_level: string }[];

  return {
    ...(data as UserProfile),
    allowedTabs: permsList.map((p) => p.tab_id),
    permissions: Object.fromEntries(
      permsList.map((p) => [p.tab_id, p.access_level as "view" | "edit"])
    ),
  };
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function fetchProfiles(): Promise<UserProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, role, email")
    .order("name");
  return (data ?? []) as UserProfile[];
}

async function invokeFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Tenter d'extraire le vrai message depuis le corps de la réponse
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any).context;
      if (ctx) {
        const json = await ctx.json();
        if (json?.error) throw new Error(json.error);
      }
    } catch (inner) {
      if (inner instanceof Error && inner.message !== error.message) throw inner;
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function inviteUser(email: string, name: string, role: string) {
  return invokeFunction("invite-user", { email, name, role });
}

export async function deleteUser(userId: string) {
  return invokeFunction("delete-user", { userId });
}

export async function updateUserRole(userId: string, role: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Types (identiques à xano.ts) ────────────────────────────────────────────

export type FleetLocation = "Lease" | "Office";
export type EngineSize = number | "Electric";

export interface FleetVehicle {
  plate: string;
  make: string;
  model: string;       // modelName + trim (pour affichage)
  modelName: string;   // nom du modèle seul (sans trim)
  trim?: string | null;
  vehicleType?: string | null;  // type issu de la table models (S Class, V Class, etc.)
  fuel: string;
  extColor: string;
  intColor: string;
  year: number;
  vin?: string | null;
  engineSize?: EngineSize | null;
  co2?: string | null;
  operationDate?: string | null;
  status?: string | null;
  location: FleetLocation;
  locationName?: string | null;  // nom réel ex: "Bvlgari Hotel Dubai" ou "CHABE Office"
  hotel?: string | null;
  leaseAmount?: number | null;
  leaseStatus?: string | null;
  leaseEnd?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  bank?: string | null;
  loanAmount?: number | null;
  loanEMI?: number | null;
  loanTenure?: number | null;
  interestRate?: number | null;
  endOfLoan?: string | null;
  insurance?: string | null;
  insurancePayment?: number | null;
  insuranceDue?: string | null;
  km?: number | null;
  avgKmMonth?: number | null;
  serviceInterval: number;
  lastServiceKm: number;
  photoUrls?: string[];
  loanContractUrl?: string | null;
  insuranceUrl?: string | null;
  mulkiyaFrontUrl?: string | null;
  mulkiyaBackUrl?: string | null;
  soldDate?: string | null;
  soldPrice?: number | null;
  soldTo?: string | null;
  depMonthlyOverride?: number | null;
  _makesId?: number | string | null;
  _modelsId?: number | string | null;
  _locationId?: number | string | null;
}

export interface Job {
  id: number;
  source_id?: number;
  folder?: number;
  job_number?: number;
  status?: string;
  date: string;
  week_number?: number;
  vertical?: string;
  main_account?: string;
  billing_account?: string;
  invoice_number?: string;
  service_type_high?: string;
  service_type_mid?: string;
  service_type_low?: string;
  provider_type?: string;
  provider_name?: string;
  driver_name?: string;
  vehicle_type_requested?: string;
  vehicle_type_assigned?: string;
  vehicle_plate?: string;
  pickup_location?: string;
  dropoff_location?: string;
  lead_time_fine?: string;
  lead_time_broad?: string;
  lead_time_hours?: number;
  revenue_aed?: number;
  revenue_eur?: number;
  hourly_revenue_aed?: number;
  hourly_revenue_eur?: number;
  cost_aed?: number;
  cost_eur?: number;
  gross_margin?: number;
  exchange_rate?: number;
  duration_hours?: number;
  salesforce_id?: string;
  agency_group?: string;
  agency?: string;
  erp_instance?: string;
  bau_event?: string;
  service_provider_country?: string;
  currency_exchange_code?: string;
}

export type JobInput = Partial<Omit<Job, "id">> & { date: string };

export interface DailyOpRaw {
  id?: number;
  date: string;
  total_drivers?: number;
  working?: number;
  pool?: number;
  free?: number;
  pct_working?: number;
  off?: number;
  sick?: number;
  leave?: number;
}

export interface DailyOpInput {
  date: string;
  total_drivers: number;
  working: number;
  pool: number;
  free: number;
  pct_working: number;
  off?: number;
  sick?: number;
  leave?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type VehicleRow = Record<string, unknown> & {
  makes?: { id: number; name: string } | null;
  models?: { id: number; name: string; vehicle_type?: string } | null;
  locations?: { id: number; name: string; type?: string; full_name?: string } | null;
};

function normalizeVehicle(v: VehicleRow): FleetVehicle {
  const makesObj = v.makes ?? {};
  const modelsObj = v.models ?? {};
  const locationObj = v.locations ?? {};

  const engineSizeRaw = v.engine_size as unknown;
  const engineSize: EngineSize | null =
    engineSizeRaw === "Electric"
      ? "Electric"
      : typeof engineSizeRaw === "number"
        ? engineSizeRaw
        : engineSizeRaw != null && engineSizeRaw !== ""
          ? (Number(engineSizeRaw) as unknown as EngineSize)
          : null;

  const co2Raw = v.co2;
  const co2 =
    typeof co2Raw === "number" || typeof co2Raw === "string"
      ? `${co2Raw} g/km`
      : "";

  const locType = (locationObj as { type?: string }).type ?? "";
  const isLease = locType === "lease";
  const locationName =
    (locationObj as { full_name?: string }).full_name ||
    (locationObj as { name?: string }).name ||
    null;

  const modelNameStr = String((modelsObj as { name?: string }).name ?? "");
  const trimStr = v.trim ? String(v.trim) : null;

  return {
    plate: String(v.plate ?? ""),
    make: String((makesObj as { name?: string }).name ?? ""),
    model: [modelNameStr, trimStr].filter(Boolean).join(" "),
    modelName: modelNameStr,
    trim: trimStr,
    vehicleType: (modelsObj as { vehicle_type?: string | null }).vehicle_type ?? null,
    fuel: String(v.fuel ?? ""),
    extColor: String(v.ext_color ?? ""),
    intColor: String(v.int_color ?? ""),
    year: typeof v.year === "number" ? v.year : Number(v.year ?? 0),
    vin: (v.vin as string | null) ?? null,
    engineSize,
    co2,
    operationDate: (v.operation_date as string | null) ?? null,
    status: (v.status as string | null) ?? null,
    location: isLease ? "Lease" : "Office",
    locationName,
    hotel: isLease ? ((locationObj as { name?: string }).name ?? null) : null,
    leaseAmount: (v.lease_amount as number | null) ?? null,
    leaseStatus: (v.lease_status as string | null) ?? null,
    leaseEnd: (v.lease_end as string | null) ?? null,
    purchaseDate: (v.purchase_date as string | null) ?? null,
    purchaseAmount: (v.purchase_amount as number | null) ?? null,
    bank: (v.bank as string | null) ?? null,
    loanAmount: (v.loan_amount as number | null) ?? null,
    loanEMI: (v.loan_emi as number | null) ?? null,
    loanTenure: (v.loan_tenure as number | null) ?? null,
    interestRate: (v.interest_rate as number | null) ?? null,
    endOfLoan: (v.end_of_loan as string | null) ?? null,
    insurance: (v.insurance as string | null) ?? null,
    insurancePayment: (v.insurance_payment as number | null) ?? null,
    insuranceDue: (v.insurance_due as string | null) ?? null,
    km: (v.km as number | null) ?? null,
    avgKmMonth: (v.avg_km_month as number | null) ?? null,
    serviceInterval: (v.service_interval as number) ?? 10000,
    lastServiceKm: (v.last_service_km as number) ?? 0,
    photoUrls: (v.photo_urls as string[] | null) ?? [],
    loanContractUrl: (v.loan_contract_url as string | null) ?? null,
    insuranceUrl: (v.insurance_url as string | null) ?? null,
    mulkiyaFrontUrl: (v.mulkiya_front_url as string | null) ?? null,
    mulkiyaBackUrl: (v.mulkiya_back_url as string | null) ?? null,
    soldDate: (v.sold_date as string | null) ?? null,
    soldPrice: (v.sold_price as number | null) ?? null,
    soldTo: (v.sold_to as string | null) ?? null,
    depMonthlyOverride: (v.dep_monthly_override as number | null) ?? null,
    _makesId: (v.makes_id as number | null) ?? null,
    _modelsId: (v.models_id as number | null) ?? null,
    _locationId: (v.location_id as number | null) ?? null,
  };
}

type JobRow = Record<string, unknown>;

function normalizeJob(r: JobRow): Job {
  return {
    id: (r.id as number) ?? 0,
    source_id: r.source_id as number | undefined,
    folder: r.folder as number | undefined,
    job_number: r.job_number as number | undefined,
    status: r.status as string | undefined,
    date: String(r.date ?? ""),
    week_number: r.week_number as number | undefined,
    vertical: r.vertical as string | undefined,
    main_account: r.main_account as string | undefined,
    billing_account: r.billing_account as string | undefined,
    invoice_number: r.invoice_number as string | undefined,
    service_type_high: r.service_type_high as string | undefined,
    service_type_mid: r.service_type_mid as string | undefined,
    service_type_low: r.service_type_low as string | undefined,
    provider_type: r.provider_type as string | undefined,
    provider_name: r.provider_name as string | undefined,
    driver_name: r.driver_name as string | undefined,
    vehicle_type_requested: r.vehicle_type_requested as string | undefined,
    vehicle_type_assigned: r.vehicle_type_assigned as string | undefined,
    vehicle_plate: r.vehicle_plate as string | undefined,
    pickup_location: r.pickup_location as string | undefined,
    dropoff_location: r.dropoff_location as string | undefined,
    lead_time_fine: r.lead_time_fine as string | undefined,
    lead_time_broad: r.lead_time_broad as string | undefined,
    lead_time_hours: r.lead_time_hours != null ? Number(r.lead_time_hours) : undefined,
    revenue_aed: r.revenue_aed != null ? Number(r.revenue_aed) : undefined,
    revenue_eur: r.revenue_eur != null ? Number(r.revenue_eur) : undefined,
    hourly_revenue_aed: r.hourly_revenue_aed != null ? Number(r.hourly_revenue_aed) : undefined,
    hourly_revenue_eur: r.hourly_revenue_eur != null ? Number(r.hourly_revenue_eur) : undefined,
    cost_aed: r.cost_aed != null ? Number(r.cost_aed) : undefined,
    cost_eur: r.cost_eur != null ? Number(r.cost_eur) : undefined,
    gross_margin: r.gross_margin != null ? Number(r.gross_margin) : undefined,
    exchange_rate: r.exchange_rate != null ? Number(r.exchange_rate) : undefined,
    duration_hours: r.duration_hours != null ? Number(r.duration_hours) : undefined,
    salesforce_id: r.salesforce_id as string | undefined,
    agency_group: r.agency_group as string | undefined,
    agency: r.agency as string | undefined,
    erp_instance: r.erp_instance as string | undefined,
    bau_event: r.bau_event as string | undefined,
    service_provider_country: r.service_provider_country as string | undefined,
    currency_exchange_code: r.currency_exchange_code as string | undefined,
  };
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function fetchAllVehicles(): Promise<FleetVehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(`
      *,
      makes ( id, name ),
      models ( id, name, vehicle_type ),
      locations ( id, name, type, full_name )
    `)
    .order("id");

  if (error) throw new Error(`fetchAllVehicles: ${error.message}`);
  return (data ?? []).map((v) => normalizeVehicle(v as VehicleRow));
}

// ─── Daily Op ─────────────────────────────────────────────────────────────────

export async function fetchDailyOp(opts?: { date?: string; dateStart?: string; dateEnd?: string }): Promise<DailyOpRaw[]> {
  let query = supabase.from("daily_op").select("*").order("date", { ascending: false });
  if (opts?.date) {
    query = query.eq("date", opts.date);
  } else {
    if (opts?.dateStart) query = query.gte("date", opts.dateStart);
    if (opts?.dateEnd) query = query.lte("date", opts.dateEnd);
  }
  const { data, error } = await query;
  if (error) throw new Error(`fetchDailyOp: ${error.message}`);
  return (data ?? []) as DailyOpRaw[];
}

export async function submitDailyOp(body: DailyOpInput): Promise<unknown> {
  // Upsert sur date (index unique)
  const { data, error } = await supabase
    .from("daily_op")
    .upsert(body, { onConflict: "date" })
    .select()
    .single();
  if (error) throw new Error(`submitDailyOp: ${error.message}`);
  return data;
}

export async function deleteDailyOp(id: number): Promise<void> {
  const { error } = await supabase.from("daily_op").delete().eq("id", id);
  if (error) throw new Error(`deleteDailyOp: ${error.message}`);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/** Plafond Supabase PostgREST par requête (configurable jusqu'à 1000 par défaut) */
const PAGE_SIZE = 1000;

/** Colonnes réellement utilisées par les vues du dashboard (11 + id + week_number) */
const JOBS_COLUMNS =
  "id, date, week_number, service_type_low, revenue_aed, revenue_eur, " +
  "provider_type, provider_name, driver_name, " +
  "billing_account, main_account, vertical, " +
  "vehicle_type_assigned, vehicle_type_requested, bau_event";

/** Ne charger que les 2 dernières années — largement suffisant pour toutes les vues */
const JOBS_DATE_FROM = "2024-01-01";

export async function fetchJobs(opts?: {
  date?: string;
  dateStart?: string;
  dateEnd?: string;
}): Promise<Job[]> {
  // Pagination automatique pour dépasser la limite Supabase de 1000 lignes
  const allRows: JobRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("jobs")
      .select("*")
      .order("date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (opts?.date) {
      query = query.eq("date", opts.date);
    } else if (opts?.dateStart && opts?.dateEnd) {
      query = query.gte("date", opts.dateStart).lte("date", opts.dateEnd);
    }

    const { data, error } = await query;
    if (error) throw new Error(`fetchJobs: ${error.message}`);
    const rows = data ?? [];
    allRows.push(...(rows as JobRow[]));

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(normalizeJob);
}

export async function fetchAllJobs(): Promise<Job[]> {
  // 1. Récupérer le nombre total de lignes
  const { count, error: countErr } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .gte("date", JOBS_DATE_FROM);

  if (countErr) throw new Error(`fetchAllJobs count: ${countErr.message}`);
  const total = count ?? 0;
  if (total === 0) return [];

  // 2. Calculer toutes les pages et les charger EN PARALLÈLE
  const numPages = Math.ceil(total / PAGE_SIZE);
  const pagePromises = Array.from({ length: numPages }, (_, i) =>
    supabase
      .from("jobs")
      .select(JOBS_COLUMNS)
      .gte("date", JOBS_DATE_FROM)
      .order("date", { ascending: false })
      .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
  );

  const results = await Promise.all(pagePromises);
  const allRows: JobRow[] = [];
  for (const { data, error } of results) {
    if (error) throw new Error(`fetchAllJobs page: ${error.message}`);
    allRows.push(...((data ?? []) as unknown as JobRow[]));
  }

  return allRows.map(normalizeJob);
}

export async function getExistingSalesforceIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("jobs")
    .select("salesforce_id")
    .not("salesforce_id", "is", null);

  if (error) throw new Error(`getExistingSalesforceIds: ${error.message}`);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const sid = (row as { salesforce_id?: string }).salesforce_id;
    if (sid && sid.trim() !== "") ids.add(sid.trim());
  }
  return ids;
}

export async function createJob(job: JobInput): Promise<unknown> {
  const { data, error } = await supabase
    .from("jobs")
    .insert(job)
    .select()
    .single();
  if (error) throw new Error(`createJob: ${error.message}`);
  return data;
}

/**
 * Insère plusieurs jobs d'un coup (import Excel).
 * Retourne le nombre inséré.
 */
export async function bulkInsertJobs(jobs: JobInput[]): Promise<number> {
  if (jobs.length === 0) return 0;

  const BATCH = 500;
  let upserted = 0;

  // Séparer les jobs avec et sans salesforce_id
  const withSfId = jobs.filter((j) => j.salesforce_id && String(j.salesforce_id).trim() !== "");
  const withoutSfId = jobs.filter((j) => !j.salesforce_id || String(j.salesforce_id).trim() === "");

  // Upsert par salesforce_id pour les jobs identifiés
  for (let i = 0; i < withSfId.length; i += BATCH) {
    const batch = withSfId.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "salesforce_id", ignoreDuplicates: false })
      .select("id");
    if (error) throw new Error(`bulkInsertJobs (upsert) batch ${i}: ${error.message}`);
    upserted += data?.length ?? batch.length;
  }

  // Insert simple pour les jobs sans salesforce_id (pas de déduplification possible)
  for (let i = 0; i < withoutSfId.length; i += BATCH) {
    const batch = withoutSfId.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("jobs")
      .insert(batch)
      .select("id");
    if (error) throw new Error(`bulkInsertJobs (insert) batch ${i}: ${error.message}`);
    upserted += data?.length ?? batch.length;
  }

  return upserted;
}

export async function deleteJob(jobId: number): Promise<void> {
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(`deleteJob: ${error.message}`);
}

export async function deleteJobsByDate(dateStart: string, dateEnd: string): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .delete()
    .gte("date", dateStart)
    .lte("date", dateEnd);
  if (error) throw new Error(`deleteJobsByDate: ${error.message}`);
}

// ─── Vehicle Expenses ─────────────────────────────────────────────────────────

export type ExpenseType = "Carburant" | "Entretien" | "Réparation" | "Salik/Divers";

export interface VehicleExpense {
  id: number;
  plate: string;
  date: string;
  type: ExpenseType;
  amount_aed: number;
  description?: string | null;
  km?: number | null;
  created_at?: string;
}

export type VehicleExpenseInput = Omit<VehicleExpense, "id" | "created_at">;

export async function fetchExpenses(plate?: string): Promise<VehicleExpense[]> {
  let q = supabase.from("vehicle_expenses").select("*").order("date", { ascending: false });
  if (plate) q = q.eq("plate", plate);
  const { data, error } = await q;
  if (error) throw new Error(`fetchExpenses: ${error.message}`);
  return (data ?? []) as VehicleExpense[];
}

export async function createExpense(expense: VehicleExpenseInput): Promise<VehicleExpense> {
  const { data, error } = await supabase.from("vehicle_expenses").insert(expense).select().single();
  if (error) throw new Error(`createExpense: ${error.message}`);
  return data as VehicleExpense;
}

export async function deleteExpense(id: number): Promise<void> {
  const { error } = await supabase.from("vehicle_expenses").delete().eq("id", id);
  if (error) throw new Error(`deleteExpense: ${error.message}`);
}

// ─── Vehicle Unavailabilities ─────────────────────────────────────────────────

export interface VehicleUnavailability {
  id: number;
  plate: string;
  start_date: string;
  end_date?: string | null;
  reason?: string | null;
  status: "active" | "resolved";
  created_at?: string;
}

export type VehicleUnavailabilityInput = Omit<VehicleUnavailability, "id" | "created_at">;

export async function fetchUnavailabilities(): Promise<VehicleUnavailability[]> {
  const { data, error } = await supabase
    .from("vehicle_unavailabilities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`fetchUnavailabilities: ${error.message}`);
  return (data ?? []) as VehicleUnavailability[];
}

export async function createUnavailability(u: VehicleUnavailabilityInput): Promise<VehicleUnavailability> {
  const { data, error } = await supabase.from("vehicle_unavailabilities").insert(u).select().single();
  if (error) throw new Error(`createUnavailability: ${error.message}`);
  return data as VehicleUnavailability;
}

export async function resolveUnavailability(id: number): Promise<void> {
  const { error } = await supabase.from("vehicle_unavailabilities").update({ status: "resolved" }).eq("id", id);
  if (error) throw new Error(`resolveUnavailability: ${error.message}`);
}

export async function updateUnavailability(id: number, fields: Partial<VehicleUnavailabilityInput>): Promise<VehicleUnavailability> {
  const { data, error } = await supabase.from("vehicle_unavailabilities").update(fields).eq("id", id).select().single();
  if (error) throw new Error(`updateUnavailability: ${error.message}`);
  return data as VehicleUnavailability;
}

// ─── Unavailability Reasons ───────────────────────────────────────────────────

export interface UnavailabilityReason {
  id: number;
  label: string;
  created_at?: string;
}

export async function fetchUnavailabilityReasons(): Promise<UnavailabilityReason[]> {
  const { data, error } = await supabase.from("unavailability_reasons").select("*").order("id");
  if (error) throw new Error(`fetchUnavailabilityReasons: ${error.message}`);
  return (data ?? []) as UnavailabilityReason[];
}

export async function createUnavailabilityReason(label: string): Promise<UnavailabilityReason> {
  const { data, error } = await supabase.from("unavailability_reasons").insert({ label }).select().single();
  if (error) throw new Error(`createUnavailabilityReason: ${error.message}`);
  return data as UnavailabilityReason;
}

export async function deleteUnavailabilityReason(id: number): Promise<void> {
  const { error } = await supabase.from("unavailability_reasons").delete().eq("id", id);
  if (error) throw new Error(`deleteUnavailabilityReason: ${error.message}`);
}

// ─── Vehicle Update ───────────────────────────────────────────────────────────

export interface VehicleUpdateInput {
  makes_id?: number | null;
  models_id?: number | null;
  trim?: string | null;
  year?: number | null;
  km?: number | null;
  status?: string | null;
  location_id?: number | null;
  fuel?: string | null;
  ext_color?: string | null;
  int_color?: string | null;
  service_interval?: number | null;
  last_service_km?: number | null;
  purchase_amount?: number | null;
  loan_amount?: number | null;
  loan_emi?: number | null;
  end_of_loan?: string | null;
  insurance?: string | null;
  insurance_payment?: number | null;
  insurance_due?: string | null;
  lease_amount?: number | null;
  lease_end?: string | null;
  photo_urls?: string[];
  loan_contract_url?: string | null;
  insurance_url?: string | null;
  mulkiya_front_url?: string | null;
  mulkiya_back_url?: string | null;
  sold_date?: string | null;
  sold_price?: number | null;
  sold_to?: string | null;
  dep_monthly_override?: number | null;
}

export async function updateVehicle(plate: string, updates: VehicleUpdateInput): Promise<void> {
  const { error } = await supabase.from("vehicles").update(updates).eq("plate", plate);
  if (error) throw new Error(`updateVehicle: ${error.message}`);
}

// ─── Reference Data : Makes ───────────────────────────────────────────────────

export interface Make {
  id: number;
  name: string;
}
export type MakeInput = { name: string };

export async function fetchMakes(): Promise<Make[]> {
  const { data, error } = await supabase.from("makes").select("id, name").order("name");
  if (error) throw new Error(`fetchMakes: ${error.message}`);
  return (data ?? []) as Make[];
}

export async function createMake(input: MakeInput): Promise<Make> {
  const { data, error } = await supabase.from("makes").insert(input).select().single();
  if (error) throw new Error(`createMake: ${error.message}`);
  return data as Make;
}

export async function deleteMake(id: number): Promise<void> {
  const { error } = await supabase.from("makes").delete().eq("id", id);
  if (error) throw new Error(`deleteMake: ${error.message}`);
}

// ─── Reference Data : Models ──────────────────────────────────────────────────

export interface VehicleType {
  id: number;
  name: string;
  sort_order: number;
}

export async function fetchVehicleTypes(): Promise<VehicleType[]> {
  const { data, error } = await supabase
    .from("vehicle_types")
    .select("id, name, sort_order")
    .order("sort_order");
  if (error) throw new Error(`fetchVehicleTypes: ${error.message}`);
  return (data ?? []) as VehicleType[];
}

export interface RefModel {
  id: number;
  name: string;
  vehicle_type?: string | null;
  make_id?: number | null;
}
export type RefModelInput = { name: string; vehicle_type?: string | null; make_id?: number | null };

export async function fetchRefModels(): Promise<RefModel[]> {
  const { data, error } = await supabase
    .from("models")
    .select("id, name, vehicle_type, make_id")
    .order("name");
  if (error) throw new Error(`fetchRefModels: ${error.message}`);
  return (data ?? []) as RefModel[];
}

export async function createRefModel(input: RefModelInput): Promise<RefModel> {
  const { data, error } = await supabase.from("models").insert(input).select().single();
  if (error) throw new Error(`createRefModel: ${error.message}`);
  return data as RefModel;
}

export async function deleteRefModel(id: number): Promise<void> {
  const { error } = await supabase.from("models").delete().eq("id", id);
  if (error) throw new Error(`deleteRefModel: ${error.message}`);
}

// ─── Reference Data : Locations ───────────────────────────────────────────────

export interface RefLocation {
  id: number;
  name: string;
  type?: string | null;
  full_name?: string | null;
}
export type RefLocationInput = { name: string; type?: string | null; full_name?: string | null };

export async function fetchRefLocations(): Promise<RefLocation[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, type, full_name")
    .order("name");
  if (error) throw new Error(`fetchRefLocations: ${error.message}`);
  return (data ?? []) as RefLocation[];
}

export async function createRefLocation(input: RefLocationInput): Promise<RefLocation> {
  const { data, error } = await supabase.from("locations").insert(input).select().single();
  if (error) throw new Error(`createRefLocation: ${error.message}`);
  return data as RefLocation;
}

export async function deleteRefLocation(id: number): Promise<void> {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) throw new Error(`deleteRefLocation: ${error.message}`);
}

// ─── Vehicle Create ────────────────────────────────────────────────────────────

export interface VehicleCreateInput {
  plate: string;
  makes_id: number;
  models_id: number;
  location_id: number;
  year: number;
  fuel: string;
  trim?: string | null;
  ext_color?: string | null;
  int_color?: string | null;
  km?: number | null;
  service_interval?: number;
  last_service_km?: number;
  insurance?: string | null;
  insurance_due?: string | null;
  lease_end?: string | null;
  end_of_loan?: string | null;
  status?: string;
  purchase_amount?: number | null;
  purchase_date?: string | null;
}

export async function createVehicle(input: VehicleCreateInput): Promise<void> {
  const { error } = await supabase.from("vehicles").insert({
    ...input,
    status: input.status ?? "active",
    service_interval: input.service_interval ?? 10000,
    last_service_km: input.last_service_km ?? 0,
  });
  if (error) throw new Error(`createVehicle: ${error.message}`);
}

// ─── Vehicle Asset Upload ─────────────────────────────────────────────────────

export async function uploadVehicleAsset(plate: string, file: File, path: string): Promise<string> {
  const filePath = `${plate}/${path}`;
  const { error } = await supabase.storage
    .from("vehicle-assets")
    .upload(filePath, file, { upsert: true });
  if (error) throw new Error(`uploadVehicleAsset: ${error.message}`);
  const { data } = supabase.storage.from("vehicle-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Check-Ins ────────────────────────────────────────────────────────────────

export interface CheckInRecord {
  id: number;
  session_id: string;
  plate: string;
  driver_name?: string | null;
  driver_id_text?: string | null;
  entry_type: "check_in" | "check_out";
  km?: number | null;
  fuel?: string | null;
  location?: string | null;
  notes?: string | null;
  problem_cat?: string | null;
  problem_photo_url?: string | null;
  checked_in_at?: string;
}

export type CheckInInput = Omit<CheckInRecord, "id">;

export async function fetchCheckIns(opts?: { plate?: string; limit?: number }): Promise<CheckInRecord[]> {
  let q = supabase
    .from("check_ins")
    .select("id, session_id, plate, driver_name, driver_id_text, entry_type, km, fuel, location, notes, checked_in_at")
    .not("entry_type", "is", null)
    .order("checked_in_at", { ascending: false });
  if (opts?.plate) q = q.eq("plate", opts.plate);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`fetchCheckIns: ${error.message}`);
  return (data ?? []) as CheckInRecord[];
}

export async function createCheckIn(input: CheckInInput): Promise<CheckInRecord> {
  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      session_id: input.session_id,
      plate: input.plate,
      driver_name: input.driver_name ?? null,
      driver_id_text: input.driver_id_text ?? null,
      entry_type: input.entry_type,
      km: input.km ?? null,
      fuel: input.fuel ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      problem_cat: input.problem_cat ?? null,
      problem_photo_url: input.problem_photo_url ?? null,
      checked_in_at: input.checked_in_at ?? new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`createCheckIn: ${error.message}`);
  return data as CheckInRecord;
}

export async function getLastCheckout(plate: string): Promise<CheckInRecord | null> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("id, session_id, plate, driver_name, entry_type, km, checked_in_at")
    .eq("plate", plate)
    .eq("entry_type", "check_out")
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLastCheckout: ${error.message}`);
  return data as CheckInRecord | null;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface Staff {
  id: number;
  staffNumber: number;
  name: string;
  designation: string;
  status: string;
  // HR fields
  employeeCode: string | null;
  employeeId: string | null;
  firstName: string | null;
  lastName: string | null;
  category: string;
  dateOfArrival: string | null;
  releaseDate: string | null;
  // Contract (AED)
  basicSalary: number | null;
  housingAllowance: number | null;
  transportAllowance: number | null;
  schoolAllowance: number;
  monthlyBonus: number;
  totalOnContract: number | null;
  // OT Rates
  otHourRate: number;
  otHourRateHoliday: number;
  otDayRate: number;
  // Misc
  isLocal: boolean;
  notes: string | null;
  ticketFrequency: number; // 1 = every year, 2 = every 2 years
}

export interface StaffInput {
  staff_number: number;
  name: string;
  designation: string;
  status?: string;
  employee_code?: string | null;
  employee_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  category?: string;
  date_of_arrival?: string | null;
  release_date?: string | null;
  basic_salary?: number | null;
  housing_allowance?: number | null;
  transport_allowance?: number | null;
  school_allowance?: number;
  monthly_bonus?: number;
  total_on_contract?: number | null;
  ot_hour_rate?: number;
  ot_hour_rate_holiday?: number;
  ot_day_rate?: number;
  is_local?: boolean;
  notes?: string | null;
  ticket_frequency?: number;
}

function normalizeStaff(r: Record<string, unknown>): Staff {
  return {
    id: r.id as number,
    staffNumber: r.staff_number as number,
    name: r.name as string,
    designation: r.designation as string,
    status: (r.status as string) ?? "active",
    employeeCode: (r.employee_code as string) ?? null,
    employeeId: (r.employee_id as string) ?? null,
    firstName: (r.first_name as string) ?? null,
    lastName: (r.last_name as string) ?? null,
    category: (r.category as string) ?? "DRIVER",
    dateOfArrival: (r.date_of_arrival as string) ?? null,
    releaseDate: (r.release_date as string) ?? null,
    basicSalary: r.basic_salary != null ? Number(r.basic_salary) : null,
    housingAllowance: r.housing_allowance != null ? Number(r.housing_allowance) : null,
    transportAllowance: r.transport_allowance != null ? Number(r.transport_allowance) : null,
    schoolAllowance: Number(r.school_allowance) || 0,
    monthlyBonus: Number(r.monthly_bonus) || 0,
    totalOnContract: r.total_on_contract != null ? Number(r.total_on_contract) : null,
    otHourRate: Number(r.ot_hour_rate) || 0,
    otHourRateHoliday: Number(r.ot_hour_rate_holiday) || 0,
    otDayRate: Number(r.ot_day_rate) || 0,
    isLocal: (r.is_local as boolean) ?? false,
    notes: (r.notes as string) ?? null,
    ticketFrequency: r.ticket_frequency != null ? Number(r.ticket_frequency) : 2,
  };
}

export async function fetchStaff(includeInactive = false): Promise<Staff[]> {
  let q = supabase.from("staff").select("*").order("name");
  if (!includeInactive) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) throw new Error(`fetchStaff: ${error.message}`);
  return (data ?? []).map(normalizeStaff);
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  const { data, error } = await supabase.from("staff").insert(input).select().single();
  if (error) throw new Error(`createStaff: ${error.message}`);
  return normalizeStaff(data);
}

export async function updateStaff(id: number, input: Partial<StaffInput>): Promise<void> {
  const { error } = await supabase.from("staff").update(input).eq("id", id);
  if (error) throw new Error(`updateStaff: ${error.message}`);
}

export async function deactivateStaff(id: number): Promise<void> {
  const { error } = await supabase.from("staff").update({ status: "inactive" }).eq("id", id);
  if (error) throw new Error(`deactivateStaff: ${error.message}`);
}

export async function bulkUpsertStaff(records: StaffInput[]): Promise<Staff[]> {
  const results: Staff[] = [];
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("staff")
      .upsert(batch, { onConflict: "staff_number" })
      .select();
    if (error) throw new Error(`bulkUpsertStaff: ${error.message}`);
    results.push(...(data ?? []).map(normalizeStaff));
  }
  return results;
}

// ─── Deductions ──────────────────────────────────────────────────────────────

export type DeductionType = "advance" | "adjustment" | "other";

export interface Deduction {
  id: number;
  staffId: number;
  month: string;
  deductionType: DeductionType;
  amount: number;
  label: string | null;
  totalAmount: number | null;
  installments: number;
  installmentNumber: number;
  groupId: string | null;
}

export interface DeductionInput {
  staff_id: number;
  month: string;
  deduction_type: DeductionType;
  amount: number;
  label?: string | null;
  total_amount?: number | null;
  installments?: number;
  installment_number?: number;
  group_id?: string | null;
}

function normalizeDeduction(r: Record<string, unknown>): Deduction {
  return {
    id: r.id as number,
    staffId: r.staff_id as number,
    month: r.month as string,
    deductionType: r.deduction_type as DeductionType,
    amount: Number(r.amount) || 0,
    label: (r.label as string) ?? null,
    totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
    installments: Number(r.installments) || 1,
    installmentNumber: Number(r.installment_number) || 1,
    groupId: (r.group_id as string) ?? null,
  };
}

export async function fetchDeductions(month: string): Promise<Deduction[]> {
  const { data, error } = await supabase.from("deductions").select("*").eq("month", month).order("staff_id");
  if (error) throw new Error(`fetchDeductions: ${error.message}`);
  return (data ?? []).map((r) => normalizeDeduction(r as Record<string, unknown>));
}

export async function fetchDeductionsByStaff(staffId: number): Promise<Deduction[]> {
  const { data, error } = await supabase.from("deductions").select("*").eq("staff_id", staffId).order("month", { ascending: false });
  if (error) throw new Error(`fetchDeductionsByStaff: ${error.message}`);
  return (data ?? []).map((r) => normalizeDeduction(r as Record<string, unknown>));
}

export async function createDeduction(input: DeductionInput): Promise<Deduction> {
  const { data, error } = await supabase.from("deductions").insert(input).select().single();
  if (error) throw new Error(`createDeduction: ${error.message}`);
  return normalizeDeduction(data as Record<string, unknown>);
}

export async function updateDeduction(id: number, input: Partial<DeductionInput>): Promise<void> {
  const { error } = await supabase.from("deductions").update(input).eq("id", id);
  if (error) throw new Error(`updateDeduction: ${error.message}`);
}

export async function deleteDeduction(id: number): Promise<void> {
  const { error } = await supabase.from("deductions").delete().eq("id", id);
  if (error) throw new Error(`deleteDeduction: ${error.message}`);
}

/** Increment YYYY-MM by n months */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Create N installment deductions spread across consecutive months */
export async function createInstallmentDeductions(input: {
  staff_id: number;
  start_month: string;
  deduction_type: DeductionType;
  total_amount: number;
  installments: number;
  label?: string | null;
}): Promise<Deduction[]> {
  const { staff_id, start_month, deduction_type, total_amount, installments, label } = input;
  const groupId = crypto.randomUUID();
  const monthlyAmount = Math.floor(total_amount / installments);
  const rows: DeductionInput[] = [];
  for (let i = 0; i < installments; i++) {
    const isLast = i === installments - 1;
    rows.push({
      staff_id,
      month: addMonths(start_month, i),
      deduction_type: deduction_type,
      amount: isLast ? total_amount - monthlyAmount * (installments - 1) : monthlyAmount,
      label: label || null,
      total_amount: total_amount,
      installments,
      installment_number: i + 1,
      group_id: groupId,
    });
  }
  const { data, error } = await supabase.from("deductions").insert(rows).select();
  if (error) throw new Error(`createInstallmentDeductions: ${error.message}`);
  return (data ?? []).map((r) => normalizeDeduction(r as Record<string, unknown>));
}

export async function fetchDeductionsByGroup(groupId: string): Promise<Deduction[]> {
  const { data, error } = await supabase.from("deductions").select("*").eq("group_id", groupId).order("installment_number");
  if (error) throw new Error(`fetchDeductionsByGroup: ${error.message}`);
  return (data ?? []).map((r) => normalizeDeduction(r as Record<string, unknown>));
}

export async function deleteDeductionGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("deductions").delete().eq("group_id", groupId);
  if (error) throw new Error(`deleteDeductionGroup: ${error.message}`);
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number;
  staffId: number;
  staffName: string;
  designation: string;
  date: string;
  status: string;
  otHours: number;
}

export async function fetchAttendance(month: number, year: number): Promise<AttendanceRecord[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  const all: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, staff_id, date, status, ot_hours, staff!inner(name, designation)")
      .gte("date", startDate)
      .lte("date", endDate)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`fetchAttendance: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all.map((r) => {
    const s = r.staff as Record<string, unknown> | null;
    return {
      id: r.id as number,
      staffId: r.staff_id as number,
      staffName: (s?.name as string) ?? "",
      designation: (s?.designation as string) ?? "",
      date: r.date as string,
      status: r.status as string,
      otHours: (r.ot_hours as number) ?? 0,
    };
  });
}

export async function fetchAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, staff_id, date, status, ot_hours, staff!inner(name, designation)")
    .eq("date", date);
  if (error) throw new Error(`fetchAttendanceByDate: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => {
    const s = r.staff as Record<string, unknown> | null;
    return {
      id: r.id as number,
      staffId: r.staff_id as number,
      staffName: (s?.name as string) ?? "",
      designation: (s?.designation as string) ?? "",
      date: r.date as string,
      status: r.status as string,
      otHours: (r.ot_hours as number) ?? 0,
    };
  });
}

export async function upsertAttendance(
  staffId: number,
  date: string,
  status: string,
  otHours: number = 0
): Promise<void> {
  const { error } = await supabase
    .from("attendance")
    .upsert({ staff_id: staffId, date, status, ot_hours: otHours }, { onConflict: "staff_id,date" });
  if (error) throw new Error(`upsertAttendance: ${error.message}`);
}

export async function bulkUpsertAttendance(
  records: { staff_id: number; date: string; status: string; ot_hours: number }[]
): Promise<void> {
  if (!records.length) return;
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from("attendance")
      .upsert(batch, { onConflict: "staff_id,date" });
    if (error) throw new Error(`bulkUpsertAttendance: ${error.message}`);
  }
}

// ─── OT Rates ────────────────────────────────────────────────────────────────

export interface OtRate {
  id: number;
  totalSalary: number;
  basicSalary: number;
  otHourRateNormal: number;
  otHourRateHoliday: number;
  otDayRate: number;
  category: string;
  staffName: string | null;
}

export async function fetchOtRates(): Promise<OtRate[]> {
  const { data, error } = await supabase.from("ot_rates").select("*");
  if (error) throw new Error(`fetchOtRates: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    totalSalary: Number(r.total_salary),
    basicSalary: Number(r.basic_salary),
    otHourRateNormal: Number(r.ot_hour_rate_normal),
    otHourRateHoliday: Number(r.ot_hour_rate_holiday),
    otDayRate: Number(r.ot_day_rate),
    category: r.category as string,
    staffName: (r.staff_name as string) ?? null,
  }));
}

// ─── Monthly Recap (HR) ──────────────────────────────────────────────────────

export interface MonthlyRecapRecord {
  id: number;
  staffId: number;
  staffName: string;
  designation: string;
  category: string;
  year: number;
  month: number;
  workingDays: number;
  offDays: number;
  otDays: number;
  sickLeave: number;
  annualLeave: number;
  absent: number;
  halfDay: number;
  holiday: number;
  unpaidLeave: number;
  suspension: number;
  totalDays: number;
  otHours: number;
  otHoursCost: number;
  otDaysCost: number;
  totalOtCost: number;
  hrAdjusted: boolean;
  hrNotes: string | null;
}

export async function fetchMonthlyRecap(month: number, year: number): Promise<MonthlyRecapRecord[]> {
  const { data, error } = await supabase
    .from("monthly_recap")
    .select("*, staff!inner(name, designation, category)")
    .eq("year", year)
    .eq("month", month + 1)
    .order("staff_id");
  if (error) throw new Error(`fetchMonthlyRecap: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => {
    const s = r.staff as Record<string, unknown> | null;
    return {
      id: r.id as number,
      staffId: r.staff_id as number,
      staffName: (s?.name as string) ?? "",
      designation: (s?.designation as string) ?? "",
      category: (s?.category as string) ?? "",
      year: r.year as number,
      month: r.month as number,
      workingDays: (r.working_days as number) ?? 0,
      offDays: (r.off_days as number) ?? 0,
      otDays: (r.ot_days as number) ?? 0,
      sickLeave: (r.sick_leave as number) ?? 0,
      annualLeave: (r.annual_leave as number) ?? 0,
      absent: (r.absent as number) ?? 0,
      halfDay: (r.half_day as number) ?? 0,
      holiday: (r.holiday as number) ?? 0,
      unpaidLeave: (r.unpaid_leave as number) ?? 0,
      suspension: (r.suspension as number) ?? 0,
      totalDays: (r.total_days as number) ?? 0,
      otHours: Number(r.ot_hours),
      otHoursCost: Number(r.ot_hours_cost),
      otDaysCost: Number(r.ot_days_cost),
      totalOtCost: Number(r.total_ot_cost),
      hrAdjusted: (r.hr_adjusted as boolean) ?? false,
      hrNotes: (r.hr_notes as string) ?? null,
    };
  });
}

export async function updateMonthlyRecap(
  id: number,
  fields: Partial<{
    working_days: number;
    off_days: number;
    ot_days: number;
    sick_leave: number;
    annual_leave: number;
    absent: number;
    half_day: number;
    holiday: number;
    unpaid_leave: number;
    suspension: number;
    ot_hours: number;
    ot_hours_cost: number;
    ot_days_cost: number;
    total_ot_cost: number;
    hr_adjusted: boolean;
    hr_notes: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("monthly_recap")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateMonthlyRecap: ${error.message}`);
}

export async function recalcMonthlyRecap(month: number, year: number): Promise<void> {
  // Re-aggregate from attendance and upsert into monthly_recap
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  const { data: att, error: attErr } = await supabase
    .from("attendance")
    .select("staff_id, status, ot_hours")
    .gte("date", startDate)
    .lte("date", endDate);
  if (attErr) throw new Error(`recalcMonthlyRecap: ${attErr.message}`);

  // Aggregate per staff
  const agg: Record<number, { P: number; OD: number; OT: number; SL: number; L: number; A: number; HD: number; H: number; UL: number; SUP: number; total: number; otHours: number }> = {};
  for (const r of att ?? []) {
    const sid = r.staff_id as number;
    if (!agg[sid]) agg[sid] = { P: 0, OD: 0, OT: 0, SL: 0, L: 0, A: 0, HD: 0, H: 0, UL: 0, SUP: 0, total: 0, otHours: 0 };
    const st = r.status as string;
    if (st in agg[sid]) (agg[sid] as Record<string, number>)[st]++;
    agg[sid].total++;
    agg[sid].otHours += Number(r.ot_hours) || 0;
  }

  // Fetch OT rates
  const { data: rates } = await supabase.from("ot_rates").select("*");
  const driverRates = (rates ?? []).filter((r: Record<string, unknown>) => r.category === "DRIVER" && !r.staff_name);
  const cleanerRates = (rates ?? []).filter((r: Record<string, unknown>) => r.category === "CLEANER");

  // Fetch staff for salary matching
  const { data: staffList } = await supabase.from("staff").select("id, name, designation, total_on_contract");

  const records = Object.entries(agg).map(([sidStr, a]) => {
    const sid = Number(sidStr);
    const st = (staffList ?? []).find((s: Record<string, unknown>) => s.id === sid);
    let otHourRate = 0, otDayRate = 0;
    if (st) {
      const desig = st.designation as string;
      const totalSal = Number(st.total_on_contract) || 0;
      if (desig === "LIMO DRIVER") {
        const rate = driverRates.find((r: Record<string, unknown>) => Number(r.total_salary) === totalSal);
        if (rate) { otHourRate = Number(rate.ot_hour_rate_normal); otDayRate = Number(rate.ot_day_rate); }
      } else if (desig === "CAR WASHER") {
        const rate = cleanerRates.find((r: Record<string, unknown>) => r.staff_name === (st.name as string));
        if (rate) { otHourRate = Number(rate.ot_hour_rate_normal); otDayRate = Number(rate.ot_day_rate); }
      }
    }
    return {
      staff_id: sid,
      year,
      month: month + 1,
      working_days: a.P,
      off_days: a.OD,
      ot_days: a.OT,
      sick_leave: a.SL,
      annual_leave: a.L,
      absent: a.A,
      half_day: a.HD,
      holiday: a.H,
      unpaid_leave: a.UL,
      suspension: a.SUP,
      total_days: a.total,
      ot_hours: a.otHours,
      ot_hours_cost: a.otHours * otHourRate,
      ot_days_cost: a.OT * otDayRate,
      total_ot_cost: (a.otHours * otHourRate) + (a.OT * otDayRate),
    };
  });

  if (records.length === 0) return;
  const { error } = await supabase
    .from("monthly_recap")
    .upsert(records, { onConflict: "staff_id,year,month" });
  if (error) throw new Error(`recalcMonthlyRecap upsert: ${error.message}`);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertRecord {
  id: number;
  plate: string;
  type: string;
  message?: string | null;
  km_prev?: number | null;
  km_current?: number | null;
  km_diff?: number | null;
  driver_name?: string | null;
  read: boolean;
  status?: string;
  created_at?: string;
}

export type AlertInput = Omit<AlertRecord, "id" | "created_at">;

export async function fetchAlerts(): Promise<AlertRecord[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("id, plate, type, message, km_prev, km_current, km_diff, driver_name, read, status, created_at")
    .not("plate", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`fetchAlerts: ${error.message}`);
  return (data ?? []) as AlertRecord[];
}

export async function createAlert(input: AlertInput): Promise<AlertRecord> {
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      plate: input.plate,
      type: input.type,
      message: input.message ?? null,
      km_prev: input.km_prev ?? null,
      km_current: input.km_current ?? null,
      km_diff: input.km_diff ?? null,
      driver_name: input.driver_name ?? null,
      read: false,
    })
    .select()
    .single();
  if (error) throw new Error(`createAlert: ${error.message}`);
  return data as AlertRecord;
}

export async function checkServiceAlerts(
  vehicles: FleetVehicle[]
): Promise<void> {
  for (const v of vehicles) {
    // Ignorer les véhicules sans données km configurées
    if (v.km == null || v.km === 0 || v.serviceInterval === 0 || v.lastServiceKm === 0) continue;

    const nextServiceKm = v.lastServiceKm + v.serviceInterval;
    const kmUntilService = nextServiceKm - v.km;
    if (kmUntilService > 2000) continue;

    // Déduplication DB-live : résiste au double-appel React Strict Mode
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("plate", v.plate)
      .eq("type", "service_due")
      .eq("read", false)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const msg =
      kmUntilService <= 0
        ? `Service dépassé de ${Math.abs(kmUntilService).toLocaleString("fr-FR")} km — prévu à ${nextServiceKm.toLocaleString("fr-FR")} km (actuel : ${v.km.toLocaleString("fr-FR")} km)`
        : `Service dans ${kmUntilService.toLocaleString("fr-FR")} km — prévu à ${nextServiceKm.toLocaleString("fr-FR")} km`;

    await createAlert({
      plate: v.plate,
      type: "service_due",
      message: msg,
      km_current: v.km,
      km_prev: nextServiceKm,
      km_diff: kmUntilService,
      read: false,
    });
  }
}

export async function markAlertRead(id: number): Promise<void> {
  const { error } = await supabase.from("alerts").update({ read: true }).eq("id", id);
  if (error) throw new Error(`markAlertRead: ${error.message}`);
}

export async function markAllAlertsRead(): Promise<void> {
  const { error } = await supabase.from("alerts").update({ read: true }).eq("read", false);
  if (error) throw new Error(`markAllAlertsRead: ${error.message}`);
}

export async function updateAlertStatus(id: number, status: string): Promise<void> {
  const { error } = await supabase.from("alerts").update({ status }).eq("id", id);
  if (error) throw new Error(`updateAlertStatus: ${error.message}`);
}

export async function deleteAlert(id: number): Promise<void> {
  const { error } = await supabase.from("alerts").delete().eq("id", id);
  if (error) throw new Error(`deleteAlert: ${error.message}`);
}

// ─── Sales Leads (AI) ─────────────────────────────────────────────────────────

export type LeadType = "upsell" | "churn_risk" | "cross_sell" | "seasonal" | "new_prospect";
export type LeadStatus = "new" | "contacted" | "converted" | "dismissed";
export type LeadConfidence = "high" | "medium" | "low";

export interface ProspectContact {
  name?: string;
  first_name: string;
  last_name: string;
  title: string;
  seniority?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
}

export interface SalesLead {
  id: number;
  lead_type: LeadType;
  title: string;
  description: string;
  action_items: string[];
  action_plan: string | null;
  email_draft: string | null;
  message_draft: string | null;
  confidence: LeadConfidence;
  account_name: string | null;
  vertical: string | null;
  status: LeadStatus;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  contacts: ProspectContact[];
  target_roles: string[];
  linkedin_search_url: string | null;
  next_follow_up: string | null;
  last_contact_date: string | null;
}

/** Generate new sales leads via Claude AI (Edge Function) */
export async function generateSalesLeads(mode: "clients" | "prospects" = "clients", vertical?: string): Promise<SalesLead[]> {
  const body: Record<string, unknown> = { mode };
  if (vertical) body.vertical = vertical;
  const result = await invokeFunction("generate-sales-leads", body);
  return (result?.leads ?? []) as SalesLead[];
}

/** Search Apollo contacts for a company */
export interface ApolloSearchResult {
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  seniority: string | null;
  city: string | null;
  country: string | null;
  organization_name: string | null;
  organization_domain: string | null;
  headline: string | null;
}

/** Enrich a contact via Apollo people/match — reveals email using credits */
export async function enrichContactViaApollo(params: {
  contact_id?: number;
  first_name: string;
  last_name?: string;
  organization_name?: string;
  linkedin_url?: string;
}): Promise<{
  found: boolean;
  enriched: {
    first_name: string; last_name: string | null; email: string | null;
    email_verified: boolean; phone: string | null; linkedin_url: string | null;
    title: string | null; seniority: string | null; city: string | null;
    country: string | null; organization_name: string | null;
    organization_domain: string | null; photo_url: string | null;
  };
  has_email: boolean;
  email_verified: boolean;
}> {
  const result = await invokeFunction("apollo-enrich", params);
  if (!result?.found) throw new Error("Contact not found in Apollo");
  return result;
}

/** Generate email & LinkedIn message on demand for a specific lead */
export async function generateLeadEmail(leadId: number): Promise<{ email_draft: string | null; message_draft: string | null }> {
  const result = await invokeFunction("generate-email", { lead_id: leadId });
  return {
    email_draft: result?.email_draft ?? null,
    message_draft: result?.message_draft ?? null,
  };
}

export async function searchApolloContacts(company: string, opts?: { titles?: string[]; page?: number }): Promise<{
  contacts: ApolloSearchResult[];
  total: number;
  page: number;
  total_pages: number;
}> {
  const body: Record<string, unknown> = { company };
  if (opts?.titles?.length) body.titles = opts.titles;
  if (opts?.page) body.page = opts.page;
  body.per_page = 25;
  const result = await invokeFunction("apollo-search", body);
  return {
    contacts: (result?.contacts ?? []) as ApolloSearchResult[],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    total_pages: result?.total_pages ?? 1,
  };
}

/** Fetch all sales leads, newest first */
export async function fetchSalesLeads(opts?: { status?: LeadStatus; leadType?: LeadType }): Promise<SalesLead[]> {
  let query = supabase.from("sales_leads").select("*").order("created_at", { ascending: false });
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.leadType) query = query.eq("lead_type", opts.leadType);
  const { data, error } = await query;
  if (error) throw new Error(`fetchSalesLeads: ${error.message}`);
  return (data ?? []) as SalesLead[];
}

/** Update lead fields (status, notes, follow-up, last contact) */
export async function updateSalesLead(id: number, updates: {
  status?: LeadStatus;
  notes?: string;
  next_follow_up?: string | null;
  last_contact_date?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("sales_leads").update(updates).eq("id", id);
  if (error) throw new Error(`updateSalesLead: ${error.message}`);
}

/** Delete a sales lead */
export async function deleteSalesLead(id: number): Promise<void> {
  const { error } = await supabase.from("sales_leads").delete().eq("id", id);
  if (error) throw new Error(`deleteSalesLead: ${error.message}`);
}

// ─── Lead Activities (CRM Timeline) ─────────────────────────────────────────

export type ActivityType = "email_sent" | "call" | "meeting" | "linkedin" | "note" | "status_change" | "follow_up";

export interface LeadActivity {
  id: number;
  lead_id: number;
  activity_type: ActivityType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fetch activities for a lead (newest first) */
export async function fetchLeadActivities(leadId: number): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`fetchLeadActivities: ${error.message}`);
  return (data ?? []) as LeadActivity[];
}

/** Activity with lead info — for global activity feed */
export interface ActivityWithLead extends LeadActivity {
  lead_title: string;
  account_name: string | null;
  lead_status: LeadStatus;
}

/** Fetch ALL activities across all leads, with lead title and account name */
export async function fetchAllActivities(opts?: {
  days?: number;
  activityType?: ActivityType;
}): Promise<ActivityWithLead[]> {
  let query = supabase
    .from("lead_activities")
    .select("*, sales_leads!inner(title, account_name, status)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (opts?.days) {
    const since = new Date();
    since.setDate(since.getDate() - opts.days);
    query = query.gte("created_at", since.toISOString());
  }
  if (opts?.activityType) {
    query = query.eq("activity_type", opts.activityType);
  }

  const { data, error } = await query;
  if (error) throw new Error(`fetchAllActivities: ${error.message}`);
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const lead = row.sales_leads as { title: string; account_name: string | null; status: string } | null;
    return {
      id: row.id,
      lead_id: row.lead_id,
      activity_type: row.activity_type,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      lead_title: lead?.title ?? "",
      account_name: lead?.account_name ?? null,
      lead_status: (lead?.status ?? "new") as LeadStatus,
    };
  });
}

/** Create a new activity on a lead */
export async function createLeadActivity(leadId: number, activityType: ActivityType, notes?: string): Promise<LeadActivity> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      activity_type: activityType,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createLeadActivity: ${error.message}`);
  return data as LeadActivity;
}

// ─── Prospect Contacts (Apollo enriched) ─────────────────────────────────────

export type ContactStatus = "discovered" | "engaged" | "responded" | "invalid";

export interface ProspectContactRecord {
  id: number;
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  organization_name: string | null;
  organization_domain: string | null;
  vertical: string | null;
  seniority: string | null;
  city: string | null;
  country: string | null;
  status: ContactStatus;
  email_verified: boolean;
  enrichment_source: string | null;
  created_at: string;
  updated_at: string;
  // computed via junction
  lead_count?: number;
}

export interface ContactActivity {
  id: number;
  contact_id: number;
  activity_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fetch all prospect contacts, with optional search/filter */
export async function fetchProspectContacts(opts?: {
  status?: ContactStatus;
  vertical?: string;
  search?: string;
}): Promise<ProspectContactRecord[]> {
  let query = supabase
    .from("prospect_contacts")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.vertical) query = query.ilike("vertical", opts.vertical);
  if (opts?.search) {
    query = query.or(
      `first_name.ilike.%${opts.search}%,last_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,organization_name.ilike.%${opts.search}%`
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(`fetchProspectContacts: ${error.message}`);
  return (data ?? []) as ProspectContactRecord[];
}

/** Update a prospect contact (status, email, etc.) */
export async function updateProspectContact(id: number, updates: Partial<Pick<ProspectContactRecord, "status" | "email" | "phone" | "title" | "linkedin_url">>): Promise<void> {
  const { error } = await supabase.from("prospect_contacts").update(updates).eq("id", id);
  if (error) throw new Error(`updateProspectContact: ${error.message}`);
}

/** Create a new prospect contact manually */
export async function createProspectContact(contact: {
  first_name: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  organization_name?: string;
  organization_domain?: string;
  vertical?: string;
  seniority?: string;
  city?: string;
  country?: string;
}): Promise<ProspectContactRecord> {
  const { data, error } = await supabase
    .from("prospect_contacts")
    .insert({
      ...contact,
      last_name: contact.last_name || "",
      status: "discovered",
      enrichment_source: "manual",
      email_verified: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createProspectContact: ${error.message}`);
  return data as ProspectContactRecord;
}

/** Link a contact to a lead via junction table */
export async function linkContactToLead(contactId: number, leadId: number, roleContext?: string): Promise<void> {
  const { error } = await supabase
    .from("lead_contacts")
    .upsert(
      { contact_id: contactId, lead_id: leadId, role_context: roleContext || null },
      { onConflict: "lead_id,contact_id" }
    );
  if (error) throw new Error(`linkContactToLead: ${error.message}`);
}

/** Fetch contacts linked to a specific lead via junction table */
export async function fetchContactsForLead(leadId: number): Promise<ProspectContactRecord[]> {
  const { data, error } = await supabase
    .from("lead_contacts")
    .select("contact_id, role_context, prospect_contacts(*)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`fetchContactsForLead: ${error.message}`);
  // Flatten: extract the nested prospect_contacts object
  return (data ?? []).map((row: Record<string, unknown>) => row.prospect_contacts as ProspectContactRecord).filter(Boolean);
}

/** Create an activity on a prospect contact */
export async function createContactActivity(contactId: number, activityType: string, notes?: string): Promise<ContactActivity> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("contact_activities")
    .insert({
      contact_id: contactId,
      activity_type: activityType,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createContactActivity: ${error.message}`);
  return data as ContactActivity;
}

/** Fetch activities for a prospect contact */
export async function fetchContactActivities(contactId: number): Promise<ContactActivity[]> {
  const { data, error } = await supabase
    .from("contact_activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`fetchContactActivities: ${error.message}`);
  return (data ?? []) as ContactActivity[];
}

// ─── Staff Documents ─────────────────────────────────────────────────────────

export type DocumentType = "job_offer_letter" | "contract" | "other";

export interface StaffDocument {
  id: number;
  staffId: number;
  documentType: DocumentType;
  label: string | null;
  fileUrl: string | null;
  fileName: string | null;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffDocumentInput {
  staff_id: number;
  document_type: DocumentType;
  label?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}

function normalizeStaffDocument(r: Record<string, unknown>): StaffDocument {
  return {
    id: r.id as number,
    staffId: r.staff_id as number,
    documentType: r.document_type as DocumentType,
    label: (r.label as string) ?? null,
    fileUrl: (r.file_url as string) ?? null,
    fileName: (r.file_name as string) ?? null,
    validFrom: (r.valid_from as string) ?? null,
    validUntil: (r.valid_until as string) ?? null,
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function fetchStaffDocuments(staffId?: number): Promise<StaffDocument[]> {
  let q = supabase.from("staff_documents").select("*").order("created_at", { ascending: false });
  if (staffId) q = q.eq("staff_id", staffId);
  const { data, error } = await q;
  if (error) throw new Error(`fetchStaffDocuments: ${error.message}`);
  return (data ?? []).map(normalizeStaffDocument);
}

export async function createStaffDocument(input: StaffDocumentInput): Promise<StaffDocument> {
  const { data, error } = await supabase.from("staff_documents").insert(input).select().single();
  if (error) throw new Error(`createStaffDocument: ${error.message}`);
  return normalizeStaffDocument(data);
}

export async function updateStaffDocument(id: number, input: Partial<StaffDocumentInput>): Promise<void> {
  const { error } = await supabase.from("staff_documents").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`updateStaffDocument: ${error.message}`);
}

export async function deleteStaffDocument(id: number): Promise<void> {
  const { error } = await supabase.from("staff_documents").delete().eq("id", id);
  if (error) throw new Error(`deleteStaffDocument: ${error.message}`);
}

export async function uploadStaffDocumentFile(staffId: number, file: File, docType: string): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const filePath = `${staffId}/${docType}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("staff-documents")
    .upload(filePath, file, { upsert: true });
  if (error) throw new Error(`uploadStaffDocumentFile: ${error.message}`);
  const { data } = supabase.storage.from("staff-documents").getPublicUrl(filePath);
  return data.publicUrl;
}
