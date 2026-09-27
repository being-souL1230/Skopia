// Skopia deterministic analysis engine. Files are treated strictly as data — nothing is executed.

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category = "dependencies" | "documentation" | "hygiene" | "project";

export interface Finding {
  key: string;
  rule_id: string;
  category: Category;
  severity: Severity;
  title: string;
  path: string;
  line?: number;
  evidence: string;
  why: string;
  impact: string;
  fix: string;
}

export interface DepEntry {
  name: string;
  ecosystem: "npm" | "pypi" | "go" | "cargo" | "composer" | "rubygems" | "jvm" | string;
  dev: boolean;
  status: "used" | "possibly_unused" | "unknown";
  manifest: string;
  usedIn?: string;
}

export interface ReadmeCheck {
  id: string;
  label: string;
  pass: boolean;
  applicable: boolean;
  expected: string;
  rule_id: string;
}

export interface Report {
  project: {
    name: string;
    type: string;
    files_scanned: number;
    manifests: string[];
    readme: string | null;
    ci_cd?: boolean;
    tests_detected?: boolean;
    docker_detected?: boolean;
    loc_total?: number;
  };
  score: number;
  categories: { dependencies: number; documentation: number; hygiene: number };
  deductions: { category: string; rule_id: string; points: number }[];
  findings: Finding[];
  dependencies: DepEntry[];
  readme: {
    score: number;
    checks: ReadmeCheck[];
    commands_verified?: { command: string; status: "valid" | "broken" | "unknown"; note: string }[];
    tables_count?: number;
    broken_links?: string[];
  };
  env: { detected: { name: string; path: string; line: number }[]; documented: string[] };
  secrets_count?: number;
  errors: string[];
}

export interface InputFile { path: string; content: string }

export const IGNORED_DIRS = [
  "node_modules", ".git", "__pycache__", "dist", "build", "coverage", ".next",
  "venv", ".venv", "env", ".tox", "vendor", "out", ".cache", "target", "bin", "obj", ".gradle"
];
const SOURCE_EXT = /\.(m?js|cjs|jsx|ts|tsx|py|go|rs|php|java|kt|rb|cs|c|cpp)$/i;
const JS_EXT = /\.(m?js|cjs|jsx|ts|tsx)$/i;

export function isIgnoredPath(p: string) {
  return p.split("/").some((seg) => IGNORED_DIRS.includes(seg));
}

// Node.js standard library modules (builtins that do not need package.json declaration)
const NODE_STDLIB = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "diagnostics_channel", "dns", "domain", "events", "fs", "fs/promises",
  "http", "http2", "https", "inspector", "module", "net", "os", "path", "path/posix", "path/win32",
  "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream", "stream/promises",
  "stream/web", "string_decoder", "timers", "timers/promises", "tls", "trace_events", "tty",
  "url", "util", "util/types", "v8", "vm", "wasi", "worker_threads", "zlib"
]);

// Python standard library modules
const PY_STDLIB = new Set([
  "abc", "aifc", "argparse", "array", "ast", "asynchat", "asyncio", "asyncore", "atexit",
  "audioop", "base64", "bdb", "binascii", "binhex", "bisect", "builtins", "bz2", "calendar",
  "cgi", "cgitb", "chunk", "cmath", "cmd", "code", "codecs", "codeop", "collections",
  "colorsys", "compileall", "concurrent", "configparser", "contextlib", "contextvars", "copy",
  "copyreg", "cProfile", "crypt", "csv", "ctypes", "curses", "dataclasses", "datetime", "dbm",
  "decimal", "difflib", "dis", "distutils", "doctest", "email", "encodings", "ensurepip",
  "enum", "errno", "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch", "formatter",
  "fpectl", "fractions", "ftplib", "functools", "gc", "getopt", "getpass", "gettext", "glob",
  "graphlib", "grp", "gzip", "hashlib", "heapq", "hmac", "html", "http", "imaplib", "imghdr",
  "imp", "importlib", "inspect", "io", "ipaddress", "itertools", "json", "keyword", "lib2to3",
  "linecache", "locale", "logging", "lzma", "mailbox", "mailcap", "marshal", "math", "mimetypes",
  "mmap", "modulefinder", "msilib", "msvcrt", "multiprocessing", "netrc", "nis", "nntplib",
  "numbers", "operator", "optparse", "os", "ossaudiodev", "parser", "pathlib", "pdb", "pickle",
  "pickletools", "pipes", "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath",
  "pprint", "profile", "pstats", "pty", "pwd", "py_compile", "pyclbr", "pydoc", "queue",
  "quopri", "random", "re", "readline", "reprlib", "resource", "rlcompleter", "runpy", "sched",
  "secrets", "select", "selectors", "shelve", "shlex", "shutil", "signal", "site", "smtpd",
  "smtplib", "sndhdr", "socket", "socketserver", "spwd", "sqlite3", "ssl", "stat", "statistics",
  "string", "stringprep", "struct", "subprocess", "sunau", "symbol", "symtable", "sys",
  "sysconfig", "syslog", "tabnanny", "tarfile", "telnetlib", "tempfile", "termios", "test",
  "textwrap", "threading", "time", "timeit", "tkinter", "token", "tokenize", "tomllib", "trace",
  "traceback", "tracemalloc", "tty", "turtle", "turtledemo", "types", "typing", "unicodedata",
  "unittest", "urllib", "uu", "uuid", "venv", "warnings", "wave", "weakref", "webbrowser",
  "winreg", "winsound", "wsgiref", "xdrlib", "xml", "xmlrpc", "zipapp", "zipfile", "zipimport",
  "zlib", "zoneinfo"
]);

// Import name ↔ package name mapping for common mismatches.
const PY_MAP: Record<string, string[]> = {
  "scikit-learn": ["sklearn"], "pillow": ["PIL"], "beautifulsoup4": ["bs4"], "python-dotenv": ["dotenv"],
  "pyyaml": ["yaml"], "opencv-python": ["cv2"], "opencv-python-headless": ["cv2"], "python-dateutil": ["dateutil"],
  "psycopg2-binary": ["psycopg2"], "psycopg2": ["psycopg2"], "pymongo": ["pymongo", "bson"], "flask-sqlalchemy": ["flask_sqlalchemy"],
  "flask-cors": ["flask_cors"], "flask-login": ["flask_login"], "djangorestframework": ["rest_framework"], "python-jose": ["jose"],
  "pyjwt": ["jwt"], "attrs": ["attr", "attrs"], "google-cloud-storage": ["google.cloud"], "protobuf": ["google.protobuf"],
  "msgpack-python": ["msgpack"], "pycryptodome": ["Crypto"], "python-multipart": ["multipart"],
};

// Packages that are commonly used without imports (CLI tools, runners, type packages).
const PY_TOOLING = new Set(["gunicorn", "uvicorn", "pytest", "black", "flake8", "mypy", "pylint", "isort", "wheel", "setuptools", "pip", "coverage", "tox", "pre-commit", "ruff"]);
const JS_TOOLING = /^(@types\/|eslint|prettier|typescript$|jest$|vitest$|nodemon$|ts-node$|tsx$|webpack|vite$|@vitejs\/|babel|@babel\/|postcss|autoprefixer|tailwindcss|@tailwindcss\/|husky$|lint-staged$|rimraf$|concurrently$|cross-env$|mocha$|chai$|next$|react-scripts$|@next\/|drizzle-kit$|prisma$)/;

