import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CollectorDashboard from './pages/CollectorDashboard';
import AggregatorDashboard from './pages/AggregatorDashboard';
import IndustryDashboard from './pages/IndustryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const routes = { collector: '/collector', aggregator: '/aggregator', industry: '/industry', admin: '/admin' };
  return <Navigate to={routes[user.role] || '/login'} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1a1a2e', color: '#fff', border: '1px solid #2D6A4F' }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRouter />} />
          <Route path="/collector" element={
            <ProtectedRoute roles={['collector']}>
              <Layout><CollectorDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/aggregator" element={
            <ProtectedRoute roles={['aggregator']}>
              <Layout><AggregatorDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/industry" element={
            <ProtectedRoute roles={['industry']}>
              <Layout><IndustryDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
