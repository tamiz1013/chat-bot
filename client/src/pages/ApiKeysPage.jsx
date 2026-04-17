import { useState, useEffect } from 'react';
import { getKeys, createKey, revokeKey } from '../api';
import './ApiKeysPage.css';

export default function ApiKeysPage({ bots }) {
  const [keys, setKeys] = useState([]);
  const [selectedBot, setSelectedBot] = useState('');
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [error, setError] = useState('');

  const loadKeys = async () => {
    try {
      const data = await getKeys();
      setKeys(data.keys);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedBot) return setError('Select a bot first');
    try {
      const data = await createKey(selectedBot, label || 'Default');
      setNewKey(data.key);
      setLabel('');
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    try {
      await revokeKey(id);
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="keys-page">
      {/* New key display */}
      {newKey && (
        <div className="new-key-banner">
          <p><strong>🔑 New API Key (save it now, it won't be shown again):</strong></p>
          <code
            className="key-display"
            onClick={() => { navigator.clipboard?.writeText(newKey); alert('Copied!'); }}
          >
            {newKey}
          </code>
          <button onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}

      {error && <p className="dash-error">{error}</p>}

      <form className="key-form" onSubmit={handleCreate}>
        <select value={selectedBot} onChange={(e) => setSelectedBot(e.target.value)}>
          <option value="">Select a bot...</option>
          {bots.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="submit">Generate Key</button>
      </form>

      <div className="keys-list">
        {keys.length === 0 ? (
          <p className="muted">No API keys yet. Generate one above.</p>
        ) : (
          keys.map((k) => (
            <div key={k._id} className={`key-card ${!k.isActive ? 'revoked' : ''}`}>
              <div className="key-info">
                <span className="key-prefix">{k.prefix}...</span>
                <span className="key-label">{k.label}</span>
                <span className="key-bot">{k.botId?.name || 'Unknown Bot'}</span>
                <span className="key-usage">{k.usageCount} uses</span>
              </div>
              {k.isActive ? (
                <button className="delete-btn" onClick={() => handleRevoke(k._id)}>Revoke</button>
              ) : (
                <span className="revoked-badge">Revoked</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
