import Analyzer from "@/components/Analyzer";

export default function AnalyzePage() {
  return (
    <div className="fadein">
      <header className="border-b border-rule pb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">Analyze</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Scan a repository</h1>
        <p className="mt-2 max-w-xl text-sm text-mute">Files are read as data only — Skopia never runs scripts, installs packages, or executes lifecycle hooks.</p>
      </header>
      <div className="py-12"><Analyzer /></div>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 border-t border-rule pt-5 text-sm text-mute">
        <span>Need a sample?</span>
        <a className="underline decoration-rule underline-offset-4 hover:text-ink" href="/api/demo-zip">demo-project.zip (imperfect)</a>
        <a className="underline decoration-rule underline-offset-4 hover:text-ink" href="/api/demo-zip?fixed=1">demo-project-fixed.zip</a>
      </div>
    </div>
  );
}
