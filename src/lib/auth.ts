import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await db.insert(sessions).values({ id, userId, expiresAt });
  (await cookies()).set("skopia_session", id, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt, secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1" ? false : false });
}

export async function destroySession() {
  const c = await cookies();
  const id = c.get("skopia_session")?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  c.delete("skopia_session");
}

export async function getUser() {
  const id = (await cookies()).get("skopia_session")?.value;
  if (!id) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      githubUsername: users.githubUsername,
      githubAccessToken: users.githubAccessToken,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] || null;
}
