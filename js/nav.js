import { signOut, getUser } from './auth.js';
import { sb } from './supabase.js';

// ── Theme ─────────────────────────────────────────────────────────────────────
// Two-row swatch palette. Top row = pastels, bottom row = bold/vivid.
const SWATCH_COLORS = [
  // Pastel row
  '#f9c8c8', '#fdd5b1', '#fde9b3', '#c9e9c0', '#b8e8d8',
  '#c5e3f5', '#cdd9f4', '#f0c8eb', '#d6c4f0', '#d8dde3',
  // Bold row
  '#d11a48', '#d04515', '#e8a82a', '#1a8f1f', '#1ccfb8',
  '#3ec5ee', '#2266e5', '#cd1f9b', '#7c3aed', '#4a5568',
];
const DEFAULT_ACCENT = '#ea580c'; // orange

const BG_THEMES = [
  { name: 'Default', bg: '#f4f6f9', surface: '#ffffff', surface2: '#f0f2f5', border: '#e2e6ed', text: '#0f1117', text2: '#64748b', text3: '#b0bac8' },
  { name: 'Warm',    bg: '#f7f3ee', surface: '#fffdf9', surface2: '#f2ede6', border: '#e8ddd2', text: '#1a1410', text2: '#7a6a5a', text3: '#b8a898' },
  { name: 'Dark',    bg: '#0f1117', surface: '#1a1d27', surface2: '#22263a', border: '#2e3347', text: '#e8eaf0', text2: '#8b93a8', text3: '#4a5068' },
];

// Convert hex to rgba string with alpha
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyTheme() {
  const accent = localStorage.getItem('themeAccent') || DEFAULT_ACCENT;
  const bgName = localStorage.getItem('themeBg')     || 'Default';
  const bg     = BG_THEMES.find(t => t.name === bgName) || BG_THEMES[0];
  const r      = document.documentElement.style;
  r.setProperty('--accent',     accent);
  r.setProperty('--accent-10',  hexToRgba(accent, 0.10));
  r.setProperty('--accent-15',  hexToRgba(accent, 0.15));
  r.setProperty('--accent-04',  hexToRgba(accent, 0.04));
  r.setProperty('--green',      accent);
  r.setProperty('--bg',         bg.bg);
  r.setProperty('--surface',    bg.surface);
  r.setProperty('--surface2',   bg.surface2);
  r.setProperty('--border',     bg.border);
  r.setProperty('--text',       bg.text);
  r.setProperty('--text2',      bg.text2);
  r.setProperty('--text3',      bg.text3);
}
applyTheme(); // apply immediately on every page load
// ── /Theme ────────────────────────────────────────────────────────────────────

// SVG icons — kept only for footer buttons (theme + logout)
const ICONS = {
  logout:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  workspace: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

// Main nav pages — no icons, text-only labels
const PAGES = [
  { id: 'dashboard',          label: 'Dashboard',           href: 'dashboard.html' },
  { id: 'sales',              label: 'Sales',               href: 'sales.html' },
  { id: 'payments',           label: 'Payments',            href: 'payments.html' },
  { id: 'upcoming-payments',  label: 'Upcoming Payments',   href: 'upcoming-payments.html' },
  { id: 'setting',            label: 'Setting',             href: 'setting.html' },
  { id: 'ads',                label: 'Profile Ads',         href: 'ads.html' },
  { id: 'organic',            label: 'Organic',             href: 'organic.html' },
  { id: 'vsl',                label: 'Landing Page',        href: 'vsl.html' },
  { id: 'fu-tracker',         label: 'Follow Up Tracker',   href: 'fu-tracker.html' },
];

// Sidebar collapse
function getCollapsed() { return localStorage.getItem('sidebarCollapsed') === '1'; }
function setCollapsed(v) { localStorage.setItem('sidebarCollapsed', v ? '1' : '0'); }

// Active workspace
export function getActiveWorkspace() { return localStorage.getItem('activeWorkspace'); }
export function setActiveWorkspace(id) { localStorage.setItem('activeWorkspace', id); }

// ── SPA Router ────────────────────────────────────────────────────────────────
let _pageStyle   = null;
let _pageScripts = [];

async function navigateTo(href) {
  try {
    const res = await fetch(href);
    if (!res.ok) throw new Error('fetch failed');
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, 'text/html');

    _pageStyle?.remove();
    const inlineStyles = Array.from(doc.querySelectorAll('head style'));
    if (inlineStyles.length) {
      _pageStyle = document.createElement('style');
      _pageStyle.textContent = inlineStyles.map(s => s.textContent).join('\n');
      document.head.appendChild(_pageStyle);
    } else {
      _pageStyle = null;
    }

    const newMain = doc.querySelector('.main');
    const oldMain = document.querySelector('.main');
    if (newMain && oldMain) {
      newMain.style.opacity = '0';
      oldMain.replaceWith(newMain);
      requestAnimationFrame(() => {
        newMain.style.transition = 'opacity 0.18s ease';
        newMain.style.opacity    = '1';
      });
    }

    _pageScripts.forEach(s => s.remove());
    _pageScripts = [];
    for (const s of doc.querySelectorAll('script[type="module"]')) {
      const el = document.createElement('script');
      el.type = 'module';
      el.textContent = s.textContent;
      document.body.appendChild(el);
      _pageScripts.push(el);
    }

    history.pushState({ href }, '', href);
    document.title = doc.title;
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === href);
    });
  } catch (e) {
    window.location.href = href;
  }
}

