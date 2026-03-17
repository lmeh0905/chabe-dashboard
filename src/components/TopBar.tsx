import type { AlertRecord, Role, UserProfile } from "../api/supabase";
import { ICONS } from "./Sidebar";

// ─── View titles ────────────────────────────────────────────────────────────
const VIEW_TITLES: Record<string, string> = {
  home: "Home",
  daily: "Daily Overview",
  dailyinput: "Daily Input",
  monthly: "Monthly Report",
  annual: "Annual Report",
  fleet: "Fleet Management",
  checkin: "Check-In / Check-Out",
  attendance: "Attendance",
  hr: "Human Resources",
  payroll: "Payroll",
  sales: "Sales Pipeline",
  admin: "Administration",
};

// ─── Component ──────────────────────────────────────────────────────────────
interface TopBarProps {
  view: string;
  // BAU filter
  bauFilter: "all" | "BAU" | "Event";
  onBauFilterChange: (v: "all" | "BAU" | "Event") => void;
  // Notifications
  dbAlerts: AlertRecord[];
  showNotif: boolean;
  onToggleNotif: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
  // User
  profile: UserProfile;
  effectiveRole: string;
  // Preview
  isAdmin: boolean;
  previewRole: string | null;
  allRoles: Role[];
  onPreviewRole: (name: string | null) => void;
  // Password
  onShowChangePwd: () => void;
  // Logout
  onLogout: () => void;
  // Mobile
  onToggleMobileMenu: () => void;
}

export default function TopBar({
  view,
  bauFilter,
  onBauFilterChange,
  dbAlerts,
  showNotif,
  onToggleNotif,
  onMarkAllRead,
  onMarkRead,
  profile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  effectiveRole,
  isAdmin,
  previewRole,
  allRoles,
  onPreviewRole,
  onShowChangePwd,
  onLogout,
  onToggleMobileMenu,
}: TopBarProps) {
  const unread = dbAlerts.filter(a => !a.read).length;

  const fmtRelTime = (ts?: string) => {
    if (!ts) return "";
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${Math.floor(diff / 86400)} j`;
  };

  const showBau = ["daily", "monthly", "annual"].includes(view);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
        {/* Hamburger (mobile only) */}
        <button
          className="topbar-hamburger"
          onClick={onToggleMobileMenu}
          style={{ display: "none", background: "transparent", border: "none", cursor: "pointer", color: "#1d1d1f", padding: 4 }}
        >
          {ICONS.hamburger}
        </button>

        {/* Page title */}
        <h1 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0, whiteSpace: "nowrap", letterSpacing: "-0.3px" }}>
          {VIEW_TITLES[view] ?? view}
        </h1>

        {/* BAU/Event filter */}
        {showBau && (
          <div style={{ display: "flex", gap: 1, background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 2, flexShrink: 0 }}>
            {([["all", "Tous"], ["BAU", "BAU"], ["Event", "Event"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onBauFilterChange(val)}
                style={{
                  background: bauFilter === val ? (val === "BAU" ? "#007aff" : val === "Event" ? "#ff9500" : "#fff") : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: bauFilter === val ? 700 : 500,
                  color: bauFilter === val ? (val === "all" ? "#1d1d1f" : "#fff") : "#86868b",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  boxShadow: bauFilter === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Notification Bell */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={onToggleNotif}
            style={{
              position: "relative",
              background: showNotif ? "rgba(0,122,255,0.08)" : "transparent",
              border: "none",
              borderRadius: 10,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 17,
            }}
          >
            🔔
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2, background: "#ff3b30", color: "#fff",
                borderRadius: 10, minWidth: 16, height: 16, fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", fontFamily: "inherit", lineHeight: 1,
              }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          {showNotif && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onToggleNotif} />
              <div style={{
                position: "fixed", top: 58, right: 16, width: 380, maxHeight: "75vh",
                background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                zIndex: 200, overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                <div style={{
                  padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f5",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                    {unread > 0 && (
                      <span style={{ marginLeft: 8, background: "#ff3b30", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>
                        {unread} non lue{unread > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {unread > 0 && (
                    <button onClick={onMarkAllRead} style={{ background: "transparent", border: "none", fontSize: 11, color: "#007aff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {dbAlerts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: "#86868b", fontSize: 13 }}>Aucune notification</div>
                  ) : (
                    dbAlerts.map(alert => (
                      <div
                        key={alert.id}
                        onClick={() => !alert.read && onMarkRead(alert.id)}
                        style={{
                          padding: "12px 16px", borderBottom: "1px solid #f8f8f9",
                          background: alert.read ? "#fff" : "rgba(255,149,0,0.04)",
                          cursor: alert.read ? "default" : "pointer", display: "flex", gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
                          {alert.type === "service_due" ? "🔧" : "⚠️"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{alert.plate}</span>
                            {!alert.read && <span style={{ background: "#ff9500", borderRadius: 4, width: 6, height: 6, display: "inline-block", flexShrink: 0 }} />}
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "#86868b", flexShrink: 0 }}>{fmtRelTime(alert.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#1d1d1f", marginBottom: 2 }}>{alert.message}</div>
                          {alert.km_prev != null && alert.km_current != null && (
                            <div style={{ fontSize: 11, color: "#86868b" }}>
                              {alert.km_prev?.toLocaleString("fr-FR")} km → {alert.km_current?.toLocaleString("fr-FR")} km
                              <span style={{ marginLeft: 6, fontWeight: 700, color: (alert.km_diff ?? 0) < 0 ? "#ff3b30" : "#ff9500" }}>
                                {(alert.km_diff ?? 0) > 0 ? "+" : ""}{alert.km_diff?.toLocaleString("fr-FR")} km
                              </span>
                            </div>
                          )}
                          {alert.driver_name && <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>Chauffeur : {alert.driver_name}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User info */}
        <div className="topbar-user" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="topbar-user-name" style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>{profile.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#e8f4fd", color: "#007aff", textTransform: "capitalize" }}>{profile.role}</span>
        </div>

        {/* Preview role (admin only) */}
        {isAdmin && (
          <select
            className="topbar-preview-select"
            value={previewRole ?? ""}
            onChange={(e) => onPreviewRole(e.target.value || null)}
            style={{
              fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 8px",
              borderRadius: 8,
              border: previewRole ? "1.5px solid #ff9500" : "1.5px solid rgba(0,0,0,0.1)",
              background: previewRole ? "#fff8ef" : "#fff",
              color: previewRole ? "#e67e00" : "#6e6e73",
              cursor: "pointer", outline: "none",
            }}
          >
            <option value="">👁 Voir en tant que…</option>
            {allRoles.filter(r => r.name !== profile.role).map(r => (
              <option key={r.name} value={r.name}>{r.label}</option>
            ))}
          </select>
        )}

        {/* Change password */}
        <button
          onClick={onShowChangePwd}
          style={{ background: "none", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "5px 10px", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", lineHeight: 1 }}
          title="Changer mon mot de passe"
        >
          🔑
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            background: "none", border: "1.5px solid rgba(255,59,48,0.2)", borderRadius: 8,
            padding: "5px 10px", fontSize: 13, cursor: "pointer", display: "flex",
            alignItems: "center", gap: 4, lineHeight: 1, color: "#ff3b30", fontWeight: 600, fontFamily: "inherit",
          }}
          title="Déconnexion"
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>⏻</span>
          <span className="topbar-logout-text">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
