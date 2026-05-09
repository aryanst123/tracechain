import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = {
  collector: [
    { icon: '📊', label: 'Dashboard', path: '/collector' },
    { icon: '📦', label: 'My Batches', path: '/collector#batches' },
    { icon: '➕', label: 'Log Batch', path: '/collector#log' },
  ],
  aggregator: [
    { icon: '📊', label: 'Dashboard', path: '/aggregator' },
    { icon: '📥', label: 'Receive Batches', path: '/aggregator#receive' },
    { icon: '🗂️', label: 'My Lots', path: '/aggregator#lots' },
    { icon: '🔗', label: 'Matches', path: '/aggregator#matches' },
  ],
  industry: [
    { icon: '📊', label: 'Dashboard', path: '/industry' },
    { icon: '📋', label: 'My Demands', path: '/industry#demands' },
    { icon: '🏭', label: 'Available Lots', path: '/industry#lots' },
    { icon: '✅', label: 'Accepted', path: '/industry#accepted' },
  ],
  admin: [
    { icon: '📊', label: 'Analytics', path: '/admin' },
    { icon: '🔍', label: 'All Batches', path: '/admin#batches' },
    { icon: '📜', label: 'Audit Log', path: '/admin#audit' },
    { icon: '🤝', label: 'Matches', path: '/admin#matches' },
  ],
};

const ROLE_COLORS = {
  collector: '#F59E0B',
  aggregator: '#60A5FA',
  industry: '#C084FC',
  admin: '#34D399',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = NAV[user?.role] || [];
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">♻️</div>
            <div>
              <div className="logo-text">TraceChain</div>
              <div className="logo-sub">Waste Network</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-label">Navigation</div>
            {navItems.map(item => (
              <button
                key={item.label}
                className={`nav-item`}
                onClick={() => navigate(item.path.split('#')[0])}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar" style={{ background: ROLE_COLORS[user?.role] + '33', color: ROLE_COLORS[user?.role] }}>
              {initials}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role" style={{ color: ROLE_COLORS[user?.role] }}>{user?.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={() => { logout(); navigate('/login'); }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
