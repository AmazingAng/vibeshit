import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "og-preview.png");

// Mock data matching skilldb product
const product = {
  name: "skilldb",
  tagline: "The open index for AI agent skills. The open index for AI agent skillsThe open index for AI agent skillsThe open index for AI agent skillsThe open index for AI agent skillsThe open index for AI agent skillsThe open index for AI agent skills",
  userUsername: "AmazingAng",
  userImage: "https://avatars.githubusercontent.com/u/4443048?v=4",
  logoUrl: "https://img.vibeshit.org/logo/5d0c803a-1ef7-43c6-b1a2-624ca603c36f.png",
  agent: "Cursor",
  llm: "Claude Sonnet 4.6",
  tags: '["skill","database","ai"]',
  shitCount: 1,
};

const ghStats = { stars: 19, forks: 3, issues: 0 };

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// CJK 字符视觉宽度约为拉丁字符的 1.8 倍
function visualWidth(name) {
  let w = 0;
  for (const ch of name) {
    const c = ch.codePointAt(0);
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

function nameSize(name) {
  const w = visualWidth(name);
  if (w <= 10) return 120;
  if (w <= 16) return 108;
  if (w <= 22) return 92;
  if (w <= 30) return 76;
  return 64;
}

function formatNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

const tags = JSON.parse(product.tags).slice(0, 3);
const badges = [];
if (product.agent) badges.push(product.agent);
if (product.llm) badges.push(product.llm);
tags.forEach((t) => badges.push(`#${t}`));
const displayBadges = badges.slice(0, 4);

function StatItem({ icon, label, value }) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 6 },
            children: [
              { type: "span", props: { style: { fontSize: 22 }, children: icon } },
              {
                type: "span",
                props: {
                  style: { fontSize: 26, fontWeight: 700, color: "#ffffff" },
                  children: value,
                },
              },
            ],
          },
        },
        {
          type: "span",
          props: {
            style: { fontSize: 16, color: "#b1bac4" },
            children: label,
          },
        },
      ],
    },
  };
}

