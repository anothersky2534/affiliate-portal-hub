/**
 * Affiliate Portal Hub - Clean Full-Width Stacked Cards Logic
 */

let sites = [];
let siteStatuses = {};
let searchQuery = '';

const cardContainer = document.getElementById('sites-card-container');
const totalSitesEl = document.getElementById('stat-total-sites');
const activeSitesEl = document.getElementById('stat-active-sites');
const totalItemsEl = document.getElementById('stat-total-items');
const todayNewEl = document.getElementById('stat-today-new');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const refreshBtn = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');

// Modal Elements
const siteModal = document.getElementById('site-modal');
const siteForm = document.getElementById('site-form');
const modalTitle = document.getElementById('modal-title');
const siteIdInput = document.getElementById('site-id');
const siteNameInput = document.getElementById('site-name');
const siteUrlInput = document.getElementById('site-url');
const statusUrlInput = document.getElementById('status-url');
const actionsUrlInput = document.getElementById('actions-url');
const categoryInput = document.getElementById('site-category');
const aspInput = document.getElementById('site-asp');
const deleteSiteBtn = document.getElementById('btn-delete-site');

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  setupEventListeners();
  refreshAllSites();

  // Auto refresh every 5 mins
  setInterval(() => refreshAllSites(false), 5 * 60 * 1000);
});

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
  let totalItems = 0;
  let todayNew = 0;

  sites.forEach(site => {
    const st = siteStatuses[site.id];
    if (st && st.status === 'operational' && st.data) {
      activeCount++;
      totalItems += (st.data.total_items || 0);
      todayNew += (st.data.recent_new_count || 0);
    }
  });

  activeSitesEl.textContent = `${activeCount} / ${sites.length}`;
  totalItemsEl.textContent = totalItems.toLocaleString();
  todayNewEl.textContent = `+${todayNew}`;
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
    const recentItems = (data && data.recent_items) ? data.recent_items : [];

    return `
      <div class="bg-white border border-gray-200 rounded p-4 hover:border-gray-300 transition shadow-sm">
        
        <!-- Main Row -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <!-- Left: Status & Site Name -->
          <div class="flex items-start sm:items-center gap-3 min-w-0">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${isOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
              ${isOk ? '稼働中' : 'エラー'}
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="text-sm font-bold text-gray-900 hover:text-blue-600 transition truncate">
                  ${site.name}
                </a>
                <span class="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  ${site.asp || 'DUGA'} ${site.category ? '・ ' + site.category : ''}
                </span>
              </div>
            </div>
          </div>

          <!-- Middle & Right: Metrics & Actions -->
          <div class="flex flex-wrap items-center justify-between lg:justify-end gap-4 sm:gap-6 text-xs text-gray-600">
            
            <!-- Last Updated -->
            <div class="whitespace-nowrap">
              <span class="text-gray-400 block text-[10px]">最終更新</span>
              <span class="font-mono text-gray-800">${lastUpdated}</span>
            </div>

            <!-- Total Items -->
            <div class="whitespace-nowrap text-right">
              <span class="text-gray-400 block text-[10px]">登録記事数</span>
              <span class="font-bold text-gray-900 text-sm">${totalItems}</span> <span class="text-[10px] text-gray-500">件</span>
            </div>

            <!-- Today's New -->
            <div class="whitespace-nowrap text-right">
              <span class="text-gray-400 block text-[10px]">新着</span>
              <span class="font-bold text-sm ${recentNew > 0 ? 'text-amber-600' : 'text-gray-400'}">${recentNew > 0 ? `+${recentNew}` : '0'}</span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1.5 whitespace-nowrap pl-2 border-l border-gray-100">
              <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                サイト開く
              </a>
              ${site.actionsUrl ? `
                <a href="${site.actionsUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                  ログ
                </a>
              ` : ''}
              <button onclick="openEditModal('${site.id}')" class="px-2 py-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100" title="設定">
                設定
              </button>
            </div>

          </div>

        </div>

        <!-- Optional Sub-Row: Recent Item Preview -->
        ${recentItems.length > 0 ? `
          <div class="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
            <span class="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">直近追加</span>
            <span class="text-gray-700 font-medium truncate max-w-2xl">${recentItems[0].title}</span>
            <span class="text-gray-400 text-[10px]">他 計${recentItems.length}件</span>
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
      actionsUrl: actionsUrlInput.value.trim()
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

function openAddModal() {
  modalTitle.textContent = 'サイト追加';
  siteForm.reset();
  siteIdInput.value = '';
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
  actionsUrlInput.value = site.actionsUrl || '';
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

function exportConfig() {
  const blob = new Blob([JSON.stringify(sites, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `affiliate_hub_sites.json`;
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
      }
    } catch (err) {
      alert('無効なJSONです');
    }
  };
  reader.readAsText(file);
}
