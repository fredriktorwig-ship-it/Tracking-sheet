// Shared table + form logic used by all data entry pages
import { sb } from './supabase.js';

export class TablePage {
  constructor({ table, columns, formFields, defaultSort = 'created_at' }) {
    this.table       = table;
    this.columns     = columns;       // { key, label, type, options? }
    this.formFields  = formFields;    // same shape as columns
    this.defaultSort = defaultSort;
    this.rows        = [];
    this.editingId   = null;
    this.dateFrom    = null;
    this.dateTo      = null;
    this.search      = '';
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
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${this.columns.length + 1}" style="text-align:center;padding:40px;color:#4b5563">No records yet. Add one using the button above.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        ${this.columns.map(c => `<td class="td-cell" data-key="${c.key}" data-id="${r.id}">${this.formatCell(r[c.key], c)}</td>`).join('')}
        <td class="td-actions">
          <button class="row-edit-btn" data-id="${r.id}" title="Edit">✏️</button>
          <button class="row-del-btn"  data-id="${r.id}" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.row-del-btn').forEach(b => b.addEventListener('click', () => this.deleteRow(b.dataset.id)));
    tbody.querySelectorAll('.row-edit-btn').forEach(b => b.addEventListener('click', () => this.openEditForm(b.dataset.id)));
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
    thead.innerHTML = `<tr>${this.columns.map(c => `<th>${c.label}</th>`).join('')}<th style="width:80px"></th></tr>`;
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
}
