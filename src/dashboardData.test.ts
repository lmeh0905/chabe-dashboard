import { describe, it, expect } from "vitest";
import {
  getDailyKey,
  getMonthlyKey,
  getVehicleType,
  deriveDailyData,
  deriveMonthlyData,
  deriveAnnual,
  VEHICLE_TYPES,
} from "./dashboardData";
import type { Job, FleetVehicle } from "./api/supabase";

// ─── Factories ───────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    date: "2025-03-15",
    revenue_aed: 500,
    service_type_low: "ST | Short Transfer",
    provider_type: "Internal",
    provider_name: "CHABE Dubai",
    driver_name: "Ahmed",
    billing_account: "Hotel Acme",
    vertical: "Hotels",
    ...overrides,
  } as Job;
}

function makeVehicle(overrides: Partial<FleetVehicle> = {}): FleetVehicle {
  return {
    plate: "A 12345",
    make: "Mercedes",
    model: "S-Class 500",
    modelName: "S-Class",
    fuel: "Petrol",
    extColor: "Black",
    intColor: "Black",
    year: 2024,
    location: "Office",
    serviceInterval: 10000,
    lastServiceKm: 0,
    ...overrides,
  } as FleetVehicle;
}

// ─── getDailyKey ─────────────────────────────────────────────────────────────

describe("getDailyKey", () => {
  it("formats date as 'day MonthFR'", () => {
    expect(getDailyKey("2025-03-15")).toBe("15 Mar");
    expect(getDailyKey("2025-01-01")).toBe("1 Jan");
    expect(getDailyKey("2025-12-25")).toBe("25 Déc");
  });

  it("uses French month abbreviations", () => {
    expect(getDailyKey("2025-02-14")).toBe("14 Fév");
    expect(getDailyKey("2025-06-01")).toBe("1 Juin");
    expect(getDailyKey("2025-08-20")).toBe("20 Août");
  });
});

// ─── getMonthlyKey ───────────────────────────────────────────────────────────

describe("getMonthlyKey", () => {
  it("formats date as 'MonthFR Year'", () => {
    expect(getMonthlyKey("2025-03-15")).toBe("Mar 2025");
    expect(getMonthlyKey("2026-01-01")).toBe("Jan 2026");
  });
});

// ─── getVehicleType ──────────────────────────────────────────────────────────

describe("getVehicleType", () => {
  it("returns vehicleType from DB if set", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: "BMW 7" }))).toBe("BMW 7");
  });

  it("detects S Class from model name", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "S-Class 500" }))).toBe("S Class");
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "Maybach GLS" }))).toBe("S Class");
  });

  it("detects V Class from model name", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "V-Class" }))).toBe("V Class");
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "Vito Tourer" }))).toBe("V Class");
  });

  it("detects EQS", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "EQS 450" }))).toBe("EQS");
  });

  it("detects BMW 7", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "i7 xDrive" }))).toBe("BMW 7");
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "735i" }))).toBe("BMW 7");
  });

  it("detects Executive Sedan", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "520d" }))).toBe("Executive Sedan");
  });

  it("detects SUV", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "Suburban LT" }))).toBe("SUV");
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "Escalade ESV" }))).toBe("SUV");
  });

  it("returns 'Autre' for unknown models", () => {
    expect(getVehicleType(makeVehicle({ vehicleType: null, modelName: "Toyota Camry" }))).toBe("Autre");
  });
});

// ─── VEHICLE_TYPES ───────────────────────────────────────────────────────────

describe("VEHICLE_TYPES", () => {
  it("contains all expected vehicle types", () => {
    expect(VEHICLE_TYPES).toContain("S Class");
    expect(VEHICLE_TYPES).toContain("V Class");
    expect(VEHICLE_TYPES).toContain("BMW 7");
    expect(VEHICLE_TYPES).toContain("EQS");
    expect(VEHICLE_TYPES).toContain("SUV");
    expect(VEHICLE_TYPES).toContain("Executive Sedan");
    expect(VEHICLE_TYPES).toHaveLength(6);
  });
});

// ─── deriveDailyData ─────────────────────────────────────────────────────────

