"use client";

import { useState } from "react";
import Link from "next/link";
import type { Finding, Report } from "@/lib/analyzer";
import { Ring, SevMark } from "./Ring";

type SampleVersion = "before" | "after";

const categories = [
  { key: "dependencies", label: "Dependencies", weight: "40%" },
  { key: "documentation", label: "Documentation", weight: "35%" },
  { key: "hygiene", label: "Repository hygiene", weight: "25%" },
] as const;

function SampleFinding({ finding, initiallyOpen }: { finding: Finding; initiallyOpen: boolean }) {
  const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;

  return (
    <details className="home-disclosure border-b border-rule" open={initiallyOpen || undefined}>
      <summary className="group flex cursor-pointer items-start gap-3 py-4">
        <span className="mt-1.5 shrink-0" aria-hidden="true"><SevMark sev={finding.severity} /></span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-mute">
            <span>{finding.rule_id}</span>
            <span className="capitalize">{finding.severity}</span>
            <span className="max-w-full truncate" title={location}>{location}</span>
          </div>
          <h4 className="text-sm font-semibold transition-colors group-hover:text-brass">{finding.title}</h4>
        </div>
        <span className="home-disclosure-arrow mt-2 text-xs text-mute" aria-hidden="true">↗</span>
      </summary>
      <div className="pb-5 pl-[23px] text-sm leading-relaxed">
        <dl className="space-y-3">
          <div>
            <dt className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">Evidence</dt>
            <dd className="break-words font-mono text-xs">{finding.evidence}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">Why it was flagged</dt>
            <dd className="text-xs leading-relaxed text-mute">{finding.why}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">Suggested fix</dt>
            <dd className="text-xs leading-relaxed">{finding.fix}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

export default function HomeReportPreview({ before, after, workspaceHref }: { before: Report; after: Report; workspaceHref: string }) {
  const [version, setVersion] = useState<SampleVersion>("before");
  const report = version === "before" ? before : after;
  const issueCount = report.findings.filter((finding) => finding.severity !== "info").length;
  const selectedFindings = ["DEP-001", "ENV-001", "DOC-003"]
    .map((rule) => report.findings.find((finding) => finding.rule_id === rule))
    .filter((finding): finding is Finding => !!finding);
  const score = report.categories;
  const sampleDownload = version === "before" ? "/api/demo-zip" : "/api/demo-zip?fixed=1";

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule py-4">
        <p className="flex items-center gap-2.5 font-mono text-xs">
          <span className="h-2 w-2 rounded-full border border-brass" aria-hidden="true" />
          demo-project<span className="hidden text-mute sm:inline">/ JavaScript + Node.js</span>
        </p>
        <div className="flex items-center gap-5 text-xs" role="group" aria-label="Choose demo repository version">
          {(["before", "after"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={version === item}
              aria-controls="sample-report-content"
              onClick={() => setVersion(item)}
              className={`flex items-center gap-2 py-1 transition-colors ${version === item ? "font-semibold text-ink" : "text-mute hover:text-ink"}`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${version === item ? "border-brass" : "border-faint"}`} aria-hidden="true">
                {version === item && <span className="h-1.5 w-1.5 rounded-full bg-brass" />}
              </span>
              {item === "before" ? "Before fixes" : "After fixes"}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status">
        {version === "before" ? "Before fixes" : "After fixes"}: health score {report.score} out of 100, {issueCount} findings.
      </p>

      <div id="sample-report-content" className="grid gap-7 py-7 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
        <div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5 md:flex-col md:gap-0">
            <Ring value={report.score} size={174} stroke={3} sub="health / 100" label="Demo project health" />
            <div className="text-center sm:text-left md:mt-2 md:text-center">
              <p className="text-sm font-semibold">{version === "before" ? "A few loose ends." : "A clearer starting point."}</p>
              <p className="mt-1 text-[11px] text-mute">
                {version === "before" ? `${issueCount} findings worth a look` : `+${after.score - before.score} points after the fixes`}
              </p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-rule pt-4">
            {categories.map(({ key, label, weight }) => (
              <div key={key} className="flex items-center justify-between gap-3 text-xs">
                <dt className="flex items-center gap-2 text-mute"><span className="h-1.5 w-1.5 rounded-full border border-brass" aria-hidden="true" />{label}</dt>
                <dd className="flex items-center gap-3 font-mono"><span className="text-[10px] text-mute">× {weight}</span><span className="w-7 text-right font-medium">{score[key]}</span></dd>
              </div>
            ))}
          </dl>
          <details className="home-disclosure mt-4 border-t border-rule pt-3">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] text-mute hover:text-ink">
              How the score adds up <span className="home-disclosure-arrow" aria-hidden="true">↗</span>
            </summary>
            <div className="mt-3 text-[11px] leading-relaxed text-mute">
              <p>Each category starts at 100. Findings deduct points by severity; repeated rules have caps.</p>
              <p className="mt-2 font-mono text-[10px] text-ink">
                ({score.dependencies} × 0.40) + ({score.documentation} × 0.35) + ({score.hygiene} × 0.25) = {report.score}
              </p>
              <Link href="/docs" className="mt-2 inline-block underline decoration-rule underline-offset-4 hover:text-ink">Read the scoring rules ↗</Link>
            </div>
          </details>
        </div>

        <div key={version} className="min-w-0 fadein">
          <div className="flex items-center justify-between gap-3 border-b border-rule pb-3 text-[10px] uppercase tracking-[0.15em] text-mute">
            <span>{version === "before" ? "A few things the scan found" : "What changed in this version"}</span>
            <span className="shrink-0 font-mono normal-case tracking-normal">{version === "before" ? `${selectedFindings.length} of ${issueCount}` : "3 improvements"}</span>
          </div>
          {version === "before" ? (
            selectedFindings.map((finding, index) => <SampleFinding key={finding.key} finding={finding} initiallyOpen={index === 0} />)
          ) : (
            <>
              {[
                { title: "One less dependency to maintain", evidence: "lodash removed from package.json", text: "The unused package was reviewed and removed. Remaining declared runtime packages have recognizable imports." },
                { title: "Setup no longer needs guesswork", evidence: "README.md · installation, configuration, API", text: "A fuller description, install commands, endpoint details and both missing environment variables are now documented." },
                { title: "Clear permission to build on it", evidence: "LICENSE · MIT", text: "A root license file and a README license section make the reuse terms explicit." },
              ].map((improvement) => (
                <div key={improvement.title} className="flex gap-3 border-b border-rule py-4">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-sage" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{improvement.title}</p>
                    <p className="mt-1 break-words font-mono text-[10px] text-mute">{improvement.evidence}</p>
                    <p className="mt-2 text-xs leading-relaxed text-mute">{improvement.text}</p>
                  </div>
                </div>
              ))}
              <p className="mt-4 text-[11px] leading-relaxed text-mute">A score of 100 means these repository-readiness rules pass. It is not a guarantee of code correctness or security.</p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-rule pt-4">
        <p className="max-w-sm text-[11px] leading-relaxed text-mute">Real demo files. The same deterministic rule engine.<br />Switch versions to see exactly what a few fixes change.</p>
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <a href={sampleDownload} className="text-mute underline decoration-rule underline-offset-4 hover:text-ink">Download this ZIP ↓</a>
          <Link href={workspaceHref} className="link-act">Explore the workspace <span className="tri-r" aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}
