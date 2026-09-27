import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import HomeReportPreview from "@/components/HomeReportPreview";
import { getUser } from "@/lib/auth";
import { analyze } from "@/lib/analyzer";
import { DEMO_JS, DEMO_JS_FIXED } from "@/lib/seed";

export const dynamic = "force-dynamic";

const checks = [
  { title: "Dependency health", description: "Compare declared packages with recognizable imports. Find what may no longer belong — without jumping to conclusions.", evidence: "package.json · requirements.txt", kind: "circle" },
  { title: "README Doctor", description: "Check the essentials a new contributor needs: what it does, how to install it, how to run it, and what to configure.", evidence: "README.md · 9 completeness checks", kind: "triangle" },
  { title: "Environment setup", description: "Spot variables used in code but missing from the README or example config. Make the first local run less of a puzzle.", evidence: "process.env · os.getenv", kind: "circle" },
  { title: "Repository hygiene", description: "Catch missing licenses, absent ignore rules and common secret-file names. Small details, fewer surprises at handoff.", evidence: "LICENSE · .gitignore · .env", kind: "triangle" },
];

const steps = [
  { title: "Bring your repository", description: "Upload a project ZIP or paste a public GitHub URL. Skopia detects supported manifests and skips generated folders.", footnote: "ZIP up to 25 MB · public GitHub" },
  { title: "Follow the evidence", description: "Read a prioritized report with scores, rule IDs, affected paths and suggested fixes. Open any finding to see the reason.", footnote: "Concrete rules, not AI guesses" },
  { title: "Fix. Rescan. Compare.", description: "Make changes in your own editor, then rescan. Keep reports in your workspace and see how repository health evolves.", footnote: "Scan history · JSON export" },
];

const questions = [
  { question: "Which projects can Skopia analyze?", answer: "The MVP supports Python and JavaScript / TypeScript projects. It reads package.json, requirements.txt and common pyproject.toml dependency declarations. Submit a local ZIP up to 25 MB or a public GitHub repository; private repository OAuth is not included." },
  { question: "Will it execute or change my code?", answer: "No. Repository files are read as data. Skopia never installs packages, runs application code, invokes lifecycle hooks or rewrites files. No AI API is involved in the core checks." },
  { question: "Can I safely remove a “possibly unused” dependency?", answer: "Not based on the finding alone. Imports can be dynamic, package and import names can differ, and some packages are CLI tools. Skopia flags missing recognizable usage for you to review; it does not automatically remove anything." },
  { question: "What gets saved in my workspace?", answer: "Project details, scan reports, finding evidence and reviewed status are stored so you can revisit and compare results. ZIP files are unpacked in memory rather than saved as a repository checkout. Report evidence can include file paths, package names and environment-variable names." },
  { question: "Is a high score a security guarantee?", answer: "No. The score measures the repository-readiness rules Skopia checks, not code correctness or vulnerability coverage. Secret-file warnings are filename-based hygiene checks, not a complete secret scan or security audit." },
];

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">
      <span className="font-mono font-normal text-brass">{number}</span>
      <span className="h-px w-5 bg-rule" aria-hidden="true" />
      {children}
    </p>
  );
}

