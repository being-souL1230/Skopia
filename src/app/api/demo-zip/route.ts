import { zipSync, strToU8 } from "fflate";
import { DEMO_JS, DEMO_JS_FIXED } from "@/lib/seed";

export async function GET(req: Request) {
  const fixed = new URL(req.url).searchParams.get("fixed") === "1";
  const src = fixed ? DEMO_JS_FIXED : DEMO_JS;
  const tree: Record<string, Uint8Array> = {};
  for (const f of src) tree[`demo-project/${f.path}`] = strToU8(f.content);
  const zip = zipSync(tree);
  return new Response(Buffer.from(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="demo-project${fixed ? "-fixed" : ""}.zip"` } });
}
