export type GithubRepoRef = {
  owner: string;
  repo: string;
  url: string;
};

export function parseGitHubRepoUrl(input: string): GithubRepoRef | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0].trim();
    const repo = parts[1].replace(/\.git$/, "").trim();
    if (!owner || !repo) return null;
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}
