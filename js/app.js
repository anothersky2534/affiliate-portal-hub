/**
 * Affiliate Portal Hub - Clean Accordion with True Newly Added Articles
 */

const DEFAULT_LINKS = [
  { id: 'duga', name: 'DUGA', url: 'https://affiliate.duga.jp/' },
  { id: 'fanza', name: 'FANZA/DMM', url: 'https://affiliate.dmm.com/' },
  { id: 'fc2', name: 'FC2', url: 'https://affiliate.fc2.com/' },
  { id: 'gsc', name: 'Search Console', url: 'https://search.google.com/search-console' },
  { id: 'ga', name: 'Analytics', url: 'https://analytics.google.com/' }
];

let sites = [];
let links = [];
let siteStatuses = {};
let searchQuery = '';
let expandedSites = new Set();

// Elements
const cardContainer = document.getElementById('sites-card-container');
const aspLinksContainer = document.getElementById('asp-links-container');
const totalSitesEl = document.getElementById('stat-total-sites');
const activeSitesEl = document.getElementById('stat-active-sites');
const errorSitesEl = document.getElementById('stat-error-sites');
const todayNewEl = document.getElementById('stat-today-new');
const todayUpdatedEl = document.getElementById('stat-today-updated');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const refreshBtn = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');

// Site Modal Elements
const siteModal = document.getElementById('site-modal');
const siteForm = document.getElementById('site-form');
const modalTitle = document.getElementById('modal-title');
const siteIdInput = document.getElementById('site-id');
const siteNameInput = document.getElementById('site-name');
const siteUrlInput = document.getElementById('site-url');
const statusUrlInput = document.getElementById('status-url');
const actionsUrlInput = document.getElementById('actions-url');
const siteXUrlInput = document.getElementById('site-x-url');
const siteBskyUrlInput = document.getElementById('site-bsky-url');
const categoryInput = document.getElementById('site-category');
const aspInput = document.getElementById('site-asp');
const deleteSiteBtn = document.getElementById('btn-delete-site');

// Link Modal Elements
const linkModal = document.getElementById('link-modal');
const linkForm = document.getElementById('link-form');
const linkModalTitle = document.getElementById('link-modal-title');
const linkIdInput = document.getElementById('link-id');
const linkNameInput = document.getElementById('link-name');
const linkUrlInput = document.getElementById('link-url');
const deleteLinkBtn = document.getElementById('btn-delete-link');

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  loadLinks();
  setupEventListeners();
  renderLinks();
  refreshAllSites();

  // Auto refresh every 5 mins
  setInterval(() => refreshAllSites(false), 5 * 60 * 1000);
});

// Load Sites
function loadSites() {
  const saved = localStorage.getItem('affiliate_hub_sites');
  if (saved) {
    try {
      sites = JSON.parse(saved);
    } catch (e) {
      sites = [...DEFAULT_SITES];
    }
  } else {
    sites = [...DEFAULT_SITES];
    saveSites();
  }
}

function saveSites() {
  localStorage.setItem('affiliate_hub_sites', JSON.stringify(sites));
}

// Load Links
function loadLinks() {
  const saved = localStorage.getItem('affiliate_hub_links');
  if (saved) {
    try {
      links = JSON.parse(saved);
    } catch (e) {
      links = [...DEFAULT_LINKS];
    }
  } else {
    links = [...DEFAULT_LINKS];
    saveLinks();
  }
}

function saveLinks() {
  localStorage.setItem('affiliate_hub_links', JSON.stringify(links));
}

// Render Links
function renderLinks() {
  if (!aspLinksContainer) return;
  aspLinksContainer.innerHTML = links.map(link => `
    <div class="inline-flex items-center bg-white border border-gray-200 rounded hover:border-gray-400 transition group shadow-sm">
      <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 hover:text-blue-600 transition">
        ${link.name}
      </a>
      <button onclick="openEditLinkModal('${link.id}')" class="px-1 text-gray-300 hover:text-gray-600 border-l border-gray-100 hover:bg-gray-50 rounded-r py-1 text-[10px]" title="リンク設定・編集">
        ⚙
      </button>
    </div>
  `).join('');
}

