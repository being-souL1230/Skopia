import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, scans, users } from "@/db/schema";
import { analyze, InputFile } from "./analyzer";
import { hashPassword } from "./auth";

export const DEMO_JS: InputFile[] = [
  { path: "README.md", content: "# demo-project\n\nA tiny API.\n\n## Installation\n\nClone the repo.\n\n## Usage\n\n```\nnode src/app.js\n```\n\nThe server listens on PORT.\n" },
  { path: "package.json", content: JSON.stringify({ name: "demo-project", version: "0.1.0", scripts: { start: "node src/app.js", dev: "nodemon src/app.js" }, dependencies: { express: "^4.19.0", dotenv: "^16.4.0", lodash: "^4.17.21", pg: "^8.11.0" }, devDependencies: { nodemon: "^3.0.0" } }, null, 2) },
  { path: ".gitignore", content: "node_modules/\n.env\n" },
  { path: "src/app.js", content: "require('dotenv').config();\nconst express = require('express');\nconst { pool } = require('./config');\n\nconst app = express();\n\napp.get('/api/health', (req, res) => res.json({ ok: true }));\napp.get('/api/users', async (req, res) => {\n  const { rows } = await pool.query('select * from users');\n  res.json(rows);\n});\n\napp.listen(process.env.PORT || 3000);\n" },
  { path: "src/config.js", content: "const { Pool } = require('pg');\n\nexports.pool = new Pool({ connectionString: process.env.DATABASE_URL });\nexports.secret = process.env.JWT_SECRET;\n" },
  { path: "screenshots/.keep", content: "" },
];

export const DEMO_JS_FIXED: InputFile[] = [
  ...DEMO_JS.filter((f) => !["README.md", "package.json"].includes(f.path)),
  { path: "package.json", content: JSON.stringify({ name: "demo-project", version: "0.2.0", scripts: { start: "node src/app.js", dev: "nodemon src/app.js" }, dependencies: { express: "^4.19.0", dotenv: "^16.4.0", pg: "^8.11.0" }, devDependencies: { nodemon: "^3.0.0" } }, null, 2) },
  { path: "LICENSE", content: "MIT License\n\nCopyright (c) 2026" },
  { path: "README.md", content: "# demo-project\n\nA tiny Express + PostgreSQL API used to demonstrate Skopia, the deterministic repository health analyzer for developers.\n\n## Features\n\n- Health endpoint\n- Users listing\n\n## Installation\n\n```\ngit clone https://github.com/example/demo-project\nnpm install\n```\n\n## Configuration\n\n| Variable | Purpose |\n|---|---|\n| PORT | HTTP port |\n| DATABASE_URL | Postgres connection |\n| JWT_SECRET | Token signing |\n\n## Usage\n\n```\nnpm start\n```\n\n## API\n\n- GET /api/health\n- GET /api/users\n\n## License\n\nMIT\n" },
];

export const DEMO_PY: InputFile[] = [
  { path: "README.md", content: "# weather-bot\n\nA Flask service that fetches forecasts and posts daily summaries to Slack channels for small teams.\n\n## Installation\n\n```\npip install -r requirements.txt\n```\n\n## Usage\n\n```\nflask run\n```\n" },
  { path: "requirements.txt", content: "# core\nflask==3.0.0\nrequests>=2.31\nnumpy==1.26.0\npython-dotenv\npandas\ngunicorn\n" },
  { path: "app.py", content: "import os\nfrom flask import Flask, jsonify\nimport requests\nfrom dotenv import load_dotenv\n\nload_dotenv()\napp = Flask(__name__)\nAPI_KEY = os.getenv('WEATHER_API_KEY')\nSLACK = os.environ['SLACK_WEBHOOK']\n\n@app.route('/forecast')\ndef forecast():\n    r = requests.get('https://api.example.com', params={'key': API_KEY})\n    return jsonify(r.json())\n" },
  { path: ".env", content: "WEATHER_API_KEY=abc123\n" },
  { path: "__pycache__/app.cpython-311.pyc.txt", content: "" },
];

export const DEMO_USER = { email: "demo@skopia.dev", password: "demo1234", name: "Ada Reviewer" };

export async function seedProjectsFor(userId: number) {
  const day = 86400000;
  const [js] = await db.insert(projects).values({ userId, name: "demo-project", source: "zip", notes: "Hackathon demo repository (intentionally imperfect).", createdAt: new Date(Date.now() - 3 * day) }).returning();
  const r1 = analyze("demo-project", DEMO_JS);
  const r2 = analyze("demo-project", DEMO_JS_FIXED);
  await db.insert(scans).values([
    { projectId: js.id, score: r1.score, report: r1, createdAt: new Date(Date.now() - 3 * day) },
    { projectId: js.id, score: r2.score, report: r2, createdAt: new Date(Date.now() - 2 * day) },
  ]);
  const [py] = await db.insert(projects).values({ userId, name: "weather-bot", source: "zip", notes: "Side project (check before open-sourcing).", createdAt: new Date(Date.now() - day) }).returning();
  const r3 = analyze("weather-bot", DEMO_PY);
  await db.insert(scans).values({ projectId: py.id, score: r3.score, report: r3, createdAt: new Date(Date.now() - day) });
}

export async function ensureDemoUser() {
  const ex = await db.select().from(users).where(eq(users.email, DEMO_USER.email)).limit(1);
  if (ex.length) return;
  const [u] = await db.insert(users).values({ email: DEMO_USER.email, name: DEMO_USER.name, passwordHash: hashPassword(DEMO_USER.password) }).onConflictDoNothing().returning();
  if (u) await seedProjectsFor(u.id);
}
