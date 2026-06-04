// Shared table + form logic used by all data entry pages
import { sb } from './supabase.js';

export class TablePage {
  constructor({ table, columns, formFields, defaultSort = 'created_at', defaultHidden = [] }) {
    this.table       = table;
    this.columns     = columns;
    this.formFields  = formFields;
    this.defaultSort = defaultSort;
    this.rows        = [];
    this.editingId   = null;
    this.dateFrom    = null;
    this.dateTo      = null;
    this.search      = '';
    // Load hidden columns from localStorage; fall back to defaultHidden on first visit
    const stored = localStorage.getItem('hiddenCols_' + table);
    this.hiddenCols = stored ? new Set(JSON.parse(stored)) : new Set(defaultHidden);
  }

  saveHiddenCols() {
    localStorage.setItem('hiddenCols_' + this.table, JSON.stringify([...this.hiddenCols]));
  }

  visibleColumns() {
    return this.columns.filter(c => !this.hiddenCols.has(c.key));
  }

  async init() {
    this.renderTableHeaders();
    this.renderFormFields();
    this.bindEvents();
    await this.load();
  }

  async load() {
    this.setLoading(true);
    let q = sb.from(this.table).select('*').order(this.defaultSort, { ascending: false });
    if (this.dateFrom) q = q.gte('date', this.dateFrom);
    if (this.dateTo)   q = q.lte('date', this.dateTo);
    const { getActiveWorkspace } = await import('./workspace.js');
    const wsId = getActiveWorkspace();
    if (wsId) q = q.eq('workspace_id', wsId);
    const { data, error } = await q;
    if (error) { this.showError(error.message); return; }
    this.rows = data || [];
    this.render();
    this.setLoading(false);
  }

  render() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    let rows = this.rows;
    if (this.search) {
      const q = this.search.toLowerCase();
      rows = rows.filter(r => this.columns.some(c => String(r[c.key]||'').toLowerCase().includes(q)));
    }
    const vis = this.visibleColumns();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${vis.length + 1}" style="text-align:center;padding:40px;color:#4b5563">No records yet. Add one using the button above.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        ${vis.map(c => `<td class="td-cell" data-key="${c.key}" data-id="${r.id}" title="Click to edit">${this.formatCell(r[c.key], c)}</td>`).join('')}
        <td class="td-actions">
          <button class="row-del-btn" data-id="${r.id}" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.row-del-btn').forEach(b => b.addEventListener('click', () => this.deleteRow(b.dataset.id)));

