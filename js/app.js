/**
 * Affiliate Portal Hub - Main Application Logic
 */

// State
let sites = [];
let siteStatuses = {};
let currentFilter = 'all';
let searchQuery = '';
let currentView = 'grid'; // 'grid' | 'table'
let isRefreshing = false;

// DOM Elements
const sitesContainer = document.getElementById('sites-container');
const totalSitesEl = document.getElementById('stat-total-sites');
const activeSitesEl = document.getElementById('stat-active-sites');
const totalItemsEl = document.getElementById('stat-total-items');
const todayNewEl = document.getElementById('stat-today-new');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const refreshBtn = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const viewGridBtn = document.getElementById('view-grid-btn');
const viewTableBtn = document.getElementById('view-table-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

// Modal Elements
const siteModal = document.getElementById('site-modal');
const siteForm = document.getElementById('site-form');
const modalTitle = document.getElementById('modal-title');
const siteIdInput = document.getElementById('site-id');
const siteNameInput = document.getElementById('site-name');
const siteUrlInput = document.getElementById('site-url');
const statusUrlInput = document.getElementById('status-url');
const repoUrlInput = document.getElementById('repo-url');
const actionsUrlInput = document.getElementById('actions-url');
const categoryInput = document.getElementById('site-category');
const aspInput = document.getElementById('site-asp');
const scheduleInput = document.getElementById('site-schedule');
const deleteSiteBtn = document.getElementById('btn-delete-site');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  setupEventListeners();
  refreshAllSites();

  // Auto refresh every 5 minutes
  setInterval(() => {
    refreshAllSites(false);
  }, 5 * 60 * 1000);
});

