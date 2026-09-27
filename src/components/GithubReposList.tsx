"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GithubRepo } from "@/lib/github";
import { Ring } from "./Ring";
import { Scanning } from "./Analyzer";

interface ScannedProject {
  id: number;
  name: string;
  source: string;
  repoUrl: string | null;
  scans: { id: number; score: number; createdAt: Date }[];
  latest?: { id: number; score: number; createdAt: Date } | null;
}

export default function GithubReposList({
  repos,
  scannedProjects,
  username,
  avatarUrl,
}: {
  repos: GithubRepo[];
  scannedProjects: ScannedProject[];
  username: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  // Map scanned projects by repoUrl or project name
  const scannedMap = useMemo(() => {
    const map = new Map<string, ScannedProject>();
    for (const p of scannedProjects) {
      if (p.repoUrl) {
        const norm = p.repoUrl.trim().toLowerCase().replace(/\/+$/, "").replace(/\.git$/, "");
        map.set(norm, p);
      }
      map.set(p.name.toLowerCase(), p);
    }
    return map;
  }, [scannedProjects]);

  const filtered = useMemo(() => {
    return repos.filter((r) => {
      const matchQ =
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(query.toLowerCase())) ||
        (r.language && r.language.toLowerCase().includes(query.toLowerCase()));
      if (!matchQ) return false;
      if (filterType === "public") return !r.private;
      if (filterType === "private") return r.private;
      return true;
    });
  }, [repos, query, filterType]);

  async function triggerAnalysis(repo: GithubRepo) {
    setScanError(null);
    setAnalyzingRepo(repo.full_name);
    setStage(0);

    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, 4));
    }, 650);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const existing = scannedMap.get(repo.html_url.toLowerCase().replace(/\.git$/, "")) || scannedMap.get(repo.name.toLowerCase());
      const res = await fetch("/api/analyze/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: repo.html_url,
          projectId: existing ? existing.id : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze repository.");

      await minDelay;
      clearInterval(interval);
      router.push(`/app/scans/${data.scanId}`);
      router.refresh();
    } catch (err: any) {
      clearInterval(interval);
      setAnalyzingRepo(null);
      setScanError(err.message || "An error occurred during analysis.");
    }
  }

  if (analyzingRepo) {
    return (
      <div className="py-12 fadein text-center">
        <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-mute">
          Analyzing {analyzingRepo}
        </p>
        <Scanning stage={stage} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rule bg-[#b59b620a] p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink sm:text-lg">GitHub Repositories</h2>
            <span className="font-mono text-xs text-brass">@{username}</span>
          </div>
          <p className="mt-0.5 text-xs text-mute">
            {repos.length} repos available · Click <b>Analyze</b> on any repository to run Skopia health scan.
          </p>
        </div>

        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noreferrer"
          className="link-act text-xs"
        >
          View GitHub Profile ↗
        </a>
      </div>

      {scanError && (
        <div role="alert" className="flex items-start gap-2 border border-ochre/30 bg-ochre/10 p-3 text-sm rounded-lg">
          <span className="tri mt-1 shrink-0 text-ochre" />
          <p>{scanError}</p>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div className="flex flex-1 items-center gap-3 min-w-[200px] max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repository or language…"
            className="field w-full font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          {(["all", "public", "private"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`capitalize px-2.5 py-1 rounded-full border transition-colors ${
                filterType === type
                  ? "border-ink bg-ink text-canvas font-medium"
                  : "border-rule text-mute hover:text-ink"
              }`}
            >
              {type}
            </button>
          ))}
          <span className="font-mono text-xs text-mute">
            ({filtered.length} found)
          </span>
        </div>
      </div>

      {/* Repositories List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-mute">
          ◯ No repositories match your search.
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {filtered.map((repo) => {
            const normUrl = repo.html_url.toLowerCase().replace(/\.git$/, "");
            const scanned = scannedMap.get(normUrl) || scannedMap.get(repo.name.toLowerCase());
            const latestScan = scanned?.latest;

            return (
              <li key={repo.id} className="group py-4 transition-colors hover:bg-black/[0.01]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-ink hover:text-brass transition-colors truncate"
                      >
                        {repo.name}
                      </a>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono ${
                          repo.private
                            ? "border-ochre text-ochre bg-ochre/10"
                            : "border-rule text-mute"
                        }`}
                      >
                        {repo.private ? "private" : "public"}
                      </span>

                      {repo.language && (
                        <span className="flex items-center gap-1 text-[11px] text-mute font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
                          {repo.language}
                        </span>
                      )}

                      {repo.stargazers_count > 0 && (
                        <span className="text-[11px] text-mute font-mono">
                          ★ {repo.stargazers_count}
                        </span>
                      )}
                    </div>

                    {repo.description && (
                      <p className="line-clamp-2 text-xs text-mute max-w-2xl">
                        {repo.description}
                      </p>
                    )}

                    <p className="font-mono text-[11px] text-faint">
                      default: {repo.default_branch} · updated {new Date(repo.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Scan Status & Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    {latestScan ? (
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/app/scans/${latestScan.id}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          title="View latest health report"
                        >
                          <Ring value={latestScan.score} size={42} stroke={2} animate={false} />
                          <div className="text-left">
                            <span className="block font-mono text-xs font-bold">{latestScan.score}/100</span>
                            <span className="block text-[10px] text-mute">View report ↗</span>
                          </div>
                        </Link>
                        <button
                          onClick={() => triggerAnalysis(repo)}
                          className="link-act text-xs font-semibold"
                        >
                          Rescan <span className="tri-r" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerAnalysis(repo)}
                        className="link-act text-xs font-semibold py-1.5 px-3 rounded-full border border-ink hover:bg-ink hover:text-canvas transition-all"
                      >
                        Analyze <span className="tri-r" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
