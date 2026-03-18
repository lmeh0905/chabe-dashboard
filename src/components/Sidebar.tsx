import type { JSX } from "react";
import type { UserProfile } from "../api/supabase";

// ─── SVG Icons (16×16) ─────────────────────────────────────────────────────
const icon = (d: string, strokeWidth = 1.5) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  daily: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  dailyinput: icon("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"),
  monthly: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  annual: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  fleet: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  ),
  checkin: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  attendance: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  hr: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  payroll: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  sales: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  admin: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  ),
  collapse: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  expand: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  hamburger: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

// ─── Navigation groups ──────────────────────────────────────────────────────
interface NavItem { id: string; label: string }
interface NavGroup { id: string; label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home-group", label: "",
    items: [
      { id: "home", label: "Home" },
    ],
  },
  {
    id: "operations", label: "Operations",
    items: [
      { id: "daily", label: "Daily" },
      { id: "dailyinput", label: "Daily Input" },
      { id: "monthly", label: "Monthly" },
      { id: "annual", label: "Annual" },
    ],
  },
  {
    id: "fleet", label: "Fleet",
    items: [
      { id: "fleet", label: "Fleet" },
      { id: "checkin", label: "Check-In" },
    ],
  },
  {
    id: "people", label: "People",
    items: [
      { id: "attendance", label: "Attendance" },
      { id: "hr", label: "HR" },
      { id: "payroll", label: "Payroll" },
    ],
  },
  {
    id: "commercial", label: "Commercial",
    items: [
      { id: "sales", label: "Sales" },
    ],
  },
  {
    id: "admin-group", label: "Admin",
    items: [
      { id: "admin", label: "Admin" },
    ],
  },
];

// ─── ALL_TABS export for Dashboard ──────────────────────────────────────────
export const ALL_TABS = NAV_GROUPS.flatMap(g => g.items.map(i => ({ id: i.id, label: i.label })));

// ─── Component ──────────────────────────────────────────────────────────────
interface SidebarProps {
  view: string;
  onViewChange: (id: string) => void;
  effectiveRole: string;
  effectiveTabs: string[] | null | undefined;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  profile: UserProfile;
}

export default function Sidebar({
  view,
  onViewChange,
  effectiveRole,
  effectiveTabs,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  profile,
}: SidebarProps) {
  // On mobile drawer, always show expanded (labels visible)
  const isCollapsed = mobileOpen ? false : collapsed;

  const isAllowed = (tabId: string) =>
    tabId === "home" || effectiveRole === "admin" || !effectiveTabs || effectiveTabs.length === 0 || effectiveTabs.includes(tabId);

  const handleNav = (id: string) => {
    onViewChange(id);
    onMobileClose();
  };

  const filteredGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => isAllowed(i.id)) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 199 }}
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`sidebar${isCollapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}
      >
        {/* ── Brand ── */}
        <div style={{ padding: isCollapsed ? "20px 0 16px" : "20px 16px 16px", display: "flex", alignItems: isCollapsed ? "center" : "flex-start", justifyContent: isCollapsed ? "center" : "flex-start", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #fff, #c8c8c8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#1d1d1f", fontSize: 12, fontWeight: 700 }}>C</span>
          </div>
          {!isCollapsed && (
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", whiteSpace: "nowrap", color: "#f5f5f7" }}>
              CHABE <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Dubai</span>
            </span>
          )}
        </div>

        {/* ── Navigation groups ── */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isCollapsed ? "0 4px" : "0 8px" }}>
          {filteredGroups.map((group) => (
            <div key={group.id} style={{ marginBottom: 8 }}>
              {/* Section header */}
              {!isCollapsed && group.label && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase" as const,
                  color: "rgba(255,255,255,0.3)",
                  padding: "12px 12px 4px",
                }}>
                  {group.label}
                </div>
              )}
              {isCollapsed && <div style={{ height: 8 }} />}

              {/* Items */}
              {group.items.map((item) => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`sidebar-item${active ? " sidebar-item-active" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: isCollapsed ? "8px 0" : "7px 12px",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      borderRadius: 8,
                      margin: "1px 4px",
                      cursor: "pointer",
                      transition: "background 0.12s",
                      position: "relative",
                      color: active ? "#f5f5f7" : "rgba(255,255,255,0.5)",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      border: "none",
                      background: active ? "rgba(255,255,255,0.08)" : "transparent",
                      width: isCollapsed ? 40 : "calc(100% - 8px)",
                      textAlign: "left",
                      fontFamily: "inherit",
                      lineHeight: 1.4,
                    }}
                  >
                    {/* Active indicator */}
                    {active && !isCollapsed && (
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        background: "#007aff",
                        borderRadius: 1,
                      }} />
                    )}
                    <span style={{ flexShrink: 0, display: "flex", opacity: active ? 1 : 0.7 }}>
                      {ICONS[item.id] ?? null}
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle (desktop only) ── */}
        <div className="sidebar-collapse-btn" style={{ padding: "12px 8px", flexShrink: 0 }}>
          <button
            onClick={onToggleCollapse}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "8px 0",
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >
            {isCollapsed ? ICONS.expand : ICONS.collapse}
            {!isCollapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export { ICONS };
