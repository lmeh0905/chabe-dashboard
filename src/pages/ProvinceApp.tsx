import type { UserProfile } from "../api/supabase";
import { signOut } from "../api/supabase";
import TarifsProvince from "./TarifsProvince";

const BLUE = "#1a1a4e";
const RED = "#b22222";

export default function ProvinceApp({ profile }: { profile: UserProfile }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      {/* Header */}
      <div
        style={{
          background: BLUE,
          color: "#fff",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>CHABÉ</span>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Province Sud Est CRA</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{profile.full_name}</span>
          <button
            onClick={() => signOut()}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 60px" }}>
        <TarifsProvince readOnly={false} isAdmin={profile.role === "admin"} />
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "16px 0", color: RED, fontSize: 13, fontWeight: 600 }}>
        Made by Laurent Euzet
      </div>
    </div>
  );
}
