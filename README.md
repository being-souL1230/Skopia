# Skopia: Deterministic Project Health Analyzer

Skopia is a static analysis web application designed to evaluate software repositories before deployment, release, or code review. It performs zero-execution code inspection on local ZIP archives and GitHub repositories, assessing dependencies, documentation completeness, and repository hygiene.

The analyzer operates entirely without executing user code, without invoking package managers, and without calling external generative AI APIs for its rule calculations.

---

## Key Principles and Architecture

### 1. Zero Execution Security Model
Repositories uploaded as ZIP files or pulled from GitHub are treated strictly as read-only text data. Skopia does not run npm install, pip install, setup.py, shell scripts, or container builds. Malicious scripts or unexpected lifecycle hooks cannot execute on the host server.

### 2. In-Memory Processing
ZIP archives are decompressed entirely in memory using streaming algorithms with strict security guards:
- 25 MB archive size limit to prevent memory exhaustion
- Path traversal protection (guards against directory climbing such as ../)
- Automatic exclusion of build artifacts, package directories, and binaries
- No temporary project files are written to disk

### 3. Deterministic Scoring
Every evaluation runs against a fixed catalog of explicit static analysis rules. Scanning the same codebase state always produces the exact same score and list of findings, providing an objective metric over time.

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| Framework | Next.js 16 (App Router) | Server components, Server Actions, Route Handlers |
| UI Library | React 19 | Client state management, progressive enhancements |
| Language | TypeScript 5 | End-to-end type safety |
| Styling | Tailwind CSS v4 | Bespoke typography and tailored design system |
| Database | PostgreSQL (Neon) | Serverless cloud database with connection pooling |
| ORM | Drizzle ORM | Type-safe schema definition and query builder |
| Archive Engine | fflate | High-performance in-memory deflate and unzip |
| Authentication | Custom Session + OAuth | scrypt password hashing and GitHub OAuth 2.0 |

---

## Supported Programming Languages

Skopia features multi-language manifest parsing, AST-like regex import mapping, and environment variable cross-referen<div align="center">

# 🔍 Skopia

### Know your repo's health before you ship it.

