/**
 * Affiliate Portal Hub - Initial Monitored Sites Configuration
 */
const DEFAULT_SITES = [
  {
    id: "duga-scat-portal",
    name: "DUGAスカトロ動画 マニア厳選レビュー",
    category: "DUGA特化",
    asp: "DUGA (Agent ID: 49313)",
    siteUrl: "https://duga-scat-portal.pages.dev",
    statusUrl: "https://duga-scat-portal.pages.dev/status.json",
    repoUrl: "https://github.com/anothersky2534/duga-scat-portal",
    actionsUrl: "https://github.com/anothersky2534/duga-scat-portal/actions",
    xUrl: "",
    blueskyUrl: "",
    schedule: "毎日 午前4:00 (JST)",
    tags: ["DUGA", "スカトロ", "自動更新", "Cloudflare Pages"]
  },
  {
    id: "fc2-ranking-and-review",
    name: "FC2売れ筋ランキング＆徹底レビューまとめ",
    category: "FC2ランキング",
    asp: "FC2",
    siteUrl: "https://fc2-ranking-and-review.anothersky2534.workers.dev/",
    statusUrl: "https://fc2-ranking-and-review.anothersky2534.workers.dev/status.json",
    repoUrl: "",
    actionsUrl: "",
    xUrl: "",
    blueskyUrl: "",
    schedule: "定期更新",
    tags: ["FC2", "ランキング", "Cloudflare Workers"]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SITES };
}