window.addEventListener('popstate', e => {
  if (e.state?.href) navigateTo(e.state.href);
});
// ── /SPA Router ───────────────────────────────────────────────────────────────

export async function renderNav(activeId) {
  const sidebar = document.querySelector('.sidebar');
  const nav     = document.getElementById('sidebar-nav');
  const footer  = document.getElementById('sidebar-footer');
  if (!nav || !sidebar) return;

  // SPA: sidebar already built — just sync the active highlight and return.
  if (nav.children.length > 0) {
    nav.querySelectorAll('.nav-item[href]').forEach(a => {
      const pageId = a.getAttribute('href').replace('.html', '');
      a.classList.toggle('active', pageId === activeId);
    });
    return;
  }

  if (getCollapsed()) {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }

  // Collapse button inside logo row
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

  // Load workspaces (name + logo only)
  let workspaces = [];
  let activeWs = getActiveWorkspace();
  try {
    const { data } = await sb.from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, logo_data)');
    workspaces = (data || []).map(m => ({
      id: m.workspaces?.id,
      name: m.workspaces?.name,
      logo_data: m.workspaces?.logo_data,
      role: m.role,
    })).filter(w => w.id);
    if (workspaces.length && (!activeWs || !workspaces.find(w => w.id === activeWs))) {
      activeWs = workspaces[0].id;
      setActiveWorkspace(activeWs);
    }
  } catch(e) { console.warn('[workspaces]', e); }

  const activeWsData = workspaces.find(w => w.id === activeWs);
  const wsName       = activeWsData?.name || 'Workspace';
  const isAdmin      = activeWsData?.role === 'admin';
  const hasMultiple  = workspaces.length > 1;

  // Build sidebar header: workspace logo + name + optional dropdown
  const logoIcon = sidebar.querySelector('.logo-icon');
  const logoSpan = sidebar.querySelector('.sidebar-logo span');

  if (logoIcon) {
    if (activeWsData?.logo_data) {
      logoIcon.innerHTML = `<img src="${activeWsData.logo_data}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />`;
      logoIcon.style.overflow = 'hidden';
      logoIcon.style.background = 'transparent';
      logoIcon.style.padding = '0';
    } else {
      logoIcon.innerHTML = `<span style="font-size:14px;font-weight:700;color:#fff">${wsName.charAt(0).toUpperCase()}</span>`;
    }
    // Click behaviour depends on sidebar state:
    //  • Expanded + admin → upload logo
    //  • Expanded + non-admin → no-op (workspace switcher is on the chevron / name)
    //  • Collapsed + multiple workspaces → open workspace switcher
    logoIcon.style.cursor = (isAdmin || hasMultiple) ? 'pointer' : 'default';
    logoIcon.title = isAdmin ? 'Click to upload logo (or switch workspace when collapsed)' : 'Click to switch workspace';
    logoIcon.addEventListener('click', async e => {
      e.stopPropagation();
      const collapsed = sidebar.classList.contains('collapsed');
      // Collapsed → open workspace switcher
      if (collapsed && hasMultiple) {
        const dd = sidebar.querySelector('.ws-dropdown');
        if (dd) dd.classList.toggle('open');
        return;
      }
      // Expanded admin → upload logo
      if (isAdmin) {
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
      }
    });
  }

  if (logoSpan) {
    logoSpan.textContent = wsName;
    logoSpan.className = 'ws-name-text';
  }

  if (hasMultiple && logoRow) {
    const chevBtn = document.createElement('button');
    chevBtn.className = 'ws-chev-btn';
    chevBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
    chevBtn.title = 'Switch workspace';
    logoRow.insertBefore(chevBtn, colBtn);

    const dropdown = document.createElement('div');
    dropdown.className = 'ws-dropdown';
    dropdown.innerHTML = workspaces.map(w => `
      <div class="ws-dropdown-item ${w.id === activeWs ? 'active' : ''}" data-ws="${w.id}">
        <span class="ws-dd-initial">${w.name.charAt(0).toUpperCase()}</span>
        <span>${w.name}</span>
        ${w.id === activeWs ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:auto;color:var(--accent)"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
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

  // Nav links — text only, no icons
  nav.innerHTML = PAGES.map(p => `
    <a href="${p.href}" class="nav-item ${p.id === activeId ? 'active' : ''}">
      <span class="nav-label">${p.label}</span>
    </a>
  `).join('');

  nav.addEventListener('click', e => {
    const link = e.target.closest('.nav-item[href]');
    if (!link) return;
    e.preventDefault();
    navigateTo(link.getAttribute('href'));
  });

  PAGES.forEach(p => {
    if (!document.querySelector(`link[rel="prefetch"][href="${p.href}"]`)) {
      const lnk = document.createElement('link');
      lnk.rel  = 'prefetch';
      lnk.href = p.href;
      document.head.appendChild(lnk);
    }
  });

  // Footer: Workspaces → Appearance → Log out
  if (footer) {
    const currentAccent = localStorage.getItem('themeAccent') || DEFAULT_ACCENT;

    footer.innerHTML = `
      <!-- Theme popover -->
      <div class="theme-popover" id="theme-popover">
        <div class="theme-section-label">Your accent colour</div>
        <div class="swatch-grid" id="accent-swatches">
          ${SWATCH_COLORS.map(c => `
            <button class="swatch-btn ${c.toLowerCase()===currentAccent.toLowerCase()?'active':''}"
                    data-color="${c}" style="background:${c}" title="${c}">
              ${c.toLowerCase()===currentAccent.toLowerCase()?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}
            </button>
          `).join('')}
        </div>

        <div class="theme-section-label" style="margin-top:14px">Background</div>
        <div class="bg-swatches" id="theme-bg-swatches">
          ${BG_THEMES.map(t => `
            <div class="bg-swatch ${(localStorage.getItem('themeBg')||'Default')===t.name?'active':''}"
                 data-bg="${t.name}"
                 style="background:${t.surface}">${t.name}</div>
          `).join('')}
        </div>
      </div>

      <a href="admin.html" class="nav-item ${activeId==='admin'?'active':''}" id="ws-nav-link">
        <span class="nav-icon">${ICONS.workspace}</span>
        <span class="nav-label">Workspaces</span>
      </a>

      <button class="theme-btn" id="theme-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        <span class="nav-label">Appearance</span>
      </button>

      <button class="nav-item" id="logout-btn" style="width:100%;border:none;cursor:pointer;background:none;text-align:left">
        <span class="nav-icon">${ICONS.logout}</span>
        <span class="nav-label">Log out</span>
      </button>`;

    // Workspaces link uses SPA navigation
    const wsLink = document.getElementById('ws-nav-link');
    if (wsLink) {
      wsLink.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(wsLink.getAttribute('href'));
      });
    }

    // Theme popover toggle
    const themeBtn     = document.getElementById('theme-btn');
    const themePopover = document.getElementById('theme-popover');
    themeBtn.addEventListener('click', e => { e.stopPropagation(); themePopover.classList.toggle('open'); });
    document.addEventListener('click', () => themePopover.classList.remove('open'));
    themePopover.addEventListener('click', e => e.stopPropagation());

    // Swatch picker — per-user, saved to localStorage only
    document.getElementById('accent-swatches').addEventListener('click', e => {
      const btn = e.target.closest('.swatch-btn');
      if (!btn) return;
      const newColor = btn.dataset.color;
      localStorage.setItem('themeAccent', newColor);
      applyTheme();
      document.querySelectorAll('.swatch-btn').forEach(b => {
        const isActive = b.dataset.color.toLowerCase() === newColor.toLowerCase();
        b.classList.toggle('active', isActive);
        b.innerHTML = isActive
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
          : '';
      });
    });

    // Background swatches
    document.getElementById('theme-bg-swatches').addEventListener('click', e => {
      const sw = e.target.closest('.bg-swatch');
      if (!sw) return;
      localStorage.setItem('themeBg', sw.dataset.bg);
      applyTheme();
      document.querySelectorAll('.bg-swatch').forEach(s => s.classList.toggle('active', s.dataset.bg === sw.dataset.bg));
    });

    document.getElementById('logout-btn').addEventListener('click', signOut);
  }

  // User email
  getUser().then(u => {
    const el = document.getElementById('user-email');
    if (el && u) el.textContent = u.email;
  });
}