describe("deriveDailyData", () => {
  it("returns empty object for empty jobs array", () => {
    expect(deriveDailyData([])).toEqual({});
  });

  it("groups jobs by daily key", () => {
    const jobs = [
      makeJob({ date: "2025-03-15" }),
      makeJob({ id: 2, date: "2025-03-15" }),
      makeJob({ id: 3, date: "2025-03-16" }),
    ];
    const result = deriveDailyData(jobs);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["15 Mar"]).toBeDefined();
    expect(result["16 Mar"]).toBeDefined();
  });

  it("skips jobs without date", () => {
    const jobs = [makeJob({ date: "" }), makeJob({ date: "2025-03-15" })];
    const result = deriveDailyData(jobs);
    expect(Object.keys(result)).toHaveLength(1);
  });

  describe("service type breakdown", () => {
    it("counts LT jobs", () => {
      const jobs = [
        makeJob({ service_type_low: "LT | Lease Transfer" }),
        makeJob({ id: 2, service_type_low: "LT | Lease Transfer" }),
        makeJob({ id: 3, service_type_low: "ST | Short Transfer" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.jobs.LT).toBe(2);
      expect(day.jobs.ST).toBe(1);
      expect(day.jobs.total).toBe(3);
    });

    it("handles all service types", () => {
      const types = ["LT", "LH", "ST", "SH", "S", "T", "H", "IT", "IHS"];
      const jobs = types.map((t, i) => makeJob({ id: i + 1, service_type_low: `${t} | Test` }));
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      for (const t of types) {
        expect(day.jobs[t as keyof typeof day.jobs]).toBe(1);
      }
    });
  });

  describe("revenue calculations", () => {
    it("computes hors-lease revenue (excludes LT and LH)", () => {
      const jobs = [
        makeJob({ service_type_low: "ST | Short", revenue_aed: 1000 }),
        makeJob({ id: 2, service_type_low: "LT | Lease", revenue_aed: 2000 }),
        makeJob({ id: 3, service_type_low: "SH | Short Hour", revenue_aed: 500 }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.revenue.horsLease).toBe(1500); // 1000 + 500, not 2000 (LT)
    });

    it("separates internal vs external revenue", () => {
      const jobs = [
        makeJob({ provider_type: "Internal", revenue_aed: 1000, service_type_low: "ST | Short" }),
        makeJob({ id: 2, provider_type: "External", revenue_aed: 600, service_type_low: "ST | Short" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.revenue.internalRev).toBe(1000);
      expect(day.revenue.externalRev).toBe(600);
    });

    it("computes rev per driver using unique driver count as fallback", () => {
      const jobs = [
        makeJob({ driver_name: "Ahmed", provider_type: "Internal", revenue_aed: 1000, service_type_low: "ST | Short" }),
        makeJob({ id: 2, driver_name: "Omar", provider_type: "Internal", revenue_aed: 2000, service_type_low: "ST | Short" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      // 2 unique drivers, internal rev = 3000 → rev/driver = 1500
      expect(day.revenue.revPerDriver).toBe(1500);
    });

    it("uses dailyOpRecord.free for rev/driver when provided", () => {
      const jobs = [
        makeJob({ driver_name: "Ahmed", provider_type: "Internal", revenue_aed: 3000, service_type_low: "ST | Short" }),
      ];
      const dailyOp = { free: 3, pct_working: 80 };
      const result = deriveDailyData(jobs, [], dailyOp);
      const day = result["15 Mar"];
      // free = 3, internal rev = 3000 → rev/driver = 1000
      expect(day.revenue.revPerDriver).toBe(1000);
    });
  });

  describe("providers aggregation", () => {
    it("groups by provider name and sorts internal first", () => {
      const jobs = [
        makeJob({ provider_name: "CHABE Dubai", provider_type: "Internal", revenue_aed: 1000, service_type_low: "ST | Short" }),
        makeJob({ id: 2, provider_name: "Partner LLC", provider_type: "External", revenue_aed: 2000, service_type_low: "ST | Short" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.providers[0].name).toBe("CHABE Dubai");
      expect(day.providers[0].type).toBe("Internal");
      expect(day.providers[1].name).toBe("Partner LLC");
    });
  });

  describe("top clients", () => {
    it("ranks clients by revenue descending", () => {
      const jobs = [
        makeJob({ billing_account: "Client A", revenue_aed: 500, service_type_low: "ST | S" }),
        makeJob({ id: 2, billing_account: "Client B", revenue_aed: 1500, service_type_low: "ST | S" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.topClients[0].name).toBe("Client B");
      expect(day.topClients[0].rev).toBe(1500);
    });

    it("limits to 8 clients", () => {
      const jobs = Array.from({ length: 12 }, (_, i) =>
        makeJob({ id: i + 1, billing_account: `Client ${i}`, revenue_aed: (12 - i) * 100, service_type_low: "ST | S" })
      );
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.topClients).toHaveLength(8);
    });
  });

  describe("verticals", () => {
    it("groups by vertical with correct colors", () => {
      const jobs = [
        makeJob({ vertical: "Hotels", revenue_aed: 1000, service_type_low: "ST | S" }),
        makeJob({ id: 2, vertical: "Travel", revenue_aed: 800, service_type_low: "ST | S" }),
      ];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      const hotels = day.verticals.find(v => v.name === "Hotels");
      expect(hotels).toBeDefined();
      expect(hotels!.rev).toBe(1000);
      expect(hotels!.color).toBe("#34c759");
    });

    it("assigns default color for unknown verticals", () => {
      const jobs = [makeJob({ vertical: "Unknown Vertical", service_type_low: "ST | S" })];
      const result = deriveDailyData(jobs);
      const day = result["15 Mar"];
      expect(day.verticals[0].color).toBe("#86868b");
    });
  });

  describe("fleet demand", () => {
    it("computes fleet demand vs availability by vehicle type", () => {
      const jobs = [
        makeJob({ vehicle_type_assigned: "S Class", service_type_low: "ST | Short" }),
        makeJob({ id: 2, vehicle_type_assigned: "S Class", service_type_low: "ST | Short" }),
        makeJob({ id: 3, vehicle_type_assigned: "V Class", service_type_low: "ST | Short" }),
      ];
      const vehicles = [
        makeVehicle({ modelName: "S-Class" }),
        makeVehicle({ plate: "B 222", modelName: "S-Class" }),
        makeVehicle({ plate: "C 333", modelName: "V-Class" }),
      ];
      const result = deriveDailyData(jobs, vehicles);
      const day = result["15 Mar"];
      const sClass = day.fleetDemand.find(f => f.type === "S Class");
      expect(sClass).toBeDefined();
      expect(sClass!.missions).toBe(2);
      expect(sClass!.fleet).toBe(2);
    });
  });

  describe("driver stats from dailyOpRecord", () => {
    it("uses dailyOpRecord for driver counts", () => {
      const jobs = [makeJob()];
      const dailyOp = { free: 5, pct_working: 80, total_drivers: 10, working: 8, pool: 3 };
      const result = deriveDailyData(jobs, [], dailyOp);
      const day = result["15 Mar"];
      expect(day.drivers.total).toBe(10);
      expect(day.drivers.working).toBe(8);
      expect(day.drivers.pool).toBe(3);
      expect(day.drivers.free).toBe(5);
    });
  });
});

// ─── deriveMonthlyData ───────────────────────────────────────────────────────

describe("deriveMonthlyData", () => {
  it("returns empty object for empty jobs", () => {
    expect(deriveMonthlyData([])).toEqual({});
  });

  it("groups jobs by month", () => {
    const jobs = [
      makeJob({ date: "2025-03-15" }),
      makeJob({ id: 2, date: "2025-03-20" }),
      makeJob({ id: 3, date: "2025-04-01" }),
    ];
    const result = deriveMonthlyData(jobs);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["Mar 2025"]).toBeDefined();
    expect(result["Avr 2025"]).toBeDefined();
  });

  it("tracks days within a month", () => {
    const jobs = [
      makeJob({ date: "2025-03-10" }),
      makeJob({ id: 2, date: "2025-03-10" }),
      makeJob({ id: 3, date: "2025-03-20" }),
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    expect(month.days).toEqual([10, 20]);
  });

  it("computes daily revenue arrays (hors lease)", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", revenue_aed: 1000, service_type_low: "ST | Short" }),
      makeJob({ id: 2, date: "2025-03-10", revenue_aed: 500, service_type_low: "ST | Short" }),
      makeJob({ id: 3, date: "2025-03-20", revenue_aed: 2000, service_type_low: "ST | Short" }),
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    expect(month.amount).toEqual([1500, 2000]); // day 10: 1000+500, day 20: 2000
  });

  it("excludes LT/LH from hors-lease amount but includes in amountTotal", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", revenue_aed: 1000, service_type_low: "ST | Short" }),
      makeJob({ id: 2, date: "2025-03-10", revenue_aed: 3000, service_type_low: "LT | Lease" }),
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    expect(month.amount).toEqual([1000]);      // hors lease only
    expect(month.amountTotal).toEqual([4000]);  // all revenue
  });

  it("computes billing accounts sorted by revenue", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", billing_account: "Client A", revenue_aed: 500 }),
      makeJob({ id: 2, date: "2025-03-10", billing_account: "Client B", revenue_aed: 2000 }),
      makeJob({ id: 3, date: "2025-03-10", billing_account: "Client A", revenue_aed: 700 }),
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    expect(month.billingAccounts[0].name).toBe("CLIENT B");  // uppercased
    expect(month.billingAccounts[0].rev).toBe(2000);
    expect(month.billingAccounts[1].name).toBe("CLIENT A");
    expect(month.billingAccounts[1].rev).toBe(1200);
  });

  it("counts unique drivers", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", driver_name: "Ahmed" }),
      makeJob({ id: 2, date: "2025-03-10", driver_name: "Omar" }),
      makeJob({ id: 3, date: "2025-03-15", driver_name: "Ahmed" }),
    ];
    const result = deriveMonthlyData(jobs);
    expect(result["Mar 2025"].uniqueDrivers).toBe(2);
  });

  it("computes driver performance for internal hors-lease", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", driver_name: "Ahmed", provider_type: "Internal", revenue_aed: 1000, service_type_low: "ST | Short" }),
      makeJob({ id: 2, date: "2025-03-10", driver_name: "Ahmed", provider_type: "Internal", revenue_aed: 500, service_type_low: "ST | Short" }),
      makeJob({ id: 3, date: "2025-03-10", driver_name: "Omar", provider_type: "Internal", revenue_aed: 2000, service_type_low: "ST | Short" }),
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    // Omar has higher rev, should be first
    expect(month.driverPerf[0].name).toBe("Omar");
    expect(month.driverPerf[0].rev).toBe(2000);
    expect(month.driverPerf[0].jobs).toBe(1);
    expect(month.driverPerf[1].name).toBe("Ahmed");
    expect(month.driverPerf[1].rev).toBe(1500);
    expect(month.driverPerf[1].revPerJob).toBe(750);
  });

  it("computes vehicle type missions for hors-lease jobs", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", vehicle_type_assigned: "S Class", service_type_low: "ST | Short" }),
      makeJob({ id: 2, date: "2025-03-10", vehicle_type_assigned: "S Class", service_type_low: "ST | Short" }),
      makeJob({ id: 3, date: "2025-03-10", vehicle_type_assigned: "V Class", service_type_low: "ST | Short" }),
      makeJob({ id: 4, date: "2025-03-10", vehicle_type_assigned: "S Class", service_type_low: "LT | Lease" }), // excluded
    ];
    const result = deriveMonthlyData(jobs);
    const month = result["Mar 2025"];
    expect(month.vehicleTypeMissions["S Class"]).toBe(2); // LT excluded
    expect(month.vehicleTypeMissions["V Class"]).toBe(1);
  });

  it("uses dailyOpMap for free/working/pctWorking when provided", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", provider_type: "Internal", revenue_aed: 3000, service_type_low: "ST | Short" }),
    ];
    const dailyOpMap = new Map([
      ["2025-03-10", { free: 5, pct_working: 85, working: 8 }],
    ]);
    const result = deriveMonthlyData(jobs, dailyOpMap);
    const month = result["Mar 2025"];
    expect(month.free).toEqual([5]);
    expect(month.working).toEqual([8]);
    expect(month.pctWorking).toEqual([85]);
    expect(month.revDriver).toEqual([600]); // 3000 / 5
  });
});

