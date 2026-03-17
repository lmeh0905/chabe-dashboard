export type FleetLocation = "Lease" | "Office";

export type EngineSize = number | "Electric";

export interface FleetVehicle {
  plate: string;
  make: string;
  model: string;
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

  // keep raw ids for reference (optional)
  _makesId?: number | string | null;
  _modelsId?: number | string | null;
  _locationId?: number | string | null;
}

type XanoVehicleRaw = Record<string, unknown>;

type XanoPageResponse =
  | { items?: unknown[]; nextPage?: unknown }
  | unknown[];

const DEFAULT_XANO_BASE = "https://x8ki-letl-twmt.n7.xano.io/api:xQZfHlSi";

function normalizeVehicle(v: XanoVehicleRaw): FleetVehicle {
  const locationObj = (v.location ?? v.locations ?? {}) as Record<string, unknown>;
  const modelsObj = (v.models ?? v.model_obj ?? {}) as Record<string, unknown>;
  const makesObj = (v.makes ?? v.make_obj ?? {}) as Record<string, unknown>;

  const plate = String(v.plate ?? "");
  const fuel = String(v.fuel ?? "");
  const extColor = String(v.ext_color ?? "");
  const intColor = String(v.int_color ?? "");

  const yearRaw = v.year;
  const year = typeof yearRaw === "number" ? yearRaw : Number(yearRaw ?? 0);

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

  const isLease = locationObj.type === "lease";

  return {
    plate,
    make: String(makesObj.name ?? ""),
    model: [String(modelsObj.name ?? ""), String(v.trim ?? "")]
      .filter(Boolean)
      .join(" "),
    fuel,
    extColor,
    intColor,
    year,
    vin: (v.vin as string | null | undefined) ?? null,
    engineSize,
    co2,
    operationDate: (v.operation_date as string | null | undefined) ?? null,
    status: (v.status as string | null | undefined) ?? null,
    location: isLease ? "Lease" : "Office",
    hotel: isLease ? (locationObj.name as string | null | undefined) ?? null : null,
    leaseAmount: (v.lease_amount as number | null | undefined) ?? null,
    leaseStatus: (v.lease_status as string | null | undefined) ?? null,
    leaseEnd: (v.lease_end as string | null | undefined) ?? null,
    purchaseDate: (v.purchase_date as string | null | undefined) ?? null,
    purchaseAmount: (v.purchase_amount as number | null | undefined) ?? null,
    bank: (v.bank as string | null | undefined) ?? null,
    loanAmount: (v.loan_amount as number | null | undefined) ?? null,
    loanEMI: (v.loan_emi as number | null | undefined) ?? null,
    loanTenure: (v.loan_tenure as number | null | undefined) ?? null,
    interestRate: (v.interest_rate as number | null | undefined) ?? null,
    endOfLoan: (v.end_of_loan as string | null | undefined) ?? null,
    insurance: (v.insurance as string | null | undefined) ?? null,
    insurancePayment: (v.insurance_payment as number | null | undefined) ?? null,
    insuranceDue: (v.insurance_due as string | null | undefined) ?? null,
    km: (v.km as number | null | undefined) ?? null,
    avgKmMonth: (v.avg_km_month as number | null | undefined) ?? null,
    serviceInterval: (v.service_interval as number | null | undefined) ?? 10000,
    lastServiceKm: (v.last_service_km as number | null | undefined) ?? 0,
    _makesId: (v.makes_id as number | string | null | undefined) ?? null,
    _modelsId: (v.models_id as number | string | null | undefined) ?? null,
    _locationId: (v.location_id as number | string | null | undefined) ?? null,
  };
}

export async function fetchAllVehicles(opts?: {
  baseUrl?: string;
  perPage?: number;
  fetchInit?: RequestInit;
}): Promise<FleetVehicle[]> {
  const perPage = opts?.perPage ?? 25;

  const all: unknown[] = [];
  let page = 1;

  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;

   
  while (true) {
    const res = await fetch(
      `${baseUrl}/get_vehicles?page=${page}&per_page=${perPage}`,
      opts?.fetchInit,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as XanoPageResponse;
    const items = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] }).items)
        ? (data as { items: unknown[] }).items
        : [];

    all.push(...items);

    const nextPage = Array.isArray(data)
      ? null
      : (data as { nextPage?: unknown }).nextPage;

    if (!nextPage || items.length < perPage) break;
    page++;
  }

  return all.map((v) => normalizeVehicle(v as XanoVehicleRaw));
}

