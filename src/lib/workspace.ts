import { unzipSync } from "fflate";
import { InputFile, isIgnoredPath } from "./analyzer";

export const MAX_ZIP_BYTES = 25 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024;
const TEXT_EXT = /\.(m?js|cjs|jsx|ts|tsx|py|go|rs|php|java|kt|rb|cs|c|cpp|h|hpp|xml|gradle|json|txt|md|markdown|rst|toml|cfg|ini|ya?ml|html|css|scss|vue|svelte|example|sample|template|lock|sum|sh|bash|sql|prisma|graphql|gql|proto|dockerfile)$/i;
const TEXT_NAMES = /^(\.gitignore|\.dockerignore|\.editorconfig|\.env.*|license|licence|copying|readme|dockerfile|makefile|procfile|id_rsa|id_ed25519|go\.mod|go\.sum|cargo\.toml|cargo\.lock|composer\.json|composer\.lock|gemfile|gemfile\.lock|pom\.xml)$/i;

export class InputError extends Error {}

/** Extracts a ZIP entirely in memory. Files are data only — nothing is executed or written to disk. */
export function extractZip(buf: Uint8Array): InputFile[] {
  if (buf.length > MAX_ZIP_BYTES) throw new InputError("ZIP exceeds the 25 MB limit. Remove node_modules/build folders and try again.");
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new InputError("This file is not a valid ZIP archive. Compress your project folder as .zip and retry.");
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buf, {
      filter: (f) => {
        const name = f.name.replace(/\\/g, "/");
        if (name.endsWith("/")) return false;
        if (name.split("/").some((s) => s === "..") || name.startsWith("/")) return false; // path traversal guard
        const base = name.split("/").pop() || "";
        // keep marker for ignored dirs without reading their contents
        if (isIgnoredPath(name)) return /\.(m?js|py|go|rs|php|java|rb)$/.test(base) && f.originalSize < 64 * 1024 && name.split("/").length < 6;
        return f.originalSize <= MAX_FILE_BYTES && (TEXT_EXT.test(base) || TEXT_NAMES.test(base) || /\.(pem|key|p12|pfx)$/.test(base));
      },
    });
  } catch {
    throw new InputError("The ZIP archive is malformed or encrypted and could not be read.");
  }
  let paths = Object.keys(entries).map((p) => p.replace(/\\/g, "/"));
  // strip a single shared top-level folder (e.g. repo-main/)
  const tops = new Set(paths.map((p) => p.split("/")[0]));
  const strip = tops.size === 1 && paths.every((p) => p.includes("/"));
  const dec = new TextDecoder("utf-8", { fatal: false });
  const out: InputFile[] = [];
  for (const [raw, data] of Object.entries(entries)) {
    let p = raw.replace(/\\/g, "/");
    if (strip) p = p.split("/").slice(1).join("/");
    if (!p) continue;
    if (data.subarray(0, 1024).includes(0)) continue; // binary
    out.push({ path: p, content: dec.decode(data) });
  }
  paths = out.map((f) => f.path);
  if (!paths.length) throw new InputError("The ZIP contained no readable text files.");
  return out;
}

export function parseGithubUrl(url: string) {
  let u: URL;
  try { u = new URL(url.trim()); } catch { throw new InputError("Enter a full URL like https://github.com/owner/repo."); }
  if (u.protocol !== "https:" || !["github.com", "www.github.com"].includes(u.hostname)) throw new InputError("Only public repositories on https://github.com are supported.");
  const [owner, repo] = u.pathname.split("/").filter(Boolean);
  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) throw new InputError("URL must point to a repository: https://github.com/owner/repo.");
  return { owner, repo: repo.replace(/\.git$/, "") };
}

export async function fetchGithub(url: string, customToken?: string) {
  const { owner, repo } = parseGithubUrl(url);
  const token = customToken || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { "User-Agent": "skopia-analyzer", Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let branch = "HEAD";
  let meta: { branch?: string; pushed_at?: string; description?: string } = {};
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, cache: "no-store" });
    if (r.status === 404) throw new InputError("Repository not found or private. Ensure the repository exists and is accessible.");
    if (r.ok) { const j = await r.json(); branch = j.default_branch; meta = { branch, pushed_at: j.pushed_at, description: j.description }; }
  } catch (e) { if (e instanceof InputError) throw e; }
  const zipUrl = token
    ? `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`
    : `https://codeload.github.com/${owner}/${repo}/zip/${branch === "HEAD" ? "HEAD" : `refs/heads/${branch}`}`;
  const z = await fetch(zipUrl, { headers: token ? headers : { "User-Agent": "skopia-analyzer" }, cache: "no-store" });
  if (!z.ok) throw new InputError(`GitHub download failed (${z.status}). Check the URL and repository access permissions.`);
  const buf = new Uint8Array(await z.arrayBuffer());
  return { name: repo, files: extractZip(buf), meta };
}
