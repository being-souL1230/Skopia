import Link from "next/link";
import { getUser } from "@/lib/auth";
import { projectsWithScans } from "@/lib/queries";
import { Ring } from "@/components/Ring";

export default async function ProjectsPage() {
  const user = (await getUser())!;
  let ps = await projectsWithScans(user.id);
  if (user.githubUsername) {
    ps = ps.filter((p) => p.name !== "demo-project" && p.name !== "weather-bot");
  }
  return (
    <div className="fadein">
      <header className="flex items-end justify-between border-b border-rule pb-5">
        <div><p className="text-xs uppercase tracking-[0.2em] text-mute">Projects</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">{ps.length} scanned repositories</h1></div>
        <Link href="/app/analyze" className="link-act text-sm">Add project <span className="tri-r" /></Link>
      </header>
      {!ps.length ? (
        <div className="py-20 text-center"><div className="mx-auto h-20 w-20 rounded-full border border-dashed border-faint" /><p className="mt-5 text-mute">No projects. <Link href="/app/analyze" className="text-ink underline">Analyze one</Link>.</p></div>
      ) : (
        <ul>
          {ps.map((p) => (
            <li key={p.id} className="border-b border-rule">
              <div className="flex items-center gap-5 py-4">
                {p.latest ? <Ring value={p.latest.score} size={56} stroke={2} animate={false} /> : <span className="h-14 w-14 rounded-full border border-dashed border-faint" />}
                <div className="min-w-0 flex-1">
                  <Link href={`/app/projects/${p.id}`} className="font-bold hover:text-brass">{p.name}</Link>
                  <p className="truncate text-xs text-mute">{p.notes || "No notes"}</p>
                  <p className="font-mono text-[11px] text-faint">{p.source} · {p.scans.length} scans · created {p.createdAt.toLocaleDateString()}</p>
                </div>
                <div className="hidden gap-1 sm:flex">{p.scans.slice(0, 8).reverse().map((s) => <span key={s.id} title={`${s.score}`} className="h-2 w-2 rounded-full" style={{ background: s.score >= 80 ? "var(--color-sage)" : s.score >= 60 ? "var(--color-brass)" : "var(--color-ochre)" }} />)}</div>
                {p.latest && <Link href={`/app/scans/${p.latest.id}`} className="link-act text-xs">Report <span className="tri-r" /></Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
