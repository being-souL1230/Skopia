import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ownedProject } from "@/lib/run";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const id = Number((await ctx.params).id);
  if (!user || !(await ownedProject(user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const upd: { name?: string; notes?: string } = {};
  if (typeof body.name === "string" && body.name.trim()) upd.name = body.name.trim().slice(0, 80);
  if (typeof body.notes === "string") upd.notes = body.notes.slice(0, 1000);
  await db.update(projects).set(upd).where(eq(projects.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const id = Number((await ctx.params).id);
  if (!user || !(await ownedProject(user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ ok: true });
}
