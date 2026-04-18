import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../api';
import './AuthPage.css';

const FEATURES = [
  { icon: '⚡', title: 'Deploy in Minutes', desc: 'Create a bot, train it with your knowledge base, and embed it — all in one place.' },
  { icon: '🧠', title: 'Custom Knowledge Base', desc: 'Teach your bot about your business — FAQs, policies, pricing, and more.' },
  { icon: '🔗', title: 'REST API & Widget', desc: 'Use the /v1/chat API or drop in our embeddable chat widget with a single script tag.' },
  { icon: '📊', title: 'Analytics & Logs', desc: 'Track conversations, monitor usage, and see how your customers interact.' },
];

export default function AuthPage() {
  const { loginUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = isLogin
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password);
      loginUser(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left: Hero */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-brand">
            <div className="auth-brand-icon">C</div>
            <span>ChatBotAgent</span>
          </div>
          <h1 className="auth-headline">Build AI Chatbots<br />for Your Business</h1>
          <p className="auth-tagline">
            Create, train, and deploy intelligent chatbots that understand your business — powered by local LLMs.
          </p>
          <div className="auth-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="auth-feature">
                <span className="auth-feature-icon">{f.icon}</span>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-hero-bg" />
      </div>

      {/* Right: Form */}
      <div className="auth-form-side">
        <div className="auth-card">
          <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Get started'}</h2>
          <p className="auth-subtitle">{isLogin ? 'Sign in to your dashboard' : 'Create your free account'}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="btn-spinner" />
                  Please wait...
                </span>
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="auth-toggle">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
