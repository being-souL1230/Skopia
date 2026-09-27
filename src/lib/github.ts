export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
}

export async function fetchUserRepos(token: string): Promise<GithubRepo[]> {
  try {
    const res = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "skopia-analyzer",
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