// Secret & Token detection signatures for in-code inspection
const SECRET_SIGNATURES: { id: string; name: string; re: RegExp }[] = [
  { id: "SEC-AWS", name: "AWS Access Key ID", re: /\b(AKIA[0-9A-Z]{16})\b/ },
  { id: "SEC-GITHUB", name: "GitHub Personal Access Token", re: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/ },
  { id: "SEC-PRIVATE-KEY", name: "Private RSA/SSH Key", re: /-----BEGIN\s+(?:RSA|OPENSSH|DSA|EC|PGP)?\s*PRIVATE\s+KEY-----/ },
  { id: "SEC-SLACK", name: "Slack Webhook URL", re: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/ },
  { id: "SEC-OPENAI", name: "OpenAI / Anthropic Secret Key", re: /\b(sk-[a-zA-Z0-9]{32,48}|sk-proj-[a-zA-Z0-9_-]{40,})\b/ },
  { id: "SEC-DB-URI", name: "Database URI with hardcoded credentials", re: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[a-zA-Z0-9_.-]+:([a-zA-Z0-9_~!@#$%^&*()-+=.]+?)@[a-zA-Z0-9_.-]+/ },
];

function lineOf(content: string, idx: number) {
  return content.slice(0, idx).split("\n").length;
}

function normPy(n: string) { return n.toLowerCase().replace(/_/g, "-"); }

function redact(str: string): string {
  if (str.length <= 8) return "****";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

const SEV_POINTS: Record<Severity, number> = { critical: 30, high: 20, medium: 10, low: 5, info: 0 };
const RULE_CAP: Record<string, number> = {
  "DEP-001": 40,
  "DEP-006": 30,
  "DEP-007": 15,
  "DOC-010": 25,
  "DOC-011": 20,
  "DOC-012": 15,
  "ENV-001": 20,
  "HYGI-003": 30,
  "HYGI-004": 45,
  "HYGI-005": 50,
  "HYGI-006": 15,
  "HYGI-007": 15,
  "HYGI-008": 15,
  "HYGI-009": 25,
  "HYGI-010": 20,
  "HYGI-011": 15,
  "HYGI-012": 10,
  "HYGI-013": 10,
  "TEST-001": 15,
  "CI-001": 0,
};

export function analyze(name: string, rawFiles: InputFile[]): Report {
  const all = rawFiles.map((f) => ({ ...f, path: f.path.replace(/^\/+/, "") }));
  const files = all.filter((f) => !isIgnoredPath(f.path));
  const allPathsSet = new Set(all.map((f) => f.path.toLowerCase()));
  const filesPathsSet = new Set(files.map((f) => f.path.toLowerCase()));
  const findings: Finding[] = [];
  const errors: string[] = [];

  const add = (f: Omit<Finding, "key">) => {
    findings.push({ ...f, key: `${f.rule_id}:${f.path}:${f.line ?? ""}:${f.evidence}` });
  };
  const byName = (re: RegExp) => files.filter((f) => re.test(f.path.split("/").pop() || ""));
  const rootLevel = (f: InputFile) => !f.path.includes("/");

  // ── Project & Architecture Detector
  const pkgJsons = byName(/^package\.json$/);
  const reqs = byName(/^requirements(-[\w]+)?\.txt$/i);
  const pyprojects = byName(/^pyproject\.toml$/);
  const goMods = byName(/^go\.mod$/);
  const cargoTomls = byName(/^Cargo\.toml$/i);
  const composerJsons = byName(/^composer\.json$/);
  const gemfiles = byName(/^Gemfile$/i);
  const pomXmls = byName(/^(pom\.xml|build\.gradle(\.kts)?)$/i);
  const manifests = [...pkgJsons, ...reqs, ...pyprojects, ...goMods, ...cargoTomls, ...composerJsons, ...gemfiles, ...pomXmls].map((f) => f.path);

  const sources = files.filter((f) => SOURCE_EXT.test(f.path));
  const jsSources = sources.filter((f) => JS_EXT.test(f.path));
  const pySources = sources.filter((f) => /\.py$/i.test(f.path));
  const goSources = sources.filter((f) => /\.go$/i.test(f.path));
  const rustSources = sources.filter((f) => /\.rs$/i.test(f.path));
  const phpSources = sources.filter((f) => /\.php$/i.test(f.path));
  const javaSources = sources.filter((f) => /\.(java|kt)$/i.test(f.path));
  const rubySources = sources.filter((f) => /\.rb$/i.test(f.path));
  const hasTs = sources.some((f) => /\.tsx?$/.test(f.path));

  // Compute Total Lines of Code (LOC)
  const locTotal = sources.reduce((sum, f) => sum + f.content.split("\n").length, 0);

  // CI/CD Workflows
  const ciWorkflows = all.filter((f) => f.path.startsWith(".github/workflows/") || f.path === ".gitlab-ci.yml" || f.path === "Jenkinsfile" || f.path === ".circleci/config.yml");
  const hasCi = ciWorkflows.length > 0;

  // Docker Detection
  const hasDockerfile = all.some((f) => f.path.toLowerCase().includes("dockerfile") || f.path.endsWith("docker-compose.yml") || f.path.endsWith("docker-compose.yaml"));
  const hasDockerignore = all.some((f) => f.path === ".dockerignore");

  // Tests Detection
  const testFiles = all.filter((f) =>
    /(^|\/)tests?\/|(^|\/)__tests__\/|\.(test|spec)\.[a-z0-9]+$|^test_.*\.py$|_test\.py$|_test\.go$|Test.*\.java$/i.test(f.path)
  );
  let testsDetected = testFiles.length > 0;

  const langTypes: string[] = [];
  if (pkgJsons.length || jsSources.length) langTypes.push(hasTs ? "typescript / node" : "javascript / node");
  if (reqs.length || pyprojects.length || pySources.length) langTypes.push("python");
  if (goMods.length || goSources.length) langTypes.push("go");
  if (cargoTomls.length || rustSources.length) langTypes.push("rust");
  if (composerJsons.length || phpSources.length) langTypes.push("php");
  if (pomXmls.length || javaSources.length) langTypes.push("java / jvm");
  if (gemfiles.length || rubySources.length) langTypes.push("ruby");

  let type = "unknown";
  if (langTypes.length === 1) type = langTypes[0];
  else if (langTypes.length > 1) type = `polyglot (${langTypes.join(" + ")})`;

  if (!manifests.length) {
    add({
      rule_id: "PROJ-001",
      category: "project",
      severity: "medium",
      title: "No supported project manifest detected",
      path: "/",
      evidence: "package.json, requirements.txt, go.mod, Cargo.toml, composer.json, Gemfile, pom.xml not found",
      why: "Skopia looks for recognized project manifests (package.json, requirements.txt, go.mod, Cargo.toml, composer.json, Gemfile, pom.xml) to verify declared dependencies.",
      impact: "Dependency health cannot be verified; contributors cannot reproduce the environment.",
      fix: "Add a dependency manifest describing what the project needs to run.",
    });
  }

  if (hasTs) {
    add({
      rule_id: "PROJ-002",
      category: "project",
      severity: "info",
      title: "TypeScript project detected",
      path: "/",
      evidence: `${sources.filter((f) => /\.tsx?$/.test(f.path)).length} .ts/.tsx files`,
      why: "Observation, not a defect.",
      impact: "None.",
      fix: "No action needed.",
    });
  }

  // ── Package Lockfiles Consistency (DEP-007)
  const lockfiles = all.filter((f) => rootLevel(f) && /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/.test(f.path)).map((f) => f.path);
  if (lockfiles.length > 1) {
    add({
      rule_id: "DEP-007",
      category: "dependencies",
      severity: "medium",
      title: "Conflicting package manager lockfiles detected",
      path: lockfiles.join(", "),
      evidence: lockfiles.join(" & "),
      why: `Multiple lockfiles (${lockfiles.join(", ")}) were found at the repository root. This leads to version discrepancies and confusing installation instructions.`,
      impact: "Different team members will install conflicting dependency versions depending on whether they run npm, yarn, or pnpm.",
      fix: `Choose a single package manager (e.g. npm or pnpm), keep its lockfile, and delete the other(s).`,
    });
  }

  // ── Observed Imports Scanner
  const jsImports = new Map<string, string>();
  const addJs = (spec: string, where: string) => {
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:") || spec.startsWith("@/") || spec.startsWith("~")) return;
    const parts = spec.split("/");
    const pkg = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    if (!jsImports.has(pkg)) jsImports.set(pkg, where);
  };
  const jsRe = [
    /\bimport\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s+[\w*{}\s,]+\s+from\s+["']([^"']+)["']/g
  ];
  for (const f of jsSources) {
    for (const re of jsRe) {
      for (const m of f.content.matchAll(re)) addJs(m[1], `${f.path}:${lineOf(f.content, m.index!)}`);
    }
  }

  const configText = files.filter((f) => /(\.config\.(js|cjs|mjs|ts)|\.babelrc|\.eslintrc.*|tsconfig\.json)$/.test(f.path)).map((f) => f.content).join("\n");

  const pyImports = new Map<string, string>();
  for (const f of pySources) {
    for (const m of f.content.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/gm)) {
      const mods = m[1] ? [m[1]] : m[2].split(",").map((s) => s.trim().split(/\s+/)[0]);
      for (const mod of mods) {
        if (!mod || mod.startsWith(".")) continue;
        const where = `${f.path}:${lineOf(f.content, m.index!)}`;
        const top = mod.split(".")[0];
        if (!pyImports.has(top)) pyImports.set(top, where);
        const two = mod.split(".").slice(0, 2).join(".");
        if (!pyImports.has(two)) pyImports.set(two, where);
      }
    }
  }

  const ignoredSources = all.filter((f) => isIgnoredPath(f.path) && SOURCE_EXT.test(f.path));
  const deps: DepEntry[] = [];
  const declaredJsPackages = new Set<string>();
  const allScripts: Record<string, string> = {};

  // ── package.json Manifest Analysis
  for (const pj of pkgJsons) {
    let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
    try {
      parsed = JSON.parse(pj.content);
    } catch (e) {
      errors.push(`${pj.path}: ${(e as Error).message}`);
      add({
        rule_id: "DEP-003",
        category: "dependencies",
        severity: "high",
        title: "Dependency manifest could not be parsed",
        path: pj.path,
        evidence: (e as Error).message,
        why: "The file is not valid JSON, so declared dependencies are unknown. Skopia does not guess.",
        impact: "Installers will fail and dependency analysis is skipped.",
        fix: "Fix the JSON syntax in package.json.",
      });
      continue;
    }

    if (parsed.scripts) {
      Object.assign(allScripts, parsed.scripts);
      if (parsed.scripts.test && !parsed.scripts.test.includes("no test specified")) {
        testsDetected = true;
      }
    }

    const scripts = Object.values(parsed.scripts || {}).join(" ");
    const entries: [string, boolean][] = [
      ...Object.keys(parsed.dependencies || {}).map((n) => [n, false] as [string, boolean]),
      ...Object.keys(parsed.devDependencies || {}).map((n) => [n, true] as [string, boolean])
    ];

    for (const [dep, dev] of entries) {
      declaredJsPackages.add(dep);
      const usedIn = jsImports.get(dep);
      const tooling = JS_TOOLING.test(dep) || scripts.includes(dep.replace(/^@[^/]+\//, "")) || configText.includes(dep);
      let status: DepEntry["status"] = usedIn ? "used" : tooling ? "unknown" : "possibly_unused";
      if (!usedIn && !tooling && jsSources.length === 0) status = "unknown";
      deps.push({ name: dep, ecosystem: "npm", dev, status, manifest: pj.path, usedIn: usedIn || (tooling ? "tooling / config / scripts" : undefined) });

      if (status === "possibly_unused") {
        const onlyIgnored = ignoredSources.some((f) => f.content.includes(`'${dep}'`) || f.content.includes(`"${dep}"`));
        add({
          rule_id: "DEP-001",
          category: "dependencies",
          severity: dev ? "low" : "medium",
          title: "Possibly unused dependency",
          path: pj.path,
          evidence: dep,
          why: `No import, require() or dynamic import of "${dep}" was found across ${jsSources.length} JS/TS source files.${onlyIgnored ? " A reference exists only inside ignored/generated folders (DEP-004), which is not counted." : ""}`,
          impact: "Unused packages bloat installs, widen the attack surface and confuse contributors.",
          fix: `Verify whether ${dep} is still required; if not, run npm uninstall ${dep}.`,
        });
      }

      if (dev && usedIn && !/(test|spec|__tests__|\.config\.|scripts\/)/.test(usedIn)) {
        add({
          rule_id: "DEP-005",
          category: "dependencies",
          severity: "low",
          title: "devDependency referenced by runtime source",
          path: pj.path,
          evidence: `${dep} → ${usedIn}`,
          why: `"${dep}" is listed in devDependencies but imported from application code.`,
          impact: "Production installs (npm ci --omit=dev) may break. Flagged for review, not declared wrong.",
          fix: `Review whether ${dep} should move to dependencies.`,
        });
      }
    }
  }

  // ── Undeclared JS Dependencies Scanner (DEP-006)
  if (pkgJsons.length > 0) {
    for (const [pkg, loc] of jsImports.entries()) {
      if (!NODE_STDLIB.has(pkg) && !declaredJsPackages.has(pkg)) {
        // Check if package is a workspace package or local alias
        const isLocalAlias = pkg.startsWith("@/") || pkg === "src" || pkg === "lib" || pkg === "app";
        if (!isLocalAlias && !loc.includes("node_modules")) {
          add({
            rule_id: "DEP-006",
            category: "dependencies",
            severity: "high",
            title: "Undeclared dependency used in source code",
            path: loc.split(":")[0],
            line: Number(loc.split(":")[1]) || undefined,
            evidence: pkg,
            why: `"${pkg}" is imported at ${loc}, but is not declared in package.json dependencies or devDependencies.`,
            impact: "Collaborators and CI builds will fail with 'MODULE_NOT_FOUND' upon a fresh git clone.",
            fix: `Run "npm install ${pkg}" (or npm install --save-dev ${pkg}) to add it to package.json.`,
          });
        }
      }
    }
  }

  // ── requirements.txt / pyproject Manifest Analysis
  const pyDeclared: { name: string; manifest: string }[] = [];
  for (const rq of reqs) {
    for (const raw of rq.content.split("\n")) {
      const l = raw.replace(/#.*/, "").trim();
      if (!l || l.startsWith("-")) continue;
      const m = l.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
      if (m) pyDeclared.push({ name: m[1], manifest: rq.path });
    }
  }
  for (const pp of pyprojects) {
    const block = pp.content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (block) for (const m of block[1].matchAll(/["']([A-Za-z0-9][A-Za-z0-9._-]*)/g)) pyDeclared.push({ name: m[1], manifest: pp.path });
    const poetry = pp.content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\n\[|$)/);
    if (poetry) for (const m of poetry[1].matchAll(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*=/gm)) if (m[1] !== "python") pyDeclared.push({ name: m[1], manifest: pp.path });
  }

  const pyImportNorm = new Map([...pyImports.entries()].map(([k, v]) => [k.toLowerCase(), v]));
  const pyDeclaredCandidates = new Set<string>();

  for (const { name: dep, manifest } of pyDeclared) {
    const n = normPy(dep);
    const candidates = PY_MAP[n] || [dep, dep.replace(/-/g, "_"), n.replace(/-/g, "_")];
    candidates.forEach((c) => pyDeclaredCandidates.add(c.toLowerCase()));
    const hit = candidates.map((c) => pyImportNorm.get(c.toLowerCase())).find(Boolean);
    const tooling = PY_TOOLING.has(n);
    let status: DepEntry["status"] = hit ? "used" : tooling ? "unknown" : "possibly_unused";
    if (!hit && pySources.length === 0) status = "unknown";
    deps.push({ name: dep, ecosystem: "pypi", dev: false, status, manifest, usedIn: hit || (tooling ? "CLI / tooling package" : undefined) });

    if (status === "possibly_unused") {
      add({
        rule_id: "DEP-001",
        category: "dependencies",
        severity: "medium",
        title: "Possibly unused dependency",
        path: manifest,
        evidence: dep,
        why: `No "import ${candidates[0]}" or "from ${candidates[0]} import" found across ${pySources.length} Python files. Import names can differ from package names, so this is "possibly" unused.`,
        impact: "Unused packages slow installs and add maintenance burden.",
        fix: `Verify whether ${dep} is still required; remove it from ${manifest} if not.`,
      });
    }
  }

  // ── Undeclared Python Dependencies Scanner (DEP-006)
  if (reqs.length > 0 || pyprojects.length > 0) {
    const localPyFiles = new Set(pySources.map((f) => f.path.split("/").pop()?.replace(/\.py$/, "").toLowerCase()));
    for (const [topMod, loc] of pyImports.entries()) {
      const topLower = topMod.toLowerCase();
      if (!PY_STDLIB.has(topLower) && !pyDeclaredCandidates.has(topLower) && !localPyFiles.has(topLower)) {
        add({
          rule_id: "DEP-006",
          category: "dependencies",
          severity: "high",
          title: "Undeclared Python library used in source code",
          path: loc.split(":")[0],
          line: Number(loc.split(":")[1]) || undefined,
          evidence: topMod,
          why: `"${topMod}" is imported at ${loc}, but is not declared in requirements.txt or pyproject.toml.`,
          impact: "Running this project on another machine will fail with ModuleNotFoundError.",
          fix: `Add ${topMod} to requirements.txt or pyproject.toml.`,
        });
      }
    }
  }

  // ── Go Module Analysis (go.mod)
  const goDeclared: { name: string; manifest: string }[] = [];
  const goModuleNames = goMods.map((gm) => gm.content.match(/^module\s+([^\s\r\n]+)/m)?.[1]).filter(Boolean) as string[];

  for (const gm of goMods) {
    const blockMatch = gm.content.match(/require\s*\(([\s\S]*?)\)/);
    if (blockMatch) {
      for (const line of blockMatch[1].split("\n")) {
        const clean = line.replace(/\/\/.*$/, "").trim();
        const parts = clean.split(/\s+/);
        if (parts[0] && parts[0].includes("/")) {
          goDeclared.push({ name: parts[0], manifest: gm.path });
        }
      }
    }
    for (const m of gm.content.matchAll(/^require\s+([^\s()]+)\s+[^\s]+/gm)) {
      if (m[1] && m[1].includes("/")) {
        goDeclared.push({ name: m[1], manifest: gm.path });
      }
    }
  }

  const goImports = new Map<string, string>();
  for (const f of goSources) {
    for (const m of f.content.matchAll(/import\s+(?:[a-zA-Z0-9_]+\s+)?"([^"]+)"/g)) {
      if (!goImports.has(m[1])) goImports.set(m[1], `${f.path}:${lineOf(f.content, m.index!)}`);
    }
    for (const block of f.content.matchAll(/import\s*\(([\s\S]*?)\)/g)) {
      for (const m of block[1].matchAll(/(?:[a-zA-Z0-9_]+\s+)?"([^"]+)"/g)) {
        if (!goImports.has(m[1])) goImports.set(m[1], `${f.path}:${lineOf(f.content, block.index!)}`);
      }
    }
  }

  for (const { name: dep, manifest } of goDeclared) {
    const hit = [...goImports.keys()].find((imp) => imp === dep || imp.startsWith(dep + "/"));
    const usedIn = hit ? goImports.get(hit) : undefined;
    const status = hit ? "used" : "possibly_unused";
    deps.push({ name: dep, ecosystem: "go", dev: false, status, manifest, usedIn });
    if (status === "possibly_unused" && goSources.length > 0) {
      add({
        rule_id: "DEP-001",
        category: "dependencies",
        severity: "medium",
        title: "Possibly unused Go module",
        path: manifest,
        evidence: dep,
        why: `No import matching "${dep}" found across ${goSources.length} Go source files.`,
        impact: "Unused modules bloat go.sum and vendor caches.",
        fix: `Run "go mod tidy" to clean up unused modules.`,
      });
    }
  }

  for (const [imp, loc] of goImports.entries()) {
    const isExternal = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\//.test(imp);
    const isSelf = goModuleNames.some((m) => imp === m || imp.startsWith(m + "/"));
    if (isExternal && !isSelf && goDeclared.length > 0) {
      const isDeclared = goDeclared.some((d) => imp === d.name || imp.startsWith(d.name + "/"));
      if (!isDeclared) {
        add({
          rule_id: "DEP-006",
          category: "dependencies",
          severity: "high",
          title: "Undeclared Go module imported in source code",
          path: loc.split(":")[0],
          line: Number(loc.split(":")[1]) || undefined,
          evidence: imp,
          why: `"${imp}" is imported at ${loc}, but is not declared in go.mod.`,
          impact: "Building on another machine will fail or require dynamic network resolution.",
          fix: `Run "go get ${imp.split("/").slice(0, 3).join("/")}" and "go mod tidy".`,
        });
      }
    }
  }

  // ── Rust Cargo Analysis (Cargo.toml)
  const rustDeclared: { name: string; manifest: string; dev: boolean }[] = [];
  for (const ct of cargoTomls) {
    const parseSection = (section: string, dev: boolean) => {
      const block = ct.content.match(new RegExp(`\\[${section}\\]([\\s\\S]*?)(\\n\\[|$)`));
      if (block) {
        for (const line of block[1].split("\n")) {
          const clean = line.replace(/#.*$/, "").trim();
          const m = clean.match(/^([a-zA-Z0-9_-]+)\s*=/);
          if (m) rustDeclared.push({ name: m[1], manifest: ct.path, dev });
        }
      }
    };
    parseSection("dependencies", false);
    parseSection("dev-dependencies", true);
  }

  const rustImports = new Set<string>();
  for (const f of rustSources) {
    for (const m of f.content.matchAll(/(?:use\s+|extern\s+crate\s+)([a-zA-Z0-9_]+)/g)) {
      rustImports.add(m[1].toLowerCase());
    }
  }

  for (const { name: dep, manifest, dev } of rustDeclared) {
    const normName = dep.toLowerCase().replace(/-/g, "_");
    const hit = rustImports.has(normName) || rustImports.has(dep.toLowerCase());
    const status = hit ? "used" : "possibly_unused";
    deps.push({ name: dep, ecosystem: "cargo", dev, status, manifest, usedIn: hit ? "use statement" : undefined });
    if (status === "possibly_unused" && rustSources.length > 0) {
      add({
        rule_id: "DEP-001",
        category: "dependencies",
        severity: dev ? "low" : "medium",
        title: "Possibly unused Cargo crate",
        path: manifest,
        evidence: dep,
        why: `No "use ${normName}" or "extern crate ${normName}" found across ${rustSources.length} Rust source files.`,
        impact: "Unused crates increase compile time and binary size.",
        fix: `Remove "${dep}" from [${dev ? "dev-" : ""}dependencies] in Cargo.toml.`,
      });
    }
  }

  // ── PHP Composer Analysis (composer.json)
  for (const cj of composerJsons) {
    try {
      const parsed = JSON.parse(cj.content);
      const req = parsed.require || {};
      const reqDev = parsed["require-dev"] || {};
      for (const [dep, dev] of [
        ...Object.keys(req).map((k) => [k, false] as [string, boolean]),
        ...Object.keys(reqDev).map((k) => [k, true] as [string, boolean]),
      ]) {
        if (dep === "php" || dep.startsWith("ext-")) continue;
        deps.push({ name: dep, ecosystem: "composer", dev, status: "unknown", manifest: cj.path, usedIn: "PHP package" });
      }
    } catch {}
  }

  // ── Ruby Bundler Analysis (Gemfile)
  for (const gf of gemfiles) {
    for (const m of gf.content.matchAll(/^\s*gem\s+["']([a-zA-Z0-9_-]+)["']/gm)) {
      deps.push({ name: m[1], ecosystem: "rubygems", dev: false, status: "unknown", manifest: gf.path, usedIn: "Ruby gem" });
    }
  }

  // ── JVM Maven / Gradle Analysis (pom.xml)
  for (const p of pomXmls) {
    for (const m of p.content.matchAll(/<artifactId>([a-zA-Z0-9_.-]+)<\/artifactId>/g)) {
      if (!["maven-compiler-plugin", "maven-surefire-plugin"].includes(m[1])) {
        deps.push({ name: m[1], ecosystem: "jvm", dev: false, status: "unknown", manifest: p.path, usedIn: "Maven artifact" });
      }
    }
  }

  // ── README Doctor & In-Depth Content Analyzer
  const readmes = files.filter((f) => /^readme(\.(md|markdown|rst|txt))?$/i.test(f.path.split("/").pop() || "")).sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  const readme = readmes[0];
  const rd = readme?.content || "";
  const headings = [...rd.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].toLowerCase());
  const hasHeading = (re: RegExp) => headings.some((h) => re.test(h));

  // Extract environment variable references in code
  const envNames = new Map<string, { path: string; line: number }>();
  for (const f of jsSources) {
    for (const m of f.content.matchAll(/process\.env(?:\.([A-Z_][A-Z0-9_]*)|\[\s*["']([A-Z_][A-Z0-9_]*)["']\s*\])/g)) {
      const n = m[1] || m[2];
      if (n !== "NODE_ENV" && !envNames.has(n)) envNames.set(n, { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of jsSources) {
    for (const m of f.content.matchAll(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g)) {
      if (!["MODE", "DEV", "PROD", "SSR", "BASE_URL"].includes(m[1]) && !envNames.has(m[1])) envNames.set(m[1], { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of pySources) {
    for (const m of f.content.matchAll(/os\.(?:getenv|environ\.get)\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']|os\.environ\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/g)) {
      const n = m[1] || m[2];
      if (!envNames.has(n)) envNames.set(n, { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of goSources) {
    for (const m of f.content.matchAll(/os\.(?:Getenv|LookupEnv)\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
      if (!envNames.has(m[1])) envNames.set(m[1], { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of rustSources) {
    for (const m of f.content.matchAll(/(?:std::env::var|env::var|dotenv!)\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
      if (!envNames.has(m[1])) envNames.set(m[1], { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of phpSources) {
    for (const m of f.content.matchAll(/(?:\$_ENV\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]|getenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\))/g)) {
      const n = m[1] || m[2];
      if (n && !envNames.has(n)) envNames.set(n, { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of javaSources) {
    for (const m of f.content.matchAll(/System\.getenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
      if (!envNames.has(m[1])) envNames.set(m[1], { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }
  for (const f of rubySources) {
    for (const m of f.content.matchAll(/ENV\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
      if (!envNames.has(m[1])) envNames.set(m[1], { path: f.path, line: lineOf(f.content, m.index!) });
    }
  }

  // ── README Table Parsing & Validation (DOC-012)
  let tablesCount = 0;
  const tableVarsFound = new Set<string>();
  const tableRegex = /^\|(.+)\|[ \t]*\r?\n\|(?:[-:| ]+)\|[ \t]*\r?\n((?:\|.+\|[ \t]*\r?\n?)+)/gm;
  for (const m of rd.matchAll(tableRegex)) {
    tablesCount++;
    const headers = m[1].split("|").map((h) => h.trim().toLowerCase());
    const bodyRows = m[2].trim().split("\n");
    const isEnvTable = headers.some((h) => /var|env|name|config|parameter|key/i.test(h));
    for (const row of bodyRows) {
      const cols = row.split("|").filter(Boolean).map((c) => c.trim().replace(/[`*]/g, ""));
      if (isEnvTable && cols[0]) {
        tableVarsFound.add(cols[0]);
      }
    }
  }

  // ── README Command & Script Cross-Check (DOC-010)
  const commandsVerified: { command: string; status: "valid" | "broken" | "unknown"; note: string }[] = [];
  const codeBlocks = [...rd.matchAll(/```(?:bash|sh|shell|zsh|console)?\s*\n([\s\S]*?)```/gi)];
  for (const block of codeBlocks) {
    const lines = block[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    for (const cmdLine of lines) {
      // Check npm run <script> or npm test / npm start
      const npmRunMatch = cmdLine.match(/^(?:\$|#|>)?\s*(?:npm run|pnpm run|yarn run|pnpm|yarn)\s+([a-zA-Z0-9_:-]+)/);
      const npmDirectMatch = cmdLine.match(/^(?:\$|#|>)?\s*npm\s+(start|test|build|dev|lint|serve)\b/);
      const scriptName = npmRunMatch?.[1] || npmDirectMatch?.[1];

      if (scriptName && !["install", "i", "ci", "init"].includes(scriptName)) {
        const exists =
          scriptName in allScripts ||
          (scriptName === "test" && "test" in allScripts) ||
          (scriptName === "start" && "start" in allScripts);
        if (pkgJsons.length > 0 && !exists) {
          commandsVerified.push({ command: cmdLine, status: "broken", note: `Script "${scriptName}" is not defined in package.json` });
          add({
            rule_id: "DOC-010",
            category: "documentation",
            severity: "medium",
            title: `README cites non-existent npm script: "${scriptName}"`,
            path: readme?.path || "README.md",
            evidence: cmdLine,
            why: `README instructs running "${cmdLine}", but "${scriptName}" is not defined in package.json scripts.`,
            impact: "New contributors following README instructions will immediately encounter 'npm ERR! Missing script'.",
            fix: `Add "${scriptName}" to package.json "scripts" or correct the command in README.md.`,
          });
        } else {
          commandsVerified.push({ command: cmdLine, status: "valid", note: `Defined in package.json` });
        }
      }

      // Check python <script.py> or node <script.js>
      const fileExecMatch = cmdLine.match(/^(?:\$|#|>)?\s*(?:python[3]?|node|ts-node|tsx)\s+([a-zA-Z0-9_./-]+\.(?:py|js|ts|mjs|cjs))/);
      if (fileExecMatch) {
        const scriptPath = fileExecMatch[1].replace(/^\.\//, "");
        const scriptExists = allPathsSet.has(scriptPath.toLowerCase()) || filesPathsSet.has(scriptPath.toLowerCase());
        if (!scriptExists) {
          commandsVerified.push({ command: cmdLine, status: "broken", note: `File "${scriptPath}" not found in repository` });
          add({
            rule_id: "DOC-010",
            category: "documentation",
            severity: "medium",
            title: `README references missing script entrypoint: "${scriptPath}"`,
            path: readme?.path || "README.md",
            evidence: cmdLine,
            why: `README instructs running "${cmdLine}", but "${scriptPath}" does not exist in the repository.`,
            impact: "Running this command results in 'file not found' error for new developers.",
            fix: `Create "${scriptPath}" or update the entrypoint path in README.`,
          });
        } else {
          commandsVerified.push({ command: cmdLine, status: "valid", note: `File exists in repository` });
        }
      }
    }
  }

  // ── Broken Relative Media & File Links in README (DOC-011)
  const brokenLinks: string[] = [];
  const linkMatches = [...rd.matchAll(/(?:!\[.*?\]|\[.*?\])\(([^)]+)\)/g)];
  for (const lm of linkMatches) {
    const rawLink = lm[1].trim();
    if (!rawLink.startsWith("http://") && !rawLink.startsWith("https://") && !rawLink.startsWith("mailto:") && !rawLink.startsWith("#") && !rawLink.startsWith("//")) {
      const cleanPath = rawLink.split("#")[0].split("?")[0].replace(/^\.\//, "").toLowerCase();
      if (cleanPath && !allPathsSet.has(cleanPath)) {
        brokenLinks.push(rawLink);
        add({
          rule_id: "DOC-011",
          category: "documentation",
          severity: "low",
          title: "Broken relative file or image link in README",
          path: readme?.path || "README.md",
          evidence: rawLink,
          why: `README references "${rawLink}", but no matching file exists in the repository.`,
          impact: "Images will fail to display and doc links result in broken 404 navigation.",
          fix: `Check the file path for "${rawLink}" or commit the missing asset.`,
        });
      }
    }
  }

  const apiIndicators = sources.some((f) => /(app|router)\.(get|post|put|delete|patch)\(\s*["'`]\/|@app\.route\(|@(app|router)\.(get|post|put|delete)\(|express\(\)|FastAPI\(|Flask\(__name__\)/.test(f.content)) || files.some((f) => /\/api\//.test(f.path) && SOURCE_EXT.test(f.path));
  const isUi = files.some((f) => /\.(html|jsx|tsx|vue|svelte|css)$/.test(f.path));
  const hasLicenseFile = files.some((f) => rootLevel(f) && /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f.path));
  const firstBlock = rd.replace(/^#\s+.*$/m, "").split(/^#{1,6}\s/m)[0].replace(/!\[.*?\]\(.*?\)|<[^>]+>|\[!\[.*?\)\]\(.*?\)/g, "").trim();

  const checks: ReadmeCheck[] = [
    { id: "exists", label: "README present", rule_id: "DOC-001", applicable: true, pass: !!readme, expected: "A README.md (or README.rst / README.txt) at the repository root." },
    { id: "description", label: "Description", rule_id: "DOC-002", applicable: !!readme, pass: firstBlock.split(/\s+/).filter(Boolean).length >= 12, expected: "At least one sentence (~12+ words) under the title explaining what the project does and for whom." },
    { id: "features", label: "Features", rule_id: "DOC-009", applicable: !!readme, pass: hasHeading(/feature|what it does|highlights|overview/), expected: "A 'Features' or 'Overview' heading listing key capabilities." },
    { id: "installation", label: "Installation", rule_id: "DOC-003", applicable: !!readme, pass: hasHeading(/install|setup|set up|getting started|quick ?start/) && /(npm|yarn|pnpm|pip|poetry|git clone|docker|uv )/i.test(rd), expected: "An 'Installation' / 'Getting started' heading with concrete commands (e.g. git clone, npm install, pip install -r requirements.txt)." },
    { id: "usage", label: "Usage", rule_id: "DOC-004", applicable: !!readme, pass: hasHeading(/usage|run|how to use|example|running/), expected: "A 'Usage' heading showing how to start or use the project, ideally with a code example." },
    { id: "configuration", label: "Configuration", rule_id: "DOC-005", applicable: !!readme && envNames.size > 0, pass: hasHeading(/config|environment|env|settings|variables/) || tablesCount > 0, expected: "A 'Configuration' / 'Environment variables' section or table." },
    { id: "api", label: "API", rule_id: "DOC-006", applicable: !!readme && apiIndicators, pass: hasHeading(/api|endpoint|routes|reference/), expected: "An 'API' section listing endpoints, methods and payloads." },
    { id: "screenshots", label: "Screenshots", rule_id: "DOC-007", applicable: !!readme && isUi, pass: /!\[.*?\]\(.*?\)|<img\s/i.test(rd) || hasHeading(/screenshot|demo|preview/), expected: "At least one image or screenshot reference — relevant because UI files were detected." },
    { id: "license", label: "License", rule_id: "DOC-008", applicable: true, pass: hasHeading(/licen[cs]e/) || hasLicenseFile, expected: "A 'License' heading in the README or a LICENSE file at the root." },
  ];

  const docMeta: Record<string, { sev: Severity; title: string; impact: string; fix: string }> = {
    "DOC-001": { sev: "high", title: "README not found", impact: "New contributors and reviewers have no entry point to the project.", fix: "Create README.md with description, installation and usage." },
    "DOC-002": { sev: "medium", title: "Project description missing or too short", impact: "Visitors cannot quickly tell what the project does.", fix: "Add 1–3 sentences under the title describing purpose and audience." },
    "DOC-009": { sev: "low", title: "Features section missing", impact: "Capabilities are not discoverable at a glance.", fix: "Add a '## Features' list." },
    "DOC-003": { sev: "medium", title: "Installation instructions missing", impact: "Contributors cannot set the project up reliably.", fix: "Add '## Installation' with exact commands." },
    "DOC-004": { sev: "medium", title: "Usage instructions missing", impact: "Users do not know how to run the project after installing.", fix: "Add '## Usage' with a run command and example." },
    "DOC-005": { sev: "medium", title: "Configuration documentation missing", impact: "Required environment setup is invisible to newcomers.", fix: "Add '## Configuration' listing every environment variable." },
    "DOC-006": { sev: "low", title: "API documentation missing", impact: "Consumers must read source to learn endpoints.", fix: "Add '## API' listing endpoints, methods and example payloads." },
    "DOC-007": { sev: "low", title: "Screenshots missing", impact: "UI projects are harder to evaluate without visuals.", fix: "Add a screenshot: ![Screenshot](screenshots/home.png)." },
    "DOC-008": { sev: "low", title: "License information missing", impact: "Others cannot legally reuse the project.", fix: "Add a '## License' section or LICENSE file." },
  };

  for (const c of checks) {
    if (!c.applicable || c.pass) continue;
    if (!readme && c.rule_id !== "DOC-001" && c.rule_id !== "DOC-008") continue;
    const meta = docMeta[c.rule_id];
    add({ rule_id: c.rule_id, category: "documentation", severity: meta.sev, title: meta.title, path: readme?.path || "README.md", evidence: c.rule_id === "DOC-002" ? `"${firstBlock.slice(0, 80) || "(empty)"}"` : `Expected: ${c.label}`, why: c.expected, impact: meta.impact, fix: meta.fix });
  }

  const applicable = checks.filter((c) => c.applicable);
  const readmeScore = Math.round((applicable.filter((c) => c.pass).length / Math.max(1, applicable.length)) * 100);

  // ── Environment Checker
  const docText = rd + "\n" + files.filter((f) => /(\.env\.example|\.env\.sample|\.env\.template|env\.example)$/i.test(f.path)).map((f) => f.content).join("\n");
  const documented: string[] = [];
  for (const [n, loc] of envNames) {
    if (new RegExp(`\\b${n}\\b`).test(docText) || tableVarsFound.has(n)) {
      documented.push(n);
      continue;
    }
    add({
      rule_id: "ENV-001",
      category: "documentation",
      severity: "medium",
      title: "Environment variable used but not documented",
      path: loc.path,
      line: loc.line,
      evidence: n,
      why: `${n} is read at ${loc.path}:${loc.line} but is not mentioned in the README or a .env.example file.`,
      impact: "New contributors will hit runtime errors or silent misconfiguration.",
      fix: `Document ${n} in the README configuration section or add it to .env.example.`,
    });
  }

  // ── In-Code Secret & Credential Leaks (HYGI-005)
  let secretsDetectedCount = 0;
  for (const f of all) {
    // Skip example templates and mock test fixtures
    if (/(\.example|\.sample|\.template|mock|test_fixtures)/i.test(f.path) || f.path.startsWith("tests/")) continue;
    const lines = f.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (/TODO|replace_me|your[-_]key|change[-_]me|example|dummy/i.test(lineText)) continue;
      for (const sig of SECRET_SIGNATURES) {
        const match = lineText.match(sig.re);
        if (match) {
          secretsDetectedCount++;
          const secretToken = match[1] || match[0];
          add({
            rule_id: "HYGI-005",
            category: "hygiene",
            severity: "critical",
            title: `Hardcoded ${sig.name} detected in source`,
            path: f.path,
            line: i + 1,
            evidence: redact(secretToken),
            why: `Detected a concrete ${sig.name} written directly inside ${f.path}:${i + 1}.`,
            impact: "Exposed API keys and credentials can be scraped within minutes of being committed, leading to compromise or unauthorized billing.",
            fix: `Immediately revoke/rotate this key, remove it from code, and load it via process.env or secret manager.`,
          });
          break;
        }
      }
    }
  }

  // ── Repository Hygiene & Tracking
  const gitignore = files.find((f) => f.path === ".gitignore");
  if (!gitignore) {
    add({
      rule_id: "HYGI-001",
      category: "hygiene",
      severity: "medium",
      title: ".gitignore missing",
      path: "/",
      evidence: ".gitignore not found at root",
      why: "No root .gitignore was found.",
      impact: "Build output, dependencies and secrets are easily committed.",
      fix: "Add a .gitignore (e.g. from github/gitignore for Node or Python).",
    });
  }

  if (!hasLicenseFile) {
    add({
      rule_id: "HYGI-002",
      category: "hygiene",
      severity: "low",
      title: "LICENSE file missing",
      path: "/",
      evidence: "No LICENSE / COPYING file at root",
      why: "No license file at repository root.",
      impact: "Default copyright applies; reuse is legally unclear.",
      fix: "Add a LICENSE file (MIT, Apache-2.0, …).",
    });
  }

  const giText = gitignore?.content || "";
  const presentGenerated = new Set(all.map((f) => f.path.split("/")[0]).filter((d) => ["node_modules", "dist", "build", "coverage", "__pycache__", ".next", "venv", ".venv"].includes(d)));
  for (const d of presentGenerated) {
    if (!new RegExp(`(^|/)${d.replace(".", "\\.")}/?\\s*$`, "m").test(giText)) {
      add({
        rule_id: "HYGI-003",
        category: "hygiene",
        severity: "medium",
        title: "Generated directory appears not to be ignored",
        path: `${d}/`,
        evidence: `${d}/ present in archive, not in .gitignore`,
        why: `The folder ${d}/ is included and .gitignore does not list it.`,
        impact: "Repository size grows and diffs become noisy.",
        fix: `Add "${d}/" to .gitignore and remove it from version control.`,
      });
    }
  }

  // Tracked sensitive files (HYGI-004)
  for (const f of all.filter((f) => !f.path.includes("node_modules/"))) {
    const base = f.path.split("/").pop() || "";
    if (/^\.env(\.(local|production|development|prod|dev))?$/.test(base) || /^(id_rsa|id_ed25519)$/.test(base) || /\.(pem|key|p12|pfx)$/.test(base) || /^(credentials|service-account).*\.json$/i.test(base)) {
      add({
        rule_id: "HYGI-004",
        category: "hygiene",
        severity: "critical",
        title: "Secret or config file appears tracked",
        path: f.path,
        evidence: base,
        why: `${f.path} matches a common secret/config filename pattern.`,
        impact: "Credentials may be leaked to anyone with repository access.",
        fix: `Remove ${base} from the repo, rotate any credentials, and add it to .gitignore.`,
      });
    }
  }

  // Docker Hygiene (HYGI-006)
  if (hasDockerfile && !hasDockerignore) {
    add({
      rule_id: "HYGI-006",
      category: "hygiene",
      severity: "low",
      title: "Dockerfile present without .dockerignore",
      path: ".dockerignore",
      evidence: "Dockerfile present, .dockerignore missing",
      why: "When building container images without a .dockerignore, local node_modules, .git, and .env files are sent to the Docker daemon.",
      impact: "Slows down builds, bloats image size, and risks packaging secret keys into final Docker layers.",
      fix: "Create a .dockerignore file excluding node_modules, .git, .env*, dist, and logs.",
    });
  }

  // Codebase Maintainability: Empty source files (HYGI-007)
  const emptyFiles = sources.filter((f) => f.content.trim().length === 0);
  if (emptyFiles.length > 0) {
    add({
      rule_id: "HYGI-007",
      category: "hygiene",
      severity: "low",
      title: "Empty source files detected in repository",
      path: emptyFiles[0].path,
      evidence: `${emptyFiles.length} empty file(s): ${emptyFiles.slice(0, 3).map((f) => f.path).join(", ")}`,
      why: "Empty files clutter the project tree and often indicate unfinished work or forgotten placeholders.",
      impact: "Reduces code cleanliness and can confuse onboarding developers.",
      fix: "Implement the file or delete the empty placeholder.",
    });
  }

  // Monolithic files check (HYGI-008)
  for (const f of sources) {
    const lineCount = f.content.split("\n").length;
    if (lineCount > 1200) {
      add({
        rule_id: "HYGI-008",
        category: "hygiene",
        severity: "low",
        title: "Oversized monolithic file (> 1,200 lines)",
        path: f.path,
        evidence: `${lineCount} lines`,
        why: `${f.path} contains ${lineCount} lines of code. Massive files violate separation of concerns.`,
        impact: "Higher cognitive load, harder code reviews, and frequent merge conflicts.",
        fix: "Refactor this file into smaller, modular sub-components or utility modules.",
      });
      break;
    }
  }

  // Automated Tests Detection (TEST-001)
  if (!testsDetected && sources.length > 3) {
    add({
      rule_id: "TEST-001",
      category: "hygiene",
      severity: "low",
      title: "No automated test suite detected",
      path: "/",
      evidence: "No test files (*.test.*, tests/) or test runner script found",
      why: "No automated tests were found for this codebase.",
      impact: "Refactoring and new features carry higher risk of regressions.",
      fix: "Add basic unit tests using Jest, Vitest, Pytest, or Node test runner.",
    });
  }

  // CI/CD Workflow (CI-001)
  if (!hasCi && (pkgJsons.length > 0 || reqs.length > 0)) {
    add({
      rule_id: "CI-001",
      category: "hygiene",
      severity: "info",
      title: "No Continuous Integration (CI/CD) workflow configured",
      path: ".github/workflows/",
      evidence: "No GitHub Actions or CI pipeline detected",
      why: "CI pipelines automate linting, tests, and build verification on pull requests.",
      impact: "Verification must be performed manually before merging.",
      fix: "Add a simple GitHub Action workflow in .github/workflows/ci.yml.",
    });
  }

  // ── Code Safety & Quality Rules (HYGI-009 to HYGI-013)

  const nonTestSources = sources.filter((f) => !/(^|\/)tests?\/|(^|\/)__tests__\/|\.(test|spec)\.[a-z0-9]+$/i.test(f.path));

  // Dangerous Code Execution: eval / new Function / exec / pickle.loads (HYGI-009)
  for (const f of nonTestSources) {
    const isPy = /\.py$/i.test(f.path);
    const lines = f.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("#") || line.startsWith("*") || line.startsWith("/*")) continue;

      let matchedCall = "";
      if (isPy) {
        if (/\b(?:eval|exec)\s*\(/.test(line)) matchedCall = line.match(/\b(?:eval|exec)\s*\([^)]*\)/)?.[0] || "eval/exec()";
        else if (/\bpickle\.loads\s*\(/.test(line)) matchedCall = "pickle.loads()";
      } else if (/\.(php|rb)$/i.test(f.path)) {
        if (/\beval\s*\(/.test(line)) matchedCall = "eval()";
      } else {
        if (/\beval\s*\(/.test(line)) matchedCall = line.match(/\beval\s*\([^)]*\)/)?.[0] || "eval()";
        else if (/\bnew\s+Function\s*\(/.test(line)) matchedCall = "new Function(...)";
        else if (/\b(?:child_process\.)?exec\s*\(\s*`[^`]*\$\{/.test(line)) matchedCall = "exec(`...${var}`)";
      }

      if (matchedCall) {
        add({
          rule_id: "HYGI-009",
          category: "hygiene",
          severity: "high",
          title: "Dangerous dynamic code execution construct",
          path: f.path,
          line: i + 1,
          evidence: matchedCall.slice(0, 60),
          why: "Dynamic code execution (eval, exec, new Function) bypasses runtime sandboxing and allows arbitrary command or code execution if passed variable or untrusted input.",
          impact: "Critical risk of Remote Code Execution (RCE) or Cross-Site Scripting (XSS).",
          fix: "Refactor dynamic evaluation to use structured lookups, JSON.parse(), or declarative parsing logic.",
        });
        break; // 1 finding per file to avoid overwhelming output
      }
    }
  }

  // Silent Exception Swallowing / Empty Catch Blocks (HYGI-010)
  const emptyCatchRe = /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)?\s*\}/g;
  for (const f of nonTestSources) {
    if (JS_EXT.test(f.path) || /\.(php|java|kt)$/i.test(f.path)) {
      for (const m of f.content.matchAll(emptyCatchRe)) {
        const line = lineOf(f.content, m.index!);
        add({
          rule_id: "HYGI-010",
          category: "hygiene",
          severity: "medium",
          title: "Silent exception swallowing in empty catch block",
          path: f.path,
          line,
          evidence: m[0].replace(/\s+/g, " "),
          why: "An error is caught but completely discarded without logging, metrics, or fallback handling.",
          impact: "Failures will fail silently in production, masking fatal bugs and leaving application state corrupted.",
          fix: "Log the error (e.g. console.error / logger), rethrow it, or provide an explicit handled fallback.",
        });
        break;
      }
    } else if (/\.py$/i.test(f.path)) {
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*except(?:\s+[\w.]+)?\s*:\s*pass\b/.test(lines[i])) {
          add({
            rule_id: "HYGI-010",
            category: "hygiene",
            severity: "medium",
            title: "Silent exception swallowing (except: pass)",
            path: f.path,
            line: i + 1,
            evidence: lines[i].trim(),
            why: "A Python except block immediately passes without handling, logging, or reporting the error.",
            impact: "Masks fatal runtime exceptions and unexpected system failures.",
            fix: "Handle the exception, log it with logger.exception(), or catch only specific expected errors.",
          });
          break;
        }
      }
    } else if (/\.go$/i.test(f.path)) {
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/if\s+err\s*!=\s*nil\s*\{\s*\}/.test(lines[i]) || /^\s*_\s*=\s*err\b/.test(lines[i])) {
          add({
            rule_id: "HYGI-010",
            category: "hygiene",
            severity: "medium",
            title: "Silent error discarding (ignored err != nil)",
            path: f.path,
            line: i + 1,
            evidence: lines[i].trim(),
            why: "A Go error was checked or assigned to blank identifier '_' without logging, return, or handling.",
            impact: "Masks failed I/O, database errors, and system failures in Go services.",
            fix: "Handle the error, return it to caller with fmt.Errorf, or log it.",
          });
          break;
        }
      }
    }
  }

  // Forgotten Debugger / Breakpoint Artifacts (HYGI-011)
  for (const f of nonTestSources) {
    const lines = f.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("#") || line.startsWith("*")) continue;
      let dbgHit = "";
      if (JS_EXT.test(f.path) && /\bdebugger\s*;?$/.test(line)) dbgHit = "debugger;";
      else if (/\.py$/i.test(f.path) && /(?:pdb\.set_trace\(\)|\bbreakpoint\(\)|\bimport\s+pdb\b)/.test(line)) dbgHit = line;
      if (dbgHit) {
        add({
          rule_id: "HYGI-011",
          category: "hygiene",
          severity: "medium",
          title: "Forgotten debugger breakpoint in production source",
          path: f.path,
          line: i + 1,
          evidence: dbgHit.slice(0, 50),
          why: "A breakpoint or debugger statement was committed directly in application source code.",
          impact: "Can freeze client-side execution or lock up backend Node/Python threads in production.",
          fix: "Remove debugger; or breakpoint() statements prior to committing.",
        });
        break;
      }
    }
  }

  // TypeScript Strict Mode Check (HYGI-012)
  if (hasTs) {
    const tsconfig = all.find((f) => f.path === "tsconfig.json" || f.path.endsWith("/tsconfig.json"));
    if (!tsconfig) {
      add({
        rule_id: "HYGI-012",
        category: "hygiene",
        severity: "low",
        title: "TypeScript tsconfig.json missing or not located",
        path: "tsconfig.json",
        evidence: "TypeScript files exist but no tsconfig.json found",
        why: "TypeScript projects should configure a root tsconfig.json to establish compiler flags and target standards.",
        impact: "Build tooling will fall back to loose defaults, decreasing type predictability.",
        fix: "Create a tsconfig.json and enable strict compiler checks.",
      });
    } else {
      const cleanJson = tsconfig.content
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/,\s*([\]}])/g, "$1");
      try {
        const parsedTs = JSON.parse(cleanJson);
        const opts = parsedTs.compilerOptions || {};
        if (opts.strict !== true && opts.noImplicitAny !== true) {
          add({
            rule_id: "HYGI-012",
            category: "hygiene",
            severity: "low",
            title: "TypeScript strict mode is disabled or unconfigured",
            path: tsconfig.path,
            evidence: opts.strict === false ? '"strict": false' : "strict option omitted",
            why: "Strict mode enforces null-safety, strict function types, and prevents implicit 'any' across TypeScript code.",
            impact: "Type safety is weakened, allowing uncaught null/undefined errors to reach runtime.",
            fix: "Set \"strict\": true in tsconfig.json under compilerOptions.",
          });
        }
      } catch {
        // syntax error handled or skipped
      }
    }
  }

  // Unhandled / Excessive Console Logging (HYGI-013)
  for (const f of nonTestSources.filter((f) => JS_EXT.test(f.path) && !/(^|\/)(scripts|cli|tools|bin)\/|\.config\./.test(f.path))) {
    const matches = [...f.content.matchAll(/\bconsole\.(?:log|debug|info)\s*\(/g)];
    if (matches.length >= 4) {
      add({
        rule_id: "HYGI-013",
        category: "hygiene",
        severity: "low",
        title: "Excessive raw console.log statements in production source",
        path: f.path,
        evidence: `${matches.length} console.log calls`,
        why: `${f.path} contains ${matches.length} raw console logging statements.`,
        impact: "Can cause memory leaks, clutter server stdout, and inadvertently leak sensitive runtime data to client browser consoles.",
        fix: "Remove development console statements or use a dedicated logging framework (e.g. pino, winston).",
      });
    }
  }

  // ── Scoring Calculation
  const cats = { dependencies: 100, documentation: 100, hygiene: 100 };
  const deductions: Report["deductions"] = [];
  const perRule = new Map<string, number>();

  for (const f of findings) {
    const cat = f.category === "project" ? "dependencies" : f.category;
    let pts = SEV_POINTS[f.severity];
    if (!pts) continue;
    const used = perRule.get(f.rule_id) || 0;
    const cap = RULE_CAP[f.rule_id] ?? 100;
    pts = Math.min(pts, cap - used);
    if (pts <= 0) continue;
    perRule.set(f.rule_id, used + pts);
    const before = cats[cat];
    cats[cat] = Math.max(0, cats[cat] - pts);
    const real = before - cats[cat];
    const ex = deductions.find((d) => d.category === cat && d.rule_id === f.rule_id);
    if (ex) ex.points += real; else deductions.push({ category: cat, rule_id: f.rule_id, points: real });
  }

  const score = Math.round(cats.dependencies * 0.4 + cats.documentation * 0.35 + cats.hygiene * 0.25);
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

  return {
    project: {
      name,
      type,
      files_scanned: files.length,
      manifests,
      readme: readme?.path || null,
      ci_cd: hasCi,
      tests_detected: testsDetected,
      docker_detected: hasDockerfile,
      loc_total: locTotal,
    },
    score,
    categories: cats,
    deductions,
    findings,
    dependencies: deps,
    readme: {
      score: readmeScore,
      checks,
      commands_verified: commandsVerified,
      tables_count: tablesCount,
      broken_links: brokenLinks,
    },
    env: { detected: [...envNames.entries()].map(([n, l]) => ({ name: n, ...l })), documented },
    secrets_count: secretsDetectedCount,
    errors,
  };
}
