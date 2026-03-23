import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchTarifs,
  createTarif,
  updateTarif,
  deleteTarif,
} from "../api/supabase";
import type { TarifProvince, TarifProvinceInput } from "../api/supabase";

// ─── Colors ──────────────────────────────────────────────────────────────────
const BLUE = "#1a1a4e";
const RED = "#b22222";
const WHITE = "#ffffff";
const LIGHT_BG = "#f5f6fa";
const BORDER = "#e0e0e0";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
};

interface ComputeOverrides {
  serviceOverride?: number;
  publicOverrides?: { e?: number; v?: number; s?: number; prestige?: number };
}

function computeAll(km: number, temps: number, peages: number, repas: number, frais: number, overrides?: ComputeOverrides) {
  const defaultPublicE = Math.round(45 + km * 2 + temps * 1.5 + peages * 2 + repas + frais);
  const defaultPublicV = Math.round(53 + km * 2.75 + temps * 1.8 + peages * 2 + repas + frais);
  const defaultPublicS = Math.round(60 + km * 3.5 + temps * 2 + peages * 2 + repas + frais);
  const defaultPublicPrestige = Math.round(80 + km * 4 + temps * 2.85 + peages * 2 + repas + frais);

  const po = overrides?.publicOverrides;
  const publicE = po?.e !== undefined ? po.e : defaultPublicE;
  const publicV = po?.v !== undefined ? po.v : defaultPublicV;
  const publicS = po?.s !== undefined ? po.s : defaultPublicS;
  const publicPrestige = po?.prestige !== undefined ? po.prestige : defaultPublicPrestige;

  const hotelE = Math.round(publicE / 0.9);
  const hotelV = Math.round(publicV / 0.9);
  const hotelS = Math.round(publicS / 0.9);
  const hotelPrestige = Math.round(publicPrestige / 0.9);

  const defaultService = Math.round(publicE * 0.11);
  const service = overrides?.serviceOverride !== undefined ? overrides.serviceOverride : defaultService;

  const prixVoitureE = publicE - service - peages * 2 - repas - frais;
  const prixVoitureV = publicV - service - peages * 2 - repas - frais;
  const prixVoitureS = publicS - service - peages * 2 - repas - frais;
  const prixVoiturePrestige = publicPrestige - service - peages * 2 - repas - frais;

  const intercoE = Math.round(prixVoitureE / 1.25 + peages * 2 + repas + frais + service);
  const intercoV = Math.round(prixVoitureV / 1.25 + peages * 2 + repas + frais + service);
  const intercoS = Math.round(prixVoitureS / 1.25 + peages * 2 + repas + frais + service);
  const intercoPrestige = Math.round(prixVoiturePrestige / 1.25 + peages * 2 + repas + frais + service);

  const sstE = Math.floor(intercoE * 0.75);
  const sstV = Math.round(intercoV * 0.75);
  const sstS = Math.round(intercoS * 0.75);
  const sstPrestige = Math.round(intercoPrestige * 0.75);

  const corpoE = Math.round(prixVoitureE / 1.1 + peages * 2 + repas + frais + service);
  const corpoV = Math.round(prixVoitureV / 1.1 + peages * 2 + repas + frais + service);
  const corpoS = Math.round(prixVoitureS / 1.1 + peages * 2 + repas + frais + service);
  const corpoPrestige = Math.round(prixVoiturePrestige / 1.1 + peages * 2 + repas + frais + service);

  const corpoRemE = Math.round(prixVoitureE / 1.2 + peages * 2 + repas + frais + service);
  const corpoRemV = Math.round(prixVoitureV / 1.2 + peages * 2 + repas + frais + service);
  const corpoRemS = Math.round(prixVoitureS / 1.2 + peages * 2 + repas + frais + service);
  const corpoRemPrestige = Math.round(prixVoiturePrestige / 1.2 + peages * 2 + repas + frais + service);

  return {
    public_e: publicE, public_v: publicV, public_s: publicS, public_prestige: publicPrestige,
    defaultPublic: { e: defaultPublicE, v: defaultPublicV, s: defaultPublicS, prestige: defaultPublicPrestige },
    hotel_e: hotelE, hotel_v: hotelV, hotel_s: hotelS, hotel_prestige: hotelPrestige,
    service, defaultService,
    prix_voiture_e: prixVoitureE, prix_voiture_v: prixVoitureV, prix_voiture_s: prixVoitureS, prix_voiture_prestige: prixVoiturePrestige,
    interco_e: intercoE, interco_v: intercoV, interco_s: intercoS, interco_prestige: intercoPrestige,
    sst_e: sstE, sst_v: sstV, sst_s: sstS, sst_prestige: sstPrestige,
    corpo_e: corpoE, corpo_v: corpoV, corpo_s: corpoS, corpo_prestige: corpoPrestige,
    corpo_rem_e: corpoRemE, corpo_rem_v: corpoRemV, corpo_rem_s: corpoRemS, corpo_rem_prestige: corpoRemPrestige,
  };
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const btnStyle = (bg: string, color = WHITE): React.CSSProperties => ({
  padding: "8px 20px",
  background: bg,
  color,
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
});

const cardStyle: React.CSSProperties = {
  background: WHITE,
  borderRadius: 12,
  boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 20,
  flexWrap: "wrap",
  gap: 12,
};

// ─── Price Grid Component ────────────────────────────────────────────────────
function PriceGrid({
  tarif,
  title,
  fields,
  onBack,
}: {
  tarif: TarifProvince;
  title: string;
  fields: { label: string; key: keyof TarifProvince }[];
  onBack: () => void;
}) {
  const pvKeys: (keyof TarifProvince)[] = ["prix_voiture_e", "prix_voiture_v", "prix_voiture_s", "prix_voiture_prestige"];
  const peages2 = (tarif.peages ?? 0) * 2;
  const repas = tarif.repas ?? 0;
  const fraisVal = tarif.frais ?? 0;
  const serviceVal = tarif.service ?? 0;

  const thStyle: React.CSSProperties = { padding: "10px 12px", background: BLUE, color: WHITE, textAlign: "center", fontSize: 13, fontWeight: 600 };
  const tdStyle: React.CSSProperties = { padding: "10px 12px", textAlign: "center", fontSize: 14, borderBottom: `1px solid ${BORDER}` };
  const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 700, fontSize: 18, color: BLUE, background: "#f8f9fc", padding: "14px 12px" };
  const tdLabel: React.CSSProperties = { ...tdStyle, textAlign: "left", color: "#666", fontWeight: 500 };

  return (
    <div>
      <div style={headerStyle}>
        <button onClick={onBack} style={btnStyle(BLUE)}>Retour</button>
        <h2 style={{ color: BLUE, margin: 0 }}>{title}</h2>
        <div />
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: BLUE, marginTop: 0, marginBottom: 4 }}>{tarif.itineraire}</h3>
        <p style={{ color: "#888", margin: "0 0 4px", fontSize: 14 }}>
          {tarif.depart} → {tarif.arrivee} | {tarif.kilometres ?? "?"} km | {tarif.temps ?? "?"} min
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 160 }}>Decomposition</th>
              <th style={thStyle}>E</th>
              <th style={thStyle}>V</th>
              <th style={thStyle}>S</th>
              <th style={thStyle}>Prestige</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdLabel}>Prix voiture</td>
              {pvKeys.map((k) => <td key={k} style={tdStyle}>{tarif[k] ?? "-"} &euro;</td>)}
            </tr>
            <tr>
              <td style={tdLabel}>Service</td>
              {pvKeys.map((k) => <td key={k} style={tdStyle}>{serviceVal} &euro;</td>)}
            </tr>
            <tr>
              <td style={tdLabel}>Peages (x2)</td>
              {pvKeys.map((k) => <td key={k} style={tdStyle}>{peages2} &euro;</td>)}
            </tr>
            <tr>
              <td style={tdLabel}>Repas</td>
              {pvKeys.map((k) => <td key={k} style={tdStyle}>{repas} &euro;</td>)}
            </tr>
            <tr>
              <td style={tdLabel}>Frais divers</td>
              {pvKeys.map((k) => <td key={k} style={tdStyle}>{fraisVal} &euro;</td>)}
            </tr>
            <tr>
              <td style={{ ...tdLabel, fontWeight: 700, color: BLUE, fontSize: 15, borderTop: `2px solid ${BLUE}` }}>TOTAL {title.replace("Tarifs ", "")}</td>
              {fields.map((f) => <td key={f.key} style={{ ...tdBold, borderTop: `2px solid ${BLUE}` }}>{tarif[f.key] != null ? `${tarif[f.key]} €` : "-"}</td>)}
            </tr>
            <tr>
              <td style={{ ...tdLabel, fontWeight: 600, color: RED, fontSize: 13, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>Prix d'achat SST</td>
              {(["sst_e", "sst_v", "sst_s", "sst_prestige"] as const).map((k) => (
                <td key={k} style={{ ...tdStyle, fontWeight: 600, color: RED, fontSize: 15, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  {tarif[k] != null ? `${tarif[k]} €` : "-"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-view types ──────────────────────────────────────────────────────────
type SubView =
  | { type: "list" }
  | { type: "detail"; tarif: TarifProvince }
  | { type: "edit"; tarif: TarifProvince | null } // null = new
  | { type: "grid"; tarif: TarifProvince; gridType: string };

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TarifsProvince({ readOnly = false, isAdmin = false }: { readOnly?: boolean; isAdmin?: boolean }) {
  const [tarifs, setTarifs] = useState<TarifProvince[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [subView, setSubView] = useState<SubView>({ type: "list" });
  const [saving, setSaving] = useState(false);

  const loadTarifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTarifs(undefined, sortAsc);
      setTarifs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortAsc]);

  useEffect(() => {
    loadTarifs();
  }, [loadTarifs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tarifs;
    const s = search.toLowerCase();
    return tarifs.filter(
      (t) =>
        t.itineraire?.toLowerCase().includes(s) ||
        t.depart?.toLowerCase().includes(s) ||
        t.arrivee?.toLowerCase().includes(s)
    );
  }, [tarifs, search]);

  // ── List View ──
  if (subView.type === "list") {
    return (
      <div style={{ padding: 0 }}>
        <div style={headerStyle}>
          <h2 style={{ color: BLUE, margin: 0, fontSize: 22 }}>Tarifs Province Sud Est CRA</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!readOnly && (
              <button
                onClick={() => setSubView({ type: "edit", tarif: null })}
                style={btnStyle(BLUE)}
              >
                + Nouveau tarif
              </button>
            )}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={btnStyle("#555")}
              title="Inverser le tri"
            >
              {sortAsc ? "A→Z" : "Z→A"}
            </button>
            <button onClick={loadTarifs} style={btnStyle("#555")} title="Rafraichir">
              Refresh
            </button>
            <button
              onClick={() => window.open("https://www.google.com/maps/", "_blank")}
              style={btnStyle("#4285f4")}
            >
              Google Maps
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Rechercher par itineraire, depart ou arrivee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 500, fontSize: 15, padding: "10px 14px" }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Chargement...</div>
        ) : (
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>
              {filtered.length} itineraire{filtered.length > 1 ? "s" : ""} trouves
            </div>
            <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
              {filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSubView({ type: "detail", tarif: t })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f1f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: BLUE, fontSize: 14 }}>{t.itineraire}</div>
                  </div>
                  <span style={{ color: "#bbb", fontSize: 18 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, color: RED, fontSize: 13, fontWeight: 600 }}>
          Made by Laurent Euzet
        </div>
      </div>
    );
  }

  // ── Detail View ──
  if (subView.type === "detail") {
    const t = subView.tarif;
    const gridButtons: { label: string; gridType: string }[] = [
      { label: "Public", gridType: "public" },
      { label: "Corporate", gridType: "corpo" },
      { label: "Corporate remise", gridType: "corpo_rem" },
      { label: "Interco", gridType: "interco" },
      { label: "Hotel", gridType: "hotel" },
    ];

    return (
      <div>
        <div style={headerStyle}>
          <button onClick={() => setSubView({ type: "list" })} style={btnStyle(BLUE)}>
            Retour
          </button>
          <h2 style={{ color: BLUE, margin: 0 }}>Detail du tarif</h2>
          {!readOnly && (
            <button onClick={() => setSubView({ type: "edit", tarif: t })} style={btnStyle("#555")}>
              Modifier
            </button>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: BLUE, marginTop: 0 }}>{t.itineraire}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <Field label="Depart" value={t.depart} />
            <Field label="Arrivee" value={t.arrivee} />
            <Field label="Kilometres" value={t.kilometres} />
            <Field label="Temps (min)" value={t.temps} />
            <Field label="Peages" value={`${t.peages ?? 0} €`} />
            <Field label="Repas" value={`${t.repas ?? 0} €`} />
            <Field label="Frais" value={`${t.frais ?? 0} €`} />
            <Field label="Service" value={`${t.service ?? 0} €`} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {gridButtons.map((gb) => (
              <button
                key={gb.gridType}
                onClick={() => setSubView({ type: "grid", tarif: t, gridType: gb.gridType })}
                style={{
                  ...btnStyle(BLUE),
                  flex: "1 1 140px",
                  textAlign: "center",
                }}
              >
                {gb.label}
              </button>
            ))}
          </div>

          {isAdmin && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <button
                onClick={async () => {
                  if (!confirm("Supprimer ce tarif ?")) return;
                  await deleteTarif(t.id);
                  await loadTarifs();
                  setSubView({ type: "list" });
                }}
                style={{ ...btnStyle("#dc3545"), fontSize: 13 }}
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Grid Views ──
  if (subView.type === "grid") {
    const t = subView.tarif;
    const grids: Record<string, { title: string; fields: { label: string; key: keyof TarifProvince }[] }> = {
      public: {
        title: "Tarifs Public",
        fields: [
          { label: "E", key: "public_e" },
          { label: "V", key: "public_v" },
          { label: "S", key: "public_s" },
          { label: "Prestige", key: "public_prestige" },
        ],
      },
      corpo: {
        title: "Tarifs Corporate",
        fields: [
          { label: "E", key: "corpo_e" },
          { label: "V", key: "corpo_v" },
          { label: "S", key: "corpo_s" },
          { label: "Prestige", key: "corpo_prestige" },
        ],
      },
      corpo_rem: {
        title: "Tarifs Corporate Remise",
        fields: [
          { label: "E", key: "corpo_rem_e" },
          { label: "V", key: "corpo_rem_v" },
          { label: "S", key: "corpo_rem_s" },
          { label: "Prestige", key: "corpo_rem_prestige" },
        ],
      },
      interco: {
        title: "Tarifs Interco",
        fields: [
          { label: "E", key: "interco_e" },
          { label: "V", key: "interco_v" },
          { label: "S", key: "interco_s" },
          { label: "Prestige", key: "interco_prestige" },
        ],
      },
      hotel: {
        title: "Tarifs Hotel",
        fields: [
          { label: "E", key: "hotel_e" },
          { label: "V", key: "hotel_v" },
          { label: "S", key: "hotel_s" },
          { label: "Prestige", key: "hotel_prestige" },
        ],
      },
    };
    const g = grids[subView.gridType];
    if (!g) return null;

    return (
      <PriceGrid
        tarif={t}
        title={g.title}
        fields={g.fields}
        onBack={() => setSubView({ type: "detail", tarif: t })}
      />
    );
  }

  // ── Edit / New View ──
  if (subView.type === "edit") {
    return (
      <EditForm
        tarif={subView.tarif}
        onSave={async (data) => {
          setSaving(true);
          try {
            if (subView.tarif) {
              const updated = await updateTarif(subView.tarif.id, data);
              await loadTarifs();
              setSubView({ type: "detail", tarif: updated });
            } else {
              const created = await createTarif(data as TarifProvinceInput);
              await loadTarifs();
              setSubView({ type: "detail", tarif: created });
            }
          } catch (err) {
            alert(err instanceof Error ? err.message : "Erreur");
          } finally {
            setSaving(false);
          }
        }}
        onCancel={() =>
          setSubView(subView.tarif ? { type: "detail", tarif: subView.tarif } : { type: "list" })
        }
        saving={saving}
      />
    );
  }

  return null;
}

// ─── Field display ───────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{value ?? "-"}</div>
    </div>
  );
}

// ─── Edit Form ───────────────────────────────────────────────────────────────
function EditForm({
  tarif,
  onSave,
  onCancel,
  saving,
}: {
  tarif: TarifProvince | null;
  onSave: (data: Partial<TarifProvinceInput>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [depart, setDepart] = useState(tarif?.depart ?? "");
  const [arrivee, setArrivee] = useState(tarif?.arrivee ?? "");
  const itineraire = depart && arrivee ? `${depart} - ${arrivee}` : tarif?.itineraire ?? "";
  const [kilometres, setKilometres] = useState(String(tarif?.kilometres ?? ""));
  const [temps, setTemps] = useState(String(tarif?.temps ?? ""));
  const [peages, setPeages] = useState(String(tarif?.peages ?? "0"));
  const [repasManual, setRepasManual] = useState<string>(tarif?.repas != null ? String(tarif.repas) : "");
  const [fraisManual, setFraisManual] = useState<string>(tarif?.frais != null ? String(tarif.frais) : "");
  const [serviceManual, setServiceManual] = useState<string>(tarif?.service != null ? String(tarif.service) : "");
  const [publicManual, setPublicManual] = useState<{ e: string; v: string; s: string; prestige: string }>({
    e: tarif?.public_e != null ? String(tarif.public_e) : "",
    v: tarif?.public_v != null ? String(tarif.public_v) : "",
    s: tarif?.public_s != null ? String(tarif.public_s) : "",
    prestige: tarif?.public_prestige != null ? String(tarif.public_prestige) : "",
  });

  const autoRepas = num(temps) >= 150 ? 23 : 0;
  const repas = repasManual !== "" ? repasManual : String(autoRepas);
  const autoFrais = num(temps) >= 300 ? 160 : 0;
  const frais = fraisManual !== "" ? fraisManual : String(autoFrais);

  const publicOverrides = {
    e: publicManual.e !== "" ? num(publicManual.e) : undefined,
    v: publicManual.v !== "" ? num(publicManual.v) : undefined,
    s: publicManual.s !== "" ? num(publicManual.s) : undefined,
    prestige: publicManual.prestige !== "" ? num(publicManual.prestige) : undefined,
  };

  const computed = useMemo(
    () => computeAll(num(kilometres), num(temps), num(peages), num(repas), num(frais), {
      serviceOverride: serviceManual !== "" ? num(serviceManual) : undefined,
      publicOverrides,
    }),
    [kilometres, temps, peages, repas, frais, serviceManual, publicManual.e, publicManual.v, publicManual.s, publicManual.prestige]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depart.trim() || !arrivee.trim()) return;
    const autoItineraire = `${depart.trim()} - ${arrivee.trim()}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { defaultPublic, defaultService, ...tarifData } = computed;
    onSave({
      itineraire: autoItineraire,
      depart: depart.trim(),
      arrivee: arrivee.trim(),
      kilometres: num(kilometres) || null,
      temps: num(temps) || null,
      peages: num(peages),
      repas: num(repas) || 0,
      frais: num(frais),
      ...tarifData,
    });
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    marginBottom: 4,
    display: "block",
  };

  const readOnlyInput: React.CSSProperties = {
    ...inputStyle,
    background: "#f0f1f5",
    fontWeight: 600,
    color: BLUE,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={headerStyle}>
        <button type="button" onClick={onCancel} style={btnStyle("#555")}>
          Annuler
        </button>
        <h2 style={{ color: BLUE, margin: 0 }}>
          {tarif ? "Modifier le tarif" : "Nouveau tarif"}
        </h2>
        <button type="submit" disabled={saving || !depart.trim() || !arrivee.trim()} style={btnStyle(BLUE)}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
        Completer les cellules avec un (*)
      </div>

      {/* ── Informations de base ── */}
      <div style={cardStyle}>
        <h4 style={{ color: BLUE, marginTop: 0, marginBottom: 16 }}>Informations de base</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <label style={labelStyle}>Depart *</label>
            <input style={inputStyle} value={depart} onChange={(e) => setDepart(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Arrivee *</label>
            <input style={inputStyle} value={arrivee} onChange={(e) => setArrivee(e.target.value)} required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Itineraire (auto)</label>
            <input style={{ ...inputStyle, background: "#f0f1f5", fontWeight: 600, color: BLUE }} readOnly value={itineraire} />
          </div>
          <div>
            <label style={labelStyle}>Kilometres *</label>
            <input style={inputStyle} type="number" value={kilometres} onChange={(e) => setKilometres(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Temps (min) *</label>
            <input style={inputStyle} type="number" value={temps} onChange={(e) => setTemps(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Peages</label>
            <input style={inputStyle} type="number" value={peages} onChange={(e) => setPeages(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Repas <span style={{ fontWeight: 400, color: "#999" }}>(auto: {autoRepas})</span></label>
            <input
              style={{ ...inputStyle, color: repasManual !== "" ? BLUE : "#999", fontWeight: repasManual !== "" ? 600 : 400 }}
              type="number"
              value={repas}
              onChange={(e) => setRepasManual(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Frais divers <span style={{ fontWeight: 400, color: "#999" }}>(auto: {autoFrais})</span></label>
            <input
              style={{ ...inputStyle, color: fraisManual !== "" ? BLUE : "#999", fontWeight: fraisManual !== "" ? 600 : 400 }}
              type="number"
              value={frais}
              onChange={(e) => setFraisManual(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Service + Prix voiture ── */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h4 style={{ color: BLUE, marginTop: 0, marginBottom: 8 }}>Service</h4>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, width: 120, fontWeight: 600, color: serviceManual !== "" ? BLUE : "#999" }}
                type="number"
                value={serviceManual !== "" ? serviceManual : (kilometres ? computed.defaultService : "")}
                onChange={(e) => setServiceManual(e.target.value)}
                placeholder="auto"
              />
              {serviceManual !== "" && (
                <button
                  type="button"
                  onClick={() => setServiceManual("")}
                  style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                >
                  Reset auto ({computed.defaultService})
                </button>
              )}
              {serviceManual === "" && <span style={{ fontSize: 12, color: "#999" }}>= 11% Public E (modifiable)</span>}
            </div>
          </div>
        </div>
        <h4 style={{ color: BLUE, marginTop: 0, marginBottom: 12 }}>Prix voiture seul</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.prix_voiture_e : ""} /></div>
          <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.prix_voiture_v : ""} /></div>
          <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.prix_voiture_s : ""} /></div>
          <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.prix_voiture_prestige : ""} /></div>
        </div>
      </div>

      {/* ── Tarifs de vente ── */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: BLUE, fontSize: 16, marginBottom: 12, borderBottom: `2px solid ${BLUE}`, paddingBottom: 8 }}>
          Tarifs de vente
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
          {/* Public */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${BLUE}` }}>
            <h4 style={{ color: BLUE, marginTop: 0, marginBottom: 12 }}>Public <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>(modifiable)</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {(["e", "v", "s", "prestige"] as const).map((k) => (
                <div key={k}>
                  <label style={labelStyle}>{k === "prestige" ? "Prestige" : k.toUpperCase()}</label>
                  <input
                    style={{ ...inputStyle, fontWeight: 600, color: publicManual[k] !== "" ? BLUE : "#999" }}
                    type="number"
                    value={publicManual[k] !== "" ? publicManual[k] : (kilometres ? computed.defaultPublic[k] : "")}
                    onChange={(e) => setPublicManual((prev) => ({ ...prev, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hotel */}
          <div style={{ ...cardStyle, borderLeft: `4px solid #e67e22` }}>
            <h4 style={{ color: "#e67e22", marginTop: 0, marginBottom: 12 }}>Hotel <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>= Public / 0.9</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.hotel_e : ""} /></div>
              <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.hotel_v : ""} /></div>
              <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.hotel_s : ""} /></div>
              <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.hotel_prestige : ""} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tarifs corporate ── */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: "#27ae60", fontSize: 16, marginBottom: 12, borderBottom: `2px solid #27ae60`, paddingBottom: 8 }}>
          Tarifs corporate
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
          {/* Corporate */}
          <div style={{ ...cardStyle, borderLeft: `4px solid #2ecc71` }}>
            <h4 style={{ color: "#27ae60", marginTop: 0, marginBottom: 12 }}>Corporate <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>= Prix voit. / 1.1 + extras</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_e : ""} /></div>
              <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_v : ""} /></div>
              <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_s : ""} /></div>
              <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_prestige : ""} /></div>
            </div>
          </div>

          {/* Corporate Remise */}
          <div style={{ ...cardStyle, borderLeft: `4px solid #3498db` }}>
            <h4 style={{ color: "#2980b9", marginTop: 0, marginBottom: 12 }}>Corporate Remise <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>= Prix voit. / 1.2 + extras</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_rem_e : ""} /></div>
              <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_rem_v : ""} /></div>
              <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_rem_s : ""} /></div>
              <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.corpo_rem_prestige : ""} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tarifs réseau & sous-traitance ── */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: "#8e44ad", fontSize: 16, marginBottom: 12, borderBottom: `2px solid #8e44ad`, paddingBottom: 8 }}>
          Tarifs réseau & sous-traitance
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
          {/* Interco */}
          <div style={{ ...cardStyle, borderLeft: `4px solid #9b59b6` }}>
            <h4 style={{ color: "#8e44ad", marginTop: 0, marginBottom: 12 }}>Interco <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>= Prix voit. / 1.25 + extras</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.interco_e : ""} /></div>
              <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.interco_v : ""} /></div>
              <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.interco_s : ""} /></div>
              <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.interco_prestige : ""} /></div>
            </div>
          </div>

          {/* SST */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${RED}` }}>
            <h4 style={{ color: RED, marginTop: 0, marginBottom: 12 }}>SST <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>= Interco x 0.75</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div><label style={labelStyle}>E</label><input style={readOnlyInput} readOnly value={kilometres ? computed.sst_e : ""} /></div>
              <div><label style={labelStyle}>V</label><input style={readOnlyInput} readOnly value={kilometres ? computed.sst_v : ""} /></div>
              <div><label style={labelStyle}>S</label><input style={readOnlyInput} readOnly value={kilometres ? computed.sst_s : ""} /></div>
              <div><label style={labelStyle}>Prestige</label><input style={readOnlyInput} readOnly value={kilometres ? computed.sst_prestige : ""} /></div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
