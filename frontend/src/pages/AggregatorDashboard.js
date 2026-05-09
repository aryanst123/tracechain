import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MAT_EMOJI = { plastic: '🧴', metal: '⚙️', paper: '📄', glass: '🫙', 'e-waste': '💻' };

export default function AggregatorDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [lots, setLots] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scanCode, setScanCode] = useState('');
  const [scannedBatch, setScannedBatch] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotMaterial, setLotMaterial] = useState('plastic');
  const [auditBatch, setAuditBatch] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('batches');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, l, m] = await Promise.all([
        axios.get('/api/batches'),
        axios.get('/api/lots'),
        axios.get('/api/demands/matches'),
      ]);
      setBatches(b.data);
      setLots(l.data);
      setMatches(m.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const scanBatch = async () => {
    if (!scanCode.trim()) return;
    try {
      const res = await axios.get(`/api/batches/scan/${scanCode.trim()}`);
      setScannedBatch(res.data);
      toast.success('Batch found!');
    } catch { toast.error('Batch not found'); setScannedBatch(null); }
  };

  const receiveBatch = async (id) => {
    try {
      const res = await axios.patch(`/api/batches/${id}/receive`);
      toast.success('Batch received!');
      setBatches(prev => prev.map(b => b.id === id ? res.data : b));
      setScannedBatch(null);
      setScanCode('');
    } catch { toast.error('Failed to receive'); }
  };

  const createLot = async () => {
    if (!selectedBatches.length) return toast.error('Select at least one batch');
    try {
      const res = await axios.post('/api/lots', { batch_ids: selectedBatches, material: lotMaterial });
      toast.success(`Lot ${res.data.lot_code} created!`);
      setLots(prev => [res.data, ...prev]);
      setSelectedBatches([]);
      setShowLotModal(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const viewAudit = async (batchId) => {
    try {
      const res = await axios.get(`/api/batches/${batchId}/audit`);
      setAuditLogs(res.data);
      setAuditBatch(batchId);
    } catch { toast.error('Failed to load audit'); }
  };

  const myBatches = batches.filter(b => b.aggregator_id === user.id && b.status === 'delivered');
  const incomingBatches = batches.filter(b => b.status === 'in-transit');
  const totalKg = myBatches.reduce((s, b) => s + b.weight_kg, 0);

  const ACTION_ICON = {
    BATCH_CREATED: '📦', BATCH_RECEIVED: '📥', BATCH_DISPATCHED: '🚛',
    LOT_CREATED: '🗂️', LOT_ACCEPTED: '✅',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏪 Aggregator Dashboard</div>
          <div className="page-sub">{user.name} · {user.location}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => { setSelectedBatches([]); setShowLotModal(true); }}>
            🗂️ Create Lot
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-value">{incomingBatches.length}</div>
            <div className="stat-label">Incoming Batches</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{myBatches.length}</div>
            <div className="stat-label">Received Batches</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="stat-value">{totalKg.toFixed(0)}</div>
            <div className="stat-label">kg in Stock</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗂️</div>
            <div className="stat-value">{lots.length}</div>
            <div className="stat-label">Lots Created</div>
          </div>
        </div>

        {/* Scan QR */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>📲 Scan / Enter Batch Code</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              placeholder="WN-XXXXXXX-XXXX"
              value={scanCode}
              onChange={e => setScanCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scanBatch()}
              style={{ fontFamily: 'Space Mono, monospace', flex: 1 }}
            />
            <button className="btn btn-primary" onClick={scanBatch}>🔍 Scan</button>
          </div>

          {scannedBatch && (
            <div style={{
              marginTop: 14, padding: 16, background: 'var(--dark-600)',
              borderRadius: 10, border: '1px solid var(--green-700)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'Space Mono, monospace', color: '#74C69D', fontSize: 13 }}>{scannedBatch.batch_code}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
                    <span className={`chip chip-${scannedBatch.material}`}>{MAT_EMOJI[scannedBatch.material]} {scannedBatch.material}</span>
                    <span className={`badge badge-${scannedBatch.status}`}>{scannedBatch.status}</span>
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 13, marginTop: 6 }}>
                    {scannedBatch.weight_kg} kg · Collector: {scannedBatch.collector_name}
                  </div>
                </div>
                {scannedBatch.status === 'in-transit' && (
                  <button className="btn btn-primary" onClick={() => receiveBatch(scannedBatch.id)}>
                    ✅ Receive
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['batches', 'incoming', 'lots', 'matches'].map(t => (
            <button key={t} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab(t)}>
              {t === 'batches' && '📦 My Batches'}
              {t === 'incoming' && `📥 Incoming (${incomingBatches.length})`}
              {t === 'lots' && '🗂️ Lots'}
              {t === 'matches' && '🤝 Matches'}
            </button>
          ))}
        </div>

        {/* My Batches */}
        {activeTab === 'batches' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Batch Code</th><th>Material</th><th>Weight</th><th>Collector</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {myBatches.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No batches received yet</td></tr>
                  ) : myBatches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#74C69D' }}>{b.batch_code}</td>
                      <td><span className={`chip chip-${b.material}`}>{MAT_EMOJI[b.material]} {b.material}</span></td>
                      <td><strong>{b.weight_kg}</strong> kg</td>
                      <td style={{ color: '#9CA3AF' }}>{b.collector_name}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="checkbox" checked={selectedBatches.includes(b.id)}
                            onChange={e => setSelectedBatches(prev => e.target.checked ? [...prev, b.id] : prev.filter(x => x !== b.id))}
                            style={{ accentColor: '#52B788', cursor: 'pointer' }}
                          />
                          <button className="btn btn-outline btn-sm" onClick={() => viewAudit(b.id)}>📜 Trail</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedBatches.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>{selectedBatches.length} selected</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowLotModal(true)}>
                  🗂️ Consolidate into Lot
                </button>
              </div>
            )}
          </div>
        )}

        {/* Incoming */}
        {activeTab === 'incoming' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Batch Code</th><th>Material</th><th>Weight</th><th>Collector</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {incomingBatches.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No incoming batches</td></tr>
                  ) : incomingBatches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#74C69D' }}>{b.batch_code}</td>
                      <td><span className={`chip chip-${b.material}`}>{MAT_EMOJI[b.material]} {b.material}</span></td>
                      <td><strong>{b.weight_kg}</strong> kg</td>
                      <td style={{ color: '#9CA3AF' }}>{b.collector_name}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => receiveBatch(b.id)}>✅ Receive</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lots */}
        {activeTab === 'lots' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Lot Code</th><th>Material</th><th>Total Weight</th><th>Status</th><th>Industry</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {lots.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No lots created yet</td></tr>
                  ) : lots.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#C084FC' }}>{l.lot_code}</td>
                      <td><span className={`chip chip-${l.material}`}>{MAT_EMOJI[l.material]} {l.material}</span></td>
                      <td><strong>{l.total_weight_kg?.toFixed(1)}</strong> kg</td>
                      <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                      <td style={{ color: '#9CA3AF' }}>{l.industry_name || '—'}</td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matches */}
        {activeTab === 'matches' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Lot</th><th>Material</th><th>Weight</th><th>Price/kg</th><th>Industry</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No matches yet</td></tr>
                  ) : matches.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#C084FC' }}>{m.lot_code}</td>
                      <td><span className={`chip chip-${m.material}`}>{MAT_EMOJI[m.material]} {m.material}</span></td>
                      <td><strong>{m.total_weight_kg?.toFixed(1)}</strong> kg</td>
                      <td style={{ color: '#34D399' }}>₹{m.price_per_kg}/kg</td>
                      <td style={{ color: '#9CA3AF' }}>{m.industry_name}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Lot Modal */}
      {showLotModal && (
        <div className="modal-overlay" onClick={() => setShowLotModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🗂️ Create Consolidated Lot</div>
            <div className="form-group">
              <label className="form-label">Material Type</label>
              <select className="form-select" value={lotMaterial} onChange={e => setLotMaterial(e.target.value)}>
                {['plastic','metal','paper','glass','e-waste'].map(m => (
                  <option key={m} value={m}>{MAT_EMOJI[m]} {m}</option>
                ))}
              </select>
            </div>
            <div style={{ padding: 14, background: 'var(--dark-600)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>
                Selected batches: <strong style={{ color: '#fff' }}>{selectedBatches.length}</strong>
              </div>
              {selectedBatches.length === 0 && (
                <div style={{ color: '#6B7280', fontSize: 12 }}>
                  Go back and select batches using the checkboxes, or this will use all your delivered batches.
                </div>
              )}
              <div style={{ fontSize: 13, color: '#74C69D' }}>
                Est. weight: {myBatches
                  .filter(b => selectedBatches.length === 0 || selectedBatches.includes(b.id))
                  .reduce((s, b) => s + b.weight_kg, 0).toFixed(1)} kg
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLotModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createLot}>✅ Create Lot</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditBatch && (
        <div className="modal-overlay" onClick={() => setAuditBatch(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">📜 Audit Trail</div>
            <div className="audit-trail">
              {auditLogs.length === 0 ? (
                <div style={{ color: '#6B7280', textAlign: 'center', padding: 20 }}>No log entries</div>
              ) : auditLogs.map(log => (
                <div key={log.id} className="audit-item">
                  <div className="audit-dot">{ACTION_ICON[log.action] || '📋'}</div>
                  <div className="audit-content">
                    <div className="audit-action">{log.action.replace(/_/g, ' ')}</div>
                    <div className="audit-meta">
                      {log.actor_name} ({log.actor_role}) · {log.details} · {log.weight_kg} kg
                    </div>
                    <div className="audit-meta">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAuditBatch(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ACTION_ICON = {
  BATCH_CREATED: '📦', BATCH_RECEIVED: '📥', BATCH_DISPATCHED: '🚛',
  LOT_CREATED: '🗂️', LOT_ACCEPTED: '✅',
};