/** Réponse brute possible de daily_op (à affiner selon le schéma Xano) */
export type DailyOpRaw = Record<string, unknown>;

/**
 * Récupère les données "daily_op" depuis Xano.
 * Si date est fourni (YYYY-MM-DD), ajoute ?date= pour filtrer par jour.
 */
export async function fetchDailyOp(opts?: {
  baseUrl?: string;
  date?: string;
  fetchInit?: RequestInit;
}): Promise<DailyOpRaw[]> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const url = opts?.date ? `${baseUrl}/daily_op?date=${encodeURIComponent(opts.date)}` : `${baseUrl}/daily_op`;
  const res = await fetch(url, opts?.fetchInit ?? {});
  if (!res.ok) throw new Error(`daily_op HTTP ${res.status}`);
  const data = await res.json();
  let rows: DailyOpRaw[] = [];
  if (Array.isArray(data)) rows = data as DailyOpRaw[];
  else if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
    rows = (data as { items: DailyOpRaw[] }).items;
  }
  if (opts?.date && rows.length > 0) {
    const d = opts.date;
    rows = rows.filter((r) => String((r as { date?: string }).date ?? "").slice(0, 10) === d);
  }
  return rows;
}

/** Payload pour créer / mettre à jour un enregistrement daily_op */
export interface DailyOpInput {
  date: string;
  total_drivers: number;
  working: number;
  pool: number;
  free: number;
  pct_working: number;
}

/**
 * Envoie un enregistrement daily_op à Xano (POST).
 */
export async function submitDailyOp(
  body: DailyOpInput,
  opts?: { baseUrl?: string; fetchInit?: RequestInit }
): Promise<unknown> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const res = await fetch(`${baseUrl}/daily_op`, {
    ...opts?.fetchInit,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.fetchInit?.headers as Record<string, string>),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`daily_op POST ${res.status}${text ? `: ${text}` : ""}`);
  }
  return res.json().catch(() => ({}));
}

/** Job Xano (endpoint /jobs) — champs principaux pour Daily/Monthly/Annual */
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
  gross_margin?: string;
  exchange_rate?: number;
  duration_hours?: string;
  salesforce_id?: string;
}

type JobRaw = Record<string, unknown>;

function normalizeJob(r: JobRaw): Job {
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
    lead_time_hours: r.lead_time_hours as number | undefined,
    revenue_aed: r.revenue_aed as number | undefined,
    revenue_eur: r.revenue_eur as number | undefined,
    hourly_revenue_aed: r.hourly_revenue_aed as number | undefined,
    hourly_revenue_eur: r.hourly_revenue_eur as number | undefined,
    cost_aed: r.cost_aed as number | undefined,
    cost_eur: r.cost_eur as number | undefined,
    gross_margin: r.gross_margin as string | undefined,
    exchange_rate: r.exchange_rate as number | undefined,
    duration_hours: r.duration_hours as string | undefined,
    salesforce_id: r.salesforce_id as string | undefined,
  };
}

/**
 * Récupère les jobs depuis Xano (endpoint /jobs).
 * Si date est fourni (YYYY-MM-DD), ajoute ?date= pour filtrer par jour ; sinon filtre côté client si l’API renvoie tout.
 */
export async function fetchJobs(opts?: {
  baseUrl?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  fetchInit?: RequestInit;
}): Promise<Job[]> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  let url = `${baseUrl}/jobs`;
  const params = new URLSearchParams();
  if (opts?.date) params.set("date", opts.date);
  if (opts?.dateStart) params.set("date_start", opts.dateStart);
  if (opts?.dateEnd) params.set("date_end", opts.dateEnd);
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  const res = await fetch(url, opts?.fetchInit ?? {});
  if (!res.ok) throw new Error(`jobs HTTP ${res.status}`);
  const data = await res.json();
  let rawRows: unknown[] = [];
  if (Array.isArray(data)) rawRows = data;
  else if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
    rawRows = (data as { items: unknown[] }).items;
  } else if (data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)) {
    rawRows = (data as { data: unknown[] }).data;
  }
  let rows = rawRows.map((r) => normalizeJob(r as JobRaw));
  if (opts?.date) {
    const d = opts.date;
    rows = rows.filter((j) => j.date && j.date.slice(0, 10) === d);
  } else if (opts?.dateStart && opts?.dateEnd) {
    rows = rows.filter((j) => {
      const d = j.date?.slice(0, 10) ?? "";
      return d >= opts!.dateStart! && d <= opts!.dateEnd!;
    });
  }
  return rows;
}

