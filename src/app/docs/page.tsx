import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { SevMark } from "@/components/Ring";

const RULES: [string, string, string, string][] = [
  ["PROJ-001", "Project", "medium", "No supported project manifest detected."],
  ["PROJ-002", "Project", "info", "TypeScript project detected."],
  ["DEP-001", "Dependencies", "medium", "Declared dependency has no recognizable import/usage (low for devDependencies)."],
  ["DEP-003", "Dependencies", "high", "Dependency manifest could not be parsed: analysis error, no guessing."],
  ["DEP-004", "Dependencies", "info", "Usage only inside ignored/generated folders is not counted."],
  ["DEP-005", "Dependencies", "low", "devDependency imported by runtime source (flagged for review)."],
  ["DEP-006", "Dependencies", "high", "Undeclared dependency used in source code but missing from manifest."],
  ["DEP-007", "Dependencies", "medium", "Conflicting package manager lockfiles detected."],
  ["DOC-001", "README", "high", "README not found."],
  ["DOC-002", "README", "medium", "Project description missing/too short."],
  ["DOC-003", "README", "medium", "Installation instructions missing."],
  ["DOC-004", "README", "medium", "Usage instructions missing."],
  ["DOC-005", "README", "medium", "Configuration docs missing while env vars are used."],
  ["DOC-006", "README", "low", "API documentation missing where route definitions exist."],
  ["DOC-007", "README", "low", "Screenshots missing for UI projects."],
  ["DOC-008", "README", "low", "License information missing."],
  ["DOC-009", "README", "low", "Features section missing."],
  ["DOC-010", "README", "medium", "README references undefined npm script or missing script entrypoint."],
  ["DOC-011", "README", "low", "Broken relative file or image link in README."],
  ["ENV-001", "Config", "medium", "Environment variable used but not documented in README or .env.example."],
  ["HYGI-001", "Hygiene", "medium", ".gitignore missing."],
  ["HYGI-002", "Hygiene", "low", "LICENSE file missing."],
  ["HYGI-003", "Hygiene", "medium", "Generated directory present and not ignored."],
  ["HYGI-004", "Hygiene", "critical", "Secret/config file appears tracked (filename heuristic)."],
  ["HYGI-005", "Hygiene", "critical", "Hardcoded API key, token, or private key detected in source code."],
  ["HYGI-006", "Hygiene", "low", "Dockerfile present without .dockerignore."],
  ["HYGI-007", "Hygiene", "low", "Empty source files detected in repository."],
  ["HYGI-008", "Hygiene", "low", "Oversized monolithic file (> 1,200 lines)."],
  ["HYGI-009", "Hygiene", "high", "Dangerous dynamic code execution construct (eval, exec, new Function)."],
  ["HYGI-010", "Hygiene", "medium", "Silent exception swallowing in empty catch block or except pass."],
  ["HYGI-011", "Hygiene", "medium", "Forgotten debugger breakpoint committed in production source."],
  ["HYGI-012", "Hygiene", "low", "TypeScript strict mode is disabled or unconfigured in tsconfig.json."],
  ["HYGI-013", "Hygiene", "low", "Excessive raw console.log statements in production source files."],
  ["TEST-001", "Hygiene", "low", "No automated test suite or test runner detected."],
  ["CI-001", "Hygiene", "info", "No Continuous Integration (CI/CD) workflow configured."],
];

export default function Docs() {
  return (
    <div className="mx-auto max-w-[900px] px-6">
      <nav className="flex items-center justify-between border-b border-rule py-5"><Wordmark /><Link href="/app" className="link-act text-sm">Open app <span className="tri-r" /></Link></nav>
      <h1 className="mt-12 text-4xl font-extrabold tracking-tight">Rules & scoring</h1>
      <p className="mt-3 max-w-2xl text-mute">Skopia is deterministic: the same repository always produces the same report. Every finding maps to one rule below and cites a file, line or pattern.</p>

      <h2 className="mt-12 text-xs uppercase tracking-[0.2em] text-mute">Score model</h2>
      <div className="mt-3 space-y-2 border-t border-rule pt-4 text-sm">
        <p>Dependency Health <b>40%</b> · Documentation Health <b>35%</b> · Repository Hygiene <b>25%</b></p>
        <p className="text-mute">Each category starts at 100. Deductions: critical −30, high −20, medium −10, low −5, info 0. Repeated rules are capped (DEP-001 ≤ 40, ENV-001 ≤ 20, HYGI-003 ≤ 30) and categories never drop below 0. Project rules count toward Dependencies; ENV rules toward Documentation.</p>
        <p className="font-mono text-xs">Overall = deps × 0.40 + docs × 0.35 + hygiene × 0.25, rounded.</p>
      </div>

      <h2 className="mt-12 text-xs uppercase tracking-[0.2em] text-mute">Rule catalog</h2>
      <ul className="mt-3 border-t border-rule">
        {RULES.map(([id, cat, sev, d]) => (
          <li key={id} className="grid grid-cols-[18px_80px_100px_1fr] items-center gap-3 border-b border-rule py-2.5 text-sm">
            <SevMark sev={sev} /><span className="font-mono text-xs">{id}</span><span className="text-xs text-mute">{cat}</span><span>{d}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-xs uppercase tracking-[0.2em] text-mute">API</h2>
      <ul className="mt-3 border-t border-rule font-mono text-xs">
        {[["POST", "/api/analyze/zip", "multipart: file, projectId?"], ["POST", "/api/analyze/github", "json: { url, projectId? }"], ["GET", "/api/scans/:id", "completed report"], ["GET", "/api/demo-zip", "?fixed=1 for improved version"]].map(([m, p, d]) => (
          <li key={p} className="grid grid-cols-[50px_200px_1fr] gap-3 border-b border-rule py-2"><span className="text-brass">{m}</span><span>{p}</span><span className="text-mute">{d}</span></li>
        ))}
      </ul>
      <h2 className="mt-12 text-xs uppercase tracking-[0.2em] text-mute">Security</h2>
      <p className="mb-16 mt-3 border-t border-rule pt-4 text-sm text-mute">Archives are unpacked in memory with path-traversal guards, binaries are skipped, and nothing is executed: no npm scripts, setup.py, shell scripts, or lifecycle hooks. Only public github.com URLs are accepted.</p>
    </div>
  );
}