// ===================== LAYOUT 说明 =====================
// 整体 padding: "顶部 左右 底部"
//   - 顶部 (16px): vibeshit.org 到顶边的距离
//   - 左右 (72px): 内容左右边距
//   - 底部 (90px): 底部留白，给 Twitter URL 遮罩留空间
//
// 如何上移 Main Area:
//   - 减小整体 padding 顶部值 (第1个, 当前 16px)
//   - Main Area 有 flex:1, 会自动撑满顶部栏和底部栏之间的空间
//
// Product Name 与 Author 行的间距:
//   - Product Name 的 marginTop (当前 16px)
//
// Main Area 与底部栏的间距:
//   - 底部栏的 marginTop (当前 6px)
// =======================================================
const element = {
  type: "div",
  props: {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
    },
    children: [
      {
        type: "div",
        props: {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            // padding: "顶部 左右 底部" — 顶部值控制 vibeshit.org 离顶边距离
            padding: "32px 72px 90px",
          },
          children: [
            // ---- 顶部栏: vibeshit.org 右对齐 ----
            {
              type: "div",
              props: {
                style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 },
                children: [
                  {
                    type: "span",
                    props: {
                      style: { fontSize: 22 },
                      children: "💩",
                    },
                  },
                  {
                    type: "span",
                    props: {
                      style: { fontSize: 22, color: "#ffffff", fontWeight: 700 },
                      children: "vibeshit.org",
                    },
                  },
                ],
              },
            },
            // ---- Main Area (flex:1, 自动撑满中间空间) ----
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",  // flex-start=顶部对齐, center=垂直居中
                  gap: 48,       // 左侧文字 ↔ 右侧logo 的间距
                  flex: 1,       // 撑满顶部栏与底部栏之间
                  marginTop: 40, // Main Area 与顶部栏的间距，调大=下移
                },
                children: [
                  // ---- 左侧: Author → Product Name → Tagline ----
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        gap: 10,
                      },
                      children: [
                        // Author 行 (头像 + @username)
                        {
                          type: "div",
                          props: {
                            style: { display: "flex", alignItems: "center", gap: 10 },
                            children: [
                              {
                                type: "img",
                                props: {
                                  src: product.userImage,
                                  width: 36,
                                  height: 36,
                                  style: { borderRadius: 18 },
                                },
                              },
                              {
                                type: "span",
                                props: {
                                  style: { fontSize: 24, color: "#e6edf3" },
                                  children: `@${product.userUsername}`,
                                },
                              },
                            ],
                          },
                        },
                        // Product Name — fontSize 控制大小, marginTop 控制与 Author 的间距
                        {
                          type: "span",
                          props: {
                            style: {
                              fontSize: nameSize(product.name), // 自适应: ≤8字120px, ≤12字100px, ≤16字84px, ≤22字68px, 更长56px
                              fontWeight: 700,
                              color: "#ffffff",
                              letterSpacing: "-0.03em",
                              lineHeight: 1.05,
                              marginTop: 16,       // 与上方 Author 行的间距
                            },
                            children: product.name,
                          },
                        },
                        // Tagline — marginTop 控制与 Product Name 的间距
                        {
                          type: "span",
                          props: {
                            style: {
                              fontSize: 24,        // Tagline 字体大小
                              color: "#e6edf3",
                              lineHeight: 1.4,
                              marginTop: 8,        // 与 Product Name 的间距
                            },
                            children: truncate(product.tagline, 150), // 约3行，超出截断
                          },
                        },
                      ],
                    },
                  },
                  // ---- 右侧: Product Logo ----
                  {
                    type: "img",
                    props: {
                      src: product.logoUrl,
                      width: 350,        // Logo 尺寸
                      height: 350,
                      style: {
                        borderRadius: 44,
                        border: "2px solid #30363d",
                        flexShrink: 0,
                      },
                    },
                  },
                ],
              },
            },
            // ---- 底部栏: 左侧 tags, 右侧 stats ----
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,    // 底部栏与 Main Area 的间距
                },
                children: [
                  // Badges
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", alignItems: "center", gap: 10 },
                      children: displayBadges.map((b) => ({
                        type: "span",
                        props: {
                          style: {
                            backgroundColor: "#21262d",
                            color: "#e6edf3",
                            padding: "6px 16px",
                            borderRadius: 20,
                            fontSize: 17,
                            border: "1px solid #30363d",
                          },
                          children: b,
                        },
                      })),
                    },
                  },
                  // Stats
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", alignItems: "center", gap: 28 },
                      children: [
                        StatItem({ icon: "💩", label: "Shits", value: formatNum(product.shitCount) }),
                        StatItem({ icon: "⭐", label: "Stars", value: formatNum(ghStats.stars) }),
                        StatItem({ icon: "🍴", label: "Forks", value: formatNum(ghStats.forks) }),
                        StatItem({ icon: "📋", label: "Issues", value: formatNum(ghStats.issues) }),
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};

function getIconCode(char) {
  return char.codePointAt(0).toString(16);
}

async function loadEmoji(code) {
  const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`);
  if (!res.ok) return "";
  return await res.text();
}

async function main() {
  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "sans",
        data: readFileSync(join(__dirname, "fonts", "Inter-Regular.ttf")),
        weight: 400,
      },
      {
        name: "sans",
        data: readFileSync(join(__dirname, "fonts", "Inter-Bold.ttf")),
        weight: 700,
      },
    ],
    loadAdditionalAsset: async (languageCode, segment) => {
      if (languageCode === "emoji") {
        const code = getIconCode(segment);
        const svg = await loadEmoji(code);
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      }
      return "";
    },
  });

  const resvg = new Resvg(svg);
  const png = resvg.render().asPng();
  writeFileSync(outPath, png);
  console.log(`Written to ${outPath}`);
}

main().catch(console.error);
