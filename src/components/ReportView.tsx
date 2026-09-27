"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Report, Finding } from "@/lib/analyzer";
import { Ring, SevMark } from "./Ring";
import Analyzer from "./Analyzer";

type Tab = "findings" | "dependencies" | "readme" | "environment";

export default function ReportView({ scanId, report, reviewed: initial, project, createdAt, prevScore }: {
  scanId: number; report: Report & { meta?: { branch?: string; pushed_at?: string } }; reviewed: string[];
  project: { id: number; name: string; source: string; repoUrl: string | null }; createdAt: string; prevScore: number | null;
}) {
  const [tab, setTab] = useState<Tab>("findings");
  const [open, setOpen] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<string[]>(initial);
  const [showCalc, setShowCalc] = useState(false);
  const [showRescan, setShowRescan] = useState(false);
  const [sevFilter, setSevFilter] = useState("all");
  const [hideReviewed, setHideReviewed] = useState(false);
  const c = report.categories;

  async function toggleReviewed(key: string) {
    const on = !reviewed.includes(key);
    const prev = reviewed;
    setReviewed(on ? [...reviewed, key] : reviewed.filter((k) => k !== key)); // optimistic
    const r = await fetch(`/api/scans/${scanId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, reviewed: on }) });
    if (!r.ok) setReviewed(prev);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `skopia-${project.name}-${scanId}.json`; a.click();
  }

  const findings = report.findings.filter((f) => (sevFilter === "all" || f.severity === sevFilter) && (!hideReviewed || !reviewed.includes(f.key)));
  const counts = useMemo(() => Object.fromEntries(["critical", "high", "medium", "low", "info"].map((s) => [s, report.findings.filter((f) => f.severity === s).length])), [report]);

  return (
    <div className="fadein">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <Link href={`/app/projects/${project.id}`} className="text-xs uppercase tracking-[0.2em] text-mute hover:text-ink">◁ {project.name}</Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Health report</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-mute">
            <span>{report.project.type}</span>
            <span>·</span>
            <span>{report.project.files_scanned} files</span>
            {report.project.loc_total ? <span>· {report.project.loc_total.toLocaleString()} LOC</span> : null}
            {report.project.tests_detected ? <span className="text-sage">· ✓ Tests</span> : null}
            {report.project.ci_cd ? <span className="text-sage">· ✓ CI/CD</span> : null}
            {report.project.docker_detected ? <span>· Docker</span> : null}
            {report.meta?.branch && <span>· {report.meta.branch}</span>}
            {report.meta?.pushed_at && <span>· pushed {new Date(report.meta.pushed_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm print:hidden">
          <button onClick={exportJson} className="text-mute hover:text-ink">JSON ↓</button>
          <button onClick={() => window.print()} className="text-mute hover:text-ink">Print</button>
          <button onClick={() => setShowRescan((v) => !v)} className="link-act">Rescan <span className="tri-r" /></button>
        </div>
      </header>

      {showRescan && (
        <section className="border-b border-rule py-8 fadein">
          <p className="mb-5 text-center text-sm text-mute">Fixed something? Upload the updated project{project.source === "github" ? " or rescan the repository" : ""}.</p>
          <Analyzer projectId={project.id} mode={project.source === "github" ? "github" : "zip"} repoUrl={project.repoUrl} compact />
        </section>
      )}

      <section className="grid items-center gap-10 py-8 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center">
          <Ring value={report.score} size={180} sub="health / 100" />
          {prevScore !== null && <span className="mt-2 font-mono text-xs text-mute">{report.score >= prevScore ? "▲" : "▼"} {Math.abs(report.score - prevScore)} vs previous scan</span>}
        </div>
        <div>
          <div className="flex flex-wrap gap-8">
            {([["Dependencies", c.dependencies, "40%"], ["Documentation", c.documentation, "35%"], ["Hygiene", c.hygiene, "25%"]] as const).map(([l, v, w]) => (
              <div key={l} className="flex items-center gap-3"><Ring value={v} size={72} stroke={2.5} /><div><div className="text-sm font-bold">{l}</div><div className="font-mono text-xs text-mute">weight {w}</div></div></div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-rule pt-4 text-xs text-mute">
            {Object.entries(counts).map(([s, n]) => <span key={s} className="flex items-center gap-1.5"><SevMark sev={s} /> {n} {s}</span>)}
            <button onClick={() => setShowCalc((v) => !v)} className="ml-auto underline decoration-rule underline-offset-4 hover:text-ink" aria-expanded={showCalc}>How this score was calculated</button>
          </div>
          {showCalc && (
            <div className="mt-4 fadein font-mono text-xs leading-relaxed">
              <p>Each category starts at 100. Deductions: critical −30 · high −20 · medium −10 · low −5 · info 0. Repeated rules are capped (DEP-001 ≤40, ENV-001 ≤20).</p>
              <ul className="mt-2 text-mute">{report.deductions.map((d) => <li key={d.category + d.rule_id}>{d.category.padEnd(14, " ")} {d.rule_id} −{d.points}</li>)}{!report.deductions.length && <li>no deductions</li>}</ul>
              <p className="mt-2">Overall = ({c.dependencies} × 0.40) + ({c.documentation} × 0.35) + ({c.hygiene} × 0.25) = {(c.dependencies * 0.4 + c.documentation * 0.35 + c.hygiene * 0.25).toFixed(1)} → <b>{report.score}</b></p>
            </div>
          )}
        </div>
      </section>

      {report.errors.length > 0 && <div className="mb-6 flex items-start gap-2 border-y border-rule py-3 text-sm"><span className="tri mt-1 text-ochre" /><div><b>Unable to analyze part of the project.</b> {report.errors.join("; ")}</div></div>}

      <nav className="flex gap-6 border-b border-rule text-sm print:hidden" role="tablist">
        {(["findings", "dependencies", "readme", "environment"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative pb-3 capitalize ${tab === t ? "font-bold" : "text-mute hover:text-ink"}`}>
            {t === "readme" ? "README" : t}
            {tab === t && <span className="tri absolute -bottom-px left-1/2 -translate-x-1/2 text-brass" style={{ transform: "translateX(-50%) scale(.7)" }} />}
          </button>
        ))}
      </nav>

      {tab === "findings" && (
        <section className="pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
            {["all", "critical", "high", "medium", "low", "info"].map((s) => (
              <button key={s} onClick={() => setSevFilter(s)} className={`capitalize ${sevFilter === s ? "font-bold text-ink underline decoration-brass underline-offset-4" : "text-mute hover:text-ink"}`}>{s}</button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-mute"><input type="checkbox" checked={hideReviewed} onChange={(e) => setHideReviewed(e.target.checked)} className="accent-[#b59b62]" /> hide reviewed</label>
          </div>
          {findings.length === 0 ? <p className="py-10 text-center text-sm text-mute">◯ No findings match this filter.</p> : (
            <ul>{findings.map((f) => <FindingRow key={f.key} f={f} open={open === f.key} onToggle={() => setOpen(open === f.key ? null : f.key)} reviewed={reviewed.includes(f.key)} onReview={() => toggleReviewed(f.key)} onRescan={() => { setShowRescan(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />)}</ul>
          )}
        </section>
      )}
      {tab === "dependencies" && <DependencyView report={report} />}
      {tab === "readme" && <ReadmeView report={report} />}
      {tab === "environment" && <EnvView report={report} />}
    </div>
  );
}

function FindingRow({ f, open, onToggle, reviewed, onReview, onRescan }: { f: Finding; open: boolean; onToggle: () => void; reviewed: boolean; onReview: () => void; onRescan: () => void }) {
  const loc = f.line ? `${f.path}:${f.line}` : f.path;
  return (
    <li className={`border-b border-rule ${reviewed ? "opacity-50" : ""}`}>
      <button onClick={onToggle} aria-expanded={open} className="group grid w-full grid-cols-[18px_76px_1fr_auto] items-center gap-3 py-3 text-left">
        <SevMark sev={f.severity} />
        <span className="font-mono text-xs text-mute">{f.rule_id}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold group-hover:text-brass">{f.title} {reviewed && <span className="text-xs font-normal text-sage">◯ reviewed</span>}</span>
          <span className="block truncate text-xs text-mute">{f.fix}</span>
        </span>
        <span className="hidden max-w-[200px] truncate font-mono text-xs text-mute sm:block" title={loc}>{loc}</span>
      </button>
      {open && (
        <div className="fadein grid gap-x-10 gap-y-4 pb-5 pl-[30px] text-sm md:grid-cols-2">
          <Detail label="Why flagged">{f.why}</Detail>
          <Detail label="Evidence"><code className="font-mono text-xs">{f.evidence}</code></Detail>
          <Detail label="Location"><code className="break-all font-mono text-xs">{loc}</code></Detail>
          <Detail label="Impact">{f.impact}</Detail>
          <Detail label="Suggested fix">{f.fix}</Detail>
          <div className="flex items-end gap-6">
            <button onClick={onReview} className="link-act text-sm"><span className={`inline-block h-3.5 w-3.5 rounded-full border border-ink ${reviewed ? "bg-ink" : ""}`} />{reviewed ? "Reviewed" : "Mark reviewed"}</button>
            <button onClick={onRescan} className="link-act text-sm">Rescan <span className="tri-r" /></button>
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-mute"><span className="tri-r text-brass" />{label}</div><div>{children}</div></div>;
}

function DependencyView({ report }: { report: Report }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const deps = report.dependencies;
  const used = deps.filter((d) => d.status === "used").length;
  const unused = deps.filter((d) => d.status === "possibly_unused").length;
  const unknown = deps.length - used - unused;
  const list = deps.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()) && (st === "all" || d.status === st));
  const R = 44, C = 2 * Math.PI * R;
  const seg = (n: number) => (deps.length ? (n / deps.length) * C : 0);
  if (!deps.length) return <p className="py-10 text-center text-sm text-mute">◯ No declared dependencies found{report.project.manifests.length ? "" : " (no supported manifest detected)"}.</p>;
  return (
    <section className="grid gap-10 pt-6 md:grid-cols-[180px_1fr]">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-rule)" strokeWidth="1" />
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-sage)" strokeWidth="4" strokeDasharray={`${seg(used)} ${C}`} />
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-ochre)" strokeWidth="4" strokeDasharray={`${seg(unused)} ${C}`} strokeDashoffset={-seg(used)} />
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-faint)" strokeWidth="4" strokeDasharray={`${seg(unknown)} ${C}`} strokeDashoffset={-seg(used) - seg(unused)} />
        </svg>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sage" />{used} used</div>
          <div className="flex items-center gap-2"><span className="tri text-ochre" style={{ transform: "scale(.7)" }} />{unused} possibly unused</div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full border border-faint" />{unknown} unknown / tooling</div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-5 text-xs">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter packages…" className="rounded-lg border border-rule bg-canvas/50 px-3 py-1 max-w-[190px] font-mono text-xs text-ink outline-none transition-all placeholder:text-mute focus:border-brass focus:ring-1 focus:ring-brass" aria-label="Filter packages" />
          {[["all", "all"], ["used", "used"], ["possibly_unused", "possibly unused"], ["unknown", "unknown"]].map(([k, l]) => (
            <button key={k} onClick={() => setSt(k)} className={st === k ? "font-bold underline decoration-brass underline-offset-4" : "text-mute hover:text-ink"}>{l}</button>
          ))}
        </div>
        <ul>
          {list.map((d) => (
            <li key={d.ecosystem + d.name + d.manifest} className="grid grid-cols-[14px_1fr_auto] items-center gap-3 border-b border-rule py-2 text-sm">
              {d.status === "used" ? <span className="h-2 w-2 rounded-full bg-sage" title="Used" /> : d.status === "possibly_unused" ? <span className="tri text-ochre" style={{ transform: "scale(.7)" }} title="Possibly unused" /> : <span className="h-2 w-2 rounded-full border border-faint" title="Unknown" />}
              <span className="min-w-0 truncate"><span className="font-mono">{d.name}</span> <span className="text-xs text-mute">{d.ecosystem}{d.dev ? " · dev" : ""}</span></span>
              <span className="max-w-[260px] truncate font-mono text-xs text-mute" title={d.usedIn || d.manifest}>{d.usedIn || `declared in ${d.manifest}`}</span>
            </li>
          ))}
          {!list.length && <li className="py-6 text-center text-sm text-mute">No packages match.</li>}
        </ul>
      </div>
    </section>
  );
}

function ReadmeView({ report }: { report: Report }) {
  const [open, setOpen] = useState<string | null>(null);
  const cmds = report.readme.commands_verified || [];
  const tables = report.readme.tables_count || 0;
  const broken = report.readme.broken_links || [];

  return (
    <div className="space-y-8 pt-6">
      <section className="grid gap-10 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center">
          <Ring value={report.readme.score} size={140} sub="complete" />
          <p className="mt-2 font-mono text-xs text-mute">{report.project.readme || "no README"}</p>
          <div className="mt-3 flex flex-col gap-1 text-[11px] font-mono text-mute text-center">
            {tables > 0 && <span>▦ {tables} table{tables > 1 ? "s" : ""} parsed</span>}
            {cmds.length > 0 && <span>$ {cmds.length} command{cmds.length > 1 ? "s" : ""} checked</span>}
            {broken.length > 0 && <span className="text-ochre">⚠ {broken.length} broken link{broken.length > 1 ? "s" : ""}</span>}
          </div>
        </div>

        <div className="space-y-6">
          <ul>
            {report.readme.checks.map((c) => (
              <li key={c.id} className="border-b border-rule">
                <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="grid w-full grid-cols-[18px_1fr_auto] items-center gap-3 py-2.5 text-left text-sm hover:text-brass">
                  {!c.applicable ? <span className="h-2.5 w-2.5 rounded-full border border-dashed border-faint" /> : c.pass ? <span className="h-2.5 w-2.5 rounded-full bg-sage" /> : <span className="tri text-ochre" />}
                  <span className={c.applicable ? "" : "text-mute"}>{c.label}</span>
                  <span className="font-mono text-xs text-mute">{!c.applicable ? "n/a" : c.pass ? "present" : `missing · ${c.rule_id}`}</span>
                </button>
                {open === c.id && <p className="fadein pb-3 pl-[30px] text-sm text-mute"><b className="text-ink">Skopia expected: </b>{c.expected}</p>}
              </li>
            ))}
          </ul>

          {cmds.length > 0 && (
            <div className="border-t border-rule pt-4">
              <h3 className="mb-2 text-xs font-mono uppercase tracking-[0.16em] text-mute">Commands cited in README</h3>
              <ul className="space-y-1.5 font-mono text-xs">
                {cmds.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-4 py-1 border-b border-rule/50">
                    <span className="truncate text-ink">{c.command}</span>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${c.status === "valid" ? "border-sage/40 text-sage" : "border-ochre/40 text-ochre"}`}>
                      {c.status === "valid" ? "✓ verified" : "✗ undefined / missing"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EnvView({ report }: { report: Report }) {
  const { detected, documented } = report.env;
  if (!detected.length) return <p className="py-10 text-center text-sm text-mute">◯ No environment-variable access detected (process.env, import.meta.env, os.getenv, os.environ).</p>;
  return (
    <section className="pt-6">
      <p className="mb-4 text-sm"><b>{detected.length - documented.length}</b> of {detected.length} environment variables appear undocumented.</p>
      <ul>
        {detected.map((d) => {
          const ok = documented.includes(d.name);
          return (
            <li key={d.name} className="grid grid-cols-[18px_1fr_auto] items-center gap-3 border-b border-rule py-2 text-sm">
              {ok ? <span className="h-2.5 w-2.5 rounded-full bg-sage" /> : <span className="tri text-ochre" />}
              <span className="font-mono">{d.name}</span>
              <span className="font-mono text-xs text-mute">{d.path}:{d.line} · {ok ? "documented" : "undocumented"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
