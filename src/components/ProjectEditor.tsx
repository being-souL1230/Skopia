"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ring } from "./Ring";
import Analyzer from "./Analyzer";

type ScanLite = { id: number; score: number; createdAt: string; findings: number };

export default function ProjectEditor({ project, scans: initial }: { project: { id: number; name: string; notes: string; source: string; repoUrl: string | null }; scans: ScanLite[] }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [notes, setNotes] = useState(project.notes);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scans, setScans] = useState(initial);
  const [confirm, setConfirm] = useState(false);

  async function save() {
    setSaved("saving");
    const r = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, notes }) });
    setSaved(r.ok ? "saved" : "error"); router.refresh();
  }
  async function delScan(id: number) {
    const prev = scans; setScans(scans.filter((s) => s.id !== id)); // optimistic
    const r = await fetch(`/api/scans/${id}`, { method: "DELETE" });
    if (!r.ok) setScans(prev); else router.refresh();
  }
  async function delProject() {
    const r = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (r.ok) { router.push("/app/projects"); router.refresh(); }
  }

  const pts = [...scans].reverse();
  const W = 300, H = 60;
  const path = pts.map((s, i) => `${i ? "L" : "M"}${pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W},${H - (s.score / 100) * H}`).join(" ");

  return (
    <div className="fadein">
      <header className="border-b border-rule pb-5">
        <Link href="/app/projects" className="text-xs uppercase tracking-[0.2em] text-mute hover:text-ink">◁ Projects</Link>
        <input value={name} onChange={(e) => { setName(e.target.value); setSaved("idle"); }} aria-label="Project name" className="field mt-1 border-transparent text-3xl font-extrabold tracking-tight hover:border-rule" />
        <p className="font-mono text-xs text-mute">{project.source === "github" ? project.repoUrl : "ZIP upload"}</p>
      </header>

      <section className="grid gap-10 border-b border-rule py-8 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.16em] text-mute">Notes
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved("idle"); }} rows={3} className="field resize-none text-sm normal-case tracking-normal text-ink" placeholder="Context for reviewers…" /></label>
          <div className="mt-3 flex items-center gap-6 text-sm">
            <button onClick={save} disabled={saved === "saving"} className="link-act">Save <span className="tri-r" /></button>
            <span className="text-xs text-mute">{saved === "saving" ? "saving…" : saved === "saved" ? "◯ saved" : saved === "error" ? "△ could not save" : ""}</span>
            {!confirm ? <button onClick={() => setConfirm(true)} className="ml-auto text-xs text-mute hover:text-ink">Delete project</button> :
              <span className="ml-auto flex items-center gap-3 text-xs"><span className="tri text-ochre" />Delete with all scans? <button onClick={delProject} className="font-bold">Yes</button><button onClick={() => setConfirm(false)} className="text-mute">No</button></span>}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-mute">Score trend</p>
          {pts.length ? (
            <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="w-full max-w-[360px]">
              <line x1="0" x2={W} y1={H * 0.2} y2={H * 0.2} stroke="var(--color-rule)" strokeDasharray="2 3" />
              <path d={path} fill="none" stroke="var(--color-brass)" strokeWidth="1.5" />
              {pts.map((s, i) => <circle key={s.id} cx={pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W} cy={H - (s.score / 100) * H} r="3.5" fill="var(--color-canvas)" stroke="var(--color-ink)" />)}
            </svg>
          ) : <p className="text-sm text-mute">No scans yet.</p>}
        </div>
      </section>

      <section className="border-b border-rule py-8">
        <p className="mb-5 text-center text-xs uppercase tracking-[0.16em] text-mute">Rescan</p>
        <Analyzer projectId={project.id} mode={project.source === "github" ? "github" : "zip"} repoUrl={project.repoUrl} compact />
      </section>

      <section className="pt-6">
        <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Scan history</h2>
        {!scans.length ? <p className="py-6 text-sm text-mute">◯ No scans. Upload above to create one.</p> : (
          <ul>{scans.map((s) => (
            <li key={s.id} className="flex items-center gap-4 border-b border-rule py-2.5">
              <Ring value={s.score} size={40} stroke={2} animate={false} />
              <Link href={`/app/scans/${s.id}`} className="flex-1 text-sm hover:text-brass">Scan #{s.id} <span className="font-mono text-xs text-mute">· {new Date(s.createdAt).toLocaleString()} · {s.findings} findings</span></Link>
              <button onClick={() => delScan(s.id)} className="text-xs text-mute hover:text-ink" aria-label={`Delete scan ${s.id}`}>remove</button>
            </li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
