import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, scans } from "@/db/schema";
import type { Report } from "./analyzer";

export async function projectsWithScans(userId: number) {
  const ps = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  const ss = ps.length ? await db.select({ id: scans.id, projectId: scans.projectId, score: scans.score, createdAt: scans.createdAt, report: scans.report }).from(scans).where(inArray(scans.projectId, ps.map((p) => p.id))).orderBy(desc(scans.createdAt)) : [];
  return ps.map((p) => {
    const list = ss.filter((s) => s.projectId === p.id).map((s) => ({ ...s, report: s.report as Report }));
    return { ...p, scans: list, latest: list[0] || null };
  });
}
