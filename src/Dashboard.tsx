import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import CustomSelect from "./components/CustomSelect";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { signOut, bulkInsertJobs, checkServiceAlerts, createAlert, createCheckIn, createExpense, createMake, createRefLocation, createRefModel, createRole, createUnavailability, createVehicle, deleteAlert, deleteDailyOp, deleteExpense, deleteJob, deleteJobsByDate, deleteMake, deleteRefLocation, deleteRefModel, deleteRole, deleteUser, fetchAlerts, fetchAllVehicles, fetchCheckIns, fetchDailyOp, fetchExpenses, fetchJobs, fetchMakes, fetchProfiles, fetchRefLocations, fetchRefModels, fetchRoles, fetchUnavailabilities, fetchUnavailabilityReasons, createUnavailabilityReason, deleteUnavailabilityReason, fetchVehicleTypes, getLastCheckout, inviteUser, markAlertRead, markAllAlertsRead, resolveUnavailability, updateUnavailability, submitDailyOp, updateAlertStatus, updatePassword, updateUserRole, updateVehicle, uploadVehicleAsset, fetchStaff, createStaff, updateStaff, deactivateStaff, fetchAttendance, fetchAttendanceByDate, upsertAttendance, bulkUpsertAttendance, type AlertInput, type AlertRecord, type AttendanceRecord, type CheckInInput, type CheckInRecord, type DailyOpRaw, type ExpenseType, type FleetVehicle, type Job, type JobInput, type Make, type RefLocation, type RefModel, type Role, type Staff, type StaffInput, type UnavailabilityReason, type UserProfile, type VehicleCreateInput, type VehicleExpense, type VehicleUnavailability, type VehicleUpdateInput, type VehicleType, deleteSalesLead, fetchSalesLeads, generateSalesLeads, updateSalesLead, createLeadActivity, fetchLeadActivities, fetchProspectContacts, updateProspectContact, fetchContactsForLead, createContactActivity, createProspectContact, linkContactToLead, searchApolloContacts, generateLeadEmail, enrichContactViaApollo, fetchAllActivities, fetchPermissionsForRole, fetchRolePermissions, setRolePermissions, type ActivityWithLead, type ApolloSearchResult, type ActivityType, type LeadActivity, type LeadConfidence, type LeadStatus, type LeadType, type SalesLead, type ContactStatus, type ProspectContactRecord, fetchDeductions, createDeduction, updateDeduction, deleteDeduction, createInstallmentDeductions, fetchDeductionsByGroup, deleteDeductionGroup, type Deduction, type DeductionType, fetchStaffDocuments, createStaffDocument, deleteStaffDocument, uploadStaffDocumentFile, type StaffDocument, type DocumentType, fetchMonthlyRecap, updateMonthlyRecap, recalcMonthlyRecap, type MonthlyRecapRecord, fetchStaffWithProfiles, inviteUserForStaff, getStaffWithoutAccounts, resetPasswordForStaff, deactivateUserAccount, reactivateUserAccount, fetchPublicHolidays, createPublicHoliday, deletePublicHoliday, type PublicHoliday } from "./api/supabase";
import { useJobs } from "./context/JobsContext";
import { deriveAnnual, deriveDailyData, deriveMonthlyData, getDailyKey, getVehicleType, VEHICLE_TYPES } from "./dashboardData";
import { computeDepreciation, formatAED, DEPRECIATION_MONTHS } from "./utils/depreciation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Manrope',-apple-system,sans-serif;background:#f5f5f7;color:#1d1d1f;-webkit-font-smoothing:antialiased}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .3s ease forwards}
  .d1{animation-delay:.04s;opacity:0}.d2{animation-delay:.08s;opacity:0}
  .d3{animation-delay:.12s;opacity:0}.d4{animation-delay:.16s;opacity:0}
  .g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .g7{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .hero-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
  .hero-stats{display:flex;gap:32px;flex-wrap:wrap}
  .layout-wrap{width:100%;max-width:none;margin:0 auto}

  /* ── Sidebar ── */
  .sidebar{
    width:240px;min-height:100vh;background:#1d1d1f;
    display:flex;flex-direction:column;
    transition:width 0.2s ease;
    position:sticky;top:0;height:100vh;
    overflow-y:auto;overflow-x:hidden;
    z-index:120;scrollbar-width:none;flex-shrink:0;
  }
  .sidebar::-webkit-scrollbar{display:none}
  .sidebar-collapsed{width:56px}
  .sidebar-item:hover{background:rgba(255,255,255,0.05)!important}
  .sidebar-item-active:hover{background:rgba(255,255,255,0.08)!important}

  /* ── TopBar ── */
  .topbar{
    background:rgba(255,255,255,0.85);
    backdrop-filter:saturate(180%) blur(20px);
    -webkit-backdrop-filter:saturate(180%) blur(20px);
    border-bottom:1px solid rgba(0,0,0,0.08);
    position:sticky;top:0;z-index:100;height:52px;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 24px;gap:12;
  }

  /* ── Responsive ── */
  @media(max-width:900px){
    .g5{grid-template-columns:repeat(3,1fr)}
    .g7{grid-template-columns:repeat(4,1fr)}
    .g3{grid-template-columns:repeat(2,1fr)}
    .sidebar{position:fixed;left:-280px;width:280px!important;z-index:200;transition:left 0.25s ease}
    .sidebar-mobile-open{left:0!important}
    .sidebar-collapsed{width:280px!important;left:-280px}
    .sidebar-collapse-btn{display:none!important}
    .topbar-hamburger{display:flex!important}
    .topbar-user-name{display:none!important}
    .topbar-logout-text{display:none!important}
  }
  @media(max-width:640px){
    .hide-mobile{display:none!important}
    .g5{grid-template-columns:repeat(2,1fr)}
    .g4{grid-template-columns:repeat(2,1fr)}
    .g7{grid-template-columns:repeat(3,1fr)}
    .g2,.g3{grid-template-columns:1fr}
    .hero-row{flex-direction:column;align-items:flex-start}
    .hero-stats{gap:16px}
    .hero-big{font-size:34px!important}
    .main{padding:16px!important}
    .topbar-preview-select{max-width:100px}
  }
`;

// ─── DATA ────────────────────────────────────────────────────────────────────
// Données Daily / Monthly / Annual et flotte : dérivées des APIs (jobs + vehicles).

// Check-In / Check-Out (store en mémoire pour la démo)
const CHECKIN_STORE: Record<string, Any> = {};
const KM_HISTORY: Record<string, number> = {};
const DRIVERS_LIST: { id: string; name: string }[] = [
  { id: "d01", name: "Shabir" }, { id: "d02", name: "Sumesh Soman" }, { id: "d03", name: "Poiyel Sackeer" },
  { id: "d04", name: "Rajan Acharya" }, { id: "d05", name: "Riyas Alipetta" }, { id: "d06", name: "Kamran Khan" },
  { id: "d07", name: "Kene Richard" }, { id: "d08", name: "MG Riju" }, { id: "d09", name: "Naseem K." },
  { id: "d10", name: "Shah Bilal" }, { id: "d11", name: "Ahmed Hassan" }, { id: "d12", name: "Mohammed Ali" },
];
const FUEL_LEVELS = ["1/4", "1/2", "3/4", "Full"];
const FUEL_PCT: Record<string, number> = { "1/4": 25, "1/2": 50, "3/4": 75, "Full": 100 };
const PROBLEM_CATS: { id: string; icon: string; label: string }[] = [
  { id: "body", icon: "🚗", label: "Body" }, { id: "mech", icon: "🔧", label: "Mechanical" },
  { id: "clean", icon: "🧹", label: "Cleanliness" }, { id: "fuel", icon: "⛽", label: "Fuel" },
  { id: "equip", icon: "📱", label: "Equipment" }, { id: "other", icon: "❗", label: "Other" },
];
type ProblemStatus = "pending" | "in_progress" | "closed";
interface ProblemReport {
  id: string;
  vehiclePlate: string;
  driverName: string;
  cat: string;
  note: string;
  photo?: string | null;
  time: string;
  status: ProblemStatus;
}
const PROBLEM_REPORTS: ProblemReport[] = [];
function addProblemReport(entry: { vehiclePlate: string; driverName: string; problem: { cat: string; note: string; photo?: string | null } | null }) {
  if (!entry.problem) return;
  PROBLEM_REPORTS.push({
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    vehiclePlate: entry.vehiclePlate,
    driverName: entry.driverName,
    cat: entry.problem.cat,
    note: entry.problem.note,
    photo: entry.problem.photo ?? null,
    time: new Date().toLocaleString("fr-FR"),
    status: "pending",
  });
}
function setProblemReportStatus(id: string, status: ProblemStatus) {
  const r = PROBLEM_REPORTS.find((x) => x.id === id);
  if (r) r.status = status;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt_ = (n: Any) => (n != null ? Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—");
const fmtK_ = (n: Any) => (n != null ? Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—");
const pct_ = (a: Any, b: Any) => (b && b > 0 ? (((a - b) / b) * 100).toFixed(1) : null);
/** Affiche un pourcentage arrondi à 1 décimale (ex: 13.1%) */
const fmtPct = (n: Any) => (n != null && n !== "" ? `${Number(n).toFixed(1)}%` : "—");
const avg_ = (arr: Any[]) => { const v = arr.filter((x) => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0; };
const sum_ = (arr: Any[]) => arr.filter((x) => x != null).reduce((s, x) => s + x, 0);

// alias to keep original naming
const fmt = fmt_;
const fmtK = fmtK_;
const pct = pct_;
const avg = avg_;
const sum = sum_;

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, color, small = false }: Any) {
  const cols: Any = { default: "#1d1d1f", green: "#34c759", blue: "#007aff", red: "#ff3b30", orange: "#ff9500", purple: "#af52de", yellow: "#ffd60a", indigo: "#5e5ce6" };
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: small ? 20 : 28, fontWeight: 800, color: cols[color] || cols.default, lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Sec({ children, mt = 28, mb }: Any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#86868b", marginBottom: mb !== undefined ? mb : 10, marginTop: mt }}>
      {children}
    </div>
  );
}

function Card({ children, style = {}, className }: Any) {
  return (
    <div className={className} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function FuelBar({ level }: { level: string }) {
  const p = FUEL_PCT[level] ?? 0;
  const color = p <= 25 ? "#ff3b30" : p <= 50 ? "#ff9500" : "#34c759";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: "#f5f5f7", height: 6, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28 }}>{level}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _PeriodSelector({ items, selected, onSelect }: Any) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      {items.map((item: Any) => (
        <button key={item} onClick={() => onSelect(item)} style={{
          background: selected === item ? "#1d1d1f" : "#fff",
          color: selected === item ? "#fff" : "#86868b",
          border: `1px solid ${selected === item ? "#1d1d1f" : "#e5e5e5"}`,
          borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: selected === item ? 700 : 500,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          boxShadow: selected === item ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
        }}>{item}</button>
      ))}
    </div>
  );
}

const Y_AXIS_WIDTH = 40;

function BarChart({ data, labels, color = "#007aff", height = 120, data2, color2 = "#5e5ce6" }: Any) {
  const allVals = [...data.filter((v: Any) => v != null), ...(data2 ?? []).filter((v: Any) => v != null)];
  const max = Math.max(...allVals, 1);
  const n = data.length;
  const chartWidth = Math.max(500 - Y_AXIS_WIDTH - 20, n * 24 + 20);
  const W = Y_AXIS_WIDTH + chartWidth + 20;
  const bw = Math.max(6, Math.floor((chartWidth / n) * 0.6));
  const yTickVals = [0, max / 3, (2 * max) / 3, max].map((v) => Math.round(v));
  const uniq = [...new Set(yTickVals)].sort((a, b) => a - b);
  const yTickLabels = uniq.map((v) => ({
    label: v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
    y: height - (v / max) * (height - 8),
  }));
  // build SVG polyline for data2 (overlay line)
  const line2Pts = data2
    ? data2.map((v: Any, i: Any) => {
        if (v == null) return null;
        const x = Y_AXIS_WIDTH + (i * chartWidth) / (n - 1 || 1);
        const y = height - Math.round((v / max) * (height - 8));
        return `${x},${y}`;
      }).filter(Boolean).join(" ")
    : null;
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={W} height={height + 30} style={{ display: "block" }}>
        {yTickLabels.map((t, ti) => (
          <text key={ti} x={Y_AXIS_WIDTH - 6} y={t.y} textAnchor="end" fontSize={9} fill="#86868b" dominantBaseline="middle">{t.label}</text>
        ))}
        {data.map((v: Any, i: Any) => {
          if (v == null) return null;
          const h = Math.round((v / max) * (height - 8));
          const x = Y_AXIS_WIDTH + (i * (chartWidth - 0)) / (n - 1 || 1) - bw / 2;
          return (
            <g key={i}>
              <rect x={x} y={height - h} width={bw} height={h} rx={3} fill={color} opacity={0.85} />
              {(i === 0 || (i + 1) % 5 === 0 || i === n - 1) && <text x={x + bw / 2} y={height + 16} textAnchor="middle" fontSize={9} fill="#86868b">{labels[i]}</text>}
            </g>
          );
        })}
        {line2Pts && (
          <polyline points={line2Pts} fill="none" stroke={color2} strokeWidth={2} strokeDasharray="4 2" opacity={0.9} />
        )}
        {data2 && data2.map((v: Any, i: Any) => {
          if (v == null) return null;
          const x = Y_AXIS_WIDTH + (i * chartWidth) / (n - 1 || 1);
          const y = height - Math.round((v / max) * (height - 8));
          return <circle key={i} cx={x} cy={y} r={2.5} fill={color2} opacity={0.9} />;
        })}
      </svg>
    </div>
  );
}

function LineChart({ data, labels, color = "#34c759", height = 110 }: Any) {
  const valid = data.map((v: Any, i: Any) => ({ v, i })).filter((d: Any) => d.v != null);
  if (valid.length < 2) return null;
  const max = Math.max(...valid.map((d: Any) => d.v), 1);
  const minVal = Math.min(...valid.map((d: Any) => d.v));
  const range = max - minVal || 1;
  const n = data.length;
  const chartWidth = Math.max(500 - Y_AXIS_WIDTH - 20, n * 24 + 20);
  const W = Y_AXIS_WIDTH + chartWidth + 20;
  const yTickVals = [minVal, minVal + range / 3, minVal + (2 * range) / 3, max].map((v) => Math.round(v));
  const uniq = [...new Set(yTickVals)].sort((a, b) => a - b);
  const yTickLabels = uniq.map((v) => ({
    label: v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
    y: 8 + (1 - (v - minVal) / range) * (height - 16),
  }));
  const pts = valid.map((d: Any) => {
    const x = Y_AXIS_WIDTH + (d.i * chartWidth) / (n - 1 || 1);
    const y = 8 + (1 - (d.v - minVal) / range) * (height - 16);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={W} height={height + 28} style={{ display: "block" }}>
        {yTickLabels.map((t, ti) => (
          <text key={ti} x={Y_AXIS_WIDTH - 6} y={t.y} textAnchor="end" fontSize={9} fill="#86868b" dominantBaseline="middle">{t.label}</text>
        ))}
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {valid.map((d: Any, ii: Any) => {
          const x = Y_AXIS_WIDTH + (d.i * chartWidth) / (n - 1 || 1);
          const y = 8 + (1 - (d.v - minVal) / range) * (height - 16);
          return (
            <g key={ii}>
              <circle cx={x} cy={y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
              {(d.i === 0 || (d.i + 1) % 5 === 0 || d.i === n - 1) && <text x={x} y={height + 20} textAnchor="middle" fontSize={9} fill="#86868b">{labels[d.i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DualBar({ data2025, data2026, labels, height = 140, selectedIdx = null }: Any) {
  const all = [...data2025.filter((v: Any) => v != null), ...data2026.filter((v: Any) => v != null)];
  const max = Math.max(...all, 1);
  const bw = 16, gap = 3, grpW = bw * 2 + gap + 14;
  const W = Math.max(500, labels.length * grpW + 60);
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={W} height={height + 52} style={{ display: "block" }}>
        <rect x={20} y={8} width={10} height={8} rx={2} fill="#86868b" opacity={0.4} />
        <text x={34} y={16} fontSize={10} fill="#86868b">2025</text>
        <rect x={76} y={8} width={10} height={8} rx={2} fill="#007aff" />
        <text x={90} y={16} fontSize={10} fill="#86868b">2026</text>
        {labels.map((lbl: Any, i: Any) => {
          const x = 20 + i * grpW;
          const h25 = data2025[i] != null ? Math.round((data2025[i] / max) * (height - 20)) : 0;
          const h26 = data2026[i] != null ? Math.round((data2026[i] / max) * (height - 20)) : 0;
          const isSel = selectedIdx === i;
          const base = height + 22;
          return (
            <g key={i}>
              {isSel && <rect x={x - 4} y={26} width={bw * 2 + gap + 8} height={height - 6} rx={4} fill="#007aff" opacity={0.06} />}
              {h25 > 0 && <rect x={x} y={base - h25} width={bw} height={h25} rx={3} fill="#86868b" opacity={isSel ? 0.8 : 0.4} />}
              {h26 > 0 && <rect x={x + bw + gap} y={base - h26} width={bw} height={h26} rx={3} fill="#007aff" opacity={isSel ? 1 : 0.7} />}
              <text x={x + bw} y={base + 14} textAnchor="middle" fontSize={9} fill={isSel ? "#1d1d1f" : "#86868b"} fontWeight={isSel ? 700 : 400}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _DrvRow({ d, rank, max }: Any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f7" }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: rank <= 3 ? "#1d1d1f" : "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: rank <= 3 ? "#fff" : "#86868b" }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
        <div style={{ background: "#f5f5f7", height: 3, borderRadius: 2 }}>
          <div style={{ width: `${Math.round((d.rev / max) * 100)}%`, height: "100%", borderRadius: 2, background: rank <= 3 ? "#1d1d1f" : "#d1d1d6" }} />
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(d.rev)}</div>
        <div style={{ fontSize: 10, color: "#86868b" }}>{d.missions} mission{d.missions > 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}

function JobPill({ label, count, color }: Any) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: color || "#86868b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1d1d1f", lineHeight: 1 }}>{count}</div>
    </div>
  );
}


// ─── WEEK HELPERS (Mon–Sun) ─────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const dayOfWeek = date.getDay();
  const toMonday = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() - toMonday);
  return toDateStr(date);
}
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + n);
  return toDateStr(date);
}
function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ═══════════════════════════════════════════════════════════════════════════
// DAILY VIEW
// ═══════════════════════════════════════════════════════════════════════════
function computeFleetAvailability(date: string, vehicles: FleetVehicle[], unavails: VehicleUnavailability[]) {
  // Tous les véhicules actifs (office + lease) — un véhicule lease peut aussi être en révision
  const allVehicles = vehicles.filter(v => v.status !== "inactive" && v.status !== "Inactive");
  // Pour les indispos "resolved" on se base sur start_date/end_date (historique)
  // Pour les "active" sans end_date, elles sont en cours donc valides pour toute date >= start_date
  const activeUnavails = unavails.filter(u => {
    if (u.start_date > date) return false;
    if (u.status === "active") return !u.end_date || u.end_date >= date;
    // resolved : la période couvrait cette date
    return u.end_date ? u.end_date >= date : false;
  });
  const unavailPlates = new Set(activeUnavails.map(u => u.plate));
  const availableVehicles = allVehicles.filter(v => !unavailPlates.has(v.plate));
  const unavailableVehicles = allVehicles.filter(v => unavailPlates.has(v.plate));
  const rate = allVehicles.length > 0 ? Math.round((availableVehicles.length / allVehicles.length) * 100) : 100;
  return { total: allVehicles.length, available: availableVehicles.length, unavailableVehicles, activeUnavails, rate };
}

function DailyView({ vehicles, isActive, unavails, bauFilter }: { vehicles: FleetVehicle[]; isActive: boolean; unavails: VehicleUnavailability[]; bauFilter: "all" | "BAU" | "Event" }) {
  const { jobs: rawJobs, loading: jobsLoading, error: jobsError } = useJobs();
  const allJobs = useMemo(() => {
    if (bauFilter === "all") return rawJobs;
    if (bauFilter === "BAU") return rawJobs.filter(j => j.bau_event === "BAU");
    return rawJobs.filter(j => j.bau_event != null && j.bau_event !== "BAU");
  }, [rawJobs, bauFilter]);
  const today = toDateStr(new Date());
  const weekStartDefault = getWeekStart(today);
  const [weekStart, setWeekStart] = useState(weekStartDefault);
  const [selectedDate, setSelectedDate] = useState(today);
  const [dailyOpForDate, setDailyOpForDate] = useState<Any[]>([]);
  const [dailyOpLoading, setDailyOpLoading] = useState(false);
  const [dailyOpError, setDailyOpError] = useState<string | null>(null);

  // Attendance data for selected date (auto-calculate driver stats)
  const [attForDate, setAttForDate] = useState<AttendanceRecord[]>([]);
  const [attStaff, setAttStaff] = useState<Staff[]>([]);
  const [, setAttLoading] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Jobs : filtrés depuis le cache local (pas d’appel API)
  const jobsForDate = useMemo(
    () => allJobs.filter((j) => j.date && j.date.slice(0, 10) === selectedDate),
    [allJobs, selectedDate],
  );

  // daily_op : appel API uniquement quand l’onglet Daily est actif
  useEffect(() => {
    if (!isActive) return;
    setDailyOpLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setDailyOpError(null);
    fetchDailyOp({ date: selectedDate })
      .then((dailyOp) => {
        setDailyOpForDate(dailyOp);
        setDailyOpLoading(false);
      })
      .catch((err) => {
        setDailyOpError(err instanceof Error ? err.message : String(err));
        setDailyOpForDate([]);
        setDailyOpLoading(false);
      });
  }, [selectedDate, isActive]);

  // Attendance + staff : fetch when tab is active
  useEffect(() => {
    if (!isActive) return;
    setAttLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      fetchAttendanceByDate(selectedDate),
      fetchStaff(),
    ]).then(([att, staff]) => {
      setAttForDate(att);
      setAttStaff(staff);
      setAttLoading(false);
    }).catch(() => {
      setAttForDate([]);
      setAttStaff([]);
      setAttLoading(false);
    });
  }, [selectedDate, isActive]);

  const loading = jobsLoading || dailyOpLoading;

  const dailyDataForDate = useMemo(() => {
    const dailyOpRecord = dailyOpForDate[0]
      ? { free: dailyOpForDate[0].free ?? 0, pct_working: dailyOpForDate[0].pct_working ?? 0, total_drivers: dailyOpForDate[0].total_drivers, working: dailyOpForDate[0].working, pool: dailyOpForDate[0].pool }
      : undefined;
    return deriveDailyData(jobsForDate, vehicles, dailyOpRecord);
  }, [jobsForDate, vehicles, dailyOpForDate]);
  const dayKey = getDailyKey(selectedDate);
  const d = dailyDataForDate[dayKey] ?? null;

  // Auto-calculate driver stats from attendance data (replaces manual daily_op for driver counts)
  const attDriverStats = useMemo(() => {
    if (attStaff.length === 0) return null;
    const limoDrivers = attStaff.filter(s => s.designation === "LIMO DRIVER");
    const totalDrivers = limoDrivers.length;
    // Build attendance map for the date
    const attMap = new Map<number, AttendanceRecord>();
    for (const a of attForDate) attMap.set(a.staffId, a);
    let present = 0, od = 0, ot = 0, sl = 0, leave = 0, absent = 0, other = 0;
    for (const s of limoDrivers) {
      const a = attMap.get(s.id);
      if (!a) { present++; continue; } // No record = assume present
      const st = a.status;
      if (st === "P") present++;
      else if (st === "OD") od++;
      else if (st === "OT") { ot++; present++; } // OT = working + overtime
      else if (st === "SL" || st === "SUP") sl++;
      else if (st === "L" || st === "UL" || st === "E") leave++;
      else if (st === "A") absent++;
      else if (st === "H" || st === "HD" || st === "RW") other++;
      else present++;
    }
    const working = present + ot;
    const totalOtHours = attForDate.reduce((s, a) => s + (a.otHours ?? 0), 0);
    return { totalDrivers, working, present, od, ot, sl, leave, absent, other, totalOtHours, hasData: attForDate.length > 0 };
  }, [attStaff, attForDate]);

  const goPrevWeek = () => {
    const next = addDays(weekStart, -7);
    setWeekStart(next);
    setSelectedDate(next);
  };
  const goNextWeek = () => {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    setSelectedDate(next);
  };

  const weekLabel = (() => {
    const mon = weekDates[0];
    const sun = weekDates[6];
    if (!mon || !sun) return "";
    const d1 = new Date(mon + "T12:00:00");
    const d2 = new Date(sun + "T12:00:00");
    return `${d1.getDate()}–${d2.getDate()} ${d1.toLocaleDateString("fr-FR", { month: "short" })} ${d1.getFullYear()}`;
  })();

  if (jobsLoading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868b" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Chargement des jobs…</div>
      </div>
    );
  }
  if (jobsError && allJobs.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#ff3b30" }}>Erreur</div>
        <div style={{ fontSize: 12, marginTop: 6, color: "#86868b" }}>{jobsError}</div>
      </div>
    );
  }

  const datePickerEl = (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={goPrevWeek}
          disabled={loading}
          aria-label="Semaine précédente"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
            color: "#1d1d1f",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 18,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          ‹
        </button>
        <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0, justifyContent: "center", flexWrap: "wrap" }}>
          {weekDates.map((dateStr, i) => {
            const dayNum = new Date(dateStr + "T12:00:00").getDate();
            const hasData = allJobs.some((j) => j.date && j.date.slice(0, 10) === dateStr);
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  minWidth: 44,
                  padding: "10px 8px",
                  borderRadius: 12,
                  border: isSelected ? "none" : "1px solid #e5e5e5",
                  background: isSelected ? "#1d1d1f" : "#fff",
                  color: isSelected ? "#fff" : "#1d1d1f",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "rgba(255,255,255,0.8)" : "#86868b" }}>{WEEKDAY_LABELS[i]}</span>
                <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{dayNum}</span>
                {hasData && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.9)" : "#34c759", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={goNextWeek}
          disabled={loading}
          aria-label="Semaine suivante"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
            color: "#1d1d1f",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 18,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          ›
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#86868b", marginTop: 10, textAlign: "center" }}>{weekLabel}</div>
      <div style={{ fontSize: 11, color: "#86868b", marginTop: 4, textAlign: "center" }}>
        {jobsForDate.length} job(s) · {dailyOpForDate.length} daily_op pour le jour sélectionné
        {dailyOpError && <span style={{ color: "#ff3b30", marginLeft: 8 }}>· Erreur daily_op</span>}
      </div>
    </Card>
  );

  if (!d) {
    return (
      <div>
        <Sec mt={0}>Semaine</Sec>
        {datePickerEl}
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune donnée pour ce jour</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Aucun job trouvé pour le {new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.</div>
        </div>
      </div>
    );
  }

  const { drivers, jobs, revenue, topClients, providers, fleetDemand } = d;
  const horsLease = jobs.total - jobs.LT - jobs.LH;
  const avail = computeFleetAvailability(selectedDate, vehicles, unavails);
  const maxClient = topClients[0]?.rev || 1;
  const externalJobsCount = providers.filter((p: Any) => p.type === "External").reduce((s: number, p: Any) => s + p.jobs, 0);
  const totalHLJobs = providers.reduce((s: number, p: Any) => s + p.jobs, 0);
  const pctExternal = totalHLJobs > 0 ? ((externalJobsCount / totalHLJobs) * 100).toFixed(1) : "0";

  return (
    <div>
      <Sec mt={0}>Semaine</Sec>
      {datePickerEl}

      <Sec mt={20}>Chauffeurs · {d.label}</Sec>
      {attDriverStats?.hasData ? (
        <>
          <div style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#34c759", fontWeight: 500, marginBottom: 12 }}>
            ✓ Données calculées automatiquement depuis l'attendance ({attDriverStats.totalDrivers} limo drivers)
          </div>
          <div className="g5 fu d1">
            <Kpi label="Total Limo Drivers" value={attDriverStats.totalDrivers} />
            <Kpi label="Présents / OT" value={attDriverStats.working} color="green" sub={`${attDriverStats.present} P + ${attDriverStats.ot} OT`} />
            <Kpi label="Off Day" value={attDriverStats.od} color="blue" />
            <Kpi label="Sick Leave" value={attDriverStats.sl} color="red" sub="SL + SUP" />
            <Kpi label="Leave / Absent" value={attDriverStats.leave + attDriverStats.absent} color="red" sub={`${attDriverStats.leave} leave · ${attDriverStats.absent} absent`} />
          </div>
        </>
      ) : (
        <>
          {dailyOpForDate.length === 0 && (
            <div style={{ background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.3)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#ff9500", fontWeight: 500, marginBottom: 12 }}>
              ⚠ Aucune saisie attendance/daily op pour cette date — les données chauffeurs sont estimées depuis les jobs.
            </div>
          )}
          <div className="g5 fu d1">
            <Kpi label="Total drivers" value={drivers.total} />
            <Kpi label="Présents" value={drivers.working} color="green" sub={`${drivers.total > 0 ? Math.round((drivers.working / drivers.total) * 100) : 0}% disponibles`} />
            <Kpi label="Driver Free" value={drivers.free} color="blue" />
            <Kpi label="Driver Pool" value={drivers.pool} />
            <Kpi label="Absents" value={drivers.off + drivers.sick + drivers.leave} color="red" sub={`${drivers.off} off · ${drivers.sick} sick · ${drivers.leave} leave`} />
          </div>
        </>
      )}

      <Sec>Revenue journalier</Sec>
      <div className="fu d2" style={{ background: "#1d1d1f", borderRadius: 20, padding: "24px 28px", marginBottom: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
        <div className="hero-row">
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>CA Hors LT & LH</div>
            <div className="hero-big" style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-2px" }}>
              {fmt(revenue.horsLease)} <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>AED</span>
            </div>
          </div>
          <div className="hero-stats">
            {[
              { label: "Rev / Driver Free*", value: `${fmt(revenue.revPerDriver)} AED` },
              { label: "Job / Driver Free", value: revenue.jobPerDriver },
              { label: "Prix moyen / job", value: `${fmt(revenue.avgPrice)} AED` },
            ].map((s: Any) => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
          * Rev / Driver Free = Internal seulement ({fmt(revenue.internalRev)} AED) ÷ {drivers.free} free drivers
        </div>
      </div>

      <div className="g4 fu d2">
        <Kpi label="Jobs hors lease" value={horsLease} color="green" sub={`${Math.round((horsLease / jobs.total) * 100)}% du total`} />
        <Kpi label="Revenue internal" value={`${fmt(revenue.internalRev)} AED`} color="blue" sub="Chabe Luxury" />
        <Kpi label="Revenue external" value={`${fmt(revenue.externalRev)} AED`} color="orange" sub={`${fmtPct(pctExternal)} sous-traitance`} />
        <Kpi label="LT + LH" value={jobs.LT + jobs.LH} color="orange" sub="facturé mensuellement" />
      </div>

      {/* SOUS-TRAITANCE */}
      <Sec>Sous-traitance</Sec>
      <Card className="fu d2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Répartition par prestataire</div>
            <div style={{ fontSize: 11, color: "#86868b" }}>Hors LT & LH · {d.label}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#007aff" }}>{fmtPct(100 - Number.parseFloat(pctExternal))} Interne</span>
            <span style={{ fontSize: 12, color: "#86868b" }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ff9500" }}>{fmtPct(pctExternal)} Externe</span>
          </div>
        </div>
        {providers.map((p: Any, i: Any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < providers.length - 1 ? "1px solid #f5f5f7" : "none" }}>
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: p.type === "Internal" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)", color: p.type === "Internal" ? "#007aff" : "#ff9500" }}>
                {p.type === "Internal" ? "INTERNE" : "EXTERNE"}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              <div style={{ background: "#f5f5f7", height: 4, borderRadius: 2 }}>
                <div style={{ width: `${Number(p.pct).toFixed(1)}%`, height: "100%", borderRadius: 2, background: p.type === "Internal" ? "#007aff" : "#ff9500" }} />
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(p.rev)} AED</div>
              <div style={{ fontSize: 10, color: "#86868b" }}>{p.jobs} jobs · {fmtPct(p.pct)}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* DISPONIBILITÉ FLOTTE */}
      <Sec>Disponibilité flotte · {d.label}</Sec>
      <Card className="fu d3" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: avail.rate >= 80 ? "#34c759" : avail.rate >= 60 ? "#ff9500" : "#ff3b30", letterSpacing: "-1px" }}>{avail.rate}%</span>
            <span style={{ fontSize: 13, color: "#86868b" }}>disponibilité</span>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ background: "#f5f5f7", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: `${avail.rate}%`, height: "100%", borderRadius: 4, background: avail.rate >= 80 ? "#34c759" : avail.rate >= 60 ? "#ff9500" : "#ff3b30", transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#86868b" }}>{avail.available}/{avail.total} véhicules disponibles</div>
          </div>
          {avail.unavailableVehicles.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {avail.unavailableVehicles.map(v => (
                <span key={v.plate} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}>{v.plate} ✗</span>
              ))}
            </div>
          )}
          {avail.unavailableVehicles.length === 0 && (
            <span style={{ fontSize: 12, color: "#34c759", fontWeight: 600 }}>✓ Toute la flotte disponible</span>
          )}
        </div>
      </Card>

      {avail.activeUnavails.length > 0 && (
        <div style={{ background: "rgba(255,59,48,0.04)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 16, padding: "16px 18px", marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ color: "#ff3b30", fontSize: 14 }}>⊙</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ff3b30" }}>
              Unavailable vehicles ({avail.activeUnavails.length})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {avail.activeUnavails.map((u) => (
              <div key={u.id} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
                <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{u.plate}</div>
                <div style={{ color: "#86868b", marginTop: 1 }}>{u.reason || "Unavailable"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLEET VS DEMAND */}
      <Sec>Besoins flotte vs disponible</Sec>
      <Card className="fu d3">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Analyse capacité · règle 2.5 missions/véhicule</div>
          <div style={{ fontSize: 11, color: "#86868b" }}>Missions (hors lease) ÷ 2.5 = véhicules nécessaires · comparé à flotte office</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
          {fleetDemand.map((f: Any) => {
            const diff = f.fleet - f.need; // positif = trop de véhicules, négatif = pas assez
            const besoinArrondi = Math.ceil(f.need);
            const status =
              f.fleet < f.need * 0.8 ? "under" :   // manque critique → rouge
              f.fleet < f.need       ? "tight" :    // légèrement insuffisant → orange
              f.fleet > besoinArrondi ? "surplus" :  // flotte > besoin → surplus bleu
              "ok";                                   // flotte == besoin arrondi → équilibré vert
            const statusColor =
              status === "ok"      ? "#34c759" :
              status === "surplus" ? "#007aff" :
              status === "tight"   ? "#ff9500" :
              "#ff3b30";
            const statusLabel =
              status === "ok"      ? "✓ Équilibré" :
              status === "surplus" ? `↑ Surplus +${diff.toFixed(1)}` :
              status === "tight"   ? "⚠ Limite" :
              "✗ Insuffisant";
            return (
              <div key={f.type} style={{ background: "#f5f5f7", borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${statusColor}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{f.type}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#86868b" }}>Missions</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{f.missions}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#86868b" }}>Besoin (÷2.5)</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{f.need}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#86868b" }}>Flotte office</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{f.fleet}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
                {status === "under" && (
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>
                    {`${Math.abs(diff).toFixed(1)} véhicule(s) manquants`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* SERVICE TYPES */}
      <Sec>Par type de service</Sec>
      <div className="g7 fu d3">
        {[{ l: "LT", c: jobs.LT, col: "#ff9500" }, { l: "LH", c: jobs.LH, col: "#ff9500" }, { l: "ST", c: jobs.ST, col: "#007aff" }, { l: "SH", c: jobs.SH, col: "#007aff" }, { l: "T", c: jobs.T, col: "#34c759" }, { l: "H", c: jobs.H, col: "#34c759" }, { l: "IT/IHS", c: jobs.IT + jobs.IHS, col: "#86868b" }].map((j: Any) => (
          <JobPill key={j.l} label={j.l} count={j.c} color={j.col} />
        ))}
      </div>

      {/* CLIENTS — Daily: pas de vue industrie ni performance chauffeur */}
      <Sec>Clients · hors LT & LH</Sec>
      <Card className="fu d3">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Top clients</div>
        <div style={{ fontSize: 11, color: "#86868b", marginBottom: 16 }}>Billing Account · hors LT & LH</div>
        {topClients.map((c: Any, i: Any) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f5f5f7" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: i < 3 ? "#1d1d1f" : "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i < 3 ? "#fff" : "#86868b" }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{c.name}</div>
              <div style={{ background: "#f5f5f7", height: 3, borderRadius: 2 }}>
                <div style={{ width: `${Math.round((c.rev / maxClient) * 100)}%`, height: "100%", borderRadius: 2, background: i < 3 ? "#1d1d1f" : "#d1d1d6" }} />
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(c.rev)} AED</div>
              <div style={{ fontSize: 10, color: "#86868b" }}>{c.jobs} jobs</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME VIEW — Current Month Overview
// ═══════════════════════════════════════════════════════════════════════════
const MONTHS_FULL_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function HomeView({ monthlyData, vehicles, loading, unavails, onNavigate }: {
  monthlyData: Record<string, Any>;
  vehicles: FleetVehicle[];
  loading?: boolean;
  unavails: VehicleUnavailability[];
  onNavigate: (view: string) => void;
}) {
  const now = new Date();
  const curMonthIdx = now.getMonth();
  const curYear = now.getFullYear();
  const MONTHS_FR_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const curKey = `${MONTHS_FR_SHORT[curMonthIdx]} ${curYear}`;
  const prevKey = curMonthIdx > 0
    ? `${MONTHS_FR_SHORT[curMonthIdx - 1]} ${curYear}`
    : `${MONTHS_FR_SHORT[11]} ${curYear - 1}`;

  const m = monthlyData[curKey] ?? null;
  const prev = monthlyData[prevKey] ?? null;

  // Fleet availability (must be before any early return — hooks cannot be conditional)
  const curDay = now.getDate();
  const fleetAvailRate = useMemo(() => {
    if (!m || !vehicles.length) return null;
    const today = `${curYear}-${String(curMonthIdx + 1).padStart(2, "0")}-${String(curDay).padStart(2, "0")}`;
    return computeFleetAvailability(today, vehicles, unavails);
  }, [m, vehicles, unavails, curYear, curMonthIdx, curDay]);

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#86868b" }}>
        <div style={{ fontSize: 13 }}>Chargement…</div>
      </div>
    );
  }

  // Helpers
  const totalRev = m ? sum_(m.amount) : 0;
  const totalRevAll = m ? sum_(m.amountTotal) : 0;
  const totalJobs = m ? sum_(m.jobs) : 0;
  const totalLT = m ? sum_(m.LT) : 0;
  const totalLH = m ? sum_(m.LH) : 0;
  const totalHL = totalJobs - totalLT - totalLH;
  const avgRpd = m ? avg_(m.revDriver) : 0;
  const avgPctWorking = m ? avg_(m.pctWorking) : 0;
  const uniqueDrivers = m?.uniqueDrivers ?? 0;
  const nbDays = m ? m.days.length : 0;

  // Previous month for comparison
  const prevTotalRev = prev ? sum_(prev.amount) : null;
  const prevTotalJobs = prev ? sum_(prev.jobs) : null;
  const prevTotalHL = prev ? (sum_(prev.jobs) - sum_(prev.LT) - sum_(prev.LH)) : null;
  const prevAvgRpd = prev ? avg_(prev.revDriver) : null;

  // Fleet
  const fleetOffice = vehicles.filter(v => v.location === "Office").length;
  const fleetTotal = vehicles.length;

  // Delta helper
  const delta = (cur: number, prev: number | null) => {
    if (prev == null || prev === 0) return null;
    return ((cur - prev) / prev * 100).toFixed(1);
  };

  const deltaBadge = (cur: number, p: number | null, invert = false) => {
    const d = delta(cur, p);
    if (d == null) return null;
    const n = parseFloat(d);
    const positive = invert ? n < 0 : n > 0;
    const color = n === 0 ? "#86868b" : positive ? "#34c759" : "#ff3b30";
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color, marginLeft: 6 }}>
        {n > 0 ? "+" : ""}{d}%
      </span>
    );
  };

  const monthLabel = MONTHS_FULL_FR[curMonthIdx] ?? "";

  // Top clients
  const topClients = m?.billingAccounts?.slice(0, 5) ?? [];
  const maxClientRev = topClients[0]?.rev ?? 1;

  // Verticals
  const verticals = m?.verticals ?? [];

  // Mini sparkline helper (simple CSS bars) — returns JSX directly, not a component
  const miniBar = (data: number[], color = "#007aff") => {
    const max = Math.max(...data, 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 40 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, background: color, borderRadius: 1, height: `${Math.max((v / max) * 100, 2)}%`, opacity: 0.8, minWidth: 2 }} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1d1d1f", margin: 0, letterSpacing: "-0.5px" }}>
          {monthLabel} {curYear}
        </h1>
        <div style={{ fontSize: 13, color: "#86868b", marginTop: 4 }}>
          {nbDays} jours d'activité{!m && " — aucune donnée pour ce mois"}
        </div>
      </div>

      {!m ? (
        <Card style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#86868b" }}>Pas encore de données pour {monthLabel}</div>
          <div style={{ fontSize: 12, color: "#aeaeb2", marginTop: 6 }}>Les KPIs apparaîtront dès que les jobs seront importés.</div>
        </Card>
      ) : (
        <>
          {/* KPI Row 1 — Revenue */}
          <Sec mt={0}>Revenue</Sec>
          <div className="g4 fu d1">
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Revenue hors lease</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#007aff", lineHeight: 1, letterSpacing: "-0.5px" }}>
                {fmt_(totalRev)} <span style={{ fontSize: 14, fontWeight: 600 }}>AED</span>
                {deltaBadge(totalRev, prevTotalRev)}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>hors LT & LH</div>
              {m.amount.length > 1 && <div style={{ marginTop: 10 }}>{miniBar(m.amount)}</div>}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Revenue tout compris</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#5e5ce6", lineHeight: 1, letterSpacing: "-0.5px" }}>
                {fmt_(totalRevAll)} <span style={{ fontSize: 14, fontWeight: 600 }}>AED</span>
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>LT & LH inclus</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Rev / Driver / jour</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34c759", lineHeight: 1, letterSpacing: "-0.5px" }}>
                {fmt_(avgRpd)} <span style={{ fontSize: 14, fontWeight: 600 }}>AED</span>
                {deltaBadge(avgRpd, prevAvgRpd)}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>Internal · moyenne journalière</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>% Chauffeurs au travail</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#007aff", lineHeight: 1, letterSpacing: "-0.5px" }}>
                {avgPctWorking.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 600 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>{uniqueDrivers} chauffeurs actifs</div>
            </div>
          </div>

          {/* KPI Row 2 — Missions */}
          <Sec>Missions</Sec>
          <div className="g4 fu d1">
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Total missions</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1d1d1f", lineHeight: 1 }}>
                {totalJobs}
                {deltaBadge(totalJobs, prevTotalJobs)}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>
                {nbDays > 0 ? `${(totalJobs / nbDays).toFixed(1)} / jour` : ""}
              </div>
              {m.jobs.length > 1 && <div style={{ marginTop: 10 }}>{miniBar(m.jobs, "#1d1d1f")}</div>}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Missions hors lease</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34c759", lineHeight: 1 }}>
                {totalHL}
                {deltaBadge(totalHL, prevTotalHL)}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>{totalJobs > 0 ? `${Math.round((totalHL / totalJobs) * 100)}% du total` : ""}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Lease (LT + LH)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#ff9500", lineHeight: 1 }}>
                {totalLT + totalLH}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>LT: {totalLT} · LH: {totalLH}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6 }}>Flotte</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1d1d1f", lineHeight: 1 }}>{fleetOffice}</div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 5 }}>
                véhicules Office / {fleetTotal} total
                {fleetAvailRate && <span> · <span style={{ color: fleetAvailRate.rate >= 90 ? "#34c759" : fleetAvailRate.rate >= 70 ? "#ff9500" : "#ff3b30", fontWeight: 600 }}>{fleetAvailRate.rate}%</span> dispo</span>}
              </div>
            </div>
          </div>

          {/* Two columns: Top Clients + Verticals */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
            {/* Top Clients */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#86868b" }}>Top Clients</div>
                <button onClick={() => onNavigate("monthly")} style={{ fontSize: 11, color: "#007aff", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Voir tout →</button>
              </div>
              {topClients.length === 0 && <div style={{ fontSize: 12, color: "#aeaeb2" }}>Aucun client</div>}
              {topClients.map((c: Any, i: number) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f", fontVariantNumeric: "tabular-nums" }}>{fmt_(c.rev)} AED</span>
                  </div>
                  <div style={{ height: 4, background: "#f5f5f7", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.rev / maxClientRev) * 100}%`, background: "linear-gradient(90deg, #007aff, #5ac8fa)", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#aeaeb2", marginTop: 2 }}>{c.jobs} missions</div>
                </div>
              ))}
            </Card>

            {/* Verticals */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#86868b" }}>Verticals</div>
                <button onClick={() => onNavigate("monthly")} style={{ fontSize: 11, color: "#007aff", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Voir tout →</button>
              </div>
              {verticals.length === 0 && <div style={{ fontSize: 12, color: "#aeaeb2" }}>Aucune donnée</div>}
              {verticals.map((v: Any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: v.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f", fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: 8 }}>{v.pct}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                      <span style={{ fontSize: 10, color: "#aeaeb2" }}>{v.jobs} missions</span>
                      <span style={{ fontSize: 10, color: "#aeaeb2", fontVariantNumeric: "tabular-nums" }}>{fmt_(v.rev)} AED</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Top Drivers */}
          {(m.driverPerf?.length ?? 0) > 0 && (
            <>
              <Sec>Top Chauffeurs</Sec>
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {(m.driverPerf as Any[]).slice(0, 8).map((d: Any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "rgba(0,122,255,0.05)" : "#f9f9fb", borderRadius: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#007aff" : i < 3 ? "#5e5ce6" : "#86868b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: "#86868b" }}>{d.jobs} missions · {fmt_(d.rev)} AED</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* Quick nav */}
          <Sec>Accès rapide</Sec>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[
              { id: "daily", label: "Vue Daily", icon: "📅" },
              { id: "monthly", label: "Vue Monthly", icon: "📊" },
              { id: "annual", label: "Vue Annual", icon: "📈" },
              { id: "fleet", label: "Flotte", icon: "🚗" },
              { id: "attendance", label: "Attendance", icon: "⏰" },
              { id: "sales", label: "Sales", icon: "💼" },
            ].map(nav => (
              <button key={nav.id} onClick={() => onNavigate(nav.id)} style={{
                background: "#fff", border: "none", borderRadius: 12, padding: "14px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                fontFamily: "inherit", transition: "transform 0.1s, box-shadow 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
              >
                <span style={{ fontSize: 20 }}>{nav.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{nav.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY VIEW
// ═══════════════════════════════════════════════════════════════════════════
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function parseMonthKey(key: string): { monthIdx: number; year: number } {
  const parts = key.split(" ");
  const monthIdx = MONTHS_FR.indexOf(parts[0] ?? ""); // 0-based
  const year = parseInt(parts[1] ?? "0", 10);
  return { monthIdx, year };
}

function MonthlyView({ monthlyData, monthlyKeys, vehicles, loading, unavails }: { monthlyData: Record<string, Any>; monthlyKeys: string[]; vehicles: FleetVehicle[]; loading?: boolean; unavails: VehicleUnavailability[] }) {
  const sortedKeys = useMemo(() => [...monthlyKeys].sort((a, b) => {
    const pa = parseMonthKey(a), pb = parseMonthKey(b);
    return pa.year !== pb.year ? pa.year - pb.year : pa.monthIdx - pb.monthIdx;
  }), [monthlyKeys]);

  const latestKey = sortedKeys[sortedKeys.length - 1] ?? "";
  const latestYear = latestKey ? parseMonthKey(latestKey).year : new Date().getFullYear();
  const [sel, setSel] = useState(latestKey);
  const [selYear, setSelYear] = useState(latestYear);
  const [baSearch, setBaSearch] = useState("");

  // Si les données arrivent après le montage (chargement asynchrone), initialiser sel
  useEffect(() => {
    if (sortedKeys.length > 0 && !sel) {
      const latest = sortedKeys[sortedKeys.length - 1];
      setSel(latest); // eslint-disable-line react-hooks/set-state-in-effect
      setSelYear(parseMonthKey(latest).year);  
    }
  }, [sortedKeys, sel]);

  const availableYears = useMemo(() =>
    [...new Set(sortedKeys.map(k => parseMonthKey(k).year))].sort((a, b) => a - b),
    [sortedKeys]);

  const availableMonthIdxSet = useMemo(() =>
    new Set(sortedKeys.filter(k => parseMonthKey(k).year === selYear).map(k => parseMonthKey(k).monthIdx)),
    [sortedKeys, selYear]);

  function handleYearSelect(year: number) {
    setSelYear(year);
    const currentIdx = sel ? parseMonthKey(sel).monthIdx : -1;
    const candidate = `${MONTHS_FR[currentIdx] ?? ""} ${year}`;
    const yrKeys = sortedKeys.filter(k => parseMonthKey(k).year === year);
    setSel(monthlyData[candidate] ? candidate : (yrKeys[yrKeys.length - 1] ?? ""));
  }

  const m = sel ? monthlyData[sel] : null;

  // Fleet availability for the selected month (must be before early returns)
  const monthAvailability = useMemo(() => {
    if (!sel || !m) return null;
    const { monthIdx, year } = parseMonthKey(sel);
    const dates = (m.days as number[]).map(day =>
      `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
    const dailyAvails = dates.map(date => computeFleetAvailability(date, vehicles, unavails));
    const avgRate = Math.round(dailyAvails.reduce((s, a) => s + a.rate, 0) / Math.max(dailyAvails.length, 1));
    const impactedDays = dailyAvails.filter(a => a.unavailableVehicles.length > 0).length;
    const unavailPlatesMonth = [...new Set(dailyAvails.flatMap(a => a.unavailableVehicles.map(v => v.plate)))];
    return { avgRate, impactedDays, totalDays: dailyAvails.length, unavailPlatesMonth };
  }, [sel, m, vehicles, unavails]);

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868b" }}>
        <div style={{ fontSize: 13 }}>Chargement des données…</div>
      </div>
    );
  }
  if (!m || monthlyKeys.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868b" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📆</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune donnée mensuelle</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Aucun job trouvé en base.</div>
      </div>
    );
  }
  const totalRev = sum(m.amount);
  const totalRevAll = sum(m.amountTotal);
  const totalJobs = sum(m.jobs);
  const totalLT = sum(m.LT), totalLH = sum(m.LH);
  const totalHL = totalJobs - totalLT - totalLH;
  const avgFree = avg(m.free);
  const avgPctWorking = avg(m.pctWorking);
  const avgRpd = avg(m.revDriver);
  const labels = m.days.map((d: Any) => String(d));
  const byType = { LT: totalLT, LH: totalLH, ST: sum(m.ST), SH: sum(m.SH), S: sum(m.S), T: sum(m.T), H: sum(m.H) };

  const totalBA = sum(m.billingAccounts.map((b: Any) => b.rev));
  const totalBAEur = sum(m.billingAccounts.map((b: Any) => b.revEur));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _maxBA = m.billingAccounts[0]?.rev || 1;
  const internalPct = m.providers.find((p: Any) => p.type === "Internal")?.pct || 0;

  const nbDays = m.days.length;
  const fleetOffice = vehicles.filter((v) => v.location === "Office").length;

  // Missions hors-lease par type de véhicule réel (vehicle_type_assigned/requested)
  const vtm = m.vehicleTypeMissions ?? {};
  const totalHorsLease = Object.values(vtm).reduce((s: number, v: Any) => s + (v as number), 0);
  const besoinTotal = Math.ceil(totalHorsLease / (nbDays * 2.5));

  const selIdx = sortedKeys.indexOf(sel);
  const prevKey = selIdx > 0 ? sortedKeys[selIdx - 1] : undefined;
  const prevM = prevKey ? monthlyData[prevKey] : null;
  const prevDays = prevM ? prevM.days.length : nbDays;
  const prevVtm = prevM?.vehicleTypeMissions ?? {};
  const prevHL: number | null = prevM ? Object.values(prevVtm).reduce((s: number, v: Any) => s + (v as number), 0) : null;
  const prevBesoin = prevHL != null ? Math.ceil(prevHL / (prevDays * 2.5)) : null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _diff = prevBesoin != null ? besoinTotal - prevBesoin : null;
  const surplus = fleetOffice - besoinTotal;

  const fleetRows = VEHICLE_TYPES.map((type) => {
    const missions = vtm[type] ?? 0;
    const prevMissions = prevM ? (prevVtm[type] ?? 0) : null;
    return {
      cat: type,
      missions,
      besoin: missions ? Math.ceil(missions / (nbDays * 2.5)) : 0,
      dispo: vehicles.filter((v) => v.location === "Office" && getVehicleType(v) === type).length,
      prevMissions,
    };
  });

  return (
    <div>
      <Card style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Year pills */}
          <div style={{ display: "flex", gap: 4, background: "#f5f5f7", borderRadius: 10, padding: 3 }}>
            {availableYears.map(year => (
              <button key={year} onClick={() => handleYearSelect(year)} style={{
                background: selYear === year ? "#fff" : "transparent",
                border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 13,
                fontWeight: selYear === year ? 700 : 500,
                color: selYear === year ? "#1d1d1f" : "#86868b",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: selYear === year ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>{year}</button>
            ))}
          </div>
          {/* Separator */}
          <div style={{ width: 1, height: 24, background: "#e5e5ea", flexShrink: 0 }} />
          {/* Month pills — horizontal */}
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {MONTHS_FR.map((label, idx) => {
              const key = `${label} ${selYear}`;
              const hasData = availableMonthIdxSet.has(idx);
              const isSelected = sel === key;
              return (
                <button key={label} onClick={() => hasData && setSel(key)} disabled={!hasData} style={{
                  background: isSelected ? "#007aff" : hasData ? "rgba(0,0,0,0.03)" : "transparent",
                  color: isSelected ? "#fff" : hasData ? "#1d1d1f" : "#c7c7cc",
                  border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12,
                  fontWeight: isSelected ? 700 : hasData ? 500 : 400,
                  cursor: hasData ? "pointer" : "default",
                  fontFamily: "inherit", transition: "all 0.15s",
                  boxShadow: isSelected ? "0 2px 8px rgba(0,122,255,0.3)" : "none",
                  letterSpacing: "0.2px",
                }}>{label}</button>
              );
            })}
          </div>
        </div>
      </Card>

      <Sec mt={20}>Résumé — {m.label}</Sec>
      <div className="g4 fu d1">
        <Kpi label="Revenue hors lease" value={`${fmtK(totalRev)} AED`} color="blue" sub="hors LT & LH" />
        <Kpi label="Revenue tout compris" value={`${fmtK(totalRevAll)} AED`} color="indigo" sub="LT & LH inclus" />
        <Kpi label="Rev moyen / Driver" value={`${fmt(avgRpd)} AED`} color="green" sub="Internal · par jour" />
        <Kpi label="% Internal" value={fmtPct(internalPct)} color="blue" sub={`${fmtPct(100 - internalPct)} sous-traitance`} />
      </div>
      <div className="g5 fu d2" style={{ marginTop: 10 }}>
        <Kpi label="Total missions" value={totalJobs} />
        <Kpi label="Missions hors lease" value={totalHL} color="green" sub={`${Math.round((totalHL / totalJobs) * 100)}% du total`} />
        <Kpi label="Chauffeurs Working" value={avg(m.working)} color="blue" sub="moyenne / jour (Daily Op)" />
        <Kpi label="Driver Free moyen" value={avgFree} sub="chauffeurs / jour" />
        <Kpi label="% au travail" value={`${avgPctWorking.toFixed(1)}%`} color="green" sub="taux moyen / jour" />
      </div>

      {/* CA CHART */}
      <Sec>Évolution CA journalier</Sec>
      <Card className="fu d2">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Revenue AED · hors LT & LH · {m.label}</div>
            <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>LT & LH exclus du graphique (facturation mensuelle — voir KPIs)</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#007aff" }}>{fmtK(totalRev)} AED</div>
        </div>
        <BarChart data={m.amount} labels={labels} color="#007aff" height={130} />
      </Card>

      {/* REV/DRIVER */}
      <Sec>Revenue moyen / Driver Free · Internal seulement</Sec>
      <Card className="fu d3">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>AED / Driver Free / jour · Chabe Luxury uniquement</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#34c759" }}>Moy: {fmt(avgRpd)} AED</div>
        </div>
        <LineChart data={m.revDriver} labels={labels} color="#34c759" height={110} />
      </Card>

      {/* BILLING ACCOUNTS — tous les comptes avec revenue */}
      <Sec>Revenue par Billing Account · tous services (LT + LH inclus)</Sec>
      <Card className="fu d3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Billing Accounts — tous les comptes avec revenue</div>
            <div style={{ fontSize: 11, color: "#86868b" }}>CA total réalisé · {m.label}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#007aff" }}>{fmtK(totalBA)} AED total</div>
            {totalBAEur > 0 && <div style={{ fontSize: 10, color: "#86868b" }}>{fmtK(totalBAEur)} EUR</div>}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="🔍 Filtrer par compte…"
            value={baSearch}
            onChange={(e) => setBaSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #d1d1d6", borderRadius: 10, fontSize: 12, fontFamily: "inherit", outline: "none", background: "#f5f5f7", boxSizing: "border-box" }}
          />
        </div>
        {(() => {
          const q = baSearch.trim().toLowerCase();
          const filtered = q ? m.billingAccounts.filter((b: Any) => b.name.toLowerCase().includes(q)) : m.billingAccounts;
          const filteredRevAed = sum(filtered.map((b: Any) => b.rev));
          const filteredRevEur = sum(filtered.map((b: Any) => b.revEur));
          const filteredMaxBA = filtered[0]?.rev || 1;
          return <>
            {q && <div style={{ fontSize: 11, color: "#86868b", marginBottom: 8 }}>
              {filtered.length} compte{filtered.length > 1 ? "s" : ""} · {fmtK(filteredRevAed)} AED{filteredRevEur > 0 ? ` · ${fmtK(filteredRevEur)} EUR` : ""}
            </div>}
            {filtered.map((b: Any, i: number) => (
              <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < filtered.length - 1 ? "1px solid #f5f5f7" : "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: i < 3 ? "#1d1d1f" : "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i < 3 ? "#fff" : "#86868b" }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                    {b.hasLease && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,149,0,0.12)", color: "#ff9500", padding: "1px 6px", borderRadius: 3, flexShrink: 0 }}>LEASE</span>}
                  </div>
                  <div style={{ background: "#f5f5f7", height: 4, borderRadius: 2 }}>
                    <div style={{ width: `${Math.round((b.rev / filteredMaxBA) * 100)}%`, height: "100%", borderRadius: 2, background: b.hasLease ? "#ff9500" : i < 3 ? "#1d1d1f" : "#d1d1d6" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(b.rev)}</div>
                  {b.revEur > 0 && <div style={{ fontSize: 10, color: "#86868b" }}>{fmt(b.revEur)} €</div>}
                  <div style={{ fontSize: 10, color: "#86868b" }}>{b.jobs} jobs · {Math.round((b.rev / totalBA) * 100)}%</div>
                </div>
              </div>
            ))}
            {q && filtered.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#86868b", fontSize: 12 }}>Aucun compte ne correspond à « {baSearch} »</div>}
            {filtered.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px", marginTop: 8, borderTop: "2px solid #e5e5ea" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>TOTAL{q ? ` (${filtered.length} compte${filtered.length > 1 ? "s" : ""})` : ""}</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#007aff" }}>{fmtK(filteredRevAed)} AED</div>
                {filteredRevEur > 0 && <div style={{ fontSize: 10, color: "#86868b" }}>{fmtK(filteredRevEur)} EUR</div>}
                <div style={{ fontSize: 10, color: "#86868b" }}>{sum(filtered.map((b: Any) => b.jobs))} jobs</div>
              </div>
            </div>}
          </>;
        })()}
      </Card>

      {/* SOUS-TRAITANCE MENSUELLE — détail de chaque sous-traitant */}
      <Sec>Sous-traitance mensuelle</Sec>
      <Card className="fu d3" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr style={{ background: "#f5f5f7" }}>
                <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase" }}>Prestataire</th>
                <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "right", textTransform: "uppercase" }}>CA (AED)</th>
                <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "right", textTransform: "uppercase" }}>Jobs</th>
                <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "right", textTransform: "uppercase" }}>% total</th>
              </tr>
            </thead>
            <tbody>
              {m.providers.map((p: Any) => (
                <tr key={p.name} style={{ borderTop: "1px solid #f5f5f7" }}>
                  <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "11px 12px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: p.type === "Internal" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)", color: p.type === "Internal" ? "#007aff" : "#ff9500" }}>{p.type === "Internal" ? "INTERNE" : "EXTERNE"}</span>
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(p.rev)}</td>
                  <td style={{ padding: "11px 12px", fontSize: 12, textAlign: "right" }}>{p.jobs}</td>
                  <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#86868b" }}>{totalRevAll > 0 ? fmtPct((p.rev / totalRevAll) * 100) : "—"}</td>
                </tr>
              ))}
              {/* Sous-total External */}
              {(() => {
                const extProviders = m.providers.filter((p: Any) => p.type === "External");
                const extRev = extProviders.reduce((s: number, p: Any) => s + (p.rev as number), 0);
                const extJobs = extProviders.reduce((s: number, p: Any) => s + (p.jobs as number), 0);
                return extRev > 0 ? (
                  <tr style={{ borderTop: "2px solid #e5e5e5", background: "rgba(255,149,0,0.06)" }}>
                    <td colSpan={2} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, color: "#ff9500" }}>TOTAL EXTERNAL</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 800, textAlign: "right", color: "#ff9500" }}>{fmt(extRev)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500" }}>{extJobs}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500" }}>{totalRevAll > 0 ? fmtPct((extRev / totalRevAll) * 100) : "—"}</td>
                  </tr>
                ) : null;
              })()}
              {/* Ligne LT & LH */}
              {(totalRevAll - totalRev) > 0 && (
                <tr style={{ borderTop: "2px solid #f5f5f7", background: "rgba(255,149,0,0.04)" }}>
                  <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 600, color: "#ff9500" }}>LT & LH (lease mensuel)</td>
                  <td style={{ padding: "11px 12px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(0,122,255,0.1)", color: "#007aff" }}>INTERNE</span>
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#ff9500" }}>{fmt(totalRevAll - totalRev)}</td>
                  <td style={{ padding: "11px 12px", fontSize: 12, textAlign: "right", color: "#86868b" }}>{totalLT + totalLH}</td>
                  <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500" }}>{totalRevAll > 0 ? fmtPct(((totalRevAll - totalRev) / totalRevAll) * 100) : "—"}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f5f5f7", borderTop: "2px solid #e5e5e5" }}>
                <td colSpan={2} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800 }}>TOTAL · {m.label}</td>
                <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, textAlign: "right", color: "#5e5ce6" }}>{fmt(totalRevAll)}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>{totalJobs}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, textAlign: "right" }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* VUE INDUSTRIE — Monthly */}
      <Sec>Vue industrie</Sec>
      <Card className="fu d3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>CA par industrie (vertical)</div>
            <div style={{ fontSize: 11, color: "#86868b" }}>LT & LH inclus · {m.label}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5e5ce6" }}>{fmtK(totalRevAll)} AED total</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {m.verticals.length === 0 && (
            <div style={{ color: "#86868b", fontSize: 12 }}>Aucune donnée verticale pour ce mois.</div>
          )}
          {m.verticals.map((v: Any) => (
            <div key={v.name} style={{ background: `${v.color}12`, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${v.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{v.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: v.color }}>{fmtK(v.rev)} AED</div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 4, display: "flex", gap: 8 }}>
                <span>{v.pct}% du CA</span>
                <span>·</span>
                <span>{v.jobs} missions</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* PERFORMANCE CHAUFFEUR — Monthly */}
      <Sec>Performance chauffeur · Internal</Sec>
      <Card className="fu d3" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 20px 12px", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>CA & missions par chauffeur</div>
            <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>Chabe Luxury · hors LT & LH · {m.label}</div>
          </div>
          <div style={{ fontSize: 12, color: "#86868b" }}>{m.driverPerf.length} chauffeurs</div>
        </div>
        {m.driverPerf.length === 0 ? (
          <div style={{ padding: "12px 20px 16px", fontSize: 12, color: "#86868b" }}>Aucune donnée chauffeur Internal ce mois.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  {["#", "Chauffeur", "CA (AED)", "Missions", "CA/Mission"].map((h) => (
                    <th key={h} style={{ padding: "8px 16px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: h === "#" || h === "Missions" || h === "CA (AED)" || h === "CA/Mission" ? "right" : "left", letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.driverPerf.map((d: Any, i: Any) => {
                  const maxRev = m.driverPerf[0]?.rev || 1;
                  const barW = Math.round((d.rev / maxRev) * 100);
                  return (
                    <tr key={d.name} style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#86868b", fontSize: 11, width: 32 }}>{i + 1}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                        <div>{d.name}</div>
                        <div style={{ height: 3, background: "#007aff", borderRadius: 2, width: `${barW}%`, marginTop: 4, opacity: 0.25 + (barW / 100) * 0.75 }} />
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#007aff" }}>{fmt(d.rev)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#1d1d1f" }}>{d.jobs}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#86868b" }}>{fmt(d.revPerJob)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── DISPONIBILITÉ FLOTTE ── */}
      {monthAvailability && (
        <>
          <Sec>Disponibilité flotte · {sel}</Sec>
          <Card className="fu d3" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 120 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px", color: monthAvailability.avgRate >= 80 ? "#34c759" : monthAvailability.avgRate >= 60 ? "#ff9500" : "#ff3b30" }}>{monthAvailability.avgRate}%</span>
                <span style={{ fontSize: 12, color: "#86868b" }}>moy. mensuelle</span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ background: "#f5f5f7", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ width: `${monthAvailability.avgRate}%`, height: "100%", borderRadius: 4, background: monthAvailability.avgRate >= 80 ? "#34c759" : monthAvailability.avgRate >= 60 ? "#ff9500" : "#ff3b30" }} />
                </div>
                <div style={{ fontSize: 11, color: "#86868b" }}>{monthAvailability.impactedDays}/{monthAvailability.totalDays} jours avec indisponibilités</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 120 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px", color: (100 - monthAvailability.avgRate) <= 5 ? "#34c759" : (100 - monthAvailability.avgRate) <= 15 ? "#ff9500" : "#ff3b30" }}>{100 - monthAvailability.avgRate}%</span>
                <span style={{ fontSize: 12, color: "#86868b" }}>indispo. moy.</span>
              </div>
              {monthAvailability.unavailPlatesMonth.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#86868b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Véhicules affectés</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {monthAvailability.unavailPlatesMonth.map(plate => (
                      <span key={plate} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}>{plate}</span>
                    ))}
                  </div>
                </div>
              )}
              {monthAvailability.unavailPlatesMonth.length === 0 && (
                <span style={{ fontSize: 12, color: "#34c759", fontWeight: 600 }}>✓ Aucune indisponibilité ce mois</span>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── FLOTTE VS BESOIN ── */}
      <Sec>Flotte vs Besoin mensuel</Sec>
      <Card className="fu d3">
        {/* Header KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Véhicules nécessaires</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{besoinTotal}</div>
            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{totalHorsLease} missions ÷ ({nbDays}j × 2.5)</div>
          </div>
          <div style={{ background: "rgba(0,122,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Flotte office dispo</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#007aff" }}>{fleetOffice}</div>
            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>véhicules en position office</div>
          </div>
          <div style={{ background: surplus >= 0 ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.08)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{surplus >= 0 ? "Surplus" : "Manque"}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: surplus >= 0 ? "#34c759" : "#ff3b30" }}>{surplus >= 0 ? "+" : ""}{surplus}</div>
            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>
              {besoinTotal} véhicules nécessaires · {fleetOffice} dispos
            </div>
          </div>
        </div>

        {/* Barre progress globale */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Taux d'utilisation flotte office</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: besoinTotal / fleetOffice > 0.9 ? "#ff9500" : besoinTotal / fleetOffice > 1 ? "#ff3b30" : "#34c759" }}>{Math.round((besoinTotal / fleetOffice) * 100)}%</span>
          </div>
          <div style={{ background: "#f5f5f7", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.round((besoinTotal / fleetOffice) * 100))}%`, height: "100%", borderRadius: 4, background: besoinTotal / fleetOffice > 1 ? "#ff3b30" : besoinTotal / fleetOffice > 0.9 ? "#ff9500" : "#34c759" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 9, color: "#86868b" }}>0 véhicules</span>
            <span style={{ fontSize: 9, color: "#86868b" }}>{fleetOffice} véhicules (max dispo)</span>
          </div>
        </div>

        {/* Tableau par catégorie — mois en cours uniquement */}
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Détail par catégorie — {sel}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ background: "#f5f5f7" }}>
                {["Catégorie", "Missions", "Besoin", "Flotte dispo", "Statut"].map((h) => (
                  <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleetRows.map((r: Any) => {
                const rdiff = r.dispo - r.besoin;
                const status =
                  r.dispo < r.besoin * 0.8 ? "under" :
                  r.dispo < r.besoin       ? "tight" :
                  r.dispo > Math.ceil(r.besoin) ? "surplus" :
                  "ok";
                const statusColor = status === "ok" ? "#34c759" : status === "surplus" ? "#007aff" : status === "tight" ? "#ff9500" : "#ff3b30";
                const statusLabel =
                  status === "ok"      ? "✓ Équilibré" :
                  status === "surplus" ? `↑ +${rdiff.toFixed(1)} surplus` :
                  status === "tight"   ? "⚠ Limite" :
                  `✗ ${(r.besoin - r.dispo).toFixed(1)} manque`;
                return (
                  <tr key={r.cat} style={{ borderTop: "1px solid #f5f5f7" }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>{r.cat}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{r.missions}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>{r.besoin}</span>
                      <span style={{ fontSize: 10, color: "#86868b" }}> veh.</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#007aff" }}>{r.dispo}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, background: `${statusColor}1a`, color: statusColor }}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid #1d1d1f", background: "#f9f9f9" }}>
                <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800 }}>{totalHorsLease}</td>
                <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800 }}>{besoinTotal}</td>
                <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800, color: "#007aff" }}>{fleetOffice}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 6, background: surplus > 0 ? "rgba(0,122,255,0.1)" : surplus === 0 ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)", color: surplus > 0 ? "#007aff" : surplus === 0 ? "#34c759" : "#ff3b30" }}>
                    {surplus > 0 ? `↑ +${surplus} surplus` : surplus === 0 ? "✓ Équilibré" : `✗ ${Math.abs(surplus)} manque`}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, fontSize: 10, color: "#86868b", fontStyle: "italic" }}>Besoin = missions hors LT & LH ÷ ({nbDays} jours × 2.5 missions/véhicule/jour)</div>
      </Card>

      {/* SERVICE TYPES */}
      <Sec>Total par type de service</Sec>
      <div className="g7 fu d4">
        {Object.entries(byType).map(([k, v]) => (
          <JobPill key={k} label={k} count={v as Any} color={["LT", "LH"].includes(k) ? "#ff9500" : ["ST", "SH"].includes(k) ? "#007aff" : "#34c759"} />
        ))}
      </div>

      {/* DRIVER FREE */}
      <Sec>Driver Free par jour</Sec>
      <Card className="fu d4">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nombre de Driver Free</div>
        <div style={{ fontSize: 11, color: "#86868b", marginBottom: 12 }}>Moy: {avgFree} drivers free / jour</div>
        <BarChart data={m.free} labels={labels} color="#af52de" height={90} />
      </Card>
    </div>
  );
}

// ── ANNUAL FLEET BLOCK ───────────────────────────────────────────────────────
function AnnualFleetBlock({ a, year = 2026, monthlyData, vehicles, unavails }: { a: Any; year?: number; monthlyData: Record<string, Any>; vehicles: FleetVehicle[]; unavails: VehicleUnavailability[] }) {
  const fleetOffice = vehicles.filter((v) => v.location === "Office").length;

  const officeByType: Record<string, number> = {};
  for (const t of VEHICLE_TYPES) officeByType[t] = 0;
  for (const v of vehicles.filter((v) => v.location === "Office")) {
    const t = getVehicleType(v);
    if (t in officeByType) officeByType[t] = (officeByType[t] ?? 0) + 1;
  }

  const MONTHLY_KEYS_ALL = Object.keys(monthlyData).filter((k) => k.includes(String(year)));

  const monthRows = a.months.map((lbl: Any, i: Any) => {
    const monthSlug = ["jan", "fév", "mar", "avr", "mai", "jui", "juil", "aoû", "sep", "oct", "nov", "déc"][i]?.toLowerCase() || "";
    const mdYear = MONTHLY_KEYS_ALL.find((k: Any) => k.includes(String(year)) && k.toLowerCase().includes(monthSlug));
    const prevYear = year - 1;
    const mdPrev = Object.keys(monthlyData).find((k: Any) => k.includes(String(prevYear)) && k.toLowerCase().includes(monthSlug));

    let missions2026: Any = null, besoin2026: Any = null;
    let missions2025: Any = null, besoin2025: Any = null;

    if (mdYear && monthlyData[mdYear]) {
      const m = monthlyData[mdYear];
      const nb = m.days.length;
      const vtm = m.vehicleTypeMissions ?? {};
      const miss = Object.values(vtm).reduce((s: number, v: Any) => s + (v as number), 0);
      missions2026 = miss;
      besoin2026 = Math.ceil(miss / (nb * 2.5));
    } else if (year === 2026 && a.amount2026[i] != null) {
      const j = a.jobs2026[i];
      if (j) { missions2026 = Math.round(j * 0.6); besoin2026 = Math.ceil(missions2026 / (28 * 2.5)); }
    } else if (year === 2025 && a.amount2025[i] != null) {
      const j = a.jobs2025[i];
      if (j) { missions2026 = Math.round(j * 0.6); besoin2026 = Math.ceil(missions2026 / (28 * 2.5)); }
    }

    if (mdPrev && monthlyData[mdPrev]) {
      const m = monthlyData[mdPrev];
      const nb = m.days.length;
      const vtm = m.vehicleTypeMissions ?? {};
      const miss = Object.values(vtm).reduce((s: number, v: Any) => s + (v as number), 0);
      missions2025 = miss;
      besoin2025 = Math.ceil(miss / (nb * 2.5));
    } else if (prevYear === 2025 && a.amount2025[i] != null) {
      const j = a.jobs2025[i];
      if (j) { missions2025 = Math.round(j * 0.6); besoin2025 = Math.ceil(missions2025 / (28 * 2.5)); }
    }

    const has2026 = missions2026 != null;
    const surplus2026 = has2026 ? fleetOffice - besoin2026 : null;

    return { lbl, i, missions2026, besoin2026, surplus2026, missions2025, besoin2025, has2026 };
  });

  const cats = VEHICLE_TYPES.map((t) => ({ label: t, dispo: officeByType[t] ?? 0 }));

  const getMonthCats = (monthLabel: Any) => {
    const ml = String(monthLabel).toLowerCase();
    const mk = Object.keys(monthlyData).find((k) => k.includes(String(year)) && k.toLowerCase().includes(ml));
    if (!mk) return null;
    const m = monthlyData[mk];
    const nb = m.days.length;
    const vtm = m.vehicleTypeMissions ?? {};
    return VEHICLE_TYPES.map((t) => {
      const miss = vtm[t] ?? 0;
      return { missions: miss, besoin: miss ? Math.ceil(miss / (nb * 2.5)) : 0, dispo: officeByType[t] ?? 0 };
    });
  };

  const activeMonths = monthRows.filter((r: Any) => r.has2026);

  const getMonthAvailRate = (monthIdx: number): number => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    );
    const rates = dates.map(d => computeFleetAvailability(d, vehicles, unavails).rate);
    return Math.round(rates.reduce((s, r) => s + r, 0) / Math.max(rates.length, 1));
  };

  return (
    <Card className="fu d3">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Flotte office dispo</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#007aff" }}>{fleetOffice}</div>
          <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>véhicules en position office</div>
        </div>
        <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Mois analysés</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{activeMonths.length}</div>
          <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>données réelles disponibles</div>
        </div>
        <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Besoin max. observé</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#ff9500" }}>{activeMonths.length > 0 ? Math.max(...activeMonths.map((r: Any) => r.besoin2026 || 0)) : "—"}</div>
          <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>véhicules nécessaires (pic)</div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Besoin mensuel {year} — mois par mois</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ background: "#f5f5f7" }}>
              {["Mois", "Missions HorsLease", "Besoin", "Flotte dispo", "Surplus / Manque", "Taux utilisation", "Dispo moy."].map((h) => (
                <th key={h} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthRows.map((r: Any) => {
              if (!r.has2026)
                return (
                  <tr key={r.lbl} style={{ borderTop: "1px solid #f5f5f7", opacity: 0.35 }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#86868b" }}>{r.lbl}</td>
                    <td colSpan={5} style={{ padding: "10px 14px", fontSize: 11, color: "#d1d1d6", fontStyle: "italic" }}>Données non disponibles</td>
                  </tr>
                );
              const surplus = r.surplus2026;
              const ok = surplus >= 0;
              const taux = r.besoin2026 ? Math.round((r.besoin2026 / fleetOffice) * 100) : 0;
              const tauxColor = taux > 100 ? "#ff3b30" : taux > 85 ? "#ff9500" : "#34c759";
              return (
                <tr key={r.lbl} style={{ borderTop: "1px solid #f5f5f7" }}>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 800 }}>{r.lbl}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{r.missions2026 != null ? r.missions2026.toLocaleString("fr-FR") : "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.besoin2026}</span>
                    <span style={{ fontSize: 10, color: "#86868b" }}> veh.</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#007aff" }}>{fleetOffice}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: ok ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.1)", color: ok ? "#34c759" : "#ff3b30" }}>{ok ? `+${surplus} surplus` : `${Math.abs(surplus)} manque`}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, background: "#f5f5f7", height: 6, borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ width: `${Math.min(100, Number(taux)).toFixed(1)}%`, height: "100%", background: tauxColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tauxColor, minWidth: 34 }}>{fmtPct(taux)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {(() => {
                      const dispoRate = getMonthAvailRate(r.i);
                      const dispoColor = dispoRate >= 80 ? "#34c759" : dispoRate >= 60 ? "#ff9500" : "#ff3b30";
                      return <span style={{ fontSize: 12, fontWeight: 700, color: dispoColor }}>{dispoRate}%</span>;
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeMonths.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 24, marginBottom: 10, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Détail par catégorie — mois avec données réelles</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</th>
                  <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>Flotte dispo</th>
                  {activeMonths.map((r: Any) => (
                    <th key={r.lbl} style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{r.lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((cat: Any) => (
                  <tr key={cat.label} style={{ borderTop: "1px solid #f5f5f7" }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600 }}>{cat.label}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#007aff" }}>{cat.dispo}</td>
                    {activeMonths.map((r: Any) => {
                      const catData = getMonthCats(r.lbl);
                      const catIdx = cats.indexOf(cat);
                      const cd = catData ? catData[catIdx] : null;
                      if (!cd) return <td key={r.lbl} style={{ padding: "11px 14px", color: "#86868b" }}>—</td>;
                      const ok = cd.dispo >= cd.besoin;
                      return (
                        <td key={r.lbl} style={{ padding: "11px 14px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{cd.missions} miss.</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: ok ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.1)", color: ok ? "#34c759" : "#ff3b30", display: "inline-block", marginTop: 3 }}>{ok ? `+${cd.dispo - cd.besoin} surplus` : `${cd.besoin - cd.dispo} manque`}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, fontSize: 10, color: "#86868b", fontStyle: "italic" }}>Besoin = missions hors LT & LH ÷ (jours du mois × 2.5 missions/véhicule/jour)</div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANNUAL VIEW
// ═══════════════════════════════════════════════════════════════════════════
function AnnualView({ annualData, monthlyData, vehicles, unavails }: { annualData: Any; monthlyData: Record<string, Any>; vehicles: FleetVehicle[]; unavails: VehicleUnavailability[] }) {
  const a = annualData;
  const [selMonth, setSelMonth] = useState(1);
  const [selYear, setSelYear] = useState(2026);
  const currentMonthIdx = new Date().getMonth(); // 0-based : jan=0, fév=1, mar=2...
  const dataMonths2026 = a.amount2026.filter((v: Any) => v != null).length;
  const months2026 = Math.min(dataMonths2026, currentMonthIdx); // mois complets uniquement
  const tot25 = sum(a.amount2025.slice(0, months2026));
  const tot26 = sum(a.amount2026.slice(0, months2026));
  const evolRev = pct(tot26, tot25);
  const evolRevNum = evolRev == null ? null : Number(evolRev);
  const avgRpd25 = avg(a.revPerDriver2025.slice(0, months2026).filter((v: Any) => v != null));
  const avgRpd26 = avg(a.revPerDriver2026.slice(0, months2026).filter((v: Any) => v != null));
  const evolRpd = pct(avgRpd26, avgRpd25);
  const evolRpdNum = evolRpd == null ? null : Number(evolRpd);
  const r25 = a.amount2025[selMonth], r26 = a.amount2026[selMonth];
  const rpd25 = a.revPerDriver2025[selMonth], rpd26 = a.revPerDriver2026[selMonth];
  const j25 = a.jobs2025[selMonth], j26 = a.jobs2026[selMonth];
  return (
    <div>
      <Sec mt={0}>2025 vs 2026 — YTD ({months2026} mois)</Sec>
      <div className="g4 fu d1">
        <Kpi label="CA 2025 YTD" value={`${fmtK(tot25)} AED`} />
        <Kpi label="CA 2026 YTD" value={`${fmtK(tot26)} AED`} color="blue" />
        <Kpi
          label="Évolution CA"
          value={evolRevNum == null ? "—" : `${evolRevNum > 0 ? "+" : ""}${evolRev}%`}
          color={evolRevNum == null ? "default" : evolRevNum > 0 ? "green" : "red"}
        />
        <Kpi
          label="Évol Rev/Driver"
          value={evolRpdNum == null ? "—" : `${evolRpdNum > 0 ? "+" : ""}${evolRpd}%`}
          color={evolRpdNum == null ? "default" : evolRpdNum > 0 ? "green" : "red"}
          sub={`${fmt(avgRpd25)} → ${fmt(avgRpd26)} AED`}
        />
      </div>
      <Sec>CA mensuel — Cliquer pour comparer</Sec>
      <Card className="fu d2">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {a.months.map((m: Any, i: Any) => (
            <button key={m} onClick={() => setSelMonth(i)} style={{ background: selMonth === i ? "#1d1d1f" : "#f5f5f7", color: selMonth === i ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: selMonth === i ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", opacity: a.amount2026[i] == null ? 0.4 : 1 }}>{m}</button>
          ))}
        </div>
        <DualBar data2025={a.amount2025} data2026={a.amount2026} labels={a.months} height={140} selectedIdx={selMonth} />
      </Card>
      <Sec>Détail — {a.months[selMonth]}</Sec>
      <div className="g4 fu d3">
        <Kpi label={`CA ${a.months[selMonth]} 2025`} value={r25 ? `${fmt(r25)} AED` : "—"} />
        <Kpi label={`CA ${a.months[selMonth]} 2026`} value={r26 ? `${fmt(r26)} AED` : "—"} color={r26 ? "blue" : "default"} />
        <Kpi label="Évolution CA" value={r25 && r26 ? `${Number(pct(r26, r25)) > 0 ? "+" : ""}${pct(r26, r25)}%` : "—"} color={r25 && r26 ? (Number(pct(r26, r25)) > 0 ? "green" : "red") : "default"} />
        <Kpi label="Jobs / jour" value={j26 != null ? `${j25} → ${j26}` : (j25 ? fmt(j25) : "—")} sub={j26 != null ? `+${pct(j26, j25)}%` : undefined} />
      </div>
      <div className="g4 fu d3" style={{ marginTop: 10 }}>
        <Kpi label="Rev/Driver 2025" value={rpd25 ? `${fmt(rpd25)} AED` : "—"} />
        <Kpi label="Rev/Driver 2026" value={rpd26 ? `${fmt(rpd26)} AED` : "—"} color={rpd26 ? "blue" : "default"} />
        <Kpi label="Évol Rev/Driver" value={rpd25 && rpd26 ? `${Number(pct(rpd26, rpd25)) > 0 ? "+" : ""}${pct(rpd26, rpd25)}%` : "—"} color={rpd25 && rpd26 ? (Number(pct(rpd26, rpd25)) > 0 ? "green" : "red") : "default"} />
        <Kpi label="Mois disponibles" value={`${months2026} / 12`} sub="2026 en cours" />
      </div>
      <Sec>Flotte vs Besoin — mois par mois</Sec>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b" }}>Année :</span>
        <CustomSelect compact value={selYear} onChange={(v) => setSelYear(Number(v))} options={[2024, 2025, 2026].map((y) => ({ value: y, label: String(y) }))} triggerStyle={{ background: "#fff", border: "1px solid #e5e5e5", width: "auto", minWidth: 90 }} />
      </div>
      <AnnualFleetBlock a={a} year={selYear} monthlyData={monthlyData} vehicles={vehicles} unavails={unavails} />

      <Sec>Vue industrie — {selYear}</Sec>
      <Card className="fu d3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>CA par industrie (vertical)</div>
            <div style={{ fontSize: 11, color: "#86868b" }}>Cumul annuel · {selYear}</div>
          </div>
          {(() => { const verts = selYear === 2025 ? a.verticals2025 : a.verticals2026; const total = verts.reduce((s: number, v: Any) => s + (v.rev as number), 0); return <div style={{ fontSize: 13, fontWeight: 700, color: "#5e5ce6" }}>{fmtK(total)} AED total</div>; })()}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {(() => {
            const verts = selYear === 2025 ? a.verticals2025 : a.verticals2026;
            if (!verts || verts.length === 0) return <div style={{ color: "#86868b", fontSize: 12 }}>Aucune donnée verticale pour {selYear}.</div>;
            return verts.map((v: Any) => (
              <div key={v.name} style={{ background: `${v.color}12`, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${v.color}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{v.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: v.color }}>{fmtK(v.rev)} AED</div>
                <div style={{ fontSize: 10, color: "#86868b", marginTop: 4, display: "flex", gap: 8 }}>
                  <span>{v.pct}% du CA</span>
                  <span>·</span>
                  <span>{v.jobs} missions</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </Card>

      <Sec>Tableau complet</Sec>
      <Card className="fu d4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "#f5f5f7" }}>
                {["Mois", "CA 2025", "CA 2026", "Évol CA", "Rev/Driver 2025", "Rev/Driver 2026", "Évol R/D"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.months.map((m: Any, i: Any) => {
                const r25_ = a.amount2025[i], r26_ = a.amount2026[i];
                const rpd25_ = a.revPerDriver2025[i], rpd26_ = a.revPerDriver2026[i];
                const eCA = r25_ && r26_ ? pct(r26_, r25_) : null;
                const eRpd = rpd25_ && rpd26_ ? pct(rpd26_, rpd25_) : null;
                const eCANum = eCA != null ? Number(eCA) : null;
                const eRpdNum = eRpd != null ? Number(eRpd) : null;
                const isSel = selMonth === i;
                const colorEvol = (n: number | null) =>
                  n == null ? "#86868b" : n > 0 ? "#34c759" : "#ff3b30";
                return (
                  <tr key={m} onClick={() => setSelMonth(i)} style={{ borderTop: "1px solid #f5f5f7", cursor: "pointer", background: isSel ? "rgba(0,122,255,0.04)" : "transparent" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: isSel ? "#007aff" : "#1d1d1f" }}>{m}</td>
                    <td style={{ padding: "10px 16px", color: "#86868b", fontFamily: "monospace", fontSize: 12 }}>{r25_ ? fmt(r25_) : "—"}</td>
                    <td style={{ padding: "10px 16px", color: r26_ ? "#007aff" : "#86868b", fontWeight: r26_ ? 600 : 400, fontFamily: "monospace", fontSize: 12 }}>{r26_ ? fmt(r26_) : "—"}</td>
                    <td style={{ padding: "10px 16px", color: colorEvol(eCANum), fontWeight: 600 }}>{eCA != null ? `${eCANum != null && eCANum > 0 ? "+" : ""}${eCA}%` : "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#86868b", fontFamily: "monospace", fontSize: 12 }}>{rpd25_ ? fmt(rpd25_) : "—"}</td>
                    <td style={{ padding: "10px 16px", color: rpd26_ ? "#007aff" : "#86868b", fontWeight: rpd26_ ? 600 : 400, fontFamily: "monospace", fontSize: 12 }}>{rpd26_ ? fmt(rpd26_) : "—"}</td>
                    <td style={{ padding: "10px 16px", color: colorEvol(eRpdNum), fontWeight: 600 }}>{eRpd != null ? `${eRpdNum != null && eRpdNum > 0 ? "+" : ""}${eRpd}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET VIEW — Fleet Management
// ═══════════════════════════════════════════════════════════════════════════

const EXPENSE_TYPES: ExpenseType[] = ["Carburant", "Entretien", "Réparation", "Salik/Divers"];
const EXPENSE_COLORS: Record<string, string> = {
  Carburant: "#ff9500",
  Entretien: "#007aff",
  Réparation: "#ff3b30",
  "Salik/Divers": "#86868b",
};
const EXPENSE_ICONS: Record<string, string> = {
  Carburant: "⛽",
  Entretien: "🔧",
  Réparation: "🚗",
  "Salik/Divers": "🏷️",
};

// ─── Shared form styles (used by FleetView + AdminView) ──────────────────────
const inputStyle = { backgroundColor: "#f5f5f7", border: "1.5px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const };
const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: "#86868b", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 4, display: "block" };

function FleetView({ vehicles, fleetError, fleetLoading, onVehicleCreated, alerts, onAlertRefresh, unavails, onUnavailsChange, readOnly = false }: { vehicles: FleetVehicle[]; fleetError: string | null; fleetLoading: boolean; onVehicleCreated?: () => void; alerts: AlertRecord[]; onAlertRefresh: () => void; unavails: VehicleUnavailability[]; onUnavailsChange: React.Dispatch<React.SetStateAction<VehicleUnavailability[]>>; readOnly?: boolean }) {
  // Sub-tab
  const [subTab, setSubTab] = useState<"vehicles" | "expenses" | "activity" | "unavailabilities" | "reports" | "maintenance" | "valuation">("vehicles");
  // Valuation tab state
  const [valFilterPlate, setValFilterPlate] = useState("");
  const [valSort, setValSort] = useState<"nav" | "date">("nav");
  const [valSortDir, setValSortDir] = useState<"asc" | "desc">("desc");
  const [valMonth, setValMonth] = useState(new Date().getMonth()); // 0-11
  const [valYear, setValYear] = useState(new Date().getFullYear());
  const [valStatusFilter, setValStatusFilter] = useState<"active" | "sold" | "all">("active");
  const [unavailShowAll, setUnavailShowAll] = useState(false);
  const [unavailFilterPlate, setUnavailFilterPlate] = useState("");
  const [unavailDropdownOpen, setUnavailDropdownOpen] = useState(false);
  const unavailDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!unavailDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (unavailDropdownRef.current && !unavailDropdownRef.current.contains(e.target as Node)) setUnavailDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [unavailDropdownOpen]);

  // Filters (Vehicles tab)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterType, _setFilterType] = useState("Tous");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMake, setFilterMake] = useState("");
  const [filterModel2, setFilterModel2] = useState("");
  const [filterStatus, setFilterStatus] = useState("Toutes");
  const [filterLocation, setFilterLocation] = useState("Toutes");

  // Vehicle detail slide-in
  const [detailVehicle, setDetailVehicle] = useState<FleetVehicle | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "photos" | "documents" | "depenses" | "depreciation">("info");
  // Edit mode in slide-in
  const [editMode, setEditMode] = useState(false);
  const [editMakesId, setEditMakesId] = useState<number | "">("");
  const [editModelsId, setEditModelsId] = useState<number | "">("");
  const [editTrim, setEditTrim] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editKm, setEditKm] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLocationId, setEditLocationId] = useState<number | "">("");
  const [editFuel, setEditFuel] = useState("");
  const [editExtColor, setEditExtColor] = useState("");
  const [editIntColor, setEditIntColor] = useState("");
  const [editServiceInterval, setEditServiceInterval] = useState("");
  const [editLastServiceKm, setEditLastServiceKm] = useState("");
  const [editInsurance, setEditInsurance] = useState("");
  const [editInsuranceDue, setEditInsuranceDue] = useState("");
  const [editLeaseEnd, setEditLeaseEnd] = useState("");
  const [editEndOfLoan, setEditEndOfLoan] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Photo & doc upload
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<string[]>([]);
  const [vehicleDocs, setVehicleDocs] = useState<{ loan?: string | null; insurance?: string | null; mulkiyaFront?: string | null; mulkiyaBack?: string | null }>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // Modal: New Vehicle
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [nvPlate, setNvPlate] = useState("");
  const [nvMakeId, setNvMakeId] = useState<number | "">("");
  const [nvModelId, setNvModelId] = useState<number | "">("");
  const [nvLocationId, setNvLocationId] = useState<number | "">("");
  const [nvYear, setNvYear] = useState(new Date().getFullYear().toString());
  const [nvFuel, setNvFuel] = useState("Petrol");
  const [nvExtColor, setNvExtColor] = useState("Black");
  const [nvIntColor, setNvIntColor] = useState("Black");
  const [nvTrim, setNvTrim] = useState("");
  const [nvKm, setNvKm] = useState("");
  const [nvServiceInterval, setNvServiceInterval] = useState("10000");
  const [nvLastServiceKm, setNvLastServiceKm] = useState("");
  const [nvInsurance, setNvInsurance] = useState("");
  const [nvInsuranceDue, setNvInsuranceDue] = useState("");
  const [nvLeaseEnd, setNvLeaseEnd] = useState("");
  const [nvEndOfLoan, setNvEndOfLoan] = useState("");
  const [nvPurchaseAmount, setNvPurchaseAmount] = useState("");
  const [nvPurchaseDate, setNvPurchaseDate] = useState("");
  const [nvSaving, setNvSaving] = useState(false);
  const [nvError, setNvError] = useState<string | null>(null);
  // Reference data for New Vehicle dropdowns
  const [nvMakes, setNvMakes] = useState<Make[]>([]);
  const [nvModels, setNvModels] = useState<RefModel[]>([]);
  const [nvLocations, setNvLocations] = useState<RefLocation[]>([]);
  const [nvRefLoading, setNvRefLoading] = useState(false);

  // Modal: Sale Vehicle
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleVehicle, setSaleVehicle] = useState<FleetVehicle | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleTo, setSaleTo] = useState("");
  const [saleSaving, setSaleSaving] = useState(false);

  // Modal: Indisponibilité
  const [showUnavail, setShowUnavail] = useState(false);
  const [unavPlate, setUnavPlate] = useState("");
  const [unavStart, setUnavStart] = useState(new Date().toISOString().slice(0, 10));
  const [unavEnd, setUnavEnd] = useState("");
  const [unavReason, setUnavReason] = useState("");
  const [unavSaving, setUnavSaving] = useState(false);
  const [unavVehicleOpen, setUnavVehicleOpen] = useState(false);
  const [unavVehicleSearch, setUnavVehicleSearch] = useState("");
  const [editingUnavailId, setEditingUnavailId] = useState<number | null>(null);

  // Modal: New Expense
  const [showExpense, setShowExpense] = useState(false);
  const [expPlate, setExpPlate] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expType, setExpType] = useState<ExpenseType>("Carburant");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expKm, setExpKm] = useState("");
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Data: expenses, check-ins & unavailability reasons
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [unavailReasons, setUnavailReasons] = useState<UnavailabilityReason[]>([]);
  const [ciFilter, setCiFilter] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dataLoaded) {
      Promise.all([fetchExpenses(), fetchCheckIns({ limit: 200 }), fetchUnavailabilityReasons()])
        .then(([e, ci, ur]) => { setExpenses(e); setCheckIns(ci); setUnavailReasons(ur as UnavailabilityReason[]); setDataLoaded(true); })
        .catch(() => setDataLoaded(true));
    }
  }, [dataLoaded]);

  // Load reference data when New Vehicle modal opens
  useEffect(() => {
    if (!showNewVehicle) return;
    setNvRefLoading(true);
    Promise.all([fetchMakes(), fetchRefModels(), fetchRefLocations()])
      .then(([m, mo, l]) => { setNvMakes(m); setNvModels(mo); setNvLocations(l); })
      .catch(() => {})
      .finally(() => setNvRefLoading(false));
  }, [showNewVehicle]);

  // Derived data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _types = ["Tous", ...Array.from(new Set(vehicles.map(getVehicleType)))];
  const uniqueLocations = useMemo(() => {
    const locs = [...new Set(vehicles.map(v => v.locationName ?? v.location).filter(Boolean))].sort();
    return ["Toutes", ...locs];
  }, [vehicles]);
  const activeUnavails = unavails.filter((u) => u.status === "active");

  const filteredVehicles = vehicles.filter((v) => {
    if (filterType !== "Tous" && getVehicleType(v) !== filterType) return false;
    if (filterPlate && !v.plate.toLowerCase().includes(filterPlate.toLowerCase())) return false;
    if (filterYear && String(v.year) !== filterYear) return false;
    if (filterMake && !v.make.toLowerCase().includes(filterMake.toLowerCase())) return false;
    if (filterModel2 && !v.model.toLowerCase().includes(filterModel2.toLowerCase())) return false;
    if (filterStatus === "active" && v.status !== "active") return false;
    if (filterStatus === "inactive" && v.status === "active") return false;
    if (filterLocation !== "Toutes" && (v.locationName ?? v.location) !== filterLocation) return false;
    return true;
  }).sort((a, b) => a.plate.localeCompare(b.plate));

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount_aed ?? 0), 0);
  const typeCounts: Record<string, number> = {};
  for (const v of vehicles) {
    const t = getVehicleType(v);
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  // Actions
  const handleSaveExpense = async () => {
    if (!expPlate || !expAmount) return;
    setExpSaving(true); setExpError(null);
    try {
      const created = await createExpense({
        plate: expPlate, date: expDate, type: expType,
        amount_aed: parseFloat(expAmount), description: expDesc || null,
        km: expKm ? parseInt(expKm, 10) : null,
      });
      setExpenses((prev) => [created, ...prev]);
      setShowExpense(false); setExpPlate(""); setExpAmount(""); setExpDesc(""); setExpKm("");
    } catch (e) { setExpError(e instanceof Error ? e.message : "Error"); }
    finally { setExpSaving(false); }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("Delete this expense?")) return;
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveUnavail = async () => {
    if (!unavPlate || !unavStart) return;
    setUnavSaving(true);
    try {
      if (editingUnavailId != null) {
        const updated = await updateUnavailability(editingUnavailId, { plate: unavPlate, start_date: unavStart, end_date: unavEnd || null, reason: unavReason || null, status: "active" });
        onUnavailsChange((prev) => prev.map((u) => u.id === editingUnavailId ? updated : u));
      } else {
        const created = await createUnavailability({ plate: unavPlate, start_date: unavStart, end_date: unavEnd || null, reason: unavReason || null, status: "active" });
        onUnavailsChange((prev) => [created, ...prev]);
      }
      setShowUnavail(false); setUnavPlate(""); setUnavReason(""); setUnavEnd(""); setEditingUnavailId(null);
    } catch { /* ignore */ }
    finally { setUnavSaving(false); }
  };

  const handleEditUnavail = (u: VehicleUnavailability) => {
    setEditingUnavailId(u.id);
    setUnavPlate(u.plate);
    setUnavStart(u.start_date);
    setUnavEnd(u.end_date ?? "");
    setUnavReason(u.reason ?? "");
    setShowUnavail(true);
  };

  const handleResolveUnavail = async (id: number) => {
    await resolveUnavailability(id);
    onUnavailsChange((prev) => prev.map((u) => u.id === id ? { ...u, status: "resolved" } : u));
  };

  const handleExtendUnavail = async (u: VehicleUnavailability) => {
    const base = u.end_date || u.start_date;
    const next = new Date(base);
    next.setDate(next.getDate() + 1);
    const newEnd = next.toISOString().slice(0, 10);
    await updateUnavailability(u.id, { end_date: newEnd });
    onUnavailsChange((prev) => prev.map((x) => x.id === u.id ? { ...x, end_date: newEnd } : x));
  };

  const downloadExcel = () => {
    const headers = ["Plate", "Type", "Fuel", "Make", "Model", "Year", "Status", "Location", "Km", "Service (km)"];
    const rows = filteredVehicles.map((v) => [v.plate, getVehicleType(v), v.fuel, v.make, v.model, v.year, v.status ?? "active", v.locationName ?? v.location, v.km ?? 0, v.lastServiceKm ?? 0]);
    const csv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `fleet-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {fleetLoading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#86868b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading fleet...</div>
        </div>
      )}
      {fleetError && (
        <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: "#ff3b30" }}>
          ⚠️ Fleet error — {fleetError}
        </div>
      )}

      {!fleetLoading && (
        <>
          {/* ── HEADER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Fleet Management</div>
              <div style={{ fontSize: 13, color: "#86868b" }}>Manage your vehicles, expenses and activities</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setShowUnavail(true)} style={{ background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                + Report Unavailability
              </button>
              {!readOnly && <button onClick={() => setShowNewVehicle(true)} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                + New Vehicle
              </button>}
            </div>
          </div>

          {/* ── OVERVIEW CARDS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
            {/* Available fleet */}
            <div style={{ background: "rgba(0,122,255,0.04)", border: "1px solid rgba(0,122,255,0.12)", borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🚘</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Fleet available today</span>
              </div>
              {/* Total Fleet — all vehicles */}
              <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total fleet</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#1d1d1f" }}>{vehicles.length}</span>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total available</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#007aff" }}>{vehicles.filter((v) => v.location === "Office").length}</span>
              </div>
              {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 12 }}>
                  <span style={{ color: "#3c3c43" }}>{type}</span>
                  <span style={{ fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Total Expenses */}
            <div style={{ background: "rgba(52,199,89,0.04)", border: "1px solid rgba(52,199,89,0.12)", borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 8 }}>Total Expenses</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34c759", letterSpacing: "-0.5px", marginBottom: 4 }}>
                {totalExpenses.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 8 }}>{expenses.length} expenses recorded</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                {EXPENSE_TYPES.map((t) => {
                  const sum = expenses.filter((e) => e.type === t).reduce((s, e) => s + e.amount_aed, 0);
                  return sum > 0 ? (
                    <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#86868b" }}>{EXPENSE_ICONS[t]} {t}</span>
                      <span style={{ fontWeight: 700, color: EXPENSE_COLORS[t] }}>{sum.toLocaleString("en-GB", { maximumFractionDigits: 0 })} AED</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Activities Today */}
            <div style={{ background: "rgba(175,82,222,0.04)", border: "1px solid rgba(175,82,222,0.12)", borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 8 }}>Activities Today</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#af52de", letterSpacing: "-1px" }}>
                {PROBLEM_REPORTS.length}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 4 }}>driver reports</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#86868b" }}>
                Pending: <span style={{ fontWeight: 700, color: PROBLEM_REPORTS.filter(r => r.status === "pending").length > 0 ? "#ff9500" : "#34c759" }}>{PROBLEM_REPORTS.filter(r => r.status === "pending").length}</span>
              </div>
            </div>

            {/* Unavailable vehicles */}
            <div style={{ background: activeUnavails.length > 0 ? "rgba(255,59,48,0.04)" : "rgba(255,149,0,0.04)", border: `1px solid ${activeUnavails.length > 0 ? "rgba(255,59,48,0.2)" : "rgba(255,149,0,0.2)"}`, borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ color: activeUnavails.length > 0 ? "#ff3b30" : "#ff9500", fontSize: 14 }}>⊙</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: activeUnavails.length > 0 ? "#ff3b30" : "#ff9500" }}>Unavailable vehicles ({activeUnavails.length})</span>
              </div>
              {activeUnavails.length === 0 ? (
                <div style={{ fontSize: 12, color: "#86868b", textAlign: "center", padding: "8px 0" }}>No unavailable vehicle</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {activeUnavails.slice(0, 4).map((u) => (
                    <div key={u.id} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{u.plate}</div>
                      <div style={{ color: "#86868b", marginTop: 1 }}>{u.reason || "Unavailable"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SUB-TABS ── */}
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", padding: "4px 4px 0", background: "#fafafa", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {(["vehicles", "expenses", "activity", "unavailabilities", "reports", "maintenance", "valuation"] as const).map((t) => {
                const labels: Record<string, string> = { vehicles: "Vehicles", expenses: "Expenses", activity: "Activity", unavailabilities: "Unavailabilities", reports: "Reports", maintenance: "Maintenance", valuation: "Valuation" };
                const active = subTab === t;
                const maintenancePending = t === "maintenance" ? alerts.filter((a) => a.type === "service_due" && (a.status ?? "pending") !== "closed").length : 0;
                const badge = (t === "unavailabilities" && activeUnavails.length > 0) ? activeUnavails.length : (t === "maintenance" && maintenancePending > 0) ? maintenancePending : null;
                return (
                  <button key={t} onClick={() => setSubTab(t)} style={{ background: active ? "#fff" : "transparent", border: "none", borderRadius: "10px 10px 0 0", padding: "10px 24px", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#1d1d1f" : "#86868b", cursor: "pointer", fontFamily: "inherit", boxShadow: active ? "0 -1px 0 #fff inset, 0 1px 4px rgba(0,0,0,0.06)" : "none", transition: "all 0.15s", marginRight: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    {labels[t]}
                    {badge && <span style={{ background: "#ff3b30", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px", lineHeight: "16px" }}>{badge}</span>}
                  </button>
                );
              })}
            </div>

            {/* ─── VEHICLES TAB ─── */}
            {subTab === "vehicles" && (
              <div style={{ padding: "16px 20px 20px" }}>
                {/* Filters row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#007aff", fontWeight: 600, fontSize: 13 }}>
                    ⟁ Filters
                  </div>
                  <button onClick={downloadExcel} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, color: "#1d1d1f" }}>
                    ↓ Download Excel
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 160px 200px", gap: 8, marginBottom: 16 }}>
                  <input placeholder="Plate" value={filterPlate} onChange={(e) => setFilterPlate(e.target.value)} style={{ ...inputStyle, backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                  <input placeholder="Year (e.g.: 2024)" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ ...inputStyle, backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                  <input placeholder="Make" value={filterMake} onChange={(e) => setFilterMake(e.target.value)} style={{ ...inputStyle, backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                  <input placeholder="Model" value={filterModel2} onChange={(e) => setFilterModel2(e.target.value)} style={{ ...inputStyle, backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                  <CustomSelect compact value={filterStatus} onChange={(v) => setFilterStatus(String(v))} options={[{ value: "Toutes", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} triggerStyle={{ backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                  <CustomSelect compact value={filterLocation} onChange={(v) => setFilterLocation(String(v))} options={uniqueLocations.map(loc => ({ value: loc, label: loc === "Toutes" ? "All" : loc }))} triggerStyle={{ backgroundColor: "#fff", border: "1px solid #e8e8e8" }} />
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                        {["Plate", "Type", "Fuel", "Make/Model", "Year", "Status", "Location", "Mileage", "Service", "Actions"].map((h) => (
                          <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((v) => {
                        const vType = getVehicleType(v);
                        const isUnavail = activeUnavails.some((u) => u.plate === v.plate);
                        const statusOk = v.status !== "inactive" && !isUnavail;
                        return (
                          <tr key={v.plate} style={{ borderBottom: "1px solid #f8f8f8" }}>
                            <td style={{ padding: "11px 12px", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{v.plate}</td>
                            <td style={{ padding: "11px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "#f5f5f7", color: "#3c3c43" }}>{vType}</span>
                            </td>
                            <td style={{ padding: "11px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: v.fuel === "Electric" ? "rgba(52,199,89,0.1)" : "rgba(255,149,0,0.1)", color: v.fuel === "Electric" ? "#34c759" : "#ff9500" }}>
                                {v.fuel === "Electric" ? "electric" : v.fuel?.toLowerCase() ?? "—"}
                              </span>
                            </td>
                            <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 500 }}>
                              {v.make} {v.model}
                            </td>
                            <td style={{ padding: "11px 12px", fontSize: 12, color: "#86868b" }}>{v.year}</td>
                            <td style={{ padding: "11px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: statusOk ? "#1d1d1f" : "rgba(255,59,48,0.1)", color: statusOk ? "#fff" : "#ff3b30" }}>
                                {isUnavail ? "unavailable" : (v.status ?? "active")}
                              </span>
                            </td>
                            <td style={{ padding: "11px 12px" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                                background: v.location === "Office" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)",
                                color: v.location === "Office" ? "#007aff" : "#ff9500",
                              }}>
                                {v.locationName ?? v.location.toLowerCase()}
                              </span>
                            </td>
                            <td style={{ padding: "11px 12px", fontSize: 12, color: "#86868b" }}>{v.km != null ? `${v.km.toLocaleString("en-GB")} km` : "0 km"}</td>
                            <td style={{ padding: "11px 12px", fontSize: 12 }}>
                              {(() => {
                                const nextSvc = v.lastServiceKm + v.serviceInterval;
                                const kmLeft = v.km != null ? nextSvc - v.km : null;
                                if (kmLeft == null) return <span style={{ color: "#86868b" }}>{v.lastServiceKm ? `${v.lastServiceKm.toLocaleString("en-GB")} km` : "—"}</span>;
                                return (
                                  <span
                                    style={{ color: kmLeft <= 0 ? "#ff3b30" : kmLeft <= 2000 ? "#ff9500" : "#34c759", fontWeight: kmLeft <= 2000 ? 700 : 400 }}
                                    title={`Next service: ${nextSvc.toLocaleString("en-GB")} km`}
                                  >
                                    {kmLeft <= 0
                                      ? `⚠ +${Math.abs(kmLeft).toLocaleString("en-GB")} km`
                                      : `${kmLeft.toLocaleString("en-GB")} km`}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: "11px 12px" }}>
                              <button onClick={() => setDetailVehicle(v)} style={{ background: "transparent", border: "1px solid #e5e5e5", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 14, color: "#86868b" }} title="View details">👁</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── EXPENSES TAB ─── */}
            {subTab === "expenses" && (
              <div style={{ padding: "16px 20px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Vehicle Expenses</div>
                    <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>Total : {totalExpenses.toLocaleString("en-GB", { maximumFractionDigits: 0 })} AED · {expenses.length} records</div>
                  </div>
                  {!readOnly && <button onClick={() => setShowExpense(true)} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    + Add Expense
                  </button>}
                </div>

                {/* Summary by type */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                  {EXPENSE_TYPES.map((t) => {
                    const total = expenses.filter((e) => e.type === t).reduce((s, e) => s + e.amount_aed, 0);
                    const count = expenses.filter((e) => e.type === t).length;
                    return (
                      <div key={t} style={{ background: `${EXPENSE_COLORS[t]}10`, border: `1px solid ${EXPENSE_COLORS[t]}30`, borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{EXPENSE_ICONS[t]}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase" }}>{t}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: EXPENSE_COLORS[t], marginTop: 4 }}>{total.toLocaleString("en-GB", { maximumFractionDigits: 0 })} AED</div>
                        <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{count} {count !== 1 ? "entries" : "entry"}</div>
                      </div>
                    );
                  })}
                </div>

                {expenses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#86868b", fontSize: 13 }}>No expenses recorded</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                          {["Date", "Vehicle", "Type", "Description", "Km", "Amount (AED)", ""].map((h) => (
                            <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: h === "Amount (AED)" ? "right" : "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => (
                          <tr key={e.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                            <td style={{ padding: "10px 12px", fontSize: 12, color: "#86868b", whiteSpace: "nowrap" }}>{e.date}</td>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{e.plate}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${EXPENSE_COLORS[e.type]}15`, color: EXPENSE_COLORS[e.type] }}>
                                {EXPENSE_ICONS[e.type]} {e.type}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 12, color: "#3c3c43", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, color: "#86868b" }}>{e.km != null ? `${e.km.toLocaleString("en-GB")} km` : "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", color: EXPENSE_COLORS[e.type] }}>{e.amount_aed.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              <button onClick={() => handleDeleteExpense(e.id)} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ─── ACTIVITY TAB ─── */}
            {subTab === "activity" && (() => {
              const filtered = checkIns.filter(ci =>
                !ciFilter || ci.plate?.toLowerCase().includes(ciFilter.toLowerCase()) || ci.driver_name?.toLowerCase().includes(ciFilter.toLowerCase())
              );
              // Group sessions by session_id
              const sessionsMap: Record<string, { checkIn?: CheckInRecord; checkOut?: CheckInRecord }> = {};
              filtered.forEach(ci => {
                if (!ci.session_id) return;
                if (!sessionsMap[ci.session_id]) sessionsMap[ci.session_id] = {};
                if (ci.entry_type === "check_in") sessionsMap[ci.session_id].checkIn = ci;
                else if (ci.entry_type === "check_out") sessionsMap[ci.session_id].checkOut = ci;
              });
              const sessions = Object.entries(sessionsMap).sort((a, b) => {
                const ta = a[1].checkIn?.checked_in_at ?? a[1].checkOut?.checked_in_at ?? "";
                const tb = b[1].checkIn?.checked_in_at ?? b[1].checkOut?.checked_in_at ?? "";
                return tb.localeCompare(ta);
              });
              return (
                <div style={{ padding: "16px 20px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Check-In / Check-Out Activity</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>{filtered.length} {filtered.length !== 1 ? "entries" : "entry"} · data persisted in Supabase</div>
                    </div>
                    <input value={ciFilter} onChange={e => setCiFilter(e.target.value)} placeholder="Filter plate or driver..." style={{ ...inputStyle, maxWidth: 220, backgroundColor: "#f5f5f7" }} />
                  </div>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#86868b", fontSize: 13 }}>
                      {dataLoaded ? "No activity recorded" : "Loading..."}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                        <thead>
                          <tr>
                            {["Vehicle", "Driver", "Check-In", "Start km", "Check-Out", "Return km", "Km diff", "Status"].map(h => (
                              <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase" as const, letterSpacing: "0.5px", padding: "8px 10px", borderBottom: "1px solid #f0f0f5", whiteSpace: "nowrap" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map(([sid, { checkIn, checkOut }]) => {
                            const plate = checkIn?.plate ?? checkOut?.plate ?? "—";
                            const driver = checkIn?.driver_name ?? checkOut?.driver_name ?? "—";
                            const kmIn = checkIn?.km;
                            const kmOut = checkOut?.km;
                            const kmDiff = kmIn != null && kmOut != null ? kmOut - kmIn : null;
                            const isActive = !checkOut;
                            const fmtTime = (t?: string) => t ? new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
                            return (
                              <tr key={sid} style={{ borderBottom: "1px solid #f8f8f9" }}>
                                <td style={{ padding: "10px 10px", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{plate}</td>
                                <td style={{ padding: "10px 10px", fontSize: 13 }}>{driver}</td>
                                <td style={{ padding: "10px 10px", fontSize: 12, color: "#34c759" }}>{fmtTime(checkIn?.checked_in_at)}</td>
                                <td style={{ padding: "10px 10px", fontSize: 13 }}>{kmIn != null ? `${kmIn.toLocaleString("en-GB")} km` : "—"}</td>
                                <td style={{ padding: "10px 10px", fontSize: 12, color: "#ff3b30" }}>{fmtTime(checkOut?.checked_in_at)}</td>
                                <td style={{ padding: "10px 10px", fontSize: 13 }}>{kmOut != null ? `${kmOut.toLocaleString("en-GB")} km` : "—"}</td>
                                <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, color: kmDiff == null ? "#86868b" : kmDiff < 0 ? "#ff3b30" : "#1d1d1f" }}>
                                  {kmDiff != null ? `${kmDiff > 0 ? "+" : ""}${kmDiff.toLocaleString("en-GB")} km` : "—"}
                                </td>
                                <td style={{ padding: "10px 10px" }}>
                                  {isActive
                                    ? <span style={{ background: "rgba(52,199,89,0.1)", color: "#34c759", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>● In progress</span>
                                    : <span style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>✓ Completed</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── UNAVAILABILITIES TAB ─── */}
            {subTab === "unavailabilities" && (() => {
              const statusFiltered = unavailShowAll ? unavails : unavails.filter((u) => u.status === "active");
              const displayed = unavailFilterPlate ? statusFiltered.filter((u) => u.plate === unavailFilterPlate) : statusFiltered;
              const resolvedCount = unavails.filter((u) => u.status === "resolved").length;
              const uniquePlates = [...new Set(unavails.map((u) => u.plate))].sort();
              return (
                <div style={{ padding: "20px 20px 24px" }}>
                  {/* KPI bar */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120, background: "rgba(255,59,48,0.05)", border: "1px solid rgba(255,59,48,0.15)", borderRadius: 14, padding: "12px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#ff3b30", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Active</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#ff3b30" }}>{activeUnavails.length}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120, background: "rgba(52,199,89,0.05)", border: "1px solid rgba(52,199,89,0.15)", borderRadius: 14, padding: "12px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#34c759", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Resolved</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#34c759" }}>{resolvedCount}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120, background: "#f5f5f7", border: "1px solid #e8e8ed", borderRadius: 14, padding: "12px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Total</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#1d1d1f" }}>{unavails.length}</div>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => setUnavailShowAll(false)}
                        style={{ background: !unavailShowAll ? "#1d1d1f" : "#f5f5f7", color: !unavailShowAll ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Active only
                      </button>
                      <button
                        onClick={() => setUnavailShowAll(true)}
                        style={{ background: unavailShowAll ? "#1d1d1f" : "#f5f5f7", color: unavailShowAll ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        All ({unavails.length})
                      </button>
                      <div ref={unavailDropdownRef} style={{ position: "relative" }}>
                        <button
                          onClick={() => setUnavailDropdownOpen((v) => !v)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: unavailFilterPlate ? "#007aff" : "#f5f5f7",
                            color: unavailFilterPlate ? "#fff" : "#86868b",
                            border: "none", borderRadius: 8, padding: "7px 14px",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <span style={{ fontSize: 13 }}>🚗</span>
                          {unavailFilterPlate || "All vehicles"}
                          <svg width="8" height="5" viewBox="0 0 8 5" style={{ marginLeft: 2, transition: "transform 0.2s", transform: unavailDropdownOpen ? "rotate(180deg)" : "rotate(0)" }}>
                            <path d="M0 0l4 5 4-5z" fill={unavailFilterPlate ? "#fff" : "#86868b"} />
                          </svg>
                        </button>
                        {unavailDropdownOpen && (
                          <div
                            style={{
                              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                              background: "#fff", borderRadius: 12, padding: "6px 0",
                              boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
                              minWidth: 170, maxHeight: 240, overflowY: "auto",
                              animation: "fadeIn 0.12s ease"
                            }}
                          >
                            <div
                              onClick={() => { setUnavailFilterPlate(""); setUnavailDropdownOpen(false); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                color: !unavailFilterPlate ? "#007aff" : "#1d1d1f",
                                background: !unavailFilterPlate ? "rgba(0,122,255,0.06)" : "transparent",
                                transition: "background 0.1s"
                              }}
                              onMouseEnter={(e) => { if (unavailFilterPlate) (e.currentTarget as HTMLDivElement).style.background = "#f5f5f7"; }}
                              onMouseLeave={(e) => { if (unavailFilterPlate) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                              <span style={{ width: 16, textAlign: "center", fontSize: 11 }}>{!unavailFilterPlate ? "✓" : ""}</span>
                              All vehicles
                            </div>
                            <div style={{ height: 1, background: "#f0f0f5", margin: "4px 10px" }} />
                            {uniquePlates.map((p) => (
                              <div
                                key={p}
                                onClick={() => { setUnavailFilterPlate(p); setUnavailDropdownOpen(false); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                  fontFamily: "monospace",
                                  color: unavailFilterPlate === p ? "#007aff" : "#1d1d1f",
                                  background: unavailFilterPlate === p ? "rgba(0,122,255,0.06)" : "transparent",
                                  transition: "background 0.1s"
                                }}
                                onMouseEnter={(e) => { if (unavailFilterPlate !== p) (e.currentTarget as HTMLDivElement).style.background = "#f5f5f7"; }}
                                onMouseLeave={(e) => { if (unavailFilterPlate !== p) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                              >
                                <span style={{ width: 16, textAlign: "center", fontSize: 11, fontFamily: "inherit" }}>{unavailFilterPlate === p ? "✓" : ""}</span>
                                {p}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowUnavail(true)}
                      style={{ background: "#ff3b30", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      + Report Unavailability
                    </button>
                  </div>

                  {/* Table */}
                  {displayed.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 16px", color: "#86868b", fontSize: 13 }}>
                      {unavailShowAll ? "No unavailability recorded" : "No vehicle currently unavailable ✓"}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #f0f0f5", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f5f5f7" }}>
                            {["Vehicle", "Start", "End", "Duration", "Reason", "Status", ""].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: h === "" ? "center" : "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayed.map((u, i) => {
                            // Duration in days
                            const startMs = new Date(u.start_date).getTime();
                            const endMs = u.end_date ? new Date(u.end_date).getTime() : (u.status === "active" ? Date.now() : null);
                            const days = endMs != null ? Math.max(1, Math.round((endMs - startMs) / 86400000) + 1) : null;
                            return (
                              <tr key={u.id} style={{ borderBottom: i < displayed.length - 1 ? "1px solid #f5f5f7" : "none", background: u.status === "active" ? "rgba(255,59,48,0.015)" : "transparent" }}>
                                <td style={{ padding: "11px 12px" }}>
                                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, background: "rgba(0,122,255,0.08)", color: "#007aff", padding: "3px 8px", borderRadius: 6 }}>{u.plate}</span>
                                </td>
                                <td style={{ padding: "11px 12px", fontSize: 12, color: "#1d1d1f", whiteSpace: "nowrap" }}>
                                  {new Date(u.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </td>
                                <td style={{ padding: "11px 12px", fontSize: 12, color: "#86868b", whiteSpace: "nowrap" }}>
                                  {u.end_date ? new Date(u.end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : (u.status === "active" ? <span style={{ color: "#ff3b30", fontWeight: 600 }}>In progress</span> : "—")}
                                </td>
                                <td style={{ padding: "11px 12px", fontSize: 12, color: "#86868b", whiteSpace: "nowrap" }}>
                                  {days != null ? `${days}d` : "—"}
                                </td>
                                <td style={{ padding: "11px 12px", fontSize: 12, color: "#1d1d1f", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {u.reason || <span style={{ color: "#86868b" }}>—</span>}
                                </td>
                                <td style={{ padding: "11px 12px" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: u.status === "active" ? "rgba(255,59,48,0.1)" : "rgba(52,199,89,0.1)", color: u.status === "active" ? "#ff3b30" : "#34c759" }}>
                                    {u.status === "active" ? "Active" : "Resolved"}
                                  </span>
                                </td>
                                <td style={{ padding: "11px 12px", textAlign: "center" }}>
                                  {u.status === "active" && !readOnly && (
                                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                      <button
                                        onClick={() => handleEditUnavail(u)}
                                        style={{ background: "transparent", border: "1px solid #007aff", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#007aff", fontFamily: "inherit", fontWeight: 700 }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleExtendUnavail(u)}
                                        title="Étendre d'un jour"
                                        style={{ background: "transparent", border: "1px solid #ff9500", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#ff9500", fontFamily: "inherit", fontWeight: 700 }}
                                      >
                                        +1j
                                      </button>
                                      <button
                                        onClick={() => handleResolveUnavail(u.id)}
                                        disabled={!u.end_date}
                                        title={!u.end_date ? "Renseignez la date de fin avant de résoudre" : ""}
                                        style={{ background: "transparent", border: `1px solid ${u.end_date ? "#34c759" : "#d1d1d6"}`, borderRadius: 7, padding: "5px 12px", cursor: u.end_date ? "pointer" : "not-allowed", fontSize: 11, color: u.end_date ? "#34c759" : "#c7c7cc", fontFamily: "inherit", fontWeight: 700, opacity: u.end_date ? 1 : 0.6 }}
                                      >
                                        ✓ Resolve
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── REPORTS TAB ─── */}
            {subTab === "reports" && (
              <div style={{ padding: "16px 20px 20px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Problems reported by drivers</div>
                <div style={{ fontSize: 11, color: "#86868b", marginBottom: 16 }}>{PROBLEM_REPORTS.length} report{PROBLEM_REPORTS.length !== 1 ? "s" : ""} · {PROBLEM_REPORTS.filter(r => r.status === "pending").length} pending</div>
                {PROBLEM_REPORTS.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#86868b", fontSize: 13 }}>No problems reported</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                          {["Vehicle", "Driver", "Category", "Description", "Date", "Status"].map((h) => (
                            <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PROBLEM_REPORTS.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.vehiclePlate}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12 }}>{r.driverName}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12 }}>{PROBLEM_CATS.find((c) => c.id === r.cat)?.icon} {PROBLEM_CATS.find((c) => c.id === r.cat)?.label ?? r.cat}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#86868b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note || "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#86868b", whiteSpace: "nowrap" }}>{r.time}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <CustomSelect compact statusStyle value={r.status} onChange={(v) => setProblemReportStatus(r.id, v as ProblemStatus)} options={[{ value: "pending", label: "Pending", bg: "rgba(255,149,0,0.08)", color: "#ff9500" }, { value: "in_progress", label: "In progress", bg: "rgba(0,122,255,0.08)", color: "#007aff" }, { value: "closed", label: "Closed", bg: "rgba(52,199,89,0.08)", color: "#34c759" }]} triggerStyle={{ border: "none", fontWeight: 600 }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

            {/* ─── MAINTENANCE TAB ─── */}
            {subTab === "maintenance" && (
              <MaintenanceView alerts={alerts} onRefresh={onAlertRefresh} />
            )}

            {/* ─── VALUATION TAB ─── */}
            {subTab === "valuation" && (() => {
              // Compute as-of date: last day of selected month + previous month for delta
              const asOfDate = new Date(valYear, valMonth + 1, 0);
              const prevAsOfDate = new Date(valYear, valMonth, 0); // last day of previous month
              const isCurrentMonth = valMonth === new Date().getMonth() && valYear === new Date().getFullYear();
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

              const allWithDep = vehicles
                .filter((v) => v.purchaseAmount && v.purchaseDate)
                .map((v) => {
                  const dep = computeDepreciation(v.purchaseAmount!, v.purchaseDate!, asOfDate, v.depMonthlyOverride);
                  const prevDep = computeDepreciation(v.purchaseAmount!, v.purchaseDate!, prevAsOfDate, v.depMonthlyOverride);
                  const depThisMonth = Math.max(0, dep.accumulatedDepreciation - prevDep.accumulatedDepreciation);
                  return { vehicle: v, dep, depThisMonth };
                });

              // Filter by status
              const statusFiltered = valStatusFilter === "all"
                ? allWithDep
                : allWithDep.filter((d) => valStatusFilter === "sold" ? d.vehicle.status === "sold" : d.vehicle.status !== "sold");

              // Filter by plate
              const filtered = valFilterPlate
                ? statusFiltered.filter((d) => d.vehicle.plate.toLowerCase().includes(valFilterPlate.toLowerCase()))
                : statusFiltered;

              // Sort
              const vWithDep = [...filtered].sort((a, b) => {
                const dir = valSortDir === "asc" ? 1 : -1;
                if (valSort === "nav") return (a.dep.netAssetValue - b.dep.netAssetValue) * dir;
                return (new Date(a.dep.purchaseDate).getTime() - new Date(b.dep.purchaseDate).getTime()) * dir;
              });

              // KPIs on filtered results
              const totalPurchase = vWithDep.reduce((s, d) => s + d.dep.purchasePrice, 0);
              const totalNAV = vWithDep.reduce((s, d) => s + d.dep.netAssetValue, 0);
              const totalSelling = vWithDep.reduce((s, d) => s + d.dep.sellingPrice, 0);
              const totalMonthlyDep = vWithDep.reduce((s, d) => s + d.depThisMonth, 0);
              const totalAccumulatedDep = vWithDep.reduce((s, d) => s + d.dep.accumulatedDepreciation, 0);

              const handleExportValuation = () => {
                const rows = vWithDep.map((d, i) => ({
                  "#": i + 1,
                  "Plate": d.vehicle.plate,
                  "Vehicle": `${d.vehicle.make} ${d.vehicle.model}`,
                  "Location": d.vehicle.location || "",
                  "Purchase Date": d.dep.purchaseDate,
                  "Purchase Price (AED)": +d.dep.purchasePrice.toFixed(2),
                  "Monthly Dep. (AED)": +d.depThisMonth.toFixed(2),
                  "Accumulated Dep. (AED)": +d.dep.accumulatedDepreciation.toFixed(2),
                  "Net Asset Value (AED)": +d.dep.netAssetValue.toFixed(2),
                  "Depreciation %": `${d.dep.depreciationPct}%`,
                  "Selling Price (AED)": +d.dep.sellingPrice.toFixed(2),
                  "Status": d.vehicle.status === "sold" ? "Sold" : "Active",
                  ...(d.vehicle.soldPrice ? { "Sold Price (AED)": +d.vehicle.soldPrice.toFixed(2) } : {}),
                  ...(d.vehicle.soldDate ? { "Sold Date": d.vehicle.soldDate } : {}),
                  ...(d.vehicle.soldTo ? { "Buyer": d.vehicle.soldTo } : {}),
                }));
                // Add totals row
                rows.push({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  "#": "" as any,
                  "Plate": "TOTAL",
                  "Vehicle": "",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  "Location": "" as any,
                  "Purchase Date": "",
                  "Purchase Price (AED)": +totalPurchase.toFixed(2),
                  "Monthly Dep. (AED)": +totalMonthlyDep.toFixed(2),
                  "Accumulated Dep. (AED)": +totalAccumulatedDep.toFixed(2),
                  "Net Asset Value (AED)": +totalNAV.toFixed(2),
                  "Depreciation %": "",
                  "Selling Price (AED)": +totalSelling.toFixed(2),
                  "Status": "",
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb2 = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb2, ws, "Fleet Valuation");
                XLSX.writeFile(wb2, `Fleet_Valuation_${monthNames[valMonth]}_${valYear}.xlsx`);
              };

              const handleSort = (col: "nav" | "date") => {
                if (valSort === col) setValSortDir((d) => d === "asc" ? "desc" : "asc");
                else { setValSort(col); setValSortDir(col === "nav" ? "desc" : "asc"); }
              };
              const sortIcon = (col: "nav" | "date") => valSort === col ? (valSortDir === "asc" ? " ↑" : " ↓") : "";

              return (
                <div style={{ padding: "16px 20px 20px" }}>
                  {/* KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
                    <div style={{ background: "#f5f5f7", borderRadius: 14, padding: 18, textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Total Purchase Value</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#1d1d1f" }}>{formatAED(totalPurchase)}</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>AED</div>
                    </div>
                    <div style={{ background: "#f5f5f7", borderRadius: 14, padding: 18, textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Current Net Asset Value</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#007aff" }}>{formatAED(totalNAV)}</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>AED ({totalPurchase > 0 ? Math.round((totalNAV / totalPurchase) * 100) : 0}% of purchase)</div>
                    </div>
                    <div style={{ background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)", borderRadius: 14, padding: 18, textAlign: "center", border: "1px solid rgba(52,199,89,0.15)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#34c759", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Total Selling Estimate</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#34c759" }}>{formatAED(totalSelling)}</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>AED (NAV +10% +5% VAT)</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "linear-gradient(135deg, #fff3e0, #fff8e1)", borderRadius: 14, padding: 18, textAlign: "center", border: "1px solid rgba(255,149,0,0.2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#ff9500", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Depreciation — {monthNames[valMonth]} {valYear}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#ff9500" }}>{formatAED(totalMonthlyDep)}</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>AED — amount to book this month</div>
                    </div>
                    <div style={{ background: "#f5f5f7", borderRadius: 14, padding: 18, textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 6 }}>Accumulated Depreciation</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#ff3b30" }}>{formatAED(totalAccumulatedDep)}</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>AED ({totalPurchase > 0 ? Math.round((totalAccumulatedDep / totalPurchase) * 100) : 0}% of purchase)</div>
                    </div>
                  </div>

                  {/* Period selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>📅 As of:</span>
                    <select value={valMonth} onChange={(e) => setValMonth(Number(e.target.value))} style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", color: "#1d1d1f", cursor: "pointer", outline: "none" }}>
                      {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={valYear} onChange={(e) => setValYear(Number(e.target.value))} style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", color: "#1d1d1f", cursor: "pointer", outline: "none" }}>
                      {Array.from({ length: 6 }, (_, i) => 2022 + i).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {!isCurrentMonth && (
                      <button onClick={() => { setValMonth(new Date().getMonth()); setValYear(new Date().getFullYear()); }} style={{ background: "none", border: "1px solid #e5e5ea", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#007aff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Today</button>
                    )}
                    {!isCurrentMonth && (
                      <span style={{ fontSize: 11, color: "#ff9500", fontWeight: 600 }}>⚠ Historical view: {monthNames[valMonth]} {valYear}</span>
                    )}
                    <div style={{ flex: 1 }} />
                    {/* Status filter */}
                    <div style={{ display: "flex", gap: 2, background: "#f5f5f7", borderRadius: 8, padding: 2 }}>
                      {([["active", "Active"], ["sold", "Sold"], ["all", "All"]] as const).map(([k, label]) => (
                        <button key={k} onClick={() => setValStatusFilter(k)} style={{ background: valStatusFilter === k ? "#fff" : "transparent", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: valStatusFilter === k ? 700 : 500, color: valStatusFilter === k ? (k === "sold" ? "#ff9500" : "#1d1d1f") : "#86868b", cursor: "pointer", fontFamily: "inherit", boxShadow: valStatusFilter === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter & Export row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Vehicle plate filter */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: valFilterPlate ? "#eef6ff" : "#f5f5f7", borderRadius: 8, padding: "6px 10px", border: valFilterPlate ? "1px solid rgba(0,122,255,0.2)" : "1px solid transparent" }}>
                        <span style={{ fontSize: 13 }}>🔍</span>
                        <input
                          value={valFilterPlate}
                          onChange={(e) => setValFilterPlate(e.target.value)}
                          placeholder="Filter by plate…"
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, fontFamily: "inherit", color: "#1d1d1f", width: 120 }}
                        />
                        {valFilterPlate && (
                          <button onClick={() => setValFilterPlate("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#86868b", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                        )}
                      </div>
                      {/* Sort buttons */}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => handleSort("date")} style={{ background: valSort === "date" ? "#007aff" : "#f5f5f7", color: valSort === "date" ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                          Date{sortIcon("date")}
                        </button>
                        <button onClick={() => handleSort("nav")} style={{ background: valSort === "nav" ? "#007aff" : "#f5f5f7", color: valSort === "nav" ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                          Net Asset Value{sortIcon("nav")}
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: "#86868b" }}>{vWithDep.length}{valFilterPlate ? ` / ${allWithDep.length}` : ""} vehicle{vWithDep.length !== 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={handleExportValuation} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Export {monthNames[valMonth].slice(0, 3)} {valYear}</button>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e5ea" }}>
                          {["Plate", "Vehicle", "Location", "Purchase Date", "Purchase Price", "Monthly Dep.", "Accum. Dep.", "Net Asset Value", "Progress", "Selling Price", ""].map((h) => {
                            const sortable = h === "Purchase Date" ? "date" : h === "Net Asset Value" ? "nav" : null;
                            return (
                              <th key={h} onClick={sortable ? () => handleSort(sortable) : undefined} style={{ textAlign: "left", padding: "10px 8px", fontWeight: 700, color: sortable && valSort === sortable ? "#007aff" : "#86868b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap", cursor: sortable ? "pointer" : "default", userSelect: "none" }}>
                                {h}{sortable ? sortIcon(sortable) : ""}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {vWithDep.map(({ vehicle: v, dep: d, depThisMonth: dtm }) => (
                          <tr key={v.plate} style={{ borderBottom: "1px solid #f5f5f7" }}>
                            <td style={{ padding: "10px 8px", fontWeight: 700, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{v.plate}</td>
                            <td style={{ padding: "10px 8px", color: "#1d1d1f" }}>{v.make} {v.model}</td>
                            <td style={{ padding: "10px 8px" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: v.location === "Lease" ? "rgba(0,122,255,0.08)" : "rgba(52,199,89,0.08)", color: v.location === "Lease" ? "#007aff" : "#34c759" }}>{v.location || "—"}</span>
                            </td>
                            <td style={{ padding: "10px 8px", color: "#86868b", whiteSpace: "nowrap" }}>{new Date(d.purchaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td style={{ padding: "10px 8px", fontWeight: 600 }}>{formatAED(d.purchasePrice)}</td>
                            <td style={{ padding: "10px 8px", color: "#ff9500", fontWeight: 600 }}>{formatAED(dtm)}</td>
                            <td style={{ padding: "10px 8px", color: "#ff3b30", fontWeight: 600 }}>{formatAED(d.accumulatedDepreciation)}</td>
                            <td style={{ padding: "10px 8px", fontWeight: 700 }}>{formatAED(d.netAssetValue)}</td>
                            <td style={{ padding: "10px 8px", minWidth: 100 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ flex: 1, height: 6, background: "#e5e5ea", borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${d.depreciationPct}%`, background: d.fullyDepreciated ? "#ff9500" : "#007aff", borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 10, color: d.fullyDepreciated ? "#ff9500" : "#86868b", fontWeight: 600, whiteSpace: "nowrap" }}>{d.depreciationPct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 8px", fontWeight: 700, color: "#34c759" }}>{formatAED(d.sellingPrice)}</td>
                            <td style={{ padding: "10px 8px" }}>
                              {v.status === "sold" ? (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,149,0,0.1)", color: "#ff9500" }}>Sold{v.soldPrice ? ` · ${formatAED(v.soldPrice)}` : ""}</span>
                              ) : !readOnly ? (
                                <button onClick={() => { setSaleVehicle(v); setSalePrice(String(Math.round(d.sellingPrice))); setSaleDate(new Date().toISOString().slice(0, 10)); setSaleTo(""); setShowSaleModal(true); }} style={{ background: "rgba(255,149,0,0.08)", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#ff9500", cursor: "pointer", fontFamily: "inherit" }}>Sell</button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* ── VEHICLE DETAIL MODAL ── */}
          {detailVehicle && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }} onClick={() => { setDetailVehicle(null); setEditMode(false); setDetailTab("info"); }}>
              <div style={{ position: "relative", width: "min(900px, 100%)", maxHeight: "90vh", background: "#fff", borderRadius: 20, boxShadow: "0 8px 64px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>

                {/* Header sticky */}
                <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #f0f0f0", background: "#fff", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, letterSpacing: "1px" }}>{detailVehicle.plate}</div>
                      <div style={{ fontSize: 13, color: "#86868b", marginTop: 2 }}>{detailVehicle.make} {detailVehicle.model} · {detailVehicle.year}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!editMode && !readOnly && (
                        <button onClick={() => {
                          setEditMode(true);
                          setEditMakesId(typeof detailVehicle._makesId === "number" ? detailVehicle._makesId : "");
                          setEditModelsId(typeof detailVehicle._modelsId === "number" ? detailVehicle._modelsId : "");
                          setEditTrim(detailVehicle.trim ?? "");
                          setEditYear(String(detailVehicle.year ?? ""));
                          setEditKm(String(detailVehicle.km ?? ""));
                          setEditStatus(detailVehicle.status ?? "active");
                          setEditLocationId(typeof detailVehicle._locationId === "number" ? detailVehicle._locationId : "");
                          setEditFuel(detailVehicle.fuel ?? "");
                          setEditExtColor(detailVehicle.extColor ?? "");
                          setEditIntColor(detailVehicle.intColor ?? "");
                          setEditServiceInterval(String(detailVehicle.serviceInterval ?? ""));
                          setEditLastServiceKm(String(detailVehicle.lastServiceKm ?? ""));
                          setEditInsurance(detailVehicle.insurance ?? "");
                          setEditInsuranceDue(detailVehicle.insuranceDue ?? "");
                          setEditLeaseEnd(detailVehicle.leaseEnd ?? "");
                          setEditEndOfLoan(detailVehicle.endOfLoan ?? "");
                          setEditError(null);
                          // Load makes/models/locations if not yet available
                          if (nvMakes.length === 0) {
                            fetchMakes().then(setNvMakes).catch(() => {});
                            fetchRefModels().then(setNvModels).catch(() => {});
                          }
                          if (nvLocations.length === 0) {
                            fetchRefLocations().then(setNvLocations).catch(() => {});
                          }
                        }} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1d1d1f", fontFamily: "inherit" }}>
                          ✏️ Edit
                        </button>
                      )}
                      <button onClick={() => { setDetailVehicle(null); setEditMode(false); setDetailTab("info"); }} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 16, color: "#86868b" }}>✕</button>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#1d1d1f", color: "#fff" }}>{detailVehicle.status ?? "active"}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: detailVehicle.location === "Office" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)", color: detailVehicle.location === "Office" ? "#007aff" : "#ff9500" }}>{detailVehicle.location}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: detailVehicle.fuel === "Electric" ? "rgba(52,199,89,0.1)" : "rgba(255,149,0,0.1)", color: detailVehicle.fuel === "Electric" ? "#34c759" : "#ff9500" }}>
                      {detailVehicle.fuel === "Electric" ? "⚡ Electric" : `⛽ ${detailVehicle.fuel}`}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: "#f5f5f7", color: "#86868b" }}>{getVehicleType(detailVehicle)}</span>
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {(["info", "photos", "documents", "depenses", "depreciation"] as const).map((t) => {
                      const labels: Record<string, string> = { info: "Info", photos: "Photos", documents: "Documents", depenses: "Expenses", depreciation: "Depreciation" };
                      const active = detailTab === t;
                      return (
                        <button key={t} onClick={() => setDetailTab(t)} style={{ background: "transparent", border: "none", borderBottom: active ? "2px solid #1d1d1f" : "2px solid transparent", padding: "8px 14px", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#1d1d1f" : "#86868b", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                          {labels[t]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 32px" }}>

                  {/* ─ TAB: INFOS ─ */}
                  {detailTab === "info" && (
                    <div>
                      {editMode ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                          {/* ── Section : Identification ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>🚗 Identification</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={labelStyle}>Make</label>
                                <CustomSelect value={editMakesId} onChange={(v) => { setEditMakesId(Number(v) || ""); setEditModelsId(""); }} placeholder="Select..." searchPlaceholder="Make..." options={nvMakes.map((mk) => ({ value: mk.id, label: mk.name }))} />
                              </div>
                              <div>
                                <label style={labelStyle}>Model</label>
                                <CustomSelect value={editModelsId} onChange={(v) => setEditModelsId(Number(v) || "")} disabled={editMakesId === ""} placeholder="Select..." searchPlaceholder="Model..." options={(editMakesId !== "" ? nvModels.filter((m) => m.make_id === editMakesId) : nvModels).map((mo) => ({ value: mo.id, label: mo.name }))} />
                              </div>
                              <div>
                                <label style={labelStyle}>Trim</label>
                                <input type="text" value={editTrim} onChange={(e) => setEditTrim(e.target.value)} placeholder="Ex: AMG Line, Executive…" style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Year</label>
                                <input type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)} placeholder="2023" style={inputStyle} />
                              </div>
                            </div>
                          </div>

                          {/* ── Section : Caractéristiques ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>⚙️ Specifications</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={labelStyle}>Fuel</label>
                                <CustomSelect value={editFuel} onChange={(v) => setEditFuel(String(v))} placeholder="Select..." options={["Petrol", "Diesel", "Electric", "Hybrid"].map((f) => ({ value: f, label: f }))} />
                              </div>
                              <div>
                                <label style={labelStyle}>Location</label>
                                <CustomSelect value={editLocationId} onChange={(v) => setEditLocationId(Number(v) || "")} placeholder="Select..." options={nvLocations.map((loc) => ({ value: loc.id, label: loc.name, sublabel: loc.full_name && loc.full_name !== loc.name ? loc.full_name : undefined }))} />
                              </div>
                              <div>
                                <label style={labelStyle}>Ext. color</label>
                                <input type="text" value={editExtColor} onChange={(e) => setEditExtColor(e.target.value)} placeholder="Obsidian Black" style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Int. color</label>
                                <input type="text" value={editIntColor} onChange={(e) => setEditIntColor(e.target.value)} placeholder="Beige" style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Status</label>
                                <CustomSelect value={editStatus} onChange={(v) => setEditStatus(String(v))} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "maintenance", label: "Maintenance" }]} />
                              </div>
                            </div>
                          </div>

                          {/* ── Section : Entretien ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>🔧 Maintenance</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={labelStyle}>Current mileage</label>
                                <input type="number" value={editKm} onChange={(e) => setEditKm(e.target.value)} placeholder="85000" style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Service interval (km)</label>
                                <input type="number" value={editServiceInterval} onChange={(e) => setEditServiceInterval(e.target.value)} placeholder="10000" style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Last service (km)</label>
                                <input type="number" value={editLastServiceKm} onChange={(e) => setEditLastServiceKm(e.target.value)} placeholder="75000" style={inputStyle} />
                              </div>
                            </div>
                          </div>

                          {/* ── Section : Contrat & Assurance ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>📋 Contract & Insurance</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Insurer</label>
                                <input type="text" value={editInsurance} onChange={(e) => setEditInsurance(e.target.value)} placeholder="The Oriental Insurance" style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Insurance due</label>
                                <input type="date" value={editInsuranceDue} onChange={(e) => setEditInsuranceDue(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                <label style={labelStyle}>Lease end</label>
                                <input type="date" value={editLeaseEnd} onChange={(e) => setEditLeaseEnd(e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Loan end</label>
                                <input type="date" value={editEndOfLoan} onChange={(e) => setEditEndOfLoan(e.target.value)} style={inputStyle} />
                              </div>
                            </div>
                          </div>

                          {editError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#ff3b30" }}>{editError}</div>}

                          <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => { setEditMode(false); setEditError(null); }} style={{ flex: 1, background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                            <button disabled={editSaving} onClick={async () => {
                              setEditSaving(true); setEditError(null);
                              try {
                                const upd: VehicleUpdateInput = {
                                  makes_id: editMakesId !== "" ? editMakesId : null,
                                  models_id: editModelsId !== "" ? editModelsId : null,
                                  trim: editTrim || null,
                                  year: editYear ? parseInt(editYear, 10) : null,
                                  km: editKm ? parseInt(editKm, 10) : null,
                                  fuel: editFuel || null,
                                  location_id: editLocationId !== "" ? editLocationId : null,
                                  status: editStatus || null,
                                  ext_color: editExtColor || null,
                                  int_color: editIntColor || null,
                                  service_interval: editServiceInterval ? parseInt(editServiceInterval, 10) : null,
                                  last_service_km: editLastServiceKm ? parseInt(editLastServiceKm, 10) : null,
                                  insurance: editInsurance || null,
                                  insurance_due: editInsuranceDue || null,
                                  lease_end: editLeaseEnd || null,
                                  end_of_loan: editEndOfLoan || null,
                                };
                                await updateVehicle(detailVehicle.plate, upd);
                                setEditMode(false);
                                setDetailVehicle(null);
                                if (onVehicleCreated) onVehicleCreated();
                              } catch (e) { setEditError(e instanceof Error ? e.message : "Error"); }
                              finally { setEditSaving(false); }
                            }} style={{ flex: 2, background: editSaving ? "#d1d1d6" : "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              {editSaving ? "Saving..." : "💾 Save changes"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                          {/* ── Section : Identification & Caractéristiques ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>🚗 Identification & Specifications</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                              {[
                                { label: "VIN", value: detailVehicle.vin || "—" },
                                { label: "Registration date", value: detailVehicle.operationDate || "—" },
                                { label: "Fuel", value: detailVehicle.fuel || "—" },
                                { label: "Ext. color", value: detailVehicle.extColor || "—" },
                                { label: "Int. color", value: detailVehicle.intColor || "—" },
                                { label: "Trim", value: detailVehicle.trim || "—" },
                              ].map(({ label, value }) => (
                                <div key={label} style={{ background: "#f9f9fb", borderRadius: 10, padding: "10px 14px" }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── Section : Entretien ── */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>🔧 Maintenance</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                              {[
                                { label: "Current mileage", value: detailVehicle.km != null ? `${detailVehicle.km.toLocaleString("en-GB")} km` : "—" },
                                { label: "Last service", value: detailVehicle.lastServiceKm != null ? `${detailVehicle.lastServiceKm.toLocaleString("en-GB")} km` : "—" },
                                { label: "Service interval", value: detailVehicle.serviceInterval != null ? `${detailVehicle.serviceInterval.toLocaleString("en-GB")} km` : "—" },
                              ].map(({ label, value }) => (
                                <div key={label} style={{ background: "#f9f9fb", borderRadius: 10, padding: "10px 14px" }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── Section : Finance ── */}
                          {(detailVehicle.purchaseAmount || detailVehicle.loanAmount || detailVehicle.leaseAmount) && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>💰 Finance</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                {[
                                  detailVehicle.purchaseAmount ? { label: "Purchase price", value: `${detailVehicle.purchaseAmount.toLocaleString("en-GB")} AED` } : null,
                                  detailVehicle.loanAmount ? { label: "Loan", value: `${detailVehicle.loanAmount.toLocaleString("en-GB")} AED` } : null,
                                  detailVehicle.loanEMI ? { label: "Monthly EMI", value: `${detailVehicle.loanEMI.toLocaleString("en-GB")} AED` } : null,
                                  detailVehicle.endOfLoan ? { label: "Loan end", value: detailVehicle.endOfLoan } : null,
                                  detailVehicle.leaseAmount ? { label: "Monthly lease", value: `${detailVehicle.leaseAmount.toLocaleString("en-GB")} AED` } : null,
                                  detailVehicle.leaseEnd ? { label: "Lease end", value: detailVehicle.leaseEnd } : null,
                                ].filter(Boolean).map((item) => (
                                  <div key={item!.label} style={{ background: "rgba(0,122,255,0.05)", borderRadius: 10, padding: "10px 14px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{item!.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#007aff" }}>{item!.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Section : Assurance ── */}
                          {(detailVehicle.insurance || detailVehicle.insuranceDue) && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #f0f0f5" }}>🛡️ Insurance</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                {[
                                  detailVehicle.insurance ? { label: "Insurer", value: detailVehicle.insurance } : null,
                                  detailVehicle.insurancePayment ? { label: "Monthly premium", value: `${detailVehicle.insurancePayment.toLocaleString("en-GB")} AED` } : null,
                                  detailVehicle.insuranceDue ? { label: "Due date", value: detailVehicle.insuranceDue } : null,
                                ].filter(Boolean).map((item) => (
                                  <div key={item!.label} style={{ background: "rgba(52,199,89,0.06)", borderRadius: 10, padding: "10px 14px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{item!.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{item!.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─ TAB: PHOTOS ─ */}
                  {detailTab === "photos" && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Photo gallery</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginBottom: 16 }}>{detailVehicle.make} {detailVehicle.model} · {detailVehicle.year} · 6 photos max</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {Array.from({ length: 6 }).map((_, i) => {
                          const url = vehiclePhotoUrls[i] ?? detailVehicle.photoUrls?.[i];
                          const slotKey = `photo-${i}`;
                          return (
                            <div key={i} style={{ aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", background: "#f5f5f7", position: "relative", border: "1.5px dashed #e0e0e0" }}>
                              {url ? (
                                <>
                                  <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  <button onClick={async () => {
                                    const newUrls = [...(vehiclePhotoUrls.length ? vehiclePhotoUrls : (detailVehicle.photoUrls ?? []))];
                                    newUrls[i] = "";
                                    const filtered = newUrls.filter(Boolean);
                                    setVehiclePhotoUrls(filtered);
                                    await updateVehicle(detailVehicle.plate, { photo_urls: filtered });
                                  }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 6, color: "#fff", padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                                </>
                              ) : (
                                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", cursor: "pointer", gap: 4 }}>
                                  {uploadingSlot === slotKey ? (
                                    <span style={{ fontSize: 11, color: "#86868b" }}>Upload…</span>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: 22, color: "#c7c7cc" }}>📷</span>
                                      <span style={{ fontSize: 10, color: "#c7c7cc", fontWeight: 600 }}>Photo {i + 1}</span>
                                    </>
                                  )}
                                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    setUploadingSlot(slotKey);
                                    try {
                                      const url = await uploadVehicleAsset(detailVehicle.plate, file, `photo-${i}-${Date.now()}.${file.name.split(".").pop()}`);
                                      const base = vehiclePhotoUrls.length ? [...vehiclePhotoUrls] : [...(detailVehicle.photoUrls ?? [])];
                                      base[i] = url;
                                      setVehiclePhotoUrls([...base]);
                                      await updateVehicle(detailVehicle.plate, { photo_urls: base.filter(Boolean) });
                                    } catch { /* ignore */ }
                                    finally { setUploadingSlot(null); }
                                  }} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Vehicle record summary */}
                      <div style={{ marginTop: 20, background: "#1d1d1f", borderRadius: 14, padding: "16px 18px", color: "#fff" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Vehicle record</div>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{detailVehicle.make} {detailVehicle.model}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>{detailVehicle.year} · {detailVehicle.fuel}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[["Plate", detailVehicle.plate], ["Color", detailVehicle.extColor], ["Km", `${(detailVehicle.km ?? 0).toLocaleString("en-GB")} km`], ["Status", detailVehicle.status ?? "active"]].map(([k, v]) => (
                            <div key={k}>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─ TAB: DOCUMENTS ─ */}
                  {detailTab === "documents" && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Official documents</div>
                      <div style={{ fontSize: 11, color: "#86868b", marginBottom: 16 }}>PDF or image · max 20 MB per file</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          { key: "loan", label: "Loan contract", icon: "📋", urlKey: "loanContractUrl" as const, storageKey: "loan_contract_url" as const },
                          { key: "insurance", label: "Insurance", icon: "🛡️", urlKey: "insuranceUrl" as const, storageKey: "insurance_url" as const },
                          { key: "mulkiyaFront", label: "Mulkiya (front)", icon: "🪪", urlKey: "mulkiyaFrontUrl" as const, storageKey: "mulkiya_front_url" as const },
                          { key: "mulkiyaBack", label: "Mulkiya (back)", icon: "🪪", urlKey: "mulkiyaBackUrl" as const, storageKey: "mulkiya_back_url" as const },
                        ].map(({ key, label, icon, urlKey, storageKey }) => {
                          const currentUrl = vehicleDocs[key as keyof typeof vehicleDocs] ?? detailVehicle[urlKey];
                          const isPdf = currentUrl?.toLowerCase().endsWith(".pdf");
                          return (
                            <div key={key} style={{ border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: currentUrl ? 10 : 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 20 }}>{icon}</span>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                                    {!currentUrl && <div style={{ fontSize: 11, color: "#86868b", marginTop: 1 }}>No document</div>}
                                  </div>
                                </div>
                                <label style={{ background: currentUrl ? "#f5f5f7" : "#007aff", color: currentUrl ? "#1d1d1f" : "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                                  {uploadingSlot === key ? "Upload…" : currentUrl ? "Replace" : "Upload"}
                                  <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={async (e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    setUploadingSlot(key);
                                    try {
                                      const url = await uploadVehicleAsset(detailVehicle.plate, file, `${key}-${Date.now()}.${file.name.split(".").pop()}`);
                                      setVehicleDocs((prev) => ({ ...prev, [key]: url }));
                                      await updateVehicle(detailVehicle.plate, { [storageKey]: url });
                                    } catch { /* ignore */ }
                                    finally { setUploadingSlot(null); }
                                  }} />
                                </label>
                              </div>
                              {currentUrl && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                                  {!isPdf && <img src={currentUrl} alt={label} style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6 }} />}
                                  {isPdf && <div style={{ background: "#f5f5f7", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#86868b" }}>📄 PDF file</div>}
                                  <a href={currentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#007aff", fontWeight: 600, textDecoration: "none" }}>↗ Open</a>
                                  <a href={currentUrl} download style={{ fontSize: 12, color: "#007aff", fontWeight: 600, textDecoration: "none" }}>↓ Download</a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─ TAB: DÉPENSES ─ */}
                  {detailTab === "depenses" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Expenses · {detailVehicle.plate}</div>
                          <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>
                            Total : {expenses.filter((e) => e.plate === detailVehicle.plate).reduce((s, e) => s + e.amount_aed, 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })} AED
                          </div>
                        </div>
                        <button onClick={() => { setDetailVehicle(null); setExpPlate(detailVehicle.plate); setShowExpense(true); }} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add</button>
                      </div>
                      {expenses.filter((e) => e.plate === detailVehicle.plate).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "#86868b", fontSize: 13 }}>No expenses recorded</div>
                      ) : (
                        expenses.filter((e) => e.plate === detailVehicle.plate).map((e) => (
                          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f7", fontSize: 12, alignItems: "flex-start" }}>
                            <div>
                              <span style={{ color: EXPENSE_COLORS[e.type], fontWeight: 600 }}>{EXPENSE_ICONS[e.type]} {e.type}</span>
                              <span style={{ color: "#86868b", marginLeft: 8 }}>{e.date}</span>
                              {e.description && <div style={{ color: "#86868b", marginTop: 2, fontSize: 11 }}>{e.description}</div>}
                              {e.km && <div style={{ color: "#c7c7cc", fontSize: 10, marginTop: 1 }}>{e.km.toLocaleString("en-GB")} km</div>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, color: EXPENSE_COLORS[e.type] }}>{e.amount_aed.toLocaleString("en-GB", { maximumFractionDigits: 0 })} AED</span>
                              <button onClick={() => handleDeleteExpense(e.id)} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: 13 }}>🗑</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ─ TAB: DEPRECIATION ─ */}
                  {detailTab === "depreciation" && (() => {
                    if (!detailVehicle.purchaseAmount || !detailVehicle.purchaseDate) {
                      return (
                        <div style={{ textAlign: "center", padding: "60px 20px", color: "#86868b" }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Purchase data missing</div>
                          <div style={{ fontSize: 12 }}>Add purchase price and date to see depreciation details.</div>
                        </div>
                      );
                    }
                    const dep = computeDepreciation(detailVehicle.purchaseAmount, detailVehicle.purchaseDate, undefined, detailVehicle.depMonthlyOverride);
                    const barPct = Math.min(dep.depreciationPct, 100);
                    const remaining = DEPRECIATION_MONTHS - dep.monthsElapsed;
                    const standardMonthly = (detailVehicle.purchaseAmount * 0.70) / 36;
                    return (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>Depreciation · {detailVehicle.plate}</span>
                          {dep.isOverridden && (
                            <span style={{ fontSize: 9, fontWeight: 700, background: "#fff3e0", color: "#ff9500", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,149,0,0.2)" }}>OVERRIDE</span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b" }}>DEPRECIATION PROGRESS</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: dep.fullyDepreciated ? "#ff9500" : "#007aff" }}>
                              {barPct}% — {dep.fullyDepreciated ? "Fully depreciated" : `${remaining} month${remaining > 1 ? "s" : ""} remaining`}
                            </span>
                          </div>
                          <div style={{ height: 10, background: "#e5e5ea", borderRadius: 5, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barPct}%`, background: dep.fullyDepreciated ? "#ff9500" : "linear-gradient(90deg, #007aff, #5ac8fa)", borderRadius: 5, transition: "width 0.5s ease" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#86868b" }}>
                            <span>0%</span>
                            <span>70% (max depreciable)</span>
                          </div>
                        </div>

                        {/* Grid 2x3 */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Purchase Price</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{formatAED(dep.purchasePrice)}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>AED</div>
                          </div>
                          <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Purchase Date</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{new Date(dep.purchaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{dep.monthsElapsed} month{dep.monthsElapsed > 1 ? "s" : ""} ago</div>
                          </div>
                          <div style={{ background: dep.isOverridden ? "linear-gradient(135deg, #fff3e0, #fff8e1)" : "#f5f5f7", borderRadius: 12, padding: 14, border: dep.isOverridden ? "1px solid rgba(255,149,0,0.2)" : "none" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: dep.isOverridden ? "#ff9500" : "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Monthly Depreciation {dep.isOverridden ? "(override)" : ""}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#ff9500" }}>{formatAED(dep.monthlyDepreciation)}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{dep.isOverridden ? `Standard: ${formatAED(standardMonthly)}` : "AED / month"}</div>
                          </div>
                          <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Accumulated Depreciation</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#ff3b30" }}>{formatAED(dep.accumulatedDepreciation)}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>AED ({barPct}% of depreciable)</div>
                          </div>
                          <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Net Asset Value</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{formatAED(dep.netAssetValue)}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>AED (book value)</div>
                          </div>
                          <div style={{ background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)", borderRadius: 12, padding: 14, border: "1px solid rgba(52,199,89,0.2)" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#34c759", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Estimated Selling Price</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#34c759" }}>{formatAED(dep.sellingPrice)}</div>
                            <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>AED (NAV +10% +5% VAT)</div>
                          </div>
                        </div>

                        {/* Monthly Override Editor */}
                        <div style={{ marginTop: 16, background: "#f5f5f7", borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>Monthly Override (AED)</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="number"
                              placeholder={formatAED(standardMonthly)}
                              defaultValue={detailVehicle.depMonthlyOverride ?? ""}
                              id="dep-override-input"
                              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff" }}
                            />
                            <button
                              onClick={async () => {
                                const input = document.getElementById("dep-override-input") as HTMLInputElement;
                                const val = input.value.trim();
                                const numVal = val ? parseFloat(val) : null;
                                await updateVehicle(detailVehicle.plate, { dep_monthly_override: numVal });
                                detailVehicle.depMonthlyOverride = numVal;
                                setDetailVehicle({ ...detailVehicle });
                                if (onVehicleCreated) onVehicleCreated();
                              }}
                              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#007aff", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                            >
                              Save
                            </button>
                            {detailVehicle.depMonthlyOverride != null && (
                              <button
                                onClick={async () => {
                                  await updateVehicle(detailVehicle.plate, { dep_monthly_override: null });
                                  detailVehicle.depMonthlyOverride = null;
                                  setDetailVehicle({ ...detailVehicle });
                                  if (onVehicleCreated) onVehicleCreated();
                                  const input = document.getElementById("dep-override-input") as HTMLInputElement;
                                  if (input) input.value = "";
                                }}
                                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e5ea", background: "#fff", color: "#ff3b30", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#86868b", marginTop: 6 }}>
                            {dep.isOverridden
                              ? "Override active — all calculations use this amount instead of the standard formula."
                              : "Leave empty to use the standard calculation (purchase price × 70% ÷ 36 months)."}
                          </div>
                        </div>

                        {/* Breakdown footer */}
                        <div style={{ marginTop: 16, background: "#fafafa", borderRadius: 10, padding: 12, fontSize: 11, color: "#86868b" }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, color: "#1d1d1f" }}>Calculation breakdown</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span>Residual value {dep.isOverridden ? "(adjusted)" : "(30%)"}</span><span style={{ fontWeight: 600 }}>{formatAED(dep.residualValue)} AED</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span>Depreciable amount {dep.isOverridden ? "(adjusted)" : "(70%)"}</span><span style={{ fontWeight: 600 }}>{formatAED(dep.depreciableAmount)} AED</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span>Depreciation period</span><span style={{ fontWeight: 600 }}>36 months</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Selling price formula</span><span style={{ fontWeight: 600 }}>NAV × 1.10 × 1.05</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL: NEW VEHICLE ── */}
          {showNewVehicle && (() => {
            const nvFilteredModels = nvMakeId !== "" ? nvModels.filter((m) => m.make_id === nvMakeId) : nvModels;
            const nvCanCreate = !nvSaving && nvPlate.trim() !== "" && nvMakeId !== "" && nvModelId !== "" && nvLocationId !== "";
            const handleCreateVehicle = async () => {
              if (!nvCanCreate) return;
              setNvSaving(true); setNvError(null);
              try {
                await createVehicle({
                  plate: nvPlate.trim().toUpperCase(),
                  makes_id: nvMakeId as number,
                  models_id: nvModelId as number,
                  location_id: nvLocationId as number,
                  year: parseInt(nvYear, 10),
                  fuel: nvFuel,
                  trim: nvTrim || null,
                  ext_color: nvExtColor || null,
                  int_color: nvIntColor || null,
                  km: nvKm ? parseInt(nvKm, 10) : null,
                  service_interval: parseInt(nvServiceInterval, 10) || 10000,
                  last_service_km: nvLastServiceKm ? parseInt(nvLastServiceKm, 10) : 0,
                  insurance: nvInsurance || null,
                  insurance_due: nvInsuranceDue || null,
                  lease_end: nvLeaseEnd || null,
                  end_of_loan: nvEndOfLoan || null,
                  purchase_amount: nvPurchaseAmount ? parseFloat(nvPurchaseAmount) : null,
                  purchase_date: nvPurchaseDate || null,
                  status: "active",
                } as VehicleCreateInput);
                setShowNewVehicle(false);
                setNvPlate(""); setNvMakeId(""); setNvModelId(""); setNvLocationId("");
                setNvYear(new Date().getFullYear().toString()); setNvTrim("");
                setNvFuel("Petrol"); setNvExtColor("Black"); setNvIntColor("Black");
                setNvKm(""); setNvServiceInterval("10000"); setNvLastServiceKm("");
                setNvInsurance(""); setNvInsuranceDue(""); setNvLeaseEnd(""); setNvEndOfLoan("");
                if (onVehicleCreated) onVehicleCreated();
              } catch (e) { setNvError(e instanceof Error ? e.message : "Creation error"); }
              finally { setNvSaving(false); }
            };
            return (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowNewVehicle(false)}>
                <div style={{ background: "#fff", borderRadius: 20, width: "min(820px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)" }} onClick={(e) => e.stopPropagation()}>

                  {/* ── Header ── */}
                  <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid #f0f0f5", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1d1d1f", letterSpacing: "-0.3px" }}>New Vehicle</div>
                      <div style={{ fontSize: 13, color: "#86868b", marginTop: 3 }}>Fields marked * are required</div>
                    </div>
                    <button onClick={() => { setShowNewVehicle(false); setNvError(null); }} style={{ background: "#f5f5f7", border: "none", borderRadius: 50, width: 34, height: 34, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit" }}>✕</button>
                  </div>

                  {/* ── Body ── */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
                    {nvRefLoading ? (
                      <div style={{ textAlign: "center", padding: 48, color: "#86868b", fontSize: 13 }}>Loading data...</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                        {/* Section: Identification */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff", textTransform: "uppercase" as const, letterSpacing: "0.7px", whiteSpace: "nowrap" as const }}>Identification</span>
                            <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Plate *</label>
                              <input value={nvPlate} onChange={(e) => setNvPlate(e.target.value)} placeholder="ex: L98573" style={{ ...inputStyle, textTransform: "uppercase" as const, fontWeight: 700, letterSpacing: "1px", fontSize: 15 }} />
                            </div>
                            <div>
                              <label style={labelStyle}>Make *</label>
                              <CustomSelect value={nvMakeId} onChange={(v) => { setNvMakeId(Number(v) || ""); setNvModelId(""); }} placeholder="Select..." searchPlaceholder="Make..." options={nvMakes.map((mk) => ({ value: mk.id, label: mk.name }))} />
                            </div>
                            <div>
                              <label style={labelStyle}>Model *</label>
                              <CustomSelect value={nvModelId} onChange={(v) => setNvModelId(Number(v) || "")} disabled={nvMakeId === ""} placeholder="Select..." searchPlaceholder="Model..." options={nvFilteredModels.map((mo) => ({ value: mo.id, label: mo.name }))} />
                            </div>
                            <div>
                              <label style={labelStyle}>Year *</label>
                              <input type="number" value={nvYear} onChange={(e) => setNvYear(e.target.value)} placeholder="2024" style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Trim</label>
                              <input value={nvTrim} onChange={(e) => setNvTrim(e.target.value)} placeholder="Ex: AMG Line, S680, Executive…" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Fuel *</label>
                              <CustomSelect value={nvFuel} onChange={(v) => setNvFuel(String(v))} options={["Petrol", "Diesel", "Electric", "Hybrid"].map((f) => ({ value: f, label: f }))} />
                            </div>
                            <div>
                              <label style={labelStyle}>Location *</label>
                              <CustomSelect value={nvLocationId} onChange={(v) => setNvLocationId(Number(v) || "")} placeholder="Select..." options={nvLocations.map((loc) => ({ value: loc.id, label: loc.name, sublabel: loc.full_name && loc.full_name !== loc.name ? loc.full_name : undefined }))} />
                            </div>
                          </div>
                        </div>

                        {/* Section: Aspect */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff", textTransform: "uppercase" as const, letterSpacing: "0.7px", whiteSpace: "nowrap" as const }}>Aspect</span>
                            <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                            <div>
                              <label style={labelStyle}>Exterior color</label>
                              <input value={nvExtColor} onChange={(e) => setNvExtColor(e.target.value)} placeholder="Black" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Interior color</label>
                              <input value={nvIntColor} onChange={(e) => setNvIntColor(e.target.value)} placeholder="Beige" style={inputStyle} />
                            </div>
                          </div>
                        </div>

                        {/* Section: Entretien */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff", textTransform: "uppercase" as const, letterSpacing: "0.7px", whiteSpace: "nowrap" as const }}>Maintenance</span>
                            <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                            <div>
                              <label style={labelStyle}>Current mileage</label>
                              <input type="number" value={nvKm} onChange={(e) => setNvKm(e.target.value)} placeholder="0" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Service interval (km)</label>
                              <input type="number" value={nvServiceInterval} onChange={(e) => setNvServiceInterval(e.target.value)} placeholder="10 000" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Last service (km)</label>
                              <input type="number" value={nvLastServiceKm} onChange={(e) => setNvLastServiceKm(e.target.value)} placeholder="0" style={inputStyle} />
                            </div>
                          </div>
                        </div>

                        {/* Section: Purchase */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff", textTransform: "uppercase" as const, letterSpacing: "0.7px", whiteSpace: "nowrap" as const }}>Purchase</span>
                            <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <div>
                              <label style={labelStyle}>Purchase price (AED)</label>
                              <input type="number" value={nvPurchaseAmount} onChange={(e) => setNvPurchaseAmount(e.target.value)} placeholder="ex: 532381" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Purchase date</label>
                              <input type="date" value={nvPurchaseDate} onChange={(e) => setNvPurchaseDate(e.target.value)} style={inputStyle} />
                            </div>
                          </div>
                        </div>

                        {/* Section: Contrat & Assurance */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff", textTransform: "uppercase" as const, letterSpacing: "0.7px", whiteSpace: "nowrap" as const }}>Contract & Insurance</span>
                            <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Insurer</label>
                              <input value={nvInsurance} onChange={(e) => setNvInsurance(e.target.value)} placeholder="Al Ain Ahlia, The Oriental Insurance…" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Insurance due</label>
                              <input type="date" value={nvInsuranceDue} onChange={(e) => setNvInsuranceDue(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Lease end</label>
                              <input type="date" value={nvLeaseEnd} onChange={(e) => setNvLeaseEnd(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Loan end</label>
                              <input type="date" value={nvEndOfLoan} onChange={(e) => setNvEndOfLoan(e.target.value)} style={inputStyle} />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* ── Footer ── */}
                  <div style={{ padding: "20px 32px", borderTop: "1px solid #f0f0f5", display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    {nvError ? (
                      <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", flex: 1 }}>{nvError}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#86868b" }}>
                        {nvPlate && nvMakeId && nvModelId && nvLocationId ? "✓ Ready to create" : "Fill in required fields *"}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => { setShowNewVehicle(false); setNvError(null); }} style={{ background: "#f5f5f7", color: "#1d1d1f", border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      <button disabled={!nvCanCreate} onClick={handleCreateVehicle} style={{ background: nvCanCreate ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 12, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: nvCanCreate ? "pointer" : "not-allowed", fontFamily: "inherit", minWidth: 160 }}>
                        {nvSaving ? "Saving..." : "Create vehicle"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* ── MODAL: INDISPONIBILITÉ ── */}
          {showUnavail && (() => {
            const sortedVehicles = [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate));
            const filteredUnavVehicles = unavVehicleSearch
              ? sortedVehicles.filter(v =>
                  v.plate.toLowerCase().includes(unavVehicleSearch.toLowerCase()) ||
                  v.model.toLowerCase().includes(unavVehicleSearch.toLowerCase())
                )
              : sortedVehicles;
            const selectedVehicle = vehicles.find(v => v.plate === unavPlate);
            return (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
                onClick={() => { setShowUnavail(false); setUnavVehicleOpen(false); setUnavVehicleSearch(""); setEditingUnavailId(null); }}>
                <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>{editingUnavailId != null ? "Edit unavailability" : "Report unavailability"}</div>
                      <div style={{ fontSize: 12, color: "#86868b", marginTop: 2 }}>{editingUnavailId != null ? "Extend or adjust dates and reason" : "Vehicle will be marked unavailable for the period"}</div>
                    </div>
                    <button onClick={() => { setShowUnavail(false); setUnavVehicleOpen(false); setUnavVehicleSearch(""); setEditingUnavailId(null); }}
                      style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#86868b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Vehicle picker */}
                    <div>
                      <label style={labelStyle}>Vehicle *</label>
                      <div style={{ position: "relative" }}>
                        {/* Trigger button */}
                        <button type="button" onClick={() => { setUnavVehicleOpen(!unavVehicleOpen); setUnavVehicleSearch(""); }}
                          style={{ width: "100%", background: "#f5f5f7", border: unavVehicleOpen ? "1.5px solid #007aff" : "1.5px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, boxSizing: "border-box" as const, transition: "border-color 0.15s" }}>
                          {selectedVehicle ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: selectedVehicle.location === "Office" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)", color: selectedVehicle.location === "Office" ? "#007aff" : "#ff9500", flexShrink: 0 }}>{selectedVehicle.plate}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedVehicle.model}</span>
                            </div>
                          ) : (
                            <span style={{ color: "#86868b", fontSize: 13 }}>Select a vehicle...</span>
                          )}
                          <span style={{ color: "#86868b", fontSize: 9, flexShrink: 0, transform: unavVehicleOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
                        </button>

                        {/* Dropdown */}
                        {unavVehicleOpen && (
                          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", zIndex: 20, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                            {/* Search */}
                            <div style={{ padding: "10px 10px 8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f7", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ fontSize: 13, color: "#86868b" }}>🔍</span>
                                <input autoFocus value={unavVehicleSearch} onChange={e => setUnavVehicleSearch(e.target.value)}
                                  placeholder="Plate or model..."
                                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, fontFamily: "inherit", color: "#1d1d1f" }} />
                                {unavVehicleSearch && (
                                  <button onClick={() => setUnavVehicleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#86868b", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                                )}
                              </div>
                            </div>
                            {/* Count */}
                            <div style={{ padding: "0 14px 6px", fontSize: 10, color: "#86868b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              {filteredUnavVehicles.length} {filteredUnavVehicles.length !== 1 ? "vehicles" : "vehicle"}
                            </div>
                            {/* List */}
                            <div style={{ maxHeight: 240, overflowY: "auto", paddingBottom: 6 }}>
                              {filteredUnavVehicles.length === 0 ? (
                                <div style={{ padding: "20px 14px", fontSize: 12, color: "#86868b", textAlign: "center" }}>No results</div>
                              ) : filteredUnavVehicles.map((v) => (
                                <button key={v.plate} type="button"
                                  onClick={() => { setUnavPlate(v.plate); setUnavVehicleOpen(false); setUnavVehicleSearch(""); }}
                                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", background: unavPlate === v.plate ? "rgba(0,122,255,0.06)" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                                  onMouseEnter={e => { if (unavPlate !== v.plate) (e.currentTarget as HTMLElement).style.background = "#f5f5f7"; }}
                                  onMouseLeave={e => { if (unavPlate !== v.plate) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: v.location === "Office" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)", color: v.location === "Office" ? "#007aff" : "#ff9500", flexShrink: 0, whiteSpace: "nowrap" }}>{v.plate}</span>
                                  <span style={{ fontSize: 12, color: "#1d1d1f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.model}</span>
                                  <span style={{ fontSize: 10, color: "#86868b", flexShrink: 0, whiteSpace: "nowrap" }}>{v.location === "Office" ? "Office" : (v.locationName ?? "Lease")}</span>
                                  {unavPlate === v.plate && <span style={{ color: "#007aff", fontSize: 12, flexShrink: 0 }}>✓</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Start date *</label>
                        <input type="date" value={unavStart} onChange={(e) => setUnavStart(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>End date</label>
                        <input type="date" value={unavEnd} onChange={(e) => setUnavEnd(e.target.value)} style={inputStyle} />
                      </div>
                    </div>

                    {/* Raison */}
                    <div>
                      <label style={labelStyle}>Reason</label>
                      {unavailReasons.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                          {unavailReasons.map(r => (
                            <button key={r.id} type="button" onClick={() => setUnavReason(unavReason === r.label ? "" : r.label)}
                              style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s", border: unavReason === r.label ? "1.5px solid #1d1d1f" : "1.5px solid #e5e5e5", background: unavReason === r.label ? "#1d1d1f" : "#fff", color: unavReason === r.label ? "#fff" : "#1d1d1f" }}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input value={unavReason} onChange={(e) => setUnavReason(e.target.value)} placeholder="Accident, service, claim..." style={inputStyle} />
                      )}
                      {/* Custom override if none match */}
                      {unavailReasons.length > 0 && !unavailReasons.find(r => r.label === unavReason) && unavReason !== "" && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#86868b" }}>Custom reason : <strong>{unavReason}</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                    <button onClick={() => { setShowUnavail(false); setUnavVehicleOpen(false); setUnavVehicleSearch(""); setEditingUnavailId(null); }}
                      style={{ background: "#f5f5f7", color: "#1d1d1f", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button disabled={unavSaving || !unavPlate || !unavStart} onClick={handleSaveUnavail}
                      style={{ background: !unavPlate || !unavStart ? "#d1d1d6" : editingUnavailId != null ? "#007aff" : "#ff3b30", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
                      {unavSaving ? "Saving..." : editingUnavailId != null ? "Save" : "Report"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── MODAL: SELL VEHICLE ── */}
          {showSaleModal && saleVehicle && (() => {
            const dep = saleVehicle.purchaseAmount && saleVehicle.purchaseDate
              ? computeDepreciation(saleVehicle.purchaseAmount, saleVehicle.purchaseDate)
              : null;
            const handleSell = async () => {
              if (!salePrice || saleSaving) return;
              setSaleSaving(true);
              try {
                await updateVehicle(saleVehicle.plate, {
                  status: "sold",
                  sold_date: saleDate || null,
                  sold_price: parseFloat(salePrice),
                  sold_to: saleTo || null,
                });
                onVehicleCreated?.();
                setShowSaleModal(false);
                setSaleVehicle(null);
                setSalePrice(""); setSaleTo(""); setSaleDate(new Date().toISOString().slice(0, 10));
              } catch (e: unknown) {
                alert((e as Error).message);
              } finally { setSaleSaving(false); }
            };
            const gainLoss = dep && salePrice ? parseFloat(salePrice) - dep.netAssetValue : null;
            return (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowSaleModal(false)}>
                <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Sell Vehicle</div>
                  <div style={{ fontSize: 13, color: "#86868b", marginBottom: 20 }}>{saleVehicle.plate} — {saleVehicle.make} {saleVehicle.model}</div>

                  {dep && (
                    <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14, marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      <div><span style={{ color: "#86868b" }}>Net Asset Value</span><div style={{ fontWeight: 700, marginTop: 2 }}>{formatAED(dep.netAssetValue)} AED</div></div>
                      <div><span style={{ color: "#86868b" }}>Suggested Price</span><div style={{ fontWeight: 700, color: "#34c759", marginTop: 2 }}>{formatAED(dep.sellingPrice)} AED</div></div>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#86868b", display: "block", marginBottom: 4 }}>Sale Price (AED) *</label>
                      <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder={dep ? String(Math.round(dep.sellingPrice)) : "Sale price"} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e5ea", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#86868b", display: "block", marginBottom: 4 }}>Sale Date</label>
                        <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e5ea", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#86868b", display: "block", marginBottom: 4 }}>Buyer</label>
                        <input value={saleTo} onChange={(e) => setSaleTo(e.target.value)} placeholder="Optional" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e5ea", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                    </div>
                  </div>

                  {gainLoss !== null && salePrice && (
                    <div style={{ background: gainLoss >= 0 ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <span style={{ color: "#86868b" }}>{gainLoss >= 0 ? "Capital Gain" : "Capital Loss"}</span>
                      <span style={{ fontWeight: 700, color: gainLoss >= 0 ? "#34c759" : "#ff3b30" }}>{gainLoss >= 0 ? "+" : ""}{formatAED(gainLoss)} AED</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowSaleModal(false)} style={{ background: "#f5f5f7", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={handleSell} disabled={!salePrice || saleSaving} style={{ background: !salePrice ? "#c7c7cc" : "#ff9500", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: !salePrice ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saleSaving ? 0.6 : 1 }}>
                      {saleSaving ? "Saving…" : "Confirm Sale"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── MODAL: EXPENSE ── */}
          {showExpense && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowExpense(false)}>
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>New Expense</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Vehicle *</label>
                      <CustomSelect value={expPlate} onChange={(v) => setExpPlate(String(v))} placeholder="Select..." searchPlaceholder="Plate..." options={vehicles.map((v) => ({ value: v.plate, label: v.plate }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date *</label>
                      <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Type *</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {EXPENSE_TYPES.map((t) => (
                        <button key={t} onClick={() => setExpType(t)} style={{ background: expType === t ? EXPENSE_COLORS[t] : "#f5f5f7", color: expType === t ? "#fff" : "#86868b", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {EXPENSE_ICONS[t]} {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Amount (AED) *</label>
                      <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Mileage</label>
                      <input type="number" value={expKm} onChange={(e) => setExpKm(e.target.value)} placeholder="Odometer km" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Oil change, tires, full fuel..." style={inputStyle} />
                  </div>
                </div>
                {expError && <div style={{ marginTop: 10, background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30" }}>{expError}</div>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => { setShowExpense(false); setExpError(null); }} style={{ background: "#f5f5f7", color: "#1d1d1f", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button disabled={expSaving || !expPlate || !expAmount} onClick={handleSaveExpense} style={{ background: !expPlate || !expAmount ? "#d1d1d6" : "#34c759", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {expSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── CHECK-IN FORM ───────────────────────────────────────────────────────────
function CheckInForm({ onConfirm, loggedDriver, vehicles }: { onConfirm: (e: Any) => void; loggedDriver: { id: string; name: string }; vehicles: FleetVehicle[] }) {
  const [plate, setPlate] = useState("");
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("Full");
  const [location, setLoc] = useState("");
  const [hasProblem, setProb] = useState(false);
  const [probCat, setProbCat] = useState("");
  const [probNote, setProbNote] = useState("");
  const [probPhoto, setPhoto] = useState<string | null>(null);
  const [kmAlert, setKmAlert] = useState<{ prev: number; current: number; diff: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const availableFleet = vehicles.filter((v) => v.location === "Office" && !CHECKIN_STORE[v.plate])
    .sort((a, b) => a.plate.localeCompare(b.plate));

  const checkKm = (val: string, p: string) => {
    const prev = KM_HISTORY[p];
    if (prev && val && parseInt(val, 10) - prev > 10) {
      setKmAlert({ prev, current: parseInt(val, 10), diff: parseInt(val, 10) - prev });
    } else {
      setKmAlert(null);
    }
  };
  const handlePlate = (p: string) => { setPlate(p); setKm(""); setKmAlert(null); };
  const handleKm = (val: string) => { setKm(val); checkKm(val, plate); };
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };
  const isValid = plate && km && location;
  const handleSubmit = () => {
    if (!isValid) return;
    const entry = {
      driverName: loggedDriver.name,
      driverId: loggedDriver.id,
      vehiclePlate: plate,
      kmStart: parseInt(km, 10),
      fuelStart: fuel,
      locationStart: location,
      startTime: new Date().toISOString(),
      problem: hasProblem ? { cat: probCat, note: probNote, photo: probPhoto } : null,
      kmAlert,
    };
    CHECKIN_STORE[plate] = entry;
    setSubmitted(true);
    setTimeout(() => onConfirm(entry), 1200);
  };

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(52,199,89,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#34c759" }}>Check-In confirmed!</div>
        <div style={{ fontSize: 13, color: "#86868b" }}>Loading dashboard...</div>
      </div>
    );
  }

  const extColors: Record<string, string> = { Black: "#1d1d1f", White: "#e8e8e8", Blue: "#007aff", Beige: "#c8b89a", Brown: "#8b5e3c" };
  const v = plate ? vehicles.find((f) => f.plate === plate) : null;
  return (
    <div>
      <Sec mt={0}>New Check-In</Sec>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>👤 Driver</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f5f5f7", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1d1d1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{loggedDriver.name[0]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{loggedDriver.name}</div>
            <div style={{ fontSize: 11, color: "#86868b", marginTop: 1 }}>Connected · Active session</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, background: "rgba(52,199,89,0.12)", color: "#34c759", padding: "3px 9px", borderRadius: 6, flexShrink: 0 }}>● Online</div>
        </div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🚘 Vehicle</div>
        <CustomSelect value={plate} onChange={(v) => handlePlate(String(v))} placeholder="Select a vehicle..." searchPlaceholder="Plate or model..." countLabel={`vehicle${availableFleet.length !== 1 ? "s" : ""}`} style={{ marginBottom: plate ? 12 : 0 }} triggerStyle={{ padding: "12px 14px", fontSize: 14 }} options={availableFleet.map((v) => ({ value: v.plate, label: `${v.model} · ${v.extColor}`, badge: v.plate, badgeBg: "rgba(0,122,255,0.1)", badgeColor: "#007aff" }))} />
        {plate && v && (
          <div style={{ background: "#f5f5f7", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: extColors[v.extColor] || "#d1d1d6", border: "2px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{v.make} {v.model}</div>
              <div style={{ fontSize: 10, color: "#86868b" }}>{v.year} · {v.fuel === "Electric" ? "⚡ Electric" : "⛽ " + v.fuel}</div>
            </div>
          </div>
        )}
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📍 Mileage & Fuel</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Current mileage</div>
          <input type="number" value={km} onChange={(e) => handleKm(e.target.value)} placeholder="Ex: 84500" style={{ width: "100%", background: "#f5f5f7", border: kmAlert ? "2px solid #ff9500" : "2px solid transparent", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, fontFamily: "monospace", outline: "none", boxSizing: "border-box", color: "#1d1d1f" }} />
          {kmAlert && (
            <div style={{ marginTop: 8, background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ff9500" }}>Mileage discrepancy detected</div>
                <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>Last check-out: {kmAlert.prev.toLocaleString("en-GB")} km → Now: {kmAlert.current.toLocaleString("en-GB")} km</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ff3b30", marginTop: 2 }}>+{kmAlert.diff} unexplained km · An alert will be sent to the manager</div>
              </div>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Fuel level</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {FUEL_LEVELS.map((f) => (
              <button key={f} onClick={() => setFuel(f)} style={{ background: fuel === f ? "#1d1d1f" : "#f5f5f7", color: fuel === f ? "#fff" : "#1d1d1f", border: "none", borderRadius: 10, padding: "10px 4px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{f}</button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><FuelBar level={fuel} /></div>
        </div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📍 Start location</div>
        <input type="text" value={location} onChange={(e) => setLoc(e.target.value)} placeholder="Ex: Office CHABE · DIFC · Four Seasons…" style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1d1d1f" }} />
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasProblem ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>⚠️ Report a problem</div>
          <button onClick={() => setProb(!hasProblem)} style={{ background: hasProblem ? "rgba(255,59,48,0.1)" : "#f5f5f7", color: hasProblem ? "#ff3b30" : "#86868b", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{hasProblem ? "Cancel" : "+ Report"}</button>
        </div>
        {hasProblem && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
              {PROBLEM_CATS.map((c) => (
                <button key={c.id} onClick={() => setProbCat(c.id)} style={{ background: probCat === c.id ? "#1d1d1f" : "#f5f5f7", color: probCat === c.id ? "#fff" : "#1d1d1f", border: "none", borderRadius: 10, padding: "10px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <span style={{ fontSize: 10 }}>{c.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</div>
              <textarea value={probNote} onChange={(e) => setProbNote(e.target.value)} placeholder="Describe the problem..." style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", height: 80, boxSizing: "border-box", color: "#1d1d1f" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Photo (optional)</div>
              {probPhoto ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={probPhoto} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  <button type="button" onClick={() => setPhoto(null)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f7", border: "1px dashed #d1d1d6", borderRadius: 10, padding: "10px 14px", cursor: "pointer", width: "fit-content" }}>
                  <span>📷</span>
                  <span style={{ fontSize: 12, color: "#86868b", fontWeight: 500 }}>Add a photo</span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                </label>
              )}
            </div>
          </div>
        )}
      </Card>
      <button type="button" onClick={handleSubmit} disabled={!isValid} style={{ width: "100%", background: isValid ? "#1d1d1f" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 16, padding: "18px", fontSize: 16, fontWeight: 800, cursor: isValid ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: "-0.3px", transition: "all 0.2s", boxShadow: isValid ? "0 4px 20px rgba(0,0,0,0.2)" : "none" }}>
        ✓ Confirm Check-In
      </button>
    </div>
  );
}

// ── CHECK-OUT FORM ───────────────────────────────────────────────────────────
function CheckOutForm({ session, onConfirm, vehicles }: { session: Any; onConfirm: (e: Any) => void; vehicles: FleetVehicle[] }) {
  const [kmEnd, setKmEnd] = useState("");
  const [fuel, setFuel] = useState("Full");
  const [location, setLoc] = useState("");
  const [hasProblem, setProb] = useState(false);
  const [probCat, setProbCat] = useState("");
  const [probNote, setProbNote] = useState("");
  const [probPhoto, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const v = vehicles.find((f) => f.plate === session.vehiclePlate);
  const startTime = new Date(session.startTime);
  const now = new Date();
  const durationMin = Math.round((now.getTime() - startTime.getTime()) / 60000);
  const durationStr = durationMin < 60 ? `${durationMin} min` : `${Math.floor(durationMin / 60)}h${String(durationMin % 60).padStart(2, "0")}`;
  const kmDiff = kmEnd && parseInt(kmEnd, 10) > session.kmStart ? parseInt(kmEnd, 10) - session.kmStart : null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };
  const isValid = kmEnd && location && parseInt(kmEnd, 10) >= session.kmStart;
  const handleSubmit = () => {
    if (!isValid) return;
    KM_HISTORY[session.vehiclePlate] = parseInt(kmEnd, 10);
    delete CHECKIN_STORE[session.vehiclePlate];
    setSubmitted(true);
    setTimeout(() => onConfirm({ ...session, kmEnd: parseInt(kmEnd, 10), fuelEnd: fuel, locationEnd: location, endTime: new Date().toISOString(), kmDiff, problem: hasProblem ? { cat: probCat, note: probNote, photo: probPhoto } : null }), 1200);
  };

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(52,199,89,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#34c759" }}>Check-Out confirmed!</div>
        <div style={{ fontSize: 13, color: "#86868b" }}>Duration: {durationStr} · {kmDiff ? `+${kmDiff.toLocaleString("en-GB")} km` : ""}</div>
      </div>
    );
  }

  const colorDot: Record<string, string> = { Black: "#1d1d1f", White: "#e8e8e8", Blue: "#007aff", Beige: "#c8b89a", Brown: "#8b5e3c" };
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#1d1d1f,#3a3a3c)", borderRadius: 20, padding: "24px", marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Session in progress</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDot[v?.extColor ?? ""] || "#555", border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{v?.model ?? session.vehiclePlate}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{session.vehiclePlate} · {v?.make} · {v?.year}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[{ label: "Driver", value: session.driverName }, { label: "Departure", value: startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }, { label: "Duration", value: durationStr }].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Start km</div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{session.kmStart.toLocaleString("en-GB")} km</div></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Start fuel</div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{session.fuelStart}</div></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Start location</div><div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.locationStart}</div></div>
        </div>
      </div>
      <Sec mt={0}>Check-Out — Final Information</Sec>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📍 Final mileage</div>
        <input type="number" value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} placeholder={`Min. ${session.kmStart.toLocaleString("en-GB")} km`} style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, fontFamily: "monospace", outline: "none", boxSizing: "border-box", color: "#1d1d1f" }} />
        {kmDiff != null && (
          <div style={{ marginTop: 8, background: "rgba(52,199,89,0.08)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#86868b" }}>Distance traveled</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#34c759" }}>+{kmDiff.toLocaleString("en-GB")} km</span>
          </div>
        )}
        {kmEnd && parseInt(kmEnd, 10) < session.kmStart && (
          <div style={{ marginTop: 8, background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 12, color: "#ff3b30", fontWeight: 600 }}>⛔ Final mileage cannot be lower than start</span>
          </div>
        )}
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⛽ Final fuel level</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
          {FUEL_LEVELS.map((f) => (
            <button key={f} type="button" onClick={() => setFuel(f)} style={{ background: fuel === f ? "#1d1d1f" : "#f5f5f7", color: fuel === f ? "#fff" : "#1d1d1f", border: "none", borderRadius: 10, padding: "10px 4px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{f}</button>
          ))}
        </div>
        <FuelBar level={fuel} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📍 Final location</div>
        <input type="text" value={location} onChange={(e) => setLoc(e.target.value)} placeholder="E.g.: CHABE Office · Hotel · Airport..." style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#1d1d1f" }} />
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasProblem ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>⚠️ Report a problem</div>
          <button type="button" onClick={() => setProb(!hasProblem)} style={{ background: hasProblem ? "rgba(255,59,48,0.1)" : "#f5f5f7", color: hasProblem ? "#ff3b30" : "#86868b", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{hasProblem ? "Cancel" : "+ Report"}</button>
        </div>
        {hasProblem && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
              {PROBLEM_CATS.map((c) => (
                <button key={c.id} type="button" onClick={() => setProbCat(c.id)} style={{ background: probCat === c.id ? "#1d1d1f" : "#f5f5f7", color: probCat === c.id ? "#fff" : "#1d1d1f", border: "none", borderRadius: 10, padding: "10px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <span style={{ fontSize: 10 }}>{c.label}</span>
                </button>
              ))}
            </div>
            <textarea value={probNote} onChange={(e) => setProbNote(e.target.value)} placeholder="Describe the problem..." style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", height: 80, boxSizing: "border-box", color: "#1d1d1f", marginBottom: 10 }} />
            {probPhoto ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={probPhoto} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                <button type="button" onClick={() => setPhoto(null)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f7", border: "1px dashed #d1d1d6", borderRadius: 10, padding: "10px 14px", cursor: "pointer", width: "fit-content" }}>
                <span>📷</span>
                <span style={{ fontSize: 12, color: "#86868b", fontWeight: 500 }}>Add a photo</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
              </label>
            )}
          </div>
        )}
      </Card>
      <button type="button" onClick={handleSubmit} disabled={!isValid} style={{ width: "100%", background: isValid ? "#ff3b30" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 16, padding: "18px", fontSize: 16, fontWeight: 800, cursor: isValid ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: "-0.3px", transition: "all 0.2s", boxShadow: isValid ? "0 4px 20px rgba(255,59,48,0.3)" : "none" }}>
        ✓ Confirm Check-Out
      </button>
    </div>
  );
}

// ── MANAGER MONITOR ──────────────────────────────────────────────────────────
function ManagerMonitor({ sessions, kmAlerts, history, vehicles }: { sessions: Any[]; kmAlerts: Any[]; history: Any[]; vehicles: FleetVehicle[] }) {
  const now = new Date();
  const colorDot: Record<string, string> = { Black: "#1d1d1f", White: "#e8e8e8", Blue: "#007aff", Beige: "#c8b89a", Brown: "#8b5e3c" };
  return (
    <div>
      {kmAlerts.length > 0 && (
        <>
          <Sec mt={0}>🚨 Mileage Alerts</Sec>
          {kmAlerts.map((a: Any, i: number) => (
            <div key={i} style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ff3b30" }}>{a.plate} · {a.diff} unexplained km</div>
                <div style={{ fontSize: 11, color: "#86868b", marginTop: 3 }}>Last check-out: {a.prev.toLocaleString("en-GB")} km → Check-in : {a.current.toLocaleString("en-GB")} km</div>
                <div style={{ fontSize: 11, color: "#86868b", marginTop: 1 }}>Driver: {a.driverName}</div>
              </div>
              <div style={{ fontSize: 10, color: "#86868b", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>{a.time}</div>
            </div>
          ))}
        </>
      )}
      <Sec mt={kmAlerts.length > 0 ? 20 : 0}>🟢 Vehicles in circulation</Sec>
      {sessions.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0", color: "#86868b", fontSize: 13 }}>No vehicles currently in circulation</div>
        </Card>
      ) : (
        sessions.map((s: Any) => {
          const durationMin = Math.round((now.getTime() - new Date(s.startTime).getTime()) / 60000);
          const durationStr = durationMin < 60 ? `${durationMin} min` : `${Math.floor(durationMin / 60)}h${String(durationMin % 60).padStart(2, "0")}`;
          const v = vehicles.find((f) => f.plate === s.vehiclePlate);
          return (
            <div key={s.vehiclePlate} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "center", borderLeft: "3px solid #34c759" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: colorDot[v?.extColor ?? ""] || "#555", border: "2px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, background: "#f5f5f7", padding: "2px 7px", borderRadius: 5 }}>{s.vehiclePlate}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#34c759" }}>● In progress</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.driverName}</div>
                <div style={{ fontSize: 10, color: "#86868b", marginTop: 1 }}>{v?.model} · Start: {new Date(s.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {s.kmStart.toLocaleString("en-GB")} km · {s.locationStart}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#007aff" }}>{durationStr}</div>
                <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{FUEL_LEVELS.map((f) => f === s.fuelStart ? <span key={f} style={{ color: "#34c759" }}>{f}</span> : null)}</div>
              </div>
            </div>
          );
        })
      )}
      {history.length > 0 && (
        <>
          <Sec>📋 Today's history</Sec>
          {history.map((h: Any, i: number) => {
            const dur = Math.round((new Date(h.endTime).getTime() - new Date(h.startTime).getTime()) / 60000);
            const durStr = dur < 60 ? `${dur} min` : `${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, "0")}`;
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, background: "#f5f5f7", padding: "2px 6px", borderRadius: 4 }}>{h.vehiclePlate}</span>
                    {h.problem && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,59,48,0.1)", color: "#ff3b30", padding: "2px 6px", borderRadius: 4 }}>⚠️ Problem</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{h.driverName}</div>
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 1 }}>{new Date(h.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} → {new Date(h.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {durStr}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{h.kmDiff ? `+${h.kmDiff.toLocaleString("en-GB")} km` : "—"}</div>
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 1 }}>{h.kmStart?.toLocaleString("en-GB")} → {h.kmEnd?.toLocaleString("en-GB")} km</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── CHECK-IN VIEW (container) ─────────────────────────────────────────────────
function CheckInView({ vehicles, onAlertCreated, onVehicleKmUpdated, readOnly = false }: { vehicles: FleetVehicle[]; onAlertCreated?: () => void; onVehicleKmUpdated?: () => void; readOnly?: boolean }) {
  const [role, setRole] = useState<"manager" | "driver">("manager");
  const [staffDrivers, setStaffDrivers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchStaff().then((all) => {
      const drivers = all
        .filter((s) => s.designation === "LIMO DRIVER")
        .map((s) => ({ id: String(s.id), name: s.name }));
      setStaffDrivers(drivers.length > 0 ? drivers : DRIVERS_LIST);
    }).catch(() => setStaffDrivers(DRIVERS_LIST));
  }, []);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  useEffect(() => {
    if (staffDrivers.length > 0 && !selectedDriverId) setSelectedDriverId(staffDrivers[0].id); // eslint-disable-line react-hooks/set-state-in-effect
  }, [staffDrivers, selectedDriverId]);
  const [activeSessions, setActiveSessions] = useState<Any[]>([]);
  const [history, setHistory] = useState<Any[]>([]);
  const [kmAlerts, setKmAlerts] = useState<Any[]>([]);
  const [mySession, setMySession] = useState<Any>(null);
  const loggedDriver = role === "driver" ? (staffDrivers.find((d) => d.id === selectedDriverId) ?? staffDrivers[0] ?? null) : null;
  const syncSessions = () => setActiveSessions(Object.values(CHECKIN_STORE));

  const handleCheckIn = (entry: Any) => {
    // In-memory (existing logic)
    if (entry.kmAlert) {
      setKmAlerts((prev) => [...prev, { plate: entry.vehiclePlate, prev: entry.kmAlert.prev, current: entry.kmAlert.current, diff: entry.kmAlert.diff, driverName: entry.driverName, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }]);
    }
    if (entry.problem) addProblemReport(entry);
    syncSessions();
    // Generate session_id and persist to Supabase
    const sessionId = `${entry.vehiclePlate}-${Date.now()}`;
    const enrichedEntry = { ...entry, sessionId };
    setMySession(enrichedEntry);
    // Async Supabase persistence (fire-and-forget with error logging)
    (async () => {
      try {
        await createCheckIn({
          session_id: sessionId,
          plate: entry.vehiclePlate,
          driver_name: entry.driverName ?? null,
          driver_id_text: entry.driverId ?? null,
          entry_type: "check_in",
          km: entry.kmStart ?? null,
          fuel: entry.fuelStart ?? null,
          location: entry.locationStart ?? null,
          checked_in_at: entry.startTime ?? new Date().toISOString(),
        } as CheckInInput);
        // Check km discrepancy vs last check-out
        const lastOut = await getLastCheckout(entry.vehiclePlate);
        if (lastOut?.km != null && entry.kmStart != null && lastOut.km !== entry.kmStart) {
          const diff = entry.kmStart - lastOut.km;
          await createAlert({
            plate: entry.vehiclePlate,
            type: "km_discrepancy",
            message: diff < 0
              ? `Km decrease — possible manipulation (${diff} km)`
              : `Undeclared km between check-out and check-in (+${diff} km)`,
            km_prev: lastOut.km,
            km_current: entry.kmStart,
            km_diff: diff,
            driver_name: entry.driverName ?? null,
            read: false,
          } as AlertInput);
          onAlertCreated?.();
        }
      } catch (e) {
        console.error("CheckIn Supabase error:", e);
      }
    })();
  };

  const handleCheckOut = (entry: Any) => {
    // In-memory (existing logic)
    if (entry.problem) addProblemReport(entry);
    setHistory((prev) => [entry, ...prev]);
    syncSessions();
    setMySession(null);
    // Async Supabase persistence
    (async () => {
      try {
        await createCheckIn({
          session_id: mySession?.sessionId ?? `${entry.vehiclePlate}-out-${Date.now()}`,
          plate: entry.vehiclePlate,
          driver_name: entry.driverName ?? null,
          driver_id_text: entry.driverId ?? null,
          entry_type: "check_out",
          km: entry.kmEnd ?? null,
          fuel: entry.fuelEnd ?? null,
          location: entry.locationEnd ?? null,
          checked_in_at: entry.endTime ?? new Date().toISOString(),
        } as CheckInInput);
        // Update vehicle km
        if (entry.kmEnd != null) {
          await updateVehicle(entry.vehiclePlate, { km: entry.kmEnd });
          onVehicleKmUpdated?.();
        }
      } catch (e) {
        console.error("CheckOut Supabase error:", e);
      }
    })();
  };
  const driverHasActive = mySession != null;

  return (
    <div>
      {readOnly && (
        <div style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "#007aff", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          👁 Consultation uniquement — les check-in/check-out sont désactivés
        </div>
      )}
      <div style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: "#ff9500", fontWeight: 600, flexShrink: 0 }}>🎛 Demo mode</div>
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 2, flexShrink: 0 }}>
          {(["manager", "driver"] as const).map((r) => (
            <button key={r} type="button" onClick={() => { setRole(r); setMySession(null); }} style={{ background: role === r ? "#fff" : "transparent", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: role === r ? 700 : 400, color: role === r ? "#1d1d1f" : "#86868b", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", boxShadow: role === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {r === "manager" ? "👔 Manager" : "🚗 Driver"}
            </button>
          ))}
        </div>
        {role === "manager" && (
          <CustomSelect compact value={selectedDriverId} onChange={(v) => setSelectedDriverId(String(v))} placeholder="— Simulate driver login —" options={[{ value: "", label: "— None —" }, ...staffDrivers.map((d) => ({ value: d.id, label: d.name }))]} triggerStyle={{ background: "#fff", border: "1px solid #e5e5e5", width: "auto", minWidth: 200 }} />
        )}
      </div>
      {role === "manager" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Check-In Monitor</div>
              <div style={{ fontSize: 12, color: "#86868b", marginTop: 2 }}>Real-time tracking · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#86868b", fontWeight: 600, textTransform: "uppercase" }}>Active</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#34c759" }}>{activeSessions.length}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#86868b", fontWeight: 600, textTransform: "uppercase" }}>Alerts</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: kmAlerts.length > 0 ? "#ff3b30" : "#34c759" }}>{kmAlerts.length}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#86868b", fontWeight: 600, textTransform: "uppercase" }}>Completed</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{history.length}</div>
              </div>
            </div>
          </div>
          <ManagerMonitor sessions={activeSessions} kmAlerts={kmAlerts} history={history} vehicles={vehicles} />
        </div>
      )}
      {role === "driver" && loggedDriver && (
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>
            {driverHasActive ? "Session in progress" : `Hello, ${loggedDriver.name.split(" ")[0]} 👋`}
          </div>
          <div style={{ fontSize: 12, color: "#86868b", marginBottom: 20 }}>
            {driverHasActive ? `${mySession.vehiclePlate} · On the road since ${new Date(mySession.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "No active session · Ready for check-in"}
          </div>
          {readOnly ? (
            <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 24, textAlign: "center", color: "#86868b", fontSize: 13 }}>Les formulaires check-in / check-out sont désactivés en mode lecture.</div>
          ) : !driverHasActive ? <CheckInForm onConfirm={handleCheckIn} loggedDriver={loggedDriver} vehicles={vehicles} /> : <CheckOutForm session={mySession} onConfirm={handleCheckOut} vehicles={vehicles} />}
        </div>
      )}
    </div>
  );
}

// Convertisseur Excel → CSV (PowerBI / Xano) — garde toutes les colonnes, renomme et nettoie
const EXCEL_TO_CSV_RENAME: Record<string, string> = {
  // Identité du job
  "Agency Group": "agency_group",
  Agency: "agency",
  "ERP Instance": "erp_instance",
  "Source Id": "source_id",
  Folder: "folder",
  "Job Number": "job_number",
  Status: "status",
  Date: "date",
  "Week Number": "week_number",
  "BAU / Event": "bau_event",
  Vertical: "vertical",
  "Main Account": "main_account",
  "Billing Account": "billing_account",
  "Invoice Number": "invoice_number",
  // Prestataire
  "Service Provider Group": "provider_type",
  "Service Provider Country": "service_provider_country",
  "Service Provider": "provider_name",
  Chauffeur: "driver_name",
  // Service
  "Service Type (High)": "service_type_high",
  "Service Type (Mid)": "service_type_mid",
  "Service Type (Low)": "service_type_low",
  "Requested Vehicle Type": "vehicle_type_requested",
  "Assigned Vehicle Type": "vehicle_type_assigned",
  Vehicle: "vehicle_plate",
  "Pick-Up Location": "pickup_location",
  "Drop-Off Location": "dropoff_location",
  // Lead time
  "Lead Time (Fine Category)": "lead_time_fine",
  "Lead Time (Broad Category)": "lead_time_broad",
  "Lead Time": "lead_time_hours",
  // Financier — format "1 | ..." (ancien), "01 | ..." (PowerBI récent avec zéro)
  "1 | Revenue (Base Currency)": "revenue_aed",
  "01 | Revenue (Base Currency)": "revenue_aed",
  "2 | Revenue (€)": "revenue_eur",
  "02 | Revenue (€)": "revenue_eur",
  "3 | Hourly Revenue (Base Currency)": "hourly_revenue_aed",
  "03 | Hourly Revenue (Base Currency)": "hourly_revenue_aed",
  "4 | Hourly Revenue (€)": "hourly_revenue_eur",
  "04 | Hourly Revenue (€)": "hourly_revenue_eur",
  "Cost (Base Currency)": "cost_aed",
  "Cost (€)": "cost_eur",
  "Gross Margin": "gross_margin",
  "Exchange Rate": "exchange_rate",
  "Currency Exchange Code": "currency_exchange_code",
  Duration: "duration_hours",
  "Salesforce Id": "salesforce_id",
};

/** DD/MM/YYYY ou DD-MM-YYYY → YYYY-MM-DD */
function toYYYYMMDD(s: string): string {
  const trimmed = s.trim();
  const ddmmyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s|$|T)/) || trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyy) {
    const [, d, m, y] = ddmmyy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

/** Nettoie une valeur cellule : dates DD/MM/YYYY → YYYY-MM-DD, virgule décimale → point, supprime € % et espaces dans les nombres */
function cleanCellValue(raw: unknown, isDateLike: boolean): string {
  if (raw == null || raw === "") return "";
  let s = String(raw).trim();
  if (!s) return "";

  if (isDateLike || /^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(s) || s.match(/^\d{4}-\d{2}-\d{2}/)) {
    s = toYYYYMMDD(s);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const n = Number(raw);
      if (!Number.isNaN(n) && n > 0) {
        // Conversion serial Excel → date UTC pure (sans objet Date local)
        // Dec 30 1899 = epoch Excel. Math.round pour absorber les fractions horaires.
        const epochExcel = Date.UTC(1899, 11, 30);
        const d = new Date(epochExcel + Math.round(n) * 86400000);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    }
    return s;
  }

  s = s.replace(/;/g, ",");
  s = s.replace(/€/g, "").replace(/%/g, "").trim();
  if (/^[\d\s,.+-]+$/.test(s)) {
    s = s.replace(/\s/g, "");
    s = s.replace(/,(\d)/g, ".$1");
  }
  return s;
}

function escapeCsvCell(val: string): string {
  if (!/[\n",]/.test(val)) return val;
  return `"${val.replace(/"/g, '""')}"`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _convertExcelToCsv(file: File): Promise<{ csv: string; rowCount: number }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = r.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: "array" });
        const first = wb.SheetNames[0];
        if (!first) {
          reject(new Error("Classeur vide"));
          return;
        }
        const ws = wb.Sheets[first];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        if (rows.length < 1) {
          reject(new Error("Feuille vide"));
          return;
        }
        const rawHeaders = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const outHeaders = rawHeaders.map((excelName) => EXCEL_TO_CSV_RENAME[excelName] ?? excelName);
        const isDateCol = rawHeaders.map((excelName) => excelName === "Date" || EXCEL_TO_CSV_RENAME[excelName] === "date" || /date|Date/.test(excelName));
        const headerLine = outHeaders.map(escapeCsvCell).join(",");
        const dataLines: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          const outCells: string[] = [];
          for (let c = 0; c < rawHeaders.length; c++) {
            const val = cleanCellValue(row[c], isDateCol[c]);
            outCells.push(escapeCsvCell(val));
          }
          dataLines.push(outCells.join(","));
        }
        const csv = "\uFEFF" + headerLine + "\n" + dataLines.join("\n");
        resolve({ csv, rowCount: dataLines.length });
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsArrayBuffer(file);
  });
}

const JOB_NUMBER_KEYS = new Set<string>([
  "source_id", "folder", "job_number", "week_number", "lead_time_hours",
  "revenue_aed", "revenue_eur", "hourly_revenue_aed", "hourly_revenue_eur",
  "cost_aed", "cost_eur", "gross_margin", "exchange_rate", "duration_hours",
]);

/** Ensemble des colonnes DB valides — toute colonne non reconnue est ignorée */
const VALID_DB_COLS = new Set<string>(Object.values(EXCEL_TO_CSV_RENAME));

function parseExcelToJobs(file: File): Promise<JobInput[]> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = r.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: "array" });
        const first = wb.SheetNames[0];
        if (!first) {
          resolve([]);
          return;
        }
        const ws = wb.Sheets[first];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        if (rows.length < 2) {
          resolve([]);
          return;
        }
        const rawHeaders = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        // Debug : affiche les headers Excel et leur mapping
        console.log("[Import] Headers Excel →", rawHeaders.map(h => `"${h}" → ${EXCEL_TO_CSV_RENAME[h] ?? "⚠️ NON MAPPÉ"}`));
        const isDateCol = rawHeaders.map((excelName) => excelName === "Date" || EXCEL_TO_CSV_RENAME[excelName] === "date" || /date|Date/.test(excelName));
        const jobs: JobInput[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          const job: Record<string, unknown> = { date: "" };
          for (let c = 0; c < rawHeaders.length; c++) {
            const excelName = rawHeaders[c];
            const key = EXCEL_TO_CSV_RENAME[excelName] ?? excelName;
            // Ignorer les colonnes Excel non reconnues (évite erreur schema Supabase)
            if (!VALID_DB_COLS.has(key)) continue;
            const rawVal = row[c];
            let val: string | number | undefined = cleanCellValue(rawVal, isDateCol[c]);
            if (val === "") val = undefined;
            else if (JOB_NUMBER_KEYS.has(key)) {
              const n = Number(val);
              val = Number.isNaN(n) ? undefined : n;
            }
            if (val !== undefined) job[key] = val;
          }
          if (job.date) jobs.push(job as JobInput);
        }
        resolve(jobs);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsArrayBuffer(file);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY INPUT VIEW
// ═══════════════════════════════════════════════════════════════════════════
function DailyInputView({ readOnly = false }: { readOnly?: boolean }) {
  const { refetch } = useJobs();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [totalDrivers, setTotalDrivers] = useState<number>(0);
  const [working, setWorking] = useState<number>(0);
  const [pool, setPool] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<{ imported: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Daily Op list/edit/delete ─────────────────────────────────────────────
  const [dopList, setDopList] = useState<DailyOpRaw[]>([]);
  const [dopLoading, setDopLoading] = useState(false);
  const [dopError, setDopError] = useState<string | null>(null);
  const [dopDeletingId, setDopDeletingId] = useState<number | null>(null);
  const [dopEditingId, setDopEditingId] = useState<number | null>(null);
  const [dopEditForm, setDopEditForm] = useState<DailyOpRaw | null>(null);
  // Filtres Daily Op
  const [dopPeriodMode, setDopPeriodMode] = useState<"day" | "month">("month");
  const [dopSelectedDate, setDopSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dopSelectedMonth, setDopSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [dopSelectedYear, setDopSelectedYear] = useState(() => new Date().getFullYear());
  const [dopSaving, setDopSaving] = useState(false);

  // ── Jobs list/delete ──────────────────────────────────────────────────────
  const [jobsPeriodMode, setJobsPeriodMode] = useState<"day" | "month">("day");
  const [jobsSelectedDate, setJobsSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [jobsSelectedMonth, setJobsSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [jobsSelectedYear, setJobsSelectedYear] = useState(() => new Date().getFullYear());
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsDeletingId, setJobsDeletingId] = useState<number | null>(null);

  const jobsListSortedByDate = useMemo(() => {
    return [...jobsList].sort((a, b) => (a.date?.slice(0, 10) ?? "").localeCompare(b.date?.slice(0, 10) ?? ""));
  }, [jobsList]);

  const free = Math.max(0, working - pool);
  const pctWorking =
    totalDrivers > 0 ? Math.round((working / totalDrivers) * 1000) / 10 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await submitDailyOp({
        date,
        total_drivers: totalDrivers,
        working,
        pool,
        free,
        pct_working: pctWorking,
      });
      setSuccess("Données enregistrées avec succès.");
      setTotalDrivers(0);
      setWorking(0);
      setPool(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };


  const handleDopLoad = async () => {
    setDopLoading(true);
    setDopError(null);
    try {
      let opts: { date?: string; dateStart?: string; dateEnd?: string } = {};
      if (dopPeriodMode === "day") {
        opts = { date: dopSelectedDate };
      } else {
        const pad = (n: number) => String(n).padStart(2, "0");
        const lastDay = new Date(dopSelectedYear, dopSelectedMonth, 0).getDate();
        opts = {
          dateStart: `${dopSelectedYear}-${pad(dopSelectedMonth)}-01`,
          dateEnd: `${dopSelectedYear}-${pad(dopSelectedMonth)}-${lastDay}`,
        };
      }
      const rows = await fetchDailyOp(opts);
      setDopList(rows as DailyOpRaw[]);
    } catch (err) {
      setDopError(err instanceof Error ? err.message : String(err));
    } finally {
      setDopLoading(false);
    }
  };

  const handleDopDelete = async (id: number) => {
    if (!window.confirm("Supprimer cet enregistrement daily_op ?")) return;
    setDopDeletingId(id);
    try {
      await deleteDailyOp(id);
      setDopList((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setDopError(err instanceof Error ? err.message : String(err));
    } finally {
      setDopDeletingId(null);
    }
  };

  const handleDopEditStart = (row: DailyOpRaw) => {
    setDopEditingId(row.id ?? null);
    setDopEditForm({ ...row });
  };

  const handleDopEditSave = async () => {
    if (!dopEditForm || dopEditingId == null) return;
    setDopSaving(true);
    try {
      const total = dopEditForm.total_drivers ?? 0;
      const working = dopEditForm.working ?? 0;
      const pct = total > 0 ? Math.round((working / total) * 10000) / 100 : 0;
      await submitDailyOp({
        date: dopEditForm.date,
        total_drivers: total,
        working,
        pool: dopEditForm.pool ?? 0,
        free: Math.max(0, working - (dopEditForm.pool ?? 0)),
        pct_working: pct,
      });
      setDopList((prev) =>
        prev.map((r) => (r.id === dopEditingId ? { ...r, ...dopEditForm, pct_working: pct } : r))
      );
      setDopEditingId(null);
      setDopEditForm(null);
    } catch (err) {
      setDopError(err instanceof Error ? err.message : String(err));
    } finally {
      setDopSaving(false);
    }
  };

  const getJobsPeriodRange = (): { dateStart: string; dateEnd: string } => {
    if (jobsPeriodMode === "day") {
      return { dateStart: jobsSelectedDate, dateEnd: jobsSelectedDate };
    }
    const y = jobsSelectedYear;
    const m = String(jobsSelectedMonth).padStart(2, "0");
    const lastDay = new Date(y, jobsSelectedMonth, 0).getDate();
    return {
      dateStart: `${y}-${m}-01`,
      dateEnd: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const handleJobsLoad = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const { dateStart, dateEnd } = getJobsPeriodRange();
      const list =
        jobsPeriodMode === "day"
          ? await fetchJobs({ date: jobsSelectedDate })
          : await fetchJobs({ dateStart, dateEnd });
      setJobsList(list);
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : String(err));
      setJobsList([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleJobDelete = async (job: Job) => {
    if (!window.confirm(`Supprimer le job du ${job.date?.slice(0, 10) ?? "?"} (${job.billing_account ?? "—"}) ?`)) return;
    setJobsDeletingId(job.id);
    try {
      await deleteJob(job.id);
      setJobsList((prev) => prev.filter((j) => j.id !== job.id));
      refetch();
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : String(err));
    } finally {
      setJobsDeletingId(null);
    }
  };

  const handleJobsDeletePeriod = async () => {
    const { dateStart, dateEnd } = getJobsPeriodRange();
    const count = jobsList.length;
    if (count === 0) {
      setJobsError("Chargez d’abord les jobs pour voir combien seront supprimés.");
      return;
    }
    if (!window.confirm(`Supprimer toute la période (${dateStart} → ${dateEnd}) ?\n\n${count} job${count !== 1 ? "s" : ""} seront supprimé${count !== 1 ? "s" : ""}.`)) return;
    setJobsLoading(true);
    setJobsError(null);
    try {
      await deleteJobsByDate(dateStart, dateEnd);
      setJobsList([]);
      refetch();
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : String(err));
    } finally {
      setJobsLoading(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setImportFile(f ?? null);
    setImportError(null);
    setImportReport(null);
  };

  const handleImportToSupabase = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError(null);
    setImportReport(null);
    setImportProgress(null);
    try {
      const jobs = await parseExcelToJobs(importFile);
      if (jobs.length === 0) {
        setImportError("Aucun job trouvé dans le fichier (vérifiez la colonne Date).");
        return;
      }
      // Détecter la plage de dates du fichier et supprimer les jobs existants
      const dates = jobs.map((j) => j.date).filter(Boolean).sort();
      const dateStart = dates[0]!;
      const dateEnd = dates[dates.length - 1]!;
      setImportProgress(`Suppression des jobs du ${dateStart} au ${dateEnd}…`);
      await deleteJobsByDate(dateStart, dateEnd);
      setImportProgress(`${jobs.length} jobs parsés — insertion en cours…`);
      const inserted = await bulkInsertJobs(jobs);
      setImportReport({ imported: inserted, total: jobs.length });
      refetch();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportBusy(false);
      setImportProgress(null);
    }
  };

  const inputStyle = {
    width: "100%",
    maxWidth: 200,
    background: "#f5f5f7",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
    color: "#1d1d1f",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {readOnly && (
        <div style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "#007aff", display: "flex", alignItems: "center", gap: 8 }}>
          👁 Consultation uniquement — les modifications sont désactivées
        </div>
      )}
      {!readOnly && <div className="g2" style={{ alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Sec mt={0} mb={0}>SAISIE DAILY OP</Sec>
          <Card style={{ maxWidth: 480, padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Drivers
              </label>
              <input
                type="number"
                min={0}
                value={totalDrivers || ""}
                onChange={(e) => setTotalDrivers(Number(e.target.value) || 0)}
                style={inputStyle}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Working
              </label>
              <input
                type="number"
                min={0}
                value={working || ""}
                onChange={(e) => setWorking(Number(e.target.value) || 0)}
                style={inputStyle}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pool
              </label>
              <input
                type="number"
                min={0}
                value={pool || ""}
                onChange={(e) => setPool(Number(e.target.value) || 0)}
                style={inputStyle}
                placeholder="0"
                required
              />
            </div>
            <div style={{ padding: "14px 16px", background: "#f5f5f7", borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Calculés
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#86868b", marginBottom: 2 }}>Free</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#007aff" }}>{free}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#86868b", marginBottom: 2 }}>% Working</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#34c759" }}>{fmtPct(pctWorking)}</div>
                </div>
              </div>
            </div>
            {success && (
              <div style={{ background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#34c759", fontWeight: 500 }}>
                ✓ {success}
              </div>
            )}
            {error && (
              <div style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>
                ✕ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                maxWidth: 200,
                background: submitting ? "#d1d1d6" : "#1d1d1f",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
            >
              {submitting ? "Envoi…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Card>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Sec mt={0} mb={0}>IMPORT EXCEL VERS SUPABASE</Sec>
      <Card style={{ maxWidth: 480, padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#86868b", lineHeight: 1.5 }}>
            Fichier PowerBI export (.xlsx). Toutes les colonnes sont importées directement — pas de limite de jobs.
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#86868b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Fichier .xlsx</label>
            <input type="file" accept=".xlsx" onChange={handleImportFileChange} disabled={importBusy} style={{ fontSize: 13, fontFamily: "inherit" }} />
            {importFile && <div style={{ fontSize: 12, color: "#86868b", marginTop: 8 }}>{importFile.name}</div>}
          </div>
          {importProgress && (
            <div style={{ fontSize: 13, color: "#007aff", fontWeight: 500 }}>{importProgress}</div>
          )}
          {importReport && (
            <div style={{ background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#1d1d1f", fontWeight: 500 }}>
              ✓ {importReport.imported} job{importReport.imported !== 1 ? "s" : ""} importé{importReport.imported !== 1 ? "s" : ""} sur {importReport.total}
            </div>
          )}
          {importError && (
            <div style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>✕ {importError}</div>
          )}
          <button type="button" onClick={handleImportToSupabase} disabled={importBusy || !importFile} style={{ alignSelf: "flex-start", background: importBusy || !importFile ? "#d1d1d6" : "#1d1d1f", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: importBusy || !importFile ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {importBusy ? "Import en cours…" : "Importer vers Supabase"}
          </button>
        </div>
      </Card>
          </div>
        </div>
      </div>}

      {/* ── GESTION DAILY OP ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 32 }}>
        <Sec mt={0} mb={0}>GESTION DAILY OP</Sec>
        <Card style={{ maxWidth: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ── Filtres ── */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              {/* Jour / Mois */}
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <input type="radio" name="dopPeriod" checked={dopPeriodMode === "day"} onChange={() => setDopPeriodMode("day")} />
                Jour
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <input type="radio" name="dopPeriod" checked={dopPeriodMode === "month"} onChange={() => setDopPeriodMode("month")} />
                Mois
              </label>
              {/* Sélecteur de date ou mois/année */}
              {dopPeriodMode === "day" ? (
                <input
                  type="date"
                  value={dopSelectedDate}
                  onChange={(e) => setDopSelectedDate(e.target.value)}
                  style={{ padding: "8px 12px", border: "1.5px solid #d1d1d6", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none" }}
                />
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <CustomSelect compact value={dopSelectedMonth} onChange={(v) => setDopSelectedMonth(Number(v))} options={[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: m, label: new Date(2000, m - 1, 1).toLocaleString("fr-FR", { month: "long" }) }))} triggerStyle={{ border: "1.5px solid #d1d1d6", width: "auto", minWidth: 130 }} />
                  <input
                    type="number"
                    min={2020} max={2030}
                    value={dopSelectedYear}
                    onChange={(e) => setDopSelectedYear(Number(e.target.value) || new Date().getFullYear())}
                    style={{ padding: "8px 12px", border: "1.5px solid #d1d1d6", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", width: 90 }}
                  />
                </div>
              )}
              {/* Bouton Charger */}
              <button
                type="button"
                onClick={handleDopLoad}
                disabled={dopLoading}
                style={{ background: dopLoading ? "#d1d1d6" : "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: dopLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {dopLoading ? "Chargement…" : "Charger"}
              </button>
              {dopList.length > 0 && (
                <span style={{ fontSize: 12, color: "#86868b" }}>{dopList.length} enregistrement{dopList.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            {dopError && (
              <div style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>✕ {dopError}</div>
            )}
            {dopList.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e5ea" }}>
                      {["Date", "Total", "Working", "Pool", "Free", "%", ...(readOnly ? [] : [""])].map((h) => (
                        <th key={h} style={{ textAlign: h === "" ? "center" : h === "Date" ? "left" : "right", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dopList.map((row) => {
                      const isEditing = !readOnly && dopEditingId === row.id;
                      const isBusy = dopDeletingId === row.id || (isEditing && dopSaving);
                      const cellStyle: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid #f2f2f7", verticalAlign: "middle" };
                      if (isEditing) {
                        const inputStyle: React.CSSProperties = { width: 64, padding: "4px 8px", border: "1px solid #d1d1d6", borderRadius: 8, fontSize: 13, fontFamily: "inherit", textAlign: "right" };
                        return (
                          <tr key={row.id} style={{ background: "rgba(0,122,255,0.04)" }}>
                            <td style={cellStyle}>{dopEditForm?.date}</td>
                            {(["total_drivers", "working", "pool"] as const).map((field) => (
                              <td key={field} style={cellStyle}>
                                <input
                                  type="number"
                                  value={dopEditForm?.[field] ?? ""}
                                  onChange={(e) => setDopEditForm((f) => f ? { ...f, [field]: Number(e.target.value) } : f)}
                                  style={inputStyle}
                                />
                              </td>
                            ))}
                            <td style={cellStyle}>
                              <span style={{ color: "#86868b", fontSize: 12 }}>auto</span>
                            </td>
                            <td style={cellStyle}>
                              <span style={{ color: "#86868b", fontSize: 12 }}>auto</span>
                            </td>
                            <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                              <button type="button" onClick={handleDopEditSave} disabled={isBusy} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer", fontFamily: "inherit", marginRight: 6 }}>
                                {dopSaving ? "…" : "Sauver"}
                              </button>
                              <button type="button" onClick={() => { setDopEditingId(null); setDopEditForm(null); }} disabled={isBusy} style={{ background: "transparent", color: "#86868b", border: "1px solid #d1d1d6", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                Annuler
                              </button>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={row.id} style={{ opacity: isBusy ? 0.5 : 1 }}>
                          <td style={cellStyle}>{row.date}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{row.total_drivers ?? "—"}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{row.working ?? "—"}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{row.pool ?? "—"}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{row.free ?? "—"}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{row.pct_working != null ? `${row.pct_working}%` : "—"}</td>
                          {!readOnly && <td style={{ ...cellStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                            <button type="button" onClick={() => handleDopEditStart(row)} disabled={isBusy || dopEditingId !== null} style={{ background: "transparent", border: "1px solid #d1d1d6", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginRight: 6 }}>
                              Modifier
                            </button>
                            <button type="button" onClick={() => handleDopDelete(row.id!)} disabled={isBusy || dopEditingId !== null} style={{ background: "transparent", border: "1px solid rgba(255,59,48,0.4)", color: "#ff3b30", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                              {dopDeletingId === row.id ? "…" : "Supprimer"}
                            </button>
                          </td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 32 }}>
        <Sec mt={0} mb={0}>GESTION DES JOBS</Sec>
      <Card style={{ maxWidth: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="jobsPeriod" checked={jobsPeriodMode === "day"} onChange={() => setJobsPeriodMode("day")} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Jour</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="jobsPeriod" checked={jobsPeriodMode === "month"} onChange={() => setJobsPeriodMode("month")} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Mois</span>
            </label>
            {jobsPeriodMode === "day" ? (
              <input
                type="date"
                value={jobsSelectedDate}
                onChange={(e) => setJobsSelectedDate(e.target.value)}
                style={{ ...inputStyle, maxWidth: 160 }}
              />
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CustomSelect compact value={jobsSelectedMonth} onChange={(v) => setJobsSelectedMonth(Number(v))} options={[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: m, label: new Date(2000, m - 1, 1).toLocaleString("fr-FR", { month: "long" }) }))} style={{ maxWidth: 140 }} triggerStyle={{ border: "1.5px solid #d1d1d6" }} />
                <input type="number" min={2020} max={2030} value={jobsSelectedYear} onChange={(e) => setJobsSelectedYear(Number(e.target.value) || new Date().getFullYear())} style={{ ...inputStyle, maxWidth: 80 }} />
              </div>
            )}
            <button type="button" onClick={handleJobsLoad} disabled={jobsLoading} style={{ background: jobsLoading ? "#d1d1d6" : "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: jobsLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {jobsLoading ? "Chargement…" : "Charger"}
            </button>
            {!readOnly && <button type="button" onClick={handleJobsDeletePeriod} disabled={jobsLoading || jobsList.length === 0} style={{ background: jobsLoading || jobsList.length === 0 ? "#d1d1d6" : "#ff3b30", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: jobsLoading || jobsList.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              Supprimer la période
            </button>}
          </div>
          {jobsError && (
            <div style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>✕ {jobsError}</div>
          )}
          {jobsList.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "#86868b" }}>
              {jobsList.length} job{jobsList.length !== 1 ? "s" : ""} pour la période (tri par date croissant)
            </div>
          )}
          {jobsList.length > 0 && (
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 80px 40px", gap: 0, background: "#f5f5f7", fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <div style={{ padding: "10px 12px" }}>Date</div>
                <div style={{ padding: "10px 12px" }}>Compte facturation</div>
                <div style={{ padding: "10px 12px" }}>Service (low)</div>
                <div style={{ padding: "10px 12px" }}>Provider</div>
                <div style={{ padding: "10px 12px", textAlign: "right" }}>Revenue AED</div>
                <div style={{ padding: "10px 12px" }} />
              </div>
              {jobsListSortedByDate.map((j) => (
                <div key={j.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 80px 40px", gap: 0, alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "8px 12px", fontSize: 13 }}>
                  <div>{j.date?.slice(0, 10) ?? "—"}</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.billing_account ?? "—"}</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.service_type_low ?? "—"}</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.provider_name ?? "—"}</div>
                  <div style={{ textAlign: "right" }}>{j.revenue_aed != null ? Number(j.revenue_aed).toLocaleString("fr-FR") : "—"}</div>
                  {!readOnly && <div>
                    <button type="button" onClick={() => handleJobDelete(j)} disabled={jobsDeletingId === j.id} title="Supprimer" style={{ background: "none", border: "none", padding: 6, cursor: jobsDeletingId === j.id ? "wait" : "pointer", color: "#ff3b30", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}

// ─── MaintenanceView ───────────────────────────────────────────────────────────

const MAINTENANCE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: "Pending",        color: "#ff9500", bg: "rgba(255,149,0,0.1)" },
  in_progress:    { label: "In progress",    color: "#007aff", bg: "rgba(0,122,255,0.1)" },
  service_booked: { label: "Service booked", color: "#af52de", bg: "rgba(175,82,222,0.1)" },
  closed:         { label: "Closed",         color: "#34c759", bg: "rgba(52,199,89,0.1)" },
};

function MaintenanceView({ alerts, onRefresh }: { alerts: AlertRecord[]; onRefresh: () => void }) {
  const serviceAlerts = alerts.filter((a) => a.type === "service_due");
  const counts = { pending: 0, in_progress: 0, service_booked: 0, closed: 0 };
  serviceAlerts.forEach((a) => {
    const s = (a.status ?? "pending") as keyof typeof counts;
    if (s in counts) counts[s]++;
  });

  return (
    <div style={{ padding: "28px 32px" }}>
      <Sec>Maintenance · Alertes service</Sec>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <Kpi label="Total" value={serviceAlerts.length} />
        <Kpi label="Pending" value={counts.pending} color="orange" />
        <Kpi label="In progress" value={counts.in_progress} color="blue" />
        <Kpi label="Service booked" value={counts.service_booked} color="purple" />
        <Kpi label="Closed" value={counts.closed} color="green" />
      </div>

      {/* Table */}
      <Card>
        {serviceAlerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "#86868b", fontSize: 13 }}>
            Aucune alerte service — tous les véhicules sont à jour ✅
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f5" }}>
                {["Plaque", "Message", "Km actuel → Prochain service", "Date", "Statut", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#86868b", textAlign: h === "" ? "center" : "left", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {serviceAlerts.map((a, i) => {
                const st = a.status ?? "pending";
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _cfg = MAINTENANCE_STATUS_CONFIG[st] ?? MAINTENANCE_STATUS_CONFIG.pending;
                return (
                  <tr key={a.id} style={{ borderBottom: i < serviceAlerts.length - 1 ? "1px solid #f5f5f7" : "none" }}>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(0,122,255,0.08)", color: "#007aff" }}>{a.plate}</span>
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: "#1d1d1f", maxWidth: 260 }}>{a.message ?? "—"}</td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: "#86868b", whiteSpace: "nowrap" }}>
                      {a.km_current != null ? `${a.km_current.toLocaleString("fr-FR")} km` : "—"}
                      {" → "}
                      {a.km_prev != null ? `${a.km_prev.toLocaleString("fr-FR")} km` : "—"}
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 11, color: "#86868b", whiteSpace: "nowrap" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <CustomSelect compact statusStyle value={st} onChange={(v) => updateAlertStatus(a.id, String(v)).then(onRefresh).catch(() => {})} options={Object.entries(MAINTENANCE_STATUS_CONFIG).map(([k, c]) => ({ value: k, label: c.label, bg: c.bg, color: c.color }))} triggerStyle={{ border: "none", fontWeight: 600 }} />
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => { if (confirm(`Supprimer l'alerte ${a.plate} ?`)) deleteAlert(a.id).then(onRefresh).catch(() => {}); }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.4, transition: "opacity 0.15s" }}
                        title="Supprimer"
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                      >🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── SalesView ─────────────────────────────────────────────────────────────────

const LEAD_TYPE_CONFIG: Record<LeadType, { label: string; bg: string; color: string }> = {
  upsell: { label: "Upsell", bg: "#e8f5e9", color: "#34c759" },
  churn_risk: { label: "Risque churn", bg: "#ffeef0", color: "#ff3b30" },
  cross_sell: { label: "Cross-sell", bg: "#e8f4fd", color: "#007aff" },
  seasonal: { label: "Saisonnier", bg: "#fff8e1", color: "#ff9500" },
  new_prospect: { label: "Nouveau prospect", bg: "#f3e8fd", color: "#af52de" },
};

const CONFIDENCE_CONFIG: Record<LeadConfidence, { label: string; color: string }> = {
  high: { label: "Haute", color: "#34c759" },
  medium: { label: "Moyenne", color: "#ff9500" },
  low: { label: "Basse", color: "#86868b" },
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  converted: "Converti",
  dismissed: "Écarté",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        backgroundColor: copied ? "#34c759" : "#f5f5f7",
        color: copied ? "#fff" : "#007aff",
        border: "none",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {copied ? "Copié !" : label}
    </button>
  );
}

// ─── Attendance View ──────────────────────────────────────────────────────────

const ATT_STATUSES = ["P", "OD", "OT", "SL", "L", "A", "HD", "E", "H", "SUP", "UL", "T", "S", "RW"] as const;
const ATT_COLORS: Record<string, { bg: string; color: string }> = {
  P: { bg: "rgba(52,199,89,0.12)", color: "#34c759" },
  OD: { bg: "rgba(0,122,255,0.10)", color: "#007aff" },
  OT: { bg: "rgba(255,149,0,0.12)", color: "#ff9500" },
  SL: { bg: "rgba(255,59,48,0.10)", color: "#ff3b30" },
  L: { bg: "rgba(175,82,222,0.10)", color: "#af52de" },
  A: { bg: "rgba(255,59,48,0.18)", color: "#d70015" },
  HD: { bg: "rgba(255,204,0,0.15)", color: "#cc9900" },
  E: { bg: "rgba(255,69,58,0.12)", color: "#ff453a" },
  H: { bg: "rgba(142,142,147,0.12)", color: "#8e8e93" },
  SUP: { bg: "rgba(255,59,48,0.08)", color: "#ff6961" },
  UL: { bg: "rgba(174,128,92,0.12)", color: "#ae805c" },
  T: { bg: "rgba(255,204,0,0.10)", color: "#cc9900" },
  S: { bg: "rgba(0,0,0,0.08)", color: "#1d1d1f" },
  RW: { bg: "rgba(90,200,250,0.12)", color: "#32ade6" },
};
const ATT_LABELS: Record<string, string> = {
  P: "Present", OD: "Off Day", OT: "Overtime", SL: "Sick Leave", L: "Leave",
  A: "Absent", HD: "Half Day", E: "Emergency", H: "Holiday", SUP: "Sick Unpaid",
  UL: "Unpaid Leave", T: "Tardy", S: "Suspended", RW: "Remote Work",
};

// ─── MONTHLY RECAP (HR sub-tab inside Attendance) ────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MonthlyRecapTab({ month, year, readOnly, staff: _staff, monthNames }: { month: number; year: number; readOnly: boolean; staff: Staff[]; monthNames: string[] }) {
  const [recap, setRecap] = useState<MonthlyRecapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [catFilter, setCatFilter] = useState<"all" | "DRIVER" | "STAFF">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMonthlyRecap(month, year);
      setRecap(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [month, year]);

  const handleRecalc = async () => {
    setRecalcing(true);
    try {
      await recalcMonthlyRecap(month, year);
      await load();
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : "Error"); }
    setRecalcing(false);
  };

  const handleSave = async (r: MonthlyRecapRecord) => {
    setSaving(true);
    try {
      const fields: Record<string, unknown> = { hr_adjusted: true };
      for (const [k, v] of Object.entries(editFields)) {
        fields[k] = k === "hr_notes" ? v : Number(v) || 0;
      }
      // Recalc total_ot_cost if hours or days cost changed
      const otHoursCost = editFields.ot_hours_cost !== undefined ? Number(editFields.ot_hours_cost) || 0 : r.otHoursCost;
      const otDaysCost = editFields.ot_days_cost !== undefined ? Number(editFields.ot_days_cost) || 0 : r.otDaysCost;
      fields.total_ot_cost = otHoursCost + otDaysCost;
      await updateMonthlyRecap(r.id, fields as Parameters<typeof updateMonthlyRecap>[1]);
      setEditId(null);
      setEditFields({});
      await load();
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : "Error"); }
    setSaving(false);
  };

  const filtered = catFilter === "all" ? recap : recap.filter((r) => r.category === catFilter);

  // Totals
  const totals = filtered.reduce((acc, r) => ({
    workingDays: acc.workingDays + r.workingDays,
    offDays: acc.offDays + r.offDays,
    otDays: acc.otDays + r.otDays,
    sickLeave: acc.sickLeave + r.sickLeave,
    annualLeave: acc.annualLeave + r.annualLeave,
    absent: acc.absent + r.absent,
    holiday: acc.holiday + r.holiday,
    otHours: acc.otHours + r.otHours,
    otHoursCost: acc.otHoursCost + r.otHoursCost,
    otDaysCost: acc.otDaysCost + r.otDaysCost,
    totalOtCost: acc.totalOtCost + r.totalOtCost,
  }), { workingDays: 0, offDays: 0, otDays: 0, sickLeave: 0, annualLeave: 0, absent: 0, holiday: 0, otHours: 0, otHoursCost: 0, otDaysCost: 0, totalOtCost: 0 });

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      "Name": r.staffName,
      "Designation": r.designation,
      "Working Days": r.workingDays,
      "Off Days": r.offDays,
      "OT Days": r.otDays,
      "Sick Leave": r.sickLeave,
      "Annual Leave": r.annualLeave,
      "Absent": r.absent,
      "Holiday": r.holiday,
      "Total Days": r.totalDays,
      "OT Hours": r.otHours,
      "OT Hours Cost": r.otHoursCost,
      "OT Days Cost": r.otDaysCost,
      "Total OT Cost": r.totalOtCost,
      "HR Adjusted": r.hrAdjusted ? "Yes" : "",
      "HR Notes": r.hrNotes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Recap ${monthNames[month]} ${year}`);
    XLSX.writeFile(wb, `Monthly_Recap_${monthNames[month]}_${year}.xlsx`);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#86868b" }}>Loading recap…</div>;

  const tdS: React.CSSProperties = { padding: "6px 8px", fontSize: 11, textAlign: "center", borderBottom: "1px solid #f5f5f7" };
  const thS: React.CSSProperties = { padding: "8px 8px", fontSize: 10, fontWeight: 700, color: "#86868b", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.3px" };

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "rgba(52,199,89,0.08)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(52,199,89,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#34c759", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Total OT Cost</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#34c759" }}>{totals.totalOtCost.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>AED</span></div>
        </div>
        <div style={{ background: "rgba(0,122,255,0.06)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(0,122,255,0.12)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#007aff", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Hours Cost</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#007aff" }}>{totals.otHoursCost.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>AED</span></div>
        </div>
        <div style={{ background: "rgba(255,149,0,0.08)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(255,149,0,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#ff9500", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Days Cost</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ff9500" }}>{totals.otDaysCost.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>AED</span></div>
        </div>
        <div style={{ background: "rgba(88,86,214,0.06)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(88,86,214,0.12)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#5856d6", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Hours</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#5856d6" }}>{totals.otHours}</div>
        </div>
        <div style={{ background: "rgba(175,82,222,0.08)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(175,82,222,0.15)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#af52de", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Days</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#af52de" }}>{totals.otDays}</div>
        </div>
        <div style={{ background: "rgba(255,59,48,0.06)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(255,59,48,0.12)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#ff3b30", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Sick Leave</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ff3b30" }}>{totals.sickLeave}</div>
        </div>
      </div>

      {/* Actions bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#f5f5f7", borderRadius: 8, padding: 2 }}>
          {(["all", "DRIVER", "STAFF"] as const).map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: catFilter === c ? "#fff" : "transparent", color: catFilter === c ? "#1d1d1f" : "#86868b", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit", boxShadow: catFilter === c ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {c === "all" ? "All" : c === "DRIVER" ? "Drivers" : "Staff"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <button onClick={handleRecalc} disabled={recalcing} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: recalcing ? 0.5 : 1 }}>
            {recalcing ? "Recalculating…" : "🔄 Recalc from Attendance"}
          </button>
        )}
        <button onClick={handleExport} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📥 Export</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No recap data for {monthNames[month]} {year}</div>
          <div style={{ fontSize: 12 }}>Click "Recalc from Attendance" to generate.</div>
        </div>
      ) : (
        <div style={{ overflow: "auto", borderRadius: 14, border: "1px solid #e5e5ea", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr style={{ background: "#f5f5f7" }}>
                <th style={{ ...thS, textAlign: "left", position: "sticky", left: 0, background: "#f5f5f7", zIndex: 2, minWidth: 140 }}>Employee</th>
                <th style={{ ...thS, textAlign: "left", minWidth: 80 }}>Role</th>
                <th style={thS}>P</th>
                <th style={thS}>OD</th>
                <th style={thS}>OT</th>
                <th style={thS}>SL</th>
                <th style={thS}>L</th>
                <th style={thS}>A</th>
                <th style={thS}>H</th>
                <th style={thS}>TD</th>
                <th style={{ ...thS, color: "#ff9500" }}>OT h</th>
                <th style={{ ...thS, color: "#007aff" }}>OT h Cost</th>
                <th style={{ ...thS, color: "#ff9500" }}>OT d Cost</th>
                <th style={{ ...thS, color: "#34c759", fontWeight: 800 }}>Total OT</th>
                <th style={thS}>HR</th>
                {!readOnly && <th style={thS}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isEditing = editId === r.id;
                const getVal = (field: string, original: number) => isEditing && editFields[field] !== undefined ? editFields[field] : String(original);
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f7", background: r.hrAdjusted ? "rgba(255,149,0,0.03)" : undefined }}>
                    <td style={{ ...tdS, textAlign: "left", fontWeight: 700, color: "#1d1d1f", position: "sticky", left: 0, background: r.hrAdjusted ? "rgba(255,149,0,0.03)" : "#fff", zIndex: 1 }}>{r.staffName}</td>
                    <td style={{ ...tdS, textAlign: "left", fontSize: 9, color: "#86868b" }}>{r.designation === "LIMO DRIVER" ? "Driver" : r.designation}</td>
                    {isEditing ? (
                      <>
                        {["working_days", "off_days", "ot_days", "sick_leave", "annual_leave", "absent", "holiday"].map((f, i) => {
                          const originals = [r.workingDays, r.offDays, r.otDays, r.sickLeave, r.annualLeave, r.absent, r.holiday];
                          return (
                            <td key={f} style={tdS}>
                              <input type="number" value={getVal(f, originals[i])} onChange={(e) => setEditFields((p) => ({ ...p, [f]: e.target.value }))} style={{ width: 36, padding: "3px 4px", borderRadius: 4, border: "1px solid #e5e5ea", fontSize: 11, textAlign: "center", fontFamily: "inherit" }} />
                            </td>
                          );
                        })}
                        <td style={{ ...tdS, fontWeight: 700 }}>{
                          (Number(getVal("working_days", r.workingDays)) || 0) +
                          (Number(getVal("off_days", r.offDays)) || 0) +
                          (Number(getVal("ot_days", r.otDays)) || 0) +
                          (Number(getVal("sick_leave", r.sickLeave)) || 0) +
                          (Number(getVal("annual_leave", r.annualLeave)) || 0) +
                          (Number(getVal("absent", r.absent)) || 0) +
                          (Number(getVal("holiday", r.holiday)) || 0)
                        }</td>
                        <td style={tdS}><input type="number" value={getVal("ot_hours", r.otHours)} onChange={(e) => setEditFields((p) => ({ ...p, ot_hours: e.target.value }))} style={{ width: 42, padding: "3px 4px", borderRadius: 4, border: "1px solid #e5e5ea", fontSize: 11, textAlign: "center", fontFamily: "inherit" }} /></td>
                        <td style={tdS}><input type="number" value={getVal("ot_hours_cost", r.otHoursCost)} onChange={(e) => setEditFields((p) => ({ ...p, ot_hours_cost: e.target.value }))} style={{ width: 52, padding: "3px 4px", borderRadius: 4, border: "1px solid #e5e5ea", fontSize: 11, textAlign: "center", fontFamily: "inherit" }} /></td>
                        <td style={tdS}><input type="number" value={getVal("ot_days_cost", r.otDaysCost)} onChange={(e) => setEditFields((p) => ({ ...p, ot_days_cost: e.target.value }))} style={{ width: 52, padding: "3px 4px", borderRadius: 4, border: "1px solid #e5e5ea", fontSize: 11, textAlign: "center", fontFamily: "inherit" }} /></td>
                        <td style={{ ...tdS, fontWeight: 800, color: "#34c759" }}>{((Number(getVal("ot_hours_cost", r.otHoursCost)) || 0) + (Number(getVal("ot_days_cost", r.otDaysCost)) || 0)).toLocaleString()}</td>
                        <td style={tdS}>
                          <input type="text" placeholder="Notes…" value={editFields.hr_notes ?? r.hrNotes ?? ""} onChange={(e) => setEditFields((p) => ({ ...p, hr_notes: e.target.value }))} style={{ width: 80, padding: "3px 4px", borderRadius: 4, border: "1px solid #e5e5ea", fontSize: 10, fontFamily: "inherit" }} />
                        </td>
                        <td style={tdS}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button onClick={() => handleSave(r)} disabled={saving} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "…" : "✓"}</button>
                            <button onClick={() => { setEditId(null); setEditFields({}); }} style={{ background: "#f5f5f7", color: "#86868b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdS, fontWeight: 600, color: "#34c759" }}>{r.workingDays}</td>
                        <td style={{ ...tdS, color: "#007aff" }}>{r.offDays}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: "#ff9500" }}>{r.otDays || "—"}</td>
                        <td style={{ ...tdS, color: "#ff3b30" }}>{r.sickLeave || "—"}</td>
                        <td style={{ ...tdS, color: "#af52de" }}>{r.annualLeave || "—"}</td>
                        <td style={{ ...tdS, color: "#ff3b30" }}>{r.absent || "—"}</td>
                        <td style={{ ...tdS, color: "#86868b" }}>{r.holiday || "—"}</td>
                        <td style={{ ...tdS, fontWeight: 700 }}>{r.totalDays}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: "#ff9500" }}>{r.otHours || "—"}</td>
                        <td style={{ ...tdS, fontFamily: "SF Mono, monospace", color: "#007aff" }}>{r.otHoursCost ? r.otHoursCost.toLocaleString() : "—"}</td>
                        <td style={{ ...tdS, fontFamily: "SF Mono, monospace", color: "#ff9500" }}>{r.otDaysCost ? r.otDaysCost.toLocaleString() : "—"}</td>
                        <td style={{ ...tdS, fontWeight: 800, fontFamily: "SF Mono, monospace", color: "#34c759" }}>{r.totalOtCost ? r.totalOtCost.toLocaleString() : "—"}</td>
                        <td style={tdS}>
                          {r.hrAdjusted && <span title={r.hrNotes ?? "HR adjusted"} style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, background: "rgba(255,149,0,0.1)", color: "#ff9500", fontWeight: 700, fontSize: 9 }}>✎</span>}
                          {r.hrNotes && <div style={{ fontSize: 9, color: "#86868b", marginTop: 2, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.hrNotes}>{r.hrNotes}</div>}
                        </td>
                        {!readOnly && (
                          <td style={tdS}>
                            <button onClick={() => { setEditId(r.id); setEditFields({}); }} style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ background: "#f5f5f7", fontWeight: 800 }}>
                <td style={{ ...tdS, textAlign: "left", fontWeight: 800, position: "sticky", left: 0, background: "#f5f5f7", zIndex: 1 }}>TOTAL ({filtered.length})</td>
                <td style={tdS} />
                <td style={{ ...tdS, color: "#34c759" }}>{totals.workingDays}</td>
                <td style={{ ...tdS, color: "#007aff" }}>{totals.offDays}</td>
                <td style={{ ...tdS, color: "#ff9500" }}>{totals.otDays}</td>
                <td style={{ ...tdS, color: "#ff3b30" }}>{totals.sickLeave}</td>
                <td style={{ ...tdS, color: "#af52de" }}>{totals.annualLeave}</td>
                <td style={{ ...tdS, color: "#ff3b30" }}>{totals.absent}</td>
                <td style={{ ...tdS, color: "#86868b" }}>{totals.holiday}</td>
                <td style={tdS}>{filtered.reduce((a, r) => a + r.totalDays, 0)}</td>
                <td style={{ ...tdS, fontWeight: 800, color: "#ff9500" }}>{totals.otHours}</td>
                <td style={{ ...tdS, fontFamily: "SF Mono, monospace", color: "#007aff" }}>{totals.otHoursCost.toLocaleString()}</td>
                <td style={{ ...tdS, fontFamily: "SF Mono, monospace", color: "#ff9500" }}>{totals.otDaysCost.toLocaleString()}</td>
                <td style={{ ...tdS, fontFamily: "SF Mono, monospace", color: "#34c759", fontSize: 13 }}>{totals.totalOtCost.toLocaleString()}</td>
                <td style={tdS} />
                {!readOnly && <td style={tdS} />}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttendanceView({ readOnly = false }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"calendar" | "absences">("calendar");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attMonth, setAttMonth] = useState(new Date().getMonth());
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [desigFilter, setDesigFilter] = useState("all");
  const [attNameFilter, setAttNameFilter] = useState("");
  // Cell editing (calendar grid)
  const [editCell, setEditCell] = useState<{ staffId: number; day: number } | null>(null);
  const [editOtHours, setEditOtHours] = useState("");
  // Quick-entry panel
  const [quickDay, setQuickDay] = useState(new Date().getDate());
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickExceptionStaff, setQuickExceptionStaff] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_quickOtHours, setQuickOtHours] = useState("");
  // Multi-day leave/exception form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState<number | "">("");
  const [leaveStatus, setLeaveStatus] = useState("L");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveOtHours, setLeaveOtHours] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);
  // Pool per day (from daily_op)
  const [poolMap, setPoolMap] = useState<Record<number, number>>({});
  const [poolInput, setPoolInput] = useState("");
  // Public holidays
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStart = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-01`;
      const dateEnd = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${new Date(attYear, attMonth + 1, 0).getDate()}`;
      const [s, a, ops, hols] = await Promise.all([fetchStaff(), fetchAttendance(attMonth, attYear), fetchDailyOp({ dateStart, dateEnd }), fetchPublicHolidays(attYear)]);
      setStaff(s);
      setAttendance(a);
      setHolidays(hols);
      const pm: Record<number, number> = {};
      for (const op of ops) {
        const day = parseInt(op.date.split("-")[2], 10);
        if (op.pool != null) pm[day] = op.pool;
      }
      setPoolMap(pm);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [attMonth, attYear]);

  const daysInMonth = new Date(attYear, attMonth + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build attendance map: staffId -> day -> record
  const attMap = useMemo(() => {
    const m: Record<number, Record<number, { status: string; otHours: number }>> = {};
    for (const r of attendance) {
      const day = parseInt(r.date.split("-")[2], 10);
      if (!m[r.staffId]) m[r.staffId] = {};
      m[r.staffId][day] = { status: r.status, otHours: r.otHours };
    }
    return m;
  }, [attendance]);

  // Holiday map: day number -> holiday name (for current month)
  const holidayMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const h of holidays) {
      const [y, mo, da] = h.date.split("-").map(Number);
      if (y === attYear && mo === attMonth + 1) m[da] = h.name;
    }
    return m;
  }, [holidays, attMonth, attYear]);

  const filteredStaff = staff.filter((s) => {
    if (desigFilter !== "all" && s.designation !== desigFilter) return false;
    if (attNameFilter && !s.name.toLowerCase().includes(attNameFilter.toLowerCase())) return false;
    return true;
  });
  const designations = [...new Set(staff.map((s) => s.designation))].sort();

  // KPIs
  const today = new Date();
  const isCurrentMonthYear = attMonth === today.getMonth() && attYear === today.getFullYear();
  const todayDay = isCurrentMonthYear ? today.getDate() : null;

  const todayRecords = todayDay ? filteredStaff.map((s) => attMap[s.id]?.[todayDay]).filter(Boolean) : [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _presentToday = todayRecords.filter((r) => r && (r.status === "P" || r.status === "OT")).length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _onLeaveToday = todayRecords.filter((r) => r && ["SL", "L", "E", "UL", "SUP", "A"].includes(r.status)).length;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _totalOtMonth = attendance.filter((r) => filteredStaff.some((s) => s.id === r.staffId)).reduce((s, r) => s + r.otHours, 0);

  const totalWorkDays = filteredStaff.length * daysInMonth;
  const totalPresent = attendance.filter((r) => filteredStaff.some((s) => s.id === r.staffId) && (r.status === "P" || r.status === "OT")).length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _presenceRate = totalWorkDays > 0 ? Math.round((totalPresent / totalWorkDays) * 100) : 0;

  // OT KPIs — driver vs staff split
  const driverIds = new Set(filteredStaff.filter((s) => s.designation === "LIMO DRIVER").map((s) => s.id));
  const staffIds = new Set(filteredStaff.filter((s) => s.designation !== "LIMO DRIVER").map((s) => s.id));
  const filteredAtt = attendance.filter((r) => filteredStaff.some((s) => s.id === r.staffId));
  const otDaysDriver = filteredAtt.filter((r) => driverIds.has(r.staffId) && r.status === "OT").length;
  const otDaysStaff = filteredAtt.filter((r) => staffIds.has(r.staffId) && r.status === "OT").length;
  const otHoursDriver = filteredAtt.filter((r) => driverIds.has(r.staffId)).reduce((s, r) => s + r.otHours, 0);
  const otHoursStaff = filteredAtt.filter((r) => staffIds.has(r.staffId)).reduce((s, r) => s + r.otHours, 0);

  // Summary per day (bottom row)
  const daySummary = useMemo(() => {
    const summary: Record<number, { present: number; od: number; leave: number; total: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      let present = 0, od = 0, leave = 0, total = 0;
      for (const s of filteredStaff) {
        const rec = attMap[s.id]?.[d];
        if (rec) {
          total++;
          if (rec.status === "P" || rec.status === "OT") present++;
          else if (rec.status === "OD") od++;
          else if (["SL", "L", "E", "UL", "SUP", "A"].includes(rec.status)) leave++;
        }
      }
      summary[d] = { present, od, leave, total };
    }
    return summary;
  }, [attMap, filteredStaff, daysInMonth]);

  // Summary per employee (right columns)
  const empSummary = (staffId: number) => {
    const counts: Record<string, number> = {};
    let otTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = attMap[staffId]?.[d];
      if (rec) {
        counts[rec.status] = (counts[rec.status] || 0) + 1;
        otTotal += rec.otHours;
      }
    }
    return { counts, otTotal, td: Object.values(counts).reduce((a, b) => a + b, 0) };
  };

  const handleCellClick = (staffId: number, day: number) => {
    if (readOnly) return;
    setEditCell({ staffId, day });
    const rec = attMap[staffId]?.[day];
    setEditOtHours(rec?.otHours ? String(rec.otHours) : "");
  };

  const handleStatusSelect = async (status: string) => {
    if (!editCell) return;
    const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(editCell.day).padStart(2, "0")}`;
    const ot = parseFloat(editOtHours) || 0;
    try {
      await upsertAttendance(editCell.staffId, dateStr, status, ot);
      setEditCell(null);
      // Optimistic update
      setAttendance((prev) => {
        const idx = prev.findIndex((r) => r.staffId === editCell.staffId && r.date === dateStr);
        const newRec: AttendanceRecord = { id: 0, staffId: editCell.staffId, staffName: "", designation: "", date: dateStr, status, otHours: ot };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...prev[idx], status, otHours: ot }; return copy; }
        return [...prev, newRec];
      });
    } catch (e) { console.error(e); }
  };

  const handleExportAttendance = () => {
    const rows = filteredStaff.map((s) => {
      const row: Record<string, unknown> = { "Staff #": s.staffNumber, "Name": s.name, "Designation": s.designation };
      for (let d = 1; d <= daysInMonth; d++) {
        const rec = attMap[s.id]?.[d];
        row[String(d)] = rec?.status ?? "";
      }
      const sum = empSummary(s.id);
      for (const code of ["P", "OD", "OT", "SL", "L", "A"]) row[code] = sum.counts[code] || 0;
      row["OT Hrs"] = sum.otTotal;
      row["TD"] = sum.td;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthNames[attMonth]} ${attYear}`);
    XLSX.writeFile(wb, `Attendance_${monthNames[attMonth]}_${attYear}.xlsx`);
  };

  // Quick entry: fill all staff as Present for the selected day
  const handleFillAllPresent = async () => {
    setQuickSaving(true);
    const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`;
    const targetStaff = filteredStaff;
    const records = targetStaff.map((s) => ({
      staff_id: s.id,
      date: dateStr,
      status: attMap[s.id]?.[quickDay] ? attMap[s.id][quickDay].status : "P",
      ot_hours: attMap[s.id]?.[quickDay]?.otHours ?? 0,
    }));
    // Only fill those that don't have a record yet
    const toInsert = records.filter((r) => !attMap[r.staff_id]?.[quickDay]);
    if (toInsert.length === 0) { setQuickSaving(false); return; }
    // Force all unfilled to P
    const batch = toInsert.map((r) => ({ ...r, status: "P", ot_hours: 0 }));
    try {
      await bulkUpsertAttendance(batch);
      await loadData();
    } catch (e) { console.error(e); }
    setQuickSaving(false);
  };

  // Quick entry: set a specific exception for a staff member
  const handleQuickException = async (staffId: number, status: string, otHrs: number = 0) => {
    const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`;
    try {
      await upsertAttendance(staffId, dateStr, status, otHrs);
      setQuickExceptionStaff(null);
      setQuickOtHours("");
      // Optimistic update
      setAttendance((prev) => {
        const idx = prev.findIndex((r) => r.staffId === staffId && r.date === dateStr);
        const newRec: AttendanceRecord = { id: 0, staffId, staffName: "", designation: "", date: dateStr, status, otHours: otHrs };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...prev[idx], status, otHours: otHrs }; return copy; }
        return [...prev, newRec];
      });
    } catch (e) { console.error(e); }
  };

  // Quick-entry: stats for the selected day
  const quickDayStats = useMemo(() => {
    let filled = 0, present = 0, exceptions = 0;
    for (const s of filteredStaff) {
      const rec = attMap[s.id]?.[quickDay];
      if (rec) {
        filled++;
        if (rec.status === "P" || rec.status === "OT") present++;
        else exceptions++;
      }
    }
    return { filled, unfilled: filteredStaff.length - filled, present, exceptions };
  }, [attMap, filteredStaff, quickDay]);

  // Multi-day leave/exception: bulk insert for a date range
  const handleLeaveSubmit = async () => {
    if (!leaveStaffId || !leaveFrom || !leaveTo) return;
    setLeaveSaving(true);
    const from = new Date(leaveFrom + "T12:00:00");
    const to = new Date(leaveTo + "T12:00:00");
    if (to < from) { setLeaveSaving(false); return; }
    const records: { staff_id: number; date: string; status: string; ot_hours: number }[] = [];
    const cur = new Date(from);
    while (cur <= to) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      records.push({ staff_id: Number(leaveStaffId), date: dateStr, status: leaveStatus, ot_hours: parseFloat(leaveOtHours) || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    try {
      await bulkUpsertAttendance(records);
      setShowLeaveForm(false);
      setLeaveStaffId("");
      setLeaveFrom("");
      setLeaveTo("");
      setLeaveOtHours("");
      await loadData();
    } catch (e) { console.error(e); alert(e instanceof Error ? e.message : "Error"); }
    setLeaveSaving(false);
  };

  // Count days in leave form range
  const leaveDaysCount = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 0;
    const from = new Date(leaveFrom + "T12:00:00");
    const to = new Date(leaveTo + "T12:00:00");
    if (to < from) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  }, [leaveFrom, leaveTo]);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#86868b" }}>Loading attendance...</div>;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f7", borderRadius: 10, padding: 3, width: "fit-content" }}>
        {(["calendar", "absences"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: subTab === t ? "#fff" : "transparent", color: subTab === t ? "#1d1d1f" : "#86868b", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: subTab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {t === "calendar" ? "📅 Calendar" : "🚫 Absences"}
          </button>
        ))}
      </div>

      {subTab === "calendar" && (
        <div>
          {/* Period selector + filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <CustomSelect
              value={attMonth}
              onChange={(v) => setAttMonth(Number(v))}
              options={monthNames.map((m, i) => ({ value: i, label: m }))}
              compact
              triggerStyle={{ background: "#f5f5f7", border: "1px solid #e5e5ea", minWidth: 110 }}
            />
            <CustomSelect
              value={attYear}
              onChange={(v) => setAttYear(Number(v))}
              options={[2024, 2025, 2026, 2027].map((y) => ({ value: y, label: String(y) }))}
              compact
              triggerStyle={{ background: "#f5f5f7", border: "1px solid #e5e5ea", minWidth: 70 }}
            />
            <CustomSelect
              value={desigFilter}
              onChange={(v) => setDesigFilter(String(v))}
              options={[{ value: "all", label: "All designations" }, ...designations.map((d) => ({ value: d, label: d }))]}
              compact
              triggerStyle={{ background: desigFilter !== "all" ? "rgba(0,122,255,0.08)" : "#f5f5f7", border: desigFilter !== "all" ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", color: desigFilter !== "all" ? "#007aff" : "#1d1d1f", fontWeight: desigFilter !== "all" ? 700 : 400, minWidth: 140 }}
            />
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                type="text"
                value={attNameFilter}
                onChange={(e) => setAttNameFilter(e.target.value)}
                placeholder="🔍 Search by name..."
                style={{ height: 32, borderRadius: 8, border: attNameFilter ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", background: attNameFilter ? "rgba(0,122,255,0.08)" : "#f5f5f7", padding: "0 28px 0 10px", fontSize: 12, fontFamily: "inherit", fontWeight: attNameFilter ? 700 : 400, color: attNameFilter ? "#007aff" : "#1d1d1f", outline: "none", minWidth: 160 }}
              />
              {attNameFilter && (
                <button
                  onClick={() => setAttNameFilter("")}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.1)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10, color: "#666", lineHeight: 1, padding: 0 }}
                >✕</button>
              )}
            </div>
            <div style={{ flex: 1 }} />
            {!readOnly && <button onClick={() => setShowHolidayForm(true)} style={{ background: "rgba(255,59,48,0.08)", color: "#ff3b30", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>🗓 Public Holidays</button>}
            <button onClick={handleExportAttendance} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>📥 Export Excel</button>
          </div>

          {/* Public Holidays Modal */}
          {showHolidayForm && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", padding: 16 }} onClick={() => setShowHolidayForm(false)}>
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", padding: 24, width: "100%", maxWidth: 420, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1d1d1f" }}>🗓 Public Holidays — {attYear}</div>
                  <button onClick={() => setShowHolidayForm(false)} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 28, height: 28, fontSize: 14, color: "#86868b", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
                {/* Existing holidays */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {holidays.filter(h => h.date.startsWith(String(attYear))).length === 0 && <div style={{ fontSize: 12, color: "#86868b", fontStyle: "italic" }}>No holidays defined for {attYear}</div>}
                  {holidays.filter(h => h.date.startsWith(String(attYear))).sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f9f9fb", borderRadius: 10, border: "1px solid #f0f0f0" }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#ff3b30", minWidth: 80 }}>{h.date}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>{h.name}</span>
                      <button onClick={async () => { await deletePublicHoliday(h.id); setHolidays(prev => prev.filter(x => x.id !== h.id)); }} style={{ background: "rgba(255,59,48,0.08)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#ff3b30", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    </div>
                  ))}
                </div>
                {/* Add new */}
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#86868b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px" }}>Add Holiday</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                    <div style={{ flex: 1 }}>
                      <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ flex: 2 }}>
                      <input type="text" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="Holiday name..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }} />
                    </div>
                    <button onClick={async () => {
                      if (!newHolidayDate || !newHolidayName.trim()) return;
                      await createPublicHoliday(newHolidayDate, newHolidayName.trim());
                      const updated = await fetchPublicHolidays(attYear);
                      setHolidays(updated);
                      setNewHolidayDate("");
                      setNewHolidayName("");
                    }} style={{ background: "#ff3b30", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>+ Add</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── QUICK ENTRY PANEL ─────────────────────────────────────── */}
          {!readOnly && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e5ea", padding: "18px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1d1d1f" }}>⚡ Quick Entry</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setQuickDay(Math.max(1, quickDay - 1))} disabled={quickDay <= 1} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e5ea", background: "#f5f5f7", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: "#86868b", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  <div style={{ background: "#007aff", color: "#fff", borderRadius: 10, padding: "5px 14px", fontWeight: 800, fontSize: 13, minWidth: 100, textAlign: "center" }}>
                    {dayNames[new Date(attYear, attMonth, quickDay).getDay()]} {quickDay} {monthNames[attMonth].slice(0, 3)}
                  </div>
                  <button onClick={() => setQuickDay(Math.min(daysInMonth, quickDay + 1))} disabled={quickDay >= daysInMonth} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e5ea", background: "#f5f5f7", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: "#86868b", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "#86868b" }}>
                    <span style={{ fontWeight: 700, color: "#34c759" }}>{quickDayStats.present} P</span>
                    {quickDayStats.exceptions > 0 && <> · <span style={{ fontWeight: 700, color: "#ff3b30" }}>{quickDayStats.exceptions} exc.</span></>}
                    {quickDayStats.unfilled > 0 && <> · <span style={{ fontWeight: 700, color: "#ff9500" }}>{quickDayStats.unfilled} unfilled</span></>}
                  </div>
                </div>
                {/* Pool input */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,122,255,0.06)", borderRadius: 10, padding: "4px 10px", border: "1px solid rgba(0,122,255,0.12)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#007aff" }}>Pool</span>
                  <input
                    type="number"
                    min={0}
                    value={poolInput !== "" ? poolInput : (poolMap[quickDay] ?? "")}
                    onChange={(e) => setPoolInput(e.target.value)}
                    onBlur={async () => {
                      const val = parseInt(poolInput, 10);
                      if (!isNaN(val) && val !== poolMap[quickDay]) {
                        const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`;
                        const driverStaff = staff.filter(s => s.designation === "LIMO DRIVER");
                        const dayRecs = driverStaff.map(s => attMap[s.id]?.[quickDay]).filter(Boolean);
                        const working = dayRecs.filter(r => r && (r.status === "P" || r.status === "OT")).length;
                        const off = dayRecs.filter(r => r && r.status === "OD").length;
                        const sick = dayRecs.filter(r => r && r.status === "SL").length;
                        const leave = dayRecs.filter(r => r && (r.status === "L" || r.status === "E" || r.status === "UL")).length;
                        const totalDrivers = driverStaff.length;
                        const free = Math.max(0, working - val);
                        const pctWorking = totalDrivers > 0 ? Math.round((working / totalDrivers) * 100) : 0;
                        try {
                          await submitDailyOp({ date: dateStr, total_drivers: totalDrivers, working, pool: val, free, pct_working: pctWorking, off, sick, leave });
                          setPoolMap(prev => ({ ...prev, [quickDay]: val }));
                        } catch (e) { console.error(e); }
                      }
                      setPoolInput("");
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    style={{ width: 40, padding: "3px 6px", borderRadius: 6, border: "1px solid rgba(0,122,255,0.2)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", textAlign: "center", background: "#fff" }}
                    placeholder="—"
                  />
                </div>
                <div style={{ flex: 1 }} />
                {quickDayStats.unfilled > 0 && (
                  <button onClick={handleFillAllPresent} disabled={quickSaving} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(52,199,89,0.3)" }}>
                    {quickSaving ? "..." : `✓ Set ${quickDayStats.unfilled} unfilled → Present`}
                  </button>
                )}
                {quickDayStats.unfilled === 0 && quickDayStats.filled > 0 && (
                  <div style={{ background: "rgba(52,199,89,0.08)", color: "#34c759", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700 }}>✓ Day complete</div>
                )}
              </div>

              {/* Multi-day leave/exception form */}
              {!showLeaveForm && (
                <div style={{ marginBottom: 12 }}>
                  <button onClick={() => { setShowLeaveForm(true); setLeaveFrom(`${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`); setLeaveTo(`${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`); }} style={{ background: "rgba(175,82,222,0.08)", color: "#af52de", border: "1px solid rgba(175,82,222,0.2)", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    📋 Declare Leave / Exception (multi-day)
                  </button>
                </div>
              )}
              {showLeaveForm && (
                <div style={{ background: "rgba(175,82,222,0.04)", border: "1px solid rgba(175,82,222,0.15)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#af52de" }}>📋 Declare Leave / Exception</div>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setShowLeaveForm(false)} style={{ background: "none", border: "1px solid #e5e5ea", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#86868b", cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>Employee {desigFilter !== "all" ? `(${desigFilter})` : ""}</div>
                      <CustomSelect
                        value={leaveStaffId || ""}
                        onChange={(v) => setLeaveStaffId(v ? Number(v) : "")}
                        placeholder="— Select employee —"
                        searchable
                        searchPlaceholder="Search by name…"
                        options={filteredStaff.map((s) => ({ value: s.id, label: s.name, sublabel: s.designation }))}
                        compact
                        triggerStyle={{ background: "#fff", border: "1px solid #e5e5ea" }}
                      />
                    </div>
                    <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>Status</div>
                      <CustomSelect
                        value={leaveStatus}
                        onChange={(v) => setLeaveStatus(String(v))}
                        placeholder="— Status —"
                        options={ATT_STATUSES.map((code) => ({ value: code, label: `${code} — ${ATT_LABELS[code]}`, bg: (ATT_COLORS[code] ?? { bg: "#f5f5f7" }).bg, color: (ATT_COLORS[code] ?? { color: "#86868b" }).color }))}
                        compact
                        triggerStyle={{ background: "#fff", border: "1px solid #e5e5ea" }}
                      />
                    </div>
                    <div style={{ flex: "0 1 auto" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>From</div>
                      <input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: "0 1 auto" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>To</div>
                      <input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <button onClick={handleLeaveSubmit} disabled={leaveSaving || !leaveStaffId || !leaveFrom || !leaveTo || leaveDaysCount === 0} style={{ background: "#af52de", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!leaveStaffId || !leaveFrom || !leaveTo || leaveDaysCount === 0) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                      {leaveSaving ? "..." : `Apply ${leaveDaysCount} day${leaveDaysCount > 1 ? "s" : ""}`}
                    </button>
                  </div>
                  {leaveDaysCount > 0 && leaveStaffId && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#86868b" }}>
                      → <strong style={{ color: (ATT_COLORS[leaveStatus] ?? { color: "#86868b" }).color }}>{ATT_LABELS[leaveStatus] ?? leaveStatus}</strong> for <strong>{filteredStaff.find(s => s.id === leaveStaffId)?.name ?? staff.find(s => s.id === leaveStaffId)?.name}</strong> × {leaveDaysCount} day{leaveDaysCount > 1 ? "s" : ""} ({leaveFrom} → {leaveTo})
                    </div>
                  )}
                </div>
              )}

              {/* Staff list — sorted: exceptions & unfilled first, Present collapsed */}
              {(() => {
                const exceptions = filteredStaff.filter((s) => { const st = attMap[s.id]?.[quickDay]?.status; return st && st !== "P"; });
                const unfilled = filteredStaff.filter((s) => !attMap[s.id]?.[quickDay]);
                const present = filteredStaff.filter((s) => attMap[s.id]?.[quickDay]?.status === "P");
                const renderRow = (s: Staff) => {
                  const rec = attMap[s.id]?.[quickDay];
                  const st = rec?.status;
                  const ot = rec?.otHours ?? 0;
                  const clr = st ? ATT_COLORS[st] ?? { bg: "#f5f5f7", color: "#86868b" } : { bg: "#fff8e1", color: "#cc9900" };
                  const isExpanded = quickExceptionStaff === s.id;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f7", background: isExpanded ? "rgba(0,122,255,0.03)" : (st && st !== "P") ? clr.bg : undefined }}>
                      <td style={{ padding: "5px 10px", fontWeight: 600, fontSize: 12, color: "#1d1d1f", whiteSpace: "nowrap" }}>{s.name}</td>
                      <td style={{ padding: "5px 6px", fontSize: 9, color: "#86868b", whiteSpace: "nowrap" }}>{s.designation === "LIMO DRIVER" ? "Driver" : s.designation}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 5, background: clr.bg, color: clr.color, fontWeight: 700, fontSize: 10, minWidth: 30 }}>
                          {st || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center", width: 55 }}>
                        {!readOnly ? (
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={ot || ""}
                            key={`ot-${s.id}-${quickDay}-${ot}`}
                            placeholder="—"
                            onBlur={async (e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val === ot) return;
                              const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(quickDay).padStart(2, "0")}`;
                              const currentStatus = st || "P";
                              await upsertAttendance(s.id, dateStr, currentStatus, val);
                              setAttendance((prev) => {
                                const idx = prev.findIndex((r) => r.staffId === s.id && r.date === dateStr);
                                const newRec: AttendanceRecord = { id: 0, staffId: s.id, staffName: "", designation: "", date: dateStr, status: currentStatus, otHours: val };
                                if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...prev[idx], otHours: val }; return copy; }
                                return [...prev, newRec];
                              });
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            style={{ width: 48, padding: "3px 4px", borderRadius: 5, border: "1px solid #e5e5ea", fontSize: 11, fontFamily: "inherit", textAlign: "center", color: ot > 0 ? "#ff9500" : "#86868b", fontWeight: ot > 0 ? 700 : 400 }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: ot > 0 ? "#ff9500" : "#d1d1d6" }}>{ot || "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center", position: "relative", width: 60 }}>
                        {isExpanded ? (
                          <>
                            <button onClick={() => setQuickExceptionStaff(null)} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #007aff", background: "rgba(0,122,255,0.06)", color: "#007aff", fontWeight: 600, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
                            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: "rgba(0,0,0,0.25)" }} onClick={() => setQuickExceptionStaff(null)} />
                            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, background: "#fff", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", padding: 14, display: "flex", flexDirection: "column", gap: 3, width: "90vw", maxWidth: 280, maxHeight: "70vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: "#1d1d1f" }}>{s.name}</div>
                                <button onClick={() => setQuickExceptionStaff(null)} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 26, height: 26, fontSize: 13, color: "#86868b", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                              </div>
                              {ATT_STATUSES.map((code) => {
                                const cc = ATT_COLORS[code] ?? { bg: "#f5f5f7", color: "#86868b" };
                                return (
                                  <button key={code} onClick={() => handleQuickException(s.id, code, rec?.otHours ?? 0)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 8, border: st === code ? "2px solid " + cc.color : "1px solid #f0f0f0", background: st === code ? cc.bg : "#fafafa", color: cc.color, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                                    <span style={{ fontWeight: 800, minWidth: 28 }}>{code}</span>
                                    <span style={{ fontWeight: 500, opacity: 0.85 }}>{ATT_LABELS[code]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <button onClick={() => { setQuickExceptionStaff(s.id); setQuickOtHours(""); }} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #e5e5ea", background: "#fff", color: "#007aff", fontWeight: 600, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                            {st ? "Edit" : "Set"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                };
                return (
                  <div style={{ maxHeight: 420, overflow: "auto", borderRadius: 10, border: "1px solid #f0f0f0" }}>
                    <table style={{ borderCollapse: "collapse", tableLayout: "auto" }}>
                      <thead>
                        <tr style={{ background: "#f9f9fb", position: "sticky", top: 0, zIndex: 1 }}>
                          <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b", whiteSpace: "nowrap" }}>Employee</th>
                          <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b", whiteSpace: "nowrap" }}>Role</th>
                          <th style={{ padding: "7px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#86868b", width: 50 }}>Status</th>
                          <th style={{ padding: "7px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#ff9500", width: 55 }}>OT hrs</th>
                          <th style={{ padding: "7px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#86868b", width: 60 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Exceptions first — highlighted */}
                        {exceptions.length > 0 && (
                          <tr><td colSpan={5} style={{ padding: "6px 12px", fontSize: 10, fontWeight: 800, color: "#ff3b30", background: "rgba(255,59,48,0.04)", borderBottom: "1px solid rgba(255,59,48,0.1)" }}>⚠ Exceptions ({exceptions.length})</td></tr>
                        )}
                        {exceptions.map(renderRow)}
                        {/* Unfilled — need attention */}
                        {unfilled.length > 0 && (
                          <tr><td colSpan={5} style={{ padding: "6px 12px", fontSize: 10, fontWeight: 800, color: "#ff9500", background: "rgba(255,149,0,0.04)", borderBottom: "1px solid rgba(255,149,0,0.1)" }}>○ Not filled ({unfilled.length})</td></tr>
                        )}
                        {unfilled.map(renderRow)}
                        {/* Present — collapsed */}
                        {present.length > 0 && (
                          <tr><td colSpan={5} style={{ padding: "6px 12px", fontSize: 10, fontWeight: 800, color: "#34c759", background: "rgba(52,199,89,0.04)", borderBottom: "1px solid rgba(52,199,89,0.1)", cursor: "default" }}>✓ Present ({present.length})</td></tr>
                        )}
                        {present.map(renderRow)}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* OT KPI cards — driver vs staff */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "rgba(0,122,255,0.06)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(0,122,255,0.12)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#007aff", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Days — Drivers</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#007aff" }}>{otDaysDriver}</div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{monthNames[attMonth]}</div>
            </div>
            <div style={{ background: "rgba(88,86,214,0.06)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(88,86,214,0.12)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#5856d6", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Days — Staff</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#5856d6" }}>{otDaysStaff}</div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{monthNames[attMonth]}</div>
            </div>
            <div style={{ background: "rgba(255,149,0,0.08)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(255,149,0,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#ff9500", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Hours — Drivers</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#ff9500" }}>{otHoursDriver}</div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{monthNames[attMonth]}</div>
            </div>
            <div style={{ background: "rgba(175,82,222,0.08)", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(175,82,222,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#af52de", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>OT Hours — Staff</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#af52de" }}>{otHoursStaff}</div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>{monthNames[attMonth]}</div>
            </div>
          </div>

          {/* Monthly calendar grid (read view) */}
          <div style={{ overflow: "auto", borderRadius: 14, border: "1px solid #e5e5ea", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 900 + daysInMonth * 36 }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 10, color: "#1d1d1f", position: "sticky", left: 0, background: "#f5f5f7", zIndex: 2, minWidth: 140 }}>Employee</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, color: "#86868b", fontSize: 9, minWidth: 70 }}>Role</th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = new Date(attYear, attMonth, i + 1);
                    const isToday = todayDay === i + 1;
                    const isFri = d.getDay() === 5;
                    const isQuickDay = quickDay === i + 1;
                    const isHoliday = !!holidayMap[i + 1];
                    return (
                      <th key={i} onClick={() => !readOnly && setQuickDay(i + 1)} title={isHoliday ? holidayMap[i + 1] : undefined} style={{ padding: "4px 2px", textAlign: "center", fontWeight: isToday ? 800 : isHoliday ? 800 : 600, color: isHoliday ? "#ff3b30" : isToday ? "#007aff" : isFri ? "#ff9500" : "#86868b", fontSize: 9, minWidth: 32, background: isHoliday ? "rgba(255,59,48,0.10)" : isQuickDay ? "rgba(0,122,255,0.10)" : isToday ? "rgba(0,122,255,0.06)" : "#f5f5f7", cursor: readOnly ? "default" : "pointer", borderBottom: isQuickDay ? "2px solid #007aff" : isHoliday ? "2px solid #ff3b30" : undefined }}>
                        <div>{dayNames[d.getDay()]}</div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                        {isHoliday && <div style={{ fontSize: 6, fontWeight: 700, color: "#ff3b30", lineHeight: 1, marginTop: 1 }}>PH</div>}
                      </th>
                    );
                  })}
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#34c759", fontSize: 9, background: "#f5f5f7" }}>P</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#007aff", fontSize: 9, background: "#f5f5f7" }}>OD</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#ff9500", fontSize: 9, background: "#f5f5f7" }}>OT</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#ff3b30", fontSize: 9, background: "#f5f5f7" }}>SL</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#af52de", fontSize: 9, background: "#f5f5f7" }}>L</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#ff9500", fontSize: 9, background: "#f5f5f7" }}>OT h</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#1d1d1f", fontSize: 9, background: "#f5f5f7" }}>TD</th>
                </tr>
                {/* Pool row */}
                <tr style={{ background: "rgba(0,122,255,0.04)" }}>
                  <td colSpan={2} style={{ padding: "4px 10px", fontWeight: 700, fontSize: 9, color: "#007aff", position: "sticky", left: 0, background: "rgba(0,122,255,0.04)", zIndex: 2 }}>Pool</td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const val = poolMap[day];
                    return (
                      <td key={i} style={{ padding: "2px 1px", textAlign: "center", fontSize: 9, fontWeight: 700, color: val != null ? "#007aff" : "#d1d1d6" }}>
                        {val != null ? val : "·"}
                      </td>
                    );
                  })}
                  <td colSpan={5} />
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s) => {
                  const sum = empSummary(s.id);
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f7" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 700, fontSize: 11, color: "#1d1d1f", position: "sticky", left: 0, background: "#fff", zIndex: 1, whiteSpace: "nowrap" }}>{s.name}</td>
                      <td style={{ padding: "6px 6px", fontSize: 9, color: "#86868b" }}>{s.designation === "LIMO DRIVER" ? "Driver" : s.designation}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const rec = attMap[s.id]?.[day];
                        const st = rec?.status;
                        const clr = st ? ATT_COLORS[st] ?? { bg: "#f5f5f7", color: "#86868b" } : { bg: "transparent", color: "#d1d1d6" };
                        const isQuickDay = quickDay === day;
                        const isEditing = editCell?.staffId === s.id && editCell?.day === day;
                        return (
                          <td key={i} onClick={() => handleCellClick(s.id, day)} style={{ padding: "3px 1px", textAlign: "center", cursor: readOnly ? "default" : "pointer", position: "relative", background: !!holidayMap[day] ? "rgba(255,59,48,0.04)" : isQuickDay ? "rgba(0,122,255,0.03)" : undefined }}>
                            <div style={{ display: "inline-block", padding: "3px 4px", borderRadius: 4, background: clr.bg, color: clr.color, fontWeight: 700, fontSize: 9, minWidth: 26, border: isEditing ? "2px solid #007aff" : "1px solid transparent" }}>
                              {st || "·"}
                              {(rec?.otHours ?? 0) > 0 && (
                                <div style={{ fontSize: 7, fontWeight: 800, color: "#ff9500", lineHeight: 1, marginTop: 1 }}>+{rec!.otHours}h</div>
                              )}
                            </div>
                            {isEditing && (() => {
                              const staffName = s.name;
                              const dayLabel = `${day} ${monthNames[attMonth].slice(0, 3)}`;
                              return (
                                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", padding: 16 }} onClick={() => setEditCell(null)}>
                                  <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", padding: 20, width: "100%", maxWidth: 300, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1d1d1f" }}>{staffName}</div>
                                        <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>{dayLabel} {attYear}</div>
                                      </div>
                                      <button onClick={() => setEditCell(null)} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 28, height: 28, fontSize: 14, color: "#86868b", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                                    </div>
                                    {/* OT hours — independent of status */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: editOtHours ? "rgba(255,149,0,0.08)" : "#f9f9fb", borderRadius: 10, marginBottom: 8, border: editOtHours ? "1px solid rgba(255,149,0,0.2)" : "1px solid #f0f0f0" }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "#ff9500", whiteSpace: "nowrap" }}>OT</span>
                                      <input type="number" placeholder="0" min="0" step="0.5" value={editOtHours} onChange={(e) => setEditOtHours(e.target.value)} style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 13, fontFamily: "inherit", textAlign: "center" }} />
                                      <span style={{ fontSize: 11, color: "#86868b" }}>hrs</span>
                                      {editOtHours && editCell && (
                                        <button onClick={async () => {
                                          setEditOtHours("");
                                          const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, "0")}-${String(editCell.day).padStart(2, "0")}`;
                                          const currentStatus = st || "P";
                                          await upsertAttendance(editCell.staffId, dateStr, currentStatus, 0);
                                          setAttendance((prev) => {
                                            const idx = prev.findIndex((r) => r.staffId === editCell.staffId && r.date === dateStr);
                                            if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...prev[idx], otHours: 0 }; return copy; }
                                            return prev;
                                          });
                                        }} style={{ background: "rgba(255,59,48,0.08)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#ff3b30", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>✕ Clear</button>
                                      )}
                                    </div>
                                    {/* Status buttons */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                      {ATT_STATUSES.map((code) => {
                                        const c = ATT_COLORS[code] ?? { bg: "#f5f5f7", color: "#86868b" };
                                        return (
                                          <button key={code} onClick={() => handleStatusSelect(code)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: st === code ? "2px solid " + c.color : "1px solid #f0f0f0", background: st === code ? c.bg : "#fafafa", color: c.color, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                                            <span style={{ fontWeight: 800, minWidth: 28 }}>{code}</span>
                                            <span style={{ fontWeight: 500, opacity: 0.85 }}>{ATT_LABELS[code]}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#34c759" }}>{sum.counts["P"] || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#007aff" }}>{sum.counts["OD"] || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#ff9500" }}>{sum.counts["OT"] || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#ff3b30" }}>{sum.counts["SL"] || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#af52de" }}>{sum.counts["L"] || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#ff9500" }}>{sum.otTotal || 0}</td>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: 700, fontSize: 10, color: "#1d1d1f" }}>{sum.td}</td>
                    </tr>
                  );
                })}
                {/* Summary row */}
                <tr style={{ background: "#f5f5f7", fontWeight: 700 }}>
                  <td style={{ padding: "8px 10px", fontSize: 11, color: "#1d1d1f", position: "sticky", left: 0, background: "#f5f5f7", zIndex: 1 }}>TOTAL ({filteredStaff.length})</td>
                  <td />
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = daySummary[i + 1];
                    return (
                      <td key={i} style={{ padding: "4px 1px", textAlign: "center", fontSize: 9 }}>
                        <div style={{ color: "#34c759", fontWeight: 700 }}>{d?.present || ""}</div>
                      </td>
                    );
                  })}
                  <td colSpan={7} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {ATT_STATUSES.map((code) => {
              const c = ATT_COLORS[code];
              return (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 20, height: 16, borderRadius: 3, background: c.bg, color: c.color, fontWeight: 700, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{code}</div>
                  <span style={{ fontSize: 10, color: "#86868b" }}>{ATT_LABELS[code]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "absences" && (() => {
        // All non-P records for the month, grouped by employee
        const ABSENCE_STATUSES = ["OD", "SL", "L", "A", "E", "UL", "SUP", "HD", "H", "S", "T", "RW", "OT"];
        const absRecords = attendance.filter((r) => r.status !== "P" && filteredStaff.some((s) => s.id === r.staffId));
        // Group by staffId
        const byStaff = new Map<number, AttendanceRecord[]>();
        for (const r of absRecords) {
          if (!byStaff.has(r.staffId)) byStaff.set(r.staffId, []);
          byStaff.get(r.staffId)!.push(r);
        }
        // Sort by most absent first
        const sortedEntries = Array.from(byStaff.entries()).sort((a, b) => b[1].length - a[1].length);
        // Editing state helper
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _absEditingId = editCell ? `${editCell.staffId}-${editCell.day}` : null;

        // Stats
        const statCounts: Record<string, number> = {};
        for (const r of absRecords) statCounts[r.status] = (statCounts[r.status] || 0) + 1;

        return (
          <div>
            {/* Summary KPIs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {ABSENCE_STATUSES.filter((c) => (statCounts[c] || 0) > 0).map((code) => {
                const c = ATT_COLORS[code] ?? { bg: "#f5f5f7", color: "#86868b" };
                return (
                  <div key={code} style={{ background: c.bg, borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{statCounts[code] || 0}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: c.color }}>{ATT_LABELS[code]}</div>
                  </div>
                );
              })}
              <div style={{ background: "#f5f5f7", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{absRecords.length}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#86868b" }}>Total jours</div>
              </div>
              <div style={{ background: "#f5f5f7", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{sortedEntries.length}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#86868b" }}>Personnes</div>
              </div>
            </div>

            {/* Declare leave shortcut */}
            {!readOnly && !showLeaveForm && (
              <div style={{ marginBottom: 14 }}>
                <button onClick={() => { setShowLeaveForm(true); setLeaveFrom(`${attYear}-${String(attMonth + 1).padStart(2, "0")}-01`); setLeaveTo(`${attYear}-${String(attMonth + 1).padStart(2, "0")}-01`); }} style={{ background: "rgba(175,82,222,0.08)", color: "#af52de", border: "1px solid rgba(175,82,222,0.2)", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  + Declare Leave / Exception
                </button>
              </div>
            )}
            {!readOnly && showLeaveForm && (
              <div style={{ background: "rgba(175,82,222,0.04)", border: "1px solid rgba(175,82,222,0.15)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#af52de" }}>📋 Declare Leave / Exception</div>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setShowLeaveForm(false)} style={{ background: "none", border: "1px solid #e5e5ea", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#86868b", cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>Employee {desigFilter !== "all" ? `(${desigFilter})` : ""}</div>
                    <CustomSelect
                      value={leaveStaffId || ""}
                      onChange={(v) => setLeaveStaffId(v ? Number(v) : "")}
                      placeholder="— Select employee —"
                      searchable
                      searchPlaceholder="Search by name…"
                      options={filteredStaff.map((s) => ({ value: s.id, label: s.name, sublabel: s.designation }))}
                      compact
                      triggerStyle={{ background: "#fff", border: "1px solid #e5e5ea" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>Status</div>
                    <CustomSelect
                      value={leaveStatus}
                      onChange={(v) => setLeaveStatus(String(v))}
                      placeholder="— Status —"
                      options={ATT_STATUSES.map((code) => ({ value: code, label: `${code} — ${ATT_LABELS[code]}`, bg: (ATT_COLORS[code] ?? { bg: "#f5f5f7" }).bg, color: (ATT_COLORS[code] ?? { color: "#86868b" }).color }))}
                      compact
                      triggerStyle={{ background: "#fff", border: "1px solid #e5e5ea" }}
                    />
                  </div>
                  <div style={{ flex: "0 1 auto" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>From</div>
                    <input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 auto" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 4 }}>To</div>
                    <input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={handleLeaveSubmit} disabled={leaveSaving || !leaveStaffId || !leaveFrom || !leaveTo || leaveDaysCount === 0} style={{ background: "#af52de", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!leaveStaffId || !leaveFrom || !leaveTo || leaveDaysCount === 0) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                    {leaveSaving ? "..." : `Apply ${leaveDaysCount} day${leaveDaysCount > 1 ? "s" : ""}`}
                  </button>
                </div>
                {leaveDaysCount > 0 && leaveStaffId && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#86868b" }}>
                    → <strong style={{ color: (ATT_COLORS[leaveStatus] ?? { color: "#86868b" }).color }}>{ATT_LABELS[leaveStatus] ?? leaveStatus}</strong> for <strong>{filteredStaff.find(ss => ss.id === leaveStaffId)?.name ?? staff.find(ss => ss.id === leaveStaffId)?.name}</strong> × {leaveDaysCount} day{leaveDaysCount > 1 ? "s" : ""} ({leaveFrom} → {leaveTo})
                  </div>
                )}
              </div>
            )}

            {/* List per employee — flat table */}
            {(() => {
              // Build flat rows: one row per range per employee
              const allRows: { staffId: number; name: string; designation: string; status: string; from: string; to: string; days: number; otHours: number; records: AttendanceRecord[] }[] = [];
              for (const [staffId, records] of sortedEntries) {
                const s = staff.find((st) => st.id === staffId);
                if (!s) continue;
                const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
                const ranges: { status: string; from: string; to: string; days: number; otHours: number; records: AttendanceRecord[] }[] = [];
                for (const r of sorted) {
                  const last = ranges[ranges.length - 1];
                  if (last && last.status === r.status) {
                    const prevDate = new Date(last.to + "T12:00:00");
                    const curDate = new Date(r.date + "T12:00:00");
                    const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);
                    if (diffDays <= 1) { last.to = r.date; last.days++; last.otHours += r.otHours; last.records.push(r); continue; }
                  }
                  ranges.push({ status: r.status, from: r.date, to: r.date, days: 1, otHours: r.otHours, records: [r] });
                }
                for (const rng of ranges) allRows.push({ staffId, name: s.name, designation: s.designation, ...rng });
              }
              if (allRows.length === 0) return (
                <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No absences for {monthNames[attMonth]} {attYear}</div>
                </div>
              );
              const fmtD = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)}`;
              return (
                <div style={{ borderRadius: 12, border: "1px solid #e5e5ea", overflow: "auto", background: "#fff" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "#f9f9fb" }}>
                        <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b" }}>Employee</th>
                        <th style={{ padding: "7px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b" }}>Role</th>
                        <th style={{ padding: "7px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#86868b", width: 50 }}>Status</th>
                        <th style={{ padding: "7px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b" }}>Period</th>
                        <th style={{ padding: "7px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#86868b", width: 40 }}>Days</th>
                        <th style={{ padding: "7px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#ff9500", width: 45 }}>OT h</th>
                        {!readOnly && <th style={{ padding: "7px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#86868b", width: 120 }}>Change</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row, idx) => {
                        const c = ATT_COLORS[row.status] ?? { bg: "#f5f5f7", color: "#86868b" };
                        const fromD = new Date(row.from + "T12:00:00");
                        const toD = new Date(row.to + "T12:00:00");
                        const rangeLabel = row.days === 1 ? fmtD(fromD) : `${fmtD(fromD)} → ${fmtD(toD)}`;
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f5f5f7" }}>
                            <td style={{ padding: "6px 10px", fontWeight: 700, fontSize: 12, color: "#1d1d1f", whiteSpace: "nowrap" }}>{row.name}</td>
                            <td style={{ padding: "6px 6px", fontSize: 9, color: "#86868b", whiteSpace: "nowrap" }}>{row.designation === "LIMO DRIVER" ? "Driver" : row.designation}</td>
                            <td style={{ padding: "5px 4px", textAlign: "center" }}>
                              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 5, background: c.bg, color: c.color, fontWeight: 700, fontSize: 10, minWidth: 30 }}>{row.status}</span>
                            </td>
                            <td style={{ padding: "6px 6px", fontSize: 12, fontWeight: 600, color: "#1d1d1f", whiteSpace: "nowrap" }}>{rangeLabel}</td>
                            <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#86868b" }}>{row.days}</td>
                            <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, fontSize: 11, color: row.otHours > 0 ? "#ff9500" : "#d1d1d6" }}>{row.otHours > 0 ? row.otHours : "—"}</td>
                            {!readOnly && (
                              <td style={{ padding: "4px 4px", textAlign: "center" }}>
                                <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                                  {ATT_STATUSES.filter(cc => cc !== row.status && cc !== "OT").slice(0, 5).map((code) => {
                                    const cc = ATT_COLORS[code] ?? { bg: "#f5f5f7", color: "#86868b" };
                                    return (
                                      <button key={code} onClick={async () => {
                                        const batch = row.records.map((r) => ({ staff_id: r.staffId, date: r.date, status: code, ot_hours: 0 }));
                                        await bulkUpsertAttendance(batch);
                                        loadData();
                                      }} style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: cc.bg, color: cc.color, fontWeight: 700, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }} title={`Change to ${ATT_LABELS[code]}`}>{code}</button>
                                    );
                                  })}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL VIEW — auto-calculated from attendance + staff contract + deductions
// ═══════════════════════════════════════════════════════════════════════════════

/* ── Computed payroll line for one employee ── */
interface PayrollLine {
  staff: Staff;
  // attendance counts
  workingDays: number; offDays: number; publicHolidays: number;
  leavePaid: number; sickLeavePaid: number; unpaidLeave: number;
  emergencyLeave: number; sickUnpaid: number; absentDays: number;
  halfDays: number; otDays: number; otHours: number; remoteDays: number;
  totalDaysMonth: number;
  // payable days = working + publicHolidays + leavePaid + sickLeavePaid + halfDays*0.5 + otDays + remoteDays
  payableDays: number;
  // unpaid days = unpaidLeave + emergencyLeave + sickUnpaid + absentDays
  unpaidDays: number;
  // money
  dailyRate: number; otHourlyRate: number; otDayRate: number;
  contractSalary: number; // total_on_contract
  earnedSalary: number;   // contractSalary * payableDays / 30
  unpaidDeduction: number; // dailyRate * unpaidDays
  otHoursAmount: number;   // otHourlyRate * otHours
  otDaysAmount: number;    // otDayRate * otDays
  otAmount: number;        // otHoursAmount + otDaysAmount
  gpssa: number;           // 5% basic if isLocal
  grossEarning: number;    // earnedSalary + otAmount
  // manual deductions
  deductions: Deduction[];
  totalManualDeductions: number;
  totalDeductions: number; // gpssa + unpaidDeduction + totalManualDeductions
  netSalary: number;       // grossEarning - totalDeductions
}

function PayrollView({ readOnly = false }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"summary" | "payslip" | "recap">("summary");
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [payMonth, setPayMonth] = useState(prevMonth.getMonth() + 1);
  const [payYear, setPayYear] = useState(prevMonth.getFullYear());
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // payslip
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const monthKey = `${payYear}-${String(payMonth).padStart(2, "0")}`;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // load staff + attendance + deductions
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, a, d] = await Promise.all([
          fetchStaff(false),
          fetchAttendance(payMonth - 1, payYear),
          fetchDeductions(monthKey),
        ]);
        setStaffList(s); setAttendance(a); setDeductions(d);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [payMonth, payYear, monthKey]);

  // ── Compute payroll lines from attendance + staff + deductions ──
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const payrollLines: PayrollLine[] = useMemo(() => {
    const attMap: Record<number, { status: string; otHours: number }[]> = {};
    for (const r of attendance) {
      if (!attMap[r.staffId]) attMap[r.staffId] = [];
      attMap[r.staffId].push({ status: r.status, otHours: r.otHours });
    }
    const dedMap: Record<number, Deduction[]> = {};
    for (const d of deductions) {
      if (!dedMap[d.staffId]) dedMap[d.staffId] = [];
      dedMap[d.staffId].push(d);
    }

    return staffList.map(s => {
      const recs = attMap[s.id] ?? [];
      const cnt = (codes: string[]) => recs.filter(r => codes.includes(r.status)).length;
      const workingDays = cnt(["P"]);
      const offDays = cnt(["OD"]);
      const publicHolidays = cnt(["H"]);
      const leavePaid = cnt(["L"]);
      const sickLeavePaid = cnt(["SL"]);
      const unpaidLeave = cnt(["UL"]);
      const emergencyLeave = cnt(["E"]);
      const sickUnpaid = cnt(["SUP"]);
      const absentDays = cnt(["A"]);
      const halfDays = cnt(["HD"]);
      const otDays = cnt(["OT"]);
      const remoteDays = cnt(["RW"]);
      const otHours = recs.reduce((sum, r) => sum + r.otHours, 0);
      const totalDaysMonth = recs.length;

      // payable = working + off days (rest) + holidays + paid leaves + half*0.5 + OT days + remote
      const rawPayable = workingDays + offDays + publicHolidays + leavePaid + sickLeavePaid + halfDays * 0.5 + otDays + remoteDays;
      const unpaidDays = unpaidLeave + emergencyLeave + sickUnpaid + absentDays;
      // Payroll always based on 30 days — auto-adjust if calendar < 30 (e.g. Feb=28 → adj=2)
      const calendarDays = new Date(payYear, payMonth, 0).getDate();
      const adj = calendarDays < 30 ? 30 - calendarDays : 0;
      const payableDays = rawPayable + adj;

      const contractSalary = s.totalOnContract ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _basicSalary = s.basicSalary ?? 0;
      const dailyRate = contractSalary / 30;

      // OT rates stored directly on each staff record
      const otHourlyRate = s.otHourRate;
      const otDayRate = s.otDayRate;

      // earned = full contract if payable >= 30, otherwise prorated
      const earnedSalary = payableDays >= 30 ? contractSalary : Math.round(dailyRate * payableDays);
      const unpaidDeduction = Math.round(dailyRate * unpaidDays);
      const otHoursAmount = Math.round(otHourlyRate * otHours);
      const otDaysAmount = Math.round(otDayRate * otDays);
      const otAmount = otHoursAmount + otDaysAmount;

      // GPSSA: 11% of total salary for locals (UAE nationals pension - employee contribution)
      const gpssa = s.isLocal ? Math.round(contractSalary * 0.11) : 0;

      const grossEarning = earnedSalary + otAmount;

      const staffDeds = dedMap[s.id] ?? [];
      const totalManualDeductions = staffDeds.reduce((sum, d) => sum + d.amount, 0);
      const totalDeductions = gpssa + unpaidDeduction + totalManualDeductions;
      const netSalary = grossEarning - totalDeductions;

      return {
        staff: s, workingDays, offDays, publicHolidays, leavePaid, sickLeavePaid,
        unpaidLeave, emergencyLeave, sickUnpaid, absentDays, halfDays, otDays,
        otHours, remoteDays, totalDaysMonth, payableDays, unpaidDays,
        dailyRate, otHourlyRate, otDayRate, contractSalary, earnedSalary, unpaidDeduction,
        otHoursAmount, otDaysAmount, otAmount, gpssa, grossEarning, deductions: staffDeds, totalManualDeductions,
        totalDeductions, netSalary,
      };
    });
  }, [staffList, attendance, deductions]);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const fmtD = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  const thS: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px" };
  const tdS: React.CSSProperties = { padding: "10px 14px", fontSize: 12, fontWeight: 500 };
  const catBadge = (c: string) => {
    const cl = c === "DRIVER" ? "#007aff" : "#af52de";
    return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 6, background: `${cl}14`, color: cl };
  };

  // filtered
  const filtered = useMemo(() => {
    let list = payrollLines;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.staff.name.toLowerCase().includes(q) || (p.staff.employeeCode ?? "").toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") list = list.filter(p => p.staff.category === categoryFilter);
    return list;
  }, [payrollLines, search, categoryFilter]);

  const totals = useMemo(() => ({
    gross: sum_(filtered.map(p => p.grossEarning)),
    net: sum_(filtered.map(p => p.netSalary)),
    deductions: sum_(filtered.map(p => p.totalDeductions)),
    ot: sum_(filtered.map(p => p.otAmount)),
    headcount: filtered.length,
  }), [filtered]);

  const categories = useMemo(() => [...new Set(payrollLines.map(p => p.staff.category))].sort(), [payrollLines]);

  const selectedLine = useMemo(() => payrollLines.find(p => p.staff.id === selectedStaffId) ?? null, [payrollLines, selectedStaffId]);

  const subTabs = [
    { id: "summary" as const, label: "📋 Summary" },
    { id: "payslip" as const, label: "🧾 Payslip" },
    { id: "recap" as const, label: "📊 Monthly Recap" },
  ];

  return (
    <div className="fu">
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700,
            background: subTab === t.id ? "#1d1d1f" : "#f2f2f7", color: subTab === t.id ? "#fff" : "#86868b",
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {subTab === "summary" && (
        <div>
          {/* Month/Year selector */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <CustomSelect value={String(payMonth)} onChange={v => setPayMonth(Number(v))}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} compact />
            <CustomSelect value={String(payYear)} onChange={v => setPayYear(Number(v))}
              options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))} compact />
          </div>

          {/* ── ATTENDANCE CHECK ── */}
          {(() => {
            const calDays = new Date(payYear, payMonth, 0).getDate();
            const attByStaff: Record<number, number> = {};
            for (const r of attendance) {
              attByStaff[r.staffId] = (attByStaff[r.staffId] || 0) + 1;
            }
            const complete = staffList.filter(s => (attByStaff[s.id] || 0) >= calDays);
            const incomplete = staffList.filter(s => (attByStaff[s.id] || 0) > 0 && (attByStaff[s.id] || 0) < calDays);
            const missing = staffList.filter(s => !(attByStaff[s.id]));
            const allOk = incomplete.length === 0 && missing.length === 0;
            return (
              <div style={{ background: allOk ? "rgba(52,199,89,0.06)" : "rgba(255,149,0,0.06)", border: `1px solid ${allOk ? "rgba(52,199,89,0.2)" : "rgba(255,149,0,0.25)"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{allOk ? "✅" : "⚠️"}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: allOk ? "#34c759" : "#ff9500" }}>
                    {allOk ? "Attendance complete" : "Attendance incomplete"}
                  </span>
                  <span style={{ fontSize: 11, color: "#86868b" }}>
                    {MONTHS[payMonth - 1]} {payYear} — {calDays} days
                  </span>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: "#34c759" }}>{complete.length} ✓ complete</span>
                    {incomplete.length > 0 && <span style={{ color: "#ff9500" }}>{incomplete.length} partial</span>}
                    {missing.length > 0 && <span style={{ color: "#ff3b30" }}>{missing.length} no data</span>}
                  </div>
                </div>
                {(incomplete.length > 0 || missing.length > 0) && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {incomplete.map(s => (
                      <span key={s.id} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, background: "rgba(255,149,0,0.1)", color: "#ff9500", fontSize: 10, fontWeight: 700 }}>
                        {s.name} ({attByStaff[s.id]}/{calDays})
                      </span>
                    ))}
                    {missing.map(s => (
                      <span key={s.id} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, background: "rgba(255,59,48,0.08)", color: "#ff3b30", fontSize: 10, fontWeight: 700 }}>
                        {s.name} (0/{calDays})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* KPI cards */}
          <div className="g3" style={{ marginBottom: 20 }}>
            <Kpi label="Net Payroll" value={`${fmt(totals.net)} AED`} color="#1d1d1f" />
            <Kpi label="Gross Earnings" value={`${fmt(totals.gross)} AED`} color="#007aff" />
            <Kpi label="Total Deductions" value={`${fmt(totals.deductions)} AED`} color="#ff3b30" />
            <Kpi label="Total OT" value={`${fmt(totals.ot)} AED`} color="#ff9500" />
            <Kpi label="Headcount" value={String(totals.headcount)} color="#5856d6" />
            <Kpi label="Avg Net / Employee" value={totals.headcount > 0 ? `${fmt(Math.round(totals.net / totals.headcount))} AED` : "—"} color="#34c759" />
          </div>

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
            <input placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, maxWidth: 280, padding: "8px 14px", borderRadius: 10, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }} />
            <CustomSelect value={categoryFilter} onChange={v => setCategoryFilter(String(v))}
              options={[{ value: "all", label: "All categories" }, ...categories.map(c => ({ value: c, label: c }))]} compact />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#86868b", fontSize: 13, fontWeight: 600 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>No attendance data</div>
              <div style={{ fontSize: 12, color: "#86868b", marginTop: 4 }}>Fill attendance for {MONTHS[payMonth - 1]} {payYear} first</div>
            </Card>
          ) : (
            <Card>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f2f2f7" }}>
                      <th style={thS}>Code</th>
                      <th style={thS}>Employee</th>
                      <th style={thS}>Category</th>
                      <th style={{ ...thS, textAlign: "center" }}>Days</th>
                      <th style={{ ...thS, textAlign: "right" }}>Contract</th>
                      <th style={{ ...thS, textAlign: "right" }}>OT</th>
                      <th style={{ ...thS, textAlign: "right" }}>Gross</th>
                      <th style={{ ...thS, textAlign: "right" }}>Deductions</th>
                      <th style={{ ...thS, textAlign: "right", color: "#1d1d1f" }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.staff.id} onClick={() => { setSelectedStaffId(p.staff.id); setSubTab("payslip"); }}
                        style={{ borderBottom: "1px solid #f2f2f7", cursor: "pointer", transition: "background .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        <td style={{ ...tdS, fontWeight: 700, fontSize: 11, color: "#86868b" }}>{p.staff.employeeCode ?? "—"}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: "#1d1d1f" }}>{p.staff.name}</td>
                        <td style={tdS}><span style={catBadge(p.staff.category)}>{p.staff.category}</span></td>
                        <td style={{ ...tdS, textAlign: "center", fontSize: 11 }}>
                          <span style={{ color: "#34c759", fontWeight: 700 }}>{p.payableDays}</span>
                          {p.unpaidDays > 0 && <span style={{ color: "#ff3b30", fontWeight: 600 }}> /{p.unpaidDays}</span>}
                        </td>
                        <td style={{ ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(p.contractSalary)}</td>
                        <td style={{ ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", color: p.otAmount > 0 ? "#ff9500" : "#c7c7cc" }}>{fmt(p.otAmount)}</td>
                        <td style={{ ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(p.grossEarning)}</td>
                        <td style={{ ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", color: p.totalDeductions > 0 ? "#ff3b30" : "#c7c7cc" }}>{p.totalDeductions > 0 ? `-${fmt(p.totalDeductions)}` : "0"}</td>
                        <td style={{ ...tdS, textAlign: "right", fontWeight: 800, color: "#1d1d1f", fontVariantNumeric: "tabular-nums" }}>{fmt(p.netSalary)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #e5e5ea", background: "#fafafa" }}>
                      <td colSpan={4} style={{ ...tdS, fontWeight: 800, fontSize: 11, color: "#86868b", textTransform: "uppercase" }}>Total ({filtered.length})</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(sum_(filtered.map(p => p.contractSalary)))}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#ff9500" }}>{fmt(totals.ot)}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.gross)}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#ff3b30" }}>{totals.deductions > 0 ? `-${fmt(totals.deductions)}` : "0"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 900, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── PAYSLIP ── */}
      {subTab === "payslip" && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <CustomSelect value={selectedStaffId ? String(selectedStaffId) : ""} onChange={v => setSelectedStaffId(Number(v))}
              options={staffList.map(s => ({ value: String(s.id), label: `${s.employeeCode ?? s.staffNumber} — ${s.name}` }))} compact />
            <button onClick={() => window.print()} style={{
              marginLeft: "auto", padding: "8px 16px", borderRadius: 10, border: "1px solid #e5e5ea",
              background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>🖨 Print</button>
          </div>

          {!selectedLine ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Select an employee</div>
              <div style={{ fontSize: 12, color: "#86868b", marginTop: 4 }}>Choose an employee to view their payslip for {MONTHS[payMonth - 1]} {payYear}</div>
            </Card>
          ) : (
            <Card style={{ padding: 28, maxWidth: 700 }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>CHABE LUXURY TRANSPORT LLC</div>
                <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>11B Street Warehouse 3b/27 — AL KHABAISI — Dubai, UAE</div>
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: "#007aff" }}>
                  Salary Slip — {MONTHS[payMonth - 1]} {payYear}
                </div>
              </div>

              {/* Employee info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, padding: 16, background: "#f9f9fb", borderRadius: 12 }}>
                <div><span style={{ fontSize: 10, color: "#86868b", fontWeight: 600 }}>NAME</span><div style={{ fontSize: 13, fontWeight: 700 }}>{selectedLine.staff.name}</div></div>
                <div><span style={{ fontSize: 10, color: "#86868b", fontWeight: 600 }}>EMPLOYEE CODE</span><div style={{ fontSize: 13, fontWeight: 700 }}>{selectedLine.staff.employeeCode ?? "—"}</div></div>
                <div><span style={{ fontSize: 10, color: "#86868b", fontWeight: 600 }}>CATEGORY</span><div><span style={catBadge(selectedLine.staff.category)}>{selectedLine.staff.category}</span></div></div>
                <div><span style={{ fontSize: 10, color: "#86868b", fontWeight: 600 }}>DESIGNATION</span><div style={{ fontSize: 13, fontWeight: 700 }}>{selectedLine.staff.designation || "—"}</div></div>
              </div>

              {/* Attendance */}
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Attendance</div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <tbody>
                  {[
                    ["Working Days (P)", selectedLine.workingDays],
                    ["Off Days (OD)", selectedLine.offDays],
                    ["Public Holidays (H)", selectedLine.publicHolidays],
                    ["Leave Paid (L)", selectedLine.leavePaid],
                    ["Sick Leave Paid (SL)", selectedLine.sickLeavePaid],
                    ["Overtime Days (OT)", selectedLine.otDays],
                    ["Remote Work (RW)", selectedLine.remoteDays],
                    ["Half Days (HD)", selectedLine.halfDays],
                    ["Payable Days", selectedLine.payableDays],
                    ["Unpaid Leave (UL)", selectedLine.unpaidLeave],
                    ["Emergency Leave (E)", selectedLine.emergencyLeave],
                    ["Absent (A)", selectedLine.absentDays],
                    ["Unpaid Days", selectedLine.unpaidDays],
                  ].filter(([, v]) => (v as number) > 0 || ["Payable Days", "Unpaid Days"].includes(String([0]))).map(([label, val], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f2f2f7", ...(label === "Payable Days" || label === "Unpaid Days" ? { background: "#f9f9fb", fontWeight: 800 } : {}) }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: label === "Payable Days" || label === "Unpaid Days" ? 800 : 500 }}>{label as string}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", color: label === "Unpaid Days" && (val as number) > 0 ? "#ff3b30" : undefined }}>{fmtD(val as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Earnings */}
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#34c759", textTransform: "uppercase", letterSpacing: "0.5px" }}>Earnings</div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <tbody>
                  {[
                    ["Basic Salary", selectedLine.staff.basicSalary ?? 0],
                    ["Housing Allowance", selectedLine.staff.housingAllowance ?? 0],
                    ["Transport Allowance", selectedLine.staff.transportAllowance ?? 0],
                    ["School Allowance", selectedLine.staff.schoolAllowance],
                    ["Monthly Bonus", selectedLine.staff.monthlyBonus],
                    ["Contract Total", selectedLine.contractSalary],
                  ].filter(([, v]) => (v as number) > 0).map(([label, val], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f2f2f7", ...(label === "Contract Total" ? { background: "#f9f9fb" } : {}) }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: label === "Contract Total" ? 800 : 500 }}>{label as string}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(val as number)} AED</td>
                    </tr>
                  ))}
                  {selectedLine.earnedSalary !== selectedLine.contractSalary && (
                    <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#ff9500" }}>Earned ({fmtD(selectedLine.payableDays)}/30 days)</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500", fontVariantNumeric: "tabular-nums" }}>{fmt(selectedLine.earnedSalary)} AED</td>
                    </tr>
                  )}
                  {selectedLine.otHoursAmount > 0 && (
                    <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500 }}>OT Hours ({fmtD(selectedLine.otHours)} hrs × {fmt(selectedLine.otHourlyRate)} AED/hr)</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500", fontVariantNumeric: "tabular-nums" }}>{fmt(selectedLine.otHoursAmount)} AED</td>
                    </tr>
                  )}
                  {selectedLine.otDaysAmount > 0 && (
                    <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500 }}>OT Days ({selectedLine.otDays} days × {fmt(selectedLine.otDayRate)} AED/day)</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff9500", fontVariantNumeric: "tabular-nums" }}>{fmt(selectedLine.otDaysAmount)} AED</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: "2px solid #e5e5ea", background: "#f0fdf0" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 800 }}>Gross Earnings</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 800, textAlign: "right", color: "#34c759", fontVariantNumeric: "tabular-nums" }}>{fmt(selectedLine.grossEarning)} AED</td>
                  </tr>
                </tbody>
              </table>

              {/* Deductions */}
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#ff3b30", textTransform: "uppercase", letterSpacing: "0.5px" }}>Deductions</div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <tbody>
                  {selectedLine.gpssa > 0 && (
                    <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500 }}>GPSSA Pension (11%)</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>-{fmt(selectedLine.gpssa)} AED</td>
                    </tr>
                  )}
                  {selectedLine.unpaidDeduction > 0 && (
                    <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500 }}>Unpaid days ({selectedLine.unpaidDays} × {fmt(Math.round(selectedLine.dailyRate))} AED/day)</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>-{fmt(selectedLine.unpaidDeduction)} AED</td>
                    </tr>
                  )}
                  {selectedLine.deductions.map(d => (
                    <tr key={d.id} style={{ borderBottom: "1px solid #f2f2f7" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500 }}>
                        {d.deductionType === "advance" ? "Advance" : d.deductionType === "adjustment" ? "Adjustment" : "Other"}
                        {d.label && <span style={{ color: "#86868b" }}> — {d.label}</span>}
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>-{fmt(d.amount)} AED</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #e5e5ea", background: "#fef2f2" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 800 }}>Total Deductions</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 800, textAlign: "right", color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>-{fmt(selectedLine.totalDeductions)} AED</td>
                  </tr>
                </tbody>
              </table>

              {/* NET TOTAL */}
              <div style={{
                background: "linear-gradient(135deg, #1d1d1f, #2d2d2f)", borderRadius: 14, padding: "18px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px" }}>NET SALARY</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmt(selectedLine.netSalary)} AED</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── MONTHLY RECAP ── */}
      {subTab === "recap" && (
        <MonthlyRecapTab month={payMonth - 1} year={payYear} readOnly={readOnly} staff={staffList} monthNames={MONTHS.map((m, i) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i])} />
      )}
    </div>
  );
}

function HRView({ readOnly = false }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"employees" | "contracts" | "documents" | "deductions" | "analytics">("employees");
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  // Documents state
  const [docList, setDocList] = useState<StaffDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docStaffFilter, setDocStaffFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | "all">("all");
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [newDocStaffId, setNewDocStaffId] = useState("");
  const [newDocType, setNewDocType] = useState<DocumentType>("contract");
  const [newDocLabel, setNewDocLabel] = useState("");
  const [newDocValidFrom, setNewDocValidFrom] = useState("");
  const [newDocValidUntil, setNewDocValidUntil] = useState("");
  const [newDocNotes, setNewDocNotes] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [profileDocs, setProfileDocs] = useState<StaffDocument[]>([]);
  const [profileDocLoading, setProfileDocLoading] = useState(false);
  // Deductions state
  const [dedMonth, setDedMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [dedList, setDedList] = useState<Deduction[]>([]);
  const [dedLoading, setDedLoading] = useState(false);
  const [dedStaffFilter, setDedStaffFilter] = useState("all");
  const [showAddDed, setShowAddDed] = useState(false);
  const [newDedStaffId, setNewDedStaffId] = useState("");
  const [newDedType, setNewDedType] = useState<DeductionType>("advance");
  const [newDedAmount, setNewDedAmount] = useState("");
  const [newDedLabel, setNewDedLabel] = useState("");
  const [dedSaving, setDedSaving] = useState(false);
  const [newDedInstallments, setNewDedInstallments] = useState("1");
  const [editDedId, setEditDedId] = useState<number | null>(null);
  const [editDedAmount, setEditDedAmount] = useState("");
  const [editDedLabel, setEditDedLabel] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupDeds, setGroupDeds] = useState<Deduction[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newDesig, setNewDesig] = useState("LIMO DRIVER");
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffCategory, setStaffCategory] = useState("all");
  const [profileStaff, setProfileStaff] = useState<Staff | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "contract" | "documents" | "attendance" | "account">("info");
  const [editingProfile, setEditingProfile] = useState(false);
  // Account management state
  const [accountEmail, setAccountEmail] = useState("");
  const [accountCreating, setAccountCreating] = useState(false);
  const [accountTempPassword, setAccountTempPassword] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkInviteList, setBulkInviteList] = useState<Staff[]>([]);
  const [bulkInviteEmails, setBulkInviteEmails] = useState<Record<number, string>>({});
  const [bulkInviteProgress, setBulkInviteProgress] = useState<Record<number, "pending" | "success" | "error">>({});
  const [bulkInviteResults, setBulkInviteResults] = useState<Record<number, string>>({});
  const [bulkInviting, setBulkInviting] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, Any>>({});
  const [newEmployeeCode, setNewEmployeeCode] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDateOfArrival, setNewDateOfArrival] = useState("");
  const [newIsLocal, setNewIsLocal] = useState(false);
  // Profile attendance (independent fetch)
  const [profileAttendance, setProfileAttendance] = useState<AttendanceRecord[]>([]);
  const [profileAttMonth, setProfileAttMonth] = useState(new Date().getMonth());
  const [profileAttYear, setProfileAttYear] = useState(new Date().getFullYear());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadAllStaff = async () => {
    try { const s = await fetchStaffWithProfiles(true); setAllStaff(s); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadAllStaff().then(() => setLoading(false)); }, []);

  // Fetch attendance for profile modal
  useEffect(() => {
    if (!profileStaff || profileTab !== "attendance") return;
    fetchAttendance(profileAttMonth, profileAttYear).then(a => setProfileAttendance(a)).catch(console.error);
  }, [profileStaff, profileTab, profileAttMonth, profileAttYear]);

  // Fetch deductions for deductions sub-tab
  const loadDeductions = async (month: string) => {
    setDedLoading(true);
    try { const d = await fetchDeductions(month); setDedList(d); } catch (e) { console.error(e); }
    setDedLoading(false);
  };
  useEffect(() => { if (subTab === "deductions") loadDeductions(dedMonth); }, [subTab, dedMonth]);

  // Fetch documents for documents sub-tab
  const loadDocuments = async () => {
    setDocLoading(true);
    try { const d = await fetchStaffDocuments(); setDocList(d); } catch (e) { console.error(e); }
    setDocLoading(false);
  };
  useEffect(() => { if (subTab === "documents") loadDocuments(); }, [subTab]);

  // Fetch documents for profile modal
  useEffect(() => {
    if (!profileStaff || profileTab !== "documents") return;
    setProfileDocLoading(true);
    fetchStaffDocuments(profileStaff.id).then(d => setProfileDocs(d)).catch(console.error).finally(() => setProfileDocLoading(false));
  }, [profileStaff, profileTab]);

  const handleAddDocument = async () => {
    if (!newDocStaffId || !newDocType) return;
    setDocSaving(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (newDocFile) {
        fileUrl = await uploadStaffDocumentFile(Number(newDocStaffId), newDocFile, newDocType);
        fileName = newDocFile.name;
      }
      await createStaffDocument({
        staff_id: Number(newDocStaffId),
        document_type: newDocType,
        label: newDocLabel.trim() || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        valid_from: newDocValidFrom || null,
        valid_until: newDocValidUntil || null,
        notes: newDocNotes.trim() || null,
      });
      setNewDocStaffId(""); setNewDocType("contract"); setNewDocLabel(""); setNewDocValidFrom(""); setNewDocValidUntil(""); setNewDocNotes(""); setNewDocFile(null); setShowAddDoc(false);
      await loadDocuments();
    } catch (e: Any) { alert(e.message); }
    setDocSaving(false);
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    try { await deleteStaffDocument(id); await loadDocuments(); } catch (e: Any) { alert(e.message); }
  };

  const handleAddDeduction = async () => {
    if (!newDedStaffId || !newDedAmount) return;
    setDedSaving(true);
    try {
      const inst = Number(newDedInstallments) || 1;
      if (inst > 1) {
        await createInstallmentDeductions({
          staff_id: Number(newDedStaffId), start_month: dedMonth,
          deduction_type: newDedType, total_amount: Number(newDedAmount),
          installments: inst, label: newDedLabel.trim() || null,
        });
      } else {
        const amt = Number(newDedAmount);
        await createDeduction({ staff_id: Number(newDedStaffId), month: dedMonth, deduction_type: newDedType, amount: amt, label: newDedLabel.trim() || null, total_amount: amt, installments: 1, installment_number: 1 });
      }
      setNewDedStaffId(""); setNewDedAmount(""); setNewDedLabel(""); setNewDedInstallments("1"); setShowAddDed(false);
      await loadDeductions(dedMonth);
    } catch (e: Any) { alert(e.message); }
    setDedSaving(false);
  };

  const handleUpdateDeduction = async (id: number) => {
    try {
      await updateDeduction(id, { amount: Number(editDedAmount), label: editDedLabel.trim() || null });
      setEditDedId(null);
      await loadDeductions(dedMonth);
    } catch (e: Any) { alert(e.message); }
  };

  const handleDeleteDeduction = async (id: number) => {
    if (!confirm("Delete this deduction?")) return;
    try { await deleteDeduction(id); await loadDeductions(dedMonth); } catch (e: Any) { alert(e.message); }
  };

  const handleAddStaff = async () => {
    if ((!newFirstName.trim() && !newLastName.trim() && !newName.trim()) || !newNumber.trim()) return;
    setStaffSaving(true);
    try {
      const fn = newFirstName.trim().toUpperCase();
      const ln = newLastName.trim().toUpperCase();
      const fullName = fn && ln ? `${ln} ${fn}` : newName.trim().toUpperCase();
      const cat = newEmployeeCode.toUpperCase().startsWith("D") ? "DRIVER" : newEmployeeCode.toUpperCase().startsWith("S") ? "STAFF" : "DRIVER";
      await createStaff({
        staff_number: parseInt(newNumber, 10),
        name: fullName,
        designation: newDesig,
        employee_code: newEmployeeCode.trim().toUpperCase() || undefined,
        first_name: fn || undefined,
        last_name: ln || undefined,
        category: cat,
        date_of_arrival: newDateOfArrival || undefined,
        is_local: newIsLocal,
      });
      setShowAddStaff(false);
      setNewName(""); setNewNumber(""); setNewEmployeeCode(""); setNewFirstName(""); setNewLastName(""); setNewDateOfArrival(""); setNewIsLocal(false);
      loadAllStaff();
    } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
    setStaffSaving(false);
  };

  const handleSaveProfile = async () => {
    if (!profileStaff) return;
    setStaffSaving(true);
    try {
      const fn = (editFields.first_name as string || "").trim();
      const ln = (editFields.last_name as string || "").trim();
      const input: Partial<StaffInput> = {
        employee_code: (editFields.employee_code as string || "").trim() || undefined,
        employee_id: (editFields.employee_id as string || "").trim() || undefined,
        first_name: fn || undefined,
        last_name: ln || undefined,
        name: fn && ln ? `${ln} ${fn}`.toUpperCase() : undefined,
        designation: editFields.designation as string || undefined,
        category: editFields.category as string || undefined,
        date_of_arrival: (editFields.date_of_arrival as string) || undefined,
        release_date: (editFields.release_date as string) || undefined,
        is_local: Boolean(editFields.is_local),
        ticket_frequency: editFields.ticket_frequency != null ? Number(editFields.ticket_frequency) : 2,
        notes: (editFields.notes as string) || undefined,
        basic_salary: editFields.basic_salary !== "" && editFields.basic_salary != null ? Number(editFields.basic_salary) : undefined,
        housing_allowance: editFields.housing_allowance !== "" && editFields.housing_allowance != null ? Number(editFields.housing_allowance) : undefined,
        transport_allowance: editFields.transport_allowance !== "" && editFields.transport_allowance != null ? Number(editFields.transport_allowance) : undefined,
        school_allowance: Number(editFields.school_allowance) || 0,
        monthly_bonus: Number(editFields.monthly_bonus) || 0,
        total_on_contract: editFields.total_on_contract !== "" && editFields.total_on_contract != null ? Number(editFields.total_on_contract) : undefined,
        ot_hour_rate: editFields.ot_hour_rate != null ? Number(editFields.ot_hour_rate) || 0 : undefined,
        ot_hour_rate_holiday: editFields.ot_hour_rate_holiday != null ? Number(editFields.ot_hour_rate_holiday) || 0 : undefined,
        ot_day_rate: editFields.ot_day_rate != null ? Number(editFields.ot_day_rate) || 0 : undefined,
      };
      await updateStaff(profileStaff.id, input);
      setEditingProfile(false);
      const freshList = await fetchStaff(true);
      setAllStaff(freshList);
      const found = freshList.find(s => s.id === profileStaff.id);
      if (found) setProfileStaff(found);
    } catch (e) { alert(e instanceof Error ? e.message : "Error saving"); }
    setStaffSaving(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#86868b" }}>Loading HR data...</div>;

  // ── Shared computed data ──
  // Status is now computed from release_date (contract end)
  const isActive = (s: Staff) => !s.releaseDate || new Date(s.releaseDate) >= new Date();
  const activeList = allStaff.filter(isActive);
  const inactiveList = allStaff.filter(s => !isActive(s));
  const baseList = showInactive ? inactiveList : activeList;
  const filteredList = baseList.filter(s => {
    const q = staffSearch.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.employeeCode || "").toLowerCase().includes(q) || s.designation.toLowerCase().includes(q) || (s.firstName || "").toLowerCase().includes(q) || (s.lastName || "").toLowerCase().includes(q);
    const matchCat = staffCategory === "all" || s.category === staffCategory;
    return matchSearch && matchCat;
  });

  // ── Helpers ──
  const tenure = (doa: string | null) => {
    if (!doa) return "—";
    const d = new Date(doa); const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (months < 1) return "< 1m";
    if (months < 12) return `${months}m`;
    const y = Math.floor(months / 12); const m = months % 12;
    return m ? `${y}y ${m}m` : `${y}y`;
  };
  const tenureMonths = (doa: string | null): number => {
    if (!doa) return 0;
    const d = new Date(doa); const now = new Date();
    return (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
  };
  const isTicketEligible = (doa: string | null, freq: number): boolean => {
    if (!doa || freq === 0) return false;
    const arrivalYear = new Date(doa).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsSince = currentYear - arrivalYear;
    if (yearsSince < freq) return false;
    return yearsSince % freq === 0;
  };
  const desigBadge = (d: string) => {
    const c = d === "LIMO DRIVER" ? "#007aff" : d === "OPERATIONS" ? "#34c759" : d === "CAR WASHER" ? "#ff9500" : d === "LOCAL" ? "#5856d6" : d === "PRO" ? "#af52de" : "#8e8e93";
    return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 6, background: `${c}14`, color: c };
  };
  const catBadge = (c: string) => {
    const cl = c === "DRIVER" ? "#007aff" : "#af52de";
    return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px", borderRadius: 6, background: `${cl}14`, color: cl };
  };
  const thS: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase" };
  const tdS: React.CSSProperties = { padding: "10px 14px" };
  const fieldLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" };
  const fieldValue: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1d1d1f" };
  const editInput: React.CSSProperties = { width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" };

  // ── KPIs ──
  const totalDrivers = activeList.filter(s => s.category === "DRIVER").length;
  const totalStaffMembers = activeList.filter(s => s.category === "STAFF").length;
  const uaeNationals = activeList.filter(s => s.isLocal).length;
  const avgTenureMonths = (() => {
    const withDate = activeList.filter(s => s.dateOfArrival);
    if (!withDate.length) return 0;
    const now = Date.now(); // eslint-disable-line react-hooks/purity
    const total = withDate.reduce((sum, s) => sum + (now - new Date(s.dateOfArrival!).getTime()) / (1000 * 60 * 60 * 24 * 30.44), 0);
    return Math.round(total / withDate.length);
  })();
  const tenureLabel = avgTenureMonths >= 12 ? `${Math.floor(avgTenureMonths / 12)}y ${avgTenureMonths % 12}m` : `${avgTenureMonths}m`;
  const ticketsThisYear = activeList.filter(s => isTicketEligible(s.dateOfArrival, s.ticketFrequency)).length;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f7", borderRadius: 10, padding: 3, width: "fit-content" }}>
        {(["employees", "contracts", "documents", "deductions", "analytics"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: subTab === t ? "#fff" : "transparent", color: subTab === t ? "#1d1d1f" : "#86868b", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: subTab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {t === "employees" ? "👥 Employees" : t === "contracts" ? "📄 Contracts" : t === "documents" ? "📁 Documents" : t === "deductions" ? "💰 Deductions" : "📊 Analytics"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  EMPLOYEES SUB-TAB                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subTab === "employees" && (
        <div>
          {/* Header with search, filters, actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
              <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search name, code, role..." style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", background: "#f5f5f7", outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#86868b", pointerEvents: "none" }}>🔍</span>
            </div>
            <CustomSelect value={staffCategory} onChange={v => setStaffCategory(String(v))} options={[{ value: "all", label: "All categories" }, { value: "DRIVER", label: "Drivers" }, { value: "STAFF", label: "Staff" }]} compact triggerStyle={{ background: staffCategory !== "all" ? "rgba(0,122,255,0.08)" : "#f5f5f7", border: staffCategory !== "all" ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", color: staffCategory !== "all" ? "#007aff" : "#1d1d1f", fontWeight: staffCategory !== "all" ? 700 : 400 }} />
            <div style={{ display: "flex", gap: 4, background: "#f5f5f7", borderRadius: 8, padding: 3 }}>
              <button onClick={() => setShowInactive(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: !showInactive ? "#fff" : "transparent", color: !showInactive ? "#1d1d1f" : "#86868b", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit", boxShadow: !showInactive ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>Active ({activeList.length})</button>
              <button onClick={() => setShowInactive(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: showInactive ? "#fff" : "transparent", color: showInactive ? "#1d1d1f" : "#86868b", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit", boxShadow: showInactive ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>Contract Ended ({inactiveList.length})</button>
            </div>
            <div style={{ flex: 1 }} />
            {!readOnly && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  const list = await getStaffWithoutAccounts();
                  setBulkInviteList(list);
                  setBulkInviteEmails({});
                  setBulkInviteProgress({});
                  setBulkInviteResults({});
                  setShowBulkInvite(true);
                }} style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🔐 Bulk Invite</button>
                <button onClick={() => setShowAddStaff(true)} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add Employee</button>
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Active Drivers", value: totalDrivers, icon: "🚗", color: "#007aff" },
              { label: "Active Staff", value: totalStaffMembers, icon: "👔", color: "#af52de" },
              { label: "UAE Nationals", value: uaeNationals, icon: "🇦🇪", color: "#34c759" },
              { label: "Avg. Tenure", value: tenureLabel, icon: "📅", color: "#ff9500" },
              { label: "Tickets " + new Date().getFullYear(), value: ticketsThisYear, icon: "✈️", color: "#5856d6" },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5ea", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 22 }}>{kpi.icon}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase" }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Staff Table */}
          <div style={{ borderRadius: 14, border: "1px solid #e5e5ea", overflow: "hidden", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f7" }}>
                  <th style={thS}>Code</th>
                  <th style={thS}>Name</th>
                  <th style={thS}>Designation</th>
                  <th style={thS}>Category</th>
                  <th style={thS}>Arrival</th>
                  <th style={thS}>Status</th>
                  <th style={{ ...thS, textAlign: "center" }}>Account</th>
                  <th style={{ ...thS, textAlign: "center" }}>Ticket</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(s => {
                  const eligible = isTicketEligible(s.dateOfArrival, s.ticketFrequency);
                  return (
                  <tr key={s.id} onClick={() => { setProfileStaff(s); setProfileTab("info"); setEditingProfile(false); }} style={{ borderBottom: "1px solid #f5f5f7", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f9f9fb")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td style={tdS}><span style={{ fontFamily: "SF Mono, monospace", fontWeight: 700, fontSize: 11, color: "#1d1d1f" }}>{s.employeeCode || `#${s.staffNumber}`}</span></td>
                    <td style={tdS}><div style={{ fontWeight: 600, fontSize: 13, color: "#1d1d1f" }}>{s.name}</div>{s.employeeId && <div style={{ fontSize: 9, color: "#86868b" }}>ID: {s.employeeId}</div>}</td>
                    <td style={tdS}><span style={desigBadge(s.designation)}>{s.designation}</span></td>
                    <td style={tdS}><span style={catBadge(s.category)}>{s.category}</span></td>
                    <td style={tdS}><span style={{ fontSize: 11, color: "#86868b" }}>{s.dateOfArrival ? new Date(s.dateOfArrival + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></td>
                    <td style={tdS}>
                      {isActive(s) ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(52,199,89,0.08)", color: "#34c759" }}>Active</span>
                      ) : (
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(255,59,48,0.08)", color: "#ff3b30" }}>Ended</span>
                          {s.releaseDate && <div style={{ fontSize: 9, color: "#86868b", marginTop: 2 }}>{new Date(s.releaseDate + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      {s.userId ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(0,122,255,0.08)", color: "#007aff" }}>● Active</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(142,142,147,0.08)", color: "#c7c7cc" }}>No account</span>
                      )}
                    </td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      {s.ticketFrequency === 0 ? (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#c7c7cc" }}>—</span>
                      ) : (
                        <span title={`Every ${s.ticketFrequency}y`} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: eligible ? "rgba(88,86,214,0.08)" : "rgba(142,142,147,0.08)", color: eligible ? "#5856d6" : "#8e8e93" }}>
                          {eligible ? `✈️ ${s.ticketFrequency === 1 ? "Annual" : "Biennial"}` : `${s.ticketFrequency === 1 ? "1y" : "2y"}`}
                        </span>
                      )}
                    </td>
                  </tr>
                  ); })}
              </tbody>
            </table>
            {filteredList.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#86868b", fontSize: 13 }}>No employees found</div>}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  CONTRACTS SUB-TAB                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subTab === "contracts" && (() => {
        const withContract = filteredList.filter(s => s.totalOnContract != null);
        const withoutContract = filteredList.filter(s => s.totalOnContract == null);
        const totalPayroll = withContract.reduce((sum, s) => sum + Number(s.totalOnContract), 0);
        const avgSalary = withContract.length ? Math.round(totalPayroll / withContract.length) : 0;
        return (
          <div>
            {/* Contract KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Monthly Payroll", value: `${totalPayroll.toLocaleString()} AED`, icon: "💰", color: "#007aff" },
                { label: "Avg. Salary", value: `${avgSalary.toLocaleString()} AED`, icon: "📊", color: "#af52de" },
                { label: "With Contract Data", value: withContract.length, icon: "✅", color: "#34c759" },
                { label: "Without Data", value: withoutContract.length, icon: "⚠️", color: "#ff9500" },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5ea", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22 }}>{kpi.icon}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase" }}>{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
                <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search name, code..." style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", background: "#f5f5f7", outline: "none", boxSizing: "border-box" }} />
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#86868b", pointerEvents: "none" }}>🔍</span>
              </div>
              <CustomSelect value={staffCategory} onChange={v => setStaffCategory(String(v))} options={[{ value: "all", label: "All categories" }, { value: "DRIVER", label: "Drivers" }, { value: "STAFF", label: "Staff" }]} compact triggerStyle={{ background: staffCategory !== "all" ? "rgba(0,122,255,0.08)" : "#f5f5f7", border: staffCategory !== "all" ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", color: staffCategory !== "all" ? "#007aff" : "#1d1d1f", fontWeight: staffCategory !== "all" ? 700 : 400 }} />
            </div>

            {/* Salary Breakdown Table */}
            <div style={{ borderRadius: 14, border: "1px solid #e5e5ea", overflow: "hidden", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f5f5f7" }}>
                    <th style={thS}>Code</th>
                    <th style={thS}>Name</th>
                    <th style={thS}>Category</th>
                    <th style={{ ...thS, textAlign: "right" }}>Basic</th>
                    <th style={{ ...thS, textAlign: "right" }}>Housing</th>
                    <th style={{ ...thS, textAlign: "right" }}>Transport</th>
                    <th style={{ ...thS, textAlign: "right" }}>School</th>
                    <th style={{ ...thS, textAlign: "right" }}>Bonus</th>
                    <th style={{ ...thS, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f7", cursor: "pointer" }} onClick={() => { setProfileStaff(s); setProfileTab("contract"); setEditingProfile(false); }} onMouseEnter={e => (e.currentTarget.style.background = "#f9f9fb")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={tdS}><span style={{ fontFamily: "SF Mono, monospace", fontWeight: 700, fontSize: 11, color: "#1d1d1f" }}>{s.employeeCode || `#${s.staffNumber}`}</span></td>
                      <td style={tdS}><span style={{ fontWeight: 600, fontSize: 12, color: "#1d1d1f" }}>{s.name}</span></td>
                      <td style={tdS}><span style={catBadge(s.category)}>{s.category}</span></td>
                      <td style={{ ...tdS, textAlign: "right", fontFamily: "SF Mono, monospace", fontSize: 11 }}>{s.basicSalary != null ? Number(s.basicSalary).toLocaleString() : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontFamily: "SF Mono, monospace", fontSize: 11 }}>{s.housingAllowance != null ? Number(s.housingAllowance).toLocaleString() : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontFamily: "SF Mono, monospace", fontSize: 11 }}>{s.transportAllowance != null ? Number(s.transportAllowance).toLocaleString() : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontFamily: "SF Mono, monospace", fontSize: 11 }}>{s.schoolAllowance ? Number(s.schoolAllowance).toLocaleString() : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontFamily: "SF Mono, monospace", fontSize: 11 }}>{s.monthlyBonus ? Number(s.monthlyBonus).toLocaleString() : "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 700, fontFamily: "SF Mono, monospace", fontSize: 11, color: "#007aff" }}>{s.totalOnContract != null ? Number(s.totalOnContract).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr style={{ background: "rgba(0,122,255,0.04)", borderTop: "2px solid #e5e5ea" }}>
                    <td colSpan={3} style={{ ...tdS, fontWeight: 800, fontSize: 11, color: "#1d1d1f" }}>TOTAL ({filteredList.length} employees)</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{filteredList.reduce((s, e) => s + (Number(e.basicSalary) || 0), 0).toLocaleString()}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{filteredList.reduce((s, e) => s + (Number(e.housingAllowance) || 0), 0).toLocaleString()}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{filteredList.reduce((s, e) => s + (Number(e.transportAllowance) || 0), 0).toLocaleString()}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{filteredList.reduce((s, e) => s + (Number(e.schoolAllowance) || 0), 0).toLocaleString()}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11 }}>{filteredList.reduce((s, e) => s + (Number(e.monthlyBonus) || 0), 0).toLocaleString()}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 800, fontFamily: "SF Mono, monospace", fontSize: 11, color: "#007aff" }}>{filteredList.reduce((s, e) => s + (Number(e.totalOnContract) || 0), 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  DOCUMENTS SUB-TAB                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subTab === "documents" && (() => {
        const activeStaff = allStaff.filter(s => s.status === "active");
        const staffNameMap: Record<number, string> = {};
        allStaff.forEach(s => { staffNameMap[s.id] = s.name; });
        const filtered = docList.filter(d => {
          if (docStaffFilter !== "all" && d.staffId !== Number(docStaffFilter)) return false;
          if (docTypeFilter !== "all" && d.documentType !== docTypeFilter) return false;
          return true;
        });
        const now = new Date().toISOString().slice(0, 10);
        const expiringSoon = docList.filter(d => d.validUntil && d.validUntil >= now && d.validUntil <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
        const expired = docList.filter(d => d.validUntil && d.validUntil < now);
        const docTypeLabel = (t: DocumentType) => t === "job_offer_letter" ? "Job Offer Letter" : t === "contract" ? "Contract" : "Other";
        const docTypeBadge = (t: DocumentType) => {
          const c = t === "job_offer_letter" ? "#007aff" : t === "contract" ? "#34c759" : "#8e8e93";
          return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px" as const, borderRadius: 6, background: `${c}14`, color: c };
        };
        const validityBadge = (validUntil: string | null) => {
          if (!validUntil) return null;
          if (validUntil < now) return { label: "Expired", bg: "rgba(255,59,48,0.08)", color: "#ff3b30" };
          const daysLeft = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000);
          if (daysLeft <= 30) return { label: `${daysLeft}d left`, bg: "rgba(255,149,0,0.08)", color: "#ff9500" };
          return { label: "Valid", bg: "rgba(52,199,89,0.08)", color: "#34c759" };
        };
        return (
          <div>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Documents", value: docList.length, icon: "📁", color: "#007aff" },
                { label: "Contracts", value: docList.filter(d => d.documentType === "contract").length, icon: "📄", color: "#34c759" },
                { label: "Expiring (30d)", value: expiringSoon.length, icon: "⚠️", color: "#ff9500" },
                { label: "Expired", value: expired.length, icon: "❌", color: "#ff3b30" },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e5ea", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22 }}>{kpi.icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase" }}>{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters + Add */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <CustomSelect value={docStaffFilter} onChange={v => setDocStaffFilter(String(v))} options={[{ value: "all", label: "All employees" }, ...activeStaff.map(s => ({ value: String(s.id), label: s.name }))]} compact triggerStyle={{ background: docStaffFilter !== "all" ? "rgba(0,122,255,0.08)" : "#f5f5f7", border: docStaffFilter !== "all" ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", color: docStaffFilter !== "all" ? "#007aff" : "#1d1d1f", fontWeight: docStaffFilter !== "all" ? 700 : 400 }} />
              <CustomSelect value={docTypeFilter} onChange={v => setDocTypeFilter(v as DocumentType | "all")} options={[{ value: "all", label: "All types" }, { value: "job_offer_letter", label: "Job Offer Letter" }, { value: "contract", label: "Contract" }, { value: "other", label: "Other" }]} compact triggerStyle={{ background: docTypeFilter !== "all" ? "rgba(0,122,255,0.08)" : "#f5f5f7", border: docTypeFilter !== "all" ? "1px solid rgba(0,122,255,0.3)" : "1px solid #e5e5ea", color: docTypeFilter !== "all" ? "#007aff" : "#1d1d1f", fontWeight: docTypeFilter !== "all" ? 700 : 400 }} />
              <div style={{ flex: 1 }} />
              {!readOnly && <button onClick={() => setShowAddDoc(true)} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add Document</button>}
            </div>

            {/* Add Document Form */}
            {showAddDoc && (
              <div style={{ background: "#f5f5f7", borderRadius: 14, padding: 20, marginBottom: 16, border: "1px solid #e5e5ea" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f", marginBottom: 14 }}>New Document</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={fieldLabel}>Employee *</div>
                    <select value={newDocStaffId} onChange={e => setNewDocStaffId(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
                      <option value="">Select...</option>
                      {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={fieldLabel}>Document Type *</div>
                    <select value={newDocType} onChange={e => setNewDocType(e.target.value as DocumentType)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
                      <option value="job_offer_letter">Job Offer Letter</option>
                      <option value="contract">Contract</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <div style={fieldLabel}>Label</div>
                    <input value={newDocLabel} onChange={e => setNewDocLabel(e.target.value)} placeholder="e.g. Employment Contract 2026" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={fieldLabel}>Valid From</div>
                    <input type="date" value={newDocValidFrom} onChange={e => setNewDocValidFrom(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={fieldLabel}>Valid Until</div>
                    <input type="date" value={newDocValidUntil} onChange={e => setNewDocValidUntil(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={fieldLabel}>File</div>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setNewDocFile(e.target.files?.[0] || null)} style={{ width: "100%", padding: "6px 0", fontSize: 12, fontFamily: "inherit" }} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={fieldLabel}>Notes</div>
                  <input value={newDocNotes} onChange={e => setNewDocNotes(e.target.value)} placeholder="Optional notes..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowAddDoc(false); setNewDocFile(null); }} style={{ background: "#fff", border: "1px solid #e5e5ea", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#86868b" }}>Cancel</button>
                  <button onClick={handleAddDocument} disabled={docSaving || !newDocStaffId} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: docSaving || !newDocStaffId ? 0.5 : 1 }}>{docSaving ? "Saving..." : "Add Document"}</button>
                </div>
              </div>
            )}

            {/* Documents Table */}
            {docLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>Loading documents...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#c7c7cc", fontSize: 13 }}>No documents found</div>
            ) : (
              <div style={{ borderRadius: 14, border: "1px solid #e5e5ea", overflow: "hidden", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f7" }}>
                      <th style={thS}>Employee</th>
                      <th style={thS}>Type</th>
                      <th style={thS}>Label</th>
                      <th style={thS}>Valid From</th>
                      <th style={thS}>Valid Until</th>
                      <th style={thS}>Status</th>
                      <th style={thS}>File</th>
                      {!readOnly && <th style={{ ...thS, textAlign: "center" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(doc => {
                      const vb = validityBadge(doc.validUntil);
                      return (
                        <tr key={doc.id} style={{ borderBottom: "1px solid #f5f5f7" }} onMouseEnter={e => (e.currentTarget.style.background = "#f9f9fb")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                          <td style={tdS}><span style={{ fontWeight: 600, fontSize: 12, color: "#1d1d1f" }}>{staffNameMap[doc.staffId] || `#${doc.staffId}`}</span></td>
                          <td style={tdS}><span style={docTypeBadge(doc.documentType)}>{docTypeLabel(doc.documentType)}</span></td>
                          <td style={tdS}><span style={{ fontSize: 12, color: "#1d1d1f" }}>{doc.label || "—"}</span></td>
                          <td style={tdS}><span style={{ fontSize: 11, fontFamily: "SF Mono, monospace", color: "#1d1d1f" }}>{doc.validFrom || "—"}</span></td>
                          <td style={tdS}><span style={{ fontSize: 11, fontFamily: "SF Mono, monospace", color: "#1d1d1f" }}>{doc.validUntil || "—"}</span></td>
                          <td style={tdS}>{vb ? <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: vb.bg, color: vb.color }}>{vb.label}</span> : <span style={{ fontSize: 11, color: "#c7c7cc" }}>—</span>}</td>
                          <td style={tdS}>{doc.fileUrl ? <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#007aff", fontWeight: 600, textDecoration: "none" }}>{doc.fileName || "View"}</a> : <span style={{ fontSize: 11, color: "#c7c7cc" }}>—</span>}</td>
                          {!readOnly && <td style={{ ...tdS, textAlign: "center" }}><button onClick={() => handleDeleteDocument(doc.id)} style={{ background: "rgba(255,59,48,0.08)", color: "#ff3b30", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  DEDUCTIONS SUB-TAB                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subTab === "deductions" && (() => {
        const activeStaff = allStaff.filter(s => s.status === "active");
        const filteredDeds = dedStaffFilter === "all" ? dedList : dedList.filter(d => d.staffId === Number(dedStaffFilter));
        const staffNameMap: Record<number, string> = {};
        allStaff.forEach(s => { staffNameMap[s.id] = s.name; });
        const dedTypeBadge = (t: string) => {
          const c = t === "advance" ? "#ff9500" : t === "adjustment" ? "#5856d6" : "#86868b";
          return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px" as const, borderRadius: 6, background: `${c}14`, color: c };
        };
        const thS: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.3px" };
        const tdSt: React.CSSProperties = { padding: "10px 14px", fontSize: 12, fontWeight: 500 };
        return (
          <div>
            {/* Month selector + Add button */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <input type="month" value={dedMonth} onChange={e => setDedMonth(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }} />
              <CustomSelect value={dedStaffFilter} onChange={v => setDedStaffFilter(String(v))}
                options={[{ value: "all", label: "All employees" }, ...activeStaff.map(s => ({ value: String(s.id), label: `${s.employeeCode ?? s.staffNumber} — ${s.name}` }))]} compact />
              {!readOnly && (
                <button onClick={() => setShowAddDed(!showAddDed)} style={{
                  marginLeft: "auto", padding: "8px 16px", borderRadius: 10, border: "none",
                  background: showAddDed ? "#1d1d1f" : "#007aff", color: "#fff",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{showAddDed ? "✕ Cancel" : "+ Add Deduction"}</button>
              )}
            </div>

            {/* Add deduction form */}
            {showAddDed && !readOnly && (() => {
              const inst = Number(newDedInstallments) || 1;
              const totalAmt = Number(newDedAmount) || 0;
              const monthlyAmt = inst > 1 ? Math.floor(totalAmt / inst) : totalAmt;
              return (
              <Card style={{ marginBottom: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>New Deduction — {dedMonth}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" }}>Employee</div>
                    <CustomSelect value={newDedStaffId} onChange={v => setNewDedStaffId(String(v))}
                      options={activeStaff.map(s => ({ value: String(s.id), label: `${s.employeeCode ?? s.staffNumber} — ${s.name}` }))} compact />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" }}>Type</div>
                    <CustomSelect value={newDedType} onChange={v => setNewDedType(v as DeductionType)}
                      options={[{ value: "advance", label: "Advance / Loan" }, { value: "adjustment", label: "Adjustment" }, { value: "other", label: "Other" }]} compact />
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" }}>Installments</div>
                    <CustomSelect value={newDedInstallments} onChange={v => setNewDedInstallments(String(v))}
                      options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "1 (one-shot)" : `${i + 1} months` }))} compact />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" }}>{inst > 1 ? "Total Amount (AED)" : "Amount (AED)"}</div>
                    <input type="number" value={newDedAmount} onChange={e => setNewDedAmount(e.target.value)} placeholder="0"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 2, minWidth: 150 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", marginBottom: 3, textTransform: "uppercase" }}>Label (optional)</div>
                    <input value={newDedLabel} onChange={e => setNewDedLabel(e.target.value)} placeholder="e.g. Salary advance Jan"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={handleAddDeduction} disabled={!newDedStaffId || !newDedAmount || dedSaving}
                    style={{
                      padding: "8px 20px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700,
                      background: !newDedStaffId || !newDedAmount || dedSaving ? "#e5e5ea" : "#34c759", color: "#fff",
                      cursor: !newDedStaffId || !newDedAmount || dedSaving ? "not-allowed" : "pointer", fontFamily: "inherit",
                    }}>{dedSaving ? "Saving…" : "Save"}</button>
                </div>
                {inst > 1 && totalAmt > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#f0f0ff", fontSize: 11, color: "#5856d6", fontWeight: 600 }}>
                    → {monthlyAmt.toLocaleString("fr-FR")} AED/month × {inst} months starting {dedMonth}
                    {totalAmt - monthlyAmt * inst !== 0 && <span style={{ color: "#86868b", fontWeight: 400 }}> (last month: {(totalAmt - monthlyAmt * (inst - 1)).toLocaleString("fr-FR")} AED)</span>}
                  </div>
                )}
              </Card>
              );
            })()}

            {/* Summary KPIs */}
            {(() => {
              const outstanding = filteredDeds.reduce((s, d) => {
                if (d.installments > 1 && d.totalAmount != null) {
                  return s + (d.totalAmount - d.amount * d.installmentNumber);
                }
                return s;
              }, 0);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  <Kpi label="Total Deductions" value={`${filteredDeds.reduce((s, d) => s + d.amount, 0).toLocaleString("fr-FR")} AED`} color="#ff3b30" small />
                  <Kpi label="Entries" value={String(filteredDeds.length)} color="#5856d6" small />
                  <Kpi label="Employees" value={String(new Set(filteredDeds.map(d => d.staffId)).size)} color="#007aff" small />
                  <Kpi label="Outstanding" value={outstanding > 0 ? `${outstanding.toLocaleString("fr-FR")} AED` : "—"} color="#ff9500" small />
                </div>
              );
            })()}

            {/* Deductions table */}
            {dedLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#86868b", fontSize: 13, fontWeight: 600 }}>Loading…</div>
            ) : filteredDeds.length === 0 ? (
              <Card style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>No deductions for {dedMonth}</div>
                <div style={{ fontSize: 12, color: "#86868b", marginTop: 4 }}>Add advance, adjustment or other deductions</div>
              </Card>
            ) : (
              <Card>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f2f2f7" }}>
                        <th style={thS}>Employee</th>
                        <th style={thS}>Type</th>
                        <th style={thS}>Label</th>
                        <th style={{ ...thS, textAlign: "right" }}>Amount</th>
                        <th style={{ ...thS, textAlign: "center" }}>Progress</th>
                        {!readOnly && <th style={{ ...thS, textAlign: "center", width: 120 }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeds.map(d => {
                        const isInstallment = d.installments > 1;
                        const remaining = isInstallment && d.totalAmount != null ? d.totalAmount - d.amount * d.installmentNumber : 0;
                        const pct = isInstallment ? (d.installmentNumber / d.installments) * 100 : 100;
                        return (
                        <Fragment key={d.id}>
                        <tr style={{ borderBottom: "1px solid #f2f2f7" }}>
                          <td style={{ ...tdSt, fontWeight: 700, color: "#1d1d1f" }}>{staffNameMap[d.staffId] ?? `#${d.staffId}`}</td>
                          <td style={tdSt}><span style={dedTypeBadge(d.deductionType)}>{d.deductionType === "advance" ? "Advance" : d.deductionType === "adjustment" ? "Adjustment" : "Other"}</span></td>
                          <td style={{ ...tdSt, color: "#86868b" }}>
                            {editDedId === d.id ? (
                              <input value={editDedLabel} onChange={e => setEditDedLabel(e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: 200 }} />
                            ) : (d.label || "—")}
                          </td>
                          <td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>
                            {editDedId === d.id ? (
                              <input type="number" value={editDedAmount} onChange={e => setEditDedAmount(e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", width: 100, textAlign: "right" }} />
                            ) : `${d.amount.toLocaleString("fr-FR")} AED`}
                          </td>
                          <td style={{ ...tdSt, textAlign: "center" }}>
                            {isInstallment ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#5856d6" }}>{d.installmentNumber}/{d.installments}</span>
                                <div style={{ width: 50, height: 4, borderRadius: 2, background: "#e5e5ea", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: "#5856d6", borderRadius: 2 }} />
                                </div>
                                {remaining > 0 && <span style={{ fontSize: 9, color: "#86868b" }}>Left: {remaining.toLocaleString("fr-FR")}</span>}
                              </div>
                            ) : <span style={{ fontSize: 10, color: "#c7c7cc" }}>—</span>}
                          </td>
                          {!readOnly && (
                            <td style={{ ...tdSt, textAlign: "center" }}>
                              {editDedId === d.id ? (
                                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                  <button onClick={() => handleUpdateDeduction(d.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#34c759", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓</button>
                                  <button onClick={() => setEditDedId(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#e5e5ea", color: "#1d1d1f", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                                  <button onClick={() => { setEditDedId(d.id); setEditDedAmount(String(d.amount)); setEditDedLabel(d.label ?? ""); }}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#f2f2f7", color: "#1d1d1f", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✎</button>
                                  {isInstallment && d.groupId && (
                                    <button onClick={async () => {
                                      if (expandedGroupId === d.groupId) { setExpandedGroupId(null); setGroupDeds([]); }
                                      else { const gd = await fetchDeductionsByGroup(d.groupId!); setGroupDeds(gd); setExpandedGroupId(d.groupId); }
                                    }} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: expandedGroupId === d.groupId ? "#5856d614" : "#f2f2f7", color: "#5856d6", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📋</button>
                                  )}
                                  <button onClick={() => handleDeleteDeduction(d.id)}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#fef2f2", color: "#ff3b30", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                                  {isInstallment && d.groupId && (
                                    <button onClick={async () => {
                                      if (!confirm(`Delete all ${d.installments} installments for this group?`)) return;
                                      try { await deleteDeductionGroup(d.groupId!); setExpandedGroupId(null); setGroupDeds([]); await loadDeductions(dedMonth); } catch (e: Any) { alert(e.message); }
                                    }} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#fef2f2", color: "#ff3b30", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🗑 All</button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                        {/* Expanded group detail */}
                        {expandedGroupId === d.groupId && d.groupId && groupDeds.length > 0 && (
                          <tr>
                            <td colSpan={6 + (readOnly ? 0 : 0)} style={{ padding: 0 }}>
                              <div style={{ background: "#fafaff", padding: "10px 14px", borderBottom: "2px solid #e5e5ea" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#5856d6", textTransform: "uppercase", marginBottom: 6 }}>
                                  All installments — Total: {(d.totalAmount ?? 0).toLocaleString("fr-FR")} AED
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {groupDeds.map(gd => (
                                    <div key={gd.id} style={{
                                      padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                                      background: gd.month === dedMonth ? "#5856d620" : "#f2f2f7",
                                      color: gd.month === dedMonth ? "#5856d6" : "#86868b",
                                      border: gd.month === dedMonth ? "1px solid #5856d640" : "1px solid transparent",
                                    }}>
                                      {gd.month} — {gd.amount.toLocaleString("fr-FR")} AED ({gd.installmentNumber}/{gd.installments})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #e5e5ea", background: "#fafafa" }}>
                        <td colSpan={4} style={{ ...tdSt, fontWeight: 800, fontSize: 11, color: "#86868b", textTransform: "uppercase" }}>Total ({filteredDeds.length})</td>
                        <td style={{ ...tdSt, textAlign: "right", fontWeight: 900, color: "#ff3b30", fontVariantNumeric: "tabular-nums" }}>{filteredDeds.reduce((s, d) => s + d.amount, 0).toLocaleString("fr-FR")} AED</td>
                        <td />
                        {!readOnly && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  ANALYTICS SUB-TAB                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subTab === "analytics" && (() => {
        // ── Headcount by category ──
        const drivers = activeList.filter(s => s.category === "DRIVER");
        const staffMembers = activeList.filter(s => s.category === "STAFF");

        // ── Tenure distribution ──
        const tenureBuckets = [
          { label: "< 6m", min: 0, max: 6 },
          { label: "6-12m", min: 6, max: 12 },
          { label: "1-2y", min: 12, max: 24 },
          { label: "2-3y", min: 24, max: 36 },
          { label: "3-5y", min: 36, max: 60 },
          { label: "5y+", min: 60, max: 999 },
        ];
        const tenureDist = tenureBuckets.map(b => ({
          ...b,
          count: activeList.filter(s => { const m = tenureMonths(s.dateOfArrival); return m >= b.min && m < b.max; }).length,
        }));
        const maxTenureCount = Math.max(...tenureDist.map(b => b.count), 1);

        // ── Designation breakdown ──
        const desigCounts: Record<string, number> = {};
        activeList.forEach(s => { desigCounts[s.designation] = (desigCounts[s.designation] || 0) + 1; });
        const desigEntries = Object.entries(desigCounts).sort((a, b) => b[1] - a[1]);
        const maxDesigCount = Math.max(...desigEntries.map(e => e[1]), 1);

        // ── Recent arrivals (last 12 months) ──
        const now = new Date();
        const recentArrivals: { month: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = `${monthNames[d.getMonth()].slice(0, 3)} ${d.getFullYear().toString().slice(2)}`;
          const count = activeList.filter(s => s.dateOfArrival && s.dateOfArrival.startsWith(key)).length;
          recentArrivals.push({ month: label, count });
        }
        const maxArrival = Math.max(...recentArrivals.map(r => r.count), 1);

        const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #e5e5ea", padding: 20 };
        const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#1d1d1f", marginBottom: 16 };

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Headcount by Category */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Headcount by Category</div>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "#007aff" }}>{drivers.length}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#86868b", textTransform: "uppercase" }}>Drivers</div>
                  <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "#e5e5ea", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(drivers.length / activeList.length) * 100}%`, background: "#007aff", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 4 }}>{activeList.length ? Math.round((drivers.length / activeList.length) * 100) : 0}%</div>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "#af52de" }}>{staffMembers.length}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#86868b", textTransform: "uppercase" }}>Staff</div>
                  <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "#e5e5ea", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(staffMembers.length / activeList.length) * 100}%`, background: "#af52de", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 4 }}>{activeList.length ? Math.round((staffMembers.length / activeList.length) * 100) : 0}%</div>
                </div>
              </div>
            </div>

            {/* UAE Nationals Ratio */}
            <div style={cardStyle}>
              <div style={sectionTitle}>UAE Nationals (GPSSA)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative", width: 100, height: 100 }}>
                  <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e5e5ea" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#34c759" strokeWidth="3" strokeDasharray={`${activeList.length ? (uaeNationals / activeList.length) * 100 : 0} ${100 - (activeList.length ? (uaeNationals / activeList.length) * 100 : 0)}`} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#34c759" }}>
                    {activeList.length ? Math.round((uaeNationals / activeList.length) * 100) : 0}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#34c759" }}>{uaeNationals}</div>
                  <div style={{ fontSize: 11, color: "#86868b" }}>out of {activeList.length} active employees</div>
                  <div style={{ fontSize: 10, color: "#86868b", marginTop: 4 }}>Required for Emiratisation compliance</div>
                </div>
              </div>
            </div>

            {/* Tenure Distribution */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Tenure Distribution</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tenureDist.map(b => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 50, fontSize: 11, fontWeight: 600, color: "#86868b", textAlign: "right" }}>{b.label}</div>
                    <div style={{ flex: 1, height: 22, background: "#f5f5f7", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", width: `${(b.count / maxTenureCount) * 100}%`, background: "linear-gradient(90deg, #007aff, #5ac8fa)", borderRadius: 6, transition: "width 0.3s" }} />
                      {b.count > 0 && <span style={{ position: "absolute", left: `${(b.count / maxTenureCount) * 100}%`, top: "50%", transform: "translate(6px, -50%)", fontSize: 10, fontWeight: 700, color: "#1d1d1f" }}>{b.count}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Designation Breakdown */}
            <div style={cardStyle}>
              <div style={sectionTitle}>By Designation</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {desigEntries.map(([desig, count]) => {
                  const pct = activeList.length ? Math.round((count / activeList.length) * 100) : 0;
                  const dColor = desig === "LIMO DRIVER" ? "#007aff" : desig === "OPERATIONS" ? "#34c759" : desig === "CAR WASHER" ? "#ff9500" : desig === "LOCAL" ? "#5856d6" : desig === "PRO" ? "#af52de" : "#8e8e93";
                  return (
                    <div key={desig} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 90, fontSize: 10, fontWeight: 600, color: dColor, textAlign: "right" }}>{desig}</div>
                      <div style={{ flex: 1, height: 22, background: "#f5f5f7", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", width: `${(count / maxDesigCount) * 100}%`, background: dColor, borderRadius: 6, opacity: 0.2, transition: "width 0.3s" }} />
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: dColor }}>{count} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Arrivals Timeline */}
            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <div style={sectionTitle}>Arrivals Timeline (Last 12 Months)</div>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
                {recentArrivals.map(r => (
                  <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {r.count > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: "#007aff" }}>{r.count}</div>}
                    <div style={{ width: "100%", maxWidth: 32, height: `${Math.max((r.count / maxArrival) * 80, r.count > 0 ? 8 : 2)}px`, background: r.count > 0 ? "linear-gradient(180deg, #007aff, #5ac8fa)" : "#e5e5ea", borderRadius: 4 }} />
                    <div style={{ fontSize: 8, fontWeight: 600, color: "#86868b", whiteSpace: "nowrap" }}>{r.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  ADD EMPLOYEE MODAL (shared)                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showAddStaff && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => setShowAddStaff(false)}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 12px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f", marginBottom: 20 }}>New Employee</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={fieldLabel}>Employee Code</div>
                <input value={newEmployeeCode} onChange={e => setNewEmployeeCode(e.target.value)} placeholder="D0043 or S018" style={editInput} />
              </div>
              <div>
                <div style={fieldLabel}>Staff #</div>
                <input value={newNumber} onChange={e => setNewNumber(e.target.value)} type="number" placeholder="43" style={editInput} />
              </div>
              <div>
                <div style={fieldLabel}>First Name</div>
                <input value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="JOHN" style={editInput} />
              </div>
              <div>
                <div style={fieldLabel}>Last Name</div>
                <input value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="DOE" style={editInput} />
              </div>
              <div>
                <div style={fieldLabel}>Designation</div>
                <CustomSelect value={newDesig} onChange={v => setNewDesig(String(v))} options={["LIMO DRIVER", "OPERATIONS", "CAR WASHER", "LOCAL", "PRO", "ACCOUNTANT"].map(d => ({ value: d, label: d }))} compact />
              </div>
              <div>
                <div style={fieldLabel}>Date of Arrival</div>
                <input type="date" value={newDateOfArrival} onChange={e => setNewDateOfArrival(e.target.value)} style={editInput} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <input type="checkbox" checked={newIsLocal} onChange={e => setNewIsLocal(e.target.checked)} id="hrNewIsLocal" />
                <label htmlFor="hrNewIsLocal" style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>UAE National (GPSSA)</label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowAddStaff(false)} style={{ background: "#f5f5f7", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#86868b" }}>Cancel</button>
              <button onClick={handleAddStaff} disabled={staffSaving} style={{ background: "#34c759", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{staffSaving ? "Saving..." : "Add Employee"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  EMPLOYEE PROFILE MODAL (shared)                           */}
      {/* ════════════════════════════════════════════════════════════ */}
      {profileStaff && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => { setProfileStaff(null); setEditingProfile(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 12px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            {/* Profile Header */}
            <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "SF Mono, monospace", fontSize: 12, fontWeight: 700, color: "#86868b", marginBottom: 2 }}>{profileStaff.employeeCode || `#${profileStaff.staffNumber}`}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1d1d1f" }}>{profileStaff.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={desigBadge(profileStaff.designation)}>{profileStaff.designation}</span>
                  <span style={catBadge(profileStaff.category)}>{profileStaff.category}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: isActive(profileStaff) ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.08)", color: isActive(profileStaff) ? "#34c759" : "#ff3b30" }}>{isActive(profileStaff) ? "Active" : "Contract ended"}</span>
                  {profileStaff.isLocal && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(52,199,89,0.08)", color: "#34c759" }}>UAE National</span>}
                  {isTicketEligible(profileStaff.dateOfArrival, profileStaff.ticketFrequency) ? (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(88,86,214,0.08)", color: "#5856d6" }}>✈️ Ticket {new Date().getFullYear()}</span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(142,142,147,0.08)", color: "#8e8e93" }}>No ticket {new Date().getFullYear()}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!readOnly && !editingProfile && (
                  <button onClick={() => {
                    setEditingProfile(true);
                    setEditFields({
                      employee_code: profileStaff.employeeCode || "", employee_id: profileStaff.employeeId || "",
                      first_name: profileStaff.firstName || "", last_name: profileStaff.lastName || "",
                      designation: profileStaff.designation, category: profileStaff.category,
                      date_of_arrival: profileStaff.dateOfArrival || "", release_date: profileStaff.releaseDate || "",
                      is_local: profileStaff.isLocal, ticket_frequency: String(profileStaff.ticketFrequency), notes: profileStaff.notes || "",
                      basic_salary: profileStaff.basicSalary ?? "", housing_allowance: profileStaff.housingAllowance ?? "",
                      transport_allowance: profileStaff.transportAllowance ?? "", school_allowance: profileStaff.schoolAllowance,
                      monthly_bonus: profileStaff.monthlyBonus, total_on_contract: profileStaff.totalOnContract ?? "",
                    });
                  }} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                )}
                <button onClick={() => { setProfileStaff(null); setEditingProfile(false); }} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 30, height: 30, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>

            {/* Profile Sub-tabs */}
            <div style={{ display: "flex", gap: 0, padding: "16px 24px 0", borderBottom: "1px solid #f0f0f0" }}>
              {(["info", "contract", "documents", "attendance", "account"] as const).map(t => (
                <button key={t} onClick={() => { setProfileTab(t); if (t === "account") { setAccountEmail(""); setAccountTempPassword(null); setAccountError(null); } }} style={{ padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: profileTab === t ? "#007aff" : "#86868b", borderBottom: profileTab === t ? "2px solid #007aff" : "2px solid transparent", marginBottom: -1 }}>
                  {t === "info" ? "Info" : t === "contract" ? "Contract" : t === "documents" ? "Documents" : t === "attendance" ? "Attendance" : "🔐 Account"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: "16px 24px 24px" }}>

              {/* ─── INFO TAB ─── */}
              {profileTab === "info" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {([
                    { label: "Employee Code", key: "employee_code", val: profileStaff.employeeCode },
                    { label: "Employee ID (WPS)", key: "employee_id", val: profileStaff.employeeId },
                    { label: "Category", key: "category", val: profileStaff.category, type: "select", options: ["DRIVER", "STAFF"] },
                    { label: "First Name", key: "first_name", val: profileStaff.firstName },
                    { label: "Last Name", key: "last_name", val: profileStaff.lastName },
                    { label: "Designation", key: "designation", val: profileStaff.designation, type: "select", options: ["LIMO DRIVER", "OPERATIONS", "CAR WASHER", "LOCAL", "PRO", "ACCOUNTANT"] },
                    { label: "Date of Arrival", key: "date_of_arrival", val: profileStaff.dateOfArrival, type: "date" },
                    { label: "Release Date", key: "release_date", val: profileStaff.releaseDate, type: "date" },
                    { label: "Tenure", key: "_tenure", val: tenure(profileStaff.dateOfArrival), readOnly: true },
                    { label: "Staff Number", key: "_staff_number", val: String(profileStaff.staffNumber), readOnly: true },
                    { label: "Status", key: "_status", val: profileStaff.status, readOnly: true },
                    { label: "UAE National", key: "is_local", val: profileStaff.isLocal ? "Yes" : "No", type: "checkbox" },
                  ] as { label: string; key: string; val: Any; type?: string; options?: string[]; optionLabels?: string[]; readOnly?: boolean }[]).map(f => (
                    <div key={f.key}>
                      <div style={fieldLabel}>{f.label}</div>
                      {editingProfile && !f.readOnly ? (
                        f.type === "select" ? (
                          <CustomSelect value={editFields[f.key] as string || ""} onChange={v => setEditFields(prev => ({ ...prev, [f.key]: String(v) }))} options={(f.options || []).map((o, i) => ({ value: o, label: f.optionLabels ? f.optionLabels[i] : o }))} compact />
                        ) : f.type === "date" ? (
                          <input type="date" value={editFields[f.key] as string || ""} onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))} style={editInput} />
                        ) : f.type === "checkbox" ? (
                          <div style={{ paddingTop: 4 }}><input type="checkbox" checked={Boolean(editFields[f.key])} onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.checked }))} /></div>
                        ) : (
                          <input value={editFields[f.key] as string || ""} onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))} style={editInput} />
                        )
                      ) : (
                        <div style={fieldValue}>{f.val || "—"}</div>
                      )}
                    </div>
                  ))}
                  {/* Ticket Frequency */}
                  <div>
                    <div style={fieldLabel}>Flight Ticket</div>
                    {editingProfile ? (
                      <CustomSelect value={String(editFields.ticket_frequency ?? profileStaff.ticketFrequency)} onChange={v => setEditFields(prev => ({ ...prev, ticket_frequency: String(v) }))} options={[{ value: "0", label: "No ticket" }, { value: "1", label: "Every year" }, { value: "2", label: "Every 2 years" }]} compact />
                    ) : (
                      <div style={fieldValue}>
                        {profileStaff.ticketFrequency === 0 ? <span style={{ color: "#8e8e93" }}>No ticket</span> : profileStaff.ticketFrequency === 1 ? <span style={{ color: "#5856d6" }}>✈️ Every year</span> : <span style={{ color: "#5856d6" }}>✈️ Every 2 years</span>}
                        {profileStaff.ticketFrequency > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: isTicketEligible(profileStaff.dateOfArrival, profileStaff.ticketFrequency) ? "rgba(88,86,214,0.08)" : "rgba(142,142,147,0.08)", color: isTicketEligible(profileStaff.dateOfArrival, profileStaff.ticketFrequency) ? "#5856d6" : "#8e8e93" }}>
                            {isTicketEligible(profileStaff.dateOfArrival, profileStaff.ticketFrequency) ? `Eligible ${new Date().getFullYear()}` : `Not eligible ${new Date().getFullYear()}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Notes — full width */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={fieldLabel}>Notes</div>
                    {editingProfile ? (
                      <textarea value={editFields.notes as string || ""} onChange={e => setEditFields(prev => ({ ...prev, notes: e.target.value }))} rows={3} style={{ ...editInput, resize: "vertical" }} />
                    ) : (
                      <div style={{ ...fieldValue, color: profileStaff.notes ? "#1d1d1f" : "#c7c7cc" }}>{profileStaff.notes || "No notes"}</div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── CONTRACT TAB ─── */}
              {profileTab === "contract" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {([
                      { label: "Basic Salary", key: "basic_salary", val: profileStaff.basicSalary },
                      { label: "Housing Allowance", key: "housing_allowance", val: profileStaff.housingAllowance },
                      { label: "Transport Allowance", key: "transport_allowance", val: profileStaff.transportAllowance },
                      { label: "School Allowance", key: "school_allowance", val: profileStaff.schoolAllowance },
                      { label: "Monthly Bonus", key: "monthly_bonus", val: profileStaff.monthlyBonus },
                    ] as { label: string; key: string; val: number | null }[]).map(f => (
                      <div key={f.key} style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
                        <div style={fieldLabel}>{f.label}</div>
                        {editingProfile ? (
                          <input type="number" value={editFields[f.key] ?? ""} onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))} style={editInput} placeholder="0" />
                        ) : (
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{f.val != null ? `${Number(f.val).toLocaleString()} AED` : "—"}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Total on Contract — highlighted */}
                  <div style={{ background: "rgba(0,122,255,0.06)", borderRadius: 14, padding: 18, border: "1px solid rgba(0,122,255,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ ...fieldLabel, color: "#007aff" }}>Total on Contract</div>
                      {editingProfile ? (
                        <input type="number" value={editFields.total_on_contract ?? ""} onChange={e => setEditFields(prev => ({ ...prev, total_on_contract: e.target.value }))} style={{ ...editInput, maxWidth: 200 }} placeholder="0" />
                      ) : (
                        <div style={{ fontSize: 26, fontWeight: 800, color: "#007aff" }}>{profileStaff.totalOnContract != null ? `${Number(profileStaff.totalOnContract).toLocaleString()} AED` : "—"}</div>
                      )}
                    </div>
                    {!editingProfile && profileStaff.totalOnContract != null && (
                      <div style={{ fontSize: 11, color: "#86868b", textAlign: "right" }}>
                        <div>Annual: {(Number(profileStaff.totalOnContract) * 12).toLocaleString()} AED</div>
                      </div>
                    )}
                  </div>

                  {/* OT Rates */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ff9500", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>OT Rates</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      {([
                        { label: "OT Hour Rate (Normal)", key: "ot_hour_rate", val: profileStaff.otHourRate, suffix: "AED/h" },
                        { label: "OT Hour Rate (Holiday)", key: "ot_hour_rate_holiday", val: profileStaff.otHourRateHoliday, suffix: "AED/h" },
                        { label: "OT Day Rate", key: "ot_day_rate", val: profileStaff.otDayRate, suffix: "AED/day" },
                      ] as { label: string; key: string; val: number; suffix: string }[]).map(f => (
                        <div key={f.key} style={{ background: "rgba(255,149,0,0.06)", borderRadius: 12, padding: 14, border: "1px solid rgba(255,149,0,0.12)" }}>
                          <div style={fieldLabel}>{f.label}</div>
                          {editingProfile ? (
                            <input type="number" value={editFields[f.key] ?? ""} onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))} style={editInput} placeholder="0" />
                          ) : (
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#ff9500" }}>{f.val ? `${f.val} ${f.suffix}` : "—"}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── DOCUMENTS TAB ─── */}
              {profileTab === "documents" && (() => {
                const docTypeLabel = (t: DocumentType) => t === "job_offer_letter" ? "Job Offer Letter" : t === "contract" ? "Contract" : "Other";
                const docTypeBadge = (t: DocumentType) => {
                  const c = t === "job_offer_letter" ? "#007aff" : t === "contract" ? "#34c759" : "#8e8e93";
                  return { fontSize: 10 as const, fontWeight: 600 as const, padding: "2px 8px" as const, borderRadius: 6, background: `${c}14`, color: c };
                };
                const now = new Date().toISOString().slice(0, 10);
                const validityBadge = (validUntil: string | null) => {
                  if (!validUntil) return null;
                  if (validUntil < now) return { label: "Expired", bg: "rgba(255,59,48,0.08)", color: "#ff3b30" };
                  const daysLeft = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000);
                  if (daysLeft <= 30) return { label: `${daysLeft}d left`, bg: "rgba(255,149,0,0.08)", color: "#ff9500" };
                  return { label: "Valid", bg: "rgba(52,199,89,0.08)", color: "#34c759" };
                };
                return (
                  <div>
                    {profileDocLoading ? (
                      <div style={{ textAlign: "center", padding: 20, color: "#86868b" }}>Loading...</div>
                    ) : profileDocs.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 30, color: "#c7c7cc", fontSize: 13 }}>No documents for this employee</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {profileDocs.map(doc => {
                          const vb = validityBadge(doc.validUntil);
                          return (
                            <div key={doc.id} style={{ background: "#f5f5f7", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ fontSize: 24 }}>{doc.documentType === "contract" ? "📄" : doc.documentType === "job_offer_letter" ? "📝" : "📎"}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <span style={docTypeBadge(doc.documentType)}>{docTypeLabel(doc.documentType)}</span>
                                  {vb && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: vb.bg, color: vb.color }}>{vb.label}</span>}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{doc.label || docTypeLabel(doc.documentType)}</div>
                                {(doc.validFrom || doc.validUntil) && (
                                  <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>
                                    {doc.validFrom && `From ${doc.validFrom}`}{doc.validFrom && doc.validUntil && " — "}{doc.validUntil && `Until ${doc.validUntil}`}
                                  </div>
                                )}
                                {doc.notes && <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>{doc.notes}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>View</a>}
                                {!readOnly && <button onClick={async () => { if (!confirm("Delete this document?")) return; try { await deleteStaffDocument(doc.id); setProfileDocs(prev => prev.filter(d => d.id !== doc.id)); } catch (e: Any) { alert(e.message); } }} style={{ background: "rgba(255,59,48,0.08)", color: "#ff3b30", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ─── ATTENDANCE TAB ─── */}
              {/* ─── ACCOUNT TAB ─── */}
              {profileTab === "account" && (
                <div>
                  {profileStaff.userId ? (
                    /* ── Has account ── */
                    <div>
                      <div style={{ background: "rgba(0,122,255,0.06)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,122,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔐</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#1d1d1f" }}>App Account Active</div>
                            <div style={{ fontSize: 11, color: "#86868b" }}>This employee has access to the application</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", marginBottom: 4 }}>Email</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{profileStaff.accountEmail || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", marginBottom: 4 }}>Role</div>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: profileStaff.accountRole === "admin" ? "rgba(255,59,48,0.08)" : profileStaff.accountRole === "driver" ? "rgba(0,122,255,0.08)" : "rgba(88,86,214,0.08)", color: profileStaff.accountRole === "admin" ? "#ff3b30" : profileStaff.accountRole === "driver" ? "#007aff" : "#5856d6" }}>{profileStaff.accountRole || "—"}</span>
                          </div>
                        </div>
                      </div>
                      {!readOnly && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={async () => {
                            if (!profileStaff.userId) return;
                            try { await resetPasswordForStaff(profileStaff.userId); alert("Password reset email sent successfully."); } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
                          }} style={{ flex: 1, background: "#f5f5f7", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#007aff" }}>
                            📧 Send Password Reset
                          </button>
                          <button onClick={async () => {
                            if (!profileStaff.userId) return;
                            if (!confirm(`Deactivate app access for ${profileStaff.name}?`)) return;
                            try {
                              await deactivateUserAccount(profileStaff.userId);
                              alert("Account deactivated. The user can no longer log in.");
                              await loadAllStaff();
                              const found = allStaff.find(s => s.id === profileStaff.id);
                              if (found) setProfileStaff(found);
                            } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
                          }} style={{ flex: 1, background: "rgba(255,59,48,0.06)", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#ff3b30" }}>
                            🚫 Deactivate Account
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── No account ── */
                    <div>
                      <div style={{ background: "rgba(142,142,147,0.06)", borderRadius: 14, padding: 20, marginBottom: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1d1d1f", marginBottom: 4 }}>No App Account</div>
                        <div style={{ fontSize: 12, color: "#86868b" }}>This employee does not have access to the application yet.</div>
                      </div>
                      {!readOnly && (
                        <div style={{ background: "#fff", border: "1px solid #e5e5ea", borderRadius: 14, padding: 20 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f", marginBottom: 12 }}>Create App Account</div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#86868b", display: "block", marginBottom: 4 }}>Email address</label>
                            <input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="firstname.lastname@chabedubai.com" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#86868b", display: "block", marginBottom: 4 }}>Role (auto-assigned)</label>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", padding: "8px 12px", background: "#f5f5f7", borderRadius: 8 }}>
                              {profileStaff.category === "DRIVER" ? "🚗 Driver" : "👔 Staff"}
                            </div>
                          </div>
                          {accountError && <div style={{ color: "#ff3b30", fontSize: 12, marginBottom: 12, fontWeight: 600 }}>⚠️ {accountError}</div>}
                          {accountTempPassword && (
                            <div style={{ background: "rgba(52,199,89,0.06)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#34c759", textTransform: "uppercase", marginBottom: 6 }}>✅ Account Created</div>
                              <div style={{ fontSize: 12, color: "#1d1d1f", marginBottom: 4 }}>Temporary password:</div>
                              <div style={{ fontFamily: "SF Mono, monospace", fontSize: 16, fontWeight: 800, color: "#1d1d1f", background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e5ea", userSelect: "all" }}>{accountTempPassword}</div>
                              <div style={{ fontSize: 10, color: "#86868b", marginTop: 6 }}>Please share this password securely. The user will be asked to change it on first login.</div>
                            </div>
                          )}
                          {!accountTempPassword && (
                            <button disabled={accountCreating || !accountEmail.includes("@")} onClick={async () => {
                              setAccountCreating(true);
                              setAccountError(null);
                              try {
                                const result = await inviteUserForStaff(profileStaff.id, accountEmail.trim(), profileStaff.name, profileStaff.category);
                                setAccountTempPassword(result.tempPassword || "Check email for invitation link");
                                const freshList = await fetchStaffWithProfiles(true);
                                setAllStaff(freshList);
                                const found = freshList.find(s => s.id === profileStaff.id);
                                if (found) setProfileStaff(found);
                              } catch (e) { setAccountError(e instanceof Error ? e.message : "Failed to create account"); }
                              setAccountCreating(false);
                            }} style={{ width: "100%", background: accountCreating || !accountEmail.includes("@") ? "#c7c7cc" : "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: accountCreating || !accountEmail.includes("@") ? "default" : "pointer", fontFamily: "inherit" }}>
                              {accountCreating ? "Creating account..." : "Create Account & Send Invite"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ATTENDANCE TAB ─── */}
              {profileTab === "attendance" && (() => {
                const daysInProfileMonth = new Date(profileAttYear, profileAttMonth + 1, 0).getDate();
                const empAtt = profileAttendance.filter(r => r.staffId === profileStaff.id);
                const statusCounts: Record<string, number> = {};
                let totalOt = 0;
                empAtt.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; totalOt += r.otHours; });
                return (
                  <div>
                    {/* Month / Year selectors */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                      <select value={profileAttMonth} onChange={e => setProfileAttMonth(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }}>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select value={profileAttYear} onChange={e => setProfileAttYear(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit" }}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#86868b", marginBottom: 10 }}>{monthNames[profileAttMonth]} {profileAttYear} Summary</div>
                    {/* Status counts */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                      {ATT_STATUSES.filter(code => statusCounts[code]).map(code => {
                        const c = ATT_COLORS[code] ?? { bg: "#f5f5f7", color: "#86868b" };
                        return (
                          <div key={code} style={{ background: c.bg, borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{statusCounts[code]}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: c.color, textTransform: "uppercase" }}>{ATT_LABELS[code] || code}</div>
                          </div>
                        );
                      })}
                      {totalOt > 0 && (
                        <div style={{ background: "rgba(255,149,0,0.08)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#ff9500" }}>{totalOt}h</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#ff9500", textTransform: "uppercase" }}>OT Hours</div>
                        </div>
                      )}
                    </div>
                    {empAtt.length === 0 && <div style={{ color: "#c7c7cc", fontSize: 13, textAlign: "center", padding: 20 }}>No attendance records this month</div>}
                    {/* Daily breakdown */}
                    {empAtt.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {Array.from({ length: daysInProfileMonth }, (_, i) => i + 1).map(day => {
                          const dateStr = `${profileAttYear}-${String(profileAttMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const rec = empAtt.find(r => r.date === dateStr);
                          const dayName = dayNames[new Date(profileAttYear, profileAttMonth, day).getDay()];
                          const c = rec ? (ATT_COLORS[rec.status] ?? { bg: "#f5f5f7", color: "#86868b" }) : { bg: "#fff", color: "#d1d1d6" };
                          return (
                            <div key={day} style={{ width: 38, textAlign: "center", padding: "4px 0" }}>
                              <div style={{ fontSize: 8, color: "#86868b", fontWeight: 600 }}>{dayName}</div>
                              <div style={{ fontSize: 10, color: "#86868b", marginBottom: 2 }}>{day}</div>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, color: c.color, fontWeight: 800, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>{rec ? rec.status : "·"}</div>
                              {rec && rec.otHours > 0 && <div style={{ fontSize: 7, fontWeight: 800, color: "#ff9500", marginTop: 1 }}>+{rec.otHours}h</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Save / Cancel for edit mode */}
            {editingProfile && (
              <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setEditingProfile(false)} style={{ background: "#f5f5f7", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#86868b" }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={staffSaving} style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{staffSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════ */}
      {/*  BULK INVITE MODAL                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showBulkInvite && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => !bulkInviting && setShowBulkInvite(false)}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 12px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>🔐 Bulk Invite</div>
                <div style={{ fontSize: 12, color: "#86868b" }}>{bulkInviteList.length} employee(s) without app accounts</div>
              </div>
              <button onClick={() => !bulkInviting && setShowBulkInvite(false)} style={{ background: "#f5f5f7", border: "none", borderRadius: 8, width: 30, height: 30, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "16px 24px" }}>
              {bulkInviteList.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>All employees have accounts!</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "#86868b", marginBottom: 12 }}>Enter an email for each employee you want to invite. Leave blank to skip.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {bulkInviteList.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: bulkInviteProgress[s.id] === "success" ? "rgba(52,199,89,0.06)" : bulkInviteProgress[s.id] === "error" ? "rgba(255,59,48,0.06)" : "#f9f9fb", borderRadius: 10 }}>
                        <div style={{ flex: "0 0 140px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: "#86868b" }}>{s.category} · {s.designation}</div>
                        </div>
                        <input
                          type="email"
                          placeholder="email@chabedubai.com"
                          value={bulkInviteEmails[s.id] || ""}
                          onChange={e => setBulkInviteEmails(prev => ({ ...prev, [s.id]: e.target.value }))}
                          disabled={bulkInviting || bulkInviteProgress[s.id] === "success"}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e5ea", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", minWidth: 0 }}
                        />
                        <div style={{ flex: "0 0 60px", textAlign: "center" }}>
                          {bulkInviteProgress[s.id] === "success" && <span style={{ fontSize: 10, fontWeight: 700, color: "#34c759" }}>✅ Done</span>}
                          {bulkInviteProgress[s.id] === "error" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff3b30" }}>❌ Fail</span>}
                          {bulkInviteProgress[s.id] === "pending" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff9500" }}>⏳</span>}
                          {!bulkInviteProgress[s.id] && <span style={{ fontSize: 10, color: "#c7c7cc" }}>—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Results summary */}
                  {Object.keys(bulkInviteResults).length > 0 && (
                    <div style={{ background: "rgba(52,199,89,0.06)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#34c759", textTransform: "uppercase", marginBottom: 8 }}>Temporary Passwords</div>
                      {Object.entries(bulkInviteResults).map(([id, pwd]) => {
                        const s = bulkInviteList.find(x => x.id === Number(id));
                        return (
                          <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid rgba(52,199,89,0.1)" }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{s?.name ?? id}</span>
                            <span style={{ fontFamily: "SF Mono, monospace", fontSize: 12, fontWeight: 700, userSelect: "all" }}>{pwd}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    disabled={bulkInviting || Object.values(bulkInviteEmails).filter(e => e.includes("@")).length === 0}
                    onClick={async () => {
                      setBulkInviting(true);
                      const entries = bulkInviteList.filter(s => (bulkInviteEmails[s.id] || "").includes("@"));
                      const progress: Record<number, "pending" | "success" | "error"> = {};
                      entries.forEach(s => { progress[s.id] = "pending"; });
                      setBulkInviteProgress({ ...progress });

                      const results: Record<number, string> = {};
                      for (const s of entries) {
                        try {
                          const r = await inviteUserForStaff(s.id, bulkInviteEmails[s.id].trim(), s.name, s.category);
                          progress[s.id] = "success";
                          results[s.id] = r.tempPassword || "Check email";
                        } catch {
                          progress[s.id] = "error";
                        }
                        setBulkInviteProgress({ ...progress });
                        setBulkInviteResults({ ...results });
                      }
                      setBulkInviting(false);
                      await loadAllStaff();
                    }}
                    style={{ width: "100%", background: bulkInviting ? "#c7c7cc" : "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: bulkInviting ? "default" : "pointer", fontFamily: "inherit" }}
                  >
                    {bulkInviting ? "Inviting..." : `Invite ${Object.values(bulkInviteEmails).filter(e => e.includes("@")).length} employee(s)`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesView({ readOnly = false }: { readOnly?: boolean }) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"clients" | "prospects" | false>(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"clients" | "prospects" | "contacts" | "activities">("clients");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<number, LeadActivity[]>>({});
  const [activityForm, setActivityForm] = useState<{ leadId: number; type: ActivityType } | null>(null);
  const [activityNote, setActivityNote] = useState("");
  // Global activity feed state
  const [allActivities, setAllActivities] = useState<ActivityWithLead[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityFilterType, setActivityFilterType] = useState<ActivityType | "all">("all");
  const [activityFilterDays, setActivityFilterDays] = useState<number>(30);
  const [activitySaving, setActivitySaving] = useState(false);
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);
  // Contacts library state
  const [allContacts, setAllContacts] = useState<ProspectContactRecord[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<ContactStatus | "all">("all");
  const [contactVerticalFilter, setContactVerticalFilter] = useState<string | null>(null);
  const [expandedContactId, setExpandedContactId] = useState<number | null>(null);
  // Junction-table contacts for expanded lead cards
  const [leadContacts, setLeadContacts] = useState<Record<number, ProspectContactRecord[]>>({});
  // Add contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactForLeadId, setAddContactForLeadId] = useState<number | null>(null);
  const emptyContact = { first_name: "", last_name: "", title: "", email: "", phone: "", linkedin_url: "", organization_name: "", vertical: "", seniority: "", city: "", country: "United Arab Emirates" };
  const [newContact, setNewContact] = useState(emptyContact);
  const [addContactSaving, setAddContactSaving] = useState(false);
  // Apollo search modal
  const [showApolloSearch, setShowApolloSearch] = useState(false);
  const [apolloSearchLeadId, setApolloSearchLeadId] = useState<number | null>(null);
  const [apolloSearchCompany, setApolloSearchCompany] = useState("");
  const [apolloSearchVertical, setApolloSearchVertical] = useState("");
  const [apolloResults, setApolloResults] = useState<ApolloSearchResult[]>([]);
  const [apolloTotal, setApolloTotal] = useState(0);
  const [apolloPage, setApolloPage] = useState(1);
  const [apolloTotalPages, setApolloTotalPages] = useState(1);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [apolloSelected, setApolloSelected] = useState<Set<number>>(new Set());
  const [apolloImporting, setApolloImporting] = useState(false);
  const [apolloError, setApolloError] = useState<string | null>(null);
  const [generatingEmailFor, setGeneratingEmailFor] = useState<number | null>(null);

  const handleGenerateEmail = async (leadId: number) => {
    setGeneratingEmailFor(leadId);
    try {
      const { email_draft, message_draft } = await generateLeadEmail(leadId);
      const lead = leads.find((l) => l.id === leadId);
      const autoPromote = lead && lead.status === "new";
      // Update lead with email draft + auto-promote to "contacted" if still "new"
      const updates: Record<string, unknown> = { email_draft, message_draft };
      if (autoPromote) {
        updates.status = "contacted";
        updates.last_contact_date = new Date().toISOString();
      }
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, ...updates } as typeof l : l));
      // Persist status change + log activities
      if (autoPromote) {
        await updateSalesLead(leadId, { status: "contacted" as LeadStatus, last_contact_date: new Date().toISOString() });
        const act = await createLeadActivity(leadId, "status_change", `${STATUS_LABELS["new"]} → ${STATUS_LABELS["contacted"]}`);
        const act2 = await createLeadActivity(leadId, "email_sent", "Email généré par le BD AI");
        setActivities((prev) => ({ ...prev, [leadId]: [act2, act, ...(prev[leadId] ?? [])] }));
      } else {
        // Just log the email activity
        const act = await createLeadActivity(leadId, "email_sent", "Email généré par le BD AI");
        setActivities((prev) => ({ ...prev, [leadId]: [act, ...(prev[leadId] ?? [])] }));
      }
    } catch (err) {
      console.error("Email generation failed:", err);
    } finally {
      setGeneratingEmailFor(null);
    }
  };

  const [enrichingContactId, setEnrichingContactId] = useState<number | null>(null);
  const [enrichingSuggestedKey, setEnrichingSuggestedKey] = useState<string | null>(null);

  const handleEnrichContact = async (contact: ProspectContactRecord) => {
    if (!contact.first_name || !contact.last_name) return;
    setEnrichingContactId(contact.id);
    try {
      const result = await enrichContactViaApollo({
        contact_id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name || undefined,
        organization_name: contact.organization_name || undefined,
        linkedin_url: contact.linkedin_url || undefined,
      });
      if (result.found) {
        const updatedContacts = await fetchProspectContacts();
        setAllContacts(updatedContacts);
        for (const lead of leads) {
          const lc = await fetchContactsForLead(lead.id);
          setLeadContacts((prev) => ({ ...prev, [lead.id]: lc }));
        }
      }
    } catch (err) {
      console.error("Enrichment failed:", err);
    } finally {
      setEnrichingContactId(null);
    }
  };

  /** Enrich a SUGGESTED contact from BD AI: create in DB → link to lead → Apollo enrich */
  const handleEnrichSuggested = async (leadId: number, sc: { first_name: string; last_name: string; title: string; seniority?: string | null }, accountName: string, vertical: string) => {
    const key = `${leadId}-${sc.first_name}-${sc.last_name}`;
    setEnrichingSuggestedKey(key);
    try {
      // 1. Create contact in prospect_contacts
      const newContact = await createProspectContact({
        first_name: sc.first_name,
        last_name: sc.last_name,
        title: sc.title,
        organization_name: accountName,
        vertical: vertical,
        seniority: sc.seniority || undefined,
      });
      // 2. Link to lead
      await linkContactToLead(newContact.id, leadId, sc.title);
      // 3. Apollo enrich for email
      try {
        await enrichContactViaApollo({
          contact_id: newContact.id,
          first_name: sc.first_name,
          last_name: sc.last_name,
          organization_name: accountName,
        });
      } catch (enrichErr) {
        console.warn("Apollo enrichment failed (contact still created):", enrichErr);
      }
      // 4. Refresh lead contacts
      const lc = await fetchContactsForLead(leadId);
      setLeadContacts((prev) => ({ ...prev, [leadId]: lc }));
      // Also refresh all contacts list
      const updatedContacts = await fetchProspectContacts();
      setAllContacts(updatedContacts);
    } catch (err) {
      console.error("Suggested contact enrichment failed:", err);
    } finally {
      setEnrichingSuggestedKey(null);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSalesLeads();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(mode: "clients" | "prospects") {
    setGenerating(mode);
    setError(null);
    try {
      const newLeads = await generateSalesLeads(mode, mode === "prospects" && selectedVertical ? selectedVertical : undefined);
      setLeads((prev) => [...newLeads, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateStatus(id: number, status: LeadStatus) {
    try {
      const lead = leads.find((l) => l.id === id);
      const oldStatus = lead?.status;
      await updateSalesLead(id, { status, last_contact_date: new Date().toISOString() });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, last_contact_date: new Date().toISOString() } : l)));
      // Auto-log status change in timeline
      if (oldStatus !== status) {
        const act = await createLeadActivity(id, "status_change", `${STATUS_LABELS[oldStatus as LeadStatus] ?? oldStatus} \u2192 ${STATUS_LABELS[status]}`);
        setActivities((prev) => ({ ...prev, [id]: [act, ...(prev[id] ?? [])] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSalesLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadActivities(leadId: number) {
    if (activities[leadId]) return; // already loaded
    try {
      const acts = await fetchLeadActivities(leadId);
      setActivities((prev) => ({ ...prev, [leadId]: acts }));
    } catch { /* silent */ }
  }

  async function handleAddActivity() {
    if (!activityForm) return;
    setActivitySaving(true);
    try {
      const act = await createLeadActivity(activityForm.leadId, activityForm.type, activityNote || undefined);
      setActivities((prev) => ({ ...prev, [activityForm.leadId]: [act, ...(prev[activityForm.leadId] ?? [])] }));
      // Update last_contact_date for contact-type activities
      const isContactActivity = ["email_sent", "call", "meeting", "linkedin"].includes(activityForm.type);
      if (isContactActivity) {
        const lead = leads.find((l) => l.id === activityForm.leadId);
        const shouldPromote = lead && lead.status === "new";
        const updates: { last_contact_date: string; status?: LeadStatus } = { last_contact_date: new Date().toISOString() };
        if (shouldPromote) updates.status = "contacted";
        await updateSalesLead(activityForm.leadId, updates);
        setLeads((prev) => prev.map((l) => (l.id === activityForm.leadId ? { ...l, ...updates } : l)));
        // Auto-log status change in timeline
        if (shouldPromote) {
          const statusAct = await createLeadActivity(activityForm.leadId, "status_change", `${STATUS_LABELS["new"]} → ${STATUS_LABELS["contacted"]}`);
          setActivities((prev) => ({ ...prev, [activityForm.leadId]: [statusAct, ...(prev[activityForm.leadId] ?? [])] }));
        }
      }
      setActivityForm(null);
      setActivityNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActivitySaving(false);
    }
  }

  async function handleSetFollowUp(leadId: number, date: string | null) {
    try {
      await updateSalesLead(leadId, { next_follow_up: date });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, next_follow_up: date } : l)));
      if (date) {
        const act = await createLeadActivity(leadId, "follow_up", `Relance planifi\u00e9e : ${new Date(date).toLocaleDateString("fr-FR")}`);
        setActivities((prev) => ({ ...prev, [leadId]: [act, ...(prev[leadId] ?? [])] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Load contacts library when switching to contacts tab
  async function loadContacts() {
    setContactsLoading(true);
    try {
      const data = await fetchProspectContacts();
      setAllContacts(data);
    } catch { /* silent */ }
    finally { setContactsLoading(false); }
  }

  // Load global activity feed
  async function loadAllActivities() {
    setActivitiesLoading(true);
    try {
      const data = await fetchAllActivities({
        days: activityFilterDays || undefined,
        activityType: activityFilterType !== "all" ? activityFilterType : undefined,
      });
      setAllActivities(data);
    } catch { /* silent */ }
    finally { setActivitiesLoading(false); }
  }

  // Load contacts for a specific lead via junction table
  async function loadLeadContacts(leadId: number) {
    if (leadContacts[leadId]) return; // already loaded
    try {
      const contacts = await fetchContactsForLead(leadId);
      setLeadContacts((prev) => ({ ...prev, [leadId]: contacts }));
    } catch { /* silent — fall back to JSONB */ }
  }

  // Update contact status inline
  async function handleContactStatusChange(contactId: number, newStatus: ContactStatus) {
    try {
      await updateProspectContact(contactId, { status: newStatus });
      setAllContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status: newStatus } : c)));
      // Also update in leadContacts cache
      setLeadContacts((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[Number(key)] = updated[Number(key)].map((c) => (c.id === contactId ? { ...c, status: newStatus } : c));
        }
        return updated;
      });
      await createContactActivity(contactId, "status_change", `Statut → ${newStatus}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function openAddContactModal(leadId: number | null, prefillOrg?: string, prefillVertical?: string) {
    setAddContactForLeadId(leadId);
    setNewContact({ ...emptyContact, organization_name: prefillOrg || "", vertical: prefillVertical || "" });
    setShowAddContact(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function _openApolloSearch(leadId: number, company: string, vertical: string) {
    setApolloSearchLeadId(leadId);
    setApolloSearchCompany(company);
    setApolloSearchVertical(vertical);
    setApolloResults([]);
    setApolloSelected(new Set());
    setApolloTotal(0);
    setApolloPage(1);
    setApolloError(null);
    setShowApolloSearch(true);
    // Auto-search
    doApolloSearch(company, 1);
  }

  async function doApolloSearch(company: string, page: number) {
    setApolloLoading(true);
    setApolloError(null);
    try {
      const result = await searchApolloContacts(company, { page });
      setApolloResults(result.contacts);
      setApolloTotal(result.total);
      setApolloPage(result.page);
      setApolloTotalPages(result.total_pages);
      setApolloSelected(new Set());
    } catch (err) {
      setApolloError(err instanceof Error ? err.message : String(err));
    } finally {
      setApolloLoading(false);
    }
  }

  function toggleApolloSelect(idx: number) {
    setApolloSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function toggleApolloSelectAll() {
    if (apolloSelected.size === apolloResults.length) {
      setApolloSelected(new Set());
    } else {
      setApolloSelected(new Set(apolloResults.map((_, i) => i)));
    }
  }

  async function handleApolloImport() {
    if (apolloSelected.size === 0) return;
    setApolloImporting(true);
    try {
      const selected = apolloResults.filter((_, i) => apolloSelected.has(i));
      for (const c of selected) {
        const created = await createProspectContact({
          first_name: c.first_name || "?",
          last_name: c.last_name || undefined,
          title: c.title || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          linkedin_url: c.linkedin_url || undefined,
          organization_name: c.organization_name || apolloSearchCompany,
          organization_domain: c.organization_domain || undefined,
          vertical: apolloSearchVertical || undefined,
          seniority: c.seniority || undefined,
          city: c.city || undefined,
          country: c.country || "United Arab Emirates",
        });
        if (apolloSearchLeadId) {
          await linkContactToLead(created.id, apolloSearchLeadId, c.title || undefined);
        }
        setAllContacts((prev) => [created, ...prev]);
      }
      // Refresh lead contacts
      if (apolloSearchLeadId) {
        const freshContacts = await fetchContactsForLead(apolloSearchLeadId);
        setLeadContacts((prev) => ({ ...prev, [apolloSearchLeadId!]: freshContacts }));
      }
      setShowApolloSearch(false);
    } catch (err) {
      setApolloError(err instanceof Error ? err.message : String(err));
    } finally {
      setApolloImporting(false);
    }
  }

  async function handleAddContact() {
    if (!newContact.first_name.trim()) return;
    setAddContactSaving(true);
    try {
      const created = await createProspectContact({
        first_name: newContact.first_name.trim(),
        last_name: newContact.last_name.trim() || undefined,
        title: newContact.title.trim() || undefined,
        email: newContact.email.trim() || undefined,
        phone: newContact.phone.trim() || undefined,
        linkedin_url: newContact.linkedin_url.trim() || undefined,
        organization_name: newContact.organization_name.trim() || undefined,
        vertical: newContact.vertical.trim() || undefined,
        seniority: newContact.seniority.trim() || undefined,
        city: newContact.city.trim() || undefined,
        country: newContact.country.trim() || undefined,
      });
      // Link to lead if applicable
      if (addContactForLeadId) {
        await linkContactToLead(created.id, addContactForLeadId, newContact.title.trim() || undefined);
        // Refresh that lead's contacts
        const freshContacts = await fetchContactsForLead(addContactForLeadId);
        setLeadContacts((prev) => ({ ...prev, [addContactForLeadId!]: freshContacts }));
      }
      // Refresh global contacts list
      setAllContacts((prev) => [created, ...prev]);
      // Close + reset
      setShowAddContact(false);
      setNewContact(emptyContact);
      setAddContactForLeadId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddContactSaving(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const followUpDueLeads = leads.filter((l) => l.next_follow_up && l.next_follow_up <= today && l.status !== "dismissed" && l.status !== "converted");

  const isProspectLead = (l: SalesLead) => l.lead_type === "new_prospect";
  const clientLeads = leads.filter((l) => !isProspectLead(l));
  const prospectLeads = leads.filter(isProspectLead);
  const currentLeads = subTab === "clients" ? clientLeads : prospectLeads;
  const verticalFiltered = subTab === "prospects" && selectedVertical
    ? currentLeads.filter((l) => l.vertical?.toLowerCase() === selectedVertical.toLowerCase())
    : currentLeads;
  const followUpFiltered = showFollowUpOnly
    ? verticalFiltered.filter((l) => l.next_follow_up && l.next_follow_up <= today)
    : verticalFiltered;
  const filtered = followUpFiltered.filter((l) => filterStatus === "all" || l.status === filterStatus);
  const counts = {
    new: verticalFiltered.filter((l) => l.status === "new").length,
    contacted: verticalFiltered.filter((l) => l.status === "contacted").length,
    converted: verticalFiltered.filter((l) => l.status === "converted").length,
    dismissed: verticalFiltered.filter((l) => l.status === "dismissed").length,
  };

  const draftBoxStyle: React.CSSProperties = {
    backgroundColor: "#f9f9fb",
    border: "1px solid #e8e8ed",
    borderRadius: 10,
    padding: 14,
    fontSize: 12,
    color: "#1d1d1f",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
  };

  const spinnerEl = <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1d1d1f" }}>Sales Intelligence</div>

      {/* Follow-up reminder banner */}
      {followUpDueLeads.length > 0 && (
        <button
          onClick={() => { setShowFollowUpOnly(!showFollowUpOnly); setFilterStatus("all"); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
            backgroundColor: showFollowUpOnly ? "#ff3b30" : "#fff3cd", color: showFollowUpOnly ? "#fff" : "#856404",
            transition: "all 0.15s",
          }}
        >
          <span style={{ fontSize: 16 }}>{"\uD83D\uDD14"}</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {followUpDueLeads.length} prospect{followUpDueLeads.length > 1 ? "s" : ""} {"\u00e0"} relancer aujourd'hui
          </span>
          {showFollowUpOnly && <span style={{ fontSize: 10, marginLeft: "auto", opacity: 0.8 }}>Cliquer pour d{"\u00e9"}sactiver le filtre</span>}
        </button>
      )}

      {/* Sub-tabs + generate button */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "2px solid #f0f0f2", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {([
          { id: "clients" as const, label: "Clients", count: clientLeads.length },
          { id: "prospects" as const, label: "Prospects", count: prospectLeads.length },
          { id: "contacts" as const, label: "Contacts", count: allContacts.length },
          { id: "activities" as const, label: "Activit\u00e9s", count: allActivities.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSubTab(tab.id);
              setFilterStatus("all");
              setExpandedId(null);
              if (tab.id === "contacts" && allContacts.length === 0) loadContacts();
              if (tab.id === "activities") loadAllActivities();
            }}
            style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              border: "none", borderBottom: subTab === tab.id ? "2px solid #1d1d1f" : "2px solid transparent",
              backgroundColor: "transparent", color: subTab === tab.id ? "#1d1d1f" : "#86868b",
              marginBottom: -2, transition: "all 0.15s",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, backgroundColor: subTab === tab.id ? "#1d1d1f" : "#e0e0e0", color: subTab === tab.id ? "#fff" : "#86868b", borderRadius: 10, padding: "1px 7px" }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {!readOnly && (subTab === "clients" || subTab === "prospects") && (
          <button
            onClick={() => handleGenerate(subTab)}
            disabled={!!generating || (subTab === "prospects" && !selectedVertical)}
            style={{
              backgroundColor: generating === subTab ? "#86868b" : (subTab === "prospects" && !selectedVertical) ? "#c7c7cc" : subTab === "clients" ? "#1d1d1f" : "#007aff",
              color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px",
              fontSize: 12, fontWeight: 700, cursor: generating || (subTab === "prospects" && !selectedVertical) ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6, transition: "background-color 0.15s",
            }}
          >
            {generating === subTab ? <>{spinnerEl} {subTab === "clients" ? "Analyse\u2026" : "Recherche\u2026"}</> : subTab === "clients" ? "Analyser les clients" : selectedVertical ? `Prospecter : ${selectedVertical}` : "Choisir une industrie"}
          </button>
        )}
      </div>

      {/* Industry selector — prospects tab: MANDATORY for generation */}
      {subTab === "prospects" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#86868b", marginRight: 4 }}>Industrie :</span>
            {["Travel", "Hotels", "Finance", "Family Offices", "Luxury Brands", "Airlines", "Airspace & Defence", "Embassies & Government", "Events, Entertainment & Sports", "Professional Services", "IT & Tech", "Health", "Concierge Companies", "Industries"].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVertical(selectedVertical === v ? null : v)}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                  borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: selectedVertical === v ? "none" : "1px solid #e8e8ed",
                  backgroundColor: selectedVertical === v ? "#007aff" : "#fff",
                  color: selectedVertical === v ? "#fff" : "#636366",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          {!selectedVertical && (
            <div style={{ fontSize: 12, color: "#ff9500", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {"\u26A0\uFE0F"} Sélectionnez une industrie pour lancer la prospection
            </div>
          )}
        </div>
      )}

      {/* ─── CONTACTS LIBRARY TAB ─── */}
      {subTab === "contacts" && (() => {
        const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = { discovered: "Découvert", engaged: "Engagé", responded: "Répondu", invalid: "Invalide" };
        const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = { discovered: "#007aff", engaged: "#ff9500", responded: "#34c759", invalid: "#86868b" };
        const contactVerticals = [...new Set(allContacts.map((c) => c.vertical).filter(Boolean))] as string[];
        const filteredContacts = allContacts.filter((c) => {
          if (contactStatusFilter !== "all" && c.status !== contactStatusFilter) return false;
          if (contactVerticalFilter && c.vertical?.toLowerCase() !== contactVerticalFilter.toLowerCase()) return false;
          if (contactSearch) {
            const q = contactSearch.toLowerCase();
            const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
            return fullName.includes(q) || c.email?.toLowerCase().includes(q) || c.organization_name?.toLowerCase().includes(q);
          }
          return true;
        });
        const cCounts = {
          total: allContacts.length,
          withEmail: allContacts.filter((c) => c.email).length,
          engaged: allContacts.filter((c) => c.status === "engaged").length,
          responded: allContacts.filter((c) => c.status === "responded").length,
        };

        return <>
          {/* Header with add button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
            </div>
            {!readOnly && <button onClick={() => openAddContactModal(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                backgroundColor: "#007aff", color: "#fff", border: "none", borderRadius: 8,
                padding: "7px 14px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}>
              + Ajouter un contact
            </button>}
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Rechercher par nom, email, entreprise..."
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 16px", fontSize: 13, borderRadius: 10, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none", backgroundColor: "#fff" }}
          />

          {/* Status filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#86868b", marginRight: 4 }}>Statut :</span>
            {(["all", "discovered", "engaged", "responded", "invalid"] as const).map((s) => (
              <button key={s} onClick={() => setContactStatusFilter(s)}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                  borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: contactStatusFilter === s ? "none" : "1px solid #e8e8ed",
                  backgroundColor: contactStatusFilter === s ? "#1d1d1f" : "#fff",
                  color: contactStatusFilter === s ? "#fff" : "#636366",
                }}>
                {s === "all" ? "Tous" : CONTACT_STATUS_LABELS[s]}
              </button>
            ))}
            {contactVerticals.length > 0 && <>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#86868b", marginLeft: 12, marginRight: 4 }}>Vertical :</span>
              <button onClick={() => setContactVerticalFilter(null)}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                  borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: contactVerticalFilter === null ? "none" : "1px solid #e8e8ed",
                  backgroundColor: contactVerticalFilter === null ? "#007aff" : "#fff",
                  color: contactVerticalFilter === null ? "#fff" : "#636366",
                }}>Tous</button>
              {contactVerticals.slice(0, 10).map((v) => (
                <button key={v} onClick={() => setContactVerticalFilter(contactVerticalFilter === v ? null : v)}
                  style={{
                    padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                    borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                    border: contactVerticalFilter === v ? "none" : "1px solid #e8e8ed",
                    backgroundColor: contactVerticalFilter === v ? "#007aff" : "#fff",
                    color: contactVerticalFilter === v ? "#fff" : "#636366",
                  }}>{v}</button>
              ))}
            </>}
          </div>

          {/* KPI row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Total contacts", value: cCounts.total, color: "#1d1d1f" },
              { label: "Avec email", value: cCounts.withEmail, color: "#007aff" },
              { label: "Engagés", value: cCounts.engaged, color: "#ff9500" },
              { label: "Répondus", value: cCounts.responded, color: "#34c759" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ flex: "1 1 0", minWidth: 100, backgroundColor: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #f0f0f2" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Contact list */}
          {contactsLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#86868b", fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #e0e0e0", borderTop: "3px solid #1d1d1f", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
              Chargement des contacts{"\u2026"}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucun contact</div>
              <div style={{ fontSize: 12 }}>Les contacts seront ajout{"\u00e9"}s automatiquement lors de la recherche de prospects avec Apollo.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredContacts.map((contact) => {
                const cName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
                const initials = (contact.first_name?.[0] ?? "") + (contact.last_name?.[0] || (contact.first_name?.[1] ?? ""));
                const initialsUp = initials.toUpperCase() || "?";
                const isExp = expandedContactId === contact.id;
                return (
                  <div key={contact.id} style={{ backgroundColor: "#fff", borderRadius: 12, border: isExp ? "1px solid #d0d0d5" : "1px solid #f0f0f2", overflow: "hidden", transition: "all 0.15s" }}>
                    {/* Compact row */}
                    <div onClick={() => setExpandedContactId(isExp ? null : contact.id)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: CONTACT_STATUS_COLORS[contact.status], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initialsUp}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cName}
                        </div>
                        <div style={{ fontSize: 11, color: "#86868b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[contact.title, contact.organization_name].filter(Boolean).join(" \u2014 ")}
                        </div>
                      </div>
                      {contact.vertical && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 5, backgroundColor: "#f0f0f2", color: "#636366", flexShrink: 0, whiteSpace: "nowrap" }}>{contact.vertical}</span>}
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, backgroundColor: `${CONTACT_STATUS_COLORS[contact.status]}18`, color: CONTACT_STATUS_COLORS[contact.status], flexShrink: 0 }}>
                        {CONTACT_STATUS_LABELS[contact.status]}
                      </span>
                      {contact.email_verified && <span style={{ fontSize: 9, color: "#34c759", fontWeight: 700, flexShrink: 0 }} title="Email vérifié">{"\u2713"}</span>}
                      <span style={{ fontSize: 10, color: "#007aff", fontWeight: 600, flexShrink: 0 }}>{isExp ? "\u25B4" : "\u25BE"}</span>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div style={{ borderTop: "1px solid #f0f0f2", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: "#007aff", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              {"\u2709\uFE0F"} {contact.email}
                              {contact.email_verified && <span style={{ fontSize: 9, color: "#34c759", fontWeight: 700 }}>{"\u2713"}</span>}
                            </a>
                          )}
                          {contact.linkedin_url && (
                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0a66c2", textDecoration: "none", fontWeight: 600 }}>
                              in LinkedIn
                            </a>
                          )}
                          {contact.phone && <span style={{ fontSize: 12, color: "#636366" }}>{"\uD83D\uDCDE"} {contact.phone}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                          {contact.seniority && <span style={{ padding: "2px 8px", borderRadius: 5, backgroundColor: "#e8f4fd", color: "#007aff", fontWeight: 600 }}>{contact.seniority}</span>}
                          {contact.city && <span style={{ color: "#86868b" }}>{"\uD83D\uDCCD"} {contact.city}{contact.country ? `, ${contact.country}` : ""}</span>}
                          {contact.organization_domain && <span style={{ color: "#86868b" }}>{"\uD83C\uDF10"} {contact.organization_domain}</span>}
                        </div>
                        {/* Status buttons */}
                        <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                          {(["discovered", "engaged", "responded", "invalid"] as const).map((s) => (
                            <button key={s} onClick={() => handleContactStatusChange(contact.id, s)}
                              style={{
                                backgroundColor: contact.status === s ? CONTACT_STATUS_COLORS[s] : "#f5f5f7",
                                color: contact.status === s ? "#fff" : "#86868b",
                                border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                              }}>
                              {CONTACT_STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: "#86868b" }}>
                          Ajouté le {new Date(contact.created_at).toLocaleDateString("fr-FR")}
                          {contact.enrichment_source && <> {"\u2014"} Source : {contact.enrichment_source}</>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>;
      })()}

      {/* ─── Activities Feed ─── */}
      {subTab === "activities" && (() => {
        const ATYPE_ICONS: Record<string, string> = { email_sent: "\u2709\uFE0F", call: "\uD83D\uDCDE", meeting: "\uD83E\uDD1D", linkedin: "\uD83D\uDD17", note: "\uD83D\uDCDD", status_change: "\uD83D\uDD04", follow_up: "\uD83D\uDD14" };
        const ATYPE_LABELS: Record<string, string> = { email_sent: "Email", call: "Appel", meeting: "Meeting", linkedin: "LinkedIn", note: "Note", status_change: "Statut", follow_up: "Relance" };
        const ATYPE_COLORS: Record<string, string> = { email_sent: "#007aff", call: "#34c759", meeting: "#ff9500", linkedin: "#0a66c2", note: "#86868b", status_change: "#636366", follow_up: "#ff3b30" };

        // Group by day
        const grouped = allActivities.reduce<Record<string, ActivityWithLead[]>>((acc, act) => {
          const day = act.created_at.split("T")[0];
          if (!acc[day]) acc[day] = [];
          acc[day].push(act);
          return acc;
        }, {});
        const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        // Stats
        const now = new Date();
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeek = allActivities.filter((a) => new Date(a.created_at) >= weekAgo);
        const emailsSent = thisWeek.filter((a) => a.activity_type === "email_sent").length;
        const callsMade = thisWeek.filter((a) => a.activity_type === "call").length;
        const meetingsBooked = thisWeek.filter((a) => a.activity_type === "meeting").length;

        const formatDay = (d: string) => {
          const today = new Date().toISOString().split("T")[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
          if (d === today) return "Aujourd'hui";
          if (d === yesterday) return "Hier";
          return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        };

        return <>
          {/* Stats cards */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Emails", value: emailsSent, icon: "\u2709\uFE0F", color: "#007aff" },
              { label: "Appels", value: callsMade, icon: "\uD83D\uDCDE", color: "#34c759" },
              { label: "Meetings", value: meetingsBooked, icon: "\uD83E\uDD1D", color: "#ff9500" },
              { label: "Total 7j", value: thisWeek.length, icon: "\uD83D\uDCC8", color: "#1d1d1f" },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #f0f0f2", padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {([
              { value: "all" as const, label: "Tout" },
              { value: "email_sent" as ActivityType, label: "\u2709\uFE0F Email" },
              { value: "call" as ActivityType, label: "\uD83D\uDCDE Appel" },
              { value: "meeting" as ActivityType, label: "\uD83E\uDD1D Meeting" },
              { value: "linkedin" as ActivityType, label: "in LinkedIn" },
              { value: "note" as ActivityType, label: "\uD83D\uDCDD Note" },
            ]).map((f) => (
              <button
                key={f.value}
                onClick={() => { setActivityFilterType(f.value); setTimeout(loadAllActivities, 0); }}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                  borderRadius: 6, cursor: "pointer", border: "none",
                  backgroundColor: activityFilterType === f.value ? "#1d1d1f" : "#f5f5f7",
                  color: activityFilterType === f.value ? "#fff" : "#636366",
                }}
              >
                {f.label}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {([
                { value: 7, label: "7j" }, { value: 30, label: "30j" }, { value: 90, label: "90j" }, { value: 0, label: "Tout" },
              ]).map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setActivityFilterDays(p.value); setTimeout(loadAllActivities, 0); }}
                  style={{
                    padding: "4px 10px", fontSize: 10, fontWeight: 600, fontFamily: "inherit",
                    borderRadius: 5, cursor: "pointer",
                    border: activityFilterDays === p.value ? "none" : "1px solid #e8e8ed",
                    backgroundColor: activityFilterDays === p.value ? "#007aff" : "#fff",
                    color: activityFilterDays === p.value ? "#fff" : "#86868b",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {activitiesLoading && (
            <div style={{ textAlign: "center", padding: 30, color: "#86868b", fontSize: 13 }}>
              <div style={{ width: 24, height: 24, border: "3px solid #e0e0e0", borderTop: "3px solid #1d1d1f", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
              Chargement des activit{"\u00e9"}s{"\u2026"}
            </div>
          )}

          {/* Empty state */}
          {!activitiesLoading && allActivities.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucune activit{"\u00e9"}</div>
              <div style={{ fontSize: 12 }}>Les activit{"\u00e9"}s enregistr{"\u00e9"}es sur vos leads apparaitront ici.</div>
            </div>
          )}

          {/* Grouped timeline */}
          {!activitiesLoading && days.map((day) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #f0f0f2" }}>
                {formatDay(day)}
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: "#aeaeb2" }}>({grouped[day].length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {grouped[day].map((act) => {
                  const time = new Date(act.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  const typeColor = ATYPE_COLORS[act.activity_type] ?? "#86868b";
                  return (
                    <div
                      key={act.id}
                      onClick={() => { setSubTab("prospects"); setExpandedId(act.lead_id); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #f0f0f2", cursor: "pointer", transition: "all 0.1s" }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{ATYPE_ICONS[act.activity_type] ?? "\u2022"}</span>
                      <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: typeColor, flexShrink: 0, opacity: 0.6 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ATYPE_LABELS[act.activity_type] ?? act.activity_type}
                          {act.account_name && <span style={{ fontWeight: 400, color: "#86868b" }}> {"\u2014"} {act.account_name}</span>}
                        </div>
                        {act.notes && <div style={{ fontSize: 11, color: "#636366", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.notes}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: "#aeaeb2", flexShrink: 0, fontWeight: 600 }}>{time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>;
      })()}

      {/* Error */}
      {error && (
        <div style={{ backgroundColor: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#c0392b", fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* KPI row — clickable to filter (clients/prospects only) */}
      {subTab !== "contacts" && subTab !== "activities" && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(["new", "contacted", "converted", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            style={{
              flex: "1 1 0", minWidth: 100, backgroundColor: filterStatus === s ? "#1d1d1f" : "#fff", borderRadius: 12,
              padding: "12px 16px", border: filterStatus === s ? "none" : "1px solid #f0f0f2", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 4, fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: filterStatus === s ? "rgba(255,255,255,0.7)" : "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{STATUS_LABELS[s]}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: filterStatus === s ? "#fff" : s === "converted" ? "#34c759" : s === "dismissed" ? "#86868b" : "#1d1d1f" }}>{counts[s]}</span>
          </button>
        ))}
      </div>}

      {/* Lead list (clients/prospects only) */}
      {subTab !== "contacts" && subTab !== "activities" && (loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868b", fontSize: 13 }}>
          <div style={{ width: 28, height: 28, border: "3px solid #e0e0e0", borderTop: "3px solid #1d1d1f", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
          Chargement\u2026
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{subTab === "clients" ? "Aucune piste client" : "Aucun prospect"}</div>
          <div style={{ fontSize: 12 }}>{subTab === "clients" ? "Cliquez \u00ab\u00a0Analyser les clients\u00a0\u00bb pour d\u00e9tecter des opportunit\u00e9s." : "Cliquez \u00ab\u00a0Trouver des prospects\u00a0\u00bb pour d\u00e9couvrir de nouvelles cibles."}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((lead) => {
            const typeConf = LEAD_TYPE_CONFIG[lead.lead_type];
            const confConf = CONFIDENCE_CONFIG[lead.confidence];
            const isExpanded = expandedId === lead.id;
            const followUpDue = lead.next_follow_up && lead.next_follow_up <= today;
            const followUpSoon = lead.next_follow_up && !followUpDue && lead.next_follow_up <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
            return (
              <div key={lead.id} style={{ backgroundColor: "#fff", borderRadius: 12, border: isExpanded ? "1px solid #d0d0d5" : followUpDue ? "1px solid #ff3b30" : "1px solid #f0f0f2", overflow: "hidden", transition: "all 0.15s" }}>
                {/* Compact header row */}
                <div onClick={() => { setExpandedId(isExpanded ? null : lead.id); if (!isExpanded) { loadActivities(lead.id); loadLeadContacts(lead.id); } }} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, backgroundColor: typeConf.bg, color: typeConf.color, flexShrink: 0, whiteSpace: "nowrap" }}>{typeConf.label}</span>
                  {lead.vertical && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 5, backgroundColor: "#f0f0f2", color: "#636366", flexShrink: 0, whiteSpace: "nowrap" }}>{lead.vertical}</span>}
                  {followUpDue && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5, backgroundColor: "#ff3b30", color: "#fff", flexShrink: 0, whiteSpace: "nowrap" }}>Relance</span>}
                  {followUpSoon && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5, backgroundColor: "#ff9500", color: "#fff", flexShrink: 0, whiteSpace: "nowrap" }}>Bient{"\u00f4"}t</span>}
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: confConf.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.title}</div>
                    {lead.account_name && <div style={{ fontSize: 11, color: "#86868b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.account_name}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {(["new", "contacted", "converted", "dismissed"] as const).map((s) => (
                      <button key={s} onClick={(e) => { e.stopPropagation(); if (!readOnly) handleUpdateStatus(lead.id, s); }}
                        disabled={readOnly}
                        style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: readOnly ? "default" : "pointer", padding: 0, backgroundColor: lead.status === s ? (s === "new" ? "#007aff" : s === "contacted" ? "#ff9500" : s === "converted" ? "#34c759" : "#86868b") : "#e8e8ed", transition: "all 0.15s" }}
                        title={STATUS_LABELS[s]} />
                    ))}
                  </div>
                  {!readOnly && <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", color: "#c7c7cc", fontSize: 12, padding: 2, lineHeight: 1, flexShrink: 0 }} title="Supprimer">\u2715</button>}
                  <span style={{ fontSize: 10, color: "#007aff", fontWeight: 600, flexShrink: 0 }}>{isExpanded ? "\u25B4" : "\u25BE"}</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f0f0f2", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 13, color: "#3a3a3c", lineHeight: 1.55 }}>{lead.description}</div>

                    {lead.action_items.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Actions</div>
                        {lead.action_items.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#1d1d1f", display: "flex", gap: 6, alignItems: "baseline", marginBottom: 2 }}>
                            <span style={{ color: "#007aff", fontSize: 9 }}>\u25B8</span><span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {lead.action_plan && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Plan d'action</div>
                        <div style={draftBoxStyle}>{lead.action_plan}</div>
                      </div>
                    )}

                    {/* Contacts & Apollo section */}
                    {(() => {
                      const jcList = leadContacts[lead.id] ?? [];
                      const CST_COLORS: Record<string, string> = { discovered: "#007aff", engaged: "#ff9500", responded: "#34c759", invalid: "#86868b" };
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Contacts {jcList.length > 0 && <span style={{ color: "#007aff" }}>({jcList.length})</span>}
                            </div>
                          </div>

                          {/* Existing contacts from DB */}
                          {jcList.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                              {jcList.map((c) => {
                                const cFullName = [c.first_name, c.last_name].filter(Boolean).join(" ");
                                const ini = ((c.first_name?.[0] ?? "") + (c.last_name?.[0] || (c.first_name?.[1] ?? ""))).toUpperCase() || "?";
                                const CST_LABELS: Record<string, string> = { discovered: "Découvert", engaged: "Contacté", responded: "Répondu", invalid: "Invalide" };
                                return (
                                  <div key={c.id} style={{ padding: "10px 14px", backgroundColor: "#f9f9fb", borderRadius: 10, border: "1px solid #ebebed" }}>
                                    {/* Row 1: Avatar + Name + Status */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: CST_COLORS[c.status] ?? "#007aff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                        {ini}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>{cFullName}</div>
                                        <div style={{ fontSize: 11, color: "#86868b" }}>{[c.title, c.organization_name].filter(Boolean).join(" — ")}</div>
                                      </div>
                                      {c.seniority && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 5, backgroundColor: "#e8f4fd", color: "#007aff", flexShrink: 0 }}>{c.seniority}</span>}
                                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, backgroundColor: `${CST_COLORS[c.status] ?? "#007aff"}15`, color: CST_COLORS[c.status] ?? "#007aff", flexShrink: 0 }}>
                                        {CST_LABELS[c.status] ?? c.status}
                                      </span>
                                    </div>
                                    {/* Row 2: Contact details */}
                                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", paddingLeft: 42 }}>
                                      {c.email && (
                                        <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: "#007aff", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                          ✉️ {c.email}
                                          {c.email_verified && <span style={{ fontSize: 9, color: "#34c759", fontWeight: 700, marginLeft: 2 }}>✓</span>}
                                        </a>
                                      )}
                                      {c.phone && (
                                        <a href={`tel:${c.phone}`} style={{ fontSize: 11, color: "#636366", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                          📞 {c.phone}
                                        </a>
                                      )}
                                      {c.linkedin_url && (
                                        <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#0a66c2", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                          <span style={{ fontWeight: 800 }}>in</span> LinkedIn
                                        </a>
                                      )}
                                      {!c.email && c.first_name && c.last_name && c.organization_name && (
                                        <button
                                          onClick={() => handleEnrichContact(c)}
                                          disabled={enrichingContactId === c.id}
                                          style={{
                                            fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                                            padding: "3px 10px", borderRadius: 6,
                                            border: "1px solid #7c3aed", backgroundColor: enrichingContactId === c.id ? "#f3f0ff" : "#fff",
                                            color: "#7c3aed", cursor: enrichingContactId === c.id ? "wait" : "pointer",
                                            display: "flex", alignItems: "center", gap: 4,
                                          }}
                                        >
                                          {enrichingContactId === c.id ? "Recherche…" : "🔍 Enrichir via Apollo"}
                                        </button>
                                      )}
                                      {!c.email && !(c.first_name && c.last_name && c.organization_name) && !c.phone && !c.linkedin_url && (
                                        <span style={{ fontSize: 11, color: "#aeaeb2", fontStyle: "italic" }}>Nom complet + entreprise requis pour enrichir</span>
                                      )}
                                    </div>
                                    {/* Row 3: Location if available */}
                                    {(c.city || c.country) && (
                                      <div style={{ paddingLeft: 42, marginTop: 4 }}>
                                        <span style={{ fontSize: 10, color: "#aeaeb2" }}>📍 {[c.city, c.country].filter(Boolean).join(", ")}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Suggested contacts from BD AI */}
                          {(() => {
                            const suggestedContacts = (lead.contacts || []).filter((sc: { first_name?: string; last_name?: string }) => sc.first_name && sc.last_name);
                            const alreadyLinkedNames = new Set(jcList.map((c) => `${c.first_name?.toLowerCase()}-${c.last_name?.toLowerCase()}`));
                            const unlinked = suggestedContacts.filter((sc: { first_name: string; last_name: string }) => !alreadyLinkedNames.has(`${sc.first_name.toLowerCase()}-${sc.last_name.toLowerCase()}`));
                            if (unlinked.length === 0) return null;
                            return (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                                  Contacts sugg{"\u00e9"}r{"\u00e9"}s par le BD AI
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {unlinked.map((sc: { first_name: string; last_name: string; title: string; seniority?: string | null }, si: number) => {
                                    const scKey = `${lead.id}-${sc.first_name}-${sc.last_name}`;
                                    const isEnriching = enrichingSuggestedKey === scKey;
                                    const SENIORITY_LABELS: Record<string, string> = { c_suite: "C-Suite", vp: "VP", director: "Director", manager: "Manager", senior: "Senior" };
                                    return (
                                      <div key={si} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: "#faf8ff", borderRadius: 8, border: "1px dashed #d4c8f5" }}>
                                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #6C5CE7, #a855f7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                          {(sc.first_name[0] + sc.last_name[0]).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>{sc.first_name} {sc.last_name}</div>
                                          <div style={{ fontSize: 11, color: "#86868b" }}>{sc.title}{lead.account_name ? ` \u2014 ${lead.account_name}` : ""}</div>
                                        </div>
                                        {sc.seniority && SENIORITY_LABELS[sc.seniority] && (
                                          <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 5, backgroundColor: "#e8f4fd", color: "#007aff", flexShrink: 0 }}>{SENIORITY_LABELS[sc.seniority]}</span>
                                        )}
                                        <button
                                          onClick={() => handleEnrichSuggested(lead.id, sc, lead.account_name || "", lead.vertical || "")}
                                          disabled={isEnriching}
                                          style={{
                                            fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                                            padding: "5px 12px", borderRadius: 7,
                                            border: "none", background: isEnriching ? "#e8e0f8" : "linear-gradient(135deg, #6C5CE7, #a855f7)",
                                            color: isEnriching ? "#7c3aed" : "#fff",
                                            cursor: isEnriching ? "wait" : "pointer",
                                            display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                                          }}
                                        >
                                          {isEnriching ? "Recherche\u2026" : "\uD83D\uDD0D Enrichir"}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Add contact button */}
                          {!readOnly && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => openAddContactModal(lead.id, lead.account_name || "", lead.vertical || "")}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                backgroundColor: "#fff", color: "#007aff", border: "1.5px solid #007aff", borderRadius: 8,
                                padding: "7px 14px", fontSize: 11, fontWeight: 700,
                                cursor: "pointer", fontFamily: "inherit",
                              }}>
                              + Ajouter un contact manuellement
                            </button>
                          </div>}
                        </div>
                      );
                    })()}

                    {/* Email & Message — generated on demand */}
                    {lead.email_draft ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email pr\u00eat \u00e0 envoyer</div>
                          <CopyButton text={lead.email_draft} label="Copier l'email" />
                        </div>
                        <div style={draftBoxStyle}>{lead.email_draft}</div>
                      </div>
                    ) : !readOnly ? (
                      <button
                        onClick={() => handleGenerateEmail(lead.id)}
                        disabled={generatingEmailFor === lead.id}
                        style={{
                          width: "100%", padding: "10px 16px", fontSize: 12, fontWeight: 700,
                          fontFamily: "inherit", borderRadius: 8, border: "1px dashed #c7c7cc",
                          backgroundColor: generatingEmailFor === lead.id ? "#f5f5f7" : "#fff",
                          color: generatingEmailFor === lead.id ? "#86868b" : "#007aff",
                          cursor: generatingEmailFor === lead.id ? "wait" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          transition: "all 0.15s",
                        }}
                      >
                        {generatingEmailFor === lead.id ? (
                          <>{spinnerEl} G\u00e9n\u00e9ration de l'email\u2026</>
                        ) : (
                          <>\u2709\ufe0f G\u00e9n\u00e9rer email & message LinkedIn</>
                        )}
                      </button>
                    ) : null}

                    {lead.message_draft && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Message WhatsApp / LinkedIn</div>
                          <CopyButton text={lead.message_draft} label="Copier le message" />
                        </div>
                        <div style={draftBoxStyle}>{lead.message_draft}</div>
                      </div>
                    )}

                    {/* ─── CRM Tracking Section ─── */}
                    <div style={{ borderTop: "1px solid #f0f0f2", paddingTop: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Suivi commercial</div>

                      {/* Quick action buttons */}
                      {!readOnly && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {([
                          { type: "email_sent" as ActivityType, icon: "\u2709\uFE0F", label: "Email" },
                          { type: "call" as ActivityType, icon: "\uD83D\uDCDE", label: "Appel" },
                          { type: "meeting" as ActivityType, icon: "\uD83E\uDD1D", label: "Meeting" },
                          { type: "linkedin" as ActivityType, icon: "in", label: "LinkedIn" },
                          { type: "note" as ActivityType, icon: "\uD83D\uDCDD", label: "Note" },
                        ]).map((a) => (
                          <button
                            key={a.type}
                            onClick={() => setActivityForm(activityForm?.leadId === lead.id && activityForm?.type === a.type ? null : { leadId: lead.id, type: a.type })}
                            style={{
                              padding: "5px 10px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                              borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                              border: activityForm?.leadId === lead.id && activityForm?.type === a.type ? "none" : "1px solid #e8e8ed",
                              backgroundColor: activityForm?.leadId === lead.id && activityForm?.type === a.type ? "#007aff" : "#fff",
                              color: activityForm?.leadId === lead.id && activityForm?.type === a.type ? "#fff" : "#636366",
                            }}
                          >
                            {a.icon} {a.label}
                          </button>
                        ))}
                      </div>}

                      {/* Activity form (inline) */}
                      {activityForm?.leadId === lead.id && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          <input
                            type="text"
                            placeholder="Note (optionnel)..."
                            value={activityNote}
                            onChange={(e) => setActivityNote(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddActivity(); }}
                            style={{ flex: 1, padding: "7px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }}
                          />
                          <button
                            onClick={handleAddActivity}
                            disabled={activitySaving}
                            style={{ padding: "7px 14px", fontSize: 11, fontWeight: 700, borderRadius: 8, border: "none", backgroundColor: "#007aff", color: "#fff", cursor: activitySaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                          >
                            {activitySaving ? "\u2026" : "Ajouter"}
                          </button>
                        </div>
                      )}

                      {/* Follow-up date */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#636366" }}>Relance :</span>
                        <input
                          type="date"
                          value={lead.next_follow_up ?? ""}
                          onChange={(e) => handleSetFollowUp(lead.id, e.target.value || null)}
                          style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, border: "1px solid #e8e8ed", fontFamily: "inherit" }}
                        />
                        {([
                          { label: "+1j", days: 1 }, { label: "+3j", days: 3 }, { label: "+7j", days: 7 }, { label: "+1m", days: 30 },
                        ]).map((r) => (
                          <button
                            key={r.label}
                            onClick={() => { const d = new Date(); d.setDate(d.getDate() + r.days); handleSetFollowUp(lead.id, d.toISOString().split("T")[0]); }}
                            style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 5, border: "1px solid #e8e8ed", backgroundColor: "#f9f9fb", color: "#636366", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {r.label}
                          </button>
                        ))}
                        {lead.next_follow_up && (
                          <button onClick={() => handleSetFollowUp(lead.id, null)} style={{ padding: "3px 6px", fontSize: 10, border: "none", backgroundColor: "transparent", color: "#c7c7cc", cursor: "pointer" }}>{"\u2715"}</button>
                        )}
                      </div>

                      {/* Timeline */}
                      {(() => {
                        const leadActs = activities[lead.id] ?? [];
                        if (leadActs.length === 0) return null;
                        const icons: Record<string, string> = { email_sent: "\u2709\uFE0F", call: "\uD83D\uDCDE", meeting: "\uD83E\uDD1D", linkedin: "\uD83D\uDD17", note: "\uD83D\uDCDD", status_change: "\uD83D\uDD04", follow_up: "\uD83D\uDD14" };
                        const labels: Record<string, string> = { email_sent: "Email", call: "Appel", meeting: "Meeting", linkedin: "LinkedIn", note: "Note", status_change: "Statut", follow_up: "Relance" };
                        const lastContactAct = leadActs.find((a) => ["email_sent", "call", "meeting", "linkedin"].includes(a.activity_type));
                        const daysSinceContact = lastContactAct ? Math.floor((Date.now() - new Date(lastContactAct.created_at).getTime()) / 86400000) : null;
                        return (
                          <div>
                            {daysSinceContact !== null && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: daysSinceContact > 14 ? "#ff3b30" : daysSinceContact > 7 ? "#ff9500" : "#34c759", marginBottom: 6 }}>
                                {daysSinceContact === 0 ? "Contact\u00e9 aujourd'hui" : daysSinceContact === 1 ? "Dernier contact : hier" : `Dernier contact : il y a ${daysSinceContact}j`}
                              </div>
                            )}
                            <div style={{ borderLeft: "2px solid #e8e8ed", marginLeft: 6, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                              {leadActs.map((act) => {
                                const ago = (() => {
                                  const diff = Date.now() - new Date(act.created_at).getTime();
                                  const mins = Math.floor(diff / 60000);
                                  if (mins < 60) return `il y a ${mins}min`;
                                  const hrs = Math.floor(mins / 60);
                                  if (hrs < 24) return `il y a ${hrs}h`;
                                  const d = Math.floor(hrs / 24);
                                  if (d === 1) return "hier";
                                  return `il y a ${d}j`;
                                })();
                                const fullDate = new Date(act.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                                return (
                                  <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, position: "relative" }} title={fullDate}>
                                    <div style={{ position: "absolute", left: -20, top: 2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#e8e8ed" }} />
                                    <span style={{ fontSize: 12, flexShrink: 0 }}>{icons[act.activity_type] ?? "\u2022"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600, color: "#1d1d1f" }}>{labels[act.activity_type] ?? act.activity_type}</span>
                                      {act.notes && <span style={{ fontSize: 11, color: "#636366" }}> {"\u2014"} {act.notes}</span>}
                                    </div>
                                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                                      <div style={{ fontSize: 10, color: "#86868b", whiteSpace: "nowrap" }}>{ago}</div>
                                      <div style={{ fontSize: 9, color: "#aeaeb2", whiteSpace: "nowrap" }}>{new Date(act.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                      {(["new", "contacted", "converted", "dismissed"] as const).map((s) => (
                        <button key={s} onClick={() => handleUpdateStatus(lead.id, s)}
                          style={{ backgroundColor: lead.status === s ? "#1d1d1f" : "#f5f5f7", color: lead.status === s ? "#fff" : "#86868b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddContact(false); setNewContact(emptyContact); } }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "min(520px, 95%)", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0 24px" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f" }}>Ajouter un contact</div>
              <button onClick={() => { setShowAddContact(false); setNewContact(emptyContact); }}
                style={{ width: 28, height: 28, borderRadius: "50%", border: "none", backgroundColor: "#f0f0f2", color: "#86868b", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            {addContactForLeadId && (
              <div style={{ padding: "8px 24px 0", fontSize: 11, color: "#86868b" }}>
                Sera lié au lead : <strong style={{ color: "#1d1d1f" }}>{leads.find(l => l.id === addContactForLeadId)?.account_name || `#${addContactForLeadId}`}</strong>
              </div>
            )}

            {/* Form */}
            <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Identity */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Identité</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="Prénom *" value={newContact.first_name} onChange={(e) => setNewContact(p => ({ ...p, first_name: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                  <input placeholder="Nom" value={newContact.last_name} onChange={(e) => setNewContact(p => ({ ...p, last_name: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                </div>
                <input placeholder="Poste / Titre" value={newContact.title} onChange={(e) => setNewContact(p => ({ ...p, title: e.target.value }))}
                  style={{ width: "100%", marginTop: 8, padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Contact info */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Coordonnées</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input placeholder="Email" type="email" value={newContact.email} onChange={(e) => setNewContact(p => ({ ...p, email: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                  <input placeholder="Téléphone" value={newContact.phone} onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                  <input placeholder="LinkedIn URL" value={newContact.linkedin_url} onChange={(e) => setNewContact(p => ({ ...p, linkedin_url: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                </div>
              </div>

              {/* Company */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Entreprise</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="Nom entreprise" value={newContact.organization_name} onChange={(e) => setNewContact(p => ({ ...p, organization_name: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                  <input placeholder="Vertical (ex: Hotels)" value={newContact.vertical} onChange={(e) => setNewContact(p => ({ ...p, vertical: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                </div>
                <input placeholder="Seniority (ex: Director, VP)" value={newContact.seniority} onChange={(e) => setNewContact(p => ({ ...p, seniority: e.target.value }))}
                  style={{ width: "100%", marginTop: 8, padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Location */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Localisation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="Ville (ex: Dubai)" value={newContact.city} onChange={(e) => setNewContact(p => ({ ...p, city: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                  <input placeholder="Pays" value={newContact.country} onChange={(e) => setNewContact(p => ({ ...p, country: e.target.value }))}
                    style={{ padding: "9px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
                <button onClick={() => { setShowAddContact(false); setNewContact(emptyContact); }}
                  style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "1px solid #e8e8ed", backgroundColor: "#fff", color: "#636366", cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
                <button onClick={handleAddContact} disabled={addContactSaving || !newContact.first_name.trim()}
                  style={{
                    padding: "9px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none",
                    backgroundColor: newContact.first_name.trim() ? "#007aff" : "#c7c7cc", color: "#fff",
                    cursor: addContactSaving || !newContact.first_name.trim() ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}>
                  {addContactSaving ? "Enregistrement\u2026" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Apollo Search Modal */}
      {showApolloSearch && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowApolloSearch(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "min(680px, 95%)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f2", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f" }}>{"\uD83D\uDD0D"} Recherche Apollo</div>
                  <div style={{ fontSize: 12, color: "#86868b", marginTop: 2 }}>{apolloSearchCompany}</div>
                </div>
                <button onClick={() => setShowApolloSearch(false)}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "none", backgroundColor: "#f0f0f2", color: "#86868b", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
              </div>
              {/* Search bar */}
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={apolloSearchCompany}
                  onChange={(e) => setApolloSearchCompany(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doApolloSearch(apolloSearchCompany, 1); }}
                  placeholder="Nom de l'entreprise..."
                  style={{ flex: 1, padding: "9px 14px", fontSize: 13, borderRadius: 8, border: "1px solid #e8e8ed", fontFamily: "inherit", outline: "none" }} />
                <button onClick={() => doApolloSearch(apolloSearchCompany, 1)}
                  disabled={apolloLoading || !apolloSearchCompany.trim()}
                  style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6C5CE7, #a855f7)", color: "#fff", cursor: apolloLoading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: apolloLoading ? 0.7 : 1 }}>
                  {apolloLoading ? "Recherche\u2026" : "Rechercher"}
                </button>
              </div>
              {apolloTotal > 0 && (
                <div style={{ fontSize: 11, color: "#86868b", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{apolloTotal} résultat{apolloTotal !== 1 ? "s" : ""} — page {apolloPage}/{apolloTotalPages}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={apolloSelected.size === apolloResults.length && apolloResults.length > 0}
                      onChange={toggleApolloSelectAll}
                      style={{ width: 14, height: 14, cursor: "pointer" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#636366" }}>Tout sélectionner</span>
                  </label>
                </div>
              )}
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 24px" }}>
              {apolloError && (
                <div style={{ margin: "16px 0", padding: "10px 14px", backgroundColor: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: 8, fontSize: 12, color: "#c0392b" }}>
                  {apolloError}
                </div>
              )}

              {apolloLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #e0e0e0", borderTop: "3px solid #6C5CE7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13 }}>Recherche en cours sur Apollo{"\u2026"}</div>
                </div>
              ) : apolloResults.length === 0 && apolloTotal === 0 && !apolloError ? (
                <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDD0D"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Lancez une recherche pour trouver des contacts</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {apolloResults.map((c, idx) => {
                    const isChecked = apolloSelected.has(idx);
                    const displayName = [c.first_name, c.last_name].filter(Boolean).join(" ") || "?";
                    const ini = ((c.first_name?.[0] ?? "") + (c.last_name?.[0] || (c.first_name?.[1] ?? ""))).toUpperCase() || "?";
                    return (
                      <div key={idx}
                        onClick={() => toggleApolloSelect(idx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                          borderBottom: "1px solid #f5f5f7", cursor: "pointer",
                          backgroundColor: isChecked ? "#f0e6ff" : "transparent",
                          borderRadius: 8, marginBottom: 0, transition: "all 0.1s",
                          paddingLeft: 8, paddingRight: 8,
                        }}>
                        <input type="checkbox" checked={isChecked} readOnly
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6C5CE7", flexShrink: 0 }} />
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: isChecked ? "linear-gradient(135deg, #6C5CE7, #a855f7)" : "#e8e8ed", color: isChecked ? "#fff" : "#636366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {ini}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: 11, color: "#636366", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.title || "Poste inconnu"}
                          </div>
                        </div>
                        {c.email && <span style={{ fontSize: 10, color: "#34c759", fontWeight: 700, flexShrink: 0, padding: "2px 6px", backgroundColor: "#e8fbe8", borderRadius: 4 }}>{"\u2709"} Email</span>}
                        {c.linkedin_url && <span style={{ fontSize: 10, color: "#0a66c2", fontWeight: 700, flexShrink: 0 }}>in</span>}
                        {c.seniority && <span style={{ fontSize: 9, color: "#86868b", fontWeight: 600, flexShrink: 0, padding: "2px 6px", backgroundColor: "#f5f5f7", borderRadius: 4 }}>{c.seniority}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f2", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {apolloPage > 1 && (
                  <button onClick={() => doApolloSearch(apolloSearchCompany, apolloPage - 1)}
                    disabled={apolloLoading}
                    style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #e8e8ed", backgroundColor: "#fff", color: "#636366", cursor: "pointer", fontFamily: "inherit" }}>
                    {"\u25C0"} Précédent
                  </button>
                )}
                {apolloPage < apolloTotalPages && (
                  <button onClick={() => doApolloSearch(apolloSearchCompany, apolloPage + 1)}
                    disabled={apolloLoading}
                    style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #e8e8ed", backgroundColor: "#fff", color: "#636366", cursor: "pointer", fontFamily: "inherit" }}>
                    Suivant {"\u25B6"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {apolloSelected.size > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6C5CE7" }}>
                    {apolloSelected.size} sélectionné{apolloSelected.size > 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={() => setShowApolloSearch(false)}
                  style={{ padding: "9px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #e8e8ed", backgroundColor: "#fff", color: "#636366", cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
                <button onClick={handleApolloImport}
                  disabled={apolloImporting || apolloSelected.size === 0}
                  style={{
                    padding: "9px 18px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none",
                    background: apolloSelected.size > 0 ? "linear-gradient(135deg, #6C5CE7, #a855f7)" : "#c7c7cc",
                    color: "#fff", cursor: apolloImporting || apolloSelected.size === 0 ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}>
                  {apolloImporting ? "Import en cours\u2026" : `Importer (${apolloSelected.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminView ─────────────────────────────────────────────────────────────────

function AdminView() {
  const [subTab, setSubTab] = useState<"marques" | "modeles" | "emplacements" | "equipe" | "roles" | "permissions" | "raisons">("marques");

  // Reference data
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<RefModel[]>([]);
  const [locations, setLocations] = useState<RefLocation[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Team state
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("driver");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Roles CRUD state
  const [roles, setRoles] = useState<Role[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rolesLoading, _setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  // Permissions grid state — tri-state: role → tab → "view" | "edit"
  const [editPerms, setEditPerms] = useState<Map<string, Map<string, "view" | "edit">>>(new Map());
  const [permsDirty, setPermsDirty] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);

  // Unavailability reasons CRUD state
  const [reasons, setReasons] = useState<UnavailabilityReason[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);
  const [reasonsError, setReasonsError] = useState<string | null>(null);
  const [newReasonLabel, setNewReasonLabel] = useState("");
  const [reasonSaving, setReasonSaving] = useState(false);
  const [reasonDeletingId, setReasonDeletingId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleDeletingId, setRoleDeletingId] = useState<number | null>(null);

  // Makes CRUD state
  const [newMakeName, setNewMakeName] = useState("");
  const [makeSaving, setMakeSaving] = useState(false);
  const [makeError, setMakeError] = useState<string | null>(null);
  const [makeDeletingId, setMakeDeletingId] = useState<number | null>(null);

  // Models CRUD state
  const [newModelName, setNewModelName] = useState("");
  const [newModelType, setNewModelType] = useState("");
  const [newModelMakeId, setNewModelMakeId] = useState<number | "">("");
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelDeletingId, setModelDeletingId] = useState<number | null>(null);

  // Locations CRUD state
  const [newLocName, setNewLocName] = useState("");
  const [newLocType, setNewLocType] = useState<"office" | "lease">("lease");
  const [newLocFullName, setNewLocFullName] = useState("");
  const [locSaving, setLocSaving] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [locDeletingId, setLocDeletingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchMakes(), fetchRefModels(), fetchRefLocations(), fetchVehicleTypes()])
      .then(([m, mo, l, vt]) => { setMakes(m); setModels(mo); setLocations(l); setVehicleTypes(vt); setLoading(false); })
      .catch((e) => { setLoadError(e instanceof Error ? e.message : "Erreur chargement"); setLoading(false); });
  }, []);

  useEffect(() => {
    if (subTab !== "equipe") return;
    setTeamLoading(true);
    setTeamError(null);
    fetchProfiles()
      .then(setProfiles)
      .catch((e) => setTeamError(e instanceof Error ? e.message : "Erreur chargement"))
      .finally(() => setTeamLoading(false));
  }, [subTab]);

  useEffect(() => {
    if (subTab !== "roles" && subTab !== "equipe" && subTab !== "permissions") return;
    fetchRoles()
      .then(setRoles)
      .catch(() => {});
  }, [subTab]);

  useEffect(() => {
    if (subTab !== "permissions") return;
    setPermsLoading(true);
    setPermsError(null);
    fetchRolePermissions()
      .then((perms) => {
        const map = new Map<string, Map<string, "view" | "edit">>();
        roles.forEach((r) => map.set(r.name, new Map()));
        perms.forEach((p) => {
          if (!map.has(p.role_name)) map.set(p.role_name, new Map());
          map.get(p.role_name)!.set(p.tab_id, p.access_level as "view" | "edit");
        });
        setEditPerms(map);
        setPermsDirty(false);
      })
      .catch((e) => setPermsError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setPermsLoading(false));
  }, [subTab, roles]);

  useEffect(() => {
    if (subTab !== "raisons") return;
    setReasonsLoading(true);
    setReasonsError(null);
    fetchUnavailabilityReasons()
      .then(setReasons)
      .catch((e) => setReasonsError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setReasonsLoading(false));
  }, [subTab]);

  const cyclePerm = (roleName: string, tabId: string) => {
    if (roleName === "admin" && tabId === "admin") return; // admin/admin locked to edit
    setEditPerms((prev) => {
      const next = new Map(prev);
      const tabMap = new Map(next.get(roleName) ?? []);
      const current = tabMap.get(tabId);
      // Cycle: none → view → edit → none
      if (!current) tabMap.set(tabId, "view");
      else if (current === "view") tabMap.set(tabId, "edit");
      else tabMap.delete(tabId);
      next.set(roleName, tabMap);
      return next;
    });
    setPermsDirty(true);
  };

  const handleSavePerms = async () => {
    setPermsSaving(true);
    setPermsError(null);
    try {
      for (const [roleName, tabMap] of editPerms) {
        const perms = Array.from(tabMap.entries()).map(([tab_id, access_level]) => ({ tab_id, access_level }));
        await setRolePermissions(roleName, perms);
      }
      setPermsDirty(false);
    } catch (e) {
      setPermsError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPermsSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleLabel.trim()) return;
    setRoleSaving(true); setRolesError(null);
    try {
      const created = await createRole(newRoleName.trim().toLowerCase().replace(/\s+/g, "_"), newRoleLabel.trim());
      setRoles((prev) => [...prev, created]);
      setNewRoleName(""); setNewRoleLabel("");
    } catch (e) { setRolesError(e instanceof Error ? e.message : "Erreur"); }
    finally { setRoleSaving(false); }
  };

  const handleCreateReason = async () => {
    if (!newReasonLabel.trim()) return;
    setReasonSaving(true);
    try {
      const created = await createUnavailabilityReason(newReasonLabel.trim());
      setReasons(prev => [...prev, created]);
      setNewReasonLabel("");
    } catch (e) { setReasonsError(e instanceof Error ? e.message : "Erreur"); }
    finally { setReasonSaving(false); }
  };

  const handleDeleteReason = async (id: number) => {
    setReasonDeletingId(id);
    try {
      await deleteUnavailabilityReason(id);
      setReasons(prev => prev.filter(r => r.id !== id));
    } catch (e) { setReasonsError(e instanceof Error ? e.message : "Erreur"); }
    finally { setReasonDeletingId(null); }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm("Supprimer ce rôle ?")) return;
    setRoleDeletingId(id);
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { setRolesError(e instanceof Error ? e.message : "Des profils utilisent ce rôle."); }
    finally { setRoleDeletingId(null); }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviteSaving(true);
    setInviteError(null);
    try {
      const result = await inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
      setTempPassword(result?.tempPassword ?? null);
      setInviteSuccess(true);
      fetchProfiles().then(setProfiles);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setInviteSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Supprimer ${userName} ? Cette action est irréversible.`)) return;
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Erreur lors de la suppression");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    setRoleUpdatingId(userId);
    try {
      await updateUserRole(userId, role);
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, role } : p));
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Erreur lors de la mise à jour du rôle");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleCreateMake = async () => {
    if (!newMakeName.trim()) return;
    setMakeSaving(true); setMakeError(null);
    try {
      const created = await createMake({ name: newMakeName.trim() });
      setMakes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMakeName("");
    } catch (e) { setMakeError(e instanceof Error ? e.message : "Erreur"); }
    finally { setMakeSaving(false); }
  };

  const handleDeleteMake = async (id: number) => {
    if (!window.confirm("Supprimer cette marque ?")) return;
    setMakeDeletingId(id);
    try {
      await deleteMake(id);
      setMakes((prev) => prev.filter((m) => m.id !== id));
      setModels((prev) => prev.map((m) => m.make_id === id ? { ...m, make_id: null } : m));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMakeError(msg.includes("foreign key") || msg.includes("fkey")
        ? "Cette marque est utilisée par un ou plusieurs véhicules — modifiez ces véhicules d'abord."
        : msg);
    }
    finally { setMakeDeletingId(null); }
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) return;
    setModelSaving(true); setModelError(null);
    try {
      const created = await createRefModel({ name: newModelName.trim(), vehicle_type: newModelType || null, make_id: newModelMakeId !== "" ? newModelMakeId : null });
      setModels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewModelName(""); setNewModelType(""); setNewModelMakeId("");
    } catch (e) { setModelError(e instanceof Error ? e.message : "Erreur"); }
    finally { setModelSaving(false); }
  };

  const handleDeleteModel = async (id: number) => {
    if (!window.confirm("Supprimer ce modèle ?")) return;
    setModelDeletingId(id);
    try {
      await deleteRefModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setModelError(msg.includes("foreign key") || msg.includes("fkey")
        ? "Ce modèle est utilisé par un ou plusieurs véhicules — modifiez ces véhicules d'abord."
        : msg);
    }
    finally { setModelDeletingId(null); }
  };

  const handleCreateLoc = async () => {
    if (!newLocName.trim()) return;
    setLocSaving(true); setLocError(null);
    try {
      const created = await createRefLocation({ name: newLocName.trim(), type: newLocType, full_name: newLocFullName || null });
      setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLocName(""); setNewLocFullName(""); setNewLocType("lease");
    } catch (e) { setLocError(e instanceof Error ? e.message : "Erreur"); }
    finally { setLocSaving(false); }
  };

  const handleDeleteLoc = async (id: number) => {
    if (!window.confirm("Supprimer cet emplacement ?")) return;
    setLocDeletingId(id);
    try {
      await deleteRefLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocError(msg.includes("foreign key") || msg.includes("fkey")
        ? "Cet emplacement est utilisé par un ou plusieurs véhicules — modifiez ces véhicules d'abord."
        : msg);
    }
    finally { setLocDeletingId(null); }
  };

  const card = { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
  const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", padding: "8px 12px", borderBottom: "1px solid #f0f0f5" };
  const tdStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f8f8f9", verticalAlign: "middle" };
  const btnDel = { background: "rgba(255,59,48,0.08)", color: "#ff3b30", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const subTabs: { id: "marques" | "modeles" | "emplacements" | "equipe" | "roles" | "permissions" | "raisons"; label: string; icon: string }[] = [
    { id: "marques", label: "Marques", icon: "🏷️" },
    { id: "modeles", label: "Modèles", icon: "🚗" },
    { id: "emplacements", label: "Emplacements", icon: "📍" },
    { id: "roles", label: "Rôles", icon: "🎭" },
    { id: "permissions", label: "Permissions", icon: "🔐" },
    { id: "raisons", label: "Raisons indispo", icon: "🔧" },
    { id: "equipe", label: "Équipe", icon: "👥" },
  ];

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>Données de référence</h1>
        <p style={{ color: "#86868b", marginTop: 4, fontSize: 14 }}>Gérez les données de référence et les membres de l'équipe.</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#f0f0f5", borderRadius: 12, padding: 4, width: "fit-content", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{ background: subTab === t.id ? "#fff" : "transparent", border: "none", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: subTab === t.id ? 700 : 500, color: subTab === t.id ? "#1d1d1f" : "#86868b", cursor: "pointer", fontFamily: "inherit", boxShadow: subTab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: "#86868b" }}>Chargement…</div>}
      {loadError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 10, padding: 16, color: "#ff3b30", fontSize: 13 }}>{loadError}</div>}

      {!loading && !loadError && (
        <>
          {/* ── MARQUES ── */}
          {subTab === "marques" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏷️ Marques ({makes.length})</div>
              {makeError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{makeError}</div>}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 60 }}>ID</th>
                    <th style={thStyle}>Nom</th>
                    <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {makes.map((mk) => (
                    <tr key={mk.id}>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{mk.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{mk.name}</td>
                      <td style={{ ...tdStyle, textAlign: "center" as const }}>
                        <button onClick={() => handleDeleteMake(mk.id)} disabled={makeDeletingId === mk.id} style={btnDel}>{makeDeletingId === mk.id ? "…" : "🗑"}</button>
                      </td>
                    </tr>
                  ))}
                  {makes.length === 0 && (
                    <tr><td colSpan={3} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucune marque</td></tr>
                  )}
                </tbody>
              </table>
              {/* Inline add form */}
              <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nouvelle marque</label>
                  <input value={newMakeName} onChange={(e) => setNewMakeName(e.target.value)} placeholder="ex: Rolls-Royce" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateMake()} />
                </div>
                <button onClick={handleCreateMake} disabled={makeSaving || !newMakeName.trim()} style={{ background: newMakeName.trim() ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: newMakeName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>
                  {makeSaving ? "…" : "+ Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* ── MODÈLES ── */}
          {subTab === "modeles" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🚗 Modèles ({models.length})</div>
              {modelError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{modelError}</div>}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 60 }}>ID</th>
                    <th style={thStyle}>Nom</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Marque</th>
                    <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((mo) => (
                    <tr key={mo.id}>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{mo.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{mo.name}</td>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{mo.vehicle_type ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{makes.find((mk) => mk.id === mo.make_id)?.name ?? "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" as const }}>
                        <button onClick={() => handleDeleteModel(mo.id)} disabled={modelDeletingId === mo.id} style={btnDel}>{modelDeletingId === mo.id ? "…" : "🗑"}</button>
                      </td>
                    </tr>
                  ))}
                  {models.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucun modèle</td></tr>
                  )}
                </tbody>
              </table>
              {/* Inline add form */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginTop: 16, alignItems: "flex-end" }}>
                <div>
                  <label style={labelStyle}>Nom du modèle</label>
                  <input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="ex: Ghost" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateModel()} />
                </div>
                <div>
                  <label style={labelStyle}>Type véhicule</label>
                  <CustomSelect value={newModelType} onChange={(v) => setNewModelType(String(v))} placeholder="— Sélectionner —" options={vehicleTypes.map((vt) => ({ value: vt.name, label: vt.name }))} />
                </div>
                <div>
                  <label style={labelStyle}>Marque</label>
                  <CustomSelect value={newModelMakeId} onChange={(v) => setNewModelMakeId(Number(v) || "")} placeholder="—" searchPlaceholder="Marque…" options={makes.map((mk) => ({ value: mk.id, label: mk.name }))} />
                </div>
                <button onClick={handleCreateModel} disabled={modelSaving || !newModelName.trim()} style={{ background: newModelName.trim() ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: newModelName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const, marginTop: 18 }}>
                  {modelSaving ? "…" : "+ Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* ── EMPLACEMENTS ── */}
          {subTab === "emplacements" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📍 Emplacements ({locations.length})</div>
              {locError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{locError}</div>}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 60 }}>ID</th>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Nom complet</th>
                    <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{loc.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{loc.name}</td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ background: loc.type === "office" ? "#e8f4fd" : "#fff3e0", color: loc.type === "office" ? "#007aff" : "#ff9500", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                          {loc.type ?? "—"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "#86868b" }}>{loc.full_name ?? "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" as const }}>
                        <button onClick={() => handleDeleteLoc(loc.id)} disabled={locDeletingId === loc.id} style={btnDel}>{locDeletingId === loc.id ? "…" : "🗑"}</button>
                      </td>
                    </tr>
                  ))}
                  {locations.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucun emplacement</td></tr>
                  )}
                </tbody>
              </table>
              {/* Inline add form */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 10, marginTop: 16, alignItems: "flex-end" }}>
                <div>
                  <label style={labelStyle}>Code court</label>
                  <input value={newLocName} onChange={(e) => setNewLocName(e.target.value)} placeholder="ex: BVLGARI" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <CustomSelect value={newLocType} onChange={(v) => setNewLocType(String(v) as "office" | "lease")} options={[{ value: "lease", label: "lease" }, { value: "office", label: "office" }]} />
                </div>
                <div>
                  <label style={labelStyle}>Nom complet</label>
                  <input value={newLocFullName} onChange={(e) => setNewLocFullName(e.target.value)} placeholder="ex: Bvlgari Hotel Dubai" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateLoc()} />
                </div>
                <button onClick={handleCreateLoc} disabled={locSaving || !newLocName.trim()} style={{ background: newLocName.trim() ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: newLocName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const, marginTop: 18 }}>
                  {locSaving ? "…" : "+ Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* ── PERMISSIONS ── */}
          {subTab === "permissions" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔐 Permissions par rôle</div>
              <div style={{ fontSize: 12, color: "#86868b", marginBottom: 16 }}>Cliquez sur chaque cellule pour changer le niveau d'accès : — (aucun) → 👁 (lecture) → ✏️ (édition).</div>
              {permsError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{permsError}</div>}
              {permsLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#86868b" }}>
                  <div style={{ width: 24, height: 24, border: "3px solid #e0e0e0", borderTop: "3px solid #1d1d1f", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12 }}>Chargement…</div>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e8e8ed", fontWeight: 700, color: "#1d1d1f", whiteSpace: "nowrap" }}>Rôle</th>
                          {[
                            { id: "daily", label: "Daily" }, { id: "dailyinput", label: "Daily Input" },
                            { id: "monthly", label: "Monthly" }, { id: "annual", label: "Annual" },
                            { id: "fleet", label: "Fleet" }, { id: "checkin", label: "Check-In" },
                            { id: "attendance", label: "Attendance" }, { id: "hr", label: "HR" },
                            { id: "payroll", label: "Payroll" }, { id: "sales", label: "Sales" }, { id: "admin", label: "Admin" },
                          ].map((t) => (
                            <th key={t.id} style={{ textAlign: "center", padding: "8px 6px", borderBottom: "2px solid #e8e8ed", fontWeight: 600, color: "#86868b", fontSize: 10, whiteSpace: "nowrap" }}>{t.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((role) => (
                          <tr key={role.name} style={{ borderBottom: "1px solid #f0f0f2" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1d1d1f" }}>
                              {role.label}
                              {role.name === "admin" && <span style={{ fontSize: 9, color: "#86868b", marginLeft: 6 }}>👑</span>}
                            </td>
                            {["daily", "dailyinput", "monthly", "annual", "fleet", "checkin", "attendance", "hr", "payroll", "sales", "admin"].map((tabId) => {
                              const isLocked = role.name === "admin" && tabId === "admin";
                              const level = editPerms.get(role.name)?.get(tabId);
                              const icon = level === "edit" ? "✏️" : level === "view" ? "👁" : "—";
                              const bg = level === "edit" ? "rgba(52,199,89,0.12)" : level === "view" ? "rgba(0,122,255,0.08)" : "transparent";
                              const color = level === "edit" ? "#34c759" : level === "view" ? "#007aff" : "#d1d1d6";
                              return (
                                <td key={tabId} style={{ textAlign: "center", padding: "10px 6px" }}>
                                  <button
                                    onClick={() => cyclePerm(role.name, tabId)}
                                    disabled={isLocked}
                                    title={isLocked ? "L'admin doit toujours avoir accès à Admin" : `${role.label} — ${tabId}: cliquer pour changer`}
                                    style={{
                                      width: 36, height: 30, borderRadius: 8, border: "1.5px solid " + (level ? color : "#e8e8ed"),
                                      background: bg, cursor: isLocked ? "not-allowed" : "pointer",
                                      fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                      color, fontFamily: "inherit", transition: "all 0.15s",
                                      opacity: isLocked ? 0.6 : 1,
                                    }}
                                  >
                                    {icon}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11, color: "#86868b" }}>
                    <span><span style={{ color: "#d1d1d6" }}>—</span> Aucun accès</span>
                    <span><span style={{ color: "#007aff" }}>👁</span> Lecture seule</span>
                    <span><span style={{ color: "#34c759" }}>✏️</span> Lecture + Édition</span>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {permsDirty && <span style={{ fontSize: 11, color: "#ff9500", fontWeight: 600 }}>⚠️ Modifications non sauvegardées</span>}
                    {!permsDirty && <span />}
                    <button
                      onClick={handleSavePerms}
                      disabled={!permsDirty || permsSaving}
                      style={{
                        background: permsDirty ? "linear-gradient(135deg, #007aff, #5856d6)" : "#d1d1d6",
                        color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px 24px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                        cursor: permsDirty && !permsSaving ? "pointer" : "not-allowed",
                        opacity: permsDirty ? 1 : 0.6,
                        transition: "all 0.15s",
                      }}
                    >
                      {permsSaving ? "Enregistrement…" : "Enregistrer les permissions"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── RAISONS INDISPONIBILITÉ ── */}
          {subTab === "raisons" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔧 Raisons d'indisponibilité ({reasons.length})</div>
              <div style={{ fontSize: 12, color: "#86868b", marginBottom: 16 }}>Ces raisons apparaissent comme chips dans le formulaire de déclaration d'indisponibilité.</div>
              {reasonsError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{reasonsError}</div>}
              {reasonsLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: "#86868b" }}>Chargement…</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 60 }}>ID</th>
                      <th style={thStyle}>Libellé</th>
                      <th style={thStyle}>Aperçu</th>
                      <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reasons.map((r) => (
                      <tr key={r.id}>
                        <td style={{ ...tdStyle, color: "#86868b" }}>{r.id}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{r.label}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1.5px solid #e5e5e5", background: "#fff", color: "#1d1d1f", display: "inline-block" }}>{r.label}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" as const }}>
                          <button onClick={() => handleDeleteReason(r.id)} disabled={reasonDeletingId === r.id} style={btnDel}>
                            {reasonDeletingId === r.id ? "…" : "🗑"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reasons.length === 0 && (
                      <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucune raison définie</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              {/* Add form */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 16, alignItems: "flex-end" }}>
                <div>
                  <label style={labelStyle}>Nouveau libellé</label>
                  <input value={newReasonLabel} onChange={(e) => setNewReasonLabel(e.target.value)} placeholder="ex: Révision / Entretien" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateReason()} />
                </div>
                <button onClick={handleCreateReason} disabled={reasonSaving || !newReasonLabel.trim()} style={{ background: newReasonLabel.trim() ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: newReasonLabel.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const, marginTop: 18 }}>
                  {reasonSaving ? "…" : "+ Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* ── RÔLES ── */}
          {subTab === "roles" && (
            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎭 Rôles ({roles.length})</div>
              {rolesError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{rolesError}</div>}
              {rolesLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: "#86868b" }}>Chargement…</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 60 }}>ID</th>
                      <th style={thStyle}>Slug (name)</th>
                      <th style={thStyle}>Libellé affiché</th>
                      <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td style={{ ...tdStyle, color: "#86868b" }}>{r.id}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{r.name}</td>
                        <td style={tdStyle}>{r.label}</td>
                        <td style={{ ...tdStyle, textAlign: "center" as const }}>
                          <button onClick={() => handleDeleteRole(r.id)} disabled={roleDeletingId === r.id} style={btnDel}>
                            {roleDeletingId === r.id ? "…" : "🗑"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucun rôle</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              {/* Inline add form */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginTop: 16, alignItems: "flex-end" }}>
                <div>
                  <label style={labelStyle}>Slug <span style={{ color: "#86868b", fontWeight: 400 }}>(ex: supervisor)</span></label>
                  <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="ex: supervisor" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateRole()} />
                </div>
                <div>
                  <label style={labelStyle}>Libellé affiché <span style={{ color: "#86868b", fontWeight: 400 }}>(ex: Superviseur)</span></label>
                  <input value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="ex: Superviseur" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleCreateRole()} />
                </div>
                <button onClick={handleCreateRole} disabled={roleSaving || !newRoleName.trim() || !newRoleLabel.trim()} style={{ background: newRoleName.trim() && newRoleLabel.trim() ? "#007aff" : "#d1d1d6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: newRoleName.trim() && newRoleLabel.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" as const, marginTop: 18 }}>
                  {roleSaving ? "…" : "+ Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* ── ÉQUIPE ── */}
          {subTab === "equipe" && (
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>👥 Équipe ({profiles.length})</div>
                <button
                  onClick={() => { setShowInviteModal(true); setInviteError(null); setInviteSuccess(false); setTempPassword(null); if (roles.length === 0) fetchRoles().then(setRoles).catch(() => {}); }}
                  style={{ background: "#007aff", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  + Inviter un membre
                </button>
              </div>
              {teamError && <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30", marginBottom: 12 }}>{teamError}</div>}
              {teamLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: "#86868b" }}>Chargement…</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nom</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Rôle</th>
                      <th style={{ ...thStyle, width: 80, textAlign: "center" as const }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                        <td style={{ ...tdStyle, color: "#86868b" }}>{p.email ?? "—"}</td>
                        <td style={tdStyle}>
                          <CustomSelect compact statusStyle value={p.role} disabled={roleUpdatingId === p.id} onChange={(v) => handleUpdateRole(p.id, String(v))} options={roles.length > 0 ? roles.map((r) => ({ value: r.name, label: r.label, bg: r.name === "admin" ? "#fef3c7" : r.name === "manager" ? "#e8f4fd" : r.name === "sales" ? "#f3e8ff" : "#e9fae9", color: r.name === "admin" ? "#d97706" : r.name === "manager" ? "#007aff" : r.name === "sales" ? "#7c3aed" : "#34c759" })) : [{ value: "driver", label: "Chauffeur", bg: "#e9fae9", color: "#34c759" }, { value: "manager", label: "Manager", bg: "#e8f4fd", color: "#007aff" }]} triggerStyle={{ borderRadius: 6, fontWeight: 700 }} />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" as const }}>
                          <button onClick={() => handleDeleteUser(p.id, p.name)} disabled={deletingUserId === p.id} style={btnDel}>
                            {deletingUserId === p.id ? "…" : "🗑"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center" as const, color: "#86868b" }}>Aucun membre</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL INVITATION ── */}
      {showInviteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Inviter un membre</div>
              <button onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteSuccess(false); setTempPassword(null); setInviteEmail(""); setInviteName(""); setInviteRole("driver"); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#86868b", lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
            {inviteSuccess ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>Compte créé !</div>
                  <div style={{ fontSize: 13, color: "#86868b", marginTop: 4 }}>Transmettez ces identifiants au membre via un canal sécurisé (WhatsApp, etc.).</div>
                </div>
                <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Email</div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{inviteEmail}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Mot de passe temporaire</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: "#007aff", letterSpacing: "2px", background: "#e8f4fd", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>{tempPassword}</div>
                  </div>
                </div>
                <div style={{ background: "#fff8e1", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f57c00", fontWeight: 500 }}>
                  ⚠️ Ce mot de passe n'est affiché qu'une seule fois. Le membre peut le changer depuis son profil après connexion.
                </div>
                <button onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteSuccess(false); setTempPassword(null); setInviteEmail(""); setInviteName(""); setInviteRole("driver"); }} style={{ background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#f0f7ff", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#007aff", fontWeight: 500 }}>
                  ℹ️ Un email d'invitation sera envoyé. Le membre devra définir son mot de passe.
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ex: driver@example.com" required autoFocus style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nom complet *</label>
                  <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="ex: Ahmed Hassan" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Rôle</label>
                  <CustomSelect value={inviteRole} onChange={(v) => setInviteRole(String(v))} options={roles.length > 0 ? roles.map((r) => ({ value: r.name, label: r.label })) : [{ value: "driver", label: "Chauffeur" }, { value: "manager", label: "Manager" }]} />
                </div>
                {inviteError && (
                  <div style={{ background: "rgba(255,59,48,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ff3b30" }}>{inviteError}</div>
                )}
                <button type="submit" disabled={inviteSaving || !inviteEmail.trim() || !inviteName.trim()} style={{ background: inviteSaving || !inviteEmail.trim() || !inviteName.trim() ? "#d1d1d6" : "#007aff", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 700, cursor: inviteSaving || !inviteEmail.trim() || !inviteName.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}>
                  {inviteSaving ? "Envoi en cours…" : "Envoyer l'invitation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ profile }: { profile: UserProfile }) {
  const [view, setView] = useState(() => {
    const tabs = profile.allowedTabs ?? [];
    if (!tabs.length || tabs.includes("home")) return "home";
    if (tabs.includes("daily")) return "daily";
    return tabs[0] ?? "home";
  });
  const { jobs, loading: jobsLoading } = useJobs();
  const [bauFilter, setBauFilter] = useState<"all" | "BAU" | "Event">("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed)); }, [sidebarCollapsed]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [allDailyOp, setAllDailyOp] = useState<DailyOpRaw[]>([]);
  // Notification center
  const [dbAlerts, setDbAlerts] = useState<AlertRecord[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [unavails, setUnavails] = useState<VehicleUnavailability[]>([]);

  // ── Preview "Voir en tant que" (admin only) ──
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [previewTabs, setPreviewTabs] = useState<string[] | null>(null);
  const [previewPermissions, setPreviewPermissions] = useState<Record<string, "view" | "edit"> | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const isAdmin = profile.role === "admin";

  // Change password
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [cpNewPwd, setCpNewPwd] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpDone, setCpDone] = useState(false);

  async function handleChangePassword() {
    if (cpNewPwd.length < 8) { setCpError("8 caractères minimum"); return; }
    if (cpNewPwd !== cpConfirm) { setCpError("Les mots de passe ne correspondent pas"); return; }
    setCpLoading(true);
    setCpError(null);
    try {
      await updatePassword(cpNewPwd);
      setCpDone(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setCpError(e.message ?? "Erreur lors du changement");
    } finally {
      setCpLoading(false);
    }
  }

  // Charger les rôles pour le preview (admin only)
  useEffect(() => {
    if (isAdmin) fetchRoles().then(setAllRoles).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    Promise.all([fetchAllVehicles(), fetchAlerts(), fetchUnavailabilities()])
      .then(([vehicleData, alertData, unavailData]) => {
        setVehicles(vehicleData);
        setDbAlerts(alertData);
        setUnavails(unavailData);
        setVehiclesLoading(false);
        // Créer les alertes service manquantes puis rafraîchir le centre de notifs
        checkServiceAlerts(vehicleData)
          .then(() => fetchAlerts().then(setDbAlerts))
          .catch(() => {});
      })
      .catch((err: unknown) => {
        setVehiclesError(err instanceof Error ? err.message : String(err));
        setVehicles([]);
        setVehiclesLoading(false);
      });
  }, []);

  const refreshVehicles = () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    fetchAllVehicles()
      .then((data) => { setVehicles(data); setVehiclesLoading(false); })
      .catch((err: unknown) => { setVehiclesError(err instanceof Error ? err.message : String(err)); setVehicles([]); setVehiclesLoading(false); });
  };

  const refreshAlerts = () => {
    fetchAlerts().then(setDbAlerts).catch(() => {});
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _refreshUnavails = () => {
    fetchUnavailabilities().then(setUnavails).catch(() => {});
  };

  // Chargement de tous les daily_op pour le KPI "Driver Free moyen" en Monthly
  useEffect(() => {
    fetchDailyOp().then(setAllDailyOp).catch(() => setAllDailyOp([]));
  }, []);

  const dailyOpMap = useMemo(
    () => new Map(allDailyOp.map((d) => [d.date, { free: d.free ?? 0, pct_working: d.pct_working ?? 0, total_drivers: d.total_drivers, working: d.working }])),
    [allDailyOp]
  );

  const filteredJobs = useMemo(() => {
    if (bauFilter === "all") return jobs;
    if (bauFilter === "BAU") return jobs.filter(j => j.bau_event === "BAU");
    return jobs.filter(j => j.bau_event != null && j.bau_event !== "BAU");
  }, [jobs, bauFilter]);

  const monthlyData = useMemo(() => deriveMonthlyData(filteredJobs, dailyOpMap), [filteredJobs, dailyOpMap]);
  const annualData = useMemo(() => deriveAnnual(filteredJobs, dailyOpMap), [filteredJobs, dailyOpMap]);
  const monthlyKeys = useMemo(() => Object.keys(monthlyData).sort(), [monthlyData]);

  const effectiveRole = previewRole ?? profile.role;
  const effectivePermissions = previewPermissions ?? profile.permissions ?? {};
  const canEditTab = (tabId: string): boolean => {
    if (effectiveRole === "admin") return true;
    return effectivePermissions[tabId] === "edit";
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canEdit = effectiveRole === "admin" || Object.values(effectivePermissions).some(v => v === "edit");
  const effectiveTabs = previewTabs ?? profile.allowedTabs;
  const isAllowed = (tabId: string) => effectiveRole === "admin" || !effectiveTabs || effectiveTabs.length === 0 || effectiveTabs.includes(tabId);

  // Quand on active le preview, reset la vue au 1er onglet autorisé
  const handlePreviewRole = async (roleName: string | null) => {
    if (!roleName) {
      setPreviewRole(null);
      setPreviewTabs(null);
      setPreviewPermissions(null);
      setView(profile.allowedTabs?.length ? profile.allowedTabs[0] : "daily");
      return;
    }
    try {
      const perms = await fetchPermissionsForRole(roleName);
      const tabIds = perms.map(p => p.tab_id);
      const permMap = Object.fromEntries(perms.map(p => [p.tab_id, p.access_level]));
      setPreviewRole(roleName);
      setPreviewTabs(tabIds);
      setPreviewPermissions(permMap);
      setView(tabIds.length > 0 ? tabIds[0] : "daily");
    } catch (err) {
      console.error("Preview role error:", err);
    }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f5f5f7" }}>
      <style>{css}</style>

      {/* ── Sidebar ── */}
      <Sidebar
        view={view}
        onViewChange={setView}
        effectiveRole={effectiveRole}
        effectiveTabs={effectiveTabs}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        profile={profile}
      />

      {/* ── Main area ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar
          view={view}
          bauFilter={bauFilter}
          onBauFilterChange={setBauFilter}
          dbAlerts={dbAlerts}
          showNotif={showNotif}
          onToggleNotif={() => setShowNotif(v => !v)}
          onMarkAllRead={() => markAllAlertsRead().then(refreshAlerts)}
          onMarkRead={(id) => markAlertRead(id).then(refreshAlerts)}
          profile={profile}
          effectiveRole={effectiveRole}
          isAdmin={isAdmin}
          previewRole={previewRole}
          allRoles={allRoles}
          onPreviewRole={handlePreviewRole}
          onShowChangePwd={() => { setShowChangePwd(true); setCpNewPwd(""); setCpConfirm(""); setCpError(null); setCpDone(false); }}
          onLogout={() => signOut()}
          onToggleMobileMenu={() => setMobileMenuOpen(v => !v)}
        />

        {/* ── Modale changement de mot de passe ── */}
        {showChangePwd && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowChangePwd(false); }}
          >
            <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>🔑 Changer mon mot de passe</h3>
              {cpDone ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Mot de passe mis à jour !</div>
                  <button onClick={() => setShowChangePwd(false)} style={{ background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Fermer</button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3a3a3c", marginBottom: 6 }}>Nouveau mot de passe</label>
                    <input type="password" value={cpNewPwd} onChange={(e) => setCpNewPwd(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password"
                      style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: "1.5px solid #d1d1d6", borderRadius: 10, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3a3a3c", marginBottom: 6 }}>Confirmer le mot de passe</label>
                    <input type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Répétez le mot de passe" autoComplete="new-password"
                      style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: "1.5px solid #d1d1d6", borderRadius: 10, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {cpError && <div style={{ background: "#fff2f2", border: "1px solid #ff3b30", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#c0392b", fontSize: 14 }}>{cpError}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowChangePwd(false)} style={{ flex: 1, padding: "12px", background: "#f2f2f7", color: "#1d1d1f", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                    <button onClick={handleChangePassword} disabled={cpLoading || !cpNewPwd || !cpConfirm}
                      style={{ flex: 2, padding: "12px", background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: cpLoading || !cpNewPwd || !cpConfirm ? "not-allowed" : "pointer", opacity: cpLoading || !cpNewPwd || !cpConfirm ? 0.5 : 1 }}>
                      {cpLoading ? "Enregistrement…" : "Confirmer"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Bannière preview mode ── */}
        {previewRole && (
          <div style={{
            background: "linear-gradient(90deg, #ff9500, #ffb340)",
            color: "#fff",
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "-0.2px",
          }}>
            <span>👁 Mode aperçu — Vue en tant que : {allRoles.find(r => r.name === previewRole)?.label ?? previewRole}</span>
            <button
              onClick={() => handlePreviewRole(null)}
              style={{
                background: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 8,
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✕ Revenir à ma vue
            </button>
          </div>
        )}

        <div key={view} className="main layout-wrap" style={{ padding: "24px 24px 60px" }}>
        {view === "home" && <HomeView monthlyData={monthlyData} vehicles={vehicles} loading={jobsLoading} unavails={unavails} onNavigate={setView} />}
        {view === "daily" && isAllowed("daily") && <DailyView vehicles={vehicles} isActive={view === "daily"} unavails={unavails} bauFilter={bauFilter} />}
        {view === "dailyinput" && isAllowed("dailyinput") && <DailyInputView readOnly={!canEditTab("dailyinput")} />}
        {view === "monthly" && isAllowed("monthly") && <MonthlyView monthlyData={monthlyData} monthlyKeys={monthlyKeys} vehicles={vehicles} loading={jobsLoading} unavails={unavails} />}
        {view === "annual" && isAllowed("annual") && <AnnualView annualData={annualData} monthlyData={monthlyData} vehicles={vehicles} unavails={unavails} />}
        {view === "fleet" && isAllowed("fleet") && <FleetView vehicles={vehicles} fleetError={vehiclesError} fleetLoading={vehiclesLoading} onVehicleCreated={refreshVehicles} alerts={dbAlerts} onAlertRefresh={refreshAlerts} unavails={unavails} onUnavailsChange={setUnavails} readOnly={!canEditTab("fleet")} />}
        {view === "checkin" && isAllowed("checkin") && <CheckInView vehicles={vehicles} onAlertCreated={refreshAlerts} onVehicleKmUpdated={refreshVehicles} readOnly={!canEditTab("checkin")} />}
        {view === "attendance" && isAllowed("attendance") && <AttendanceView readOnly={!canEditTab("attendance")} />}
        {view === "hr" && isAllowed("hr") && <HRView readOnly={!canEditTab("hr")} />}
        {view === "payroll" && isAllowed("payroll") && <PayrollView readOnly={!canEditTab("payroll")} />}
        {view === "sales" && isAllowed("sales") && <SalesView readOnly={!canEditTab("sales")} />}
        {view === "admin" && isAllowed("admin") && <AdminView />}
      </div>
      </div>{/* fin main area */}
    </div>
  );
}

