import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users, projects } from "@/db/schema";
import { createSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("github_oauth_state")?.value;
  cookieStore.delete("github_oauth_state");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=Invalid+OAuth+state.+Please+try+again.", req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=GitHub+OAuth+not+configured.", req.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(tokenData.error_description || "Failed to exchange GitHub authorization code.")}`, req.url)
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "skopia-analyzer",
        Accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=Failed+to+fetch+GitHub+profile.", req.url));
    }

    const ghUser = await userRes.json();

    // 3. Resolve user email (may be private in profile)
    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "skopia-analyzer",
          Accept: "application/vnd.github+json",
        },
      });
      if (emailsRes.ok) {
        const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();
        const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
        if (primary) email = primary.email;
      }
    }

    if (!email) {
      email = `${ghUser.id}+${ghUser.login}@users.noreply.github.com`;
    }
    email = email.toLowerCase().trim();

    const name = ghUser.name || ghUser.login || "GitHub User";
    const avatarUrl = ghUser.avatar_url || null;
    const githubUsername = ghUser.login || null;

    // 4. Find or create user with GitHub profile details
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: number;

    if (existing) {
      userId = existing.id;
      await db.update(users).set({
        name,
        avatarUrl,
        githubUsername,
        githubAccessToken: accessToken,
      }).where(eq(users.id, existing.id));
    } else {
      const [newUser] = await db.insert(users).values({
        email,
        name,
        passwordHash: `oauth:github:${randomBytes(16).toString("hex")}`,
        avatarUrl,
        githubUsername,
        githubAccessToken: accessToken,
      }).returning();
      userId = newUser.id;
    }

    // Clean up any demo projects so GitHub users strictly see their own repositories
    await db.delete(projects).where(
      and(
        eq(projects.userId, userId),
        inArray(projects.name, ["demo-project", "weather-bot"])
      )
    ).catch(() => {});

    // 5. Store accessToken in cookie for repository scanning
    cookieStore.set("skopia_github_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });

    // 6. Create session & redirect to app dashboard
    await createSession(userId);
    return NextResponse.redirect(new URL("/app", req.url));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || "GitHub authentication failed.")}`, req.url)
    );
  }
}
