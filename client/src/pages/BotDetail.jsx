import { useState, useEffect } from 'react';
import { getBot, updateBot, addKnowledge, deleteKnowledge, getConversations } from '../api';
import './BotDetail.css';

export default function BotDetail({ botId, onBack }) {
  const [bot, setBot] = useState(null);
  const [section, setSection] = useState('knowledge');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Knowledge form
  const [kbForm, setKbForm] = useState({ title: '', content: '', category: '' });

  // Settings form
  const [settings, setSettings] = useState({});
  const [systemPrompt, setSystemPrompt] = useState('');
  const [origins, setOrigins] = useState('');

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [expandedConvo, setExpandedConvo] = useState(null);

  const loadBot = async () => {
    try {
      const data = await getBot(botId);
      setBot(data.bot);
      setSettings(data.bot.settings || {});
      setSystemPrompt(data.bot.systemPrompt || '');
      setOrigins((data.bot.allowedOrigins || []).join('\n'));
    } catch (err) {
      setError(err.message);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await getConversations(botId);
      setConversations(data.conversations);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadBot(); }, [botId]);
  useEffect(() => { if (section === 'conversations') loadConversations(); }, [section]);

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    if (!kbForm.title.trim() || !kbForm.content.trim()) return;
    try {
      await addKnowledge(botId, kbForm);
      setKbForm({ title: '', content: '', category: '' });
      loadBot();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteKnowledge = async (entryId) => {
    try {
      await deleteKnowledge(botId, entryId);
      loadBot();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateBot(botId, {
        systemPrompt,
        settings,
        allowedOrigins: origins.split('\n').map((o) => o.trim()).filter(Boolean),
      });
      setError('');
      alert('Settings saved!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!bot) return <div className="bot-detail"><p>Loading...</p></div>;

  return (
    <div className="bot-detail">
      <div className="bd-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>{bot.name}</h2>
        <span className="bd-status">{bot.isActive ? '🟢 Active' : '🔴 Inactive'}</span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="bd-tabs">
        <button data-active={section === 'knowledge'} onClick={() => setSection('knowledge')}>Knowledge Base</button>
        <button data-active={section === 'settings'} onClick={() => setSection('settings')}>Settings</button>
        <button data-active={section === 'conversations'} onClick={() => setSection('conversations')}>Conversations</button>
        <button data-active={section === 'embed'} onClick={() => setSection('embed')}>Embed Code</button>
      </div>

      {/* Knowledge Base */}
      {section === 'knowledge' && (
        <div className="bd-section">
          <form className="kb-form" onSubmit={handleAddKnowledge}>
            <input placeholder="Title (e.g. Business Hours)" value={kbForm.title} onChange={(e) => setKbForm({ ...kbForm, title: e.target.value })} required />
            <input placeholder="Category (optional)" value={kbForm.category} onChange={(e) => setKbForm({ ...kbForm, category: e.target.value })} />
            <textarea placeholder="Content — Write everything the AI should know about this topic..." value={kbForm.content} onChange={(e) => setKbForm({ ...kbForm, content: e.target.value })} required rows={4} />
            <button type="submit">+ Add Knowledge</button>
          </form>

          <div className="kb-list">
            {bot.knowledgeBase.length === 0 ? (
              <p className="muted">No knowledge entries yet. Add some so the bot can answer customer questions.</p>
            ) : (
              bot.knowledgeBase.map((entry) => (
                <div key={entry._id} className="kb-entry">
                  <div className="kb-entry-header">
                    <h4>{entry.title} {entry.category && <span className="kb-cat">{entry.category}</span>}</h4>
                    <button className="delete-btn" onClick={() => handleDeleteKnowledge(entry._id)}>×</button>
                  </div>
                  <p>{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {section === 'settings' && (
        <div className="bd-section settings-section">
          <label>
            System Prompt
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} />
          </label>
          <label>
            Greeting Message
            <input value={settings.greeting || ''} onChange={(e) => setSettings({ ...settings, greeting: e.target.value })} />
          </label>
          <label>
            Fallback Message (when AI doesn't know)
            <input value={settings.fallbackMessage || ''} onChange={(e) => setSettings({ ...settings, fallbackMessage: e.target.value })} />
          </label>
          <div className="settings-row">
            <label>
              Temperature ({settings.temperature ?? 0.7})
              <input type="range" min="0" max="2" step="0.1" value={settings.temperature ?? 0.7} onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })} />
            </label>
            <label>
              Max Tokens
              <input type="number" min="64" max="4096" value={settings.maxTokens ?? 1024} onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })} />
            </label>
          </div>
          <label>
            Allowed Origins (one per line, leave empty to allow all)
            <textarea value={origins} onChange={(e) => setOrigins(e.target.value)} rows={3} placeholder="https://mysite.com&#10;https://shop.mysite.com" />
          </label>
          <button className="save-btn" onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Conversations */}
      {section === 'conversations' && (
        <div className="bd-section">
          {conversations.length === 0 ? (
            <p className="muted">No conversations yet. They'll appear here once customers start chatting.</p>
          ) : (
            conversations.map((c) => (
              <div key={c._id} className="convo-card" onClick={() => setExpandedConvo(expandedConvo === c._id ? null : c._id)}>
                <div className="convo-header">
                  <span className="convo-session">Session: {c.sessionId?.slice(0, 8)}...</span>
                  <span className="convo-date">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  <span className="convo-count">{c.messages?.length || 0} messages</span>
                </div>
                {expandedConvo === c._id && (
                  <div className="convo-messages">
                    {c.messages?.map((m, i) => (
                      <div key={i} className={`convo-msg ${m.role}`}>
                        <strong>{m.role === 'user' ? '👤 Customer' : '🤖 Bot'}:</strong> {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Embed Code */}
      {section === 'embed' && (
        <div className="bd-section">
          <p className="muted" style={{ marginBottom: 16 }}>
            Paste this script tag into your website's HTML before the closing <code>&lt;/body&gt;</code> tag.
            Your customers will see a chat widget in the bottom-right corner.
          </p>
          <p className="muted" style={{ marginBottom: 12 }}>
            ⚠️ You need an API key first. Go to the <strong>API Keys</strong> tab on the dashboard to generate one.
          </p>
          <textarea
            className="embed-code"
            readOnly
            rows={6}
            value={`<script>
  window.CHATBOT_CONFIG = {
    apiKey: "sk-cb-YOUR_ACTUAL_API_KEY_HERE",
    serverUrl: "http://localhost:5001",

    // Optional:
    // position: "bottom-right",   // or "bottom-left"
    // primaryColor: "#7c6af7"     // your brand color
  };
</script>
<script src="http://localhost:5001/widget/chatbot-widget.js"></script>`}
            onClick={(e) => { e.target.select(); navigator.clipboard?.writeText(e.target.value); }}
          />
          <p className="muted" style={{ marginTop: 8 }}>Click to copy. Replace <code>YOUR_API_KEY_HERE</code> with your actual API key.</p>
        </div>
      )}
    </div>
  );
}
