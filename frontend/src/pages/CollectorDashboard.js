import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const MATERIALS = ['plastic', 'metal', 'paper', 'glass', 'e-waste'];

const MAT_EMOJI = { plastic: '🧴', metal: '⚙️', paper: '📄', glass: '🫙', 'e-waste': '💻' };

export default function CollectorDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [form, setForm] = useState({ material: 'plastic', weight_kg: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await axios.get('/api/batches');
      setBatches(res.data);
    } catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBatches(); }, []);

  const submitBatch = async () => {
    if (!form.weight_kg || isNaN(form.weight_kg) || +form.weight_kg <= 0)
      return toast.error('Enter a valid weight');
    setSubmitting(true);
    try {
      const res = await axios.post('/api/batches', { ...form, weight_kg: +form.weight_kg });
      toast.success(`Batch ${res.data.batch_code} created!`);
      setBatches(prev => [res.data, ...prev]);
      setForm({ material: 'plastic', weight_kg: '', notes: '' });
      setShowForm(false);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const markTransit = async (id) => {
    try {
      const res = await axios.patch(`/api/batches/${id}/transit`);
      setBatches(prev => prev.map(b => b.id === id ? res.data : b));
      toast.success('Marked as in-transit');
    } catch { toast.error('Failed to update'); }
  };

  const total_kg = batches.reduce((s, b) => s + b.weight_kg, 0);
  const delivered = batches.filter(b => b.status === 'delivered').length;
  const in_transit = batches.filter(b => b.status === 'in-transit').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🧺 Collector Dashboard</div>
          <div className="page-sub">Welcome, {user.name} · {user.location}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ➕ Log New Batch
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{batches.length}</div>
            <div className="stat-label">Total Batches</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="stat-value">{total_kg.toFixed(1)}</div>
            <div className="stat-label">Total kg Collected</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚛</div>
            <div className="stat-value">{in_transit}</div>
            <div className="stat-label">In Transit</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>

        {/* Batches Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">My Batches</div>
            <button className="btn btn-secondary btn-sm" onClick={fetchBatches}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : batches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No batches yet. Log your first one!</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Material</th>
                    <th>Weight (kg)</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id}>
                      <td>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#74C69D' }}>
                          {b.batch_code}
                        </span>
                      </td>
                      <td>
                        <span className={`chip chip-${b.material}`}>
                          {MAT_EMOJI[b.material]} {b.material}
                        </span>
                      </td>
                      <td><strong>{b.weight_kg}</strong> kg</td>
                      <td><span className={`badge badge-${b.status.replace(' ', '-')}`}>{b.status}</span></td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setShowQR(b)}>
                            📲 QR
                          </button>
                          {b.status === 'collected' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => markTransit(b.id)}>
                              🚛 Dispatch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log Batch Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📦 Log New Batch</div>

            <div className="form-group">
              <label className="form-label">Material Type</label>
              <select className="form-select" value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))}>
                {MATERIALS.map(m => <option key={m} value={m}>{MAT_EMOJI[m]} {m}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                className="form-input" type="number" min="0.1" step="0.1"
                placeholder="e.g. 25.5"
                value={form.weight_kg}
                onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input
                className="form-input"
                placeholder="Collection location, condition, etc."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitBatch} disabled={submitting}>
                {submitting ? '⏳ Saving...' : '✅ Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">📲 Batch QR Code</div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, color: '#74C69D' }}>
                {showQR.batch_code}
              </span>
            </div>
            <div className="qr-box" style={{ margin: '0 auto 16px' }}>
              <QRCodeSVG value={showQR.batch_code} size={200} />
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 8 }}>
              {MAT_EMOJI[showQR.material]} {showQR.material} · {showQR.weight_kg} kg
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 20 }}>
              Show this QR to kabadiwala for scanning
            </div>
            <button className="btn btn-secondary" onClick={() => setShowQR(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
