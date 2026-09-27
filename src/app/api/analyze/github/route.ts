import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { fetchGithub, InputError } from "@/lib/workspace";
import { saveAnalysis } from "@/lib/run";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to analyze projects." }, { status: 401 });
  try {
    const { url, projectId } = await req.json();
    const token = (await cookies()).get("skopia_github_token")?.value;
    const { name, files, meta } = await fetchGithub(String(url || ""), token);
    const res = await saveAnalysis(user.id, { projectId: Number(projectId) || null, name, source: "github", repoUrl: String(url).trim(), files, meta });
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof InputError ? e.message : `Unable to analyze: ${(e as Error).message}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
