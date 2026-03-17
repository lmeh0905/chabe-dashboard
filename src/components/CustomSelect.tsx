import { useState, useRef, useEffect, useCallback } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  color?: string;
  bg?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  compact?: boolean;
  statusStyle?: boolean;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  countLabel?: string;
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner…",
  disabled = false,
  searchable,
  searchPlaceholder = "Rechercher…",
  compact = false,
  statusStyle = false,
  style,
  triggerStyle,
  dropdownStyle,
  countLabel,
  renderOption,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showSearch = searchable ?? options.length > 8;

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = search
    ? options.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
          (o.badge && o.badge.toLowerCase().includes(q))
        );
      })
    : options;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      if (!prev) {
        setSearch("");
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDropUp(rect.bottom + 200 > window.innerHeight);
        }
      }
      return !prev;
    });
  }, [disabled]);

  const handleSelect = useCallback(
    (val: string | number) => {
      onChange(val);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const py = compact ? 6 : 10;
  const px = compact ? 8 : 12;
  const fs = compact ? 12 : 13;

  // Status-style trigger colors
  const statusBg = statusStyle && selected?.bg ? selected.bg : "#f5f5f7";
  const statusColor = statusStyle && selected?.color ? selected.color : undefined;

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: "100%",
          background: statusBg,
          border: open ? "1.5px solid #007aff" : "1.5px solid transparent",
          borderRadius: compact ? 8 : 10,
          padding: `${py}px ${px}px`,
          fontSize: fs,
          fontFamily: "inherit",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          boxSizing: "border-box" as const,
          transition: "border-color 0.15s",
          opacity: disabled ? 0.5 : 1,
          ...triggerStyle,
        }}
      >
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {selected.badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: selected.badgeBg || "rgba(0,122,255,0.1)",
                  color: selected.badgeColor || "#007aff",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {selected.badge}
              </span>
            )}
            <span
              style={{
                fontSize: fs,
                fontWeight: statusStyle ? 600 : 500,
                color: statusColor || "#1d1d1f",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selected.label}
            </span>
          </div>
        ) : (
          <span style={{ color: "#86868b", fontSize: fs }}>{placeholder}</span>
        )}
        <span
          style={{
            color: "#86868b",
            fontSize: 9,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            ...(dropUp ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            left: 0,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            zIndex: 50,
            border: "1px solid rgba(0,0,0,0.06)",
            overflow: "hidden",
            minWidth: 160,
            ...dropdownStyle,
          }}
        >
          {/* Search */}
          {showSearch && (
            <div style={{ padding: "10px 10px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#f5f5f7",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <span style={{ fontSize: 13, color: "#86868b" }}>🔍</span>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    fontFamily: "inherit",
                    color: "#1d1d1f",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#86868b",
                      fontSize: 12,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Count */}
          {showSearch && (
            <div
              style={{
                padding: "0 14px 6px",
                fontSize: 10,
                color: "#86868b",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {filtered.length} {countLabel || `résultat${filtered.length !== 1 ? "s" : ""}`}
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: "auto", paddingBottom: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: 12, color: "#86868b", textAlign: "center" }}>
                Aucun résultat
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                if (renderOption) {
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        background: isSelected ? "rgba(0,122,255,0.06)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        padding: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f5f5f7";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      {renderOption(opt, isSelected)}
                    </button>
                  );
                }

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: `${compact ? 7 : 9}px 14px`,
                      background: isSelected ? "rgba(0,122,255,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f5f5f7";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: opt.badgeBg || "rgba(0,122,255,0.1)",
                          color: opt.badgeColor || "#007aff",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {opt.bg ? (
                      <span
                        style={{
                          fontSize: compact ? 11 : 12,
                          fontWeight: 600,
                          color: opt.color || "#1d1d1f",
                          background: opt.bg,
                          padding: "2px 10px",
                          borderRadius: 6,
                          flex: 1,
                        }}
                      >
                        {opt.label}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: compact ? 11 : 12,
                          color: opt.color || "#1d1d1f",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt.label}
                      </span>
                    )}
                    {opt.sublabel && (
                      <span style={{ fontSize: 10, color: "#86868b", flexShrink: 0, whiteSpace: "nowrap" }}>
                        {opt.sublabel}
                      </span>
                    )}
                    {isSelected && <span style={{ color: "#007aff", fontSize: 12, flexShrink: 0 }}>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
