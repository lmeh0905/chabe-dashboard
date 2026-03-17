import { useEffect, useState } from "react";
import CustomSelect from "../components/CustomSelect";
import type { UserProfile } from "../api/supabase";
import {
  signOut,
  fetchAllVehicles,
  fetchCheckIns,
  createCheckIn,
  updateVehicle,
  createAlert,
  uploadVehicleAsset,
  updatePassword,
} from "../api/supabase";
import type { FleetVehicle, CheckInRecord } from "../api/supabase";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 16,
  border: "1.5px solid #d1d1d6",
  borderRadius: 12,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#3a3a3c",
  marginBottom: 6,
};

const btnPrimaryStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  background: "#1d1d1f",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
};

const btnDangerStyle: React.CSSProperties = {
  ...btnPrimaryStyle,
  background: "#ff3b30",
};

const FUEL_OPTIONS = ["Empty", "1/4", "1/2", "3/4", "Full"] as const;
type FuelLevel = (typeof FUEL_OPTIONS)[number];

const PROBLEM_CATS = [
  { id: "body", icon: "🚗", label: "Body" },
  { id: "mech", icon: "🔧", label: "Mechanical" },
  { id: "clean", icon: "🧹", label: "Cleanliness" },
  { id: "fuel", icon: "⛽", label: "Fuel" },
  { id: "equip", icon: "📱", label: "Equipment" },
  { id: "other", icon: "❗", label: "Other" },
];

function formatDatetime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  profile: UserProfile;
}