type JobsPageResponse =
  | { items?: unknown[]; data?: unknown[]; nextPage?: unknown }
  | unknown[];

/**
 * Récupère tous les jobs depuis Xano en paginant (évite le rate limit en une seule requête).
 * À appeler une fois au démarrage ; les vues filtrent ensuite en local.
 */
export async function fetchAllJobs(opts?: {
  baseUrl?: string;
  perPage?: number;
  fetchInit?: RequestInit;
  /** Délai en ms entre chaque page pour limiter le 429 (plan gratuit Xano). */
  delayBetweenPages?: number;
}): Promise<Job[]> {
  const perPage = opts?.perPage ?? 50;
  const delayMs = opts?.delayBetweenPages ?? 350;
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const all: Job[] = [];
  let page = 1;

   
  while (true) {
    const url = `${baseUrl}/jobs?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, opts?.fetchInit ?? {});
    if (!res.ok) throw new Error(`jobs HTTP ${res.status}`);

    const data = (await res.json()) as JobsPageResponse;
    let rawRows: unknown[] = [];
    if (Array.isArray(data)) {
      rawRows = data;
    } else if (data && typeof data === "object") {
      const d = data as { items?: unknown[]; data?: unknown[] };
      if (Array.isArray(d.items)) rawRows = d.items;
      else if (Array.isArray(d.data)) rawRows = d.data;
    }

    const rows = rawRows.map((r) => normalizeJob(r as JobRaw));
    all.push(...rows);

    // Si l’API renvoie un tableau, pas de pagination : on a tout
    const nextPage =
      Array.isArray(data)
        ? null
        : data && typeof data === "object"
          ? (data as { nextPage?: unknown }).nextPage
          : null;

    if (!nextPage || rows.length < perPage) break;
    page++;
    await delay(delayMs);
  }

  return all;
}

/** Payload pour créer un job (POST /create_job) — champs optionnels comme dans Job */
export type JobInput = Partial<Omit<Job, "id">> & { date: string };

/**
 * Récupère l’ensemble des salesforce_id déjà présents (pour éviter les doublons à l’import).
 */
export async function getExistingSalesforceIds(opts?: {
  baseUrl?: string;
  fetchInit?: RequestInit;
}): Promise<Set<string>> {
  const jobs = await fetchAllJobs({
    ...opts,
    perPage: 100,
    delayBetweenPages: 200,
  });
  const ids = new Set<string>();
  for (const j of jobs) {
    if (j.salesforce_id != null && String(j.salesforce_id).trim() !== "") {
      ids.add(String(j.salesforce_id).trim());
    }
  }
  return ids;
}

/**
 * Crée un job via POST /create_job.
 */
export async function createJob(
  job: JobInput,
  opts?: { baseUrl?: string; fetchInit?: RequestInit }
): Promise<unknown> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const res = await fetch(`${baseUrl}/create_job`, {
    ...opts?.fetchInit,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.fetchInit?.headers as Record<string, string>),
    },
    body: JSON.stringify(job),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`jobs POST ${res.status}${text ? `: ${text}` : ""}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Supprime un job via DELETE /jobs/:id.
 */
export async function deleteJob(
  jobId: number,
  opts?: { baseUrl?: string; fetchInit?: RequestInit }
): Promise<void> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const res = await fetch(`${baseUrl}/jobs/${jobId}`, {
    ...opts?.fetchInit,
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`jobs DELETE ${res.status}${text ? `: ${text}` : ""}`);
  }
}

/**
 * Supprime les jobs d'une période via DELETE /delete_jobs_by_date (date_start, date_end).
 */
export async function deleteJobsByDate(
  dateStart: string,
  dateEnd: string,
  opts?: { baseUrl?: string; fetchInit?: RequestInit }
): Promise<void> {
  const baseUrl = opts?.baseUrl ?? DEFAULT_XANO_BASE;
  const url = `${baseUrl}/delete_jobs_by_date?date_start=${encodeURIComponent(dateStart)}&date_end=${encodeURIComponent(dateEnd)}`;
  const res = await fetch(url, {
    ...opts?.fetchInit,
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`delete_jobs_by_date ${res.status}${text ? `: ${text}` : ""}`);
  }
}
