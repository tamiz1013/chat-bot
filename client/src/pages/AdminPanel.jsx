import { useState, useEffect } from 'react';
import {
  adminGetStats,
  adminGetUsers,
  adminUpdateUser,
  adminGetTransactions,
  adminReviewTransaction,
  adminGetBots,
  adminGetPaymentConfig,
  adminUpdatePaymentConfig,
} from '../api';
import './AdminPanel.css';

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>🛡️ Admin Panel</h1>
        <div className="admin-tabs">
          {['overview', 'transactions', 'users', 'bots', 'pricing', 'settings'].map((t) => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'bots' && <BotsTab />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Overview ──
function OverviewTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminGetStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <p className="admin-loading">Loading...</p>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
    { label: 'Total Bots', value: stats.totalBots, icon: '🤖' },
    { label: 'Active API Keys', value: stats.totalApiKeys, icon: '🔑' },
    { label: 'Conversations', value: stats.totalConversations, icon: '💬' },
    { label: 'Messages This Month', value: stats.monthlyMessages, icon: '📊' },
    { label: 'Pending Transactions', value: stats.pendingTransactions, icon: '⏳' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: '💰' },
  ];

  return (
    <div className="admin-stats-grid">
      {cards.map((c) => (
        <div key={c.label} className="admin-stat-card">
          <span className="admin-stat-icon">{c.icon}</span>
          <span className="admin-stat-value">{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</span>
          <span className="admin-stat-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Transactions ──
function TransactionsTab() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [noteInputs, setNoteInputs] = useState({});
  const [loading, setLoading] = useState(false);

  const loadTx = async () => {
    try {
      const data = await adminGetTransactions(page, statusFilter);
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTx(); }, [page, statusFilter]);

  const handleReview = async (id, action) => {
    setLoading(true);
    try {
      await adminReviewTransaction(id, action, noteInputs[id] || '');
      loadTx();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Transactions ({total})</h2>
        <div className="filter-bar">
          {['', 'submitted', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="admin-empty">No transactions found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Method</th>
                <th>TX ID</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id} className={`status-row-${tx.status}`}>
                  <td>
                    <div className="user-cell">
                      <strong>{tx.userId?.name || '—'}</strong>
                      <small>{tx.userId?.email || ''}</small>
                    </div>
                  </td>
                  <td><span className="plan-badge-sm">{tx.plan}</span></td>
                  <td>${tx.amount} {tx.currency}</td>
                  <td>{tx.paymentMethod === 'crypto' ? `Crypto (${tx.network})` : 'Binance Pay'}</td>
                  <td>
                    <code className="tx-id-cell" title={tx.transactionId || ''}>
                      {tx.transactionId ? (tx.transactionId.length > 20 ? tx.transactionId.slice(0, 20) + '...' : tx.transactionId) : '—'}
                    </code>
                  </td>
                  <td><span className={`status-badge ${tx.status}`}>{tx.status}</span></td>
                  <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td>
                    {['pending', 'submitted'].includes(tx.status) ? (
                      <div className="action-cell">
                        <input
                          placeholder="Note (optional)"
                          value={noteInputs[tx._id] || ''}
                          onChange={(e) => setNoteInputs({ ...noteInputs, [tx._id]: e.target.value })}
                          className="action-note"
                        />
                        <div className="action-btns">
                          <button
                            className="approve-btn"
                            onClick={() => handleReview(tx._id, 'approve')}
                            disabled={loading}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReview(tx._id, 'reject')}
                            disabled={loading}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="reviewed-by">
                        {tx.reviewedBy?.name && `by ${tx.reviewedBy.name}`}
                        {tx.adminNote && <small> — {tx.adminNote}</small>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button disabled={transactions.length < 20} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Users ──
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);

  const loadUsers = async () => {
    try {
      const data = await adminGetUsers(page, search);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadUsers(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    try {
      await adminUpdateUser(editUser._id, {
        plan: editUser.plan,
        role: editUser.role,
        isActive: editUser.isActive,
      });
      setEditUser(null);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Users ({total})</h2>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="admin-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User: {editUser.name}</h3>
            <p className="modal-email">{editUser.email}</p>

            <label>
              Role
              <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label>
              Plan
              <select value={editUser.plan} onChange={(e) => setEditUser({ ...editUser, plan: e.target.value })}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editUser.isActive}
                onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })}
              />
              Active
            </label>

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveUser}>Save</button>
              <button className="cancel-btn" onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Bots</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                <td><span className="plan-badge-sm">{u.plan}</span></td>
                <td>{u.botCount}</td>
                <td>{u.isActive ? '🟢' : '🔴'}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="edit-btn" onClick={() => setEditUser({ ...u })}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button disabled={users.length < 20} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Bots ──
function BotsTab() {
  const [bots, setBots] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminGetBots(page)
      .then((data) => { setBots(data.bots); setTotal(data.total); })
      .catch(console.error);
  }, [page]);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>All Bots ({total})</h2>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Bot Name</th>
              <th>Owner</th>
              <th>Knowledge</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => (
              <tr key={b._id}>
                <td>{b.name}</td>
                <td>
                  <div className="user-cell">
                    <strong>{b.userId?.name || '—'}</strong>
                    <small>{b.userId?.email || ''}</small>
                  </div>
                </td>
                <td>{b.knowledgeBase?.length || 0} entries</td>
                <td>{b.isActive ? '🟢 Active' : '🔴 Inactive'}</td>
                <td>{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button disabled={bots.length < 20} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Pricing ──
function PricingTab() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminGetPaymentConfig()
      .then((data) => setConfig(data.config))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await adminUpdatePaymentConfig({
        cryptoWallets: config.cryptoWallets,
        binancePayQr: config.binancePayQr,
        binancePayId: config.binancePayId,
        prices: config.prices,
      });
      setMsg('Pricing updated successfully!');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <p className="admin-loading">Loading...</p>;

  return (
    <div className="admin-section pricing-tab">
      <h2>Plan Pricing</h2>
      <p className="pricing-desc">Set monthly prices for premium plans. Changes apply to new subscriptions immediately.</p>

      {msg && <p className={`settings-msg ${msg.startsWith('Error') ? 'error' : 'success'}`}>{msg}</p>}

      <div className="pricing-grid">
        {/* Free Plan */}
        <div className="pricing-card pricing-free">
          <div className="pricing-card-header">
            <h3>Free</h3>
            <span className="pricing-tag">Default</span>
          </div>
          <div className="pricing-amount">
            <span className="pricing-dollar">$0</span>
            <span className="pricing-period">/month</span>
          </div>
          <ul className="pricing-limits">
            <li>1 Bot</li>
            <li>5 Knowledge entries</li>
            <li>500 messages/month</li>
          </ul>
          <p className="pricing-note">Free tier cannot be changed</p>
        </div>

        {/* Pro Plan */}
        <div className="pricing-card pricing-pro">
          <div className="pricing-card-header">
            <h3>Pro</h3>
            <span className="pricing-tag popular">Popular</span>
          </div>
          <div className="pricing-input-group">
            <span className="pricing-currency">$</span>
            <input
              type="number"
              min="1"
              value={config.prices?.pro ?? 29}
              onChange={(e) => setConfig({ ...config, prices: { ...config.prices, pro: Number(e.target.value) } })}
            />
            <span className="pricing-suffix">USDT / month</span>
          </div>
          <ul className="pricing-limits">
            <li>5 Bots</li>
            <li>50 Knowledge entries</li>
            <li>10,000 messages/month</li>
          </ul>
        </div>

        {/* Enterprise Plan */}
        <div className="pricing-card pricing-enterprise">
          <div className="pricing-card-header">
            <h3>Enterprise</h3>
            <span className="pricing-tag enterprise">Premium</span>
          </div>
          <div className="pricing-input-group">
            <span className="pricing-currency">$</span>
            <input
              type="number"
              min="1"
              value={config.prices?.enterprise ?? 99}
              onChange={(e) => setConfig({ ...config, prices: { ...config.prices, enterprise: Number(e.target.value) } })}
            />
            <span className="pricing-suffix">USDT / month</span>
          </div>
          <ul className="pricing-limits">
            <li>Unlimited Bots</li>
            <li>500 Knowledge entries</li>
            <li>100,000 messages/month</li>
          </ul>
        </div>
      </div>

      <button className="save-config-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Pricing'}
      </button>
    </div>
  );
}

// ── Settings (Payment Config) ──
function SettingsTab() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminGetPaymentConfig()
      .then((data) => setConfig(data.config))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const data = await adminUpdatePaymentConfig({
        cryptoWallets: config.cryptoWallets,
        binancePayQr: config.binancePayQr,
        binancePayId: config.binancePayId,
        prices: config.prices,
      });
      setConfig(data.config);
      setMsg('Settings saved!');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateWallet = (index, field, value) => {
    const updated = [...config.cryptoWallets];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, cryptoWallets: updated });
  };

  const addWallet = () => {
    setConfig({
      ...config,
      cryptoWallets: [...(config.cryptoWallets || []), { network: '', address: '', coin: 'USDT', isActive: true }],
    });
  };

  const removeWallet = (index) => {
    const updated = [...config.cryptoWallets];
    updated.splice(index, 1);
    setConfig({ ...config, cryptoWallets: updated });
  };

  if (!config) return <p className="admin-loading">Loading...</p>;

  return (
    <div className="admin-section settings-tab">
      <h2>Payment Configuration</h2>

      {msg && <p className={`settings-msg ${msg.startsWith('Error') ? 'error' : 'success'}`}>{msg}</p>}

      {/* Prices */}
      <div className="settings-group">
        <h3>Plan Prices (USDT)</h3>
        <div className="price-inputs">
          <label>
            Pro
            <input
              type="number"
              value={config.prices?.pro ?? 29}
              onChange={(e) => setConfig({ ...config, prices: { ...config.prices, pro: Number(e.target.value) } })}
            />
          </label>
          <label>
            Enterprise
            <input
              type="number"
              value={config.prices?.enterprise ?? 99}
              onChange={(e) => setConfig({ ...config, prices: { ...config.prices, enterprise: Number(e.target.value) } })}
            />
          </label>
        </div>
      </div>

      {/* Crypto Wallets */}
      <div className="settings-group">
        <h3>Crypto Wallets</h3>
        {(config.cryptoWallets || []).map((w, i) => (
          <div key={i} className="wallet-row">
            <input
              placeholder="Network (e.g. TRC20)"
              value={w.network}
              onChange={(e) => updateWallet(i, 'network', e.target.value)}
            />
            <input
              placeholder="Wallet Address"
              value={w.address}
              onChange={(e) => updateWallet(i, 'address', e.target.value)}
              className="wallet-addr-input"
            />
            <input
              placeholder="Coin"
              value={w.coin}
              onChange={(e) => updateWallet(i, 'coin', e.target.value)}
              style={{ width: 70 }}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={w.isActive}
                onChange={(e) => updateWallet(i, 'isActive', e.target.checked)}
              />
              Active
            </label>
            <button className="remove-btn" onClick={() => removeWallet(i)}>×</button>
          </div>
        ))}
        <button className="add-btn" onClick={addWallet}>+ Add Network</button>
      </div>

      {/* Binance Pay */}
      <div className="settings-group">
        <h3>Binance Pay</h3>
        <label>
          QR Code Image URL
          <input
            placeholder="https://... or data:image/png;base64,..."
            value={config.binancePayQr || ''}
            onChange={(e) => setConfig({ ...config, binancePayQr: e.target.value })}
          />
        </label>
        <label>
          Binance Pay ID
          <input
            placeholder="Your Binance Pay ID"
            value={config.binancePayId || ''}
            onChange={(e) => setConfig({ ...config, binancePayId: e.target.value })}
          />
        </label>
        {config.binancePayQr && (
          <div className="qr-preview">
            <p>Preview:</p>
            <img src={config.binancePayQr} alt="QR Preview" />
          </div>
        )}
      </div>

      <button className="save-config-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}