export default async function Home() {
  const user = await getUser();
  const analyzeHref = user ? "/app/analyze" : "/login";
  const workspaceHref = user ? "/app" : "/login";
  // The public preview uses the exact same fixture files and rules as workspace scans.
  const before = analyze("demo-project", DEMO_JS);
  const after = analyze("demo-project", DEMO_JS_FIXED);
  const unused = before.dependencies.filter((dependency) => dependency.status === "possibly_unused").length;
  const undocumented = before.env.detected.length - before.env.documented.length;
  const circumference = 2 * Math.PI * 91;

  return (
    <div className="home-page mx-auto max-w-[1100px] px-5 sm:px-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-3 focus:z-50 focus:rounded-full focus:bg-canvas focus:px-5 focus:py-3 focus:text-sm">Skip to content</a>
      <header>
        <nav aria-label="Main navigation" className="flex items-center justify-between gap-4 border-b border-rule py-5">
          <Wordmark />
          <div className="flex items-center gap-5 text-xs sm:gap-7 sm:text-sm">
            <a href="#how-it-works" className="hidden text-mute transition-colors hover:text-ink md:block">How it works</a>
            <Link href="/docs" className="text-mute transition-colors hover:text-ink">Documentation</Link>
            <Link href={analyzeHref} className="link-act">Analyze <span className="tri-r" aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-heading" className="grid items-center gap-10 py-12 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:py-16">
          <div>
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-mute sm:text-xs"><span className="tri text-brass" aria-hidden="true" /> Project Health Analyzer</p>
            <h1 id="hero-heading" className="text-[2.65rem] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">Know what your repository needs before you ship it.</h1>
            <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-mute">Dependency clutter. Missing setup steps. Undocumented variables. Find the loose ends — and know exactly what to fix next.</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link href={analyzeHref} className="link-act text-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-canvas"><span className="tri-r" aria-hidden="true" /></span>
                {user ? "Analyze a repository" : "Try the demo workspace"}
              </Link>
              <a href="#sample-report" className="text-xs text-mute underline decoration-rule underline-offset-4 transition-colors hover:text-ink">See a sample report ↘</a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[11px] text-mute"><span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />Rule-based. AI-free. Your code is never executed.</p>
          </div>

          <figure className="mx-auto w-full max-w-[360px]">
            <div className="mb-2 flex items-center justify-between px-4 font-mono text-[9px] uppercase tracking-[0.12em] text-mute"><span>Repository diagnostics</span><span className="text-brass">Sample / 001</span></div>
            <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Demo project health score: ${before.score} out of 100`}>
              <circle cx="110" cy="110" r="105" fill="none" stroke="var(--color-rule)" strokeDasharray="1 8" />
              <circle cx="110" cy="110" r="91" fill="none" stroke="var(--color-rule)" />
              <circle cx="110" cy="110" r="91" fill="none" stroke="var(--color-brass)" strokeWidth="2.5" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - before.score / 100)} strokeLinecap="round" transform="rotate(-90 110 110)" />
              <circle cx="110" cy="110" r="69" fill="none" stroke="var(--color-rule)" strokeDasharray="1 5" />
              <g className="home-orbit" style={{ transformOrigin: "110px 110px" }}><polygon points="110,12 105,22 115,22" fill="var(--color-ink)" /></g>
              <text x="110" y="88" textAnchor="middle" fontSize="5.5" letterSpacing="1.2" fill="var(--color-mute)">PROJECT HEALTH</text>
              <text x="110" y="124" textAnchor="middle" fontSize="44" fontWeight="800" letterSpacing="-2" fill="var(--color-ink)">{before.score}</text>
              <text x="110" y="141" textAnchor="middle" fontSize="6" letterSpacing="1.5" fill="var(--color-mute)">OUT OF 100</text>
              <circle cx="110" cy="201" r="3" fill="var(--color-canvas)" stroke="var(--color-brass)" />
            </svg>
            <figcaption className="mt-2 text-center">
              <p className="font-mono text-[11px]">demo-project<span className="text-mute"> / JavaScript + Node.js</span></p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] text-mute">
                <span className="flex items-center gap-2"><span className="tri text-brass" style={{ transform: "scale(.65)" }} aria-hidden="true" />{unused} dependency to review</span>
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full border border-brass" aria-hidden="true" />{undocumented} undocumented variables</span>
              </div>
            </figcaption>
          </figure>
        </section>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-rule py-5 text-xs">
          <p className="mr-auto text-[10px] font-semibold uppercase tracking-[0.18em] text-mute">Start with what you have</p>
          <span className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-rule font-mono text-[9px] text-mute" aria-hidden="true">py</span>Python</span>
          <span className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-rule font-mono text-[9px] text-mute" aria-hidden="true">js</span>JavaScript / TypeScript</span>
          <span className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-rule font-mono text-[9px] text-mute" aria-hidden="true">↥</span>ZIP + public GitHub</span>
        </div>

        <section id="what-we-check" aria-labelledby="checks-heading" className="py-12 md:py-14">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-8">
            <div><SectionLabel number="01">Under the surface</SectionLabel><h2 id="checks-heading" className="text-2xl font-bold tracking-tight md:text-[28px]">The gaps your linter doesn’t catch.</h2></div>
            <p className="max-w-[260px] text-xs leading-relaxed text-mute">Four focused checks. One explainable view of your project’s readiness.</p>
          </div>
          <div className="mt-7 grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {checks.map((check, index) => (
              <div key={check.title} className="border-t border-rule pt-4">
                <div className="mb-4 flex items-center justify-between">
                  {check.kind === "circle" ? <span className="h-4 w-4 rounded-full border border-brass" aria-hidden="true" /> : <span className="tri text-brass" style={{ transform: "scale(1.3)" }} aria-hidden="true" />}
                  <span className="font-mono text-[10px] text-mute">0{index + 1}</span>
                </div>
                <h3 className="text-sm font-bold">{check.title}</h3>
                <p className="mt-2 text-xs leading-[1.8] text-mute">{check.description}</p>
                <p className="mt-4 font-mono text-[9px] leading-relaxed text-mute">{check.evidence}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="flow-heading" className="border-t border-rule py-12 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><SectionLabel number="02">A shorter path to ready</SectionLabel><h2 id="flow-heading" className="text-2xl font-bold tracking-tight md:text-[28px]">Bring a repo. Leave with a plan.</h2></div>
            <span className="hidden text-[11px] text-mute sm:block">No setup scripts. No AI API key.</span>
          </div>
          <ol className="mt-7 grid gap-7 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <div className="mb-4 flex items-center gap-4" aria-hidden="true">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brass/60 font-mono text-[10px]">0{index + 1}</span>
                  <span className="h-px flex-1 bg-rule" />
                  {index < steps.length - 1 ? <span className="tri-r text-brass" /> : <span className="h-2 w-2 rounded-full border border-sage" />}
                </div>
                <h3 className="text-sm font-bold">{step.title}</h3>
                <p className="mt-2 max-w-[290px] text-xs leading-[1.8] text-mute">{step.description}</p>
                <p className="mt-3 text-[10px] text-mute">{step.footnote}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="sample-report" aria-labelledby="sample-heading" className="border-t border-rule py-12 md:py-14">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-8">
            <div><SectionLabel number="03">Inside a report</SectionLabel><h2 id="sample-heading" className="text-2xl font-bold tracking-tight md:text-[28px]">A score is useful. The why is better.</h2></div>
            <p className="max-w-[300px] text-xs leading-relaxed text-mute">Every finding connects a rule to evidence and a next step. Nothing hidden behind a number.</p>
          </div>
          <HomeReportPreview before={before} after={after} workspaceHref={workspaceHref} />
        </section>

        <section aria-labelledby="questions-heading" className="grid gap-7 border-t border-rule py-12 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12 md:py-14">
          <div>
            <SectionLabel number="04">Clear by design</SectionLabel>
            <h2 id="questions-heading" className="max-w-xs text-2xl font-bold tracking-tight md:text-[28px]">Small scope.<br />No big claims.</h2>
            <p className="mt-3 max-w-[245px] text-xs leading-[1.8] text-mute">A practical second look before a handoff, a hackathon submission, or your next open-source release.</p>
            <Link href="/docs" className="link-act mt-5 text-xs">Read the rule catalog <span className="tri-r text-brass" aria-hidden="true" /></Link>
          </div>
          <div className="border-t border-rule md:border-t-0">
            {questions.map((item) => (
              <details key={item.question} className="home-disclosure border-b border-rule">
                <summary className="group flex cursor-pointer items-center justify-between gap-5 py-4 text-sm font-semibold transition-colors hover:text-brass">
                  {item.question}<span className="home-disclosure-arrow shrink-0 text-xs font-normal text-mute" aria-hidden="true">↗</span>
                </summary>
                <p className="max-w-xl pb-5 pr-6 text-xs leading-[1.8] text-mute">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="start-heading" className="flex flex-col justify-between gap-7 border-t border-rule py-10 sm:flex-row sm:items-center sm:gap-8 sm:py-12">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">Before you share it</p>
            <h2 id="start-heading" className="text-2xl font-bold tracking-tight">Give your repository a second look.</h2>
            <p className="mt-2 text-xs leading-relaxed text-mute">Start with the demo, or bring something you’re building.</p>
          </div>
          <Link href={analyzeHref} className="link-act shrink-0 self-start text-sm sm:self-auto">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink"><span className="tri-r" aria-hidden="true" /></span>
            Analyze a repository
          </Link>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-rule py-6 text-[10px] text-mute">
        <p><span className="font-bold tracking-[0.18em] text-ink">SKOPIA</span><span className="ml-3">Project Health Analyzer</span></p>
        <div className="flex items-center gap-7">
          <span className="hidden tracking-[0.5em] text-brass sm:inline" aria-hidden="true">◯ △ ◯ △ ◯</span>
          <span>Rule-based · AI-free core</span>
        </div>
      </footer>
    </div>
  );
}
