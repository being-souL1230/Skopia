export function scoreTone(s: number) {
  return s >= 80 ? "var(--color-sage)" : s >= 60 ? "var(--color-brass)" : "var(--color-ochre)";
}

export function Ring({ value, size = 160, stroke = 3, label, sub, animate = true }: { value: number; size?: number; stroke?: number; label?: string; sub?: string; animate?: boolean }) {
  const r = (size - stroke * 2 - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  const angle = (value / 100) * 360 - 90;
  const tx = size / 2 + r * Math.cos((angle * Math.PI) / 180);
  const ty = size / 2 + r * Math.sin((angle * Math.PI) / 180);
  const big = size >= 120;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={label ? `${label}: ${value}/100` : `${value}/100`}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-rule)" strokeWidth={1} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreTone(value)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} className={animate ? "ring-anim" : ""} />
        {big && <polygon points={`${tx},${ty - 6} ${tx - 5},${ty + 4} ${tx + 5},${ty + 4}`} fill="var(--color-ink)" transform={`rotate(${angle + 90} ${tx} ${ty})`} />}
      </svg>
      <div className="text-center leading-none">
        <div className={big ? "text-5xl font-extrabold tracking-tight" : size >= 64 ? "text-xl font-bold" : "text-sm font-bold"}>{value}</div>
        {sub && <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-mute">{sub}</div>}
      </div>
    </div>
  );
}

const SEV: Record<string, { color: string; label: string }> = {
  critical: { color: "var(--color-ink)", label: "Critical" },
  high: { color: "var(--color-ochre)", label: "High" },
  medium: { color: "var(--color-brass)", label: "Medium" },
  low: { color: "var(--color-faint)", label: "Low" },
  info: { color: "var(--color-sage)", label: "Info" },
};

export function SevMark({ sev, withLabel = false }: { sev: string; withLabel?: boolean }) {
  const s = SEV[sev] || SEV.info;
  return (
    <span className="inline-flex items-center gap-1.5" title={s.label}>
      {sev === "info" ? <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: s.color }} /> :
        sev === "critical" ? <span className="relative inline-block"><span className="tri" style={{ color: s.color }} /><span className="absolute -right-2 top-0 text-[9px] font-bold">!</span></span> :
        <span className="tri" style={{ color: s.color }} />}
      {withLabel && <span className={`text-[11px] uppercase tracking-[0.14em] ${sev === "critical" ? "font-bold" : "text-mute"}`}>{s.label}</span>}
    </span>
  );
}
