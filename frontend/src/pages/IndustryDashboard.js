import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MAT_EMOJI = { plastic: '🧴', metal: '⚙️', paper: '📄', glass: '🫙', 'e-waste': '💻' };
const MATERIALS = ['plastic', 'metal', 'paper', 'glass', 'e-waste'];

export default function IndustryDashboard() {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [lots, setLots] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('lots');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ material: 'plastic', quantity_kg: '', price_per_kg: '' });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, l, m] = await Promise.all([
        axios.get('/api/demands'),
        axios.get('/api/lots'),
        axios.get('/api/demands/matches'),
      ]);
      setDemands(d.data);
      setLots(l.data.filter(l => l.status === 'available' || l.status === 'matched'));
      setMatches(m.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const postDemand = async () => {
    if (!form.quantity_kg || !form.price_per_kg) return toast.error('Fill all fields');
    try {
      const res = await axios.post('/api/demands', {
        ...form,
        quantity_kg: +form.quantity_kg,
        price_per_kg: +form.price_per_kg
      });
      toast.success('Demand posted! Checking for matches...');
      setDemands(prev => [res.data, ...prev]);
      setForm({ material: 'plastic', quantity_kg: '', price_per_kg: '' });
      setShowForm(false);
      setTimeout(fetchAll, 1000);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const acceptLot = async (lot) => {
    const myDemand = demands.find(d => d.material === lot.material && d.status === 'open');
    try {
      await axios.patch(`/api/lots/${lot.id}/accept`, { demand_id: myDemand?.id });
      toast.success(`Lot ${lot.lot_code} accepted!`);
      fetchAll();
    } catch { toast.error('Failed to accept'); }
  };

  const myAccepted = lots.filter(l => l.industry_id === user.id && l.status === 'accepted');
  const availableLots = lots.filter(l => l.status === 'available' || l.status === 'matched');
  const openDemands = demands.filter(d => d.status === 'open' || d.status === 'matched');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏭 Industry Portal</div>
          <div className="page-sub">{user.name} · {user.location}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          📋 Post Demand
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{openDemands.length}</div>
            <div className="stat-label">Active Demands</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗂️</div>
            <div className="stat-value">{availableLots.length}</div>
            <div className="stat-label">Available Lots</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🤝</div>
            <div className="stat-value">{matches.length}</div>
            <div className="stat-label">Matches Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{myAccepted.length}</div>
            <div className="stat-label">Lots Accepted</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['lots', 'demands', 'matches', 'accepted'].map(t => (
            <button key={t} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab(t)}>
              {t === 'lots' && `🗂️ Available Lots (${availableLots.length})`}
              {t === 'demands' && '📋 My Demands'}
              {t === 'matches' && `🤝 Matches (${matches.length})`}
              {t === 'accepted' && '✅ Accepted'}
            </button>
          ))}
        </div>

        {/* Available Lots */}
        {activeTab === 'lots' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Available Recyclable Supply</div>
            </div>
            {availableLots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗂️</div>
                <div className="empty-text">No lots available right now</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {availableLots.map(l => (
                  <div key={l.id} style={{
                    padding: 16, background: 'var(--dark-600)',
                    borderRadius: 10, border: `1px solid ${l.status === 'matched' ? '#7C3AED44' : 'var(--dark-500)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, color: '#C084FC' }}>{l.lot_code}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <span className={`chip chip-${l.material}`}>{MAT_EMOJI[l.material]} {l.material}</span>
                        <span className={`badge badge-${l.status}`}>{l.status}</span>
                      </div>
                      <div style={{ color: '#9CA3AF', fontSize: 13, marginTop: 6 }}>
                        {l.total_weight_kg?.toFixed(1)} kg · From: {l.aggregator_name}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => acceptLot(l)}>
                      ✅ Accept Lot
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Demands */}
        {activeTab === 'demands' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Material</th><th>Qty Needed</th><th>Price Offered</th><th>Status</th><th>Posted</th></tr>
                </thead>
                <tbody>
                  {demands.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No demands posted</td></tr>
                  ) : demands.map(d => (
                    <tr key={d.id}>
                      <td><span className={`chip chip-${d.material}`}>{MAT_EMOJI[d.material]} {d.material}</span></td>
                      <td><strong>{d.quantity_kg}</strong> kg</td>
                      <td style={{ color: '#34D399' }}>₹{d.price_per_kg}/kg</td>
                      <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString()}</td>
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
            <div style={{ marginBottom: 12, padding: 12, background: 'rgba(124,58,237,0.1)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)' }}>
              <div style={{ fontSize: 13, color: '#C084FC' }}>
                🤖 <strong>AI Matcher</strong> — automatically pairs lots with your demand when supply meets quantity threshold
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Lot</th><th>Material</th><th>Weight</th><th>Price/kg</th><th>Aggregator</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No matches yet — post a demand!</td></tr>
                  ) : matches.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#C084FC' }}>{m.lot_code}</td>
                      <td><span className={`chip chip-${m.material}`}>{MAT_EMOJI[m.material]} {m.material}</span></td>
                      <td><strong>{m.total_weight_kg?.toFixed(1)}</strong> kg</td>
                      <td style={{ color: '#34D399' }}>₹{m.price_per_kg}/kg</td>
                      <td style={{ color: '#9CA3AF' }}>{m.aggregator_name}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Accepted */}
        {activeTab === 'accepted' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Lot Code</th><th>Material</th><th>Weight</th><th>From</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {myAccepted.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No accepted lots yet</td></tr>
                  ) : myAccepted.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#C084FC' }}>{l.lot_code}</td>
                      <td><span className={`chip chip-${l.material}`}>{MAT_EMOJI[l.material]} {l.material}</span></td>
                      <td><strong>{l.total_weight_kg?.toFixed(1)}</strong> kg</td>
                      <td style={{ color: '#9CA3AF' }}>{l.aggregator_name}</td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{new Date(l.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Post Demand Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📋 Post Material Demand</div>
            <div className="form-group">
              <label className="form-label">Material Needed</label>
              <select className="form-select" value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))}>
                {MATERIALS.map(m => <option key={m} value={m}>{MAT_EMOJI[m]} {m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity (kg)</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 100"
                value={form.quantity_kg} onChange={e => setForm(p => ({ ...p, quantity_kg: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Price Offered (₹/kg)</label>
              <input className="form-input" type="number" min="1" step="0.5" placeholder="e.g. 12.5"
                value={form.price_per_kg} onChange={e => setForm(p => ({ ...p, price_per_kg: e.target.value }))} />
            </div>
            <div style={{ padding: 12, background: 'rgba(82,183,136,0.1)', borderRadius: 8, fontSize: 12, color: '#74C69D', marginBottom: 4 }}>
              🤖 AI Matcher will auto-alert you when supply meets your quantity threshold
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={postDemand}>✅ Post Demand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
