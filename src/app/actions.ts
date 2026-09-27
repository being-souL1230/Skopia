"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureDemoUser, seedProjectsFor } from "@/lib/seed";

export type AuthState = { error?: string } | undefined;

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  await ensureDemoUser();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const pw = String(fd.get("password") || "");
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || !verifyPassword(pw, u.passwordHash)) return { error: "Email or password is incorrect." };
  await createSession(u.id);
  redirect("/app");
}

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const name = String(fd.get("name") || "").trim();
  const pw = String(fd.get("password") || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!name) return { error: "Enter your name." };
  if (pw.length < 6) return { error: "Password must be at least 6 characters." };
  const ex = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (ex.length) return { error: "An account with this email already exists." };
  const [u] = await db.insert(users).values({ email, name, passwordHash: hashPassword(pw) }).returning();
  await seedProjectsFor(u.id);
  await createSession(u.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