    // Inline editing — click any cell to edit it directly
    tbody.querySelectorAll('.td-cell').forEach(td => {
      td.addEventListener('click', () => this.startInlineEdit(td));
    });
  }

  startInlineEdit(td) {
    if (td.querySelector('input,select,textarea')) return; // already editing
    const id  = td.dataset.id;
    const key = td.dataset.key;
    const row = this.rows.find(r => String(r.id) === String(id));
    if (!row) return;
    const col = this.formFields.find(f => f.key === key) || this.columns.find(c => c.key === key);
    if (!col) return;

    const raw = row[key] ?? '';
    td.classList.add('editing');

    let el;
    if (col.options) {
      el = document.createElement('select');
      el.innerHTML = `<option value="">—</option>` +
        col.options.map(o => `<option value="${o}" ${o===raw?'selected':''}>${o}</option>`).join('');
    } else if (col.type === 'date') {
      el = document.createElement('input');
      el.type  = 'date';
      el.value = raw ? raw.slice(0, 10) : '';
    } else if (col.type === 'number' || col.type === 'currency') {
      el = document.createElement('input');
      el.type  = 'number';
      el.step  = '0.01';
      el.value = raw ?? '';
    } else {
      el = document.createElement('input');
      el.type  = 'text';
      el.value = raw ?? '';
    }

    el.className = 'inline-edit-input';
    td.innerHTML = '';
    td.appendChild(el);
    el.focus();
    if (el.select) el.select();

    const save = async () => {
      const newVal = col.type === 'number' || col.type === 'currency'
        ? (el.value !== '' ? parseFloat(el.value) : null)
        : (el.value.trim() || null);
      td.classList.remove('editing');
      // Optimistically update local row
      row[key] = newVal;
      td.innerHTML = this.formatCell(newVal, col);
      td.addEventListener('click', () => this.startInlineEdit(td), { once: true });
      // Persist to Supabase
      const { error } = await sb.from(this.table).update({ [key]: newVal }).eq('id', id);
      if (error) { td.style.outline = '2px solid red'; setTimeout(() => td.style.outline = '', 2000); }
    };

    const cancel = () => {
      td.classList.remove('editing');
      td.innerHTML = this.formatCell(raw, col);
      td.addEventListener('click', () => this.startInlineEdit(td), { once: true });
    };

    el.addEventListener('blur',    save);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.removeEventListener('blur', save); cancel(); }
    });
    if (col.options) el.addEventListener('change', () => el.blur());
  }

  formatCell(val, col) {
    if (val == null || val === '') return '<span style="color:#4b5563">—</span>';
    if (col.type === 'currency') return '£' + Number(val).toLocaleString();
    if (col.type === 'date') return new Date(val).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    if (col.options) {
      const colors = { 'Live Call':'#22c55e', 'No Show':'#f87171', 'Cancelled':'#fb923c', 'Yes':'#22c55e', 'No':'#f87171', 'Fu':'#a78bfa', 'New Sale':'#3b7ef8', 'Renewal':'#fb923c', 'PIF':'#38bdf8' };
      const c = colors[val];
      if (c) return `<span style="background:${c}22;color:${c};padding:2px 8px;border-radius:5px;font-size:12px;font-weight:500">${val}</span>`;
    }
    return val;
  }

  renderTableHeaders() {
    const thead = document.getElementById('table-head');
    if (!thead) return;
    const vis = this.visibleColumns();
    thead.innerHTML = `<tr>${vis.map(c => `<th>${c.label}</th>`).join('')}<th style="width:48px"></th></tr>`;
  }

  renderFormFields() {
    const form = document.getElementById('form-fields');
    if (!form) return;
    form.innerHTML = this.formFields.map(f => `
      <div class="form-field">
        <label for="f-${f.key}">${f.label}</label>
        ${this.renderInput(f)}
      </div>
    `).join('');
  }

  renderInput(f) {
    if (f.options) return `
      <select id="f-${f.key}" name="${f.key}">
        <option value="">— Select —</option>
        ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
      </select>`;
    if (f.type === 'date') return `<input type="date" id="f-${f.key}" name="${f.key}" />`;
    if (f.type === 'number' || f.type === 'currency') return `<input type="number" id="f-${f.key}" name="${f.key}" step="0.01" min="0" placeholder="0" />`;
    if (f.type === 'textarea') return `<textarea id="f-${f.key}" name="${f.key}" rows="3" placeholder="${f.label}…"></textarea>`;
    return `<input type="text" id="f-${f.key}" name="${f.key}" placeholder="${f.label}…" />`;
  }

  getFormValues() {
    const data = {};
    this.formFields.forEach(f => {
      const el = document.getElementById('f-' + f.key);
      if (!el) return;
      const v = el.value.trim();
      data[f.key] = (f.type === 'number' || f.type === 'currency') ? (v ? parseFloat(v) : null) : (v || null);
    });
    return data;
  }

  setFormValues(row) {
    this.formFields.forEach(f => {
      const el = document.getElementById('f-' + f.key);
      if (el) el.value = row[f.key] ?? '';
    });
  }

  clearForm() {
    this.formFields.forEach(f => {
      const el = document.getElementById('f-' + f.key);
      if (el) el.value = '';
    });
    this.editingId = null;
    const title = document.getElementById('form-title');
    if (title) title.textContent = 'Add record';
    const btn = document.getElementById('form-submit');
    if (btn) btn.textContent = 'Save record';
  }

  openAddForm() {
    this.clearForm();
    this.openPanel();
  }

  openEditForm(id) {
    const row = this.rows.find(r => r.id === id);
    if (!row) return;
    this.editingId = id;
    this.setFormValues(row);
    const title = document.getElementById('form-title');
    if (title) title.textContent = 'Edit record';
    const btn = document.getElementById('form-submit');
    if (btn) btn.textContent = 'Save changes';
    this.openPanel();
  }

  openPanel() {
    document.getElementById('form-panel')?.classList.add('open');
    document.getElementById('panel-overlay')?.classList.add('open');
  }

  closePanel() {
    document.getElementById('form-panel')?.classList.remove('open');
    document.getElementById('panel-overlay')?.classList.remove('open');
    this.clearForm();
  }

  async submitForm() {
    const data = this.getFormValues();
    const btn = document.getElementById('form-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      if (this.editingId) {
        const { error } = await sb.from(this.table).update(data).eq('id', this.editingId);
        if (error) throw error;
      } else {
        const { getActiveWorkspace } = await import('./workspace.js');
        const wsId = getActiveWorkspace();
        if (wsId) data.workspace_id = wsId;
        const { error } = await sb.from(this.table).insert(data);
        if (error) throw error;
      }
      this.closePanel();
      await this.load();
    } catch(e) {
      this.showError(e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = this.editingId ? 'Save changes' : 'Save record'; }
    }
  }

  async deleteRow(id) {
    if (!confirm('Delete this record?')) return;
    const { error } = await sb.from(this.table).delete().eq('id', id);
    if (error) { this.showError(error.message); return; }
    await this.load();
  }

  bindEvents() {
    document.getElementById('add-btn')?.addEventListener('click', () => this.openAddForm());
    document.getElementById('panel-close')?.addEventListener('click', () => this.closePanel());
    document.getElementById('panel-overlay')?.addEventListener('click', () => this.closePanel());
    document.getElementById('form-submit')?.addEventListener('click', () => this.submitForm());
    document.getElementById('search-input')?.addEventListener('input', e => { this.search = e.target.value; this.render(); });

    // Column visibility picker
    this.renderColPicker();

    document.getElementById('col-picker-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const dd = document.getElementById('col-picker-dropdown');
      if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
      const dd = document.getElementById('col-picker-dropdown');
      if (dd) dd.style.display = 'none';
    });
    document.getElementById('apply-dates')?.addEventListener('click', () => {
      this.dateFrom = document.getElementById('filter-from')?.value || null;
      this.dateTo   = document.getElementById('filter-to')?.value   || null;
      this.load();
    });
    document.getElementById('clear-dates')?.addEventListener('click', () => {
      this.dateFrom = null; this.dateTo = null;
      if (document.getElementById('filter-from')) document.getElementById('filter-from').value = '';
      if (document.getElementById('filter-to'))   document.getElementById('filter-to').value   = '';
      this.load();
    });
  }

  setLoading(v) {
    const el = document.getElementById('table-loading');
    if (el) el.style.display = v ? 'flex' : 'none';
    const tw = document.getElementById('table-wrap');
    if (tw) tw.style.display = v ? 'none' : 'block';
  }

  showError(msg) {
    const el = document.getElementById('page-error');
    if (el) { el.textContent = '⚠ ' + msg; el.style.display = 'block'; }
  }

  renderColPicker() {
    const bar = document.querySelector('.filter-bar');
    if (!bar || document.getElementById('col-picker-btn')) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;margin-left:auto;flex-shrink:0';
    wrap.innerHTML = `
      <button id="col-picker-btn" class="btn-filter" title="Show/hide columns" style="display:flex;align-items:center;gap:5px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
        Columns
      </button>
      <div id="col-picker-dropdown" style="position:absolute;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.1);padding:8px;min-width:180px;z-index:200;display:none">
        ${this.columns.map(c => `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px;color:var(--text);transition:background .12s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
            <input type="checkbox" data-col="${c.key}" ${this.hiddenCols.has(c.key)?'':'checked'} style="accent-color:var(--accent);width:14px;height:14px" />
            ${c.label}
          </label>
        `).join('')}
      </div>`;
    bar.appendChild(wrap);

    wrap.querySelector('#col-picker-dropdown').addEventListener('change', e => {
      const cb = e.target;
      if (!cb.dataset.col) return;
      if (cb.checked) this.hiddenCols.delete(cb.dataset.col);
      else            this.hiddenCols.add(cb.dataset.col);
      this.saveHiddenCols();
      this.renderTableHeaders();
      this.render();
    });
    wrap.querySelector('#col-picker-dropdown').addEventListener('click', e => e.stopPropagation());
  }
}