**Zero-execution static analysis for dependencies, docs, and repo hygiene: one score, zero surprises.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](#tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](#tech-stack)
[![No Code Execution](https://img.shields.io/badge/Execution-Zero-brightgreen)](#how-its-safe)

</div>

---

## Why Skopia?

Every repo has skeletons: a stray `.env` someone forgot to gitignore, a dependency nobody uses anymore, a README that promises setup instructions and delivers none. Skopia finds them before your reviewer, your CI, or your future self does.

Drop in a ZIP or a GitHub URL. Get a single health score out of 100, backed by a full list of concrete, fixable findings. No vague "looks okay" verdicts, no AI guesswork, just the same deterministic rules every time.

**And it never runs your code.** No `npm install`, no `pip install`, no shell scripts, no builds. Your repo is read as text and nothing more, so scanning something untrusted is genuinely safe.

---

## What it checks

| 🧩 Category | Weight | What it's really asking |
|---|---|---|
| **Dependencies** | 40% | Are you shipping packages you don't use? Importing ones you never declared? |
| **Documentation** | 35% | Could a stranger clone this and actually run it? |
| **Hygiene** | 25% | Any secrets committed? Dead code? Silent error swallowing? |

Findings are weighted **Critical to Info**, so one leaked API key hurts your score a lot more than a missing screenshot.

---

## Speaks your language(s)

Skopia isn't a JS-only tool wearing a "multi-language" label. It genuinely parses manifests and source across:

**JavaScript/TypeScript · Python · Go · Rust · PHP · Java/Kotlin · Ruby**

Mixed-stack repo? A Next.js frontend with a Go backend gets both analyzed and combined into one score. Polyglot projects are a first-class case, not an edge case.

---

## How it's safe

Three guarantees, no exceptions:

- **Nothing executes.** Not your build scripts, not your lifecycle hooks, not a single line of your code.
- **Nothing touches disk.** ZIPs are unpacked entirely in memory (25MB cap), with directory-traversal protection baked in.
- **Nothing is sent to an external AI.** Scoring is rule-based and deterministic, so scanning the same repo twice gives the same result twice.

---

## Get it running

```bash
git clone https://github.com/being-souL1230/Skopia.git
cd Skopia
npm install
```

Create a `.env` in the project root:

```env
DATABASE_URL="postgresql://user:pass@your-neon-host/neondb?sslmode=require"

# Optional, only needed for GitHub login
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

Push the schema and launch:

```bash
npx drizzle-kit push
npm run dev
```

Open **[localhost:3000](http://localhost:3000)** and you're in.

Before shipping to prod:

```bash
npm run typecheck
npm run build
npm run start
```

---

## Under the hood

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| UI | React 19 + Tailwind CSS v4 |
| Language | TypeScript 5, end to end |
| Database | PostgreSQL on Neon, via Drizzle ORM |
| Unzip engine | fflate (in-memory, no temp files) |
| Auth | Custom sessions + GitHub OAuth |

Four tables, kept simple: `users`, `sessions`, `projects`, `scans`. Every scan stores its full report as JSON, so history and re-review are free.

---

## The rulebook, if you're curious

Skopia runs on ~35 explicit rules across four categories: project structure, dependency health, documentation completeness, and repo hygiene/security. A few examples of what trips them:

- 🔴 **Critical**: a committed `.env`, an AWS key sitting in source code
- 🟠 **High**: a README missing entirely, an import with no matching dependency
- 🟡 **Medium**: no `.gitignore`, undocumented env vars, conflicting lockfiles
- ⚪ **Low/Info**: console.log spam, oversized files, no CI pipeline configured

Full rule table lives in `/docs/rules.md` (or ask the app, every finding links back to its rule ID).

---

## License

MIT. Do what you want with it.

</div>cing.

| Language | Manifest Files | Source Extensions | Capabilities Analyzed |
| :--- | :--- | :--- | :--- |
| JavaScript / Node.js | package.json, package-lock.json | .js, .mjs, .cjs, .jsx | Unused dependencies, undeclared imports, devDependencies in runtime code, script validation |
| TypeScript | package.json, tsconfig.json | .ts, .tsx | All JS checks plus compiler strictness verification (HYGI-012) |
| Python | requirements.txt, pyproject.toml | .py | Package parsing, module import cross-checks, stdlib exclusions, except pass detection |
| Go (Golang) | go.mod, go.sum | .go | Direct module parsing, import mapping, undeclared external modules, ignored error detection |
| Rust | Cargo.toml, Cargo.lock | .rs | Cargo dependencies and dev-dependencies parsing, use statement tracking, unused crates |
| PHP | composer.json, composer.lock | .php | Composer require and require-dev parsing, $_ENV / getenv detection, empty catch checks |
| Java / Kotlin | pom.xml, build.gradle, build.gradle.kts | .java, .kt | Maven / Gradle artifact detection, System.getenv inspection, test suite recognition |
| Ruby | Gemfile, Gemfile.lock | .rb | Gemfile dependency extraction, ENV reference scanning, eval detection |
| Polyglot Projects | Multiple manifests combined | Mixed | Automatic multi-language classification (example: Next.js frontend + Go backend) |

---

## Health Scoring Formula

The overall project health score ranges from 0 to 100 points, calculated using a weighted composite of three independent categories:

```text
Overall Score = (Dependencies * 0.40) + (Documentation * 0.35) + (Hygiene * 0.25)
```

### Deduction Weights by Severity

| Severity Level | Deduction per Finding | Rule Cap Strategy |
| :--- | :--- | :--- |
| Critical | -30 points | Capped to prevent single issues from zeroing categories |
| High | -20 points | Capped per rule (example: DEP-006 capped at 30 points) |
| Medium | -10 points | Capped per rule (example: DEP-001 capped at 40 points) |
| Low | -5 points | Capped per rule (example: HYGI-007 capped at 15 points) |
| Info | 0 points | Informational findings; no score deduction |

---

## Complete Rule Catalog

### 1. Project and Architecture Rules
| Rule ID | Category | Severity | Description |
| :--- | :--- | :--- | :--- |
| PROJ-001 | Project | Medium | No recognized project manifest found (package.json, requirements.txt, go.mod, Cargo.toml, etc.) |
| PROJ-002 | Project | Info | TypeScript codebase detected |

### 2. Dependency Health Rules
| Rule ID | Category | Severity | Description |
| :--- | :--- | :--- | :--- |
| DEP-001 | Dependencies | Medium | Declared package has no recognizable import or usage in source code |
| DEP-003 | Dependencies | High | Dependency manifest syntax is invalid or could not be parsed |
| DEP-004 | Dependencies | Info | Package reference exists only inside ignored or generated directories |
| DEP-005 | Dependencies | Low | Package listed under devDependencies is imported by production runtime code |
| DEP-006 | Dependencies | High | Undeclared library or module imported in code but missing from project manifest |
| DEP-007 | Dependencies | Medium | Multiple conflicting package manager lockfiles present at repository root |

### 3. Documentation Rules (README Doctor)
| Rule ID | Category | Severity | Description |
| :--- | :--- | :--- | :--- |
| DOC-001 | Documentation | High | README file is missing from repository root |
| DOC-002 | Documentation | Medium | Project description is missing or shorter than 12 words |
| DOC-003 | Documentation | Medium | Installation instructions or setup commands missing |
| DOC-004 | Documentation | Medium | Usage instructions or execution examples missing |
| DOC-005 | Documentation | Medium | Environment configuration section missing while environment variables exist in code |
| DOC-006 | Documentation | Low | API route documentation missing where HTTP endpoints are defined |
| DOC-007 | Documentation | Low | Screenshots or demo visuals missing for UI-centric codebases |
| DOC-008 | Documentation | Low | License section or root LICENSE file missing |
| DOC-009 | Documentation | Low | Features or overview section missing |
| DOC-010 | Documentation | Medium | README cites an npm script or file entrypoint that does not exist in the project |
| DOC-011 | Documentation | Low | Broken relative file or asset link found in README |
| ENV-001 | Documentation | Medium | Environment variable referenced in code but omitted from README or .env.example |

### 4. Repository Hygiene and Security Rules
| Rule ID | Category | Severity | Description |
| :--- | :--- | :--- | :--- |
| HYGI-001 | Hygiene | Medium | .gitignore file is missing at repository root |
| HYGI-002 | Hygiene | Low | LICENSE or COPYING file is missing |
| HYGI-003 | Hygiene | Medium | Build or generated folder (node_modules, dist, __pycache__) is tracked in repository |
| HYGI-004 | Hygiene | Critical | Committed secret or environment file detected (.env, id_rsa, .pem, service-account.json) |
| HYGI-005 | Hygiene | Critical | Hardcoded credential detected in source code (AWS key, GitHub token, private key, database URI) |
| HYGI-006 | Hygiene | Low | Dockerfile present without a corresponding .dockerignore file |
| HYGI-007 | Hygiene | Low | Empty source files detected in project tree |
| HYGI-008 | Hygiene | Low | Monolithic source file exceeds 1,200 lines of code |
| HYGI-009 | Hygiene | High | Dangerous dynamic evaluation function detected (eval, new Function, exec with template string, pickle.loads) |
| HYGI-010 | Hygiene | Medium | Silent error swallowing detected (empty catch block, except: pass, unhandled Go error) |
| HYGI-011 | Hygiene | Medium | Forgotten debugger statement or breakpoint committed in production source |
| HYGI-012 | Hygiene | Low | TypeScript strict mode disabled or unconfigured in tsconfig.json |
| HYGI-013 | Hygiene | Low | Excessive raw console.log statements found in production source files |
| TEST-001 | Hygiene | Low | No automated test files or test runner configuration detected |
| CI-001 | Hygiene | Info | No continuous integration pipeline configured (.github/workflows, .gitlab-ci.yml, etc.) |

---

## Database Architecture

Skopia uses Drizzle ORM configured against Neon Serverless PostgreSQL. The schema consists of four relational tables:

```text
users
  id (serial, primary key)
  email (text, unique)
  name (text)
  password_hash (text)
  avatar_url (text, optional)
  github_username (text, optional)
  github_access_token (text, optional)
  created_at (timestamp)

sessions
  id (text, primary key)
  user_id (integer, foreign key -> users.id)
  expires_at (timestamp)

projects
  id (serial, primary key)
  user_id (integer, foreign key -> users.id)
  name (text)
  source (text: "zip" | "github")
  repo_url (text, optional)
  notes (text)
  created_at (timestamp)

scans
  id (serial, primary key)
  project_id (integer, foreign key -> projects.id)
  score (integer)
  report (jsonb: complete analysis output)
  reviewed (jsonb: array of resolved finding keys)
  pinned (boolean)
  created_at (timestamp)
```

---

## Local Setup and Installation

### Prerequisites
- Node.js 18.18 or newer
- npm, pnpm, or yarn
- PostgreSQL database instance (Neon connection string recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/being-souL1230/Skopia.git
cd Skopia
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root with the following configuration:

```env
# Database Configuration (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# GitHub OAuth App Credentials (Optional for local email-only use)
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

### 4. Push Database Schema
```bash
npx drizzle-kit push
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build and Verification

To verify type safety and produce an optimized production bundle:

```bash
# Typecheck TypeScript codebase
npm run typecheck

# Build Next.js application
npm run build

# Start production server
npm run start
```

---

## License

This project is licensed under the MIT License.
