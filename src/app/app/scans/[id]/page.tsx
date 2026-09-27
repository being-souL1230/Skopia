import { notFound } from "next/navigation";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ownedProject } from "@/lib/run";
import ReportView from "@/components/ReportView";
import type { Report } from "@/lib/analyzer";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getUser())!;
  const id = Number((await params).id);
  if (!id) notFound();
  const [s] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!s) notFound();
  const p = await ownedProject(user.id, s.projectId);
  if (!p) notFound();
  const [prev] = await db.select({ score: scans.score }).from(scans).where(and(eq(scans.projectId, p.id), lt(scans.createdAt, s.createdAt))).orderBy(desc(scans.createdAt)).limit(1);
  return <ReportView key={s.id} scanId={s.id} report={s.report as Report} reviewed={s.reviewed} project={{ id: p.id, name: p.name, source: p.source, repoUrl: p.repoUrl }} createdAt={s.createdAt.toISOString()} prevScore={prev?.score ?? null} />;
}
