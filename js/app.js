/**
 * Affiliate Portal Hub - Clean Minimal Logic
 */

let sites = [];
let siteStatuses = {};
let searchQuery = '';

const tableBody = document.getElementById('sites-table-body');
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
    tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">データ取得中...</td></tr>`;
  }

  const promises = sites.map(async (site) => {
    const res = await fetchSiteStatus(site);
    siteStatuses[site.id] = res;
  });

  await Promise.allSettled(promises);

  const now = new Date();
  lastSyncTimeEl.textContent = `最終更新: ${now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;

  updateStats();
  renderTable();
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

function renderTable() {
  const filtered = sites.filter(site => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return site.name.toLowerCase().includes(q) || 
           (site.asp && site.asp.toLowerCase().includes(q)) ||
           (site.category && site.category.toLowerCase().includes(q));
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">該当するサイトがありません</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(site => {
    const st = siteStatuses[site.id];
    const isOk = st && st.status === 'operational' && st.data;
    const data = isOk ? st.data : null;

    const lastUpdated = data ? data.last_updated : '取得失敗';
    const totalItems = data ? data.total_items : '--';
    const recentNew = data ? (data.recent_new_count || 0) : 0;
    const recentItems = (data && data.recent_items) ? data.recent_items : [];

    return `
      <tr class="hover:bg-gray-50/80 transition">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${isOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
            ${isOk ? '稼働中' : 'エラー'}
          </span>
        </td>
        <td class="px-4 py-3">
          <div class="font-bold text-gray-900">${site.name}</div>
          <div class="text-[11px] text-gray-500">${site.asp || 'DUGA'} ${site.category ? '・ ' + site.category : ''}</div>
          ${recentItems.length > 0 ? `
            <div class="mt-1 text-[11px] text-gray-600">
              <span class="text-amber-700 font-medium">新着例:</span> ${recentItems[0].title.substring(0, 30)}...
            </div>
          ` : ''}
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
          ${lastUpdated}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap font-bold text-gray-900">
          ${totalItems}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap font-bold ${recentNew > 0 ? 'text-amber-600' : 'text-gray-400'}">
          ${recentNew > 0 ? `+${recentNew}` : '0'}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap space-x-2">
          <a href="${site.siteUrl}" target="_blank" rel="noopener noreferrer" class="inline-block px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            サイト開く
          </a>
          ${site.actionsUrl ? `
            <a href="${site.actionsUrl}" target="_blank" rel="noopener noreferrer" class="inline-block px-2.5 py-1 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
              ログ
            </a>
          ` : ''}
          <button onclick="openEditModal('${site.id}')" class="inline-block px-2 py-1 text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded">
            設定
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function setupEventListeners() {
  refreshBtn.addEventListener('click', () => refreshAllSites(true));

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTable();
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
