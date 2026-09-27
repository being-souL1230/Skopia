import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ownedProject } from "@/lib/run";
import ProjectEditor from "@/components/ProjectEditor";
import type { Report } from "@/lib/analyzer";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getUser())!;
  const p = await ownedProject(user.id, Number((await params).id) || 0);
  if (!p) notFound();
  const ss = await db.select().from(scans).where(eq(scans.projectId, p.id)).orderBy(desc(scans.createdAt));
  return <ProjectEditor key={p.id} project={{ id: p.id, name: p.name, notes: p.notes, source: p.source, repoUrl: p.repoUrl }}
    scans={ss.map((s) => ({ id: s.id, score: s.score, createdAt: s.createdAt.toISOString(), findings: (s.report as Report).findings.filter((f) => f.severity !== "info").length }))} />;
}