// ─── deriveAnnual ────────────────────────────────────────────────────────────

describe("deriveAnnual", () => {
  it("returns 12 months structure", () => {
    const result = deriveAnnual([]);
    expect(result.months).toHaveLength(12);
    expect(result.amount2025).toHaveLength(12);
    expect(result.amount2026).toHaveLength(12);
  });

  it("returns all nulls for empty jobs", () => {
    const result = deriveAnnual([]);
    expect(result.amount2025.every(v => v === null)).toBe(true);
    expect(result.amount2026.every(v => v === null)).toBe(true);
  });

  it("separates 2025 and 2026 data into correct slots", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", revenue_aed: 1000 }),
      makeJob({ id: 2, date: "2026-03-10", revenue_aed: 2000 }),
    ];
    const result = deriveAnnual(jobs);
    // March is index 2
    expect(result.amount2025[2]).toBe(1000);
    expect(result.amount2026[2]).toBe(2000);
    // Other months should be null
    expect(result.amount2025[0]).toBeNull();
    expect(result.amount2026[0]).toBeNull();
  });

  it("aggregates jobs across days within a month", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", revenue_aed: 1000 }),
      makeJob({ id: 2, date: "2025-03-20", revenue_aed: 2000 }),
    ];
    const result = deriveAnnual(jobs);
    expect(result.amount2025[2]).toBe(3000); // total for March
  });

  it("computes total jobs per month", () => {
    const jobs = [
      makeJob({ date: "2025-03-10" }),
      makeJob({ id: 2, date: "2025-03-10" }),
      makeJob({ id: 3, date: "2025-03-20" }),
    ];
    const result = deriveAnnual(jobs);
    expect(result.jobs2025[2]).toBe(3);
  });

  it("computes verticals per year", () => {
    const jobs = [
      makeJob({ date: "2025-03-10", vertical: "Hotels", revenue_aed: 1000 }),
      makeJob({ id: 2, date: "2025-06-10", vertical: "Hotels", revenue_aed: 500 }),
      makeJob({ id: 3, date: "2025-03-10", vertical: "Travel", revenue_aed: 200 }),
    ];
    const result = deriveAnnual(jobs);
    expect(result.verticals2025.length).toBeGreaterThan(0);
    const hotels = result.verticals2025.find(v => v.name === "Hotels");
    expect(hotels).toBeDefined();
    expect(hotels!.rev).toBe(1500);
  });
});
