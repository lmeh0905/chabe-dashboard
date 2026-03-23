import { useEffect, useState, useRef } from "react";
import { supabase, getProfile, updatePassword } from "./api/supabase";
import type { UserProfile } from "./api/supabase";
import type { Session } from "@supabase/supabase-js";
import Dashboard from "./Dashboard";
import { JobsProvider } from "./context/JobsContext";
import LoginPage from "./pages/LoginPage";
import DriverApp from "./pages/DriverApp";
import ProvinceApp from "./pages/ProvinceApp";

type AppState = "loading" | "unauthenticated" | "password_recovery" | "driver" | "province" | "manager";

// ─── Écran définir nouveau mot de passe ───────────────────────────────────────

function SetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    border: "1.5px solid #d1d1d6",
    borderRadius: 12,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      onComplete(); // libère le verrou avant que SIGNED_IN arrive
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 20,
          padding: "40px 32px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1d1d1f", marginBottom: 6 }}>CHABE</div>
          <div style={{ fontSize: 15, color: "#6e6e73", fontWeight: 500 }}>Définir votre mot de passe</div>
        </div>

        {done ? (
          <div
            style={{
              textAlign: "center",
              color: "#1d1d1f",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            Mot de passe défini avec succès.
            <br />
            <span style={{ color: "#6e6e73", fontSize: 13 }}>Redirection en cours…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#3a3a3c",
                  marginBottom: 6,
                }}
              >
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#3a3a3c",
                  marginBottom: 6,
                }}
              >
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  background: "#fff0f0",
                  border: "1px solid #ffd0d0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#c0392b",
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                marginTop: 8,
                width: "100%",
                minHeight: 52,
                background: loading || !password || !confirm ? "#c7c7cc" : "#1d1d1f",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading || !password || !confirm ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Enregistrement…" : "Confirmer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── App principale ────────────────────────────────────────────────────────────

export default function App() {
  // Initialiser immédiatement depuis l'URL — avant tout événement auth
  const initialRecovery = window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery");
  const inRecoveryRef = useRef(initialRecovery);
  const [appState, setAppState] = useState<AppState>(
    initialRecovery ? "password_recovery" : "loading"
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);

  async function handleSession(session: Session | null, event?: string) {
    // Bloquer TOUS les événements tant qu'on est en mode récupération
    // (SIGNED_IN automatique + getSession() + tout autre événement)
    if (inRecoveryRef.current) {
      if (event === "PASSWORD_RECOVERY") {
        setAppState("password_recovery"); // s'assurer que l'écran reste affiché
      }
      return;
    }

    // Cas recovery détecté tardivement (URL sans hash standard)
    if (event === "PASSWORD_RECOVERY") {
      inRecoveryRef.current = true;
      setAppState("password_recovery");
      return;
    }

    if (!session) {
      setProfile(null);
      setAppState("unauthenticated");
      return;
    }
    try {
      const p = await getProfile(session.user.id);
      if (!p) {
        await supabase.auth.signOut();
        setProfile(null);
        setAppState("unauthenticated");
        return;
      }
      setProfile(p);
      setAppState(p.role === "driver" ? "driver" : p.role === "Province Sud Est" ? "province" : "manager");
    } catch {
      setProfile(null);
      setAppState("unauthenticated");
    }
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session, event);
    });

    // Ne pas appeler getSession() si on est en recovery — inutile et risque d'écraser l'état
    if (!inRecoveryRef.current) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session);
      });
    }

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (appState === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f5f5f7",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #e0e0e0",
            borderTop: "3px solid #1d1d1f",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (appState === "password_recovery") {
    return (
      <SetPasswordScreen
        onComplete={() => {
          inRecoveryRef.current = false;
          // Déclencher manuellement la navigation car SIGNED_IN a été bloqué
          supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
          });
        }}
      />
    );
  }

  if (appState === "unauthenticated") {
    return <LoginPage />;
  }

  if (appState === "driver" && profile) {
    return <DriverApp profile={profile} />;
  }

  if (appState === "province" && profile) {
    return <ProvinceApp profile={profile} />;
  }

  return (
    <JobsProvider>
      <Dashboard profile={profile!} />
    </JobsProvider>
  );
}
