import { signOut, getUser } from './auth.js';
import { sb } from './supabase.js';

// SVG icons (no emojis)
const ICONS = {
  dashboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  sales:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 10.8 19.79 19.79 0 0 1 1 2.18 2 2 0 0 1 2.98 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.27 7.91a16 16 0 0 0 5.82 5.82l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  payments:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
  setting:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  ads:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  vsl:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  admin:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  logout:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  chevron:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  organic:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M12 12C12 7 7 4 2 4c0 4 3.5 8 10 8z"/><path d="M12 12c0-5 5-8 10-8c0 4-3.5 8-10 8z"/></svg>`,
  fu:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>`,
};

const PAGES = [
  { id: 'dashboard', label: 'Dashboard',  icon: 'dashboard', href: 'dashboard.html' },
  { id: 'sales',     label: 'Sales',       icon: 'sales',     href: 'sales.html' },
  { id: 'payments',  label: 'Payments',    icon: 'payments',  href: 'payments.html' },
  { id: 'setting',    label: 'DM Setting',  icon: 'setting',   href: 'setting.html' },
  { id: 'ads',        label: 'Profile Ads', icon: 'ads',       href: 'ads.html' },
  { id: 'organic',    label: 'Organic',     icon: 'organic',   href: 'organic.html' },
  { id: 'vsl',        label: 'VSL',         icon: 'vsl',       href: 'vsl.html' },
  { id: 'fu-tracker', label: 'FU Tracker',  icon: 'fu',        href: 'fu-tracker.html' },
  { id: 'admin',      label: 'Workspaces',  icon: 'admin',     href: 'admin.html' },
];

// App name stored in localStorage
function getAppName() { return localStorage.getItem('appName') || 'Tracking Sheet'; }
function setAppName(n) { localStorage.setItem('appName', n); }

// Sidebar collapse
function getCollapsed() { return localStorage.getItem('sidebarCollapsed') === '1'; }
function setCollapsed(v) { localStorage.setItem('sidebarCollapsed', v ? '1' : '0'); }

// Active workspace
export function getActiveWorkspace() { return localStorage.getItem('activeWorkspace'); }
export function setActiveWorkspace(id) { localStorage.setItem('activeWorkspace', id); }

export async function renderNav(activeId) {
  const sidebar = document.querySelector('.sidebar');
  const nav     = document.getElementById('sidebar-nav');
  const footer  = document.getElementById('sidebar-footer');
  if (!nav || !sidebar) return;

  // Apply collapse state immediately via body class (avoids flash/gap)
  if (getCollapsed()) {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }

  // Collapse button — lives inside the logo row so sidebar stays flush with content
  const colBtn = document.createElement('button');
  colBtn.className = 'collapse-btn';
  colBtn.innerHTML = getCollapsed() ? '›' : '‹';
  colBtn.title = 'Toggle sidebar';
  const logoRow = sidebar.querySelector('.sidebar-logo');
  if (logoRow) logoRow.appendChild(colBtn);
  colBtn.addEventListener('click', () => {
    const c = !getCollapsed();
    setCollapsed(c);
    sidebar.classList.toggle('collapsed', c);
    document.body.classList.toggle('sidebar-collapsed', c);
    colBtn.innerHTML = c ? '›' : '‹';
  });

  // Resize image helper
  function resizeImage(file, maxSize = 128) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Load workspaces
  let workspaces = [];
  let activeWs = getActiveWorkspace();
  try {
    const { data } = await sb.from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, logo_data)');
    workspaces = (data || []).map(m => ({ id: m.workspaces?.id, name: m.workspaces?.name, logo_data: m.workspaces?.logo_data, role: m.role })).filter(w => w.id);
    if (workspaces.length && (!activeWs || !workspaces.find(w => w.id === activeWs))) {
      activeWs = workspaces[0].id;
      setActiveWorkspace(activeWs);
    }
  } catch(e) {}

  const activeWsData = workspaces.find(w => w.id === activeWs);
  const wsName       = activeWsData?.name || 'Workspace';
  const isAdmin      = activeWsData?.role === 'admin';
  const hasMultiple  = workspaces.length > 1;

  // Build sidebar header: workspace logo + name + optional dropdown
  const logoRow  = sidebar.querySelector('.sidebar-logo');
  const logoIcon = sidebar.querySelector('.logo-icon');
  const logoSpan = sidebar.querySelector('.sidebar-logo span');

  // Logo icon — show workspace logo or first letter
  if (logoIcon) {
    if (activeWsData?.logo_data) {
      logoIcon.innerHTML = `<img src="${activeWsData.logo_data}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />`;
      logoIcon.style.overflow = 'hidden';
      logoIcon.style.background = 'transparent';
      logoIcon.style.padding = '0';
    } else {
      logoIcon.innerHTML = `<span style="font-size:14px;font-weight:700;color:#fff">${wsName.charAt(0).toUpperCase()}</span>`;
    }
    // Admin can click logo to upload
    if (isAdmin) {
      logoIcon.style.cursor = 'pointer';
      logoIcon.title = 'Click to upload logo';
      logoIcon.addEventListener('click', e => {
        e.stopPropagation();
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async ev => {
          const file = ev.target.files[0];
          if (!file) return;
          const b64 = await resizeImage(file, 128);
          const { error } = await sb.from('workspaces').update({ logo_data: b64 }).eq('id', activeWs);
          if (!error) {
            logoIcon.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />`;
            logoIcon.style.overflow = 'hidden';
            logoIcon.style.background = 'transparent';
          }
        };
        inp.click();
      });
    }
  }

  // Workspace name in span
  if (logoSpan) {
    logoSpan.textContent = wsName;
    logoSpan.className = 'ws-name-text';
  }

  // Dropdown chevron if multiple workspaces
  if (hasMultiple && logoRow) {
    const chevBtn = document.createElement('button');
    chevBtn.className = 'ws-chev-btn';
    chevBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
    chevBtn.title = 'Switch workspace';
    logoRow.insertBefore(chevBtn, colBtn);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'ws-dropdown';
    dropdown.innerHTML = workspaces.map(w => `
      <div class="ws-dropdown-item ${w.id === activeWs ? 'active' : ''}" data-ws="${w.id}">
        <span class="ws-dd-initial">${w.name.charAt(0).toUpperCase()}</span>
        <span>${w.name}</span>
        ${w.id === activeWs ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:auto;color:#16a34a"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>
    `).join('');
    logoRow.insertAdjacentElement('afterend', dropdown);

    const toggleDD = (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); };
    logoSpan?.addEventListener('click', toggleDD);
    chevBtn.addEventListener('click', toggleDD);
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    dropdown.querySelectorAll('.ws-dropdown-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        setActiveWorkspace(item.dataset.ws);
        window.location.reload();
      });
    });
  }

  // Nav links
  nav.innerHTML = PAGES.map(p => `
    <a href="${p.href}" class="nav-item ${p.id === activeId ? 'active' : ''}">
      <span class="nav-icon">${ICONS[p.icon]}</span>
      <span class="nav-label">${p.label}</span>
    </a>
  `).join('');

  // Footer logout
  if (footer) {
    footer.innerHTML = `<button class="nav-item" id="logout-btn" style="width:100%;border:none;cursor:pointer;background:none;text-align:left">
      <span class="nav-icon">${ICONS.logout}</span>
      <span class="nav-label">Log out</span>
    </button>`;
    document.getElementById('logout-btn').addEventListener('click', signOut);
  }

  // User email
  getUser().then(u => {
    const el = document.getElementById('user-email');
    if (el && u) el.textContent = u.email;
  });
}
