import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ownedProject } from "@/lib/run";

async function load(id: number) {
  const user = await getUser();
  if (!user) return null;
  const [s] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!s || !(await ownedProject(user.id, s.projectId))) return null;
  return s;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await load(Number((await ctx.params).id));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(s);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await load(Number((await ctx.params).id));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { key, reviewed } = await req.json();
  const set = new Set(s.reviewed);
  if (reviewed) set.add(key); else set.delete(key);
  await db.update(scans).set({ reviewed: [...set] }).where(eq(scans.id, s.id));
  return NextResponse.json({ reviewed: [...set] });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await load(Number((await ctx.params).id));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(scans).where(eq(scans.id, s.id));
  return NextResponse.json({ ok: true });
}
