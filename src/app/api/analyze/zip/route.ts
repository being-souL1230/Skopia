import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { extractZip, InputError, MAX_ZIP_BYTES } from "@/lib/workspace";
import { saveAnalysis } from "@/lib/run";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to analyze projects." }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const projectId = Number(form.get("projectId")) || null;
    if (!(file instanceof File)) throw new InputError("Choose a .zip file to upload.");
    if (!file.name.toLowerCase().endsWith(".zip")) throw new InputError("Only .zip archives are accepted.");
    if (file.size > MAX_ZIP_BYTES) throw new InputError("ZIP exceeds the 25 MB limit.");
    const files = extractZip(new Uint8Array(await file.arrayBuffer()));
    const res = await saveAnalysis(user.id, { projectId, name: file.name.replace(/\.zip$/i, ""), source: "zip", files });
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof InputError ? e.message : `Unable to analyze: ${(e as Error).message}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
