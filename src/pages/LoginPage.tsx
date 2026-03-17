import { useState } from "react";
import { signIn, resetPasswordForEmail } from "../api/supabase";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 16,
  border: "1.5px solid #d1d1d6",
  borderRadius: 12,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode "mot de passe oublié"
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // App.tsx via onAuthStateChange va rediriger automatiquement
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      if (
        msg.toLowerCase().includes("invalid login credentials") ||
        msg.toLowerCase().includes("invalid credentials")
      ) {
        setError("Email ou mot de passe incorrect.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Veuillez confirmer votre email avant de vous connecter.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      await resetPasswordForEmail(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setResetLoading(false);
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
        {/* Logo / Titre */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "#1d1d1f",
              marginBottom: 6,
            }}
          >
            CHABE Dubai
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#6e6e73",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {forgotMode ? "Réinitialisation du mot de passe" : "Connexion"}
          </div>
        </div>

        {/* ── Mode connexion ── */}
        {!forgotMode && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3a3a3c", marginBottom: 6 }}
              >
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@chabe.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1d1d1f")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d1d6")}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3a3a3c" }}>
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setResetEmail(email); setError(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    color: "#6e6e73",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1d1d1f")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d1d6")}
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
              disabled={loading || !email || !password}
              style={{
                marginTop: 8,
                width: "100%",
                minHeight: 52,
                background: loading || !email || !password ? "#c7c7cc" : "#1d1d1f",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                transition: "background 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        )}

        {/* ── Mode mot de passe oublié ── */}
        {forgotMode && (
          <>
            {resetSent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📩</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>
                  Email envoyé !
                </div>
                <div style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, marginBottom: 24 }}>
                  Un lien de réinitialisation a été envoyé à<br />
                  <strong>{resetEmail}</strong>
                </div>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); }}
                  style={{
                    background: "none",
                    border: "1.5px solid #d1d1d6",
                    borderRadius: 12,
                    padding: "12px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#3a3a3c",
                    cursor: "pointer",
                  }}
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6e6e73", lineHeight: 1.6 }}>
                  Entrez votre adresse email. Vous recevrez un lien pour définir votre mot de passe.
                </p>

                <div>
                  <label
                    style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3a3a3c", marginBottom: 6 }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="prenom.nom@chabe.com"
                    required
                    autoFocus
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#1d1d1f")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d1d6")}
                  />
                </div>

                {resetError && (
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
                    {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    minHeight: 52,
                    background: resetLoading || !resetEmail ? "#c7c7cc" : "#1d1d1f",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: resetLoading || !resetEmail ? "not-allowed" : "pointer",
                  }}
                >
                  {resetLoading ? "Envoi…" : "Envoyer le lien"}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setResetError(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 13,
                    color: "#6e6e73",
                    cursor: "pointer",
                    textAlign: "center",
                    padding: "4px 0",
                  }}
                >
                  ← Retour à la connexion
                </button>
              </form>
            )}
          </>
        )}

        {!forgotMode && (
          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontSize: 12,
              color: "#aeaeb2",
              lineHeight: 1.5,
            }}
          >
            Les comptes sont créés par l'administrateur.
            <br />
            Contactez votre manager si vous n'avez pas accès.
          </div>
        )}
      </div>
    </div>
  );
}