async function fetchSiteStatus(site) {
  const url = `${site.statusUrl}?t=${Date.now()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { status: 'operational', data: data, error: null };
  } catch (err) {
    return { status: 'error', data: null, error: err.message };
  }
}

async function refreshAllSites(showLoading = true) {
  if (showLoading) {
    cardContainer.innerHTML = `<div class="p-8 text-center text-xs text-gray-400 border border-gray-200 rounded">データ取得中...</div>`;
  }

  const promises = sites.map(async (site) => {
    const res = await fetchSiteStatus(site);
    siteStatuses[site.id] = res;
  });

  await Promise.allSettled(promises);

  const now = new Date();
  lastSyncTimeEl.textContent = `最終更新: ${now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;

  updateStats();
  renderCards();
}

function updateStats() {
  totalSitesEl.textContent = sites.length;
  let activeCount = 0;
  let errorCount = 0;
  let todayNew = 0;
  let todayUpdated = 0;

  sites.forEach(site => {
    const st = siteStatuses[site.id];
    if (st && st.status === 'operational' && st.data) {
      activeCount++;
      todayNew += (st.data.recent_new_count || 0);
      todayUpdated += (st.data.recent_updated_count || 0);
    } else if (st && st.status === 'error') {
      errorCount++;
    }
  });

  activeSitesEl.textContent = `${activeCount} / ${sites.length}`;
  
  if (errorCount > 0) {
    errorSitesEl.textContent = `${errorCount}件`;
    errorSitesEl.className = "text-2xl font-bold text-red-600 mt-1";
  } else {
    errorSitesEl.textContent = "0件";
    errorSitesEl.className = "text-2xl font-bold text-gray-900 mt-1";
  }

  todayNewEl.textContent = `${todayNew}件`;
  if (todayUpdatedEl) {
    todayUpdatedEl.textContent = `${todayUpdated}件`;
  }
}

function toggleExpand(siteId) {
  if (expandedSites.has(siteId)) {
    expandedSites.delete(siteId);
  } else {
    expandedSites.add(siteId);
  }
  renderCards();
}

function renderCards() {
  const filtered = sites.filter(site => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return site.name.toLowerCase().includes(q) || 
           (site.asp && site.asp.toLowerCase().includes(q)) ||
           (site.category && site.category.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    cardContainer.innerHTML = `<div class="p-8 text-center text-xs text-gray-400 border border-gray-200 rounded">該当するサイトがありません</div>`;
    return;
  }

  cardContainer.innerHTML = filtered.map(site => {
    const st = siteStatuses[site.id];
    const isOk = st && st.status === 'operational' && st.data;
    const data = isOk ? st.data : null;

    const lastUpdated = data ? data.last_updated : '取得失敗';
    const totalItems = data ? data.total_items : '--';
    const recentNew = data ? (data.recent_new_count || 0) : 0;
    const recentUpdated = data ? (data.recent_updated_count || 0) : 0;
    const recentDeleted = data ? (data.recent_deleted_count || 0) : 0;
    const rawRecentItems = (data && data.recent_items) ? data.recent_items : [];
    
    // Separate new vs updated vs deleted articles
    const hasExplicitActions = rawRecentItems.some(i => i.action === 'new' || i.action === 'updated' || i.action === 'deleted');
    let newArticles = [];
    let updatedArticles = [];
    let deletedArticles = [];

    if (hasExplicitActions) {
      newArticles = rawRecentItems.filter(i => i.action === 'new');
      updatedArticles = rawRecentItems.filter(i => i.action === 'updated');
      deletedArticles = rawRecentItems.filter(i => i.action === 'deleted');
    } else {
      newArticles = recentNew > 0 ? rawRecentItems.slice(0, recentNew) : [];
      updatedArticles = rawRecentItems.slice(newArticles.length);
      deletedArticles = [];
    }

    const isExpanded = expandedSites.has(site.id);

    return `
      <div class="bg-white border ${isExpanded ? 'border-gray-400 shadow-sm' : 'border-gray-200'} rounded overflow-hidden transition">
        
        <!-- Header / Card Row -->
        <div onclick="toggleExpand('${site.id}')" class="cursor-pointer hover:bg-gray-50/70 transition flex items-stretch justify-between select-none">
          
          <!-- Main Content 2x2 Grid (Left aligns title/meta, Right aligns numbers/buttons) -->
          <div class="flex-1 p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 items-center">
            
            <!-- Top-Left: Status Badge & Full Title & SNS Icons -->
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${isOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
                ${isOk ? '稼働中' : 'エラー'}
              </span>
              <h3 class="text-sm sm:text-base font-bold text-gray-900 leading-snug truncate">
                ${site.name}
              </h3>
              ${(site.xUrl || site.blueskyUrl) ? `
                <div class="flex items-center gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                  ${site.xUrl ? `
                    <a href="${site.xUrl}" target="_blank" rel="noopener noreferrer" class="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition flex items-center justify-center" title="X (Twitter) を開く">
                      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  ` : ''}
                  ${site.blueskyUrl ? `
                    <a href="${site.blueskyUrl}" target="_blank" rel="noopener noreferrer" class="p-1 text-[#1185fe] hover:text-[#006ee6] hover:bg-blue-50 rounded transition flex items-center justify-center" title="Bluesky を開く">
                      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.814.982-6.498-2.931-7.078-.139-.016-.277-.034-.415-.056.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
                      </svg>
                    </a>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Top-Right: Total Articles & Counts -->
            <div class="flex items-center gap-3.5 text-xs whitespace-nowrap">
              <div class="flex items-center gap-1">
                <span class="text-gray-400 text-[11px]">記事数:</span>
                <span class="font-bold text-gray-900 text-sm">${totalItems}</span>
                <span class="text-gray-400 text-[11px]">件</span>
              </div>

              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <span class="text-gray-400 text-[11px]">新着:</span>
                  <span class="font-bold text-sm ${recentNew > 0 ? 'text-amber-600' : 'text-gray-500'} font-mono">${recentNew}件</span>
                </div>
                ${recentDeleted > 0 ? `
                  <div class="flex items-center gap-1">
                    <span class="text-gray-400 text-[11px]">削除:</span>
                    <span class="font-bold text-sm text-red-600 font-mono">${recentDeleted}件</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Bottom-Left: ASP/ID & Last Updated -->
            <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
              <div class="flex items-center gap-1.5">
                <span class="text-gray-400 text-[11px]">ASP / ID:</span>
                <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium text-[11px]">
                  ${site.asp || 'DUGA'}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="text-gray-400 text-[11px]">最終更新:</span>
                <span class="font-mono text-gray-800 font-medium">${lastUpdated}</span>
              </div>
            </div>

            <!-- Bottom-Right: Action Buttons -->
            <div class="flex items-center gap-1.5 whitespace-nowrap" onclick="event.stopPropagation()">
              <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium">
                サイトを開く
              </a>
              ${site.actionsUrl ? `
                <a href="${site.actionsUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium">
                  ログ
                </a>
              ` : ''}
              <button onclick="openEditModal('${site.id}')" class="px-2 py-1 text-gray-400 hover:text-gray-700 text-xs rounded hover:bg-gray-100" title="設定">
                設定
              </button>
            </div>

          </div>

          <!-- Rightmost Column: Expand Arrow Column (Vertically Centered) -->
          <div class="flex items-center justify-center px-4 sm:px-5 border-l border-gray-100 text-gray-400 hover:text-gray-700 transition bg-gray-50/40">
            <span class="text-xs font-bold">${isExpanded ? '▲' : '▼'}</span>
          </div>

        </div>

        <!-- Expanded Accordion: 3 Simple Clean Boxes -->
        ${isExpanded ? `
          <div class="border-t border-gray-200 bg-gray-50/50 p-4 space-y-4">
            
            <!-- 1. 新規作成された記事 -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs text-gray-700 pb-1.5 border-b border-gray-200/80">
                <span class="font-bold flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full ${recentNew > 0 ? 'bg-amber-500' : 'bg-gray-300'}"></span>
                  <span>本日自動追加された新着記事</span>
                  <span class="text-[11px] font-bold ${recentNew > 0 ? 'text-amber-600' : 'text-gray-400'} font-mono">(${recentNew}件)</span>
                </span>
                ${newArticles.length > 0 ? `<span class="text-[11px] text-gray-400">クリックで生成された記事ページを開く</span>` : ''}
              </div>

              ${newArticles.length === 0 ? `
                <div class="text-xs text-gray-400 py-3 px-3.5 bg-white rounded border border-gray-200 text-center sm:text-left">
                  本日の自動更新で新しく追加された記事はありません（新着 0件）
                </div>
              ` : `
                <div class="divide-y divide-gray-100 bg-white rounded border border-gray-200 overflow-hidden">
                  ${newArticles.map((item, idx) => {
                    const itemUrl = `${site.siteUrl.replace(/\/+$/, '')}/reviews/${item.item_id}.html`;
                    return `
                      <div class="p-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span class="text-gray-400 font-mono text-[11px] w-6 flex-shrink-0 text-right tabular-nums">${idx + 1}.</span>
                          ${item.item_id ? `<span class="text-[11px] text-gray-400 font-mono whitespace-nowrap flex-shrink-0">[${item.item_id}]</span>` : ''}
                          <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="font-medium text-gray-900 hover:text-blue-600 truncate" title="${item.title}">
                            ${item.title}
                          </a>
                        </div>

                        <div class="flex items-center gap-3 whitespace-nowrap text-gray-500 text-[11px]">
                          ${item.price ? `<span>${item.price}</span>` : ''}
                          <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">
                            記事を開く ↗
                          </a>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- 2. 既存で更新された記事 -->
            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between text-xs text-gray-700 pb-1.5 border-b border-gray-200/80">
                <span class="font-bold flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full ${recentUpdated > 0 ? 'bg-blue-500' : 'bg-gray-300'}"></span>
                  <span>本日自動更新された記事</span>
                  <span class="text-[11px] font-bold ${recentUpdated > 0 ? 'text-blue-600' : 'text-gray-400'} font-mono">(${recentUpdated}件)</span>
                </span>
                ${updatedArticles.length > 0 ? `<span class="text-[11px] text-gray-400">価格・順位・レビュー等の最新化</span>` : ''}
              </div>

              ${updatedArticles.length === 0 ? `
                <div class="text-xs text-gray-400 py-3 px-3.5 bg-white rounded border border-gray-200 text-center sm:text-left">
                  本日の自動更新で更新された記事はありません（更新 0件）
                </div>
              ` : `
                <div class="divide-y divide-gray-100 bg-white rounded border border-gray-200 overflow-hidden">
                  ${updatedArticles.slice(0, 20).map((item, idx) => {
                    const itemUrl = `${site.siteUrl.replace(/\/+$/, '')}/reviews/${item.item_id}.html`;
                    return `
                      <div class="p-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span class="text-gray-400 font-mono text-[11px] w-6 flex-shrink-0 text-right tabular-nums">${idx + 1}.</span>
                          ${item.item_id ? `<span class="text-[11px] text-gray-400 font-mono whitespace-nowrap flex-shrink-0">[${item.item_id}]</span>` : ''}
                          <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="font-medium text-gray-800 hover:text-blue-600 truncate" title="${item.title}">
                            ${item.title}
                          </a>
                        </div>

                        <div class="flex items-center gap-3 whitespace-nowrap text-gray-500 text-[11px]">
                          ${item.price ? `<span>${item.price}</span>` : ''}
                          <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">
                            記事を開く ↗
                          </a>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- 3. 本日削除された記事 (リンクなし・タイトルのみ) -->
            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between text-xs text-gray-700 pb-1.5 border-b border-gray-200/80">
                <span class="font-bold flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full ${recentDeleted > 0 ? 'bg-red-500' : 'bg-gray-300'}"></span>
                  <span>本日削除された記事</span>
                  <span class="text-[11px] font-bold ${recentDeleted > 0 ? 'text-red-600' : 'text-gray-400'} font-mono">(${recentDeleted}件)</span>
                </span>
                ${deletedArticles.length > 0 ? `<span class="text-[11px] text-gray-400">販売終了検知による削除</span>` : ''}
              </div>

              ${deletedArticles.length === 0 ? `
                <div class="text-xs text-gray-400 py-3 px-3.5 bg-white rounded border border-gray-200 text-center sm:text-left">
                  本日の自動更新で削除された記事はありません（削除 0件）
                </div>
              ` : `
                <div class="divide-y divide-gray-100 bg-white rounded border border-gray-200 overflow-hidden">
                  ${deletedArticles.map((item, idx) => {
                    return `
                      <div class="p-2.5 bg-white flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span class="text-gray-400 font-mono text-[11px] w-6 flex-shrink-0 text-right tabular-nums">${idx + 1}.</span>
                          ${item.item_id ? `<span class="text-[11px] text-gray-400 font-mono whitespace-nowrap flex-shrink-0">[${item.item_id}]</span>` : ''}
                          <span class="text-gray-700 truncate select-text" title="${item.title}">
                            ${item.title}
                          </span>
                        </div>
                        <div class="whitespace-nowrap text-gray-400 text-[11px]">
                          販売終了
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>


          </div>
        ` : ''}

      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  refreshBtn.addEventListener('click', () => refreshAllSites(true));

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCards();
  });

  // Auto-fill status.json URL when site URL is entered
  siteUrlInput.addEventListener('input', (e) => {
    const rawUrl = e.target.value.trim();
    if (rawUrl) {
      const cleanUrl = rawUrl.replace(/\/+$/, '');
      if (!statusUrlInput.value || statusUrlInput.dataset.autoFilled === 'true') {
        statusUrlInput.value = `${cleanUrl}/status.json`;
        statusUrlInput.dataset.autoFilled = 'true';
      }
    } else if (statusUrlInput.dataset.autoFilled === 'true') {
      statusUrlInput.value = '';
    }
  });

  statusUrlInput.addEventListener('input', () => {
    statusUrlInput.dataset.autoFilled = 'false';
  });

  // Site Form Submit
  siteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = siteIdInput.value.trim() || 'site-' + Date.now();
    const newSite = {
      id: id,
      name: siteNameInput.value.trim(),
      category: categoryInput.value.trim(),
      asp: aspInput.value.trim(),
      siteUrl: siteUrlInput.value.trim(),
      statusUrl: statusUrlInput.value.trim(),
      actionsUrl: actionsUrlInput.value.trim(),
      xUrl: siteXUrlInput.value.trim(),
      blueskyUrl: siteBskyUrlInput.value.trim()
    };

    const idx = sites.findIndex(s => s.id === id);
    if (idx >= 0) {
      sites[idx] = newSite;
    } else {
      sites.push(newSite);
    }

    saveSites();
    closeModal();
    refreshAllSites(true);
  });

  deleteSiteBtn.addEventListener('click', () => {
    const id = siteIdInput.value.trim();
    if (confirm('このサイトを監視リストから削除しますか？')) {
      sites = sites.filter(s => s.id !== id);
      saveSites();
      closeModal();
      refreshAllSites(true);
    }
  });

  // Link Form Submit
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = linkIdInput.value.trim() || 'link-' + Date.now();
    const newLink = {
      id: id,
      name: linkNameInput.value.trim(),
      url: linkUrlInput.value.trim()
    };

    const idx = links.findIndex(l => l.id === id);
    if (idx >= 0) {
      links[idx] = newLink;
    } else {
      links.push(newLink);
    }

    saveLinks();
    closeLinkModal();
    renderLinks();
  });

  deleteLinkBtn.addEventListener('click', () => {
    const id = linkIdInput.value.trim();
    if (confirm('この管理リンクを削除しますか？')) {
      links = links.filter(l => l.id !== id);
      saveLinks();
      closeLinkModal();
      renderLinks();
    }
  });
}

// Site Modal Handlers
function openAddModal() {
  modalTitle.textContent = 'サイト追加';
  siteForm.reset();
  siteIdInput.value = '';
  statusUrlInput.dataset.autoFilled = 'true';
  siteXUrlInput.value = '';
  siteBskyUrlInput.value = '';
  deleteSiteBtn.classList.add('hidden');
  siteModal.classList.remove('hidden');
  siteModal.classList.add('flex');
}

function openEditModal(siteId) {
  const site = sites.find(s => s.id === siteId);
  if (!site) return;

  modalTitle.textContent = 'サイト設定編集';
  siteIdInput.value = site.id;
  siteNameInput.value = site.name;
  siteUrlInput.value = site.siteUrl;
  statusUrlInput.value = site.statusUrl;
  statusUrlInput.dataset.autoFilled = 'false';
  actionsUrlInput.value = site.actionsUrl || '';
  siteXUrlInput.value = site.xUrl || '';
  siteBskyUrlInput.value = site.blueskyUrl || '';
  categoryInput.value = site.category || '';
  aspInput.value = site.asp || '';

  deleteSiteBtn.classList.remove('hidden');
  siteModal.classList.remove('hidden');
  siteModal.classList.add('flex');
}

function closeModal() {
  siteModal.classList.add('hidden');
  siteModal.classList.remove('flex');
}

// Link Modal Handlers
function openAddLinkModal() {
  linkModalTitle.textContent = '管理画面リンク追加';
  linkForm.reset();
  linkIdInput.value = '';
  deleteLinkBtn.classList.add('hidden');
  linkModal.classList.remove('hidden');
  linkModal.classList.add('flex');
}

function openEditLinkModal(linkId) {
  const link = links.find(l => l.id === linkId);
  if (!link) return;

  linkModalTitle.textContent = '管理画面リンク編集';
  linkIdInput.value = link.id;
  linkNameInput.value = link.name;
  linkUrlInput.value = link.url;

  deleteLinkBtn.classList.remove('hidden');
  linkModal.classList.remove('hidden');
  linkModal.classList.add('flex');
}

function closeLinkModal() {
  linkModal.classList.add('hidden');
  linkModal.classList.remove('flex');
}

// Export / Import
function exportConfig() {
  const exportData = {
    sites: sites,
    links: links
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `affiliate_hub_config.json`;
  a.click();
}

function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        sites = imported;
        saveSites();
      } else if (imported && typeof imported === 'object') {
        if (Array.isArray(imported.sites)) {
          sites = imported.sites;
          saveSites();
        }
        if (Array.isArray(imported.links)) {
          links = imported.links;
          saveLinks();
        }
      }
      renderLinks();
      refreshAllSites(true);
      alert('設定を正常にインポートしました！');
    } catch (err) {
      alert('無効なJSONです');
    }
  };
  reader.readAsText(file);
}
