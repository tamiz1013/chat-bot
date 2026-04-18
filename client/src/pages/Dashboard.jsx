import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStats, getBots, createBot, deleteBot } from '../api';
import BotDetail from './BotDetail';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [newBotName, setNewBotName] = useState('');
  const [newBotOrigin, setNewBotOrigin] = useState('');
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState('');

  const loadData = async () => {
    try {
      const [statsData, botsData] = await Promise.all([getStats(), getBots()]);
      setStats(statsData);
      setBots(botsData.bots);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateBot = async (e) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    try {
      const allowedOrigins = newBotOrigin.trim() ? newBotOrigin.split(',').map((o) => o.trim()).filter(Boolean) : [];
      const data = await createBot({ name: newBotName.trim(), allowedOrigins });
      setNewBotName('');
      setNewBotOrigin('');
      if (data.apiKey) setCreatedKey(data.apiKey);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBot = async (id) => {
    if (!confirm('Delete this bot and all its API keys?')) return;
    try {
      await deleteBot(id);
      if (selectedBotId === id) setSelectedBotId(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (selectedBotId) {
    return <BotDetail botId={selectedBotId} onBack={() => { setSelectedBotId(null); loadData(); }} />;
  }

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dash-greeting">Welcome back, <strong>{user?.name}</strong></p>
        </div>
      </div>

      {error && <div className="dash-error">{error}</div>}

      {/* New API Key Banner */}
      {createdKey && (
        <div className="new-key-banner">
          <p><strong>🔑 API Key auto-generated for your new bot:</strong></p>
          <code
            className="key-display"
            onClick={() => { navigator.clipboard?.writeText(createdKey); alert('Copied!'); }}
          >
            {createdKey}
          </code>
          <button onClick={() => setCreatedKey('')}>Dismiss</button>
        </div>
      )}

          {/* Stats */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon bots-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v3a2 2 0 002 2h1v4a2 2 0 002 2h6a2 2 0 002-2v-4h1a2 2 0 002-2V8a2 2 0 00-2-2h-3V5a3 3 0 00-3-3z"/></svg>
                </div>
                <div className="stat-body">
                  <span className="stat-value">{stats.totalBots} <span className="stat-limit">/ {stats.botLimit}</span></span>
                  <span className="stat-label">Active Bots</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon msgs-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div className="stat-body">
                  <span className="stat-value">{stats.monthlyMessages.toLocaleString()} <span className="stat-limit">/ {stats.messageLimit.toLocaleString()}</span></span>
                  <span className="stat-label">Messages This Month</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon convos-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div className="stat-body">
                  <span className="stat-value">{stats.totalConversations}</span>
                  <span className="stat-label">Total Conversations</span>
                </div>
              </div>
            </div>
          )}

          {/* Create Bot */}
          <div className="section-header">
            <h2>Your Bots</h2>
          </div>
          <form className="create-bot-form" onSubmit={handleCreateBot}>
            <input
              placeholder="Enter bot name (e.g. Mario's Pizza Support)"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
            />
            <input
              placeholder="Allowed origin (e.g. https://mysite.com)"
              value={newBotOrigin}
              onChange={(e) => setNewBotOrigin(e.target.value)}
            />
            <button type="submit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Bot
            </button>
          </form>

          {/* Bots List */}
          <div className="bots-list">
            {bots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v3a2 2 0 002 2h1v4a2 2 0 002 2h6a2 2 0 002-2v-4h1a2 2 0 002-2V8a2 2 0 00-2-2h-3V5a3 3 0 00-3-3z"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>
                </div>
                <h3>No bots yet</h3>
                <p>Create your first bot above to get started</p>
              </div>
            ) : (
              bots.map((bot) => (
                <div key={bot._id} className="bot-card" onClick={() => setSelectedBotId(bot._id)}>
                  <div className="bot-avatar">{bot.name.charAt(0).toUpperCase()}</div>
                  <div className="bot-info">
                    <h3>{bot.name}</h3>
                    <span className="bot-meta">
                      {bot.knowledgeBase?.length || 0} knowledge entries
                    </span>
                  </div>
                  <div className="bot-status">
                    <span className={`status-dot ${bot.isActive ? 'active' : 'inactive'}`} />
                    <span>{bot.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteBot(bot._id); }} title="Delete bot">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
    </div>
  );
}
