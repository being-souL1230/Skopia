import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, scans } from "@/db/schema";
import { analyze, InputFile } from "./analyzer";

export async function ownedProject(userId: number, projectId: number) {
  const r = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return r[0] || null;
}

export async function saveAnalysis(userId: number, opts: { projectId?: number | null; name: string; source: "zip" | "github"; repoUrl?: string; files: InputFile[]; meta?: Record<string, unknown> }) {
  let projectId = opts.projectId || null;
  if (projectId) {
    const p = await ownedProject(userId, projectId);
    if (!p) throw new Error("Project not found");
  } else {
    const [p] = await db.insert(projects).values({ userId, name: opts.name.slice(0, 80), source: opts.source, repoUrl: opts.repoUrl }).returning();
    projectId = p.id;
  }
  const report = { ...analyze(opts.name, opts.files), meta: opts.meta || {} };
  const [s] = await db.insert(scans).values({ projectId, score: report.score, report }).returning();
  return { scanId: s.id, projectId };
}
