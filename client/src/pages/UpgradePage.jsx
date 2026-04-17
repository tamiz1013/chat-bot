import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getPaymentConfig,
  createPayment,
  submitPayment,
  getMyTransactions,
  cancelPayment,
} from '../api';
import './UpgradePage.css';

const PLAN_FEATURES = {
  free: { bots: 1, knowledge: 5, messages: '500/mo', price: 0 },
  pro: { bots: 5, knowledge: 50, messages: '10,000/mo', price: 29 },
  enterprise: { bots: 'Unlimited', knowledge: 500, messages: '100,000/mo', price: 99 },
};

export default function UpgradePage() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [step, setStep] = useState('plans'); // plans | method | pay | submitted
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [activeTx, setActiveTx] = useState(null);
  const [txIdInput, setTxIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configData, txData] = await Promise.all([
        getPaymentConfig(),
        getMyTransactions(),
      ]);
      setConfig(configData);
      setTransactions(txData.transactions);

      // If there's an active pending/submitted tx, show it
      const active = txData.transactions.find((t) => ['pending', 'submitted'].includes(t.status));
      if (active) {
        setActiveTx(active);
        setStep(active.status === 'submitted' ? 'submitted' : 'pay');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan === user?.plan) return;
    setSelectedPlan(plan);
    setStep('method');
    setError('');
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    if (method === 'crypto') {
      setSelectedNetwork(null); // need to pick network next
    } else {
      handleCreatePayment(method, null);
    }
  };

  const handleCreatePayment = async (method, network) => {
    setLoading(true);
    setError('');
    try {
      const data = await createPayment(selectedPlan, method || selectedMethod, network || selectedNetwork);
      setActiveTx(data.transaction);
      setStep('pay');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTxId = async () => {
    if (!txIdInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await submitPayment(activeTx._id, txIdInput.trim());
      setActiveTx(data.transaction);
      setStep('submitted');
      setTxIdInput('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeTx) return;
    try {
      await cancelPayment(activeTx._id);
      setActiveTx(null);
      setStep('plans');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const price = config?.prices?.[selectedPlan] ?? PLAN_FEATURES[selectedPlan]?.price ?? 0;

  return (
    <div className="upgrade-page">
      <h1>Upgrade Your Plan</h1>
      <p className="current-plan">
        Current plan: <span className="plan-badge">{user?.plan}</span>
      </p>

      {error && <p className="up-error">{error}</p>}

      {/* ── Step: Plans ── */}
      {step === 'plans' && (
        <div className="plans-grid">
          {Object.entries(PLAN_FEATURES).map(([key, feat]) => {
            const displayPrice = config?.prices?.[key] ?? feat.price;
            return (
            <div
              key={key}
              className={`plan-card ${user?.plan === key ? 'current' : ''} ${key === 'pro' ? 'popular' : ''}`}
            >
              {key === 'pro' && <span className="popular-badge">Most Popular</span>}
              <h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
              <div className="plan-price">
                <span className="price-amount">${displayPrice}</span>
                <span className="price-period">/month</span>
              </div>
              <ul className="plan-features">
                <li>{feat.bots} Bot{feat.bots !== 1 ? 's' : ''}</li>
                <li>{feat.knowledge} Knowledge entries</li>
                <li>{feat.messages} messages</li>
              </ul>
              {user?.plan === key ? (
                <button className="plan-btn current" disabled>Current Plan</button>
              ) : key === 'free' ? (
                <button className="plan-btn" disabled>Free</button>
              ) : (
                <button className="plan-btn upgrade" onClick={() => handleSelectPlan(key)}>
                  Upgrade to {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* ── Step: Payment Method ── */}
      {step === 'method' && (
        <div className="method-section">
          <button className="back-link" onClick={() => setStep('plans')}>← Back to plans</button>
          <h2>Select Payment Method</h2>
          <p className="method-subtitle">
            Upgrading to <strong>{selectedPlan}</strong> — ${price} USDT
          </p>

          <div className="methods-grid">
            <div
              className={`method-card ${!config?.methods?.crypto?.available ? 'method-disabled' : ''}`}
              onClick={() => config?.methods?.crypto?.available ? handleSelectMethod('crypto') : setError('Crypto payments are not configured yet. Please contact admin.')}
            >
              <span className="method-icon">₿</span>
              <h4>Cryptocurrency</h4>
              <p>Pay with USDT on your preferred network</p>
              {!config?.methods?.crypto?.available && <span className="method-badge-na">Not available</span>}
            </div>
            <div
              className={`method-card ${!config?.methods?.binance_pay?.available ? 'method-disabled' : ''}`}
              onClick={() => config?.methods?.binance_pay?.available ? handleSelectMethod('binance_pay') : setError('Binance Pay is not configured yet. Please contact admin.')}
            >
              <span className="method-icon">📱</span>
              <h4>Binance Pay</h4>
              <p>Scan QR code with Binance app</p>
              {!config?.methods?.binance_pay?.available && <span className="method-badge-na">Not available</span>}
            </div>
          </div>

          {/* Network selection for crypto */}
          {selectedMethod === 'crypto' && !activeTx && (
            <div className="network-section">
              <h3>Select Network</h3>
              <div className="networks-grid">
                {config?.methods?.crypto?.networks?.map((n) => (
                  <button
                    key={n.network}
                    className={`network-btn ${selectedNetwork === n.network ? 'active' : ''}`}
                    onClick={() => setSelectedNetwork(n.network)}
                  >
                    {n.network} ({n.coin})
                  </button>
                ))}
              </div>
              {selectedNetwork && (
                <button
                  className="proceed-btn"
                  onClick={() => handleCreatePayment('crypto', selectedNetwork)}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Proceed to Payment'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Pay ── */}
      {step === 'pay' && activeTx && (
        <div className="pay-section">
          <button className="back-link" onClick={handleCancel}>← Cancel &amp; go back</button>
          <h2>Complete Your Payment</h2>
          <div className="pay-info-card">
            <div className="pay-detail">
              <span className="pay-label">Amount</span>
              <span className="pay-value">${activeTx.amount} {activeTx.currency}</span>
            </div>
            <div className="pay-detail">
              <span className="pay-label">Plan</span>
              <span className="pay-value">{activeTx.plan}</span>
            </div>
            <div className="pay-detail">
              <span className="pay-label">Method</span>
              <span className="pay-value">{activeTx.paymentMethod === 'crypto' ? `Crypto (${activeTx.network})` : 'Binance Pay'}</span>
            </div>

            {activeTx.paymentMethod === 'crypto' && activeTx.walletAddress && (
              <div className="wallet-section">
                <span className="pay-label">Send to this address:</span>
                <code
                  className="wallet-address"
                  onClick={() => { navigator.clipboard?.writeText(activeTx.walletAddress); }}
                  title="Click to copy"
                >
                  {activeTx.walletAddress}
                </code>
                <p className="wallet-note">
                  ⚠️ Send exactly <strong>${activeTx.amount} {activeTx.currency}</strong> on the <strong>{activeTx.network}</strong> network. Click the address to copy.
                </p>
              </div>
            )}

            {activeTx.paymentMethod === 'binance_pay' && (
              <div className="binance-section">
                {config?.methods?.binance_pay?.qrCode && (
                  <div className="qr-wrap">
                    <img src={config.methods.binance_pay.qrCode} alt="Binance Pay QR" className="qr-image" />
                  </div>
                )}
                {config?.methods?.binance_pay?.payId && (
                  <p className="binance-id">
                    Binance Pay ID: <code onClick={() => navigator.clipboard?.writeText(config.methods.binance_pay.payId)}>
                      {config.methods.binance_pay.payId}
                    </code>
                  </p>
                )}
                <p className="wallet-note">
                  ⚠️ Scan the QR code with Binance app and send exactly <strong>${activeTx.amount} {activeTx.currency}</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="submit-tx-section">
            <h3>After sending payment, enter your Transaction ID:</h3>
            <div className="tx-input-row">
              <input
                placeholder="Transaction ID / Hash"
                value={txIdInput}
                onChange={(e) => setTxIdInput(e.target.value)}
              />
              <button onClick={handleSubmitTxId} disabled={loading || !txIdInput.trim()}>
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Submitted ── */}
      {step === 'submitted' && (
        <div className="submitted-section">
          <div className="submitted-card">
            <span className="submitted-icon">⏳</span>
            <h2>Payment Under Review</h2>
            <p>Your transaction has been submitted and is awaiting admin approval.</p>
            <p>Your plan will be upgraded automatically once approved.</p>
            <button className="plan-btn" onClick={() => { setStep('plans'); setActiveTx(null); }}>
              Back to Plans
            </button>
          </div>
        </div>
      )}

      {/* ── Transaction History ── */}
      {transactions.length > 0 && (
        <div className="tx-history">
          <h3>Transaction History</h3>
          <div className="tx-list">
            {transactions.map((tx) => (
              <div key={tx._id} className={`tx-card status-${tx.status}`}>
                <div className="tx-info">
                  <span className="tx-plan">{tx.plan}</span>
                  <span className="tx-amount">${tx.amount} {tx.currency}</span>
                  <span className="tx-method">{tx.paymentMethod === 'crypto' ? `Crypto (${tx.network})` : 'Binance Pay'}</span>
                  <span className={`tx-status ${tx.status}`}>{tx.status}</span>
                </div>
                <span className="tx-date">{new Date(tx.createdAt).toLocaleDateString()}</span>
                {tx.adminNote && <p className="tx-note">Admin: {tx.adminNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
