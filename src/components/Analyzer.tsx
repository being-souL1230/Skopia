"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = ["Detecting", "Dependencies", "README", "Environment", "Hygiene"];

export function Scanning({ stage }: { stage: number }) {
  return (
    <div className="flex flex-col items-center py-6 fadein" aria-live="polite">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-rule)" />
          <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-brass)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="565" strokeDashoffset={565 - (565 * (stage + 1)) / STAGES.length} transform="rotate(-90 100 100)" className="ring-anim" />
          <g className="orbit" style={{ transformOrigin: "100px 100px" }}><polygon points="100,4 95,14 105,14" fill="var(--color-ink)" /></g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-xs text-mute">{String(stage + 1).padStart(2, "0")} / 05</div>
          <div className="mt-1 text-lg font-bold">{STAGES[stage]}</div>
        </div>
      </div>
      <ol className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-xs">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 ${i < stage ? "text-ink" : i === stage ? "font-bold text-brass" : "text-faint"}`}>{s}{i < STAGES.length - 1 && <span className="text-faint">→</span>}</li>
        ))}
      </ol>
    </div>
  );
}

export default function Analyzer({ projectId, mode = "both", repoUrl, compact = false }: { projectId?: number; mode?: "both" | "zip" | "github"; repoUrl?: string | null; compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(repoUrl || "");
  const [error, setError] = useState("");
  const [stage, setStage] = useState(-1);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function run(req: () => Promise<Response>) {
    setError(""); setStage(0);
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 650);
    const minDelay = new Promise((r) => setTimeout(r, 3300));
    try {
      const res = await req();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to analyze.");
      await minDelay;
      router.push(`/app/scans/${json.scanId}`);
      router.refresh();
    } catch (e) {
      if (timer.current) clearInterval(timer.current);
      setStage(-1); setError((e as Error).message);
    }
  }

  function uploadFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) { setError("Only .zip archives are accepted. Compress the project folder first."); return; }
    const fd = new FormData(); fd.append("file", f); if (projectId) fd.append("projectId", String(projectId));
    run(() => fetch("/api/analyze/zip", { method: "POST", body: fd }));
  }
  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { setError("Paste a public GitHub repository URL."); return; }
    run(() => fetch("/api/analyze/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, projectId }) }));
  }

  if (stage >= 0) return <Scanning stage={stage} />;

  return (
    <div className="flex flex-col items-center">
      {mode !== "github" && (
        <>
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); uploadFile(e.dataTransfer.files[0]); }}
            className={`group flex ${compact ? "h-36 w-36" : "h-60 w-60"} flex-col items-center justify-center rounded-full border transition-all ${drag ? "scale-105 border-brass bg-[#b59b6212]" : "border-ink/60 hover:border-brass"}`}>
            <span className="tri text-ink transition-transform group-hover:-translate-y-1" style={{ transform: "scale(1.8)" }} />
            <span className={`mt-5 font-bold ${compact ? "text-sm" : ""}`}>{drag ? "Release to scan" : "Upload ZIP"}</span>
            {!compact && <span className="mt-1 text-xs text-mute">drop or click · max 25 MB</span>}
          </button>
          <input ref={fileRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={(e) => uploadFile(e.target.files?.[0])} />
        </>
      )}
      {mode === "both" && <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-faint"><span className="h-px w-12 bg-rule" />or<span className="h-px w-12 bg-rule" /></div>}
      {mode !== "zip" && (
        <form onSubmit={submitUrl} className="flex w-full max-w-md items-end gap-4">
          <label className="flex-1"><span className="sr-only">GitHub repository URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="field font-mono text-sm" /></label>
          <button className="link-act whitespace-nowrap pb-2 text-sm">{mode === "github" ? "Rescan" : "Analyze"} <span className="tri-r" /></button>
        </form>
      )}
      {error && <p role="alert" className="mt-5 flex max-w-md items-start gap-2 text-sm"><span className="tri mt-1 shrink-0 text-ochre" />{error}</p>}
    </div>
  );
}
