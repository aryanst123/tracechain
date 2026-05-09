import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MAT_EMOJI = { plastic: '🧴', metal: '⚙️', paper: '📄', glass: '🫙', 'e-waste': '💻' };
const MAT_COLORS = { plastic: '#60A5FA', metal: '#9CA3AF', paper: '#F59E0B', glass: '#22D3EE', 'e-waste': '#F87171' };
const STATUS_COLORS = { collected: '#F59E0B', 'in-transit': '#60A5FA', delivered: '#52B788' };

const ACTION_ICON = {
  BATCH_CREATED: '📦', BATCH_RECEIVED: '📥', BATCH_DISPATCHED: '🚛',
  LOT_CREATED: '🗂️', LOT_ACCEPTED: '✅',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, b, m] = await Promise.all([
        axios.get('/api/analytics/summary'),
        axios.get('/api/batches'),
        axios.get('/api/demands/matches'),
      ]);
      setData(a.data);
      setBatches(b.data);
      setMatches(m.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const matChartData = (data.by_material || []).map(m => ({
    name: m.material,
    kg: parseFloat(m.total_weight?.toFixed(1)) || 0,
    batches: m.count
  }));

  const statusPieData = (data.by_status || []).map(s => ({
    name: s.status,
    value: s.count
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🛡️ Admin Analytics</div>
          <div className="page-sub">Full network visibility — all actors, all data</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄 Refresh</button>
      </div>

      <div className="page-body">
        {/* Global Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{data.batches?.total || 0}</div>
            <div className="stat-label">Total Batches Tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="stat-value">{parseFloat(data.batches?.total_weight || 0).toFixed(0)}</div>
            <div className="stat-label">Total kg Tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗂️</div>
            <div className="stat-value">{data.lots?.total || 0}</div>
            <div className="stat-label">Lots Consolidated</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🤝</div>
            <div className="stat-value">{data.matches?.total || 0}</div>
            <div className="stat-label">Matches Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{data.users?.total || 0}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['overview', 'batches', 'audit', 'matches'].map(t => (
            <button key={t} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab(t)}>
              {t === 'overview' && '📊 Overview'}
              {t === 'batches' && '📦 All Batches'}
              {t === 'audit' && '📜 Audit Log'}
              {t === 'matches' && '🤝 Matches'}
            </button>
          ))}
        </div>

        {/* Overview Charts */}
        {activeTab === 'overview' && (
          <div className="grid-2">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Waste by Material (kg)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={matChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1A2420', border: '1px solid #2F3D35', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#74C69D' }}
                  />
                  <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
                    {matChartData.map((entry, i) => (
                      <Cell key={i} fill={MAT_COLORS[entry.name] || '#52B788'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Batch Status Distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#52B788'} />
                    ))}
                  </Pie>
                  <Legend formatter={(val) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{val}</span>} />
                  <Tooltip
                    contentStyle={{ background: '#1A2420', border: '1px solid #2F3D35', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-title" style={{ marginBottom: 16 }}>Recent Activity</div>
              <div className="audit-trail">
                {(data.recent_activity || []).slice(0, 8).map(log => (
                  <div key={log.id} className="audit-item">
                    <div className="audit-dot">{ACTION_ICON[log.action] || '📋'}</div>
                    <div className="audit-content">
                      <div className="audit-action" style={{ fontSize: 13 }}>
                        {log.action.replace(/_/g, ' ')}
                        {log.weight_kg ? <span style={{ color: '#74C69D', marginLeft: 8 }}>{log.weight_kg} kg</span> : null}
                      </div>
                      <div className="audit-meta">
                        {log.actor_name} ({log.actor_role})
                        {log.details ? ` · ${log.details}` : ''}
                        · {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Batches */}
        {activeTab === 'batches' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">All Batches — Full Network View</div>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{batches.length} total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Batch Code</th><th>Material</th><th>Weight</th><th>Status</th><th>Collector</th><th>Aggregator</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#74C69D' }}>{b.batch_code}</td>
                      <td><span className={`chip chip-${b.material}`}>{MAT_EMOJI[b.material]} {b.material}</span></td>
                      <td><strong>{b.weight_kg}</strong> kg</td>
                      <td><span className={`badge badge-${b.status.replace(' ', '-')}`}>{b.status}</span></td>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{b.collector_name}</td>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{b.aggregator_name || '—'}</td>
                      <td style={{ color: '#6B7280', fontSize: 11 }}>{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Full Audit Log */}
        {activeTab === 'audit' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">📜 Append-Only Audit Chain</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Tamper-proof · Every action logged</div>
            </div>
            <div className="audit-trail">
              {(data.recent_activity || []).map(log => (
                <div key={log.id} className="audit-item">
                  <div className="audit-dot">{ACTION_ICON[log.action] || '📋'}</div>
                  <div className="audit-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="audit-action">{log.action.replace(/_/g, ' ')}</div>
                      <span className="badge badge-delivered" style={{ fontSize: 10 }}>{log.actor_role}</span>
                    </div>
                    <div className="audit-meta">
                      By <strong style={{ color: '#D1FAE5' }}>{log.actor_name}</strong>
                      {log.details ? ` · ${log.details}` : ''}
                      {log.weight_kg ? ` · ${log.weight_kg} kg` : ''}
                    </div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#374151', marginTop: 2 }}>
                      {log.batch_id ? `BATCH: ${log.batch_id}` : ''}
                      {log.lot_id ? `LOT: ${log.lot_id}` : ''}
                      · {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches */}
        {activeTab === 'matches' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">🤝 Supply-Demand Matches</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Lot Code</th><th>Material</th><th>Weight (kg)</th><th>₹/kg</th><th>Aggregator</th><th>Industry</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No matches yet</td></tr>
                  ) : matches.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#C084FC' }}>{m.lot_code}</td>
                      <td><span className={`chip chip-${m.material}`}>{MAT_EMOJI[m.material]} {m.material}</span></td>
                      <td><strong>{m.total_weight_kg?.toFixed(1)}</strong></td>
                      <td style={{ color: '#34D399' }}>₹{m.price_per_kg}</td>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{m.aggregator_name}</td>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{m.industry_name}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
