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
    schedule: "毎日 午前4:00 (JST)",
    tags: ["DUGA", "スカトロ", "自動更新", "Cloudflare Pages"]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SITES };
}