export default function DriverApp({ profile }: Props) {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [activeSession, setActiveSession] = useState<CheckInRecord | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Check-in form state
  const [selectedPlate, setSelectedPlate] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [fuelStart, setFuelStart] = useState<FuelLevel>("1/2");
  const [locationStart, setLocationStart] = useState("");
  const [notesIn, setNotesIn] = useState("");
  const [submittingIn, setSubmittingIn] = useState(false);
  const [errorIn, setErrorIn] = useState<string | null>(null);

  // Check-out form state
  const [kmEnd, setKmEnd] = useState("");
  const [fuelEnd, setFuelEnd] = useState<FuelLevel>("1/2");
  const [hasProblem, setHasProblem] = useState(false);
  const [probCat, setProbCat] = useState("");
  const [probNote, setProbNote] = useState("");
  const [probPhoto, setProbPhoto] = useState<File | null>(null);
  const [probPhotoUrl, setProbPhotoUrl] = useState<string | null>(null);
  const [submittingOut, setSubmittingOut] = useState(false);
  const [errorOut, setErrorOut] = useState<string | null>(null);

  // Change password state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [cpNewPwd, setCpNewPwd] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpDone, setCpDone] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [allVehicles] = await Promise.all([fetchAllVehicles()]);
        const officeVehicles = allVehicles.filter((v) => v.location === "Office");
        setVehicles(officeVehicles);

        const recentCheckIns = await fetchCheckIns({ limit: 50 });
        const myCheckIns = recentCheckIns.filter(
          (r) => r.driver_name === profile.name && r.entry_type === "check_in"
        );
        if (myCheckIns.length > 0) {
          const last = myCheckIns[0];
          const checkout = recentCheckIns.find(
            (r) => r.session_id === last.session_id && r.entry_type === "check_out"
          );
          if (!checkout) {
            setActiveSession(last);
            setSelectedPlate(last.plate);
          }
        }
      } catch (e) {
        console.error("DriverApp init error", e);
      } finally {
        setLoadingInit(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  async function handleChangePassword() {
    if (cpNewPwd.length < 8) { setCpError("Minimum 8 characters"); return; }
    if (cpNewPwd !== cpConfirm) { setCpError("Passwords do not match"); return; }
    setCpLoading(true);
    setCpError(null);
    try {
      await updatePassword(cpNewPwd);
      setCpDone(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setCpError(e.message ?? "Error changing password");
    } finally {
      setCpLoading(false);
    }
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlate) return;
    setErrorIn(null);
    setSubmittingIn(true);
    try {
      const sessionId = crypto.randomUUID();
      const record = await createCheckIn({
        session_id: sessionId,
        plate: selectedPlate,
        driver_name: profile.name,
        driver_id_text: profile.id,
        entry_type: "check_in",
        km: kmStart ? Number(kmStart) : null,
        fuel: fuelStart,
        location: locationStart.trim() || null,
        notes: notesIn.trim() || null,
      });
      setActiveSession(record);
      setKmStart("");
      setFuelStart("1/2");
      setLocationStart("");
      setNotesIn("");
    } catch (err) {
      setErrorIn(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setSubmittingIn(false);
    }
  }

  async function handleCheckOut(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSession) return;
    setErrorOut(null);
    setSubmittingOut(true);
    try {
      const kmOut = kmEnd ? Number(kmEnd) : null;
      const kmIn = activeSession.km ?? null;

      let finalPhotoUrl: string | null = null;
      if (hasProblem && probPhoto) {
        const ext = probPhoto.name.split(".").pop() ?? "jpg";
        finalPhotoUrl = await uploadVehicleAsset(
          activeSession.plate, probPhoto, `problem-${Date.now()}.${ext}`
        );
      }

      await createCheckIn({
        session_id: activeSession.session_id,
        plate: activeSession.plate,
        driver_name: profile.name,
        driver_id_text: profile.id,
        entry_type: "check_out",
        km: kmOut,
        fuel: fuelEnd,
        location: null,
        notes: hasProblem ? (probNote.trim() || null) : null,
        problem_cat: hasProblem ? (probCat || null) : null,
        problem_photo_url: finalPhotoUrl,
      });

      if (kmOut !== null) {
        await updateVehicle(activeSession.plate, { km: kmOut });
      }

      if (kmIn !== null && kmOut !== null) {
        const diff = kmOut - kmIn;
        if (diff < 0 || diff > 1000) {
          await createAlert({
            plate: activeSession.plate,
            type: "km_discrepancy",
            message: `Suspicious km gap: start ${kmIn} km → end ${kmOut} km (diff ${diff > 0 ? "+" : ""}${diff} km)`,
            km_prev: kmIn,
            km_current: kmOut,
            km_diff: diff,
            driver_name: profile.name,
            read: false,
          });
        }
      }

      if (hasProblem && probCat) {
        const catLabel = PROBLEM_CATS.find((c) => c.id === probCat)?.label ?? probCat;
        await createAlert({
          plate: activeSession.plate,
          type: "problem_report",
          message: `Problem reported: ${catLabel}${probNote.trim() ? ` — ${probNote.trim()}` : ""}`,
          driver_name: profile.name,
          read: false,
        });
      }

      setActiveSession(null);
      setKmEnd("");
      setFuelEnd("1/2");
      setHasProblem(false);
      setProbCat("");
      setProbNote("");
      setProbPhoto(null);
      setProbPhotoUrl(null);
    } catch (err) {
      setErrorOut(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setSubmittingOut(false);
    }
  }

  function handleProblemPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setProbPhoto(f);
    setProbPhotoUrl(URL.createObjectURL(f));
  }

  if (loadingInit) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e0e0e0", borderTop: "3px solid #1d1d1f", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e5e5ea", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f", letterSpacing: "-0.3px" }}>CHABE</div>
          <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 1 }}>{profile.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { setShowChangePwd(true); setCpNewPwd(""); setCpConfirm(""); setCpError(null); setCpDone(false); }}
            style={{ background: "none", border: "1.5px solid #d1d1d6", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#3a3a3c", cursor: "pointer" }}
            title="Change password"
          >🔑</button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ background: "none", border: "1.5px solid #d1d1d6", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#3a3a3c", cursor: "pointer" }}
          >{signingOut ? "…" : "Sign out"}</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 16px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {!activeSession ? (
          <div style={{ background: "#fff", borderRadius: 18, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 800, color: "#1d1d1f", letterSpacing: "-0.3px" }}>Start Mission</h2>
            <p style={{ margin: "0 0 24px 0", fontSize: 13, color: "#6e6e73" }}>Fill in the departure information</p>

            <form onSubmit={handleCheckIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Vehicle *</label>
                <CustomSelect value={selectedPlate} onChange={(v) => setSelectedPlate(String(v))} placeholder="Select a vehicle…" searchPlaceholder="Plate or model…" countLabel={`vehicle${vehicles.length !== 1 ? "s" : ""}`} options={vehicles.map((v) => ({ value: v.plate, label: `${v.make} ${v.model} (${v.year})`, badge: v.plate, badgeBg: "rgba(0,122,255,0.1)", badgeColor: "#007aff" }))} />
              </div>

              <div>
                <label style={labelStyle}>Start Mileage *</label>
                <input type="number" min={0} value={kmStart} onChange={(e) => setKmStart(e.target.value)} placeholder="e.g. 45200" required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Start Fuel Level *</label>
                <CustomSelect value={fuelStart} onChange={(v) => setFuelStart(String(v) as FuelLevel)} options={FUEL_OPTIONS.map((f) => ({ value: f, label: f }))} />
              </div>

              <div>
                <label style={labelStyle}>Start Location</label>
                <input type="text" value={locationStart} onChange={(e) => setLocationStart(e.target.value)} placeholder="e.g. Office, Hotel XYZ…" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={notesIn} onChange={(e) => setNotesIn(e.target.value)} placeholder="Observations before departure…" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
              </div>

              {errorIn && (
                <div style={{ background: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c0392b", fontWeight: 500 }}>{errorIn}</div>
              )}

              <button type="submit" disabled={submittingIn || !selectedPlate || !kmStart} style={{ ...btnPrimaryStyle, marginTop: 4, opacity: submittingIn || !selectedPlate || !kmStart ? 0.5 : 1, cursor: submittingIn || !selectedPlate || !kmStart ? "not-allowed" : "pointer" }}>
                {submittingIn ? "Saving…" : "✓ Start Mission"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Active session card */}
            <div style={{ background: "#e8f5e9", border: "1.5px solid #a5d6a7", borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2e7d32", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Mission in progress</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f", marginBottom: 4 }}>{activeSession.plate}</div>
              {(() => {
                const v = vehicles.find((x) => x.plate === activeSession.plate);
                return v ? <div style={{ fontSize: 13, color: "#3a3a3c", marginBottom: 8 }}>{v.make} {v.model} ({v.year})</div> : null;
              })()}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6e6e73", marginBottom: 2 }}>Departure</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDatetime(activeSession.checked_in_at)}</div>
                </div>
                {activeSession.km !== null && activeSession.km !== undefined && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6e6e73", marginBottom: 2 }}>Start km</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{activeSession.km.toLocaleString("en-GB")} km</div>
                  </div>
                )}
                {activeSession.fuel && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6e6e73", marginBottom: 2 }}>Start fuel</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{activeSession.fuel}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Check-out form */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 800, color: "#1d1d1f", letterSpacing: "-0.3px" }}>End Mission</h2>
              <p style={{ margin: "0 0 24px 0", fontSize: 13, color: "#6e6e73" }}>Fill in the arrival information</p>

              <form onSubmit={handleCheckOut} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>End Mileage *</label>
                  <input type="number" min={activeSession.km ?? 0} value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} placeholder={activeSession.km ? `Min. ${activeSession.km.toLocaleString("en-GB")} km` : "e.g. 45350"} required style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>End Fuel Level *</label>
                  <CustomSelect value={fuelEnd} onChange={(v) => setFuelEnd(String(v) as FuelLevel)} options={FUEL_OPTIONS.map((f) => ({ value: f, label: f }))} />
                </div>

                <div style={{ border: "1.5px solid #d1d1d6", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasProblem ? 14 : 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>⚠️ Report a problem</span>
                    <button type="button" onClick={() => { setHasProblem(!hasProblem); setProbCat(""); setProbNote(""); setProbPhoto(null); setProbPhotoUrl(null); }} style={{ background: hasProblem ? "rgba(255,59,48,0.1)" : "#f5f5f7", color: hasProblem ? "#ff3b30" : "#86868b", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {hasProblem ? "Cancel" : "+ Report"}
                    </button>
                  </div>

                  {hasProblem && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Category</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                          {PROBLEM_CATS.map((c) => (
                            <button key={c.id} type="button" onClick={() => setProbCat(c.id)} style={{ background: probCat === c.id ? "#1d1d1f" : "#f5f5f7", color: probCat === c.id ? "#fff" : "#1d1d1f", border: "none", borderRadius: 10, padding: "12px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 20 }}>{c.icon}</span>
                              <span>{c.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Description</div>
                        <textarea value={probNote} onChange={(e) => setProbNote(e.target.value)} placeholder="Describe the problem…" rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Photo (optional)</div>
                        {probPhotoUrl ? (
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <img src={probPhotoUrl} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10 }} />
                            <button type="button" onClick={() => { setProbPhoto(null); setProbPhotoUrl(null); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                          </div>
                        ) : (
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#f5f5f7", border: "1.5px dashed #d1d1d6", borderRadius: 10, padding: "12px 16px", cursor: "pointer" }}>
                            <span style={{ fontSize: 20 }}>📷</span>
                            <span style={{ fontSize: 13, color: "#86868b", fontWeight: 500 }}>Take a photo</span>
                            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleProblemPhoto} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {errorOut && (
                  <div style={{ background: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c0392b", fontWeight: 500 }}>{errorOut}</div>
                )}

                <button type="submit" disabled={submittingOut || !kmEnd} style={{ ...btnDangerStyle, marginTop: 4, opacity: submittingOut || !kmEnd ? 0.5 : 1, cursor: submittingOut || !kmEnd ? "not-allowed" : "pointer" }}>
                  {submittingOut ? "Saving…" : "✓ End Mission"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Change password modal */}
      {showChangePwd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setShowChangePwd(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>🔑 Change Password</h3>
            {cpDone ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Password updated!</div>
                <button onClick={() => setShowChangePwd(false)} style={{ ...btnPrimaryStyle, width: "auto", padding: "10px 24px" }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>New password</label>
                  <input type="password" value={cpNewPwd} onChange={(e) => setCpNewPwd(e.target.value)} placeholder="Minimum 8 characters" style={inputStyle} autoComplete="new-password" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Confirm password</label>
                  <input type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} placeholder="Repeat the password" style={inputStyle} autoComplete="new-password" />
                </div>
                {cpError && (
                  <div style={{ background: "#fff2f2", border: "1px solid #ff3b30", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#c0392b", fontSize: 14 }}>{cpError}</div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowChangePwd(false)} style={{ ...btnPrimaryStyle, background: "#f2f2f7", color: "#1d1d1f", flex: 1 }}>Cancel</button>
                  <button onClick={handleChangePassword} disabled={cpLoading || !cpNewPwd || !cpConfirm} style={{ ...btnPrimaryStyle, flex: 2, opacity: cpLoading || !cpNewPwd || !cpConfirm ? 0.5 : 1, cursor: cpLoading || !cpNewPwd || !cpConfirm ? "not-allowed" : "pointer" }}>
                    {cpLoading ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
