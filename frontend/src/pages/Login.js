import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DEMO = [
  { role: 'Collector', phone: '9000000001', pass: 'pass123', emoji: '🧺' },
  { role: 'Collector 2', phone: '9000000002', pass: 'pass123', emoji: '🧺' },
  { role: 'Aggregator', phone: '9000000004', pass: 'pass123', emoji: '🏪' },
  { role: 'Industry', phone: '9000000006', pass: 'pass123', emoji: '🏭' },
  { role: 'Admin', phone: '9000000000', pass: 'admin123', emoji: '🛡️' },
];

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!phone || !password) return toast.error('Enter phone and password');
    setLoading(true);
    try {
      const user = await login(phone, password);
      toast.success(`Welcome, ${user.name}!`);
      const routes = { collector: '/collector', aggregator: '/aggregator', industry: '/industry', admin: '/admin' };
      navigate(routes[user.role]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (d) => {
    setPhone(d.phone);
    setPassword(d.pass);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">♻️</div>
          <div className="login-title">TraceChain</div>
          <div className="login-sub">Traceable Waste Flow Network</div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            className="form-input"
            type="tel"
            placeholder="9000000001"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? '⏳ Signing in...' : '→ Sign In'}
        </button>

        <div className="demo-accounts">
          <div className="demo-title">Demo Accounts — click to fill</div>
          <div className="demo-grid">
            {DEMO.map(d => (
              <button key={d.phone} className="demo-chip" onClick={() => fillDemo(d)}>
                <div className="demo-chip-role">{d.emoji} {d.role}</div>
                <div className="demo-chip-phone">{d.phone}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
