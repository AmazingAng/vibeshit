import { ImageResponse } from "next/og";
import { getDb } from "@/lib/db";
import { getProductBySlug } from "@/lib/queries/products";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const R2_PUBLIC = "https://img.vibeshit.org";

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/api/image/"))
    return `${R2_PUBLIC}/${url.slice("/api/image/".length)}`;
  if (url.startsWith("/")) return `https://vibeshit.org${url}`;
  return url;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function visualWidth(name: string): number {
  let w = 0;
  for (const ch of name) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) ||
        (c >= 0x3040 && c <= 0x30FF) || (c >= 0xFF00 && c <= 0xFFEF) ||
        (c >= 0x20000 && c <= 0x2A6DF)) {
      w += 1.8;
    } else {
      w += 1;
    }
  }
  return w;
}

function nameSize(name: string): number {
  const w = visualWidth(name);
  if (w <= 10) return 120;
  if (w <= 16) return 108;
  if (w <= 22) return 92;
  if (w <= 30) return 76;
  return 64;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function parseGitHubUrl(
  url: string | null
): { owner: string; repo: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

type GitHubStats = { stars: number; forks: number; issues: number };

async function fetchGitHubStats(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubStats> {
  const fallback: GitHubStats = { stars: 0, forks: 0, issues: 0 };

  try {
    const headers: Record<string, string> = { "User-Agent": "vibeshit-og" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let url = `https://api.github.com/repos/${owner}/${repo}`;
    let res: Response | null = null;
    for (let i = 0; i < 3; i++) {
      res = await fetch(url, { headers, redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (location) { url = location; continue; }
      }
      break;
    }

    if (!res || !res.ok) return fallback;

    const data = (await res.json()) as {
      stargazers_count?: number;
      forks_count?: number;
      open_issues_count?: number;
    };

    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      issues: data.open_issues_count ?? 0,
    };
  } catch {
    return fallback;
  }
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 26, fontWeight: 700, color: "#ffffff" }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: 16, color: "#b1bac4" }}>{label}</span>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = getDb(env.DB);
    const product = await getProductBySlug(db, slug);

    if (!product) {
      return new Response("Not found", { status: 404 });
    }

    const ghInfo = parseGitHubUrl(product.githubUrl);
    const ghToken = (env as unknown as Record<string, unknown>).GITHUB_TOKEN as string | undefined;
    const ghStats = ghInfo
      ? await fetchGitHubStats(ghInfo.owner, ghInfo.repo, ghToken)
      : { stars: 0, forks: 0, issues: 0 };

    const logoUrl = toAbsoluteUrl(product.logoUrl);
    const avatarUrl = product.userImage;
    const tags = product.tags
      ? (JSON.parse(product.tags) as string[]).slice(0, 3)
      : [];

    const displayBadges: string[] = [];
    if (product.agent) displayBadges.push(product.agent);
    if (product.llm) displayBadges.push(product.llm);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "32px 72px 90px",
            }}
          >
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>💩</span>
              <span
                style={{ fontSize: 22, color: "#ffffff", fontWeight: 700 }}
              >
                vibeshit.org
              </span>
            </div>

            {/* Main area */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 48,
                flex: 1,
                marginTop: 40,
              }}
            >
              {/* Left */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {avatarUrl && (
                    <img
                      src={avatarUrl}
                      width={36}
                      height={36}
                      style={{ borderRadius: 18 }}
                    />
                  )}
                  {product.userUsername && (
                    <span style={{ fontSize: 24, color: "#e6edf3" }}>
                      @{product.userUsername}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: nameSize(product.name),
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    marginTop: 16,
                  }}
                >
                  {product.name}
                </span>

                <span
                  style={{
                    fontSize: 24,
                    color: "#e6edf3",
                    lineHeight: 1.4,
                    marginTop: 8,
                  }}
                >
                  {truncate(product.tagline, 150)}
                </span>
              </div>

              {/* Right: logo */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  width={350}
                  height={350}
                  style={{
                    borderRadius: 44,
                    border: "2px solid #30363d",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 350,
                    height: 350,
                    borderRadius: 44,
                    backgroundColor: "#161b22",
                    border: "2px solid #30363d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 120,
                    fontWeight: 700,
                    color: "#e6edf3",
                    flexShrink: 0,
                  }}
                >
                  {product.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 1, overflow: "hidden", minWidth: 0 }}>
                {displayBadges.map((b) => (
                  <span
                    key={b}
                    style={{
                      backgroundColor: "#21262d",
                      color: "#e6edf3",
                      padding: "6px 16px",
                      borderRadius: 20,
                      fontSize: 17,
                      border: "1px solid #30363d",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 28, flexShrink: 0 }}>
                <StatItem
                  icon="💩"
                  label="Shits"
                  value={formatNum(product.shitCount)}
                />
                <StatItem
                  icon="⭐"
                  label="Stars"
                  value={formatNum(ghStats.stars)}
                />
                <StatItem
                  icon="🍴"
                  label="Forks"
                  value={formatNum(ghStats.forks)}
                />
                <StatItem
                  icon="📋"
                  label="Issues"
                  value={formatNum(ghStats.issues)}
                />
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
