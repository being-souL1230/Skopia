import Link from "next/link";
import { getUser } from "@/lib/auth";
import { projectsWithScans } from "@/lib/queries";
import { fetchUserRepos } from "@/lib/github";
import { Ring, SevMark } from "@/components/Ring";
import GithubReposList from "@/components/GithubReposList";

export default async function Overview() {
  const user = (await getUser())!;
  let ps = await projectsWithScans(user.id);

  const isGithubUser = Boolean(user.githubUsername && user.githubAccessToken);

  // For GitHub users, filter out any pre-seeded demo projects so they only see their own repositories
  if (isGithubUser) {
    ps = ps.filter((p) => p.name !== "demo-project" && p.name !== "weather-bot");
  }

  const githubRepos = isGithubUser && user.githubAccessToken ? await fetchUserRepos(user.githubAccessToken) : [];

  const scanned = ps.filter((p) => p.latest);
  const avg = scanned.length ? Math.round(scanned.reduce((a, p) => a + p.latest!.score, 0) / scanned.length) : 0;
  const openFindings = scanned.flatMap((p) =>
    p.latest!.report.findings.filter((f) => f.severity !== "info").map((f) => ({ ...f, project: p.name, scanId: p.latest!.id }))
  );
  const sevCount = (s: string) => openFindings.filter((f) => f.severity === s).length;

  return (
    <div className="fadein space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-14 w-14 rounded-full border border-brass object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brass text-lg font-bold">
              {user.name[0]}
            </span>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mute">
              {isGithubUser ? "GitHub Connected Workspace" : "Overview"}
            </p>
            <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user.name.split(" ")[0]}.
            </h1>
            {user.githubUsername && (
              <p className="font-mono text-xs text-brass mt-0.5">@{user.githubUsername}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/app/analyze" className="link-act text-sm">
            Analyze another <span className="tri-r" />
          </Link>
        </div>
      </header>

      {/* If user has scanned projects, show the health summary metrics */}
      {scanned.length > 0 && (
        <section className="flex flex-wrap items-center gap-10 rounded-2xl border border-rule p-6">
          <Ring value={avg} size={130} sub="avg health" />
          <div className="grid flex-1 grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
            {[
              ["Scanned Repos", scanned.length],
              ["Total Scans", ps.reduce((a, p) => a + p.scans.length, 0)],
              ["Critical / High", sevCount("critical") + sevCount("high")],
              ["Medium / Low", sevCount("medium") + sevCount("low")],
            ].map(([l, v]) => (
              <div key={l as string} className="border-l border-rule pl-4">
                <div className="text-2xl font-extrabold">{v}</div>
                <div className="text-xs text-mute">{l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Section: GitHub Repositories for GitHub users */}
      {isGithubUser ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-mute">Your Repositories</h2>
            <span className="font-mono text-xs text-mute">{githubRepos.length} repositories loaded from GitHub</span>
          </div>
          <GithubReposList
            repos={githubRepos}
            scannedProjects={ps}
            username={user.githubUsername!}
            avatarUrl={user.avatarUrl}
          />
        </section>
      ) : (
        /* Regular Email User Overview */
        <>
          {!ps.length ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-faint">
                <span className="tri text-brass" style={{ transform: "scale(1.8)" }} />
              </div>
              <h2 className="mt-6 text-xl font-bold">No projects yet</h2>
              <p className="mt-1 text-mute">
                Upload a ZIP or paste a public GitHub URL to get your first health report.
              </p>
              <Link href="/app/analyze" className="link-act mt-5">
                Start analyzing <span className="tri-r" />
              </Link>
            </div>
          ) : (
            <section className="border-t border-rule pt-6">
              <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Projects</h2>
              <ul>
                {ps.map((p) => (
                  <li key={p.id} className="border-b border-rule">
                    <Link
                      href={p.latest ? `/app/scans/${p.latest.id}` : `/app/projects/${p.id}`}
                      className="group flex items-center gap-5 py-3.5"
                    >
                      {p.latest ? (
                        <Ring value={p.latest.score} size={48} stroke={2} animate={false} />
                      ) : (
                        <span className="h-12 w-12 rounded-full border border-dashed border-faint" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold group-hover:text-brass">{p.name}</div>
                        <div className="truncate text-xs text-mute">
                          {p.latest?.report.project.type || "not scanned"} ·{" "}
                          {p.source === "github" ? p.repoUrl : "ZIP upload"} · {p.scans.length} scan
                          {p.scans.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="tri-r text-faint group-hover:text-brass" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Top fixes if any projects were scanned */}
      {openFindings.length > 0 && (
        <section className="border-t border-rule pt-8">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">Top fixes across your scanned projects</h2>
          <ul>
            {openFindings.slice(0, 6).map((f) => (
              <li key={f.project + f.key} className="border-b border-rule">
                <Link href={`/app/scans/${f.scanId}`} className="flex items-center gap-4 py-2.5 text-sm hover:text-brass">
                  <SevMark sev={f.severity} />
                  <span className="w-20 shrink-0 font-mono text-xs text-mute">{f.rule_id}</span>
                  <span className="flex-1 truncate">
                    {f.title} <span className="font-mono text-xs text-mute">{f.evidence.length < 40 ? f.evidence : ""}</span>
                  </span>
                  <span className="hidden text-xs text-mute sm:block">{f.project}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
