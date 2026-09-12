/**
 * Affiliate Portal Hub - Accordion Cards Logic
 */

let sites = [];
let siteStatuses = {};
let searchQuery = '';
let expandedSites = new Set(); // Stores expanded site IDs

const cardContainer = document.getElementById('sites-card-container');
const totalSitesEl = document.getElementById('stat-total-sites');
const activeSitesEl = document.getElementById('stat-active-sites');
const errorSitesEl = document.getElementById('stat-error-sites');
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
  let errorCount = 0;
  let todayNew = 0;

  sites.forEach(site => {
    const st = siteStatuses[site.id];
    if (st && st.status === 'operational' && st.data) {
      activeCount++;
      todayNew += (st.data.recent_new_count || 0);
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

  todayNewEl.textContent = `+${todayNew}`;
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
    const recentItems = (data && data.recent_items) ? data.recent_items : [];
    const isExpanded = expandedSites.has(site.id);

    return `
      <div class="bg-white border ${isExpanded ? 'border-gray-400 shadow-sm' : 'border-gray-200'} rounded overflow-hidden transition">
        
        <!-- Header / Card Row (Clickable) -->
        <div onclick="toggleExpand('${site.id}')" class="p-4 cursor-pointer hover:bg-gray-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          
          <!-- Left: Status & Site Name -->
          <div class="flex items-start sm:items-center gap-3 min-w-0">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${isOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
              ${isOk ? '稼働中' : 'エラー'}
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-bold text-gray-900 truncate">
                  ${site.name}
                </span>
                <span class="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  ${site.asp || 'DUGA'} ${site.category ? '・ ' + site.category : ''}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Metrics & Actions -->
          <div class="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 text-xs text-gray-600">
            
            <div class="whitespace-nowrap text-right">
              <span class="text-gray-400 block text-[10px]">更新</span>
              <span class="font-mono text-gray-700">${lastUpdated ? lastUpdated.split(' ')[1] || lastUpdated : '--'}</span>
            </div>

            <div class="whitespace-nowrap text-right">
              <span class="text-gray-400 block text-[10px]">総記事数</span>
              <span class="font-bold text-gray-900">${totalItems}</span> <span class="text-[10px] text-gray-500">件</span>
            </div>

            <div class="whitespace-nowrap text-right">
              <span class="text-gray-400 block text-[10px]">新着</span>
              <span class="font-bold ${recentNew > 0 ? 'text-amber-600' : 'text-gray-400'}">${recentNew > 0 ? `+${recentNew}` : '0'}</span>
            </div>

            <!-- Action Buttons (Stop propagation so they don't toggle accordion) -->
            <div class="flex items-center gap-1.5 whitespace-nowrap pl-2 border-l border-gray-100" onclick="event.stopPropagation()">
              <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs">
                開く
              </a>
              ${site.actionsUrl ? `
                <a href="${site.actionsUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs">
                  ログ
                </a>
              ` : ''}
              <button onclick="openEditModal('${site.id}')" class="px-2 py-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 text-xs" title="設定">
                設定
              </button>
            </div>

            <!-- Expand Toggle Icon -->
            <div class="text-gray-400 text-xs pl-1">
              ${isExpanded ? '▲' : '▼'}
            </div>

          </div>

        </div>

        <!-- Expanded Accordion: Recent Added Pages List -->
        ${isExpanded ? `
          <div class="border-t border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div class="flex items-center justify-between text-xs font-bold text-gray-700 pb-2 border-b border-gray-200/80">
              <span>📋 直近で追加・更新されたページ一覧 (${recentItems.length}件)</span>
              <span class="text-[11px] font-normal text-gray-500">クリックで各記事ページを直接確認</span>
            </div>

            ${recentItems.length === 0 ? `
              <div class="text-xs text-gray-400 py-3 text-center">新着記事データはありません</div>
            ` : `
              <div class="divide-y divide-gray-200/60 bg-white rounded border border-gray-200">
                ${recentItems.map((item, idx) => {
                  const itemUrl = `${site.siteUrl.replace(/\/+$/, '')}/reviews/${item.item_id}.html`;
                  return `
                    <div class="p-2.5 hover:bg-blue-50/40 transition flex items-center justify-between gap-3 text-xs">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="text-gray-400 font-mono text-[11px] w-5 text-right">${idx + 1}.</span>
                        <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded whitespace-nowrap font-medium">
                          ${item.category || '一般'}
                        </span>
                        <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="font-medium text-gray-900 hover:text-blue-600 truncate">
                          ${item.title}
                        </a>
                      </div>

                      <div class="flex items-center gap-3 whitespace-nowrap text-gray-500 text-[11px]">
                        ${item.price ? `<span>${item.price}</span>` : ''}
                        ${item.rating ? `<span class="text-amber-600 font-medium">★${item.rating}</span>` : ''}
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