// Load sites from localStorage or defaults
function loadSites() {
  const saved = localStorage.getItem('affiliate_hub_sites');
  if (saved) {
    try {
      sites = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved sites', e);
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

// Fetch single site status
async function fetchSiteStatus(site) {
  const url = `${site.statusUrl}?t=${Date.now()}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      status: 'operational',
      data: data,
      lastCheck: new Date(),
      error: null
    };
  } catch (err) {
    console.warn(`[STATUS FETCH FAILED] ${site.name}:`, err.message);
    return {
      status: 'error',
      data: null,
      lastCheck: new Date(),
      error: err.message
    };
  }
}

// Refresh all sites
async function refreshAllSites(showLoading = true) {
  if (isRefreshing) return;
  isRefreshing = true;

  if (showLoading) {
    refreshBtn.classList.add('animate-spin');
    renderLoadingSkeletons();
  }

  const promises = sites.map(async (site) => {
    const res = await fetchSiteStatus(site);
    siteStatuses[site.id] = res;
  });

  await Promise.allSettled(promises);

  isRefreshing = false;
  refreshBtn.classList.remove('animate-spin');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  lastSyncTimeEl.textContent = `最終更新: ${timeStr}`;

  updateStats();
  renderSites();
}

// Calculate Summary Statistics
function updateStats() {
  totalSitesEl.textContent = sites.length;

  let activeCount = 0;
  let totalItems = 0;
  let todayNew = 0;

  sites.forEach(site => {
    const statusObj = siteStatuses[site.id];
    if (statusObj && statusObj.status === 'operational' && statusObj.data) {
      activeCount++;
      totalItems += (statusObj.data.total_items || 0);
      todayNew += (statusObj.data.recent_new_count || 0);
    }
  });

  activeSitesEl.textContent = `${activeCount} / ${sites.length}`;
  totalItemsEl.textContent = totalItems.toLocaleString();
  todayNewEl.textContent = `+${todayNew}`;
}

// Render Skeletons during initial load
function renderLoadingSkeletons() {
  if (currentView === 'table') return;
  sitesContainer.innerHTML = Array(sites.length || 3).fill(0).map(() => `
    <div class="glass-card rounded-2xl p-6 relative overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <div class="w-1/3 h-5 skeleton rounded"></div>
        <div class="w-16 h-6 skeleton rounded-full"></div>
      </div>
      <div class="w-3/4 h-7 skeleton rounded mb-4"></div>
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="h-16 skeleton rounded-xl"></div>
        <div class="h-16 skeleton rounded-xl"></div>
      </div>
      <div class="h-10 skeleton rounded-xl"></div>
    </div>
  `).join('');
}

// Render Sites based on filter & view
function renderSites() {
  const filtered = sites.filter(site => {
    const matchCategory = currentFilter === 'all' || site.category.includes(currentFilter) || site.asp.includes(currentFilter);
    const matchSearch = !searchQuery || 
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      site.asp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    sitesContainer.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="folder-search" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p class="text-base font-medium">条件に一致するサイトが見つかりませんでした</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  if (currentView === 'grid') {
    renderGridView(filtered);
  } else {
    renderTableView(filtered);
  }

  lucide.createIcons();
}

// Render Grid Card View
function renderGridView(siteList) {
  sitesContainer.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
  sitesContainer.innerHTML = siteList.map(site => {
    const st = siteStatuses[site.id];
    const isOk = st && st.status === 'operational' && st.data;
    const data = isOk ? st.data : null;

    const lastUpdated = data ? data.last_updated : '未取得';
    const totalItems = data ? data.total_items : '--';
    const recentNew = data ? (data.recent_new_count || 0) : 0;
    const recentItems = (data && data.recent_items) ? data.recent_items : [];

    return `
      <div class="glass-card rounded-2xl p-6 relative flex flex-col justify-between group">
        <!-- Top Badges -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
              <span class="w-2 h-2 rounded-full ${isOk ? 'bg-emerald-400 animate-pulse-glow' : 'bg-rose-500'}"></span>
              ${isOk ? '正常稼働中' : '状態要確認'}
            </span>
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">${site.category}</span>
              <button onclick="openEditModal('${site.id}')" class="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition" title="設定・編集">
                <i data-lucide="settings-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Site Title -->
          <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition line-clamp-2">
            ${site.name}
          </h3>

          <div class="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
            <i data-lucide="calendar-clock" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>最終更新: <strong class="text-slate-200 font-semibold">${lastUpdated}</strong></span>
          </div>

          <!-- Metrics Block -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <div class="text-xs text-slate-400 font-medium mb-1">登録商品数</div>
              <div class="text-xl font-extrabold text-white flex items-baseline gap-1">
                ${totalItems} <span class="text-xs font-normal text-slate-400">件</span>
              </div>
            </div>
            <div class="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <div class="text-xs text-slate-400 font-medium mb-1">本日追加</div>
              <div class="text-xl font-extrabold ${recentNew > 0 ? 'text-amber-400' : 'text-slate-300'} flex items-baseline gap-1">
                ${recentNew > 0 ? `+${recentNew}` : '0'} <span class="text-xs font-normal text-slate-400">件</span>
              </div>
            </div>
          </div>

          <!-- Recent Items Preview -->
          ${recentItems.length > 0 ? `
            <div class="mb-5 bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
              <div class="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>🔥 直近追加された作品</span>
                <span class="text-[10px] text-indigo-400 font-mono">${recentItems.length}件</span>
              </div>
              <ul class="space-y-1.5">
                ${recentItems.slice(0, 2).map(item => `
                  <li class="text-xs text-slate-300 truncate flex items-center gap-1.5">
                    <span class="text-amber-400 font-mono text-[10px]">NEW</span>
                    <span class="truncate">${item.title}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 mt-2">
          <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition shadow-lg shadow-indigo-600/20">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            サイトを開く
          </a>
          <a href="${site.actionsUrl || site.repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition" title="GitHub Actions ログ / リポジトリ">
            <i data-lucide="github" class="w-4 h-4"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Render Table View
function renderTableView(siteList) {
  sitesContainer.className = "col-span-full";
  sitesContainer.innerHTML = `
    <div class="glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th scope="col" class="px-6 py-4">状態</th>
              <th scope="col" class="px-6 py-4">サイト名 / カテゴリ</th>
              <th scope="col" class="px-6 py-4">最終更新日時 (JST)</th>
              <th scope="col" class="px-6 py-4 text-center">登録件数</th>
              <th scope="col" class="px-6 py-4 text-center">新着</th>
              <th scope="col" class="px-6 py-4 text-right">リンク / アクション</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${siteList.map(site => {
              const st = siteStatuses[site.id];
              const isOk = st && st.status === 'operational' && st.data;
              const data = isOk ? st.data : null;

              return `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                      <span class="w-2 h-2 rounded-full ${isOk ? 'bg-emerald-400 animate-pulse-glow' : 'bg-rose-500'}"></span>
                      ${isOk ? '正常' : '要確認'}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="font-bold text-white mb-0.5">${site.name}</div>
                    <div class="text-xs text-slate-400 font-medium">${site.asp} • ${site.category}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-300">
                    ${data ? data.last_updated : '未取得'}
                  </td>
                  <td class="px-6 py-4 text-center whitespace-nowrap font-bold text-white">
                    ${data ? data.total_items : '--'}
                  </td>
                  <td class="px-6 py-4 text-center whitespace-nowrap font-bold ${data && data.recent_new_count > 0 ? 'text-amber-400' : 'text-slate-400'}">
                    ${data && data.recent_new_count > 0 ? `+${data.recent_new_count}` : '0'}
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap space-x-2">
                    <a href="${site.siteUrl}" target="_blank" class="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 transition">
                      <i data-lucide="external-link" class="w-3.5 h-3.5"></i> 開く
                    </a>
                    <a href="${site.actionsUrl || site.repoUrl}" target="_blank" class="inline-flex items-center p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition" title="GitHub Actions">
                      <i data-lucide="github" class="w-3.5 h-3.5"></i>
                    </a>
                    <button onclick="openEditModal('${site.id}')" class="inline-flex items-center p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition" title="編集">
                      <i data-lucide="settings-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Event Listeners
function setupEventListeners() {
  refreshBtn.addEventListener('click', () => refreshAllSites(true));

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderSites();
  });

  viewGridBtn.addEventListener('click', () => {
    currentView = 'grid';
    viewGridBtn.classList.add('bg-slate-800', 'text-white');
    viewGridBtn.classList.remove('text-slate-400');
    viewTableBtn.classList.remove('bg-slate-800', 'text-white');
    viewTableBtn.classList.add('text-slate-400');
    renderSites();
  });

  viewTableBtn.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('bg-slate-800', 'text-white');
    viewTableBtn.classList.remove('text-slate-400');
    viewGridBtn.classList.remove('bg-slate-800', 'text-white');
    viewGridBtn.classList.add('text-slate-400');
    renderSites();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
      filterBtns.forEach(b => b.classList.add('bg-slate-800/80', 'text-slate-400'));
      btn.classList.add('bg-indigo-600', 'text-white');
      btn.classList.remove('bg-slate-800/80', 'text-slate-400');
      currentFilter = btn.dataset.filter;
      renderSites();
    });
  });

  // Modal Submit
  siteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = siteIdInput.value.trim() || 'site-' + Date.now();
    const newSite = {
      id: id,
      name: siteNameInput.value.trim(),
      category: categoryInput.value.trim() || '一般特化',
      asp: aspInput.value.trim() || 'DUGA',
      siteUrl: siteUrlInput.value.trim(),
      statusUrl: statusUrlInput.value.trim(),
      repoUrl: repoUrlInput.value.trim(),
      actionsUrl: actionsUrlInput.value.trim() || (repoUrlInput.value.trim() ? `${repoUrlInput.value.trim()}/actions` : ''),
      schedule: scheduleInput.value.trim() || '毎日 午前4:00 (JST)'
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
}

// Modal Handlers
function openAddModal() {
  modalTitle.textContent = '監視サイトの新規登録';
  siteForm.reset();
  siteIdInput.value = '';
  deleteSiteBtn.classList.add('hidden');
  siteModal.classList.remove('hidden');
  siteModal.classList.add('flex');
}

function openEditModal(siteId) {
  const site = sites.find(s => s.id === siteId);
  if (!site) return;

  modalTitle.textContent = '監視サイト設定の編集';
  siteIdInput.value = site.id;
  siteNameInput.value = site.name;
  siteUrlInput.value = site.siteUrl;
  statusUrlInput.value = site.statusUrl;
  repoUrlInput.value = site.repoUrl || '';
  actionsUrlInput.value = site.actionsUrl || '';
  categoryInput.value = site.category || '';
  aspInput.value = site.asp || '';
  scheduleInput.value = site.schedule || '';

  deleteSiteBtn.classList.remove('hidden');
  siteModal.classList.remove('hidden');
  siteModal.classList.add('flex');
}

function closeModal() {
  siteModal.classList.add('hidden');
  siteModal.classList.remove('flex');
}

// Global Export / Import Config
function exportConfig() {
  const blob = new Blob([JSON.stringify(sites, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `affiliate_portal_hub_config_${new Date().toISOString().slice(0, 10)}.json`;
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
        refreshAllSites(true);
        alert('設定を正常にインポートしました！');
      }
    } catch (err) {
      alert('無効なJSONファイルです: ' + err.message);
    }
  };
  reader.readAsText(file);
}
