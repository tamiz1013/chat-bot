import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import UpgradePage from './pages/UpgradePage';
import AdminPanel from './pages/AdminPanel';
import './App.css';

function AppInner() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState('dashboard');

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="loader-ring" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <nav className="top-bar">
        <div className="top-bar-left">
          <div className="brand" onClick={() => setView('dashboard')}>
            <div className="brand-icon">C</div>
            <span className="brand-name">ChatBotAgent</span>
          </div>
        </div>

        <div className="top-bar-nav">
          <button
            className={`top-nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </button>
          <button
            className={`top-nav-item ${view === 'upgrade' ? 'active' : ''}`}
            onClick={() => setView('upgrade')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Upgrade
          </button>
          {user.role === 'admin' && (
            <button
              className={`top-nav-item admin-nav ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setView('admin')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin
            </button>
          )}
        </div>

        <div className="top-bar-right">
          <div className="user-pill">
            <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className={`plan-pill plan-${user.plan}`}>{user.plan}</span>
            </div>
          </div>
          <button className="logout-pill" onClick={logout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {view === 'dashboard' && <Dashboard />}
        {view === 'upgrade' && <UpgradePage />}
        {view === 'admin' && user.role === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
