// api.js — all communication with Flask backend

const API = {

  async saveRecord(data) {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const j = await res.json();
      throw new Error(Array.isArray(j.error) ? j.error.join(', ') : j.error);
    }
    return res.json();
  },

  async loadRecord(id) {
    const res = await fetch('/api/records/' + id);
    if (!res.ok) throw new Error('Record not found');
    return res.json();
  },

  async listRecords() {
    const res = await fetch('/api/records');
    if (!res.ok) throw new Error('Failed to load records');
    return res.json();
  },

  async deleteRecord(id) {
    const res = await fetch('/api/records/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete record');
    return res.json();
  },

  exportPdf(id) {
    // Opens PDF in new tab / triggers download
    window.open('/api/export/' + id + '/pdf', '_blank');
  }

};
